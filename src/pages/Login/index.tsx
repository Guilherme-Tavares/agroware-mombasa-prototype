import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, ChevronRight } from 'lucide-react'

import { useAuthStore } from '@/store/useAuthStore'
import AgrowareLogo from '@/assets/logo/AgrowareLogo.tsx'
import PastoralScene from '@/assets/illustrations/PastoralScene.tsx'
import Input from '@/components/ui/Input.tsx'
import Button from '@/components/ui/Button.tsx'

// ─── Animations ───────────────────────────────────────────────────────────────

const formVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0, 0, 0.2, 1] as [number, number, number, number] } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.2 } },
}

// ─── Component ────────────────────────────────────────────────────────────────

type LoginMode = 'email' | 'offline'

export default function Login() {
  const navigate = useNavigate()
  const { login, loginOffline } = useAuthStore()

  // Modo offline é o único habilitado no protótipo; o online fica visível porém
  // desabilitado (decisão 5.6 do documento de alinhamento).
  const [mode, setMode] = useState<LoginMode>('offline')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [loading, setLoading]   = useState(false)

  function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      // Extract a name from the email prefix or fall back to the default
      const derivedName = email.split('@')[0].replace(/[._-]/g, ' ') || ''
      login(derivedName, email)
      navigate('/', { replace: true })
    }, 600)
  }

  function handleOfflineLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      loginOffline(name)
      navigate('/', { replace: true })
    }, 500)
  }

  function switchMode(next: LoginMode) {
    setLoading(false)
    setMode(next)
  }

  return (
    <div className="min-h-svh flex">
      {/* ── Left panel — illustration (desktop only) ───────────────────────── */}
      <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden">
        <PastoralScene className="absolute inset-0 w-full h-full object-cover" />

        {/* Brand overlay bottom-left */}
        <div className="absolute bottom-10 left-10 z-10">
          <AgrowareLogo size={40} variant="wordmark" color="#ffffff" />
          <p className="mt-2 text-caption text-white/70 max-w-xs">
            Gestão pecuária offline-first para produtor de médio porte.
          </p>
        </div>
      </div>

      {/* ── Right panel — form ─────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0, 0, 0.2, 1] }}
          className="w-full max-w-sm space-y-8"
        >
          {/* Logo (visible on mobile where illustration is hidden) */}
          <div className="flex flex-col items-center gap-3 lg:items-start">
            <AgrowareLogo size={36} variant="mark" />
            <div>
              <h1 className="text-h1 text-gray-900">Bem-vindo ao Agroware</h1>
              <p className="text-body text-gray-400 mt-0.5">Mombasa</p>
            </div>
          </div>

          {/* Mode toggle pills — modo online desabilitado no protótipo */}
          <div className="flex rounded-lg bg-gray-100 p-1 gap-1">
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Disponível apenas no modo online (indisponível no protótipo)"
              className={[
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-button transition-all duration-200',
                'text-gray-300 cursor-not-allowed opacity-60',
              ].join(' ')}
            >
              <Wifi size={14} />
              Entrar com email
              <span className="ml-1 text-[9px] font-medium uppercase tracking-wide bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
                Online
              </span>
            </button>
            <button
              type="button"
              onClick={() => switchMode('offline')}
              className={[
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-button transition-all duration-200',
                mode === 'offline'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600',
              ].join(' ')}
            >
              <WifiOff size={14} />
              Entrar offline
            </button>
          </div>

          {/* Form — animated mode switch */}
          <AnimatePresence mode="wait" initial={false}>
            {mode === 'email' ? (
              <motion.form
                key="email-form"
                variants={formVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                onSubmit={handleEmailLogin}
                className="space-y-5"
              >
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <Input
                  label="Senha"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={loading}
                  icon={<ChevronRight size={16} />}
                  iconPosition="right"
                >
                  Entrar
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="offline-form"
                variants={formVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                onSubmit={handleOfflineLogin}
                className="space-y-5"
              >
                <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                  <p className="text-caption text-gray-400">
                    Modo offline: seus dados ficam apenas neste dispositivo.
                  </p>
                </div>
                <Input
                  label="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
                <Button
                  type="submit"
                  variant="secondary"
                  fullWidth
                  loading={loading}
                  icon={<WifiOff size={16} />}
                >
                  Entrar offline
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* First-access link */}
          <p className="text-center text-caption text-gray-400">
            Primeiro acesso?{' '}
            <button
              type="button"
              onClick={() => switchMode('offline')}
              className="text-primary underline underline-offset-2 hover:text-primary-dark transition-colors"
            >
              Informe seu nome e comece offline
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
