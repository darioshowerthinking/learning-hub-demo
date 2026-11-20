// Illustration library and data charts for lessons. Everything here is drawn from the approved
// (fictional) material: the AI only chooses WHICH visual goes where and writes the caption, so a
// figure can never carry a number or claim that MLR has not approved.
import { getLang } from './i18n.js';

const W = 720, H = 300;
const S = {
  en: {
    src: 'Source: Derolad® Core Product Summary (approved) · fictional data',
    fictional: 'Fictional pathway, for training only',
    // mechanism
    signal: 'ZN-7 signal', signalSub: 'inflammatory signal', inflam: 'Inflammation', nodules: 'Nodules and abscesses',
    derolad: 'Derolad', blocks: 'selectively blocks ZN-7',
    // dosing
    week: 'Week {n}', loading: 'Loading: 2 injections', one: '1 injection', every4: 'Then one injection every 4 weeks',
    autoinj: 'Prefilled autoinjector · patients can self-inject after training',
    // access
    bv: 'Benefits verification', pa: 'Prior authorization support', copay: 'Copay support',
    cm: 'A dedicated case manager works with the office', accessTitle: 'Zenetic Access Connect',
    // burden
    pain: 'Pain', stigma: 'Stigma', delay: 'Delayed diagnosis', burdenNote: 'Acknowledge the burden of HS before talking about the product',
    // visit flow
    f1: 'Acknowledge', f2: 'Ask', f3: 'Answer with approved information', f4: 'Check back', f5: 'Agree a next step',
    flowNote: 'The approved way to handle any objection',
    // safety
    s1: 'Screen for tuberculosis before starting', s2: 'Do not use with live vaccines',
    s3: 'Most common side effects: injection-site reactions (9%), upper respiratory infections (7%), headache (5%)',
    s4: 'Detailed questions: full prescribing information or Medical Information',
    // red lines
    r1: 'Never minimize risk', r1d: 'No "completely safe". Benefits always come with safety.',
    r2: 'Never overstate or compare', r2d: 'Approved figures only. No guarantees, no named or implied competitors.',
    r3: 'Never go off-label', r3d: 'Adults with moderate-to-severe HS, approved dosing only.',
    // patient fit
    p1: 'Adults with HS', p2: 'Moderate-to-severe HS', p3: 'Not fully controlled: still having painful flares',
    fitNote: 'Position Derolad as an option for patients who are not fully controlled',
    // charts
    resTitle: 'Clinical response at week 16', placebo: 'Placebo', resNote: 'ZEN-HS 1 and ZEN-HS 2 studies, 16 weeks',
    flaresBig: 'fewer painful flares', flaresSub: 'with Derolad vs placebo over 16 weeks',
    maintBig: 'kept their response through week 52', maintSub: 'of week-16 responders · open-label extension study',
    ae1: 'Injection-site reactions', ae2: 'Upper respiratory infections', ae3: 'Headache', aeTitle: 'Most common side effects',
  },
  es: {
    src: 'Fuente: Resumen de producto Derolad® (aprobado) · datos ficticios',
    fictional: 'Vía ficticia, solo para formación',
    signal: 'Señal ZN-7', signalSub: 'señal inflamatoria', inflam: 'Inflamación', nodules: 'Nódulos y abscesos',
    derolad: 'Derolad', blocks: 'bloquea ZN-7 de forma selectiva',
    week: 'Semana {n}', loading: 'Carga: 2 inyecciones', one: '1 inyección', every4: 'Después, una inyección cada 4 semanas',
    autoinj: 'Autoinyector precargado · el paciente puede autoinyectarse tras la formación',
    bv: 'Verificación de cobertura', pa: 'Apoyo en la autorización previa', copay: 'Apoyo con el copago',
    cm: 'Un gestor de casos dedicado trabaja con la consulta', accessTitle: 'Zenetic Access Connect',
    pain: 'Dolor', stigma: 'Estigma', delay: 'Diagnóstico tardío', burdenNote: 'Reconoce la carga de la HS antes de hablar del producto',
    f1: 'Reconocer', f2: 'Preguntar', f3: 'Responder con información aprobada', f4: 'Comprobar', f5: 'Acordar un siguiente paso',
    flowNote: 'La forma aprobada de responder a cualquier objeción',
    s1: 'Descartar tuberculosis antes de iniciar', s2: 'No usar con vacunas vivas',
    s3: 'Efectos adversos más frecuentes: reacciones en el lugar de inyección (9%), infecciones respiratorias altas (7%), cefalea (5%)',
    s4: 'Preguntas detalladas: ficha técnica o Información Médica',
    r1: 'Nunca minimizar el riesgo', r1d: 'Nada de "totalmente seguro". El beneficio siempre va con la seguridad.',
    r2: 'Nunca exagerar ni comparar', r2d: 'Solo cifras aprobadas. Sin garantías ni competidores nombrados o implícitos.',
    r3: 'Nunca fuera de indicación', r3d: 'Adultos con HS moderada a grave y la posología aprobada.',
    p1: 'Adultos con HS', p2: 'HS moderada a grave', p3: 'No controlados del todo: siguen con brotes dolorosos',
    fitNote: 'Posiciona Derolad como opción para pacientes no controlados del todo',
    resTitle: 'Respuesta clínica en la semana 16', placebo: 'Placebo', resNote: 'Estudios ZEN-HS 1 y ZEN-HS 2, 16 semanas',
    flaresBig: 'menos brotes dolorosos', flaresSub: 'con Derolad frente a placebo en 16 semanas',
    maintBig: 'mantuvo la respuesta hasta la semana 52', maintSub: 'de los respondedores de la semana 16 · estudio de extensión abierto',
    ae1: 'Reacciones en el lugar de inyección', ae2: 'Infecciones respiratorias altas', ae3: 'Cefalea', aeTitle: 'Efectos adversos más frecuentes',
  },
};
const s = (key, vars = {}) => (S[getLang()]?.[key] ?? S.en[key]).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const x = str => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Wraps text into <tspan> lines of at most `max` characters.
function lines(str, max) {
  const out = []; let cur = '';
  for (const w of String(str).split(/\s+/)) {
    if ((cur + ' ' + w).trim().length > max && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) out.push(cur);
  return out;
}
function text(xp, y, str, { cls = 'v-ink', size = 15, weight = 600, anchor = 'middle', max = 0, lh = 1.25 } = {}) {
  const ls = max ? lines(str, max) : [String(str)];
  return `<text x="${xp}" y="${y}" class="${cls}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${ls.map((l, i) => `<tspan x="${xp}" dy="${i ? size * lh : 0}">${x(l)}</tspan>`).join('')}</text>`;
}
const svg = (body, label, h = H) => `<svg viewBox="0 0 ${W} ${h}" role="img" aria-label="${x(label)}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const arrow = (x1, y1, x2, y2, cls = 'v-line') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}" stroke-width="3" marker-end="url(#v-arrow)"/>`;
const defs = `<defs><marker id="v-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="v-fill-line"/></marker></defs>`;

// Small glyphs (24x24 grid), drawn at (cx, cy) with scale k.
const glyph = {
  check: (cx, cy, k = 1, cls = 'v-stroke-good') => `<path transform="translate(${cx - 12 * k} ${cy - 12 * k}) scale(${k})" d="M5 12.5l4.5 4.5L19 7.5" fill="none" class="${cls}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  cross: (cx, cy, k = 1, cls = 'v-stroke-serious') => `<path transform="translate(${cx - 12 * k} ${cy - 12 * k}) scale(${k})" d="M6 6l12 12M18 6L6 18" fill="none" class="${cls}" stroke-width="2.6" stroke-linecap="round"/>`,
  search: (cx, cy, k = 1) => `<g transform="translate(${cx - 12 * k} ${cy - 12 * k}) scale(${k})" fill="none" class="v-stroke-indigo" stroke-width="2.2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/><path d="M8 10.5l2 2 3.5-4" /></g>`,
  doc: (cx, cy, k = 1) => `<g transform="translate(${cx - 12 * k} ${cy - 12 * k}) scale(${k})" fill="none" class="v-stroke-indigo" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></g>`,
  coin: (cx, cy, k = 1) => `<g transform="translate(${cx - 12 * k} ${cy - 12 * k}) scale(${k})" fill="none" class="v-stroke-indigo" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2c-.6-.8-1.5-1.2-2.6-1.2-1.6 0-2.7.8-2.7 2s1.2 1.7 2.7 2c1.6.3 2.8.9 2.8 2.1s-1.2 2-2.8 2c-1.2 0-2.2-.5-2.8-1.3M12 6.5V8M12 16v1.5"/></g>`,
  person: (cx, cy, k = 1, cls = 'v-stroke-indigo') => `<g transform="translate(${cx - 12 * k} ${cy - 12 * k}) scale(${k})" fill="none" class="${cls}" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/></g>`,
  flare: (cx, cy, k = 1) => `<g transform="translate(${cx - 12 * k} ${cy - 12 * k}) scale(${k})" fill="none" class="v-stroke-serious" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M13 2L5 13h6l-1 9 8-12h-6z"/></g>`,
  eye: (cx, cy, k = 1) => `<g transform="translate(${cx - 12 * k} ${cy - 12 * k}) scale(${k})" fill="none" class="v-stroke-indigo" stroke-width="2.2" stroke-linecap="round"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></g>`,
  clock: (cx, cy, k = 1) => `<g transform="translate(${cx - 12 * k} ${cy - 12 * k}) scale(${k})" fill="none" class="v-stroke-warn" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></g>`,
  shield: (cx, cy, k = 1) => `<g transform="translate(${cx - 12 * k} ${cy - 12 * k}) scale(${k})" fill="none" class="v-stroke-good" stroke-width="2.2" stroke-linejoin="round"><path d="M12 2.5l7.5 3v6c0 4.6-3.2 8.4-7.5 10-4.3-1.6-7.5-5.4-7.5-10v-6z"/></g>`,
  syringe: (cx, cy, k = 1) => `<g transform="translate(${cx - 12 * k} ${cy - 12 * k}) scale(${k})" fill="none" class="v-stroke-derolad" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="14" rx="2.5"/><path d="M12 16v6M10 6h4M10 9.5h4"/></g>`,
  book: (cx, cy, k = 1) => `<g transform="translate(${cx - 12 * k} ${cy - 12 * k}) scale(${k})" fill="none" class="v-stroke-indigo" stroke-width="2.2" stroke-linejoin="round"><path d="M4 4.5h6.5a2.5 2.5 0 0 1 2.5 2.5v13a2 2 0 0 0-2-2H4zM20 4.5h-6.5A2.5 2.5 0 0 0 11 7"/><path d="M13 20a2 2 0 0 1 2-2h5V4.5"/></g>`,
};
const card = (x0, y0, w, h, cls = 'v-card') => `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="16" class="${cls}"/>`;
const derolMark = (cx, cy, k = 1) => `<path transform="translate(${cx} ${cy}) scale(${k})" d="M0 -9L8 6H-8z" class="v-fill-derolad"/>`;

// ------------------------------- Illustrations -------------------------------
const VISUALS = {
  mechanism() {
    const y = 120;
    return svg(`${defs}
      ${card(20, 50, 190, 140, 'v-card v-card--indigo')}
      <g>${[[70, 95], [100, 80], [128, 100], [90, 118], [140, 128], [62, 132]].map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="9" class="v-fill-violet"/>`).join('')}</g>
      ${text(115, 162, s('signal'), { size: 17, weight: 700 })}${text(115, 181, s('signalSub'), { cls: 'v-muted', size: 13, weight: 500 })}
      ${arrow(212, y, 268, y, 'v-line v-faded')}
      <g class="v-faded">
        ${card(300, 50, 180, 140)}${glyph.flare(390, 100, 1.6)}${text(390, 160, s('inflam'), { size: 16, weight: 700 })}
        ${arrow(482, y, 528, y, 'v-line')}
        ${card(530, 50, 170, 140)}
        <circle cx="590" cy="104" r="16" class="v-fill-serious-soft"/><circle cx="628" cy="96" r="11" class="v-fill-serious-soft"/><circle cx="640" cy="124" r="8" class="v-fill-serious-soft"/>
        ${text(615, 160, s('nodules'), { size: 15, weight: 700, max: 16 })}
      </g>
      <rect x="226" y="30" width="58" height="180" rx="14" class="v-fill-derolad"/>
      ${derolMark(255, 70, 1.3)}
      ${glyph.cross(255, 160, 1.1, 'v-stroke-white')}
      ${text(255, 238, s('derolad'), { cls: 'v-derolad', size: 17, weight: 800 })}
      ${text(255, 258, s('blocks'), { cls: 'v-muted', size: 13, weight: 500 })}
      ${text(700, 288, s('fictional'), { cls: 'v-muted', size: 12, weight: 500, anchor: 'end' })}`, `${s('derolad')} ${s('blocks')}`);
  },

  dosing() {
    const y = 150, x0 = 70, step = 100, weeks = [0, 4, 8, 12, 16, 20, 24];
    return svg(`${defs}
      <line x1="${x0 - 20}" y1="${y}" x2="${x0 + step * 6 + 30}" y2="${y}" class="v-line" stroke-width="3" marker-end="url(#v-arrow)"/>
      ${weeks.map((w, i) => {
        const cx = x0 + i * step;
        const dots = i === 0
          ? `<circle cx="${cx}" cy="${y - 34}" r="13" class="v-fill-indigo"/><circle cx="${cx}" cy="${y - 64}" r="13" class="v-fill-indigo"/>`
          : `<circle cx="${cx}" cy="${y - 34}" r="13" class="v-fill-derolad"/>`;
        return `<line x1="${cx}" y1="${y - 8}" x2="${cx}" y2="${y + 8}" class="v-line" stroke-width="3"/>${dots}
          ${text(cx, y + 32, s('week', { n: w }), { cls: 'v-muted', size: 14, weight: 600 })}`;
      }).join('')}
      ${text(x0, 40, s('loading'), { size: 14, weight: 700, max: 14 })}
      <path d="M${x0 + step - 14} 92 V82 H${x0 + step * 6 + 14} V92" fill="none" class="v-stroke-derolad" stroke-width="2"/>
      ${text(x0 + step * 3.5, 72, s('every4'), { cls: 'v-derolad', size: 15, weight: 700 })}
      ${card(40, 214, 640, 58, 'v-card v-card--soft')}${glyph.syringe(76, 243, 1.2)}
      ${text(100, 248, s('autoinj'), { size: 14, weight: 600, anchor: 'start' })}`, s('every4'));
  },

  access() {
    const cards = [[s('bv'), glyph.search], [s('pa'), glyph.doc], [s('copay'), glyph.coin]];
    return svg(`${defs}
      ${text(360, 28, s('accessTitle'), { cls: 'v-indigo', size: 16, weight: 800 })}
      ${cards.map(([label, g], i) => {
        const x1 = 30 + i * 230;
        return `${card(x1, 46, 200, 118)}<circle cx="${x1 + 100}" cy="84" r="24" class="v-fill-soft"/>${g(x1 + 100, 84, 1.25)}
          ${text(x1 + 100, 130, label, { size: 15, weight: 700, max: 20 })}
          ${i < 2 ? arrow(x1 + 204, 105, x1 + 226, 105) : ''}
          <line x1="${x1 + 100}" y1="166" x2="${x1 + 100}" y2="206" class="v-line v-dash" stroke-width="2"/>`;
      }).join('')}
      ${card(30, 206, 660, 64, 'v-card v-card--indigo')}${glyph.person(76, 238, 1.3)}
      ${text(104, 244, s('cm'), { size: 16, weight: 700, anchor: 'start' })}`, s('accessTitle'));
  },

  burden() {
    const items = [[s('pain'), glyph.flare, 'v-fill-serious-soft'], [s('stigma'), glyph.eye, 'v-fill-soft'], [s('delay'), glyph.clock, 'v-fill-warn-soft']];
    return svg(`${items.map(([label, g, bg], i) => {
        const x1 = 30 + i * 230;
        return `${card(x1, 30, 200, 170)}<circle cx="${x1 + 100}" cy="92" r="40" class="${bg}"/>${g(x1 + 100, 92, 1.9)}
          ${text(x1 + 100, 168, label, { size: 19, weight: 800, max: 18 })}`;
      }).join('')}
      ${card(30, 220, 660, 54, 'v-card v-card--indigo')}
      ${text(360, 253, s('burdenNote'), { size: 16, weight: 700 })}`, s('burdenNote'));
  },

  'visit-flow'() {
    const steps = [s('f1'), s('f2'), s('f3'), s('f4'), s('f5')];
    return svg(`${defs}
      ${steps.map((label, i) => {
        const cx = 76 + i * 142;
        return `${i < 4 ? arrow(cx + 36, 110, cx + 104, 110) : ''}
          <circle cx="${cx}" cy="110" r="34" class="${i === 2 ? 'v-fill-derolad' : 'v-fill-indigo'}"/>
          ${text(cx, 119, i + 1, { cls: 'v-white', size: 24, weight: 800 })}
          ${text(cx, 172, label, { size: 15, weight: 700, max: 14 })}`;
      }).join('')}
      ${text(360, 36, s('flowNote'), { cls: 'v-muted', size: 15, weight: 600 })}`, s('flowNote'), 230);
  },

  safety() {
    const items = [[s('s1'), glyph.shield], [s('s2'), glyph.syringe], [s('s3'), glyph.check], [s('s4'), glyph.book]];
    return svg(`${items.map(([label, g], i) => {
        const x1 = 24 + (i % 2) * 344, y1 = 24 + Math.floor(i / 2) * 136;
        return `${card(x1, y1, 328, 120)}<circle cx="${x1 + 44}" cy="${y1 + 60}" r="26" class="v-fill-soft"/>${g(x1 + 44, y1 + 60, 1.3)}
          ${(() => {
            const long = label.length > 90, size = long ? 13.5 : 15, max = long ? 33 : 30;
            const n = lines(label, max).length, top = y1 + 60 - ((n - 1) * size * 1.25) / 2 + size * 0.35;
            return text(x1 + 84, top, label, { size, weight: 650, anchor: 'start', max });
          })()}`;
      }).join('')}`, s('s1'));
  },

  'red-lines'() {
    const items = [[s('r1'), s('r1d')], [s('r2'), s('r2d')], [s('r3'), s('r3d')]];
    return svg(`${items.map(([title, d], i) => {
        const x1 = 24 + i * 232;
        return `${card(x1, 30, 208, 236, 'v-card v-card--serious')}<circle cx="${x1 + 104}" cy="84" r="30" class="v-fill-serious-soft"/>${glyph.cross(x1 + 104, 84, 1.5)}
          ${text(x1 + 104, 148, title, { cls: 'v-serious', size: 17, weight: 800, max: 18 })}
          ${text(x1 + 104, 200, d, { cls: 'v-muted', size: 13.5, weight: 550, max: 26 })}`;
      }).join('')}`, `${s('r1')} · ${s('r2')} · ${s('r3')}`);
  },

  'patient-fit'() {
    const rows = [[s('p1'), 600, 'v-fill-soft', 'v-ink'], [s('p2'), 470, 'v-fill-violet-mid', 'v-ink'], [s('p3'), 340, 'v-fill-derolad', 'v-white']];
    return svg(`${rows.map(([label, w, bg, fg], i) => {
        const y1 = 26 + i * 70;
        return `<rect x="${360 - w / 2}" y="${y1}" width="${w}" height="58" rx="14" class="${bg}"/>
          ${text(360, y1 + 35, label, { cls: fg, size: label.length > 30 ? 14 : 16, weight: 700, max: Math.floor(w / 8.5) })}`;
      }).join('')}
      ${text(360, 268, s('fitNote'), { cls: 'v-indigo', size: 15, weight: 700 })}`, s('fitNote'));
  },
};

// ---------------------------------- Charts -----------------------------------
const CHARTS = {
  response() {
    const base = 230, max = 180, bars = [['Derolad', 58, 'v-fill-derolad'], [s('placebo'), 29, 'v-fill-grey']];
    return svg(`${[0, 25, 50, 75, 100].map(v => `<line x1="150" x2="590" y1="${base - (v / 100) * max}" y2="${base - (v / 100) * max}" class="v-grid"/>
        ${text(140, base - (v / 100) * max + 5, `${v}%`, { cls: 'v-muted', size: 12, weight: 500, anchor: 'end' })}`).join('')}
      ${bars.map(([label, v, cls], i) => {
        const bx = 230 + i * 200, h = (v / 100) * max;
        return `<rect x="${bx}" y="${base - h}" width="120" height="${h}" rx="10" class="${cls}"/>
          ${text(bx + 60, base - h - 12, `${v}%`, { size: 26, weight: 800, cls: i ? 'v-muted' : 'v-derolad' })}
          ${text(bx + 60, base + 26, label, { size: 15, weight: 700 })}`;
      }).join('')}
      ${text(360, 22, s('resTitle'), { size: 16, weight: 800 })}
      ${text(700, 290, s('resNote'), { cls: 'v-muted', size: 12, weight: 500, anchor: 'end' })}`, `${s('resTitle')}: Derolad 58%, ${s('placebo')} 29%`);
  },

  flares() {
    return svg(`${card(60, 40, 600, 210, 'v-card v-card--soft')}
      ${glyph.flare(150, 145, 3)}
      ${text(390, 140, '47%', { cls: 'v-derolad', size: 76, weight: 800 })}
      ${text(390, 182, s('flaresBig'), { size: 20, weight: 800 })}
      ${text(390, 210, s('flaresSub'), { cls: 'v-muted', size: 14, weight: 550 })}`, `47% ${s('flaresBig')} ${s('flaresSub')}`);
  },

  maintenance() {
    const r = 82, c = 2 * Math.PI * r, v = 0.81;
    return svg(`<circle cx="190" cy="150" r="${r}" fill="none" class="v-stroke-soft" stroke-width="26"/>
      <circle cx="190" cy="150" r="${r}" fill="none" class="v-stroke-derolad" stroke-width="26" stroke-linecap="round"
        stroke-dasharray="${(c * v).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 190 150)"/>
      ${text(190, 164, '81%', { cls: 'v-derolad', size: 40, weight: 800 })}
      ${text(330, 130, s('maintBig'), { size: 21, weight: 800, anchor: 'start', max: 26 })}
      ${text(330, 200, s('maintSub'), { cls: 'v-muted', size: 14, weight: 550, anchor: 'start', max: 40 })}`, `81% ${s('maintBig')}`);
  },

  'safety-ae'() {
    const rows = [[s('ae1'), 9], [s('ae2'), 7], [s('ae3'), 5]], scale = 36;
    return svg(`${text(360, 26, s('aeTitle'), { size: 16, weight: 800 })}
      ${rows.map(([label, v], i) => {
        const y1 = 58 + i * 72;
        return `${text(280, y1 + 27, label, { size: 15, weight: 650, anchor: 'end', max: 32 })}
          <rect x="300" y="${y1}" width="${10 * scale}" height="40" rx="10" class="v-fill-soft"/>
          <rect x="300" y="${y1}" width="${v * scale}" height="40" rx="10" class="v-fill-indigo"/>
          ${text(300 + v * scale + 12, y1 + 27, `${v}%`, { size: 18, weight: 800, anchor: 'start' })}`;
      }).join('')}`, `${s('aeTitle')}: ${rows.map(([l, v]) => `${l} ${v}%`).join(', ')}`);
  },
};

const CHART_SOURCE = { response: true, flares: true, maintenance: true, 'safety-ae': true };

export function renderVisual(id, caption) {
  const draw = VISUALS[id];
  if (!draw) return '';
  return `<figure class="lh-visual">${draw()}${caption ? `<figcaption>${x(caption)}</figcaption>` : ''}</figure>`;
}

export function renderChart(id, caption) {
  const draw = CHARTS[id];
  if (!draw) return '';
  return `<figure class="lh-visual lh-visual--chart">${draw()}
    <figcaption>${caption ? `${x(caption)}<br>` : ''}${CHART_SOURCE[id] ? `<span class="lh-visual__src">${x(s('src'))}</span>` : ''}</figcaption></figure>`;
}

export const VISUAL_IDS = Object.keys(VISUALS);
export const CHART_IDS = Object.keys(CHARTS);
