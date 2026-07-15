/**
 * economy/valuation.js — 公司估值
 * 估值 = 工厂总价值(含升级) + 库存估值(按当前市价) + 现金 - 负债
 */
import { VALUATION_FACTORY_WEIGHT, VALUATION_INVENTORY_WEIGHT } from '../config.js';

export class Valuation {
  constructor(state) {
    this.state = state;
  }
  compute() {
    let v = 0;
    // 工厂
    const fw = (this.state.policyTree?.effects?.valuationFactoryWeight || 1) * VALUATION_FACTORY_WEIGHT;
    for (const f of this.state.placed.values()) {
      const def = this.state.factoryRegistry.get(f.defId);
      if (!def) continue;
      v += def.cost * fw * (1 + 0.3 * (f.level - 1));
    }
    // 库存
    const invVal = this.state.inventoryPool.totalValue((id) => this.state.market.getPrice(id));
    v += invVal * VALUATION_INVENTORY_WEIGHT;
    // 现金
    v += this.state.cash;
    return v;
  }
}
