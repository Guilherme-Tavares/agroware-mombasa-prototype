import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPinned, ChevronRight, Crown } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { formatArea } from '@/utils/format'
import { cn } from '@/utils/cn'
import ConsultScreen from '@/components/consult/ConsultScreen.tsx'
import Badge from '@/components/ui/Badge.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

export default function PropertyList() {
  const navigate = useNavigate()
  const farms    = useFarmStore((s) => s.farms)
  const activePropertyId = useFarmStore((s) => s.activePropertyId)
  const currentUserId    = useFarmStore((s) => s.currentUserId)

  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return farms
      .filter((f) => (showInactive ? true : f.active !== false))
      .filter((f) => !q || f.name.toLowerCase().includes(q) || f.city.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [farms, showInactive, search])

  return (
    <ConsultScreen
      title="Propriedades"
      count={filtered.length}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Buscar por nome ou município..."
      showInactive={showInactive}
      onToggleInactive={() => setShowInactive((v) => !v)}
      onNew={() => navigate('/properties/new')}
      newLabel="Nova propriedade"
    >
      {filtered.length === 0 ? (
        <EmptyState
          icon={<MapPinned size={28} />}
          title={search ? 'Nenhuma propriedade encontrada' : 'Nenhuma propriedade'}
          description={search ? 'Ajuste a busca.' : 'Crie a sua primeira propriedade.'}
          action={{ label: 'Nova propriedade', onClick: () => navigate('/properties/new') }}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((f) => {
            const isActive = f.id === activePropertyId
            const isOwner = f.ownerId === currentUserId
            return (
              <motion.button
                key={f.id}
                layout
                onClick={() => navigate(`/properties/${f.id}`)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border bg-white text-left transition-colors',
                  isActive ? 'border-primary/40 bg-primary/5' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm',
                )}
              >
                <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <MapPinned size={18} className="text-gray-400" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-medium text-gray-900 truncate flex items-center gap-1.5">
                    {f.name}
                    {isOwner && <Crown size={13} className="text-warning" aria-label="Você é o dono" />}
                  </p>
                  <p className="text-caption text-gray-400 truncate">{f.city}, {f.state} · {formatArea(f.totalArea)}</p>
                </div>
                {isActive && <Badge variant="ok" size="sm">Ativa</Badge>}
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </motion.button>
            )
          })}
        </div>
      )}
    </ConsultScreen>
  )
}
