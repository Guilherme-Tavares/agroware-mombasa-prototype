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
import type { Task } from '@/types/domain'

interface Fields {
  title: string
  description: string
  dueDate: string
  divisionId: string
  herdId: string
}

type FieldKey = keyof Fields

export default function TaskRegister() {
  const navigate  = useNavigate()
  const farm      = useFarmStore((s) => s.farm)
  const divisions = useFarmStore((s) => s.divisions)
  const herds     = useFarmStore((s) => s.herds)
  const addTask   = useFarmStore((s) => s.addTask)
  const toast     = useToast()
  const { can }   = useAccess()

  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [fields, setFields] = useState<Fields>({
    title: '', description: '', dueDate: '', divisionId: '', herdId: '',
  })

  function validate(f: Fields): Partial<Record<FieldKey, string>> {
    const e: Partial<Record<FieldKey, string>> = {}
    if (!f.title.trim()) e.title = 'Título é obrigatório'
    return e
  }

  const errors = validate(fields)
  const errorCount = Object.keys(errors).length

  const set = (field: FieldKey, value: string) => setFields((f) => ({ ...f, [field]: value }))
  const touch = (field: FieldKey) => setTouched((t) => ({ ...t, [field]: true }))
  const err = (field: FieldKey) => (touched[field] || submitAttempted ? errors[field] : undefined)

  const divisionOptions: SelectOption[] = [
    { value: '', label: 'Nenhuma' },
    ...divisions.map((d) => ({ value: d.id, label: d.name })),
  ]
  const herdOptions: SelectOption[] = [
    { value: '', label: 'Nenhum' },
    ...herds.map((h) => ({ value: h.id, label: h.name })),
  ]

  function handleSave() {
    setSubmitAttempted(true)
    if (errorCount > 0) return
    setSaving(true)
    setTimeout(() => {
      const now = new Date().toISOString()
      const task: Task = {
        id: crypto.randomUUID(),
        propertyId: farm?.id ?? '',
        title: fields.title.trim(),
        description: fields.description.trim() || undefined,
        dueDate: fields.dueDate || undefined,
        divisionId: fields.divisionId || undefined,
        herdId: fields.herdId || undefined,
        status: 'pendente',
        active: true,
        createdAt: now,
        updatedAt: now,
      }
      addTask(task)
      toast.success('Tarefa criada com sucesso')
      setSaving(false)
      navigate(-1)
    }, 600)
  }

  return (
    <FormScreen
      title="Nova tarefa"
      subtitle="Adicione um item à agenda da propriedade"
      submitLabel="Criar tarefa"
      onSubmit={handleSave}
      saving={saving}
      errorCount={submitAttempted ? errorCount : 0}
      canWrite={can.writeHusbandry}
      blockedMessage="Apenas produtor ou colaborador podem criar tarefas."
    >
      <FormSection title="Tarefa">
        <Input
          label="Título"
          required
          value={fields.title}
          onChange={(e) => set('title', e.target.value)}
          onBlur={() => touch('title')}
          error={err('title')}
          helperText="Ex: Reparar cerca do Piquete 3"
        />
        <Input
          label="Data prevista"
          type="date"
          value={fields.dueDate}
          onChange={(e) => set('dueDate', e.target.value)}
          helperText="Opcional"
        />
        <Textarea
          label="Descrição"
          rows={3}
          value={fields.description}
          onChange={(e) => set('description', e.target.value)}
          helperText="Opcional"
        />
      </FormSection>

      <FormSection title="Vínculo (opcional)">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Divisão"
            value={fields.divisionId}
            options={divisionOptions}
            onChange={(e) => set('divisionId', e.target.value)}
          />
          <Select
            label="Rebanho"
            value={fields.herdId}
            options={herdOptions}
            onChange={(e) => set('herdId', e.target.value)}
          />
        </div>
      </FormSection>
    </FormScreen>
  )
}
