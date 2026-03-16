/**
 * BIM AI Viewer — Application Bootstrap
 */
import { state } from './state.js';
import { t, setLanguage, updatePageTranslations } from './i18n.js';
import { initTheme } from '../ui/theme.js';
import { initNavigation } from '../ui/navigation.js';
import { initPanels } from '../ui/panels.js';
import { showToast, showError, showSuccess } from '../ui/toast.js';
import { initViewer, updateViewerBackground } from '../viewer/viewer-init.js';
import { initIfcLoader } from '../ifc/ifc-loader.js';
import { initSelection } from '../viewer/viewer-selection.js';
import { initViewerTools } from '../viewer/viewer-tools.js';
import { buildModelIndex } from '../ifc/ifc-index.js';
import { initTreeUI, refreshTree } from '../ui/tree-ui.js';
import { initPropertiesUI } from '../ui/properties-ui.js';
import { initChatUI, populateAgentSelect, updateAgentStatus } from '../ui/chat-ui.js';
import { initInlineSettings, renderEndpoints, renderAgentsList } from '../ui/settings-ui.js';
import { loadAgents, loadEndpoints } from '../ai/agent-manager.js';

async function init() {
  // Theme
  initTheme();

  // i18n
  updatePageTranslations();

  // Language switcher
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setLanguage(btn.dataset.lang);
    });
  });

  // Navigation & panels
  initNavigation();
  initPanels();

  // Auto-resize chat textarea
  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 80) + 'px';
    });
  }

  // Load stored data from IndexedDB
  await loadEndpoints();
  await loadAgents();

  // IFC file loading
  initIfcLoader();

  // Tree & properties UI
  initTreeUI();
  initPropertiesUI();

  // Chat UI
  initChatUI();
  populateAgentSelect();
  updateAgentStatus();

  // Settings UI
  initInlineSettings();
  renderEndpoints();
  renderAgentsList();

  // When IFC loaded → build index → refresh tree
  window.addEventListener('ifc-loaded', async (e) => {
    const index = await buildModelIndex(e.detail.modelId);
    if (index) refreshTree();
  });

  // 3D Viewer (async — loads from CDN, may take time on RPi)
  showToast('Načítání 3D vieweru...', 'info', 5000);
  const viewer = await initViewer();
  if (viewer) {
    await initSelection();
    initViewerTools();
    showSuccess('3D viewer připraven');
  }

  // Theme change updates viewer background
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    setTimeout(updateViewerBackground, 50);
  });

  console.log('BIM AI Viewer initialized');
}

// Export for HTML onclick handlers
Object.assign(window, { t, showToast, showError, showSuccess });

init().catch(err => {
  console.error('Init failed:', err);
  showError('Initialization failed: ' + err.message);
});
