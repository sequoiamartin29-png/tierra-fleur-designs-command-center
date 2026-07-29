export const PRESENTATION_SCHEMA_VERSION = 5;

export const PRESENTATION_THEMES = [
  'Jardin Classique',
  'Blush Estate',
  'Botanical Ivory',
  'Olive Conservatory',
  'Evening Garden',
];

export const PRESENTATION_SECTION_CATALOG = [
  ['welcome', 'Welcome'],
  ['client-vision', 'Client Vision'],
  ['property-overview', 'Property Overview'],
  ['existing-conditions', 'Existing Conditions'],
  ['property-photos', 'Property Photos'],
  ['design-concepts', 'Design Concepts'],
  ['recommended-design', 'Recommended Design'],
  ['plant-palette', 'Plant Palette'],
  ['plant-plan', 'Plant Plan'],
  ['seasonal-interest', 'Seasonal Interest'],
  ['bloom-calendar', 'Bloom Calendar'],
  ['harvest-calendar', 'Harvest Calendar'],
  ['materials', 'Materials'],
  ['project-scope', 'Project Scope'],
  ['project-timeline', 'Project Timeline'],
  ['investment', 'Investment'],
  ['optional-add-ons', 'Optional Add-Ons'],
  ['maintenance-plan', 'Maintenance Plan'],
  ['plant-care', 'Plant Care'],
  ['plant-passports', 'Plant Passports'],
  ['warranty-information', 'Warranty Information'],
  ['next-steps', 'Next Steps'],
  ['approval', 'Approval'],
  ['thank-you', 'Thank You'],
];

const now = () => new Date().toISOString();
const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
const bool = value => value === true;
const records = value => Array.isArray(value) ? value : [];
const active = item => !item.archived;
const recordId = (item, prefix) => item.id || item[`${prefix}Id`] || uid(prefix);

const defaultVision = {
  goals: '',
  preferredStyle: '',
  desiredColors: '',
  desiredPlants: '',
  edibleGardenGoals: '',
  pollinatorGoals: '',
  privacyGoals: '',
  accessibilityNeeds: '',
  maintenancePreference: '',
  budgetRange: '',
  householdNeeds: '',
  petChildConsiderations: '',
  sentimentalPlants: '',
  additionalRequests: '',
};

export function createPresentationSettings(project = {}) {
  const projectId = project.projectId || '';
  return {
    id: `presentation-${projectId}`,
    presentationId: `presentation-${projectId}`,
    projectId,
    clientId: project.clientId || '',
    title: project.name ? `${project.name} Garden Proposal` : 'Garden Design Proposal',
    subtitle: 'A considered landscape, created for the way you live',
    preparedBy: 'Tierra Fleur Designs',
    welcomeMessage: '',
    presentationDate: new Date().toISOString().slice(0, 10),
    featuredPhotoId: '',
    propertyName: project.name || '',
    generalLocation: '',
    projectType: '',
    approximateProjectSize: '',
    propertyType: '',
    styleArchitecture: '',
    sunExposure: '',
    soilConditions: '',
    drainage: '',
    existingFeatures: '',
    areasOfConcern: '',
    clientPriorities: '',
    accessNotes: '',
    keyChallenges: '',
    opportunities: '',
    existingConditions: '',
    clientVision: { ...defaultVision },
    projectScope: '',
    plantGroupBy: 'Installation area',
    investmentHeadline: 'Your project investment',
    maintenancePlan: '',
    warrantyInformation: '',
    nextSteps: '',
    thankYouMessage: 'Thank you for inviting Tierra Fleur Designs to imagine this garden with you.',
    showAddress: false,
    showPrices: false,
    showWarranty: false,
    showCare: false,
    showTimeline: false,
    showPlantDetails: false,
    selectedDesignVersionId: '',
    ready: false,
    updatedAt: now(),
    archived: false,
  };
}

export function createPresentationSections(projectId) {
  return PRESENTATION_SECTION_CATALOG.map(([sectionKey, defaultTitle], order) => ({
    id: `presentation-section-${projectId}-${sectionKey}`,
    sectionId: `presentation-section-${projectId}-${sectionKey}`,
    projectId,
    sectionKey,
    defaultTitle,
    presentationTitle: defaultTitle,
    introduction: '',
    order,
    included: true,
    complete: false,
    archived: false,
  }));
}

export function createPresentationStarter() {
  return {
    presentationSchemaVersion: PRESENTATION_SCHEMA_VERSION,
    presentationSettings: [],
    presentationSections: [],
    presentationTheme: [],
    presentationSessions: [],
    presentationNotes: [],
    photoComparisons: [],
    seasonalInterestEntries: [],
    approvalRecords: [],
    addOnInterestRecords: [],
  };
}

function normalizeSettings(item, project) {
  const base = createPresentationSettings(project);
  return {
    ...base,
    ...item,
    id: item.id || item.presentationId || base.id,
    presentationId: item.presentationId || item.id || base.presentationId,
    projectId: project.projectId,
    clientId: item.clientId || project.clientId || '',
    clientVision: { ...defaultVision, ...(item.clientVision || {}) },
    showAddress: bool(item.showAddress),
    showPrices: bool(item.showPrices),
    showWarranty: bool(item.showWarranty),
    showCare: bool(item.showCare),
    showTimeline: bool(item.showTimeline),
    showPlantDetails: bool(item.showPlantDetails),
    selectedDesignVersionId: item.selectedDesignVersionId || '',
    ready: bool(item.ready),
    archived: Boolean(item.archived),
  };
}

function normalizeSections(projectId, savedSections) {
  const defaults = createPresentationSections(projectId);
  const byKey = new Map(savedSections.filter(item => item.projectId === projectId).map(item => [item.sectionKey, item]));
  const merged = defaults.map(section => {
    const item = byKey.get(section.sectionKey) || {};
    return {
      ...section,
      ...item,
      id: item.id || item.sectionId || section.id,
      sectionId: item.sectionId || item.id || section.sectionId,
      projectId,
      sectionKey: section.sectionKey,
      defaultTitle: section.defaultTitle,
      presentationTitle: item.presentationTitle || item.title || section.defaultTitle,
      introduction: item.introduction || '',
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : section.order,
      included: item.included !== false,
      complete: bool(item.complete),
      archived: Boolean(item.archived),
    };
  });
  return merged.sort((a, b) => a.order - b.order).map((section, order) => ({ ...section, order }));
}

function normalizeCollection(source, prefix, defaults = {}) {
  return records(source).map(item => {
    const id = recordId(item, prefix);
    return {
      ...defaults,
      ...item,
      id,
      [`${prefix}Id`]: item[`${prefix}Id`] || id,
      archived: Boolean(item.archived),
    };
  });
}

export function migratePresentationData(saved = {}, related = {}) {
  const projects = records(related.projects || saved.projects);
  const existingSettings = records(saved.presentationSettings);
  const settingsByProject = new Map(existingSettings.map(item => [item.projectId, item]));
  const presentationSettings = projects.map(project => normalizeSettings(settingsByProject.get(project.projectId) || {}, project));
  const presentationSections = projects.flatMap(project => normalizeSections(project.projectId, records(saved.presentationSections)));
  const themesByProject = new Map(records(saved.presentationTheme).map(item => [item.projectId, item]));
  const presentationTheme = projects.map(project => {
    const item = themesByProject.get(project.projectId) || {};
    return {
      id: item.id || item.themeId || `presentation-theme-${project.projectId}`,
      themeId: item.themeId || item.id || `presentation-theme-${project.projectId}`,
      projectId: project.projectId,
      clientId: item.clientId || project.clientId || '',
      themeName: PRESENTATION_THEMES.includes(item.themeName) ? item.themeName : PRESENTATION_THEMES[0],
      archived: Boolean(item.archived),
    };
  });

  return {
    presentationSchemaVersion: PRESENTATION_SCHEMA_VERSION,
    presentationSettings,
    presentationSections,
    presentationTheme,
    presentationSessions: normalizeCollection(saved.presentationSessions, 'session', {
      clientId: '',
      startDateTime: '',
      endDateTime: '',
      dateTime: '',
      attendees: '',
      purpose: 'Client proposal presentation',
      outcome: '',
      followUpDate: '',
      followUpNeeded: false,
      notes: '',
      sectionsViewed: [],
      selectedDesignConceptId: '',
      addOnInterestIds: [],
      approvalStatus: '',
      privateNoteIds: [],
      sessionCompleted: false,
      completedAt: '',
    }).map(item => ({
      ...item,
      startDateTime: item.startDateTime || item.dateTime || '',
      endDateTime: item.endDateTime || item.completedAt || '',
      sectionsViewed: records(item.sectionsViewed),
      addOnInterestIds: records(item.addOnInterestIds),
      privateNoteIds: records(item.privateNoteIds),
      followUpNeeded: bool(item.followUpNeeded || item.followUpDate),
      sessionCompleted: bool(item.sessionCompleted || item.completedAt),
    })),
    presentationNotes: normalizeCollection(saved.presentationNotes, 'presentationNote', {
      clientId: '',
      sessionId: '',
      text: '',
      private: true,
      clientVisible: false,
      createdAt: '',
    }).map(item => ({ ...item, private: true, clientVisible: false })),
    photoComparisons: normalizeCollection(saved.photoComparisons, 'comparison', {
      clientId: '',
      beforePhotoId: '',
      afterPhotoId: '',
      title: 'Before & After',
      caption: '',
      clientVisible: false,
      presentationVisible: false,
    }),
    seasonalInterestEntries: normalizeCollection(saved.seasonalInterestEntries, 'seasonalInterest', {
      clientId: '',
      projectPlantId: '',
      season: 'Spring',
      month: '',
      interestType: 'Bloom',
      title: '',
      details: '',
      manual: true,
      firstHarvestYear: '',
      uncertain: false,
      clientVisible: false,
      presentationVisible: false,
    }),
    approvalRecords: normalizeCollection(saved.approvalRecords, 'approval', {
      clientId: '',
      conceptId: '',
      presentationId: '',
      status: 'Not Presented',
      decisionDate: '',
      decisionMaker: '',
      comments: '',
      clientName: '',
      representative: '',
      nextAction: '',
      typedAcknowledgement: '',
      clientVisible: false,
    }),
    addOnInterestRecords: normalizeCollection(saved.addOnInterestRecords, 'addOnInterest', {
      clientId: '',
      title: '',
      description: '',
      price: '',
      status: 'Interested',
      followUpDate: '',
      relatedRecordId: '',
      benefit: '',
      clientVisible: false,
      showPrice: false,
    }),
    projectPhotos: records(related.projectPhotos || saved.projectPhotos).map(item => ({
      ...item,
      clientVisible: bool(item.clientVisible),
      presentationVisible: bool(item.presentationVisible),
      featured: bool(item.featured),
      displayOrder: Number.isFinite(Number(item.displayOrder)) ? Number(item.displayOrder) : 0,
      locationLabel: item.locationLabel || '',
      comparisonGroup: item.comparisonGroup || '',
      private: item.private !== false,
      internal: item.internal !== false,
    })),
    designConcepts: records(related.designConcepts || saved.designConcepts).map(item => ({
      ...item,
      clientVisible: bool(item.clientVisible),
      presentationVisible: bool(item.presentationVisible),
      recommended: bool(item.recommended),
      clientSelected: bool(item.clientSelected),
      alternative: bool(item.alternative),
      heroPhotoId: item.heroPhotoId || '',
      designGoals: item.designGoals || '',
      investmentRange: item.investmentRange || '',
      maintenanceLevel: item.maintenanceLevel || '',
      seasonalHighlights: item.seasonalHighlights || '',
      benefits: item.benefits || '',
      considerations: item.considerations || '',
      showLegend: bool(item.showLegend),
    })),
    projectPlants: records(related.projectPlants || saved.projectPlants).map(item => ({
      ...item,
      clientVisible: bool(item.clientVisible),
      presentationVisible: bool(item.presentationVisible),
      showPrice: bool(item.showPrice),
      presentationProjectIds: records(item.presentationProjectIds),
      clientDescription: item.clientDescription || '',
      quantity: item.quantity || '',
      selectedColor: item.selectedColor || '',
      installationPurpose: item.installationPurpose || '',
      upgrade: bool(item.upgrade),
      reasonSelected: item.reasonSelected || '',
      cultivar: item.cultivar || '',
      sunRequirement: item.sunRequirement || '',
      waterRequirement: item.waterRequirement || '',
      matureSize: item.matureSize || '',
      bloomSeason: item.bloomSeason || '',
      harvestSeason: item.harvestSeason || '',
      flowerColor: item.flowerColor || '',
      wildlifeBenefit: item.wildlifeBenefit || '',
      edibleBenefit: item.edibleBenefit || '',
      fragrance: item.fragrance || '',
      maintenanceLevel: item.maintenanceLevel || '',
      careInstructions: item.careInstructions || '',
    })),
    designMaterials: records(related.designMaterials || saved.designMaterials).map(item => ({
      ...item,
      clientVisible: bool(item.clientVisible),
      presentationVisible: bool(item.presentationVisible),
      showPrice: bool(item.showPrice),
    })),
    projectTimeline: records(related.projectTimeline || saved.projectTimeline).map(item => ({
      ...item,
      clientVisible: bool(item.clientVisible),
      presentationVisible: bool(item.presentationVisible),
      private: item.private !== false,
    })),
    plantPassports: records(related.plantPassports || saved.plantPassports).map(item => ({
      ...item,
      clientVisible: bool(item.clientVisible),
      presentationVisible: bool(item.presentationVisible),
      showCare: bool(item.showCare),
      showWarranty: bool(item.showWarranty),
    })),
    estimates: records(related.estimates || saved.estimates).map(item => ({
      ...item,
      clientVisible: bool(item.clientVisible),
      presentationVisible: bool(item.presentationVisible),
      showPrice: bool(item.showPrice),
    })),
  };
}

export function getProjectPresentation(data, projectId) {
  const project = records(data.projects).find(item => item.projectId === projectId);
  if (!project) return null;
  return {
    project,
    client: records(data.clients).find(item => (item.clientId || item.id) === project.clientId) || null,
    settings: records(data.presentationSettings).find(item => item.projectId === projectId) || createPresentationSettings(project),
    sections: normalizeSections(projectId, records(data.presentationSections)),
    theme: records(data.presentationTheme).find(item => item.projectId === projectId)?.themeName || PRESENTATION_THEMES[0],
  };
}

function safePhoto(item) {
  return {
    photoId: item.photoId || item.id,
    stage: item.stage || '',
    caption: item.caption || item.fileName || 'Project photo',
    photoDate: item.photoDate || item.createdAt || '',
    tags: records(item.tags),
    image: item.image || '',
    featured: bool(item.featured),
    displayOrder: Number(item.displayOrder || 0),
    locationLabel: item.locationLabel || '',
    comparisonGroup: item.comparisonGroup || '',
    safeForPresentation: true,
  };
}

function safeConcept(item, data, presentationSettings) {
  const conceptId = item.designId || item.id;
  const requestedVersion = records(data.designVersions).find(version => version.versionId === presentationSettings.selectedDesignVersionId && version.conceptId === conceptId && active(version));
  const preferredVersion = requestedVersion || records(data.designVersions)
    .filter(version => version.conceptId === conceptId && active(version))
    .sort((a, b) => {
      const rank = version => version.status === 'Approved' ? 4 : version.status === 'Client Selected' ? 3 : version.status === 'Recommended' ? 2 : 1;
      return rank(b) - rank(a) || String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt));
    })[0];
  const sourceObjects = preferredVersion?.snapshot?.objects || records(data.designObjects).filter(object => object.conceptId === conceptId);
  const sourceLayers = preferredVersion?.snapshot?.layers || records(data.designLayers).filter(layer => layer.conceptId === conceptId);
  const sourceSettings = preferredVersion?.snapshot?.canvasSettings || records(data.designCanvasSettings).find(setting => setting.conceptId === conceptId) || null;
  const safeLayers = sourceLayers.filter(layer => active(layer) && layer.visible !== false && bool(layer.clientVisible) && layer.presentationVisible !== false).map(layer => ({
    id: layer.layerId || layer.id,
    layerId: layer.layerId || layer.id,
    name: layer.name || 'Design layer',
    order: Number(layer.order || 0),
    visible: true,
    clientVisible: true,
    presentationVisible: true,
    exportEnabled: layer.exportEnabled !== false,
    archived: false,
  }));
  const safeLayerIds = new Set(safeLayers.map(layer => layer.layerId));
  const safeObjects = sourceObjects.filter(object => active(object) && object.visible !== false && bool(object.clientVisible) && object.exportEnabled !== false && safeLayerIds.has(object.layerId)).map(object => {
    const style = object.style || {};
    return {
      id: object.objectId || object.id,
      objectId: object.objectId || object.id,
      layerId: object.layerId || '',
      objectType: object.objectType || 'annotation',
      x: Number(object.x || 0),
      y: Number(object.y || 0),
      width: Number(object.width || 0),
      height: Number(object.height || 0),
      rotation: Number(object.rotation || 0),
      zIndex: Number(object.zIndex || 0),
      opacity: Number(object.opacity ?? 1),
      visible: true,
      clientVisible: true,
      exportEnabled: true,
      label: object.label || '',
      points: records(object.points).map(point => ({ x: Number(point.x || 0), y: Number(point.y || 0) })),
      style: {
        stroke: style.stroke || '',
        strokeWidth: Number(style.strokeWidth || 0),
        strokeOpacity: Number(style.strokeOpacity ?? 1),
        fill: style.fill || '',
        fillOpacity: Number(style.fillOpacity ?? 0),
        lineStyle: style.lineStyle || 'solid',
        fontSize: Number(style.fontSize || 0),
        symbol: style.symbol || '',
        pattern: style.pattern || '',
        quantity: Number(style.quantity || 1),
        installationArea: style.installationArea || '',
        matureSpreadFeet: Number(style.matureSpreadFeet || 0),
        customSpreadFeet: Number(style.customSpreadFeet || 0),
        showMatureSpread: bool(style.showMatureSpread),
        showLabel: style.showLabel !== false,
        category: style.category || '',
        finish: style.finish || '',
      },
      archived: false,
    };
  });
  return {
    conceptId,
    name: item.name || 'Design concept',
    description: item.description || '',
    status: item.status || '',
    recommended: bool(item.recommended),
    clientSelected: bool(item.clientSelected),
    alternative: bool(item.alternative),
    heroPhotoId: item.heroPhotoId || '',
    designGoals: item.designGoals || '',
    investmentRange: item.investmentRange || '',
    maintenanceLevel: item.maintenanceLevel || '',
    seasonalHighlights: item.seasonalHighlights || '',
    benefits: item.benefits || '',
    considerations: item.considerations || '',
    showLegend: bool(item.showLegend),
    canvas: {
      basePhotoId: item.canvas?.basePhotoId || '',
      placements: records(item.canvas?.placements).map(placement => ({
        id: placement.id,
        label: placement.label || '',
        type: placement.type || '',
        x: Number(placement.x || 0),
        y: Number(placement.y || 0),
      })),
    },
    designStudio: sourceSettings ? {
      versionId: preferredVersion?.versionId || '',
      versionName: preferredVersion?.name || 'Live design',
      versionStatus: preferredVersion?.status || item.status || 'Draft',
      objects: safeObjects,
      layers: safeLayers,
      settings: {
        backgroundPhotoId: sourceSettings.backgroundPhotoId || item.canvas?.basePhotoId || '',
        backgroundVisible: sourceSettings.backgroundVisible !== false,
        backgroundOpacity: Number(sourceSettings.backgroundOpacity ?? .82),
        backgroundRotation: Number(sourceSettings.backgroundRotation || 0),
        backgroundZoom: Number(sourceSettings.backgroundZoom || 1),
        backgroundPanX: Number(sourceSettings.backgroundPanX || 0),
        backgroundPanY: Number(sourceSettings.backgroundPanY || 0),
        backgroundFit: sourceSettings.backgroundFit || 'cover',
        viewportZoom: Number(sourceSettings.viewportZoom || 1),
        viewportPanX: Number(sourceSettings.viewportPanX || 0),
        viewportPanY: Number(sourceSettings.viewportPanY || 0),
        gridVisible: false,
        showAllMatureSpread: bool(sourceSettings.showAllMatureSpread),
        scaleCalibration: {
          calibrated: bool(sourceSettings.scaleCalibration?.calibrated),
          pixelsPerFoot: Number(sourceSettings.scaleCalibration?.pixelsPerFoot || 0),
        },
      },
    } : null,
  };
}

function safePlant(item, settings) {
  const plant = {
    projectPlantId: item.projectPlantId || item.id,
    plantName: item.plantName || item.commonName || 'Plant selection',
    scientificName: item.scientificName || '',
    cultivar: item.cultivar || '',
    category: item.category || '',
    quantity: item.quantity || 1,
    conceptId: item.conceptId || '',
    installationLocation: item.installationLocation || '',
    status: item.status || '',
    reasonSelected: item.reasonSelected || '',
  };
  if (settings.showPlantDetails) Object.assign(plant, {
    sunRequirement: item.sunRequirement || '',
    waterRequirement: item.waterRequirement || '',
    matureSize: item.matureSize || '',
    bloomSeason: item.bloomSeason || '',
    harvestSeason: item.harvestSeason || '',
    flowerColor: item.flowerColor || '',
    wildlifeBenefit: item.wildlifeBenefit || '',
    edibleBenefit: item.edibleBenefit || '',
    fragrance: item.fragrance || '',
    maintenanceLevel: item.maintenanceLevel || '',
  });
  if (settings.showCare) plant.careInstructions = item.careInstructions || '';
  if (settings.showPrices && item.showPrice) plant.clientPrice = item.clientPrice || '';
  return plant;
}

function safePassport(item, settings) {
  const passport = {
    passportId: item.passportId || item.id,
    projectPlantId: item.projectPlantId || '',
    commonName: item.commonName || '',
    scientificName: item.scientificName || '',
    cultivar: item.cultivar || '',
    installationDate: item.installationDate || '',
    installationLocation: item.installationLocation || '',
    currentStatus: item.currentStatus || '',
  };
  if (settings.showCare && item.showCare) Object.assign(passport, {
    careInstructions: item.careInstructions || '',
    sunRequirement: item.sunRequirement || '',
    waterRequirement: item.waterRequirement || '',
    matureSize: item.matureSize || '',
  });
  if (settings.showWarranty && item.showWarranty) passport.warrantyInformation = item.warrantyInformation || '';
  return passport;
}

export function buildPresentationViewModel(data, projectId) {
  const context = getProjectPresentation(data, projectId);
  if (!context) return null;
  const { project, client, settings, sections, theme } = context;
  const isVisible = item => active(item) && bool(item.clientVisible) && bool(item.presentationVisible);
  const photos = records(data.projectPhotos)
    .filter(item => item.projectId === projectId && isVisible(item) && item.private !== true && item.internal !== true)
    .map(safePhoto)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const concepts = records(data.designConcepts).filter(item => item.projectId === projectId && isVisible(item)).map(item => safeConcept(item, data, settings));
  const plants = records(data.projectPlants).filter(item => item.projectId === projectId && isVisible(item)).map(item => safePlant(item, settings));
  const materials = records(data.designMaterials).filter(item => isVisible(item)
    && (!item.projectId || item.projectId === projectId)
    && (item.projectId === projectId || records(item.presentationProjectIds).includes(projectId))).map(item => ({
    materialId: item.materialId || item.id,
    name: item.name || item.category || 'Material',
    category: item.category || '',
    finish: item.finish || '',
    notes: item.clientDescription || item.notes || '',
    quantity: item.quantity || '',
    selectedColor: item.selectedColor || '',
    installationPurpose: item.installationPurpose || '',
    upgrade: bool(item.upgrade),
    price: settings.showPrices && item.showPrice ? item.clientPrice || item.price || '' : '',
  }));
  const seasonal = records(data.seasonalInterestEntries).filter(item => item.projectId === projectId && isVisible(item)).map(item => ({
    seasonalInterestId: item.seasonalInterestId || item.id,
    projectPlantId: item.projectPlantId || '',
    season: item.season || '',
    month: item.month || '',
    interestType: item.interestType || '',
    title: item.title || '',
    details: item.details || '',
    manual: item.manual !== false,
    firstHarvestYear: item.firstHarvestYear || '',
    uncertain: bool(item.uncertain),
  }));
  const comparisons = records(data.photoComparisons).filter(item => item.projectId === projectId && isVisible(item)).map(item => ({
    comparisonId: item.comparisonId || item.id,
    title: item.title || 'Before & After',
    caption: item.caption || '',
    before: photos.find(photo => photo.photoId === item.beforePhotoId) || null,
    after: photos.find(photo => photo.photoId === item.afterPhotoId) || null,
  })).filter(item => item.before && item.after);
  const timeline = settings.showTimeline
    ? records(data.projectTimeline).filter(item => item.projectId === projectId && active(item) && bool(item.clientVisible) && bool(item.presentationVisible) && item.private === false).map(item => ({
        timelineEventId: item.timelineEventId || item.eventId || item.id,
        title: item.title || '',
        description: item.description || item.detail || '',
        dateTime: item.dateTime || item.date || '',
      }))
    : [];
  const passports = records(data.plantPassports).filter(item => item.projectId === projectId && isVisible(item)).map(item => safePassport(item, settings));
  const documents = settings.showPrices
    ? records(data.estimates).filter(item => item.projectId === projectId && active(item) && bool(item.clientVisible) && bool(item.presentationVisible) && bool(item.showPrice)).map(item => ({
        documentId: item.invoiceId || item.estimateId || item.id,
        documentType: item.documentType || 'Estimate',
        title: item.title || 'Project investment',
        status: item.status || '',
        total: Number(item.total || 0),
        lines: records(item.lines).map(line => ({
          description: line.description || '',
          qty: Number(line.qty || 0),
          price: Number(line.price || 0),
        })),
      }))
    : [];
  const addOns = records(data.addOnInterestRecords).filter(item => item.projectId === projectId && active(item) && bool(item.clientVisible)).map(item => ({
    addOnInterestId: item.addOnInterestId || item.id,
    title: item.title || 'Optional service',
    description: item.description || '',
    status: item.status || '',
    price: settings.showPrices && item.showPrice ? item.price || '' : '',
  }));
  const approvals = records(data.approvalRecords).filter(item => item.projectId === projectId && active(item) && bool(item.clientVisible)).map(item => ({
    approvalId: item.approvalId || item.id,
    conceptId: item.conceptId || '',
    status: item.status || '',
    decisionDate: item.decisionDate || '',
    decisionMaker: item.decisionMaker || '',
    comments: item.comments || '',
    clientName: item.clientName || '',
    representative: item.representative || '',
    nextAction: item.nextAction || '',
    typedAcknowledgement: item.typedAcknowledgement || '',
  }));
  const featuredPhoto = photos.find(item => item.photoId === settings.featuredPhotoId)
    || photos.find(item => item.featured)
    || photos[0]
    || null;
  return {
    presentationId: settings.presentationId,
    projectId,
    clientId: project.clientId || '',
    theme,
    sections: sections.filter(item => item.included && !item.archived).sort((a, b) => a.order - b.order).map(item => ({
      sectionId: item.sectionId,
      sectionKey: item.sectionKey,
      title: item.presentationTitle || item.defaultTitle,
      introduction: item.introduction || '',
      complete: bool(item.complete),
    })),
    business: {
      name: data.business?.name || 'Tierra Fleur Designs',
      tagline: data.business?.tagline || 'Luxury edible landscape design for real-life spaces.',
      email: data.business?.email || '',
      phone: data.business?.phone || '',
      website: data.business?.website || '',
    },
    project: {
      name: project.name || 'Garden project',
      propertyAddress: settings.showAddress ? project.propertyAddress || '' : '',
      startDate: project.startDate || '',
      targetCompletionDate: project.targetCompletionDate || '',
      status: project.status || '',
      healthStatus: project.healthStatus || '',
    },
    client: { name: client?.name || 'Our Client' },
    settings: {
      title: settings.title || `${project.name} Garden Proposal`,
      subtitle: settings.subtitle || '',
      preparedBy: settings.preparedBy || '',
      welcomeMessage: settings.welcomeMessage || '',
      presentationDate: settings.presentationDate || '',
      propertyName: settings.propertyName || project.name || '',
      generalLocation: settings.generalLocation || '',
      projectType: settings.projectType || '',
      approximateProjectSize: settings.approximateProjectSize || '',
      propertyType: settings.propertyType || '',
      styleArchitecture: settings.styleArchitecture || '',
      sunExposure: settings.sunExposure || '',
      soilConditions: settings.soilConditions || '',
      drainage: settings.drainage || '',
      existingFeatures: settings.existingFeatures || '',
      areasOfConcern: settings.areasOfConcern || '',
      clientPriorities: settings.clientPriorities || '',
      accessNotes: settings.accessNotes || '',
      keyChallenges: settings.keyChallenges || '',
      opportunities: settings.opportunities || '',
      existingConditions: settings.existingConditions || '',
      clientVision: { ...defaultVision, ...(settings.clientVision || {}) },
      projectScope: settings.projectScope || '',
      plantGroupBy: settings.plantGroupBy || 'Installation area',
      investmentHeadline: settings.investmentHeadline || '',
      maintenancePlan: settings.maintenancePlan || '',
      warrantyInformation: settings.showWarranty ? settings.warrantyInformation || '' : '',
      nextSteps: settings.nextSteps || '',
      thankYouMessage: settings.thankYouMessage || '',
      showAddress: bool(settings.showAddress),
      showPrices: bool(settings.showPrices),
      showWarranty: bool(settings.showWarranty),
      showCare: bool(settings.showCare),
      showTimeline: bool(settings.showTimeline),
      showPlantDetails: bool(settings.showPlantDetails),
    },
    featuredPhoto,
    photos,
    comparisons,
    concepts,
    plants,
    seasonal,
    materials,
    timeline,
    passports,
    documents,
    addOns,
    approvals,
  };
}

export function presentationReadiness(data, projectId) {
  const context = getProjectPresentation(data, projectId);
  if (!context) return { ready: false, complete: 0, included: 0 };
  const included = context.sections.filter(item => item.included && !item.archived);
  const complete = included.filter(item => item.complete).length;
  return {
    ready: bool(context.settings.ready) && included.length > 0 && complete === included.length,
    complete,
    included: included.length,
  };
}

export function addPresentationSession(state, input) {
  if (!input?.projectId || !input?.sessionId) return state;
  if (records(state.presentationSessions).some(item => item.sessionId === input.sessionId)) return state;
  const project = records(state.projects).find(item => item.projectId === input.projectId);
  const session = {
    id: input.sessionId,
    sessionId: input.sessionId,
    projectId: input.projectId,
    clientId: input.clientId || project?.clientId || '',
    dateTime: input.dateTime || now(),
    startDateTime: input.dateTime || now(),
    endDateTime: '',
    attendees: input.attendees || '',
    purpose: input.purpose || 'Client proposal presentation',
    outcome: input.outcome || '',
    followUpDate: input.followUpDate || '',
    followUpNeeded: Boolean(input.followUpDate),
    notes: input.notes || '',
    sectionsViewed: [],
    selectedDesignConceptId: '',
    addOnInterestIds: [],
    approvalStatus: '',
    privateNoteIds: [],
    sessionCompleted: false,
    completedAt: '',
    archived: false,
  };
  return { ...state, presentationSessions: [session, ...records(state.presentationSessions)] };
}

export function createPhase5Id(prefix) {
  return uid(prefix);
}
