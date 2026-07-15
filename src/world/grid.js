/**
 * world/grid.js — 网格数据结构（hex axial + square，统一接口）
 *
 * square: 直接 (x,y) -> (x*cell, y*cell)
 * hex: axial coordinates (q,r) -> pixel: x = size * 3/2 * q, y = size * (sqrt(3) * (r + q/2))
 *      pointy-top 而非 flat-top（Industry Idle 默认 hex 朝向参考）
 */

export class SquareGrid {
  constructor(cellSize = 32) { this.cellSize = cellSize; this.kind = 'square'; }
  toPixel(x, y) { return { x: x * this.cellSize, y: y * this.cellSize }; }
  fromPixel(px, py) {
    return { x: Math.floor(px / this.cellSize), y: Math.floor(py / this.cellSize) };
  }
  neighbors(x, y) {
    return [
      { x: x + 1, y }, { x: x - 1, y },
      { x, y: y + 1 }, { x, y: y - 1 },
    ];
  }
  cellWidth() { return this.cellSize; }
  cellHeight() { return this.cellSize; }
}

export class HexGrid {
  constructor(size = 36) { this.size = size; this.kind = 'hex'; }
  // axial (q,r) -> pixel (pointy-top)
  toPixel(q, r) {
    const s = this.size;
    const x = s * Math.sqrt(3) * (q + r / 2);
    const y = s * 3 / 2 * r;
    return { x, y };
  }
  fromPixel(px, py) {
    const s = this.size;
    const q = (Math.sqrt(3) / 3 * px - 1 / 3 * py) / s;
    const r = (2 / 3 * py) / s;
    return hexRound(q, r);
  }
  neighbors(q, r) {
    const dirs = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
    return dirs.map(([dq,dr]) => ({ x: q + dq, y: r + dr }));
  }
  cellWidth() { return this.size * Math.sqrt(3); }
  cellHeight() { return this.size * 1.5; }
}

function hexRound(q, r) {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { x: rq, y: rr };
}

export function createGrid(kind, cellSize) {
  if (kind === 'hex') return new HexGrid(cellSize || 36);
  return new SquareGrid(cellSize || 32);
}
