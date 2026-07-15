/**
 * prestige/upgrades.js — $wiss 永久升级
 */
export class UpgradeRegistry {
  constructor(data) {
    this.upgrades = (data.upgrades || []).map((u) => ({ ...u }));
    this.byId = new Map(this.upgrades.map((u) => [u.id, u]));
  }
  get(id) { return this.byId.get(id); }
  all() { return this.upgrades; }
  status(id, owned, swiss) {
    const u = this.get(id);
    if (!u) return 'unknown';
    if (owned.has(id)) return 'owned';
    if (u.requires && !u.requires.every((r) => owned.has(r))) return 'locked';
    if (swiss < u.cost) return 'locked';
    return 'available';
  }
  effects(owned) {
    const out = {
      startCashMult: 1, startResMult: 1, prestigeGainMult: 1,
      offlineMaxSecMult: 1, factoryOutputMult: 1, marketFeeMult: 1,
      unlockedMaps: new Set(),
    };
    for (const u of this.upgrades) {
      if (!owned.has(u.id)) continue;
      const e = u.effects || {};
      if (e.startCashMult) out.startCashMult *= e.startCashMult;
      if (e.startResMult) out.startResMult *= e.startResMult;
      if (e.prestigeGainMult) out.prestigeGainMult *= e.prestigeGainMult;
      if (e.offlineMaxSecMult) out.offlineMaxSecMult *= e.offlineMaxSecMult;
      if (e.factoryOutputMult) out.factoryOutputMult *= e.factoryOutputMult;
      if (e.marketFeeMult) out.marketFeeMult *= e.marketFeeMult;
      if (e.unlockMap) out.unlockedMaps.add(e.unlockMap);
    }
    return out;
  }
}
