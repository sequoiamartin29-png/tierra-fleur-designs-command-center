import { createCalendarEvent, localDate } from './calendarEngine.js';

export const GROWTH_SCHEMA_VERSION = 1;

export const LEAD_STAGES = [
  'New Lead',
  'Contacted',
  'Consultation Scheduled',
  'Estimate in Progress',
  'Estimate Sent',
  'Waiting for Decision',
  'Booked',
  'Completed',
  'Lost',
];

export const LEAD_PRIORITIES = ['High', 'Medium', 'Low'];
export const PROPERTY_TYPES = ['Residential', 'Commercial', 'Community', 'Nonprofit', 'Other'];
export const CONTACT_METHODS = ['Phone', 'Email', 'Text', 'No preference'];
export const OPPORTUNITY_STATUSES = ['Researching', 'Ready to Contact', 'Contacted', 'Meeting Scheduled', 'Proposal Requested', 'Proposal Sent', 'Negotiating', 'Won', 'Lost'];
export const OPPORTUNITY_TYPES = ['Assisted living facility', 'Nursing home', 'Church', 'Medical office', 'School', 'Daycare center', 'Restaurant', 'Apartment community', 'Property manager', 'HOA', 'Community organization', 'Residential developer', 'Other'];
export const ESTIMATE_STATUSES = ['Draft', 'Ready to Send', 'Sent', 'Viewed', 'Accepted', 'Declined', 'Expired', 'Converted to Project'];
export const INVOICE_STATUSES = ['Draft', 'Sent', 'Deposit Due', 'Partially Paid', 'Paid', 'Past Due', 'Cancelled'];
export const ESTIMATE_LINE_CATEGORIES = ['Design fee', 'Consultation', 'Labor', 'Plants', 'Trees', 'Soil and amendments', 'Mulch', 'Stone', 'Edging', 'Hardscape materials', 'Delivery', 'Equipment', 'Disposal', 'Maintenance', 'Other'];
export const SERVICE_CATEGORIES = ['Landscape consultation', 'Landscape design', 'Edible landscape design', 'Edible landscape installation', 'Micro-orchard installation', 'Fruit tree installation', 'Tea garden design', 'Sensory garden design', 'Therapeutic garden design', 'Raised-bed installation', 'Seasonal containers', 'Garden rescue', 'Mulching', 'Pruning', 'Plant sourcing', 'Garden maintenance', 'Other'];
export const PORTFOLIO_PERMISSION_STATUSES = ['Not requested', 'Requested', 'Approved', 'Declined'];

const records = value => Array.isArray(value) ? value : [];
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const now = () => new Date().toISOString();
const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
const clean = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const phoneKey = value => String(value || '').replace(/\D/g, '').slice(-10);
const active = item => !item.archived;

const MARKETING_TEMPLATE_SEEDS = [
  ['facebook-seasonal', 'Seasonal garden invitation', 'Facebook', 'Homeowners', 'A beautiful, useful landscape can begin with one thoughtful plan. Tierra Fleur Designs is scheduling seasonal consultations for edible gardens, inviting entries, and practical outdoor rooms.', 'Request a consultation'],
  ['instagram-project', 'Project story caption', 'Instagram', 'Homeowners', 'From underused space to a garden with purpose: this Tierra Fleur project blends beauty, food, and an easier rhythm of care.', 'Save this idea and inquire about your space'],
  ['nextdoor-intro', 'Neighborhood introduction', 'Nextdoor', 'Local homeowners', 'Hello neighbors! Tierra Fleur Designs creates thoughtful edible landscapes, fruit-tree plantings, raised beds, and garden refreshes designed around the way you actually live.', 'Message Tierra Fleur to plan a consultation'],
  ['website-service', 'Website service description', 'Website', 'Prospective clients', 'Tierra Fleur Designs plans and installs elegant, productive landscapes—from intimate tea gardens and raised beds to small orchards and restorative outdoor spaces.', 'Explore a custom landscape plan'],
  ['email-intro', 'Introductory email', 'Email', 'New inquiry', 'Thank you for reaching out to Tierra Fleur Designs. I would love to learn what you hope your outdoor space will make possible and discuss the best next step.', 'Choose a consultation time'],
  ['email-follow-up', 'General follow-up', 'Email', 'Warm lead', 'I wanted to follow up on your landscape goals and see whether any questions have come up since we last spoke. I am happy to clarify scope, timing, or investment.', 'Reply with your questions or preferred next step'],
  ['estimate-follow-up', 'Estimate follow-up', 'Email', 'Estimate recipient', 'I am checking in on the Tierra Fleur proposal I shared. Please let me know what feels clear, what needs adjustment, and whether you would like to reserve a project window.', 'Review the proposal and reply'],
  ['referral-request', 'Referral request', 'Email', 'Past client', 'If someone you know is dreaming about a more beautiful or productive outdoor space, I would be grateful for an introduction.', 'Share Tierra Fleur with a friend'],
  ['testimonial-request', 'Testimonial request', 'Email', 'Completed client', 'Thank you for trusting Tierra Fleur Designs with your landscape. A short note about your experience would help future clients understand what working together feels like.', 'Reply with a few sentences'],
  ['commercial-outreach', 'Commercial outreach', 'Email', 'Organizations', 'Tierra Fleur Designs helps organizations create welcoming, manageable outdoor spaces for residents, guests, staff, and communities.', 'Schedule a short site conversation'],
  ['assisted-living', 'Assisted-living outreach', 'Email', 'Assisted living leaders', 'Sensory and edible gardens can offer residents beauty, familiarity, gentle activity, and seasonal connection. Tierra Fleur Designs creates practical spaces shaped around care needs and maintenance realities.', 'Discuss a garden opportunity'],
  ['church-outreach', 'Church outreach', 'Email', 'Church leaders', 'A well-planned church garden can support welcome, reflection, food ministry, youth learning, and community connection. Tierra Fleur Designs can help define a practical first phase.', 'Invite a site conversation'],
  ['new-homeowner', 'New-homeowner introduction', 'Door hanger', 'New homeowners', 'Make the yard feel like home. Tierra Fleur Designs plans inviting, useful landscapes that can grow in thoughtful phases.', 'Book a property consultation'],
  ['door-hanger-general', 'Door-hanger copy', 'Door hanger', 'Neighborhood homeowners', 'Your yard can be more welcoming, useful, and manageable. Tierra Fleur Designs creates custom garden plans, edible landscapes, and thoughtful installation phases.', 'Scan or contact Tierra Fleur to begin'],
  ['flyer-general', 'Service flyer copy', 'Flyer', 'Local homeowners and organizations', 'Landscape consultation, design, planting, edible gardens, small orchards, seasonal containers, and garden rescue—planned around your space and priorities.', 'Request a Tierra Fleur consultation'],
  ['seasonal-promo', 'Seasonal promotion', 'Flyer', 'Local homeowners', 'Plan now for a landscape that gives more next season—fruit trees, raised beds, welcoming entrances, containers, and garden rescue.', 'Reserve a consultation'],
];

export function createGrowthStarter() {
  return {
    growthSchemaVersion: GROWTH_SCHEMA_VERSION,
    leads: [],
    followUps: [],
    opportunities: [],
    marketingTemplates: MARKETING_TEMPLATE_SEEDS.map(([key, title, channel, audience, message, callToAction]) => ({
      id: `marketing-${key}`,
      templateId: `marketing-${key}`,
      title,
      channel,
      audience,
      message,
      callToAction,
      relatedService: '',
      status: 'Ready',
      favorite: false,
      builtIn: true,
      archived: false,
      createdAt: '2026-08-05T12:00:00.000Z',
      lastUsed: '',
    })),
    campaigns: [],
    referrals: [],
    portfolioEntries: [],
    estimateTemplates: [],
    dailyFocus: 'Today’s mission is to grow Tierra Fleur Designs.',
  };
}

export function createBlankLead(values = {}) {
  return {
    fullName: '', organizationName: '', phone: '', email: '', serviceAddress: '', billingAddress: '',
    serviceRequested: '', leadSource: '', referralSource: '', estimatedBudget: '', estimatedJobValue: '',
    propertyType: 'Residential', preferredContactMethod: 'No preference', dateReceived: localDate(),
    lastContactDate: '', nextFollowUpDate: '', consultationDate: '', currentStage: 'New Lead',
    priorityLevel: 'Medium', notes: '', tags: [], photoIds: [], lostReason: '', clientId: '', projectId: '',
    ...values,
  };
}

export function normalizeLead(item = {}) {
  const leadId = item.leadId || item.id || uid('lead');
  return {
    ...createBlankLead(),
    ...item,
    id: item.id || leadId,
    leadId,
    fullName: item.fullName || item.name || 'Untitled lead',
    serviceAddress: item.serviceAddress || item.address || '',
    currentStage: LEAD_STAGES.includes(item.currentStage || item.stage) ? (item.currentStage || item.stage) : 'New Lead',
    priorityLevel: LEAD_PRIORITIES.includes(item.priorityLevel || item.priority) ? (item.priorityLevel || item.priority) : 'Medium',
    tags: records(item.tags).filter(Boolean),
    photoIds: records(item.photoIds).filter(Boolean),
    archived: Boolean(item.archived),
    createdAt: item.createdAt || item.created || now(),
    updatedAt: item.updatedAt || item.createdAt || item.created || now(),
  };
}

function normalizeFollowUp(item = {}) {
  const followUpId = item.followUpId || item.id || uid('follow-up');
  return {
    ...item,
    id: item.id || followUpId,
    followUpId,
    leadId: item.leadId || '',
    clientId: item.clientId || '',
    projectId: item.projectId || '',
    estimateId: item.estimateId || '',
    reason: item.reason || 'Follow up',
    dueDate: item.dueDate || item.date || localDate(),
    completed: Boolean(item.completed),
    completedAt: item.completedAt || '',
    notes: item.notes || '',
    archived: Boolean(item.archived),
    createdAt: item.createdAt || now(),
    updatedAt: item.updatedAt || item.createdAt || now(),
  };
}

function normalizeOpportunity(item = {}) {
  const opportunityId = item.opportunityId || item.id || uid('opportunity');
  return {
    ...item,
    id: item.id || opportunityId,
    opportunityId,
    organization: item.organization || item.name || 'Untitled organization',
    contactPerson: item.contactPerson || '', phone: item.phone || '', email: item.email || '', address: item.address || '',
    opportunityType: OPPORTUNITY_TYPES.includes(item.opportunityType) ? item.opportunityType : 'Other',
    dateFirstContacted: item.dateFirstContacted || '', lastContact: item.lastContact || '', nextFollowUp: item.nextFollowUp || '',
    status: OPPORTUNITY_STATUSES.includes(item.status) ? item.status : 'Researching',
    estimatedValue: item.estimatedValue || '', notes: item.notes || '', relatedDocuments: records(item.relatedDocuments),
    archived: Boolean(item.archived), createdAt: item.createdAt || now(), updatedAt: item.updatedAt || item.createdAt || now(),
  };
}

function normalizeMarketingTemplate(item = {}) {
  const templateId = item.templateId || item.id || uid('marketing');
  return { ...item, id: item.id || templateId, templateId, title: item.title || 'Untitled template', channel: item.channel || 'Email', audience: item.audience || '', message: item.message || '', callToAction: item.callToAction || '', relatedService: item.relatedService || '', status: item.status || 'Draft', favorite: Boolean(item.favorite), archived: Boolean(item.archived), builtIn: Boolean(item.builtIn), createdAt: item.createdAt || now(), lastUsed: item.lastUsed || '' };
}

function normalizeCampaign(item = {}) {
  const campaignId = item.campaignId || item.id || uid('campaign');
  return { ...item, id: item.id || campaignId, campaignId, name: item.name || 'Untitled campaign', channel: item.channel || '', startDate: item.startDate || '', endDate: item.endDate || '', cost: item.cost || '', leadsGenerated: item.leadsGenerated || '', jobsBooked: item.jobsBooked || '', revenueGenerated: item.revenueGenerated || '', notes: item.notes || '', archived: Boolean(item.archived), createdAt: item.createdAt || now(), updatedAt: item.updatedAt || item.createdAt || now() };
}

function normalizeReferral(item = {}) {
  const referralId = item.referralId || item.id || uid('referral');
  return { ...item, id: item.id || referralId, referralId, referrer: item.referrer || '', referredLeadId: item.referredLeadId || '', referralDate: item.referralDate || localDate(), outcome: item.outcome || 'Pending', revenueGenerated: item.revenueGenerated || '', rewardPromised: item.rewardPromised || '', rewardDelivered: Boolean(item.rewardDelivered), notes: item.notes || '', archived: Boolean(item.archived), createdAt: item.createdAt || now(), updatedAt: item.updatedAt || item.createdAt || now() };
}

function normalizePortfolioEntry(item = {}) {
  const portfolioEntryId = item.portfolioEntryId || item.id || uid('portfolio');
  return { ...item, id: item.id || portfolioEntryId, portfolioEntryId, projectId: item.projectId || '', projectTitle: item.projectTitle || item.title || 'Untitled project story', clientDisplayName: item.clientDisplayName || 'Private client', projectType: item.projectType || '', location: item.location || '', description: item.description || '', servicesPerformed: item.servicesPerformed || '', beforePhotoId: item.beforePhotoId || '', duringPhotoIds: records(item.duringPhotoIds), afterPhotoId: item.afterPhotoId || '', completionDate: item.completionDate || '', featured: Boolean(item.featured), clientTestimonial: item.clientTestimonial || '', permissionStatus: PORTFOLIO_PERMISSION_STATUSES.includes(item.permissionStatus) ? item.permissionStatus : 'Not requested', socialCaption: item.socialCaption || '', websiteCopy: item.websiteCopy || '', archived: Boolean(item.archived), createdAt: item.createdAt || now(), updatedAt: item.updatedAt || item.createdAt || now() };
}

export function migrateGrowthData(saved = {}) {
  const starter = createGrowthStarter();
  const savedTemplates = records(saved.marketingTemplates).map(normalizeMarketingTemplate);
  const byId = new Map(savedTemplates.map(item => [item.templateId, item]));
  const seedIds = new Set(starter.marketingTemplates.map(item => item.templateId));
  const marketingTemplates = [
    ...starter.marketingTemplates.map(seed => normalizeMarketingTemplate({ ...seed, ...(byId.get(seed.templateId) || {}) })),
    ...savedTemplates.filter(item => !seedIds.has(item.templateId)),
  ];
  return {
    growthSchemaVersion: GROWTH_SCHEMA_VERSION,
    leads: records(saved.leads).map(normalizeLead),
    followUps: records(saved.followUps).map(normalizeFollowUp),
    opportunities: records(saved.opportunities).map(normalizeOpportunity),
    marketingTemplates,
    campaigns: records(saved.campaigns).map(normalizeCampaign),
    referrals: records(saved.referrals).map(normalizeReferral),
    portfolioEntries: records(saved.portfolioEntries).map(normalizePortfolioEntry),
    estimateTemplates: records(saved.estimateTemplates).map(item => {
      const templateId = item.templateId || item.id || uid('estimate-template');
      return { ...item, id: item.id || templateId, templateId, archived: Boolean(item.archived) };
    }),
    dailyFocus: typeof saved.dailyFocus === 'string' ? saved.dailyFocus : starter.dailyFocus,
  };
}

export function leadFollowUpCalendarLink(leadId = '', followUpId = '') {
  return {
    leadId,
    followUpId,
    relatedRecordType: 'lead',
    relatedRecordId: leadId,
  };
}

export function repairLeadFollowUpCalendarLinks(data = {}) {
  const leads = records(data.leads);
  const followUps = records(data.followUps);
  const leadsById = new Map(leads.map(lead => [lead.leadId, lead]).filter(([leadId]) => leadId));
  const followUpsById = new Map(followUps.map(followUp => [followUp.followUpId, followUp]).filter(([followUpId]) => followUpId));
  const calendarEvents = records(data.calendarEvents).map(event => {
    if (event.eventType !== 'Lead Follow-up' && !event.followUpId) return event;
    const legacyFollowUpId = followUpsById.has(event.relatedRecordId) ? event.relatedRecordId : '';
    const followUpId = event.followUpId || legacyFollowUpId;
    const followUp = followUpsById.get(followUpId);
    const directLeadId = leadsById.has(event.leadId)
      ? event.leadId
      : event.relatedRecordType === 'lead' && leadsById.has(event.relatedRecordId)
        ? event.relatedRecordId
        : '';
    let leadId = directLeadId || (leadsById.has(followUp?.leadId) ? followUp.leadId : '');
    if (!leadId) {
      const eventName = clean(String(event.title || '').replace(/^follow\s*up\s*[·:—-]\s*/i, ''));
      const matches = eventName ? leads.filter(lead => [lead.fullName, lead.organizationName].some(name => clean(name) === eventName)) : [];
      if (matches.length === 1) leadId = matches[0].leadId;
    }
    if (!leadId) return event;
    const lead = leadsById.get(leadId);
    const repaired = {
      ...event,
      ...leadFollowUpCalendarLink(leadId, followUpId || event.followUpId || ''),
      clientId: event.clientId || followUp?.clientId || lead?.clientId || '',
      projectId: event.projectId || followUp?.projectId || lead?.projectId || '',
    };
    const changed = Object.keys(repaired).some(key => repaired[key] !== event[key]);
    return changed ? repaired : event;
  });
  return { ...data, calendarEvents };
}

export function migrateServices(services = []) {
  return records(services).map(item => {
    const serviceId = item.serviceId || item.id || uid('service');
    return ({
    ...item,
    id: item.id || serviceId,
    serviceId,
    name: item.name || item.serviceName || 'Untitled service',
    category: item.category || 'Other',
    description: item.description || '',
    startingPrice: item.startingPrice ?? item.price ?? '',
    price: item.price ?? item.startingPrice ?? '',
    priceRange: item.priceRange || '',
    pricingMethod: item.pricingMethod || item.unit || 'project',
    unit: item.unit || item.pricingMethod || 'project',
    estimatedLaborHours: item.estimatedLaborHours || '',
    defaultMaterials: item.defaultMaterials || '',
    suggestedDeposit: item.suggestedDeposit || '',
    internalCostNotes: item.internalCostNotes || '',
    customerDescription: item.customerDescription || item.description || '',
    active: item.active !== false && !item.archived,
    archived: Boolean(item.archived),
    createdAt: item.createdAt || now(),
    updatedAt: item.updatedAt || item.createdAt || now(),
  });
  });
}

export function normalizeEstimateLine(item = {}) {
  const lineId = item.lineId || item.id || uid('estimate-line');
  const cost = number(item.cost);
  const markup = number(item.markup);
  const legacyPrice = item.customerPrice ?? item.price ?? item.unitPrice;
  const customerPrice = legacyPrice === '' || legacyPrice == null ? cost * (1 + markup / 100) : number(legacyPrice);
  return {
    ...item,
    id: item.id || lineId,
    lineId,
    category: ESTIMATE_LINE_CATEGORIES.includes(item.category) ? item.category : 'Other',
    description: item.description || '',
    quantity: item.quantity ?? item.qty ?? 1,
    qty: item.qty ?? item.quantity ?? 1,
    unit: item.unit || 'each',
    unitPrice: item.unitPrice ?? customerPrice,
    price: item.price ?? customerPrice,
    cost,
    markup,
    customerPrice,
    taxable: item.taxable !== false,
    notes: item.notes || '',
  };
}

export function calculateEstimateTotals(lines = [], options = {}) {
  const normalized = records(lines).map(normalizeEstimateLine);
  const subtotal = normalized.reduce((sum, line) => sum + Math.max(0, number(line.quantity)) * Math.max(0, number(line.customerPrice)), 0);
  const estimatedCost = normalized.reduce((sum, line) => sum + Math.max(0, number(line.quantity)) * Math.max(0, number(line.cost)), 0);
  const discountAmount = Math.min(subtotal, Math.max(0, number(options.discountAmount ?? options.discount)));
  const taxableBeforeDiscount = normalized.filter(line => line.taxable).reduce((sum, line) => sum + Math.max(0, number(line.quantity)) * Math.max(0, number(line.customerPrice)), 0);
  const discountRatio = subtotal ? discountAmount / subtotal : 0;
  const taxableSubtotal = Math.max(0, taxableBeforeDiscount * (1 - discountRatio));
  const tax = taxableSubtotal * Math.max(0, number(options.taxRate)) / 100;
  const total = Math.max(0, subtotal - discountAmount + tax);
  const depositPercent = Math.min(100, Math.max(0, number(options.depositPercent ?? options.depositRequirement)));
  const depositDue = total * depositPercent / 100;
  const paymentsReceived = Math.max(0, number(options.paymentsReceived));
  return { subtotal, estimatedCost, discountAmount, taxableSubtotal, tax, total, depositDue, paymentsReceived, balanceDue: Math.max(0, total - paymentsReceived), estimatedProfit: total - estimatedCost };
}

export function migrateEstimateDocuments(documents = []) {
  return records(documents).map(item => {
    const documentType = item.documentType || (/invoice/i.test(item.title || '') ? 'Invoice' : 'Estimate');
    const id = item.id || uid(documentType === 'Invoice' ? 'invoice' : 'estimate');
    const lines = records(item.lines || item.lineItems).map(normalizeEstimateLine);
    const totals = calculateEstimateTotals(lines, {
      discountAmount: item.discountAmount ?? item.discount,
      taxRate: item.taxRate,
      depositPercent: item.depositPercent ?? item.depositRequirement,
      paymentsReceived: item.paymentsReceived,
    });
    const legacyTotal = item.total != null && item.total !== '' ? number(item.total) : totals.total;
    return {
      ...item,
      id,
      documentType,
      estimateId: item.estimateId || (documentType === 'Estimate' ? id : ''),
      invoiceId: item.invoiceId || (documentType === 'Invoice' ? id : ''),
      estimateNumber: item.estimateNumber || (documentType === 'Estimate' ? `TFD-EST-${String(item.date || localDate()).slice(0, 4)}-${String(id).slice(-4).toUpperCase()}` : ''),
      invoiceNumber: item.invoiceNumber || (documentType === 'Invoice' ? `TFD-INV-${String(item.date || localDate()).slice(0, 4)}-${String(id).slice(-4).toUpperCase()}` : ''),
      leadId: item.leadId || '', clientId: item.clientId || '', projectId: item.projectId || '',
      title: item.title || (documentType === 'Invoice' ? 'Landscape Services Invoice' : 'Landscape Design Proposal'),
      creationDate: item.creationDate || item.date || localDate(), date: item.date || item.creationDate || localDate(),
      expirationDate: item.expirationDate || '', dueDate: item.dueDate || '', serviceAddress: item.serviceAddress || '',
      scopeOfWork: item.scopeOfWork || item.scope || '', notes: item.notes || '', terms: item.terms || '',
      depositPercent: item.depositPercent ?? item.depositRequirement ?? '', discountAmount: item.discountAmount ?? item.discount ?? '',
      taxRate: item.taxRate ?? '', lines, lineItems: lines,
      subtotal: item.subtotal != null ? number(item.subtotal) : totals.subtotal,
      estimatedCost: item.estimatedCost != null ? number(item.estimatedCost) : totals.estimatedCost,
      discount: item.discount != null ? number(item.discount) : totals.discountAmount,
      tax: item.tax != null ? number(item.tax) : totals.tax,
      total: legacyTotal,
      depositDue: item.depositDue != null ? number(item.depositDue) : legacyTotal * number(item.depositPercent ?? item.depositRequirement) / 100,
      paymentsReceived: number(item.paymentsReceived),
      balanceDue: item.balanceDue != null ? number(item.balanceDue) : Math.max(0, legacyTotal - number(item.paymentsReceived)),
      archived: Boolean(item.archived), createdAt: item.createdAt || now(), updatedAt: item.updatedAt || item.createdAt || now(),
    };
  });
}

export function nextEstimateNumber(documents = [], date = localDate(), type = 'Estimate') {
  const year = String(date).slice(0, 4);
  const prefix = type === 'Invoice' ? `TFD-INV-${year}-` : `TFD-EST-${year}-`;
  const used = new Set(records(documents).map(item => item.invoiceNumber || item.estimateNumber).filter(value => String(value).startsWith(prefix)));
  let sequence = 1;
  while (used.has(`${prefix}${String(sequence).padStart(3, '0')}`)) sequence += 1;
  return `${prefix}${String(sequence).padStart(3, '0')}`;
}

export function findDuplicateClients(lead = {}, clients = []) {
  const leadPhone = phoneKey(lead.phone);
  const leadEmail = clean(lead.email);
  const leadAddress = clean(lead.serviceAddress);
  return records(clients).filter(active).map(client => {
    const reasons = [];
    if (lead.clientId && lead.clientId === (client.clientId || client.id)) reasons.push('existing client link');
    if (leadPhone && phoneKey(client.phone) === leadPhone) reasons.push('phone');
    if (leadEmail && clean(client.email) === leadEmail) reasons.push('email');
    if (leadAddress && [client.address, client.serviceAddress, client.propertyAddress].some(value => clean(value) === leadAddress)) reasons.push('address');
    return reasons.length ? { client, reasons } : null;
  }).filter(Boolean);
}

function nextProjectCode(projects = [], date = localDate()) {
  const year = String(date).slice(0, 4);
  const used = new Set(records(projects).map(item => item.projectId).filter(Boolean));
  let sequence = 1;
  while (used.has(`TFD-${year}-${String(sequence).padStart(3, '0')}`)) sequence += 1;
  return `TFD-${year}-${String(sequence).padStart(3, '0')}`;
}

export function convertLeadToBusiness(data, leadId, options = {}) {
  const lead = records(data.leads).find(item => item.leadId === leadId);
  if (!lead) throw new Error('The lead could not be found.');
  const timestamp = now();
  let clients = records(data.clients);
  let projects = records(data.projects);
  let clientId = options.clientId || lead.clientId || '';
  let client = clients.find(item => (item.clientId || item.id) === clientId);

  if (options.createClient !== false && !client) {
    clientId = uid('client');
    client = {
      id: clientId, clientId, name: lead.fullName || lead.organizationName || 'New client', organizationName: lead.organizationName,
      phone: lead.phone, email: lead.email, address: lead.serviceAddress, billingAddress: lead.billingAddress,
      source: lead.leadSource, leadSource: lead.leadSource, referralSource: lead.referralSource,
      originalInquiryDate: lead.dateReceived, originalLeadId: lead.leadId, notes: lead.notes,
      communicationHistory: lead.lastContactDate ? [{ id: uid('communication'), date: lead.lastContactDate, method: lead.preferredContactMethod, note: 'Imported from lead history.' }] : [],
      createdAt: timestamp, updatedAt: timestamp, archived: false,
    };
    clients = [client, ...clients];
  }

  if (!client) throw new Error('Choose an existing client or create a new client before conversion.');

  clients = clients.map(item => (item.clientId || item.id) === clientId ? {
    ...item,
    leadSource: item.leadSource || lead.leadSource,
    referralSource: item.referralSource || lead.referralSource,
    originalInquiryDate: item.originalInquiryDate || lead.dateReceived,
    originalLeadId: item.originalLeadId || lead.leadId,
    updatedAt: timestamp,
  } : item);

  let projectId = lead.projectId || '';
  if (options.createProject) {
    projectId = nextProjectCode(projects, options.startDate || lead.consultationDate || localDate());
    projects = [{
      id: uid('project'), projectId, clientId, leadId: lead.leadId,
      name: options.projectName || lead.serviceRequested || `${lead.fullName || lead.organizationName} landscape project`,
      propertyAddress: lead.serviceAddress, startDate: options.startDate || '', targetCompletionDate: '',
      notes: lead.notes, status: 'Approved', healthStatus: 'On Track', budget: lead.estimatedJobValue || lead.estimatedBudget,
      profitPlan: { laborHours: '', laborRate: '', mileage: '', mileageRate: '', desiredMargin: '30' },
      createdAt: timestamp, updatedAt: timestamp, archived: false,
    }, ...projects];
  }

  const leads = records(data.leads).map(item => item.leadId === leadId ? {
    ...item, clientId, projectId, currentStage: 'Booked', bookedAt: item.bookedAt || timestamp,
    convertedAt: timestamp, updatedAt: timestamp,
  } : item);
  const link = item => item.leadId === leadId ? { ...item, clientId: item.clientId || clientId, projectId: item.projectId || projectId } : item;
  let calendarEvents = records(data.calendarEvents).map(link);
  if (options.createProject && options.startDate) calendarEvents = [...calendarEvents, createCalendarEvent({
    title: `Project start · ${options.projectName || lead.serviceRequested || lead.fullName}`,
    description: lead.serviceAddress,
    eventType: 'Project Start', group: 'tierra', date: options.startDate, endDate: options.startDate,
    startTime: '09:00', endTime: '10:00', leadId, clientId, projectId, relatedRecordId: projectId,
  })];
  return {
    ...data,
    clients,
    projects,
    leads,
    estimates: records(data.estimates).map(link),
    followUps: records(data.followUps).map(link),
    projectPhotos: records(data.projectPhotos).map(link),
    calendarEvents,
  };
}

export function scheduleLeadFollowUp(data, input = {}) {
  const lead = records(data.leads).find(item => item.leadId === input.leadId);
  const followUp = normalizeFollowUp({ ...input, followUpId: input.followUpId || uid('follow-up') });
  const startTime = input.startTime || '09:00';
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const endMinutes = ((startHour * 60) + startMinute + 30) % 1440;
  const defaultEndTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
  const calendarEvent = input.createCalendarEntry === false ? null : createCalendarEvent({
    title: `Follow up · ${lead?.fullName || input.contactName || 'Lead'}`,
    description: followUp.reason,
    eventType: 'Lead Follow-up', group: 'tierra', date: followUp.dueDate, endDate: followUp.dueDate,
    startTime, endTime: input.endTime || defaultEndTime, priority: lead?.priorityLevel || 'Medium',
    status: 'Scheduled', completed: false, clientId: followUp.clientId || lead?.clientId || '',
    projectId: followUp.projectId || lead?.projectId || '', ...leadFollowUpCalendarLink(followUp.leadId, followUp.followUpId),
  });
  const existingFollowUp = records(data.followUps).some(item => item.followUpId === followUp.followUpId);
  const existingCalendarEvent = records(data.calendarEvents).some(item => item.followUpId === followUp.followUpId);
  return repairLeadFollowUpCalendarLinks({
    ...data,
    followUps: existingFollowUp ? records(data.followUps).map(item => item.followUpId === followUp.followUpId ? followUp : item) : [followUp, ...records(data.followUps)],
    leads: records(data.leads).map(item => item.leadId === followUp.leadId ? { ...item, nextFollowUpDate: followUp.dueDate, updatedAt: now() } : item),
    calendarEvents: calendarEvent && !existingCalendarEvent ? [...records(data.calendarEvents), calendarEvent] : records(data.calendarEvents),
  });
}

export function completeLeadFollowUp(data, followUpId, note = '') {
  const completedAt = now();
  const source = records(data.followUps).find(item => item.followUpId === followUpId);
  return {
    ...data,
    followUps: records(data.followUps).map(item => item.followUpId === followUpId ? { ...item, completed: true, completedAt, notes: [item.notes, note].filter(Boolean).join('\n'), updatedAt: completedAt } : item),
    leads: records(data.leads).map(item => item.leadId === source?.leadId ? { ...item, lastContactDate: localDate(), nextFollowUpDate: '', notes: [item.notes, note].filter(Boolean).join('\n'), updatedAt: completedAt } : item),
    calendarEvents: records(data.calendarEvents).map(item => item.followUpId === followUpId ? { ...item, completed: true, status: 'Completed', updatedAt: completedAt } : item),
  };
}

export function calculateGrowthDashboard(data, referenceDate = localDate()) {
  const leads = records(data.leads).filter(active);
  const followUps = records(data.followUps).filter(active);
  const estimates = records(data.estimates).filter(active);
  const transactions = records(data.businessTransactions).filter(active);
  const month = String(referenceDate).slice(0, 7);
  const openStages = new Set(LEAD_STAGES.filter(stage => !['Completed', 'Lost'].includes(stage)));
  const openLeads = leads.filter(item => openStages.has(item.currentStage));
  const pendingStatuses = new Set(['Draft', 'Ready to Send', 'Sent', 'Viewed', 'Approved']);
  const dueToday = followUps.filter(item => !item.completed && item.dueDate === referenceDate);
  const overdue = followUps.filter(item => !item.completed && item.dueDate && item.dueDate < referenceDate);
  const consultations = leads.filter(item => item.consultationDate && item.consultationDate >= referenceDate && item.currentStage !== 'Lost');
  const pendingEstimates = estimates.filter(item => item.documentType !== 'Invoice' && pendingStatuses.has(item.status));
  const booked = leads.filter(item => item.currentStage === 'Booked');
  const bookedThisMonth = booked.filter(item => String(item.bookedAt || item.updatedAt || '').slice(0, 7) === month);
  const won = leads.filter(item => ['Booked', 'Completed'].includes(item.currentStage)).length;
  const decided = won + leads.filter(item => item.currentStage === 'Lost').length;
  const invoices = estimates.filter(item => item.documentType === 'Invoice' && item.status !== 'Cancelled');
  const paidByInvoice = invoice => transactions.filter(item => item.invoiceId === (invoice.invoiceId || invoice.id) && ['Client Payment', 'Deposit', 'Revenue'].includes(item.type) && item.status !== 'Unpaid').reduce((sum, item) => sum + number(item.amount), 0);
  const outstandingInvoices = invoices.reduce((sum, item) => sum + Math.max(0, number(item.total) - Math.max(number(item.paymentsReceived), paidByInvoice(item))), 0);
  const priorities = [
    ...overdue.map(item => ({ id: item.followUpId, type: 'Overdue follow-up', date: item.dueDate, title: item.reason, leadId: item.leadId, tone: 'urgent' })),
    ...dueToday.map(item => ({ id: item.followUpId, type: 'Follow-up due', date: item.dueDate, title: item.reason, leadId: item.leadId, tone: 'today' })),
    ...consultations.filter(item => item.consultationDate === referenceDate).map(item => ({ id: item.leadId, type: 'Consultation', date: item.consultationDate, title: item.fullName, leadId: item.leadId })),
    ...pendingEstimates.map(item => ({ id: item.estimateId || item.id, type: 'Estimate action', date: item.expirationDate || item.creationDate || item.date, title: item.title, estimateId: item.estimateId || item.id })),
    ...invoices.filter(item => item.status !== 'Paid').map(item => ({ id: item.invoiceId || item.id, type: item.status === 'Deposit Due' ? 'Deposit due' : 'Unpaid invoice', date: item.dueDate || item.creationDate || item.date, title: item.title, invoiceId: item.invoiceId || item.id })),
    ...records(data.projects).filter(item => active(item) && item.startDate && item.startDate >= referenceDate).slice(0, 5).map(item => ({ id: item.projectId, type: 'Upcoming job start', date: item.startDate, title: item.name, projectId: item.projectId })),
  ].sort((left, right) => String(left.date || '9999').localeCompare(String(right.date || '9999')));
  return {
    newLeads: leads.filter(item => item.currentStage === 'New Lead').length,
    followUpsDueToday: dueToday.length,
    overdueFollowUps: overdue.length,
    consultationsScheduled: consultations.length,
    estimatesPending: pendingEstimates.length,
    jobsBookedThisMonth: bookedThisMonth.length,
    totalPipelineValue: openLeads.reduce((sum, item) => sum + number(item.estimatedJobValue || item.estimatedBudget), 0),
    expectedBookedRevenue: booked.reduce((sum, item) => sum + number(item.estimatedJobValue || item.estimatedBudget), 0),
    conversionRate: decided ? won / decided * 100 : 0,
    outstandingInvoices,
    priorities,
  };
}

export function calculateReferralSummary(referrals = []) {
  const activeReferrals = records(referrals).filter(active);
  const booked = activeReferrals.filter(item => ['Booked', 'Won', 'Completed'].includes(item.outcome));
  const byReferrer = new Map();
  activeReferrals.forEach(item => byReferrer.set(item.referrer || 'Unknown', (byReferrer.get(item.referrer || 'Unknown') || 0) + 1));
  return {
    total: activeReferrals.length,
    booked: booked.length,
    revenue: activeReferrals.reduce((sum, item) => sum + number(item.revenueGenerated), 0),
    unfulfilledRewards: activeReferrals.filter(item => item.rewardPromised && !item.rewardDelivered).length,
    topSources: [...byReferrer.entries()].sort((left, right) => right[1] - left[1]).slice(0, 5),
  };
}

export function businessAssistantResults(data, question = '') {
  const dashboard = calculateGrowthDashboard(data);
  const needle = clean(question);
  if (needle.includes('follow')) return dashboard.priorities.filter(item => item.type.toLowerCase().includes('follow'));
  if (needle.includes('estimate')) return records(data.estimates).filter(item => item.documentType !== 'Invoice' && ['Draft', 'Ready to Send', 'Sent', 'Viewed', 'Approved'].includes(item.status)).map(item => ({ id: item.id, type: 'Pending estimate', title: item.title, estimateId: item.estimateId || item.id, date: item.expirationDate || item.date }));
  if (needle.includes('least profitable') || needle.includes('profit')) {
    const projects = records(data.projects).filter(active).map(project => {
      const revenue = records(data.businessTransactions).filter(item => item.projectId === project.projectId && ['Revenue', 'Client Payment', 'Deposit'].includes(item.type) && item.status !== 'Unpaid' && active(item)).reduce((sum, item) => sum + number(item.amount), 0);
      const expenses = records(data.businessTransactions).filter(item => item.projectId === project.projectId && ['Expense', 'Mileage'].includes(item.type) && item.status !== 'Unpaid' && active(item)).reduce((sum, item) => sum + number(item.amount), 0) + records(data.expenses).filter(item => item.projectId === project.projectId && active(item)).reduce((sum, item) => sum + number(item.amount), 0);
      return { id: project.projectId, type: 'Actual project profit', title: project.name, projectId: project.projectId, value: revenue - expenses };
    }).sort((left, right) => left.value - right.value);
    return projects.slice(0, 5);
  }
  if (needle.includes('booked') || needle.includes('job')) { const month = localDate().slice(0, 7); return records(data.leads).filter(item => item.currentStage === 'Booked' && String(item.bookedAt || item.updatedAt).slice(0, 7) === month).map(item => ({ id: item.leadId, type: 'Booked lead', title: item.fullName, leadId: item.leadId, date: item.bookedAt })); }
  if (needle.includes('unpaid') || needle.includes('balance')) return records(data.estimates).filter(item => item.documentType === 'Invoice' && item.status !== 'Paid' && item.status !== 'Cancelled').map(item => ({ id: item.id, type: 'Open invoice', title: item.title, invoiceId: item.invoiceId || item.id, value: Math.max(0, number(item.total) - number(item.paymentsReceived)), date: item.dueDate }));
  if (needle.includes('pickup')) return records(data.sourcingRecords).filter(item => !item.archived && !['Picked up', 'Delivered'].includes(item.pickupStatus || item.status)).map(item => ({ id: item.id, type: 'Nursery pickup', title: item.plant || item.plantName || item.nursery || 'Sourcing item', projectId: item.projectId, date: item.availabilityDate }));
  if (needle.includes('referral') || needle.includes('reward')) return records(data.referrals).filter(item => item.rewardPromised && !item.rewardDelivered && !item.archived).map(item => ({ id: item.referralId, type: 'Referral reward', title: item.referrer, date: item.referralDate }));
  if (needle.includes('appointment') || needle.includes('week')) {
    const today = localDate();
    const weekEnd = new Date(`${today}T12:00:00`); weekEnd.setDate(weekEnd.getDate() + 7);
    const end = localDate(weekEnd);
    return records(data.calendarEvents).filter(item => !item.archived && item.date >= today && item.date <= end).map(item => ({ id: item.calendarEventId, type: 'Calendar', title: item.title, calendarEventId: item.calendarEventId, projectId: item.projectId, date: item.date }));
  }
  if (needle.includes('pipeline')) return [{ id: 'pipeline-total', type: 'Open pipeline', title: `${records(data.leads).filter(item => active(item) && !['Lost', 'Completed'].includes(item.currentStage)).length} active opportunities`, value: dashboard.totalPipelineValue }];
  return dashboard.priorities.slice(0, 12);
}

export function createOpportunity(input = {}) { return normalizeOpportunity({ ...input, opportunityId: input.opportunityId || uid('opportunity') }); }
export function createMarketingTemplate(input = {}) { return normalizeMarketingTemplate({ ...input, templateId: input.templateId || uid('marketing') }); }
export function createCampaign(input = {}) { return normalizeCampaign({ ...input, campaignId: input.campaignId || uid('campaign') }); }
export function createReferral(input = {}) { return normalizeReferral({ ...input, referralId: input.referralId || uid('referral') }); }
export function createPortfolioEntry(input = {}) { return normalizePortfolioEntry({ ...input, portfolioEntryId: input.portfolioEntryId || uid('portfolio') }); }
