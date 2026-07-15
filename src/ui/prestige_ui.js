/**
 * ui/prestige_ui.js — Prestige 界面
 */
import { t } from '../engine/i18n.js';
import { formatNum } from './hud.js';
import { PRESTIGE_THRESHOLD } from '../config.js';
import { MSG } from '../engine/worker_protocol.js';
import { audio } from '../engine/audio.js';
import { showModal } from './toast.js';
import { Prestige } from '../prestige/prestige.js';

export class PrestigeUI {
  constructor(game) { this.game = game; }
  render(parent) {
    const s = this.game.state;
    const p = new Prestige({ state: s, policyTree: this.game.policyTree });
    const canPrestige = s.peakValuation >= PRESTIGE_THRESHOLD;
    const gain = canPrestige ? p.potentialGain() : 0;
    parent.innerHTML = `
      <div class="panel-header">
        <span class="panel-title">${t('prestige.title')}</span>
      </div>
      <div class="panel-body" style="padding:12px">
        <div class="fd-row"><span class="lbl">${t('prestige.current_valuation')}</span><span class="val">${formatNum(s.valuation)}</span></div>
        <div class="fd-row"><span class="lbl">${t('prestige.threshold')}</span><span class="val">${formatNum(PRESTIGE_THRESHOLD)}</span></div>
        <div class="fd-row"><span class="lbl">${t('prestige.swiss_balance')}</span><span class="val">${formatNum(s.swiss)}</span></div>
        <div class="fd-row"><span class="lbl">${t('prestige.gain')}</span><span class="val text-ok">+${formatNum(gain)}</span></div>
        <button class="btn primary" id="ps-go" ${canPrestige ? '' : 'disabled'} style="margin-top:8px;width:100%">${t('prestige.confirm')}</button>
      </div>
    `;
    parent.querySelector('#ps-go').onclick = () => {
      if (!canPrestige) return;
      showModal({
        title: t('prestige.confirm'),
        body: `<p>将重置当前地图进度，获得 ${formatNum(gain)} $wiss。政策保留，工厂/库存/现金清零。</p>`,
        footer: (() => {
          const ok = document.createElement('button');
          ok.className = 'btn primary';
          ok.textContent = t('common.confirm');
          ok.onclick = () => {
            this.game.worker.postMessage({ t: MSG.RUN_PRESTIGE });
            audio.upgrade();
            ok.closest('.modal-overlay').remove();
          };
          const cancel = document.createElement('button');
          cancel.className = 'btn';
          cancel.textContent = t('common.cancel');
          return [cancel, ok];
        })(),
      });
    };
  }
}
