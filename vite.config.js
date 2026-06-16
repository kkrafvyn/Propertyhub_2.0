import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 600,
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            if (id.includes('/pages/mobile/MobileHomePage')) return 'mobile-home'
            if (id.includes('/pages/mobile/MobileExplorePage')) return 'mobile-explore'
            if (id.includes('/pages/mobile/MobileSavedPage')) return 'mobile-saved'
            if (id.includes('/pages/mobile/')) return 'mobile-pages'
            if (id.includes('/routes/MobileRoutes')) return 'mobile-routes'
            if (id.includes('/i18n/locales/') && !id.includes('/locales/en/')) {
              const match = id.match(/locales[/\\]([\w-]+)\.js/)
              if (match && match[1] !== '_chrome') return `locale-${match[1]}`
            }
            return undefined
          }
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'map-vendor'
          if (id.includes('@supabase')) return 'supabase-vendor'
          if (id.includes('react-router')) return 'router-vendor'
          if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor'
          return 'vendor'
        },
      },
    },
  },
})
