import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PWA disabled - had CVE in serialize-javascript dependency
    // Re-enable when patch is available
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/api': process.env.VITE_API_PROXY || 'http://localhost:4000'
    }
  },
  build: {
    rollupOptions: {
      output: {
        // Pull the heavy, version-stable vendor libs into their own chunks so
        // they cache independently of app code and don't get re-downloaded
        // on every deploy. Anything not matched here stays in the per-route
        // chunks that React.lazy generates in src/App.tsx.
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined
          if (
            id.includes('/react-router-dom/') ||
            id.includes('/react-router/') ||
            id.includes('/react-helmet') ||
            id.includes('/@tanstack/react-query/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/') ||
            // bare 'react' package — the slash anchors avoid matching
            // 'react-router', 'react-dom', etc.
            id.match(/\/node_modules\/react\//)
          ) {
            return 'react'
          }
          if (id.includes('/framer-motion/')) return 'motion'
          if (id.includes('/lucide-react/')) return 'icons'
          if (id.includes('/three/') || id.includes('/@types/three/')) return 'three'
          if (id.includes('/gsap/')) return 'gsap'
          if (id.includes('/@capacitor/')) return 'capacitor'
          if (id.includes('/@dnd-kit/')) return 'dndkit'
          if (id.includes('/html-to-image/')) return 'image-export'
          if (id.includes('/date-fns/')) return 'date'
          return undefined
        }
      }
    }
  }
})
