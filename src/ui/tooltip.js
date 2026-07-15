/**
 * ui/tooltip.js — 鼠标悬浮提示
 * 在主视图 canvas 上移动时，显示当前格子的信息：
 *   - 地形（平地/山/水）
 *   - 资源点（资源名 + 基础价 + 库存）
 *   - 工厂（名称 + 等级 + 输入/输出 + 速度 + 累计产出）
 */
import { formatNum } from './hud.js';

export class Tooltip {
  constructor(game) {
    this.game = game;
    this.el = null;
    this.lastCell = null; // {x, y}
    this._raf = 0;
    this._create();
  }
  _create() {
    const el = document.createElement('div');
    el.id = 'cell-tooltip';
    el.style.cssText = `
      position: fixed;
      pointer-events: none;
      background: rgba(31, 36, 40, 0.96);
      border: 1px solid #4a5258;
      border-left: 3px solid #4a9eff;
      color: #d7dde3;
      font-family: var(--font-sans);
      font-size: 11px;
      line-height: 1.5;
      padding: 6px 10px;
      min-width: 140px;
      max-width: 280px;
      z-index: 150;
      display: none;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      white-space: nowrap;
    `;
    document.body.appendChild(el);
    this.el = el;
  }
  /** 由 game 在 mousemove 时调用，传入客户端坐标（fixed 定位用） */
  update(clientX, clientY) {
    if (!this.game.map || !this.game.input) { this.hide(); return; }
    // 转成 canvas 内部坐标用于世界转换
    const canvas = document.getElementById('game-canvas');
    if (!canvas) { this.hide(); return; }
    const r = canvas.getBoundingClientRect();
    const sx = clientX - r.left;
    const sy = clientY - r.top;
    if (sx < 0 || sy < 0 || sx > r.width || sy > r.height) {
      this.hide();
      return;
    }
    const w = this.game.camera.screenToWorld(sx, sy);
    const c = this.game.map.pixelToCell(w.x, w.y);
    const G = this.game.map.gen;
    if (c.x < 0 || c.y < 0 || c.x >= G.w || c.y >= G.h) {
      this.hide();
      return;
    }
    // 同一格不重复刷新（减少 DOM 抖动）
    if (this.lastCell && this.lastCell.x === c.x && this.lastCell.y === c.y) {
      // 仍要更新位置（鼠标在格子内移动）
      this._position(sx, sy);
      return;
    }
    this.lastCell = { x: c.x, y: c.y };
    const cell = G.cells[c.y * G.w + c.x];
    const fid = this.game.map.factoryAt(c.x, c.y);
    let html = '';
    if (fid) {
      // 工厂
      const f = this.game.state.factories.find((x) => x.id === fid);
      if (f) {
        const def = this.game.factoryRegistry.get(f.defId);
        if (def) {
          const inputs = (def.inputs || []).map(i => `${resLabel(this.game, i.id)} ${i.rate}/s`).join(', ') || '无';
          const outputs = (def.outputs || []).map(o => `${resLabel(this.game, o.id)} ${o.rate}/s`).join(', ');
          html = `<div style="color:#4a9eff;font-weight:600;margin-bottom:2px">${def.name}</div>
            <div style="color:#6b747a">坐标 (${c.x}, ${c.y}) · Lv.${f.level} · ${f.enabled ? '运行中' : '已停用'}</div>
            <div style="color:#aab2b8;margin-top:3px"><span style="color:#6b747a">输入:</span> ${inputs}</div>
            <div style="color:#aab2b8"><span style="color:#6b747a">输出:</span> ${outputs}</div>
            <div style="color:#aab2b8"><span style="color:#6b747a">速度:</span> ${(f.speedMul * 100).toFixed(0)}% · 累计 ${formatNum(f.accOut || 0)}</div>`;
        }
      }
    } else if (cell.resource) {
      const r = this.game.resourceRegistry.get(cell.resource);
      const qty = this.game.state.qtys ? new Float32Array(this.game.state.qtys)[this.game.state.resIds.indexOf(cell.resource)] : 0;
      const price = this.game.state.prices ? new Float32Array(this.game.state.prices)[this.game.state.resIds.indexOf(cell.resource)] : (r ? r.basePrice : 0);
      html = `<div style="color:#f0c04a;font-weight:600;margin-bottom:2px">资源点: ${r ? r.name : cell.resource}</div>
        <div style="color:#6b747a">坐标 (${c.x}, ${c.y}) · ${biomeLabel(cell.biome)}</div>
        <div style="color:#aab2b8;margin-top:3px">基础价 ${formatNum(r ? r.basePrice : 0)} · 市价 ${formatNum(price)}</div>
        <div style="color:#aab2b8">库存 ${formatNum(qty || 0)}</div>`;
    } else {
      html = `<div style="color:#aab2b8">${biomeLabel(cell.biome)}</div>
        <div style="color:#6b747a">坐标 (${c.x}, ${c.y})</div>
        ${cell.blocked ? '<div style="color:#e0584a">不可建造</div>' : '<div style="color:#6fcf6f">可建造</div>'}`;
    }
    this.el.innerHTML = html;
    this.el.style.display = 'block';
    this._position(sx, sy);
  }
  _position(sx, sy) {
    // 偏移到鼠标右下，靠近边界时翻到左侧/上方
    const tw = this.el.offsetWidth;
    const th = this.el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = sx + 14;
    let y = sy + 14;
    if (x + tw > vw - 4) x = sx - tw - 14;
    if (y + th > vh - 4) y = sy - th - 14;
    this.el.style.left = x + 'px';
    this.el.style.top = y + 'px';
  }
  hide() {
    if (this.el) this.el.style.display = 'none';
    this.lastCell = null;
  }
}

function biomeLabel(biome) {
  switch (biome) {
    case 'plain': return '平地';
    case 'forest': return '森林';
    case 'water': return '水域';
    case 'mountain': return '山地';
    default: return biome;
  }
}

function resLabel(game, id) {
  const r = game.resourceRegistry.get(id);
  return r ? r.name : id;
}
