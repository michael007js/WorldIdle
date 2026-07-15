/**
 * engine/save.js — 存档读写（IndexedDB + 导入导出）
 * 支持多槽位 + 自动保存 + 版本化 migration 链
 */
import { IDB_NAME, IDB_VERSION, IDB_STORE_SAVES, IDB_STORE_SETTINGS, SAVE_VERSION } from '../config.js';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE_SAVES)) {
        const os = db.createObjectStore(IDB_STORE_SAVES, { keyPath: 'slot' });
        os.createIndex('updated', 'updated');
      }
      if (!db.objectStoreNames.contains(IDB_STORE_SETTINGS)) {
        db.createObjectStore(IDB_STORE_SETTINGS, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, store, mode) {
  return db.transaction(store, mode).objectStore(store);
}

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** 迁移旧存档 */
export function migrate(save) {
  if (!save.version || save.version < SAVE_VERSION) {
    // 预留：未来版本新增字段时在此补全
    save.version = SAVE_VERSION;
  }
  return save;
}

export async function saveSlot(slot, data) {
  try {
    const db = await openDB();
    const obj = { slot, data, updated: Date.now(), version: SAVE_VERSION };
    await promisify(tx(db, IDB_STORE_SAVES, 'readwrite').put(obj));
    return true;
  } catch (e) {
    console.error('saveSlot failed', e);
    throw e;
  }
}

export async function loadSlot(slot) {
  const db = await openDB();
  const obj = await promisify(tx(db, IDB_STORE_SAVES, 'readonly').get(slot));
  if (!obj) return null;
  return migrate(obj.data);
}

export async function listSlots() {
  const db = await openDB();
  const all = await promisify(tx(db, IDB_STORE_SAVES, 'readonly').getAll());
  return all.sort((a, b) => b.updated - a.updated);
}

export async function deleteSlot(slot) {
  const db = await openDB();
  await promisify(tx(db, IDB_STORE_SAVES, 'readwrite').delete(slot));
}

export async function getSetting(key, fallback) {
  try {
    const db = await openDB();
    const obj = await promisify(tx(db, IDB_STORE_SETTINGS, 'readonly').get(key));
    return obj ? obj.value : fallback;
  } catch {
    return fallback;
  }
}

export async function setSetting(key, value) {
  try {
    const db = await openDB();
    await promisify(tx(db, IDB_STORE_SETTINGS, 'readwrite').put({ key, value }));
  } catch (e) {
    // fallback LocalStorage
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
}

/** 导出为 JSON 字符串 */
export function exportSave(data) {
  return JSON.stringify({ version: SAVE_VERSION, exported: Date.now(), data });
}

/** 导入并校验 */
export function importSave(jsonStr) {
  try {
    const obj = JSON.parse(jsonStr);
    if (!obj || !obj.data) throw new Error('Invalid save format');
    return migrate(obj.data);
  } catch (e) {
    throw new Error('Import failed: ' + e.message);
  }
}
