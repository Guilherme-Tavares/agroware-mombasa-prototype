import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import FormScreen, { FormSection } from '@/components/form/FormScreen.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import type { SelectOption } from '@/components/ui/Select.tsx'
import type { Medication, MedicationType } from '@/types/domain'

interface Fields {
  commercialName: string
  activeIngredient: string
  type: string
}

type FieldKey = keyof Fields

const TYPE_OPTIONS: SelectOption[] = [
  { value: 'antibiotico',     label: 'Antibiótico' },
  { value: 'antiparasitario', label: 'Antiparasitário' },
  { value: 'vitamina',        label: 'Vitamina' },
  { value: 'vacina',          label: 'Vacina' },
  { value: 'outro',           label: 'Outro' },
]

export default function MedicationRegister() {
  const navigate      = useNavigate()
  const farm          = useFarmStore((s) => s.farm)
  const medications   = useFarmStore((s) => s.medications)
  const addMedication = useFarmStore((s) => s.addMedication)
  const toast         = useToast()
  const { can }       = useAccess()

  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [fields, setFields] = useState<Fields>({ commercialName: '', activeIngredient: '', type: '' })

  function validate(f: Fields): Partial<Record<FieldKey, string>> {
    const e: Partial<Record<FieldKey, string>> = {}
    if (!f.commercialName.trim()) e.commercialName = 'Nome comercial é obrigatório'
    else if (medications.some(
      (m) => m.propertyId === farm?.id && m.commercialName.toLowerCase() === f.commercialName.trim().toLowerCase(),
    )) e.commercialName = 'Já existe um medicamento com este nome'
    if (!f.type) e.type = 'Tipo é obrigatório'
    return e
  }

  const errors = validate(fields)
  const errorCount = Object.keys(errors).length

  const set = (field: FieldKey, value: string) => setFields((f) => ({ ...f, [field]: value }))
  const touch = (field: FieldKey) => setTouched((t) => ({ ...t, [field]: true }))
  const err = (field: FieldKey) => (touched[field] || submitAttempted ? errors[field] : undefined)

  function handleSave() {
    setSubmitAttempted(true)
    if (errorCount > 0) return
    setSaving(true)
    setTimeout(() => {
      const now = new Date().toISOString()
      const medication: Medication = {
        id: crypto.randomUUID(),
        propertyId: farm?.id ?? '',
        commercialName: fields.commercialName.trim(),
        activeIngredient: fields.activeIngredient.trim() || undefined,
        type: fields.type as MedicationType,
        active: true,
        createdAt: now,
        updatedAt: now,
      }
      addMedication(medication)
      toast.success('Medicamento cadastrado com sucesso')
      setSaving(false)
      navigate(-1)
    }, 600)
  }

  return (
    <FormScreen
      title="Novo medicamento"
      subtitle="Catálogo de medicamentos da propriedade"
      submitLabel="Cadastrar medicamento"
      onSubmit={handleSave}
      saving={saving}
      errorCount={submitAttempted ? errorCount : 0}
      canWrite={can.writeHusbandry}
      blockedMessage="Apenas produtor ou colaborador podem cadastrar medicamentos."
    >
      <FormSection title="Identificação">
        <Input
          label="Nome comercial"
          required
          value={fields.commercialName}
          onChange={(e) => set('commercialName', e.target.value)}
          onBlur={() => touch('commercialName')}
          error={err('commercialName')}
          helperText="Ex: Ivomec Gold, Botuvacina"
        />
        <Input
          label="Princípio ativo"
          value={fields.activeIngredient}
          onChange={(e) => set('activeIngredient', e.target.value)}
          helperText="Opcional — ex: Ivermectina 3,15%"
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
    </FormScreen>
  )
}
