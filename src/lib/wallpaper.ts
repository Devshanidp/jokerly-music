const DB_NAME = "shansmusic-wallpaper";
const STORE = "wallpaper";
const KEY = "current";
const EVENT = "shansmusic-wallpaper-changed";

export type WallpaperRecord = {
  dataUrl: string;
  updatedAt: number;
  /** 0 = clear glass wash, 1 = heavy dim over wallpaper */
  dim: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

export async function getWallpaper(): Promise<WallpaperRecord | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => {
        const val = req.result as WallpaperRecord | undefined;
        resolve(val?.dataUrl ? val : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function saveWallpaper(record: WallpaperRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  window.dispatchEvent(new CustomEvent(EVENT, { detail: record }));
}

export async function clearWallpaper(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  window.dispatchEvent(new CustomEvent(EVENT, { detail: null }));
}

export function onWallpaperChange(cb: (record: WallpaperRecord | null) => void) {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<WallpaperRecord | null>).detail ?? null;
    cb(detail);
  };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

/** Compress/resize an image file to a JPEG data URL for local wallpaper storage. */
export async function fileToWallpaperDataUrl(file: File, maxEdge = 1920, quality = 0.72): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("Image must be under 12MB");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not process image");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  // Cap ~2.5MB data URL to avoid IndexedDB / memory pain on mobile
  if (dataUrl.length > 3_500_000) {
    return canvas.toDataURL("image/jpeg", 0.55);
  }
  return dataUrl;
}
