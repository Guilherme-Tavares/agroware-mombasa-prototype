import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Droplets, ChevronRight } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { calculateHPPercentage, getHPStatus } from '@/utils/hp-system'
import { cn } from '@/utils/cn'
import ConsultScreen from '@/components/consult/ConsultScreen.tsx'
import Badge from '@/components/ui/Badge.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

const HP_VARIANT: Record<'ok' | 'warning' | 'alert', 'ok' | 'warning' | 'alert'> = {
  ok: 'ok', warning: 'warning', alert: 'alert',
}

export default function TroughList() {
  const navigate    = useNavigate()
  const feedTroughs = useFarmStore((s) => s.feedTroughs)
  const divisions   = useFarmStore((s) => s.divisions)
  const { can }     = useAccess()

  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const divName = (did: string) => divisions.find((d) => d.id === did)?.name

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return feedTroughs
      .filter((t) => (showInactive ? true : t.active !== false))
      .filter((t) =>
        !q ||
        t.identifier.toLowerCase().includes(q) ||
        (divName(t.divisionId)?.toLowerCase().includes(q) ?? false),
      )
      .sort((a, b) => a.identifier.localeCompare(b.identifier))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedTroughs, divisions, showInactive, search])

  return (
    <ConsultScreen
      title="Cochos"
      count={filtered.length}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Buscar por identificação ou divisão..."
      showInactive={showInactive}
      onToggleInactive={() => setShowInactive((v) => !v)}
      onNew={can.writeHusbandry ? () => navigate('/troughs/new') : undefined}
      newLabel="Novo cocho"
    >
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Droplets size={28} />}
          title={search ? 'Nenhum cocho encontrado' : 'Nenhum cocho'}
          description={search ? 'Ajuste a busca ou inclua inativos.' : 'Cadastre cochos nas divisões.'}
          action={can.writeHusbandry ? { label: 'Novo cocho', onClick: () => navigate('/troughs/new') } : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((t) => {
            const inactive = t.active === false
            const pct = calculateHPPercentage(t.currentAmount, t.capacity)
            const status = getHPStatus(pct)
            return (
              <motion.button
                key={t.id}
                layout
                onClick={() => navigate(`/troughs/${t.id}`)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border bg-white text-left transition-colors',
                  inactive ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm',
                )}
              >
                <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <Droplets size={18} className="text-gray-400" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-medium text-gray-900 truncate">{t.identifier}</span>
                    {inactive && <Badge variant="neutral" size="sm">Inativo</Badge>}
                  </div>
                  <p className="text-caption text-gray-400 truncate">
                    {divName(t.divisionId) ?? 'Sem divisão'} · {t.currentAmount}/{t.capacity} kg
                  </p>
                </div>
                <Badge variant={HP_VARIANT[status]} size="sm">{Math.round(pct)}%</Badge>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </motion.button>
            )
          })}
        </div>
      )}
    </ConsultScreen>
  )
}
