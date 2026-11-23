# Auditoría de la IA

Riesgos de la IA de la demo, la prueba que los demuestra y el arreglo. Se rellena en la semana 1.

| # | Riesgo | Dónde | Prueba | Estado | Arreglo |
|---|---|---|---|---|---|
| 1 | Inyección de instrucciones en materiales subidos (PDF/Word) | `studio-ai.js` (`readMaterial`), `builder.js` | | Pendiente | |
| 2 | Manipulación del role-play y del feedback por el delegado | `roleplay.js` | | Pendiente | |
| 3 | Afirmaciones fuera de los materiales aprobados | `roleplay.js`, `builder.js`, `studio-ai.js`, `review.js` | | Pendiente | |
| 4 | Fuga de datos: prompts, materiales o conversaciones al navegador o a los logs | `app.js`, `roleplay.js` | | Pendiente | |
| 5 | Gasto descontrolado: avatar, llamadas a Claude, reinicio de la demo | `app.js`, `avatar.js` | | Pendiente | |
| 6 | Salidas de la IA sin validar | `builder.js` (`streamJson`), `review.js` | | Pendiente | |
