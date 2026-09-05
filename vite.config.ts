import { defineConfig } from 'vitest/config'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { mobileBrandPlugin } from './scripts/vite-mobile-brand.mjs'

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

/** Packaged Electron loads dist via file:// — crossorigin module tags fail silently. */
function electronDesktopBuild() {
  return {
    name: 'electron-desktop-build',
    apply: 'build' as const,
    config() {
      if (process.env.ELECTRON_BUILD !== 'true') return undefined
      return {
        build: {
          modulePreload: false,
        },
      }
    },
    transformIndexHtml(html: string) {
      if (process.env.ELECTRON_BUILD !== 'true') return html
      return html.replace(/\s+crossorigin(?:="[^"]*")?/g, '')
    },
  }
}

export default defineConfig({
  base: process.env.ELECTRON_BUILD === 'true' ? './' : '/',
  plugins: [
    figmaAssetResolver(),
    electronDesktopBuild(),
    mobileBrandPlugin(),
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
  build: {
    chunkSizeWarningLimit: 1200,
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
    environment: 'happy-dom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    testTimeout: 10000,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'e2e/**',
      ...(process.env.RUN_TENANT_ISOLATION_TESTS ? [] : ['**/tenant-isolation.test.ts']),
    ],
    env: {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
