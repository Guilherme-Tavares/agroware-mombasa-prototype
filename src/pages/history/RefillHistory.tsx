import { useMemo, useState } from 'react'
import { Droplets } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { formatDate } from '@/utils/format'
import HistoryScreen from '@/components/consult/HistoryScreen.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

interface Row {
  key: string
  troughId: string
  date: string
  amount: number
  feedId: string
}

export default function RefillHistory() {
  const feedTroughs = useFarmStore((s) => s.feedTroughs)
  const feeds       = useFarmStore((s) => s.feeds)
  const [search, setSearch] = useState('')

  const troughLabel = (id: string) => feedTroughs.find((t) => t.id === id)?.identifier ?? 'Cocho'
  const feedName = (id: string) => feeds.find((f) => f.id === id)?.name ?? ''

  const rows = useMemo<Row[]>(() => {
    const all: Row[] = []
    feedTroughs.forEach((t) => {
      t.refillHistory.forEach((r, i) => {
        all.push({ key: `${t.id}-${i}-${r.date}`, troughId: t.id, date: r.date, amount: r.amount, feedId: r.feedId })
      })
    })
    const q = search.trim().toLowerCase()
    return all
      .filter((r) => !q || troughLabel(r.troughId).toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedTroughs, search])

  return (
    <HistoryScreen title="Abastecimentos de cocho" count={rows.length} search={search} onSearch={setSearch} searchPlaceholder="Buscar por cocho...">
      {rows.length === 0 ? (
        <EmptyState icon={<Droplets size={28} />} title="Nenhum abastecimento" description="Os abastecimentos registrados aparecem aqui." />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white">
              <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Droplets size={16} className="text-gray-400" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-body font-medium text-gray-900 truncate">{troughLabel(r.troughId)}</p>
                <p className="text-caption text-gray-400 truncate">{feedName(r.feedId)} · {formatDate(r.date)}</p>
              </div>
              <span className="font-data text-caption text-gray-900 tabular-nums shrink-0">{r.amount} kg</span>
            </div>
          ))}
        </div>
      )}
    </HistoryScreen>
  )
}
