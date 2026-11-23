# Traspaso front ↔ back

Para Inés, Dario y sus Claude. Qué ofrece la API de `app/server/`, qué necesita el front nuevo y lo que no debe darse por hecho.

## Estado (23/11/2026)
- La API es la de la demo de Michael, sin cambios todavía. Rutas en `app/server/app.js`.
- Contrato: pendiente (`contract/openapi.yaml`).
- Sesión de demo: cookie con el usuario elegido (no es autenticación real) y código de acceso (`DEMO_ACCESS_CODE`) para todas las rutas `/api` salvo `/api/health` y `/api/access`.
