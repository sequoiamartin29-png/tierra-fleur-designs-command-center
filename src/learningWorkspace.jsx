import React, { useMemo, useState } from 'react';
import './learningWorkspace.css';
import { LOCAL_LESSONS } from './localLessons.js';
import { LESSON_LEVELS, LESSON_TOPICS } from './summaryModels.js';

const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
const dateLabel = value => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not dated';
const blank = { title: '', topic: 'Horticulture', skillLevel: 'Growing', estimatedTime: '', introduction: '', content: '', keyTermsText: '', stepsText: '', tierraFleurExample: '', assignment: '', questionsText: '', answersText: '', references: '', personalNotes: '' };

function Empty({ title, text }) {
  return <div className="learning-empty"><span aria-hidden="true">❦</span><h3>{title}</h3><p>{text}</p></div>;
}

function toForm(lesson = {}) {
  return { ...blank, ...lesson, keyTermsText: (lesson.keyTerms || []).join(', '), stepsText: (lesson.steps || []).join('\n'), questionsText: (lesson.questions || []).map(item => item.question || '').join('\n'), answersText: (lesson.questions || []).map(item => item.answer || '').join('\n') };
}

function fromForm(form, existing = {}) {
  const questions = form.questionsText.split('\n').map(value => value.trim()).filter(Boolean);
  const answers = form.answersText.split('\n').map(value => value.trim());
  return {
    ...existing,
    title: form.title.trim(),
    topic: form.topic,
    skillLevel: form.skillLevel,
    estimatedTime: form.estimatedTime.trim(),
    introduction: form.introduction.trim(),
    content: form.content.trim(),
    keyTerms: form.keyTermsText.split(',').map(value => value.trim()).filter(Boolean),
    steps: form.stepsText.split('\n').map(value => value.trim()).filter(Boolean),
    tierraFleurExample: form.tierraFleurExample.trim(),
    assignment: form.assignment.trim(),
    questions: questions.map((question, index) => ({ question, answer: answers[index] || '' })),
    references: form.references.trim(),
    personalNotes: form.personalNotes.trim(),
  };
}

function LessonReader({ lesson, builtIn = false, completed = false, onComplete, onDuplicate, onFavorite, onEdit, onArchive }) {
  const content = builtIn ? lesson.lesson : lesson.content;
  const steps = builtIn ? lesson.actionSteps : lesson.steps;
  const questions = builtIn && lesson.challenge ? [{ question: lesson.challenge.question, answer: lesson.challenge.explanation }] : lesson.questions || [];
  return <article className="lesson-reader glass">
    <div className="lesson-reader-meta"><span>{builtIn ? 'Built-In Lesson' : 'My Lesson'}</span><span>{lesson.topic}</span><span>{lesson.skillLevel || lesson.level || 'Growing'}</span>{lesson.estimatedTime && <span>{lesson.estimatedTime}</span>}</div>
    <h2>{lesson.title}</h2><p className="lesson-introduction">{lesson.introduction || lesson.summary}</p>
    <div className="lesson-content">{String(content || '').split('\n').filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
    {(lesson.keyTerms || []).length > 0 && <section><h3>Key terms</h3><div className="lesson-term-list">{lesson.keyTerms.map(term => <span key={term}>{term}</span>)}</div></section>}
    {steps?.length > 0 && <section><h3>Step by step</h3><ol>{steps.map((step, index) => <li key={index}>{step}</li>)}</ol></section>}
    {lesson.tierraFleurExample && <section className="example-box"><strong>Tierra Fleur application</strong><p>{lesson.tierraFleurExample}</p></section>}
    {!builtIn && lesson.assignment && <section className="challenge-box"><h3>Action assignment</h3><p>{lesson.assignment}</p></section>}
    {questions.length > 0 && <section className="knowledge-list"><h3>Knowledge check</h3>{questions.map((item, index) => <details key={index}><summary>{item.question}</summary><p>{item.answer || 'Answer notes have not been added.'}</p></details>)}</section>}
    {!builtIn && (lesson.references || lesson.personalNotes) && <section className="lesson-notes-grid">{lesson.references && <div><strong>References or source notes</strong><p>{lesson.references}</p></div>}{lesson.personalNotes && <div><strong>Personal notes</strong><p>{lesson.personalNotes}</p></div>}</section>}
    <div className="lesson-reader-actions"><button className={completed ? 'complete' : ''} onClick={onComplete}>{completed ? '✓ Completed' : 'Mark complete'}</button>{!builtIn && <button onClick={onFavorite}>{lesson.favorite ? '★ Favorite' : '☆ Add favorite'}</button>}<button onClick={onDuplicate}>Duplicate into My Lessons</button>{!builtIn && <><button onClick={onEdit}>Edit</button><button onClick={onArchive}>{lesson.archived ? 'Restore' : 'Archive'}</button></>}</div>
    {!builtIn && <small>Created {dateLabel(lesson.createdAt)} · Updated {dateLabel(lesson.updatedAt)}</small>}
  </article>;
}

export function LearningWorkspace({ learning, setLearning }) {
  const [view, setView] = useState('Built-In Lessons');
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('All');
  const [level, setLevel] = useState('All');
  const [selectedBuiltInId, setSelectedBuiltInId] = useState(LOCAL_LESSONS[0]?.id || '');
  const [selectedMyId, setSelectedMyId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(blank);
  const [formOpen, setFormOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState('');
  const myLessons = learning.myLessons || [];
  const selectedBuiltIn = LOCAL_LESSONS.find(item => item.id === selectedBuiltInId) || LOCAL_LESSONS[0];
  const selectedMy = myLessons.find(item => item.lessonId === selectedMyId);

  const filteredBuiltIn = useMemo(() => LOCAL_LESSONS.filter(item => {
    const text = `${item.title} ${item.topic} ${item.summary} ${item.lesson}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (topic === 'All' || item.topic === topic);
  }), [query, topic]);
  const filteredMy = useMemo(() => myLessons.filter(item => {
    if (showArchived !== Boolean(item.archived)) return false;
    const text = `${item.title} ${item.topic} ${item.skillLevel} ${(item.keyTerms || []).join(' ')} ${item.introduction} ${item.content} ${(item.steps || []).join(' ')}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (topic === 'All' || item.topic === topic) && (level === 'All' || item.skillLevel === level);
  }).sort((a, b) => Number(b.favorite) - Number(a.favorite) || String(b.updatedAt).localeCompare(String(a.updatedAt))), [myLessons, query, topic, level, showArchived]);

  const save = event => {
    event.preventDefault();
    if (!form.title.trim()) return;
    const stamp = now();
    if (editingId) {
      setLearning({ ...learning, myLessons: myLessons.map(item => item.lessonId === editingId ? { ...fromForm(form, item), updatedAt: stamp } : item) });
      setSelectedMyId(editingId);
    } else {
      const lessonId = uid('lesson');
      const record = { ...fromForm(form), id: lessonId, lessonId, favorite: false, completed: false, archived: false, createdAt: stamp, updatedAt: stamp };
      setLearning({ ...learning, myLessons: [record, ...myLessons] });
      setSelectedMyId(lessonId);
    }
    setEditingId(''); setForm(blank); setFormOpen(false); setView('My Lessons');
  };
  const startAdd = () => { setEditingId(''); setForm(blank); setFormOpen(true); setView('My Lessons'); };
  const edit = lesson => { setEditingId(lesson.lessonId); setForm(toForm(lesson)); setFormOpen(true); };
  const patch = (lessonId, changes) => setLearning({ ...learning, myLessons: myLessons.map(item => item.lessonId === lessonId ? { ...item, ...changes, updatedAt: now() } : item) });
  const duplicate = lesson => {
    const lessonId = uid('lesson');
    const stamp = now();
    const source = lesson.lessonId ? lesson : {
      title: lesson.title,
      topic: LESSON_TOPICS.includes(lesson.topic) ? lesson.topic : 'Other',
      skillLevel: 'Growing',
      estimatedTime: '',
      introduction: lesson.summary,
      content: lesson.lesson,
      keyTerms: [],
      steps: lesson.actionSteps || [],
      tierraFleurExample: lesson.tierraFleurExample || '',
      assignment: '',
      questions: lesson.challenge ? [{ question: lesson.challenge.question, answer: lesson.challenge.explanation }] : [],
      references: 'Duplicated from a built-in Tierra Fleur lesson.',
      personalNotes: '',
    };
    const copy = { ...JSON.parse(JSON.stringify(source)), id: lessonId, lessonId, title: `${source.title} — Copy`, favorite: false, completed: false, archived: false, createdAt: stamp, updatedAt: stamp };
    setLearning({ ...learning, myLessons: [copy, ...myLessons] });
    setSelectedMyId(lessonId); setView('My Lessons'); setShowArchived(false);
  };
  const completeBuiltIn = lesson => setLearning({ ...learning, completed: Array.from(new Set([lesson.id, ...(learning.completed || [])])) });
  const remove = lesson => {
    if (pendingDeleteId !== lesson.lessonId) { setPendingDeleteId(lesson.lessonId); return; }
    setLearning({ ...learning, myLessons: myLessons.filter(item => item.lessonId !== lesson.lessonId) });
    if (selectedMyId === lesson.lessonId) setSelectedMyId('');
    setPendingDeleteId('');
  };

  return <div className="page learning-workspace"><div className="section-title"><div><span>Free local learning</span><h2>Learning District</h2><p>Open Tierra Fleur’s built-in library or manually create private lessons that stay with this device and its backups.</p></div><button className="primary" onClick={startAdd}>+ Create local lesson</button></div>
    <section className="learning-intro glass"><div><span className="eyebrow">Tierra Fleur Academy</span><h3>Built-in guidance and your own curriculum.</h3><p>Built-in lessons remain read-only. My Lessons are editable, searchable, reusable, and clearly labeled as manually created.</p></div><div className="learning-stats"><div><strong>{LOCAL_LESSONS.length}</strong><span>Built-In</span></div><div><strong>{myLessons.filter(item => !item.archived).length}</strong><span>My Lessons</span></div><div><strong>{(learning.completed || []).length + myLessons.filter(item => item.completed).length}</strong><span>Completed</span></div></div></section>
    <nav className="learning-view-tabs">{['Built-In Lessons', 'My Lessons'].map(item => <button key={item} className={view === item ? 'active' : ''} onClick={() => setView(item)}>{item}</button>)}</nav>
    <section className="panel glass learning-library-controls"><label>Search lessons<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Title, topic, skill level, key term, or content" /></label><label>Topic<select value={topic} onChange={event => setTopic(event.target.value)}><option>All</option>{LESSON_TOPICS.map(item => <option key={item}>{item}</option>)}</select></label>{view === 'My Lessons' && <label>Skill level<select value={level} onChange={event => setLevel(event.target.value)}><option>All</option>{LESSON_LEVELS.map(item => <option key={item}>{item}</option>)}</select></label>}{view === 'My Lessons' && <button onClick={() => setShowArchived(value => !value)}>{showArchived ? 'View active' : 'View archived'}</button>}</section>
    {formOpen && <form className="panel glass local-lesson-form" onSubmit={save}><div className="local-lesson-form-heading"><div><span>My Lessons · manual creator</span><h3>{editingId ? 'Edit local lesson' : 'Create a local lesson'}</h3></div><button type="button" onClick={() => { setFormOpen(false); setEditingId(''); setForm(blank); }}>Close</button></div><label>Title<input required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></label><div className="split-fields"><label>District or topic<select value={form.topic} onChange={event => setForm({ ...form, topic: event.target.value })}>{LESSON_TOPICS.map(item => <option key={item}>{item}</option>)}</select></label><label>Skill level<select value={form.skillLevel} onChange={event => setForm({ ...form, skillLevel: event.target.value })}>{LESSON_LEVELS.map(item => <option key={item}>{item}</option>)}</select></label></div><label>Estimated time<input value={form.estimatedTime} onChange={event => setForm({ ...form, estimatedTime: event.target.value })} placeholder="20 minutes" /></label><label>Introduction<textarea value={form.introduction} onChange={event => setForm({ ...form, introduction: event.target.value })} /></label><label>Main lesson content<textarea className="lesson-main-input" value={form.content} onChange={event => setForm({ ...form, content: event.target.value })} /></label><label>Key terms<input value={form.keyTermsText} onChange={event => setForm({ ...form, keyTermsText: event.target.value })} placeholder="Comma-separated" /></label><label>Step-by-step instructions<textarea value={form.stepsText} onChange={event => setForm({ ...form, stepsText: event.target.value })} placeholder="One step per line" /></label><label>Tierra Fleur application example<textarea value={form.tierraFleurExample} onChange={event => setForm({ ...form, tierraFleurExample: event.target.value })} /></label><label>Action assignment<textarea value={form.assignment} onChange={event => setForm({ ...form, assignment: event.target.value })} /></label><div className="split-fields"><label>Knowledge-check questions<textarea value={form.questionsText} onChange={event => setForm({ ...form, questionsText: event.target.value })} placeholder="One question per line" /></label><label>Answers<textarea value={form.answersText} onChange={event => setForm({ ...form, answersText: event.target.value })} placeholder="One matching answer per line" /></label></div><label>References or source notes<textarea value={form.references} onChange={event => setForm({ ...form, references: event.target.value })} /></label><label>Personal notes<textarea value={form.personalNotes} onChange={event => setForm({ ...form, personalNotes: event.target.value })} /></label><button className="primary">{editingId ? 'Save lesson changes' : 'Save My Lesson'}</button></form>}
    {view === 'Built-In Lessons' && <div className="learning-library-layout"><aside className="panel glass lesson-library-list"><span>Built-In Lessons</span>{filteredBuiltIn.map(item => <button key={item.id} className={selectedBuiltIn?.id === item.id ? 'active' : ''} onClick={() => setSelectedBuiltInId(item.id)}><strong>{item.title}</strong><small>{item.topic}</small></button>)}{!filteredBuiltIn.length && <Empty title="No built-in match" text="Try another title or topic." />}</aside>{selectedBuiltIn && <LessonReader lesson={selectedBuiltIn} builtIn completed={(learning.completed || []).includes(selectedBuiltIn.id)} onComplete={() => completeBuiltIn(selectedBuiltIn)} onDuplicate={() => duplicate(selectedBuiltIn)} />}</div>}
    {view === 'My Lessons' && <div className="learning-library-layout"><aside className="panel glass lesson-library-list"><span>{showArchived ? 'Archived My Lessons' : 'My Lessons'}</span>{filteredMy.map(item => <button key={item.lessonId} className={selectedMy?.lessonId === item.lessonId ? 'active' : ''} onClick={() => { setPendingDeleteId(''); setSelectedMyId(item.lessonId); }}><strong>{item.favorite ? '★ ' : ''}{item.title}</strong><small>{item.topic} · {item.skillLevel}</small></button>)}{!filteredMy.length && <Empty title={showArchived ? 'No archived lessons' : 'No My Lessons match'} text="Create a local lesson or duplicate a built-in lesson to begin." />}</aside>{selectedMy && <div><LessonReader lesson={selectedMy} completed={selectedMy.completed} onComplete={() => patch(selectedMy.lessonId, { completed: !selectedMy.completed })} onFavorite={() => patch(selectedMy.lessonId, { favorite: !selectedMy.favorite })} onDuplicate={() => duplicate(selectedMy)} onEdit={() => edit(selectedMy)} onArchive={() => patch(selectedMy.lessonId, { archived: !selectedMy.archived })} /><button className="permanent-delete-lesson danger" onClick={() => remove(selectedMy)}>{pendingDeleteId === selectedMy.lessonId ? 'Confirm permanent delete' : 'Permanently delete lesson'}</button></div>}</div>}
  </div>;
}
