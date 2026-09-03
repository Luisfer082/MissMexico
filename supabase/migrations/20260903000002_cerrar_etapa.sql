-- ============================================================
-- Migration: cerrar_etapa
-- Fase 9 (hardening), cierre de etapa. Decisiones de Luis (2026-09-03):
--   1. El snapshot lleva participantes, sus challenge_scores, sus
--      judge_scores agregados y el rank final.
--   2. Solo el encargado cierra.
--   3. Cerrar la etapa cierra tambien su ronda de jueces abierta.
--
-- Aditiva: no se edita ninguna migracion aplicada. La BD ya tenia desde
-- Fase 1 la tabla stage_snapshots (inmutable por trigger), el trigger
-- que sella closed_at y prohibe reabrir, y los bloqueos de judge_scores
-- y stage_participants con la etapa cerrada. Lo que faltaba era quien
-- pusiera status='cerrada' y grabara el snapshot.
--
-- Por que una funcion y no cuatro llamadas desde el cliente: cerrar son
-- cuatro escrituras que tienen que ir juntas (rank, snapshot, ronda,
-- etapa). Si el cliente las manda una por una y falla la tercera, queda
-- una etapa abierta CON snapshot, y no se puede reintentar porque el
-- snapshot es unico por etapa. Aqui es una sola transaccion, y el
-- snapshot se arma con lo que la BD tiene en ese instante, no con lo
-- que el navegador cargo hace un rato.
-- ============================================================

-- ============================================================
-- 1. Funcion cerrar_etapa(p_stage_id)
-- ============================================================
--
-- SECURITY DEFINER para poder escribir stage_participants, stage_snapshots,
-- judge_rounds y stages sin depender de cuatro policies distintas. Por eso
-- valida el rol ella misma: el JWT dice quien eres, no que rol tienes.
--
-- Orden de las escrituras (importa):
--   a) rank en stage_participants -- ANTES de cerrar: el trigger
--      stage_participants_no_mutation_when_closed lo bloquearia despues.
--   b) snapshot.
--   c) ronda de jueces -> cerrada (si estaba abierta).
--   d) etapa -> cerrada (el trigger sella closed_at).
--
-- Rank final = total del encargado + total de jueces, desempate por numero
-- de banda. Es el mismo orden que proyecta computeLeaderboard en el
-- modulo Encargado. Los puntos del encargado son TODOS los retos de la
-- edicion (los retos cuelgan de edition_id, no de una etapa); los de
-- jueces son los judge_scores con stage_id = esta etapa.
--
-- Devuelve el id del snapshot creado.

create or replace function public.cerrar_etapa(p_stage_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_stage       public.stages%rowtype;
    v_round_id    uuid;
    v_snapshot    jsonb;
    v_snapshot_id uuid;
begin
    if public.auth_role() is distinct from 'encargado' then
        raise exception 'Solo el encargado puede cerrar una etapa';
    end if;

    -- Bloquea la fila: dos clics simultaneos no cierran dos veces.
    select * into v_stage
    from public.stages
    where id = p_stage_id
    for update;

    if not found then
        raise exception 'Etapa no encontrada (id=%)', p_stage_id;
    end if;

    if v_stage.status = 'cerrada' then
        raise exception 'La etapa "%" ya esta cerrada', v_stage.name;
    end if;

    -- Ronda de jueces de la etapa (unique (stage_id): hay como mucho una).
    select id into v_round_id
    from public.judge_rounds
    where stage_id = p_stage_id;

    -- a) Rank final en stage_participants
    with enc as (
        select cs.participant_id, sum(cs.score) as total
        from public.challenge_scores cs
        join public.challenges c on c.id = cs.challenge_id
        where c.edition_id = v_stage.edition_id
        group by cs.participant_id
    ),
    jue as (
        select js.participant_id, sum(js.score) as total
        from public.judge_scores js
        where js.stage_id = p_stage_id
        group by js.participant_id
    ),
    ranked as (
        select sp.id,
               row_number() over (
                   order by coalesce(enc.total, 0) + coalesce(jue.total, 0) desc,
                            p.sash_number asc
               ) as pos
        from public.stage_participants sp
        join public.participants p on p.id = sp.participant_id
        left join enc on enc.participant_id = sp.participant_id
        left join jue on jue.participant_id = sp.participant_id
        where sp.stage_id = p_stage_id
    )
    update public.stage_participants sp
    set rank = ranked.pos
    from ranked
    where sp.id = ranked.id;

    -- b) Snapshot
    select jsonb_build_object(
        'version', 1,
        'edition_id', v_stage.edition_id,
        'stage', jsonb_build_object(
            'id', v_stage.id,
            'slug', v_stage.slug,
            'name', v_stage.name,
            'order_num', v_stage.order_num,
            'cupo', v_stage.cupo
        ),
        'judge_round_id', v_round_id,
        'closed_at', now(),
        'closed_by', auth.uid(),
        'participants', coalesce(jsonb_agg(t.fila order by t.rank), '[]'::jsonb)
    )
    into v_snapshot
    from (
        select
            sp.rank,
            jsonb_build_object(
                'participant_id', p.id,
                'sash_number', p.sash_number,
                'full_name', p.full_name,
                'region', p.region,
                'rank', sp.rank,
                'advanced', sp.advanced,
                'retos', (
                    select coalesce(jsonb_agg(jsonb_build_object(
                        'challenge_id', c.id,
                        'name', c.name,
                        'order_num', c.order_num,
                        'score', cs.score
                    ) order by c.order_num), '[]'::jsonb)
                    from public.challenge_scores cs
                    join public.challenges c on c.id = cs.challenge_id
                    where cs.participant_id = p.id
                      and c.edition_id = v_stage.edition_id
                ),
                'total_encargado', (
                    select coalesce(sum(cs.score), 0)
                    from public.challenge_scores cs
                    join public.challenges c on c.id = cs.challenge_id
                    where cs.participant_id = p.id
                      and c.edition_id = v_stage.edition_id
                ),
                'jueces', (
                    select jsonb_build_object(
                        'total',    coalesce(sum(js.score), 0),
                        'promedio', coalesce(avg(js.score), 0),
                        'cuenta',   count(*)
                    )
                    from public.judge_scores js
                    where js.participant_id = p.id
                      and js.stage_id = p_stage_id
                ),
                'total', (
                    select coalesce(sum(cs.score), 0)
                    from public.challenge_scores cs
                    join public.challenges c on c.id = cs.challenge_id
                    where cs.participant_id = p.id
                      and c.edition_id = v_stage.edition_id
                ) + (
                    select coalesce(sum(js.score), 0)
                    from public.judge_scores js
                    where js.participant_id = p.id
                      and js.stage_id = p_stage_id
                )
            ) as fila
        from public.stage_participants sp
        join public.participants p on p.id = sp.participant_id
        where sp.stage_id = p_stage_id
    ) t;

    insert into public.stage_snapshots (stage_id, snapshot)
    values (p_stage_id, v_snapshot)
    returning id into v_snapshot_id;

    -- c) Ronda de jueces (decision 3). El trigger judge_rounds_close_immutable
    --    sella closed_at.
    if v_round_id is not null then
        update public.judge_rounds
        set status = 'cerrada'
        where id = v_round_id
          and status = 'abierta';
    end if;

    -- d) Etapa. El trigger stages_close_immutable sella closed_at y a partir
    --    de aqui nadie la reabre.
    update public.stages
    set status = 'cerrada'
    where id = p_stage_id;

    return v_snapshot_id;
end;
$$;

-- Solo usuarios autenticados la pueden invocar; el rol se valida dentro.
revoke all on function public.cerrar_etapa(uuid) from public;
grant execute on function public.cerrar_etapa(uuid) to authenticated;

-- ============================================================
-- 2. El juez no lee snapshots
-- ============================================================
--
-- stage_snapshots_select_authenticated (migracion 20260520010003) era
-- "using (true)". El snapshot lleva los puntos del encargado (que el
-- juez ya no ve desde 20260903000001) y los judge_scores AGREGADOS por
-- participante, y la regla 5 dice que un juez nunca ve calificaciones de
-- otros, "ni agregadas". Mismo criterio que challenge_scores: el unico
-- que no debe leer esto es el juez. Anunciador y director siguen leyendo.

drop policy if exists "stage_snapshots_select_authenticated" on public.stage_snapshots;

create policy "stage_snapshots_select_no_juez"
    on public.stage_snapshots for select
    to authenticated
    using (public.auth_role() <> 'juez');
