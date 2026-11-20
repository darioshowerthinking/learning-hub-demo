// Demo seed: everything here is invented. Zenetic Pharma and Derolad do not exist,
// and no person, number or study below is real. build(now) returns a fresh state;
// "Reset demo" calls it again, so dates are always relative to `now`.

import { LESSON_CONTENT } from './seed-content.js';
import { withSampleVideos } from './seed-videos.js';
import { hesitancyModule } from './seed-back.js';
import { partPrints } from '../public/js/studio-rules.js';
import { LONGTERM_STUDIO } from './seed-projects.js';

const DAY = 86400000;

// Text fields that the UI shows are { en, es }.
const t = (en, es) => ({ en, es });

export const TEAMS = ['training', 'sales', 'marketing', 'mlr'];
export const PILLARS = ['product', 'messaging', 'objections'];

export const USERS = [
  { id: 'alex', role: 'learner', name: 'Alex Rivera', title: t('Sales Representative · Dermatology', 'Delegado/a de ventas · Dermatología'), initials: 'AR' },
  { id: 'jamie', role: 'creator', name: 'Jamie Chen', title: t('Training Content Lead', 'Responsable de contenidos de formación'), initials: 'JC' },
  { id: 'priya', role: 'approver', team: 'training', name: 'Priya Nair', title: t('Training Team · Approver', 'Equipo de Formación · Aprobador/a'), initials: 'PN' },
  { id: 'marcus', role: 'approver', team: 'sales', name: 'Marcus Webb', title: t('Sales Team · Approver', 'Equipo de Ventas · Aprobador/a'), initials: 'MW' },
  { id: 'elena', role: 'approver', team: 'marketing', name: 'Elena Torres', title: t('Marketing Team · Approver', 'Equipo de Marketing · Aprobador/a'), initials: 'ET' },
  { id: 'drlee', role: 'approver', team: 'mlr', name: 'Dr. Robin Lee', title: t('MLR Review · Approver', 'Revisión MLR · Aprobador/a'), initials: 'RL' },
  { id: 'avery', role: 'admin', name: 'Avery Brooks', title: t('Training Manager · Platform admin', 'Responsable de formación · Administración'), initials: 'AB' },
  { id: 'chris', role: 'manager', name: 'Chris Morgan', title: t('Field Force Manager · RBM', 'Responsable de fuerza de ventas · RBM'), initials: 'CM' },
];

// The "approved materials" every AI feature is grounded on. Fictional throughout.
export const PRODUCT = {
  name: 'Derolad®',
  indication: t(
    'Adults with moderate-to-severe hidradenitis suppurativa (HS).',
    'Adultos con hidradenitis supurativa (HS) moderada a grave.'),
  sources: [
    {
      id: 'src-core', title: t('Derolad® Core Product Summary (approved)', 'Resumen de producto Derolad® (aprobado)'),
      body: t(
`Derolad is a fictional monthly biologic for adults with moderate-to-severe hidradenitis suppurativa (HS).
Mechanism: selectively blocks the ZN-7 inflammatory signal, which drives nodule and abscess formation in HS (fictional pathway).
Dosing: two loading injections at week 0, then one subcutaneous injection every 4 weeks with a prefilled autoinjector. Patients can self-inject after training.
Efficacy (fictional ZEN-HS 1 and ZEN-HS 2 studies, 16 weeks): 58% of patients reached clinical response vs 29% with placebo. Painful flares were reduced by 47% vs placebo. Response was maintained through week 52 in 81% of week-16 responders (open-label extension).
Safety: the most common side effects were injection-site reactions (9%), upper respiratory infections (7%) and headache (5%). Screen for tuberculosis before starting. Do not use with live vaccines.
Support: Zenetic Access Connect helps offices with benefits verification, prior authorization and copay support, with a dedicated case manager.`,
`Derolad es un biológico mensual ficticio para adultos con hidradenitis supurativa (HS) moderada a grave.
Mecanismo: bloquea de forma selectiva la señal inflamatoria ZN-7, que impulsa la formación de nódulos y abscesos en la HS (vía ficticia).
Posología: dos inyecciones de carga en la semana 0 y después una inyección subcutánea cada 4 semanas con autoinyector precargado. Los pacientes pueden autoinyectarse tras la formación.
Eficacia (estudios ficticios ZEN-HS 1 y ZEN-HS 2, 16 semanas): el 58% de los pacientes alcanzó respuesta clínica frente al 29% con placebo. Los brotes dolorosos se redujeron un 47% frente a placebo. La respuesta se mantuvo hasta la semana 52 en el 81% de los respondedores de la semana 16 (extensión abierta).
Seguridad: los efectos adversos más frecuentes fueron reacciones en el lugar de inyección (9%), infecciones respiratorias altas (7%) y cefalea (5%). Descartar tuberculosis antes de iniciar. No usar con vacunas vivas.
Apoyo: Zenetic Access Connect ayuda a las consultas con la verificación de cobertura, la autorización previa y el copago, con un gestor de casos dedicado.`),
    },
    {
      id: 'src-messages', title: t('Approved Key Messages', 'Mensajes clave aprobados'),
      body: t(
`1. Control that lasts: more than half of patients reached clinical response at week 16, and most responders kept it through one year.
2. Monthly simplicity: one autoinjector every 4 weeks after loading, which fits the routine of patients who are tired of frequent treatments.
3. Support from day one: Zenetic Access Connect handles benefits verification and prior authorization so the office does not carry the paperwork alone.
Always: acknowledge the burden of HS (pain, stigma, delayed diagnosis) before talking about the product.`,
`1. Control duradero: más de la mitad de los pacientes alcanzó respuesta clínica en la semana 16 y la mayoría de los respondedores la mantuvo durante un año.
2. Sencillez mensual: un autoinyector cada 4 semanas tras la carga, que encaja en la rutina de pacientes cansados de tratamientos frecuentes.
3. Apoyo desde el primer día: Zenetic Access Connect gestiona la verificación de cobertura y la autorización previa para que la consulta no cargue sola con el papeleo.
Siempre: reconocer la carga de la HS (dolor, estigma, diagnóstico tardío) antes de hablar del producto.`),
    },
    {
      id: 'src-objections', title: t('Approved Objection Handler', 'Guía aprobada de objeciones'),
      body: t(
`"I already have patients on another biologic." Acknowledge their experience; ask how many patients still have painful flares; position Derolad as an option for patients who are not fully controlled, using the 47% flare reduction. Never compare directly with a named product.
"My patients don't want injections." Acknowledge; explain monthly dosing with an autoinjector after loading; offer the injection-training support.
"Prior authorization is a nightmare." Acknowledge; explain Zenetic Access Connect, a dedicated case manager and benefits verification.
"Show me long-term data." Share that 81% of week-16 responders maintained response through week 52 in the open-label extension; be clear it is an extension study.
"What about safety?" Share the most common side effects and the TB screening requirement; refer detailed questions to the full prescribing information or Medical Information.
Off-label or comparative questions: do not answer; offer a Medical Information request.`,
`"Ya tengo pacientes con otro biológico." Reconocer su experiencia; preguntar cuántos pacientes siguen con brotes dolorosos; posicionar Derolad para pacientes no controlados del todo, con la reducción del 47% de brotes. Nunca comparar directamente con un producto nombrado.
"Mis pacientes no quieren inyecciones." Reconocer; explicar la dosis mensual con autoinyector tras la carga; ofrecer el apoyo de formación en la inyección.
"La autorización previa es una pesadilla." Reconocer; explicar Zenetic Access Connect, el gestor de casos dedicado y la verificación de cobertura.
"Enséñame datos a largo plazo." El 81% de los respondedores de la semana 16 mantuvo la respuesta hasta la semana 52 en la extensión abierta; aclarar que es un estudio de extensión.
"¿Y la seguridad?" Compartir los efectos adversos más frecuentes y el cribado de tuberculosis; derivar preguntas detalladas a la ficha técnica o a Información Médica.
Preguntas fuera de indicación o comparativas: no responder; ofrecer una solicitud a Información Médica.`),
    },
  ],
};

// The objections a rep can choose to practise ("which one do you find hardest?").
export const OBJECTIONS = [
  { id: 'switch', text: t('"I already use another biologic for my HS patients."', '"Ya uso otro biológico para mis pacientes con HS."') },
  { id: 'injections', text: t('"My patients don\'t want injections."', '"Mis pacientes no quieren inyecciones."') },
  { id: 'access', text: t('"Prior authorization is a nightmare for my staff."', '"La autorización previa es una pesadilla para mi equipo."') },
  { id: 'longterm', text: t('"Show me long-term data."', '"Enséñame datos a largo plazo."') },
  { id: 'safety', text: t('"What about safety?"', '"¿Y la seguridad?"') },
];

// A final challenge's objection: one of OBJECTIONS, or the creator's own ("other", with objectionText), or null.
// The text has both languages (falling back to the one that exists until the module is translated).
export function objectionOf(boss) {
  if (!boss?.objection) return null;
  if (boss.objection !== 'other') return OBJECTIONS.find(o => o.id === boss.objection) || null;
  const x = boss.objectionText || {};
  const en = (x.en || x.es || '').trim(), es = (x.es || x.en || '').trim();
  return en ? { id: 'other', text: { en, es } } : null;
}

export const PERSONAS = [
  { id: 'reyes', name: 'Dr. Morgan Reyes', role: t('Dermatologist', 'Dermatólogo/a'), receptiveness: 'receptive', openness: 'open', difficulty: 'basic' },
  { id: 'blake', name: 'Dr. Jordan Blake', gender: 'man', role: t('Dermatologist', 'Dermatólogo'), receptiveness: 'skeptical', openness: 'cautious', difficulty: 'intermediate' },
  { id: 'kim', name: 'Taylor Kim', role: t('Practice Manager', 'Gerente de consulta'), receptiveness: 'receptive', openness: 'cautious', difficulty: 'advanced' },
];

// A module is a sequence of sections. Each section: lessons -> quiz -> final challenge (the "boss").
// The boss is configured by the content creator and reviewed with the module; learners never pick it.
// It unlocks when the section's lessons are done and its quiz is passed.
export const PASS = { quiz: 2 / 3, pillar: 70 };

function essentialsModule(now) {
  return {
    id: 'mod-essentials',
    status: 'published',
    title: t('Derolad® Essentials for HS', 'Derolad®: lo esencial en HS'),
    audience: t('Dermatology sales reps, new hires', 'Delegados de dermatología, nuevas incorporaciones'),
    objective: t('Know the approved Derolad story and handle the most common objections in an HS call.',
                 'Conocer el discurso aprobado de Derolad y manejar las objeciones más habituales en una visita de HS.'),
    pillars: PILLARS,
    sources: ['src-core', 'src-messages', 'src-objections'],
    sections: [
      {
        id: 's1',
        title: t('HS and the Derolad story', 'La HS y el discurso de Derolad'),
        lessons: [
          { id: 'l1', pillar: 'product', minutes: 3,
            title: t('HS: the burden behind the visit', 'HS: la carga detrás de la visita'),
            body: t('Hidradenitis suppurativa is a chronic, painful inflammatory skin disease. Many patients wait years for a diagnosis and live with stigma. Approved rule: acknowledge this burden before talking about any product.',
                    'La hidradenitis supurativa es una enfermedad inflamatoria crónica y dolorosa de la piel. Muchos pacientes esperan años un diagnóstico y conviven con el estigma. Regla aprobada: reconocer esta carga antes de hablar de cualquier producto.') },
          { id: 'l2', pillar: 'product', minutes: 4,
            title: t('How Derolad works and how it is dosed', 'Cómo actúa Derolad y su posología'),
            body: t('Derolad blocks the ZN-7 inflammatory signal (fictional). Two loading injections at week 0, then one autoinjector every 4 weeks. In the fictional ZEN-HS studies, 58% reached clinical response at week 16 vs 29% with placebo. Most common side effects: injection-site reactions (9%), upper respiratory infections (7%), headache (5%). Screen for TB before starting.',
                    'Derolad bloquea la señal inflamatoria ZN-7 (ficticia). Dos inyecciones de carga en la semana 0 y después un autoinyector cada 4 semanas. En los estudios ficticios ZEN-HS, el 58% alcanzó respuesta clínica en la semana 16 frente al 29% con placebo. Efectos adversos más frecuentes: reacciones en el lugar de inyección (9%), infecciones respiratorias altas (7%), cefalea (5%). Descartar tuberculosis antes de iniciar.') },
          { id: 'l3', pillar: 'messaging', minutes: 3,
            title: t('Three approved messages', 'Tres mensajes aprobados'),
            body: t('Control that lasts. Monthly simplicity. Support from day one. Use them in that order, only with the approved data behind each one, and keep safety in the conversation whenever you talk about benefits.',
                    'Control duradero. Sencillez mensual. Apoyo desde el primer día. Úsalos en ese orden, solo con los datos aprobados que respaldan cada uno, y mantén la seguridad en la conversación siempre que hables de beneficios.') },
        ],
        quiz: [
          { id: 'q1', pillar: 'product',
            q: t('How is Derolad dosed after the loading dose?', '¿Cómo se dosifica Derolad tras la dosis de carga?'),
            options: [t('Daily tablet', 'Comprimido diario'), t('One autoinjector every 4 weeks', 'Un autoinyector cada 4 semanas'), t('Infusion every 2 weeks', 'Infusión cada 2 semanas')],
            answer: 1 },
          { id: 'q2', pillar: 'messaging',
            q: t('What should you do before talking about Derolad?', '¿Qué debes hacer antes de hablar de Derolad?'),
            options: [t('Share the price', 'Compartir el precio'), t('Acknowledge the burden of HS', 'Reconocer la carga de la HS'), t('Compare it with their current biologic', 'Compararlo con su biológico actual')],
            answer: 1 },
          { id: 'q3', pillar: 'product',
            q: t('What must happen before a patient starts Derolad?', '¿Qué debe hacerse antes de que un paciente empiece Derolad?'),
            options: [t('A tuberculosis screening', 'Un cribado de tuberculosis'), t('A live vaccine', 'Una vacuna viva'), t('Two weeks without any treatment', 'Dos semanas sin ningún tratamiento')],
            answer: 0 },
        ],
        boss: {
          persona: 'reyes', objection: null, minutes: 4,
          brief: t('Dr. Reyes has heard of Derolad but knows little about it. Introduce it: the burden of HS first, then the approved story, with safety in the conversation.',
                   'La Dra. Reyes ha oído hablar de Derolad pero sabe poco. Preséntalo: primero la carga de la HS, después el discurso aprobado, con la seguridad presente en la conversación.'),
          opening: t('I\'ve heard the name. What is Derolad, and which of my patients is it for?', 'Me suena el nombre. ¿Qué es Derolad y para qué pacientes es?'),
        },
      },
      {
        id: 's2',
        title: t('When they already use a biologic', 'Cuando ya usan un biológico'),
        lessons: [
          { id: 'l4', pillar: 'objections', minutes: 4,
            title: t('"I already use another biologic"', '"Ya uso otro biológico"'),
            body: t('Acknowledge, then ask how many of their patients still have painful flares. Position Derolad for patients who are not fully controlled (47% fewer painful flares vs placebo). Never compare with a named product.',
                    'Reconoce y pregunta cuántos de sus pacientes siguen con brotes dolorosos. Posiciona Derolad para pacientes no controlados del todo (47% menos brotes dolorosos frente a placebo). Nunca compares con un producto nombrado.') },
          { id: 'l5', pillar: 'objections', minutes: 3,
            title: t('When they ask for more than you can say', 'Cuando te piden más de lo que puedes decir'),
            body: t('Comparative, off-label or detailed questions beyond the approved material get an honest answer: "I can\'t speak to that, but I can request it from Medical Information for you."',
                    'Las preguntas comparativas, fuera de indicación o con más detalle del aprobado tienen una respuesta honesta: "No puedo hablar de eso, pero puedo pedírselo a Información Médica."') },
        ],
        quiz: [
          { id: 'q4', pillar: 'objections',
            q: t('An HCP asks how Derolad compares with a named competitor. You…', 'Un médico pregunta cómo se compara Derolad con un competidor concreto. Tú…'),
            options: [t('Quote the competitor\'s data', 'Citas los datos del competidor'), t('Offer a Medical Information request', 'Ofreces una solicitud a Información Médica'), t('Say Derolad is better', 'Dices que Derolad es mejor')],
            answer: 1 },
          { id: 'q5', pillar: 'objections',
            q: t('The HCP says most patients are fine on their biologic. Your best first move is to…', 'El médico dice que la mayoría de sus pacientes están bien con su biológico. Tu mejor primer paso es…'),
            options: [t('Ask how many still have painful flares', 'Preguntar cuántos siguen con brotes dolorosos'), t('Say Derolad works for everyone', 'Decir que Derolad funciona en todos'), t('Move on to dosing', 'Pasar a la posología')],
            answer: 0 },
          { id: 'q6', pillar: 'product',
            q: t('Which figure supports positioning Derolad for patients who still flare?', '¿Qué dato respalda posicionar Derolad para pacientes que siguen con brotes?'),
            options: [t('47% fewer painful flares vs placebo', '47% menos brotes dolorosos frente a placebo'), t('100% flare-free at week 16', '100% sin brotes en la semana 16'), t('Twice as effective as other biologics', 'El doble de eficaz que otros biológicos')],
            answer: 0 },
        ],
        boss: {
          persona: 'blake', objection: 'switch', minutes: 5, mode: 'avatar',   // the live video avatar visit (typed chat where it is not set up)
          brief: t('Dr. Blake is skeptical, short on time and already uses another biologic. Handle the objection, stay within the approved material and earn a next step.',
                   'El Dr. Blake es escéptico, tiene poco tiempo y ya usa otro biológico. Maneja la objeción, mantente en el material aprobado y consigue un siguiente paso.'),
          opening: null,
        },
      },
    ],
    createdBy: 'jamie', createdAt: now - 40 * DAY, publishedAt: now - 30 * DAY,
    reviews: Object.fromEntries(TEAMS.map(team => [team, { state: 'approved', at: now - 31 * DAY }])),
    history: [],
  };
}

function accessModule(now) {
  // In review: Training and Sales approved; Marketing and MLR still to review. Lesson l2 holds a claim
  // that is not in the approved material ("guaranteed within 48 hours") for the MLR pre-check to catch.
  return {
    id: 'mod-access',
    status: 'in_review',
    round: 1,
    title: t('Navigating Access Conversations', 'Conversaciones sobre acceso'),
    audience: t('Dermatology sales reps', 'Delegados de dermatología'),
    objective: t('Help practice staff understand how Zenetic Access Connect reduces prior-authorization burden.',
                 'Ayudar al personal de la consulta a entender cómo Zenetic Access Connect reduce la carga de la autorización previa.'),
    pillars: PILLARS,
    sources: ['src-core', 'src-objections'],
    sections: [
      {
        id: 's1',
        title: t('Prior authorization without the pain', 'Autorización previa sin dolores de cabeza'),
        lessons: [
          { id: 'l1', pillar: 'product', minutes: 3,
            title: t('What Zenetic Access Connect does', 'Qué hace Zenetic Access Connect'),
            body: t('Benefits verification, prior-authorization support and copay help, with a dedicated case manager for each office.',
                    'Verificación de cobertura, apoyo en la autorización previa y ayuda con el copago, con un gestor de casos dedicado para cada consulta.') },
          { id: 'l2', pillar: 'objections', minutes: 4,
            title: t('"Prior authorization is a nightmare"', '"La autorización previa es una pesadilla"'),
            body: t('Acknowledge the staff workload. Explain that approvals are guaranteed within 48 hours with Zenetic Access Connect.',
                    'Reconoce la carga del equipo. Explica que las aprobaciones están garantizadas en 48 horas con Zenetic Access Connect.') },
        ],
        quiz: [
          { id: 'q1', pillar: 'product',
            q: t('Who does the office work with in Zenetic Access Connect?', '¿Con quién trabaja la consulta en Zenetic Access Connect?'),
            options: [t('A dedicated case manager', 'Un gestor de casos dedicado'), t('The patient\'s insurer directly', 'Directamente con la aseguradora'), t('The sales rep', 'El delegado')],
            answer: 0 },
        ],
        boss: {
          persona: 'kim', objection: 'access', minutes: 5,
          brief: t('Taylor Kim runs the office and dreads another prior-authorization process. Show how Zenetic Access Connect lightens the load.',
                   'Taylor Kim gestiona la consulta y teme otro proceso de autorización previa. Muestra cómo Zenetic Access Connect aligera la carga.'),
          opening: null,
        },
      },
    ],
    createdBy: 'jamie', createdAt: now - 6 * DAY, submittedAt: now - 3 * DAY,
    reviews: {
      training: { state: 'approved', at: now - 2 * DAY, by: 'priya' },
      sales: { state: 'approved', at: now - 2 * DAY, by: 'marcus' },
      marketing: { state: 'pending' },
      mlr: { state: 'pending' },
    },
    history: [{ at: now - 3 * DAY, by: 'jamie', action: 'submitted' }, { at: now - 2 * DAY, by: 'priya', action: 'approved', team: 'training' },
              { at: now - 2 * DAY, by: 'marcus', action: 'approved', team: 'sales' }],
  };
}

// Two projects in the creator's studio (drafts), so the dashboard starts with work in progress:
// one with materials and outline agreed and practice sessions being set up, one just created by the wizard.
function studioProjects(now) {
  const H = 3600000;
  const lt = LONGTERM_STUDIO;
  const longterm = {
    id: 'proj-longterm', status: 'draft', round: 0, pillars: PILLARS, sources: lt.spec.materials, sourceLang: 'en', translation: 'done',
    title: t(lt.spec.title, 'Conversaciones sobre datos a largo plazo'), audience: t('Dermatology sales reps · Experienced with Derolad', 'Delegados de dermatología · Con experiencia en Derolad'), objective: { en: lt.outline.objective },
    sections: [], createdBy: 'jamie', createdAt: now - 3 * DAY, updatedAt: now - 20 * H,
    history: [{ at: now - 3 * DAY, by: 'jamie', action: 'project_created' }],
    studio: {
      lang: 'en', spec: lt.spec,
      cards: {
        requirements: { state: 'complete', at: now - 3 * DAY }, materials: { state: 'complete', at: now - 3 * DAY + H },
        outline: { state: 'complete', at: now - 2 * DAY }, practice: { state: 'in_progress', at: now - 20 * H },
        videos: { state: 'todo' }, content: { state: 'todo' }, preview: { state: 'todo' },
      },
      outline: lt.outline, chat: lt.chat.map((m, i) => ({ ...m, at: now - 2 * DAY - (lt.chat.length - i) * 60000 })),
      practice: lt.practice, videos: [], notes: {},
    },
  };
  const safetySpec = {
    title: 'HS safety essentials for new hires',
    goal: 'New reps can bring safety into every Derolad conversation: TB screening, no live vaccines, the most common side effects, and when to refer to the prescribing information or Medical Information.',
    audience: { role: 'new_hires', roleOther: '', experience: 'new_hs', experienceOther: '', notes: '' },
    sections: [{ lessons: 3, minutes: 10, quiz: 5, practice: 'chat', practiceMinutes: 5 }],
    materials: ['src-core'], willUpload: true,
    videos: [{ topic: 'Safety essentials in 90 seconds', section: 1 }],
  };
  const safety = {
    id: 'proj-safety', status: 'draft', round: 0, pillars: PILLARS, sources: safetySpec.materials, sourceLang: 'en', translation: 'done',
    title: t(safetySpec.title, 'Lo esencial de seguridad en HS para nuevas incorporaciones'), audience: t('New hires (onboarding) · New to HS', 'Nuevas incorporaciones (onboarding) · Nuevos en HS'), objective: { en: safetySpec.goal },
    sections: [], createdBy: 'jamie', createdAt: now - 2 * H, updatedAt: now - 2 * H,
    history: [{ at: now - 2 * H, by: 'jamie', action: 'project_created' }],
    studio: {
      lang: 'en', spec: safetySpec,
      cards: Object.fromEntries(['requirements', 'materials', 'outline', 'practice', 'videos', 'content', 'preview'].map(k => [k, k === 'requirements' ? { state: 'complete', at: now - 2 * H } : { state: 'todo' }])),
      outline: null, chat: [], practice: [],
      videos: [{ id: 'v1', topic: safetySpec.videos[0].topic, section: 1, teach: '', aspects: '', conversation: '', style: 'presenter', script: null, lesson: null }],
      notes: {},
    },
  };
  return [longterm, safety];
}

// Team results for the manager view. Scores are 0-100 per pillar, quiz vs role-play.
function team(now) {
  const reps = [
    ['alex', 'Alex Rivera', [88, 74, 61], [80, 66, 48], 3],
    ['r2', 'Sam Okafor', [92, 85, 78], [86, 80, 72], 5],
    ['r3', 'Dana Whitfield', [79, 70, 52], [72, 58, 41], 2],
    ['r4', 'Luis Moreno', [85, 81, 69], [78, 74, 60], 4],
    ['r5', 'Kendra Shaw', [95, 88, 83], [90, 84, 79], 6],
    ['r6', 'Ben Hartley', [70, 64, 45], [62, 55, 38], 1],
  ];
  return reps.map(([id, name, quiz, roleplay, attempts]) => ({
    id, name,
    quiz: Object.fromEntries(PILLARS.map((p, i) => [p, quiz[i]])),
    roleplay: Object.fromEntries(PILLARS.map((p, i) => [p, roleplay[i]])),
    attempts, lastActive: now - (7 - attempts) * DAY,
  }));
}

// Seeded lessons get their deep, bilingual content (blocks) from seed-content.js; the short body stays
// only as the fallback for a lesson without generated content.
function deepLessons(mod) {
  const content = LESSON_CONTENT[mod.id] || {};
  for (const s of mod.sections) {
    s.lessons = s.lessons.map(l => (content[l.id] ? (({ body, ...rest }) => ({ ...rest, ...content[l.id] }))(l) : l));
  }
  return mod;
}

// Submitted modules remember what each part looked like, so the next round can show what changed.
const withPrints = mod => (mod.round ? { ...mod, prints: { round: mod.round, parts: partPrints(mod) } } : mod);

export function build(now = Date.now()) {
  return {
    version: 1,
    seededAt: now,
    modules: [hesitancyModule(now), ...studioProjects(now), ...[essentialsModule(now), accessModule(now)].map(deepLessons).map(withSampleVideos).map(withPrints)],
    materials: [],   // materials uploaded by creators (the built-in approved sources are in PRODUCT.sources)
    videos: [],      // videos uploaded by creators (the sample videos are in seed-videos.js)
    team: team(now),
    // Alex: section 1 done (quiz passed, final challenge beaten on the 2nd try);
    // section 2 lessons done, quiz not taken yet, so its final challenge is still locked.
    progress: {
      alex: {
        'mod-essentials': {
          lessonsDone: ['l1', 'l2', 'l3', 'l4', 'l5'],
          quizzes: { s1: { score: 3, total: 3, passed: true, at: now - 8 * DAY } },
          attempts: [
            { at: now - 7 * DAY, section: 's1', persona: 'reyes', passed: false, redLines: 1, scores: { product: 74, messaging: 61, objections: 66 } },
            { at: now - 5 * DAY, section: 's1', persona: 'reyes', passed: true, redLines: 0, scores: { product: 86, messaging: 78, objections: 74 } },
          ],
        },
      },
    },
  };
}
