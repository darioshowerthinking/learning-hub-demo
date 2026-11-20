// Learner: a section's quiz. One question at a time; the AI tutor explains each answer.
// The browser never has the answer key: the server grades on submit and returns the correct answers.
import { api } from '../api.js';
import { t, L, getLang } from '../i18n.js';
import { esc, chip, errorBox } from '../ui.js';

export async function renderQuiz(el, user, moduleId, sectionId) {
  const mod = await api(`/api/modules/${moduleId}`);
  const section = mod.sections.find(s => s.id === sectionId);
  const answers = [];
  let i = 0;

  const show = () => {
    const q = section.quiz[i];
    el.innerHTML = `
      <a class="zn-back" href="#/module/${esc(mod.id)}"><span aria-hidden="true">←</span> ${esc(t('backToModule'))}</a>
      <header class="lh-hero">
        <p class="lh-kicker">${esc(L(section.title))} · ${esc(t('quizTitle'))}</p>
        <h1 class="lh-hero__title">${esc(t('questionOf', { i: i + 1, n: section.quiz.length }))}</h1>
      </header>
      <form class="zn-card lh-card lh-quiz" data-q>
        <p class="lh-quiz__q">${esc(L(q.q))}</p>
        <div class="lh-options">
          ${q.options.map((o, k) => `<label class="lh-option"><input type="radio" name="a" value="${k}"><span>${esc(L(o))}</span></label>`).join('')}
        </div>
        <div class="lh-row"><button class="zn-button" type="submit" disabled>${esc(t(i + 1 < section.quiz.length ? 'next' : 'finishQuiz'))}</button></div>
      </form>`;
    const form = el.querySelector('[data-q]');
    form.addEventListener('change', () => { form.querySelector('button').disabled = false; });
    form.addEventListener('submit', e => {
      e.preventDefault();
      answers[i] = Number(new FormData(form).get('a'));
      if (++i < section.quiz.length) show(); else finish();
    });
  };

  const finish = async () => {
    el.innerHTML = `<div class="zn-card lh-card lh-waiting"><span class="lh-spinner" aria-hidden="true"></span></div>`;
    const res = await api('/api/progress/quiz', { method: 'POST', body: { moduleId, sectionId, answers } });
    el.innerHTML = `
      <a class="zn-back" href="#/module/${esc(mod.id)}"><span aria-hidden="true">←</span> ${esc(t('backToModule'))}</a>
      <header class="lh-hero">
        <p class="lh-kicker">${esc(L(section.title))} · ${esc(t('quizTitle'))}</p>
        <h1 class="lh-hero__title">${res.score} / ${res.total}</h1>
        <p class="lh-hero__lead">${esc(t(res.passed ? 'quizResultPass' : 'quizResultFail'))}</p>
      </header>
      <ol class="lh-quiz-review">
        ${section.quiz.map((q, k) => {
          const r = res.results[k];
          return `<li class="zn-card lh-card">
            <div class="lh-row">${chip(r.correct ? 'approved' : 'changes_requested', t(r.correct ? 'correct' : 'incorrect'))}${chip('pending', t(`pillar_${q.pillar}`))}</div>
            <p class="lh-quiz__q">${esc(L(q.q))}</p>
            <p class="lh-card__meta">${r.correct ? '' : `<s>${esc(L(q.options[r.chosen]))}</s> → `}<strong>${esc(L(q.options[r.answer]))}</strong></p>
            <p class="lh-explain" data-explain="${k}"><span class="lh-typing">${esc(t('explaining'))}</span></p>
          </li>`;
        }).join('')}
      </ol>
      <div class="lh-row">
        <a class="zn-button" href="#/${res.passed ? `practice/${esc(mod.id)}/${esc(section.id)}` : `module/${esc(mod.id)}`}">${esc(t(res.passed ? 'faceChallenge' : 'backToModule'))}</a>
      </div>`;
    // Explanations arrive in parallel; each fills its own card.
    section.quiz.forEach((q, k) => {
      api('/api/quiz/explain', { method: 'POST', body: { moduleId, sectionId, questionId: q.id, chosen: res.results[k].chosen, lang: getLang() } })
        .then(({ text }) => { el.querySelector(`[data-explain="${k}"]`).textContent = text; })
        .catch(err => { el.querySelector(`[data-explain="${k}"]`).innerHTML = errorBox(err); });
    });
  };

  show();
}
