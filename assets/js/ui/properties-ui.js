/**
 * Properties panel — shows attributes of selected entity
 */
import { state } from '../core/state.js';
import { escapeHtml } from '../core/utils.js';
import { t } from '../core/i18n.js';

export function initPropertiesUI() {
  // Listen for entity selection
  window.addEventListener('entity-selected', (e) => {
    const { expressId } = e.detail;
    if (expressId) {
      showEntityProperties(expressId);
    } else {
      clearProperties();
    }
  });
}

export function showEntityProperties(expressId) {
  const section = document.getElementById('propsSection');
  const header = document.getElementById('propsHeader');
  const body = document.getElementById('propsBody');
  if (!section || !body) return;

  section.style.display = '';

  // Find entity type from index
  const idx = state.modelIndex;
  let entityType = 'Unknown';
  if (idx) {
    for (const [type, data] of Object.entries(idx.entityTypes)) {
      if (data.ids.includes(expressId)) {
        entityType = type;
        break;
      }
    }
  }

  // Update header
  if (header) {
    const headerText = header.querySelector('span');
    if (headerText) headerText.textContent = `${entityType} #${expressId}`;
  }

  // Basic properties (will be expanded with actual IFC property reading)
  const props = [
    { key: 'ExpressID', value: expressId, status: 'ok' },
    { key: 'Type', value: entityType, status: '' },
  ];

  body.innerHTML = props.map(p => `
    <div class="prop-row">
      <span class="prop-key">${escapeHtml(p.key)}</span>
      <span class="prop-val ${p.status}">${escapeHtml(String(p.value))}</span>
    </div>
  `).join('');

  // Update info bar
  const infoSelected = document.getElementById('infoSelected');
  const infoSelectedSep = document.getElementById('infoSelectedSep');
  if (infoSelected) {
    infoSelected.textContent = `${t('model.selected')}: ${entityType} #${expressId}`;
  }
  if (infoSelectedSep) infoSelectedSep.style.display = '';
}

export function showFullProperties(properties) {
  const body = document.getElementById('propsBody');
  if (!body || !properties) return;

  const rows = [];
  for (const [key, value] of Object.entries(properties)) {
    if (value === null || value === undefined) {
      rows.push({ key, value: t('props.missing'), status: 'missing' });
    } else if (typeof value === 'object') {
      rows.push({ key, value: JSON.stringify(value), status: '' });
    } else {
      rows.push({ key, value: String(value), status: '' });
    }
  }

  body.innerHTML = rows.map(p => `
    <div class="prop-row">
      <span class="prop-key">${escapeHtml(p.key)}</span>
      <span class="prop-val ${p.status}">${escapeHtml(p.value)}</span>
    </div>
  `).join('');
}

export function clearProperties() {
  const section = document.getElementById('propsSection');
  const body = document.getElementById('propsBody');
  if (section) section.style.display = 'none';
  if (body) body.innerHTML = `<div style="color:var(--text-tertiary);font-size:11px;">${t('props.empty')}</div>`;

  const infoSelected = document.getElementById('infoSelected');
  const infoSelectedSep = document.getElementById('infoSelectedSep');
  if (infoSelected) infoSelected.textContent = '';
  if (infoSelectedSep) infoSelectedSep.style.display = 'none';
}
