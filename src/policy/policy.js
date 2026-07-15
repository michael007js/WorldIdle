/**
 * policy/policy.js — 政策效果应用辅助函数
 */
import { PolicyTree } from './tree.js';

export { PolicyTree };

export function getEffectiveEffects(state) {
  return state.policyTree.effects;
}
