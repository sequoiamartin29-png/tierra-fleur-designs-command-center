import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { InteractiveDesignStudio } from './designStudioWorkspace.jsx';
import { createCanvasSettings, createDefaultDesignLayers, migrateDesignStudioData } from './designEngine.js';
import './designGuide.css';

const GUIDE_STORAGE_KEY = 'tierraFleurDesignDistrictGuideV1';
const PRACTICE_STORAGE_KEY = 'tierraFleurDesignDistrictPracticeV1';
const PRACTICE_PROJECT_ID = 'design-practice-project';
const PRACTICE_DESIGN_ID = 'design-practice-concept';

export const WALKTHROUGH_STEPS = [
  { action: 'design-type', target: 'design-type', title: 'Choose a design type', text: 'Choose the starting point that matches the work you want to do.' },
  { action: 'photo-added', target: 'property-photo', title: 'Add a property photo', text: 'Open Property Photos and save a photo. The walkthrough moves on only after the photo is stored.' },
  { action: 'canvas-opened', target: 'design-canvas', title: 'Open the Design Canvas', text: 'Open Design Canvas for the design you want to edit.' },
  { action: 'background-chosen', target: 'background-photo', title: 'Choose the background', text: 'Choose a saved property photo in Property image.' },
  { action: 'bed-drawn', target: 'tool-bed', title: 'Draw a garden bed', text: 'Choose Garden Bed, then drag across the canvas.' },
  { action: 'cover-drawn', target: 'tool-cover-freehand', title: 'Add ground cover', text: 'Choose Freehand Cover and draw a material area.' },
  { action: 'border-drawn', target: 'tool-border', title: 'Add a border', text: 'Choose Border, then drag along the edge you want.' },
  { action: 'plant-placed', target: 'tool-plant', title: 'Place a plant', text: 'Choose Plant and tap the canvas, or place one from Elements.' },
  { action: 'design-saved', target: 'save-design', title: 'Save the design', text: 'Choose Save now. This finishes only after storage confirms the save.' },
];

const HELP_SECTIONS = [
  ['Quick Start', ['Choose a real project, an independent idea, or Practice Design.', 'Add or choose a property photo.', 'Open Design Canvas, choose the photo, draw, and save.']],
  ['Create Your First Design', ['From Design District, choose a design type.', 'Give the design a clear name.', 'Open its Design Canvas when you are ready to draw.']],
  ['Upload and Choose a Property Photo', ['Open Property Photos or Property or Inspiration Photo.', 'Choose a photo, add a caption, and save it.', 'In Design Canvas, open Property image and choose that saved photo.']],
  ['Draw a Garden Bed', ['Choose Garden Bed in the toolbar.', 'Drag across the photo to shape the bed.', 'Use Object Details to change the bed type, size, or material.']],
  ['Add Mulch or Ground Cover', ['Choose Freehand, Polygon, Rectangle, or Ellipse Cover.', 'Choose the material in the options row.', 'Draw over the area that should receive the cover.']],
  ['Add a Border', ['Choose Border.', 'Choose a border style and thickness.', 'Drag across the canvas, then refine it in Object Details.']],
  ['Add a Pathway', ['Choose Pathway.', 'Choose the path material and width.', 'Drag from the path start to its end.']],
  ['Place Plants and Trees', ['Choose Plant for a quick placeholder, or open Elements.', 'Choose the plant or tree.', 'Tap the canvas or choose Place from the library, then move it into position.']],
  ['Move, Resize, Rotate, Duplicate, and Delete', ['Choose Select and tap an object.', 'Drag it to move it; drag the gold corner to resize it.', 'Use Object Details for rotation, duplicate, or delete. Undo remains available while the workspace is open.']],
  ['Use Layers', ['Open Layers on iPad or use the Layer Manager on a larger screen.', 'Tap a layer to make it active.', 'Use the eye to show or hide a layer and the lock to prevent accidental edits.']],
  ['Undo and Redo', ['Undo reverses the latest workspace change.', 'Redo restores the last change you undid.', 'A disabled button means there is no available change in that direction.']],
  ['Save and Reopen a Design', ['Unsaved changes means the canvas has newer work.', 'Saving… means the app is writing that work to this device.', 'Wait for Saved, then reopen the design from Saved Design Gallery.']],
  ['Before and After View', ['Open Before & After below the canvas.', 'Choose side-by-side or the reveal slider.', 'Only presentation-safe content is shown in client views.']],
  ['Export and Presentation Basics', ['Open Export below the canvas.', 'Review what will be included before printing or saving.', 'Use Client presentation for a cleaner client-facing view.']],
  ['Apple Pencil Tips', ['Choose a drawing tool before touching the canvas.', 'Apple Pencil drawing prevents the page from scrolling.', 'Choose Pan to move the canvas. Finger scrolling still works outside an active drawing gesture.']],
  ['Troubleshooting', ['If a tool is disabled, read its label for what is needed first.', 'If Save failed appears, keep this page open, export a backup, and free device storage before trying again.', 'If a photo is missing, reopen Property Photos and confirm that it is still available. No recovery action deletes records automatically.']],
];

function safeRead(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value && typeof value === 'object' ? value : fallback;
  } catch {
    return fallback;
  }
}

export function hasSavedPracticeDesign() {
  try { return Boolean(localStorage.getItem(PRACTICE_STORAGE_KEY)); } catch { return false; }
}

export function useDesignGuide() {
  const [guideOpen, setGuideOpen] = useState(false);
  const [guide, setGuide] = useState(() => ({ seen: false, completed: false, active: false, step: 0, ...safeRead(GUIDE_STORAGE_KEY, {}) }));

  useEffect(() => {
    try { localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(guide)); } catch { /* Guidance preferences never block the editor. */ }
  }, [guide]);

  useEffect(() => {
    if (!guide.seen && !guide.completed) setGuide(current => ({ ...current, seen: true, active: true, step: 0 }));
  }, []);

  const startWalkthrough = useCallback(() => {
    setGuideOpen(false);
    setGuide(current => ({ ...current, seen: true, completed: false, active: true, step: 0 }));
  }, []);
  const dismissWalkthrough = useCallback(() => setGuide(current => ({ ...current, seen: true, active: false })), []);
  const recordGuideAction = useCallback(action => {
    setGuide(current => {
      if (!current.active || WALKTHROUGH_STEPS[current.step]?.action !== action) return current;
      const nextStep = current.step + 1;
      return nextStep >= WALKTHROUGH_STEPS.length
        ? { ...current, active: false, completed: true, step: WALKTHROUGH_STEPS.length - 1 }
        : { ...current, step: nextStep };
    });
  }, []);

  return { guideOpen, setGuideOpen, guide, startWalkthrough, dismissWalkthrough, recordGuideAction };
}

export function DesignGuide({ open, completed, onClose, onStartWalkthrough, onOpenPractice }) {
  if (!open) return null;
  return <div className="design-guide-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="design-guide" role="dialog" aria-modal="true" aria-labelledby="design-guide-title">
      <header><div><span>Built-in help</span><h2 id="design-guide-title">Design District Guide</h2><p>Short, plain-language steps you can use while you work.</p></div><button type="button" className="guide-close" onClick={onClose} aria-label="Close Design District Guide">×</button></header>
      <div className="guide-actions"><button type="button" className="primary" onClick={onStartWalkthrough}>{completed ? 'Restart walkthrough' : 'Start quick walkthrough'}</button><button type="button" onClick={onOpenPractice}>Open Practice Design</button><span>{completed ? '✓ Walkthrough completed on this device' : 'The walkthrough waits for real actions.'}</span></div>
      <div className="guide-section-list">{HELP_SECTIONS.map(([title, steps], index) => <details key={title} open={index === 0}>
        <summary><span>{index + 1}</span>{title}</summary>
        <ol>{steps.map(step => <li key={step}>{step}</li>)}</ol>
      </details>)}</div>
    </section>
  </div>;
}

export function WalkthroughOverlay({ guide, onDismiss, onOpenGuide }) {
  const step = WALKTHROUGH_STEPS[guide.step];
  const [target, setTarget] = useState(null);
  useEffect(() => {
    if (!guide.active || !step) return undefined;
    const update = () => {
      const element = document.querySelector(`[data-guide-target="${step.target}"]`);
      if (!element) { setTarget(null); return; }
      const rect = element.getBoundingClientRect();
      setTarget({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [guide.active, guide.step, step]);
  if (!guide.active || !step) return null;
  return <div className="walkthrough-layer" aria-live="polite">
    {target && <div className="walkthrough-target" style={target} aria-hidden="true" />}
    <aside className="walkthrough-card" role="dialog" aria-label={`Walkthrough step ${guide.step + 1} of ${WALKTHROUGH_STEPS.length}`}>
      <span>Step {guide.step + 1} of {WALKTHROUGH_STEPS.length}</span><h3>{step.title}</h3><p>{step.text}</p><small>Waiting for this action—the step will not advance on its own.</small>
      <div><button type="button" onClick={onOpenGuide}>Open full guide</button><button type="button" onClick={onDismiss}>Dismiss</button></div>
    </aside>
  </div>;
}

function createPracticeData() {
  const createdAt = new Date().toISOString();
  const concept = { id: PRACTICE_DESIGN_ID, designId: PRACTICE_DESIGN_ID, projectId: PRACTICE_PROJECT_ID, clientId: '', name: 'Practice Design', designName: 'Practice Design', description: 'A private, removable place to learn the Design Canvas.', status: 'Draft', designStatus: 'Draft', approvalStatus: 'Not approved', versionNumber: 1, sourcePhotoId: '', originalPhoto: '', currentPreview: '', createdAt, updatedAt: createdAt, notes: {}, revisionHistory: [], canvas: { placements: [] }, archived: false };
  const project = { id: PRACTICE_PROJECT_ID, projectId: PRACTICE_PROJECT_ID, clientId: '', name: 'Practice Yard', propertyAddress: 'Private practice workspace', archived: false };
  const studio = migrateDesignStudioData({
    designLayers: createDefaultDesignLayers({ projectId: PRACTICE_PROJECT_ID, conceptId: PRACTICE_DESIGN_ID }),
    designCanvasSettings: [createCanvasSettings({ projectId: PRACTICE_PROJECT_ID, conceptId: PRACTICE_DESIGN_ID })],
    designTemplates: [],
    designElementLibrary: [],
  }, { projects: [project], clients: [], designConcepts: [concept] });
  return {
    ...studio,
    business: { name: 'Tierra Fleur Designs' }, clients: [], projects: [project], designConcepts: [concept], independentDesigns: [],
    projectPhotos: [],
    projectPlants: [], designPlants: [], sourcingRecords: [], designMaterials: [], estimates: [], addOnInterestRecords: [],
  };
}

const blankProgress = () => ({ moved: false, undo: false, saved: false });

export function PracticeDesign({ onBack, onOpenGuide, onGuideAction, onStarted, onRemoved }) {
  const [payload, setPayload] = useState(() => {
    const saved = safeRead(PRACTICE_STORAGE_KEY, null);
    return saved?.data ? saved : { data: createPracticeData(), progress: blankProgress() };
  });
  const [practiceStorage, setPracticeStorage] = useState('saved');
  const [confirmAction, setConfirmAction] = useState('');

  useEffect(() => { onStarted?.(); }, []);

  useEffect(() => {
    setPracticeStorage('saving');
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(PRACTICE_STORAGE_KEY, JSON.stringify(payload));
        setPracticeStorage('saved');
      } catch {
        setPracticeStorage('failed');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [payload]);

  const project = payload.data.projects[0];
  const concept = payload.data.designConcepts[0];
  const objects = payload.data.designObjects.filter(item => !item.archived);
  const tasks = useMemo(() => [
    ['Draw one bed', objects.some(item => item.objectType === 'bed')],
    ['Add mulch or ground cover', objects.some(item => item.objectType === 'cover' || item.objectType === 'material')],
    ['Add a border', objects.some(item => item.objectType === 'border')],
    ['Place two plants', objects.filter(item => item.objectType === 'plant').length >= 2],
    ['Move one plant', payload.progress.moved],
    ['Undo one change', payload.progress.undo],
    ['Save and reopen', payload.progress.saved],
  ], [objects, payload.progress]);

  const updateData = updater => setPayload(current => ({ ...current, data: typeof updater === 'function' ? updater(current.data) : updater }));
  const addPracticePhoto = () => {
    setPayload(current => current.data.projectPhotos.some(item => item.photoId === 'practice-yard-photo') ? current : { ...current, data: { ...current.data, projectPhotos: [{ id: 'practice-yard-photo', photoId: 'practice-yard-photo', projectId: PRACTICE_PROJECT_ID, caption: 'Neutral practice yard', fileName: 'design-practice-yard.svg', image: '/assets/design-practice-yard.svg', safeForPresentation: true, clientVisible: true, presentationVisible: true, private: false, internal: false, archived: false }, ...current.data.projectPhotos] } });
    onGuideAction?.('photo-added');
  };
  const recordActivity = activity => setPayload(current => {
    const next = { ...current.progress };
    if (activity.type === 'undo') next.undo = true;
    if (activity.type === 'saved') next.saved = true;
    if (activity.reason === 'Object moved' && activity.draft?.objects?.some(item => item.objectType === 'plant' && !item.archived)) next.moved = true;
    return JSON.stringify(next) === JSON.stringify(current.progress) ? current : { ...current, progress: next };
  });
  const reset = () => {
    if (confirmAction !== 'reset') { setConfirmAction('reset'); return; }
    setPayload({ data: createPracticeData(), progress: blankProgress() });
    setConfirmAction('');
  };
  const remove = () => {
    if (confirmAction !== 'remove') { setConfirmAction('remove'); return; }
    localStorage.removeItem(PRACTICE_STORAGE_KEY);
    onRemoved?.();
    onBack();
  };

  return <div className="page design-district-page practice-design-page">
    <header className="practice-header glass"><button type="button" onClick={onBack}>← Design District</button><div><span>Safe learning space</span><h2>Practice Design</h2><p>Separate from every real client and project. Works offline with a neutral practice yard.</p></div><div>{!payload.data.projectPhotos.some(item => item.photoId === 'practice-yard-photo') && <button type="button" data-guide-target="property-photo" onClick={addPracticePhoto}>Add sample practice photo</button>}<button type="button" data-guide-target="design-canvas" onClick={() => { onGuideAction?.('canvas-opened'); document.querySelector('.interactive-design-studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>Show Design Canvas</button><button type="button" onClick={onOpenGuide}>Design District Guide</button><button type="button" onClick={reset}>{confirmAction === 'reset' ? 'Confirm reset practice only' : 'Reset Practice Design'}</button><button type="button" className="danger" onClick={remove}>{confirmAction === 'remove' ? 'Confirm remove practice only' : 'Remove Practice Design'}</button></div></header>
    <section className="practice-task-card glass" aria-labelledby="practice-tasks"><div><span>Guided tasks</span><h3 id="practice-tasks">Try the essential tools</h3><p>Checks appear only after the matching canvas action is completed.</p></div><ul>{tasks.map(([label, done]) => <li key={label} className={done ? 'done' : ''}><span aria-hidden="true">{done ? '✓' : '○'}</span>{label}</li>)}</ul></section>
    <InteractiveDesignStudio data={payload.data} setData={updateData} project={project} concept={concept} independent storageStatus={practiceStorage} onOpenGuide={onOpenGuide} onGuideAction={onGuideAction} onActivity={recordActivity} />
  </div>;
}
