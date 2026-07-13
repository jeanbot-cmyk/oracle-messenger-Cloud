// ==========================================================
// ORACLE MESSENGER — Stockage local (IndexedDB)
// ==========================================================
// Conformément au cahier des charges : AUCUN message, photo,
// vidéo, document ou audio n'est stocké sur le serveur.
// Tout reste sur l'appareil de l'utilisateur.
//
// Ce module encapsule IndexedDB derrière une API simple.
// ==========================================================

const DB_NAME = "oracle_messenger_db";
const DB_VERSION = 1;

const STORES = {
  conversations: "conversations", // { id, contactId, lastMessage, updatedAt }
  messages: "messages",           // { id, conversationId, from, text, mediaBlob?, ticks, createdAt }
  contacts: "contacts",           // { id, name, phone, onOracle, crmTag }
  notes: "notes",                 // { id, text, createdAt }
  media: "media",                 // { id, blob, type, filename, sizeBytes, createdAt }
};

let dbInstance = null;

function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORES.conversations)) {
        db.createObjectStore(STORES.conversations, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.messages)) {
        const store = db.createObjectStore(STORES.messages, { keyPath: "id" });
        store.createIndex("conversationId", "conversationId", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.contacts)) {
        db.createObjectStore(STORES.contacts, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.notes)) {
        db.createObjectStore(STORES.notes, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.media)) {
        db.createObjectStore(STORES.media, { keyPath: "id" });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };
    request.onerror = (event) => reject(event.target.error);
  });
}

function tx(storeName, mode = "readonly") {
  return openDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

// ---- API générique CRUD ----

export async function put(storeName, value) {
  const store = await tx(storeName, "readwrite");
  return new Promise((resolve, reject) => {
    const req = store.put(value);
    req.onsuccess = () => resolve(value);
    req.onerror = () => reject(req.error);
  });
}

export async function get(storeName, id) {
  const store = await tx(storeName);
  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAll(storeName) {
  const store = await tx(storeName);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function remove(storeName, id) {
  const store = await tx(storeName, "readwrite");
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function getMessagesForConversation(conversationId) {
  const store = await tx(STORES.messages);
  return new Promise((resolve, reject) => {
    const index = store.index("conversationId");
    const req = index.getAll(conversationId);
    req.onsuccess = () => resolve((req.result || []).sort((a, b) => a.createdAt - b.createdAt));
    req.onerror = () => reject(req.error);
  });
}

// ---- Calcul de l'espace de stockage utilisé (pour l'écran "Nettoyage") ----

export async function estimateStorageUsage() {
  if (navigator.storage && navigator.storage.estimate) {
    const { usage, quota } = await navigator.storage.estimate();
    return { usageBytes: usage, quotaBytes: quota, percent: quota ? (usage / quota) * 100 : 0 };
  }
  return { usageBytes: 0, quotaBytes: 0, percent: 0 };
}

export const stores = STORES;
