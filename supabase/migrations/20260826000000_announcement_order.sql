-- ============================================================
-- Migration: announcement_order
-- Rework Anunciador (CLAUDE.md 5.8).
--
-- Aditiva: no toca ninguna migracion ya aplicada.
--
-- Decision de Luis (2026-08-26): el anunciador debe poder cambiar el
-- ORDEN en que se revelan las ganadoras, y ese orden tiene que
-- sobrevivir a una recarga del navegador. Todo el estado del modulo
-- vivia en memoria: una recarga en pleno evento lo perdia.
--
-- Por que una tabla aparte y no una columna en title_assignments:
-- el anunciador NO debe poder escribir en title_assignments (ahi vive
-- quien gano que titulo, y su unico permiso es SELECT de lo publicado).
-- Separar el orden en su propia tabla le da permiso de escritura sobre
-- la presentacion sin darselo nunca sobre los resultados.
-- ============================================================

-- ---------- TABLA: announcement_order ----------
-- Una fila por titulo de la edicion con su posicion en el orden de
-- revelacion. Si una edicion no tiene filas aqui, el cliente cae al
-- orden por defecto (titles.order_num descendente, del menos al mas
-- importante), asi que la tabla es opcional: nada se rompe sin ella.
--
-- OJO: unique en (edition_id, title_id) pero NO en position. Reordenar
-- en lote generaria choques transitorios de posicion; el orden lo
-- garantiza el cliente al guardar la tanda completa. Mismo criterio
-- que manual_rankings (migracion 20260730000000).

create table public.announcement_order (
    id          uuid primary key default gen_random_uuid(),
    edition_id  uuid not null references public.editions(id) on delete cascade,
    title_id    uuid not null references public.titles(id) on delete cascade,
    position    integer not null,
    updated_by  uuid references auth.users(id),
    updated_at  timestamptz not null default now(),
    unique (edition_id, title_id)
);

create index announcement_order_edition_idx on public.announcement_order (edition_id);

-- set_updated_at() ya existe desde la migracion 20260730000000.
create trigger announcement_order_set_updated_at
    before update on public.announcement_order
    for each row execute function public.set_updated_at();

-- ============================================================
-- RLS
-- ============================================================

alter table public.announcement_order enable row level security;

-- Lectura: cualquier autenticado. Es solo el orden de presentacion de
-- unos titulos, no revela quien gano (eso vive en title_assignments,
-- que sigue con su propia RLS). El anunciador lo necesita para
-- proyectar y el director/encargado para saber como quedo.
create policy "announcement_order_select_authenticated"
    on public.announcement_order for select
    to authenticated
    using (true);

-- Escritura: el anunciador (es su pantalla) y el encargado, que es el
-- power user del sistema y es quien puede rescatar el show si el
-- anunciador no puede operar en vivo.
create policy "announcement_order_write_anunciador"
    on public.announcement_order for all
    using (public.auth_role() in ('anunciador', 'encargado'))
    with check (public.auth_role() in ('anunciador', 'encargado'));
