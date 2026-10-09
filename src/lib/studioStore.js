/**
 * The recordings themselves, kept on the phone rather than in the project. A project only ever holds
 * the reference to a recording, never its bytes: that is what lets the same recording be cut, moved
 * and copied as many times as the artist likes while the sound underneath is never written over.
 *
 * IndexedDB is used because it holds whole files — a five-minute vocal take is far more than a
 * browser key/value store will take — and it survives the app being closed.
 */

const DB_NAME = "gloire-studio";
const DB_VERSION = 1;
const AUDIO = "audio";
const META = "meta";
const RECOVERY = "recovery";

let opening = null;

function open() {
  if (opening) return opening;
  opening = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("This phone will not store recordings for the studio."));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(AUDIO)) {
        db.createObjectStore(AUDIO, { keyPath: "id" }).createIndex("project", "project_id");
      }
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META, { keyPath: "id" }).createIndex("project", "project_id");
      }
      if (!db.objectStoreNames.contains(RECOVERY)) {
        db.createObjectStore(RECOVERY, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("The studio's storage could not be opened."));
  });
  return opening;
}

function work(storeName, mode, run) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const req = run(tx.objectStore(storeName));
        tx.oncomplete = () => resolve(req ? req.result : undefined);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

/**
 * Keeps a recording: the file itself, what it is called, and the song it belongs to. Its size and
 * its name are written into the light list beside it, so how much room a song takes is read without
 * pulling every recording into memory.
 */
export async function putAudio(record) {
  await work(AUDIO, "readwrite", (store) => store.put(record));
  const { blob, ...meta } = record;
  await work(META, "readwrite", (store) => store.put(meta));
  return record.id;
}

export function getAudio(id) {
  return work(AUDIO, "readonly", (store) => store.get(id));
}

export function deleteAudio(id) {
  return work(AUDIO, "readwrite", (store) => store.delete(id)).then(() =>
    work(META, "readwrite", (store) => store.delete(id))
  );
}

/** The light list of a song's recordings — names and sizes, without the sound itself. */
export function listMeta(projectId) {
  if (projectId) return work(META, "readonly", (store) => store.index("project").getAll(projectId));
  return work(META, "readonly", (store) => store.getAll());
}

/** How much room one song's recordings take on the phone. */
export async function projectBytes(projectId) {
  const rows = await listMeta(projectId);
  return (rows || []).reduce((total, row) => total + (Number(row.size) || 0), 0);
}

/** Everything the studio has stored on this phone, for the storage line in settings. */
export async function storedBytes() {
  const rows = await listMeta();
  return (rows || []).reduce((total, row) => total + (Number(row.size) || 0), 0);
}

/** A recording that is still being made. Its pieces are written down as they arrive, so an
 *  interruption — a call, a locked screen, a closed tab — costs a second or two and never the take. */
export function putRecovery(record) {
  return work(RECOVERY, "readwrite", (store) => store.put(record));
}

export function getRecovery(id) {
  return work(RECOVERY, "readonly", (store) => store.get(id));
}

export function deleteRecovery(id) {
  return work(RECOVERY, "readwrite", (store) => store.delete(id));
}

export function listRecoveries() {
  return work(RECOVERY, "readonly", (store) => store.getAll()).then((rows) => rows || []);
}

/** One more piece of a recording still being made. */
export async function appendRecoveryChunk(id, chunk) {
  const row = await getRecovery(id);
  if (!row) return;
  row.chunks = [...(row.chunks || []), chunk];
  row.bytes = (row.bytes || 0) + (chunk?.size || 0);
  await putRecovery(row);
}