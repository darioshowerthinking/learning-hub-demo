// AI module builder for content creators (Claude Sonnet 5.5 on Foundry, translation with Claude Haiku 5.5).
//
// Content is generated from the outline the creator agreed in the studio (studio-ai.js plans it):
// every lesson (blocks, length set by the creator) and every section quiz are written in parallel.
// Revising: a short plan decides what to change (outline, which lessons, which quizzes), then only those
// parts are rewritten, in parallel. Everything streams to the browser as NDJSON events:
//   {kind:'outline', text} · {kind:'lesson', key:<lessonId>, text} · {kind:'quiz', key:<sectionId>, text}
//   {kind:'plan', lessons:[ids], quizzes:[ids], outline:bool}
// The model writes ONE language; the server stores text as { en, es } and translates what is missing.

import { foundryClient, MODELS } from './foundry.js';
import { PRODUCT, PERSONAS, OBJECTIONS, PILLARS } from './seed.js';

export class BuilderError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

const LANG = { en: 'English', es: 'Spanish (Spain)' };
const otherLang = lang => (lang === 'en' ? 'es' : 'en');
const pick = (field, lang) => field?.[lang] || field?.en || field?.es || '';
const clampInt = (v, lo, hi, dflt) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, Math.round(+v))) : dflt);
const str = v => (typeof v === 'string' ? v.trim() : '');

const SOURCE_IDS = PRODUCT.sources.map(s => s.id);
const PERSONA_IDS = PERSONAS.map(p => p.id);
const OBJECTION_IDS = OBJECTIONS.map(o => o.id);

// The figure libraries (drawn in public/js/visuals.js from approved data). The AI only picks one.
export const VISUALS = {
  mechanism: 'How Derolad works: the ZN-7 signal drives inflammation, nodules and abscesses; Derolad selectively blocks ZN-7 (fictional pathway).',
  dosing: 'Dosing timeline: two loading injections at week 0, then one injection every 4 weeks; prefilled autoinjector, self-injection after training.',
  access: 'Zenetic Access Connect: benefits verification, prior authorization support and copay support, with a dedicated case manager.',
  burden: 'The burden of HS: pain, stigma and delayed diagnosis; acknowledge it before talking about the product.',
  'visit-flow': 'The approved way to handle any objection: acknowledge, ask, answer with approved information, check back, agree a next step.',
  safety: 'Safety essentials: TB screening before starting, no live vaccines, the most common side effects, refer detailed questions to the PI or Medical Information.',
  'red-lines': 'The three red lines: never minimize risk, never overstate or compare, never go off-label.',
  'patient-fit': 'Which patients to discuss: adults with moderate-to-severe HS who are not fully controlled (still having painful flares).',
};
export const CHARTS = {
  response: 'Bar chart: clinical response at week 16, Derolad 58% vs placebo 29% (ZEN-HS 1 and 2).',
  flares: 'Key figure: painful flares reduced by 47% vs placebo over 16 weeks.',
  maintenance: 'Ring chart: 81% of week-16 responders kept their response through week 52 (open-label extension).',
  'safety-ae': 'Bar chart: most common side effects, injection-site reactions 9%, upper respiratory infections 7%, headache 5%.',
};

// ------------------------------------ Schemas ------------------------------------
const S = { type: 'string' };
const obj = (props, required = Object.keys(props)) => ({ type: 'object', additionalProperties: false, required, properties: props });
const arr = items => ({ type: 'array', items });
const kind = name => ({ type: 'string', const: name });

const BOSS = obj({
  persona: { type: 'string', enum: PERSONA_IDS },
  objection: { type: 'string', enum: [...OBJECTION_IDS, 'other', 'none'] }, objection_text: S,
  minutes: { type: 'integer' }, brief: S, opening: S,
});

const OUTLINE_SCHEMA = obj({
  title: S, audience: S, objective: S, notes: S,
  sections: arr(obj({
    title: S, goal: S,
    lessons: arr(obj({ title: S, pillar: { type: 'string', enum: PILLARS }, minutes: { type: 'integer' }, focus: S })),
    boss: BOSS,
  })),
});

const BLOCK = {
  anyOf: [
    obj({ type: kind('text'), heading: S, body: S }),
    obj({ type: kind('why'), body: S }),
    obj({ type: kind('keypoints'), heading: S, items: arr(S) }),
    obj({ type: kind('example'), title: S, context: S, lines: arr(obj({ who: { type: 'string', enum: ['rep', 'hcp'] }, text: S })), debrief: S }),
    obj({ type: kind('dodont'), items: arr(obj({ say: S, avoid: S, why: S })) }),
    obj({ type: kind('visual'), visual: { type: 'string', enum: Object.keys(VISUALS) }, caption: S }),
    obj({ type: kind('chart'), chart: { type: 'string', enum: Object.keys(CHARTS) }, caption: S }),
    obj({ type: kind('callout'), tone: { type: 'string', enum: ['tip', 'compliance'] }, body: S }),
    obj({ type: kind('check'), q: S, options: arr(S), answer: { type: 'integer' }, explanation: S }),
  ],
};

const lessonSchema = sourceIds => obj({
  title: S, summary: S, blocks: arr(BLOCK),
  sources: arr({ type: 'string', enum: sourceIds.length ? sourceIds : SOURCE_IDS }),
});

const QUIZ_SCHEMA = obj({
  questions: arr(obj({ q: S, pillar: { type: 'string', enum: PILLARS }, options: arr(S), answer: { type: 'integer' } })),
});

const PLAN_SCHEMA = obj({
  outline_instruction: S,
  lessons: arr(obj({ id: S, instruction: S })),
  quizzes: arr(obj({ section: S, instruction: S })),
  notes: S,
});

// ------------------------------------ Prompts ------------------------------------
// The material the AI may use: the built-in approved sources plus materials uploaded by creators
// (lib = library(state) from studio.js). Uploaded text is stored as written, in one language.
const BUILTIN_LIB = PRODUCT.sources.map(s => ({ ...s, status: 'approved' }));
function materials(sourceIds, lang, lib = BUILTIN_LIB) {
  return lib.filter(s => sourceIds.includes(s.id)).map(s => {
    const body = typeof s.body === 'string' ? s.body : pick(s.body, lang);
    const pending = s.status === 'pending' ? ' (uploaded; MLR approval pending)' : '';
    return `### [${s.id}] ${pick(s.title, lang)}${pending}\n${body.slice(0, 16000)}`;
  }).join('\n\n');
}

const COMPLIANCE = `Compliance rules (non-negotiable; Training, Sales, Marketing and MLR will review everything)
- Use ONLY facts in the approved material. Copy every number exactly. Never invent studies, numbers, guarantees, timelines, patient stories or comparisons.
- Never name or compare with other real or fictional medicines. No off-label uses (adults with moderate-to-severe HS, approved dosing only).
- Whenever reps are taught to present a benefit, safety is part of the conversation.
- Always teach reps to acknowledge the burden of HS before talking about the product.
- If the brief asks for something the material does not support, leave it out and say so in the notes.`;

function baseSystem(sourceIds, lang, lib) {
  return `You are a senior instructional designer at Zenetic Pharma (a fictional company). You write deep, practical training for pharmaceutical sales reps about Derolad® (a fictional product), the kind of material an experienced field trainer would be proud of: it explains the reasoning behind every recommendation, shows what good looks like with realistic examples, and prepares reps for real conversations.

${COMPLIANCE}

Write every text field in ${LANG[lang]}${lang === 'es' ? ', addressing the rep as "tú" and using "usted" only in lines spoken between the rep and an HCP' : ''}. Plain text only: no markdown, no bullet characters, no emojis.

Approved material
${materials(sourceIds, lang, lib)}`;
}

function outlinePrompt(sectionCount) {
  const personas = PERSONAS.map(p => `- ${p.id}: ${p.name}, ${pick(p.role, 'en')} (${p.receptiveness}, ${p.openness}, ${p.difficulty} difficulty)`).join('\n');
  const objections = OBJECTIONS.map(o => `- ${o.id}: ${pick(o.text, 'en')}`).join('\n');
  return `Plan the module (an outline; the lessons are written afterwards from your plan).

How a module works
- A module is a sequence of sections. Each section: 2 or 3 deep lessons (10 to 15 minutes each), a 4-question quiz, then a final challenge: a timed practice visit with an AI-simulated HCP that the rep must beat to finish the section.
- Pillars: "product" (product knowledge), "messaging" (approved key messages), "objections" (objection handling). Spread lessons across the pillars that fit the brief.
- Sections build on each other; the last section's challenge is the hardest. Lessons in a module must not repeat each other.

For each lesson give a precise "focus" (2 or 3 sentences): what the lesson covers, which approved facts it uses, and what the rep will be able to do afterwards. This is the brief for the lesson writer.

Final challenge ("boss"): the HCP persona and objection that best test the section ("none" for a general first visit; "other" with the HCP's words in "objection_text" for an objection not in the list, otherwise "objection_text" is an empty string); "brief" is 1 or 2 sentences to the rep; "minutes" 3 to 6; "opening" is the HCP's first line in character (one sentence) or an empty string.

"notes" (2 or 3 sentences to the content creator): what you built and what reviewers should double-check. Refer to sources by their titles, never by their ids.

Create exactly ${sectionCount} section${sectionCount > 1 ? 's' : ''}.

Personas
${personas}

Objections
${objections}`;
}

// Teaching methods the creator can ask for in the outline (each is a block type the lesson writer uses).
export const METHODS = ['why', 'example', 'dodont', 'visual', 'chart', 'callout', 'check'];

function lessonPrompt(minutes = 12, methods = []) {
  const words = minutes * 100;
  const lo = Math.max(300, Math.round(words * 0.85 / 50) * 50), hi = Math.max(450, Math.round(words * 1.1 / 50) * 50);
  const blocks = `${Math.max(5, Math.round(minutes * 0.7))} to ${Math.max(7, minutes + 1)}`;
  const structure = minutes >= 9
    ? `- At least two more text blocks that go deep, one why block, one example block, one dodont block, one check block.
- 1 or 2 figures where they help. At least one callout.`
    : `- At least one more text block, one example or dodont block and one check block.
- A figure only if it clearly helps. At least one callout.`;
  const agreed = methods.length ? `\n- The content creator agreed these teaching methods for this lesson: include at least one block of each type: ${methods.join(', ')}.` : '';
  const visuals = Object.entries(VISUALS).map(([id, d]) => `- ${id}: ${d}`).join('\n');
  const charts = Object.entries(CHARTS).map(([id, d]) => `- ${id}: ${d}`).join('\n');
  return `Write ONE deep lesson (about ${minutes} minutes of reading and practice, about ${lo} to ${hi} words) as a sequence of blocks.

Block types
- text: a heading (may be empty for the opening block) and a body of 2 to 4 paragraphs separated by a blank line. Explain the content in depth and the reasoning behind it.
- why: "Why it matters": the reasoning that connects this point to the HCP's or patient's reality and to a better conversation.
- example: a realistic field example: a short title, the context (who, where, what just happened), 6 to 10 dialogue lines alternating rep and hcp, and a debrief that explains why it works, referring to specific lines.
- dodont: 3 or 4 items, each a compliant line to say, the tempting line to avoid, and why.
- keypoints: a heading and 4 to 6 short, memorable points.
- callout: tone "compliance" for anything about safety, claims, competitors or off-label risk; tone "tip" for practical field advice.
- check: a check-yourself question with 3 options, the index of the correct one ("answer", 0-based) and an explanation of why.
- visual / chart: a figure from the libraries below, with a caption telling the rep what to take from it. Only use a figure that genuinely supports the lesson.

Structure (${blocks} blocks)
- Open with a text block that sets the scene in the field.
${structure}${agreed}
- End with a keypoints block headed with something like "Remember".

"summary" is one sentence on what the rep will be able to do after the lesson. "sources" lists the ids of the approved sources the lesson relies on.

Illustration library (visual)
${visuals}

Chart library (chart): the data is drawn from the approved material
${charts}`;
}

const quizPrompt = n => `Write the section quiz: exactly ${n} question${n === 1 ? '' : 's'} that check understanding of this section's lessons (scenarios and judgement, not trivia). Each has exactly 3 options and one correct answer ("answer", 0-based). Vary the position of the correct answer. Wrong options must be plausible but clearly wrong according to the approved material.`;

// ------------------------------------ Model calls ------------------------------------
async function streamJson({ schema, system, content, onText, maxTokens = 8000, effort = 'low' }) {
  const stream = (await foundryClient()).messages.stream({
    model: MODELS.main,
    max_tokens: maxTokens,
    output_config: { effort, format: { type: 'json_schema', schema } },
    cache_control: { type: 'ephemeral' },   // the system prompt (material + libraries) repeats across parallel calls
    system,
    messages: [{ role: 'user', content }],
  });
  if (onText) stream.on('text', onText);
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new BuilderError('The assistant declined this request. Try rewording it.', 422);
  if (msg.stop_reason === 'max_tokens') throw new BuilderError('A part of the module came out too long. Please try again.', 422);
  return JSON.parse(msg.content.filter(b => b.type === 'text').map(b => b.text).join(''));
}

// Runs async jobs with at most `limit` at a time (keeps parallel writing within the per-minute limits).
async function pool(jobs, limit) {
  const results = new Array(jobs.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, async () => {
    while (next < jobs.length) { const i = next++; results[i] = await jobs[i](); }
  }));
  return results;
}
const PARALLEL = 6;

// ------------------------------------ Shapes ------------------------------------
// Stored text is { en, es }; the model reads and writes plain strings. These walkers convert generically.
const NON_TEXT = new Set(['type', 'chart', 'visual', 'tone', 'who', 'pillar', 'persona', 'objection', 'id']);
const isLoc = v => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0 && Object.keys(v).every(k => k === 'en' || k === 'es');

function wrap(v, lang, key) {
  if (typeof v === 'string') return NON_TEXT.has(key) ? v : { [lang]: v.trim() };
  if (Array.isArray(v)) return v.map(x => wrap(x, lang, key));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, wrap(x, lang, k)]));
  return v;
}
function unwrap(v, lang) {
  if (isLoc(v)) return pick(v, lang);
  if (Array.isArray(v)) return v.map(x => unwrap(x, lang));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, unwrap(x, lang)]));
  return v;
}
export function collectTexts(v, out = []) {
  if (isLoc(v)) out.push(v);
  else if (Array.isArray(v)) v.forEach(x => collectTexts(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach(x => collectTexts(x, out));
  return out;
}

// Keeps only well-formed blocks (the libraries and enums are already enforced by the schema).
function cleanBlocks(blocks) {
  return (blocks || []).filter(b => b && b.type).map(b => {
    if (b.type === 'check') {
      const options = (b.options || []).slice(0, 4);
      return options.length >= 2 ? { ...b, options, answer: clampInt(b.answer, 0, options.length - 1, 0) } : null;
    }
    if (b.type === 'example') return (b.lines || []).length ? { ...b, lines: b.lines.slice(0, 14) } : null;
    if (b.type === 'visual' && !VISUALS[b.visual]) return null;
    if (b.type === 'chart' && !CHARTS[b.chart]) return null;
    return b;
  }).filter(Boolean);
}

function lessonFields(out, meta, lang, sourceIds) {
  return {
    id: meta.id, pillar: meta.pillar, minutes: meta.minutes,
    title: { [lang]: str(out.title) || str(meta.title) },
    summary: { [lang]: str(out.summary) },
    blocks: wrap(cleanBlocks(out.blocks), lang),
    sources: (out.sources || []).filter(id => sourceIds.includes(id)),
  };
}

function quizFields(out, lang, firstId) {
  return (out.questions || []).filter(q => (q.options || []).length >= 2).slice(0, 15).map((q, i) => ({
    id: `q${firstId + i}`,
    pillar: PILLARS.includes(q.pillar) ? q.pillar : 'product',
    q: { [lang]: str(q.q) },
    options: q.options.slice(0, 4).map(o => ({ [lang]: str(o) })),
    answer: clampInt(q.answer, 0, Math.min(q.options.length, 4) - 1, 0),
  }));
}

function bossFields(b, lang) {
  return {
    persona: PERSONA_IDS.includes(b?.persona) ? b.persona : 'reyes',
    ...(b?.objection === 'other' && str(b?.objection_text)
      ? { objection: 'other', objectionText: { [lang]: str(b.objection_text) } }
      : { objection: OBJECTION_IDS.includes(b?.objection) ? b.objection : null }),
    minutes: clampInt(b?.minutes, 2, 15, 4),
    brief: { [lang]: str(b?.brief) },
    opening: str(b?.opening) ? { [lang]: str(b.opening) } : null,
  };
}

// The module as plain text for the model (outline level, with lesson focus or summary).
function outlineText(sections) {
  return sections.map((s, i) => `Section ${i + 1} (${s.id}): ${s.title}${s.goal ? ` — ${s.goal}` : ''}\n${s.lessons.map(l =>
    `  - Lesson ${l.id} [${l.pillar}, ${l.minutes} min]: ${l.title}${l.videoTopic ? ` [includes the video "${l.videoTopic}"]` : ''}${l.focus ? ` — ${l.focus}` : ''}`).join('\n')}`).join('\n');
}

// ------------------------------------ Draft ------------------------------------
export async function writeLesson({ system, moduleText, lesson, section, instruction, current, lang, sourceIds, emit = () => {} }) {
  const minutes = clampInt(lesson.minutes, 3, 25, 12);
  const content = current
    ? `The module:\n${moduleText}\n\nHere is lesson ${lesson.id} ("${lesson.title}", section "${section.title}") as JSON:\n${JSON.stringify(current)}\n\nRewrite it according to this request: ${instruction}\nChange only what the request needs. Copy every other block exactly as it is, character for character, in the same order, so reviewers can see precisely what changed. Return the complete lesson.`
    : `The module:\n${moduleText}\n\nWrite lesson ${lesson.id}: "${lesson.title}" (pillar: ${lesson.pillar}; about ${minutes} minutes) in section "${section.title}".\nFocus: ${lesson.focus}${lesson.videoNote || ''}`;
  const out = await streamJson({
    schema: lessonSchema(sourceIds), system: `${system}\n\n${lessonPrompt(minutes, lesson.methods || [])}`, content, maxTokens: Math.max(6000, minutes * 650),
    onText: text => emit({ kind: 'lesson', key: lesson.id, text }),
  });
  return lessonFields(out, lesson, lang, sourceIds);
}

async function writeQuiz({ system, moduleText, section, instruction, current, lang, firstId, emit, count }) {
  const n = Math.max(1, Math.min(15, count ?? current?.questions?.length ?? 4));
  const content = current
    ? `The module:\n${moduleText}\n\nHere is the quiz for section "${section.title}" as JSON:\n${JSON.stringify(current)}\n\nRewrite it according to this request: ${instruction}\nReturn the complete quiz.`
    : `The module:\n${moduleText}\n\nWrite the quiz for section "${section.title}".${section.quizFocus ? `\nWhat the quiz should check (agreed with the creator): ${section.quizFocus}` : ''}`;
  const out = await streamJson({
    schema: QUIZ_SCHEMA, system: `${system}\n\n${quizPrompt(n)}`, content, maxTokens: 1200 + n * 450,
    onText: text => emit({ kind: 'quiz', key: section.id, text }),
  });
  return quizFields(out, lang, firstId);
}

export { baseSystem, streamJson, pool, materials, pick, LANG };

// ------------------------------- Generate from the studio's agreed outline -------------------------------
// A lesson with an instructional video: the video is shown right after the lesson's opening block.
function videoNote(st, l) {
  const v = l.video && (st.videos || []).find(x => x.id === l.video);
  if (!v) return {};
  return { videoTopic: v.topic, videoNote: `\nThis lesson includes the instructional video "${v.topic}"${v.teach ? ` (it teaches: ${v.teach})` : ''}, shown right after your opening block. Introduce it in the opening (what to watch for), then build on it: apply it, practise it and check it. Do not retell the video.` };
}

// Every lesson and quiz is written in parallel from the outline the creator agreed (key points, teaching methods,
// minutes, quiz length). Final challenges and videos are added from their own studio cards (studio.js).
export async function generateFromOutline(mod, lib, audience, emit) {
  const st = mod.studio, lang = st.lang || mod.sourceLang || 'en', o = st.outline;
  const sourceIds = st.spec.materials;
  const system = baseSystem(sourceIds, lang, lib);
  const sections = o.sections.map(s => ({
    id: s.id, title: s.title, goal: s.goal, quiz: s.quiz, quizFocus: s.quizFocus,
    lessons: s.lessons.map(l => ({ id: l.id, title: l.title, pillar: l.pillar, minutes: l.minutes, methods: l.methods || [],
      focus: `Key points agreed with the content creator: ${(l.points || []).join(' | ')}`, ...videoNote(st, l) })),
  }));
  const moduleText = `${o.title}\nAudience: ${audience}\nObjective: ${o.objective}\nWhat the content creator wants reps to be able to do: ${st.spec.goal}\n${outlineText(sections)}`;
  const lessonJobs = sections.flatMap(section => section.lessons.map(lesson => () =>
    writeLesson({ system, moduleText, lesson, section, lang, sourceIds, emit })));
  const quizSections = sections.filter(s => s.quiz > 0);
  const quizJobs = quizSections.map((section, i) => () =>
    writeQuiz({ system, moduleText, section, lang, firstId: i * 20 + 1, emit, count: section.quiz }));
  const results = await pool([...lessonJobs, ...quizJobs], PARALLEL);
  const lessons = Object.fromEntries(results.slice(0, lessonJobs.length).map(l => [l.id, l]));
  const quizzes = Object.fromEntries(quizSections.map((s, i) => [s.id, results[lessonJobs.length + i]]));
  return {
    title: { [lang]: o.title }, objective: { [lang]: o.objective }, aiNotes: { [lang]: o.notes || '' },
    sections: sections.map(s => ({
      id: s.id, title: { [lang]: s.title }, goal: s.goal ? { [lang]: s.goal } : null,
      lessons: s.lessons.map(l => lessons[l.id]), quiz: quizzes[s.id] || [], boss: null,
    })),
  };
}

// ------------------------------------ Revise ------------------------------------
// The module at outline level, for the outline rewrite.
function currentOutline(mod, lang) {
  return {
    title: pick(mod.title, lang), audience: pick(mod.audience, lang), objective: pick(mod.objective, lang), notes: '',
    sections: mod.sections.map(s => ({
      title: pick(s.title, lang), goal: pick(s.goal, lang),
      lessons: s.lessons.map(l => ({ title: pick(l.title, lang), pillar: l.pillar, minutes: l.minutes, focus: pick(l.summary, lang) || pick(l.body, lang).slice(0, 300) })),
      boss: s.boss ? { persona: s.boss.persona, objection: s.boss.objection || 'none', objection_text: s.boss.objection === 'other' ? pick(s.boss.objectionText, lang) : '', minutes: s.boss.minutes, brief: pick(s.boss.brief, lang), opening: s.boss.opening ? pick(s.boss.opening, lang) : '' }
        : { persona: 'reyes', objection: 'none', objection_text: '', minutes: 4, brief: '(no final challenge in this section; leave as is)', opening: '' },
    })),
  };
}
const lessonForModel = (l, lang) => unwrap({
  title: l.title, summary: l.summary || { en: '' },
  blocks: l.blocks || [{ type: 'text', heading: { en: '' }, body: l.body || { en: '' } }],
  sources: l.sources || [],
}, lang);
const quizForModel = (quiz, lang) => ({ questions: quiz.map(q => unwrap({ q: q.q, pillar: q.pillar, options: q.options, answer: q.answer }, lang)) });

export async function reviseModule(mod, instruction, emit, lib) {
  const lang = mod.sourceLang || 'en';
  const sourceIds = mod.sources?.length ? mod.sources : SOURCE_IDS;
  const system = baseSystem(sourceIds, lang, lib);
  const sections = mod.sections.map(s => ({
    id: s.id, title: pick(s.title, lang), goal: pick(s.goal, lang),
    lessons: s.lessons.map(l => ({ id: l.id, title: pick(l.title, lang), pillar: l.pillar, minutes: l.minutes, focus: pick(l.summary, lang) })),
  }));
  const moduleText = `${pick(mod.title, lang)}\nObjective: ${pick(mod.objective, lang)}\n${outlineText(sections)}`;

  // 1. Plan: which parts need to change.
  const planMsg = await (await foundryClient()).messages.create({
    model: MODELS.main, max_tokens: 3000,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: PLAN_SCHEMA } },
    system: `${system}\n\nYou plan revisions of an existing training module. Decide the smallest set of changes that fully satisfies the request:
- "outline_instruction": what to change in the module title, audience, objective, section titles or final challenges (empty string if nothing).
- "lessons": the lessons to rewrite (by id, e.g. "l2") with a precise instruction for each.
- "quizzes": the section quizzes to rewrite (by section id, e.g. "s1") with an instruction.
- "notes": 2 or 3 sentences for the content creator and the reviewers, in the past tense as if the change is done ("Rewrote the opening of ... to ..."), on what changed and what reviewers should check. Refer to lessons and sources by their titles, never by ids such as l2 or s1.
New sections or lessons cannot be added in a revision; say so in the notes if the request asks for it.`,
    messages: [{ role: 'user', content: `The module:\n${moduleText}\n\nRequest:\n${instruction}` }],
  });
  if (planMsg.stop_reason === 'refusal') throw new BuilderError('The assistant declined this request. Try rewording it.', 422);
  const plan = JSON.parse(planMsg.content.filter(b => b.type === 'text').map(b => b.text).join(''));
  const lessonById = Object.fromEntries(mod.sections.flatMap(s => s.lessons.map(l => [l.id, { l, s }])));
  const lessonPlan = (plan.lessons || []).filter(x => lessonById[x.id]);
  const quizPlan = (plan.quizzes || []).filter(x => mod.sections.some(s => s.id === x.section));
  const outlineChange = str(plan.outline_instruction);
  if (!lessonPlan.length && !quizPlan.length && !outlineChange) throw new BuilderError('The assistant found nothing to change for this request. Try being more specific.', 422);
  emit({ kind: 'plan', lessons: lessonPlan.map(x => x.id), quizzes: quizPlan.map(x => x.section), outline: !!outlineChange });

  // 2. Rewrite the planned parts in parallel.
  const jobs = [];
  if (outlineChange) jobs.push(async () => ({ outline: await streamJson({
    schema: OUTLINE_SCHEMA, system: `${system}\n\n${outlinePrompt(mod.sections.length)}`, maxTokens: 4000,
    content: `Here is the current module outline as JSON:\n${JSON.stringify(currentOutline(mod, lang))}\n\nChange it according to this request: ${outlineChange}\nKeep the same sections and lessons (same number, same order); change only what the request needs.`,
    onText: text => emit({ kind: 'outline', text }),
  }) }));
  for (const x of lessonPlan) {
    const { l, s } = lessonById[x.id];
    jobs.push(async () => ({ lesson: await writeLesson({
      system, moduleText, lang, sourceIds, emit, instruction: x.instruction, current: lessonForModel(l, lang),
      lesson: { id: l.id, title: pick(l.title, lang), pillar: l.pillar, minutes: l.minutes, focus: pick(l.summary, lang) },
      section: { id: s.id, title: pick(s.title, lang) },
    }) }));
  }
  const firstId = Math.max(0, ...mod.sections.flatMap(y => y.quiz.map(q => Number(String(q.id).slice(1)) || 0))) + 1;
  quizPlan.forEach((x, n) => {
    const s = mod.sections.find(y => y.id === x.section);
    jobs.push(async () => ({ quiz: await writeQuiz({ count: s.quiz.length,
      system, moduleText, lang, emit, instruction: x.instruction, current: quizForModel(s.quiz, lang),
      section: { id: s.id, title: pick(s.title, lang) }, firstId: firstId + n * 10,
    }), section: s.id }));
  });
  const results = await pool(jobs, PARALLEL);
  return { results, notes: str(plan.notes), lang };
}

// Applies reviseModule's results to the stored module (in place).
export function applyRevision(mod, { results, notes, lang }) {
  for (const r of results) {
    if (r.outline) {
      const o = r.outline;
      if (str(o.title)) mod.title = { [lang]: str(o.title) };
      if (str(o.audience)) mod.audience = { [lang]: str(o.audience) };
      if (str(o.objective)) mod.objective = { [lang]: str(o.objective) };
      mod.sections.forEach((s, i) => {
        const os = o.sections?.[i];
        if (!os) return;
        if (str(os.title) && str(os.title) !== pick(s.title, lang)) s.title = { [lang]: str(os.title) };
        if (str(os.goal) && str(os.goal) !== pick(s.goal, lang)) s.goal = { [lang]: str(os.goal) };
        if (!s.boss) return;
        const b = { ...bossFields(os.boss, lang), ...(s.boss.mode ? { mode: s.boss.mode } : {}) };
        const same = b.persona === s.boss.persona && b.objection === s.boss.objection && b.minutes === s.boss.minutes
          && pick(b.objectionText, lang) === pick(s.boss.objectionText, lang)
          && pick(b.brief, lang) === pick(s.boss.brief, lang) && pick(b.opening, lang) === pick(s.boss.opening, lang);
        if (!same) s.boss = b;
      });
    }
    if (r.lesson) {
      for (const s of mod.sections) {
        const i = s.lessons.findIndex(l => l.id === r.lesson.id);
        if (i < 0) continue;
        // The AI writes text blocks only: the lesson keeps its video where it was.
        const videos = (s.lessons[i].blocks || []).map((b, k) => [b, k]).filter(([b]) => b.type === 'video');
        const next = r.lesson;
        for (const [b, k] of videos) if (Array.isArray(next.blocks) && !next.blocks.some(x => x.type === 'video')) next.blocks.splice(Math.min(k, next.blocks.length), 0, b);
        s.lessons[i] = next;
      }
    }
    if (r.quiz) {
      const s = mod.sections.find(x => x.id === r.section);
      if (s && r.quiz.length) s.quiz = r.quiz;
    }
  }
  if (notes) mod.aiNotes = { [lang]: notes };
  mod.translation = 'pending';
  return mod;
}

// The reviewers' comments on a module, as an instruction for reviseModule.
// comments: the open comments to address (mod.comments entries; see public/js/studio-rules.js).
export function commentsInstruction(mod, lang, comments) {
  const lessons = Object.fromEntries(mod.sections.flatMap(s => s.lessons).map(l => [l.id, pick(l.title, lang)]));
  const sections = Object.fromEntries(mod.sections.map(s => [s.id, pick(s.title, lang)]));
  const where = target => {
    const [kind, sid] = String(target || '').split(':');
    if (lessons[target]) return `lesson ${target} ("${lessons[target]}")`;
    if (kind === 'quiz' && sections[sid]) return `the quiz of section ${sid} ("${sections[sid]}")`;
    if (kind === 'boss' && sections[sid]) return `the final challenge of section ${sid} ("${sections[sid]}")`;
    return 'the module';
  };
  const team = t => (t === 'admin' ? 'TRAINING MANAGER' : t.toUpperCase());
  const lines = (comments || []).map(c =>
    `- ${team(c.team)} on ${where(c.target)}: ${pick(c.text, lang) || c.text?.en || c.text?.es}${c.quote ? ` (about this exact text: "${c.quote}")` : ''}`);
  if (!lines.length) throw new BuilderError('There are no open reviewer comments to address.');
  return `Address every reviewer comment below, staying strictly within the approved material. Change only what each comment needs:\n${lines.join('\n')}`;
}

// ------------------------------------ Translation ------------------------------------
// Translates every text that is missing in the other language, in parallel chunks (one per lesson).
const TRANSLATION_SCHEMA = obj({ texts: arr(S) });

async function translateChunk(fields, from, to) {
  const msg = await (await foundryClient()).messages.create({
    model: MODELS.fast,
    max_tokens: 16000,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: TRANSLATION_SCHEMA } },
    system: `You translate pharmaceutical sales-training content for Zenetic Pharma (fictional) from ${LANG[from]} to ${LANG[to]}. Keep the meaning exact: numbers, percentages, product names (Derolad®, Zenetic Access Connect), study names and medical terms must stay accurate. Use natural, professional ${LANG[to]}${to === 'es' ? ' as used in Spain: address the sales rep as "tú" (e.g. "Reconoce la carga…"), and use "usted" only inside lines spoken to or by an HCP' : ''}. Keep paragraph breaks (blank lines) where they are. Return the same number of texts, in the same order.`,
    messages: [{ role: 'user', content: JSON.stringify({ texts: fields.map(f => f[from] || '') }) }],
  });
  if (msg.stop_reason === 'refusal') throw new BuilderError('The translation could not be completed.', 422);
  const { texts } = JSON.parse(msg.content.filter(b => b.type === 'text').map(b => b.text).join(''));
  if (!Array.isArray(texts) || texts.length !== fields.length) throw new BuilderError('The translation came back incomplete. Please try again.', 502);
  fields.forEach((f, i) => { f[to] = str(texts[i]); });
}

export async function translateModule(mod) {
  const from = mod.sourceLang || 'en', to = otherLang(from);
  const missing = v => collectTexts(v).filter(f => f[from] && !f[to]);
  const chunks = [missing({ title: mod.title, audience: mod.audience, objective: mod.objective, aiNotes: mod.aiNotes })];
  for (const s of mod.sections) {
    chunks.push(missing({ title: s.title, goal: s.goal, quiz: s.quiz, boss: s.boss }));
    for (const l of s.lessons) chunks.push(missing(l));
  }
  // Smaller pieces translate faster in parallel: split each chunk at about 3,000 characters.
  const pieces = [];
  for (const c of chunks) {
    let cur = [], size = 0;
    for (const f of c) {
      const n = (f[from] || '').length;
      if (cur.length && size + n > 3000) { pieces.push(cur); cur = []; size = 0; }
      cur.push(f); size += n;
    }
    if (cur.length) pieces.push(cur);
  }
  await pool(pieces.map(c => () => translateChunk(c, from, to)), 10);
  mod.translation = 'done';
  return mod;
}

// ------------------------------------ Manual edits ------------------------------------
// The editor sends the module in the source language with the same structure (it cannot add or remove
// lessons, blocks or questions). Changed text loses its other-language version, which is re-translated.
function mergeText(stored, edited, lang, mark) {
  if (isLoc(stored)) {
    if (typeof edited !== 'string') return stored;
    const v = edited.trim();
    if (pick(stored, lang) === v) return stored;
    mark();
    return v ? { [lang]: v } : null;
  }
  if (stored === null && typeof edited === 'string' && edited.trim()) { mark(); return { [lang]: edited.trim() }; }
  if (Array.isArray(stored)) return stored.map((x, i) => mergeText(x, Array.isArray(edited) ? edited[i] : undefined, lang, mark));
  if (stored && typeof stored === 'object') {
    const out = { ...stored };
    for (const k of Object.keys(stored)) if (edited && typeof edited === 'object' && k in edited) out[k] = mergeText(stored[k], edited[k], lang, mark);
    return out;
  }
  return stored;
}

export function applyEdits(mod, edits) {
  const lang = mod.sourceLang || 'en';
  let changed = false;
  const mark = () => { changed = true; };
  const num = (v, lo, hi, cur) => { const n = clampInt(v, lo, hi, cur); if (n !== cur) mark(); return n; };
  const choose = (v, allowed, cur) => { if (allowed.includes(v) && v !== cur) { mark(); return v; } return cur; };

  for (const k of ['title', 'audience', 'objective']) {
    mod[k] = mergeText(mod[k], edits[k], lang, mark);
    if (!pick(mod[k], lang)) throw new BuilderError('Title, audience and objective cannot be empty.');
  }
  for (const s of mod.sections) {
    const es = edits.sections?.find(x => x.id === s.id);
    if (!es) continue;
    s.title = mergeText(s.title, es.title, lang, mark);
    for (const l of s.lessons) {
      const el = es.lessons?.find(x => x.id === l.id);
      if (!el) continue;
      l.title = mergeText(l.title, el.title, lang, mark);
      if (l.summary) l.summary = mergeText(l.summary, el.summary, lang, mark);
      if (l.body) l.body = mergeText(l.body, el.body, lang, mark);
      l.pillar = choose(el.pillar, PILLARS, l.pillar);
      l.minutes = num(el.minutes, 1, 30, l.minutes);
      if (Array.isArray(l.blocks) && Array.isArray(el.blocks)) {
        l.blocks = l.blocks.map((b, i) => {
          const eb = el.blocks[i];
          if (!eb) return b;
          const nb = mergeText(b, eb, lang, mark);
          if (b.type === 'visual') nb.visual = choose(eb.visual, Object.keys(VISUALS), b.visual);
          if (b.type === 'chart') nb.chart = choose(eb.chart, Object.keys(CHARTS), b.chart);
          if (b.type === 'callout') nb.tone = choose(eb.tone, ['tip', 'compliance'], b.tone);
          if (b.type === 'check') nb.answer = num(eb.answer, 0, b.options.length - 1, b.answer);
          if (b.type === 'example') nb.lines = nb.lines.map((ln, j) => ({ ...ln, who: choose(eb.lines?.[j]?.who, ['rep', 'hcp'], ln.who) }));
          return nb;
        });
      }
    }
    for (const q of s.quiz) {
      const eq = es.quiz?.find(x => x.id === q.id);
      if (!eq) continue;
      q.q = mergeText(q.q, eq.q, lang, mark);
      q.options = mergeText(q.options, eq.options, lang, mark);
      q.answer = num(eq.answer, 0, q.options.length - 1, q.answer);
    }
    if (es.boss && s.boss) {
      s.boss.persona = choose(es.boss.persona, PERSONA_IDS, s.boss.persona);
      const objection = OBJECTION_IDS.includes(es.boss.objection) || (es.boss.objection === 'other' && s.boss.objectionText) ? es.boss.objection : null;
      if (objection !== s.boss.objection) { s.boss.objection = objection; mark(); }
      if (objection !== 'other') delete s.boss.objectionText;
      s.boss.minutes = num(es.boss.minutes, 2, 15, s.boss.minutes);
      s.boss.brief = mergeText(s.boss.brief, es.boss.brief, lang, mark);
      s.boss.opening = mergeText(s.boss.opening, es.boss.opening, lang, mark);
    }
  }
  if (changed) mod.translation = 'pending';
  return mod;
}

export const isEditable = mod => ['draft', 'changes_requested'].includes(mod.status);
