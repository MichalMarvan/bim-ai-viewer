# BIM AI Viewer — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a frontend-only IFC 3D viewer with AI agents that search, highlight, and validate BIM model objects via user's own LLM endpoint.

**Architecture:** Single-page vanilla JS app. @thatopen/components renders IFC models in 3D. AI agents call OpenAI-compatible endpoints directly from browser. IFC entities are parsed into a JSON index that agents use via tool-calling. All data persists in IndexedDB.

**Tech Stack:** Vanilla JS (ES6 modules), @thatopen/components 3.3.2, @thatopen/components-front 3.3.2, @thatopen/fragments, Three.js, web-ifc (WASM), marked.js, DOMPurify, IndexedDB. No npm, no build step — CDN imports via `<script type="importmap">`.

**Import map (exact CDN URLs):**
```json
{
  "imports": {
    "three": "https://esm.sh/three@0.168.0",
    "three/examples/jsm/": "https://esm.sh/three@0.168.0/examples/jsm/",
    "@thatopen/components": "https://esm.sh/@thatopen/components@3.3.2",
    "@thatopen/components-front": "https://esm.sh/@thatopen/components-front@3.3.2",
    "@thatopen/fragments": "https://esm.sh/@thatopen/fragments@3.3.2",
    "web-ifc": "https://esm.sh/web-ifc@0.0.74"
  }
}
```

**CORS note:** Local LLM endpoints (Ollama, LM Studio) must have CORS enabled. Ollama enables CORS by default. LM Studio needs `--cors` flag. Cloud APIs may need a Cloudflare Pages Function as proxy.

**Design decisions vs spec:**
- **No separate IFC streaming parser** — @thatopen/components IfcLoader handles parsing internally via web-ifc WASM. We don't need BIM_checker's `ifc-stream-parser.js`. The entity index for AI is built by traversing the already-loaded Fragment model.
- **@thatopen/components-front required** — Highlighter lives in the `-front` package, not core.

**Testing:** No automated test framework (frontend-only, no npm). Each step includes **"Verify in browser"** instructions. Open `index.html` via local HTTP server (`python3 -m http.server 8080`) to test.

**Reference projects:**
- BIM_checker (`~/work/BIM_checker/`) — CSS variables, i18n, IFC parser, validation engine, storage patterns
- local-ai-playground (`~/work/local-ai-playground/`) — AI client, agent config, message rendering, tool-calling patterns

**Test IFC file:** Use `https://thatopen.github.io/engine_components/resources/ifc/small.ifc` for testing (small file, fast load). For larger tests: `https://thatopen.github.io/engine_components/resources/ifc/school_str.ifc`.

---

## File Structure

```
bim-ai-viewer/
├── index.html                        # Main SPA entry point
├── assets/
│   ├── js/
│   │   ├── core/
│   │   │   ├── app.js                # Bootstrap: init viewer, panels, theme, i18n
│   │   │   ├── state.js              # Shared state object (agents, chats, model)
│   │   │   ├── i18n.js               # Translation system (cs/en)
│   │   │   ├── translations.js       # Translation strings
│   │   │   ├── storage.js            # IndexedDB wrapper (files, agents, chats, settings)
│   │   │   └── utils.js              # escapeHtml, formatSize, debounce, generateId
│   │   ├── viewer/
│   │   │   ├── viewer-init.js        # @thatopen/components setup, scene, camera, renderer
│   │   │   ├── viewer-selection.js   # Raycasting, object highlight, selection events
│   │   │   └── viewer-tools.js       # Toolbar actions: orbit, measure, clip, fit-to-view
│   │   ├── ifc/
│   │   │   ├── ifc-loader.js         # Load IFC via IfcLoader, file drop handling
│   │   │   ├── ifc-index.js          # Build JSON index from parsed model (for AI context)
│   │   │   └── tree-builder.js       # Build hierarchical model tree from IFC spatial structure
│   │   ├── ai/
│   │   │   ├── ai-client.js          # HTTP calls to OpenAI-compatible endpoints
│   │   │   ├── agent-manager.js      # Agent CRUD, templates, IndexedDB persistence
│   │   │   ├── tool-defs.js          # Tool definitions (search_entities, highlight, etc.)
│   │   │   └── tool-executor.js      # Execute tool calls, return results to LLM loop
│   │   ├── ui/
│   │   │   ├── navigation.js         # Icon sidebar click handlers, panel switching
│   │   │   ├── theme.js              # Dark/light toggle, localStorage persistence
│   │   │   ├── panels.js             # Side panel + AI sidebar slide-in/out, expand tabs
│   │   │   ├── chat-ui.js            # Chat messages render, input handling, quick actions
│   │   │   ├── tree-ui.js            # Model tree render, expand/collapse, search filter
│   │   │   ├── properties-ui.js      # Properties panel for selected object
│   │   │   ├── settings-ui.js        # Endpoint config, agent editor modals
│   │   │   ├── modals.js             # Modal dialog system (confirm, prompt, form)
│   │   │   └── toast.js              # Toast notification system
│   │   └── workers/                  # Reserved for future Web Workers (validation, etc.)
│   ├── css/
│   │   ├── variables.css             # CSS custom properties — colors, spacing, shadows (adapted from BIM_checker common.css)
│   │   └── app.css                   # All layout & component styles (ported from approved mockup)
│   └── vendor/                       # Reserved for local WASM files if CDN fails
├── docs/
│   └── superpowers/
│       └── plans/
│           └── 2026-03-16-bim-ai-viewer.md  # This plan
├── CLAUDE.md
├── PLAN.md
└── .gitignore
```

---

## Chunk 1: Project Foundation — HTML Shell, CSS, Theme, i18n

### Task 1: CSS Variables & Base Styles

**Files:**
- Create: `assets/css/variables.css`
- Create: `assets/css/app.css`

- [ ] **Step 1: Create `assets/css/variables.css`**

Copy the CSS custom properties from BIM_checker's common.css. Include both `:root` (light) and `[data-theme="dark"]` blocks. Variables needed:

```css
/* Source: ~/work/BIM_checker/assets/css/common.css */
:root {
  --primary: #667eea;
  --primary-dark: #5568d3;
  --primary-light: #818cf8;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;
  --text-primary: #111827;
  --text-secondary: #4b5563;
  --text-tertiary: #6b7280;
  --border-primary: #e5e7eb;
  --border-secondary: #d1d5db;
  --shadow-sm: 0 1px 2px 0 rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
[data-theme="dark"] {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-tertiary: #94a3b8;
  --border-primary: #334155;
  --border-secondary: #475569;
  --shadow-sm: 0 1px 2px 0 rgba(0,0,0,0.5);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.5), 0 2px 4px -1px rgba(0,0,0,0.3);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -2px rgba(0,0,0,0.3);
}
```

- [ ] **Step 2: Create `assets/css/app.css`**

Port all layout styles from the approved mockup (`final-bimchecker.html`). Organize into sections:
1. Reset & base (`*, html, body`)
2. SVG icon base classes (`.icon`, `.icon-sm`, `.icon-lg`)
3. Navbar (`.navbar`, `.navbar-brand`, `.btn-modern`, `.lang-switcher`)
4. Icon sidebar (`.icon-sidebar`, `.nav-icon`, `.nav-tooltip`, `.badge`)
5. Side panel (`.side-panel`, `.panel-header`, `.search-wrap`, `.tree`, `.tree-item`, `.props-section`)
6. 3D viewer area (`.viewer-area`, `.viewer-grid`, `.viewer-toolbar`, `.vt-group`, `.view-tools`, `.axes-gizmo`, `.info-bar`)
7. AI sidebar (`.ai-sidebar`, `.ai-header`, `.ai-messages`, `.msg-group`, `.msg-bubble`, `.msg-tag`, `.msg-entity`, `.ai-quick`, `.ai-input`)
8. Panel slide animations (`.collapsed`, `.expand-tab`)
9. Modal & toast
10. Responsive breakpoints (`@media 1024px`, `@media 768px`)

Source: `.superpowers/brainstorm/845822-1773689968/final-bimchecker.html` — extract all `<style>` content.

- [ ] **Step 3: Verify files exist and are syntactically valid**

Run: `python3 -m http.server 8080 --directory /home/michal/work/bim-ai-viewer` and open browser to verify no CSS errors in console.

- [ ] **Step 4: Commit**

```bash
git add assets/css/variables.css assets/css/app.css
git commit -m "feat: add CSS variables and app styles from BIM checker theme"
```

---

### Task 2: Core Utilities

**Files:**
- Create: `assets/js/core/utils.js`
- Create: `assets/js/core/state.js`

- [ ] **Step 1: Create `assets/js/core/utils.js`**

```javascript
// Adapted from: ~/work/BIM_checker/assets/js/utils.js
// and ~/work/local-ai-playground/frontend/core/utils.js

export function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s/60)}m ${s%60}s`;
}

export function debounce(fn, wait) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); };
}

export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
```

- [ ] **Step 2: Create `assets/js/core/state.js`**

```javascript
// Shared application state — all modules import this by reference
// Pattern from: ~/work/local-ai-playground/frontend/core/state.js
export const state = {
  // Model
  currentModelId: null,
  modelIndex: null,      // JSON index of loaded IFC (for AI context)
  selectedEntityId: null,
  entities: new Map(),   // entityId -> { type, name, properties, psets }

  // AI
  agents: [],
  currentAgentId: null,
  endpoints: [],         // { id, name, url, apiKey, models[] }
  chats: [],
  currentChatId: null,
  messages: [],          // current chat messages

  // UI
  currentPanel: 'tree',  // which side panel view is active
  sidePanelOpen: true,
  aiSidebarOpen: true,
  theme: localStorage.getItem('bim-ai-theme') || 'dark',
  lang: localStorage.getItem('bim-ai-lang') || 'cs',
};
```

- [ ] **Step 3: Verify modules import correctly**

Create a temporary `<script type="module">` in index.html that imports both modules and logs to console.

- [ ] **Step 4: Commit**

```bash
git add assets/js/core/utils.js assets/js/core/state.js
git commit -m "feat: add core utilities and shared state module"
```

---

### Task 3: i18n System

**Files:**
- Create: `assets/js/core/translations.js`
- Create: `assets/js/core/i18n.js`

- [ ] **Step 1: Create `assets/js/core/translations.js`**

```javascript
// Pattern from: ~/work/BIM_checker/assets/js/i18n.js
// and ~/work/local-ai-playground/frontend/core/i18n.js
export const translations = {
  cs: {
    'app.title': 'BIM AI Viewer',
    'app.version': 'Alpha 0.1',
    'nav.tree': 'Strom modelu',
    'nav.properties': 'Vlastnosti',
    'nav.validation': 'Validace',
    'nav.search': 'Hledání objektů',
    'nav.agents': 'AI Agenti',
    'nav.standards': 'Normy & IDS',
    'nav.settings': 'Nastavení',
    'nav.help': 'Nápověda',
    'btn.loadIfc': 'Načíst IFC',
    'btn.export': 'Export',
    'btn.send': 'Odeslat',
    'viewer.select': 'Výběr',
    'viewer.orbit': 'Orbita',
    'viewer.measure': 'Měření',
    'viewer.clip': 'Řez',
    'viewer.fitAll': 'Přizpůsobit vše',
    'viewer.ortho': 'Ortho pohled',
    'ai.agent': 'AI Agent',
    'ai.placeholder': 'Zeptej se agenta na model...',
    'ai.thinking': 'Přemýšlím...',
    'ai.connected': 'připojen',
    'ai.disconnected': 'odpojen',
    'ai.quickStats': 'Statistika',
    'ai.quickFireRating': 'Fire rating',
    'ai.quickExport': 'Export',
    'ai.quickSearch': 'Najdi objekty',
    'ai.quickIdsValidation': 'IDS validace',
    'tree.search': 'Hledat v modelu...',
    'tree.title': 'Strom modelu',
    'props.title': 'Vybraný objekt',
    'props.missing': '⚠ chybí',
    'model.loaded': 'Model načten',
    'model.objects': 'objektů',
    'model.selected': 'Vybrán',
    'model.noFile': 'Žádný soubor nenačten',
    'drop.title': 'Přetáhněte IFC soubor sem',
    'drop.subtitle': 'nebo klikněte pro výběr',
    'settings.endpoints': 'LLM Endpointy',
    'settings.addEndpoint': 'Přidat endpoint',
    'settings.url': 'URL adresa',
    'settings.apiKey': 'API klíč',
    'settings.model': 'Model',
    'settings.testConnection': 'Test spojení',
    'agents.create': 'Vytvořit agenta',
    'agents.name': 'Název',
    'agents.systemPrompt': 'System prompt',
    'agents.endpoint': 'Endpoint',
    'agents.template': 'Šablona',
    'toast.saved': 'Uloženo',
    'toast.error': 'Chyba',
    'toast.deleted': 'Smazáno',
    'modal.confirm': 'Potvrdit',
    'modal.cancel': 'Zrušit',
    'theme.toggle': 'Přepnout téma',
  },
  en: {
    'app.title': 'BIM AI Viewer',
    'app.version': 'Alpha 0.1',
    'nav.tree': 'Model Tree',
    'nav.properties': 'Properties',
    'nav.validation': 'Validation',
    'nav.search': 'Search Objects',
    'nav.agents': 'AI Agents',
    'nav.standards': 'Standards & IDS',
    'nav.settings': 'Settings',
    'nav.help': 'Help',
    'btn.loadIfc': 'Load IFC',
    'btn.export': 'Export',
    'btn.send': 'Send',
    'viewer.select': 'Select',
    'viewer.orbit': 'Orbit',
    'viewer.measure': 'Measure',
    'viewer.clip': 'Clip',
    'viewer.fitAll': 'Fit All',
    'viewer.ortho': 'Ortho View',
    'ai.agent': 'AI Agent',
    'ai.placeholder': 'Ask the agent about the model...',
    'ai.thinking': 'Thinking...',
    'ai.connected': 'connected',
    'ai.disconnected': 'disconnected',
    'ai.quickStats': 'Statistics',
    'ai.quickFireRating': 'Fire rating',
    'ai.quickExport': 'Export',
    'ai.quickSearch': 'Find objects',
    'ai.quickIdsValidation': 'IDS validation',
    'tree.search': 'Search in model...',
    'tree.title': 'Model Tree',
    'props.title': 'Selected Object',
    'props.missing': '⚠ missing',
    'model.loaded': 'Model loaded',
    'model.objects': 'objects',
    'model.selected': 'Selected',
    'model.noFile': 'No file loaded',
    'drop.title': 'Drop IFC file here',
    'drop.subtitle': 'or click to select',
    'settings.endpoints': 'LLM Endpoints',
    'settings.addEndpoint': 'Add endpoint',
    'settings.url': 'URL',
    'settings.apiKey': 'API key',
    'settings.model': 'Model',
    'settings.testConnection': 'Test connection',
    'agents.create': 'Create agent',
    'agents.name': 'Name',
    'agents.systemPrompt': 'System prompt',
    'agents.endpoint': 'Endpoint',
    'agents.template': 'Template',
    'toast.saved': 'Saved',
    'toast.error': 'Error',
    'toast.deleted': 'Deleted',
    'modal.confirm': 'Confirm',
    'modal.cancel': 'Cancel',
    'theme.toggle': 'Toggle theme',
  }
};
```

- [ ] **Step 2: Create `assets/js/core/i18n.js`**

```javascript
import { state } from './state.js';
import { translations } from './translations.js';

export function t(key, params) {
  let text = translations[state.lang]?.[key] || translations.cs[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });
  }
  return text;
}

export function setLanguage(lang) {
  state.lang = lang;
  localStorage.setItem('bim-ai-lang', lang);
  document.documentElement.setAttribute('lang', lang);
  updatePageTranslations();
}

export function updatePageTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.getAttribute('data-i18n-title'));
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add assets/js/core/translations.js assets/js/core/i18n.js
git commit -m "feat: add i18n system with Czech and English translations"
```

---

### Task 4: Theme Manager

**Files:**
- Create: `assets/js/ui/theme.js`

- [ ] **Step 1: Create `assets/js/ui/theme.js`**

```javascript
// Pattern from: ~/work/BIM_checker/assets/js/theme.js
import { state } from '../core/state.js';

const SUN_SVG = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
const MOON_SVG = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';

export function initTheme() {
  applyTheme(state.theme);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.addEventListener('click', toggleTheme);
}

export function toggleTheme() {
  const next = state.theme === 'dark' ? 'light' : 'dark';
  state.theme = next;
  localStorage.setItem('bim-ai-theme', next);
  applyTheme(next);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  if (btn) {
    const svg = btn.querySelector('svg');
    if (svg) svg.innerHTML = theme === 'dark' ? MOON_SVG : SUN_SVG;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add assets/js/ui/theme.js
git commit -m "feat: add theme toggle (dark/light) with localStorage persistence"
```

---

### Task 5: Toast Notifications & Modal System

**Files:**
- Create: `assets/js/ui/toast.js`
- Create: `assets/js/ui/modals.js`

- [ ] **Step 1: Create `assets/js/ui/toast.js`**

```javascript
// Pattern from: ~/work/BIM_checker/assets/js/error-handler.js
let toastTimer;

export function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span><button class="toast-close" onclick="this.parentElement.remove()">&times;</button>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

export function showError(msg) { showToast(msg, 'error', 5000); }
export function showSuccess(msg) { showToast(msg, 'success'); }
export function showWarning(msg) { showToast(msg, 'warning', 4000); }
```

- [ ] **Step 2: Create `assets/js/ui/modals.js`**

```javascript
export function showModal(title, bodyHtml, buttons = []) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" data-action="close">&times;</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-footer">
        ${buttons.map(b => `<button class="btn-modern ${b.class || ''}" data-action="${b.action}">${b.label}</button>`).join('')}
      </div>
    </div>`;

  return new Promise(resolve => {
    overlay.addEventListener('click', e => {
      const action = e.target.dataset?.action;
      if (action === 'close' || e.target === overlay) { overlay.remove(); resolve(null); }
      else if (action) { overlay.remove(); resolve(action); }
    });
    document.body.appendChild(overlay);
  });
}

export function showConfirm(message) {
  // Import t() dynamically to avoid circular deps
  return import('../core/i18n.js').then(({ t }) =>
    showModal('', `<p>${message}</p>`, [
      { label: t('modal.cancel'), action: 'cancel', class: '' },
      { label: t('modal.confirm'), action: 'confirm', class: 'primary' },
    ]).then(action => action === 'confirm')
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add assets/js/ui/toast.js assets/js/ui/modals.js
git commit -m "feat: add toast notifications and modal dialog system"
```

---

### Task 6: Navigation & Panel Management

**Files:**
- Create: `assets/js/ui/navigation.js`
- Create: `assets/js/ui/panels.js`

- [ ] **Step 1: Create `assets/js/ui/navigation.js`**

Icon sidebar click handling — switches active icon and tells panels what to show.

```javascript
import { state } from '../core/state.js';

const PANEL_MAP = {
  'nav-tree': 'tree',
  'nav-properties': 'properties',
  'nav-validation': 'validation',
  'nav-search': 'search',
  'nav-agents': 'agents',
  'nav-standards': 'standards',
  'nav-settings': 'settings',
};

export function initNavigation() {
  document.querySelectorAll('.icon-sidebar .nav-icon[data-nav]').forEach(icon => {
    icon.addEventListener('click', () => {
      const panel = icon.dataset.nav;
      setActiveNav(panel);
    });
  });
}

export function setActiveNav(panelId) {
  state.currentPanel = panelId;
  document.querySelectorAll('.icon-sidebar .nav-icon[data-nav]').forEach(i => i.classList.remove('active'));
  const active = document.querySelector(`.nav-icon[data-nav="${panelId}"]`);
  if (active) active.classList.add('active');

  // Show/hide side panel content views
  document.querySelectorAll('.panel-view').forEach(v => v.classList.add('hidden'));
  const view = document.getElementById(`panel-${panelId}`);
  if (view) view.classList.remove('hidden');

  // Open side panel if collapsed
  import('./panels.js').then(m => m.openSidePanel());
}
```

- [ ] **Step 2: Create `assets/js/ui/panels.js`**

Slide-in/out logic for side panel and AI sidebar. Ported from the approved mockup's JS.

```javascript
import { state } from '../core/state.js';

let sidePanel, aiSidebar, expandTree, expandAI, backdrop;

export function initPanels() {
  sidePanel = document.getElementById('sidePanel');
  aiSidebar = document.getElementById('aiSidebar');
  expandTree = document.getElementById('expandTree');
  expandAI = document.getElementById('expandAI');
  backdrop = document.getElementById('panelBackdrop');

  expandTree?.addEventListener('click', toggleSidePanel);
  expandAI?.addEventListener('click', toggleAISidebar);
  backdrop?.addEventListener('click', closeAllPanels);

  document.querySelectorAll('.panel-close').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.closest('#sidePanel')) toggleSidePanel();
      if (btn.closest('#aiSidebar')) toggleAISidebar();
    });
  });
}

export function toggleSidePanel() {
  state.sidePanelOpen = !state.sidePanelOpen;
  sidePanel?.classList.toggle('collapsed', !state.sidePanelOpen);
  expandTree?.classList.toggle('visible', !state.sidePanelOpen);
  updateBackdrop();
}

export function openSidePanel() {
  if (!state.sidePanelOpen) toggleSidePanel();
}

export function toggleAISidebar() {
  state.aiSidebarOpen = !state.aiSidebarOpen;
  aiSidebar?.classList.toggle('collapsed', !state.aiSidebarOpen);
  expandAI?.classList.toggle('visible', !state.aiSidebarOpen);
  updateBackdrop();
}

function updateBackdrop() {
  if (window.innerWidth <= 768) {
    const anyOpen = state.sidePanelOpen || state.aiSidebarOpen;
    backdrop?.classList.toggle('show', anyOpen);
  }
}

function closeAllPanels() {
  if (state.sidePanelOpen) toggleSidePanel();
  if (state.aiSidebarOpen) toggleAISidebar();
}
```

- [ ] **Step 3: Commit**

```bash
git add assets/js/ui/navigation.js assets/js/ui/panels.js
git commit -m "feat: add icon sidebar navigation and panel slide-in/out"
```

---

### Task 7: Main HTML Shell

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create `index.html`**

Full HTML structure matching the approved mockup. All text uses `data-i18n` attributes. Inline SVG icons (feather style from BIM_checker). Import map for @thatopen/components, Three.js, web-ifc.

The HTML must include:
1. `<link>` to `variables.css` and `app.css`
2. `<script type="importmap">` with CDN paths for three, @thatopen/components, @thatopen/fragments, web-ifc
3. Navbar with brand, file info, buttons, language switcher, theme toggle
4. Icon sidebar with `data-nav` attributes on each nav-icon
5. Side panel (`#sidePanel`) with panel-views for tree, properties, validation, search, agents, standards, settings
6. 3D viewer area (`#viewerContainer`) with toolbar, view tools, axes gizmo, info bar
7. AI sidebar (`#aiSidebar`) with agent select, status, messages, quick actions, input
8. Expand tabs, mobile toggles, backdrop
9. Drop zone overlay (hidden until drag)
10. Toast container
11. `<script type="module" src="assets/js/core/app.js">`

- [ ] **Step 2: Verify in browser**

Open `http://localhost:8080`, verify:
- Dark theme loads by default
- Layout matches approved mockup
- All SVG icons render
- Theme toggle switches light/dark
- Language switcher button is visible
- Side panels slide in/out when close buttons clicked
- Expand tabs appear when panels are collapsed
- Responsive: resize to 768px → panels become overlay

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add main HTML shell with full layout structure"
```

---

### Task 8: App Bootstrap

**Files:**
- Create: `assets/js/core/app.js`

- [ ] **Step 1: Create `assets/js/core/app.js`**

Main entry point — imports and initializes all modules:

```javascript
import { state } from './state.js';
import { t, setLanguage, updatePageTranslations } from './i18n.js';
import { initTheme } from '../ui/theme.js';
import { initNavigation } from '../ui/navigation.js';
import { initPanels } from '../ui/panels.js';
import { showToast } from '../ui/toast.js';

async function init() {
  // Apply theme
  initTheme();

  // i18n
  updatePageTranslations();

  // Language switcher
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setLanguage(btn.dataset.lang);
    });
  });

  // Navigation & panels
  initNavigation();
  initPanels();

  console.log('BIM AI Viewer initialized');
}

// Export functions that HTML onclick handlers need
Object.assign(window, { t, showToast });

init().catch(err => console.error('Init failed:', err));
```

- [ ] **Step 2: Verify full app loads without errors**

Open browser → console should show "BIM AI Viewer initialized", no errors. All UI interactions from Task 7 verification should work.

- [ ] **Step 3: Commit**

```bash
git add assets/js/core/app.js
git commit -m "feat: add app bootstrap — theme, i18n, navigation, panels"
```

---

## Chunk 2: 3D Viewer Integration

**IMPORTANT:** Before implementing Tasks 9-11, run the CDN spike test (Task 9 Step 1) to validate that esm.sh imports work with @thatopen/components in a plain HTML file. If CDN fails, fall back to downloading the packages and serving from `assets/vendor/`.

### Task 9: Basic 3D Scene

**Files:**
- Create: `assets/js/viewer/viewer-init.js`

- [ ] **Step 1: CDN spike test — create a minimal HTML page that imports @thatopen/components via esm.sh and renders a cube.**

Create `test-spike.html` (temporary, do not commit):
```html
<!DOCTYPE html>
<html>
<head>
  <script type="importmap">
  { "imports": {
    "three": "https://esm.sh/three@0.168.0",
    "@thatopen/components": "https://esm.sh/@thatopen/components@3.3.2",
    "@thatopen/components-front": "https://esm.sh/@thatopen/components-front@3.3.2",
    "@thatopen/fragments": "https://esm.sh/@thatopen/fragments@3.3.2"
  }}
  </script>
</head>
<body>
  <div id="c" style="width:100vw;height:100vh;"></div>
  <script type="module">
    import * as THREE from 'three';
    import * as OBC from '@thatopen/components';
    const c = new OBC.Components();
    const worlds = c.get(OBC.Worlds);
    const w = worlds.create();
    w.scene = new OBC.SimpleScene(c);
    w.renderer = new OBC.SimpleRenderer(c, document.getElementById('c'));
    w.camera = new OBC.SimpleCamera(c);
    w.scene.setup();
    c.init();
    console.log('Spike OK');
  </script>
</body>
</html>
```

Open in browser. If console logs "Spike OK" and a scene renders, CDN works. If not, troubleshoot esm.sh or switch to unpkg/jsdelivr.

- [ ] **Step 2: Create `assets/js/viewer/viewer-init.js`**

Initialize @thatopen/components with Three.js scene, camera, renderer in the `#viewerContainer` div. Note: FragmentsManager requires `init(workerUrl)` before use.

```javascript
import * as THREE from 'three';
import * as OBC from '@thatopen/components';

let components, world, fragments, ifcLoader;

export async function initViewer() {
  const container = document.getElementById('viewerContainer');
  if (!container) throw new Error('Viewer container not found');

  components = new OBC.Components();
  const worlds = components.get(OBC.Worlds);

  world = worlds.create();
  world.scene = new OBC.SimpleScene(components);
  world.renderer = new OBC.SimpleRenderer(components, container);
  world.camera = new OBC.SimpleCamera(components);
  world.scene.setup();

  // Dark background matching our theme
  world.scene.three.background = new THREE.Color(0x0f172a);

  components.init();

  // Setup IFC loader with explicit WASM path
  ifcLoader = components.get(OBC.IfcLoader);
  await ifcLoader.setup({
    autoSetWasm: false,
    wasm: {
      path: 'https://unpkg.com/web-ifc@0.0.74/',
      absolute: true,
    },
  });

  // Setup fragments — MUST call init() with worker URL
  fragments = components.get(OBC.FragmentsManager);
  const workerUrl = 'https://thatopen.github.io/engine_fragment/resources/worker.mjs';
  fragments.init(workerUrl);

  // Handle loaded models — add to scene
  fragments.onFragmentsLoaded.add((model) => {
    world.scene.three.add(model);
  });

  // FPS counter
  startFpsCounter();

  return { components, world, fragments, ifcLoader };
}

export function getWorld() { return world; }
export function getComponents() { return components; }
export function getFragments() { return fragments; }
export function getIfcLoader() { return ifcLoader; }

function startFpsCounter() {
  let frameCount = 0, lastTime = performance.now();
  const fpsEl = document.getElementById('infoFps');
  (function tick() {
    frameCount++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
      if (fpsEl) fpsEl.textContent = `FPS: ${frameCount}`;
      frameCount = 0;
      lastTime = now;
    }
    requestAnimationFrame(tick);
  })();
}
```

- [ ] **Step 2: Import and call `initViewer()` from `app.js`**

Add to app.js init function:
```javascript
import { initViewer } from '../viewer/viewer-init.js';
// Inside init():
await initViewer();
```

- [ ] **Step 3: Verify in browser**

Open app → 3D viewer area should show a dark scene with default lighting. No IFC loaded yet, but Three.js canvas should be visible and respond to mouse drag (orbit).

- [ ] **Step 4: Commit**

```bash
git add assets/js/viewer/viewer-init.js assets/js/core/app.js
git commit -m "feat: initialize @thatopen/components 3D viewer with Three.js scene"
```

---

### Task 10: IFC File Loading

**Files:**
- Create: `assets/js/ifc/ifc-loader.js`

- [ ] **Step 1: Create `assets/js/ifc/ifc-loader.js`**

Handles file drop, file input, and loading IFC into the viewer.

```javascript
import { getComponents, getFragments } from '../viewer/viewer-init.js';
import { state } from '../core/state.js';
import { t } from '../core/i18n.js';
import { showToast, showError } from '../ui/toast.js';
import { formatFileSize } from '../core/utils.js';
import * as OBC from '@thatopen/components';

export function initIfcLoader() {
  const dropOverlay = document.getElementById('dropOverlay');
  const viewerArea = document.querySelector('.viewer-area');
  const fileInput = document.getElementById('ifcFileInput');
  const loadBtn = document.getElementById('btnLoadIfc');

  // Drag & drop
  let dragCounter = 0;
  viewerArea?.addEventListener('dragenter', e => {
    e.preventDefault(); dragCounter++;
    dropOverlay?.classList.add('visible');
  });
  viewerArea?.addEventListener('dragleave', e => {
    e.preventDefault(); dragCounter--;
    if (dragCounter <= 0) { dragCounter = 0; dropOverlay?.classList.remove('visible'); }
  });
  viewerArea?.addEventListener('dragover', e => e.preventDefault());
  viewerArea?.addEventListener('drop', async e => {
    e.preventDefault(); dragCounter = 0;
    dropOverlay?.classList.remove('visible');
    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith('.ifc')) await loadIfcFile(file);
    else showError('Only .ifc files are supported');
  });

  // File input
  loadBtn?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (file) await loadIfcFile(file);
    fileInput.value = '';
  });
}

export async function loadIfcFile(file) {
  const infoFile = document.getElementById('navbarFileInfo');
  showToast(`Loading ${file.name}...`, 'info');

  try {
    const data = await file.arrayBuffer();
    const buffer = new Uint8Array(data);

    const components = getComponents();
    const ifcLoader = components.get(OBC.IfcLoader);
    const modelId = file.name.replace('.ifc', '');

    await ifcLoader.load(buffer, false, modelId);

    // Update navbar file info
    if (infoFile) {
      infoFile.textContent = `${file.name} — ${formatFileSize(file.size)}`;
      infoFile.style.display = '';
    }

    state.currentModelId = modelId;
    showToast(`${file.name} loaded`, 'success');
  } catch (err) {
    console.error('IFC load error:', err);
    showError(`Failed to load ${file.name}: ${err.message}`);
  }
}
```

- [ ] **Step 2: Import and init from `app.js`**

Add `import { initIfcLoader } from '../ifc/ifc-loader.js';` and call `initIfcLoader()` in init.

- [ ] **Step 3: Verify in browser**

Drag an IFC file onto the viewer area → model should appear in 3D. Navbar shows filename and size.

- [ ] **Step 4: Commit**

```bash
git add assets/js/ifc/ifc-loader.js assets/js/core/app.js
git commit -m "feat: add IFC file loading via drag-drop and file picker"
```

---

### Task 11: Object Selection & Highlighting

**Files:**
- Create: `assets/js/viewer/viewer-selection.js`

**IMPORTANT:** Highlighting requires `@thatopen/components-front` package (Highlighter is NOT in core). Properties require `IfcPropertiesManager` or direct web-ifc access. The raycaster returns Three.js Intersection — use Highlighter API to get fragment/entity mapping.

- [ ] **Step 1: Create `assets/js/viewer/viewer-selection.js`**

```javascript
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBCF from '@thatopen/components-front';
import { getComponents, getWorld, getFragments } from './viewer-init.js';
import { state } from '../core/state.js';
import { t } from '../core/i18n.js';

let highlighter, raycasters;
const selectionListeners = [];

export function onEntitySelected(callback) {
  selectionListeners.push(callback);
}

export async function initSelection() {
  const components = getComponents();
  const world = getWorld();
  const container = document.getElementById('viewerContainer');

  // Setup Highlighter from @thatopen/components-front
  highlighter = components.get(OBCF.Highlighter);
  highlighter.setup({ world });

  // Add custom highlight styles
  highlighter.add('select', new THREE.MeshStandardMaterial({
    color: 0x667eea, emissive: 0x334477, opacity: 0.5, transparent: true,
  }));
  highlighter.add('hover', new THREE.MeshStandardMaterial({
    color: 0x818cf8, opacity: 0.3, transparent: true,
  }));
  highlighter.add('error', new THREE.MeshStandardMaterial({
    color: 0xef4444, emissive: 0x441111, opacity: 0.4, transparent: true,
  }));
  highlighter.add('warning', new THREE.MeshStandardMaterial({
    color: 0xf59e0b, emissive: 0x443311, opacity: 0.4, transparent: true,
  }));
  highlighter.add('success', new THREE.MeshStandardMaterial({
    color: 0x10b981, emissive: 0x114433, opacity: 0.4, transparent: true,
  }));

  // Listen for selection events from Highlighter
  highlighter.events.select.onHighlight.add((fragmentIdMap) => {
    // fragmentIdMap = Map<fragmentId, Set<expressID>>
    // Extract the first selected expressID
    for (const [fragId, ids] of fragmentIdMap) {
      const expressId = [...ids][0];
      state.selectedEntityId = expressId;

      // Get properties via IfcPropertiesManager or model
      // (exact API depends on how model stores data — will be refined in Task 13)
      const properties = null; // placeholder — Task 13 fills this

      selectionListeners.forEach(fn => fn({ expressId, properties }));

      // Update info bar
      const infoSelected = document.getElementById('infoSelected');
      if (infoSelected) {
        infoSelected.textContent = `${t('model.selected')}: #${expressId}`;
      }
      break; // first selected only
    }
  });

  highlighter.events.select.onClear.add(() => {
    state.selectedEntityId = null;
    const infoSelected = document.getElementById('infoSelected');
    if (infoSelected) infoSelected.textContent = '';
  });
}

export async function highlightEntities(expressIds, styleName = 'error') {
  if (!highlighter || !state.currentModelId) return;
  const fragments = getFragments();

  // Build fragmentIdMap from expressIDs
  // This requires knowing which fragment each expressID belongs to
  // FragmentsManager provides this mapping
  const fragmentIdMap = new Map();
  for (const model of fragments.list.values()) {
    for (const expressId of expressIds) {
      const fragId = model.getFragmentIdFromExpressId?.(expressId);
      if (fragId) {
        if (!fragmentIdMap.has(fragId)) fragmentIdMap.set(fragId, new Set());
        fragmentIdMap.get(fragId).add(expressId);
      }
    }
  }

  if (fragmentIdMap.size > 0) {
    await highlighter.highlightByID(styleName, fragmentIdMap);
  }
}

export function clearHighlights() {
  if (highlighter) {
    highlighter.clear('select');
    highlighter.clear('error');
    highlighter.clear('warning');
    highlighter.clear('success');
  }
}
```

**Note:** The exact `getFragmentIdFromExpressId` API may differ. Task 13 (IFC Index) will finalize the mapping between expressIDs and fragments. The `highlightEntities()` function may need adjustment after Task 13.

- [ ] **Step 2: Wire up in `app.js`**

Import `initSelection` and `onEntitySelected`. On selection, update properties panel.

- [ ] **Step 3: Verify in browser**

Load IFC, double-click on object → should highlight and show entity name in info bar.

- [ ] **Step 4: Commit**

```bash
git add assets/js/viewer/viewer-selection.js assets/js/core/app.js
git commit -m "feat: add object selection via raycasting and highlighting"
```

---

### Task 12: Viewer Toolbar

**Files:**
- Create: `assets/js/viewer/viewer-tools.js`

- [ ] **Step 1: Create `assets/js/viewer/viewer-tools.js`**

Toolbar button handlers for orbit, select, measure, clip, fit-to-view, zoom +/−.

```javascript
import { getWorld, getComponents } from './viewer-init.js';

export function initViewerTools() {
  // Toolbar mode switching
  document.querySelectorAll('.vt-item[data-tool]').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.vt-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      // Tool mode switching will be expanded later
    });
  });

  // Zoom buttons
  document.getElementById('btnZoomIn')?.addEventListener('click', () => zoom(0.8));
  document.getElementById('btnZoomOut')?.addEventListener('click', () => zoom(1.2));
  document.getElementById('btnFitAll')?.addEventListener('click', fitAll);
}

function zoom(factor) {
  const world = getWorld();
  if (world?.camera?.controls) {
    world.camera.controls.dolly(-factor, true);
  }
}

async function fitAll() {
  const world = getWorld();
  if (!world?.camera?.controls || !world?.scene?.three) return;
  // Compute bounding box of all scene children
  const box = new (await import('three')).Box3();
  world.scene.three.traverse(child => {
    if (child.isMesh) box.expandByObject(child);
  });
  if (!box.isEmpty()) {
    const sphere = box.getBoundingSphere(new (await import('three')).Sphere());
    world.camera.controls.fitToSphere(sphere, true);
  }
}
```

- [ ] **Step 2: Wire up in `app.js`**

- [ ] **Step 3: Verify toolbar buttons respond to clicks (active state toggle, zoom works)**

- [ ] **Step 4: Commit**

```bash
git add assets/js/viewer/viewer-tools.js assets/js/core/app.js
git commit -m "feat: add viewer toolbar (select, orbit, zoom, fit-all)"
```

---

## Chunk 3: Model Tree & Properties

### Task 13: IFC Index Builder

**Files:**
- Create: `assets/js/ifc/ifc-index.js`

- [ ] **Step 1: Create `assets/js/ifc/ifc-index.js`**

After IFC is loaded via @thatopen/components, traverse the model to build a compact JSON index for AI context and model tree display.

```javascript
import { getFragments } from '../viewer/viewer-init.js';
import { state } from '../core/state.js';

export async function buildModelIndex(modelId) {
  const fragments = getFragments();
  const model = fragments?.list.get(modelId);
  if (!model) return null;

  const index = {
    modelId,
    entityTypes: {},      // { 'IfcWall': { count: 42, ids: [...] } }
    hierarchy: [],        // spatial structure tree
    propertySets: {},     // { 'Pset_WallCommon': ['FireRating', 'LoadBearing', ...] }
    materials: [],
    totalEntities: 0,
  };

  // Iterate all properties to classify entities
  // This depends on @thatopen/components API — adjust based on actual model data structure
  // The model exposes properties via model.getProperties(id)

  state.modelIndex = index;
  return index;
}

export function getModelSummaryForAI() {
  const idx = state.modelIndex;
  if (!idx) return 'No model loaded.';

  let summary = `IFC Model loaded: ${idx.totalEntities} entities.\n\nEntity types:\n`;
  for (const [type, data] of Object.entries(idx.entityTypes)) {
    summary += `- ${type}: ${data.count}\n`;
  }
  if (Object.keys(idx.propertySets).length) {
    summary += `\nPropertySets:\n`;
    for (const [pset, props] of Object.entries(idx.propertySets)) {
      summary += `- ${pset}: ${props.join(', ')}\n`;
    }
  }
  return summary;
}
```

- [ ] **Step 2: Call `buildModelIndex()` after IFC load in `ifc-loader.js`**

- [ ] **Step 3: Verify**: After loading IFC, check `state.modelIndex` in console — should contain entity types and counts.

- [ ] **Step 4: Commit**

```bash
git add assets/js/ifc/ifc-index.js assets/js/ifc/ifc-loader.js
git commit -m "feat: build model JSON index from loaded IFC for AI context"
```

---

### Task 14: Model Tree UI

**Files:**
- Create: `assets/js/ifc/tree-builder.js`
- Create: `assets/js/ui/tree-ui.js`

- [ ] **Step 1: Create `assets/js/ifc/tree-builder.js`**

Build hierarchical tree data from model index (Project → Building → Storey → EntityType → Entities).

- [ ] **Step 2: Create `assets/js/ui/tree-ui.js`**

Render tree into `#panel-tree` container. Features:
- Clickable items → highlight in 3D via `highlightEntities()`
- Expand/collapse with arrow toggle
- Count badges
- Search filter (debounced input)

- [ ] **Step 3: Wire up**: After IFC load → build tree → render in panel

- [ ] **Step 4: Verify in browser**: Load IFC → side panel shows hierarchical tree. Click item → highlights in 3D.

- [ ] **Step 5: Commit**

```bash
git add assets/js/ifc/tree-builder.js assets/js/ui/tree-ui.js
git commit -m "feat: add model tree with hierarchy, search, and 3D selection"
```

---

### Task 15: Properties Panel

**Files:**
- Create: `assets/js/ui/properties-ui.js`

- [ ] **Step 1: Create `assets/js/ui/properties-ui.js`**

When entity is selected (via `onEntitySelected`), render its properties in the properties section at the bottom of the side panel. Show:
- GlobalId, Name, Type
- Each PropertySet as a collapsible section
- Each property as key-value row
- Missing required values highlighted in red

- [ ] **Step 2: Wire to selection event in `app.js`**

- [ ] **Step 3: Verify**: Select object in 3D → properties appear in side panel bottom section.

- [ ] **Step 4: Commit**

```bash
git add assets/js/ui/properties-ui.js assets/js/core/app.js
git commit -m "feat: add properties panel showing selected entity attributes"
```

---

## Chunk 4: IndexedDB Storage

### Task 16: Storage Module

**Files:**
- Create: `assets/js/core/storage.js`

- [ ] **Step 1: Create `assets/js/core/storage.js`**

IndexedDB wrapper for persisting IFC files, agents, chats, endpoints, settings. Pattern from BIM_checker's storage.js — separate metadata from file content.

```javascript
const DB_NAME = 'bim-ai-viewer';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('agents')) db.createObjectStore('agents', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('chats')) db.createObjectStore('chats', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('endpoints')) db.createObjectStore('endpoints', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('fileContents')) db.createObjectStore('fileContents', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getStore(storeName, mode = 'readonly') {
  const db = await openDB();
  return db.transaction(storeName, mode).objectStore(storeName);
}

export async function getAll(storeName) {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getById(storeName, id) {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function put(storeName, item) {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function remove(storeName, id) {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Convenience wrappers
export const agents = {
  getAll: () => getAll('agents'),
  get: (id) => getById('agents', id),
  save: (agent) => put('agents', agent),
  delete: (id) => remove('agents', id),
};

export const endpoints = {
  getAll: () => getAll('endpoints'),
  get: (id) => getById('endpoints', id),
  save: (ep) => put('endpoints', ep),
  delete: (id) => remove('endpoints', id),
};

export const chats = {
  getAll: () => getAll('chats'),
  get: (id) => getById('chats', id),
  save: (chat) => put('chats', chat),
  delete: (id) => remove('chats', id),
};

export const settings = {
  get: async (key) => { const r = await getById('settings', key); return r?.value; },
  set: (key, value) => put('settings', { key, value }),
};
```

- [ ] **Step 2: Verify**: In browser console, `import('./assets/js/core/storage.js').then(s => s.settings.set('test', 'hello').then(() => s.settings.get('test')).then(console.log))` → logs "hello".

- [ ] **Step 3: Commit**

```bash
git add assets/js/core/storage.js
git commit -m "feat: add IndexedDB storage for agents, chats, endpoints, settings"
```

---

## Chunk 5: AI Client & Agents

### Task 17: AI Client (LLM HTTP Calls)

**Files:**
- Create: `assets/js/ai/ai-client.js`

- [ ] **Step 1: Create `assets/js/ai/ai-client.js`**

Direct browser fetch to OpenAI-compatible endpoints. Pattern from local-ai-playground's api.js adapted for browser-only use.

```javascript
export async function chatCompletion(endpoint, apiKey, model, messages, tools, options = {}) {
  const { temperature = 0.7, maxTokens, signal, onStream } = options;
  const url = `${endpoint.replace(/\/+$/, '')}/chat/completions`;

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const body = { model, messages, temperature };
  if (tools?.length) body.tools = tools;
  if (maxTokens) body.max_tokens = maxTokens;
  if (onStream) body.stream = true;

  const res = await fetch(url, {
    method: 'POST', headers, body: JSON.stringify(body), signal,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`LLM error (${res.status}): ${err}`);
  }

  if (onStream && body.stream) {
    return readStream(res, onStream);
  }

  return res.json();
}

async function readStream(response, onChunk) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
      try {
        const json = JSON.parse(line.slice(6));
        const delta = json.choices?.[0]?.delta?.content || '';
        if (delta) {
          fullContent += delta;
          onChunk(delta, fullContent);
        }
      } catch (e) { /* skip malformed SSE */ }
    }
  }

  return { choices: [{ message: { content: fullContent, role: 'assistant' } }] };
}

export async function fetchModels(endpoint, apiKey) {
  const url = `${endpoint.replace(/\/+$/, '')}/models`;
  const headers = {};
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Failed to fetch models (${res.status})`);
  const data = await res.json();
  return (data.data || data.models || []).map(m => m.id || m.name || m);
}
```

- [ ] **Step 2: Verify**: With Ollama running locally, open console and call `fetchModels('http://localhost:11434/v1')` → should return list of models.

- [ ] **Step 3: Commit**

```bash
git add assets/js/ai/ai-client.js
git commit -m "feat: add AI client for OpenAI-compatible endpoint calls with streaming"
```

---

### Task 18: Agent Manager

**Files:**
- Create: `assets/js/ai/agent-manager.js`

- [ ] **Step 1: Create `assets/js/ai/agent-manager.js`**

CRUD for agents with predefined templates. Persists to IndexedDB.

```javascript
import * as storage from '../core/storage.js';
import { state } from '../core/state.js';
import { generateId } from '../core/utils.js';

const TEMPLATES = {
  validator: {
    name: 'Validátor',
    systemPrompt: `Jsi BIM validační agent. Máš přístup k IFC modelu a můžeš:\n- Hledat entity podle typu a vlastností\n- Kontrolovat hodnoty PropertySetů\n- Zvýrazňovat problémové objekty ve 3D vieweru\n\nPři validaci vždy:\n1. Vypiš nalezené problémy s ID entit\n2. Zvýrazni je ve vieweru\n3. Navrhni opravu\n\nOdpovídej česky.`,
    temperature: 0.3,
  },
  searcher: {
    name: 'Hledač objektů',
    systemPrompt: `Jsi BIM vyhledávací agent. Pomáháš uživateli najít objekty v IFC modelu.\n- Můžeš filtrovat podle typu entity (IfcWall, IfcDoor, ...)\n- Můžeš filtrovat podle vlastností a PropertySetů\n- Nalezené objekty zvýrazníš ve 3D\n\nOdpovídej česky.`,
    temperature: 0.5,
  },
  analyst: {
    name: 'Analytik',
    systemPrompt: `Jsi BIM analytický agent. Vytvářej souhrny a statistiky modelu.\n- Počty entit podle typu\n- Analýza PropertySetů — které vlastnosti chybí\n- Materiálové souhrny\n\nOdpovídej česky, formátuj pomocí tabulek a seznamů.`,
    temperature: 0.7,
  },
  measurer: {
    name: 'Měřič',
    systemPrompt: `Jsi BIM měřicí agent. Pomáháš s rozměry a výpočty.\n- Zjišťuj rozměry objektů (šířka, výška, délka)\n- Počítej plochy a objemy\n- Porovnávej rozměry mezi objekty\n\nOdpovídej česky, uváděj jednotky.`,
    temperature: 0.3,
  },
};

export async function loadAgents() {
  state.agents = await storage.agents.getAll();
  return state.agents;
}

export async function createAgent(data) {
  const agent = {
    id: generateId('agent'),
    name: data.name,
    systemPrompt: data.systemPrompt || '',
    endpointId: data.endpointId || null,
    model: data.model || '',
    temperature: data.temperature ?? 0.7,
    createdAt: new Date().toISOString(),
  };
  await storage.agents.save(agent);
  state.agents.push(agent);
  return agent;
}

export async function createFromTemplate(templateKey, endpointId) {
  const tpl = TEMPLATES[templateKey];
  if (!tpl) throw new Error(`Unknown template: ${templateKey}`);
  return createAgent({ ...tpl, endpointId });
}

export async function updateAgent(id, updates) {
  const agent = state.agents.find(a => a.id === id);
  if (!agent) throw new Error('Agent not found');
  Object.assign(agent, updates);
  await storage.agents.save(agent);
  return agent;
}

export async function deleteAgent(id) {
  await storage.agents.delete(id);
  state.agents = state.agents.filter(a => a.id !== id);
}

export function getTemplates() { return TEMPLATES; }
```

- [ ] **Step 2: Commit**

```bash
git add assets/js/ai/agent-manager.js
git commit -m "feat: add agent manager with templates and IndexedDB persistence"
```

---

### Task 19: Tool Definitions

**Files:**
- Create: `assets/js/ai/tool-defs.js`

- [ ] **Step 1: Create `assets/js/ai/tool-defs.js`**

Define tools in OpenAI function-calling format that agents can use to interact with the IFC model.

```javascript
export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'search_entities',
      description: 'Search for IFC entities by type and optional property filters. Returns list of matching entities with their IDs and basic info.',
      parameters: {
        type: 'object',
        properties: {
          entityType: { type: 'string', description: 'IFC entity type, e.g. "IfcWall", "IfcDoor", "IfcWindow"' },
          propertyFilter: {
            type: 'object',
            description: 'Optional property filters. Key is "PsetName.PropertyName", value is expected value or null to find missing.',
            additionalProperties: { type: ['string', 'null'] }
          },
          limit: { type: 'number', description: 'Max results to return. Default 50.' },
        },
        required: ['entityType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_properties',
      description: 'Get all properties and PropertySets of a specific entity by its ID.',
      parameters: {
        type: 'object',
        properties: {
          entityId: { type: 'number', description: 'The numeric entity ID' },
        },
        required: ['entityId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'highlight_entities',
      description: 'Highlight specific entities in the 3D viewer with a given color.',
      parameters: {
        type: 'object',
        properties: {
          entityIds: { type: 'array', items: { type: 'number' }, description: 'Array of entity IDs to highlight' },
          color: { type: 'string', description: 'Highlight color: "red", "orange", "green", "blue". Default "red".' },
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
      description: 'Get summary statistics of the loaded IFC model: entity counts by type, PropertySet overview, material list.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'validate_property',
      description: 'Check if a specific entity has the expected value for a property in a PropertySet.',
      parameters: {
        type: 'object',
        properties: {
          entityId: { type: 'number', description: 'Entity ID to validate' },
          psetName: { type: 'string', description: 'PropertySet name, e.g. "Pset_WallCommon"' },
          propertyName: { type: 'string', description: 'Property name, e.g. "FireRating"' },
          expectedValue: { type: 'string', description: 'Expected value. If omitted, checks if property exists.' },
        },
        required: ['entityId', 'psetName', 'propertyName'],
      },
    },
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add assets/js/ai/tool-defs.js
git commit -m "feat: define AI tools for IFC model interaction (search, highlight, validate)"
```

---

### Task 20: Tool Executor

**Files:**
- Create: `assets/js/ai/tool-executor.js`

- [ ] **Step 1: Create `assets/js/ai/tool-executor.js`**

Execute tool calls from LLM responses and return results.

```javascript
import { state } from '../core/state.js';
import { highlightEntities, clearHighlights } from '../viewer/viewer-selection.js';
import { getModelSummaryForAI } from '../ifc/ifc-index.js';
import { getFragments } from '../viewer/viewer-init.js';

const COLOR_MAP = {
  red: 0xef4444, orange: 0xf59e0b, green: 0x10b981, blue: 0x3b82f6,
};

export async function executeTool(name, args) {
  switch (name) {
    case 'search_entities': return searchEntities(args);
    case 'get_properties': return getProperties(args);
    case 'highlight_entities': return doHighlight(args);
    case 'clear_highlights': clearHighlights(); return { status: 'ok', message: 'Highlights cleared' };
    case 'get_model_stats': return { summary: getModelSummaryForAI() };
    case 'validate_property': return validateProperty(args);
    default: return { error: `Unknown tool: ${name}` };
  }
}

function searchEntities({ entityType, propertyFilter, limit = 50 }) {
  const idx = state.modelIndex;
  if (!idx) return { error: 'No model loaded' };
  const typeData = idx.entityTypes[entityType];
  if (!typeData) return { results: [], count: 0, message: `No ${entityType} found in model` };
  // Return IDs (property filtering will be refined when we have full entity data)
  const ids = typeData.ids.slice(0, limit);
  return { results: ids.map(id => ({ id, type: entityType })), count: typeData.count };
}

async function getProperties({ entityId }) {
  const fragments = getFragments();
  const model = fragments?.list.get(state.currentModelId);
  if (!model) return { error: 'No model loaded' };
  try {
    const props = await model.getProperties(entityId);
    return { entityId, properties: props };
  } catch (e) {
    return { error: `Could not get properties for entity ${entityId}` };
  }
}

function doHighlight({ entityIds, color = 'red' }) {
  const colorHex = COLOR_MAP[color] || COLOR_MAP.red;
  highlightEntities(entityIds, colorHex);
  return { status: 'ok', message: `Highlighted ${entityIds.length} entities in ${color}` };
}

function validateProperty({ entityId, psetName, propertyName, expectedValue }) {
  // Will be refined with actual entity data access
  return {
    entityId, psetName, propertyName,
    status: 'checked',
    message: `Validation for ${psetName}.${propertyName} on entity ${entityId}`,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add assets/js/ai/tool-executor.js
git commit -m "feat: add tool executor for AI agent tool-calling"
```

---

## Chunk 6: Chat UI & AI Conversation Loop

### Task 21: Chat UI

**Files:**
- Create: `assets/js/ui/chat-ui.js`

- [ ] **Step 1: Create `assets/js/ui/chat-ui.js`**

Render chat messages, handle input, send to LLM with tool-calling loop. Pattern from local-ai-playground's message-send.js adapted for browser-only.

Key features:
- Render user/AI messages with markdown (via marked.js CDN)
- Entity IDs in responses become clickable (navigate to object in 3D)
- Tool-call loop: if LLM returns tool_calls, execute them, send results back, repeat (max 5 rounds)
- Streaming support (onStream callback updates message in real-time)
- Quick action buttons trigger predefined prompts
- Status tags (✅ ⚠ ❌) rendered as colored badges

This is the largest single module (~200 lines). Core flow:

```javascript
export async function sendMessage(text) {
  // 1. Add user message to UI + state
  // 2. Show "thinking" skeleton
  // 3. Build messages array (system prompt + model context + history + user msg)
  // 4. Call chatCompletion() with tools
  // 5. If response has tool_calls → execute each, add results, loop back to step 4
  // 6. Render final assistant message
  // 7. Save chat to IndexedDB
}
```

- [ ] **Step 2: Add marked.js and DOMPurify to import map or `<script>` tags in index.html**

```html
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dompurify/dist/purify.min.js"></script>
```

- [ ] **Step 3: Wire up chat UI**: Input submit on Enter, send button click, quick action buttons.

- [ ] **Step 4: Verify in browser**

With Ollama running: select an agent, type a message, verify response appears in chat. If model supports tools, verify tool-calls execute (e.g., "get model stats" should trigger `get_model_stats` tool).

- [ ] **Step 5: Commit**

```bash
git add assets/js/ui/chat-ui.js index.html
git commit -m "feat: add chat UI with tool-calling loop and markdown rendering"
```

---

### Task 22: Settings UI (Endpoints & Agents)

**Files:**
- Create: `assets/js/ui/settings-ui.js`

- [ ] **Step 1: Create `assets/js/ui/settings-ui.js`**

Panel views for:
- **Endpoints** (`#panel-settings`): List saved endpoints, add/edit form (URL, API key, test connection, load models)
- **Agents** (`#panel-agents`): List agents, create from template or custom, edit system prompt, select endpoint+model

Pattern from local-ai-playground's providers.js:
- Provider presets (Ollama, LM Studio, OpenAI, custom)
- Model dropdown auto-populated from endpoint
- Test connection button with status indicator

- [ ] **Step 2: Wire to navigation** — clicking settings/agents icons shows these panels

- [ ] **Step 3: Verify**: Add an Ollama endpoint → models load → create agent from "Validátor" template → agent appears in AI sidebar select.

- [ ] **Step 4: Commit**

```bash
git add assets/js/ui/settings-ui.js
git commit -m "feat: add settings UI for endpoints and agent management"
```

---

## Chunk 7: Integration & Polish

### Task 23: End-to-End Wiring

**Files:**
- Modify: `assets/js/core/app.js`

- [ ] **Step 1: Complete the init flow in `app.js`**

Full initialization sequence:
1. Theme → i18n → panels → navigation
2. Load endpoints & agents from IndexedDB
3. Init viewer → init IFC loader
4. Init selection → wire to properties panel
5. Init chat UI → populate agent dropdown
6. Init settings UI

- [ ] **Step 2: Wire cross-module events**

- Entity selection → properties panel update + AI context
- IFC load → build index → update tree → update info bar → notify chat of available model
- Agent switch in dropdown → update chat context
- Language switch → re-render all panels

- [ ] **Step 3: Verify full flow**

1. Open app → dark theme, empty state
2. Add Ollama endpoint in settings → models load
3. Create "Validátor" agent
4. Drop IFC file → 3D model appears, tree populates
5. Double-click object → properties show, highlighted
6. Ask agent "Kolik je v modelu zdí?" → agent uses `get_model_stats` tool → responds
7. Ask "Zvýrazni všechny IfcWall" → agent uses `search_entities` + `highlight_entities` → walls glow red
8. Toggle theme → everything switches to light mode
9. Switch language to EN → all UI text changes
10. Close side panels → expand tabs appear → click to reopen
11. Resize to 768px → mobile layout with overlay panels

- [ ] **Step 4: Commit**

```bash
git add assets/js/core/app.js
git commit -m "feat: wire all modules together for end-to-end functionality"
```

---

### Task 24: Drop Zone & Empty State

**Files:**
- Modify: `index.html` (if not already included)

- [ ] **Step 1: Add drop zone overlay**

When no IFC is loaded, the viewer area shows a centered drop zone with the BIM_checker upload pattern:
```html
<div id="dropZone" class="drop-zone">
  <svg><!-- upload icon --></svg>
  <p data-i18n="drop.title">Přetáhněte IFC soubor sem</p>
  <p data-i18n="drop.subtitle">nebo klikněte pro výběr</p>
  <span class="drop-format">.ifc</span>
</div>
```

Hide drop zone when model loads, show when no model.

- [ ] **Step 2: Verify**: Fresh app shows drop zone. After loading IFC, drop zone disappears. Drop another IFC → replaces model.

- [ ] **Step 3: Commit**

```bash
git add index.html assets/js/ifc/ifc-loader.js
git commit -m "feat: add drop zone and empty state for IFC loading"
```

---

### Task 25: Final Cleanup & PLAN.md Update

- [ ] **Step 1: Update PLAN.md** — mark Fáze 1-3 as completed, add notes

- [ ] **Step 2: Update CLAUDE.md** — refine file structure to match actual files created

- [ ] **Step 3: Verify no console errors, all features work**

- [ ] **Step 4: Commit**

```bash
git add PLAN.md CLAUDE.md
git commit -m "docs: update PLAN.md and CLAUDE.md with completed phase status"
```

---

## Future Tasks (Phase 4-5, separate plans)

These will be planned separately when Phase 1-3 is complete:

- **IDS XML Parser** — port from BIM_checker
- **Validation Engine** — port from BIM_checker, wire to AI tool-calling
- **Chat History** — persist conversations in IndexedDB, chat list panel
- **Performance** — Web Worker for IFC parsing, virtual tree scrolling
- **BIM_checker Integration** — add as page in BIM_checker project
- **PWA & Deployment** — service worker, Cloudflare Pages
