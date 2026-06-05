import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import FormScreen, { FormSection } from '@/components/form/FormScreen.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import type { SelectOption } from '@/components/ui/Select.tsx'
import type { Feed, FeedType } from '@/types/domain'

interface Fields {
  name: string
  type: string
  protein: string
}

type FieldKey = keyof Fields

const TYPE_OPTIONS: SelectOption[] = [
  { value: 'racao',       label: 'Ração' },
  { value: 'sal_mineral', label: 'Sal mineral' },
  { value: 'silagem',     label: 'Silagem' },
  { value: 'farelo',      label: 'Farelo' },
  { value: 'suplemento',  label: 'Suplemento' },
  { value: 'outro',       label: 'Outro' },
]

export default function FeedRegister() {
  const navigate = useNavigate()
  const farm     = useFarmStore((s) => s.farm)
  const feeds    = useFarmStore((s) => s.feeds)
  const addFeed  = useFarmStore((s) => s.addFeed)
  const toast    = useToast()
  const { can }  = useAccess()

  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [fields, setFields] = useState<Fields>({ name: '', type: '', protein: '' })

  function validate(f: Fields): Partial<Record<FieldKey, string>> {
    const e: Partial<Record<FieldKey, string>> = {}
    if (!f.name.trim()) e.name = 'Nome é obrigatório'
    else if (feeds.some(
      (x) => x.propertyId === farm?.id && x.name.toLowerCase() === f.name.trim().toLowerCase(),
    )) e.name = 'Já existe um alimento com este nome'
    if (!f.type) e.type = 'Tipo é obrigatório'
    if (f.protein && (Number(f.protein) < 0 || Number(f.protein) > 100)) e.protein = 'Proteína entre 0 e 100%'
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
      const feed: Feed = {
        id: crypto.randomUUID(),
        propertyId: farm?.id,
        name: fields.name.trim(),
        type: fields.type as FeedType,
        proteinPercentage: fields.protein ? Number(fields.protein) : undefined,
        active: true,
        createdAt: now,
        updatedAt: now,
      }
      addFeed(feed)
      toast.success('Alimento cadastrado com sucesso')
      setSaving(false)
      navigate(-1)
    }, 600)
  }

  return (
    <FormScreen
      title="Novo alimento"
      subtitle="Catálogo de alimentos da propriedade"
      submitLabel="Cadastrar alimento"
      onSubmit={handleSave}
      saving={saving}
      errorCount={submitAttempted ? errorCount : 0}
      canWrite={can.writeHusbandry}
      blockedMessage="Apenas produtor ou colaborador podem cadastrar alimentos."
    >
      <FormSection title="Identificação">
        <Input
          label="Nome"
          required
          value={fields.name}
          onChange={(e) => set('name', e.target.value)}
          onBlur={() => touch('name')}
          error={err('name')}
          helperText="Ex: Ração 18% PB, Sal Mineral"
        />
        <div className="grid grid-cols-2 gap-4">
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
          <Input
            label="Proteína (%)"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={fields.protein}
            onChange={(e) => set('protein', e.target.value)}
            onBlur={() => touch('protein')}
            error={err('protein')}
            helperText="Opcional"
          />
        </div>
      </FormSection>
    </FormScreen>
  )
}
