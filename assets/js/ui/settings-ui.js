/**
 * Settings UI — agent creation/editing with inline provider config
 */
import { state } from '../core/state.js';
import { t } from '../core/i18n.js';
import { escapeHtml } from '../core/utils.js';
import { showToast, showSuccess, showError } from '../ui/toast.js';
import { showConfirm } from '../ui/modals.js';
import { fetchModels } from '../ai/ai-client.js';
import {
  saveEndpoint, createAgent, updateAgent,
  deleteAgent, getTemplates, getAgent, getEndpoint
} from '../ai/agent-manager.js';
import { populateAgentSelect, updateAgentStatus } from './chat-ui.js';
import { PROVIDERS, detectProvider } from '../ai/providers.js';

export function initSettingsUI() {
  initAgentForm();
  renderAgentsList();
}

// ===== AGENT FORM =====

function initAgentForm() {
  const form = document.getElementById('agentForm');
  if (!form) return;

  const providerSel = document.getElementById('agentProvider');
  const endpointGroup = document.getElementById('agentEndpointGroup');
  const apiKeyGroup = document.getElementById('agentApiKeyGroup');
  const endpointInput = document.getElementById('agentEndpoint');
  const apiKeyInput = document.getElementById('agentApiKey');
  const modelSel = document.getElementById('agentModel');
  const tempSlider = document.getElementById('agentTemp');
  const tempValue = document.getElementById('tempValue');
  const templateSel = document.getElementById('agentTemplate');

  // Provider change → show/hide fields + load models
  providerSel.addEventListener('change', () => {
    const key = providerSel.value;
    const provider = PROVIDERS[key];

    endpointGroup.classList.toggle('hidden', key !== 'custom');
    apiKeyGroup.classList.toggle('hidden', !provider.needsKey);

    if (key !== 'custom') {
      endpointInput.value = provider.endpoint;
    }

    // Auto-load models for providers that don't need a key
    if (!provider.needsKey && endpointInput.value) {
      loadModelsIntoSelect(endpointInput.value, '', modelSel.value);
    } else if (provider.needsKey) {
      const existingKey = apiKeyInput.value;
      if (existingKey && !existingKey.startsWith('***')) {
        loadModelsIntoSelect(provider.endpoint, existingKey, modelSel.value);
      } else {
        modelSel.innerHTML = '<option value="">Zadejte API klíč...</option>';
      }
    }
  });

  // API key blur → load models
  apiKeyInput.addEventListener('blur', () => {
    const key = apiKeyInput.value.trim();
    if (!key || key.startsWith('***')) return;
    const url = endpointInput.value || PROVIDERS[providerSel.value]?.endpoint;
    if (url) loadModelsIntoSelect(url, key, modelSel.value);
  });

  // Also load on Enter in API key field
  apiKeyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      apiKeyInput.blur();
    }
  });

  // Custom endpoint change → load models
  endpointInput.addEventListener('change', () => {
    loadModelsIntoSelect(endpointInput.value, apiKeyInput.value, modelSel.value);
  });

  // Temperature slider
  tempSlider.addEventListener('input', () => {
    tempValue.textContent = (tempSlider.value / 100).toFixed(2);
  });

  // Template change → fill name + prompt + temp
  templateSel.addEventListener('change', () => {
    const templates = getTemplates();
    const tpl = templates[templateSel.value];
    if (tpl) {
      document.getElementById('agentName').value = tpl.name;
      document.getElementById('agentPrompt').value = tpl.systemPrompt;
      tempSlider.value = Math.round((tpl.temperature || 0.7) * 100);
      tempSlider.dispatchEvent(new Event('input'));
    }
  });

  // Save
  document.getElementById('agentSaveBtn').addEventListener('click', saveAgentFromForm);

  // Cancel
  document.getElementById('agentCancelBtn').addEventListener('click', () => {
    form.classList.add('hidden');
  });

  // Delete
  document.getElementById('agentDeleteBtn').addEventListener('click', async () => {
    const id = document.getElementById('agentFormId').value;
    if (!id) return;
    if (await showConfirm(t('modal.deleteConfirm'))) {
      await deleteAgent(id);
      form.classList.add('hidden');
      renderAgentsList();
      populateAgentSelect();
      updateAgentStatus();
      showSuccess(t('toast.deleted'));
    }
  });
}

async function loadModelsIntoSelect(endpoint, apiKey, selectedModel) {
  const sel = document.getElementById('agentModel');
  sel.innerHTML = '<option value="">Načítání modelů...</option>';

  try {
    const models = await fetchModels(endpoint, apiKey);
    if (!models.length) {
      sel.innerHTML = '<option value="">Žádné modely</option>';
      return;
    }
    sel.innerHTML = models.map(m =>
      `<option value="${escapeHtml(m)}" ${m === selectedModel ? 'selected' : ''}>${escapeHtml(m)}</option>`
    ).join('');
  } catch (e) {
    sel.innerHTML = `<option value="${escapeHtml(selectedModel || '')}">${escapeHtml(selectedModel || 'Chyba: ' + e.message)}</option>`;
  }
}

function showAgentForm(agentId) {
  const form = document.getElementById('agentForm');
  const formIdInput = document.getElementById('agentFormId');
  const deleteBtn = document.getElementById('agentDeleteBtn');
  const providerSel = document.getElementById('agentProvider');
  const endpointInput = document.getElementById('agentEndpoint');
  const apiKeyInput = document.getElementById('agentApiKey');
  const templateSel = document.getElementById('agentTemplate');

  if (agentId) {
    // Edit existing agent
    const agent = getAgent(agentId);
    if (!agent) return;

    formIdInput.value = agent.id;
    document.getElementById('agentName').value = agent.name;
    document.getElementById('agentPrompt').value = agent.systemPrompt || '';
    document.getElementById('agentTemp').value = Math.round((agent.temperature || 0.7) * 100);
    document.getElementById('tempValue').textContent = (agent.temperature || 0.7).toFixed(2);
    templateSel.value = '';
    deleteBtn.classList.remove('hidden');

    // Set provider from stored endpoint
    const ep = getEndpoint(agent.endpointId);
    if (ep) {
      const providerKey = detectProvider(ep.url);
      providerSel.value = providerKey;
      endpointInput.value = ep.url;
      apiKeyInput.value = ep.apiKey || '';
      if (ep.apiKey) {
        apiKeyInput.placeholder = '';
      }

      // Toggle visibility
      document.getElementById('agentEndpointGroup').classList.toggle('hidden', providerKey !== 'custom');
      document.getElementById('agentApiKeyGroup').classList.toggle('hidden', !PROVIDERS[providerKey]?.needsKey);

      loadModelsIntoSelect(ep.url, ep.apiKey || '', agent.model);
    } else {
      providerSel.value = 'ollama';
      providerSel.dispatchEvent(new Event('change'));
    }
  } else {
    // New agent — default to template
    formIdInput.value = '';
    document.getElementById('agentName').value = '';
    document.getElementById('agentPrompt').value = '';
    document.getElementById('agentTemp').value = 70;
    document.getElementById('tempValue').textContent = '0.70';
    templateSel.value = 'searcher';
    deleteBtn.classList.add('hidden');

    // Set default provider (first available endpoint or ollama)
    if (state.endpoints.length > 0) {
      const ep = state.endpoints[0];
      const providerKey = detectProvider(ep.url);
      providerSel.value = providerKey;
      endpointInput.value = ep.url;
      apiKeyInput.value = ep.apiKey || '';
      document.getElementById('agentEndpointGroup').classList.toggle('hidden', providerKey !== 'custom');
      document.getElementById('agentApiKeyGroup').classList.toggle('hidden', !PROVIDERS[providerKey]?.needsKey);
      loadModelsIntoSelect(ep.url, ep.apiKey || '', '');
    } else {
      providerSel.value = 'ollama';
      providerSel.dispatchEvent(new Event('change'));
    }

    // Apply template defaults
    templateSel.dispatchEvent(new Event('change'));
  }

  form.classList.remove('hidden');
}

async function saveAgentFromForm() {
  const id = document.getElementById('agentFormId').value;
  const name = document.getElementById('agentName').value.trim();
  const systemPrompt = document.getElementById('agentPrompt').value;
  const model = document.getElementById('agentModel').value;
  const temperature = parseInt(document.getElementById('agentTemp').value, 10) / 100;
  const providerKey = document.getElementById('agentProvider').value;
  const provider = PROVIDERS[providerKey];
  const endpointUrl = document.getElementById('agentEndpoint').value || provider?.endpoint;
  const apiKey = document.getElementById('agentApiKey').value;

  if (!name) { showError('Zadejte název agenta'); return; }
  if (!model) { showError('Vyberte model'); return; }

  // Find or create endpoint silently
  let ep = state.endpoints.find(e => e.url === endpointUrl);
  if (!ep) {
    ep = await saveEndpoint({
      name: provider?.name || endpointUrl,
      url: endpointUrl,
      apiKey: apiKey && !apiKey.startsWith('***') ? apiKey : '',
      models: [],
    });
  } else if (apiKey && !apiKey.startsWith('***') && apiKey !== ep.apiKey) {
    ep.apiKey = apiKey;
    await saveEndpoint(ep);
  }

  if (id) {
    await updateAgent(id, { name, systemPrompt, model, temperature, endpointId: ep.id });
  } else {
    const agent = await createAgent({ name, systemPrompt, model, temperature, endpointId: ep.id });
    state.currentAgentId = agent.id;
  }

  document.getElementById('agentForm').classList.add('hidden');
  showSuccess(t('toast.saved'));
  renderAgentsList();
  populateAgentSelect();
  updateAgentStatus();
}

// ===== AGENTS LIST =====

export function renderAgentsList() {
  const container = document.getElementById('agentsList');
  if (!container) return;

  const createBtn = `
    <button class="btn-modern" id="btnCreateAgent" style="margin-top:8px;width:100%;">
      <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      <span>${t('agents.create')}</span>
    </button>
  `;

  if (state.agents.length === 0) {
    container.innerHTML = `
      <div style="color:var(--text-tertiary);font-size:12px;padding:8px;">${t('agents.noAgents')}</div>
      ${createBtn}
    `;
  } else {
    container.innerHTML = state.agents.map(a => {
      const ep = state.endpoints.find(e => e.id === a.endpointId);
      const providerName = ep ? (detectProvider(ep.url) === 'custom' ? ep.name : PROVIDERS[detectProvider(ep.url)]?.name) : '';
      return `
        <div class="agent-card ${a.id === state.currentAgentId ? 'active' : ''}" data-id="${escapeHtml(a.id)}">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="font-size:12px;font-weight:600;color:var(--text-primary);flex:1;">${escapeHtml(a.name)}</span>
            <button class="btn-icon-modern" data-action="edit-agent" data-id="${escapeHtml(a.id)}" style="width:22px;height:22px;" title="Upravit">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
          <div style="font-size:10px;color:var(--text-tertiary);">${escapeHtml(a.model || '?')} · ${escapeHtml(providerName || '?')}</div>
        </div>
      `;
    }).join('') + createBtn;
  }

  // Select agent on click
  container.querySelectorAll('.agent-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-action]')) return;
      state.currentAgentId = card.dataset.id;
      populateAgentSelect();
      updateAgentStatus();
      renderAgentsList();
    });
  });

  // Edit agent
  container.querySelectorAll('[data-action="edit-agent"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showAgentForm(btn.dataset.id);
    });
  });

  // Create new agent
  container.querySelector('#btnCreateAgent')?.addEventListener('click', () => {
    showAgentForm(null);
  });
}

// Keep for compatibility - renderEndpoints is no-op now
export function renderEndpoints() {}
