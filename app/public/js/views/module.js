// Learner: one module as a path of sections. Each section: lessons -> quiz -> final challenge.
import { api } from '../api.js';
import { t, L } from '../i18n.js';
import { esc, chip } from '../ui.js';
import { sectionState } from '../progress.js';

const initials = name => name.replace(/^Dr\.\s*/, '').split(' ').map(w => w[0]).join('').slice(0, 2);

export async function renderModule(el, user, moduleId) {
  const [mod, progress, meta] = await Promise.all([api(`/api/modules/${moduleId}`), api('/api/progress'), api('/api/meta')]);
  const p = progress[mod.id] || {};

  const sectionHtml = (section, i) => {
    const st = sectionState(section, p);
    const persona = section.boss ? meta.personas.find(x => x.id === section.boss.persona) : null;
    const passMark = Math.ceil(section.quiz.length * 2 / 3);
    const bossState = st.passed ? 'beaten' : st.unlocked ? 'ready' : 'locked';
    return `<section class="zn-card lh-card lh-section-card">
      <p class="lh-kicker">${esc(t('sectionN', { n: i + 1 }))}</p>
      <h2 class="lh-card__title">${esc(L(section.title))}</h2>
      <ol class="lh-lessons">
        ${section.lessons.map((l, k) => {
          const done = p.lessonsDone?.includes(l.id);
          return `<li class="lh-lesson-row">
            <span class="lh-lesson-row__n ${done ? 'lh-lesson-row__n--done' : ''}" aria-hidden="true">${done ? '✓' : k + 1}</span>
            <div class="lh-lesson-row__text">
              <a class="lh-lesson__title" href="#/lesson/${esc(mod.id)}/${esc(l.id)}">${esc(L(l.title))}</a>
              ${L(l.summary) ? `<p class="lh-card__meta">${esc(L(l.summary))}</p>` : ''}
              <span class="lh-row lh-lesson__meta">${chip('pending', t(`pillar_${l.pillar}`))}<span class="lh-muted">${esc(t('minutes', { n: l.minutes }))}</span>${done ? chip('approved', t('done')) : ''}</span>
            </div>
            <a class="zn-button ${done ? 'zn-button--ghost' : ''}" href="#/lesson/${esc(mod.id)}/${esc(l.id)}">${esc(t(done ? 'reviewLesson' : 'startLesson'))}</a>
          </li>`;
        }).join('')}
      </ol>
      ${section.quiz.length ? `<div class="lh-step">
        <div><strong>${esc(t('quizTitle'))}</strong>
          <p class="lh-card__meta">${st.quiz ? esc(t(st.quiz.passed ? 'quizPassed' : 'quizNotPassed', { score: st.quiz.score, total: st.quiz.total })) : esc(t('quizLead', { n: section.quiz.length, pass: passMark }))}</p></div>
        <a class="zn-button ${st.quizPassed ? 'zn-button--ghost' : ''}" href="#/quiz/${esc(mod.id)}/${esc(section.id)}" ${st.lessonsDone ? '' : 'aria-disabled="true" tabindex="-1" data-disabled'}>${esc(t(st.quiz ? 'retakeQuiz' : 'startQuiz'))}</a>
      </div>` : ''}
      ${section.boss ? `<div class="lh-boss lh-boss--${bossState}">
        <span class="lh-avatar lh-avatar--lg lh-avatar--hcp">${esc(initials(persona.name))}</span>
        <div class="lh-boss__text">
          <p class="lh-kicker">${esc(t('finalChallenge'))} · ${esc(t('visitMinutes', { n: section.boss.minutes }))}</p>
          <strong>${esc(persona.name)} · ${esc(L(persona.role))}</strong>
          <p class="lh-card__meta">${esc(L(section.boss.brief))}</p>
          <p class="lh-boss__state">${bossState === 'beaten' ? chip('approved', t('bossBeaten')) : bossState === 'ready' ? chip('in_review', t('bossReady')) : chip('draft', t('bossLocked'))}</p>
        </div>
        ${st.unlocked ? `<a class="zn-button" href="#/practice/${esc(mod.id)}/${esc(section.id)}">${esc(t(st.passed ? 'tryAgain' : 'faceChallenge'))}</a>` : ''}
      </div>` : ''}
    </section>`;
  };

  el.innerHTML = `
    <a class="zn-back" href="#/"><span aria-hidden="true">←</span> ${esc(t('back'))}</a>
    <header class="lh-hero">
      <span class="zn-product zn-product--derolad">Derolad®</span>
      <h1 class="lh-hero__title">${esc(L(mod.title))}</h1>
      <p class="lh-hero__lead">${esc(L(mod.objective))}</p>
    </header>
    <div class="lh-path">${mod.sections.map(sectionHtml).join('')}</div>`;

  el.querySelectorAll('[data-disabled]').forEach(a => a.addEventListener('click', e => e.preventDefault()));
}
