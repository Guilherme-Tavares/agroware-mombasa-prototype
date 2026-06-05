import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import FormScreen, { FormSection } from '@/components/form/FormScreen.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import type { SelectOption } from '@/components/ui/Select.tsx'
import type { ExpenseGroup } from '@/types/domain'

interface Fields {
  name: string
  group: string
}

type FieldKey = keyof Fields

const GROUP_OPTIONS: SelectOption[] = [
  { value: 'insumo_alimenticio', label: 'Insumo alimentício' },
  { value: 'insumo_sanitario',   label: 'Insumo sanitário' },
  { value: 'infraestrutura',     label: 'Infraestrutura' },
  { value: 'servico',            label: 'Serviço' },
  { value: 'outro',              label: 'Outro' },
]

export default function ExpenseCategoryRegister() {
  const navigate   = useNavigate()
  const { id }     = useParams<{ id: string }>()
  const isEdit     = Boolean(id)
  const farm       = useFarmStore((s) => s.farm)
  const categories = useFarmStore((s) => s.expenseCategories)
  const existing   = useFarmStore((s) => s.expenseCategories.find((c) => c.id === id))
  const addCategory = useFarmStore((s) => s.addExpenseCategory)
  const updateCategory = useFarmStore((s) => s.updateExpenseCategory)
  const toast      = useToast()
  const { can }    = useAccess()

  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [fields, setFields] = useState<Fields>({
    name: existing?.name ?? '',
    group: existing?.group ?? '',
  })

  function validate(f: Fields): Partial<Record<FieldKey, string>> {
    const e: Partial<Record<FieldKey, string>> = {}
    if (!f.name.trim()) e.name = 'Nome é obrigatório'
    else if (categories.some(
      (c) => c.id !== id && c.propertyId === farm?.id && c.name.toLowerCase() === f.name.trim().toLowerCase(),
    )) e.name = 'Já existe uma categoria com este nome'
    if (!f.group) e.group = 'Grupo é obrigatório'
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
      const common = { name: fields.name.trim(), group: fields.group as ExpenseGroup }
      if (isEdit && id) {
        updateCategory(id, { ...common, updatedAt: now })
        toast.success('Categoria atualizada')
      } else {
        addCategory({
          id: crypto.randomUUID(),
          propertyId: farm?.id ?? '',
          ...common,
          active: true,
          createdAt: now,
          updatedAt: now,
        })
        toast.success('Categoria de despesa cadastrada')
      }
      setSaving(false)
      navigate(-1)
    }, 600)
  }

  return (
    <FormScreen
      title={isEdit ? 'Editar categoria' : 'Nova categoria de despesa'}
      subtitle="Classifica despesas e alimenta os relatórios"
      submitLabel={isEdit ? 'Atualizar' : 'Cadastrar categoria'}
      onSubmit={handleSave}
      saving={saving}
      errorCount={submitAttempted ? errorCount : 0}
      canWrite={can.finance}
      blockedMessage="Apenas o produtor acessa o financeiro da propriedade."
    >
      <FormSection title="Identificação">
        <Input
          label="Nome da categoria"
          required
          value={fields.name}
          onChange={(e) => set('name', e.target.value)}
          onBlur={() => touch('name')}
          error={err('name')}
          helperText="Ex: Ração e suplemento, Cercas e instalações"
        />
        <Select
          label="Grupo"
          required
          value={fields.group}
          options={GROUP_OPTIONS}
          placeholder="Selecione..."
          onChange={(e) => set('group', e.target.value)}
          onBlur={() => touch('group')}
          error={err('group')}
        />
      </FormSection>
    </FormScreen>
  )
}
