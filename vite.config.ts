
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: resolve('index.html'),
        sw: resolve('sw.js')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'sw') {
            return 'sw.js';
          }
          return 'assets/[name]-[hash].js';
        },
        manualChunks: {
          // Simplify chunking: Group React and Utils, let Firebase float or bundle naturally
          vendor: ['react', 'react-dom', 'lucide-react', 'xlsx'],
        }
      }
    }
  }
});
