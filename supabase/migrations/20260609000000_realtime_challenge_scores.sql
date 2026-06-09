-- ============================================================
-- Migration: realtime_challenge_scores
-- Habilita Supabase Realtime para challenge_scores (Fase 4:
-- leaderboard en vivo). Idempotente: no falla si ya estaba.
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'challenge_scores'
  ) then
    alter publication supabase_realtime add table public.challenge_scores;
  end if;
end $$;

-- replica identity full: que los eventos DELETE traigan participant_id /
-- challenge_id para poder remover filas del leaderboard en vivo.
alter table public.challenge_scores replica identity full;
