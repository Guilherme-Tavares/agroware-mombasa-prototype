import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Tag, ChevronRight } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import AccessDenied from '@/components/ui/AccessDenied.tsx'
import { formatDate, formatCurrency } from '@/utils/format'
import ConsultScreen from '@/components/consult/ConsultScreen.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

export default function SaleList() {
  const navigate = useNavigate()
  const farm     = useFarmStore((s) => s.farm)
  const sales    = useFarmStore((s) => s.sales)
  const saleLots = useFarmStore((s) => s.saleLots)
  const { can }  = useAccess()

  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const lotName = (id: string) => saleLots.find((l) => l.id === id)?.identifier ?? 'Lote'

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sales
      .filter((s) => s.propertyId === farm?.id)
      .filter((s) => (showInactive ? true : s.active !== false))
      .filter((s) => !q || (s.buyer?.toLowerCase().includes(q) ?? false) || lotName(s.saleLotId).toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, farm, showInactive, search])

  const total = filtered.filter((s) => s.active !== false).reduce((sum, s) => sum + (s.totalValue ?? 0), 0)

  // Financeiro é exclusivo do produtor (escopo §6.2): a leitura também, não
  // apenas o lançamento.
  if (!can.finance) {
    return <AccessDenied title="Vendas" width="wide" />
  }

  return (
    <ConsultScreen
      title="Vendas"
      subtitle={`${filtered.length} venda${filtered.length !== 1 ? 's' : ''} · ${formatCurrency(total)}`}
      count={filtered.length}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Buscar por comprador ou lote..."
      showInactive={showInactive}
      onToggleInactive={() => setShowInactive((v) => !v)}
      onNew={can.finance ? () => navigate('/sales/new') : undefined}
      newLabel="Nova venda"
    >
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Tag size={28} />}
          title={search ? 'Nenhuma venda encontrada' : 'Nenhuma venda'}
          description={search ? 'Ajuste a busca.' : 'Registre a venda de um lote comercial.'}
          action={can.finance ? { label: 'Nova venda', onClick: () => navigate('/sales/new') } : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((s) => (
            <motion.button
              key={s.id}
              layout
              onClick={() => navigate(`/sales/${s.id}`)}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white text-left hover:border-gray-200 hover:shadow-sm transition-colors"
            >
              <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Tag size={18} className="text-gray-400" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-body font-medium text-gray-900 truncate">{s.buyer || lotName(s.saleLotId)}</p>
                <p className="text-caption text-gray-400 truncate">{lotName(s.saleLotId)} · {formatDate(s.date)}</p>
              </div>
              <span className="font-data text-caption text-gray-900 tabular-nums shrink-0">{formatCurrency(s.totalValue ?? 0)}</span>
              <ChevronRight size={16} className="text-gray-300 shrink-0" />
            </motion.button>
          ))}
        </div>
      )}
    </ConsultScreen>
  )
}
