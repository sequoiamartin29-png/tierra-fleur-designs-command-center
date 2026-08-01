const records = value => Array.isArray(value) ? value : [];
const number = value => Number(value || 0);
const uid = prefix => `${prefix}-${crypto.randomUUID()}`;

export const CALENDAR_EVENT_TYPES = [
  'Work Shift',
  'School Class',
  'Lab',
  'Homework',
  'Assignment',
  'Exam',
  'Study Session',
  'Appointment',
  'Tierra Fleur',
  'Personal',
  'Bill Reminder',
  'Other',
];

export const SCHOOL_EVENT_TYPES = [
  'Class',
  'Lab',
  'Homework',
  'Assignment',
  'Discussion Post',
  'Reading',
  'Study Session',
  'Exam',
  'Quiz',
  'Project',
  'Presentation',
  'Advising',
  'Other',
];

export const ASSIGNMENT_STATUSES = ['Not Started', 'In Progress', 'Submitted', 'Graded', 'Late', 'Completed', 'Archived'];
export const SHIFT_TYPES = ['Regular', 'Overtime', 'Training', 'On Call', 'Orientation', 'Meeting', 'Other'];
export const RECURRENCE_OPTIONS = ['None', 'Daily', 'Weekly', 'Every two weeks', 'Monthly', 'Custom weekdays'];
export const EVENT_PRIORITIES = ['High', 'Medium', 'Low'];
export const JOB_COLORS = ['#52684f', '#9c6b70', '#b08a4f', '#667991', '#7d698c', '#5d8880', '#9a765c'];

export function localDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(value) {
  const [year, month, day] = String(value || localDate()).slice(0, 10).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
}

export function addDays(value, amount) {
  const date = parseDate(value);
  date.setDate(date.getDate() + amount);
  return localDate(date);
}

export function addMonths(value, amount) {
  const source = parseDate(value);
  const wantedDay = source.getDate();
  source.setDate(1);
  source.setMonth(source.getMonth() + amount);
  const lastDay = new Date(source.getFullYear(), source.getMonth() + 1, 0).getDate();
  source.setDate(Math.min(wantedDay, lastDay));
  return localDate(source);
}

export function dateDifference(from, to) {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86400000);
}

export function startOfWeek(value, weekStartsOn = 0) {
  const date = parseDate(value);
  const offset = (date.getDay() - Number(weekStartsOn || 0) + 7) % 7;
  return addDays(value, -offset);
}

export function endOfWeek(value, weekStartsOn = 0) {
  return addDays(startOfWeek(value, weekStartsOn), 6);
}

export function startOfMonth(value) {
  return `${String(value).slice(0, 7)}-01`;
}

export function endOfMonth(value) {
  const date = parseDate(startOfMonth(value));
  return localDate(new Date(date.getFullYear(), date.getMonth() + 1, 0, 12));
}

export function enumerateDates(start, end) {
  const dates = [];
  for (let date = start; date <= end && dates.length < 1500; date = addDays(date, 1)) dates.push(date);
  return dates;
}

function inferGroup(event = {}) {
  if (event.group) return event.group;
  if (event.eventType === 'Work Shift' || event.shiftId || event.jobId) return 'work';
  if (event.eventType === 'Tierra Fleur') return 'tierra';
  if (event.courseId || event.assignmentId || SCHOOL_EVENT_TYPES.includes(event.schoolEventType) || ['School Class', 'Lab', 'Homework', 'Assignment', 'Exam', 'Study Session'].includes(event.eventType)) return 'school';
  return 'personal';
}

function normalizeRecurrence(recurrence, event = {}) {
  const source = recurrence && typeof recurrence === 'object' ? recurrence : {};
  const legacyFrequency = typeof recurrence === 'string' ? recurrence : event.recurrenceFrequency;
  const frequency = RECURRENCE_OPTIONS.includes(source.frequency || legacyFrequency) ? (source.frequency || legacyFrequency) : 'None';
  return {
    frequency,
    interval: Math.max(1, Number(source.interval || (frequency === 'Every two weeks' ? 2 : 1))),
    weekdays: records(source.weekdays).map(Number).filter(day => day >= 0 && day <= 6),
    endDate: source.endDate || event.recurrenceEndDate || '',
    count: source.count || event.recurrenceCount || '',
    excludedDates: [...new Set(records(source.excludedDates).filter(Boolean))],
  };
}

function normalizeJob(item = {}, index = 0) {
  const jobId = item.jobId || item.id || uid('job');
  return {
    ...item,
    id: item.id || jobId,
    jobId,
    jobName: item.jobName || item.name || 'Untitled job',
    employer: item.employer || '',
    roleTitle: item.roleTitle || item.role || item.title || '',
    color: item.color || JOB_COLORS[index % JOB_COLORS.length],
    defaultHourlyRate: item.defaultHourlyRate ?? item.hourlyRate ?? '',
    defaultShiftStartTime: item.defaultShiftStartTime || item.defaultStartTime || '09:00',
    defaultShiftEndTime: item.defaultShiftEndTime || item.defaultEndTime || '17:00',
    defaultBreakLength: Math.max(0, Number(item.defaultBreakLength ?? item.breakMinutes ?? 0)),
    active: item.active !== false && !item.archived,
    notes: item.notes || '',
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
  };
}

function normalizeCourse(item = {}) {
  const courseId = item.courseId || item.id || uid('course');
  return {
    ...item,
    id: item.id || courseId,
    courseId,
    courseName: item.courseName || item.name || 'Untitled course',
    courseCode: item.courseCode || item.code || '',
    instructor: item.instructor || '',
    location: item.location || '',
    color: item.color || '#9c6b70',
    active: item.active !== false && !item.archived,
    notes: item.notes || '',
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
  };
}

export function normalizeCalendarEvent(item = {}) {
  const calendarEventId = item.calendarEventId || item.eventId || item.id || uid('calendar-event');
  const group = inferGroup(item);
  const eventType = CALENDAR_EVENT_TYPES.includes(item.eventType) ? item.eventType : group === 'work' ? 'Work Shift' : group === 'school' ? (item.schoolEventType === 'Class' ? 'School Class' : item.schoolEventType || 'Assignment') : group === 'tierra' ? 'Tierra Fleur' : 'Personal';
  const schoolEventType = item.schoolEventType || (eventType === 'School Class' ? 'Class' : SCHOOL_EVENT_TYPES.includes(eventType) ? eventType : '');
  const date = item.date || item.dueDate || localDate();
  const recurrence = normalizeRecurrence(item.recurrence, item);
  const recurring = recurrence.frequency !== 'None';
  const shiftId = group === 'work' ? (item.shiftId || calendarEventId.replace(/^calendar-event/, 'shift')) : (item.shiftId || '');
  const isAssignment = group === 'school' && ['Homework', 'Assignment', 'Discussion Post', 'Reading', 'Exam', 'Quiz', 'Project', 'Presentation'].includes(schoolEventType);
  const assignmentId = isAssignment ? (item.assignmentId || calendarEventId.replace(/^calendar-event/, 'assignment')) : (item.assignmentId || '');
  const normalized = {
    ...item,
    id: item.id || calendarEventId,
    eventId: item.eventId || calendarEventId,
    calendarEventId,
    shiftId,
    assignmentId,
    recurrenceSeriesId: recurring ? (item.recurrenceSeriesId || calendarEventId.replace(/^calendar-event/, 'recurrence')) : (item.recurrenceSeriesId || ''),
    recurrenceParentId: item.recurrenceParentId || '',
    title: item.title || item.jobName || item.courseName || eventType,
    description: item.description || '',
    eventType,
    schoolEventType,
    group,
    date,
    assignedDate: item.assignedDate || (isAssignment ? '' : date),
    endDate: item.endDate || date,
    startTime: item.startTime || '',
    endTime: item.endTime || '',
    dueDate: item.dueDate || (isAssignment ? date : ''),
    dueTime: item.dueTime || '',
    breakMinutes: Math.max(0, Number(item.breakMinutes || 0)),
    breakPaid: Boolean(item.breakPaid),
    actualStartTime: item.actualStartTime || '',
    actualEndTime: item.actualEndTime || '',
    actualHours: item.actualHours === '' || item.actualHours == null ? '' : Math.max(0, number(item.actualHours)),
    hourlyRate: item.hourlyRate === '' || item.hourlyRate == null ? '' : Math.max(0, number(item.hourlyRate)),
    shiftType: SHIFT_TYPES.includes(item.shiftType) ? item.shiftType : 'Regular',
    completed: Boolean(item.completed || ['Completed', 'Submitted', 'Graded'].includes(item.status)),
    status: item.status || (isAssignment ? 'Not Started' : 'Scheduled'),
    priority: EVENT_PRIORITIES.includes(item.priority) ? item.priority : 'Medium',
    estimatedMinutes: Math.max(0, Number(item.estimatedMinutes ?? item.estimatedTimeNeeded ?? 0)),
    actualMinutes: Math.max(0, Number(item.actualMinutes ?? item.actualTimeSpent ?? 0)),
    archived: Boolean(item.archived || item.status === 'Archived'),
    recurrence,
    recurring,
    acknowledgedConflict: Boolean(item.acknowledgedConflict),
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
  };
  return {
    ...normalized,
    totalScheduledHours: group === 'work' ? scheduledShiftHours(normalized) : 0,
    totalActualHours: group === 'work' ? actualShiftHours(normalized) : 0,
    estimatedGrossPay: group === 'work' ? estimatedGrossPay(normalized) : 0,
  };
}

export function createCalendarStarter() {
  return {
    calendarSchemaVersion: 1,
    calendarJobs: [],
    calendarCourses: [],
    calendarEvents: [],
    calendarSettings: { weekStartsOn: 0 },
  };
}

export function migrateCalendarData(saved = {}) {
  return {
    calendarSchemaVersion: 1,
    calendarJobs: records(saved.calendarJobs || saved.jobs).map(normalizeJob),
    calendarCourses: records(saved.calendarCourses || saved.courses).map(normalizeCourse),
    calendarEvents: records(saved.calendarEvents).map(normalizeCalendarEvent),
    calendarSettings: {
      weekStartsOn: Number(saved.calendarSettings?.weekStartsOn) === 1 ? 1 : 0,
      ...(saved.calendarSettings || {}),
    },
  };
}

export function createJob(values = {}, index = 0) {
  return normalizeJob({ ...values, jobId: values.jobId || uid('job') }, index);
}

export function createCourse(values = {}) {
  return normalizeCourse({ ...values, courseId: values.courseId || uid('course') });
}

export function createCalendarEvent(values = {}) {
  return normalizeCalendarEvent({ ...values, calendarEventId: values.calendarEventId || uid('calendar-event'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
}

export function minutesForTime(value) {
  if (!/^\d{2}:\d{2}$/.test(String(value || ''))) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function timeSpanMinutes(startTime, endTime, crossesMidnight = true) {
  const start = minutesForTime(startTime);
  const end = minutesForTime(endTime);
  if (start == null || end == null || start === end) return 0;
  if (end > start) return end - start;
  return crossesMidnight ? (1440 - start) + end : 0;
}

export function scheduledShiftHours(event = {}) {
  const span = timeSpanMinutes(event.startTime, event.endTime);
  const unpaidBreak = event.breakPaid ? 0 : Math.max(0, Number(event.breakMinutes || 0));
  return Math.max(0, span - unpaidBreak) / 60;
}

export function actualShiftHours(event = {}) {
  if (event.actualStartTime && event.actualEndTime) {
    const span = timeSpanMinutes(event.actualStartTime, event.actualEndTime);
    const unpaidBreak = event.breakPaid ? 0 : Math.max(0, Number(event.breakMinutes || 0));
    return Math.max(0, span - unpaidBreak) / 60;
  }
  if (event.actualHours !== '' && event.actualHours != null && Number.isFinite(Number(event.actualHours))) return Math.max(0, Number(event.actualHours));
  return event.completed ? scheduledShiftHours(event) : 0;
}

export function estimatedGrossPay(event = {}) {
  const hours = event.completed ? actualShiftHours(event) : scheduledShiftHours(event);
  return hours * Math.max(0, Number(event.hourlyRate || 0));
}

export function timedEventHours(event = {}) {
  return timeSpanMinutes(event.startTime, event.endTime) / 60;
}

function recurrenceDates(event, rangeStart, rangeEnd) {
  const recurrence = normalizeRecurrence(event.recurrence, event);
  if (recurrence.frequency === 'None') return event.date <= rangeEnd && (event.endDate || event.date) >= rangeStart ? [event.date] : [];
  const dates = [];
  const base = event.date;
  const hardEnd = recurrence.endDate && recurrence.endDate < rangeEnd ? recurrence.endDate : rangeEnd;
  const maxCount = recurrence.count ? Math.max(1, Number(recurrence.count)) : Infinity;
  const add = candidate => {
    if (candidate < base || candidate > hardEnd || candidate > rangeEnd || recurrence.excludedDates.includes(candidate)) return;
    if (dates.length < 1500) dates.push(candidate);
  };
  let occurrenceNumber = 0;
  if (recurrence.frequency === 'Daily') {
    for (let cursor = base; cursor <= hardEnd && occurrenceNumber < maxCount; cursor = addDays(cursor, recurrence.interval)) {
      occurrenceNumber += 1;
      if (cursor >= rangeStart) add(cursor);
    }
  } else if (recurrence.frequency === 'Monthly') {
    for (let index = 0; occurrenceNumber < maxCount && index < 1500; index += 1) {
      const cursor = addMonths(base, index * recurrence.interval);
      if (cursor > hardEnd) break;
      occurrenceNumber += 1;
      if (cursor >= rangeStart) add(cursor);
    }
  } else {
    const interval = recurrence.frequency === 'Every two weeks' ? 2 : recurrence.interval;
    const weekdays = recurrence.frequency === 'Custom weekdays' && recurrence.weekdays.length ? recurrence.weekdays : [parseDate(base).getDay()];
    for (let cursor = base; cursor <= hardEnd && occurrenceNumber < maxCount; cursor = addDays(cursor, 1)) {
      const weekIndex = Math.floor(dateDifference(base, cursor) / 7);
      if (weekIndex % interval !== 0 || !weekdays.includes(parseDate(cursor).getDay())) continue;
      occurrenceNumber += 1;
      if (cursor >= rangeStart) add(cursor);
    }
  }
  return dates;
}

function occurrenceFor(event, occurrenceDate) {
  const daySpan = Math.max(0, dateDifference(event.date, event.endDate || event.date));
  return {
    ...event,
    originCalendarEventId: event.calendarEventId,
    occurrenceDate,
    occurrenceKey: `${event.calendarEventId}@${occurrenceDate}`,
    date: occurrenceDate,
    endDate: addDays(occurrenceDate, daySpan),
  };
}

export function expandCalendarEvents(events = [], rangeStart, rangeEnd) {
  const unique = new Map();
  records(events).filter(event => !event.archived).map(normalizeCalendarEvent).forEach(event => {
    recurrenceDates(event, rangeStart, rangeEnd).forEach(date => {
      const occurrence = occurrenceFor(event, date);
      if (!unique.has(occurrence.occurrenceKey)) unique.set(occurrence.occurrenceKey, occurrence);
    });
  });
  return [...unique.values()].sort((a, b) => `${a.date}T${a.startTime || a.dueTime || '23:59'}`.localeCompare(`${b.date}T${b.startTime || b.dueTime || '23:59'}`));
}

function dateTime(date, time) {
  const minutes = minutesForTime(time);
  if (minutes == null) return null;
  const value = parseDate(date);
  value.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return value;
}

export function eventInterval(event = {}) {
  if (event.dueDate && event.dueTime && !event.startTime) {
    const point = dateTime(event.dueDate, event.dueTime);
    return point ? { start: point, end: new Date(point.getTime() + 60000), point: true } : null;
  }
  if (!event.date || !event.startTime || !event.endTime) return null;
  const start = dateTime(event.date, event.startTime);
  let end = dateTime(event.endDate || event.date, event.endTime);
  if (!start || !end) return null;
  if (end <= start) end = new Date(end.getTime() + 86400000);
  return { start, end, point: false };
}

export function detectConflicts(candidate, events = [], rangeDays = 31) {
  const normalized = normalizeCalendarEvent(candidate);
  const rangeStart = normalized.date || normalized.dueDate;
  const rangeEnd = addDays(rangeStart, normalized.recurring ? rangeDays : 1);
  const candidateOccurrences = expandCalendarEvents([normalized], rangeStart, rangeEnd);
  const existing = expandCalendarEvents(events, addDays(rangeStart, -1), addDays(rangeEnd, 1)).filter(event => event.originCalendarEventId !== normalized.calendarEventId);
  const conflicts = [];
  candidateOccurrences.forEach(left => {
    const leftInterval = eventInterval(left);
    if (!leftInterval) return;
    existing.forEach(right => {
      const rightInterval = eventInterval(right);
      if (!rightInterval || leftInterval.start >= rightInterval.end || rightInterval.start >= leftInterval.end) return;
      const key = `${left.occurrenceKey}|${right.occurrenceKey}`;
      if (!conflicts.some(item => item.key === key)) conflicts.push({ key, candidate: left, event: right });
    });
  });
  return conflicts;
}

export function calendarSummary(events = [], jobs = [], rangeStart, rangeEnd) {
  const occurrences = expandCalendarEvents(events, rangeStart, rangeEnd);
  const jobMap = new Map(records(jobs).map(job => [job.jobId, job]));
  const shifts = occurrences.filter(event => event.group === 'work');
  const byJob = {};
  const byEmployer = {};
  shifts.forEach(event => {
    const linkedJob = jobMap.get(event.jobId);
    const label = event.jobName || linkedJob?.jobName || 'Unassigned job';
    const employer = linkedJob?.employer || label;
    if (!byJob[event.jobId || label]) byJob[event.jobId || label] = { jobId: event.jobId || '', label, scheduledHours: 0, actualHours: 0, estimatedGrossPay: 0 };
    const summary = byJob[event.jobId || label];
    summary.scheduledHours += scheduledShiftHours(event);
    summary.actualHours += actualShiftHours(event);
    summary.estimatedGrossPay += estimatedGrossPay(event);
    if (!byEmployer[employer]) byEmployer[employer] = { label: employer, scheduledHours: 0, actualHours: 0, estimatedGrossPay: 0 };
    byEmployer[employer].scheduledHours += scheduledShiftHours(event);
    byEmployer[employer].actualHours += actualShiftHours(event);
    byEmployer[employer].estimatedGrossPay += estimatedGrossPay(event);
  });
  const school = occurrences.filter(event => event.group === 'school');
  const schoolHours = school.filter(event => ['Class', 'Lab'].includes(event.schoolEventType)).reduce((sum, event) => sum + timedEventHours(event), 0);
  const studyHours = school.filter(event => event.schoolEventType === 'Study Session').reduce((sum, event) => sum + timedEventHours(event), 0);
  const assignments = school.filter(event => ['Homework', 'Assignment', 'Discussion Post', 'Reading', 'Project', 'Presentation'].includes(event.schoolEventType));
  return {
    rangeStart,
    rangeEnd,
    shifts: shifts.length,
    scheduledHours: shifts.reduce((sum, event) => sum + scheduledShiftHours(event), 0),
    actualHours: shifts.reduce((sum, event) => sum + actualShiftHours(event), 0),
    regularHours: shifts.filter(event => event.shiftType !== 'Overtime').reduce((sum, event) => sum + scheduledShiftHours(event), 0),
    overtimeHours: shifts.filter(event => event.shiftType === 'Overtime').reduce((sum, event) => sum + scheduledShiftHours(event), 0),
    grossPay: shifts.reduce((sum, event) => sum + estimatedGrossPay(event), 0),
    byJob: Object.values(byJob),
    byEmployer: Object.values(byEmployer),
    schoolHours,
    studyHours,
    schoolCommitments: school.length,
    assignmentsDue: assignments.length,
    exams: school.filter(event => ['Exam', 'Quiz'].includes(event.schoolEventType)).length,
    labs: school.filter(event => event.schoolEventType === 'Lab').length,
    occurrences,
  };
}

export function weeklyCalendarSummary(events = [], jobs = [], referenceDate = localDate(), weekStartsOn = 0) {
  const rangeStart = startOfWeek(referenceDate, weekStartsOn);
  return calendarSummary(events, jobs, rangeStart, addDays(rangeStart, 6));
}

export function monthlyCalendarSummary(events = [], jobs = [], referenceDate = localDate()) {
  return calendarSummary(events, jobs, startOfMonth(referenceDate), endOfMonth(referenceDate));
}

export function isAssignmentOverdue(event, referenceDate = localDate()) {
  const due = event.dueDate || event.date;
  return event.group === 'school' && Boolean(event.assignmentId) && due < referenceDate && !event.completed && !['Submitted', 'Graded', 'Completed', 'Archived'].includes(event.status);
}

export function filterCalendarEvents(events = [], filters = {}, referenceDate = localDate(), weekStartsOn = 0) {
  const groups = records(filters.groups);
  return records(events).filter(event => {
    if (!filters.showArchived && event.archived) return false;
    if (groups.length && !groups.includes(event.group)) return false;
    if (filters.jobId && event.jobId !== filters.jobId) return false;
    if (filters.courseId && event.courseId !== filters.courseId) return false;
    if (filters.completion === 'Completed' && !event.completed) return false;
    if (filters.completion === 'Incomplete' && event.completed) return false;
    if (filters.completion === 'Overdue' && !isAssignmentOverdue(event, referenceDate)) return false;
    return true;
  });
}

export function previousDate(value) {
  return addDays(value, -1);
}

export function applyRecurringEdit(events, occurrence, changes, scope = 'Entire series') {
  const sourceId = occurrence.originCalendarEventId || occurrence.calendarEventId;
  const source = records(events).find(item => item.calendarEventId === sourceId);
  if (!source || !source.recurring || scope === 'Entire series') {
    return records(events).map(item => item.calendarEventId === sourceId ? normalizeCalendarEvent({ ...item, ...changes, calendarEventId: item.calendarEventId, updatedAt: new Date().toISOString() }) : item);
  }
  const occurrenceDate = occurrence.occurrenceDate || occurrence.date;
  if (scope === 'This event only') {
    const excludedDates = [...new Set([...(source.recurrence?.excludedDates || []), occurrenceDate])];
    const detached = createCalendarEvent({ ...source, ...changes, calendarEventId: undefined, eventId: undefined, id: undefined, date: occurrenceDate, endDate: occurrenceDate, recurrence: { frequency: 'None' }, recurring: false, recurrenceParentId: source.calendarEventId, recurrenceSeriesId: source.recurrenceSeriesId });
    return records(events).map(item => item.calendarEventId === sourceId ? { ...item, recurrence: { ...item.recurrence, excludedDates }, updatedAt: new Date().toISOString() } : item).concat(detached);
  }
  const oldSeries = { ...source, recurrence: { ...source.recurrence, endDate: previousDate(occurrenceDate) }, updatedAt: new Date().toISOString() };
  const future = createCalendarEvent({ ...source, ...changes, calendarEventId: undefined, eventId: undefined, id: undefined, date: occurrenceDate, endDate: occurrenceDate, recurrenceSeriesId: undefined, recurrenceParentId: source.calendarEventId, recurrence: { ...source.recurrence, excludedDates: [] } });
  return records(events).map(item => item.calendarEventId === sourceId ? oldSeries : item).concat(future);
}
