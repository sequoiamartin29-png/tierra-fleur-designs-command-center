import React, { useEffect, useMemo, useRef, useState } from 'react';
import './calendarDistrict.css';
import {
  ASSIGNMENT_STATUSES,
  CALENDAR_EVENT_TYPES,
  EVENT_PRIORITIES,
  JOB_COLORS,
  RECURRENCE_OPTIONS,
  SCHOOL_EVENT_TYPES,
  SHIFT_TYPES,
  addDays,
  addMonths,
  applyRecurringEdit,
  createCalendarEvent,
  createCourse,
  createJob,
  detectConflicts,
  endOfMonth,
  endOfWeek,
  estimatedGrossPay,
  eventInterval,
  expandCalendarEvents,
  filterCalendarEvents,
  isAssignmentOverdue,
  localDate,
  monthlyCalendarSummary,
  parseDate,
  scheduledShiftHours,
  startOfMonth,
  startOfWeek,
  timedEventHours,
  weeklyCalendarSummary,
  actualShiftHours,
} from './calendarEngine.js';

const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
const hours = value => `${Number(value || 0).toFixed(1)}h`;
const dateLabel = value => value ? parseDate(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not scheduled';
const shortDate = value => parseDate(value).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const timeLabel = value => value ? new Date(`2000-01-01T${value}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

function SectionTitle({ eyebrow, title, text, action }) {
  return <div className="section-title calendar-title"><div><span>{eyebrow}</span><h2>{title}</h2><p>{text}</p></div>{action}</div>;
}

function eventGroupForType(type) {
  if (type === 'Work Shift') return 'work';
  if (['School Class', 'Lab', 'Homework', 'Assignment', 'Exam', 'Study Session'].includes(type)) return 'school';
  if (type === 'Tierra Fleur') return 'tierra';
  return 'personal';
}

function schoolTypeForEvent(type) {
  return type === 'School Class' ? 'Class' : SCHOOL_EVENT_TYPES.includes(type) ? type : 'Assignment';
}

function blankEvent(type = 'Personal', date = localDate()) {
  const group = eventGroupForType(type);
  const schoolEventType = group === 'school' ? schoolTypeForEvent(type) : '';
  const assignment = group === 'school' && !['Class', 'Lab', 'Study Session', 'Advising'].includes(schoolEventType);
  return {
    title: '',
    description: '',
    eventType: type,
    schoolEventType,
    group,
    date,
    endDate: date,
    startTime: assignment ? '' : '09:00',
    endTime: assignment ? '' : '10:00',
    dueDate: assignment ? date : '',
    dueTime: assignment ? '23:59' : '',
    assignedDate: assignment ? date : '',
    jobId: '',
    jobName: '',
    courseId: '',
    courseName: '',
    courseCode: '',
    breakMinutes: 0,
    breakPaid: false,
    actualStartTime: '',
    actualEndTime: '',
    actualHours: '',
    hourlyRate: '',
    shiftType: 'Regular',
    location: '',
    instructor: '',
    priority: 'Medium',
    status: assignment ? 'Not Started' : 'Scheduled',
    completed: false,
    grade: '',
    estimatedMinutes: 0,
    actualMinutes: 0,
    notes: '',
    attachmentReference: '',
    recurrence: { frequency: 'None', interval: 1, weekdays: [], endDate: '', count: '', excludedDates: [] },
    clientId: '', projectId: '', taskId: '', invoiceId: '', billId: '',
  };
}

function labelForAnchor(view, anchor, weekStartsOn = 0) {
  if (view === 'month') return parseDate(anchor).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  if (view === 'week') return `${dateLabel(startOfWeek(anchor, weekStartsOn))} – ${dateLabel(endOfWeek(anchor, weekStartsOn))}`;
  if (view === 'day') return parseDate(anchor).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  return `From ${dateLabel(anchor)}`;
}

function rangeForView(view, anchor, weekStartsOn) {
  if (view === 'month') {
    const first = startOfMonth(anchor);
    return [startOfWeek(first, weekStartsOn), endOfWeek(endOfMonth(anchor), weekStartsOn)];
  }
  if (view === 'week') return [startOfWeek(anchor, weekStartsOn), endOfWeek(anchor, weekStartsOn)];
  if (view === 'day') return [anchor, anchor];
  return [anchor, addDays(anchor, 59)];
}

function moveAnchor(view, anchor, direction) {
  if (view === 'month') return addMonths(anchor, direction);
  if (view === 'week') return addDays(anchor, direction * 7);
  if (view === 'agenda') return addDays(anchor, direction * 30);
  return addDays(anchor, direction);
}

function eventTone(event, jobs, courses) {
  if (event.group === 'work') return jobs.find(job => job.jobId === event.jobId)?.color || '#52684f';
  if (event.group === 'school') return courses.find(course => course.courseId === event.courseId)?.color || '#9c6b70';
  if (event.group === 'tierra') return '#b08a4f';
  return '#667991';
}

function EventChip({ event, jobs, courses, onOpen, compact = false }) {
  const overdue = isAssignmentOverdue(event);
  return <button
    type="button"
    className={`calendar-event-chip ${event.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''} ${compact ? 'compact' : ''}`}
    style={{ '--event-color': eventTone(event, jobs, courses) }}
    onClick={click => { click.stopPropagation(); onOpen(event); }}
    title={`${event.title} · ${event.eventType}`}
  >
    <span>{event.startTime ? timeLabel(event.startTime) : event.dueTime ? `Due ${timeLabel(event.dueTime)}` : event.eventType}</span>
    <strong>{event.title}</strong>
  </button>;
}

function WeeklySummary({ summary }) {
  return <section className="calendar-summary panel glass" aria-label="Weekly hours summary">
    <div className="calendar-summary-heading"><div><span>Weekly rhythm</span><h3>{dateLabel(summary.rangeStart)} – {dateLabel(summary.rangeEnd)}</h3></div><b>{summary.shifts} shift{summary.shifts === 1 ? '' : 's'}</b></div>
    <div className="calendar-summary-grid">
      <div><span>Scheduled</span><strong>{hours(summary.scheduledHours)}</strong><small>{hours(summary.regularHours)} regular</small></div>
      <div><span>Actual</span><strong>{hours(summary.actualHours)}</strong><small>{hours(summary.overtimeHours)} overtime</small></div>
      <div><span>Estimated gross</span><strong>{money(summary.grossPay)}</strong><small>All jobs combined</small></div>
      <div><span>School + study</span><strong>{hours(summary.schoolHours + summary.studyHours)}</strong><small>{hours(summary.studyHours)} study</small></div>
    </div>
    {summary.byJob.length > 0 && <div className="calendar-job-summary">{summary.byJob.map(job => <div key={job.jobId || job.label}><span>{job.label}</span><b>{hours(job.scheduledHours)}</b><small>{money(job.estimatedGrossPay)}</small></div>)}</div>}
  </section>;
}

function MonthlySummary({ summary }) {
  const progress = Math.min(100, summary.scheduledHours ? summary.actualHours / summary.scheduledHours * 100 : 0);
  return <section className="monthly-calendar-summary panel glass" aria-label="Monthly calendar summary">
    <div className="calendar-summary-heading"><div><span>Monthly portrait</span><h3>Work, school, and study</h3></div><b>{summary.schoolCommitments} school commitments</b></div>
    <div className="monthly-summary-cards">
      <article><span>Work hours</span><strong>{hours(summary.scheduledHours)}</strong><small>{hours(summary.actualHours)} worked</small><i><em style={{ width: `${progress}%` }} /></i></article>
      <article><span>Estimated gross</span><strong>{money(summary.grossPay)}</strong><small>{summary.shifts} shifts · {hours(summary.overtimeHours)} overtime</small></article>
      <article><span>Coursework</span><strong>{summary.assignmentsDue}</strong><small>Assignments due · {summary.exams} exams</small></article>
      <article><span>Labs + study</span><strong>{summary.labs} labs</strong><small>{hours(summary.studyHours)} study time</small></article>
    </div>
    {summary.byEmployer.length > 0 && <div className="monthly-employer-bars">{summary.byEmployer.map(job => {
      const width = summary.scheduledHours ? Math.max(4, job.scheduledHours / summary.scheduledHours * 100) : 0;
      return <div key={job.label}><span>{job.label}</span><i><em style={{ width: `${width}%` }} /></i><b>{hours(job.scheduledHours)} · {money(job.estimatedGrossPay)}</b></div>;
    })}</div>}
  </section>;
}

function MonthView({ anchor, events, weekStartsOn, jobs, courses, onAdd, onOpen }) {
  const first = startOfWeek(startOfMonth(anchor), weekStartsOn);
  const last = endOfWeek(endOfMonth(anchor), weekStartsOn);
  const dates = [];
  for (let date = first; date <= last; date = addDays(date, 1)) dates.push(date);
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(startOfWeek('2026-08-02', weekStartsOn), index);
    return parseDate(date).toLocaleDateString(undefined, { weekday: 'short' });
  });
  return <section className="calendar-month panel glass" aria-label="Month view">
    <div className="calendar-weekday-row">{weekdayLabels.map(label => <span key={label}>{label}</span>)}</div>
    <div className="calendar-month-grid">
      {dates.map(date => {
        const dayEvents = events.filter(event => event.date === date);
        const currentMonth = String(date).slice(0, 7) === String(anchor).slice(0, 7);
        return <div key={date} className={`calendar-day-cell ${currentMonth ? '' : 'muted'} ${date === localDate() ? 'today' : ''} ${dayEvents.length ? 'has-events' : ''}`}>
          <button type="button" className="calendar-date-button" onClick={() => onAdd(date)} aria-label={`Add event on ${date}`}><span>{shortDate(date)}</span><b>{Number(date.slice(8, 10))}</b><small>＋</small></button>
          <div className="calendar-cell-events">{dayEvents.slice(0, 4).map(event => <EventChip key={event.occurrenceKey} event={event} jobs={jobs} courses={courses} onOpen={onOpen} compact />)}{dayEvents.length > 4 && <button className="calendar-more" onClick={() => onAdd(date)}>+{dayEvents.length - 4} more</button>}</div>
        </div>;
      })}
    </div>
  </section>;
}

function WeekView({ anchor, events, weekStartsOn, jobs, courses, onAdd, onOpen }) {
  const first = startOfWeek(anchor, weekStartsOn);
  const dates = Array.from({ length: 7 }, (_, index) => addDays(first, index));
  return <section className="calendar-week panel glass" aria-label="Week view"><div className="calendar-week-grid">{dates.map(date => {
    const dayEvents = events.filter(event => event.date === date);
    return <article key={date} className={date === localDate() ? 'today' : ''}>
      <button className="calendar-week-day" onClick={() => onAdd(date)}><span>{parseDate(date).toLocaleDateString(undefined, { weekday: 'long' })}</span><strong>{parseDate(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</strong><small>Add event ＋</small></button>
      <div>{dayEvents.map(event => <EventChip key={event.occurrenceKey} event={event} jobs={jobs} courses={courses} onOpen={onOpen} />)}{!dayEvents.length && <p>Open day</p>}</div>
    </article>;
  })}</div></section>;
}

function DayView({ anchor, events, jobs, courses, onAdd, onOpen }) {
  return <section className="calendar-day-view panel glass" aria-label="Day view">
    <div className="calendar-day-heading"><div><span>{parseDate(anchor).toLocaleDateString(undefined, { weekday: 'long' })}</span><h3>{dateLabel(anchor)}</h3></div><button className="primary" onClick={() => onAdd(anchor)}>＋ Add to this day</button></div>
    <div className="calendar-day-timeline">{events.map(event => <div key={event.occurrenceKey} className="calendar-timeline-row"><time>{event.startTime ? timeLabel(event.startTime) : event.dueTime ? timeLabel(event.dueTime) : 'All day'}</time><EventChip event={event} jobs={jobs} courses={courses} onOpen={onOpen} /></div>)}{!events.length && <div className="calendar-empty"><span>❦</span><h3>A spacious day</h3><p>Tap Add to place a shift, class, assignment, or personal commitment here.</p></div>}</div>
  </section>;
}

function AgendaView({ events, jobs, courses, onOpen }) {
  const grouped = events.reduce((map, event) => ({ ...map, [event.date]: [...(map[event.date] || []), event] }), {});
  return <section className="calendar-agenda panel glass" aria-label="Agenda view">{Object.entries(grouped).map(([date, items]) => <div className="calendar-agenda-day" key={date}><div><span>{parseDate(date).toLocaleDateString(undefined, { weekday: 'long' })}</span><strong>{dateLabel(date)}</strong></div><section>{items.map(event => <EventChip key={event.occurrenceKey} event={event} jobs={jobs} courses={courses} onOpen={onOpen} />)}</section></div>)}{!events.length && <div className="calendar-empty"><span>❦</span><h3>No upcoming commitments</h3><p>Your filtered agenda is clear for the next sixty days.</p></div>}</section>;
}

function Filters({ filters, setFilters, jobs, courses }) {
  const groups = [['work', 'Work'], ['school', 'School'], ['tierra', 'Tierra Fleur'], ['personal', 'Personal']];
  const toggleGroup = group => setFilters(current => ({ ...current, groups: current.groups.includes(group) ? current.groups.filter(item => item !== group) : [...current.groups, group] }));
  return <section className="calendar-filters panel glass" aria-label="Calendar filters">
    <div className="calendar-filter-chips"><button className={!filters.groups.length ? 'active' : ''} onClick={() => setFilters(current => ({ ...current, groups: [] }))}>All events</button>{groups.map(([value, label]) => <button key={value} className={filters.groups.includes(value) ? 'active' : ''} onClick={() => toggleGroup(value)}>{label}</button>)}</div>
    <div className="calendar-filter-selects">
      <label>Job<select value={filters.jobId} onChange={event => setFilters(current => ({ ...current, jobId: event.target.value }))}><option value="">Every job</option>{jobs.map(job => <option key={job.jobId} value={job.jobId}>{job.jobName}</option>)}</select></label>
      <label>Course<select value={filters.courseId} onChange={event => setFilters(current => ({ ...current, courseId: event.target.value }))}><option value="">Every course</option>{courses.map(course => <option key={course.courseId} value={course.courseId}>{course.courseCode || course.courseName}</option>)}</select></label>
      <label>Status<select value={filters.completion} onChange={event => setFilters(current => ({ ...current, completion: event.target.value }))}><option value="">Any status</option><option>Completed</option><option>Incomplete</option><option>Overdue</option></select></label>
      <label>Range<select value={filters.timeframe} onChange={event => setFilters(current => ({ ...current, timeframe: event.target.value }))}><option value="">Visible dates</option><option>This week</option><option>This month</option></select></label>
    </div>
  </section>;
}

function EventEditor({ initial, data, events, onClose, onSave, mode = 'edit' }) {
  const [form, setForm] = useState(() => ({ ...initial, recurrence: { frequency: 'None', interval: 1, weekdays: [], endDate: '', count: '', excludedDates: [], ...(initial.recurrence || {}) } }));
  const [errors, setErrors] = useState('');
  const [conflicts, setConflicts] = useState([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [scope, setScope] = useState(initial.recurring ? 'Entire series' : 'Entire series');
  const isWork = form.group === 'work';
  const isSchool = form.group === 'school';
  const isAssignment = isSchool && !['Class', 'Lab', 'Study Session', 'Advising'].includes(form.schoolEventType);
  const set = changes => { setForm(current => ({ ...current, ...changes })); setErrors(''); setConflicts([]); setAcknowledged(false); };
  const selectType = eventType => {
    const group = eventGroupForType(eventType);
    const schoolEventType = group === 'school' ? schoolTypeForEvent(eventType) : '';
    const assignment = group === 'school' && !['Class', 'Lab', 'Study Session'].includes(schoolEventType);
    set({ eventType, group, schoolEventType, dueDate: assignment ? (form.dueDate || form.date) : '', dueTime: assignment ? (form.dueTime || '23:59') : '' });
  };
  const selectSchoolType = schoolEventType => set({ schoolEventType, eventType: schoolEventType === 'Class' ? 'School Class' : CALENDAR_EVENT_TYPES.includes(schoolEventType) ? schoolEventType : 'Assignment' });
  const selectJob = jobId => {
    const job = data.calendarJobs.find(item => item.jobId === jobId);
    set({ jobId, jobName: job?.jobName || '', title: form.title || job?.jobName || 'Work Shift', startTime: job?.defaultShiftStartTime || form.startTime, endTime: job?.defaultShiftEndTime || form.endTime, breakMinutes: job?.defaultBreakLength ?? form.breakMinutes, hourlyRate: job?.defaultHourlyRate ?? form.hourlyRate });
  };
  const selectCourse = courseId => {
    const course = data.calendarCourses.find(item => item.courseId === courseId);
    set({ courseId, courseName: course?.courseName || '', courseCode: course?.courseCode || '', instructor: form.instructor || course?.instructor || '', location: form.location || course?.location || '', title: form.title || course?.courseName || form.schoolEventType });
  };
  const submit = event => {
    event.preventDefault();
    if (!form.title.trim()) { setErrors('Add a title before saving.'); return; }
    if (!form.date) { setErrors('Choose a date before saving.'); return; }
    if (isWork && (!form.jobId || !form.startTime || !form.endTime)) { setErrors('Choose a job and enter both shift times.'); return; }
    if (form.startTime && form.endTime && form.startTime === form.endTime) { setErrors('Start and end time must be different. Earlier end times are saved as overnight events.'); return; }
    const candidate = createCalendarEvent({ ...form, completed: form.completed || ['Completed', 'Submitted', 'Graded'].includes(form.status) });
    const found = detectConflicts(candidate, events);
    if (found.length && !acknowledged) { setConflicts(found); return; }
    onSave(candidate, scope);
  };
  const scheduled = isWork ? scheduledShiftHours(form) : timedEventHours(form);
  const actual = isWork ? actualShiftHours(form) : 0;
  const gross = isWork ? estimatedGrossPay(form) : 0;
  const linkedOptions = {
    clients: data.clients || [], projects: data.projects || [], tasks: data.projectTasks || [], bills: data.personalBills || [], documents: data.estimates || [],
  };
  return <div className="calendar-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <form className="calendar-editor panel glass" onSubmit={submit}>
      <header><div><span>{mode === 'quick' ? 'Quick Add' : form.calendarEventId ? 'Calendar event' : 'New commitment'}</span><h2>{form.calendarEventId ? 'Edit event' : 'Add to Calendar District'}</h2></div><button type="button" onClick={onClose} aria-label="Close event form">×</button></header>
      <div className="calendar-form-grid">
        <label className="wide">Event type<select value={form.eventType} onChange={event => selectType(event.target.value)}>{CALENDAR_EVENT_TYPES.map(option => <option key={option}>{option}</option>)}</select></label>
        <label className="wide">Title<input autoFocus required value={form.title} onChange={event => set({ title: event.target.value })} placeholder={isWork ? 'Shift title' : isSchool ? 'Class or assignment title' : 'Event title'} /></label>
        {isWork && <>
          <label className="wide">Job<select required value={form.jobId} onChange={event => selectJob(event.target.value)}><option value="">Select a job</option>{data.calendarJobs.filter(job => job.active || job.jobId === form.jobId).map(job => <option key={job.jobId} value={job.jobId}>{job.jobName}{job.employer ? ` · ${job.employer}` : ''}</option>)}</select></label>
          <label>Shift type<select value={form.shiftType} onChange={event => set({ shiftType: event.target.value })}>{SHIFT_TYPES.map(option => <option key={option}>{option}</option>)}</select></label>
          <label>Hourly rate<input type="number" min="0" step="0.01" value={form.hourlyRate} onChange={event => set({ hourlyRate: event.target.value })} /></label>
        </>}
        {isSchool && <>
          <label>School type<select value={form.schoolEventType} onChange={event => selectSchoolType(event.target.value)}>{SCHOOL_EVENT_TYPES.map(option => <option key={option}>{option}</option>)}</select></label>
          <label>Course<select value={form.courseId} onChange={event => selectCourse(event.target.value)}><option value="">No course selected</option>{data.calendarCourses.filter(course => course.active || course.courseId === form.courseId).map(course => <option key={course.courseId} value={course.courseId}>{course.courseCode ? `${course.courseCode} · ` : ''}{course.courseName}</option>)}</select></label>
        </>}
        {isAssignment ? <label>Assigned date<input type="date" value={form.assignedDate || ''} onChange={event => set({ assignedDate: event.target.value })} /></label> : <label>Date<input type="date" required value={form.date} onChange={event => set({ date: event.target.value, endDate: event.target.value })} /></label>}
        {!isAssignment && <><label>Start time<input type="time" value={form.startTime} onChange={event => set({ startTime: event.target.value })} /></label><label>End time<input type="time" value={form.endTime} onChange={event => set({ endTime: event.target.value })} /></label></>}
        {isAssignment && <><label>Due date<input type="date" value={form.dueDate} onChange={event => set({ dueDate: event.target.value, date: event.target.value })} /></label><label>Due time<input type="time" value={form.dueTime} onChange={event => set({ dueTime: event.target.value })} /></label></>}
        {isWork && <>
          <label>Break minutes<input type="number" min="0" step="5" value={form.breakMinutes} onChange={event => set({ breakMinutes: event.target.value })} /></label>
          <label className="calendar-check"><input type="checkbox" checked={form.breakPaid} onChange={event => set({ breakPaid: event.target.checked })} /> Paid break</label>
          <label>Actual start<input type="time" value={form.actualStartTime || ''} onChange={event => set({ actualStartTime: event.target.value })} /></label>
          <label>Actual end<input type="time" value={form.actualEndTime || ''} onChange={event => set({ actualEndTime: event.target.value })} /></label>
          <label>Actual hours override<input type="number" min="0" step="0.25" value={form.actualHours} onChange={event => set({ actualHours: event.target.value })} placeholder="Auto when completed" /></label>
        </>}
        {isSchool && <><label>Instructor<input value={form.instructor || ''} onChange={event => set({ instructor: event.target.value })} /></label><label>Priority<select value={form.priority} onChange={event => set({ priority: event.target.value })}>{EVENT_PRIORITIES.map(option => <option key={option}>{option}</option>)}</select></label></>}
        <label>Location or online<input value={form.location || ''} onChange={event => set({ location: event.target.value })} /></label>
        {isAssignment && <>
          <label className="wide">Description<textarea value={form.description || ''} onChange={event => set({ description: event.target.value })} /></label>
          <label>Estimated minutes<input type="number" min="0" step="15" value={form.estimatedMinutes} onChange={event => set({ estimatedMinutes: event.target.value })} /></label>
          <label>Actual minutes<input type="number" min="0" step="15" value={form.actualMinutes} onChange={event => set({ actualMinutes: event.target.value })} /></label>
          <label>Status<select value={form.status} onChange={event => set({ status: event.target.value, completed: ['Completed', 'Submitted', 'Graded'].includes(event.target.value) })}>{ASSIGNMENT_STATUSES.map(option => <option key={option}>{option}</option>)}</select></label>
          <label>Grade or score<input value={form.grade || ''} onChange={event => set({ grade: event.target.value })} /></label>
          <label className="wide">Attachment reference<input value={form.attachmentReference || ''} onChange={event => set({ attachmentReference: event.target.value })} placeholder="File name, link, or note" /></label>
        </>}
        {!isAssignment && <label>Status<select value={form.completed ? 'Completed' : 'Scheduled'} onChange={event => set({ completed: event.target.value === 'Completed', status: event.target.value })}><option>Scheduled</option><option>Completed</option></select></label>}
      </div>

      {isWork && <div className="shift-calculation"><div><span>Scheduled</span><strong>{hours(scheduled)}</strong></div><div><span>Actual</span><strong>{hours(actual)}</strong></div><div><span>Estimated gross</span><strong>{money(gross)}</strong></div><p>{form.endTime && form.startTime && form.endTime < form.startTime ? 'Overnight shift · ends the following day.' : 'Same-day shift.'} {form.breakMinutes > 0 ? `${form.breakPaid ? 'Paid' : 'Unpaid'} ${form.breakMinutes}-minute break.` : 'No break deducted.'}</p></div>}

      <fieldset className="calendar-recurrence"><legend>Recurrence</legend><div className="calendar-form-grid"><label>Repeats<select value={form.recurrence.frequency} onChange={event => set({ recurrence: { ...form.recurrence, frequency: event.target.value } })}>{RECURRENCE_OPTIONS.map(option => <option key={option}>{option}</option>)}</select></label>{form.recurrence.frequency !== 'None' && <><label>End on<input type="date" value={form.recurrence.endDate} onChange={event => set({ recurrence: { ...form.recurrence, endDate: event.target.value } })} /></label><label>Or after occurrences<input type="number" min="1" value={form.recurrence.count} onChange={event => set({ recurrence: { ...form.recurrence, count: event.target.value } })} /></label></>}{form.recurrence.frequency === 'Custom weekdays' && <div className="calendar-weekday-picker wide">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day, index) => <label key={day}><input type="checkbox" checked={form.recurrence.weekdays.includes(index)} onChange={event => set({ recurrence: { ...form.recurrence, weekdays: event.target.checked ? [...form.recurrence.weekdays, index] : form.recurrence.weekdays.filter(value => value !== index) } })} />{day}</label>)}</div>}</div></fieldset>

      <details className="calendar-connections"><summary>Optional connections</summary><div className="calendar-form-grid"><label>Client<select value={form.clientId || ''} onChange={event => set({ clientId: event.target.value })}><option value="">None</option>{linkedOptions.clients.map(item => <option key={item.clientId} value={item.clientId}>{item.name}</option>)}</select></label><label>Project<select value={form.projectId || ''} onChange={event => set({ projectId: event.target.value })}><option value="">None</option>{linkedOptions.projects.map(item => <option key={item.projectId} value={item.projectId}>{item.projectId} · {item.name}</option>)}</select></label><label>Project task<select value={form.taskId || ''} onChange={event => set({ taskId: event.target.value })}><option value="">None</option>{linkedOptions.tasks.map(item => <option key={item.taskId} value={item.taskId}>{item.title}</option>)}</select></label><label>Invoice<select value={form.invoiceId || ''} onChange={event => set({ invoiceId: event.target.value })}><option value="">None</option>{linkedOptions.documents.filter(item => item.documentType === 'Invoice').map(item => <option key={item.invoiceId || item.id} value={item.invoiceId || item.id}>{item.title}</option>)}</select></label><label>Bill<select value={form.billId || ''} onChange={event => set({ billId: event.target.value })}><option value="">None</option>{linkedOptions.bills.map(item => <option key={item.billId} value={item.billId}>{item.name}</option>)}</select></label></div></details>
      <label className="calendar-notes">Notes<textarea value={form.notes || ''} onChange={event => set({ notes: event.target.value })} /></label>
      {initial.recurring && <label className="calendar-edit-scope">Apply changes to<select value={scope} onChange={event => setScope(event.target.value)}><option>This event only</option><option>This and future events</option><option>Entire series</option></select></label>}
      {errors && <p className="calendar-form-error" role="alert">{errors}</p>}
      {conflicts.length > 0 && <div className="calendar-conflict-warning" role="alert"><strong>A gentle scheduling note</strong><p>{conflicts.length} overlap{conflicts.length === 1 ? '' : 's'} found, including “{conflicts[0].event.title}” on {dateLabel(conflicts[0].event.date)}. You can still save after acknowledging it.</p><label><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} /> I reviewed this conflict and want to save.</label></div>}
      <footer><button type="button" onClick={onClose}>Cancel</button><button className="primary" disabled={conflicts.length > 0 && !acknowledged}>Save event</button></footer>
    </form>
  </div>;
}

function QuickAdd({ date, onChoose, onClose }) {
  const options = [
    ['Work Shift', 'Work Shift', 'Shift'], ['Class', 'School Class', 'Class'], ['Lab', 'Lab', 'Lab'], ['Assignment', 'Assignment', 'Due'], ['Study Session', 'Study Session', 'Study'], ['Appointment', 'Appointment', 'Appt'], ['Personal Event', 'Personal', 'Personal'],
  ];
  return <div className="calendar-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="calendar-quick-add panel glass"><header><div><span>Calendar District</span><h2>Quick Add</h2><p>{dateLabel(date)}</p></div><button onClick={onClose} aria-label="Close quick add">×</button></header><div>{options.map(([label, type, badge]) => <button key={label} onClick={() => onChoose(type)}><span>{badge}</span><strong>Add {label}</strong><small>Continue →</small></button>)}</div></section></div>;
}

function EventDetails({ event, data, setData, onClose, onEdit, onDuplicate, onAddStudy, navigate, openProject }) {
  const [deleteScope, setDeleteScope] = useState(event.recurring ? 'This event only' : 'Entire series');
  const [pendingDelete, setPendingDelete] = useState(false);
  const duration = event.group === 'work' ? scheduledShiftHours(event) : timedEventHours(event);
  const job = data.calendarJobs.find(item => item.jobId === event.jobId);
  const course = data.calendarCourses.find(item => item.courseId === event.courseId);
  const patch = (changes, scope = event.recurring ? 'This event only' : 'Entire series') => setData(current => ({ ...current, calendarEvents: applyRecurringEdit(current.calendarEvents, event, changes, scope) }));
  const archive = () => {
    const sourceId = event.originCalendarEventId || event.calendarEventId;
    setData(current => ({ ...current, calendarEvents: current.calendarEvents.map(item => item.calendarEventId === sourceId ? { ...item, archived: true, updatedAt: new Date().toISOString() } : item) }));
    onClose();
  };
  const remove = () => {
    if (!pendingDelete) { setPendingDelete(true); return; }
    const sourceId = event.originCalendarEventId || event.calendarEventId;
    if (event.recurring && deleteScope === 'This event only') {
      setData(current => ({ ...current, calendarEvents: current.calendarEvents.map(item => item.calendarEventId === sourceId ? { ...item, recurrence: { ...item.recurrence, excludedDates: [...new Set([...(item.recurrence?.excludedDates || []), event.date])] } } : item) }));
    } else if (event.recurring && deleteScope === 'This and future events') {
      setData(current => ({ ...current, calendarEvents: current.calendarEvents.map(item => item.calendarEventId === sourceId ? { ...item, recurrence: { ...item.recurrence, endDate: addDays(event.date, -1) } } : item) }));
    } else setData(current => ({ ...current, calendarEvents: current.calendarEvents.filter(item => item.calendarEventId !== sourceId) }));
    onClose();
  };
  const createIncomeDraft = () => {
    if (!confirm(`Create a draft income record for ${money(estimatedGrossPay(event))}?`)) return;
    const transactionId = `txn-personal-${crypto.randomUUID()}`;
    setData(current => ({
      ...current,
      personalTransactions: [{ id: transactionId, transactionId, type: 'Income', category: 'Job Income', source: event.jobName || job?.jobName || 'Work shift', amount: estimatedGrossPay(event), date: event.date, dueDate: '', recurring: false, status: 'Unpaid', paymentMethod: 'Not specified', notes: `Draft created from Calendar District shift: ${event.title}`, calendarEventId: event.originCalendarEventId || event.calendarEventId, draft: true, archived: false }, ...current.personalTransactions],
      calendarEvents: current.calendarEvents.map(item => item.calendarEventId === (event.originCalendarEventId || event.calendarEventId) ? { ...item, incomeTransactionId: transactionId } : item),
    }));
  };
  return <div className="calendar-modal-backdrop" onMouseDown={click => click.target === click.currentTarget && onClose()}><section className="calendar-details panel glass" style={{ '--event-color': eventTone(event, data.calendarJobs, data.calendarCourses) }}>
    <header><div><span>{event.eventType}</span><h2>{event.title}</h2><p>{dateLabel(event.date)}{event.startTime ? ` · ${timeLabel(event.startTime)}–${timeLabel(event.endTime)}` : event.dueTime ? ` · Due ${timeLabel(event.dueTime)}` : ''}</p></div><button onClick={onClose} aria-label="Close event details">×</button></header>
    <div className="calendar-detail-facts"><div><span>Duration</span><strong>{duration ? hours(duration) : event.estimatedMinutes ? `${event.estimatedMinutes} min estimated` : 'Open'}</strong></div><div><span>Linked to</span><strong>{job?.jobName || course?.courseName || event.projectId || 'No link'}</strong></div><div><span>Status</span><strong>{event.status || (event.completed ? 'Completed' : 'Scheduled')}</strong></div>{event.group === 'work' && <div><span>Estimated gross</span><strong>{money(estimatedGrossPay(event))}</strong></div>}</div>
    {event.group === 'work' && <div className="calendar-detail-callout"><strong>{hours(scheduledShiftHours(event))} scheduled · {hours(actualShiftHours(event))} actual</strong><p>{event.shiftType} · {event.breakMinutes ? `${event.breakMinutes}-minute ${event.breakPaid ? 'paid' : 'unpaid'} break` : 'No break'}{event.endTime < event.startTime ? ' · Overnight' : ''}</p></div>}
    {event.description && <div className="calendar-detail-notes"><span>Description</span><p>{event.description}</p></div>}
    {event.notes && <div className="calendar-detail-notes"><span>Notes</span><p>{event.notes}</p></div>}
    {(event.projectId || event.billId) && <div className="calendar-related-actions">{event.projectId && <button onClick={() => openProject?.(event.projectId)}>Open linked project</button>}{event.billId && <button onClick={() => navigate?.('finance')}>Open related bill</button>}</div>}
    <div className="calendar-detail-actions"><button onClick={() => onEdit(event)}>Edit</button><button onClick={() => onDuplicate(event)}>Duplicate</button>{!event.completed && <button onClick={() => patch({ completed: true, status: event.assignmentId ? 'Completed' : 'Completed' })}>Mark complete</button>}{event.assignmentId && event.status !== 'Submitted' && <button onClick={() => patch({ completed: true, status: 'Submitted' })}>Mark submitted</button>}{event.assignmentId && <button onClick={() => onAddStudy(event)}>Add study time</button>}{event.group === 'work' && event.completed && !event.incomeTransactionId && <button onClick={createIncomeDraft}>Create draft income</button>}<button onClick={archive}>Archive</button></div>
    {event.recurring && <label className="calendar-delete-scope">Delete<select value={deleteScope} onChange={change => setDeleteScope(change.target.value)}><option>This event only</option><option>This and future events</option><option>Entire series</option></select></label>}
    <button className="danger calendar-delete" onClick={remove}>{pendingDelete ? 'Confirm permanent delete' : 'Delete with confirmation'}</button>
    {pendingDelete && <button className="calendar-delete-cancel" onClick={() => setPendingDelete(false)}>Cancel deletion</button>}
  </section></div>;
}

function ManageCalendar({ data, setData, onClose }) {
  const blankJob = { jobName: '', employer: '', roleTitle: '', color: JOB_COLORS[0], defaultHourlyRate: '', defaultShiftStartTime: '09:00', defaultShiftEndTime: '17:00', defaultBreakLength: 0, active: true, notes: '' };
  const blankCourse = { courseName: '', courseCode: '', instructor: '', location: '', color: '#9c6b70', active: true, notes: '' };
  const [tab, setTab] = useState('jobs');
  const [jobForm, setJobForm] = useState(blankJob);
  const [courseForm, setCourseForm] = useState(blankCourse);
  const [pendingLibraryDelete, setPendingLibraryDelete] = useState('');
  const saveJob = event => { event.preventDefault(); if (!jobForm.jobName.trim()) return; setData(current => ({ ...current, calendarJobs: jobForm.jobId ? current.calendarJobs.map(item => item.jobId === jobForm.jobId ? createJob({ ...item, ...jobForm, updatedAt: new Date().toISOString() }) : item) : [...current.calendarJobs, createJob(jobForm, current.calendarJobs.length)] })); setJobForm(blankJob); };
  const saveCourse = event => { event.preventDefault(); if (!courseForm.courseName.trim()) return; setData(current => ({ ...current, calendarCourses: courseForm.courseId ? current.calendarCourses.map(item => item.courseId === courseForm.courseId ? createCourse({ ...item, ...courseForm, updatedAt: new Date().toISOString() }) : item) : [...current.calendarCourses, createCourse(courseForm)] })); setCourseForm(blankCourse); };
  const toggle = (key, idKey, id) => setData(current => ({ ...current, [key]: current[key].map(item => item[idKey] === id ? { ...item, active: !item.active, updatedAt: new Date().toISOString() } : item) }));
  const removeLibraryItem = (key, idKey, id, label) => {
    if (data.calendarEvents.some(item => item[idKey] === id && !item.archived)) { alert(`Archive or remove linked calendar events before deleting this ${label}.`); return; }
    if (pendingLibraryDelete !== id) { setPendingLibraryDelete(id); return; }
    setData(current => ({ ...current, [key]: current[key].filter(item => item[idKey] !== id) }));
    setPendingLibraryDelete('');
  };
  return <div className="calendar-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="calendar-manager panel glass"><header><div><span>Calendar District settings</span><h2>Jobs, courses, and week</h2></div><button onClick={onClose} aria-label="Close calendar settings">×</button></header><div className="calendar-manager-tabs"><button className={tab === 'jobs' ? 'active' : ''} onClick={() => setTab('jobs')}>Jobs</button><button className={tab === 'courses' ? 'active' : ''} onClick={() => setTab('courses')}>Courses</button><button className={tab === 'week' ? 'active' : ''} onClick={() => setTab('week')}>Week settings</button></div>
    {tab === 'jobs' && <div className="calendar-manager-grid"><form onSubmit={saveJob}><h3>{jobForm.jobId ? 'Edit job' : 'Add a job'}</h3><label>Job name<input required value={jobForm.jobName} onChange={event => setJobForm({ ...jobForm, jobName: event.target.value })} placeholder="Nursing Home" /></label><label>Employer<input value={jobForm.employer} onChange={event => setJobForm({ ...jobForm, employer: event.target.value })} /></label><label>Role or title<input value={jobForm.roleTitle} onChange={event => setJobForm({ ...jobForm, roleTitle: event.target.value })} /></label><div className="calendar-manager-split"><label>Label color<input type="color" value={jobForm.color} onChange={event => setJobForm({ ...jobForm, color: event.target.value })} /></label><label>Default rate<input type="number" min="0" step="0.01" value={jobForm.defaultHourlyRate} onChange={event => setJobForm({ ...jobForm, defaultHourlyRate: event.target.value })} /></label></div><div className="calendar-manager-split"><label>Default start<input type="time" value={jobForm.defaultShiftStartTime} onChange={event => setJobForm({ ...jobForm, defaultShiftStartTime: event.target.value })} /></label><label>Default end<input type="time" value={jobForm.defaultShiftEndTime} onChange={event => setJobForm({ ...jobForm, defaultShiftEndTime: event.target.value })} /></label></div><label>Default break minutes<input type="number" min="0" step="5" value={jobForm.defaultBreakLength} onChange={event => setJobForm({ ...jobForm, defaultBreakLength: event.target.value })} /></label><label>Notes<textarea value={jobForm.notes} onChange={event => setJobForm({ ...jobForm, notes: event.target.value })} /></label><button className="primary">Save job</button>{jobForm.jobId && <button type="button" onClick={() => setJobForm(blankJob)}>Cancel editing</button>}</form><div className="calendar-manager-list">{data.calendarJobs.map(job => <article key={job.jobId}><i style={{ background: job.color }} /><div><span>{job.employer || 'Independent'}</span><h4>{job.jobName}</h4><p>{job.roleTitle || 'Role not added'} · {money(job.defaultHourlyRate || 0)}/hr</p><small>{job.active ? 'Active' : 'Inactive'}</small></div><button onClick={() => setJobForm({ ...job })}>Edit</button><button onClick={() => toggle('calendarJobs', 'jobId', job.jobId)}>{job.active ? 'Deactivate' : 'Activate'}</button><button className="danger" onClick={() => removeLibraryItem('calendarJobs', 'jobId', job.jobId, 'job')}>{pendingLibraryDelete === job.jobId ? 'Confirm delete' : 'Delete'}</button></article>)}{!data.calendarJobs.length && <p className="calendar-empty-inline">No jobs saved. Add only your real workplaces here.</p>}</div></div>}
    {tab === 'courses' && <div className="calendar-manager-grid"><form onSubmit={saveCourse}><h3>{courseForm.courseId ? 'Edit course' : 'Add a course'}</h3><label>Course name<input required value={courseForm.courseName} onChange={event => setCourseForm({ ...courseForm, courseName: event.target.value })} /></label><label>Course code<input value={courseForm.courseCode} onChange={event => setCourseForm({ ...courseForm, courseCode: event.target.value })} /></label><label>Instructor<input value={courseForm.instructor} onChange={event => setCourseForm({ ...courseForm, instructor: event.target.value })} /></label><label>Location or online<input value={courseForm.location} onChange={event => setCourseForm({ ...courseForm, location: event.target.value })} /></label><label>Label color<input type="color" value={courseForm.color} onChange={event => setCourseForm({ ...courseForm, color: event.target.value })} /></label><label>Notes<textarea value={courseForm.notes} onChange={event => setCourseForm({ ...courseForm, notes: event.target.value })} /></label><button className="primary">Save course</button>{courseForm.courseId && <button type="button" onClick={() => setCourseForm(blankCourse)}>Cancel editing</button>}</form><div className="calendar-manager-list">{data.calendarCourses.map(course => <article key={course.courseId}><i style={{ background: course.color }} /><div><span>{course.courseCode || 'Course'}</span><h4>{course.courseName}</h4><p>{course.instructor || 'Instructor not added'}</p><small>{course.active ? 'Active' : 'Inactive'}</small></div><button onClick={() => setCourseForm({ ...course })}>Edit</button><button onClick={() => toggle('calendarCourses', 'courseId', course.courseId)}>{course.active ? 'Deactivate' : 'Activate'}</button><button className="danger" onClick={() => removeLibraryItem('calendarCourses', 'courseId', course.courseId, 'course')}>{pendingLibraryDelete === course.courseId ? 'Confirm delete' : 'Delete'}</button></article>)}{!data.calendarCourses.length && <p className="calendar-empty-inline">No courses saved yet.</p>}</div></div>}
    {tab === 'week' && <div className="calendar-week-setting"><span>First day of the week</span><div><button className={data.calendarSettings.weekStartsOn === 0 ? 'active' : ''} onClick={() => setData(current => ({ ...current, calendarSettings: { ...current.calendarSettings, weekStartsOn: 0 } }))}>Sunday</button><button className={data.calendarSettings.weekStartsOn === 1 ? 'active' : ''} onClick={() => setData(current => ({ ...current, calendarSettings: { ...current.calendarSettings, weekStartsOn: 1 } }))}>Monday</button></div><p>This changes week view, weekly summaries, and month alignment without moving any saved event.</p></div>}
  </section></div>;
}

export function CalendarDistrict({ data, setData, initialEventId = '', navigate, openProject }) {
  const [view, setView] = useState('month');
  const [anchor, setAnchor] = useState(localDate());
  const [filters, setFilters] = useState({ groups: [], jobId: '', courseId: '', completion: '', timeframe: '', showArchived: false });
  const [quickDate, setQuickDate] = useState('');
  const [editor, setEditor] = useState(null);
  const [editorMode, setEditorMode] = useState('edit');
  const [detail, setDetail] = useState(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const touchStart = useRef(null);
  const openedInitialEvent = useRef('');
  const weekStartsOn = data.calendarSettings?.weekStartsOn === 1 ? 1 : 0;
  const [rangeStart, rangeEnd] = rangeForView(view, anchor, weekStartsOn);
  const filteredRoots = useMemo(() => filterCalendarEvents(data.calendarEvents, filters, localDate(), weekStartsOn), [data.calendarEvents, filters, weekStartsOn]);
  const visibleEvents = useMemo(() => {
    const expanded = expandCalendarEvents(filteredRoots, rangeStart, rangeEnd);
    if (filters.timeframe === 'This week') {
      const currentWeekStart = startOfWeek(localDate(), weekStartsOn);
      const currentWeekEnd = endOfWeek(localDate(), weekStartsOn);
      return expanded.filter(event => event.date >= currentWeekStart && event.date <= currentWeekEnd);
    }
    if (filters.timeframe === 'This month') return expanded.filter(event => String(event.date).slice(0, 7) === String(localDate()).slice(0, 7));
    return expanded;
  }, [filteredRoots, rangeStart, rangeEnd, filters.timeframe, weekStartsOn]);
  const weekly = useMemo(() => weeklyCalendarSummary(data.calendarEvents, data.calendarJobs, anchor, weekStartsOn), [data.calendarEvents, data.calendarJobs, anchor, weekStartsOn]);
  const monthly = useMemo(() => monthlyCalendarSummary(data.calendarEvents, data.calendarJobs, anchor), [data.calendarEvents, data.calendarJobs, anchor]);

  useEffect(() => {
    if (!initialEventId || openedInitialEvent.current === initialEventId) return;
    const source = data.calendarEvents.find(item => item.calendarEventId === initialEventId || item.eventId === initialEventId || item.shiftId === initialEventId || item.assignmentId === initialEventId);
    if (!source) return;
    setAnchor(source.date);
    const occurrence = expandCalendarEvents([source], source.date, source.date)[0] || source;
    setDetail(occurrence);
    openedInitialEvent.current = initialEventId;
  }, [initialEventId, data.calendarEvents]);

  const openAdd = date => setQuickDate(date);
  const chooseQuick = type => { setEditor(blankEvent(type, quickDate || anchor)); setEditorMode('quick'); setQuickDate(''); };
  const saveEvent = (candidate, scope) => {
    setData(current => {
      const sourceId = editor?.originCalendarEventId || editor?.calendarEventId;
      if (sourceId && current.calendarEvents.some(item => item.calendarEventId === sourceId)) return { ...current, calendarEvents: applyRecurringEdit(current.calendarEvents, editor, candidate, scope) };
      return { ...current, calendarEvents: [...current.calendarEvents, candidate] };
    });
    setEditor(null);
    setDetail(null);
  };
  const duplicate = event => {
    const copy = { ...event, calendarEventId: undefined, eventId: undefined, id: undefined, shiftId: undefined, assignmentId: undefined, recurrenceSeriesId: '', recurrenceParentId: event.calendarEventId, recurring: false, recurrence: { frequency: 'None', interval: 1, weekdays: [], endDate: '', count: '', excludedDates: [] }, title: `Copy of ${event.title}` };
    setDetail(null); setEditor(copy); setEditorMode('edit');
  };
  const addStudy = event => {
    setDetail(null);
    setEditor({ ...blankEvent('Study Session', event.date), title: `Study · ${event.title}`, courseId: event.courseId, courseName: event.courseName, courseCode: event.courseCode, assignmentId: event.assignmentId, notes: `Study time for ${event.title}` });
  };
  const swipeEnd = event => {
    if (touchStart.current == null) return;
    const delta = event.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(delta) > 65) setAnchor(current => moveAnchor(view, current, delta < 0 ? 1 : -1));
    touchStart.current = null;
  };
  return <div className="page calendar-district" onTouchStart={event => { touchStart.current = event.changedTouches[0].clientX; }} onTouchEnd={swipeEnd}>
    <SectionTitle eyebrow="Personal planning" title="Calendar District" text="Work shifts, school responsibilities, and real life—held together in one private calendar." action={<button className="calendar-manage-button" onClick={() => setManagerOpen(true)}>Manage jobs & courses</button>} />
    <section className="calendar-command-bar panel glass">
      <div className="calendar-navigation"><button onClick={() => setAnchor(current => moveAnchor(view, current, -1))} aria-label="Previous period">‹</button><button onClick={() => setAnchor(localDate())}>Today</button><button onClick={() => setAnchor(current => moveAnchor(view, current, 1))} aria-label="Next period">›</button><label>Jump to date<input type="date" value={anchor} onChange={event => setAnchor(event.target.value)} /></label></div>
      <div className="calendar-period"><span>Currently viewing</span><h3>{labelForAnchor(view, anchor, weekStartsOn)}</h3></div>
      <div className="calendar-view-switcher" role="group" aria-label="Calendar view">{[['month','Month'],['week','Week'],['day','Day'],['agenda','Agenda']].map(([value,label]) => <button key={value} className={view === value ? 'active' : ''} onClick={() => setView(value)}>{label}</button>)}</div>
    </section>
    <Filters filters={filters} setFilters={setFilters} jobs={data.calendarJobs} courses={data.calendarCourses} />
    {view === 'week' && <WeeklySummary summary={weekly} />}
    {view === 'month' && <MonthlySummary summary={monthly} />}
    {view === 'month' && <MonthView anchor={anchor} events={visibleEvents} weekStartsOn={weekStartsOn} jobs={data.calendarJobs} courses={data.calendarCourses} onAdd={openAdd} onOpen={setDetail} />}
    {view === 'week' && <WeekView anchor={anchor} events={visibleEvents} weekStartsOn={weekStartsOn} jobs={data.calendarJobs} courses={data.calendarCourses} onAdd={openAdd} onOpen={setDetail} />}
    {view === 'day' && <DayView anchor={anchor} events={visibleEvents} jobs={data.calendarJobs} courses={data.calendarCourses} onAdd={openAdd} onOpen={setDetail} />}
    {view === 'agenda' && <AgendaView events={visibleEvents} jobs={data.calendarJobs} courses={data.calendarCourses} onOpen={setDetail} />}
    <button className="calendar-floating-add" onClick={() => openAdd(anchor)}><span>＋</span> Quick Add</button>
    {quickDate && <QuickAdd date={quickDate} onChoose={chooseQuick} onClose={() => setQuickDate('')} />}
    {editor && <EventEditor initial={editor} mode={editorMode} data={data} events={data.calendarEvents} onClose={() => setEditor(null)} onSave={saveEvent} />}
    {detail && <EventDetails event={detail} data={data} setData={setData} onClose={() => setDetail(null)} onEdit={event => { setDetail(null); setEditor(event); setEditorMode('edit'); }} onDuplicate={duplicate} onAddStudy={addStudy} navigate={navigate} openProject={openProject} />}
    {managerOpen && <ManageCalendar data={data} setData={setData} onClose={() => setManagerOpen(false)} />}
  </div>;
}

function countConflicts(events, start, end) {
  const occurrences = expandCalendarEvents(events, start, end);
  let count = 0;
  for (let left = 0; left < occurrences.length; left += 1) {
    const leftInterval = eventInterval(occurrences[left]);
    if (!leftInterval) continue;
    for (let right = left + 1; right < occurrences.length; right += 1) {
      const rightInterval = eventInterval(occurrences[right]);
      if (rightInterval && leftInterval.start < rightInterval.end && rightInterval.start < leftInterval.end) count += 1;
    }
  }
  return count;
}

export function CalendarDashboardCards({ data, openCalendar }) {
  const today = localDate();
  const todayEvents = expandCalendarEvents(data.calendarEvents || [], today, today);
  const shifts = todayEvents.filter(event => event.group === 'work');
  const school = todayEvents.filter(event => event.group === 'school');
  const weekly = weeklyCalendarSummary(data.calendarEvents || [], data.calendarJobs || [], today, data.calendarSettings?.weekStartsOn || 0);
  const upcoming = expandCalendarEvents(data.calendarEvents || [], today, addDays(today, 30));
  const nextAssignment = upcoming.find(event => event.assignmentId && !event.completed);
  const nextExam = upcoming.find(event => ['Lab', 'Exam', 'Quiz'].includes(event.schoolEventType));
  const nextAppointment = upcoming.find(event => ['Appointment', 'Personal'].includes(event.eventType));
  const conflicts = countConflicts(data.calendarEvents || [], today, addDays(today, 14));
  return <section className="calendar-dashboard-card glass">
    <button className="calendar-dashboard-heading" onClick={() => openCalendar('')}><span aria-hidden="true">❦</span><div><small>Personal planning</small><h3>Calendar District</h3><p>Today, this week, and what needs a little room.</p></div><b>Open calendar →</b></button>
    <div className="calendar-dashboard-grid">
      <article><span>Today</span><strong>{shifts.length} shift{shifts.length === 1 ? '' : 's'} · {school.length} school</strong><small>{shifts[0]?.title || school[0]?.title || 'No scheduled commitments'}</small></article>
      <article><span>This week</span><strong>{hours(weekly.scheduledHours)} scheduled</strong><small>{hours(weekly.actualHours)} worked · {money(weekly.grossPay)} estimated</small></article>
      <article><span>Coming up</span><strong>{nextAssignment?.title || nextExam?.title || nextAppointment?.title || 'Open horizon'}</strong><small>{nextAssignment ? `Due ${dateLabel(nextAssignment.dueDate || nextAssignment.date)}` : nextExam ? `${nextExam.schoolEventType} · ${dateLabel(nextExam.date)}` : nextAppointment ? dateLabel(nextAppointment.date) : 'Nothing urgent in the next 30 days'}</small></article>
      <article className={conflicts ? 'has-conflict' : ''}><span>Schedule balance</span><strong>{conflicts ? `${conflicts} possible conflict${conflicts === 1 ? '' : 's'}` : 'No conflicts found'}</strong><small>{nextExam ? `Next lab or exam: ${dateLabel(nextExam.date)}` : 'No lab or exam scheduled'}</small></article>
    </div>
  </section>;
}
