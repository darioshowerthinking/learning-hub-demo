// Browser test of shared, anchored review comments and the creator's follow-up in the studio:
// MLR selects text and comments, runs the AI pre-check, "Show in the text", adds a finding as a comment ->
// Marketing sees MLR's comments, agrees -> decisions send it back -> creator: Action required on the dashboard,
// studio banner and card states, "Show me", "Keep the text", "Fix with AI", resubmit -> MLR round 2: answers,
// "Changed since round 1", confirm -> all approve -> the Training Manager goes live.
// Usage: [HUB_URL=...] [DEMO_ACCESS_CODE=...] node tools/flow-comments.mjs <outDir> [en|es]
import { withPage } from './cdp.mjs';
const [out = '.', lang = 'en'] = process.argv.slice(2);
const URL = process.env.HUB_URL || 'http://localhost:8080/';
const CODE = JSON.stringify(process.env.DEMO_ACCESS_CODE || '');
await withPage(URL, async ({ evalJs, shot, logs }) => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const until = async (expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await evalJs(expr)) return Date.now() - t0; await wait(250); } throw new Error('timeout: ' + expr); };
  const snap = async (name, full = true) => { const h = full ? await evalJs('document.documentElement.scrollHeight') : 1000; const y = full ? 0 : await evalJs('window.scrollY'); await shot(`${out}/${name}-${lang}.png`, { x: 0, y, width: 1440, height: Math.min(h, 3600) }); console.log('shot', name); };
  const click = sel => evalJs(`(()=>{const b=document.querySelector(${JSON.stringify(sel)}); if(!b) throw new Error('no ' + ${JSON.stringify(sel)}); b.click(); return true})()`);
  const login = async user => { await evalJs(`fetch('/api/session',{method:'POST',headers:{'content-type':'application/json'},body:'{"userId":"${user}"}'}).then(()=>{location.hash='#/'; location.reload()})`); await wait(800); await until("!!document.querySelector('.lh-section, .lh-create, .lh-grid')"); };
  const secs = t0 => ((Date.now() - t0) / 1000).toFixed(1);
  // Select text inside a part (first long paragraph of the given block type) and comment on it.
  const selectAndComment = async (part, text) => {
    const picked = await evalJs(`(()=>{const root=document.querySelector('[data-text="${part}"]'); root.closest('details').open=true;
      const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); let n; while((n=w.nextNode())){ if(n.nodeValue.trim().length>80 && n.parentElement.closest('.lh-b--text p, .lh-b--why p')) break; }
      const r=document.createRange(); r.setStart(n,0); r.setEnd(n, n.nodeValue.indexOf('.')>40 ? n.nodeValue.indexOf('.')+1 : 80);
      n.parentElement.scrollIntoView({block:'center'}); const s=getSelection(); s.removeAllRanges(); s.addRange(r); return r.toString();})()`);
    await until("!document.querySelector('[data-sel-comment]').hidden", 5000);
    await snap('c1-selection', false);
    await click('[data-sel-comment]');
    await until("!!document.querySelector('.lh-pop textarea')");
    await evalJs(`(()=>{const f=document.querySelector('.lh-pop form'); f.querySelector('textarea').value=${JSON.stringify(text)}; f.requestSubmit();})()`);
    await until(`document.querySelectorAll('[data-text="${part}"] .lh-anno__pin').length >= 1`, 10000);
    return picked;
  };

  await evalJs(`fetch('/api/access',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:${CODE}})}).then(()=>fetch('/api/admin/reset',{method:'POST'})).then(()=>{localStorage.setItem('zn_lang','${lang}')})`);

  // --- MLR: comment on selected text, AI pre-check, show in text, add a finding ---
  await login('drlee');
  await evalJs("location.hash='#/review/mod-access'"); await until("!!document.querySelector('[data-text=\"l1\"]')");
  const quote = await selectAndComment('l1', lang === 'es' ? 'Usa la descripción exacta del programa del material aprobado.' : 'Use the exact program description from the approved material.');
  console.log('anchored on:', JSON.stringify(quote.slice(0, 80)));
  await click('[data-text="l1"] .lh-anno__pin'); await until("!!document.querySelector('.lh-pop .lh-cm')");
  await snap('c2-pin-bubble', false);
  await evalJs("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))");
  await click('[data-run]'); let t0 = Date.now();
  await until("!!document.querySelector('[data-precheck] [data-run]') && !document.querySelector('.is-running')", 180000);
  console.log('precheck seconds', secs(t0), '| findings:', await evalJs("document.querySelectorAll('.lh-finding').length"), '| highlighted:', await evalJs("new Set([...document.querySelectorAll('mark.lh-flag')].map(m=>m.dataset.finding)).size"));
  if (await evalJs("!!document.querySelector('[data-show]')")) {
    await click('[data-show]'); await wait(1800);
    console.log('show in text -> mark in view:', await evalJs("(()=>{const m=document.querySelector('mark.lh-flag.lh-pulse'); if(!m) return 'no mark'; const r=m.getBoundingClientRect(); return r.top>0 && r.bottom<innerHeight ? 'yes: '+m.textContent.slice(0,60) : 'off screen';})()"));
    await snap('c3-show-in-text', false);
    await click('[data-add-finding]'); await until("document.querySelectorAll('[data-comment-groups] .lh-cm').length >= 2", 10000);
  }
  await snap('c4-mlr-review');

  // --- Marketing sees MLR's comments and agrees ---
  await login('elena');
  await evalJs("location.hash='#/review/mod-access'"); await until("!!document.querySelector('[data-comment-groups] .lh-cm')");
  console.log('marketing sees:', await evalJs("[...document.querySelectorAll('[data-comment-groups] .lh-cm')].map(x=>x.querySelector('.lh-team').textContent+' '+x.querySelector('.lh-chip').textContent).join(' | ')"));
  await click('[data-comment-groups] [data-cm-agree]'); await until("!!document.querySelector('[data-cm-agree][aria-pressed=\"true\"]')", 10000);
  await snap('c5-marketing-agrees');
  await evalJs("window.confirm=()=>true"); await click('[data-decide="approved"]'); await until("!!document.querySelector('.lh-rv-flash')", 20000);
  await login('drlee');
  await evalJs("location.hash='#/review/mod-access'"); await until("!!document.querySelector('[data-decide]')");
  await evalJs("window.confirm=()=>true"); await click('[data-decide="changes_requested"]'); await until("!!document.querySelector('.lh-rv-flash')", 20000);
  console.log('status after decisions:', await evalJs("document.querySelector('.lh-hero .lh-chip').textContent"));

  // --- Creator ---
  await login('jamie');
  await until("!!document.querySelector('.lh-project--back')");
  console.log('dashboard sections:', await evalJs("[...document.querySelectorAll('.lh-section__title')].map(h=>h.textContent.trim()).join(' | ')"));
  await snap('c6-dashboard');
  await click('.lh-project--back'); await until("!!document.querySelector('.lh-cc-banner')");
  console.log('cards:', await evalJs("[...document.querySelectorAll('.lh-stcard')].map(c=>c.querySelector('.lh-card__title').textContent+': '+c.querySelector('.lh-chip').textContent).join(' | ')"));
  await snap('c7-studio-back');
  await evalJs("location.hash='#/studio/mod-access/content'"); await until("!!document.querySelector('[data-cc-panel]')");
  await click('[data-cc-panel] [data-cc-show]'); await wait(1200);
  console.log('show me -> highlight in view:', await evalJs("(()=>{const m=document.querySelector('mark.lh-anno.lh-pulse'); if(!m) return 'no mark'; const r=m.getBoundingClientRect(); return r.top>0 && r.bottom<innerHeight ? 'yes' : 'off screen';})()"));
  await snap('c8-content-show-me', false);
  // Keep the second comment with a reason, fix the first with AI.
  const ids = await evalJs("[...document.querySelectorAll('[data-cc-panel] [data-cc]')].map(x=>x.dataset.cc)");
  if (ids.length > 1) {
    await click(`[data-cc="${ids[1]}"] [data-cc-keep]`); await until("!!document.querySelector('.lh-pop textarea')");
    await evalJs(`(()=>{const f=document.querySelector('.lh-pop form'); f.querySelector('textarea').value=${JSON.stringify(lang === 'es' ? 'Es el texto aprobado del Resumen de producto.' : 'This is the approved wording from the Core Product Summary.')}; f.requestSubmit();})()`);
    await until(`!!document.querySelector('[data-cc="${ids[1]}"].lh-cc--done')`, 15000);
  }
  await click(`[data-cc="${ids[0]}"] [data-cc-fix]`); t0 = Date.now();
  await until("!!document.querySelector('.lh-sb')", 10000); await until(`!!document.querySelector('[data-cc="${ids[0]}"].lh-cc--done')`, 180000);
  console.log('fix with AI seconds', secs(t0), '| reply:', await evalJs(`document.querySelector('[data-cc="${ids[0]}"] .lh-cm__reply')?.textContent.replace(/\\s+/g,' ').trim().slice(0,160)`));
  await snap('c9-content-answered');
  await evalJs("location.hash='#/studio/mod-access/preview'"); await until("!!document.querySelector('[data-submit]')");
  console.log('preview checks:', await evalJs("[...document.querySelectorAll('.lh-pv-check')].map(x=>(x.classList.contains('is-ok')?'✓ ':'○ ')+x.textContent.replace(/^\\s*[✓○]\\s*/,'').trim()).join(' | ')"));
  await snap('c10-preview-comments');
  await until("!document.querySelector('[data-submit]').disabled", 90000);
  await evalJs("window.confirm=()=>true"); await click('[data-submit]'); await until("location.hash==='#/studio/mod-access' && !!document.querySelector('.lh-st-grid')", 120000);

  // --- MLR, round 2 ---
  await login('drlee');
  await evalJs("location.hash='#/review/mod-access'"); await until("!!document.querySelector('.lh-rv-last')");
  console.log('round 2 changed markers:', await evalJs("document.querySelectorAll('.lh-changed').length"), '| previous comments:', await evalJs("document.querySelectorAll('.lh-rv-last .lh-cm').length"));
  await click('[data-verdict="confirmed"]'); await until("!document.querySelector('[data-verdict=\"confirmed\"]') || document.querySelectorAll('[data-verdict=\"confirmed\"]').length < 2", 10000);
  await evalJs("document.querySelector('.lh-changed')?.closest('details')?.setAttribute('open',''); document.querySelector('.lh-changed')?.scrollIntoView({block:'center'})");
  await snap('c11-round2');
  // Everyone approves round 2; the Training Manager sees Request changes / Go live, then takes it live.
  await evalJs("window.confirm=()=>true"); await click('[data-decide="approved"]'); await until("!!document.querySelector('.lh-rv-flash')", 20000);
  for (const u of ['priya', 'marcus', 'elena']) await evalJs(`fetch('/api/session',{method:'POST',headers:{'content-type':'application/json'},body:'{"userId":"${u}"}'}).then(()=>fetch('/api/modules/mod-access/review',{method:'POST',headers:{'content-type':'application/json'},body:'{"decision":"approved"}'}))`);
  await login('avery');
  await evalJs("location.hash='#/review/mod-access'"); await until("!!document.querySelector('.lh-actionbar [data-golive]') && !!document.querySelector('[data-text]')");
  const bar = () => evalJs("[...document.querySelectorAll('.lh-actionbar button')].map(b=>b.textContent.trim()+(b.disabled?' (disabled)':'')).join(' | ')");
  console.log('admin bar:', await bar());
  await selectAndComment('l2', lang === 'es' ? 'Acorta este párrafo antes de publicar.' : 'Shorten this paragraph before we go live.');
  console.log('admin bar after a comment:', await bar(), '| other teams visible:', await evalJs("document.querySelectorAll('[data-comment-groups] .lh-cm-group').length"));
  await snap('c12-admin');
  await evalJs("window.confirm=()=>true"); await click('[data-golive]'); await until("!!document.querySelector('.lh-rv-flash')", 20000);
  console.log('after go live:', await evalJs("document.querySelector('.lh-hero .lh-chip').textContent"));
  if (logs.length) console.log('console:', logs);
}, { width: 1440, height: 1000 });
