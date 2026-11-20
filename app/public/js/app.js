// App shell: session, language switch, header and the current view.
import { api } from './api.js';
import { getLang, setLang, applyStatic, t, L } from './i18n.js';
import { errorBox } from './ui.js';
import { renderLogin } from './views/login.js';
import { renderAccess } from './views/access.js';
import { renderHome } from './views/home.js';
import { renderModule } from './views/module.js';
import { renderPractice } from './views/practice.js';
import { renderQuiz } from './views/quiz.js';
import { renderLesson } from './views/lesson.js';
import { renderEditor } from './views/builder.js';
import { renderWizard } from './views/wizard.js';
import { renderStudio } from './views/studio.js';
import { renderReview } from './views/review.js';

const view = document.getElementById('view');
let user = null;
let locked = false;   // true until the demo access code has been entered (when the server asks for one)

function paintHeader() {
  const chip = document.querySelector('[data-user-chip]');
  const sw = document.querySelector('[data-switch-user]');
  chip.hidden = sw.hidden = !user;
  if (user) {
    document.querySelector('[data-user-initials]').textContent = user.initials;
    document.querySelector('[data-user-name]').textContent = `${user.name} · ${L(user.title)}`;
  }
  document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === getLang())));
  applyStatic();
}

async function render() {
  paintHeader();
  try {
    if (locked) return renderAccess(view, { onUnlocked: start });
    if (!user) return await renderLogin(view, { onSignedIn: u => { user = u; location.hash = '#/'; render(); } });
    // Hash routes. Learner: #/module/:id · #/lesson/:module/:lesson · #/quiz/:module/:section · #/practice/:module/:section
    // Creator: #/build (new project wizard) · #/build/:id (edit requirements) · #/studio/:id[/:card] · #/edit/:id
    // Approver and admin: #/review/:id
    const [, page, id, sectionId] = location.hash.split('/');
    const learner = user.role === 'learner';
    if (learner && page === 'module') await renderModule(view, user, id);
    else if (learner && page === 'lesson') await renderLesson(view, user, id, sectionId);
    else if (learner && page === 'quiz') await renderQuiz(view, user, id, sectionId);
    else if (learner && page === 'practice') await renderPractice(view, user, id, sectionId);
    else if (user.role === 'creator' && page === 'build') await renderWizard(view, user, id);
    else if (user.role === 'creator' && page === 'studio') await renderStudio(view, user, id, sectionId);
    else if (user.role === 'creator' && page === 'edit') await renderEditor(view, user, id);
    else if (['approver', 'admin'].includes(user.role) && page === 'review') await renderReview(view, user, id);
    else await renderHome(view, user);
    view.focus({ preventScroll: true });
  } catch (err) {
    if (err.code === 'access') { locked = true; user = null; return render(); }
    if (err.status === 401) { user = null; return render(); }
    view.innerHTML = errorBox(err);
  }
}

document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => { setLang(b.dataset.lang); render(); }));
window.addEventListener('hashchange', () => { render(); window.scrollTo({ top: 0 }); });
document.querySelector('[data-switch-user]').addEventListener('click', async () => {
  await api('/api/session', { method: 'DELETE' });
  user = null;
  history.replaceState(null, '', '#/');
  render();
});
document.querySelector('[data-reset]').addEventListener('click', async () => {
  if (!confirm(t('resetConfirm'))) return;
  try { await api('/api/admin/reset', { method: 'POST' }); } catch (e) { if (e.status !== 401) throw e; }
  render();
});

async function start() {
  try {
    ({ user } = await api('/api/session'));
    locked = false;
  } catch (err) {
    if (err.code !== 'access') throw err;
    locked = true;
  }
  render();
}

setLang(getLang());
start();
