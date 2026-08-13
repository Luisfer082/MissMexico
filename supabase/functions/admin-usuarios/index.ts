// ============================================================
// Edge Function: admin-usuarios
//
// Alta, cambio de rol, baja reversible y borrado de usuarios desde el panel
// del Encargado. Vive aqui y no en el cliente porque crear usuarios de Auth
// exige la service_role, que es admin total de la BD: quien la tenga en el
// navegador se salta toda la RLS.
//
// Cada peticion valida server-side que quien llama sea un encargado activo.
// El JWT del front no basta por si solo: dice quien eres, no que rol tienes.
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2'

type Rol = 'encargado' | 'juez' | 'director' | 'anunciador'

const ROLES: Rol[] = ['encargado', 'juez', 'director', 'anunciador']

// Baneo efectivamente permanente. Se revierte con 'none' al reactivar.
const BAN_INDEFINIDO = '876000h'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function responder(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function error(mensaje: string, status: number): Response {
  return responder({ error: mensaje }, status)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return error('Método no permitido', 405)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!url || !serviceKey || !anonKey) {
    return error('Faltan variables de entorno de Supabase en la función', 500)
  }

  // ---------- 1. Identificar a quien llama ----------

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return error('Falta el token de sesión', 401)

  // Cliente con la anon key + el token del usuario: solo sirve para resolver
  // quien es. No se usa para leer datos (su RLS es la del propio usuario).
  const clienteUsuario = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData, error: errUser } = await clienteUsuario.auth.getUser()
  if (errUser || !userData?.user) return error('Sesión inválida', 401)

  const callerId = userData.user.id

  // Cliente admin: se salta la RLS. A partir de aqui todo va con service_role.
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ---------- 2. Verificar que sea encargado activo ----------

  const { data: perfilCaller, error: errPerfil } = await admin
    .from('profiles')
    .select('role, active')
    .eq('id', callerId)
    .single()

  if (errPerfil || !perfilCaller) return error('No se encontró tu perfil', 403)
  if (perfilCaller.role !== 'encargado' || !perfilCaller.active) {
    return error('Solo el encargado puede gestionar usuarios', 403)
  }

  // ---------- 3. Payload ----------

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return error('Cuerpo de la petición inválido', 400)
  }

  const accion = payload.accion

  // Cuenta cuantos encargados activos quedarian si `excluido` deja de serlo.
  // Evita que el encargado se deje a si mismo fuera del sistema.
  const quedanOtrosEncargados = async (excluido: string): Promise<boolean> => {
    const { data } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'encargado')
      .eq('active', true)
      .neq('id', excluido)
      .limit(1)

    return (data?.length ?? 0) > 0
  }

  try {
    // ---------- CREAR ----------
    if (accion === 'crear') {
      const email = String(payload.email ?? '').trim().toLowerCase()
      const password = String(payload.password ?? '')
      const fullName = String(payload.full_name ?? '').trim()
      const role = payload.role as Rol

      if (!email.includes('@')) return error('Correo inválido', 400)
      if (password.length < 8) return error('La contraseña debe tener al menos 8 caracteres', 400)
      if (fullName.length < 3) return error('El nombre debe tener al menos 3 caracteres', 400)
      if (!ROLES.includes(role)) return error('Rol inválido', 400)

      // email_confirm: el usuario queda listo para entrar sin pasar por correo.
      // El trigger on_auth_user_created arma su fila en profiles con estos metadatos.
      const { data, error: errCrear } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role },
      })

      if (errCrear) {
        const dup = errCrear.message.toLowerCase().includes('already')
        return error(
          dup ? 'Ya existe un usuario con ese correo' : errCrear.message,
          dup ? 409 : 400,
        )
      }

      return responder({ ok: true, id: data.user.id })
    }

    // ---------- ACTUALIZAR (nombre y rol) ----------
    if (accion === 'actualizar') {
      const userId = String(payload.userId ?? '')
      const fullName = String(payload.full_name ?? '').trim()
      const role = payload.role as Rol

      if (!userId) return error('Falta el usuario', 400)
      if (fullName.length < 3) return error('El nombre debe tener al menos 3 caracteres', 400)
      if (!ROLES.includes(role)) return error('Rol inválido', 400)

      const { data: destino } = await admin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (!destino) return error('El usuario no existe', 404)

      if (userId === callerId && role !== 'encargado') {
        return error('No puedes quitarte a ti mismo el rol de encargado', 400)
      }

      if (destino.role === 'encargado' && role !== 'encargado') {
        if (!(await quedanOtrosEncargados(userId))) {
          return error('Debe quedar al menos un encargado activo', 400)
        }
      }

      const { error: errPerfilUpd } = await admin
        .from('profiles')
        .update({ full_name: fullName, role })
        .eq('id', userId)

      if (errPerfilUpd) return error(errPerfilUpd.message, 400)

      // Los metadatos de Auth se mantienen alineados con profiles: si algun
      // dia se recrea el perfil desde el trigger, no revive el rol viejo.
      await admin.auth.admin.updateUserById(userId, {
        user_metadata: { full_name: fullName, role },
      })

      return responder({ ok: true })
    }

    // ---------- ESTADO (desactivar / reactivar) ----------
    if (accion === 'estado') {
      const userId = String(payload.userId ?? '')
      const active = payload.active === true

      if (!userId) return error('Falta el usuario', 400)
      if (userId === callerId) return error('No puedes desactivar tu propia cuenta', 400)

      const { data: destino } = await admin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (!destino) return error('El usuario no existe', 404)

      if (!active && destino.role === 'encargado' && !(await quedanOtrosEncargados(userId))) {
        return error('Debe quedar al menos un encargado activo', 400)
      }

      // El ban de Auth es lo que realmente impide entrar; profiles.active es
      // el espejo que lee la UI. Primero el ban: si falla, no mentimos en la UI.
      const { error: errBan } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: active ? 'none' : BAN_INDEFINIDO,
      })

      if (errBan) return error(errBan.message, 400)

      const { error: errFlag } = await admin
        .from('profiles')
        .update({ active })
        .eq('id', userId)

      if (errFlag) return error(errFlag.message, 400)

      return responder({ ok: true })
    }

    // ---------- ELIMINAR ----------
    if (accion === 'eliminar') {
      const userId = String(payload.userId ?? '')

      if (!userId) return error('Falta el usuario', 400)
      if (userId === callerId) return error('No puedes eliminar tu propia cuenta', 400)

      const { data: destino } = await admin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (!destino) return error('El usuario no existe', 404)

      if (destino.role === 'encargado' && !(await quedanOtrosEncargados(userId))) {
        return error('Debe quedar al menos un encargado activo', 400)
      }

      // Guarda critica: judge_scores.judge_id es "on delete cascade" sobre
      // auth.users, asi que borrar al usuario se llevaria por delante sus
      // calificaciones y romperia el historial del certamen. La UI ya esconde
      // el boton en ese caso; esto es la defensa real.
      const [{ count: scores }, { count: rondas }] = await Promise.all([
        admin
          .from('judge_scores')
          .select('id', { count: 'exact', head: true })
          .eq('judge_id', userId),
        admin
          .from('judge_round_judges')
          .select('id', { count: 'exact', head: true })
          .eq('judge_id', userId),
      ])

      if ((scores ?? 0) > 0) {
        return error(
          'Este usuario ya tiene calificaciones registradas. Desactívalo en vez de eliminarlo.',
          409,
        )
      }

      if ((rondas ?? 0) > 0) {
        return error(
          'Este usuario está asignado a una ronda de jueces. Quítalo de la ronda o desactívalo.',
          409,
        )
      }

      const { error: errDel } = await admin.auth.admin.deleteUser(userId)
      if (errDel) return error(errDel.message, 400)

      return responder({ ok: true })
    }

    return error('Acción desconocida', 400)
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Error inesperado', 500)
  }
})
