-- ============================================================
-- Migration: rls_fixes
-- Corrige 3 gaps en las políticas RLS del schema inicial.
-- ============================================================

-- 1. audit_log: el director también puede leer el log de auditoría
create policy "audit_log_select_director"
    on public.audit_log for select
    using (public.auth_role() = 'director');

-- 2. profiles: cada usuario puede editar su propio full_name
--    (el encargado ya puede editar todo vía profiles_update_encargado)
create policy "profiles_update_own"
    on public.profiles for update
    using (id = auth.uid())
    with check (id = auth.uid());

-- 3. judge_scores: el encargado puede eliminar calificaciones de jueces
--    (necesario para correcciones antes del cierre de etapa)
create policy "judge_scores_delete_encargado"
    on public.judge_scores for delete
    using (public.auth_role() = 'encargado');
