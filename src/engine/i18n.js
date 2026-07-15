/**
 * engine/i18n.js — 本地化框架（首版中/英）
 * 思路对照原版 translations.js：键路径 + fallback
 */
import zh from '../data/i18n/zh.json' with { type: 'json' };
import en from '../data/i18n/en.json' with { type: 'json' };

const LOCALES = { zh, en };
let current = 'zh';

export function setLocale(loc) {
  if (LOCALES[loc]) current = loc;
}
export function getLocale() { return current; }

function dig(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/** 翻译：t('menu.new_game') -> "新游戏" */
export function t(path, vars) {
  let s = dig(LOCALES[current], path);
  if (s == null) s = dig(LOCALES.en, path);
  if (s == null) return path;
  if (vars) {
    for (const k in vars) s = s.replace('{' + k + '}', String(vars[k]));
  }
  return s;
}

export function availableLocales() { return Object.keys(LOCALES); }
