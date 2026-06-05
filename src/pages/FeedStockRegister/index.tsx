import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import FormScreen, { FormSection } from '@/components/form/FormScreen.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import type { SelectOption } from '@/components/ui/Select.tsx'
import type { FeedStock, FeedStockUnit } from '@/types/domain'

interface Fields {
  feedId: string
  quantity: string
  unit: string
  entryDate: string
  minimumStock: string
}

type FieldKey = keyof Fields

const UNIT_OPTIONS: SelectOption[] = [
  { value: 'kg', label: 'kg' },
  { value: 'sacos', label: 'sacos' },
  { value: 'toneladas', label: 'toneladas' },
]

export default function FeedStockRegister() {
  const navigate = useNavigate()
  const farm     = useFarmStore((s) => s.farm)
  const feeds    = useFarmStore((s) => s.feeds)
  const addStock = useFarmStore((s) => s.addFeedStock)
  const toast    = useToast()
  const { can }  = useAccess()

  const today = new Date().toISOString().split('T')[0]
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [fields, setFields] = useState<Fields>({
    feedId: '', quantity: '', unit: 'kg', entryDate: today, minimumStock: '0',
  })

  function validate(f: Fields): Partial<Record<FieldKey, string>> {
    const e: Partial<Record<FieldKey, string>> = {}
    if (!f.feedId) e.feedId = 'Alimento é obrigatório'
    if (!f.quantity || Number(f.quantity) <= 0) e.quantity = 'Quantidade deve ser maior que zero'
    if (!f.unit) e.unit = 'Unidade é obrigatória'
    if (!f.entryDate) e.entryDate = 'Data é obrigatória'
    if (f.minimumStock && Number(f.minimumStock) < 0) e.minimumStock = 'Não pode ser negativo'
    return e
  }

  const errors = validate(fields)
  const errorCount = Object.keys(errors).length
  const set = (k: FieldKey, v: string) => setFields((f) => ({ ...f, [k]: v }))
  const touch = (k: FieldKey) => setTouched((t) => ({ ...t, [k]: true }))
  const err = (k: FieldKey) => (touched[k] || submitAttempted ? errors[k] : undefined)

  const feedOptions: SelectOption[] = feeds
    .filter((f) => f.propertyId === farm?.id)
    .map((f) => ({ value: f.id, label: f.name }))

  function handleSave() {
    setSubmitAttempted(true)
    if (errorCount > 0) return
    setSaving(true)
    setTimeout(() => {
      const now = new Date().toISOString()
      const entry: FeedStock = {
        id: crypto.randomUUID(),
        propertyId: farm?.id ?? '',
        feedId: fields.feedId,
        quantity: Number(fields.quantity),
        unit: fields.unit as FeedStockUnit,
        entryDate: fields.entryDate,
        minimumStock: fields.minimumStock ? Number(fields.minimumStock) : 0,
        active: true,
        createdAt: now,
        updatedAt: now,
      }
      addStock(entry)
      toast.success('Entrada de estoque registrada')
      setSaving(false)
      navigate(-1)
    }, 600)
  }

  return (
    <FormScreen
      title="Entrada de estoque — alimento"
      subtitle="Registra a entrada e soma ao estoque do alimento"
      submitLabel="Registrar entrada"
      onSubmit={handleSave}
      saving={saving}
      errorCount={submitAttempted ? errorCount : 0}
      canWrite={can.writeHusbandry}
      blockedMessage="Apenas produtor ou colaborador podem movimentar estoque."
    >
      <FormSection title="Alimento">
        {feedOptions.length === 0 ? (
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-dashed border-gray-200">
            <p className="text-caption text-gray-500">Nenhum alimento cadastrado.</p>
            <button type="button" onClick={() => navigate('/feeds/new')} className="text-caption font-medium text-primary hover:underline shrink-0">
              Cadastrar alimento
            </button>
          </div>
        ) : (
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
        )}
      </FormSection>

      <FormSection title="Entrada">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Quantidade"
            type="number"
            required
            min="0"
            step="0.01"
            value={fields.quantity}
            onChange={(e) => set('quantity', e.target.value)}
            onBlur={() => touch('quantity')}
            error={err('quantity')}
          />
          <Select
            label="Unidade"
            required
            value={fields.unit}
            options={UNIT_OPTIONS}
            onChange={(e) => set('unit', e.target.value)}
            onBlur={() => touch('unit')}
            error={err('unit')}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Data de entrada"
            type="date"
            required
            max={today}
            value={fields.entryDate}
            onChange={(e) => set('entryDate', e.target.value)}
            onBlur={() => touch('entryDate')}
            error={err('entryDate')}
          />
          <Input
            label="Estoque mínimo"
            type="number"
            min="0"
            step="0.01"
            value={fields.minimumStock}
            onChange={(e) => set('minimumStock', e.target.value)}
            onBlur={() => touch('minimumStock')}
            error={err('minimumStock')}
            helperText="Alerta abaixo disso"
          />
        </div>
      </FormSection>
    </FormScreen>
  )
}
