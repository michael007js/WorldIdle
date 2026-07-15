/**
 * market/orders.js — 挂单/撮合/成交历史
 * 原版为真实多人服务器，本项目用 AI 模拟对手盘替代。
 */
import { MARKET_FEE_RATE } from '../config.js';

export class OrderBook {
  constructor() {
    this.open = []; // {id, side, resId, qty, price, ts}
    this.history = [];
    this.nextId = 1;
  }
  add(side, resId, qty, price, isMarket = false) {
    const o = { id: this.nextId++, side, resId, qty, price: isMarket ? 0 : price, ts: Date.now(), isMarket };
    this.open.push(o);
    return o;
  }
  cancel(id) {
    this.open = this.open.filter((o) => o.id !== id);
  }
  /** 撮合：尝试匹配市价单 / 限价单 */
  match(order, currentPrice) {
    const matches = [];
    const remaining = [];
    for (const o of this.open) {
      if (o.id === order.id) continue;
      if (o.resId !== order.resId) continue;
      if (order.side === 'buy' && o.side === 'sell' && o.price <= currentPrice) {
        const q = Math.min(order.qty, o.qty);
        matches.push({ matchId: o.id, qty: q, price: o.price });
        order.qty -= q;
        o.qty -= q;
      } else if (order.side === 'sell' && o.side === 'buy' && o.price >= currentPrice) {
        const q = Math.min(order.qty, o.qty);
        matches.push({ matchId: o.id, qty: q, price: o.price });
        order.qty -= q;
        o.qty -= q;
      }
      if (o.qty > 0) remaining.push(o);
    }
    if (order.qty > 0 && !order.isMarket) remaining.push(order);
    this.open = remaining;
    for (const m of matches) {
      this.history.push({ ...m, ts: Date.now(), resId: order.resId });
    }
    return matches;
  }
  snapshot() { return this.open.slice(); }
  recentHistory(n = 50) { return this.history.slice(-n); }
}
