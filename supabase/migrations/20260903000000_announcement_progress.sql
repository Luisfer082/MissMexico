-- ============================================================
-- Migration: announcement_progress
-- Fase 9 (hardening), paso 3.
--
-- Aditiva: no toca ninguna migracion ya aplicada.
--
-- El rework del Anunciador (5.8) persistio el ORDEN de revelacion pero
-- dejo el AVANCE en memoria, y quedo anotado como deuda: una recarga
-- del navegador en pleno evento conservaba el orden pero REINICIABA el
-- show. En una ceremonia en vivo eso significa volver a revelar desde
-- el primer titulo delante del publico.
--
-- Decision de Luis (2026-09-03): persistir solo el avance. Separar
-- control y proyeccion en dos dispositivos (que exigiria Realtime)
-- queda fuera.
-- ============================================================

-- ---------- TABLA: announcement_progress ----------
-- Una sola fila por edicion con cuantos titulos se han revelado ya.
-- Sin fila = show sin empezar (0), asi que la tabla es opcional y nada
-- se rompe mientras no exista una fila.
--
-- El cliente ACOTA lo leido al numero de titulos actuales: si el
-- director retiro o cambio asignaciones despues de que el show
-- avanzara, un contador viejo apuntaria fuera de la lista.
--
-- CONCURRENCIA: no hay bloqueo. El modulo es una sola pantalla por
-- diseno (control y proyeccion juntos); si dos pestanas avanzaran a la
-- vez, la ultima escritura gana y al recargar se lee esa. Es
-- deliberado: un lock aqui costaria mas de lo que protege.

create table public.announcement_progress (
    edition_id     uuid primary key references public.editions(id) on delete cascade,
    revealed_count integer not null default 0 check (revealed_count >= 0),
    updated_by     uuid references auth.users(id),
    updated_at     timestamptz not null default now()
);

-- set_updated_at() ya existe desde la migracion 20260730000000.
create trigger announcement_progress_set_updated_at
    before update on public.announcement_progress
    for each row execute function public.set_updated_at();

-- ============================================================
-- RLS
-- ============================================================

alter table public.announcement_progress enable row level security;

-- Lectura: cualquier autenticado. Es un contador de cuantos titulos se
-- han revelado; NO dice quien gano que (eso vive en title_assignments,
-- con su propia RLS). Mismo criterio que announcement_order.
create policy "announcement_progress_select_authenticated"
    on public.announcement_progress for select
    to authenticated
    using (true);

-- Escritura: el anunciador (es su pantalla) y el encargado, que es el
-- power user y quien rescata el show si el anunciador no puede operar.
create policy "announcement_progress_write_anunciador"
    on public.announcement_progress for all
    using (public.auth_role() in ('anunciador', 'encargado'))
    with check (public.auth_role() in ('anunciador', 'encargado'));
