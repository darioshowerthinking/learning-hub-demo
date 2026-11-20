// The section's final challenge: a role-play with a simulated HCP, then feedback by pillar.
// Claude Sonnet 5.5 on Foundry. Grounded ONLY on the module's approved sources (seed.js PRODUCT.sources).
// The scenario (HCP, objection, brief, clock) is set by the content creator in the module, never by the learner.

import { foundryClient, MODELS } from './foundry.js';
import { PRODUCT, PERSONAS, objectionOf, PASS } from './seed.js';

const LANG = { en: 'English', es: 'Spanish (Spain)' };
const MAX_TURNS = 30;          // rep + HCP messages per call
const MAX_CHARS = 1200;        // per rep message
export const END_MARK = '[END]';

export class RoleplayError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

const pick = (field, lang) => field?.[lang] ?? field?.en ?? '';

function approvedMaterials(mod, lang) {
  // Built-in approved sources the module uses (all of them if the module only uses uploaded materials).
  const used = PRODUCT.sources.filter(s => mod.sources.includes(s.id));
  return (used.length ? used : PRODUCT.sources)
    .map(s => `## ${pick(s.title, lang)}\n${pick(s.body, lang)}`)
    .join('\n\n');
}

// Where a learner stands in one section. Used to lock the final challenge.
export function sectionState(mod, progress, sectionId) {
  const section = mod.sections.find(s => s.id === sectionId);
  if (!section) return null;
  const p = progress || {};
  const lessonsDone = section.lessons.every(l => p.lessonsDone?.includes(l.id));
  const quizPassed = !section.quiz.length || !!p.quizzes?.[sectionId]?.passed;
  const attempts = (p.attempts || []).filter(a => a.section === sectionId);
  return { section, lessonsDone, quizPassed, unlocked: lessonsDone && quizPassed, passed: attempts.some(a => a.passed), attempts };
}

// The three red lines. Crossing any of them fails the challenge whatever the scores.
export const RED_LINES = {
  risk: 'Never minimize risk: no "completely safe", "no side effects", or benefits presented without safety.',
  overstate: 'Never overstate or compare: no guarantees, no figures beyond the approved ones, no comparison with a named or implied competitor.',
  offlabel: 'Never go off-label: only adults with moderate-to-severe HS, only the approved dosing.',
};

const TRAITS = {
  receptive: 'You are generally receptive: polite and willing to listen if the rep is relevant.',
  skeptical: 'You are skeptical: you push back, ask for evidence and are short on time.',
  open: 'You are open to new treatment options when the evidence is solid.',
  cautious: 'You are cautious about new treatments and worry about switching patients who are doing "okay".',
  basic: 'Keep the conversation simple and give the rep room to make their points.',
  intermediate: 'Raise one follow-up concern after the rep answers your main objection.',
  advanced: 'Be demanding: raise follow-up concerns and ask precise, practical questions.',
};

export function validate({ mod, progress, sectionId, lang, turns, elapsedSec }) {
  if (!mod || mod.status !== 'published') throw new RoleplayError('Module not found.', 404);
  const state = sectionState(mod, progress, sectionId);
  if (!state) throw new RoleplayError('Section not found.', 404);
  if (!state.unlocked) throw new RoleplayError('Finish the lessons and pass the quiz to unlock the final challenge.', 403);
  const boss = state.section.boss;
  if (!boss) throw new RoleplayError('This section has no practice session.', 404);
  const persona = PERSONAS.find(p => p.id === boss.persona);
  const objection = objectionOf(boss);
  if (!LANG[lang]) throw new RoleplayError('Unsupported language.');
  if (!Array.isArray(turns) || turns.length > MAX_TURNS) throw new RoleplayError('This visit is too long. End it to get your feedback.');
  for (const t of turns) {
    if (!['rep', 'hcp'].includes(t?.who) || typeof t.text !== 'string') throw new RoleplayError('Malformed conversation.');
    if (t.who === 'rep' && t.text.length > MAX_CHARS) throw new RoleplayError(`Keep each message under ${MAX_CHARS} characters.`);
  }
  const elapsed = Math.max(0, Math.min(Number(elapsedSec) || 0, 3600));
  return { section: state.section, boss, persona, objection, elapsed };
}

// A spoken visit (video avatar): the rep's lines come from speech recognition and the HCP's lines are spoken aloud.
const SPOKEN_HCP = `
- This visit is spoken: you are shown as a video avatar and your replies are read aloud. The rep's words come from speech recognition, so expect sound-alike spellings (for example "Derolat" or "Daralid" for Derolad) and missing punctuation: understand what they meant and never mention it: do not ask whether they meant Derolad or correct them, just say Derolad yourself when you need the name. Write replies that sound natural spoken: no symbols, abbreviations or parentheses.`;
const SPOKEN_COACH = `
- This visit was spoken: the REP lines come from speech recognition. Do not penalise misheard words, spelling of product names or missing punctuation; judge what the rep meant. Quote the rep's words as they appear in the transcript.`;

function hcpSystem({ mod, boss, persona, objection, voice }, lang) {
  const concern = objection
    ? `Your main concern today, which you raise in your first line: ${pick(objection.text, 'en')}`
    : `You open with: "${pick(boss.opening, 'en')}" (in your own words).`;
  return `You are role-playing ${persona.name}, a ${pick(persona.role, 'en').toLowerCase()} at a busy US practice, in a sales-training simulation built by Zenetic Pharma. A Zenetic sales representative (the learner) is visiting you to talk about Derolad, a treatment for moderate-to-severe hidradenitis suppurativa (HS). Zenetic Pharma and Derolad are fictional, and so are you.${persona.gender ? ` You are a ${persona.gender}: in Spanish, use ${persona.gender === 'woman' ? 'feminine' : 'masculine'} forms when you speak about yourself.` : ''}

The visit
- Scenario (what the rep was told): ${pick(boss.brief, 'en')}
- You have about ${boss.minutes} minutes for this visit. The rep's messages may carry a clock note in square brackets; it is for you only, never mention it.
- ${concern}

Your character
- ${TRAITS[persona.receptiveness]}
- ${TRAITS[persona.openness]}
- ${TRAITS[persona.difficulty]}
- ${persona.id === 'kim' ? 'You manage the office and do not prescribe: you care about staff time, prior authorization, coverage and how patients get started.' : 'You treat many HS patients and know how painful and isolating the disease is.'}

How you speak
- Always reply in ${LANG[lang]}.
- Reply like a real person in a short office conversation: 1 to 3 sentences, no lists, no markdown, no stage directions.${voice ? SPOKEN_HCP : ''}
- React realistically. If the rep acknowledges your concern, asks good questions and uses the approved information accurately, become gradually more open. If they ignore your concern, push a hard sell, exaggerate, promise outcomes, make claims that are not in the material below, compare Derolad with another product or talk about patients outside the indication, challenge them the way a careful clinician would.
- If the rep talks about benefits and never mentions safety, at some point ask about side effects or what you need to check before starting.
- What you know about Derolad is only what Zenetic has published, below. You may doubt it, but never invent other Derolad data.
- Never name real medicines or real companies.
- Stay in character. Do not coach the rep or comment on their technique. If a message is clearly not part of a sales call, say briefly, in character, that you only have a few minutes, and steer back.

Ending the visit
- End the visit yourself when: your time is up; the conversation has reached a natural close (the rep has made their case and you have agreed or declined a next step); or the rep keeps ignoring your concerns. Close the way a busy clinician does (for example asking them to leave the information, or saying you have patients waiting).
- When your reply ends the visit, finish that reply with the exact marker ${END_MARK}. Never use the marker otherwise.

Zenetic's published material on Derolad
${approvedMaterials(mod, lang)}`;
}

// Claude sees the rep as "user" and the HCP as "assistant". The visit opens with a scene cue,
// and the last rep message carries a clock note so the HCP can wrap up on time.
function toMessages({ boss, elapsed }, turns, lang) {
  const cue = lang === 'es'
    ? '(El delegado de Zenetic acaba de presentarse en tu consulta. Abre la conversación.)'
    : '(The Zenetic rep has just introduced themselves in your office. Open the conversation.)';
  const messages = [{ role: 'user', content: cue }];
  turns.forEach((t, i) => {
    let content = t.text;
    if (t.who === 'rep' && i === turns.length - 1) {
      const left = boss.minutes * 60 - elapsed;
      const note = left <= 0 ? 'Time is up: close the visit now.'
        : left <= 60 ? 'About 1 minute left: start wrapping up.'
        : `About ${Math.round(left / 60)} minutes left.`;
      content += `\n\n[Clock: ${note}]`;
    }
    messages.push({ role: t.who === 'rep' ? 'user' : 'assistant', content });
  });
  return messages;
}

// Streams the HCP's next line. The END marker is held back so it never reaches the screen.
export async function hcpTurn(ctx, onText) {
  const { turns, lang } = ctx;
  if (turns.length && turns.at(-1).who !== 'rep') throw new RoleplayError('It is the rep\'s turn to speak.');
  const stream = (await foundryClient()).messages.stream({
    model: MODELS.main,
    max_tokens: 2000,
    output_config: { effort: 'low' },           // conversational: fast and short
    cache_control: { type: 'ephemeral' },        // the persona + material prefix repeats every turn
    system: hcpSystem(ctx, lang),
    messages: toMessages(ctx, turns, lang),
  });
  let pending = '';
  for await (const event of stream) {
    if (event.type !== 'content_block_delta' || event.delta.type !== 'text_delta') continue;
    pending += event.delta.text;
    // Keep back anything that could be the start of the marker.
    const cut = pending.lastIndexOf('[');
    const safe = cut >= 0 && END_MARK.startsWith(pending.slice(cut).trimEnd()) ? pending.slice(0, cut) : pending;
    if (safe) { onText(safe); pending = pending.slice(safe.length); }
  }
  const final = await stream.finalMessage();
  const ended = pending.includes(END_MARK);
  const rest = pending.replace(END_MARK, '').trimEnd();
  if (rest) onText(rest);
  return { stop: final.stop_reason, ended };
}

const FEEDBACK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['scores', 'summary', 'strengths', 'improvements', 'red_lines', 'fair_balance', 'next_step'],
  properties: {
    scores: {
      type: 'object', additionalProperties: false,
      required: ['product', 'messaging', 'objections'],
      properties: { product: { type: 'integer' }, messaging: { type: 'integer' }, objections: { type: 'integer' } },
    },
    summary: { type: 'string' },
    strengths: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['pillar', 'text', 'quote'],
        properties: { pillar: { type: 'string', enum: ['product', 'messaging', 'objections'] }, text: { type: 'string' }, quote: { type: 'string' } } },
    },
    improvements: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['pillar', 'text', 'quote', 'try_saying'],
        properties: { pillar: { type: 'string', enum: ['product', 'messaging', 'objections'] }, text: { type: 'string' }, quote: { type: 'string' }, try_saying: { type: 'string' } } },
    },
    red_lines: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['line', 'quote', 'why', 'correct_version'],
        properties: { line: { type: 'string', enum: ['risk', 'overstate', 'offlabel'] }, quote: { type: 'string' }, why: { type: 'string' }, correct_version: { type: 'string' } } },
    },
    fair_balance: {
      type: 'object', additionalProperties: false, required: ['ok', 'note'],
      properties: { ok: { type: 'boolean' }, note: { type: 'string' } },
    },
    next_step: { type: 'string' },
  },
};

export async function feedback(ctx) {
  const { mod, persona, objection, boss, lang, turns } = ctx;
  if (!turns.some(t => t.who === 'rep')) throw new RoleplayError('Say something to the HCP before asking for feedback.');
  const transcript = turns.map(t => `${t.who === 'rep' ? 'REP' : 'HCP'}: ${t.text}`).join('\n');
  const msg = await (await foundryClient()).messages.create({
    model: MODELS.main,
    max_tokens: 8000,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: FEEDBACK_SCHEMA } },
    system: `You are a pharmaceutical sales-training coach at Zenetic Pharma (a fictional company). You assess the final challenge of a training section: a practice visit between a sales rep and a simulated HCP. Judge the rep ONLY against the approved material below; the approved material is the standard for what may be said.

Score each pillar from 0 to 100:
- product: accurate use of approved product facts (mechanism, dosing, efficacy, safety, support program).
- messaging: acknowledges the burden of HS first, uses the approved key messages, stays relevant to this HCP and the scenario.
- objections: acknowledges the concern, asks a question, answers with approved information, checks back and earns a next step.
Be fair and specific, like an experienced field trainer. A short visit that never reached a pillar scores low on it.

The three red lines (any breach is listed in "red_lines", with the rep's exact words):
- risk: ${RED_LINES.risk}
- overstate: ${RED_LINES.overstate}
- offlabel: ${RED_LINES.offlabel}
For each breach, "why" explains it in one or two sentences and "correct_version" is a compliant line built ONLY from the approved material. Empty array if none.

"fair_balance": ok is true if, whenever the rep presented benefits, safety information was also part of the conversation (raised by the rep, or answered accurately when the HCP asked). The note explains briefly.

Rules
- Write everything in ${LANG[lang]}.
- "quote" is a short excerpt of the REP's own words, copied exactly. Never quote the HCP. If the point is about something the rep did not say, use an empty string.
- 1 to 3 strengths and 1 to 3 improvements. Each improvement's "try_saying" is a better line the rep could use, built ONLY from the approved material.
- "next_step" is one concrete action for the rep's next attempt.${ctx.voice ? SPOKEN_COACH : ''}

Approved material
${approvedMaterials(mod, lang)}`,
    messages: [{
      role: 'user',
      content: `HCP: ${persona.name} (${pick(persona.role, 'en')}; ${persona.receptiveness}, ${persona.openness}, ${persona.difficulty}).
Scenario given to the rep: ${pick(boss.brief, 'en')}${boss.criteria?.length ? `\nWhat good looks like in this visit (set by the content creator): ${boss.criteria.map(c => pick(c, 'en')).join(' | ')}` : ''}
${objection ? `Objection in this challenge: ${pick(objection.text, 'en')}` : ''}

Transcript:
${transcript}`,
    }],
  });
  if (msg.stop_reason === 'refusal') throw new RoleplayError('The coach could not assess this visit. Please try again.', 422);
  const out = JSON.parse(msg.content.filter(b => b.type === 'text').map(b => b.text).join(''));
  for (const k of ['product', 'messaging', 'objections']) out.scores[k] = Math.max(0, Math.min(100, Math.round(out.scores[k])));
  out.passed = Object.values(out.scores).every(v => v >= PASS.pillar) && out.red_lines.length === 0;
  out.pass_mark = PASS.pillar;
  return out;
}
