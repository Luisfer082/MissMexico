import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import RequireRole from '../components/RequireRole'
import LoginPage from '../pages/LoginPage'
import NoAutorizado from '../pages/NoAutorizado'
import EncargadoLayout from '../layouts/EncargadoLayout'
import EncargadoDashboard from '../pages/encargado/EncargadoDashboard'
import EdicionesPage from '../pages/encargado/EdicionesPage'
import ParticipantesPage from '../pages/encargado/ParticipantesPage'
import EtapasPage from '../pages/encargado/EtapasPage'
import RetosPage from '../pages/encargado/RetosPage'
import CalificacionesPage from '../pages/encargado/CalificacionesPage'
import RondasJuecesPage from '../pages/encargado/RondasJuecesPage'
import JuezLayout from '../layouts/JuezLayout'
import CalificarPage from '../pages/juez/CalificarPage'
import DirectorLayout from '../layouts/DirectorLayout'
import PromediosPage from '../pages/director/PromediosPage'
import TitulosPage from '../pages/director/TitulosPage'
import AnunciadorPlaceholder from '../pages/anunciador/AnunciadorPlaceholder'

function AppRouter() {
  return (
    <BrowserRouter>
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
          path="/anunciador/*"
          element={
            <RequireRole roles={['anunciador']}>
              <AnunciadorPlaceholder />
            </RequireRole>
          }
        />

        {/* Raíz y catch-all → login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
