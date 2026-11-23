# app/ — Servidor y interfaz original

Dueño: Dario. Lee también el `CLAUDE.md` de la raíz.

## Qué hay
- `server/`: Express (Node ≥ 22, módulos ES). `app.js` define todas las rutas `/api/...`; la IA está en `foundry.js` (Claude en Microsoft Foundry), `roleplay.js`, `studio-ai.js`, `builder.js` y `review.js`; el avatar en `avatar.js` (LiveAvatar o Azure Speech); el estado en `store.js` (un único documento JSON: fichero local, Cosmos DB o Supabase).
- `public/`: la interfaz original (JavaScript sin framework). Se mantiene funcionando hasta que `web/` la sustituya pantalla a pantalla.
- Arranque local: `cd app && npm install && npm run dev` (puerto 8080). Variables en `app/.env.local` (no se sube).

## Normas
- El contrato (`contract/openapi.yaml`) describe estas rutas. Si cambias una ruta o su respuesta, actualiza el contrato en un PR de `contract/`.
- Cambios pequeños y con test. No reescribir por reescribir: el objetivo es reforzar lo que funciona.
- Revisa `docs/auditoria-ia.md` antes de tocar prompts o llamadas a modelos.
- Nunca claves en el código: solo variables de entorno.
