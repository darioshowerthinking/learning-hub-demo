import { api } from '../api.js';
import { t, L } from '../i18n.js';
import { esc } from '../ui.js';

const ROLES = ['learner', 'creator', 'approver', 'admin', 'manager'];

export async function renderLogin(el, { onSignedIn }) {
  const users = await api('/api/users');
  el.innerHTML = `
    <section class="lh-login">
      <div class="zn-brand lh-login__intro">
        <h1 class="zn-brand__org">${esc(t('loginTitle'))}</h1>
        <p class="zn-brand__expansion">${esc(t('loginLead'))}</p>
      </div>
      <div class="lh-roles">
        ${ROLES.map(role => `
          <div class="zn-card lh-role">
            <div>
              <h2 class="lh-role__name">${esc(t(`role_${role}`))}</h2>
              <p class="lh-role__desc">${esc(t(`role_${role}_desc`))}</p>
            </div>
            ${users.filter(u => u.role === role).map(u => `
              <button type="button" class="lh-person" data-user="${esc(u.id)}">
                <span class="lh-avatar">${esc(u.initials)}</span>
                <span><span class="lh-person__name">${esc(u.name)}</span><span class="lh-person__title">${esc(L(u.title))}</span></span>
              </button>`).join('')}
          </div>`).join('')}
      </div>
    </section>`;

  el.querySelectorAll('[data-user]').forEach(btn => btn.addEventListener('click', async () => {
    const { user } = await api('/api/session', { method: 'POST', body: { userId: btn.dataset.user } });
    onSignedIn(user);
  }));
}
