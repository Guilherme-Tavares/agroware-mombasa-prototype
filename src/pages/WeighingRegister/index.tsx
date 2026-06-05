import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Scale } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import { formatWeight } from '@/utils/format'
import FormScreen, { FormSection } from '@/components/form/FormScreen.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import type { SelectOption } from '@/components/ui/Select.tsx'
import type { Weighing, WeighingMethod } from '@/types/domain'

interface Fields {
  bovineId: string
  date: string
  method: string
  weight: string
  carcassWeight: string
  yieldPct: string
}

type FieldKey = keyof Fields

const METHOD_OPTIONS: SelectOption[] = [
  { value: 'visual',     label: 'Visual (estimativa)' },
  { value: 'balanca',    label: 'Balança' },
  { value: 'nota_abate', label: 'Nota de abate' },
  { value: 'projecao',   label: 'Projeção' },
]

// Peso vivo: direto, ou estimado pela carcaça e rendimento (nota de abate).
function liveWeight(f: Fields): number {
  if (f.method === 'nota_abate') {
    const c = Number(f.carcassWeight)
    const y = Number(f.yieldPct)
    if (c > 0 && y > 0) return (c / y) * 100
    return 0
  }
  return Number(f.weight) || 0
}

export default function WeighingRegister() {
  const navigate   = useNavigate()
  const farm       = useFarmStore((s) => s.farm)
  const bovines    = useFarmStore((s) => s.bovines)
  const addWeighing = useFarmStore((s) => s.addWeighing)
  const toast      = useToast()
  const { can }    = useAccess()

  const today = new Date().toISOString().split('T')[0]
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [fields, setFields] = useState<Fields>({
    bovineId: '', date: today, method: 'balanca', weight: '', carcassWeight: '', yieldPct: '',
  })

  const isAbate = fields.method === 'nota_abate'

  function validate(f: Fields): Partial<Record<FieldKey, string>> {
    const e: Partial<Record<FieldKey, string>> = {}
    if (!f.bovineId) e.bovineId = 'Bovino é obrigatório'
    if (!f.date)     e.date = 'Data é obrigatória'
    if (!f.method)   e.method = 'Método é obrigatório'
    if (f.method === 'nota_abate') {
      if (!f.carcassWeight || Number(f.carcassWeight) <= 0) e.carcassWeight = 'Peso de carcaça obrigatório'
      if (!f.yieldPct || Number(f.yieldPct) <= 0 || Number(f.yieldPct) > 100) e.yieldPct = 'Rendimento entre 1 e 100%'
    } else if (!f.weight || Number(f.weight) <= 0) {
      e.weight = 'Peso deve ser maior que zero'
    }
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

  const computed = liveWeight(fields)

  function handleSave() {
    setSubmitAttempted(true)
    if (errorCount > 0) return
    setSaving(true)
    setTimeout(() => {
      const now = new Date().toISOString()
      const weighing: Weighing = {
        id: crypto.randomUUID(),
        bovineId: fields.bovineId,
        date: fields.date,
        weightKg: Number(computed.toFixed(1)),
        method: fields.method as WeighingMethod,
        carcassWeightKg: isAbate ? Number(fields.carcassWeight) : undefined,
        yieldPercentage: isAbate ? Number(fields.yieldPct) : undefined,
        active: true,
        createdAt: now,
        updatedAt: now,
      }
      addWeighing(weighing)
      toast.success(`Pesagem registrada · cache atualizado para ${formatWeight(weighing.weightKg)}`)
      setSaving(false)
      navigate(-1)
    }, 600)
  }

  return (
    <FormScreen
      title="Nova pesagem"
      subtitle="Registra a pesagem e atualiza o peso atual do bovino"
      submitLabel="Registrar pesagem"
      onSubmit={handleSave}
      saving={saving}
      errorCount={submitAttempted ? errorCount : 0}
      canWrite={can.writeHusbandry}
      blockedMessage="Apenas produtor ou colaborador podem registrar pesagens."
    >
      <FormSection title="Animal e método">
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
        <div className="grid grid-cols-2 gap-4">
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
          <Select
            label="Método"
            required
            value={fields.method}
            options={METHOD_OPTIONS}
            onChange={(e) => set('method', e.target.value)}
            onBlur={() => touch('method')}
            error={err('method')}
          />
        </div>
      </FormSection>

      <FormSection title="Peso">
        <AnimatePresence mode="wait" initial={false}>
          {isAbate ? (
            <motion.div
              key="abate"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden grid grid-cols-2 gap-4"
            >
              <Input
                label="Peso de carcaça (kg)"
                type="number"
                required
                min="0"
                step="0.1"
                value={fields.carcassWeight}
                onChange={(e) => set('carcassWeight', e.target.value)}
                onBlur={() => touch('carcassWeight')}
                error={err('carcassWeight')}
              />
              <Input
                label="Rendimento (%)"
                type="number"
                required
                min="0"
                max="100"
                step="0.1"
                value={fields.yieldPct}
                onChange={(e) => set('yieldPct', e.target.value)}
                onBlur={() => touch('yieldPct')}
                error={err('yieldPct')}
              />
            </motion.div>
          ) : (
            <motion.div
              key="direct"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Input
                label="Peso vivo (kg)"
                type="number"
                required
                min="0"
                step="0.1"
                value={fields.weight}
                onChange={(e) => set('weight', e.target.value)}
                onBlur={() => touch('weight')}
                error={err('weight')}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {computed > 0 && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary-bg text-primary">
            <Scale size={15} />
            <span className="text-caption">
              Peso vivo {isAbate ? 'estimado' : 'registrado'}:{' '}
              <strong className="font-data tabular-nums">{formatWeight(Number(computed.toFixed(1)))}</strong>
              {' '}— será o novo peso atual do bovino
            </span>
          </div>
        )}
      </FormSection>
    </FormScreen>
  )
}
