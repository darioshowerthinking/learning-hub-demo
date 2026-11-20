// Quiz answer explanations: Claude Haiku 5.5, grounded on the module's approved material only.
import { foundryClient, MODELS } from './foundry.js';
import { PRODUCT } from './seed.js';

const pick = (field, lang) => field?.[lang] ?? field?.en ?? '';

export async function explainAnswer(mod, q, chosen, lang) {
  const material = PRODUCT.sources.filter(s => mod.sources.includes(s.id))
    .map(s => `## ${pick(s.title, lang)}\n${pick(s.body, lang)}`).join('\n\n');
  const correct = chosen === q.answer;
  const msg = await (await foundryClient()).messages.create({
    model: MODELS.fast,
    max_tokens: 1500,
    output_config: { effort: 'low' },
    system: `You are a concise sales-training tutor at Zenetic Pharma (fictional company, fictional product Derolad). Explain quiz answers in ${lang === 'es' ? 'Spanish (Spain)' : 'English'}, in 2 or 3 short sentences, using ONLY the approved material below. Speak to the rep as "you". No markdown. Never give medical advice.

Approved material
${material}`,
    messages: [{
      role: 'user',
      content: `Question: ${pick(q.q, lang)}
Options: ${q.options.map((o, i) => `${i + 1}. ${pick(o, lang)}`).join(' | ')}
The rep chose: ${pick(q.options[chosen], lang)} (${correct ? 'correct' : 'incorrect'}).
Correct answer: ${pick(q.options[q.answer], lang)}.
${correct ? 'Confirm briefly why it is right and how to use it in a visit.' : 'Explain why the correct answer is right and what was wrong with theirs.'}`,
    }],
  });
  return msg.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
}
