/**
 * Tool executor — processes tool_calls from LLM responses
 */
import { state } from '../core/state.js';
import { highlightEntities, clearHighlights } from '../viewer/viewer-selection.js';
import { getModelSummaryForAI } from '../ifc/ifc-index.js';

const COLOR_MAP = {
  red: 0xef4444,
  orange: 0xf59e0b,
  green: 0x10b981,
  blue: 0x3b82f6,
};

export async function executeTool(name, argsStr) {
  let args;
  try {
    args = typeof argsStr === 'string' ? JSON.parse(argsStr) : argsStr;
  } catch (e) {
    return { error: `Invalid tool arguments: ${e.message}` };
  }

  switch (name) {
    case 'search_entities':
      return searchEntities(args);
    case 'get_properties':
      return getProperties(args);
    case 'highlight_entities':
      return doHighlight(args);
    case 'clear_highlights':
      clearHighlights();
      return { status: 'ok', message: 'All highlights cleared.' };
    case 'get_model_stats':
      return { summary: getModelSummaryForAI() };
    case 'validate_property':
      return validateProperty(args);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

function searchEntities({ entityType, limit = 50 }) {
  const idx = state.modelIndex;
  if (!idx) return { error: 'No model loaded.' };

  const typeData = idx.entityTypes[entityType];
  if (!typeData) {
    // Try case-insensitive match
    const key = Object.keys(idx.entityTypes).find(k =>
      k.toLowerCase() === entityType.toLowerCase()
    );
    if (key) {
      const data = idx.entityTypes[key];
      const ids = data.ids.slice(0, limit);
      return { entityType: key, count: data.count, results: ids };
    }
    return { entityType, count: 0, results: [], message: `No ${entityType} found in model.` };
  }

  const ids = typeData.ids.slice(0, limit);
  return { entityType, count: typeData.count, results: ids };
}

function getProperties({ entityId }) {
  // Basic property lookup from model index
  const idx = state.modelIndex;
  if (!idx) return { error: 'No model loaded.' };

  let entityType = 'Unknown';
  for (const [type, data] of Object.entries(idx.entityTypes)) {
    if (data.ids.includes(entityId)) {
      entityType = type;
      break;
    }
  }

  return {
    entityId,
    type: entityType,
    message: 'Basic properties from model index. Full PropertySet access requires IFC properties API.',
  };
}

function doHighlight({ entityIds, color = 'red' }) {
  if (!entityIds?.length) return { error: 'No entity IDs provided.' };
  const colorHex = COLOR_MAP[color] || COLOR_MAP.red;
  highlightEntities(entityIds, colorHex);
  return {
    status: 'ok',
    message: `Highlighted ${entityIds.length} entities in ${color}.`,
    highlightedIds: entityIds,
  };
}

function validateProperty({ entityId, psetName, propertyName }) {
  // Stub — full implementation requires IFC property reading
  return {
    entityId,
    psetName,
    propertyName,
    status: 'not_implemented',
    message: `Property validation for ${psetName}.${propertyName} on entity ${entityId}. Full validation requires IFC properties API integration.`,
  };
}
