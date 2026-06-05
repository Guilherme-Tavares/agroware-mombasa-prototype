import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import FormScreen, { FormSection } from '@/components/form/FormScreen.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import Textarea from '@/components/ui/Textarea.tsx'
import type { SelectOption } from '@/components/ui/Select.tsx'
import type { Herd, HerdPurpose } from '@/types/domain'

interface Fields {
  name: string
  purpose: string
  formedAt: string
  notes: string
}

type FieldKey = keyof Fields

function validate(f: Fields): Partial<Record<FieldKey, string>> {
  const e: Partial<Record<FieldKey, string>> = {}
  if (!f.name.trim()) e.name     = 'Nome é obrigatório'
  if (!f.purpose)     e.purpose  = 'Finalidade é obrigatória'
  if (!f.formedAt)    e.formedAt = 'Data de formação é obrigatória'
  return e
}

const PURPOSE_OPTIONS: SelectOption[] = [
  { value: 'recria',  label: 'Recria' },
  { value: 'engorda', label: 'Engorda' },
  { value: 'misto',   label: 'Misto' },
]

export default function HerdRegister() {
  const navigate = useNavigate()
  const farm     = useFarmStore((s) => s.farm)
  const addHerd  = useFarmStore((s) => s.addHerd)
  const toast    = useToast()
  const { can }  = useAccess()

  const today = new Date().toISOString().split('T')[0]

  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const [fields, setFields] = useState<Fields>({
    name: '', purpose: '', formedAt: today, notes: '',
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
      const herd: Herd = {
        id: crypto.randomUUID(),
        farmId: farm?.id ?? '',
        name: fields.name.trim(),
        purpose: fields.purpose as HerdPurpose,
        formedAt: fields.formedAt,
        notes: fields.notes.trim() || undefined,
        active: true,
        createdAt: now,
        updatedAt: now,
      }
      addHerd(herd)
      toast.success('Rebanho cadastrado com sucesso')
      setSaving(false)
      navigate(-1)
    }, 600)
  }

  return (
    <FormScreen
      title="Novo rebanho"
      subtitle="Crie um lote para agrupar bovinos"
      submitLabel="Cadastrar rebanho"
      onSubmit={handleSave}
      saving={saving}
      errorCount={submitAttempted ? errorCount : 0}
      canWrite={can.writeHusbandry}
      blockedMessage="Apenas produtor ou colaborador podem cadastrar rebanhos."
    >
      <FormSection title="Identificação">
        <Input
          label="Nome do rebanho"
          required
          value={fields.name}
          onChange={(e) => set('name', e.target.value)}
          onBlur={() => touch('name')}
          error={err('name')}
          helperText="Ex: Lote D, Recria Junho, Engorda 2026"
        />
        <Select
          label="Finalidade"
          required
          value={fields.purpose}
          options={PURPOSE_OPTIONS}
          placeholder="Selecione..."
          onChange={(e) => set('purpose', e.target.value)}
          onBlur={() => touch('purpose')}
          error={err('purpose')}
        />
      </FormSection>

      <FormSection title="Formação">
        <Input
          label="Data de formação do lote"
          type="date"
          required
          max={today}
          value={fields.formedAt}
          onChange={(e) => set('formedAt', e.target.value)}
          onBlur={() => touch('formedAt')}
          error={err('formedAt')}
        />
      </FormSection>

      <FormSection title="Observações">
        <Textarea
          label="Notas adicionais"
          rows={3}
          value={fields.notes}
          onChange={(e) => set('notes', e.target.value)}
          helperText="Opcional — informações relevantes sobre o lote"
        />
      </FormSection>
    </FormScreen>
  )
}
