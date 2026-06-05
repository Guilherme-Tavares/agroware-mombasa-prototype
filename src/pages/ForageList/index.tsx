import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sprout, ChevronRight } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'
import ConsultScreen from '@/components/consult/ConsultScreen.tsx'
import Badge from '@/components/ui/Badge.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

export default function ForageList() {
  const navigate  = useNavigate()
  const farm      = useFarmStore((s) => s.farm)
  const divisions = useFarmStore((s) => s.divisions)
  const plantings = useFarmStore((s) => s.foragePlantings)
  const { can }   = useAccess()

  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const divName = (did: string) => divisions.find((d) => d.id === did)?.name
  const farmDivisionIds = useMemo(
    () => new Set(divisions.filter((d) => !farm || d.farmId === farm.id).map((d) => d.id)),
    [divisions, farm],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return plantings
      .filter((p) => farmDivisionIds.has(p.divisionId))
      .filter((p) => (showInactive ? true : p.active !== false))
      .filter((p) => !q || p.type.toLowerCase().includes(q) || (divName(p.divisionId)?.toLowerCase().includes(q) ?? false))
      .sort((a, b) => (b.plantingDate ?? '').localeCompare(a.plantingDate ?? ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantings, farmDivisionIds, divisions, showInactive, search])

  return (
    <ConsultScreen
      title="Forragens"
      count={filtered.length}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Buscar por espécie ou divisão..."
      showInactive={showInactive}
      onToggleInactive={() => setShowInactive((v) => !v)}
      onNew={can.writeHusbandry ? () => navigate('/forages/new') : undefined}
      newLabel="Nova forragem"
    >
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Sprout size={28} />}
          title={search ? 'Nenhuma forragem encontrada' : 'Nenhuma forragem'}
          description={search ? 'Ajuste a busca ou inclua inativas.' : 'Registre as forragens plantadas nas divisões.'}
          action={can.writeHusbandry ? { label: 'Nova forragem', onClick: () => navigate('/forages/new') } : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((p) => {
            const inactive = p.active === false
            return (
              <motion.button
                key={p.id}
                layout
                onClick={() => navigate(`/forages/${p.id}`)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border bg-white text-left transition-colors',
                  inactive ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm',
                )}
              >
                <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <Sprout size={18} className="text-gray-400" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-medium text-gray-900 truncate">{p.type}</span>
                    {inactive && <Badge variant="neutral" size="sm">Substituída</Badge>}
                  </div>
                  <p className="text-caption text-gray-400 truncate">
                    {divName(p.divisionId) ?? 'Divisão'}{p.plantingDate ? ` · ${formatDate(p.plantingDate)}` : ''}
                  </p>
                </div>
                {!inactive && <Badge variant="ok" size="sm">Ativa</Badge>}
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </motion.button>
            )
          })}
        </div>
      )}
    </ConsultScreen>
  )
}
