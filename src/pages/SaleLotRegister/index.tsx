import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import { formatWeight, formatArrobas } from '@/utils/format'
import { cn } from '@/utils/cn'
import FormScreen, { FormSection } from '@/components/form/FormScreen.tsx'
import Input from '@/components/ui/Input.tsx'
import type { SaleLot } from '@/types/domain'

// 1 arroba ≈ 30 kg de peso vivo (carcaça 15 kg a 50% de rendimento).
const KG_PER_ARROBA = 30

export default function SaleLotRegister() {
  const navigate   = useNavigate()
  const farm       = useFarmStore((s) => s.farm)
  const bovines    = useFarmStore((s) => s.bovines)
  const herds      = useFarmStore((s) => s.herds)
  const saleLots   = useFarmStore((s) => s.saleLots)
  const saleLotBovines = useFarmStore((s) => s.saleLotBovines)
  const addSaleLot = useFarmStore((s) => s.addSaleLot)
  const toast      = useToast()
  const { can }    = useAccess()

  const [identifier, setIdentifier] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  // Bovinos já comprometidos em lotes disponíveis (não vendidos).
  const committed = useMemo(() => {
    const openLotIds = new Set(saleLots.filter((l) => l.status === 'disponivel').map((l) => l.id))
    return new Set(
      saleLotBovines.filter((lb) => lb.active !== false && openLotIds.has(lb.saleLotId)).map((lb) => lb.bovineId),
    )
  }, [saleLots, saleLotBovines])

  const available = useMemo(
    () => bovines.filter((b) => b.active !== false && (!b.propertyId || b.propertyId === farm?.id) && !committed.has(b.id)),
    [bovines, farm, committed],
  )

  const selectedBovines = available.filter((b) => selected.has(b.id))
  const totalWeight = selectedBovines.reduce((s, b) => s + b.currentWeight, 0)
  const avgWeight = selectedBovines.length ? totalWeight / selectedBovines.length : 0
  const totalArrobas = totalWeight / KG_PER_ARROBA

  const errorCount = (!identifier.trim() ? 1 : 0) + (selected.size === 0 ? 1 : 0)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSave() {
    setSubmitAttempted(true)
    if (errorCount > 0) return
    setSaving(true)
    setTimeout(() => {
      const now = new Date().toISOString()
      const lot: SaleLot = {
        id: crypto.randomUUID(),
        propertyId: farm?.id ?? '',
        identifier: identifier.trim(),
        status: 'disponivel',
        averageWeightKg: Number(avgWeight.toFixed(1)),
        totalArrobas: Number(totalArrobas.toFixed(1)),
        active: true,
        createdAt: now,
        updatedAt: now,
      }
      addSaleLot(lot, [...selected])
      toast.success(`Lote formado com ${selected.size} bovino${selected.size > 1 ? 's' : ''}`)
      setSaving(false)
      navigate(-1)
    }, 600)
  }

  return (
    <FormScreen
      title="Formar lote comercial"
      subtitle="Agrupa bovinos para uma venda"
      submitLabel="Formar lote"
      onSubmit={handleSave}
      saving={saving}
      errorCount={submitAttempted ? errorCount : 0}
      canWrite={can.finance}
      blockedMessage="Apenas o produtor acessa o financeiro da propriedade."
    >
      <FormSection title="Identificação">
        <Input
          label="Nome do lote"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          error={submitAttempted && !identifier.trim() ? 'Nome é obrigatório' : undefined}
          helperText="Ex: Lote Venda 02/2026"
        />
      </FormSection>

      <FormSection title={`Bovinos (${selected.size} selecionado${selected.size !== 1 ? 's' : ''})`}>
        {available.length === 0 ? (
          <p className="text-caption text-gray-400">Nenhum bovino disponível para venda.</p>
        ) : (
          <div className="max-h-72 overflow-y-auto -mx-1 px-1 flex flex-col gap-1.5">
            {available.map((b) => {
              const isSel = selected.has(b.id)
              const herd = b.herdId ? herds.find((h) => h.id === b.herdId)?.name : undefined
              return (
                <button
                  type="button"
                  key={b.id}
                  onClick={() => toggle(b.id)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors',
                    isSel ? 'border-primary bg-primary/5' : 'border-gray-100 hover:bg-gray-50',
                  )}
                >
                  <span className={cn(
                    'w-5 h-5 rounded-md flex items-center justify-center shrink-0 border',
                    isSel ? 'bg-primary border-primary text-white' : 'border-gray-300',
                  )}>
                    {isSel && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-body text-gray-900 truncate">
                      {b.name}{b.earTag ? ` · ${b.earTag}` : ''}
                    </span>
                    <span className="block text-caption text-gray-400 truncate">
                      {herd ?? 'Sem rebanho'} · {formatWeight(b.currentWeight)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
        {submitAttempted && selected.size === 0 && available.length > 0 && (
          <p className="text-caption text-alert">Selecione ao menos um bovino</p>
        )}
      </FormSection>

      {selected.size > 0 && (
        <FormSection title="Resumo">
          <div className="grid grid-cols-3 gap-3">
            <Summary label="Cabeças" value={String(selected.size)} />
            <Summary label="Peso médio" value={formatWeight(avgWeight)} />
            <Summary label="Arrobas" value={formatArrobas(totalArrobas)} />
          </div>
        </FormSection>
      )}
    </FormScreen>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center p-3 rounded-xl bg-gray-50">
      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-1">{label}</span>
      <span className="font-data text-h2 text-gray-900 tabular-nums leading-tight">{value}</span>
    </div>
  )
}
