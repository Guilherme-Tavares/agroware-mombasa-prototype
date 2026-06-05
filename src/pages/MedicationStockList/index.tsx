import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PackagePlus, ChevronRight, AlertTriangle } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { cn } from '@/utils/cn'
import ConsultScreen from '@/components/consult/ConsultScreen.tsx'
import Badge from '@/components/ui/Badge.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

export default function MedicationStockList() {
  const navigate    = useNavigate()
  const farm        = useFarmStore((s) => s.farm)
  const stocks      = useFarmStore((s) => s.medicationStocks)
  const medications = useFarmStore((s) => s.medications)
  const { can }     = useAccess()

  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const medName = (id: string) => medications.find((m) => m.id === id)?.commercialName ?? 'Medicamento'

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return stocks
      .filter((s) => s.propertyId === farm?.id)
      .filter((s) => (showInactive ? true : s.active !== false))
      .filter((s) => !q || medName(s.medicationId).toLowerCase().includes(q))
      .sort((a, b) => medName(a.medicationId).localeCompare(medName(b.medicationId)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stocks, farm, showInactive, search])

  return (
    <ConsultScreen
      title="Estoque de medicamentos"
      count={filtered.length}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Buscar por medicamento..."
      showInactive={showInactive}
      onToggleInactive={() => setShowInactive((v) => !v)}
      onNew={can.writeHusbandry ? () => navigate('/medication-stock/new') : undefined}
      newLabel="Entrada"
    >
      {filtered.length === 0 ? (
        <EmptyState
          icon={<PackagePlus size={28} />}
          title={search ? 'Nenhum estoque encontrado' : 'Nenhum estoque'}
          description={search ? 'Ajuste a busca.' : 'Registre entradas de estoque de medicamentos.'}
          action={can.writeHusbandry ? { label: 'Registrar entrada', onClick: () => navigate('/medication-stock/new') } : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((s) => {
            const low = s.quantity <= s.minimumStock
            return (
              <motion.button
                key={s.id}
                layout
                onClick={() => navigate(`/medications/${s.medicationId}`)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border bg-white text-left transition-colors',
                  'border-gray-100 hover:border-gray-200 hover:shadow-sm',
                )}
              >
                <span className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', low ? 'bg-alert-bg text-alert-dark' : 'bg-gray-100 text-gray-400')}>
                  {low ? <AlertTriangle size={18} /> : <PackagePlus size={18} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-medium text-gray-900 truncate">{medName(s.medicationId)}</p>
                  <p className="text-caption text-gray-400 truncate">Mínimo: {s.minimumStock} {s.unit}</p>
                </div>
                {low && <Badge variant="alert" size="sm">Baixo</Badge>}
                <span className="font-data text-caption text-gray-900 tabular-nums shrink-0">{s.quantity} {s.unit}</span>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </motion.button>
            )
          })}
        </div>
      )}
    </ConsultScreen>
  )
}
