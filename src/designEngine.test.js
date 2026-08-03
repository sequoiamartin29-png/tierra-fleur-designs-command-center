import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareDesignVersions,
  createCanvasSettings,
  createDefaultDesignLayers,
  createDesignArea,
  createDesignMask,
  createDesignMaterialDraft,
  createDesignObject,
  createDesignVersion,
  designCostSummary,
  migrateDesignStudioData,
} from './designEngine.js';

const project = { projectId: 'TFD-2026-901', clientId: 'client-test' };
const concept = { designId: 'design-manual-test', projectId: project.projectId, canvas: { placements: [] } };

test('manual editor migration preserves records and never duplicates them on refresh', () => {
  const layers = createDefaultDesignLayers({ projectId: project.projectId, clientId: project.clientId, conceptId: concept.designId });
  const settings = createCanvasSettings({ projectId: project.projectId, clientId: project.clientId, conceptId: concept.designId });
  const cover = createDesignObject({ objectId: 'design-object-cover', conceptId: concept.designId, projectId: project.projectId, layerId: layers.find(item => item.name === 'Ground Cover').layerId, objectType: 'cover', designAreaId: 'design-area-cover', label: 'Dark brown mulch' });
  const saved = { designLayers: layers, designCanvasSettings: [settings], designObjects: [cover], designAreas: [createDesignArea({ designAreaId: 'design-area-cover', objectId: cover.objectId, conceptId: concept.designId, projectId: project.projectId })], designMasks: [createDesignMask({ designMaskId: 'design-mask-cover', targetObjectId: cover.objectId, conceptId: concept.designId, projectId: project.projectId, points: [{ x: 1, y: 1 }, { x: 20, y: 20 }] })] };
  const first = migrateDesignStudioData(saved, { projects: [project], clients: [{ clientId: project.clientId }], designConcepts: [concept] });
  const second = migrateDesignStudioData(first, { projects: [project], clients: [{ clientId: project.clientId }], designConcepts: [concept] });
  assert.equal(second.designObjects.filter(item => item.objectId === cover.objectId).length, 1);
  assert.equal(second.designAreas.filter(item => item.designAreaId === 'design-area-cover').length, 1);
  assert.equal(second.designMasks.filter(item => item.designMaskId === 'design-mask-cover').length, 1);
  assert.equal(second.designLayers.filter(item => item.name === 'Original Photo').length, 1);
  assert.equal(second.designLayers.find(item => item.name === 'Original Photo').protectedLayer, true);
});

test('named versions preserve layers, objects, areas, masks, and material drafts', () => {
  const layers = createDefaultDesignLayers({ projectId: project.projectId, clientId: project.clientId, conceptId: concept.designId });
  const object = createDesignObject({ conceptId: concept.designId, projectId: project.projectId, layerId: layers[1].layerId, objectType: 'cover', designAreaId: 'design-area-version' });
  const area = createDesignArea({ designAreaId: 'design-area-version', objectId: object.objectId, conceptId: concept.designId, projectId: project.projectId });
  const mask = createDesignMask({ targetObjectId: object.objectId, conceptId: concept.designId, projectId: project.projectId, points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] });
  const material = createDesignMaterialDraft({ designAreaId: area.designAreaId, designObjectId: object.objectId, conceptId: concept.designId, projectId: project.projectId });
  const version = createDesignVersion({ projectId: project.projectId, clientId: project.clientId, conceptId: concept.designId, name: 'Version 1', objects: [object], layers, canvasSettings: createCanvasSettings({ projectId: project.projectId, conceptId: concept.designId }), areas: [area], masks: [mask], materialDrafts: [material] });
  assert.ok(version.designVersionId);
  assert.equal(version.snapshot.objects.length, 1);
  assert.equal(version.snapshot.areas[0].designAreaId, area.designAreaId);
  assert.equal(version.snapshot.masks[0].targetObjectId, object.objectId);
  assert.equal(version.snapshot.materialDrafts[0].designMaterialId, material.designMaterialId);
});

test('manual editor records expose stable IDs and a complete local element library', () => {
  const object = createDesignObject({ objectType: 'plant' });
  const migrated = migrateDesignStudioData({}, { projects: [], clients: [], designConcepts: [] });
  assert.ok(object.designElementId);
  assert.ok(createDesignArea().designAreaId);
  assert.ok(createDesignMask().designMaskId);
  assert.ok(createDesignMaterialDraft().designMaterialId);
  assert.ok(migrated.designElementLibrary.some(item => item.category === 'Fruit trees'));
  assert.ok(migrated.designElementLibrary.some(item => item.category === 'Garden art'));
});

test('cover, bed, border, and path records participate in material comparisons and client totals', () => {
  const materialTypes = ['cover', 'bed', 'border', 'path'];
  const objects = materialTypes.map((objectType, index) => createDesignObject({ objectType, style: { clientPrice: 10 + index, quantity: 2 } }));
  const left = createDesignVersion({ name: 'Earlier', objects: objects.slice(0, 2) });
  const right = createDesignVersion({ name: 'Later', objects });
  const comparison = compareDesignVersions(left, right);
  assert.equal(comparison.leftMaterials, 2);
  assert.equal(comparison.rightMaterials, 4);
  assert.equal(designCostSummary({ projectPlants: [], estimates: [], addOnInterestRecords: [] }, project.projectId, objects).materials, 92);
});
