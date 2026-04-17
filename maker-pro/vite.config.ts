import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    server: {
        fs: {
            allow: ['..']
        }
    },
    resolve: {
        alias: {
            // Redirect root project's firebase import to MakerPro's local one
            '../services/firebase': path.resolve(__dirname, 'src/services/firebase.ts')
        }
    },
    optimizeDeps: {
        include: [
            'firebase/app',
            'firebase/firestore',
            'firebase/auth'
        ]
    },
    plugins: [react()],
})
