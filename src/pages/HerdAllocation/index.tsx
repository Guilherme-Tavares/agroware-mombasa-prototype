import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ArrowRight, AlertTriangle, GripVertical, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import {
  calculateStockingRate,
  getIdealStockingRate,
  getStockingStatus,
} from '@/utils/stocking-rate'
import { formatArea, formatWeight, formatStockingRate } from '@/utils/format'
import { cn } from '@/utils/cn'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Pending {
  herdId: string
  divisionId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toForageType(name: string): 'mombaca' | 'brachiaria' | 'other' {
  const n = name.toLowerCase()
  if (n.includes('mombaça') || n.includes('mombaca')) return 'mombaca'
  if (n.includes('brachiaria') || n.includes('urochloa')) return 'brachiaria'
  return 'other'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
      {children}
    </p>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-caption text-gray-400">{label}</span>
      <span className="text-caption font-semibold text-gray-900">{value}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HerdAllocation() {
  const navigate = useNavigate()
  const toast    = useToast()
  const { can }  = useAccess()
  const canWrite = can.writeHusbandry

  // ── Store ────────────────────────────────────────────────────────────────

  const herds        = useFarmStore((s) => s.herds)
  const divisions    = useFarmStore((s) => s.divisions)
  const bovines      = useFarmStore((s) => s.bovines)
  const allocations  = useFarmStore((s) => s.allocations)
  const forages      = useFarmStore((s) => s.forages)
  const allocateHerd   = useFarmStore((s) => s.allocateHerd)
  const deallocateHerd = useFarmStore((s) => s.deallocateHerd)

  // ── Drag state ───────────────────────────────────────────────────────────

  const [draggingHerdId,    setDraggingHerdId]    = useState<string | null>(null)
  const [dragOverDivId,     setDragOverDivId]      = useState<string | null>(null)
  const [pending,           setPending]            = useState<Pending | null>(null)
  const [confirming,        setConfirming]         = useState(false)
  const [justConfirmedDivId, setJustConfirmedDivId] = useState<string | null>(null)

  // Refs for drop-zone hit testing (Map keeps div.id → HTMLElement)
  const divRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const today = new Date().toISOString().split('T')[0]

  // ── Derived helpers ──────────────────────────────────────────────────────

  function activeAllocForHerd(herdId: string) {
    return allocations.find((a) => a.herdId === herdId && a.active)
  }

  function activeAllocForDiv(divisionId: string) {
    return allocations.find((a) => a.divisionId === divisionId && a.active)
  }

  function herdStats(herdId: string) {
    const inHerd = bovines.filter((b) => b.herdId === herdId)
    const headCount = inHerd.length
    const avgWeight = headCount > 0
      ? inHerd.reduce((s, b) => s + b.currentWeight, 0) / headCount
      : 0
    return { headCount, avgWeight }
  }

  // ── Drop-zone hit testing ────────────────────────────────────────────────

  function findDivAtPoint(point: { x: number; y: number }): string | null {
    for (const [divId, el] of divRefs.current) {
      const r = el.getBoundingClientRect()
      if (point.x >= r.left && point.x <= r.right &&
          point.y >= r.top  && point.y <= r.bottom) {
        return divId
      }
    }
    return null
  }

  // ── Confirm handler ──────────────────────────────────────────────────────

  async function handleConfirm() {
    if (!pending) return
    setConfirming(true)
    await new Promise((r) => setTimeout(r, 700))

    const now = new Date().toISOString()
    allocateHerd({
      id:         crypto.randomUUID(),
      herdId:     pending.herdId,
      divisionId: pending.divisionId,
      startDate:  today,
      headCount:  herdStats(pending.herdId).headCount,
      active:     true,
      createdAt:  now,
      updatedAt:  now,
    })

    const divName = divisions.find((d) => d.id === pending.divisionId)?.name ?? ''
    setJustConfirmedDivId(pending.divisionId)
    setPending(null)
    setConfirming(false)
    toast.success(`Rebanho alocado em ${divName}`)
  }

  // ── Modal computed values ────────────────────────────────────────────────

  const pendingHerd = herds.find((h) => h.id === pending?.herdId)
  const pendingDiv  = divisions.find((d) => d.id === pending?.divisionId)
  const { headCount: pHead, avgWeight: pAvg } = pending
    ? herdStats(pending.herdId)
    : { headCount: 0, avgWeight: 0 }
  const pTotalUA   = (pHead * pAvg) / 450
  const pRate      = pendingDiv && pendingDiv.area > 0 ? pTotalUA / pendingDiv.area : 0
  const pForage    = forages.find((f) => f.id === pendingDiv?.forageId)
  const pIdeal     = getIdealStockingRate(pForage ? toForageType(pForage.name) : 'other')
  const pStatus    = getStockingStatus(pRate, pIdeal)
  const pPrevDiv   = (() => {
    if (!pending) return null
    const prev = activeAllocForHerd(pending.herdId)
    return prev ? divisions.find((d) => d.id === prev.divisionId) ?? null : null
  })()

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* ── Page header ── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-title font-bold text-gray-900">Operação de Lotação</h1>
          <p className="text-caption text-gray-400">
            {canWrite ? 'Arraste um rebanho sobre uma divisão para alocar' : 'Visualização (somente leitura)'}
          </p>
        </div>
      </div>

      {!canWrite && (
        <div className="mb-4 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-caption text-gray-500">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-gray-400" />
          <span>Seu nível de acesso permite apenas consultar a lotação.</span>
        </div>
      )}

      {/* ── Board ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">

        {/* ─────────── Left: Herds ─────────── */}
        <div>
          <SectionLabel>Rebanhos ({herds.length})</SectionLabel>

          <div className="flex flex-col gap-3">
            {herds.map((herd) => {
              const { headCount, avgWeight } = herdStats(herd.id)
              const alloc    = activeAllocForHerd(herd.id)
              const allocDiv = divisions.find((d) => d.id === alloc?.divisionId)
              const isDragging = draggingHerdId === herd.id

              return (
                <motion.div
                  key={herd.id}
                  drag={canWrite}
                  dragMomentum={false}
                  dragElastic={0.06}
                  dragSnapToOrigin
                  onDragStart={() => setDraggingHerdId(herd.id)}
                  onDrag={(_, info) => setDragOverDivId(findDivAtPoint(info.point))}
                  onDragEnd={(_, info) => {
                    const divId = findDivAtPoint(info.point)
                    setDraggingHerdId(null)
                    setDragOverDivId(null)
                    if (divId) {
                      // ignore if already allocated here
                      const cur = activeAllocForHerd(herd.id)
                      if (cur?.divisionId === divId) {
                        toast.info('O rebanho já está alocado nesta divisão')
                        return
                      }
                      setPending({ herdId: herd.id, divisionId: divId })
                    }
                  }}
                  whileDrag={{
                    scale: 1.04,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.14)',
                    zIndex: 50,
                  }}
                  style={{ position: 'relative', zIndex: isDragging ? 50 : 'auto' }}
                  className={cn(
                    'bg-white rounded-xl border border-gray-100 p-4 select-none',
                    'hover:border-gray-200 hover:shadow-sm transition-shadow',
                    !canWrite ? 'cursor-default' : isDragging ? 'cursor-grabbing' : 'cursor-grab',
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Drag handle */}
                    <GripVertical size={15} className="text-gray-300 mt-0.5 shrink-0" />

                    <div className="flex-1 min-w-0">
                      {/* Name + purpose badge */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm truncate">
                          {herd.name}
                        </span>
                        <Badge
                          variant={herd.purpose === 'engorda' ? 'warning' : 'info'}
                          size="sm"
                        >
                          {herd.purpose === 'engorda' ? 'Engorda' : 'Recria'}
                        </Badge>
                      </div>

                      {/* Stats */}
                      <div className="flex gap-2 text-caption text-gray-400 flex-wrap">
                        <span>{headCount} cabeças</span>
                        {headCount > 0 && (
                          <>
                            <span className="text-gray-200">·</span>
                            <span>{formatWeight(avgWeight)} médio</span>
                          </>
                        )}
                      </div>

                      {/* Current allocation */}
                      <div className={cn(
                        'mt-2 flex items-center gap-1.5 text-caption',
                        allocDiv ? 'text-ok' : 'text-gray-300',
                      )}>
                        <span className={cn(
                          'w-1.5 h-1.5 rounded-full shrink-0',
                          allocDiv ? 'bg-ok' : 'bg-gray-200',
                        )} />
                        {allocDiv ? `Em: ${allocDiv.name}` : 'Sem alocação'}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}

            {herds.length === 0 && (
              <div className="py-8 text-center text-caption text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                Nenhum rebanho cadastrado
              </div>
            )}
          </div>
        </div>

        {/* ─────────── Right: Divisions ─────────── */}
        <div>
          <SectionLabel>Divisões ({divisions.length})</SectionLabel>

          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {divisions.map((div) => {
              const isOver    = dragOverDivId === div.id && Boolean(draggingHerdId)
              const alloc     = activeAllocForDiv(div.id)
              const allocHerd = herds.find((h) => h.id === alloc?.herdId)
              const { headCount, avgWeight } = allocHerd
                ? herdStats(allocHerd.id)
                : { headCount: 0, avgWeight: 0 }
              const rate = allocHerd
                ? calculateStockingRate(headCount, avgWeight, div.area)
                : 0
              const forage = forages.find((f) => f.id === div.forageId)
              const ideal  = getIdealStockingRate(forage ? toForageType(forage.name) : 'other')
              const status = allocHerd ? getStockingStatus(rate, ideal) : null
              const isJustConfirmed = justConfirmedDivId === div.id

              return (
                <div
                  key={div.id}
                  ref={(el) => {
                    if (el) divRefs.current.set(div.id, el)
                    else    divRefs.current.delete(div.id)
                  }}
                  className={cn(
                    'relative rounded-xl border-2 bg-white p-4 min-h-[130px] transition-colors duration-150',
                    isOver          ? 'border-primary bg-primary/5'  :
                    isJustConfirmed ? 'border-ok bg-ok/5'             :
                                      'border-gray-100',
                  )}
                >
                  {/* Name + area */}
                  <p className="font-semibold text-gray-900 text-sm truncate leading-snug">
                    {div.name}
                  </p>
                  <p className="text-caption text-gray-400 mb-2">{formatArea(div.area)}</p>

                  {/* Allocation info */}
                  {allocHerd && status ? (
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-caption font-medium text-gray-700 leading-tight">
                          {allocHerd.name}
                        </span>
                        {canWrite && (
                        <button
                          onClick={() => deallocateHerd(allocHerd.id)}
                          className="text-gray-300 hover:text-alert transition-colors shrink-0 mt-0.5"
                          aria-label={`Remover ${allocHerd.name} desta divisão`}
                        >
                          <X size={13} />
                        </button>
                        )}
                      </div>
                      <Badge variant={status} size="sm">
                        {formatStockingRate(rate)}
                      </Badge>
                    </div>
                  ) : (
                    !isOver && (
                      <p className="text-[11px] text-gray-300">Livre</p>
                    )
                  )}

                  {/* Drop-over hint */}
                  <AnimatePresence>
                    {isOver && (
                      <motion.div
                        key="drop-hint"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                        className="absolute inset-0 flex items-center justify-center rounded-[10px] pointer-events-none"
                      >
                        <span className="text-[11px] font-semibold text-primary bg-white px-2.5 py-1 rounded-lg shadow-sm border border-primary/20">
                          Soltar aqui
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Confirmation flash overlay */}
                  <AnimatePresence>
                    {isJustConfirmed && (
                      <motion.div
                        key="flash"
                        className="absolute inset-0 rounded-[10px] bg-ok/25 pointer-events-none"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 1.8, ease: 'easeOut' }}
                        onAnimationComplete={() => setJustConfirmedDivId(null)}
                      />
                    )}
                  </AnimatePresence>
                </div>
              )
            })}

            {divisions.length === 0 && (
              <div className="col-span-full py-8 text-center text-caption text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                Nenhuma divisão cadastrada
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Confirmation Modal ── */}
      <Modal
        isOpen={Boolean(pending)}
        onClose={() => { if (!confirming) setPending(null) }}
        title="Confirmar lotação"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setPending(null)}
              disabled={confirming}
            >
              Cancelar
            </Button>
            <Button loading={confirming} onClick={handleConfirm}>
              Confirmar
            </Button>
          </>
        }
      >
        {/* ── From → To ── */}
        <div className="flex items-stretch gap-2 mb-5">
          <div className="flex-1 bg-gray-50 rounded-xl p-3 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
              Rebanho
            </p>
            <p className="font-semibold text-gray-900 text-sm truncate">{pendingHerd?.name}</p>
            <p className="text-caption text-gray-400">{pHead} cabeças</p>
          </div>

          <div className="flex items-center shrink-0 px-0.5">
            <ArrowRight size={16} className="text-gray-300" />
          </div>

          <div className="flex-1 bg-gray-50 rounded-xl p-3 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
              Divisão
            </p>
            <p className="font-semibold text-gray-900 text-sm truncate">{pendingDiv?.name}</p>
            <p className="text-caption text-gray-400">{formatArea(pendingDiv?.area ?? 0)}</p>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="mb-4">
          <StatRow label="Cabeças"         value={String(pHead)} />
          <StatRow label="Peso médio"      value={formatWeight(pAvg)} />
          <StatRow label="Total UA"        value={`${pTotalUA.toFixed(1)} UA`} />
          <StatRow label="Área da divisão" value={formatArea(pendingDiv?.area ?? 0)} />
        </div>

        {/* ── Stocking rate result ── */}
        <div className={cn(
          'flex items-center justify-between rounded-xl px-4 py-3 mb-3',
          pStatus === 'ok'      ? 'bg-ok-bg'      :
          pStatus === 'warning' ? 'bg-warning-bg'  :
                                  'bg-alert-bg',
        )}>
          <span className="text-caption font-semibold text-gray-700">Taxa resultante</span>
          <Badge variant={pStatus}>{formatStockingRate(pRate)}</Badge>
        </div>

        {/* ── Previous allocation notice ── */}
        {pPrevDiv && (
          <div className="flex gap-2 items-start bg-gray-50 rounded-xl px-3 py-2.5 mb-3 text-caption text-gray-500">
            <AlertTriangle size={13} className="shrink-0 mt-0.5 text-warning" />
            <span>
              O rebanho será removido de{' '}
              <strong className="text-gray-700">{pPrevDiv.name}</strong> (alocação atual).
            </span>
          </div>
        )}

        {/* ── Overstocking warning ── */}
        {pStatus !== 'ok' && (
          <div className={cn(
            'flex gap-2 items-start rounded-xl px-3 py-2.5 text-caption',
            pStatus === 'warning'
              ? 'bg-warning-bg text-warning-dark'
              : 'bg-alert-bg text-alert-dark',
          )}>
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>
              Taxa acima do ideal ({formatStockingRate(pIdeal)} para esta forrageira).
              Considere reduzir o lote ou ampliar a área.
            </span>
          </div>
        )}
      </Modal>
    </motion.div>
  )
}
