const ACCEPTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const IMAGE_DATABASE = 'tierra-fleur-attachments';
const IMAGE_DATABASE_VERSION = 1;
const IMAGE_STORE = 'project-photo-images';
const BACKUP_KEY = 'imageAttachmentBackup';
const DISPLAY_MAX_DIMENSION = 1800;
const MASTER_MAX_DIMENSION = 2800;

let databasePromise;

export const PROJECT_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif';

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The selected photo could not be read.'));
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('A saved photo could not be added to the backup.'));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(value) {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(String(value || ''));
  if (!match) throw new Error('The saved photo data is not readable.');
  const type = match[1] || 'application/octet-stream';
  const encoded = match[3] || '';
  const binary = match[2] ? atob(encoded) : decodeURIComponent(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type });
}

function isInlineImage(value) {
  return /^data:image\//i.test(String(value || ''));
}

function isTransientImage(value) {
  return /^(?:blob:|data:image\/)/i.test(String(value || ''));
}

async function decodePhoto(file) {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // Safari may decode a supported phone format through an HTML image instead.
    }
  }

  const sourceUrl = await fileToDataUrl(file);
  const image = new Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('This photo format is not supported by this browser. Try JPEG, PNG, or WebP.'));
    image.src = sourceUrl;
  });
  return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => {} };
}

function canvasToJpeg(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('The resized photo could not be prepared for storage.'));
    }, 'image/jpeg', quality);
  });
}

async function renderPhoto(decoded, maxDimension, quality) {
  const scale = Math.min(1, maxDimension / Math.max(decoded.width, decoded.height));
  const width = Math.max(1, Math.round(decoded.width * scale));
  const height = Math.max(1, Math.round(decoded.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Photo resizing is not available in this browser.');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  context.drawImage(decoded.source, 0, 0, width, height);
  return { blob: await canvasToJpeg(canvas, quality), width, height };
}

function openImageDatabase() {
  if (!('indexedDB' in globalThis)) return Promise.reject(new Error('IndexedDB is not available on this device.'));
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_DATABASE, IMAGE_DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IMAGE_STORE)) request.result.createObjectStore(IMAGE_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Photo storage could not be opened.'));
    request.onblocked = () => reject(new Error('Photo storage is blocked by another open Tierra Fleur window.'));
  }).catch(error => {
    databasePromise = undefined;
    throw error;
  });
  return databasePromise;
}

async function putAttachments(attachments) {
  if (!attachments.length) return;
  const database = await openImageDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(IMAGE_STORE, 'readwrite');
    const store = transaction.objectStore(IMAGE_STORE);
    attachments.forEach(attachment => store.put(attachment));
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('The photo could not be saved to device storage.'));
    transaction.onabort = () => reject(transaction.error || new Error('The photo save was cancelled by the device.'));
  });
}

async function getAttachment(id) {
  if (!id) return null;
  const database = await openImageDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(IMAGE_STORE, 'readonly').objectStore(IMAGE_STORE).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('A saved photo could not be loaded.'));
  });
}

async function deleteAttachments(ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length || !('indexedDB' in globalThis)) return;
  const database = await openImageDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(IMAGE_STORE, 'readwrite');
    const store = transaction.objectStore(IMAGE_STORE);
    uniqueIds.forEach(id => store.delete(id));
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('The saved photo attachment could not be removed.'));
    transaction.onabort = () => reject(transaction.error || new Error('The saved photo attachment removal was cancelled.'));
  });
}

function attachmentIds(photo) {
  return [photo?.imageAttachmentId, photo?.originalImageAttachmentId].filter(Boolean);
}

function imageKeys(photoId) {
  return {
    display: `project-photo:${photoId}:display`,
    original: `project-photo:${photoId}:original`,
  };
}

export async function prepareProjectPhoto(file, maxDimension = DISPLAY_MAX_DIMENSION) {
  if (!file) throw new Error('Choose a photo first.');
  const extensionAccepted = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || '');
  if (!ACCEPTED_IMAGE_TYPES.has(String(file.type || '').toLowerCase()) && !extensionAccepted) {
    throw new Error('Choose a JPEG, PNG, WebP, HEIC, or HEIF photo.');
  }

  let decoded;
  try {
    decoded = await decodePhoto(file);
    if (!decoded.width || !decoded.height) throw new Error('The selected photo has no readable dimensions.');
    const display = await renderPhoto(decoded, maxDimension, 0.82);
    const master = Math.max(decoded.width, decoded.height) > maxDimension
      ? await renderPhoto(decoded, Math.max(maxDimension, MASTER_MAX_DIMENSION), 0.88)
      : display;
    return {
      data: URL.createObjectURL(display.blob),
      originalData: master === display ? '' : URL.createObjectURL(master.blob),
      displayBlob: display.blob,
      originalBlob: master.blob,
      originalName: file.name || 'project-photo',
      originalType: file.type || '',
      originalSize: Number(file.size || 0),
      name: String(file.name || 'project-photo').replace(/\.(heic|heif|png|webp)$/i, '.jpg'),
      type: display.blob.type,
      width: display.width,
      height: display.height,
      originalWidth: decoded.width,
      originalHeight: decoded.height,
      storedWidth: master.width,
      storedHeight: master.height,
      storedSize: master.blob.size,
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('The photo could not be prepared. Choose another image and try again.');
  } finally {
    decoded?.close();
  }
}

export async function prepareAcademyEvidence(file) {
  const prepared = await prepareProjectPhoto(file, 1400);
  try {
    return {
      evidenceId: `academy-evidence-${crypto.randomUUID()}`,
      data: await blobToDataUrl(prepared.displayBlob),
      name: prepared.name || prepared.originalName || 'academy-evidence.jpg',
      type: prepared.type || 'image/jpeg',
      width: prepared.width,
      height: prepared.height,
      originalName: prepared.originalName || '',
      createdAt: new Date().toISOString(),
    };
  } finally {
    releasePreparedProjectPhoto(prepared);
  }
}

export function releasePreparedProjectPhoto(prepared) {
  if (String(prepared?.data || '').startsWith('blob:')) URL.revokeObjectURL(prepared.data);
  if (String(prepared?.originalData || '').startsWith('blob:')) URL.revokeObjectURL(prepared.originalData);
}

export async function storePreparedProjectPhoto(photoId, prepared) {
  if (!photoId || !prepared?.displayBlob || !prepared?.originalBlob) throw new Error('The prepared property photo is incomplete. Choose it again.');
  const keys = imageKeys(photoId);
  const sameImage = prepared.displayBlob === prepared.originalBlob;
  const savedAt = new Date().toISOString();
  const attachments = [{
    id: keys.display,
    blob: prepared.displayBlob,
    kind: 'display',
    fileName: prepared.name,
    type: prepared.displayBlob.type,
    width: prepared.width,
    height: prepared.height,
    updatedAt: savedAt,
  }];
  if (!sameImage) attachments.push({
    id: keys.original,
    blob: prepared.originalBlob,
    kind: 'original',
    fileName: prepared.originalName,
    type: prepared.originalBlob.type,
    width: prepared.storedWidth,
    height: prepared.storedHeight,
    updatedAt: savedAt,
  });
  try {
    await putAttachments(attachments);
  } catch (error) {
    throw new Error(error instanceof Error ? `The property photo was not saved: ${error.message}` : 'The property photo was not saved to this device.');
  }
  return {
    imageAttachmentId: keys.display,
    originalImageAttachmentId: sameImage ? keys.display : keys.original,
    image: URL.createObjectURL(prepared.displayBlob),
    originalImage: sameImage ? '' : URL.createObjectURL(prepared.originalBlob),
  };
}

async function externalizeLegacyPhoto(photo) {
  const stablePhotoId = photo.photoId || photo.id;
  if (!stablePhotoId) return { photo, error: null };
  const keys = imageKeys(stablePhotoId);
  const displayInline = isInlineImage(photo.image);
  const originalInline = isInlineImage(photo.originalImage);
  if (!displayInline && !originalInline) return { photo, error: null };

  try {
    const next = { ...photo };
    const attachments = [];
    if (displayInline) {
      const blob = dataUrlToBlob(photo.image);
      next.imageAttachmentId = next.imageAttachmentId || keys.display;
      attachments.push({ id: next.imageAttachmentId, blob, kind: 'display', fileName: photo.fileName || photo.originalName || '', type: blob.type, width: photo.width || 0, height: photo.height || 0, updatedAt: new Date().toISOString() });
    }
    if (originalInline) {
      if (photo.originalImage === photo.image && next.imageAttachmentId) {
        next.originalImageAttachmentId = next.imageAttachmentId;
      } else {
        const blob = dataUrlToBlob(photo.originalImage);
        next.originalImageAttachmentId = next.originalImageAttachmentId || keys.original;
        attachments.push({ id: next.originalImageAttachmentId, blob, kind: 'original', fileName: photo.originalName || photo.fileName || '', type: blob.type, width: photo.originalWidth || photo.width || 0, height: photo.originalHeight || photo.height || 0, updatedAt: new Date().toISOString() });
      }
    }
    if (!next.imageAttachmentId && next.originalImageAttachmentId && originalInline) next.imageAttachmentId = next.originalImageAttachmentId;
    if (!next.originalImageAttachmentId && next.imageAttachmentId && displayInline) next.originalImageAttachmentId = next.imageAttachmentId;
    await putAttachments(attachments);
    return { photo: next, error: null };
  } catch (error) {
    return { photo, error: error instanceof Error ? error : new Error('A legacy photo could not be moved to attachment storage.') };
  }
}

async function hydratePhoto(photo) {
  const next = { ...photo };
  const errors = [];
  if (next.imageAttachmentId && !next.image) {
    try {
      const attachment = await getAttachment(next.imageAttachmentId);
      if (!attachment?.blob) throw new Error(`Missing attachment ${next.imageAttachmentId}`);
      next.image = URL.createObjectURL(attachment.blob);
    } catch (error) {
      errors.push(error);
    }
  }
  if (next.originalImageAttachmentId && !next.originalImage) {
    if (next.originalImageAttachmentId === next.imageAttachmentId && next.image) {
      next.originalImage = next.image;
    } else {
      try {
        const attachment = await getAttachment(next.originalImageAttachmentId);
        if (!attachment?.blob) throw new Error(`Missing attachment ${next.originalImageAttachmentId}`);
        next.originalImage = URL.createObjectURL(attachment.blob);
      } catch (error) {
        errors.push(error);
      }
    }
  }
  return { photo: next, errors };
}

export async function prepareProjectPhotosForRuntime(data) {
  const photos = Array.isArray(data?.projectPhotos) ? data.projectPhotos : [];
  const migrated = await Promise.all(photos.map(externalizeLegacyPhoto));
  const hydrated = await Promise.all(migrated.map(result => hydratePhoto(result.photo)));
  const designConcepts = (Array.isArray(data?.designConcepts) ? data.designConcepts : []).map(concept => {
    if (!(concept.sourcePhotoId || concept.originalPhoto) || !isTransientImage(concept.currentPreview)) return concept;
    const next = { ...concept };
    delete next.currentPreview;
    return next;
  });
  return {
    data: { ...data, projectPhotos: hydrated.map(result => result.photo), designConcepts },
    errors: [
      ...migrated.map(result => result.error).filter(Boolean),
      ...hydrated.flatMap(result => result.errors),
    ],
  };
}

export function serializeDataForStorage(data) {
  const stored = { ...data };
  delete stored[BACKUP_KEY];
  stored.projectPhotos = (Array.isArray(data?.projectPhotos) ? data.projectPhotos : []).map(photo => {
    const next = { ...photo };
    if (next.imageAttachmentId) delete next.image;
    if (next.originalImageAttachmentId) delete next.originalImage;
    if (String(next.image || '').startsWith('blob:')) delete next.image;
    if (String(next.originalImage || '').startsWith('blob:')) delete next.originalImage;
    return next;
  });
  stored.designConcepts = (Array.isArray(data?.designConcepts) ? data.designConcepts : []).map(concept => {
    const next = { ...concept };
    if ((next.sourcePhotoId || next.originalPhoto) && isTransientImage(next.currentPreview)) delete next.currentPreview;
    return next;
  });
  return stored;
}

export async function buildDataBackup(data) {
  const stored = serializeDataForStorage(data);
  const ids = [...new Set(stored.projectPhotos.flatMap(attachmentIds))];
  const items = await Promise.all(ids.map(async id => {
    const attachment = await getAttachment(id);
    if (!attachment?.blob) throw new Error(`The backup stopped because saved photo attachment “${id}” is missing.`);
    return {
      id,
      data: await blobToDataUrl(attachment.blob),
      kind: attachment.kind || '',
      fileName: attachment.fileName || '',
      type: attachment.type || attachment.blob.type || '',
      width: Number(attachment.width || 0),
      height: Number(attachment.height || 0),
      updatedAt: attachment.updatedAt || '',
    };
  }));
  return { ...stored, [BACKUP_KEY]: { version: 1, items } };
}

export async function importDataBackup(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('That backup file does not contain Tierra Fleur records.');
  const saved = { ...value };
  const bundle = saved[BACKUP_KEY];
  delete saved[BACKUP_KEY];
  if (!bundle) return saved;
  if (bundle.version !== 1 || !Array.isArray(bundle.items)) throw new Error('The photo attachment section in this backup is not supported.');
  const attachments = bundle.items.map(item => {
    if (!item?.id || !isInlineImage(item.data)) throw new Error('A photo attachment in this backup is incomplete.');
    const blob = dataUrlToBlob(item.data);
    return { id: item.id, blob, kind: item.kind || '', fileName: item.fileName || '', type: item.type || blob.type, width: Number(item.width || 0), height: Number(item.height || 0), updatedAt: item.updatedAt || new Date().toISOString() };
  });
  await putAttachments(attachments);
  return saved;
}

export async function removeProjectPhotoAttachments(photo) {
  await deleteAttachments(attachmentIds(photo));
  if (String(photo?.image || '').startsWith('blob:')) URL.revokeObjectURL(photo.image);
  if (photo?.originalImage !== photo?.image && String(photo?.originalImage || '').startsWith('blob:')) URL.revokeObjectURL(photo.originalImage);
}
