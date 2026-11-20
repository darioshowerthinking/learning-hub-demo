// Screenshot of every illustration and chart in public/js/visuals.js, injected into the running app.
// Usage: node tools/gallery.mjs <outDir> [en|es]
import { withPage } from './cdp.mjs';
const [out = '.', lang = 'en'] = process.argv.slice(2);
await withPage(process.env.HUB_URL || 'http://localhost:8080/', async ({ evalJs, shot, logs }) => {
  await evalJs(`localStorage.setItem('zn_lang','${lang}')`);
  await evalJs('location.reload()'); await new Promise(r => setTimeout(r, 1500));
  await evalJs(`import('/js/visuals.js').then(v => {
    const el = document.getElementById('view');
    el.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' +
      v.VISUAL_IDS.map(id => '<div><b>' + id + '</b>' + v.renderVisual(id, 'Caption for ' + id) + '</div>').join('') +
      v.CHART_IDS.map(id => '<div><b>chart: ' + id + '</b>' + v.renderChart(id, 'Caption for ' + id) + '</div>').join('') + '</div>';
  })`);
  await new Promise(r => setTimeout(r, 800));
  const h = await evalJs('document.documentElement.scrollHeight');
  await shot(`${out}/gallery-${lang}.png`, { x: 0, y: 0, width: 1440, height: Math.min(h, 5000) });
  if (logs.length) console.log('console:', logs);
}, { width: 1440, height: 1000 });
