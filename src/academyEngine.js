import { ACADEMY_CURRICULUM, ACADEMY_OBJECTIVES } from './academyCurriculum.js';
import { ACADEMY_RANKS } from './academyCatalog.js';

export const ACADEMY_SCHEMA_VERSION = 1;
export const ACADEMY_CONTENT_VERSION = 1;
export const ACADEMY_MASTERY_MIN = 75;
export const ACADEMY_MASTERY_MAX = 100;

const records = value => Array.isArray(value) ? value.filter(item => item && typeof item === 'object' && !Array.isArray(item)) : [];
const text = value => typeof value === 'string' ? value : '';
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const now = () => new Date().toISOString();
const dateOnly = value => new Date(value).toISOString().slice(0, 10);
const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, number(value)));

function normalizeSettings(settings = {}) {
  return {
    masteryThreshold: clamp(settings.masteryThreshold || 85, ACADEMY_MASTERY_MIN, ACADEMY_MASTERY_MAX),
    requireReviewBeforeRetake: Boolean(settings.requireReviewBeforeRetake),
    textSize: ['small', 'medium', 'large'].includes(settings.textSize) ? settings.textSize : 'medium',
    reducedMotion: settings.reducedMotion === undefined ? true : Boolean(settings.reducedMotion),
  };
}

export function createAcademyStarter() {
  return {
    academySchemaVersion: ACADEMY_SCHEMA_VERSION,
    academyContentVersion: ACADEMY_CONTENT_VERSION,
    settings: normalizeSettings(),
    lessonProgress: [],
    activityProgress: [],
    attempts: [],
    questionHistory: [],
    mastery: [],
    reviewQueue: [],
    fieldLabSubmissions: [],
    designChallengeSubmissions: [],
    clientSimulationRecords: [],
    capstoneRecords: [],
    completionRecords: [],
    notes: [],
    bookmarks: [],
    highlights: [],
    studySessions: [],
    userContent: [],
    legacyLearningRecords: [],
    currentActivity: { schoolId: '', courseId: '', levelId: '', lessonId: '', activityId: '', updatedAt: '' },
  };
}

function normalizeLessonProgress(item) {
  return {
    ...item,
    lessonId: text(item.lessonId || item.id),
    levelId: text(item.levelId),
    lastOpenedAt: text(item.lastOpenedAt),
    completedAt: text(item.completedAt),
    knowledgeCheckPassed: Boolean(item.knowledgeCheckPassed),
    knowledgeCheckScore: clamp(item.knowledgeCheckScore, 0, 100),
    timeSpentMinutes: Math.max(0, number(item.timeSpentMinutes)),
  };
}

function normalizeAttempt(item) {
  return {
    ...item,
    attemptId: text(item.attemptId || item.id) || uid('academy-attempt'),
    assessmentId: text(item.assessmentId),
    levelId: text(item.levelId),
    assessmentType: text(item.assessmentType || 'assessment'),
    score: clamp(item.score, 0, 100),
    passed: Boolean(item.passed),
    answers: item.answers && typeof item.answers === 'object' && !Array.isArray(item.answers) ? item.answers : {},
    questions: records(item.questions),
    objectiveResults: records(item.objectiveResults),
    missedObjectiveIds: Array.isArray(item.missedObjectiveIds) ? item.missedObjectiveIds.filter(Boolean) : [],
    remediation: records(item.remediation),
    createdAt: text(item.createdAt) || now(),
  };
}

function normalizeSubmission(item, kind) {
  const idKey = kind === 'field-lab' ? 'submissionId' : kind === 'design-challenge' ? 'submissionId' : 'recordId';
  return {
    ...item,
    [idKey]: text(item[idKey] || item.id) || uid(`academy-${kind}`),
    status: ['draft', 'completed', 'approved', 'revision-requested'].includes(item.status) ? item.status : 'draft',
    photos: records(item.photos),
    measurements: text(item.measurements),
    notes: text(item.notes),
    reflection: text(item.reflection),
    checklist: Array.isArray(item.checklist) ? item.checklist.filter(Boolean) : [],
    selfCertified: Boolean(item.selfCertified),
    createdAt: text(item.createdAt) || now(),
    updatedAt: text(item.updatedAt || item.createdAt) || now(),
  };
}

function legacyLearningRecords(legacyLearning = {}, savedRecords = []) {
  const byId = new Map(records(savedRecords).map(item => [item.legacyId, item]));
  const completedIds = Array.isArray(legacyLearning.completed) ? legacyLearning.completed : [];
  completedIds.forEach(legacyId => {
    if (!legacyId || byId.has(legacyId)) return;
    byId.set(legacyId, { id: `academy-legacy-${legacyId}`, legacyId, kind: 'built-in-completion', importedAt: '', preserved: true });
  });
  records(legacyLearning.myLessons).forEach(item => {
    const legacyId = item.lessonId || item.id;
    if (!legacyId || byId.has(legacyId)) return;
    byId.set(legacyId, { id: `academy-legacy-${legacyId}`, legacyId, kind: 'user-lesson', importedAt: '', preserved: true });
  });
  return [...byId.values()];
}

export function migrateAcademyData(value = {}, legacyLearning = {}) {
  const saved = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const starter = createAcademyStarter();
  const academy = {
    ...starter,
    ...saved,
    academySchemaVersion: ACADEMY_SCHEMA_VERSION,
    academyContentVersion: Math.max(ACADEMY_CONTENT_VERSION, number(saved.academyContentVersion)),
    settings: normalizeSettings(saved.settings),
    lessonProgress: records(saved.lessonProgress).map(normalizeLessonProgress).filter(item => item.lessonId),
    activityProgress: records(saved.activityProgress).map(item => ({ ...item, activityId: text(item.activityId || item.id), levelId: text(item.levelId), type: text(item.type), completed: Boolean(item.completed), score: clamp(item.score, 0, 100), completedAt: text(item.completedAt), evidence: item.evidence && typeof item.evidence === 'object' ? item.evidence : {} })).filter(item => item.activityId),
    attempts: records(saved.attempts).map(normalizeAttempt),
    questionHistory: records(saved.questionHistory).map(item => ({ ...item, questionId: text(item.questionId || item.id), lastPresentedAt: text(item.lastPresentedAt), timesPresented: Math.max(0, number(item.timesPresented)), timesAnsweredCorrectly: Math.max(0, number(item.timesAnsweredCorrectly)), timesAnsweredIncorrectly: Math.max(0, number(item.timesAnsweredIncorrectly)), presentationKeys: Array.isArray(item.presentationKeys) ? item.presentationKeys.filter(Boolean) : [] })).filter(item => item.questionId),
    mastery: records(saved.mastery).map(item => ({ ...item, objectiveId: text(item.objectiveId || item.id), score: clamp(item.score, 0, 100), attempts: Math.max(0, number(item.attempts)), correctResponses: Math.max(0, number(item.correctResponses)), incorrectResponses: Math.max(0, number(item.incorrectResponses)), lastPracticed: text(item.lastPracticed), confidenceRating: clamp(item.confidenceRating || 3, 1, 5), practicalEvidence: records(item.practicalEvidence), reviewDueDate: text(item.reviewDueDate), recentScores: Array.isArray(item.recentScores) ? item.recentScores.map(score => clamp(score, 0, 100)).slice(-4) : [] })).filter(item => item.objectiveId),
    reviewQueue: records(saved.reviewQueue).filter(item => item.objectiveId),
    fieldLabSubmissions: records(saved.fieldLabSubmissions).map(item => normalizeSubmission(item, 'field-lab')),
    designChallengeSubmissions: records(saved.designChallengeSubmissions).map(item => normalizeSubmission(item, 'design-challenge')),
    clientSimulationRecords: records(saved.clientSimulationRecords).map(item => normalizeSubmission(item, 'client-simulation')),
    capstoneRecords: records(saved.capstoneRecords),
    completionRecords: records(saved.completionRecords).filter(item => item.levelId),
    notes: records(saved.notes).filter(item => item.targetId),
    bookmarks: records(saved.bookmarks).filter(item => item.targetId),
    highlights: records(saved.highlights).filter(item => item.targetId),
    studySessions: records(saved.studySessions),
    userContent: records(saved.userContent).map(item => ({ ...item, contentId: text(item.contentId || item.id) || uid('academy-content'), origin: 'user-created', status: ['draft', 'published', 'archived'].includes(item.status) ? item.status : 'draft', title: text(item.title) || 'Untitled Academy content', type: text(item.type || 'Lesson'), tags: Array.isArray(item.tags) ? item.tags : [], learningObjectives: Array.isArray(item.learningObjectives) ? item.learningObjectives : [], prerequisites: Array.isArray(item.prerequisites) ? item.prerequisites : [], attachments: records(item.attachments), sourceNotes: text(item.sourceNotes), createdAt: text(item.createdAt) || now(), updatedAt: text(item.updatedAt || item.createdAt) || now() })),
    legacyLearningRecords: legacyLearningRecords(legacyLearning, saved.legacyLearningRecords),
    currentActivity: saved.currentActivity && typeof saved.currentActivity === 'object' && !Array.isArray(saved.currentActivity) ? { ...starter.currentActivity, ...saved.currentActivity } : starter.currentActivity,
  };
  return refreshAcademyCompletions(academy);
}

function replaceRecord(collection, key, value, record) {
  const found = collection.some(item => item[key] === value);
  return found ? collection.map(item => item[key] === value ? record : item) : [record, ...collection];
}

export function openAcademyLesson(academy, levelId, lessonId, openedAt = now()) {
  const existing = academy.lessonProgress.find(item => item.lessonId === lessonId) || { lessonId, levelId, completedAt: '', knowledgeCheckPassed: false, knowledgeCheckScore: 0, timeSpentMinutes: 0 };
  const record = { ...existing, lessonId, levelId, lastOpenedAt: openedAt };
  return {
    ...academy,
    lessonProgress: replaceRecord(academy.lessonProgress, 'lessonId', lessonId, record),
    currentActivity: { ...academy.currentActivity, levelId, lessonId, activityId: lessonId, updatedAt: openedAt },
  };
}

export function completeAcademyLessonCheck(academy, levelId, lessonId, score, objectiveId, completedAt = now()) {
  const threshold = academy.settings.masteryThreshold;
  const passed = number(score) >= threshold;
  const existing = academy.lessonProgress.find(item => item.lessonId === lessonId) || { lessonId, levelId, lastOpenedAt: completedAt, timeSpentMinutes: 0 };
  const record = { ...existing, lessonId, levelId, knowledgeCheckScore: clamp(score, 0, 100), knowledgeCheckPassed: passed, completedAt: passed ? completedAt : existing.completedAt || '' };
  let next = { ...academy, lessonProgress: replaceRecord(academy.lessonProgress, 'lessonId', lessonId, record) };
  next = updateObjectiveMastery(next, objectiveId, passed ? 100 : 0, passed, completedAt, { kind: 'lesson-check', id: lessonId });
  return refreshAcademyCompletions(next);
}

export function recordAcademyStudyTime(academy, targetId, minutes, startedAt = now()) {
  const amount = Math.max(0, Math.round(number(minutes)));
  if (!amount) return academy;
  const lessonProgress = academy.lessonProgress.map(item => item.lessonId === targetId ? { ...item, timeSpentMinutes: item.timeSpentMinutes + amount } : item);
  return { ...academy, lessonProgress, studySessions: [{ sessionId: uid('academy-study'), targetId, minutes: amount, startedAt }, ...academy.studySessions] };
}

export function recordAcademyActivity(academy, levelId, activityId, type, evidence = {}, score = 100, completedAt = now()) {
  const record = { activityId, levelId, type, completed: true, score: clamp(score, 0, 100), evidence, completedAt };
  let next = { ...academy, activityProgress: replaceRecord(academy.activityProgress, 'activityId', activityId, record), currentActivity: { ...academy.currentActivity, levelId, activityId, updatedAt: completedAt } };
  const curriculum = ACADEMY_CURRICULUM.find(item => item.levels.some(level => level.id === levelId));
  const objectiveIds = type === 'vocabulary' || type === 'practice' ? curriculum?.objectives.map(item => item.id) || [] : [];
  objectiveIds.forEach(objectiveId => { next = addPracticalEvidence(next, objectiveId, { kind: type, id: activityId, completedAt }); });
  return refreshAcademyCompletions(next);
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function renderQuestion(base, attemptIndex, presentationCount) {
  const fallbackVariants = [
    base.prompt,
    `During a practical site review, consider this: ${base.prompt}`,
    `Apply the same learning objective in a new context: ${base.prompt}`,
    `A colleague asks for your reasoning. ${base.prompt}`,
  ];
  const variants = [base.prompt, ...(base.promptVariants || []), ...fallbackVariants.slice(1)];
  const variantIndex = (attemptIndex + presentationCount) % variants.length;
  let prompt = variants[variantIndex];
  const chosenVariables = {};
  Object.entries(base.scenarioVariables || {}).forEach(([key, values]) => {
    const options = Array.isArray(values) ? values : [];
    if (!options.length) return;
    const selected = options[stableHash(`${base.id}-${attemptIndex}-${key}`) % options.length];
    chosenVariables[key] = selected;
    prompt = prompt.replaceAll(`{${key}}`, selected);
  });
  return {
    ...base,
    prompt,
    selectedScenarioVariables: chosenVariables,
    variantIndex,
    presentationKey: `${base.id}:v${variantIndex}:${Object.values(chosenVariables).join('|') || 'base'}`,
  };
}

export function selectAssessmentQuestions(academy, curriculum, assessment) {
  const eligible = curriculum.questions.filter(item => assessment.objectiveIds.includes(item.objectiveId));
  const attemptIndex = academy.attempts.filter(item => item.assessmentId === assessment.id).length;
  const history = new Map(academy.questionHistory.map(item => [item.questionId, item]));
  const weak = new Set(academy.mastery.filter(item => item.score < academy.settings.masteryThreshold).map(item => item.objectiveId));
  const preferredDifficulty = item => {
    const objective = academy.mastery.find(record => record.objectiveId === item.objectiveId);
    if (!objective || objective.attempts < 2) return 1;
    if (objective.score >= 92 && objective.correctResponses >= 2) return 3;
    if (objective.score < academy.settings.masteryThreshold) return 1;
    return 2;
  };
  const ranked = [...eligible].sort((left, right) => {
    const leftHistory = history.get(left.id);
    const rightHistory = history.get(right.id);
    const leftSeen = leftHistory?.timesPresented || 0;
    const rightSeen = rightHistory?.timesPresented || 0;
    if (leftSeen !== rightSeen) return leftSeen - rightSeen;
    const weakDelta = Number(weak.has(right.objectiveId)) - Number(weak.has(left.objectiveId));
    if (weakDelta) return weakDelta;
    const difficultyDelta = Math.abs(left.difficulty - preferredDifficulty(left)) - Math.abs(right.difficulty - preferredDifficulty(right));
    if (difficultyDelta) return difficultyDelta;
    const dateDelta = String(leftHistory?.lastPresentedAt || '').localeCompare(String(rightHistory?.lastPresentedAt || ''));
    if (dateDelta) return dateDelta;
    return stableHash(`${left.id}-${attemptIndex}`) - stableHash(`${right.id}-${attemptIndex}`);
  });
  const selected = [];
  const objectiveCoverage = new Set();
  for (const item of ranked) {
    if (selected.length >= assessment.questionCount) break;
    if (!objectiveCoverage.has(item.objectiveId)) {
      selected.push(item);
      objectiveCoverage.add(item.objectiveId);
    }
  }
  for (const item of ranked) {
    if (selected.length >= assessment.questionCount) break;
    if (!selected.some(chosen => chosen.id === item.id)) selected.push(item);
  }
  return selected.map(item => renderQuestion(item, attemptIndex, history.get(item.id)?.timesPresented || 0));
}

function normalizedAnswer(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function gradeAcademyQuestion(item, answer) {
  if (item.type === 'multiple-select') {
    const expected = (Array.isArray(item.correctAnswer) ? item.correctAnswer : []).map(normalizedAnswer).sort();
    const received = (Array.isArray(answer) ? answer : []).map(normalizedAnswer).filter(Boolean).sort();
    return expected.length === received.length && expected.every((value, index) => value === received[index]);
  }
  if (item.type === 'matching') {
    if (!answer || typeof answer !== 'object' || Array.isArray(answer) || !item.correctAnswer || typeof item.correctAnswer !== 'object' || Array.isArray(item.correctAnswer)) return false;
    const keys = Object.keys(item.correctAnswer);
    return keys.length > 0 && keys.every(key => normalizedAnswer(answer[key]) === normalizedAnswer(item.correctAnswer[key]));
  }
  if (item.type === 'ordering') {
    const expected = Array.isArray(item.correctAnswer) ? item.correctAnswer.map(normalizedAnswer) : [];
    const received = Array.isArray(answer) ? answer.map(normalizedAnswer) : [];
    return expected.length > 0 && expected.length === received.length && expected.every((value, index) => value === received[index]);
  }
  if (item.type === 'fill-in-terminology' && Array.isArray(item.correctAnswer)) return item.correctAnswer.map(normalizedAnswer).includes(normalizedAnswer(answer));
  if (['short-response', 'client-scenario', 'diagnostic-scenario', 'plant-selection-scenario', 'design-decision', 'field-lab-reflection', 'verbal-response-practice'].includes(item.type)) {
    const response = normalizedAnswer(answer);
    const criteria = (item.correctAnswerCriteria || []).map(normalizedAnswer).filter(Boolean);
    const hits = criteria.filter(term => response.includes(term)).length;
    return hits >= Math.min(2, criteria.length || 2);
  }
  return normalizedAnswer(answer) === normalizedAnswer(item.correctAnswer);
}

export function gradeAcademyAssessment(questions, answers) {
  const graded = questions.map(item => ({ questionId: item.id, objectiveId: item.objectiveId, correct: gradeAcademyQuestion(item, answers[item.id]), answer: answers[item.id] ?? '', explanation: item.explanation }));
  const correctCount = graded.filter(item => item.correct).length;
  const score = questions.length ? Math.round(correctCount / questions.length * 100) : 0;
  const objectiveMap = new Map();
  graded.forEach(item => {
    const result = objectiveMap.get(item.objectiveId) || { objectiveId: item.objectiveId, correct: 0, total: 0 };
    result.total += 1;
    if (item.correct) result.correct += 1;
    objectiveMap.set(item.objectiveId, result);
  });
  return { score, correctCount, total: questions.length, graded, objectiveResults: [...objectiveMap.values()].map(item => ({ ...item, score: Math.round(item.correct / item.total * 100) })) };
}

function reviewDate(passed, value) {
  const date = new Date(value);
  date.setDate(date.getDate() + (passed ? 21 : 2));
  return dateOnly(date);
}

function updateObjectiveMastery(academy, objectiveId, resultScore, correct, practicedAt, evidence) {
  if (!objectiveId) return academy;
  const existing = academy.mastery.find(item => item.objectiveId === objectiveId) || { objectiveId, score: 0, attempts: 0, correctResponses: 0, incorrectResponses: 0, confidenceRating: 3, practicalEvidence: [], recentScores: [] };
  const recentScores = [...(existing.recentScores || []), clamp(resultScore, 0, 100)].slice(-4);
  const record = {
    ...existing,
    objectiveId,
    score: Math.round(recentScores.reduce((sum, value) => sum + value, 0) / recentScores.length),
    attempts: existing.attempts + 1,
    correctResponses: existing.correctResponses + Number(correct),
    incorrectResponses: existing.incorrectResponses + Number(!correct),
    lastPracticed: practicedAt,
    practicalEvidence: evidence ? [...(existing.practicalEvidence || []), evidence].slice(-12) : existing.practicalEvidence || [],
    reviewDueDate: reviewDate(correct, practicedAt),
    recentScores,
  };
  return { ...academy, mastery: replaceRecord(academy.mastery, 'objectiveId', objectiveId, record) };
}

function addPracticalEvidence(academy, objectiveId, evidence) {
  if (!objectiveId) return academy;
  const existing = academy.mastery.find(item => item.objectiveId === objectiveId) || { objectiveId, score: 0, attempts: 0, correctResponses: 0, incorrectResponses: 0, confidenceRating: 3, practicalEvidence: [], recentScores: [] };
  const record = { ...existing, practicalEvidence: [...(existing.practicalEvidence || []), evidence].slice(-12) };
  return { ...academy, mastery: replaceRecord(academy.mastery, 'objectiveId', objectiveId, record) };
}

function remediationFor(objectiveIds) {
  return objectiveIds.map(objectiveId => {
    const objective = ACADEMY_OBJECTIVES.find(item => item.id === objectiveId);
    return { objectiveId, title: objective?.title || objectiveId, lessonId: objective?.reviewLessonId || '', section: objective?.reviewSection || '', activity: objective?.remediation || 'Review the relevant lesson and complete a fresh practice example.' };
  });
}

export function recordAcademyAssessment(academy, levelId, assessment, questions, answers, createdAt = now()) {
  const result = gradeAcademyAssessment(questions, answers);
  const threshold = academy.settings.masteryThreshold;
  const missedObjectiveIds = result.objectiveResults.filter(item => item.score < threshold).map(item => item.objectiveId);
  const attempt = {
    attemptId: uid('academy-attempt'),
    assessmentId: assessment.id,
    levelId,
    assessmentType: assessment.type,
    score: result.score,
    passed: result.score >= threshold,
    answers,
    questions: questions.map(item => ({ questionId: item.id, presentationKey: item.presentationKey, prompt: item.prompt, objectiveId: item.objectiveId, type: item.type, scenarioVariables: item.selectedScenarioVariables || {} })),
    objectiveResults: result.objectiveResults,
    missedObjectiveIds,
    remediation: remediationFor(missedObjectiveIds),
    createdAt,
  };
  let next = { ...academy, attempts: [attempt, ...academy.attempts], currentActivity: { ...academy.currentActivity, levelId, activityId: assessment.id, updatedAt: createdAt } };
  questions.forEach(item => {
    const graded = result.graded.find(entry => entry.questionId === item.id);
    const existing = next.questionHistory.find(entry => entry.questionId === item.id) || { questionId: item.id, timesPresented: 0, timesAnsweredCorrectly: 0, timesAnsweredIncorrectly: 0, presentationKeys: [] };
    const record = {
      ...existing,
      questionId: item.id,
      objectiveId: item.objectiveId,
      topic: item.topic,
      difficulty: item.difficulty,
      questionType: item.type,
      lastPresentedAt: createdAt,
      timesPresented: existing.timesPresented + 1,
      timesAnsweredCorrectly: existing.timesAnsweredCorrectly + Number(graded.correct),
      timesAnsweredIncorrectly: existing.timesAnsweredIncorrectly + Number(!graded.correct),
      presentationKeys: [...new Set([...(existing.presentationKeys || []), item.presentationKey])].slice(-12),
    };
    next = { ...next, questionHistory: replaceRecord(next.questionHistory, 'questionId', item.id, record) };
  });
  result.objectiveResults.forEach(item => {
    next = updateObjectiveMastery(next, item.objectiveId, item.score, item.score >= threshold, createdAt, { kind: 'assessment', id: assessment.id, attemptId: attempt.attemptId });
  });
  const newReviewItems = remediationFor(missedObjectiveIds).map(item => ({ ...item, queueId: `academy-review-${item.objectiveId}`, reason: `This objective scored below the ${threshold}% mastery threshold.`, why: `It appeared in the most recent ${assessment.type} attempt and needs a different example before it is considered secure.`, dueDate: reviewDate(false, createdAt), createdAt, completedAt: '' }));
  const masteredObjectiveIds = new Set(next.mastery.filter(item => item.attempts > 0 && item.score >= threshold).map(item => item.objectiveId));
  const withoutUpdated = next.reviewQueue.filter(item => !missedObjectiveIds.includes(item.objectiveId) && !masteredObjectiveIds.has(item.objectiveId));
  next = { ...next, reviewQueue: [...newReviewItems, ...withoutUpdated] };
  return { academy: refreshAcademyCompletions(next), attempt, result };
}

export function saveFieldLabSubmission(academy, submission) {
  const record = normalizeSubmission({ ...submission, submissionId: submission.submissionId || uid('academy-field-lab'), updatedAt: now() }, 'field-lab');
  let next = { ...academy, fieldLabSubmissions: replaceRecord(academy.fieldLabSubmissions, 'submissionId', record.submissionId, record) };
  if (['completed', 'approved'].includes(record.status)) {
    const curriculum = ACADEMY_CURRICULUM.find(item => item.fieldLab.id === record.fieldLabId);
    curriculum?.objectives.forEach(objective => { next = addPracticalEvidence(next, objective.id, { kind: 'field-lab', id: record.fieldLabId, submissionId: record.submissionId, completedAt: record.updatedAt }); });
  }
  return refreshAcademyCompletions(next);
}

export function saveDesignChallengeSubmission(academy, submission) {
  const record = normalizeSubmission({ ...submission, submissionId: submission.submissionId || uid('academy-design-challenge'), updatedAt: now() }, 'design-challenge');
  let next = { ...academy, designChallengeSubmissions: replaceRecord(academy.designChallengeSubmissions, 'submissionId', record.submissionId, record) };
  if (record.status === 'completed') {
    const curriculum = ACADEMY_CURRICULUM.find(item => item.designChallenge?.id === record.challengeId);
    curriculum?.objectives.forEach(objective => { next = addPracticalEvidence(next, objective.id, { kind: 'design-challenge', id: record.challengeId, submissionId: record.submissionId, completedAt: record.updatedAt }); });
  }
  return refreshAcademyCompletions(next);
}

export function saveClientSimulation(academy, record) {
  const normalized = normalizeSubmission({ ...record, recordId: record.recordId || uid('academy-client-simulation'), updatedAt: now() }, 'client-simulation');
  return { ...academy, clientSimulationRecords: replaceRecord(academy.clientSimulationRecords, 'recordId', normalized.recordId, normalized) };
}

export function levelMasteryScore(academy, level) {
  const scores = level.objectiveIds.map(objectiveId => academy.mastery.find(item => item.objectiveId === objectiveId)?.score || 0);
  return scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
}

export function academyLevelGate(academy, curriculum, level = curriculum.levels[0]) {
  const threshold = academy.settings.masteryThreshold;
  const lessonRecords = level.lessonIds.map(id => academy.lessonProgress.find(item => item.lessonId === id));
  const vocabulary = academy.activityProgress.find(item => item.activityId === level.vocabularyActivityId && item.completed);
  const practice = academy.activityProgress.find(item => item.activityId === level.practiceActivityId && item.completed);
  const scenarioAttempts = academy.attempts.filter(item => item.assessmentId === level.scenarioAssessmentId);
  const finalAttempts = academy.attempts.filter(item => item.assessmentId === level.finalAssessmentId);
  const fieldLab = academy.fieldLabSubmissions.find(item => item.fieldLabId === level.fieldLabId && ['completed', 'approved'].includes(item.status));
  const designChallenge = !level.designChallengeId || academy.designChallengeSubmissions.find(item => item.challengeId === level.designChallengeId && item.status === 'completed');
  const masteryScore = levelMasteryScore(academy, level);
  const requirements = [
    { id: 'lessons', label: 'Required lessons and checks', complete: lessonRecords.every(item => item?.completedAt && item.knowledgeCheckPassed), current: lessonRecords.filter(item => item?.completedAt && item.knowledgeCheckPassed).length, required: level.lessonIds.length, action: lessonRecords.find((item, index) => !item?.completedAt || !item.knowledgeCheckPassed) ? `lesson:${level.lessonIds[lessonRecords.findIndex(item => !item?.completedAt || !item.knowledgeCheckPassed)]}` : '' },
    { id: 'vocabulary', label: 'Vocabulary activity', complete: Boolean(vocabulary), current: vocabulary ? 1 : 0, required: 1, action: `activity:${level.vocabularyActivityId}` },
    { id: 'practice', label: 'Practice activity', complete: Boolean(practice), current: practice ? 1 : 0, required: 1, action: `activity:${level.practiceActivityId}` },
    { id: 'scenario', label: 'Scenario assessment passed', complete: scenarioAttempts.some(item => item.passed), current: Math.max(0, ...scenarioAttempts.map(item => item.score)), required: threshold, unit: '%', action: `assessment:${level.scenarioAssessmentId}` },
    { id: 'field-lab', label: 'Field lab completed', complete: Boolean(fieldLab), current: fieldLab ? 1 : 0, required: 1, action: `field-lab:${level.fieldLabId}` },
    ...(level.designChallengeId ? [{ id: 'design-challenge', label: 'Design challenge completed', complete: Boolean(designChallenge), current: designChallenge ? 1 : 0, required: 1, action: `design:${level.designChallengeId}` }] : []),
    { id: 'final', label: 'Final assessment passed', complete: finalAttempts.some(item => item.passed), current: Math.max(0, ...finalAttempts.map(item => item.score)), required: threshold, unit: '%', action: `assessment:${level.finalAssessmentId}` },
    { id: 'mastery', label: 'Minimum objective mastery', complete: masteryScore >= threshold, current: masteryScore, required: threshold, unit: '%', action: `review:${level.id}` },
  ];
  return { complete: requirements.every(item => item.complete), requirements, masteryScore, threshold, remaining: requirements.filter(item => !item.complete) };
}

export function refreshAcademyCompletions(academy) {
  let records = academy.completionRecords;
  ACADEMY_CURRICULUM.forEach(curriculum => {
    const level = curriculum.levels[0];
    const gate = academyLevelGate({ ...academy, completionRecords: records }, curriculum, level);
    if (!gate.complete || records.some(item => item.levelId === level.id)) return;
    const attempts = academy.attempts.filter(item => item.levelId === level.id);
    const fieldLabs = academy.fieldLabSubmissions.filter(item => item.levelId === level.id && ['completed', 'approved'].includes(item.status));
    const designAssignments = academy.designChallengeSubmissions.filter(item => item.levelId === level.id && item.status === 'completed');
    records = [{
      completionRecordId: `academy-completion-${level.id}`,
      label: 'Internal Tierra Fleur Academy Completion Record',
      schoolId: curriculum.school.id,
      schoolTitle: curriculum.school.title,
      courseId: curriculum.course.id,
      levelId: level.id,
      levelTitle: level.title,
      completionDate: now(),
      finalScore: Math.max(0, ...attempts.filter(item => item.assessmentType === 'final').map(item => item.score)),
      masteryPercentage: gate.masteryScore,
      studyTimeMinutes: academy.lessonProgress.filter(item => level.lessonIds.includes(item.lessonId)).reduce((sum, item) => sum + item.timeSpentMinutes, 0),
      skillsDemonstrated: curriculum.objectives.map(item => item.title),
      fieldLabsCompleted: fieldLabs.length,
      designAssignmentsCompleted: designAssignments.length,
    }, ...records];
  });
  return records === academy.completionRecords ? academy : { ...academy, completionRecords: records };
}

export function academyRank(academy) {
  const completedLevels = academy.completionRecords.length;
  const practical = academy.fieldLabSubmissions.filter(item => ['completed', 'approved'].includes(item.status)).length + academy.designChallengeSubmissions.filter(item => item.status === 'completed').length;
  const masteryScores = academy.mastery.filter(item => item.attempts > 0).map(item => item.score);
  const mastery = masteryScores.length ? Math.round(masteryScores.reduce((sum, score) => sum + score, 0) / masteryScores.length) : 0;
  const completedSchoolIds = new Set(academy.completionRecords.map(item => item.schoolId));
  return [...ACADEMY_RANKS].reverse().find(rank => completedLevels >= rank.minimumCompletedLevels && practical >= rank.minimumPractical && mastery >= rank.minimumMastery && rank.requiredSchoolSlugs.every(slug => completedSchoolIds.has(`academy-school-${slug}`))) || ACADEMY_RANKS[0];
}

export function academyDashboardSummary(academy) {
  const allGates = ACADEMY_CURRICULUM.map(curriculum => ({ curriculum, gate: academyLevelGate(academy, curriculum) }));
  const active = allGates.find(item => item.curriculum.levels[0].id === academy.currentActivity.levelId && !item.gate.complete);
  const current = active || allGates.find(item => !item.gate.complete) || allGates[allGates.length - 1];
  const passedAttempts = academy.attempts.filter(item => item.passed);
  const latestByAssessment = new Map();
  academy.attempts.forEach(item => { if (!latestByAssessment.has(item.assessmentId)) latestByAssessment.set(item.assessmentId, item); });
  const failedAttempts = [...latestByAssessment.values()].filter(item => !item.passed);
  const studiedDates = [...new Set(academy.studySessions.map(item => String(item.startedAt).slice(0, 10)).filter(Boolean))].sort().reverse();
  let streak = 0;
  const cursor = new Date();
  for (let day = 0; day < 365; day += 1) {
    const label = cursor.toISOString().slice(0, 10);
    if (!studiedDates.includes(label)) {
      if (day === 0) { cursor.setDate(cursor.getDate() - 1); continue; }
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  const masteryScores = academy.mastery.filter(item => item.attempts > 0).map(item => item.score);
  return {
    rank: academyRank(academy),
    currentSchool: current?.curriculum.school.title || 'Academy complete',
    currentCourse: current?.curriculum.course.title || '',
    currentLevel: current?.curriculum.levels[0].title || '',
    currentLevelId: current?.curriculum.levels[0].id || '',
    lessonsCompleted: academy.lessonProgress.filter(item => item.completedAt && item.knowledgeCheckPassed).length,
    masteryPercentage: masteryScores.length ? Math.round(masteryScores.reduce((sum, score) => sum + score, 0) / masteryScores.length) : 0,
    assessmentsPassed: passedAttempts.length,
    assessmentsRequiringReview: failedAttempts.length,
    fieldLabsAwaiting: Math.max(0, ACADEMY_CURRICULUM.length - academy.fieldLabSubmissions.filter(item => ['completed', 'approved'].includes(item.status)).length),
    designChallengesAwaiting: ACADEMY_CURRICULUM.filter(item => item.designChallenge).length - academy.designChallengeSubmissions.filter(item => item.status === 'completed').length,
    skillsNeedingReinforcement: academy.mastery.filter(item => item.attempts > 0 && item.score < academy.settings.masteryThreshold).length,
    totalStudyMinutes: academy.studySessions.reduce((sum, item) => sum + number(item.minutes), 0),
    streak,
    recent: [...academy.lessonProgress].filter(item => item.lastOpenedAt).sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt)).slice(0, 5),
    bookmarked: academy.bookmarks.length,
    nextAction: academy.currentActivity.lessonId && current?.curriculum.levels[0].lessonIds.includes(academy.currentActivity.lessonId) && !academy.lessonProgress.find(item => item.lessonId === academy.currentActivity.lessonId)?.completedAt
      ? { id: 'resume', label: 'Resume where I left off', action: `lesson:${academy.currentActivity.lessonId}` }
      : current?.gate.remaining[0] || null,
  };
}

export function toggleAcademyBookmark(academy, targetId, targetType = 'lesson') {
  const existing = academy.bookmarks.find(item => item.targetId === targetId);
  return { ...academy, bookmarks: existing ? academy.bookmarks.filter(item => item.targetId !== targetId) : [{ bookmarkId: uid('academy-bookmark'), targetId, targetType, createdAt: now() }, ...academy.bookmarks] };
}

export function saveAcademyNote(academy, targetId, body, kind = 'user-note') {
  const existing = academy.notes.find(item => item.targetId === targetId && item.kind === kind);
  if (!text(body).trim()) return { ...academy, notes: academy.notes.filter(item => !(item.targetId === targetId && item.kind === kind)) };
  const record = { noteId: existing?.noteId || uid('academy-note'), targetId, kind, body: text(body).trim(), createdAt: existing?.createdAt || now(), updatedAt: now() };
  return { ...academy, notes: existing ? academy.notes.map(item => item.noteId === existing.noteId ? record : item) : [record, ...academy.notes] };
}

export function validateAcademyUserContent(item) {
  const errors = [];
  if (!text(item.title).trim()) errors.push('Add a title.');
  if (!text(item.type).trim()) errors.push('Choose a content type.');
  if (['Lesson', 'Field lab', 'Design challenge', 'Final assessment', 'Capstone'].includes(item.type) && !(item.learningObjectives || []).length) errors.push('Add at least one learning objective.');
  if (item.type === 'Lesson' && !text(item.body).trim()) errors.push('Add lesson content.');
  if (item.type === 'Level') {
    const requirements = item.requirements && typeof item.requirements === 'object' ? item.requirements : {};
    ['lessons', 'vocabulary', 'practice', 'scenario', 'fieldLab', 'finalAssessment'].forEach(key => {
      if (!Array.isArray(requirements[key]) || !requirements[key].filter(Boolean).length) errors.push(`Add required ${key.replace(/([A-Z])/g, ' $1').toLowerCase()} references.`);
    });
  }
  return errors;
}

export function saveAcademyUserContent(academy, value, publish = false) {
  const contentId = value.contentId || uid('academy-content');
  const record = { ...value, contentId, id: contentId, origin: 'user-created', status: publish ? 'published' : value.status || 'draft', title: text(value.title).trim() || 'Untitled Academy content', tags: Array.isArray(value.tags) ? value.tags.filter(Boolean) : [], learningObjectives: Array.isArray(value.learningObjectives) ? value.learningObjectives.filter(Boolean) : [], prerequisites: Array.isArray(value.prerequisites) ? value.prerequisites.filter(Boolean) : [], createdAt: value.createdAt || now(), updatedAt: now() };
  const errors = publish ? validateAcademyUserContent(record) : [];
  if (errors.length) return { academy, record, errors };
  return { academy: { ...academy, userContent: replaceRecord(academy.userContent, 'contentId', contentId, record) }, record, errors: [] };
}
