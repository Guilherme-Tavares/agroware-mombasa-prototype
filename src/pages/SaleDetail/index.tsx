import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Tag, Package } from 'lucide-react'
import type { ReactNode } from 'react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import AccessDenied from '@/components/ui/AccessDenied.tsx'
import { formatDate, formatCurrency, formatWeight } from '@/utils/format'
import Badge from '@/components/ui/Badge.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-caption text-gray-400">{label}</span>
      <span className="text-caption font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}

export default function SaleDetail() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const { can }  = useAccess()

  const sale     = useFarmStore((s) => s.sales.find((x) => x.id === id))
  const saleLots = useFarmStore((s) => s.saleLots)

  // Financeiro é exclusivo do produtor (escopo §6.2): a leitura também, não
  // apenas o lançamento.
  if (!can.finance) {
    return <AccessDenied title="Venda" width="wide" />
  }

  if (!sale) {
    return (
      <div className="max-w-xl mx-auto">
        <EmptyState
          icon={<Tag size={28} />}
          title="Venda não encontrada"
          description="O registro pode ter sido removido em definitivo."
          action={{ label: 'Voltar à lista', onClick: () => navigate('/sales') }}
        />
      </div>
    )
  }

  const lot = saleLots.find((l) => l.id === sale.saleLotId)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="max-w-xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/sales')}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-title font-bold text-gray-900 truncate">{sale.buyer || 'Venda'}</h1>
          <p className="text-caption text-gray-400">{formatDate(sale.date)}</p>
        </div>
        <Badge variant="ok">Concluída</Badge>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <DataRow label="Valor total" value={<span className="font-data tabular-nums text-h2 text-primary">{formatCurrency(sale.totalValue ?? 0)}</span>} />
        <DataRow label="Preço da arroba" value={formatCurrency(sale.pricePerArroba ?? 0)} />
        <DataRow label="Peso total" value={sale.totalWeightKg != null ? <span className="font-data tabular-nums">{formatWeight(sale.totalWeightKg)}</span> : '—'} />
        <DataRow label="Comprador" value={sale.buyer ?? '—'} />
        <DataRow label="Data" value={formatDate(sale.date)} />
      </div>

      {lot && (
        <button
          onClick={() => navigate(`/sale-lots/${lot.id}`)}
          className="mt-4 w-full flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-white text-left hover:bg-gray-50 transition-colors"
        >
          <Package size={18} className="text-gray-400 shrink-0" />
          <span className="flex-1 text-body text-gray-900">{lot.identifier}</span>
          <span className="text-caption text-primary font-medium">Ver lote</span>
        </button>
      )}

      <p className="text-caption text-gray-400 mt-4 px-1">
        A venda inativou os bovinos do lote e encerrou seus pertencimentos. O estorno de
        venda é uma evolução futura.
      </p>
    </motion.div>
  )
}
