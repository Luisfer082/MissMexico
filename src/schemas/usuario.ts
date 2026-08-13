import { z } from 'zod'
import { sugerenciaDominio } from '../utils/correo'

// Los mismos valores del enum app_role de la BD.
export const rolesUsuario = ['encargado', 'juez', 'director', 'anunciador'] as const

// Etiquetas para la UI (en español, como el resto de la app).
export const etiquetaRol: Record<(typeof rolesUsuario)[number], string> = {
  encargado: 'Encargado',
  juez: 'Juez',
  director: 'Director',
  anunciador: 'Anunciador',
}

const fullName = z
  .string()
  .min(3, 'El nombre debe tener al menos 3 caracteres')
  .max(120, 'Nombre demasiado largo')

const role = z.enum(rolesUsuario, { error: 'Selecciona un rol' })

// Alta: además de nombre y rol, exige credenciales. La contraseña la define el
// encargado y se le entrega al usuario en mano; no hay correo de invitación.
export const usuarioCrearSchema = z.object({
  full_name: fullName,
  email: z
    .string()
    .email('Ingresa un correo válido')
    // El correo nunca recibe nada (las credenciales se dan en mano), así que
    // un dominio mal escrito solo se descubre cuando el usuario no puede
    // entrar. Se bloquea el alta y se propone la corrección.
    .refine((valor) => sugerenciaDominio(valor) === null, {
      error: (issue) =>
        `¿Quisiste decir @${sugerenciaDominio(String(issue.input))}? Revisa el dominio del correo.`,
    }),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  role,
})

// Edición: el correo no se cambia (es el identificador de acceso).
export const usuarioEditarSchema = z.object({
  full_name: fullName,
  role,
})

export type UsuarioCrearFormData = z.infer<typeof usuarioCrearSchema>
export type UsuarioEditarFormData = z.infer<typeof usuarioEditarSchema>
