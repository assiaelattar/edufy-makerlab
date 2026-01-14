import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isVercel = process.env.VERCEL === '1';
  console.log(`[Vite Build] Mode: ${mode}, Vercel: ${isVercel}`);
  console.log(`[Vite Build] GEMINI_API_KEY present: ${!!env.GEMINI_API_KEY}`);

  return {
    base: isVercel ? '/' : './',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || 'MISSING_KEY_BUILD'),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || 'MISSING_KEY_BUILD')
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    envDir: '.'
  };
});
