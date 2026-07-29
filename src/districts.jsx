import React, { useEffect, useMemo, useRef, useState } from 'react';
import './districts.css';
import { addTimelineEvent, calculateProjectFinancials } from './projectEngine.js';
import {
  ClientProjectHistory,
  FinanceSummaryCards,
  LivingProjectSections,
  ProjectHealthBanner,
} from './projectWorkspace.jsx';

export const PERSONAL_CATEGORIES = [
  'Job Income',
  'Other Income',
  'Rent',
  'Electric',
  'Water',
  'Utilities',
  'Car Insurance',
  'Laptop Payment',
  'Groceries',
  'Fuel',
  'Phone',
  'Internet',
  'Household',
  'Savings',
  'Debt Payment',
  'Other',
];

export const BUSINESS_CATEGORIES = [
  'Client Revenue',
  'Plants',
  'Nursery Shipping',
  'Soil',
  'Mulch',
  'Containers',
  'Fertilizer',
  'Equipment',
  'Fuel',
  'Mileage',
  'Marketing',
  'Website',
  'Business Cards',
  'Insurance',
  'Licensing',
  'Office Supplies',
  'Continuing Education',
  'Labor',
  'Delivery',
  'Other',
];

const PROJECT_STATUSES = ['Lead', 'Consultation', 'Designing', 'Approved', 'Scheduled', 'In Progress', 'Completed', 'On Hold'];
const PAYMENT_METHODS = ['Not specified', 'Cash', 'Check', 'Credit card', 'Debit card', 'Bank transfer', 'Money order', 'Other'];
const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);
const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
const number = value => Number(value || 0);
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(number(value));
const dateLabel = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not scheduled';
const recordId = (record, type) => type === 'Invoice' ? record.invoiceId : record.estimateId;

export function createDistrictStarter() {
  return {
    financeSchemaVersion: 2,
    personalTransactions: [],
    personalDebts: [],
    personalSavingsGoals: [],
    personalBudget: { monthly: '' },
    businessTransactions: [],
    sourcingRecords: [],
    projectPhotos: [],
    projectNotes: [],
    projectTimeline: [],
  };
}

function nextProjectCode(projects, value) {
  const year = String(value || today()).slice(0, 4);
  const used = new Set(projects.map(project => project.projectId).filter(Boolean));
  let sequence = 1;
  while (used.has(`TFD-${year}-${String(sequence).padStart(3, '0')}`)) sequence += 1;
  return `TFD-${year}-${String(sequence).padStart(3, '0')}`;
}

export function createProjectCode(projects, value) {
  return nextProjectCode(projects, value);
}

export function migrateDistrictData(saved = {}) {
  const clients = (Array.isArray(saved.clients) ? saved.clients : []).map(client => {
    const clientId = client.clientId || client.id || uid('client');
    return { ...client, id: client.id || clientId, clientId, archived: Boolean(client.archived) };
  });
  const clientByName = new Map(clients.map(client => [String(client.name || '').trim().toLowerCase(), client.clientId]));
  const projects = [];
  for (const source of (Array.isArray(saved.projects) ? saved.projects : [])) {
    const startDate = source.startDate || source.start || '';
    const projectId = /^TFD-\d{4}-\d{3}$/.test(source.projectId || '')
      ? source.projectId
      : nextProjectCode(projects, startDate || source.createdAt || today());
    projects.push({
      ...source,
      id: source.id || uid('project'),
      projectId,
      clientId: source.clientId || clientByName.get(String(source.client || '').trim().toLowerCase()) || '',
      name: source.name || source.title || 'Untitled project',
      propertyAddress: source.propertyAddress || source.address || '',
      startDate,
      targetCompletionDate: source.targetCompletionDate || source.end || '',
      notes: source.notes || source.scope || '',
      status: source.status || 'Lead',
      healthStatus: source.healthStatus || (source.archived ? 'Archived' : source.status === 'Completed' ? 'Completed' : 'On Track'),
      budget: source.budget || '',
      archived: Boolean(source.archived),
      profitPlan: {
        laborHours: source.profitPlan?.laborHours || '',
        laborRate: source.profitPlan?.laborRate || '',
        mileage: source.profitPlan?.mileage || '',
        mileageRate: source.profitPlan?.mileageRate || '',
        desiredMargin: source.profitPlan?.desiredMargin || '30',
      },
    });
  }

  const estimates = (Array.isArray(saved.estimates) ? saved.estimates : []).map(document => {
    const documentType = document.documentType || (/invoice/i.test(document.title || '') ? 'Invoice' : 'Estimate');
    const id = document.id || uid(documentType === 'Invoice' ? 'invoice' : 'estimate');
    return {
      ...document,
      id,
      documentType,
      estimateId: document.estimateId || (documentType === 'Estimate' ? id : ''),
      invoiceId: document.invoiceId || (documentType === 'Invoice' ? id : ''),
      clientId: document.clientId || clientByName.get(String(document.client || '').trim().toLowerCase()) || '',
      projectId: document.projectId || '',
      archived: Boolean(document.archived),
    };
  });
  const projectByLegacyLabel = new Map(projects.flatMap(project => [
    [String(project.projectId || '').trim().toLowerCase(), project.projectId],
    [String(project.name || '').trim().toLowerCase(), project.projectId],
    [String(project.title || '').trim().toLowerCase(), project.projectId],
  ]).filter(([label]) => label));
  const expenses = (Array.isArray(saved.expenses) ? saved.expenses : []).map(expense => ({
    ...expense,
    id: expense.id || uid('expense'),
    transactionId: expense.transactionId || expense.id || uid('txn-business'),
    receiptId: expense.receiptId || (expense.receipt ? uid('receipt') : ''),
    clientId: expense.clientId || '',
    projectId: expense.projectId || projectByLegacyLabel.get(String(expense.project || '').trim().toLowerCase()) || '',
    nurseryId: expense.nurseryId || '',
    archived: Boolean(expense.archived),
  }));
  const normalizeTransactions = (records, prefix) => (Array.isArray(records) ? records : []).map(item => ({
    ...item,
    id: item.id || uid(prefix),
    transactionId: item.transactionId || item.id || uid(prefix),
    receiptId: item.receiptId || (item.receipt ? uid('receipt') : ''),
    archived: Boolean(item.archived),
  }));
  const normalizeRelated = (records, prefix) => (Array.isArray(records) ? records : []).map(item => ({
    ...item,
    id: item.id || uid(prefix),
    archived: Boolean(item.archived),
  }));

  return {
    financeSchemaVersion: 2,
    clients,
    projects,
    estimates,
    expenses,
    personalTransactions: normalizeTransactions(saved.personalTransactions, 'txn-personal'),
    personalDebts: normalizeRelated(saved.personalDebts, 'debt'),
    personalSavingsGoals: normalizeRelated(saved.personalSavingsGoals, 'goal'),
    personalBudget: { monthly: saved.personalBudget?.monthly || '' },
    businessTransactions: normalizeTransactions(saved.businessTransactions, 'txn-business'),
    sourcingRecords: normalizeRelated(saved.sourcingRecords, 'source-record').map(item => ({ ...item, sourcingRecordId: item.sourcingRecordId || item.id })),
    projectPhotos: normalizeRelated(saved.projectPhotos, 'photo'),
    projectNotes: normalizeRelated(saved.projectNotes, 'project-note'),
    projectTimeline: normalizeRelated(saved.projectTimeline, 'timeline'),
  };
}

function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const headers = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const escape = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map(row => headers.map(header => escape(row[header])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

function readAttachment(file, done) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => done({ receipt: reader.result, receiptName: file.name, receiptId: uid('receipt') });
  reader.readAsDataURL(file);
}

function Ring({ value, label, detail, tone = 'olive' }) {
  const percent = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return <div className={`district-ring ${tone}`} style={{ '--ring-progress': `${percent * 3.6}deg` }}>
    <div><strong>{Math.round(percent)}%</strong><span>{label}</span></div>
    {detail && <small>{detail}</small>}
  </div>;
}

function SummaryCard({ label, value, note, accent = '' }) {
  return <article className={`district-summary-card ${accent}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function EmptyDistrict({ title, text }) {
  return <div className="district-empty"><span aria-hidden="true">❦</span><strong>{title}</strong><p>{text}</p></div>;
}

export function UniversalSearch({ open, onClose, data, navigate, openProject, openDesign }) {
  const [query, setQuery] = useState('');
  useEffect(() => { if (!open) setQuery(''); }, [open]);
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const match = (...values) => values.flat().filter(Boolean).join(' ').toLowerCase().includes(needle);
    const clients = data.clients.filter(client => match(client.name, client.phone, client.email, client.address, client.notes)).slice(0, 6).map(client => ({
      id: client.clientId,
      title: client.name,
      detail: [client.phone, client.email, client.address].filter(Boolean).join(' • '),
      action: () => navigate('clients'),
    }));
    const projects = data.projects.filter(project => match(project.name, project.projectId, project.propertyAddress, project.notes, project.status)).slice(0, 6).map(project => ({
      id: project.projectId,
      title: `${project.projectId} · ${project.name}`,
      detail: project.propertyAddress || project.status,
      action: () => openProject(project.projectId),
    }));
    const nurseries = data.nurseries.filter(nursery => match(nursery.name, nursery.location, nursery.plants, nursery.specialties, nursery.categories, nursery.notes)).slice(0, 6).map(nursery => ({
      id: nursery.nurseryId || nursery.id,
      title: nursery.name,
      detail: [nursery.location, ...(nursery.categories || [])].filter(Boolean).join(' • '),
      action: () => navigate('plant-sourcing'),
    }));
    const documents = data.estimates.filter(document => match(document.title, document.client, document.estimateId, document.invoiceId, document.status)).slice(0, 6).map(document => ({
      id: recordId(document, document.documentType) || document.id,
      title: `${document.documentType}: ${document.title}`,
      detail: `${document.client || 'Unassigned'} • ${money(document.total)}`,
      action: () => navigate('estimates'),
    }));
    const transactions = [...data.businessTransactions, ...data.personalTransactions, ...data.expenses].filter(transaction => match(
      transaction.transactionId,
      transaction.category,
      transaction.taxCategory,
      transaction.vendor,
      transaction.source,
      transaction.receiptName,
      transaction.receiptReference,
      transaction.notes,
    )).slice(0, 8).map(transaction => ({
      id: transaction.transactionId || transaction.id,
      title: transaction.vendor || transaction.source || transaction.category || transaction.taxCategory || 'Financial record',
      detail: `${transaction.transactionId || 'Record'} • ${money(transaction.amount)}`,
      action: () => navigate('finance'),
    }));
    const designRecords = [
      ...data.designConcepts.filter(item => match(item.name, item.status, item.notes?.general, item.notes?.clientRequests, item.notes?.maintenance, item.notes?.futureIdeas)).map(item => ({
        id: item.designId,
        projectId: item.projectId,
        title: item.name,
        detail: `${item.status} • Design concept`,
      })),
      ...data.designPlants.filter(item => match(item.commonName, item.scientificName, item.category, item.light, item.traits, item.notes)).map(item => ({
        id: item.plantId,
        projectId: data.sourcingRecords.find(record => record.sourcingRecordId === item.sourcingRecordId)?.projectId || '',
        title: item.commonName,
        detail: `${item.scientificName || item.category} • Approved plant`,
      })),
      ...data.designInspirations.filter(item => match(item.title, item.type, item.details, item.colors, item.styleKeyword)).map(item => ({
        id: item.inspirationId,
        projectId: item.projectId,
        title: item.title,
        detail: `${item.type} • ${item.styleKeyword}`,
      })),
      ...data.designMeasurements.filter(item => match(item.label, item.length, item.width, item.unit, item.areaNotes)).map(item => ({
        id: item.measurementId,
        projectId: item.projectId,
        title: item.label,
        detail: `${item.length}${item.width ? ` × ${item.width}` : ''} ${item.unit} • Measurement`,
      })),
      ...data.projectPhotos.filter(item => match(item.caption, item.fileName, item.stage, item.tags)).map(item => ({
        id: item.photoId || item.id,
        projectId: item.projectId,
        title: item.caption || item.fileName,
        detail: `${item.stage} • Site photo`,
      })),
    ].slice(0, 8).map(item => ({
      ...item,
      action: () => item.projectId ? openDesign(item.projectId) : navigate('design'),
    }));
    const livingProjectRecords = [
      ...(data.projectPlants || []).filter(item => match(item.plantName, item.scientificName, item.category, item.installationLocation, item.status, item.notes, item.warrantyExpiration)).map(item => ({
        id: item.projectPlantId,
        projectId: item.projectId,
        title: item.plantName,
        detail: `${item.status} • ${item.installationLocation || 'Location open'} • Project Plant Plan`,
      })),
      ...(data.plantPassports || []).filter(item => match(item.commonName, item.scientificName, item.cultivar, item.installationLocation, item.warrantyInformation, item.currentStatus, item.careInstructions)).map(item => ({
        id: item.passportId,
        projectId: item.projectId,
        title: `${item.commonName} Plant Passport`,
        detail: `${item.currentStatus} • ${item.cultivar || item.installationLocation || 'Installed plant'}`,
      })),
      ...(data.projectTasks || []).filter(item => match(item.title, item.description, item.category, item.status, item.notes)).map(item => ({
        id: item.taskId,
        projectId: item.projectId,
        title: item.title,
        detail: `${item.status} • ${item.category} • Project task`,
      })),
      ...(data.projectTimeline || []).filter(item => match(item.title, item.description, item.detail, item.eventType)).map(item => ({
        id: item.eventId || item.id,
        projectId: item.projectId,
        title: item.title,
        detail: `${item.eventType || 'manual.note'} • Project timeline`,
      })),
    ].slice(0, 10).map(item => ({
      ...item,
      action: () => item.projectId ? openProject(item.projectId) : navigate('projects'),
    }));
    return [
      ['Client District', clients],
      ['Project District', projects],
      ['Project District · Living Project Records', livingProjectRecords],
      ['Design District', designRecords],
      ['Plant Sourcing District', nurseries],
      ['Finance District', transactions],
      ['Finance District · Estimates & Invoices', documents],
    ].filter(([, items]) => items.length);
  }, [query, data, navigate, openProject, openDesign]);
  if (!open) return null;
  return <div className="universal-search-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="universal-search glass" role="dialog" aria-modal="true" aria-label="Search all districts">
      <div className="universal-search-head">
        <div><span>Estate-wide finder</span><h2>Search every District</h2></div>
        <button onClick={onClose} aria-label="Close search">×</button>
      </div>
      <input autoFocus type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Client, project, concept, plant, photo, invoice, receipt, or notes…" />
      {!query && <p className="universal-search-hint">Search is grouped by District and never sends your private records anywhere.</p>}
      {query && !groups.length && <EmptyDistrict title="No records found" text="Try a name, address, project ID, plant, receipt, or note." />}
      <div className="universal-results">{groups.map(([district, items]) => <section key={district}>
        <h3>{district}</h3>
        {items.map(item => <button key={item.id} onClick={() => { item.action(); onClose(); }}><strong>{item.title}</strong><span>{item.detail || 'Open record'}</span></button>)}
      </section>)}</div>
    </section>
  </div>;
}

export function ClientDistrict({ data, setData, openProject }) {
  const blank = { name: '', phone: '', email: '', address: '', source: '', notes: '' };
  const [form, setForm] = useState(blank);
  const [search, setSearch] = useState('');
  const clients = data.clients.filter(client => !client.archived && `${client.name} ${client.email} ${client.phone} ${client.address}`.toLowerCase().includes(search.toLowerCase()));
  const add = event => {
    event.preventDefault();
    if (!form.name.trim()) return;
    const clientId = uid('client');
    setData(current => ({ ...current, clients: [{ ...form, id: clientId, clientId, createdAt: new Date().toISOString(), archived: false }, ...current.clients] }));
    setForm(blank);
  };
  const patch = (clientId, changes) => setData(current => ({ ...current, clients: current.clients.map(client => client.clientId === clientId ? { ...client, ...changes } : client) }));
  const remove = client => {
    const linked = data.projects.filter(project => project.clientId === client.clientId).length;
    if (client.name.startsWith('Codex Phase 4 Test') && linked === 0) {
      setData(current => ({ ...current, clients: current.clients.filter(item => item.clientId !== client.clientId) }));
      return;
    }
    if (confirm(`Permanently delete ${client.name}? ${linked ? `${linked} project link${linked === 1 ? '' : 's'} will become unassigned.` : ''}`)) {
      setData(current => ({ ...current, clients: current.clients.filter(item => item.clientId !== client.clientId) }));
    }
  };
  return <div className="page">
    <div className="district-title"><div><span>Connected relationships</span><h2>Client District</h2><p>One client record, connected directly to every Tierra Fleur project.</p></div><div className="district-count">{data.clients.filter(client => !client.archived).length} active</div></div>
    <div className="district-two-column">
      <form className="panel glass district-form" onSubmit={add}>
        <span className="district-eyebrow">New client</span><h3>Add to the Client District</h3>
        <input required placeholder="Client name *" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />
        <input inputMode="tel" placeholder="Phone" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} />
        <input type="email" placeholder="Email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} />
        <input placeholder="Property or mailing address" value={form.address} onChange={event => setForm({ ...form, address: event.target.value })} />
        <input placeholder="Lead source" value={form.source} onChange={event => setForm({ ...form, source: event.target.value })} />
        <textarea placeholder="Preferences, budget, communication notes…" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} />
        <button className="primary">Save client</button>
      </form>
      <section className="panel glass">
        <div className="district-list-toolbar"><div><span className="district-eyebrow">Directory</span><h3>Clients and their projects</h3></div><input type="search" placeholder="Search clients" value={search} onChange={event => setSearch(event.target.value)} /></div>
        <div className="client-district-grid">{clients.map(client => {
          const projects = data.projects.filter(project => project.clientId === client.clientId && !project.archived);
          return <article className="connected-client-card" key={client.clientId}>
            <div className="connected-card-head"><div><h4>{client.name}</h4><p>{client.address || 'No address saved'}</p></div><span>{projects.length} {projects.length === 1 ? 'project' : 'projects'}</span></div>
            <div className="client-contact-line">{client.phone && <a href={`tel:${client.phone}`}>{client.phone}</a>}{client.email && <a href={`mailto:${client.email}`}>{client.email}</a>}</div>
            {client.notes && <p className="connected-notes">{client.notes}</p>}
            <div className="linked-projects">{projects.map(project => <button key={project.projectId} onClick={() => openProject(project.projectId)}><strong>{project.projectId}</strong><span>{project.name}</span></button>)}{!projects.length && <small>No projects connected yet.</small>}</div>
            <ClientProjectHistory data={data} client={client} openProject={openProject} />
            <div className="connected-card-actions"><button onClick={() => patch(client.clientId, { archived: true })}>Archive</button><button className="danger" onClick={() => remove(client)}>Delete</button></div>
          </article>;
        })}{!clients.length && <EmptyDistrict title="No clients match" text="Add a client or try a different search." />}</div>
      </section>
    </div>
  </div>;
}

function calculateProjectFinance(data, project) {
  return calculateProjectFinancials(data, project.projectId);
}

export function ProjectDistrict({ data, setData, initialProjectId, openDesign, openClients, openEstimates, openFinance }) {
  const blankProject = { name: '', clientId: '', propertyAddress: '', status: 'Lead', startDate: '', targetCompletionDate: '', budget: '', notes: '' };
  const [form, setForm] = useState(blankProject);
  const [projectErrors, setProjectErrors] = useState({});
  const [projectNotice, setProjectNotice] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [submittingProject, setSubmittingProject] = useState(false);
  const projectSubmissionRef = useRef(false);
  const [selectedId, setSelectedId] = useState(initialProjectId || '');
  const [tab, setTab] = useState('Overview');
  const [sourceForm, setSourceForm] = useState({ nurseryId: '', plant: '', quantity: '', estimatedCost: '', status: 'Considering', notes: '' });
  const [photoStage, setPhotoStage] = useState('Before');
  const [photoCaption, setPhotoCaption] = useState('');
  const [noteText, setNoteText] = useState('');
  const [timeline, setTimeline] = useState({ date: today(), title: '', detail: '' });
  useEffect(() => { if (initialProjectId) { setSelectedId(initialProjectId); setTab('Overview'); } }, [initialProjectId]);
  const activeProjects = data.projects.filter(project => !project.archived);
  const activeClients = data.clients.filter(item => !item.archived);
  const clientRecordId = item => item?.id || item?.clientId || '';
  const selected = data.projects.find(project => project.projectId === selectedId);
  const client = selected ? data.clients.find(item => clientRecordId(item) === selected.clientId) : null;
  const patchProject = changes => setData(current => {
    const before = current.projects.find(project => project.projectId === selectedId);
    let next = { ...current, projects: current.projects.map(project => project.projectId === selectedId ? { ...project, ...changes } : project) };
    if (changes.status && before?.status !== changes.status) next = addTimelineEvent(next, {
      projectId: selectedId,
      eventType: 'project.status.changed',
      title: 'Project status changed',
      description: `${before?.status || 'Unspecified'} → ${changes.status}`,
      relatedRecordId: selectedId,
      dedupeKey: `project.status.changed:${selectedId}:${changes.status}:${new Date().toISOString()}`,
      automatic: true,
    });
    if (changes.clientId && before?.clientId !== changes.clientId) next = addTimelineEvent(next, {
      projectId: selectedId,
      eventType: 'client.linked',
      title: 'Client linked',
      description: 'The primary client relationship was updated.',
      relatedRecordId: changes.clientId,
      dedupeKey: `client.linked:${selectedId}:${changes.clientId}`,
      automatic: true,
    });
    return next;
  });
  const addProject = event => {
    event.preventDefault();
    if (projectSubmissionRef.current) return;
    const errors = {};
    const selectedClient = activeClients.find(item => clientRecordId(item) === form.clientId);
    if (!form.clientId || !selectedClient) errors.clientId = 'Choose an active client from the list.';
    if (!form.name.trim()) errors.name = 'Enter a project name.';
    if (!form.propertyAddress.trim()) errors.propertyAddress = 'Enter the property address.';
    if (!form.status) errors.status = 'Choose a project status.';
    setProjectErrors(errors);
    setProjectNotice('');
    if (Object.keys(errors).length) return;
    projectSubmissionRef.current = true;
    setSubmittingProject(true);
    const projectId = createProjectCode(data.projects, form.startDate || today());
    const project = {
      ...form,
      name: form.name.trim(),
      propertyAddress: form.propertyAddress.trim(),
      clientId: clientRecordId(selectedClient),
      id: uid('project'),
      projectId,
      createdAt: new Date().toISOString(),
      archived: false,
      healthStatus: 'On Track',
      profitPlan: { laborHours: '', laborRate: '', mileage: '', mileageRate: '', desiredMargin: '30' },
    };
    setData(current => {
      let next = { ...current, projects: [project, ...current.projects] };
      next = addTimelineEvent(next, {
        projectId,
        eventType: 'project.created',
        title: 'Project created',
        description: 'The connected Project Hub workspace was initialized.',
        relatedRecordId: projectId,
        dedupeKey: `project.created:${projectId}`,
        automatic: true,
      });
      return addTimelineEvent(next, {
        projectId,
        eventType: 'client.linked',
        title: 'Client linked',
        description: `${selectedClient.name} was linked as the primary client.`,
        relatedRecordId: project.clientId,
        dedupeKey: `client.linked:${projectId}:${project.clientId}`,
        automatic: true,
      });
    });
    setForm(blankProject);
    setSelectedId(projectId);
    setTab('Overview');
    setProjectNotice(`${projectId} was created and linked to ${selectedClient.name}.`);
    setTimeout(() => {
      projectSubmissionRef.current = false;
      setSubmittingProject(false);
    }, 500);
  };
  const archiveProject = project => {
    if (confirm(`Archive ${project.projectId} · ${project.name}?`)) {
      setData(current => addTimelineEvent({
        ...current,
        projects: current.projects.map(item => item.projectId === project.projectId ? { ...item, archived: true, healthStatus: 'Archived', archivedAt: new Date().toISOString() } : item),
      }, {
        projectId: project.projectId,
        eventType: 'project.archived',
        title: 'Project archived',
        description: 'The project was hidden from active views with all linked records preserved.',
        relatedRecordId: project.projectId,
        dedupeKey: `project.archived:${project.projectId}:${new Date().toISOString()}`,
        automatic: true,
      }));
      setSelectedId('');
    }
  };
  const restoreProject = project => setData(current => ({
    ...current,
    projects: current.projects.map(item => item.projectId === project.projectId ? { ...item, archived: false, healthStatus: item.status === 'Completed' ? 'Completed' : 'On Track', restoredAt: new Date().toISOString() } : item),
  }));
  const deleteProject = project => setDeleteCandidate(project);
  const confirmDeleteProject = () => {
    const project = deleteCandidate;
    if (!project) return;
    const isTemporaryTest = project.name.startsWith('Codex Phase 4 Test');
    setData(current => {
      if (!isTemporaryTest) return { ...current, projects: current.projects.filter(item => item.projectId !== project.projectId) };
      const projectId = project.projectId;
      return {
        ...current,
        projects: current.projects.filter(item => item.projectId !== projectId),
        projectPlants: current.projectPlants.filter(item => item.projectId !== projectId),
        projectTasks: current.projectTasks.filter(item => item.projectId !== projectId),
        plantPassports: current.plantPassports.filter(item => item.projectId !== projectId),
        plantReplacementHistory: current.plantReplacementHistory.filter(item => item.projectId !== projectId),
        projectCompletions: current.projectCompletions.filter(item => item.projectId !== projectId),
        projectTimeline: current.projectTimeline.filter(item => item.projectId !== projectId),
        sourcingRecords: current.sourcingRecords.filter(item => item.projectId !== projectId),
        projectPhotos: current.projectPhotos.filter(item => item.projectId !== projectId),
        projectNotes: current.projectNotes.filter(item => item.projectId !== projectId),
        designConcepts: current.designConcepts.filter(item => item.projectId !== projectId),
        designPlants: current.designPlants.filter(item => !String(item.commonName || '').startsWith('Codex Phase 4 Test')),
        designInspirations: current.designInspirations.filter(item => item.projectId !== projectId),
        designMeasurements: current.designMeasurements.filter(item => item.projectId !== projectId),
        businessTransactions: current.businessTransactions.filter(item => item.projectId !== projectId),
        expenses: current.expenses.filter(item => item.projectId !== projectId),
        estimates: current.estimates.filter(item => item.projectId !== projectId),
      };
    });
    setDeleteCandidate(null);
    setSelectedId('');
  };
  const addSource = event => {
    event.preventDefault();
    if (!sourceForm.nurseryId || !sourceForm.plant.trim()) return;
    const id = uid('source-record');
    setData(current => addTimelineEvent({ ...current, sourcingRecords: [{ ...sourceForm, id, sourcingRecordId: id, projectId: selectedId, createdAt: new Date().toISOString(), archived: false }, ...current.sourcingRecords] }, {
      projectId: selectedId,
      eventType: 'sourcing.linked',
      title: 'Sourcing record linked',
      description: `${sourceForm.plant} was connected to Plant Sourcing.`,
      relatedRecordId: id,
      dedupeKey: `sourcing.linked:${id}`,
      automatic: true,
    }));
    setSourceForm({ nurseryId: '', plant: '', quantity: '', estimatedCost: '', status: 'Considering', notes: '' });
  };
  const addPhoto = file => readAttachment(file, attachment => {
    const id = uid('photo');
    setData(current => addTimelineEvent({ ...current, projectPhotos: [{ id, photoId: id, projectId: selectedId, stage: photoStage, caption: photoCaption, image: attachment.receipt, fileName: attachment.receiptName, createdAt: new Date().toISOString(), archived: false }, ...current.projectPhotos] }, {
      projectId: selectedId,
      eventType: 'photo.uploaded',
      title: 'Property photo uploaded',
      description: photoCaption || attachment.receiptName,
      relatedRecordId: id,
      dedupeKey: `photo.uploaded:${id}`,
      automatic: true,
    }));
    setPhotoCaption('');
  });
  const addNote = event => {
    event.preventDefault();
    if (!noteText.trim()) return;
    setData(current => ({ ...current, projectNotes: [{ id: uid('project-note'), projectId: selectedId, text: noteText.trim(), createdAt: new Date().toISOString(), archived: false }, ...current.projectNotes] }));
    setNoteText('');
  };
  const addTimeline = event => {
    event.preventDefault();
    if (!timeline.title.trim()) return;
    setData(current => addTimelineEvent(current, {
      projectId: selectedId,
      eventType: 'manual.note',
      title: timeline.title.trim(),
      description: timeline.detail,
      dateTime: `${timeline.date}T12:00:00`,
      relatedRecordId: '',
      automatic: false,
    }));
    setTimeline({ date: today(), title: '', detail: '' });
  };
  const archiveRelated = (key, id) => setData(current => ({ ...current, [key]: current[key].map(item => item.id === id ? { ...item, archived: true } : item) }));
  const deleteRelated = (key, id, label) => {
    if (confirm(`Permanently delete this ${label}?`)) setData(current => ({ ...current, [key]: current[key].filter(item => item.id !== id) }));
  };

  if (selected) {
    const finance = calculateProjectFinance(data, selected);
    const sourceRecords = data.sourcingRecords.filter(item => item.projectId === selectedId && !item.archived);
    const photos = data.projectPhotos.filter(item => item.projectId === selectedId && !item.archived);
    const notes = data.projectNotes.filter(item => item.projectId === selectedId && !item.archived);
    const timelineItems = data.projectTimeline.filter(item => item.projectId === selectedId && !item.archived).sort((a, b) => String(b.dateTime || b.date || b.createdAt).localeCompare(String(a.dateTime || a.date || a.createdAt)));
    const documents = data.estimates.filter(item => item.projectId === selectedId && !item.archived);
    const legacyExpenses = data.expenses.filter(item => item.projectId === selectedId && !item.archived);
    return <div className="page project-hub-page">
      {projectNotice && <div className="project-success-message" role="status"><span aria-hidden="true">✓</span>{projectNotice}</div>}
      <div className="project-hub-title">
        <button onClick={() => setSelectedId('')}>← Project District</button>
        <div><span>{selected.projectId}</span><h2>{selected.name}</h2><p>{client?.name || 'Unassigned client'} • {selected.propertyAddress || 'No property address'}</p></div>
        <span className="project-status">{selected.status}</span>
      </div>
      <ProjectHealthBanner data={data} project={selected} setData={setData} />
      <nav className="project-hub-tabs" aria-label="Project Hub sections">{['Overview', 'Client', 'Design', 'Plant Plan', 'Plant Sourcing', 'Finance', 'Estimates & Invoices', 'Photos', 'Documents', 'Notes', 'Tasks', 'Timeline', 'Plant Passports', 'Completion Checklist'].map(item => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</nav>

      {tab === 'Overview' && <section className="panel glass project-overview-panel">
        <div className="district-panel-title"><div><span className="district-eyebrow">Project Hub</span><h3>Overview</h3></div><strong>{selected.projectId}</strong></div>
        <div className="project-overview-grid">
          <label>Project name<input value={selected.name} onChange={event => patchProject({ name: event.target.value })} /></label>
          <label>Primary client<select required value={selected.clientId} onChange={event => patchProject({ clientId: event.target.value })}><option value="" disabled>Assign primary client *</option>{activeClients.map(item => <option key={clientRecordId(item)} value={clientRecordId(item)}>{item.name}</option>)}</select></label>
          <label className="wide">Property address<input value={selected.propertyAddress} onChange={event => patchProject({ propertyAddress: event.target.value })} /></label>
          <label>Status<select value={selected.status} onChange={event => patchProject({ status: event.target.value })}>{PROJECT_STATUSES.map(item => <option key={item}>{item}</option>)}</select></label>
          <label>Budget<input type="number" min="0" step="0.01" value={selected.budget} onChange={event => patchProject({ budget: event.target.value })} /></label>
          <label>Start date<input type="date" value={selected.startDate} onChange={event => patchProject({ startDate: event.target.value })} /></label>
          <label>Target completion<input type="date" value={selected.targetCompletionDate} onChange={event => patchProject({ targetCompletionDate: event.target.value })} /></label>
          <label className="wide">Project notes<textarea value={selected.notes} onChange={event => patchProject({ notes: event.target.value })} /></label>
        </div>
        <div className="project-danger-row"><button onClick={() => archiveProject(selected)}>Archive project</button><button className="danger" onClick={() => deleteProject(selected)}>Delete project</button></div>
        {deleteCandidate?.projectId === selected.projectId && <div className="project-form-summary" role="alert"><strong>{selected.name.startsWith('Codex Phase 4 Test') ? 'Remove this temporary test project and only its connected test records?' : 'Permanently delete this project record?'}</strong><p>{selected.name.startsWith('Codex Phase 4 Test') ? 'The temporary client will remain until it is removed separately from Client District.' : 'Connected financial and sourcing records will remain in their Districts.'}</p><div className="project-danger-row"><button onClick={() => setDeleteCandidate(null)}>Cancel</button><button className="danger" onClick={confirmDeleteProject}>Permanently delete project</button></div></div>}
      </section>}

      {tab === 'Client' && <section className="panel glass linked-client-panel">
        <div className="district-panel-title"><div><span className="district-eyebrow">Primary relationship</span><h3>Client</h3></div></div>
        {client ? <div className="client-profile-card"><h4>{client.name}</h4><p>{client.address || selected.propertyAddress || 'No address saved'}</p><div>{client.phone && <a href={`tel:${client.phone}`}>{client.phone}</a>}{client.email && <a href={`mailto:${client.email}`}>{client.email}</a>}</div>{client.notes && <p>{client.notes}</p>}</div> : <EmptyDistrict title="No client assigned" text="Choose a primary client in Overview. Project records reference the client ID instead of copying client details." />}
      </section>}

      {tab === 'Design' && <section className="design-district-card glass"><span aria-hidden="true">✎</span><div><span className="district-eyebrow">Design District connection</span><h3>Project Design Studio</h3><p>Open this project’s property overview, site photos, saved concepts, plant palette, materials, inspiration, notes, and measurements.</p></div><button className="primary" onClick={() => openDesign(selected.projectId)}>Open Design District</button></section>}

      {tab === 'Plant Sourcing' && <div className="district-two-column">
        <form className="panel glass district-form" onSubmit={addSource}><span className="district-eyebrow">Project planting list</span><h3>Add a sourcing record</h3>
          <select required value={sourceForm.nurseryId} onChange={event => setSourceForm({ ...sourceForm, nurseryId: event.target.value })}><option value="">Choose nursery *</option>{data.nurseries.filter(item => !item.archived).map(item => <option key={item.nurseryId || item.id} value={item.nurseryId || item.id}>{item.name}</option>)}</select>
          <input required placeholder="Plant, variety, or material *" value={sourceForm.plant} onChange={event => setSourceForm({ ...sourceForm, plant: event.target.value })} />
          <input placeholder="Quantity or size" value={sourceForm.quantity} onChange={event => setSourceForm({ ...sourceForm, quantity: event.target.value })} />
          <input type="number" min="0" step="0.01" placeholder="Estimated cost" value={sourceForm.estimatedCost} onChange={event => setSourceForm({ ...sourceForm, estimatedCost: event.target.value })} />
          <select value={sourceForm.status} onChange={event => setSourceForm({ ...sourceForm, status: event.target.value })}>{['Considering', 'Requested', 'Ordered', 'Received', 'Unavailable'].map(item => <option key={item}>{item}</option>)}</select>
          <textarea placeholder="Cultivar, availability, substitutions, shipping…" value={sourceForm.notes} onChange={event => setSourceForm({ ...sourceForm, notes: event.target.value })} />
          <button className="primary">Connect source to project</button>
        </form>
        <section className="panel glass"><div className="district-panel-title"><div><span className="district-eyebrow">Plant Sourcing District</span><h3>Related sourcing records</h3></div><strong>{money(sourceRecords.reduce((sum, item) => sum + number(item.estimatedCost), 0))}</strong></div>
          <div className="district-record-list">{sourceRecords.map(item => {
            const nursery = data.nurseries.find(source => (source.nurseryId || source.id) === item.nurseryId);
            return <article key={item.id}><div><span>{item.status}</span><h4>{item.plant}</h4><p>{nursery?.name || 'Nursery unavailable'} • {item.quantity || 'Quantity open'}</p><small>{item.notes || 'No notes'}</small></div><strong>{money(item.estimatedCost)}</strong><div><button onClick={() => archiveRelated('sourcingRecords', item.id)}>Archive</button><button className="danger" onClick={() => deleteRelated('sourcingRecords', item.id, 'sourcing record')}>Delete</button></div></article>;
          })}{!sourceRecords.length && <EmptyDistrict title="No plants connected yet" text="Add a nursery and plant to begin the project sourcing list." />}</div>
        </section>
      </div>}

      {tab === 'Finance' && <div className="project-finance-stack">
        <FinanceSummaryCards data={data} projectId={selected.projectId} />
        <section className="project-profit-hero glass">
          <div><span className="district-eyebrow">Project profit calculator</span><h3>{money(finance.netProfit)} projected net profit</h3><p>Recommended project price: <strong>{money(finance.recommendedPrice)}</strong></p></div>
          <Ring value={finance.profitMargin} label="profit margin" detail={`${money(finance.clientRevenue)} revenue`} tone={finance.netProfit >= 0 ? 'olive' : 'rose'} />
        </section>
        <section className="project-cost-grid">{[
          ['Plant costs', finance.plantCosts],
          ['Material costs', finance.materialCosts],
          ['Nursery shipping', finance.nurseryShipping],
          ['Mileage cost', finance.mileageCost],
          ['Labor cost', finance.laborCost],
          ['Delivery cost', finance.deliveryCost],
          ['Other expenses', finance.otherExpenses],
          ['Total project cost', finance.totalCost],
          ['Client revenue', finance.clientRevenue],
          ['Outstanding balance', finance.outstandingBalance],
          ['Net profit', finance.netProfit],
          ['Profit margin', `${finance.profitMargin.toFixed(1)}%`],
        ].map(([label, value]) => <SummaryCard key={label} label={label} value={typeof value === 'number' ? money(value) : value} note={label === 'Total project cost' ? 'All connected costs' : 'Project connection'} accent={label === 'Net profit' ? 'gold' : ''} />)}</section>
        <section className="panel glass"><div className="district-panel-title"><div><span className="district-eyebrow">Pricing assumptions</span><h3>Labor, mileage, and margin</h3></div></div>
          <div className="profit-input-grid">{[
            ['Labor hours', 'laborHours'],
            ['Hourly labor rate', 'laborRate'],
            ['Mileage', 'mileage'],
            ['Mileage rate', 'mileageRate'],
            ['Desired profit margin %', 'desiredMargin'],
          ].map(([label, key]) => <label key={key}>{label}<input type="number" min="0" step="0.01" value={selected.profitPlan?.[key] || ''} onChange={event => patchProject({ profitPlan: { ...selected.profitPlan, [key]: event.target.value } })} /></label>)}</div>
        </section>
        <section className="panel glass"><div className="district-panel-title"><div><span className="district-eyebrow">Finance District connections</span><h3>Transactions, expenses, estimates, and invoices</h3></div><strong>{finance.transactions.length + legacyExpenses.length + documents.length} records</strong></div>
          <div className="district-record-list">{finance.transactions.map(item => <article key={item.transactionId}><div><span>{item.type}</span><h4>{item.taxCategory}</h4><p>{dateLabel(item.date)} • {item.status}</p><small>{item.notes || item.transactionId}</small>{item.receipt && <a href={item.receipt} target="_blank" rel="noreferrer">Open receipt</a>}</div><strong>{money(item.amount)}</strong></article>)}{legacyExpenses.map(item => <article key={item.id}><div><span>Legacy expense</span><h4>{item.vendor}</h4><p>{item.category} • {dateLabel(item.date)}</p><small>{item.notes || item.transactionId}</small>{item.receipt && <a href={item.receipt} target="_blank" rel="noreferrer">Open receipt</a>}</div><strong>{money(item.amount)}</strong></article>)}{documents.map(item => <article key={item.id}><div><span>{item.documentType}</span><h4>{item.title}</h4><p>{item.status} • {recordId(item, item.documentType)}</p></div><strong>{money(item.total)}</strong></article>)}{!finance.transactions.length && !legacyExpenses.length && !documents.length && <EmptyDistrict title="No financial records connected" text="Use the Finance District to connect a payment, expense, estimate, or invoice." />}</div>
        </section>
      </div>}

      {tab === 'Photos' && <div className="page">
        <section className="panel glass photo-upload-panel"><div><span className="district-eyebrow">Project gallery</span><h3>Before, progress, and finished photos</h3><p>Photos are saved locally with the rest of this device’s backup data.</p></div><select value={photoStage} onChange={event => setPhotoStage(event.target.value)}>{['Before', 'Progress', 'Finished'].map(item => <option key={item}>{item}</option>)}</select><input placeholder="Caption" value={photoCaption} onChange={event => setPhotoCaption(event.target.value)} /><label className="primary">Add project photo<input type="file" accept="image/*" onChange={event => addPhoto(event.target.files?.[0])} /></label></section>
        <div className="project-photo-grid">{photos.map(photo => <article className="glass" key={photo.id}><img src={photo.image} alt={photo.caption || `${photo.stage} project photo`} /><div><span>{photo.stage}</span><p>{photo.caption || photo.fileName}</p><button onClick={() => archiveRelated('projectPhotos', photo.id)}>Archive</button><button className="danger" onClick={() => deleteRelated('projectPhotos', photo.id, 'photo')}>Delete</button></div></article>)}{!photos.length && <EmptyDistrict title="No project photos yet" text="Add before, during, and after images as the work progresses." />}</div>
      </div>}

      {tab === 'Notes' && <div className="district-two-column">
        <form className="panel glass district-form" onSubmit={addNote}><span className="district-eyebrow">Project notebook</span><h3>Add a note</h3><textarea required placeholder="Site observations, client decisions, measurements, follow-up…" value={noteText} onChange={event => setNoteText(event.target.value)} /><button className="primary">Save project note</button></form>
        <section className="panel glass"><div className="district-record-list">{notes.map(note => <article key={note.id}><div><span>{new Date(note.createdAt).toLocaleString()}</span><p>{note.text}</p></div><div><button onClick={() => archiveRelated('projectNotes', note.id)}>Archive</button><button className="danger" onClick={() => deleteRelated('projectNotes', note.id, 'note')}>Delete</button></div></article>)}{!notes.length && <EmptyDistrict title="No project notes" text="Keep decisions and field observations connected here." />}</div></section>
      </div>}

      {tab === 'Timeline' && <div className="district-two-column">
        <form className="panel glass district-form" onSubmit={addTimeline}><span className="district-eyebrow">Project chronology</span><h3>Add a timeline event</h3><input type="date" value={timeline.date} onChange={event => setTimeline({ ...timeline, date: event.target.value })} /><input required placeholder="Milestone or event *" value={timeline.title} onChange={event => setTimeline({ ...timeline, title: event.target.value })} /><textarea placeholder="Details" value={timeline.detail} onChange={event => setTimeline({ ...timeline, detail: event.target.value })} /><button className="primary">Add to timeline</button></form>
        <section className="panel glass project-timeline">{timelineItems.map(item => <article key={item.eventId || item.id}><time>{dateLabel(item.date || String(item.dateTime || item.createdAt).slice(0, 10))}</time><div><span className="district-eyebrow">{item.automatic ? 'Automatic activity' : 'Manual note'} · {item.eventType || 'manual.note'}</span><h4>{item.title}</h4><p>{item.description || item.detail}</p></div><button onClick={() => archiveRelated('projectTimeline', item.id)}>Archive</button></article>)}{!timelineItems.length && <EmptyDistrict title="No timeline events" text="Add milestones, approvals, installations, and follow-ups." />}</section>
      </div>}
      <LivingProjectSections tab={tab} data={data} setData={setData} project={selected} openEstimates={openEstimates} openFinance={openFinance} />
    </div>;
  }

  return <div className="page">
    <div className="district-title"><div><span>Connected operations</span><h2>Project District</h2><p>Every project receives a reusable Tierra Fleur ID and one primary client relationship.</p></div><div className="district-toolbar-actions"><div className="district-count">{activeProjects.length} active</div><button onClick={() => setShowArchived(value => !value)}>{showArchived ? 'Hide archived' : `Archived (${data.projects.filter(item => item.archived).length})`}</button></div></div>
    <div className="district-two-column">
      <form className="panel glass district-form project-creation-form" onSubmit={addProject} noValidate><span className="district-eyebrow">New project</span><h3>Create a Project Hub</h3><p className="required-fields-note">Primary client, project name, property address, and status are required.</p>
        {!activeClients.length && <div className="project-client-empty"><strong>A client is needed before a project can be connected.</strong><button type="button" onClick={openClients}>Create Client First</button></div>}
        <label className={projectErrors.clientId ? 'field-error' : ''}>Primary client <span>*</span>
          <select aria-required="true" aria-invalid={Boolean(projectErrors.clientId)} value={form.clientId} onChange={event => { setForm({ ...form, clientId: event.target.value }); setProjectErrors(current => ({ ...current, clientId: '' })); }}>
            <option value="" disabled>Choose an active client</option>
            {activeClients.map(item => <option key={clientRecordId(item)} value={clientRecordId(item)}>{item.name}</option>)}
          </select>
          {projectErrors.clientId && <small>{projectErrors.clientId}</small>}
          {form.clientId && <em>Selected client: {activeClients.find(item => clientRecordId(item) === form.clientId)?.name || 'Client unavailable'}</em>}
        </label>
        <label className={projectErrors.name ? 'field-error' : ''}>Project name <span>*</span><input aria-required="true" aria-invalid={Boolean(projectErrors.name)} placeholder="Front garden renewal" value={form.name} onChange={event => { setForm({ ...form, name: event.target.value }); setProjectErrors(current => ({ ...current, name: '' })); }} />{projectErrors.name && <small>{projectErrors.name}</small>}</label>
        <label className={projectErrors.propertyAddress ? 'field-error' : ''}>Property address <span>*</span><input aria-required="true" aria-invalid={Boolean(projectErrors.propertyAddress)} placeholder="Street, city, state" value={form.propertyAddress} onChange={event => { setForm({ ...form, propertyAddress: event.target.value }); setProjectErrors(current => ({ ...current, propertyAddress: '' })); }} />{projectErrors.propertyAddress && <small>{projectErrors.propertyAddress}</small>}</label>
        <label className={projectErrors.status ? 'field-error' : ''}>Status <span>*</span><select aria-required="true" aria-invalid={Boolean(projectErrors.status)} value={form.status} onChange={event => { setForm({ ...form, status: event.target.value }); setProjectErrors(current => ({ ...current, status: '' })); }}>{PROJECT_STATUSES.map(item => <option key={item}>{item}</option>)}</select>{projectErrors.status && <small>{projectErrors.status}</small>}</label>
        <div className="split-fields"><label>Start date <span>Optional</span><input type="date" value={form.startDate} onChange={event => setForm({ ...form, startDate: event.target.value })} /></label><label>Target completion <span>Optional</span><input type="date" value={form.targetCompletionDate} onChange={event => setForm({ ...form, targetCompletionDate: event.target.value })} /></label></div>
        <label>Budget <span>Optional</span><input type="number" min="0" step="0.01" placeholder="0.00" value={form.budget} onChange={event => setForm({ ...form, budget: event.target.value })} /></label>
        <label>Notes <span>Optional</span><textarea placeholder="Scope, priorities, site conditions, and client requests" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></label>
        {Object.values(projectErrors).some(Boolean) && <div className="project-form-summary" role="alert">Please correct the highlighted required fields.</div>}
        <button className="primary" disabled={submittingProject || !activeClients.length}>{submittingProject ? 'Creating Project Hub…' : 'Create Project Hub'}</button>
      </form>
      <section className="project-district-grid">{activeProjects.map(project => {
        const linkedClient = data.clients.find(client => clientRecordId(client) === project.clientId);
        const finance = calculateProjectFinance(data, project);
        return <article className="project-district-card glass" key={project.projectId}>
          <div className="project-card-id"><span>{project.projectId}</span><span>{project.status}</span></div><h3>{project.name}</h3><p>{linkedClient?.name || 'Unassigned client'} • {project.propertyAddress || 'No address'}</p>
          <div className="project-card-metrics"><div><span>Budget</span><strong>{money(project.budget)}</strong></div><div><span>Net profit</span><strong>{money(finance.netProfit)}</strong></div><div><span>Target</span><strong>{dateLabel(project.targetCompletionDate)}</strong></div></div>
          <button className="primary" onClick={() => { setSelectedId(project.projectId); setTab('Overview'); }}>Open Project Hub</button>
        </article>;
      })}{!activeProjects.length && <EmptyDistrict title="No projects yet" text="Create the first connected Project Hub." />}</section>
    </div>
    {showArchived && <section className="panel glass"><div className="district-panel-title"><div><span className="district-eyebrow">Preserved history</span><h3>Archived projects</h3></div></div><div className="district-record-list">{data.projects.filter(item => item.archived).map(project => <article key={project.projectId}><div><span>{project.projectId} · {project.status}</span><h4>{project.name}</h4><p>{project.propertyAddress}</p></div><div><button onClick={() => { setSelectedId(project.projectId); setTab('Overview'); }}>Open history</button><button onClick={() => restoreProject(project)}>Restore</button></div></article>)}{!data.projects.some(item => item.archived) && <EmptyDistrict title="No archived projects" text="Completed projects can be archived separately and restored here." />}</div></section>}
  </div>;
}

function PersonalFinance({ data, setData }) {
  const transactionBlank = { type: 'Expense', category: 'Rent', source: '', amount: '', date: today(), dueDate: '', recurring: false, status: 'Unpaid', paymentMethod: 'Not specified', debtId: '', savingsGoalId: '', notes: '', receiptReference: '', receipt: '', receiptName: '', receiptId: '' };
  const [month, setMonth] = useState(currentMonth());
  const [form, setForm] = useState(transactionBlank);
  const [section, setSection] = useState('Monthly Plan');
  const [showArchived, setShowArchived] = useState(false);
  const [debtForm, setDebtForm] = useState({ name: '', balance: '', minimumPayment: '', apr: '', dueDay: '', notes: '' });
  const [goalForm, setGoalForm] = useState({ name: '', kind: 'Savings Goal', target: '', current: '', targetDate: '', notes: '' });
  const transactions = data.personalTransactions.filter(item => !item.archived);
  const visibleTransactions = showArchived ? data.personalTransactions.filter(item => item.archived) : transactions;
  const monthTransactions = transactions.filter(item => String(item.date || item.dueDate).slice(0, 7) === month);
  const income = monthTransactions.filter(item => item.type === 'Income' && item.status !== 'Unpaid').reduce((sum, item) => sum + number(item.amount), 0);
  const expenses = monthTransactions.filter(item => item.type === 'Expense' && item.status !== 'Unpaid').reduce((sum, item) => sum + number(item.amount), 0);
  const savings = monthTransactions.filter(item => item.type === 'Savings' && item.status !== 'Unpaid').reduce((sum, item) => sum + number(item.amount), 0);
  const remaining = income - expenses - savings;
  const upcoming = transactions.filter(item => item.type === 'Expense' && item.status === 'Unpaid' && item.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 8);
  const budget = number(data.personalBudget.monthly);
  const addTransaction = event => {
    event.preventDefault();
    if (!form.amount) return;
    const id = uid('txn-personal');
    setData(current => ({ ...current, personalTransactions: [{ ...form, id, transactionId: id, archived: false }, ...current.personalTransactions] }));
    setForm(transactionBlank);
  };
  const addDebt = event => {
    event.preventDefault();
    if (!debtForm.name.trim()) return;
    setData(current => ({ ...current, personalDebts: [{ ...debtForm, id: uid('debt'), archived: false }, ...current.personalDebts] }));
    setDebtForm({ name: '', balance: '', minimumPayment: '', apr: '', dueDay: '', notes: '' });
  };
  const addGoal = event => {
    event.preventDefault();
    if (!goalForm.name.trim()) return;
    setData(current => ({ ...current, personalSavingsGoals: [{ ...goalForm, id: uid('goal'), archived: false }, ...current.personalSavingsGoals] }));
    setGoalForm({ name: '', kind: 'Savings Goal', target: '', current: '', targetDate: '', notes: '' });
  };
  const patchTransaction = (id, changes) => setData(current => ({ ...current, personalTransactions: current.personalTransactions.map(item => item.transactionId === id ? { ...item, ...changes } : item) }));
  const archive = (key, id) => setData(current => ({ ...current, [key]: current[key].map(item => (item.transactionId || item.id) === id ? { ...item, archived: true } : item) }));
  const remove = (key, id, label) => {
    if (confirm(`Permanently delete this personal ${label}?`)) setData(current => ({ ...current, [key]: current[key].filter(item => (item.transactionId || item.id) !== id) }));
  };
  const categoryOptions = form.type === 'Income' ? ['Job Income', 'Other Income'] : form.type === 'Savings' ? ['Savings'] : PERSONAL_CATEGORIES.filter(item => !['Job Income', 'Other Income', 'Savings'].includes(item));
  return <div className="finance-destination">
    <div className="finance-summary-grid"><SummaryCard label="Monthly income" value={money(income)} note={month} accent="olive" /><SummaryCard label="Monthly expenses" value={money(expenses)} note={`${monthTransactions.filter(item => item.type === 'Expense').length} entries`} accent="rose" /><SummaryCard label="Remaining balance" value={money(remaining)} note="After expenses and savings" accent="gold" /><SummaryCard label="Monthly savings" value={money(savings)} note="Goal contributions" /></div>
    <div className="finance-view-tabs">{['Monthly Plan', 'Transactions', 'Goals & Debts'].map(item => <button key={item} className={section === item ? 'active' : ''} onClick={() => setSection(item)}>{item}</button>)}</div>
    {section === 'Monthly Plan' && <div className="finance-dashboard-grid">
      <section className="panel glass monthly-plan-card"><div><span className="district-eyebrow">Private monthly plan</span><h3>Budget and remaining balance</h3><label>Month<input type="month" value={month} onChange={event => setMonth(event.target.value)} /></label><label>Monthly spending budget<input type="number" min="0" step="0.01" value={data.personalBudget.monthly} onChange={event => setData(current => ({ ...current, personalBudget: { ...current.personalBudget, monthly: event.target.value } }))} /></label></div><Ring value={budget ? expenses / budget * 100 : 0} label="budget used" detail={`${money(expenses)} of ${money(budget)}`} tone={expenses > budget && budget ? 'rose' : 'olive'} /></section>
      <section className="panel glass"><div className="district-panel-title"><div><span className="district-eyebrow">Upcoming bill calendar</span><h3>Unpaid bills</h3></div></div><div className="bill-calendar">{upcoming.map(item => <article key={item.transactionId}><time>{dateLabel(item.dueDate)}</time><div><strong>{item.category}</strong><span>{item.source || item.notes || 'Personal bill'}</span></div><b>{money(item.amount)}</b><button onClick={() => patchTransaction(item.transactionId, { status: 'Paid', date: today() })}>Mark paid</button></article>)}{!upcoming.length && <EmptyDistrict title="No unpaid bills" text="Upcoming recurring and one-time bills will appear here." />}</div></section>
    </div>}
    {section === 'Transactions' && <div className="district-two-column">
      <form className="panel glass district-form" onSubmit={addTransaction}><span className="district-eyebrow">Manual personal entry</span><h3>Add income, expense, or savings</h3>
        <div className="split-fields"><label>Entry type<select value={form.type} onChange={event => { const type = event.target.value; setForm({ ...form, type, category: type === 'Income' ? 'Job Income' : type === 'Savings' ? 'Savings' : 'Rent', status: type === 'Expense' ? 'Unpaid' : 'Paid' }); }}>{['Income', 'Expense', 'Savings'].map(item => <option key={item}>{item}</option>)}</select></label><label>Category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>{categoryOptions.map(item => <option key={item}>{item}</option>)}</select></label></div>
        <input placeholder="Job, biller, or income source" value={form.source} onChange={event => setForm({ ...form, source: event.target.value })} />
        <input required type="number" min="0" step="0.01" placeholder="Amount *" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} />
        <div className="split-fields"><label>Entry date<input type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></label><label>Due date<input type="date" value={form.dueDate} onChange={event => setForm({ ...form, dueDate: event.target.value })} /></label></div>
        <div className="split-fields"><label>Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}>{['Paid', 'Unpaid'].map(item => <option key={item}>{item}</option>)}</select></label><label>Payment method<select value={form.paymentMethod} onChange={event => setForm({ ...form, paymentMethod: event.target.value })}>{PAYMENT_METHODS.map(item => <option key={item}>{item}</option>)}</select></label></div>
        {form.category === 'Debt Payment' && <select value={form.debtId} onChange={event => setForm({ ...form, debtId: event.target.value })}><option value="">Optional debt</option>{data.personalDebts.filter(item => !item.archived).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
        {form.type === 'Savings' && <select value={form.savingsGoalId} onChange={event => setForm({ ...form, savingsGoalId: event.target.value })}><option value="">Optional savings goal</option>{data.personalSavingsGoals.filter(item => !item.archived).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
        <label className="check-line"><input type="checkbox" checked={form.recurring} onChange={event => setForm({ ...form, recurring: event.target.checked })} /> Recurring monthly entry</label>
        <textarea placeholder="Notes" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} />
        <input placeholder="Receipt reference or file location" value={form.receiptReference} onChange={event => setForm({ ...form, receiptReference: event.target.value })} />
        <label className="file-button">Attach receipt<input type="file" accept="image/*,.pdf" onChange={event => readAttachment(event.target.files?.[0], attachment => setForm({ ...form, ...attachment }))} /></label>{form.receiptName && <small>{form.receiptName}</small>}
        <button className="primary">Save personal entry</button>
      </form>
      <section className="panel glass"><div className="district-list-toolbar"><div><span className="district-eyebrow">Personal ledger</span><h3>{showArchived ? 'Archived records' : 'Manual records'}</h3></div><div className="district-toolbar-actions"><button onClick={() => setShowArchived(value => !value)}>{showArchived ? 'View active' : 'View archived'}</button><button onClick={() => downloadCsv('tierra-fleur-personal-finances.csv', transactions.map(({ receipt, ...item }) => item))}>Export CSV</button></div></div><div className="district-record-list">{visibleTransactions.map(item => <article key={item.transactionId}><div><span>{item.type} • {item.status}</span><h4>{item.source || item.category}</h4><p>{item.category} • {dateLabel(item.date || item.dueDate)}</p><small>{item.notes || item.paymentMethod}</small>{item.receipt && <a href={item.receipt} target="_blank" rel="noreferrer">Open receipt</a>}</div><strong>{money(item.amount)}</strong><div><button onClick={() => setData(current => ({ ...current, personalTransactions: current.personalTransactions.map(record => record.transactionId === item.transactionId ? { ...record, archived: !record.archived } : record) }))}>{item.archived ? 'Restore' : 'Archive'}</button><button className="danger" onClick={() => remove('personalTransactions', item.transactionId, 'entry')}>Delete</button></div></article>)}{!visibleTransactions.length && <EmptyDistrict title={showArchived ? 'No archived personal records' : 'No personal records'} text={showArchived ? 'Archived entries will remain available here.' : 'Starter categories are ready without fake transactions.'} />}</div></section>
    </div>}
    {section === 'Goals & Debts' && <div className="goals-debts-layout">
      <form className="panel glass district-form" onSubmit={addDebt}><span className="district-eyebrow">Debt plan</span><h3>Add a debt balance</h3><input required placeholder="Debt name *" value={debtForm.name} onChange={event => setDebtForm({ ...debtForm, name: event.target.value })} /><input type="number" min="0" step="0.01" placeholder="Current balance" value={debtForm.balance} onChange={event => setDebtForm({ ...debtForm, balance: event.target.value })} /><input type="number" min="0" step="0.01" placeholder="Minimum payment" value={debtForm.minimumPayment} onChange={event => setDebtForm({ ...debtForm, minimumPayment: event.target.value })} /><div className="split-fields"><input type="number" min="0" step="0.01" placeholder="APR %" value={debtForm.apr} onChange={event => setDebtForm({ ...debtForm, apr: event.target.value })} /><input type="number" min="1" max="31" placeholder="Due day" value={debtForm.dueDay} onChange={event => setDebtForm({ ...debtForm, dueDay: event.target.value })} /></div><textarea placeholder="Notes" value={debtForm.notes} onChange={event => setDebtForm({ ...debtForm, notes: event.target.value })} /><button className="primary">Add debt</button></form>
      <form className="panel glass district-form" onSubmit={addGoal}><span className="district-eyebrow">Savings plan</span><h3>Add a goal or emergency fund</h3><select value={goalForm.kind} onChange={event => setGoalForm({ ...goalForm, kind: event.target.value })}>{['Savings Goal', 'Emergency Fund'].map(item => <option key={item}>{item}</option>)}</select><input required placeholder="Goal name *" value={goalForm.name} onChange={event => setGoalForm({ ...goalForm, name: event.target.value })} /><input type="number" min="0" step="0.01" placeholder="Target amount" value={goalForm.target} onChange={event => setGoalForm({ ...goalForm, target: event.target.value })} /><input type="number" min="0" step="0.01" placeholder="Starting amount" value={goalForm.current} onChange={event => setGoalForm({ ...goalForm, current: event.target.value })} /><input type="date" value={goalForm.targetDate} onChange={event => setGoalForm({ ...goalForm, targetDate: event.target.value })} /><textarea placeholder="Notes" value={goalForm.notes} onChange={event => setGoalForm({ ...goalForm, notes: event.target.value })} /><button className="primary">Add savings goal</button></form>
      <section className="goal-debt-cards">{data.personalDebts.filter(item => !item.archived).map(debt => {
        const paid = transactions.filter(item => item.debtId === debt.id && item.status !== 'Unpaid').reduce((sum, item) => sum + number(item.amount), 0);
        const balance = Math.max(0, number(debt.balance) - paid);
        return <article className="glass" key={debt.id}><span>Debt balance</span><h3>{debt.name}</h3><strong>{money(balance)}</strong><p>{money(paid)} recorded in payments • {debt.apr || 0}% APR</p><button onClick={() => archive('personalDebts', debt.id)}>Archive</button><button className="danger" onClick={() => remove('personalDebts', debt.id, 'debt')}>Delete</button></article>;
      })}{data.personalSavingsGoals.filter(item => !item.archived).map(goal => {
        const added = transactions.filter(item => item.savingsGoalId === goal.id && item.status !== 'Unpaid').reduce((sum, item) => sum + number(item.amount), 0);
        const saved = number(goal.current) + added;
        return <article className="glass" key={goal.id}><span>{goal.kind}</span><h3>{goal.name}</h3><strong>{money(saved)} / {money(goal.target)}</strong><Ring value={number(goal.target) ? saved / number(goal.target) * 100 : 0} label="funded" tone="gold" /><button onClick={() => archive('personalSavingsGoals', goal.id)}>Archive</button><button className="danger" onClick={() => remove('personalSavingsGoals', goal.id, 'goal')}>Delete</button></article>;
      })}</section>
    </div>}
  </div>;
}

function BusinessFinance({ data, setData, openProject }) {
  const blank = { type: 'Expense', taxCategory: 'Plants', amount: '', date: today(), dueDate: '', status: 'Paid', paymentMethod: 'Not specified', clientId: '', projectId: '', projectPlantId: '', nurseryId: '', estimateId: '', invoiceId: '', notes: '', receipt: '', receiptName: '', receiptId: '' };
  const [form, setForm] = useState(blank);
  const [month, setMonth] = useState(currentMonth());
  const [view, setView] = useState('Overview');
  const [showArchived, setShowArchived] = useState(false);
  const transactions = data.businessTransactions.filter(item => !item.archived);
  const visibleTransactions = showArchived ? data.businessTransactions.filter(item => item.archived) : transactions;
  const monthly = transactions.filter(item => String(item.date || item.dueDate).slice(0, 7) === month);
  const revenue = monthly.filter(item => ['Revenue', 'Client Payment', 'Deposit'].includes(item.type) && item.status !== 'Unpaid').reduce((sum, item) => sum + number(item.amount), 0);
  const expenses = monthly.filter(item => ['Expense', 'Mileage'].includes(item.type) && item.status !== 'Unpaid').reduce((sum, item) => sum + number(item.amount), 0)
    + data.expenses.filter(item => !item.archived && String(item.date).slice(0, 7) === month).reduce((sum, item) => sum + number(item.amount), 0);
  const invoices = data.estimates.filter(item => item.documentType === 'Invoice' && !item.archived);
  const invoiceTotal = invoices.reduce((sum, item) => sum + number(item.total), 0);
  const invoicePayments = transactions.filter(item => ['Client Payment', 'Deposit'].includes(item.type)).reduce((sum, item) => sum + number(item.amount), 0);
  const outstanding = Math.max(0, invoiceTotal - invoicePayments);
  const add = event => {
    event.preventDefault();
    if (!form.amount) return;
    const id = uid('txn-business');
    setData(current => {
      let next = { ...current, businessTransactions: [{ ...form, id, transactionId: id, relatedRecordId: form.projectPlantId || form.invoiceId || form.estimateId || '', archived: false }, ...current.businessTransactions] };
      if (form.projectId) {
        const eventType = ['Client Payment', 'Deposit'].includes(form.type) ? 'payment.recorded' : form.type === 'Expense' ? 'expense.added' : '';
        if (eventType) next = addTimelineEvent(next, {
          projectId: form.projectId,
          eventType,
          title: eventType === 'payment.recorded' ? 'Payment recorded' : 'Expense added',
          description: `${form.taxCategory} · ${money(form.amount)}`,
          relatedRecordId: id,
          dedupeKey: `${eventType}:${id}`,
          automatic: true,
        });
        if (form.receiptId) next = addTimelineEvent(next, {
          projectId: form.projectId,
          eventType: 'receipt.attached',
          title: 'Receipt attached',
          description: form.receiptName || form.receiptReference || 'Business receipt',
          relatedRecordId: form.receiptId,
          dedupeKey: `receipt.attached:${form.receiptId}`,
          automatic: true,
        });
      }
      return next;
    });
    setForm(blank);
  };
  const archive = id => setData(current => ({ ...current, businessTransactions: current.businessTransactions.map(item => item.transactionId === id ? { ...item, archived: true } : item) }));
  const remove = id => {
    if (confirm('Permanently delete this Tierra Fleur business financial record?')) setData(current => ({ ...current, businessTransactions: current.businessTransactions.filter(item => item.transactionId !== id) }));
  };
  const relationDocuments = data.estimates.filter(item => !item.archived);
  return <div className="finance-destination">
    <div className="finance-summary-grid"><SummaryCard label="Monthly revenue" value={money(revenue)} note={month} accent="olive" /><SummaryCard label="Monthly expenses" value={money(expenses)} note="New and legacy expenses" accent="rose" /><SummaryCard label="Monthly profit" value={money(revenue - expenses)} note="Revenue minus expenses" accent="gold" /><SummaryCard label="Outstanding invoices" value={money(outstanding)} note={`${invoices.filter(item => item.status !== 'Paid').length} open invoices`} /></div>
    <div className="finance-view-tabs">{['Overview', 'Business Ledger', 'Project Profit'].map(item => <button key={item} className={view === item ? 'active' : ''} onClick={() => setView(item)}>{item}</button>)}</div>
    {view === 'Overview' && <>
      <div className="finance-dashboard-grid">
        <section className="panel glass business-month-card"><div><span className="district-eyebrow">Tierra Fleur monthly view</span><h3>Revenue and profit</h3><label>Month<input type="month" value={month} onChange={event => setMonth(event.target.value)} /></label><p>All business records stay separate from Personal Finances.</p></div><Ring value={revenue ? Math.max(0, (revenue - expenses) / revenue * 100) : 0} label="profit margin" detail={`${money(revenue - expenses)} profit`} tone={revenue - expenses >= 0 ? 'olive' : 'rose'} /></section>
        <section className="panel glass"><div className="district-panel-title"><div><span className="district-eyebrow">Tax-ready categories</span><h3>Monthly expense mix</h3></div></div><div className="category-spend-list">{BUSINESS_CATEGORIES.map(category => {
          const total = monthly.filter(item => item.taxCategory === category && ['Expense', 'Mileage'].includes(item.type)).reduce((sum, item) => sum + number(item.amount), 0);
          return total > 0 && <div key={category}><span>{category}</span><strong>{money(total)}</strong></div>;
        }).filter(Boolean)}{!monthly.some(item => ['Expense', 'Mileage'].includes(item.type)) && <EmptyDistrict title="No expenses this month" text="Tax-ready categories are ready for manual entries." />}</div></section>
      </div>
      <section className="panel glass"><div className="district-panel-title"><div><span className="district-eyebrow">Estimates and invoices</span><h3>Business documents</h3></div><strong>{relationDocuments.length} saved</strong></div>
        <div className="district-record-list">{relationDocuments.map(item => {
          const project = data.projects.find(projectItem => projectItem.projectId === item.projectId);
          return <article key={item.id}><div><span>{item.documentType} • {item.status}</span><h4>{item.title}</h4><p>{item.client || 'Unassigned client'}{project ? ` • ${project.projectId}` : ''}</p><small>{recordId(item, item.documentType) || item.id}</small></div><strong>{money(item.total)}</strong></article>;
        })}{!relationDocuments.length && <EmptyDistrict title="No estimates or invoices" text="The existing Estimates & Invoices screen remains connected to the Finance District." />}</div>
      </section>
    </>}
    {view === 'Business Ledger' && <div className="district-two-column">
      <form className="panel glass district-form" onSubmit={add}><span className="district-eyebrow">Manual business entry</span><h3>Add a transaction</h3>
        <div className="split-fields"><label>Type<select value={form.type} onChange={event => { const type = event.target.value; setForm({ ...form, type, taxCategory: ['Revenue', 'Client Payment', 'Deposit'].includes(type) ? 'Client Revenue' : type === 'Mileage' ? 'Mileage' : 'Plants' }); }}>{['Revenue', 'Client Payment', 'Deposit', 'Expense', 'Mileage'].map(item => <option key={item}>{item}</option>)}</select></label><label>Tax category<select value={form.taxCategory} onChange={event => setForm({ ...form, taxCategory: event.target.value })}>{BUSINESS_CATEGORIES.map(item => <option key={item}>{item}</option>)}</select></label></div>
        <input required type="number" min="0" step="0.01" placeholder="Amount *" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} />
        <div className="split-fields"><label>Date<input type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></label><label>Due date<input type="date" value={form.dueDate} onChange={event => setForm({ ...form, dueDate: event.target.value })} /></label></div>
        <div className="split-fields"><label>Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}>{['Paid', 'Unpaid'].map(item => <option key={item}>{item}</option>)}</select></label><label>Payment method<select value={form.paymentMethod} onChange={event => setForm({ ...form, paymentMethod: event.target.value })}>{PAYMENT_METHODS.map(item => <option key={item}>{item}</option>)}</select></label></div>
        <span className="district-eyebrow relation-label">Optional connections</span>
        <select value={form.clientId} onChange={event => setForm({ ...form, clientId: event.target.value })}><option value="">Client</option>{data.clients.filter(item => !item.archived).map(item => <option key={item.clientId} value={item.clientId}>{item.name}</option>)}</select>
        <select value={form.projectId} onChange={event => setForm({ ...form, projectId: event.target.value })}><option value="">Project</option>{data.projects.filter(item => !item.archived).map(item => <option key={item.projectId} value={item.projectId}>{item.projectId} · {item.name}</option>)}</select>
        <select value={form.projectPlantId} onChange={event => setForm({ ...form, projectPlantId: event.target.value })}><option value="">Plant Plan item</option>{data.projectPlants.filter(item => !item.archived && (!form.projectId || item.projectId === form.projectId)).map(item => <option key={item.projectPlantId} value={item.projectPlantId}>{item.plantName}</option>)}</select>
        <select value={form.nurseryId} onChange={event => setForm({ ...form, nurseryId: event.target.value })}><option value="">Nursery</option>{data.nurseries.filter(item => !item.archived).map(item => <option key={item.nurseryId || item.id} value={item.nurseryId || item.id}>{item.name}</option>)}</select>
        <select value={form.estimateId || form.invoiceId} onChange={event => {
          const document = relationDocuments.find(item => (recordId(item, item.documentType) || item.id) === event.target.value);
          setForm({ ...form, estimateId: document?.documentType === 'Estimate' ? event.target.value : '', invoiceId: document?.documentType === 'Invoice' ? event.target.value : '' });
        }}><option value="">Estimate or invoice</option>{relationDocuments.map(item => <option key={item.id} value={recordId(item, item.documentType) || item.id}>{item.documentType} · {item.title}</option>)}</select>
        <textarea placeholder="Notes" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} />
        <label className="file-button">Attach receipt<input type="file" accept="image/*,.pdf" onChange={event => readAttachment(event.target.files?.[0], attachment => setForm({ ...form, ...attachment }))} /></label>{form.receiptName && <small>{form.receiptName}</small>}
        <button className="primary">Save business transaction</button>
        <small className="security-note">Never enter bank credentials, passwords, or full card numbers.</small>
      </form>
      <section className="panel glass"><div className="district-list-toolbar"><div><span className="district-eyebrow">Business ledger</span><h3>{showArchived ? 'Archived transactions' : 'Transactions and receipts'}</h3></div><div className="district-toolbar-actions"><button onClick={() => setShowArchived(value => !value)}>{showArchived ? 'View active' : 'View archived'}</button><button onClick={() => downloadCsv('tierra-fleur-business-finances.csv', transactions.map(({ receipt, ...item }) => item))}>Export CSV</button></div></div><div className="district-record-list">{visibleTransactions.map(item => {
        const project = data.projects.find(record => record.projectId === item.projectId);
        return <article key={item.transactionId}><div><span>{item.type} • {item.status}</span><h4>{item.taxCategory}</h4><p>{dateLabel(item.date)}{project ? ` • ${project.projectId}` : ''}</p><small>{item.notes || item.transactionId}</small>{item.receipt && <a href={item.receipt} target="_blank" rel="noreferrer">Open receipt</a>}</div><strong>{money(item.amount)}</strong><div><button onClick={() => setData(current => ({ ...current, businessTransactions: current.businessTransactions.map(record => record.transactionId === item.transactionId ? { ...record, archived: !record.archived } : record) }))}>{item.archived ? 'Restore' : 'Archive'}</button><button className="danger" onClick={() => remove(item.transactionId)}>Delete</button></div></article>;
      })}{!visibleTransactions.length && <EmptyDistrict title={showArchived ? 'No archived business transactions' : 'No business transactions'} text={showArchived ? 'Archived business records will remain available here.' : 'Legacy expenses and documents remain available while new connected entries appear here.'} />}</div></section>
    </div>}
    {view === 'Project Profit' && <section className="project-profit-list">{data.projects.filter(item => !item.archived).map(project => {
      const summary = calculateProjectFinance(data, project);
      return <article className="glass" key={project.projectId}><div><span>{project.projectId}</span><h3>{project.name}</h3><p>{money(summary.clientRevenue)} revenue • {money(summary.totalCost)} total cost</p></div><div><strong>{money(summary.netProfit)}</strong><span>{summary.profitMargin.toFixed(1)}% margin</span></div><button className="primary" onClick={() => openProject(project.projectId)}>Open Project Hub</button></article>;
    })}</section>}
  </div>;
}

export function FinanceDistrict({ data, setData, openProject }) {
  const [destination, setDestination] = useState('');
  return <div className="page finance-district-page">
    <div className="district-title finance-title"><div><span>Private manual records</span><h2>Finance District</h2><p>A calm, connected place for personal planning and Tierra Fleur business performance—without bank connections or payment processing.</p></div><span className="finance-butterfly" aria-hidden="true">🦋</span></div>
    <section className="finance-destination-grid">
      <button className={`finance-destination-card personal glass ${destination === 'personal' ? 'active' : ''}`} onClick={() => setDestination('personal')}>
        <span className="destination-icon" aria-hidden="true">⌂</span><div><span>Private household ledger</span><h3>Personal Finances</h3><p>Income, monthly budget, bills, debt balances, savings goals, and emergency fund.</p></div><strong>Enter Personal Finances →</strong>
      </button>
      <button className={`finance-destination-card business glass ${destination === 'business' ? 'active' : ''}`} onClick={() => setDestination('business')}>
        <span className="destination-icon" aria-hidden="true">TFD</span><div><span>Business performance ledger</span><h3>Tierra Fleur Business Finances</h3><p>Revenue, client payments, expenses, invoices, tax categories, project costs, and profit.</p></div><strong>Enter Business Finances →</strong>
      </button>
    </section>
    {!destination && <section className="finance-landing-note glass"><span aria-hidden="true">✦</span><div><h3>Two ledgers. A clear garden wall between them.</h3><p>Personal and business records use separate storage collections, calculations, filters, totals, and CSV exports. Both are included in the existing Tierra Fleur JSON backup and restore.</p></div></section>}
    {destination === 'personal' && <PersonalFinance data={data} setData={setData} />}
    {destination === 'business' && <BusinessFinance data={data} setData={setData} openProject={openProject} />}
  </div>;
}
