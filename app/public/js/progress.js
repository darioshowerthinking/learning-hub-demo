// Where a learner stands, computed from the module and their progress.
// Mirrors server/roleplay.js sectionState(); the server re-checks before unlocking anything.

export function sectionState(section, p = {}) {
  const lessonsDone = section.lessons.every(l => p.lessonsDone?.includes(l.id));
  const quiz = p.quizzes?.[section.id] || null;
  const quizPassed = !section.quiz.length || !!quiz?.passed;
  const attempts = (p.attempts || []).filter(a => a.section === section.id);
  // A section without a practice session is passed once its lessons are done and its quiz is passed.
  const passed = section.boss ? attempts.some(a => a.passed) : lessonsDone && quizPassed;
  return { lessonsDone, quiz, quizPassed, unlocked: lessonsDone && quizPassed, passed, attempts };
}

// The single most useful next action in a module.
export function nextStep(mod, p = {}) {
  for (const section of mod.sections) {
    const st = sectionState(section, p);
    const lesson = section.lessons.find(l => !p.lessonsDone?.includes(l.id));
    if (lesson) return { kind: 'lesson', section, lesson, href: `#/lesson/${mod.id}/${lesson.id}` };
    if (!st.quizPassed) return { kind: 'quiz', section, href: `#/quiz/${mod.id}/${section.id}` };
    if (section.boss && !st.passed) return { kind: 'boss', section, href: `#/practice/${mod.id}/${section.id}` };
  }
  return { kind: 'done', href: `#/module/${mod.id}` };
}

export const allLessons = mod => mod.sections.flatMap(s => s.lessons);
