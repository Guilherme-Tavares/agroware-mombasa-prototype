import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Wheat, Pencil, Trash2, RotateCcw, Droplets } from 'lucide-react'
import type { ReactNode } from 'react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import { FEED_TYPE_LABEL } from '@/utils/labels'
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

export default function FeedDetail() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const toast    = useToast()
  const { can }  = useAccess()

  const feed        = useFarmStore((s) => s.feeds.find((f) => f.id === id))
  const feedStocks  = useFarmStore((s) => s.feedStocks)
  const feedTroughs = useFarmStore((s) => s.feedTroughs)
  const updateFeed  = useFarmStore((s) => s.updateFeed)

  const [confirmRemove, setConfirmRemove] = useState(false)

  const stock = useMemo(() => feedStocks.find((s) => s.feedId === id), [feedStocks, id])
  const usingTroughs = useMemo(() => feedTroughs.filter((t) => t.currentFeedId === id), [feedTroughs, id])

  if (!feed) {
    return (
      <div className="max-w-xl mx-auto">
        <EmptyState
          icon={<Wheat size={28} />}
          title="Alimento não encontrado"
          description="O registro pode ter sido removido em definitivo."
          action={{ label: 'Voltar à lista', onClick: () => navigate('/feeds') }}
        />
      </div>
    )
  }

  const inactive = feed.active === false

  function handleRemove() {
    updateFeed(feed!.id, { active: false, updatedAt: new Date().toISOString() })
    setConfirmRemove(false)
    toast.success('Alimento removido (exclusão lógica). O histórico foi preservado.')
  }
  function handleRestore() {
    updateFeed(feed!.id, { active: true, updatedAt: new Date().toISOString() })
    toast.success('Alimento restaurado.')
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
          onClick={() => navigate('/feeds')}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-title font-bold text-gray-900 truncate">{feed.name}</h1>
          <p className="text-caption text-gray-400">{feed.type ? (FEED_TYPE_LABEL[feed.type] ?? feed.type) : 'Alimento'}</p>
        </div>
        {inactive && <Badge variant="neutral">Inativo</Badge>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {feed.type && <DataRow label="Tipo" value={<Badge variant="neutral" size="sm">{FEED_TYPE_LABEL[feed.type] ?? feed.type}</Badge>} />}
        <DataRow label="Proteína" value={feed.proteinPercentage != null ? `${feed.proteinPercentage}% PB` : '—'} />
        <DataRow label="Estoque atual" value={stock ? <span className="font-data tabular-nums">{stock.quantity} {stock.unit}</span> : 'Sem estoque'} />
        {stock && <DataRow label="Estoque mínimo" value={`${stock.minimumStock} ${stock.unit}`} />}
        <DataRow label="Cochos usando" value={String(usingTroughs.length)} />
      </div>

      {usingTroughs.length > 0 && (
        <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Cochos com este alimento</p>
          <div className="flex flex-col">
            {usingTroughs.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate(`/troughs/${t.id}`)}
                className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0 text-left hover:bg-gray-50 -mx-1 px-1 rounded"
              >
                <Droplets size={14} className="text-gray-300 shrink-0" />
                <span className="text-caption text-gray-900 flex-1">{t.identifier}</span>
                <span className="font-data text-caption text-gray-500 tabular-nums">{t.currentAmount}/{t.capacity} kg</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {can.writeHusbandry && (
        <div className="mt-6 flex gap-3 pb-4">
          {inactive ? (
            <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={handleRestore} fullWidth>Restaurar</Button>
          ) : (
            <>
              <Button variant="secondary" icon={<Pencil size={15} />} onClick={() => navigate(`/feeds/${feed.id}/edit`)}>Editar</Button>
              <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => setConfirmRemove(true)} className="text-alert">Remover</Button>
            </>
          )}
        </div>
      )}

      <Modal
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remover alimento?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRemove(false)}>Cancelar</Button>
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={handleRemove}>Remover</Button>
          </>
        }
      >
        <p className="text-body text-gray-600">
          O alimento será desativado por <strong>exclusão lógica</strong>. O estoque e os
          abastecimentos permanecem e ele pode ser restaurado depois.
        </p>
      </Modal>
    </motion.div>
  )
}
