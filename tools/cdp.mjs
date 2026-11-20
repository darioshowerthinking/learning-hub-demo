// Minimal CDP driver over Node's global WebSocket.
// Used for visual checks and browser tests. No framework, no puppeteer.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;

// `emulated: true` says the caller sets its own Emulation.setDeviceMetricsOverride
// inside fn, so the raw window size is not what it will measure at and must
// not be checked. Only test-type-scale does that.
// extraArgs: more Chrome flags, e.g. a fake microphone for the avatar tests
// ('--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=x.wav').
export async function withPage(url, fn, { width = 1500, height = 1100, emulated = false, extraArgs = [] } = {}) {
  const proc = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`,
    `--window-size=${width},${height}`, '--hide-scrollbars',
    '--no-first-run', '--no-default-browser-check',
    '--user-data-dir=/tmp/zn-cdp-profile',
    ...extraArgs,
  ], { stdio: 'ignore' });

  let target;
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      target = list.find((t) => t.type === 'page');
      if (target) break;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 150));
  }
  if (!target) { proc.kill('SIGKILL'); throw new Error('Chrome did not start'); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  const logs = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      logs.push(msg.params.type + ': ' + msg.params.args.map((a) => a.value ?? a.description).join(' '));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      logs.push('EXCEPTION: ' + (msg.params.exceptionDetails.exception?.description
        || msg.params.exceptionDetails.text));
    }
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const n = ++id;
    pending.set(n, { res, rej });
    ws.send(JSON.stringify({ id: n, method, params }));
  });

  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', {
      expression: expr, returnByValue: true, awaitPromise: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval threw');
    return r.result.value;
  };
  const shot = async (path, clip) => {
    // captureBeyondViewport makes the clip PAGE coordinates rather than
    // viewport ones. Without it, a clip below the fold captures blank page
    // background and looks like a rendering failure rather than a bad clip.
    const r = await send('Page.captureScreenshot',
      clip ? { clip: { ...clip, scale: 1 }, captureBeyondViewport: true } : {});
    writeFileSync(path, Buffer.from(r.data, 'base64'));
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');
  await send('Network.enable');
  // Google Fonts is unreachable from here, and a PENDING stylesheet blocks
  // execution of every script after it - the page parses, document.scripts
  // lists them all, and not one of them has run. Block the font hosts so the
  // stylesheet fails fast instead of hanging.
  await send('Network.setBlockedURLs', {
    urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'],
  });
  // The profile directory is reused between runs, so a regenerated mock can be
  // served from cache and the test then measures the PREVIOUS build. That
  // happened once and read as a sorting bug.
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Page.navigate', { url });

  for (let i = 0; i < 120; i++) {
    const r = await send('Runtime.evaluate', {
      expression: 'document.readyState', returnByValue: true,
    });
    if (r.result.value === 'complete') break;
    await new Promise((r2) => setTimeout(r2, 100));
  }
  await new Promise((r) => setTimeout(r, 400));

  /* CLEAR ANY INHERITED EMULATION FIRST, and this is the actual root cause.
     Emulation.setDeviceMetricsOverride is set on the BROWSER, not on our
     session, so test-type-scale's 390x844 override outlived its own run and
     was still in force when the next suite attached to the same profile.
     That is how the map came to measure its dots at 2px. Cleared
     unconditionally, so a leak from any previous run cannot reach the check
     below - or the suite. */
  try { await send('Emulation.clearDeviceMetricsOverride'); } catch (e) { /* none set */ }

  /* ⚠ IS THIS ACTUALLY THE WINDOW WE ASKED FOR?
     --window-size is a REQUEST, and it is ignored when Chrome attaches to an
     existing instance holding the same --user-data-dir. A leaked process from
     an earlier run therefore hands the next suite whatever window IT had.
     Found 2026-09-11: a stray instance left the profile at 390x844, the map
     card rendered 290px wide, every dot measured 2px, and test-map reported
     three real-looking failures about dots being unclickable. Nothing was
     wrong with the page.
     Checked rather than trusted, because the symptom looks like a bug in the
     thing under test and not like a broken harness. */
  const vw = await send('Runtime.evaluate', {
    expression: 'JSON.stringify([innerWidth, innerHeight])', returnByValue: true,
  });
  const [gotW, gotH] = JSON.parse(vw.result.value);
  if (!emulated && Math.abs(gotW - width) > 40) {
    ws.close(); proc.kill('SIGKILL');
    throw new Error(
      `Viewport is ${gotW}x${gotH}, not ${width}x${height}. Chrome attached to ` +
      `an EXISTING instance holding --user-data-dir=/tmp/zn-cdp-profile, ` +
      `so the window size was inherited rather than set. Every measurement in ` +
      `this suite would be wrong.\n` +
      `  Fix:  pkill -f zn-cdp-profile && rm -rf /tmp/zn-cdp-profile`);
  }

  try {
    return await fn({ evalJs, shot, logs, send });
  } finally {
    ws.close();
    proc.kill('SIGKILL');
  }
}
