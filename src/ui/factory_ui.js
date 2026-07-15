/**
 * ui/factory_ui.js — 选中工厂详情面板
 */
import { t } from '../engine/i18n.js';
import { formatNum } from './hud.js';
import { MSG } from '../engine/worker_protocol.js';
import { audio } from '../engine/audio.js';
import { showModal } from './toast.js';

export class FactoryUI {
  constructor(game) { this.game = game; }
  render(parent, factoryId) {
    const s = this.game.state;
    const f = (s.factories || []).find((x) => x.id === factoryId);
    if (!f) {
      parent.innerHTML = `<div class="text-mute text-small" style="padding:12px">${t('factory.selected')}: -</div>`;
      return;
    }
    const def = this.game.factoryRegistry.get(f.defId);
    if (!def) return;
    const upCost = Math.floor(def.cost * Math.pow(def.upgradeCostMult || 2, f.level));
    parent.innerHTML = `
      <div class="panel-header">
        <span class="panel-title">${def.name}</span>
        <span class="text-mute text-small">Lv.${f.level}</span>
      </div>
      <div class="factory-detail">
        <div class="fd-row"><span class="lbl">${t('factory.position')}</span><span class="val">(${f.x}, ${f.y})</span></div>
        <div class="fd-row"><span class="lbl">${t('factory.input')}</span><span class="val">${(def.inputs||[]).map(i => i.id+' '+i.rate).join(', ') || '-'}</span></div>
        <div class="fd-row"><span class="lbl">${t('factory.output')}</span><span class="val">${(def.outputs||[]).map(o => o.id+' '+o.rate).join(', ')}</span></div>
        <div class="fd-row"><span class="lbl">${t('factory.speed')}</span><span class="val">${(f.speedMul * 100).toFixed(0)}%</span></div>
        <div class="fd-row"><span class="lbl">累计产出</span><span class="val">${formatNum(f.accOut || 0)}</span></div>
        <input type="range" min="0" max="200" value="${Math.round(f.speedMul * 100)}" class="fd-slider" id="fu-slider"/>
        <div class="fd-actions">
          <button class="btn primary sm" id="fu-up">${t('factory.upgrade')} (${formatNum(upCost)})</button>
          <button class="btn danger sm" id="fu-dem">${t('factory.demolish')}</button>
          <button class="btn sm" id="fu-toggle">${f.enabled ? t('factory.disable') : t('factory.enable')}</button>
        </div>
      </div>
    `;
    parent.querySelector('#fu-slider').oninput = (e) => {
      const v = parseInt(e.target.value, 10) / 100;
      this.game.worker.postMessage({ t: MSG.SET_FACTORY_OPT, factoryId, speedMul: v });
    };
    parent.querySelector('#fu-up').onclick = () => {
      this.game.worker.postMessage({ t: MSG.UPGRADE, factoryId });
      audio.upgrade();
    };
    parent.querySelector('#fu-dem').onclick = () => {
      showModal({
        title: t('factory.demolish'),
        body: `<p>确认拆除 ${def.name}?返还约 ${formatNum(def.cost * 0.5)} 现金。</p>`,
        footer: makeFooter(() => {
          const map = this.game.map;
          if (map) map.release(f.x, f.y, def.size[0], def.size[1]);
          this.game.worker.postMessage({ t: MSG.DEMOLISH, factoryId });
          this.game.placement.selectedFactoryId = null;
          this.game.factoryPanel.clear();
        }),
      });
    };
    parent.querySelector('#fu-toggle').onclick = () => {
      this.game.worker.postMessage({ t: MSG.SET_FACTORY_OPT, factoryId, enabled: !f.enabled });
      audio.click();
    };
  }
  clear(parent) {
    parent.innerHTML = '';
  }
}

function makeFooter(onConfirm) {
  const ok = document.createElement('button');
  ok.className = 'btn primary';
  ok.textContent = t('common.confirm');
  ok.onclick = onConfirm;
  const cancel = document.createElement('button');
  cancel.className = 'btn';
  cancel.textContent = t('common.cancel');
  return [cancel, ok];
}

import { t as _t } from '../engine/i18n.js';
