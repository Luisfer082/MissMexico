-- ============================================================
-- Migration: fotos_participantes_bucket
-- Bucket de Storage para las fotos de participantes.
-- Lectura pública (se proyectan en escenario, no son sensibles);
-- escritura solo para el encargado, reutilizando el helper auth_role().
-- ============================================================

-- ---------- BUCKET ----------
-- Público: las URLs sirven directo por CDN sin URLs firmadas.
insert into storage.buckets (id, name, public)
values ('fotos-participantes', 'fotos-participantes', true)
on conflict (id) do nothing;

-- ---------- POLICIES sobre storage.objects ----------
-- Nota: storage.objects ya tiene RLS habilitada por Supabase.

-- Lectura: cualquiera puede leer los objetos de este bucket.
create policy "fotos_participantes_select_public"
    on storage.objects for select
    using (bucket_id = 'fotos-participantes');

-- Alta: solo el encargado puede subir archivos al bucket.
create policy "fotos_participantes_insert_encargado"
    on storage.objects for insert
    with check (
        bucket_id = 'fotos-participantes'
        and public.auth_role() = 'encargado'
    );

-- Reemplazo: solo el encargado puede sobrescribir.
create policy "fotos_participantes_update_encargado"
    on storage.objects for update
    using (
        bucket_id = 'fotos-participantes'
        and public.auth_role() = 'encargado'
    )
    with check (
        bucket_id = 'fotos-participantes'
        and public.auth_role() = 'encargado'
    );

-- Borrado: solo el encargado puede eliminar.
create policy "fotos_participantes_delete_encargado"
    on storage.objects for delete
    using (
        bucket_id = 'fotos-participantes'
        and public.auth_role() = 'encargado'
    );
