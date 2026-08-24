import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  motion, useMotionValue, useTransform, animate,
  useMotionValueEvent, AnimatePresence,
} from 'framer-motion'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChevronLeft, Droplets, Activity, Wheat, History,
  AlertTriangle, Clock, Package, Zap, Check,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

import { useFarmStore } from '@/store/useFarmStore'
import type { FeedTrough } from '@/types/domain'
import {
  calculateHPPercentage, calculateRemainingDays, getHPStatus,
} from '@/utils/hp-system'
import { formatDate } from '@/utils/format'
import Button from '@/components/ui/Button.tsx'
import Modal from '@/components/ui/Modal.tsx'
import Badge from '@/components/ui/Badge.tsx'
import Select from '@/components/ui/Select.tsx'

// ─── Constants ────────────────────────────────────────────────────────────────

const HP_COLORS: Record<
  'ok' | 'warning' | 'alert',
  { text: string; fill: string; trackBg: string; hex: string; ring: string }
> = {
  ok: {
    text:    'text-ok',
    fill:    'bg-ok',
    trackBg: 'bg-ok-bg',
    hex:     '#4CAF50',
    ring:    'rgba(76,175,80,0.35)',
  },
  warning: {
    text:    'text-warning-dark',
    fill:    'bg-warning',
    trackBg: 'bg-warning-bg',
    hex:     '#FFA726',
    ring:    'rgba(255,167,38,0.35)',
  },
  alert: {
    text:    'text-alert-dark',
    fill:    'bg-alert',
    trackBg: 'bg-alert-bg',
    hex:     '#EF5350',
    ring:    'rgba(239,83,80,0.35)',
  },
}

const STATUS_BADGE: Record<'ok' | 'warning' | 'alert', 'ok' | 'warning' | 'alert'> = {
  ok: 'ok', warning: 'warning', alert: 'alert',
}

const STATUS_LABEL: Record<'ok' | 'warning' | 'alert', string> = {
  ok: 'Adequado', warning: 'Atenção', alert: 'Crítico',
}

const MATERIAL_LABEL: Record<string, string> = {
  concreto: 'Concreto', madeira: 'Madeira', plastico: 'Plástico', metal: 'Metal',
}

// ─── HP timeline ──────────────────────────────────────────────────────────────

function buildHPTimeline(trough: FeedTrough): Array<{ label: string; hp: number }> {
  const sorted = [...trough.refillHistory]
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
    .slice(-4)

  if (sorted.length === 0) {
    return [{ label: 'Hoje', hp: Math.round(calculateHPPercentage(trough.currentAmount, trough.capacity)) }]
  }

  const points: Array<{ label: string; hp: number }> = []

  sorted.forEach((refill, i) => {
    const refillDate = parseISO(refill.date)
    const hpAfter    = Math.round(Math.min(100, (refill.amount / trough.capacity) * 100))

    // Low point just before this refill (computed from previous refill's depletion)
    if (i > 0) {
      const prev        = sorted[i - 1]
      const prevHpAfter = Math.min(100, (prev.amount / trough.capacity) * 100)
      const days        = differenceInDays(refillDate, parseISO(prev.date))
      const hpBefore    = Math.max(
        0,
        Math.round(prevHpAfter - (trough.consumptionRate / trough.capacity) * 100 * days),
      )
      points.push({ label: format(refillDate, 'dd/MM', { locale: ptBR }), hp: hpBefore })
    }

    // Peak right after refill
    points.push({ label: format(refillDate, 'dd/MM', { locale: ptBR }), hp: hpAfter })
  })

  // Current state
  points.push({
    label: 'Hoje',
    hp:    Math.round(calculateHPPercentage(trough.currentAmount, trough.capacity)),
  })

  return points
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="rounded-2xl border border-gray-200 bg-white shadow-card p-5"
    >
      {children}
    </motion.div>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-caption uppercase tracking-wide text-gray-400 font-medium mb-3">
      <span>{icon}</span>
      {title}
    </div>
  )
}

function DataRow({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-caption text-gray-400">{label}</span>
      <span className={`text-body font-data tabular-nums ${accent ?? 'text-gray-900'}`}>{value}</span>
    </div>
  )
}

// ─── Animated HP hero ─────────────────────────────────────────────────────────

interface HPHeroProps {
  pct:             number
  currentAmount:   number
  capacity:        number
  consumptionRate: number
  status:          'ok' | 'warning' | 'alert'
}

function HPHero({ pct, currentAmount, capacity, consumptionRate, status }: HPHeroProps) {
  const colors = HP_COLORS[status]
  const days   = calculateRemainingDays(currentAmount, consumptionRate)

  const motionPct = useMotionValue(pct)
  const barWidth  = useTransform(motionPct, (v) => `${Math.max(0, Math.min(100, v))}%`)
  const [displayPct, setDisplayPct] = useState(Math.round(pct))

  useMotionValueEvent(motionPct, 'change', (v) => setDisplayPct(Math.round(v)))

  useEffect(() => {
    animate(motionPct, pct, { type: 'spring', stiffness: 55, damping: 17 })
  }, [pct, motionPct])

  return (
    <div className="space-y-5">
      {/* Percentage + amounts row */}
      <div className="flex items-end justify-between gap-4">
        <motion.div
          animate={status === 'alert' ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          transition={status === 'alert'
            ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
            : {}}
          className="flex items-baseline gap-1"
        >
          <span
            className={`font-data leading-none font-medium tabular-nums ${colors.text}`}
            style={{ fontSize: '56px' }}
          >
            {displayPct}
          </span>
          <span className={`text-h1 ${colors.text} opacity-70`}>%</span>
        </motion.div>

        <div className="text-right pb-1.5">
          <p className="font-data text-h2 text-gray-900 tabular-nums">{currentAmount} kg</p>
          <p className="text-caption text-gray-400">de {capacity} kg</p>
        </div>
      </div>

      {/* Bar */}
      <div className="relative">
        <div className="h-6 rounded-full bg-gray-100 overflow-hidden relative">
          <motion.div
            className={`h-full rounded-full ${colors.fill} relative overflow-hidden`}
            style={{ width: barWidth }}
          >
            {/* Shimmer on non-alert */}
            {status !== 'alert' && (
              <motion.div
                className="absolute inset-0 bg-white/20"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 4 }}
              />
            )}
          </motion.div>

          {/* Threshold lines */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 bottom-0 w-px bg-black/10" style={{ left: '20%' }} />
            <div className="absolute top-0 bottom-0 w-px bg-black/10" style={{ left: '50%' }} />
          </div>
        </div>

        {/* Threshold labels */}
        <div className="relative mt-1 h-4">
          <span
            className="absolute text-[10px] text-alert-dark tabular-nums"
            style={{ left: 'calc(20% - 10px)' }}
          >
            20%
          </span>
          <span
            className="absolute text-[10px] text-warning-dark tabular-nums"
            style={{ left: 'calc(50% - 10px)' }}
          >
            50%
          </span>
        </div>

        {/* Pulse ring on alert */}
        {status === 'alert' && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{
              boxShadow: [
                `0 0 0 0 ${colors.ring}`,
                '0 0 0 10px rgba(239,83,80,0)',
                `0 0 0 0 ${colors.ring}`,
              ],
            }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>

      {/* Meta: days + rate */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <div className="flex items-center gap-1.5">
          <Clock size={13} className="text-gray-400 shrink-0" />
          <span className="text-body text-gray-700">
            {isFinite(days) ? (
              <>
                <strong className={colors.text}>{days}</strong>{' '}
                dia{days !== 1 ? 's' : ''} restante{days !== 1 ? 's' : ''}
              </>
            ) : (
              'Consumo não definido'
            )}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Activity size={13} className="text-gray-400 shrink-0" />
          <span className="text-body text-gray-700">
            <strong className="text-gray-900">{consumptionRate}</strong> kg/dia
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { label: string } }> }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white shadow-card border border-gray-100 rounded-lg px-2.5 py-1.5">
      <p className="font-data text-body font-medium text-gray-900 tabular-nums">{payload[0].value}%</p>
      <p className="text-caption text-gray-400">{payload[0].payload.label}</p>
    </div>
  )
}

// ─── Refill preview bar (inside modal) ───────────────────────────────────────

function PreviewBar({ pct, status }: { pct: number; status: 'ok' | 'warning' | 'alert' }) {
  const colors = HP_COLORS[status]
  return (
    <div className={`rounded-xl p-4 ${colors.trackBg}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-caption text-gray-500 font-medium uppercase tracking-wide">
          HP após abastecimento
        </span>
        <Badge variant={STATUS_BADGE[status]}>{STATUS_LABEL[status]}</Badge>
      </div>
      <div className="flex items-baseline gap-1.5 mb-3">
        <span className={`font-data text-display leading-none tabular-nums ${colors.text}`}>
          {Math.round(pct)}
        </span>
        <span className={`text-h2 ${colors.text} opacity-70`}>%</span>
      </div>
      <div className="h-3 rounded-full bg-white/60 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${colors.fill}`}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 18 }}
        />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeedTroughDetail() {
  const { id }        = useParams<{ id: string }>()
  const navigate      = useNavigate()

  const feedTroughs = useFarmStore((s) => s.feedTroughs)
  const feeds       = useFarmStore((s) => s.feeds)
  const divisions   = useFarmStore((s) => s.divisions)
  const doRefill    = useFarmStore((s) => s.refillFeedTrough)

  const trough   = feedTroughs.find((t) => t.id === id)
  const feed     = feeds.find((f) => f.id === trough?.currentFeedId)
  const division = divisions.find((d) => d.id === trough?.divisionId)

  // Refill modal state
  const [refillOpen, setRefillOpen]     = useState(false)
  const [refillAmount, setRefillAmount] = useState(200)
  const [refillFeedId, setRefillFeedId] = useState('')
  const [loading, setLoading]           = useState(false)
  const [justFilled, setJustFilled]     = useState(false)

  // Inicializa os campos de abastecimento quando o cocho muda — padrão
  // recomendado de ajuste de estado durante o render (sem efeito) para evitar
  // renders em cascata.
  const [syncedTroughId, setSyncedTroughId] = useState<string | undefined>(undefined)
  if (trough && trough.id !== syncedTroughId) {
    setSyncedTroughId(trough.id)
    setRefillAmount(trough.capacity)
    setRefillFeedId(trough.currentFeedId ?? (feeds[0]?.id ?? ''))
  }

  const timeline = useMemo(
    () => (trough ? buildHPTimeline(trough) : []),
    [trough],
  )

  // ── Not found ──
  if (!trough) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4">
        <Droplets size={40} className="text-gray-200" />
        <p className="text-body text-gray-400">Cocho não encontrado.</p>
        <Button variant="ghost" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    )
  }

  // Capture the narrowed reference so closures below see FeedTrough, not FeedTrough | undefined
  const t = trough

  const pct    = calculateHPPercentage(t.currentAmount, t.capacity)
  const status = getHPStatus(pct)
  const colors = HP_COLORS[status]

  const previewPct    = Math.min(100, (refillAmount / t.capacity) * 100)
  const previewStatus = getHPStatus(previewPct)

  const feedOptions = feeds.map((f) => ({ value: f.id, label: f.name }))

  function openRefill() {
    setRefillAmount(t.capacity)
    setRefillFeedId(t.currentFeedId ?? (feeds[0]?.id ?? ''))
    setRefillOpen(true)
  }

  function handleConfirm() {
    setLoading(true)
    setTimeout(() => {
      doRefill(
        t.id,
        {
          date:   new Date().toISOString().split('T')[0],
          amount: refillAmount,
          feedId: refillFeedId,
        },
        refillAmount,
      )
      setLoading(false)
      setRefillOpen(false)
      setJustFilled(true)
      setTimeout(() => setJustFilled(false), 3000)
    }, 700)
  }

  return (
    <div className="flex flex-col gap-5 pb-8 max-w-2xl mx-auto">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex items-center gap-3"
      >
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-h1 text-gray-900">Cocho {t.identifier}</h1>
          {division && (
            <p className="text-caption text-gray-400 mt-0.5">
              {division.name} · {MATERIAL_LABEL[t.material] ?? t.material}
            </p>
          )}
        </div>
        <Badge variant={STATUS_BADGE[status]} className="shrink-0">
          {status === 'alert' && <AlertTriangle size={11} className="mr-1 inline-block" />}
          {STATUS_LABEL[status]}
        </Badge>
      </motion.div>

      {/* ── Success flash ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {justFilled && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2 px-4 py-3 bg-ok-bg border border-ok rounded-xl text-ok overflow-hidden"
          >
            <Check size={16} className="shrink-0" />
            <span className="text-body font-medium">Cocho abastecido com sucesso!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HP Hero Card ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className={`rounded-2xl border border-gray-200 ${colors.trackBg} shadow-card p-6`}
      >
        <div className="flex items-center gap-2 mb-4">
          <Droplets size={15} className={colors.text} />
          <span className="text-caption uppercase tracking-wide text-gray-500 font-medium">
            Autonomia do cocho
          </span>
        </div>
        <HPHero
          pct={pct}
          currentAmount={t.currentAmount}
          capacity={t.capacity}
          consumptionRate={t.consumptionRate}
          status={status}
        />
      </motion.div>

      {/* ── Evolution chart ───────────────────────────────────────────── */}
      <SectionCard delay={0.1}>
        <SectionHeader icon={<Activity size={14} />} title="Evolução do HP" />
        <ResponsiveContainer width="100%" height={110}>
          <AreaChart data={timeline} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="hp-area-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={colors.hex} stopOpacity={0.3}  />
                <stop offset="100%" stopColor={colors.hex} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#9E9E9E' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis domain={[0, 100]} hide />
            <ReferenceLine y={20} stroke="#EF5350" strokeDasharray="3 2" strokeWidth={1} />
            <ReferenceLine y={50} stroke="#FFA726" strokeDasharray="3 2" strokeWidth={1} />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="linear"
              dataKey="hp"
              stroke={colors.hex}
              strokeWidth={2.5}
              fill="url(#hp-area-gradient)"
              dot={false}
              activeDot={{ r: 4, fill: colors.hex, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-5 mt-2 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-caption text-gray-400">
            <span className="inline-block w-5" style={{ borderTop: '2px dashed #EF5350' }} />
            Crítico 20%
          </div>
          <div className="flex items-center gap-1.5 text-caption text-gray-400">
            <span className="inline-block w-5" style={{ borderTop: '2px dashed #FFA726' }} />
            Atenção 50%
          </div>
        </div>
      </SectionCard>

      {/* ── Feed info ─────────────────────────────────────────────────── */}
      {feed && (
        <SectionCard delay={0.14}>
          <SectionHeader icon={<Wheat size={14} />} title="Alimento atual" />
          <DataRow label="Tipo"                value={feed.name} />
          {feed.proteinPercentage !== undefined && feed.proteinPercentage > 0 && (
            <DataRow label="Proteína bruta"    value={`${feed.proteinPercentage}%`} />
          )}
          <DataRow label="Último abastecimento" value={formatDate(t.lastRefillDate)} />
          <DataRow label="Material"            value={MATERIAL_LABEL[t.material] ?? t.material} />
          <DataRow label="Capacidade"          value={`${t.capacity} kg`} />
        </SectionCard>
      )}

      {/* ── Refill history ────────────────────────────────────────────── */}
      {t.refillHistory.length > 0 && (
        <SectionCard delay={0.18}>
          <SectionHeader
            icon={<History size={14} />}
            title={`Histórico de abastecimentos (${t.refillHistory.length})`}
          />
          <div className="flex flex-col divide-y divide-gray-50">
            {t.refillHistory.map((r, i) => {
              const f       = feeds.find((x) => x.id === r.feedId)
              const hpAfter = Math.round(Math.min(100, (r.amount / t.capacity) * 100))
              const isLatest = i === 0
              return (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isLatest ? 'bg-primary-bg' : 'bg-gray-100'
                      }`}
                    >
                      <Package size={14} className={isLatest ? 'text-primary' : 'text-gray-400'} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-body text-gray-900 truncate">{f?.name ?? r.feedId}</p>
                      <p className="text-caption text-gray-400">{formatDate(r.date)}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-data text-body text-gray-900 tabular-nums">{r.amount} kg</p>
                    <p className="text-caption text-ok tabular-nums">→ {hpAfter}%</p>
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.22 }}
      >
        <Button
          variant="primary"
          fullWidth
          size="lg"
          icon={<Zap size={16} />}
          onClick={openRefill}
        >
          Abastecer Agora
        </Button>
      </motion.div>

      {/* ── Refill modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={refillOpen}
        onClose={() => !loading && setRefillOpen(false)}
        title={`Abastecer Cocho ${t.identifier}`}
        description={`Capacidade: ${t.capacity} kg · Atual: ${t.currentAmount} kg`}
      >
        <div className="space-y-5">

          {/* Slider + amount */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-caption font-medium text-gray-600">Quantidade a colocar (kg)</span>
              <button
                type="button"
                onClick={() => setRefillAmount(t.capacity)}
                className="text-caption text-primary font-medium hover:underline"
              >
                Encher tudo
              </button>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={t.capacity}
                step={1}
                value={refillAmount}
                onChange={(e) => setRefillAmount(Number(e.target.value))}
                className="flex-1 accent-primary cursor-pointer"
              />
              <span className="font-data text-h2 text-gray-900 tabular-nums w-16 text-right">
                {refillAmount}
              </span>
            </div>

            <div className="flex justify-between text-caption text-gray-400 mt-1">
              <span>0 kg</span>
              <span>{t.capacity} kg</span>
            </div>
          </div>

          {/* Feed selector */}
          <Select
            label="Alimento"
            value={refillFeedId}
            options={feedOptions}
            onChange={(e) => setRefillFeedId(e.target.value)}
          />

          {/* HP preview */}
          <PreviewBar pct={previewPct} status={previewStatus} />

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setRefillOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              fullWidth
              loading={loading}
              icon={<Check size={15} />}
              onClick={handleConfirm}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
