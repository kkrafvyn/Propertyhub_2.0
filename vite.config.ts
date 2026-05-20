import { defineConfig } from 'vitest/config'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://open.er-api.com https://api.ghana-api.dev ws://127.0.0.1:* ws://localhost:* http://127.0.0.1:* http://localhost:*",
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "img-src 'self' data: blob: https:",
  "manifest-src 'self'",
  "media-src 'self' data: blob:",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
].join('; ')

const devContentSecurityPolicy = contentSecurityPolicy.replace(
  "script-src 'self'",
  "script-src 'self' 'unsafe-inline'"
)

const previewSecurityHeaders = {
  'Content-Security-Policy': contentSecurityPolicy,
  'Permissions-Policy': 'camera=(self), geolocation=(self), microphone=(), payment=(self)',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
}

const serverSecurityHeaders = {
  ...previewSecurityHeaders,
  'Content-Security-Policy': devContentSecurityPolicy,
}

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used - do not remove them.
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  preview: {
    headers: previewSecurityHeaders,
  },
  server: {
    headers: serverSecurityHeaders,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (id.includes('react-dom') || /[\\/]react[\\/]/.test(id)) {
            return 'react-vendor'
          }

          if (id.includes('react-router')) {
            return 'router'
          }

          if (id.includes('@supabase')) {
            return 'supabase'
          }

          if (id.includes('@mui') || id.includes('@emotion')) {
            return 'mui'
          }

          if (id.includes('recharts') || id.includes('d3-')) {
            return 'charts'
          }

          if (
            id.includes('lucide-react') ||
            id.includes('motion') ||
            id.includes('canvas-confetti')
          ) {
            return 'visual-vendor'
          }

          if (
            id.includes('@radix-ui') ||
            id.includes('cmdk') ||
            id.includes('class-variance-authority') ||
            id.includes('clsx') ||
            id.includes('embla-carousel-react') ||
            id.includes('input-otp') ||
            id.includes('react-day-picker') ||
            id.includes('react-resizable-panels') ||
            id.includes('tailwind-merge') ||
            id.includes('vaul')
          ) {
            return 'ui-vendor'
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    testTimeout: 10000,
    exclude: ['tests/e2e/**', '**/node_modules/**'],
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
