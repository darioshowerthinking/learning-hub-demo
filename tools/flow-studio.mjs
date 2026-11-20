// Browser test of the Training Module Creation Studio (content creator):
// dashboard -> wizard (example in every step, review, create) -> studio -> materials (upload, complete)
// -> outline (propose, chat, agree) -> practice (AI setup, complete) -> videos (script, complete)
// -> lessons (write, complete) -> preview (open a lesson, note, apply with AI) -> submit.
// Usage: [HUB_URL=...] [DEMO_ACCESS_CODE=...] node tools/flow-studio.mjs <outDir> [en|es]
import { withPage } from './cdp.mjs';
const [out = '.', lang = 'en'] = process.argv.slice(2);
const URL = process.env.HUB_URL || 'http://localhost:8080/';
const CODE = JSON.stringify(process.env.DEMO_ACCESS_CODE || '');
await withPage(URL, async ({ evalJs, shot, logs }) => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const until = async (expr, ms = 120000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await evalJs(expr)) return Date.now() - t0; await wait(300); } throw new Error('timeout: ' + expr); };
  const snap = async name => { const h = await evalJs('document.documentElement.scrollHeight'); await shot(`${out}/${name}-${lang}.png`, { x: 0, y: 0, width: 1440, height: Math.min(h, 4200) }); console.log('shot', name); };
  const click = sel => evalJs(`(()=>{const b=document.querySelector(${JSON.stringify(sel)}); if(!b) throw new Error('no ${sel.replace(/'/g, '')}'); b.click(); return true})()`);
  const secs = t0 => ((Date.now() - t0) / 1000).toFixed(1);
  const cards = () => evalJs("[...document.querySelectorAll('.lh-stcard')].map(c=>c.querySelector('.lh-card__title').textContent+': '+c.querySelector('.lh-chip').textContent).join(' | ')");
  const errText = () => evalJs("document.querySelector('.lh-error')?.textContent||''");

  await evalJs(`fetch('/api/access',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:${CODE}})}).then(()=>fetch('/api/admin/reset',{method:'POST'})).then(()=>{localStorage.setItem('zn_lang','${lang}'); localStorage.removeItem('zn-wizard-draft')}).then(()=>fetch('/api/session',{method:'POST',headers:{'content-type':'application/json'},body:'{"userId":"jamie"}'})).then(()=>{location.hash='#/'; location.reload()})`);
  await until("!!document.querySelector('.lh-create')"); await snap('s1-dashboard');

  // --- Wizard ---
  await evalJs("location.hash='#/build'"); await until("!!document.querySelector('[data-wizard]')");
  for (const step of ['audience', 'shape', 'materials', 'videos']) {
    await click('[data-example]'); await wait(200);
    if (step === 'shape') { await snap('s2-wizard-shape'); }
    if (step === 'videos') await snap('s3-wizard-videos');
    await click('[data-next]'); await wait(250);
    const e = await errText(); if (e) throw new Error(`wizard ${step}: ${e}`);
  }
  await until("!!document.querySelector('[data-create]')"); await snap('s4-wizard-review');
  // Go back to the shape step from the summary, change a number, return.
  await click('.lh-wz-sum [data-goto="1"]'); await until("!!document.querySelector('[name=\"s0.quiz\"]')");
  await evalJs("(()=>{const i=document.querySelector('[name=\"s0.quiz\"]'); i.value='4'; i.dispatchEvent(new Event('input',{bubbles:true}));})()");
  console.log('totals:', await evalJs("document.querySelector('[data-totals]').textContent"));
  await click('[data-goto="4"]'); await until("!!document.querySelector('[data-create]')");
  await click('[data-create]'); await until("location.hash.startsWith('#/studio/') && !!document.querySelector('.lh-st-grid')");
  const id = await evalJs("location.hash.split('/')[2]");
  console.log('project', id, '|', await cards()); await snap('s5-studio');

  // --- Materials: upload a text file through the file input, then complete ---
  await evalJs(`location.hash='#/studio/${id}/materials'`); await until("!!document.querySelector('[data-upload]')");
  await evalJs(`(()=>{const f=new File([${JSON.stringify('Zenetic Injection Training Support (fictional, approved for training)\nNurses from Zenetic offer one free in-office or virtual injection-training session for each new Derolad patient. The session takes about 20 minutes and covers storage, preparing the autoinjector, choosing the injection site (thigh or abdomen) and safe disposal. Offices request it through Zenetic Access Connect.')}],'injection-support.txt',{type:'text/plain'}); const dt=new DataTransfer(); dt.items.add(f); const i=document.querySelector('[data-upload] input[type=file]'); i.files=dt.files; document.querySelector('[data-upload] [name=pending]').checked=true; document.querySelector('[data-upload]').requestSubmit();})()`);
  let t0 = Date.now();
  await until("document.querySelectorAll('.lh-mat').length >= 4", 60000); console.log('upload seconds', secs(t0));
  await evalJs("document.querySelector('.lh-mat:last-child details')?.setAttribute('open','')"); await snap('s6-materials');
  await click('[data-complete]'); await until("!!document.querySelector('.lh-st-grid')");

  // --- Outline: propose, ask for a change, agree ---
  await evalJs(`location.hash='#/studio/${id}/outline'`); await until("!!document.querySelector('[data-propose]')");
  await click('[data-propose]'); t0 = Date.now();
  await until("document.querySelectorAll('.lh-ol-section--live').length >= 1", 60000); await wait(2500); await snap('s7-outline-streaming');
  await until("!!document.querySelector('.lh-ol-title')", 120000); console.log('outline seconds', secs(t0));
  await snap('s8-outline');
  await evalJs("(()=>{const f=document.querySelector('[data-compose]'); f.message.value=" + JSON.stringify(lang === 'es' ? 'Añade a la primera lección un punto sobre el cribado de tuberculosis.' : 'Add a point about TB screening to the first lesson.') + "; f.requestSubmit();})()");
  t0 = Date.now(); await wait(1500);
  await until("!!document.querySelector('[data-compose] textarea:not([disabled])') && document.querySelectorAll('.lh-ol-msgs .lh-msg').length >= 3", 120000);
  console.log('chat seconds', secs(t0), '| reply:', await evalJs("[...document.querySelectorAll('.lh-ol-msgs .lh-msg')].at(-1).textContent.trim().slice(0,160)"));
  // Manual edit: move lesson 2 up, then agree (saves first).
  await click('[data-move="0.1.-1"]'); await wait(200);
  console.log('after move:', await evalJs("[...document.querySelectorAll('.lh-ol-title')].map(i=>i.value.slice(0,24)).join(' | ')"));
  await click('[data-complete]'); await until("!!document.querySelector('.lh-st-grid')", 20000);
  console.log(await cards());

  // --- Practice ---
  await evalJs(`location.hash='#/studio/${id}/practice'`); await until("!!document.querySelector('[data-draft]')");
  await click('[data-draft]'); t0 = Date.now(); await until("!!document.querySelector('[data-session]')", 90000); console.log('practice seconds', secs(t0));
  await snap('s9-practice');
  await click('[data-complete]'); await until("!!document.querySelector('.lh-st-grid')", 20000);

  // --- Videos ---
  await evalJs(`location.hash='#/studio/${id}/videos'`); await until("!!document.querySelector('[data-write]')");
  await evalJs("(()=>{const t=document.querySelector('[data-video] [name=teach]'); t.value=" + JSON.stringify(lang === 'es' ? 'Los pasos para enseñar el autoinyector y cuándo derivar a enfermería.' : 'The steps of showing the autoinjector, and when to hand over to the nurse.') + "; t.dispatchEvent(new Event('input',{bubbles:true}));})()");
  await click('[data-write]'); t0 = Date.now();
  await until("!!document.querySelector('.lh-vs--live .lh-vs__scene')", 60000); await wait(1500); await snap('s10-video-streaming');
  await until("!!document.querySelector('[data-save-script]')", 120000); console.log('script seconds', secs(t0));
  await snap('s11-video');
  await click('[data-complete]'); await until("!!document.querySelector('.lh-st-grid')", 20000);

  // --- Lessons ---
  await evalJs(`location.hash='#/studio/${id}/content'`); await until("!!document.querySelector('[data-generate]')"); await snap('s12-content-ready');
  await click('[data-generate]'); t0 = Date.now();
  await until("document.querySelectorAll('.lh-sb__live--active').length >= 1", 60000); await wait(5000); await snap('s13-writing');
  await until("!!document.querySelector('[data-editor]')", 240000); console.log('lessons seconds', secs(t0));
  await snap('s14-editor');
  await click('[data-content-complete]'); await until("!!document.querySelector('.lh-st-grid')", 20000);
  console.log(await cards()); await snap('s15-studio-done');

  // --- Preview: open the lesson with the video, add a note, apply, submit ---
  await evalJs(`location.hash='#/studio/${id}/preview'`); await until("!!document.querySelector('[data-open]')");
  await evalJs("(()=>{const li=[...document.querySelectorAll('.lh-pv-item')].find(x=>x.querySelector('.lh-card__meta')?.textContent.match(/video|vídeo/)) || document.querySelector('.lh-pv-item'); li.querySelector('[data-open]').click(); li.scrollIntoView();})()");
  await wait(600); await snap('s16-preview');
  await evalJs("(()=>{const t=document.querySelector('[data-note]'); t.value=" + JSON.stringify(lang === 'es' ? 'Haz el título más corto.' : 'Make the title shorter.') + "; t.dispatchEvent(new Event('input',{bubbles:true}));})()");
  await wait(1500);
  await click('[data-apply]'); t0 = Date.now();
  await until("!!document.querySelector('.lh-sb')", 20000); await until("!!document.querySelector('[data-submit]')", 180000); console.log('apply notes seconds', secs(t0));
  console.log('submit enabled:', await evalJs("!document.querySelector('[data-submit]').disabled"), '|', await evalJs("[...document.querySelectorAll('.lh-pv-check')].map(x=>(x.classList.contains('is-ok')?'✓ ':'○ ')+x.textContent.replace(/^\\s*[✓○]\\s*/,'').trim()).join(' | ')"));
  await until("document.querySelector('[data-translation]')?.classList.contains('is-ok')", 90000).catch(() => console.log('translation still pending (submit translates)'));
  await evalJs("window.confirm=()=>true"); await click('[data-submit]');
  await until("!!document.querySelector('.lh-st-grid') && !!document.querySelector('.lh-teams')", 120000);
  await snap('s17-submitted');
  console.log('after submit:', await evalJs("document.querySelector('.lh-hero .lh-chip').textContent"));
  await evalJs("location.hash='#/'"); await until("!!document.querySelector('.lh-create')"); await snap('s18-dashboard-after');
  if (logs.length) console.log('console:', logs);
}, { width: 1440, height: 1000 });
