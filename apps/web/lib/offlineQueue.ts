import type { CreateSosRequest } from "@raksha-grid/shared-types";

const DB_NAME = "raksha-grid";
const DB_VERSION = 1;
const STORE = "pending_sos";

export interface QueuedSos {
  /** Local key = the same idempotencyKey sent to the server, so a retry
   *  that eventually succeeds can never create a duplicate incident. */
  id: string;
  payload: CreateSosRequest;
  status: "pending" | "syncing" | "failed";
  retryCount: number;
  nextRetryAt: number; // epoch ms
  createdAt: number;
  lastError?: string;
}

/**
 * Raw IndexedDB, no external library — this is the one browser storage API
 * actually allowed for real app data (unlike localStorage for large/queued
 * data), and it's what survives page refresh, tab close, and device sleep,
 * per the offline-first requirements in
 * docs/PHASE-1-PRODUCT-DEFINITION.md §18.
 */
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable in this environment"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueSos(payload: CreateSosRequest): Promise<QueuedSos> {
  const db = await openDb();
  const entry: QueuedSos = {
    id: payload.idempotencyKey,
    payload,
    status: "pending",
    retryCount: 0,
    nextRetryAt: Date.now(),
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve(entry);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllQueued(): Promise<QueuedSos[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedSos[]);
    req.onerror = () => reject(req.error);
  });
}

export async function updateQueued(entry: QueuedSos): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeQueued(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
