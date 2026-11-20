// Learner: a section's final challenge. Briefing -> timed visit with the AI HCP (streamed) -> feedback.
// The scenario comes from the module (set by the content creator); the learner does not choose it.
import { api } from '../api.js';
import { t, L, getLang } from '../i18n.js';
import { esc, meter, chip, errorBox, objectionOf } from '../ui.js';
import { sectionState } from '../progress.js';
import { startAvatar } from '../avatar-call.js';

const PILLARS = ['product', 'messaging', 'objections'];
const RED_LINES = ['risk', 'overstate', 'offlabel'];
const initials = name => name.replace(/^Dr\.\s*/, '').split(' ').map(w => w[0]).join('').slice(0, 2);
const mmss = s => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, '0')}`;

export async function renderPractice(el, user, moduleId, sectionId) {
  const [meta, mod, progress] = await Promise.all([api('/api/meta'), api(`/api/modules/${moduleId}`), api('/api/progress')]);
  const section = mod.sections.find(s => s.id === sectionId);
  const st = sectionState(section, progress[mod.id] || {});
  if (!st.unlocked) { location.hash = `#/module/${mod.id}`; return; }
  const ctx = {
    el, mod, section, boss: section.boss, meta,
    persona: meta.personas.find(p => p.id === section.boss.persona),
    objection: objectionOf(meta, section.boss),
    previous: st.attempts.at(-1) || null,
  };
  renderBriefing(ctx);
}

const redLinesHtml = () => `<div class="lh-redlines">${RED_LINES.map(k => `
  <div class="lh-redline"><strong>${esc(t(`redline_${k}`))}</strong><p>${esc(t(`redline_${k}_desc`))}</p></div>`).join('')}</div>`;

// --- 1. Briefing --------------------------------------------------------------
function renderBriefing(ctx) {
  const { el, mod, section, boss, persona } = ctx;
  el.innerHTML = `
    <a class="zn-back" href="#/module/${esc(mod.id)}"><span aria-hidden="true">←</span> ${esc(t('backToModule'))}</a>
    <header class="lh-hero">
      <p class="lh-kicker">${esc(L(section.title))} · ${esc(t('finalChallenge'))}</p>
      <h1 class="lh-hero__title">${esc(persona.name)}</h1>
    </header>
    <div class="lh-split">
      <section class="zn-card lh-card">
        <div class="lh-row">
          <span class="lh-avatar lh-avatar--xl lh-avatar--hcp">${esc(initials(persona.name))}</span>
          <div>
            <strong>${esc(persona.name)} · ${esc(L(persona.role))}</strong>
            <div class="lh-teams" style="margin-top:6px">${chip('draft', t(`trait_${persona.receptiveness}`))}${chip('draft', t(`trait_${persona.openness}`))}${chip('draft', t(`trait_${persona.difficulty}`))}</div>
          </div>
        </div>
        <h2 class="lh-subtitle">${esc(t('briefing'))}</h2>
        <p>${esc(L(boss.brief))}</p>
        <p class="lh-card__meta">${esc(t('visitMinutes', { n: boss.minutes }))} · ${esc(t('toBeat', { n: 70 }))}</p>
        ${boss.mode === 'avatar' ? `<p class="lh-card__meta lh-pr__avatar">${esc(t(ctx.meta.avatar?.enabled ? 'practiceAvatarLearner' : 'practiceAvatarOff'))}</p>` : ''}
        ${boss.criteria?.length ? `<h2 class="lh-subtitle">${esc(t('practiceCriteria'))}</h2><ul class="lh-ol-points">${boss.criteria.map(c => `<li>${esc(L(c))}</li>`).join('')}</ul>` : ''}
        <div class="lh-row"><button type="button" class="zn-button" data-start>${esc(t('startVisit'))}</button></div>
      </section>
      <aside class="zn-card lh-card">
        <h2 class="lh-card__title">${esc(t('redLinesTitle'))}</h2>
        ${redLinesHtml()}
      </aside>
    </div>`;
  el.querySelector('[data-start]').onclick = () => renderCall(ctx);
}

// --- 2. The visit ---------------------------------------------------------------
// Typed chat, or (final challenge set to "Avatar conversation" and the server has LiveAvatar) a video call:
// the learner speaks, the avatar transcribes it, Claude writes the HCP's reply and the avatar says it.
function renderCall(ctx) {
  const { el, mod, section, boss, persona } = ctx;
  const avatarOn = boss.mode === 'avatar' && !!ctx.meta.avatar?.enabled;
  const turns = [];
  const lang = getLang();
  const started = Date.now();
  const elapsed = () => Math.round((Date.now() - started) / 1000);
  let av = null;   // the avatar session while it is connected
  let avReady = false;   // the avatar is on screen and can be given lines
  let voiceNow = null;   // the HCP reply being spoken (see speaker())
  const body = () => ({ moduleId: mod.id, sectionId: section.id, lang, turns, elapsedSec: elapsed(), ...(avatarOn ? { voice: true } : {}) });
  let ended = false, busy = false;
  const pending = [];   // what the learner said while the HCP was still answering

  const compose = `
      <form class="lh-compose" data-compose>
        <label class="zn-visually-hidden" for="reply">${esc(t('yourReply'))}</label>
        <textarea id="reply" rows="${avatarOn ? 2 : 3}" maxlength="1200" placeholder="${esc(t(avatarOn ? 'avTypePh' : 'replyPlaceholder'))}" disabled></textarea>
        <div class="lh-row">
          <button type="button" class="zn-button zn-button--ghost" data-end disabled>${esc(t('endCall'))}</button>
          <span class="lh-spacer"></span>
          <button type="submit" class="zn-button" data-send disabled>${esc(t('send'))}</button>
        </div>
      </form>`;
  el.innerHTML = `
    <div class="lh-call ${avatarOn ? 'lh-call--avatar' : ''}">
      <header class="lh-call__head">
        <span class="lh-avatar lh-avatar--lg lh-avatar--hcp">${esc(initials(persona.name))}</span>
        <div>
          <h1 class="lh-card__title">${esc(persona.name)}</h1>
          <p class="lh-card__meta">${esc(L(persona.role))} · ${esc(t('finalChallenge'))}</p>
        </div>
        <span class="lh-spacer"></span>
        <span class="lh-clock" data-clock role="timer" aria-live="off"></span>
      </header>
      <p class="lh-call__note">${esc(t('simulationNote'))}</p>
      ${avatarOn ? `<div class="lh-av">
        <div class="lh-av__stage">
          <video class="lh-av__video" data-av-video playsinline autoplay></video>
          <div class="lh-av__overlay" data-av-overlay><span class="lh-spinner" aria-hidden="true"></span><p>${esc(t('avConnecting'))}</p></div>
          <button type="button" class="zn-button zn-button--small lh-av__sound" data-av-sound hidden>${esc(t('avSoundOn'))}</button>
          <div class="lh-av__bar">
            <span class="lh-av__status" data-av-status aria-live="polite">${esc(t('avConnecting'))}</span>
            <span class="lh-spacer"></span>
            <button type="button" class="lh-av__mic" data-av-mic aria-pressed="false" disabled>${esc(t('avMute'))}</button>
          </div>
        </div>
        <div class="lh-av__side">
          <p class="lh-card__meta">${esc(t('avNote'))}${ctx.meta.avatar.sandbox ? ` ${esc(t('avSandbox'))}` : ''}</p>
          <div class="lh-chat" data-chat aria-live="polite"></div>
          ${compose}
        </div>
      </div>` : `<div class="lh-chat" data-chat aria-live="polite"></div>${compose}`}
    </div>`;

  const chat = el.querySelector('[data-chat]');
  const input = el.querySelector('#reply');
  const sendBtn = el.querySelector('[data-send]');
  const endBtn = el.querySelector('[data-end]');
  const clock = el.querySelector('[data-clock]');
  const tick = () => {
    const left = boss.minutes * 60 - elapsed();
    clock.textContent = t('timeLeft', { t: mmss(Math.max(0, left)) });
    clock.classList.toggle('lh-clock--low', left <= 60);
  };
  tick();
  const timer = setInterval(() => { if (!el.isConnected) return clearInterval(timer); tick(); }, 1000);

  const setBusy = on => {
    busy = on;
    input.disabled = sendBtn.disabled = on || ended;
    endBtn.disabled = on || !turns.some(x => x.who === 'rep');
    if (!on && !ended && !avatarOn) input.focus();
  };
  const bubble = (who, text) => {
    const div = document.createElement('div');
    div.className = `lh-msg lh-msg--${who}`;
    div.innerHTML = who === 'hcp' ? `<span class="lh-avatar lh-avatar--hcp">${esc(initials(persona.name))}</span><p></p>` : `<p></p>`;
    div.querySelector('p').textContent = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
    if (!avatarOn) div.scrollIntoView({ block: 'end', behavior: 'smooth' });
    return div.querySelector('p');
  };

  // --- The video avatar ---
  const status = avatarOn ? el.querySelector('[data-av-status]') : null;
  const setStatus = (key, vars = { name: persona.name }) => { if (status) status.textContent = t(key, vars); };
  if (avatarOn) {
    const video = el.querySelector('[data-av-video]');
    const overlay = el.querySelector('[data-av-overlay]');
    const mic = el.querySelector('[data-av-mic]');
    const sound = el.querySelector('[data-av-sound]');
    video.play().catch(() => {});   // inside the "Start" click: lets the avatar's voice play later
    const fallBack = msg => {
      av = null;
      overlay.hidden = false;
      overlay.innerHTML = `<p>${esc(msg)}</p>`;
      mic.disabled = true;
      setStatus('avMuted');
      status.textContent = '';
      if (!busy && !ended) { input.disabled = sendBtn.disabled = false; input.focus(); }
    };
    av = startAvatar({
      video, lang, minutes: boss.minutes,
      on: {
        status: key => {
          if (key === 'listening' && !busy) setStatus(mic.getAttribute('aria-pressed') === 'true' ? 'avMuted' : 'avListening');
          if (key === 'speaking') setStatus('avSpeaking');
        },
        learnerSaid: text => {
          if (ended) return;
          if (busy) pending.push(text); else repSays(text);
        },
        lineStarted: () => voiceNow?.started(),
        interrupted: () => voiceNow?.showAll(),
        lost: () => { voiceNow?.showAll(); if (!ended) fallBack(t('avLost')); },
      },
    });
    av.ready.then(() => {
      if (!av) return;
      avReady = true;
      overlay.hidden = true;
      mic.disabled = false;
      video.play().catch(() => { sound.hidden = false; });
      if (busy) setStatus('avThinking');
    }).catch(err => {
      const why = /permission|notallowed|denied/i.test(`${err?.name} ${err?.message}`) ? t('avMicDenied') : (err?.message || 'error');
      fallBack(t('avFailed', { why }));
    });
    sound.addEventListener('click', () => { video.muted = false; video.play().then(() => { sound.hidden = true; }).catch(() => {}); });
    mic.addEventListener('click', () => {
      const muted = mic.getAttribute('aria-pressed') !== 'true';
      av?.mute(muted);
      mic.setAttribute('aria-pressed', String(muted));
      mic.textContent = t(muted ? 'avUnmute' : 'avMute');
      setStatus(muted ? 'avMuted' : 'avListening');
    });
  }
  const endAvatar = () => { const a = av; av = null; return a ? a.stop() : Promise.resolve(); };

  // A spoken reply. Waiting for Claude's whole reply before the avatar starts made her voice lag far behind the
  // chat. So each sentence goes to the avatar as soon as Claude has written it (LiveAvatar plays them in order),
  // and appears in the chat when she starts saying it, like captions.
  const NOT_AN_END = /^(dr|dra|mr|mrs|ms|sr|sra|srta|st|vs|etc|approx|aprox)$/i;
  function speaker(p) {
    let sent = 0, shown = '', safety = null;
    const lines = [];   // given to the avatar, not started yet
    const show = line => { shown += (shown ? ' ' : '') + line; p.textContent = shown; chat.scrollTop = chat.scrollHeight; };
    const showAll = () => { while (lines.length) show(lines.shift()); };
    const hand = line => { line = line.trim(); if (!line) return; if (av?.say(line)) lines.push(line); else show(line); };
    return {
      // Sends every finished sentence; very short ones wait to be joined with the next.
      feed(text) {
        if (!av || !avReady) return;   // still connecting: the whole reply goes when the avatar is there
        const rest = text.slice(sent);
        const ends = /[.!?…]+["”»')]*\s+/g;
        let cut = 0, m;
        while ((m = ends.exec(rest))) {
          if (NOT_AN_END.test(rest.slice(0, m.index).split(/\s+/).pop().replace(/[.!?…]+$/, ''))) continue;
          const end = m.index + m[0].length;
          if (end - cut < 25) continue;
          hand(rest.slice(cut, end)); cut = end;
        }
        sent += cut;
      },
      async finish(text) {
        if (av) await av.ready.catch(() => {});
        hand(text.slice(sent)); sent = text.length;
        if (!av) showAll();
        // If the avatar never reports a line starting, the text still appears.
        safety = setTimeout(showAll, 12000);
      },
      started() { if (lines.length) show(lines.shift()); if (!lines.length) clearTimeout(safety); },
      showAll,
    };
  }

  async function hcpSpeaks() {
    setBusy(true);
    setStatus('avThinking');
    const p = bubble('hcp', '');
    p.innerHTML = `<span class="lh-typing">${esc(t('hcpTyping', { name: persona.name }))}</span>`;
    let text = '';
    const voice = av ? (voiceNow = speaker(p)) : null;
    try {
      const res = await fetch('/api/roleplay/turn', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body()) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (!line.trim()) continue;
          const msg = JSON.parse(line);
          if (msg.error) throw new Error(msg.error);
          if (msg.text && voice) { text += msg.text; voice.feed(text); }
          else if (msg.text) { text += msg.text; p.textContent = text; chat.scrollTop = chat.scrollHeight; if (!avatarOn) p.parentElement.scrollIntoView({ block: 'end' }); }
          if (msg.done && msg.ended) ended = true;
        }
      }
      turns.push({ who: 'hcp', text: text.trim() });
      // The rest of the reply (all of it for the first line, written while the avatar connects).
      if (voice) await voice.finish(text);
    } catch (err) {
      p.parentElement.remove();
      chat.insertAdjacentHTML('beforeend', errorBox(err));
    } finally {
      setBusy(false);
      if (ended) visitOver();
      else if (pending.length) repSays(pending.splice(0).join(' '));
      else if (av?.connected && !av.speaking) setStatus('avListening');
    }
  }

  function repSays(text) {
    turns.push({ who: 'rep', text });
    bubble('rep', text);
    hcpSpeaks();
  }

  function visitOver() {
    clearInterval(timer);
    clock.textContent = t('visitEnded', { name: persona.name });
    input.disabled = sendBtn.disabled = true;
    endBtn.textContent = t('getFeedback');
    endBtn.classList.remove('zn-button--ghost');
    endBtn.disabled = false;
    endBtn.focus();
    // Let the avatar finish its last line, then hang up (it stops using credits).
    if (av) { setStatus('avSpeaking'); setTimeout(endAvatar, 1000 * Math.min(25, 4 + (turns.at(-1)?.text.length || 0) / 12)); }
  }

  el.querySelector('[data-compose]').addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || sendBtn.disabled) return;
    input.value = '';
    repSays(text);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.querySelector('[data-compose]').requestSubmit(); }
  });
  endBtn.addEventListener('click', () => { clearInterval(timer); endAvatar(); renderFeedback(ctx, body()); });

  hcpSpeaks();
}

// --- 3. Feedback ------------------------------------------------------------------
async function renderFeedback(ctx, payload) {
  const { el, mod, section, previous } = ctx;
  el.innerHTML = `<div class="zn-card lh-card lh-waiting"><span class="lh-spinner" aria-hidden="true"></span><p>${esc(t('coachReviewing'))}</p></div>`;
  let fb;
  try {
    fb = await api('/api/roleplay/feedback', { method: 'POST', body: payload });
  } catch (err) {
    el.innerHTML = errorBox(err) + `<button class="zn-button" data-retry>${esc(t('tryAgain'))}</button>`;
    el.querySelector('[data-retry]').onclick = () => renderBriefing(ctx);
    return;
  }
  const delta = k => {
    if (!previous) return '';
    const d = fb.scores[k] - previous.scores[k];
    return `<span class="lh-delta ${d >= 0 ? 'lh-delta--up' : 'lh-delta--down'}">${esc(t('vsLast', { d: (d > 0 ? '+' : '') + d }))}</span>`;
  };
  const item = (x, withTry) => `<li class="lh-fb-item">
      ${chip('pending', t(`pillar_${x.pillar}`))}
      <p>${esc(x.text)}</p>
      ${x.quote ? `<blockquote><span class="lh-kicker">${esc(t('youSaid'))}</span>“${esc(x.quote)}”</blockquote>` : ''}
      ${withTry && x.try_saying ? `<div class="lh-try"><span class="lh-kicker">${esc(t('trySaying'))}</span><p>${esc(x.try_saying)}</p></div>` : ''}
    </li>`;

  el.innerHTML = `
    <a class="zn-back" href="#/module/${esc(mod.id)}"><span aria-hidden="true">←</span> ${esc(t('backToModule'))}</a>
    <div class="lh-verdict lh-verdict--${fb.passed ? 'pass' : 'fail'}">
      <p class="lh-kicker">${esc(L(section.title))} · ${esc(t('finalChallenge'))}</p>
      <h1 class="lh-hero__title">${esc(t(fb.passed ? 'challengeBeaten' : 'challengeNotYet'))}</h1>
      <p>${esc(fb.summary)}</p>
    </div>
    <section class="zn-card lh-card">
      ${PILLARS.map(k => `<div class="lh-score">${meter(t(`pillar_${k}`), fb.scores[k])}${delta(k)}</div>`).join('')}
      <p class="lh-card__meta">${esc(t('toBeat', { n: fb.pass_mark }))}</p>
    </section>
    ${fb.red_lines.length ? `<section class="zn-card lh-card lh-compliance lh-compliance--flags">
      <h2 class="lh-card__title">${esc(t('redLinesCrossed'))} · ${fb.red_lines.length}</h2>
      <ul class="lh-fb">${fb.red_lines.map(r => `<li class="lh-fb-item">
        ${chip('changes_requested', t(`redline_${r.line}`))}
        <blockquote><span class="lh-kicker">${esc(t('youSaid'))}</span>“${esc(r.quote)}”</blockquote>
        <p><strong>${esc(t('whyItMatters'))}:</strong> ${esc(r.why)}</p>
        <div class="lh-try"><span class="lh-kicker">${esc(t('correctVersion'))}</span><p>${esc(r.correct_version)}</p></div>
      </li>`).join('')}</ul>
    </section>` : ''}
    <div class="lh-split lh-split--even">
      <section class="zn-card lh-card"><h2 class="lh-card__title">${esc(t('strengths'))}</h2><ul class="lh-fb">${fb.strengths.map(x => item(x, false)).join('')}</ul></section>
      <section class="zn-card lh-card"><h2 class="lh-card__title">${esc(t('improvements'))}</h2><ul class="lh-fb">${fb.improvements.map(x => item(x, true)).join('')}</ul></section>
    </div>
    <section class="zn-card lh-card lh-next">
      <div class="lh-row">${chip(fb.fair_balance.ok ? 'approved' : 'changes_requested', t('fairBalance'))}</div>
      <p class="lh-card__meta">${esc(fb.fair_balance.note)}</p>
      <h2 class="lh-card__title">${esc(t('nextStepTitle'))}</h2>
      <p>${esc(fb.next_step)}</p>
      <div class="lh-row">
        ${fb.passed ? `<a class="zn-button" href="#/module/${esc(mod.id)}">${esc(t('continueBtn'))}</a>` : ''}
        <button type="button" class="zn-button ${fb.passed ? 'zn-button--ghost' : ''}" data-again>${esc(t('tryAgain'))}</button>
      </div>
    </section>`;
  ctx.previous = { scores: fb.scores };
  el.querySelector('[data-again]').onclick = () => renderBriefing(ctx);
  window.scrollTo({ top: 0 });
}
