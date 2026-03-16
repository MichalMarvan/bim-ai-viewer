# PLAN.md — BIM AI Viewer

## Vize projektu

Frontendová aplikace pro 3D zobrazení IFC modelů s AI agenty, kteří pracují s BIM daty. Uživatel načte IFC soubor, vidí ho ve 3D, a přes AI chat může hledat objekty, zvýrazňovat je, validovat proti IDS specifikacím atd. Vše běží v prohlížeči — AI volání jdou přímo na uživatelův lokální LLM (Ollama, LM Studio) nebo cloud API s jeho klíčem.

Projekt je navržen pro pozdější integraci do BIM_checker jako nová stránka/nástroj.

---

## Fáze 1: Základní kostra a 3D viewer
**Stav: 📋 Připraveno**

### 1.1 Projekt setup
- [ ] Inicializovat git repo, .gitignore, základní index.html
- [ ] Nastavit adresářovou strukturu (assets/js/core, viewer, ifc, ai, ui, workers, css)
- [ ] CSS základ — přenést proměnné z BIM_checker (common.css), dark/light theme
- [ ] Základní index.html s layout strukturou (navbar, icon sidebar, side panel, viewer area, AI sidebar)

### 1.2 Integrace @thatopen/components + Three.js
- [ ] Prozkoumat @thatopen/components API a dokumentaci
- [ ] Rozhodnout loading strategii (CDN vs lokální bundle)
- [ ] Základní 3D scéna — inicializace, render loop, kamera, controls
- [ ] Načtení IFC souboru přes web-ifc → zobrazení 3D modelu
- [ ] Výběr objektů kliknutím (raycasting), zvýraznění vybraného
- [ ] Toolbar — výběr/orbita/měření/řez
- [ ] Zoom controls, fit-to-view
- [ ] Axes gizmo
- [ ] Info bar (FPS, počet objektů, vybraný objekt)

### 1.3 UI kostra
- [ ] Icon sidebar s navigací (funkční přepínání panelů)
- [ ] Side panel — slide-in/out animace
- [ ] AI sidebar — slide-in/out animace
- [ ] Navbar — brand, file info, akce (načíst IFC, export), theme toggle, language switch
- [ ] Responsive layout (tablet, mobil)
- [ ] Drop zone pro IFC soubory (drag & drop + click)
- [ ] Light/dark theme toggle (funkční)

---

## Fáze 2: IFC parsování a strom modelu
**Stav: 📋 Připraveno**

### 2.1 IFC streaming parser
- [ ] Přenést/adaptovat ifc-stream-parser.js z BIM_checker
- [ ] Web Worker pro parsování (neblokovat UI)
- [ ] Progress reporting (progress bar při načítání)
- [ ] Filtrování geometrie, zachování sémantických entit

### 2.2 Strom modelu (Model Tree)
- [ ] Hierarchická struktura: Projekt → Budova → Patro → Typy entit → Entity
- [ ] Interaktivní strom — klik na entitu → zvýraznit ve 3D, zobrazit properties
- [ ] Počty objektů v badges
- [ ] Hledání v modelu (search box)
- [ ] Expand/collapse větví

### 2.3 Properties panel
- [ ] Zobrazení vlastností vybraného objektu (GlobalId, Name, Type, atributy)
- [ ] PropertySety s hodnotami
- [ ] Vizuální indikace chybějících/problémových vlastností

### 2.4 IndexedDB storage
- [ ] Ukládání načtených IFC souborů do IndexedDB
- [ ] Seznam uložených souborů, možnost přepínat
- [ ] Metadata (název, velikost, počet entit, datum načtení)

---

## Fáze 3: AI agenti
**Stav: 📋 Připraveno**

### 3.1 AI client (endpoint management)
- [ ] Nastavení endpointů — UI pro přidání/editaci (URL, API klíč, model)
- [ ] Podpora OpenAI-compatible API formátu (Ollama, LM Studio, OpenAI, Anthropic, etc.)
- [ ] Detekce dostupných modelů (GET /v1/models pro Ollama/LM Studio)
- [ ] Uložení konfigurace do IndexedDB
- [ ] Status indikátor (připojeno/odpojeno)

### 3.2 Agent správa
- [ ] Vytváření agentů s názvem, system promptem, endpointem, modelem
- [ ] Předdefinované šablony agentů:
  - **Validátor** — kontroluje IFC proti pravidlům/IDS
  - **Hledač objektů** — vyhledává entity podle kritérií
  - **Analytik** — statistiky, souhrny, reporty
  - **Měřič** — rozměry, vzdálenosti, plochy
- [ ] Přepínání agentů v AI sidebar (select)
- [ ] Uložení agentů do IndexedDB

### 3.3 IFC → AI kontext (JSON index)
- [ ] Při parsování vytvořit kompaktní JSON index modelu:
  - Typy entit s počty
  - Hierarchie (budova → patra → entity)
  - Seznam PropertySetů s klíči
  - Materiály, klasifikace
- [ ] Index jako součást system promptu agenta
- [ ] Optimalizace velikosti pro malé modely (context window)

### 3.4 Tool-calling systém
- [ ] Definice nástrojů ve formátu OpenAI function-calling:
  - `search_entities(type, filters)` — vrátí seznam entit
  - `get_properties(entityId)` — vrátí properties entity
  - `highlight_entities(entityIds, color)` — zvýrazní ve 3D
  - `clear_highlights()` — odstraní zvýraznění
  - `get_model_stats()` — statistiky modelu
  - `validate_property(entityId, psetName, propName, expectedValue)` — validace
- [ ] Executor — zpracování tool calls z LLM odpovědi, vykonání, vrácení výsledku
- [ ] Iterativní smyčka (agent volá tool → výsledek → agent pokračuje)
- [ ] Max rounds limit

### 3.5 Chat UI
- [ ] Konverzace — user/AI zprávy s markdown renderem
- [ ] Klikatelné entity ID v odpovědích (navigace k objektu ve 3D)
- [ ] Tabulky ve zprávách
- [ ] Status tagy (✅ OK, ⚠ Warning, ❌ Error)
- [ ] Quick action tlačítka
- [ ] Historie konverzací (IndexedDB)
- [ ] Streaming odpovědí (SSE pokud endpoint podporuje)

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
- [ ] Cloudflare Pages deployment
- [ ] PWA manifest + service worker
- [ ] Testování na různých zařízeních

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

---

## Mockupy

Vizuální návrhy jsou v `.superpowers/brainstorm/` — finální schválený layout: `final-bimchecker.html`
