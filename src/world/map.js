/**
 * world/map.js — 地图实例、切换、解锁
 */
import { generateMap } from './mapgen.js';
import { Camera } from './camera.js';
import { createGrid } from './grid.js';

export class GameMap {
  constructor(mapDef) {
    this.def = mapDef;
    this.gen = generateMap(mapDef);
    this.grid = this.gen.grid;
    this.camera = new Camera();
    this.placed = new Map(); // key "x,y" -> factory instance
    this.startCash = mapDef.startCash;
    this.startResources = { ...mapDef.startResources };
  }
  isBuildable(x, y, w = 1, h = 1) {
    const G = this.gen;
    if (this.grid.kind === 'hex') {
      // hex 单格默认；多格按 1×1 处理
      if (x < 0 || y < 0 || x >= G.w || y >= G.h) return false;
      return G.buildable[y * G.w + x] === 1 && !this.placed.has(x + ',' + y);
    }
    if (x < 0 || y < 0 || x + w > G.w || y + h > G.h) return false;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const k = (x + dx) + ',' + (y + dy);
        if (this.placed.has(k)) return false;
        if (G.buildable[(y + dy) * G.w + (x + dx)] !== 1) return false;
      }
    }
    return true;
  }
  occupy(x, y, w, h, instanceId) {
    if (this.grid.kind === 'hex') {
      this.placed.set(x + ',' + y, instanceId);
      return;
    }
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.placed.set((x + dx) + ',' + (y + dy), instanceId);
      }
    }
  }
  release(x, y, w, h) {
    if (this.grid.kind === 'hex') {
      this.placed.delete(x + ',' + y);
      return;
    }
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.placed.delete((x + dx) + ',' + (y + dy));
      }
    }
  }
  factoryAt(x, y) {
    return this.placed.get(x + ',' + y);
  }
  pixelToCell(px, py) {
    const c = this.grid.fromPixel(px, py);
    return c;
  }
  cellToPixel(x, y) {
    return this.grid.toPixel(x, y);
  }
}
