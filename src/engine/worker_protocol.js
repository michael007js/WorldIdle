/**
 * engine/worker_protocol.js — 主线程/Worker 消息 schema 与序列化。
 *
 * 协议：所有主线程→Worker 消息为 {t: MSG_TYPE, ...payload}
 * Worker→主线程 为 {t: MSG_TYPE, ...payload, transfer?}
 * 大批量状态用 transferable Float32Array/ArrayBuffer 避免结构化克隆。
 */

export const MSG = {
  // 主线程 → Worker
  INIT: 'init',              // 初始化 worker，附完整游戏状态快照
  SET_SPEED: 'set_speed',    // 设置倍速索引
  PLACE_FACTORY: 'place',    // 放置工厂
  DEMOLISH: 'demolish',      // 拆除
  UPGRADE: 'upgrade',        // 升级工厂
  SET_FACTORY_OPT: 'factory_opt', // 微调速度/启用
  PLACE_ORDER: 'order',      // 挂单
  CANCEL_ORDER: 'cancel_order',
  TICK_CONFIG: 'tick_config',
  APPLY_POLICY: 'policy',
  RUN_PRESTIGE: 'prestige',
  SET_MAP: 'set_map',
  PAUSE: 'pause',
  RESUME: 'resume',
  SAVE_SNAPSHOT: 'snapshot', // 请求存档快照
  TERMINATE: 'terminate',

  // Worker → 主线程
  READY: 'ready',
  STATE_DELTA: 'state_delta', // 增量状态推送
  STATE_SNAPSHOT: 'state_snapshot',
  FLOAT_TEXT: 'float_text',  // 飘字事件
  TOAST: 'toast',             // toast 事件
  ERROR: 'error',
  MARKET_TICK: 'market_tick',
};

/** 序列化工厂实例用于传输 */
export function serializeFactory(f) {
  return {
    id: f.id, defId: f.defId, x: f.x, y: f.y, level: f.level,
    speedMul: f.speedMul, enabled: f.enabled, priority: f.priority,
    accIn: f.accIn, accOut: f.accOut,
  };
}

/** 把 Float32Array 标记为可转移 */
export function transferable(arr) {
  return { buffer: arr.buffer, transfer: [arr.buffer] };
}
