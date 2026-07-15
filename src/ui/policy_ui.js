/**
 * ui/policy_ui.js — 政策树界面
 */
import { t } from '../engine/i18n.js';
import { MSG } from '../engine/worker_protocol.js';
import { audio } from '../engine/audio.js';

export class PolicyUI {
  constructor(game) { this.game = game; }
  render(parent) {
    parent.innerHTML = `
      <div class="panel-header">
        <span class="panel-title">${t('panel.policy')} · $wiss: ${formatNum(this.game.state.swiss)}</span>
      </div>
      <div class="panel-body" id="po-list"></div>
    `;
    this._refresh(parent);
  }
  _refresh(parent) {
    const list = parent.querySelector('#po-list');
    if (!list) return;
    const unlocked = new Set(this.game.state.policyUnlocked || []);
    const swiss = this.game.state.swiss || 0;
    const all = this.game.policyTree.all();
    list.innerHTML = all.map((p) => {
      const status = unlocked.has(p.id) ? 'unlocked' :
        (swiss >= p.cost && (!p.requires || p.requires.every(r => unlocked.has(r))) ? 'available' : 'locked');
      return `<div class="policy-node ${status}" data-id="${p.id}">
        <div class="pn-name">${p.name}</div>
        <div class="pn-desc">${p.desc}</div>
        <div class="pn-cost">${p.cost} $wiss</div>
      </div>`;
    }).join('');
    list.querySelectorAll('.policy-node').forEach((node) => {
      node.onclick = () => {
        const id = node.dataset.id;
        if (!node.classList.contains('available')) return;
        this.game.worker.postMessage({ t: MSG.APPLY_POLICY, policyId: id });
        audio.upgrade();
      };
    });
  }
}

import { formatNum } from './hud.js';
