/**
 * ui/menu.js — 主菜单/暂停菜单/设置
 */
import { t } from '../engine/i18n.js';
import { listSlots, deleteSlot, loadSlot } from '../engine/save.js';
import { formatNum } from './hud.js';
import { showModal } from './toast.js';
import { audio } from '../engine/audio.js';
import { setLocale, getLocale, availableLocales } from '../engine/i18n.js';

export class MainMenu {
  constructor(game) {
    this.game = game;
    this.el = document.getElementById('main-menu') || this._create();
  }
  _create() {
    const el = document.createElement('div');
    el.id = 'main-menu';
    el.className = 'main-menu';
    document.body.appendChild(el);
    return el;
  }
  show() {
    this.el.classList.remove('hidden');
    this._renderMain();
  }
  hide() { this.el.classList.add('hidden'); }
  _renderMain() {
    this.el.innerHTML = `
      <div class="menu-inner">
        <h1>INDUSTRY IDLE</h1>
        <p class="menu-sub">WEB CLONE</p>
        <div class="menu-list">
          <button class="menu-btn" data-action="new">${t('menu.new_game')}<span class="mb-meta">从一张新地图开始</span></button>
          <button class="menu-btn" data-action="load">${t('menu.load_game')}<span class="mb-meta">读取已有存档</span></button>
          <button class="menu-btn" data-action="settings">${t('menu.settings')}</button>
          <button class="menu-btn" data-action="about">${t('menu.about')}</button>
        </div>
      </div>
    `;
    this.el.querySelectorAll('.menu-btn').forEach((b) => {
      b.onclick = () => {
        audio.click();
        const a = b.dataset.action;
        if (a === 'new') this._renderNew();
        else if (a === 'load') this._renderLoad();
        else if (a === 'settings') this._renderSettings();
        else if (a === 'about') this._renderAbout();
      };
    });
  }
  _renderNew() {
    const maps = this.game.mapsData.maps;
    this.el.innerHTML = `
      <div class="menu-inner">
        <h1>${t('menu.new_game')}</h1>
        <p class="menu-sub">选择地图</p>
        <div class="menu-list">
          ${maps.map((m) => `
            <button class="menu-btn" data-map="${m.id}">
              ${m.name}
              <span class="mb-meta">${m.grid === 'hex' ? '六边形' : '方格'} · ${m.width}x${m.height} · ${m.prestigeUnlock === 0 ? '初始' : '解锁需 prestige ' + m.prestigeUnlock}</span>
            </button>
          `).join('')}
          <button class="menu-btn" data-action="back">${t('menu.back')}</button>
        </div>
      </div>
    `;
    this.el.querySelectorAll('.menu-btn').forEach((b) => {
      b.onclick = () => {
        if (b.dataset.action === 'back') return this._renderMain();
        const id = b.dataset.map;
        audio.click();
        this.game.startNewGame(id, 1);
        this.hide();
      };
    });
  }
  async _renderLoad() {
    const slots = await listSlots();
    this.el.innerHTML = `
      <div class="menu-inner">
        <h1>${t('menu.load_game')}</h1>
        <p class="menu-sub">${slots.length} 个存档</p>
        <div class="menu-list" id="slot-list">
          ${slots.length === 0 ? '<div class="text-mute text-small">无存档</div>' :
            slots.map((s) => `
              <div class="save-slot" data-slot="${s.slot}">
                <div>
                  <div>${t('menu.slot')} ${s.slot}</div>
                  <div class="text-mute text-small">${new Date(s.updated).toLocaleString()} · 估值 ${formatNum(s.data?.peakValuation || 0)}</div>
                </div>
                <div class="row">
                  <button class="btn sm" data-load="${s.slot}">${t('menu.continue')}</button>
                  <button class="btn sm danger" data-del="${s.slot}">${t('menu.delete')}</button>
                </div>
              </div>
            `).join('')
          }
        </div>
        <button class="menu-btn" data-action="back" style="margin-top:12px">${t('menu.back')}</button>
      </div>
    `;
    this.el.querySelectorAll('.menu-btn').forEach((b) => {
      if (b.dataset.action === 'back') b.onclick = () => this._renderMain();
    });
    this.el.querySelectorAll('[data-load]').forEach((b) => {
      b.onclick = async () => {
        const slot = parseInt(b.dataset.load, 10);
        const data = await loadSlot(slot);
        if (data) {
          audio.click();
          this.game.loadGame(data, slot);
          this.hide();
        }
      };
    });
    this.el.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        const slot = parseInt(b.dataset.del, 10);
        await deleteSlot(slot);
        this._renderLoad();
      };
    });
  }
  _renderSettings() {
    const loc = getLocale();
    this.el.innerHTML = `
      <div class="menu-inner">
        <h1>${t('menu.settings')}</h1>
        <div class="menu-list">
          <div class="save-slot">
            <span>语言 / Language</span>
            <select id="set-locale" class="btn sm">
              ${availableLocales().map((l) => `<option value="${l}" ${l===loc?'selected':''}>${l === 'zh' ? '中文' : 'English'}</option>`).join('')}
            </select>
          </div>
          <div class="save-slot">
            <span>音效</span>
            <input type="checkbox" id="set-audio" ${audio.enabled ? 'checked' : ''}/>
          </div>
          <div class="save-slot">
            <span>音量</span>
            <input type="range" id="set-vol" min="0" max="100" value="${audio.volume*100}"/>
          </div>
        </div>
        <button class="menu-btn" data-action="back" style="margin-top:12px">${t('menu.back')}</button>
      </div>
    `;
    this.el.querySelector('#set-locale').onchange = (e) => {
      setLocale(e.target.value);
      this._renderSettings();
    };
    this.el.querySelector('#set-audio').onchange = (e) => {
      audio.setEnabled(e.target.checked);
    };
    this.el.querySelector('#set-vol').oninput = (e) => {
      audio.setVolume(parseInt(e.target.value, 10) / 100);
    };
    this.el.querySelector('[data-action="back"]').onclick = () => this._renderMain();
  }
  _renderAbout() {
    this.el.innerHTML = `
      <div class="menu-inner">
        <h1>${t('menu.about')}</h1>
        <p class="menu-sub">v0.1.0</p>
        <p style="font-size:11px;color:var(--fg-1)">纯 HTML + JS + PixiJS + Worker 复刻 Steam app/1574000 Industry Idle。</p>
        <p style="font-size:11px;color:var(--fg-2)">市场撮合由 AI 模拟对手盘替代原版真实多人。</p>
        <button class="menu-btn" data-action="back" style="margin-top:12px">${t('menu.back')}</button>
      </div>
    `;
    this.el.querySelector('[data-action="back"]').onclick = () => this._renderMain();
  }
}
