/**
 * ui/market_ui.js — 市场界面
 */
import { t } from '../engine/i18n.js';
import { formatNum } from './hud.js';
import { MSG } from '../engine/worker_protocol.js';
import { audio } from '../engine/audio.js';

export class MarketUI {
  constructor(game) { this.game = game; }
  render(parent) {
    parent.innerHTML = `
      <div class="panel-header">
        <span class="panel-title">${t('panel.market')}</span>
      </div>
      <div class="panel-body">
        <div style="padding:8px;border-bottom:1px solid var(--border-0)">
          <div class="row" style="margin-bottom:4px">
            <select id="mk-res" class="btn sm"></select>
            <select id="mk-side" class="btn sm">
              <option value="buy">${t('market_ui.buy')}</option>
              <option value="sell">${t('market_ui.sell')}</option>
            </select>
            <input id="mk-qty" type="number" value="10" style="width:50px" class="btn sm"/>
            <span class="text-mute text-small">@</span>
            <span id="mk-price" class="mono">0</span>
          </div>
          <div class="row">
            <button class="btn primary sm" id="mk-go">${t('market_ui.market_order')}</button>
          </div>
        </div>
        <div style="padding:6px 8px;border-bottom:1px solid var(--border-0)" class="text-small text-mute">${t('market_ui.history')}</div>
        <div id="mk-history"></div>
      </div>
    `;
    const sel = parent.querySelector('#mk-res');
    const refreshSel = () => {
      const ids = this.game.state.resIds || [];
      sel.innerHTML = ids.map((id) => {
        const r = this.game.resourceRegistry.get(id);
        return `<option value="${id}">${r ? r.name : id}</option>`;
      }).join('');
    };
    refreshSel();
    this._refreshHistory(parent);
    parent.querySelector('#mk-go').onclick = () => {
      const resId = sel.value;
      const side = parent.querySelector('#mk-side').value;
      const qty = parseInt(parent.querySelector('#mk-qty').value, 10);
      if (!qty || qty <= 0) return;
      this.game.worker.postMessage({
        t: MSG.PLACE_ORDER, side, resId, qty, price: 0, isMarket: true,
      });
      audio.click();
    };
    sel.addEventListener('change', () => this._updatePrice(parent));
    this._updatePrice(parent);
    this._refreshInterval = setInterval(() => {
      refreshSel();
      this._updatePrice(parent);
      this._refreshHistory(parent);
    }, 1000);
  }
  _updatePrice(parent) {
    const sel = parent.querySelector('#mk-res');
    const priceEl = parent.querySelector('#mk-price');
    if (!sel || !priceEl) return;
    const idx = this.game.state.resIds ? this.game.state.resIds.indexOf(sel.value) : -1;
    const prices = this.game.state.prices ? new Float32Array(this.game.state.prices) : null;
    if (idx >= 0 && prices) priceEl.textContent = formatNum(prices[idx]);
  }
  _refreshHistory(parent) {
    const el = parent.querySelector('#mk-history');
    if (!el) return;
    const h = (this.game.state.orderHistory || []).slice(-20).reverse();
    el.innerHTML = h.map((o) => {
      const r = this.game.resourceRegistry.get(o.resId);
      return `<div class="order-row">
        <span class="${o.side === 'buy' ? 'side-buy' : 'side-sell'}">${o.side === 'buy' ? 'BUY' : 'SELL'}</span>
        <span>${r ? r.name : o.resId}</span>
        <span>${o.qty}</span>
        <span>${formatNum(o.price)}</span>
      </div>`;
    }).join('') || '<div class="text-mute text-small" style="padding:8px">无</div>';
  }
  detach() { if (this._refreshInterval) clearInterval(this._refreshInterval); }
}
