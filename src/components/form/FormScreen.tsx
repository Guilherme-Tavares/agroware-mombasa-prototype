import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import Button from '@/components/ui/Button.tsx'
import AccessDenied, { ACCESS_DENIED_MESSAGE } from '@/components/ui/AccessDenied.tsx'

// ──────────────────────────────────────────────────────────────────────────────
// Template de cadastro alinhado às convenções da rodada (escopo §7):
//  - cabeçalho com voltar + título/subtítulo
//  - guarda de acesso (níveis): bloqueia escrita quando o usuário não pode
//  - banner de erros consolidado, animado, após tentativa de submit
//  - card branco com seções (FormSection) separadas por divisória
//  - rodapé padrão Cancelar + Salvar com estado de carregamento
//  - <form> nativo (Enter submete); a11y básica
//
// Telas de cadastro novas (RF16+) compõem FormSection dentro de FormScreen.
// ──────────────────────────────────────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
      aria-label="Voltar"
    >
      <ChevronLeft size={22} />
    </button>
  )
}

export function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
      {children}
    </p>
  )
}

export function FormSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="p-5 flex flex-col gap-4">
      {title && <SectionHeader>{title}</SectionHeader>}
      {children}
    </div>
  )
}

interface FormScreenProps {
  title: string
  subtitle?: string
  submitLabel: string
  onSubmit: () => void
  saving?: boolean
  errorCount?: number
  /** Quando false, mostra aviso de somente leitura no lugar do formulário. */
  canWrite?: boolean
  blockedMessage?: string
  children: ReactNode
  submitDisabled?: boolean
}

export default function FormScreen({
  title,
  subtitle,
  submitLabel,
  onSubmit,
  saving = false,
  errorCount = 0,
  canWrite = true,
  blockedMessage = ACCESS_DENIED_MESSAGE,
  children,
  submitDisabled = false,
}: FormScreenProps) {
  const navigate = useNavigate()

  if (!canWrite) {
    return <AccessDenied title={title} message={blockedMessage} />
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onSubmit={(e) => { e.preventDefault(); onSubmit() }}
      noValidate
      className="max-w-xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <BackButton onClick={() => navigate(-1)} />
        <div>
          <h1 className="text-title font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-caption text-gray-400">{subtitle}</p>}
        </div>
      </div>

      {/* Banner de erros */}
      <AnimatePresence>
        {errorCount > 0 && (
          <motion.div
            key="err-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <p className="text-caption text-alert bg-alert/10 px-3 py-2.5 rounded-xl">
              Corrija {errorCount} campo{errorCount > 1 ? 's' : ''} obrigatório{errorCount > 1 ? 's' : ''} antes de salvar
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card com seções */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
        {children}
      </div>

      {/* Footer */}
      <div className="mt-6 flex gap-3 pb-4">
        <Button type="button" variant="secondary" onClick={() => navigate(-1)} className="shrink-0">
          Cancelar
        </Button>
        <Button type="submit" fullWidth loading={saving} disabled={submitDisabled}>
          {submitLabel}
        </Button>
      </div>
    </motion.form>
  )
}
