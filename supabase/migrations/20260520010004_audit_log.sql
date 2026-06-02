-- ============================================================
-- Migration 7: audit_log
-- Trigger generico de auditoria sobre tablas criticas:
-- challenge_scores, judge_scores, title_assignments, observations.
-- ============================================================

-- ---------- TABLA: audit_log ----------

create table public.audit_log (
    id           bigserial primary key,
    table_name   text not null,
    record_id    uuid,
    operation    text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
    old_data     jsonb,
    new_data     jsonb,
    changed_by   uuid references auth.users(id),
    changed_at   timestamptz not null default now()
);

create index audit_log_table_record_idx on public.audit_log (table_name, record_id);
create index audit_log_changed_at_idx   on public.audit_log (changed_at desc);

-- ---------- FUNCION generica de auditoria ----------

create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    rec_id uuid;
begin
    -- Intenta extraer 'id' del registro (todas las tablas auditadas lo tienen)
    if tg_op = 'DELETE' then
        rec_id := (to_jsonb(old)->>'id')::uuid;
    else
        rec_id := (to_jsonb(new)->>'id')::uuid;
    end if;

    insert into public.audit_log (
        table_name, record_id, operation, old_data, new_data, changed_by
    )
    values (
        tg_table_name,
        rec_id,
        tg_op,
        case when tg_op = 'INSERT' then null else to_jsonb(old) end,
        case when tg_op = 'DELETE' then null else to_jsonb(new) end,
        auth.uid()
    );

    return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- ---------- Adjuntar a tablas criticas ----------

create trigger challenge_scores_audit
    after insert or update or delete on public.challenge_scores
    for each row execute function public.audit_trigger();

create trigger judge_scores_audit
    after insert or update or delete on public.judge_scores
    for each row execute function public.audit_trigger();

create trigger title_assignments_audit
    after insert or update or delete on public.title_assignments
    for each row execute function public.audit_trigger();

create trigger observations_audit
    after insert or update or delete on public.observations
    for each row execute function public.audit_trigger();

-- ============================================================
-- RLS
-- ============================================================

alter table public.audit_log enable row level security;

-- Solo el encargado puede leer el audit log
create policy "audit_log_select_encargado"
    on public.audit_log for select
    using (public.auth_role() = 'encargado');

-- INSERT solo via el trigger (SECURITY DEFINER bypassa RLS).
-- UPDATE/DELETE: sin policies = bloqueado para todos.
