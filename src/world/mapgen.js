/**
 * world/mapgen.js — 程序化地图生成（seeded RNG + biome + resource spots）
 * mulberry32 PRNG，同 seed 必可复现
 */
import { createGrid } from './grid.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function generateMap(mapDef) {
  const rng = mulberry32(mapDef.seed);
  const grid = createGrid(mapDef.grid, mapDef.cellSize);
  const w = mapDef.width, h = mapDef.height;
  const cells = new Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const r = rng();
      let biome = 'plain';
      let cum = 0;
      for (const b of mapDef.biomes) {
        cum += b.density;
        if (r < cum) { biome = b.type; break; }
      }
      cells[y * w + x] = { x, y, biome, resource: null, blocked: biome === 'water' || biome === 'mountain' };
    }
  }
  // 放置资源点
  const spots = [];
  for (const rs of mapDef.resourceSpots) {
    for (let i = 0; i < rs.count; i++) {
      let tries = 0;
      while (tries++ < 50) {
        const cx = Math.floor(rng() * w);
        const cy = Math.floor(rng() * h);
        const cell = cells[cy * w + cx];
        if (!cell.blocked && !cell.resource) {
          cell.resource = rs.id;
          spots.push({ x: cx, y: cy, resource: rs.id });
          break;
        }
      }
    }
  }
  // 计算可建造区
  const buildable = new Uint8Array(w * h);
  for (let i = 0; i < cells.length; i++) {
    buildable[i] = cells[i].blocked ? 0 : 1;
  }
  return {
    grid, w, h, cells, buildable, spots,
    colorOf(biome) {
      for (const b of mapDef.biomes) if (b.type === biome) return b.color;
      return '#2a3a26';
    }
  };
}
