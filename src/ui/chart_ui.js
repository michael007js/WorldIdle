/**
 * ui/chart_ui.js — 图表界面
 */
import { t } from '../engine/i18n.js';
import { ChartRenderer } from '../economy/charts.js';

export class ChartUI {
  constructor(game) { this.game = game; }
  render(parent) {
    parent.innerHTML = `
      <div class="panel-header">
        <span class="panel-title">${t('panel.charts')}</span>
        <select id="ch-res" class="btn sm"></select>
      </div>
      <div class="panel-body" style="padding:8px">
        <canvas id="ch-canvas" class="chart-canvas" width="260" height="180"></canvas>
      </div>
    `;
    this.canvas = parent.querySelector('#ch-canvas');
    this.renderer = new ChartRenderer(this.canvas);
    const sel = parent.querySelector('#ch-res');
    const refresh = () => {
      const ids = this.game.state.resIds || [];
      sel.innerHTML = ids.map((id) => {
        const r = this.game.resourceRegistry.get(id);
        return `<option value="${id}">${r ? r.name : id}</option>`;
      }).join('');
    };
    refresh();
    sel.onchange = () => this._update();
    this._interval = setInterval(() => {
      this._update();
    }, 1000);
  }
  _update() {
    if (!this.renderer) return;
    const sel = document.getElementById('ch-res');
    if (!sel) return;
    const id = sel.value;
    const arr = this.game.state.priceHistory ? this.game.state.priceHistory[id] : null;
    if (!arr) return;
    const r = this.game.resourceRegistry.get(id);
    this.renderer.setData(arr.slice(-120), '#4a9eff', r ? r.name : id);
    this.renderer.render();
  }
  detach() { if (this._interval) clearInterval(this._interval); }
}
