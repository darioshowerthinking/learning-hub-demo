// AI pre-check for approvers (Claude Sonnet 5.5 on Foundry).
//
// Each team gets its own lens: MLR checks claims against the approved material, Training checks accuracy
// and learning design, Sales checks field realism, Marketing checks key messages and brand. The module is
// split into parts (one per lesson + one for the quizzes and final challenges) that are checked in parallel;
// every finding quotes the exact text it is about, so the review screen can highlight it.
// Streams NDJSON events: {kind:'part', key, text} while a part is written, {kind:'partDone', key, findings}.
// The AI only flags. The human approver decides and writes the comments that go to the creator.

import { PRODUCT, PERSONAS, objectionOf } from './seed.js';
import { streamJson, pool, materials, pick, LANG, VISUALS, CHARTS, BuilderError } from './builder.js';

const SOURCE_IDS = PRODUCT.sources.map(s => s.id);
const S = { type: 'string' };
const obj = props => ({ type: 'object', additionalProperties: false, required: Object.keys(props), properties: props });
const oneOf = values => ({ type: 'string', enum: values });

export const LENSES = {
  mlr: {
    role: 'a Medical, Legal and Regulatory (MLR) reviewer',
    categories: ['unsupported_claim', 'number', 'comparison', 'off_label', 'fair_balance', 'risk', 'other'],
    focus: `- Every claim, number, timeline and promise must be supported by the approved material. Guarantees, approval times, success rates or speed promises that the material does not state are unsupported claims (high).
- Numbers must match the approved material exactly, with their context (timepoint, comparator, and study type such as "open-label extension").
- No comparisons with other medicines and no superlatives ("best", "fastest", "safest") that the material does not support.
- On-label only: adults with moderate-to-severe HS and the approved dosing.
- Fair balance: where reps are taught to present efficacy to an HCP, safety must be part of the conversation. Risk must never be minimized. Content about access or support that makes no efficacy claim does not need safety content.
- No invented studies and no patient stories presented as real.
- A material marked "MLR approval pending" is not approved yet: flag (medium) any claim that relies only on it.`,
  },
  training: {
    role: 'a Training reviewer (instructional quality)',
    categories: ['accuracy', 'assessment', 'clarity', 'structure', 'other'],
    focus: `- Accuracy for learners: every "check yourself" and quiz question has exactly one clearly correct answer that matches the approved material, and the marked answer is right.
- Clarity: explanations work for a new rep; no unexplained jargon; no contradictions between parts.
- Learning design: the lessons teach what the quiz and the final challenge test; the challenge brief is fair for the section.`,
  },
  sales: {
    role: 'a Sales reviewer (field realism)',
    categories: ['realism', 'practicality', 'clarity', 'other'],
    focus: `- Field realism: dialogues sound like real HCPs and office staff in a short visit, and a rep could say these lines naturally.
- Practicality: clear actions a rep can use in a 3 to 5 minute visit; nothing that would waste the HCP's time.
- The final challenge is realistic for its persona and objection.
- Compliance is MLR's job: mention a compliance problem only if it is blatant.`,
  },
  marketing: {
    role: 'a Marketing reviewer (key messages and brand)',
    categories: ['key_message', 'brand', 'tone', 'other'],
    focus: `- Alignment with the Approved Key Messages: they are used accurately, in their approved meaning; the burden of HS is acknowledged before the product.
- Brand: correct names (Derolad®, Zenetic Access Connect) and a consistent tone: respectful, empathetic, never pushy.`,
  },
};

const findingSchema = (lens, targets, sourceIds) => obj({
  findings: { type: 'array', items: obj({
    ...(targets ? { target: oneOf(targets) } : {}),
    severity: oneOf(['high', 'medium', 'low']),
    category: oneOf(lens.categories),
    quote: S, issue: S, suggestion: S,
    source: oneOf([...sourceIds, 'none']),
  }) },
});

function systemPrompt(team, lang, sourceIds, lib) {
  const lens = LENSES[team];
  return `You are ${lens.role} at Zenetic Pharma (a fictional company), pre-checking sales-training content about Derolad® (a fictional product) for the human ${team.toUpperCase()} approver. You flag issues precisely; the human approver decides.

Approved material (the only acceptable basis for any product claim)
${materials(sourceIds, lang, lib)}

What to check
${lens.focus}

How to report
- Flag only what a careful reviewer on this team would actually ask the creator to change. Well-written content often has no findings at all; never pad the list. At most 4 findings, most important first.
- "quote": the exact problematic excerpt, copied character for character from ONE paragraph, line or option of the content (5 to 30 words). Never include labels such as "[Text]", "Rep:" or "AVOID:".
- "issue": one or two sentences on what is wrong and why it matters, naming the approved source by its title (never its id) when relevant.
- "suggestion": compliant replacement text the creator could paste in instead of the quote (or say to remove it).
- "source": the id of the approved source the issue is checked against, or "none".
- "severity": high = must change before approval (for example a claim the approved material does not support); medium = should change; low = optional improvement.
- Faithful paraphrases and translations of the approved material are fine: do not flag synonyms, abbreviations or wording that keeps the approved meaning.
- Examples of what NOT to say (AVOID lines, wrong answer options) are wrong on purpose: flag them only if the content does not make clear that they are wrong.
- In questions, exactly one option is "(marked correct)": that is the answer key; the others are the wrong options.
- Write "issue" and "suggestion" in ${LANG[lang]}${lang === 'es' ? ' (address the creator as "tú")' : ''}. The quote stays exactly as written in the content.`;
}

// ------------------------------- The module as text for the model -------------------------------
function lessonText(l, lang) {
  const p = v => pick(v, lang);
  const out = [`LESSON ${l.id}: ${p(l.title)}`];
  if (l.summary) out.push(`Summary: ${p(l.summary)}`);
  for (const b of l.blocks?.length ? l.blocks : [{ type: 'text', body: l.body }]) {
    switch (b.type) {
      case 'text': out.push(`[Text${p(b.heading) ? `: ${p(b.heading)}` : ''}]\n${p(b.body)}`); break;
      case 'why': out.push(`[Why it matters]\n${p(b.body)}`); break;
      case 'callout': out.push(`[${b.tone === 'compliance' ? 'Compliance note' : 'Field tip'}]\n${p(b.body)}`); break;
      case 'keypoints': out.push(`[Key points: ${p(b.heading)}]\n${(b.items || []).map(i => p(i)).join('\n')}`); break;
      case 'example': out.push(`[Field example: ${p(b.title)}]\nContext: ${p(b.context)}\n${(b.lines || []).map(ln => `${ln.who === 'hcp' ? 'HCP' : 'Rep'}: ${p(ln.text)}`).join('\n')}\nDebrief: ${p(b.debrief)}`); break;
      case 'dodont': out.push(`[Say this / Avoid this]\n${(b.items || []).map(i => `SAY: ${p(i.say)}\nAVOID (shown as a mistake): ${p(i.avoid)}\nWHY: ${p(i.why)}`).join('\n\n')}`); break;
      case 'visual': out.push(`[Illustration (approved figure): ${VISUALS[b.visual] || b.visual}]\nCaption: ${p(b.caption)}`); break;
      case 'chart': out.push(`[Chart (approved data): ${CHARTS[b.chart] || b.chart}]\nCaption: ${p(b.caption)}`); break;
      case 'video': out.push(`[Instructional video${b.pending ? ' (MLR approval pending)' : ''}: ${p(b.title)}]${b.caption ? `\nDescription: ${p(b.caption)}` : ''}${b.transcript ? `\nTranscript / on-screen text: ${p(b.transcript)}` : b.rendered && !(b.scenes || []).length ? '\n(No transcript was provided: the AI cannot watch the video; the reviewer must watch it.)' : ''}\n${(b.scenes || []).map(sc => `${sc.onscreen ? `On screen: ${p(sc.onscreen)}\n` : ''}${(sc.lines || []).map(ln => `${ln.who === 'hcp' ? 'HCP' : ln.who === 'rep' ? 'Rep' : 'Narrator'}: ${p(ln.text)}`).join('\n')}`).join('\n')}`); break;
      case 'check': out.push(`[Check yourself]\n${p(b.q)}\n${(b.options || []).map((o, k) => `Option ${k + 1}${k === b.answer ? ' (marked correct)' : ''}: ${p(o)}`).join('\n')}\nExplanation: ${p(b.explanation)}`); break;
      default: break;
    }
  }
  return out.join('\n\n');
}

function assessmentText(mod, lang) {
  const p = v => pick(v, lang);
  const out = [`MODULE: ${p(mod.title)}\nAudience: ${p(mod.audience)}\nObjective: ${p(mod.objective)}`];
  mod.sections.forEach((s, i) => {
    out.push(`SECTION ${i + 1}: ${p(s.title)}\nLessons: ${s.lessons.map(l => p(l.title)).join(' · ')}`);
    if (s.quiz.length) {
      out.push(`QUIZ (target "quiz:${s.id}")\n${s.quiz.map((q, k) => `Question ${k + 1}: ${p(q.q)}\n${q.options.map((o, j) => `Option ${j + 1}${j === q.answer ? ' (marked correct)' : ''}: ${p(o)}`).join('\n')}`).join('\n\n')}`);
    }
    const b = s.boss;
    if (!b) return;
    const persona = PERSONAS.find(x => x.id === b.persona);
    const objection = objectionOf(b);
    out.push(`FINAL CHALLENGE (target "boss:${s.id}")\nAI HCP: ${persona ? `${persona.name}, ${pick(persona.role, lang)}` : b.persona}\nObjection: ${objection ? pick(objection.text, lang) : 'none (general visit)'}\nVisit length: ${b.minutes} minutes${b.mode === 'avatar' ? ' (spoken, with a video avatar)' : ''}\nBrief to the rep: ${p(b.brief)}${b.opening ? `\nHCP opening line: ${p(b.opening)}` : ''}${b.criteria?.length ? `\nWhat good looks like: ${b.criteria.map(c => p(c)).join(' | ')}` : ''}`);
  });
  return out.join('\n\n');
}

// Quotes are checked against the text so the screen only offers "show in lesson" when it can find them.
const norm = s => String(s || '').replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();

function cleanFindings(raw, key, text, lang, targets, sourceIds) {
  const hay = norm(text);
  return (raw?.findings || []).slice(0, 5).map((f, i) => {
    const quote = String(f.quote || '').trim().replace(/^["“]|["”]$/g, '');
    return {
      id: `${key}-${i + 1}`,
      part: targets ? (targets.includes(f.target) ? f.target : null) : key,
      severity: ['high', 'medium', 'low'].includes(f.severity) ? f.severity : 'medium',
      category: f.category || 'other',
      quote, found: !!quote && hay.includes(norm(quote)),
      issue: { [lang]: String(f.issue || '').trim() },
      suggestion: { [lang]: String(f.suggestion || '').trim() },
      source: sourceIds.includes(f.source) ? f.source : null,
    };
  }).filter(f => f.issue[lang]);
}

// lib = the materials library (built-in sources + uploads). Reviewers check against everything approved,
// plus the uploads this module uses.
export async function precheck(mod, team, lang, emit = () => {}, lib) {
  if (!LENSES[team]) throw new BuilderError('Unknown review team.');
  const lens = LENSES[team];
  const sourceIds = [...new Set([...SOURCE_IDS, ...(mod.sources || []).filter(id => lib?.some(m => m.id === id))])];
  const system = systemPrompt(team, lang, sourceIds, lib);
  const targets = mod.sections.flatMap(s => [...(s.quiz.length ? [`quiz:${s.id}`] : []), ...(s.boss ? [`boss:${s.id}`] : [])]);
  const parts = [
    ...mod.sections.flatMap(s => s.lessons).map(l => ({ key: l.id, text: lessonText(l, lang), schema: findingSchema(lens, null, sourceIds) })),
    ...(targets.length ? [{ key: 'assessment', text: assessmentText(mod, lang), schema: findingSchema(lens, targets, sourceIds), targets }] : []),
  ];
  const results = await pool(parts.map(part => async () => {
    const out = await streamJson({
      schema: part.schema, system, maxTokens: 3000,
      content: `Pre-check this part of the module "${pick(mod.title, lang)}".${part.targets ? ' For each finding, "target" says which quiz or final challenge it is about.' : ''}\n\n${part.text}`,
      onText: text => emit({ kind: 'part', key: part.key, text }),
    });
    const findings = cleanFindings(out, part.key, part.text, lang, part.targets, sourceIds);
    emit({ kind: 'partDone', key: part.key, findings });
    return findings;
  }), 8);
  const rank = { high: 0, medium: 1, low: 2 };
  return { lang, at: Date.now(), parts: parts.map(p => p.key), findings: results.flat().sort((a, b) => rank[a.severity] - rank[b.severity]) };
}
