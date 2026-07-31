-- ============================================================
-- Migration: manual_rankings_and_publications
-- Rework Director + conexion Anunciador (CLAUDE.md 5.5, paso 0).
--
-- Aditiva: no toca ninguna migracion ya aplicada. Agrega
--   1. manual_rankings      -> el ranking manual del director
--   2. edition_publications -> flag REVERSIBLE de envio al anunciador
--   3. una policy nueva para que el anunciador lea por "publicado"
--      en vez de por "approved".
--
-- El trigger prevent_mutation_when_approved queda DORMIDO: el flujo
-- nuevo nunca pone approved=true (decision de Luis 2026-07-30, el
-- envio al anunciador es reversible).
-- ============================================================

-- ---------- HELPER: sellar updated_at ----------
-- Se aplica a las dos tablas nuevas para no depender de que el
-- cliente mande la fecha correcta.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

-- ---------- TABLA: manual_rankings ----------
-- Un ranking manual de TODAS las participantes de la edicion, aparte
-- de los puntos de los jueces (que no se tocan).
--
-- OJO: unique en (edition_id, participant_id) pero NO en position.
-- Reordenar en lote generaria choques transitorios de posicion; el
-- orden lo garantiza el cliente al guardar la tanda completa.

create table public.manual_rankings (
    id              uuid primary key default gen_random_uuid(),
    edition_id      uuid not null references public.editions(id) on delete cascade,
    participant_id  uuid not null references public.participants(id) on delete cascade,
    position        integer not null,
    updated_by      uuid references auth.users(id),
    updated_at      timestamptz not null default now(),
    unique (edition_id, participant_id)
);

create index manual_rankings_edition_idx on public.manual_rankings (edition_id);

create trigger manual_rankings_set_updated_at
    before update on public.manual_rankings
    for each row execute function public.set_updated_at();

-- ---------- TABLA: edition_publications ----------
-- Un solo booleano por edicion: "las asignaciones ya se enviaron al
-- anunciador". Reversible (enviar / retirar), sin paso irreversible.

create table public.edition_publications (
    edition_id    uuid primary key references public.editions(id) on delete cascade,
    published     boolean not null default false,
    published_at  timestamptz,
    updated_by    uuid references auth.users(id),
    updated_at    timestamptz not null default now()
);

-- Sella published_at la primera vez que se envia y lo limpia al retirar,
-- ademas de refrescar updated_at.
create or replace function public.stamp_edition_publication()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    if new.published = true and (tg_op = 'INSERT' or old.published = false) then
        new.published_at := now();
    elsif new.published = false then
        new.published_at := null;
    end if;
    return new;
end;
$$;

create trigger edition_publications_stamp
    before insert or update on public.edition_publications
    for each row execute function public.stamp_edition_publication();

-- ============================================================
-- RLS
-- ============================================================

alter table public.manual_rankings enable row level security;
alter table public.edition_publications enable row level security;

-- ---------- manual_rankings ----------
-- Escribe el director. Leen encargado y director. El anunciador NO la
-- necesita: proyecta titulos, no el ranking.

create policy "manual_rankings_select_admin"
    on public.manual_rankings for select
    using (public.auth_role() in ('encargado', 'director'));

create policy "manual_rankings_write_director"
    on public.manual_rankings for all
    using (public.auth_role() = 'director')
    with check (public.auth_role() = 'director');

-- ---------- edition_publications ----------
-- Escribe el director. Lee cualquier autenticado: es solo un booleano
-- y el anunciador lo necesita para saber si ya hay algo que proyectar.

create policy "edition_publications_select_authenticated"
    on public.edition_publications for select
    to authenticated
    using (true);

create policy "edition_publications_write_director"
    on public.edition_publications for all
    using (public.auth_role() = 'director')
    with check (public.auth_role() = 'director');

-- ---------- title_assignments: lectura del anunciador por publicado ----------
-- Aditiva: convive con title_assignments_select_anunciador_approved
-- (las policies de SELECT se combinan con OR). La de approved queda
-- inofensiva porque el flujo nuevo nunca aprueba.

create policy "title_assignments_select_anunciador_published"
    on public.title_assignments for select
    using (
        public.auth_role() = 'anunciador'
        and exists (
            select 1
            from public.edition_publications ep
            where ep.edition_id = title_assignments.edition_id
              and ep.published = true
        )
    );
