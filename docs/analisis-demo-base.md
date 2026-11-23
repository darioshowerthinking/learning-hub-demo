# Análisis de la demo base (23/11/2026)

Demo de Michael Cain (`michaelshower/zenetic-learning-hub`, un commit del 20/11/2026), importada como primer commit de este repo.

## Qué hace
- **Campus del delegado** (`learner`): módulos por secciones con lecciones, quiz y una **práctica final**: role-play con un profesional sanitario simulado, feedback por pilar (`product`, `messaging`, `objections`) y tres **líneas rojas** que suspenden aunque la nota sea alta (minimizar riesgos, comparaciones, fuera de ficha). En inglés y español.
- **Avatar en directo**: LiveAvatar (HeyGen) o Azure Speech como cara, voz y oídos; **Claude decide cada palabra** del sanitario. Si el avatar no está disponible, se practica por texto.
- **Estudio de creación con IA** (`creator`): subir materiales (PDF, Word, texto), índice propuesto por Claude y ajustado conversando, sesiones de práctica, guiones de vídeo y vídeos subidos a Blob.
- **Aprobación con cuatro equipos** (`approver`: training, sales, marketing, mlr), **pre-revisión con IA** por equipo, comentarios y **Go live** (`admin`). Vista de equipo para `manager`.
- **IA**: Claude Sonnet 5.5 (role-play, feedback, estudio, pre-revisión) y Haiku 5.5 (tareas pequeñas) en Microsoft Foundry, con clave o identidad administrada.
- **Despliegue**: Bicep + `azd up` a Container Apps (identidad administrada, Cosmos DB, Blob, Log Analytics) u opción Vercel + Supabase. Código de acceso (`DEMO_ACCESS_CODE`) para que un enlace público no gaste créditos de IA.

## Puntos fuertes
- Mucho producto y la IA real funcionando de punta a punta.
- Claves solo en el servidor; tokens cortos para el avatar; identidad administrada en Azure.
- Control de nombres reales (`scripts/scrub-check.sh`).
- Salidas de la IA con esquemas JSON (`streamJson`).

## Puntos a mejorar
| Área | Situación | Propuesta |
|---|---|---|
| Tests y CI | Ninguno | CI con control de nombres y sintaxis (hecho); tests de la API y de la IA |
| Coordinación interfaz/servidor | Sin contrato | Cambios de rutas acordados y anotados en `docs/traspaso-front-back.md` |
| Interfaz | JavaScript sin framework, ficheros de hasta ~1.000 líneas | Rediseño y mejora sobre su interfaz (UX, accesibilidad, móvil), pantalla a pantalla |
| Estado | Un único documento JSON para todo (lecturas y escrituras completas, en serie) | Suficiente para la demo; vigilar tamaño y concurrencia |
| Seguridad | `POST /api/admin/reset` sin usuario ni perfil (solo código de acceso); vídeos en Blob de **lectura pública** | Restringir el reinicio; SAS de lectura con caducidad |
| IA | Sin pruebas de ataque | `docs/auditoria-ia.md` |
