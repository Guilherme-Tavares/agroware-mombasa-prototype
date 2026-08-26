import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Receipt, ShoppingCart, Tag, Syringe, Droplets, TrendingUp, Beef,
} from 'lucide-react'
import type { ReactNode } from 'react'

import Badge from '@/components/ui/Badge.tsx'
import AccessDenied from '@/components/ui/AccessDenied.tsx'
import { useAccess } from '@/hooks/useAccess'

interface ReportItem {
  to?: string
  label: string
  desc: string
  icon: ReactNode
  ready: boolean
}

const REPORTS: ReportItem[] = [
  { to: '/reports/expenses', label: 'Despesas', desc: 'Gastos por período e categoria', icon: <Receipt size={18} />, ready: true },
  { to: '/reports/purchases', label: 'Compras de insumos', desc: 'Entradas de medicamento e alimento', icon: <ShoppingCart size={18} />, ready: true },
  { to: '/reports/sales', label: 'Vendas de gado', desc: 'Lotes vendidos e receita', icon: <Tag size={18} />, ready: true },
  { to: '/reports/applications', label: 'Aplicações de medicamentos', desc: 'Sanidade por período', icon: <Syringe size={18} />, ready: true },
  { to: '/reports/refills', label: 'Abastecimentos de cochos', desc: 'Consumo de alimento', icon: <Droplets size={18} />, ready: true },
  { to: '/reports/performance', label: 'Desempenho zootécnico', desc: 'GMD e ganho por lote', icon: <TrendingUp size={18} />, ready: true },
  { to: '/reports/inventory', label: 'Inventário de animais', desc: 'Rebanho atual e pesos', icon: <Beef size={18} />, ready: true },
]

export default function ReportsIndex() {
  const navigate = useNavigate()
  const { can } = useAccess()

  // Relatórios são exclusivos do produtor (escopo §6.2, decisão 17).
  if (!can.reports) {
    return <AccessDenied title="Relatórios" width="wide" />
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
        <div>
          <h1 className="text-title font-bold text-gray-900">Relatórios</h1>
          <p className="text-caption text-gray-400">Consulta e exportação em CSV</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {REPORTS.map((r) => (
          <motion.button
            key={r.label}
            layout
            disabled={!r.ready}
            onClick={() => r.to && navigate(r.to)}
            className={[
              'flex items-center gap-3 p-3 rounded-xl border bg-white text-left transition-colors',
              r.ready ? 'border-gray-100 hover:border-gray-200 hover:shadow-sm' : 'border-gray-100 opacity-60 cursor-not-allowed',
            ].join(' ')}
          >
            <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-gray-500">
              {r.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-body font-medium text-gray-900 truncate">{r.label}</p>
              <p className="text-caption text-gray-400 truncate">{r.desc}</p>
            </div>
            {r.ready ? <ChevronRight size={16} className="text-gray-300 shrink-0" /> : <Badge variant="neutral" size="sm">Em breve</Badge>}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
