import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, CircleSmall, Pencil, Trash2, RotateCcw, Scale } from 'lucide-react'
import type { ReactNode } from 'react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import { formatWeight, formatDate, formatAge } from '@/utils/format'
import Button from '@/components/ui/Button.tsx'
import Badge from '@/components/ui/Badge.tsx'
import Modal from '@/components/ui/Modal.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

const METHOD_LABEL: Record<string, string> = {
  visual: 'Visual', balanca: 'Balança', nota_abate: 'Nota de abate', projecao: 'Projeção',
}
const ORIGIN_LABEL: Record<string, string> = {
  comprado: 'Comprado', doacao: 'Doação', transferido: 'Transferido',
}

function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-caption text-gray-400">{label}</span>
      <span className="text-caption font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}

export default function BovineDetail() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const toast    = useToast()
  const { can }  = useAccess()

  const bovine     = useFarmStore((s) => s.bovines.find((b) => b.id === id))
  const herds      = useFarmStore((s) => s.herds)
  const weighings  = useFarmStore((s) => s.weighings)
  const updateBovine = useFarmStore((s) => s.updateBovine)

  const [confirmRemove, setConfirmRemove] = useState(false)

  const history = useMemo(
    () => weighings
      .filter((w) => w.bovineId === id && w.active !== false)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [weighings, id],
  )

  if (!bovine) {
    return (
      <div className="max-w-xl mx-auto">
        <EmptyState
          icon={<CircleSmall size={28} />}
          title="Bovino não encontrado"
          description="O registro pode ter sido removido em definitivo."
          action={{ label: 'Voltar à lista', onClick: () => navigate('/bovines') }}
        />
      </div>
    )
  }

  const inactive = bovine.active === false
  const herd = bovine.herdId ? herds.find((h) => h.id === bovine.herdId) : undefined

  function handleRemove() {
    const now = new Date().toISOString()
    updateBovine(bovine!.id, { active: false, updatedAt: now })
    setConfirmRemove(false)
    toast.success('Bovino removido (exclusão lógica). O histórico foi preservado.')
  }
  function handleRestore() {
    const now = new Date().toISOString()
    updateBovine(bovine!.id, { active: true, updatedAt: now })
    toast.success('Bovino restaurado.')
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
          onClick={() => navigate('/bovines')}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-title font-bold text-gray-900 truncate">{bovine.name}</h1>
          <p className="text-caption text-gray-400">{bovine.earTag ?? 'Sem brinco'}</p>
        </div>
        {inactive && <Badge variant="neutral">Inativo</Badge>}
      </div>

      {/* Card principal */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
        <div className="p-5 flex items-center gap-4">
          <span className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
            {bovine.photoBase64
              ? <img src={bovine.photoBase64} alt="" className="w-full h-full object-cover" />
              : <CircleSmall size={28} className="text-gray-300" />}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="info" size="sm">{bovine.sex === 'M' ? 'Macho' : 'Fêmea'}</Badge>
            <Badge variant="neutral" size="sm">{bovine.breed}</Badge>
            <Badge variant="neutral" size="sm">{ORIGIN_LABEL[bovine.origin] ?? bovine.origin}</Badge>
          </div>
        </div>

        <div className="p-5">
          <DataRow label="Peso atual" value={<span className="font-data tabular-nums">{formatWeight(bovine.currentWeight)}</span>} />
          <DataRow label="Última pesagem" value={bovine.lastWeighDate ? formatDate(bovine.lastWeighDate) : '—'} />
          <DataRow label="Nascimento" value={bovine.birthDate ? `${formatDate(bovine.birthDate)} · ${formatAge(bovine.birthDate)}` : '—'} />
          <DataRow label="Rebanho" value={herd?.name ?? 'Sem rebanho'} />
        </div>
      </div>

      {/* Histórico preservado (pesagens) */}
      <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Histórico de pesagens
        </p>
        {history.length === 0 ? (
          <p className="text-caption text-gray-400">Nenhuma pesagem registrada.</p>
        ) : (
          <div className="flex flex-col">
            {history.map((w) => (
              <div key={w.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <Scale size={14} className="text-gray-300 shrink-0" />
                <span className="text-caption text-gray-500 w-24 shrink-0">{formatDate(w.date)}</span>
                <span className="font-data text-caption text-gray-900 tabular-nums flex-1">{formatWeight(w.weightKg)}</span>
                <Badge variant="neutral" size="sm">{METHOD_LABEL[w.method] ?? w.method}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ações */}
      {can.writeHusbandry && (
        <div className="mt-6 flex gap-3 pb-4">
          {inactive ? (
            <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={handleRestore} fullWidth>
              Restaurar
            </Button>
          ) : (
            <>
              <Button variant="secondary" icon={<Pencil size={15} />} onClick={() => navigate(`/bovines/${bovine.id}/edit`)}>
                Editar
              </Button>
              <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => setConfirmRemove(true)} className="text-alert">
                Remover
              </Button>
            </>
          )}
        </div>
      )}

      {/* Confirmação de remoção (exclusão lógica) */}
      <Modal
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remover bovino?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRemove(false)}>Cancelar</Button>
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={handleRemove}>Remover</Button>
          </>
        }
      >
        <p className="text-body text-gray-600">
          O bovino será desativado por <strong>exclusão lógica</strong>: sai das listas
          ativas, mas o histórico (pesagens, aplicações, pertencimentos) é preservado e
          ele pode ser restaurado depois.
        </p>
      </Modal>
    </motion.div>
  )
}
