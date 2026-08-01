const ACCEPTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export const PROJECT_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif';

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The selected photo could not be read.'));
    reader.readAsDataURL(file);
  });
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

function canvasToJpeg(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('The resized photo could not be prepared for storage.'));
    }, 'image/jpeg', 0.8);
  });
}

export async function prepareProjectPhoto(file, maxDimension = 1800) {
  if (!file) throw new Error('Choose a photo first.');
  const extensionAccepted = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || '');
  if (!ACCEPTED_IMAGE_TYPES.has(String(file.type || '').toLowerCase()) && !extensionAccepted) {
    throw new Error('Choose a JPEG, PNG, WebP, HEIC, or HEIF photo.');
  }

  let decoded;
  try {
    decoded = await decodePhoto(file);
    if (!decoded.width || !decoded.height) throw new Error('The selected photo has no readable dimensions.');
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
    const resized = await canvasToJpeg(canvas);
    return {
      data: await fileToDataUrl(resized),
      name: String(file.name || 'project-photo').replace(/\.(heic|heif|png|webp)$/i, '.jpg'),
      type: resized.type,
      width,
      height,
      originalType: file.type || '',
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('The photo could not be prepared. Choose another image and try again.');
  } finally {
    decoded?.close();
  }
}
