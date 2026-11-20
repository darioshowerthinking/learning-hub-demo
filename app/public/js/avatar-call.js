// The live video avatar in a practice visit. The avatar is only the HCP's face, voice and ears: it hears what the
// learner says and speaks the lines Claude writes. It never answers on its own.
// Two providers (the server picks one, AVATAR_PROVIDER):
//  - LiveAvatar by HeyGen: the session has no context, so LiveAvatar's assistant has nothing to say.
//  - Azure AI Speech: a real-time avatar over WebRTC, plus Azure speech recognition for the learner.
// Every connected minute costs money, so the session is stopped on End, when the visit ends and when the page
// changes, and never runs longer than the server allows.
import { api } from './api.js';

const QUIET_MS = 1400;   // after the learner stops talking, wait this long: people pause between sentences

// Starts a session and returns { ready, connected, speaking, say, mute, stop }. Callbacks in `on`:
//  status(key)        'connecting' | 'listening' | 'speaking' | 'lost'
//  learnerStarted()   the learner began to speak (the avatar is interrupted if it was talking)
//  learnerSaid(text)  the learner finished a turn: the recognised words
//  lineStarted()      the avatar began one of the lines given to say() (lines play in order)
//  interrupted()      the learner cut in: the line being spoken and every queued line are dropped
//  spoke()            the avatar finished everything it was given
//  lost(reason)       the session ended without us asking (time limit, network, idle)
export function startAvatar({ video, lang, minutes, on = {} }) {
  let engine = null, stopped = false, ourStop = false, speaking = false, queued = 0, words = [], quiet = null, cap = null;
  const call = (k, ...a) => { try { on[k]?.(...a); } catch (e) { console.error(e); } };

  const flush = () => {
    quiet = null;
    const text = words.join(' ').replace(/\s+/g, ' ').trim();
    words = [];
    if (text) call('learnerSaid', text);
  };

  // What both providers report, in the same terms.
  const core = {
    learnerStarted() {
      if (quiet) { clearTimeout(quiet); quiet = null; }
      if (speaking) { engine?.interrupt(); queued = 0; speaking = false; call('interrupted'); }
      call('learnerStarted');
    },
    learnerWords(text) {
      if (text) words.push(text);
      if (quiet) { clearTimeout(quiet); quiet = setTimeout(flush, QUIET_MS); }
    },
    learnerEnded() { if (quiet) clearTimeout(quiet); quiet = setTimeout(flush, QUIET_MS); },
    lineStarted() { if (!queued) return; speaking = true; call('status', 'speaking'); call('lineStarted'); },
    lineEnded() {
      if (!queued) return;   // the end of an interrupted line
      if (--queued > 0) return;
      speaking = false; call('status', 'listening'); call('spoke');
    },
    lost(reason) {
      if (ourStop || stopped) return;
      stopped = true; clearTimeout(cap);
      const e = engine; engine = null; e?.stop();
      call('status', 'lost'); call('lost', reason);
    },
  };

  const ready = (async () => {
    call('status', 'connecting');
    const s = await api('/api/avatar/session', { method: 'POST', body: { lang, minutes } });
    if (stopped) return;
    const e = await (s.provider === 'azure' ? azureEngine : liveAvatarEngine)(s, video, core);
    if (stopped) { await e.stop(); return; }
    engine = e;
    if (s.maxSeconds) cap = setTimeout(() => core.lost('time'), s.maxSeconds * 1000);
    call('status', 'listening');
  })();

  const stop = async () => {
    if (stopped && !engine) return;
    stopped = true; ourStop = true;
    clearTimeout(quiet); clearTimeout(cap);
    window.removeEventListener('hashchange', stop);
    window.removeEventListener('pagehide', stop);
    const e = engine; engine = null;
    if (e) await e.stop();
  };
  // Leaving the visit (another page, closing the tab) ends the session so it stops costing money.
  window.addEventListener('hashchange', stop);
  window.addEventListener('pagehide', stop);

  return {
    ready,
    get connected() { return !!engine && !stopped; },
    get speaking() { return speaking; },
    // Lines are queued and spoken in order, so a reply can be sent sentence by sentence as Claude writes it.
    say(text) { if (engine && !stopped && text) { queued++; speaking = true; engine.speak(text); return true; } return false; },
    mute(muted) { engine?.mute(muted); },
    stop,
  };
}

// --- LiveAvatar (HeyGen). SDK: @heygen/liveavatar-web-sdk 0.0.20, bundled with esbuild ---
async function liveAvatarEngine(s, video, core) {
  const { LiveAvatarSession } = await import('/vendor/liveavatar-sdk.js');
  const session = new LiveAvatarSession(s.token, { voiceChat: {}, autoKeepAlive: true });
  session.on('session.stream_ready', () => {
    session.attach(video);
    video.play?.().catch(() => {});   // the visit was started with a click, so sound is allowed
  });
  session.on('session.disconnected', reason => core.lost(reason));
  session.on('user.speak_started', () => core.learnerStarted());
  session.on('user.transcription', ev => core.learnerWords(ev?.text));
  session.on('user.speak_ended', () => core.learnerEnded());
  session.on('avatar.speak_started', () => core.lineStarted());
  session.on('avatar.speak_ended', () => core.lineEnded());
  await session.start();
  try { session.startListening(); } catch {}
  return {
    speak: text => session.repeat(text),   // LiveAvatar queues lines itself
    // interrupt() drops the current line and the whole queue (tested in sandbox).
    interrupt: () => { try { session.interrupt(); } catch {} },
    mute: m => (m ? session.voiceChat.mute() : session.voiceChat.unmute()),
    stop: () => session.stop().catch(() => {}),
  };
}

// --- Azure AI Speech real-time avatar. SDK: microsoft-cognitiveservices-speech-sdk 1.53.0 (browser bundle) ---
function loadScript(src) {
  return new Promise((res, rej) => {
    const el = Object.assign(document.createElement('script'), { src, onload: res, onerror: () => rej(new Error(`Could not load ${src}`)) });
    document.head.append(el);
  });
}

async function azureEngine(s, video, core) {
  if (!window.SpeechSDK) await loadScript('/vendor/speech-sdk.js');
  const SDK = window.SpeechSDK;
  const speechConfig = SDK.SpeechConfig.fromAuthorizationToken(s.token, s.region);
  speechConfig.speechSynthesisVoiceName = s.voice;
  speechConfig.speechRecognitionLanguage = s.sttLang;

  // The avatar's video and voice arrive over WebRTC, through Microsoft's TURN relay.
  const pc = new RTCPeerConnection({ iceServers: [{ urls: s.ice.urls, username: s.ice.username, credential: s.ice.credential }] });
  const stream = new MediaStream();
  pc.ontrack = ev => {
    stream.addTrack(ev.track);
    if (video.srcObject !== stream) video.srcObject = stream;
    video.play?.().catch(() => {});
  };
  pc.addTransceiver('video', { direction: 'sendrecv' });
  pc.addTransceiver('audio', { direction: 'sendrecv' });
  let up = false;
  pc.oniceconnectionstatechange = () => { if (up && ['failed', 'closed'].includes(pc.iceConnectionState)) core.lost(pc.iceConnectionState); };

  // Photo avatars (head and shoulders) are square: asking for the default 16:9 video stretches them sideways.
  // The full-length stock avatars come in 16:9 and are framed from the waist up.
  const format = s.photoModel ? new SDK.AvatarVideoFormat('H264', 2000000, 1080, 1080) : new SDK.AvatarVideoFormat();
  const avatarConfig = new SDK.AvatarConfig(s.character, s.style, format);
  if (s.photoModel) avatarConfig.photoAvatarBaseModel = s.photoModel;
  if (s.background) avatarConfig.backgroundColor = s.background;
  video.classList.add(s.photoModel ? 'lh-av__video--photo' : 'lh-av__video--framed');
  // The resource allows few avatar sessions at once, and a closed one takes a few seconds to be released, so a
  // visit started right after another can be refused for a moment ("throttled", 4429): try again.
  let synth;
  for (let attempt = 1; ; attempt++) {
    synth = new SDK.AvatarSynthesizer(speechConfig, avatarConfig);
    const started = await synth.startAvatarAsync(pc);
    if (started.reason === SDK.ResultReason.SynthesizingAudioCompleted) break;
    const why = SDK.CancellationDetails.fromResult(started)?.errorDetails || 'the avatar did not start';
    try { await synth.close(); } catch {}
    if (attempt < 4 && /4429|throttl/i.test(why)) { await new Promise(r => setTimeout(r, 6000)); continue; }
    pc.close();
    throw new Error(/4429|throttl/i.test(why) ? 'another avatar session is still open' : why);
  }
  up = true;

  // The learner's microphone: Azure speech recognition, phrase by phrase.
  const audioConfig = SDK.AudioConfig.fromDefaultMicrophoneInput();
  try { audioConfig.setProperty('MICROPHONE-WorkletSourceUrl', '/vendor/speech-processor.js'); } catch {}
  const rec = new SDK.SpeechRecognizer(speechConfig, audioConfig);
  let talking = false;
  rec.recognizing = (_, e) => { if (!talking && (e.result.text || '').trim().length > 2) { talking = true; core.learnerStarted(); } };
  rec.recognized = (_, e) => {
    talking = false;
    if (e.result.reason === SDK.ResultReason.RecognizedSpeech && e.result.text) { core.learnerWords(e.result.text); core.learnerEnded(); }
  };
  const listen = () => new Promise((res, rej) => rec.startContinuousRecognitionAsync(res, err => rej(new Error(String(err)))));
  try { await listen(); } catch (err) { rec.close(); synth.close(); pc.close(); throw err; }

  // Tokens last 10 minutes.
  const renew = setInterval(() => {
    api('/api/avatar/token', { method: 'POST' }).then(({ token }) => {
      rec.authorizationToken = token;
      try { synth.authorizationToken = token; } catch {}
    }).catch(() => {});
  }, 8 * 60 * 1000);

  // One line at a time; each starts when the previous one is finished.
  const lines = [];
  let busy = false, round = 0;
  const next = () => {
    if (busy || !lines.length) return;
    busy = true;
    const text = lines.shift(), mine = round;
    core.lineStarted();
    synth.speakTextAsync(text).catch(() => {}).finally(() => {
      busy = false;
      if (mine === round) core.lineEnded();   // not after an interrupt: that line no longer counts
      next();
    });
  };
  let closed = false;
  return {
    speak: text => { lines.push(text); next(); },
    interrupt: () => { round++; lines.length = 0; synth.stopSpeakingAsync().catch(() => {}); },
    mute: m => (m ? rec.stopContinuousRecognitionAsync() : rec.startContinuousRecognitionAsync()),
    stop: async () => {
      if (closed) return;
      closed = true; clearInterval(renew);
      await new Promise(res => rec.stopContinuousRecognitionAsync(res, res));
      try { rec.close(); } catch {}
      try { await synth.close(); } catch {}
      pc.close();
    },
  };
}
