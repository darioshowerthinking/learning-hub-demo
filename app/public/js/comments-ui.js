// Reviewer comments, shared by the review screen (approvers, Training Manager) and the studio (creator):
// highlights anchored to the exact text with a pop-out bubble, labels and the creator's answer.
import { t, L } from './i18n.js';
import { esc, chip, targetLabel } from './ui.js';
import { markQuote, normalize, reveal } from './anchor.js';

export const ICON_COMMENT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>';
export const teamName = team => t(`team_${team}`);
export const teamChip = team => `<span class="lh-team lh-team--${esc(team)}">${esc(teamName(team))}</span>`;
export const commentWhere = (mod, target, text) => (target === 'materials' ? t('targetMaterials') : targetLabel(mod, target, text));

// The creator's answer to a comment, as a chip.
export function answerChip(c) {
  if (c.status === 'addressed') return chip('approved', t(c.reply?.ai ? 'cmFixedAi' : 'cmFixed'));
  if (c.status === 'answered') return chip('pending', t('cmKept'));
  return chip('changes_requested', t('cmOpen'));
}

// Highlights every comment's quote inside its part and puts a pin (speech bubble with a count) after it.
// partRoot(target) returns the element to search in. Comments with the same text in the same part share one pin.
// Returns the ids of the comments that were anchored and the comment ids per pin.
export function paintAnchors(partRoot, comments, { markClass = () => '' } = {}) {
  const groups = new Map();
  for (const c of comments) {
    if (!c.quote) continue;
    const key = `${c.target || ''}|${c.block ?? ''}|${normalize(c.quote)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  const anchored = new Set(), pins = new Map();
  let n = 0;
  for (const list of groups.values()) {
    const c = list[0];
    const part = partRoot(c.target);
    if (!part) continue;
    const inBlock = c.block != null ? part.querySelector(`[data-bi="${c.block}"]`) : null;
    const make = () => {
      const m = document.createElement('mark');
      m.className = `lh-anno ${markClass(list)}`;
      m.dataset.anno = `p${n}`;
      return m;
    };
    let marks = inBlock ? markQuote(inBlock, c.quote, make) : [];
    if (!marks.length) marks = markQuote(part, c.quote, make);
    if (!marks.length) continue;
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'lh-anno__pin';
    pin.dataset.pin = `p${n}`;
    pin.setAttribute('aria-label', t(list.length === 1 ? 'commentsOne' : 'commentsMany', { n: list.length }));
    pin.innerHTML = `${ICON_COMMENT}<span>${list.length}</span>`;
    marks[marks.length - 1].after(pin);
    pins.set(`p${n}`, list.map(x => x.id));
    list.forEach(x => anchored.add(x.id));
    n++;
  }
  return { anchored, pins };
}

// Shows the highlight of a comment (or the pin's marks) and pulses it. Returns false when it is not in the text.
export function revealPin(root, pinId) {
  const marks = [...root.querySelectorAll(`mark[data-anno="${CSS.escape(pinId)}"]`)];
  if (!marks.length) return false;
  reveal(marks[0], marks);
  return true;
}

// ------------------------------- The pop-out bubble -------------------------------
// One floating card per page, placed under the element it belongs to (or a selection rectangle).
let pop = null, onClose = null;
export function openPop(host, rect, html, { onclose } = {}) {
  closePop();
  pop = document.createElement('div');
  pop.className = 'zn-card lh-pop';
  pop.setAttribute('role', 'dialog');
  pop.innerHTML = html;
  host.appendChild(pop);
  const w = Math.min(360, window.innerWidth - 32);
  pop.style.width = `${w}px`;
  const left = Math.max(16, Math.min(rect.left + window.scrollX, window.scrollX + window.innerWidth - w - 16));
  pop.style.left = `${left}px`;
  pop.style.top = `${rect.bottom + window.scrollY + 8}px`;
  onClose = onclose || null;
  setTimeout(() => {
    document.addEventListener('mousedown', outside, true);
    document.addEventListener('keydown', escKey, true);
  });
  return pop;
}
export function closePop() {
  if (!pop) return;
  pop.remove(); pop = null;
  document.removeEventListener('mousedown', outside, true);
  document.removeEventListener('keydown', escKey, true);
  const f = onClose; onClose = null; if (f) f();
}
export const popEl = () => pop;
function outside(e) { if (pop && !pop.contains(e.target) && !e.target.closest('.lh-anno__pin, [data-sel-comment]')) closePop(); }
function escKey(e) { if (e.key === 'Escape') closePop(); }

export const commentText = c => L(c.text);
