import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Search, Plus, Eye, EyeOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

// ──────────────────────────────────────────────────────────────────────────────
// Padrão único de tela de consulta (Fase 6). Cabeçalho com voltar + título +
// contagem, busca, alternância "incluir inativos" (reversibilidade: itens
// removidos por exclusão lógica continuam acessíveis e restauráveis), e botão
// "Novo" condicionado ao acesso de escrita. O corpo (a lista) é passado como
// children. As telas de consulta de cada entidade compõem este wrapper.
// ──────────────────────────────────────────────────────────────────────────────

interface ConsultScreenProps {
  title: string
  subtitle?: string
  count: number
  search: string
  onSearch: (value: string) => void
  searchPlaceholder?: string
  showInactive: boolean
  onToggleInactive: () => void
  onNew?: () => void
  newLabel?: string
  /** Alternador opcional (ex.: SegmentedTabs) entre o cabeçalho e a busca. */
  tabs?: ReactNode
  children: ReactNode
}

export default function ConsultScreen({
  title, subtitle, count, search, onSearch, searchPlaceholder = 'Buscar...',
  showInactive, onToggleInactive, onNew, newLabel = 'Novo', tabs, children,
}: ConsultScreenProps) {
  const navigate = useNavigate()

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
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
          <p className="text-caption text-gray-400">
            {subtitle ?? `${count} registro${count !== 1 ? 's' : ''}`}
          </p>
        </div>
        {onNew && (
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-primary text-white text-button hover:bg-primary-dark transition-colors shrink-0"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">{newLabel}</span>
          </button>
        )}
      </div>

      {/* Alternador opcional de abas */}
      {tabs && <div className="mb-4">{tabs}</div>}

      {/* Controls */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-body text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
        <button
          onClick={onToggleInactive}
          aria-pressed={showInactive}
          title={showInactive ? 'Ocultar inativos' : 'Incluir inativos'}
          className={cn(
            'flex items-center gap-1.5 px-3 h-10 rounded-xl border text-button transition-colors shrink-0',
            showInactive
              ? 'border-primary text-primary bg-primary/5'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50',
          )}
        >
          {showInactive ? <Eye size={15} /> : <EyeOff size={15} />}
          <span className="hidden sm:inline">Inativos</span>
        </button>
      </div>

      {/* List */}
      {children}
    </div>
  )
}
