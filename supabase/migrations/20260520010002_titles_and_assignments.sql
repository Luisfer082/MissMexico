-- ============================================================
-- Migration 5: titles_and_assignments
-- Catalogo de titulos (6 titulos + 2 finalistas) y la asignacion
-- drag-and-drop que hace el director.
-- ============================================================

-- ---------- TABLA: titles ----------

create table public.titles (
    id           uuid primary key default gen_random_uuid(),
    edition_id   uuid not null references public.editions(id) on delete cascade,
    name         text not null,
    order_num    integer not null,
    kind         text not null check (kind in ('titulo', 'finalista')),
    created_at   timestamptz not null default now(),
    unique (edition_id, order_num),
    unique (edition_id, name)
);

create index titles_edition_idx on public.titles (edition_id);

-- ---------- TABLA: title_assignments ----------
-- Una participante = un solo titulo por edicion.
-- Un titulo = una sola participante.

create table public.title_assignments (
    id              uuid primary key default gen_random_uuid(),
    edition_id      uuid not null references public.editions(id) on delete cascade,
    title_id        uuid not null references public.titles(id) on delete cascade,
    participant_id  uuid not null references public.participants(id) on delete cascade,
    assigned_by     uuid references auth.users(id),
    assigned_at     timestamptz not null default now(),
    approved        boolean not null default false,
    approved_at     timestamptz,
    unique (title_id),
    unique (edition_id, participant_id)
);

create index title_assignments_edition_idx on public.title_assignments (edition_id);

-- ---------- TRIGGER: consistencia title <-> edition ----------

create or replace function public.assert_title_edition_match()
returns trigger
language plpgsql
as $$
declare
    title_edition uuid;
begin
    select edition_id into title_edition from public.titles where id = new.title_id;
    if title_edition is null then
        raise exception 'title_id % no existe', new.title_id;
    end if;
    if title_edition <> new.edition_id then
        raise exception 'title_id % pertenece a una edicion distinta', new.title_id;
    end if;
    return new;
end;
$$;

create trigger title_assignments_assert_edition
    before insert or update on public.title_assignments
    for each row execute function public.assert_title_edition_match();

-- ---------- TRIGGER: una vez aprobada, inmutable ----------
-- Si approved=true, no se permite UPDATE ni DELETE. Si se quiere
-- cambiar, primero hay que des-aprobar (no implementado: por diseno
-- una asignacion aprobada es final).

create or replace function public.prevent_mutation_when_approved()
returns trigger
language plpgsql
as $$
begin
    if tg_op = 'UPDATE' and old.approved = true then
        raise exception 'title_assignment % ya esta aprobada, no se puede modificar', old.id;
    end if;
    if tg_op = 'DELETE' and old.approved = true then
        raise exception 'title_assignment % ya esta aprobada, no se puede eliminar', old.id;
    end if;
    -- Sellar approved_at automaticamente
    if tg_op = 'UPDATE' and old.approved = false and new.approved = true and new.approved_at is null then
        new.approved_at := now();
    end if;
    return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger title_assignments_immutable_when_approved
    before update or delete on public.title_assignments
    for each row execute function public.prevent_mutation_when_approved();

-- ============================================================
-- RLS
-- ============================================================

alter table public.titles enable row level security;
alter table public.title_assignments enable row level security;

-- ---------- titles (catalogo) ----------

create policy "titles_select_authenticated"
    on public.titles for select
    to authenticated
    using (true);

create policy "titles_write_encargado"
    on public.titles for all
    using (public.auth_role() = 'encargado')
    with check (public.auth_role() = 'encargado');

-- ---------- title_assignments ----------

-- Encargado y director ven y trabajan con las asignaciones
create policy "title_assignments_select_admin"
    on public.title_assignments for select
    using (public.auth_role() in ('encargado', 'director'));

-- Anunciador ve solo las ya aprobadas (para proyectar en escenario)
create policy "title_assignments_select_anunciador_approved"
    on public.title_assignments for select
    using (public.auth_role() = 'anunciador' and approved = true);

-- Director asigna (drag-and-drop) y aprueba
create policy "title_assignments_write_director"
    on public.title_assignments for all
    using (public.auth_role() = 'director')
    with check (public.auth_role() = 'director');
