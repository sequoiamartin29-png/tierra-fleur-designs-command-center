export const DESIGN_STUDIO_SCHEMA_VERSION = 6;
export const DESIGN_CANVAS_WIDTH = 1200;
export const DESIGN_CANVAS_HEIGHT = 760;
export const DESIGN_HISTORY_LIMIT = 30;

export const DESIGN_STATUS_OPTIONS = [
  'Draft',
  'Internal Review',
  'Ready to Present',
  'Presented',
  'Needs Revision',
  'Recommended',
  'Client Selected',
  'Approved',
  'Declined',
  'Archived',
];

export const DESIGN_COLORS = {
  olive: '#66745b',
  deepGreen: '#304a3a',
  blush: '#d9aaa5',
  dustyRose: '#aa7775',
  gold: '#b18a4a',
  cream: '#fff7e9',
  charcoal: '#39423b',
  blueGray: '#74858a',
  white: '#ffffff',
};

export const DEFAULT_DESIGN_LAYERS = [
  ['Background Photo', 'background', false, true],
  ['Existing Features', 'existing', true, true],
  ['Site Conditions', 'site', false, false],
  ['Sun and Shade', 'sun', false, false],
  ['Measurements', 'measurements', true, true],
  ['Bed Outlines', 'beds', true, true],
  ['Plants', 'plants', true, true],
  ['Mature Spread', 'mature', true, true],
  ['Materials', 'materials', true, true],
  ['Structures', 'structures', true, true],
  ['Irrigation', 'irrigation', false, false],
  ['Lighting', 'lighting', true, true],
  ['Labels', 'labels', true, true],
  ['Notes', 'notes', false, false],
];

export const MATERIAL_PATTERNS = {
  Mulch: 'mulch',
  Gravel: 'gravel',
  Stone: 'stone',
  Grass: 'grass',
  Water: 'water',
  Soil: 'soil',
  Pavers: 'pavers',
  'Raised bed': 'raised-bed',
};

const TEMPLATE_BLUEPRINTS = [
  ['Front Foundation Bed', 'A welcoming layered foundation composition', [
    ['polygon', 'Bed outline', 'Bed Outlines', 140, 390, 850, 220],
    ['label', 'Front foundation bed', 'Labels', 420, 425, 260, 54],
  ]],
  ['Container Garden', 'A flexible grouping for entryways and patios', [
    ['structure', 'Statement container', 'Structures', 310, 280, 120, 120],
    ['structure', 'Companion container', 'Structures', 500, 330, 95, 95],
    ['label', 'Container grouping', 'Labels', 370, 465, 250, 54],
  ]],
  ['Patio Orchard', 'A small fruit-tree arrangement for outdoor living', [
    ['plant', 'Fruit tree placeholder', 'Plants', 280, 250, 74, 74],
    ['plant', 'Fruit tree placeholder', 'Plants', 510, 230, 74, 74],
    ['plant', 'Fruit tree placeholder', 'Plants', 740, 270, 74, 74],
    ['label', 'Patio orchard', 'Labels', 470, 410, 230, 54],
  ]],
  ['Pollinator Border', 'A flowing perennial border with repeating groups', [
    ['polygon', 'Pollinator border', 'Bed Outlines', 115, 410, 960, 190],
    ['plant', 'Perennial cluster', 'Plants', 275, 455, 70, 70],
    ['plant', 'Perennial cluster', 'Plants', 515, 470, 70, 70],
    ['plant', 'Perennial cluster', 'Plants', 755, 450, 70, 70],
  ]],
  ['Herb Garden', 'An orderly kitchen-garden planting area', [
    ['shape', 'Herb garden bed', 'Bed Outlines', 330, 230, 480, 310],
    ['label', 'Culinary herbs', 'Labels', 450, 360, 240, 54],
  ]],
  ['Raised Vegetable Bed', 'A practical raised-bed starting point', [
    ['material', 'Raised bed', 'Materials', 300, 230, 260, 390],
    ['material', 'Raised bed', 'Materials', 650, 230, 260, 390],
    ['measurement', 'Path width', 'Measurements', 565, 430, 80, 18],
  ]],
  ['Privacy Screen', 'A repeated planting rhythm for gentle screening', [
    ['plant', 'Screening plant', 'Plants', 230, 300, 84, 84],
    ['plant', 'Screening plant', 'Plants', 430, 300, 84, 84],
    ['plant', 'Screening plant', 'Plants', 630, 300, 84, 84],
    ['plant', 'Screening plant', 'Plants', 830, 300, 84, 84],
  ]],
  ['Sensory Garden', 'A curved bed for fragrance, texture, and sound', [
    ['polygon', 'Sensory bed', 'Bed Outlines', 185, 260, 820, 310],
    ['label', 'Fragrance • texture • movement', 'Labels', 410, 385, 390, 54],
  ]],
  ['Entryway Planters', 'A balanced pair of entry containers', [
    ['structure', 'Entry planter', 'Structures', 330, 300, 125, 125],
    ['structure', 'Entry planter', 'Structures', 745, 300, 125, 125],
    ['label', 'Entry', 'Labels', 535, 340, 130, 54],
  ]],
  ['Micro-Orchard', 'A compact edible grove with approximate spacing', [
    ['plant', 'Fruit tree placeholder', 'Plants', 300, 225, 84, 84],
    ['plant', 'Fruit tree placeholder', 'Plants', 580, 225, 84, 84],
    ['plant', 'Fruit tree placeholder', 'Plants', 440, 470, 84, 84],
    ['measurement', 'Approximate spacing', 'Measurements', 390, 285, 270, 18],
  ]],
];

const now = () => new Date().toISOString();
const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
const records = value => Array.isArray(value) ? value : [];
const bool = value => value === true;
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const slug = value => String(value || 'record').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const copy = value => JSON.parse(JSON.stringify(value));

export function createDefaultDesignLayers({ projectId = '', clientId = '', conceptId = '' } = {}) {
  return DEFAULT_DESIGN_LAYERS.map(([name, key, clientVisible, exportEnabled], order) => ({
    id: `design-layer-${slug(conceptId)}-${key}`,
    layerId: `design-layer-${slug(conceptId)}-${key}`,
    projectId,
    clientId,
    conceptId,
    name,
    order,
    visible: true,
    locked: name === 'Background Photo',
    clientVisible,
    presentationVisible: clientVisible,
    exportEnabled,
    archived: false,
    createdAt: now(),
    updatedAt: now(),
  }));
}

export function createCanvasSettings({ projectId = '', clientId = '', conceptId = '' } = {}) {
  const id = `design-canvas-${slug(conceptId)}`;
  return {
    id,
    canvasSettingId: id,
    projectId,
    clientId,
    conceptId,
    backgroundPhotoId: '',
    backgroundVisible: true,
    backgroundOpacity: 0.82,
    backgroundRotation: 0,
    backgroundZoom: 1,
    backgroundPanX: 0,
    backgroundPanY: 0,
    backgroundFit: 'cover',
    viewportZoom: 1,
    viewportPanX: 0,
    viewportPanY: 0,
    gridVisible: false,
    showAllMatureSpread: true,
    scaleCalibration: {
      calibrated: false,
      pixelsPerFoot: 0,
      pixelsPerInch: 0,
      referenceObjectId: '',
      referencePixels: 0,
      realLength: 0,
      unit: 'ft',
      note: 'Approximate visual planning aid — not a survey.',
    },
    presentationLayerIds: [],
    updatedAt: now(),
    revision: 0,
    archived: false,
  };
}

function seedTemplates() {
  return TEMPLATE_BLUEPRINTS.map(([name, description, objects], index) => ({
    id: `design-template-${String(index + 1).padStart(2, '0')}`,
    templateId: `design-template-${String(index + 1).padStart(2, '0')}`,
    name,
    description,
    defaultLayers: DEFAULT_DESIGN_LAYERS.map(([layerName]) => layerName),
    objects: objects.map(([objectType, label, layerName, x, y, width, height], objectIndex) => ({
      templateObjectId: `template-${index + 1}-${objectIndex + 1}`,
      objectType,
      label,
      layerName,
      x,
      y,
      width,
      height,
    })),
    presentationDefaults: { showLegend: true, showMeasurements: true },
    builtIn: true,
    archived: false,
  }));
}

export function createDesignStudioStarter() {
  return {
    designStudioSchemaVersion: DESIGN_STUDIO_SCHEMA_VERSION,
    designObjects: [],
    designLayers: [],
    designCanvasSettings: [],
    designVersions: [],
    designNotes: [],
    designTemplates: seedTemplates(),
    designLegendSettings: [],
    designExportSettings: [],
  };
}

export function createDesignObject(input = {}) {
  const objectId = input.objectId || input.id || uid('design-object');
  return {
    id: objectId,
    objectId,
    projectId: input.projectId || '',
    clientId: input.clientId || '',
    conceptId: input.conceptId || '',
    layerId: input.layerId || '',
    objectType: input.objectType || 'annotation',
    x: finite(input.x, 120),
    y: finite(input.y, 120),
    width: Math.max(8, finite(input.width, 120)),
    height: Math.max(8, finite(input.height, 80)),
    rotation: finite(input.rotation, 0),
    zIndex: finite(input.zIndex, 1),
    opacity: Math.max(0.05, Math.min(1, finite(input.opacity, 1))),
    locked: bool(input.locked),
    visible: input.visible !== false,
    clientVisible: bool(input.clientVisible),
    exportEnabled: input.exportEnabled !== false,
    style: {
      stroke: input.style?.stroke || DESIGN_COLORS.olive,
      strokeWidth: Math.max(1, finite(input.style?.strokeWidth, 4)),
      strokeOpacity: Math.max(0, Math.min(1, finite(input.style?.strokeOpacity, 1))),
      fill: input.style?.fill || DESIGN_COLORS.cream,
      fillOpacity: Math.max(0, Math.min(1, finite(input.style?.fillOpacity, 0.22))),
      lineStyle: input.style?.lineStyle || 'solid',
      fontSize: Math.max(12, finite(input.style?.fontSize, 24)),
      symbol: input.style?.symbol || 'canopy',
      pattern: input.style?.pattern || '',
      quantity: Math.max(1, finite(input.style?.quantity, 1)),
      installationArea: input.style?.installationArea || '',
      currentSpreadFeet: Math.max(0, finite(input.style?.currentSpreadFeet, 0)),
      matureSpreadFeet: Math.max(0, finite(input.style?.matureSpreadFeet, 0)),
      customSpreadFeet: Math.max(0, finite(input.style?.customSpreadFeet, 0)),
      showMatureSpread: bool(input.style?.showMatureSpread),
      showLabel: input.style?.showLabel !== false,
      syncDisposition: input.style?.syncDisposition || '',
      estimateDisposition: input.style?.estimateDisposition || '',
      category: input.style?.category || '',
      clientPrice: input.style?.clientPrice ?? '',
      finish: input.style?.finish || '',
      ...input.style,
    },
    points: records(input.points).map(point => ({ x: finite(point.x), y: finite(point.y) })),
    label: input.label || '',
    notes: input.notes || '',
    relatedProjectPlantId: input.relatedProjectPlantId || input.projectPlantId || '',
    relatedSourcingRecordId: input.relatedSourcingRecordId || input.sourcingRecordId || '',
    relatedMaterialId: input.relatedMaterialId || input.materialId || '',
    relatedEstimateId: input.relatedEstimateId || '',
    relatedEstimateLineId: input.relatedEstimateLineId || '',
    sourceKind: input.sourceKind || 'manual',
    legacySourceId: input.legacySourceId || '',
    createdAt: input.createdAt || now(),
    updatedAt: input.updatedAt || now(),
    archived: Boolean(input.archived),
  };
}

function normalizeLayer(item, fallback = {}) {
  const layerId = item.layerId || item.id || uid('design-layer');
  return {
    ...fallback,
    ...item,
    id: layerId,
    layerId,
    name: item.name || fallback.name || 'Layer',
    order: finite(item.order, fallback.order || 0),
    visible: item.visible !== false,
    locked: bool(item.locked),
    clientVisible: bool(item.clientVisible),
    presentationVisible: bool(item.presentationVisible),
    exportEnabled: item.exportEnabled !== false,
    archived: Boolean(item.archived),
    updatedAt: item.updatedAt || now(),
  };
}

function normalizeSettings(item, fallback) {
  return {
    ...fallback,
    ...item,
    id: item.id || item.canvasSettingId || fallback.id,
    canvasSettingId: item.canvasSettingId || item.id || fallback.canvasSettingId,
    backgroundVisible: item.backgroundVisible !== false,
    backgroundOpacity: Math.max(0, Math.min(1, finite(item.backgroundOpacity, fallback.backgroundOpacity))),
    backgroundRotation: finite(item.backgroundRotation, 0),
    backgroundZoom: Math.max(0.25, finite(item.backgroundZoom, 1)),
    backgroundPanX: finite(item.backgroundPanX, 0),
    backgroundPanY: finite(item.backgroundPanY, 0),
    viewportZoom: Math.max(0.35, finite(item.viewportZoom, 1)),
    viewportPanX: finite(item.viewportPanX, 0),
    viewportPanY: finite(item.viewportPanY, 0),
    showAllMatureSpread: item.showAllMatureSpread !== false,
    scaleCalibration: {
      ...fallback.scaleCalibration,
      ...(item.scaleCalibration || {}),
      calibrated: bool(item.scaleCalibration?.calibrated),
      pixelsPerFoot: Math.max(0, finite(item.scaleCalibration?.pixelsPerFoot, 0)),
      pixelsPerInch: Math.max(0, finite(item.scaleCalibration?.pixelsPerInch, 0)),
    },
    presentationLayerIds: records(item.presentationLayerIds),
    revision: Math.max(0, finite(item.revision, 0)),
    archived: Boolean(item.archived),
  };
}

function legacyLayerName(placement) {
  const name = String(placement.layer || '');
  if (/tree|shrub|flower|container/i.test(name) || placement.type === 'plant') return 'Plants';
  if (/light/i.test(name)) return 'Lighting';
  if (/irrig/i.test(name)) return 'Irrigation';
  if (/note/i.test(name)) return 'Notes';
  if (/measure/i.test(name)) return 'Measurements';
  if (/hardscape/i.test(name) || placement.type === 'material') return 'Materials';
  return 'Existing Features';
}

function legacyObject(concept, placement, index, layers, clientId) {
  const layerName = legacyLayerName(placement);
  const layer = layers.find(item => item.name === layerName) || layers[1];
  const stableSource = placement.id || `${placement.type || 'object'}-${index + 1}`;
  const objectId = `design-object-legacy-${slug(concept.designId || concept.id)}-${slug(stableSource)}`;
  return createDesignObject({
    objectId,
    projectId: concept.projectId,
    clientId,
    conceptId: concept.designId || concept.id,
    layerId: layer.layerId,
    objectType: placement.type === 'plant' ? 'plant' : placement.type === 'material' ? 'material' : 'annotation',
    x: finite(placement.x, 12) / 100 * DESIGN_CANVAS_WIDTH,
    y: finite(placement.y, 12) / 100 * DESIGN_CANVAS_HEIGHT,
    width: placement.type === 'plant' ? 70 : 120,
    height: placement.type === 'plant' ? 70 : 70,
    label: placement.label || 'Legacy design object',
    relatedProjectPlantId: placement.projectPlantId || '',
    relatedSourcingRecordId: placement.sourcingRecordId || '',
    relatedMaterialId: placement.materialId || placement.sourceId || '',
    sourceKind: 'legacy',
    legacySourceId: stableSource,
    notes: 'Migrated from the earlier Design Canvas and retained as a legacy design object.',
    style: {
      symbol: placement.type === 'plant' ? 'canopy' : 'material',
      fill: placement.type === 'plant' ? DESIGN_COLORS.olive : DESIGN_COLORS.gold,
      fillOpacity: 0.32,
    },
  });
}

export function migrateDesignStudioData(saved = {}, related = {}) {
  const concepts = records(related.designConcepts || saved.designConcepts);
  const projects = records(related.projects || saved.projects);
  const clients = records(related.clients || saved.clients);
  const projectClient = projectId => {
    const project = projects.find(item => item.projectId === projectId);
    return project?.clientId || clients.find(item => (item.clientId || item.id) === project?.clientId)?.clientId || '';
  };

  const existingLayers = records(saved.designLayers).map(item => normalizeLayer(item));
  const designLayers = [...existingLayers];
  const settings = records(saved.designCanvasSettings);
  const designCanvasSettings = [];

  concepts.forEach(concept => {
    const conceptId = concept.designId || concept.id;
    const clientId = projectClient(concept.projectId);
    const defaults = createDefaultDesignLayers({ projectId: concept.projectId, clientId, conceptId });
    const current = existingLayers.filter(item => item.conceptId === conceptId);
    defaults.forEach(defaultLayer => {
      if (!current.some(item => item.name === defaultLayer.name)) designLayers.push(defaultLayer);
    });
    const completeLayers = designLayers.filter(item => item.conceptId === conceptId);
    const existingSetting = settings.find(item => item.conceptId === conceptId) || {};
    const fallback = createCanvasSettings({ projectId: concept.projectId, clientId, conceptId });
    designCanvasSettings.push(normalizeSettings({
      ...existingSetting,
      backgroundPhotoId: existingSetting.backgroundPhotoId || concept.canvas?.basePhotoId || '',
      viewportZoom: existingSetting.viewportZoom || concept.canvas?.zoom || 1,
      viewportPanX: existingSetting.viewportPanX ?? concept.canvas?.panX ?? 0,
      viewportPanY: existingSetting.viewportPanY ?? concept.canvas?.panY ?? 0,
      gridVisible: existingSetting.gridVisible ?? concept.canvas?.gridVisible ?? false,
      presentationLayerIds: records(existingSetting.presentationLayerIds).length
        ? existingSetting.presentationLayerIds
        : completeLayers.filter(layer => layer.presentationVisible).map(layer => layer.layerId),
    }, fallback));
  });

  const normalizedObjects = records(saved.designObjects).map(createDesignObject);
  const designObjects = [...normalizedObjects];
  const legacyKeys = new Set(normalizedObjects.map(item => `${item.conceptId}:${item.legacySourceId}`).filter(key => !key.endsWith(':')));
  concepts.forEach(concept => {
    const conceptId = concept.designId || concept.id;
    const layers = designLayers.filter(item => item.conceptId === conceptId);
    records(concept.canvas?.placements).forEach((placement, index) => {
      const stableSource = placement.id || `${placement.type || 'object'}-${index + 1}`;
      const key = `${conceptId}:${stableSource}`;
      if (legacyKeys.has(key)) return;
      designObjects.push(legacyObject(concept, placement, index, layers, projectClient(concept.projectId)));
      legacyKeys.add(key);
    });
  });

  const templates = records(saved.designTemplates);
  const templateById = new Map(templates.map(item => [item.templateId || item.id, item]));
  const designTemplates = [
    ...templates.map(item => ({ ...item, templateId: item.templateId || item.id, archived: Boolean(item.archived) })),
    ...seedTemplates().filter(item => !templateById.has(item.templateId)),
  ];

  return {
    designStudioSchemaVersion: DESIGN_STUDIO_SCHEMA_VERSION,
    designObjects,
    designLayers: designLayers.map((item, index) => normalizeLayer(item, { order: index })),
    designCanvasSettings,
    designVersions: records(saved.designVersions).map(item => {
      const versionId = item.versionId || item.id || uid('design-version');
      return {
        ...item,
        id: versionId,
        versionId,
        name: item.name || 'Saved design version',
        status: DESIGN_STATUS_OPTIONS.includes(item.status) ? item.status : 'Draft',
        revisionNotes: item.revisionNotes || '',
        recommended: bool(item.recommended || item.status === 'Recommended'),
        clientSelected: bool(item.clientSelected || item.status === 'Client Selected'),
        approvedAt: item.approvedAt || '',
        snapshot: {
          objects: records(item.snapshot?.objects).map(createDesignObject),
          layers: records(item.snapshot?.layers).map(layer => normalizeLayer(layer)),
          canvasSettings: item.snapshot?.canvasSettings || null,
          legendSettings: item.snapshot?.legendSettings || null,
          displaySettings: item.snapshot?.displaySettings || null,
          capturedAt: item.snapshot?.capturedAt || item.createdAt || now(),
        },
        createdAt: item.createdAt || now(),
        updatedAt: item.updatedAt || item.createdAt || now(),
        archived: Boolean(item.archived || item.status === 'Archived'),
      };
    }),
    designNotes: records(saved.designNotes).map(item => {
      const noteId = item.noteId || item.id || uid('design-note');
      return {
        id: noteId,
        noteId,
        projectId: item.projectId || '',
        clientId: item.clientId || '',
        conceptId: item.conceptId || '',
        versionId: item.versionId || '',
        category: item.category || 'Other',
        text: item.text || '',
        authorLabel: item.authorLabel || 'Tierra Fleur Designs',
        clientVisible: bool(item.clientVisible),
        relatedObjectId: item.relatedObjectId || '',
        relatedProjectPlantId: item.relatedProjectPlantId || '',
        relatedMaterialId: item.relatedMaterialId || '',
        resolved: bool(item.resolved),
        createdAt: item.createdAt || now(),
        updatedAt: item.updatedAt || item.createdAt || now(),
        archived: Boolean(item.archived),
      };
    }),
    designTemplates,
    designLegendSettings: records(saved.designLegendSettings).map(item => ({
      groupPlantsBy: 'Area',
      groupMaterialsBy: 'Type',
      showScientificNames: true,
      showQuantities: true,
      ...item,
      archived: Boolean(item.archived),
    })),
    designExportSettings: records(saved.designExportSettings).map(item => ({
      includeLegends: true,
      includeMeasurements: true,
      includeBranding: true,
      includeTitle: true,
      clientSafe: true,
      ...item,
      archived: Boolean(item.archived),
    })),
  };
}

export function createVersionSnapshot({ objects, layers, canvasSettings, legendSettings, displaySettings }) {
  return {
    objects: copy(records(objects)),
    layers: copy(records(layers)),
    canvasSettings: copy(canvasSettings || null),
    legendSettings: copy(legendSettings || null),
    displaySettings: copy(displaySettings || null),
    capturedAt: now(),
  };
}

export function createDesignVersion(input) {
  const versionId = input.versionId || uid('design-version');
  return {
    id: versionId,
    versionId,
    projectId: input.projectId,
    clientId: input.clientId || '',
    conceptId: input.conceptId,
    parentVersionId: input.parentVersionId || '',
    name: input.name || 'Saved design version',
    status: input.status || 'Draft',
    revisionNotes: input.revisionNotes || '',
    recommended: bool(input.recommended),
    clientSelected: bool(input.clientSelected),
    approvedAt: input.approvedAt || '',
    snapshot: createVersionSnapshot(input),
    createdAt: now(),
    updatedAt: now(),
    archived: false,
  };
}

export function compareDesignVersions(left, right) {
  const leftObjects = records(left?.snapshot?.objects).filter(item => !item.archived);
  const rightObjects = records(right?.snapshot?.objects).filter(item => !item.archived);
  const fingerprint = item => [
    item.objectType,
    item.relatedProjectPlantId,
    item.relatedMaterialId,
    item.label,
    item.style?.quantity || 1,
  ].join('|');
  const leftCounts = new Map();
  const rightCounts = new Map();
  leftObjects.forEach(item => leftCounts.set(fingerprint(item), (leftCounts.get(fingerprint(item)) || 0) + 1));
  rightObjects.forEach(item => rightCounts.set(fingerprint(item), (rightCounts.get(fingerprint(item)) || 0) + 1));
  const added = [];
  const removed = [];
  new Set([...leftCounts.keys(), ...rightCounts.keys()]).forEach(key => {
    const delta = (rightCounts.get(key) || 0) - (leftCounts.get(key) || 0);
    if (delta > 0) added.push({ key, count: delta, label: key.split('|')[3] || key.split('|')[0] });
    if (delta < 0) removed.push({ key, count: Math.abs(delta), label: key.split('|')[3] || key.split('|')[0] });
  });
  const plantQuantity = objects => objects.filter(item => item.objectType === 'plant').reduce((sum, item) => sum + finite(item.style?.quantity, 1), 0);
  const clientPrice = objects => objects.reduce((sum, item) => sum + finite(item.style?.clientPrice, 0) * finite(item.style?.quantity, 1), 0);
  return {
    added,
    removed,
    leftPlants: plantQuantity(leftObjects),
    rightPlants: plantQuantity(rightObjects),
    leftMaterials: leftObjects.filter(item => item.objectType === 'material').length,
    rightMaterials: rightObjects.filter(item => item.objectType === 'material').length,
    leftClientPrice: clientPrice(leftObjects),
    rightClientPrice: clientPrice(rightObjects),
  };
}

export function applyDesignTemplate(template, context) {
  const layers = records(context.layers);
  const maxZ = records(context.objects).reduce((max, item) => Math.max(max, finite(item.zIndex, 0)), 0);
  return records(template?.objects).map((item, index) => {
    const layer = layers.find(record => record.name === item.layerName) || layers.find(record => record.name === 'Notes') || layers[0];
    return createDesignObject({
      projectId: context.projectId,
      clientId: context.clientId,
      conceptId: context.conceptId,
      layerId: layer?.layerId || '',
      objectType: item.objectType,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      zIndex: maxZ + index + 1,
      label: item.label,
      sourceKind: 'template',
      clientVisible: item.objectType !== 'annotation',
      style: item.objectType === 'plant'
        ? { symbol: /fruit/i.test(item.label) ? 'fruit-tree' : 'perennial-cluster', fill: DESIGN_COLORS.olive, fillOpacity: 0.32 }
        : item.objectType === 'material'
          ? { pattern: /raised/i.test(item.label) ? 'raised-bed' : 'soil', fill: DESIGN_COLORS.gold, fillOpacity: 0.28 }
          : {},
    });
  });
}

export function measurementLabel(object, settings) {
  const pixels = Math.hypot(finite(object.width), finite(object.height));
  const calibration = settings?.scaleCalibration;
  if (!calibration?.calibrated || !finite(calibration.pixelsPerFoot)) return `${object.label || 'Measurement'} — uncalibrated`;
  const feet = pixels / finite(calibration.pixelsPerFoot);
  const wholeFeet = Math.floor(feet);
  const inches = Math.round((feet - wholeFeet) * 12);
  return `${object.label || 'Measurement'} ≈ ${wholeFeet}′ ${inches}″`;
}

export function spacingNotice(object, objects, settings) {
  if (object?.objectType !== 'plant') return '';
  const calibration = settings?.scaleCalibration;
  if (!calibration?.calibrated || !finite(calibration.pixelsPerFoot)) return 'Scale unavailable';
  const spread = finite(object.style?.customSpreadFeet || object.style?.matureSpreadFeet, 0);
  if (!spread) return 'Mature size unavailable';
  const center = { x: finite(object.x) + finite(object.width) / 2, y: finite(object.y) + finite(object.height) / 2 };
  const peers = records(objects).filter(item => item.objectId !== object.objectId && item.objectType === 'plant' && !item.archived);
  let closest = Infinity;
  let combined = 0;
  peers.forEach(peer => {
    const peerSpread = finite(peer.style?.customSpreadFeet || peer.style?.matureSpreadFeet, 0);
    if (!peerSpread) return;
    const peerCenter = { x: finite(peer.x) + finite(peer.width) / 2, y: finite(peer.y) + finite(peer.height) / 2 };
    const feet = Math.hypot(center.x - peerCenter.x, center.y - peerCenter.y) / finite(calibration.pixelsPerFoot);
    if (feet < closest) {
      closest = feet;
      combined = spread / 2 + peerSpread / 2;
    }
  });
  if (!Number.isFinite(closest)) return 'Mature size available — no comparable neighbor';
  if (closest < combined) return 'Likely overlap';
  if (closest < combined * 1.25) return 'Close spacing';
  return 'Comfortable spacing';
}

export function designCostSummary(data, projectId, objects) {
  const activeObjects = records(objects).filter(item => !item.archived && item.visible !== false);
  const linkedPlantIds = new Set(activeObjects.map(item => item.relatedProjectPlantId).filter(Boolean));
  const plants = records(data.projectPlants).filter(item => item.projectId === projectId && linkedPlantIds.has(item.projectPlantId) && !item.archived);
  const plantTotal = plants.reduce((sum, item) => sum + finite(item.clientPrice) * finite(item.quantity, 1), 0);
  const materialTotal = activeObjects.filter(item => item.objectType === 'material').reduce((sum, item) => sum + finite(item.style?.clientPrice) * finite(item.style?.quantity, 1), 0);
  const estimates = records(data.estimates).filter(item => item.projectId === projectId && !item.archived && item.status !== 'Cancelled');
  const estimateLines = estimates.flatMap(item => records(item.lines));
  const categoryTotal = matcher => estimateLines.filter(line => matcher(String(line.category || line.description || '').toLowerCase()))
    .reduce((sum, line) => sum + finite(line.price) * finite(line.qty, 1), 0);
  const installation = categoryTotal(value => /install|labor/.test(value));
  const delivery = categoryTotal(value => /delivery|shipping/.test(value));
  const designServices = categoryTotal(value => /design|consult/.test(value));
  const addOns = records(data.addOnInterestRecords).filter(item => item.projectId === projectId && !item.archived && item.status !== 'Declined')
    .reduce((sum, item) => sum + finite(item.price), 0);
  return {
    plants: plantTotal,
    materials: materialTotal,
    installation,
    delivery,
    designServices,
    addOns,
    total: plantTotal + materialTotal + installation + delivery + designServices + addOns,
  };
}
