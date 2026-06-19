-- ============================================================
-- Migration 10: judge_rounds_and_per_challenge_scores
-- Rondas de calificacion de jueces. El encargado elige una etapa
-- (que define los finalistas via stage_participants), los retos a
-- calificar y los jueces participantes. Las calificaciones de jueces
-- pasan a ser POR RETO: se agrega challenge_id a judge_scores.
-- ============================================================

-- ---------- TABLA: judge_rounds ----------
-- Una ronda de jueces por etapa. status controla si los jueces capturan.

create table public.judge_rounds (
    id          uuid primary key default gen_random_uuid(),
    stage_id    uuid not null references public.stages(id) on delete cascade,
    status      text not null default 'abierta' check (status in ('abierta', 'cerrada')),
    closed_at   timestamptz,
    created_at  timestamptz not null default now(),
    unique (stage_id)
);

create index judge_rounds_stage_idx on public.judge_rounds (stage_id);

-- ---------- TRIGGER: cierre de ronda irreversible ----------
-- Espeja enforce_stage_close_immutable de Migration 2: permite cerrar
-- (abierta -> cerrada) pero bloquea reabrir. Sella closed_at al cerrar.

create or replace function public.enforce_judge_round_close_immutable()
returns trigger
language plpgsql
as $$
begin
    if old.status = 'cerrada' and new.status <> 'cerrada' then
        raise exception 'No se puede reabrir una ronda de jueces cerrada (id=%)', old.id;
    end if;
    if old.status = 'abierta' and new.status = 'cerrada' and new.closed_at is null then
        new.closed_at := now();
    end if;
    return new;
end;
$$;

create trigger judge_rounds_close_immutable
    before update on public.judge_rounds
    for each row execute function public.enforce_judge_round_close_immutable();

-- ---------- TABLA: judge_round_challenges ----------
-- Que retos califican los jueces en esta ronda.

create table public.judge_round_challenges (
    id           uuid primary key default gen_random_uuid(),
    round_id     uuid not null references public.judge_rounds(id) on delete cascade,
    challenge_id uuid not null references public.challenges(id) on delete cascade,
    created_at   timestamptz not null default now(),
    unique (round_id, challenge_id)
);

create index judge_round_challenges_round_idx     on public.judge_round_challenges (round_id);
create index judge_round_challenges_challenge_idx on public.judge_round_challenges (challenge_id);

-- ---------- TABLA: judge_round_judges ----------
-- Que jueces participan en la ronda. Permite saber el universo esperado
-- para el monitoreo de avance (cuantos jueces faltan por capturar).

create table public.judge_round_judges (
    id         uuid primary key default gen_random_uuid(),
    round_id   uuid not null references public.judge_rounds(id) on delete cascade,
    judge_id   uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    unique (round_id, judge_id)
);

create index judge_round_judges_round_idx on public.judge_round_judges (round_id);
create index judge_round_judges_judge_idx on public.judge_round_judges (judge_id);

-- El judge_id asignado debe tener rol 'juez'. Reutiliza la funcion de
-- Migration 4 (assert_judge_id_is_judge tambien lee new.judge_id).
create trigger judge_round_judges_assert_judge
    before insert or update on public.judge_round_judges
    for each row execute function public.assert_judge_id_is_judge();

-- ============================================================
-- ALTER: judge_scores ahora es POR RETO
-- ============================================================
-- Asume que judge_scores esta vacia (el modulo juez aun no existe).
-- Si hubiera filas de prueba, vaciarlas antes de aplicar esta migracion.

alter table public.judge_scores
    add column challenge_id uuid not null references public.challenges(id) on delete cascade;

-- La unicidad pasa de (judge, participant, stage) a (judge, participant, challenge).
-- stage_id se conserva: lo usa el trigger judge_scores_no_mutation_when_closed.
alter table public.judge_scores
    drop constraint judge_scores_judge_id_participant_id_stage_id_key;

alter table public.judge_scores
    add constraint judge_scores_judge_participant_challenge_key
    unique (judge_id, participant_id, challenge_id);

create index judge_scores_challenge_idx on public.judge_scores (challenge_id);

-- ---------- TRIGGER: bloquear judge_scores si la RONDA esta cerrada ----------
-- Complementa al bloqueo por etapa cerrada (Migration 4). El cierre de la
-- ronda (status='cerrada') tambien congela las calificaciones.

create or replace function public.prevent_judge_score_on_closed_round()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    round_status text;
begin
    select jr.status into round_status
    from public.judge_round_challenges jrc
    join public.judge_rounds jr on jr.id = jrc.round_id
    where jrc.challenge_id = coalesce(new.challenge_id, old.challenge_id)
    limit 1;

    if round_status = 'cerrada' then
        raise exception 'La ronda de jueces esta cerrada: no se pueden modificar calificaciones';
    end if;
    return coalesce(new, old);
end;
$$;

create trigger judge_scores_no_mutation_when_round_closed
    before insert or update or delete on public.judge_scores
    for each row execute function public.prevent_judge_score_on_closed_round();

-- ============================================================
-- RLS
-- ============================================================

alter table public.judge_rounds           enable row level security;
alter table public.judge_round_challenges enable row level security;
alter table public.judge_round_judges     enable row level security;

-- ---------- judge_rounds ----------
-- Config no sensible: lectura abierta a autenticados (los jueces necesitan
-- conocer su ronda). Escritura solo encargado.

create policy "judge_rounds_select_authenticated"
    on public.judge_rounds for select
    to authenticated
    using (true);

create policy "judge_rounds_write_encargado"
    on public.judge_rounds for all
    using (public.auth_role() = 'encargado')
    with check (public.auth_role() = 'encargado');

-- ---------- judge_round_challenges ----------

create policy "judge_round_challenges_select_authenticated"
    on public.judge_round_challenges for select
    to authenticated
    using (true);

create policy "judge_round_challenges_write_encargado"
    on public.judge_round_challenges for all
    using (public.auth_role() = 'encargado')
    with check (public.auth_role() = 'encargado');

-- ---------- judge_round_judges ----------
-- Aislamiento (regla 5): un juez solo ve su propia asignacion, no quienes
-- mas son jueces. Encargado y director ven todas.

create policy "judge_round_judges_select_own"
    on public.judge_round_judges for select
    using (judge_id = auth.uid() and public.auth_role() = 'juez');

create policy "judge_round_judges_select_admin"
    on public.judge_round_judges for select
    using (public.auth_role() in ('encargado', 'director'));

create policy "judge_round_judges_write_encargado"
    on public.judge_round_judges for all
    using (public.auth_role() = 'encargado')
    with check (public.auth_role() = 'encargado');
