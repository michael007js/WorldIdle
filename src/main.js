/**
 * main.js — 入口，初始化游戏 + bootstrap worker
 * 引导流程：
 *   1) 显示 boot screen
 *   2) 加载 PixiJS (CDN) — index.html 已包含
 *   3) 实例化 Game，加载数据
 *   4) 显示主菜单
 */
import { Game } from './game.js';
import { setLocale, getLocale } from './engine/i18n.js';
import { getSetting } from './engine/save.js';
import { VERSION } from './config.js';

async function boot() {
  const bar = document.getElementById('boot-bar');
  const status = document.getElementById('boot-status');
  function setProgress(p, msg) {
    if (bar) bar.style.width = (p * 100).toFixed(0) + '%';
    if (status && msg) status.textContent = msg;
  }

  try {
    setProgress(0.1, '初始化 i18n…');
    const lang = await getSetting('locale', (navigator.language || 'zh').startsWith('zh') ? 'zh' : 'en');
    setLocale(lang);

    setProgress(0.3, '加载游戏数据…');
    const game = new Game();
    window.game = game; // 调试

    setProgress(0.6, '启动 Worker…');
    await game.init();

    setProgress(1.0, '完成');
    setTimeout(() => {
      const boot = document.getElementById('boot-screen');
      if (boot) boot.style.display = 'none';
    }, 300);
  } catch (err) {
    console.error(err);
    const status = document.getElementById('boot-status');
    if (status) status.textContent = '启动失败: ' + (err && err.message || err);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  boot();
});

export { VERSION };
