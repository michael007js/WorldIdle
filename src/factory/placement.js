/**
 * factory/placement.js — 放置/拆除/碰撞/框选批量操作
 * 主线程负责 ghost preview 渲染，通过事件向 worker 发送 place 请求。
 */
import { MSG } from '../engine/worker_protocol.js';

export class PlacementController {
  constructor(game) {
    this.game = game;
    this.selectedDefId = null;
    this.ghostPos = null; // {x,y}
    this.previewValid = false;
    this.selectedFactoryId = null;
  }
  selectFactory(defId) { this.selectedDefId = defId; }
  clearSelection() { this.selectedDefId = null; this.selectedFactoryId = null; }
  setGhost(x, y) {
    this.ghostPos = { x, y };
    if (!this.selectedDefId || !this.game.map) return;
    const def = this.game.factoryRegistry.get(this.selectedDefId);
    if (!def) return;
    this.previewValid = this.game.map.isBuildable(x, y, def.size[0], def.size[1]);
  }
  tryPlace() {
    if (!this.selectedDefId || !this.ghostPos) return false;
    const def = this.game.factoryRegistry.get(this.selectedDefId);
    if (!def) return false;
    if (!this.game.map.isBuildable(this.ghostPos.x, this.ghostPos.y, def.size[0], def.size[1])) {
      return false;
    }
    // 本地立即占用（worker 复核失败时再释放）
    this.game.map.occupy(this.ghostPos.x, this.ghostPos.y, def.size[0], def.size[1], -1);
    this.game.worker.postMessage({
      t: MSG.PLACE_FACTORY, defId: this.selectedDefId,
      x: this.ghostPos.x, y: this.ghostPos.y,
    });
    return true;
  }
  demolish(factoryId, x, y, w, h) {
    this.game.map.release(x, y, w, h);
    this.game.worker.postMessage({ t: MSG.DEMOLISH, factoryId });
  }
  upgrade(factoryId) {
    this.game.worker.postMessage({ t: MSG.UPGRADE, factoryId });
  }
  setSpeedMul(factoryId, mul) {
    this.game.worker.postMessage({ t: MSG.SET_FACTORY_OPT, factoryId, speedMul: mul });
  }
  setEnabled(factoryId, enabled) {
    this.game.worker.postMessage({ t: MSG.SET_FACTORY_OPT, factoryId, enabled });
  }
}
