import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Package, Trash2, RotateCcw, Beef, Tag } from 'lucide-react'
import type { ReactNode } from 'react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import AccessDenied from '@/components/ui/AccessDenied.tsx'
import { useToast } from '@/hooks/useToast'
import { formatWeight, formatArrobas, formatCurrency, formatDate } from '@/utils/format'
import Button from '@/components/ui/Button.tsx'
import Badge from '@/components/ui/Badge.tsx'
import Modal from '@/components/ui/Modal.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

const KG_PER_ARROBA = 30

function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-caption text-gray-400">{label}</span>
      <span className="text-caption font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}

export default function SaleLotDetail() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const toast    = useToast()
  const { can }  = useAccess()

  const lot     = useFarmStore((s) => s.saleLots.find((l) => l.id === id))
  const lotBovineLinks = useFarmStore((s) => s.saleLotBovines)
  const bovines = useFarmStore((s) => s.bovines)
  const sales   = useFarmStore((s) => s.sales)
  const updateSaleLot = useFarmStore((s) => s.updateSaleLot)

  const [confirmRemove, setConfirmRemove] = useState(false)

  const members = useMemo(() => {
    const ids = new Set(lotBovineLinks.filter((lb) => lb.saleLotId === id && lb.active !== false).map((lb) => lb.bovineId))
    return bovines.filter((b) => ids.has(b.id))
  }, [lotBovineLinks, bovines, id])
  const totalWeight = members.reduce((s, b) => s + b.currentWeight, 0)
  const sale = sales.find((s) => s.saleLotId === id)

  // Financeiro é exclusivo do produtor (escopo §6.2): a leitura também, não
  // apenas o lançamento.
  if (!can.finance) {
    return <AccessDenied title="Lote comercial" width="wide" />
  }

  if (!lot) {
    return (
      <div className="max-w-xl mx-auto">
        <EmptyState
          icon={<Package size={28} />}
          title="Lote não encontrado"
          description="O registro pode ter sido removido em definitivo."
          action={{ label: 'Voltar à lista', onClick: () => navigate('/sale-lots') }}
        />
      </div>
    )
  }

  const inactive = lot.active === false
  const sold = lot.status === 'vendido'

  function handleRemove() {
    updateSaleLot(lot!.id, { active: false, updatedAt: new Date().toISOString() })
    setConfirmRemove(false)
    toast.success('Lote removido (exclusão lógica).')
  }
  function handleRestore() {
    updateSaleLot(lot!.id, { active: true, updatedAt: new Date().toISOString() })
    toast.success('Lote restaurado.')
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
          onClick={() => navigate('/sale-lots')}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-title font-bold text-gray-900 truncate">{lot.identifier}</h1>
          <p className="text-caption text-gray-400">{members.length} cabeças</p>
        </div>
        <Badge variant={sold ? 'neutral' : 'ok'}>{sold ? 'Vendido' : 'Disponível'}</Badge>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <DataRow label="Cabeças" value={String(members.length)} />
        <DataRow label="Peso total" value={<span className="font-data tabular-nums">{formatWeight(totalWeight)}</span>} />
        <DataRow label="Arrobas" value={formatArrobas(totalWeight / KG_PER_ARROBA)} />
        <DataRow label="Status" value={<Badge variant={sold ? 'neutral' : 'ok'} size="sm">{sold ? 'Vendido' : 'Disponível'}</Badge>} />
      </div>

      {sale && (
        <button
          onClick={() => navigate(`/sales/${sale.id}`)}
          className="mt-4 w-full flex items-center gap-3 p-4 rounded-2xl border border-primary/20 bg-primary-bg text-left hover:bg-primary/10 transition-colors"
        >
          <Tag size={18} className="text-primary shrink-0" />
          <span className="flex-1 text-body text-gray-900">
            Vendido em {formatDate(sale.date)} · {formatCurrency(sale.totalValue ?? 0)}
          </span>
          <span className="text-caption text-primary font-medium">Ver venda</span>
        </button>
      )}

      <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Bovinos do lote</p>
        {members.length === 0 ? (
          <p className="text-caption text-gray-400">Nenhum bovino no lote.</p>
        ) : (
          <div className="flex flex-col">
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
        )}
      </div>

      {can.finance && (
        <div className="mt-6 flex gap-3 pb-4">
          {inactive ? (
            <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={handleRestore} fullWidth>Restaurar</Button>
          ) : !sold ? (
            <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => setConfirmRemove(true)} className="text-alert">Remover</Button>
          ) : (
            <p className="text-caption text-gray-400">Lote vendido — registro mantido para histórico.</p>
          )}
        </div>
      )}

      <Modal
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remover lote?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRemove(false)}>Cancelar</Button>
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={handleRemove}>Remover</Button>
          </>
        }
      >
        <p className="text-body text-gray-600">
          O lote será desativado por <strong>exclusão lógica</strong>. Os bovinos não são
          afetados e o lote pode ser restaurado depois.
        </p>
      </Modal>
    </motion.div>
  )
}
