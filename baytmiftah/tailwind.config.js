/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#E9C349',
        secondary: '#E9C349',
        surface: '#051424',
        'dark-bg': '#0a1428',
        'on-surface': '#F8FAFC',
        'on-secondary': '#0F172A',
        'surface-container': '#1a1f2e',
        'surface-container-high': '#2a2f3e',
        'surface-container-highest': '#3a3f4e',
        'on-surface-variant': '#CBD5E1',
        outline: '#475569',
        'outline-variant': '#334155',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'SF Pro Display', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
        inter: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['3.5rem', { lineHeight: '1.05' }],
        'display-md': ['2.75rem', { lineHeight: '1.1' }],
        'display-sm': ['2rem', { lineHeight: '1.15' }],
        'headline-md': ['1.75rem', { lineHeight: '1.2' }],
        'headline-sm': ['1.5rem', { lineHeight: '1.25' }],
        'body-lg': ['1.125rem', { lineHeight: '1.7' }],
        'body-md': ['1rem', { lineHeight: '1.5' }],
        'body-sm': ['0.875rem', { lineHeight: '1.4' }],
        'label-sm': ['0.75rem', { lineHeight: '1.2' }],
      },
    },
  },
  plugins: [],
}
