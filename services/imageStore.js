const DB_NAME = 'BulkListingPro_ImageStore';
const DB_VERSION = 1;
const STORE_NAME = 'images';

let db = null;

export async function openImageDB() {
  if (db) return db;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('listingId', 'listingId', { unique: false });
      }
    };
    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };
    request.onerror = (e) => reject(e.target.error);
  });
}

function getStore(mode = 'readonly') {
  const tx = db.transaction(STORE_NAME, mode);
  return tx.objectStore(STORE_NAME);
}

export async function saveImage(key, blob, metadata = {}) {
  await openImageDB();
  return new Promise((resolve, reject) => {
    const store = getStore('readwrite');
    const entry = {
      key,
      listingId: metadata.listingId || '',
      slotIndex: metadata.slotIndex || 0,
      blob,
      mimeType: metadata.mimeType || blob.type,
      width: metadata.width || 0,
      height: metadata.height || 0,
      fileSize: metadata.fileSize || blob.size,
      createdAt: Date.now()
    };
    const request = store.put(entry);
    request.onsuccess = () => resolve(entry);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function getImage(key) {
  await openImageDB();
  return new Promise((resolve, reject) => {
    const store = getStore();
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function getImageAsDataURL(key) {
  const entry = await getImage(key);
  if (!entry || !entry.blob) return null;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(entry.blob);
  });
}

export async function deleteImage(key) {
  await openImageDB();
  return new Promise((resolve, reject) => {
    const store = getStore('readwrite');
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function deleteImagesForListing(listingId) {
  await openImageDB();
  return new Promise((resolve, reject) => {
    const store = getStore('readwrite');
    const index = store.index('listingId');
    const request = index.getAllKeys(listingId);
    request.onsuccess = () => {
      const keys = request.result;
      if (keys.length === 0) { resolve(); return; }
      let remaining = keys.length;
      keys.forEach(k => {
        const del = store.delete(k);
        del.onsuccess = () => { if (--remaining === 0) resolve(); };
        del.onerror = (e) => reject(e.target.error);
      });
    };
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function clearAllImages() {
  await openImageDB();
  return new Promise((resolve, reject) => {
    const store = getStore('readwrite');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function generateThumbnail(blob, maxSize = 150, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(maxSize / w, maxSize / h, 1);
      const tw = Math.round(w * scale);
      const th = Math.round(h * scale);

      const canvas = document.createElement('canvas');
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, tw, th);

      const thumbDataURL = canvas.toDataURL('image/jpeg', quality);
      URL.revokeObjectURL(url);
      resolve({ thumbDataURL, width: w, height: h });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}
