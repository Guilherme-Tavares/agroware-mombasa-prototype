import { useMemo, useState } from 'react'
import { Scale } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { formatDate, formatWeight } from '@/utils/format'
import HistoryScreen from '@/components/consult/HistoryScreen.tsx'
import Badge from '@/components/ui/Badge.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

const METHOD_LABEL: Record<string, string> = {
  visual: 'Visual', balanca: 'Balança', nota_abate: 'Nota de abate', projecao: 'Projeção',
}

export default function WeighingHistory() {
  const farm      = useFarmStore((s) => s.farm)
  const weighings = useFarmStore((s) => s.weighings)
  const bovines   = useFarmStore((s) => s.bovines)
  const [search, setSearch] = useState('')

  const bovineName = (id: string) => bovines.find((b) => b.id === id)?.name ?? 'Bovino'
  const inProperty = useMemo(
    () => new Set(bovines.filter((b) => !b.propertyId || b.propertyId === farm?.id).map((b) => b.id)),
    [bovines, farm],
  )

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return weighings
      .filter((w) => inProperty.has(w.bovineId))
      .filter((w) => !q || bovineName(w.bovineId).toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weighings, inProperty, search])

  return (
    <HistoryScreen title="Pesagens" count={rows.length} search={search} onSearch={setSearch} searchPlaceholder="Buscar por bovino...">
      {rows.length === 0 ? (
        <EmptyState icon={<Scale size={28} />} title="Nenhuma pesagem" description="As pesagens registradas aparecem aqui." />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((w) => (
            <div key={w.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white">
              <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Scale size={16} className="text-gray-400" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-body font-medium text-gray-900 truncate">{bovineName(w.bovineId)}</p>
                <p className="text-caption text-gray-400">{formatDate(w.date)}</p>
              </div>
              <span className="font-data text-caption text-gray-900 tabular-nums">{formatWeight(w.weightKg)}</span>
              <Badge variant="neutral" size="sm">{METHOD_LABEL[w.method] ?? w.method}</Badge>
            </div>
          ))}
        </div>
      )}
    </HistoryScreen>
  )
}
