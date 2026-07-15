/**
 * world/camera.js — 视图缩放/平移/边界
 */
import { ZOOM_MIN, ZOOM_MAX } from '../config.js';

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.scale = 1;
    this.bounds = null; // { minX, minY, maxX, maxY }
  }
  setBounds(b) { this.bounds = b; }
  pan(dx, dy) {
    this.x += dx / this.scale;
    this.y += dy / this.scale;
    this._clamp();
  }
  zoom(factor, pivotX, pivotY) {
    const old = this.scale;
    let s = old * factor;
    if (s < ZOOM_MIN) s = ZOOM_MIN;
    if (s > ZOOM_MAX) s = ZOOM_MAX;
    if (pivotX != null && pivotY != null) {
      // 围绕鼠标点缩放
      this.x = pivotX - (pivotX - this.x) * (s / old);
      this.y = pivotY - (pivotY - this.y) * (s / old);
    }
    this.scale = s;
    this._clamp();
  }
  setScale(s, px, py) {
    this.zoom(s / this.scale, px, py);
  }
  worldToScreen(wx, wy) {
    return { x: wx * this.scale + this.x, y: wy * this.scale + this.y };
  }
  screenToWorld(sx, sy) {
    return { x: (sx - this.x) / this.scale, y: (sy - this.y) / this.scale };
  }
  _clamp() {
    if (!this.bounds) return;
    const { minX, minY, maxX, maxY } = this.bounds;
    if (this.x < minX) this.x = minX;
    if (this.y < minY) this.y = minY;
    if (this.x > maxX) this.x = maxX;
    if (this.y > maxY) this.y = maxY;
  }
  centerOn(wx, wy, screenW, screenH) {
    this.x = screenW / 2 - wx * this.scale;
    this.y = screenH / 2 - wy * this.scale;
    this._clamp();
  }
}
