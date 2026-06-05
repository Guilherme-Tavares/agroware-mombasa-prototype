import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import FormScreen, { FormSection } from '@/components/form/FormScreen.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import type { SelectOption } from '@/components/ui/Select.tsx'
import type { SeasonType } from '@/types/domain'

interface Fields {
  name: string
  type: string
  startDate: string
  endDate: string
}

type FieldKey = keyof Fields

function validate(f: Fields): Partial<Record<FieldKey, string>> {
  const e: Partial<Record<FieldKey, string>> = {}
  if (!f.name.trim())  e.name = 'Nome é obrigatório'
  if (!f.type)         e.type = 'Tipo é obrigatório'
  if (!f.startDate)    e.startDate = 'Data de início é obrigatória'
  if (!f.endDate)      e.endDate = 'Data de fim é obrigatória'
  if (f.startDate && f.endDate && f.endDate <= f.startDate) {
    e.endDate = 'O fim deve ser posterior ao início'
  }
  return e
}

const TYPE_OPTIONS: SelectOption[] = [
  { value: 'aguas',     label: 'Águas' },
  { value: 'seca',      label: 'Seca' },
  { value: 'transicao', label: 'Transição' },
]

export default function SeasonRegister() {
  const navigate  = useNavigate()
  const { id }    = useParams<{ id: string }>()
  const isEdit    = Boolean(id)
  const farm      = useFarmStore((s) => s.farm)
  const existing  = useFarmStore((s) => s.seasons.find((x) => x.id === id))
  const addSeason = useFarmStore((s) => s.addSeason)
  const updateSeason = useFarmStore((s) => s.updateSeason)
  const toast     = useToast()
  const { can }   = useAccess()

  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const [fields, setFields] = useState<Fields>({
    name: existing?.name ?? '',
    type: existing?.type ?? '',
    startDate: existing?.startDate ?? '',
    endDate: existing?.endDate ?? '',
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
      const common = {
        name: fields.name.trim(),
        type: fields.type as SeasonType,
        startDate: fields.startDate,
        endDate: fields.endDate,
      }
      if (isEdit && id) {
        updateSeason(id, { ...common, updatedAt: now })
        toast.success('Temporada atualizada com sucesso')
      } else {
        addSeason({
          id: crypto.randomUUID(),
          propertyId: farm?.id,
          ...common,
          active: true,
          createdAt: now,
          updatedAt: now,
        })
        toast.success('Temporada cadastrada com sucesso')
      }
      setSaving(false)
      navigate(-1)
    }, 600)
  }

  return (
    <FormScreen
      title={isEdit ? 'Editar temporada' : 'Nova temporada'}
      subtitle={isEdit ? 'Atualize os dados da temporada' : 'Cadastre uma temporada (águas, seca ou transição)'}
      submitLabel={isEdit ? 'Atualizar' : 'Cadastrar temporada'}
      onSubmit={handleSave}
      saving={saving}
      errorCount={submitAttempted ? errorCount : 0}
      canWrite={can.writeHusbandry}
      blockedMessage="Apenas produtor ou colaborador podem cadastrar temporadas."
    >
      <FormSection title="Identificação">
        <Input
          label="Nome da temporada"
          required
          value={fields.name}
          onChange={(e) => set('name', e.target.value)}
          onBlur={() => touch('name')}
          error={err('name')}
          helperText="Ex: Águas 2025/2026, Seca 2026"
        />
        <Select
          label="Tipo"
          required
          value={fields.type}
          options={TYPE_OPTIONS}
          placeholder="Selecione..."
          onChange={(e) => set('type', e.target.value)}
          onBlur={() => touch('type')}
          error={err('type')}
        />
      </FormSection>

      <FormSection title="Período">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Início"
            type="date"
            required
            value={fields.startDate}
            onChange={(e) => set('startDate', e.target.value)}
            onBlur={() => touch('startDate')}
            error={err('startDate')}
          />
          <Input
            label="Fim"
            type="date"
            required
            value={fields.endDate}
            onChange={(e) => set('endDate', e.target.value)}
            onBlur={() => touch('endDate')}
            error={err('endDate')}
          />
        </div>
      </FormSection>
    </FormScreen>
  )
}
