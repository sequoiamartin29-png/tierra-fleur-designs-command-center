import React, { useMemo, useState } from 'react';
import {
  COMPLETION_ITEMS,
  PASSPORT_STATUSES,
  PROJECT_HEALTH_STATUSES,
  PROJECT_PLANT_STATUSES,
  PROJECT_TASK_CATEGORIES,
  PROJECT_TASK_STATUSES,
  addTimelineEvent,
  calculateProjectFinancials,
  getCompletionReadiness,
  getProjectHealth,
  projectEventTitle,
  upsertProjectPlant,
} from './projectEngine.js';
import './projectWorkspace.css';

const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const number = value => Number(value || 0);
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(number(value));
const dateLabel = value => value ? new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not scheduled';

function eventState(current, event) {
  return addTimelineEvent(current, {
    ...event,
    title: event.title || projectEventTitle(event.eventType),
    automatic: event.automatic !== false,
  });
}

export function ProjectHealthBanner({ data, project, setData }) {
  const health = getProjectHealth(data, project);
  const patch = healthStatus => setData(current => ({
    ...current,
    projects: current.projects.map(item => item.projectId === project.projectId ? { ...item, healthStatus } : item),
  }));
  return <section className={`project-health-banner health-${health.official.toLowerCase().replaceAll(' ', '-')}`}>
    <div><span>Project Health</span><strong>{health.official}</strong><small>{health.warnings.length ? `${health.warnings.length} suggested warning${health.warnings.length === 1 ? '' : 's'}` : 'Connected records look healthy'}</small></div>
    <label>Official health
      <select value={health.official} onChange={event => patch(event.target.value)}>{PROJECT_HEALTH_STATUSES.map(item => <option key={item}>{item}</option>)}</select>
    </label>
    <div className="project-health-suggestions">
      {health.suggested !== health.official && <p><b>Suggested:</b> {health.suggested}. Your official selection will not change without confirmation.</p>}
      {health.warnings.map(item => <p key={item}>✦ {item}</p>)}
    </div>
  </section>;
}

export function Phase4DashboardCards({ data, openProject }) {
  const todayValue = today();
  const month = todayValue.slice(0, 7);
  const projects = data.projects.filter(item => !item.archived);
  const healthRows = projects.map(project => ({ project, health: getProjectHealth(data, project) }));
  const tasks = data.projectTasks.filter(item => !item.archived && item.status !== 'Completed');
  const upcoming = tasks.filter(item => item.dueDate && item.dueDate >= todayValue).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const recent = data.projectTimeline.filter(item => !item.archived).sort((a, b) => String(b.dateTime || b.date).localeCompare(String(a.dateTime || a.date)));
  const balances = projects.map(project => ({ project, total: calculateProjectFinancials(data, project.projectId).outstandingBalance })).filter(item => item.total > 0);
  const cards = [
    ['Active projects', projects.filter(item => item.status !== 'Completed').length, projects.find(item => item.status !== 'Completed')?.projectId, 'Open Project Hubs'],
    ['Waiting on clients', healthRows.filter(item => item.health.official === 'Waiting on Client' || item.health.suggested === 'Waiting on Client').length, healthRows.find(item => item.health.official === 'Waiting on Client' || item.health.suggested === 'Waiting on Client')?.project.projectId, 'Approvals or decisions'],
    ['Waiting on plants', healthRows.filter(item => item.health.official === 'Waiting on Plants' || item.health.suggested === 'Waiting on Plants').length, healthRows.find(item => item.health.official === 'Waiting on Plants' || item.health.suggested === 'Waiting on Plants')?.project.projectId, 'Orders and arrivals'],
    ['Financial attention', healthRows.filter(item => item.health.official === 'Financial Attention' || item.health.suggested === 'Financial Attention').length, healthRows.find(item => item.health.official === 'Financial Attention' || item.health.suggested === 'Financial Attention')?.project.projectId, 'Balances or budget'],
    ['Upcoming tasks', upcoming.length, upcoming[0]?.projectId, upcoming[0] ? `${upcoming[0].title} · ${dateLabel(upcoming[0].dueDate)}` : 'Schedule is clear'],
    ['Recent activity', recent.length, recent[0]?.projectId, recent[0]?.title || 'No activity yet'],
    ['Awaiting sourcing', data.projectPlants.filter(item => !item.archived && ['Approved', 'To Source'].includes(item.status)).length, data.projectPlants.find(item => !item.archived && ['Approved', 'To Source'].includes(item.status))?.projectId, 'Approved project plants'],
    ['Awaiting installation', data.projectPlants.filter(item => !item.archived && item.status === 'Received').length, data.projectPlants.find(item => !item.archived && item.status === 'Received')?.projectId, 'Received and ready'],
    ['Completed this month', data.projects.filter(item => item.status === 'Completed' && String(item.completedAt || '').slice(0, 7) === month).length, data.projects.find(item => item.status === 'Completed' && String(item.completedAt || '').slice(0, 7) === month)?.projectId, 'Finished with history preserved'],
    ['Outstanding balances', money(balances.reduce((sum, item) => sum + item.total, 0)), balances[0]?.project.projectId, `${balances.length} project${balances.length === 1 ? '' : 's'}`],
  ];
  return <section className="living-dashboard">
    <div className="living-dashboard-heading"><div><span>Living Project Engine</span><h3>Every project, gently in motion</h3></div><small>Connected by project ID</small></div>
    <div className="living-dashboard-grid">{cards.map(([label, value, projectId, note]) => <button key={label} disabled={!projectId} onClick={() => projectId && openProject(projectId)}>
      <span>{label}</span><strong>{value}</strong><small>{note}</small>
    </button>)}</div>
  </section>;
}

function PlantPlan({ data, setData, project }) {
  const blank = { plantName: '', scientificName: '', category: 'Plant', quantity: 1, clientPrice: '', installationLocation: '', status: 'Proposed', notes: '' };
  const [form, setForm] = useState(blank);
  const [sourceType, setSourceType] = useState('Manual entry');
  const [sourceId, setSourceId] = useState('');
  const [expenseDrafts, setExpenseDrafts] = useState({});
  const clientId = project.clientId;
  const plants = data.projectPlants.filter(item => item.projectId === project.projectId && !item.archived);
  const designPlants = data.designPlants.filter(item => !item.archived && item.approved);
  const sources = data.sourcingRecords.filter(item => item.projectId === project.projectId && !item.archived);
  const patchPlant = (projectPlantId, changes, eventType = '') => setData(current => {
    const existing = current.projectPlants.find(item => item.projectPlantId === projectPlantId);
    const updatedPlant = existing ? { ...existing, ...changes, updatedAt: now(), archived: changes.status === 'Archived' ? true : existing.archived } : null;
    let next = {
      ...current,
      projectPlants: current.projectPlants.map(item => item.projectPlantId === projectPlantId ? updatedPlant : item),
      sourcingRecords: current.sourcingRecords.map(item => (item.sourcingRecordId || item.id) === existing?.sourcingRecordId ? {
        ...item,
        nurseryId: updatedPlant.nurseryId,
        unitCost: updatedPlant.unitCost,
        estimatedCost: number(updatedPlant.unitCost) * number(updatedPlant.quantity),
        shippingCost: updatedPlant.shippingCost,
        orderDate: updatedPlant.orderDate,
        expectedArrivalDate: updatedPlant.expectedArrivalDate,
        receiptReference: updatedPlant.receiptReference,
        notes: updatedPlant.nurseryNotes,
        status: ['Ordered', 'Received'].includes(updatedPlant.status) ? updatedPlant.status : item.status,
      } : item),
    };
    if (eventType && existing) {
      next = eventState(next, {
        projectId: project.projectId,
        eventType,
        description: `${existing.plantName} is now ${changes.status || eventType.split('.').at(-1)}.`,
        relatedRecordId: projectPlantId,
        dedupeKey: `${eventType}:${projectPlantId}:${changes.status || ''}`,
      });
    }
    return next;
  });
  const addPlant = event => {
    event.preventDefault();
    let source = {};
    if (sourceType === 'Design District Plant Palette') {
      const plant = designPlants.find(item => item.plantId === sourceId);
      if (!plant) return;
      source = { plantName: plant.commonName, scientificName: plant.scientificName, category: plant.category, nurseryId: plant.nurseryId, sourcingRecordId: plant.sourcingRecordId, designPlantId: plant.plantId };
    } else if (sourceType === 'Plant Sourcing District') {
      const record = sources.find(item => (item.sourcingRecordId || item.id) === sourceId);
      if (!record) return;
      source = { plantName: record.plant, category: 'Plant', nurseryId: record.nurseryId, sourcingRecordId: record.sourcingRecordId || record.id, unitCost: record.unitCost || record.estimatedCost };
    } else if (!form.plantName.trim()) return;
    setData(current => {
      const result = upsertProjectPlant(current, { ...form, ...source, projectId: project.projectId, clientId });
      let next = result.state;
      if (source.sourcingRecordId) {
        next = { ...next, sourcingRecords: next.sourcingRecords.map(item => (item.sourcingRecordId || item.id) === source.sourcingRecordId ? { ...item, projectPlantId: result.record.projectPlantId } : item) };
      }
      if (result.created) {
        next = eventState(next, {
          projectId: project.projectId,
          eventType: 'plant.added',
          description: `${result.record.plantName} was added to the Project Plant Plan.`,
          relatedRecordId: result.record.projectPlantId,
          dedupeKey: `plant.added:${result.record.projectPlantId}`,
        });
      }
      return next;
    });
    setForm(blank);
    setSourceId('');
  };
  const changeStatus = (plant, status) => {
    const changes = { status };
    if (status === 'Installed' && !plant.installationDate) changes.installationDate = today();
    const type = status === 'Ordered' ? 'plant.ordered' : status === 'Received' ? 'plant.received' : '';
    patchPlant(plant.projectPlantId, changes, type);
  };
  const createSource = plant => setData(current => {
    if (plant.sourcingRecordId) return current;
    const sourcingRecordId = uid('source-record');
    let next = {
      ...current,
      sourcingRecords: [{
        id: sourcingRecordId,
        sourcingRecordId,
        projectId: project.projectId,
        projectPlantId: plant.projectPlantId,
        nurseryId: plant.nurseryId,
        plant: plant.plantName,
        quantity: plant.quantity,
        unitCost: plant.unitCost,
        estimatedCost: number(plant.unitCost) * number(plant.quantity),
        shippingCost: plant.shippingCost,
        orderDate: plant.orderDate,
        expectedArrivalDate: plant.expectedArrivalDate,
        receiptReference: plant.receiptReference,
        notes: plant.nurseryNotes,
        status: 'Requested',
        createdAt: now(),
        archived: false,
      }, ...current.sourcingRecords],
      projectPlants: current.projectPlants.map(item => item.projectPlantId === plant.projectPlantId ? { ...item, sourcingRecordId, status: item.status === 'Approved' ? 'To Source' : item.status } : item),
    };
    return eventState(next, {
      projectId: project.projectId,
      eventType: 'sourcing.linked',
      description: `A sourcing request was created for ${plant.plantName}.`,
      relatedRecordId: sourcingRecordId,
      dedupeKey: `sourcing.linked:${sourcingRecordId}`,
    });
  });
  const linkSource = (plant, sourcingRecordId) => {
    if (!sourcingRecordId) return;
    const record = data.sourcingRecords.find(item => (item.sourcingRecordId || item.id) === sourcingRecordId);
    if (!record) return;
    setData(current => {
      const duplicate = current.projectPlants.find(item => item.projectId === project.projectId && item.sourcingRecordId === sourcingRecordId && item.projectPlantId !== plant.projectPlantId);
      if (duplicate) return current;
      let next = {
        ...current,
        projectPlants: current.projectPlants.map(item => item.projectPlantId === plant.projectPlantId ? {
          ...item,
          sourcingRecordId,
          nurseryId: record.nurseryId || item.nurseryId,
          unitCost: record.unitCost || record.estimatedCost || item.unitCost,
        } : item),
        sourcingRecords: current.sourcingRecords.map(item => (item.sourcingRecordId || item.id) === sourcingRecordId ? { ...item, projectPlantId: plant.projectPlantId } : item),
      };
      return eventState(next, {
        projectId: project.projectId,
        eventType: 'sourcing.linked',
        description: `Existing sourcing record linked to ${plant.plantName}.`,
        relatedRecordId: sourcingRecordId,
        dedupeKey: `sourcing.linked:${sourcingRecordId}:${plant.projectPlantId}`,
      });
    });
  };
  const confirmExpense = plant => {
    const amount = number(expenseDrafts[plant.projectPlantId] || (number(plant.unitCost) * number(plant.quantity) + number(plant.shippingCost)));
    if (!amount) return;
    setData(current => {
      const existing = current.businessTransactions.find(item => item.relatedRecordId === plant.projectPlantId && item.type === 'Expense' && !item.archived);
      if (existing) return current;
      const transactionId = uid('txn-business');
      const shippingAmount = Math.min(amount, number(plant.shippingCost));
      const plantAmount = Math.max(0, amount - shippingAmount);
      const receiptId = plant.receiptReference ? uid('receipt') : '';
      const plantTransaction = {
        id: transactionId,
        transactionId,
        type: 'Expense',
        taxCategory: 'Plants',
        amount: plantAmount,
        date: today(),
        dueDate: '',
        status: 'Paid',
        paymentMethod: 'Not specified',
        clientId,
        projectId: project.projectId,
        projectPlantId: plant.projectPlantId,
        relatedRecordId: plant.projectPlantId,
        nurseryId: plant.nurseryId,
        receiptReference: plant.receiptReference,
        receiptId,
        notes: `${plant.quantity} × ${plant.plantName}`,
        archived: false,
      };
      const shippingTransactionId = uid('txn-business');
      const shippingTransaction = shippingAmount > 0 ? {
        ...plantTransaction,
        id: shippingTransactionId,
        transactionId: shippingTransactionId,
        taxCategory: 'Nursery Shipping',
        amount: shippingAmount,
        receiptId: '',
        notes: `Nursery shipping for ${plant.plantName}`,
      } : null;
      let next = {
        ...current,
        businessTransactions: [plantTransaction, ...(shippingTransaction ? [shippingTransaction] : []), ...current.businessTransactions],
        projectPlants: current.projectPlants.map(item => item.projectPlantId === plant.projectPlantId ? { ...item, purchaseConfirmed: true } : item),
      };
      next = eventState(next, {
        projectId: project.projectId,
        eventType: 'expense.added',
        description: `${money(amount)} plant purchase confirmed for ${plant.plantName}.`,
        relatedRecordId: transactionId,
        dedupeKey: `expense.added:${transactionId}`,
      });
      if (plant.receiptReference) next = eventState(next, {
        projectId: project.projectId,
        eventType: 'receipt.attached',
        description: `Receipt reference attached to ${plant.plantName}.`,
        relatedRecordId: transactionId,
        dedupeKey: `receipt.attached:${transactionId}`,
      });
      return next;
    });
  };
  return <div className="living-stack">
    <form className="panel glass living-form" onSubmit={addPlant}>
      <div className="living-form-title"><span>One connected planting record</span><h3>Add to the Project Plant Plan</h3></div>
      <label>Add from<select value={sourceType} onChange={event => { setSourceType(event.target.value); setSourceId(''); }}>{['Manual entry', 'Design District Plant Palette', 'Plant Sourcing District'].map(item => <option key={item}>{item}</option>)}</select></label>
      {sourceType === 'Design District Plant Palette' && <label>Approved plant<select required value={sourceId} onChange={event => setSourceId(event.target.value)}><option value="">Choose a plant</option>{designPlants.map(item => <option key={item.plantId} value={item.plantId}>{item.commonName} · {item.scientificName}</option>)}</select></label>}
      {sourceType === 'Plant Sourcing District' && <label>Sourcing record<select required value={sourceId} onChange={event => setSourceId(event.target.value)}><option value="">Choose a record</option>{sources.map(item => <option key={item.sourcingRecordId || item.id} value={item.sourcingRecordId || item.id}>{item.plant} · {item.status}</option>)}</select></label>}
      {sourceType === 'Manual entry' && <><label>Plant name<input required value={form.plantName} onChange={event => setForm({ ...form, plantName: event.target.value })} /></label><label>Scientific name<input value={form.scientificName} onChange={event => setForm({ ...form, scientificName: event.target.value })} /></label><label>Category<input value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} /></label></>}
      <label>Quantity<input type="number" min="1" value={form.quantity} onChange={event => setForm({ ...form, quantity: event.target.value })} /></label>
      <label>Installation location<input value={form.installationLocation} onChange={event => setForm({ ...form, installationLocation: event.target.value })} /></label>
      <label>Client price<input type="number" min="0" step="0.01" value={form.clientPrice} onChange={event => setForm({ ...form, clientPrice: event.target.value })} /></label>
      <label>Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}>{PROJECT_PLANT_STATUSES.filter(item => item !== 'Archived').map(item => <option key={item}>{item}</option>)}</select></label>
      <label className="wide">Notes<textarea value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></label>
      <button className="primary">Add connected plant</button>
    </form>
    <section className="living-plant-grid">{plants.map(plant => {
      const nursery = data.nurseries.find(item => (item.nurseryId || item.id) === plant.nurseryId);
      const linkedSource = data.sourcingRecords.find(item => (item.sourcingRecordId || item.id) === plant.sourcingRecordId);
      const expenseExists = data.businessTransactions.some(item => item.relatedRecordId === plant.projectPlantId && item.type === 'Expense' && !item.archived);
      return <article className="living-plant-card glass" key={plant.projectPlantId}>
        <div className="living-record-head"><div><span>{plant.category} · {plant.status}</span><h3>{plant.plantName}</h3><em>{plant.scientificName || 'Scientific name not added'}</em></div><strong>× {plant.quantity}</strong></div>
        <div className="living-plant-facts"><span>Location <b>{plant.installationLocation || 'Open'}</b></span><span>Nursery <b>{nursery?.name || 'Not selected'}</b></span><span>Unit cost <b>{money(plant.unitCost)}</b></span><span>Client price <b>{money(plant.clientPrice)}</b></span></div>
        <label>Status<select value={plant.status} onChange={event => changeStatus(plant, event.target.value)}>{PROJECT_PLANT_STATUSES.filter(item => item !== 'Archived').map(item => <option key={item}>{item}</option>)}</select></label>
        <details className="living-sourcing-details"><summary>Sourcing & purchase details</summary>
          <div className="living-detail-grid">
            <label>Nursery<select value={plant.nurseryId} onChange={event => patchPlant(plant.projectPlantId, { nurseryId: event.target.value })}><option value="">Select nursery</option>{data.nurseries.filter(item => !item.archived).map(item => <option key={item.nurseryId || item.id} value={item.nurseryId || item.id}>{item.name}</option>)}</select></label>
            <label>Link existing sourcing record<select value={plant.sourcingRecordId} onChange={event => linkSource(plant, event.target.value)}><option value="">Not linked</option>{sources.map(item => <option key={item.sourcingRecordId || item.id} value={item.sourcingRecordId || item.id}>{item.plant} · {item.status}</option>)}</select></label>
            <label>Unit cost<input type="number" min="0" step="0.01" value={plant.unitCost} onChange={event => patchPlant(plant.projectPlantId, { unitCost: event.target.value })} /></label>
            <label>Shipping<input type="number" min="0" step="0.01" value={plant.shippingCost} onChange={event => patchPlant(plant.projectPlantId, { shippingCost: event.target.value })} /></label>
            <label>Installation location<input value={plant.installationLocation} onChange={event => patchPlant(plant.projectPlantId, { installationLocation: event.target.value })} /></label>
            <label>Order date<input type="date" value={plant.orderDate} onChange={event => patchPlant(plant.projectPlantId, { orderDate: event.target.value })} /></label>
            <label>Expected arrival<input type="date" value={plant.expectedArrivalDate} onChange={event => patchPlant(plant.projectPlantId, { expectedArrivalDate: event.target.value })} /></label>
            <label>Receipt reference<input value={plant.receiptReference} onChange={event => patchPlant(plant.projectPlantId, { receiptReference: event.target.value })} /></label>
            <label>Warranty expiration<input type="date" value={plant.warrantyExpiration} onChange={event => patchPlant(plant.projectPlantId, { warrantyExpiration: event.target.value })} /></label>
            <label className="wide">Nursery notes<textarea value={plant.nurseryNotes} onChange={event => patchPlant(plant.projectPlantId, { nurseryNotes: event.target.value })} /></label>
          </div>
          <div className="living-action-row">
            {!linkedSource && <button onClick={() => createSource(plant)}>Create sourcing request</button>}
            <button onClick={() => changeStatus(plant, 'Ordered')}>Mark ordered</button>
            <button onClick={() => changeStatus(plant, 'Received')}>Mark received</button>
          </div>
          <div className="living-confirm-expense"><label>Confirmed purchase amount<input type="number" min="0" step="0.01" value={expenseDrafts[plant.projectPlantId] ?? ''} placeholder={String(number(plant.unitCost) * number(plant.quantity) + number(plant.shippingCost) || '')} onChange={event => setExpenseDrafts(current => ({ ...current, [plant.projectPlantId]: event.target.value }))} /></label><button className="primary" disabled={expenseExists} onClick={() => confirmExpense(plant)}>{expenseExists ? 'Expense confirmed' : 'Confirm plant expense'}</button></div>
        </details>
        <div className="living-action-row"><button onClick={() => patchPlant(plant.projectPlantId, { status: 'Archived', archived: true }, '')}>Archive plant record</button></div>
      </article>;
    })}{!plants.length && <div className="living-empty"><span>❦</span><h3>The Plant Plan is ready.</h3><p>Add a manual plant or carry one in from Design or Plant Sourcing.</p></div>}</section>
  </div>;
}

function ProjectTasks({ data, setData, project }) {
  const blank = { title: '', description: '', dueDate: '', priority: 'Medium', status: 'Not Started', category: 'Other', relatedRecordId: '', notes: '' };
  const [form, setForm] = useState(blank);
  const tasks = data.projectTasks.filter(item => item.projectId === project.projectId && !item.archived);
  const add = event => {
    event.preventDefault();
    if (!form.title.trim()) return;
    const taskId = uid('project-task');
    setData(current => ({ ...current, projectTasks: [{ ...form, id: taskId, taskId, projectId: project.projectId, clientId: project.clientId, completionDate: '', createdAt: now(), archived: false }, ...current.projectTasks] }));
    setForm(blank);
  };
  const patch = (task, status) => setData(current => {
    const completionDate = status === 'Completed' ? now() : '';
    let next = { ...current, projectTasks: current.projectTasks.map(item => item.taskId === task.taskId ? { ...item, status, completionDate, archived: status === 'Archived' } : item) };
    if (status === 'Completed') next = eventState(next, {
      projectId: project.projectId,
      eventType: 'task.completed',
      description: task.title,
      relatedRecordId: task.taskId,
      dedupeKey: `task.completed:${task.taskId}`,
    });
    return next;
  });
  return <div className="living-two-column">
    <form className="panel glass living-form vertical" onSubmit={add}><div className="living-form-title"><span>Project-specific action</span><h3>Add a project task</h3></div>
      <label>Title<input required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></label>
      <label>Description<textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
      <label>Due date<input type="date" value={form.dueDate} onChange={event => setForm({ ...form, dueDate: event.target.value })} /></label>
      <label>Priority<select value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value })}>{['High', 'Medium', 'Low'].map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>{PROJECT_TASK_CATEGORIES.map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}>{PROJECT_TASK_STATUSES.filter(item => item !== 'Archived').map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Related record<select value={form.relatedRecordId} onChange={event => setForm({ ...form, relatedRecordId: event.target.value })}><option value="">No related record</option>{data.projectPlants.filter(item => item.projectId === project.projectId && !item.archived).map(item => <option key={item.projectPlantId} value={item.projectPlantId}>Plant · {item.plantName}</option>)}</select></label>
      <label>Notes<textarea value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></label>
      <button className="primary">Save project task</button>
    </form>
    <section className="living-card-list">{tasks.map(task => <article className="glass" key={task.taskId}><div><span>{task.category} · {task.priority}</span><h3>{task.title}</h3><p>{task.description || task.notes || 'No additional detail'}</p><small>{dateLabel(task.dueDate)}</small></div><select value={task.status} onChange={event => patch(task, event.target.value)}>{PROJECT_TASK_STATUSES.map(item => <option key={item}>{item}</option>)}</select></article>)}{!tasks.length && <div className="living-empty"><h3>No project tasks yet.</h3><p>Add project-specific work without mixing it into unrelated business tasks.</p></div>}</section>
  </div>;
}

function PlantPassports({ data, setData, project }) {
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [form, setForm] = useState({ cultivar: '', warrantyInformation: '', careInstructions: '', sunRequirement: '', waterRequirement: '', matureSize: '', maintenanceNotes: '' });
  const [replacementId, setReplacementId] = useState('');
  const [replacement, setReplacement] = useState({ reason: '', replacementName: '', underWarranty: false, cost: '' });
  const installedPlants = data.projectPlants.filter(item => item.projectId === project.projectId && !item.archived && ['Installed', 'Replaced'].includes(item.status));
  const passports = data.plantPassports.filter(item => item.projectId === project.projectId && !item.archived);
  const selectedPlant = installedPlants.find(item => item.projectPlantId === selectedPlantId);
  const createPassport = event => {
    event.preventDefault();
    if (!selectedPlant || passports.some(item => item.projectPlantId === selectedPlant.projectPlantId)) return;
    const nursery = data.nurseries.find(item => (item.nurseryId || item.id) === selectedPlant.nurseryId);
    const passportId = uid('passport');
    const record = {
      ...form,
      id: passportId,
      passportId,
      projectPlantId: selectedPlant.projectPlantId,
      projectId: project.projectId,
      clientId: project.clientId,
      commonName: selectedPlant.plantName,
      scientificName: selectedPlant.scientificName,
      nursery: nursery?.name || '',
      purchaseDate: selectedPlant.orderDate,
      installationDate: selectedPlant.installationDate,
      installationLocation: selectedPlant.installationLocation,
      quantity: selectedPlant.quantity,
      purchaseCost: selectedPlant.unitCost,
      clientPrice: selectedPlant.clientPrice,
      warrantyInformation: form.warrantyInformation || (selectedPlant.warrantyExpiration ? `Warranty through ${dateLabel(selectedPlant.warrantyExpiration)}` : ''),
      installationPhoto: '',
      currentStatus: 'Installed',
      replacementHistory: [],
      createdAt: now(),
      archived: false,
    };
    setData(current => eventState({ ...current, plantPassports: [record, ...current.plantPassports] }, {
      projectId: project.projectId,
      eventType: 'passport.created',
      description: `Plant Passport created for ${record.commonName}.`,
      relatedRecordId: passportId,
      dedupeKey: `passport.created:${passportId}`,
    }));
    setSelectedPlantId('');
  };
  const patchPassport = (passportId, changes) => setData(current => ({ ...current, plantPassports: current.plantPassports.map(item => item.passportId === passportId ? { ...item, ...changes } : item) }));
  const replacePlant = event => {
    event.preventDefault();
    const passport = passports.find(item => item.passportId === replacementId);
    const originalPlant = data.projectPlants.find(item => item.projectPlantId === passport?.projectPlantId);
    if (!passport || !originalPlant || !replacement.reason.trim()) return;
    const replacementPlantId = uid('project-plant');
    const replacementPassportId = uid('passport');
    const replacementRecordId = uid('replacement');
    const replacementName = replacement.replacementName.trim() || originalPlant.plantName;
    setData(current => {
      const history = {
        id: replacementRecordId,
        replacementId: replacementRecordId,
        projectId: project.projectId,
        clientId: project.clientId,
        originalPassportId: passport.passportId,
        originalProjectPlantId: originalPlant.projectPlantId,
        replacementPassportId,
        replacementProjectPlantId: replacementPlantId,
        replacementDate: today(),
        reason: replacement.reason.trim(),
        underWarranty: replacement.underWarranty,
        cost: replacement.cost,
        createdAt: now(),
        archived: false,
      };
      const newPlant = { ...originalPlant, id: replacementPlantId, projectPlantId: replacementPlantId, plantName: replacementName, status: 'Installed', installationDate: today(), unitCost: replacement.cost, createdAt: now(), updatedAt: now(), archived: false };
      const newPassport = { ...passport, id: replacementPassportId, passportId: replacementPassportId, projectPlantId: replacementPlantId, commonName: replacementName, purchaseCost: replacement.cost, installationDate: today(), currentStatus: 'Installed', replacementHistory: [], createdAt: now(), archived: false };
      let next = {
        ...current,
        projectPlants: [newPlant, ...current.projectPlants.map(item => item.projectPlantId === originalPlant.projectPlantId ? { ...item, status: 'Replaced' } : item)],
        plantPassports: [newPassport, ...current.plantPassports.map(item => item.passportId === passport.passportId ? { ...item, currentStatus: 'Replaced', replacementHistory: [replacementRecordId, ...(item.replacementHistory || [])] } : item)],
        plantReplacementHistory: [history, ...current.plantReplacementHistory],
      };
      next = eventState(next, {
        projectId: project.projectId,
        eventType: 'plant.replaced',
        description: `${passport.commonName} was replaced${replacement.underWarranty ? ' under warranty' : ''}: ${replacement.reason}.`,
        relatedRecordId: replacementRecordId,
        dedupeKey: `plant.replaced:${replacementRecordId}`,
      });
      return eventState(next, {
        projectId: project.projectId,
        eventType: 'passport.created',
        description: `Replacement passport created for ${replacementName}.`,
        relatedRecordId: replacementPassportId,
        dedupeKey: `passport.created:${replacementPassportId}`,
      });
    });
    setReplacementId('');
    setReplacement({ reason: '', replacementName: '', underWarranty: false, cost: '' });
  };
  return <div className="living-stack">
    <form className="panel glass living-form" onSubmit={createPassport}><div className="living-form-title"><span>Installed plant record</span><h3>Create a Plant Passport</h3></div>
      <label>Installed plant<select required value={selectedPlantId} onChange={event => setSelectedPlantId(event.target.value)}><option value="">Choose an installed plant</option>{installedPlants.filter(plant => !passports.some(item => item.projectPlantId === plant.projectPlantId)).map(plant => <option key={plant.projectPlantId} value={plant.projectPlantId}>{plant.plantName} · {plant.installationLocation || 'Location open'}</option>)}</select></label>
      <label>Cultivar<input value={form.cultivar} onChange={event => setForm({ ...form, cultivar: event.target.value })} /></label>
      <label>Sun requirement<input value={form.sunRequirement} onChange={event => setForm({ ...form, sunRequirement: event.target.value })} /></label>
      <label>Water requirement<input value={form.waterRequirement} onChange={event => setForm({ ...form, waterRequirement: event.target.value })} /></label>
      <label>Mature size<input value={form.matureSize} onChange={event => setForm({ ...form, matureSize: event.target.value })} /></label>
      <label className="wide">Warranty information<textarea value={form.warrantyInformation} onChange={event => setForm({ ...form, warrantyInformation: event.target.value })} /></label>
      <label className="wide">Care instructions<textarea value={form.careInstructions} onChange={event => setForm({ ...form, careInstructions: event.target.value })} /></label>
      <label className="wide">Maintenance notes<textarea value={form.maintenanceNotes} onChange={event => setForm({ ...form, maintenanceNotes: event.target.value })} /></label>
      <button className="primary">Create from installed plant</button>
    </form>
    <section className="passport-grid">{passports.map(passport => <article className="passport-card glass" key={passport.passportId}>
      <div className="passport-seal">TF</div><span>{passport.currentStatus}</span><h3>{passport.commonName}</h3><em>{passport.scientificName || 'Scientific name open'} {passport.cultivar && `· ${passport.cultivar}`}</em>
      <dl><div><dt>Installed</dt><dd>{dateLabel(passport.installationDate)}</dd></div><div><dt>Location</dt><dd>{passport.installationLocation || 'Open'}</dd></div><div><dt>Nursery</dt><dd>{passport.nursery || 'Open'}</dd></div><div><dt>Warranty</dt><dd>{passport.warrantyInformation || 'Not recorded'}</dd></div></dl>
      <label>Status<select value={passport.currentStatus} onChange={event => patchPassport(passport.passportId, { currentStatus: event.target.value, archived: event.target.value === 'Archived' })}>{PASSPORT_STATUSES.map(item => <option key={item}>{item}</option>)}</select></label>
      {passport.careInstructions && <p><b>Care:</b> {passport.careInstructions}</p>}
      <button onClick={() => setReplacementId(passport.passportId)}>Record replacement</button>
    </article>)}</section>
    {replacementId && <form className="panel glass replacement-form" onSubmit={replacePlant}><div><span>Preserve the original record</span><h3>Record plant replacement</h3></div><label>Replacement plant name<input value={replacement.replacementName} onChange={event => setReplacement({ ...replacement, replacementName: event.target.value })} /></label><label>Replacement date<input value={today()} readOnly /></label><label>Cost<input type="number" min="0" step="0.01" value={replacement.cost} onChange={event => setReplacement({ ...replacement, cost: event.target.value })} /></label><label className="wide">Reason<textarea required value={replacement.reason} onChange={event => setReplacement({ ...replacement, reason: event.target.value })} /></label><label className="check"><input type="checkbox" checked={replacement.underWarranty} onChange={event => setReplacement({ ...replacement, underWarranty: event.target.checked })} /> Replacement was under warranty</label><div><button type="button" onClick={() => setReplacementId('')}>Cancel</button><button className="primary">Preserve original and create replacement</button></div></form>}
  </div>;
}

function ProjectDocuments({ data, project, openEstimates, openFinance }) {
  const documents = data.estimates.filter(item => item.projectId === project.projectId && !item.archived);
  const receipts = [...data.businessTransactions, ...data.expenses].filter(item => item.projectId === project.projectId && !item.archived && (item.receipt || item.receiptReference || item.receiptId));
  const photos = data.projectPhotos.filter(item => item.projectId === project.projectId && !item.archived);
  return <div className="project-document-columns">
    <section className="panel glass"><div className="living-section-head"><div><span>Original records</span><h3>Estimates & Invoices</h3></div><button onClick={openEstimates}>Open District</button></div>{documents.map(item => <article className="living-document-row" key={item.id}><div><span>{item.documentType} · {item.status}</span><strong>{item.title}</strong><small>{item.estimateId || item.invoiceId || item.id}</small></div><b>{money(item.total)}</b></article>)}{!documents.length && <p className="living-muted">No connected documents.</p>}</section>
    <section className="panel glass"><div className="living-section-head"><div><span>One receipt, referenced here</span><h3>Receipts</h3></div><button onClick={openFinance}>Open Finance</button></div>{receipts.map(item => <article className="living-document-row" key={item.transactionId || item.id}><div><span>{item.receiptName || item.receiptReference || 'Receipt'}</span><strong>{item.vendor || item.taxCategory || 'Project purchase'}</strong><small>{item.receiptId || item.transactionId}</small></div>{item.receipt ? <a href={item.receipt} target="_blank" rel="noreferrer">Open</a> : <b>{money(item.amount)}</b>}</article>)}{!receipts.length && <p className="living-muted">No connected receipts.</p>}</section>
    <section className="panel glass"><div className="living-section-head"><div><span>Visual project records</span><h3>Photos & Files</h3></div><b>{photos.length}</b></div>{photos.slice(0, 8).map(item => <article className="living-document-row" key={item.id}><div><span>{item.stage}</span><strong>{item.caption || item.fileName}</strong><small>{dateLabel(item.photoDate || item.createdAt)}</small></div></article>)}{!photos.length && <p className="living-muted">No project photos.</p>}</section>
  </div>;
}

function CompletionChecklist({ data, setData, project }) {
  const readiness = getCompletionReadiness(data, project);
  const stored = data.projectCompletions.find(item => item.projectId === project.projectId);
  const [checklist, setChecklist] = useState(stored?.checklist || {});
  const [waiverNotes, setWaiverNotes] = useState(stored?.waiverNotes || {});
  const [notice, setNotice] = useState('');
  const [confirming, setConfirming] = useState(false);
  const save = (nextChecklist = checklist, nextWaivers = waiverNotes) => setData(current => {
    const existing = current.projectCompletions.find(item => item.projectId === project.projectId);
    const record = { id: existing?.id || uid('completion'), completionId: existing?.completionId || uid('completion-record'), projectId: project.projectId, clientId: project.clientId, checklist: nextChecklist, waiverNotes: nextWaivers, updatedAt: now(), archived: false };
    return { ...current, projectCompletions: existing ? current.projectCompletions.map(item => item.projectId === project.projectId ? record : item) : [record, ...current.projectCompletions] };
  });
  const toggle = key => {
    const next = { ...checklist, [key]: checklist[key] === 'complete' ? '' : 'complete' };
    setChecklist(next);
    save(next, waiverNotes);
  };
  const waive = key => {
    if (!waiverNotes[key]?.trim()) return;
    const next = { ...checklist, [key]: 'waived' };
    setChecklist(next);
    save(next, waiverNotes);
  };
  const unresolved = COMPLETION_ITEMS.filter(([key]) => !readiness[key] && !['complete', 'waived'].includes(checklist[key]));
  const completeProject = () => {
    if (unresolved.length) {
      setNotice(`${unresolved.length} item${unresolved.length === 1 ? '' : 's'} still need review or a waiver note.`);
      return;
    }
    setConfirming(true);
  };
  const finalizeCompletion = () => {
    setData(current => {
      const completedAt = now();
      const completionRecord = current.projectCompletions.find(item => item.projectId === project.projectId);
      const completedRecord = completionRecord
        ? { ...completionRecord, checklist, waiverNotes, completedAt, updatedAt: completedAt }
        : { id: uid('completion'), completionId: uid('completion-record'), projectId: project.projectId, clientId: project.clientId, checklist, waiverNotes, completedAt, updatedAt: completedAt, archived: false };
      let next = {
        ...current,
        projects: current.projects.map(item => item.projectId === project.projectId ? { ...item, status: 'Completed', healthStatus: 'Completed', completedAt } : item),
        projectCompletions: completionRecord ? current.projectCompletions.map(item => item.projectId === project.projectId ? completedRecord : item) : [completedRecord, ...current.projectCompletions],
      };
      return eventState(next, {
        projectId: project.projectId,
        eventType: 'project.completed',
        description: 'Project completion was confirmed after checklist review.',
        relatedRecordId: project.projectId,
        dedupeKey: `project.completed:${project.projectId}`,
      });
    });
    setConfirming(false);
    setNotice('Project completed. Add a follow-up task or use Presentation Mode below.');
  };
  const createFollowUp = () => setData(current => {
    if (current.projectTasks.some(item => item.projectId === project.projectId && item.category === 'Follow-Up' && !item.archived)) return current;
    const taskId = uid('project-task');
    return { ...current, projectTasks: [{ id: taskId, taskId, projectId: project.projectId, clientId: project.clientId, title: `Follow up on ${project.name}`, description: 'Check plant performance and client satisfaction.', dueDate: '', priority: 'Medium', status: 'Not Started', category: 'Follow-Up', relatedRecordId: project.projectId, notes: '', completionDate: '', createdAt: now(), archived: false }, ...current.projectTasks] };
  });
  return <div className="completion-layout">
    <section className="panel glass completion-intro"><span>Complete Project</span><h3>Review the living project before closing the work.</h3><p>Connected records stay intact. A missing item can be completed or explicitly waived with a note; the project will not archive automatically.</p>{notice && <div className="completion-notice" role="status">{notice}</div>}</section>
    <section className="completion-list">{COMPLETION_ITEMS.map(([key, label]) => {
      const connected = readiness[key];
      const state = connected ? 'connected' : checklist[key];
      return <article className={`glass completion-row ${state || 'open'}`} key={key}>
        <div><span>{connected ? '✓ Connected record confirms this item' : state === 'waived' ? 'Waived with note' : state === 'complete' ? 'Marked reviewed' : 'Needs review'}</span><h4>{label}</h4></div>
        {!connected && <div className="completion-controls"><button onClick={() => toggle(key)}>{checklist[key] === 'complete' ? 'Undo review' : 'Mark reviewed'}</button><input placeholder="Waiver note" value={waiverNotes[key] || ''} onChange={event => setWaiverNotes(current => ({ ...current, [key]: event.target.value }))} /><button onClick={() => waive(key)}>Waive</button></div>}
      </article>;
    })}</section>
    {confirming && <section className="panel glass completion-confirm" role="alert"><div><strong>Complete {project.projectId}?</strong><p>All linked records will be preserved, the completion date will be recorded, and this project will remain unarchived.</p></div><div><button onClick={() => setConfirming(false)}>Keep project open</button><button className="primary" onClick={finalizeCompletion}>Complete and preserve records</button></div></section>}
    <section className="panel glass completion-actions"><button className="primary" onClick={completeProject}>Confirm Project Completion</button>{project.status === 'Completed' && <><button onClick={createFollowUp}>Create follow-up task</button><button onClick={() => window.print()}>Presentation Mode</button></>}</section>
  </div>;
}

export function LivingProjectSections({ tab, data, setData, project, openEstimates, openFinance }) {
  if (tab === 'Plant Plan') return <PlantPlan data={data} setData={setData} project={project} />;
  if (tab === 'Estimates & Invoices') return <ProjectDocuments data={data} project={project} openEstimates={openEstimates} openFinance={openFinance} />;
  if (tab === 'Documents') return <ProjectDocuments data={data} project={project} openEstimates={openEstimates} openFinance={openFinance} />;
  if (tab === 'Tasks') return <ProjectTasks data={data} setData={setData} project={project} />;
  if (tab === 'Plant Passports') return <PlantPassports data={data} setData={setData} project={project} />;
  if (tab === 'Completion Checklist') return <CompletionChecklist data={data} setData={setData} project={project} />;
  return null;
}

export function ClientProjectHistory({ data, client, openProject }) {
  const projects = data.projects.filter(project => project.clientId === (client.clientId || client.id));
  if (!projects.length) return <p className="living-muted">No connected history yet.</p>;
  return <details className="client-history">
    <summary>View complete client history</summary>
    <div>{projects.map(project => {
      const events = data.projectTimeline.filter(item => item.projectId === project.projectId && !item.archived);
      const concepts = data.designConcepts.filter(item => item.projectId === project.projectId && !item.archived);
      const documents = data.estimates.filter(item => item.projectId === project.projectId && !item.archived);
      const payments = data.businessTransactions.filter(item => item.projectId === project.projectId && ['Client Payment', 'Deposit'].includes(item.type) && !item.archived);
      const plants = data.projectPlants.filter(item => item.projectId === project.projectId && !item.archived);
      const passports = data.plantPassports.filter(item => item.projectId === project.projectId && !item.archived);
      const notes = data.projectNotes.filter(item => item.projectId === project.projectId && !item.archived);
      const photos = data.projectPhotos.filter(item => item.projectId === project.projectId && !item.archived);
      const maintenance = data.projectTasks.filter(item => item.projectId === project.projectId && item.category === 'Maintenance' && !item.archived);
      return <article key={project.projectId}><button onClick={() => openProject(project.projectId)}><span>{project.projectId} · {project.status}</span><strong>{project.name}</strong></button><div>{[
        ['Designs', concepts.length],
        ['Documents', documents.length],
        ['Payments', payments.length],
        ['Installed plants', plants.filter(item => item.status === 'Installed').length],
        ['Plant Passports', passports.length],
        ['Maintenance', maintenance.length],
        ['Notes', notes.length],
        ['Photos', photos.length],
        ['Timeline', events.length],
      ].map(([label, value]) => <span key={label}>{label} <b>{value}</b></span>)}</div></article>;
    })}</div>
  </details>;
}

export function FinanceSummaryCards({ data, projectId }) {
  const finance = useMemo(() => calculateProjectFinancials(data, projectId), [data, projectId]);
  const rows = [
    ['Estimated client revenue', finance.estimatedClientRevenue],
    ['Approved client revenue', finance.approvedClientRevenue],
    ['Deposits', finance.deposits],
    ['Payments received', finance.paymentsReceived],
    ['Outstanding balance', finance.outstandingBalance],
    ['Plant costs', finance.plantCosts],
    ['Material costs', finance.materialCosts],
    ['Nursery shipping', finance.nurseryShipping],
    ['Labor cost', finance.laborCost],
    ['Mileage cost', finance.mileageCost],
    ['Delivery cost', finance.deliveryCost],
    ['Other expenses', finance.otherExpenses],
    ['Total project cost', finance.totalProjectCost],
    ['Net profit', finance.netProfit],
    ['Profit margin', `${finance.profitMargin.toFixed(1)}%`],
  ];
  return <section className="living-finance-grid">{rows.map(([label, value]) => <article key={label}><span>{label}</span><strong>{typeof value === 'number' ? money(value) : value}</strong></article>)}</section>;
}
