/**
 * Model tree UI — renders hierarchical tree in side panel
 */
import { buildTreeData, filterTree } from '../ifc/tree-builder.js';
import { highlightEntities, clearHighlights } from '../viewer/viewer-selection.js';
import { state } from '../core/state.js';
import { escapeHtml, debounce } from '../core/utils.js';
import { t } from '../core/i18n.js';

const IFC_TYPE_COLORS = {
  IfcWall: 'var(--warning)',
  IfcDoor: 'var(--success)',
  IfcWindow: 'var(--primary-light)',
  IfcColumn: 'var(--text-tertiary)',
  IfcSlab: 'var(--text-tertiary)',
  IfcBeam: 'var(--info)',
  IfcRoof: 'var(--text-tertiary)',
};

let treeData = [];

export function initTreeUI() {
  const searchInput = document.getElementById('treeSearch');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      renderTree(filterTree(treeData, searchInput.value));
    }, 200));
  }

  // Listen for model load
  window.addEventListener('ifc-loaded', () => {
    refreshTree();
  });
}

export function refreshTree() {
  treeData = buildTreeData();
  renderTree(treeData);
}

function renderTree(data) {
  const container = document.getElementById('modelTree');
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = `<div style="padding:16px;text-align:center;color:var(--text-tertiary);font-size:12px;">${t('tree.empty')}</div>`;
    return;
  }

  container.innerHTML = data.map(node => renderNode(node, 0)).join('');
  attachTreeEvents(container);
}

function renderNode(node, depth) {
  const indent = depth === 0 ? '' : depth === 1 ? 'i1' : depth === 2 ? 'i2' : 'i3';
  const hasChildren = node.children.length > 0;
  const arrow = hasChildren ? (node.expanded ? '▼' : '▶') : '';
  const color = IFC_TYPE_COLORS[node.ifcType || node.name] || 'var(--text-tertiary)';
  const countBadge = node.count > 0 ? `<span class="count">${node.count}</span>` : '';

  let icon = '';
  if (node.type === 'model') {
    icon = `<svg class="icon icon-sm" viewBox="0 0 24 24" style="color:var(--primary-light)"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
  } else if (node.type === 'entityType') {
    icon = `<svg class="icon icon-sm" viewBox="0 0 24 24" style="color:${color}"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
  } else if (node.type === 'entity') {
    icon = `<svg class="icon icon-sm" viewBox="0 0 24 24" style="color:${color}"><circle cx="12" cy="12" r="4"/></svg>`;
  }

  const selected = node.expressId && node.expressId === state.selectedEntityId ? ' selected' : '';

  let html = `<div class="tree-item ${indent}${selected}" data-id="${escapeHtml(node.id)}" data-express-id="${node.expressId || ''}" data-ifc-type="${escapeHtml(node.ifcType || '')}">`;
  html += `<span class="arrow">${arrow}</span>`;
  html += `<span class="t-icon">${icon}</span>`;
  html += escapeHtml(node.name);
  html += countBadge;
  html += `</div>`;

  if (hasChildren) {
    html += `<div class="tree-children ${node.expanded ? 'expanded' : ''}" data-parent="${escapeHtml(node.id)}">`;
    html += node.children.map(child => renderNode(child, depth + 1)).join('');
    html += `</div>`;
  }

  return html;
}

function attachTreeEvents(container) {
  container.querySelectorAll('.tree-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // Toggle expand/collapse
      const arrow = item.querySelector('.arrow');
      const id = item.dataset.id;
      const children = container.querySelector(`.tree-children[data-parent="${id}"]`);

      if (arrow?.textContent && children) {
        const isExpanded = children.classList.contains('expanded');
        children.classList.toggle('expanded');
        arrow.textContent = isExpanded ? '▶' : '▼';
      }

      // Select item
      container.querySelectorAll('.tree-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');

      // Highlight entity in 3D
      const expressId = parseInt(item.dataset.expressId);
      if (expressId) {
        clearHighlights();
        highlightEntities([expressId], 0x667eea);
        state.selectedEntityId = expressId;
        window.dispatchEvent(new CustomEvent('entity-selected', { detail: { expressId } }));
      }

      // Highlight all entities of type
      const ifcType = item.dataset.ifcType;
      if (!expressId && ifcType && state.modelIndex?.entityTypes[ifcType]) {
        const ids = state.modelIndex.entityTypes[ifcType].ids.slice(0, 50);
        clearHighlights();
        highlightEntities(ids, 0x667eea);
      }
    });
  });
}
