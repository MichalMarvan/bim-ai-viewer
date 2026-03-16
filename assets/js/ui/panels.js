/**
 * Side panel & AI sidebar slide-in/out
 */
import { state } from '../core/state.js';

let sidePanel, aiSidebar, expandTree, expandAI, backdrop;

export function initPanels() {
  sidePanel = document.getElementById('sidePanel');
  aiSidebar = document.getElementById('aiSidebar');
  expandTree = document.getElementById('expandTree');
  expandAI = document.getElementById('expandAI');
  backdrop = document.getElementById('panelBackdrop');

  expandTree?.addEventListener('click', toggleSidePanel);
  expandAI?.addEventListener('click', toggleAISidebar);
  backdrop?.addEventListener('click', closeAllPanels);

  // Mobile toggle buttons
  document.getElementById('mobileToggleTree')?.addEventListener('click', () => {
    if (!state.sidePanelOpen) toggleSidePanel();
    updateBackdrop();
  });
  document.getElementById('mobileToggleAI')?.addEventListener('click', () => {
    if (!state.aiSidebarOpen) toggleAISidebar();
    updateBackdrop();
  });

  // Close buttons
  document.querySelectorAll('.panel-close').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.closest('#sidePanel')) toggleSidePanel();
      else if (btn.closest('#aiSidebar')) toggleAISidebar();
    });
  });
}

export function toggleSidePanel() {
  state.sidePanelOpen = !state.sidePanelOpen;
  sidePanel?.classList.toggle('collapsed', !state.sidePanelOpen);
  expandTree?.classList.toggle('visible', !state.sidePanelOpen);
  updateBackdrop();
}

export function openSidePanel() {
  if (!state.sidePanelOpen) toggleSidePanel();
}

export function toggleAISidebar() {
  state.aiSidebarOpen = !state.aiSidebarOpen;
  aiSidebar?.classList.toggle('collapsed', !state.aiSidebarOpen);
  expandAI?.classList.toggle('visible', !state.aiSidebarOpen);
  updateBackdrop();
}

export function openAISidebar() {
  if (!state.aiSidebarOpen) toggleAISidebar();
}

function updateBackdrop() {
  if (window.innerWidth <= 768) {
    const anyOpen = state.sidePanelOpen || state.aiSidebarOpen;
    backdrop?.classList.toggle('show', anyOpen);
  }
}

function closeAllPanels() {
  if (state.sidePanelOpen) toggleSidePanel();
  if (state.aiSidebarOpen) toggleAISidebar();
}
