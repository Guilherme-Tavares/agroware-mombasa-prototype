import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useFarmStore } from '@/store/useFarmStore'
import { useToast } from '@/hooks/useToast'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import type { SelectOption } from '@/components/ui/Select'
import type { Herd } from '@/types/domain'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Fields {
  name: string
  purpose: string
  formedAt: string
  notes: string
}

type FieldKey = keyof Fields

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(f: Fields): Partial<Record<FieldKey, string>> {
  const e: Partial<Record<FieldKey, string>> = {}
  if (!f.name.trim()) e.name     = 'Nome é obrigatório'
  if (!f.purpose)     e.purpose  = 'Finalidade é obrigatória'
  if (!f.formedAt)    e.formedAt = 'Data de formação é obrigatória'
  return e
}

// ─── Static options ───────────────────────────────────────────────────────────

const PURPOSE_OPTIONS: SelectOption[] = [
  { value: 'recria',  label: 'Recria' },
  { value: 'engorda', label: 'Engorda' },
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

export default function HerdRegister() {
  const navigate  = useNavigate()
  const farm      = useFarmStore((s) => s.farm)
  const addHerd   = useFarmStore((s) => s.addHerd)
  const toast     = useToast()

  const today = new Date().toISOString().split('T')[0]

  const [saving,          setSaving]          = useState(false)
  const [touched,         setTouched]         = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const [fields, setFields] = useState<Fields>({
    name:     '',
    purpose:  '',
    formedAt: today,
    notes:    '',
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

    const herd: Herd = {
      id:       crypto.randomUUID(),
      farmId:   farm?.id ?? '',
      name:     fields.name.trim(),
      purpose:  fields.purpose as Herd['purpose'],
      formedAt: fields.formedAt,
      notes:    fields.notes.trim() || undefined,
    }

    addHerd(herd)
    toast.success('Rebanho cadastrado com sucesso')
    setSaving(false)
    navigate(-1)
  }

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
          <h1 className="text-title font-bold text-gray-900">Novo rebanho</h1>
          <p className="text-caption text-gray-400">Crie um lote para agrupar bovinos</p>
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
            label="Nome do rebanho"
            required
            value={fields.name}
            onChange={(e) => set('name', e.target.value)}
            onBlur={() => touch('name')}
            error={err('name')}
            helperText="Ex: Lote D, Recria Junho, Engorda 2026"
          />
          <Select
            label="Finalidade"
            required
            value={fields.purpose}
            options={PURPOSE_OPTIONS}
            placeholder="Selecione..."
            onChange={(e) => set('purpose', e.target.value)}
            onBlur={() => touch('purpose')}
            error={err('purpose')}
          />
        </div>

        {/* Formação */}
        <div className="p-5 flex flex-col gap-4">
          <SectionHeader>Formação</SectionHeader>
          <Input
            label="Data de formação do lote"
            type="date"
            required
            max={today}
            value={fields.formedAt}
            onChange={(e) => set('formedAt', e.target.value)}
            onBlur={() => touch('formedAt')}
            error={err('formedAt')}
          />
        </div>

        {/* Observações */}
        <div className="p-5 flex flex-col gap-4">
          <SectionHeader>Observações</SectionHeader>
          <Textarea
            label="Notas adicionais"
            rows={3}
            value={fields.notes}
            onChange={(e) => set('notes', e.target.value)}
            helperText="Opcional — informações relevantes sobre o lote"
          />
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="mt-6 flex gap-3 pb-4">
        <Button variant="secondary" onClick={() => navigate(-1)} className="shrink-0">
          Cancelar
        </Button>
        <Button fullWidth loading={saving} onClick={handleSave}>
          Cadastrar rebanho
        </Button>
      </div>
    </motion.div>
  )
}
