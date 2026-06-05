import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Package, ChevronRight } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { cn } from '@/utils/cn'
import ConsultScreen from '@/components/consult/ConsultScreen.tsx'
import Badge from '@/components/ui/Badge.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

export default function SaleLotList() {
  const navigate = useNavigate()
  const farm     = useFarmStore((s) => s.farm)
  const saleLots = useFarmStore((s) => s.saleLots)
  const saleLotBovines = useFarmStore((s) => s.saleLotBovines)
  const { can }  = useAccess()

  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const countInLot = (lotId: string) =>
    saleLotBovines.filter((lb) => lb.saleLotId === lotId && lb.active !== false).length

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return saleLots
      .filter((l) => l.propertyId === farm?.id)
      .filter((l) => (showInactive ? true : l.active !== false))
      .filter((l) => !q || l.identifier.toLowerCase().includes(q))
      .sort((a, b) => a.identifier.localeCompare(b.identifier))
  }, [saleLots, farm, showInactive, search])

  return (
    <ConsultScreen
      title="Lotes comerciais"
      count={filtered.length}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Buscar por nome do lote..."
      showInactive={showInactive}
      onToggleInactive={() => setShowInactive((v) => !v)}
      onNew={can.finance ? () => navigate('/sale-lots/new') : undefined}
      newLabel="Formar lote"
    >
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package size={28} />}
          title={search ? 'Nenhum lote encontrado' : 'Nenhum lote comercial'}
          description={search ? 'Ajuste a busca ou inclua inativos.' : 'Forme lotes para vender bovinos.'}
          action={can.finance ? { label: 'Formar lote', onClick: () => navigate('/sale-lots/new') } : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((l) => {
            const inactive = l.active === false
            return (
              <motion.button
                key={l.id}
                layout
                onClick={() => navigate(`/sale-lots/${l.id}`)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border bg-white text-left transition-colors',
                  inactive ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm',
                )}
              >
                <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <Package size={18} className="text-gray-400" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-medium text-gray-900 truncate">{l.identifier}</span>
                    {inactive && <Badge variant="neutral" size="sm">Removido</Badge>}
                  </div>
                  <p className="text-caption text-gray-400 truncate">{countInLot(l.id)} cabeças</p>
                </div>
                <Badge variant={l.status === 'vendido' ? 'neutral' : 'ok'} size="sm">
                  {l.status === 'vendido' ? 'Vendido' : 'Disponível'}
                </Badge>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </motion.button>
            )
          })}
        </div>
      )}
    </ConsultScreen>
  )
}
