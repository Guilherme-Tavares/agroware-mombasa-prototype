import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import { polygonCentroid, geoCentroid } from '@/utils/geometry'
import FormScreen, { FormSection } from '@/components/form/FormScreen.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import type { SelectOption } from '@/components/ui/Select.tsx'
import type { TroughMaterial } from '@/types/domain'

interface Fields {
  divisionId: string
  identifier: string
  material: string
  capacity: string
  consumptionRate: string
  currentAmount: string
  currentFeedId: string
}

type FieldKey = keyof Fields

const MATERIAL_OPTIONS: SelectOption[] = [
  { value: 'concreto', label: 'Concreto' },
  { value: 'madeira',  label: 'Madeira' },
  { value: 'plastico', label: 'Plástico' },
  { value: 'metal',    label: 'Metal' },
]

export default function TroughRegister() {
  const navigate  = useNavigate()
  const { id }    = useParams<{ id: string }>()
  const isEdit    = Boolean(id)
  const divisions = useFarmStore((s) => s.divisions)
  const feeds     = useFarmStore((s) => s.feeds)
  const existing  = useFarmStore((s) => s.feedTroughs.find((t) => t.id === id))
  const addFeedTrough = useFarmStore((s) => s.addFeedTrough)
  const updateFeedTrough = useFarmStore((s) => s.updateFeedTrough)
  const toast     = useToast()
  const { can }   = useAccess()

  const today = new Date().toISOString().split('T')[0]

  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [fields, setFields] = useState<Fields>({
    divisionId: existing?.divisionId ?? '',
    identifier: existing?.identifier ?? '',
    material: existing?.material ?? 'concreto',
    capacity: existing?.capacity != null ? String(existing.capacity) : '',
    consumptionRate: existing?.consumptionRate != null ? String(existing.consumptionRate) : '',
    currentAmount: existing?.currentAmount != null ? String(existing.currentAmount) : '0',
    currentFeedId: existing?.currentFeedId ?? '',
  })

  function validate(f: Fields): Partial<Record<FieldKey, string>> {
    const e: Partial<Record<FieldKey, string>> = {}
    if (!f.divisionId)         e.divisionId = 'Divisão é obrigatória'
    if (!f.identifier.trim())  e.identifier = 'Identificação é obrigatória'
    if (!f.material)           e.material = 'Material é obrigatório'
    if (!f.capacity || Number(f.capacity) <= 0) e.capacity = 'Capacidade deve ser maior que zero'
    if (f.currentAmount && Number(f.currentAmount) < 0) e.currentAmount = 'Não pode ser negativo'
    if (f.capacity && f.currentAmount && Number(f.currentAmount) > Number(f.capacity))
      e.currentAmount = 'Acima da capacidade'
    if (f.consumptionRate && Number(f.consumptionRate) < 0) e.consumptionRate = 'Não pode ser negativo'
    return e
  }

  const errors = validate(fields)
  const errorCount = Object.keys(errors).length

  const set = (field: FieldKey, value: string) => setFields((f) => ({ ...f, [field]: value }))
  const touch = (field: FieldKey) => setTouched((t) => ({ ...t, [field]: true }))
  const err = (field: FieldKey) => (touched[field] || submitAttempted ? errors[field] : undefined)

  const divisionOptions: SelectOption[] = divisions.map((d) => ({ value: d.id, label: d.name }))
  const feedOptions: SelectOption[] = [
    { value: '', label: 'Sem alimento' },
    ...feeds.map((f) => ({ value: f.id, label: f.name })),
  ]

  function handleSave() {
    setSubmitAttempted(true)
    if (errorCount > 0) return
    setSaving(true)
    setTimeout(() => {
      const now = new Date().toISOString()
      const division = divisions.find((d) => d.id === fields.divisionId)
      const currentAmount = fields.currentAmount ? Number(fields.currentAmount) : 0
      const common = {
        divisionId: fields.divisionId,
        identifier: fields.identifier.trim(),
        capacity: Number(fields.capacity),
        material: fields.material as TroughMaterial,
        currentAmount,
        currentFeedId: fields.currentFeedId || undefined,
        consumptionRate: fields.consumptionRate ? Number(fields.consumptionRate) : 0,
      }

      if (isEdit && id) {
        updateFeedTrough(id, { ...common, updatedAt: now })
        toast.success('Cocho atualizado com sucesso')
      } else {
        // Posiciona o cocho no centroide da divisão (relativo e, se houver, geo).
        const position = division && division.polygon.length >= 3
          ? polygonCentroid(division.polygon)
          : { x: 500, y: 350 }
        const geoPosition = division?.geoPolygon && division.geoPolygon.length >= 3
          ? geoCentroid(division.geoPolygon)
          : undefined
        addFeedTrough({
          id: crypto.randomUUID(),
          ...common,
          position,
          geoPosition,
          lastRefillDate: currentAmount > 0 ? today : '',
          refillHistory: [],
          active: true,
          createdAt: now,
          updatedAt: now,
        })
        toast.success('Cocho cadastrado com sucesso')
      }
      setSaving(false)
      navigate(-1)
    }, 600)
  }

  return (
    <FormScreen
      title={isEdit ? 'Editar cocho' : 'Novo cocho'}
      subtitle={isEdit ? 'Atualize os dados do cocho' : 'Cadastre um cocho em uma divisão'}
      submitLabel={isEdit ? 'Atualizar' : 'Cadastrar cocho'}
      onSubmit={handleSave}
      saving={saving}
      errorCount={submitAttempted ? errorCount : 0}
      canWrite={can.writeHusbandry}
      blockedMessage="Apenas produtor ou colaborador podem cadastrar cochos."
    >
      <FormSection title="Localização & Identificação">
        <Select
          label="Divisão"
          required
          value={fields.divisionId}
          options={divisionOptions}
          placeholder="Selecione..."
          onChange={(e) => set('divisionId', e.target.value)}
          onBlur={() => touch('divisionId')}
          error={err('divisionId')}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Identificação"
            required
            value={fields.identifier}
            onChange={(e) => set('identifier', e.target.value)}
            onBlur={() => touch('identifier')}
            error={err('identifier')}
            helperText="Ex: C-05"
          />
          <Select
            label="Material"
            required
            value={fields.material}
            options={MATERIAL_OPTIONS}
            onChange={(e) => set('material', e.target.value)}
            onBlur={() => touch('material')}
            error={err('material')}
          />
        </div>
      </FormSection>

      <FormSection title="Capacidade & Consumo">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Capacidade (kg)"
            type="number"
            required
            min="0"
            step="1"
            value={fields.capacity}
            onChange={(e) => set('capacity', e.target.value)}
            onBlur={() => touch('capacity')}
            error={err('capacity')}
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
            helperText="Opcional"
          />
        </div>
      </FormSection>

      <FormSection title="Conteúdo inicial">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Quantidade atual (kg)"
            type="number"
            min="0"
            step="1"
            value={fields.currentAmount}
            onChange={(e) => set('currentAmount', e.target.value)}
            onBlur={() => touch('currentAmount')}
            error={err('currentAmount')}
          />
          <Select
            label="Alimento atual"
            value={fields.currentFeedId}
            options={feedOptions}
            onChange={(e) => set('currentFeedId', e.target.value)}
            helperText="Opcional"
          />
        </div>
      </FormSection>
    </FormScreen>
  )
}
