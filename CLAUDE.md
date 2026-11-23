# Learning Hub · demo genérica

Contexto común para cualquier Claude que trabaje en este repo. Hay además normas por carpeta: `app/server/CLAUDE.md` (servidor e IA) y `app/public/CLAUDE.md` (interfaz).

## Qué es
Demo de una plataforma de formación con IA para la red de ventas de una farmacéutica **ficticia** (Zenetic Pharma, producto Derolad). Es la demo de Michael Cain (`michaelshower/zenetic-learning-hub`, importada con su historial en el primer commit). El proyecto original es suyo: aquí lo mejoramos **manteniendo su estructura**.

Objetivo (2–3 semanas desde el 23/11/2026):
1. **Mejor experiencia de uso**: rediseño y mejora de su interfaz en `app/public/` (Inés).
2. **Back sólido**: tests, CI y seguridad del servidor en `app/server/` (Dario).
3. **IA auditada y reforzada**: role-play, feedback, estudio de creación y pre-revisión (Dario). Ver `docs/auditoria-ia.md`.

## Estructura (la de Michael) y quién trabaja dónde
| Carpeta | Dueño | Qué hay |
|---|---|---|
| `app/public/` | Inés | Interfaz en JavaScript sin framework: `index.html`, `css/` (sistema de diseño en `brand.css`), `js/views/` (pantallas), `js/i18n.js` (textos en/es) |
| `app/server/` | Dario | Servidor Express: rutas, IA, avatar, estado |
| `app/package.json`, `app/Dockerfile` | Dario | Dependencias y contenedor (avisar antes de cambiarlos) |
| `infra/`, `azure.yaml`, `.github/` | Dario | Despliegue (Bicep + azd) y CI |
| `scripts/`, `tools/` | Compartida | Control de nombres reales; scripts de capturas y flujos de Michael |
| `docs/` | Compartida | `decisiones.md` (registro oficial), `traspaso-front-back.md`, `analisis-demo-base.md`, `auditoria-ia.md` |

- **Cada Claude trabaja solo en la carpeta de su dueño.** Si una tarea requiere tocar otra carpeta, para y avisa.
- **No se renombran ni se mueven carpetas ni ficheros de Michael** sin decidirlo antes: así es fácil devolverle mejoras.
- Si un cambio de interfaz necesita algo nuevo del servidor (una ruta, un campo), se pide y se acuerda antes, y se anota en `docs/traspaso-front-back.md`.

## Reglas de Git (`main` sin protección técnica)
- **Nunca** commit ni push directo a `main`. Todo entra por Pull Request.
- Una rama por tarea pequeña (~1 día): `ui/<tarea>` (Inés), `server/<tarea>` (Dario), `docs/<tarea>`, `infra/<tarea>`.
- Cada uno fusiona sus PR cuando el CI pasa. Si un PR toca algo de la otra persona, se le avisa antes.
- Antes de empezar: `git switch main && git pull`. Mensajes de commit en español, cortos e imperativos.
- **No trabajar nunca en el repo de Michael** (`michaelshower/zenetic-learning-hub`): solo es la base.

## Arranque local
`cd app && npm install && npm run dev` → http://localhost:8080. La IA (Claude en Foundry) y el avatar necesitan variables de entorno: pídeselas a Dario; nunca se suben al repo.

## Contenido ficticio (no negociable)
- Zenetic Pharma y Derolad no existen. **Ningún nombre real** de cliente, empresa, producto, medicamento, persona o profesional sanitario en código, datos, prompts, tests, commits ni documentos.
- `scripts/scrub-check.sh` lo comprueba en el CI y debe pasar siempre. Un aviso se arregla quitando el nombre, nunca añadiendo una excepción.
- Nada de datos de pacientes ni de profesionales sanitarios reales, tampoco en datos de ejemplo.

## IA (la parte con más riesgo)
- Toda llamada a modelos va en el servidor, con las claves en variables de entorno o Key Vault; **nunca** en `app/public/` ni en el repo.
- La IA solo usa los materiales aprobados del módulo; no inventa cifras, estudios, comparaciones ni indicaciones fuera de ficha.
- Todo texto que venga del usuario o de un fichero subido es **dato**, no instrucciones para el modelo.
- Las salidas de la IA se validan (esquema JSON) antes de usarse; un fallo de la IA no puede saltarse un control.
- Los logs no guardan conversaciones, materiales ni datos personales.

## Cómo trabajar
- Pasos pequeños: plan, cambio, resumen de lo cambiado.
- Si falta información, pregunta antes de suponer.
- Las decisiones relevantes van a `docs/decisiones.md`.

## Glosario (el de la demo de Michael)
- **learner**: delegado de ventas · **creator**: crea los módulos en el estudio · **approver**: revisa por equipo (training, sales, marketing, mlr) · **admin**: publica (Go live) · **manager**: ve a su equipo.
- **Módulo** → secciones → lecciones, quiz y **práctica** (role-play con un profesional sanitario simulado, con feedback por **pilar**: `product`, `messaging`, `objections`, y líneas rojas).
- **Materiales**: fuentes aprobadas en las que se basa toda la IA.
