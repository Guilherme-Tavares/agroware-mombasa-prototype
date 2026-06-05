import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Layers, ChevronRight } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { formatArea } from '@/utils/format'
import { cn } from '@/utils/cn'
import ConsultScreen from '@/components/consult/ConsultScreen.tsx'
import Badge from '@/components/ui/Badge.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'
import { DIVISION_TYPE_LABEL } from '@/utils/labels'

export default function DivisionList() {
  const navigate  = useNavigate()
  const farm      = useFarmStore((s) => s.farm)
  const divisions = useFarmStore((s) => s.divisions)
  const { can }   = useAccess()

  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return divisions
      .filter((d) => !farm || d.farmId === farm.id)
      .filter((d) => (showInactive ? true : d.active !== false))
      .filter((d) =>
        !q ||
        d.name.toLowerCase().includes(q) ||
        (DIVISION_TYPE_LABEL[d.type] ?? d.type).toLowerCase().includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [divisions, farm, showInactive, search])

  return (
    <ConsultScreen
      title="Divisões"
      count={filtered.length}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Buscar por nome ou tipo..."
      showInactive={showInactive}
      onToggleInactive={() => setShowInactive((v) => !v)}
      onNew={can.writeHusbandry ? () => navigate('/divisions/new') : undefined}
      newLabel="Nova divisão"
    >
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Layers size={28} />}
          title={search ? 'Nenhuma divisão encontrada' : 'Nenhuma divisão'}
          description={search ? 'Ajuste a busca ou inclua inativas.' : 'Cadastre piquetes, currais e reservas.'}
          action={can.writeHusbandry ? { label: 'Nova divisão', onClick: () => navigate('/divisions/new') } : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((d) => {
            const inactive = d.active === false
            return (
              <motion.button
                key={d.id}
                layout
                onClick={() => navigate(`/divisions/${d.id}`)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border bg-white text-left transition-colors',
                  inactive ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm',
                )}
              >
                <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <Layers size={18} className="text-gray-400" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-medium text-gray-900 truncate">{d.name}</span>
                    {inactive && <Badge variant="neutral" size="sm">Inativa</Badge>}
                  </div>
                  <p className="text-caption text-gray-400 truncate">
                    {DIVISION_TYPE_LABEL[d.type] ?? d.type} · {formatArea(d.area)}
                  </p>
                </div>
                <Badge variant={d.status === 'active' ? 'ok' : 'neutral'} size="sm">
                  {d.status === 'active' ? 'Ativa' : 'Inativa'}
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
