import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Droplets, Pencil, Trash2, RotateCcw, Gauge } from 'lucide-react'
import type { ReactNode } from 'react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import { formatDate } from '@/utils/format'
import { TROUGH_MATERIAL_LABEL } from '@/utils/labels'
import { calculateHPPercentage, getHPStatus, calculateRemainingDays } from '@/utils/hp-system'
import Button from '@/components/ui/Button.tsx'
import Badge from '@/components/ui/Badge.tsx'
import Modal from '@/components/ui/Modal.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-caption text-gray-400">{label}</span>
      <span className="text-caption font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}

const HP_VARIANT: Record<'ok' | 'warning' | 'alert', 'ok' | 'warning' | 'alert'> = {
  ok: 'ok', warning: 'warning', alert: 'alert',
}

export default function TroughDetail() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const toast    = useToast()
  const { can }  = useAccess()

  const trough    = useFarmStore((s) => s.feedTroughs.find((t) => t.id === id))
  const divisions = useFarmStore((s) => s.divisions)
  const feeds     = useFarmStore((s) => s.feeds)
  const updateFeedTrough = useFarmStore((s) => s.updateFeedTrough)

  const [confirmRemove, setConfirmRemove] = useState(false)

  if (!trough) {
    return (
      <div className="max-w-xl mx-auto">
        <EmptyState
          icon={<Droplets size={28} />}
          title="Cocho não encontrado"
          description="O registro pode ter sido removido em definitivo."
          action={{ label: 'Voltar à lista', onClick: () => navigate('/troughs') }}
        />
      </div>
    )
  }

  const inactive = trough.active === false
  const division = divisions.find((d) => d.id === trough.divisionId)
  const feedName = trough.currentFeedId ? feeds.find((f) => f.id === trough.currentFeedId)?.name : undefined
  const pct = calculateHPPercentage(trough.currentAmount, trough.capacity)
  const status = getHPStatus(pct)
  const days = trough.consumptionRate > 0 ? calculateRemainingDays(trough.currentAmount, trough.consumptionRate) : null

  function handleRemove() {
    updateFeedTrough(trough!.id, { active: false, updatedAt: new Date().toISOString() })
    setConfirmRemove(false)
    toast.success('Cocho removido (exclusão lógica). O histórico foi preservado.')
  }
  function handleRestore() {
    updateFeedTrough(trough!.id, { active: true, updatedAt: new Date().toISOString() })
    toast.success('Cocho restaurado.')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="max-w-xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/troughs')}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-title font-bold text-gray-900 truncate">{trough.identifier}</h1>
          <p className="text-caption text-gray-400">{division?.name ?? 'Sem divisão'}</p>
        </div>
        {inactive && <Badge variant="neutral">Inativo</Badge>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <DataRow label="Nível (HP)" value={<Badge variant={HP_VARIANT[status]} size="sm">{Math.round(pct)}%</Badge>} />
        <DataRow label="Conteúdo" value={<span className="font-data tabular-nums">{trough.currentAmount} / {trough.capacity} kg</span>} />
        <DataRow label="Alimento atual" value={feedName ?? '—'} />
        <DataRow label="Consumo" value={`${trough.consumptionRate} kg/dia`} />
        {days != null && <DataRow label="Dias restantes" value={`~${days} dias`} />}
        <DataRow label="Material" value={TROUGH_MATERIAL_LABEL[trough.material] ?? trough.material} />
        <DataRow label="Último abastecimento" value={trough.lastRefillDate ? formatDate(trough.lastRefillDate) : '—'} />
      </div>

      {/* Operacional: Sistema HP / abastecer */}
      <button
        onClick={() => navigate(`/feed-troughs/${trough.id}`)}
        className="mt-4 w-full flex items-center gap-3 p-4 rounded-2xl border border-primary/20 bg-primary-bg text-left hover:bg-primary/10 transition-colors"
      >
        <Gauge size={18} className="text-primary shrink-0" />
        <span className="flex-1 text-body text-gray-900">Sistema HP e abastecimento</span>
        <span className="text-caption text-primary font-medium">Abrir</span>
      </button>

      {/* Histórico de abastecimentos */}
      <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Histórico de abastecimentos</p>
        {trough.refillHistory.length === 0 ? (
          <p className="text-caption text-gray-400">Nenhum abastecimento registrado.</p>
        ) : (
          <div className="flex flex-col">
            {trough.refillHistory.map((r, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <Droplets size={14} className="text-gray-300 shrink-0" />
                <span className="text-caption text-gray-500 w-24 shrink-0">{formatDate(r.date)}</span>
                <span className="font-data text-caption text-gray-900 tabular-nums flex-1">{r.amount} kg</span>
                <span className="text-caption text-gray-400 truncate">{feeds.find((f) => f.id === r.feedId)?.name ?? ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {can.writeHusbandry && (
        <div className="mt-6 flex gap-3 pb-4">
          {inactive ? (
            <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={handleRestore} fullWidth>
              Restaurar
            </Button>
          ) : (
            <>
              <Button variant="secondary" icon={<Pencil size={15} />} onClick={() => navigate(`/troughs/${trough.id}/edit`)}>
                Editar
              </Button>
              <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => setConfirmRemove(true)} className="text-alert">
                Remover
              </Button>
            </>
          )}
        </div>
      )}

      <Modal
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remover cocho?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRemove(false)}>Cancelar</Button>
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={handleRemove}>Remover</Button>
          </>
        }
      >
        <p className="text-body text-gray-600">
          O cocho será desativado por <strong>exclusão lógica</strong>. O histórico de
          abastecimentos é preservado e ele pode ser restaurado depois.
        </p>
      </Modal>
    </motion.div>
  )
}
