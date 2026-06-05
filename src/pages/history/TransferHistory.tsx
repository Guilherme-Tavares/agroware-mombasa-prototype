import { useMemo, useState } from 'react'
import { Truck } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { formatDate } from '@/utils/format'
import HistoryScreen from '@/components/consult/HistoryScreen.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

export default function TransferHistory() {
  const activePropertyId = useFarmStore((s) => s.activePropertyId)
  const transfers = useFarmStore((s) => s.bovineTransfers)
  const bovines   = useFarmStore((s) => s.bovines)
  const farms     = useFarmStore((s) => s.farms)
  const [search, setSearch] = useState('')

  const bovineName = (id: string) => bovines.find((b) => b.id === id)?.name ?? 'Bovino'
  const farmName = (id: string) => farms.find((f) => f.id === id)?.name ?? 'Propriedade'

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return transfers
      .filter((t) => t.originPropertyId === activePropertyId || t.destinationPropertyId === activePropertyId)
      .filter((t) => !q || bovineName(t.bovineId).toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transfers, activePropertyId, search])

  return (
    <HistoryScreen title="Transferências de bovino" count={rows.length} search={search} onSearch={setSearch} searchPlaceholder="Buscar por bovino...">
      {rows.length === 0 ? (
        <EmptyState icon={<Truck size={28} />} title="Nenhuma transferência" description="As transferências entre propriedades aparecem aqui." />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white">
              <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Truck size={16} className="text-gray-400" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-body font-medium text-gray-900 truncate">{bovineName(t.bovineId)}</p>
                <p className="text-caption text-gray-400 truncate">
                  {farmName(t.originPropertyId)} → {farmName(t.destinationPropertyId)} · {formatDate(t.date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </HistoryScreen>
  )
}
