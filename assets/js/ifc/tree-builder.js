/**
 * Build hierarchical model tree from IFC index
 */
import { state } from '../core/state.js';

export function buildTreeData() {
  const idx = state.modelIndex;
  if (!idx) return [];

  // Build tree: root → entity types → individual entities
  const root = {
    id: 'root',
    name: idx.modelId || 'Model',
    type: 'model',
    children: [],
    count: idx.totalEntities,
    expanded: true,
  };

  // Sort entity types by count (descending)
  const sortedTypes = Object.entries(idx.entityTypes)
    .sort((a, b) => b[1].count - a[1].count);

  for (const [type, data] of sortedTypes) {
    const typeNode = {
      id: `type_${type}`,
      name: type,
      type: 'entityType',
      ifcType: type,
      children: [],
      count: data.count,
      expanded: false,
    };

    // Add individual entities (limit to first 100 to avoid huge trees)
    const showIds = data.ids.slice(0, 100);
    for (const eid of showIds) {
      typeNode.children.push({
        id: `entity_${eid}`,
        name: `#${eid}`,
        type: 'entity',
        expressId: eid,
        ifcType: type,
        children: [],
        count: 0,
      });
    }

    if (data.ids.length > 100) {
      typeNode.children.push({
        id: `more_${type}`,
        name: `... a ${data.ids.length - 100} dalších`,
        type: 'more',
        children: [],
        count: 0,
      });
    }

    root.children.push(typeNode);
  }

  return [root];
}

export function filterTree(treeData, query) {
  if (!query) return treeData;
  const q = query.toLowerCase();

  function matches(node) {
    if (node.name.toLowerCase().includes(q)) return true;
    if (node.ifcType?.toLowerCase().includes(q)) return true;
    return node.children.some(matches);
  }

  function filterNode(node) {
    if (node.children.length === 0) {
      return matches(node) ? { ...node } : null;
    }
    const filteredChildren = node.children
      .map(filterNode)
      .filter(Boolean);
    if (filteredChildren.length > 0 || node.name.toLowerCase().includes(q)) {
      return { ...node, children: filteredChildren, expanded: true };
    }
    return null;
  }

  return treeData.map(filterNode).filter(Boolean);
}
