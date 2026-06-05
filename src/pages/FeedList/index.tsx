import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Wheat, ChevronRight } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { FEED_TYPE_LABEL } from '@/utils/labels'
import { cn } from '@/utils/cn'
import ConsultScreen from '@/components/consult/ConsultScreen.tsx'
import Badge from '@/components/ui/Badge.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

export default function FeedList() {
  const navigate = useNavigate()
  const farm     = useFarmStore((s) => s.farm)
  const feeds    = useFarmStore((s) => s.feeds)
  const { can }  = useAccess()

  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return feeds
      .filter((f) => !f.propertyId || f.propertyId === farm?.id)
      .filter((f) => (showInactive ? true : f.active !== false))
      .filter((f) => !q || f.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [feeds, farm, showInactive, search])

  return (
    <ConsultScreen
      title="Alimentos"
      count={filtered.length}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Buscar por nome..."
      showInactive={showInactive}
      onToggleInactive={() => setShowInactive((v) => !v)}
      onNew={can.writeHusbandry ? () => navigate('/feeds/new') : undefined}
      newLabel="Novo alimento"
    >
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Wheat size={28} />}
          title={search ? 'Nenhum alimento encontrado' : 'Nenhum alimento'}
          description={search ? 'Ajuste a busca ou inclua inativos.' : 'Cadastre o catálogo de alimentos.'}
          action={can.writeHusbandry ? { label: 'Novo alimento', onClick: () => navigate('/feeds/new') } : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((f) => {
            const inactive = f.active === false
            return (
              <motion.button
                key={f.id}
                layout
                onClick={() => navigate(`/feeds/${f.id}`)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border bg-white text-left transition-colors',
                  inactive ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm',
                )}
              >
                <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <Wheat size={18} className="text-gray-400" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-medium text-gray-900 truncate">{f.name}</span>
                    {inactive && <Badge variant="neutral" size="sm">Inativo</Badge>}
                  </div>
                  <p className="text-caption text-gray-400 truncate">
                    {f.proteinPercentage != null ? `${f.proteinPercentage}% PB` : 'Sem proteína informada'}
                  </p>
                </div>
                {f.type && <Badge variant="neutral" size="sm">{FEED_TYPE_LABEL[f.type] ?? f.type}</Badge>}
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </motion.button>
            )
          })}
        </div>
      )}
    </ConsultScreen>
  )
}
