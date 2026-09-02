import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    proxy: {
      '/api/v1': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/mappls-search': {
        target: 'https://search.mappls.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mappls-search/, ''),
      },
      '/api/mappls-route': {
        target: 'https://route.mappls.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mappls-route/, ''),
      },
      '/api/mappls-token': {
        target: 'https://outpost.mappls.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mappls-token/, '/api/security/oauth/token'),
      },
    },
  },
})
