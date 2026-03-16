/**
 * Toast notification system
 */
import { escapeHtml } from '../core/utils.js';

export function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.style.pointerEvents = 'auto';
  toast.innerHTML = `<span>${escapeHtml(message)}</span><button class="toast-close">&times;</button>`;
  toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
  container.appendChild(toast);
  setTimeout(() => { if (toast.parentElement) toast.remove(); }, duration);
}

export function showError(msg) { showToast(msg, 'error', 5000); }
export function showSuccess(msg) { showToast(msg, 'success'); }
export function showWarning(msg) { showToast(msg, 'warning', 4000); }
