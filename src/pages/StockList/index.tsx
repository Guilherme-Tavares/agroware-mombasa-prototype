import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PackagePlus, ChevronRight, AlertTriangle } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { cn } from '@/utils/cn'
import ConsultScreen from '@/components/consult/ConsultScreen.tsx'
import SegmentedTabs from '@/components/consult/SegmentedTabs.tsx'
import Badge from '@/components/ui/Badge.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

type StockTab = 'medicamentos' | 'alimentos'

// Linha normalizada — as duas fontes (estoque de medicamento / de alimento) têm
// a mesma forma de exibição; só mudam o rótulo e o destino ao clicar.
interface StockRow {
  id: string
  name: string
  quantity: number
  minimumStock: number
  unit: string
  onClick: () => void
}

/**
 * Tela unificada de Estoques: alterna entre estoque de medicamentos e de
 * alimentos por um SegmentedTabs. Substitui as duas telas separadas no menu.
 */
export default function StockList() {
  const navigate         = useNavigate()
  const farm             = useFarmStore((s) => s.farm)
  const medicationStocks = useFarmStore((s) => s.medicationStocks)
  const medications      = useFarmStore((s) => s.medications)
  const feedStocks       = useFarmStore((s) => s.feedStocks)
  const feeds            = useFarmStore((s) => s.feeds)
  const { can }          = useAccess()

  const [tab, setTab]                   = useState<StockTab>('medicamentos')
  const [search, setSearch]             = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const rows = useMemo<StockRow[]>(() => {
    const q = search.trim().toLowerCase()
    const inFarm = <T extends { propertyId: string; active?: boolean }>(s: T) =>
      s.propertyId === farm?.id && (showInactive ? true : s.active !== false)

    const list: StockRow[] = tab === 'medicamentos'
      ? medicationStocks.filter(inFarm).map((s) => ({
          id: s.id,
          name: medications.find((m) => m.id === s.medicationId)?.commercialName ?? 'Medicamento',
          quantity: s.quantity,
          minimumStock: s.minimumStock,
          unit: s.unit,
          onClick: () => navigate(`/medications/${s.medicationId}`),
        }))
      : feedStocks.filter(inFarm).map((s) => ({
          id: s.id,
          name: feeds.find((f) => f.id === s.feedId)?.name ?? 'Alimento',
          quantity: s.quantity,
          minimumStock: s.minimumStock,
          unit: s.unit,
          onClick: () => navigate(`/feeds/${s.feedId}`),
        }))

    return list
      .filter((r) => !q || r.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [tab, search, showInactive, farm, medicationStocks, medications, feedStocks, feeds, navigate])

  const isMed   = tab === 'medicamentos'
  const newPath = isMed ? '/medication-stock/new' : '/feed-stock/new'

  return (
    <ConsultScreen
      title="Estoques"
      count={rows.length}
      search={search}
      onSearch={setSearch}
      searchPlaceholder={isMed ? 'Buscar por medicamento...' : 'Buscar por alimento...'}
      showInactive={showInactive}
      onToggleInactive={() => setShowInactive((v) => !v)}
      onNew={can.writeHusbandry ? () => navigate(newPath) : undefined}
      newLabel="Entrada"
      tabs={
        <SegmentedTabs
          value={tab}
          onChange={(v) => { setTab(v as StockTab); setSearch('') }}
          options={[
            { value: 'medicamentos', label: 'Medicamentos' },
            { value: 'alimentos', label: 'Alimentos' },
          ]}
        />
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={<PackagePlus size={28} />}
          title={search ? 'Nenhum estoque encontrado' : 'Nenhum estoque'}
          description={
            search
              ? 'Ajuste a busca.'
              : `Registre entradas de estoque de ${isMed ? 'medicamentos' : 'alimentos'}.`
          }
          action={can.writeHusbandry ? { label: 'Registrar entrada', onClick: () => navigate(newPath) } : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => {
            const low = r.quantity <= r.minimumStock
            return (
              <motion.button
                key={r.id}
                layout
                onClick={r.onClick}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white text-left hover:border-gray-200 hover:shadow-sm transition-colors"
              >
                <span className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', low ? 'bg-alert-bg text-alert-dark' : 'bg-gray-100 text-gray-400')}>
                  {low ? <AlertTriangle size={18} /> : <PackagePlus size={18} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-medium text-gray-900 truncate">{r.name}</p>
                  <p className="text-caption text-gray-400 truncate">Mínimo: {r.minimumStock} {r.unit}</p>
                </div>
                {low && <Badge variant="alert" size="sm">Baixo</Badge>}
                <span className="font-data text-caption text-gray-900 tabular-nums shrink-0">{r.quantity} {r.unit}</span>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </motion.button>
            )
          })}
        </div>
      )}
    </ConsultScreen>
  )
}