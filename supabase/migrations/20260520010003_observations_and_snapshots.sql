-- ============================================================
-- Migration 6: observations_and_snapshots
-- Observaciones privadas (encargado + director) y snapshots
-- inmutables al cerrar una etapa.
-- ============================================================

-- ---------- TABLA: observations ----------
-- Notas internas sobre una participante. Privadas: solo encargado y
-- director las ven o crean. Una vez escritas, son inmutables.

create table public.observations (
    id              uuid primary key default gen_random_uuid(),
    edition_id      uuid not null references public.editions(id) on delete cascade,
    participant_id  uuid not null references public.participants(id) on delete cascade,
    author_id       uuid not null references auth.users(id),
    body            text not null check (length(body) > 0),
    created_at      timestamptz not null default now()
);

create index observations_participant_idx on public.observations (participant_id);
create index observations_edition_idx     on public.observations (edition_id);

-- ---------- TRIGGER: observations inmutables ----------

create or replace function public.prevent_observation_mutation()
returns trigger
language plpgsql
as $$
begin
    raise exception 'Las observaciones son inmutables. Crear una nueva en su lugar.';
end;
$$;

create trigger observations_no_update
    before update or delete on public.observations
    for each row execute function public.prevent_observation_mutation();

-- ---------- TABLA: stage_snapshots ----------
-- Foto inmutable del estado de una etapa al momento de cerrarla.
-- 'snapshot' guarda los participantes, sus puntajes y su rank
-- en JSONB. La app la genera y la inserta al cerrar la etapa.

create table public.stage_snapshots (
    id           uuid primary key default gen_random_uuid(),
    stage_id     uuid not null references public.stages(id) on delete cascade,
    snapshot     jsonb not null,
    created_at   timestamptz not null default now(),
    unique (stage_id)
);

create index stage_snapshots_stage_idx on public.stage_snapshots (stage_id);

-- ---------- TRIGGER: snapshots inmutables (CLAUDE.md sec 4.1) ----------

create or replace function public.prevent_snapshot_mutation()
returns trigger
language plpgsql
as $$
begin
    raise exception 'Los stage_snapshots son inmutables.';
end;
$$;

create trigger stage_snapshots_no_update
    before update or delete on public.stage_snapshots
    for each row execute function public.prevent_snapshot_mutation();

-- ============================================================
-- RLS
-- ============================================================

alter table public.observations enable row level security;
alter table public.stage_snapshots enable row level security;

-- ---------- observations (privadas) ----------

create policy "observations_select_admin"
    on public.observations for select
    using (public.auth_role() in ('encargado', 'director'));

create policy "observations_insert_admin"
    on public.observations for insert
    with check (
        public.auth_role() in ('encargado', 'director')
        and author_id = auth.uid()
    );

-- ---------- stage_snapshots ----------
-- Lectura para autenticados (anunciador necesita ver resultados finales).
-- Solo encargado inserta (la app lo hace al cerrar etapa).

create policy "stage_snapshots_select_authenticated"
    on public.stage_snapshots for select
    to authenticated
    using (true);

create policy "stage_snapshots_insert_encargado"
    on public.stage_snapshots for insert
    with check (public.auth_role() = 'encargado');
