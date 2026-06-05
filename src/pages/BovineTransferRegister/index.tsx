import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, AlertTriangle } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import FormScreen, { FormSection } from '@/components/form/FormScreen.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import Textarea from '@/components/ui/Textarea.tsx'
import type { SelectOption } from '@/components/ui/Select.tsx'
import type { BovineTransfer } from '@/types/domain'

interface Fields {
  bovineId: string
  destinationId: string
  date: string
  reason: string
}

type FieldKey = keyof Fields

export default function BovineTransferRegister() {
  const navigate         = useNavigate()
  const farm             = useFarmStore((s) => s.farm)
  const farms            = useFarmStore((s) => s.farms)
  const activePropertyId = useFarmStore((s) => s.activePropertyId)
  const currentUserId    = useFarmStore((s) => s.currentUserId)
  const bovines          = useFarmStore((s) => s.bovines)
  const herds            = useFarmStore((s) => s.herds)
  const transferBovine   = useFarmStore((s) => s.transferBovine)
  const toast            = useToast()
  const { can }          = useAccess()

  const today = new Date().toISOString().split('T')[0]
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [fields, setFields] = useState<Fields>({
    bovineId: '', destinationId: '', date: today, reason: '',
  })

  function validate(f: Fields): Partial<Record<FieldKey, string>> {
    const e: Partial<Record<FieldKey, string>> = {}
    if (!f.bovineId)      e.bovineId = 'Bovino é obrigatório'
    if (!f.destinationId) e.destinationId = 'Destino é obrigatório'
    if (!f.date)          e.date = 'Data é obrigatória'
    return e
  }

  const errors = validate(fields)
  const errorCount = Object.keys(errors).length
  const set = (k: FieldKey, v: string) => setFields((f) => ({ ...f, [k]: v }))
  const touch = (k: FieldKey) => setTouched((t) => ({ ...t, [k]: true }))
  const err = (k: FieldKey) => (touched[k] || submitAttempted ? errors[k] : undefined)

  const bovine = bovines.find((b) => b.id === fields.bovineId)
  const bovineHerd = bovine?.herdId ? herds.find((h) => h.id === bovine.herdId) : undefined

  const bovineOptions: SelectOption[] = bovines
    .filter((b) => !b.propertyId || b.propertyId === activePropertyId)
    .map((b) => ({ value: b.id, label: `${b.name}${b.earTag ? ` · ${b.earTag}` : ''}` }))
  const destinationOptions: SelectOption[] = farms
    .filter((f) => f.id !== activePropertyId)
    .map((f) => ({ value: f.id, label: `${f.name} · ${f.city}/${f.state}` }))

  function handleSave() {
    setSubmitAttempted(true)
    if (errorCount > 0) return
    setSaving(true)
    setTimeout(() => {
      const now = new Date().toISOString()
      const transfer: BovineTransfer = {
        id: crypto.randomUUID(),
        bovineId: fields.bovineId,
        originPropertyId: activePropertyId ?? '',
        destinationPropertyId: fields.destinationId,
        userId: currentUserId ?? '',
        date: fields.date,
        reason: fields.reason.trim() || undefined,
        active: true,
        createdAt: now,
        updatedAt: now,
      }
      transferBovine(transfer)
      const destName = farms.find((f) => f.id === fields.destinationId)?.name ?? 'destino'
      toast.success(`Bovino transferido para ${destName}`)
      setSaving(false)
      navigate(-1)
    }, 600)
  }

  return (
    <FormScreen
      title="Transferência de bovino"
      subtitle="Move o bovino para outra propriedade"
      submitLabel="Confirmar transferência"
      onSubmit={handleSave}
      saving={saving}
      errorCount={submitAttempted ? errorCount : 0}
      canWrite={can.transfer}
      blockedMessage="Apenas o produtor pode transferir bovinos entre propriedades."
    >
      <FormSection title="Bovino">
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
        {bovine && (
          <div className="flex items-center gap-2 text-caption text-gray-500">
            <span>{farm?.name}{bovineHerd ? ` · ${bovineHerd.name}` : ''}</span>
            <ArrowRight size={13} className="text-gray-300" />
            <span className="text-gray-900 font-medium">
              {farms.find((f) => f.id === fields.destinationId)?.name ?? 'destino'}
            </span>
          </div>
        )}
      </FormSection>

      <FormSection title="Destino">
        {destinationOptions.length === 0 ? (
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-dashed border-gray-200">
            <p className="text-caption text-gray-500">Você precisa de outra propriedade para transferir.</p>
            <button type="button" onClick={() => navigate('/properties/new')} className="text-caption font-medium text-primary hover:underline shrink-0">
              Criar propriedade
            </button>
          </div>
        ) : (
          <Select
            label="Propriedade de destino"
            required
            value={fields.destinationId}
            options={destinationOptions}
            placeholder="Selecione..."
            onChange={(e) => set('destinationId', e.target.value)}
            onBlur={() => touch('destinationId')}
            error={err('destinationId')}
          />
        )}
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
        <Textarea
          label="Motivo"
          rows={2}
          value={fields.reason}
          onChange={(e) => set('reason', e.target.value)}
          helperText="Opcional"
        />
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-warning-bg text-warning-dark text-caption">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>O bovino sai do rebanho atual e passa a pertencer à propriedade de destino.</span>
        </div>
      </FormSection>
    </FormScreen>
  )
}
