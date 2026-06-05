import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Camera, X } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import FormScreen, { FormSection } from '@/components/form/FormScreen.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import type { SelectOption } from '@/components/ui/Select.tsx'
import type { Bovine, BovineOrigin, BovineSex } from '@/types/domain'

interface Fields {
  name: string
  earTag: string
  sex: string
  breed: string
  birthDate: string
  currentWeight: string
  lastWeighDate: string
  origin: string
  herdId: string
}

type FieldKey = keyof Fields

function validate(f: Fields): Partial<Record<FieldKey, string>> {
  const e: Partial<Record<FieldKey, string>> = {}
  if (!f.name.trim())                              e.name          = 'Nome é obrigatório'
  if (!f.sex)                                      e.sex           = 'Sexo é obrigatório'
  if (!f.breed.trim())                             e.breed         = 'Raça é obrigatória'
  if (!f.birthDate)                                e.birthDate     = 'Data de nascimento é obrigatória'
  if (!f.currentWeight || Number(f.currentWeight) <= 0)
                                                   e.currentWeight = 'Peso deve ser maior que zero'
  if (!f.lastWeighDate)                            e.lastWeighDate = 'Data de pesagem é obrigatória'
  if (!f.origin)                                   e.origin        = 'Origem é obrigatória'
  return e
}

const SEX_OPTIONS: SelectOption[] = [
  { value: 'M', label: 'Macho' },
  { value: 'F', label: 'Fêmea' },
]

const ORIGIN_OPTIONS: SelectOption[] = [
  { value: 'comprado',    label: 'Comprado' },
  { value: 'doacao',      label: 'Doação' },
  { value: 'transferido', label: 'Transferido' },
]

export default function BovineRegister() {
  const navigate     = useNavigate()
  const { id }       = useParams<{ id: string }>()
  const isEdit       = Boolean(id)

  const farm         = useFarmStore((s) => s.farm)
  const herds        = useFarmStore((s) => s.herds)
  const existing     = useFarmStore((s) => s.bovines.find((b) => b.id === id))
  const addBovine    = useFarmStore((s) => s.addBovine)
  const updateBovine = useFarmStore((s) => s.updateBovine)
  const toast        = useToast()
  const { can }      = useAccess()

  const fileRef = useRef<HTMLInputElement>(null)
  const today   = new Date().toISOString().split('T')[0]

  const [photo,           setPhoto]           = useState<string | undefined>(existing?.photoBase64)
  const [saving,          setSaving]          = useState(false)
  const [touched,         setTouched]         = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const [fields, setFields] = useState<Fields>({
    name:          existing?.name               ?? '',
    earTag:        existing?.earTag             ?? '',
    sex:           existing?.sex                ?? '',
    breed:         existing?.breed              ?? '',
    birthDate:     existing?.birthDate          ?? '',
    currentWeight: existing?.currentWeight != null ? String(existing.currentWeight) : '',
    lastWeighDate: existing?.lastWeighDate      ?? '',
    origin:        existing?.origin             ?? '',
    herdId:        existing?.herdId             ?? '',
  })

  const errors = validate(fields)
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

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPhoto(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    setSubmitAttempted(true)
    if (errorCount > 0) return

    setSaving(true)
    await new Promise((r) => setTimeout(r, 600))

    const now = new Date().toISOString()
    const common = {
      name:          fields.name.trim(),
      earTag:        fields.earTag.trim() || undefined,
      sex:           fields.sex as BovineSex,
      breed:         fields.breed.trim(),
      birthDate:     fields.birthDate,
      currentWeight: Number(fields.currentWeight),
      lastWeighDate: fields.lastWeighDate,
      origin:        fields.origin as BovineOrigin,
      herdId:        fields.herdId || undefined,
      photoBase64:   photo,
    }

    if (isEdit && id) {
      updateBovine(id, { ...common, updatedAt: now })
      toast.success('Bovino atualizado com sucesso')
    } else {
      const bovine: Bovine = {
        id: crypto.randomUUID(),
        propertyId: farm?.id,
        ...common,
        active: true,
        createdAt: now,
        updatedAt: now,
      }
      addBovine(bovine)
      toast.success('Bovino cadastrado com sucesso')
    }

    setSaving(false)
    navigate(-1)
  }

  const herdOptions: SelectOption[] = [
    { value: '', label: 'Sem rebanho' },
    ...herds.map((h) => ({ value: h.id, label: h.name })),
  ]

  return (
    <FormScreen
      title={isEdit ? 'Editar bovino' : 'Novo bovino'}
      subtitle={isEdit ? 'Atualize os dados do animal' : 'Preencha os dados do animal'}
      submitLabel={isEdit ? 'Atualizar' : 'Cadastrar bovino'}
      onSubmit={handleSave}
      saving={saving}
      errorCount={submitAttempted ? errorCount : 0}
      canWrite={can.writeHusbandry}
      blockedMessage="Apenas produtor ou colaborador podem cadastrar ou editar bovinos."
    >
      {/* Foto */}
      <FormSection title="Foto">
        <div
          onClick={() => fileRef.current?.click()}
          className={[
            'relative w-28 h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden',
            photo ? 'border-transparent' : 'border-gray-200 hover:border-primary hover:bg-primary/5',
          ].join(' ')}
        >
          {photo ? (
            <>
              <img src={photo} alt="Bovino" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPhoto(undefined) }}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80 transition-colors"
                aria-label="Remover foto"
              >
                <X size={12} />
              </button>
            </>
          ) : (
            <>
              <Camera size={22} className="text-gray-300 mb-1" />
              <span className="text-[11px] text-gray-400">Adicionar foto</span>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
      </FormSection>

      {/* Identificação */}
      <FormSection title="Identificação">
        <Input
          label="Nome / apelido"
          required
          value={fields.name}
          onChange={(e) => set('name', e.target.value)}
          onBlur={() => touch('name')}
          error={err('name')}
        />
        <Input
          label="Brinco (nº de identificação)"
          value={fields.earTag}
          onChange={(e) => set('earTag', e.target.value)}
        />
      </FormSection>

      {/* Dados biológicos */}
      <FormSection title="Dados biológicos">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Sexo"
            required
            value={fields.sex}
            options={SEX_OPTIONS}
            placeholder="Selecione..."
            onChange={(e) => set('sex', e.target.value)}
            onBlur={() => touch('sex')}
            error={err('sex')}
          />
          <Input
            label="Raça"
            required
            value={fields.breed}
            onChange={(e) => set('breed', e.target.value)}
            onBlur={() => touch('breed')}
            error={err('breed')}
          />
        </div>
        <Input
          label="Data de nascimento"
          type="date"
          required
          max={today}
          value={fields.birthDate}
          onChange={(e) => set('birthDate', e.target.value)}
          onBlur={() => touch('birthDate')}
          error={err('birthDate')}
        />
      </FormSection>

      {/* Peso */}
      <FormSection title="Peso">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Peso atual (kg)"
            type="number"
            required
            min="0"
            step="0.1"
            value={fields.currentWeight}
            onChange={(e) => set('currentWeight', e.target.value)}
            onBlur={() => touch('currentWeight')}
            error={err('currentWeight')}
          />
          <Input
            label="Data da pesagem"
            type="date"
            required
            max={today}
            value={fields.lastWeighDate}
            onChange={(e) => set('lastWeighDate', e.target.value)}
            onBlur={() => touch('lastWeighDate')}
            error={err('lastWeighDate')}
          />
        </div>
      </FormSection>

      {/* Origem & Rebanho */}
      <FormSection title="Origem & Rebanho">
        <Select
          label="Origem"
          required
          value={fields.origin}
          options={ORIGIN_OPTIONS}
          placeholder="Selecione..."
          onChange={(e) => set('origin', e.target.value)}
          onBlur={() => touch('origin')}
          error={err('origin')}
        />
        {herds.length > 0 ? (
          <Select
            label="Rebanho"
            value={fields.herdId}
            options={herdOptions}
            onChange={(e) => set('herdId', e.target.value)}
            helperText="Opcional — associa o animal a um lote existente"
          />
        ) : (
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-dashed border-gray-200">
            <p className="text-caption text-gray-500">
              Nenhum rebanho cadastrado. O animal será criado sem lote.
            </p>
            <button
              type="button"
              onClick={() => navigate('/herds/new')}
              className="text-caption font-medium text-primary hover:underline shrink-0"
            >
              Cadastrar rebanho
            </button>
          </div>
        )}
      </FormSection>
    </FormScreen>
  )
}
