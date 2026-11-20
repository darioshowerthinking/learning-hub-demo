// Learner: one lesson, full page (10-15 minutes of blocks), then "mark as done" -> next step.
import { api } from '../api.js';
import { t, L } from '../i18n.js';
import { esc, chip } from '../ui.js';
import { renderBlocks, lessonBlocks, wireBlocks } from '../blocks.js';

export async function renderLesson(el, user, moduleId, lessonId) {
  const [mod, progress] = await Promise.all([api(`/api/modules/${moduleId}`), api('/api/progress')]);
  const p = progress[mod.id] || {};
  const section = mod.sections.find(s => s.lessons.some(l => l.id === lessonId));
  if (!section) { location.hash = `#/module/${moduleId}`; return; }
  const sIdx = mod.sections.indexOf(section);
  const idx = section.lessons.findIndex(l => l.id === lessonId);
  const lesson = section.lessons[idx];
  const prev = section.lessons[idx - 1], next = section.lessons[idx + 1];
  const done = p.lessonsDone?.includes(lesson.id);
  const othersDone = section.lessons.every(l => l.id === lesson.id || p.lessonsDone?.includes(l.id));
  const target = next ? { href: `#/lesson/${mod.id}/${next.id}`, label: 'markDoneNext' }
    : section.quiz.length && othersDone ? { href: `#/quiz/${mod.id}/${section.id}`, label: 'markDoneQuiz' }
    : { href: `#/module/${mod.id}`, label: 'markDoneModule' };

  el.innerHTML = `
    <a class="zn-back" href="#/module/${esc(mod.id)}"><span aria-hidden="true">←</span> ${esc(t('backToModule'))}</a>
    <article class="lh-article">
      <header class="lh-hero lh-article__head">
        <p class="lh-kicker">${esc(t('sectionN', { n: sIdx + 1 }))} · ${esc(L(section.title))}</p>
        <div class="lh-row">${chip('pending', t(`pillar_${lesson.pillar}`))}<span class="lh-muted">${esc(t('lessonOf', { i: idx + 1, n: section.lessons.length }))} · ${esc(t('readTime', { n: lesson.minutes }))}</span>${done ? chip('approved', t('lessonDone')) : ''}</div>
        <h1 class="lh-hero__title">${esc(L(lesson.title))}</h1>
        ${L(lesson.summary) ? `<p class="lh-hero__lead">${esc(L(lesson.summary))}</p>` : ''}
      </header>
      <div class="lh-blocks">${renderBlocks(lessonBlocks(lesson), lesson.id)}</div>
      <nav class="lh-lesson-nav">
        ${prev ? `<a class="zn-button zn-button--ghost" href="#/lesson/${esc(mod.id)}/${esc(prev.id)}">← ${esc(t('prevLesson'))}</a>` : '<span></span>'}
        ${done
          ? `<a class="zn-button" href="${esc(next ? `#/lesson/${mod.id}/${next.id}` : `#/module/${mod.id}`)}">${esc(t(next ? 'nextLessonBtn' : 'backToModule'))} →</a>`
          : `<button type="button" class="zn-button" data-done>${esc(t(target.label))} →</button>`}
      </nav>
    </article>`;
  wireBlocks(el);
  el.querySelector('[data-done]')?.addEventListener('click', async e => {
    e.currentTarget.disabled = true;
    await api('/api/progress/lesson', { method: 'POST', body: { moduleId: mod.id, lessonId: lesson.id } });
    location.hash = target.href;
  });
}
