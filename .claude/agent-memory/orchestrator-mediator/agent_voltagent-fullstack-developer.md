---
name: agent-voltagent-fullstack-developer
description: voltagent fullstack-developer as code reviewer — accurate, stays in-scope when given tight guardrails; claims about DB need spot-checking
metadata:
  type: project
---

`voltagent-core-dev:fullstack-developer` usado como revisor de código (Fase 5, módulo Juez).

**Comportamiento observado:** respetó guardrails estrictos (review-only, sin editar, sin reportes .md, sin trabajo de fase futura). Hallazgos correctos y bien priorizados. NO inventó columnas: marcó explícitamente lo "a verificar contra schema".

**Punto a vigilar:** afirma haber leído migraciones y da por confirmados triggers/constraints (audit trigger, unique key del onConflict, close-immutable trigger). Verifiqué a mano: todas ciertas esa vez. Aun así, sus "CUMPLE" sobre reglas que dependen de BD (regla 3 audit, regla 6 RLS) deben spot-checkearse contra las migraciones antes de elevarlos como confirmados — mismo criterio que [[agent-voltagent-database-administrator]].

**How to apply:** buen agente para code review con guardrails apretados (review-only + lista de archivos + restricciones de fase/stack explícitas). Tras su entrega, verificar solo las afirmaciones load-bearing sobre el schema, no todo.
