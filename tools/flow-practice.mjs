// Browser test of the learner path: home -> module -> section 2 quiz -> final challenge -> feedback.
// The rep's reply deliberately crosses a red line ("completely safe") so the feedback shows it.
// Usage: [HUB_URL=...] [DEMO_ACCESS_CODE=...] node tools/flow-practice.mjs <outDir> [en|es]
import { withPage } from './cdp.mjs';
const [out = '.', lang = 'en'] = process.argv.slice(2);
const REPLY = {
  en: "I understand, doctor, HS is painful and switching is a big decision. How many of your patients still get painful flares? For those, Derolad reduced painful flares by 47% versus placebo, and it's completely safe, so there's really no downside to trying it.",
  es: "Le entiendo, doctor; la HS es dolorosa y cambiar es una decisión importante. ¿Cuántos de sus pacientes siguen con brotes dolorosos? Para ellos, Derolad redujo los brotes dolorosos un 47% frente a placebo, y es totalmente seguro, así que no hay ningún inconveniente en probarlo.",
};
const URL = process.env.HUB_URL || 'http://localhost:8080/';
const CODE = JSON.stringify(process.env.DEMO_ACCESS_CODE || '');
await withPage(URL, async ({ evalJs, shot, logs }) => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const until = async (expr, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await evalJs(expr)) return true; await wait(400); } throw new Error('timeout: ' + expr); };
  const snap = async name => { const h = await evalJs('document.documentElement.scrollHeight'); await shot(`${out}/${name}-${lang}.png`, { x: 0, y: 0, width: 1440, height: Math.min(h, 3000) }); console.log('shot', name); };
  await evalJs(`fetch('/api/access',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:${CODE}})}).then(()=>fetch('/api/admin/reset',{method:'POST'})).then(()=>{localStorage.setItem('zn_lang','${lang}'); return fetch('/api/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId:'alex'})})}).then(()=>{location.hash='#/'; location.reload()})`);
  await until("!!document.querySelector('.lh-nextstep')"); await snap('f1-home');
  await evalJs("location.hash='#/module/mod-essentials'"); await until("document.querySelectorAll('.lh-section-card').length===2"); await snap('f2-module');
  await evalJs("location.hash='#/quiz/mod-essentials/s2'");
  for (const pick of [1, 0, 2]) { // last answer wrong on purpose
    await until("!!document.querySelector('[data-q]')");
    await evalJs(`(()=>{const r=document.querySelectorAll('[data-q] input')[${pick}]; r.checked=true; r.dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('[data-q]').requestSubmit();})()`);
    await wait(300);
  }
  await until("document.querySelectorAll('.lh-explain .lh-typing').length===0 && document.querySelectorAll('.lh-explain').length===3", 60000); await snap('f3-quiz');
  await evalJs("location.hash='#/practice/mod-essentials/s2'"); await until("!!document.querySelector('[data-start]')"); await snap('f4-briefing');
  await evalJs("document.querySelector('[data-start]').click()");
  await until("document.querySelectorAll('.lh-msg--hcp p').length===1 && !document.querySelector('.lh-typing') && !document.querySelector('#reply').disabled");
  await evalJs(`(()=>{document.querySelector('#reply').value=${JSON.stringify(REPLY[lang])}; document.querySelector('[data-compose]').requestSubmit();})()`);
  await until("document.querySelectorAll('.lh-msg--hcp p').length===2 && !document.querySelector('.lh-typing') && !document.querySelector('[data-end]').disabled");
  await snap('f5-visit');
  await evalJs("document.querySelector('[data-end]').click()");
  await until("!!document.querySelector('.lh-verdict')", 120000); await snap('f6-feedback');
  console.log(await evalJs("document.querySelector('.lh-verdict .lh-hero__title').textContent + ' | red lines: ' + document.querySelectorAll('.lh-compliance--flags .lh-fb-item').length"));
  if (logs.length) console.log('console:', logs);
}, { width: 1440, height: 1000 });
