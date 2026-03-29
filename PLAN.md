# PLAN.md — BIM AI Viewer

## Vize projektu

Frontendová aplikace pro 3D zobrazení IFC modelů s AI agenty, kteří pracují s BIM daty. Uživatel načte IFC soubor, vidí ho ve 3D, a přes AI chat může hledat objekty, zvýrazňovat je, validovat proti IDS specifikacím atd. Vše běží v prohlížeči — AI volání jdou přímo na uživatelův lokální LLM (Ollama, LM Studio) nebo cloud API s jeho klíčem.

Projekt je navržen pro pozdější integraci do BIM_checker jako nová stránka/nástroj.

---

## Fáze 1: Základní kostra a 3D viewer
**Stav: ✅ HOTOVO**

### 1.1 Projekt setup ✅
- [x] Git repo, .gitignore, CLAUDE.md, PLAN.md
- [x] Adresářová struktura (assets/js/core, viewer, ifc, ai, ui, css)
- [x] CSS základ — variables.css + app.css
- [x] index.html s kompletním layoutem
- [x] Core moduly: utils.js, state.js, i18n.js, translations.js
- [x] UI moduly: theme.js, toast.js, modals.js, navigation.js, panels.js
- [x] app.js bootstrap

### 1.2 Integrace @thatopen/components + Three.js ✅ (opraveno 2026-03-29)
- [x] esm.sh CDN s pinovanými deps pro konzistentní verze
- [x] viewer-init.js — Components, Worlds, SimpleScene/Camera/Renderer
- [x] FragmentsManager.init(workerUrl) — fragment worker inicializace
- [x] fragments.list.onItemSet listener pro přidání modelu do scény (v3 API)
- [x] ifc-loader.js — drag & drop + file picker
- [x] viewer-selection.js — raycasting, zvýraznění
- [x] viewer-tools.js — toolbar, zoom, fit-all
- [x] Otestováno s reálnými IFC soubory na RPi

**Opravené problémy (2026-03-29):**
- FragmentsManager.init() chybělo → "You need to initialize fragments first"
- esm.sh process polyfill rozbíjel web-ifc WASM → delete process.versions.node
- Verze mismatch CDN závislostí → ?deps= pinning
- v3 API změna: model.object + model.useCamera() místo přímého scene.add()

### 1.3 UI kostra ✅
- [x] Icon sidebar s navigací (7 ikon + tooltips)
- [x] Side panel — slide-in/out s animací
- [x] AI sidebar — slide-in/out
- [x] Navbar, responsive layout, drop zone, theme toggle

---

## Fáze 2: IFC parsování a strom modelu
**Stav: ✅ HOTOVO**

### 2.1 IFC parsování ✅
- [x] IfcLoader z @thatopen/components (žádný vlastní parser)
- [x] ifc-index.js — JSON index (typy, počty, expressIDs)

### 2.2 Strom modelu ✅
- [x] tree-builder.js — hierarchie Model → EntityType → Entity
- [x] tree-ui.js — render, expand/collapse, search, click → highlight

### 2.3 Properties panel ✅
- [x] properties-ui.js — ExpressID, Type vybraného objektu
- [ ] **TODO:** Plné PropertySety (vyžaduje IFC properties API)

### 2.4 IndexedDB storage ✅
- [x] storage.js — generický wrapper (agents, endpoints, chats, settings)
- [ ] **TODO:** Ukládání IFC souborů do IndexedDB

---

## Fáze 3: AI agenti
**Stav: ✅ HOTOVO (vylepšeno 2026-03-29)**

### 3.1 AI client ✅
- [x] ai-client.js — chatCompletion() s streaming, fetchModels(), testConnection()
- [x] Podpora OpenAI-compatible API (Ollama, Google AI, OpenAI, OpenRouter)

### 3.2 Provider systém ✅ (nové 2026-03-29)
- [x] providers.js — předdefinované providery (Ollama, Google AI, OpenAI, OpenRouter, Custom)
- [x] Auto-detekce Ollama při prvním spuštění
- [x] detectProvider() — rozpoznání providera z URL
- [x] Inline agent formulář s provider dropdown, auto-load modelů, temperature slider
- [x] API klíč pole se zobrazí jen pro cloud providery
- [x] Endpoint se vytváří automaticky na pozadí (žádný separátní krok)

### 3.3 Agent správa ✅
- [x] agent-manager.js — CRUD, IndexedDB persistence
- [x] 4 šablony: Validátor, Hledač, Analytik, Měřič
- [x] Inline editace agentů (provider, model, teplota, prompt)
- [x] settings-ui.js — agent list + inline form (žádné prompt() dialogy)

### 3.4 IFC → AI kontext ✅
- [x] JSON index modelu → system prompt
- [x] getModelSummaryForAI()

### 3.5 Tool-calling systém ✅
- [x] 6 nástrojů v OpenAI function-calling formátu
- [x] Iterativní smyčka (max 5 kol)
- [ ] **TODO:** validate_property plná implementace

### 3.6 Chat UI ✅
- [x] Kompletní konverzační UI s markdown rendering
- [x] Streaming odpovědí (SSE), tool-call vizualizace
- [x] Quick actions, klikatelné entity ID, thinking indikátor
- [ ] **TODO:** Historie konverzací (persistence v IndexedDB)

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
- [ ] Web Worker pro paralelní validaci
- [ ] Výsledky validace — tabulka s pass/fail/warning
- [ ] Zvýraznění problémových objektů ve 3D
- [ ] AI agent může spustit validaci přes tool-calling

---

## Fáze 5: Polish a integrace
**Stav: 📋 Připraveno**

### 5.1 UX vylepšení
- [ ] Keyboard shortcuts (Escape = deselect, F = fit, etc.)
- [ ] Export výsledků (CSV, JSON)

### 5.2 Performance
- [ ] Lazy loading PropertySetů
- [ ] Virtuální scrolling ve stromu modelu
- [ ] Memory management pro velké IFC soubory

### 5.3 Integrace do BIM_checker
- [ ] Přidat jako novou stránku (pages/ai-viewer.html)
- [ ] Sdílet common.css, i18n, storage, theme systém

### 5.4 Deployment
- [ ] Lokální hosting (žádný cloud deploy)
- [ ] Testování na různých zařízeních

---

## Rozhodnutí a poznámky

| Datum | Rozhodnutí |
|-------|-----------|
| 2026-03-16 | Tech stack: vanilla JS frontend-only, žádný backend |
| 2026-03-16 | 3D engine: @thatopen/components + web-ifc + Three.js |
| 2026-03-16 | AI: OpenAI-compatible API volaná přímo z browseru |
| 2026-03-16 | UI layout: icon sidebar + side panel + 3D viewer + AI chat |
| 2026-03-29 | Viewer opraven: FragmentsManager.init(), process polyfill fix, deps pinning |
| 2026-03-29 | CDN: esm.sh s ?deps= pro pinování verzí (web-ifc@0.0.74, fragments@3.3.2) |
| 2026-03-29 | Provider systém: předdefinovaní provideři jako v local-ai-playground |
| 2026-03-29 | Agent UI: inline formulář v panelu, žádné prompt() dialogy |
| 2026-03-29 | API klíče: uložené v IndexedDB prohlížeče, nikdy v souborech |
| 2026-03-29 | Dev server: port 8088 (8080 obsazen Pi Files) |
