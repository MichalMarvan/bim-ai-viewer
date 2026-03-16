/**
 * Icon sidebar navigation
 */
import { state } from '../core/state.js';

export function initNavigation() {
  document.querySelectorAll('.icon-sidebar .nav-icon[data-nav]').forEach(icon => {
    icon.addEventListener('click', () => {
      setActiveNav(icon.dataset.nav);
    });
  });
}

export function setActiveNav(panelId) {
  state.currentPanel = panelId;

  // Update active icon
  document.querySelectorAll('.icon-sidebar .nav-icon[data-nav]').forEach(i =>
    i.classList.toggle('active', i.dataset.nav === panelId)
  );

  // Show/hide panel views
  document.querySelectorAll('.panel-view').forEach(v => v.classList.add('hidden'));
  const view = document.getElementById(`panel-${panelId}`);
  if (view) view.classList.remove('hidden');

  // Update panel header
  const header = document.getElementById('panelTitle');
  const titles = {
    tree: 'nav.tree', properties: 'nav.properties', validation: 'nav.validation',
    search: 'nav.search', agents: 'nav.agents', standards: 'nav.standards', settings: 'nav.settings',
  };
  if (header && titles[panelId]) {
    import('../core/i18n.js').then(({ t }) => {
      header.textContent = t(titles[panelId]);
    });
  }

  // Open side panel if collapsed
  import('./panels.js').then(m => m.openSidePanel());
}
