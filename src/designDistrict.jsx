import React, { useEffect, useMemo, useRef, useState } from 'react';
import './designDistrict.css';
import { addTimelineEvent, upsertProjectPlant } from './projectEngine.js';
import { InteractiveDesignStudio } from './designStudioWorkspace.jsx';
import { createCanvasSettings, createDefaultDesignLayers, createDesignObject } from './designEngine.js';
import { prepareProjectPhoto, PROJECT_PHOTO_ACCEPT } from './imageStorage.js';

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
  const activeConcepts = data.designConcepts.filter(concept => !concept.archived);
  const versions = (data.designVersions || []).filter(item => !item.archived);
  const projectFor = record => activeProjects.find(project => project.projectId === record?.projectId);
  const inProgress = activeConcepts.filter(item => ['Draft', 'Internal Review', 'Designing'].includes(item.status));
  const ready = versions.filter(item => ['Ready to Present', 'Recommended'].includes(item.status));
  const awaitingRevision = versions.filter(item => item.status === 'Needs Revision');
  const approved = versions.filter(item => item.status === 'Approved');
  const unlinkedPlants = (data.designObjects || []).filter(item => !item.archived && item.objectType === 'plant' && !item.relatedProjectPlantId);
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

function DesignLanding({ data, selectProject, openProjectDistrict }) {
  const projects = data.projects.filter(project => !project.archived);
  const concepts = data.designConcepts.filter(item => !item.archived);
  const awaiting = concepts.filter(item => ['Client Review', 'Awaiting Approval'].includes(item.status)).length;
  const recent = [...concepts].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, 4);
  return <div className="design-landing">
    <section className="design-landing-hero glass">
      <div><span>Artist’s studio</span><h2>Design District</h2><p>Shape landscape ideas into connected project concepts, palettes, inspiration, measurements, and client-ready stories.</p></div>
      <span className="design-hero-butterfly" aria-hidden="true">🦋</span>
      <div className="design-landing-metrics">
        <div><strong>{projects.length}</strong><span>Project studios</span></div>
        <div><strong>{concepts.length}</strong><span>Saved concepts</span></div>
        <div><strong>{awaiting}</strong><span>Concepts awaiting approval</span></div>
      </div>
    </section>
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

function SitePhotos({ data, setData, projectId }) {
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
  const savePhoto = event => {
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
    const photo = {
      id: uid('photo'),
      photoId: uid('site-photo'),
      projectId,
      stage: form.stage,
      caption: form.caption.trim(),
      photoDate: form.photoDate,
      tags: form.tags.split(',').map(value => value.trim()).filter(Boolean),
      image: upload.data,
      fileName: upload.name,
      imageType: upload.type,
      width: upload.width,
      height: upload.height,
      createdAt: now(),
      archived: false,
    };
    setData(current => addTimelineEvent({ ...current, projectPhotos: [photo, ...current.projectPhotos] }, {
      projectId,
      eventType: 'photo.uploaded',
      title: 'Property photo uploaded',
      description: photo.caption || photo.fileName,
      relatedRecordId: photo.photoId,
      dedupeKey: `photo.uploaded:${photo.photoId}`,
      automatic: true,
    }));
    setForm(blank);
    setUpload(null);
    setPhotoError('');
    formElement.reset();
  };
  const editPhoto = photo => {
    setEditingId(photo.id);
    setForm({ stage: photo.stage, caption: photo.caption || '', photoDate: photo.photoDate || today(), tags: (photo.tags || []).join(', ') });
    setUpload(null);
    setPhotoError('');
  };
  const cancelEdit = () => {
    setEditingId('');
    setForm(blank);
    setUpload(null);
    setPhotoError('');
  };
  const archive = photo => {
    if (confirm(`Archive ${photo.caption || photo.fileName}?`)) {
      setData(current => ({ ...current, projectPhotos: current.projectPhotos.map(item => item.id === photo.id ? { ...item, archived: true } : item) }));
    }
  };
  const remove = photo => {
    if (confirm(`Permanently delete ${photo.caption || photo.fileName}? This cannot be undone.`)) {
      setData(current => ({ ...current, projectPhotos: current.projectPhotos.filter(item => item.id !== photo.id) }));
      if (editingId === photo.id) cancelEdit();
    }
  };
  return <div className="design-photo-page">
    <form className="panel glass design-photo-form" onSubmit={savePhoto} noValidate>
      <div><span>Property photography</span><h3>{editingId ? 'Edit property photo' : 'Add a property photo'}</h3><p>Organize the visual story from arrival through completion.</p></div>
      <label>Category<select value={form.stage} onChange={event => setForm({ ...form, stage: event.target.value })}>{['Before', 'Progress', 'Finished'].map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Photo date<input required type="date" value={form.photoDate} onChange={event => setForm({ ...form, photoDate: event.target.value })} /></label>
      <label>Caption<input placeholder="Photo caption" value={form.caption} onChange={event => setForm({ ...form, caption: event.target.value })} /></label>
      <label>Tags<input placeholder="Tags, separated by commas" value={form.tags} onChange={event => setForm({ ...form, tags: event.target.value })} /></label>
      <div className="design-photo-source-actions"><label className="design-file-button">Take Photo<input type="file" accept={PROJECT_PHOTO_ACCEPT} capture="environment" onChange={event => { selectPhoto(event.target.files?.[0]); event.target.value = ''; }} /></label><label className="design-file-button">{editingId ? 'Replace Photo' : 'Upload Photo'}<input type="file" accept={PROJECT_PHOTO_ACCEPT} onChange={event => { selectPhoto(event.target.files?.[0]); event.target.value = ''; }} /></label></div>
      {photoLoading && <div className="design-photo-status" role="status">Preparing photo preview…</div>}
      {upload && <div className="design-selected-photo"><img src={upload.data} alt="Selected property photo preview" /><div><strong>Preview ready</strong><span>{upload.name} · {upload.width} × {upload.height}</span><button type="button" onClick={() => setUpload(null)}>Cancel selection</button></div></div>}
      <div className="design-photo-form-actions">{editingId && <button type="button" onClick={cancelEdit}>Cancel edit</button>}<button className="primary">{editingId ? 'Save photo changes' : 'Save to gallery'}</button></div>
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

function DesignConcepts({ data, setData, project, canvasOnly = false, openPresentation }) {
  const projectId = project.projectId;
  const [activeId, setActiveId] = useState('');
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
      name: name.trim(),
      description: description.trim(),
      status: newStatus,
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
    const designId = uid('design');
    const duplicateConcept = {
      ...clone(concept),
      id: designId,
      designId,
      name: `${concept.name} — Copy`,
      status: 'Draft',
      createdAt: now(),
      updatedAt: now(),
      revisionHistory: [{ id: uid('revision'), date: now(), note: `Duplicated from ${concept.name}` }, ...(concept.revisionHistory || [])],
    };
    setData(current => {
      const sourceLayers = current.designLayers.filter(item => item.conceptId === concept.designId);
      const layerMap = new Map();
      const layers = sourceLayers.map(item => {
        const layerId = uid('design-layer');
        layerMap.set(item.layerId, layerId);
        return { ...clone(item), id: layerId, layerId, conceptId: designId, projectId, clientId: project.clientId, createdAt: now(), updatedAt: now() };
      });
      const fallbackLayers = layers.length ? layers : createDefaultDesignLayers({ projectId, clientId: project.clientId, conceptId: designId });
      const sourceSettings = current.designCanvasSettings.find(item => item.conceptId === concept.designId);
      const settings = sourceSettings
        ? { ...clone(sourceSettings), id: `design-canvas-${designId}`, canvasSettingId: `design-canvas-${designId}`, conceptId: designId, projectId, clientId: project.clientId, revision: 0, updatedAt: now(), presentationLayerIds: (sourceSettings.presentationLayerIds || []).map(id => layerMap.get(id)).filter(Boolean) }
        : createCanvasSettings({ projectId, clientId: project.clientId, conceptId: designId });
      const objects = current.designObjects.filter(item => item.conceptId === concept.designId && !item.archived).map(item => createDesignObject({ ...clone(item), id: undefined, objectId: undefined, conceptId: designId, projectId, clientId: project.clientId, layerId: layerMap.get(item.layerId) || fallbackLayers[0]?.layerId, legacySourceId: '', createdAt: now(), updatedAt: now() }));
      return {
        ...current,
        designConcepts: [duplicateConcept, ...current.designConcepts],
        designLayers: [...fallbackLayers, ...current.designLayers],
        designCanvasSettings: [settings, ...current.designCanvasSettings],
        designObjects: [...objects, ...current.designObjects],
      };
    });
    setActiveId(designId);
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
    {active && canvasOnly && <InteractiveDesignStudio key={active.designId} data={data} setData={setData} project={project} concept={active} duplicateConcept={duplicate} openPresentation={openPresentation} />}
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
  const blank = { commonName: '', scientificName: '', category: 'Tree', light: 'Sun', traits: [], nurseryId: '', sourcingRecordId: '', notes: '', approved: true, favorite: false };
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
    const text = `${item.commonName} ${item.scientificName} ${item.category} ${item.light} ${(item.traits || []).join(' ')} ${item.notes}`.toLowerCase();
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
      <input placeholder="Scientific name" value={form.scientificName} onChange={event => setForm({ ...form, scientificName: event.target.value })} />
      <select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>{['Tree', 'Shrub', 'Flower', 'Container', 'Groundcover', 'Herb', 'Grass'].map(item => <option key={item}>{item}</option>)}</select>
      <select value={form.light} onChange={event => setForm({ ...form, light: event.target.value })}>{['Sun', 'Part Sun', 'Part Shade', 'Shade'].map(item => <option key={item}>{item}</option>)}</select>
      <select value={form.nurseryId} onChange={event => setForm({ ...form, nurseryId: event.target.value })}><option value="">Optional nursery</option>{data.nurseries.filter(item => !item.archived).map(item => <option key={item.nurseryId || item.id} value={item.nurseryId || item.id}>{item.name}</option>)}</select>
      <select value={form.sourcingRecordId} onChange={event => setForm({ ...form, sourcingRecordId: event.target.value })}><option value="">Optional sourcing record</option>{sourcing.map(item => <option key={item.sourcingRecordId || item.id} value={item.sourcingRecordId || item.id}>{item.plant}</option>)}</select>
      <textarea placeholder="Design notes, habit, seasonal interest…" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} />
      <fieldset><legend>Plant traits</legend>{['Evergreen', 'Fruit', 'Native', 'Pollinator'].map(trait => <label key={trait}><input type="checkbox" checked={form.traits.includes(trait)} onChange={() => toggleTrait(trait)} />{trait}</label>)}</fieldset>
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
        <span>{plant.category} • {plant.light}</span><h3>{plant.commonName}</h3><em>{plant.scientificName || 'Scientific name not added'}</em>
        <div className="design-tag-row">{(plant.traits || []).map(trait => <small key={trait}>{trait}</small>)}</div>
        <p>{plant.notes || 'Ready for a project palette.'}</p><small>{nursery ? `Source: ${nursery.name}` : 'No nursery linked'}</small>
        <div><button onClick={() => addToConcept(plant)} disabled={!conceptId}>Add to concept</button><button onClick={() => patchPlant(plant.plantId, { archived: true })}>Archive</button></div>
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

export function DesignDistrict({ data, setData, initialProjectId = '', openProject, openProjectDistrict, openSketch, openPresentation }) {
  const [selectedId, setSelectedId] = useState(initialProjectId);
  const [tab, setTab] = useState('Overview');
  useEffect(() => {
    if (initialProjectId) {
      setSelectedId(initialProjectId);
      setTab('Overview');
    }
  }, [initialProjectId]);
  const project = data.projects.find(item => item.projectId === selectedId && !item.archived);
  if (!project) return <DesignLanding data={data} openProjectDistrict={openProjectDistrict} selectProject={projectId => { setSelectedId(projectId); setTab('Overview'); }} />;
  return <div className="page design-district-page">
    <header className="design-studio-header glass">
      <button onClick={() => setSelectedId('')}>← Design District</button>
      <div><span>{project.projectId} • Project Design Studio</span><h2>{project.name}</h2><p>{project.propertyAddress || 'Property address not added'}</p></div>
      <span className="design-studio-flourish" aria-hidden="true">✿</span>
    </header>
    <nav className="design-studio-tabs" aria-label="Design Studio sections">{DESIGN_TABS.map(item => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {tab === 'Overview' && <PropertyOverview data={data} project={project} openProject={openProject} openSketch={openSketch} setTab={setTab} />}
    {tab === 'Property Photos' && <SitePhotos data={data} setData={setData} projectId={project.projectId} />}
    {tab === 'Design Concepts' && <DesignConcepts data={data} setData={setData} project={project} />}
    {tab === 'Design Canvas' && <DesignConcepts data={data} setData={setData} project={project} canvasOnly openPresentation={openPresentation} />}
    {tab === 'Plant Palette' && <PlantPalette data={data} setData={setData} projectId={project.projectId} />}
    {tab === 'Materials' && <MaterialLibrary data={data} setData={setData} projectId={project.projectId} />}
    {tab === 'Inspiration Board' && <InspirationBoard data={data} setData={setData} projectId={project.projectId} />}
    {tab === 'Notes' && <DesignNotes data={data} setData={setData} projectId={project.projectId} />}
    {tab === 'Measurements' && <Measurements data={data} setData={setData} projectId={project.projectId} />}
  </div>;
}
