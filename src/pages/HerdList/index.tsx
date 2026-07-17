import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CirclePile, ChevronRight } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { cn } from '@/utils/cn'
import ConsultScreen from '@/components/consult/ConsultScreen.tsx'
import Badge from '@/components/ui/Badge.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'
import { HERD_PURPOSE_LABEL as PURPOSE_LABEL } from '@/utils/labels'

export default function HerdList() {
  const navigate = useNavigate()
  const farm     = useFarmStore((s) => s.farm)
  const herds    = useFarmStore((s) => s.herds)
  const bovines  = useFarmStore((s) => s.bovines)
  const { can }  = useAccess()

  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const countByHerd = useMemo(() => {
    const map = new Map<string, number>()
    bovines.filter((b) => b.active !== false).forEach((b) => {
      if (b.herdId) map.set(b.herdId, (map.get(b.herdId) ?? 0) + 1)
    })
    return map
  }, [bovines])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return herds
      .filter((h) => !farm || h.farmId === farm.id)
      .filter((h) => (showInactive ? true : h.active !== false))
      .filter((h) => !q || h.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [herds, farm, showInactive, search])

  return (
    <ConsultScreen
      title="Rebanhos"
      count={filtered.length}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Buscar por nome..."
      showInactive={showInactive}
      onToggleInactive={() => setShowInactive((v) => !v)}
      onNew={can.writeHusbandry ? () => navigate('/herds/new') : undefined}
      newLabel="Novo rebanho"
    >
      {filtered.length === 0 ? (
        <EmptyState
          icon={<CirclePile size={28} />}
          title={search ? 'Nenhum rebanho encontrado' : 'Nenhum rebanho'}
          description={search ? 'Ajuste a busca ou inclua inativos.' : 'Crie lotes para agrupar bovinos.'}
          action={can.writeHusbandry ? { label: 'Novo rebanho', onClick: () => navigate('/herds/new') } : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((h) => {
            const inactive = h.active === false
            return (
              <motion.button
                key={h.id}
                layout
                onClick={() => navigate(`/herds/${h.id}`)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border bg-white text-left transition-colors',
                  inactive ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm',
                )}
              >
                <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <CirclePile size={18} className="text-gray-400" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-medium text-gray-900 truncate">{h.name}</span>
                    {inactive && <Badge variant="neutral" size="sm">Inativo</Badge>}
                  </div>
                  <p className="text-caption text-gray-400 truncate">
                    {countByHerd.get(h.id) ?? 0} cabeças
                  </p>
                </div>
                <Badge variant={h.purpose === 'engorda' ? 'warning' : 'info'} size="sm">
                  {PURPOSE_LABEL[h.purpose] ?? h.purpose}
                </Badge>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </motion.button>
            )
          })}
        </div>
      )}
    </ConsultScreen>
  )
}
