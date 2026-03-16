/**
 * Shared application state
 * All modules import this by reference and modify directly.
 */
export const state = {
  // Model
  currentModelId: null,
  modelIndex: null,
  selectedEntityId: null,
  entities: new Map(),

  // AI
  agents: [],
  currentAgentId: null,
  endpoints: [],
  chats: [],
  currentChatId: null,
  messages: [],

  // UI
  currentPanel: 'tree',
  sidePanelOpen: true,
  aiSidebarOpen: true,
  theme: localStorage.getItem('bim-ai-theme') || 'dark',
  lang: localStorage.getItem('bim-ai-lang') || 'cs',
};
