/**
 * economy/charts.js — 图表渲染（独立 Canvas，按需重绘，不进主渲染循环）
 * 使用 Canvas2D 绘制折线图，避免污染 PixiJS 主舞台。
 */
export class ChartRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dirty = true;
    this.data = [];
    this.color = '#4a9eff';
    this.bg = '#14181c';
    this.label = '';
  }
  setData(arr, color, label) {
    this.data = arr || [];
    if (color) this.color = color;
    if (label) this.label = label;
    this.dirty = true;
  }
  markDirty() { this.dirty = true; }
  render() {
    if (!this.dirty) return;
    this.dirty = false;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.fillStyle = this.bg;
    ctx.fillRect(0, 0, w, h);
    if (this.data.length < 2) return;
    let min = Infinity, max = -Infinity;
    for (const v of this.data) { if (v < min) min = v; if (v > max) max = v; }
    if (min === max) { min -= 1; max += 1; }
    const pad = 8;
    const iw = w - pad * 2;
    const ih = h - pad * 2;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < this.data.length; i++) {
      const x = pad + (i / (this.data.length - 1)) * iw;
      const y = pad + ih - ((this.data[i] - min) / (max - min)) * ih;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // 网格
    ctx.strokeStyle = '#2a3038';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad + (i / 4) * ih;
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
    }
    // 标签
    ctx.fillStyle = '#aab2b8';
    ctx.font = '10px Consolas, monospace';
    ctx.fillText(this.label, pad + 2, 12);
    ctx.fillText(max.toFixed(2), w - 50, 12);
    ctx.fillText(min.toFixed(2), w - 50, h - 4);
  }
}
