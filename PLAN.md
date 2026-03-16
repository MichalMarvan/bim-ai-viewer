# PLAN.md — BIM AI Viewer

## Vize projektu

Frontendová aplikace pro 3D zobrazení IFC modelů s AI agenty, kteří pracují s BIM daty. Uživatel načte IFC soubor, vidí ho ve 3D, a přes AI chat může hledat objekty, zvýrazňovat je, validovat proti IDS specifikacím atd. Vše běží v prohlížeči — AI volání jdou přímo na uživatelův lokální LLM (Ollama, LM Studio) nebo cloud API s jeho klíčem.

Projekt je navržen pro pozdější integraci do BIM_checker jako nová stránka/nástroj.

---

## Fáze 1: Základní kostra a 3D viewer
**Stav: 🔄 Rozpracováno**

### 1.1 Projekt setup ✅ HOTOVO (2026-03-16)
- [x] Git repo, .gitignore, CLAUDE.md, PLAN.md
- [x] Adresářová struktura (assets/js/core, viewer, ifc, ai, ui, workers, css)
- [x] CSS základ — variables.css (barvy z BIM_checker) + app.css (layout z mockupu)
- [x] index.html s kompletním layoutem (navbar, icon sidebar, side panel, viewer area, AI sidebar)
- [x] Core moduly: utils.js, state.js, i18n.js, translations.js
- [x] UI moduly: theme.js, toast.js, modals.js, navigation.js, panels.js
- [x] app.js bootstrap — vše propojeno

**Poznámky:**
- CSS proměnné v `variables.css` (ne common.css) — jiný název než v CLAUDE.md, aktualizovat
- Port 8080 obsazen Pi Files — používáme 8090 pro dev server
- Screenshot ověřen — layout odpovídá mockupu

### 1.2 Integrace @thatopen/components + Three.js 🔄
- [x] Loading strategie: esm.sh CDN s dynamickými importy (fallback pokud CDN selže)
- [x] viewer-init.js — inicializace Components, Worlds, SimpleScene/Camera/Renderer
- [x] ifc-loader.js — drag & drop + file picker, načtení přes IfcLoader
- [x] viewer-selection.js — raycasting (double-click), zvýraznění materiálem
- [x] viewer-tools.js — toolbar přepínání (select/orbit/measure/clip), zoom, fit-all
- [x] FPS counter, info bar, axes gizmo (CSS-only)
- [ ] **TODO: Otestovat s reálným IFC souborem** — CDN import @thatopen zatím neověřen na RPi

**Poznámky:**
- Použit dynamický import() místo import map — robustnější pro CDN
- Highlighting zatím přes přímou manipulaci materiálu (ne Highlighter z components-front)
- expressID přístup závisí na geometry attributes — bude potřeba doladit po runtime testu

### 1.3 UI kostra ✅ HOTOVO (2026-03-16)
- [x] Icon sidebar s navigací (7 ikon + tooltips)
- [x] Side panel — slide-in/out s cubic-bezier animací + expand tab
- [x] AI sidebar — slide-in/out + expand tab
- [x] Navbar — brand, file info, Načíst IFC/Export, průvodce, nápověda, CZ/EN, theme toggle
- [x] Responsive (tablet <=1024px, mobil <=768px s overlay panely)
- [x] Drop zone + drag overlay
- [x] Light/dark theme toggle (funkční, localStorage)

---

## Fáze 2: IFC parsování a strom modelu
**Stav: ✅ HOTOVO (2026-03-16)**

### 2.1 IFC parsování ✅
- [x] **Rozhodnutí:** Nepoužíváme vlastní IFC stream parser — @thatopen/components IfcLoader to řeší interně
- [x] ifc-loader.js — drag & drop + file picker, IfcLoader.load()
- [x] ifc-index.js — po načtení projde scénu a vytvoří JSON index (typy, počty, expressIDs)

### 2.2 Strom modelu ✅
- [x] tree-builder.js — hierarchie: Model → EntityType → Entity (s limitem 100 entit na typ)
- [x] tree-ui.js — render stromu, expand/collapse, search filter (debounced), click → highlight ve 3D
- [x] Počty v badges, barevné ikony pro IFC typy

### 2.3 Properties panel ✅
- [x] properties-ui.js — zobrazí ExpressID, Type vybraného objektu
- [x] Napojeno na entity-selected event
- **TODO:** Plné PropertySety vyžadují IFC properties API — zatím jen základní info

### 2.4 IndexedDB storage ✅
- [x] storage.js — generický wrapper (agents, endpoints, chats, settings stores)
- [x] Oddělené stores pro agenty, endpointy, chaty, nastavení
- **TODO:** Ukládání IFC souborů do IndexedDB (zatím se soubory jen drží v paměti)

---

## Fáze 3: AI agenti
**Stav: ✅ HOTOVO (2026-03-16)**

### 3.1 AI client ✅
- [x] ai-client.js — chatCompletion() s streaming (SSE), fetchModels(), testConnection()
- [x] Podpora OpenAI-compatible API (Ollama, LM Studio, OpenAI, Anthropic, OpenRouter)
- [x] settings-ui.js — přidání endpointů s test spojení, auto-load modelů
- [x] Uložení do IndexedDB, status indikátor (zelená/červená tečka)

### 3.2 Agent správa ✅
- [x] agent-manager.js — CRUD, IndexedDB persistence
- [x] 4 šablony: Validátor (0.3), Hledač (0.5), Analytik (0.7), Měřič (0.3)
- [x] Vytvoření z šablony nebo custom
- [x] Přepínání v AI sidebar select
- [x] settings-ui.js — seznam agentů, mazání, vytváření

### 3.3 IFC → AI kontext ✅
- [x] ifc-index.js — JSON index (typy, počty, expressIDs, materiály)
- [x] getModelSummaryForAI() — textový souhrn do system promptu
- [x] Automaticky se přidá ke každé konverzaci

### 3.4 Tool-calling systém ✅
- [x] tool-defs.js — 6 nástrojů v OpenAI function-calling formátu
- [x] tool-executor.js — executeTool() s case routing
- [x] search_entities, get_properties, highlight_entities, clear_highlights, get_model_stats, validate_property
- [x] Iterativní smyčka v chat-ui.js (max 5 kol)
- **TODO:** validate_property je stub — plná implementace vyžaduje IFC properties API

### 3.5 Chat UI ✅
- [x] chat-ui.js — kompletní konverzační UI (~300 řádků)
- [x] Markdown rendering (marked.js + DOMPurify)
- [x] Tool-calling loop s vizualizací tool calls
- [x] Streaming odpovědí (SSE) s live preview
- [x] Quick action tlačítka
- [x] Klikatelné entity ID (#NNNN → navigace ve 3D)
- [x] Thinking indikátor s tlačítkem Stop
- **TODO:** Historie konverzací (persistence v IndexedDB)

---

## Fáze 4: Validace
**Stav: 📋 Připraveno**

### 4.1 IDS podpora
- [ ] IDS XML parser (přenést z BIM_checker)
- [ ] Načtení IDS specifikace (soubor upload nebo přetažení)
- [ ] Zobrazení IDS pravidel v UI

### 4.2 Validační engine
- [ ] Přenést/adaptovat validation-engine.js z BIM_checker
- [ ] Validace IFC proti IDS: entity, property, attribute, classification, material facety
- [ ] Web Worker pro paralelní validaci velkých souborů
- [ ] Výsledky validace — tabulka s pass/fail/warning
- [ ] Zvýraznění problémových objektů ve 3D (barevné kódování)
- [ ] AI agent může spustit validaci přes tool-calling

---

## Fáze 5: Polish a integrace
**Stav: 📋 Připraveno**

### 5.1 UX vylepšení
- [ ] Wizard/průvodce pro první spuštění
- [ ] Keyboard shortcuts (Escape = deselect, F = fit, etc.)
- [ ] Export výsledků (CSV, JSON)
- [ ] Tisk/PDF report z validace

### 5.2 Performance
- [ ] Lazy loading PropertySetů
- [ ] Virtualní scrolling ve stromu modelu (pro velké modely)
- [ ] Web Worker pool pro paralelní zpracování
- [ ] Memory management pro velké IFC soubory

### 5.3 Integrace do BIM_checker
- [ ] Přidat jako novou stránku (pages/ai-viewer.html)
- [ ] Sdílet common.css, i18n, storage, theme systém
- [ ] Sdílet IFC soubory z IndexedDB storage
- [ ] Navigace z BIM_checker hlavní stránky

### 5.4 Deployment
- [ ] PWA manifest + service worker
- [ ] Testování na různých zařízeních
- [ ] Lokální hosting (žádný cloud deploy — vše běží lokálně)

---

## Rozhodnutí a poznámky

| Datum | Rozhodnutí |
|-------|-----------|
| 2026-03-16 | Tech stack: vanilla JS frontend-only, žádný backend |
| 2026-03-16 | 3D engine: @thatopen/components (MIT) + web-ifc (MPL-2.0) + Three.js (MIT) |
| 2026-03-16 | AI: OpenAI-compatible API volaná přímo z browseru na uživatelův endpoint |
| 2026-03-16 | AI kontext: JSON index modelu + tool-calling funkce (search, highlight, validate) |
| 2026-03-16 | UI layout: icon sidebar + collapsible side panel + 3D viewer + collapsible AI chat |
| 2026-03-16 | Barvy a UI vzory z BIM_checker pro budoucí integraci |
| 2026-03-16 | Schválený mockup: viz .superpowers/brainstorm/ |
| 2026-03-16 | Three.js verze 0.175.0 (vyžadováno @thatopen/components 3.3.2) |
| 2026-03-16 | esm.sh CDN funguje na RPi — ověřeno (Three.js + OBC import OK) |
| 2026-03-16 | IFC parser se NEPOUŽÍVÁ vlastní — IfcLoader z @thatopen zvládne vše |
| 2026-03-16 | Žádný Cloudflare deploy — vše běží lokálně |
| 2026-03-16 | Port 8080 obsazen Pi Files — dev server na portu 8090 |

---

## Mockupy

Vizuální návrhy jsou v `.superpowers/brainstorm/` — finální schválený layout: `final-bimchecker.html`
