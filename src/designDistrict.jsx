import React, { useEffect, useMemo, useRef, useState } from 'react';
import './designDistrict.css';
import { addTimelineEvent, upsertProjectPlant } from './projectEngine.js';
import { InteractiveDesignStudio } from './designStudioWorkspace.jsx';
import { createCanvasSettings, createDefaultDesignLayers, createDesignObject } from './designEngine.js';
import { DesignGuide, PracticeDesign, WalkthroughOverlay, hasSavedPracticeDesign, useDesignGuide } from './designGuide.jsx';
import { nextEstimateNumber, normalizeEstimateLine } from './growthEngine.js';
import { localDate } from './calendarEngine.js';
import {
  prepareProjectPhoto,
  PROJECT_PHOTO_ACCEPT,
  releasePreparedProjectPhoto,
  removeProjectPhotoAttachments,
  storePreparedProjectPhoto,
} from './imageStorage.js';

const DESIGN_TABS = [
  'Overview',
  'Property Photos',
  'Design Concepts',
  'Design Canvas',
  'Plant Palette',
  'Materials',
  'Inspiration Board',
  'Notes',
  'Measurements',
];

const DESIGN_LAYERS = [
  'Existing Landscape',
  'Trees',
  'Shrubs',
  'Flowers',
  'Containers',
  'Hardscape',
  'Lighting',
  'Irrigation',
  'Notes',
  'Measurements',
];

const MATERIAL_SEEDS = [
  ['Mulch', 'Organic finish for beds and pathways', 'Soft brown'],
  ['Stone', 'Natural stone for borders and focal areas', 'Warm gray'],
  ['Pavers', 'Structured surfaces for paths and terraces', 'Limestone'],
  ['Gravel', 'Permeable texture for paths and courtyards', 'Champagne'],
  ['Edging', 'Crisp separation for beds and lawns', 'Olive'],
  ['Decorative Rock', 'Accent material for dry gardens and details', 'Rose'],
  ['Raised Beds', 'Productive structure for edible gardens', 'Cedar'],
  ['Containers', 'Statement vessels and seasonal compositions', 'Terracotta'],
  ['Furniture', 'Outdoor living and gathering pieces', 'Natural'],
  ['Water Features', 'Fountains, basins, and reflective accents', 'Verdigris'],
  ['Lighting', 'Low-voltage illumination and ambience', 'Antique gold'],
].map(([name, notes, finish], index) => ({
  id: `material-${String(index + 1).padStart(2, '0')}`,
  materialId: `material-${String(index + 1).padStart(2, '0')}`,
  name,
  category: name,
  notes,
  finish,
  favorite: false,
  archived: false,
}));

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
const dateLabel = value => value
  ? new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  : 'Not dated';
const clone = value => JSON.parse(JSON.stringify(value));

function duplicateDesignRecord(current, sourceDesignId) {
  const source = current.designConcepts.find(item => item.designId === sourceDesignId);
  if (!source) return { state: current, designId: '', independentDesignId: '', projectId: '' };
  const sourceIndependent = (current.independentDesigns || []).find(item => item.designId === sourceDesignId);
  const designId = uid('design');
  const independentDesignId = sourceIndependent ? uid('independent-design') : '';
  const projectId = sourceIndependent && !sourceIndependent.projectId ? independentDesignId : source.projectId;
  const clientId = source.clientId || sourceIndependent?.clientId || '';
  const createdAt = now();
  const concept = { ...clone(source), id: designId, designId, independentDesignId, projectId, clientId, name: `${source.name} — Copy`, status: 'Draft', designStatus: 'Draft', approvalStatus: 'Not approved', versionNumber: 1, createdAt, updatedAt: createdAt, archived: false, revisionHistory: [{ id: uid('revision'), date: createdAt, note: `Duplicated from ${source.name}` }] };
  const sourceLayers = current.designLayers.filter(item => item.conceptId === sourceDesignId);
  const layerMap = new Map();
  const layers = sourceLayers.map(item => { const layerId = uid('design-layer'); layerMap.set(item.layerId, layerId); return { ...clone(item), id: layerId, layerId, designLayerId: layerId, conceptId: designId, projectId, clientId, createdAt, updatedAt: createdAt }; });
  const completeLayers = layers.length ? layers : createDefaultDesignLayers({ projectId, clientId, conceptId: designId });
  const objectMap = new Map();
  const areaMap = new Map();
  const objects = current.designObjects.filter(item => item.conceptId === sourceDesignId && !item.archived).map(item => {
    const objectId = uid('design-object');
    objectMap.set(item.objectId, objectId);
    const designAreaId = item.designAreaId ? uid('design-area') : '';
    if (item.designAreaId) areaMap.set(item.designAreaId, designAreaId);
    return createDesignObject({ ...clone(item), id: objectId, objectId, designElementId: objectId, designAreaId, conceptId: designId, projectId, clientId, layerId: layerMap.get(item.layerId) || completeLayers[0]?.layerId, groupId: item.groupId ? `${item.groupId}-${designId}` : '', legacySourceId: '', createdAt, updatedAt: createdAt });
  });
  const areas = (current.designAreas || []).filter(item => item.conceptId === sourceDesignId && !item.archived).map(item => { const designAreaId = areaMap.get(item.designAreaId) || uid('design-area'); return { ...clone(item), id: designAreaId, designAreaId, objectId: objectMap.get(item.objectId) || '', conceptId: designId, projectId, clientId, createdAt, updatedAt: createdAt }; });
  const masks = (current.designMasks || []).filter(item => item.conceptId === sourceDesignId && !item.archived).map(item => { const id = uid('design-mask'); return { ...clone(item), id, designMaskId: id, targetObjectId: objectMap.get(item.targetObjectId) || '', conceptId: designId, projectId, clientId, createdAt }; });
  const sourceSettings = current.designCanvasSettings.find(item => item.conceptId === sourceDesignId);
  const settings = sourceSettings ? { ...clone(sourceSettings), id: `design-canvas-${designId}`, canvasSettingId: `design-canvas-${designId}`, conceptId: designId, projectId, clientId, revision: 0, updatedAt: createdAt, presentationLayerIds: (sourceSettings.presentationLayerIds || []).map(id => layerMap.get(id)).filter(Boolean) } : createCanvasSettings({ projectId, clientId, conceptId: designId });
  const independentRecord = sourceIndependent ? { ...clone(sourceIndependent), id: independentDesignId, independentDesignId, designId, name: concept.name, projectId: sourceIndependent.projectId || '', createdAt, updatedAt: createdAt, archived: false } : null;
  return {
    designId, independentDesignId, projectId,
    state: { ...current, designConcepts: [concept, ...current.designConcepts], designLayers: [...completeLayers, ...current.designLayers], designCanvasSettings: [settings, ...current.designCanvasSettings], designObjects: [...objects, ...current.designObjects], designAreas: [...areas, ...(current.designAreas || [])], designMasks: [...masks, ...(current.designMasks || [])], independentDesigns: independentRecord ? [independentRecord, ...(current.independentDesigns || [])] : current.independentDesigns },
  };
}

function emptyCanvas() {
  return {
    zoom: 1,
    panX: 0,
    panY: 0,
    gridVisible: true,
    measurementVisible: true,
    basePhotoId: '',
    layers: DESIGN_LAYERS.map(name => ({ id: `layer-${name.toLowerCase().replaceAll(' ', '-')}`, name, visible: true })),
    placements: [],
  };
}

export function createDesignStarter() {
  return {
    designSchemaVersion: 1,
    designConcepts: [],
    designPlants: [],
    designMaterials: MATERIAL_SEEDS,
    designInspirations: [],
    designMeasurements: [],
  };
}

export function migrateDesignData(saved = {}) {
  const normalize = (items, prefix) => (Array.isArray(items) ? items : []).map(item => ({
    ...item,
    id: item.id || uid(prefix),
    archived: Boolean(item.archived),
  }));
  const savedMaterials = normalize(saved.designMaterials, 'material');
  const savedMaterialIds = new Set(savedMaterials.map(item => item.materialId || item.id));
  const designMaterials = [
    ...savedMaterials.map(item => ({ ...item, materialId: item.materialId || item.id })),
    ...MATERIAL_SEEDS.filter(seed => !savedMaterialIds.has(seed.materialId)),
  ];
  const designConcepts = normalize(saved.designConcepts, 'design').map(item => ({
    ...item,
    designId: item.designId || item.id,
    name: item.name || 'Untitled concept',
    description: item.description || '',
    status: item.status || 'Draft',
    designStatus: item.designStatus || item.status || 'Draft',
    approvalStatus: item.approvalStatus || (item.status === 'Approved' ? 'Approved' : 'Not approved'),
    versionNumber: Math.max(1, Number(item.versionNumber || 1)),
    clientId: item.clientId || '',
    projectId: item.projectId || '',
    sourcePhotoId: item.sourcePhotoId || item.canvas?.basePhotoId || '',
    originalPhoto: item.originalPhoto || item.sourcePhotoId || item.canvas?.basePhotoId || '',
    currentPreview: item.currentPreview || '',
    createdAt: item.createdAt || now(),
    updatedAt: item.updatedAt || item.createdAt || now(),
    notes: {
      general: item.notes?.general || '',
      clientRequests: item.notes?.clientRequests || '',
      maintenance: item.notes?.maintenance || '',
      futureIdeas: item.notes?.futureIdeas || '',
    },
    revisionHistory: Array.isArray(item.revisionHistory) ? item.revisionHistory : [],
    canvas: {
      ...emptyCanvas(),
      ...(item.canvas || {}),
      layers: DESIGN_LAYERS.map(name => {
        const existing = item.canvas?.layers?.find(layer => layer.name === name);
        return existing || { id: `layer-${name.toLowerCase().replaceAll(' ', '-')}`, name, visible: true };
      }),
      placements: Array.isArray(item.canvas?.placements) ? item.canvas.placements : [],
    },
  }));
  return {
    designSchemaVersion: 1,
    designConcepts,
    designPlants: normalize(saved.designPlants, 'plant').map(item => ({
      ...item,
      plantId: item.plantId || item.id,
      botanicalName: item.botanicalName || item.scientificName || '',
      scientificName: item.scientificName || item.botanicalName || '',
      plantType: item.plantType || item.category || 'Plant',
      category: item.category || item.plantType || 'Plant',
      zones: item.zones || item.usdaZones || '',
      sunRequirements: item.sunRequirements || item.light || '',
      light: item.light || item.sunRequirements || '',
      waterNeeds: item.waterNeeds || '', soilPreferences: item.soilPreferences || '', matureHeight: item.matureHeight || '', matureWidth: item.matureWidth || '', spacing: item.spacing || '', bloomSeason: item.bloomSeason || '', flowerColor: item.flowerColor || '', fruitSeason: item.fruitSeason || '', edibleStatus: item.edibleStatus || '', toxicityNotes: item.toxicityNotes || '', petSafetyNotes: item.petSafetyNotes || '', nativeStatus: item.nativeStatus || '', pollinatorValue: item.pollinatorValue || '', deerResistance: item.deerResistance || '', companionPlants: item.companionPlants || '', maintenanceNotes: item.maintenanceNotes || '', pruningNotes: item.pruningNotes || '', installationNotes: item.installationNotes || '', supplier: item.supplier || '', supplierCost: item.supplierCost || item.unitCost || '', customerPrice: item.customerPrice || '', photos: Array.isArray(item.photos) ? item.photos : [], tags: Array.isArray(item.tags) ? item.tags : [],
      informationSource: item.informationSource || (item.builtIn ? 'Built-in information' : 'User-entered information'),
      approved: item.approved !== false,
      favorite: Boolean(item.favorite),
      traits: Array.isArray(item.traits) ? item.traits : String(item.traits || '').split(',').map(value => value.trim()).filter(Boolean),
    })),
    designMaterials,
    designInspirations: normalize(saved.designInspirations, 'inspiration').map(item => ({
      ...item,
      inspirationId: item.inspirationId || item.id,
      styleTags: Array.isArray(item.styleTags) ? item.styleTags : [item.styleKeyword].filter(Boolean),
      colorNotes: item.colorNotes || (Array.isArray(item.colors) ? item.colors.join(', ') : item.colors || ''),
      plantCombinationNotes: item.plantCombinationNotes || (item.type === 'Plant Combination' ? item.details || '' : ''),
      textureNotes: item.textureNotes || (item.type === 'Texture Idea' ? item.details || '' : ''),
    })),
    designMeasurements: normalize(saved.designMeasurements, 'measurement').map(item => ({
      ...item,
      measurementId: item.measurementId || item.id,
      length: item.length || item.value || '',
      width: item.width || '',
      areaNotes: item.areaNotes || item.notes || '',
    })),
    projectPhotos: (Array.isArray(saved.projectPhotos) ? saved.projectPhotos : []).map(photo => ({
      ...photo,
      stage: photo.stage === 'During' ? 'Progress' : photo.stage === 'After' ? 'Finished' : photo.stage,
      photoDate: photo.photoDate || String(photo.createdAt || '').slice(0, 10) || today(),
      tags: Array.isArray(photo.tags) ? photo.tags : String(photo.tags || '').split(',').map(value => value.trim()).filter(Boolean),
      originalImage: photo.originalImage || photo.image || '',
      originalName: photo.originalName || photo.fileName || '',
      originalType: photo.originalType || photo.imageType || '',
      originalSize: Number(photo.originalSize || 0),
    })),
  };
}

function EmptyStudio({ title, text }) {
  return <div className="design-empty"><span aria-hidden="true">❦</span><h3>{title}</h3><p>{text}</p></div>;
}

function fileAsData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ data: reader.result, name: file.name });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function projectActivity(data, projectId) {
  const events = [
    ...data.designConcepts.filter(item => item.projectId === projectId).map(item => item.updatedAt || item.createdAt),
    ...data.projectPhotos.filter(item => item.projectId === projectId).map(item => item.createdAt),
    ...data.designInspirations.filter(item => item.projectId === projectId).map(item => item.createdAt),
  ].filter(Boolean).sort().reverse();
  return events[0] || '';
}

export function DesignDashboardCards({ data, openDesign }) {
  const activeProjects = data.projects.filter(project => !project.archived);
  const standaloneIds = new Set((data.independentDesigns || []).filter(item => !item.projectId).map(item => item.independentDesignId));
  const activeConcepts = data.designConcepts.filter(concept => !concept.archived && !standaloneIds.has(concept.independentDesignId));
  const activeConceptIds = new Set(activeConcepts.map(item => item.designId));
  const versions = (data.designVersions || []).filter(item => !item.archived && activeConceptIds.has(item.conceptId));
  const inProgress = activeConcepts.filter(item => ['Draft', 'Internal Review', 'Designing'].includes(item.status));
  const ready = versions.filter(item => ['Ready to Present', 'Recommended'].includes(item.status));
  const awaitingRevision = versions.filter(item => item.status === 'Needs Revision');
  const approved = versions.filter(item => item.status === 'Approved');
  const unlinkedPlants = (data.designObjects || []).filter(item => !item.archived && activeConceptIds.has(item.conceptId) && item.objectType === 'plant' && !item.relatedProjectPlantId);
  const missingEstimate = activeConcepts.filter(concept => {
    const placed = (data.designObjects || []).some(item => item.conceptId === concept.designId && !item.archived && ['plant', 'material'].includes(item.objectType));
    return placed && !data.estimates.some(item => item.projectId === concept.projectId && !item.archived);
  });
  const recentVersions = [...versions].sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
  const cards = [
    ['Designs in progress', inProgress.length, inProgress[0]?.projectId, inProgress[0]?.name || 'Studio queue is clear'],
    ['Ready to present', ready.length, ready[0]?.projectId, ready[0]?.name || 'No presentation-ready versions'],
    ['Awaiting revision', awaitingRevision.length, awaitingRevision[0]?.projectId, awaitingRevision[0]?.name || 'No revisions waiting'],
    ['Approved designs', approved.length, approved[0]?.projectId, approved[0]?.name || 'No approved versions yet'],
    ['Unlinked design plants', unlinkedPlants.length, unlinkedPlants[0]?.projectId, unlinkedPlants[0]?.label || 'All placed plants are linked'],
    ['Designs missing estimates', missingEstimate.length, missingEstimate[0]?.projectId, missingEstimate[0]?.name || 'No estimate gaps'],
    ['Recent revisions', recentVersions.length, recentVersions[0]?.projectId, recentVersions[0]?.name || 'No named versions yet'],
  ];
  return <section className="design-dashboard-strip">
    <div className="design-dashboard-heading"><div><span>Design District</span><h3>Creative work at a glance</h3></div><button onClick={() => openDesign('')}>Enter the studio →</button></div>
    <div>{cards.map(([label, value, projectId, note]) => <button key={label} onClick={() => openDesign(projectId || '')}><span>{label}</span><strong>{value}</strong><small>{note}</small></button>)}</div>
  </section>;
}

function DesignStartHub({ data, setData, selectProject, selectIndependent, onGuideAction }) {
  const [mode, setMode] = useState('project-photo');
  const [form, setForm] = useState({ name: '', clientId: '', projectId: '', photoId: '', sourceDesignId: '' });
  const projects = data.projects.filter(item => !item.archived && (!form.clientId || item.clientId === form.clientId));
  const photos = data.projectPhotos.filter(item => !item.archived && (!form.projectId || item.projectId === form.projectId) && (!form.clientId || item.clientId === form.clientId || projects.some(project => project.projectId === item.projectId)));
  const designs = data.designConcepts.filter(item => !item.archived);
  const cards = [
    ['client-photo', 'Create From Client Photo', 'Choose a client photo and connect the design now.'],
    ['project-photo', 'Create From Project Photo', 'Start on an existing project property image.'],
    ['independent', 'Independent Design', 'Begin without a client or project and link later.'],
    ['continue', 'Continue Saved Design', 'Open the saved gallery and resume in place.'],
    ['duplicate', 'Duplicate Existing Design', 'Copy a design into a new editable record.'],
    ['history', 'Open Design History', 'Review versions, approvals, favorites, and archived work.'],
  ];
  const goToGallery = archived => {
    document.getElementById('saved-design-gallery')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (archived) window.dispatchEvent(new CustomEvent('design-gallery-history'));
  };
  const submit = event => {
    event.preventDefault();
    if (['continue', 'history'].includes(mode)) { goToGallery(mode === 'history'); return; }
    if (mode === 'duplicate') {
      if (!form.sourceDesignId) return;
      let result;
      setData(current => { result = duplicateDesignRecord(current, form.sourceDesignId); return result.state; });
      const source = data.designConcepts.find(item => item.designId === form.sourceDesignId);
      const sourceIndependent = (data.independentDesigns || []).find(item => item.designId === source?.designId);
      setTimeout(() => sourceIndependent ? selectIndependent(result?.independentDesignId || '') : selectProject(result?.projectId || source?.projectId || '', result?.designId || ''), 0);
      return;
    }
    if (!form.name.trim()) return;
    const chosenPhoto = data.projectPhotos.find(item => (item.photoId || item.id) === form.photoId || item.id === form.photoId);
    const chosenProject = data.projects.find(item => item.projectId === form.projectId && !item.archived);
    const designId = uid('design');
    const independentDesignId = chosenProject ? '' : uid('independent-design');
    const projectId = chosenProject?.projectId || independentDesignId;
    const clientId = chosenProject?.clientId || form.clientId || '';
    const createdAt = now();
    const sourcePhotoId = chosenPhoto?.photoId || chosenPhoto?.id || '';
    const concept = { id: designId, designId, independentDesignId, projectId, clientId, designName: form.name.trim(), name: form.name.trim(), description: '', sourcePhotoId, originalPhoto: sourcePhotoId, currentPreview: '', status: 'Draft', designStatus: 'Draft', approvalStatus: 'Not approved', versionNumber: 1, createdAt, updatedAt: createdAt, notes: { general: '', clientRequests: '', maintenance: '', futureIdeas: '' }, revisionHistory: [{ id: uid('revision'), date: createdAt, note: chosenPhoto ? 'Manual photo design created' : 'Independent Design created' }], canvas: { ...emptyCanvas(), basePhotoId: sourcePhotoId }, archived: false };
    const layers = createDefaultDesignLayers({ projectId, clientId, conceptId: designId });
    const settings = { ...createCanvasSettings({ projectId, clientId, conceptId: designId }), backgroundPhotoId: sourcePhotoId };
    const independentRecord = independentDesignId ? { id: independentDesignId, independentDesignId, designId, name: concept.name, description: '', notes: '', backgroundKind: chosenPhoto ? 'Client photo' : 'Cream garden paper', clientId, projectId: '', linkedAt: '', createdAt, updatedAt: createdAt, archived: false } : null;
    setData(current => ({ ...current, designConcepts: [concept, ...current.designConcepts], designLayers: [...layers, ...current.designLayers], designCanvasSettings: [settings, ...current.designCanvasSettings], independentDesigns: independentRecord ? [independentRecord, ...(current.independentDesigns || [])] : current.independentDesigns }));
    setForm({ name: '', clientId: '', projectId: '', photoId: '', sourceDesignId: '' });
    if (independentRecord) selectIndependent(independentDesignId); else selectProject(projectId, designId);
  };
  return <section className="design-start-hub glass">
    <div className="design-start-heading"><div><span>Design District Pro</span><h3>Start a manual photo design</h3><p>Choose a starting point. Every cover, mask, plant, path, and material remains under your control.</p></div><strong>Manual editor · no AI generation</strong></div>
    <div className="design-start-options" data-guide-target="design-type">{cards.map(([id, title, text]) => <button type="button" key={id} className={mode === id ? 'active' : ''} onClick={() => { setMode(id); onGuideAction?.('design-type'); if (['continue', 'history'].includes(id)) goToGallery(id === 'history'); }}><span aria-hidden="true">{id === 'client-photo' ? '◉' : id === 'project-photo' ? '▣' : id === 'independent' ? '✦' : id === 'continue' ? '↗' : id === 'duplicate' ? '⧉' : '◷'}</span><strong>{title}</strong><small>{text}</small></button>)}</div>
    {!['continue', 'history'].includes(mode) && <form className="design-start-form" onSubmit={submit}>
      {mode !== 'duplicate' && <label>Design name<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Front arrival garden concept" /></label>}
      {['client-photo', 'project-photo'].includes(mode) && <label>Client<select value={form.clientId} onChange={event => setForm({ ...form, clientId: event.target.value, projectId: '', photoId: '' })}><option value="">Choose a client</option>{data.clients.filter(item => !item.archived).map(item => <option key={item.clientId || item.id} value={item.clientId || item.id}>{item.name}</option>)}</select></label>}
      {mode === 'project-photo' && <label>Project<select required value={form.projectId} onChange={event => setForm({ ...form, projectId: event.target.value, photoId: '' })}><option value="">Choose a project</option>{projects.map(item => <option key={item.projectId} value={item.projectId}>{item.projectId} · {item.name}</option>)}</select></label>}
      {mode === 'client-photo' && <label>Project (optional)<select value={form.projectId} onChange={event => setForm({ ...form, projectId: event.target.value, photoId: '' })}><option value="">Keep independent for now</option>{projects.map(item => <option key={item.projectId} value={item.projectId}>{item.projectId} · {item.name}</option>)}</select></label>}
      {['client-photo', 'project-photo'].includes(mode) && <label>Existing photo<select required value={form.photoId} onChange={event => setForm({ ...form, photoId: event.target.value })}><option value="">Choose a property photo</option>{photos.map(item => <option key={item.photoId || item.id} value={item.photoId || item.id}>{item.caption || item.fileName}</option>)}</select></label>}
      {mode === 'duplicate' && <label>Existing design<select required value={form.sourceDesignId} onChange={event => setForm({ ...form, sourceDesignId: event.target.value })}><option value="">Choose a saved design</option>{designs.map(item => <option key={item.designId} value={item.designId}>{item.name} · {item.status}</option>)}</select></label>}
      <button className="primary">{mode === 'duplicate' ? 'Duplicate and open' : mode === 'independent' ? 'Create Independent Design' : 'Create and open editor'}</button>
    </form>}
  </section>;
}

function SavedDesignGallery({ data, setData, selectProject, selectIndependent, onOpenGuide }) {
  const [showArchived, setShowArchived] = useState(false);
  useEffect(() => { const handler = () => setShowArchived(true); window.addEventListener('design-gallery-history', handler); return () => window.removeEventListener('design-gallery-history', handler); }, []);
  const concepts = data.designConcepts.filter(item => showArchived ? item.archived : !item.archived).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const open = concept => {
    const independent = (data.independentDesigns || []).find(item => item.designId === concept.designId);
    if (independent) selectIndependent(independent.independentDesignId); else selectProject(concept.projectId, concept.designId);
  };
  const duplicate = concept => {
    let result;
    setData(current => { result = duplicateDesignRecord(current, concept.designId); return result.state; });
    setTimeout(() => result?.independentDesignId ? selectIndependent(result.independentDesignId) : selectProject(result?.projectId || concept.projectId, result?.designId || ''), 0);
  };
  const patch = (concept, changes) => setData(current => ({ ...current, designConcepts: current.designConcepts.map(item => item.designId === concept.designId ? { ...item, ...changes, updatedAt: now() } : item), independentDesigns: (current.independentDesigns || []).map(item => item.designId === concept.designId ? { ...item, ...changes, updatedAt: now() } : item) }));
  const remove = concept => {
    if (!concept.archived || !confirm(`Permanently delete ${concept.name} and its saved design history? The source property photo and project will be preserved.`)) return;
    setData(current => ({
      ...current,
      independentDesigns: (current.independentDesigns || []).filter(item => item.designId !== concept.designId),
      designConcepts: current.designConcepts.filter(item => item.designId !== concept.designId),
      designObjects: current.designObjects.filter(item => item.conceptId !== concept.designId),
      designLayers: current.designLayers.filter(item => item.conceptId !== concept.designId),
      designCanvasSettings: current.designCanvasSettings.filter(item => item.conceptId !== concept.designId),
      designVersions: current.designVersions.filter(item => item.conceptId !== concept.designId),
      designNotes: current.designNotes.filter(item => item.conceptId !== concept.designId),
      designAreas: (current.designAreas || []).filter(item => item.conceptId !== concept.designId),
      designMasks: (current.designMasks || []).filter(item => item.conceptId !== concept.designId),
      designMaterialDrafts: (current.designMaterialDrafts || []).filter(item => item.conceptId !== concept.designId),
      projectMaterials: (current.projectMaterials || []).filter(item => item.conceptId !== concept.designId),
      designMeasurements: current.designMeasurements.filter(item => item.conceptId !== concept.designId && item.designId !== concept.designId),
    }));
  };
  return <section id="saved-design-gallery" className="saved-design-gallery">
    <div className="saved-gallery-heading"><div><span>Saved Design Gallery</span><h3>{showArchived ? 'Archived design history' : 'Continue a saved design'}</h3></div><div className="saved-gallery-actions"><button type="button" onClick={onOpenGuide}>Design District Guide</button><button type="button" onClick={() => setShowArchived(value => !value)}>{showArchived ? 'View active' : `Archived (${data.designConcepts.filter(item => item.archived).length})`}</button></div></div>
    <div className="saved-design-grid">{concepts.map(concept => {
      const independent = (data.independentDesigns || []).find(item => item.designId === concept.designId);
      const project = data.projects.find(item => item.projectId === concept.projectId);
      const photo = data.projectPhotos.find(item => (item.photoId || item.id) === concept.sourcePhotoId || item.id === concept.sourcePhotoId);
      const versions = data.designVersions.filter(item => item.conceptId === concept.designId && !item.archived);
      const favorite = versions.some(item => item.clientSelected || item.favorite);
      return <article className="saved-design-card glass" key={concept.designId}>{(concept.currentPreview || photo?.image) ? <img src={concept.currentPreview || photo?.image} alt="" /> : <div className="saved-design-placeholder">❦</div>}<div><span>{independent ? 'Independent' : `${project?.projectId || 'Unlinked'} · ${project?.name || 'Project'}`}</span><h4>{concept.name}</h4><small>Edited {dateLabel(concept.updatedAt)} · Version {concept.versionNumber || Math.max(1, versions.length)} · {concept.approvalStatus || concept.status}</small><div>{favorite && <b>★ Client favorite</b>}<em>{concept.status}</em></div></div><footer><button className="primary" onClick={() => open(concept)}>{concept.archived ? 'Open history' : 'Open'}</button><button onClick={() => { const value = prompt('Rename this design:', concept.name); if (value?.trim()) patch(concept, { name: value.trim(), designName: value.trim() }); }}>Rename</button><button onClick={() => duplicate(concept)}>Duplicate</button><button onClick={() => patch(concept, { archived: !concept.archived })}>{concept.archived ? 'Restore' : 'Archive'}</button>{concept.archived && <button className="danger" onClick={() => remove(concept)}>Delete</button>}</footer></article>;
    })}{!concepts.length && <EmptyStudio title={showArchived ? 'No archived designs' : 'No saved designs yet'} text="Choose a design type above, or open Practice Design to learn the tools without creating a client record." />}</div>
  </section>;
}

function DesignLanding({ data, setData, selectProject, selectIndependent, openProjectDistrict, onOpenGuide, onOpenPractice, onGuideAction, practiceStarted }) {
  const [independentForm, setIndependentForm] = useState({ name: '', description: '' });
  const [showArchivedIndependent, setShowArchivedIndependent] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState('');
  const projects = data.projects.filter(project => !project.archived);
  const concepts = data.designConcepts.filter(item => !item.archived && (!item.independentDesignId || (data.independentDesigns || []).some(record => record.independentDesignId === item.independentDesignId && record.projectId)));
  const independentDesigns = (data.independentDesigns || []).filter(item => showArchivedIndependent ? item.archived : !item.archived);
  const awaiting = concepts.filter(item => ['Client Review', 'Awaiting Approval'].includes(item.status)).length;
  const recent = [...concepts].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, 4);
  const createIndependent = event => {
    event.preventDefault();
    if (!independentForm.name.trim()) return;
    const independentDesignId = uid('independent-design');
    const designId = uid('design');
    const createdAt = now();
    const concept = {
      id: designId,
      designId,
      independentDesignId,
      projectId: independentDesignId,
      clientId: '',
      name: independentForm.name.trim(),
      designName: independentForm.name.trim(),
      description: independentForm.description.trim(),
      status: 'Draft',
      designStatus: 'Draft',
      approvalStatus: 'Not approved',
      versionNumber: 1,
      sourcePhotoId: '',
      originalPhoto: '',
      currentPreview: '',
      createdAt,
      updatedAt: createdAt,
      notes: { general: '', clientRequests: '', maintenance: '', futureIdeas: '' },
      revisionHistory: [{ id: uid('revision'), date: createdAt, note: 'Independent Design created' }],
      canvas: emptyCanvas(),
      archived: false,
    };
    const record = { id: independentDesignId, independentDesignId, designId, name: concept.name, description: concept.description, notes: '', backgroundKind: 'Cream garden paper', clientId: '', projectId: '', linkedAt: '', createdAt, updatedAt: createdAt, archived: false };
    const layers = createDefaultDesignLayers({ projectId: independentDesignId, clientId: '', conceptId: designId });
    const settings = createCanvasSettings({ projectId: independentDesignId, clientId: '', conceptId: designId });
    setData(current => ({ ...current, independentDesigns: [record, ...(current.independentDesigns || [])], designConcepts: [concept, ...current.designConcepts], designLayers: [...layers, ...current.designLayers], designCanvasSettings: [settings, ...current.designCanvasSettings] }));
    setIndependentForm({ name: '', description: '' });
    selectIndependent(independentDesignId);
  };
  const setIndependentArchive = (record, archived) => {
    setPendingDeleteId('');
    setData(current => ({ ...current, independentDesigns: current.independentDesigns.map(item => item.independentDesignId === record.independentDesignId ? { ...item, archived, updatedAt: now() } : item), designConcepts: current.designConcepts.map(item => item.designId === record.designId ? { ...item, archived, updatedAt: now() } : item) }));
  };
  const removeIndependent = record => {
    if (pendingDeleteId !== record.independentDesignId) { setPendingDeleteId(record.independentDesignId); return; }
    setData(current => ({
      ...current,
      independentDesigns: current.independentDesigns.filter(item => item.independentDesignId !== record.independentDesignId),
      designConcepts: current.designConcepts.filter(item => item.designId !== record.designId),
      designObjects: (current.designObjects || []).filter(item => item.conceptId !== record.designId),
      designLayers: (current.designLayers || []).filter(item => item.conceptId !== record.designId),
      designCanvasSettings: (current.designCanvasSettings || []).filter(item => item.conceptId !== record.designId),
      designVersions: (current.designVersions || []).filter(item => item.conceptId !== record.designId),
      designNotes: (current.designNotes || []).filter(item => item.conceptId !== record.designId),
      designAreas: (current.designAreas || []).filter(item => item.conceptId !== record.designId),
      designMasks: (current.designMasks || []).filter(item => item.conceptId !== record.designId),
      designMaterialDrafts: (current.designMaterialDrafts || []).filter(item => item.conceptId !== record.designId),
      projectMaterials: (current.projectMaterials || []).filter(item => item.conceptId !== record.designId),
      designMeasurements: (current.designMeasurements || []).filter(item => item.conceptId !== record.designId && item.designId !== record.designId && item.projectId !== (record.projectId || record.independentDesignId)),
      projectPhotos: current.projectPhotos.filter(item => item.independentDesignId !== record.independentDesignId && item.conceptId !== record.designId),
      designInspirations: (current.designInspirations || []).filter(item => item.conceptId !== record.designId && item.projectId !== (record.projectId || record.independentDesignId)),
    }));
    setPendingDeleteId('');
  };
  return <div className="design-landing">
    <section className="design-landing-hero glass">
      <div><span>Artist’s studio</span><h2>Design District</h2><p>Shape landscape ideas into connected project concepts, palettes, inspiration, measurements, and client-ready stories.</p></div>
      <div className="design-landing-guide-actions"><button type="button" className="primary" onClick={onOpenGuide}>Design District Guide</button><button type="button" onClick={() => { onGuideAction?.('design-type'); onOpenPractice(); }}>Practice Design</button><small>{practiceStarted ? 'Practice design saved on this device. Open it to continue.' : 'No practice design started. Open Practice Design to begin without changing real records.'}</small></div><span className="design-hero-butterfly" aria-hidden="true">🦋</span>
      <div className="design-landing-metrics">
        <div><strong>{projects.length}</strong><span>Project studios</span></div>
        <div><strong>{concepts.length}</strong><span>Saved concepts</span></div>
        <div><strong>{awaiting}</strong><span>Concepts awaiting approval</span></div>
      </div>
    </section>
    <DesignStartHub data={data} setData={setData} selectProject={selectProject} selectIndependent={selectIndependent} onGuideAction={onGuideAction} />
    <section className="independent-design-entry glass">
      <div className="independent-entry-copy"><span>Ideas before projects</span><h3>Independent Design</h3><p>Create a complete landscape idea without choosing a client or project. Link it later without copying the design or any canvas objects.</p><div className="independent-feature-chips">{['Drawing tools', 'Plant & material markers', 'Measurements', 'Layers', 'Notes', 'Versions'].map(item => <span key={item}>{item}</span>)}</div></div>
      <form onSubmit={createIndependent}><label>Design name<input required value={independentForm.name} onChange={event => setIndependentForm({ ...independentForm, name: event.target.value })} placeholder="Courtyard herb garden" /></label><label>Inspiration or intent<textarea value={independentForm.description} onChange={event => setIndependentForm({ ...independentForm, description: event.target.value })} placeholder="What would you like to explore?" /></label><button className="primary">Create Independent Design</button></form>
    </section>
    <section className="independent-design-library">
      <div className="independent-library-heading"><div><span>Independent Design library</span><h3>{showArchivedIndependent ? 'Archived ideas' : 'Standalone and linked ideas'}</h3></div><button onClick={() => setShowArchivedIndependent(value => !value)}>{showArchivedIndependent ? 'View active' : `Archived (${(data.independentDesigns || []).filter(item => item.archived).length})`}</button></div>
      <div>{independentDesigns.map(record => {
        const concept = data.designConcepts.find(item => item.designId === record.designId);
        const objectCount = (data.designObjects || []).filter(item => item.conceptId === record.designId && !item.archived).length;
        const versionCount = (data.designVersions || []).filter(item => item.conceptId === record.designId && !item.archived).length;
        const project = data.projects.find(item => item.projectId === record.projectId);
        return <article className="glass independent-design-card" key={record.independentDesignId}><div><span className="independent-badge">Independent Design</span>{record.projectId && <span className="linked-badge">Linked to {record.projectId}</span>}</div><h4>{record.name}</h4><p>{record.description || 'A free-standing garden idea ready for the canvas.'}</p><dl><div><dt>Objects</dt><dd>{objectCount}</dd></div><div><dt>Versions</dt><dd>{versionCount}</dd></div><div><dt>Last edited</dt><dd>{dateLabel(record.updatedAt || concept?.updatedAt)}</dd></div></dl>{project && <small>{project.name} · canvas remains the original record</small>}<div>{record.archived ? <><button onClick={() => setIndependentArchive(record, false)}>Restore</button><button className="danger" onClick={() => removeIndependent(record)}>{pendingDeleteId === record.independentDesignId ? 'Confirm permanent delete' : 'Delete archived design'}</button></> : <><button className="primary" onClick={() => selectIndependent(record.independentDesignId)}>Open Independent Design</button><button onClick={() => setIndependentArchive(record, true)}>Archive</button></>}</div></article>;
      })}{!independentDesigns.length && <EmptyStudio title={showArchivedIndependent ? 'No archived independent designs' : 'No Independent Designs yet'} text="Name an idea above to open the garden canvas without a client or project." />}</div>
    </section>
    <SavedDesignGallery data={data} setData={setData} selectProject={selectProject} selectIndependent={selectIndependent} onOpenGuide={onOpenGuide} />
    <section className="design-project-gallery">
      {projects.map(project => {
        const projectConcepts = concepts.filter(item => item.projectId === project.projectId);
        const photos = data.projectPhotos.filter(item => item.projectId === project.projectId && !item.archived);
        const latest = projectConcepts.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
        const client = data.clients.find(item => (item.id || item.clientId) === project.clientId);
        return <article className="design-project-card glass" key={project.projectId}>
          <div className="design-project-card-top"><span>{project.projectId}</span><span>{latest?.status || 'Studio ready'}</span></div>
          <h3>{project.name}</h3><p>{client?.name || 'Unassigned client'} • {project.propertyAddress || 'Property address not added'}</p>
          <div className="design-project-card-stats"><span><strong>{projectConcepts.length}</strong> concepts</span><span><strong>{photos.length}</strong> photos</span></div>
          <small>Design status: {latest?.status || 'Not started'}{latest ? ` • Edited ${dateLabel(latest.updatedAt)}` : ''}</small>
          <button className="primary" onClick={() => selectProject(project.projectId)}>Open Design Studio</button>
        </article>;
      })}
      {!projects.length && <section className="design-no-projects glass"><span aria-hidden="true">✦</span><h3>Your first Project Design Studio begins in the Project District.</h3><p>Create a connected project to unlock the complete creative workspace.</p><div><button className="primary" onClick={openProjectDistrict}>Create New Project</button><button onClick={openProjectDistrict}>Open Project District</button></div><strong>Available after project creation</strong><ul>{DESIGN_TABS.map(item => <li key={item}>{item}</li>)}</ul></section>}
    </section>
    {recent.length > 0 && <section className="panel glass design-recent-list"><div><span>Recently touched</span><h3>Recent concepts</h3></div>{recent.map(concept => {
      const project = data.projects.find(item => item.projectId === concept.projectId);
      return <button key={concept.designId} onClick={() => selectProject(concept.projectId)}><span>{concept.status}</span><strong>{concept.name}</strong><small>{project?.name} • {dateLabel(concept.updatedAt)}</small></button>;
    })}</section>}
  </div>;
}

function PropertyOverview({ data, project, openProject, openSketch, setTab }) {
  const client = data.clients.find(item => item.clientId === project.clientId);
  const concepts = data.designConcepts.filter(item => item.projectId === project.projectId && !item.archived);
  const approvedConcepts = concepts.filter(item => item.status === 'Approved');
  const sourcing = data.sourcingRecords.filter(item => item.projectId === project.projectId && !item.archived);
  const finance = data.businessTransactions.filter(item => item.projectId === project.projectId && !item.archived);
  const photos = data.projectPhotos.filter(item => item.projectId === project.projectId && !item.archived);
  const notes = data.projectNotes.filter(item => item.projectId === project.projectId && !item.archived);
  const timeline = data.projectTimeline.filter(item => item.projectId === project.projectId && !item.archived);
  return <div className="design-overview-grid">
    <section className="panel glass design-property-portrait">
      <span>Property overview</span><h3>{project.name}</h3><p>{project.propertyAddress || 'No property address saved.'}</p>
      <dl><div><dt>Primary client</dt><dd>{client?.name || 'Unassigned'}</dd></div><div><dt>Status</dt><dd>{project.status}</dd></div><div><dt>Start date</dt><dd>{dateLabel(project.startDate)}</dd></div><div><dt>Target completion</dt><dd>{dateLabel(project.targetCompletionDate)}</dd></div></dl>
      {project.notes && <blockquote>{project.notes}</blockquote>}
      <div className="design-overview-actions"><button onClick={() => openProject(project.projectId)}>Open Project Hub</button><button onClick={() => openSketch(project.projectId)}>Open Property Sketch</button></div>
    </section>
    <section className="design-overview-stats">
      {[
        ['Design concepts', concepts.length, 'Design Concepts'],
        ['Approved concepts', approvedConcepts.length, 'Design Concepts'],
        ['Property photos', photos.length, 'Property Photos'],
        ['Plant sourcing records', sourcing.length, 'Plant Palette'],
        ['Financial records', finance.length, null],
        ['Project notes', notes.length, null],
        ['Timeline events', timeline.length, null],
        ['Measurements', data.designMeasurements.filter(item => item.projectId === project.projectId && !item.archived).length, 'Measurements'],
      ].map(([label, value, target]) => <button className="glass" key={label} onClick={() => target && setTab(target)}><span>{label}</span><strong>{value}</strong><small>{target ? `Open ${target}` : 'Connected through Finance District'}</small></button>)}
    </section>
  </div>;
}

function SitePhotos({ data, setData, projectId, independent = false, onGuideAction }) {
  const blank = { stage: 'Before', caption: '', photoDate: today(), tags: '' };
  const [form, setForm] = useState(blank);
  const [upload, setUpload] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [filter, setFilter] = useState('All');
  const [preview, setPreview] = useState(null);
  const [editingId, setEditingId] = useState('');
  const [photoError, setPhotoError] = useState('');
  const photos = data.projectPhotos
    .filter(item => item.projectId === projectId && !item.archived)
    .filter(item => filter === 'All' || item.stage === filter)
    .sort((a, b) => String(b.photoDate || b.createdAt).localeCompare(String(a.photoDate || a.createdAt)));
  const selectPhoto = async file => {
    if (!file) return;
    releasePreparedProjectPhoto(upload);
    setUpload(null);
    setPhotoLoading(true);
    setPhotoError('');
    try {
      const prepared = await prepareProjectPhoto(file);
      setUpload({ ...prepared, projectId });
    } catch (error) {
      setUpload(null);
      setPhotoError(error instanceof Error ? error.message : 'The photo could not be prepared.');
    } finally {
      setPhotoLoading(false);
    }
  };
  const savePhoto = async event => {
    event.preventDefault();
    if (!upload && !editingId) {
      setPhotoError('Choose a property photo to upload.');
      return;
    }
    if (upload && upload.projectId !== projectId) {
      setUpload(null);
      setPhotoError('The active project changed. Choose the photo again so it is linked correctly.');
      return;
    }
    const formElement = event.currentTarget;
    if (editingId) {
      setData(current => ({ ...current, projectPhotos: current.projectPhotos.map(item => item.id === editingId ? {
        ...item,
        stage: form.stage,
        caption: form.caption.trim(),
        photoDate: form.photoDate,
        tags: form.tags.split(',').map(value => value.trim()).filter(Boolean),
        image: upload?.data || item.image,
        fileName: upload?.name || item.fileName,
        imageType: upload?.type || item.imageType,
        width: upload?.width || item.width,
        height: upload?.height || item.height,
        updatedAt: now(),
      } : item) }));
      setEditingId('');
      setForm(blank);
      setUpload(null);
      setPhotoError('');
      formElement.reset();
      return;
    }
    setPhotoLoading(true);
    const id = uid('photo');
    const photoId = uid('site-photo');
    let storedImage;
    try {
      storedImage = await storePreparedProjectPhoto(photoId, upload);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'The property photo could not be saved to this device.');
      setPhotoLoading(false);
      return;
    }
    const photo = {
      id,
      photoId,
      projectId,
      stage: form.stage,
      caption: form.caption.trim(),
      photoDate: form.photoDate,
      tags: form.tags.split(',').map(value => value.trim()).filter(Boolean),
      ...storedImage,
      originalName: upload.originalName,
      originalType: upload.originalType,
      originalSize: upload.originalSize,
      originalWidth: upload.originalWidth,
      originalHeight: upload.originalHeight,
      fileName: upload.name,
      imageType: upload.type,
      width: upload.width,
      height: upload.height,
      createdAt: now(),
      clientVisible: true,
      presentationVisible: true,
      safeForPresentation: true,
      archived: false,
    };
    setData(current => {
      const next = { ...current, projectPhotos: [{ ...photo, independentDesignId: independent ? projectId : '' }, ...current.projectPhotos] };
      return independent ? next : addTimelineEvent(next, {
        projectId,
        eventType: 'photo.uploaded',
        title: 'Property photo uploaded',
        description: photo.caption || photo.fileName,
        relatedRecordId: photo.photoId,
        dedupeKey: `photo.uploaded:${photo.photoId}`,
        automatic: true,
      });
    });
    setForm(blank);
    releasePreparedProjectPhoto(upload);
    setUpload(null);
    setPhotoError('');
    setPhotoLoading(false);
    formElement.reset();
    onGuideAction?.('photo-added');
  };
  const editPhoto = photo => {
    releasePreparedProjectPhoto(upload);
    setEditingId(photo.id);
    setForm({ stage: photo.stage, caption: photo.caption || '', photoDate: photo.photoDate || today(), tags: (photo.tags || []).join(', ') });
    setUpload(null);
    setPhotoError('');
  };
  const cancelEdit = () => {
    setEditingId('');
    setForm(blank);
    releasePreparedProjectPhoto(upload);
    setUpload(null);
    setPhotoError('');
  };
  const archive = photo => {
    const photoIds = new Set([photo.id, photo.photoId].filter(Boolean));
    const isDesignSource = data.designConcepts.some(item => photoIds.has(item.sourcePhotoId) || photoIds.has(item.originalPhoto))
      || data.designCanvasSettings.some(item => photoIds.has(item.backgroundPhotoId));
    if (isDesignSource) {
      alert('This photo is the protected original source for a saved design. Choose a different design background before archiving it.');
      return;
    }
    if (confirm(`Archive ${photo.caption || photo.fileName}?`)) {
      setData(current => ({ ...current, projectPhotos: current.projectPhotos.map(item => item.id === photo.id ? { ...item, archived: true } : item) }));
    }
  };
  const remove = photo => {
    const photoIds = new Set([photo.id, photo.photoId].filter(Boolean));
    const isDesignSource = data.designConcepts.some(item => photoIds.has(item.sourcePhotoId) || photoIds.has(item.originalPhoto))
      || data.designCanvasSettings.some(item => photoIds.has(item.backgroundPhotoId));
    if (isDesignSource) {
      alert('This photo is the protected original source for a saved design and cannot be deleted.');
      return;
    }
    if (confirm(`Permanently delete ${photo.caption || photo.fileName}? This cannot be undone.`)) {
      setData(current => ({ ...current, projectPhotos: current.projectPhotos.filter(item => item.id !== photo.id) }));
      removeProjectPhotoAttachments(photo).catch(error => console.error('The deleted photo attachment could not be removed.', error));
      if (editingId === photo.id) cancelEdit();
    }
  };
  return <div className="design-photo-page">
    <form className="panel glass design-photo-form" onSubmit={savePhoto} noValidate data-guide-target="property-photo">
      <div><span>Property photography</span><h3>{editingId ? 'Edit property photo' : 'Add a property photo'}</h3><p>Organize the visual story from arrival through completion.</p></div>
      <label>Category<select value={form.stage} onChange={event => setForm({ ...form, stage: event.target.value })}>{['Before', 'Progress', 'Finished'].map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Photo date<input required type="date" value={form.photoDate} onChange={event => setForm({ ...form, photoDate: event.target.value })} /></label>
      <label>Caption<input placeholder="Photo caption" value={form.caption} onChange={event => setForm({ ...form, caption: event.target.value })} /></label>
      <label>Tags<input placeholder="Tags, separated by commas" value={form.tags} onChange={event => setForm({ ...form, tags: event.target.value })} /></label>
      {!editingId && <div className="design-photo-source-actions"><label className="design-file-button">Take Photo<input type="file" accept={PROJECT_PHOTO_ACCEPT} capture="environment" onChange={event => { selectPhoto(event.target.files?.[0]); event.target.value = ''; }} /></label><label className="design-file-button">Upload Photo<input type="file" accept={PROJECT_PHOTO_ACCEPT} onChange={event => { selectPhoto(event.target.files?.[0]); event.target.value = ''; }} /></label></div>}
      {photoLoading && <div className="design-photo-status" role="status">{upload ? 'Saving photo to this device…' : 'Preparing photo preview…'}</div>}
      {upload && <div className="design-selected-photo"><img src={upload.data} alt="Selected property photo preview" /><div><strong>Preview ready</strong><span>{upload.name} · {upload.width} × {upload.height}</span><button type="button" onClick={() => { releasePreparedProjectPhoto(upload); setUpload(null); }}>Cancel selection</button></div></div>}
      <div className="design-photo-form-actions">{editingId && <button type="button" onClick={cancelEdit}>Cancel edit</button>}<button className="primary" disabled={photoLoading}>{editingId ? 'Save photo changes' : photoLoading ? 'Saving photo…' : 'Save to gallery'}</button></div>
      {photoError && <div className="design-photo-error" role="alert">{photoError}</div>}
    </form>
    <div className="design-gallery-toolbar"><div>{['All', 'Before', 'Progress', 'Finished'].map(item => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div><span>{photos.length} visible photos</span></div>
    <section className="design-photo-gallery">{photos.map(photo => <article className="glass" key={photo.id}>
      <button className="design-photo-preview" onClick={() => setPreview(photo)}><img src={photo.image} alt={photo.caption || `${photo.stage} site photo`} /><span>View full screen</span></button>
      <div><span>{photo.stage} • {dateLabel(photo.photoDate)}</span><h3>{photo.caption || photo.fileName}</h3><div className="design-tag-row">{(photo.tags || []).map(tag => <small key={tag}>{tag}</small>)}</div><div className="design-photo-card-actions"><button onClick={() => editPhoto(photo)}>Edit</button><button onClick={() => archive(photo)}>Archive</button><button className="danger" onClick={() => remove(photo)}>Delete</button></div></div>
    </article>)}{!photos.length && <EmptyStudio title="No photos in this view" text="Add before, progress, and finished photos to build the project story." />}</section>
    {preview && <div className="design-lightbox" role="dialog" aria-modal="true" aria-label="Photo preview" onClick={() => setPreview(null)}><button aria-label="Close preview" onClick={() => setPreview(null)}>×</button><figure onClick={event => event.stopPropagation()}><img src={preview.image} alt={preview.caption || preview.fileName} /><figcaption><strong>{preview.caption || preview.fileName}</strong><span>{preview.stage} • {dateLabel(preview.photoDate)}</span></figcaption></figure></div>}
  </div>;
}

function CanvasWorkspace({ concept, photos, measurements, saveConcept, duplicateConcept, archiveLinkedPlant }) {
  const [draft, setDraft] = useState(() => clone(concept.canvas));
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [selectedPlacement, setSelectedPlacement] = useState('');
  const [panMode, setPanMode] = useState(false);
  const dragRef = useRef(null);
  useEffect(() => {
    setDraft(clone(concept.canvas));
    setHistory([]);
    setFuture([]);
    setSelectedPlacement('');
    setPanMode(false);
  }, [concept.designId]);
  const change = updater => {
    setDraft(current => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      setHistory(items => [...items.slice(-24), clone(current)]);
      setFuture([]);
      return next;
    });
  };
  const undo = () => {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setFuture(items => [clone(draft), ...items.slice(0, 24)]);
    setDraft(previous);
    setHistory(items => items.slice(0, -1));
  };
  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setHistory(items => [...items, clone(draft)]);
    setDraft(next);
    setFuture(items => items.slice(1));
  };
  const removePlacement = () => {
    if (!selectedPlacement) return;
    const placement = draft.placements.find(item => item.id === selectedPlacement);
    if (!confirm(`Remove ${placement?.label || 'this marker'} from the design?`)) return;
    const archiveFromPlan = placement?.projectPlantId
      ? confirm('Also archive the linked item from the Project Plant Plan?\n\nOK: archive from Plant Plan too\nCancel: remove from design only')
      : false;
    change(current => ({ ...current, placements: current.placements.filter(item => item.id !== selectedPlacement) }));
    if (archiveFromPlan) archiveLinkedPlant(placement);
    setSelectedPlacement('');
  };
  const visibleLayers = new Map(draft.layers.map(layer => [layer.name, layer.visible]));
  const basePhoto = photos.find(photo => photo.id === draft.basePhotoId);
  const canvasBackground = basePhoto
    ? draft.gridVisible
      ? `linear-gradient(rgba(108,120,102,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(108,120,102,.18) 1px,transparent 1px),linear-gradient(rgba(255,250,241,.22),rgba(255,250,241,.22)),url("${basePhoto.image}")`
      : `linear-gradient(rgba(255,250,241,.22),rgba(255,250,241,.22)),url("${basePhoto.image}")`
    : undefined;
  const beginPan = event => {
    if (!panMode) return;
    if (event.target.closest('.canvas-placement')) return;
    dragRef.current = { x: event.clientX, y: event.clientY, panX: draft.panX, panY: draft.panY, before: clone(draft) };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const movePan = event => {
    if (!dragRef.current) return;
    setDraft(current => ({ ...current, panX: dragRef.current.panX + event.clientX - dragRef.current.x, panY: dragRef.current.panY + event.clientY - dragRef.current.y }));
  };
  const endPan = () => {
    if (!dragRef.current) return;
    if (dragRef.current.panX !== draft.panX || dragRef.current.panY !== draft.panY) {
      setHistory(items => [...items.slice(-24), dragRef.current.before]);
      setFuture([]);
    }
    dragRef.current = null;
  };
  return <div className="design-canvas-layout">
    <aside className="design-layer-panel glass">
      <span>Layer system</span><h3>Garden layers</h3>
      {draft.layers.map(layer => <label key={layer.id}><input type="checkbox" checked={layer.visible} onChange={() => change(current => ({ ...current, layers: current.layers.map(item => item.id === layer.id ? { ...item, visible: !item.visible } : item) }))} /><span>{layer.name}</span><small>{draft.placements.filter(item => item.layer === layer.name).length}</small></label>)}
    </aside>
    <section className="design-canvas-panel glass">
      <div className="design-canvas-toolbar">
        <div><button onClick={() => change(current => ({ ...current, zoom: Math.max(.6, Number((current.zoom - .1).toFixed(1))) }))}>−</button><span>{Math.round(draft.zoom * 100)}%</span><button onClick={() => change(current => ({ ...current, zoom: Math.min(1.8, Number((current.zoom + .1).toFixed(1))) }))}>+</button></div>
        <button className={draft.gridVisible ? 'active' : ''} onClick={() => change(current => ({ ...current, gridVisible: !current.gridVisible }))}>Grid</button>
        <button className={draft.measurementVisible ? 'active' : ''} onClick={() => change(current => ({ ...current, measurementVisible: !current.measurementVisible }))}>Measurements</button>
        <button className={panMode ? 'active' : ''} onClick={() => setPanMode(value => !value)}>Pan mode</button>
        <button onClick={undo} disabled={!history.length}>Undo</button><button onClick={redo} disabled={!future.length}>Redo</button>
        <button onClick={() => change(current => ({ ...current, zoom: 1, panX: 0, panY: 0 }))}>Reset view</button>
      </div>
      <div className="design-canvas-options">
        <label>Canvas background<select value={draft.basePhotoId} onChange={event => change(current => ({ ...current, basePhotoId: event.target.value }))}><option value="">Cream drafting paper</option>{photos.map(photo => <option key={photo.id} value={photo.id}>{photo.caption || photo.fileName}</option>)}</select></label>
        <span>{panMode ? 'Pan mode is active—drag the canvas to reposition the view.' : 'Turn on Pan mode to drag the canvas. Plant and material selections appear as placement markers.'}</span>
      </div>
      <div className={`design-canvas-viewport${panMode ? ' pan-mode' : ''}`} onPointerDown={beginPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan}>
        <div className={`design-canvas-surface${draft.gridVisible ? ' grid' : ''}`} style={{ transform: `translate(${draft.panX}px, ${draft.panY}px) scale(${draft.zoom})`, backgroundImage: canvasBackground, backgroundSize: basePhoto ? draft.gridVisible ? '40px 40px,40px 40px,auto,cover' : 'auto,cover' : undefined, backgroundPosition: basePhoto ? draft.gridVisible ? '0 0,0 0,0 0,center' : '0 0,center' : undefined }}>
          {draft.measurementVisible && <div className="design-measurement-overlay">{measurements.slice(0, 8).map((item, index) => <span key={item.measurementId} style={{ left: `${12 + (index % 4) * 22}%`, top: `${14 + Math.floor(index / 4) * 64}%` }}>{item.label}: {item.length || '—'}{item.width ? ` × ${item.width}` : ''} {item.unit}</span>)}</div>}
          {draft.placements.filter(item => visibleLayers.get(item.layer) !== false).map(item => <button key={item.id} className={`canvas-placement ${item.type}${selectedPlacement === item.id ? ' selected' : ''}`} style={{ left: `${item.x}%`, top: `${item.y}%` }} onPointerDown={event => event.stopPropagation()} onClick={() => setSelectedPlacement(item.id)}><span>{item.type === 'plant' ? '✿' : '◆'}</span><strong>{item.label}</strong><small>{item.layer}</small></button>)}
          {!draft.placements.length && <div className="design-canvas-welcome"><span>✦</span><strong>Your concept canvas is ready</strong><p>Choose approved plants or materials from their studio sections to add placement placeholders.</p></div>}
        </div>
      </div>
      <div className="design-canvas-footer">
        <button onClick={removePlacement} disabled={!selectedPlacement}>Remove selected marker</button>
        <button onClick={() => duplicateConcept(concept)}>Duplicate Design</button>
        <button className="primary" onClick={() => saveConcept(concept.designId, draft, 'Canvas saved')}>Save Design</button>
      </div>
    </section>
  </div>;
}

function DesignConcepts({ data, setData, project, canvasOnly = false, openPresentation, initialDesignId = '', storageStatus, onOpenGuide, onGuideAction }) {
  const projectId = project.projectId;
  const [activeId, setActiveId] = useState(initialDesignId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [newStatus, setNewStatus] = useState('Draft');
  const [detailDraft, setDetailDraft] = useState({ name: '', description: '', status: 'Draft' });
  const concepts = data.designConcepts.filter(item => item.projectId === projectId && !item.archived).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const active = concepts.find(item => item.designId === activeId) || concepts[0];
  useEffect(() => {
    if (active && active.designId !== activeId) setActiveId(active.designId);
    if (!active && activeId) setActiveId('');
  }, [active?.designId, activeId]);
  useEffect(() => { if (initialDesignId) setActiveId(initialDesignId); }, [initialDesignId]);
  useEffect(() => {
    if (active) setDetailDraft({ name: active.name, description: active.description || '', status: active.status });
  }, [active?.designId]);
  const create = event => {
    event.preventDefault();
    if (!name.trim()) return;
    const designId = uid('design');
    const concept = {
      id: designId,
      designId,
      projectId,
      clientId: project.clientId || '',
      name: name.trim(),
      designName: name.trim(),
      description: description.trim(),
      status: newStatus,
      designStatus: newStatus,
      approvalStatus: newStatus === 'Approved' ? 'Approved' : 'Not approved',
      versionNumber: 1,
      sourcePhotoId: '',
      originalPhoto: '',
      currentPreview: '',
      createdAt: now(),
      updatedAt: now(),
      notes: { general: '', clientRequests: '', maintenance: '', futureIdeas: '' },
      revisionHistory: [{ id: uid('revision'), date: now(), note: 'Concept created' }],
      canvas: emptyCanvas(),
      archived: false,
    };
    setData(current => {
      const designLayers = createDefaultDesignLayers({ projectId, clientId: project.clientId, conceptId: designId });
      const designCanvasSettings = createCanvasSettings({ projectId, clientId: project.clientId, conceptId: designId });
      let next = addTimelineEvent({
        ...current,
        designConcepts: [concept, ...current.designConcepts],
        designLayers: [...designLayers, ...current.designLayers],
        designCanvasSettings: [designCanvasSettings, ...current.designCanvasSettings],
      }, {
        projectId,
        eventType: 'design.created',
        title: 'Design concept created',
        description: concept.name,
        relatedRecordId: designId,
        dedupeKey: `design.created:${designId}`,
        automatic: true,
      });
      if (concept.status === 'Approved') next = addTimelineEvent(next, {
        projectId,
        eventType: 'design.approved',
        title: 'Design concept approved',
        description: concept.name,
        relatedRecordId: designId,
        dedupeKey: `design.approved:${designId}`,
        automatic: true,
      });
      return next;
    });
    setActiveId(designId);
    setName('');
    setDescription('');
    setNewStatus('Draft');
  };
  const patch = (designId, changes) => setData(current => ({ ...current, designConcepts: current.designConcepts.map(item => item.designId === designId ? { ...item, ...changes, updatedAt: now() } : item) }));
  const saveCanvas = (designId, canvas, revisionNote) => setData(current => ({
    ...current,
    designConcepts: current.designConcepts.map(item => item.designId === designId ? {
      ...item,
      canvas,
      updatedAt: now(),
      revisionHistory: [{ id: uid('revision'), date: now(), note: revisionNote }, ...(item.revisionHistory || [])],
    } : item),
  }));
  const duplicate = concept => {
    let result;
    setData(current => {
      result = duplicateDesignRecord(current, concept.designId);
      return result.state;
    });
    setTimeout(() => setActiveId(result?.designId || ''), 0);
  };
  const archive = concept => {
    if (confirm(`Archive ${concept.name}?`)) patch(concept.designId, { archived: true });
  };
  const saveDetails = () => {
    if (!active || !detailDraft.name.trim()) return;
    setData(current => {
      let next = {
        ...current,
        designConcepts: current.designConcepts.map(item => item.designId === active.designId ? {
        ...item,
        name: detailDraft.name.trim(),
        description: detailDraft.description.trim(),
        status: detailDraft.status,
        updatedAt: now(),
        revisionHistory: [{ id: uid('revision'), date: now(), note: 'Concept details saved' }, ...(item.revisionHistory || [])],
      } : item),
      };
      if (active.status !== 'Approved' && detailDraft.status === 'Approved') next = addTimelineEvent(next, {
        projectId,
        eventType: 'design.approved',
        title: 'Design concept approved',
        description: detailDraft.name.trim(),
        relatedRecordId: active.designId,
        dedupeKey: `design.approved:${active.designId}`,
        automatic: true,
      });
      return next;
    });
  };
  const archiveLinkedPlant = placement => setData(current => {
    let next = {
      ...current,
      projectPlants: current.projectPlants.map(item => item.projectPlantId === placement.projectPlantId ? { ...item, status: 'Archived', archived: true, updatedAt: now() } : item),
    };
    return addTimelineEvent(next, {
      projectId,
      eventType: 'plant.archived',
      title: 'Plant archived from Project Plant Plan',
      description: `${placement.label} was removed from the design and archived from the Plant Plan.`,
      relatedRecordId: placement.projectPlantId,
      dedupeKey: `plant.archived:${placement.projectPlantId}`,
      automatic: true,
    });
  });
  const photos = data.projectPhotos.filter(item => item.projectId === projectId && !item.archived);
  const measurements = data.designMeasurements.filter(item => item.projectId === projectId && !item.archived && (!item.designId || item.designId === active?.designId));
  return <div className="design-concepts-page">
    <section className="panel glass concept-ribbon">
      {canvasOnly ? <div className="concept-ribbon-title"><span>Saved design workspace</span><h3>Design Canvas</h3><p>Select a concept, then work with its photo background, layers, markers, and measurements.</p></div> : <form onSubmit={create}><div><span>Multiple versions welcome</span><h3>Design Concepts</h3></div><input required aria-label="New concept name" placeholder="Concept A, Spring Version, Premium Version…" value={name} onChange={event => setName(event.target.value)} /><textarea aria-label="New concept description" placeholder="Describe the design direction and client-facing idea" value={description} onChange={event => setDescription(event.target.value)} /><select aria-label="New concept status" value={newStatus} onChange={event => setNewStatus(event.target.value)}>{['Draft', 'Client Review', 'Awaiting Approval', 'Approved', 'Revision Requested'].map(item => <option key={item}>{item}</option>)}</select><button className="primary">Create concept</button></form>}
      <div>{concepts.map(concept => <button key={concept.designId} className={active?.designId === concept.designId ? 'active' : ''} onClick={() => setActiveId(concept.designId)} aria-label={`Open ${concept.name}`}><span>{concept.status}</span><strong>{concept.name}</strong><small>{dateLabel(concept.updatedAt)}</small></button>)}</div>
    </section>
    {active && canvasOnly && <InteractiveDesignStudio key={active.designId} data={data} setData={setData} project={project} concept={active} duplicateConcept={duplicate} openPresentation={openPresentation} storageStatus={storageStatus} onOpenGuide={onOpenGuide} onGuideAction={onGuideAction} />}
    {active && !canvasOnly && <section className="concept-detail-card glass">
      <div><span>Reopened saved concept</span><h3>{active.name}</h3><p>Last saved {dateLabel(active.updatedAt)}</p></div>
      <label>Concept name<input value={detailDraft.name} onChange={event => setDetailDraft({ ...detailDraft, name: event.target.value })} /></label>
      <label>Description<textarea value={detailDraft.description} onChange={event => setDetailDraft({ ...detailDraft, description: event.target.value })} /></label>
      <label>Status<select value={detailDraft.status} onChange={event => setDetailDraft({ ...detailDraft, status: event.target.value })}>{['Draft', 'Client Review', 'Awaiting Approval', 'Approved', 'Revision Requested'].map(item => <option key={item}>{item}</option>)}</select></label>
      <div><button onClick={() => setDetailDraft({ name: active.name, description: active.description || '', status: active.status })}>Reopen saved version</button><button onClick={() => duplicate(active)}>Duplicate</button><button onClick={() => archive(active)}>Archive</button><button className="primary" onClick={saveDetails}>Save concept</button></div>
    </section>}
    {!active && <EmptyStudio title={canvasOnly ? 'Create a concept before opening the canvas' : 'Create the first design concept'} text={canvasOnly ? 'Use Design Concepts to name and save the first version, then return to the canvas.' : 'Save multiple approaches without overwriting earlier client options.'} />}
  </div>;
}

function PlantPalette({ data, setData, projectId }) {
  const blank = { commonName: '', scientificName: '', botanicalName: '', category: 'Tree', plantType: 'Tree', zones: '', light: 'Sun', sunRequirements: 'Sun', waterNeeds: '', soilPreferences: '', matureHeight: '', matureWidth: '', spacing: '', bloomSeason: '', flowerColor: '', fruitSeason: '', edibleStatus: 'Not specified', toxicityNotes: '', petSafetyNotes: '', nativeStatus: 'Not specified', pollinatorValue: '', deerResistance: '', companionPlants: '', maintenanceNotes: '', pruningNotes: '', installationNotes: '', supplier: '', supplierCost: '', customerPrice: '', tags: [], traits: [], nurseryId: '', sourcingRecordId: '', notes: '', approved: true, favorite: false, informationSource: 'User-entered information' };
  const [form, setForm] = useState(blank);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [conceptId, setConceptId] = useState('');
  const [placementMode, setPlacementMode] = useState('Add to Design Only');
  const concepts = data.designConcepts.filter(item => item.projectId === projectId && !item.archived);
  useEffect(() => { if (!conceptId && concepts[0]) setConceptId(concepts[0].designId); }, [conceptId, concepts]);
  const sourcing = data.sourcingRecords.filter(item => item.projectId === projectId && !item.archived);
  const plants = data.designPlants.filter(item => item.approved && !item.archived).filter(item => {
    const text = `${item.commonName} ${item.scientificName} ${item.botanicalName} ${item.category} ${item.light} ${item.zones} ${item.waterNeeds} ${item.soilPreferences} ${item.bloomSeason} ${item.flowerColor} ${item.nativeStatus} ${item.pollinatorValue} ${(item.traits || []).join(' ')} ${(item.tags || []).join(' ')} ${item.notes}`.toLowerCase();
    const matchesQuery = text.includes(query.toLowerCase());
    const matchesFilter = filter === 'All'
      || (filter === 'Favorite' ? item.favorite : text.includes(filter.toLowerCase()));
    return matchesQuery && matchesFilter;
  });
  const toggleTrait = trait => setForm(current => ({ ...current, traits: current.traits.includes(trait) ? current.traits.filter(item => item !== trait) : [...current.traits, trait] }));
  const addPlant = event => {
    event.preventDefault();
    const plantId = uid('plant');
    setData(current => ({ ...current, designPlants: [{ ...form, id: plantId, plantId, createdAt: now(), archived: false }, ...current.designPlants] }));
    setForm(blank);
    setShowForm(false);
  };
  const addToConcept = plant => {
    if (!conceptId) return;
    setData(current => {
      let next = current;
      let projectPlantId = '';
      if (placementMode === 'Add to Project Plant Plan') {
        const project = current.projects.find(item => item.projectId === projectId);
        const result = upsertProjectPlant(current, {
          projectId,
          clientId: project?.clientId || '',
          plantName: plant.commonName || plant.plant,
          scientificName: plant.scientificName || '',
          category: plant.category || 'Plant',
          quantity: 1,
          conceptId,
          designPlantId: plant.plantId || '',
          sourcingRecordId: plant.sourcingRecordId || '',
          nurseryId: plant.nurseryId || '',
          unitCost: plant.unitCost || plant.estimatedCost || '',
          status: 'Proposed',
          notes: plant.notes || '',
        });
        next = result.state;
        projectPlantId = result.record.projectPlantId;
        if (result.created) next = addTimelineEvent(next, {
          projectId,
          eventType: 'plant.added',
          title: 'Plant added to project',
          description: `${result.record.plantName} was added from the Design District to the Project Plant Plan.`,
          relatedRecordId: projectPlantId,
          dedupeKey: `plant.added:${projectPlantId}`,
          automatic: true,
        });
      }
      return { ...next, designConcepts: next.designConcepts.map(concept => {
      if (concept.designId !== conceptId) return concept;
      const index = concept.canvas.placements.length;
      const layer = plant.category === 'Tree' ? 'Trees' : plant.category === 'Shrub' ? 'Shrubs' : plant.category === 'Container' ? 'Containers' : 'Flowers';
      return {
        ...concept,
        updatedAt: now(),
        canvas: { ...concept.canvas, placements: [...concept.canvas.placements, { id: uid('placement'), sourceId: plant.plantId, projectPlantId, type: 'plant', label: plant.commonName, layer, x: 18 + (index * 13) % 68, y: 22 + (index * 17) % 58 }] },
        revisionHistory: [{ id: uid('revision'), date: now(), note: `${plant.commonName} added to canvas` }, ...(concept.revisionHistory || [])],
      };
      }) };
    });
  };
  const addSourcedPlant = record => addToConcept({
    plantId: record.sourcingRecordId || record.id,
    commonName: record.plant,
    category: 'Flower',
    sourcingRecordId: record.sourcingRecordId || record.id,
    nurseryId: record.nurseryId,
    unitCost: record.unitCost || record.estimatedCost,
    notes: record.notes,
  });
  const addPlantToSourcing = plant => {
    const id = uid('source-record');
    setData(current => ({ ...current, sourcingRecords: [{ id, sourcingRecordId: id, projectId, nurseryId: plant.nurseryId || '', plant: plant.commonName, variety: '', quantity: 1, quantityAvailable: '', containerSize: '', wholesaleCost: plant.supplierCost || '', retailCost: plant.customerPrice || '', deliveryFee: '', estimatedCost: plant.supplierCost || '', availabilityDate: '', lastVerifiedDate: today(), pickupStatus: 'Not ordered', status: 'Considering', shortage: false, substitutePlant: '', notes: plant.installationNotes || plant.notes || '', createdAt: now(), archived: false }, ...current.sourcingRecords] }));
  };
  const addPlantToEstimate = plant => {
    const project = data.projects.find(item => item.projectId === projectId);
    const client = data.clients.find(item => item.clientId === project?.clientId);
    const line = normalizeEstimateLine({ category: plant.category === 'Tree' ? 'Trees' : 'Plants', description: [plant.commonName, plant.botanicalName || plant.scientificName].filter(Boolean).join(' · '), quantity: 1, unit: 'plant', cost: plant.supplierCost || '', customerPrice: plant.customerPrice || plant.supplierCost || '', taxable: true, notes: plant.installationNotes || plant.notes || '' });
    setData(current => {
      const existing = current.estimates.find(item => item.projectId === projectId && item.documentType !== 'Invoice' && item.status === 'Draft' && !item.archived);
      if (existing) return { ...current, estimates: current.estimates.map(item => item.id === existing.id ? { ...item, lines: [...(item.lines || []), line], lineItems: [...(item.lines || []), line], updatedAt: now() } : item) };
      const id = uid('estimate');
      return { ...current, estimates: [{ id, estimateId: id, invoiceId: '', documentType: 'Estimate', estimateNumber: nextEstimateNumber(current.estimates, localDate()), clientId: project?.clientId || '', projectId, client: client?.name || '', title: `${project?.name || 'Landscape'} Proposal`, status: 'Draft', creationDate: localDate(), date: localDate(), serviceAddress: project?.propertyAddress || '', scopeOfWork: project?.notes || '', lines: [line], lineItems: [line], discountAmount: '', taxRate: current.business.defaultTax || '', depositPercent: '30', archived: false, createdAt: now(), updatedAt: now() }, ...current.estimates] };
    });
  };
  const patchPlant = (plantId, changes) => setData(current => ({ ...current, designPlants: current.designPlants.map(item => item.plantId === plantId ? { ...item, ...changes } : item) }));
  return <div className="design-library-page">
    <section className="panel glass design-library-controls">
      <div><span>Plant Sourcing District connection</span><h3>Approved Plant Palette</h3><p>Build a searchable, reusable palette and place botanical markers into a saved concept.</p></div>
      <input type="search" placeholder="Common name, scientific name, category, sun, shade, trait…" value={query} onChange={event => setQuery(event.target.value)} />
      <div className="design-filter-chips">{['All', 'Sun', 'Shade', 'Evergreen', 'Fruit', 'Native', 'Pollinator', 'Favorite'].map(item => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
      <div className="design-library-actions"><label>Add selections to<select value={conceptId} onChange={event => setConceptId(event.target.value)}><option value="">Choose a design concept</option>{concepts.map(item => <option key={item.designId} value={item.designId}>{item.name}</option>)}</select></label><label>When placed<select value={placementMode} onChange={event => setPlacementMode(event.target.value)}><option>Add to Design Only</option><option>Add to Project Plant Plan</option></select></label><button className="primary" onClick={() => setShowForm(value => !value)}>{showForm ? 'Close plant form' : 'Add approved plant'}</button></div>
    </section>
    {showForm && <form className="panel glass design-plant-form" onSubmit={addPlant}>
      <input required placeholder="Common name *" value={form.commonName} onChange={event => setForm({ ...form, commonName: event.target.value })} />
      <input placeholder="Botanical name" value={form.botanicalName} onChange={event => setForm({ ...form, botanicalName: event.target.value, scientificName: event.target.value })} />
      <select value={form.category} onChange={event => setForm({ ...form, category: event.target.value, plantType: event.target.value })}>{['Tree', 'Shrub', 'Flower', 'Container', 'Groundcover', 'Herb', 'Grass', 'Vegetable', 'Vine'].map(item => <option key={item}>{item}</option>)}</select>
      <select value={form.light} onChange={event => setForm({ ...form, light: event.target.value, sunRequirements: event.target.value })}>{['Sun', 'Part Sun', 'Part Shade', 'Shade'].map(item => <option key={item}>{item}</option>)}</select>
      <select value={form.nurseryId} onChange={event => setForm({ ...form, nurseryId: event.target.value })}><option value="">Optional nursery</option>{data.nurseries.filter(item => !item.archived).map(item => <option key={item.nurseryId || item.id} value={item.nurseryId || item.id}>{item.name}</option>)}</select>
      <select value={form.sourcingRecordId} onChange={event => setForm({ ...form, sourcingRecordId: event.target.value })}><option value="">Optional sourcing record</option>{sourcing.map(item => <option key={item.sourcingRecordId || item.id} value={item.sourcingRecordId || item.id}>{item.plant}</option>)}</select>
      <textarea placeholder="Design notes, habit, seasonal interest…" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} />
      <fieldset><legend>Plant traits</legend>{['Evergreen', 'Fruit', 'Native', 'Pollinator'].map(trait => <label key={trait}><input type="checkbox" checked={form.traits.includes(trait)} onChange={() => toggleTrait(trait)} />{trait}</label>)}</fieldset>
      <details className="plant-intelligence-fields"><summary>Plant intelligence details</summary><div>
        <input placeholder="USDA zones" value={form.zones} onChange={event => setForm({ ...form, zones: event.target.value })} />
        <input placeholder="Water needs" value={form.waterNeeds} onChange={event => setForm({ ...form, waterNeeds: event.target.value })} />
        <input placeholder="Soil preferences" value={form.soilPreferences} onChange={event => setForm({ ...form, soilPreferences: event.target.value })} />
        <input placeholder="Mature height" value={form.matureHeight} onChange={event => setForm({ ...form, matureHeight: event.target.value })} />
        <input placeholder="Mature width" value={form.matureWidth} onChange={event => setForm({ ...form, matureWidth: event.target.value })} />
        <input placeholder="Spacing" value={form.spacing} onChange={event => setForm({ ...form, spacing: event.target.value })} />
        <input placeholder="Bloom season" value={form.bloomSeason} onChange={event => setForm({ ...form, bloomSeason: event.target.value })} />
        <input placeholder="Flower color" value={form.flowerColor} onChange={event => setForm({ ...form, flowerColor: event.target.value })} />
        <input placeholder="Fruit / harvest season" value={form.fruitSeason} onChange={event => setForm({ ...form, fruitSeason: event.target.value })} />
        <select value={form.edibleStatus} onChange={event => setForm({ ...form, edibleStatus: event.target.value })}>{['Not specified', 'Edible', 'Not edible'].map(item => <option key={item}>{item}</option>)}</select>
        <select value={form.nativeStatus} onChange={event => setForm({ ...form, nativeStatus: event.target.value })}>{['Not specified', 'Native', 'Non-native', 'Cultivar'].map(item => <option key={item}>{item}</option>)}</select>
        <input placeholder="Pollinator value" value={form.pollinatorValue} onChange={event => setForm({ ...form, pollinatorValue: event.target.value })} />
        <input placeholder="Deer resistance" value={form.deerResistance} onChange={event => setForm({ ...form, deerResistance: event.target.value })} />
        <input placeholder="Companion plants" value={form.companionPlants} onChange={event => setForm({ ...form, companionPlants: event.target.value })} />
        <input placeholder="Supplier" value={form.supplier} onChange={event => setForm({ ...form, supplier: event.target.value })} />
        <input type="number" min="0" step="0.01" placeholder="Supplier cost" value={form.supplierCost} onChange={event => setForm({ ...form, supplierCost: event.target.value })} />
        <input type="number" min="0" step="0.01" placeholder="Customer price" value={form.customerPrice} onChange={event => setForm({ ...form, customerPrice: event.target.value })} />
        <textarea placeholder="Toxicity notes" value={form.toxicityNotes} onChange={event => setForm({ ...form, toxicityNotes: event.target.value })} />
        <textarea placeholder="Pet safety notes" value={form.petSafetyNotes} onChange={event => setForm({ ...form, petSafetyNotes: event.target.value })} />
        <textarea placeholder="Maintenance notes" value={form.maintenanceNotes} onChange={event => setForm({ ...form, maintenanceNotes: event.target.value })} />
        <textarea placeholder="Pruning notes" value={form.pruningNotes} onChange={event => setForm({ ...form, pruningNotes: event.target.value })} />
        <textarea placeholder="Installation notes" value={form.installationNotes} onChange={event => setForm({ ...form, installationNotes: event.target.value })} />
        <input placeholder="Tags, comma separated" value={form.tags.join(', ')} onChange={event => setForm({ ...form, tags: event.target.value.split(',').map(item => item.trim()).filter(Boolean) })} />
      </div><p>User-entered information is labeled separately from built-in reference content. Verify site-specific plant facts before promising performance.</p></details>
      <button className="primary">Save approved plant</button>
    </form>}
    {sourcing.length > 0 && <section className="panel glass design-sourcing-ribbon"><div><span>Connected project records</span><h3>Plant Sourcing selections</h3></div><div>{sourcing.map(record => {
      const nursery = data.nurseries.find(item => (item.nurseryId || item.id) === record.nurseryId);
      return <article key={record.sourcingRecordId || record.id}><div><strong>{record.plant}</strong><span>{nursery?.name || 'Nursery not linked'} • {record.status}</span></div><button onClick={() => addSourcedPlant(record)} disabled={!conceptId}>Add to concept</button></article>;
    })}</div></section>}
    <section className="design-card-library">{plants.map(plant => {
      const nursery = data.nurseries.find(item => (item.nurseryId || item.id) === plant.nurseryId);
      return <article className="design-plant-card glass" key={plant.plantId}>
        <button className="design-favorite" aria-label={plant.favorite ? 'Remove favorite' : 'Add favorite'} onClick={() => patchPlant(plant.plantId, { favorite: !plant.favorite })}>{plant.favorite ? '★' : '☆'}</button>
        <span>{plant.category} • {plant.light} • {plant.informationSource || 'User-entered information'}</span><h3>{plant.commonName}</h3><em>{plant.botanicalName || plant.scientificName || 'Botanical name not added'}</em>
        <div className="design-tag-row">{(plant.traits || []).map(trait => <small key={trait}>{trait}</small>)}</div>
        <dl className="plant-intelligence-facts"><div><dt>Zones</dt><dd>{plant.zones || '—'}</dd></div><div><dt>Size</dt><dd>{[plant.matureHeight, plant.matureWidth].filter(Boolean).join(' × ') || '—'}</dd></div><div><dt>Water</dt><dd>{plant.waterNeeds || '—'}</dd></div><div><dt>Bloom / fruit</dt><dd>{plant.bloomSeason || plant.fruitSeason || '—'}</dd></div></dl>
        <p>{plant.notes || plant.maintenanceNotes || 'Ready for a project palette.'}</p><small>{nursery ? `Source: ${nursery.name}` : plant.supplier ? `Source: ${plant.supplier}` : 'No nursery linked'}</small>
        <div><button onClick={() => addToConcept(plant)} disabled={!conceptId}>Add to concept</button><button onClick={() => addPlantToSourcing(plant)}>Add to sourcing</button><button onClick={() => addPlantToEstimate(plant)}>Add to estimate</button><button onClick={() => patchPlant(plant.plantId, { archived: true })}>Archive</button></div>
      </article>;
    })}{!plants.length && <EmptyStudio title="No approved plants match" text="Add a plant with useful light, category, and design traits or adjust the search." />}</section>
  </div>;
}

function MaterialLibrary({ data, setData, projectId }) {
  const blank = { name: '', category: 'Custom Material', finish: '', notes: '', favorite: false };
  const [query, setQuery] = useState('');
  const [conceptId, setConceptId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const concepts = data.designConcepts.filter(item => item.projectId === projectId && !item.archived);
  useEffect(() => { if (!conceptId && concepts[0]) setConceptId(concepts[0].designId); }, [conceptId, concepts]);
  const materials = data.designMaterials.filter(item => !item.archived && `${item.name} ${item.category} ${item.finish} ${item.notes}`.toLowerCase().includes(query.toLowerCase()));
  const add = event => {
    event.preventDefault();
    const materialId = uid('material');
    setData(current => ({ ...current, designMaterials: [{ ...form, id: materialId, materialId, archived: false }, ...current.designMaterials] }));
    setForm(blank);
    setShowForm(false);
  };
  const patch = (materialId, changes) => setData(current => ({ ...current, designMaterials: current.designMaterials.map(item => item.materialId === materialId ? { ...item, ...changes } : item) }));
  const addToConcept = material => {
    if (!conceptId) return;
    setData(current => ({ ...current, designConcepts: current.designConcepts.map(concept => {
      if (concept.designId !== conceptId) return concept;
      const index = concept.canvas.placements.length;
      return {
        ...concept,
        updatedAt: now(),
        canvas: { ...concept.canvas, placements: [...concept.canvas.placements, { id: uid('placement'), sourceId: material.materialId, type: 'material', label: material.name, layer: material.name === 'Lighting' ? 'Lighting' : material.name === 'Containers' ? 'Containers' : 'Hardscape', x: 20 + (index * 14) % 66, y: 18 + (index * 19) % 62 }] },
        revisionHistory: [{ id: uid('revision'), date: now(), note: `${material.name} added to canvas` }, ...(concept.revisionHistory || [])],
      };
    }) }));
  };
  return <div className="design-library-page">
    <section className="panel glass design-library-controls"><div><span>Reusable finishes</span><h3>Material Library</h3><p>Search project finishes and add simple material markers to any saved concept.</p></div><input type="search" placeholder="Search materials, finishes, or notes" value={query} onChange={event => setQuery(event.target.value)} /><div className="design-library-actions"><label>Add selections to<select value={conceptId} onChange={event => setConceptId(event.target.value)}><option value="">Choose a design concept</option>{concepts.map(item => <option key={item.designId} value={item.designId}>{item.name}</option>)}</select></label><button className="primary" onClick={() => setShowForm(value => !value)}>{showForm ? 'Close form' : 'Add material'}</button></div></section>
    {showForm && <form className="panel glass design-material-form" onSubmit={add}><input required placeholder="Material name *" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /><input placeholder="Category" value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} /><input placeholder="Color or finish" value={form.finish} onChange={event => setForm({ ...form, finish: event.target.value })} /><textarea placeholder="Reusable material notes" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /><button className="primary">Save material</button></form>}
    <section className="design-card-library materials">{materials.map(material => <article className="design-material-card glass" key={material.materialId}><button className="design-favorite" onClick={() => patch(material.materialId, { favorite: !material.favorite })}>{material.favorite ? '★' : '☆'}</button><span>{material.category}</span><h3>{material.name}</h3><strong>{material.finish}</strong><p>{material.notes}</p><div><button onClick={() => addToConcept(material)} disabled={!conceptId}>Add to concept</button><button onClick={() => patch(material.materialId, { archived: true })}>Archive</button></div></article>)}</section>
  </div>;
}

function InspirationBoard({ data, setData, projectId }) {
  const styles = ['French Estate', 'Cottage', 'Formal', 'Mediterranean', 'Woodland', 'Modern'];
  const blank = { title: '', styleTags: [], colorNotes: '', plantCombinationNotes: '', textureNotes: '', image: '', imageName: '' };
  const [form, setForm] = useState(blank);
  const [file, setFile] = useState(null);
  const items = data.designInspirations.filter(item => item.projectId === projectId && !item.archived).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const add = async event => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const upload = file ? await fileAsData(file) : null;
    const inspirationId = uid('inspiration');
    const record = { ...form, id: inspirationId, inspirationId, projectId, type: upload ? 'Reference Image' : 'Design Reference', colors: form.colorNotes.split(',').map(value => value.trim()).filter(Boolean), image: upload?.data || '', imageName: upload?.name || '', createdAt: now(), archived: false };
    setData(current => ({ ...current, designInspirations: [record, ...current.designInspirations] }));
    setForm(blank);
    setFile(null);
    formElement.reset();
  };
  const toggleStyle = style => setForm(current => ({ ...current, styleTags: current.styleTags.includes(style) ? current.styleTags.filter(item => item !== style) : [...current.styleTags, style] }));
  const archive = item => {
    if (confirm(`Archive ${item.title}?`)) setData(current => ({ ...current, designInspirations: current.designInspirations.map(record => record.inspirationId === item.inspirationId ? { ...record, archived: true } : record) }));
  };
  const remove = item => {
    if (confirm(`Permanently remove ${item.title} from the Inspiration Board?`)) setData(current => ({ ...current, designInspirations: current.designInspirations.filter(record => record.inspirationId !== item.inspirationId) }));
  };
  return <div className="inspiration-layout">
    <form className="panel glass inspiration-form" onSubmit={add}><span>Project mood</span><h3>Add to the Inspiration Board</h3>
      <input required placeholder="Title *" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} />
      <fieldset className="inspiration-style-tags"><legend>Style tags</legend>{styles.map(style => <label key={style}><input type="checkbox" checked={form.styleTags.includes(style)} onChange={() => toggleStyle(style)} />{style}</label>)}</fieldset>
      <textarea placeholder="Color notes or palette colors, separated by commas" value={form.colorNotes} onChange={event => setForm({ ...form, colorNotes: event.target.value })} />
      <textarea placeholder="Plant-combination notes" value={form.plantCombinationNotes} onChange={event => setForm({ ...form, plantCombinationNotes: event.target.value })} />
      <textarea placeholder="Texture notes" value={form.textureNotes} onChange={event => setForm({ ...form, textureNotes: event.target.value })} />
      <label className="design-file-button">Upload reference image (optional)<input type="file" accept="image/*" onChange={event => setFile(event.target.files?.[0] || null)} /></label>
      <button className="primary">Save inspiration</button>
    </form>
    <section className="inspiration-board">{items.map(item => <article className="glass" key={item.inspirationId}>
      {item.image ? <img src={item.image} alt={item.title} /> : <div className="inspiration-texture" aria-hidden="true">❦</div>}
      <div><span>{item.type} • {(item.styleTags || []).join(' • ') || 'Style open'}</span><h3>{item.title}</h3>{item.colors?.length > 0 && <div className="inspiration-swatches">{item.colors.map((color, index) => <i key={`${color}-${index}`} title={color} style={{ background: color }}><small>{color}</small></i>)}</div>}<p><strong>Colors:</strong> {item.colorNotes || 'Open'}</p><p><strong>Plant combination:</strong> {item.plantCombinationNotes || 'Open'}</p><p><strong>Texture:</strong> {item.textureNotes || 'Open'}</p><div className="inspiration-actions"><button onClick={() => archive(item)}>Archive</button><button className="danger" onClick={() => remove(item)}>Remove</button></div></div>
    </article>)}{!items.length && <EmptyStudio title="The inspiration board is open" text="Save reference photos, color palettes, plant combinations, texture ideas, and style keywords." />}</section>
  </div>;
}

function DesignNotes({ data, setData, projectId }) {
  const concepts = data.designConcepts.filter(item => item.projectId === projectId && !item.archived);
  const [conceptId, setConceptId] = useState(concepts[0]?.designId || '');
  const concept = concepts.find(item => item.designId === conceptId) || concepts[0];
  const [notes, setNotes] = useState(concept?.notes || { general: '', clientRequests: '', maintenance: '', futureIdeas: '' });
  useEffect(() => {
    if (concept) {
      setConceptId(concept.designId);
      setNotes(concept.notes);
    }
  }, [concept?.designId]);
  const save = event => {
    event.preventDefault();
    setData(current => ({ ...current, designConcepts: current.designConcepts.map(item => item.designId === concept.designId ? { ...item, notes, updatedAt: now(), revisionHistory: [{ id: uid('revision'), date: now(), note: 'Design notes revised' }, ...(item.revisionHistory || [])] } : item) }));
  };
  if (!concept) return <EmptyStudio title="Create a concept before adding design notes" text="Each concept keeps its own client requests, maintenance guidance, future ideas, and revision history." />;
  return <div className="design-notes-layout">
    <form className="panel glass design-notes-form" onSubmit={save}><div><span>Concept notebook</span><h3>Design Notes</h3></div><select value={concept.designId} onChange={event => setConceptId(event.target.value)}>{concepts.map(item => <option key={item.designId} value={item.designId}>{item.name}</option>)}</select>
      <label>General Notes<textarea value={notes.general} onChange={event => setNotes({ ...notes, general: event.target.value })} /></label>
      <label>Client Requests<textarea value={notes.clientRequests} onChange={event => setNotes({ ...notes, clientRequests: event.target.value })} /></label>
      <label>Maintenance Notes<textarea value={notes.maintenance} onChange={event => setNotes({ ...notes, maintenance: event.target.value })} /></label>
      <label>Future Ideas<textarea value={notes.futureIdeas} onChange={event => setNotes({ ...notes, futureIdeas: event.target.value })} /></label>
      <button className="primary">Save notes and revision</button>
    </form>
    <section className="panel glass revision-history"><span>Concept record</span><h3>Revision History</h3>{(concept.revisionHistory || []).map(item => <article key={item.id}><time>{dateLabel(item.date)}</time><p>{item.note}</p></article>)}{!concept.revisionHistory?.length && <p>No revisions recorded yet.</p>}</section>
  </div>;
}

function Measurements({ data, setData, projectId }) {
  const blank = { label: '', length: '', width: '', unit: 'ft', areaNotes: '', designId: '' };
  const [form, setForm] = useState(blank);
  const concepts = data.designConcepts.filter(item => item.projectId === projectId && !item.archived);
  const canvasMeasurements = (data.designObjects || []).filter(item => item.projectId === projectId && item.objectType === 'measurement' && !item.archived).map(item => ({
    id: item.objectId,
    measurementId: item.objectId,
    projectId: item.projectId,
    designId: item.conceptId,
    label: item.label,
    length: '',
    width: '',
    unit: 'approx.',
    areaNotes: `Canvas annotation · ${item.clientVisible ? 'Client-visible' : 'Internal'} · ${item.locked ? 'Locked' : 'Editable'}${item.visible ? '' : ' · Hidden'}`,
    canvasObject: true,
  }));
  const measurements = [...data.designMeasurements.filter(item => item.projectId === projectId && !item.archived), ...canvasMeasurements];
  const add = event => {
    event.preventDefault();
    const measurementId = uid('measurement');
    setData(current => ({ ...current, designMeasurements: [{ ...form, id: measurementId, measurementId, projectId, createdAt: now(), archived: false }, ...current.designMeasurements] }));
    setForm(blank);
  };
  const archive = id => setData(current => ({
    ...current,
    designMeasurements: current.designMeasurements.map(item => item.measurementId === id ? { ...item, archived: true } : item),
    designObjects: (current.designObjects || []).map(item => item.objectId === id ? { ...item, archived: true, updatedAt: now() } : item),
  }));
  return <div className="measurement-layout">
    <form className="panel glass measurement-form" onSubmit={add}><span>Site dimensions</span><h3>Add a Measurement</h3><label>Label<input required placeholder="Front bed, fence run, patio…" value={form.label} onChange={event => setForm({ ...form, label: event.target.value })} /></label><div><label>Length<input required type="number" min="0" step="0.01" placeholder="0" value={form.length} onChange={event => setForm({ ...form, length: event.target.value })} /></label><label>Width<input type="number" min="0" step="0.01" placeholder="Optional" value={form.width} onChange={event => setForm({ ...form, width: event.target.value })} /></label></div><label>Unit<select value={form.unit} onChange={event => setForm({ ...form, unit: event.target.value })}>{['in', 'ft', 'yd', 'm'].map(item => <option key={item}>{item}</option>)}</select></label><label>Related concept<select value={form.designId} onChange={event => setForm({ ...form, designId: event.target.value })}><option value="">Project-wide measurement</option>{concepts.map(item => <option key={item.designId} value={item.designId}>{item.name}</option>)}</select></label><label>Area notes<textarea placeholder="Area, method, reference point, or field note" value={form.areaNotes} onChange={event => setForm({ ...form, areaNotes: event.target.value })} /></label><button className="primary">Save measurement</button></form>
    <section className="measurement-cards">{measurements.map(item => {
      const concept = concepts.find(record => record.designId === item.designId);
      const area = Number(item.length || 0) && Number(item.width || 0) ? Number(item.length) * Number(item.width) : 0;
      return <article className="glass" key={item.measurementId}><span>{concept?.name || 'Project-wide'}</span><h3>{item.label}</h3><strong>{item.length} {item.unit}{item.width ? ` × ${item.width} ${item.unit}` : ''}</strong>{area > 0 && <small>{area.toFixed(2)} square {item.unit}</small>}<p>{item.areaNotes || 'No area note'}</p><button onClick={() => archive(item.measurementId)}>Archive</button></article>;
    })}{!measurements.length && <EmptyStudio title="No measurements saved" text="Record field dimensions now; future layout tools can use these structured records." />}</section>
  </div>;
}

function IndependentDesignWorkspace({ data, setData, record, onBack, storageStatus, onOpenGuide, onGuideAction }) {
  const [tab, setTab] = useState('Overview');
  const [details, setDetails] = useState({ name: record.name || '', description: record.description || '', notes: record.notes || '' });
  const [link, setLink] = useState({ clientId: record.clientId || '', projectId: record.projectId || '' });
  const concept = data.designConcepts.find(item => item.designId === record.designId);
  const ownerProjectId = record.projectId || record.independentDesignId;
  const project = { projectId: ownerProjectId, clientId: record.clientId || '', name: record.name, propertyAddress: record.projectId ? data.projects.find(item => item.projectId === record.projectId)?.propertyAddress || '' : 'Independent Design', status: record.projectId ? 'Linked' : 'Independent Design' };
  const clients = data.clients.filter(item => !item.archived);
  const projects = data.projects.filter(item => !item.archived && (!link.clientId || item.clientId === link.clientId));
  const objectCount = data.designObjects.filter(item => item.conceptId === record.designId && !item.archived).length;
  const noteCount = data.designNotes.filter(item => item.conceptId === record.designId && !item.archived).length;
  const versionCount = data.designVersions.filter(item => item.conceptId === record.designId && !item.archived).length;
  const photoCount = data.projectPhotos.filter(item => item.projectId === ownerProjectId && !item.archived).length;

  useEffect(() => setDetails({ name: record.name || '', description: record.description || '', notes: record.notes || '' }), [record.independentDesignId]);
  if (!concept) return <div className="page"><EmptyStudio title="This Independent Design needs repair" text="The design metadata is preserved, but its canvas concept could not be found in this backup." /><button onClick={onBack}>Return to Design District</button></div>;

  const saveDetails = event => {
    event.preventDefault();
    if (!details.name.trim()) return;
    const updatedAt = now();
    setData(current => ({ ...current, independentDesigns: current.independentDesigns.map(item => item.independentDesignId === record.independentDesignId ? { ...item, ...details, name: details.name.trim(), description: details.description.trim(), updatedAt } : item), designConcepts: current.designConcepts.map(item => item.designId === record.designId ? { ...item, name: details.name.trim(), description: details.description.trim(), updatedAt, revisionHistory: [{ id: uid('revision'), date: updatedAt, note: 'Independent Design details saved' }, ...(item.revisionHistory || [])] } : item) }));
  };

  const linkToProject = () => {
    const targetProject = data.projects.find(item => item.projectId === link.projectId && !item.archived);
    if (!targetProject || targetProject.clientId !== link.clientId) return;
    const previousOwnerId = record.projectId || record.independentDesignId;
    const updatedAt = now();
    setData(current => {
      let next = {
        ...current,
        independentDesigns: current.independentDesigns.map(item => item.independentDesignId === record.independentDesignId ? { ...item, clientId: targetProject.clientId, projectId: targetProject.projectId, linkedAt: updatedAt, updatedAt } : item),
        designConcepts: current.designConcepts.map(item => item.designId === record.designId ? { ...item, clientId: targetProject.clientId, projectId: targetProject.projectId, independentDesignId: record.independentDesignId, updatedAt } : item),
        designObjects: current.designObjects.map(item => item.conceptId === record.designId ? { ...item, clientId: targetProject.clientId, projectId: targetProject.projectId, updatedAt } : item),
        designLayers: current.designLayers.map(item => item.conceptId === record.designId ? { ...item, clientId: targetProject.clientId, projectId: targetProject.projectId, updatedAt } : item),
        designCanvasSettings: current.designCanvasSettings.map(item => item.conceptId === record.designId ? { ...item, clientId: targetProject.clientId, projectId: targetProject.projectId, updatedAt } : item),
        designVersions: current.designVersions.map(item => item.conceptId === record.designId ? { ...item, clientId: targetProject.clientId, projectId: targetProject.projectId, snapshot: { ...item.snapshot, objects: (item.snapshot?.objects || []).map(object => ({ ...object, clientId: targetProject.clientId, projectId: targetProject.projectId })), layers: (item.snapshot?.layers || []).map(layer => ({ ...layer, clientId: targetProject.clientId, projectId: targetProject.projectId })), areas: (item.snapshot?.areas || []).map(area => ({ ...area, clientId: targetProject.clientId, projectId: targetProject.projectId })), masks: (item.snapshot?.masks || []).map(mask => ({ ...mask, clientId: targetProject.clientId, projectId: targetProject.projectId })), materialDrafts: (item.snapshot?.materialDrafts || []).map(material => ({ ...material, clientId: targetProject.clientId, projectId: targetProject.projectId })), canvasSettings: item.snapshot?.canvasSettings ? { ...item.snapshot.canvasSettings, clientId: targetProject.clientId, projectId: targetProject.projectId } : item.snapshot?.canvasSettings }, updatedAt } : item),
        designNotes: current.designNotes.map(item => item.conceptId === record.designId ? { ...item, clientId: targetProject.clientId, projectId: targetProject.projectId, updatedAt } : item),
        designAreas: current.designAreas.map(item => item.conceptId === record.designId ? { ...item, clientId: targetProject.clientId, projectId: targetProject.projectId, updatedAt } : item),
        designMasks: current.designMasks.map(item => item.conceptId === record.designId ? { ...item, clientId: targetProject.clientId, projectId: targetProject.projectId } : item),
        designMaterialDrafts: current.designMaterialDrafts.map(item => item.conceptId === record.designId ? { ...item, clientId: targetProject.clientId, projectId: targetProject.projectId, updatedAt } : item),
        projectMaterials: current.projectMaterials.map(item => item.conceptId === record.designId ? { ...item, clientId: targetProject.clientId, projectId: targetProject.projectId, updatedAt } : item),
        designMeasurements: current.designMeasurements.map(item => item.designId === record.designId || item.projectId === previousOwnerId ? { ...item, clientId: targetProject.clientId, projectId: targetProject.projectId, updatedAt } : item),
        projectPhotos: current.projectPhotos.map(item => item.projectId === previousOwnerId && (item.independentDesignId === record.independentDesignId || previousOwnerId === record.independentDesignId) ? { ...item, clientId: targetProject.clientId, projectId: targetProject.projectId, independentDesignId: record.independentDesignId, updatedAt } : item),
        designInspirations: current.designInspirations.map(item => item.projectId === previousOwnerId ? { ...item, clientId: targetProject.clientId, projectId: targetProject.projectId, independentDesignId: record.independentDesignId, updatedAt } : item),
      };
      next = addTimelineEvent(next, { projectId: targetProject.projectId, eventType: 'design.independent.linked', title: 'Independent Design linked', description: record.name, relatedRecordId: record.designId, dedupeKey: `design.independent.linked:${record.independentDesignId}:${targetProject.projectId}`, automatic: true });
      return next;
    });
    setTab('Overview');
  };

  const archive = () => {
    if (!confirm(`Archive ${record.name}? Its canvas, objects, notes, photos, and versions will remain available for restore.`)) return;
    setData(current => ({ ...current, independentDesigns: current.independentDesigns.map(item => item.independentDesignId === record.independentDesignId ? { ...item, archived: true, updatedAt: now() } : item), designConcepts: current.designConcepts.map(item => item.designId === record.designId ? { ...item, archived: true, updatedAt: now() } : item) }));
    onBack();
  };

  return <div className="page design-district-page independent-design-workspace">
    <header className="design-studio-header glass"><button onClick={onBack}>← Design District</button><div><span>Independent Design{record.projectId ? ` · Linked to ${record.projectId}` : ' · No client or project required'}</span><h2>{record.name}</h2><p>{record.projectId ? `${data.clients.find(item => item.clientId === record.clientId)?.name || 'Client'} · original canvas retained` : 'A standalone Tierra Fleur landscape idea'}</p></div><span className="design-studio-flourish" aria-hidden="true">🦋</span></header>
    <nav className="design-studio-tabs" aria-label="Independent Design sections">{['Overview', 'Property or Inspiration Photo', 'Design Canvas'].map(item => <button key={item} data-guide-target={item === 'Design Canvas' ? 'design-canvas' : undefined} className={tab === item ? 'active' : ''} onClick={() => { setTab(item); if (item === 'Design Canvas') onGuideAction?.('canvas-opened'); }}>{item}</button>)}</nav>
    {tab === 'Overview' && <div className="independent-overview-grid"><form className="panel glass district-form" onSubmit={saveDetails}><span className="district-eyebrow">Independent Design details</span><h3>Name and notes</h3><label>Design name<input required value={details.name} onChange={event => setDetails({ ...details, name: event.target.value })} /></label><label>Design intent<textarea value={details.description} onChange={event => setDetails({ ...details, description: event.target.value })} /></label><label>Personal notes<textarea value={details.notes} onChange={event => setDetails({ ...details, notes: event.target.value })} /></label><button className="primary">Save details</button><button type="button" onClick={archive}>Archive Independent Design</button></form>
      <section className="panel glass independent-overview-card"><span className="independent-badge">Independent Design</span><h3>{record.name}</h3><dl><div><dt>Date created</dt><dd>{dateLabel(record.createdAt)}</dd></div><div><dt>Last edited</dt><dd>{dateLabel(record.updatedAt || concept.updatedAt)}</dd></div><div><dt>Canvas objects</dt><dd>{objectCount}</dd></div><div><dt>Photos</dt><dd>{photoCount}</dd></div><div><dt>Notes</dt><dd>{noteCount}</dd></div><div><dt>Versions</dt><dd>{versionCount}</dd></div></dl><p><strong>Background:</strong> {photoCount ? 'Property or inspiration photo available' : record.backgroundKind || 'Cream garden paper placeholder'}</p></section>
      <section className="panel glass independent-link-card"><span className="district-eyebrow">Optional future connection</span><h3>{record.projectId ? 'Linked without duplication' : 'Link to a client and project later'}</h3>{record.projectId ? <p>This original design now belongs to <strong>{record.projectId}</strong>. Its concept ID, canvas settings, layers, objects, notes, and versions were reassigned in place.</p> : <><label>Client<select value={link.clientId} onChange={event => setLink({ clientId: event.target.value, projectId: '' })}><option value="">Choose a client</option>{clients.map(item => <option key={item.clientId} value={item.clientId}>{item.name}</option>)}</select></label><label>Project<select value={link.projectId} onChange={event => setLink({ ...link, projectId: event.target.value })}><option value="">Choose that client’s project</option>{projects.map(item => <option key={item.projectId} value={item.projectId}>{item.projectId} · {item.name}</option>)}</select></label><button className="primary" disabled={!link.clientId || !link.projectId} onClick={linkToProject}>Link original design</button><small>This changes ownership fields only. It never copies the design or canvas objects.</small></>}</section></div>}
    {tab === 'Property or Inspiration Photo' && <SitePhotos data={data} setData={setData} projectId={ownerProjectId} independent={!record.projectId} onGuideAction={onGuideAction} />}
    {tab === 'Design Canvas' && <InteractiveDesignStudio key={concept.designId} data={data} setData={setData} project={project} concept={concept} independent storageStatus={storageStatus} onOpenGuide={onOpenGuide} onGuideAction={onGuideAction} />}
  </div>;
}

export function DesignDistrict({ data, setData, initialProjectId = '', openProject, openProjectDistrict, openSketch, openPresentation, storageStatus = 'saved' }) {
  const [selectedId, setSelectedId] = useState(initialProjectId);
  const [selectedDesignId, setSelectedDesignId] = useState('');
  const [selectedIndependentId, setSelectedIndependentId] = useState('');
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [practiceStarted, setPracticeStarted] = useState(hasSavedPracticeDesign);
  const [tab, setTab] = useState('Overview');
  const { guideOpen, setGuideOpen, guide, startWalkthrough, dismissWalkthrough, recordGuideAction } = useDesignGuide();
  useEffect(() => {
    if (initialProjectId) {
      setSelectedId(initialProjectId);
      setTab('Overview');
    }
  }, [initialProjectId]);
  const openGuide = () => setGuideOpen(true);
  const openPractice = () => { setGuideOpen(false); setPracticeOpen(true); recordGuideAction('design-type'); };
  const withGuide = content => <>
    {content}
    <DesignGuide open={guideOpen} completed={guide.completed} onClose={() => setGuideOpen(false)} onStartWalkthrough={startWalkthrough} onOpenPractice={openPractice} />
    <WalkthroughOverlay guide={guide} onDismiss={dismissWalkthrough} onOpenGuide={openGuide} />
  </>;
  if (practiceOpen) return withGuide(<PracticeDesign onBack={() => setPracticeOpen(false)} onOpenGuide={openGuide} onGuideAction={recordGuideAction} onStarted={() => setPracticeStarted(true)} onRemoved={() => setPracticeStarted(false)} />);
  const independentDesign = (data.independentDesigns || []).find(item => item.independentDesignId === selectedIndependentId && !item.archived);
  if (independentDesign) return withGuide(<IndependentDesignWorkspace data={data} setData={setData} record={independentDesign} onBack={() => setSelectedIndependentId('')} storageStatus={storageStatus} onOpenGuide={openGuide} onGuideAction={recordGuideAction} />);
  const project = data.projects.find(item => item.projectId === selectedId && !item.archived);
  if (!project) return withGuide(<DesignLanding data={data} setData={setData} openProjectDistrict={openProjectDistrict} selectIndependent={setSelectedIndependentId} selectProject={(projectId, designId = '') => { setSelectedId(projectId); setSelectedDesignId(designId); setTab(designId ? 'Design Canvas' : 'Overview'); if (designId) recordGuideAction('canvas-opened'); }} onOpenGuide={openGuide} onOpenPractice={openPractice} onGuideAction={recordGuideAction} practiceStarted={practiceStarted} />);
  return withGuide(<div className="page design-district-page">
    <header className="design-studio-header glass">
      <button onClick={() => setSelectedId('')}>← Design District</button>
      <div><span>{project.projectId} • Project Design Studio</span><h2>{project.name}</h2><p>{project.propertyAddress || 'Property address not added'}</p></div>
      <span className="design-studio-flourish" aria-hidden="true">✿</span>
    </header>
    <nav className="design-studio-tabs" aria-label="Design Studio sections">{DESIGN_TABS.map(item => <button key={item} data-guide-target={item === 'Design Canvas' ? 'design-canvas' : undefined} className={tab === item ? 'active' : ''} onClick={() => { setTab(item); if (item === 'Design Canvas') recordGuideAction('canvas-opened'); }}>{item}</button>)}</nav>
    {tab === 'Overview' && <PropertyOverview data={data} project={project} openProject={openProject} openSketch={openSketch} setTab={setTab} />}
    {tab === 'Property Photos' && <SitePhotos data={data} setData={setData} projectId={project.projectId} onGuideAction={recordGuideAction} />}
    {tab === 'Design Concepts' && <DesignConcepts data={data} setData={setData} project={project} initialDesignId={selectedDesignId} />}
    {tab === 'Design Canvas' && <DesignConcepts data={data} setData={setData} project={project} canvasOnly openPresentation={openPresentation} initialDesignId={selectedDesignId} storageStatus={storageStatus} onOpenGuide={openGuide} onGuideAction={recordGuideAction} />}
    {tab === 'Plant Palette' && <PlantPalette data={data} setData={setData} projectId={project.projectId} />}
    {tab === 'Materials' && <MaterialLibrary data={data} setData={setData} projectId={project.projectId} />}
    {tab === 'Inspiration Board' && <InspirationBoard data={data} setData={setData} projectId={project.projectId} />}
    {tab === 'Notes' && <DesignNotes data={data} setData={setData} projectId={project.projectId} />}
    {tab === 'Measurements' && <Measurements data={data} setData={setData} projectId={project.projectId} />}
  </div>);
}
