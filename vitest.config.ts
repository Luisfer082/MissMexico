import { defineConfig } from 'vitest/config'
import path from 'path'

// Config propia de los tests (Fase 9, paso 0).
//
// Separada de vite.config.ts a propósito: la de build produce el bundle de
// producción con su code-splitting por rol, y no hay razón para que un cambio
// en los tests pueda tocar eso. Aquí solo se replica el alias `@`.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    // Node basta: lo que se prueba en este bloque son funciones puras, sin DOM.
    // Cuando haga falta renderizar hooks se añade jsdom + testing-library.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
