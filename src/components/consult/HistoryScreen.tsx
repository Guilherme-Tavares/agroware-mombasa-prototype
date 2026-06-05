import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Search } from 'lucide-react'
import type { ReactNode } from 'react'

// ──────────────────────────────────────────────────────────────────────────────
// Tela de histórico (consulta somente leitura) para registros de operação —
// pesagens, aplicações, abastecimentos, lotação, pertencimento, passagens,
// transferências. Cabeçalho + contagem + busca opcional + corpo (lista).
// Não há criação/edição/remoção: são logs derivados das operações.
// ──────────────────────────────────────────────────────────────────────────────

interface HistoryScreenProps {
  title: string
  count: number
  search?: string
  onSearch?: (value: string) => void
  searchPlaceholder?: string
  children: ReactNode
}

export default function HistoryScreen({
  title, count, search, onSearch, searchPlaceholder = 'Buscar...', children,
}: HistoryScreenProps) {
  const navigate = useNavigate()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-title font-bold text-gray-900">{title}</h1>
          <p className="text-caption text-gray-400">{count} registro{count !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {onSearch && (
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-body text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
      )}

      {children}
    </div>
  )
}
