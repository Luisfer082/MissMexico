import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useEdicionActiva } from '../../hooks/useEdicionActiva'

interface EstadisticasEdicion {
  totalParticipantes: number
  etapasAbiertas: number
  etapasCerradas: number
  retosConfigurados: number
}

function StatCard({ titulo, valor, subtitulo }: { titulo: string; valor: number | string; subtitulo?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-sm font-medium text-slate-500">{titulo}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{valor}</p>
      {subtitulo && <p className="mt-1 text-xs text-slate-400">{subtitulo}</p>}
    </div>
  )
}

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
        <div className="w-6 h-6 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
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
          />
          <StatCard
            titulo="Etapas abiertas"
            valor={stats.etapasAbiertas}
            subtitulo="en curso actualmente"
          />
          <StatCard
            titulo="Etapas cerradas"
            valor={stats.etapasCerradas}
            subtitulo="finalizadas"
          />
          <StatCard
            titulo="Retos configurados"
            valor={stats.retosConfigurados}
            subtitulo="en esta edición"
          />
        </div>
      ) : null}
    </div>
  )
}

export default EncargadoDashboard
