/**
 * IFC file loading — drag & drop + file picker
 */
import { isViewerReady, getComponents, getFragments, getIfcLoader } from '../viewer/viewer-init.js';
import { state } from '../core/state.js';
import { t } from '../core/i18n.js';
import { showToast, showError, showSuccess } from '../ui/toast.js';
import { formatFileSize } from '../core/utils.js';

export function initIfcLoader() {
  const viewerArea = document.querySelector('.viewer-area');
  const dragOverlay = document.getElementById('dragOverlay');
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('ifcFileInput');
  const loadBtn = document.getElementById('btnLoadIfc');

  // File input button
  loadBtn?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) await loadIfcFile(file);
    fileInput.value = '';
  });

  // Drop zone click
  dropZone?.addEventListener('click', () => fileInput?.click());

  // Drag & drop on viewer area
  let dragCounter = 0;
  viewerArea?.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    dragOverlay?.classList.add('visible');
  });
  viewerArea?.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      dragOverlay?.classList.remove('visible');
    }
  });
  viewerArea?.addEventListener('dragover', (e) => e.preventDefault());
  viewerArea?.addEventListener('drop', async (e) => {
    e.preventDefault();
    dragCounter = 0;
    dragOverlay?.classList.remove('visible');

    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.ifc')) {
      showError(t('error.ifcOnly'));
      return;
    }
    await loadIfcFile(file);
  });
}

export async function loadIfcFile(file) {
  if (!isViewerReady()) {
    showError('3D viewer not ready');
    return;
  }

  showToast(`${t('model.loading')} ${file.name}...`, 'info');

  try {
    const data = await file.arrayBuffer();
    const buffer = new Uint8Array(data);

    const OBC = window.__OBC;
    const ifcLoader = getComponents().get(OBC.IfcLoader);
    const modelId = file.name.replace(/\.ifc$/i, '');

    const model = await ifcLoader.load(buffer, false, modelId);

    // Add model to scene
    const world = (await import('../viewer/viewer-init.js')).getWorld();
    if (model && world?.scene?.three) {
      world.scene.three.add(model);
    }

    state.currentModelId = modelId;

    // Hide drop zone, show viewer UI
    document.getElementById('dropZone')?.classList.add('hidden');

    // Update navbar
    const navFile = document.getElementById('navbarFileInfo');
    const navName = document.getElementById('navbarFileName');
    if (navFile) navFile.classList.add('visible');
    if (navName) navName.textContent = `${file.name} — ${formatFileSize(file.size)}`;

    // Update info bar
    const infoStatus = document.getElementById('infoStatus');
    if (infoStatus) infoStatus.textContent = t('model.loaded');

    showSuccess(`${file.name} ${t('model.loaded').toLowerCase()}`);

    // Dispatch event for other modules
    window.dispatchEvent(new CustomEvent('ifc-loaded', { detail: { modelId, file } }));

  } catch (err) {
    console.error('IFC load error:', err);
    showError(`${t('error.loadFailed')}: ${err.message}`);
  }
}
