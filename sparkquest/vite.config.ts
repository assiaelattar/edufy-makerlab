import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isVercel = process.env.VERCEL === '1';
  console.log(`[Vite Build] Mode: ${mode}, Vercel: ${isVercel}`);
  console.log(`[Vite Build] GEMINI_API_KEY present: ${!!env.GEMINI_API_KEY}`);

  return {
    base: isVercel ? '/' : './',
    server: {
      port: 5174,
      strictPort: true,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      ...(command === 'serve' && env.VITE_LOCAL_FIREBASE_PROJECT_ID === 'demo-parent-journey'
        ? [{
            name: 'local-parent-demo-csp',
            transformIndexHtml(html: string) {
              return html.replace("connect-src 'self'", "connect-src 'self' http://127.0.0.1:8080 http://127.0.0.1:9099 http://127.0.0.1:9199 ws://127.0.0.1:8080");
            }
          }]
        : [])
    ],
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
    envDir: '.',
    optimizeDeps: {
      include: ['papaparse']
    }
  };
});
