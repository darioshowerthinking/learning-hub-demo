// Demo access code: shown only when the server is configured with DEMO_ACCESS_CODE.
import { api } from '../api.js';
import { t } from '../i18n.js';
import { esc } from '../ui.js';

export function renderAccess(el, { onUnlocked }) {
  el.innerHTML = `
    <section class="lh-login">
      <div class="zn-brand lh-login__intro">
        <h1 class="zn-brand__org">${esc(t('accessTitle'))}</h1>
        <p class="zn-brand__expansion">${esc(t('accessLead'))}</p>
      </div>
      <form class="zn-card lh-card lh-access" data-access novalidate>
        <label class="lh-field">
          <span class="lh-field__label">${esc(t('accessLabel'))}</span>
          <input class="lh-input" name="code" type="password" autocomplete="off" required autofocus>
        </label>
        <p class="lh-access__error" role="alert" data-error hidden>${esc(t('accessWrong'))}</p>
        <div class="lh-row"><button class="zn-button" type="submit">${esc(t('accessButton'))}</button></div>
      </form>
    </section>`;
  const form = el.querySelector('[data-access]');
  form.querySelector('input').focus();
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    try {
      await api('/api/access', { method: 'POST', body: { code: new FormData(form).get('code') } });
      onUnlocked();
    } catch {
      form.querySelector('[data-error]').hidden = false;
      form.querySelector('input').select();
      btn.disabled = false;
    }
  });
}
