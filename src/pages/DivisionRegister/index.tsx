import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import FormScreen, { FormSection } from '@/components/form/FormScreen.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import type { SelectOption } from '@/components/ui/Select.tsx'
import type { Division, DivisionType } from '@/types/domain'

interface Fields {
  name: string
  area: string
  type: string
  status: string
  forageId: string
  forageStartDate: string
}

type FieldKey = keyof Fields

function validate(f: Fields): Partial<Record<FieldKey, string>> {
  const e: Partial<Record<FieldKey, string>> = {}
  if (!f.name.trim())              e.name   = 'Nome é obrigatório'
  if (!f.area || Number(f.area) <= 0) e.area = 'Área deve ser maior que zero'
  if (!f.type)                     e.type   = 'Tipo é obrigatório'
  if (!f.status)                   e.status = 'Status é obrigatório'
  return e
}

const TYPE_OPTIONS: SelectOption[] = [
  { value: 'pasto',      label: 'Pastagem' },
  { value: 'reserva',    label: 'Reserva' },
  { value: 'curral',     label: 'Curral' },
  { value: 'manga',      label: 'Manga' },
  { value: 'instalacao', label: 'Instalação' },
]

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'active',   label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
]

export default function DivisionRegister() {
  const navigate    = useNavigate()
  const farm        = useFarmStore((s) => s.farm)
  const forages     = useFarmStore((s) => s.forages)
  const addDivision = useFarmStore((s) => s.addDivision)
  const toast       = useToast()
  const { can }     = useAccess()

  const today = new Date().toISOString().split('T')[0]

  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const [fields, setFields] = useState<Fields>({
    name: '', area: '', type: '', status: 'active', forageId: '', forageStartDate: '',
  })

  const errors = validate(fields)
  const errorCount = Object.keys(errors).length

  function set(field: FieldKey, value: string) {
    setFields((f) => ({ ...f, [field]: value }))
  }
  function touch(field: FieldKey) {
    setTouched((t) => ({ ...t, [field]: true }))
  }
  function err(field: FieldKey): string | undefined {
    return touched[field] || submitAttempted ? errors[field] : undefined
  }

  function handleSave() {
    setSubmitAttempted(true)
    if (errorCount > 0) return
    setSaving(true)
    setTimeout(() => {
      const now = new Date().toISOString()
      const division: Division = {
        id: crypto.randomUUID(),
        farmId: farm?.id ?? '',
        name: fields.name.trim(),
        area: Number(fields.area),
        type: fields.type as DivisionType,
        status: fields.status as Division['status'],
        forageId: fields.forageId || undefined,
        forageStartDate: fields.forageStartDate || undefined,
        polygon: [],
        active: true,
        createdAt: now,
        updatedAt: now,
      }
      addDivision(division)
      toast.success('Divisão cadastrada com sucesso')
      setSaving(false)
      navigate(-1)
    }, 600)
  }

  const forageOptions: SelectOption[] = [
    { value: '', label: 'Sem forrageira' },
    ...forages.map((f) => ({ value: f.id, label: f.name })),
  ]
  const hasForage = Boolean(fields.forageId)

  return (
    <FormScreen
      title="Nova divisão"
      subtitle="Cadastre um piquete, pastagem ou curral"
      submitLabel="Cadastrar divisão"
      onSubmit={handleSave}
      saving={saving}
      errorCount={submitAttempted ? errorCount : 0}
      canWrite={can.writeHusbandry}
      blockedMessage="Apenas produtor ou colaborador podem cadastrar divisões."
    >
      <FormSection title="Identificação">
        <Input
          label="Nome da divisão"
          required
          value={fields.name}
          onChange={(e) => set('name', e.target.value)}
          onBlur={() => touch('name')}
          error={err('name')}
          helperText="Ex: Piquete 6, Curral A, Reserva Norte"
        />
      </FormSection>

      <FormSection title="Área & Tipo">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Área (ha)"
            type="number"
            required
            min="0"
            step="0.1"
            value={fields.area}
            onChange={(e) => set('area', e.target.value)}
            onBlur={() => touch('area')}
            error={err('area')}
          />
          <Select
            label="Status"
            required
            value={fields.status}
            options={STATUS_OPTIONS}
            onChange={(e) => set('status', e.target.value)}
            onBlur={() => touch('status')}
            error={err('status')}
          />
        </div>
        <Select
          label="Tipo de divisão"
          required
          value={fields.type}
          options={TYPE_OPTIONS}
          placeholder="Selecione..."
          onChange={(e) => set('type', e.target.value)}
          onBlur={() => touch('type')}
          error={err('type')}
        />
      </FormSection>

      <FormSection title="Forrageira">
        <Select
          label="Espécie forrageira"
          value={fields.forageId}
          options={forageOptions}
          onChange={(e) => {
            set('forageId', e.target.value)
            if (!e.target.value) set('forageStartDate', '')
          }}
          helperText="Opcional"
        />
        <AnimatePresence>
          {hasForage && (
            <motion.div
              key="forage-date"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Input
                label="Data de implantação"
                type="date"
                max={today}
                value={fields.forageStartDate}
                onChange={(e) => set('forageStartDate', e.target.value)}
                helperText="Quando a forrageira foi plantada ou iniciada"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </FormSection>
    </FormScreen>
  )
}
