# app/server/ — Servidor e IA

Dueño: Dario. Lee también el `CLAUDE.md` de la raíz.

## Qué hay
- `app.js`: todas las rutas `/api/...`, el código de acceso de la demo (`DEMO_ACCESS_CODE`) y la sesión de demo (cookie con el usuario elegido; no es autenticación real).
- IA (Claude en Microsoft Foundry): `foundry.js` (cliente y modelos), `roleplay.js` (práctica y feedback), `studio-ai.js` y `builder.js` (estudio de creación), `review.js` (pre-revisión por equipo).
- `avatar.js`: LiveAvatar o Azure Speech; el navegador solo recibe tokens de corta duración.
- `store.js`: el estado de la demo es un único documento JSON (fichero local, Cosmos DB o Supabase). `seed*.js`: datos ficticios.
- `media.js`: vídeos subidos (Blob, Supabase o carpeta local). `workflow.js`: flujo de aprobación.

## Normas
- Cambios pequeños y con test. Reforzar lo que funciona, no reescribir.
- La interfaz (`app/public/`) depende de estas rutas: si cambias una ruta o su respuesta, avisa a Inés y anótalo en `docs/traspaso-front-back.md`.
- Revisa `docs/auditoria-ia.md` antes de tocar prompts o llamadas a modelos.
- Nunca claves en el código: solo variables de entorno.
