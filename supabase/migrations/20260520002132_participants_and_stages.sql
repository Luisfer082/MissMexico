-- ============================================================
-- Migration 2: participants_and_stages
-- Tablas: participants, stages, stage_participants
-- Triggers: cierre de etapa irreversible, bloqueo de mutaciones
-- en stage_participants cuando la etapa esta cerrada.
-- ============================================================

-- ---------- TABLA: participants ----------

create table public.participants (
    id            uuid primary key default gen_random_uuid(),
    edition_id    uuid not null references public.editions(id) on delete cascade,
    sash_number   integer not null,
    full_name     text not null,
    region        text not null,
    photo_url     text,
    created_at    timestamptz not null default now(),
    unique (edition_id, sash_number)
);

create index participants_edition_idx on public.participants (edition_id);

-- ---------- TABLA: stages ----------

create table public.stages (
    id           uuid primary key default gen_random_uuid(),
    edition_id   uuid not null references public.editions(id) on delete cascade,
    slug         text not null,
    name         text not null,
    order_num    integer not null,
    cupo         integer not null check (cupo > 0),
    status       text not null default 'abierta' check (status in ('abierta', 'cerrada')),
    closed_at    timestamptz,
    created_at   timestamptz not null default now(),
    unique (edition_id, slug),
    unique (edition_id, order_num)
);

create index stages_edition_idx on public.stages (edition_id);

-- ---------- TRIGGER: cierre de etapa irreversible ----------
-- Una vez cerrada, no se puede reabrir. Permite cerrar (abierta -> cerrada),
-- pero bloquea cualquier transicion desde cerrada.

create or replace function public.enforce_stage_close_immutable()
returns trigger
language plpgsql
as $$
begin
    if old.status = 'cerrada' and new.status <> 'cerrada' then
        raise exception 'No se puede reabrir una etapa cerrada (id=%)', old.id;
    end if;
    -- Cuando se cierra, sellar closed_at automaticamente
    if old.status = 'abierta' and new.status = 'cerrada' and new.closed_at is null then
        new.closed_at := now();
    end if;
    return new;
end;
$$;

create trigger stages_close_immutable
    before update on public.stages
    for each row execute function public.enforce_stage_close_immutable();

-- Tampoco se puede borrar una etapa cerrada
create or replace function public.prevent_closed_stage_delete()
returns trigger
language plpgsql
as $$
begin
    if old.status = 'cerrada' then
        raise exception 'No se puede eliminar una etapa cerrada (id=%)', old.id;
    end if;
    return old;
end;
$$;

create trigger stages_no_delete_when_closed
    before delete on public.stages
    for each row execute function public.prevent_closed_stage_delete();

-- ---------- TABLA: stage_participants ----------
-- Whitelist: quien esta participando en cada etapa.
-- 'advanced' = true cuando el encargado la selecciona para pasar a la siguiente.
-- 'rank' = posicion final segun puntaje (se llena al cerrar la etapa).

create table public.stage_participants (
    id              uuid primary key default gen_random_uuid(),
    stage_id        uuid not null references public.stages(id) on delete cascade,
    participant_id  uuid not null references public.participants(id) on delete cascade,
    rank            integer,
    advanced        boolean not null default false,
    created_at      timestamptz not null default now(),
    unique (stage_id, participant_id)
);

create index stage_participants_stage_idx on public.stage_participants (stage_id);
create index stage_participants_participant_idx on public.stage_participants (participant_id);

-- ---------- TRIGGER: bloquear mutaciones cuando la etapa esta cerrada ----------

create or replace function public.prevent_mutation_on_closed_stage()
returns trigger
language plpgsql
as $$
declare
    stage_status text;
    target_stage_id uuid;
begin
    target_stage_id := coalesce(new.stage_id, old.stage_id);
    select status into stage_status from public.stages where id = target_stage_id;
    if stage_status = 'cerrada' then
        raise exception 'La etapa % esta cerrada: no se pueden modificar sus participantes', target_stage_id;
    end if;
    return coalesce(new, old);
end;
$$;

create trigger stage_participants_no_mutation_when_closed
    before insert or update or delete on public.stage_participants
    for each row execute function public.prevent_mutation_on_closed_stage();

-- ============================================================
-- RLS
-- ============================================================

alter table public.participants enable row level security;
alter table public.stages enable row level security;
alter table public.stage_participants enable row level security;

-- ---------- participants ----------

create policy "participants_select_authenticated"
    on public.participants for select
    to authenticated
    using (true);

create policy "participants_write_encargado"
    on public.participants for all
    using (public.auth_role() = 'encargado')
    with check (public.auth_role() = 'encargado');

-- ---------- stages ----------

create policy "stages_select_authenticated"
    on public.stages for select
    to authenticated
    using (true);

create policy "stages_write_encargado"
    on public.stages for all
    using (public.auth_role() = 'encargado')
    with check (public.auth_role() = 'encargado');

-- ---------- stage_participants ----------

create policy "stage_participants_select_authenticated"
    on public.stage_participants for select
    to authenticated
    using (true);

create policy "stage_participants_write_encargado"
    on public.stage_participants for all
    using (public.auth_role() = 'encargado')
    with check (public.auth_role() = 'encargado');
