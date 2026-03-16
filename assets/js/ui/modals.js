/**
 * Modal dialog system
 */
import { t } from '../core/i18n.js';

export function showModal(title, bodyHtml, buttons = []) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" data-action="close">&times;</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-footer">
        ${buttons.map(b =>
          `<button class="btn-modern ${b.class || ''}" data-action="${b.action}">${b.label}</button>`
        ).join('')}
      </div>
    </div>`;

  return new Promise(resolve => {
    overlay.addEventListener('click', e => {
      const action = e.target.dataset?.action;
      if (action === 'close' || e.target === overlay) {
        overlay.remove();
        resolve(null);
      } else if (action) {
        overlay.remove();
        resolve({ action, modal: overlay });
      }
    });
    document.body.appendChild(overlay);
  });
}

export function showConfirm(message) {
  return showModal('', `<p>${message}</p>`, [
    { label: t('modal.cancel'), action: 'cancel', class: '' },
    { label: t('modal.confirm'), action: 'confirm', class: 'primary' },
  ]).then(result => result?.action === 'confirm');
}

export function getModalFormData(overlay) {
  const data = {};
  overlay.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.name) data[el.name] = el.value;
  });
  return data;
}
