// Renders a lesson's blocks (text, why, example, dodont, keypoints, callout, check, visual, chart, video).
// Used by the learner's lesson page, the editor preview and the live storyboard. Text fields may be
// { en, es } (stored modules) or plain strings (a module still being written), and may be missing
// while a block is streaming in.
import { t, L } from './i18n.js';
import { esc } from './ui.js';
import { renderVisual, renderChart } from './visuals.js';

const tx = v => (typeof v === 'string' ? v : L(v)) || '';
const paras = v => tx(v).split(/\n\s*\n|\n/).map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('');

const ICON = {
  why: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/></svg>',
  tip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z"/></svg>',
  compliance: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l7.5 3v6c0 4.6-3.2 8.4-7.5 10-4.3-1.6-7.5-5.4-7.5-10v-6z"/><path d="M9 12l2 2 4-4"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>',
  cross: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

function block(b, i, key) {
  switch (b?.type) {
    case 'text':
      return `<section class="lh-b lh-b--text">${tx(b.heading) ? `<h3 class="lh-b__h">${esc(tx(b.heading))}</h3>` : ''}${paras(b.body)}</section>`;
    case 'why':
      return `<aside class="lh-b lh-b--why"><p class="lh-b__label">${ICON.why}${esc(t('blockWhy'))}</p>${paras(b.body)}</aside>`;
    case 'callout': {
      const tone = b.tone === 'compliance' ? 'compliance' : 'tip';
      return `<aside class="lh-b lh-b--callout lh-b--${tone}"><p class="lh-b__label">${ICON[tone]}${esc(t(tone === 'compliance' ? 'blockCompliance' : 'blockTip'))}</p>${paras(b.body)}</aside>`;
    }
    case 'keypoints':
      return `<section class="lh-b lh-b--keypoints"><h3 class="lh-b__h">${esc(tx(b.heading) || t('blockRemember'))}</h3>
        <ul>${(b.items || []).map(it => `<li>${ICON.check}<span>${esc(tx(it))}</span></li>`).join('')}</ul></section>`;
    case 'example':
      return `<section class="lh-b lh-b--example">
        <p class="lh-b__label">${esc(t('blockExample'))}</p>
        ${tx(b.title) ? `<h3 class="lh-b__h">${esc(tx(b.title))}</h3>` : ''}
        ${tx(b.context) ? `<p class="lh-b__context">${esc(tx(b.context))}</p>` : ''}
        <div class="lh-dialogue">${(b.lines || []).map(ln => `
          <div class="lh-line lh-line--${ln?.who === 'hcp' ? 'hcp' : 'rep'}">
            <span class="lh-line__who">${esc(t(ln?.who === 'hcp' ? 'whoHcp' : 'whoRep'))}</span>
            <p>${esc(tx(ln?.text))}</p>
          </div>`).join('')}</div>
        ${tx(b.debrief) ? `<div class="lh-b__debrief"><p class="lh-b__label">${esc(t('blockDebrief'))}</p>${paras(b.debrief)}</div>` : ''}
      </section>`;
    case 'dodont':
      return `<section class="lh-b lh-b--dodont">
        <div class="lh-dodont__head"><span class="lh-dodont__say">${ICON.check}${esc(t('blockSay'))}</span><span class="lh-dodont__avoid">${ICON.cross}${esc(t('blockAvoid'))}</span></div>
        ${(b.items || []).map(it => `<div class="lh-dodont__row">
          <p class="lh-dodont__say-text">${esc(tx(it?.say))}</p>
          <p class="lh-dodont__avoid-text">${esc(tx(it?.avoid))}</p>
          ${tx(it?.why) ? `<p class="lh-dodont__why">${esc(tx(it.why))}</p>` : ''}
        </div>`).join('')}
      </section>`;
    case 'visual':
      return b.visual ? renderVisual(b.visual, tx(b.caption)) : '';
    case 'chart':
      return b.chart ? renderChart(b.chart, tx(b.caption)) : '';
    case 'video': {
      // An instructional video: the rendered file when there is one, otherwise the approved script as a poster + transcript.
      const secs = Number(b.seconds) || 0;
      const who = w => t(w === 'hcp' ? 'whoHcp' : w === 'rep' ? 'whoRep' : 'whoNarrator');
      return `<figure class="lh-b lh-b--video">
        ${b.rendered ? `<video class="lh-video__player" src="${esc(tx(b.rendered))}${b.poster ? '' : '#t=1'}" ${b.poster ? `poster="${esc(tx(b.poster))}"` : ''} controls preload="metadata" playsinline></video>
          ${b.pending ? `<p class="lh-video__pending">${esc(t('blockVideoPendingMlr'))}</p>` : ''}`
          : `<div class="lh-video__poster"><span class="lh-video__play">${ICON.play}</span>
              <span class="lh-video__meta"><span class="lh-b__label">${esc(t('blockVideo'))}${secs ? ` · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : ''}</span>
              <strong class="lh-video__title">${esc(tx(b.title))}</strong>
              <span class="lh-video__note">${esc(t('blockVideoPending'))}</span></span></div>`}
        ${tx(b.caption) ? `<figcaption class="lh-video__caption">${esc(tx(b.caption))}</figcaption>` : ''}
        ${(b.scenes || []).length ? `<details class="lh-video__script"><summary>${esc(t('blockVideoScript'))}</summary>
          ${(b.scenes || []).map(sc => `<div class="lh-video__scene">${tx(sc?.onscreen) ? `<p class="lh-video__onscreen">${esc(tx(sc.onscreen))}</p>` : ''}
            ${(sc?.lines || []).map(ln => `<p><strong>${esc(who(ln?.who))}:</strong> ${esc(tx(ln?.text))}</p>`).join('')}</div>`).join('')}
        </details>` : ''}
        ${tx(b.transcript) ? `<details class="lh-video__script"><summary>${esc(t('blockVideoTranscript'))}</summary><p>${esc(tx(b.transcript))}</p></details>` : ''}
      </figure>`;
    }
    case 'check': {
      const name = `chk-${key}-${i}`;
      return `<section class="lh-b lh-b--check" data-check data-answer="${Number.isInteger(b.answer) ? b.answer : -1}">
        <p class="lh-b__label">${esc(t('blockCheck'))}</p>
        <p class="lh-b__q">${esc(tx(b.q))}</p>
        <div class="lh-options">${(b.options || []).map((o, k) => `<label class="lh-option"><input type="radio" name="${esc(name)}" value="${k}"><span>${esc(tx(o))}</span></label>`).join('')}</div>
        <div class="lh-b__reveal" data-reveal hidden><p class="lh-b__verdict" data-verdict></p>${paras(b.explanation)}</div>
      </section>`;
    }
    default:
      return '';
  }
}

// Each block sits in a layout-neutral wrapper (display: contents) carrying its index and type, so a reviewer's
// selection can be anchored to the block it was made in.
export function renderBlocks(blocks, key = 'x') {
  return (blocks || []).map((b, i) => `<div class="lh-bw" data-bi="${i}" data-bt="${esc(b?.type || '')}">${block(b, i, key)}</div>`).join('');
}

// A lesson stored in the old format (single body) still renders.
export function lessonBlocks(lesson) {
  return lesson.blocks?.length ? lesson.blocks : [{ type: 'text', heading: '', body: lesson.body }];
}

// Makes the "check yourself" questions interactive inside `root`.
export function wireBlocks(root) {
  root.querySelectorAll('[data-check]').forEach(box => {
    if (box.dataset.wired) return;
    box.dataset.wired = '1';
    box.addEventListener('change', e => {
      if (!e.target.matches('input[type=radio]')) return;
      const right = Number(e.target.value) === Number(box.dataset.answer);
      box.querySelectorAll('.lh-option').forEach((opt, k) => {
        opt.classList.toggle('lh-option--right', k === Number(box.dataset.answer));
        opt.classList.toggle('lh-option--wrong', !right && opt.contains(e.target));
      });
      box.querySelector('[data-verdict]').textContent = t(right ? 'checkRight' : 'checkWrong');
      box.querySelector('[data-reveal]').hidden = false;
    });
  });
}
