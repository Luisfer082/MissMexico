-- ============================================================
-- Migration 4: judge_scoring
-- Calificaciones de los jueces en las entrevistas (top 5).
-- RLS: cada juez SOLO ve y modifica las propias.
-- ============================================================

-- ---------- TABLA: judge_scores ----------

create table public.judge_scores (
    id              uuid primary key default gen_random_uuid(),
    judge_id        uuid not null references auth.users(id) on delete cascade,
    participant_id  uuid not null references public.participants(id) on delete cascade,
    stage_id        uuid not null references public.stages(id) on delete cascade,
    score           numeric(4,2) not null default 0
        check (score >= 0 and score <= 10),
    updated_at      timestamptz not null default now(),
    unique (judge_id, participant_id, stage_id)
);

create index judge_scores_judge_idx       on public.judge_scores (judge_id);
create index judge_scores_participant_idx on public.judge_scores (participant_id);
create index judge_scores_stage_idx       on public.judge_scores (stage_id);

-- ---------- TRIGGER: el judge_id debe tener rol 'juez' ----------

create or replace function public.assert_judge_id_is_judge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    r public.app_role;
begin
    select role into r from public.profiles where id = new.judge_id;
    if r is null or r <> 'juez' then
        raise exception 'judge_id % no tiene rol juez', new.judge_id;
    end if;
    return new;
end;
$$;

create trigger judge_scores_assert_judge
    before insert or update on public.judge_scores
    for each row execute function public.assert_judge_id_is_judge();

-- ---------- TRIGGER: bloquear mutaciones si la etapa esta cerrada ----------
-- Reutiliza la funcion de Migration 2.

create trigger judge_scores_no_mutation_when_closed
    before insert or update or delete on public.judge_scores
    for each row execute function public.prevent_mutation_on_closed_stage();

-- ---------- TRIGGER: touch updated_at ----------

create trigger judge_scores_touch_updated_at
    before update on public.judge_scores
    for each row execute function public.touch_updated_at();

-- ============================================================
-- RLS
-- ============================================================

alter table public.judge_scores enable row level security;

-- Cada juez ve solo sus propias calificaciones
create policy "judge_scores_select_own"
    on public.judge_scores for select
    using (judge_id = auth.uid() and public.auth_role() = 'juez');

-- Encargado y director ven todas
create policy "judge_scores_select_admin"
    on public.judge_scores for select
    using (public.auth_role() in ('encargado', 'director'));

-- Cada juez inserta/actualiza solo sus propias filas
create policy "judge_scores_insert_own"
    on public.judge_scores for insert
    with check (judge_id = auth.uid() and public.auth_role() = 'juez');

create policy "judge_scores_update_own"
    on public.judge_scores for update
    using (judge_id = auth.uid() and public.auth_role() = 'juez')
    with check (judge_id = auth.uid() and public.auth_role() = 'juez');

-- Nadie borra judge_scores (audit). Sin policy de DELETE = bloqueado.
