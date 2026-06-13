/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#E9C349',
          hover: '#D4AF37',
          light: '#FFF8E1',
          dark: '#051424',
        },
        ink: {
          DEFAULT: '#051424',
          secondary: '#64748B',
          muted: '#94A3B8',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          subtle: '#F8FAFC',
          border: '#E2E8F0',
          hover: '#F1F5F9',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
      boxShadow: {
        search: '0 1px 2px rgba(5,20,36,0.06), 0 4px 12px rgba(5,20,36,0.04)',
        card: '0 6px 20px rgba(5,20,36,0.10)',
        header: '0 1px 0 rgba(5,20,36,0.08)',
      },
      borderRadius: {
        card: '12px',
      },
      maxWidth: {
        page: '1280px',
      },
    },
  },
  plugins: [],
}
