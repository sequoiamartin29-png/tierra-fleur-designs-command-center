import test from 'node:test';
import assert from 'node:assert/strict';
import {
  actualShiftHours,
  applyRecurringEdit,
  calendarSummary,
  createCalendarEvent,
  detectConflicts,
  estimatedGrossPay,
  expandCalendarEvents,
  migrateCalendarData,
  scheduledShiftHours,
} from './calendarEngine.js';

const event = values => createCalendarEvent({ title: 'Codex Calendar Test', ...values });

test('calculates an unpaid break and gross pay', () => {
  const shift = event({ eventType: 'Work Shift', group: 'work', date: '2026-08-03', startTime: '08:00', endTime: '16:30', breakMinutes: 30, breakPaid: false, hourlyRate: 20 });
  assert.equal(scheduledShiftHours(shift), 8);
  assert.equal(estimatedGrossPay(shift), 160);
  assert.equal(shift.totalScheduledHours, 8);
  assert.equal(shift.estimatedGrossPay, 160);
});

test('paid breaks remain in scheduled hours', () => {
  const shift = event({ eventType: 'Work Shift', group: 'work', date: '2026-08-03', startTime: '08:00', endTime: '16:30', breakMinutes: 30, breakPaid: true });
  assert.equal(scheduledShiftHours(shift), 8.5);
});

test('supports an overnight shift', () => {
  const shift = event({ eventType: 'Work Shift', group: 'work', date: '2026-08-03', startTime: '22:00', endTime: '06:00', breakMinutes: 30, completed: true });
  assert.equal(scheduledShiftHours(shift), 7.5);
  assert.equal(actualShiftHours(shift), 7.5);
});

test('summarizes multiple jobs without duplicating recurring occurrences', () => {
  const shifts = [
    event({ calendarEventId: 'shift-a', eventType: 'Work Shift', group: 'work', jobId: 'job-a', jobName: 'Codex Calendar Test Job A', date: '2026-08-02', startTime: '08:00', endTime: '16:00', hourlyRate: 20, completed: true }),
    event({ calendarEventId: 'shift-b', eventType: 'Work Shift', group: 'work', jobId: 'job-b', jobName: 'Codex Calendar Test Job B', date: '2026-08-03', startTime: '09:00', endTime: '13:00', hourlyRate: 15, completed: true }),
  ];
  const summary = calendarSummary(shifts, [], '2026-08-02', '2026-08-08');
  assert.equal(summary.scheduledHours, 12);
  assert.equal(summary.actualHours, 12);
  assert.equal(summary.grossPay, 220);
  assert.equal(summary.byJob.length, 2);
});

test('expands a recurring class deterministically across refresh-like migrations', () => {
  const recurring = event({ calendarEventId: 'class-series', eventType: 'School Class', schoolEventType: 'Class', group: 'school', date: '2026-08-03', startTime: '10:00', endTime: '11:00', recurrence: { frequency: 'Weekly', count: 4, weekdays: [] } });
  const once = expandCalendarEvents([recurring], '2026-08-01', '2026-09-01');
  const migrated = migrateCalendarData(migrateCalendarData({ calendarEvents: [recurring] }));
  const twice = expandCalendarEvents(migrated.calendarEvents, '2026-08-01', '2026-09-01');
  assert.equal(once.length, 4);
  assert.deepEqual(twice.map(item => item.occurrenceKey), once.map(item => item.occurrenceKey));
});

test('detects overlapping work and school events but does not block the model', () => {
  const shift = event({ eventType: 'Work Shift', group: 'work', date: '2026-08-03', startTime: '08:00', endTime: '16:00' });
  const lab = event({ eventType: 'Lab', schoolEventType: 'Lab', group: 'school', date: '2026-08-03', startTime: '14:00', endTime: '16:30' });
  const conflicts = detectConflicts(lab, [shift]);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].event.title, 'Codex Calendar Test');
});

test('tracks classes, labs, homework, exams, and study time in monthly summaries', () => {
  const school = [
    event({ eventType: 'School Class', schoolEventType: 'Class', group: 'school', date: '2026-08-03', startTime: '09:00', endTime: '10:30' }),
    event({ eventType: 'Lab', schoolEventType: 'Lab', group: 'school', date: '2026-08-04', startTime: '13:00', endTime: '15:00' }),
    event({ eventType: 'Homework', schoolEventType: 'Homework', group: 'school', date: '2026-08-05', dueDate: '2026-08-05', assignedDate: '2026-08-01' }),
    event({ eventType: 'Exam', schoolEventType: 'Exam', group: 'school', date: '2026-08-06', dueDate: '2026-08-06' }),
    event({ eventType: 'Study Session', schoolEventType: 'Study Session', group: 'school', date: '2026-08-07', startTime: '18:00', endTime: '20:00' }),
  ];
  const summary = calendarSummary(school, [], '2026-08-01', '2026-08-31');
  assert.equal(summary.schoolHours, 3.5);
  assert.equal(summary.studyHours, 2);
  assert.equal(summary.assignmentsDue, 1);
  assert.equal(summary.exams, 1);
  assert.equal(summary.labs, 1);
});

test('detects an assignment deadline that falls during a shift', () => {
  const shift = event({ eventType: 'Work Shift', group: 'work', date: '2026-08-03', startTime: '08:00', endTime: '16:00' });
  const assignment = event({ eventType: 'Assignment', schoolEventType: 'Assignment', group: 'school', date: '2026-08-03', dueDate: '2026-08-03', dueTime: '12:00' });
  assert.equal(detectConflicts(assignment, [shift]).length, 1);
});

test('edits one recurring occurrence without creating duplicate display keys', () => {
  const recurring = event({ calendarEventId: 'study-series', eventType: 'Study Session', schoolEventType: 'Study Session', group: 'school', date: '2026-08-03', startTime: '18:00', endTime: '19:00', recurrence: { frequency: 'Weekly', count: 3 } });
  const occurrence = expandCalendarEvents([recurring], '2026-08-10', '2026-08-10')[0];
  const edited = applyRecurringEdit([recurring], occurrence, { title: 'Codex Calendar Test Edited Study' }, 'This event only');
  const expanded = expandCalendarEvents(edited, '2026-08-01', '2026-08-31');
  assert.equal(expanded.length, 3);
  assert.equal(new Set(expanded.map(item => item.occurrenceKey)).size, 3);
  assert.equal(expanded.filter(item => item.title.includes('Edited')).length, 1);
});
