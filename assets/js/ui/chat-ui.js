/**
 * Chat UI — messages, input, tool-calling loop, streaming
 */
import { state } from '../core/state.js';
import { t } from '../core/i18n.js';
import { escapeHtml, formatDuration } from '../core/utils.js';
import { showError } from '../ui/toast.js';
import { chatCompletion } from '../ai/ai-client.js';
import { getAgent, getEndpoint } from '../ai/agent-manager.js';
import { TOOL_DEFINITIONS } from '../ai/tool-defs.js';
import { executeTool } from '../ai/tool-executor.js';
import { getModelSummaryForAI } from '../ifc/ifc-index.js';

let isSending = false;
let currentAbort = null;
const MAX_TOOL_ROUNDS = 5;

export function initChatUI() {
  const sendBtn = document.getElementById('btnSend');
  const chatInput = document.getElementById('chatInput');

  // Send on button click
  sendBtn?.addEventListener('click', () => sendFromInput());

  // Send on Enter (Shift+Enter = newline)
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendFromInput();
    }
  });

  // Quick action buttons
  document.querySelectorAll('.qa-btn[data-prompt]').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.dataset.prompt;
      if (prompt) sendMessage(prompt);
    });
  });

  // Agent select change
  document.getElementById('agentSelect')?.addEventListener('change', (e) => {
    state.currentAgentId = e.target.value || null;
    updateAgentStatus();
  });
}

function sendFromInput() {
  const input = document.getElementById('chatInput');
  const text = input?.value?.trim();
  if (!text) return;
  input.value = '';
  input.style.height = 'auto';
  sendMessage(text);
}

export async function sendMessage(text) {
  if (isSending) return;

  const agent = getAgent(state.currentAgentId);
  if (!agent) {
    showError(t('ai.noAgent'));
    return;
  }
  const endpoint = getEndpoint(agent.endpointId);
  if (!endpoint) {
    showError(t('ai.noEndpoint'));
    return;
  }

  isSending = true;
  const sendBtn = document.getElementById('btnSend');
  if (sendBtn) sendBtn.disabled = true;

  // Add user message
  state.messages.push({ role: 'user', content: text });
  appendMessage('user', text);

  // Show thinking indicator
  const thinkingId = showThinking();
  const startTime = Date.now();

  try {
    // Build messages array
    const messages = buildMessages(agent);

    // Tool-calling loop
    let response = null;
    let toolRound = 0;

    while (toolRound <= MAX_TOOL_ROUNDS) {
      currentAbort = new AbortController();

      // Streaming callback
      let streamContent = '';
      const onStream = (chunk, full) => {
        streamContent = full;
        updateThinking(thinkingId, full);
      };

      response = await chatCompletion(
        endpoint.url, endpoint.apiKey, agent.model,
        messages, TOOL_DEFINITIONS,
        { temperature: agent.temperature, signal: currentAbort.signal, onStream }
      );

      currentAbort = null;
      const choice = response.choices?.[0];
      const msg = choice?.message;

      if (!msg) break;

      // Handle tool calls
      if (msg.tool_calls?.length) {
        toolRound++;
        messages.push(msg);

        for (const tc of msg.tool_calls) {
          const toolName = tc.function?.name;
          const toolArgs = tc.function?.arguments;

          // Show tool call in chat
          appendToolCall(toolName, toolArgs);

          // Execute
          const result = await executeTool(toolName, toolArgs);

          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }

        // Continue loop — LLM will process tool results
        continue;
      }

      // Final text response
      const content = msg.content || streamContent || '';
      if (content) {
        state.messages.push({ role: 'assistant', content });
        removeThinking(thinkingId);
        const duration = formatDuration(Date.now() - startTime);
        appendMessage('assistant', content, { duration, agentName: agent.name });
      }
      break;
    }

  } catch (err) {
    removeThinking(thinkingId);
    if (err.name !== 'AbortError') {
      console.error('Chat error:', err);
      appendMessage('assistant', `Error: ${err.message}`, { isError: true });
    }
  }

  isSending = false;
  if (sendBtn) sendBtn.disabled = false;
}

function buildMessages(agent) {
  const messages = [];

  // System prompt
  let systemPrompt = agent.systemPrompt || '';

  // Add model context
  const modelSummary = getModelSummaryForAI();
  if (modelSummary && modelSummary !== 'No model loaded.') {
    systemPrompt += `\n\n## Loaded IFC Model\n${modelSummary}`;
  }

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  // Chat history (last 20 messages to stay within context)
  const history = state.messages.slice(-20);
  messages.push(...history);

  return messages;
}

function appendMessage(role, content, options = {}) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  // Remove empty state message
  const emptyState = container.querySelector('div[style*="text-align:center"]');
  if (emptyState) emptyState.remove();

  const group = document.createElement('div');
  group.className = `msg-group ${role}`;

  const senderLabel = role === 'user' ? 'Ty' : (options.agentName || 'Agent');

  let renderedContent = content;
  if (role === 'assistant' && !options.isError) {
    renderedContent = renderMarkdown(content);
  } else {
    renderedContent = escapeHtml(content);
  }

  let metaHtml = '';
  if (options.duration) {
    metaHtml = `<div style="font-size:9px;color:var(--text-tertiary);margin-top:4px;">${t('ai.responseIn')} ${options.duration}</div>`;
  }
  if (options.isError) {
    renderedContent = `<span style="color:var(--error);">${renderedContent}</span>`;
  }

  group.innerHTML = `
    <div class="msg-sender">${escapeHtml(senderLabel)}</div>
    <div class="msg-bubble">${renderedContent}${metaHtml}</div>
  `;

  // Make entity references clickable
  group.querySelectorAll('.msg-entity, [data-express-id]').forEach(el => {
    el.addEventListener('click', () => {
      const id = parseInt(el.dataset.expressId || el.textContent.replace('#', ''));
      if (id) {
        window.dispatchEvent(new CustomEvent('entity-selected', { detail: { expressId: id } }));
      }
    });
  });

  container.appendChild(group);
  container.scrollTop = container.scrollHeight;
}

function appendToolCall(toolName, argsStr) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const el = document.createElement('div');
  el.className = 'msg-group ai';
  el.innerHTML = `
    <div class="msg-sender" style="color:var(--primary-light);">
      <svg class="icon" viewBox="0 0 24 24" style="width:10px;height:10px;"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
      ${t('ai.toolCall')}
    </div>
    <div class="msg-bubble" style="font-size:10px;padding:6px 10px;background:rgba(102,126,234,0.08);border-color:var(--primary);max-width:100%;">
      <code>${escapeHtml(toolName)}(${truncate(argsStr, 80)})</code>
    </div>
  `;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function showThinking() {
  const container = document.getElementById('chatMessages');
  if (!container) return null;

  const id = 'thinking-' + Date.now();
  const el = document.createElement('div');
  el.id = id;
  el.className = 'msg-group ai';
  el.innerHTML = `
    <div class="msg-thinking">
      <div class="spinner"></div>
      <span>${t('ai.thinking')}</span>
      <button class="stop-btn" onclick="window._cancelChat?.()">Stop</button>
    </div>
  `;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;

  window._cancelChat = () => {
    if (currentAbort) currentAbort.abort();
  };

  return id;
}

function updateThinking(id, content) {
  const el = document.getElementById(id);
  if (!el) return;
  const bubble = el.querySelector('.msg-thinking');
  if (bubble) {
    bubble.innerHTML = `
      <div class="spinner"></div>
      <span style="flex:1;font-size:11px;color:var(--text-secondary);max-height:60px;overflow:hidden;">${renderMarkdown(truncate(content, 200))}</span>
      <button class="stop-btn" onclick="window._cancelChat?.()">Stop</button>
    `;
  }
}

function removeThinking(id) {
  document.getElementById(id)?.remove();
  window._cancelChat = null;
}

function renderMarkdown(text) {
  if (!text) return '';
  try {
    if (typeof marked !== 'undefined') {
      let html = marked.parse(text, { breaks: true });
      if (typeof DOMPurify !== 'undefined') {
        html = DOMPurify.sanitize(html, { ADD_ATTR: ['class', 'data-express-id'] });
      }
      // Convert #NNNN patterns to clickable entity references
      html = html.replace(/#(\d{3,})/g, '<span class="msg-entity" data-express-id="$1">#$1</span>');
      return html;
    }
  } catch (e) {
    console.warn('Markdown render failed:', e);
  }
  return escapeHtml(text);
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

export function updateAgentStatus() {
  const agent = getAgent(state.currentAgentId);
  const statusText = document.getElementById('aiStatusText');
  const statusDot = document.getElementById('aiStatusDot');
  const modelTag = document.getElementById('aiModelTag');

  if (!agent) {
    if (statusText) statusText.textContent = t('ai.noAgent');
    if (statusDot) statusDot.className = 'info-dot';
    if (modelTag) modelTag.textContent = '';
    return;
  }

  const endpoint = getEndpoint(agent.endpointId);
  if (statusText) statusText.textContent = `${agent.name} — ${endpoint ? t('ai.connected') : t('ai.disconnected')}`;
  if (statusDot) statusDot.className = `info-dot ${endpoint ? 'green' : 'red'}`;
  if (modelTag) modelTag.textContent = endpoint ? `${agent.model} @ ${new URL(endpoint.url).hostname}` : '';
}

export function populateAgentSelect() {
  const select = document.getElementById('agentSelect');
  if (!select) return;

  select.innerHTML = `<option value="">${t('ai.noAgent')}</option>` +
    state.agents.map(a =>
      `<option value="${escapeHtml(a.id)}" ${a.id === state.currentAgentId ? 'selected' : ''}>${escapeHtml(a.name)}</option>`
    ).join('');
}
