import {
  BUILT_IN_DESIGN_ELEMENTS,
  normalizeDesignElement,
  resolveDesignVisualKey,
} from './designVisualLibrary.js';

export const DESIGN_STUDIO_SCHEMA_VERSION = 8;
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
  ['Original Photo', 'original-photo', true, true],
  ['Ground Cover', 'ground-cover', true, true],
  ['Beds', 'beds', true, true],
  ['Borders', 'borders', true, true],
  ['Paths and Pavers', 'paths-pavers', true, true],
  ['Plants', 'plants', true, true],
  ['Structures', 'structures', true, true],
  ['Furniture and Decor', 'furniture-decor', true, true],
  ['Lighting', 'lighting', true, true],
  ['Labels and Measurements', 'labels-measurements', true, true],
  ['Notes', 'notes', false, false],
];

export const MATERIAL_PATTERNS = {
  'Dark brown mulch': 'dark-mulch',
  'Black mulch': 'black-mulch',
  'Red mulch': 'red-mulch',
  'Pine bark': 'pine-bark',
  Compost: 'compost',
  Topsoil: 'topsoil',
  'Decorative stone': 'decorative-stone',
  'River rock': 'river-rock',
  'Pea gravel': 'pea-gravel',
  'White stone': 'white-stone',
  'Grey gravel': 'grey-gravel',
  'Lawn/grass': 'grass',
  Concrete: 'concrete',
  Pavers: 'pavers',
  Mulch: 'dark-mulch',
  Gravel: 'grey-gravel',
  Stone: 'decorative-stone',
  Grass: 'grass',
  Soil: 'topsoil',
  'Raised bed': 'raised-bed',
};

export const COVER_FILL_OPTIONS = [
  'Dark brown mulch', 'Black mulch', 'Red mulch', 'Pine bark', 'Compost', 'Topsoil',
  'Decorative stone', 'River rock', 'Pea gravel', 'White stone', 'Grey gravel',
  'Lawn/grass', 'Concrete', 'Pavers', 'Custom color', 'Custom texture reference',
];

export const BED_TYPES = ['Curved garden bed', 'Straight garden bed', 'Foundation bed', 'Island bed', 'Tree ring', 'Orchard row', 'Raised bed', 'Container grouping'];
export const BORDER_STYLES = ['Black metal edging', 'Brown metal edging', 'Plastic edging', 'Brick', 'Stone', 'Paver', 'Timber', 'Natural trench edge', 'Decorative border', 'Custom border'];
export const PATH_TYPES = ['Straight path', 'Curved path', 'Stepping stones', 'Paver walkway', 'Gravel path', 'Brick path', 'Flagstone path', 'Concrete pad', 'Small patio', 'Driveway-edge treatment'];

const TEMPLATE_BLUEPRINTS = [
  ['Front Foundation Bed', 'A welcoming layered foundation composition', [
    ['polygon', 'Bed outline', 'Beds', 140, 390, 850, 220],
    ['label', 'Front foundation bed', 'Labels and Measurements', 420, 425, 260, 54],
  ]],
  ['Container Garden', 'A flexible grouping for entryways and patios', [
    ['structure', 'Statement container', 'Structures', 310, 280, 120, 120],
    ['structure', 'Companion container', 'Structures', 500, 330, 95, 95],
    ['label', 'Container grouping', 'Labels and Measurements', 370, 465, 250, 54],
  ]],
  ['Patio Orchard', 'A small fruit-tree arrangement for outdoor living', [
    ['plant', 'Fruit tree placeholder', 'Plants', 280, 250, 74, 74],
    ['plant', 'Fruit tree placeholder', 'Plants', 510, 230, 74, 74],
    ['plant', 'Fruit tree placeholder', 'Plants', 740, 270, 74, 74],
    ['label', 'Patio orchard', 'Labels and Measurements', 470, 410, 230, 54],
  ]],
  ['Pollinator Border', 'A flowing perennial border with repeating groups', [
    ['polygon', 'Pollinator border', 'Beds', 115, 410, 960, 190],
    ['plant', 'Perennial cluster', 'Plants', 275, 455, 70, 70],
    ['plant', 'Perennial cluster', 'Plants', 515, 470, 70, 70],
    ['plant', 'Perennial cluster', 'Plants', 755, 450, 70, 70],
  ]],
  ['Herb Garden', 'An orderly kitchen-garden planting area', [
    ['shape', 'Herb garden bed', 'Beds', 330, 230, 480, 310],
    ['label', 'Culinary herbs', 'Labels and Measurements', 450, 360, 240, 54],
  ]],
  ['Raised Vegetable Bed', 'A practical raised-bed starting point', [
    ['material', 'Raised bed', 'Beds', 300, 230, 260, 390],
    ['material', 'Raised bed', 'Beds', 650, 230, 260, 390],
    ['measurement', 'Path width', 'Labels and Measurements', 565, 430, 80, 18],
  ]],
  ['Privacy Screen', 'A repeated planting rhythm for gentle screening', [
    ['plant', 'Screening plant', 'Plants', 230, 300, 84, 84],
    ['plant', 'Screening plant', 'Plants', 430, 300, 84, 84],
    ['plant', 'Screening plant', 'Plants', 630, 300, 84, 84],
    ['plant', 'Screening plant', 'Plants', 830, 300, 84, 84],
  ]],
  ['Sensory Garden', 'A curved bed for fragrance, texture, and sound', [
    ['polygon', 'Sensory bed', 'Beds', 185, 260, 820, 310],
    ['label', 'Fragrance • texture • movement', 'Labels and Measurements', 410, 385, 390, 54],
  ]],
  ['Entryway Planters', 'A balanced pair of entry containers', [
    ['structure', 'Entry planter', 'Structures', 330, 300, 125, 125],
    ['structure', 'Entry planter', 'Structures', 745, 300, 125, 125],
    ['label', 'Entry', 'Labels and Measurements', 535, 340, 130, 54],
  ]],
  ['Micro-Orchard', 'A compact edible grove with approximate spacing', [
    ['plant', 'Fruit tree placeholder', 'Plants', 300, 225, 84, 84],
    ['plant', 'Fruit tree placeholder', 'Plants', 580, 225, 84, 84],
    ['plant', 'Fruit tree placeholder', 'Plants', 440, 470, 84, 84],
    ['measurement', 'Approximate spacing', 'Labels and Measurements', 390, 285, 270, 18],
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
    designLayerId: `design-layer-${slug(conceptId)}-${key}`,
    projectId,
    clientId,
    conceptId,
    name,
    order,
    visible: true,
    locked: name === 'Original Photo',
    protectedLayer: name === 'Original Photo',
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

function seedDesignElements() {
  return BUILT_IN_DESIGN_ELEMENTS.map(item => ({ ...item }));
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
    designAreas: [],
    designMasks: [],
    designMaterialDrafts: [],
    projectMaterials: [],
    designElementLibrary: seedDesignElements(),
  };
}

export function createDesignArea(input = {}) {
  const designAreaId = input.designAreaId || input.id || uid('design-area');
  return {
    id: designAreaId,
    designAreaId,
    projectId: input.projectId || '',
    clientId: input.clientId || '',
    conceptId: input.conceptId || '',
    objectId: input.objectId || '',
    selectionType: input.selectionType || 'polygon',
    purpose: input.purpose || 'Ground cover',
    material: input.material || 'Dark brown mulch',
    points: records(input.points).map(point => ({ x: finite(point.x), y: finite(point.y) })),
    area: input.area ?? '',
    unit: input.unit || 'sq ft',
    depth: input.depth ?? '',
    wastePercentage: input.wastePercentage ?? 10,
    createdAt: input.createdAt || now(),
    updatedAt: input.updatedAt || now(),
    archived: Boolean(input.archived),
  };
}

export function createDesignMask(input = {}) {
  const designMaskId = input.designMaskId || input.id || uid('design-mask');
  return {
    id: designMaskId,
    designMaskId,
    projectId: input.projectId || '',
    clientId: input.clientId || '',
    conceptId: input.conceptId || '',
    targetObjectId: input.targetObjectId || '',
    mode: input.mode === 'restore' ? 'restore' : 'hide',
    brushSize: Math.max(2, finite(input.brushSize, 42)),
    brushSoftness: Math.max(0, Math.min(1, finite(input.brushSoftness, .35))),
    opacity: Math.max(.05, Math.min(1, finite(input.opacity, 1))),
    points: records(input.points).map(point => ({ x: finite(point.x), y: finite(point.y) })),
    createdAt: input.createdAt || now(),
    archived: Boolean(input.archived),
  };
}

export function createDesignMaterialDraft(input = {}) {
  const designMaterialId = input.designMaterialId || input.id || uid('design-material');
  return {
    id: designMaterialId,
    designMaterialId,
    projectMaterialId: input.projectMaterialId || '',
    projectId: input.projectId || '',
    clientId: input.clientId || '',
    conceptId: input.conceptId || '',
    designAreaId: input.designAreaId || '',
    designObjectId: input.designObjectId || '',
    name: input.name || 'Design material',
    material: input.material || input.name || 'Material',
    area: input.area ?? '',
    depth: input.depth ?? '',
    quantity: input.quantity ?? 1,
    unit: input.unit || 'sq ft',
    unitCost: input.unitCost ?? '',
    supplier: input.supplier || '',
    wastePercentage: input.wastePercentage ?? 10,
    deliveryCost: input.deliveryCost ?? '',
    status: input.status || 'Draft',
    notes: input.notes || '',
    createdAt: input.createdAt || now(),
    updatedAt: input.updatedAt || now(),
    archived: Boolean(input.archived),
  };
}

export function createDesignObject(input = {}) {
  const objectId = input.objectId || input.id || uid('design-object');
  const usesDesignVisual = ['plant', 'landscape'].includes(input.objectType) || Boolean(input.style?.assetKey) || String(input.style?.imageAsset || '').startsWith('local-symbol:');
  const assetKey = usesDesignVisual ? resolveDesignVisualKey({
    ...input,
    libraryElementId: input.libraryElementId,
    assetKey: input.style?.assetKey,
    symbol: input.style?.symbol,
  }) : '';
  const viewStyle = ['front', 'plan', 'symbol'].includes(input.style?.viewStyle) ? input.style.viewStyle : 'front';
  return {
    id: objectId,
    objectId,
    projectId: input.projectId || '',
    clientId: input.clientId || '',
    conceptId: input.conceptId || '',
    layerId: input.layerId || '',
    designElementId: input.designElementId || objectId,
    libraryElementId: input.libraryElementId || '',
    designAreaId: input.designAreaId || '',
    designMaterialId: input.designMaterialId || '',
    objectType: input.objectType || 'annotation',
    selectionType: input.selectionType || '',
    pathKind: input.pathKind || '',
    x: finite(input.x, 120),
    y: finite(input.y, 120),
    width: Math.max(8, finite(input.width, 120)),
    height: Math.max(8, finite(input.height, 80)),
    rotation: finite(input.rotation, 0),
    zIndex: finite(input.zIndex, 1),
    opacity: Math.max(0.05, Math.min(1, finite(input.opacity, 1))),
    locked: bool(input.locked),
    grouped: bool(input.grouped),
    groupId: input.groupId || '',
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
      material: input.style?.material || '',
      textureScale: Math.max(.1, finite(input.style?.textureScale, 1)),
      textureRotation: finite(input.style?.textureRotation, 0),
      edgeSoftness: Math.max(0, Math.min(1, finite(input.style?.edgeSoftness, 0))),
      borderStyle: input.style?.borderStyle || '',
      shadow: Math.max(0, finite(input.style?.shadow, 0)),
      flipX: bool(input.style?.flipX),
      flipY: bool(input.style?.flipY),
      perspectiveSkew: finite(input.style?.perspectiveSkew, 0),
      blur: Math.max(0, finite(input.style?.blur, 0)),
      brightness: Math.max(.1, finite(input.style?.brightness, 1)),
      contrast: Math.max(.1, finite(input.style?.contrast, 1)),
      feather: Math.max(0, Math.min(1, finite(input.style?.feather, 0))),
      customColor: input.style?.customColor || '',
      customTextureReference: input.style?.customTextureReference || '',
      pathWidth: Math.max(1, finite(input.style?.pathWidth, 36)),
      borderThickness: Math.max(1, finite(input.style?.borderThickness, 8)),
      ...input.style,
      assetKey,
      viewStyle,
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
    designLayerId: item.designLayerId || layerId,
    name: item.name || fallback.name || 'Layer',
    order: finite(item.order, fallback.order || 0),
    visible: item.visible !== false,
    locked: bool(item.locked),
    protectedLayer: bool(item.protectedLayer) || item.name === 'Original Photo' || item.name === 'Background Photo',
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
  if (/measure|label/i.test(name)) return 'Labels and Measurements';
  if (/hardscape|path|paver/i.test(name)) return 'Paths and Pavers';
  if (placement.type === 'material') return 'Ground Cover';
  return 'Structures';
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
  const savedElements = records(saved.designElementLibrary).map(normalizeDesignElement);
  const elementIds = new Set(savedElements.map(item => item.designElementId || item.id));
  const designElementLibrary = [
    ...savedElements,
    ...seedDesignElements().filter(item => !elementIds.has(item.designElementId)),
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
        designVersionId: item.designVersionId || versionId,
        name: item.name || 'Saved design version',
        status: DESIGN_STATUS_OPTIONS.includes(item.status) ? item.status : 'Draft',
        revisionNotes: item.revisionNotes || '',
        recommended: bool(item.recommended || item.status === 'Recommended'),
        clientSelected: bool(item.clientSelected || item.status === 'Client Selected'),
        favorite: bool(item.favorite),
        approvedAt: item.approvedAt || '',
        snapshot: {
          objects: records(item.snapshot?.objects).map(createDesignObject),
          layers: records(item.snapshot?.layers).map(layer => normalizeLayer(layer)),
          canvasSettings: item.snapshot?.canvasSettings || null,
          legendSettings: item.snapshot?.legendSettings || null,
          displaySettings: item.snapshot?.displaySettings || null,
          areas: records(item.snapshot?.areas).map(createDesignArea),
          masks: records(item.snapshot?.masks).map(createDesignMask),
          materialDrafts: records(item.snapshot?.materialDrafts).map(createDesignMaterialDraft),
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
    designAreas: records(saved.designAreas).map(createDesignArea),
    designMasks: records(saved.designMasks).map(createDesignMask),
    designMaterialDrafts: records(saved.designMaterialDrafts).map(createDesignMaterialDraft),
    projectMaterials: records(saved.projectMaterials).map(item => {
      const projectMaterialId = item.projectMaterialId || item.id || uid('project-material');
      return { ...item, id: projectMaterialId, projectMaterialId, status: item.status || 'Draft', archived: Boolean(item.archived) };
    }),
    designElementLibrary,
  };
}

export function createVersionSnapshot({ objects, layers, canvasSettings, legendSettings, displaySettings, areas, masks, materialDrafts }) {
  return {
    objects: copy(records(objects)),
    layers: copy(records(layers)),
    canvasSettings: copy(canvasSettings || null),
    legendSettings: copy(legendSettings || null),
    displaySettings: copy(displaySettings || null),
    areas: copy(records(areas)),
    masks: copy(records(masks)),
    materialDrafts: copy(records(materialDrafts)),
    capturedAt: now(),
  };
}

export function createDesignVersion(input) {
  const versionId = input.versionId || uid('design-version');
  return {
    id: versionId,
    versionId,
    designVersionId: versionId,
    projectId: input.projectId,
    clientId: input.clientId || '',
    conceptId: input.conceptId,
    parentVersionId: input.parentVersionId || '',
    name: input.name || 'Saved design version',
    status: input.status || 'Draft',
    revisionNotes: input.revisionNotes || '',
    recommended: bool(input.recommended),
    clientSelected: bool(input.clientSelected),
    favorite: bool(input.favorite),
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
    leftMaterials: leftObjects.filter(item => ['material', 'cover', 'bed', 'border', 'path'].includes(item.objectType)).length,
    rightMaterials: rightObjects.filter(item => ['material', 'cover', 'bed', 'border', 'path'].includes(item.objectType)).length,
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

export function matureSpreadRadius(object, settings) {
  const spreadFeet = finite(object?.style?.customSpreadFeet || object?.style?.matureSpreadFeet, 0);
  const pixelsPerFoot = finite(settings?.scaleCalibration?.pixelsPerFoot, 0);
  const show = spreadFeet > 0 && (settings?.showAllMatureSpread || object?.style?.showMatureSpread);
  return show && pixelsPerFoot > 0 ? spreadFeet * pixelsPerFoot / 2 : 0;
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
  const materialTotal = activeObjects.filter(item => ['material', 'cover', 'bed', 'border', 'path'].includes(item.objectType)).reduce((sum, item) => sum + finite(item.style?.clientPrice) * finite(item.style?.quantity, 1), 0);
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
