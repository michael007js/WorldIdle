/**
 * ui/build_panel.js — 左侧工厂建造列表
 */
import { t } from '../engine/i18n.js';
import { formatNum } from './hud.js';
import { audio } from '../engine/audio.js';

export class BuildPanel {
  constructor(game) {
    this.game = game;
    this.el = document.getElementById('panel-left');
    this.search = '';
    this.selectedDefId = null;
    this._build();
  }
  _build() {
    this.el.innerHTML = `
      <div class="panel-header">
        <span class="panel-title">${t('panel.build')}</span>
        <input class="panel-search" placeholder="${t('panel.search')}" id="bp-search"/>
      </div>
      <div class="panel-body" id="bp-list"></div>
    `;
    this.el.querySelector('#bp-search').addEventListener('input', (e) => {
      this.search = e.target.value.toLowerCase();
      this.refresh();
    });
    this.el.addEventListener('click', (e) => {
      const item = e.target.closest('.factory-item');
      if (!item) return;
      const defId = item.dataset.defId;
      this.selectedDefId = defId;
      this.game.placement.selectFactory(defId);
      audio.click();
      this.refresh();
    });
  }
  refresh() {
    const list = this.el.querySelector('#bp-list');
    if (!list) return;
    const factories = this.game.factoryRegistry.all();
    const map = this.game.map;
    const mapDef = map ? map.def : null;
    let allowed = factories;
    if (mapDef && mapDef.unlockedFactories) {
      const set = new Set(mapDef.unlockedFactories);
      allowed = factories.filter((f) => set.has(f.id));
    }
    const filtered = allowed.filter((f) => {
      if (!this.search) return true;
      return (f.name + f.nameEn + f.id).toLowerCase().includes(this.search);
    });
    list.innerHTML = filtered.map((f) => {
      const io = [...(f.inputs||[]).map(i=>i.id), '→', ...(f.outputs||[]).map(o=>o.id)].join(' ');
      return `
        <div class="factory-item ${f.id === this.selectedDefId ? 'selected' : ''}" data-def-id="${f.id}">
          <div class="fi-name"><span>${f.name}</span><span class="fi-cost">${formatNum(f.cost)}</span></div>
          <div class="fi-io">${io}</div>
          <div class="fi-cat">${f.category} · ${f.size.join('x')}</div>
        </div>
      `;
    }).join('');
  }
}
