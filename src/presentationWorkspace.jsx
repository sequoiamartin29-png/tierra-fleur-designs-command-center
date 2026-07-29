import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addTimelineEvent } from './projectEngine.js';
import {
  PRESENTATION_THEMES,
  addPresentationSession,
  buildPresentationViewModel,
  createPhase5Id,
  getProjectPresentation,
  presentationReadiness,
} from './presentationEngine.js';
import { DesignScene } from './designStudioWorkspace.jsx';
import './presentationWorkspace.css';

const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
const dateLabel = value => value
  ? new Date(String(value).length === 10 ? `${value}T12:00:00` : value).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  : 'To be scheduled';
const textList = value => String(value || '').split('\n').map(item => item.trim()).filter(Boolean);

function Toggle({ label, checked, onChange, detail = '' }) {
  return <label className="proposal-toggle">
    <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
    <span><strong>{label}</strong>{detail && <small>{detail}</small>}</span>
  </label>;
}

function EmptyProposal({ title, text }) {
  return <div className="proposal-empty"><span aria-hidden="true">❦</span><strong>{title}</strong><p>{text}</p></div>;
}

function BuilderHeading({ eyebrow, title, text }) {
  return <header className="builder-panel-heading"><span>{eyebrow}</span><h3>{title}</h3><p>{text}</p></header>;
}

export function Phase5DashboardCards({ data, openProject }) {
  const projects = (data.projects || []).filter(item => !item.archived);
  const readiness = projects.map(project => ({ project, readiness: presentationReadiness(data, project.projectId) }));
  const sessions = (data.presentationSessions || []).filter(item => !item.archived);
  const approvals = (data.approvalRecords || []).filter(item => !item.archived);
  const awaiting = approvals.filter(item => ['Not Presented', 'Presented', 'Needs Revision', 'On Hold'].includes(item.status));
  const followUps = sessions.filter(item => item.followUpDate && item.followUpDate >= today() && !item.completedAt);
  const cards = [
    ['Presentations ready', readiness.filter(item => item.readiness.ready).length, readiness.find(item => item.readiness.ready)?.project.projectId, 'Complete and marked ready'],
    ['Needing content', readiness.filter(item => !item.readiness.ready).length, readiness.find(item => !item.readiness.ready)?.project.projectId, 'Finish the client story'],
    ['Proposals presented', new Set(sessions.map(item => item.projectId)).size, sessions[0]?.projectId, `${sessions.length} session${sessions.length === 1 ? '' : 's'}`],
    ['Awaiting decision', awaiting.length, awaiting[0]?.projectId, 'Client approval records'],
    ['Approved concepts', (data.designConcepts || []).filter(item => !item.archived && (item.clientSelected || item.status === 'Approved')).length, (data.designConcepts || []).find(item => !item.archived && (item.clientSelected || item.status === 'Approved'))?.projectId, 'Selected design direction'],
    ['Follow-ups needed', followUps.length, followUps[0]?.projectId, followUps[0]?.followUpDate ? dateLabel(followUps[0].followUpDate) : 'Nothing scheduled'],
  ];
  return <section className="proposal-dashboard">
    <div className="proposal-dashboard-heading"><div><span>Client Experience</span><h3>Proposal presentations</h3></div><small>Private, local, and project-connected</small></div>
    <div>{cards.map(([label, value, projectId, note]) => <button key={label} disabled={!projectId} onClick={() => projectId && openProject(projectId)}>
      <span>{label}</span><strong>{value}</strong><small>{note}</small>
    </button>)}</div>
  </section>;
}

function SectionOrganizer({ sections, patchSection, moveSection }) {
  const [draggedId, setDraggedId] = useState('');
  return <section className="builder-section-list" aria-label="Presentation sections">
    {sections.map((section, index) => <article
      key={section.sectionId}
      draggable
      onDragStart={() => setDraggedId(section.sectionId)}
      onDragOver={event => event.preventDefault()}
      onDrop={() => {
        const from = sections.findIndex(item => item.sectionId === draggedId);
        if (from >= 0 && from !== index) moveSection(from, index);
        setDraggedId('');
      }}
      className={`${section.included ? '' : 'is-hidden'} ${draggedId === section.sectionId ? 'is-dragging' : ''}`}
    >
      <div className="builder-section-order" aria-hidden="true">{String(index + 1).padStart(2, '0')}</div>
      <div className="builder-section-fields">
        <label>Presentation title<input value={section.presentationTitle} onChange={event => patchSection(section.sectionId, { presentationTitle: event.target.value })} /></label>
        <label>Short introduction<textarea value={section.introduction} onChange={event => patchSection(section.sectionId, { introduction: event.target.value })} placeholder="Optional client-facing introduction" /></label>
      </div>
      <div className="builder-section-controls">
        <Toggle label="Included" checked={section.included} onChange={value => patchSection(section.sectionId, { included: value })} />
        <Toggle label="Complete" checked={section.complete} onChange={value => patchSection(section.sectionId, { complete: value })} />
        <div><button type="button" disabled={index === 0} onClick={() => moveSection(index, index - 1)} aria-label={`Move ${section.presentationTitle} up`}>↑</button><button type="button" disabled={index === sections.length - 1} onClick={() => moveSection(index, index + 1)} aria-label={`Move ${section.presentationTitle} down`}>↓</button></div>
      </div>
    </article>)}
  </section>;
}

function PresentationOverview({ context, patchSettings, patchTheme }) {
  const { settings, theme } = context;
  return <div className="builder-content-stack">
    <section className="panel glass builder-form-card">
      <BuilderHeading eyebrow="Proposal identity" title="Cover and presentation settings" text="These words are presentation-specific and never overwrite the project’s internal record." />
      <div className="builder-form-grid">
        <label>Presentation title<input value={settings.title} onChange={event => patchSettings({ title: event.target.value })} /></label>
        <label>Subtitle<input value={settings.subtitle} onChange={event => patchSettings({ subtitle: event.target.value })} /></label>
        <label>Prepared by<input value={settings.preparedBy} onChange={event => patchSettings({ preparedBy: event.target.value })} /></label>
        <label>Presentation date<input type="date" value={settings.presentationDate} onChange={event => patchSettings({ presentationDate: event.target.value })} /></label>
        <label className="wide">Welcome message<textarea value={settings.welcomeMessage} onChange={event => patchSettings({ welcomeMessage: event.target.value })} placeholder="A short, gracious opening for the client" /></label>
      </div>
    </section>
    <section className="panel glass builder-form-card">
      <BuilderHeading eyebrow="Tierra Fleur themes" title="Presentation atmosphere" text="Five restrained variations preserve the estate-garden identity." />
      <div className="theme-selector">{PRESENTATION_THEMES.map(item => <button key={item} className={theme === item ? 'active' : ''} onClick={() => patchTheme(item)} aria-pressed={theme === item}><span className={`theme-swatch theme-${item.toLowerCase().replaceAll(' ', '-')}`} /><strong>{item}</strong></button>)}</div>
    </section>
    <section className="panel glass builder-form-card">
      <BuilderHeading eyebrow="Privacy boundary" title="Client-visible fields" text="Sensitive fields start hidden. Record-level visibility is configured in the related builder panels." />
      <div className="privacy-toggle-grid">
        <Toggle label="Show property address" checked={settings.showAddress} onChange={value => patchSettings({ showAddress: value })} />
        <Toggle label="Show client prices" checked={settings.showPrices} onChange={value => patchSettings({ showPrices: value })} />
        <Toggle label="Show warranty" checked={settings.showWarranty} onChange={value => patchSettings({ showWarranty: value })} />
        <Toggle label="Show care information" checked={settings.showCare} onChange={value => patchSettings({ showCare: value })} />
        <Toggle label="Show client timeline" checked={settings.showTimeline} onChange={value => patchSettings({ showTimeline: value })} />
        <Toggle label="Show plant details" checked={settings.showPlantDetails} onChange={value => patchSettings({ showPlantDetails: value })} />
        <Toggle label="Presentation is ready" checked={settings.ready} onChange={value => patchSettings({ ready: value })} detail="Dashboard readiness also requires every included section to be complete." />
      </div>
    </section>
  </div>;
}

const VISION_FIELDS = [
  ['goals', 'Client goals'],
  ['preferredStyle', 'Preferred style'],
  ['desiredColors', 'Desired colors'],
  ['desiredPlants', 'Desired plants'],
  ['edibleGardenGoals', 'Edible garden goals'],
  ['pollinatorGoals', 'Pollinator goals'],
  ['privacyGoals', 'Privacy goals'],
  ['accessibilityNeeds', 'Accessibility needs'],
  ['maintenancePreference', 'Maintenance preference'],
  ['budgetRange', 'Budget range'],
  ['householdNeeds', 'Household needs'],
  ['petChildConsiderations', 'Pets or child considerations'],
  ['sentimentalPlants', 'Sentimental plants or memories'],
  ['additionalRequests', 'Additional client requests'],
];

function ClientStoryEditor({ settings, patchSettings }) {
  const patchVision = (key, value) => patchSettings({ clientVision: { ...settings.clientVision, [key]: value } });
  return <div className="builder-content-stack">
    <section className="panel glass builder-form-card">
      <BuilderHeading eyebrow="Client story" title="Vision and priorities" text="Use polished client-facing wording while the original client and project notes remain untouched." />
      <div className="builder-form-grid">{VISION_FIELDS.map(([key, label]) => <label key={key}>{label}<textarea value={settings.clientVision?.[key] || ''} onChange={event => patchVision(key, event.target.value)} /></label>)}</div>
    </section>
    <section className="panel glass builder-form-card">
      <BuilderHeading eyebrow="Property narrative" title="Overview and existing conditions" text="Capture only the details that belong in the proposal." />
      <div className="builder-form-grid">
        <label>Property name<input value={settings.propertyName} onChange={event => patchSettings({ propertyName: event.target.value })} /></label>
        <label>General location<input value={settings.generalLocation} onChange={event => patchSettings({ generalLocation: event.target.value })} /></label>
        <label>Project type<input value={settings.projectType || ''} onChange={event => patchSettings({ projectType: event.target.value })} /></label>
        <label>Approximate project size<input value={settings.approximateProjectSize || ''} onChange={event => patchSettings({ approximateProjectSize: event.target.value })} /></label>
        <label>Property type<input value={settings.propertyType} onChange={event => patchSettings({ propertyType: event.target.value })} /></label>
        <label>Style / architecture<input value={settings.styleArchitecture} onChange={event => patchSettings({ styleArchitecture: event.target.value })} /></label>
        <label>Sun exposure<input value={settings.sunExposure} onChange={event => patchSettings({ sunExposure: event.target.value })} /></label>
        <label>Soil conditions<input value={settings.soilConditions} onChange={event => patchSettings({ soilConditions: event.target.value })} /></label>
        <label>Drainage<input value={settings.drainage || ''} onChange={event => patchSettings({ drainage: event.target.value })} /></label>
        <label>Existing features<textarea value={settings.existingFeatures || ''} onChange={event => patchSettings({ existingFeatures: event.target.value })} /></label>
        <label>Areas of concern<textarea value={settings.areasOfConcern || ''} onChange={event => patchSettings({ areasOfConcern: event.target.value })} /></label>
        <label>Client priorities<textarea value={settings.clientPriorities || ''} onChange={event => patchSettings({ clientPriorities: event.target.value })} /></label>
        <label>Access notes<textarea value={settings.accessNotes} onChange={event => patchSettings({ accessNotes: event.target.value })} /></label>
        <label>Key challenges<textarea value={settings.keyChallenges} onChange={event => patchSettings({ keyChallenges: event.target.value })} /></label>
        <label>Opportunities<textarea value={settings.opportunities} onChange={event => patchSettings({ opportunities: event.target.value })} /></label>
        <label>Existing conditions<textarea value={settings.existingConditions} onChange={event => patchSettings({ existingConditions: event.target.value })} /></label>
        <label className="wide">Project scope<textarea value={settings.projectScope} onChange={event => patchSettings({ projectScope: event.target.value })} placeholder="One item per line creates an elegant scope list." /></label>
      </div>
    </section>
  </div>;
}

function GalleryConceptEditor({ data, setData, project, settings, patchSettings }) {
  const photos = data.projectPhotos.filter(item => item.projectId === project.projectId && !item.archived);
  const concepts = data.designConcepts.filter(item => item.projectId === project.projectId && !item.archived);
  const comparisons = data.photoComparisons.filter(item => item.projectId === project.projectId && !item.archived);
  const [comparison, setComparison] = useState({ title: 'Before & After', beforePhotoId: '', afterPhotoId: '', caption: '' });
  const patchRecord = (key, idName, id, changes) => setData(current => ({ ...current, [key]: current[key].map(item => (item[idName] || item.id) === id ? { ...item, ...changes } : item) }));
  const addComparison = event => {
    event.preventDefault();
    if (!comparison.beforePhotoId || !comparison.afterPhotoId) return;
    const comparisonId = createPhase5Id('comparison');
    setData(current => ({ ...current, photoComparisons: [{
      ...comparison,
      id: comparisonId,
      comparisonId,
      projectId: project.projectId,
      clientId: project.clientId,
      clientVisible: true,
      presentationVisible: true,
      archived: false,
    }, ...current.photoComparisons] }));
    setComparison({ title: 'Before & After', beforePhotoId: '', afterPhotoId: '', caption: '' });
  };
  return <div className="builder-content-stack">
    <section className="panel glass builder-form-card">
      <BuilderHeading eyebrow="Property gallery" title="Photos selected for the client" text="A photo must pass both visibility checks before it can enter Presentation Mode." />
      <label>Featured cover photo<select value={settings.featuredPhotoId} onChange={event => patchSettings({ featuredPhotoId: event.target.value })}><option value="">Use first visible photo</option>{photos.map(photo => <option key={photo.photoId || photo.id} value={photo.photoId || photo.id}>{photo.caption || photo.fileName}</option>)}</select></label>
      <div className="builder-record-grid">{photos.map(photo => <article className="builder-photo-record" key={photo.photoId || photo.id}>
        <img src={photo.image} alt={photo.caption || photo.fileName || 'Project photo'} />
        <div><span>{photo.stage}</span><strong>{photo.caption || photo.fileName}</strong>
          <label>Caption<input value={photo.caption || ''} onChange={event => patchRecord('projectPhotos', 'photoId', photo.photoId || photo.id, { caption: event.target.value })} /></label>
          <label>Category<select value={photo.stage || 'Before'} onChange={event => patchRecord('projectPhotos', 'photoId', photo.photoId || photo.id, { stage: event.target.value })}>{['Before','Existing Condition','Detail','Inspiration','Progress','Finished'].map(item => <option key={item}>{item}</option>)}</select></label>
          <label>Display order<input type="number" min="0" value={photo.displayOrder || 0} onChange={event => patchRecord('projectPhotos', 'photoId', photo.photoId || photo.id, { displayOrder: Number(event.target.value) })} /></label>
          <label>Location label<input value={photo.locationLabel || ''} onChange={event => patchRecord('projectPhotos', 'photoId', photo.photoId || photo.id, { locationLabel: event.target.value })} /></label>
          <label>Comparison group<input value={photo.comparisonGroup || ''} onChange={event => patchRecord('projectPhotos', 'photoId', photo.photoId || photo.id, { comparisonGroup: event.target.value })} /></label>
          <Toggle label="Featured" checked={photo.featured} onChange={value => patchRecord('projectPhotos', 'photoId', photo.photoId || photo.id, { featured: value })} />
          <Toggle label="Client visible" checked={photo.clientVisible} onChange={value => patchRecord('projectPhotos', 'photoId', photo.photoId || photo.id, { clientVisible: value, private: !value, internal: !value })} />
          <Toggle label="In presentation" checked={photo.presentationVisible} onChange={value => patchRecord('projectPhotos', 'photoId', photo.photoId || photo.id, { presentationVisible: value })} />
        </div>
      </article>)}{!photos.length && <EmptyProposal title="No property photos yet" text="Add photos in the Design District, then return here to approve them for presentation." />}</div>
    </section>
    <section className="panel glass builder-form-card">
      <BuilderHeading eyebrow="Visual comparison" title="Before-and-after stories" text="Comparisons reference the original photo IDs and never copy image data." />
      <form className="comparison-form" onSubmit={addComparison}>
        <input required value={comparison.title} onChange={event => setComparison({ ...comparison, title: event.target.value })} placeholder="Comparison title" />
        <select required value={comparison.beforePhotoId} onChange={event => setComparison({ ...comparison, beforePhotoId: event.target.value })}><option value="">Before photo</option>{photos.filter(item => item.stage === 'Before').map(photo => <option key={photo.photoId || photo.id} value={photo.photoId || photo.id}>{photo.caption || photo.fileName}</option>)}</select>
        <select required value={comparison.afterPhotoId} onChange={event => setComparison({ ...comparison, afterPhotoId: event.target.value })}><option value="">Finished photo</option>{photos.filter(item => item.stage === 'Finished').map(photo => <option key={photo.photoId || photo.id} value={photo.photoId || photo.id}>{photo.caption || photo.fileName}</option>)}</select>
        <input value={comparison.caption} onChange={event => setComparison({ ...comparison, caption: event.target.value })} placeholder="Client-facing caption" />
        <button className="primary">Create comparison</button>
      </form>
      <div className="builder-record-list">{comparisons.map(item => <article key={item.comparisonId}><div><strong>{item.title}</strong><span>{item.caption || 'No caption'}</span></div><Toggle label="Client visible" checked={item.clientVisible && item.presentationVisible} onChange={value => patchRecord('photoComparisons', 'comparisonId', item.comparisonId, { clientVisible: value, presentationVisible: value })} /></article>)}</div>
    </section>
    <section className="panel glass builder-form-card">
      <BuilderHeading eyebrow="Design direction" title="Concepts and recommendation" text="Choose client-facing alternatives and identify one recommended direction." />
      <div className="builder-record-list">{concepts.map(concept => <article key={concept.designId}>
        <div><span>{concept.status}</span><strong>{concept.name}</strong><p>{concept.description || 'No client description yet.'}</p>
          <details className="concept-presentation-fields"><summary>Client presentation details</summary>
            <label>Hero photo<select value={concept.heroPhotoId || ''} onChange={event => patchRecord('designConcepts', 'designId', concept.designId, { heroPhotoId: event.target.value })}><option value="">Use featured property photo</option>{photos.map(photo => <option key={photo.photoId || photo.id} value={photo.photoId || photo.id}>{photo.caption || photo.fileName}</option>)}</select></label>
            <label>Design goals<textarea value={concept.designGoals || ''} onChange={event => patchRecord('designConcepts', 'designId', concept.designId, { designGoals: event.target.value })} /></label>
            <label>Investment range<input value={concept.investmentRange || ''} onChange={event => patchRecord('designConcepts', 'designId', concept.designId, { investmentRange: event.target.value })} /></label>
            <label>Maintenance level<input value={concept.maintenanceLevel || ''} onChange={event => patchRecord('designConcepts', 'designId', concept.designId, { maintenanceLevel: event.target.value })} /></label>
            <label>Seasonal highlights<textarea value={concept.seasonalHighlights || ''} onChange={event => patchRecord('designConcepts', 'designId', concept.designId, { seasonalHighlights: event.target.value })} /></label>
            <label>Benefits<textarea value={concept.benefits || ''} onChange={event => patchRecord('designConcepts', 'designId', concept.designId, { benefits: event.target.value })} /></label>
            <label>Considerations<textarea value={concept.considerations || ''} onChange={event => patchRecord('designConcepts', 'designId', concept.designId, { considerations: event.target.value })} /></label>
            <Toggle label="Show canvas legend" checked={concept.showLegend} onChange={value => patchRecord('designConcepts', 'designId', concept.designId, { showLegend: value })} />
          </details>
        </div>
        <div>
          <Toggle label="Client visible" checked={concept.clientVisible} onChange={value => patchRecord('designConcepts', 'designId', concept.designId, { clientVisible: value })} />
          <Toggle label="In presentation" checked={concept.presentationVisible} onChange={value => patchRecord('designConcepts', 'designId', concept.designId, { presentationVisible: value })} />
          <Toggle label="Recommended" checked={concept.recommended} onChange={value => setData(current => ({ ...current, designConcepts: current.designConcepts.map(item => item.projectId === project.projectId ? { ...item, recommended: value ? item.designId === concept.designId : item.designId === concept.designId ? false : item.recommended } : item) }))} />
          <Toggle label="Client selected" checked={concept.clientSelected} onChange={value => patchRecord('designConcepts', 'designId', concept.designId, { clientSelected: value })} />
        </div>
      </article>)}{!concepts.length && <EmptyProposal title="No concepts yet" text="Create two or more concepts in the Design District, then select what the client may see." />}</div>
    </section>
  </div>;
}

const PLANT_DETAIL_FIELDS = [
  ['reasonSelected', 'Why it was selected'],
  ['cultivar', 'Cultivar'],
  ['sunRequirement', 'Sun requirement'],
  ['waterRequirement', 'Water requirement'],
  ['matureSize', 'Mature size'],
  ['bloomSeason', 'Bloom season'],
  ['harvestSeason', 'Harvest season'],
  ['flowerColor', 'Flower / foliage color'],
  ['wildlifeBenefit', 'Wildlife benefit'],
  ['edibleBenefit', 'Edible benefit'],
  ['fragrance', 'Fragrance'],
  ['maintenanceLevel', 'Maintenance level'],
  ['careInstructions', 'Care instructions'],
];

function PlantsSeasonEditor({ data, setData, project, settings, patchSettings }) {
  const plants = data.projectPlants.filter(item => item.projectId === project.projectId && !item.archived);
  const entries = data.seasonalInterestEntries.filter(item => item.projectId === project.projectId && !item.archived);
  const [seasonal, setSeasonal] = useState({ projectPlantId: '', season: 'Spring', month: 'April', interestType: 'Bloom', title: '', details: '', firstHarvestYear: '', uncertain: false });
  const patchPlant = (id, changes) => setData(current => ({ ...current, projectPlants: current.projectPlants.map(item => item.projectPlantId === id ? { ...item, ...changes } : item) }));
  const patchEntry = (id, changes) => setData(current => ({ ...current, seasonalInterestEntries: current.seasonalInterestEntries.map(item => item.seasonalInterestId === id ? { ...item, ...changes } : item) }));
  const addSeasonal = event => {
    event.preventDefault();
    if (!seasonal.title.trim()) return;
    const seasonalInterestId = createPhase5Id('seasonal-interest');
    setData(current => ({ ...current, seasonalInterestEntries: [{
      ...seasonal,
      title: seasonal.title.trim(),
      id: seasonalInterestId,
      seasonalInterestId,
      projectId: project.projectId,
      clientId: project.clientId,
      manual: true,
      clientVisible: true,
      presentationVisible: true,
      archived: false,
    }, ...current.seasonalInterestEntries] }));
    setSeasonal({ projectPlantId: '', season: 'Spring', month: 'April', interestType: 'Bloom', title: '', details: '', firstHarvestYear: '', uncertain: false });
  };
  return <div className="builder-content-stack">
    <section className="panel glass builder-form-card">
      <BuilderHeading eyebrow="Living palette" title="Client-facing Plant Plan" text="Internal cost, nursery, sourcing, receipt, and margin fields are never selected for Presentation Mode." />
      <label>Group plant cards by<select value={settings.plantGroupBy || 'Installation area'} onChange={event => patchSettings({ plantGroupBy: event.target.value })}>{['Installation area','Category','Season','Design concept','Edible versus ornamental','Pollinator value'].map(item => <option key={item}>{item}</option>)}</select></label>
      <div className="plant-editor-list">{plants.map(plant => <details key={plant.projectPlantId}>
        <summary><span>{plant.status}</span><strong>{plant.plantName}</strong><small>{plant.scientificName || 'Scientific name open'} · × {plant.quantity}</small></summary>
        <div className="plant-editor-privacy">
          <Toggle label="Client visible" checked={plant.clientVisible} onChange={value => patchPlant(plant.projectPlantId, { clientVisible: value })} />
          <Toggle label="In presentation" checked={plant.presentationVisible} onChange={value => patchPlant(plant.projectPlantId, { presentationVisible: value })} />
          <Toggle label="Show client price" checked={plant.showPrice} onChange={value => patchPlant(plant.projectPlantId, { showPrice: value })} />
        </div>
        <div className="builder-form-grid">{PLANT_DETAIL_FIELDS.map(([key, label]) => <label key={key}>{label}<input value={plant[key] || ''} onChange={event => patchPlant(plant.projectPlantId, { [key]: event.target.value })} /></label>)}</div>
      </details>)}{!plants.length && <EmptyProposal title="The Plant Plan is empty" text="Add project plants first, then return here to prepare their client-facing story." />}</div>
    </section>
    <section className="panel glass builder-form-card">
      <BuilderHeading eyebrow="Four-season story" title="Seasonal, bloom, and harvest calendar" text="Link entries to plants when useful, or create a broader garden moment." />
      <form className="seasonal-form" onSubmit={addSeasonal}>
        <select value={seasonal.projectPlantId} onChange={event => setSeasonal({ ...seasonal, projectPlantId: event.target.value })}><option value="">Whole garden</option>{plants.map(plant => <option key={plant.projectPlantId} value={plant.projectPlantId}>{plant.plantName}</option>)}</select>
        <select value={seasonal.season} onChange={event => setSeasonal({ ...seasonal, season: event.target.value })}>{['Spring', 'Summer', 'Autumn', 'Winter'].map(item => <option key={item}>{item}</option>)}</select>
        <select value={seasonal.month} onChange={event => setSeasonal({ ...seasonal, month: event.target.value })}>{['January','February','March','April','May','June','July','August','September','October','November','December'].map(item => <option key={item}>{item}</option>)}</select>
        <select value={seasonal.interestType} onChange={event => setSeasonal({ ...seasonal, interestType: event.target.value })}>{['Bloom', 'Fruit', 'Harvest', 'Fall Color', 'Evergreen', 'Fragrance', 'Pollinator', 'Winter Structure'].map(item => <option key={item}>{item}</option>)}</select>
        <input required placeholder="Seasonal moment *" value={seasonal.title} onChange={event => setSeasonal({ ...seasonal, title: event.target.value })} />
        <input placeholder="Client-facing detail" value={seasonal.details} onChange={event => setSeasonal({ ...seasonal, details: event.target.value })} />
        <input placeholder="First expected harvest year" value={seasonal.firstHarvestYear} onChange={event => setSeasonal({ ...seasonal, firstHarvestYear: event.target.value })} />
        <Toggle label="Timing is uncertain" checked={seasonal.uncertain} onChange={value => setSeasonal({ ...seasonal, uncertain: value })} />
        <button className="primary">Add calendar entry</button>
      </form>
      <div className="builder-record-list">{entries.map(item => <article key={item.seasonalInterestId}><div><span>{item.month} · {item.interestType} · {item.manual !== false ? 'Manual' : 'Plant data'}</span><strong>{item.title}</strong><p>{item.details}{item.firstHarvestYear ? ` · First expected harvest ${item.firstHarvestYear}` : ''}{item.uncertain ? ' · Timing uncertain' : ''}</p></div><Toggle label="Visible" checked={item.clientVisible && item.presentationVisible} onChange={value => patchEntry(item.seasonalInterestId, { clientVisible: value, presentationVisible: value })} /></article>)}</div>
    </section>
  </div>;
}

function InvestmentCareEditor({ data, setData, project, settings, patchSettings }) {
  const documents = data.estimates.filter(item => item.projectId === project.projectId && !item.archived);
  const materials = data.designMaterials.filter(item => !item.archived && (!item.projectId || item.projectId === project.projectId));
  const passports = data.plantPassports.filter(item => item.projectId === project.projectId && !item.archived);
  const addOns = data.addOnInterestRecords.filter(item => item.projectId === project.projectId && !item.archived);
  const [addOn, setAddOn] = useState({ title: '', description: '', price: '', status: 'Not Reviewed', followUpDate: '' });
  const [transferNotice, setTransferNotice] = useState('');
  const patch = (key, idName, id, changes) => setData(current => ({ ...current, [key]: current[key].map(item => (item[idName] || item.id) === id ? { ...item, ...changes } : item) }));
  const toggleMaterial = (material, value) => setData(current => ({
    ...current,
    designMaterials: current.designMaterials.map(item => (item.materialId || item.id) === (material.materialId || material.id) ? (() => {
      const selected = new Set(item.presentationProjectIds || []);
      if (value) selected.add(project.projectId);
      else selected.delete(project.projectId);
      return { ...item, presentationProjectIds: [...selected], clientVisible: selected.size > 0, presentationVisible: selected.size > 0 };
    })() : item),
  }));
  const addOptional = event => {
    event.preventDefault();
    if (!addOn.title.trim()) return;
    const addOnInterestId = createPhase5Id('add-on-interest');
    setData(current => ({ ...current, addOnInterestRecords: [{
      ...addOn,
      title: addOn.title.trim(),
      id: addOnInterestId,
      addOnInterestId,
      projectId: project.projectId,
      clientId: project.clientId,
      clientVisible: true,
      showPrice: false,
      archived: false,
    }, ...current.addOnInterestRecords] }));
    setAddOn({ title: '', description: '', price: '', status: 'Not Reviewed', followUpDate: '' });
  };
  const transferAddOn = item => {
    const estimate = data.estimates.find(document => document.projectId === project.projectId && !document.archived && document.documentType !== 'Invoice' && document.status === 'Draft');
    if (!estimate) {
      setTransferNotice('Create or reopen a Draft estimate before transferring this add-on.');
      return;
    }
    if ((estimate.lines || []).some(line => line.sourceAddOnInterestId === item.addOnInterestId)) {
      setTransferNotice(`${item.title} is already connected to the draft estimate.`);
      return;
    }
    setData(current => {
      const currentEstimate = current.estimates.find(document => document.id === estimate.id);
      const lines = [...(currentEstimate?.lines || []), { id: createPhase5Id('estimate-line'), description: item.title, qty: 1, price: Number(item.price || 0), sourceAddOnInterestId: item.addOnInterestId }];
      const subtotal = lines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.price || 0), 0);
      const tax = subtotal * Number(current.business?.defaultTax || 0) / 100;
      return {
        ...current,
        estimates: current.estimates.map(document => document.id === estimate.id ? { ...document, lines, subtotal, tax, total: subtotal + tax } : document),
        addOnInterestRecords: current.addOnInterestRecords.map(record => record.addOnInterestId === item.addOnInterestId ? { ...record, status: 'Added to Project', relatedRecordId: estimate.estimateId || estimate.id } : record),
      };
    });
    setTransferNotice(`${item.title} was added to ${estimate.title}.`);
  };
  return <div className="builder-content-stack">
    <section className="panel glass builder-form-card">
      <BuilderHeading eyebrow="Client investment" title="Approved estimates and client prices" text="Only documents explicitly approved below can enter the filtered presentation." />
      <label>Investment heading<input value={settings.investmentHeadline} onChange={event => patchSettings({ investmentHeadline: event.target.value })} /></label>
      <div className="builder-record-list">{documents.map(item => <article key={item.id}><div><span>{item.documentType} · {item.status}</span><strong>{item.title}</strong><p>{money(item.total)}</p></div><div><Toggle label="Client visible" checked={item.clientVisible && item.presentationVisible} onChange={value => patch('estimates', 'id', item.id, { clientVisible: value, presentationVisible: value })} /><Toggle label="Show price" checked={item.showPrice} onChange={value => patch('estimates', 'id', item.id, { showPrice: value })} /></div></article>)}{!documents.length && <EmptyProposal title="No project estimate yet" text="Create and connect an estimate or invoice, then approve its presentation visibility here." />}</div>
    </section>
    <section className="panel glass builder-form-card">
      <BuilderHeading eyebrow="Optional opportunities" title="Add-ons and client interest" text="Record interest locally for follow-up without adding payment processing." />
      <form className="add-on-form" onSubmit={addOptional}>
        <input required placeholder="Add-on title *" value={addOn.title} onChange={event => setAddOn({ ...addOn, title: event.target.value })} />
        <input placeholder="Description" value={addOn.description} onChange={event => setAddOn({ ...addOn, description: event.target.value })} />
        <input type="number" min="0" step="0.01" placeholder="Optional client price" value={addOn.price} onChange={event => setAddOn({ ...addOn, price: event.target.value })} />
        <button className="primary">Add optional service</button>
      </form>
      {transferNotice && <p className="proposal-transfer-notice" role="status">{transferNotice}</p>}
      <div className="builder-record-list">{addOns.map(item => <article key={item.addOnInterestId}><div><span>{item.status}</span><strong>{item.title}</strong><p>{item.description}</p></div><div><label>Interest status<select value={item.status} onChange={event => patch('addOnInterestRecords', 'addOnInterestId', item.addOnInterestId, { status: event.target.value })}>{['Not Reviewed','Interested','Maybe Later','Declined','Added to Project'].map(status => <option key={status}>{status}</option>)}</select></label><Toggle label="Client visible" checked={item.clientVisible} onChange={value => patch('addOnInterestRecords', 'addOnInterestId', item.addOnInterestId, { clientVisible: value })} /><Toggle label="Show price" checked={item.showPrice} onChange={value => patch('addOnInterestRecords', 'addOnInterestId', item.addOnInterestId, { showPrice: value })} /><button type="button" onClick={() => transferAddOn(item)}>Transfer to Draft estimate</button></div></article>)}</div>
    </section>
    <section className="panel glass builder-form-card">
      <BuilderHeading eyebrow="Finishing details" title="Materials, maintenance, care, and warranty" text="The global privacy controls still govern whether care and warranty content appears." />
      <div className="builder-form-grid">
        <label className="wide">Maintenance plan<textarea value={settings.maintenancePlan} onChange={event => patchSettings({ maintenancePlan: event.target.value })} /></label>
        <label className="wide">Warranty information<textarea value={settings.warrantyInformation} onChange={event => patchSettings({ warrantyInformation: event.target.value })} /></label>
        <label className="wide">Next steps<textarea value={settings.nextSteps} onChange={event => patchSettings({ nextSteps: event.target.value })} placeholder="One step per line" /></label>
        <label className="wide">Thank-you message<textarea value={settings.thankYouMessage} onChange={event => patchSettings({ thankYouMessage: event.target.value })} /></label>
      </div>
      <h4>Materials</h4><div className="builder-record-list compact">{materials.map(item => <article key={item.materialId || item.id}><div><strong>{item.name}</strong><span>{item.finish}</span>
        <details className="material-presentation-fields"><summary>Presentation details</summary>
          <label>Description<textarea value={item.clientDescription || ''} onChange={event => patch('designMaterials', 'materialId', item.materialId || item.id, { clientDescription: event.target.value })} /></label>
          <label>Quantity<input value={item.quantity || ''} onChange={event => patch('designMaterials', 'materialId', item.materialId || item.id, { quantity: event.target.value })} /></label>
          <label>Selected color<input value={item.selectedColor || ''} onChange={event => patch('designMaterials', 'materialId', item.materialId || item.id, { selectedColor: event.target.value })} /></label>
          <label>Installation purpose<input value={item.installationPurpose || ''} onChange={event => patch('designMaterials', 'materialId', item.materialId || item.id, { installationPurpose: event.target.value })} /></label>
          <Toggle label="Optional upgrade" checked={item.upgrade} onChange={value => patch('designMaterials', 'materialId', item.materialId || item.id, { upgrade: value })} />
          <Toggle label="Show client price" checked={item.showPrice} onChange={value => patch('designMaterials', 'materialId', item.materialId || item.id, { showPrice: value })} />
        </details>
      </div><Toggle label="Client visible" checked={(item.presentationProjectIds || []).includes(project.projectId)} onChange={value => toggleMaterial(item, value)} /></article>)}</div>
      <h4>Plant Passports</h4><div className="builder-record-list compact">{passports.map(item => <article key={item.passportId}><div><strong>{item.commonName}</strong><span>{item.cultivar || item.installationLocation}</span></div><div><Toggle label="Client visible" checked={item.clientVisible && item.presentationVisible} onChange={value => patch('plantPassports', 'passportId', item.passportId, { clientVisible: value, presentationVisible: value })} /><Toggle label="Show care" checked={item.showCare} onChange={value => patch('plantPassports', 'passportId', item.passportId, { showCare: value })} /><Toggle label="Show warranty" checked={item.showWarranty} onChange={value => patch('plantPassports', 'passportId', item.passportId, { showWarranty: value })} /></div></article>)}{!passports.length && <p className="proposal-inline-empty">Passports appear here after installed plants receive a Plant Passport.</p>}</div>
    </section>
  </div>;
}

function DecisionsEditor({ data, setData, project }) {
  const approvals = data.approvalRecords.filter(item => item.projectId === project.projectId && !item.archived);
  const notes = data.presentationNotes.filter(item => item.projectId === project.projectId && !item.archived);
  const sessions = data.presentationSessions.filter(item => item.projectId === project.projectId && !item.archived);
  const timeline = data.projectTimeline.filter(item => item.projectId === project.projectId && !item.archived);
  const concepts = data.designConcepts.filter(item => item.projectId === project.projectId && !item.archived);
  const [approval, setApproval] = useState({ conceptId: '', status: 'Not Presented', decisionDate: today(), decisionMaker: '', clientName: '', representative: '', comments: '', nextAction: '', typedAcknowledgement: '', clientVisible: true });
  const [note, setNote] = useState('');
  const addApproval = event => {
    event.preventDefault();
    const approvalId = createPhase5Id('approval');
    setData(current => {
      let next = { ...current, approvalRecords: [{
        ...approval,
        id: approvalId,
        approvalId,
        projectId: project.projectId,
        clientId: project.clientId,
        presentationId: `presentation-${project.projectId}`,
        archived: false,
      }, ...current.approvalRecords] };
      return addTimelineEvent(next, {
        projectId: project.projectId,
        eventType: 'presentation.approval.recorded',
        title: 'Presentation approval recorded',
        description: approval.status,
        relatedRecordId: approvalId,
        dedupeKey: `presentation.approval.recorded:${approvalId}`,
        automatic: true,
        clientVisible: false,
        presentationVisible: false,
        private: true,
      });
    });
    setApproval({ conceptId: '', status: 'Not Presented', decisionDate: today(), decisionMaker: '', clientName: '', representative: '', comments: '', nextAction: '', typedAcknowledgement: '', clientVisible: true });
  };
  const addNote = event => {
    event.preventDefault();
    if (!note.trim()) return;
    const presentationNoteId = createPhase5Id('presentation-note');
    setData(current => ({ ...current, presentationNotes: [{
      id: presentationNoteId,
      presentationNoteId,
      projectId: project.projectId,
      clientId: project.clientId,
      text: note.trim(),
      private: true,
      clientVisible: false,
      createdAt: now(),
      archived: false,
    }, ...current.presentationNotes] }));
    setNote('');
  };
  const patchTimeline = (id, changes) => setData(current => ({ ...current, projectTimeline: current.projectTimeline.map(item => (item.timelineEventId || item.eventId || item.id) === id ? { ...item, ...changes } : item) }));
  return <div className="builder-content-stack">
    <section className="panel glass builder-form-card">
      <BuilderHeading eyebrow="Client decision" title="Approval records" text="Track a concept decision, revision request, or follow-up without changing the original concept record." />
      <p className="approval-legal-note">Local approval records support business tracking only and are not automatically a legally binding digital signature. Estimates and invoices are never approved here without separate, explicit confirmation.</p>
      <form className="approval-form" onSubmit={addApproval}>
        <select value={approval.conceptId} onChange={event => setApproval({ ...approval, conceptId: event.target.value })}><option value="">Whole proposal</option>{concepts.map(item => <option key={item.designId} value={item.designId}>{item.name}</option>)}</select>
        <select value={approval.status} onChange={event => setApproval({ ...approval, status: event.target.value })}>{['Not Presented', 'Presented', 'Needs Revision', 'Approved', 'Declined', 'On Hold'].map(item => <option key={item}>{item}</option>)}</select>
        <input type="date" value={approval.decisionDate} onChange={event => setApproval({ ...approval, decisionDate: event.target.value })} />
        <input placeholder="Client name" value={approval.clientName} onChange={event => setApproval({ ...approval, clientName: event.target.value, decisionMaker: event.target.value })} />
        <input placeholder="Tierra Fleur representative" value={approval.representative} onChange={event => setApproval({ ...approval, representative: event.target.value })} />
        <input placeholder="Client-facing comments" value={approval.comments} onChange={event => setApproval({ ...approval, comments: event.target.value })} />
        <input placeholder="Next action" value={approval.nextAction} onChange={event => setApproval({ ...approval, nextAction: event.target.value })} />
        <input placeholder="Optional typed acknowledgement" value={approval.typedAcknowledgement} onChange={event => setApproval({ ...approval, typedAcknowledgement: event.target.value })} />
        <Toggle label="Visible in presentation" checked={approval.clientVisible} onChange={value => setApproval({ ...approval, clientVisible: value })} />
        <button className="primary">Record approval status</button>
      </form>
      <div className="builder-record-list">{approvals.map(item => <article key={item.approvalId}><div><span>{dateLabel(item.decisionDate)}</span><strong>{item.status}</strong><p>{item.comments || item.decisionMaker}</p></div><small>{item.clientVisible ? 'Client visible' : 'Internal only'}</small></article>)}</div>
    </section>
    <section className="panel glass builder-form-card private-note-editor">
      <BuilderHeading eyebrow="Private by design" title="Presentation notes" text="These notes are always excluded from the client view model, backup-safe, and local to this device." />
      <form onSubmit={addNote}><textarea required value={note} onChange={event => setNote(event.target.value)} placeholder="Internal observation, question, or follow-up…" /><button className="primary">Save private note</button></form>
      <div className="private-note-list">{notes.map(item => <article key={item.presentationNoteId}><time>{new Date(item.createdAt).toLocaleString()}</time><p>{item.text}</p><span>Private · never client-visible</span></article>)}</div>
    </section>
    <section className="panel glass builder-form-card">
      <BuilderHeading eyebrow="Project chronology" title="Client timeline visibility" text="Timeline entries remain private unless all three controls below are intentionally set." />
      <div className="builder-record-list compact">{timeline.map(item => {
        const id = item.timelineEventId || item.eventId || item.id;
        const visible = item.clientVisible && item.presentationVisible && item.private === false;
        return <article key={id}><div><span>{dateLabel(item.dateTime || item.date)}</span><strong>{item.title}</strong></div><Toggle label="Client timeline" checked={visible} onChange={value => patchTimeline(id, { clientVisible: value, presentationVisible: value, private: !value })} /></article>;
      })}</div>
    </section>
    <section className="panel glass builder-form-card">
      <BuilderHeading eyebrow="Presentation history" title="Sessions" text="Sessions are created only when you intentionally start one—never on refresh." />
      <div className="builder-record-list">{sessions.map(item => <article key={item.sessionId}><div><span>{dateLabel(item.dateTime)}</span><strong>{item.purpose}</strong><p>{item.attendees || 'Attendees not listed'}{item.outcome ? ` · ${item.outcome}` : ''}</p></div><small>{item.completedAt ? 'Completed' : 'Open session'}</small></article>)}{!sessions.length && <EmptyProposal title="No presentation sessions" text="Use Start Presentation in the builder header when you want a dated session record." />}</div>
    </section>
  </div>;
}

export function PresentationBuilder({ data, setData, project, onPresent }) {
  const context = getProjectPresentation(data, project.projectId);
  const [panel, setPanel] = useState('Overview');
  const [sessionOpen, setSessionOpen] = useState(false);
  const [session, setSession] = useState({ dateTime: now().slice(0, 16), attendees: '', purpose: 'Client proposal presentation', followUpDate: '', notes: '' });
  if (!context) return <EmptyProposal title="Presentation unavailable" text="The connected project record could not be found." />;
  const { settings, sections } = context;
  const readiness = presentationReadiness(data, project.projectId);
  const patchSettings = changes => setData(current => ({
    ...current,
    presentationSettings: current.presentationSettings.map(item => item.projectId === project.projectId ? { ...item, ...changes, clientId: project.clientId, updatedAt: now() } : item),
  }));
  const patchTheme = themeName => setData(current => ({
    ...current,
    presentationTheme: current.presentationTheme.map(item => item.projectId === project.projectId ? { ...item, themeName } : item),
  }));
  const patchSection = (sectionId, changes) => setData(current => ({
    ...current,
    presentationSections: current.presentationSections.map(item => item.sectionId === sectionId ? { ...item, ...changes } : item),
  }));
  const moveSection = (from, to) => {
    const ordered = [...sections];
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    const orders = new Map(ordered.map((item, index) => [item.sectionId, index]));
    setData(current => ({ ...current, presentationSections: current.presentationSections.map(item => item.projectId === project.projectId ? { ...item, order: orders.get(item.sectionId) } : item) }));
  };
  const startSession = event => {
    event.preventDefault();
    const sessionId = createPhase5Id('session');
    setData(current => {
      let next = addPresentationSession(current, { ...session, sessionId, projectId: project.projectId, clientId: project.clientId, dateTime: new Date(session.dateTime).toISOString() });
      return addTimelineEvent(next, {
        projectId: project.projectId,
        eventType: 'presentation.started',
        title: 'Client presentation started',
        description: session.purpose,
        relatedRecordId: sessionId,
        dedupeKey: `presentation.started:${sessionId}`,
        automatic: true,
        clientVisible: false,
        presentationVisible: false,
        private: true,
      });
    });
    setSessionOpen(false);
    onPresent({ projectId: project.projectId, mode: 'present', sessionId });
  };
  const panels = ['Overview', 'Sections', 'Client Story', 'Gallery & Concepts', 'Plants & Seasons', 'Investment & Care', 'Decisions'];
  return <div className="proposal-builder">
    <section className="proposal-builder-hero glass">
      <div><span>Client Proposal Builder</span><h3>{settings.title}</h3><p>{readiness.complete} of {readiness.included} included sections complete · Theme: {context.theme}</p></div>
      <div className="proposal-builder-actions">
        <button onClick={() => onPresent({ projectId: project.projectId, mode: 'preview' })}>Preview Presentation</button>
        <button onClick={() => onPresent({ projectId: project.projectId, mode: 'print', printKind: 'full' })}>Print Preview</button>
        <button onClick={() => onPresent({ projectId: project.projectId, mode: 'print', printKind: 'summary' })}>Client Summary</button>
        <button onClick={() => onPresent({ projectId: project.projectId, mode: 'print', printKind: 'care' })}>Care Guide</button>
        <button className="primary" onClick={() => setSessionOpen(true)}>Start Presentation</button>
      </div>
    </section>
    <nav className="proposal-builder-nav" aria-label="Proposal Builder sections">{panels.map(item => <button key={item} className={panel === item ? 'active' : ''} onClick={() => setPanel(item)}>{item}</button>)}</nav>
    {panel === 'Overview' && <PresentationOverview context={context} patchSettings={patchSettings} patchTheme={patchTheme} />}
    {panel === 'Sections' && <section className="panel glass builder-form-card"><BuilderHeading eyebrow="Proposal sequence" title="Sections, order, and completion" text="Drag a section or use the move buttons. Hidden sections never enter the client view." /><SectionOrganizer sections={sections} patchSection={patchSection} moveSection={moveSection} /></section>}
    {panel === 'Client Story' && <ClientStoryEditor settings={settings} patchSettings={patchSettings} />}
    {panel === 'Gallery & Concepts' && <GalleryConceptEditor data={data} setData={setData} project={project} settings={settings} patchSettings={patchSettings} />}
    {panel === 'Plants & Seasons' && <PlantsSeasonEditor data={data} setData={setData} project={project} settings={settings} patchSettings={patchSettings} />}
    {panel === 'Investment & Care' && <InvestmentCareEditor data={data} setData={setData} project={project} settings={settings} patchSettings={patchSettings} />}
    {panel === 'Decisions' && <DecisionsEditor data={data} setData={setData} project={project} />}
    {sessionOpen && <div className="proposal-dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setSessionOpen(false)}>
      <form className="proposal-dialog" role="dialog" aria-modal="true" aria-label="Start presentation session" onSubmit={startSession}>
        <span>Optional session record</span><h3>Start client presentation</h3><p>This creates one intentional, dated record. Refreshing the presentation will not create another.</p>
        <label>Date and time<input required type="datetime-local" value={session.dateTime} onChange={event => setSession({ ...session, dateTime: event.target.value })} /></label>
        <label>Attendees<input value={session.attendees} onChange={event => setSession({ ...session, attendees: event.target.value })} placeholder="Names or roles" /></label>
        <label>Purpose<input value={session.purpose} onChange={event => setSession({ ...session, purpose: event.target.value })} /></label>
        <label>Follow-up date<input type="date" value={session.followUpDate} onChange={event => setSession({ ...session, followUpDate: event.target.value })} /></label>
        <label>Private starting note<textarea value={session.notes} onChange={event => setSession({ ...session, notes: event.target.value })} /></label>
        <div><button type="button" onClick={() => setSessionOpen(false)}>Cancel</button><button className="primary">Create session and present</button></div>
      </form>
    </div>}
  </div>;
}

function PresentationEmpty({ title, text }) {
  return <div className="presentation-empty"><span aria-hidden="true">❦</span><h3>{title}</h3><p>{text}</p></div>;
}

function PhotoComparison({ comparison }) {
  const [position, setPosition] = useState(50);
  return <figure className="photo-comparison">
    <div className="photo-comparison-stage">
      <img src={comparison.after.image} alt={comparison.after.caption || 'Finished garden'} />
      <div style={{ width: `${position}%` }}><img src={comparison.before.image} alt={comparison.before.caption || 'Garden before work'} /></div>
      <span style={{ left: `${position}%` }} />
    </div>
    <input aria-label={`Compare ${comparison.title}`} type="range" min="0" max="100" value={position} onChange={event => setPosition(event.target.value)} />
    <figcaption><strong>{comparison.title}</strong><span>{comparison.caption}{comparison.before.locationLabel ? ` · ${comparison.before.locationLabel}` : ''} · {dateLabel(comparison.before.photoDate)} → {dateLabel(comparison.after.photoDate)}</span></figcaption>
  </figure>;
}

function CalendarGrid({ entries, type }) {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const types = Array.isArray(type) ? type : type ? [type] : [];
  const visible = types.length ? entries.filter(item => types.includes(item.interestType)) : entries;
  if (!visible.length) return <PresentationEmpty title={`No ${types.length ? types.join(' or ').toLowerCase() : 'seasonal'} entries selected`} text="This section is ready for future garden moments." />;
  return <div className="presentation-calendar">{months.map(month => {
    const items = visible.filter(item => item.month === month);
    return <article key={month} className={items.length ? 'has-interest' : ''}><span>{month.slice(0, 3)}</span>{items.map(item => <div key={item.seasonalInterestId}><strong>{item.title}</strong><small>{item.interestType}{item.manual ? ' · Manual' : ''}{item.uncertain ? ' · Timing uncertain' : ''}{item.firstHarvestYear ? ` · First ${item.firstHarvestYear}` : ''}</small></div>)}</article>;
  })}</div>;
}

function ConceptCanvasPreview({ concept, photo }) {
  if (concept.designStudio) return <div className="client-canvas-preview phase6">
    <DesignScene
      objects={concept.designStudio.objects}
      layers={concept.designStudio.layers}
      settings={concept.designStudio.settings}
      photos={photo ? [photo] : []}
      clientSafe
      compact
    />
  </div>;
  return <div className="client-canvas-preview" style={photo?.image ? { backgroundImage: `url("${photo.image}")` } : undefined}>
    {!photo?.image && <div className="canvas-wash">Concept placement preview</div>}
    {(concept.canvas?.placements || []).map(item => <span key={item.id} style={{ left: `${item.x}%`, top: `${item.y}%` }}>{item.label || 'Plant'}</span>)}
  </div>;
}

function groupPresentationPlants(vm) {
  const mode = vm.settings.plantGroupBy || 'Installation area';
  const label = plant => {
    if (mode === 'Category') return plant.category || 'Other plants';
    if (mode === 'Season') return plant.bloomSeason || plant.harvestSeason || 'Multi-season';
    if (mode === 'Design concept') return vm.concepts.find(item => item.conceptId === plant.conceptId)?.name || 'General palette';
    if (mode === 'Edible versus ornamental') return plant.edibleBenefit ? 'Edible garden' : 'Ornamental garden';
    if (mode === 'Pollinator value') return plant.wildlifeBenefit ? 'Pollinator & wildlife value' : 'Garden structure';
    return plant.installationLocation || 'Garden-wide';
  };
  return Object.entries(vm.plants.reduce((groups, plant) => {
    const key = label(plant);
    groups[key] = [...(groups[key] || []), plant];
    return groups;
  }, {}));
}

function SectionView({ section, vm, onPlant, onPhoto, onAddOnInterest, onApproval }) {
  const key = section.sectionKey;
  const intro = section.introduction && <p className="presentation-intro">{section.introduction}</p>;
  const facts = [
    ['Property', vm.settings.propertyName],
    ['Location', vm.settings.generalLocation || vm.project.propertyAddress],
    ['Project type', vm.settings.projectType],
    ['Approximate size', vm.settings.approximateProjectSize],
    ['Property type', vm.settings.propertyType],
    ['Architecture', vm.settings.styleArchitecture],
    ['Sun', vm.settings.sunExposure],
    ['Soil', vm.settings.soilConditions],
    ['Drainage', vm.settings.drainage],
    ['Existing features', vm.settings.existingFeatures],
    ['Areas of concern', vm.settings.areasOfConcern],
    ['Client priorities', vm.settings.clientPriorities],
    ['Project readiness', vm.project.healthStatus],
  ].filter(([, value]) => value);
  const vision = Object.entries(vm.settings.clientVision || {}).filter(([, value]) => value);
  const recommended = vm.concepts.find(item => item.recommended) || vm.concepts[0];
  const featured = vm.featuredPhoto;
  const plantGroups = groupPresentationPlants(vm);
  return <section className={`presentation-section section-${key}`} data-section-key={key}>
    {key !== 'welcome' && <header><span>Tierra Fleur Designs</span><h2>{section.title}</h2>{intro}</header>}
    {key === 'welcome' && <div className="presentation-cover">
      <div className="cover-copy"><img src="/assets/tierra-fleur-crest.jpeg" alt="Tierra Fleur Designs crest" /><span>Prepared especially for {vm.client.name}</span><h1>{vm.settings.title}</h1><p>{vm.settings.subtitle}</p><dl><div><dt>Presentation date</dt><dd>{dateLabel(vm.settings.presentationDate)}</dd></div><div><dt>Prepared by</dt><dd>{vm.settings.preparedBy || vm.business.name}</dd></div>{(vm.settings.propertyName || vm.project.propertyAddress) && <div><dt>Property</dt><dd>{vm.settings.propertyName}{vm.project.propertyAddress ? ` · ${vm.project.propertyAddress}` : ''}</dd></div>}</dl>{vm.settings.welcomeMessage && <blockquote>{vm.settings.welcomeMessage}</blockquote>}</div>
      <div className="cover-image">{featured ? <img src={featured.image} alt={featured.caption || 'Featured project garden'} /> : <div><span>❦</span><p>A garden proposal for {vm.project.name}</p></div>}</div>
    </div>}
    {key === 'client-vision' && <>{vision.length ? <div className="vision-grid">{vision.map(([name, value]) => <article key={name}><span>{name.replace(/([A-Z])/g, ' $1')}</span><p>{value}</p></article>)}</div> : <PresentationEmpty title="A vision ready to take shape" text="The client priorities for this project are being refined." />}</>}
    {key === 'property-overview' && <>{facts.length ? <div className="property-facts">{facts.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div> : <PresentationEmpty title={vm.project.name} text="Property details will be added as the design develops." />}</>}
    {key === 'existing-conditions' && <div className="narrative-card"><h3>What we observed</h3><p>{vm.settings.existingConditions || 'Existing conditions will be documented during the property review.'}</p><div className="narrative-columns"><div><span>Key challenges</span><p>{vm.settings.keyChallenges || 'To be confirmed'}</p></div><div><span>Opportunities</span><p>{vm.settings.opportunities || 'To be explored through design'}</p></div></div></div>}
    {key === 'property-photos' && <>{vm.photos.length ? <div className="client-photo-grid">{vm.photos.map(photo => <figure key={photo.photoId}><button onClick={() => onPhoto(photo)} aria-label={`View ${photo.caption} full screen`}><img src={photo.image} alt={photo.caption || `${photo.stage} project photo`} /></button><figcaption><span>{photo.stage} · {dateLabel(photo.photoDate)}{photo.locationLabel ? ` · ${photo.locationLabel}` : ''}</span><strong>{photo.caption}</strong></figcaption></figure>)}</div> : <PresentationEmpty title="The visual story is being gathered" text="No client-approved property photos are included yet." />}{vm.comparisons.map(item => <PhotoComparison key={item.comparisonId} comparison={item} />)}</>}
    {key === 'design-concepts' && <>{vm.concepts.length ? <div className="concept-client-grid">{vm.concepts.map(item => <article key={item.conceptId} className={item.recommended ? 'recommended' : ''}>{item.heroPhotoId && vm.photos.find(photo => photo.photoId === item.heroPhotoId) && <img src={vm.photos.find(photo => photo.photoId === item.heroPhotoId).image} alt={`${item.name} concept`} />}<span>{item.recommended ? 'Tierra Fleur recommendation' : item.alternative ? 'Alternative direction' : item.status}</span><h3>{item.name}</h3><p>{item.description || 'A considered garden direction for discussion.'}</p>{item.designGoals && <p><strong>Design goals:</strong> {item.designGoals}</p>}<dl>{[['Investment',item.investmentRange],['Maintenance',item.maintenanceLevel],['Seasonal highlights',item.seasonalHighlights],['Benefits',item.benefits],['Considerations',item.considerations]].filter(([,value])=>value).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{item.clientSelected && <strong className="client-selected">Client selected</strong>}</article>)}</div> : <PresentationEmpty title="Design concepts are in development" text="No concepts have been approved for client presentation." />}</>}
    {key === 'recommended-design' && <>{recommended ? <div className="recommended-layout"><div><span>Recommended direction</span><h3>{recommended.name}</h3><p>{recommended.description}</p>{recommended.designGoals && <blockquote>{recommended.designGoals}</blockquote>}<ConceptCanvasPreview concept={recommended} photo={vm.photos.find(item => item.photoId === recommended.heroPhotoId) || vm.photos.find(item => item.photoId === recommended.designStudio?.settings?.backgroundPhotoId) || vm.photos.find(item => item.photoId === recommended.canvas?.basePhotoId) || featured} />{recommended.showLegend && (recommended.designStudio?.objects?.length > 0 || recommended.canvas?.placements?.length > 0) && <div className="canvas-client-legend">{[...new Set((recommended.designStudio?.objects || recommended.canvas.placements).map(item => item.label).filter(Boolean))].map(label => <span key={label}>{label}</span>)}</div>}</div></div> : <PresentationEmpty title="Recommendation to come" text="Choose a client-visible concept and mark it recommended in the builder." />}</>}
    {['plant-palette', 'plant-plan'].includes(key) && <>{vm.plants.length ? <div className="plant-group-stack">{plantGroups.map(([group, plants]) => <section key={group}><h3>{group}</h3><div className="client-plant-grid">{plants.map(plant => <button key={plant.projectPlantId} onClick={() => onPlant(plant)}><span>{plant.category} · {plant.installationLocation || 'Garden-wide'}</span><h3>{plant.plantName}</h3><em>{plant.scientificName}</em><p>{plant.reasonSelected || 'Selected for its contribution to the garden composition.'}</p><div><strong>× {plant.quantity}</strong>{plant.clientPrice !== undefined && <strong>{money(plant.clientPrice)}</strong>}<small>View plant details →</small></div></button>)}</div></section>)}</div> : <PresentationEmpty title="Plant selections are being refined" text="No plants have been approved for client presentation." />}</>}
    {key === 'seasonal-interest' && <div className="season-story">{['Spring','Summer','Autumn','Winter'].map(season => <article key={season}><span>{season}</span>{vm.seasonal.filter(item => item.season === season).map(item => <div key={item.seasonalInterestId}><strong>{item.title}</strong><p>{item.details}</p><small>{item.interestType}{item.manual ? ' · Manual entry' : ''}{item.uncertain ? ' · Timing uncertain' : ''}</small></div>)}{!vm.seasonal.some(item => item.season === season) && <small>Garden interest to be planned</small>}</article>)}</div>}
    {key === 'bloom-calendar' && <CalendarGrid entries={vm.seasonal} type="Bloom" />}
    {key === 'harvest-calendar' && <CalendarGrid entries={vm.seasonal} type={['Harvest','Fruit']} />}
    {key === 'materials' && <>{vm.materials.length ? <div className="material-client-grid">{vm.materials.map(item => <article key={item.materialId}><span>{item.upgrade ? 'Optional upgrade' : item.category}</span><h3>{item.name}</h3><strong>{[item.finish,item.selectedColor].filter(Boolean).join(' · ')}</strong><p>{item.notes}</p>{item.quantity && <small>Quantity: {item.quantity}</small>}{item.installationPurpose && <small>Purpose: {item.installationPurpose}</small>}{item.price !== '' && <small>{money(item.price)}</small>}</article>)}</div> : <PresentationEmpty title="Materials are being curated" text="No materials are selected for this presentation." />}</>}
    {key === 'project-scope' && <div className="scope-list">{textList(vm.settings.projectScope).length ? textList(vm.settings.projectScope).map((item, index) => <article key={item}><span>{String(index + 1).padStart(2, '0')}</span><p>{item}</p></article>) : <PresentationEmpty title="Scope in refinement" text="The project scope will be confirmed before approval." />}</div>}
    {key === 'project-timeline' && <>{vm.timeline.length ? <div className="client-timeline">{vm.timeline.map(item => <article key={item.timelineEventId}><time>{dateLabel(item.dateTime)}</time><div><h3>{item.title}</h3><p>{item.description}</p></div></article>)}</div> : <PresentationEmpty title="Client timeline is private or not selected" text="Only intentionally shared milestones appear here." />}</>}
    {key === 'investment' && <>{vm.documents.length ? <div className="investment-stack"><h3>{vm.settings.investmentHeadline}</h3>{vm.documents.map(item => <article key={item.documentId}><div><span>{item.documentType} · {item.status}</span><strong>{item.title}</strong></div><strong>{money(item.total)}</strong><ul>{item.lines.map((line, index) => <li key={`${line.description}-${index}`}><span>{line.description} × {line.qty}</span><strong>{money(line.price * line.qty)}</strong></li>)}</ul></article>)}</div> : <PresentationEmpty title="Investment details are intentionally hidden" text="Client prices appear only when both project and record visibility are enabled." />}</>}
    {key === 'optional-add-ons' && <>{vm.addOns.length ? <div className="add-on-client-grid">{vm.addOns.map(item => <article key={item.addOnInterestId}><span>{item.status}</span><h3>{item.title}</h3><p>{item.description}</p>{item.price !== '' && <strong>{money(item.price)}</strong>}<button onClick={() => onAddOnInterest(item)}>I’m interested</button></article>)}</div> : <PresentationEmpty title="No optional add-ons selected" text="This proposal is focused on the current scope." />}</>}
    {key === 'maintenance-plan' && <div className="narrative-card"><h3>A garden designed for real life</h3><p>{vm.settings.maintenancePlan || 'Maintenance recommendations will be tailored after the final plant palette is approved.'}</p></div>}
    {key === 'plant-care' && <>{vm.settings.showCare && vm.plants.some(item => item.careInstructions) ? <div className="care-guide-grid">{vm.plants.filter(item => item.careInstructions).map(item => <article key={item.projectPlantId}><h3>{item.plantName}</h3><p>{item.careInstructions}</p></article>)}</div> : <PresentationEmpty title="Care guide is not included" text="Care information remains private until it is approved for this presentation." />}</>}
    {key === 'plant-passports' && <>{vm.passports.length ? <div className="passport-client-grid">{vm.passports.map(item => <article key={item.passportId}><span>Plant Passport</span><h3>{item.commonName}</h3><em>{[item.scientificName, item.cultivar].filter(Boolean).join(' · ')}</em><dl><div><dt>Location</dt><dd>{item.installationLocation || 'To be confirmed'}</dd></div><div><dt>Status</dt><dd>{item.currentStatus}</dd></div>{item.careInstructions && <div><dt>Care</dt><dd>{item.careInstructions}</dd></div>}{item.warrantyInformation && <div><dt>Warranty</dt><dd>{item.warrantyInformation}</dd></div>}</dl></article>)}</div> : <PresentationEmpty title="Plant Passports follow installation" text="Client-approved passports will appear here when available." />}</>}
    {key === 'warranty-information' && <div className="narrative-card"><h3>Warranty and support</h3><p>{vm.settings.warrantyInformation || 'Warranty information is not included in this presentation.'}</p></div>}
    {key === 'next-steps' && <div className="next-step-list">{textList(vm.settings.nextSteps).length ? textList(vm.settings.nextSteps).map((item, index) => <article key={item}><span>{index + 1}</span><p>{item}</p></article>) : <PresentationEmpty title="Next steps will be confirmed together" text="Use the conversation to shape the path forward." />}</div>}
    {key === 'approval' && <>{vm.approvals.length ? <div className="approval-client-list">{vm.approvals.map(item => <article key={item.approvalId}><span>{dateLabel(item.decisionDate)}</span><h3>{item.status}</h3><p>{item.comments}</p>{item.nextAction && <p><strong>Next action:</strong> {item.nextAction}</p>}{item.typedAcknowledgement && <blockquote>{item.typedAcknowledgement}</blockquote>}<select aria-label="Update approval status" value={item.status} onChange={event => onApproval(item, event.target.value)}>{['Not Presented','Presented','Needs Revision','Approved','Declined','On Hold'].map(status => <option key={status}>{status}</option>)}</select><small>Local business record · not a legal digital signature</small></article>)}</div> : <PresentationEmpty title="Ready for your decision" text="An approval record can be prepared in the Proposal Builder." />}</>}
    {key === 'thank-you' && <div className="thank-you-card"><img src="/assets/tierra-fleur-crest.jpeg" alt="Tierra Fleur Designs crest" /><span>With gratitude</span><h2>Thank You</h2><p>{vm.settings.thankYouMessage}</p><strong>{vm.client.name} · {vm.project.name}</strong><div className="thank-you-contact">{vm.business.phone && <span>{vm.business.phone}</span>}{vm.business.email && <span>{vm.business.email}</span>}{vm.business.website && <span>{vm.business.website}</span>}</div>{textList(vm.settings.nextSteps)[0] && <small>Next: {textList(vm.settings.nextSteps)[0]}</small>}<strong>{vm.business.name}</strong></div>}
  </section>;
}

export function PresentationMode({ data, setData, request, onExit }) {
  const vm = useMemo(() => buildPresentationViewModel(data, request.projectId), [data, request.projectId]);
  const [index, setIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePlant, setActivePlant] = useState(null);
  const [activePhoto, setActivePhoto] = useState(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const touchStart = useRef(null);
  const isPrint = request.mode === 'print';
  const printSections = useMemo(() => {
    if (!vm) return [];
    if (request.printKind === 'summary') return vm.sections.filter(item => ['welcome','client-vision','recommended-design','plant-palette','project-scope','investment','next-steps','thank-you'].includes(item.sectionKey));
    if (request.printKind === 'care') return vm.sections.filter(item => ['welcome','plant-palette','seasonal-interest','bloom-calendar','harvest-calendar','maintenance-plan','plant-care','plant-passports','warranty-information','thank-you'].includes(item.sectionKey));
    return vm.sections;
  }, [vm, request.printKind]);
  const sections = isPrint ? printSections : vm?.sections || [];
  const go = next => setIndex(Math.max(0, Math.min(sections.length - 1, next)));
  useEffect(() => { setIndex(0); }, [request.projectId, request.mode, request.printKind]);
  useEffect(() => {
    if (isPrint) return undefined;
    const handle = event => {
      if (['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)) return;
      if (['ArrowRight','PageDown',' '].includes(event.key)) { event.preventDefault(); go(index + 1); }
      if (['ArrowLeft','PageUp'].includes(event.key)) { event.preventDefault(); go(index - 1); }
      if (event.key === 'Home') go(0);
      if (event.key === 'End') go(sections.length - 1);
      if (event.key === 'Escape') {
        if (menuOpen) setMenuOpen(false);
        else {
          if (request.sessionId) setData(current => ({ ...current, presentationSessions: current.presentationSessions.map(item => item.sessionId === request.sessionId && !item.completedAt ? { ...item, completedAt: now(), endDateTime: now(), sessionCompleted: true } : item) }));
          if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
          onExit();
        }
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [index, sections.length, isPrint, menuOpen, onExit, request.sessionId, setData]);
  useEffect(() => {
    const sectionKey = sections[index]?.sectionKey;
    if (!request.sessionId || !sectionKey || isPrint) return;
    setData(current => ({
      ...current,
      presentationSessions: current.presentationSessions.map(item => item.sessionId === request.sessionId && !(item.sectionsViewed || []).includes(sectionKey)
        ? { ...item, sectionsViewed: [...(item.sectionsViewed || []), sectionKey] }
        : item),
    }));
  }, [request.sessionId, sections[index]?.sectionKey, isPrint, setData]);
  if (!vm) return <div className="presentation-missing"><h1>Presentation not found</h1><button onClick={onExit}>Return to Project Hub</button></div>;
  const savePrivateNote = event => {
    event.preventDefault();
    if (!note.trim()) return;
    const presentationNoteId = createPhase5Id('presentation-note');
    setData(current => ({
      ...current,
      presentationNotes: [{
        id: presentationNoteId,
        presentationNoteId,
        projectId: vm.projectId,
        clientId: vm.clientId,
        sessionId: request.sessionId || '',
        text: note.trim(),
        private: true,
        clientVisible: false,
        createdAt: now(),
        archived: false,
      }, ...current.presentationNotes],
      presentationSessions: request.sessionId ? current.presentationSessions.map(item => item.sessionId === request.sessionId ? { ...item, privateNoteIds: [...new Set([...(item.privateNoteIds || []), presentationNoteId])] } : item) : current.presentationSessions,
    }));
    setNote('');
    setNoteOpen(false);
  };
  const markInterest = item => setData(current => ({
    ...current,
    addOnInterestRecords: current.addOnInterestRecords.map(record => record.addOnInterestId === item.addOnInterestId ? { ...record, status: 'Interested', interestedAt: now() } : record),
    presentationSessions: request.sessionId ? current.presentationSessions.map(session => session.sessionId === request.sessionId ? { ...session, addOnInterestIds: [...new Set([...(session.addOnInterestIds || []), item.addOnInterestId])] } : session) : current.presentationSessions,
  }));
  const updateApproval = (item, status) => setData(current => ({
    ...current,
    approvalRecords: current.approvalRecords.map(record => record.approvalId === item.approvalId ? { ...record, status, decisionDate: today() } : record),
    presentationSessions: request.sessionId ? current.presentationSessions.map(session => session.sessionId === request.sessionId ? { ...session, approvalStatus: status, selectedDesignConceptId: item.conceptId || session.selectedDesignConceptId } : session) : current.presentationSessions,
  }));
  const exit = () => {
    if (request.sessionId) setData(current => ({ ...current, presentationSessions: current.presentationSessions.map(item => item.sessionId === request.sessionId && !item.completedAt ? { ...item, completedAt: now(), endDateTime: now(), sessionCompleted: true } : item) }));
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    onExit();
  };
  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };
  if (isPrint) return <div className={`presentation-print theme-${vm.theme.toLowerCase().replaceAll(' ', '-')}`}>
    <div className="print-preview-controls"><button onClick={onExit}>← Return to Builder</button><span>{request.printKind === 'care' ? 'Plant Care Guide' : request.printKind === 'summary' ? 'Client Summary' : 'Complete Presentation'}</span><button className="primary" onClick={() => window.print()}>Print / Save PDF</button></div>
    <main>{sections.map(section => <SectionView key={section.sectionId} section={section} vm={vm} onPlant={() => {}} onPhoto={() => {}} onAddOnInterest={() => {}} onApproval={() => {}} />)}</main>
  </div>;
  const section = sections[index];
  return <div
    className={`presentation-mode theme-${vm.theme.toLowerCase().replaceAll(' ', '-')}`}
    onTouchStart={event => { touchStart.current = event.touches[0]?.clientX; }}
    onTouchEnd={event => {
      const end = event.changedTouches[0]?.clientX;
      if (touchStart.current == null || end == null) return;
      const delta = end - touchStart.current;
      if (Math.abs(delta) > 60) go(index + (delta < 0 ? 1 : -1));
      touchStart.current = null;
    }}
  >
    <div className="presentation-progress" style={{ '--progress': `${((index + 1) / Math.max(1, sections.length)) * 100}%` }} />
    <header className="presentation-controls" aria-label="Presentation controls">
      <button onClick={() => setMenuOpen(value => !value)} aria-expanded={menuOpen}>Sections</button>
      <span>{index + 1} / {sections.length}</span>
      <div><button onClick={fullscreen}>Full screen</button><button className="private-note-button" onClick={() => setNoteOpen(true)} aria-label="Open private presentation note">🔒 Note</button><button onClick={exit}>{request.mode === 'preview' ? 'Return to Builder' : 'Exit Presentation'}</button></div>
    </header>
    {menuOpen && <nav className="presentation-menu" aria-label="Presentation section menu">{sections.map((item, sectionIndex) => <button key={item.sectionId} className={index === sectionIndex ? 'active' : ''} onClick={() => { go(sectionIndex); setMenuOpen(false); }}><span>{String(sectionIndex + 1).padStart(2, '0')}</span>{item.title}</button>)}</nav>}
    <main className="presentation-stage">
      {section ? <SectionView section={section} vm={vm} onPlant={setActivePlant} onPhoto={setActivePhoto} onAddOnInterest={markInterest} onApproval={updateApproval} /> : <PresentationEmpty title="No sections selected" text="Return to the builder and include at least one section." />}
    </main>
    <footer className="presentation-navigation"><button disabled={index === 0} onClick={() => go(index - 1)}>← Previous</button><span>{section?.title || 'Presentation'}</span><button disabled={index === sections.length - 1} onClick={() => go(index + 1)}>Next →</button></footer>
    {activePlant && <div className="client-detail-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setActivePlant(null)}><article className="client-plant-detail" role="dialog" aria-modal="true" aria-label={`${activePlant.plantName} details`}><button aria-label="Close plant details" onClick={() => setActivePlant(null)}>×</button><span>{activePlant.category}</span><h2>{activePlant.plantName}</h2><em>{activePlant.scientificName}{activePlant.cultivar ? ` · ${activePlant.cultivar}` : ''}</em><p>{activePlant.reasonSelected}</p><dl>{Object.entries({
      'Sun': activePlant.sunRequirement,
      'Water': activePlant.waterRequirement,
      'Mature size': activePlant.matureSize,
      'Bloom': activePlant.bloomSeason,
      'Harvest': activePlant.harvestSeason,
      'Color': activePlant.flowerColor,
      'Wildlife': activePlant.wildlifeBenefit,
      'Edible benefit': activePlant.edibleBenefit,
      'Fragrance': activePlant.fragrance,
      'Maintenance': activePlant.maintenanceLevel,
      'Care': activePlant.careInstructions,
    }).filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{activePlant.clientPrice !== undefined && <strong className="plant-detail-price">{money(activePlant.clientPrice)}</strong>}</article></div>}
    {activePhoto && <div className="client-detail-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setActivePhoto(null)}><figure className="client-photo-detail" role="dialog" aria-modal="true" aria-label={`${activePhoto.caption} full-screen photo`}><button aria-label="Close full-screen photo" onClick={() => setActivePhoto(null)}>×</button><img src={activePhoto.image} alt={activePhoto.caption} /><figcaption><strong>{activePhoto.caption}</strong><span>{activePhoto.stage} · {dateLabel(activePhoto.photoDate)}{activePhoto.locationLabel ? ` · ${activePhoto.locationLabel}` : ''}</span></figcaption></figure></div>}
    {noteOpen && <div className="client-detail-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setNoteOpen(false)}><form className="private-note-modal" role="dialog" aria-modal="true" aria-label="Private presentation note" onSubmit={savePrivateNote}><span>Internal · never client-visible</span><h3>Private presentation note</h3><textarea autoFocus required value={note} onChange={event => setNote(event.target.value)} placeholder="Record a private observation or follow-up…" /><div><button type="button" onClick={() => setNoteOpen(false)}>Cancel</button><button className="primary">Save private note</button></div></form></div>}
  </div>;
}
