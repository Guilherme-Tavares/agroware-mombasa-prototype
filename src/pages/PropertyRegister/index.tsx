import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useFarmStore } from '@/store/useFarmStore'
import { useToast } from '@/hooks/useToast'
import FormScreen, { FormSection } from '@/components/form/FormScreen.tsx'
import Input from '@/components/ui/Input.tsx'

interface Fields {
  name: string
  city: string
  uf: string
  totalArea: string
}

type FieldKey = keyof Fields

function validate(f: Fields): Partial<Record<FieldKey, string>> {
  const e: Partial<Record<FieldKey, string>> = {}
  if (!f.name.trim()) e.name = 'Nome é obrigatório'
  if (!f.city.trim()) e.city = 'Município é obrigatório'
  if (!f.uf.trim())   e.uf   = 'UF é obrigatória'
  if (f.totalArea && Number(f.totalArea) < 0) e.totalArea = 'Área inválida'
  return e
}

export default function PropertyRegister() {
  const navigate    = useNavigate()
  const { id }      = useParams<{ id: string }>()
  const isEdit      = Boolean(id)
  const currentUserId = useFarmStore((s) => s.currentUserId)
  const existing    = useFarmStore((s) => s.farms.find((f) => f.id === id))
  const addProperty = useFarmStore((s) => s.addProperty)
  const updateProperty = useFarmStore((s) => s.updateProperty)
  const toast       = useToast()

  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [fields, setFields] = useState<Fields>({
    name: existing?.name ?? '',
    city: existing?.city ?? '',
    uf: existing?.state ?? '',
    totalArea: existing?.totalArea != null ? String(existing.totalArea) : '',
  })

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
      const common = {
        name: fields.name.trim(),
        city: fields.city.trim(),
        state: fields.uf.trim().toUpperCase(),
        totalArea: fields.totalArea ? Number(fields.totalArea) : 0,
      }
      if (isEdit && id) {
        updateProperty(id, { ...common, updatedAt: now })
        toast.success('Propriedade atualizada')
        setSaving(false)
        navigate(-1)
      } else {
        addProperty({
          id: crypto.randomUUID(),
          ownerId: currentUserId ?? undefined,
          ...common,
          polygon: [],
          mapBaseCapturedAt: null,
          active: true,
          createdAt: now,
          updatedAt: now,
        })
        toast.success('Propriedade criada. Agora demarque o contorno.')
        setSaving(false)
        navigate('/demarcation')
      }
    }, 600)
  }

  return (
    <FormScreen
      title={isEdit ? 'Editar propriedade' : 'Nova propriedade'}
      subtitle={isEdit ? 'Atualize os dados da propriedade' : 'Você será o dono e produtor da propriedade criada'}
      submitLabel={isEdit ? 'Atualizar' : 'Criar propriedade'}
      onSubmit={handleSave}
      saving={saving}
      errorCount={submitAttempted ? errorCount : 0}
    >
      <FormSection title="Identificação">
        <Input
          label="Nome da propriedade"
          required
          value={fields.name}
          onChange={(e) => set('name', e.target.value)}
          onBlur={() => touch('name')}
          error={err('name')}
          helperText="Ex: Sítio Boa Esperança"
        />
        <div className="grid grid-cols-[1fr_80px] gap-3">
          <Input
            label="Município"
            required
            value={fields.city}
            onChange={(e) => set('city', e.target.value)}
            onBlur={() => touch('city')}
            error={err('city')}
          />
          <Input
            label="UF"
            required
            maxLength={2}
            value={fields.uf}
            onChange={(e) => set('uf', e.target.value.toUpperCase())}
            onBlur={() => touch('uf')}
            error={err('uf')}
          />
        </div>
        <Input
          label="Área total (ha)"
          type="number"
          min="0"
          step="0.1"
          value={fields.totalArea}
          onChange={(e) => set('totalArea', e.target.value)}
          onBlur={() => touch('totalArea')}
          error={err('totalArea')}
          helperText="Opcional — pode ser calculada ao demarcar"
        />
      </FormSection>
    </FormScreen>
  )
}
