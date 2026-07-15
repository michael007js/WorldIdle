/**
 * market/prices.js — 价格演化 + 历史曲线数据
 * 模型：基础价 + 供需曲线（库存边际递减）+ 随机波动（Perlin-like）+ 长期漂移
 */
export class PriceModel {
  constructor(registry) {
    this.registry = registry;
    this.current = new Map();
    this.history = new Map();
    this.noisePhase = new Map();
    for (const r of registry.all()) {
      this.current.set(r.id, r.basePrice);
      this.history.set(r.id, new Float32Array(720).fill(r.basePrice));
      this.noisePhase.set(r.id, Math.random() * 1000);
    }
  }
  get(id) { return this.current.get(id) || 0; }
  /** 计算供需影响后的目标价 */
  target(id, qty) {
    const r = this.registry.get(id);
    if (!r) return 0;
    const base = r.basePrice;
    // 库存越多价格越低（边际递减）
    const invFactor = Math.max(0.3, 1 / (1 + Math.sqrt(qty) * 0.05));
    return base * invFactor;
  }
  evolve(id, qty, dt, volMult = 1) {
    const r = this.registry.get(id);
    if (!r) return;
    const base = r.basePrice;
    const invFactor = Math.max(0.3, 1 / (1 + Math.sqrt(Math.max(0, qty)) * 0.05));
    const target = base * invFactor;
    // 噪声
    const phase = this.noisePhase.get(id) + dt * 0.5;
    this.noisePhase.set(id, phase);
    const noise = (Math.sin(phase * 1.3) + Math.sin(phase * 2.7) * 0.5) * 0.5;
    const cur = this.current.get(id);
    const drift = (target - cur) * 0.05;
    const next = cur + drift + noise * base * 0.02 * volMult;
    const clamped = Math.max(base * 0.1, Math.min(base * 5, next));
    this.current.set(id, clamped);
    // 历史
    const h = this.history.get(id);
    h.copyWithin(0, 1);
    h[h.length - 1] = clamped;
  }
  applyImpact(id, qty, side) {
    const r = this.registry.get(id);
    if (!r) return;
    const cur = this.current.get(id);
    const impact = Math.min(0.5, Math.sqrt(qty) * 0.01);
    const newP = side === 'buy' ? cur * (1 + impact) : cur * (1 - impact);
    this.current.set(id, Math.max(r.basePrice * 0.1, Math.min(r.basePrice * 5, newP)));
  }
  historySlice(id, n) {
    const h = this.history.get(id);
    if (!h) return [];
    return Array.from(h.slice(h.length - n));
  }
}
