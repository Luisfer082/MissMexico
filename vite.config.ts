import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Separa las librerías grandes del código de la app: se cachean por
        // separado en el navegador y ningún chunk supera el límite de 500 kB.
        // (rolldown-vite solo acepta la forma de función)
        manualChunks: (id: string) => {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@supabase')) return 'supabase'
          if (
            id.includes('react-dom') ||
            id.includes('react-router') ||
            /[\\/]node_modules[\\/]react[\\/]/.test(id)
          ) {
            return 'react'
          }
          return undefined
        },
      },
    },
  },
})
