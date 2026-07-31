import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../../stores/useAppStore'

// Pantalla de Proyección del Anunciador (Fase 7 — v1). Es lo que se muestra en
// el escenario: solo los títulos YA revelados (acumulados), con tipografía
// grande. Los pendientes no aparecen (nada de spoilers). El operador avanza
// desde la pestaña Control.
function ProyeccionPage() {
  const { titulos, reveladosCount } = useAppStore(
    useShallow((s) => ({
      titulos: s.anuncioTitulos,
      reveladosCount: s.anuncioReveladosCount,
    })),
  )

  const revelados = titulos.slice(0, reveladosCount)

  return (
    <div className="min-h-[70vh] bg-slate-900 rounded-2xl flex flex-col items-center justify-center px-6 py-12 text-center">
      {revelados.length === 0 ? (
        <p className="text-slate-500 text-lg">Esperando el inicio de la ceremonia…</p>
      ) : (
        <ul className="space-y-10 w-full max-w-2xl">
          {revelados.map((t) => (
            <li key={t.id}>
              <p className="text-brand-400 text-sm sm:text-base font-medium uppercase tracking-widest">
                {t.titulo}
              </p>
              <p className="text-white text-3xl sm:text-5xl font-bold mt-2 leading-tight">
                {t.participante}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ProyeccionPage
