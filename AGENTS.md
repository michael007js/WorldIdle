# AGENTS.md — Industry Idle Web Clone

纯 HTML + CSS + JavaScript（ES Modules）+ PixiJS v8 + Web Worker 复刻 Steam app/1574000「Industry Idle」核心玩法。工厂经营 + 资源管理 + 市场交易 + 增量放置(idle/incremental) + Prestige 重生。

> **本项目不是原版的逐行移植。** 原版为 Cocos Creator 2.4 + TypeScript + WebGL renderer + 真实多人服务器；本项目用纯 JS + PixiJS + Web Worker 重新实现等价场景，市场撮合用 AI 模拟对手盘替代真实多人。代码与原版无任何关系，仅玩法/数值/视觉风格对齐。

任何 AI 代理接手前必须读完本文件。

---

## 一、启动与验证

### 启动
```bash
cd "C:\app\world idle"
python -m http.server 8080
# 或双击 启动.bat
# 浏览器打开 http://localhost:8080/
```

**不支持 `file://` 直接打开**（ES Modules + Worker + fetch JSON 限制）。

### 环境要求
- Python 3.x（仅用于启动 `http.server`，不是运行时依赖）
- 浏览器：Chrome / Edge / Firefox 最新版（需支持 ES Modules + ES Module Worker + WebGL2）
- **PixiJS v8.6.6**：通过 CDN 引入（`index.html` 中的 `<script src="https://cdn.jsdelivr.net/npm/pixi.js@8.6.6/dist/pixi.min.js">`），无本地 `node_modules`，无构建步骤
- 无其他运行时依赖（不引入 React/Vue/jQuery/Lodash）

### 改动后必须验证
1. 服务器无 404（检查终端日志）
2. 浏览器控制台无 error（warning 可忽略）
3. 进入游戏后能放工厂、看到产出、买卖资源、升级、打开各 tab

### 改动验证检查清单
- [ ] 改动后启动服务器，控制台无 error
- [ ] 能进入主菜单 → 新游戏 → 看到网格
- [ ] 能放置工厂 → 库存有产出
- [ ] 能买卖资源 → 现金变化
- [ ] 能升级工厂 → 等级提升
- [ ] 各 tab 切换正常（资源/市场/政策/图表/Prestige）
- [ ] tooltip 悬浮正常
- [ ] 中键平移方向与鼠标一致
- [ ] 自动保存不报错（等 30s 看有无 toast）

---

## 二、如何玩

### 完整游戏流程
1. **主菜单** → 点「新游戏」→ 选择地图（首版推荐「草原」）
2. **左侧建造面板**：选工厂 → 在主网格上点击放置（成本从现金扣除）
3. **工厂自动运行**：从全局库存取输入资源 → 产出物入库存（无需连接传送带）
4. **右侧「资源」tab**：查看所有资源库存、当前市价
5. **右侧「市场」tab**：选择资源 → 输入数量 → 买入/卖出（市价单，含滑点 + 手续费）
6. **点击已放置的工厂**：底部弹出详情面板 → 升级 / 拆除 / 调速 slider / 启用停用
7. **顶部倍速**：暂停 / 1x / 2x / 5x / 10x / 20x / 50x / 100x
8. **估值达 1M** → 右侧「Prestige」tab → 重置进度换取 $wiss
9. **$wiss 在「政策」tab** 解锁政策效果（产量提升/手续费减免/离线加成等）

### 鼠标操作
| 操作 | 效果 |
|------|------|
| **左键点击网格** | 放置已选工厂 / 选中已放置工厂 |
| **中键拖拽** | 平移地图（方向与鼠标一致） |
| **滚轮** | 缩放（0.25x – 4x，围绕鼠标点） |
| **鼠标悬浮** | 显示格子 tooltip（地形/资源点/工厂详情） |

> 右键已被禁用（`contextmenu` 阻止默认菜单），不触发任何操作。平移只用中键。

### 快捷键
| 键 | 功能 |
|----|------|
| `Space` | 暂停 |
| `1`–`5` | 切换倍速档位 |
| `X` | 拆除当前选中工厂 |
| `U` | 升级当前选中工厂 |
| `Esc` | 取消当前选择 |

### 存档
- **自动保存**：每 30 秒（`AUTOSAVE_INTERVAL_MS`，可在 `config.js` 改）
- **多槽位**：主菜单 → 「读取存档」可看到所有槽位，支持继续/删除
- **IndexedDB** 持久化，清浏览器数据会丢失
- 存档对象带 `version` 字段，未来升级走 migration 链（`src/engine/save.js` 的 `migrate()`）

### 离线收益
关闭游戏后重新打开，根据离开时长（上限 24h）按工厂产出速率的 80% 结算离线收益，弹 toast 提示。

---

## 三、项目结构

```
C:\app\world idle\
├── index.html              # HTML 入口，引入 PixiJS CDN + main.js
├── styles.css              # 灰色科技风样式（485 行，含所有面板/HUD/modal/toast）
├── AGENTS.md               # 本文件
├── 启动.bat                # Windows 启动脚本
├── promate.txt             # 原始需求文档
├── assets/
│   └── icons/
│       └── placeholder.svg # 占位图标（工厂/资源图标目前用首字母色块）
└── src/
    ├── main.js             # 入口：boot screen → 加载数据 → 显示主菜单
    ├── game.js             # 主控制器（540 行）：状态机、PixiJS 初始化、UI 编排、worker 通信
    ├── config.js           # 全局常量（tick/速度/缩放/经济系数/IDB 名）
    ├── engine/
    │   ├── loop.js             # 主线程 rAF 循环（仅渲染+输入，模拟在 worker）
    │   ├── worker.js           # Web Worker 入口（344 行）：tick 推进/市场/价格/AI 挂单
    │   ├── worker_protocol.js  # 主线程↔worker 消息 schema（MSG 常量 + 序列化辅助）
    │   ├── input.js            # 键鼠输入：中键平移/滚轮缩放/快捷键/键位重绑
    │   ├── save.js             # IndexedDB 读写 + 多槽位 + 导入导出 + migration
    │   ├── audio.js            # WebAudio 合成音效（默认静音，设置中可开）
    │   └── i18n.js             # 中/英本地化（键路径 + fallback）
    ├── world/
    │   ├── grid.js             # 网格数据结构：SquareGrid + HexGrid（axial 坐标）
    │   ├── map.js              # 地图实例：放置/碰撞/占用映射
    │   ├── mapgen.js           # 程序化生成：mulberry32 seeded RNG + biome + 资源点
    │   └── camera.js           # 视图变换：pan/zoom/worldToScreen/screenToWorld
    ├── factory/
    │   ├── factory.js          # 工厂实例（id/位置/等级/速度/启用/累加器）
    │   ├── registry.js         # 工厂注册表（从 JSON 加载，按 id/category 查询）
    │   └── placement.js        # 放置控制器：ghost preview/碰撞检测/向 worker 发 place
    ├── resource/
    │   ├── resource.js         # 资源定义（id/名称/分类/基础价/图标）
    │   ├── registry.js         # 资源注册表
    │   └── inventory.js        # 全局库存池：add/remove/canAfford/totalValue
    ├── market/
    │   ├── market.js           # 市场总入口：getPrice/computeSlippage/evolvePrices
    │   ├── orders.js           # 挂单簿：add/cancel/match/recentHistory
    │   ├── prices.js           # 价格演化模型：基础价×供需×噪声×漂移 + 720 点历史
    │   └── ai_traders.js       # AI 对手盘（替代原版真实多人）：12 个 trader 定时挂单
    ├── policy/
    │   ├── policy.js           # 政策效果辅助导出
    │   └── tree.js             # 政策树拓扑 + 解锁条件 + 效果累加应用
    ├── economy/
    │   ├── valuation.js        # 公司估值 = 工厂价值 + 库存估值 + 现金
    │   ├── charts.js           # 图表渲染器（独立 Canvas2D，脏标记重绘）
    │   └── analytics.js        # 瓶颈分析：输入短缺/输出堆积检测
    ├── prestige/
    │   ├── prestige.js         # 重生流程：canPrestige/potentialGain/run
    │   ├── upgrades.js         # $wiss 永久升级注册表 + 效果聚合
    │   └── offline.js          # 离线收益计算（基于工厂产出速率 × 时长 × 0.8）
    ├── ui/
    │   ├── hud.js              # 顶部 HUD：现金/估值/地图/$wiss/FPS/倍速按钮/自动保存
    │   ├── build_panel.js      # 左侧建造列表：搜索 + 分类 + 成本预览
    │   ├── stock_panel.js      # 右侧资源库存：名称/价格/数量
    │   ├── market_ui.js        # 右侧市场：选资源/买卖/成交历史
    │   ├── policy_ui.js        # 右侧政策树：节点状态（已解锁/可学/锁定）
    │   ├── chart_ui.js         # 右侧图表：资源价格折线（独立 Canvas）
    │   ├── factory_ui.js       # 底部工厂详情：升级/拆除/调速/启停
    │   ├── prestige_ui.js      # 右侧 Prestige：进度/收益/确认
    │   ├── tooltip.js          # 鼠标悬浮提示（地形/资源点/工厂）
    │   ├── toast.js            # toast 通知 + 飘字 + modal 对话框
    │   ├── menu.js             # 主菜单/存档选择/设置/关于
    │   └── theme.js            # 灰色科技风色板 token
    └── data/
        ├── resources.json      # 24 种资源（raw/intermediate/product/special）
        ├── factories.json      # 25 种工厂（含输入/输出/速度/成本/升级倍率）
        ├── policies.json       # 12 种政策（含前置依赖 + 效果系数）
        ├── maps.json           # 3 张地图（草原/海岸/高原，hex+square）
        ├── upgrades.json       # 10 种 $wiss 永久升级
        └── i18n/
            ├── zh.json         # 中文
            └── en.json         # 英文
```

---

## 四、架构约束

### 主线程 ↔ Worker
- **主线程**：只做渲染（PixiJS v8）、输入、UI DOM 操作。帧预算 16ms。
- **Web Worker**（ES Module Worker）：跑模拟逻辑（tick/市场/价格/AI 挂单）。`fixed timestep = 100ms`（10 tick/s），高倍速下子步进（maxSteps=200 防积压）。每 200ms 推送一次 `STATE_DELTA`。
- 通信用 `postMessage`，批量状态用 transferable `Float32Array.buffer`（`prices` 和 `qtys`）
- 协议常量在 `src/engine/worker_protocol.js` 的 `MSG` 对象

```
主线程（渲染 + 输入 + UI）
  │
  │ postMessage（命令：place/upgrade/order/...）
  ▼
Web Worker（ES Module Worker，跑模拟）
  │ tick 推进 / 市场撮合 / 价格演化 / AI 挂单
  │
  │ postMessage（STATE_DELTA：cash/prices/qtys/factories + transferable Float32Array）
  ▼
主线程（_applyDelta → 更新 HUD/面板/PixiJS 图层）
```

### 禁止跨层访问
- UI 模块通过 `this.game.state` 读主线程镜像状态，不直接访问 worker 内部
- Worker 内部状态只能通过 `STATE_SNAPSHOT` 拿完整快照
- 各子目录通过 `index.js` 或直接命名导出，禁止 reach into 私有字段

### 渲染管线（PixiJS v8）
- 分层容器：`grid`（地形/资源点）→ `factories`（工厂方块+标签）→ `effects`（预留）→ `ui`（预留）
- 相机变换：每帧把 `camera.x/y/scale` 同步到所有图层的 `position` 和 `scale`
- 网格在 `_drawGrid()` 一次性绘制到 `PIXI.Graphics`（静态层，不每帧重绘）
- 工厂图层在 `_renderFactoryLayer()` 每次 `STATE_DELTA` 时重建（当前简化实现，后续可优化为 diff 更新）
- 小地图：独立 `<canvas>` 用 Canvas2D 绘制（不进 PixiJS 主循环）
- 图表：独立 `<canvas>` 用 Canvas2D，脏标记重绘（`ChartRenderer`，1 秒刷新一次）

### 数据驱动
所有数值在 `src/data/*.json`，代码从 JSON 加载，不在源码硬编码。加工厂/资源/政策/地图/升级**只改 JSON**，不改代码。新效果类型需同时改 `src/policy/tree.js` 的 `apply()`。

### 存档
- **IndexedDB**（`IDB_NAME = 'industry_idle_clone'`）：主存档，store `saves`（按 slot 键）+ `settings`
- **LocalStorage**：IndexedDB 不可用时 fallback 存设置
- **版本化**：`SAVE_VERSION = 1`，`migrate()` 函数预留升级链
- **自动保存**：每 30s 向 worker 请求 `STATE_SNAPSHOT`，写入 IndexedDB

---

## 五、关键文件

| 文件 | 职责 | 改动频率 |
|------|------|----------|
| `src/game.js` | 主控制器（540 行），状态机/PixiJS/UI 编排/worker 通信 | 高 |
| `src/engine/worker.js` | Worker 入口（344 行），tick/市场/价格/AI | 高 |
| `src/config.js` | 全局常量，改数值优先来这里 | 中 |
| `src/engine/input.js` | 输入：中键平移(e.button===1)/滚轮缩放/快捷键 | 低 |
| `src/world/camera.js` | 相机：pan 用 `+=`（与鼠标同向） | 低 |
| `src/ui/tooltip.js` | 鼠标悬浮提示，依赖 `map.placed` 同步 | 中 |

---

## 六、关键数值（`src/config.js`）

| 常量 | 值 | 说明 |
|------|-----|------|
| `TICK_MS` | 100 | fixed timestep 100ms（10 tick/s） |
| `SPEED_LEVELS` | `[0,1,2,5,10,20,50,100]` | 倍速档位 |
| `ZOOM_MIN` / `ZOOM_MAX` | 0.25 / 4.0 | 缩放范围 |
| `AUTOSAVE_INTERVAL_MS` | 30000 | 自动保存间隔 |
| `OFFLINE_MAX_SECONDS` | 86400 | 离线收益上限 24h |
| `OFFLINE_RATE_CAP` | 0.8 | 离线产出按在线 80% 计算 |
| `DEMOLISH_REFUND_RATE` | 0.5 | 拆除返还 50%（政策可上调） |
| `MARKET_FEE_RATE` | 0.02 | 市场手续费 2% |
| `MARKET_AI_TRADER_COUNT` | 12 | AI 对手盘数量 |
| `PRICE_HISTORY_LENGTH` | 720 | 价格历史采样点数 |
| `GRID_CELL_SIZE` | 32 | 方格像素 |
| `HEX_SIZE` | 36 | 六边形外接圆半径 |
| `START_CASH` | 10000 | 起始现金（地图配置可覆盖） |
| `PRESTIGE_THRESHOLD` | 1e6 | 估值达 1M 可 prestige |

---

## 七、代码风格

- 2 空格缩进，分号强制
- 常量 `UPPER_SNAKE`，类 `PascalCase`，函数/变量 `camelCase`
- 模块顶部 JSDoc 注释，公开函数签名注释，**不在函数体内加废话注释**
- 不加 emoji
- 模块边界：各子目录导出明确接口，禁止跨层直接访问私有字段
- 错误处理：`save/load`、worker 通信、JSON 解析有 try/catch + 用户可见 toast
- 无 lint 配置：未附带 ESLint/Prettier 配置文件

---

## 八、已知坑（必读）

1. **`map.placed` 同步**：主线程 `map.placed`（格子占用）在 `_applyDelta` 时用 worker 推送的 factories 重建。id 不一致会导致 tooltip/click 失效。
2. **PixiJS v8 API**：`new PIXI.Application()` 需 `await app.init()`；`Graphics` 用 `.rect().fill()` 链式 API，不是 v7 的 `beginFill/drawRect/endFill`。
3. **ES Module Worker**：`new Worker(url, { type: 'module' })`，worker 内可用 `import`。老浏览器不支持。
4. **中键拖拽**：`_onDown` 里 `e.preventDefault()` 防止浏览器默认中键自动滚动。
5. **右键禁用**：`contextmenu` 被阻止，右键不触发任何操作。平移只用中键。
6. **价格历史传输**：worker 推送的 `priceHistory` 是普通 Array（非 Float32Array），因为是嵌套对象 `{resId: [numbers]}`，无法 transferable。大地图下可能增加序列化开销。

---

## 九、接手指南

### 改动常见场景

#### 1. 加一个新工厂
编辑 `src/data/factories.json`，在 `factories` 数组加一项：
```json
{"id":"my_factory","name":"我的工厂","nameEn":"My Factory","category":"product","size":[2,2],"baseSpeed":0.3,"cost":5000,"inputs":[{"id":"steel","rate":1.0}],"outputs":[{"id":"engine","rate":0.3}],"upgradeLevels":5,"upgradeCostMult":2.0}
```
然后把它加到对应地图的 `unlockedFactories` 数组（`src/data/maps.json`）。无需改代码。

#### 2. 加一个新资源
编辑 `src/data/resources.json`，加一项：
```json
{"id":"my_res","name":"我的资源","nameEn":"My Resource","category":"intermediate","basePrice":20,"icon":"my_res"}
```
无需改代码，市场会自动为非 special 资源生成价格曲线。

#### 3. 加一个新政策
编辑 `src/data/policies.json`，加一项。`effects` 的 key 必须对应 `src/policy/tree.js` 中 `this.effects` 的属性名（如 `factoryOutputMult`、`marketFeeMult` 等）。要加新效果类型需同时改 `tree.js` 的 `apply()`。

#### 4. 改起始数值
- 现金/资源：`src/data/maps.json` 对应地图的 `startCash` / `startResources`
- 全局系数：`src/config.js`

#### 5. 改输入操作
- 平移键：`src/engine/input.js` 的 `_onDown` 中 `e.button === 1`（中键）
- 快捷键：`src/engine/input.js` 的 `this.binds`
- 缩放方向：`src/world/camera.js` 的 `pan()` 中 `+=`（与鼠标同向）

### 调试
- `window.game`：在浏览器控制台可访问 Game 实例
- `window.game.state`：主线程镜像状态（cash/factories/prices/qtys...）
- `window.game.worker`：Worker 实例，可直接 `postMessage` 测试
- Worker 内部状态不可直接访问（在 Worker 线程），需通过 `SAVE_SNAPSHOT` 拿完整快照

---

## 十、当前实现范围

### 已实现（可玩）
- **工厂 25 种**（数据驱动，schema 支持 130+）：raw/intermediate/product/special 四类
- **资源 24 种**：raw/intermediate/product/special
- **政策 12 种**：含前置依赖树 + 效果累加（产量/手续费/离线/拆除/升级折扣/价格波动/prestige 收益/估值权重）
- **地图 3 张**：草原（square 40×30）/ 海岸（hex 30×24）/ 高原（square 48×36）
- **$wiss 永久升级 10 种**：启动资金/初始库存/地图解锁/prestige 收益/离线上限/产量/手续费
- **完整 Prestige 闭环**：估值达标 → 重置 → 获 $wiss → 解锁政策/升级
- **市场模拟**：供需价格曲线 + 噪声波动 + 滑点 + AI 对手盘 + 成交历史
- **时间倍速**：暂停/1x/2x/5x/10x/20x/50x/100x，子步进保证数值稳定
- **离线收益**：24h 上限，按 80% 速率结算
- **存档**：IndexedDB 多槽位 + 自动保存 + 导入导出
- **UI**：HUD + 左建造面板 + 右 5 tab（资源/市场/政策/图表/Prestige）+ 工厂详情 + tooltip + toast + modal + 主菜单
- **鼠标悬浮 tooltip**：地形/资源点/工厂详情
- **中/英 i18n** 框架

### 已知限制 / 未实现
1. **市场撮合**：AI 模拟对手盘，非真实多人服务器（原版有真实多人）
2. **工厂图标**：用首字母色块占位，未做 SVG 精美图标（`assets/icons/` 只有 placeholder.svg）
3. **音效**：WebAudio 合成 tone，默认静音，无真实音效文件
4. **离线收益弹窗**：当前只弹 toast，未做明细弹窗（各工厂产出明细）
5. **框选批量操作**：`placement.js` 预留接口，未实现
6. **工厂旋转**：未实现（多格工厂固定朝向）
7. **视口裁剪**：未实现 culling，大地图下工厂多时可能掉帧（`_renderFactoryLayer` 每次全量重建）
8. **静态层缓存**：未实现 RenderTexture 缓存
9. **传送带/物流网络**：故意简化为全局库存池（符合原版简化思路）
10. **K 线图**：只实现折线图，未做 K 线
11. **深度图**：市场 tab 只有成交历史，未做深度图
12. **政策树可视化**：节点列表平铺，未做节点图拓扑连线
13. **设置界面**：只有语言/音效/音量，未实现自动保存间隔/性能档位/键位重绑 UI（`input.js` 的 `rebind()` 已预留）
14. **数字飘字**：`toast.js` 的 `floatText()` 已实现，但工厂产出时未触发
15. **小地图点击跳转**：小地图只渲染，未实现点击跳转视图

---

## 十一、参考

- 原版商店页：<https://store.steampowered.com/app/1574000/Industry_Idle/>
- 原版源码（GPL-3.0，Cocos Creator 2.4 + TS）：<https://github.com/fishpondstudio/IndustryIdle>
- 原版网页版（对照 UI/手感）：<https://play.industryidle.com/>
- 原版官网：<https://industryidle.com/>
- PixiJS v8 文档：<https://pixijs.download/release/docs/index.html>

---

## 十二、版本

- **项目版本**：`0.1.0`（`src/config.js` 的 `VERSION`）
- **存档版本**：`1`（`SAVE_VERSION`）
- **最后更新**：2026-07-15
