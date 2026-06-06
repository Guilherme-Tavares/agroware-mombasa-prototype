import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Grid3x3, Beef, Droplets, Plus, Check } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import Button from '@/components/ui/Button.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import type { Division, DivisionType, Herd, HerdPurpose, FeedTrough, TroughMaterial } from '@/types/domain'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AddTarget = 'division' | 'herd' | 'trough'

interface MapAddPanelProps {
  onClose: () => void
  onAddDivision: (divisionId: string) => void
  onAddElement: (type: 'herd' | 'trough', elementId: string) => void
}

const DIVISION_TYPE_OPTIONS = [
  { value: 'pasto',       label: 'Pastagem'    },
  { value: 'reserva',     label: 'Reserva'     },
  { value: 'curral',      label: 'Curral'      },
  { value: 'manga',       label: 'Manga'       },
  { value: 'instalacao',  label: 'Instalação'  },
]

const HERD_PURPOSE_OPTIONS = [
  { value: 'recria',  label: 'Recria'  },
  { value: 'engorda', label: 'Engorda' },
  { value: 'misto',   label: 'Misto'   },
]

const TROUGH_MATERIAL_OPTIONS = [
  { value: 'concreto', label: 'Concreto' },
  { value: 'plastico', label: 'Plástico' },
  { value: 'madeira',  label: 'Madeira'  },
  { value: 'metal',    label: 'Metal'    },
]

// ─── Tab button ───────────────────────────────────────────────────────────────

function Tab({ active, icon, label, onClick }: {
  active: boolean; icon: React.ReactNode; label: string; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex-1 flex flex-col items-center gap-1 py-3 rounded-xl text-button transition-colors',
        active ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50',
      ].join(' ')}
    >
      {icon}
      <span className="text-[11px]">{label}</span>
    </button>
  )
}

// ─── Existing element row ─────────────────────────────────────────────────────

function ElementRow({
  label, meta, placed, onClick,
}: { label: string; meta: string; placed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={placed}
      onClick={placed ? undefined : onClick}
      className={[
        'flex items-center justify-between w-full px-3 py-2.5 rounded-xl border transition-colors text-left',
        placed
          ? 'border-gray-100 bg-gray-50 cursor-not-allowed'
          : 'border-gray-200 hover:border-primary hover:bg-primary-bg',
      ].join(' ')}
    >
      <span className={`text-body truncate ${placed ? 'text-gray-400' : 'text-gray-900'}`}>{label}</span>
      {placed ? (
        <span className="flex items-center gap-1 text-caption text-gray-400 shrink-0 ml-2">
          <Check size={11} />
          No mapa
        </span>
      ) : (
        <span className="text-caption text-gray-400 shrink-0 ml-2">{meta}</span>
      )}
    </button>
  )
}

// ─── Division form ────────────────────────────────────────────────────────────

function DivisionForm({ onDone }: { onDone: (divisionId: string) => void }) {
  const farm        = useFarmStore((s) => s.farm)
  const divisions   = useFarmStore((s) => s.divisions)
  const addDivision = useFarmStore((s) => s.addDivision)

  const [name, setName] = useState('')
  const [type, setType] = useState<DivisionType>('pasto')

  const farmDivisions = useMemo(
    () => divisions.filter((d) => farm && d.farmId === farm.id),
    [divisions, farm],
  )

  function handleCreate() {
    if (!name.trim() || !farm) return
    const div: Division = {
      id:        crypto.randomUUID(),
      farmId:    farm.id,
      name:      name.trim(),
      area:      0,
      type,
      status:    'active',
      polygon:   [],
      active:    true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addDivision(div)
    onDone(div.id)
  }

  const DIVISION_TYPE_LABEL: Record<string, string> = {
    pasto: 'Pastagem', reserva: 'Reserva', curral: 'Curral',
    manga: 'Manga', instalacao: 'Instalação',
  }

  return (
    <div className="space-y-4">
      {farmDivisions.length > 0 && (
        <div>
          <p className="text-caption text-gray-400 mb-2 uppercase tracking-wide font-medium">Divisões cadastradas</p>
          <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto">
            {farmDivisions.map((d) => (
              <ElementRow
                key={d.id}
                label={d.name}
                meta={DIVISION_TYPE_LABEL[d.type] ?? d.type}
                placed={d.polygon.length >= 3}
                onClick={() => onDone(d.id)}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-caption text-gray-400">ou cadastrar nova</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
        </div>
      )}

      <Input
        label="Nome da divisão"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Select
        label="Tipo"
        value={type}
        options={DIVISION_TYPE_OPTIONS}
        onChange={(e) => setType(e.target.value as DivisionType)}
      />
      <Button
        variant="primary"
        fullWidth
        icon={<Plus size={14} />}
        disabled={!name.trim()}
        onClick={handleCreate}
      >
        Criar e demarcar
      </Button>
    </div>
  )
}

// ─── Herd form ────────────────────────────────────────────────────────────────

function HerdForm({ onDone }: { onDone: (herdId: string) => void }) {
  const farm        = useFarmStore((s) => s.farm)
  const herds       = useFarmStore((s) => s.herds)
  const allocations = useFarmStore((s) => s.allocations)
  const addHerd     = useFarmStore((s) => s.addHerd)

  const [name, setName]       = useState('')
  const [purpose, setPurpose] = useState<HerdPurpose>('recria')

  const farmHerds = useMemo(
    () => herds.filter((h) => farm && h.farmId === farm.id),
    [herds, farm],
  )

  function handleCreate() {
    if (!name.trim() || !farm) return
    const herd: Herd = {
      id:        crypto.randomUUID(),
      farmId:    farm.id,
      name:      name.trim(),
      purpose,
      formedAt:  new Date().toISOString().split('T')[0],
      active:    true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addHerd(herd)
    onDone(herd.id)
  }

  const HERD_PURPOSE_LABEL: Record<string, string> = {
    recria: 'Recria', engorda: 'Engorda', misto: 'Misto',
  }

  return (
    <div className="space-y-4">
      {farmHerds.length > 0 && (
        <div>
          <p className="text-caption text-gray-400 mb-2 uppercase tracking-wide font-medium">Rebanhos cadastrados</p>
          <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto">
            {farmHerds.map((h) => {
              const placed = allocations.some((a) => a.herdId === h.id && a.active)
              return (
                <ElementRow
                  key={h.id}
                  label={h.name}
                  meta={HERD_PURPOSE_LABEL[h.purpose] ?? h.purpose}
                  placed={placed}
                  onClick={() => onDone(h.id)}
                />
              )
            })}
          </div>
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-caption text-gray-400">ou cadastrar novo</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
        </div>
      )}

      <Input
        label="Nome do rebanho"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Select
        label="Finalidade"
        value={purpose}
        options={HERD_PURPOSE_OPTIONS}
        onChange={(e) => setPurpose(e.target.value as HerdPurpose)}
      />
      <Button
        variant="primary"
        fullWidth
        icon={<Plus size={14} />}
        disabled={!name.trim()}
        onClick={handleCreate}
      >
        Criar e posicionar
      </Button>
    </div>
  )
}

// ─── Trough form ──────────────────────────────────────────────────────────────

function TroughForm({ onDone }: { onDone: (troughId: string) => void }) {
  const farm          = useFarmStore((s) => s.farm)
  const divisions     = useFarmStore((s) => s.divisions)
  const feedTroughs   = useFarmStore((s) => s.feedTroughs)
  const addFeedTrough = useFarmStore((s) => s.addFeedTrough)

  const [identifier, setIdentifier] = useState('')
  const [capacity, setCapacity]     = useState('500')
  const [material, setMaterial]     = useState<TroughMaterial>('concreto')

  const farmDivIds = useMemo(
    () => new Set(divisions.filter((d) => farm && d.farmId === farm.id).map((d) => d.id)),
    [divisions, farm],
  )

  const visibleTroughs = useMemo(
    () => feedTroughs.filter((t) => farmDivIds.has(t.divisionId) || t.divisionId === ''),
    [feedTroughs, farmDivIds],
  )

  function handleCreate() {
    if (!identifier.trim() || !farm) return
    const cap = parseFloat(capacity) || 500
    const trough: FeedTrough = {
      id:              crypto.randomUUID(),
      divisionId:      '',
      identifier:      identifier.trim().toUpperCase(),
      capacity:        cap,
      material,
      position:        { x: 0, y: 0 },
      currentAmount:   cap,
      consumptionRate: 10,
      lastRefillDate:  new Date().toISOString().split('T')[0],
      refillHistory:   [],
      active:          true,
      createdAt:       new Date().toISOString(),
      updatedAt:       new Date().toISOString(),
    }
    addFeedTrough(trough)
    onDone(trough.id)
  }

  const divisionName = (divisionId: string) =>
    divisions.find((d) => d.id === divisionId)?.name ?? ''

  return (
    <div className="space-y-4">
      {visibleTroughs.length > 0 && (
        <div>
          <p className="text-caption text-gray-400 mb-2 uppercase tracking-wide font-medium">Cochos cadastrados</p>
          <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto">
            {visibleTroughs.map((t) => {
              const placed = t.divisionId !== ''
              return (
                <ElementRow
                  key={t.id}
                  label={`Cocho ${t.identifier}`}
                  meta={placed ? divisionName(t.divisionId) : `${t.capacity} kg`}
                  placed={placed}
                  onClick={() => onDone(t.id)}
                />
              )
            })}
          </div>
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-caption text-gray-400">ou cadastrar novo</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Identificador"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
        <Input
          label="Capacidade (kg)"
          type="number"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          required
        />
      </div>
      <Select
        label="Material"
        value={material}
        options={TROUGH_MATERIAL_OPTIONS}
        onChange={(e) => setMaterial(e.target.value as TroughMaterial)}
      />
      <Button
        variant="primary"
        fullWidth
        icon={<Plus size={14} />}
        disabled={!identifier.trim()}
        onClick={handleCreate}
      >
        Criar e posicionar
      </Button>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function MapAddPanel({ onClose, onAddDivision, onAddElement }: MapAddPanelProps) {
  const [tab, setTab] = useState<AddTarget>('division')

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 32 }}
      transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
      className="absolute bottom-16 left-3 right-3 z-30 bg-white rounded-2xl shadow-floating border border-gray-200 p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-h2 text-gray-900">Adicionar ao mapa</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-4">
        <Tab active={tab === 'division'} icon={<Grid3x3 size={16} />} label="Divisão"  onClick={() => setTab('division')} />
        <Tab active={tab === 'herd'}     icon={<Beef     size={16} />} label="Rebanho"  onClick={() => setTab('herd')} />
        <Tab active={tab === 'trough'}   icon={<Droplets size={16} />} label="Cocho"    onClick={() => setTab('trough')} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.15 }}
        >
          {tab === 'division' && (
            <DivisionForm onDone={(id) => { onClose(); onAddDivision(id) }} />
          )}
          {tab === 'herd' && (
            <HerdForm onDone={(id) => { onClose(); onAddElement('herd', id) }} />
          )}
          {tab === 'trough' && (
            <TroughForm onDone={(id) => { onClose(); onAddElement('trough', id) }} />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
