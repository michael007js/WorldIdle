/**
 * market/market.js — 市场供需模拟 + 滑点
 */
import { PriceModel } from './prices.js';
import { OrderBook } from './orders.js';
import { AITraders } from './ai_traders.js';
import { MARKET_FEE_RATE, MARKET_PRICE_VOLATILITY } from '../config.js';

export class Market {
  constructor(resourceRegistry, inventory) {
    this.registry = resourceRegistry;
    this.inventory = inventory;
    this.prices = new PriceModel(resourceRegistry);
    this.book = new OrderBook();
    this.ai = new AITraders();
  }
  getPrice(id) { return this.prices.get(id); }
  /** 滑点：基于订单量的价格冲击估计 */
  computeSlippage(id, qty, side) {
    const p = this.prices.get(id);
    const base = this.registry.get(id).basePrice;
    const impact = Math.min(0.3, Math.sqrt(qty) * 0.008 * (p / base));
    return impact;
  }
  applyImpact(id, qty, side) {
    this.prices.applyImpact(id, qty, side);
  }
  tick(dt, state) {
    // 挂单撮合（简单版：限价单匹配对手盘）
    // 这里不做复杂撮合，因为玩家单多数是市价单
  }
  evolvePrices(dt, state) {
    const volMult = state.policyTree?.effects?.priceVolMult || 1;
    for (const r of this.registry.all()) {
      if (r.category === 'special') continue;
      const q = this.inventory.get(r.id);
      this.prices.evolve(r.id, q, dt, volMult);
    }
  }
  runAITraders(state) {
    this.ai.tick(0.1, state); // 固定 100ms 推进一次
  }
  history(id, n) { return this.prices.historySlice(id, n); }
}
