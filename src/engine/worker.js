/**
 * engine/worker.js — Web Worker 入口，跑模拟逻辑
 *
 * 协议见 worker_protocol.js。Worker 内部维护：
 *   - 完整游戏状态（库存 / 工厂实例 / 市场 / 政策 / 估值）
 *   - fixed timestep (TICK_MS) 推进 tick
 *   - 倍速下子步进避免数值爆炸
 *
 * 与主线程之间用 postMessage；批量状态用 transferable 优化。
 *
 * 注意：Worker 不能直接 fetch JSON（受同源策略），但同源下可用 fetch。
 * 这里用 importScripts 兜底是不行的（ES module worker），改为主线程加载 JSON 后通过 INIT 推送。
 */
import { TICK_MS, TICKS_PER_SEC, SPEED_LEVELS } from '../config.js';
import { MSG, transferable } from './worker_protocol.js';
import { ResourceRegistry } from '../resource/registry.js';
import { Inventory } from '../resource/inventory.js';
import { FactoryRegistry } from '../factory/registry.js';
import { Market } from '../market/market.js';
import { PolicyTree } from '../policy/tree.js';
import { Valuation } from '../economy/valuation.js';
import { Analytics } from '../economy/analytics.js';
import { OfflineEarnings } from '../prestige/offline.js';
import { Prestige } from '../prestige/prestige.js';

let state = null;
let speed = 1;          // 0=暂停
let acc = 0;
let lastTime = 0;
let rAF = 0;
let lastSnapshotTime = 0;

// 简易 rAF 在 worker 内
function workerRAF(cb) {
  const t = setTimeout(cb, 1000 / 60);
  return t;
}
function cancelRAF(id) { clearTimeout(id); }

self.onmessage = (e) => {
  const msg = e.data;
  try {
    handle(msg);
  } catch (err) {
    self.postMessage({ t: MSG.ERROR, message: String(err && err.message || err) });
  }
};

function handle(msg) {
  switch (msg.t) {
    case MSG.INIT: init(msg); break;
    case MSG.SET_SPEED: speed = SPEED_LEVELS[msg.index] ?? 1; break;
    case MSG.PAUSE: speed = 0; break;
    case MSG.RESUME: if (speed === 0) speed = 1; break;
    case MSG.PLACE_FACTORY: placeFactory(msg); break;
    case MSG.DEMOLISH: demolish(msg); break;
    case MSG.UPGRADE: upgradeFactory(msg); break;
    case MSG.SET_FACTORY_OPT: setFactoryOpt(msg); break;
    case MSG.PLACE_ORDER: placeOrder(msg); break;
    case MSG.CANCEL_ORDER: cancelOrder(msg); break;
    case MSG.APPLY_POLICY: applyPolicy(msg); break;
    case MSG.RUN_PRESTIGE: runPrestige(msg); break;
    case MSG.SAVE_SNAPSHOT: sendSnapshot(true); break;
    case MSG.TERMINATE: self.close(); break;
    default: break;
  }
}

function init(msg) {
  state = {
    resources: msg.resources,
    factories: msg.factories,
    policies: msg.policies,
    maps: msg.maps,
    upgrades: msg.upgrades,
    inventory: msg.inventory || {},
    cash: msg.cash || 0,
    placed: new Map(),      // instanceId -> factory instance
    nextId: 1,
    mapId: msg.mapId,
    mapDef: msg.mapDef,
    orders: [],
    orderHistory: [],
    priceHistory: {},       // resourceId -> Float32Array
    policyUnlocked: new Set(msg.policyUnlocked || []),
    upgradesOwned: new Set(msg.upgradesOwned || []),
    swiss: msg.swiss || 0,
    peakValuation: 0,
    gameTime: 0,
    lastTickAt: Date.now(),
    factoryRegistry: new FactoryRegistry(msg.factories),
    resourceRegistry: new ResourceRegistry(msg.resources),
    inventoryPool: new Inventory(msg.inventory || {}),
    market: null,
    policyTree: new PolicyTree(msg.policies),
    valuation: null,
    analytics: null,
  };
  state.market = new Market(state.resourceRegistry, state.inventoryPool);
  state.valuation = new Valuation(state);
  state.analytics = new Analytics(state);

  // 初始化价格历史
  for (const r of state.resources.resources) {
    if (r.category === 'special') continue;
    state.priceHistory[r.id] = new Float32Array(720);
    state.priceHistory[r.id].fill(r.basePrice);
  }
  // 应用已解锁政策
  for (const pid of state.policyUnlocked) {
    const node = state.policyTree.get(pid);
    if (node) state.policyTree.apply(state, node);
  }
  speed = 1;
  startLoop();
  self.postMessage({ t: MSG.READY });
}

function startLoop() {
  if (rAF) return;
  lastTime = performance.now();
  rAF = workerRAF(loopTick);
}

function loopTick() {
  const now = performance.now();
  let dt = now - lastTime;
  lastTime = now;
  if (dt > 1000) dt = 1000;
  if (speed > 0) {
    acc += dt * speed;
    let steps = 0;
    const maxSteps = 200; // 子步进上限
    while (acc >= TICK_MS && steps < maxSteps) {
      tick(TICK_MS / 1000);
      acc -= TICK_MS;
      steps++;
    }
    if (steps >= maxSteps) acc = 0; // 丢弃积压
  }
  // 每 200ms 推送一次状态快照
  if (now - lastSnapshotTime >= 200) {
    lastSnapshotTime = now;
    sendDelta();
  }
  rAF = workerRAF(loopTick);
}

function tick(dtSec) {
  state.gameTime += dtSec;
  // 1. 工厂 tick：产出
  for (const f of state.placed.values()) {
    if (!f.enabled) continue;
    const def = state.factoryRegistry.get(f.defId);
    if (!def) continue;
    // 检查输入资源
    let canRun = true;
    for (const inp of def.inputs) {
      const need = inp.rate * dtSec * f.speedMul * (1 + 0.1 * (f.level - 1));
      if (state.inventoryPool.get(inp.id) < need) { canRun = false; break; }
    }
    if (!canRun) continue;
    // 扣输入
    for (const inp of def.inputs) {
      const need = inp.rate * dtSec * f.speedMul * (1 + 0.1 * (f.level - 1));
      state.inventoryPool.remove(inp.id, need);
    }
    // 加输出
    for (const out of def.outputs) {
      const give = out.rate * dtSec * f.speedMul * (1 + 0.2 * (f.level - 1)) * (state.policyTree.effects.factoryOutputMult || 1);
      state.inventoryPool.add(out.id, give);
      f.accOut = (f.accOut || 0) + give;
    }
  }
  // 2. 市场撮合
  state.market.tick(dtSec, state);
  // 3. 价格演化
  state.market.evolvePrices(dtSec, state);
  // 4. AI 挂单
  state.market.runAITraders(state);
  // 5. 估值
  const v = state.valuation.compute();
  if (v > state.peakValuation) state.peakValuation = v;
}

function sendDelta() {
  // 推送一个紧凑的状态增量
  const res = state.resources.resources.filter(r => r.category !== 'special');
  const prices = new Float32Array(res.length);
  const qtys = new Float32Array(res.length);
  for (let i = 0; i < res.length; i++) {
    prices[i] = state.market.getPrice(res[i].id);
    qtys[i] = state.inventoryPool.get(res[i].id);
  }
  const factoryList = [];
  for (const f of state.placed.values()) {
    factoryList.push({
      id: f.id, defId: f.defId, x: f.x, y: f.y, level: f.level,
      speedMul: f.speedMul, enabled: f.enabled, accOut: f.accOut || 0,
    });
  }
  self.postMessage({
    t: MSG.STATE_DELTA,
    cash: state.cash,
    valuation: state.valuation.compute(),
    gameTime: state.gameTime,
    swiss: state.swiss,
    peakValuation: state.peakValuation,
    resIds: res.map(r => r.id),
    prices: prices.buffer,
    qtys: qtys.buffer,
    factories: factoryList,
    orders: state.orders.slice(0, 50),
    orderHistory: state.orderHistory.slice(-50),
    policyUnlocked: Array.from(state.policyUnlocked),
    upgradesOwned: Array.from(state.upgradesOwned),
    priceHistory: serializePriceHistory(state, res),
  }, [prices.buffer, qtys.buffer]);
}

function sendSnapshot(forSave) {
  sendDelta();
  self.postMessage({
    t: MSG.STATE_SNAPSHOT,
    full: forSave ? serializeForSave() : null,
  });
}

function serializeForSave() {
  return {
    version: 1,
    mapId: state.mapId,
    cash: state.cash,
    swiss: state.swiss,
    inventory: state.inventoryPool.toJSON(),
    placed: Array.from(state.placed.values()).map(f => ({
      id: f.id, defId: f.defId, x: f.x, y: f.y, level: f.level,
      speedMul: f.speedMul, enabled: f.enabled, priority: f.priority || 0,
    })),
    orders: state.orders,
    orderHistory: state.orderHistory.slice(-200),
    policyUnlocked: Array.from(state.policyUnlocked),
    upgradesOwned: Array.from(state.upgradesOwned),
    peakValuation: state.peakValuation,
    gameTime: state.gameTime,
    savedAt: Date.now(),
  };
}

function serializePriceHistory(state, res) {
  const out = {};
  for (let i = 0; i < res.length; i++) {
    const id = res[i].id;
    const h = state.priceHistory[id];
    if (h) out[id] = Array.from(h.slice(-120));
  }
  return out;
}

function placeFactory(msg) {
  const def = state.factoryRegistry.get(msg.defId);
  if (!def) throw new Error('Unknown factory ' + msg.defId);
  if (state.cash < def.cost) {
    self.postMessage({ t: MSG.TOAST, level: 'err', key: 'toast.no_funds' });
    return;
  }
  state.cash -= def.cost;
  const f = {
    id: state.nextId++, defId: msg.defId, x: msg.x, y: msg.y,
    level: 1, speedMul: 1.0, enabled: true, accIn: 0, accOut: 0, priority: 0,
  };
  state.placed.set(f.id, f);
  self.postMessage({ t: MSG.TOAST, level: 'ok', key: 'toast.placed' });
  sendDelta();
}

function demolish(msg) {
  const f = state.placed.get(msg.factoryId);
  if (!f) return;
  const def = state.factoryRegistry.get(f.defId);
  const refund = (def.cost * 0.5) + (def.cost * 0.5 * (f.level - 1) * 0.3);
  state.cash += refund * (state.policyTree.effects.demolishRefundBonus ? 1.5 : 1.0);
  state.placed.delete(msg.factoryId);
  self.postMessage({ t: MSG.TOAST, level: 'ok', key: 'toast.demolished' });
  sendDelta();
}

function upgradeFactory(msg) {
  const f = state.placed.get(msg.factoryId);
  if (!f) return;
  const def = state.factoryRegistry.get(f.defId);
  const upCost = Math.floor(def.cost * Math.pow(def.upgradeCostMult || 2, f.level) *
    (state.policyTree.effects.upgradeCostMult || 1));
  if (state.cash < upCost) {
    self.postMessage({ t: MSG.TOAST, level: 'err', key: 'toast.no_funds' });
    return;
  }
  state.cash -= upCost;
  f.level++;
  self.postMessage({ t: MSG.TOAST, level: 'ok', key: 'toast.upgraded' });
  sendDelta();
}

function setFactoryOpt(msg) {
  const f = state.placed.get(msg.factoryId);
  if (!f) return;
  if (msg.speedMul != null) f.speedMul = msg.speedMul;
  if (msg.enabled != null) f.enabled = msg.enabled;
  if (msg.priority != null) f.priority = msg.priority;
}

function placeOrder(msg) {
  const side = msg.side; // 'buy' or 'sell'
  const resId = msg.resId;
  const qty = msg.qty;
  const price = msg.price;
  const isMarket = msg.isMarket;
  const res = state.resourceRegistry.get(resId);
  if (!res) throw new Error('Unknown resource ' + resId);
  let actualPrice = price;
  if (isMarket) {
    actualPrice = state.market.getPrice(resId);
  }
  // 滑点模型
  const impact = state.market.computeSlippage(resId, qty, side);
  actualPrice = side === 'buy' ? actualPrice * (1 + impact) : actualPrice * (1 - impact);
  const fee = actualPrice * qty * (state.policyTree.effects.marketFeeMult || 1.0) * 0.02;
  const total = actualPrice * qty + (side === 'buy' ? fee : -fee);
  if (side === 'buy') {
    if (state.cash < total) {
      self.postMessage({ t: MSG.TOAST, level: 'err', key: 'toast.no_funds' });
      return;
    }
    state.cash -= total;
    state.inventoryPool.add(resId, qty);
  } else {
    if (state.inventoryPool.get(resId) < qty) {
      self.postMessage({ t: MSG.TOAST, level: 'err', key: 'toast.no_resources' });
      return;
    }
    state.inventoryPool.remove(resId, qty);
    state.cash += -total;
  }
  // 价格冲击
  state.market.applyImpact(resId, qty, side);
  state.orderHistory.push({ side, resId, qty, price: actualPrice, fee, time: state.gameTime });
  self.postMessage({ t: MSG.TOAST, level: 'ok', text: side === 'buy' ? '已买入' : '已卖出' });
  sendDelta();
}

function cancelOrder(msg) {
  state.orders = state.orders.filter(o => o.id !== msg.orderId);
  sendDelta();
}

function applyPolicy(msg) {
  const node = state.policyTree.get(msg.policyId);
  if (!node) return;
  if (state.swiss < node.cost) {
    self.postMessage({ t: MSG.TOAST, level: 'err', text: '点数不足' });
    return;
  }
  state.swiss -= node.cost;
  state.policyTree.apply(state, node);
  state.policyUnlocked.add(msg.policyId);
  sendDelta();
}

function runPrestige(msg) {
  const prestige = new Prestige(state);
  const result = prestige.run();
  state.swiss += result.gain;
  // 重置当前地图进度（政策保留与否可选，默认保留）
  state.cash = state.mapDef.startCash;
  state.inventoryPool.reset(state.mapDef.startResources);
  state.placed.clear();
  state.orders = [];
  state.orderHistory = [];
  state.peakValuation = 0;
  self.postMessage({ t: MSG.TOAST, level: 'ok', text: 'Prestige 完成' });
  sendDelta();
}
