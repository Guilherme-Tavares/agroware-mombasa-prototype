import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import { formatWeight, formatArrobas, formatCurrency } from '@/utils/format'
import FormScreen, { FormSection } from '@/components/form/FormScreen.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import type { SelectOption } from '@/components/ui/Select.tsx'
import type { Sale } from '@/types/domain'

const KG_PER_ARROBA = 30

interface Fields {
  saleLotId: string
  buyer: string
  date: string
  pricePerArroba: string
}

type FieldKey = keyof Fields

export default function SaleRegister() {
  const navigate   = useNavigate()
  const farm       = useFarmStore((s) => s.farm)
  const bovines    = useFarmStore((s) => s.bovines)
  const saleLots   = useFarmStore((s) => s.saleLots)
  const saleLotBovines = useFarmStore((s) => s.saleLotBovines)
  const registerSale = useFarmStore((s) => s.registerSale)
  const toast      = useToast()
  const { can }    = useAccess()

  const today = new Date().toISOString().split('T')[0]
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [fields, setFields] = useState<Fields>({
    saleLotId: '', buyer: '', date: today, pricePerArroba: '',
  })

  const availableLots = saleLots.filter((l) => l.propertyId === farm?.id && l.status === 'disponivel')

  // Bovinos do lote selecionado → pesos e arrobas recalculados ao vivo.
  const lotBovines = useMemo(() => {
    if (!fields.saleLotId) return []
    const ids = new Set(
      saleLotBovines.filter((lb) => lb.saleLotId === fields.saleLotId && lb.active !== false).map((lb) => lb.bovineId),
    )
    return bovines.filter((b) => ids.has(b.id))
  }, [fields.saleLotId, saleLotBovines, bovines])

  const totalWeight = lotBovines.reduce((s, b) => s + b.currentWeight, 0)
  const totalArrobas = totalWeight / KG_PER_ARROBA
  const totalValue = totalArrobas * (Number(fields.pricePerArroba) || 0)

  function validate(f: Fields): Partial<Record<FieldKey, string>> {
    const e: Partial<Record<FieldKey, string>> = {}
    if (!f.saleLotId) e.saleLotId = 'Lote é obrigatório'
    if (!f.date) e.date = 'Data é obrigatória'
    if (!f.pricePerArroba || Number(f.pricePerArroba) <= 0) e.pricePerArroba = 'Preço da arroba inválido'
    return e
  }

  const errors = validate(fields)
  const errorCount = Object.keys(errors).length
  const set = (k: FieldKey, v: string) => setFields((f) => ({ ...f, [k]: v }))
  const touch = (k: FieldKey) => setTouched((t) => ({ ...t, [k]: true }))
  const err = (k: FieldKey) => (touched[k] || submitAttempted ? errors[k] : undefined)

  const lotOptions: SelectOption[] = availableLots.map((l) => ({ value: l.id, label: l.identifier }))

  function handleSave() {
    setSubmitAttempted(true)
    if (errorCount > 0) return
    setSaving(true)
    setTimeout(() => {
      const now = new Date().toISOString()
      const sale: Sale = {
        id: crypto.randomUUID(),
        propertyId: farm?.id ?? '',
        saleLotId: fields.saleLotId,
        buyer: fields.buyer.trim() || undefined,
        date: fields.date,
        totalWeightKg: Number(totalWeight.toFixed(1)),
        pricePerArroba: Number(fields.pricePerArroba),
        totalValue: Number(totalValue.toFixed(2)),
        active: true,
        createdAt: now,
        updatedAt: now,
      }
      registerSale(sale)
      toast.success(`Venda registrada · ${formatCurrency(sale.totalValue ?? 0)}`)
      setSaving(false)
      navigate(-1)
    }, 600)
  }

  return (
    <FormScreen
      title="Registrar venda"
      subtitle="Vende um lote; os bovinos são inativados"
      submitLabel="Confirmar venda"
      onSubmit={handleSave}
      saving={saving}
      errorCount={submitAttempted ? errorCount : 0}
      canWrite={can.finance}
      blockedMessage="Apenas o produtor acessa o financeiro da propriedade."
    >
      <FormSection title="Lote">
        {availableLots.length === 0 ? (
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-dashed border-gray-200">
            <p className="text-caption text-gray-500">Nenhum lote disponível.</p>
            <button type="button" onClick={() => navigate('/sale-lots/new')} className="text-caption font-medium text-primary hover:underline shrink-0">
              Formar lote
            </button>
          </div>
        ) : (
          <Select
            label="Lote comercial"
            required
            value={fields.saleLotId}
            options={lotOptions}
            placeholder="Selecione..."
            onChange={(e) => set('saleLotId', e.target.value)}
            onBlur={() => touch('saleLotId')}
            error={err('saleLotId')}
          />
        )}
        {lotBovines.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Summary label="Cabeças" value={String(lotBovines.length)} />
            <Summary label="Peso total" value={formatWeight(totalWeight)} />
            <Summary label="Arrobas" value={formatArrobas(totalArrobas)} />
          </div>
        )}
      </FormSection>

      <FormSection title="Negociação">
        <Input
          label="Comprador"
          value={fields.buyer}
          onChange={(e) => set('buyer', e.target.value)}
          helperText="Opcional"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Preço da arroba (R$)"
            type="number"
            required
            min="0"
            step="0.01"
            value={fields.pricePerArroba}
            onChange={(e) => set('pricePerArroba', e.target.value)}
            onBlur={() => touch('pricePerArroba')}
            error={err('pricePerArroba')}
          />
          <Input
            label="Data"
            type="date"
            required
            max={today}
            value={fields.date}
            onChange={(e) => set('date', e.target.value)}
            onBlur={() => touch('date')}
            error={err('date')}
          />
        </div>

        {totalValue > 0 && (
          <div className="flex items-center justify-between rounded-xl px-4 py-3 bg-primary-bg">
            <span className="text-caption font-semibold text-gray-700">Valor total</span>
            <span className="font-data text-h2 text-primary tabular-nums">{formatCurrency(totalValue)}</span>
          </div>
        )}

        {fields.saleLotId && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-warning-bg text-warning-dark text-caption">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              Ao confirmar, os {lotBovines.length} bovino{lotBovines.length !== 1 ? 's' : ''} do lote serão
              inativados e seus pertencimentos encerrados.
            </span>
          </div>
        )}
      </FormSection>
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
