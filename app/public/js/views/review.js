// #/review/:id — Approver: read the whole module, run the AI pre-check through the team's lens, comment right on
// the text (select it, then "Comment"), see and back the other teams' comments, then approve or request changes.
// The Training Manager (admin) comments the same way and, once all four teams approved, goes live or sends it back.
// Comments are stored on the server as soon as they are written, so every approver sees them (marked "Draft"
// until that team sends its decision). The creator only sees them once they are sent.
import { api, streamNdjson } from '../api.js';
import { t, L, getLang } from '../i18n.js';
import { esc, chip, statusChip, reviewChip, errorBox, fmtDate, objectionOf } from '../ui.js';
import { renderBlocks, lessonBlocks, wireBlocks } from '../blocks.js';
import { parsePartial } from '../partial-json.js';
import { markQuote, clearMarks, reveal, blockOf, findQuote } from '../anchor.js';
import { changedSince } from '../studio-rules.js';
import { ICON_COMMENT, teamName, teamChip, commentWhere, answerChip, paintAnchors, revealPin, openPop, closePop, popEl } from '../comments-ui.js';

const TEAMS = ['training', 'sales', 'marketing', 'mlr'];
const SEV = ['high', 'medium', 'low'];
const ICON_SPARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>';

export async function renderReview(el, user, moduleId, flash = null) {
  const [mod, meta, users, library] = await Promise.all([api(`/api/modules/${moduleId}`), api('/api/meta'), api('/api/users'), api('/api/materials')]);
  // Uploaded materials that are not MLR-approved yet are flagged to every reviewer.
  const pendingMats = library.filter(m => m.status === 'pending' && (mod.sources || []).includes(m.id));
  const lang = getLang();
  const isAdmin = user.role === 'admin';
  const isApprover = user.role === 'approver';
  const myTeam = isAdmin ? 'admin' : user.team || null;
  const mine = isApprover ? mod.reviews?.[myTeam] : null;
  const canDecide = isApprover && mod.status === 'in_review' && mine?.state === 'pending';
  const canComment = canDecide || (isAdmin && ['in_review', 'approved'].includes(mod.status));
  const nameOf = id => users.find(u => u.id === id)?.name || '';
  const sourceTitle = id => L(meta.product.sources.find(s => s.id === id)?.title) || L(library.find(m => m.id === id)?.title) || id;
  const where = target => commentWhere(mod, target);
  const allLessons = mod.sections.flatMap(s => s.lessons);
  let comments = mod.comments || [];
  const current = () => comments.filter(c => c.round === mod.round);
  const previous = () => comments.filter(c => c.sent && c.round === (mod.round || 1) - 1);
  const changed = changedSince(mod) || {};
  const prevRound = (mod.round || 1) - 1;

  // The latest pre-check for this team and round (stored on the module), or one running now.
  let pc = isApprover && mod.prechecks?.[myTeam]?.round === mod.round ? mod.prechecks[myTeam] : null;
  let running = null;   // { parts: {key: {done, text, findings}} }

  // ------------------------------------------------ Content ------------------------------------------------
  const partHead = (kicker, title, extra = '') => `<summary>
      <span class="lh-kicker">${esc(kicker)}</span>
      <strong class="lh-edit-lesson__title">${esc(title)}</strong>
      <span class="lh-row">${extra}<span data-part-chips></span></span>
    </summary>`;
  // Comments on the part that are not tied to a piece of text, and a way to add one.
  const partFoot = target => `
      <div class="lh-rv-commenting" data-anchor-skip>
        <ul class="lh-cm-list" data-general="${esc(target)}"></ul>
        ${canComment ? `<button type="button" class="lh-link" data-general-add="${esc(target)}">+ ${esc(t('addGeneralOn'))}</button>` : ''}
      </div>`;
  const changedChip = key => (changed[key] ? chip('in_review', t('changedSince', { n: prevRound })) : '');

  const lessonPart = (l, i) => `
    <details class="lh-edit-lesson lh-rv-part" data-part="${esc(l.id)}">
      ${partHead(t('lessonLabel', { n: i + 1 }), L(l.title), `${chip('pending', t(`pillar_${l.pillar}`))}<span class="lh-muted">${esc(t('readTime', { n: l.minutes }))}</span>${changedChip(l.id)}`)}
      <div class="lh-edit-lesson__body lh-rv-body">
        <div class="lh-rv-text" data-text="${esc(l.id)}">
          ${L(l.summary) ? `<p class="lh-hero__lead">${esc(L(l.summary))}</p>` : ''}
          <div class="lh-blocks">${renderBlocks(lessonBlocks(l), `rv-${l.id}`)}</div>
        </div>
        ${l.sources?.length ? `<p class="lh-card__meta">${esc(t('sourcesUsed'))}: ${l.sources.map(id => `<span class="lh-source">${esc(sourceTitle(id))}</span>`).join(' ')}</p>` : ''}
        ${partFoot(l.id)}
      </div>
    </details>`;

  const quizPart = s => !s.quiz.length ? '' : `
    <details class="lh-edit-lesson lh-rv-part" data-part="quiz:${esc(s.id)}">
      ${partHead(t('quizTitle'), t('quizCount', { n: s.quiz.length }), changedChip(`quiz:${s.id}`))}
      <div class="lh-edit-lesson__body lh-rv-body">
        <p class="lh-card__meta">${esc(t('answerKeyNote'))}</p>
        <div class="lh-rv-text" data-text="quiz:${esc(s.id)}">
        <ol class="lh-rv-quiz">${s.quiz.map((q, i) => `<li data-bi="${i}" data-bt="question"><p class="lh-rv-q">${esc(L(q.q))}</p>
          <ul>${q.options.map((o, k) => `<li class="${k === q.answer ? 'lh-rv-correct' : ''}">${esc(L(o))}${k === q.answer ? ` <span data-anchor-skip>${chip('approved', t('correctAnswer'))}</span>` : ''}</li>`).join('')}</ul></li>`).join('')}</ol>
        </div>
        ${partFoot(`quiz:${s.id}`)}
      </div>
    </details>`;

  const bossPart = s => {
    const b = s.boss;
    if (!b) return '';
    const persona = meta.personas.find(p => p.id === b.persona);
    const objection = objectionOf(meta, b);
    return `
    <details class="lh-edit-lesson lh-rv-part lh-rv-part--boss" data-part="boss:${esc(s.id)}">
      ${partHead(t('challengeLabel'), persona ? `${persona.name} · ${L(persona.role)}` : '', changedChip(`boss:${s.id}`))}
      <div class="lh-edit-lesson__body lh-rv-body">
        <div class="lh-rv-text" data-text="boss:${esc(s.id)}">
        <dl class="lh-rv-facts" data-bi="0" data-bt="boss">
          <div><dt>${esc(t('objectionLabel'))}</dt><dd>${esc(objection ? L(objection.text) : t('objectionNone'))}</dd></div>
          <div><dt>${esc(t('visitLengthLabel'))}</dt><dd>${esc(String(b.minutes))}${b.mode === 'avatar' ? ` · ${esc(t('practiceMode_avatar'))}` : ''}</dd></div>
          <div><dt>${esc(t('briefForRep'))}</dt><dd>${esc(L(b.brief))}</dd></div>
          ${b.opening ? `<div><dt>${esc(t('openingLabel'))}</dt><dd>${esc(L(b.opening))}</dd></div>` : ''}
          ${b.criteria?.length ? `<div><dt>${esc(t('practiceCriteria'))}</dt><dd><ul class="lh-ol-points">${b.criteria.map(c => `<li>${esc(L(c))}</li>`).join('')}</ul></dd></div>` : ''}
        </dl>
        </div>
        ${partFoot(`boss:${s.id}`)}
      </div>
    </details>`;
  };

  let lessonNo = 0;
  const contentHtml = mod.sections.map((s, i) => `
    <section class="zn-card lh-card lh-section-card">
      <p class="lh-kicker">${esc(t('sectionN', { n: i + 1 }))}</p>
      <h2 class="lh-card__title">${esc(L(s.title))}</h2>
      ${s.lessons.map(l => lessonPart(l, lessonNo++)).join('')}
      ${quizPart(s)}
      ${bossPart(s)}
    </section>`).join('');

  // ------------------------------------------------ Side panel ------------------------------------------------
  const decisionsHtml = () => `
    <section class="zn-card lh-card">
      <h2 class="lh-card__title">${esc(t('decisionsTitle', { n: mod.round || 1 }))}</h2>
      <ul class="lh-rv-decisions">${TEAMS.map(tm => {
        const r = mod.reviews?.[tm] || { state: 'pending' };
        const n = current().filter(c => c.team === tm).length;
        return `<li>${reviewChip(tm, r.state)}${r.by ? `<span class="lh-card__meta">${esc(t('decidedBy', { name: nameOf(r.by), date: fmtDate(r.at) }))}</span>` : ''}
          ${n ? `<span class="lh-card__meta">${esc(t(n === 1 ? 'commentsOne' : 'commentsMany', { n }))}</span>` : ''}</li>`;
      }).join('')}</ul>
    </section>`;

  const precheckShell = () => !isApprover || mod.status !== 'in_review' ? '' : `
    <section class="zn-card lh-card lh-precheck" data-precheck>
      <div class="lh-row"><span class="lh-precheck__icon">${ICON_SPARK}</span><h2 class="lh-card__title">${esc(t('precheckTitle'))}</h2></div>
      <p class="lh-card__meta"><strong>${esc(t(`precheckLens_${myTeam}`))}</strong></p>
      <p class="lh-card__meta">${esc(t('precheckLead'))}</p>
      <div data-precheck-body></div>
      <div class="lh-row" data-precheck-actions></div>
    </section>`;

  const commentsPanel = () => `
    <section class="zn-card lh-card lh-rv-comments">
      <h2 class="lh-card__title">${esc(t('roundComments', { n: mod.round || 1 }))}</h2>
      <p class="lh-card__meta">${esc(t(canComment ? 'roundCommentsLead' : 'roundCommentsLeadRo'))}</p>
      <div data-comment-groups></div>
      ${canComment ? `<div class="lh-row">
        <button type="button" class="lh-link" data-general-add="">+ ${esc(t('generalComment'))}</button>
        ${pendingMats.length ? `<button type="button" class="lh-link" data-general-add="materials">+ ${esc(t('commentOnMaterials'))}</button>` : ''}
      </div>` : ''}
    </section>`;

  // Previous round: every sent comment with the creator's answer; each team confirms its own.
  const lastRoundHtml = () => {
    const prev = previous();
    if (!prev.length) return '';
    const order = c => (c.team === myTeam ? 0 : 1);
    return `
    <section class="zn-card lh-card lh-rv-last">
      <h2 class="lh-card__title">${esc(t('lastRoundTitle', { n: prevRound }))}</h2>
      <p class="lh-card__meta">${esc(t('lastRoundLead2'))}</p>
      <ul class="lh-cm-list">${[...prev].sort((a, b) => order(a) - order(b)).map(c => `
        <li class="lh-cm ${c.team === myTeam ? 'lh-cm--mine' : ''}" data-prev="${esc(c.id)}">
          <div class="lh-row">${teamChip(c.team)}${answerChip(c)}<span class="lh-spacer"></span>
            <button type="button" class="lh-link lh-rv-where" data-show-prev="${esc(c.id)}">${esc(where(c.target))}</button></div>
          ${c.quote ? `<blockquote class="lh-rv-quote">${esc(c.quote)}</blockquote>` : ''}
          <p class="lh-cm__text">${esc(L(c.text))}</p>
          ${c.reply?.text ? `<div class="lh-cm__reply"><p class="lh-kicker">${esc(t(c.reply.ai ? 'cmReplyAi' : 'cmReplyCreator', { name: nameOf(c.reply.by) }))}</p><p>${esc(c.reply.text)}</p></div>` : ''}
          ${c.verdict ? `<p class="lh-card__meta">${esc(t(c.verdict.state === 'confirmed' ? 'verdictConfirmed' : 'verdictStill', { name: nameOf(c.verdict.by) }))}</p>`
            : canComment && c.team === myTeam ? `<div class="lh-row">
              <button type="button" class="zn-button zn-button--small" data-verdict="confirmed" data-cid="${esc(c.id)}">${esc(t('verdictConfirmBtn'))}</button>
              <button type="button" class="zn-button zn-button--ghost zn-button--small" data-verdict="still" data-cid="${esc(c.id)}">${esc(t('verdictStillBtn'))}</button></div>` : ''}
        </li>`).join('')}</ul>
      ${Object.keys(changed).length ? `<p class="lh-card__meta">${esc(t('changedLegend', { n: prevRound }))}</p>` : ''}
    </section>`;
  };

  const myDecisionNote = isApprover && mine && mine.state !== 'pending'
    ? `<div class="zn-card lh-card lh-rv-mine lh-rv-mine--${esc(mine.state)}"><p>${esc(t(`yourDecision_${mine.state}`, { date: fmtDate(mine.at) }))}</p></div>` : '';
  const adminNote = isAdmin && mod.status === 'in_review'
    ? `<div class="zn-card lh-card lh-st-banner">${esc(t('adminInReviewNote'))}</div>` : '';

  const actionbar = canDecide ? `
    <div class="lh-actionbar" role="region" aria-label="${esc(t('yourDecisionLabel'))}">
      <p class="lh-card__meta" data-count></p>
      <span class="lh-spacer"></span>
      <button type="button" class="zn-button zn-button--ghost" data-decide="changes_requested">${esc(t('requestChanges'))}</button>
      <button type="button" class="zn-button" data-decide="approved">${esc(t('approve'))}</button>
    </div>`
    : isAdmin && mod.status === 'approved' ? `
    <div class="lh-actionbar"><p class="lh-card__meta" data-count></p><span class="lh-spacer"></span>
      <button type="button" class="zn-button zn-button--ghost" data-admin-request>${esc(t('requestChanges'))}</button>
      <button type="button" class="zn-button" data-golive>${esc(t('goLive'))}</button></div>` : '';

  el.innerHTML = `
    <a class="zn-back" href="#/"><span aria-hidden="true">←</span> ${esc(t('back'))}</a>
    <header class="lh-hero">
      <div class="lh-row">${statusChip(mod.status)}${mod.round ? chip('draft', t('roundN', { n: mod.round })) : ''}<span class="zn-product zn-product--derolad">Derolad®</span></div>
      <h1 class="lh-hero__title">${esc(L(mod.title))}</h1>
      <p class="lh-hero__lead">${esc(L(mod.objective))}</p>
      <p class="lh-card__meta">${esc(L(mod.audience))} · ${esc(t('submittedBy', { name: nameOf(mod.createdBy), date: fmtDate(mod.submittedAt) }))}</p>
      <div class="lh-teams">${TEAMS.map(tm => reviewChip(tm, mod.reviews?.[tm]?.state || 'pending')).join('')}</div>
    </header>
    ${flash ? `<div class="zn-card lh-card lh-rv-flash" role="status">${esc(flash)}</div>` : ''}
    ${pendingMats.length ? `<div class="zn-card lh-card lh-st-banner lh-st-banner--warn"><strong>${esc(t('rvPendingMats'))}</strong>
      <ul class="lh-wz-sumlist">${pendingMats.map(m => `<li>${esc(L(m.title))}${m.fileName ? ` · ${esc(m.fileName)}` : ''}</li>`).join('')}</ul></div>` : ''}
    ${canComment ? `<div class="zn-card lh-card lh-rv-howto">${ICON_COMMENT}<p>${esc(t('selectToComment'))}</p></div>` : ''}
    <div class="lh-review">
      <div class="lh-review__main">
        <div data-last-round></div>
        ${contentHtml}
      </div>
      <aside class="lh-review__side">
        ${myDecisionNote}
        ${adminNote}
        ${precheckShell()}
        ${commentsPanel()}
        ${!canDecide ? decisionsHtml() : ''}
      </aside>
    </div>
    ${actionbar}
    <div data-error></div>
    <button type="button" class="zn-button zn-button--small lh-selbtn" data-sel-comment hidden>${ICON_COMMENT}${esc(t('commentBtn'))}</button>`;
  wireBlocks(el);

  const $ = sel => el.querySelector(sel);
  const errBox = $('[data-error]');
  const fail = err => { errBox.innerHTML = errorBox(err); errBox.scrollIntoView({ block: 'center' }); };
  const partEl = target => el.querySelector(`[data-part="${CSS.escape(target)}"]`);
  const textEl = target => el.querySelector(`[data-text="${CSS.escape(target)}"]`);
  const openPart = target => {
    const det = partEl(target);
    if (!det) return null;
    det.open = true;
    return det;
  };
  const flashPart = target => {
    const det = openPart(target);
    if (det) reveal(det.querySelector('summary'), [det]);
  };

  // ------------------------------------------------ Comments ------------------------------------------------
  const myCount = () => current().filter(c => c.team === myTeam || c.agrees?.some(a => a.team === myTeam)).length;
  const commentItem = (c, { showWhere = true } = {}) => {
    const own = c.team === myTeam;
    const editable = canComment && own && !c.sent && c.round === mod.round;
    const agreed = c.agrees?.some(a => a.team === myTeam);
    return `<li class="lh-cm ${own ? 'lh-cm--mine' : ''} ${c.ai ? 'lh-cm--ai' : ''}" data-cm="${esc(c.id)}">
      <div class="lh-row">${teamChip(c.team)}<span class="lh-card__meta">${esc(nameOf(c.by))}</span>
        ${c.sent ? chip('approved', t('cmSent')) : chip('draft', t('cmDraft'))}${c.ai ? `<span class="lh-rv-ai">${ICON_SPARK}${esc(t('fromAi'))}</span>` : ''}${c.reraisedFrom ? chip('changes_requested', t('cmRaisedAgain')) : ''}
        <span class="lh-spacer"></span>
        ${showWhere ? `<button type="button" class="lh-link lh-rv-where" data-show-c="${esc(c.id)}">${esc(where(c.target))}</button>` : ''}</div>
      ${c.quote && showWhere ? `<blockquote class="lh-rv-quote">${esc(c.quote)}</blockquote>` : ''}
      <p class="lh-cm__text" data-cm-text>${esc(L(c.text))}</p>
      ${c.agrees?.length ? `<p class="lh-cm__agrees">${esc(t('cmAgreedBy', { teams: c.agrees.map(a => teamName(a.team)).join(', ') }))}</p>` : ''}
      ${editable || (canComment && !own && c.round === mod.round) ? `<div class="lh-row lh-cm__actions">
        ${editable ? `<button type="button" class="lh-link" data-cm-edit>${esc(t('edit'))}</button><button type="button" class="lh-link lh-link--danger" data-cm-del>${esc(t('remove'))}</button>` : ''}
        ${canComment && !own && c.round === mod.round ? `<button type="button" class="zn-button zn-button--ghost zn-button--small" data-cm-agree aria-pressed="${agreed}">${esc(t(agreed ? 'cmAgreedBtn' : 'cmAgreeBtn'))}</button>` : ''}
      </div>` : ''}
    </li>`;
  };

  let pins = new Map(), anchored = new Set();
  function paintComments() {
    closePop();
    const cur = current();
    // Highlights in the text: AI findings first, then comments (with their pins).
    clearMarks(el.querySelector('.lh-review__main'), 'mark.lh-anno, mark.lh-flag');
    el.querySelectorAll('.lh-anno__pin').forEach(p => p.remove());
    paintFindings();
    ({ pins, anchored } = paintAnchors(textEl, cur, {
      markClass: list => (list.some(c => c.team === myTeam) ? 'lh-anno--mine' : 'lh-anno--other') + (list.every(c => c.sent) ? ' lh-anno--sent' : ''),
    }));
    // Comments on a part without a highlight (general, or text that has changed) are listed under the part.
    el.querySelectorAll('[data-general]').forEach(ul => {
      const list = cur.filter(c => (c.target || '') === ul.dataset.general && !anchored.has(c.id));
      ul.innerHTML = list.map(c => commentItem(c, { showWhere: false })).join('');
    });
    // Side panel: grouped by team, yours first.
    const teams = [myTeam, ...TEAMS, 'admin'].filter((x, i, a) => x && a.indexOf(x) === i);
    const groups = teams.map(tm => [tm, cur.filter(c => c.team === tm)]).filter(([, l]) => l.length);
    $('[data-comment-groups]').innerHTML = groups.length ? groups.map(([tm, list]) => `
      <div class="lh-cm-group"><p class="lh-kicker">${esc(tm === myTeam ? t('yourTeamComments', { team: teamName(tm) }) : teamName(tm))} · ${list.length}</p>
        <ul class="lh-cm-list">${list.map(c => commentItem(c)).join('')}</ul></div>`).join('')
      : `<p class="lh-card__meta">${esc(t('noCommentsYet'))}</p>`;
    $('[data-last-round]').innerHTML = lastRoundHtml();
    paintChanged();
    paintChips();
    paintFindingButtons();
    const count = $('[data-count]');
    if (count) {
      const n = myCount();
      count.textContent = n ? t(n === 1 ? 'commentsOne' : 'commentsMany', { n }) : t(isAdmin ? 'adminNeedComment' : 'needComment');
      const btn = $('[data-decide="changes_requested"]') || $('[data-admin-request]');
      if (btn) btn.disabled = !n;
    }
  }

  // Blocks, questions and challenges that changed since the previous round get a marker.
  function paintChanged() {
    for (const [key, idx] of Object.entries(changed)) {
      const root = textEl(key);
      if (!root) continue;
      for (const i of idx) {
        const w = root.querySelector(`[data-bi="${i}"]`);
        const target = w?.classList.contains('lh-bw') ? w.firstElementChild : w;
        if (target && !target.classList.contains('lh-changed')) { target.classList.add('lh-changed'); target.dataset.changedLabel = t('changedSince', { n: prevRound }); }
      }
    }
  }

  // Small counters on each part's header: AI flags and comments.
  function paintChips() {
    el.querySelectorAll('[data-part]').forEach(det => {
      const key = det.dataset.part;
      const flags = currentFindings().filter(f => f.part === key);
      const n = current().filter(c => c.target === key).length;
      const worst = SEV.find(s => flags.some(f => f.severity === s));
      det.querySelector('[data-part-chips]').innerHTML =
        (flags.length ? chip(worst === 'high' ? 'changes_requested' : 'pending', t('flagsN', { n: flags.length })) : '') +
        (n ? chip('draft', t(n === 1 ? 'commentsOne' : 'commentsMany', { n })) : '');
      det.classList.toggle('lh-edit-block--flag', flags.some(f => f.severity === 'high'));
    });
  }

  const save = async (path, opts) => {
    try { comments = (await api(path, opts)).comments; paintComments(); return true; }
    catch (err) { fail(err); return false; }
  };
  const addComment = body => save(`/api/modules/${mod.id}/comments`, { method: 'POST', body: { ...body, lang } });

  // --- Select text, then "Comment" ---
  const selBtn = $('[data-sel-comment]');
  let selection = null;
  const readSelection = () => {
    const sel = window.getSelection();
    if (!canComment || !sel || sel.isCollapsed || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    const text = sel.toString().replace(/\s+/g, ' ').trim();
    if (text.length < 3) return null;
    const box = n => (n.nodeType === 3 ? n.parentElement : n)?.closest('[data-text]');
    const a = box(range.startContainer), b = box(range.endContainer);
    if (!a || a !== b) return null;
    return { target: a.dataset.text, quote: text.slice(0, 400), ...blockOf(range.startContainer), rect: range.getBoundingClientRect() };
  };
  const placeSelBtn = () => {
    selection = readSelection();
    if (!selection || popEl()) { if (!popEl()) selBtn.hidden = true; return; }
    const r = selection.rect;
    selBtn.hidden = false;
    selBtn.style.top = `${r.bottom + window.scrollY + 6}px`;
    selBtn.style.left = `${Math.max(8, Math.min(r.right + window.scrollX - 40, window.scrollX + window.innerWidth - 130))}px`;
  };
  let selTimer = null;
  const onSelection = () => { clearTimeout(selTimer); selTimer = setTimeout(placeSelBtn, 180); };
  if (canComment) {
    document.addEventListener('selectionchange', onSelection);
    // Stop listening once this page is gone.
    const stop = new MutationObserver(() => { if (!el.contains(selBtn)) { document.removeEventListener('selectionchange', onSelection); stop.disconnect(); } });
    stop.observe(el, { childList: true });
  }
  const composeForm = (quote, label) => `
    <p class="lh-kicker">${esc(label)}</p>
    ${quote ? `<blockquote class="lh-rv-quote">${esc(quote)}</blockquote>` : ''}
    <form class="lh-pop__form" data-pop-form>
      <textarea class="lh-input" rows="3" maxlength="1500" required placeholder="${esc(t('commentPlaceholder'))}" aria-label="${esc(t('commentPlaceholder'))}"></textarea>
      <div class="lh-row"><span class="lh-spacer"></span><button type="button" class="lh-link" data-pop-cancel>${esc(t('cancel'))}</button>
        <button type="submit" class="zn-button zn-button--small">${esc(t('addBtn'))}</button></div>
    </form>`;
  const compose = (rect, body, label) => {
    const pop = openPop(el, rect, composeForm(body.quote, label));
    const form = pop.querySelector('[data-pop-form]');
    form.querySelector('textarea').focus();
    pop.querySelector('[data-pop-cancel]').addEventListener('click', closePop);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const text = form.querySelector('textarea').value.trim();
      if (!text) return;
      form.querySelector('button[type=submit]').disabled = true;
      closePop();
      await addComment({ ...body, text });
    });
  };
  selBtn.addEventListener('mousedown', e => e.preventDefault());   // keep the selection
  selBtn.addEventListener('click', () => {
    const s = selection || readSelection();
    if (!s) return;
    selBtn.hidden = true;
    const { rect, ...body } = s;
    compose(rect, body, t('commentOnWhere', { where: where(body.target) }));
    window.getSelection()?.removeAllRanges();
  });

  // --- Pins: the bubble with the comments on that text ---
  function openPinPop(pin) {
    const ids = pins.get(pin.dataset.pin) || [];
    const list = current().filter(c => ids.includes(c.id));
    if (!list.length) return;
    const pop = openPop(el, pin.getBoundingClientRect(), `<ul class="lh-cm-list">${list.map(c => commentItem(c, { showWhere: false })).join('')}</ul>
      ${canComment ? `<button type="button" class="lh-link" data-pop-reply>+ ${esc(t('commentSameText'))}</button>` : ''}`);
    pop.querySelector('[data-pop-reply]')?.addEventListener('click', () => {
      const c = list[0];
      compose(pin.getBoundingClientRect(), { target: c.target, quote: c.quote, block: c.block, blockType: c.blockType }, t('commentOnWhere', { where: where(c.target) }));
    });
  }

  // --- One delegated handler for comment actions (side panel, part lists, bubbles) ---
  el.addEventListener('click', async e => {
    const pin = e.target.closest('.lh-anno__pin');
    if (pin) { e.preventDefault(); return openPinPop(pin); }
    const mark = e.target.closest('mark.lh-anno');
    if (mark && !window.getSelection()?.toString()) {
      const p = [...el.querySelectorAll('.lh-anno__pin')].find(x => x.dataset.pin === mark.dataset.anno);
      if (p) return openPinPop(p);
    }
    const gen = e.target.closest('[data-general-add]');
    if (gen) {
      const target = gen.dataset.generalAdd || null;
      return compose(gen.getBoundingClientRect(), { target }, target ? t('commentOnWhere', { where: where(target) }) : t('generalComment'));
    }
    const showC = e.target.closest('[data-show-c]');
    if (showC) return showComment(showC.dataset.showC);
    const showPrev = e.target.closest('[data-show-prev]');
    if (showPrev) {
      const c = previous().find(x => x.id === showPrev.dataset.showPrev);
      if (!c) return;
      const det = openPart(c.target);
      const hit = c.quote && det ? markQuote(textEl(c.target), c.quote, () => Object.assign(document.createElement('mark'), { className: 'lh-flag lh-flag--low' })) : [];
      const chg = det?.querySelector('.lh-changed');
      if (hit.length) reveal(hit[0], hit); else if (chg) reveal(chg, [chg]); else if (c.target) flashPart(c.target);
      return;
    }
    const verdict = e.target.closest('[data-verdict]');
    if (verdict) {
      const state = verdict.dataset.verdict, cid = verdict.dataset.cid;
      if (state === 'still') {
        const c = previous().find(x => x.id === cid);
        const pop = openPop(el, verdict.getBoundingClientRect(), `<p class="lh-kicker">${esc(t('verdictStillTitle'))}</p>
          <form class="lh-pop__form" data-pop-form><textarea class="lh-input" rows="3" maxlength="1500" aria-label="${esc(t('verdictStillPh'))}" placeholder="${esc(t('verdictStillPh'))}">${esc(L(c?.text))}</textarea>
          <div class="lh-row"><span class="lh-spacer"></span><button type="button" class="lh-link" data-pop-cancel>${esc(t('cancel'))}</button><button type="submit" class="zn-button zn-button--small">${esc(t('verdictStillSend'))}</button></div></form>`);
        pop.querySelector('[data-pop-cancel]').addEventListener('click', closePop);
        pop.querySelector('form').addEventListener('submit', async ev => {
          ev.preventDefault();
          const text = pop.querySelector('textarea').value.trim();
          closePop();
          await save(`/api/modules/${mod.id}/comments/${cid}/verdict`, { method: 'POST', body: { state, text, lang } });
        });
        return;
      }
      verdict.disabled = true;
      return save(`/api/modules/${mod.id}/comments/${cid}/verdict`, { method: 'POST', body: { state, lang } });
    }
    const item = e.target.closest('[data-cm]');
    if (!item) return;
    const cid = item.dataset.cm;
    if (e.target.closest('[data-cm-agree]')) return save(`/api/modules/${mod.id}/comments/${cid}/agree`, { method: 'POST' });
    if (e.target.closest('[data-cm-del]')) {
      if (!confirm(t('cmRemoveConfirm'))) return;
      return save(`/api/modules/${mod.id}/comments/${cid}`, { method: 'DELETE' });
    }
    if (e.target.closest('[data-cm-edit]')) {
      const c = comments.find(x => x.id === cid);
      const p = item.querySelector('[data-cm-text]');
      p.outerHTML = `<form class="lh-pop__form" data-cm-form><textarea class="lh-input" rows="3" maxlength="1500" aria-label="${esc(t('edit'))}">${esc(L(c.text))}</textarea>
        <div class="lh-row"><span class="lh-spacer"></span><button type="button" class="lh-link" data-cm-cancel>${esc(t('cancel'))}</button><button type="submit" class="zn-button zn-button--small">${esc(t('saveChanges'))}</button></div></form>`;
      const form = item.querySelector('[data-cm-form]');
      form.querySelector('textarea').focus();
      form.querySelector('[data-cm-cancel]').addEventListener('click', paintComments);
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        const text = form.querySelector('textarea').value.trim();
        if (text) save(`/api/modules/${mod.id}/comments/${cid}`, { method: 'PUT', body: { text, lang } });
      });
    }
  });

  // Jumps to a comment: its highlight when it has one, otherwise its part.
  function showComment(cid) {
    closePop();
    const c = comments.find(x => x.id === cid);
    if (!c) return;
    openPart(c.target);
    const pinId = [...pins.entries()].find(([, ids]) => ids.includes(cid))?.[0];
    if (pinId && revealPin(el, pinId)) return;
    const li = el.querySelector(`[data-general] [data-cm="${CSS.escape(cid)}"]`);
    if (li) reveal(li, [li]); else if (c.target) flashPart(c.target);
  }

  // ------------------------------------------------ AI pre-check ------------------------------------------------
  const partKeys = [...allLessons.map(l => l.id), 'assessment'];
  const partName = key => key === 'assessment' ? t('precheckAssessment') : where(key);
  const currentFindings = () => running
    ? Object.values(running.parts).flatMap(p => p.findings || [])
    : (pc?.findings || []);
  const findingById = id => currentFindings().find(f => f.id === id);

  const findingHtml = f => `
    <li class="lh-finding lh-finding--${esc(f.severity)}" data-finding-card="${esc(f.id)}">
      <div class="lh-row">${chip(f.severity === 'high' ? 'changes_requested' : f.severity === 'medium' ? 'pending' : 'draft', t(`sev_${f.severity}`))}
        <span class="lh-finding__cat">${esc(t(`cat_${f.category}`))}</span></div>
      <button type="button" class="lh-link lh-rv-where" data-goto="${esc(f.part || '')}">${esc(where(f.part))}</button>
      ${f.quote ? `<blockquote class="lh-rv-quote">${esc(f.quote)}</blockquote>` : ''}
      <p class="lh-finding__issue">${esc(L(f.issue))}</p>
      ${L(f.suggestion) ? `<div class="lh-finding__fix"><p class="lh-kicker">${esc(t('suggestedFix'))}</p><p>${esc(L(f.suggestion))}</p></div>` : ''}
      ${f.source ? `<p class="lh-card__meta">${esc(t('checkedAgainst'))}: <span class="lh-source">${esc(sourceTitle(f.source))}</span></p>` : ''}
      <div class="lh-row">
        ${f.quote && f.part ? `<button type="button" class="zn-button zn-button--ghost zn-button--small" data-show="${esc(f.id)}">${esc(t('showInText'))}</button>` : ''}
        ${canDecide ? `<button type="button" class="zn-button zn-button--small" data-add-finding="${esc(f.id)}">${esc(t('addAsComment'))}</button>` : ''}
      </div>
    </li>`;

  function paintFindingButtons() {
    const added = new Set(current().filter(c => c.team === myTeam).map(c => c.findingId).filter(Boolean));
    el.querySelectorAll('[data-add-finding]').forEach(b => {
      const done = added.has(b.dataset.addFinding);
      b.disabled = done;
      b.textContent = t(done ? 'addedAsComment' : 'addAsComment');
    });
  }

  function paintPrecheck() {
    const body = $('[data-precheck-body]');
    if (!body) { paintComments(); return; }
    const actions = $('[data-precheck-actions]');
    if (running) {
      const done = Object.values(running.parts).filter(p => p.done).length;
      body.innerHTML = `
        <p class="lh-precheck__status" aria-live="polite">${esc(t('precheckRunning', { done, n: partKeys.length }))}</p>
        <ul class="lh-precheck__parts">${partKeys.map(k => {
          const p = running.parts[k] || {};
          const soFar = p.done ? (p.findings || []).length : (parsePartial(p.text || '')?.findings?.length || 0);
          const state = p.done ? (soFar ? t('flagsN', { n: soFar }) : t('precheckClean')) : soFar ? t('precheckSoFar', { n: soFar }) : t('precheckChecking');
          return `<li class="${p.done ? (soFar ? 'is-flagged' : 'is-clean') : 'is-running'}"><span class="lh-precheck__dot" aria-hidden="true"></span><span>${esc(partName(k))}</span><span class="lh-spacer"></span><span class="lh-card__meta">${esc(state)}</span></li>`;
        }).join('')}</ul>
        <ul class="lh-findings">${currentFindings().map(findingHtml).join('')}</ul>`;
      actions.innerHTML = '';
    } else if (pc) {
      const high = pc.findings.filter(f => f.severity === 'high').length;
      body.innerHTML = `
        <p class="lh-precheck__status">${esc(pc.findings.length ? t(pc.findings.length === 1 ? 'precheckSummaryOne' : 'precheckSummary', { n: pc.findings.length, high }) : t('precheckNone'))}</p>
        <p class="lh-card__meta">${esc(t('precheckAt', { date: fmtDate(pc.at), parts: pc.parts?.length || partKeys.length }))}${pc.lang !== lang ? ` · ${esc(t('precheckOtherLang', { lang: t(`lang_${pc.lang}`) }))}` : ''}</p>
        <ul class="lh-findings">${pc.findings.map(findingHtml).join('')}</ul>`;
      actions.innerHTML = `<button type="button" class="lh-link" data-run>${esc(t('precheckAgain'))}</button>`;
    } else {
      body.innerHTML = '';
      actions.innerHTML = `<button type="button" class="zn-button" data-run>${ICON_SPARK}${esc(t('precheckRun'))}</button>`;
    }
    paintComments();
  }

  // Each finding's quote is highlighted in the text (severity colour), so "Show in the text" lands on it.
  function paintFindings() {
    for (const f of currentFindings()) {
      if (!f.quote || !f.part) continue;
      markQuote(textEl(f.part), f.quote, () => {
        const m = document.createElement('mark');
        m.className = `lh-flag lh-flag--${f.severity}`;
        m.dataset.finding = f.id;
        m.title = L(f.issue);
        return m;
      });
    }
  }

  async function runPrecheck() {
    running = { parts: {} };
    paintPrecheck();
    let frame = 0;
    const repaint = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; if (running && el.isConnected) paintPrecheck(); }); };
    try {
      const { precheck } = await streamNdjson(`/api/modules/${mod.id}/precheck`, { lang }, ev => {
        const p = (running.parts[ev.key] ||= { text: '' });
        if (ev.kind === 'part') p.text += ev.text;
        if (ev.kind === 'partDone') { p.done = true; p.findings = ev.findings; }
        repaint();
      });
      if (frame) cancelAnimationFrame(frame);
      pc = precheck;
      running = null;
      if (el.isConnected) paintPrecheck();
    } catch (err) {
      running = null;
      if (!el.isConnected) return;
      paintPrecheck();
      $('[data-precheck-body]').innerHTML = errorBox(err);
    }
  }
  el.querySelector('[data-precheck]')?.addEventListener('click', async e => {
    if (e.target.closest('[data-run]')) return runPrecheck();
    const go = e.target.closest('[data-goto]');
    if (go) { const det = openPart(go.dataset.goto); if (det) reveal(det.querySelector('summary'), [det]); return; }
    const show = e.target.closest('[data-show]');
    if (show) {
      const f = findingById(show.dataset.show);
      openPart(f.part);
      const marks = [...el.querySelectorAll(`mark[data-finding="${CSS.escape(f.id)}"]`)];
      if (marks.length) reveal(marks[0], marks);
      else { flashPart(f.part); show.textContent = t('notInText'); }
      return;
    }
    const addF = e.target.closest('[data-add-finding]');
    if (addF) {
      const f = findingById(addF.dataset.addFinding);
      addF.disabled = true;
      // Anchored to the same text, in the block where the AI found it.
      const root = textEl(f.part);
      const found = root && f.quote ? findQuote(root, f.quote) : null;
      await addComment({ target: f.part, quote: f.quote, ...(found ? blockOf(found.start[0]) : {}), ai: true, findingId: f.id,
        text: `${L(f.issue)}\n${t('suggestedFix')}: ${L(f.suggestion)}` });
    }
  });

  // ------------------------------------------------ Decision ------------------------------------------------
  el.querySelectorAll('[data-decide]').forEach(btn => btn.addEventListener('click', async () => {
    const decision = btn.dataset.decide;
    const n = myCount();
    if (decision === 'changes_requested' && !n) return;
    const handled = new Set(current().filter(c => c.team === myTeam).map(c => c.findingId));
    const open = currentFindings().filter(f => f.severity === 'high' && !handled.has(f.id)).length;
    if (decision === 'approved' && open && !confirm(t('approveWithFlags', { n: open }))) return;
    if (decision === 'changes_requested' && !confirm(t('confirmChanges', { n }))) return;
    el.querySelectorAll('[data-decide]').forEach(b => { b.disabled = true; });
    try {
      const saved = await api(`/api/modules/${mod.id}/review`, { method: 'POST', body: { decision, lang } });
      const waiting = TEAMS.filter(tm => saved.reviews?.[tm]?.state === 'pending').map(tm => t(`team_${tm}`));
      const msg = saved.status === 'approved' ? t('afterAllApproved', { name: nameOf('avery') })
        : saved.status === 'changes_requested' ? t('afterBack', { name: nameOf(saved.createdBy) })
        : t('afterWaiting', { teams: waiting.join(', ') });
      await renderReview(el, user, mod.id, `${t(`sent_${decision}`)} ${msg}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      el.querySelectorAll('[data-decide]').forEach(b => { b.disabled = false; });
      fail(err);
    }
  }));

  $('[data-admin-request]')?.addEventListener('click', async e => {
    const n = myCount();
    if (!n || !confirm(t('adminRequestConfirm', { n, name: nameOf(mod.createdBy) }))) return;
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await api(`/api/modules/${mod.id}/admin-request`, { method: 'POST' });
      await renderReview(el, user, mod.id, t('afterBack', { name: nameOf(mod.createdBy) }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { btn.disabled = false; fail(err); }
  });

  $('[data-golive]')?.addEventListener('click', async e => {
    const n = myCount();
    if (n && !confirm(t('goLiveDropComments', { n }))) return;
    if (!confirm(t('goLiveConfirm', { title: L(mod.title) }))) return;
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await api(`/api/modules/${mod.id}/golive`, { method: 'POST' });
      await renderReview(el, user, mod.id, t('wentLive', { title: L(mod.title) }));
    } catch (err) { btn.disabled = false; fail(err); }
  });

  // Other reviewers' comments arrive while this page is open: refresh when the tab comes back into view.
  const refresh = async () => {
    if (!el.isConnected) { document.removeEventListener('visibilitychange', onVisible); return; }
    if (popEl() || el.querySelector('[data-cm-form]')) return;
    try { const m = await api(`/api/modules/${mod.id}`); comments = m.comments || []; paintComments(); } catch { /* keep what we have */ }
  };
  const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
  document.addEventListener('visibilitychange', onVisible);
  const poll = setInterval(() => { if (!el.isConnected) return clearInterval(poll); if (document.visibilityState === 'visible') refresh(); }, 30000);

  paintPrecheck();
  // Open the first lesson so the page doesn't start as a wall of closed rows.
  const first = el.querySelector('.lh-rv-part');
  if (first) first.open = true;
}
