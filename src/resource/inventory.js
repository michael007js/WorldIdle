/**
 * resource/inventory.js — 全局库存池 + 物流分配策略
 * 简化模型：所有资源进入统一池，工厂按需从池取。
 * 不支持传送带，符合原版简化物流思路。
 */
export class Inventory {
  constructor(initial = {}) {
    this.qty = new Map();
    for (const k in initial) this.qty.set(k, Number(initial[k]) || 0);
  }
  get(id) { return this.qty.get(id) || 0; }
  add(id, amount) {
    if (amount <= 0) return;
    this.qty.set(id, (this.qty.get(id) || 0) + amount);
  }
  remove(id, amount) {
    const cur = this.qty.get(id) || 0;
    const next = cur - amount;
    if (next <= 0) this.qty.set(id, 0);
    else this.qty.set(id, next);
  }
  canAfford(id, amount) { return (this.qty.get(id) || 0) >= amount; }
  reset(newMap) {
    this.qty.clear();
    for (const k in newMap) this.qty.set(k, Number(newMap[k]) || 0);
  }
  toJSON() {
    const o = {};
    for (const [k, v] of this.qty) o[k] = v;
    return o;
  }
  totalValue(priceFn) {
    let s = 0;
    for (const [id, q] of this.qty) s += q * priceFn(id);
    return s;
  }
}
