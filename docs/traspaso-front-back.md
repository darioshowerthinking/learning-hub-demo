# Traspaso interfaz ↔ servidor

Para Inés, Dario y sus Claude. La interfaz (`app/public/`) y el servidor (`app/server/`) son los de Michael. Aquí se apuntan los cambios de uno que afectan al otro.

## Estado (23/11/2026)
- Sin cambios todavía respecto a la demo de Michael. Rutas del servidor en `app/server/app.js`; llamadas desde la interfaz en `app/public/js/api.js`.
- Sesión de demo: cookie con el usuario elegido (no es autenticación real) y código de acceso (`DEMO_ACCESS_CODE`) para todas las rutas `/api` salvo `/api/health` y `/api/access`.

## Peticiones pendientes
| Fecha | Quién pide | Qué necesita | Estado |
|---|---|---|---|
