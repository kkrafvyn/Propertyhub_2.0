/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#E9C349',
          hover: '#D4AF37',
          light: '#FFF8E1',
          dark: '#051424',
          forest: '#1B4332',
          accent: '#FF385C',
        },
        bolt: {
          green: '#34BB09',
          'green-dark': '#2DA008',
          bg: '#F2F2F2',
          card: '#FFFFFF',
        },
        ink: {
          DEFAULT: '#222222',
          secondary: '#717171',
          muted: '#B0B0B0',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          subtle: '#F7F7F7',
          border: '#DDDDDD',
          hover: '#F7F7F7',
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
        search: '0 1px 2px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)',
        'search-hover': '0 2px 4px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)',
        card: '0 6px 16px rgba(0,0,0,0.12)',
        header: '0 1px 0 rgba(0,0,0,0.08)',
        menu: '0 2px 16px rgba(0,0,0,0.12)',
        'bolt-card': '0 2px 8px rgba(0,0,0,0.08)',
        'bolt-nav': '0 -2px 12px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        card: '12px',
        listing: '12px',
      },
      maxWidth: {
        page: '1760px',
      },
    },
  },
  plugins: [],
}
