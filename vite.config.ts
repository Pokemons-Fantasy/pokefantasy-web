import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { version } from './package.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    proxy: {
      // Igual que public/_redirects: sin VITE_API_URL, `npm run dev` habla con producción a través de /api
      '/api': {
        target: 'https://pokefantasy.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
