// Screenshots of each role's home screen (and the login page) for visual review.
// Usage: [HUB_URL=...] [DEMO_ACCESS_CODE=...] node tools/shots.mjs <outDir> [width]
import { withPage } from './cdp.mjs';
const [out = '.', w = '1440'] = process.argv.slice(2);
const width = Number(w);
const mobile = width < 500;
const URL = process.env.HUB_URL || 'http://localhost:8080/';
const CODE = process.env.DEMO_ACCESS_CODE || '';
await withPage(URL, async ({ evalJs, shot, logs, send }) => {
  if (mobile) await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const full = async name => {
    const h = await evalJs('document.documentElement.scrollHeight');
    const sx = await evalJs('document.documentElement.scrollWidth > innerWidth');
    await shot(`${out}/${name}-${width}.png`, { x: 0, y: 0, width, height: Math.min(h, 2400) });
    console.log(name, 'height', h, sx ? 'SIDEWAYS SCROLL' : '');
  };
  await wait(3500);
  if (await evalJs("!!document.querySelector('[data-access]')")) {
    await full('access');
    await evalJs(`(()=>{const f=document.querySelector('[data-access]'); f.code.value=${JSON.stringify(CODE)}; f.requestSubmit();})()`); await wait(3500);
  }
  await evalJs("fetch('/api/session',{method:'DELETE'}).then(()=>location.reload())"); await wait(3500);
  await full('login');
  for (const u of ['alex', 'jamie', 'drlee', 'chris']) {
    await evalJs(`fetch('/api/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId:'${u}'})}).then(()=>location.reload())`);
    await wait(3500);
    await full(u);
  }
  await evalJs("localStorage.setItem('zn_lang','es'); location.reload()"); await wait(3500);
  await full('chris-es');
  await evalJs("localStorage.setItem('zn_lang','en')");
  if (logs.length) console.log('console:', logs);
  if (mobile) await send('Emulation.clearDeviceMetricsOverride');
}, mobile ? { width: 800, height: 1000, emulated: true } : { width, height: 1000 });
