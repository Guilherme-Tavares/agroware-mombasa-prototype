import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Stethoscope, ChevronRight } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { formatDate } from '@/utils/format'
import { SANITARY_STATUS_LABEL } from '@/utils/labels'
import { cn } from '@/utils/cn'
import ConsultScreen from '@/components/consult/ConsultScreen.tsx'
import Badge from '@/components/ui/Badge.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

const STATUS_VARIANT: Record<string, 'warning' | 'ok' | 'neutral'> = {
  pendente: 'warning', executado: 'ok', cancelado: 'neutral',
}

export default function SanitaryEventList() {
  const navigate = useNavigate()
  const farm     = useFarmStore((s) => s.farm)
  const events   = useFarmStore((s) => s.sanitaryEvents)
  const herds    = useFarmStore((s) => s.herds)
  const bovines  = useFarmStore((s) => s.bovines)
  const { can }  = useAccess()

  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const target = (e: { herdId?: string; bovineId?: string }) =>
    e.herdId ? herds.find((h) => h.id === e.herdId)?.name
    : e.bovineId ? bovines.find((b) => b.id === e.bovineId)?.name
    : 'Toda a propriedade'

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return events
      .filter((e) => e.propertyId === farm?.id)
      .filter((e) => (showInactive ? true : e.active !== false))
      .filter((e) => !q || e.type.toLowerCase().includes(q))
      .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
  }, [events, farm, showInactive, search])

  return (
    <ConsultScreen
      title="Calendário sanitário"
      count={filtered.length}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Buscar por tipo de evento..."
      showInactive={showInactive}
      onToggleInactive={() => setShowInactive((v) => !v)}
      onNew={can.writeHusbandry ? () => navigate('/sanitary-events/new') : undefined}
      newLabel="Novo evento"
    >
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Stethoscope size={28} />}
          title={search ? 'Nenhum evento encontrado' : 'Nenhum evento'}
          description={search ? 'Ajuste a busca ou inclua inativos.' : 'Agende eventos no calendário sanitário.'}
          action={can.writeHusbandry ? { label: 'Novo evento', onClick: () => navigate('/sanitary-events/new') } : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((e) => {
            const inactive = e.active === false
            return (
              <motion.button
                key={e.id}
                layout
                onClick={() => navigate(`/sanitary-events/${e.id}`)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border bg-white text-left transition-colors',
                  inactive ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm',
                )}
              >
                <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <Stethoscope size={18} className="text-gray-400" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-medium text-gray-900 truncate">{e.type}</p>
                  <p className="text-caption text-gray-400 truncate">{formatDate(e.scheduledDate)} · {target(e)}</p>
                </div>
                <Badge variant={STATUS_VARIANT[e.status] ?? 'neutral'} size="sm">{SANITARY_STATUS_LABEL[e.status] ?? e.status}</Badge>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </motion.button>
            )
          })}
        </div>
      )}
    </ConsultScreen>
  )
}
