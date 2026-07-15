/**
 * ui/theme.js — 灰色科技风 token + 主题切换
 * 颜色定义见 styles.css :root
 */
export const Theme = {
  current: 'dark',
  palettes: {
    dark: {
      bg0: '#14181c', bg1: '#1f2428', bg2: '#262c31',
      accent: '#4a9eff', ok: '#6fcf6f', warn: '#f0c04a', err: '#e0584a',
      fg0: '#d7dde3', fg1: '#aab2b8', fg2: '#6b747a',
      grid: '#2a3038', gridAlt: '#252b30',
    },
  },
  get(key) {
    const p = this.palettes[this.current];
    return p[key];
  },
  set(name) {
    if (!this.palettes[name]) return;
    this.current = name;
    document.documentElement.dataset.theme = name;
  },
};
