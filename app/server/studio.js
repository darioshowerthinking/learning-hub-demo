// Training Module Creation Studio (server side): the wizard's requirements, projects and card states.
// The AI work for each card lives in studio-ai.js; the rules shared with the browser in public/js/studio-rules.js.

import { randomBytes } from 'node:crypto';
import { PRODUCT, PILLARS } from './seed.js';
import { BuilderError } from './builder.js';
import { VIDEO_LIBRARY, mediaBlock } from './seed-videos.js';
import {
  AUDIENCE_ROLES, EXPERIENCE, PRACTICE_MODES, LIMITS, CARD_KEYS, activeCards, downstream, cardInfo, audienceText,
} from '../public/js/studio-rules.js';

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const clamp = (v, [lo, hi], dflt) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, Math.round(+v))) : dflt);
const pick = (field, lang) => field?.[lang] || field?.en || field?.es || '';

// ------------------------------- The materials library -------------------------------
// Built-in approved sources (seed) + materials uploaded by creators (state.materials).
const BUILTIN_SUMMARY = {
  'src-core': { en: 'Indication, mechanism, dosing, efficacy (ZEN-HS 1 and 2), safety and access support.', es: 'Indicación, mecanismo, posología, eficacia (ZEN-HS 1 y 2), seguridad y apoyo al acceso.' },
  'src-messages': { en: 'The three approved key messages and how to open the conversation.', es: 'Los tres mensajes clave aprobados y cómo abrir la conversación.' },
  'src-objections': { en: 'Approved answers to the most common HCP objections.', es: 'Respuestas aprobadas a las objeciones más habituales de los profesionales sanitarios.' },
};
export function library(state) {
  const builtin = PRODUCT.sources.map(s => ({ id: s.id, title: s.title, body: s.body, summary: BUILTIN_SUMMARY[s.id] || null, kind: 'builtin', status: 'approved' }));
  return [...builtin, ...(state.materials || [])];
}
export const libraryIds = state => library(state).map(m => m.id);

// The video library: sample videos already used in courses, plus videos uploaded by creators.
export function videoLibrary(state) {
  const courseTitle = id => state.modules.find(m => m.id === id)?.title || null;
  return [
    ...VIDEO_LIBRARY.map(v => ({ ...v, courseTitle: courseTitle(v.course) })),
    ...(state.videos || []).map(v => ({ ...v, courseTitle: courseTitle(v.project) })),
  ];
}

// ------------------------------- Requirements (the wizard) -------------------------------
export function validateSpec(raw, state) {
  const r = raw || {};
  const title = str(r.title, 120);
  if (title.length < 3) throw new BuilderError('Give the project a name.');
  const goal = str(r.goal, 2000);
  if (goal.length < 10) throw new BuilderError('Describe what reps should be able to do (at least a sentence).');

  const a = r.audience || {};
  const role = a.role === 'other' || AUDIENCE_ROLES[a.role] ? a.role : 'derm_reps';
  const experience = a.experience === 'other' || EXPERIENCE[a.experience] ? a.experience : 'mixed';
  const audience = {
    role, roleOther: role === 'other' ? str(a.roleOther, 120) : '',
    experience, experienceOther: experience === 'other' ? str(a.experienceOther, 120) : '',
    notes: str(a.notes, 600),
  };
  if (role === 'other' && !audience.roleOther) throw new BuilderError('Describe the audience role.');
  if (experience === 'other' && !audience.experienceOther) throw new BuilderError('Describe the audience experience.');

  const rawSections = Array.isArray(r.sections) ? r.sections.slice(0, LIMITS.sections[1]) : [];
  if (!rawSections.length) throw new BuilderError('Add at least one section.');
  const sections = rawSections.map(s => ({
    lessons: clamp(s?.lessons, LIMITS.lessons, 3),
    minutes: clamp(s?.minutes, LIMITS.minutes, 10),
    quiz: clamp(s?.quiz, LIMITS.quiz, 5),
    practice: PRACTICE_MODES.includes(s?.practice) ? s.practice : 'none',
    practiceMinutes: clamp(s?.practiceMinutes, LIMITS.practiceMinutes, 5),
  }));

  const ids = libraryIds(state);
  const materials = [...new Set((Array.isArray(r.materials) ? r.materials : []).filter(id => ids.includes(id)))];
  const willUpload = !!r.willUpload;
  if (!materials.length && !willUpload) throw new BuilderError('Choose at least one approved material, or tick that you will upload new materials.');

  const videos = (Array.isArray(r.videos) ? r.videos : []).slice(0, LIMITS.videos[1]).map(v => ({
    topic: str(v?.topic, 200), section: clamp(v?.section, [0, sections.length], 0),
  }));
  if (videos.some(v => v.topic.length < 3)) throw new BuilderError('Give every video a topic.');

  return { title, goal, audience, sections, materials, willUpload, videos };
}

const blankCards = now => Object.fromEntries(CARD_KEYS.map(k => [k, k === 'requirements' ? { state: 'complete', at: now } : { state: 'todo' }]));
const videoEntries = (spec, old = []) => spec.videos.map((v, i) => ({
  ...(old[i] || { teach: '', aspects: '', conversation: '', style: 'scene', script: null, lesson: null, source: 'script', media: null }),
  id: `v${i + 1}`, topic: v.topic, section: v.section,
}));

export function newProject(spec, user, lang, now = Date.now()) {
  return {
    id: `mod-${randomBytes(4).toString('hex')}`,
    status: 'draft', round: 0, pillars: PILLARS, sources: spec.materials,
    sourceLang: lang, translation: 'done',
    title: { [lang]: spec.title }, audience: { [lang]: audienceText(spec.audience, lang) }, objective: { [lang]: spec.goal },
    sections: [],
    createdBy: user.id, createdAt: now, updatedAt: now,
    history: [{ at: now, by: user.id, action: 'project_created' }],
    studio: {
      lang, spec, cards: blankCards(now),
      outline: null, chat: [], practice: [], videos: videoEntries(spec), notes: {},
    },
  };
}

// ------------------------------- Card states -------------------------------
// A change to a card reopens it (if it was complete) and marks every completed card built on it as "needs update".
export function touch(mod, key, now = Date.now()) {
  const cards = mod.studio.cards;
  if (cards[key]?.state === 'complete') cards[key] = { ...cards[key], state: 'in_progress', at: now };
  else if (cards[key]?.state === 'todo') cards[key] = { state: 'in_progress', at: now };
  for (const k of downstream(key)) if (cards[k]?.state === 'complete') cards[k].stale = true;
  mod.updatedAt = now;
}

const READY = {
  materials: mod => mod.studio.spec.materials.length > 0 || 'Add at least one material.',
  outline: mod => (mod.studio.outline?.sections?.length > 0) || 'Ask the assistant to propose an outline first.',
  practice: mod => {
    const needed = (mod.studio.outline?.sections || []).filter(s => s.practice);
    return (needed.length && needed.every(s => mod.studio.practice.find(p => p.section === s.id && p.brief))) || 'Set up every practice session first.';
  },
  videos: mod => mod.studio.videos.every(v => ((v.source || 'script') === 'script' ? v.script : v.media)) || 'Give every video a script, an upload or a video from the library first.',
  content: mod => mod.sections.length > 0 || 'Generate the lessons and quizzes first.',
};

export function completeCard(mod, key, user, now = Date.now()) {
  if (!READY[key]) throw new BuilderError('This card cannot be completed here.');
  if (!activeCards(mod.studio.spec).includes(key)) throw new BuilderError('This card is not part of this project.');
  const info = cardInfo(mod, key);
  if (info.state === 'locked') throw new BuilderError('Complete the cards this one depends on first.', 409);
  const ok = READY[key](mod);
  if (ok !== true) throw new BuilderError(ok, 409);
  const cards = mod.studio.cards;
  const wasComplete = cards[key]?.state === 'complete';
  cards[key] = { state: 'complete', at: now };
  if (!wasComplete) for (const k of downstream(key)) if (cards[k]?.state === 'complete') cards[k].stale = true;
  mod.updatedAt = now;
  (mod.history ||= []).push({ at: now, by: user.id, action: 'card_complete', card: key });
  return mod;
}

export function reopenCard(mod, key, now = Date.now()) {
  if (key === 'requirements' || key === 'preview' || !mod.studio.cards[key]) throw new BuilderError('This card cannot be reopened.');
  touch(mod, key, now);
  return mod;
}

// Requirements edited in the wizard: reopen only the cards the change affects.
export function applySpec(mod, spec, now = Date.now()) {
  const old = mod.studio.spec;
  const changed = k => JSON.stringify(old[k]) !== JSON.stringify(spec[k]);
  mod.studio.spec = spec;
  mod.studio.cards.requirements = { state: 'complete', at: now };
  const lang = mod.studio.lang || mod.sourceLang || 'en';
  if (changed('title')) mod.title = { [lang]: spec.title };
  if (changed('audience')) mod.audience = { [lang]: audienceText(spec.audience, lang) };
  if (changed('goal') && !mod.studio.outline) mod.objective = { [lang]: spec.goal };
  if (changed('materials') || changed('willUpload')) { mod.sources = spec.materials; touch(mod, 'materials', now); }
  if (changed('goal') || changed('audience') || changed('sections')) {
    if (mod.studio.cards.outline.state !== 'todo') touch(mod, 'outline', now);
  }
  if (changed('sections')) {
    if (mod.studio.cards.practice.state !== 'todo') touch(mod, 'practice', now);
    syncPracticeModes(mod);
  }
  if (changed('videos')) {
    mod.studio.videos = videoEntries(spec, mod.studio.videos);
    if (mod.studio.cards.videos.state !== 'todo') touch(mod, 'videos', now);
  }
  mod.updatedAt = now;
  return mod;
}

// The practice mode and length chosen in the wizard follow the outline's sections (by position).
export function syncPracticeModes(mod) {
  const spec = mod.studio.spec;
  (mod.studio.outline?.sections || []).forEach((s, i) => {
    const want = spec.sections[i];
    s.practice = want && want.practice !== 'none' ? { mode: want.practice, minutes: want.practiceMinutes, focus: s.practice?.focus || '' } : null;
  });
  mod.studio.practice = mod.studio.practice.filter(p => mod.studio.outline?.sections.find(s => s.id === p.section)?.practice)
    .map(p => { const s = mod.studio.outline.sections.find(x => x.id === p.section); return { ...p, mode: s.practice.mode, minutes: s.practice.minutes }; });
}

// ------------------------------- Studio cards -> module content -------------------------------
// The section's final challenge comes from the practice card (or the outline's practice focus until it is set up).
// Unchanged challenges keep their translation.
export function syncBosses(mod) {
  const lang = mod.studio.lang;
  for (const s of mod.sections) {
    const os = mod.studio.outline?.sections.find(x => x.id === s.id);
    if (!os?.practice) { if (s.boss) { s.boss = null; } continue; }
    const p = mod.studio.practice.find(x => x.section === s.id);
    const want = p
      ? { persona: p.persona, objection: p.objection, objectionText: p.objection === 'other' ? p.objectionText || '' : '', minutes: p.minutes, mode: p.mode, brief: p.brief, opening: p.opening || '', criteria: p.criteria || [] }
      : { persona: 'reyes', objection: null, objectionText: '', minutes: os.practice.minutes, mode: os.practice.mode, brief: os.practice.focus, opening: '', criteria: [] };
    const b = s.boss;
    const same = b && b.persona === want.persona && b.objection === want.objection && b.minutes === want.minutes && b.mode === want.mode
      && (b.objectionText ? pick(b.objectionText, lang) : '') === want.objectionText
      && pick(b.brief, lang) === want.brief && (b.opening ? pick(b.opening, lang) : '') === want.opening
      && JSON.stringify((b.criteria || []).map(c => pick(c, lang))) === JSON.stringify(want.criteria);
    if (same) continue;
    s.boss = {
      persona: want.persona, objection: want.objection, minutes: want.minutes, mode: want.mode,
      ...(want.objectionText ? { objectionText: { [lang]: want.objectionText } } : {}),
      brief: { [lang]: want.brief }, opening: want.opening ? { [lang]: want.opening } : null,
      criteria: want.criteria.map(c => ({ [lang]: c })),
    };
    mod.translation = 'pending';
  }
}

// The lesson a video is placed in (set in the outline).
export const videoLesson = (mod, vid) => mod.studio.outline?.sections.flatMap(s => s.lessons).find(l => l.video === vid)?.id || null;

// Each video with a script appears as a video block right after the lesson's opening block.
export function syncVideoBlocks(mod) {
  const lang = mod.studio.lang;
  for (const s of mod.sections) for (const l of s.lessons) {
    if (!Array.isArray(l.blocks)) continue;
    const ready = x => ((x.source || 'script') === 'script' ? x.script : x.media);
    const v = mod.studio.videos.find(x => ready(x) && videoLesson(mod, x.id) === l.id);
    const old = l.blocks.find(b => b.type === 'video');
    const media = v && (v.source || 'script') !== 'script' ? v.media : null;
    const rev = media ? (media.at || media.libraryId) : v?.scriptAt;
    if (old && v && old.video === v.id && old.rev === rev && JSON.stringify(old.rendered) === JSON.stringify(media ? media.url : (v.render?.url || null))) continue;
    if (!old && !v) continue;
    l.blocks = l.blocks.filter(b => b.type !== 'video');
    if (media) {
      l.blocks.splice(Math.min(1, l.blocks.length), 0, { ...mediaBlock({ ...media, id: media.libraryId }, v.id), rev });
    } else if (v) {
      const loc = x => ({ [lang]: x });
      l.blocks.splice(Math.min(1, l.blocks.length), 0, {
        type: 'video', video: v.id, rev: v.scriptAt, seconds: v.script.seconds, rendered: v.render?.url || null,
        title: loc(v.script.title), caption: loc(v.script.summary),
        scenes: v.script.scenes.map(sc => ({ setting: loc(sc.setting), onscreen: sc.onscreen ? loc(sc.onscreen) : null, lines: sc.lines.map(x => ({ who: x.who, text: loc(x.text) })) })),
      });
    }
    mod.translation = 'pending';
  }
}

export const isProject = mod => !!mod?.studio;
// Editable in the studio: a project in design, or a module sent back by the reviewers.
export function editableProject(state, id) {
  const mod = state.modules.find(m => m.id === id);
  if (!mod || !mod.studio) throw new BuilderError('Project not found.', 404);
  if (!['draft', 'changes_requested'].includes(mod.status)) throw new BuilderError('This project has been submitted; it is locked while it is in review or live.', 409);
  return mod;
}

// A module built before the studio existed gets a studio when reviewers send it back, so the creator can work
// through the comments card by card. Every card starts complete; the requirements are read from the module itself.
export function ensureStudio(mod, now = Date.now()) {
  if (mod.studio) return mod;
  const lang = mod.sourceLang || 'en';
  const p = v => pick(v, lang);
  const within = (v, [lo, hi]) => Math.max(lo, Math.min(hi, Math.round(v)));
  const avg = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 10);
  const spec = {
    title: p(mod.title), goal: p(mod.objective),
    audience: { role: 'other', roleOther: p(mod.audience).slice(0, 120), experience: 'mixed', experienceOther: '', notes: '' },
    sections: mod.sections.map(s => ({
      lessons: within(s.lessons.length, LIMITS.lessons), minutes: within(avg(s.lessons.map(l => l.minutes || 10)), LIMITS.minutes),
      quiz: within(s.quiz.length, LIMITS.quiz), practice: s.boss ? (s.boss.mode === 'avatar' ? 'avatar' : 'chat') : 'none',
      practiceMinutes: within(s.boss?.minutes || 5, LIMITS.practiceMinutes),
    })),
    materials: mod.sources?.length ? [...mod.sources] : PRODUCT.sources.map(x => x.id), willUpload: false, videos: [],
  };
  const methods = l => [...new Set((l.blocks || []).map(b => b.type).filter(x => ['why', 'example', 'dodont', 'visual', 'chart', 'callout', 'check'].includes(x)))];
  const outline = {
    title: p(mod.title), objective: p(mod.objective), notes: '',
    sections: mod.sections.map(s => ({
      id: s.id, title: p(s.title), goal: p(s.goal), quiz: s.quiz.length, quizFocus: '',
      practice: s.boss ? { mode: s.boss.mode === 'avatar' ? 'avatar' : 'chat', minutes: s.boss.minutes, focus: p(s.boss.brief) } : null,
      lessons: s.lessons.map(l => ({ id: l.id, title: p(l.title), pillar: l.pillar, minutes: l.minutes, points: [p(l.summary)].filter(Boolean), methods: methods(l), video: null })),
    })),
  };
  mod.studio = {
    lang, spec, outline, chat: [], videos: [], notes: {}, legacy: true,
    cards: Object.fromEntries(CARD_KEYS.map(k => [k, { state: 'complete', at: now }])),
    practice: mod.sections.filter(s => s.boss).map(s => ({
      section: s.id, mode: s.boss.mode === 'avatar' ? 'avatar' : 'chat', minutes: s.boss.minutes, persona: s.boss.persona, objection: s.boss.objection || null,
      objectionText: s.boss.objectionText ? p(s.boss.objectionText) : '', brief: p(s.boss.brief), opening: s.boss.opening ? p(s.boss.opening) : '', criteria: (s.boss.criteria || []).map(p),
    })),
  };
  return mod;
}

// After an AI revision changed a final challenge, the practice card follows the module.
export function practiceFromBosses(mod) {
  if (!mod.studio) return;
  const lang = mod.studio.lang;
  for (const s of mod.sections) {
    if (!s.boss) continue;
    const p = mod.studio.practice.find(x => x.section === s.id);
    if (!p) continue;
    Object.assign(p, { persona: s.boss.persona, objection: s.boss.objection || null, minutes: s.boss.minutes,
      objectionText: s.boss.objectionText ? pick(s.boss.objectionText, lang) : '',
      brief: pick(s.boss.brief, lang), opening: s.boss.opening ? pick(s.boss.opening, lang) : '' });
  }
}

export { pick };
