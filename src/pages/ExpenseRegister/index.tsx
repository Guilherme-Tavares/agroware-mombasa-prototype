import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import FormScreen, { FormSection } from '@/components/form/FormScreen.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import type { SelectOption } from '@/components/ui/Select.tsx'
import type { Expense } from '@/types/domain'

interface Fields {
  categoryId: string
  description: string
  amount: string
  date: string
  divisionId: string
  herdId: string
}

type FieldKey = keyof Fields

export default function ExpenseRegister() {
  const navigate   = useNavigate()
  const farm       = useFarmStore((s) => s.farm)
  const categories = useFarmStore((s) => s.expenseCategories)
  const divisions  = useFarmStore((s) => s.divisions)
  const herds      = useFarmStore((s) => s.herds)
  const addExpense = useFarmStore((s) => s.addExpense)
  const toast      = useToast()
  const { can }    = useAccess()

  const today = new Date().toISOString().split('T')[0]
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [fields, setFields] = useState<Fields>({
    categoryId: '', description: '', amount: '', date: today, divisionId: '', herdId: '',
  })

  function validate(f: Fields): Partial<Record<FieldKey, string>> {
    const e: Partial<Record<FieldKey, string>> = {}
    if (!f.categoryId)  e.categoryId = 'Categoria é obrigatória'
    if (!f.description.trim()) e.description = 'Descrição é obrigatória'
    if (!f.amount || Number(f.amount) <= 0) e.amount = 'Valor deve ser maior que zero'
    if (!f.date) e.date = 'Data é obrigatória'
    return e
  }

  const errors = validate(fields)
  const errorCount = Object.keys(errors).length
  const set = (k: FieldKey, v: string) => setFields((f) => ({ ...f, [k]: v }))
  const touch = (k: FieldKey) => setTouched((t) => ({ ...t, [k]: true }))
  const err = (k: FieldKey) => (touched[k] || submitAttempted ? errors[k] : undefined)

  const catOptions: SelectOption[] = categories
    .filter((c) => c.propertyId === farm?.id)
    .map((c) => ({ value: c.id, label: c.name }))
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
      const expense: Expense = {
        id: crypto.randomUUID(),
        propertyId: farm?.id ?? '',
        categoryId: fields.categoryId,
        divisionId: fields.divisionId || undefined,
        herdId: fields.herdId || undefined,
        description: fields.description.trim(),
        amount: Number(fields.amount),
        date: fields.date,
        active: true,
        createdAt: now,
        updatedAt: now,
      }
      addExpense(expense)
      toast.success('Despesa registrada')
      setSaving(false)
      navigate(-1)
    }, 600)
  }

  return (
    <FormScreen
      title="Nova despesa"
      subtitle="Registra um gasto e classifica por categoria"
      submitLabel="Registrar despesa"
      onSubmit={handleSave}
      saving={saving}
      errorCount={submitAttempted ? errorCount : 0}
      canWrite={can.finance}
      blockedMessage="Apenas o produtor acessa o financeiro da propriedade."
    >
      <FormSection title="Despesa">
        {catOptions.length === 0 ? (
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-dashed border-gray-200">
            <p className="text-caption text-gray-500">Nenhuma categoria cadastrada.</p>
            <button type="button" onClick={() => navigate('/expense-categories/new')} className="text-caption font-medium text-primary hover:underline shrink-0">
              Criar categoria
            </button>
          </div>
        ) : (
          <Select
            label="Categoria"
            required
            value={fields.categoryId}
            options={catOptions}
            placeholder="Selecione..."
            onChange={(e) => set('categoryId', e.target.value)}
            onBlur={() => touch('categoryId')}
            error={err('categoryId')}
          />
        )}
        <Input
          label="Descrição"
          required
          value={fields.description}
          onChange={(e) => set('description', e.target.value)}
          onBlur={() => touch('description')}
          error={err('description')}
          helperText="Ex: Compra de 1,5 t de ração"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Valor (R$)"
            type="number"
            required
            min="0"
            step="0.01"
            value={fields.amount}
            onChange={(e) => set('amount', e.target.value)}
            onBlur={() => touch('amount')}
            error={err('amount')}
          />
          <Input
            label="Data"
            type="date"
            required
            max={today}
            value={fields.date}
            onChange={(e) => set('date', e.target.value)}
            onBlur={() => touch('date')}
            error={err('date')}
          />
        </div>
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
