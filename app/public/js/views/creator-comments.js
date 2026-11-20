// The creator's side of reviewer comments (a module sent back with changes requested), used by every studio card:
// each comment with its team, where it is, the exact text, and what the creator did about it —
// "Show me", "Fix with AI" (where the AI can), "I changed it" or "Keep the text" (with a reason for the reviewer).
import { api, streamNdjson } from '../api.js';
import { t, L } from '../i18n.js';
import { esc, errorBox } from '../ui.js';
import { creatorComments, commentCard, isOpenComment } from '../studio-rules.js';
import { teamChip, teamName, commentWhere, answerChip, openPop, closePop } from '../comments-ui.js';
import { normalize } from '../anchor.js';

const ICON_SPARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg>';

// The video (with an AI script) a comment is about, if any.
export function commentVideo(mod, c) {
  const lesson = mod.sections.flatMap(s => s.lessons).find(l => l.id === c.target);
  const block = lesson?.blocks?.find(b => b.type === 'video');
  const v = block && mod.studio?.videos?.find(x => x.id === block.video);
  return v || null;
}
// What "Fix with AI" does for a comment: rewrite lessons/quizzes/challenges, rewrite a video script, or nothing.
export function fixKind(mod, c) {
  const card = commentCard(mod, c);
  // A scripted video: rewrite its script. An uploaded or library video cannot be edited: the AI edits the lesson around it.
  if (card === 'videos') { const v = commentVideo(mod, c); return v && (v.source || 'script') === 'script' && v.script ? 'script' : 'revise'; }
  if (card === 'materials') return null;
  return 'revise';
}

export function cardComments(mod, card) {
  return creatorComments(mod).filter(c => !card || commentCard(mod, c) === card);
}

function item(mod, c, users, { showWhere = true } = {}) {
  const nameOf = id => users.find(u => u.id === id)?.name || '';
  const open = isOpenComment(c);
  const fix = open && fixKind(mod, c);
  return `<li class="lh-cm lh-cc ${open ? 'lh-cc--open' : 'lh-cc--done'}" data-cc="${esc(c.id)}">
    <div class="lh-row">${teamChip(c.team)}<span class="lh-card__meta">${esc(nameOf(c.by))}</span>${answerChip(c)}<span class="lh-spacer"></span>
      ${showWhere ? `<button type="button" class="lh-link lh-rv-where" data-cc-show>${esc(t('ccShowMe'))}: ${esc(commentWhere(mod, c.target, v => v?.[mod.sourceLang] || L(v)))}</button>`
        : `<button type="button" class="lh-link lh-rv-where" data-cc-show>${esc(t('ccShowMe'))}</button>`}</div>
    ${c.quote ? `<blockquote class="lh-rv-quote">${esc(c.quote)}</blockquote>` : ''}
    <p class="lh-cm__text">${esc(L(c.text))}</p>
    ${c.agrees?.length ? `<p class="lh-cm__agrees">${esc(t('cmAgreedBy', { teams: c.agrees.map(a => teamName(a.team)).join(', ') }))}</p>` : ''}
    ${c.reply?.text || !open ? `<div class="lh-cm__reply"><p class="lh-kicker">${esc(t(c.reply?.ai ? 'cmReplyAi' : 'ccYourAnswer'))}</p>${c.reply?.text ? `<p>${esc(c.reply.text)}</p>` : ''}
      <button type="button" class="lh-link" data-cc-reopen>${esc(t('ccReopen'))}</button></div>` : ''}
    ${open ? `<div class="lh-row lh-cm__actions">
      ${fix ? `<button type="button" class="zn-button zn-button--small" data-cc-fix>${ICON_SPARK}${esc(t('ccFixAi'))}</button>` : ''}
      <button type="button" class="zn-button zn-button--ghost zn-button--small" data-cc-done>${esc(t('ccChanged'))}</button>
      <button type="button" class="lh-link" data-cc-keep>${esc(t('ccKeep'))}</button>
    </div>` : ''}
  </li>`;
}

export function commentListHtml(mod, list, users, opts) {
  return `<ul class="lh-cm-list">${list.map(c => item(mod, c, users, opts)).join('')}</ul>`;
}

// The panel at the top of a studio card: this card's comments.
export function cardCommentsPanel(mod, card, users) {
  const list = cardComments(mod, card);
  if (!list.length) return '';
  const open = list.filter(isOpenComment).length;
  return `<section class="zn-card lh-card lh-cc-panel" data-cc-panel>
    <div class="lh-row"><h2 class="lh-card__title" style="margin:0">${esc(t('ccPanelTitle'))}</h2><span class="lh-spacer"></span>
      <span class="lh-card__meta">${esc(open ? t('ccOpenOf', { open, n: list.length }) : t('ccAllDone'))}</span></div>
    <p class="lh-card__meta">${esc(t('ccPanelLead', { round: mod.round }))}</p>
    ${commentListHtml(mod, list, users)}
    <div data-cc-error></div>
  </section>`;
}

// Wires the comment actions inside `root`. onShow(c) jumps to the text; storyboard(c) shows progress for an AI fix
// and returns the event handler; reload() repaints the card.
export function wireCreatorComments(root, mod, { onShow, storyboard, reload }) {
  const errBox = () => root.querySelector('[data-cc-error]') || root.querySelector('[data-error]');
  const fail = err => { const b = errBox(); if (b) { b.innerHTML = errorBox(err); b.scrollIntoView({ block: 'center' }); } };
  const act = async (cid, action, reply = '') => {
    try { await api(`/api/projects/${mod.id}/comments/${cid}`, { method: 'POST', body: { action, reply } }); await reload(); }
    catch (err) { fail(err); }
  };
  root.addEventListener('click', async e => {
    const li = e.target.closest('[data-cc]');
    if (!li) return;
    const c = (mod.comments || []).find(x => x.id === li.dataset.cc);
    if (!c) return;
    if (e.target.closest('[data-cc-show]')) return onShow?.(c);
    if (e.target.closest('[data-cc-reopen]')) return act(c.id, 'reopen');
    const done = e.target.closest('[data-cc-done]'), keep = e.target.closest('[data-cc-keep]');
    if (done || keep) {
      const btn = done || keep;
      const pop = openPop(document.querySelector('#view') || document.body, btn.getBoundingClientRect(), `
        <p class="lh-kicker">${esc(t(done ? 'ccChangedTitle' : 'ccKeepTitle'))}</p>
        <form class="lh-pop__form" data-pop-form>
          <textarea class="lh-input" rows="3" maxlength="1500" ${keep ? 'required' : ''} aria-label="${esc(t(done ? 'ccChangedPh' : 'ccKeepPh'))}" placeholder="${esc(t(done ? 'ccChangedPh' : 'ccKeepPh'))}"></textarea>
          <div class="lh-row"><span class="lh-spacer"></span><button type="button" class="lh-link" data-pop-cancel>${esc(t('cancel'))}</button>
            <button type="submit" class="zn-button zn-button--small">${esc(t(done ? 'ccChangedSend' : 'ccKeepSend'))}</button></div>
        </form>`);
      pop.querySelector('textarea').focus();
      pop.querySelector('[data-pop-cancel]').addEventListener('click', closePop);
      pop.querySelector('form').addEventListener('submit', ev => {
        ev.preventDefault();
        const reply = pop.querySelector('textarea').value.trim();
        if (keep && reply.length < 3) return;
        closePop();
        act(c.id, done ? 'addressed' : 'answered', reply);
      });
      return;
    }
    const fixBtn = e.target.closest('[data-cc-fix]');
    if (fixBtn) {
      const kind = fixKind(mod, c);
      fixBtn.disabled = true;
      try {
        if (kind === 'script') {
          fixBtn.innerHTML = `<span class="lh-spinner lh-spinner--inline" aria-hidden="true"></span> ${esc(t('vdWriting'))}`;
          await streamNdjson(`/api/projects/${mod.id}/videos/${commentVideo(mod, c).id}/script`, { commentIds: [c.id] }, () => {});
        } else {
          const onEvent = storyboard();
          window.scrollTo({ top: 0 });
          await streamNdjson(`/api/builder/${mod.id}/revise`, { commentIds: [c.id] }, onEvent);
        }
        await reload();
      } catch (err) { await reload(); fail(err); }
    }
  });
}

// Finds the quoted text in the card's form fields (inputs, textareas) and selects it. Returns true when found.
export function selectInFields(root, quote) {
  const q = normalize(quote);
  if (!q) return false;
  const probe = q.split(' ').slice(0, 6).join(' ');
  for (const f of root.querySelectorAll('textarea, input:not([type]), input[type=text]')) {
    const v = normalize(f.value);
    if (!v.includes(q) && !v.includes(probe)) continue;
    const raw = f.value.toLowerCase();
    const head = quote.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 30);
    const at = raw.indexOf(head);
    for (let d = f.closest('details'); d; d = d.parentElement?.closest('details')) d.open = true;
    f.scrollIntoView({ behavior: 'smooth', block: 'center' });
    f.focus({ preventScroll: true });
    if (at >= 0) f.setSelectionRange(at, Math.min(f.value.length, at + quote.length));
    f.classList.remove('lh-pulse'); void f.offsetWidth; f.classList.add('lh-pulse');
    return true;
  }
  return false;
}
