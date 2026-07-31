import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import RequireRole from '../components/RequireRole'
import LoginPage from '../pages/LoginPage'
import NoAutorizado from '../pages/NoAutorizado'

// Code-splitting por rol: cada módulo (encargado/juez/director/anunciador) se
// descarga solo cuando su usuario navega a él, en vez de un único bundle.
// LoginPage y NoAutorizado quedan eager: son la puerta de entrada.
const EncargadoLayout = lazy(() => import('../layouts/EncargadoLayout'))
const EncargadoDashboard = lazy(() => import('../pages/encargado/EncargadoDashboard'))
const EdicionesPage = lazy(() => import('../pages/encargado/EdicionesPage'))
const ParticipantesPage = lazy(() => import('../pages/encargado/ParticipantesPage'))
const EtapasPage = lazy(() => import('../pages/encargado/EtapasPage'))
const RetosPage = lazy(() => import('../pages/encargado/RetosPage'))
const CalificacionesPage = lazy(() => import('../pages/encargado/CalificacionesPage'))
const RondasJuecesPage = lazy(() => import('../pages/encargado/RondasJuecesPage'))
const JuezLayout = lazy(() => import('../layouts/JuezLayout'))
const CalificarPage = lazy(() => import('../pages/juez/CalificarPage'))
const DirectorLayout = lazy(() => import('../layouts/DirectorLayout'))
const PromediosPage = lazy(() => import('../pages/director/PromediosPage'))
const TitulosPage = lazy(() => import('../pages/director/TitulosPage'))
const AnunciadorLayout = lazy(() => import('../layouts/AnunciadorLayout'))
const ProyeccionPage = lazy(() => import('../pages/anunciador/ProyeccionPage'))
const ControlPage = lazy(() => import('../pages/anunciador/ControlPage'))

// Fallback mientras se descarga el chunk del módulo
function CargandoModulo() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-7 h-7 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<CargandoModulo />}>
        <Routes>
          {/* Pública */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/no-autorizado" element={<NoAutorizado />} />

          {/* Encargado */}
          <Route
            path="/encargado"
            element={
              <RequireRole roles={['encargado']}>
                <EncargadoLayout />
              </RequireRole>
            }
          >
            <Route index element={<EncargadoDashboard />} />
            <Route path="ediciones" element={<EdicionesPage />} />
            <Route path="participantes" element={<ParticipantesPage />} />
            <Route path="etapas" element={<EtapasPage />} />
            <Route path="retos" element={<RetosPage />} />
            <Route path="calificaciones" element={<CalificacionesPage />} />
            <Route path="rondas-jueces" element={<RondasJuecesPage />} />
          </Route>

          {/* Juez — Fase 5 */}
          <Route
            path="/juez"
            element={
              <RequireRole roles={['juez']}>
                <JuezLayout />
              </RequireRole>
            }
          >
            <Route index element={<CalificarPage />} />
          </Route>

          {/* Director — Fase 6 */}
          <Route
            path="/director"
            element={
              <RequireRole roles={['director']}>
                <DirectorLayout />
              </RequireRole>
            }
          >
            <Route index element={<PromediosPage />} />
            <Route path="titulos" element={<TitulosPage />} />
          </Route>

          {/* Anunciador — Fase 7 */}
          <Route
            path="/anunciador"
            element={
              <RequireRole roles={['anunciador']}>
                <AnunciadorLayout />
              </RequireRole>
            }
          >
            <Route index element={<ProyeccionPage />} />
            <Route path="control" element={<ControlPage />} />
          </Route>

          {/* Raíz y catch-all → login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default AppRouter
