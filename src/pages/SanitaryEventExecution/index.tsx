import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Stethoscope, Check, CalendarClock, ShieldAlert } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import { formatDate } from '@/utils/format'
import Button from '@/components/ui/Button.tsx'
import Badge from '@/components/ui/Badge.tsx'
import Modal from '@/components/ui/Modal.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'
import type { MedicationApplication, DoseUnit, SanitaryEvent } from '@/types/domain'

const DOSE_UNIT_OPTIONS = [
  { value: 'ml', label: 'ml' },
  { value: 'g', label: 'g' },
  { value: 'doses', label: 'doses' },
]

export default function SanitaryEventExecution() {
  const navigate    = useNavigate()
  const toast       = useToast()
  const farm        = useFarmStore((s) => s.farm)
  const events      = useFarmStore((s) => s.sanitaryEvents)
  const medications = useFarmStore((s) => s.medications)
  const herds       = useFarmStore((s) => s.herds)
  const bovines     = useFarmStore((s) => s.bovines)
  const executeSanitaryEvent = useFarmStore((s) => s.executeSanitaryEvent)
  const { can }     = useAccess()

  const pending = useMemo(
    () => events.filter((e) => e.propertyId === farm?.id && e.status === 'pendente' && e.active !== false),
    [events, farm],
  )

  // Modal de dose (para eventos com medicamento + bovino).
  const [doseEvent, setDoseEvent] = useState<SanitaryEvent | null>(null)
  const [dose, setDose] = useState('')
  const [doseUnit, setDoseUnit] = useState('ml')

  function targetLabel(e: SanitaryEvent): string {
    if (e.herdId) return herds.find((h) => h.id === e.herdId)?.name ?? 'Rebanho'
    if (e.bovineId) return bovines.find((b) => b.id === e.bovineId)?.name ?? 'Bovino'
    return 'Toda a propriedade'
  }
  const medName = (id?: string) => medications.find((m) => m.id === id)?.commercialName

  function handleExecute(e: SanitaryEvent) {
    // Com medicamento E bovino alvo → coleta a dose e gera aplicação.
    if (e.medicationId && e.bovineId) {
      setDose('')
      setDoseUnit('ml')
      setDoseEvent(e)
      return
    }
    executeSanitaryEvent(e.id)
    toast.success('Evento executado.')
  }

  function confirmDose() {
    if (!doseEvent || !dose || Number(dose) <= 0) return
    const now = new Date().toISOString()
    const application: MedicationApplication = {
      id: crypto.randomUUID(),
      bovineId: doseEvent.bovineId as string,
      medicationId: doseEvent.medicationId as string,
      appliedAt: `${new Date().toISOString().split('T')[0]}T00:00:00`,
      dose: Number(dose),
      doseUnit: doseUnit as DoseUnit,
      active: true,
      createdAt: now,
      updatedAt: now,
    }
    executeSanitaryEvent(doseEvent.id, application)
    setDoseEvent(null)
    toast.success('Evento executado · aplicação gerada e estoque debitado.')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="max-w-xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-title font-bold text-gray-900">Executar eventos sanitários</h1>
          <p className="text-caption text-gray-400">Calendário sanitário · {farm?.name}</p>
        </div>
      </div>

      {!can.writeHusbandry ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-start gap-3">
          <ShieldAlert size={18} className="text-gray-400 mt-0.5 shrink-0" />
          <p className="text-caption text-gray-500">Apenas produtor ou colaborador podem executar eventos sanitários.</p>
        </div>
      ) : pending.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={28} />}
          title="Nenhum evento pendente"
          description="Eventos sanitários agendados aparecem aqui para execução."
          action={{ label: 'Agendar evento', onClick: () => navigate('/sanitary-events/new'), variant: 'secondary' }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {pending.map((e) => (
              <motion.div
                key={e.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3"
              >
                <span className="w-9 h-9 rounded-lg bg-primary-bg text-primary flex items-center justify-center shrink-0">
                  <Stethoscope size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-medium text-gray-900 truncate">{e.type}</p>
                  <p className="text-caption text-gray-400 truncate">
                    {formatDate(e.scheduledDate)} · {targetLabel(e)}
                    {e.medicationId && <> · {medName(e.medicationId)}</>}
                  </p>
                </div>
                {e.medicationId && e.bovineId && <Badge variant="info" size="sm">gera aplicação</Badge>}
                <Button size="sm" icon={<Check size={14} />} onClick={() => handleExecute(e)} className="shrink-0">
                  Executar
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal de dose */}
      <Modal
        isOpen={Boolean(doseEvent)}
        onClose={() => setDoseEvent(null)}
        title="Executar com aplicação"
        description={doseEvent ? `${doseEvent.type} · ${medName(doseEvent.medicationId)}` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDoseEvent(null)}>Cancelar</Button>
            <Button icon={<Check size={15} />} onClick={confirmDose} disabled={!dose || Number(dose) <= 0}>
              Executar
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Input label="Dose" type="number" min="0" step="0.1" value={dose} onChange={(e) => setDose(e.target.value)} required />
          <Select label="Unidade" value={doseUnit} options={DOSE_UNIT_OPTIONS} onChange={(e) => setDoseUnit(e.target.value)} />
        </div>
        <p className="text-caption text-gray-400 mt-3">
          Gera a aplicação no bovino alvo e debita o estoque do medicamento.
        </p>
      </Modal>
    </motion.div>
  )
}
