# app/public/ — Interfaz (UX)

Dueña: Inés. Lee también el `CLAUDE.md` de la raíz.

## Qué hay (la interfaz de Michael)
- JavaScript sin framework ni build: el servidor sirve esta carpeta tal cual. Se ve el cambio al recargar.
- `index.html`: estructura común (cabecera, selector de idioma).
- `css/brand.css`: **sistema de diseño** (colores, tipografía, radios). Todo color, fuente y radio sale de aquí; nunca valores sueltos en otras hojas.
- `css/app.css`: estilos de las pantallas.
- `js/app.js`: arranque, cabecera y rutas por `#hash` según el perfil (learner, creator, approver, admin, manager).
- `js/views/`: una pantalla por fichero (home, module, lesson, quiz, practice, studio, review…).
- `js/i18n.js`: todos los textos de la interfaz en inglés y español. El contenido del módulo llega del servidor como `{ en, es }`.
- `js/api.js`: llamadas al servidor (`/api/...`).
- `vendor/`: SDK del avatar y de voz (no tocar).

## Normas
- Mejorar sobre lo que hay: no rehacer pantallas enteras sin acordarlo; cambios por pantalla y por PR.
- Todo texto nuevo, en **inglés y español** en `i18n.js`.
- **Accesibilidad**: contraste AA, foco visible, todo usable con teclado, textos alternativos, etiquetas en botones de solo icono.
- Diseño adaptable: el delegado usa móvil y tablet; el backoffice, escritorio.
- No cambiar las llamadas a la API ni lo que se espera de sus respuestas sin hablar con Dario (`docs/traspaso-front-back.md`).
- Nada de claves ni de datos reales en esta carpeta: todo lo que hay aquí lo ve el navegador.
- Capturas para revisar cambios visuales: `node tools/shots.mjs <carpeta> [ancho]` con la app arrancada; adjúntalas en el PR.
