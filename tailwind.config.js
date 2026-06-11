/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta de marca: magenta "rosa mexicano". Escala alineada a pink de
        // Tailwind para mantener contraste WCAG AA en los pares usados.
        brand: {
          50: '#FDF2F8',
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F9A8D4',
          400: '#F472B6',
          500: '#EC4899',
          600: '#DB2777',
          700: '#BE185D',
          800: '#9D174D',
          900: '#831843',
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
          '0%': { backgroundColor: '#FCE7F3' },
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
