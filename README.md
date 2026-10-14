# Miss México — Calificaciones en vivo

Aplicación web para calificar el concurso Miss México en vivo: captura de puntos, calificación de
jueces, asignación de títulos y proyección de resultados en el escenario.

## Roles

| Rol | Qué hace |
|-----|----------|
| **Encargado** | Configura la edición (participantes, etapas, retos, rondas), captura puntos, gestiona usuarios, cierra etapas, exporta Excel/PDF y descarga respaldos. |
| **Juez** | Califica a las participantes de su ronda (1-10). Funciona sin conexión y sincroniza al volver la red. Nunca ve calificaciones de otros jueces. |
| **Director** | Revisa promedios, ordena el ranking, asigna los títulos y los envía al anunciador. |
| **Anunciador** | Proyecta los títulos uno por uno, en el orden que defina. |

## Stack

React 19 + Vite + TypeScript · Tailwind CSS v3 · Supabase (PostgreSQL, Auth, Realtime, Storage,
Edge Functions) · Zustand · Vercel (hosting).

## Correr en local

Requiere Node 20+.

```bash
npm install
cp .env.example .env   # y llenar con los datos del proyecto de Supabase
npm run dev
```

Variables de `.env` (Supabase → Project Settings → API Keys):

```
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable / anon key>
```

## Comandos

| Comando | Para qué |
|---------|----------|
| `npm run dev` | Servidor local |
| `npm run build` | Build de producción (carpeta `dist`) |
| `npm run typecheck` / `npm run lint` / `npm run test` | Revisiones antes de subir cambios |
| `npm run respaldo:fotos` | Descarga las fotos del bucket (requiere `SUPABASE_SERVICE_ROLE_KEY` en `.env.respaldo`) |

## Base de datos (Supabase)

Todo el esquema vive en `supabase/migrations`: tablas, permisos por rol (RLS), triggers, realtime y
el bucket de fotos. En un proyecto nuevo:

```bash
npx supabase login
npx supabase link --project-ref <ref-del-proyecto>
npx supabase db push
npx supabase functions deploy admin-usuarios
```

Después, en el dashboard de Supabase:

1. **Authentication → Sign In / Providers:** desactivar el registro público y el acceso anónimo.
   Los usuarios se crean solo desde la app.
2. **Authentication → URL Configuration:** Site URL = el dominio de producción.
3. **Primer encargado** (única vez): Authentication → Users → *Add user* (con *Auto Confirm*) y en el
   SQL Editor:
   ```sql
   update profiles set role = 'encargado', full_name = 'Nombre' where email = 'correo@dominio.com';
   ```
   El resto de los usuarios se crean desde la pantalla **Usuarios** de la app.

## Despliegue (Vercel)

Importar el repositorio en Vercel (detecta Vite) y configurar `VITE_SUPABASE_URL` y
`VITE_SUPABASE_ANON_KEY` en *Environment Variables*. Cada push a `main` se publica en producción.

## Operación

- `docs/runbook-evento.md` — qué hacer antes y durante el evento, y si algo falla.
- `docs/checklist-qa.md` — pruebas por rol y dispositivo.
- **Respaldo:** botón *Respaldo* en el panel del encargado (descarga los datos en JSON).
- **Supabase plan gratuito:** el proyecto se pausa tras ~7 días sin uso. Entrar y reactivarlo
  días antes del evento.
- La `service_role` key de Supabase es acceso total: nunca va en `.env`, en el código ni se comparte.

## Desarrollo

Luis Hernández — [github.com/Luisfer082](https://github.com/Luisfer082)
