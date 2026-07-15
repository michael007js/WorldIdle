/**
 * ui/stock_panel.js — 右侧资源库存面板
 */
import { t } from '../engine/i18n.js';
import { formatNum } from './hud.js';
import { MSG } from '../engine/worker_protocol.js';
import { audio } from '../engine/audio.js';

export class StockPanel {
  constructor(game) {
    this.game = game;
    this.chartResId = null;
  }
  render(parent) {
    parent.innerHTML = `
      <div class="panel-header">
        <span class="panel-title">${t('panel.resources')}</span>
      </div>
      <div class="panel-body" id="sp-list"></div>
    `;
    parent.querySelector('#sp-list').addEventListener('click', (e) => {
      const row = e.target.closest('.res-row');
      if (!row) return;
      const id = row.dataset.id;
      const btn = e.target.closest('button');
      if (btn) {
        const side = btn.dataset.side;
        const qty = parseInt(prompt(`${side} ${id} 数量:`, '10'), 10);
        if (!qty || qty <= 0) return;
        this.game.worker.postMessage({
          t: MSG.PLACE_ORDER, side, resId: id, qty, price: this.game.state.prices[id] || 0, isMarket: true,
        });
        audio.click();
      }
    });
  }
  refresh() {
    const list = document.getElementById('sp-list');
    if (!list) return;
    const s = this.game.state;
    const ids = s.resIds || [];
    const prices = s.prices ? new Float32Array(s.prices) : new Float32Array(0);
    const qtys = s.qtys ? new Float32Array(s.qtys) : new Float32Array(0);
    list.innerHTML = ids.map((id, i) => {
      const r = this.game.resourceRegistry.get(id);
      if (!r) return '';
      const p = prices[i] || 0;
      const q = qtys[i] || 0;
      return `
        <div class="res-row" data-id="${id}">
          <span class="res-icon">${iconPlaceholder(r.icon)}</span>
          <span class="res-name">${r.name}</span>
          <span class="res-price">${formatNum(p)}</span>
          <span class="res-qty">${formatNum(q)}</span>
        </div>
      `;
    }).join('');
  }
}

function iconPlaceholder(name) {
  // 用首字母作占位，正式由 assets/icons/*.svg 替代
  const c = (name || '?').slice(0, 2).toUpperCase();
  return `<span style="display:inline-block;width:16px;height:16px;background:#262c31;color:#aab2b8;font-size:8px;text-align:center;line-height:16px;">${c}</span>`;
}
