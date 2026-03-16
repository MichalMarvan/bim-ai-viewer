/**
 * Settings UI — endpoint management + agent creation
 */
import { state } from '../core/state.js';
import { t } from '../core/i18n.js';
import { escapeHtml } from '../core/utils.js';
import { showToast, showSuccess, showError } from '../ui/toast.js';
import { showModal, showConfirm } from '../ui/modals.js';
import { testConnection, fetchModels } from '../ai/ai-client.js';
import {
  saveEndpoint, deleteEndpoint, createAgent, createFromTemplate,
  deleteAgent, getTemplates, loadAgents, loadEndpoints
} from '../ai/agent-manager.js';
import { populateAgentSelect, updateAgentStatus } from './chat-ui.js';

export function initSettingsUI() {
  document.getElementById('btnAddEndpoint')?.addEventListener('click', showAddEndpointModal);
  renderEndpoints();
  renderAgentsList();
}

// ===== ENDPOINTS =====

export function renderEndpoints() {
  const container = document.getElementById('endpointsContainer');
  if (!container) return;

  if (state.endpoints.length === 0) {
    container.innerHTML = `<div style="color:var(--text-tertiary);font-size:11px;padding:8px;">Žádné endpointy</div>`;
    return;
  }

  container.innerHTML = state.endpoints.map(ep => `
    <div class="endpoint-card" data-id="${escapeHtml(ep.id)}">
      <div class="ep-header">
        <span class="info-dot green"></span>
        <span class="ep-name">${escapeHtml(ep.name)}</span>
        <button class="btn-icon-modern" data-action="delete-ep" data-id="${escapeHtml(ep.id)}" style="width:24px;height:24px;" title="${t('btn.delete')}">
          <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="ep-url">${escapeHtml(ep.url)}</div>
      ${ep.models?.length ? `<div style="font-size:9px;color:var(--text-tertiary);margin-top:4px;">${ep.models.length} modelů</div>` : ''}
    </div>
  `).join('');

  // Delete buttons
  container.querySelectorAll('[data-action="delete-ep"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (await showConfirm(t('modal.deleteConfirm'))) {
        await deleteEndpoint(id);
        renderEndpoints();
        showSuccess(t('toast.deleted'));
      }
    });
  });
}

async function showAddEndpointModal() {
  const presets = [
    { name: 'Ollama (lokální)', url: 'http://localhost:11434/v1', needsKey: false },
    { name: 'LM Studio (lokální)', url: 'http://localhost:1234/v1', needsKey: false },
    { name: 'OpenAI', url: 'https://api.openai.com/v1', needsKey: true },
    { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1', needsKey: true },
    { name: 'Vlastní', url: '', needsKey: false },
  ];

  const presetsHtml = presets.map((p, i) =>
    `<option value="${i}">${escapeHtml(p.name)}</option>`
  ).join('');

  const bodyHtml = `
    <div class="form-group">
      <label>${t('agents.template')}</label>
      <select name="preset" id="epPreset">
        ${presetsHtml}
      </select>
    </div>
    <div class="form-group">
      <label>${t('settings.name')}</label>
      <input name="name" id="epName" value="${escapeHtml(presets[0].name)}">
    </div>
    <div class="form-group">
      <label>${t('settings.url')}</label>
      <input name="url" id="epUrl" value="${escapeHtml(presets[0].url)}">
    </div>
    <div class="form-group" id="epApiKeyGroup" style="display:none;">
      <label>${t('settings.apiKey')}</label>
      <input name="apiKey" id="epApiKey" type="password" placeholder="sk-...">
    </div>
    <div style="margin-top:8px;">
      <button class="btn-modern" id="epTestBtn" type="button">${t('btn.test')}</button>
      <span id="epTestResult" style="font-size:11px;margin-left:8px;"></span>
    </div>
    <div id="epModelsInfo" style="font-size:10px;color:var(--text-tertiary);margin-top:8px;"></div>
  `;

  const result = await showModal(t('settings.addEndpoint'), bodyHtml, [
    { label: t('btn.cancel'), action: 'cancel' },
    { label: t('btn.save'), action: 'save', class: 'primary' },
  ]);

  // Before the modal resolves, we need to set up the interactive elements
  // This is tricky with our simple modal system — let's use a different approach
  // The modal is already shown, so we need to attach events to it
}

// Simpler approach: inline settings directly in the panel
export function initInlineSettings() {
  const addBtn = document.getElementById('btnAddEndpoint');
  addBtn?.addEventListener('click', async () => {
    const url = prompt('Endpoint URL (např. http://localhost:11434/v1):');
    if (!url) return;

    const name = prompt('Název endpointu:', url.includes('ollama') ? 'Ollama' : url.includes('1234') ? 'LM Studio' : 'Custom');
    if (!name) return;

    const apiKey = url.includes('openai') || url.includes('openrouter')
      ? prompt('API klíč (nebo prázdné):') || ''
      : '';

    // Test connection
    showToast('Testuji spojení...', 'info');
    const test = await testConnection(url, apiKey);

    if (!test.ok) {
      showError(`${t('settings.testFail')}: ${test.error}`);
      return;
    }

    const ep = await saveEndpoint({ name, url, apiKey, models: test.models });
    showSuccess(`${t('settings.testOk')} — ${test.models.length} modelů`);
    renderEndpoints();

    // Offer to create agent
    if (test.models.length > 0) {
      const createNow = confirm('Chcete vytvořit agenta s tímto endpointem?');
      if (createNow) {
        await showCreateAgentFlow(ep.id, test.models);
      }
    }
  });
}

async function showCreateAgentFlow(endpointId, models) {
  const templates = getTemplates();
  const templateNames = Object.entries(templates).map(([k, v]) => `${k} (${v.name})`).join(', ');

  const templateKey = prompt(`Šablona agenta (${templateNames}), nebo "custom":`, 'validator');
  if (!templateKey) return;

  const model = prompt(`Model (${models.slice(0, 5).join(', ')}):`, models[0]);
  if (!model) return;

  if (templateKey === 'custom') {
    const name = prompt('Název agenta:');
    const systemPrompt = prompt('System prompt:');
    if (!name) return;
    await createAgent({ name, systemPrompt: systemPrompt || '', endpointId, model, temperature: 0.7 });
  } else {
    await createFromTemplate(templateKey, endpointId, model);
  }

  showSuccess(t('toast.saved'));
  renderAgentsList();
  populateAgentSelect();
}

// ===== AGENTS LIST =====

export function renderAgentsList() {
  const container = document.getElementById('agentsList');
  if (!container) return;

  if (state.agents.length === 0) {
    container.innerHTML = `
      <div style="color:var(--text-tertiary);font-size:12px;padding:8px;" data-i18n="agents.noAgents">${t('agents.noAgents')}</div>
      <button class="btn-modern" id="btnCreateAgent" style="margin-top:8px;width:100%;">
        <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span>${t('agents.create')}</span>
      </button>
    `;
    container.querySelector('#btnCreateAgent')?.addEventListener('click', () => {
      if (state.endpoints.length === 0) {
        showError('Nejprve přidejte endpoint v nastavení');
        return;
      }
      showCreateAgentFlow(state.endpoints[0].id, state.endpoints[0].models || []);
    });
    return;
  }

  container.innerHTML = state.agents.map(a => {
    const ep = state.endpoints.find(e => e.id === a.endpointId);
    return `
      <div class="agent-card ${a.id === state.currentAgentId ? 'active' : ''}" data-id="${escapeHtml(a.id)}">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <span style="font-size:12px;font-weight:600;color:var(--text-primary);flex:1;">${escapeHtml(a.name)}</span>
          <button class="btn-icon-modern" data-action="delete-agent" data-id="${escapeHtml(a.id)}" style="width:22px;height:22px;">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style="font-size:10px;color:var(--text-tertiary);">${escapeHtml(a.model || 'no model')} ${ep ? `@ ${escapeHtml(ep.name)}` : ''}</div>
      </div>
    `;
  }).join('') + `
    <button class="btn-modern" id="btnCreateAgent" style="margin-top:8px;width:100%;">
      <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      <span>${t('agents.create')}</span>
    </button>
  `;

  // Select agent on click
  container.querySelectorAll('.agent-card').forEach(card => {
    card.addEventListener('click', () => {
      state.currentAgentId = card.dataset.id;
      populateAgentSelect();
      updateAgentStatus();
      renderAgentsList();
    });
  });

  // Delete agent
  container.querySelectorAll('[data-action="delete-agent"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (await showConfirm(t('modal.deleteConfirm'))) {
        await deleteAgent(btn.dataset.id);
        renderAgentsList();
        populateAgentSelect();
        updateAgentStatus();
        showSuccess(t('toast.deleted'));
      }
    });
  });

  // Create new agent
  container.querySelector('#btnCreateAgent')?.addEventListener('click', () => {
    if (state.endpoints.length === 0) {
      showError('Nejprve přidejte endpoint v nastavení');
      return;
    }
    showCreateAgentFlow(state.endpoints[0].id, state.endpoints[0].models || []);
  });
}
