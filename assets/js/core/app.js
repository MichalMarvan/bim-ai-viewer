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

  // IFC file loading (works without 3D viewer)
  initIfcLoader();

  // 3D Viewer (async — loads from CDN, may take time)
  const viewer = await initViewer();
  if (viewer) {
    initSelection();
    initViewerTools();
  }

  // Theme change updates viewer background
  const themeBtn = document.getElementById('themeToggle');
  themeBtn?.addEventListener('click', () => {
    setTimeout(updateViewerBackground, 50);
  });

  console.log('BIM AI Viewer initialized');
}

// Export for HTML onclick handlers
Object.assign(window, { t, showToast, showError, showSuccess });

init().catch(err => {
  console.error('Init failed:', err);
});
