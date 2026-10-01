-- ============================================================
-- Migration: security_hardening (Fase 10, Bloque 1)
--
-- Aditiva: NO se toca ninguna migracion aplicada. Cierra cuatro huecos
-- encontrados el 2026-10-01 al juntar los pendientes de la Fase 10:
--
--   1. Un usuario podia cambiarse su propio rol (profiles_update_own).
--   2. El rol de un usuario nuevo lo decidia el cliente al registrarse.
--   3. Un juez podia calificar fuera de su ronda.
--   4. M1: un juez podia enumerar las rondas de otras etapas.
--
-- Mas un endurecimiento que sale del 1: auth_role() deja de devolver el
-- rol de un usuario desactivado.
-- ============================================================


-- ============================================================
-- 1. profiles: solo el encargado cambia rol, estado o correo
-- ============================================================
-- profiles_update_own (20260525000000) se escribio para que cada quien
-- edite su full_name, pero la RLS filtra filas, no columnas: con su sesion,
-- un juez podia hacer `update profiles set role = 'encargado'` sobre su
-- propia fila y saltarse toda la RLS. Este trigger protege las columnas.
--
-- auth.uid() es null cuando escribe la service_role (Edge Function
-- admin-usuarios) o un admin desde el SQL editor: esos pasan.

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null then
        return new;
    end if;

    if public.auth_role() is distinct from 'encargado'
       and (new.role   is distinct from old.role
         or new.active is distinct from old.active
         or new.email  is distinct from old.email
         or new.id     is distinct from old.id) then
        raise exception 'Solo el encargado puede cambiar el rol, el estado o el correo de un usuario'
            using errcode = '42501';
    end if;

    return new;
end;
$$;

create trigger profiles_protect_privileged_columns
    before update on public.profiles
    for each row execute function public.protect_profile_privileged_columns();


-- ============================================================
-- 1b. auth_role(): un usuario desactivado no tiene rol
-- ============================================================
-- Desactivar banea al usuario en Auth, pero el access token que ya tenia
-- sigue siendo valido hasta que expira (~1 h). Como TODA la RLS pasa por
-- auth_role(), devolver null para inactivos le corta el acceso a los datos
-- en el acto, sin esperar a que caduque la sesion.

create or replace function public.auth_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
    select role from public.profiles where id = auth.uid() and active;
$$;


-- ============================================================
-- 2. handle_new_user: el rol sale de app_metadata, no de user_metadata
-- ============================================================
-- user_metadata lo escribe el propio cliente en signUp({ options: { data } }):
-- con el registro publico activo, cualquiera con la URL del proyecto podia
-- registrarse como encargado. app_metadata solo lo escribe la admin API
-- (service_role), que es lo que usa la Edge Function admin-usuarios.
-- Sin app_metadata.role el perfil queda sin rol: no ve nada.
--
-- ORDEN DE DESPLIEGUE: primero la Edge Function (que ya manda app_metadata),
-- despues esta migracion. Al reves, los usuarios creados en medio quedan
-- sin rol (se arregla editandolos desde Usuarios).

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
        (new.raw_app_meta_data->>'role')::public.app_role,
        new.email
    );
    return new;
end;
$$;


-- ============================================================
-- 3. judge_scores: el juez solo califica dentro de su ronda
-- ============================================================
-- judge_scores_insert_own solo exige judge_id = auth.uid() y rol juez. Nada
-- validaba que el juez estuviera asignado a la ronda de esa etapa, ni que el
-- reto y la participante pertenecieran a ella.
--
-- La fila invalida se DESCARTA (return null) en vez de lanzar error, a
-- proposito: el modulo juez sincroniza por lotes y un lote es todo-o-nada.
-- Si el encargado quita a una participante de la etapa mientras un juez
-- tiene una nota suya pendiente sin red, un error tumbaria el lote entero
-- en cada reintento y el juez no podria sincronizar NADA. Descartarla deja
-- pasar las demas. Una nota fuera de la ronda tampoco cuenta en el avance
-- ni en los promedios, asi que no se pierde nada que importara.
--
-- El nombre ordena el trigger DESPUES de judge_scores_no_mutation_when_*
-- (los BEFORE corren en orden alfabetico): una ronda cerrada sigue lanzando
-- su error, que es el que el cliente detecta para congelar la captura.

create or replace function public.skip_judge_score_outside_round()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- service_role / SQL editor: sin validar (correcciones administrativas).
    if auth.uid() is null then
        return new;
    end if;

    if not exists (
        select 1
        from public.judge_rounds jr
        join public.judge_round_judges jrj
            on jrj.round_id = jr.id and jrj.judge_id = new.judge_id
        join public.judge_round_challenges jrc
            on jrc.round_id = jr.id and jrc.challenge_id = new.challenge_id
        join public.stage_participants sp
            on sp.stage_id = jr.stage_id and sp.participant_id = new.participant_id
        where jr.stage_id = new.stage_id
    ) then
        return null;
    end if;

    return new;
end;
$$;

create trigger judge_scores_skip_outside_round
    before insert or update on public.judge_scores
    for each row execute function public.skip_judge_score_outside_round();


-- ============================================================
-- 4. M1: el juez solo ve sus propias rondas
-- ============================================================
-- judge_rounds y judge_round_challenges eran `using (true)`: un juez podia
-- listar las rondas de todas las etapas. El modulo juez solo consulta las
-- rondas que salen de su propio judge_round_judges (useRondaJuez), asi que
-- restringirlo no cambia nada de lo que ve. Encargado, director y
-- anunciador conservan la lectura completa.
-- La subconsulta a judge_round_judges pasa por su RLS, que ya limita al
-- juez a sus propias filas (judge_round_judges_select_own).

drop policy if exists "judge_rounds_select_authenticated" on public.judge_rounds;

create policy "judge_rounds_select_no_juez_o_asignado"
    on public.judge_rounds for select
    to authenticated
    using (
        public.auth_role() <> 'juez'
        or exists (
            select 1 from public.judge_round_judges jrj
            where jrj.round_id = judge_rounds.id
              and jrj.judge_id = auth.uid()
        )
    );

drop policy if exists "judge_round_challenges_select_authenticated" on public.judge_round_challenges;

create policy "judge_round_challenges_select_no_juez_o_asignado"
    on public.judge_round_challenges for select
    to authenticated
    using (
        public.auth_role() <> 'juez'
        or exists (
            select 1 from public.judge_round_judges jrj
            where jrj.round_id = judge_round_challenges.round_id
              and jrj.judge_id = auth.uid()
        )
    );
