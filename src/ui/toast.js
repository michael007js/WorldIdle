/**
 * ui/toast.js — toast/飘字/弹窗
 */
import { t } from '../engine/i18n.js';

let toastContainer = null;
function ensureContainer() {
  if (!toastContainer) {
    toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      document.body.appendChild(toastContainer);
    }
  }
  return toastContainer;
}

export function toast(level, textOrKey, duration = 2500) {
  const el = document.createElement('div');
  el.className = 'toast ' + (level || 'ok');
  // 若是 i18n key 则翻译，否则直接显示文本
  let text = textOrKey;
  if (textOrKey && textOrKey.indexOf('.') >= 0) {
    const tr = t(textOrKey);
    if (tr && tr !== textOrKey) text = tr;
  }
  el.textContent = text;
  ensureContainer().appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 200ms';
    setTimeout(() => el.remove(), 220);
  }, duration);
}

/** 飘字：在屏幕坐标 (sx, sy) 显示 +X */
export function floatText(sx, sy, text, color = '#6fcf6f') {
  const el = document.createElement('div');
  el.className = 'float-text';
  el.style.left = sx + 'px';
  el.style.top = sy + 'px';
  el.style.color = color;
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

/** Modal 对话框 */
export function showModal({ title, body, footer, onClose }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  const head = document.createElement('div');
  head.className = 'modal-header';
  const titleEl = document.createElement('div');
  titleEl.className = 'modal-title';
  titleEl.textContent = title;
  const close = document.createElement('button');
  close.className = 'modal-close';
  close.textContent = '×';
  close.onclick = () => { overlay.remove(); onClose && onClose(); };
  head.appendChild(titleEl); head.appendChild(close);
  const bodyEl = document.createElement('div');
  bodyEl.className = 'modal-body';
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else if (body instanceof Node) bodyEl.appendChild(body);
  modal.appendChild(head); modal.appendChild(bodyEl);
  if (footer) {
    const ft = document.createElement('div');
    ft.className = 'modal-footer';
    if (Array.isArray(footer)) footer.forEach((b) => ft.appendChild(b));
    else ft.appendChild(footer);
    modal.appendChild(ft);
  }
  overlay.appendChild(modal);
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) { overlay.remove(); onClose && onClose(); }
  });
  document.body.appendChild(overlay);
  return { overlay, modal, close: () => overlay.remove() };
}
