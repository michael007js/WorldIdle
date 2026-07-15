/**
 * engine/loop.js — 主线程渲染循环（rAF + fixed timestep 调度）
 * 主线程只跑渲染 + 输入 + UI；模拟逻辑在 worker 里跑。
 * 主线程按 STATE_DELTA 事件按需更新 UI/Canvas。
 */
import { TICK_MS, TARGET_FPS } from '../config.js';

export class MainLoop {
  constructor() {
    this.running = false;
    this.lastTime = 0;
    this.acc = 0;
    this.frame = 0;
    this.fps = 0;
    this.fpsAcc = 0;
    this.fpsLast = 0;
    this.renderCb = null;
    this.onTick = null;
    this.rAFid = 0;
  }
  setRender(cb) { this.renderCb = cb; }
  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.fpsLast = this.lastTime;
    this._loop();
  }
  stop() {
    this.running = false;
    if (this.rAFid) cancelAnimationFrame(this.rAFid);
  }
  _loop() {
    if (!this.running) return;
    const now = performance.now();
    let dt = now - this.lastTime;
    this.lastTime = now;
    if (dt > 250) dt = 250; // 防止后台 tab 卡死时一次性步进太多
    this.acc += dt;
    // 主线程渲染，模拟 tick 由 worker 内部推进
    this.frame++;
    this.fpsAcc++;
    if (now - this.fpsLast >= 1000) {
      this.fps = this.fpsAcc;
      this.fpsAcc = 0;
      this.fpsLast = now;
    }
    if (this.renderCb) this.renderCb(dt);
    this.rAFid = requestAnimationFrame(this._loop.bind(this));
  }
}
