import { useMemo, useState } from 'react'
import { Syringe } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { formatDateTime } from '@/utils/format'
import HistoryScreen from '@/components/consult/HistoryScreen.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

export default function ApplicationHistory() {
  const farm         = useFarmStore((s) => s.farm)
  const applications = useFarmStore((s) => s.medicationApplications)
  const bovines      = useFarmStore((s) => s.bovines)
  const medications  = useFarmStore((s) => s.medications)
  const [search, setSearch] = useState('')

  const bovineName = (id: string) => bovines.find((b) => b.id === id)?.name ?? 'Bovino'
  const medName = (id: string) => medications.find((m) => m.id === id)?.commercialName ?? 'Medicamento'
  const inProperty = useMemo(
    () => new Set(bovines.filter((b) => !b.propertyId || b.propertyId === farm?.id).map((b) => b.id)),
    [bovines, farm],
  )

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return applications
      .filter((a) => inProperty.has(a.bovineId))
      .filter((a) => !q || bovineName(a.bovineId).toLowerCase().includes(q) || medName(a.medicationId).toLowerCase().includes(q))
      .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applications, inProperty, search])

  return (
    <HistoryScreen title="Aplicações de medicamento" count={rows.length} search={search} onSearch={setSearch} searchPlaceholder="Buscar por bovino ou medicamento...">
      {rows.length === 0 ? (
        <EmptyState icon={<Syringe size={28} />} title="Nenhuma aplicação" description="As aplicações registradas aparecem aqui." />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white">
              <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Syringe size={16} className="text-gray-400" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-body font-medium text-gray-900 truncate">{bovineName(a.bovineId)}</p>
                <p className="text-caption text-gray-400 truncate">{medName(a.medicationId)} · {formatDateTime(a.appliedAt)}</p>
              </div>
              <span className="font-data text-caption text-gray-900 tabular-nums shrink-0">{a.dose} {a.doseUnit}</span>
            </div>
          ))}
        </div>
      )}
    </HistoryScreen>
  )
}
