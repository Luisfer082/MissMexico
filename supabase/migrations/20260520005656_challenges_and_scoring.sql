-- ============================================================
-- Migration 3: challenges_and_scoring
-- Los 17 retos pre-finales + captura de puntajes por el encargado.
-- Se autogeneran filas score=0 para cada (participante, reto) para
-- que el encargado vea una matriz completa.
-- ============================================================

-- ---------- TABLA: challenges ----------

create table public.challenges (
    id            uuid primary key default gen_random_uuid(),
    edition_id    uuid not null references public.editions(id) on delete cascade,
    name          text not null,
    description   text,
    order_num     integer not null,
    created_at    timestamptz not null default now(),
    unique (edition_id, order_num)
);

create index challenges_edition_idx on public.challenges (edition_id);

-- ---------- TABLA: challenge_scores ----------
-- Matriz (participant x challenge). Una fila por combinacion.

create table public.challenge_scores (
    id              uuid primary key default gen_random_uuid(),
    challenge_id    uuid not null references public.challenges(id) on delete cascade,
    participant_id  uuid not null references public.participants(id) on delete cascade,
    score           numeric(4,2) not null default 0
        check (score >= 0 and score <= 10),
    updated_at      timestamptz not null default now(),
    updated_by      uuid references auth.users(id),
    unique (challenge_id, participant_id)
);

create index challenge_scores_challenge_idx on public.challenge_scores (challenge_id);
create index challenge_scores_participant_idx on public.challenge_scores (participant_id);

-- ---------- TRIGGER: mantener updated_at fresco ----------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

create trigger challenge_scores_touch_updated_at
    before update on public.challenge_scores
    for each row execute function public.touch_updated_at();

-- ---------- TRIGGER: autogenerar matriz completa ----------
-- Cuando se crea un participante, se insertan filas score=0 para cada
-- reto existente en su edicion.
-- Cuando se crea un reto, se insertan filas score=0 para cada
-- participante existente en su edicion.

create or replace function public.seed_scores_for_new_participant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.challenge_scores (challenge_id, participant_id)
    select c.id, new.id
    from public.challenges c
    where c.edition_id = new.edition_id
    on conflict do nothing;
    return new;
end;
$$;

create trigger participants_seed_scores
    after insert on public.participants
    for each row execute function public.seed_scores_for_new_participant();

create or replace function public.seed_scores_for_new_challenge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.challenge_scores (challenge_id, participant_id)
    select new.id, p.id
    from public.participants p
    where p.edition_id = new.edition_id
    on conflict do nothing;
    return new;
end;
$$;

create trigger challenges_seed_scores
    after insert on public.challenges
    for each row execute function public.seed_scores_for_new_challenge();

-- ============================================================
-- RLS
-- ============================================================

alter table public.challenges enable row level security;
alter table public.challenge_scores enable row level security;

-- ---------- challenges ----------

create policy "challenges_select_authenticated"
    on public.challenges for select
    to authenticated
    using (true);

create policy "challenges_write_encargado"
    on public.challenges for all
    using (public.auth_role() = 'encargado')
    with check (public.auth_role() = 'encargado');

-- ---------- challenge_scores ----------
-- Lectura abierta a autenticados: estos puntajes son la base del
-- leaderboard publico (la persona que califica esta fuera del sistema,
-- no hay aislamiento por calificador como en judge_scores).

create policy "challenge_scores_select_authenticated"
    on public.challenge_scores for select
    to authenticated
    using (true);

create policy "challenge_scores_write_encargado"
    on public.challenge_scores for all
    using (public.auth_role() = 'encargado')
    with check (public.auth_role() = 'encargado');
