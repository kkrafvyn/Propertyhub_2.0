/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#bec6e0',
        secondary: '#e9c349',
        surface: '#051424',
        'dark-bg': '#0a1428',
        'on-surface': '#e0e0e0',
        'on-secondary': '#000000',
        'surface-container': '#1a1f2e',
        'surface-container-high': '#2a2f3e',
        'surface-container-highest': '#3a3f4e',
        'on-surface-variant': '#a0a0a0',
        outline: '#606060',
        'outline-variant': '#505050',
      },
      fontFamily: {
        sans: ['Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
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
