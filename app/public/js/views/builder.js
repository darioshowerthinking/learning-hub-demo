// Content creator: the live storyboard and the module editor.
//  storyboard()  -> shown while lessons are written (studio generation) or revised (AI revision)
//  #/edit/:id    -> editor (draft / changes requested) or read-only view (in review, approved, live).
//                   For a studio project in design it is the "Lessons and quizzes" card (#/studio/:id/content).
// New modules start in the wizard (views/wizard.js) and the studio (views/studio.js).
// The creator edits in the module's source language; the other language is translated by the server.
import { api, streamNdjson } from '../api.js';
import { t, L } from '../i18n.js';
import { esc, chip, statusChip, reviewChip, errorBox, targetLabel } from '../ui.js';
import { parsePartial } from '../partial-json.js';
import { renderBlocks, lessonBlocks, wireBlocks } from '../blocks.js';
import { VISUAL_IDS, CHART_IDS } from '../visuals.js';
import { cardInfo, isOpenComment, commentCard } from '../studio-rules.js';
import { cardCommentsPanel, cardComments, wireCreatorComments, selectInFields } from './creator-comments.js';
import { paintAnchors, revealPin } from '../comments-ui.js';
import { reveal } from '../anchor.js';

const PILLARS = ['product', 'messaging', 'objections'];
const TEAMS = ['training', 'sales', 'marketing', 'mlr'];
const other = lang => (lang === 'en' ? 'es' : 'en');
const editable = mod => ['draft', 'changes_requested'].includes(mod.status);

// ================================ Live storyboard ================================
// Draft: the outline streams first, then every lesson and quiz streams in parallel into its own card.
// Revise: starts from the current module; the planned lessons/quizzes are replaced as they stream.
// Studio: starts from the agreed outline (plain strings); every lesson and quiz streams into its card.
export function storyboard(el, meta, { titleKey, base = null, outline = null }) {
  const lang = base?.sourceLang || 'en';
  const src = f => (typeof f === 'string' ? f : (f && (f[lang] || f.en || f.es)) || '');
  const raw = { outline: '', lesson: {}, quiz: {} };
  const dirty = { outline: true, lesson: new Set(), quiz: new Set() };
  let plan = null, frame = false;
  const persona = id => meta.personas.find(p => p.id === id);

  // The outline as shown: streamed (draft or outline revision) or the current module (revise).
  const fromBase = () => ({
    title: src(base.title), objective: src(base.objective),
    sections: base.sections.map(s => ({ id: s.id, title: src(s.title), boss: { persona: s.boss.persona, brief: src(s.boss.brief) },
      lessons: s.lessons.map(l => ({ id: l.id, title: src(l.title), pillar: l.pillar, minutes: l.minutes, focus: src(l.summary) })) })),
  });
  const fromStream = o => {
    let n = 0;
    return { title: o.title, objective: o.objective,
      sections: (o.sections || []).map((s, i) => ({ id: `s${i + 1}`, title: s.title, boss: s.boss,
        lessons: (s.lessons || []).map(l => ({ id: `l${++n}`, title: l.title, pillar: l.pillar, minutes: l.minutes, focus: l.focus })) })) };
  };
  const fromOutline = () => ({ title: outline.title, objective: outline.objective,
    sections: outline.sections.map(s => ({ id: s.id, title: s.title, boss: null,
      lessons: s.lessons.map(l => ({ id: l.id, title: l.title, pillar: l.pillar, minutes: l.minutes, focus: (l.points || []).join(' · ') })) })) });
  const outlineNow = () => {
    const o = raw.outline ? parsePartial(raw.outline) : null;
    if (!base) return o ? fromStream(o) : outline ? fromOutline() : { sections: [] };
    const b = fromBase();
    if (!o) return b;
    const s = fromStream(o);   // outline revision: same sections and lessons, new titles/briefs
    return { ...b, title: s.title || b.title, objective: s.objective || b.objective,
      sections: b.sections.map((sec, i) => ({ ...sec, title: s.sections[i]?.title || sec.title, boss: s.sections[i]?.boss?.persona ? s.sections[i].boss : sec.boss })) };
  };

  el.innerHTML = `
    <header class="lh-hero">
      <p class="lh-kicker"><span class="lh-spinner lh-spinner--inline" aria-hidden="true"></span> <span data-sb-status>${esc(t(titleKey))}</span></p>
      <h1 class="lh-hero__title" data-sb-title>&nbsp;</h1>
      <p class="lh-hero__lead" data-sb-objective></p>
      <p class="lh-card__meta">${esc(t('groundedNote'))}</p>
    </header>
    <div class="lh-path" data-sb-sections></div>`;
  const $ = sel => el.querySelector(sel);

  const lessonState = id => (raw.lesson[id] ? 'writing' : plan?.lessons.includes(id) ? 'queued' : base ? 'kept' : 'queued');
  const paintShell = o => {
    $('[data-sb-title]').textContent = o.title || ' ';
    $('[data-sb-objective]').textContent = o.objective || '';
    $('[data-sb-sections]').innerHTML = o.sections.map((s, i) => `
      <section class="zn-card lh-card lh-section-card lh-sb">
        <p class="lh-kicker">${esc(t('sectionN', { n: i + 1 }))}</p>
        <h2 class="lh-card__title">${esc(s.title || '')}</h2>
        <div class="lh-sb__lessons">${s.lessons.map(l => `
          <div class="lh-sb__lesson" data-sb-card="${esc(l.id)}">
            <div class="lh-row">${PILLARS.includes(l.pillar) ? chip('pending', t(`pillar_${l.pillar}`)) : ''}${l.minutes ? `<span class="lh-muted">${esc(t('readTime', { n: l.minutes }))}</span>` : ''}<span class="lh-sb__state" data-sb-state="${esc(l.id)}"></span></div>
            <strong class="lh-sb__title">${esc(l.title || '')}</strong>
            ${l.focus ? `<p class="lh-sb__focus">${esc(l.focus)}</p>` : ''}
            <div class="lh-sb__live" data-sb-lesson="${esc(l.id)}"></div>
          </div>`).join('')}</div>
        <div class="lh-sb__quiz" data-sb-quiz="${esc(s.id)}"></div>
        ${s.boss?.persona && persona(s.boss.persona) ? `<div class="lh-boss lh-boss--ready"><div class="lh-boss__text">
          <p class="lh-kicker">${esc(t('finalChallenge'))}</p><strong>${esc(persona(s.boss.persona).name)}</strong>
          <p class="lh-card__meta">${esc(src(s.boss.brief))}</p></div></div>` : ''}
      </section>`).join('');
    for (const s of o.sections) {
      for (const l of s.lessons) dirty.lesson.add(l.id);
      dirty.quiz.add(s.id);
    }
  };

  const paint = () => {
    frame = false;
    if (!$('[data-sb-sections]')) return;   // the editor has already replaced the storyboard
    if (dirty.outline) { dirty.outline = false; paintShell(outlineNow()); }
    for (const id of dirty.lesson) {
      const box = $(`[data-sb-lesson="${CSS.escape(id)}"]`), state = $(`[data-sb-state="${CSS.escape(id)}"]`);
      if (!box) continue;
      const st = lessonState(id);
      if (state) state.innerHTML = st === 'writing' ? '' : st === 'queued' ? `<span class="lh-typing">${esc(t(base ? 'rewritingLesson' : 'writingLesson'))}</span>` : '';
      let blocks = null;
      if (raw.lesson[id]) blocks = parsePartial(raw.lesson[id])?.blocks;
      else if (base) blocks = lessonBlocks(base.sections.flatMap(s => s.lessons).find(l => l.id === id) || {});
      box.innerHTML = blocks ? renderBlocks(blocks, `sb-${id}`) : '';
      box.classList.toggle('lh-sb__live--active', st === 'writing');
      if (st === 'writing') box.scrollTop = box.scrollHeight;
    }
    dirty.lesson.clear();
    for (const sid of dirty.quiz) {
      const box = $(`[data-sb-quiz="${CSS.escape(sid)}"]`);
      if (!box) continue;
      const qs = raw.quiz[sid] ? parsePartial(raw.quiz[sid])?.questions
        : base ? base.sections.find(s => s.id === sid)?.quiz.map(q => ({ q: src(q.q) })) : null;
      box.innerHTML = qs?.length ? `<p class="lh-kicker">${esc(t('quizTitle'))}</p><ol>${qs.map(q => `<li>${esc(q?.q || '')}</li>`).join('')}</ol>` : '';
    }
    dirty.quiz.clear();
  };
  const schedule = () => { if (!frame) { frame = true; requestAnimationFrame(paint); } };
  schedule();

  return ev => {
    if (ev.kind === 'outline') { raw.outline += ev.text; dirty.outline = true; }
    else if (ev.kind === 'lesson') {
      if (!raw.lesson[ev.key] && !base) $('[data-sb-status]').textContent = t('outlineReady');
      raw.lesson[ev.key] = (raw.lesson[ev.key] || '') + ev.text; dirty.lesson.add(ev.key);
    }
    else if (ev.kind === 'quiz') { raw.quiz[ev.key] = (raw.quiz[ev.key] || '') + ev.text; dirty.quiz.add(ev.key); }
    else if (ev.kind === 'plan') { plan = ev; (ev.lessons || []).forEach(id => dirty.lesson.add(id)); }
    schedule();
  };
}

// ================================ #/edit/:id: the editor ================================
export async function renderEditor(el, user, moduleId) {
  const [mod, meta, users] = await Promise.all([api(`/api/modules/${moduleId}`), api('/api/meta'), api('/api/users')]);
  const lang = mod.sourceLang || 'en';
  const src = f => (typeof f === 'string' ? f : (f && (f[lang] || f.en || f.es)) || '');
  const canEdit = editable(mod);
  const dis = canEdit ? '' : 'disabled';
  // A studio project in design (or sent back by the reviewers): this editor is its "Lessons and quizzes" card;
  // submission happens in "Preview and submit".
  const inStudio = !!mod.studio && editable(mod);
  const content = inStudio ? cardInfo(mod, 'content') : null;
  const contentStored = inStudio ? mod.studio.cards.content?.state : null;

  // Reviewer comments for this card (latest round), keyed by lesson for the badges.
  const comments = inStudio ? cardComments(mod, 'content') : [];
  const commentedLessons = new Set(comments.filter(isOpenComment).map(c => c.target));
  const sourceTitle = id => L(meta.product.sources.find(s => s.id === id)?.title) || id;

  // --- Field helpers (data-k = path used by collect) ---
  const input = (k, label, value, cls = '') => `<label class="lh-field ${cls}"><span class="lh-field__label">${esc(label)}</span>
      <input class="lh-input" data-k="${esc(k)}" value="${esc(value)}" ${dis}></label>`;
  const area = (k, label, value, rows = 3, cls = '') => `<label class="lh-field ${cls}"><span class="lh-field__label">${esc(label)}</span>
      <textarea class="lh-input" data-k="${esc(k)}" rows="${rows}" ${dis}>${esc(value)}</textarea></label>`;
  const select = (k, label, value, options, cls = '') => `<label class="lh-field ${cls}"><span class="lh-field__label">${esc(label)}</span>
      <select class="lh-input" data-k="${esc(k)}" ${dis}>${options.map(([v, text]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select></label>`;
  const radio = (name, k, checked) => `<label class="lh-correct" title="${esc(t('correctAnswer'))}"><input type="radio" name="${esc(name)}" value="${k}" ${checked ? 'checked' : ''} ${dis}><span class="lh-visually-hidden">${esc(t('correctAnswer'))}</span></label>`;

  // One block's edit fields, by type.
  const blockFields = (b, p) => {
    switch (b.type) {
      case 'text': return input(`${p}.heading`, t('fHeading'), src(b.heading)) + area(`${p}.body`, t('fBody'), src(b.body), 7);
      case 'why': return area(`${p}.body`, t('fBody'), src(b.body), 4);
      case 'callout': return select(`${p}.tone`, t('fTone'), b.tone, [['tip', t('toneTip')], ['compliance', t('toneCompliance')]]) + area(`${p}.body`, t('fBody'), src(b.body), 3);
      case 'keypoints': return input(`${p}.heading`, t('fHeading'), src(b.heading)) +
        `<div class="lh-edit-list">${(b.items || []).map((it, j) => `<input class="lh-input" data-k="${esc(`${p}.items.${j}`)}" value="${esc(src(it))}" ${dis} aria-label="${esc(t('fItems'))} ${j + 1}">`).join('')}</div>`;
      case 'example': return input(`${p}.title`, t('fTitle'), src(b.title)) + area(`${p}.context`, t('fContext'), src(b.context), 2) +
        `<div class="lh-edit-list">${(b.lines || []).map((ln, j) => `<div class="lh-edit-line">
          <select class="lh-input" data-k="${esc(`${p}.lines.${j}.who`)}" ${dis}><option value="rep" ${ln.who === 'rep' ? 'selected' : ''}>${esc(t('whoRep'))}</option><option value="hcp" ${ln.who === 'hcp' ? 'selected' : ''}>${esc(t('whoHcp'))}</option></select>
          <textarea class="lh-input" rows="2" data-k="${esc(`${p}.lines.${j}.text`)}" ${dis}>${esc(src(ln.text))}</textarea></div>`).join('')}</div>` +
        area(`${p}.debrief`, t('fDebrief'), src(b.debrief), 4);
      case 'dodont': return (b.items || []).map((it, j) => `<div class="lh-edit-pair">
          ${area(`${p}.items.${j}.say`, t('fSay'), src(it.say), 2)}${area(`${p}.items.${j}.avoid`, t('fAvoid'), src(it.avoid), 2)}
          ${area(`${p}.items.${j}.why`, t('fWhy'), src(it.why), 2, 'lh-edit-pair__why')}</div>`).join('');
      case 'visual': return select(`${p}.visual`, t('fFigure'), b.visual, VISUAL_IDS.map(id => [id, t(`visual_${id}`)])) + area(`${p}.caption`, t('fCaption'), src(b.caption), 2);
      case 'chart': return select(`${p}.chart`, t('fFigure'), b.chart, CHART_IDS.map(id => [id, t(`chart_${id}`)])) + area(`${p}.caption`, t('fCaption'), src(b.caption), 2);
      case 'video': return `<p class="lh-card__meta">${esc(src(b.title))} · ${esc(t('ctVideoInVideos'))}</p>`;
      case 'check': return input(`${p}.q`, t('fQuestion'), src(b.q)) +
        `<div class="lh-edit-options">${(b.options || []).map((o, k) => `<div class="lh-edit-option">${radio(`${p}.answer`, k, k === b.answer)}
          <input class="lh-input" data-k="${esc(`${p}.options.${k}`)}" value="${esc(src(o))}" ${dis}></div>`).join('')}</div>` +
        area(`${p}.explanation`, t('fExplanation'), src(b.explanation), 3);
      default: return '';
    }
  };

  const lessonHtml = (s, l, i) => {
    const blocks = l.blocks || null;
    return `<details class="lh-edit-lesson ${commentedLessons.has(l.id) ? 'lh-edit-block--flag' : ''}" data-lesson-id="${esc(l.id)}">
      <summary>
        <span class="lh-kicker">${esc(t('lessonLabel', { n: i + 1 }))}</span>
        <strong class="lh-edit-lesson__title">${esc(src(l.title))}</strong>
        <span class="lh-row">${chip('pending', t(`pillar_${l.pillar}`))}<span class="lh-muted">${esc(t('readTime', { n: l.minutes }))}</span>${commentedLessons.has(l.id) ? chip('changes_requested', t('hasComment')) : ''}</span>
      </summary>
      <div class="lh-edit-lesson__body">
        ${canEdit ? `<div class="lh-tabs" role="tablist">
          <button type="button" class="lh-tab" aria-selected="true" data-tab="preview">${esc(t('preview'))}</button>
          <button type="button" class="lh-tab" aria-selected="false" data-tab="edit">${esc(t('edit'))}</button></div>` : ''}
        <div class="lh-blocks lh-edit-preview" data-pane="preview">${L(l.summary) ? `<p class="lh-hero__lead">${esc(src(l.summary))}</p>` : ''}${renderBlocks(lessonBlocks(l), `ed-${l.id}`)}</div>
        <div class="lh-edit-fields" data-pane="edit" hidden>
          ${input(`${s.id}.${l.id}.title`, t('lessonTitleLabel'), src(l.title))}
          <div class="lh-form__row">
            ${select(`${s.id}.${l.id}.pillar`, t('pillarLabel'), l.pillar, PILLARS.map(p => [p, t(`pillar_${p}`)]))}
            <label class="lh-field lh-field--narrow"><span class="lh-field__label">${esc(t('minutesLabel'))}</span>
              <input class="lh-input" type="number" min="1" max="30" data-k="${s.id}.${l.id}.minutes" value="${l.minutes}" ${dis}></label>
          </div>
          ${l.summary ? area(`${s.id}.${l.id}.summary`, t('fSummary'), src(l.summary), 2) : ''}
          ${blocks ? blocks.map((b, j) => `<div class="lh-edit-blockfields"><p class="lh-kicker">${esc(t(`blockType_${b.type}`))}</p>${blockFields(b, `${s.id}.${l.id}.b${j}`)}</div>`).join('')
                   : area(`${s.id}.${l.id}.body`, t('lessonBodyLabel'), src(l.body), 8)}
        </div>
        ${l.sources?.length ? `<p class="lh-card__meta">${esc(t('sourcesUsed'))}: ${l.sources.map(id => `<span class="lh-source">${esc(sourceTitle(id))}</span>`).join(' ')}</p>` : ''}
      </div>
    </details>`;
  };

  const quizHtml = (s, q, i) => `
    <div class="lh-edit-block">
      ${input(`${s.id}.${q.id}.q`, t('questionLabel', { n: i + 1 }), src(q.q))}
      <div class="lh-edit-options">
        ${q.options.map((o, k) => `<div class="lh-edit-option">${radio(`${s.id}.${q.id}.answer`, k, k === q.answer)}
          <input class="lh-input" data-k="${s.id}.${q.id}.o${k}" value="${esc(src(o))}" ${dis} aria-label="${esc(t('questionLabel', { n: i + 1 }))} · ${k + 1}"></div>`).join('')}
      </div>
    </div>`;

  const bossHtml = s => `
    <div class="lh-edit-block lh-edit-block--boss">
      <p class="lh-kicker">${esc(t('challengeLabel'))}</p>
      <div class="lh-form__row">
        ${select(`${s.id}.boss.persona`, t('personaLabel'), s.boss.persona, meta.personas.map(p => [p.id, `${p.name} · ${L(p.role)}`]))}
        ${select(`${s.id}.boss.objection`, t('objectionLabel'), s.boss.objection || '', [['', t('objectionNone')], ...meta.objections.map(o => [o.id, L(o.text)]), ...(s.boss.objection === 'other' ? [['other', `${t('objectionOther')}: ${src(s.boss.objectionText)}`]] : [])])}
        <label class="lh-field lh-field--narrow"><span class="lh-field__label">${esc(t('visitLengthLabel'))}</span>
          <input class="lh-input" type="number" min="2" max="15" data-k="${s.id}.boss.minutes" value="${s.boss.minutes}" ${dis}></label>
      </div>
      ${area(`${s.id}.boss.brief`, t('briefForRep'), src(s.boss.brief), 2)}
      ${input(`${s.id}.boss.opening`, t('openingLabel'), s.boss.opening ? src(s.boss.opening) : '')}
    </div>`;

  const commentsHtml = inStudio && canEdit ? cardCommentsPanel(mod, 'content', users) : '';

  const reviseHtml = !canEdit ? '' : `
    <section class="zn-card lh-card lh-assistant">
      <h2 class="lh-card__title">${esc(t('reviseTitle'))}</h2>
      <textarea class="lh-input" data-instruction rows="2" maxlength="2000" placeholder="${esc(t('revisePlaceholder'))}"></textarea>
      <div class="lh-ideas">${[1, 2, 3].map(n => `<button type="button" class="lh-idea" data-idea="${n}">${esc(t(`reviseIdea${n}`))}</button>`).join('')}</div>
      <div class="lh-row"><button type="button" class="zn-button zn-button--ghost" data-revise>${esc(t('reviseBtn'))}</button></div>
    </section>`;

  const otherName = t(`lang_${other(lang)}`);
  el.innerHTML = `
    <a class="zn-back" href="${inStudio ? `#/studio/${esc(mod.id)}` : '#/'}"><span aria-hidden="true">←</span> ${esc(t(inStudio ? 'backToStudio' : 'back'))}</a>
    <header class="lh-hero">
      ${inStudio ? `<p class="lh-kicker">${esc(mod.studio.spec.title)} · ${esc(t('studioKicker'))} · ${esc(t('card_content'))}</p>` : ''}
      <div class="lh-row">${inStudio ? chip(content.state === 'complete' ? 'approved' : ['needs_update', 'action_required'].includes(content.state) ? 'changes_requested' : 'in_review', content.state === 'action_required' ? t('cardState_action_required_n', { n: content.open }) : t(`cardState_${content.state}`)) : statusChip(mod.status)}${mod.round ? chip('draft', t('roundN', { n: mod.round })) : ''}<span class="zn-product zn-product--derolad">Derolad®</span></div>
      <h1 class="lh-hero__title">${esc(src(mod.title))}</h1>
      <p class="lh-hero__lead">${esc(src(mod.objective))}</p>
      <div class="lh-teams">${TEAMS.map(team => reviewChip(team, mod.reviews?.[team]?.state || 'pending')).join('')}</div>
    </header>
    ${canEdit ? '' : `<div class="zn-card lh-card lh-locked">${esc(t('lockedNote'))}</div>`}
    ${inStudio && content.state === 'needs_update' ? `<div class="zn-card lh-card lh-st-banner lh-st-banner--warn">
      <p style="margin:0">${esc(t('ctStale'))}</p>
      <div class="lh-row"><button type="button" class="zn-button zn-button--small" data-regenerate>${esc(t('ctRegenerate'))}</button>
        <button type="button" class="zn-button zn-button--ghost zn-button--small" data-content-complete>${esc(t('ctKeep'))}</button></div></div>` : ''}
    ${commentsHtml}
    ${mod.aiNotes && canEdit ? `<section class="zn-card lh-card lh-ainotes"><p class="lh-kicker">${esc(t('aiNotesTitle'))}</p><p>${esc(src(mod.aiNotes))}</p></section>` : ''}
    ${reviseHtml}
    <form class="lh-editor" data-editor>
      <section class="zn-card lh-card lh-section-card">
        <p class="lh-kicker">${esc(t('moduleDetails'))}</p>
        ${input('title', t('titleLabel'), src(mod.title))}
        ${input('audience', t('audienceLabel'), src(mod.audience))}
        ${area('objective', t('objectiveLabel'), src(mod.objective), 2)}
      </section>
      ${mod.sections.map((s, i) => `
        <section class="zn-card lh-card lh-section-card">
          <p class="lh-kicker">${esc(t('sectionN', { n: i + 1 }))}</p>
          ${input(`${s.id}.title`, t('sectionTitleLabel'), src(s.title))}
          ${s.lessons.map((l, k) => lessonHtml(s, l, k)).join('')}
          ${s.quiz.length ? `<h3 class="lh-edit-sub" data-quiz="${esc(s.id)}">${esc(t('quizTitle'))}</h3><p class="lh-card__meta">${esc(t('markCorrect'))}</p>${s.quiz.map((q, k) => quizHtml(s, q, k)).join('')}` : ''}
          ${!s.boss ? '' : inStudio ? `<div class="lh-edit-block lh-edit-block--boss"><p class="lh-kicker">${esc(t('challengeLabel'))}</p>
            <p class="lh-card__meta">${esc(src(s.boss.brief))}</p><a class="lh-link" href="#/studio/${esc(mod.id)}/practice">${esc(t('pvEditPractice'))}</a></div>` : bossHtml(s)}
        </section>`).join('')}
    </form>
    ${canEdit ? `<div class="lh-actionbar" role="region" aria-label="${esc(t('editTitle'))}">
      <p class="lh-card__meta" data-translation></p>
      <span class="lh-spacer"></span>
      <span class="lh-card__meta" data-save-state aria-live="polite"></span>
      <button type="button" class="zn-button zn-button--ghost" data-save disabled>${esc(t('saveChanges'))}</button>
      ${!inStudio ? `<button type="button" class="zn-button" data-submit>${esc(t(mod.status === 'changes_requested' ? 'resubmit' : 'submitForApproval'))}</button>`
        : content.state === 'complete' || (content.state === 'action_required' && contentStored === 'complete') ? `<a class="zn-button" href="#/studio/${esc(mod.id)}/preview">${esc(t('ctToPreview'))}</a>`
        : content.state === 'needs_update' ? '' : `<button type="button" class="zn-button" data-content-complete>${esc(t('ctComplete'))}</button>`}
    </div>` : ''}
    <div data-error></div>`;
  wireBlocks(el);
  if (!canEdit) return;

  const form = el.querySelector('[data-editor]');
  const val = k => form.querySelector(`[data-k="${CSS.escape(k)}"]`)?.value ?? '';
  const checked = (name, dflt) => Number(form.querySelector(`input[name="${CSS.escape(name)}"]:checked`)?.value ?? dflt);

  // --- Collect: the module in the source language, same structure as stored ---
  const collectBlock = (b, p) => {
    switch (b.type) {
      case 'text': return { type: b.type, heading: val(`${p}.heading`), body: val(`${p}.body`) };
      case 'why': return { type: b.type, body: val(`${p}.body`) };
      case 'callout': return { type: b.type, tone: val(`${p}.tone`), body: val(`${p}.body`) };
      case 'keypoints': return { type: b.type, heading: val(`${p}.heading`), items: (b.items || []).map((_, j) => val(`${p}.items.${j}`)) };
      case 'example': return { type: b.type, title: val(`${p}.title`), context: val(`${p}.context`), debrief: val(`${p}.debrief`),
        lines: (b.lines || []).map((_, j) => ({ who: val(`${p}.lines.${j}.who`), text: val(`${p}.lines.${j}.text`) })) };
      case 'dodont': return { type: b.type, items: (b.items || []).map((_, j) => ({ say: val(`${p}.items.${j}.say`), avoid: val(`${p}.items.${j}.avoid`), why: val(`${p}.items.${j}.why`) })) };
      case 'visual': return { type: b.type, visual: val(`${p}.visual`), caption: val(`${p}.caption`) };
      case 'chart': return { type: b.type, chart: val(`${p}.chart`), caption: val(`${p}.caption`) };
      case 'check': return { type: b.type, q: val(`${p}.q`), options: (b.options || []).map((_, k) => val(`${p}.options.${k}`)), answer: checked(`${p}.answer`, b.answer), explanation: val(`${p}.explanation`) };
      default: return { type: b.type };
    }
  };
  const collect = () => ({
    title: val('title'), audience: val('audience'), objective: val('objective'),
    sections: mod.sections.map(s => ({
      id: s.id, title: val(`${s.id}.title`),
      lessons: s.lessons.map(l => ({
        id: l.id, title: val(`${s.id}.${l.id}.title`), pillar: val(`${s.id}.${l.id}.pillar`), minutes: Number(val(`${s.id}.${l.id}.minutes`)),
        ...(l.summary ? { summary: val(`${s.id}.${l.id}.summary`) } : {}),
        ...(l.blocks ? { blocks: l.blocks.map((b, j) => collectBlock(b, `${s.id}.${l.id}.b${j}`)) } : { body: val(`${s.id}.${l.id}.body`) }),
      })),
      quiz: s.quiz.map(q => ({ id: q.id, q: val(`${s.id}.${q.id}.q`), options: q.options.map((_, k) => val(`${s.id}.${q.id}.o${k}`)), answer: checked(`${s.id}.${q.id}.answer`, q.answer) })),
      ...(s.boss && !inStudio ? { boss: { persona: val(`${s.id}.boss.persona`), objection: val(`${s.id}.boss.objection`), minutes: Number(val(`${s.id}.boss.minutes`)), brief: val(`${s.id}.boss.brief`), opening: val(`${s.id}.boss.opening`) } } : {}),
    })),
  });

  // --- Preview / Edit tabs per lesson; the preview shows the current (unsaved) text ---
  el.querySelectorAll('.lh-edit-lesson').forEach(det => det.querySelectorAll('[data-tab]').forEach(tab => tab.addEventListener('click', () => {
    const mode = tab.dataset.tab;
    det.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', String(x === tab)));
    det.querySelector('[data-pane="edit"]').hidden = mode !== 'edit';
    const pv = det.querySelector('[data-pane="preview"]');
    pv.hidden = mode !== 'preview';
    if (mode === 'preview') {
      const lessonId = det.querySelector('[data-k$=".title"]').dataset.k.split('.')[1];
      const l = collect().sections.flatMap(s => s.lessons).find(x => x.id === lessonId);
      pv.innerHTML = `${l.summary ? `<p class="lh-hero__lead">${esc(l.summary)}</p>` : ''}${renderBlocks(l.blocks || [{ type: 'text', body: l.body }], `ed-${lessonId}`)}`;
      wireBlocks(pv);
      paintLessonAnchors();
    }
  })));

  // --- Reviewer comments: highlights in each lesson preview, and the panel's actions ---
  let pins = new Map();
  function paintLessonAnchors() {
    if (!comments.length) return;
    el.querySelectorAll('.lh-anno__pin').forEach(p => p.remove());
    el.querySelectorAll('mark.lh-anno').forEach(m => m.replaceWith(...m.childNodes));
    ({ pins } = paintAnchors(target => el.querySelector(`[data-lesson-id="${CSS.escape(target || '')}"] [data-pane="preview"]`), comments,
      { markClass: list => (list.some(isOpenComment) ? 'lh-anno--other' : 'lh-anno--done') }));
  }
  const showComment = c => {
    const det = el.querySelector(`[data-lesson-id="${CSS.escape(c.target || '')}"]`);
    if (det) {
      det.open = true;
      const tab = det.querySelector('[data-tab="preview"]');
      if (tab && tab.getAttribute('aria-selected') !== 'true') tab.click();
      const pinId = [...pins.entries()].find(([, ids]) => ids.includes(c.id))?.[0];
      if (pinId && revealPin(el, pinId)) return;
    }
    if (c.quote && selectInFields(form, c.quote)) return;
    const target = det || (String(c.target || '').startsWith('quiz:') ? el.querySelector(`[data-quiz="${CSS.escape(c.target.slice(5))}"]`) : null);
    if (target) reveal(target, [target]);
  };
  el.addEventListener('click', e => {
    const pin = e.target.closest('.lh-anno__pin');
    if (!pin) return;
    const first = el.querySelector(`[data-cc="${CSS.escape((pins.get(pin.dataset.pin) || [])[0] || '')}"]`);
    if (first) reveal(first, [first]);
  });
  const ccPanel = el.querySelector('[data-cc-panel]');
  if (ccPanel) wireCreatorComments(ccPanel, mod, { onShow: showComment, reload: () => renderEditor(el, user, mod.id), storyboard: () => storyboard(el, meta, { titleKey: 'revising', base: mod }) });
  paintLessonAnchors();

  // --- Translation status (the other language follows the source language) ---
  const trEl = el.querySelector('[data-translation]');
  let translating = null;
  const showTranslation = state => { trEl.textContent = t(`translation_${state}`, { other: otherName }); };
  const translate = () => {
    if (translating) return translating;
    showTranslation('pending');
    translating = api(`/api/builder/${mod.id}/translate`, { method: 'POST' })
      .then(m => { showTranslation(m.translation === 'done' ? 'done' : 'pending'); })
      .catch(() => showTranslation('failed'))
      .finally(() => { translating = null; });
    return translating;
  };
  if (mod.translation === 'pending') translate(); else showTranslation('done');

  // --- Edits ---
  const saveBtn = el.querySelector('[data-save]');
  const saveState = el.querySelector('[data-save-state]');
  let dirty = false;
  // Answering a "check yourself" question in a preview is not an edit.
  const markDirty = e => { if (e.target.closest('[data-pane="preview"]')) return; dirty = true; saveBtn.disabled = false; saveState.textContent = ''; };
  form.addEventListener('input', markDirty);
  form.addEventListener('change', markDirty);
  const save = async () => {
    if (!dirty) return;
    saveBtn.disabled = true; saveState.textContent = t('saving');
    const saved = await api(`/api/modules/${mod.id}`, { method: 'PUT', body: collect() });
    dirty = false; saveState.textContent = t('saved');
    if (saved.translation === 'pending') translate();
  };
  saveBtn.addEventListener('click', () => save().catch(showError));

  const errEl = el.querySelector('[data-error]');
  function showError(err) { errEl.innerHTML = errorBox(err); errEl.scrollIntoView({ block: 'center' }); saveBtn.disabled = !dirty; }

  // --- AI revision (free text or the reviewers' comments): live storyboard, then back to the editor ---
  const revise = async body => {
    try { await save(); } catch (err) { return showError(err); }
    const onEvent = storyboard(el, meta, { titleKey: 'revising', base: mod });
    window.scrollTo({ top: 0 });
    try {
      await streamNdjson(`/api/builder/${mod.id}/revise`, body, onEvent);
      await renderEditor(el, user, mod.id);
    } catch (err) {
      await renderEditor(el, user, mod.id);
      el.querySelector('[data-error]').innerHTML = errorBox(err);
    }
  };
  const instr = el.querySelector('[data-instruction]');
  el.querySelectorAll('[data-idea]').forEach(b => b.addEventListener('click', () => { instr.value = t(`reviseIdea${b.dataset.idea}`); instr.focus(); }));
  el.querySelector('[data-revise]').addEventListener('click', () => {
    if (instr.value.trim().length < 3) { instr.focus(); return; }
    revise({ instruction: instr.value.trim() });
  });

  // --- Studio: mark the lessons complete, or regenerate them from a changed outline ---
  el.querySelectorAll('[data-content-complete]').forEach(b => b.addEventListener('click', async () => {
    b.disabled = true;
    try {
      await save();
      await api(`/api/projects/${mod.id}/cards/content`, { method: 'POST', body: { action: 'complete' } });
      location.hash = `#/studio/${mod.id}`;
    } catch (err) { b.disabled = false; showError(err); }
  }));
  el.querySelector('[data-regenerate]')?.addEventListener('click', async () => {
    if (!confirm(t('ctRegenerateConfirm'))) return;
    const onEvent = storyboard(el, meta, { titleKey: 'ctGenerating', outline: mod.studio.outline });
    window.scrollTo({ top: 0 });
    try { await streamNdjson(`/api/projects/${mod.id}/generate`, {}, onEvent); }
    catch (err) { await renderEditor(el, user, mod.id); return showError(err); }
    await renderEditor(el, user, mod.id);
  });

  // --- Submit (translation is completed on the server if needed) ---
  const submitBtn = el.querySelector('[data-submit]');
  submitBtn?.addEventListener('click', async () => {
    if (!confirm(t('submitConfirm', { title: val('title') }))) return;
    submitBtn.disabled = true; submitBtn.textContent = t('submitting');
    try {
      await save();
      if (translating) await translating;
      await api(`/api/modules/${mod.id}/submit`, { method: 'POST' });
      await renderEditor(el, user, mod.id);
      el.querySelector('.lh-locked').textContent = t('submittedNote');
    } catch (err) {
      submitBtn.disabled = false; submitBtn.textContent = t(mod.status === 'changes_requested' ? 'resubmit' : 'submitForApproval');
      showError(err);
    }
  });
}
