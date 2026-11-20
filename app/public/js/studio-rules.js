// Training Module Creation Studio: the rules shared by the browser and the server.
// A project is a module in "draft" with a `studio` object: the wizard's requirements (`spec`) and one card per need.
// Cards: requirements -> materials -> outline -> (practice, videos) -> content -> preview & submit.
// A card is locked until the cards it depends on are complete. When a card changes after the cards that build on it
// were completed, those cards are marked "needs update" (stale) until the creator checks them again.

const t = (en, es) => ({ en, es });

export const AUDIENCE_ROLES = {
  derm_reps: t('Dermatology sales reps', 'Delegados de dermatología'),
  kam: t('Key account managers', 'Key account managers'),
  frm: t('Field reimbursement managers', 'Gestores de acceso y reembolso'),
  msl: t('Medical science liaisons', 'MSL (enlaces científicos)'),
  new_hires: t('New hires (onboarding)', 'Nuevas incorporaciones (onboarding)'),
};
export const EXPERIENCE = {
  new_hs: t('New to HS', 'Nuevos en HS'),
  derm: t('Experienced in dermatology, new to Derolad', 'Con experiencia en dermatología, nuevos en Derolad'),
  derolad: t('Experienced with Derolad', 'Con experiencia en Derolad'),
  mixed: t('Mixed levels', 'Niveles mixtos'),
};
export const PRACTICE_MODES = ['none', 'chat', 'avatar'];

export const LIMITS = {
  sections: [1, 6], lessons: [1, 6], minutes: [5, 20], quiz: [0, 15], practiceMinutes: [2, 15], videos: [0, 5],
};
// Quick starts for the shape step; every value can be changed afterwards.
export const PRESETS = {
  short: [{ lessons: 2, minutes: 8, quiz: 4, practice: 'chat', practiceMinutes: 4 }],
  standard: [{ lessons: 3, minutes: 10, quiz: 5, practice: 'chat', practiceMinutes: 5 }, { lessons: 3, minutes: 10, quiz: 5, practice: 'avatar', practiceMinutes: 6 }],
  extended: [{ lessons: 3, minutes: 12, quiz: 5, practice: 'chat', practiceMinutes: 5 }, { lessons: 3, minutes: 12, quiz: 6, practice: 'chat', practiceMinutes: 6 }, { lessons: 3, minutes: 12, quiz: 8, practice: 'avatar', practiceMinutes: 8 }],
};

export const CARD_KEYS = ['requirements', 'materials', 'outline', 'practice', 'videos', 'content', 'preview'];
export const DEPS = {
  requirements: [], materials: [], outline: ['materials'], practice: ['outline'], videos: ['outline'],
  content: ['materials', 'outline'], preview: ['materials', 'outline', 'practice', 'videos', 'content'],
};

export const hasPractice = spec => (spec?.sections || []).some(s => s.practice !== 'none');
export const activeCards = spec => CARD_KEYS.filter(k => (k !== 'practice' || hasPractice(spec)) && (k !== 'videos' || (spec?.videos || []).length));

// Every card that (directly or indirectly) builds on `key`.
export function downstream(key) {
  const out = new Set();
  const walk = k => CARD_KEYS.forEach(c => { if (DEPS[c].includes(k) && !out.has(c)) { out.add(c); walk(c); } });
  walk(key);
  return [...out];
}

// What the studio shows for a card: locked (with the missing cards), todo, in_progress, complete, needs_update,
// or action_required (a module sent back by reviewers, with open comments routed to this card).
export function cardInfo(mod, key) {
  const st = mod.studio;
  const active = activeCards(st.spec);
  const card = st.cards[key] || { state: 'todo' };
  const open = openComments(mod, key === 'preview' ? null : key).length;
  if (open) return { state: 'action_required', missing: [], open };
  const missing = DEPS[key].filter(d => active.includes(d) && st.cards[d]?.state !== 'complete');
  if (card.state === 'complete') return { state: card.stale ? 'needs_update' : 'complete', missing };
  if (missing.length) return { state: 'locked', missing };
  return { state: card.state || 'todo', missing };
}

export function studioProgress(mod) {
  const active = activeCards(mod.studio.spec);
  const done = active.filter(k => cardInfo(mod, k).state === 'complete').length;
  const next = active.find(k => !['complete', 'locked'].includes(cardInfo(mod, k).state)) || null;
  return { done, total: active.length, next };
}

// Totals shown in the wizard and on the requirements card.
export function specTotals(spec) {
  const s = spec?.sections || [];
  const lessons = s.reduce((a, x) => a + x.lessons, 0);
  const quizzes = s.filter(x => x.quiz > 0);
  const practice = s.filter(x => x.practice !== 'none');
  return {
    sections: s.length, lessons,
    minutes: s.reduce((a, x) => a + x.lessons * x.minutes + (x.quiz > 0 ? Math.ceil(x.quiz * 0.75) : 0) + (x.practice !== 'none' ? x.practiceMinutes + 3 : 0), 0),
    quizzes: quizzes.length, questions: quizzes.reduce((a, x) => a + x.quiz, 0),
    practice: practice.length, avatar: practice.filter(x => x.practice === 'avatar').length,
    videos: (spec?.videos || []).length,
  };
}

// The audience as one line of text, for prompts and cards.
export function audienceText(a, lang = 'en') {
  const pick = v => v?.[lang] || v?.en || '';
  const role = a?.role === 'other' ? a.roleOther : pick(AUDIENCE_ROLES[a?.role]);
  const exp = a?.experience === 'other' ? a.experienceOther : pick(EXPERIENCE[a?.experience]);
  return [role, exp].filter(Boolean).join(' · ');
}

// ------------------------------- Reviewer comments -------------------------------
// A comment: { id, round, team (training|sales|marketing|mlr|admin), by, at, target, block, blockType, quote, text, ai,
//   sent, agrees: [{team, by, at}], status: open|addressed|answered, reply: {text, by, at, ai}, verdict: {state, by, at} }.
// target = a lesson id, "quiz:<sectionId>", "boss:<sectionId>", "materials" or null (the whole module).
// Comments are shared with the other approvers as soon as they are written; the creator sees them once sent.
export const isOpenComment = c => !['addressed', 'answered'].includes(c.status);
export const roundComments = (mod, round = mod.round) => (mod.comments || []).filter(c => c.round === round);
// The comments the creator has to act on: the latest round's sent comments, while the module is back with the creator.
export const creatorComments = mod => (mod.status === 'changes_requested' ? roundComments(mod).filter(c => c.sent) : []);

// The studio card a comment belongs to.
export function commentCard(mod, c) {
  const active = mod.studio ? activeCards(mod.studio.spec) : CARD_KEYS;
  const has = k => active.includes(k);
  const target = String(c.target || '');
  if (target === 'materials') return has('materials') ? 'materials' : 'preview';
  if (c.blockType === 'video' && has('videos')) return 'videos';
  if (target.startsWith('boss:')) return has('practice') ? 'practice' : 'content';
  if (target.startsWith('quiz:')) return 'content';
  if ((mod.sections || []).some(s => s.lessons.some(l => l.id === target))) return 'content';
  return 'preview';
}

// Open comments for one card (or all of them with card = null).
export function openComments(mod, card = null) {
  return creatorComments(mod).filter(c => isOpenComment(c) && (!card || commentCard(mod, c) === card));
}

// ------------------------------- What changed since the last round -------------------------------
// Each block / question / final challenge gets a short fingerprint of its source-language text when the module is
// submitted, so the next round can show reviewers exactly which parts changed.
const isLoc = v => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0 && Object.keys(v).every(k => k === 'en' || k === 'es');
function sourceOnly(v, lang) {
  if (isLoc(v)) return v[lang] ?? v.en ?? v.es ?? '';
  if (Array.isArray(v)) return v.map(x => sourceOnly(x, lang));
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, sourceOnly(v[k], lang)]));
  return v;
}
function fnv(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}
export const fingerprint = (v, lang) => fnv(JSON.stringify(sourceOnly(v, lang)));

export function partPrints(mod) {
  const lang = mod.sourceLang || 'en';
  const parts = {};
  for (const s of mod.sections || []) {
    for (const l of s.lessons) parts[l.id] = (l.blocks?.length ? l.blocks : [{ type: 'text', body: l.body }]).map(b => fingerprint(b, lang));
    if (s.quiz?.length) parts[`quiz:${s.id}`] = s.quiz.map(q => fingerprint({ q: q.q, options: q.options, answer: q.answer }, lang));
    if (s.boss) parts[`boss:${s.id}`] = [fingerprint(s.boss, lang)];
  }
  return parts;
}

// Indexes of the blocks (or questions) of each part that are new or changed since the previous round.
export function changedSince(mod) {
  const prev = mod.prevPrints?.parts;
  if (!prev) return null;
  const now = partPrints(mod);
  const out = {};
  for (const [k, list] of Object.entries(now)) {
    const before = new Set(prev[k] || []);
    const idx = list.map((fp, i) => (before.has(fp) ? -1 : i)).filter(i => i >= 0);
    if (idx.length) out[k] = idx;
  }
  return out;
}
