---
name: round-close-double-confirm
description: RESUELTA — regla 7 solo cubre cierre de ETAPA; las rondas de jueces se editan/cierran sin tratarse como irreversibles
metadata:
  type: project
---

RESUELTA por Luis (Fase 5.2, 2026-06-24). Lo ÚNICO irreversible bajo la regla 7 es **CERRAR LA ETAPA (stage)**. Las **rondas de jueces (judge_rounds) SÍ se editan y se cambian**; cerrar una ronda NO es irreversible-absoluto y no debe presentarse con lenguaje de "IRREVERSIBLE".

Cambios derivados aplicados en Fase 5.2:
- Se quitó el lenguaje "IRREVERSIBLE" del ConfirmDialog de cerrar ronda en `RondasJuecesPage`.
- Se agregó botón "Editar ronda" (función `editarRonda` en `useRondasJueces`, estrategia delete+reinsert de retos/jueces).
- Editar ronda quedó gateado tras `!cerrada`: una ronda CERRADA solo muestra badge, sin acciones — alineado a regla 2 (read-only al cerrar) y protegido en BD por el trigger `judge_rounds_close_immutable`.

**Why:** evita over-engineering de doble confirmación donde el producto no lo pide; mantiene irreversibilidad solo donde importa (cierre de etapa).

**How to apply:** NO re-escalar si una ronda parece "editable". Solo el cierre de ETAPA exige doble confirmación. Relacionado con [[judge-challenge-scores-visibility]].
