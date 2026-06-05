import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Beef, AlertTriangle, TrendingUp, MapPin,
  Droplets, Users, Map, Plus,
  AlertCircle, Clock,
} from 'lucide-react'
import { format, differenceInDays, parseISO, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { useAuthStore } from '@/store/useAuthStore'
import { useFarmStore } from '@/store/useFarmStore'
import Card from '@/components/ui/Card.tsx'
import Badge from '@/components/ui/Badge.tsx'
import Button from '@/components/ui/Button.tsx'
import { greetingByHour, formatGMD } from '@/utils/format.ts'
import { t } from '@/i18n'

// ─── Counter animation hook ───────────────────────────────────────────────────

function useCountUp(target: number, duration = 1100): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const start = performance.now()
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return value
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KPICardProps {
  label:   string
  value:   number
  suffix?: string
  decimals?: number
  icon:    React.ReactNode
  accent?: 'green' | 'warning' | 'alert'
  delay?:  number
}

function KPICard({ label, value, suffix = '', decimals = 0, icon, accent = 'green', delay = 0 }: KPICardProps) {
  const animated = useCountUp(value, 1100)
  const displayed = animated.toFixed(decimals).replace('.', ',')

  const accentClasses: Record<string, string> = {
    green:   'bg-primary-bg text-primary',
    warning: 'bg-warning-bg text-warning-dark',
    alert:   'bg-alert-bg text-alert-dark',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0, 0, 0.2, 1] }}
    >
      <Card className="hover:-translate-y-0.5 hover:shadow-floating transition-all duration-200 cursor-default">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-caption text-gray-400 uppercase tracking-wide font-medium">{label}</p>
            <p className="mt-1 font-data text-[28px] font-medium text-gray-900 leading-none tabular-nums">
              {displayed}
              {suffix && <span className="text-caption text-gray-400 ml-1 font-sans font-normal">{suffix}</span>}
            </p>
          </div>
          <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${accentClasses[accent]}`}>
            {icon}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

// ─── Map Preview ──────────────────────────────────────────────────────────────

function MapPreview() {
  const divisions  = useFarmStore((s) => s.divisions)
  const farm       = useFarmStore((s) => s.farm)
  const forages    = useFarmStore((s) => s.forages)
  const feedTroughs = useFarmStore((s) => s.feedTroughs)
  const navigate   = useNavigate()

  // Division with critical trough
  const criticalTroughDiv = feedTroughs.find(t => (t.currentAmount / t.capacity) <= 0.2)?.divisionId

  function toPoints(polygon: { x: number; y: number }[]) {
    return polygon.map(p => `${p.x},${p.y}`).join(' ')
  }

  const forageColorMap: Record<string, string> = {
    forage_01: '#A5D6A7',
    forage_02: '#C5E1A5',
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-body font-medium text-gray-900">{t('dashboard.mapTitle')}</h3>
        <Button size="sm" variant="ghost" icon={<Map size={14} />} onClick={() => navigate('/map')}>
          {t('dashboard.mapFull')}
        </Button>
      </div>

      <div className="flex-1 min-h-0 rounded-xl overflow-hidden bg-[#EFF6E8] border border-gray-200">
        <svg
          viewBox="0 0 1000 700"
          className="w-full h-full"
          style={{ maxHeight: 260 }}
        >
          {/* Farm boundary */}
          {farm && (
            <polygon
              points={toPoints(farm.polygon)}
              fill="#D4EDDA"
              stroke="#A5C9A8"
              strokeWidth="4"
            />
          )}

          {/* Division polygons */}
          {divisions.map((div) => {
            const fill = div.forageId ? (forageColorMap[div.forageId] ?? '#B8DDB5') : '#DCEDC8'
            const isCritical = div.id === criticalTroughDiv
            return (
              <g key={div.id}>
                <motion.polygon
                  points={toPoints(div.polygon)}
                  fill={fill}
                  stroke="#6EA870"
                  strokeWidth="2"
                  animate={isCritical
                    ? { opacity: [0.55, 0.9, 0.55] }
                    : { opacity: 0.75 }}
                  transition={isCritical
                    ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                    : {}}
                />
                {/* Division label — centroid approximation */}
                <text
                  x={div.polygon.reduce((s, p) => s + p.x, 0) / div.polygon.length}
                  y={div.polygon.reduce((s, p) => s + p.y, 0) / div.polygon.length + 4}
                  textAnchor="middle"
                  fontSize="22"
                  fill="#2E7D32"
                  fontWeight="500"
                  fontFamily="Roboto, sans-serif"
                >
                  {div.name.replace('Piquete ', 'P')}
                </text>
              </g>
            )
          })}

          {/* Trough markers */}
          {feedTroughs.map((t) => {
            const pct = t.currentAmount / t.capacity
            const color = pct <= 0.2 ? '#EF5350' : pct <= 0.5 ? '#FFA726' : '#4CAF50'
            return (
              <circle
                key={t.id}
                cx={t.position.x}
                cy={t.position.y}
                r="12"
                fill={color}
                stroke="white"
                strokeWidth="2"
                opacity="0.9"
              />
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-3">
        {forages.map((f) => (
          <div key={f.id} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ background: forageColorMap[f.id] ?? '#B8DDB5' }}
            />
            <span className="text-caption text-gray-400">{f.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-alert shrink-0" />
          <span className="text-caption text-gray-400">{t('dashboard.criticalTrough')}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Alert List ───────────────────────────────────────────────────────────────

interface AlertItem {
  id:      string
  type:    'alert' | 'warning'
  icon:    React.ReactNode
  title:   string
  detail:  string
  action?: { label: string; path: string }
}

function useAlerts(): AlertItem[] {
  const feedTroughs   = useFarmStore((s) => s.feedTroughs)
  const herds         = useFarmStore((s) => s.herds)
  const bovines       = useFarmStore((s) => s.bovines)
  const feeds         = useFarmStore((s) => s.feeds)

  const items: AlertItem[] = []

  feedTroughs.forEach((t) => {
    const pct = (t.currentAmount / t.capacity) * 100
    const feed = feeds.find((f) => f.id === t.currentFeedId)
    const daysLeft = Math.floor(t.currentAmount / t.consumptionRate)
    if (pct <= 20) {
      items.push({
        id: t.id,
        type: 'alert',
        icon: <Droplets size={16} />,
        title: `Cocho ${t.identifier} — estado crítico`,
        detail: `${Math.round(pct)}% · ${feed?.name ?? '—'} · ~${daysLeft} dia${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`,
        action: { label: 'Ver cocho', path: `/feed-troughs/${t.id}` },
      })
    } else if (pct <= 50) {
      items.push({
        id: t.id,
        type: 'warning',
        icon: <Droplets size={16} />,
        title: `Cocho ${t.identifier} — atenção`,
        detail: `${Math.round(pct)}% · ${feed?.name ?? '—'}`,
        action: { label: 'Ver cocho', path: `/feed-troughs/${t.id}` },
      })
    }
  })

  herds.forEach((herd) => {
    const herdBovines = bovines.filter((b) => b.herdId === herd.id)
    if (herdBovines.length === 0) return
    const lastWeigh = herdBovines[0].lastWeighDate
    const days = differenceInDays(new Date(), parseISO(lastWeigh))
    if (days > 35) {
      items.push({
        id: herd.id,
        type: 'warning',
        icon: <Clock size={16} />,
        title: `Pesagem do ${herd.name} atrasada`,
        detail: `Último registro há ${days} dias`,
      })
    }
  })

  return items.slice(0, 5)
}

function AlertList() {
  const alerts   = useAlerts()
  const navigate = useNavigate()

  const borderColor: Record<string, string> = {
    alert:   'border-l-alert',
    warning: 'border-l-warning',
  }
  const iconColor: Record<string, string> = {
    alert:   'text-alert',
    warning: 'text-warning-dark',
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-10 h-10 rounded-full bg-ok-bg flex items-center justify-center mb-3">
          <AlertCircle size={20} className="text-ok" />
        </div>
        <p className="text-body font-medium text-gray-900">{t('dashboard.noAlertsTitle')}</p>
        <p className="text-caption text-gray-400 mt-1">{t('dashboard.noAlertsBody')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-body font-medium text-gray-900 mb-3">{t('dashboard.alertsTitle')}</h3>
      <div className="flex flex-col gap-2">
        {alerts.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.07, duration: 0.3 }}
            className={`
              bg-white rounded-xl border-l-4 border border-gray-200 p-3
              hover:-translate-y-0.5 hover:shadow-floating transition-all duration-200
              ${borderColor[a.type]}
            `}
          >
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 shrink-0 ${iconColor[a.type]}`}>{a.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-body font-medium text-gray-900 truncate">{a.title}</p>
                <p className="text-caption text-gray-400 mt-0.5">{a.detail}</p>
              </div>
              {a.action && (
                <button
                  onClick={() => navigate(a.action!.path)}
                  className="shrink-0 text-caption text-primary font-medium hover:underline"
                >
                  {a.action.label}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── GMD Chart ────────────────────────────────────────────────────────────────

// Constrói uma série diária de 30 dias ancorada na GMD média real do rebanho
// ativo. O dataset não guarda pesagens diárias datadas (SeasonPassage agrega em
// gmd único), então a forma da curva é ilustrativa — mas o nível segue o dado.
function buildGMDSeries(avgGMD: number, days = 30) {
  const today = new Date()
  const base = avgGMD > 0 ? avgGMD : 0.867
  return Array.from({ length: days }, (_, i) => {
    const d = subDays(today, days - 1 - i)
    const variation = ((i % 7) - 3) * 0.022
    const gmd = Math.max(0.65, Math.min(1.06, base + variation))
    return {
      day: format(d, 'dd/MM', { locale: ptBR }),
      gmd: Number(gmd.toFixed(3)),
    }
  })
}

function GMDChart({ avgGMD }: { avgGMD: number }) {
  const gmdData = useMemo(() => buildGMDSeries(avgGMD), [avgGMD])
  const gmdValues = gmdData.map((d) => d.gmd)
  const gmdAvg = gmdValues.reduce((s, v) => s + v, 0) / gmdValues.length
  const gmdMax = Math.max(...gmdValues)
  const gmdMin = Math.min(...gmdValues)

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-body font-medium text-gray-900">{t('dashboard.gmdTitle')}</h3>
        <Badge variant="info">kg/dia</Badge>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={gmdData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: '#9E9E9E' }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            domain={[0.55, 1.15]}
            tick={{ fontSize: 10, fill: '#9E9E9E' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => v.toFixed(2)}
          />
          <Tooltip
            contentStyle={{
              background: '#fff',
              border: '1px solid #E0E0E0',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [formatGMD(Number(value)), 'GMD']}
          />
          <Line
            type="monotone"
            dataKey="gmd"
            stroke="#2E7D32"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#2E7D32' }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-around mt-4 pt-3 border-t border-gray-100">
        {[
          { label: t('dashboard.gmdAvg'), value: gmdAvg,  accent: 'text-gray-900' },
          { label: t('dashboard.gmdMax'), value: gmdMax,  accent: 'text-primary' },
          { label: t('dashboard.gmdMin'), value: gmdMin,  accent: 'text-gray-400' },
        ].map(({ label, value, accent }) => (
          <div key={label} className="text-center">
            <p className={`font-data text-body font-medium tabular-nums ${accent}`}>
              {formatGMD(value)}
            </p>
            <p className="text-caption text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: Plus,    label: 'Cadastrar Bovino', path: '/bovines/new',               color: 'primary' },
  { icon: Users,   label: 'Lotar Rebanho',    path: '/operations/allocation',     color: 'earth' },
  { icon: Droplets,label: 'Abastecer Cocho',  path: '/feed-troughs/trough_03',   color: 'water' },
  { icon: Map,     label: 'Ver Mapa',         path: '/map',                       color: 'primary' },
] as const

const colorMap: Record<string, string> = {
  primary: 'bg-primary-bg text-primary hover:bg-primary hover:text-white',
  earth:   'bg-[#EFEBE9] text-earth hover:bg-earth hover:text-white',
  water:   'bg-[#E1F5FE] text-water hover:bg-water hover:text-white',
}

function QuickActions() {
  const navigate = useNavigate()
  return (
    <div>
      <h3 className="text-body font-medium text-gray-900 mb-3">{t('dashboard.quickActions')}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK_ACTIONS.map(({ icon: Icon, label, path, color }, i) => (
          <motion.button
            key={path}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 + i * 0.06, duration: 0.25 }}
            onClick={() => navigate(path)}
            className={`
              flex flex-col items-center justify-center gap-2 p-4 rounded-xl
              border border-transparent transition-all duration-200
              hover:-translate-y-0.5 hover:shadow-floating active:scale-95
              ${colorMap[color]}
            `}
          >
            <Icon size={22} />
            <span className="text-caption font-medium text-center leading-tight">{label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const producerName = useAuthStore((s) => s.producerName)
  const farm         = useFarmStore((s) => s.farm)
  const bovines      = useFarmStore((s) => s.bovines)
  const herds        = useFarmStore((s) => s.herds)
  const passages     = useFarmStore((s) => s.seasonPassages)
  const alerts       = useAlerts()

  const [activeTab, setActiveTab] = useState<'map' | 'alerts'>('map')

  const firstName = producerName.split(' ')[0]
  const greeting  = greetingByHour()

  // KPIs derivados do dataset expandido (apenas a propriedade ativa).
  const herdIds        = useMemo(() => new Set(herds.filter((h) => h.farmId === farm?.id).map((h) => h.id)), [herds, farm])
  const totalBovines   = useMemo(() => bovines.filter((b) => (!b.propertyId || b.propertyId === farm?.id) && b.active !== false).length, [bovines, farm])
  const avgGMD         = useMemo(() => {
    const ps = passages.filter((p) => herdIds.has(p.herdId))
    return ps.length ? ps.reduce((s, p) => s + p.gmd, 0) / ps.length : 0
  }, [passages, herdIds])
  const activeAlertCount = alerts.length

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── Greeting ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="text-h1 text-gray-900">
          {greeting}, {firstName}
        </h1>
        {farm && (
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin size={13} className="text-gray-400" />
            <p className="text-body text-gray-400">
              {farm.name} · {farm.city}, {farm.state}
            </p>
          </div>
        )}
      </motion.div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-3 gap-3">
        <KPICard
          label={t('dashboard.kpiBovines')}
          value={totalBovines}
          icon={<Beef size={18} />}
          accent="green"
          delay={0.05}
        />
        <KPICard
          label={t('dashboard.kpiGmd')}
          value={avgGMD}
          suffix="kg/dia"
          decimals={3}
          icon={<TrendingUp size={18} />}
          accent="green"
          delay={0.1}
        />
        <KPICard
          label={t('dashboard.kpiAlerts')}
          value={activeAlertCount}
          icon={<AlertTriangle size={18} />}
          accent={activeAlertCount > 0 ? 'alert' : 'green'}
          delay={0.15}
        />
      </div>

      {/* ── Map + Alerts ── */}
      {/* Mobile: tabs */}
      <div className="lg:hidden">
        <div className="flex rounded-lg bg-gray-100 p-1 mb-4">
          {(['map', 'alerts'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                'flex-1 py-2 rounded-md text-button transition-all duration-200',
                activeTab === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600',
              ].join(' ')}
            >
              {tab === 'map' ? t('dashboard.tabMap') : t('dashboard.tabAlerts')}
            </button>
          ))}
        </div>
        <Card>
          {activeTab === 'map' ? <MapPreview /> : <AlertList />}
        </Card>
      </div>

      {/* Desktop: side by side */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-4">
        <Card className="min-h-[340px]"><MapPreview /></Card>
        <Card className="min-h-[340px]"><AlertList /></Card>
      </div>

      {/* ── GMD Chart ── */}
      <GMDChart avgGMD={avgGMD} />

      {/* ── Quick Actions ── */}
      <QuickActions />
    </div>
  )
}
