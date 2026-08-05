import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEstimateTotals,
  calculateGrowthDashboard,
  completeLeadFollowUp,
  convertLeadToBusiness,
  createGrowthStarter,
  findDuplicateClients,
  migrateEstimateDocuments,
  migrateGrowthData,
  repairLeadFollowUpCalendarLinks,
  scheduleLeadFollowUp,
} from './growthEngine.js';
import { calculateProjectFinancials } from './projectEngine.js';

test('growth migration preserves stable IDs and adds missing collections without replacing records', () => {
  const migrated = migrateGrowthData({
    leads: [{ id: 'lead-existing', name: 'Sample Lead', stage: 'Contacted', notes: 'Keep this note' }],
    marketingTemplates: [{ id: 'marketing-email-intro', title: 'My edited introduction', message: 'Saved copy' }],
  });
  assert.equal(migrated.leads[0].leadId, 'lead-existing');
  assert.equal(migrated.leads[0].fullName, 'Sample Lead');
  assert.equal(migrated.leads[0].notes, 'Keep this note');
  assert.equal(migrated.marketingTemplates.find(item => item.templateId === 'marketing-email-intro').title, 'My edited introduction');
  assert.ok(migrated.marketingTemplates.length >= 14);
  assert.deepEqual(migrated.followUps, []);
});

test('growth dashboard calculates live pipeline, follow-ups, conversion, and outstanding invoices', () => {
  const data = {
    ...createGrowthStarter(),
    leads: [
      { leadId: 'lead-new', currentStage: 'New Lead', estimatedJobValue: 2000, archived: false },
      { leadId: 'lead-booked', currentStage: 'Booked', estimatedJobValue: 5000, bookedAt: '2026-08-03T12:00:00Z', archived: false },
      { leadId: 'lead-lost', currentStage: 'Lost', estimatedJobValue: 9000, archived: false },
    ],
    followUps: [
      { followUpId: 'today', dueDate: '2026-08-05', completed: false, archived: false, reason: 'Today' },
      { followUpId: 'late', dueDate: '2026-08-04', completed: false, archived: false, reason: 'Late' },
    ],
    estimates: [{ id: 'invoice-1', invoiceId: 'invoice-1', documentType: 'Invoice', status: 'Sent', total: 1200, paymentsReceived: 200, archived: false }],
    businessTransactions: [],
    projects: [],
  };
  const summary = calculateGrowthDashboard(data, '2026-08-05');
  assert.equal(summary.newLeads, 1);
  assert.equal(summary.followUpsDueToday, 1);
  assert.equal(summary.overdueFollowUps, 1);
  assert.equal(summary.totalPipelineValue, 7000);
  assert.equal(summary.expectedBookedRevenue, 5000);
  assert.equal(summary.conversionRate, 50);
  assert.equal(summary.outstandingInvoices, 1000);
});

test('duplicate checking uses contact fields rather than names alone', () => {
  const clients = [
    { clientId: 'client-1', name: 'Same Name', email: 'person@example.com', phone: '(302) 555-0123', address: '1 Garden Lane' },
    { clientId: 'client-2', name: 'Same Name', email: 'different@example.com', phone: '3025559999', address: '2 Garden Lane' },
  ];
  const matches = findDuplicateClients({ fullName: 'Same Name', email: 'PERSON@example.com', phone: '302-555-0123', serviceAddress: '1  Garden Lane' }, clients);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].client.clientId, 'client-1');
  assert.deepEqual(matches[0].reasons.sort(), ['address', 'email', 'phone']);
  assert.equal(findDuplicateClients({ fullName: 'Same Name' }, clients).length, 0);
});

test('lead conversion links the existing record graph and does not duplicate a chosen client', () => {
  const data = {
    ...createGrowthStarter(),
    leads: [{ leadId: 'lead-1', id: 'lead-1', fullName: 'Sample Lead', phone: '3025550101', email: 'lead@example.com', serviceAddress: '5 Orchard Way', serviceRequested: 'Micro-orchard installation', leadSource: 'Referral', referralSource: 'Neighbor', dateReceived: '2026-08-01', currentStage: 'Booked', estimatedJobValue: 8000, notes: 'Keep history' }],
    clients: [{ clientId: 'client-existing', id: 'client-existing', name: 'Existing Client', phone: '3025550101', archived: false }],
    projects: [], estimates: [{ id: 'estimate-1', leadId: 'lead-1' }], followUps: [{ followUpId: 'follow-1', leadId: 'lead-1' }],
    projectPhotos: [{ photoId: 'photo-1', leadId: 'lead-1', imageAttachmentId: 'attachment-1' }], calendarEvents: [],
  };
  const converted = convertLeadToBusiness(data, 'lead-1', { clientId: 'client-existing', createClient: false, createProject: true });
  assert.equal(converted.clients.length, 1);
  assert.equal(converted.projects.length, 1);
  assert.match(converted.projects[0].projectId, /^TFD-\d{4}-001$/);
  assert.equal(converted.leads[0].clientId, 'client-existing');
  assert.equal(converted.leads[0].projectId, converted.projects[0].projectId);
  assert.equal(converted.estimates[0].clientId, 'client-existing');
  assert.equal(converted.followUps[0].projectId, converted.projects[0].projectId);
  assert.equal(converted.projectPhotos[0].imageAttachmentId, 'attachment-1');
});

test('estimate calculations honor quantities, markup, taxable lines, discounts, and deposits', () => {
  const totals = calculateEstimateTotals([
    { description: 'Plants', quantity: 2, cost: 100, markup: 50, taxable: true },
    { description: 'Design', quantity: 1, customerPrice: 200, cost: 50, taxable: false },
  ], { discountAmount: 50, taxRate: 10, depositPercent: 25, paymentsReceived: 100 });
  assert.equal(totals.subtotal, 500);
  assert.equal(totals.estimatedCost, 250);
  assert.equal(totals.tax, 27);
  assert.equal(totals.total, 477);
  assert.equal(totals.depositDue, 119.25);
  assert.equal(totals.balanceDue, 377);
});

test('legacy estimates remain compatible while gaining the professional fields', () => {
  const [estimate] = migrateEstimateDocuments([{ id: 'legacy', title: 'Legacy quote', status: 'Approved', lines: [{ id: 'line', description: 'Consultation', qty: 2, price: 125 }], total: 250 }]);
  assert.equal(estimate.id, 'legacy');
  assert.equal(estimate.lines[0].id, 'line');
  assert.equal(estimate.lines[0].quantity, 2);
  assert.equal(estimate.lines[0].customerPrice, 125);
  assert.equal(estimate.total, 250);
  assert.ok(estimate.estimateNumber);
});

test('follow-up scheduling creates a linked calendar entry and completion updates both', () => {
  const data = { ...createGrowthStarter(), leads: [{ leadId: 'lead-1', fullName: 'Sample Lead', currentStage: 'Contacted', priorityLevel: 'High' }], calendarEvents: [] };
  const scheduled = scheduleLeadFollowUp(data, { leadId: 'lead-1', reason: 'Discuss estimate', dueDate: '2026-08-08', startTime: '10:30' });
  assert.equal(scheduled.followUps.length, 1);
  assert.equal(scheduled.calendarEvents.length, 1);
  assert.equal(scheduled.calendarEvents[0].group, 'tierra');
  assert.equal(scheduled.calendarEvents[0].leadId, 'lead-1');
  assert.equal(scheduled.calendarEvents[0].relatedRecordType, 'lead');
  assert.equal(scheduled.calendarEvents[0].relatedRecordId, 'lead-1');
  assert.equal(scheduled.calendarEvents[0].startTime, '10:30');
  assert.equal(scheduled.calendarEvents[0].endTime, '11:00');
  assert.equal(scheduled.leads[0].nextFollowUpDate, '2026-08-08');
  const completed = completeLeadFollowUp(scheduled, scheduled.followUps[0].followUpId, 'Spoke with client');
  assert.equal(completed.followUps[0].completed, true);
  assert.equal(completed.calendarEvents[0].completed, true);
  assert.match(completed.leads[0].notes, /Spoke with client/);

  const retried = scheduleLeadFollowUp(scheduled, { followUpId: scheduled.followUps[0].followUpId, leadId: 'lead-1', reason: 'Discuss estimate', dueDate: '2026-08-08', startTime: '10:30' });
  assert.equal(retried.followUps.length, 1);
  assert.equal(retried.calendarEvents.length, 1);
});

test('follow-up calendar repair relinks legacy events in place without creating duplicates', () => {
  const data = {
    ...createGrowthStarter(),
    leads: [{ leadId: 'lead-legacy', fullName: 'Legacy Garden Lead', clientId: 'client-legacy', projectId: 'TFD-2026-003' }],
    followUps: [{ followUpId: 'follow-legacy', leadId: 'lead-legacy', dueDate: '2026-08-09', reason: 'Review scope' }],
    calendarEvents: [
      { calendarEventId: 'event-legacy', eventType: 'Lead Follow-up', title: 'Follow up · Legacy Garden Lead', followUpId: 'follow-legacy', relatedRecordId: 'follow-legacy' },
      { calendarEventId: 'event-unrelated', eventType: 'Personal', title: 'Keep me unchanged' },
    ],
  };
  const repaired = repairLeadFollowUpCalendarLinks(data);
  assert.equal(repaired.calendarEvents.length, 2);
  assert.equal(repaired.calendarEvents[0].calendarEventId, 'event-legacy');
  assert.equal(repaired.calendarEvents[0].leadId, 'lead-legacy');
  assert.equal(repaired.calendarEvents[0].relatedRecordType, 'lead');
  assert.equal(repaired.calendarEvents[0].relatedRecordId, 'lead-legacy');
  assert.equal(repaired.calendarEvents[0].followUpId, 'follow-legacy');
  assert.equal(repaired.calendarEvents[0].clientId, 'client-legacy');
  assert.equal(repaired.calendarEvents[0].projectId, 'TFD-2026-003');
  assert.strictEqual(repaired.calendarEvents[1], data.calendarEvents[1]);
  assert.deepEqual(repairLeadFollowUpCalendarLinks(repaired).calendarEvents, repaired.calendarEvents);
});

test('project finance separates estimated and actual profit without counting invoices as received revenue', () => {
  const data = {
    projects: [{ projectId: 'TFD-2026-001', profitPlan: {} }],
    businessTransactions: [
      { transactionId: 'deposit', projectId: 'TFD-2026-001', invoiceId: 'invoice-1', type: 'Deposit', status: 'Paid', amount: 500, archived: false },
      { transactionId: 'plants', projectId: 'TFD-2026-001', type: 'Expense', status: 'Paid', taxCategory: 'Plants', amount: 200, archived: false },
      { transactionId: 'equipment', projectId: 'TFD-2026-001', type: 'Expense', status: 'Paid', taxCategory: 'Equipment', amount: 100, archived: false },
    ],
    expenses: [],
    estimates: [
      { id: 'estimate-1', estimateId: 'estimate-1', projectId: 'TFD-2026-001', documentType: 'Estimate', status: 'Accepted', total: 2000, archived: false },
      { id: 'invoice-1', invoiceId: 'invoice-1', projectId: 'TFD-2026-001', documentType: 'Invoice', status: 'Partially Paid', total: 2000, archived: false },
    ],
  };
  const finance = calculateProjectFinancials(data, 'TFD-2026-001');
  assert.equal(finance.clientRevenue, 500);
  assert.equal(finance.approvedClientRevenue, 2000);
  assert.equal(finance.equipmentCost, 100);
  assert.equal(finance.totalProjectCost, 300);
  assert.equal(finance.actualProfit, 200);
  assert.equal(finance.estimatedProfit, 1700);
  assert.equal(finance.outstandingBalance, 1500);
});
