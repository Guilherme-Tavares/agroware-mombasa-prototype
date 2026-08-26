import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Download } from 'lucide-react'
import type { ReactNode } from 'react'
import { useAccess } from '@/hooks/useAccess'
import AccessDenied from '@/components/ui/AccessDenied.tsx'

// ──────────────────────────────────────────────────────────────────────────────
// Template de relatório (Fase 8). Cabeçalho com voltar + título/subtítulo +
// botão "Exportar CSV". O corpo recebe filtros, resumo (KPIs) e a tabela como
// children. Cada relatório monta seus dados e passa `onExport` para gerar o CSV.
//
// Guarda de acesso: a emissão de relatórios é exclusiva do produtor (escopo
// §6.2, decisão 17), porque consolida informação de gestão. A guarda vive aqui
// para valer, de uma vez, para os sete relatórios que usam este template.
// ──────────────────────────────────────────────────────────────────────────────

interface ReportScreenProps {
  title: string
  subtitle?: string
  onExport?: () => void
  exportDisabled?: boolean
  children: ReactNode
}

export default function ReportScreen({
  title, subtitle, onExport, exportDisabled = false, children,
}: ReportScreenProps) {
  const navigate = useNavigate()
  const { can } = useAccess()

  if (!can.reports) {
    return <AccessDenied title={title} width="wide" />
  }

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
          {subtitle && <p className="text-caption text-gray-400">{subtitle}</p>}
        </div>
        {onExport && (
          <button
            onClick={onExport}
            disabled={exportDisabled}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-primary text-white text-button hover:bg-primary-dark transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        )}
      </div>

      {children}
    </div>
  )
}

// ── Sub-componentes utilitários para os relatórios ──

export function ReportFilters({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-col gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Filtros</p>
      {children}
    </div>
  )
}

export function ReportKpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={[
      'flex flex-col items-center p-3 rounded-xl',
      accent ? 'bg-primary-bg' : 'bg-gray-50',
    ].join(' ')}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-1">{label}</span>
      <span className={['font-data text-h2 tabular-nums leading-tight', accent ? 'text-primary' : 'text-gray-900'].join(' ')}>
        {value}
      </span>
    </div>
  )
}
