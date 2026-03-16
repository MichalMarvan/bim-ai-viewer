/**
 * Build JSON index from loaded IFC model for AI context
 * Traverses the scene graph to collect entity types, counts, and hierarchy.
 */
import { getWorld, getFragments, isViewerReady } from '../viewer/viewer-init.js';
import { state } from '../core/state.js';

export async function buildModelIndex(modelId) {
  if (!isViewerReady()) return null;

  const world = getWorld();
  if (!world?.scene?.three) return null;

  const index = {
    modelId,
    entityTypes: {},
    hierarchy: [],
    totalEntities: 0,
    materials: new Set(),
  };

  // Traverse scene to collect mesh info
  world.scene.three.traverse(child => {
    if (!child.isMesh) return;

    // Try to extract IFC type from mesh/group name
    const name = child.name || child.parent?.name || 'Unknown';
    const ifcType = extractIfcType(name);

    if (!index.entityTypes[ifcType]) {
      index.entityTypes[ifcType] = { count: 0, ids: [] };
    }

    // Get expressIDs if available
    const idAttr = child.geometry?.attributes?.expressID;
    if (idAttr) {
      const seen = new Set();
      for (let i = 0; i < idAttr.count; i++) {
        const eid = idAttr.getX(i);
        if (!seen.has(eid)) {
          seen.add(eid);
          index.entityTypes[ifcType].ids.push(eid);
          index.entityTypes[ifcType].count++;
          index.totalEntities++;
        }
      }
    } else {
      index.entityTypes[ifcType].count++;
      index.totalEntities++;
    }

    // Collect material names
    const mat = child.material;
    if (mat?.name) index.materials.add(mat.name);
  });

  // Convert materials set to array
  index.materials = [...index.materials];

  state.modelIndex = index;

  // Update info bar
  const infoObjects = document.getElementById('infoObjects');
  if (infoObjects) infoObjects.textContent = `${index.totalEntities} objektů`;

  console.log('Model index built:', index.totalEntities, 'entities,', Object.keys(index.entityTypes).length, 'types');
  return index;
}

function extractIfcType(name) {
  // Try to match IFC type from name like "IfcWall", "IFCSLAB", etc.
  const match = name.match(/Ifc[A-Z][a-zA-Z]*/i);
  if (match) return match[0];
  // Fallback
  if (name.toLowerCase().includes('wall')) return 'IfcWall';
  if (name.toLowerCase().includes('slab')) return 'IfcSlab';
  if (name.toLowerCase().includes('door')) return 'IfcDoor';
  if (name.toLowerCase().includes('window')) return 'IfcWindow';
  if (name.toLowerCase().includes('column')) return 'IfcColumn';
  if (name.toLowerCase().includes('beam')) return 'IfcBeam';
  if (name.toLowerCase().includes('roof')) return 'IfcRoof';
  return 'Other';
}

export function getModelSummaryForAI() {
  const idx = state.modelIndex;
  if (!idx) return 'No model loaded.';

  let summary = `IFC Model: ${idx.totalEntities} entities total.\n\nEntity types:\n`;
  for (const [type, data] of Object.entries(idx.entityTypes)) {
    summary += `- ${type}: ${data.count}\n`;
  }
  if (idx.materials.length) {
    summary += `\nMaterials: ${idx.materials.join(', ')}\n`;
  }
  return summary;
}
