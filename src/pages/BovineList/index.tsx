import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CircleSmall, ChevronRight } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { formatWeight } from '@/utils/format'
import { cn } from '@/utils/cn'
import ConsultScreen from '@/components/consult/ConsultScreen.tsx'
import Badge from '@/components/ui/Badge.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

export default function BovineList() {
  const navigate = useNavigate()
  const farm     = useFarmStore((s) => s.farm)
  const bovines  = useFarmStore((s) => s.bovines)
  const herds    = useFarmStore((s) => s.herds)
  const { can }  = useAccess()

  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return bovines
      .filter((b) => !b.propertyId || b.propertyId === farm?.id)
      .filter((b) => (showInactive ? true : b.active !== false))
      .filter((b) =>
        !q ||
        b.name.toLowerCase().includes(q) ||
        (b.earTag?.toLowerCase().includes(q) ?? false) ||
        b.breed.toLowerCase().includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [bovines, farm, showInactive, search])

  const herdName = (id?: string) => (id ? herds.find((h) => h.id === id)?.name : undefined)

  return (
    <ConsultScreen
      title="Bovinos"
      count={filtered.length}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Buscar por nome, brinco ou raça..."
      showInactive={showInactive}
      onToggleInactive={() => setShowInactive((v) => !v)}
      onNew={can.writeHusbandry ? () => navigate('/bovines/new') : undefined}
      newLabel="Novo bovino"
    >
      {filtered.length === 0 ? (
        <EmptyState
          icon={<CircleSmall size={28} />}
          title={search ? 'Nenhum bovino encontrado' : 'Nenhum bovino'}
          description={search ? 'Ajuste a busca ou inclua inativos.' : 'Cadastre o primeiro animal do rebanho.'}
          action={can.writeHusbandry ? { label: 'Novo bovino', onClick: () => navigate('/bovines/new') } : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((b) => {
            const inactive = b.active === false
            return (
              <motion.button
                key={b.id}
                layout
                onClick={() => navigate(`/bovines/${b.id}`)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border bg-white text-left transition-colors',
                  inactive ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm',
                )}
              >
                <span className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                  {b.photoBase64
                    ? <img src={b.photoBase64} alt="" className="w-full h-full object-cover" />
                    : <CircleSmall size={18} className="text-gray-300" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-medium text-gray-900 truncate">{b.name}</span>
                    {inactive && <Badge variant="neutral" size="sm">Inativo</Badge>}
                  </div>
                  <p className="text-caption text-gray-400 truncate">
                    {b.earTag ? `${b.earTag} · ` : ''}{b.breed}
                    {herdName(b.herdId) ? ` · ${herdName(b.herdId)}` : ''}
                  </p>
                </div>
                <span className="font-data text-caption text-gray-500 tabular-nums shrink-0">
                  {formatWeight(b.currentWeight)}
                </span>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </motion.button>
            )
          })}
        </div>
      )}
    </ConsultScreen>
  )
}
