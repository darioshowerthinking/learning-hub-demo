// The AI behind the studio cards (Claude Sonnet 5.5 on Foundry; Haiku 5.5 reads uploaded materials).
//  - outlineTurn   : proposes the outline, then revises it in a conversation with the creator
//  - draftPractice : the practice sessions (persona, objection, brief, opening line, what good looks like)
//  - writeVideoScript : a short instructional video script (scenes, narration or rep/HCP dialogue)
//  - readMaterial  : extracts the text of an uploaded PDF/Word/text file and the key facts the AI may use
// Everything is grounded on the project's materials; the creator decides and marks each card complete.

import { extractText, getDocumentProxy } from 'unpdf';
import mammoth from 'mammoth';
import { foundryClient, MODELS } from './foundry.js';
import { PERSONAS, OBJECTIONS, PILLARS } from './seed.js';
import { streamJson, materials, LANG, METHODS, BuilderError } from './builder.js';
import { audienceText } from '../public/js/studio-rules.js';

const S = { type: 'string' };
const obj = props => ({ type: 'object', additionalProperties: false, required: Object.keys(props), properties: props });
const arr = items => ({ type: 'array', items });
const oneOf = values => ({ type: 'string', enum: values });
const str = (v, max = 4000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const clamp = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, Math.round(+v))) : d);
const tu = lang => (lang === 'es' ? ' (address the creator as "tú")' : '');

const COMPLIANCE = `Compliance (non-negotiable; Training, Sales, Marketing and MLR review everything): use ONLY facts in the materials below and copy numbers exactly; never invent studies, numbers, guarantees, timelines, patient stories or comparisons; never name or compare with other medicines; on-label only (adults with moderate-to-severe HS, approved dosing); when reps present a benefit, safety is part of the conversation; reps acknowledge the burden of HS before talking about the product.`;

function designerSystem(mod, lib, task) {
  const lang = mod.studio.lang;
  return `You are a senior instructional designer at Zenetic Pharma (a fictional company) working with a training content creator on a module about Derolad® (a fictional product). ${task}

${COMPLIANCE}

Write every text in ${LANG[lang]}${tu(lang)}. Plain text only: no markdown, no emojis. Refer to materials by title, never by id.

Materials for this project
${materials(mod.studio.spec.materials, lang, lib)}`;
}

function requirementsText(mod) {
  const { spec } = mod.studio;
  const a = spec.audience;
  return `Requirements from the creator's wizard
- Project: ${spec.title}
- Audience: ${audienceText(a, 'en')}${a.notes ? ` (${a.notes})` : ''}
- What reps should be able to do afterwards: ${spec.goal}
- Shape: ${spec.sections.length} section(s)
${spec.sections.map((s, i) => `  - Section ${i + 1}: ${s.lessons} lesson(s) of about ${s.minutes} minutes; ${s.quiz ? `a quiz of ${s.quiz} question(s)` : 'no quiz'}; ${s.practice === 'none' ? 'no practice session' : `a ${s.practiceMinutes}-minute practice session with an AI HCP (${s.practice === 'avatar' ? 'spoken, with a video avatar' : 'typed chat'})`}`).join('\n')}
- Instructional videos: ${videosText(mod)}`;
}

// The project's instructional videos for the model: id, topic, preferred section and what the creator said it teaches.
function videosText(mod) {
  const vids = mod.studio.videos || [];
  if (!vids.length) return 'none';
  return vids.map(v => `\n  - ${v.id}: "${v.topic}"${v.section ? ` (preferred section: ${v.section})` : ' (any section)'}${v.teach ? `; it teaches: ${v.teach}` : ''}${v.source === 'upload' || v.source === 'library' ? ' (an existing video)' : ''}`).join('');
}

// ------------------------------------ Outline ------------------------------------
const outlineSchema = videoIds => obj({
  reply: S, title: S, objective: S, notes: S,
  sections: arr(obj({
    id: S, title: S, goal: S, quiz_focus: S, practice_focus: S,
    lessons: arr(obj({
      id: S, title: S, pillar: oneOf(PILLARS), minutes: { type: 'integer' },
      points: arr(S), methods: arr(oneOf(METHODS)), video: oneOf(['none', ...videoIds]),
    })),
  })),
});

const OUTLINE_TASK = `Together you agree the outline of the module before any lesson is written: the key points to teach, how to teach each one and in what order.

How a module works: a sequence of sections; each section has lessons, then (if the requirements say so) a quiz, then (if the requirements say so) a timed practice session with an AI-simulated HCP that closes the section. Pillars: "product" (product knowledge), "messaging" (approved key messages), "objections" (objection handling).

Rules for the outline
- Exactly the number of sections in the requirements, in that order. Each section has the number of lessons and the minutes per lesson from the requirements, unless the creator asks you to change them in the conversation.
- Each lesson: a clear title, the pillar, the minutes, 3 to 6 "points" (concrete teaching points, each one sentence, grounded in the materials) and 2 to 4 teaching "methods": why (why it matters), example (field dialogue with debrief), dodont (say this / avoid this), visual (illustration), chart (approved data chart), callout (field tip or compliance note), check (check-yourself question). Explanations and key points are always included, so do not list them.
- Lessons build on each other and never repeat each other.
- Instructional videos are part of the curriculum, not extras. Place each one in exactly one lesson ("video" = its id; "none" for lessons without one; never two videos in one lesson): the lesson whose subject the video teaches, in its preferred section when one is given. If no lesson fits a video, shape a lesson around it. Design that lesson with the video in mind: the video counts toward its minutes, and its points set up what to watch for and build on the video (apply it, check it) instead of repeating what the video shows. Keep other lessons from duplicating a video's content.
- In "reply", when you place or move a video, say which lesson it went to, by the lesson's title (not by number).
- "quiz_focus": for sections with a quiz, one sentence on what it should check; otherwise an empty string. "practice_focus": for sections with a practice session, one or two sentences on the scenario (which kind of HCP, which objection, what the rep must show); otherwise an empty string. The last practice session is the hardest.
- Keep the ids you are given for existing sections and lessons; use "new" for a lesson you add.
- "objective": one sentence. "notes": 1 or 2 sentences for reviewers (what to double-check).
- "reply": 1 to 3 sentences to the creator about what you proposed or changed. If they ask for something the materials do not support, explain that briefly and leave it out.`;

export function cleanOutline(raw, mod) {
  const spec = mod.studio.spec;
  const videoIds = mod.studio.videos.map(v => v.id);
  const rawSections = (raw?.sections || []).slice(0, spec.sections.length);
  if (rawSections.length < spec.sections.length) throw new BuilderError('The outline came back incomplete. Please try again.', 502);
  const used = new Set(), usedVideos = new Set();
  let next = 1 + Math.max(0, ...rawSections.flatMap(s => (s.lessons || []).map(l => Number(/^l(\d+)$/.exec(l.id || '')?.[1]) || 0)));
  const sections = rawSections.map((s, i) => {
    const want = spec.sections[i];
    const lessons = (s.lessons || []).slice(0, 8).map(l => {
      let id = /^l\d+$/.test(l.id || '') && !used.has(l.id) ? l.id : `l${next++}`;
      used.add(id);
      const video = videoIds.includes(l.video) && !usedVideos.has(l.video) ? l.video : null;
      if (video) usedVideos.add(video);
      return {
        id, title: str(l.title, 200) || '…', pillar: PILLARS.includes(l.pillar) ? l.pillar : 'product',
        minutes: clamp(l.minutes, 3, 25, want.minutes),
        points: (l.points || []).map(p => str(p, 400)).filter(Boolean).slice(0, 8),
        methods: [...new Set((l.methods || []).filter(m => METHODS.includes(m)))],
        video,
      };
    }).filter(l => l.title);
    if (!lessons.length) throw new BuilderError('A section came back without lessons. Please try again.', 502);
    return {
      id: `s${i + 1}`, title: str(s.title, 200), goal: str(s.goal, 400), lessons,
      quiz: want.quiz, quizFocus: want.quiz ? str(s.quiz_focus ?? s.quizFocus, 400) : '',
      practice: want.practice !== 'none' ? { mode: want.practice, minutes: want.practiceMinutes, focus: str(s.practice_focus ?? s.practice?.focus, 600) } : null,
    };
  });
  // Videos the model did not place go to the first lesson of their preferred section (or the first lesson).
  for (const v of mod.studio.videos) {
    if (usedVideos.has(v.id)) continue;
    const sec = sections[(v.section || 1) - 1] || sections[0];
    const free = sec.lessons.find(l => !l.video) || sections.flatMap(x => x.lessons).find(l => !l.video);
    if (free) { free.video = v.id; usedVideos.add(v.id); }
  }
  return { title: str(raw.title, 200) || mod.studio.spec.title, objective: str(raw.objective, 600), notes: str(raw.notes, 800), sections };
}

// The outline as the model sees it (same field names as the schema).
const outlineForModel = o => ({
  title: o.title, objective: o.objective, notes: o.notes,
  sections: o.sections.map(s => ({ id: s.id, title: s.title, goal: s.goal, quiz_focus: s.quizFocus, practice_focus: s.practice?.focus || '',
    lessons: s.lessons.map(l => ({ id: l.id, title: l.title, pillar: l.pillar, minutes: l.minutes, points: l.points, methods: l.methods, video: l.video || 'none' })) })),
});

export async function outlineTurn(mod, lib, message, emit) {
  const st = mod.studio;
  const history = st.chat.slice(-10).map(m => `${m.who === 'user' ? 'Creator' : 'You'}: ${m.text}`).join('\n');
  const content = !st.outline
    ? `${requirementsText(mod)}\n\nPropose the outline.${message ? `\nThe creator adds: ${message}` : ''}`
    : `${requirementsText(mod)}\n\nThe current outline (JSON):\n${JSON.stringify(outlineForModel(st.outline))}\n\n${history ? `The conversation so far:\n${history}\n\n` : ''}The creator's new message: ${message}\n\nReturn the complete outline with the changes the creator asks for; keep everything else as it is.`;
  const out = await streamJson({
    schema: outlineSchema(st.videos.map(v => v.id)), maxTokens: 9000,
    system: designerSystem(mod, lib, OUTLINE_TASK), content,
    onText: text => emit({ kind: 'outline', text }),
  });
  return { outline: cleanOutline(out, mod), reply: str(out.reply, 1200) };
}

// ------------------------------------ Practice sessions ------------------------------------
const PRACTICE_SCHEMA = obj({
  sessions: arr(obj({
    section: S, persona: oneOf(PERSONAS.map(p => p.id)), objection: oneOf([...OBJECTIONS.map(o => o.id), 'none']),
    brief: S, opening: S, criteria: arr(S),
  })),
});

export async function draftPractice(mod, lib) {
  const st = mod.studio;
  const sections = st.outline.sections.filter(s => s.practice);
  if (!sections.length) throw new BuilderError('This project has no practice sessions.');
  const personas = PERSONAS.map(p => `- ${p.id}: ${p.name}, ${p.role.en} (${p.receptiveness}, ${p.openness}, ${p.difficulty} difficulty)`).join('\n');
  const objections = OBJECTIONS.map(o => `- ${o.id}: ${o.text.en}`).join('\n');
  const out = await streamJson({
    schema: PRACTICE_SCHEMA, maxTokens: 4000,
    system: designerSystem(mod, lib, `You set up the practice sessions that close sections: a timed visit where the rep talks with an AI-simulated HCP and is scored on product knowledge, approved messaging and objection handling, with three red lines (never minimize risk, never overstate or compare, never go off-label).

For each session: the persona and objection that best test the section (objection "none" for a general visit); "brief": 1 or 2 sentences to the rep (the situation and what to achieve); "opening": the HCP's first line, in character (one sentence); "criteria": 3 or 4 short, observable things a good rep does in this visit (what good looks like). Later sessions are harder.

Personas
${personas}

Objections
${objections}`),
    content: `${requirementsText(mod)}\n\nThe agreed outline:\n${st.outline.sections.map((s, i) => `Section ${s.id} (${i + 1}): ${s.title}\n  Lessons: ${s.lessons.map(l => l.title).join(' · ')}${s.practice ? `\n  Practice session (${s.practice.minutes} min, ${s.practice.mode}): ${s.practice.focus}` : ''}`).join('\n')}\n\nSet up the practice session for each of these sections: ${sections.map(s => s.id).join(', ')}.`,
  });
  return sections.map(s => {
    const x = (out.sessions || []).find(y => y.section === s.id) || {};
    return cleanPractice({ ...x, section: s.id }, s);
  });
}

// The session's objection: a standard one, the creator's own wording ("other"), or none.
function practiceObjection(p) {
  if (p.objection === 'other') {
    const text = str(p.objectionText, 300);
    return text ? { objection: 'other', objectionText: text } : { objection: null, objectionText: '' };
  }
  return { objection: OBJECTIONS.some(x => x.id === p.objection) ? p.objection : null, objectionText: '' };
}

export function cleanPractice(p, section) {
  return {
    section: section.id, mode: section.practice.mode, minutes: section.practice.minutes,
    persona: PERSONAS.some(x => x.id === p.persona) ? p.persona : 'reyes',
    ...practiceObjection(p),
    brief: str(p.brief, 600), opening: str(p.opening, 300),
    criteria: (Array.isArray(p.criteria) ? p.criteria : []).map(c => str(c, 200)).filter(Boolean).slice(0, 6),
  };
}

// ------------------------------------ Video scripts ------------------------------------
const VIDEO_SCHEMA = obj({
  title: S, summary: S, seconds: { type: 'integer' },
  scenes: arr(obj({ setting: S, onscreen: S, lines: arr(obj({ who: oneOf(['narrator', 'rep', 'hcp']), text: S })) })),
  notes: S,
});

export async function writeVideoScript(mod, video, lib, emit) {
  const st = mod.studio;
  const lesson = st.outline?.sections.flatMap(s => s.lessons).find(l => l.id === video.lesson);
  const out = await streamJson({
    schema: VIDEO_SCHEMA, maxTokens: 5000,
    system: designerSystem(mod, lib, `You write the script of a short instructional video (60 to 150 seconds) for sales reps, to be produced later with an AI video avatar.
- style "presenter": one presenter speaks to the camera (lines by "narrator").
- style "scene": a realistic rep and HCP conversation (lines by "rep" and "hcp"), with a short "narrator" intro and a closing takeaway.
Each scene: "setting" (what the viewer sees), "onscreen" (a short caption or key figure shown on screen, or an empty string) and the spoken lines. Spoken lines are short and natural. Facts only from the materials. "summary": one sentence on what the rep learns. "seconds": the estimated length. "notes": one sentence for reviewers.`),
    content: `${requirementsText(mod)}

The video
- Topic: ${video.topic}
- Placed in lesson: ${lesson ? `"${lesson.title}" (key points: ${lesson.points.join(' | ')})` : 'not placed yet'}
- What it should teach: ${video.teach || '(not specified; derive it from the topic and the lesson)'}
- Key aspects to include: ${video.aspects || '(none specified)'}
- Style: ${video.style}
${video.conversation ? `- Sample conversation from the creator (use it as the basis, keep it compliant):\n${video.conversation}` : ''}
${video.revise ? `\nThe current script (JSON):\n${JSON.stringify(video.revise.current)}\n\nReviewers asked for these changes. Revise the current script for them; keep everything else as it is. In "notes", say in one or two sentences what you changed:\n${video.revise.comments.map(c => `- ${c}`).join('\n')}\n\nReturn the complete revised script.` : 'Write the script.'}`,
    onText: text => emit({ kind: 'script', key: video.id, text }),
  });
  return {
    title: str(out.title, 200), summary: str(out.summary, 400), seconds: clamp(out.seconds, 20, 300, 90), notes: str(out.notes, 600),
    scenes: (out.scenes || []).slice(0, 12).map(sc => ({
      setting: str(sc.setting, 400), onscreen: str(sc.onscreen, 200),
      lines: (sc.lines || []).slice(0, 16).map(l => ({ who: ['narrator', 'rep', 'hcp'].includes(l.who) ? l.who : 'narrator', text: str(l.text, 600) })).filter(l => l.text),
    })).filter(sc => sc.lines.length),
  };
}

// ------------------------------------ Uploaded materials ------------------------------------
export const MAX_UPLOAD = 3 * 1024 * 1024;
const MATERIAL_SCHEMA = obj({ title: S, summary: S, facts: arr(S), personal_data: { type: 'boolean' }, personal_data_reason: S });

async function fileText(name, buf) {
  const ext = (/\.([a-z0-9]+)$/i.exec(name || '')?.[1] || '').toLowerCase();
  if (ext === 'pdf') {
    const { text } = await extractText(await getDocumentProxy(new Uint8Array(buf)), { mergePages: true });
    return text;
  }
  if (ext === 'docx') return (await mammoth.extractRawText({ buffer: buf })).value;
  if (['txt', 'md'].includes(ext)) return buf.toString('utf8');
  throw new BuilderError('Upload a PDF, Word (.docx) or text file.');
}

export async function readMaterial({ name, data, lang }) {
  const buf = Buffer.from(String(data || ''), 'base64');
  if (!buf.length) throw new BuilderError('The file is empty.');
  if (buf.length > MAX_UPLOAD) throw new BuilderError('Keep uploads under 3 MB.');
  let text;
  try { text = (await fileText(name, buf)).replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim(); }
  catch (e) { if (e instanceof BuilderError) throw e; throw new BuilderError('The file could not be read. Try another format.'); }
  if (text.length < 80) throw new BuilderError('No text could be read from this file (it may be a scanned image). Upload a file with selectable text.');
  const msg = await (await foundryClient()).messages.create({
    model: MODELS.fast, max_tokens: 3000,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: MATERIAL_SCHEMA } },
    system: `You prepare uploaded pharmaceutical training material for Zenetic Pharma (fictional) so an AI course writer can use it. Read the document and return: "title" (its title, or a short descriptive one), "summary" (one sentence on what it covers), "facts" (5 to 15 key facts, claims and numbers a training writer may use, each one sentence, numbers copied exactly, nothing that is not in the document). "personal_data": true if the document contains information about identifiable real people such as named healthcare professionals or patients (names with contact details, patient records, case details); otherwise false, with "personal_data_reason" explaining briefly when true (otherwise an empty string). Write title, summary and facts in ${LANG[lang]}.`,
    messages: [{ role: 'user', content: `File name: ${name}\n\n${text.slice(0, 40000)}` }],
  });
  if (msg.stop_reason === 'refusal') throw new BuilderError('This file could not be processed.', 422);
  const out = JSON.parse(msg.content.filter(b => b.type === 'text').map(b => b.text).join(''));
  if (out.personal_data) {
    throw new BuilderError(`This file seems to contain personal data (${str(out.personal_data_reason, 200) || 'identifiable people'}). Remove or anonymize it before uploading.`, 422);
  }
  return {
    title: str(out.title, 200) || name, summary: str(out.summary, 400),
    facts: (out.facts || []).map(f => str(f, 400)).filter(Boolean).slice(0, 20),
    text: text.slice(0, 40000),
  };
}
