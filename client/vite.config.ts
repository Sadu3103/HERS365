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
  }
})
