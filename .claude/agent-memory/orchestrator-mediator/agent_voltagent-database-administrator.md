---
name: agent-voltagent-database-administrator
description: Cómo se comporta voltagent-infra:database-administrator al revisar schema/RLS de Supabase, y qué auditar de su salida
metadata:
  type: feedback
---

`voltagent-infra:database-administrator` cubre el dominio db-architect (pendiente en CLAUDE.md) bajo mediación del orchestrator. Comportamiento observado en la revisión del schema de jueces (Fase 5):

- Técnicamente fuerte en RLS/triggers de Postgres. Razonamiento correcto sobre `to_jsonb(NEW)` recogiendo columnas nuevas tras un `ALTER ADD COLUMN` sin tocar el trigger.
- Respetó dominio: solo DB, no tocó código de app, propuso migración ADITIVA con `CREATE OR REPLACE FUNCTION`, no escribió archivos .md de informe (devolvió texto).
- No inventó columnas/policies: las que citó (`editions_select_authenticated`, `profiles_select_own`, etc.) existen.

**Punto a auditar siempre:** tiende a ASUMIR cardinalidad/relaciones sin leer la tabla. En la revisión afirmó que un `challenge_id` puede estar en múltiples rondas (base del hallazgo C1) sin verificar el scope de `challenges`. Resultó correcto (`challenges.edition_id`, no por etapa), pero hay que confirmar las FKs/uniques reales antes de aceptar la severidad de sus hallazgos.

**Why:** mi deber anti-datos-inventados exige validar sus supuestos contra el schema, no contra su narrativa.
**How to apply:** cuando este agente clasifique algo como CRÍTICO apoyándose en "X puede pertenecer a varios Y", leer la definición de la tabla (FK/unique) antes de elevar el veredicto a Luis.
