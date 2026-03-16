/**
 * 3D Viewer initialization using @thatopen/components
 *
 * NOTE: This module uses dynamic imports to avoid blocking the app
 * if the 3D libraries fail to load from CDN.
 */
import { state } from '../core/state.js';

let components = null;
let world = null;
let fragments = null;
let ifcLoader = null;
let initialized = false;

// CDN URLs for import
// NOTE: @thatopen/components@3.3.2 requires three >= 0.175.0
const THREE_CDN = 'https://esm.sh/three@0.175.0';
const OBC_CDN = 'https://esm.sh/@thatopen/components@3.3.2';
const WASM_PATH = 'https://unpkg.com/web-ifc@0.0.74/';
const WORKER_URL = 'https://thatopen.github.io/engine_fragment/resources/worker.mjs';

export async function initViewer() {
  const container = document.getElementById('viewerContainer');
  if (!container) {
    console.warn('Viewer container not found');
    return null;
  }

  try {
    const [THREE, OBC] = await Promise.all([
      import(THREE_CDN),
      import(OBC_CDN),
    ]);

    components = new OBC.Components();
    const worlds = components.get(OBC.Worlds);

    world = worlds.create();
    world.scene = new OBC.SimpleScene(components);
    world.renderer = new OBC.SimpleRenderer(components, container);
    world.camera = new OBC.SimpleCamera(components);
    world.scene.setup();

    // Background color matching dark theme
    const bgColor = state.theme === 'dark' ? 0x0f172a : 0xf8fafc;
    world.scene.three.background = new THREE.Color(bgColor);

    components.init();

    // Setup IFC loader
    ifcLoader = components.get(OBC.IfcLoader);
    await ifcLoader.setup({
      autoSetWasm: false,
      wasm: { path: WASM_PATH, absolute: true },
    });

    // Setup fragments
    fragments = components.get(OBC.FragmentsManager);

    // Store THREE reference for other modules
    window.__THREE = THREE;
    window.__OBC = OBC;

    initialized = true;

    // Show viewer UI elements, hide background grid
    document.getElementById('viewerToolbar')?.style.removeProperty('display');
    document.getElementById('viewTools')?.style.removeProperty('display');
    document.getElementById('axesGizmo')?.style.removeProperty('display');
    const grid = document.querySelector('.viewer-grid');
    if (grid) grid.style.display = 'none';

    // Start FPS counter
    startFpsCounter();

    console.log('3D Viewer initialized');
    return { components, world, fragments, ifcLoader };

  } catch (err) {
    console.error('Failed to initialize 3D viewer:', err);
    const { showError } = await import('../ui/toast.js');
    showError('3D viewer failed to load: ' + err.message);
    return null;
  }
}

export function isViewerReady() { return initialized; }
export function getWorld() { return world; }
export function getComponents() { return components; }
export function getFragments() { return fragments; }
export function getIfcLoader() { return ifcLoader; }

export function updateViewerBackground() {
  if (!world?.scene?.three) return;
  const THREE = window.__THREE;
  if (!THREE) return;
  const color = state.theme === 'dark' ? 0x0f172a : 0xf8fafc;
  world.scene.three.background = new THREE.Color(color);
}

function startFpsCounter() {
  let frameCount = 0;
  let lastTime = performance.now();
  const fpsEl = document.getElementById('infoFps');

  function tick() {
    frameCount++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
      if (fpsEl) fpsEl.textContent = `FPS: ${frameCount}`;
      frameCount = 0;
      lastTime = now;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
