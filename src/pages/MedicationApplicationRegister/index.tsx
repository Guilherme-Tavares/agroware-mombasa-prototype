import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Syringe, AlertTriangle } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import FormScreen, { FormSection } from '@/components/form/FormScreen.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import type { SelectOption } from '@/components/ui/Select.tsx'
import type { MedicationApplication, DoseUnit } from '@/types/domain'

interface Fields {
  bovineId: string
  medicationId: string
  date: string
  dose: string
  doseUnit: string
}

type FieldKey = keyof Fields

const DOSE_UNIT_OPTIONS: SelectOption[] = [
  { value: 'ml', label: 'ml' },
  { value: 'g', label: 'g' },
  { value: 'doses', label: 'doses' },
]

export default function MedicationApplicationRegister() {
  const navigate    = useNavigate()
  const farm        = useFarmStore((s) => s.farm)
  const bovines     = useFarmStore((s) => s.bovines)
  const medications = useFarmStore((s) => s.medications)
  const stocks      = useFarmStore((s) => s.medicationStocks)
  const applyMedication = useFarmStore((s) => s.applyMedication)
  const toast       = useToast()
  const { can }     = useAccess()

  const today = new Date().toISOString().split('T')[0]
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [fields, setFields] = useState<Fields>({
    bovineId: '', medicationId: '', date: today, dose: '', doseUnit: 'ml',
  })

  function validate(f: Fields): Partial<Record<FieldKey, string>> {
    const e: Partial<Record<FieldKey, string>> = {}
    if (!f.bovineId)     e.bovineId = 'Bovino é obrigatório'
    if (!f.medicationId) e.medicationId = 'Medicamento é obrigatório'
    if (!f.date)         e.date = 'Data é obrigatória'
    if (!f.dose || Number(f.dose) <= 0) e.dose = 'Dose deve ser maior que zero'
    if (!f.doseUnit)     e.doseUnit = 'Unidade é obrigatória'
    return e
  }

  const errors = validate(fields)
  const errorCount = Object.keys(errors).length
  const set = (k: FieldKey, v: string) => setFields((f) => ({ ...f, [k]: v }))
  const touch = (k: FieldKey) => setTouched((t) => ({ ...t, [k]: true }))
  const err = (k: FieldKey) => (touched[k] || submitAttempted ? errors[k] : undefined)

  const bovineOptions: SelectOption[] = bovines
    .filter((b) => !b.propertyId || b.propertyId === farm?.id)
    .map((b) => ({ value: b.id, label: `${b.name}${b.earTag ? ` · ${b.earTag}` : ''}` }))
  const medOptions: SelectOption[] = medications
    .filter((m) => m.propertyId === farm?.id)
    .map((m) => ({ value: m.id, label: m.commercialName }))

  // Estoque atual do medicamento selecionado (para aviso de saldo).
  const currentStock = fields.medicationId
    ? stocks.find((s) => s.medicationId === fields.medicationId && s.propertyId === farm?.id)
    : undefined
  const insufficient = currentStock
    && currentStock.unit === fields.doseUnit
    && Number(fields.dose) > currentStock.quantity

  function handleSave() {
    setSubmitAttempted(true)
    if (errorCount > 0) return
    setSaving(true)
    setTimeout(() => {
      const now = new Date().toISOString()
      const application: MedicationApplication = {
        id: crypto.randomUUID(),
        bovineId: fields.bovineId,
        medicationId: fields.medicationId,
        appliedAt: `${fields.date}T00:00:00`,
        dose: Number(fields.dose),
        doseUnit: fields.doseUnit as DoseUnit,
        active: true,
        createdAt: now,
        updatedAt: now,
      }
      applyMedication(application)
      toast.success('Aplicação registrada · estoque debitado')
      setSaving(false)
      navigate(-1)
    }, 600)
  }

  return (
    <FormScreen
      title="Aplicação de medicamento"
      subtitle="Registra a aplicação e debita o estoque"
      submitLabel="Registrar aplicação"
      onSubmit={handleSave}
      saving={saving}
      errorCount={submitAttempted ? errorCount : 0}
      canWrite={can.writeHusbandry}
      blockedMessage="Apenas produtor ou colaborador podem registrar aplicações."
    >
      <FormSection title="Aplicação">
        <Select
          label="Bovino"
          required
          value={fields.bovineId}
          options={bovineOptions}
          placeholder="Selecione..."
          onChange={(e) => set('bovineId', e.target.value)}
          onBlur={() => touch('bovineId')}
          error={err('bovineId')}
        />
        <Select
          label="Medicamento"
          required
          value={fields.medicationId}
          options={medOptions}
          placeholder="Selecione..."
          onChange={(e) => set('medicationId', e.target.value)}
          onBlur={() => touch('medicationId')}
          error={err('medicationId')}
        />
        {currentStock && (
          <p className="text-caption text-gray-400 -mt-1">
            Estoque atual: <span className="font-data tabular-nums">{currentStock.quantity} {currentStock.unit}</span>
          </p>
        )}
      </FormSection>

      <FormSection title="Dose">
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-4">
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
          <Input
            label="Dose"
            type="number"
            required
            min="0"
            step="0.1"
            value={fields.dose}
            onChange={(e) => set('dose', e.target.value)}
            onBlur={() => touch('dose')}
            error={err('dose')}
          />
          <Select
            label="Unidade"
            required
            value={fields.doseUnit}
            options={DOSE_UNIT_OPTIONS}
            onChange={(e) => set('doseUnit', e.target.value)}
            onBlur={() => touch('doseUnit')}
            error={err('doseUnit')}
          />
        </div>

        {insufficient && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-warning-bg text-warning-dark">
            <AlertTriangle size={15} />
            <span className="text-caption">
              Dose acima do estoque disponível ({currentStock?.quantity} {currentStock?.unit}). O saldo ficará zerado.
            </span>
          </div>
        )}
        {!insufficient && Number(fields.dose) > 0 && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary-bg text-primary">
            <Syringe size={15} />
            <span className="text-caption">Debita {fields.dose} {fields.doseUnit} do estoque ao registrar.</span>
          </div>
        )}
      </FormSection>
    </FormScreen>
  )
}
