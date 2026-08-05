-- ============================================================
-- Migration: realtime_editions
-- Habilita Supabase Realtime para editions (fix 2026-08-04).
--
-- La edicion activa se cachea una vez por sesion en el store del
-- cliente. Cuando el encargado cambiaba de edicion, las sesiones ya
-- abiertas de juez y director se quedaban en la anterior hasta recargar
-- la pagina. Con la tabla en la publicacion, el cliente se suscribe y
-- refetchea la edicion activa cuando is_active cambia.
--
-- Aditiva e idempotente: no toca datos ni politicas. La RLS de editions
-- ya deja leer a todo autenticado, y realtime respeta RLS.
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'editions'
  ) then
    alter publication supabase_realtime add table public.editions;
  end if;
end $$;

-- replica identity full: el evento UPDATE que apaga la edicion anterior
-- necesita traer la fila vieja para que el cliente sepa que cambio.
do $$
begin
  if not exists (
    select 1 from pg_class
    where oid = 'public.editions'::regclass
      and relreplident = 'f'
  ) then
    alter table public.editions replica identity full;
  end if;
end $$;
