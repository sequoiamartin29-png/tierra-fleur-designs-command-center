import test from 'node:test';
import assert from 'node:assert/strict';
import { dataUrlToBlob, serializeDataForStorage } from './imageStorage.js';

test('stored photo records keep attachment references and omit runtime image payloads', () => {
  const stored = serializeDataForStorage({
    projectPhotos: [{
      id: 'photo-1',
      photoId: 'site-photo-1',
      caption: 'Back yard',
      imageAttachmentId: 'project-photo:site-photo-1:display',
      originalImageAttachmentId: 'project-photo:site-photo-1:original',
      image: 'blob:http://localhost/display',
      originalImage: 'data:image/jpeg;base64,b3JpZ2luYWw=',
    }],
    designConcepts: [{
      designId: 'design-1',
      sourcePhotoId: 'site-photo-1',
      currentPreview: 'data:image/jpeg;base64,cHJldmlldw==',
    }],
  });

  assert.equal(stored.projectPhotos[0].image, undefined);
  assert.equal(stored.projectPhotos[0].originalImage, undefined);
  assert.equal(stored.projectPhotos[0].imageAttachmentId, 'project-photo:site-photo-1:display');
  assert.equal(stored.projectPhotos[0].caption, 'Back yard');
  assert.equal(stored.designConcepts[0].sourcePhotoId, 'site-photo-1');
  assert.equal(stored.designConcepts[0].currentPreview, undefined);
});

test('legacy inline photos remain intact until attachment migration succeeds', () => {
  const image = 'data:image/jpeg;base64,bGVnYWN5';
  const stored = serializeDataForStorage({
    projectPhotos: [{ id: 'legacy-photo', image, originalImage: image }],
    designConcepts: [],
  });

  assert.equal(stored.projectPhotos[0].image, image);
  assert.equal(stored.projectPhotos[0].originalImage, image);
});

test('backup image data converts back to a typed blob', async () => {
  const blob = dataUrlToBlob('data:image/jpeg;base64,dGllcnJhLWZsZXVy');
  assert.equal(blob.type, 'image/jpeg');
  assert.equal(await blob.text(), 'tierra-fleur');
});
