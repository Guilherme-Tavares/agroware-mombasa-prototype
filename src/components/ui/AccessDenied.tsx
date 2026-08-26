import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, ShieldAlert } from 'lucide-react'

// ──────────────────────────────────────────────────────────────────────────────
// Superfície única de negativa de acesso (escopo §6.2). Usada quando o nível do
// usuário na propriedade ativa não alcança a tela: escrita no FormScreen,
// emissão de relatórios e projeção de peso, restritas ao produtor.
//
// A mensagem é uma só em todo o sistema, para que o texto possa ser citado nos
// fluxos de exceção dos casos de uso sem variação de tela para tela.
// ──────────────────────────────────────────────────────────────────────────────

export const ACCESS_DENIED_MESSAGE =
  'Você não tem permissão para esta ação nesta propriedade.'

interface AccessDeniedProps {
  title: string
  message?: string
  /** Largura do contêiner, para acompanhar a tela que hospeda o aviso. */
  width?: 'form' | 'wide'
}

export default function AccessDenied({
  title,
  message = ACCESS_DENIED_MESSAGE,
  width = 'form',
}: AccessDeniedProps) {
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={width === 'wide' ? 'max-w-2xl mx-auto' : 'max-w-xl mx-auto'}
    >
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-title font-bold text-gray-900">{title}</h1>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-start gap-3">
        <ShieldAlert size={18} className="text-gray-400 mt-0.5 shrink-0" />
        <p className="text-caption text-gray-500">{message}</p>
      </div>
    </motion.div>
  )
}
