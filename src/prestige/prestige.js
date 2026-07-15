/**
 * prestige/prestige.js — 重生流程
 * $wiss = f(峰值估值) / 1e6 * prestigeGainMult
 */
import { PRESTIGE_THRESHOLD } from '../config.js';

export class Prestige {
  constructor(state) { this.state = state; }
  canPrestige() {
    return this.state.peakValuation >= PRESTIGE_THRESHOLD;
  }
  /** 当前可获得的 $wiss */
  potentialGain() {
    const mult = this.state.policyTree?.effects?.prestigeGainMult || 1;
    return Math.floor((this.state.peakValuation / PRESTIGE_THRESHOLD) * 10 * mult);
  }
  /** 执行 prestige：返回 { gain } */
  run() {
    const gain = this.potentialGain();
    return { gain };
  }
}
