import { saveImage, getImage, getImageAsDataURL, deleteImage, deleteImagesForListing, generateThumbnail } from '../../services/imageStore.js';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const HARD_REJECT_SIZE = 50 * 1024 * 1024;
const MIN_IMAGE_DIMENSION = 1000;
const MAX_SLOTS = 5;

function makeKey(listingId, slotIndex) {
  return `${listingId}_img_${slotIndex}`;
}

function findFirstEmptySlot(listing, startSlot = 1) {
  for (let i = startSlot; i <= MAX_SLOTS; i++) {
    if (!listing[`image_${i}`]) return i;
  }
  return -1;
}

export async function processImageFiles(files, listing, startSlot, callbacks = {}) {
  const results = [];
  let slot = startSlot || findFirstEmptySlot(listing);

  for (const file of files) {
    if (slot === -1 || slot > MAX_SLOTS) {
      if (callbacks.onError) callbacks.onError('All 5 image slots are full');
      break;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      if (callbacks.onError) callbacks.onError(`${file.name}: unsupported format (use JPG, PNG, GIF, or WebP)`);
      continue;
    }

    if (file.size > HARD_REJECT_SIZE) {
      if (callbacks.onError) callbacks.onError(`${file.name}: file too large (max 50MB)`);
      continue;
    }

    try {
      if (callbacks.onSlotLoading) callbacks.onSlotLoading(listing.id, slot);

      const blob = file;
      const { thumbDataURL, width, height } = await generateThumbnail(blob);
      const key = makeKey(listing.id, slot);

      await saveImage(key, blob, {
        listingId: listing.id,
        slotIndex: slot,
        mimeType: file.type,
        width,
        height,
        fileSize: file.size
      });

      listing[`image_${slot}`] = `thumb:${thumbDataURL}`;
      listing[`_image_${slot}_ref`] = key;
      listing[`_image_${slot}_meta`] = { width, height, fileSize: file.size, mimeType: file.type };

      results.push({ slot, key, width, height });
      slot = findFirstEmptySlot(listing, slot + 1);
    } catch (err) {
      if (callbacks.onError) callbacks.onError(`${file.name}: ${err.message}`);
    }
  }

  if (callbacks.onComplete) callbacks.onComplete(results);
  return results;
}

export async function processImageURL(url, listing, slotIndex, callbacks = {}) {
  let fetchUrl = url;
  if (fetchUrl.includes('dropbox.com') && !fetchUrl.includes('dl=1')) {
    fetchUrl = fetchUrl.replace(/dl=0/, 'dl=1');
    if (!fetchUrl.includes('dl=1')) fetchUrl += (fetchUrl.includes('?') ? '&' : '?') + 'dl=1';
  }
  if (fetchUrl.includes('drive.google.com/file/d/')) {
    const match = fetchUrl.match(/\/d\/([^/]+)/);
    if (match) fetchUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }

  try {
    if (callbacks.onSlotLoading) callbacks.onSlotLoading(listing.id, slotIndex);
    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();

    if (!ACCEPTED_IMAGE_TYPES.includes(blob.type)) {
      throw new Error('URL did not return a supported image format');
    }

    return processImageFiles([new File([blob], 'url-image', { type: blob.type })], listing, slotIndex, callbacks);
  } catch (err) {
    if (callbacks.onError) callbacks.onError(`URL fetch failed: ${err.message}`);
    return [];
  }
}

export function reorderImages(listing, fromSlot, toSlot) {
  if (fromSlot === toSlot) return;

  const tmpImg = listing[`image_${fromSlot}`];
  const tmpRef = listing[`_image_${fromSlot}_ref`];
  const tmpMeta = listing[`_image_${fromSlot}_meta`];

  listing[`image_${fromSlot}`] = listing[`image_${toSlot}`] || '';
  listing[`_image_${fromSlot}_ref`] = listing[`_image_${toSlot}_ref`] || '';
  listing[`_image_${fromSlot}_meta`] = listing[`_image_${toSlot}_meta`] || null;

  listing[`image_${toSlot}`] = tmpImg || '';
  listing[`_image_${toSlot}_ref`] = tmpRef || '';
  listing[`_image_${toSlot}_meta`] = tmpMeta || null;
}

export async function removeImage(listing, slotIndex) {
  const ref = listing[`_image_${slotIndex}_ref`];
  if (ref) {
    try { await deleteImage(ref); } catch (e) { console.warn('IDB delete error:', e); }
  }
  listing[`image_${slotIndex}`] = '';
  listing[`_image_${slotIndex}_ref`] = '';
  listing[`_image_${slotIndex}_meta`] = null;
}

export async function removeAllImages(listingId) {
  try { await deleteImagesForListing(listingId); } catch (e) { console.warn('IDB cleanup error:', e); }
}

export async function getFullResolutionImages(listing) {
  const result = {};
  for (let i = 1; i <= MAX_SLOTS; i++) {
    const val = listing[`image_${i}`] || '';
    const ref = listing[`_image_${i}_ref`];

    if (ref) {
      const dataURL = await getImageAsDataURL(ref);
      if (dataURL) {
        result[`image_${i}`] = dataURL;
        continue;
      }
    }

    if (val.startsWith('thumb:')) {
      continue;
    }

    if (val.startsWith('data:') || val.startsWith('http')) {
      result[`image_${i}`] = val;
    }
  }
  return result;
}

export function getImageSrc(value) {
  if (!value) return '';
  if (value.startsWith('thumb:')) return value.slice(6);
  return value;
}

export function hasImage(value) {
  if (!value) return false;
  return value.startsWith('thumb:') || value.startsWith('data:') || value.startsWith('http');
}

export async function processDigitalFile(file, listing, callbacks = {}) {
  const key = `${listing.id}_digital_1`;
  try {
    await saveImage(key, file, {
      listingId: listing.id,
      slotIndex: 0,
      mimeType: file.type,
      fileSize: file.size
    });
    listing.digital_file_1 = `idb:${key}`;
    listing._digital_file_name = file.name;
    listing._digital_file_size = file.size;
    if (callbacks.onComplete) callbacks.onComplete();
  } catch (err) {
    if (callbacks.onError) callbacks.onError(err.message);
  }
}

export async function removeDigitalFile(listing) {
  const val = listing.digital_file_1 || '';
  if (val.startsWith('idb:')) {
    const key = val.slice(4);
    try { await deleteImage(key); } catch (e) { console.warn('IDB delete error:', e); }
  }
  listing.digital_file_1 = '';
  listing._digital_file_name = '';
  listing._digital_file_size = 0;
}

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function showLightbox(listing, slotIndex) {
  const val = listing[`image_${slotIndex}`] || '';
  const ref = listing[`_image_${slotIndex}_ref`];
  const meta = listing[`_image_${slotIndex}_meta`];

  const lightbox = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  const caption = document.getElementById('lightbox-caption');
  if (!lightbox || !img) return;

  if (ref) {
    getImageAsDataURL(ref).then(dataURL => {
      if (dataURL) img.src = dataURL;
      else img.src = getImageSrc(val);
    }).catch(() => {
      img.src = getImageSrc(val);
    });
  } else {
    img.src = getImageSrc(val);
  }

  let captionText = `Slot ${slotIndex}`;
  if (meta) {
    captionText = `${meta.width} x ${meta.height} px`;
    if (meta.fileSize) captionText += ` | ${formatFileSize(meta.fileSize)}`;
  }
  caption.textContent = captionText;

  lightbox.style.display = 'flex';
  document.body.classList.add('lightbox-open');
}

export function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.style.display = 'none';
    document.getElementById('lightbox-img').src = '';
  }
  document.body.classList.remove('lightbox-open');
}

export { MAX_SLOTS, MIN_IMAGE_DIMENSION, MAX_IMAGE_SIZE_BYTES };
