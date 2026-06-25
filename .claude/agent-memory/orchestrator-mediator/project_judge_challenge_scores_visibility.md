---
name: project-judge-challenge-scores-visibility
description: Decisión de producto pendiente — si un juez debe poder leer challenge_scores (posible sesgo) frente a la regla 5 de aislamiento
metadata:
  type: project
---

Pregunta de producto ABIERTA elevada a Luis el 2026-06-23 durante la revisión de schema previa a Fase 5 (Módulo Juez).

Hecho: `challenge_scores_select_authenticated` deja los puntajes capturados por el encargado visibles a CUALQUIER autenticado, incluidos jueces. No son calificaciones de otros jueces (fuente distinta), así que no viola técnicamente la regla 5 ("un juez nunca ve calificaciones de otros jueces ni agregadas"), pero un juez vería el standing/puntos del encargado antes de calificar → posible sesgo.

**Why:** la regla 5 dice "ni agregadas" y es ambigua respecto a challenge_scores; tocar esa policy es decisión de Luis, no del schema.
**How to apply:** no cambiar la policy de `challenge_scores` sin que Luis decida. Si Luis dice que el leaderboard se proyecta en vivo, el juez ya lo ve y no hay fuga. Si no, hace falta una migración aditiva que restrinja SELECT de challenge_scores para rol juez. Mientras siga ABIERTA, no re-escalar repetidamente; recordar que está pendiente.
