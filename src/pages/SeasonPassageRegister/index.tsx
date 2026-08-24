import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import { formatGMD } from '@/utils/format'
import FormScreen, { FormSection } from '@/components/form/FormScreen.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import type { SelectOption } from '@/components/ui/Select.tsx'
import type { SeasonPassage } from '@/types/domain'

interface Fields {
  herdId: string
  seasonId: string
  initialWeight: string
  finalWeight: string
  headCount: string
  days: string
}

type FieldKey = keyof Fields

function daysBetween(start: string, end: string): number {
  if (!start || !end) return 0
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return ms > 0 ? Math.round(ms / 86_400_000) : 0
}

function gmdOf(f: Fields): number {
  const d = Number(f.days)
  const gain = Number(f.finalWeight) - Number(f.initialWeight)
  return d > 0 && gain > 0 ? gain / d : 0
}

export default function SeasonPassageRegister() {
  const navigate = useNavigate()
  const farm     = useFarmStore((s) => s.farm)
  const herds    = useFarmStore((s) => s.herds)
  const seasons  = useFarmStore((s) => s.seasons)
  const addPassage = useFarmStore((s) => s.addSeasonPassage)
  const toast    = useToast()
  const { can }  = useAccess()

  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [fields, setFields] = useState<Fields>({
    herdId: '', seasonId: '', initialWeight: '', finalWeight: '', headCount: '', days: '',
  })

  function validate(f: Fields): Partial<Record<FieldKey, string>> {
    const e: Partial<Record<FieldKey, string>> = {}
    if (!f.herdId)   e.herdId = 'Rebanho é obrigatório'
    if (!f.seasonId) e.seasonId = 'Temporada é obrigatória'
    if (!f.initialWeight || Number(f.initialWeight) <= 0) e.initialWeight = 'Peso inicial inválido'
    if (!f.finalWeight || Number(f.finalWeight) <= 0) e.finalWeight = 'Peso final inválido'
    if (f.initialWeight && f.finalWeight && Number(f.finalWeight) < Number(f.initialWeight))
      e.finalWeight = 'Final deve ser ≥ inicial'
    if (!f.days || Number(f.days) <= 0) e.days = 'Dias deve ser maior que zero'
    return e
  }

  const errors = validate(fields)
  const errorCount = Object.keys(errors).length
  const set = (k: FieldKey, v: string) => setFields((f) => ({ ...f, [k]: v }))
  const touch = (k: FieldKey) => setTouched((t) => ({ ...t, [k]: true }))
  const err = (k: FieldKey) => (touched[k] || submitAttempted ? errors[k] : undefined)

  const propSeasons = seasons.filter((s) => !s.propertyId || s.propertyId === farm?.id)
  const herdOptions: SelectOption[] = herds.map((h) => ({ value: h.id, label: h.name }))
  const seasonOptions: SelectOption[] = propSeasons.map((s) => ({ value: s.id, label: s.name }))

  function onSeasonChange(id: string) {
    set('seasonId', id)
    const s = propSeasons.find((x) => x.id === id)
    if (s) set('days', String(daysBetween(s.startDate, s.endDate)))
  }

  const gmd = gmdOf(fields)

  function handleSave() {
    setSubmitAttempted(true)
    if (errorCount > 0) return
    setSaving(true)
    setTimeout(() => {
      const now = new Date().toISOString()
      const passage: SeasonPassage = {
        id: crypto.randomUUID(),
        herdId: fields.herdId,
        seasonId: fields.seasonId,
        initialWeight: Number(fields.initialWeight),
        finalWeight: Number(fields.finalWeight),
        headCount: fields.headCount ? Number(fields.headCount) : undefined,
        days: Number(fields.days),
        gmd: Number(gmd.toFixed(3)),
        active: true,
        createdAt: now,
        updatedAt: now,
      }
      addPassage(passage)
      toast.success(`Passagem registrada · GMD ${formatGMD(passage.gmd)}`)
      setSaving(false)
      navigate(-1)
    }, 600)
  }

  return (
    <FormScreen
      title="Passagem por temporada (GMD)"
      subtitle="Registra o desempenho do lote e calcula o GMD"
      submitLabel="Registrar passagem"
      onSubmit={handleSave}
      saving={saving}
      errorCount={submitAttempted ? errorCount : 0}
      canWrite={can.writeHusbandry}
      blockedMessage="Apenas produtor ou colaborador podem registrar passagens."
    >
      <FormSection title="Lote e período">
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
          <Select
            label="Temporada"
            required
            value={fields.seasonId}
            options={seasonOptions}
            placeholder="Selecione..."
            onChange={(e) => onSeasonChange(e.target.value)}
            onBlur={() => touch('seasonId')}
            error={err('seasonId')}
          />
          <Input
            label="Dias no período"
            type="number"
            required
            min="1"
            value={fields.days}
            onChange={(e) => set('days', e.target.value)}
            onBlur={() => touch('days')}
            error={err('days')}
            helperText="Preenchido pela temporada"
          />
        </div>
      </FormSection>

      <FormSection title="Pesos médios">
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Inicial (kg)"
            type="number"
            required
            min="0"
            step="0.1"
            value={fields.initialWeight}
            onChange={(e) => set('initialWeight', e.target.value)}
            onBlur={() => touch('initialWeight')}
            error={err('initialWeight')}
          />
          <Input
            label="Final (kg)"
            type="number"
            required
            min="0"
            step="0.1"
            value={fields.finalWeight}
            onChange={(e) => set('finalWeight', e.target.value)}
            onBlur={() => touch('finalWeight')}
            error={err('finalWeight')}
          />
          <Input
            label="Cabeças"
            type="number"
            min="0"
            value={fields.headCount}
            onChange={(e) => set('headCount', e.target.value)}
            helperText="Opcional"
          />
        </div>

        {gmd > 0 && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary-bg text-primary">
            <TrendingUp size={15} />
            <span className="text-caption">
              GMD calculado:{' '}
              <strong className="font-data tabular-nums">{formatGMD(Number(gmd.toFixed(3)))}</strong>
            </span>
          </div>
        )}
      </FormSection>
    </FormScreen>
  )
}
