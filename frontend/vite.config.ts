import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: Object.fromEntries(['/api', '/oauth2', '/login/oauth2/code'].map(path => [path, {
      target: process.env.BACKEND_PROXY_URL || 'http://localhost:8080',
      changeOrigin: true,
    }])),
  },
})
