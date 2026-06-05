import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarRange, ChevronRight } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { formatDate } from '@/utils/format'
import { SEASON_TYPE_LABEL } from '@/utils/labels'
import { cn } from '@/utils/cn'
import ConsultScreen from '@/components/consult/ConsultScreen.tsx'
import Badge from '@/components/ui/Badge.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

export default function SeasonList() {
  const navigate = useNavigate()
  const farm     = useFarmStore((s) => s.farm)
  const seasons  = useFarmStore((s) => s.seasons)
  const { can }  = useAccess()

  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return seasons
      .filter((s) => !s.propertyId || s.propertyId === farm?.id)
      .filter((s) => (showInactive ? true : s.active !== false))
      .filter((s) => !q || s.name.toLowerCase().includes(q) || (SEASON_TYPE_LABEL[s.type] ?? s.type).toLowerCase().includes(q))
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
  }, [seasons, farm, showInactive, search])

  return (
    <ConsultScreen
      title="Temporadas"
      count={filtered.length}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Buscar por nome ou tipo..."
      showInactive={showInactive}
      onToggleInactive={() => setShowInactive((v) => !v)}
      onNew={can.writeHusbandry ? () => navigate('/seasons/new') : undefined}
      newLabel="Nova temporada"
    >
      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarRange size={28} />}
          title={search ? 'Nenhuma temporada encontrada' : 'Nenhuma temporada'}
          description={search ? 'Ajuste a busca ou inclua inativas.' : 'Cadastre as temporadas de águas, seca e transição.'}
          action={can.writeHusbandry ? { label: 'Nova temporada', onClick: () => navigate('/seasons/new') } : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((s) => {
            const inactive = s.active === false
            return (
              <motion.button
                key={s.id}
                layout
                onClick={() => navigate(`/seasons/${s.id}`)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border bg-white text-left transition-colors',
                  inactive ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm',
                )}
              >
                <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <CalendarRange size={18} className="text-gray-400" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-medium text-gray-900 truncate">{s.name}</span>
                    {inactive && <Badge variant="neutral" size="sm">Inativa</Badge>}
                  </div>
                  <p className="text-caption text-gray-400 truncate">
                    {formatDate(s.startDate)} — {formatDate(s.endDate)}
                  </p>
                </div>
                <Badge variant="info" size="sm">{SEASON_TYPE_LABEL[s.type] ?? s.type}</Badge>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </motion.button>
            )
          })}
        </div>
      )}
    </ConsultScreen>
  )
}
