import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import FormScreen, { FormSection } from '@/components/form/FormScreen.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import Textarea from '@/components/ui/Textarea.tsx'
import type { SelectOption } from '@/components/ui/Select.tsx'
import type { SanitaryEvent } from '@/types/domain'

interface Fields {
  type: string
  scheduledDate: string
  medicationId: string
  targetKind: '' | 'herd' | 'bovine'
  targetId: string
  notes: string
}

type FieldKey = keyof Fields

export default function SanitaryEventRegister() {
  const navigate    = useNavigate()
  const farm        = useFarmStore((s) => s.farm)
  const herds       = useFarmStore((s) => s.herds)
  const bovines     = useFarmStore((s) => s.bovines)
  const medications = useFarmStore((s) => s.medications)
  const addEvent    = useFarmStore((s) => s.addSanitaryEvent)
  const toast       = useToast()
  const { can }     = useAccess()

  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [fields, setFields] = useState<Fields>({
    type: '', scheduledDate: '', medicationId: '', targetKind: '', targetId: '', notes: '',
  })

  function validate(f: Fields): Partial<Record<FieldKey, string>> {
    const e: Partial<Record<FieldKey, string>> = {}
    if (!f.type.trim())     e.type = 'Tipo do evento é obrigatório'
    if (!f.scheduledDate)   e.scheduledDate = 'Data programada é obrigatória'
    if (f.targetKind && !f.targetId) e.targetId = 'Selecione o alvo'
    return e
  }

  const errors = validate(fields)
  const errorCount = Object.keys(errors).length

  const set = (field: FieldKey, value: string) => setFields((f) => ({ ...f, [field]: value }))
  const touch = (field: FieldKey) => setTouched((t) => ({ ...t, [field]: true }))
  const err = (field: FieldKey) => (touched[field] || submitAttempted ? errors[field] : undefined)

  const medOptions: SelectOption[] = [
    { value: '', label: 'Sem medicamento' },
    ...medications.filter((m) => m.propertyId === farm?.id).map((m) => ({ value: m.id, label: m.commercialName })),
  ]
  const targetOptions: SelectOption[] =
    fields.targetKind === 'herd'
      ? herds.map((h) => ({ value: h.id, label: h.name }))
      : fields.targetKind === 'bovine'
        ? bovines.map((b) => ({ value: b.id, label: `${b.name}${b.earTag ? ` · ${b.earTag}` : ''}` }))
        : []

  function handleSave() {
    setSubmitAttempted(true)
    if (errorCount > 0) return
    setSaving(true)
    setTimeout(() => {
      const now = new Date().toISOString()
      const event: SanitaryEvent = {
        id: crypto.randomUUID(),
        propertyId: farm?.id ?? '',
        type: fields.type.trim(),
        scheduledDate: fields.scheduledDate,
        status: 'pendente',
        medicationId: fields.medicationId || undefined,
        herdId: fields.targetKind === 'herd' ? fields.targetId : undefined,
        bovineId: fields.targetKind === 'bovine' ? fields.targetId : undefined,
        notes: fields.notes.trim() || undefined,
        active: true,
        createdAt: now,
        updatedAt: now,
      }
      addEvent(event)
      toast.success('Evento sanitário agendado')
      setSaving(false)
      navigate(-1)
    }, 600)
  }

  return (
    <FormScreen
      title="Novo evento sanitário"
      subtitle="Agende uma ação no calendário sanitário"
      submitLabel="Agendar evento"
      onSubmit={handleSave}
      saving={saving}
      errorCount={submitAttempted ? errorCount : 0}
      canWrite={can.writeHusbandry}
      blockedMessage="Apenas produtor ou colaborador podem agendar eventos sanitários."
    >
      <FormSection title="Evento">
        <Input
          label="Tipo / descrição"
          required
          value={fields.type}
          onChange={(e) => set('type', e.target.value)}
          onBlur={() => touch('type')}
          error={err('type')}
          helperText="Ex: Vacinação botulismo, Vermifugação"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Data programada"
            type="date"
            required
            value={fields.scheduledDate}
            onChange={(e) => set('scheduledDate', e.target.value)}
            onBlur={() => touch('scheduledDate')}
            error={err('scheduledDate')}
          />
          <Select
            label="Medicamento"
            value={fields.medicationId}
            options={medOptions}
            onChange={(e) => set('medicationId', e.target.value)}
            helperText="Opcional"
          />
        </div>
      </FormSection>

      <FormSection title="Alvo">
        <Select
          label="Aplicar a"
          value={fields.targetKind}
          options={[
            { value: '', label: 'Toda a propriedade' },
            { value: 'herd', label: 'Um rebanho' },
            { value: 'bovine', label: 'Um bovino' },
          ]}
          onChange={(e) => { set('targetKind', e.target.value); set('targetId', '') }}
        />
        <AnimatePresence>
          {fields.targetKind && (
            <motion.div
              key="target"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Select
                label={fields.targetKind === 'herd' ? 'Rebanho' : 'Bovino'}
                value={fields.targetId}
                options={targetOptions}
                placeholder="Selecione..."
                onChange={(e) => set('targetId', e.target.value)}
                onBlur={() => touch('targetId')}
                error={err('targetId')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </FormSection>

      <FormSection title="Observações">
        <Textarea
          label="Notas"
          rows={3}
          value={fields.notes}
          onChange={(e) => set('notes', e.target.value)}
          helperText="Opcional"
        />
      </FormSection>
    </FormScreen>
  )
}
