import { useMemo, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { formatDate } from '@/utils/format'
import HistoryScreen from '@/components/consult/HistoryScreen.tsx'
import Badge from '@/components/ui/Badge.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

export default function AllocationHistory() {
  const farm        = useFarmStore((s) => s.farm)
  const allocations = useFarmStore((s) => s.allocations)
  const herds       = useFarmStore((s) => s.herds)
  const divisions   = useFarmStore((s) => s.divisions)
  const [search, setSearch] = useState('')

  const herdName = (id: string) => herds.find((h) => h.id === id)?.name ?? 'Rebanho'
  const divName = (id: string) => divisions.find((d) => d.id === id)?.name ?? 'Divisão'
  const inProperty = useMemo(
    () => new Set(divisions.filter((d) => !farm || d.farmId === farm.id).map((d) => d.id)),
    [divisions, farm],
  )

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allocations
      .filter((a) => inProperty.has(a.divisionId))
      .filter((a) => !q || herdName(a.herdId).toLowerCase().includes(q) || divName(a.divisionId).toLowerCase().includes(q))
      .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocations, inProperty, search])

  return (
    <HistoryScreen title="Histórico de lotação" count={rows.length} search={search} onSearch={setSearch} searchPlaceholder="Buscar por rebanho ou divisão...">
      {rows.length === 0 ? (
        <EmptyState icon={<ArrowLeftRight size={28} />} title="Nenhuma lotação" description="As lotações registradas aparecem aqui." />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white">
              <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <ArrowLeftRight size={16} className="text-gray-400" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-body font-medium text-gray-900 truncate">{herdName(a.herdId)} → {divName(a.divisionId)}</p>
                <p className="text-caption text-gray-400 truncate">
                  {formatDate(a.startDate)}{a.endDate ? ` — ${formatDate(a.endDate)}` : ''}
                  {a.headCount != null ? ` · ${a.headCount} cab.` : ''}
                </p>
              </div>
              {a.active && <Badge variant="ok" size="sm">Atual</Badge>}
            </div>
          ))}
        </div>
      )}
    </HistoryScreen>
  )
}
