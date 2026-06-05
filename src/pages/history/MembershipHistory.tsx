import { useMemo, useState } from 'react'
import { Link2 } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { formatDate, formatWeight } from '@/utils/format'
import HistoryScreen from '@/components/consult/HistoryScreen.tsx'
import Badge from '@/components/ui/Badge.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

export default function MembershipHistory() {
  const farm        = useFarmStore((s) => s.farm)
  const memberships = useFarmStore((s) => s.memberships)
  const bovines     = useFarmStore((s) => s.bovines)
  const herds       = useFarmStore((s) => s.herds)
  const [search, setSearch] = useState('')

  const bovineName = (id: string) => bovines.find((b) => b.id === id)?.name ?? 'Bovino'
  const herdName = (id: string) => herds.find((h) => h.id === id)?.name ?? 'Rebanho'
  const inProperty = useMemo(
    () => new Set(bovines.filter((b) => !b.propertyId || b.propertyId === farm?.id).map((b) => b.id)),
    [bovines, farm],
  )

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return memberships
      .filter((m) => inProperty.has(m.bovineId))
      .filter((m) => !q || bovineName(m.bovineId).toLowerCase().includes(q) || herdName(m.herdId).toLowerCase().includes(q))
      .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberships, inProperty, search])

  return (
    <HistoryScreen title="Histórico de pertencimento" count={rows.length} search={search} onSearch={setSearch} searchPlaceholder="Buscar por bovino ou rebanho...">
      {rows.length === 0 ? (
        <EmptyState icon={<Link2 size={28} />} title="Nenhum pertencimento" description="Os vínculos de bovinos a rebanhos aparecem aqui." />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white">
              <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Link2 size={16} className="text-gray-400" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-body font-medium text-gray-900 truncate">{bovineName(m.bovineId)} · {herdName(m.herdId)}</p>
                <p className="text-caption text-gray-400 truncate">
                  {formatDate(m.startDate)}{m.endDate ? ` — ${formatDate(m.endDate)}` : ''}
                  {m.entryWeightKg != null ? ` · entrada ${formatWeight(m.entryWeightKg)}` : ''}
                </p>
              </div>
              {!m.endDate && <Badge variant="ok" size="sm">Atual</Badge>}
            </div>
          ))}
        </div>
      )}
    </HistoryScreen>
  )
}
