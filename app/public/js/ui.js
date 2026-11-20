// Small rendering helpers. Every value interpolated into HTML goes through esc().
import { t, L, getLang } from './i18n.js';

export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const chip = (kind, label) => `<span class="lh-chip lh-chip--${esc(kind)}">${esc(label)}</span>`;
export const statusChip = status => chip(status, t(`status_${status}`));
export const reviewChip = (team, state) => chip(state, `${t(`team_${team}`)} · ${t(`review_${state}`)}`);

export function meter(label, value) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return `<div class="lh-meter">
    <span>${esc(label)}</span>
    <span class="lh-meter__track" role="img" aria-label="${esc(label)}: ${v}%"><span class="lh-meter__fill" style="width:${v}%"></span></span>
    <span class="lh-meter__value">${v}%</span>
  </div>`;
}

// A final challenge's objection: one of meta.objections, the creator's own ("other" + objectionText), or null.
export function objectionOf(meta, boss) {
  if (!boss?.objection) return null;
  if (boss.objection === 'other') return L(boss.objectionText) ? { id: 'other', text: boss.objectionText } : null;
  return meta.objections.find(o => o.id === boss.objection) || null;
}

// err.plain: a message for the user to act on (a missing field), shown without "Something went wrong".
export const errorBox = err => `<p class="lh-error">${esc(err.plain ? err.message : t('errorGeneric', { msg: err.message }))}</p>`;

// Where a review comment or AI finding points: a lesson, a section's quiz or final challenge, or the whole module.
export function targetLabel(mod, target, text = L) {
  const [kind, sid] = String(target || '').split(':');
  const lessons = mod.sections.flatMap(s => s.lessons);
  const li = lessons.findIndex(l => l.id === target);
  if (li >= 0) return t('targetLesson', { n: li + 1, title: text(lessons[li].title) });
  const si = mod.sections.findIndex(s => s.id === sid);
  if (si >= 0 && kind === 'quiz') return t('targetQuiz', { n: si + 1 });
  if (si >= 0 && kind === 'boss') return t('targetBoss', { n: si + 1 });
  return t('targetModule');
}

export const fmtDate = ts => (ts ? new Intl.DateTimeFormat(getLang() === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(ts) : '');
