/**
 * IndexedDB storage wrapper
 * Pattern from BIM_checker — metadata separate from file content
 */

const DB_NAME = 'bim-ai-viewer';
const DB_VERSION = 1;

let dbInstance = null;

function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('agents')) db.createObjectStore('agents', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('endpoints')) db.createObjectStore('endpoints', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('chats')) db.createObjectStore('chats', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
    };
    req.onsuccess = () => { dbInstance = req.result; resolve(dbInstance); };
    req.onerror = () => reject(req.error);
  });
}

async function tx(storeName, mode = 'readonly') {
  const db = await openDB();
  return db.transaction(storeName, mode).objectStore(storeName);
}

function wrap(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAll(storeName) {
  return wrap((await tx(storeName)).getAll());
}

export async function getById(storeName, id) {
  return wrap((await tx(storeName)).get(id));
}

export async function put(storeName, item) {
  return wrap((await tx(storeName, 'readwrite')).put(item));
}

export async function remove(storeName, id) {
  return wrap((await tx(storeName, 'readwrite')).delete(id));
}

// Convenience APIs
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
  get: async (key) => {
    const r = await getById('settings', key);
    return r?.value;
  },
  set: (key, value) => put('settings', { key, value }),
};
