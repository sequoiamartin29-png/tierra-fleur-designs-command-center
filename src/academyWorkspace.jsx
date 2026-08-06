import React, { useEffect, useMemo, useRef, useState } from 'react';
import './academyWorkspace.css';
import { LearningWorkspace } from './learningWorkspace.jsx';
import { ACADEMY_CAPSTONE_FRAMEWORK, ACADEMY_SCHOOLS, IRRIGATION_LEVEL_FRAMEWORK } from './academyCatalog.js';
import { ACADEMY_CURRICULUM, ACADEMY_LESSONS, academyActivity, academyCourseForSchool, academyLesson } from './academyCurriculum.js';
import {
  ACADEMY_MASTERY_MAX,
  ACADEMY_MASTERY_MIN,
  academyDashboardSummary,
  academyLevelGate,
  completeAcademyLessonCheck,
  openAcademyLesson,
  recordAcademyActivity,
  recordAcademyAssessment,
  recordAcademyStudyTime,
  saveAcademyNote,
  saveAcademyUserContent,
  saveClientSimulation,
  saveDesignChallengeSubmission,
  saveFieldLabSubmission,
  selectAssessmentQuestions,
  toggleAcademyBookmark,
  validateAcademyUserContent,
} from './academyEngine.js';
import { CLIENT_CLARITY_CHECKLIST, CLIENT_CONFIDENCE_SCENARIOS, CLIENT_PROFESSIONALISM_CHECKLIST, clientConceptCoverage } from './academySimulations.js';
import { PROJECT_PHOTO_ACCEPT, prepareAcademyEvidence } from './imageStorage.js';

const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
const today = () => new Date().toISOString().slice(0, 10);
const dateLabel = value => value ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not recorded';
const minutesLabel = value => value >= 60 ? `${Math.floor(value / 60)}h ${value % 60}m` : `${value}m`;

function Empty({ title, text }) {
  return <div className="academy-empty"><span aria-hidden="true">❦</span><strong>{title}</strong><p>{text}</p></div>;
}

function ProgressRing({ value, label }) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return <div className="academy-progress-ring" style={{ '--progress': `${safe * 3.6}deg` }} aria-label={`${label}: ${safe}%`}><div><strong>{safe}%</strong><span>{label}</span></div></div>;
}

function StatusPill({ complete, children }) {
  return <span className={`academy-status ${complete ? 'complete' : ''}`}>{complete ? '✓' : '○'} {children}</span>;
}

function DashboardView({ academy, openSchool, goToAction, setView }) {
  const summary = useMemo(() => academyDashboardSummary(academy), [academy]);
  const currentCurriculum = ACADEMY_CURRICULUM.find(item => item.levels[0].id === summary.currentLevelId);
  return <div className="academy-dashboard">
    <section className="academy-hero glass">
      <div className="academy-hero-copy"><span>Private professional development</span><h2>Tierra Fleur Academy</h2><p>Build practical horticulture, landscape, irrigation, installation, client, and business mastery through demonstrated work.</p><div className="academy-hero-actions"><button className="primary" onClick={() => summary.nextAction && goToAction(summary.nextAction, currentCurriculum)}>Continue required work</button><button onClick={() => setView('Study Queue')}>Open study queue</button></div></div>
      <ProgressRing value={summary.masteryPercentage} label="Mastery" />
    </section>
    <p className="academy-private-notice">Tierra Fleur Academy is a private professional-development system. It does not award an accredited degree, license, or external certification.</p>
    <section className="academy-current-grid">
      <article className="glass academy-rank-card"><span>Current rank</span><h3>{summary.rank.title}</h3><p>Ranks require completed levels, practical evidence, and mastery—not points alone.</p></article>
      <article className="glass academy-current-card"><span>Current academy</span><strong>Tierra Fleur Academy</strong><small>{summary.currentSchool}</small></article>
      <article className="glass academy-current-card"><span>Current course</span><strong>{summary.currentCourse}</strong><small>{summary.currentLevel}</small></article>
      <article className="glass academy-current-card"><span>Next required action</span><strong>{summary.nextAction?.label || 'Choose a foundation school'}</strong><button onClick={() => summary.nextAction && goToAction(summary.nextAction, currentCurriculum)}>Continue</button></article>
    </section>
    <section className="academy-metric-grid">
      {[
        ['Lessons completed', summary.lessonsCompleted],
        ['Assessments passed', summary.assessmentsPassed],
        ['Assessments to review', summary.assessmentsRequiringReview],
        ['Field labs awaiting', summary.fieldLabsAwaiting],
        ['Design challenges awaiting', summary.designChallengesAwaiting],
        ['Skills to reinforce', summary.skillsNeedingReinforcement],
        ['Study time', minutesLabel(summary.totalStudyMinutes)],
        ['Current streak', `${summary.streak} day${summary.streak === 1 ? '' : 's'}`],
        ['Bookmarks', summary.bookmarked],
      ].map(([label, value]) => <article key={label} className="glass"><span>{label}</span><strong>{value}</strong></article>)}
    </section>
    <div className="academy-dashboard-columns">
      <section className="glass academy-dashboard-panel"><div className="academy-panel-heading"><div><span>Foundation curriculum</span><h3>Eight complete Level 1 paths</h3></div><button onClick={() => setView('Schools')}>All 20 schools</button></div><div className="academy-foundation-list">{ACADEMY_CURRICULUM.map(item => { const gate = academyLevelGate(academy, item); return <button key={item.school.id} onClick={() => openSchool(item.school.id)}><span>{String(item.school.order).padStart(2, '0')}</span><div><strong>{item.school.title}</strong><small>{gate.complete ? 'Level 1 complete' : `${gate.remaining.length} mastery requirements remain`}</small></div><b>{gate.masteryScore}%</b></button>; })}</div></section>
      <section className="glass academy-dashboard-panel"><div className="academy-panel-heading"><div><span>Adaptive review</span><h3>Skills needing reinforcement</h3></div><button onClick={() => setView('Study Queue')}>Review queue</button></div>{academy.reviewQueue.filter(item => !item.completedAt).slice(0, 5).map(item => <article className="academy-review-card" key={item.queueId}><strong>{item.title}</strong><p>{item.reason}</p><small>{item.section ? `Review: ${item.section}` : 'A fresh practical example is ready.'}</small></article>)}{!academy.reviewQueue.some(item => !item.completedAt) && <Empty title="No review is due" text="Missed objectives and spaced review will appear here with a transparent reason." />}<div className="academy-recent-panel"><h4>Recently studied</h4>{summary.recent.map(item => <button key={item.lessonId} onClick={() => { const curriculum = ACADEMY_CURRICULUM.find(value => value.lessons.some(lessonItem => lessonItem.id === item.lessonId)); if (curriculum) openSchool(curriculum.school.id); }}>{academyLesson(item.lessonId)?.title || item.lessonId}<small>{dateLabel(item.lastOpenedAt)}</small></button>)}{!summary.recent.length && <small>No recent lesson activity.</small>}<h4>Bookmarked lessons</h4>{academy.bookmarks.slice(0, 5).map(item => <button key={item.bookmarkId} onClick={() => { const curriculum = ACADEMY_CURRICULUM.find(value => value.lessons.some(lessonItem => lessonItem.id === item.targetId)); if (curriculum) openSchool(curriculum.school.id); }}>{academyLesson(item.targetId)?.title || 'Saved Academy item'}</button>)}{!academy.bookmarks.length && <small>No lesson bookmarks yet.</small>}</div></section>
    </div>
  </div>;
}

function SchoolsView({ academy, openSchool }) {
  return <div><div className="academy-section-title"><div><span>Structured curriculum engine</span><h2>Academy Schools</h2><p>Complete Level 1 foundations are available in eight priority schools. The remaining schools are honest framework entries, ready for future curriculum.</p></div></div><div className="academy-school-grid">{ACADEMY_SCHOOLS.map(school => { const curriculum = academyCourseForSchool(school.id); const gate = curriculum ? academyLevelGate(academy, curriculum) : null; return <article key={school.id} className={`glass academy-school-card ${school.status === 'framework' ? 'framework' : ''}`}><div className="academy-school-number">{String(school.order).padStart(2, '0')}</div><span>{school.status === 'level-1-complete' ? 'Complete Level 1 curriculum' : 'Framework only'}</span><h3>{school.title}</h3><p>{school.summary}</p>{gate && <div className="academy-school-progress"><i style={{ width: `${gate.masteryScore}%` }} /><small>{gate.masteryScore}% objective mastery</small></div>}<button onClick={() => openSchool(school.id)}>{curriculum ? 'Open school' : 'View framework'}</button></article>; })}</div></div>;
}

function FrameworkSchool({ school, onBack }) {
  return <div><button className="academy-back" onClick={onBack}>← All schools</button><section className="academy-framework-hero glass"><span>Curriculum framework · not yet a completed course</span><h2>{school.title}</h2><p>{school.summary}</p><div><strong>Planned Academy capabilities</strong><p>Courses, levels, modules, lessons, vocabulary, practice, scenarios, field labs, design challenges where applicable, final assessments, capstone work, notes, bookmarks, resources, and completion records all use the shared Academy engine.</p></div><small>This school is not presented as finished. Future built-in content can be added without overwriting user-created curriculum.</small></section></div>;
}

function GatePanel({ gate, goToAction, curriculum }) {
  return <section className="glass academy-gate-panel"><div className="academy-panel-heading"><div><span>Strict mastery gate</span><h3>{gate.complete ? 'Level mastered' : 'Next level remains locked'}</h3></div><ProgressRing value={gate.masteryScore} label="Level" /></div><p>{gate.complete ? 'Every required component passed. Completed material remains available for review.' : `Opening or scrolling never unlocks content. Complete every item and reach ${gate.threshold}% objective mastery.`}</p><div className="academy-requirements">{gate.requirements.map(item => <button key={item.id} className={item.complete ? 'complete' : ''} onClick={() => !item.complete && goToAction(item, curriculum)}><StatusPill complete={item.complete}>{item.label}</StatusPill><span>{item.unit ? `${item.current}${item.unit} / ${item.required}${item.unit}` : `${item.current} / ${item.required}`}</span>{!item.complete && <b>Continue →</b>}</button>)}</div></section>;
}

function SchoolDetail({ school, academy, setAcademy, openItem, goToAction, onBack }) {
  const curriculum = academyCourseForSchool(school.id);
  if (!curriculum) return <FrameworkSchool school={school} onBack={onBack} />;
  const level = curriculum.levels[0];
  const gate = academyLevelGate(academy, curriculum);
  const lessonMap = new Map(curriculum.lessons.map(item => [item.moduleId, item]));
  return <div><button className="academy-back" onClick={onBack}>← All schools</button><section className="academy-school-hero glass"><div><span>{school.title}</span><h2>{curriculum.course.title}</h2><p>{curriculum.course.summary}</p><div className="academy-meta-row"><span>{level.title}</span><span>{curriculum.modules.length} modules</span><span>{curriculum.lessons.length} complete lessons</span><span>{gate.threshold}% required</span></div></div><ProgressRing value={gate.masteryScore} label="Mastery" /></section>
    <div className="academy-course-layout"><div className="academy-course-main"><section className="glass academy-module-panel"><div className="academy-panel-heading"><div><span>Course sequence</span><h3>Modules and lessons</h3></div></div>{curriculum.modules.map((module, index) => { const item = lessonMap.get(module.id); const progress = academy.lessonProgress.find(record => record.lessonId === item.id); return <article className="academy-module-row" key={module.id}><div className="academy-module-index">{index + 1}</div><div><span>{module.title}</span><h4>{item.title}</h4><p>{module.summary}</p><small>{item.estimatedMinutes} minutes · {progress?.completedAt ? `Completed ${dateLabel(progress.completedAt)}` : progress?.lastOpenedAt ? 'Started · check not passed' : 'Not started'}</small></div><button onClick={() => openItem('lesson', item.id, curriculum)}>{progress?.completedAt ? 'Review lesson' : 'Study lesson'}</button></article>; })}</section>
      <section className="glass academy-activity-panel"><div className="academy-panel-heading"><div><span>Required applied work</span><h3>Activities and assessments</h3></div></div><div className="academy-activity-grid"><ActivityButton title="Vocabulary review" note={`${curriculum.vocabulary.terms.length} essential terms`} complete={academy.activityProgress.some(item => item.activityId === level.vocabularyActivityId && item.completed)} onClick={() => openItem('activity', level.vocabularyActivityId, curriculum)} /><ActivityButton title={curriculum.practice.title} note="Structured practice activity" complete={academy.activityProgress.some(item => item.activityId === level.practiceActivityId && item.completed)} onClick={() => openItem('activity', level.practiceActivityId, curriculum)} /><ActivityButton title={curriculum.scenarioAssessment.title} note="Varied questions · attempt history saved" complete={academy.attempts.some(item => item.assessmentId === level.scenarioAssessmentId && item.passed)} onClick={() => openItem('assessment', level.scenarioAssessmentId, curriculum)} /><ActivityButton title={curriculum.fieldLab.title} note="Real observation · self-certified evidence" complete={academy.fieldLabSubmissions.some(item => item.fieldLabId === level.fieldLabId && ['completed', 'approved'].includes(item.status))} onClick={() => openItem('field-lab', level.fieldLabId, curriculum)} />{curriculum.designChallenge && <ActivityButton title={curriculum.designChallenge.title} note="Design District-linked assignment" complete={academy.designChallengeSubmissions.some(item => item.challengeId === level.designChallengeId && item.status === 'completed')} onClick={() => openItem('design', level.designChallengeId, curriculum)} />}<ActivityButton title={curriculum.finalAssessment.title} note={`${level.masteryThreshold}% minimum · unlimited varied retakes`} complete={academy.attempts.some(item => item.assessmentId === level.finalAssessmentId && item.passed)} onClick={() => openItem('assessment', level.finalAssessmentId, curriculum)} /></div></section>
      {school.slug === 'irrigation' && <section className="glass academy-irrigation-path"><div className="academy-panel-heading"><div><span>Major school progression</span><h3>Irrigation levels 1–6</h3></div></div>{IRRIGATION_LEVEL_FRAMEWORK.map((item, index) => <article key={item.id} className={index === 0 ? 'current' : 'locked'}><span>Level {item.number}</span><strong>{item.title}</strong><small>{index === 0 ? (gate.complete ? 'Mastered and open for review' : 'Current required level') : `Locked · Level ${index} mastery required · framework only`}</small><details className="academy-irrigation-topics"><summary>View curriculum scope</summary><p>{item.topics.join(' · ')}</p></details></article>)}<p className="academy-safety-note">Local plumbing, backflow-prevention, permitting, and professional licensing requirements may apply. Academy completion does not authorize regulated irrigation work.</p></section>}
    </div><aside><GatePanel gate={gate} goToAction={goToAction} curriculum={curriculum} /></aside></div>
  </div>;
}

function ActivityButton({ title, note, complete, onClick }) {
  return <button className={complete ? 'complete' : ''} onClick={onClick}><StatusPill complete={complete}>{complete ? 'Complete' : 'Required'}</StatusPill><strong>{title}</strong><small>{note}</small><b>{complete ? 'Review' : 'Open'} →</b></button>;
}

function QuestionControl({ question, value, onChange }) {
  if (question.type === 'matching') {
    return <div className="academy-matching">{(question.pairs || []).map(pair => <label key={pair.left}><span>{pair.left}</span><select value={value?.[pair.left] || ''} onChange={event => onChange({ ...(value || {}), [pair.left]: event.target.value })}><option value="">Choose a match</option>{pair.options.map(option => <option key={option}>{option}</option>)}</select></label>)}</div>;
  }
  if (question.type === 'ordering') {
    const choices = question.options || [];
    const ordered = Array.isArray(value) ? value : Array(choices.length).fill('');
    return <div className="academy-ordering">{choices.map((_, index) => <label key={index}><span>Position {index + 1}</span><select value={ordered[index] || ''} onChange={event => { const next = [...ordered]; next[index] = event.target.value; onChange(next); }}><option value="">Choose an item</option>{choices.map(option => <option key={option}>{option}</option>)}</select></label>)}</div>;
  }
  if (question.type === 'multiple-select') {
    const selected = Array.isArray(value) ? value : [];
    return <div className="academy-answer-options">{question.options.map(option => <label key={option}><input type="checkbox" checked={selected.includes(option)} onChange={event => onChange(event.target.checked ? [...selected, option] : selected.filter(item => item !== option))} /><span>{option}</span></label>)}</div>;
  }
  if (question.options?.length) return <div className="academy-answer-options">{question.options.map(option => <label key={option}><input type="radio" name={question.id} checked={value === option} onChange={() => onChange(option)} /><span>{option}</span></label>)}</div>;
  return <textarea value={value || ''} onChange={event => onChange(event.target.value)} placeholder="Respond in your own words. Key concepts matter; exact wording does not." />;
}

function academyAnswerPresent(question, answer) {
  if (question.type === 'multiple-select' || question.type === 'ordering') return Array.isArray(answer) && answer.length > 0 && answer.every(Boolean);
  if (question.type === 'matching') return answer && typeof answer === 'object' && (question.pairs || []).every(pair => Boolean(answer[pair.left]));
  return Boolean(String(answer || '').trim());
}

function LessonStudy({ lesson: item, curriculum, academy, setAcademy, data, openDesign, onClose }) {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [readingMode, setReadingMode] = useState(false);
  const startedAt = useRef(Date.now());
  const progress = academy.lessonProgress.find(record => record.lessonId === item.id);
  const note = academy.notes.find(record => record.targetId === item.id && record.kind === 'user-note')?.body || '';
  const [noteBody, setNoteBody] = useState(note);
  const bookmarked = academy.bookmarks.some(record => record.targetId === item.id);
  const quickQuestion = curriculum.questions.find(question => item.learningObjectives.includes(question.objectiveId));
  const connectedPlants = useMemo(() => [
    ...(data.designPlants || []).map(plant => ({ id: plant.plantId, name: plant.commonName, botanicalName: plant.scientificName, projectId: (data.sourcingRecords || []).find(record => record.sourcingRecordId === plant.sourcingRecordId)?.projectId || '', detail: [plant.light, plant.moisture, plant.matureWidth, plant.traits, plant.toxicity].filter(Boolean).join(' · ') })),
    ...(data.projectPlants || []).map(plant => ({ id: plant.projectPlantId, name: plant.plantName, botanicalName: plant.scientificName, projectId: plant.projectId || '', detail: [plant.category, plant.installationLocation, plant.reasonSelected, plant.careInstructions].filter(Boolean).join(' · ') })),
    ...(data.plantPassports || []).map(plant => ({ id: plant.passportId, name: plant.commonName, botanicalName: plant.scientificName, projectId: plant.projectId || '', detail: [plant.cultivar, plant.currentStatus, plant.careInstructions].filter(Boolean).join(' · ') })),
  ].filter(plant => plant.id && plant.name).slice(0, 6), [data.designPlants, data.projectPlants, data.plantPassports, data.sourcingRecords]);
  useEffect(() => { if (!progress?.lastOpenedAt) setAcademy(openAcademyLesson(academy, item.levelId, item.id)); }, [item.id]);
  const check = () => {
    const correct = quickQuestion.type === 'multiple-select'
      ? Array.isArray(answer) && Array.isArray(quickQuestion.correctAnswer) && answer.length === quickQuestion.correctAnswer.length && quickQuestion.correctAnswer.every(option => answer.includes(option))
      : String(answer).trim().toLowerCase() === String(quickQuestion.correctAnswer).trim().toLowerCase();
    if (!correct) { setFeedback(`Review this section and try again. ${quickQuestion.explanation}`); return; }
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    let next = completeAcademyLessonCheck(academy, item.levelId, item.id, 100, quickQuestion.objectiveId);
    next = recordAcademyStudyTime(next, item.id, minutes);
    setAcademy(next);
    setFeedback('Knowledge check passed. This lesson now counts toward mastery.');
  };
  return <div className={`academy-study-shell ${readingMode ? 'reading-mode' : ''} text-${academy.settings.textSize}`}><div className="academy-study-toolbar"><button onClick={onClose}>← Course</button><div><button onClick={() => setReadingMode(value => !value)}>{readingMode ? 'Exit full screen' : 'Full-screen reading'}</button><button onClick={() => setAcademy(toggleAcademyBookmark(academy, item.id))}>{bookmarked ? '★ Bookmarked' : '☆ Bookmark'}</button></div></div><div className="academy-study-layout"><article className="glass academy-lesson"><div className="academy-meta-row"><span>Built-in curriculum</span><span>{item.estimatedMinutes} minutes</span><span>Revised {dateLabel(item.revisionDate)}</span><span>Available offline</span></div><h1>{item.title}</h1><p className="academy-lesson-intro">{item.introduction}</p><section><h2>Learning objective</h2><ul>{item.learningObjectives.map(id => <li key={id}>{curriculum.objectives.find(objective => objective.id === id)?.title}</li>)}</ul></section>{item.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}<section className="academy-concept-box"><h2>Key concepts</h2><ul>{item.keyConcepts.map(value => <li key={value}>{value}</li>)}</ul></section><section><h2>Worked example</h2>{item.workedExamples.map(value => <p key={value}>{value}</p>)}</section><div className="academy-lesson-two"><section><h2>Practical application</h2><p>{item.practicalApplication}</p></section><section><h2>Client relevance</h2><p>{item.clientRelevance}</p></section><section><h2>Common mistakes</h2><ul>{item.commonMistakes.map(value => <li key={value}>{value}</li>)}</ul></section><section><h2>Business relevance</h2><p>{item.businessRelevance}</p></section></div><section className="academy-plant-connections"><h2>Connected Plant Intelligence</h2><p>These are links to existing Tierra Fleur plant records; the Academy does not create a duplicate plant database.</p>{connectedPlants.length ? connectedPlants.map(plant => <article key={plant.id}><div><strong>{plant.name}</strong><small>{plant.botanicalName || 'Botanical name not saved'}</small><p>{plant.detail || 'Open the existing record to review site, size, water, care, or safety fields.'}</p></div><button onClick={() => openDesign(plant.projectId)}>Open record context</button></article>) : <small>Relevant saved plant records will appear here when Plant Intelligence, Design, or Project plant records are available.</small>}</section><section className="academy-safety-note"><strong>Safety and limits</strong><p>{item.safetyNotes.join(' ')}</p></section><section><h2>Summary</h2><p>{item.summary}</p></section><section className="academy-source-note"><strong>Source note</strong><p>{item.sourceNotes}</p></section><section className="academy-check"><span>Required knowledge check</span><h2>{quickQuestion.prompt}</h2><QuestionControl question={quickQuestion} value={answer} onChange={setAnswer} /><button className="primary" onClick={check}>Check answer and complete lesson</button>{feedback && <p className={feedback.startsWith('Knowledge') ? 'success' : 'review'} aria-live="polite">{feedback}</p>}<small>Viewing or scrolling alone never completes a lesson.</small></section></article><aside className="glass academy-notes"><span>User note</span><h3>Notes alongside lesson</h3><textarea value={noteBody} onChange={event => setNoteBody(event.target.value)} placeholder="Private notes, field observations, or a reminder…" /><button onClick={() => setAcademy(saveAcademyNote(academy, item.id, noteBody))}>Save note</button><div><strong>Completion</strong><StatusPill complete={Boolean(progress?.completedAt)}>{progress?.completedAt ? `Passed ${dateLabel(progress.completedAt)}` : 'Knowledge check required'}</StatusPill></div></aside></div></div>;
}

function VocabularyActivity({ activity, levelId, academy, setAcademy, onClose }) {
  const [reviewed, setReviewed] = useState([]);
  const complete = academy.activityProgress.some(item => item.activityId === activity.id && item.completed);
  return <ActivityShell title={activity.title} eyebrow="Required vocabulary" onClose={onClose}><p>Open every card and explain the term in your own words before revealing the definition.</p><div className="academy-flashcards">{activity.terms.map(item => <details key={item.term} onToggle={event => event.currentTarget.open && setReviewed(current => [...new Set([...current, item.term])])}><summary>{item.term}</summary><p>{item.definition}</p></details>)}</div><button className="primary" disabled={reviewed.length < activity.terms.length && !complete} onClick={() => setAcademy(recordAcademyActivity(academy, levelId, activity.id, 'vocabulary', { termsReviewed: activity.terms.map(item => item.term) }))}>{complete ? 'Vocabulary review complete' : `Complete review (${reviewed.length}/${activity.terms.length})`}</button></ActivityShell>;
}

function PracticeActivity({ activity, levelId, academy, setAcademy, onClose }) {
  const existing = academy.activityProgress.find(item => item.activityId === activity.id);
  const [checked, setChecked] = useState(existing?.evidence?.checklist || []);
  const [reflection, setReflection] = useState(existing?.evidence?.reflection || '');
  const ready = checked.length === activity.checklist.length && reflection.trim().length >= 20;
  return <ActivityShell title={activity.title} eyebrow="Required practice" onClose={onClose}><p>{activity.instructions}</p><Checklist items={activity.checklist} checked={checked} setChecked={setChecked} /><label className="academy-field">Reflection<textarea value={reflection} onChange={event => setReflection(event.target.value)} placeholder="What did the activity reveal, and what would you verify next?" /></label><button className="primary" disabled={!ready} onClick={() => setAcademy(recordAcademyActivity(academy, levelId, activity.id, 'practice', { checklist: checked, reflection }))}>{existing?.completed ? 'Update completed practice' : 'Certify practice complete'}</button></ActivityShell>;
}

function Checklist({ items, checked, setChecked }) {
  return <div className="academy-checklist">{items.map(item => <label key={item}><input type="checkbox" checked={checked.includes(item)} onChange={event => setChecked(event.target.checked ? [...checked, item] : checked.filter(value => value !== item))} /><span>{item}</span></label>)}</div>;
}

function AssessmentActivity({ assessment, curriculum, levelId, academy, setAcademy, onClose }) {
  const [questions, setQuestions] = useState(() => selectAssessmentQuestions(academy, curriculum, assessment));
  const [answers, setAnswers] = useState({});
  const [attempt, setAttempt] = useState(null);
  const prior = academy.attempts.filter(item => item.assessmentId === assessment.id);
  const latestFailed = prior.find(item => !item.passed);
  const reviewId = latestFailed ? `academy-retake-review-${latestFailed.attemptId}` : '';
  const reviewComplete = !academy.settings.requireReviewBeforeRetake || !latestFailed || academy.activityProgress.some(item => item.activityId === reviewId && item.completed);
  const submit = () => {
    const saved = recordAcademyAssessment(academy, levelId, assessment, questions, answers);
    setAcademy(saved.academy); setAttempt(saved.attempt);
  };
  const retake = () => { setQuestions(selectAssessmentQuestions(academy, curriculum, assessment)); setAnswers({}); setAttempt(null); };
  return <ActivityShell title={assessment.title} eyebrow={assessment.type === 'final' ? 'Final level assessment' : 'Scenario assessment'} onClose={onClose}><div className="academy-assessment-intro"><p>Pass at or above <strong>{academy.settings.masteryThreshold}%</strong>. Questions are selected locally, prioritize unseen items, vary wording on retakes, and revisit missed objectives through a different presentation.</p><span>{prior.length} previous attempt{prior.length === 1 ? '' : 's'}</span></div>{!attempt && <form className="academy-assessment" onSubmit={event => { event.preventDefault(); submit(); }}>{questions.map((item, index) => <fieldset key={item.id}><legend><span>{index + 1}</span>{item.prompt}</legend><small>{item.type.replaceAll('-', ' ')} · difficulty {item.difficulty} · {curriculum.objectives.find(objective => objective.id === item.objectiveId)?.title}</small>{item.imageUrl && <img className="academy-question-image" src={item.imageUrl} alt={item.imageAlt || 'Observation prompt'} />}<QuestionControl question={item} value={answers[item.id]} onChange={value => setAnswers(current => ({ ...current, [item.id]: value }))} /></fieldset>)}<button className="primary" disabled={questions.some(item => !academyAnswerPresent(item, answers[item.id]))}>Submit assessment</button></form>}{attempt && <section className={`academy-attempt-result ${attempt.passed ? 'passed' : 'review'}`}><span>{attempt.passed ? 'Assessment passed' : 'Review required'}</span><strong>{attempt.score}%</strong><p>{attempt.passed ? 'This assessment requirement is complete. The level gate still checks every practical component and objective mastery.' : `The next level remains locked. Review the exact objectives below, then take a fresh attempt.`}</p>{attempt.remediation.map(item => <article key={item.objectiveId}><h4>{item.title}</h4><p>Review <b>{item.section}</b> in the linked lesson.</p><small>Fresh activity: {item.activity}</small></article>)}{academy.settings.requireReviewBeforeRetake && !attempt.passed && !reviewComplete && <button onClick={() => setAcademy(recordAcademyActivity(academy, levelId, `academy-retake-review-${attempt.attemptId}`, 'remediation', { reviewedObjectives: attempt.missedObjectiveIds }))}>I completed the short review activity</button>}<button className="primary" disabled={!reviewComplete} onClick={retake}>{attempt.passed ? 'Review with fresh questions' : 'Start varied retake'}</button></section>}<section className="academy-attempt-history"><h3>Attempt history</h3>{prior.map(item => <article key={item.attemptId}><span>{dateLabel(item.createdAt)}</span><strong>{item.score}%</strong><StatusPill complete={item.passed}>{item.passed ? 'Passed' : 'Review'}</StatusPill></article>)}{!prior.length && <p>No previous attempts.</p>}</section></ActivityShell>;
}

function EvidenceUploader({ photos, setPhotos }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const add = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setError('');
    try { setPhotos([...photos, await prepareAcademyEvidence(file)]); } catch (value) { setError(value instanceof Error ? value.message : 'The evidence image could not be prepared.'); }
    finally { event.target.value = ''; setBusy(false); }
  };
  return <div className="academy-evidence"><label className="upload-button">{busy ? 'Preparing image…' : '+ Add photo evidence'}<input type="file" accept={PROJECT_PHOTO_ACCEPT} capture="environment" disabled={busy} onChange={add} /></label>{error && <p role="alert">{error}</p>}<div>{photos.map(photo => <figure key={photo.evidenceId}><img src={photo.data} alt={photo.name || 'Field evidence'} /><figcaption>{photo.name}<button onClick={() => setPhotos(photos.filter(item => item.evidenceId !== photo.evidenceId))}>Remove</button></figcaption></figure>)}</div></div>;
}

function FieldLabActivity({ activity, levelId, academy, setAcademy, onClose }) {
  const existing = academy.fieldLabSubmissions.find(item => item.fieldLabId === activity.id);
  const [form, setForm] = useState({ submissionId: existing?.submissionId || '', date: existing?.date || today(), locationCategory: existing?.locationCategory || 'Home landscape', measurements: existing?.measurements || '', notes: existing?.notes || '', reflection: existing?.reflection || '', photos: existing?.photos || [], checklist: existing?.checklist || [], selfCertified: Boolean(existing?.selfCertified) });
  const ready = form.date && form.notes.trim().length >= 30 && form.checklist.length === activity.checklist.length && form.selfCertified && (activity.photoOptional || form.photos.length > 0) && (!activity.requiredEvidence.includes('measurements') || form.measurements.trim());
  const save = status => setAcademy(saveFieldLabSubmission(academy, { ...form, fieldLabId: activity.id, levelId, status }));
  return <ActivityShell title={activity.title} eyebrow="Practical field lab" onClose={onClose}><p>{activity.instructions}</p><div className="academy-safety-note"><strong>Safety and honest limits</strong><p>{activity.safetyNotes}</p></div><div className="academy-field-grid"><label>Date<input type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></label><label>Location category<select value={form.locationCategory} onChange={event => setForm({ ...form, locationCategory: event.target.value })}>{['Home landscape', 'Client property with permission', 'Public observation area', 'Practice site', 'Greenhouse', 'Container garden'].map(value => <option key={value}>{value}</option>)}</select></label></div><label className="academy-field">Measurements<textarea value={form.measurements} onChange={event => setForm({ ...form, measurements: event.target.value })} placeholder="Dimensions, times, quantities, spacing, moisture depths, or other measurements…" /></label><label className="academy-field">Observation notes<textarea value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} placeholder="Describe what you directly observed. Keep interpretation and certainty honest." /></label><EvidenceUploader photos={form.photos} setPhotos={photos => setForm({ ...form, photos })} />{!activity.photoOptional && <small>A real photo or drawing attachment is required for this lab.</small>}<Checklist items={activity.checklist} checked={form.checklist} setChecked={checklist => setForm({ ...form, checklist })} /><label className="academy-certify"><input type="checkbox" checked={form.selfCertified} onChange={event => setForm({ ...form, selfCertified: event.target.checked })} /><span>I certify that I performed this observation and that the evidence is my own. Completion is self-assessed; the software has not physically inspected or automatically identified the work.</span></label><div className="academy-form-actions"><button onClick={() => save('draft')}>Save draft</button><button className="primary" disabled={!ready} onClick={() => save('completed')}>{existing?.status === 'completed' ? 'Update completed lab' : 'Complete field lab'}</button></div></ActivityShell>;
}

function DesignChallengeActivity({ activity, levelId, academy, setAcademy, data, setData, openDesign, onClose }) {
  const existing = academy.designChallengeSubmissions.find(item => item.challengeId === activity.id);
  const designs = [...(data.designConcepts || []).map(item => ({ id: item.designId, label: `${item.name} · Design concept`, projectId: item.projectId || '' })), ...(data.independentDesigns || []).map(item => ({ id: item.independentDesignId, label: `${item.name} · Independent design`, projectId: item.projectId || '' }))];
  const [form, setForm] = useState({ submissionId: existing?.submissionId || '', linkType: existing?.linkType || 'Existing design', linkedDesignId: existing?.linkedDesignId || '', projectId: existing?.projectId || '', reflection: existing?.reflection || '', checklist: existing?.checklist || [], revisionHistory: existing?.revisionHistory || [], selfCertified: Boolean(existing?.selfCertified) });
  const createPractice = () => {
    const independentDesignId = uid('independent-design');
    const record = { id: independentDesignId, independentDesignId, designId: '', name: `Academy Practice Design · ${activity.title}`, description: activity.brief, clientId: '', projectId: '', academyAssignmentId: activity.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), archived: false };
    setData(current => ({ ...current, independentDesigns: [record, ...(current.independentDesigns || [])] }));
    setForm({ ...form, linkType: 'Practice Design', linkedDesignId: independentDesignId, projectId: '' });
  };
  const selected = designs.find(item => item.id === form.linkedDesignId);
  const ready = form.linkedDesignId && form.reflection.trim().length >= 30 && form.checklist.length === activity.requiredElements.length && form.selfCertified;
  const save = status => setAcademy(saveDesignChallengeSubmission(academy, { ...form, challengeId: activity.id, levelId, projectId: selected?.projectId || form.projectId, status, submittedAt: status === 'completed' ? new Date().toISOString() : existing?.submittedAt || '' }));
  return <ActivityShell title={activity.title} eyebrow="Design District assignment" onClose={onClose}><p>{activity.brief}</p><p className="academy-honesty-note">The rubric checks required elements and structured self-review. It does not claim to judge subjective professional design quality perfectly.</p><div className="academy-field-grid"><label>Link type<select value={form.linkType} onChange={event => setForm({ ...form, linkType: event.target.value })}>{['Existing client project', 'Existing design', 'Practice Design', 'Independent design', 'Academy assignment'].map(value => <option key={value}>{value}</option>)}</select></label><label>Linked design<select value={form.linkedDesignId} onChange={event => setForm({ ...form, linkedDesignId: event.target.value })}><option value="">Choose a design</option>{designs.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div><div className="academy-inline-actions"><button onClick={createPractice}>+ Create linked Practice Design</button><button disabled={!form.linkedDesignId} onClick={() => openDesign(selected?.projectId || '')}>Open Design District</button></div><Checklist items={activity.requiredElements} checked={form.checklist} setChecked={checklist => setForm({ ...form, checklist })} /><label className="academy-field">User reflection<textarea value={form.reflection} onChange={event => setForm({ ...form, reflection: event.target.value })} placeholder="Which requirements are strongest? What needs revision, and why?" /></label><label className="academy-certify"><input type="checkbox" checked={form.selfCertified} onChange={event => setForm({ ...form, selfCertified: event.target.checked })} /><span>I completed the requirement-based self-review. This is self-assessed Academy work, not an external professional approval.</span></label><div className="academy-form-actions"><button onClick={() => save('draft')}>Save draft</button><button className="primary" disabled={!ready} onClick={() => save('completed')}>Complete design challenge</button></div></ActivityShell>;
}

function ActivityShell({ title, eyebrow, onClose, children }) {
  return <div className="academy-activity-page"><button className="academy-back" onClick={onClose}>← Course</button><section className="glass academy-activity-shell"><span>{eyebrow}</span><h1>{title}</h1>{children}</section></div>;
}

function ClientConfidenceLab({ academy, setAcademy }) {
  const [scenarioId, setScenarioId] = useState(CLIENT_CONFIDENCE_SCENARIOS[0].id);
  const scenario = CLIENT_CONFIDENCE_SCENARIOS.find(item => item.id === scenarioId);
  const existing = academy.clientSimulationRecords.find(item => item.scenarioId === scenarioId);
  const [form, setForm] = useState({ response: '', revisedResponse: '', clarityChecklist: [], professionalismChecklist: [], selfRating: 3 });
  useEffect(() => setForm({ response: existing?.response || '', revisedResponse: existing?.revisedResponse || '', clarityChecklist: existing?.clarityChecklist || [], professionalismChecklist: existing?.professionalismChecklist || [], selfRating: existing?.selfRating || 3 }), [scenarioId]);
  const coverage = clientConceptCoverage(scenario, form.revisedResponse || form.response);
  const ready = form.response.trim().length >= 40 && form.clarityChecklist.length === CLIENT_CLARITY_CHECKLIST.length && form.professionalismChecklist.length === CLIENT_PROFESSIONALISM_CHECKLIST.length;
  const save = () => setAcademy(saveClientSimulation(academy, { recordId: existing?.recordId || '', scenarioId, scenario: scenario.scenario, ...form, keyConceptsExpected: scenario.modelPoints, missingConcepts: coverage.missing, status: ready ? 'completed' : 'draft', selfCertified: ready }));
  return <div><div className="academy-section-title"><div><span>Client Confidence Lab</span><h2>Practice explaining professional decisions</h2><p>Use written self-practice, concept coverage, model-answer points, and structured rubrics. Exact wording is never required, and no external AI grades the response.</p></div></div><div className="academy-simulation-layout"><aside className="glass academy-scenario-list">{CLIENT_CONFIDENCE_SCENARIOS.map(item => <button key={item.id} className={scenarioId === item.id ? 'active' : ''} onClick={() => setScenarioId(item.id)}><strong>{item.title}</strong><small>{academy.clientSimulationRecords.some(record => record.scenarioId === item.id && record.status === 'completed') ? 'Completed' : 'Practice scenario'}</small></button>)}</aside><section className="glass academy-simulation"><span>Scenario</span><h3>{scenario.title}</h3><p className="academy-scenario-prompt">{scenario.scenario}</p><label className="academy-field">Your response<textarea value={form.response} onChange={event => setForm({ ...form, response: event.target.value })} placeholder="Explain how you would respond to the client…" /></label><div className="academy-model-points"><strong>Model-answer points for self-review</strong><ul>{scenario.modelPoints.map(item => <li key={item}>{item}</li>)}</ul></div><h4>Clarity checklist</h4><Checklist items={CLIENT_CLARITY_CHECKLIST} checked={form.clarityChecklist} setChecked={clarityChecklist => setForm({ ...form, clarityChecklist })} /><h4>Professionalism checklist</h4><Checklist items={CLIENT_PROFESSIONALISM_CHECKLIST} checked={form.professionalismChecklist} setChecked={professionalismChecklist => setForm({ ...form, professionalismChecklist })} /><label className="academy-field">Revised response<textarea value={form.revisedResponse} onChange={event => setForm({ ...form, revisedResponse: event.target.value })} placeholder="Revise after comparing your response with the model points…" /></label><label className="academy-field">Confidence rating · {form.selfRating}/5<input type="range" min="1" max="5" value={form.selfRating} onChange={event => setForm({ ...form, selfRating: Number(event.target.value) })} /></label><div className="academy-coverage"><strong>{coverage.coverage}% concept coverage</strong><span>{coverage.missing.length ? `Consider: ${coverage.missing.join(', ')}` : 'All local keyword concepts appear. Self-review is still required.'}</span></div><button className="primary" onClick={save}>{ready ? 'Complete self-reviewed simulation' : 'Save practice draft'}</button></section></div></div>;
}

const creatorBlank = { contentId: '', type: 'Lesson', title: '', schoolId: '', courseId: '', levelId: '', moduleId: '', estimatedMinutes: '20', difficulty: 'Foundation', body: '', objectiveText: '', prerequisiteText: '', tagsText: '', sourceNotes: '', requirementsText: '', attachments: [] };

function CreatorView({ academy, setAcademy }) {
  const [form, setForm] = useState(creatorBlank);
  const [errors, setErrors] = useState([]);
  const toRecord = () => {
    const requirements = Object.fromEntries(form.requirementsText.split('\n').map(line => line.split(':')).filter(parts => parts.length > 1).map(([key, values]) => [key.trim(), values.split(',').map(value => value.trim()).filter(Boolean)]));
    return { ...form, learningObjectives: form.objectiveText.split('\n').map(value => value.trim()).filter(Boolean), prerequisites: form.prerequisiteText.split('\n').map(value => value.trim()).filter(Boolean), tags: form.tagsText.split(',').map(value => value.trim()).filter(Boolean), requirements };
  };
  const save = publish => { const result = saveAcademyUserContent(academy, toRecord(), publish); setErrors(result.errors); if (!result.errors.length) { setAcademy(result.academy); setForm(creatorBlank); } };
  const edit = item => setForm({ ...creatorBlank, ...item, objectiveText: (item.learningObjectives || []).join('\n'), prerequisiteText: (item.prerequisites || []).join('\n'), tagsText: (item.tags || []).join(', '), requirementsText: Object.entries(item.requirements || {}).map(([key, values]) => `${key}: ${(values || []).join(', ')}`).join('\n') });
  const duplicate = item => { const result = saveAcademyUserContent(academy, { ...item, contentId: '', title: `${item.title} — Copy`, status: 'draft' }, false); setAcademy(result.academy); };
  const archive = item => { const result = saveAcademyUserContent(academy, { ...item, status: item.status === 'archived' ? 'draft' : 'archived' }, false); setAcademy(result.academy); };
  const move = (item, offset) => { const items = [...academy.userContent]; const index = items.findIndex(value => value.contentId === item.contentId); const target = index + offset; if (index < 0 || target < 0 || target >= items.length) return; [items[index], items[target]] = [items[target], items[index]]; setAcademy({ ...academy, userContent: items.map((value, order) => ({ ...value, order })) }); };
  return <div><div className="academy-section-title"><div><span>Lesson Creator Pro</span><h2>Create local Academy curriculum</h2><p>User-created records remain separate from built-in curriculum and are never overwritten by content updates.</p></div></div><div className="academy-creator-layout"><form className="glass academy-creator" onSubmit={event => event.preventDefault()}><div className="academy-field-grid"><label>Content type<select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })}>{['School', 'Course', 'Level', 'Module', 'Lesson', 'Vocabulary set', 'Question bank', 'Scenario template', 'Field lab', 'Design challenge', 'Final assessment', 'Capstone'].map(value => <option key={value}>{value}</option>)}</select></label><label>Difficulty<select value={form.difficulty} onChange={event => setForm({ ...form, difficulty: event.target.value })}>{['Foundation', 'Growing', 'Advanced'].map(value => <option key={value}>{value}</option>)}</select></label></div><label className="academy-field">Title<input value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></label><div className="academy-field-grid"><label>School<select value={form.schoolId} onChange={event => setForm({ ...form, schoolId: event.target.value })}><option value="">Choose or leave independent</option>{ACADEMY_SCHOOLS.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>Estimated minutes<input type="number" min="1" value={form.estimatedMinutes} onChange={event => setForm({ ...form, estimatedMinutes: event.target.value })} /></label></div><label className="academy-field">Learning objectives<textarea value={form.objectiveText} onChange={event => setForm({ ...form, objectiveText: event.target.value })} placeholder="One objective per line" /></label><label className="academy-field">Content or instructions<textarea value={form.body} onChange={event => setForm({ ...form, body: event.target.value })} /></label><label className="academy-field">Prerequisites<textarea value={form.prerequisiteText} onChange={event => setForm({ ...form, prerequisiteText: event.target.value })} placeholder="One stable content ID per line" /></label>{form.type === 'Level' && <label className="academy-field">Required component references<textarea value={form.requirementsText} onChange={event => setForm({ ...form, requirementsText: event.target.value })} placeholder={'lessons: lesson-id\nvocabulary: vocabulary-id\npractice: practice-id\nscenario: scenario-id\nfieldLab: lab-id\nfinalAssessment: assessment-id'} /></label>}<label className="academy-field">Tags<input value={form.tagsText} onChange={event => setForm({ ...form, tagsText: event.target.value })} placeholder="Comma-separated" /></label><label className="academy-field">References or source notes<textarea value={form.sourceNotes} onChange={event => setForm({ ...form, sourceNotes: event.target.value })} /></label><div className="academy-field"><span>Image or drawing attachments</span><EvidenceUploader photos={form.attachments || []} setPhotos={attachments => setForm({ ...form, attachments })} /></div>{errors.length > 0 && <div className="academy-validation" role="alert"><strong>Publication needs attention</strong><ul>{errors.map(item => <li key={item}>{item}</li>)}</ul></div>}<div className="academy-form-actions"><button onClick={() => save(false)}>Save draft</button><button className="primary" onClick={() => save(true)}>Publish locally</button>{form.contentId && <button onClick={() => setForm(creatorBlank)}>Cancel editing</button>}</div></form><section className="glass academy-user-content"><h3>User-created curriculum</h3>{academy.userContent.map(item => <article key={item.contentId}><div><span>{item.type} · {item.status}</span><strong>{item.title}</strong><small>Updated {dateLabel(item.updatedAt)} · {(item.attachments || []).length} attachment{(item.attachments || []).length === 1 ? '' : 's'}</small></div><button onClick={() => move(item, -1)} aria-label={`Move ${item.title} up`}>↑</button><button onClick={() => move(item, 1)} aria-label={`Move ${item.title} down`}>↓</button><button onClick={() => edit(item)}>Edit</button><button onClick={() => duplicate(item)}>Duplicate</button><button onClick={() => archive(item)}>{item.status === 'archived' ? 'Restore draft' : 'Archive'}</button></article>)}{!academy.userContent.length && <Empty title="No user-created curriculum" text="Drafts and locally published content will appear here." />}</section></div></div>;
}

function StudyQueue({ academy, openSchool, openItem }) {
  const entries = ACADEMY_CURRICULUM.map(curriculum => ({ curriculum, gate: academyLevelGate(academy, curriculum) })).filter(item => !item.gate.complete);
  const scheduled = academy.mastery.filter(item => item.attempts > 0 && item.score >= academy.settings.masteryThreshold && item.reviewDueDate && item.reviewDueDate <= today());
  return <div><div className="academy-section-title"><div><span>Required work and adaptive review</span><h2>Study Queue</h2><p>The queue favors unfinished mastery requirements and weak objectives. Every recommendation explains why it appears.</p></div></div><div className="academy-queue-layout"><section className="glass academy-queue"><h3>Required next activities</h3>{entries.map(({ curriculum, gate }) => { const next = gate.remaining[0]; return <article key={curriculum.school.id}><div><span>{curriculum.school.title}</span><strong>{next.label}</strong><small>{next.unit ? `${next.current}% now · ${next.required}% required` : `${next.current} of ${next.required} complete`}</small></div><button onClick={() => openSchool(curriculum.school.id)}>Continue</button></article>; })}</section><section className="glass academy-queue"><h3>Adaptive review</h3>{academy.reviewQueue.filter(item => !item.completedAt).map(item => <article key={item.queueId}><div><span>Due {dateLabel(item.dueDate)}</span><strong>{item.title}</strong><p>{item.activity}</p><details><summary>Why am I seeing this?</summary><small>{item.why}</small></details></div><button onClick={() => { const curriculum = ACADEMY_CURRICULUM.find(value => value.lessons.some(lesson => lesson.id === item.lessonId)); if (item.lessonId && curriculum) openItem('lesson', item.lessonId, curriculum); }}>Review</button></article>)}{scheduled.map(item => { const objective = ACADEMY_CURRICULUM.flatMap(value => value.objectives).find(value => value.id === item.objectiveId); const curriculum = ACADEMY_CURRICULUM.find(value => value.objectives.some(entry => entry.id === item.objectiveId)); return <article key={`spaced-${item.objectiveId}`}><div><span>Spaced review due {dateLabel(item.reviewDueDate)}</span><strong>{objective?.title || item.objectiveId}</strong><p>Use a short retrieval check before the concept is likely to fade.</p><details><summary>Why am I seeing this?</summary><small>This objective was previously mastered. The local schedule reintroduces it after a longer interval and avoids unnecessary daily repetition.</small></details></div><button onClick={() => objective?.reviewLessonId && curriculum && openItem('lesson', objective.reviewLessonId, curriculum)}>Review</button></article>; })}{!academy.reviewQueue.some(item => !item.completedAt) && !scheduled.length && <Empty title="Review queue is clear" text="Spaced review and missed objectives will appear here automatically." />}</section></div></div>;
}

function RecordsView({ academy }) {
  return <div><div className="academy-section-title"><div><span>Restrained professional progression</span><h2>Completion Records & Capstone</h2><p>Records are internal evidence of Academy work. They do not imply accreditation, licensure, or external certification.</p></div></div><section className="academy-record-grid">{academy.completionRecords.map(item => <article className="glass academy-record" key={item.completionRecordId}><span>{item.label}</span><h3>{item.schoolTitle}</h3><strong>{item.levelTitle}</strong><div><small>Completed</small><b>{dateLabel(item.completionDate)}</b><small>Final score</small><b>{item.finalScore}%</b><small>Mastery</small><b>{item.masteryPercentage}%</b><small>Study time</small><b>{minutesLabel(item.studyTimeMinutes)}</b></div><p>{item.skillsDemonstrated.join(' · ')}</p></article>)}{!academy.completionRecords.length && <Empty title="No completed levels yet" text="A record is created only after every mastery requirement passes." />}</section><section className="glass academy-capstone"><span>Capstone framework · not yet a completed capstone course</span><h3>{ACADEMY_CAPSTONE_FRAMEWORK.title}</h3><p>Practice records are the default so capstone work does not pollute live business records.</p><div className="academy-capstone-columns"><div><strong>Structured brief</strong><ul>{ACADEMY_CAPSTONE_FRAMEWORK.briefFields.map(item => <li key={item}>{item}</li>)}</ul></div><div><strong>Required deliverables</strong><ol>{ACADEMY_CAPSTONE_FRAMEWORK.deliverables.map(item => <li key={item}>{item}</li>)}</ol></div></div></section></div>;
}

function AcademySettings({ academy, setAcademy }) {
  const set = patch => setAcademy({ ...academy, settings: { ...academy.settings, ...patch } });
  return <div><div className="academy-section-title"><div><span>Transparent mastery rules</span><h2>Academy Settings</h2><p>Settings remain local and are included in the existing Tierra Fleur backup.</p></div></div><section className="glass academy-settings"><label>Mastery threshold <strong>{academy.settings.masteryThreshold}%</strong><input type="range" min={ACADEMY_MASTERY_MIN} max={ACADEMY_MASTERY_MAX} value={academy.settings.masteryThreshold} onChange={event => set({ masteryThreshold: Number(event.target.value) })} /><small>Safe configurable range: {ACADEMY_MASTERY_MIN}%–{ACADEMY_MASTERY_MAX}%. Changing the threshold never marks an unfinished practical requirement complete.</small></label><label className="academy-certify"><input type="checkbox" checked={academy.settings.requireReviewBeforeRetake} onChange={event => set({ requireReviewBeforeRetake: event.target.checked })} /><span>Require a short review activity before an immediate retake</span></label><label>Lesson text size<select value={academy.settings.textSize} onChange={event => set({ textSize: event.target.value })}>{['small', 'medium', 'large'].map(value => <option key={value}>{value}</option>)}</select></label><div className="academy-safety-note"><strong>Assessment limits</strong><p>Free-form work uses keywords, model points, checklists, calculations, rubrics, and self-review. The Academy does not pretend to visually identify plants, professionally approve subjective design quality, intelligently grade speech, or physically inspect fieldwork.</p></div></section></div>;
}

export default function AcademyWorkspace({ data, setData, openDesign }) {
  const academy = data.academy;
  const setAcademy = value => setData(current => ({ ...current, academy: value }));
  const [view, setView] = useState('Dashboard');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [openRecord, setOpenRecord] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => { const update = () => setOnline(navigator.onLine); addEventListener('online', update); addEventListener('offline', update); return () => { removeEventListener('online', update); removeEventListener('offline', update); }; }, []);
  const selectedSchool = ACADEMY_SCHOOLS.find(item => item.id === selectedSchoolId);
  const openSchool = schoolId => { setSelectedSchoolId(schoolId); setView('School'); setOpenRecord(null); };
  const openItem = (kind, id, curriculum) => { setOpenRecord({ kind, id, curriculum }); };
  const goToAction = (requirement, curriculum) => {
    if (!requirement || !curriculum) return;
    const [kind, id] = String(requirement.action || '').split(':');
    if (kind === 'lesson') openItem('lesson', id, curriculum);
    else if (kind === 'activity') openItem('activity', id, curriculum);
    else if (kind === 'assessment') openItem('assessment', id, curriculum);
    else if (kind === 'field-lab') openItem('field-lab', id, curriculum);
    else if (kind === 'design') openItem('design', id, curriculum);
    else { setSelectedSchoolId(curriculum.school.id); setView('School'); }
  };
  const closeItem = () => setOpenRecord(null);
  if (openRecord) {
    const { kind, id, curriculum } = openRecord;
    const levelId = curriculum.levels[0].id;
    if (kind === 'lesson') return <LessonStudy lesson={academyLesson(id)} curriculum={curriculum} academy={academy} setAcademy={setAcademy} data={data} openDesign={openDesign} onClose={closeItem} />;
    if (kind === 'activity') { const activity = academyActivity(id); return activity.terms ? <VocabularyActivity activity={activity} levelId={levelId} academy={academy} setAcademy={setAcademy} onClose={closeItem} /> : <PracticeActivity activity={activity} levelId={levelId} academy={academy} setAcademy={setAcademy} onClose={closeItem} />; }
    if (kind === 'assessment') return <AssessmentActivity assessment={academyActivity(id)} curriculum={curriculum} levelId={levelId} academy={academy} setAcademy={setAcademy} onClose={closeItem} />;
    if (kind === 'field-lab') return <FieldLabActivity activity={academyActivity(id)} levelId={levelId} academy={academy} setAcademy={setAcademy} onClose={closeItem} />;
    if (kind === 'design') return <DesignChallengeActivity activity={academyActivity(id)} levelId={levelId} academy={academy} setAcademy={setAcademy} data={data} setData={setData} openDesign={openDesign} onClose={closeItem} />;
  }
  return <div className="page academy-workspace"><div className="academy-topline"><div><span>Tierra Fleur Academy</span><strong>Mastery-Based Learning District</strong></div><span className={online ? 'online' : 'offline'}>{online ? '● Offline-ready' : '● Working offline'}</span></div><nav className="academy-nav" aria-label="Tierra Fleur Academy sections">{['Dashboard', 'Schools', 'Study Queue', 'Client Confidence', 'Creator Pro', 'Records', 'Settings', 'Legacy Library'].map(item => <button key={item} className={view === item ? 'active' : ''} onClick={() => { setView(item); setSelectedSchoolId(''); }}>{item}</button>)}</nav>
    {view === 'Dashboard' && <DashboardView academy={academy} openSchool={openSchool} goToAction={goToAction} setView={setView} />}
    {view === 'Schools' && <SchoolsView academy={academy} openSchool={openSchool} />}
    {view === 'School' && selectedSchool && <SchoolDetail school={selectedSchool} academy={academy} setAcademy={setAcademy} openItem={openItem} goToAction={goToAction} onBack={() => setView('Schools')} />}
    {view === 'Study Queue' && <StudyQueue academy={academy} openSchool={openSchool} openItem={openItem} />}
    {view === 'Client Confidence' && <ClientConfidenceLab academy={academy} setAcademy={setAcademy} />}
    {view === 'Creator Pro' && <CreatorView academy={academy} setAcademy={setAcademy} />}
    {view === 'Records' && <RecordsView academy={academy} />}
    {view === 'Settings' && <AcademySettings academy={academy} setAcademy={setAcademy} />}
    {view === 'Legacy Library' && <section className="academy-legacy"><div className="academy-section-title"><div><span>Preserved Learning District</span><h2>Legacy Lesson Library</h2><p>Existing lessons, favorites, notes, and completion records remain editable and unchanged. Legacy manual completions do not bypass Academy mastery gates.</p></div></div><LearningWorkspace learning={data.learning} setLearning={learning => setData(current => ({ ...current, learning }))} /></section>}
  </div>;
}
