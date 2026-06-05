import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Pill, ChevronRight } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { MEDICATION_TYPE_LABEL } from '@/utils/labels'
import { cn } from '@/utils/cn'
import ConsultScreen from '@/components/consult/ConsultScreen.tsx'
import Badge from '@/components/ui/Badge.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

export default function MedicationList() {
  const navigate    = useNavigate()
  const farm        = useFarmStore((s) => s.farm)
  const medications = useFarmStore((s) => s.medications)
  const { can }     = useAccess()

  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return medications
      .filter((m) => m.propertyId === farm?.id)
      .filter((m) => (showInactive ? true : m.active !== false))
      .filter((m) =>
        !q ||
        m.commercialName.toLowerCase().includes(q) ||
        (m.activeIngredient?.toLowerCase().includes(q) ?? false),
      )
      .sort((a, b) => a.commercialName.localeCompare(b.commercialName))
  }, [medications, farm, showInactive, search])

  return (
    <ConsultScreen
      title="Medicamentos"
      count={filtered.length}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Buscar por nome ou princípio ativo..."
      showInactive={showInactive}
      onToggleInactive={() => setShowInactive((v) => !v)}
      onNew={can.writeHusbandry ? () => navigate('/medications/new') : undefined}
      newLabel="Novo medicamento"
    >
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Pill size={28} />}
          title={search ? 'Nenhum medicamento encontrado' : 'Nenhum medicamento'}
          description={search ? 'Ajuste a busca ou inclua inativos.' : 'Cadastre o catálogo de medicamentos.'}
          action={can.writeHusbandry ? { label: 'Novo medicamento', onClick: () => navigate('/medications/new') } : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((m) => {
            const inactive = m.active === false
            return (
              <motion.button
                key={m.id}
                layout
                onClick={() => navigate(`/medications/${m.id}`)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border bg-white text-left transition-colors',
                  inactive ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm',
                )}
              >
                <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <Pill size={18} className="text-gray-400" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-medium text-gray-900 truncate">{m.commercialName}</span>
                    {inactive && <Badge variant="neutral" size="sm">Inativo</Badge>}
                  </div>
                  <p className="text-caption text-gray-400 truncate">{m.activeIngredient ?? 'Sem princípio ativo'}</p>
                </div>
                <Badge variant="neutral" size="sm">{MEDICATION_TYPE_LABEL[m.type] ?? m.type}</Badge>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </motion.button>
            )
          })}
        </div>
      )}
    </ConsultScreen>
  )
}
