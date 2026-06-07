import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Agroware Mombasa',
        short_name: 'Agroware',
        description: 'Sistema de gestão de propriedades rurais para pecuária de corte',
        lang: 'pt-BR',
        theme_color: '#2E7D32',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        // Ícones PNG gerados a partir do logo (símbolo sobre fundo branco, com
        // folga de zona segura para o modo maskable). Ver public/icons/README.md.
        icons: [
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // `npm run preview` exposto via Cloudflare quick tunnel: a URL muda a cada
  // execução, então liberamos todos os subdomínios *.trycloudflare.com (o prefixo
  // "." cobre o host e qualquer subdomínio). Em produção a app é servida por
  // Nginx (sem esta checagem), então isto só afeta o teste local tunelado.
  server: {
    allowedHosts: ['dev.mombasa.app'],
  },
  preview: {
    allowedHosts: ['.trycloudflare.com', 'dev.mombasa.app'],
  },
})
