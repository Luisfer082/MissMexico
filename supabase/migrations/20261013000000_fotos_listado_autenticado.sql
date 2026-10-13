-- ============================================================
-- Migration: fotos_listado_autenticado
-- Revisión de seguridad del 2026-10-13.
--
-- `fotos_participantes_select_public` (20260629000000) no tenía `to`, así que
-- aplicaba también al rol anon: con la publishable key, que va en el bundle,
-- cualquiera podía LISTAR el bucket y bajarse las fotos de todas las ediciones
-- (comprobado contra producción sin sesión).
--
-- Se restringe a usuarios con sesión. Ver las fotos NO cambia: el bucket es
-- público y las URLs /object/public/... las sirve Storage sin pasar por la RLS
-- de storage.objects. Lo único que se cierra al anónimo es el listado.
-- Aditiva: no toca la migración original.
-- ============================================================

drop policy if exists "fotos_participantes_select_public" on storage.objects;

create policy "fotos_participantes_select_authenticated"
    on storage.objects for select
    to authenticated
    using (bucket_id = 'fotos-participantes');
