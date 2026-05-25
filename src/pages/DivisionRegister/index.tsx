import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useFarmStore } from '@/store/useFarmStore'
import { useToast } from '@/hooks/useToast'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import type { SelectOption } from '@/components/ui/Select'
import type { Division } from '@/types/domain'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Fields {
  name: string
  area: string
  type: string
  status: string
  forageId: string
  forageStartDate: string
}

type FieldKey = keyof Fields

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(f: Fields): Partial<Record<FieldKey, string>> {
  const e: Partial<Record<FieldKey, string>> = {}
  if (!f.name.trim())              e.name   = 'Nome é obrigatório'
  if (!f.area || Number(f.area) <= 0)
                                   e.area   = 'Área deve ser maior que zero'
  if (!f.type)                     e.type   = 'Tipo é obrigatório'
  if (!f.status)                   e.status = 'Status é obrigatório'
  return e
}

// ─── Static options ───────────────────────────────────────────────────────────

const TYPE_OPTIONS: SelectOption[] = [
  { value: 'pasture', label: 'Pastagem' },
  { value: 'paddock', label: 'Piquete' },
  { value: 'reserve', label: 'Reserva' },
  { value: 'corral',  label: 'Curral' },
]

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'active',   label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
      {children}
    </p>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DivisionRegister() {
  const navigate    = useNavigate()
  const farm        = useFarmStore((s) => s.farm)
  const forages     = useFarmStore((s) => s.forages)
  const addDivision = useFarmStore((s) => s.addDivision)
  const toast       = useToast()

  const today = new Date().toISOString().split('T')[0]

  const [saving,          setSaving]          = useState(false)
  const [touched,         setTouched]         = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const [fields, setFields] = useState<Fields>({
    name:            '',
    area:            '',
    type:            '',
    status:          'active',
    forageId:        '',
    forageStartDate: '',
  })

  const errors     = validate(fields)
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

  async function handleSave() {
    setSubmitAttempted(true)
    if (errorCount > 0) return

    setSaving(true)
    await new Promise((r) => setTimeout(r, 600))

    const division: Division = {
      id:              crypto.randomUUID(),
      farmId:          farm?.id ?? '',
      name:            fields.name.trim(),
      area:            Number(fields.area),
      type:            fields.type as Division['type'],
      status:          fields.status as Division['status'],
      forageId:        fields.forageId   || undefined,
      forageStartDate: fields.forageStartDate || undefined,
      polygon:         [],
    }

    addDivision(division)
    toast.success('Divisão cadastrada com sucesso')
    setSaving(false)
    navigate(-1)
  }

  const forageOptions: SelectOption[] = [
    { value: '', label: 'Sem forrageira' },
    ...forages.map((f) => ({ value: f.id, label: f.name })),
  ]

  const hasForage = Boolean(fields.forageId)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="max-w-xl mx-auto"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-title font-bold text-gray-900">Nova divisão</h1>
          <p className="text-caption text-gray-400">Cadastre um piquete, pastagem ou curral</p>
        </div>
      </div>

      {/* ── Error banner ── */}
      <AnimatePresence>
        {submitAttempted && errorCount > 0 && (
          <motion.div
            key="err-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <p className="text-caption text-alert bg-alert/10 px-3 py-2.5 rounded-xl">
              Corrija {errorCount} campo{errorCount > 1 ? 's' : ''} obrigatório{errorCount > 1 ? 's' : ''} antes de salvar
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Form card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">

        {/* Identificação */}
        <div className="p-5 flex flex-col gap-4">
          <SectionHeader>Identificação</SectionHeader>
          <Input
            label="Nome da divisão"
            required
            value={fields.name}
            onChange={(e) => set('name', e.target.value)}
            onBlur={() => touch('name')}
            error={err('name')}
            helperText="Ex: Piquete 6, Curral A, Reserva Norte"
          />
        </div>

        {/* Área & Tipo */}
        <div className="p-5 flex flex-col gap-4">
          <SectionHeader>Área & Tipo</SectionHeader>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Área (ha)"
              type="number"
              required
              min="0"
              step="0.1"
              value={fields.area}
              onChange={(e) => set('area', e.target.value)}
              onBlur={() => touch('area')}
              error={err('area')}
            />
            <Select
              label="Status"
              required
              value={fields.status}
              options={STATUS_OPTIONS}
              onChange={(e) => set('status', e.target.value)}
              onBlur={() => touch('status')}
              error={err('status')}
            />
          </div>
          <Select
            label="Tipo de divisão"
            required
            value={fields.type}
            options={TYPE_OPTIONS}
            placeholder="Selecione..."
            onChange={(e) => set('type', e.target.value)}
            onBlur={() => touch('type')}
            error={err('type')}
          />
        </div>

        {/* Forrageira */}
        <div className="p-5 flex flex-col gap-4">
          <SectionHeader>Forrageira</SectionHeader>
          <Select
            label="Espécie forrageira"
            value={fields.forageId}
            options={forageOptions}
            onChange={(e) => {
              set('forageId', e.target.value)
              if (!e.target.value) set('forageStartDate', '')
            }}
            helperText="Opcional"
          />
          <AnimatePresence>
            {hasForage && (
              <motion.div
                key="forage-date"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Input
                  label="Data de implantação"
                  type="date"
                  max={today}
                  value={fields.forageStartDate}
                  onChange={(e) => set('forageStartDate', e.target.value)}
                  helperText="Quando a forrageira foi plantada ou iniciada"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="mt-6 flex gap-3 pb-4">
        <Button variant="secondary" onClick={() => navigate(-1)} className="shrink-0">
          Cancelar
        </Button>
        <Button fullWidth loading={saving} onClick={handleSave}>
          Cadastrar divisão
        </Button>
      </div>
    </motion.div>
  )
}
