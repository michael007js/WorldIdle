/**
 * factory/registry.js — 工厂注册表（数据驱动，从 JSON 加载）
 */
export class FactoryRegistry {
  constructor(data) {
    this.factories = (data.factories || []).map((d) => ({ ...d }));
    this.byId = new Map(this.factories.map((f) => [f.id, f]));
  }
  get(id) { return this.byId.get(id); }
  all() { return this.factories; }
  byCategory(cat) { return this.factories.filter((f) => f.category === cat); }
  /** 升级到 nextLevel 所需现金 */
  upgradeCost(def, currentLevel, costMult = 1) {
    const mult = def.upgradeCostMult || 2;
    return Math.floor(def.cost * Math.pow(mult, currentLevel) * costMult);
  }
}
