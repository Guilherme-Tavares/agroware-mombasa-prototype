import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Users, Pencil, Trash2, RotateCcw, Beef, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import { formatDate, formatWeight, formatGMD } from '@/utils/format'
import { HERD_PURPOSE_LABEL as PURPOSE_LABEL } from '@/utils/labels'
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

export default function HerdDetail() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const toast    = useToast()
  const { can }  = useAccess()

  const herd        = useFarmStore((s) => s.herds.find((h) => h.id === id))
  const bovines     = useFarmStore((s) => s.bovines)
  const seasons     = useFarmStore((s) => s.seasons)
  const passages    = useFarmStore((s) => s.seasonPassages)
  const allocations = useFarmStore((s) => s.allocations)
  const divisions   = useFarmStore((s) => s.divisions)
  const updateHerd  = useFarmStore((s) => s.updateHerd)

  const [confirmRemove, setConfirmRemove] = useState(false)

  const members = useMemo(
    () => bovines.filter((b) => b.herdId === id && b.active !== false),
    [bovines, id],
  )
  const avgWeight = members.length ? members.reduce((s, b) => s + b.currentWeight, 0) / members.length : 0
  const herdPassages = useMemo(
    () => passages.filter((p) => p.herdId === id).sort((a, b) => b.id.localeCompare(a.id)),
    [passages, id],
  )
  const activeAlloc = allocations.find((a) => a.herdId === id && a.active)
  const allocDivision = activeAlloc ? divisions.find((d) => d.id === activeAlloc.divisionId) : undefined

  if (!herd) {
    return (
      <div className="max-w-xl mx-auto">
        <EmptyState
          icon={<Users size={28} />}
          title="Rebanho não encontrado"
          description="O registro pode ter sido removido em definitivo."
          action={{ label: 'Voltar à lista', onClick: () => navigate('/herds') }}
        />
      </div>
    )
  }

  const inactive = herd.active === false
  const seasonName = (sid: string) => seasons.find((s) => s.id === sid)?.name ?? 'Temporada'

  function handleRemove() {
    updateHerd(herd!.id, { active: false, updatedAt: new Date().toISOString() })
    setConfirmRemove(false)
    toast.success('Rebanho removido (exclusão lógica). O histórico foi preservado.')
  }
  function handleRestore() {
    updateHerd(herd!.id, { active: true, updatedAt: new Date().toISOString() })
    toast.success('Rebanho restaurado.')
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
          onClick={() => navigate('/herds')}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-title font-bold text-gray-900 truncate">{herd.name}</h1>
          <p className="text-caption text-gray-400">{PURPOSE_LABEL[herd.purpose] ?? herd.purpose}</p>
        </div>
        {inactive && <Badge variant="neutral">Inativo</Badge>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <DataRow label="Finalidade" value={
          <Badge variant={herd.purpose === 'engorda' ? 'warning' : 'info'} size="sm">{PURPOSE_LABEL[herd.purpose] ?? herd.purpose}</Badge>
        } />
        <DataRow label="Formação" value={formatDate(herd.formedAt)} />
        <DataRow label="Cabeças" value={String(members.length)} />
        {members.length > 0 && <DataRow label="Peso médio" value={<span className="font-data tabular-nums">{formatWeight(avgWeight)}</span>} />}
        <DataRow label="Lotação atual" value={allocDivision?.name ?? 'Não alocado'} />
        {herd.notes && <DataRow label="Notas" value={herd.notes} />}
      </div>

      {/* GMD por temporada (histórico) */}
      <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Desempenho por temporada</p>
        {herdPassages.length === 0 ? (
          <p className="text-caption text-gray-400">Nenhuma passagem registrada.</p>
        ) : (
          <div className="flex flex-col">
            {herdPassages.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <TrendingUp size={14} className="text-gray-300 shrink-0" />
                <span className="text-caption text-gray-900 flex-1 truncate">{seasonName(p.seasonId)}</span>
                <span className="text-caption text-gray-400 tabular-nums">{p.initialWeight}→{p.finalWeight} kg</span>
                <Badge variant="ok" size="sm">{formatGMD(p.gmd)}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Animais do lote */}
      {members.length > 0 && (
        <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Animais ({members.length})</p>
          <div className="flex flex-col max-h-64 overflow-y-auto">
            {members.map((b) => (
              <button
                key={b.id}
                onClick={() => navigate(`/bovines/${b.id}`)}
                className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0 text-left hover:bg-gray-50 -mx-1 px-1 rounded"
              >
                <Beef size={14} className="text-gray-300 shrink-0" />
                <span className="text-caption text-gray-900 flex-1 truncate">{b.name}{b.earTag ? ` · ${b.earTag}` : ''}</span>
                <span className="font-data text-caption text-gray-500 tabular-nums">{formatWeight(b.currentWeight)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {can.writeHusbandry && (
        <div className="mt-6 flex gap-3 pb-4">
          {inactive ? (
            <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={handleRestore} fullWidth>
              Restaurar
            </Button>
          ) : (
            <>
              <Button variant="secondary" icon={<Pencil size={15} />} onClick={() => navigate(`/herds/${herd.id}/edit`)}>
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
        title="Remover rebanho?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRemove(false)}>Cancelar</Button>
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={handleRemove}>Remover</Button>
          </>
        }
      >
        <p className="text-body text-gray-600">
          O rebanho será desativado por <strong>exclusão lógica</strong>. O histórico
          (passagens, lotações) é preservado e ele pode ser restaurado. Os bovinos não são afetados.
        </p>
      </Modal>
    </motion.div>
  )
}
