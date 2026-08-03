export const PROJECT_ENGINE_VERSION = 4;

export const PROJECT_PLANT_STATUSES = [
  'Proposed',
  'Client Review',
  'Approved',
  'To Source',
  'Ordered',
  'Received',
  'Installed',
  'Replaced',
  'Removed',
  'Archived',
];

export const PROJECT_TASK_CATEGORIES = [
  'Consultation',
  'Design',
  'Client Approval',
  'Plant Sourcing',
  'Nursery Pickup',
  'Installation',
  'Finance',
  'Photography',
  'Maintenance',
  'Follow-Up',
  'Other',
];

export const PROJECT_TASK_STATUSES = [
  'Not Started',
  'In Progress',
  'Waiting on Client',
  'Waiting on Plants',
  'Completed',
  'Archived',
];

export const PROJECT_HEALTH_STATUSES = [
  'On Track',
  'Waiting on Client',
  'Waiting on Plants',
  'Financial Attention',
  'Behind Schedule',
  'Completed',
  'Archived',
];

export const PASSPORT_STATUSES = [
  'Installed',
  'Monitoring',
  'Thriving',
  'Needs Attention',
  'Replaced',
  'Removed',
  'Archived',
];

export const COMPLETION_ITEMS = [
  ['client', 'Client information complete'],
  ['design', 'Design approved or waived'],
  ['plantPlan', 'Plant Plan reviewed'],
  ['plantsResolved', 'Required plants installed or resolved'],
  ['finalPhotos', 'Final photos added or waived'],
  ['expenses', 'Expenses reviewed'],
  ['invoice', 'Invoice reviewed'],
  ['balance', 'Outstanding balance acknowledged'],
  ['passports', 'Plant Passports created or waived'],
  ['notes', 'Notes reviewed'],
  ['followUp', 'Follow-up task created or waived'],
];

const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
const asNumber = value => Number(value || 0);
const active = item => !item.archived;

export function createProjectEngineStarter() {
  return {
    projectEngineVersion: PROJECT_ENGINE_VERSION,
    projectPlants: [],
    projectTasks: [],
    plantPassports: [],
    plantReplacementHistory: [],
    projectCompletions: [],
  };
}

function normalizeTimelineItem(item = {}) {
  const eventId = item.eventId || item.timelineEventId || item.id || uid('timeline');
  return {
    ...item,
    id: item.id || eventId,
    eventId,
    timelineEventId: eventId,
    eventType: item.eventType || 'manual.note',
    title: item.title || 'Project note',
    description: item.description || item.detail || '',
    detail: item.detail || item.description || '',
    dateTime: item.dateTime || item.createdAt || (item.date ? `${item.date}T12:00:00` : now()),
    date: item.date || String(item.dateTime || item.createdAt || now()).slice(0, 10),
    relatedRecordId: item.relatedRecordId || '',
    automatic: item.automatic === true,
    dedupeKey: item.dedupeKey || '',
    archived: Boolean(item.archived),
  };
}

export function migrateProjectEngineData(saved = {}, related = {}) {
  const projects = related.projects || saved.projects || [];
  const clients = related.clients || saved.clients || [];
  const normalize = (records, prefix) => (Array.isArray(records) ? records : []).map(item => ({
    ...item,
    id: item.id || uid(prefix),
    archived: Boolean(item.archived),
  }));
  const projectPlants = normalize(saved.projectPlants, 'project-plant').map(item => {
    const projectPlantId = item.projectPlantId || item.id;
    return {
      plantName: '',
      scientificName: '',
      category: 'Plant',
      quantity: 1,
      conceptId: '',
      designPlantId: '',
      sourcingRecordId: '',
      nurseryId: '',
      unitCost: '',
      clientPrice: '',
      installationLocation: '',
      status: 'Proposed',
      notes: '',
      botanicalName: '',
      suggestedSpacing: '',
      matureWidth: '',
      matureHeight: '',
      sunRequirement: '',
      waterRequirement: '',
      supplier: '',
      installationDate: '',
      warrantyExpiration: '',
      shippingCost: '',
      orderDate: '',
      expectedArrivalDate: '',
      receiptReference: '',
      nurseryNotes: '',
      purchaseConfirmed: false,
      ...item,
      id: item.id || projectPlantId,
      projectPlantId,
      quantity: item.quantity || 1,
      archived: Boolean(item.archived || item.status === 'Archived'),
    };
  });
  const projectTasks = normalize(saved.projectTasks, 'project-task').map(item => {
    const taskId = item.taskId || item.id;
    return {
      description: '',
      dueDate: '',
      priority: 'Medium',
      status: 'Not Started',
      category: 'Other',
      relatedRecordId: '',
      notes: '',
      completionDate: '',
      ...item,
      id: item.id || taskId,
      taskId,
      archived: Boolean(item.archived || item.status === 'Archived'),
    };
  });
  const plantPassports = normalize(saved.plantPassports, 'passport').map(item => {
    const passportId = item.passportId || item.id;
    return {
      commonName: '',
      scientificName: '',
      cultivar: '',
      nursery: '',
      purchaseDate: '',
      installationDate: '',
      installationLocation: '',
      quantity: 1,
      purchaseCost: '',
      clientPrice: '',
      warrantyInformation: '',
      careInstructions: '',
      sunRequirement: '',
      waterRequirement: '',
      matureSize: '',
      installationPhoto: '',
      currentStatus: 'Installed',
      maintenanceNotes: '',
      replacementHistory: [],
      ...item,
      id: item.id || passportId,
      passportId,
      archived: Boolean(item.archived || item.currentStatus === 'Archived'),
    };
  });
  const plantReplacementHistory = normalize(saved.plantReplacementHistory, 'replacement').map(item => ({
    replacementId: item.replacementId || item.id,
    ...item,
  }));
  const projectCompletions = normalize(saved.projectCompletions, 'completion').map(item => ({
    checklist: {},
    waiverNotes: {},
    ...item,
    completionId: item.completionId || item.id,
  }));
  const projectTimeline = (Array.isArray(saved.projectTimeline) ? saved.projectTimeline : []).map(normalizeTimelineItem);
  const timelineKeys = new Set(projectTimeline.map(item => item.dedupeKey).filter(Boolean));
  const timelineIds = new Set(projectTimeline.map(item => item.eventId));

  projects.forEach(project => {
    const projectId = project.projectId;
    if (!projectId) return;
    const projectCreatedKey = `project.created:${projectId}`;
    if (!timelineKeys.has(projectCreatedKey)) {
      const eventId = `timeline-created-${projectId}`;
      if (!timelineIds.has(eventId)) {
        projectTimeline.push(normalizeTimelineItem({
          id: eventId,
          eventId,
          projectId,
          eventType: 'project.created',
          title: 'Project created',
          description: 'The connected Project Hub workspace was initialized.',
          dateTime: project.createdAt || now(),
          relatedRecordId: projectId,
          automatic: true,
          dedupeKey: projectCreatedKey,
        }));
        timelineKeys.add(projectCreatedKey);
        timelineIds.add(eventId);
      }
    }
    if (project.clientId && clients.some(client => (client.clientId || client.id) === project.clientId)) {
      const clientKey = `client.linked:${projectId}:${project.clientId}`;
      if (!timelineKeys.has(clientKey)) {
        const eventId = `timeline-client-${projectId}-${project.clientId}`;
        if (!timelineIds.has(eventId)) {
          projectTimeline.push(normalizeTimelineItem({
            id: eventId,
            eventId,
            projectId,
            eventType: 'client.linked',
            title: 'Client linked',
            description: 'The primary client record is connected by client ID.',
            dateTime: project.createdAt || now(),
            relatedRecordId: project.clientId,
            automatic: true,
            dedupeKey: clientKey,
          }));
          timelineKeys.add(clientKey);
          timelineIds.add(eventId);
        }
      }
    }
  });

  return {
    projectEngineVersion: PROJECT_ENGINE_VERSION,
    projectPlants,
    projectTasks,
    plantPassports,
    plantReplacementHistory,
    projectCompletions,
    projectTimeline,
  };
}

export function addTimelineEvent(state, event) {
  if (!event?.projectId || !event?.eventType || !event?.title) return state;
  const dedupeKey = event.dedupeKey || '';
  const existing = state.projectTimeline || [];
  if (dedupeKey && existing.some(item => item.dedupeKey === dedupeKey)) return state;
  const eventId = event.eventId || uid('timeline');
  const record = normalizeTimelineItem({
    ...event,
    id: eventId,
    eventId,
    timelineEventId: eventId,
    dateTime: event.dateTime || now(),
    automatic: event.automatic !== false,
    archived: false,
  });
  return { ...state, projectTimeline: [record, ...existing] };
}

export function createProjectPlantRecord(input) {
  const projectPlantId = input.projectPlantId || uid('project-plant');
  return {
    id: projectPlantId,
    projectPlantId,
    projectId: input.projectId,
    clientId: input.clientId || '',
    plantName: input.plantName || input.commonName || '',
    scientificName: input.scientificName || '',
    category: input.category || 'Plant',
    quantity: input.quantity || 1,
    conceptId: input.conceptId || '',
    designPlantId: input.designPlantId || '',
    sourcingRecordId: input.sourcingRecordId || '',
    nurseryId: input.nurseryId || '',
    unitCost: input.unitCost || '',
    clientPrice: input.clientPrice || '',
    installationLocation: input.installationLocation || '',
    status: input.status || 'Proposed',
    notes: input.notes || '',
    botanicalName: input.botanicalName || input.scientificName || '',
    suggestedSpacing: input.suggestedSpacing || '',
    matureWidth: input.matureWidth || '',
    matureHeight: input.matureHeight || '',
    sunRequirement: input.sunRequirement || '',
    waterRequirement: input.waterRequirement || '',
    supplier: input.supplier || '',
    installationDate: input.installationDate || '',
    warrantyExpiration: input.warrantyExpiration || '',
    shippingCost: input.shippingCost || '',
    orderDate: input.orderDate || '',
    expectedArrivalDate: input.expectedArrivalDate || '',
    receiptReference: input.receiptReference || '',
    nurseryNotes: input.nurseryNotes || '',
    purchaseConfirmed: Boolean(input.purchaseConfirmed),
    createdAt: input.createdAt || now(),
    updatedAt: input.updatedAt || now(),
    archived: Boolean(input.archived),
  };
}

export function upsertProjectPlant(state, input) {
  const records = state.projectPlants || [];
  const existing = records.find(item => item.projectId === input.projectId && (
    (input.projectPlantId && item.projectPlantId === input.projectPlantId)
    || (input.sourcingRecordId && item.sourcingRecordId === input.sourcingRecordId)
    || (input.conceptId && input.designPlantId && item.conceptId === input.conceptId && item.designPlantId === input.designPlantId)
  ));
  if (existing) {
    const projectPlants = records.map(item => item.projectPlantId === existing.projectPlantId
      ? { ...item, ...input, projectPlantId: existing.projectPlantId, id: existing.id, updatedAt: now() }
      : item);
    return { state: { ...state, projectPlants }, record: projectPlants.find(item => item.projectPlantId === existing.projectPlantId), created: false };
  }
  const record = createProjectPlantRecord(input);
  return { state: { ...state, projectPlants: [record, ...records] }, record, created: true };
}

export function calculateProjectFinancials(data, projectId) {
  const project = data.projects.find(item => item.projectId === projectId) || {};
  const transactions = (data.businessTransactions || []).filter(item => item.projectId === projectId && active(item));
  const legacyExpenses = (data.expenses || []).filter(item => item.projectId === projectId && active(item));
  const documents = (data.estimates || []).filter(item => item.projectId === projectId && active(item) && item.status !== 'Cancelled');
  const expenseRows = [
    ...transactions.filter(item => ['Expense', 'Mileage'].includes(item.type) && item.status !== 'Unpaid').map(item => ({ category: item.taxCategory || 'Other', amount: asNumber(item.amount), id: item.transactionId || item.id })),
    ...legacyExpenses.map(item => ({ category: item.category || 'Other', amount: asNumber(item.amount), id: item.transactionId || item.id })),
  ];
  const sumCategories = categories => expenseRows.filter(row => categories.includes(row.category)).reduce((sum, row) => sum + row.amount, 0);
  const plantCosts = sumCategories(['Plants', 'Plants & Materials']);
  const materialCosts = sumCategories(['Soil', 'Mulch', 'Containers', 'Fertilizer', 'Equipment', 'Tools & Equipment']);
  const nurseryShipping = sumCategories(['Nursery Shipping']);
  const recordedLabor = sumCategories(['Labor', 'Subcontractor']);
  const laborCost = recordedLabor || asNumber(project.profitPlan?.laborHours) * asNumber(project.profitPlan?.laborRate);
  const recordedMileage = sumCategories(['Mileage', 'Fuel & Travel', 'Fuel']);
  const mileageCost = recordedMileage || asNumber(project.profitPlan?.mileage) * asNumber(project.profitPlan?.mileageRate);
  const deliveryCost = sumCategories(['Delivery']);
  const mapped = new Set(['Plants', 'Plants & Materials', 'Soil', 'Mulch', 'Containers', 'Fertilizer', 'Equipment', 'Tools & Equipment', 'Nursery Shipping', 'Labor', 'Subcontractor', 'Mileage', 'Fuel & Travel', 'Fuel', 'Delivery']);
  const otherExpenses = expenseRows.filter(row => !mapped.has(row.category)).reduce((sum, row) => sum + row.amount, 0);
  const totalProjectCost = plantCosts + materialCosts + nurseryShipping + laborCost + mileageCost + deliveryCost + otherExpenses;
  const estimates = documents.filter(item => item.documentType !== 'Invoice');
  const invoices = documents.filter(item => item.documentType === 'Invoice');
  const estimatedClientRevenue = estimates.reduce((sum, item) => sum + asNumber(item.total), 0);
  const approvedClientRevenue = estimates.filter(item => ['Approved', 'Deposit Paid', 'Paid'].includes(item.status)).reduce((sum, item) => sum + asNumber(item.total), 0);
  const deposits = transactions.filter(item => item.type === 'Deposit' && item.status !== 'Unpaid').reduce((sum, item) => sum + asNumber(item.amount), 0);
  const paymentsReceived = transactions.filter(item => item.type === 'Client Payment' && item.status !== 'Unpaid').reduce((sum, item) => sum + asNumber(item.amount), 0);
  const clientRevenue = transactions.filter(item => ['Revenue', 'Client Payment', 'Deposit'].includes(item.type) && item.status !== 'Unpaid').reduce((sum, item) => sum + asNumber(item.amount), 0);
  const invoiced = invoices.reduce((sum, item) => sum + asNumber(item.total), 0);
  const outstandingBalance = Math.max(0, invoiced - deposits - paymentsReceived);
  const netProfit = clientRevenue - totalProjectCost;
  const profitMargin = clientRevenue > 0 ? netProfit / clientRevenue * 100 : 0;
  const desiredMargin = Math.min(95, Math.max(0, asNumber(project.profitPlan?.desiredMargin)));
  const recommendedPrice = desiredMargin < 100 ? totalProjectCost / (1 - desiredMargin / 100) : totalProjectCost;
  return {
    transactions,
    legacyExpenses,
    documents,
    estimatedClientRevenue,
    approvedClientRevenue,
    deposits,
    paymentsReceived,
    outstandingBalance,
    plantCosts,
    materialCosts,
    nurseryShipping,
    laborCost,
    mileageCost,
    deliveryCost,
    otherExpenses,
    totalProjectCost,
    totalCost: totalProjectCost,
    clientRevenue,
    netProfit,
    profitMargin,
    recommendedPrice,
  };
}

export function getProjectHealth(data, project) {
  if (project.archived) return { official: 'Archived', warnings: [], suggested: 'Archived' };
  if (project.status === 'Completed') return { official: project.healthStatus || 'Completed', warnings: [], suggested: 'Completed' };
  const finance = calculateProjectFinancials(data, project.projectId);
  const tasks = (data.projectTasks || []).filter(item => item.projectId === project.projectId && active(item) && item.status !== 'Completed');
  const plants = (data.projectPlants || []).filter(item => item.projectId === project.projectId && active(item));
  const concepts = (data.designConcepts || []).filter(item => item.projectId === project.projectId && active(item));
  const today = new Date().toISOString().slice(0, 10);
  const warnings = [];
  if (finance.outstandingBalance > 0 && (data.estimates || []).some(item => item.projectId === project.projectId && item.documentType === 'Invoice' && item.dueDate && item.dueDate < today && item.status !== 'Paid')) warnings.push('Outstanding balance is past due.');
  if (project.targetCompletionDate && project.targetCompletionDate < today) warnings.push('Target completion date has passed.');
  if (plants.some(item => item.status === 'Ordered' && item.expectedArrivalDate && item.expectedArrivalDate < today)) warnings.push('A plant order is delayed.');
  if (concepts.some(item => ['Client Review', 'Awaiting Approval'].includes(item.status))) warnings.push('Design approval is still pending.');
  if (asNumber(project.budget) > 0 && finance.totalProjectCost > asNumber(project.budget)) warnings.push('Recorded project cost is over budget.');
  if (tasks.some(item => item.dueDate && item.dueDate < today)) warnings.push('Required project tasks are overdue.');
  let suggested = 'On Track';
  if (warnings.some(item => item.includes('balance') || item.includes('budget'))) suggested = 'Financial Attention';
  else if (warnings.some(item => item.includes('order'))) suggested = 'Waiting on Plants';
  else if (warnings.some(item => item.includes('approval'))) suggested = 'Waiting on Client';
  else if (warnings.some(item => item.includes('completion') || item.includes('overdue'))) suggested = 'Behind Schedule';
  return { official: project.healthStatus || 'On Track', warnings, suggested };
}

export function getCompletionReadiness(data, project) {
  const projectId = project.projectId;
  const client = data.clients.find(item => (item.clientId || item.id) === project.clientId);
  const concepts = (data.designConcepts || []).filter(item => item.projectId === projectId && active(item));
  const plants = (data.projectPlants || []).filter(item => item.projectId === projectId && active(item));
  const photos = (data.projectPhotos || []).filter(item => item.projectId === projectId && active(item));
  const passports = (data.plantPassports || []).filter(item => item.projectId === projectId && active(item));
  const notes = (data.projectNotes || []).filter(item => item.projectId === projectId && active(item));
  const tasks = (data.projectTasks || []).filter(item => item.projectId === projectId && active(item));
  const finance = calculateProjectFinancials(data, projectId);
  return {
    client: Boolean(client?.name && (client.email || client.phone)),
    design: concepts.some(item => item.status === 'Approved'),
    plantPlan: plants.length > 0,
    plantsResolved: plants.length > 0 && plants.every(item => ['Installed', 'Replaced', 'Removed'].includes(item.status)),
    finalPhotos: photos.some(item => item.stage === 'Finished'),
    expenses: true,
    invoice: finance.documents.some(item => item.documentType === 'Invoice'),
    balance: finance.outstandingBalance === 0,
    passports: plants.filter(item => item.status === 'Installed').every(plant => passports.some(passport => passport.projectPlantId === plant.projectPlantId)),
    notes: notes.length > 0,
    followUp: tasks.some(item => ['Follow-Up', 'Maintenance'].includes(item.category)),
  };
}

export function projectEventTitle(eventType) {
  return ({
    'project.created': 'Project created',
    'client.linked': 'Client linked',
    'project.status.changed': 'Project status changed',
    'design.created': 'Design concept created',
    'design.approved': 'Design concept approved',
    'photo.uploaded': 'Property photo uploaded',
    'plant.added': 'Plant added to project',
    'sourcing.linked': 'Sourcing record linked',
    'plant.ordered': 'Plant marked ordered',
    'plant.received': 'Plant marked received',
    'estimate.created': 'Estimate created',
    'estimate.approved': 'Estimate approved',
    'invoice.created': 'Invoice created',
    'payment.recorded': 'Payment recorded',
    'expense.added': 'Expense added',
    'receipt.attached': 'Receipt attached',
    'task.completed': 'Task completed',
    'project.completed': 'Project completed',
    'project.archived': 'Project archived',
    'passport.created': 'Plant passport created',
    'plant.replaced': 'Plant replaced',
  })[eventType] || 'Project activity';
}
