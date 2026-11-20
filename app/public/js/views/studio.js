// Content creator: the Training Module Creation Studio.
//  #/studio/:id            overview: one card per need, with status and locks
//  #/studio/:id/materials  approved materials (library + uploads)
//  #/studio/:id/outline    outline and storyboard, agreed with the AI in a conversation
//  #/studio/:id/practice   practice sessions (persona, objection, brief, what good looks like; chat or avatar)
//  #/studio/:id/videos     instructional videos (description -> AI script)
//  #/studio/:id/content    lessons and quizzes (generate from the outline, then the editor)
//  #/studio/:id/preview    preview every lesson as a learner, note changes, apply them with AI, submit
// Requirements are edited in the wizard (#/build/:id).
import { api, streamNdjson } from '../api.js';
import { t, L, getLang } from '../i18n.js';
import { esc, chip, statusChip, reviewChip, errorBox, fmtDate, meter, objectionOf } from '../ui.js';
import { parsePartial } from '../partial-json.js';
import { renderBlocks, lessonBlocks, wireBlocks } from '../blocks.js';
import { activeCards, cardInfo, studioProgress, specTotals, audienceText, creatorComments, openComments, isOpenComment, commentCard } from '../studio-rules.js';
import { storyboard, renderEditor } from './builder.js';
import { cardCommentsPanel, wireCreatorComments, commentListHtml, selectInFields, commentVideo } from './creator-comments.js';
import { paintAnchors, revealPin, teamName } from '../comments-ui.js';
import { reveal } from '../anchor.js';

const TEAMS = ['training', 'sales', 'marketing', 'mlr'];
const PILLARS = ['product', 'messaging', 'objections'];
const METHODS = ['why', 'example', 'dodont', 'visual', 'chart', 'callout', 'check'];
const clone = x => JSON.parse(JSON.stringify(x));
const lines = v => String(v || '').split('\n').map(x => x.trim()).filter(Boolean);

const ICON = {
  requirements: '<path d="M9 4h6M8 4H6v17h12V4h-2M9 10h6M9 14h6M9 18h3"/>',
  materials: '<path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6"/>',
  outline: '<path d="M4 6h3M10 6h10M4 12h3M10 12h10M4 18h3M10 18h10"/>',
  practice: '<path d="M4 5h11v8H8l-4 3zM15 9h5v8l-3-2h-5v-2"/>',
  videos: '<path d="M3 6h13v12H3zM16 10l5-3v10l-5-3"/>',
  content: '<path d="M4 5h7v14H4zM13 5h7v14h-7M6.5 9h2M15.5 9h2M15.5 13h2"/>',
  preview: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
};
const icon = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
const STATE_CHIP = { complete: 'approved', in_progress: 'in_review', todo: 'draft', locked: 'draft', needs_update: 'changes_requested', action_required: 'changes_requested' };
const stateChip = (state, open = 0) => chip(STATE_CHIP[state], state === 'action_required' ? t('cardState_action_required_n', { n: open }) : t(`cardState_${state}`));
const EDITABLE = ['draft', 'changes_requested'];
const cardName = k => t(`card_${k}`);

export async function renderStudio(el, user, id, card) {
  const [mod, meta, library, users] = await Promise.all([api(`/api/modules/${id}`), api('/api/meta'), api('/api/materials'), api('/api/users')]);
  if (!mod.studio) { location.hash = `#/edit/${id}`; return; }
  const ctx = { el, user, mod, meta, library, users, ro: !EDITABLE.includes(mod.status), reload: () => renderStudio(el, user, id, card) };
  if (card && !activeCards(mod.studio.spec).includes(card)) card = null;
  if (card === 'content') return mod.sections.length ? renderEditor(el, user, id) : contentCard(ctx);
  const view = { materials: materialsCard, outline: outlineCard, practice: practiceCard, videos: videosCard, preview: previewCard }[card];
  return (view || overview)(ctx);
}

// ================================ Shared pieces ================================
function cardHead(ctx, key, lead) {
  const { mod } = ctx;
  const info = cardInfo(mod, key);
  return `
    <a class="zn-back" href="#/studio/${esc(mod.id)}"><span aria-hidden="true">←</span> ${esc(t('backToStudio'))}</a>
    <header class="lh-hero lh-st-head">
      <p class="lh-kicker">${esc(mod.studio.spec.title)} · ${esc(t('studioKicker'))}</p>
      <div class="lh-row"><span class="lh-stcard__icon">${icon(key)}</span><h1 class="lh-hero__title" style="margin:0">${esc(cardName(key))}</h1>${stateChip(info.state, info.open)}</div>
      <p class="lh-hero__lead">${esc(lead)}</p>
    </header>
    ${ctx.ro ? `<div class="zn-card lh-card lh-locked">${esc(t('studioSubmittedNote'))}</div>` : ''}
    ${key !== 'preview' ? cardCommentsPanel(mod, key, ctx.users) : ''}
    ${info.state === 'needs_update' ? `<div class="zn-card lh-card lh-st-banner lh-st-banner--warn">${esc(t('cardStaleNote'))}</div>` : ''}
    ${info.state === 'locked' ? `<div class="zn-card lh-card lh-st-banner">${esc(t('cardLockedNote', { cards: info.missing.map(cardName).join(', ') }))}</div>` : ''}`;
}

// The sticky bar: optional extra buttons, then "Mark complete" (or "Edit again" once complete).
function cardBar(ctx, key, extra = '') {
  if (ctx.ro) return '';
  const info = cardInfo(ctx.mod, key);
  if (info.state === 'locked') return '';
  const stored = ctx.mod.studio.cards[key]?.state;
  if (info.state === 'action_required' && stored === 'complete') {
    return `<div class="lh-actionbar" role="region" aria-label="${esc(cardName(key))}"><span class="lh-card__meta" data-bar-state aria-live="polite">${esc(t('ccBarNote'))}</span><span class="lh-spacer"></span>${extra}</div><div data-error></div>`;
  }
  const done = info.state === 'complete';
  return `<div class="lh-actionbar" role="region" aria-label="${esc(cardName(key))}">
    <span class="lh-card__meta" data-bar-state aria-live="polite"></span>
    <span class="lh-spacer"></span>
    ${extra}
    ${done ? `<button type="button" class="zn-button zn-button--ghost" data-reopen>${esc(t('cardReopen'))}</button>`
      : `<button type="button" class="zn-button" data-complete>${esc(t(info.state === 'needs_update' ? 'cardConfirm' : 'cardComplete'))}</button>`}
  </div>
  <div data-error></div>`;
}

// Reviewer comments on this card: "Show me" selects the text in the card's fields, or shows the session / video.
function wireComments(ctx, key) {
  const panel = ctx.el.querySelector('[data-cc-panel]');
  if (!panel) return;
  wireCreatorComments(panel, ctx.mod, {
    reload: ctx.reload,
    storyboard: () => storyboard(ctx.el, ctx.meta, { titleKey: 'revising', base: ctx.mod }),
    onShow: c => {
      if (c.quote && selectInFields(ctx.el, c.quote)) return;
      const sid = String(c.target || '').startsWith('boss:') ? c.target.slice(5) : null;
      const v = commentVideo(ctx.mod, c);
      const box = (sid && ctx.el.querySelector(`[data-session="${CSS.escape(sid)}"]`))
        || (v && ctx.el.querySelector(`[data-video="${CSS.escape(v.id)}"]`))
        || panel.nextElementSibling;
      if (box) reveal(box, [box]);
    },
  });
}

function wireBar(ctx, key, { beforeComplete } = {}) {
  const { el, mod } = ctx;
  wireComments(ctx, key);
  const err = el.querySelector('[data-error]');
  const fail = e => { if (err) { err.innerHTML = errorBox(e); err.scrollIntoView({ block: 'center' }); } };
  // (e.currentTarget is null after an await, so keep the button.)
  el.querySelector('[data-complete]')?.addEventListener('click', async e => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      if (beforeComplete) await beforeComplete();
      await api(`/api/projects/${mod.id}/cards/${key}`, { method: 'POST', body: { action: 'complete' } });
      location.hash = `#/studio/${mod.id}`;
    } catch (x) { btn.disabled = false; fail(x); }
  });
  el.querySelector('[data-reopen]')?.addEventListener('click', async e => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try { await api(`/api/projects/${mod.id}/cards/${key}`, { method: 'POST', body: { action: 'reopen' } }); ctx.reload(); }
    catch (x) { btn.disabled = false; fail(x); }
  });
  return fail;
}

const barState = (el, text) => { const x = el.querySelector('[data-bar-state]'); if (x) x.textContent = text; };
const busy = (btn, key) => { btn.disabled = true; btn.dataset.label = btn.textContent; btn.innerHTML = `<span class="lh-spinner lh-spinner--inline" aria-hidden="true"></span> ${esc(t(key))}`; };
const unbusy = btn => { btn.disabled = false; btn.textContent = btn.dataset.label || btn.textContent; };

// ================================ Overview ================================
function cardSummary(mod, k, library) {
  const st = mod.studio, spec = st.spec;
  const x = specTotals(spec);
  switch (k) {
    case 'requirements': return `${audienceText(spec.audience, getLang())} · ${t('shapeTotalsShort', { min: x.minutes, lessons: x.lessons, quizzes: x.quizzes, practice: x.practice })}`;
    case 'materials': {
      const chosen = library.filter(m => spec.materials.includes(m.id));
      return t('sumMaterials', { n: chosen.length, pending: chosen.filter(m => m.status === 'pending').length });
    }
    case 'outline': return st.outline ? t('sumOutline', { sections: st.outline.sections.length, lessons: st.outline.sections.reduce((a, s) => a + s.lessons.length, 0) })
 : t('sumOutlineNone');
    case 'practice': return t('sumPractice', { n: x.practice, avatar: x.avatar, ready: st.practice.length });
    case 'videos': return t('sumVideos', { n: st.videos.length, scripts: st.videos.filter(v => v.script).length });
    case 'content': return mod.sections.length ? t('sumContent', { lessons: mod.sections.reduce((a, s) => a + s.lessons.length, 0), questions: mod.sections.reduce((a, s) => a + s.quiz.length, 0) }) : t('sumContentNone');
    case 'preview': {
      if (mod.status === 'changes_requested') { const all = creatorComments(mod), open = all.filter(isOpenComment).length; return open ? t('ccOpenOf', { open, n: all.length }) : t('ccAllDone'); }
      const n = Object.keys(st.notes || {}).length; return mod.status !== 'draft' ? t('sumSubmitted') : n ? t('sumNotes', { n }) : t('sumPreview');
    }
    default: return '';
  }
}

function overview(ctx) {
  const { el, mod, library } = ctx;
  const st = mod.studio, active = activeCards(st.spec);
  const prog = studioProgress(mod);
  const href = k => (k === 'requirements' ? `#/build/${mod.id}` : `#/studio/${mod.id}/${k}`);
  // Only the cards that can be worked on now (not the ones that are themselves locked) are named as the blocker.
  const blocking = info => { const now = info.missing.filter(k => cardInfo(mod, k).state !== 'locked'); return now.length ? now : info.missing; };
  const tile = (k, i) => {
    const info = cardInfo(mod, k);
    const locked = info.state === 'locked';
    const cta = ctx.ro ? 'cardView' : locked ? 'cardLocked' : info.state === 'action_required' ? 'cardSeeComments' : info.state === 'todo' ? 'cardStart' : info.state === 'complete' ? 'cardView' : 'cardContinue';
    return `<article class="zn-card lh-card lh-stcard lh-stcard--${info.state}">
      <div class="lh-row"><span class="lh-stcard__icon">${icon(k)}</span><span class="lh-stcard__n">${i + 1}</span><span class="lh-spacer"></span>${stateChip(info.state, info.open)}</div>
      <h2 class="lh-card__title">${esc(cardName(k))}</h2>
      <p class="lh-card__meta">${esc(t(`cardDesc_${k}`))}</p>
      <p class="lh-stcard__sum">${esc(cardSummary(mod, k, library))}</p>
      ${locked ? `<p class="lh-stcard__needs">${esc(t('cardUnlocks', { cards: blocking(info).map(cardName).join(', ') }))}</p>` : ''}
      ${locked && !ctx.ro ? `<span class="zn-button zn-button--ghost zn-button--small" aria-disabled="true">${esc(t(cta))}</span>`
        : `<a class="zn-button ${info.state === 'complete' ? 'zn-button--ghost' : ''} zn-button--small" href="${href(k)}">${esc(t(cta, { n: info.open || 0 }))}</a>`}
    </article>`;
  };
  // Sent back by the reviewers: who asked, how many comments, how many still open.
  const back = mod.status === 'changes_requested';
  const all = creatorComments(mod), openN = all.filter(isOpenComment).length;
  const askers = [...new Set(all.map(c => c.team))].map(teamName).join(', ');
  el.innerHTML = `
    <a class="zn-back" href="#/"><span aria-hidden="true">←</span> ${esc(t('backToProjects'))}</a>
    <header class="lh-hero">
      <p class="lh-kicker">${esc(t('studioKicker'))}</p>
      <div class="lh-row">${ctx.ro || back ? statusChip(mod.status) : chip('draft', t('status_design'))}${mod.round ? chip('draft', t('roundN', { n: mod.round })) : ''}<span class="zn-product zn-product--derolad">Derolad®</span></div>
      <h1 class="lh-hero__title">${esc(L(mod.title) || st.spec.title)}</h1>
      <p class="lh-hero__lead">${esc(st.spec.goal)}</p>
      ${ctx.ro || back ? `<div class="lh-teams">${TEAMS.map(team => reviewChip(team, mod.reviews?.[team]?.state || 'pending')).join('')}</div>` : ''}
    </header>
    ${back ? `<section class="zn-card lh-card lh-cc-banner">
      <div><p class="lh-kicker">${esc(t('ccBannerKicker', { round: mod.round }))}</p>
        <p class="lh-nextstep__text">${esc(t('ccBannerText', { teams: askers, n: all.length }))}</p>
        <p class="lh-card__meta">${esc(openN ? t('ccBannerOpen', { open: openN }) : t('ccBannerDone'))}</p></div>
      <a class="zn-button" href="#/studio/${esc(mod.id)}/preview">${esc(t(openN ? 'ccBannerCta' : 'ccBannerResubmit'))}</a>
    </section>` : ''}
    <section class="zn-card lh-card lh-st-progress">
      ${meter(t('studioProgress'), prog.total ? (prog.done / prog.total) * 100 : 0)}
      <div class="lh-row">
        <p class="lh-card__meta" style="margin:0">${esc(t('studioDoneOf', { done: prog.done, total: prog.total }))}${prog.next && !ctx.ro ? ` · ${esc(t('studioNext', { card: cardName(prog.next) }))}` : ''}</p>
        <span class="lh-spacer"></span>
        ${ctx.ro ? `<a class="zn-button zn-button--small" href="#/edit/${esc(mod.id)}">${esc(t('viewModule'))}</a>`
          : prog.next ? `<a class="zn-button zn-button--small" href="${href(prog.next)}">${esc(t('studioGoNext'))}</a>` : ''}
      </div>
    </section>
    <div class="lh-st-grid">${active.map(tile).join('')}</div>`;
}

// ================================ Materials ================================
function materialItem(m, removable) {
  return `<li class="lh-mat">
    <div class="lh-row"><strong>${esc(L(m.title))}</strong>${m.status === 'pending' ? chip('changes_requested', t('matPending')) : chip('approved', t('matApproved'))}
      <span class="lh-spacer"></span>${removable ? `<button type="button" class="lh-link lh-link--danger" data-remove-mat="${esc(m.id)}">${esc(t('remove'))}</button>` : ''}</div>
    ${m.summary ? `<p class="lh-card__meta">${esc(L(m.summary))}</p>` : ''}
    <p class="lh-card__meta">${esc(m.kind === 'builtin' ? t('matBuiltin') : t('matUploaded', { date: fmtDate(m.at), file: m.fileName || '' }))}</p>
    ${m.facts?.length ? `<details class="lh-mat__facts"><summary>${esc(t('matFacts', { n: m.facts.length }))}</summary><ul>${m.facts.map(f => `<li>${esc(L(f))}</li>`).join('')}</ul></details>` : ''}
  </li>`;
}

function materialsCard(ctx) {
  const { el, mod, library, ro } = ctx;
  const spec = mod.studio.spec;
  const chosen = library.filter(m => spec.materials.includes(m.id));
  const others = library.filter(m => !spec.materials.includes(m.id));
  const uploads = chosen.filter(m => m.kind !== 'builtin');
  el.innerHTML = `${cardHead(ctx, 'materials', t('matLead'))}
    ${spec.willUpload && !uploads.length ? `<div class="zn-card lh-card lh-st-banner">${esc(t('matPlannedUpload'))}</div>` : ''}
    <section class="zn-card lh-card">
      <h2 class="lh-card__title">${esc(t('matChosen', { n: chosen.length }))}</h2>
      ${chosen.length ? `<ul class="lh-mats">${chosen.map(m => materialItem(m, !ro)).join('')}</ul>` : `<p class="lh-card__meta">${esc(t('matNone'))}</p>`}
      ${!ro && others.length ? `<div class="lh-form__row">
        <label class="lh-field"><span class="lh-field__label">${esc(t('matAddFromLibrary'))}</span>
          <select class="lh-input" data-add-select>${others.map(m => `<option value="${esc(m.id)}">${esc(L(m.title))}${m.status === 'pending' ? ` (${esc(t('matPending'))})` : ''}</option>`).join('')}</select></label>
        <button type="button" class="zn-button zn-button--ghost" data-add-mat>${esc(t('matAdd'))}</button></div>` : ''}
    </section>
    ${ro ? '' : `<section class="zn-card lh-card lh-upload">
      <h2 class="lh-card__title">${esc(t('matUploadTitle'))}</h2>
      <p class="lh-st-privacy">${esc(t('matPrivacy'))}</p>
      <form class="lh-form" data-upload>
        <label class="lh-field"><span class="lh-field__label">${esc(t('matFile'))}</span>
          <input class="lh-input" type="file" name="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" required></label>
        <label class="lh-field"><span class="lh-field__label">${esc(t('matTitle'))} <span class="lh-muted">${esc(t('optional'))}</span></span>
          <input class="lh-input" name="title" maxlength="200" placeholder="${esc(t('matTitlePh'))}"></label>
        <label class="lh-option"><input type="checkbox" name="pending"><span><strong>${esc(t('matPendingCheck'))}</strong><br><span class="lh-card__meta">${esc(t('matPendingHint'))}</span></span></label>
        <div class="lh-row"><button type="submit" class="zn-button">${esc(t('matUpload'))}</button><span class="lh-card__meta" data-upload-state aria-live="polite"></span></div>
        <div data-upload-error></div>
      </form>
    </section>`}
    ${cardBar(ctx, 'materials')}`;
  const fail = wireBar(ctx, 'materials');
  if (ro) return;
  const save = async ids => { await api(`/api/projects/${mod.id}/materials`, { method: 'PUT', body: { materials: ids } }); ctx.reload(); };
  el.querySelectorAll('[data-remove-mat]').forEach(b => b.addEventListener('click', () => save(spec.materials.filter(id => id !== b.dataset.removeMat)).catch(fail)));
  el.querySelector('[data-add-mat]')?.addEventListener('click', () => save([...spec.materials, el.querySelector('[data-add-select]').value]).catch(fail));
  const form = el.querySelector('[data-upload]');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const file = form.file.files[0];
    const state = el.querySelector('[data-upload-state]'), errBox = el.querySelector('[data-upload-error]');
    errBox.innerHTML = '';
    if (!file) return form.file.focus();
    if (file.size > 3 * 1024 * 1024) { errBox.innerHTML = `<p class="lh-error">${esc(t('matTooBig'))}</p>`; return; }
    const btn = form.querySelector('button[type="submit"]');
    busy(btn, 'matReading');
    state.textContent = t('matReadingHint');
    try {
      const data = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(',')[1] || '');
        r.onerror = () => reject(new Error(t('matReadFail')));
        r.readAsDataURL(file);
      });
      await api(`/api/projects/${mod.id}/materials/upload`, { method: 'POST', body: { name: file.name, data, title: form.title.value, pending: form.pending.checked } });
      ctx.reload();
    } catch (err) { unbusy(btn); state.textContent = ''; errBox.innerHTML = errorBox(err); }
  });
}

// ================================ Outline ================================
function outlineCard(ctx) {
  const { el, mod, ro } = ctx;
  const st = mod.studio;
  const info = cardInfo(mod, 'outline');
  const videoTopic = id => st.videos.find(v => v.id === id)?.topic || id;
  let draft = st.outline ? clone(st.outline) : null;
  let dirty = false;
  const canEdit = !ro && info.state !== 'locked';

  el.innerHTML = `${cardHead(ctx, 'outline', t('olLead'))}
    ${info.state === 'locked' ? '' : `<div class="lh-ol">
      <div class="lh-ol__main" data-ol-main></div>
      <aside class="zn-card lh-card lh-ol__chat" data-chat aria-label="${esc(t('olChatTitle'))}"></aside>
    </div>`}
    ${cardBar(ctx, 'outline', canEdit && draft ? `<button type="button" class="zn-button zn-button--ghost" data-save disabled>${esc(t('saveChanges'))}</button>` : '')}`;
  const fail = wireBar(ctx, 'outline', { beforeComplete: () => save() });
  if (info.state === 'locked') return;
  const main = el.querySelector('[data-ol-main]'), chat = el.querySelector('[data-chat]');
  const saveBtn = el.querySelector('[data-save]');

  // --- The outline: editable cards (or a read-only preview while the assistant writes) ---
  const methodChips = (p, l) => `<div class="lh-ol-methods" role="group" aria-label="${esc(t('olMethods'))}">${METHODS.map(m => `
    <label class="lh-ol-method"><input type="checkbox" data-f="${p}.m.${m}" ${l.methods?.includes(m) ? 'checked' : ''} ${canEdit ? '' : 'disabled'}><span>${esc(t(`method_${m}`))}</span></label>`).join('')}</div>`;
  // Instructional videos are part of the storyboard: each one sits in exactly one lesson (the assistant places them;
  // the creator can move them here or in the Videos card).
  const hasVideos = st.videos.length > 0;
  const lessonNo = (o, id) => { let n = 0; for (const s of o.sections) for (const l of s.lessons) { n++; if (l.id === id) return n; } return 0; };
  const videoPick = (si, li, l) => !hasVideos ? '' : `<div class="lh-ol-video ${l.video ? 'is-on' : ''}">
      <label class="lh-ol-method lh-ol-method--video"><input type="checkbox" data-vtoggle="${si}.${li}" ${l.video ? 'checked' : ''} ${canEdit ? '' : 'disabled'}>${icon('videos')}<span>${esc(t('olVideoToggle'))}</span></label>
      ${l.video ? `<select class="lh-input" data-vsel="${si}.${li}" aria-label="${esc(t('olVideoWhich'))}" ${canEdit ? '' : 'disabled'}>${st.videos.map(v => {
        const at = draft.sections.flatMap(x => x.lessons).find(x => x.video === v.id && x !== l);
        return `<option value="${esc(v.id)}" ${v.id === l.video ? 'selected' : ''}>${esc(v.topic)}${at ? ` (${esc(t('olVideoMovesFrom', { n: lessonNo(draft, at.id) }))})` : ''}</option>`;
      }).join('')}</select>` : ''}
    </div>`;
  const lessonEdit = (s, si, l, li, n) => {
    const p = `s${si}.l${li}`;
    return `<li class="lh-ol-lesson ${l.video ? 'lh-ol-lesson--video' : ''}">
      <div class="lh-ol-lesson__head">
        <span class="lh-ol-n" aria-hidden="true">${n}</span>
        <input class="lh-input lh-ol-title" data-f="${p}.title" value="${esc(l.title)}" aria-label="${esc(t('lessonLabel', { n }))}" ${canEdit ? '' : 'disabled'}>
        ${canEdit ? `<span class="lh-ol-tools">
          <button type="button" class="lh-iconbtn" data-move="${si}.${li}.-1" aria-label="${esc(t('olMoveUp'))}" title="${esc(t('olMoveUp'))}">↑</button>
          <button type="button" class="lh-iconbtn" data-move="${si}.${li}.1" aria-label="${esc(t('olMoveDown'))}" title="${esc(t('olMoveDown'))}">↓</button>
          <button type="button" class="lh-iconbtn lh-iconbtn--danger" data-del="${si}.${li}" aria-label="${esc(t('olDelete'))}" title="${esc(t('olDelete'))}">✕</button></span>` : ''}
      </div>
      <div class="lh-row lh-ol-meta">
        <label class="lh-ol-inline"><span>${esc(t('pillarLabel'))}</span><select class="lh-input" data-f="${p}.pillar" ${canEdit ? '' : 'disabled'}>${PILLARS.map(x => `<option value="${x}" ${x === l.pillar ? 'selected' : ''}>${esc(t(`pillar_${x}`))}</option>`).join('')}</select></label>
        <label class="lh-ol-inline"><span>${esc(t('minutesLabel'))}</span><input class="lh-input" type="number" min="3" max="25" data-f="${p}.minutes" value="${l.minutes}" ${canEdit ? '' : 'disabled'}></label>
      </div>
      <label class="lh-field"><span class="lh-field__label">${esc(t('olPoints'))}</span>
        <textarea class="lh-input" rows="${Math.max(3, l.points.length + 1)}" data-f="${p}.points" ${canEdit ? '' : 'disabled'}>${esc(l.points.join('\n'))}</textarea></label>
      ${methodChips(p, l)}
      ${videoPick(si, li, l)}
    </li>`;
  };
  const paintEditable = () => {
    let n = 0;
    main.innerHTML = draft.sections.map((s, si) => `
      <section class="zn-card lh-card lh-ol-section">
        <p class="lh-kicker">${esc(t('sectionN', { n: si + 1 }))}</p>
        <input class="lh-input lh-ol-stitle" data-f="s${si}.title" value="${esc(s.title)}" aria-label="${esc(t('sectionTitleLabel'))}" ${canEdit ? '' : 'disabled'}>
        <textarea class="lh-input" rows="2" data-f="s${si}.goal" aria-label="${esc(t('olSectionGoal'))}" ${canEdit ? '' : 'disabled'}>${esc(s.goal)}</textarea>
        <ol class="lh-ol-lessons">${s.lessons.map((l, li) => lessonEdit(s, si, l, li, ++n)).join('')}</ol>
        ${canEdit ? `<button type="button" class="lh-link" data-add-lesson="${si}">+ ${esc(t('olAddLesson'))}</button>` : ''}
        ${s.quiz ? `<div class="lh-ol-extra"><p class="lh-kicker">${esc(t('olQuiz', { n: s.quiz }))}</p>
          <input class="lh-input" data-f="s${si}.quizFocus" value="${esc(s.quizFocus)}" placeholder="${esc(t('olQuizFocusPh'))}" aria-label="${esc(t('olQuizFocusPh'))}" ${canEdit ? '' : 'disabled'}></div>` : ''}
        ${s.practice ? `<div class="lh-ol-extra lh-ol-extra--practice"><p class="lh-kicker">${esc(t('olPractice', { mode: t(`practiceMode_${s.practice.mode}`), n: s.practice.minutes }))}</p>
          <textarea class="lh-input" rows="2" data-f="s${si}.practiceFocus" aria-label="${esc(t('olPracticeFocus'))}" ${canEdit ? '' : 'disabled'}>${esc(s.practice.focus)}</textarea></div>` : ''}
      </section>`).join('') + (draft.notes ? `<section class="zn-card lh-card lh-ainotes"><p class="lh-kicker">${esc(t('aiNotesTitle'))}</p><p>${esc(draft.notes)}</p></section>` : '');
  };
  // Live preview from the streamed JSON (model field names).
  const paintStreaming = o => {
    let n = 0;
    main.innerHTML = (o?.sections || []).map((s, si) => `
      <section class="zn-card lh-card lh-ol-section lh-ol-section--live">
        <p class="lh-kicker">${esc(t('sectionN', { n: si + 1 }))}</p>
        <h2 class="lh-card__title">${esc(s?.title || '')}</h2>
        <ol class="lh-ol-lessons">${(s?.lessons || []).map(l => `<li class="lh-ol-lesson ${l?.video && l.video !== 'none' ? 'lh-ol-lesson--video' : ''}"><div class="lh-ol-lesson__head"><span class="lh-ol-n">${++n}</span><strong>${esc(l?.title || '')}</strong></div>
          ${l?.video && l.video !== 'none' && st.videos.some(v => v.id === l.video) ? `<p class="lh-ol-vchip">${icon('videos')}<span>${esc(t('olVideo', { topic: videoTopic(l.video) }))}</span></p>` : ''}
          ${(l?.points || []).length ? `<ul class="lh-ol-points">${l.points.map(p => `<li>${esc(p || '')}</li>`).join('')}</ul>` : ''}
          ${(l?.methods || []).length ? `<div class="lh-row">${l.methods.filter(m => METHODS.includes(m)).map(m => chip('pending', t(`method_${m}`))).join('')}</div>` : ''}</li>`).join('')}</ol>
      </section>`).join('') || `<div class="zn-card lh-card lh-empty"><span class="lh-spinner lh-spinner--inline" aria-hidden="true"></span> ${esc(t('olThinking'))}</div>`;
  };
  const paintEmpty = () => {
    main.innerHTML = `<section class="zn-card lh-card lh-ol-empty">
      <h2 class="lh-card__title">${esc(t('olEmptyTitle'))}</h2>
      <p class="lh-card__meta">${esc(t('olEmptyLead'))}</p>
      ${canEdit ? `<label class="lh-field"><span class="lh-field__label">${esc(t('olFirstNote'))} <span class="lh-muted">${esc(t('optional'))}</span></span>
        <textarea class="lh-input" rows="2" data-first-note maxlength="2000" placeholder="${esc(t('olFirstNotePh'))}"></textarea></label>
      <div class="lh-row"><button type="button" class="zn-button" data-propose>${esc(t('olPropose'))}</button></div>` : ''}
    </section>`;
    main.querySelector('[data-propose]')?.addEventListener('click', () => send(main.querySelector('[data-first-note]').value.trim(), true));
  };

  // --- Read the form back into the draft ---
  const readForm = () => {
    if (!draft) return;
    main.querySelectorAll('[data-f]').forEach(inp => {
      const [sp, lp, f, m] = inp.dataset.f.split('.');
      const s = draft.sections[Number(sp.slice(1))];
      if (!lp.startsWith('l')) {
        if (lp === 'title') s.title = inp.value; else if (lp === 'goal') s.goal = inp.value;
        else if (lp === 'quizFocus') s.quizFocus = inp.value; else if (lp === 'practiceFocus' && s.practice) s.practice.focus = inp.value;
        return;
      }
      const l = s.lessons[Number(lp.slice(1))];
      if (f === 'title') l.title = inp.value;
      else if (f === 'pillar') l.pillar = inp.value;
      else if (f === 'minutes') l.minutes = Number(inp.value) || l.minutes;
      else if (f === 'points') l.points = lines(inp.value);
      else if (f === 'm') l.methods = inp.checked ? [...new Set([...(l.methods || []), m])] : (l.methods || []).filter(x => x !== m);
    });
  };
  const markDirty = () => { dirty = true; if (saveBtn) saveBtn.disabled = false; barState(el, t('unsaved')); };
  const save = async () => {
    if (!dirty) return;
    readForm();
    await api(`/api/projects/${mod.id}/outline`, { method: 'PUT', body: { outline: draft } });
    dirty = false;
  };
  const restructure = fn => { readForm(); fn(); markDirty(); paintEditable(); wireMain(); };
  const wireMain = () => {
    main.querySelectorAll('[data-move]').forEach(b => b.addEventListener('click', () => restructure(() => {
      const [si, li, d] = b.dataset.move.split('.').map(Number);
      const secs = draft.sections, s = secs[si], l = s.lessons[li];
      const to = li + d;
      if (to >= 0 && to < s.lessons.length) { s.lessons.splice(li, 1); s.lessons.splice(to, 0, l); }
      else if (to < 0 && si > 0) { s.lessons.splice(li, 1); secs[si - 1].lessons.push(l); }
      else if (to >= s.lessons.length && si < secs.length - 1) { s.lessons.splice(li, 1); secs[si + 1].lessons.unshift(l); }
      secs.forEach(x => { if (!x.lessons.length) x.lessons.push(l); });
    })));
    main.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      const [si, li] = b.dataset.del.split('.').map(Number);
      if (draft.sections[si].lessons.length < 2) { alert(t('olKeepOne')); return; }
      if (!confirm(t('olDeleteConfirm'))) return;
      restructure(() => draft.sections[si].lessons.splice(li, 1));
    }));
    const placeVideo = (si, li, vid) => {
      const l = draft.sections[si].lessons[li];
      for (const x of draft.sections.flatMap(s => s.lessons)) if (vid && x.video === vid) x.video = null;
      l.video = vid || null;
    };
    main.querySelectorAll('[data-vtoggle]').forEach(b => b.addEventListener('change', () => restructure(() => {
      const [si, li] = b.dataset.vtoggle.split('.').map(Number);
      if (!b.checked) return placeVideo(si, li, null);
      // The first video not in a lesson yet, or else the first one (it moves here).
      const placed = new Set(draft.sections.flatMap(s => s.lessons).map(l => l.video).filter(Boolean));
      placeVideo(si, li, (st.videos.find(v => !placed.has(v.id)) || st.videos[0]).id);
    })));
    main.querySelectorAll('[data-vsel]').forEach(b => b.addEventListener('change', () => restructure(() => {
      const [si, li] = b.dataset.vsel.split('.').map(Number);
      placeVideo(si, li, b.value);
    })));
    main.querySelectorAll('[data-add-lesson]').forEach(b => b.addEventListener('click', () => restructure(() => {
      const s = draft.sections[Number(b.dataset.addLesson)];
      s.lessons.push({ id: 'new', title: t('olNewLesson'), pillar: 'product', minutes: st.spec.sections[Number(b.dataset.addLesson)]?.minutes || 10, points: [], methods: ['example', 'check'], video: null });
    })));
  };

  // --- The conversation ---
  const ideas = ['olIdea1', 'olIdea2', 'olIdea3'];
  const paintChat = (pending = null) => {
    const msgs = [...st.chat, ...(pending ? [{ who: 'user', text: pending.user }, { who: 'ai', text: pending.ai, live: true }] : [])].filter(m => m.text || m.live);
    chat.innerHTML = `
      <h2 class="lh-card__title">${esc(t('olChatTitle'))}</h2>
      <div class="lh-ol-msgs" data-msgs>${msgs.length ? msgs.map(m => `<div class="lh-msg lh-msg--${m.who === 'user' ? 'rep' : 'hcp'}"><span class="lh-line__who">${esc(m.who === 'user' ? t('olYou') : t('olAssistant'))}</span><p>${m.text ? esc(m.text) : `<span class="lh-typing">${esc(t('olThinking'))}</span>`}</p></div>`).join('')
        : `<p class="lh-card__meta">${esc(t('olChatEmpty'))}</p>`}</div>
      ${canEdit && draft ? `<form class="lh-ol-compose" data-compose>
        <div class="lh-ideas">${ideas.map(k => `<button type="button" class="lh-idea" data-idea="${k}">${esc(t(k))}</button>`).join('')}</div>
        <textarea class="lh-input" rows="3" maxlength="2000" name="message" placeholder="${esc(t('olAskPh'))}" ${pending ? 'disabled' : ''}></textarea>
        <div class="lh-row"><span class="lh-spacer"></span><button type="submit" class="zn-button zn-button--small" ${pending ? 'disabled' : ''}>${esc(t('olSend'))}</button></div>
      </form>` : ''}`;
    const box = chat.querySelector('[data-msgs]'); box.scrollTop = box.scrollHeight;
    const compose = chat.querySelector('[data-compose]');
    compose?.querySelectorAll('[data-idea]').forEach(b => b.addEventListener('click', () => { compose.message.value = t(b.dataset.idea); compose.message.focus(); }));
    compose?.addEventListener('submit', e => { e.preventDefault(); const m = compose.message.value.trim(); if (m.length < 2) return compose.message.focus(); send(m, false); });
    compose?.message.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) compose.requestSubmit(); });
  };

  async function send(message, first) {
    try { await save(); } catch (err) { return fail(err); }
    let raw = '', frame = false;
    const pending = { user: message, ai: '' };
    paintChat(pending); paintStreaming(null);
    el.querySelectorAll('[data-complete],[data-save],[data-reopen]').forEach(b => { b.disabled = true; });
    const paint = () => { frame = false; const o = parsePartial(raw); pending.ai = o?.reply || ''; paintChat(pending); paintStreaming(o); };
    try {
      await streamNdjson(`/api/projects/${mod.id}/outline`, { message }, ev => {
        if (ev.kind !== 'outline') return;
        raw += ev.text;
        if (!frame) { frame = true; requestAnimationFrame(paint); }
      });
      ctx.reload();
    } catch (err) { await ctx.reload(); const box = el.querySelector('[data-error]'); if (box) box.innerHTML = errorBox(err); }
  }

  if (draft) { paintEditable(); wireMain(); } else paintEmpty();
  paintChat();
  main.addEventListener('input', markDirty);
  saveBtn?.addEventListener('click', async () => {
    saveBtn.disabled = true; barState(el, t('saving'));
    try { await save(); ctx.reload(); } catch (err) { saveBtn.disabled = false; fail(err); }
  });
}

// ================================ Practice sessions ================================
function practiceCard(ctx) {
  const { el, mod, meta, ro } = ctx;
  const st = mod.studio;
  const info = cardInfo(mod, 'practice');
  const sections = (st.outline?.sections || []).filter(s => s.practice);
  const canEdit = !ro && info.state !== 'locked';
  const dis = canEdit ? '' : 'disabled';
  const sessionHtml = (s, p) => {
    const n = st.outline.sections.indexOf(s) + 1;
    return `<section class="zn-card lh-card lh-pr" data-session="${esc(s.id)}">
      <div class="lh-row"><p class="lh-kicker" style="margin:0">${esc(t('sectionN', { n }))} · ${esc(s.title)}</p><span class="lh-spacer"></span>
        ${chip(s.practice.mode === 'avatar' ? 'in_review' : 'pending', t(`practiceMode_${s.practice.mode}`))}${chip('draft', t('minutes', { n: s.practice.minutes }))}</div>
      ${s.practice.mode === 'avatar' ? `<p class="lh-card__meta lh-pr__avatar">${esc(t('prAvatarNote'))}</p>` : ''}
      <div class="lh-form__row">
        <label class="lh-field"><span class="lh-field__label">${esc(t('personaLabel'))}</span>
          <select class="lh-input" name="persona" ${dis}>${meta.personas.map(x => `<option value="${x.id}" ${x.id === p.persona ? 'selected' : ''}>${esc(x.name)} · ${esc(L(x.role))} (${esc(t(`trait_${x.difficulty}`))})</option>`).join('')}</select></label>
        <label class="lh-field"><span class="lh-field__label">${esc(t('objectionLabel'))}</span>
          <select class="lh-input" name="objection" data-objection ${dis}><option value="">${esc(t('objectionNone'))}</option>${meta.objections.map(o => `<option value="${o.id}" ${o.id === p.objection ? 'selected' : ''}>${esc(L(o.text))}</option>`).join('')}
            <option value="other" ${p.objection === 'other' ? 'selected' : ''}>${esc(t('objectionOtherOption'))}</option></select></label>
      </div>
      <label class="lh-field" data-objection-other ${p.objection === 'other' ? '' : 'hidden'}><span class="lh-field__label">${esc(t('objectionOtherLabel'))}</span>
        <textarea class="lh-input" rows="2" name="objectionText" maxlength="300" placeholder="${esc(t('objectionOtherPh'))}" ${p.objection === 'other' ? 'required' : ''} ${dis}>${esc(p.objectionText || '')}</textarea>
        <span class="lh-card__meta">${esc(t('objectionOtherHint'))}</span></label>
      <label class="lh-field"><span class="lh-field__label">${esc(t('briefForRep'))}</span><textarea class="lh-input" rows="2" name="brief" ${dis}>${esc(p.brief)}</textarea></label>
      <label class="lh-field"><span class="lh-field__label">${esc(t('openingLabel'))}</span><input class="lh-input" name="opening" value="${esc(p.opening)}" ${dis}></label>
      <label class="lh-field"><span class="lh-field__label">${esc(t('prCriteria'))}</span><textarea class="lh-input" rows="4" name="criteria" ${dis}>${esc((p.criteria || []).join('\n'))}</textarea></label>
      ${s.practice.focus ? `<p class="lh-card__meta">${esc(t('prFocus'))}: ${esc(s.practice.focus)}</p>` : ''}
    </section>`;
  };
  const sessions = sections.map(s => [s, st.practice.find(p => p.section === s.id)]);
  const ready = sessions.every(([, p]) => p);
  el.innerHTML = `${cardHead(ctx, 'practice', t('prLead'))}
    ${info.state === 'locked' ? '' : !st.practice.length ? `<section class="zn-card lh-card lh-ol-empty">
        <h2 class="lh-card__title">${esc(t('prEmptyTitle', { n: sections.length }))}</h2>
        <p class="lh-card__meta">${esc(t('prEmptyLead'))}</p>
        <ul class="lh-wz-sumlist">${sections.map(s => `<li>${esc(s.title)} · ${esc(t(`practiceMode_${s.practice.mode}`))} · ${esc(t('minutes', { n: s.practice.minutes }))}${s.practice.focus ? ` · ${esc(s.practice.focus)}` : ''}</li>`).join('')}</ul>
        ${canEdit ? `<div class="lh-row"><button type="button" class="zn-button" data-draft>${esc(t('prDraft'))}</button></div>` : ''}
      </section>`
      : `<form data-practice>${sessions.map(([s, p]) => p ? sessionHtml(s, p) : '').join('')}</form>
         ${!ready && canEdit ? `<p class="lh-card__meta">${esc(t('prMissing'))}</p>` : ''}
         ${canEdit ? `<p class="lh-card__meta">${esc(t('prModeHint'))} <a class="lh-link" href="#/build/${esc(mod.id)}">${esc(t('editRequirements'))}</a></p>` : ''}`}
    ${cardBar(ctx, 'practice', canEdit && st.practice.length ? `<button type="button" class="lh-link" data-draft>${esc(t('prRedraft'))}</button><button type="button" class="zn-button zn-button--ghost" data-save disabled>${esc(t('saveChanges'))}</button>` : '')}`;
  let dirty = false;
  const form = el.querySelector('[data-practice]');
  const saveBtn = el.querySelector('[data-save]');
  const collect = () => [...form.querySelectorAll('[data-session]')].map(box => {
    const v = n => box.querySelector(`[name="${n}"]`).value;
    return { section: box.dataset.session, persona: v('persona'), objection: v('objection') || null, objectionText: v('objection') === 'other' ? v('objectionText').trim() : '', brief: v('brief'), opening: v('opening'), criteria: lines(v('criteria')) };
  });
  // "Other": the creator writes the HCP's objection in their own words.
  form?.querySelectorAll('[data-objection]').forEach(sel => sel.addEventListener('change', () => {
    const box = sel.closest('[data-session]'), other = box.querySelector('[data-objection-other]'), text = other.querySelector('textarea');
    const on = sel.value === 'other';
    other.hidden = !on; text.required = on;
    if (on) text.focus();
  }));
  // Every "Other" needs its wording before saving or marking the card complete.
  const missingOther = () => [...(form?.querySelectorAll('[data-session]') || [])].find(box => box.querySelector('[data-objection]').value === 'other' && !box.querySelector('[name="objectionText"]').value.trim());
  const save = async () => {
    const gap = missingOther();
    if (gap) { const f = gap.querySelector('[name="objectionText"]'); f.focus(); f.reportValidity(); throw Object.assign(new Error(t('objectionOtherMissing')), { plain: true }); }
    if (!dirty) return;
    await api(`/api/projects/${mod.id}/practice`, { method: 'PUT', body: { sessions: collect() } }); dirty = false;
  };
  const fail = wireBar(ctx, 'practice', { beforeComplete: save });
  form?.addEventListener('input', () => { dirty = true; if (saveBtn) saveBtn.disabled = false; barState(el, t('unsaved')); });
  form?.addEventListener('change', () => { dirty = true; if (saveBtn) saveBtn.disabled = false; barState(el, t('unsaved')); });
  saveBtn?.addEventListener('click', async () => { saveBtn.disabled = true; try { await save(); ctx.reload(); } catch (err) { saveBtn.disabled = false; fail(err); } });
  el.querySelectorAll('[data-draft]').forEach(b => b.addEventListener('click', async () => {
    if (st.practice.length && !confirm(t('prRedraftConfirm'))) return;
    busy(b, 'prDrafting');
    try { await api(`/api/projects/${mod.id}/practice/draft`, { method: 'POST' }); ctx.reload(); }
    catch (err) { unbusy(b); fail(err); }
  }));
}

// ================================ Videos ================================
function videosCard(ctx) {
  const { el, mod, ro } = ctx;
  const st = mod.studio;
  const info = cardInfo(mod, 'videos');
  const canEdit = !ro && info.state !== 'locked';
  const dis = canEdit ? '' : 'disabled';
  const lessons = (st.outline?.sections || []).flatMap((s, si) => s.lessons.map((l, li) => ({ ...l, label: `${t('sectionN', { n: si + 1 })} · ${t('lessonLabel', { n: li + 1 })}: ${l.title}` })));
  const placed = vid => lessons.find(l => l.video === vid)?.id || '';
  const who = w => t(w === 'hcp' ? 'whoHcp' : w === 'rep' ? 'whoRep' : 'whoNarrator');
  const scriptHtml = (v, sc, live = false) => !sc ? '' : `
    <div class="lh-vs ${live ? 'lh-vs--live' : ''}" data-script="${esc(v.id)}">
      <div class="lh-row"><p class="lh-kicker" style="margin:0">${esc(t('vdScript'))}</p><span class="lh-spacer"></span>${sc.seconds ? chip('draft', t('vdSeconds', { n: sc.seconds })) : ''}</div>
      ${live ? `<h3 class="lh-b__h">${esc(sc.title || '')}</h3><p class="lh-card__meta">${esc(sc.summary || '')}</p>`
        : `<label class="lh-field"><span class="lh-field__label">${esc(t('fTitle'))}</span><input class="lh-input" data-sf="title" value="${esc(sc.title)}" ${dis}></label>
           <label class="lh-field"><span class="lh-field__label">${esc(t('vdSummary'))}</span><textarea class="lh-input" rows="2" data-sf="summary" ${dis}>${esc(sc.summary)}</textarea></label>`}
      <ol class="lh-vs__scenes">${(sc.scenes || []).map((scene, i) => `<li class="lh-vs__scene">
        <p class="lh-kicker">${esc(t('vdScene', { n: i + 1 }))}</p>
        ${live ? `<p class="lh-card__meta">${esc(scene?.setting || '')}</p>${scene?.onscreen ? `<p>${chip('pending', scene.onscreen)}</p>` : ''}
          <div class="lh-dialogue">${(scene?.lines || []).map(ln => `<div class="lh-line lh-line--${ln?.who === 'hcp' ? 'hcp' : 'rep'}"><span class="lh-line__who">${esc(who(ln?.who))}</span><p>${esc(ln?.text || '')}</p></div>`).join('')}</div>`
        : `<label class="lh-field"><span class="lh-field__label">${esc(t('vdSetting'))}</span><textarea class="lh-input" rows="2" data-sf="scenes.${i}.setting" ${dis}>${esc(scene.setting)}</textarea></label>
          <label class="lh-field"><span class="lh-field__label">${esc(t('vdOnscreen'))}</span><input class="lh-input" data-sf="scenes.${i}.onscreen" value="${esc(scene.onscreen)}" ${dis}></label>
          ${scene.lines.map((ln, j) => `<label class="lh-field lh-vs__line"><span class="lh-field__label">${esc(who(ln.who))}</span><textarea class="lh-input" rows="2" data-sf="scenes.${i}.lines.${j}" ${dis}>${esc(ln.text)}</textarea></label>`).join('')}`}
      </li>`).join('')}</ol>
      ${!live && canEdit ? `<div class="lh-row"><button type="button" class="zn-button zn-button--ghost zn-button--small" data-save-script="${esc(v.id)}" disabled>${esc(t('vdSaveScript'))}</button></div>` : ''}
    </div>`;
  const fmtSecs = n => (n ? `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}` : '');
  const sourceChip = v => {
    const src = v.source || 'script';
    if (src === 'script') return v.script ? chip('approved', t('vdScriptReady')) : chip('draft', t('vdNoScript'));
    if (!v.media) return chip('draft', t('vdNoVideo'));
    return v.media.status === 'pending' ? chip('changes_requested', t('vdPendingMlr')) : chip('approved', t(src === 'upload' ? 'vdUploaded' : 'vdFromLibrary'));
  };
  const mediaHtml = v => !v.media ? '' : `
    <div class="lh-vd-current">
      <video class="lh-video__player" src="${esc(L(v.media.url) || v.media.url)}${v.media.poster ? '' : '#t=1'}" ${v.media.poster ? `poster="${esc(L(v.media.poster))}"` : ''} controls preload="metadata" playsinline></video>
      <div><strong>${esc(L(v.media.title))}</strong>
        <p class="lh-card__meta">${[v.media.courseTitle ? t('vdFromCourse', { course: L(v.media.courseTitle) }) : '', v.media.fileName || '', fmtSecs(v.media.seconds)].filter(Boolean).map(esc).join(' · ')}</p>
        ${L(v.media.description) ? `<p class="lh-card__meta">${esc(L(v.media.description))}</p>` : ''}
        ${L(v.media.transcript) ? `<details class="lh-mat__facts"><summary>${esc(t('blockVideoTranscript'))}</summary><p>${esc(L(v.media.transcript))}</p></details>` : `<p class="lh-card__meta">${esc(t('vdNoTranscript'))}</p>`}</div>
    </div>`;
  const videoHtml = v => {
    const src = v.source || 'script';
    const radio = (val, label) => `<label class="lh-seg"><input type="radio" name="src-${esc(v.id)}" value="${val}" data-src="${esc(v.id)}" ${src === val ? 'checked' : ''} ${dis}><span>${esc(t(label))}</span></label>`;
    return `
    <section class="zn-card lh-card lh-vd" data-video="${esc(v.id)}">
      <div class="lh-row"><span class="lh-stcard__icon">${icon('videos')}</span><h2 class="lh-card__title" style="margin:0">${esc(v.topic)}</h2><span class="lh-spacer"></span>
        ${sourceChip(v)}</div>
      <div class="lh-form__row">
        <label class="lh-field"><span class="lh-field__label">${esc(t('vdPlacedIn'))}</span>
          <select class="lh-input" name="lesson" ${dis}>${lessons.map(l => `<option value="${esc(l.id)}" ${l.id === placed(v.id) ? 'selected' : ''}>${esc(l.label)}</option>`).join('')}</select></label>
      </div>
      <fieldset class="lh-segs" data-src-group><legend class="lh-field__label">${esc(t('vdSource'))}</legend>
        ${radio('script', 'vdSrcScript')}${radio('upload', 'vdSrcUpload')}${radio('library', 'vdSrcLibrary')}</fieldset>

      <div data-src-pane="script" ${src !== 'script' ? 'hidden' : ''}>
        <fieldset class="lh-field lh-vd-style"><legend class="lh-field__label">${esc(t('vdStyle'))}</legend>
          <label class="lh-option"><input type="radio" name="style-${esc(v.id)}" value="scene" ${v.style !== 'presenter' ? 'checked' : ''} ${dis}><span>${esc(t('vdStyleScene'))}</span></label>
          <label class="lh-option"><input type="radio" name="style-${esc(v.id)}" value="presenter" ${v.style === 'presenter' ? 'checked' : ''} ${dis}><span>${esc(t('vdStylePresenter'))}</span></label></fieldset>
        <label class="lh-field"><span class="lh-field__label">${esc(t('vdTeach'))}</span><textarea class="lh-input" rows="2" name="teach" placeholder="${esc(t('vdTeachPh'))}" ${dis}>${esc(v.teach)}</textarea></label>
        <label class="lh-field"><span class="lh-field__label">${esc(t('vdAspects'))}</span><textarea class="lh-input" rows="2" name="aspects" placeholder="${esc(t('vdAspectsPh'))}" ${dis}>${esc(v.aspects)}</textarea></label>
        <label class="lh-field"><span class="lh-field__label">${esc(t('vdConversation'))} <span class="lh-muted">${esc(t('optional'))}</span></span><textarea class="lh-input" rows="4" name="conversation" placeholder="${esc(t('vdConversationPh'))}" ${dis}>${esc(v.conversation)}</textarea></label>
        ${canEdit ? `<div class="lh-row"><button type="button" class="zn-button ${v.script ? 'zn-button--ghost' : ''}" data-write="${esc(v.id)}">${esc(t(v.script ? 'vdRewrite' : 'vdWrite'))}</button></div>` : ''}
        <div data-script-box="${esc(v.id)}">${scriptHtml(v, v.script)}</div>
        <div class="lh-vd-render">
          <button type="button" class="zn-button zn-button--ghost zn-button--small" disabled>${esc(t('vdRender'))}</button>
          <span class="lh-card__meta">${esc(t('vdRenderNote'))}</span>
        </div>
      </div>

      <div data-src-pane="upload" data-up ${src !== 'upload' ? 'hidden' : ''}>
        ${src === 'upload' ? mediaHtml(v) : ''}
        ${canEdit ? `<div class="lh-vd-upload">
          <p class="lh-kicker">${esc(t(src === 'upload' && v.media ? 'vdReplaceUpload' : 'vdUploadTitle'))}</p>
          <p class="lh-st-privacy">${esc(t('vdUploadPrivacy'))}</p>
          <label class="lh-field"><span class="lh-field__label">${esc(t('vdFile'))}</span><input class="lh-input" type="file" accept="video/mp4,video/webm,.mp4,.webm" data-up-file></label>
          <label class="lh-field"><span class="lh-field__label">${esc(t('fTitle'))}</span><input class="lh-input" maxlength="200" data-up-title value="${esc(v.topic)}"></label>
          <label class="lh-field"><span class="lh-field__label">${esc(t('vdDescription'))} <span class="lh-muted">${esc(t('optional'))}</span></span><textarea class="lh-input" rows="2" maxlength="600" data-up-desc></textarea></label>
          <label class="lh-field"><span class="lh-field__label">${esc(t('vdTranscript'))} <span class="lh-muted">${esc(t('optional'))}</span></span>
            <textarea class="lh-input" rows="3" maxlength="6000" data-up-transcript placeholder="${esc(t('vdTranscriptPh'))}"></textarea></label>
          <label class="lh-option"><input type="checkbox" data-up-pending><span><strong>${esc(t('matPendingCheck'))}</strong><br><span class="lh-card__meta">${esc(t('vdPendingHint'))}</span></span></label>
          <div class="lh-row"><button type="button" class="zn-button" data-upload-video="${esc(v.id)}">${esc(t('vdUploadBtn'))}</button>
            <span class="lh-card__meta" data-up-state aria-live="polite"></span></div>
          <div class="lh-meter lh-up-meter" data-up-meter hidden><span class="lh-meter__track"><span class="lh-meter__fill" style="width:0%"></span></span></div>
          <div data-up-error></div>
        </div>` : ''}
      </div>

      <div data-src-pane="library" data-up ${src !== 'library' ? 'hidden' : ''}>
        ${src === 'library' ? mediaHtml(v) : ''}
        <p class="lh-card__meta">${esc(t('vdLibraryLead'))}</p>
        <div class="lh-vlib-grid" data-library="${esc(v.id)}"></div>
      </div>
    </section>`;
  };
  el.innerHTML = `${cardHead(ctx, 'videos', t('vdLead'))}
    ${info.state === 'locked' ? '' : `<form data-videos>${st.videos.map(videoHtml).join('')}</form>`}
    ${cardBar(ctx, 'videos', canEdit ? `<button type="button" class="zn-button zn-button--ghost" data-save disabled>${esc(t('saveChanges'))}</button>` : '')}`;
  const form = el.querySelector('[data-videos]');
  const saveBtn = el.querySelector('[data-save]');
  let dirty = false;
  const collect = () => st.videos.map(v => {
    const box = form.querySelector(`[data-video="${CSS.escape(v.id)}"]`);
    const val = n => box.querySelector(`[name="${n}"]`)?.value;
    return { id: v.id, lesson: val('lesson'), teach: val('teach'), aspects: val('aspects'), conversation: val('conversation'), style: box.querySelector(`input[name="style-${CSS.escape(v.id)}"]:checked`)?.value };
  });
  const save = async () => { if (!dirty) return; await api(`/api/projects/${mod.id}/videos`, { method: 'PUT', body: { videos: collect() } }); dirty = false; };
  const fail = wireBar(ctx, 'videos', { beforeComplete: async () => { await save(); await Promise.all([...scriptSaves.values()].map(f => f())); } });
  if (!form) return;
  // Details vs script edits: script fields carry data-sf and have their own save button.
  const scriptSaves = new Map();
  form.addEventListener('input', e => {
    if (e.target.closest('[data-up], [data-src-group]')) return;
    const box = e.target.closest('[data-script]');
    if (box) { const b = box.querySelector('[data-save-script]'); if (b) b.disabled = false; scriptSaves.set(box.dataset.script, () => saveScript(box.dataset.script)); barState(el, t('unsaved')); return; }
    dirty = true; if (saveBtn) saveBtn.disabled = false; barState(el, t('unsaved'));
  });
  form.addEventListener('change', e => { if (!e.target.closest('[data-script], [data-up], [data-src-group]')) { dirty = true; if (saveBtn) saveBtn.disabled = false; } });

  // --- Where each video comes from: AI script, upload, or the library ---
  let lib = null;
  const loadLibrary = async () => (lib ||= await api('/api/videos'));
  const paintLibrary = async vid => {
    const box = form.querySelector(`[data-library="${CSS.escape(vid)}"]`);
    if (!box) return;
    box.innerHTML = `<p class="lh-card__meta"><span class="lh-spinner lh-spinner--inline" aria-hidden="true"></span> ${esc(t('loading'))}</p>`;
    const items = await loadLibrary();
    const v = st.videos.find(x => x.id === vid);
    box.innerHTML = items.map(it => {
      const chosen = v.source === 'library' && v.media?.libraryId === it.id;
      return `<article class="lh-vlib ${chosen ? 'is-chosen' : ''}">
        ${it.poster ? `<img src="${esc(L(it.poster))}" alt="" loading="lazy">` : `<video src="${esc(L(it.url) || it.url)}#t=1" preload="metadata" muted playsinline aria-hidden="true"></video>`}
        <strong>${esc(L(it.title))}</strong>
        <p class="lh-card__meta">${esc([it.courseTitle ? t('vdFromCourse', { course: L(it.courseTitle) }) : t(it.kind === 'upload' ? 'vdUploadedBy' : 'vdSample'), fmtSecs(it.seconds)].filter(Boolean).join(' · '))}</p>
        <div class="lh-row">${it.status === 'pending' ? chip('changes_requested', t('vdPendingMlr')) : chip('approved', t('matApproved'))}<span class="lh-spacer"></span>
          ${canEdit ? `<button type="button" class="zn-button zn-button--small ${chosen ? 'zn-button--ghost' : ''}" data-pick="${esc(it.id)}" data-pick-for="${esc(vid)}" ${chosen ? 'disabled' : ''}>${esc(t(chosen ? 'vdChosen' : 'vdUseThis'))}</button>` : ''}</div>
      </article>`;
    }).join('') || `<p class="lh-card__meta">${esc(t('vdLibraryEmpty'))}</p>`;
  };
  const setMedia = async (vid, body) => { try { await save(); await api(`/api/projects/${mod.id}/videos/${vid}/media`, { method: 'POST', body }); ctx.reload(); } catch (err) { fail(err); } };
  form.querySelectorAll('[data-src]').forEach(r => r.addEventListener('change', () => {
    const box = form.querySelector(`[data-video="${CSS.escape(r.dataset.src)}"]`);
    box.querySelectorAll('[data-src-pane]').forEach(p => { p.hidden = p.dataset.srcPane !== r.value; });
    const v = st.videos.find(x => x.id === r.dataset.src);
    if (r.value === 'library') paintLibrary(v.id).catch(fail);
    if (r.value === 'script' && (v.source || 'script') !== 'script') setMedia(v.id, { mode: 'script' });
  }));
  st.videos.filter(v => v.source === 'library').forEach(v => paintLibrary(v.id).catch(fail));
  form.addEventListener('click', e => {
    const pick = e.target.closest('[data-pick]');
    if (pick) { pick.disabled = true; setMedia(pick.dataset.pickFor, { mode: 'library', libraryId: pick.dataset.pick }); }
  });
  form.querySelectorAll('[data-upload-video]').forEach(btn => btn.addEventListener('click', async () => {
    const vid = btn.dataset.uploadVideo;
    const pane = btn.closest('[data-src-pane]');
    const q = sel => pane.querySelector(sel);
    const file = q('[data-up-file]').files[0];
    const stateEl = q('[data-up-state]'), errEl = q('[data-up-error]'), meterEl = q('[data-up-meter]');
    errEl.innerHTML = '';
    if (!file) return q('[data-up-file]').focus();
    if (!['video/mp4', 'video/webm'].includes(file.type)) { errEl.innerHTML = `<p class="lh-error">${esc(t('vdWrongType'))}</p>`; return; }
    if (file.size > 50 * 1024 * 1024) { errEl.innerHTML = `<p class="lh-error">${esc(t('vdTooBig'))}</p>`; return; }
    busy(btn, 'vdUploading');
    try {
      // Length, read in the browser.
      const seconds = await new Promise(resolve => {
        const probe = document.createElement('video');
        probe.preload = 'metadata';
        probe.onloadedmetadata = () => { resolve(Math.round(probe.duration) || null); URL.revokeObjectURL(probe.src); };
        probe.onerror = () => resolve(null);
        probe.src = URL.createObjectURL(file);
      });
      const target = await api(`/api/projects/${mod.id}/videos/${vid}/upload-url`, { method: 'POST', body: { name: file.name, size: file.size, type: file.type } });
      meterEl.hidden = false;
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', target.url);
        Object.entries(target.headers || {}).forEach(([k, val]) => xhr.setRequestHeader(k, val));
        xhr.upload.onprogress = ev => { if (ev.lengthComputable) { const pct = Math.round((ev.loaded / ev.total) * 100); meterEl.querySelector('.lh-meter__fill').style.width = `${pct}%`; stateEl.textContent = t('vdUploadPct', { n: pct }); } };
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(t('vdUploadFail'))));
        xhr.onerror = () => reject(new Error(t('vdUploadFail')));
        xhr.send(file);
      });
      stateEl.textContent = t('saving');
      await setMedia(vid, { mode: 'upload', path: target.path, fileName: file.name, seconds, title: q('[data-up-title]').value,
        description: q('[data-up-desc]').value, transcript: q('[data-up-transcript]').value, pending: q('[data-up-pending]').checked });
    } catch (err) { unbusy(btn); stateEl.textContent = ''; meterEl.hidden = true; errEl.innerHTML = errorBox(err); }
  }));
  saveBtn?.addEventListener('click', async () => { saveBtn.disabled = true; try { await save(); ctx.reload(); } catch (err) { saveBtn.disabled = false; fail(err); } });
  async function saveScript(vid) {
    const box = form.querySelector(`[data-script="${CSS.escape(vid)}"]`);
    const v = st.videos.find(x => x.id === vid);
    const get = k => box.querySelector(`[data-sf="${k}"]`)?.value;
    const script = { title: get('title'), summary: get('summary'),
      scenes: v.script.scenes.map((sc, i) => ({ setting: get(`scenes.${i}.setting`), onscreen: get(`scenes.${i}.onscreen`), lines: sc.lines.map((_, j) => ({ text: get(`scenes.${i}.lines.${j}`) })) })) };
    await api(`/api/projects/${mod.id}/videos/${vid}/script`, { method: 'PUT', body: { script } });
    scriptSaves.delete(vid);
  }
  form.querySelectorAll('[data-save-script]').forEach(b => b.addEventListener('click', async () => {
    b.disabled = true; try { await saveScript(b.dataset.saveScript); ctx.reload(); } catch (err) { b.disabled = false; fail(err); }
  }));
  form.querySelectorAll('[data-write]').forEach(b => b.addEventListener('click', async () => {
    const vid = b.dataset.write;
    const v = st.videos.find(x => x.id === vid);
    if (v.script && !confirm(t('vdRewriteConfirm'))) return;
    try { await save(); } catch (err) { return fail(err); }
    busy(b, 'vdWriting');
    const box = form.querySelector(`[data-script-box="${CSS.escape(vid)}"]`);
    let raw = '', frame = false;
    try {
      await streamNdjson(`/api/projects/${mod.id}/videos/${vid}/script`, {}, ev => {
        if (ev.kind !== 'script') return;
        raw += ev.text;
        if (!frame) { frame = true; requestAnimationFrame(() => { frame = false; box.innerHTML = scriptHtml(v, parsePartial(raw) || {}, true); }); }
      });
      ctx.reload();
    } catch (err) { unbusy(b); fail(err); }
  }));
}

// ================================ Content: generate ================================
function contentCard(ctx) {
  const { el, mod, meta, ro } = ctx;
  const st = mod.studio;
  const info = cardInfo(mod, 'content');
  const o = st.outline;
  el.innerHTML = `${cardHead(ctx, 'content', t('ctLead'))}
    ${info.state === 'locked' || !o ? '' : `<section class="zn-card lh-card lh-ol-empty">
      <h2 class="lh-card__title">${esc(t('ctReadyTitle'))}</h2>
      <p class="lh-card__meta">${esc(t('ctReadyLead'))}</p>
      <ol class="lh-wz-sumlist">${o.sections.map((s, i) => `<li><strong>${esc(t('sectionN', { n: i + 1 }))}: ${esc(s.title)}</strong> · ${esc(t('ctLessons', { n: s.lessons.length, min: s.lessons.reduce((a, l) => a + l.minutes, 0) }))}${s.quiz ? ` · ${esc(t('wzQuizLine', { n: s.quiz }))}` : ''}</li>`).join('')}</ol>
      <p class="lh-card__meta">${esc(t('ctAddedLater'))}</p>
      ${ro ? '' : `<div class="lh-row"><button type="button" class="zn-button" data-generate>${esc(t('ctGenerate'))}</button></div>`}
      <div data-error></div>
    </section>`}`;
  el.querySelector('[data-generate]')?.addEventListener('click', async () => {
    const onEvent = storyboard(el, meta, { titleKey: 'ctGenerating', outline: o });
    window.scrollTo({ top: 0 });
    try {
      await streamNdjson(`/api/projects/${mod.id}/generate`, {}, onEvent);
      await renderStudio(el, ctx.user, mod.id, 'content');
    } catch (err) {
      await ctx.reload();
      const box = el.querySelector('[data-error]'); if (box) box.innerHTML = errorBox(err);
    }
  });
}

// ================================ Preview & submit ================================
function previewCard(ctx) {
  const { el, mod, meta, ro } = ctx;
  const st = mod.studio;
  const lang = mod.sourceLang || st.lang;
  const src = f => (f && (f[lang] || f.en || f.es)) || '';
  const info = cardInfo(mod, 'preview');
  const notes = { ...(st.notes || {}) };
  const others = activeCards(st.spec).filter(k => k !== 'preview');
  const allDone = others.every(k => cardInfo(mod, k).state === 'complete');
  // Sent back by the reviewers: every comment, grouped by section and part, with what the creator did about it.
  const back = mod.status === 'changes_requested';
  const all = creatorComments(mod), openN = all.filter(isOpenComment).length;
  const forPart = key => all.filter(c => (c.target || '') === key);
  const commentCount = key => { const n = forPart(key).filter(isOpenComment).length; return n ? chip('changes_requested', t('ccOpenN', { n })) : ''; };
  const fixable = all.filter(c => isOpenComment(c) && ['content', 'practice', 'preview'].includes(commentCard(mod, c)));
  let gn = 0;
  const group = (label, list) => !list.length ? '' : `<div class="lh-cm-group"><p class="lh-kicker">${esc(label)}</p>${commentListHtml(mod, list, ctx.users, { showWhere: false })}</div>`;
  const allCommentsHtml = !back ? '' : `
    <section class="zn-card lh-card lh-cc-panel" data-cc-panel>
      <div class="lh-row"><h2 class="lh-card__title" style="margin:0">${esc(t('ccAllTitle'))}</h2><span class="lh-spacer"></span>
        <span class="lh-card__meta">${esc(openN ? t('ccOpenOf', { open: openN, n: all.length }) : t('ccAllDone'))}</span></div>
      <p class="lh-card__meta">${esc(t('ccAllLead'))}</p>
      ${group(t('targetModule'), forPart(''))}
      ${group(t('targetMaterials'), forPart('materials'))}
      ${mod.sections.map((s, i) => {
        const parts = [...s.lessons.map(l => [l.id, t('targetLesson', { n: ++gn, title: src(l.title) })]), [`quiz:${s.id}`, t('targetQuiz', { n: i + 1 })], [`boss:${s.id}`, t('targetBoss', { n: i + 1 })]];
        const body = parts.map(([k, label]) => group(label, forPart(k))).join('');
        return body ? `<div class="lh-cc-section"><p class="lh-cc-section__title">${esc(t('sectionN', { n: i + 1 }))} · ${esc(src(s.title))}</p>${body}</div>` : '';
      }).join('')}
      ${fixable.length ? `<div class="lh-row"><button type="button" class="zn-button" data-fix-all>${esc(t('ccFixAll', { n: fixable.length }))}</button>
        <span class="lh-card__meta">${esc(t('ccFixAllNote'))}</span></div>` : ''}
      <div data-cc-error></div>
    </section>`;
  const otherLang = lang === 'en' ? 'es' : 'en';
  let n = 0;
  const noteBox = (target, label) => ro ? (notes[target] ? `<p class="lh-card__meta">${esc(notes[target])}</p>` : '') : `
    <label class="lh-field lh-pv-note"><span class="lh-field__label">${esc(label)}</span>
      <textarea class="lh-input" rows="2" data-note="${esc(target)}" placeholder="${esc(t('pvNotePh'))}">${esc(notes[target] || '')}</textarea></label>`;
  const lessonRow = (l) => `
    <li class="lh-pv-item" data-pv="${esc(l.id)}">
      <div class="lh-row"><span class="lh-ol-n" aria-hidden="true">${++n}</span><div class="lh-pv-item__text"><strong>${esc(src(l.title))}</strong>
        <p class="lh-card__meta">${esc(t(`pillar_${l.pillar}`))} · ${esc(t('minutes', { n: l.minutes }))}${l.blocks?.some(b => b.type === 'video') ? ` · ${esc(t('pvHasVideo'))}` : ''} ${commentCount(l.id)}</p></div>
        <span class="lh-spacer"></span><button type="button" class="zn-button zn-button--ghost zn-button--small" data-open="${esc(l.id)}" aria-expanded="false">${esc(t('pvPreview'))}</button></div>
      <div class="lh-pv-body" data-body="${esc(l.id)}" hidden></div>
      ${noteBox(l.id, t('pvNoteLabel'))}
    </li>`;
  const quizRow = s => !s.quiz.length ? '' : `
    <li class="lh-pv-item" data-pv="quiz:${esc(s.id)}">
      <div class="lh-row"><span class="lh-ol-n lh-ol-n--alt" aria-hidden="true">?</span><div class="lh-pv-item__text"><strong>${esc(t('quizTitle'))}</strong><p class="lh-card__meta">${esc(t('wzQuizLine', { n: s.quiz.length }))} ${commentCount(`quiz:${s.id}`)}</p></div>
        <span class="lh-spacer"></span><button type="button" class="zn-button zn-button--ghost zn-button--small" data-open="quiz:${esc(s.id)}" aria-expanded="false">${esc(t('pvPreview'))}</button></div>
      <div class="lh-pv-body" data-body="quiz:${esc(s.id)}" hidden>
        <ol class="lh-rv-quiz">${s.quiz.map((q, i) => `<li data-bi="${i}" data-bt="question"><p class="lh-rv-q">${esc(src(q.q))}</p><ul>${q.options.map((o, k) => `<li class="${k === q.answer ? 'lh-rv-correct' : ''}">${esc(src(o))}${k === q.answer ? ` · ${esc(t('correctAnswer'))}` : ''}</li>`).join('')}</ul></li>`).join('')}</ol>
      </div>
      ${noteBox(`quiz:${s.id}`, t('pvNoteLabel'))}
    </li>`;
  const bossRow = s => {
    if (!s.boss) return '';
    const p = meta.personas.find(x => x.id === s.boss.persona);
    const o = objectionOf(meta, s.boss);
    return `<li class="lh-pv-item lh-pv-item--boss">
      <div class="lh-row"><span class="lh-ol-n lh-ol-n--alt" aria-hidden="true">★</span><div class="lh-pv-item__text"><strong>${esc(t('finalChallenge'))} · ${esc(p?.name || '')}</strong>
        <p class="lh-card__meta">${esc(t(`practiceMode_${s.boss.mode || 'chat'}`))} · ${esc(t('minutes', { n: s.boss.minutes }))}${o ? ` · ${esc(L(o.text))}` : ''}</p></div></div>
      <p>${esc(src(s.boss.brief))}</p>
      ${s.boss.criteria?.length ? `<ul class="lh-ol-points">${s.boss.criteria.map(c => `<li>${esc(src(c))}</li>`).join('')}</ul>` : ''}
      ${ro ? '' : `<a class="lh-link" href="#/studio/${esc(mod.id)}/practice">${esc(t('pvEditPractice'))}</a>`}
    </li>`;
  };
  const check = (ok, label) => `<li class="lh-pv-check ${ok ? 'is-ok' : ''}"><span aria-hidden="true">${ok ? '✓' : '○'}</span> ${esc(label)}</li>`;
  el.innerHTML = `${cardHead(ctx, 'preview', t('pvLead'))}
    ${info.state === 'locked' && !ro ? '' : `
    <section class="zn-card lh-card">
      <h2 class="lh-card__title">${esc(t('pvChecklist'))}</h2>
      <ul class="lh-pv-checks">
        ${back ? check(!openN, openN ? t('ccCheckOpen', { n: openN }) : t('ccCheckDone')) : ''}
        ${others.map(k => check(cardInfo(mod, k).state === 'complete', cardName(k))).join('')}
        <li class="lh-pv-check ${mod.translation === 'done' ? 'is-ok' : ''}" data-translation><span aria-hidden="true">${mod.translation === 'done' ? '✓' : '○'}</span> ${esc(t(mod.translation === 'done' ? 'translation_done' : 'translation_pending', { other: t(`lang_${otherLang}`) }))}</li>
        <li class="lh-pv-check ${Object.keys(notes).length ? '' : 'is-ok'}" data-notes-check><span aria-hidden="true">${Object.keys(notes).length ? '○' : '✓'}</span> <span data-notes-label>${esc(Object.keys(notes).length ? t('pvNotesOpen', { n: Object.keys(notes).length }) : t('pvNoNotes'))}</span></li>
      </ul>
    </section>
    ${allCommentsHtml}
    ${mod.sections.map((s, i) => `<section class="zn-card lh-card lh-section-card">
      <p class="lh-kicker">${esc(t('sectionN', { n: i + 1 }))}</p>
      <h2 class="lh-card__title">${esc(src(s.title))}</h2>
      <ul class="lh-pv-list">${s.lessons.map(lessonRow).join('')}${quizRow(s)}${bossRow(s)}</ul>
    </section>`).join('')}`}
    ${ro || info.state === 'locked' ? '' : `<div class="lh-actionbar" role="region" aria-label="${esc(cardName('preview'))}">
      <span class="lh-card__meta" data-bar-state aria-live="polite"></span><span class="lh-spacer"></span>
      <button type="button" class="zn-button zn-button--ghost" data-apply ${Object.keys(notes).length ? '' : 'disabled'}>${esc(t('pvApply', { n: Object.keys(notes).length }))}</button>
      <button type="button" class="zn-button" data-submit ${allDone && !Object.keys(notes).length && !openN ? '' : 'disabled'}>${esc(t(back ? 'resubmit' : 'submitForApproval'))}</button>
    </div><div data-error></div>`}`;
  const errBox = el.querySelector('[data-error]');
  const fail = err => { if (errBox) { errBox.innerHTML = errorBox(err); errBox.scrollIntoView({ block: 'center' }); } };

  // Preview a lesson exactly as learners see it.
  el.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.open;
    const body = el.querySelector(`[data-body="${CSS.escape(id)}"]`);
    const open = body.hidden;
    body.hidden = !open; b.setAttribute('aria-expanded', String(open)); b.textContent = t(open ? 'pvClose' : 'pvPreview');
    if (open && !id.startsWith('quiz:') && !body.innerHTML.trim()) {
      const l = mod.sections.flatMap(s => s.lessons).find(x => x.id === id);
      body.innerHTML = `<article class="lh-article"><p class="lh-hero__lead">${esc(L(l.summary))}</p><div class="lh-blocks">${renderBlocks(lessonBlocks(l), `pv-${l.id}`)}</div></article>`;
      wireBlocks(body);
    }
    if (open && back && !body.dataset.anchored) {
      body.dataset.anchored = '1';
      const { pins } = paintAnchors(k => (k === id ? body : null), forPart(id), { markClass: list => (list.some(isOpenComment) ? 'lh-anno--other' : 'lh-anno--done') });
      body._pins = pins;
    }
  }));
  // "Show me" from the list: opens the lesson (or quiz) preview and highlights the text; other cards open their card.
  const showComment = c => {
    const card = commentCard(mod, c);
    if (card === 'practice' || card === 'materials') { location.hash = `#/studio/${mod.id}/${card}`; return; }
    const key = c.target || '';
    const btn = el.querySelector(`[data-open="${CSS.escape(key)}"]`);
    if (!btn) { const first = el.querySelector('[data-cc-panel]'); if (first) reveal(first, [first]); return; }
    const body = el.querySelector(`[data-body="${CSS.escape(key)}"]`);
    if (body.hidden) btn.click();
    const pinId = [...(body._pins || new Map()).entries()].find(([, ids]) => ids.includes(c.id))?.[0];
    if (!pinId || !revealPin(body, pinId)) reveal(body.closest('.lh-pv-item'), [body.closest('.lh-pv-item')]);
  };
  el.addEventListener('click', e => {
    const pin = e.target.closest('.lh-anno__pin');
    if (!pin) return;
    const body = pin.closest('[data-body]');
    const ids = body?._pins?.get(pin.dataset.pin) || [];
    const first = el.querySelector(`[data-cc="${CSS.escape(ids[0] || '')}"]`);
    if (first) reveal(first, [first]);
  });
  const ccPanel = el.querySelector('[data-cc-panel]');
  if (ccPanel && !ro) {
    wireCreatorComments(ccPanel, mod, { onShow: showComment, reload: ctx.reload, storyboard: () => storyboard(el, meta, { titleKey: 'revising', base: mod }) });
    el.querySelector('[data-fix-all]')?.addEventListener('click', async () => {
      const onEvent = storyboard(el, meta, { titleKey: 'revising', base: mod });
      window.scrollTo({ top: 0 });
      try { await streamNdjson(`/api/builder/${mod.id}/revise`, { commentIds: fixable.map(c => c.id) }, onEvent); await ctx.reload(); }
      catch (err) { await ctx.reload(); const box = el.querySelector('[data-error]'); if (box) box.innerHTML = errorBox(err); }
    });
  }
  if (ro || info.state === 'locked') return;

  // Translation (the other language) runs in the background while the creator previews.
  if (mod.translation === 'pending') {
    api(`/api/builder/${mod.id}/translate`, { method: 'POST' }).then(m => {
      mod.translation = m.translation;
      const li = el.querySelector('[data-translation]');
      if (li && m.translation === 'done') { li.classList.add('is-ok'); li.innerHTML = `<span aria-hidden="true">✓</span> ${esc(t('translation_done', { other: t(`lang_${otherLang}`) }))}`; }
    }).catch(() => {});
  }

  // Notes autosave.
  let timer = null;
  const applyBtn = el.querySelector('[data-apply]'), submitBtn = el.querySelector('[data-submit]');
  const refreshNotes = () => {
    const k = Object.keys(notes).length;
    applyBtn.disabled = !k; applyBtn.textContent = t('pvApply', { n: k });
    submitBtn.disabled = !(allDone && !k && !openN);
    const c = el.querySelector('[data-notes-check]');
    c.classList.toggle('is-ok', !k); c.querySelector('span').textContent = k ? '○' : '✓';
    el.querySelector('[data-notes-label]').textContent = k ? t('pvNotesOpen', { n: k }) : t('pvNoNotes');
  };
  const saveNotes = async () => { clearTimeout(timer); await api(`/api/projects/${mod.id}/notes`, { method: 'PUT', body: { notes } }); barState(el, t('saved')); };
  el.querySelectorAll('[data-note]').forEach(ta => ta.addEventListener('input', () => {
    const v = ta.value.trim();
    if (v) notes[ta.dataset.note] = v; else delete notes[ta.dataset.note];
    refreshNotes(); barState(el, t('saving'));
    clearTimeout(timer); timer = setTimeout(() => saveNotes().catch(fail), 700);
  }));
  applyBtn.addEventListener('click', async () => {
    try { await saveNotes(); } catch (err) { return fail(err); }
    const onEvent = storyboard(el, meta, { titleKey: 'revising', base: mod });
    window.scrollTo({ top: 0 });
    try { await streamNdjson(`/api/builder/${mod.id}/revise`, { useNotes: true }, onEvent); await ctx.reload(); }
    catch (err) { await ctx.reload(); const box = el.querySelector('[data-error]'); if (box) box.innerHTML = errorBox(err); }
  });
  submitBtn.addEventListener('click', async () => {
    if (!confirm(t('submitConfirm', { title: src(mod.title) }))) return;
    busy(submitBtn, 'submitting');
    try { await api(`/api/modules/${mod.id}/submit`, { method: 'POST' }); location.hash = `#/studio/${mod.id}`; }
    catch (err) { unbusy(submitBtn); fail(err); }
  });
}
