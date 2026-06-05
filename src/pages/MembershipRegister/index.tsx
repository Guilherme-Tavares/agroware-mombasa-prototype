import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import FormScreen, { FormSection } from '@/components/form/FormScreen.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import type { SelectOption } from '@/components/ui/Select.tsx'

interface Fields {
  bovineId: string
  herdId: string
  startDate: string
  entryWeight: string
}

type FieldKey = keyof Fields

export default function MembershipRegister() {
  const navigate = useNavigate()
  const farm     = useFarmStore((s) => s.farm)
  const bovines  = useFarmStore((s) => s.bovines)
  const herds    = useFarmStore((s) => s.herds)
  const setBovineMembership = useFarmStore((s) => s.setBovineMembership)
  const toast    = useToast()
  const { can }  = useAccess()

  const today = new Date().toISOString().split('T')[0]
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [fields, setFields] = useState<Fields>({
    bovineId: '', herdId: '', startDate: today, entryWeight: '',
  })

  const bovine = bovines.find((b) => b.id === fields.bovineId)
  const currentHerd = bovine?.herdId ? herds.find((h) => h.id === bovine.herdId) : undefined
  const targetIsRemove = fields.herdId === '__none__'

  function validate(f: Fields): Partial<Record<FieldKey, string>> {
    const e: Partial<Record<FieldKey, string>> = {}
    if (!f.bovineId) e.bovineId = 'Bovino é obrigatório'
    if (!f.herdId)   e.herdId = 'Selecione o destino'
    if (!f.startDate) e.startDate = 'Data é obrigatória'
    return e
  }

  const errors = validate(fields)
  const errorCount = Object.keys(errors).length
  const set = (k: FieldKey, v: string) => setFields((f) => ({ ...f, [k]: v }))
  const touch = (k: FieldKey) => setTouched((t) => ({ ...t, [k]: true }))
  const err = (k: FieldKey) => (touched[k] || submitAttempted ? errors[k] : undefined)

  function onBovineChange(id: string) {
    const b = bovines.find((x) => x.id === id)
    setFields((f) => ({ ...f, bovineId: id, entryWeight: b ? String(b.currentWeight) : '' }))
  }

  const bovineOptions: SelectOption[] = bovines
    .filter((b) => !b.propertyId || b.propertyId === farm?.id)
    .map((b) => ({ value: b.id, label: `${b.name}${b.earTag ? ` · ${b.earTag}` : ''}` }))
  const herdOptions: SelectOption[] = [
    ...herds.map((h) => ({ value: h.id, label: h.name })),
    { value: '__none__', label: 'Retirar do rebanho' },
  ]

  function handleSave() {
    setSubmitAttempted(true)
    if (errorCount > 0) return
    setSaving(true)
    setTimeout(() => {
      const herdId = targetIsRemove ? null : fields.herdId
      setBovineMembership(fields.bovineId, herdId, {
        startDate: fields.startDate,
        entryWeightKg: fields.entryWeight ? Number(fields.entryWeight) : undefined,
      })
      toast.success(targetIsRemove ? 'Bovino retirado do rebanho' : 'Pertencimento atualizado')
      setSaving(false)
      navigate(-1)
    }, 600)
  }

  return (
    <FormScreen
      title="Pertencimento"
      subtitle="Vincula um bovino a um rebanho (ou o retira)"
      submitLabel="Confirmar"
      onSubmit={handleSave}
      saving={saving}
      errorCount={submitAttempted ? errorCount : 0}
      canWrite={can.writeHusbandry}
      blockedMessage="Apenas produtor ou colaborador podem alterar pertencimento."
    >
      <FormSection title="Bovino">
        <Select
          label="Bovino"
          required
          value={fields.bovineId}
          options={bovineOptions}
          placeholder="Selecione..."
          onChange={(e) => onBovineChange(e.target.value)}
          onBlur={() => touch('bovineId')}
          error={err('bovineId')}
        />
        {bovine && (
          <div className="flex items-center gap-2 text-caption text-gray-500">
            <span>{currentHerd ? currentHerd.name : 'Sem rebanho'}</span>
            <ArrowRight size={13} className="text-gray-300" />
            <span className="text-gray-900 font-medium">
              {targetIsRemove ? 'Sem rebanho' : (herds.find((h) => h.id === fields.herdId)?.name ?? '—')}
            </span>
          </div>
        )}
      </FormSection>

      <FormSection title="Destino">
        <Select
          label="Rebanho"
          required
          value={fields.herdId}
          options={herdOptions}
          placeholder="Selecione..."
          onChange={(e) => set('herdId', e.target.value)}
          onBlur={() => touch('herdId')}
          error={err('herdId')}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Data de entrada"
            type="date"
            required
            max={today}
            value={fields.startDate}
            onChange={(e) => set('startDate', e.target.value)}
            onBlur={() => touch('startDate')}
            error={err('startDate')}
          />
          {!targetIsRemove && (
            <Input
              label="Peso de entrada (kg)"
              type="number"
              min="0"
              step="0.1"
              value={fields.entryWeight}
              onChange={(e) => set('entryWeight', e.target.value)}
              helperText="Padrão: peso atual"
            />
          )}
        </div>
      </FormSection>
    </FormScreen>
  )
}
