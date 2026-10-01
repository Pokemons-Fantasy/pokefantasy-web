import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { version } from './package.json';

export default defineConfig({
  plugins: [react()],
  // Igual que vite.config.ts: los componentes que muestran la versión la necesitan en los tests
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
