# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**BIM AI Viewer** — frontendová aplikace pro 3D zobrazení IFC modelů s integrovanými AI agenty. Agenti pracují s parsovanými IFC daty (hledání objektů, zvýrazňování, validace proti IDS specifikacím). Vše běží v prohlížeči — žádný backend server.

## Architecture

### Tech Stack
- **Frontend only** — vanilla JavaScript (ES6+ modules), HTML5, CSS3
- **3D engine** — @thatopen/components@3.3.2 + Three.js@0.175.0 + web-ifc@0.0.74 (WASM)
- **CDN** — esm.sh s pinovanými závislostmi (`?deps=`) pro konzistentní verze
- **AI** — přímé volání OpenAI-compatible API z browseru (Ollama, Google AI, OpenAI, OpenRouter)
- **Storage** — IndexedDB pro agenty, endpointy, konfiguraci (vše na straně klienta)
- **i18n** — čeština (primární) + angličtina

### Key Design Decisions
- **Žádný backend** — uživatelé používají své vlastní LLM endpointy nebo API klíče. API klíče jsou v IndexedDB prohlížeče, nikdy v souborech.
- **Kompatibilita s BIM_checker** — sdílí CSS proměnné, SVG ikony (feather style), UI vzory.
- **AI agenti s tool-calling** — agent dostane JSON index modelu + může volat funkce: `search_entities()`, `get_properties()`, `highlight_entities()`, `validate_property()`.
- **Předdefinovaní provideři** — Ollama, Google AI, OpenAI, OpenRouter, Custom. Auto-detekce Ollama při prvním spuštění.
- **@thatopen/components v3 API** — model se přidává do scény přes `fragments.list.onItemSet` event, ne přímým `scene.add()`.

### CDN & Verzování (DŮLEŽITÉ)
- esm.sh s `?deps=web-ifc@0.0.74,@thatopen/fragments@3.3.2,three@0.175.0` — piny zajišťují konzistenci
- WASM soubory z `unpkg.com/web-ifc@0.0.74/` — musí odpovídat verzi v deps
- Fragment worker z `thatopen.github.io/engine_fragment/resources/worker.mjs` — odpovídá fragments@3.3.2
- esm.sh přidává Node.js `process` polyfill → nutný `delete globalThis.process.versions.node` po importu

### UI Layout
- **Ikonový sidebar** (vlevo, 48px) — navigace mezi pohledy (strom, vlastnosti, validace, hledání, agenti, normy, nastavení)
- **Side panel** (vlevo, 280px, collapsible) — strom modelu, properties, agent management
- **3D Viewer** (střed) — Three.js/web-ifc render, toolbar, zoom, fit-all, axes gizmo, info bar
- **AI Chat sidebar** (vpravo, 380px, collapsible) — výběr agenta, konverzace, quick actions, input
- Oba krajní panely jsou **slide-in/out** s animací

### Related Projects (in ~/work/)
- **BIM_checker** — IFC/IDS validation tool, vanilla JS. Zdroj UI vzorů, validační logiky.
- **local-ai-playground** — FastAPI + vanilla JS AI playground. Zdroj provider patternu, agent architektury.

## File Structure

```
bim-ai-viewer/
├── index.html                    # Main SPA entry
├── assets/
│   ├── js/
│   │   ├── core/                 # App init, state, i18n, storage
│   │   │   ├── app.js            # Bootstrap — init all modules
│   │   │   ├── state.js          # Shared app state
│   │   │   ├── storage.js        # IndexedDB wrapper (agents, endpoints, settings)
│   │   │   ├── i18n.js           # Translation system
│   │   │   ├── translations.js   # CZ/EN translation strings
│   │   │   └── utils.js          # Helpers (escapeHtml, formatFileSize, generateId)
│   │   ├── viewer/               # 3D viewer
│   │   │   ├── viewer-init.js    # Components + Worlds + IfcLoader + FragmentsManager init
│   │   │   ├── viewer-selection.js # Raycasting, entity selection, highlighting
│   │   │   └── viewer-tools.js   # Toolbar (zoom, fit-all, mode switching)
│   │   ├── ifc/                  # IFC data
│   │   │   ├── ifc-loader.js     # Drag & drop + file picker → IfcLoader.load()
│   │   │   ├── ifc-index.js      # Build JSON index (types, counts, expressIDs)
│   │   │   └── tree-builder.js   # Model tree hierarchy
│   │   ├── ai/                   # AI system
│   │   │   ├── ai-client.js      # chatCompletion(), fetchModels(), testConnection()
│   │   │   ├── agent-manager.js  # CRUD, templates, IndexedDB persistence, auto-detect Ollama
│   │   │   ├── providers.js      # Provider presets (Ollama, Google, OpenAI, OpenRouter)
│   │   │   ├── tool-defs.js      # 6 tools in OpenAI function-calling format
│   │   │   └── tool-executor.js  # executeTool() dispatcher
│   │   └── ui/                   # UI components
│   │       ├── settings-ui.js    # Agent form (inline provider/model/temp), agent list
│   │       ├── chat-ui.js        # Chat conversation, streaming, tool-call visualization
│   │       ├── tree-ui.js        # Model tree render, search, expand/collapse
│   │       ├── properties-ui.js  # Selected entity properties
│   │       ├── panels.js         # Side panel slide-in/out
│   │       ├── navigation.js     # Icon sidebar navigation
│   │       ├── theme.js          # Dark/light theme toggle
│   │       ├── toast.js          # Toast notifications
│   │       └── modals.js         # Confirm/alert modals
│   ├── css/
│   │   ├── variables.css         # CSS custom properties
│   │   └── app.css               # All layout & component styles
├── CLAUDE.md
├── PLAN.md
└── .gitignore
```

## Conventions
- Vanilla JS, ES6 modules (`type="module"`)
- No npm build step — direct browser imports via esm.sh CDN
- CSS custom properties for theming (dark/light)
- SVG icons inline, feather icon style (24x24 viewBox, stroke-based)
- Czech as primary language in UI, English as secondary
- IndexedDB for all persistent storage (no localStorage for data)
- File naming: kebab-case for files, camelCase for JS variables/functions
- Functions called from HTML onclick must be exported via `Object.assign(window, {...})`
- Dev server: `python3 -m http.server 8088` (port 8080 obsazen Pi Files)

## Color System

```
Primary: #667eea / Dark: #5568d3 / Light: #818cf8
Success: #10b981 / Warning: #f59e0b / Error: #ef4444 / Info: #3b82f6

Dark theme:  bg #0f172a / #1e293b / #334155, text #f1f5f9 / #cbd5e1 / #94a3b8
Light theme: bg #ffffff / #f9fafb / #f3f4f6, text #111827 / #4b5563 / #6b7280
```
