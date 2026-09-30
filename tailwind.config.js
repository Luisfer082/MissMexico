/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta de marca: azul cobalto sacado del fondo oficial (2026-09-30).
        // Reemplaza al rosa mexicano. brand-600 con texto blanco da 6.5:1 (WCAG AA).
        brand: {
          50: '#EFF6FC',
          100: '#DCEBF8',
          200: '#B9D6F0',
          300: '#86B8E3',
          400: '#4B92D0',
          500: '#2A74B8',
          600: '#1F5E9E',
          700: '#1A4C80',
          800: '#163D66',
          900: '#0F2D4F',
          950: '#061A36',
        },
        // Turquesa de las joyas de la corona: acentos (pestaña activa, badges).
        // Como texto sobre blanco usar 600 o más oscuro.
        celeste: {
          50: '#ECFAFC',
          100: '#D5F3F7',
          200: '#AAE6EF',
          300: '#7FD6E3',
          400: '#3FBFD4',
          500: '#1FA3B8',
          600: '#16849A',
          700: '#136A7C',
          800: '#135665',
        },
        // Azul marino del fondo: headers y sidebar, para que se integren con él.
        marino: {
          800: '#0B2548',
          900: '#061A36',
          950: '#001639',
        },
        // Dorado: solo como acento de mérito (1er lugar, totales líderes).
        gold: {
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#D97706',
          600: '#B45309',
          900: '#78350F',
        },
      },
      boxShadow: {
        // Sombra de tarjeta más suave que shadow-sm para superficies grandes
        card: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
      },
      keyframes: {
        // Flash de celda al recibir un valor nuevo (eco realtime / guardado)
        'flash-brand': {
          '0%': { backgroundColor: '#D5F3F7' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
      animation: {
        'flash-brand': 'flash-brand 700ms ease-out',
      },
    },
  },
  plugins: [],
}
