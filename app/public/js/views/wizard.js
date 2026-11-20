// Content creator: the new-project wizard (#/build) and "edit requirements" (#/build/:id).
// Steps: 1 audience · 2 goal and shape · 3 materials · 4 videos · 5 review. Nothing is sent until "Create project".
// A new project's answers are kept in the browser while the wizard is open, so a reload does not lose them.
import { api } from '../api.js';
import { t, L, getLang } from '../i18n.js';
import { esc, chip, errorBox, fmtDate } from '../ui.js';
import { AUDIENCE_ROLES, EXPERIENCE, PRACTICE_MODES, LIMITS, PRESETS, specTotals, audienceText } from '../studio-rules.js';

const STEPS = ['audience', 'shape', 'materials', 'videos', 'review'];
const DRAFT_KEY = 'zn-wizard-draft';
const load = () => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; } };
const store = w => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(w)); } catch { /* private window: fine */ } };
const forget = () => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } };
const clone = x => JSON.parse(JSON.stringify(x));

const blankSpec = () => ({
  title: '', goal: '',
  audience: { role: 'derm_reps', roleOther: '', experience: 'mixed', experienceOther: '', notes: '' },
  sections: clone(PRESETS.standard), materials: [], willUpload: false, videos: [],
});

export async function renderWizard(el, user, projectId) {
  const [library, project] = await Promise.all([api('/api/materials'), projectId ? api(`/api/modules/${projectId}`) : null]);
  const editing = !!project;
  const saved = !editing && load();
  const w = editing ? clone(project.studio.spec) : (saved?.spec || blankSpec());
  if (!editing && !saved) w.materials = library.filter(m => m.kind === 'builtin').map(m => m.id);
  let step = editing ? STEPS.length - 1 : Math.min(saved?.step || 0, STEPS.length - 1);
  let furthest = editing ? STEPS.length - 1 : Math.max(step, saved?.furthest || 0);   // steps up to here can be jumped to
  let error = null;

  const persist = () => { if (!editing) store({ spec: w, step, furthest }); };
  const totals = () => specTotals(w);
  const totalsLine = () => {
    const x = totals();
    return t('shapeTotals', { min: x.minutes, lessons: x.lessons, quizzes: x.quizzes, questions: x.questions, practice: x.practice, avatar: x.avatar });
  };

  // ------------------------------ Step bodies ------------------------------
  const sel = (name, value, options, attrs = '') => `<select class="lh-input" name="${name}" ${attrs}>${options.map(([v, label]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select>`;
  const num = (name, value, [lo, hi], label) => `<label class="lh-field lh-wz-num"><span class="lh-field__label">${esc(label)}</span>
    <input class="lh-input" type="number" inputmode="numeric" name="${name}" min="${lo}" max="${hi}" value="${value}"></label>`;

  const stepAudience = () => `
    <div class="lh-form__row">
      <label class="lh-field"><span class="lh-field__label">${esc(t('wzRole'))}</span>
        ${sel('role', w.audience.role, [...Object.entries(AUDIENCE_ROLES).map(([k, v]) => [k, L(v)]), ['other', t('wzOther')]])}</label>
      <label class="lh-field"><span class="lh-field__label">${esc(t('wzExperience'))}</span>
        ${sel('experience', w.audience.experience, [...Object.entries(EXPERIENCE).map(([k, v]) => [k, L(v)]), ['other', t('wzOther')]])}</label>
    </div>
    <div class="lh-form__row">
      <label class="lh-field" ${w.audience.role === 'other' ? '' : 'hidden'}><span class="lh-field__label">${esc(t('wzRoleOther'))}</span>
        <input class="lh-input" name="roleOther" maxlength="120" value="${esc(w.audience.roleOther)}"></label>
      <label class="lh-field" ${w.audience.experience === 'other' ? '' : 'hidden'}><span class="lh-field__label">${esc(t('wzExperienceOther'))}</span>
        <input class="lh-input" name="experienceOther" maxlength="120" value="${esc(w.audience.experienceOther)}"></label>
    </div>
    <label class="lh-field"><span class="lh-field__label">${esc(t('wzAudienceNotes'))} <span class="lh-muted">${esc(t('optional'))}</span></span>
      <textarea class="lh-input" name="notes" rows="3" maxlength="600" placeholder="${esc(t('wzAudienceNotesPh'))}">${esc(w.audience.notes)}</textarea></label>`;

  const sectionRow = (s, i) => `
    <div class="lh-wz-section" data-section="${i}">
      <div class="lh-row"><strong>${esc(t('sectionN', { n: i + 1 }))}</strong><span class="lh-spacer"></span>
        ${w.sections.length > 1 ? `<button type="button" class="lh-link lh-link--danger" data-remove-section="${i}">${esc(t('remove'))}</button>` : ''}</div>
      <div class="lh-wz-grid">
        ${num(`s${i}.lessons`, s.lessons, LIMITS.lessons, t('wzLessons'))}
        ${num(`s${i}.minutes`, s.minutes, LIMITS.minutes, t('wzMinutesPerLesson'))}
        ${num(`s${i}.quiz`, s.quiz, LIMITS.quiz, t('wzQuizQuestions'))}
        <label class="lh-field"><span class="lh-field__label">${esc(t('wzPractice'))}</span>
          ${sel(`s${i}.practice`, s.practice, PRACTICE_MODES.map(m => [m, t(`practiceMode_${m}`)]))}</label>
        ${s.practice !== 'none' ? num(`s${i}.practiceMinutes`, s.practiceMinutes, LIMITS.practiceMinutes, t('wzPracticeMinutes')) : '<span></span>'}
      </div>
      <p class="lh-card__meta">${esc(t('wzSectionLine', { lessons: s.lessons, min: s.lessons * s.minutes }))}${s.quiz ? ` · ${esc(t('wzQuizLine', { n: s.quiz }))}` : ` · ${esc(t('wzNoQuiz'))}`}${s.practice !== 'none' ? ` · ${esc(t('wzPracticeLine', { mode: t(`practiceMode_${s.practice}`), n: s.practiceMinutes }))}` : ''}</p>
    </div>`;

  const stepShape = () => `
    <label class="lh-field"><span class="lh-field__label">${esc(t('wzTitle'))}</span>
      <input class="lh-input" name="title" maxlength="120" value="${esc(w.title)}" placeholder="${esc(t('wzTitlePh'))}"></label>
    <label class="lh-field"><span class="lh-field__label">${esc(t('wzGoal'))}</span>
      <textarea class="lh-input" name="goal" rows="4" maxlength="2000" placeholder="${esc(t('wzGoalPh'))}">${esc(w.goal)}</textarea></label>
    <div class="lh-field"><span class="lh-field__label lh-muted">${esc(t('briefExamples'))}</span>
      <div class="lh-ideas">${[1, 2, 3].map(n => `<button type="button" class="lh-idea" data-goal="${n}">${esc(t(`example${n}`))}</button>`).join('')}</div></div>
    <div class="lh-wz-shape">
      <div class="lh-row"><h3 class="lh-edit-sub" style="margin:0">${esc(t('wzShape'))}</h3><span class="lh-spacer"></span>
        <span class="lh-muted">${esc(t('wzStartFrom'))}</span>${Object.keys(PRESETS).map(k => `<button type="button" class="lh-idea" data-preset="${k}">${esc(t(`preset_${k}`))}</button>`).join('')}</div>
      <p class="lh-card__meta">${esc(t('wzShapeLead'))}</p>
      ${w.sections.map(sectionRow).join('')}
      ${w.sections.length < LIMITS.sections[1] ? `<button type="button" class="zn-button zn-button--ghost zn-button--small" data-add-section>+ ${esc(t('wzAddSection'))}</button>` : ''}
      <p class="lh-wz-totals" data-totals>${esc(totalsLine())}</p>
    </div>`;

  const materialRow = m => `
    <label class="lh-option lh-wz-material">
      <input type="checkbox" name="material" value="${esc(m.id)}" ${w.materials.includes(m.id) ? 'checked' : ''}>
      <span class="lh-wz-material__body">
        <span class="lh-row"><strong>${esc(L(m.title))}</strong>${m.status === 'pending' ? chip('changes_requested', t('matPending')) : chip('approved', t('matApproved'))}</span>
        ${m.summary ? `<span class="lh-card__meta">${esc(L(m.summary))}</span>` : ''}
        <span class="lh-card__meta">${esc(m.kind === 'builtin' ? t('matBuiltin') : t('matUploaded', { date: fmtDate(m.at), file: m.fileName || '' }))}</span>
      </span>
    </label>`;

  const stepMaterials = () => `
    <p class="lh-card__meta">${esc(t('wzMaterialsLead'))}</p>
    <fieldset class="lh-sources"><legend class="lh-field__label">${esc(t('wzLibrary', { n: library.length }))}</legend>
      ${library.map(materialRow).join('')}</fieldset>
    <label class="lh-option lh-wz-upload"><input type="checkbox" name="willUpload" ${w.willUpload ? 'checked' : ''}>
      <span><strong>${esc(t('wzWillUpload'))}</strong><br><span class="lh-card__meta">${esc(t('wzWillUploadHint'))}</span></span></label>`;

  const videoRow = (v, i) => `
    <div class="lh-wz-video" data-video="${i}">
      <label class="lh-field"><span class="lh-field__label">${esc(t('wzVideoTopic', { n: i + 1 }))}</span>
        <input class="lh-input" name="v${i}.topic" maxlength="200" value="${esc(v.topic)}" placeholder="${esc(t('wzVideoTopicPh'))}"></label>
      <label class="lh-field lh-field--narrow"><span class="lh-field__label">${esc(t('wzVideoWhere'))}</span>
        ${sel(`v${i}.section`, String(v.section), [['0', t('wzVideoAuto')], ...w.sections.map((_, k) => [String(k + 1), t('sectionN', { n: k + 1 })])])}</label>
      <button type="button" class="lh-link lh-link--danger" data-remove-video="${i}">${esc(t('remove'))}</button>
    </div>`;

  const stepVideos = () => `
    <p class="lh-card__meta">${esc(t('wzVideosLead'))}</p>
    <div class="lh-wz-choice" role="radiogroup" aria-label="${esc(t('wzVideosQ'))}">
      <label class="lh-option"><input type="radio" name="hasVideos" value="no" ${w.videos.length ? '' : 'checked'}><span>${esc(t('wzVideosNo'))}</span></label>
      <label class="lh-option"><input type="radio" name="hasVideos" value="yes" ${w.videos.length ? 'checked' : ''}><span>${esc(t('wzVideosYes'))}</span></label>
    </div>
    ${w.videos.length ? `<div class="lh-wz-videos">${w.videos.map(videoRow).join('')}</div>
      <p class="lh-card__meta">${esc(t('wzVideosCount', { n: w.videos.length }))}</p>
      ${w.videos.length < LIMITS.videos[1] ? `<button type="button" class="zn-button zn-button--ghost zn-button--small" data-add-video>+ ${esc(t('wzAddVideo'))}</button>` : ''}` : ''}`;

  const summaryCard = (k, body) => `
    <section class="lh-wz-sum">
      <div class="lh-row"><p class="lh-kicker" style="margin:0">${esc(t(`wzStep_${k}`))}</p><span class="lh-spacer"></span>
        <button type="button" class="lh-link" data-goto="${STEPS.indexOf(k)}">${esc(t('edit'))}</button></div>
      ${body}
    </section>`;

  const stepReview = () => {
    const chosen = library.filter(m => w.materials.includes(m.id));
    return `
      <p class="lh-card__meta">${esc(t(editing ? 'wzReviewLeadEdit' : 'wzReviewLead'))}</p>
      ${summaryCard('audience', `<p><strong>${esc(audienceText(w.audience, getLang()))}</strong></p>${w.audience.notes ? `<p class="lh-card__meta">${esc(w.audience.notes)}</p>` : ''}`)}
      ${summaryCard('shape', `<p><strong>${esc(w.title)}</strong></p><p>${esc(w.goal)}</p>
        <ol class="lh-wz-sumlist">${w.sections.map((s, i) => `<li>${esc(t('sectionN', { n: i + 1 }))}: ${esc(t('wzSectionLine', { lessons: s.lessons, min: s.lessons * s.minutes }))} · ${esc(s.quiz ? t('wzQuizLine', { n: s.quiz }) : t('wzNoQuiz'))}${s.practice !== 'none' ? ` · ${esc(t('wzPracticeLine', { mode: t(`practiceMode_${s.practice}`), n: s.practiceMinutes }))}` : ''}</li>`).join('')}</ol>
        <p class="lh-wz-totals">${esc(totalsLine())}</p>`)}
      ${summaryCard('materials', `<ul class="lh-wz-sumlist">${chosen.map(m => `<li>${esc(L(m.title))}${m.status === 'pending' ? ` · ${esc(t('matPending'))}` : ''}</li>`).join('') || `<li>${esc(t('wzNoMaterials'))}</li>`}</ul>
        ${w.willUpload ? `<p class="lh-card__meta">${esc(t('wzWillUpload'))}</p>` : ''}`)}
      ${summaryCard('videos', w.videos.length ? `<ul class="lh-wz-sumlist">${w.videos.map(v => `<li>${esc(v.topic)} · ${esc(v.section ? t('sectionN', { n: v.section }) : t('wzVideoAuto'))}</li>`).join('')}</ul>` : `<p>${esc(t('wzVideosNo'))}</p>`)}`;
  };

  const BODIES = { audience: stepAudience, shape: stepShape, materials: stepMaterials, videos: stepVideos, review: stepReview };

  // ------------------------------ Paint ------------------------------
  const paint = () => {
    const key = STEPS[step];
    el.innerHTML = `
      <a class="zn-back" href="${editing ? `#/studio/${esc(project.id)}` : '#/'}"><span aria-hidden="true">←</span> ${esc(t(editing ? 'backToStudio' : 'back'))}</a>
      <header class="lh-hero">
        <p class="lh-kicker">${esc(t(editing ? 'wzKickerEdit' : 'wzKicker'))}</p>
        <h1 class="lh-hero__title">${esc(editing ? project.studio.spec.title : t('wzTitleNew'))}</h1>
        <p class="lh-hero__lead">${esc(t(editing ? 'wzLeadEdit' : 'wzLead'))}</p>
      </header>
      <ol class="lh-steps" aria-label="${esc(t('wzProgress'))}">
        ${STEPS.map((k, i) => `<li class="lh-steps__item ${i === step ? 'is-current' : i < step ? 'is-done' : ''}" ${i === step ? 'aria-current="step"' : ''}>
          <button type="button" class="lh-steps__btn" data-goto="${i}" ${i > furthest ? 'disabled' : ''}><span class="lh-steps__n">${i < step ? '✓' : i + 1}</span><span class="lh-steps__label">${esc(t(`wzStep_${k}`))}</span></button></li>`).join('')}
      </ol>
      <form class="zn-card lh-card lh-form lh-wizard" data-wizard novalidate>
        <div class="lh-row"><h2 class="lh-card__title" style="margin:0">${esc(t(`wzStep_${key}`))}</h2><span class="lh-spacer"></span>
          ${key !== 'review' ? `<button type="button" class="lh-link" data-example>${esc(t('wzFillExample'))}</button>` : ''}</div>
        ${BODIES[key]()}
        <div data-error>${error ? errorBox(error) : ''}</div>
      </form>
      <div class="lh-actionbar lh-wizard__nav">
        ${step > 0 ? `<button type="button" class="zn-button zn-button--ghost" data-prev>${esc(t('wzBack'))}</button>` : ''}
        <span class="lh-spacer"></span>
        <span class="lh-card__meta">${esc(t('wzStepOf', { n: step + 1, total: STEPS.length }))}</span>
        ${key === 'review'
          ? `<button type="button" class="zn-button" data-create>${esc(t(editing ? 'wzSave' : 'wzCreate'))}</button>`
          : `<button type="button" class="zn-button" data-next>${esc(t(step === STEPS.length - 2 ? 'wzReview' : 'wzNext'))}</button>`}
      </div>`;
    error = null;
    wire();
  };

  // ------------------------------ Read the form into w ------------------------------
  const form = () => el.querySelector('[data-wizard]');
  const read = () => {
    const f = form(); if (!f) return;
    const v = name => f.elements[name]?.value;
    const key = STEPS[step];
    if (key === 'audience') {
      Object.assign(w.audience, { role: v('role'), roleOther: v('roleOther') || '', experience: v('experience'), experienceOther: v('experienceOther') || '', notes: v('notes') || '' });
    } else if (key === 'shape') {
      w.title = v('title') || ''; w.goal = v('goal') || '';
      const clampN = (x, [lo, hi], d) => { const n = Math.round(Number(x)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
      w.sections = w.sections.map((s, i) => ({
        lessons: clampN(v(`s${i}.lessons`), LIMITS.lessons, s.lessons), minutes: clampN(v(`s${i}.minutes`), LIMITS.minutes, s.minutes),
        quiz: clampN(v(`s${i}.quiz`), LIMITS.quiz, s.quiz), practice: v(`s${i}.practice`) || s.practice,
        practiceMinutes: clampN(v(`s${i}.practiceMinutes`) ?? s.practiceMinutes, LIMITS.practiceMinutes, s.practiceMinutes),
      }));
    } else if (key === 'materials') {
      w.materials = [...f.querySelectorAll('input[name="material"]:checked')].map(x => x.value);
      w.willUpload = f.elements.willUpload.checked;
    } else if (key === 'videos') {
      w.videos = w.videos.map((x, i) => ({ topic: v(`v${i}.topic`) ?? x.topic, section: Number(v(`v${i}.section`) ?? x.section) || 0 }));
    }
    persist();
  };

  const problem = () => {
    const key = STEPS[step];
    if (key === 'audience') {
      if (w.audience.role === 'other' && !w.audience.roleOther.trim()) return ['roleOther', t('wzErrRole')];
      if (w.audience.experience === 'other' && !w.audience.experienceOther.trim()) return ['experienceOther', t('wzErrExperience')];
    }
    if (key === 'shape') {
      if (w.title.trim().length < 3) return ['title', t('wzErrTitle')];
      if (w.goal.trim().length < 10) return ['goal', t('wzErrGoal')];
    }
    if (key === 'materials' && !w.materials.length && !w.willUpload) return ['material', t('wzErrMaterials')];
    if (key === 'videos') { const i = w.videos.findIndex(v => v.topic.trim().length < 3); if (i >= 0) return [`v${i}.topic`, t('wzErrVideo')]; }
    return null;
  };

  const go = to => { read(); step = to; furthest = Math.max(furthest, to); persist(); paint(); window.scrollTo({ top: 0 }); };
  const showProblem = ([name, msg]) => {
    el.querySelector('[data-error]').innerHTML = `<p class="lh-error">${esc(msg)}</p>`;
    form().elements[name]?.focus?.() || form().querySelector(`[name="${name}"]`)?.focus();
  };

  const EXAMPLE = {
    audience: () => Object.assign(w.audience, { role: 'derm_reps', roleOther: '', experience: 'derm', experienceOther: '', notes: t('wzExAudienceNotes') }),
    shape: () => { w.title = t('wzExTitle'); w.goal = t('wzExGoal'); w.sections = clone(PRESETS.standard); },
    materials: () => { w.materials = library.filter(m => m.kind === 'builtin').map(m => m.id); w.willUpload = false; },
    videos: () => { w.videos = [{ topic: t('wzExVideo'), section: 1 }]; },
  };

  function wire() {
    const f = form();
    f.addEventListener('submit', e => e.preventDefault());
    el.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => {
      const to = Number(b.dataset.goto);
      if (to > step) { read(); const p = problem(); if (p) return showProblem(p); }
      go(to);
    }));
    el.querySelector('[data-prev]')?.addEventListener('click', () => go(step - 1));
    el.querySelector('[data-next]')?.addEventListener('click', () => { read(); const p = problem(); if (p) return showProblem(p); go(step + 1); });
    el.querySelector('[data-example]')?.addEventListener('click', () => { read(); EXAMPLE[STEPS[step]](); persist(); paint(); });
    // Audience: the free-text fields appear with "Other".
    f.elements.role?.addEventListener('change', () => { read(); paint(); });
    f.elements.experience?.addEventListener('change', () => { read(); paint(); });
    // Shape: live totals; structural changes repaint.
    f.querySelectorAll('[data-goal]').forEach(b => b.addEventListener('click', () => { f.elements.goal.value = t(`example${b.dataset.goal}`); f.elements.goal.focus(); }));
    f.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => { read(); w.sections = clone(PRESETS[b.dataset.preset]); persist(); paint(); }));
    f.querySelector('[data-add-section]')?.addEventListener('click', () => { read(); w.sections.push({ ...w.sections.at(-1) }); persist(); paint(); });
    f.querySelectorAll('[data-remove-section]').forEach(b => b.addEventListener('click', () => {
      read(); const i = Number(b.dataset.removeSection); w.sections.splice(i, 1);
      w.videos.forEach(v => { if (v.section > w.sections.length) v.section = 0; });
      persist(); paint();
    }));
    if (STEPS[step] === 'shape') {
      f.addEventListener('change', e => { if (/^s\d+\.practice$/.test(e.target.name)) { read(); paint(); } });
      f.addEventListener('input', () => { read(); const x = el.querySelector('[data-totals]'); if (x) x.textContent = totalsLine(); });
    }
    // Videos.
    f.querySelectorAll('input[name="hasVideos"]').forEach(r => r.addEventListener('change', () => {
      read(); w.videos = r.value === 'yes' ? (w.videos.length ? w.videos : [{ topic: '', section: 0 }]) : []; persist(); paint();
    }));
    f.querySelector('[data-add-video]')?.addEventListener('click', () => { read(); w.videos.push({ topic: '', section: 0 }); persist(); paint(); });
    f.querySelectorAll('[data-remove-video]').forEach(b => b.addEventListener('click', () => { read(); w.videos.splice(Number(b.dataset.removeVideo), 1); persist(); paint(); }));
    if (['audience', 'materials'].includes(STEPS[step])) f.addEventListener('change', read);

    // Create / save.
    el.querySelector('[data-create]')?.addEventListener('click', async e => {
      const btn = e.currentTarget;
      btn.disabled = true; btn.textContent = t(editing ? 'saving' : 'wzCreating');
      try {
        if (editing) {
          await api(`/api/projects/${project.id}/spec`, { method: 'PUT', body: { spec: w } });
          location.hash = `#/studio/${project.id}`;
        } else {
          const mod = await api('/api/projects', { method: 'POST', body: { spec: w, lang: getLang() } });
          forget();
          location.hash = `#/studio/${mod.id}`;
        }
      } catch (err) {
        btn.disabled = false; btn.textContent = t(editing ? 'wzSave' : 'wzCreate');
        el.querySelector('[data-error]').innerHTML = errorBox(err);
      }
    });
  }

  paint();
}
