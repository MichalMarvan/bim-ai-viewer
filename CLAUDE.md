# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**BIM AI Viewer** — frontendová aplikace pro 3D zobrazení IFC modelů s integrovanými AI agenty. Agenti pracují s parsovanými IFC daty (hledání objektů, zvýrazňování, validace proti IDS specifikacím). Vše běží v prohlížeči — žádný backend server.

## Architecture

### Tech Stack
- **Frontend only** — vanilla JavaScript (ES6+ modules), HTML5, CSS3
- **3D engine** — @thatopen/components (That Open Company, MIT licence) nad Three.js + web-ifc (WASM IFC parser, MPL-2.0)
- **AI** — přímé volání OpenAI-compatible API z browseru (Ollama, LM Studio, cloud s vlastním API klíčem uživatele)
- **Storage** — IndexedDB pro IFC soubory, agenty, konfiguraci (vše na straně klienta)
- **Deployment** — Cloudflare Pages (statický hosting), případná integrace do BIM_checker projektu
- **i18n** — čeština (primární) + angličtina

### Key Design Decisions
- **Žádný backend** — uživatelé používají své vlastní LLM endpointy nebo API klíče. Žádná data neprocházejí naším serverem.
- **Kompatibilita s BIM_checker** — sdílí CSS proměnné, SVG ikony (feather style), UI vzory (navbar, modals, storage cards). Cíl: možnost integrace jako nová stránka do BIM_checker.
- **AI agenti s tool-calling** — agent dostane JSON index modelu (typy entit, počty, PropertySety) + může volat funkce: `search_entities()`, `get_properties()`, `highlight_entity()`, `validate_against_ids()`.
- **IFC parsování** — streaming parser pro velké soubory (chunked, Web Workers), filtruje geometrii, zachovává sémantické entity.

### UI Layout
- **Ikonový sidebar** (vlevo, 48px) — navigace mezi pohledy (strom, vlastnosti, validace, hledání, agenti, normy, nastavení)
- **Side panel** (vlevo, 280px, collapsible) — strom modelu, properties vybraného objektu
- **3D Viewer** (střed) — Three.js/web-ifc render, toolbar, zoom, řez, měření, axes gizmo, info bar
- **AI Chat sidebar** (vpravo, 380px, collapsible) — výběr agenta, konverzace, quick actions, input
- Oba krajní panely jsou **slide-in/out** s animací
- Responsive: tablet (<=1024px), mobile (<=768px) s overlay panely

### Related Projects (in ~/work/)
- **BIM_checker** — IFC/IDS validation tool, vanilla JS, Cloudflare Pages. Zdroj UI vzorů, IFC parseru, validační logiky.
- **local-ai-playground** — FastAPI + vanilla JS AI playground. Zdroj AI endpoint logiky, agent architektury, tool-calling patternu.

## Color System (BIM Checker)

```
Primary: #667eea / Dark: #5568d3 / Light: #818cf8
Success: #10b981 / Warning: #f59e0b / Error: #ef4444 / Info: #3b82f6

Dark theme:  bg #0f172a / #1e293b / #334155, text #f1f5f9 / #cbd5e1 / #94a3b8
Light theme: bg #ffffff / #f9fafb / #f3f4f6, text #111827 / #4b5563 / #6b7280
```

## File Structure (planned)

```
bim-ai-viewer/
├── index.html                    # Main SPA entry
├── assets/
│   ├── js/
│   │   ├── core/                 # App init, state, i18n, storage
│   │   ├── viewer/               # 3D viewer (Three.js + web-ifc integration)
│   │   ├── ifc/                  # IFC parsing, entity index, tree builder
│   │   ├── ai/                   # AI client, agent manager, tool executor
│   │   ├── ui/                   # Panels, modals, theme, navigation
│   │   └── workers/              # Web Workers for parsing/validation
│   ├── css/
│   │   ├── common.css            # Shared variables & base (from BIM_checker)
│   │   └── app.css               # App-specific styles
│   └── vendor/                   # Third-party (web-ifc WASM, etc.)
├── CLAUDE.md
├── PLAN.md
└── .gitignore
```

## Conventions
- Vanilla JS, ES6 modules (`type="module"`)
- No npm build step — direct browser imports (CDN for Three.js, local WASM for web-ifc)
- CSS custom properties for theming (dark/light)
- SVG icons inline, feather icon style (24x24 viewBox, stroke-based)
- Czech as primary language in UI, English as secondary
- IndexedDB for all persistent storage (no localStorage for data)
- File naming: kebab-case for files, camelCase for JS variables/functions
- Functions called from HTML onclick must be exported via `Object.assign(window, {...})`
