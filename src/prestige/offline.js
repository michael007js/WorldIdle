/**
 * prestige/offline.js — 离线收益计算
 * 基于平均产出率 + 上限（默认 24h，可被政策上调）
 */
import { OFFLINE_MAX_SECONDS, OFFLINE_RATE_CAP } from '../config.js';

export class OfflineEarnings {
  constructor(state) { this.state = state; }
  /** 计算离线时长秒数 */
  static computeAway(savedAt, now) {
    return Math.min((now - savedAt) / 1000, OFFLINE_MAX_SECONDS *
      (this?.state?.policyTree?.effects?.offlineMaxSecMult || 1));
  }
  /**
   * 简化模型：基于工厂每秒平均估值增长 + 当前库存 * 5% 比例
   * 真实原版用历史 tick 数据估算，这里取保守上界
   */
  compute(savedAt, now) {
    const cap = OFFLINE_MAX_SECONDS * (this.state.policyTree?.effects?.offlineMaxSecMult || 1);
    const away = Math.min((now - savedAt) / 1000, cap);
    if (away <= 0) return { away: 0, items: {}, total: 0 };
    // 工厂理论产出
    const items = {};
    const rateMult = (this.state.policyTree?.effects?.offlineRateMult || 1) * OFFLINE_RATE_CAP;
    for (const f of this.state.placed.values()) {
      const def = this.state.factoryRegistry.get(f.defId);
      if (!def || !f.enabled) continue;
      for (const out of def.outputs) {
        const rate = out.rate * f.speedMul * (1 + 0.2 * (f.level - 1)) * rateMult;
        items[out.id] = (items[out.id] || 0) + rate * away;
      }
    }
    let total = 0;
    for (const id in items) total += items[id] * this.state.market.getPrice(id);
    return { away, items, total };
  }
  apply(earnings) {
    for (const id in earnings.items) {
      this.state.inventoryPool.add(id, earnings.items[id]);
    }
  }
}
