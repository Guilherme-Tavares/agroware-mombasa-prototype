import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Droplets } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import { calculateHPPercentage, getHPStatus, calculateRemainingDays } from '@/utils/hp-system'
import FormScreen, { FormSection } from '@/components/form/FormScreen.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import type { SelectOption } from '@/components/ui/Select.tsx'

interface Fields {
  troughId: string
  feedId: string
  newAmount: string
  consumptionRate: string
}

type FieldKey = keyof Fields

const HP_LABEL: Record<'ok' | 'warning' | 'alert', string> = {
  ok: 'Adequado', warning: 'Atenção', alert: 'Crítico',
}

export default function SupplyRegister() {
  const navigate    = useNavigate()
  const feedTroughs = useFarmStore((s) => s.feedTroughs)
  const feeds       = useFarmStore((s) => s.feeds)
  const divisions   = useFarmStore((s) => s.divisions)
  const feedStocks  = useFarmStore((s) => s.feedStocks)
  const farm        = useFarmStore((s) => s.farm)
  const refill      = useFarmStore((s) => s.refillFeedTrough)
  const toast       = useToast()
  const { can }     = useAccess()

  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [fields, setFields] = useState<Fields>({
    troughId: '', feedId: '', newAmount: '', consumptionRate: '',
  })

  const trough = feedTroughs.find((t) => t.id === fields.troughId)

  function validate(f: Fields): Partial<Record<FieldKey, string>> {
    const e: Partial<Record<FieldKey, string>> = {}
    if (!f.troughId) e.troughId = 'Cocho é obrigatório'
    if (!f.feedId)   e.feedId = 'Alimento é obrigatório'
    if (!f.newAmount || Number(f.newAmount) <= 0) e.newAmount = 'Quantidade inválida'
    else if (trough && Number(f.newAmount) > trough.capacity) e.newAmount = `Acima da capacidade (${trough.capacity} kg)`
    if (f.consumptionRate && Number(f.consumptionRate) < 0) e.consumptionRate = 'Não pode ser negativo'
    return e
  }

  const errors = validate(fields)
  const errorCount = Object.keys(errors).length
  const set = (k: FieldKey, v: string) => setFields((f) => ({ ...f, [k]: v }))
  const touch = (k: FieldKey) => setTouched((t) => ({ ...t, [k]: true }))
  const err = (k: FieldKey) => (touched[k] || submitAttempted ? errors[k] : undefined)

  function onTroughChange(id: string) {
    const t = feedTroughs.find((x) => x.id === id)
    setFields((f) => ({
      ...f,
      troughId: id,
      newAmount: t ? String(t.capacity) : '',
      feedId: t?.currentFeedId ?? f.feedId,
      consumptionRate: t ? String(t.consumptionRate) : '',
    }))
  }

  const troughOptions: SelectOption[] = feedTroughs.map((t) => {
    const div = divisions.find((d) => d.id === t.divisionId)
    return { value: t.id, label: `${t.identifier}${div ? ` · ${div.name}` : ''}` }
  })
  const feedOptions: SelectOption[] = feeds
    .filter((f) => !f.propertyId || f.propertyId === farm?.id)
    .map((f) => ({ value: f.id, label: f.name }))

  // Prévia do HP e do débito de estoque.
  const newAmount = Number(fields.newAmount) || 0
  const rate = Number(fields.consumptionRate) || 0
  const delta = trough ? Math.max(0, newAmount - trough.currentAmount) : 0
  const previewPct = trough ? calculateHPPercentage(newAmount, trough.capacity) : 0
  const previewStatus = getHPStatus(previewPct)
  const remainingDays = rate > 0 ? calculateRemainingDays(newAmount, rate) : null
  const stock = fields.feedId ? feedStocks.find((s) => s.feedId === fields.feedId && s.propertyId === farm?.id) : undefined

  function handleSave() {
    setSubmitAttempted(true)
    if (errorCount > 0) return
    setSaving(true)
    setTimeout(() => {
      refill(
        fields.troughId,
        {
          date: new Date().toISOString().split('T')[0],
          amount: newAmount,
          feedId: fields.feedId,
          consumptionRate: rate || undefined,
        },
        newAmount,
      )
      toast.success('Cocho abastecido · estoque debitado')
      setSaving(false)
      navigate(-1)
    }, 600)
  }

  return (
    <FormScreen
      title="Abastecer cocho"
      subtitle="Reabastece o cocho, renova a autonomia e debita o estoque"
      submitLabel="Abastecer"
      onSubmit={handleSave}
      saving={saving}
      errorCount={submitAttempted ? errorCount : 0}
      canWrite={can.writeHusbandry}
      blockedMessage="Apenas produtor ou colaborador podem abastecer cochos."
    >
      <FormSection title="Cocho">
        {troughOptions.length === 0 ? (
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-dashed border-gray-200">
            <p className="text-caption text-gray-500">Nenhum cocho cadastrado.</p>
            <button type="button" onClick={() => navigate('/troughs/new')} className="text-caption font-medium text-primary hover:underline shrink-0">
              Cadastrar cocho
            </button>
          </div>
        ) : (
          <Select
            label="Cocho"
            required
            value={fields.troughId}
            options={troughOptions}
            placeholder="Selecione..."
            onChange={(e) => onTroughChange(e.target.value)}
            onBlur={() => touch('troughId')}
            error={err('troughId')}
          />
        )}
        {trough && (
          <p className="text-caption text-gray-400 -mt-1">
            Saldo atual: <span className="font-data tabular-nums">{trough.currentAmount} / {trough.capacity} kg</span>
          </p>
        )}
      </FormSection>

      <FormSection title="Abastecimento">
        <Select
          label="Alimento"
          required
          value={fields.feedId}
          options={feedOptions}
          placeholder="Selecione..."
          onChange={(e) => set('feedId', e.target.value)}
          onBlur={() => touch('feedId')}
          error={err('feedId')}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Encher até (kg)"
            type="number"
            required
            min="0"
            step="1"
            value={fields.newAmount}
            onChange={(e) => set('newAmount', e.target.value)}
            onBlur={() => touch('newAmount')}
            error={err('newAmount')}
          />
          <Input
            label="Consumo (kg/dia)"
            type="number"
            min="0"
            step="0.1"
            value={fields.consumptionRate}
            onChange={(e) => set('consumptionRate', e.target.value)}
            onBlur={() => touch('consumptionRate')}
            error={err('consumptionRate')}
            helperText="Alimenta a autonomia do cocho"
          />
        </div>

        {trough && newAmount > 0 && (
          <div className="flex flex-col gap-2 px-3 py-3 rounded-xl bg-primary-bg">
            <div className="flex items-center gap-2 text-primary">
              <Droplets size={15} />
              <span className="text-caption">
                HP após abastecer: <strong className="font-data tabular-nums">{Math.round(previewPct)}%</strong> · {HP_LABEL[previewStatus]}
                {remainingDays != null && <> · ~{remainingDays} dias</>}
              </span>
            </div>
            <p className="text-caption text-gray-500">
              Adiciona {delta} kg{stock ? <> · debita do estoque (saldo {stock.quantity} {stock.unit})</> : ''}
            </p>
          </div>
        )}
      </FormSection>
    </FormScreen>
  )
}
