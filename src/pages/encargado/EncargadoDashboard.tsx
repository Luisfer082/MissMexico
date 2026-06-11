import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useEdicionActiva } from '../../hooks/useEdicionActiva'

interface EstadisticasEdicion {
  totalParticipantes: number
  etapasAbiertas: number
  etapasCerradas: number
  retosConfigurados: number
}

// Acento de color por métrica: identifica cada tarjeta de un vistazo
type AcentoStat = 'brand' | 'emerald' | 'slate' | 'gold'

const CLASES_ACENTO: Record<AcentoStat, string> = {
  brand: 'bg-brand-100 text-brand-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  slate: 'bg-slate-100 text-slate-600',
  gold: 'bg-gold-100 text-gold-600',
}

function StatCard({
  titulo,
  valor,
  subtitulo,
  acento = 'brand',
  icono,
}: {
  titulo: string
  valor: number | string
  subtitulo?: string
  acento?: AcentoStat
  icono?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{titulo}</p>
        {icono && (
          <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${CLASES_ACENTO[acento]}`}>
            <span className="w-5 h-5">{icono}</span>
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{valor}</p>
      {subtitulo && <p className="mt-1 text-xs text-slate-400">{subtitulo}</p>}
    </div>
  )
}

// Íconos SVG inline (Heroicons outline) para las tarjetas de estadísticas
const IcoUsuarios = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const IcoAbiertas = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const IcoCerradas = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const IcoRetos = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
)

function EncargadoDashboard() {
  const { edicion, loading: loadingEdicion } = useEdicionActiva()
  const [stats, setStats] = useState<EstadisticasEdicion | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  useEffect(() => {
    if (!edicion) return

    const fetchStats = async () => {
      setLoadingStats(true)

      try {
        // Consultas en paralelo para eficiencia
        const [participantesRes, etapasRes, retosRes] = await Promise.all([
          supabase
            .from('participants')
            .select('id', { count: 'exact', head: true })
            .eq('edition_id', edicion.id),
          supabase
            .from('stages')
            .select('status')
            .eq('edition_id', edicion.id),
          supabase
            .from('challenges')
            .select('id', { count: 'exact', head: true })
            .eq('edition_id', edicion.id),
        ])

        const etapas = etapasRes.data ?? []

        setStats({
          totalParticipantes: participantesRes.count ?? 0,
          etapasAbiertas: etapas.filter((e) => e.status === 'open').length,
          etapasCerradas: etapas.filter((e) => e.status === 'closed').length,
          retosConfigurados: retosRes.count ?? 0,
        })
      } finally {
        setLoadingStats(false)
      }
    }

    void fetchStats()
  }, [edicion])

  if (loadingEdicion) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!edicion) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
          </svg>
        </div>
        <p className="text-slate-700 font-medium">No hay edición activa</p>
        <p className="text-slate-400 text-sm mt-1">Configura una edición desde la base de datos para comenzar.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{edicion.name}</h1>
        <p className="text-slate-500 text-sm mt-1">Edición {edicion.year} — Panel de control</p>
      </div>

      {loadingStats ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          Cargando estadísticas...
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            titulo="Participantes"
            valor={stats.totalParticipantes}
            subtitulo="registradas en la edición"
            acento="brand"
            icono={IcoUsuarios}
          />
          <StatCard
            titulo="Etapas abiertas"
            valor={stats.etapasAbiertas}
            subtitulo="en curso actualmente"
            acento="emerald"
            icono={IcoAbiertas}
          />
          <StatCard
            titulo="Etapas cerradas"
            valor={stats.etapasCerradas}
            subtitulo="finalizadas"
            acento="slate"
            icono={IcoCerradas}
          />
          <StatCard
            titulo="Retos configurados"
            valor={stats.retosConfigurados}
            subtitulo="en esta edición"
            acento="gold"
            icono={IcoRetos}
          />
        </div>
      ) : null}
    </div>
  )
}

export default EncargadoDashboard
