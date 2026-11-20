// Zenetic Learning Hub: the Express app (web UI + API). Started locally by server/index.js;
// on Vercel, ../server.js exports it and the static UI is served from public/ by the CDN.

import express from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, update, reset, backendName } from './store.js';
import { USERS, PRODUCT, PERSONAS, OBJECTIONS, TEAMS, PILLARS } from './seed.js';
import { submit, review, settle, goLive, adminRequestChanges, WorkflowError } from './workflow.js';
import { ping, MODELS } from './foundry.js';
import { validate, hcpTurn, feedback, RoleplayError } from './roleplay.js';
import { explainAnswer } from './quiz.js';
import { generateFromOutline, reviseModule, applyRevision, commentsInstruction, translateModule, applyEdits, isEditable, BuilderError } from './builder.js';
import { videoLibrary, library, validateSpec, newProject, applySpec, completeCard, reopenCard, touch, editableProject, syncBosses, syncVideoBlocks, syncPracticeModes, videoLesson, ensureStudio, practiceFromBosses } from './studio.js';
import { outlineTurn, cleanOutline, draftPractice, cleanPractice, writeVideoScript, readMaterial } from './studio-ai.js';
import { cardInfo, activeCards, audienceText, roundComments, creatorComments, openComments, commentCard } from '../public/js/studio-rules.js';
import { randomBytes } from 'node:crypto';
import { PASS } from './seed.js';
import { precheck } from './review.js';
import { avatarConfig, avatarSession, avatarToken } from './avatar.js';
import { uploadTarget, publicUrl, exists, writeLocal, localToken, safePath, remoteStorage, LOCAL_DIR, MAX_VIDEO, VIDEO_TYPES } from './media.js';

const here = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '5mb' }));   // material uploads arrive as base64 (files up to 3 MB)

// --- Demo sign-in: a cookie holding the chosen mock user. Not authentication. ---
function currentUser(req) {
  const m = /(?:^|;\s*)zn_user=([a-z0-9]+)/.exec(req.headers.cookie || '');
  return USERS.find(u => u.id === m?.[1]) || null;
}
function requireUser(req, res, next) {
  req.user = currentUser(req);
  if (!req.user) return res.status(401).json({ error: 'Choose a demo user first.' });
  next();
}
function requireRole(...roles) {
  return (req, res, next) => roles.includes(req.user.role) ? next()
    : res.status(403).json({ error: `This action is for: ${roles.join(', ')}.` });
}
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// --- Demo access code (DEMO_ACCESS_CODE). Keeps a public link from spending AI credits. ---
// Static files stay public; every API call except the code check and the plain health check needs it.
const ACCESS_CODE = process.env.DEMO_ACCESS_CODE || '';
const accessToken = code => createHash('sha256').update(`zenetic-hub:${code}`).digest('hex');
function hasAccess(req) {
  if (!ACCESS_CODE) return true;
  const m = /(?:^|;\s*)zn_access=([a-f0-9]{64})/.exec(req.headers.cookie || '');
  return !!m && timingSafeEqual(Buffer.from(m[1]), Buffer.from(accessToken(ACCESS_CODE)));
}
app.post('/api/access', (req, res) => {
  const code = String(req.body?.code || '').trim();
  const ok = !!ACCESS_CODE && code.length === ACCESS_CODE.length
    && timingSafeEqual(Buffer.from(code), Buffer.from(ACCESS_CODE));
  if (!ok) return res.status(403).json({ error: 'That code is not right.', code: 'access' });
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `zn_access=${accessToken(code)}; Path=/; SameSite=Lax; HttpOnly; Max-Age=1209600${secure}`);
  res.json({ ok: true });
});
app.use('/api', (req, res, next) => {
  if (req.path === '/health' && !req.query.ai) return next();
  if (hasAccess(req)) return next();
  res.status(401).json({ error: 'Enter the demo access code.', code: 'access' });
});

app.get('/api/users', (req, res) => res.json(USERS));
app.get('/api/session', (req, res) => res.json({ user: currentUser(req) }));
app.post('/api/session', (req, res) => {
  const user = USERS.find(u => u.id === req.body?.userId);
  if (!user) return res.status(400).json({ error: 'Unknown user.' });
  res.setHeader('Set-Cookie', `zn_user=${user.id}; Path=/; SameSite=Lax; HttpOnly; Max-Age=86400`);
  res.json({ user });
});
app.delete('/api/session', (req, res) => {
  res.setHeader('Set-Cookie', 'zn_user=; Path=/; SameSite=Lax; HttpOnly; Max-Age=0');
  res.json({ ok: true });
});

// --- Reference data ---
app.get('/api/meta', (req, res) => {
  const { enabled, sandbox, provider } = avatarConfig();
  res.json({ product: PRODUCT, personas: PERSONAS, objections: OBJECTIONS, teams: TEAMS, pillars: PILLARS, avatar: { enabled, sandbox, provider } });
});

// --- Modules ---
// Learners only ever see published modules; everyone else sees the pipeline too.
// Learners never receive the quiz answer key; quizzes are graded on the server.
const forLearner = mod => {
  const { comments, prints, prevPrints, prechecks, ...rest } = mod;
  return { ...rest, sections: mod.sections.map(s => ({ ...s, quiz: s.quiz.map(({ answer, ...q }) => q) })) };
};
// Approvers' comments are shared among approvers and the Training Manager as soon as they are written;
// the creator only sees the ones that were sent.
const forRole = (mod, user) => user.role === 'learner' ? forLearner(mod)
  : user.role === 'creator' ? { ...mod, comments: (mod.comments || []).filter(c => c.sent) } : mod;

app.get('/api/modules', requireUser, wrap(async (req, res) => {
  const { modules } = await load();
  res.json((req.user.role === 'learner' ? modules.filter(m => m.status === 'published') : modules).map(m => forRole(m, req.user)));
}));

app.get('/api/modules/:id', requireUser, wrap(async (req, res) => {
  const mod = (await load()).modules.find(m => m.id === req.params.id);
  if (!mod || (req.user.role === 'learner' && mod.status !== 'published')) return res.status(404).json({ error: 'Module not found.' });
  res.json(forRole(mod, req.user));
}));

app.post('/api/modules/:id/submit', requireUser, requireRole('creator'), wrap(async (req, res) => {
  // Reviewers always get both languages: translate first if the other language is out of date.
  const current = (await load()).modules.find(x => x.id === req.params.id);
  if (current?.studio && ['draft', 'changes_requested'].includes(current.status)) {
    if (openComments(current).length) throw new WorkflowError('Address or answer every reviewer comment before resubmitting.', 409);
    const open = activeCards(current.studio.spec).filter(k => k !== 'preview' && cardInfo(current, k).state !== 'complete');
    if (open.length) throw new WorkflowError(`Complete every studio card before submitting (still open: ${open.join(', ')}).`, 409);
    if (Object.values(current.studio.notes || {}).some(n => n?.trim())) throw new WorkflowError('Apply or clear your preview notes before submitting.', 409);
  }
  if (current?.translation === 'pending' && isEditable(current)) await saveTranslation(current);
  const mod = await update(state => {
    const m = state.modules.find(x => x.id === req.params.id);
    if (!m) throw new WorkflowError('Module not found.', 404);
    if (m.studio && ['draft', 'changes_requested'].includes(m.status)) m.studio.cards.preview = { state: 'complete', at: Date.now() };
    return forRole(submit(m, req.user.id), req.user);
  });
  res.json(mod);
}));

// --- Creator: AI module builder ---
const CONTENT_FIELDS = ['title', 'audience', 'objective', 'sections', 'aiNotes'];

function ndjson(res) {
  res.setHeader('content-type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  return line => res.write(JSON.stringify(line) + '\n');
}
const builderFailure = (err, fallback) => {
  console.error(err);
  return { error: err instanceof BuilderError ? err.message : fallback };
};

// The creator's own preview notes (studio), as an instruction for reviseModule.
function notesInstruction(mod) {
  const lang = mod.sourceLang || 'en';
  const lessons = Object.fromEntries(mod.sections.flatMap(s => s.lessons).map(l => [l.id, l.title?.[lang] || l.title?.en || '']));
  const sections = Object.fromEntries(mod.sections.map(s => [s.id, s.title?.[lang] || s.title?.en || '']));
  const where = k => lessons[k] ? `lesson ${k} ("${lessons[k]}")` : k.startsWith('quiz:') ? `the quiz of section ${k.slice(5)} ("${sections[k.slice(5)]}")` : `the practice session of section ${k.slice(5)} ("${sections[k.slice(5)]}")`;
  const lines = Object.entries(mod.studio?.notes || {}).map(([k, v]) => `- ${where(k)}: ${v}`);
  if (!lines.length) throw new BuilderError('Add at least one note first.');
  return `The content creator previewed the module and wants these changes (stay strictly within the approved material):\n${lines.join('\n')}`;
}

async function editableModule(id) {
  const mod = (await load()).modules.find(m => m.id === id);
  if (!mod) throw new BuilderError('Module not found.', 404);
  if (!isEditable(mod)) throw new BuilderError('This module is locked while it is in review or live.', 409);
  return mod;
}

// Translates a copy (slow call outside the store's write queue), then stores the result.
async function saveTranslation(mod) {
  const translated = await translateModule(structuredClone(mod));
  return update(state => {
    const m = state.modules.find(x => x.id === mod.id);
    if (!m) throw new BuilderError('Module not found.', 404);
    for (const k of CONTENT_FIELDS) m[k] = translated[k];
    m.translation = 'done';
    return m;
  });
}

// --- Creator: Training Module Creation Studio (projects) ---
// A project is a draft module with a `studio` object (the wizard's requirements and one card per need).
const finish = (res, line) => res.end(JSON.stringify(line) + '\n');

// Runs fn on the stored project inside the write queue (fresh copy, still a draft).
const onProject = (id, fn) => update(state => fn(editableProject(state, id), state));

// The card must not be locked (its dependencies are complete).
function requireCard(mod, key) {
  if (!activeCards(mod.studio.spec).includes(key)) throw new BuilderError('This card is not part of this project.');
  const info = cardInfo(mod, key);
  if (info.state === 'locked') throw new BuilderError(`Complete these cards first: ${info.missing.join(', ')}.`, 409);
}

// The library without the full text of uploads (the AI reads it on the server).
const publicMaterial = m => ({ id: m.id, title: m.title, kind: m.kind || 'upload', status: m.status, summary: m.summary || null,
  facts: m.facts || null, fileName: m.fileName || null, uploadedBy: m.uploadedBy || null, at: m.at || null });
app.get('/api/materials', requireUser, wrap(async (req, res) => res.json(library(await load()).map(publicMaterial))));

app.post('/api/projects', requireUser, requireRole('creator'), wrap(async (req, res) => {
  const lang = req.body?.lang === 'es' ? 'es' : 'en';
  const mod = await update(state => {
    const m = newProject(validateSpec(req.body?.spec, state), req.user, lang);
    state.modules.unshift(m);
    return m;
  });
  res.json(mod);
}));

app.put('/api/projects/:id/spec', requireUser, requireRole('creator'), wrap(async (req, res) => {
  res.json(await onProject(req.params.id, (m, state) => {
    applySpec(m, validateSpec(req.body?.spec, state));
    if (m.sections.length) { syncBosses(m); syncVideoBlocks(m); }
    return m;
  }));
}));

app.post('/api/projects/:id/cards/:card', requireUser, requireRole('creator'), wrap(async (req, res) => {
  res.json(await onProject(req.params.id, m => {
    if (req.body?.action === 'reopen') return reopenCard(m, req.params.card);
    completeCard(m, req.params.card, req.user);
    if (m.sections.length && ['practice', 'videos'].includes(req.params.card)) { syncBosses(m); syncVideoBlocks(m); }
    return m;
  }));
}));

// Materials: choose from the library, or upload (text extracted, key facts listed by the AI, personal data refused).
app.put('/api/projects/:id/materials', requireUser, requireRole('creator'), wrap(async (req, res) => {
  res.json(await onProject(req.params.id, (m, state) => {
    const ids = library(state).map(x => x.id);
    const chosen = [...new Set((Array.isArray(req.body?.materials) ? req.body.materials : []).filter(id => ids.includes(id)))];
    m.studio.spec.materials = chosen; m.sources = chosen;
    touch(m, 'materials');
    return m;
  }));
}));

app.post('/api/projects/:id/materials/upload', requireUser, requireRole('creator'), wrap(async (req, res) => {
  const mod = (await load()).modules.find(m => m.id === req.params.id);
  if (!mod?.studio) throw new BuilderError('Project not found.', 404);
  const name = String(req.body?.name || '').slice(0, 200);
  const read = await readMaterial({ name, data: req.body?.data, lang: mod.studio.lang });
  const title = String(req.body?.title || '').trim().slice(0, 200) || read.title;
  const out = await onProject(req.params.id, (m, state) => {
    const material = {
      id: `mat-${Date.now().toString(36)}`, kind: 'upload', status: req.body?.pending ? 'pending' : 'approved',
      title: { [m.studio.lang]: title }, summary: { [m.studio.lang]: read.summary }, facts: read.facts.map(f => ({ [m.studio.lang]: f })),
      body: read.text, fileName: name, uploadedBy: req.user.id, at: Date.now(), project: m.id,
    };
    (state.materials ||= []).push(material);
    m.studio.spec.materials = [...m.studio.spec.materials, material.id]; m.sources = m.studio.spec.materials;
    touch(m, 'materials');
    return { project: m, material: publicMaterial(material) };
  });
  res.json(out);
}));

// Outline: the assistant proposes it, then revises it in a conversation. Streams {kind:'outline', text}, then {done, project}.
app.post('/api/projects/:id/outline', requireUser, requireRole('creator'), wrap(async (req, res) => {
  const state = await load();
  const mod = editableProject(state, req.params.id);
  requireCard(mod, 'outline');
  const message = String(req.body?.message || '').trim().slice(0, 2000);
  if (mod.studio.outline && message.length < 2) throw new BuilderError('Tell the assistant what to change.');
  const send = ndjson(res);
  try {
    const { outline, reply } = await outlineTurn(mod, library(state), message, send);
    const saved = await onProject(mod.id, m => {
      const now = Date.now();
      m.studio.outline = outline;
      if (message) m.studio.chat.push({ who: 'user', text: message, at: now });
      m.studio.chat.push({ who: 'ai', text: reply, at: now });
      m.studio.chat = m.studio.chat.slice(-30);
      if (!m.title || !m.sections.length) m.objective = { [m.studio.lang]: outline.objective || m.studio.spec.goal };
      syncPracticeModes(m);
      touch(m, 'outline');
      return m;
    });
    finish(res, { done: true, project: saved });
  } catch (err) {
    finish(res, builderFailure(err, 'The assistant could not work on the outline. Please try again.'));
  }
}));

app.put('/api/projects/:id/outline', requireUser, requireRole('creator'), wrap(async (req, res) => {
  res.json(await onProject(req.params.id, m => {
    requireCard(m, 'outline');
    const raw = req.body?.outline;
    m.studio.outline = cleanOutline({ ...raw, sections: (raw?.sections || []).map(s => ({ ...s, quiz_focus: s.quizFocus, practice_focus: s.practice?.focus })) }, m);
    syncPracticeModes(m);
    touch(m, 'outline');
    return m;
  }));
}));

// Practice sessions: drafted by the assistant from the outline, then edited by the creator.
app.post('/api/projects/:id/practice/draft', requireUser, requireRole('creator'), wrap(async (req, res) => {
  const state = await load();
  const mod = editableProject(state, req.params.id);
  requireCard(mod, 'practice');
  const sessions = await draftPractice(mod, library(state));
  res.json(await onProject(mod.id, m => {
    m.studio.practice = sessions;
    touch(m, 'practice');
    if (m.sections.length) syncBosses(m);
    return m;
  }));
}));

app.put('/api/projects/:id/practice', requireUser, requireRole('creator'), wrap(async (req, res) => {
  res.json(await onProject(req.params.id, m => {
    requireCard(m, 'practice');
    const sections = m.studio.outline.sections.filter(s => s.practice);
    const raw = Array.isArray(req.body?.sessions) ? req.body.sessions : [];
    m.studio.practice = sections.map(s => raw.find(x => x?.section === s.id)).map((x, i) => x ? cleanPractice(x, sections[i]) : null).filter(Boolean);
    touch(m, 'practice');
    if (m.sections.length) syncBosses(m);
    return m;
  }));
}));

// Videos: the creator describes each one (and where it goes); the assistant writes the script.
app.put('/api/projects/:id/videos', requireUser, requireRole('creator'), wrap(async (req, res) => {
  res.json(await onProject(req.params.id, m => {
    requireCard(m, 'videos');
    const lessons = m.studio.outline.sections.flatMap(s => s.lessons);
    for (const v of m.studio.videos) {
      const x = (Array.isArray(req.body?.videos) ? req.body.videos : []).find(y => y?.id === v.id);
      if (!x) continue;
      for (const k of ['teach', 'aspects', 'conversation']) if (typeof x[k] === 'string') v[k] = x[k].trim().slice(0, 3000);
      if (['scene', 'presenter'].includes(x.style)) v.style = x.style;
      if (x.lesson && lessons.some(l => l.id === x.lesson) && x.lesson !== videoLesson(m, v.id)) {
        lessons.forEach(l => { if (l.video === v.id) l.video = null; });
        const target = lessons.find(l => l.id === x.lesson);
        const displaced = target.video;
        target.video = v.id;
        if (displaced) { const free = lessons.find(l => !l.video); if (free) free.video = displaced; }
      }
    }
    touch(m, 'videos');
    if (m.sections.length) syncVideoBlocks(m);
    return m;
  }));
}));

app.post('/api/projects/:id/videos/:vid/script', requireUser, requireRole('creator'), wrap(async (req, res) => {
  const state = await load();
  const mod = editableProject(state, req.params.id);
  requireCard(mod, 'videos');
  const video = mod.studio.videos.find(v => v.id === req.params.vid);
  if (!video) throw new BuilderError('Video not found.', 404);
  // Reviewer comments on this video (changes requested): the script is revised for them.
  const commentIds = Array.isArray(req.body?.commentIds) ? req.body.commentIds.map(String) : [];
  const fixing = openComments(mod, 'videos').filter(c => commentIds.includes(c.id));
  if (commentIds.length && (!fixing.length || !video.script)) throw new BuilderError('There is no open comment to fix on this video.', 409);
  const lang = mod.studio.lang;
  const revise = fixing.length ? { current: video.script, comments: fixing.map(c => `${c.team === 'admin' ? 'Training Manager' : c.team.toUpperCase()}: ${c.text[lang] || c.text.en || c.text.es}${c.quote ? ` (about: "${c.quote}")` : ''}`) } : null;
  const send = ndjson(res);
  try {
    const script = await writeVideoScript(mod, { ...video, lesson: videoLesson(mod, video.id), revise }, library(state), send);
    const saved = await onProject(mod.id, m => {
      const v = m.studio.videos.find(x => x.id === video.id);
      v.script = script; v.scriptAt = Date.now();
      touch(m, 'videos');
      if (m.sections.length) syncVideoBlocks(m);
      const now = Date.now();
      for (const c of (m.comments || []).filter(x => fixing.some(f => f.id === x.id))) {
        c.status = 'addressed'; c.reply = { text: script.notes || '', by: req.user.id, at: now, ai: true };
      }
      return m;
    });
    finish(res, { done: true, project: saved });
  } catch (err) {
    finish(res, builderFailure(err, 'The assistant could not write the script. Please try again.'));
  }
}));

app.put('/api/projects/:id/videos/:vid/script', requireUser, requireRole('creator'), wrap(async (req, res) => {
  res.json(await onProject(req.params.id, m => {
    requireCard(m, 'videos');
    const v = m.studio.videos.find(x => x.id === req.params.vid);
    if (!v?.script) throw new BuilderError('Write the script first.', 404);
    const sc = req.body?.script || {};
    const s = x => String(x ?? '').trim();
    v.script = {
      ...v.script, title: s(sc.title).slice(0, 200) || v.script.title, summary: s(sc.summary).slice(0, 400),
      scenes: v.script.scenes.map((scene, i) => ({
        setting: s(sc.scenes?.[i]?.setting ?? scene.setting).slice(0, 400), onscreen: s(sc.scenes?.[i]?.onscreen ?? scene.onscreen).slice(0, 200),
        lines: scene.lines.map((l, j) => ({ who: l.who, text: s(sc.scenes?.[i]?.lines?.[j]?.text ?? l.text).slice(0, 600) })).filter(l => l.text),
      })),
    };
    v.scriptAt = Date.now();
    touch(m, 'videos');
    if (m.sections.length) syncVideoBlocks(m);
    return m;
  }));
}));

// Video library and uploads. The browser uploads the file straight to storage (signed URL), then attaches it.
const publicVideo = v => { const { path, ...rest } = v; return rest; };
app.get('/api/videos', requireUser, wrap(async (req, res) => res.json(videoLibrary(await load()).map(publicVideo))));

app.post('/api/projects/:id/videos/:vid/upload-url', requireUser, requireRole('creator'), wrap(async (req, res) => {
  const mod = editableProject(await load(), req.params.id);
  requireCard(mod, 'videos');
  if (!mod.studio.videos.some(v => v.id === req.params.vid)) throw new BuilderError('Video not found.', 404);
  const ext = VIDEO_TYPES[req.body?.type];
  if (!ext) throw new BuilderError('Upload an MP4 or WebM video.');
  if (!(Number(req.body?.size) > 0) || Number(req.body.size) > MAX_VIDEO) throw new BuilderError('Videos can be up to 50 MB in this demo.');
  const path = `${mod.id}/${req.params.vid}-${Date.now().toString(36)}${randomBytes(2).toString('hex')}.${ext}`;
  res.json({ path, ...(await uploadTarget(path, req.body.type)) });
}));

// Local development only: the local server is the storage.
if (!remoteStorage()) {
  app.put(/^\/api\/local-upload\/(.+)$/, express.raw({ type: () => true, limit: MAX_VIDEO }), wrap(async (req, res) => {
    const path = req.params[0];
    if (!safePath(path) || req.query.token !== localToken(path)) return res.status(403).json({ error: 'Upload not allowed.' });
    await writeLocal(path, req.body);
    res.json({ ok: true });
  }));
  app.use('/local-media', express.static(LOCAL_DIR));
}

// Choose where a video comes from: an AI script, an uploaded file, or a video from the library.
app.post('/api/projects/:id/videos/:vid/media', requireUser, requireRole('creator'), wrap(async (req, res) => {
  const b = req.body || {};
  if (b.mode === 'upload' && (!safePath(String(b.path || '')) || !String(b.path).startsWith(`${req.params.id}/`) || !(await exists(b.path)))) {
    throw new BuilderError('The upload did not arrive. Please try again.', 409);
  }
  res.json(await onProject(req.params.id, (m, state) => {
    requireCard(m, 'videos');
    const v = m.studio.videos.find(x => x.id === req.params.vid);
    if (!v) throw new BuilderError('Video not found.', 404);
    const lang = m.studio.lang;
    const s = (x, n) => String(x || '').trim().slice(0, n);
    if (b.mode === 'script') { v.source = 'script'; v.media = null; }
    else if (b.mode === 'library') {
      const item = videoLibrary(state).find(x => x.id === b.libraryId);
      if (!item) throw new BuilderError('That video is not in the library.', 404);
      v.source = 'library';
      v.media = { libraryId: item.id, url: item.url, poster: item.poster || null, title: item.title, description: item.description || null, transcript: item.transcript || null,
        seconds: item.seconds || null, status: item.status, courseTitle: item.courseTitle || null, at: Date.now() };
    } else if (b.mode === 'upload') {
      const title = s(b.title, 200) || v.topic;
      const item = {
        id: `vid-${randomBytes(4).toString('hex')}`, kind: 'upload', status: b.pending ? 'pending' : 'approved',
        title: { [lang]: title }, description: s(b.description, 600) ? { [lang]: s(b.description, 600) } : null,
        transcript: s(b.transcript, 6000) ? { [lang]: s(b.transcript, 6000) } : null,
        seconds: Number.isFinite(+b.seconds) && +b.seconds > 0 ? Math.round(+b.seconds) : null,
        url: publicUrl(b.path), path: b.path, fileName: s(b.fileName, 200), uploadedBy: req.user.id, at: Date.now(), project: m.id,
      };
      (state.videos ||= []).push(item);
      v.source = 'upload';
      v.media = { libraryId: item.id, url: item.url, poster: item.poster || null, title: item.title, description: item.description, transcript: item.transcript,
        seconds: item.seconds, status: item.status, fileName: item.fileName, at: item.at };
    } else throw new BuilderError('Unknown video source.');
    touch(m, 'videos');
    if (m.sections.length) syncVideoBlocks(m);
    return m;
  }));
}));

// Content: every lesson and quiz written in parallel from the agreed outline. Streams {kind: lesson|quiz}, then {done, project}.
app.post('/api/projects/:id/generate', requireUser, requireRole('creator'), wrap(async (req, res) => {
  const state = await load();
  const mod = editableProject(state, req.params.id);
  requireCard(mod, 'content');
  const send = ndjson(res);
  try {
    const out = await generateFromOutline(mod, library(state), audienceText(mod.studio.spec.audience, 'en'), send);
    const saved = await onProject(mod.id, m => {
      Object.assign(m, out);
      m.sources = m.studio.spec.materials;
      m.translation = 'pending';
      syncBosses(m); syncVideoBlocks(m);
      touch(m, 'content');
      m.studio.notes = {};
      (m.history ||= []).push({ at: Date.now(), by: req.user.id, action: 'drafted_with_ai' });
      return m;
    });
    finish(res, { done: true, project: saved });
  } catch (err) {
    finish(res, builderFailure(err, 'The assistant could not write the lessons. Please try again.'));
  }
}));

// Preview notes: what the creator wants changed, per lesson / quiz / practice session; applied in one AI pass.
app.put('/api/projects/:id/notes', requireUser, requireRole('creator'), wrap(async (req, res) => {
  res.json(await onProject(req.params.id, m => {
    const targets = new Set(m.sections.flatMap(s => [...s.lessons.map(l => l.id), `quiz:${s.id}`, `boss:${s.id}`]));
    const notes = {};
    for (const [k, v] of Object.entries(req.body?.notes || {})) if (targets.has(k) && String(v).trim()) notes[k] = String(v).trim().slice(0, 1500);
    m.studio.notes = notes;
    m.updatedAt = Date.now();
    return m;
  }));
}));

app.post('/api/builder/:id/revise', requireUser, requireRole('creator'), wrap(async (req, res) => {
  const mod = await editableModule(req.params.id);
  const lib = library(await load());
  const commentIds = Array.isArray(req.body?.commentIds) ? req.body.commentIds.map(String) : null;
  const useComments = !!req.body?.useComments || !!commentIds;
  const useNotes = !!req.body?.useNotes;
  const fixing = useComments ? openComments(mod).filter(c => (commentIds ? commentIds.includes(c.id) : ['content', 'practice', 'preview'].includes(commentCard(mod, c)))) : [];
  const instruction = useComments ? commentsInstruction(mod, mod.sourceLang || 'en', fixing)
    : useNotes ? notesInstruction(mod) : String(req.body?.instruction || '').trim();
  if (instruction.length < 3) throw new BuilderError('Tell the assistant what to change.');
  if (instruction.length > (useComments ? 12000 : 2000)) throw new BuilderError('Keep the request under 2,000 characters.');
  const send = ndjson(res);
  try {
    const revision = await reviseModule(mod, instruction, send, lib);
    const saved = await update(state => {
      const m = state.modules.find(x => x.id === mod.id);
      if (!m || !isEditable(m)) throw new BuilderError('This module changed while the assistant was working. Please reload.', 409);
      applyRevision(m, revision);
      practiceFromBosses(m);
      if (useNotes && m.studio) m.studio.notes = {};
      // Each comment fixed by the AI is marked addressed, with the assistant's summary as the reply (the creator can reopen it).
      const now = Date.now();
      for (const c of (m.comments || []).filter(x => fixing.some(f => f.id === x.id))) {
        c.status = 'addressed'; c.reply = { text: revision.notes || '', by: req.user.id, at: now, ai: true };
      }
      (m.history ||= []).push({ at: Date.now(), by: req.user.id, action: useComments ? 'revised_for_comments' : useNotes ? 'revised_for_notes' : 'revised_with_ai' });
      return m;
    });
    res.end(JSON.stringify({ done: true, module: saved }) + '\n');
  } catch (err) {
    res.end(JSON.stringify(builderFailure(err, 'The assistant could not revise the module. Please try again.')) + '\n');
  }
}));

app.post('/api/builder/:id/translate', requireUser, requireRole('creator'), wrap(async (req, res) => {
  const mod = (await load()).modules.find(m => m.id === req.params.id);
  if (!mod) throw new BuilderError('Module not found.', 404);
  res.json(mod.translation === 'pending' ? await saveTranslation(mod) : mod);
}));

app.put('/api/modules/:id', requireUser, requireRole('creator'), wrap(async (req, res) => {
  const mod = await update(state => {
    const m = state.modules.find(x => x.id === req.params.id);
    if (!m) throw new BuilderError('Module not found.', 404);
    if (!isEditable(m)) throw new BuilderError('This module is locked while it is in review or live.', 409);
    return applyEdits(m, req.body || {});
  });
  res.json(mod);
}));

// --- Review comments (shared live between approvers and the Training Manager) ---
// A comment targets a lesson id, "quiz:<sectionId>", "boss:<sectionId>", "materials" or the whole module (null),
// optionally anchored to the exact text the reviewer selected (quote) inside one block.
const teamOf = user => (user.role === 'admin' ? 'admin' : user.team);
function canComment(mod, user) {
  if (user.role === 'admin') return ['in_review', 'approved'].includes(mod.status);
  return mod.status === 'in_review' && mod.reviews?.[user.team]?.state === 'pending';
}
function findModule(state, id) {
  const m = state.modules.find(x => x.id === id);
  if (!m) throw new WorkflowError('Module not found.', 404);
  return m;
}
function ownComment(m, cid, user) {
  const c = (m.comments || []).find(x => x.id === cid);
  if (!c) throw new WorkflowError('Comment not found.', 404);
  if (c.team !== teamOf(user) || c.sent || c.round !== m.round) throw new WorkflowError('Only your team can change its own unsent comments.', 403);
  return c;
}
const commentText = v => String(v || '').trim().slice(0, 1500);

app.post('/api/modules/:id/comments', requireUser, requireRole('approver', 'admin'), wrap(async (req, res) => {
  const b = req.body || {};
  const lang = b.lang === 'es' ? 'es' : 'en';
  const text = commentText(b.text);
  if (!text) throw new WorkflowError('Write the comment first.');
  res.json(await update(state => {
    const m = findModule(state, req.params.id);
    if (!canComment(m, req.user)) throw new WorkflowError('You cannot comment on this module right now.', 409);
    const targets = new Set([...m.sections.flatMap(s => [...s.lessons.map(l => l.id), `quiz:${s.id}`, `boss:${s.id}`]), 'materials']);
    const target = targets.has(b.target) ? b.target : null;
    const c = {
      id: `c-${randomBytes(4).toString('hex')}`, round: m.round, team: teamOf(req.user), by: req.user.id, at: Date.now(),
      target, block: Number.isInteger(b.block) && b.block >= 0 ? b.block : null, blockType: typeof b.blockType === 'string' ? b.blockType.slice(0, 20) : null,
      quote: String(b.quote || '').replace(/\s+/g, ' ').trim().slice(0, 400), text: { [lang]: text },
      ...(b.ai ? { ai: true, findingId: String(b.findingId || '').slice(0, 40) } : {}),
      sent: false, agrees: [], status: 'open', reply: null,
    };
    (m.comments ||= []).push(c);
    return { comment: c, comments: m.comments };
  }));
}));

app.put('/api/modules/:id/comments/:cid', requireUser, requireRole('approver', 'admin'), wrap(async (req, res) => {
  const lang = req.body?.lang === 'es' ? 'es' : 'en';
  const text = commentText(req.body?.text);
  if (!text) throw new WorkflowError('A comment cannot be empty. Remove it instead.');
  res.json(await update(state => {
    const m = findModule(state, req.params.id);
    const c = ownComment(m, req.params.cid, req.user);
    c.text = { [lang]: text }; c.editedAt = Date.now();
    return { comment: c, comments: m.comments };
  }));
}));

app.delete('/api/modules/:id/comments/:cid', requireUser, requireRole('approver', 'admin'), wrap(async (req, res) => {
  res.json(await update(state => {
    const m = findModule(state, req.params.id);
    ownComment(m, req.params.cid, req.user);
    m.comments = m.comments.filter(x => x.id !== req.params.cid);
    return { comments: m.comments };
  }));
}));

// "Agree": another team backs a comment instead of writing the same one again.
app.post('/api/modules/:id/comments/:cid/agree', requireUser, requireRole('approver', 'admin'), wrap(async (req, res) => {
  res.json(await update(state => {
    const m = findModule(state, req.params.id);
    if (!canComment(m, req.user)) throw new WorkflowError('You cannot comment on this module right now.', 409);
    const c = (m.comments || []).find(x => x.id === req.params.cid && x.round === m.round);
    if (!c) throw new WorkflowError('Comment not found.', 404);
    const team = teamOf(req.user);
    if (c.team === team) throw new WorkflowError('This is your own team\'s comment.');
    c.agrees ||= [];
    const i = c.agrees.findIndex(a => a.team === team);
    if (i >= 0) c.agrees.splice(i, 1); else c.agrees.push({ team, by: req.user.id, at: Date.now() });
    return { comment: c, comments: m.comments };
  }));
}));

// Next round: the reviewer checks how the creator handled their team's comment from the previous round.
// "still" raises it again as a new comment in this round.
app.post('/api/modules/:id/comments/:cid/verdict', requireUser, requireRole('approver', 'admin'), wrap(async (req, res) => {
  const state = req.body?.state === 'still' ? 'still' : 'confirmed';
  const lang = req.body?.lang === 'es' ? 'es' : 'en';
  res.json(await update(st => {
    const m = findModule(st, req.params.id);
    if (!canComment(m, req.user)) throw new WorkflowError('You cannot comment on this module right now.', 409);
    const c = (m.comments || []).find(x => x.id === req.params.cid);
    if (!c || c.round >= m.round || c.team !== teamOf(req.user)) throw new WorkflowError('Comment not found.', 404);
    const now = Date.now();
    m.comments = m.comments.filter(x => !(x.reraisedFrom === c.id && !x.sent && x.round === m.round));
    c.verdict = { state, by: req.user.id, at: now, round: m.round };
    if (state === 'still') {
      const note = commentText(req.body?.text);
      m.comments.push({
        id: `c-${randomBytes(4).toString('hex')}`, round: m.round, team: c.team, by: req.user.id, at: now,
        target: c.target, block: c.block, blockType: c.blockType, quote: c.quote,
        text: note ? { [lang]: note } : c.text, reraisedFrom: c.id, sent: false, agrees: [], status: 'open', reply: null,
      });
    }
    return { comments: m.comments };
  }));
}));

app.post('/api/modules/:id/review', requireUser, requireRole('approver'), wrap(async (req, res) => {
  const mod = await update(state => {
    const m = findModule(state, req.params.id);
    // Approvers review for their own team only.
    const out = settle(review(m, { team: req.user.team, decision: req.body?.decision }, req.user.id));
    if (out.status === 'changes_requested') ensureStudio(out);
    return out;
  });
  res.json(mod);
}));

// The Training Manager sends an approved module back to the creator with their comments.
app.post('/api/modules/:id/admin-request', requireUser, requireRole('admin'), wrap(async (req, res) => {
  res.json(await update(state => ensureStudio(adminRequestChanges(findModule(state, req.params.id), req.user.id))));
}));

// The creator answers each comment: changed it, or kept the text and says why (or reopens it).
app.post('/api/projects/:id/comments/:cid', requireUser, requireRole('creator'), wrap(async (req, res) => {
  const action = req.body?.action;
  if (!['addressed', 'answered', 'reopen'].includes(action)) throw new WorkflowError('Unknown action.');
  const reply = commentText(req.body?.reply);
  if (action === 'answered' && reply.length < 3) throw new WorkflowError('Tell the reviewer why the text stays as it is.');
  res.json(await update(state => {
    const m = findModule(state, req.params.id);
    if (m.status !== 'changes_requested') throw new WorkflowError('This module is not waiting for changes.', 409);
    const c = creatorComments(m).find(x => x.id === req.params.cid);
    if (!c) throw new WorkflowError('Comment not found.', 404);
    if (action === 'reopen') { c.status = 'open'; c.reply = null; }
    else { c.status = action; c.reply = reply || action === 'answered' ? { text: reply, by: req.user.id, at: Date.now() } : null; }
    m.updatedAt = Date.now();
    return forRole(m, req.user);
  }));
}));

// AI pre-check through the approver's team lens. Streams {kind: part|partDone} lines, then {"done": true, "precheck": {...}}.
app.post('/api/modules/:id/precheck', requireUser, requireRole('approver'), wrap(async (req, res) => {
  const mod = (await load()).modules.find(m => m.id === req.params.id);
  if (!mod) throw new WorkflowError('Module not found.', 404);
  if (mod.status !== 'in_review') throw new WorkflowError('Only a module in review can be pre-checked.', 409);
  const lang = req.body?.lang === 'es' ? 'es' : 'en';
  const team = req.user.team;
  const send = ndjson(res);
  try {
    const result = await precheck(mod, team, lang, send, library(await load()));
    const saved = await update(state => {
      const m = state.modules.find(x => x.id === mod.id);
      const entry = { ...result, round: mod.round, by: req.user.id };
      if (m && m.round === mod.round) {
        (m.prechecks ||= {})[team] = entry;
        (m.history ||= []).push({ at: entry.at, by: req.user.id, action: 'ai_precheck', team });
      }
      return entry;
    });
    res.end(JSON.stringify({ done: true, precheck: saved }) + '\n');
  } catch (err) {
    res.end(JSON.stringify(builderFailure(err, 'The AI pre-check could not finish. Please try again.')) + '\n');
  }
}));

// Go live: Training Manager / platform admin only.
app.post('/api/modules/:id/golive', requireUser, requireRole('admin'), wrap(async (req, res) => {
  const mod = await update(state => {
    const m = state.modules.find(x => x.id === req.params.id);
    if (!m) throw new WorkflowError('Module not found.', 404);
    return goLive(m, req.user.id);
  });
  res.json(mod);
}));

// --- Learner: sections, quizzes and the final challenge ---
const allLessons = mod => mod.sections.flatMap(s => s.lessons);
const myProgress = (state, userId, moduleId) =>
  ((state.progress[userId] ||= {})[moduleId] ||= { lessonsDone: [], quizzes: {}, attempts: [] });

async function roleplayContext(req) {
  const { moduleId, sectionId, lang, turns, elapsedSec } = req.body || {};
  const state = await load();
  const mod = state.modules.find(m => m.id === moduleId);
  const progress = state.progress[req.user.id]?.[moduleId];
  return { mod, lang, turns, voice: req.body?.voice === true, ...validate({ mod, progress, sectionId, lang, turns, elapsedSec }) };
}

// Streams the HCP's reply as NDJSON lines: {"text": "..."} ... then {"done": true, "stop": "...", "ended": bool}.
app.post('/api/roleplay/turn', requireUser, requireRole('learner'), wrap(async (req, res) => {
  const ctx = await roleplayContext(req);
  res.setHeader('content-type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  try {
    const { stop, ended } = await hcpTurn(ctx, text => res.write(JSON.stringify({ text }) + '\n'));
    res.end(JSON.stringify({ done: true, stop, ended }) + '\n');
  } catch (err) {
    console.error(err);
    res.end(JSON.stringify({ error: err instanceof RoleplayError ? err.message : 'The HCP could not answer. Please try again.' }) + '\n');
  }
}));

app.post('/api/roleplay/feedback', requireUser, requireRole('learner'), wrap(async (req, res) => {
  const ctx = await roleplayContext(req);
  const result = await feedback(ctx);
  await update(state => {
    myProgress(state, req.user.id, ctx.mod.id).attempts.push({
      at: Date.now(), section: ctx.section.id, persona: ctx.persona.id,
      passed: result.passed, redLines: result.red_lines.length, scores: result.scores,
    });
  });
  res.json(result);
}));

app.get('/api/progress', requireUser, wrap(async (req, res) => {
  const state = await load();
  res.json(state.progress[req.user.id] || {});
}));

app.post('/api/progress/lesson', requireUser, requireRole('learner'), wrap(async (req, res) => {
  const { moduleId, lessonId } = req.body || {};
  const out = await update(state => {
    const mod = state.modules.find(m => m.id === moduleId && m.status === 'published');
    if (!mod || !allLessons(mod).some(l => l.id === lessonId)) throw new WorkflowError('Lesson not found.', 404);
    const p = myProgress(state, req.user.id, moduleId);
    if (!p.lessonsDone.includes(lessonId)) p.lessonsDone.push(lessonId);
    return p;
  });
  res.json(out);
}));

// Graded on the server: the browser never receives the answer key before submitting.
app.post('/api/progress/quiz', requireUser, requireRole('learner'), wrap(async (req, res) => {
  const { moduleId, sectionId, answers } = req.body || {};
  const out = await update(state => {
    const mod = state.modules.find(m => m.id === moduleId && m.status === 'published');
    const section = mod?.sections.find(s => s.id === sectionId);
    if (!section || !section.quiz.length) throw new WorkflowError('Quiz not found.', 404);
    if (!Array.isArray(answers) || answers.length !== section.quiz.length) throw new WorkflowError('Answer every question.');
    const results = section.quiz.map((q, i) => ({ id: q.id, chosen: answers[i], answer: q.answer, correct: answers[i] === q.answer }));
    const score = results.filter(r => r.correct).length;
    const passed = score / section.quiz.length >= PASS.quiz - 1e-9;
    const p = myProgress(state, req.user.id, moduleId);
    const best = p.quizzes[sectionId];
    if (!best || score >= best.score) p.quizzes[sectionId] = { score, total: section.quiz.length, passed: passed || !!best?.passed, at: Date.now() };
    return { score, total: section.quiz.length, passed, results };
  });
  res.json(out);
}));

// Short AI explanation of a quiz answer, grounded on the module's approved material (Haiku 5.5).
app.post('/api/quiz/explain', requireUser, requireRole('learner'), wrap(async (req, res) => {
  const { moduleId, sectionId, questionId, chosen, lang } = req.body || {};
  const mod = (await load()).modules.find(m => m.id === moduleId && m.status === 'published');
  const q = mod?.sections.find(s => s.id === sectionId)?.quiz.find(x => x.id === questionId);
  if (!q || !Number.isInteger(chosen) || !q.options[chosen]) throw new WorkflowError('Question not found.', 404);
  res.json({ text: await explainAnswer(mod, q, chosen, lang === 'es' ? 'es' : 'en') });
}));

app.get('/api/team', requireUser, requireRole('manager'), wrap(async (req, res) => res.json((await load()).team)));

// --- Demo admin ---
app.post('/api/admin/reset', wrap(async (req, res) => { await reset(); res.json({ ok: true }); }));

// --- Live video avatar for practice: short-lived tokens for LiveAvatar or Azure Speech (the keys stay on the server) ---
app.post('/api/avatar/session', requireUser, wrap(async (req, res) => {
  // The session can never outlast the visit by much: each connected minute uses credits.
  const minutes = Math.min(30, Math.max(1, Number(req.body?.minutes) || 10));
  res.json(await avatarSession({ lang: req.body?.lang === 'es' ? 'es' : 'en', maxSeconds: minutes * 60 + 120 }));
}));
// Azure Speech tokens last 10 minutes: a longer visit renews it.
app.post('/api/avatar/token', requireUser, wrap(async (req, res) => res.json(await avatarToken())));

// --- Health: ?ai=1 also makes one tiny Foundry call ---
app.get('/api/health', wrap(async (req, res) => {
  const out = { ok: true, store: await backendName(), models: MODELS };
  if (req.query.ai) {
    try { out.foundry = await ping(); } catch (e) { out.ok = false; out.foundry = { error: e.message }; }
  }
  res.status(out.ok ? 200 : 503).json(out);
}));

// --- Static UI (single page app) ---
app.use(express.static(join(here, '..', 'public')));
app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(join(here, '..', 'public', 'index.html')));

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'Something went wrong.' });
});

export default app;
