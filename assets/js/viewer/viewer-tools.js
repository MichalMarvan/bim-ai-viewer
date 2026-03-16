/**
 * Viewer toolbar — mode switching, zoom, fit-all
 */
import { getWorld, isViewerReady } from './viewer-init.js';

export function initViewerTools() {
  // Toolbar mode switching
  document.querySelectorAll('.vt-item[data-tool]').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.vt-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const mode = item.dataset.tool;
      const infoMode = document.getElementById('infoMode');
      if (infoMode) {
        const labels = { select: 'Výběr', orbit: 'Orbita', measure: 'Měření', clip: 'Řez' };
        infoMode.textContent = labels[mode] || mode;
      }
    });
  });

  // Zoom controls
  document.getElementById('btnZoomIn')?.addEventListener('click', () => zoom(-2));
  document.getElementById('btnZoomOut')?.addEventListener('click', () => zoom(2));
  document.getElementById('btnFitAll')?.addEventListener('click', fitAll);
  document.getElementById('btnOrtho')?.addEventListener('click', toggleOrtho);
}

function zoom(amount) {
  if (!isViewerReady()) return;
  const world = getWorld();
  if (world?.camera?.controls?.dolly) {
    world.camera.controls.dolly(amount, true);
  }
}

async function fitAll() {
  if (!isViewerReady()) return;
  const world = getWorld();
  const THREE = window.__THREE;
  if (!world?.scene?.three || !THREE) return;

  const box = new THREE.Box3();
  world.scene.three.traverse(child => {
    if (child.isMesh) box.expandByObject(child);
  });

  if (!box.isEmpty()) {
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    if (world.camera?.controls?.fitToSphere) {
      world.camera.controls.fitToSphere(sphere, true);
    }
  }
}

function toggleOrtho() {
  if (!isViewerReady()) return;
  const world = getWorld();
  const cam = world?.camera?.three;
  if (!cam) return;
  // Toggle between perspective and orthographic is complex with SimpleCamera
  // For now just reset the view
  fitAll();
}
