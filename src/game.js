/**
 * game.js — 游戏主控制器、状态机、主线程侧循环
 * 负责：
 *   - bootstrap Worker（ES module worker）
 *   - 加载 JSON 数据并推送 INIT 到 worker
 *   - 接收 STATE_DELTA 更新主线程镜像状态
 *   - 渲染：PixiJS 主舞台（网格/工厂/特效）
 *   - 输入分发
 *   - UI 面板切换
 *   - 自动保存 + 离线收益结算
 */
import { MainLoop } from './engine/loop.js';
import { InputState } from './engine/input.js';
import { MSG } from './engine/worker_protocol.js';
import { GameMap } from './world/map.js';
import { Camera } from './world/camera.js';
import { ResourceRegistry } from './resource/registry.js';
import { FactoryRegistry } from './factory/registry.js';
import { PolicyTree } from './policy/tree.js';
import { UpgradeRegistry } from './prestige/upgrades.js';
import { PlacementController } from './factory/placement.js';
import { HUD } from './ui/hud.js';
import { BuildPanel } from './ui/build_panel.js';
import { StockPanel } from './ui/stock_panel.js';
import { MarketUI } from './ui/market_ui.js';
import { PolicyUI } from './ui/policy_ui.js';
import { ChartUI } from './ui/chart_ui.js';
import { FactoryUI } from './ui/factory_ui.js';
import { MainMenu } from './ui/menu.js';
import { PrestigeUI } from './ui/prestige_ui.js';
import { toast, floatText } from './ui/toast.js';
import { Tooltip } from './ui/tooltip.js';
import { saveSlot, loadSlot, getSetting, setSetting } from './engine/save.js';
import { AUTOSAVE_INTERVAL_MS, SPEED_LEVELS, TICK_MS } from './config.js';
import { audio } from './engine/audio.js';

export class Game {
  constructor() {
    this.loop = new MainLoop();
    this.app = null;          // PixiJS Application
    this.worker = null;
    this.state = {
      cash: 0, valuation: 0, swiss: 0, peakValuation: 0,
      gameTime: 0, mapName: '', resIds: [], prices: null, qtys: null,
      factories: [], orders: [], orderHistory: [],
      policyUnlocked: [], upgradesOwned: [], priceHistory: {},
    };
    this.map = null;
    this.camera = new Camera();
    this.resourceRegistry = null;
    this.factoryRegistry = null;
    this.policyTree = null;
    this.upgradeRegistry = null;
    this.placement = new PlacementController(this);
    this.hud = null;
    this.buildPanel = null;
    this.stockPanel = new StockPanel(this);
    this.marketUI = null;
    this.policyUI = new PolicyUI(this);
    this.chartUI = new ChartUI(this);
    this.factoryUI = new FactoryUI(this);
    this.factoryPanelEl = null;
    this.prestigeUI = new PrestigeUI(this);
    this.tooltip = new Tooltip(this);
    this.menu = new MainMenu(this);
    this.input = null;
    this.currentTab = 'stock';
    this.currentSlot = 1;
    this.autosaveTimer = null;
    this.pixiLayers = null;
    this.mapsData = null;
    this.resourcesData = null;
    this.factoriesData = null;
    this.policiesData = null;
    this.upgradesData = null;
    this.lastSaveTime = Date.now();
  }

  async init() {
    // 加载数据
    [this.resourcesData, this.factoriesData, this.policiesData, this.mapsData, this.upgradesData] =
      await Promise.all([
        fetch('src/data/resources.json').then((r) => r.json()),
        fetch('src/data/factories.json').then((r) => r.json()),
        fetch('src/data/policies.json').then((r) => r.json()),
        fetch('src/data/maps.json').then((r) => r.json()),
        fetch('src/data/upgrades.json').then((r) => r.json()),
      ]);
    this.resourceRegistry = new ResourceRegistry(this.resourcesData);
    this.factoryRegistry = new FactoryRegistry(this.factoriesData);
    this.policyTree = new PolicyTree(this.policiesData);
    this.upgradeRegistry = new UpgradeRegistry(this.upgradesData);

    // 创建 worker (ES module worker)
    this.worker = new Worker(new URL('./engine/worker.js', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e) => this._onWorkerMessage(e.data);
    this.worker.onerror = (e) => {
      console.error('Worker error', e);
      toast('err', 'Worker 错误: ' + e.message);
    };

    // 设置音量
    const vol = await getSetting('volume', 0.5);
    audio.setVolume(vol);
    const snd = await getSetting('audio', false);
    audio.setEnabled(snd);

    // 显示主菜单
    this.menu.show();
  }

  /** 启动新游戏 */
  async startNewGame(mapId, slot) {
    this.currentSlot = slot;
    const mapDef = this.mapsData.maps.find((m) => m.id === mapId) || this.mapsData.maps[0];
    this.map = new GameMap(mapDef);
    this.camera = this.map.camera;
    this.state.mapName = mapDef.name;
    this.state.cash = mapDef.startCash;
    this.state.resIds = this.resourceRegistry.all().filter((r) => r.category !== 'special').map((r) => r.id);

    // 初始化 worker
    this.worker.postMessage({
      t: MSG.INIT,
      resources: this.resourcesData,
      factories: this.factoriesData,
      policies: this.policiesData,
      maps: this.mapsData,
      upgrades: this.upgradesData,
      inventory: { ...mapDef.startResources },
      cash: mapDef.startCash,
      mapId, mapDef,
      policyUnlocked: [],
      upgradesOwned: [],
      swiss: 0,
    });

    // 先显示 game-root 容器，再初始化 PixiJS（需要 view-main 已渲染）
    this._initUI();
    await this._initPixi();
    this._initInput();
    this._startAutosave();
    this.loop.start();
    this._updateSaveIndicator();
  }

  /** 加载存档 */
  async loadGame(data, slot) {
    this.currentSlot = slot;
    const mapDef = this.mapsData.maps.find((m) => m.id === data.mapId) || this.mapsData.maps[0];
    this.map = new GameMap(mapDef);
    this.camera = this.map.camera;
    this.state.mapName = mapDef.name;
    this.state.cash = data.cash;
    this.state.swiss = data.swiss;
    this.state.resIds = this.resourceRegistry.all().filter((r) => r.category !== 'special').map((r) => r.id);
    this.state.policyUnlocked = data.policyUnlocked || [];
    this.state.upgradesOwned = data.upgradesOwned || [];

    // 离线收益
    const now = Date.now();
    const awaySec = Math.min((now - (data.savedAt || now)) / 1000, 86400);

    this.worker.postMessage({
      t: MSG.INIT,
      resources: this.resourcesData,
      factories: this.factoriesData,
      policies: this.policiesData,
      maps: this.mapsData,
      upgrades: this.upgradesData,
      inventory: data.inventory,
      cash: data.cash,
      mapId: data.mapId, mapDef,
      policyUnlocked: data.policyUnlocked || [],
      upgradesOwned: data.upgradesOwned || [],
      swiss: data.swiss || 0,
    });

    // 恢复放置
    if (data.placed) {
      for (const f of data.placed) {
        const def = this.factoryRegistry.get(f.defId);
        if (def) this.map.occupy(f.x, f.y, def.size[0], def.size[1], f.id);
      }
    }

    this._initUI();
    await this._initPixi();
    this._initInput();
    this._startAutosave();
    this.loop.start();

    // 离线结算弹窗
    if (awaySec > 60) {
      const minutes = Math.floor(awaySec / 60);
      toast('ok', `离线 ${minutes} 分钟`);
    }
  }

  setSpeed(sp) {
    this.worker.postMessage({ t: MSG.SET_SPEED, index: SPEED_LEVELS.indexOf(sp) });
  }

  async _initPixi() {
    if (this.app) {
      this.app.destroy(true);
    }
    const view = document.getElementById('view-main');
    if (!view) {
      throw new Error('view-main element not found');
    }
    view.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'game-canvas';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    view.appendChild(canvas);

    // PixiJS v8
    const PIXI = window.PIXI;
    if (!PIXI) {
      throw new Error('PixiJS not loaded');
    }
    this.app = new PIXI.Application();
    await this.app.init({
      canvas,
      width: view.clientWidth,
      height: view.clientHeight,
      backgroundColor: 0x14181c,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    this.PIXI = PIXI;

    // 分层容器
    this.pixiLayers = {
      grid: new PIXI.Container(),
      factories: new PIXI.Container(),
      effects: new PIXI.Container(),
      ui: new PIXI.Container(),
    };
    this.app.stage.addChild(this.pixiLayers.grid);
    this.app.stage.addChild(this.pixiLayers.factories);
    this.app.stage.addChild(this.pixiLayers.effects);
    this.app.stage.addChild(this.pixiLayers.ui);

    // 绘制网格
    this._drawGrid();

    // resize
    window.addEventListener('resize', () => this._onResize());

    // minimap
    if (!document.getElementById('minimap')) {
      const mm = document.createElement('canvas');
      mm.id = 'minimap';
      mm.width = 160; mm.height = 100;
      view.appendChild(mm);
      this._drawMinimap();
    }
  }

  _drawGrid() {
    const layer = this.pixiLayers.grid;
    layer.removeChildren();
    const PIXI = this.PIXI;
    const G = this.map.gen;
    const g = this.map.grid;
    const graphics = new PIXI.Graphics();
    for (let y = 0; y < G.h; y++) {
      for (let x = 0; x < G.w; x++) {
        const cell = G.cells[y * G.w + x];
        const p = g.toPixel(x, y);
        const color = parseInt(this.map.def.biomes.find(b => b.type === cell.biome)?.color?.slice(1) || '2a3a26', 16);
        if (g.kind === 'hex') {
          drawHex(graphics, p.x, p.y, g.size, color);
        } else {
          graphics.rect(p.x, p.y, g.cellSize, g.cellSize).fill(color);
          graphics.rect(p.x, p.y, g.cellSize, g.cellSize).stroke({ width: 1, color: 0x2a3038 });
        }
        // 资源点标记
        if (cell.resource) {
          const r = this.resourceRegistry.get(cell.resource);
          const ic = r ? parseInt((r.basePrice > 3 ? '4a9eff' : 'f0c04a'), 16) : 0xffffff;
          graphics.circle(p.x + g.cellSize / 2, p.y + g.cellSize / 2, 3).fill(ic);
        }
      }
    }
    layer.addChild(graphics);
  }

  _drawMinimap() {
    const mm = document.getElementById('minimap');
    if (!mm) return;
    const ctx = mm.getContext('2d');
    const G = this.map.gen;
    ctx.fillStyle = '#14181c';
    ctx.fillRect(0, 0, mm.width, mm.height);
    const sx = mm.width / G.w;
    const sy = mm.height / G.h;
    for (let y = 0; y < G.h; y++) {
      for (let x = 0; x < G.w; x++) {
        const cell = G.cells[y * G.w + x];
        const col = this.map.def.biomes.find(b => b.type === cell.biome)?.color || '#2a3a26';
        ctx.fillStyle = col;
        ctx.fillRect(x * sx, y * sy, Math.ceil(sx), Math.ceil(sy));
      }
    }
  }

  _onResize() {
    if (!this.app) return;
    const view = document.getElementById('view-main');
    this.app.renderer.resize(view.clientWidth, view.clientHeight);
  }

  _initUI() {
    // 显示游戏根
    const root = document.getElementById('game-root');
    if (root) root.classList.remove('hidden');
    const boot = document.getElementById('boot-screen');
    if (boot) boot.style.display = 'none';

    this.hud = new HUD(this);
    this.hud.render();
    this.buildPanel = new BuildPanel(this);
    this.buildPanel.refresh();

    // 右侧 tab
    this._buildRightTabs();
    this._switchTab('stock');

    // 选中工厂面板容器（位于右侧底部，浮层）
    if (!document.getElementById('factory-detail-host')) {
      const host = document.createElement('div');
      host.id = 'factory-detail-host';
      host.style.cssText = 'position:absolute;left:0;right:0;bottom:0;max-height:40%;overflow:auto;background:var(--bg-1);border-top:1px solid var(--border-0);';
      document.getElementById('panel-right').appendChild(host);
      this.factoryPanelEl = host;
    }
  }

  _buildRightTabs() {
    const right = document.getElementById('panel-right');
    right.innerHTML = `
      <div class="tab-bar" id="right-tabs">
        <button class="tab-btn" data-tab="stock">资源</button>
        <button class="tab-btn" data-tab="market">市场</button>
        <button class="tab-btn" data-tab="policy">政策</button>
        <button class="tab-btn" data-tab="charts">图表</button>
        <button class="tab-btn" data-tab="prestige">Prestige</button>
      </div>
      <div id="right-content" style="flex:1;overflow:hidden;display:flex;flex-direction:column"></div>
    `;
    right.querySelectorAll('.tab-btn').forEach((b) => {
      b.onclick = () => this._switchTab(b.dataset.tab);
    });
  }

  _switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('#right-tabs .tab-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    const content = document.getElementById('right-content');
    if (!content) return;
    if (this.marketUI) this.marketUI.detach();
    if (this.chartUI) this.chartUI.detach();
    content.innerHTML = '';
    if (tab === 'stock') this.stockPanel.render(content);
    else if (tab === 'market') { this.marketUI = new MarketUI(this); this.marketUI.render(content); }
    else if (tab === 'policy') this.policyUI.render(content);
    else if (tab === 'charts') { this.chartUI = new ChartUI(this); this.chartUI.render(content); }
    else if (tab === 'prestige') this.prestigeUI.render(content);
  }

  _initInput() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    this.input = new InputState(canvas, this.camera);
    this.input.on('click', (e) => this._onClick(e));
    this.input.on('zoom', () => this._updateCamera());
    this.input.on('pause', () => this.setSpeed(0));
    this.input.on('cancel', () => this.placement.clearSelection());
    this.input.on('demolish', () => {
      if (this.placement.selectedFactoryId) {
        const f = this.state.factories.find((x) => x.id === this.placement.selectedFactoryId);
        if (f) {
          const def = this.factoryRegistry.get(f.defId);
          if (def) this.map.release(f.x, f.y, def.size[0], def.size[1]);
          this.worker.postMessage({ t: MSG.DEMOLISH, factoryId: f.id });
        }
      }
    });
    // 鼠标移动：更新 ghost + tooltip
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      // input.mouse 已经在 InputState._onMove 里更新
      if (this.placement.selectedDefId) {
        const w = this.camera.screenToWorld(sx, sy);
        const c = this.map.pixelToCell(w.x, w.y);
        this.placement.setGhost(c.x, c.y);
      }
      // tooltip 用客户端坐标（fixed 定位）
      this.tooltip.update(e.clientX, e.clientY);
    });
    canvas.addEventListener('mouseleave', () => this.tooltip.hide());
  }

  _onClick(e) {
    if (this.placement.selectedDefId) {
      // 放置模式
      const w = this.camera.screenToWorld(e.x, e.y);
      const c = this.map.pixelToCell(w.x, w.y);
      this.placement.setGhost(c.x, c.y);
      this.placement.tryPlace();
      return;
    }
    // 选中工厂
    const w = this.camera.screenToWorld(e.x, e.y);
    const c = this.map.pixelToCell(w.x, w.y);
    const fid = this.map.factoryAt(c.x, c.y);
    if (fid) {
      this.placement.selectedFactoryId = fid;
      this.factoryUI.render(this.factoryPanelEl, fid);
    } else {
      this.placement.selectedFactoryId = null;
      this.factoryPanelEl.innerHTML = '';
    }
  }

  _updateCamera() {
    // PixiJS viewport 跟随 camera
    if (!this.app || !this.pixiLayers) return;
    const c = this.camera;
    this.pixiLayers.grid.x = c.x;
    this.pixiLayers.grid.y = c.y;
    this.pixiLayers.grid.scale.set(c.scale);
    this.pixiLayers.factories.x = c.x;
    this.pixiLayers.factories.y = c.y;
    this.pixiLayers.factories.scale.set(c.scale);
    this.pixiLayers.effects.x = c.x;
    this.pixiLayers.effects.y = c.y;
    this.pixiLayers.effects.scale.set(c.scale);
  }

  _onWorkerMessage(msg) {
    switch (msg.t) {
      case MSG.READY:
        break;
      case MSG.STATE_DELTA:
        this._applyDelta(msg);
        break;
      case MSG.TOAST:
        if (msg.key) toast(msg.level || 'ok', msg.key);
        else toast(msg.level || 'ok', msg.text || '');
        break;
      case MSG.ERROR:
        toast('err', msg.message);
        break;
      default: break;
    }
  }

  _applyDelta(msg) {
    this.state.cash = msg.cash;
    this.state.valuation = msg.valuation;
    this.state.gameTime = msg.gameTime;
    this.state.swiss = msg.swiss;
    this.state.peakValuation = msg.peakValuation;
    this.state.resIds = msg.resIds;
    this.state.prices = msg.prices;
    this.state.qtys = msg.qtys;
    this.state.factories = msg.factories;
    this.state.orders = msg.orders;
    this.state.orderHistory = msg.orderHistory;
    this.state.policyUnlocked = msg.policyUnlocked;
    this.state.upgradesOwned = msg.upgradesOwned;
    if (msg.priceHistory) this.state.priceHistory = msg.priceHistory;
    // 同步 map.placed：用 worker 推过来的 factories 重建占用映射
    if (this.map && msg.factories) {
      this.map.placed.clear();
      for (const f of msg.factories) {
        const def = this.factoryRegistry.get(f.defId);
        if (def) this.map.occupy(f.x, f.y, def.size[0], def.size[1], f.id);
      }
    }
    // 更新 HUD
    if (this.hud) this.hud.update();
    // 更新面板（节流由各 UI 自己处理）
    if (this.currentTab === 'stock') this.stockPanel.refresh();
    // 更新工厂图层
    this._renderFactoryLayer();
    this._updateCamera();
    // 更新选中工厂面板
    if (this.placement.selectedFactoryId) {
      this.factoryUI.render(this.factoryPanelEl, this.placement.selectedFactoryId);
    }
  }

  _renderFactoryLayer() {
    if (!this.pixiLayers || !this.PIXI) return;
    const layer = this.pixiLayers.factories;
    layer.removeChildren();
    const PIXI = this.PIXI;
    const g = this.map.grid;
    for (const f of this.state.factories) {
      const def = this.factoryRegistry.get(f.defId);
      if (!def) continue;
      const p = g.toPixel(f.x, f.y);
      const c = new PIXI.Container();
      const bg = new PIXI.Graphics();
      const color = categoryColor(def.category);
      bg.rect(p.x, p.y, g.cellSize * def.size[0], g.cellSize * def.size[1]).fill({ color, alpha: 0.85 });
      bg.rect(p.x, p.y, g.cellSize * def.size[0], g.cellSize * def.size[1]).stroke({ width: 1.5, color: 0x4a9eff });
      if (!f.enabled) bg.alpha = 0.4;
      c.addChild(bg);
      // 标签
      const t = new PIXI.Text({ text: def.name.slice(0, 4), style: { fontSize: 10, fill: 0xffffff, fontFamily: 'Consolas' } });
      t.x = p.x + 2; t.y = p.y + 2;
      c.addChild(t);
      // 等级
      const lv = new PIXI.Text({ text: 'L' + f.level, style: { fontSize: 8, fill: 0xaab2b8 } });
      lv.x = p.x + g.cellSize * def.size[0] - 14; lv.y = p.y + 2;
      c.addChild(lv);
      layer.addChild(c);
    }
  }

  _startAutosave() {
    if (this.autosaveTimer) clearInterval(this.autosaveTimer);
    this.autosaveTimer = setInterval(async () => {
      await this._doSave();
      this._updateSaveIndicator();
    }, AUTOSAVE_INTERVAL_MS);
  }

  async _doSave() {
    if (!this.worker) return;
    return new Promise((resolve) => {
      const handler = (e) => {
        if (e.data.t === MSG.STATE_SNAPSHOT) {
          this.worker.removeEventListener('message', handler);
          if (e.data.full) {
            saveSlot(this.currentSlot, e.data.full).then(() => {
              this.lastSaveTime = Date.now();
              toast('ok', 'toast.saved', 1200);
              resolve();
            }).catch((err) => {
              toast('err', '保存失败: ' + err.message);
              resolve();
            });
          } else resolve();
        }
      };
      this.worker.addEventListener('message', handler);
      this.worker.postMessage({ t: MSG.SAVE_SNAPSHOT });
    });
  }

  _updateSaveIndicator() {
    const el = document.getElementById('hud-save');
    if (el) {
      const t = new Date(this.lastSaveTime);
      el.textContent = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
    }
  }
}

function drawHex(g, cx, cy, size, color) {
  g.moveTo(cx, cy - size);
  for (let i = 1; i <= 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    g.lineTo(cx + size * Math.cos(a), cy + size * Math.sin(a));
  }
  g.closePath();
  g.fill(color);
  g.stroke({ width: 1, color: 0x2a3038 });
}

function categoryColor(cat) {
  switch (cat) {
    case 'raw': return 0x3a4a2a;
    case 'intermediate': return 0x2a3a4a;
    case 'product': return 0x4a2a3a;
    case 'special': return 0x4a3a2a;
    default: return 0x333333;
  }
}
