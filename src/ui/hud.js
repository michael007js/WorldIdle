/**
 * ui/hud.js — 顶部 HUD
 */
import { SPEED_LEVELS } from '../config.js';
import { t } from '../engine/i18n.js';

export class HUD {
  constructor(game) {
    this.game = game;
    this.el = document.getElementById('hud');
    this.speedIndex = 1;
  }
  render() {
    if (!this.el) return;
    const s = this.game.state;
    this.el.innerHTML = `
      <div class="hud-cell cash"><span class="label">${t('hud.cash')}</span><span class="value" id="hud-cash">${formatNum(s.cash)}</span></div>
      <div class="hud-cell"><span class="label">${t('hud.valuation')}</span><span class="value" id="hud-val">${formatNum(s.valuation)}</span></div>
      <div class="hud-cell"><span class="label">${t('hud.map')}</span><span class="value" id="hud-map">${s.mapName || '-'}</span></div>
      <div class="hud-cell"><span class="label">$wiss</span><span class="value" id="hud-swiss">${formatNum(s.swiss)}</span></div>
      <div class="hud-spacer"></div>
      <div class="hud-cell"><span class="label">${t('hud.fps')}</span><span class="value" id="hud-fps">${this.game.loop.fps}</span></div>
      <div class="hud-cell"><span class="label">${t('hud.autosave')}</span><span class="value" id="hud-save">--</span></div>
      <div class="hud-speed-group" id="speed-group"></div>
    `;
    const sg = this.el.querySelector('#speed-group');
    SPEED_LEVELS.forEach((sp, i) => {
      const b = document.createElement('button');
      b.className = 'speed-btn' + (i === this.speedIndex ? ' active' : '');
      b.textContent = sp === 0 ? '||' : sp + 'x';
      b.onclick = () => this.setSpeed(i);
      sg.appendChild(b);
    });
  }
  setSpeed(i) {
    this.speedIndex = i;
    this.game.setSpeed(SPEED_LEVELS[i]);
    const btns = this.el.querySelectorAll('.speed-btn');
    btns.forEach((b, idx) => b.classList.toggle('active', idx === i));
  }
  update() {
    const s = this.game.state;
    const c = document.getElementById('hud-cash');
    if (c) c.textContent = formatNum(s.cash);
    const v = document.getElementById('hud-val');
    if (v) v.textContent = formatNum(s.valuation);
    const sw = document.getElementById('hud-swiss');
    if (sw) sw.textContent = formatNum(s.swiss);
    const f = document.getElementById('hud-fps');
    if (f) f.textContent = String(this.game.loop.fps);
  }
}

export function formatNum(n) {
  if (n == null || isNaN(n)) return '0';
  const neg = n < 0;
  let a = Math.abs(n);
  if (a >= 1e15) return (neg ? '-' : '') + a.toExponential(2);
  if (a >= 1e12) return (neg ? '-' : '') + (a / 1e12).toFixed(2) + 'T';
  if (a >= 1e9) return (neg ? '-' : '') + (a / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return (neg ? '-' : '') + (a / 1e6).toFixed(2) + 'M';
  if (a >= 1e3) return (neg ? '-' : '') + (a / 1e3).toFixed(2) + 'K';
  if (a < 1 && a > 0) return a.toFixed(2);
  return (neg ? '-' : '') + Math.floor(a).toString();
}
