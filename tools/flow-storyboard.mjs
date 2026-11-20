// Browser test: instructional videos in the storyboard, and the practice card's own objection ("Other").
// A project with three videos (any section) -> the assistant proposes the outline -> every video sits in a lesson
// (highlighted lessons, "Instructional video" box) -> move / untick / re-tick a video -> save (server keeps
// every video placed) -> practice: "Other" shows a required text field -> complete -> the session keeps the wording.
// Usage: [HUB_URL=...] [DEMO_ACCESS_CODE=...] node tools/flow-storyboard.mjs <outDir> [en|es]
import { withPage } from './cdp.mjs';
const [out = '.', lang = 'en'] = process.argv.slice(2);
const URL = process.env.HUB_URL || 'http://localhost:8080/';
const CODE = JSON.stringify(process.env.DEMO_ACCESS_CODE || '');
const ES = lang === 'es';

await withPage(URL, async ({ evalJs, shot }) => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const until = async (expr, ms = 120000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await evalJs(expr)) return Date.now() - t0; await wait(300); } throw new Error('timeout: ' + expr); };
  const snap = async (name, height) => { const h = await evalJs('document.documentElement.scrollHeight'); await shot(`${out}/${name}-${lang}.png`, { x: 0, y: 0, width: 1440, height: height || Math.min(h, 4200) }); console.log('shot', name); };
  const click = sel => evalJs(`(()=>{const b=document.querySelector(${JSON.stringify(sel)}); if(!b) throw new Error('no ${sel.replace(/'/g, '')}'); b.click(); return true})()`);
  const api = (path, method = 'GET', body) => evalJs(`fetch(${JSON.stringify(path)},{method:'${method}',headers:{'content-type':'application/json'}${body ? `,body:${JSON.stringify(JSON.stringify(body))}` : ''}}).then(async r=>{const j=await r.json().catch(()=>({})); if(!r.ok) throw new Error(j.error||r.status); return j;})`);
  const check = (ok, label) => { console.log(ok ? 'PASS' : 'FAIL', label); if (!ok) process.exitCode = 1; };
  const secs = t0 => ((Date.now() - t0) / 1000).toFixed(1);
  // Which lessons hold a video (from the per-lesson "Instructional video" boxes); 3 videos in this project.
  const summary = () => evalJs("(()=>{const sel=[...document.querySelectorAll('[data-vsel]')]; const vids=sel.map(x=>x.value); return {missing: 3-new Set(vids).size, rows: sel.map(x=>x.closest('.lh-ol-lesson').querySelector('.lh-ol-title').value+' <- '+x.selectedOptions[0].textContent), lessons: document.querySelectorAll('.lh-ol-lesson--video').length, ticked: document.querySelectorAll('[data-vtoggle]:checked').length}})()");

  await evalJs(`fetch('/api/access',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:${CODE}})}).then(()=>fetch('/api/admin/reset',{method:'POST'})).then(()=>{localStorage.setItem('zn_lang','${lang}')}).then(()=>fetch('/api/session',{method:'POST',headers:{'content-type':'application/json'},body:'{"userId":"jamie"}'})).then(()=>{location.hash='#/'; location.reload()})`);
  await until("!!document.querySelector('.lh-create')");

  // --- A project like the one in the feedback: three videos, no preferred section ---
  const spec = {
    title: ES ? 'Introducción a la HS y a Derolad' : 'Intro to HS and Derolad',
    goal: ES ? 'Explicar qué es la HS, cómo se trata hoy y dónde encaja Derolad, con los mensajes aprobados.' : 'Explain what HS is, how it is treated today and where Derolad fits, using the approved messages.',
    audience: { role: 'derm_reps', experience: 'new', notes: '' },
    sections: [{ lessons: 3, minutes: 10, quiz: 4, practice: 'chat', practiceMinutes: 4 }, { lessons: 3, minutes: 10, quiz: 4, practice: 'chat', practiceMinutes: 5 }],
    materials: ['src-core', 'src-messages', 'src-objections'], willUpload: false,
    videos: ES ? [{ topic: 'Introducción a la HS', section: 0 }, { topic: 'Cómo se trata la HS hoy', section: 0 }, { topic: 'Ventajas de Derolad', section: 0 }]
      : [{ topic: 'Intro to HS', section: 0 }, { topic: 'Common ways HS is treated', section: 0 }, { topic: 'Advantages of Derolad', section: 0 }],
  };
  const mod = await api('/api/projects', 'POST', { spec, lang });
  const id = mod.id;
  await api(`/api/projects/${id}/cards/materials`, 'POST', { action: 'complete' });
  console.log('project', id);

  // --- Outline: the assistant places every video ---
  await evalJs(`location.hash='#/studio/${id}/outline'`); await until("!!document.querySelector('[data-propose]')");
  await click('[data-propose]'); let t0 = Date.now();
  await until("document.querySelectorAll('.lh-ol-vchip').length >= 1", 90000); await snap('sb1-streaming');
  console.log('first video chip while streaming after', secs(t0), 's');
  await until("!!document.querySelector('.lh-ol-title')", 150000); console.log('outline seconds', secs(t0));
  let s = await summary();
  console.log('summary:', s.rows.join(' || '));
  console.log('reply:', await evalJs("[...document.querySelectorAll('.lh-ol-msgs .lh-msg')].at(-1).textContent.trim().slice(0,300)"));
  check(s.missing === 0 && s.lessons === 3 && s.ticked === 3, 'assistant placed all 3 videos (3 highlighted lessons, 3 ticked boxes)');
  await snap('sb2-outline');

  // --- Move: pick another video in the first video lesson's picker (it moves from its lesson) ---
  const firstSel = await evalJs("document.querySelector('[data-vsel]').dataset.vsel");
  const other = await evalJs(`(()=>{const sel=document.querySelector('[data-vsel="${firstSel}"]'); const o=[...sel.options].find(o=>!o.selected); sel.value=o.value; sel.dispatchEvent(new Event('change',{bubbles:true})); return o.textContent})()`);
  await wait(200); s = await summary();
  console.log('moved', JSON.stringify(other), '->', s.rows.join(' || '));
  check(s.missing === 1 && s.ticked === 2, 'moving a video frees its old lesson');

  // --- Re-tick on a lesson without a video: it takes the unplaced one ---
  await evalJs("(()=>{const b=[...document.querySelectorAll('[data-vtoggle]')].find(x=>!x.checked); b.click();})()");
  await wait(200); s = await summary();
  check(s.missing === 0 && s.ticked === 3, 'ticking "Instructional video" on a free lesson takes the unplaced video');

  // --- Untick one, save: the server puts it back in a lesson ---
  await evalJs("document.querySelector('[data-vtoggle]:checked').click()"); await wait(200);
  s = await summary(); check(s.missing === 1, 'unticking leaves one video not placed');
  await click('[data-save]'); await until("!!document.querySelector('.lh-ol-title') && !document.querySelector('[data-save]:not([disabled])')", 20000); await wait(800);
  s = await summary(); check(s.missing === 0, 'after saving, every video is in a lesson again');
  const saved = await api(`/api/modules/${id}`);
  const placed = saved.studio.outline.sections.flatMap(x => x.lessons).filter(l => l.video).map(l => `${l.id}:${l.video}`);
  check(placed.length === 3 && new Set(placed.map(p => p.split(':')[1])).size === 3, `stored placements ${placed.join(', ')}`);

  await click('[data-complete]'); await until("!!document.querySelector('.lh-st-grid')");

  // --- Practice: "Other" with the creator's own objection ---
  await evalJs(`location.hash='#/studio/${id}/practice'`); await until("!!document.querySelector('[data-draft]')");
  await click('[data-draft]'); t0 = Date.now();
  await until("!!document.querySelector('[data-practice] [data-objection]')", 90000); console.log('practice draft seconds', secs(t0));
  check(await evalJs("[...document.querySelector('[data-objection]').options].at(-1).value==='other'"), 'objection list ends with "Other (write your own)"');
  check(await evalJs("document.querySelector('[data-objection-other]').hidden"), 'free-text field hidden until "Other" is chosen');
  await evalJs("(()=>{const s=document.querySelector('[data-objection]'); s.value='other'; s.dispatchEvent(new Event('change',{bubbles:true})); s.dispatchEvent(new Event('input',{bubbles:true}));})()");
  check(await evalJs("!document.querySelector('[data-objection-other]').hidden && document.activeElement?.name==='objectionText'"), '"Other" shows the free-text field and focuses it');
  await click('[data-complete]'); await wait(800);
  check(await evalJs("location.hash.endsWith('/practice') && !!document.querySelector('.lh-error')"), 'completing with an empty "Other" is refused with a message: ' + await evalJs("document.querySelector('.lh-error')?.textContent||''"));
  const own = ES ? '«Solo veo a unos pocos pacientes con HS al año; no me compensa aprender otro biológico.»' : '"I only see a handful of HS patients a year, so learning another biologic isn\'t worth my time."';
  await evalJs(`(()=>{const f=document.querySelector('[name="objectionText"]'); f.value=${JSON.stringify(own)}; f.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await evalJs("document.querySelector('[data-session]').scrollIntoView({block:'start'})"); await snap('sb4-practice-other', 1000);
  await click('[data-complete]'); await until("!!document.querySelector('.lh-st-grid')", 20000);
  const after = await api(`/api/modules/${id}`);
  const p0 = after.studio.practice[0];
  check(p0.objection === 'other' && p0.objectionText === own, `stored: ${p0.objection} · ${p0.objectionText}`);
  // Reopen: the card shows the wording again.
  await evalJs(`location.hash='#/studio/${id}/practice'`); await until("!!document.querySelector('[data-objection]')");
  check(await evalJs(`document.querySelector('[data-objection]').value==='other' && document.querySelector('[name="objectionText"]').value===${JSON.stringify(own)}`), 'reopened card shows "Other" and the wording');
  console.log('PROJECT', id);
});
