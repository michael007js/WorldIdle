/**
 * engine/input.js — 键鼠/触摸输入（缩放/平移/快捷键/键位重绑）
 */
import { ZOOM_MIN, ZOOM_MAX, ZOOM_SENSITIVITY } from '../config.js';

export class InputState {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.camera = camera;
    this.mouse = { x: 0, y: 0, wx: 0, wy: 0 }; // 屏幕坐标 / 世界坐标
    this.dragging = false;
    this.last = { x: 0, y: 0 };
    this.keys = new Set();
    this.binds = {
      pause: 'Space',
      speed1: 'Digit1', speed2: 'Digit2', speed3: 'Digit3',
      speed4: 'Digit4', speed5: 'Digit5',
      demolish: 'KeyX', upgrade: 'KeyU',
      cancel: 'Escape',
    };
    this.callbacks = {};
    this._bind();
  }
  on(name, fn) { (this.callbacks[name] ||= []).push(fn); }
  _emit(name, arg) { (this.callbacks[name] || []).forEach((f) => f(arg)); }

  _bind() {
    const c = this.canvas;
    c.addEventListener('mousedown', this._onDown.bind(this));
    window.addEventListener('mousemove', this._onMove.bind(this));
    window.addEventListener('mouseup', this._onUp.bind(this));
    c.addEventListener('wheel', this._onWheel.bind(this), { passive: false });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('auxclick', (e) => e.preventDefault());
    window.addEventListener('keydown', this._onKey.bind(this));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  _onDown(e) {
    const r = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - r.left;
    this.mouse.y = e.clientY - r.top;
    if (e.button === 1) {
      // 中键 = 平移
      e.preventDefault();
      this.dragging = true;
      this.last.x = e.clientX; this.last.y = e.clientY;
    } else if (e.button === 0) {
      this._emit('click', { x: this.mouse.x, y: this.mouse.y, wx: this.mouse.wx, wy: this.mouse.wy });
    }
  }
  _onMove(e) {
    const r = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - r.left;
    this.mouse.y = e.clientY - r.top;
    const w = this.camera.screenToWorld(this.mouse.x, this.mouse.y);
    this.mouse.wx = w.x; this.mouse.wy = w.y;
    if (this.dragging) {
      const dx = e.clientX - this.last.x;
      const dy = e.clientY - this.last.y;
      this.last.x = e.clientX; this.last.y = e.clientY;
      this.camera.pan(dx, dy);
    }
  }
  _onUp() {
    if (this.dragging) { this.dragging = false; }
    else this._emit('clickUp', { x: this.mouse.x, y: this.mouse.y });
  }
  _onWheel(e) {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * ZOOM_SENSITIVITY);
    this.camera.zoom(factor, this.mouse.x, this.mouse.y);
    const z = this.camera.scale;
    if (z < ZOOM_MIN) this.camera.scale = ZOOM_MIN;
    if (z > ZOOM_MAX) this.camera.scale = ZOOM_MAX;
    this._emit('zoom', this.camera.scale);
  }
  _onKey(e) {
    this.keys.add(e.code);
    if (e.code === this.binds.pause) this._emit('pause');
    if (e.code === this.binds.cancel) this._emit('cancel');
    for (let i = 1; i <= 5; i++) {
      if (e.code === this.binds['speed' + i]) this._emit('speed', i);
    }
    if (e.code === this.binds.demolish) this._emit('demolish');
    if (e.code === this.binds.upgrade) this._emit('upgrade');
  }
  rebind(action, code) { this.binds[action] = code; }
}
