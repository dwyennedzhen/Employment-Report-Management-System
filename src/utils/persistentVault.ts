export interface PersistentDbSnapshot {
  campuses?: any[];
  qualifications?: any[];
  users?: any[];
  employmentReports?: any[];
  deletedReportIds?: string[];
  updatedAt?: string;
}

const LOCAL_STORAGE_VAULT_KEY = 'som_erms_persistent_db_v2';
const IDB_NAME = 'SOM_ERMS_PERSISTENT_VAULT_DB';
const IDB_STORE = 'snapshots';
const IDB_KEY = 'primary_snapshot';

function openVaultIdb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveClientVaultSnapshot(snapshot: PersistentDbSnapshot | null | undefined): Promise<void> {
  if (!snapshot || typeof snapshot !== 'object') return;

  // Preserve existing accounts in the client vault by merging users non-destructively
  const existing = loadClientVaultSnapshotSync();
  const mergedUsers: any[] = [];
  const userMap = new Map<string, any>();

  if (existing && Array.isArray(existing.users)) {
    for (const u of existing.users) {
      if (u && (u.username || u.id)) {
        const key = String(u.username || u.id).trim().toLowerCase();
        userMap.set(key, u);
      }
    }
  }

  if (Array.isArray(snapshot.users)) {
    for (const u of snapshot.users) {
      if (u && (u.username || u.id)) {
        const key = String(u.username || u.id).trim().toLowerCase();
        const prev = userMap.get(key);
        if (prev && prev.passwordHash && !u.passwordHash) {
          userMap.set(key, { ...u, passwordHash: prev.passwordHash });
        } else {
          userMap.set(key, u);
        }
      }
    }
  }

  for (const u of userMap.values()) {
    mergedUsers.push(u);
  }

  const payload: PersistentDbSnapshot = {
    ...snapshot,
    users: mergedUsers.length > 0 ? mergedUsers : snapshot.users,
    updatedAt: snapshot.updatedAt || new Date().toISOString(),
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_VAULT_KEY, JSON.stringify(payload));
  } catch {
    // ignore localStorage quota error
  }

  try {
    const db = await openVaultIdb();
    if (!db) return;
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(payload, IDB_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    // ignore IndexedDB error
  }
}

export function loadClientVaultSnapshotSync(): PersistentDbSnapshot | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_VAULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as PersistentDbSnapshot;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function loadClientVaultSnapshot(): Promise<PersistentDbSnapshot | null> {
  const syncSnap = loadClientVaultSnapshotSync();

  try {
    const db = await openVaultIdb();
    if (db) {
      const idbSnap = await new Promise<PersistentDbSnapshot | null>((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const getReq = store.get(IDB_KEY);
        getReq.onsuccess = () => {
          db.close();
          resolve((getReq.result as PersistentDbSnapshot) || null);
        };
        getReq.onerror = () => {
          db.close();
          resolve(null);
        };
      });

      if (idbSnap && syncSnap) {
        const idbUsers = Array.isArray(idbSnap.users) ? idbSnap.users.length : 0;
        const syncUsers = Array.isArray(syncSnap.users) ? syncSnap.users.length : 0;
        if (idbUsers >= syncUsers) {
          return idbSnap;
        }
        return syncSnap;
      }
      if (idbSnap) {
        try {
          localStorage.setItem(LOCAL_STORAGE_VAULT_KEY, JSON.stringify(idbSnap));
        } catch {
          // ignore
        }
        return idbSnap;
      }
    }
  } catch {
    // ignore
  }

  return syncSnap;
}
