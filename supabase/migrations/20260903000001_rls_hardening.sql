-- ============================================================
-- Migration: rls_hardening
-- Fase 9 (hardening), paso 4. Dos decisiones de Luis (2026-09-03).
--
-- Aditiva en el sentido del proyecto: es una migracion NUEVA. No se
-- edita ninguna ya aplicada; la policy de challenge_scores se
-- reemplaza aqui con drop + create, que es la unica forma de cambiar
-- una policy en Postgres.
-- ============================================================

-- ============================================================
-- 1. M2 -- los puntos del encargado dejan de ser visibles al juez
-- ============================================================
--
-- challenge_scores_select_authenticated (migracion 20260520005656) era
-- "using (true)": cualquier autenticado, jueces incluidos, podia leer
-- los puntos que captura el encargado. Estaba anotado en 5.1 como
-- decision pendiente por SESGO DEL JUEZ: no viola la regla 5 (no son
-- calificaciones de otros jueces) pero permite que un juez vea como va
-- la competencia mientras califica.
--
-- Decision de Luis (2026-09-03): ocultarlos.
--
-- Verificado antes de tocarlo: quien lee challenge_scores en el front
-- es useCalificaciones/LeaderboardPanel (Encargado) y
-- usePromediosDirector (Director). NINGUN modulo del juez consulta esa
-- tabla, asi que restringirla no rompe ninguna pantalla existente.
--
-- Se usa "<> 'juez'" y no una lista blanca de roles a proposito: si
-- manana aparece un rol nuevo, el criterio es que el unico que no debe
-- ver esto es el juez.

drop policy if exists "challenge_scores_select_authenticated" on public.challenge_scores;

create policy "challenge_scores_select_no_juez"
    on public.challenge_scores for select
    to authenticated
    using (public.auth_role() <> 'juez');

-- ============================================================
-- 2. El director puede leer nombres de jueces
-- ============================================================
--
-- profiles solo tenia profiles_select_own y profiles_select_encargado.
-- usePromediosDirector/usePuntosJueces piden nombres de jueces desde el
-- director y recibian vacio: la pantalla se veia rota (nombres en
-- blanco). Anotado en 5.6 como preexistente, no introducido por aquella
-- fase.
--
-- No viola la regla 5: el aislamiento de jueces protege al JUEZ de ver
-- calificaciones ajenas, no al director de supervisar quien califico
-- que. El director ya podia leer los judge_scores (policy
-- judge_scores_select_admin); lo unico que le faltaba era poder poner
-- un nombre a cada uno.
--
-- Es SELECT, no update: el director no puede modificar perfiles.

create policy "profiles_select_director"
    on public.profiles for select
    using (public.auth_role() = 'director');
