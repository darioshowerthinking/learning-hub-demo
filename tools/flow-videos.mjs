// Browser test of the Videos card: one video from the library, one uploaded file (local storage or Supabase).
// Prepares a project through the API (wizard spec, materials, AI outline), then works in the browser.
// Usage: [HUB_URL=...] [DEMO_ACCESS_CODE=...] node tools/flow-videos.mjs <outDir> [en|es]
import { withPage } from './cdp.mjs';
const [out = '.', lang = 'en'] = process.argv.slice(2);
const URL = process.env.HUB_URL || 'http://localhost:8080/';
const CODE = JSON.stringify(process.env.DEMO_ACCESS_CODE || '');
await withPage(URL, async ({ evalJs, shot, logs }) => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const until = async (expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await evalJs(expr)) return; await wait(250); } throw new Error('timeout: ' + expr); };
  const snap = async name => { const h = await evalJs('document.documentElement.scrollHeight'); await shot(`${out}/${name}-${lang}.png`, { x: 0, y: 0, width: 1440, height: Math.min(h, 3600) }); console.log('shot', name); };
  const click = sel => evalJs(`(()=>{const b=document.querySelector(${JSON.stringify(sel)}); if(!b) throw new Error('no ' + ${JSON.stringify(sel)}); b.click(); return true})()`);
  const t0 = Date.now();
  const id = await evalJs(`(async()=>{
    const j=(p,m,b)=>fetch(p,{method:m,headers:{'content-type':'application/json'},body:b?JSON.stringify(b):undefined}).then(async r=>{const x=await r.text(); const last=x.trim().split('\\n').at(-1); const d=JSON.parse(last); if(!r.ok||d.error) throw new Error(d.error); return d;});
    await j('/api/access','POST',{code:${CODE}}); await j('/api/admin/reset','POST'); await j('/api/session','POST',{userId:'jamie'});
    localStorage.setItem('zn_lang','${lang}');
    const p=await j('/api/projects','POST',{lang:'${lang}',spec:{title:'Video test',goal:'Reps can explain how Derolad works and how Zenetic Access Connect supports the office.',audience:{role:'derm_reps',experience:'mixed'},
      sections:[{lessons:2,minutes:6,quiz:3,practice:'none',practiceMinutes:4}],materials:['src-core','src-messages'],videos:[{topic:'How Derolad works',section:1},{topic:'Our own field video',section:1}]}});
    await j('/api/projects/'+p.id+'/cards/materials','POST',{action:'complete'});
    await j('/api/projects/'+p.id+'/outline','POST',{message:''});
    await j('/api/projects/'+p.id+'/cards/outline','POST',{action:'complete'});
    return p.id;})()`);
  console.log('project', id, 'outline ready in', ((Date.now() - t0) / 1000).toFixed(1), 's');
  await evalJs(`location.hash='#/studio/${id}/videos'; location.reload()`); await wait(800);
  await until("!!document.querySelector('[data-src]')");
  // v1: from the library
  await evalJs(`(()=>{const r=document.querySelector('[data-video="v1"] [data-src][value="library"]'); r.checked=true; r.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await until("document.querySelectorAll('[data-library=\"v1\"] .lh-vlib').length >= 3");
  await snap('v1-library');
  await click('[data-library="v1"] [data-pick="vid-mechanism"]');
  await until("!!document.querySelector('[data-video=\"v1\"] .lh-vd-current video')");
  // v2: upload a file (one of the sample MP4s, fetched and handed to the file input)
  await evalJs(`(async()=>{const r=document.querySelector('[data-video="v2"] [data-src][value="upload"]'); r.checked=true; r.dispatchEvent(new Event('change',{bubbles:true}));
    const blob=await fetch('/media/explainer-access-${lang}.mp4').then(x=>x.blob()); const f=new File([blob],'field-video.mp4',{type:'video/mp4'});
    const dt=new DataTransfer(); dt.items.add(f); const pane=document.querySelector('[data-video="v2"] [data-src-pane="upload"]'); pane.querySelector('[data-up-file]').files=dt.files;
    pane.querySelector('[data-up-transcript]').value='On screen: Zenetic Access Connect in three steps: benefits verification, prior authorization, copay support.'; pane.querySelector('[data-up-pending]').checked=true;
    pane.querySelector('[data-upload-video]').click(); return true;})()`);
  const t1 = Date.now();
  await until("!!document.querySelector('[data-video=\"v2\"] .lh-vd-current video')", 120000);
  console.log('upload seconds', ((Date.now() - t1) / 1000).toFixed(1));
  console.log('chips:', await evalJs("[...document.querySelectorAll('.lh-vd > .lh-row .lh-chip')].map(c=>c.textContent).join(' | ')"));
  console.log('playable:', await evalJs("Promise.all([...document.querySelectorAll('.lh-vd-current video')].map(v=>new Promise(r=>{ if(v.readyState>=1) return r(Math.round(v.duration)); v.onloadedmetadata=()=>r(Math.round(v.duration)); v.onerror=()=>r('error'); v.load(); setTimeout(()=>r('timeout'),15000);}))).then(x=>x.join(', '))"));
  await snap('v2-videos-chosen');
  await click('[data-complete]'); await until("!!document.querySelector('.lh-st-grid')", 20000);
  console.log('cards:', await evalJs("[...document.querySelectorAll('.lh-stcard')].map(c=>c.querySelector('.lh-card__title').textContent+': '+c.querySelector('.lh-chip').textContent).join(' | ')"));
  // The library now includes the upload
  console.log('library size now:', await evalJs("fetch('/api/videos').then(r=>r.json()).then(x=>x.length+' ('+x.map(v=>v.kind+(v.status==='pending'?'*':'')).join(',')+')')"));
  if (logs.length) console.log('console:', logs);
}, { width: 1440, height: 1000 });
