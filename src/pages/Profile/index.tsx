import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, LogOut, Wifi, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useAccess, accessLevelLabel } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import Button from '@/components/ui/Button.tsx'
import Input from '@/components/ui/Input.tsx'
import Badge from '@/components/ui/Badge.tsx'
import Modal from '@/components/ui/Modal.tsx'

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
      {children}
    </p>
  )
}

export default function Profile() {
  const navigate     = useNavigate()
  const toast        = useToast()
  const user         = useFarmStore((s) => s.user)
  const updateCurrentUser = useFarmStore((s) => s.updateCurrentUser)
  const producerName = useAuthStore((s) => s.producerName)
  const login        = useAuthStore((s) => s.login)
  const logout       = useAuthStore((s) => s.logout)
  const { level, isOwner } = useAccess()

  const isOnline = Boolean(user?.online || user?.email)

  const [name, setName]   = useState(producerName || user?.name || '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [saving, setSaving] = useState(false)

  // Conversão offline → online (RF03), simulada.
  const [convertOpen, setConvertOpen] = useState(false)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [converting, setConverting] = useState(false)

  const initials = (name || 'A').split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()

  function handleSave() {
    setSaving(true)
    setTimeout(() => {
      updateCurrentUser({ name: name.trim(), phone: phone.trim() || null })
      login(name.trim(), user?.email ?? undefined) // mantém o nome do header em sincronia
      setSaving(false)
      toast.success('Perfil atualizado.')
    }, 400)
  }

  function handleConvert() {
    if (!email.trim() || !password.trim()) return
    setConverting(true)
    setTimeout(() => {
      updateCurrentUser({ email: email.trim(), online: true })
      login(name.trim(), email.trim())
      setConverting(false)
      setConvertOpen(false)
      toast.success('Conta convertida para online (simulado).')
    }, 600)
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="max-w-xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-title font-bold text-gray-900">Meu perfil</h1>
          <p className="text-caption text-gray-400">Gerencie sua conta e acesso</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
        {/* Identidade */}
        <div className="p-5 flex items-center gap-4">
          <span className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center text-h2 font-medium select-none shrink-0">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="text-h2 text-gray-900 truncate">{name || 'Sem nome'}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant={isOnline ? 'info' : 'neutral'} size="sm">
                {isOnline ? 'Conta online' : 'Conta offline'}
              </Badge>
              <Badge variant={level === 'produtor' ? 'ok' : level === 'colaborador' ? 'warning' : 'neutral'} size="sm">
                {accessLevelLabel(level)}{isOwner ? ' · dono' : ''}
              </Badge>
            </div>
          </div>
        </div>

        {/* Dados pessoais */}
        <div className="p-5 flex flex-col gap-4">
          <SectionHeader>Dados pessoais</SectionHeader>
          <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(69) 9 9999-9999" />
          {isOnline && (
            <Input label="E-mail" value={user?.email ?? ''} disabled helperText="E-mail da conta online" />
          )}
          <div>
            <Button loading={saving} onClick={handleSave} disabled={!name.trim()}>
              Salvar alterações
            </Button>
          </div>
        </div>

        {/* Conta */}
        <div className="p-5 flex flex-col gap-3">
          <SectionHeader>Conta</SectionHeader>
          {isOnline ? (
            <div className="flex items-center gap-2 text-caption text-gray-500">
              <ShieldCheck size={15} className="text-ok" />
              Sua conta é online e participaria da sincronização em nuvem.
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 px-3 py-3 rounded-xl bg-gray-50 border border-dashed border-gray-200">
              <div className="flex items-start gap-2 min-w-0">
                <Wifi size={15} className="text-primary mt-0.5 shrink-0" />
                <p className="text-caption text-gray-500">
                  Conta offline. Converta para online para sincronizar e compartilhar a propriedade.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setConvertOpen(true)} className="shrink-0">
                Converter
              </Button>
            </div>
          )}
        </div>

        {/* Sessão */}
        <div className="p-5">
          <Button variant="ghost" icon={<LogOut size={15} />} onClick={handleLogout} className="text-alert">
            Sair da conta
          </Button>
        </div>
      </div>

      {/* Modal de conversão online (RF03) */}
      <Modal
        isOpen={convertOpen}
        onClose={() => !converting && setConvertOpen(false)}
        title="Converter para conta online"
        description="Modo online simulado no protótipo — nenhum e-mail é enviado."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConvertOpen(false)} disabled={converting}>
              Cancelar
            </Button>
            <Button loading={converting} onClick={handleConvert} disabled={!email.trim() || !password.trim()}>
              Converter
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
      </Modal>
    </motion.div>
  )
}
