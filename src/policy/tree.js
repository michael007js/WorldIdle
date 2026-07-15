/**
 * policy/tree.js — 政策树拓扑 + 解锁条件 + 效果应用
 */
export class PolicyTree {
  constructor(data) {
    this.nodes = new Map((data.policies || []).map((p) => [p.id, p]));
    this.effects = {
      factoryOutputMult: 1,
      marketFeeMult: 1,
      offlineRateMult: 1,
      offlineMaxSecMult: 1,
      demolishRefundBonus: 0,
      upgradeCostMult: 1,
      priceVolMult: 1,
      prestigeGainMult: 1,
      valuationFactoryWeight: 1,
    };
  }
  get(id) { return this.nodes.get(id); }
  all() { return Array.from(this.nodes.values()); }
  status(id, unlockedSet, valuation, prestigeLevel) {
    const n = this.get(id);
    if (!n) return 'unknown';
    if (unlockedSet.has(id)) return 'unlocked';
    if (!this.canUnlock(id, unlockedSet, valuation, prestigeLevel)) return 'locked';
    return 'available';
  }
  canUnlock(id, unlockedSet, valuation, prestigeLevel) {
    const n = this.get(id);
    if (!n) return false;
    if (n.requires && !n.requires.every((r) => unlockedSet.has(r))) return false;
    return true;
  }
  /** 应用一个政策效果到 state（累加式） */
  apply(state, node) {
    const e = node.effects || {};
    // 注意：mult 类政策用乘法、bonus 类用加法
    if (e.factoryOutputMult) this.effects.factoryOutputMult *= e.factoryOutputMult;
    if (e.marketFeeMult) this.effects.marketFeeMult *= e.marketFeeMult;
    if (e.offlineRateMult) this.effects.offlineRateMult *= e.offlineRateMult;
    if (e.offlineMaxSecMult) this.effects.offlineMaxSecMult *= e.offlineMaxSecMult;
    if (e.demolishRefundBonus) this.effects.demolishRefundBonus += e.demolishRefundBonus;
    if (e.upgradeCostMult) this.effects.upgradeCostMult *= e.upgradeCostMult;
    if (e.priceVolMult) this.effects.priceVolMult *= e.priceVolMult;
    if (e.prestigeGainMult) this.effects.prestigeGainMult *= e.prestigeGainMult;
    if (e.valuationFactoryWeight) this.effects.valuationFactoryWeight *= e.valuationFactoryWeight;
  }
}
