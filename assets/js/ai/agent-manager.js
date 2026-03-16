/**
 * Agent management — CRUD, templates, IndexedDB persistence
 */
import * as storage from '../core/storage.js';
import { state } from '../core/state.js';
import { generateId } from '../core/utils.js';

const TEMPLATES = {
  validator: {
    name: 'Validátor',
    systemPrompt: `Jsi BIM validační agent. Máš přístup k IFC modelu a můžeš:
- Hledat entity podle typu a vlastností
- Kontrolovat hodnoty PropertySetů
- Zvýrazňovat problémové objekty ve 3D vieweru

Při validaci vždy:
1. Vypiš nalezené problémy s ID entit
2. Zvýrazni je ve vieweru
3. Navrhni opravu

Odpovídej česky. Používej tabulky pro přehledné výsledky.`,
    temperature: 0.3,
  },
  searcher: {
    name: 'Hledač objektů',
    systemPrompt: `Jsi BIM vyhledávací agent. Pomáháš uživateli najít objekty v IFC modelu.
- Můžeš filtrovat podle typu entity (IfcWall, IfcDoor, ...)
- Můžeš filtrovat podle vlastností a PropertySetů
- Nalezené objekty zvýrazníš ve 3D

Odpovídej česky.`,
    temperature: 0.5,
  },
  analyst: {
    name: 'Analytik',
    systemPrompt: `Jsi BIM analytický agent. Vytvářej souhrny a statistiky modelu.
- Počty entit podle typu
- Analýza PropertySetů — které vlastnosti chybí
- Materiálové souhrny

Odpovídej česky, formátuj pomocí tabulek a seznamů.`,
    temperature: 0.7,
  },
  measurer: {
    name: 'Měřič',
    systemPrompt: `Jsi BIM měřicí agent. Pomáháš s rozměry a výpočty.
- Zjišťuj rozměry objektů (šířka, výška, délka)
- Počítej plochy a objemy
- Porovnávej rozměry mezi objekty

Odpovídej česky, uváděj jednotky.`,
    temperature: 0.3,
  },
};

export async function loadAgents() {
  state.agents = await storage.agents.getAll();
  return state.agents;
}

export async function loadEndpoints() {
  state.endpoints = await storage.endpoints.getAll();
  return state.endpoints;
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

export async function createFromTemplate(templateKey, endpointId, model) {
  const tpl = TEMPLATES[templateKey];
  if (!tpl) throw new Error(`Unknown template: ${templateKey}`);
  return createAgent({ ...tpl, endpointId, model });
}

export async function updateAgent(id, updates) {
  const idx = state.agents.findIndex(a => a.id === id);
  if (idx === -1) throw new Error('Agent not found');
  Object.assign(state.agents[idx], updates);
  await storage.agents.save(state.agents[idx]);
  return state.agents[idx];
}

export async function deleteAgent(id) {
  await storage.agents.delete(id);
  state.agents = state.agents.filter(a => a.id !== id);
}

export async function saveEndpoint(data) {
  const ep = {
    id: data.id || generateId('ep'),
    name: data.name || data.url,
    url: data.url,
    apiKey: data.apiKey || '',
    models: data.models || [],
    createdAt: data.createdAt || new Date().toISOString(),
  };
  await storage.endpoints.save(ep);
  const idx = state.endpoints.findIndex(e => e.id === ep.id);
  if (idx >= 0) state.endpoints[idx] = ep;
  else state.endpoints.push(ep);
  return ep;
}

export async function deleteEndpoint(id) {
  await storage.endpoints.delete(id);
  state.endpoints = state.endpoints.filter(e => e.id !== id);
}

export function getTemplates() { return TEMPLATES; }

export function getAgent(id) {
  return state.agents.find(a => a.id === id) || null;
}

export function getEndpoint(id) {
  return state.endpoints.find(e => e.id === id) || null;
}
