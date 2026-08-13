-- ============================================================
-- Migration: usuarios_admin
-- Soporte para la gestion de usuarios desde el panel del Encargado.
--
-- Aditiva: agrega dos columnas a profiles y reemplaza la funcion
-- handle_new_user para que tambien guarde el email. NO se toca ninguna
-- migracion ya aplicada.
-- ============================================================

-- ---------- profiles: email y estado ----------

-- El email vive en auth.users, que no es legible desde el cliente. Se copia
-- a profiles para poder listarlo en la pantalla de Usuarios con la RLS normal
-- (profiles_select_encargado), sin pasar por la service_role.
alter table public.profiles
    add column if not exists email text;

-- Baja reversible: el usuario deja de poder entrar pero conserva su fila y
-- sus calificaciones. Se mantiene en sync con el ban de Auth desde la Edge
-- Function admin-usuarios; esta columna es la que lee la UI.
alter table public.profiles
    add column if not exists active boolean not null default true;

-- ---------- handle_new_user: ahora tambien guarda el email ----------
-- Mismo comportamiento que en init_core (lee full_name y role de
-- raw_user_meta_data al crear el usuario via admin API) + el email.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, full_name, role, email)
    values (
        new.id,
        new.raw_user_meta_data->>'full_name',
        (new.raw_user_meta_data->>'role')::public.app_role,
        new.email
    );
    return new;
end;
$$;

-- ---------- Backfill de los usuarios que ya existen ----------

update public.profiles p
    set email = u.email
    from auth.users u
    where u.id = p.id
      and p.email is null;
