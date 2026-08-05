import React, { useEffect, useMemo, useRef, useState } from 'react';
import './growthDistrict.css';
import {
  CONTACT_METHODS,
  LEAD_PRIORITIES,
  LEAD_STAGES,
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_TYPES,
  PORTFOLIO_PERMISSION_STATUSES,
  PROPERTY_TYPES,
  businessAssistantResults,
  calculateGrowthDashboard,
  calculateReferralSummary,
  completeLeadFollowUp,
  convertLeadToBusiness,
  createBlankLead,
  createCampaign,
  createMarketingTemplate,
  createOpportunity,
  createPortfolioEntry,
  createReferral,
  findDuplicateClients,
  leadFollowUpCalendarLink,
  normalizeLead,
  scheduleLeadFollowUp,
} from './growthEngine.js';
import { createCalendarEvent, localDate } from './calendarEngine.js';
import {
  PROJECT_PHOTO_ACCEPT,
  prepareProjectPhoto,
  releasePreparedProjectPhoto,
  removeProjectPhotoAttachments,
  storePreparedProjectPhoto,
} from './imageStorage.js';

const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
const dateLabel = value => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not scheduled';
const now = () => new Date().toISOString();
const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
const number = value => Number(value || 0);
const active = item => !item.archived;

function SectionTitle({ eyebrow, title, text, action }) {
  return <div className="growth-section-title"><div><span>{eyebrow}</span><h3>{title}</h3>{text && <p>{text}</p>}</div>{action}</div>;
}

function Empty({ title, text }) {
  return <div className="growth-empty"><span aria-hidden="true">❦</span><strong>{title}</strong><p>{text}</p></div>;
}

function Modal({ title, eyebrow, onClose, children, wide = false }) {
  return <div className="growth-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className={`growth-modal glass ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><header><div><span>{eyebrow}</span><h2>{title}</h2></div><button type="button" onClick={onClose} aria-label="Close">×</button></header>{children}</section></div>;
}

function Metric({ label, value, note, tone = '' }) {
  return <article className={`growth-metric ${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function Assistant({ data, openLead, openProject, openCalendar, openEstimate }) {
  const suggestions = ['Who needs a follow-up today?', 'Which estimates are still pending?', 'What jobs are booked this month?', 'Which projects have unpaid balances?', 'How much pipeline value is open?', 'Which project is least profitable?', 'What appointments are scheduled this week?', 'Which nursery pickups are pending?', 'Which referral rewards are incomplete?'];
  const [question, setQuestion] = useState(suggestions[0]);
  const results = useMemo(() => businessAssistantResults(data, question), [data, question]);
  const open = item => {
    if (item.leadId) openLead(item.leadId);
    else if (item.projectId) openProject(item.projectId);
    else if (item.calendarEventId) openCalendar(item.calendarEventId);
    else if (item.estimateId || item.invoiceId) openEstimate('', item.estimateId || item.invoiceId);
  };
  return <section className="panel glass growth-assistant"><SectionTitle eyebrow="Private, rule-based answers" title="TFD Business Assistant" text="Uses only the records saved in this Command Center." />
    <div className="assistant-question"><select value={question} onChange={event => setQuestion(event.target.value)}>{suggestions.map(item => <option key={item}>{item}</option>)}</select></div>
    <div className="assistant-results">{results.map(item => <button key={`${item.type}-${item.id}`} onClick={() => open(item)} disabled={!item.leadId && !item.projectId && !item.calendarEventId && !item.estimateId && !item.invoiceId}><span>{item.type}</span><strong>{item.title}</strong><small>{item.value != null ? money(item.value) : dateLabel(item.date)}</small></button>)}{!results.length && <Empty title="Nothing needs attention" text="No saved records match this question." />}</div>
  </section>;
}

function DailySuccess({ data, dashboard, setData, openLead, openProject, openEstimate }) {
  const today = localDate();
  const month = today.slice(0, 7);
  const events = data.calendarEvents.filter(item => !item.archived && item.date === today && item.group === 'tierra');
  const jobs = data.projects.filter(item => !item.archived && item.startDate === today);
  const pickups = data.sourcingRecords.filter(item => !item.archived && (item.pickupDate === today || item.availabilityDate === today));
  const deliveries = data.calendarEvents.filter(item => !item.archived && item.date === today && /deliver/i.test(`${item.title} ${item.description}`));
  const transactions = data.businessTransactions.filter(item => !item.archived && String(item.date).slice(0, 7) === month && item.status !== 'Unpaid');
  const revenue = transactions.filter(item => ['Revenue', 'Client Payment', 'Deposit'].includes(item.type)).reduce((sum, item) => sum + number(item.amount), 0);
  const expenses = transactions.filter(item => ['Expense', 'Mileage'].includes(item.type)).reduce((sum, item) => sum + number(item.amount), 0) + data.expenses.filter(item => !item.archived && String(item.date).slice(0, 7) === month).reduce((sum, item) => sum + number(item.amount), 0);
  return <section className="panel glass daily-success"><SectionTitle eyebrow="Daily command" title="Today’s Success Screen" text="The work most likely to move the business forward." />
    <label className="daily-focus">Daily focus<input value={data.dailyFocus} onChange={event => setData(current => ({ ...current, dailyFocus: event.target.value }))} placeholder="Add today’s focus" /></label>
    <div className="daily-success-grid">
      <button onClick={() => openLead('')}><span>Consultations</span><strong>{events.filter(item => /consult/i.test(item.title)).length}</strong></button>
      <button onClick={() => jobs[0] && openProject(jobs[0].projectId)}><span>Jobs today</span><strong>{jobs.length}</strong></button>
      <button onClick={() => openLead('')}><span>Follow-ups due</span><strong>{dashboard.followUpsDueToday}</strong></button>
      <button className={dashboard.overdueFollowUps ? 'urgent' : ''} onClick={() => openLead('')}><span>Overdue follow-ups</span><strong>{dashboard.overdueFollowUps}</strong></button>
      <button onClick={() => openEstimate('')}><span>Estimate actions</span><strong>{dashboard.estimatesPending}</strong></button>
      <button onClick={() => openEstimate('')}><span>Outstanding</span><strong>{money(dashboard.outstandingInvoices)}</strong></button>
      <button><span>Nursery pickups</span><strong>{pickups.length}</strong></button>
      <button><span>Deliveries</span><strong>{deliveries.length}</strong></button>
      <div><span>Pipeline</span><strong>{money(dashboard.totalPipelineValue)}</strong></div>
      <div><span>Month revenue</span><strong>{money(revenue)}</strong></div>
      <div><span>Month expenses</span><strong>{money(expenses)}</strong></div>
      <div><span>Month profit</span><strong>{money(revenue - expenses)}</strong></div>
    </div>
  </section>;
}

function GrowthOverview({ data, setData, dashboard, setTab, openLead, openProject, openCalendar, openEstimate }) {
  return <div className="growth-overview">
    <div className="growth-metrics-grid">
      <Metric label="New leads" value={dashboard.newLeads} note="Awaiting first contact" />
      <Metric label="Due today" value={dashboard.followUpsDueToday} note="Lead follow-ups" tone={dashboard.followUpsDueToday ? 'gold' : ''} />
      <Metric label="Overdue" value={dashboard.overdueFollowUps} note="Needs attention" tone={dashboard.overdueFollowUps ? 'rose' : ''} />
      <Metric label="Consultations" value={dashboard.consultationsScheduled} note="Scheduled ahead" />
      <Metric label="Estimates pending" value={dashboard.estimatesPending} note="Awaiting action" />
      <Metric label="Booked this month" value={dashboard.jobsBookedThisMonth} note="New work won" tone="olive" />
      <Metric label="Pipeline value" value={money(dashboard.totalPipelineValue)} note="Open lead value" />
      <Metric label="Booked revenue" value={money(dashboard.expectedBookedRevenue)} note="Expected value" />
      <Metric label="Conversion" value={`${dashboard.conversionRate.toFixed(0)}%`} note="Decided leads won" />
      <Metric label="Outstanding" value={money(dashboard.outstandingInvoices)} note="Invoice balance" tone={dashboard.outstandingInvoices ? 'rose' : ''} />
    </div>
    <DailySuccess data={data} dashboard={dashboard} setData={setData} openLead={() => setTab('Leads')} openProject={openProject} openEstimate={openEstimate} />
    <section className="panel glass growth-priorities"><SectionTitle eyebrow="Live from saved records" title="Today’s Priorities" text="Sorted by the next meaningful date." action={<button onClick={() => setTab('Follow-ups')}>Open Follow-up Center</button>} />
      <div>{dashboard.priorities.slice(0, 12).map(item => <button key={`${item.type}-${item.id}`} className={item.tone || ''} onClick={() => item.leadId ? openLead(item.leadId) : item.projectId ? openProject(item.projectId) : openEstimate('', item.estimateId || item.invoiceId)}><span>{item.type}</span><strong>{item.title}</strong><time>{dateLabel(item.date)}</time></button>)}{!dashboard.priorities.length && <Empty title="A clear runway" text="There are no immediate follow-ups, estimates, invoices, or job starts." />}</div>
    </section>
    <Assistant data={data} openLead={openLead} openProject={openProject} openCalendar={openCalendar} openEstimate={openEstimate} />
  </div>;
}

function LeadEditor({ initial, data, setData, onClose }) {
  const existing = Boolean(initial?.leadId);
  const stableLeadId = initial?.leadId || uid('lead');
  const [form, setForm] = useState(() => existing ? normalizeLead(initial) : { ...createBlankLead(), id: stableLeadId, leadId: stableLeadId });
  const [photoStatus, setPhotoStatus] = useState('');
  const [error, setError] = useState('');
  const [uploadedIds, setUploadedIds] = useState([]);
  const photos = data.projectPhotos.filter(photo => photo.leadId === stableLeadId && !photo.archived);
  const set = changes => setForm(current => ({ ...current, ...changes }));
  const save = event => {
    event.preventDefault();
    if (!form.fullName.trim() && !form.organizationName.trim()) { setError('Add a full name or organization name.'); return; }
    const record = normalizeLead({ ...form, updatedAt: now(), createdAt: form.createdAt || now() });
    setData(current => {
      const leads = existing ? current.leads.map(item => item.leadId === record.leadId ? record : item) : [record, ...current.leads];
      let calendarEvents = current.calendarEvents;
      if (record.consultationDate) {
        const consultation = current.calendarEvents.find(item => item.leadId === record.leadId && item.eventType === 'Consultation' && !item.archived);
        calendarEvents = consultation
          ? current.calendarEvents.map(item => item.calendarEventId === consultation.calendarEventId ? { ...item, title: `Consultation · ${record.fullName || record.organizationName}`, date: record.consultationDate, endDate: record.consultationDate, clientId: record.clientId, projectId: record.projectId, updatedAt: now() } : item)
          : [...current.calendarEvents, createCalendarEvent({ title: `Consultation · ${record.fullName || record.organizationName}`, description: record.serviceRequested, eventType: 'Consultation', group: 'tierra', date: record.consultationDate, endDate: record.consultationDate, startTime: '10:00', endTime: '11:00', leadId: record.leadId, clientId: record.clientId, projectId: record.projectId, relatedRecordId: record.leadId })];
      }
      return { ...current, leads, calendarEvents };
    });
    onClose(record.leadId);
  };
  const upload = async file => {
    if (!file) return;
    setPhotoStatus('Preparing photo…'); setError('');
    let prepared;
    try {
      prepared = await prepareProjectPhoto(file);
      const photoId = uid('lead-photo');
      const stored = await storePreparedProjectPhoto(photoId, prepared);
      const photo = { id: photoId, photoId, leadId: stableLeadId, clientId: form.clientId || '', projectId: form.projectId || '', type: 'Inquiry', label: file.name, notes: 'Lead photo', fileName: prepared.name, originalName: prepared.originalName, width: prepared.width, height: prepared.height, createdAt: now(), archived: false, ...stored };
      setData(current => ({ ...current, projectPhotos: [photo, ...current.projectPhotos] }));
      setForm(current => ({ ...current, photoIds: [...new Set([...(current.photoIds || []), photoId])] }));
      setUploadedIds(current => [...current, photoId]);
      setPhotoStatus('Photo saved to attachment storage.');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'The photo could not be saved.');
      setPhotoStatus('');
    } finally {
      if (prepared) releasePreparedProjectPhoto(prepared);
    }
  };
  const removePhoto = async photo => {
    if (!confirm('Remove this lead photo? The image attachment will be deleted from this device.')) return;
    try {
      await removeProjectPhotoAttachments(photo);
      setData(current => ({ ...current, projectPhotos: current.projectPhotos.filter(item => item.photoId !== photo.photoId) }));
      setForm(current => ({ ...current, photoIds: (current.photoIds || []).filter(id => id !== photo.photoId) }));
    } catch (removeError) { setError(removeError instanceof Error ? removeError.message : 'The photo could not be removed.'); }
  };
  const cancel = async () => {
    if (!existing && uploadedIds.length) {
      const temporary = data.projectPhotos.filter(item => uploadedIds.includes(item.photoId));
      await Promise.allSettled(temporary.map(removeProjectPhotoAttachments));
      setData(current => ({ ...current, projectPhotos: current.projectPhotos.filter(item => !uploadedIds.includes(item.photoId)) }));
    }
    onClose();
  };
  return <Modal title={existing ? `Edit ${form.fullName || form.organizationName}` : 'Add a new lead'} eyebrow="Growth District" onClose={cancel} wide><form className="growth-form" onSubmit={save}>
    <fieldset><legend>Contact</legend><div className="growth-form-grid">
      <label>Full name<input value={form.fullName} onChange={event => set({ fullName: event.target.value })} /></label>
      <label>Organization<input value={form.organizationName} onChange={event => set({ organizationName: event.target.value })} /></label>
      <label>Phone<input inputMode="tel" value={form.phone} onChange={event => set({ phone: event.target.value })} /></label>
      <label>Email<input type="email" value={form.email} onChange={event => set({ email: event.target.value })} /></label>
      <label className="wide">Service address<input value={form.serviceAddress} onChange={event => set({ serviceAddress: event.target.value })} /></label>
      <label className="wide">Billing address<input value={form.billingAddress} onChange={event => set({ billingAddress: event.target.value })} /></label>
      <label>Preferred contact<select value={form.preferredContactMethod} onChange={event => set({ preferredContactMethod: event.target.value })}>{CONTACT_METHODS.map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Property type<select value={form.propertyType} onChange={event => set({ propertyType: event.target.value })}>{PROPERTY_TYPES.map(item => <option key={item}>{item}</option>)}</select></label>
    </div></fieldset>
    <fieldset><legend>Opportunity</legend><div className="growth-form-grid">
      <label className="wide">Service requested<input value={form.serviceRequested} onChange={event => set({ serviceRequested: event.target.value })} /></label>
      <label>Lead source<input value={form.leadSource} onChange={event => set({ leadSource: event.target.value })} /></label>
      <label>Referral source<input value={form.referralSource} onChange={event => set({ referralSource: event.target.value })} /></label>
      <label>Estimated budget<input type="number" min="0" step="0.01" value={form.estimatedBudget} onChange={event => set({ estimatedBudget: event.target.value })} /></label>
      <label>Estimated job value<input type="number" min="0" step="0.01" value={form.estimatedJobValue} onChange={event => set({ estimatedJobValue: event.target.value })} /></label>
      <label>Stage<select value={form.currentStage} onChange={event => set({ currentStage: event.target.value })}>{LEAD_STAGES.map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Priority<select value={form.priorityLevel} onChange={event => set({ priorityLevel: event.target.value })}>{LEAD_PRIORITIES.map(item => <option key={item}>{item}</option>)}</select></label>
      {form.currentStage === 'Lost' && <label className="wide">Lost reason<input value={form.lostReason} onChange={event => set({ lostReason: event.target.value })} /></label>}
    </div></fieldset>
    <fieldset><legend>Dates and history</legend><div className="growth-form-grid">
      <label>Date received<input type="date" value={form.dateReceived} onChange={event => set({ dateReceived: event.target.value })} /></label>
      <label>Last contact<input type="date" value={form.lastContactDate} onChange={event => set({ lastContactDate: event.target.value })} /></label>
      <label>Next follow-up<input type="date" value={form.nextFollowUpDate} onChange={event => set({ nextFollowUpDate: event.target.value })} /></label>
      <label>Consultation<input type="date" value={form.consultationDate} onChange={event => set({ consultationDate: event.target.value })} /></label>
      <label className="wide">Tags<input value={(form.tags || []).join(', ')} onChange={event => set({ tags: event.target.value.split(',').map(item => item.trim()).filter(Boolean) })} placeholder="orchard, referral, high-value" /></label>
      <label className="wide">Notes<textarea value={form.notes} onChange={event => set({ notes: event.target.value })} /></label>
    </div></fieldset>
    <fieldset><legend>Photos</legend><label className="growth-upload">Add lead or property photo<input type="file" accept={PROJECT_PHOTO_ACCEPT} onChange={event => { upload(event.target.files?.[0]); event.target.value = ''; }} /></label>{photoStatus && <p className="growth-form-status">{photoStatus}</p>}<div className="lead-photo-grid">{photos.map(photo => <article key={photo.photoId}><img src={photo.image} alt={photo.label || 'Lead property'} /><button type="button" onClick={() => removePhoto(photo)}>Remove</button></article>)}</div></fieldset>
    {error && <p className="growth-form-error" role="alert">{error}</p>}
    <footer><button type="button" onClick={cancel}>Cancel</button><button className="primary">Save lead</button></footer>
  </form></Modal>;
}

function FollowUpEditor({ lead, onClose, setData }) {
  const [reason, setReason] = useState('Follow up on landscape inquiry');
  const [dueDate, setDueDate] = useState(lead.nextFollowUpDate || localDate());
  const [startTime, setStartTime] = useState('09:00');
  const save = event => { event.preventDefault(); setData(current => scheduleLeadFollowUp(current, { leadId: lead.leadId, clientId: lead.clientId, projectId: lead.projectId, reason, dueDate, startTime })); onClose(); };
  return <Modal title="Schedule follow-up" eyebrow={lead.fullName || lead.organizationName} onClose={onClose}><form className="growth-form compact" onSubmit={save}><label>Reason<textarea required value={reason} onChange={event => setReason(event.target.value)} /></label><div className="growth-form-grid"><label>Due date<input required type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} /></label><label>Calendar time<input type="time" value={startTime} onChange={event => setStartTime(event.target.value)} /></label></div><p className="growth-form-note">Saving creates a linked Tierra Fleur calendar entry.</p><footer><button type="button" onClick={onClose}>Cancel</button><button className="primary">Schedule</button></footer></form></Modal>;
}

function ConversionEditor({ lead, data, setData, onClose, openProject }) {
  const matches = findDuplicateClients(lead, data.clients);
  const [clientId, setClientId] = useState(lead.clientId || matches[0]?.client.clientId || 'new');
  const [createProject, setCreateProject] = useState(true);
  const [projectName, setProjectName] = useState(lead.serviceRequested || `${lead.fullName || lead.organizationName} landscape project`);
  const [startDate, setStartDate] = useState('');
  const save = event => {
    event.preventDefault();
    const next = convertLeadToBusiness(data, lead.leadId, { clientId: clientId === 'new' ? '' : clientId, createClient: clientId === 'new', createProject, projectName, startDate });
    const converted = next.leads.find(item => item.leadId === lead.leadId);
    setData(next); onClose(); if (createProject && converted?.projectId) openProject(converted.projectId);
  };
  return <Modal title="Convert booked lead" eyebrow="Review before creating records" onClose={onClose}><form className="growth-form compact" onSubmit={save}><div className="conversion-summary"><strong>{lead.fullName || lead.organizationName}</strong><span>{lead.email || lead.phone || 'No contact detail saved'}</span><span>{lead.serviceAddress || 'No service address saved'}</span><span>{money(lead.estimatedJobValue || lead.estimatedBudget)} estimated value</span></div>{matches.length > 0 && <div className="duplicate-warning"><strong>Possible existing client{matches.length === 1 ? '' : 's'} found</strong><p>Choose the correct record. Matching a name alone never creates or merges a client.</p>{matches.map(match => <small key={match.client.clientId}>{match.client.name}: {match.reasons.join(', ')}</small>)}</div>}<label>Client record<select value={clientId} onChange={event => setClientId(event.target.value)}><option value="new">Create a new client</option>{data.clients.filter(active).map(item => <option key={item.clientId} value={item.clientId}>{item.name} · {item.email || item.phone || item.address || 'saved client'}</option>)}</select></label><label className="conversion-check"><input type="checkbox" checked={createProject} onChange={event => setCreateProject(event.target.checked)} /> Create a connected project</label>{createProject && <><label>Project name<input required value={projectName} onChange={event => setProjectName(event.target.value)} /></label><label>Planned start date<input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></label></>}<footer><button type="button" onClick={onClose}>Cancel</button><button className="primary">Create {clientId === 'new' ? 'client' : 'link'}{createProject ? ' and project' : ''}</button></footer></form></Modal>;
}

function LeadCard({ lead, data, setData, edit, schedule, convert, openEstimate, remove }) {
  const stageIndex = LEAD_STAGES.indexOf(lead.currentStage);
  const patch = changes => setData(current => ({ ...current, leads: current.leads.map(item => item.leadId === lead.leadId ? { ...item, ...changes, updatedAt: now(), ...(changes.currentStage === 'Booked' && !item.bookedAt ? { bookedAt: now() } : {}) } : item) }));
  const photos = data.projectPhotos.filter(item => item.leadId === lead.leadId && !item.archived);
  return <article className={`lead-card priority-${lead.priorityLevel.toLowerCase()}`}>
    {photos[0]?.image && <img src={photos[0].image} alt="Lead property" />}
    <div className="lead-card-head"><div><span>{lead.priorityLevel} priority</span><h4>{lead.fullName || lead.organizationName}</h4><p>{lead.organizationName && lead.fullName ? lead.organizationName : lead.serviceRequested || 'Service not selected'}</p></div><strong>{money(lead.estimatedJobValue || lead.estimatedBudget)}</strong></div>
    <div className="lead-contact">{lead.phone && <a href={`tel:${lead.phone}`}>{lead.phone}</a>}{lead.email && <a href={`mailto:${lead.email}`}>{lead.email}</a>}<span>{lead.serviceAddress || 'No address saved'}</span></div>
    <div className="lead-stage-controls"><button disabled={stageIndex <= 0} onClick={() => patch({ currentStage: LEAD_STAGES[stageIndex - 1] })} aria-label="Move to previous stage">‹</button><select value={lead.currentStage} onChange={event => patch({ currentStage: event.target.value })}>{LEAD_STAGES.map(stage => <option key={stage}>{stage}</option>)}</select><button disabled={stageIndex >= LEAD_STAGES.length - 1} onClick={() => patch({ currentStage: LEAD_STAGES[stageIndex + 1] })} aria-label="Move to next stage">›</button></div>
    <div className="lead-dates"><span>Received <b>{dateLabel(lead.dateReceived)}</b></span><span>Follow-up <b>{dateLabel(lead.nextFollowUpDate)}</b></span></div>
    {lead.tags?.length > 0 && <div className="lead-tags">{lead.tags.map(tag => <span key={tag}>{tag}</span>)}</div>}
    {lead.notes && <p className="lead-notes">{lead.notes}</p>}
    <div className="lead-actions"><button onClick={edit}>View / edit</button><button onClick={schedule}>Follow up</button><button onClick={() => openEstimate(lead.leadId)}>Create estimate</button>{lead.currentStage === 'Booked' && <button className="primary" onClick={convert}>Convert</button>}<button onClick={() => patch({ archived: true })}>Archive</button><button className="danger" onClick={remove}>Delete</button></div>
  </article>;
}

function LeadCenter({ data, setData, requestedLeadId, clearRequest, openProject, openEstimate, setTab }) {
  const [editor, setEditor] = useState(() => requestedLeadId ? data.leads.find(item => item.leadId === requestedLeadId) || null : null);
  const [followUpLead, setFollowUpLead] = useState(null);
  const [conversionLead, setConversionLead] = useState(null);
  const [mode, setMode] = useState('kanban');
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('All stages');
  const [sort, setSort] = useState('Newest');
  const [showArchived, setShowArchived] = useState(false);
  React.useEffect(() => { if (!requestedLeadId) return; const lead = data.leads.find(item => item.leadId === requestedLeadId); if (lead) setEditor(lead); clearRequest(); }, [requestedLeadId]);
  const visible = useMemo(() => data.leads.filter(item => Boolean(item.archived) === showArchived && (stage === 'All stages' || item.currentStage === stage) && `${item.fullName} ${item.organizationName} ${item.email} ${item.phone} ${item.serviceAddress} ${item.serviceRequested} ${(item.tags || []).join(' ')}`.toLowerCase().includes(search.toLowerCase())).sort((left, right) => sort === 'Value' ? number(right.estimatedJobValue || right.estimatedBudget) - number(left.estimatedJobValue || left.estimatedBudget) : sort === 'Follow-up' ? String(left.nextFollowUpDate || '9999').localeCompare(String(right.nextFollowUpDate || '9999')) : String(right.createdAt).localeCompare(String(left.createdAt))), [data.leads, showArchived, stage, search, sort]);
  const remove = async lead => {
    if (!confirm(`Permanently delete ${lead.fullName || lead.organizationName}? Connected clients and projects will not be deleted.`)) return;
    const photos = data.projectPhotos.filter(item => item.leadId === lead.leadId && !item.projectId && !item.clientId);
    await Promise.allSettled(photos.map(removeProjectPhotoAttachments));
    setData(current => ({ ...current, leads: current.leads.filter(item => item.leadId !== lead.leadId), followUps: current.followUps.filter(item => item.leadId !== lead.leadId), projectPhotos: current.projectPhotos.filter(item => !photos.some(photo => photo.photoId === item.photoId)) }));
  };
  return <div className="lead-center">
    <SectionTitle eyebrow="Inquiry to booked work" title="Lead Pipeline" text="Move every opportunity forward without losing its history." action={<button className="primary" onClick={() => setEditor({})}>Add lead</button>} />
    <section className="growth-toolbar panel glass"><input type="search" placeholder="Search leads" value={search} onChange={event => setSearch(event.target.value)} /><select value={stage} onChange={event => setStage(event.target.value)}><option>All stages</option>{LEAD_STAGES.map(item => <option key={item}>{item}</option>)}</select><select value={sort} onChange={event => setSort(event.target.value)}>{['Newest', 'Value', 'Follow-up'].map(item => <option key={item}>{item}</option>)}</select><div className="segmented"><button className={mode === 'kanban' ? 'active' : ''} onClick={() => setMode('kanban')}>Board</button><button className={mode === 'list' ? 'active' : ''} onClick={() => setMode('list')}>List</button></div><button onClick={() => setShowArchived(value => !value)}>{showArchived ? 'View active' : 'View archived'}</button><button onClick={() => setTab('Follow-ups')}>Follow-up Center</button></section>
    {mode === 'kanban' ? <div className="lead-kanban">{LEAD_STAGES.map(stageName => <section key={stageName}><header><h4>{stageName}</h4><span>{visible.filter(item => item.currentStage === stageName).length}</span></header><div>{visible.filter(item => item.currentStage === stageName).map(lead => <LeadCard key={lead.leadId} lead={lead} data={data} setData={setData} edit={() => setEditor(lead)} schedule={() => setFollowUpLead(lead)} convert={() => setConversionLead(lead)} openEstimate={openEstimate} remove={() => remove(lead)} />)}{!visible.some(item => item.currentStage === stageName) && <p>No leads</p>}</div></section>)}</div> : <div className="lead-list">{visible.map(lead => <LeadCard key={lead.leadId} lead={lead} data={data} setData={setData} edit={() => setEditor(lead)} schedule={() => setFollowUpLead(lead)} convert={() => setConversionLead(lead)} openEstimate={openEstimate} remove={() => remove(lead)} />)}{!visible.length && <Empty title="No leads match" text="Adjust the filters or add a new lead." />}</div>}
    {editor && <LeadEditor initial={editor.leadId ? editor : null} data={data} setData={setData} onClose={() => setEditor(null)} />}
    {followUpLead && <FollowUpEditor lead={followUpLead} setData={setData} onClose={() => setFollowUpLead(null)} />}
    {conversionLead && <ConversionEditor lead={conversionLead} data={data} setData={setData} openProject={openProject} onClose={() => setConversionLead(null)} />}
  </div>;
}

function FollowUpCenter({ data, setData, openLead, openCalendar }) {
  const today = localDate();
  const [section, setSection] = useState('Due today');
  const [noteEditor, setNoteEditor] = useState(null);
  const [noteText, setNoteText] = useState('');
  const groups = {
    'Due today': data.followUps.filter(item => !item.archived && !item.completed && item.dueDate === today),
    Overdue: data.followUps.filter(item => !item.archived && !item.completed && item.dueDate && item.dueDate < today),
    Upcoming: data.followUps.filter(item => !item.archived && !item.completed && (!item.dueDate || item.dueDate > today)),
    Completed: data.followUps.filter(item => !item.archived && item.completed),
  };
  const patch = (id, changes) => setData(current => ({ ...current, followUps: current.followUps.map(item => item.followUpId === id ? { ...item, ...changes, updatedAt: now() } : item), calendarEvents: current.calendarEvents.map(item => item.followUpId === id ? { ...item, ...(changes.dueDate ? { date: changes.dueDate, endDate: changes.dueDate } : {}), updatedAt: now() } : item) }));
  const ensureCalendar = followUp => {
    const existing = data.calendarEvents.find(item => item.followUpId === followUp.followUpId && !item.archived);
    if (existing) { openCalendar(existing.calendarEventId); return; }
    const lead = data.leads.find(item => item.leadId === followUp.leadId);
    const event = createCalendarEvent({ title: `Follow up · ${lead?.fullName || 'Client'}`, description: followUp.reason, eventType: 'Lead Follow-up', group: 'tierra', date: followUp.dueDate, endDate: followUp.dueDate, startTime: '09:00', endTime: '09:30', clientId: followUp.clientId || lead?.clientId || '', projectId: followUp.projectId || lead?.projectId || '', ...leadFollowUpCalendarLink(followUp.leadId, followUp.followUpId) });
    setData(current => ({ ...current, calendarEvents: [...current.calendarEvents, event] }));
    openCalendar(event.calendarEventId);
  };
  const openNoteEditor = (followUp, complete = false) => {
    setNoteEditor({ followUp, complete });
    setNoteText('');
  };
  const saveNote = event => {
    event.preventDefault();
    const note = noteText.trim();
    if (noteEditor.complete) setData(current => completeLeadFollowUp(current, noteEditor.followUp.followUpId, note));
    else if (note) patch(noteEditor.followUp.followUpId, { notes: [noteEditor.followUp.notes, `${localDate()} — ${note}`].filter(Boolean).join('\n') });
    setNoteEditor(null);
    setNoteText('');
  };
  return <div><SectionTitle eyebrow="Contact rhythm" title="Follow-up Center" text="Every promised contact, grouped by urgency." />
    <div className="followup-tabs">{Object.entries(groups).map(([label, items]) => <button key={label} className={section === label ? 'active' : ''} onClick={() => setSection(label)}>{label}<span>{items.length}</span></button>)}</div>
    <section className="followup-list">{groups[section].map(followUp => {
      const lead = data.leads.find(item => item.leadId === followUp.leadId);
      const client = data.clients.find(item => item.clientId === (followUp.clientId || lead?.clientId));
      const document = data.estimates.find(item => (item.estimateId || item.id) === followUp.estimateId);
      return <article className="panel glass" key={followUp.followUpId}><div className="followup-main"><span>{lead?.currentStage || 'Client follow-up'}</span><h4>{lead?.fullName || client?.name || 'Unlinked contact'}</h4><p>{followUp.reason}</p><div>{lead?.phone && <a href={`tel:${lead.phone}`}>{lead.phone}</a>}{lead?.email && <a href={`mailto:${lead.email}`}>{lead.email}</a>}</div></div><div className="followup-facts"><span>Last contact<strong>{dateLabel(lead?.lastContactDate)}</strong></span><span>Due<strong>{dateLabel(followUp.dueDate)}</strong></span><span>Related<strong>{document?.title || followUp.projectId || 'Lead record'}</strong></span></div>{followUp.notes && <p className="followup-notes">{followUp.notes}</p>}<div className="followup-controls">
        {!followUp.completed && <><button className="primary" onClick={() => openNoteEditor(followUp, true)}>Mark contacted</button><button onClick={() => setData(current => completeLeadFollowUp(current, followUp.followUpId))}>Mark complete</button></>}
        <button onClick={() => openNoteEditor(followUp)}>Add note</button>
        <label>Reschedule<input type="date" value={followUp.dueDate} onChange={event => patch(followUp.followUpId, { dueDate: event.target.value, completed: false, completedAt: '' })} /></label>
        {lead && <select aria-label="Change lead stage" value={lead.currentStage} onChange={event => setData(current => ({ ...current, leads: current.leads.map(item => item.leadId === lead.leadId ? { ...item, currentStage: event.target.value, updatedAt: now() } : item) }))}>{LEAD_STAGES.map(item => <option key={item}>{item}</option>)}</select>}
        {lead && <button onClick={() => openLead(lead.leadId)}>Open full record</button>}<button onClick={() => ensureCalendar(followUp)}>Open calendar entry</button>
      </div></article>;
    })}{!groups[section].length && <Empty title={`No ${section.toLowerCase()} follow-ups`} text="Scheduled contacts will appear here automatically." />}</section>
    {noteEditor && <Modal title={noteEditor.complete ? 'Mark contacted' : 'Add follow-up note'} eyebrow={noteEditor.followUp.reason} onClose={() => setNoteEditor(null)}><form className="growth-form compact" onSubmit={saveNote}><label>{noteEditor.complete ? 'Contact note (optional)' : 'Note'}<textarea aria-label="Follow-up note" required={!noteEditor.complete} value={noteText} onChange={event => setNoteText(event.target.value)} autoFocus /></label><footer><button type="button" onClick={() => setNoteEditor(null)}>Cancel</button><button className="primary">{noteEditor.complete ? 'Save and complete' : 'Save note'}</button></footer></form></Modal>}
  </div>;
}

const blankOpportunity = { organization: '', contactPerson: '', phone: '', email: '', address: '', opportunityType: OPPORTUNITY_TYPES[0], dateFirstContacted: '', lastContact: '', nextFollowUp: '', status: 'Researching', estimatedValue: '', notes: '', relatedDocuments: [] };

function OpportunityEditor({ initial, setData, onClose }) {
  const [form, setForm] = useState(initial || blankOpportunity);
  const set = changes => setForm(current => ({ ...current, ...changes }));
  const save = event => { event.preventDefault(); if (!form.organization.trim()) return; const record = createOpportunity({ ...form, updatedAt: now() }); setData(current => ({ ...current, opportunities: initial?.opportunityId ? current.opportunities.map(item => item.opportunityId === initial.opportunityId ? record : item) : [record, ...current.opportunities] })); onClose(); };
  return <Modal title={initial ? 'Edit opportunity' : 'Add organization opportunity'} eyebrow="Commercial growth" onClose={onClose}><form className="growth-form" onSubmit={save}><div className="growth-form-grid"><label>Organization<input required value={form.organization} onChange={event => set({ organization: event.target.value })} /></label><label>Contact person<input value={form.contactPerson} onChange={event => set({ contactPerson: event.target.value })} /></label><label>Phone<input value={form.phone} onChange={event => set({ phone: event.target.value })} /></label><label>Email<input type="email" value={form.email} onChange={event => set({ email: event.target.value })} /></label><label className="wide">Address<input value={form.address} onChange={event => set({ address: event.target.value })} /></label><label>Opportunity type<select value={form.opportunityType} onChange={event => set({ opportunityType: event.target.value })}>{OPPORTUNITY_TYPES.map(item => <option key={item}>{item}</option>)}</select></label><label>Status<select value={form.status} onChange={event => set({ status: event.target.value })}>{OPPORTUNITY_STATUSES.map(item => <option key={item}>{item}</option>)}</select></label><label>First contacted<input type="date" value={form.dateFirstContacted} onChange={event => set({ dateFirstContacted: event.target.value })} /></label><label>Last contact<input type="date" value={form.lastContact} onChange={event => set({ lastContact: event.target.value })} /></label><label>Next follow-up<input type="date" value={form.nextFollowUp} onChange={event => set({ nextFollowUp: event.target.value })} /></label><label>Estimated value<input type="number" min="0" step="0.01" value={form.estimatedValue} onChange={event => set({ estimatedValue: event.target.value })} /></label><label className="wide">Related documents<input value={(form.relatedDocuments || []).join(', ')} onChange={event => set({ relatedDocuments: event.target.value.split(',').map(item => item.trim()).filter(Boolean) })} placeholder="Proposal file or reference" /></label><label className="wide">Notes<textarea value={form.notes} onChange={event => set({ notes: event.target.value })} /></label></div><footer><button type="button" onClick={onClose}>Cancel</button><button className="primary">Save opportunity</button></footer></form></Modal>;
}

function OpportunityCenter({ data, setData }) {
  const [editor, setEditor] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [showArchived, setShowArchived] = useState(false);
  const opportunities = data.opportunities.filter(item => Boolean(item.archived) === showArchived && (status === 'All statuses' || item.status === status) && `${item.organization} ${item.contactPerson} ${item.opportunityType} ${item.notes}`.toLowerCase().includes(search.toLowerCase()));
  const patch = (id, changes) => setData(current => ({ ...current, opportunities: current.opportunities.map(item => item.opportunityId === id ? { ...item, ...changes, updatedAt: now() } : item) }));
  return <div><SectionTitle eyebrow="Organizations and commercial work" title="Opportunity Tracker" text="Build long-term relationships beyond residential inquiries." action={<button className="primary" onClick={() => setEditor({ ...blankOpportunity })}>Add opportunity</button>} /><section className="growth-toolbar panel glass"><input type="search" placeholder="Search organizations" value={search} onChange={event => setSearch(event.target.value)} /><select value={status} onChange={event => setStatus(event.target.value)}><option>All statuses</option>{OPPORTUNITY_STATUSES.map(item => <option key={item}>{item}</option>)}</select><button onClick={() => setShowArchived(value => !value)}>{showArchived ? 'View active' : 'View archived'}</button></section><div className="opportunity-grid">{opportunities.map(item => <article className="panel glass" key={item.opportunityId}><header><span>{item.opportunityType}</span><strong>{money(item.estimatedValue)}</strong></header><h4>{item.organization}</h4><p>{item.contactPerson || 'No contact person yet'} · {item.address || 'No address'}</p><div className="opportunity-contact">{item.phone && <a href={`tel:${item.phone}`}>{item.phone}</a>}{item.email && <a href={`mailto:${item.email}`}>{item.email}</a>}</div><select value={item.status} onChange={event => patch(item.opportunityId, { status: event.target.value })}>{OPPORTUNITY_STATUSES.map(option => <option key={option}>{option}</option>)}</select><dl><div><dt>Last contact</dt><dd>{dateLabel(item.lastContact)}</dd></div><div><dt>Next follow-up</dt><dd>{dateLabel(item.nextFollowUp)}</dd></div></dl>{item.notes && <p className="opportunity-notes">{item.notes}</p>}<footer><button onClick={() => setEditor(item)}>Edit</button><button onClick={() => patch(item.opportunityId, { archived: !item.archived })}>{item.archived ? 'Restore' : 'Archive'}</button><button className="danger" onClick={() => confirm(`Delete ${item.organization}?`) && setData(current => ({ ...current, opportunities: current.opportunities.filter(record => record.opportunityId !== item.opportunityId) }))}>Delete</button></footer></article>)}{!opportunities.length && <Empty title="No opportunities match" text="Add an organization or adjust the filters." />}</div>{editor && <OpportunityEditor initial={editor.opportunityId ? editor : null} setData={setData} onClose={() => setEditor(null)} />}</div>;
}

const blankTemplate = { title: '', channel: 'Email', audience: '', message: '', callToAction: '', relatedService: '', status: 'Draft', favorite: false };

function TemplateEditor({ initial, data, setData, onClose }) {
  const [form, setForm] = useState(initial || blankTemplate);
  const set = changes => setForm(current => ({ ...current, ...changes }));
  const save = event => { event.preventDefault(); if (!form.title.trim() || !form.message.trim()) return; const record = createMarketingTemplate({ ...form, updatedAt: now() }); setData(current => ({ ...current, marketingTemplates: initial?.templateId ? current.marketingTemplates.map(item => item.templateId === initial.templateId ? record : item) : [record, ...current.marketingTemplates] })); onClose(); };
  return <Modal title={initial ? 'Edit marketing template' : 'Create marketing template'} eyebrow="Reusable business copy" onClose={onClose}><form className="growth-form" onSubmit={save}><div className="growth-form-grid"><label className="wide">Title<input required value={form.title} onChange={event => set({ title: event.target.value })} /></label><label>Channel<select value={form.channel} onChange={event => set({ channel: event.target.value })}>{['Facebook', 'Instagram', 'Nextdoor', 'Website', 'Email', 'Door hanger', 'Flyer', 'Other'].map(item => <option key={item}>{item}</option>)}</select></label><label>Audience<input value={form.audience} onChange={event => set({ audience: event.target.value })} /></label><label>Related service<select value={form.relatedService} onChange={event => set({ relatedService: event.target.value })}><option value="">None</option>{data.services.filter(item => !item.archived).map(item => <option key={item.serviceId || item.id} value={item.name}>{item.name}</option>)}</select></label><label>Status<select value={form.status} onChange={event => set({ status: event.target.value })}>{['Draft', 'Ready', 'Used', 'Paused'].map(item => <option key={item}>{item}</option>)}</select></label><label className="wide">Message<textarea required value={form.message} onChange={event => set({ message: event.target.value })} /></label><label className="wide">Call to action<input value={form.callToAction} onChange={event => set({ callToAction: event.target.value })} /></label></div><footer><button type="button" onClick={onClose}>Cancel</button><button className="primary">Save template</button></footer></form></Modal>;
}

const blankCampaign = { name: '', channel: 'Facebook', startDate: localDate(), endDate: '', cost: '', leadsGenerated: '', jobsBooked: '', revenueGenerated: '', notes: '' };

function CampaignEditor({ initial, setData, onClose }) {
  const [form, setForm] = useState(initial || blankCampaign);
  const set = changes => setForm(current => ({ ...current, ...changes }));
  const save = event => { event.preventDefault(); if (!form.name.trim()) return; const record = createCampaign({ ...form, updatedAt: now() }); setData(current => ({ ...current, campaigns: initial?.campaignId ? current.campaigns.map(item => item.campaignId === initial.campaignId ? record : item) : [record, ...current.campaigns] })); onClose(); };
  return <Modal title={initial ? 'Edit campaign' : 'Track a campaign'} eyebrow="Marketing return" onClose={onClose}><form className="growth-form" onSubmit={save}><div className="growth-form-grid"><label className="wide">Campaign name<input required value={form.name} onChange={event => set({ name: event.target.value })} /></label><label>Channel<input value={form.channel} onChange={event => set({ channel: event.target.value })} /></label><label>Cost<input type="number" min="0" step="0.01" value={form.cost} onChange={event => set({ cost: event.target.value })} /></label><label>Start date<input type="date" value={form.startDate} onChange={event => set({ startDate: event.target.value })} /></label><label>End date<input type="date" value={form.endDate} onChange={event => set({ endDate: event.target.value })} /></label><label>Leads generated<input type="number" min="0" value={form.leadsGenerated} onChange={event => set({ leadsGenerated: event.target.value })} /></label><label>Jobs booked<input type="number" min="0" value={form.jobsBooked} onChange={event => set({ jobsBooked: event.target.value })} /></label><label>Revenue generated<input type="number" min="0" step="0.01" value={form.revenueGenerated} onChange={event => set({ revenueGenerated: event.target.value })} /></label><label className="wide">Notes<textarea value={form.notes} onChange={event => set({ notes: event.target.value })} /></label></div><footer><button type="button" onClick={onClose}>Cancel</button><button className="primary">Save campaign</button></footer></form></Modal>;
}

function MarketingCenter({ data, setData }) {
  const [templateEditor, setTemplateEditor] = useState(null);
  const [campaignEditor, setCampaignEditor] = useState(null);
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const templates = data.marketingTemplates.filter(item => !item.archived && (!favoritesOnly || item.favorite) && `${item.title} ${item.channel} ${item.audience} ${item.message}`.toLowerCase().includes(search.toLowerCase()));
  const patchTemplate = (id, changes) => setData(current => ({ ...current, marketingTemplates: current.marketingTemplates.map(item => item.templateId === id ? { ...item, ...changes } : item) }));
  const copy = async item => { try { await navigator.clipboard.writeText(`${item.message}${item.callToAction ? `\n\n${item.callToAction}` : ''}`); patchTemplate(item.templateId, { lastUsed: now(), status: 'Used' }); } catch { alert('Copy was blocked by this browser. Select the message text and copy it manually.'); } };
  return <div><SectionTitle eyebrow="Consistent outreach" title="Marketing Center" text="Reusable copy and simple campaign results—without pretending to publish." action={<div className="section-actions"><button onClick={() => setCampaignEditor({ ...blankCampaign })}>Track campaign</button><button className="primary" onClick={() => setTemplateEditor({ ...blankTemplate })}>Create template</button></div>} />
    <section className="growth-toolbar panel glass"><input type="search" placeholder="Search templates" value={search} onChange={event => setSearch(event.target.value)} /><button className={favoritesOnly ? 'active' : ''} onClick={() => setFavoritesOnly(value => !value)}>★ Favorites</button></section>
    <div className="marketing-grid">{templates.map(item => <article className="panel glass" key={item.templateId}><header><span>{item.channel} · {item.audience || 'General'}</span><button className={item.favorite ? 'favorite' : ''} onClick={() => patchTemplate(item.templateId, { favorite: !item.favorite })} aria-label="Toggle favorite">★</button></header><h4>{item.title}</h4><p>{item.message}</p>{item.callToAction && <strong>{item.callToAction}</strong>}<small>{item.lastUsed ? `Last used ${dateLabel(item.lastUsed)}` : item.builtIn ? 'Built-in starting copy' : 'Not used yet'}</small><footer><button className="primary" onClick={() => copy(item)}>Copy text</button><button onClick={() => setTemplateEditor(item)}>Edit</button><button onClick={() => setData(current => ({ ...current, marketingTemplates: [createMarketingTemplate({ ...item, id: undefined, templateId: undefined, title: `Copy of ${item.title}`, builtIn: false, createdAt: now() }), ...current.marketingTemplates] }))}>Duplicate</button><button onClick={() => patchTemplate(item.templateId, { archived: true })}>Archive</button></footer></article>)}{!templates.length && <Empty title="No templates match" text="Show all templates or create a new one." />}</div>
    <section className="panel glass campaign-panel"><SectionTitle eyebrow="Results" title="Campaign Tracker" text="Compare cost, leads, booked jobs, and recorded revenue." /><div className="campaign-list">{data.campaigns.filter(active).map(item => <article key={item.campaignId}><div><span>{item.channel}</span><h4>{item.name}</h4><p>{dateLabel(item.startDate)} – {dateLabel(item.endDate)}</p></div><dl><div><dt>Cost</dt><dd>{money(item.cost)}</dd></div><div><dt>Leads</dt><dd>{item.leadsGenerated || 0}</dd></div><div><dt>Booked</dt><dd>{item.jobsBooked || 0}</dd></div><div><dt>Revenue</dt><dd>{money(item.revenueGenerated)}</dd></div></dl><div><button onClick={() => setCampaignEditor(item)}>Edit</button><button onClick={() => setData(current => ({ ...current, campaigns: current.campaigns.map(record => record.campaignId === item.campaignId ? { ...record, archived: true } : record) }))}>Archive</button></div></article>)}{!data.campaigns.some(active) && <Empty title="No campaigns tracked" text="Add the next paid or organic outreach effort here." />}</div></section>
    {templateEditor && <TemplateEditor initial={templateEditor.templateId ? templateEditor : null} data={data} setData={setData} onClose={() => setTemplateEditor(null)} />}{campaignEditor && <CampaignEditor initial={campaignEditor.campaignId ? campaignEditor : null} setData={setData} onClose={() => setCampaignEditor(null)} />}
  </div>;
}

const blankReferral = { referrer: '', referredLeadId: '', referralDate: localDate(), outcome: 'Pending', revenueGenerated: '', rewardPromised: '', rewardDelivered: false, notes: '' };

function ReferralEditor({ initial, data, setData, onClose }) {
  const [form, setForm] = useState(initial || blankReferral);
  const set = changes => setForm(current => ({ ...current, ...changes }));
  const save = event => { event.preventDefault(); if (!form.referrer.trim()) return; const record = createReferral({ ...form, updatedAt: now() }); setData(current => ({ ...current, referrals: initial?.referralId ? current.referrals.map(item => item.referralId === initial.referralId ? record : item) : [record, ...current.referrals] })); onClose(); };
  return <Modal title={initial ? 'Edit referral' : 'Add referral'} eyebrow="Word-of-mouth growth" onClose={onClose}><form className="growth-form" onSubmit={save}><div className="growth-form-grid"><label>Referrer<input required value={form.referrer} onChange={event => set({ referrer: event.target.value })} /></label><label>Referred lead<select value={form.referredLeadId} onChange={event => set({ referredLeadId: event.target.value })}><option value="">Not linked</option>{data.leads.map(item => <option key={item.leadId} value={item.leadId}>{item.fullName || item.organizationName}</option>)}</select></label><label>Referral date<input type="date" value={form.referralDate} onChange={event => set({ referralDate: event.target.value })} /></label><label>Outcome<select value={form.outcome} onChange={event => set({ outcome: event.target.value })}>{['Pending', 'Consultation', 'Estimate', 'Booked', 'Completed', 'Lost'].map(item => <option key={item}>{item}</option>)}</select></label><label>Revenue generated<input type="number" min="0" step="0.01" value={form.revenueGenerated} onChange={event => set({ revenueGenerated: event.target.value })} /></label><label>Reward promised<input value={form.rewardPromised} onChange={event => set({ rewardPromised: event.target.value })} /></label><label className="wide referral-check"><input type="checkbox" checked={form.rewardDelivered} onChange={event => set({ rewardDelivered: event.target.checked })} /> Reward delivered</label><label className="wide">Notes<textarea value={form.notes} onChange={event => set({ notes: event.target.value })} /></label></div><footer><button type="button" onClick={onClose}>Cancel</button><button className="primary">Save referral</button></footer></form></Modal>;
}

function ReferralCenter({ data, setData }) {
  const [editor, setEditor] = useState(null);
  const summary = calculateReferralSummary(data.referrals);
  return <div><SectionTitle eyebrow="Relationships that grow" title="Referral Center" text="Track the introduction, its outcome, and every promised thank-you." action={<button className="primary" onClick={() => setEditor({ ...blankReferral })}>Add referral</button>} /><div className="referral-metrics"><Metric label="Total referrals" value={summary.total} note="All active records" /><Metric label="Booked referrals" value={summary.booked} note="Converted work" tone="olive" /><Metric label="Referral revenue" value={money(summary.revenue)} note="Recorded value" /><Metric label="Rewards due" value={summary.unfulfilledRewards} note="Promised, not delivered" tone={summary.unfulfilledRewards ? 'gold' : ''} /></div><div className="referral-layout"><section className="panel glass"><SectionTitle eyebrow="Sources" title="Top referral sources" />{summary.topSources.map(([name, count]) => <div className="referral-source" key={name}><span>{name}</span><strong>{count}</strong></div>)}{!summary.topSources.length && <Empty title="No referral sources yet" text="The first referral will appear here." />}</section><section className="panel glass referral-list">{data.referrals.filter(active).map(item => { const lead = data.leads.find(record => record.leadId === item.referredLeadId); return <article key={item.referralId}><div><span>{item.outcome}</span><h4>{item.referrer}</h4><p>Referred {lead?.fullName || lead?.organizationName || 'unlinked lead'} · {dateLabel(item.referralDate)}</p><small>{item.notes}</small></div><strong>{money(item.revenueGenerated)}</strong><div><label><input type="checkbox" checked={item.rewardDelivered} onChange={event => setData(current => ({ ...current, referrals: current.referrals.map(record => record.referralId === item.referralId ? { ...record, rewardDelivered: event.target.checked } : record) }))} /> Reward delivered</label><button onClick={() => setEditor(item)}>Edit</button><button className="danger" onClick={() => confirm('Delete this referral record?') && setData(current => ({ ...current, referrals: current.referrals.filter(record => record.referralId !== item.referralId) }))}>Delete</button></div></article>; })}{!data.referrals.some(active) && <Empty title="No referrals recorded" text="Add a referrer and link the lead they introduced." />}</section></div>{editor && <ReferralEditor initial={editor.referralId ? editor : null} data={data} setData={setData} onClose={() => setEditor(null)} />}</div>;
}

const blankPortfolio = { projectId: '', projectTitle: '', clientDisplayName: 'Private client', projectType: '', location: '', description: '', servicesPerformed: '', beforePhotoId: '', duringPhotoIds: [], afterPhotoId: '', completionDate: '', featured: false, clientTestimonial: '', permissionStatus: 'Not requested', socialCaption: '', websiteCopy: '' };

function PortfolioEditor({ initial, data, setData, onClose }) {
  const [form, setForm] = useState(initial || blankPortfolio);
  const set = changes => setForm(current => ({ ...current, ...changes }));
  const photos = data.projectPhotos.filter(item => !item.archived && (!form.projectId || item.projectId === form.projectId));
  const chooseProject = projectId => {
    const project = data.projects.find(item => item.projectId === projectId);
    const client = data.clients.find(item => item.clientId === project?.clientId);
    set({ projectId, projectTitle: form.projectTitle || project?.name || '', projectType: form.projectType || project?.name || '', location: form.location || String(project?.propertyAddress || '').split(',').slice(-2).join(',').trim(), completionDate: form.completionDate || project?.targetCompletionDate || '', clientDisplayName: form.clientDisplayName === 'Private client' ? (client ? `${client.name.split(' ')[0]} project` : 'Private client') : form.clientDisplayName });
  };
  const save = event => { event.preventDefault(); if (!form.projectTitle.trim()) return; const record = createPortfolioEntry({ ...form, featured: form.permissionStatus === 'Approved' && form.featured, updatedAt: now() }); setData(current => ({ ...current, portfolioEntries: initial?.portfolioEntryId ? current.portfolioEntries.map(item => item.portfolioEntryId === initial.portfolioEntryId ? record : item) : [record, ...current.portfolioEntries] })); onClose(); };
  return <Modal title={initial ? 'Edit project story' : 'Create portfolio entry'} eyebrow="Privacy-first portfolio" onClose={onClose} wide><form className="growth-form" onSubmit={save}><div className="growth-form-grid"><label>Completed project<select value={form.projectId} onChange={event => chooseProject(event.target.value)}><option value="">Not linked</option>{data.projects.filter(item => !item.archived && item.status === 'Completed').map(item => <option key={item.projectId} value={item.projectId}>{item.projectId} · {item.name}</option>)}</select></label><label>Permission to publish<select value={form.permissionStatus} onChange={event => set({ permissionStatus: event.target.value, featured: event.target.value === 'Approved' ? form.featured : false })}>{PORTFOLIO_PERMISSION_STATUSES.map(item => <option key={item}>{item}</option>)}</select></label><label>Project title<input required value={form.projectTitle} onChange={event => set({ projectTitle: event.target.value })} /></label><label>Client display name<input value={form.clientDisplayName} onChange={event => set({ clientDisplayName: event.target.value })} /></label><label>Project type<input value={form.projectType} onChange={event => set({ projectType: event.target.value })} /></label><label>City / state only<input value={form.location} onChange={event => set({ location: event.target.value })} /></label><label>Completion date<input type="date" value={form.completionDate} onChange={event => set({ completionDate: event.target.value })} /></label><label className="portfolio-check"><input type="checkbox" disabled={form.permissionStatus !== 'Approved'} checked={form.featured} onChange={event => set({ featured: event.target.checked })} /> Featured</label><label className="wide">Project description<textarea value={form.description} onChange={event => set({ description: event.target.value })} /></label><label className="wide">Services performed<textarea value={form.servicesPerformed} onChange={event => set({ servicesPerformed: event.target.value })} /></label><label>Before photo<select value={form.beforePhotoId} onChange={event => set({ beforePhotoId: event.target.value })}><option value="">None</option>{photos.map(item => <option key={item.photoId} value={item.photoId}>{item.label || item.type || item.fileName}</option>)}</select></label><label>After photo<select value={form.afterPhotoId} onChange={event => set({ afterPhotoId: event.target.value })}><option value="">None</option>{photos.map(item => <option key={item.photoId} value={item.photoId}>{item.label || item.type || item.fileName}</option>)}</select></label><label className="wide">During photos<select multiple value={form.duringPhotoIds} onChange={event => set({ duringPhotoIds: Array.from(event.target.selectedOptions, option => option.value) })}>{photos.map(item => <option key={item.photoId} value={item.photoId}>{item.label || item.type || item.fileName}</option>)}</select></label><label className="wide">Client testimonial<textarea value={form.clientTestimonial} onChange={event => set({ clientTestimonial: event.target.value })} /></label><label className="wide">Social-caption draft<textarea value={form.socialCaption} onChange={event => set({ socialCaption: event.target.value })} /></label><label className="wide">Website-copy draft<textarea value={form.websiteCopy} onChange={event => set({ websiteCopy: event.target.value })} /></label></div>{form.permissionStatus !== 'Approved' && <p className="privacy-note">This entry remains private and cannot be featured until permission is explicitly Approved.</p>}<footer><button type="button" onClick={onClose}>Cancel</button><button className="primary">Save project story</button></footer></form></Modal>;
}

function printPortfolio(entry, before, after, business) {
  const win = window.open('', '_blank');
  if (!win) { alert('The printable project sheet was blocked by this browser. Allow pop-ups and try again.'); return; }
  const escape = value => String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
  const image = photo => photo?.image ? `<img src="${escape(photo.image)}" alt="Project photo">` : '';
  win.document.write(`<html><head><title>${escape(entry.projectTitle)}</title><style>body{font:16px Georgia,serif;color:#263127;padding:48px;max-width:900px;margin:auto}h1{color:#52684f}.meta{color:#765f3e}.photos{display:grid;grid-template-columns:1fr 1fr;gap:16px}.photos img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px}blockquote{border-left:4px solid #b39154;padding:12px 18px;background:#fff8ed}@media print{button{display:none}}</style></head><body><h1>${escape(business.name)}</h1><p>${escape(business.tagline)}</p><hr><h2>${escape(entry.projectTitle)}</h2><p class="meta">${escape(entry.projectType)} · ${escape(entry.location)} · ${escape(dateLabel(entry.completionDate))}</p><p>${escape(entry.description)}</p><h3>Services performed</h3><p>${escape(entry.servicesPerformed)}</p><div class="photos">${image(before)}${image(after)}</div>${entry.clientTestimonial ? `<blockquote>${escape(entry.clientTestimonial)}</blockquote>` : ''}<button onclick="window.print()">Print / Save PDF</button></body></html>`);
  win.document.close();
}

function PortfolioCenter({ data, setData }) {
  const [editor, setEditor] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const entries = data.portfolioEntries.filter(active);
  const selected = entries.find(item => item.portfolioEntryId === selectedId) || entries[0];
  const photo = id => data.projectPhotos.find(item => item.photoId === id);
  const copy = async value => { try { await navigator.clipboard.writeText(value); } catch { alert('Copy was blocked. Select the draft and copy it manually.'); } };
  return <div><SectionTitle eyebrow="Completed work, shared carefully" title="Portfolio Builder" text="Turn completed projects into private, permission-aware stories." action={<button className="primary" onClick={() => setEditor({ ...blankPortfolio })}>Create project story</button>} /><div className="portfolio-layout"><section className="portfolio-gallery panel glass"><SectionTitle eyebrow="Gallery" title="Project stories" />{entries.map(item => <button key={item.portfolioEntryId} className={selected?.portfolioEntryId === item.portfolioEntryId ? 'active' : ''} onClick={() => setSelectedId(item.portfolioEntryId)}>{photo(item.afterPhotoId)?.image ? <img src={photo(item.afterPhotoId).image} alt="Finished project" /> : <span aria-hidden="true">❦</span>}<div><strong>{item.projectTitle}</strong><small>{item.location || 'Private location'}</small><em className={item.permissionStatus === 'Approved' ? 'approved' : ''}>{item.permissionStatus}</em></div></button>)}{!entries.length && <Empty title="No portfolio entries" text="Complete a project, confirm permission, and build its story here." />}</section>{selected && <article className="portfolio-story panel glass"><header><div><span>{selected.featured ? 'Featured project' : 'Project story'}</span><h3>{selected.projectTitle}</h3><p>{selected.clientDisplayName} · {selected.location || 'Location kept private'} · {dateLabel(selected.completionDate)}</p></div><em className={selected.permissionStatus === 'Approved' ? 'approved' : ''}>{selected.permissionStatus === 'Approved' ? 'Approved for public use' : 'Private — permission not approved'}</em></header><div className="before-after">{[['Before', photo(selected.beforePhotoId)], ['After', photo(selected.afterPhotoId)]].map(([label, item]) => <figure key={label}>{item?.image ? <img src={item.image} alt={`${label} landscape`} /> : <div>No {label.toLowerCase()} photo</div>}<figcaption>{label}</figcaption></figure>)}</div><p>{selected.description}</p><section><span>Services performed</span><p>{selected.servicesPerformed || 'Not listed'}</p></section>{selected.clientTestimonial && <blockquote>{selected.clientTestimonial}</blockquote>}<div className="portfolio-drafts"><div><span>Social caption</span><p>{selected.socialCaption || 'No draft yet.'}</p><button disabled={!selected.socialCaption} onClick={() => copy(selected.socialCaption)}>Copy</button></div><div><span>Website copy</span><p>{selected.websiteCopy || 'No draft yet.'}</p><button disabled={!selected.websiteCopy} onClick={() => copy(selected.websiteCopy)}>Copy</button></div></div><footer><button onClick={() => printPortfolio(selected, photo(selected.beforePhotoId), photo(selected.afterPhotoId), data.business)}>Printable project sheet</button><button onClick={() => setEditor(selected)}>Edit</button><button onClick={() => setData(current => ({ ...current, portfolioEntries: current.portfolioEntries.map(item => item.portfolioEntryId === selected.portfolioEntryId ? { ...item, archived: true } : item) }))}>Archive</button><button className="danger" onClick={() => confirm('Delete this portfolio entry? Project records and photos will remain.') && setData(current => ({ ...current, portfolioEntries: current.portfolioEntries.filter(item => item.portfolioEntryId !== selected.portfolioEntryId) }))}>Delete</button></footer></article>}</div>{editor && <PortfolioEditor initial={editor.portfolioEntryId ? editor : null} data={data} setData={setData} onClose={() => setEditor(null)} />}</div>;
}

export function GrowthDashboardCards({ data, openGrowth }) {
  const dashboard = calculateGrowthDashboard(data);
  return <section className="growth-dashboard-card glass"><button onClick={() => openGrowth('Overview')}><span aria-hidden="true">↗</span><div><small>Business development</small><h3>Growth District</h3><p>Leads, follow-ups, estimates, and booked work.</p></div><b>Open district →</b></button><div><article><span>Open pipeline</span><strong>{money(dashboard.totalPipelineValue)}</strong><small>{dashboard.newLeads} new leads</small></article><article className={dashboard.overdueFollowUps ? 'urgent' : ''}><span>Follow-ups</span><strong>{dashboard.followUpsDueToday} today</strong><small>{dashboard.overdueFollowUps} overdue</small></article><article><span>Conversion</span><strong>{dashboard.conversionRate.toFixed(0)}%</strong><small>{dashboard.jobsBookedThisMonth} booked this month</small></article><article><span>Outstanding</span><strong>{money(dashboard.outstandingInvoices)}</strong><small>{dashboard.estimatesPending} estimates pending</small></article></div></section>;
}

export function GrowthDistrict({ data, setData, initialTab = 'Overview', requestedLeadId = '', clearLeadRequest = () => {}, openProject, openCalendar, openEstimate }) {
  const [tab, setTab] = useState(initialTab);
  const [leadRequest, setLeadRequest] = useState(requestedLeadId);
  const tabsRef = useRef(null);
  React.useEffect(() => { if (requestedLeadId) { setLeadRequest(requestedLeadId); setTab('Leads'); } }, [requestedLeadId]);
  React.useEffect(() => { if (initialTab && !requestedLeadId) setTab(initialTab); }, [initialTab]);
  useEffect(() => {
    const rail = tabsRef.current;
    const activeTab = rail?.querySelector('[aria-current="page"]');
    if (activeTab && rail.scrollWidth > rail.clientWidth && typeof activeTab.scrollIntoView === 'function') {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [tab]);
  const dashboard = useMemo(() => calculateGrowthDashboard(data), [data]);
  const openLead = leadId => { setLeadRequest(leadId); setTab('Leads'); };
  const tabs = ['Overview', 'Leads', 'Follow-ups', 'Opportunities', 'Marketing', 'Referrals', 'Portfolio'];
  return <div className="page growth-district"><section className="growth-hero glass"><div><span>Client growth and business development</span><h2>Growth District</h2><p>Guide every inquiry from first contact to a well-run, profitable Tierra Fleur project.</p></div><aside><span>Open pipeline</span><strong>{money(dashboard.totalPipelineValue)}</strong><small>{data.leads.filter(item => !item.archived && !['Lost', 'Completed'].includes(item.currentStage)).length} active leads</small></aside></section><nav ref={tabsRef} className="growth-tabs" aria-label="Growth District sections">{tabs.map(item => <button key={item} className={tab === item ? 'active' : ''} aria-current={tab === item ? 'page' : undefined} onClick={() => setTab(item)}>{item}{item === 'Follow-ups' && dashboard.overdueFollowUps > 0 && <span>{dashboard.overdueFollowUps}</span>}</button>)}</nav>
    {tab === 'Overview' && <GrowthOverview data={data} setData={setData} dashboard={dashboard} setTab={setTab} openLead={openLead} openProject={openProject} openCalendar={openCalendar} openEstimate={openEstimate} />}
    {tab === 'Leads' && <LeadCenter data={data} setData={setData} requestedLeadId={leadRequest} clearRequest={() => { setLeadRequest(''); clearLeadRequest(); }} openProject={openProject} openEstimate={openEstimate} setTab={setTab} />}
    {tab === 'Follow-ups' && <FollowUpCenter data={data} setData={setData} openLead={openLead} openCalendar={openCalendar} />}
    {tab === 'Opportunities' && <OpportunityCenter data={data} setData={setData} />}
    {tab === 'Marketing' && <MarketingCenter data={data} setData={setData} />}
    {tab === 'Referrals' && <ReferralCenter data={data} setData={setData} />}
    {tab === 'Portfolio' && <PortfolioCenter data={data} setData={setData} />}
  </div>;
}
