import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, ChevronRight } from 'lucide-react'

import { useAuthStore } from '@/store/useAuthStore'
import { useFarmStore } from '@/store/useFarmStore'
import { useUIStore } from '@/store/useUIStore'
import AgrowareLogo from '@/assets/logo/AgrowareLogo.tsx'
import sceneImg from '@/assets/illustrations/mombasa-scene.png'
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
  const updateCurrentUser = useFarmStore((s) => s.updateCurrentUser)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)

  // Modo offline é o único habilitado no protótipo; o online fica visível porém
  // desabilitado (decisão 5.6 do documento de alinhamento).
  const [mode, setMode] = useState<LoginMode>('offline')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  // Campo "Seu nome" NÃO-controlado (via ref): o teste estático provou que o
  // teclado capitaliza em inputs HTML puros, mas não no nosso input controlado
  // pelo React — o React reescreve o `value` do elemento e isso suprime a
  // capitalização automática do teclado no Samsung Internet. Lemos o valor no
  // submit.
  const nameRef = useRef<HTMLInputElement>(null)

  function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      const derivedName = email.split('@')[0].replace(/[._-]/g, ' ') || ''
      login(derivedName, email)
      setSidebarOpen(false)
      navigate('/', { replace: true })
    }, 600)
  }

  function handleOfflineLogin() {
    const nameValue = (nameRef.current?.value ?? '').trim()
    if (!nameValue) { nameRef.current?.focus(); return }
    setLoading(true)
    setTimeout(() => {
      loginOffline(nameValue)
      updateCurrentUser({ name: nameValue, email: null, online: false })
      setSidebarOpen(false)
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
      {/* A marca "Agroware Mombasa" já vem embutida na imagem, então não há
          overlay de logo/tagline aqui (evita duplicar a marca). */}
      <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden">
        <img
          src={sceneImg}
          alt="Paisagem pecuária ao entardecer com bovinos pastando"
          // object-left-bottom: ancora o recorte no canto inferior-esquerdo, onde
          // está a marca "Agroware Mombasa" embutida — assim ela nunca é cortada.
          className="absolute inset-0 w-full h-full object-cover object-left-bottom"
        />
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
            <div className="w-full">
              <h1 className="text-h1 text-gray-900 leading-tight text-center lg:text-left">Bem-vindo ao Agroware</h1>
              <p className="text-[32px] font-bold tracking-tight text-primary leading-tight text-center lg:text-left mt-0.5">Mombasa</p>
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
                'flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-button transition-all duration-200',
                'text-gray-300 cursor-not-allowed opacity-60',
              ].join(' ')}
            >
              <Wifi size={14} />
              Entrar com email
              <span className="text-[9px] font-medium uppercase tracking-wide bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
                Online
              </span>
            </button>
            <button
              type="button"
              onClick={() => switchMode('offline')}
              className={[
                'flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-button transition-all duration-200',
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
              <motion.div
                key="offline-form"
                variants={formVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                // SEM <form> de propósito: neste navegador (Samsung Internet) um
                // <input> dentro de <form> não dispara a capitalização do teclado
                // (nem com autocapitalize no input nem no form). Submetemos pelo
                // botão (onClick) e pela tecla Enter, com validação em JS.
                className="space-y-5"
              >
                <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                  <p className="text-caption text-gray-400">
                    Modo offline: seus dados ficam apenas neste dispositivo.
                  </p>
                </div>
                {/* Campo "Seu nome" como <input> simples, SEM placeholder — espelha
                    o elemento do site cujo teclado capitaliza. O label flutuante do
                    componente Input depende de placeholder=" " (truque CSS peer),
                    o último atributo que ainda nos diferenciava daquele elemento.
                    Por isso aqui usamos label fixo em cima e um input puro. */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="login-name" className="text-xs font-medium text-primary">
                    Seu nome <span className="text-alert">*</span>
                  </label>
                  <input
                    id="login-name"
                    name="nome"
                    ref={nameRef}
                    type="text"
                    autoComplete="given-name"
                    required
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleOfflineLogin() } }}
                    className="block w-full rounded-input border border-gray-200 bg-white text-body text-gray-900 py-3 px-4 outline-none transition-all duration-150 focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleOfflineLogin}
                  variant="secondary"
                  fullWidth
                  loading={loading}
                  icon={<WifiOff size={16} />}
                >
                  Entrar offline
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* First-access link */}
          <p className="text-center text-caption text-gray-400">
            Primeiro acesso?{' '}
            <button
              type="button"
              onClick={() => {
                switchMode('offline')
                // Foca o campo "Seu nome" (abre o teclado no mobile).
                requestAnimationFrame(() => document.getElementById('login-name')?.focus())
              }}
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
