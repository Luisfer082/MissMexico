import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useAppStore } from './stores/useAppStore'
import AppRouter from './routes/AppRouter'

function App() {
  const initialize = useAppStore((s) => s.initialize)

  // Inicializar la sesión de auth al montar la app
  useEffect(() => {
    void initialize()
  }, [initialize])

  return (
    <>
      <AppRouter />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontSize: '14px',
            borderRadius: '10px',
          },
        }}
      />
    </>
  )
}

export default App
