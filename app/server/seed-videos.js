// Sample instructional videos already on the platform (silent animated explainers, built from the approved
// material; fictional product). They appear in the seeded courses and in the studio's video library.
// The files are in public/media (MP4, H.264), one per language. On Azure the videos are served from Blob Storage
// (SAMPLE_MEDIA_BASE, a copy of public/media in videos/samples): video players stall on the app's own connection.
const t = (en, es) => ({ en, es });
const MEDIA_BASE = (process.env.SAMPLE_MEDIA_BASE || '/media').replace(/\/$/, '');
const media = name => t(`${MEDIA_BASE}/explainer-${name}-en.mp4`, `${MEDIA_BASE}/explainer-${name}-es.mp4`);
const poster = name => t(`/media/explainer-${name}-en.png`, `/media/explainer-${name}-es.png`);

export const VIDEO_LIBRARY = [
  {
    id: 'vid-mechanism', kind: 'sample', status: 'approved', seconds: 30, url: media('mechanism'), poster: poster('mechanism'), course: 'mod-essentials', lesson: 'l2',
    title: t('How Derolad® works', 'Cómo actúa Derolad®'),
    description: t('Silent animated explainer: the burden of HS, the ZN-7 mechanism and the dosing schedule.',
      'Animación sin voz: la carga de la HS, el mecanismo ZN-7 y la pauta de administración.'),
    transcript: t(
      'On screen: HS is more than skin deep: pain, stigma, delayed diagnosis. The ZN-7 signal drives nodules and abscesses (fictional pathway); Derolad selectively blocks ZN-7. Two loading injections at week 0, then one injection every 4 weeks; prefilled autoinjector, patients can self-inject after training. For adults with moderate-to-severe hidradenitis suppurativa. Source: Derolad® Core Product Summary (approved).',
      'En pantalla: la HS va más allá de la piel: dolor, estigma, diagnóstico tardío. La señal ZN-7 impulsa nódulos y abscesos (vía ficticia); Derolad bloquea de forma selectiva ZN-7. Dos inyecciones de carga en la semana 0 y después una cada 4 semanas; autoinyector precargado, autoinyección tras la formación. Para adultos con hidradenitis supurativa moderada a grave. Fuente: Resumen de producto Derolad® (aprobado).'),
  },
  {
    id: 'vid-results', kind: 'sample', status: 'approved', seconds: 36, url: media('results'), poster: poster('results'), course: 'mod-essentials', lesson: 'l3',
    title: t('Derolad® results in context', 'Resultados de Derolad® en contexto'),
    description: t('Silent animated explainer: week-16 response, flare reduction, long-term data and safety, presented together.',
      'Animación sin voz: respuesta en la semana 16, reducción de brotes, datos a largo plazo y seguridad, presentados juntos.'),
    transcript: t(
      'On screen: clinical response at week 16, 58% with Derolad vs 29% with placebo (fictional ZEN-HS 1 and 2 studies). 47% reduction in painful flares vs placebo. 81% of week-16 responders kept their response through week 52 (open-label extension study). Safety: injection-site reactions 9%, upper respiratory infections 7%, headache 5%. Screen for tuberculosis before starting; do not use with live vaccines. Present efficacy and safety together. Source: Derolad® Core Product Summary (approved).',
      'En pantalla: respuesta clínica en la semana 16, 58% con Derolad frente a 29% con placebo (estudios ficticios ZEN-HS 1 y 2). Reducción del 47% de los brotes dolorosos frente a placebo. El 81% de los respondedores de la semana 16 mantuvo la respuesta hasta la semana 52 (estudio de extensión abierta). Seguridad: reacciones en el lugar de inyección 9%, infecciones respiratorias altas 7%, cefalea 5%. Descartar tuberculosis antes de iniciar; no usar con vacunas vivas. Presenta eficacia y seguridad juntas. Fuente: Resumen de producto Derolad® (aprobado).'),
  },
  {
    id: 'vid-access', kind: 'sample', status: 'approved', seconds: 25, url: media('access'), poster: poster('access'), course: 'mod-access', lesson: 'l1',
    title: t('Zenetic Access Connect in 3 steps', 'Zenetic Access Connect en 3 pasos'),
    description: t('Silent animated explainer: benefits verification, prior authorization and copay support, with a dedicated case manager.',
      'Animación sin voz: verificación de cobertura, autorización previa y apoyo con el copago, con un gestor de casos dedicado.'),
    transcript: t(
      'On screen: Zenetic Access Connect, support from day one. 1. Benefits verification: checks the patient\'s coverage. 2. Prior authorization: help with the paperwork. 3. Copay support: helps patients with the cost. A dedicated case manager: the office does not carry the paperwork alone. Source: Approved Key Messages and Core Product Summary.',
      'En pantalla: Zenetic Access Connect, apoyo desde el primer día. 1. Verificación de cobertura: comprueba la cobertura del paciente. 2. Autorización previa: ayuda con el papeleo. 3. Apoyo con el copago: ayuda al paciente con el coste. Un gestor de casos dedicado: la consulta no carga sola con el papeleo. Fuente: Mensajes clave aprobados y Resumen de producto.'),
  },
];

// A lesson block for a video from the library (or an upload): the player, its description and transcript.
export function mediaBlock(item, videoId = item.id) {
  return {
    type: 'video', video: videoId, library: item.id, rev: item.at || item.id, seconds: item.seconds || null,
    rendered: item.url, poster: item.poster || null, title: item.title, caption: item.description || null, transcript: item.transcript || null,
    scenes: [], pending: item.status === 'pending',
  };
}

// The seeded courses show their sample videos right after the lesson's opening block.
export function withSampleVideos(mod) {
  for (const v of VIDEO_LIBRARY.filter(x => x.course === mod.id)) {
    const l = mod.sections.flatMap(s => s.lessons).find(x => x.id === v.lesson);
    if (!l?.blocks || l.blocks.some(b => b.type === 'video')) continue;
    l.blocks.splice(1, 0, mediaBlock(v));
  }
  return mod;
}
