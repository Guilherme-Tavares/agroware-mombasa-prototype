import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Info } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import FormScreen, { FormSection } from '@/components/form/FormScreen.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import type { SelectOption } from '@/components/ui/Select.tsx'
import type { ForagePlanting } from '@/types/domain'

interface Fields {
  divisionId: string
  speciesId: string
  plantingDate: string
}

type FieldKey = keyof Fields

export default function ForageRegister() {
  const navigate   = useNavigate()
  const divisions  = useFarmStore((s) => s.divisions)
  const forages    = useFarmStore((s) => s.forages)
  const plantings  = useFarmStore((s) => s.foragePlantings)
  const addForagePlanting = useFarmStore((s) => s.addForagePlanting)
  const toast      = useToast()
  const { can }    = useAccess()

  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [fields, setFields] = useState<Fields>({ divisionId: '', speciesId: '', plantingDate: '' })

  function validate(f: Fields): Partial<Record<FieldKey, string>> {
    const e: Partial<Record<FieldKey, string>> = {}
    if (!f.divisionId) e.divisionId = 'Divisão é obrigatória'
    if (!f.speciesId)  e.speciesId = 'Espécie é obrigatória'
    return e
  }

  const errors = validate(fields)
  const errorCount = Object.keys(errors).length

  const set = (field: FieldKey, value: string) => setFields((f) => ({ ...f, [field]: value }))
  const touch = (field: FieldKey) => setTouched((t) => ({ ...t, [field]: true }))
  const err = (field: FieldKey) => (touched[field] || submitAttempted ? errors[field] : undefined)

  const divisionOptions: SelectOption[] = divisions.map((d) => ({ value: d.id, label: d.name }))
  const speciesOptions: SelectOption[] = forages.map((f) => ({ value: f.id, label: f.name }))

  // Forragem ativa atual da divisão selecionada (a regra desativará ao salvar).
  const currentActive = fields.divisionId
    ? plantings.find((p) => p.divisionId === fields.divisionId && p.active !== false)
    : undefined
  const currentSpecies = currentActive
    ? forages.find((f) => f.id === currentActive.speciesId)?.name ?? currentActive.type
    : undefined

  function handleSave() {
    setSubmitAttempted(true)
    if (errorCount > 0) return
    setSaving(true)
    setTimeout(() => {
      const now = new Date().toISOString()
      const species = forages.find((f) => f.id === fields.speciesId)
      const planting: ForagePlanting = {
        id: crypto.randomUUID(),
        divisionId: fields.divisionId,
        speciesId: fields.speciesId,
        type: species?.name ?? 'Forragem',
        plantingDate: fields.plantingDate || undefined,
        active: true,
        createdAt: now,
        updatedAt: now,
      }
      addForagePlanting(planting)
      toast.success('Forragem cadastrada na divisão')
      setSaving(false)
      navigate(-1)
    }, 600)
  }

  return (
    <FormScreen
      title="Nova forragem"
      subtitle="Registre a forragem plantada em uma divisão"
      submitLabel="Cadastrar forragem"
      onSubmit={handleSave}
      saving={saving}
      errorCount={submitAttempted ? errorCount : 0}
      canWrite={can.writeHusbandry}
      blockedMessage="Apenas produtor ou colaborador podem cadastrar forragens."
    >
      <FormSection title="Plantio">
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

        {currentActive && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-warning-bg text-warning-dark text-caption">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>
              Esta divisão já tem <strong>{currentSpecies}</strong> ativa. Ao salvar,
              ela será substituída (uma forragem ativa por divisão).
            </span>
          </div>
        )}

        <Select
          label="Espécie forrageira"
          required
          value={fields.speciesId}
          options={speciesOptions}
          placeholder="Selecione..."
          onChange={(e) => set('speciesId', e.target.value)}
          onBlur={() => touch('speciesId')}
          error={err('speciesId')}
        />
        <Input
          label="Data de implantação"
          type="date"
          value={fields.plantingDate}
          onChange={(e) => set('plantingDate', e.target.value)}
          helperText="Opcional"
        />
      </FormSection>
    </FormScreen>
  )
}
