// One home screen per role. These are the skeleton versions: real data, simple layout.
// The detailed screens (role-play, module builder, review) replace parts of these next.
import { api } from '../api.js';
import { t, L, getLang } from '../i18n.js';
import { esc, meter, chip, statusChip, reviewChip, fmtDate } from '../ui.js';
import { nextStep, allLessons, sectionState } from '../progress.js';
import { studioProgress, audienceText, creatorComments, isOpenComment } from '../studio-rules.js';

const PILLARS = ['product', 'messaging', 'objections'];
const TEAMS = ['training', 'sales', 'marketing', 'mlr'];
const avg = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

function header(user, lead) {
  return `<p class="lh-kicker">${esc(L(user.title))}</p>
    <h1 class="zn-brand__org" style="font-size:var(--t-h1);text-align:left">${esc(t('hello', { name: user.name.startsWith('Dr.') ? user.name : user.name.split(' ')[0] }))}</h1>
    <p class="lh-muted" style="margin:6px 0 0">${esc(lead)}</p>`;
}

async function learner(el, user) {
  const [modules, progress, meta] = await Promise.all([api('/api/modules'), api('/api/progress'), api('/api/meta')]);
  // Latest practice-call scores per pillar across modules.
  const latest = Object.values(progress).map(p => p.attempts?.at(-1)?.scores).filter(Boolean);
  // The next step across modules: the first module that is not finished.
  const step = modules.map(m => ({ m, s: nextStep(m, progress[m.id]) })).find(x => x.s.kind !== 'done');
  const stepText = !step ? t('nextAllDone')
    : step.s.kind === 'lesson' ? t('nextLesson', { lesson: L(step.s.lesson.title) })
    : step.s.kind === 'quiz' ? t('nextTakeQuiz', { section: L(step.s.section.title) })
    : t('nextFaceBoss', { section: L(step.s.section.title), name: meta.personas.find(p => p.id === step.s.section.boss.persona).name });
  el.innerHTML = `${header(user, t('learnerLead'))}
    <section class="lh-section zn-card lh-card lh-nextstep">
      <p class="lh-kicker">${esc(t('nextStepTitle'))}</p>
      <p class="lh-nextstep__text">${esc(stepText)}</p>
      ${step ? `<a class="zn-button" href="${esc(step.s.href)}">${esc(t('continueBtn'))}</a>` : ''}
    </section>
    <section class="lh-section zn-card lh-card">
      <h2 class="lh-card__title">${esc(t('yourProgress'))}</h2>
      ${PILLARS.map(p => meter(t(`pillar_${p}`), avg(latest.map(s => s[p])))).join('')}
    </section>
    <section class="lh-section">
      <h2 class="lh-section__title">${esc(t('yourModules'))}</h2>
      <div class="lh-grid">
        ${modules.map(m => {
          const p = progress[m.id] || {};
          return `<a class="zn-card lh-card lh-card--link" href="#/module/${esc(m.id)}">
            <span class="zn-product zn-product--derolad">Derolad®</span>
            <h3 class="lh-card__title">${esc(L(m.title))}</h3>
            <p class="lh-card__meta">${esc(L(m.objective))}</p>
            <p class="lh-card__meta">${esc(t('lessons', { done: p.lessonsDone?.length || 0, total: allLessons(m).length }))} · ${esc(t('challengesBeaten', { n: m.sections.filter(s => sectionState(s, p).passed).length, total: m.sections.length }))}</p>
            <span class="lh-card__cta">${esc(t('open'))} →</span>
          </a>`;
        }).join('')}
      </div>
    </section>`;
}

function moduleCard(m, extra = '') {
  return `<article class="zn-card lh-card">
    <div class="lh-row">${statusChip(m.status)}<span class="lh-spacer"></span><span class="zn-product zn-product--derolad">Derolad®</span></div>
    <h3 class="lh-card__title">${esc(L(m.title))}</h3>
    <p class="lh-card__meta">${esc(L(m.audience))}</p>
    <div class="lh-teams">${TEAMS.map(team => reviewChip(team, m.reviews?.[team]?.state || 'pending')).join('')}</div>
    ${extra}
  </article>`;
}

// Creator dashboard: modules sent back first (action required), then projects in design, in review, and live.
function projectCard(m) {
  const p = studioProgress(m);
  const back = m.status === 'changes_requested';
  const all = creatorComments(m), open = all.filter(isOpenComment).length;
  return `<a class="zn-card lh-card lh-card--link lh-project ${back ? 'lh-project--back' : ''}" href="#/studio/${esc(m.id)}">
    <div class="lh-row">${back ? statusChip(m.status) : chip('draft', t('status_design'))}${m.round ? chip('draft', t('roundN', { n: m.round })) : ''}<span class="lh-spacer"></span><span class="zn-product zn-product--derolad">Derolad®</span></div>
    <h3 class="lh-card__title">${esc(L(m.title) || m.studio.spec.title)}</h3>
    <p class="lh-card__meta">${esc(audienceText(m.studio.spec.audience, getLang()))}</p>
    ${back ? meter(t('ccDoneOf', { done: all.length - open, n: all.length }), all.length ? ((all.length - open) / all.length) * 100 : 100)
      : meter(t('studioDoneOf', { done: p.done, total: p.total }), p.total ? (p.done / p.total) * 100 : 0)}
    <p class="lh-card__meta">${back ? esc(t('ccCardLine', { teams: [...new Set(all.map(c => c.team))].map(x => t(`team_${x}`)).join(', '), open }))
      : p.next ? esc(t('studioNext', { card: t(`card_${p.next}`) })) : esc(t('studioReady'))} · ${esc(t('lastEdited', { date: fmtDate(m.updatedAt || m.createdAt) }))}</p>
    <span class="lh-card__cta">${esc(t(back ? 'fixAndResubmit' : 'openStudio'))} →</span>
  </a>`;
}

async function creator(el, user) {
  const modules = await api('/api/modules');
  const recent = (a, b) => (b.updatedAt || b.submittedAt || 0) - (a.updatedAt || a.submittedAt || 0);
  const back = modules.filter(m => m.status === 'changes_requested').sort(recent);
  const projects = modules.filter(m => m.studio && m.status === 'draft').sort(recent);
  const inReview = modules.filter(m => ['in_review', 'approved'].includes(m.status)).sort(recent);
  const live = modules.filter(m => m.status === 'published').sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
  const link = m => (m.studio ? `#/studio/${m.id}` : `#/edit/${m.id}`);
  const section = (title, list, html, empty) => `
    <section class="lh-section">
      <h2 class="lh-section__title">${esc(title)}${list.length ? ` <span class="lh-count">${list.length}</span>` : ''}</h2>
      ${list.length ? `<div class="lh-grid">${list.map(html).join('')}</div>` : `<div class="zn-card lh-empty">${esc(empty)}</div>`}
    </section>`;
  el.innerHTML = `${header(user, t('creatorLead'))}
    <section class="lh-section zn-card lh-card lh-nextstep lh-create">
      <div>
        <p class="lh-kicker">${esc(t('newProjectKicker'))}</p>
        <p class="lh-nextstep__text">${esc(t('newProjectLead'))}</p>
      </div>
      <a class="zn-button" href="#/build">${esc(t('newProjectCta'))}</a>
    </section>
    ${back.length ? section(t('actionRequired'), back, projectCard, '') : ''}
    ${section(t('projectsInDesign'), projects, projectCard, t('noProjects'))}
    ${section(t('inReviewSection'), inReview, m => moduleCard(m,
      `<a class="lh-card__cta" href="${esc(link(m))}">${esc(t('viewModule'))} →</a>`), t('noInReview'))}
    ${section(t('liveSection'), live, m => moduleCard(m,
      `<p class="lh-card__meta">${esc(t('liveSince', { date: fmtDate(m.publishedAt) }))}</p><a class="lh-card__cta" href="${esc(link(m))}">${esc(t('viewModule'))} →</a>`), t('noLive'))}`;
}

async function approver(el, user) {
  // Modules in review, the ones still waiting for this team first.
  const pending = m => (m.reviews?.[user.team]?.state || 'pending') === 'pending';
  const modules = (await api('/api/modules')).filter(m => m.status === 'in_review').sort((a, b) => pending(b) - pending(a));
  const teamName = t(`team_${user.team}`);
  el.innerHTML = `${header(user, t('approverLead', { team: teamName }))}
    <section class="lh-section">
      <h2 class="lh-section__title">${esc(t('inbox'))}</h2>
      ${modules.length ? `<div class="lh-grid">${modules.map(m => moduleCard(m,
        `<p class="lh-card__meta"><strong>${esc(t('yourTeamDecision', { state: t(`review_${m.reviews[user.team]?.state || 'pending'}`) }))}</strong></p>
         <a class="${pending(m) ? 'zn-button' : 'lh-card__cta'}" href="#/review/${esc(m.id)}">${esc(t(pending(m) ? 'reviewNow' : 'seeReview'))}${pending(m) ? '' : ' →'}</a>`)).join('')}</div>`
        : `<div class="zn-card lh-empty">${esc(t('nothingToReview'))}</div>`}
    </section>`;
}

async function manager(el, user) {
  const team = await api('/api/team');
  el.innerHTML = `${header(user, t('managerLead'))}
    <section class="lh-section zn-card lh-card">
      <h2 class="lh-card__title">${esc(t('teamResults'))}</h2>
      ${PILLARS.map(p => meter(`${t(`pillar_${p}`)}`, avg(team.map(r => r.roleplay[p])))).join('')}
      <div class="lh-table-wrap">
        <table class="lh-table">
          <thead><tr><th>${esc(t('rep'))}</th>${PILLARS.map(p => `<th>${esc(t(`pillar_${p}`))}<br>${esc(t('quiz'))} / ${esc(t('roleplay'))}</th>`).join('')}<th>${esc(t('practiceCalls'))}</th></tr></thead>
          <tbody>${team.map(r => `<tr><td>${esc(r.name)}</td>${PILLARS.map(p => `<td class="num">${r.quiz[p]} / ${r.roleplay[p]}</td>`).join('')}<td class="num">${r.attempts}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </section>`;
}

async function admin(el, user) {
  const modules = await api('/api/modules');
  const ready = modules.filter(m => m.status === 'approved');
  el.innerHTML = `${header(user, t('adminLead'))}
    <section class="lh-section">
      <h2 class="lh-section__title">${esc(t('readyToGoLive'))}</h2>
      ${ready.length ? `<div class="lh-grid">${ready.map(m => moduleCard(m,
        `<div class="lh-row"><button type="button" class="zn-button" data-golive="${esc(m.id)}">${esc(t('goLive'))}</button>
          <a class="lh-card__cta" href="#/review/${esc(m.id)}">${esc(t('readModule'))} →</a></div>`)).join('')}</div>`
        : `<div class="zn-card lh-empty">${esc(t('nothingToGoLive'))}</div>`}
    </section>
    <section class="lh-section">
      <h2 class="lh-section__title">${esc(t('allModules'))}</h2>
      <div class="lh-grid">${modules.filter(m => m.status !== 'approved' && !(m.studio && m.status === 'draft')).map(m => moduleCard(m,
        `<a class="lh-card__cta" href="#/review/${esc(m.id)}">${esc(t('readModule'))} →</a>`)).join('')}</div>
    </section>`;
  el.querySelectorAll('[data-golive]').forEach(btn => btn.addEventListener('click', async () => {
    const m = modules.find(x => x.id === btn.dataset.golive);
    if (!confirm(t('goLiveConfirm', { title: L(m.title) }))) return;
    btn.disabled = true;
    await api(`/api/modules/${m.id}/golive`, { method: 'POST' });
    await admin(el, user);
  }));
}

export function renderHome(el, user) {
  return ({ learner, creator, approver, admin, manager })[user.role](el, user);
}
