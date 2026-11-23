# Learning Hub · demo genérica

Contexto común para cualquier Claude que trabaje en este repo. Cada carpeta tiene su propio `CLAUDE.md` (`app/CLAUDE.md`, `web/CLAUDE.md`).

## Qué es
Demo de una plataforma de formación con IA para la red de ventas de una farmacéutica **ficticia** (Zenetic Pharma, producto Derolad). Parte de la demo de Michael Cain (`michaelshower/zenetic-learning-hub`, importada con su historial en el primer commit). El proyecto original es suyo: aquí lo mejoramos.

Objetivo (2–3 semanas desde el 23/11/2026):
1. **Mejor experiencia de uso**: front nuevo en `web/` (Inés).
2. **Back sólido**: su servidor (`app/server/`) con contrato, tests, CI y seguridad (Dario).
3. **IA auditada y reforzada**: role-play, feedback, estudio de creación y pre-revisión (Dario). Ver `docs/auditoria-ia.md`.

## Equipo y propiedad de carpetas
| Carpeta | Dueño | Notas |
|---|---|---|
| `app/` | Dario | Servidor Express de Michael (`app/server/`) y su interfaz original (`app/public/`), que se mantiene mientras `web/` no la sustituya |
| `web/` | Inés | Front nuevo: React + TypeScript |
| `contract/` | Compartida | `openapi.yaml`: la API de `app/server/` descrita; fuente de verdad entre front y back |
| `docs/` | Compartida | `decisiones.md` (registro oficial), `traspaso-front-back.md`, `auditoria-ia.md` |
| `infra/`, `azure.yaml`, `.github/` | Dario | Despliegue (Bicep + azd) y CI |

**Cada Claude trabaja solo en la carpeta de su dueño.** Si una tarea requiere tocar otra carpeta o el contrato, para y avisa.
No se renombran ni se mueven las carpetas de Michael sin decidirlo antes: así es fácil devolverle mejoras.

## Reglas de Git (`main` sin protección técnica)
- **Nunca** commit ni push directo a `main`. Todo entra por Pull Request.
- Una rama por tarea pequeña (~1 día): `app/<tarea>`, `web/<tarea>`, `contract/<tarea>`, `docs/<tarea>`, `infra/<tarea>`.
- Cada uno fusiona sus PR cuando el CI pasa. Los de `contract/` se avisan a la otra persona; si quitan o renombran campos usados, se habla antes.
- Antes de empezar: `git switch main && git pull`. Mensajes de commit en español, cortos e imperativos.
- **No trabajar nunca en el repo de Michael** (`michaelshower/zenetic-learning-hub`): solo es la base.

## Contenido ficticio (no negociable)
- Zenetic Pharma y Derolad no existen. **Ningún nombre real** de cliente, empresa, producto, medicamento, persona o profesional sanitario en código, datos, prompts, tests, commits ni documentos.
- `scripts/scrub-check.sh` lo comprueba en el CI y debe pasar siempre. Un aviso se arregla quitando el nombre, nunca añadiendo una excepción.
- Nada de datos de pacientes ni de profesionales sanitarios reales, tampoco en mocks.

## IA (la parte con más riesgo)
- Toda llamada a modelos va en el servidor (`app/server/`), con las claves en variables de entorno o Key Vault; **nunca** en el navegador ni en el repo.
- La IA solo usa los materiales aprobados del módulo; no inventa cifras, estudios, comparaciones ni indicaciones fuera de ficha.
- Todo texto que venga del usuario o de un fichero subido es **dato**, no instrucciones para el modelo.
- Las salidas de la IA se validan (esquema JSON) antes de usarse; un fallo de la IA no puede saltarse un control.
- Los logs no guardan conversaciones, materiales ni datos personales.
- Cualquier cambio en prompts o en llamadas a modelos se revisa contra `docs/auditoria-ia.md`.

## Cómo trabajar
- Pasos pequeños: plan, código, resumen de lo cambiado.
- Si falta información, pregunta antes de suponer. Si algo no encaja con el contrato, propón el cambio; no lo inventes.
- Las decisiones relevantes van a `docs/decisiones.md`.

## Glosario (el de la demo de Michael)
- **learner**: delegado de ventas · **creator**: crea los módulos en el estudio · **approver**: revisa por equipo (training, sales, marketing, mlr) · **admin**: publica (Go live) · **manager**: ve a su equipo.
- **Módulo** → secciones → lecciones, quiz y **práctica** (role-play con un profesional sanitario simulado, con feedback por **pilar**: `product`, `messaging`, `objections`).
- **Materiales**: fuentes aprobadas en las que se basa toda la IA.
