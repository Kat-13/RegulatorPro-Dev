import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
      '5173-if4j0l8kg1824dwz6da49-f18e74fa.manusvm.computer',
      '5174-if4j0l8kg1824dwz6da49-f18e74fa.manusvm.computer',
      '5173-i4u5q4wzga20dqo40gx3x-50251577.manusvm.computer',
      '5173-ir59yq84wremyxlxe5oro-5361a5a8.manusvm.computer',
      '5173-ixcky6v1m1pj9jx8800fr-95ff4e60.manusvm.computer',
      '5174-ixcky6v1m1pj9jx8800fr-95ff4e60.manusvm.computer',
      '5173-ioszqr5ri6w7v8diejc8y-dcbd7d31.manusvm.computer',
      '5173-il8ahvphl45ebyegku7xd-18318e58.manusvm.computer',
	      '5173-ip7af5uo15687xqblqo9i-a4895f0e.manusvm.computer'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    },
    watch: {
      ignored: [
        '**/backend/**',
        '**/*.json'
      ]
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})

