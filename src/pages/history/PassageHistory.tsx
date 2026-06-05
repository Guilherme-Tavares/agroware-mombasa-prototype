import { useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { formatGMD } from '@/utils/format'
import HistoryScreen from '@/components/consult/HistoryScreen.tsx'
import Badge from '@/components/ui/Badge.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

export default function PassageHistory() {
  const farm     = useFarmStore((s) => s.farm)
  const passages = useFarmStore((s) => s.seasonPassages)
  const herds    = useFarmStore((s) => s.herds)
  const seasons  = useFarmStore((s) => s.seasons)
  const [search, setSearch] = useState('')

  const herdName = (id: string) => herds.find((h) => h.id === id)?.name ?? 'Rebanho'
  const seasonName = (id: string) => seasons.find((s) => s.id === id)?.name ?? 'Temporada'
  const inProperty = useMemo(
    () => new Set(herds.filter((h) => !farm || h.farmId === farm.id).map((h) => h.id)),
    [herds, farm],
  )

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return passages
      .filter((p) => inProperty.has(p.herdId))
      .filter((p) => !q || herdName(p.herdId).toLowerCase().includes(q) || seasonName(p.seasonId).toLowerCase().includes(q))
      .sort((a, b) => b.gmd - a.gmd)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passages, inProperty, search])

  return (
    <HistoryScreen title="Passagens por temporada (GMD)" count={rows.length} search={search} onSearch={setSearch} searchPlaceholder="Buscar por rebanho ou temporada...">
      {rows.length === 0 ? (
        <EmptyState icon={<TrendingUp size={28} />} title="Nenhuma passagem" description="O desempenho por temporada aparece aqui." />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white">
              <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <TrendingUp size={16} className="text-gray-400" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-body font-medium text-gray-900 truncate">{herdName(p.herdId)}</p>
                <p className="text-caption text-gray-400 truncate">{seasonName(p.seasonId)} · {p.initialWeight}→{p.finalWeight} kg · {p.days} dias</p>
              </div>
              <Badge variant="ok" size="sm">{formatGMD(p.gmd)}</Badge>
            </div>
          ))}
        </div>
      )}
    </HistoryScreen>
  )
}
