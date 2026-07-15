/**
 * economy/analytics.js — 瓶颈/浪费/资金流分析
 */
export class Analytics {
  constructor(state) { this.state = state; }
  /** 找出输入短缺/输出堆积的工厂 */
  bottleneckList() {
    const out = [];
    for (const f of this.state.placed.values()) {
      const def = this.state.factoryRegistry.get(f.defId);
      if (!def) continue;
      // 输入是否充足（库存 vs 每秒需求）
      let shortInput = null;
      for (const inp of def.inputs) {
        const need = inp.rate * f.speedMul * (1 + 0.1 * (f.level - 1));
        const have = this.state.inventoryPool.get(inp.id);
        if (have < need) { shortInput = inp.id; break; }
      }
      // 输出是否堆积（库存大于一定阈值）
      let堆积 = null;
      for (const o of def.outputs) {
        const have = this.state.inventoryPool.get(o.id);
        if (have > 1000) { 堆积 = o.id; break; }
      }
      if (shortInput || 堆积) {
        out.push({ factoryId: f.id, defId: f.defId, shortInput, overflow: 堆积 });
      }
    }
    return out;
  }
  /** 现金流断裂预警：每秒净现金流 < 0 */
  cashflowWarning() {
    // 简化：返回 false，由 market 在挂单时检查
    return false;
  }
}
