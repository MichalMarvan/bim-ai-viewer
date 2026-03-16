/**
 * Tool definitions for AI agents — OpenAI function-calling format
 */

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'search_entities',
      description: 'Search for IFC entities by type. Returns list of matching entity IDs and count.',
      parameters: {
        type: 'object',
        properties: {
          entityType: {
            type: 'string',
            description: 'IFC entity type, e.g. "IfcWall", "IfcDoor", "IfcWindow", "IfcColumn", "IfcSlab"',
          },
          limit: {
            type: 'number',
            description: 'Max results to return. Default 50.',
          },
        },
        required: ['entityType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_properties',
      description: 'Get properties of a specific entity by its ExpressID number.',
      parameters: {
        type: 'object',
        properties: {
          entityId: {
            type: 'number',
            description: 'The numeric ExpressID of the entity',
          },
        },
        required: ['entityId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'highlight_entities',
      description: 'Highlight specific entities in the 3D viewer with a color.',
      parameters: {
        type: 'object',
        properties: {
          entityIds: {
            type: 'array',
            items: { type: 'number' },
            description: 'Array of ExpressID numbers to highlight',
          },
          color: {
            type: 'string',
            enum: ['red', 'orange', 'green', 'blue'],
            description: 'Highlight color. Default "red".',
          },
        },
        required: ['entityIds'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'clear_highlights',
      description: 'Remove all highlights from the 3D viewer.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_model_stats',
      description: 'Get summary statistics of the loaded IFC model: entity types with counts, materials.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'validate_property',
      description: 'Check if a specific entity has a property in a PropertySet. Returns the current value or reports missing.',
      parameters: {
        type: 'object',
        properties: {
          entityId: {
            type: 'number',
            description: 'ExpressID of the entity',
          },
          psetName: {
            type: 'string',
            description: 'PropertySet name, e.g. "Pset_WallCommon"',
          },
          propertyName: {
            type: 'string',
            description: 'Property name, e.g. "FireRating"',
          },
        },
        required: ['entityId', 'psetName', 'propertyName'],
      },
    },
  },
];
