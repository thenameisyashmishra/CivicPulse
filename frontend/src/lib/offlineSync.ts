/**
 * Offline Evidence Upload Queue & Synchronization Engine for CivicPulse (PWA).
 *
 * Uses IndexedDB to safely store evidence submissions locally during network drops,
 * automatically draining the queue and uploading to the backend once connectivity restores.
 */

const DB_NAME = "CivicPulseOfflineDB";
const STORE_NAME = "offline_evidence_queue";
const DB_VERSION = 1;

export interface QueuedEvidenceItem {
  id?: number;
  projectId: string;
  caption: string;
  fileName: string;
  fileType: string;
  fileData: ArrayBuffer;
  queuedAt: string;
  attempts: number;
}

/** Open or initialize the IndexedDB storage instance. */
export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this environment."));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Enqueue an evidence submission into IndexedDB when offline. */
export async function queueOfflineEvidence(
  projectId: string,
  file: File,
  caption: string
): Promise<number> {
  const db = await openOfflineDB();
  const buffer = await file.arrayBuffer();

  const item: QueuedEvidenceItem = {
    projectId,
    caption,
    fileName: file.name,
    fileType: file.type,
    fileData: buffer,
    queuedAt: new Date().toISOString(),
    attempts: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(item);

    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
}

/** Retrieve all pending offline items. */
export async function getPendingOfflineEvidence(): Promise<QueuedEvidenceItem[]> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

/** Drain and sync all queued evidence items to the backend API. */
export async function syncOfflineEvidenceQueue(
  token: string,
  onProgress?: (syncedCount: number, totalCount: number) => void
): Promise<{ synced: number; failed: number }> {
  const items = await getPendingOfflineEvidence();
  if (items.length === 0) return { synced: 0, failed: 0 };

  const db = await openOfflineDB();
  let synced = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const blob = new Blob([item.fileData], { type: item.fileType });
      const formData = new FormData();
      formData.append("file", blob, item.fileName);
      if (item.caption) {
        formData.append("caption", item.caption);
      }

      const response = await fetch(`/api/projects/${item.projectId}/evidence`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        // Remove successfully synced item from IndexedDB
        if (item.id !== undefined) {
          const tx = db.transaction(STORE_NAME, "readwrite");
          tx.objectStore(STORE_NAME).delete(item.id);
        }
        synced++;
        if (onProgress) onProgress(synced, items.length);
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

// Auto-register online sync listener in browser environments
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    const savedToken = localStorage.getItem("cp_token") || localStorage.getItem("civicpulse_token") || localStorage.getItem("token");
    if (savedToken) {
      syncOfflineEvidenceQueue(savedToken).then(({ synced }) => {
        if (synced > 0) {
          console.info(`[CivicPulse PWA] Automatically synced ${synced} offline evidence uploads.`);
        }
      });
    }
  });
}
