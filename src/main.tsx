import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import '@fontsource/roboto-mono/400.css'
import '@fontsource/roboto-mono/500.css'
import '@/styles/globals.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { seedIfEmpty } from './data/seed.ts'

// `crypto.randomUUID` só existe em contexto seguro (HTTPS ou localhost). Ao abrir
// a app por http://IP-da-LAN (teste em outros dispositivos), ele é `undefined` e
// a geração de IDs (reconcile de notificações no boot, cadastros) lançaria erro —
// derrubando a renderização (tela branca). Provê um fallback não-criptográfico,
// suficiente para IDs locais do protótipo.
if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
  type UUIDFn = () => `${string}-${string}-${string}-${string}-${string}`
  ;(crypto as { randomUUID: UUIDFn }).randomUUID = (() =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
      const r = (Math.random() * 16) | 0
      return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })) as UUIDFn
}

seedIfEmpty()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
