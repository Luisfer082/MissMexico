---
name: voltagent-rondas-collision
description: Punto de colisión confirmado RondasJuecesPage+useRondasJueces; voltagent corre typecheck pero se salta lint salvo que se exija
metadata:
  type: feedback
---

Dos hechos confirmados al coordinar Fase 5.2 con voltagent workers (backend/frontend/fullstack).

**Punto de colisión recurrente:** `src/pages/encargado/RondasJuecesPage.tsx` y `src/hooks/useRondasJueces.ts` son tocados tanto por trabajo de lógica/bug (backend) como por features de UI de rondas (frontend). NUNCA correr esos dos workers en paralelo: serializar backend primero, auditar, luego frontend sobre el código ya corregido. `usePuntosJueces`/`PuntosJueces`/`CalificacionesPage` (visor de puntos) son disjuntos y SÍ pueden ir en paralelo con el backend.

**Why:** ambos editan las mismas funciones del hook (`crearRonda`/`editarRonda`/`cerrarRonda`) y la misma lista de la página; en paralelo se pisan.

**How to apply:** al delegar trabajo sobre rondas de jueces, definir orden explícito y avisar a cada worker qué archivo NO tocar.

**Regla que los voltagent workers tienden a violar:** reportan "typecheck pasa" pero NO corren `npm run lint` salvo que se les exija explícitamente. En 5.2 el fullstack-developer introdujo 2 errores `react-hooks/set-state-in-effect` (setState dentro de useEffect) que typecheck no detecta. SIEMPRE exigir `npm run lint` además de typecheck en el prompt y verificarlo tú al final. Fix idiomático del lint: derivar con `useMemo` en vez de sincronizar estado con un effect.
