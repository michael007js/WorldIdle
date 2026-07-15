/**
 * config.js — 全局常量（tick rate、平衡系数、版本号）
 * 模块顶部导出，禁止跨模块直接改写。
 */

export const VERSION = '0.1.0';
export const SAVE_VERSION = 1;

// Tick 模型：fixed timestep = 100ms（10 tick/s）
export const TICK_MS = 100;
export const TICKS_PER_SEC = 10;

// 时间倍速
export const SPEED_LEVELS = [0, 1, 2, 5, 10, 20, 50, 100];
export const DEFAULT_SPEED_INDEX = 1; // 1x

// 渲染
export const TARGET_FPS = 60;
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4.0;
export const ZOOM_SENSITIVITY = 0.0015;

// 自动保存
export const AUTOSAVE_INTERVAL_MS = 30000; // 30s 默认，可被设置覆盖
export const AUTOSAVE_INTERVALS = [10000, 30000, 60000, 120000, 300000];

// 离线收益上限（秒）
export const OFFLINE_MAX_SECONDS = 86400; // 24h
export const OFFLINE_RATE_CAP = 0.8; // 离线产出按在线速率的 80% 计算（政策可上调）

// 工厂/拆除
export const DEMOLISH_REFUND_RATE = 0.5; // 默认返还 50%，政策可上调

// 市场
export const MARKET_FEE_RATE = 0.02; // 默认 2% 手续费
export const MARKET_PRICE_VOLATILITY = 0.15; // 价格波动幅度
export const MARKET_AI_TRADER_COUNT = 12; // AI 对手盘数量
export const MARKET_DEPTH_BASE = 100; // 挂单深度基准

// 价格曲线历史采样
export const PRICE_HISTORY_LENGTH = 720; // 保留 720 个采样点（按 tick 采样约 72s）

// 网格
export const GRID_CELL_SIZE = 32; // 默认方格像素
export const HEX_SIZE = 36; // 六边形外接圆半径

// 起始资源
export const START_CASH = 10000;
export const START_RESOURCES = { iron: 50, coal: 30, copper: 20 };

// 估值
export const VALUATION_FACTORY_WEIGHT = 1.0;
export const VALUATION_INVENTORY_WEIGHT = 0.8;

// Prestige
export const PRESTIGE_THRESHOLD = 1e6; // 估值达到 1M 可 prestige
export const PRESTIGE_CURRENCY = 'swiss';

// IndexedDB
export const IDB_NAME = 'industry_idle_clone';
export const IDB_VERSION = 1;
export const IDB_STORE_SAVES = 'saves';
export const IDB_STORE_SETTINGS = 'settings';

// 性能
export const MAX_PARTICLES = 200;
export const VIEWPORT_CULL_MARGIN = 64;

// 字体
export const FONT_MONO = 'JetBrains Mono, Consolas, Menlo, monospace';
export const FONT_SANS = '-apple-system, BlinkMacSystemFont, Segoe UI, Microsoft YaHei, sans-serif';
