-- ============================================================
-- Migration 1: init_core
-- Tipo app_role, tablas editions y profiles, helper auth_role()
-- ============================================================

-- ---------- TIPOS ----------

create type public.app_role as enum (
    'encargado',
    'juez',
    'director',
    'anunciador'
);

-- ---------- TABLA: editions ----------

create table public.editions (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    year        integer not null,
    is_active   boolean not null default false,
    created_at  timestamptz not null default now()
);

-- Solo una edicion activa a la vez (regla del producto)
create unique index editions_only_one_active
    on public.editions (is_active)
    where is_active = true;

-- ---------- TABLA: profiles ----------
-- Extiende auth.users con el rol del sistema.

create table public.profiles (
    id          uuid primary key references auth.users(id) on delete cascade,
    full_name   text,
    role        public.app_role,
    created_at  timestamptz not null default now()
);

-- ---------- TRIGGER: auto-crear perfil al registrar usuario ----------
-- Toma full_name y role desde raw_user_meta_data si el encargado los pasa
-- al invitar al usuario via admin API. Si no, quedan en null y luego el
-- encargado los completa.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, full_name, role)
    values (
        new.id,
        new.raw_user_meta_data->>'full_name',
        (new.raw_user_meta_data->>'role')::public.app_role
    );
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ---------- HELPER: auth_role() ----------
-- Devuelve el rol del usuario autenticado actual.
-- SECURITY DEFINER para poder leer profiles sin chocar con su propia RLS.

create or replace function public.auth_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
    select role from public.profiles where id = auth.uid();
$$;

-- ============================================================
-- RLS
-- ============================================================

alter table public.editions enable row level security;
alter table public.profiles enable row level security;

-- ---------- profiles ----------

-- Cada usuario puede leer su propio perfil
create policy "profiles_select_own"
    on public.profiles for select
    using (id = auth.uid());

-- El encargado puede leer todos los perfiles
create policy "profiles_select_encargado"
    on public.profiles for select
    using (public.auth_role() = 'encargado');

-- Solo el encargado puede modificar perfiles (asignar/cambiar rol)
create policy "profiles_update_encargado"
    on public.profiles for update
    using (public.auth_role() = 'encargado')
    with check (public.auth_role() = 'encargado');

-- ---------- editions ----------

-- Cualquier usuario autenticado puede leer las ediciones
create policy "editions_select_authenticated"
    on public.editions for select
    to authenticated
    using (true);

-- Solo el encargado puede crear/modificar/eliminar ediciones
create policy "editions_write_encargado"
    on public.editions for all
    using (public.auth_role() = 'encargado')
    with check (public.auth_role() = 'encargado');
