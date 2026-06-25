-- ============================================================
-- Migration 11: fix_judge_score_closed_round_trigger
-- Repara dos bugs del trigger prevent_judge_score_on_closed_round
-- introducido en 20260618000000. Migracion ADITIVA: solo reemplaza
-- el cuerpo de la funcion (CREATE OR REPLACE). El trigger existente
-- (judge_scores_no_mutation_when_round_closed) sigue apuntando a ella.
--
-- C1: el lookup original buscaba la ronda por challenge_id con LIMIT 1.
--     Pero challenges es por EDICION (no por etapa) y judge_round_challenges
--     solo es unique(round_id, challenge_id): el mismo reto puede estar en
--     rondas de etapas distintas, asi que LIMIT 1 resolvia una ronda
--     arbitraria. Se corrige buscando por stage_id, que judge_rounds tiene
--     como unique(stage_id) y judge_scores expone como columna NOT NULL.
--
-- C2: si el SELECT no encontraba ronda, round_status quedaba NULL y la
--     comparacion `round_status = 'cerrada'` daba NULL (no TRUE), dejando
--     pasar inserts de retos sin ronda configurada. Ahora se rechaza
--     explicitamente cuando no existe ronda para la etapa.
-- ============================================================

create or replace function public.prevent_judge_score_on_closed_round()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    round_status text;
begin
    -- La ronda es unica por etapa (judge_rounds.unique(stage_id)) y
    -- judge_scores.stage_id es NOT NULL: lookup deterministico, sin LIMIT.
    select jr.status into round_status
    from public.judge_rounds jr
    where jr.stage_id = coalesce(new.stage_id, old.stage_id);

    -- C2: sin ronda configurada para la etapa no se permite calificar.
    if round_status is null then
        raise exception 'No existe una ronda de jueces para esta etapa: no se pueden capturar calificaciones';
    end if;

    -- Ronda cerrada: calificaciones congeladas (regla operativa 2 y 7).
    if round_status = 'cerrada' then
        raise exception 'La ronda de jueces esta cerrada: no se pueden modificar calificaciones';
    end if;

    return coalesce(new, old);
end;
$$;
