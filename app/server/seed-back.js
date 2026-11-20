// Seeded module sent back by the reviewers (fictional): written with the studio AI (tools: scratchpad build-seed-back),
// with reviewer comments anchored to its text. Timestamps are stored as "how long before the demo was reset".
const DAY = 86400000;
const SNAPSHOT = {
 "id": "mod-hesitancy",
 "status": "changes_requested",
 "round": 1,
 "pillars": [
  "product",
  "messaging",
  "objections"
 ],
 "sources": [
  "src-core",
  "src-messages",
  "src-objections"
 ],
 "sourceLang": "en",
 "translation": "done",
 "title": {
  "en": "Injection hesitancy conversations",
  "es": "Conversaciones sobre la reticencia a las inyecciones"
 },
 "audience": {
  "en": "Dermatology sales reps · Experienced in dermatology, new to Derolad",
  "es": "Representantes de ventas en dermatología · Con experiencia en dermatología, nuevos en Derolad"
 },
 "objective": {
  "en": "Reps can answer \"My patients don't want injections\" by acknowledging the concern, explaining monthly dosing with the autoinjector after loading, offering injection-training support and keeping safety in the conversation.",
  "es": "Los representantes pueden responder a \"Mis pacientes no quieren inyecciones\" reconociendo la preocupación, explicando la dosificación mensual con el autoinyector tras la carga, ofreciendo apoyo en la formación para la inyección y manteniendo la seguridad en la conversación."
 },
 "sections": [
  {
   "id": "s1",
   "title": {
    "en": "Answering \"My patients don't want injections\"",
    "es": "Respondiendo a \"Mis pacientes no quieren inyecciones\""
   },
   "goal": {
    "en": "Reps can acknowledge injection concerns, explain the monthly autoinjector regimen, offer training support and keep safety part of the conversation.",
    "es": "Los representantes pueden reconocer las preocupaciones sobre las inyecciones, explicar el régimen mensual con autoinyector, ofrecer apoyo formativo y mantener la seguridad como parte de la conversación."
   },
   "lessons": [
    {
     "id": "l1",
     "pillar": "product",
     "minutes": 8,
     "title": {
      "en": "Understanding the concern and explaining monthly dosing",
      "es": "Comprender la preocupación y explicar la dosificación mensual"
     },
     "summary": {
      "en": "After this lesson you can acknowledge an HCP's injection concern, then explain what Derolad is and how monthly autoinjector dosing works, with safety kept in the conversation.",
      "es": "Al terminar esta lección podrás reconocer la preocupación de un profesional sanitario por las inyecciones y, a continuación, explicar qué es Derolad y cómo funciona la dosificación mensual con autoinyector, manteniendo la seguridad en la conversación."
     },
     "blocks": [
      {
       "type": "text",
       "heading": {
        "en": ""
       },
       "body": {
        "en": "You walk into a dermatology office and, before you open your folder, the physician says, \"My patients don't want injections.\" It is tempting to answer straight away with a dosing slide. Resist that. This is not a rejection of Derolad. It is a statement about what the physician hears in the exam room every week.\n\nHidradenitis suppurativa (HS) is a painful, often stigmatizing disease, and many patients wait a long time for a diagnosis. A patient who has lived with painful nodules and abscesses may be tired, guarded and wary of anything that sounds like one more burden. The physician knows this patient far better than you do.\n\nYour first job is to show you understand that reality. Only then does the product enter the conversation.",
        "es": "Entras en una consulta de dermatología y, antes de abrir tu carpeta, el médico dice: \"Mis pacientes no quieren inyecciones.\" Es tentador responder de inmediato con una diapositiva de dosificación. Resiste esa tentación. No es un rechazo a Derolad. Es una observación sobre lo que el médico escucha en la consulta cada semana.\n\nLa hidradenitis supurativa (HS) es una enfermedad dolorosa, a menudo estigmatizante, y muchos pacientes esperan mucho tiempo hasta recibir un diagnóstico. Un paciente que ha convivido con nódulos y abscesos dolorosos puede estar cansado, receloso y desconfiado de cualquier cosa que suene a una carga más. El médico conoce a este paciente mucho mejor que tú.\n\nTu primera tarea es demostrar que entiendes esa realidad. Solo entonces el producto entra en la conversación."
       }
      },
      {
       "type": "video",
       "video": "v1",
       "library": "vid-mechanism",
       "rev": {
        "__ago": 93596
       },
       "seconds": 30,
       "rendered": {
        "en": "/media/explainer-mechanism-en.mp4",
        "es": "/media/explainer-mechanism-es.mp4"
       },
       "poster": {
        "en": "/media/explainer-mechanism-en.png",
        "es": "/media/explainer-mechanism-es.png"
       },
       "title": {
        "en": "How Derolad® works",
        "es": "Cómo actúa Derolad®"
       },
       "caption": {
        "en": "Silent animated explainer: the burden of HS, the ZN-7 mechanism and the dosing schedule.",
        "es": "Animación sin voz: la carga de la HS, el mecanismo ZN-7 y la pauta de administración."
       },
       "transcript": {
        "en": "On screen: HS is more than skin deep: pain, stigma, delayed diagnosis. The ZN-7 signal drives nodules and abscesses (fictional pathway); Derolad selectively blocks ZN-7. Two loading injections at week 0, then one injection every 4 weeks; prefilled autoinjector, patients can self-inject after training. For adults with moderate-to-severe hidradenitis suppurativa. Source: Derolad® Core Product Summary (approved).",
        "es": "En pantalla: la HS va más allá de la piel: dolor, estigma, diagnóstico tardío. La señal ZN-7 impulsa nódulos y abscesos (vía ficticia); Derolad bloquea de forma selectiva ZN-7. Dos inyecciones de carga en la semana 0 y después una cada 4 semanas; autoinyector precargado, autoinyección tras la formación. Para adultos con hidradenitis supurativa moderada a grave. Fuente: Resumen de producto Derolad® (aprobado)."
       },
       "scenes": [],
       "pending": false
      },
      {
       "type": "why",
       "body": {
        "en": "If you jump to features, the physician hears a script and the concern goes unanswered. When you name the burden of HS and respect the physician's experience first, you show you understand the patients they treat. That earns you the chance to explain the regimen, and it keeps the conversation about patients rather than about your product.",
        "es": "Si saltas directamente a las características, el médico percibe un guion y su preocupación queda sin respuesta. Cuando nombras la carga de la HS y respetas primero la experiencia del médico, demuestras que entiendes a los pacientes que atiende. Eso te da la oportunidad de explicar la pauta y mantiene la conversación centrada en los pacientes y no en tu producto."
       }
      },
      {
       "type": "visual",
       "visual": "burden",
       "caption": {
        "en": "Start here every time: pain, stigma and delayed diagnosis. Acknowledge the burden of HS before you say anything about Derolad.",
        "es": "Empieza siempre por aquí: dolor, estigma y diagnóstico tardío. Reconoce la carga de la HS antes de decir nada sobre Derolad."
       }
      },
      {
       "type": "text",
       "heading": {
        "en": "Explain what Derolad is, then how it is given",
        "es": "Explica qué es Derolad y después cómo se administra"
       },
       "body": {
        "en": "Once you have acknowledged the concern, give a short, accurate description. Derolad is a monthly biologic for adults with moderate-to-severe HS. It selectively blocks the ZN-7 inflammatory signal, which drives nodule and abscess formation in HS (a fictional pathway). Keep it that simple. Stay within the approved population: adults with moderate-to-severe HS.\n\nThen address the actual worry, which is the injection. Dosing is two loading injections at week 0, then one subcutaneous injection every 4 weeks with a prefilled autoinjector. Be precise about the loading step. Do not blur it into \"just one shot a month\", because the physician will notice the omission and trust you less.\n\nThe approved message is monthly simplicity: after loading, one autoinjector every 4 weeks fits the routine of patients who are tired of frequent treatments. Present it as a fit with patients' lives, not as a promise that every patient will be comfortable with injections.",
        "es": "Una vez que hayas reconocido la preocupación, ofrece una descripción breve y precisa. Derolad es un biológico mensual para adultos con HS de moderada a grave. Bloquea de forma selectiva la señal inflamatoria ZN-7, que impulsa la formación de nódulos y abscesos en la HS (una vía ficticia). Mantenlo así de sencillo. Ajústate a la población aprobada: adultos con HS de moderada a grave.\n\nDespués, aborda la preocupación real, que es la inyección. La dosificación consiste en dos inyecciones de carga en la semana 0, seguidas de una inyección subcutánea cada 4 semanas con un autoinyector precargado. Sé preciso con el paso de carga. No lo diluyas en \"solo una inyección al mes\", porque el médico notará la omisión y confiará menos en ti.\n\nEl mensaje aprobado es la sencillez mensual: tras la carga, un autoinyector cada 4 semanas encaja en la rutina de pacientes cansados de tratamientos frecuentes. Preséntalo como un encaje con la vida de los pacientes, no como una promesa de que todos los pacientes se sentirán cómodos con las inyecciones."
       }
      },
      {
       "type": "visual",
       "visual": "dosing",
       "caption": {
        "en": "Two loading injections at week 0, then one injection every 4 weeks with a prefilled autoinjector. Say the loading step out loud.",
        "es": "Dos inyecciones de carga en la semana 0, y después una inyección cada 4 semanas con un autoinyector precargado. Di el paso de carga en voz alta."
       }
      },
      {
       "type": "example",
       "title": {
        "en": "From worry to a clear regimen",
        "es": "De la preocupación a una pauta clara"
       },
       "context": {
        "en": "Mid-morning visit with a dermatologist who sees many HS patients and has just said her patients resist injections.",
        "es": "Visita a media mañana con una dermatóloga que atiende a muchos pacientes con HS y que acaba de decir que sus pacientes se resisten a las inyecciones."
       },
       "lines": [
        {
         "who": "hcp",
         "text": {
          "en": "Honestly, my patients don't want injections.",
          "es": "Sinceramente, mis pacientes no quieren inyecciones."
         }
        },
        {
         "who": "rep",
         "text": {
          "en": "That makes sense. Many of your HS patients have lived with pain and delayed diagnosis, so more treatment burden is a real worry.",
          "es": "Tiene sentido. Muchos de sus pacientes con HS llevan tiempo conviviendo con el dolor y un diagnóstico tardío, así que una carga adicional de tratamiento es una preocupación real."
         }
        },
        {
         "who": "hcp",
         "text": {
          "en": "Exactly. They are exhausted by the disease already.",
          "es": "Exacto. Ya están agotados por la enfermedad."
         }
        },
        {
         "who": "rep",
         "text": {
          "en": "Could I ask which part worries them most, the needle or how often it happens?",
          "es": "¿Puedo preguntarle qué le preocupa más, la aguja o con qué frecuencia ocurre?"
         }
        },
        {
         "who": "hcp",
         "text": {
          "en": "Mostly how often. Nobody wants frequent treatments.",
          "es": "Sobre todo la frecuencia. Nadie quiere tratamientos frecuentes."
         }
        },
        {
         "who": "rep",
         "text": {
          "en": "Then this may be relevant. Derolad is a monthly biologic for adults with moderate-to-severe HS. After two loading injections at week 0, it is one injection every 4 weeks with a prefilled autoinjector.",
          "es": "Entonces esto puede ser relevante. Derolad es un biológico mensual para adultos con HS de moderada a grave. Tras dos inyecciones de carga en la semana 0, pasa a ser una inyección cada 4 semanas con un autoinyector precargado."
         }
        },
        {
         "who": "hcp",
         "text": {
          "en": "So after loading it is monthly. Do patients do it themselves?",
          "es": "Entonces, tras la carga, es mensual. ¿Los pacientes se lo administran ellos mismos?"
         }
        },
        {
         "who": "rep",
         "text": {
          "en": "They can self-inject after training. Would it help if I explained how that works, and I can also cover safety information with you?",
          "es": "Pueden autoinyectarse tras recibir formación. ¿Le ayudaría que le explicara cómo funciona? Y también puedo tratar con usted la información de seguridad."
         }
        },
        {
         "who": "hcp",
         "text": {
          "en": "Yes, go ahead with both.",
          "es": "Sí, adelante con las dos cosas."
         }
        }
       ],
       "debrief": {
        "en": "The rep opens by acknowledging HS burden in the second line, before any product talk. The question in the fourth line uncovers that frequency, not the needle, is the concern, so the monthly message in the sixth line lands precisely. The loading injections are stated plainly, and the last rep line keeps safety on the agenda rather than leaving it out.",
        "es": "El representante abre reconociendo la carga de la HS en la segunda línea, antes de hablar del producto. La pregunta de la cuarta línea revela que la frecuencia, no la aguja, es la preocupación, así que el mensaje mensual de la sexta línea encaja con precisión. Las inyecciones de carga se exponen con claridad, y la última línea del representante mantiene la seguridad en la agenda en lugar de omitirla."
       }
      },
      {
       "type": "callout",
       "tone": "compliance",
       "body": {
        "en": "Whenever you present the monthly benefit, safety is part of the conversation. Do not describe Derolad as painless or easy for every patient, and do not compare it with any named product. Detailed safety is covered in the next lesson; for now, never present the regimen without signaling that you will share safety information.",
        "es": "Siempre que presentes el beneficio mensual, la seguridad forma parte de la conversación. No describas Derolad como indoloro ni fácil para todos los pacientes, y no lo compares con ningún producto nombrado. La información detallada de seguridad se trata en la siguiente lección; por ahora, nunca presentes la pauta sin indicar que compartirás información de seguridad."
       }
      },
      {
       "type": "check",
       "q": {
        "en": "A physician says her patients do not want injections. What is the best first response?",
        "es": "Un médico dice que sus pacientes no quieren inyecciones. ¿Cuál es la mejor primera respuesta?"
       },
       "options": [
        {
         "en": "Show the dosing timeline and explain the autoinjector.",
         "es": "Muestra el calendario posológico y explica el autoinyector."
        },
        {
         "en": "Acknowledge the burden of HS and her experience, then ask what worries patients most.",
         "es": "Reconoce la carga de la HS y la experiencia de la médica, y luego pregunta qué es lo que más preocupa a los pacientes."
        },
        {
         "en": "Tell her the autoinjector is easy and patients will be fine.",
         "es": "Dile que el autoinyector es fácil y que los pacientes estarán bien."
        }
       ],
       "answer": 1,
       "explanation": {
        "en": "Acknowledge first and ask a question to understand the concern. Jumping to dosing ignores the concern, and promising patients will be fine is an overstatement.",
        "es": "Reconoce primero y haz una pregunta para entender la preocupación. Pasar directamente a la posología ignora la preocupación, y prometer que los pacientes estarán bien es una exageración."
       }
      },
      {
       "type": "keypoints",
       "heading": {
        "en": "Remember",
        "es": "Recuerda"
       },
       "items": [
        {
         "en": "Acknowledge the burden of HS (pain, stigma, delayed diagnosis) and the physician's experience before talking about Derolad.",
         "es": "Reconoce la carga de la HS (dolor, estigma, diagnóstico tardío) y la experiencia del médico antes de hablar de Derolad."
        },
        {
         "en": "Derolad is a monthly biologic for adults with moderate-to-severe HS that selectively blocks the ZN-7 signal driving nodules and abscesses.",
         "es": "Derolad es un biológico mensual para adultos con HS de moderada a grave que bloquea selectivamente la señal ZN-7 que impulsa los nódulos y los abscesos."
        },
        {
         "en": "Dosing: two loading injections at week 0, then one subcutaneous injection every 4 weeks with a prefilled autoinjector.",
         "es": "Posología: dos inyecciones de carga en la semana 0 y, después, una inyección subcutánea cada 4 semanas con un autoinyector precargado."
        },
        {
         "en": "Monthly simplicity fits patients tired of frequent treatments.",
         "es": "La simplicidad mensual encaja con pacientes cansados de los tratamientos frecuentes."
        },
        {
         "en": "Always state the loading step and keep safety part of the conversation.",
         "es": "Indica siempre el paso de carga y mantén la seguridad dentro de la conversación."
        }
       ]
      }
     ],
     "sources": [
      "src-core",
      "src-messages",
      "src-objections"
     ]
    },
    {
     "id": "l2",
     "pillar": "objections",
     "minutes": 8,
     "title": {
      "en": "Offering training support and keeping safety in the conversation",
      "es": "Ofrecer apoyo formativo y mantener la seguridad en la conversación"
     },
     "summary": {
      "en": "After this lesson you can answer \"My patients don't want injections\" by acknowledging the concern, explaining monthly autoinjector dosing, offering injection-training support and keeping safety part of the same conversation.",
      "es": "Tras esta lección podrás responder a «Mis pacientes no quieren inyecciones» reconociendo la preocupación, explicando la pauta mensual con autoinyector, ofreciendo apoyo para la formación en la autoinyección y manteniendo la seguridad como parte de la misma conversación."
     },
     "blocks": [
      {
       "type": "text",
       "heading": {
        "en": ""
       },
       "body": {
        "en": "You are in a dermatology clinic between patients. The dermatologist has just said, \"My patients don't want injections.\" It can sound like a closed door, but it is usually an honest observation from someone who sees how much HS already asks of patients: pain, stigma and often years of delay before a diagnosis.\n\nYour first job is not to defend the product. It is to show that you understand the concern and the burden behind it. When the HCP feels heard, they are far more willing to listen to what comes next.",
        "es": "Estás en una consulta de dermatología entre pacientes. La dermatóloga acaba de decir: «Mis pacientes no quieren inyecciones». Puede sonar como una puerta cerrada, pero normalmente es una observación sincera de alguien que ve lo mucho que la HS ya exige a los pacientes: dolor, estigma y, a menudo, años de demora hasta el diagnóstico.\n\nTu primera tarea no es defender el producto. Es mostrar que comprendes la preocupación y la carga que hay detrás. Cuando el profesional sanitario se siente escuchado, está mucho más dispuesto a escuchar lo que viene después."
       }
      },
      {
       "type": "text",
       "heading": {
        "en": "From acknowledgment to a practical answer",
        "es": "Del reconocimiento a una respuesta práctica"
       },
       "body": {
        "en": "The approved path has four moves. Acknowledge the concern. Explain the regimen: Derolad is two loading injections at week 0, then one subcutaneous injection every 4 weeks with a prefilled autoinjector. Offer the injection-training support, because patients can self-inject after training. Then keep safety in the conversation.\n\nNotice what the answer does. It does not dismiss the worry about needles, and it does not promise that patients will be comfortable. It gives the HCP concrete facts about how often patients inject, what device they use and what help is available, so the HCP can judge fit for their own patients.\n\nThe monthly rhythm connects to Key Message 2: one autoinjector every 4 weeks after loading, which fits the routine of patients who are tired of frequent treatments. Say it as a description of the routine, not as a guarantee about how any patient will feel.",
        "es": "El camino aprobado tiene cuatro pasos. Reconoce la preocupación. Explica la pauta: Derolad consiste en dos inyecciones de carga en la semana 0 y, después, una inyección subcutánea cada 4 semanas con un autoinyector precargado. Ofrece el apoyo para la formación en la inyección, porque los pacientes pueden autoinyectarse tras la formación. Y, por último, mantén la seguridad en la conversación.\n\nFíjate en lo que hace la respuesta. No resta importancia al temor a las agujas y no promete que los pacientes vayan a sentirse cómodos. Da al profesional sanitario datos concretos sobre con qué frecuencia se inyectan los pacientes, qué dispositivo usan y qué ayuda está disponible, para que pueda valorar si encaja con sus propios pacientes.\n\nEl ritmo mensual se relaciona con el Mensaje Clave 2: un autoinyector cada 4 semanas tras la fase de carga, que encaja con la rutina de pacientes cansados de tratamientos frecuentes. Preséntalo como la descripción de una rutina, no como una garantía sobre cómo se sentirá cada paciente."
       }
      },
      {
       "type": "why",
       "body": {
        "en": "Injection hesitancy is rarely about the needle alone. It is about the patient's day-to-day life and the HCP's wish not to add to a burden that is already heavy. When you acknowledge that, then offer something practical such as training, you turn a worry into a plan. When you add safety, you show the HCP you are a trustworthy source, not someone who only talks about benefits.",
        "es": "La reticencia a las inyecciones rara vez se debe solo a la aguja. Tiene que ver con la vida diaria del paciente y con el deseo del profesional sanitario de no añadir más carga a una situación que ya es pesada. Cuando reconoces eso y luego ofreces algo práctico, como la formación, conviertes una preocupación en un plan. Cuando añades la seguridad, demuestras al profesional sanitario que eres una fuente fiable y no alguien que solo habla de beneficios."
       }
      },
      {
       "type": "example",
       "title": {
        "en": "Hesitancy at the clinic door",
        "es": "Reticencia al final de la consulta"
       },
       "context": {
        "en": "A dermatologist who has treated HS for years says patients push back on injections. You have two minutes at the end of her clinic.",
        "es": "Una dermatóloga que lleva años tratando la HS afirma que sus pacientes rechazan las inyecciones. Tienes dos minutos al final de su consulta."
       },
       "lines": [
        {
         "who": "hcp",
         "text": {
          "en": "Honestly, my patients don't want injections. They have had enough.",
          "es": "Sinceramente, mis pacientes no quieren inyecciones. Ya han tenido bastante."
         }
        },
        {
         "who": "rep",
         "text": {
          "en": "That makes sense. HS already brings pain, stigma and often a long wait for a diagnosis, so adding treatment burden is a real concern.",
          "es": "Tiene sentido. La HS ya conlleva dolor, estigma y, a menudo, una larga espera hasta el diagnóstico, así que añadir carga de tratamiento es una preocupación real."
         }
        },
        {
         "who": "hcp",
         "text": {
          "en": "Exactly. I don't want to make their lives harder.",
          "es": "Exacto. No quiero hacerles la vida más difícil."
         }
        },
        {
         "who": "rep",
         "text": {
          "en": "For adults with moderate-to-severe HS, Derolad is two loading injections at week 0, then one injection every 4 weeks with a prefilled autoinjector.",
          "es": "Para adultos con HS de moderada a grave, Derolad consiste en dos inyecciones de carga en la semana 0 y, después, una inyección cada 4 semanas con un autoinyector precargado."
         }
        },
        {
         "who": "hcp",
         "text": {
          "en": "And who gives it? I don't have time to teach everyone.",
          "es": "¿Y quién la administra? No tengo tiempo para enseñarle a todo el mundo."
         }
        },
        {
         "who": "rep",
         "text": {
          "en": "Patients can self-inject after training, and we can offer injection-training support so your team is not carrying that alone.",
          "es": "Los pacientes pueden autoinyectarse tras la formación, y podemos ofrecer apoyo formativo para que tu equipo no tenga que asumirlo solo."
         }
        },
        {
         "who": "hcp",
         "text": {
          "en": "What about side effects?",
          "es": "¿Y qué pasa con los efectos adversos?"
         }
        },
        {
         "who": "rep",
         "text": {
          "en": "The most common were injection-site reactions at 9%, upper respiratory infections at 7% and headache at 5%. Patients are screened for tuberculosis before starting, and Derolad is not used with live vaccines.",
          "es": "Las reacciones en el lugar de la inyección, con un 9 %, las infecciones de las vías respiratorias superiores, con un 7 %, y la cefalea, con un 5 %, fueron las más frecuentes. Los pacientes se someten a un cribado de tuberculosis antes de empezar, y Derolad no se usa con vacunas de virus vivos."
         }
        },
        {
         "who": "hcp",
         "text": {
          "en": "Okay. Can you send me the details?",
          "es": "Vale. ¿Me puedes enviar los detalles?"
         }
        },
        {
         "who": "rep",
         "text": {
          "en": "Of course. For detailed safety questions, the full prescribing information or Medical Information is the best source. Shall I set up a training session for your team?",
          "es": "Por supuesto. Para preguntas detalladas sobre seguridad, la ficha técnica completa o Información Médica es la mejor fuente. ¿Le preparo una sesión de formación para su equipo?"
         }
        }
       ],
       "debrief": {
        "en": "The rep opens by acknowledging the burden of HS (line 2), and does not argue. The regimen is explained plainly in line 4. Line 6 answers the time worry with the training offer. In line 8 safety arrives alongside the benefit, with exact figures and the TB and live-vaccine points. Line 10 refers detail to the prescribing information or Medical Information and ends with a clear next step.",
        "es": "El visitante empieza reconociendo la carga que supone la HS (línea 2) y no discute. El régimen se explica con claridad en la línea 4. La línea 6 responde a la preocupación por el tiempo con la oferta de formación. En la línea 8, la seguridad aparece junto con el beneficio, con cifras exactas y los puntos sobre tuberculosis y vacunas de virus vivos. La línea 10 remite el detalle a la ficha técnica o a Información Médica y termina con un siguiente paso claro."
       }
      },
      {
       "type": "dodont",
       "items": [
        {
         "say": {
          "en": "I understand. Many patients are tired of treatment burden. Here is how the monthly autoinjector works after loading.",
          "es": "Entiendo. Muchos pacientes están cansados de la carga del tratamiento. Así funciona el autoinyector mensual una vez cargado."
         },
         "avoid": {
          "en": "Our autoinjector is so easy, patients won't mind at all.",
          "es": "Nuestro autoinyector es tan fácil que a los pacientes no les importará en absoluto."
         },
         "why": {
          "en": "It dismisses the concern and promises an experience the material does not support.",
          "es": "Esto minimiza la preocupación y promete una experiencia que el material no respalda."
         }
        },
        {
         "say": {
          "en": "Patients can self-inject after training, and we can offer injection-training support.",
          "es": "Los pacientes pueden autoinyectarse tras la formación, y podemos ofrecer apoyo para la formación en la inyección."
         },
         "avoid": {
          "en": "Your patients will just do it at home, no problem.",
          "es": "Sus pacientes lo harán en casa sin ningún problema."
         },
         "why": {
          "en": "Self-injection depends on training, so the support offer is part of the accurate answer.",
          "es": "La autoinyección depende de la formación, así que la oferta de apoyo forma parte de una respuesta precisa."
         }
        },
        {
         "say": {
          "en": "The most common side effects were injection-site reactions (9%), upper respiratory infections (7%) and headache (5%).",
          "es": "Los efectos adversos más frecuentes fueron las reacciones en el lugar de la inyección (9 %), las infecciones de las vías respiratorias superiores (7 %) y la cefalea (5 %)."
         },
         "avoid": {
          "en": "It is very well tolerated, nothing to worry about.",
          "es": "Se tolera muy bien, no hay nada de qué preocuparse."
         },
         "why": {
          "en": "Minimizing risk is a red line. Give the actual figures.",
          "es": "Minimizar el riesgo es una línea roja. Da las cifras reales."
         }
        },
        {
         "say": {
          "en": "I cannot answer that here, but I can send a Medical Information request.",
          "es": "No puedo responder a eso aquí, pero puedo enviar una solicitud a Información Médica."
         },
         "avoid": {
          "en": "Other products need more injections, so this one is better.",
          "es": "Otros productos necesitan más inyecciones, así que este es mejor."
         },
         "why": {
          "en": "Comparative and off-label questions are not answered. Never compare with a named product.",
          "es": "Las preguntas comparativas y fuera de indicación no se responden. Nunca compares con un producto concreto."
         }
        }
       ]
      },
      {
       "type": "visual",
       "visual": "safety",
       "caption": {
        "en": "Keep these essentials in mind every time you mention the benefit: TB screening, no live vaccines, the common side effects and where to refer detailed questions.",
        "es": "Ten presentes estos elementos esenciales cada vez que menciones el beneficio: cribado de tuberculosis, no usar vacunas de virus vivos, los efectos adversos más frecuentes y dónde derivar las preguntas detalladas."
       }
      },
      {
       "type": "callout",
       "tone": "compliance",
       "body": {
        "en": "Whenever you present a benefit such as monthly dosing, include safety in the same conversation: injection-site reactions (9%), upper respiratory infections (7%), headache (5%), TB screening before starting and no live vaccines. Refer detailed questions to the full prescribing information or Medical Information. Do not answer off-label or comparative questions; offer a Medical Information request.",
        "es": "Siempre que presentes un beneficio, como la dosificación mensual, incluye la seguridad en la misma conversación: reacciones en el lugar de la inyección (9 %), infecciones de las vías respiratorias superiores (7 %), cefalea (5 %), cribado de tuberculosis antes de empezar y no usar vacunas de virus vivos. Deriva las preguntas detalladas a la ficha técnica completa o a Información Médica. No respondas a preguntas fuera de indicación ni comparativas; ofrece una solicitud a Información Médica."
       }
      },
      {
       "type": "check",
       "q": {
        "en": "The HCP says, \"My patients don't want injections.\" Which response best follows the approved approach?",
        "es": "El profesional sanitario dice: «Mis pacientes no quieren inyecciones». ¿Qué respuesta sigue mejor el enfoque aprobado?"
       },
       "options": [
        {
         "en": "Explain that the autoinjector is so simple that patients will not mind, then move on to access.",
         "es": "Explica que el autoinyector es tan sencillo que a los pacientes no les importará y pasa después al acceso."
        },
        {
         "en": "Acknowledge the concern, explain monthly dosing after loading, offer injection-training support and share the common side effects and TB screening requirement.",
         "es": "Reconoce la preocupación, explica la dosificación mensual tras la carga, ofrece apoyo para la formación en la inyección y comparte los efectos adversos frecuentes y el requisito de cribado de tuberculosis."
        },
        {
         "en": "Compare the dosing schedule with other biologics to show Derolad needs fewer injections.",
         "es": "Compara el calendario de dosificación con otros biológicos para mostrar que Derolad necesita menos inyecciones."
        }
       ],
       "answer": 1,
       "explanation": {
        "en": "Option 2 covers acknowledgment, the regimen, training support and safety. Option 1 dismisses the concern and omits safety. Option 3 is a comparison, which is never allowed.",
        "es": "La opción 2 cubre el reconocimiento, el régimen, el apoyo para la formación y la seguridad. La opción 1 minimiza la preocupación y omite la seguridad. La opción 3 es una comparación, que nunca está permitida."
       }
      },
      {
       "type": "keypoints",
       "heading": {
        "en": "Remember",
        "es": "Recuerda"
       },
       "items": [
        {
         "en": "Acknowledge the concern and the burden of HS before talking about Derolad.",
         "es": "Reconoce la preocupación y la carga de la HS antes de hablar de Derolad."
        },
        {
         "en": "Explain the regimen: two loading injections at week 0, then one autoinjector every 4 weeks.",
         "es": "Explica el régimen: dos inyecciones de carga en la semana 0 y, después, un autoinyector cada 4 semanas."
        },
        {
         "en": "Patients can self-inject after training, so offer the injection-training support.",
         "es": "Los pacientes pueden autoinyectarse tras la formación, así que ofrece el apoyo para la formación en la inyección."
        },
        {
         "en": "Share injection-site reactions (9%), upper respiratory infections (7%) and headache (5%) with the benefit.",
         "es": "Comparte las reacciones en el lugar de la inyección (9 %), las infecciones de las vías respiratorias superiores (7 %) y la cefalea (5 %) junto con el beneficio."
        },
        {
         "en": "Mention TB screening before starting and no live vaccines.",
         "es": "Menciona el cribado de tuberculosis antes de iniciar el tratamiento y la ausencia de vacunas de virus vivos."
        },
        {
         "en": "Refer detailed questions to the prescribing information or Medical Information, and offer a Medical Information request for off-label or comparative questions.",
         "es": "Remite las preguntas detalladas a la información para prescribir o a Información Médica, y ofrece una solicitud a Información Médica para preguntas sobre usos fuera de indicación o comparativas."
        }
       ]
      }
     ],
     "sources": [
      "src-core",
      "src-messages",
      "src-objections"
     ]
    }
   ],
   "quiz": [
    {
     "id": "q1",
     "pillar": "objections",
     "q": {
      "en": "A dermatologist says, \"My patients don't want injections.\" You want to open the conversation well. What is the best first step?",
      "es": "Un dermatólogo dice: \"Mis pacientes no quieren inyecciones\". Quieres empezar bien la conversación. ¿Cuál es el mejor primer paso?"
     },
     "options": [
      {
       "en": "Explain right away that Derolad is only one injection every 4 weeks, so the concern does not apply.",
       "es": "Explica de inmediato que Derolad es solo una inyección cada 4 semanas, por lo que la preocupación no aplica."
      },
      {
       "en": "Acknowledge the concern and the burden HS places on patients, then explain the monthly autoinjector regimen.",
       "es": "Reconoce la preocupación y la carga que la HS supone para los pacientes, y a continuación explica el régimen mensual con autoinyector."
      },
      {
       "en": "Share the 58% clinical response result to show the benefit outweighs any reluctance about injections.",
       "es": "Comparte el resultado de respuesta clínica del 58% para mostrar que el beneficio supera cualquier reticencia a las inyecciones."
      }
     ],
     "answer": 1
    },
    {
     "id": "q2",
     "pillar": "product",
     "q": {
      "en": "A practice nurse asks how Derolad is given and how often. Which description matches the approved dosing?",
      "es": "Una enfermera de atención primaria pregunta cómo se administra Derolad y con qué frecuencia. ¿Qué descripción coincide con la posología aprobada?"
     },
     "options": [
      {
       "en": "One injection every 4 weeks from the start, with no loading doses.",
       "es": "Una inyección cada 4 semanas desde el inicio, sin dosis de carga."
      },
      {
       "en": "Two loading injections at week 0, then one subcutaneous injection every 4 weeks with a prefilled autoinjector.",
       "es": "Dos inyecciones de carga en la semana 0 y, después, una inyección subcutánea cada 4 semanas con un autoinyector precargado."
      },
      {
       "en": "Two loading injections at week 0, then one injection every 16 weeks with a prefilled autoinjector.",
       "es": "Dos inyecciones de carga en la semana 0 y, después, una inyección cada 16 semanas con un autoinyector precargado."
      }
     ],
     "answer": 1
    },
    {
     "id": "q3",
     "pillar": "objections",
     "q": {
      "en": "The physician says patients would struggle to inject themselves. Which response best fits the approved guidance?",
      "es": "El médico dice que a los pacientes les costaría inyectarse ellos mismos. ¿Qué respuesta se ajusta mejor a la orientación aprobada?"
     },
     "options": [
      {
       "en": "Tell them patients can self-inject after training, and offer the injection-training support.",
       "es": "Dile que los pacientes pueden autoinyectarse tras recibir formación y ofrece el apoyo formativo para la inyección."
      },
      {
       "en": "Tell them the office must give every injection, so patients never need to handle the autoinjector.",
       "es": "Dile que la consulta debe administrar todas las inyecciones, de modo que los pacientes nunca tengan que manipular el autoinyector."
      },
      {
       "en": "Tell them training is not needed because the autoinjector is prefilled.",
       "es": "Dile que no hace falta formación porque el autoinyector viene precargado."
      }
     ],
     "answer": 0
    },
    {
     "id": "q4",
     "pillar": "messaging",
     "q": {
      "en": "While you present the monthly regimen as a benefit, the physician asks about safety. Which response best keeps safety in the conversation?",
      "es": "Mientras presentas el régimen mensual como una ventaja, el médico pregunta por la seguridad. ¿Qué respuesta mantiene mejor la seguridad en la conversación?"
     },
     "options": [
      {
       "en": "Say Derolad has no notable side effects and suggest the physician check the label later.",
       "es": "Di que Derolad no tiene efectos adversos destacables y sugiere al médico que consulte la ficha técnica más adelante."
      },
      {
       "en": "Share the most common side effects (injection-site reactions 9%, upper respiratory infections 7%, headache 5%), mention TB screening before starting and no live vaccines, and refer detailed questions to the full prescribing information or Medical Information.",
       "es": "Comparte los efectos adversos más frecuentes (reacciones en el lugar de inyección 9 %, infecciones de las vías respiratorias superiores 7 %, cefalea 5 %), menciona el cribado de tuberculosis antes de empezar y la ausencia de vacunas vivas, y remite las preguntas detalladas a la ficha técnica completa o a Información Médica."
      },
      {
       "en": "Mention TB screening only, since common side effects are minor and could distract from the monthly dosing message.",
       "es": "Menciona solo el cribado de tuberculosis, ya que los efectos adversos frecuentes son leves y podrían distraer del mensaje sobre la posología mensual."
      }
     ],
     "answer": 1
    }
   ],
   "boss": {
    "persona": "blake",
    "objection": "injections",
    "minutes": 5,
    "mode": "chat",
    "brief": {
     "en": "You are visiting Dr. Jordan Blake, a cautious dermatologist who treats adults with moderate-to-severe HS. Acknowledge the burden of HS and the concern about injections, explain monthly dosing with the autoinjector, offer injection-training support, and keep safety in the conversation.",
     "es": "Vas a visitar al Dr. Jordan Blake, un dermatólogo prudente que trata a adultos con HS de moderada a grave. Reconoce la carga de la HS y la preocupación por las inyecciones, explica la posología mensual con el autoinyector, ofrece apoyo formativo para la inyección y mantén la seguridad en la conversación."
    },
    "opening": {
     "en": "I'll be honest with you, my HS patients are worn out and most of them tell me they don't want any more injections.",
     "es": "Te voy a ser sincero: mis pacientes con HS están agotados y la mayoría me dice que no quiere más inyecciones."
    },
    "criteria": [
     {
      "en": "Acknowledges the burden of HS (pain, stigma, delayed diagnosis) and the patient concern before talking about the product",
      "es": "Reconoce la carga de la HS (dolor, estigma, diagnóstico tardío) y la preocupación del paciente antes de hablar del producto"
     },
     {
      "en": "Explains dosing accurately: two loading injections at week 0, then one subcutaneous autoinjector injection every 4 weeks",
      "es": "Explica la posología con precisión: dos inyecciones de carga en la semana 0 y, después, una inyección subcutánea con autoinyector cada 4 semanas"
     },
     {
      "en": "Offers injection-training support and notes that patients can self-inject after training",
      "es": "Ofrece apoyo formativo para la inyección e indica que los pacientes pueden autoinyectarse tras la formación"
     },
     {
      "en": "Brings up the most common side effects (injection-site reactions 9%, upper respiratory infections 7%, headache 5%) and TB screening before starting",
      "es": "Menciona los efectos adversos más frecuentes (reacciones en el lugar de inyección 9 %, infecciones de las vías respiratorias superiores 7 %, cefalea 5 %) y el cribado de tuberculosis antes de empezar"
     },
     {
      "en": "Stays on-label and does not compare with other medicines, offering a Medical Information request for off-label questions",
      "es": "Se mantiene dentro de la ficha autorizada, no compara con otros medicamentos y ofrece una solicitud a Información Médica para preguntas fuera de indicación"
     }
    ]
   }
  }
 ],
 "createdBy": "jamie",
 "createdAt": {
  "__ago": 106598
 },
 "updatedAt": {
  "__ago": 73580
 },
 "history": [
  {
   "at": {
    "__ago": 106598
   },
   "by": "jamie",
   "action": "project_created"
  },
  {
   "at": {
    "__ago": 106592
   },
   "by": "jamie",
   "action": "card_complete",
   "card": "materials"
  },
  {
   "at": {
    "__ago": 96949
   },
   "by": "jamie",
   "action": "card_complete",
   "card": "outline"
  },
  {
   "at": {
    "__ago": 93603
   },
   "by": "jamie",
   "action": "card_complete",
   "card": "practice"
  },
  {
   "at": {
    "__ago": 93589
   },
   "by": "jamie",
   "action": "card_complete",
   "card": "videos"
  },
  {
   "at": {
    "__ago": 73593
   },
   "by": "jamie",
   "action": "drafted_with_ai"
  },
  {
   "at": {
    "__ago": 73580
   },
   "by": "jamie",
   "action": "card_complete",
   "card": "content"
  },
  {
   "at": {
    "__ago": 60013
   },
   "by": "jamie",
   "action": "submitted"
  },
  {
   "at": {
    "__ago": 59946
   },
   "by": "priya",
   "action": "changes_requested",
   "team": "training"
  },
  {
   "at": {
    "__ago": 59938
   },
   "by": "marcus",
   "action": "changes_requested",
   "team": "sales"
  },
  {
   "at": {
    "__ago": 59931
   },
   "by": "elena",
   "action": "approved",
   "team": "marketing"
  },
  {
   "at": {
    "__ago": 59924
   },
   "by": "drlee",
   "action": "changes_requested",
   "team": "mlr"
  }
 ],
 "studio": {
  "lang": "en",
  "spec": {
   "title": "Injection hesitancy conversations",
   "goal": "Reps can answer \"My patients don't want injections\": acknowledge the concern, explain monthly dosing with the autoinjector after loading, offer injection-training support, and keep safety in the conversation.",
   "audience": {
    "role": "derm_reps",
    "roleOther": "",
    "experience": "derm",
    "experienceOther": "",
    "notes": "Experienced in dermatology; this objection comes up in most first visits."
   },
   "sections": [
    {
     "lessons": 2,
     "minutes": 8,
     "quiz": 4,
     "practice": "chat",
     "practiceMinutes": 5
    }
   ],
   "materials": [
    "src-core",
    "src-messages",
    "src-objections"
   ],
   "willUpload": false,
   "videos": [
    {
     "topic": "How Derolad works",
     "section": 1
    }
   ]
  },
  "cards": {
   "requirements": {
    "state": "complete",
    "at": {
     "__ago": 106598
    }
   },
   "materials": {
    "state": "complete",
    "at": {
     "__ago": 106592
    }
   },
   "outline": {
    "state": "complete",
    "at": {
     "__ago": 96949
    }
   },
   "practice": {
    "state": "complete",
    "at": {
     "__ago": 93603
    }
   },
   "videos": {
    "state": "complete",
    "at": {
     "__ago": 93589
    }
   },
   "content": {
    "state": "complete",
    "at": {
     "__ago": 73580
    }
   },
   "preview": {
    "state": "complete",
    "at": {
     "__ago": 60013
    }
   }
  },
  "outline": {
   "title": "Injection hesitancy conversations",
   "objective": "Reps can answer \"My patients don't want injections\" by acknowledging the concern, explaining monthly dosing with the autoinjector after loading, offering injection-training support and keeping safety in the conversation.",
   "notes": "Please double-check that all dosing, side effect percentages and the TB screening and live vaccine statements match the Derolad Core Product Summary exactly. Confirm that the objection flow follows the Approved Objection Handler and that no other medicines are named.",
   "sections": [
    {
     "id": "s1",
     "title": "Answering \"My patients don't want injections\"",
     "goal": "Reps can acknowledge injection concerns, explain the monthly autoinjector regimen, offer training support and keep safety part of the conversation.",
     "lessons": [
      {
       "id": "l1",
       "title": "Understanding the concern and explaining monthly dosing",
       "pillar": "product",
       "minutes": 8,
       "points": [
        "Reps acknowledge the burden of HS (pain, stigma, delayed diagnosis) and the HCP's experience before talking about Derolad.",
        "Derolad is a monthly biologic for adults with moderate-to-severe HS that selectively blocks the ZN-7 inflammatory signal, which drives nodule and abscess formation.",
        "Dosing is two loading injections at week 0, then one subcutaneous injection every 4 weeks with a prefilled autoinjector.",
        "Monthly simplicity fits the routine of patients who are tired of frequent treatments."
       ],
       "methods": [
        "why",
        "visual",
        "example",
        "check"
       ],
       "video": "v1"
      },
      {
       "id": "l2",
       "title": "Offering training support and keeping safety in the conversation",
       "pillar": "objections",
       "minutes": 8,
       "points": [
        "Acknowledge the concern first, then explain monthly dosing with the autoinjector after loading.",
        "Patients can self-inject after training, so offer the injection-training support.",
        "When presenting the benefit, share the most common side effects: injection-site reactions (9%), upper respiratory infections (7%) and headache (5%).",
        "Mention the requirement to screen for tuberculosis before starting and not to use Derolad with live vaccines.",
        "Refer detailed safety questions to the full prescribing information or Medical Information, and offer a Medical Information request for off-label or comparative questions."
       ],
       "methods": [
        "example",
        "dodont",
        "callout",
        "check"
       ],
       "video": null
      }
     ],
     "quiz": 4,
     "quizFocus": "Checks that reps know the dosing schedule (two loading injections at week 0, then every 4 weeks), the training support offer, and the safety points to mention (common side effects, TB screening, no live vaccines).",
     "practice": {
      "mode": "chat",
      "minutes": 5,
      "focus": "A dermatology HCP says their patients do not want injections. The rep must acknowledge the burden of HS and the concern, explain monthly autoinjector dosing after loading, offer injection-training support and mention safety (common side effects and TB screening) without going off-label."
     }
    }
   ]
  },
  "chat": [
   {
    "who": "ai",
    "text": "I proposed one section with two 8-minute lessons, a 4-question quiz and a 5-minute practice session. Lesson 1 builds the acknowledgement and the monthly autoinjector explanation (with the video), and lesson 2 covers training support, safety and handling the objection end to end.",
    "at": {
     "__ago": 96963
    }
   }
  ],
  "practice": [
   {
    "section": "s1",
    "mode": "chat",
    "minutes": 5,
    "persona": "blake",
    "objection": "injections",
    "brief": "You are visiting Dr. Jordan Blake, a cautious dermatologist who treats adults with moderate-to-severe HS. Acknowledge the burden of HS and the concern about injections, explain monthly dosing with the autoinjector, offer injection-training support, and keep safety in the conversation.",
    "opening": "I'll be honest with you, my HS patients are worn out and most of them tell me they don't want any more injections.",
    "criteria": [
     "Acknowledges the burden of HS (pain, stigma, delayed diagnosis) and the patient concern before talking about the product",
     "Explains dosing accurately: two loading injections at week 0, then one subcutaneous autoinjector injection every 4 weeks",
     "Offers injection-training support and notes that patients can self-inject after training",
     "Brings up the most common side effects (injection-site reactions 9%, upper respiratory infections 7%, headache 5%) and TB screening before starting",
     "Stays on-label and does not compare with other medicines, offering a Medical Information request for off-label questions"
    ]
   }
  ],
  "videos": [
   {
    "teach": "",
    "aspects": "",
    "conversation": "",
    "style": "scene",
    "script": null,
    "lesson": null,
    "source": "library",
    "media": {
     "libraryId": "vid-mechanism",
     "url": {
      "en": "/media/explainer-mechanism-en.mp4",
      "es": "/media/explainer-mechanism-es.mp4"
     },
     "poster": {
      "en": "/media/explainer-mechanism-en.png",
      "es": "/media/explainer-mechanism-es.png"
     },
     "title": {
      "en": "How Derolad® works",
      "es": "Cómo actúa Derolad®"
     },
     "description": {
      "en": "Silent animated explainer: the burden of HS, the ZN-7 mechanism and the dosing schedule.",
      "es": "Animación sin voz: la carga de la HS, el mecanismo ZN-7 y la pauta de administración."
     },
     "transcript": {
      "en": "On screen: HS is more than skin deep: pain, stigma, delayed diagnosis. The ZN-7 signal drives nodules and abscesses (fictional pathway); Derolad selectively blocks ZN-7. Two loading injections at week 0, then one injection every 4 weeks; prefilled autoinjector, patients can self-inject after training. For adults with moderate-to-severe hidradenitis suppurativa. Source: Derolad® Core Product Summary (approved).",
      "es": "En pantalla: la HS va más allá de la piel: dolor, estigma, diagnóstico tardío. La señal ZN-7 impulsa nódulos y abscesos (vía ficticia); Derolad bloquea de forma selectiva ZN-7. Dos inyecciones de carga en la semana 0 y después una cada 4 semanas; autoinyector precargado, autoinyección tras la formación. Para adultos con hidradenitis supurativa moderada a grave. Fuente: Resumen de producto Derolad® (aprobado)."
     },
     "seconds": 30,
     "status": "approved",
     "courseTitle": {
      "en": "Derolad® Essentials for HS",
      "es": "Derolad®: lo esencial en HS"
     },
     "at": {
      "__ago": 93596
     }
    },
    "id": "v1",
    "topic": "How Derolad works",
    "section": 1
   }
  ],
  "notes": {}
 },
 "aiNotes": {
  "en": "Please double-check that all dosing, side effect percentages and the TB screening and live vaccine statements match the Derolad Core Product Summary exactly. Confirm that the objection flow follows the Approved Objection Handler and that no other medicines are named.",
  "es": "Por favor, verifica que toda la posología, los porcentajes de efectos adversos y las afirmaciones sobre el cribado de tuberculosis y las vacunas de virus vivos coincidan exactamente con el Resumen Principal del Producto de Derolad. Confirma que el flujo de tratamiento de objeciones sigue el Manual Aprobado para el Tratamiento de Objeciones y que no se nombran otros medicamentos."
 },
 "comments": [
  {
   "id": "c-mlr-dosing",
   "round": 1,
   "team": "mlr",
   "by": "drlee",
   "at": {
    "__ago": 59988
   },
   "target": "l1",
   "block": 4,
   "blockType": "text",
   "quote": "Derolad is a monthly biologic for adults with moderate-to-severe HS.",
   "text": {
    "en": "The first time the lesson describes the regimen, include the loading step. Suggested: \"Derolad is a biologic for adults with moderate-to-severe HS: two loading injections at week 0, then one injection every 4 weeks.\"",
    "es": "La primera vez que la lección describe la pauta, incluye la dosis de carga. Propuesta: \"Derolad es un biológico para adultos con HS moderada a grave: dos inyecciones de carga en la semana 0 y después una cada 4 semanas.\""
   },
   "sent": true,
   "sentAt": {
    "__ago": 0
   },
   "agrees": [
    {
     "team": "training",
     "by": "priya",
     "at": {
      "__ago": 30000
     }
    }
   ],
   "status": "open",
   "reply": null
  },
  {
   "id": "c-mlr-quiz",
   "round": 1,
   "team": "mlr",
   "by": "drlee",
   "at": {
    "__ago": 59990
   },
   "target": "quiz:s1",
   "block": 0,
   "blockType": "question",
   "quote": "Explain right away that Derolad is only one injection every 4 weeks, so the concern does not apply.",
   "text": {
    "en": "Even as a wrong option, this misstates the regimen (it leaves out loading). Make this option wrong because of the approach, not because of a dosing error that learners might remember.",
    "es": "Aunque sea una opción incorrecta, describe mal la pauta (omite la carga). Haz que sea incorrecta por el enfoque, no por un error de posología que los alumnos podrían recordar."
   },
   "sent": true,
   "sentAt": {
    "__ago": 0
   },
   "agrees": [],
   "status": "open",
   "reply": null
  },
  {
   "id": "c-training-quiz",
   "round": 1,
   "team": "training",
   "by": "priya",
   "at": {
    "__ago": 59985
   },
   "target": "quiz:s1",
   "block": 1,
   "blockType": "question",
   "quote": "Two loading injections at week 0, then one injection every 16 weeks with a prefilled autoinjector.",
   "text": {
    "en": "This distractor is too easy to rule out. Use a closer one, for example one loading injection at week 0, so the question really checks the loading step.",
    "es": "Este distractor se descarta con demasiada facilidad. Usa uno más cercano, por ejemplo una sola inyección de carga en la semana 0, para que la pregunta compruebe de verdad la dosis de carga."
   },
   "sent": true,
   "sentAt": {
    "__ago": 0
   },
   "agrees": [],
   "status": "open",
   "reply": null
  },
  {
   "id": "c-sales-boss",
   "round": 1,
   "team": "sales",
   "by": "marcus",
   "at": {
    "__ago": 59988
   },
   "target": "boss:s1",
   "block": 0,
   "blockType": "boss",
   "quote": "You are visiting Dr. Jordan Blake, a cautious dermatologist who treats adults with moderate-to-severe HS.",
   "text": {
    "en": "In the field this objection usually comes from the practice nurse, who trains the patients. Consider making the HCP the nurse for this final challenge.",
    "es": "En la práctica esta objeción suele venir de la enfermera de la consulta, que forma a los pacientes. Valora que el profesional del reto final sea la enfermera."
   },
   "sent": true,
   "sentAt": {
    "__ago": 0
   },
   "agrees": [],
   "status": "open",
   "reply": null
  },
  {
   "id": "c-marketing-video",
   "round": 1,
   "team": "marketing",
   "by": "elena",
   "at": {
    "__ago": 59983
   },
   "target": "l1",
   "block": 1,
   "blockType": "video",
   "quote": "Silent animated explainer: the burden of HS, the ZN-7 mechanism and the dosing schedule.",
   "text": {
    "en": "Fine to keep, but add a line before the video saying why reps watch it here (to describe the regimen precisely). Otherwise it reads as a generic product video.",
    "es": "Puede quedarse, pero añade antes del vídeo una frase que explique por qué lo ven aquí (para describir la pauta con precisión). Si no, parece un vídeo de producto genérico."
   },
   "sent": true,
   "sentAt": {
    "__ago": 0
   },
   "agrees": [],
   "status": "open",
   "reply": null
  }
 ],
 "prints": {
  "round": 1,
  "parts": {
   "l1": [
    "13rsye0",
    "fjxd68",
    "1eqrzxb",
    "1qibfe8",
    "1ywcvwf",
    "6eh0yn",
    "1ehmvws",
    "36evoo",
    "aavzal",
    "etljsw"
   ],
   "l2": [
    "1rhn2vq",
    "p4lzey",
    "1ovfipv",
    "1kc0qk3",
    "s0rq85",
    "17c4h4q",
    "1fmuaxa",
    "e95k7c",
    "1luyo5v"
   ],
   "quiz:s1": [
    "wo23q9",
    "1vpxcnh",
    "1iuffv3",
    "xhnosn"
   ],
   "boss:s1": [
    "gmu762"
   ]
  }
 },
 "submittedAt": {
  "__ago": 60013
 },
 "reviews": {
  "training": {
   "state": "changes_requested",
   "at": {
    "__ago": 59946
   },
   "by": "priya",
   "comments": [
    "c-training-quiz",
    "c-mlr-dosing"
   ]
  },
  "sales": {
   "state": "changes_requested",
   "at": {
    "__ago": 59938
   },
   "by": "marcus",
   "comments": [
    "c-sales-boss"
   ]
  },
  "marketing": {
   "state": "approved",
   "at": {
    "__ago": 59931
   },
   "by": "elena",
   "comments": [
    "c-marketing-video"
   ]
  },
  "mlr": {
   "state": "changes_requested",
   "at": {
    "__ago": 59924
   },
   "by": "drlee",
   "comments": [
    "c-mlr-dosing",
    "c-mlr-quiz"
   ]
  }
 }
};

const at = (v, now) => Array.isArray(v) ? v.map(x => at(x, now)) : v && typeof v === "object" ? ("__ago" in v && Object.keys(v).length === 1 ? now - DAY - v.__ago : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, at(x, now)]))) : v;
export const hesitancyModule = now => at(SNAPSHOT, now);
