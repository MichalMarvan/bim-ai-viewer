/**
 * Object selection & highlighting
 *
 * Uses @thatopen/components Raycasters for selection.
 * Highlighting approach will be refined once we validate the exact API at runtime.
 */
import { getComponents, getWorld, getFragments, isViewerReady } from './viewer-init.js';
import { state } from '../core/state.js';
import { t } from '../core/i18n.js';

const selectionListeners = [];
let highlightedObjects = new Set();

export function onEntitySelected(callback) {
  selectionListeners.push(callback);
}

export async function initSelection() {
  if (!isViewerReady()) return;

  const container = document.getElementById('viewerContainer');
  if (!container) return;

  const OBC = window.__OBC;
  const THREE = window.__THREE;
  if (!OBC || !THREE) return;

  const components = getComponents();

  // Setup raycaster
  const casters = components.get(OBC.Raycasters);
  const world = getWorld();
  const caster = casters.get(world);

  // Selection material
  const selectMaterial = new THREE.MeshStandardMaterial({
    color: 0x667eea,
    emissive: 0x334477,
    opacity: 0.5,
    transparent: true,
    depthTest: false,
  });

  // Double-click to select
  container.addEventListener('dblclick', async () => {
    try {
      const result = caster.castRay();
      if (!result?.object) {
        clearSelection();
        return;
      }

      // Get the mesh that was hit
      const mesh = result.object;

      // Clear previous selection
      clearHighlightVisuals();

      // Apply highlight material
      if (mesh.material) {
        mesh._originalMaterial = mesh.material;
        mesh.material = selectMaterial;
        highlightedObjects.add(mesh);
      }

      // Try to get expressID from the hit
      const face = result.faceIndex;
      const expressId = getExpressIdFromHit(mesh, face);
      state.selectedEntityId = expressId;

      // Update info bar
      updateInfoBarSelection(expressId);

      // Notify listeners
      selectionListeners.forEach(fn => fn({
        expressId,
        mesh,
        point: result.point,
      }));

    } catch (err) {
      console.warn('Selection error:', err);
    }
  });

  console.log('Selection system initialized');
}

function getExpressIdFromHit(mesh, faceIndex) {
  // In @thatopen/components, fragment meshes store expressIDs
  // The exact access method depends on the version
  if (mesh.geometry?.attributes?.expressID) {
    const idx = faceIndex * 3;
    const idAttr = mesh.geometry.attributes.expressID;
    if (idAttr && idx < idAttr.count) {
      return idAttr.getX(idx);
    }
  }
  // Fallback: use object name or uuid
  return mesh.name || mesh.uuid?.slice(0, 8);
}

function updateInfoBarSelection(expressId) {
  const infoSelected = document.getElementById('infoSelected');
  const infoSelectedSep = document.getElementById('infoSelectedSep');
  if (infoSelected && expressId) {
    infoSelected.textContent = `${t('model.selected')}: #${expressId}`;
    if (infoSelectedSep) infoSelectedSep.style.display = '';
  }
}

function clearHighlightVisuals() {
  for (const mesh of highlightedObjects) {
    if (mesh._originalMaterial) {
      mesh.material = mesh._originalMaterial;
      delete mesh._originalMaterial;
    }
  }
  highlightedObjects.clear();
}

export function clearSelection() {
  clearHighlightVisuals();
  state.selectedEntityId = null;
  const infoSelected = document.getElementById('infoSelected');
  const infoSelectedSep = document.getElementById('infoSelectedSep');
  if (infoSelected) infoSelected.textContent = '';
  if (infoSelectedSep) infoSelectedSep.style.display = 'none';
  selectionListeners.forEach(fn => fn({ expressId: null }));
}

export function highlightEntities(expressIds, colorHex = 0xef4444) {
  // Highlight by applying material to matching meshes
  // This is a simplified approach — will be refined with proper fragment API
  const THREE = window.__THREE;
  if (!THREE) return;

  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.3,
    opacity: 0.5,
    transparent: true,
    depthTest: false,
  });

  const world = getWorld();
  if (!world?.scene?.three) return;

  world.scene.three.traverse(child => {
    if (!child.isMesh) return;
    if (child.geometry?.attributes?.expressID) {
      const idAttr = child.geometry.attributes.expressID;
      for (let i = 0; i < idAttr.count; i++) {
        if (expressIds.includes(idAttr.getX(i))) {
          child._originalMaterial = child._originalMaterial || child.material;
          child.material = mat;
          highlightedObjects.add(child);
          break;
        }
      }
    }
  });
}

export function clearHighlights() {
  clearHighlightVisuals();
}
