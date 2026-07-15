/**
 * market/ai_traders.js — AI 玩家挂单生成器（替代原版真实多人）
 *
 * 原版有真实多人服务器，本项目用 AI 模拟。
 * 每个 AI trader 在每 tick 以一定概率挂单 / 撤单，价格围绕当前价波动。
 */
import { MARKET_AI_TRADER_COUNT } from '../config.js';

export class AITraders {
  constructor() {
    this.traders = Array.from({ length: MARKET_AI_TRADER_COUNT }, (_, i) => ({
      id: i, mood: Math.random() * 2 - 1, timer: Math.random() * 5,
    }));
  }
  tick(dt, state) {
    for (const t of this.traders) {
      t.timer -= dt;
      if (t.timer <= 0) {
        t.timer = 1 + Math.random() * 4;
        t.mood = t.mood * 0.7 + (Math.random() * 2 - 1) * 0.3;
        const res = state.resources.resources.filter(r => r.category !== 'special');
        const r = res[Math.floor(Math.random() * res.length)];
        const price = state.market.getPrice(r.id);
        const variance = price * 0.03;
        const aiPrice = price + (Math.random() * 2 - 1) * variance + t.mood * variance * 0.5;
        const side = Math.random() < 0.5 ? 'buy' : 'sell';
        const qty = 5 + Math.floor(Math.random() * 50);
        // 直接成市价单（不进入挂单簿），保持简单
        const fee = aiPrice * qty * 0.005;
        if (side === 'buy') {
          // AI 增加需求 → 价格略升
          state.market.applyImpact(r.id, qty, 'buy');
        } else {
          state.market.applyImpact(r.id, qty, 'sell');
        }
      }
    }
  }
}
