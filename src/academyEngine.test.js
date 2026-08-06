import test from 'node:test';
import assert from 'node:assert/strict';
import { ACADEMY_CURRICULUM } from './academyCurriculum.js';
import {
  academyLevelGate,
  completeAcademyLessonCheck,
  gradeAcademyQuestion,
  migrateAcademyData,
  openAcademyLesson,
  recordAcademyActivity,
  recordAcademyAssessment,
  saveAcademyUserContent,
  saveFieldLabSubmission,
  selectAssessmentQuestions,
} from './academyEngine.js';
import { migrateAcademyData as migrateStartupAcademy } from './academyState.js';
import { buildDataBackup, importDataBackup, serializeDataForStorage } from './imageStorage.js';

const correctAnswers = questions => Object.fromEntries(questions.map(item => [item.id, item.type === 'short-response' ? (item.correctAnswerCriteria || []).slice(0, 2).join(' and ') : Array.isArray(item.correctAnswer) ? [...item.correctAnswer] : item.correctAnswer]));
const wrongAnswers = questions => Object.fromEntries(questions.map(item => [item.id, item.type === 'multiple-select' ? ['not an option'] : 'not the correct answer']));

test('Academy migration is idempotent, preserves legacy learning, and normalizes malformed collections', () => {
  const legacy = { completed: ['local-client-consultations'], myLessons: [{ lessonId: 'lesson-user-1', title: 'Keep me' }] };
  const first = migrateStartupAcademy({ settings: { masteryThreshold: 200 }, lessonProgress: 'bad', attempts: [null, { assessmentId: 'assessment-1', score: 90, passed: true }] }, legacy);
  const second = migrateStartupAcademy(first, legacy);
  assert.equal(first.settings.masteryThreshold, 100);
  assert.equal(first.lessonProgress.length, 0);
  assert.equal(second.legacyLearningRecords.length, 2);
  assert.deepEqual(second.legacyLearningRecords.map(item => item.legacyId).sort(), ['lesson-user-1', 'local-client-consultations']);
  assert.equal(second.attempts.length, 1);
});

test('opening or viewing a lesson does not complete it or bypass the mastery gate', () => {
  const curriculum = ACADEMY_CURRICULUM[0];
  const level = curriculum.levels[0];
  const academy = openAcademyLesson(migrateAcademyData(), level.id, level.lessonIds[0], '2026-08-05T10:00:00.000Z');
  const progress = academy.lessonProgress.find(item => item.lessonId === level.lessonIds[0]);
  const gate = academyLevelGate(academy, curriculum);
  assert.equal(progress.completedAt, '');
  assert.equal(progress.knowledgeCheckPassed, false);
  assert.equal(gate.complete, false);
  assert.equal(gate.requirements.find(item => item.id === 'lessons').current, 0);
});

test('every required component and objective mastery must pass before level completion', () => {
  const curriculum = ACADEMY_CURRICULUM[0];
  const level = curriculum.levels[0];
  let academy = migrateAcademyData();
  curriculum.lessons.forEach(item => {
    academy = completeAcademyLessonCheck(academy, level.id, item.id, 100, item.learningObjectives[0], '2026-08-05T10:00:00.000Z');
  });
  academy = recordAcademyActivity(academy, level.id, level.vocabularyActivityId, 'vocabulary');
  academy = recordAcademyActivity(academy, level.id, level.practiceActivityId, 'practice');

  const scenarioQuestions = selectAssessmentQuestions(academy, curriculum, curriculum.scenarioAssessment);
  academy = recordAcademyAssessment(academy, level.id, curriculum.scenarioAssessment, scenarioQuestions, correctAnswers(scenarioQuestions), '2026-08-05T11:00:00.000Z').academy;
  const finalQuestions = selectAssessmentQuestions(academy, curriculum, curriculum.finalAssessment);
  academy = recordAcademyAssessment(academy, level.id, curriculum.finalAssessment, finalQuestions, correctAnswers(finalQuestions), '2026-08-05T12:00:00.000Z').academy;

  assert.equal(academyLevelGate(academy, curriculum).complete, false, 'field evidence is still required');
  academy = saveFieldLabSubmission(academy, { fieldLabId: level.fieldLabId, levelId: level.id, status: 'completed', notes: 'Observed the site and recorded conditions.', checklist: curriculum.fieldLab.checklist, selfCertified: true });
  const gate = academyLevelGate(academy, curriculum);
  assert.equal(gate.complete, true);
  assert.equal(academy.completionRecords.some(item => item.levelId === level.id), true);
  assert.equal(academy.completionRecords.find(item => item.levelId === level.id).label, 'Internal Tierra Fleur Academy Completion Record');
});

test('failed attempts stay locked, create exact remediation, and retakes avoid recent questions', () => {
  const curriculum = ACADEMY_CURRICULUM[1];
  const level = curriculum.levels[0];
  let academy = migrateAcademyData();
  const firstQuestions = selectAssessmentQuestions(academy, curriculum, curriculum.scenarioAssessment);
  const failed = recordAcademyAssessment(academy, level.id, curriculum.scenarioAssessment, firstQuestions, wrongAnswers(firstQuestions), '2026-08-05T10:00:00.000Z');
  academy = failed.academy;
  assert.equal(failed.attempt.passed, false);
  assert.equal(academyLevelGate(academy, curriculum).complete, false);
  assert.ok(failed.attempt.remediation.every(item => item.lessonId && item.section && item.activity));

  const secondQuestions = selectAssessmentQuestions(academy, curriculum, curriculum.scenarioAssessment);
  assert.equal(secondQuestions.some(item => firstQuestions.some(first => first.id === item.id)), false, 'unseen questions are prioritized while alternatives exist');
  academy = recordAcademyAssessment(academy, level.id, curriculum.scenarioAssessment, secondQuestions, correctAnswers(secondQuestions), '2026-08-05T11:00:00.000Z').academy;
  const thirdQuestions = selectAssessmentQuestions(academy, curriculum, curriculum.scenarioAssessment);
  for (const item of thirdQuestions) {
    const prior = [...firstQuestions, ...secondQuestions].find(questionItem => questionItem.id === item.id);
    if (prior) assert.notEqual(item.prompt, prior.prompt, 'repeated objectives use a different presentation');
  }
  const restored = migrateStartupAcademy(academy);
  assert.equal(restored.questionHistory.reduce((sum, item) => sum + item.timesPresented, 0), 6);
  assert.ok(restored.questionHistory.some(item => item.timesAnsweredIncorrectly > 0));
});

test('question grading supports select, objective criteria, and calculation items locally', () => {
  assert.equal(gradeAcademyQuestion({ type: 'multiple-select', correctAnswer: ['Sun', 'Drainage'] }, ['Drainage', 'Sun']), true);
  assert.equal(gradeAcademyQuestion({ type: 'short-response', correctAnswerCriteria: ['pattern', 'moisture', 'weather'] }, 'I would record the pattern and check soil moisture.'), true);
  assert.equal(gradeAcademyQuestion({ type: 'calculation', correctAnswer: '20%' }, '20%'), true);
});

test('user-created curriculum survives migration and built-in content versions', () => {
  let academy = migrateAcademyData();
  const saved = saveAcademyUserContent(academy, { type: 'Lesson', title: 'Codex Academy Test Custom Lesson', body: 'Original private lesson body.', learningObjectives: ['Explain a local observation.'], tags: ['private'] }, true);
  assert.deepEqual(saved.errors, []);
  academy = migrateStartupAcademy({ ...saved.academy, academyContentVersion: 0 });
  assert.equal(academy.userContent.length, 1);
  assert.equal(academy.userContent[0].body, 'Original private lesson body.');
  assert.equal(academy.userContent[0].origin, 'user-created');
});

test('Academy attempts, evidence, settings, and custom lessons remain in the existing backup object', () => {
  const academy = migrateStartupAcademy({
    attempts: [{ attemptId: 'attempt-1', assessmentId: 'final-1', score: 88, passed: true }],
    fieldLabSubmissions: [{ submissionId: 'lab-1', fieldLabId: 'field-1', status: 'completed', photos: [{ evidenceId: 'photo-1', data: 'data:image/jpeg;base64,AA==' }] }],
    userContent: [{ contentId: 'custom-1', type: 'Lesson', title: 'Custom', body: 'Keep' }],
  });
  const stored = serializeDataForStorage({ clients: [{ id: 'client-1' }], projectPhotos: [], designConcepts: [], academy });
  assert.equal(stored.clients.length, 1);
  assert.equal(stored.academy.attempts[0].attemptId, 'attempt-1');
  assert.equal(stored.academy.fieldLabSubmissions[0].photos[0].evidenceId, 'photo-1');
  assert.equal(stored.academy.userContent[0].contentId, 'custom-1');
});

test('backup restore into an isolated profile preserves Academy progress graph', async () => {
  const academy = migrateStartupAcademy({
    settings: { masteryThreshold: 90 },
    attempts: [{ attemptId: 'Codex Academy Test attempt', assessmentId: 'scenario-1', score: 40, passed: false }],
    notes: [{ noteId: 'Codex Academy Test note', targetId: 'lesson-1', kind: 'user-note', body: 'Preserve this note.' }],
    fieldLabSubmissions: [{ submissionId: 'Codex Academy Test lab', fieldLabId: 'field-1', status: 'completed', notes: 'Preserve field evidence.', photos: [{ evidenceId: 'Codex Academy Test photo', data: 'data:image/jpeg;base64,AA==' }] }],
    userContent: [{ contentId: 'Codex Academy Test lesson', type: 'Lesson', title: 'Codex Academy Test restored lesson', body: 'Preserve custom content.' }],
  });
  const originalProfile = { clients: [{ id: 'client-unchanged' }], projects: [{ id: 'project-unchanged' }], projectPhotos: [], designConcepts: [], academy };
  const backup = await buildDataBackup(originalProfile);
  const imported = await importDataBackup(structuredClone(backup));
  const separateProfile = { ...imported, academy: migrateStartupAcademy(imported.academy) };
  assert.equal(separateProfile.clients[0].id, 'client-unchanged');
  assert.equal(separateProfile.projects[0].id, 'project-unchanged');
  assert.equal(separateProfile.academy.settings.masteryThreshold, 90);
  assert.equal(separateProfile.academy.attempts[0].attemptId, 'Codex Academy Test attempt');
  assert.equal(separateProfile.academy.notes[0].body, 'Preserve this note.');
  assert.equal(separateProfile.academy.fieldLabSubmissions[0].photos[0].evidenceId, 'Codex Academy Test photo');
  assert.equal(separateProfile.academy.userContent[0].title, 'Codex Academy Test restored lesson');
});

test('publication validation blocks incomplete custom levels without deleting the draft', () => {
  const academy = migrateAcademyData();
  const value = { type: 'Level', title: 'Codex Academy Test Incomplete Level', learningObjectives: ['Demonstrate mastery'], requirements: { lessons: ['lesson-1'] } };
  const result = saveAcademyUserContent(academy, value, true);
  assert.ok(result.errors.length >= 5);
  assert.equal(result.academy.userContent.length, 0);
  assert.ok(validateLevelMessage(result.errors));
});

function validateLevelMessage(errors) {
  return errors.some(item => item.toLowerCase().includes('final assessment'));
}
