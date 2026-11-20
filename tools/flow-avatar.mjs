// Browser test of a final challenge as a live video avatar visit (LiveAvatar), with a fake microphone.
// Local server only: it resets the demo and switches mod-essentials section 2 to "Avatar conversation" in the
// local state file. Start the server with LIVEAVATAR_SANDBOX=1 (free; the sandbox avatar hangs up after ~1 minute,
// so the test also checks the fall-back to typing).
// Usage: node tools/flow-avatar.mjs <outDir> <learner.wav> [en|es]
//   learner.wav: plain 16-bit PCM WAV with the rep's lines and some silence; Chrome loops it as the microphone.
import { withPage } from './cdp.mjs';
import { readFile, writeFile } from 'node:fs/promises';
const [out = '.', wav, lang = 'en'] = process.argv.slice(2);
if (!wav) throw new Error('Give a WAV file for the fake microphone.');
const URL = process.env.HUB_URL || 'http://localhost:8080/';
const STATE = new globalThis.URL('../app/data/state.json', import.meta.url);
const CODE = JSON.stringify(process.env.DEMO_ACCESS_CODE || '');
const TYPED = lang === 'es'
  ? 'Le entiendo, doctor. ¿Cuántos de sus pacientes siguen con brotes dolorosos con su tratamiento actual?'
  : 'I understand, doctor. How many of your patients still have painful flares on their current treatment?';

await withPage(URL, async ({ evalJs, shot, logs }) => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const until = async (expr, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await evalJs(expr)) return Date.now() - t0; await wait(300); } throw new Error('timeout: ' + expr); };
  const snap = async name => { await shot(`${out}/${name}-${lang}.png`, { x: 0, y: 0, width: 1440, height: 1000 }); console.log('shot', name); };
  const check = (ok, label) => { console.log(ok ? 'PASS' : 'FAIL', label); if (!ok) process.exitCode = 1; };
  const t0 = Date.now(); const at = () => ((Date.now() - t0) / 1000).toFixed(1) + 's';

  await evalJs(`fetch('/api/access',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:${CODE}})}).then(()=>fetch('/api/admin/reset',{method:'POST'})).then(()=>1)`);
  // Local only: make the section 2 final challenge an avatar conversation.
  const state = JSON.parse(await readFile(STATE, 'utf8'));
  state.modules.find(m => m.id === 'mod-essentials').sections.find(s => s.id === 's2').boss.mode = 'avatar';
  await writeFile(STATE, JSON.stringify(state, null, 2));
  await evalJs(`(()=>{localStorage.setItem('zn_lang','${lang}'); return fetch('/api/session',{method:'POST',headers:{'content-type':'application/json'},body:'{"userId":"alex"}'}).then(()=>{location.hash='#/quiz/mod-essentials/s2'; location.reload(); return 1})})()`);
  for (const pick of [1, 0, 2]) {
    await until("!!document.querySelector('[data-q]')");
    await evalJs(`(()=>{const r=document.querySelectorAll('[data-q] input')[${pick}]; r.checked=true; r.dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('[data-q]').requestSubmit();})()`);
    await wait(300);
  }
  await until("document.querySelectorAll('.lh-explain .lh-typing').length===0 && document.querySelectorAll('.lh-explain').length===3", 60000);
  await evalJs("location.hash='#/practice/mod-essentials/s2'"); await until("!!document.querySelector('[data-start]')");
  check(await evalJs("!!document.querySelector('.lh-pr__avatar')"), 'briefing says it is an avatar conversation: ' + await evalJs("document.querySelector('.lh-pr__avatar')?.textContent"));

  await evalJs("document.querySelector('[data-start]').click()");
  check(await evalJs("!!document.querySelector('.lh-call--avatar [data-av-video]')"), 'visit opens as a video call');
  await snap('av1-connecting');
  const conn = await until("document.querySelector('[data-av-overlay]')?.hidden === true", 60000);
  console.log(at(), 'avatar connected after', (conn / 1000).toFixed(1), 's; status:', await evalJs("document.querySelector('[data-av-status]').textContent"));
  await until("document.querySelectorAll('.lh-msg--hcp p').length>=1 && !document.querySelector('.lh-typing')", 60000);
  console.log(at(), 'HCP opens:', await evalJs("document.querySelector('.lh-msg--hcp p').textContent"));
  await until("/speaking|hablando/.test(document.querySelector('[data-av-status]').textContent)", 20000).then(() => console.log(at(), 'avatar speaking')).catch(() => console.log(at(), 'avatar speaking: not seen'));
  await wait(1500);
  await snap('av2-speaking');
  console.log(at(), 'video', await evalJs("(v=>v.videoWidth+'x'+v.videoHeight+' t='+v.currentTime.toFixed(1))(document.querySelector('[data-av-video]'))"));

  // The learner talks (fake microphone): the words become the rep's turn and Claude answers through the avatar.
  try {
    await until("document.querySelectorAll('.lh-msg--rep p').length>=1", 40000);
    console.log(at(), 'rep (spoken):', await evalJs("document.querySelector('.lh-msg--rep p').textContent"));
    check(true, 'spoken words became the rep\'s turn');
    await until("document.querySelectorAll('.lh-msg--hcp p').length>=2 && !document.querySelector('.lh-typing')", 40000);
    console.log(at(), 'HCP replies:', await evalJs("[...document.querySelectorAll('.lh-msg--hcp p')].at(-1).textContent"));
    await wait(2500); await snap('av3-answer');
  } catch (e) { check(false, 'spoken turn: ' + e.message); }

  // Sandbox hangs up after about a minute: the visit carries on by typing.
  await until("!!document.querySelector('[data-av-overlay]:not([hidden])') || !!document.querySelector('.lh-verdict')", 70000).catch(() => {});
  console.log(at(), 'after the sandbox minute:', await evalJs("document.querySelector('[data-av-overlay]')?.textContent.trim()"));
  await until("!document.querySelector('#reply').disabled", 30000);
  const hcpBefore = await evalJs("document.querySelectorAll('.lh-msg--hcp p').length");
  await evalJs(`(()=>{document.querySelector('#reply').value=${JSON.stringify(TYPED)}; document.querySelector('[data-compose]').requestSubmit(); return 1})()`);
  await until(`document.querySelectorAll('.lh-msg--hcp p').length>${hcpBefore} && !document.querySelector('.lh-typing')`, 40000);
  check(true, 'typing still works after the avatar left');
  await snap('av4-typed');
  await until("!document.querySelector('[data-end]').disabled", 20000);
  await evalJs("document.querySelector('[data-end]').click()");
  await until("!!document.querySelector('.lh-verdict')", 120000); await snap('av5-feedback');
  console.log(at(), 'feedback:', await evalJs("document.querySelector('.lh-verdict .lh-hero__title').textContent + ' | ' + [...document.querySelectorAll('.lh-score')].map(x=>x.textContent.replace(/\\s+/g,' ').trim()).join(' / ')"));
  const errs = logs.filter(l => /error/i.test(l) && !/favicon/i.test(l));
  if (errs.length) console.log('console errors:', errs.slice(0, 8));
}, {
  width: 1440, height: 1000,
  extraArgs: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`,
    '--autoplay-policy=no-user-gesture-required', '--disable-features=AudioServiceOutOfProcess,AudioServiceSandbox'],
});
