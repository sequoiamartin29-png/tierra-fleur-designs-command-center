export const ACADEMY_SCHEMA_VERSION = 1;
export const ACADEMY_CONTENT_VERSION = 1;

const records = value => Array.isArray(value) ? value.filter(item => item && typeof item === 'object' && !Array.isArray(item)) : [];
const text = value => typeof value === 'string' ? value : '';
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const now = () => new Date().toISOString();
const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, number(value)));

function normalizeSettings(settings = {}) {
  return { masteryThreshold: clamp(settings.masteryThreshold || 85, 75, 100), requireReviewBeforeRetake: Boolean(settings.requireReviewBeforeRetake), textSize: ['small', 'medium', 'large'].includes(settings.textSize) ? settings.textSize : 'medium', reducedMotion: settings.reducedMotion === undefined ? true : Boolean(settings.reducedMotion) };
}

export function createAcademyStarter() {
  return {
    academySchemaVersion: ACADEMY_SCHEMA_VERSION,
    academyContentVersion: ACADEMY_CONTENT_VERSION,
    settings: normalizeSettings(),
    lessonProgress: [], activityProgress: [], attempts: [], questionHistory: [], mastery: [], reviewQueue: [],
    fieldLabSubmissions: [], designChallengeSubmissions: [], clientSimulationRecords: [], capstoneRecords: [], completionRecords: [],
    notes: [], bookmarks: [], highlights: [], studySessions: [], userContent: [], legacyLearningRecords: [],
    currentActivity: { schoolId: '', courseId: '', levelId: '', lessonId: '', activityId: '', updatedAt: '' },
  };
}

function legacyRecords(legacyLearning, savedRecords) {
  const byId = new Map(records(savedRecords).map(item => [item.legacyId, item]));
  for (const legacyId of Array.isArray(legacyLearning?.completed) ? legacyLearning.completed : []) {
    if (legacyId && !byId.has(legacyId)) byId.set(legacyId, { id: `academy-legacy-${legacyId}`, legacyId, kind: 'built-in-completion', importedAt: '', preserved: true });
  }
  for (const item of records(legacyLearning?.myLessons)) {
    const legacyId = item.lessonId || item.id;
    if (legacyId && !byId.has(legacyId)) byId.set(legacyId, { id: `academy-legacy-${legacyId}`, legacyId, kind: 'user-lesson', importedAt: '', preserved: true });
  }
  return [...byId.values()];
}

export function migrateAcademyData(value = {}, legacyLearning = {}) {
  const saved = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const starter = createAcademyStarter();
  return {
    ...starter, ...saved,
    academySchemaVersion: ACADEMY_SCHEMA_VERSION,
    academyContentVersion: Math.max(ACADEMY_CONTENT_VERSION, number(saved.academyContentVersion)),
    settings: normalizeSettings(saved.settings),
    lessonProgress: records(saved.lessonProgress).map(item => ({ ...item, lessonId: text(item.lessonId || item.id), levelId: text(item.levelId), lastOpenedAt: text(item.lastOpenedAt), completedAt: text(item.completedAt), knowledgeCheckPassed: Boolean(item.knowledgeCheckPassed), knowledgeCheckScore: clamp(item.knowledgeCheckScore, 0, 100), timeSpentMinutes: Math.max(0, number(item.timeSpentMinutes)) })).filter(item => item.lessonId),
    activityProgress: records(saved.activityProgress).map(item => ({ ...item, activityId: text(item.activityId || item.id), levelId: text(item.levelId), type: text(item.type), completed: Boolean(item.completed), score: clamp(item.score, 0, 100), completedAt: text(item.completedAt), evidence: item.evidence && typeof item.evidence === 'object' ? item.evidence : {} })).filter(item => item.activityId),
    attempts: records(saved.attempts).map(item => ({ ...item, attemptId: text(item.attemptId || item.id) || uid('academy-attempt'), assessmentId: text(item.assessmentId), levelId: text(item.levelId), assessmentType: text(item.assessmentType || 'assessment'), score: clamp(item.score, 0, 100), passed: Boolean(item.passed), answers: item.answers && typeof item.answers === 'object' && !Array.isArray(item.answers) ? item.answers : {}, questions: records(item.questions), objectiveResults: records(item.objectiveResults), missedObjectiveIds: Array.isArray(item.missedObjectiveIds) ? item.missedObjectiveIds.filter(Boolean) : [], remediation: records(item.remediation), createdAt: text(item.createdAt) || now() })),
    questionHistory: records(saved.questionHistory).map(item => ({ ...item, questionId: text(item.questionId || item.id), lastPresentedAt: text(item.lastPresentedAt), timesPresented: Math.max(0, number(item.timesPresented)), timesAnsweredCorrectly: Math.max(0, number(item.timesAnsweredCorrectly)), timesAnsweredIncorrectly: Math.max(0, number(item.timesAnsweredIncorrectly)), presentationKeys: Array.isArray(item.presentationKeys) ? item.presentationKeys.filter(Boolean) : [] })).filter(item => item.questionId),
    mastery: records(saved.mastery).map(item => ({ ...item, objectiveId: text(item.objectiveId || item.id), score: clamp(item.score, 0, 100), attempts: Math.max(0, number(item.attempts)), correctResponses: Math.max(0, number(item.correctResponses)), incorrectResponses: Math.max(0, number(item.incorrectResponses)), lastPracticed: text(item.lastPracticed), confidenceRating: clamp(item.confidenceRating || 3, 1, 5), practicalEvidence: records(item.practicalEvidence), reviewDueDate: text(item.reviewDueDate), recentScores: Array.isArray(item.recentScores) ? item.recentScores.map(score => clamp(score, 0, 100)).slice(-4) : [] })).filter(item => item.objectiveId),
    reviewQueue: records(saved.reviewQueue).filter(item => item.objectiveId),
    fieldLabSubmissions: records(saved.fieldLabSubmissions).map(item => ({ ...item, submissionId: text(item.submissionId || item.id) || uid('academy-field-lab'), photos: records(item.photos), checklist: Array.isArray(item.checklist) ? item.checklist.filter(Boolean) : [], status: ['draft', 'completed', 'approved', 'revision-requested'].includes(item.status) ? item.status : 'draft', selfCertified: Boolean(item.selfCertified) })),
    designChallengeSubmissions: records(saved.designChallengeSubmissions).map(item => ({ ...item, submissionId: text(item.submissionId || item.id) || uid('academy-design-challenge'), checklist: Array.isArray(item.checklist) ? item.checklist.filter(Boolean) : [], status: ['draft', 'completed', 'approved', 'revision-requested'].includes(item.status) ? item.status : 'draft', selfCertified: Boolean(item.selfCertified) })),
    clientSimulationRecords: records(saved.clientSimulationRecords), capstoneRecords: records(saved.capstoneRecords), completionRecords: records(saved.completionRecords).filter(item => item.levelId),
    notes: records(saved.notes).filter(item => item.targetId), bookmarks: records(saved.bookmarks).filter(item => item.targetId), highlights: records(saved.highlights).filter(item => item.targetId), studySessions: records(saved.studySessions),
    userContent: records(saved.userContent).map(item => ({ ...item, contentId: text(item.contentId || item.id) || uid('academy-content'), origin: 'user-created', status: ['draft', 'published', 'archived'].includes(item.status) ? item.status : 'draft', title: text(item.title) || 'Untitled Academy content', tags: Array.isArray(item.tags) ? item.tags : [], learningObjectives: Array.isArray(item.learningObjectives) ? item.learningObjectives : [], prerequisites: Array.isArray(item.prerequisites) ? item.prerequisites : [], attachments: records(item.attachments), sourceNotes: text(item.sourceNotes), createdAt: text(item.createdAt) || now(), updatedAt: text(item.updatedAt || item.createdAt) || now() })),
    legacyLearningRecords: legacyRecords(legacyLearning, saved.legacyLearningRecords),
    currentActivity: saved.currentActivity && typeof saved.currentActivity === 'object' && !Array.isArray(saved.currentActivity) ? { ...starter.currentActivity, ...saved.currentActivity } : starter.currentActivity,
  };
}
