/**
 * factory/factory.js — 工厂实例逻辑（输入/输出/速度/升级/微调）
 */
export class FactoryInstance {
  constructor(defId, x, y, opts = {}) {
    this.id = opts.id || (Date.now() + Math.floor(Math.random() * 1000));
    this.defId = defId;
    this.x = x;
    this.y = y;
    this.level = opts.level || 1;
    this.speedMul = opts.speedMul != null ? opts.speedMul : 1.0;
    this.enabled = opts.enabled != null ? opts.enabled : true;
    this.priority = opts.priority || 0;
    this.accIn = 0;
    this.accOut = 0;
  }
  toJSON() {
    return {
      id: this.id, defId: this.defId, x: this.x, y: this.y,
      level: this.level, speedMul: this.speedMul, enabled: this.enabled,
      priority: this.priority,
    };
  }
}
