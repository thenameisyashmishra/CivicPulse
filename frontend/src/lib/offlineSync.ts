/*
 * offlineSync — CivicPulse
 * Rural Offline Road Inspection Queue with Automatic Network Recovery Sync
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export interface QueuedInspection {
  id: string;
  imageSrc: string;
  gpsCoords?: { lat: number; lng: number } | null;
  projectId: string;
  timestamp: string;
  notes?: string;
}

const STORAGE_KEY = "cp_offline_pothole_queue";
const SIMULATED_OFFLINE_KEY = "cp_simulated_offline";
const IDB_NAME = "CivicPulseOfflineDB";
const IDB_STORE = "offline_inspections";
const IDB_VERSION = 1;

let _memoryQueue: QueuedInspection[] = [];

// Lightweight IndexedDB helper for unlimited local storage quota
function getIDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// Initial hydration from IndexedDB / localStorage
if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) _memoryQueue = JSON.parse(raw);
  } catch {
    _memoryQueue = [];
  }

  getIDB().then((db) => {
    if (!db) return;
    try {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        if (req.result && Array.isArray(req.result) && req.result.length > 0) {
          _memoryQueue = req.result;
          window.dispatchEvent(new Event("cp_offline_queue_updated"));
        }
      };
    } catch {
      // Ignore initial IDB error
    }
  });
}

function persistToIDB(items: QueuedInspection[]) {
  getIDB().then((db) => {
    if (!db) return;
    try {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      store.clear();
      for (const item of items) {
        store.put(item);
      }
    } catch {
      // Fallback handled via memory
    }
  });
}

export function isSimulatedOffline(): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    return localStorage.getItem(SIMULATED_OFFLINE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSimulatedOffline(val: boolean) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      if (val) {
        localStorage.setItem(SIMULATED_OFFLINE_KEY, "true");
      } else {
        localStorage.removeItem(SIMULATED_OFFLINE_KEY);
      }
      window.dispatchEvent(new Event("cp_simulated_offline_changed"));
    }
  } catch (e) {
    console.error("Failed to update simulated offline state", e);
  }
}

export function getOfflineQueue(): QueuedInspection[] {
  return [..._memoryQueue];
}

export function enqueueOfflineInspection(item: Omit<QueuedInspection, "id" | "timestamp">): QueuedInspection {
  const newItem: QueuedInspection = {
    ...item,
    id: `OFFLINE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
  };
  _memoryQueue.push(newItem);
  persistToIDB(_memoryQueue);

  // Best-effort lightweight metadata backup in localStorage without crashing quota
  try {
    const metaOnly = _memoryQueue.map(({ id, projectId, timestamp, gpsCoords, notes }) => ({
      id,
      projectId,
      timestamp,
      gpsCoords,
      notes,
      imageSrc: "[indexeddb_blob]",
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metaOnly));
  } catch {
    // Ignore quota exhaustion on localStorage
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cp_offline_queue_updated"));
  }
  return newItem;
}

export function clearOfflineQueue() {
  _memoryQueue = [];
  persistToIDB([]);
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("cp_offline_queue_updated"));
  }
}

export async function syncOfflineQueue(): Promise<{ syncedCount: number; failedCount: number }> {
  const queue = [..._memoryQueue];
  if (queue.length === 0) return { syncedCount: 0, failedCount: 0 };

  let syncedCount = 0;
  let failedCount = 0;
  const remaining: QueuedInspection[] = [];

  const token = typeof window !== "undefined" ? localStorage.getItem("cp_token") : null;
  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders["Authorization"] = `Bearer ${token}`;
  }

  for (const item of queue) {
    try {
      let res: Response;
      if (item.imageSrc.startsWith("data:")) {
        res = await fetch("/api/engineering/pothole/detect-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            ...authHeaders,
          },
          body: new URLSearchParams({
            image_base64: item.imageSrc,
            project_id: item.projectId || "PW-2024-001",
            latitude: String(item.gpsCoords?.lat ?? 28.5245),
            longitude: String(item.gpsCoords?.lng ?? 77.2065),
          }),
        });
      } else {
        const imgBlob = await fetch(item.imageSrc).then((r) => r.blob());
        const formData = new FormData();
        formData.append("file", imgBlob, "offline_road_audit.jpg");
        formData.append("project_id", item.projectId || "PW-2024-001");
        formData.append("latitude", String(item.gpsCoords?.lat ?? 28.5245));
        formData.append("longitude", String(item.gpsCoords?.lng ?? 77.2065));
        res = await fetch("/api/engineering/pothole/detect-image", {
          method: "POST",
          headers: authHeaders,
          body: formData,
        });
      }

      if (res.ok) {
        syncedCount++;
      } else {
        failedCount++;
        remaining.push(item);
      }
    } catch {
      failedCount++;
      remaining.push(item);
    }
  }

  _memoryQueue = remaining;
  persistToIDB(remaining);
  window.dispatchEvent(new Event("cp_offline_queue_updated"));

  if (syncedCount > 0) {
    toast.success(`Rural Offline Sync: Successfully uploaded ${syncedCount} queued field inspection(s)!`);
  }

  return { syncedCount, failedCount };
}

export function useOfflineQueue() {
  const [realOnline, setRealOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [simulatedOffline, setSimulatedOfflineState] = useState(isSimulatedOffline());
  const [queue, setQueue] = useState<QueuedInspection[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const isOnline = realOnline && !simulatedOffline;

  const refreshQueue = useCallback(() => {
    setQueue(getOfflineQueue());
  }, []);

  const refreshSimulated = useCallback(() => {
    setSimulatedOfflineState(isSimulatedOffline());
  }, []);

  useEffect(() => {
    refreshQueue();
    refreshSimulated();

    const handleOnline = () => {
      setRealOnline(true);
      if (!isSimulatedOffline()) {
        toast.info("Network restored! Automatically syncing offline road inspections...");
        setIsSyncing(true);
        syncOfflineQueue().finally(() => setIsSyncing(false));
      }
    };

    const handleOffline = () => {
      setRealOnline(false);
      toast.warning("Network disconnected. Rural Offline Field Mode activated.");
    };

    const handleSimChange = () => {
      const isSim = isSimulatedOffline();
      setSimulatedOfflineState(isSim);
      if (!isSim && (typeof navigator !== "undefined" ? navigator.onLine : true)) {
        toast.info("Simulated Offline Mode deactivated! Syncing queue...");
        setIsSyncing(true);
        syncOfflineQueue().finally(() => setIsSyncing(false));
      } else if (isSim) {
        toast.warning("Simulated Offline Mode activated. All audits queued locally.");
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("cp_offline_queue_updated", refreshQueue);
    window.addEventListener("cp_simulated_offline_changed", handleSimChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("cp_offline_queue_updated", refreshQueue);
      window.removeEventListener("cp_simulated_offline_changed", handleSimChange);
    };
  }, [refreshQueue, refreshSimulated]);

  const triggerSync = async () => {
    setIsSyncing(true);
    try {
      await syncOfflineQueue();
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleSimulatedOffline = () => {
    setSimulatedOffline(!simulatedOffline);
  };

  return {
    isOnline,
    isSimulatedOffline: simulatedOffline,
    toggleSimulatedOffline,
    queue,
    queueCount: queue.length,
    isSyncing,
    triggerSync,
    enqueue: enqueueOfflineInspection,
  };
}
