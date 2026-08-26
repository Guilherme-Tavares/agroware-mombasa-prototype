import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceArea,
} from 'recharts'
import {
  Beef, AlertTriangle, TrendingUp, MapPin,
  Droplets, Users, Map, Plus,
  AlertCircle, Clock,
} from 'lucide-react'
import { addDays, addMonths, differenceInCalendarDays, differenceInDays, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { useAuthStore } from '@/store/useAuthStore'
import { useFarmStore } from '@/store/useFarmStore'
import Card from '@/components/ui/Card.tsx'
import Badge from '@/components/ui/Badge.tsx'
import Button from '@/components/ui/Button.tsx'
import { greetingByHour, formatGMD } from '@/utils/format.ts'
import { useAccess } from '@/hooks/useAccess'
import { countActiveHeads } from '@/utils/herd.ts'
import {
  buildMonthClimate, buildProjection, suggestHerdGMD,
  DEFAULT_MONTHS, FEED_CONSUMPTION_PCT, SEASON_COLOR,
} from '@/utils/gmd.ts'
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

// Carregado sob demanda: só puxa o Leaflet quando a prévia em satélite renderiza
// (online), mantendo o Início leve quando offline / em modo ilustrado.
const SatellitePreview = lazy(() => import('@/components/map/SatellitePreview.tsx'))

const FORAGE_COLOR_MAP: Record<string, string> = {
  forage_01: '#A5D6A7',
  forage_02: '#C5E1A5',
}

function toPoints(polygon: { x: number; y: number }[]) {
  return polygon.map((p) => `${p.x},${p.y}`).join(' ')
}

// Fallback ilustrado com viewBox dinâmico: enquadra o bounding box de tudo
// (propriedade + divisões + cochos) com folga, então sempre contém o contorno
// independentemente das coordenadas. Os tamanhos fixos (raio do cocho, traço,
// rótulo) são escalados por `s` para não inflarem/encolherem com o zoom.
function IllustratedFarmSvg() {
  const divisions   = useFarmStore((s) => s.divisions)
  const farm        = useFarmStore((s) => s.farm)
  const feedTroughs = useFarmStore((s) => s.feedTroughs)

  const criticalTroughDiv = feedTroughs.find((t) => t.currentAmount / t.capacity <= 0.2)?.divisionId

  const allPts = [
    ...(farm?.polygon ?? []),
    ...divisions.flatMap((d) => d.polygon),
    ...feedTroughs.map((t) => t.position),
  ]
  const hasPts = allPts.length > 0
  const xs = allPts.map((p) => p.x)
  const ys = allPts.map((p) => p.y)
  const minX = hasPts ? Math.min(...xs) : 0
  const maxX = hasPts ? Math.max(...xs) : 1000
  const minY = hasPts ? Math.min(...ys) : 0
  const maxY = hasPts ? Math.max(...ys) : 700
  const w = Math.max(1, maxX - minX)
  const h = Math.max(1, maxY - minY)
  const pad = Math.max(w, h) * 0.08
  const vbW = w + 2 * pad
  const vbH = h + 2 * pad
  const viewBox = `${minX - pad} ${minY - pad} ${vbW} ${vbH}`
  const s = Math.max(vbW, vbH) / 1000 // escala dos elementos de tamanho fixo

  return (
    <svg viewBox={viewBox} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {farm && (
        <polygon points={toPoints(farm.polygon)} fill="#D4EDDA" stroke="#A5C9A8" strokeWidth={4 * s} />
      )}

      {divisions.map((div) => {
        const fill = div.forageId ? (FORAGE_COLOR_MAP[div.forageId] ?? '#B8DDB5') : '#DCEDC8'
        const isCritical = div.id === criticalTroughDiv
        const cx = div.polygon.reduce((a, p) => a + p.x, 0) / div.polygon.length
        const cy = div.polygon.reduce((a, p) => a + p.y, 0) / div.polygon.length
        return (
          <g key={div.id}>
            <motion.polygon
              points={toPoints(div.polygon)}
              fill={fill}
              stroke="#6EA870"
              strokeWidth={2 * s}
              animate={isCritical ? { opacity: [0.55, 0.9, 0.55] } : { opacity: 0.75 }}
              transition={isCritical ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
            />
            <text
              x={cx}
              y={cy + 4 * s}
              textAnchor="middle"
              fontSize={22 * s}
              fill="#2E7D32"
              fontWeight="500"
              fontFamily="Roboto, sans-serif"
            >
              {div.name.replace('Piquete ', 'P')}
            </text>
          </g>
        )
      })}

      {feedTroughs.map((t) => {
        const pct = t.currentAmount / t.capacity
        const color = pct <= 0.2 ? '#EF5350' : pct <= 0.5 ? '#FFA726' : '#4CAF50'
        return (
          <circle
            key={t.id}
            cx={t.position.x}
            cy={t.position.y}
            r={12 * s}
            fill={color}
            stroke="white"
            strokeWidth={2 * s}
            opacity="0.9"
          />
        )
      })}
    </svg>
  )
}

function MapPreview() {
  const farm     = useFarmStore((s) => s.farm)
  const forages  = useFarmStore((s) => s.forages)
  const navigate = useNavigate()

  const farmGeo = farm?.geoPolygon ?? []
  const [satFailed, setSatFailed] = useState(false)
  const handleSatFail = useCallback(() => setSatFailed(true), [])

  // Satélite logo de cara (auto-enquadra via fitBounds, proporção real). Cai no
  // ilustrado se não houver geo, se estiver offline, ou se os tiles falharem.
  const online = typeof navigator === 'undefined' || navigator.onLine
  const useSatellite = farmGeo.length >= 3 && online && !satFailed

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-body font-medium text-gray-900">{t('dashboard.mapTitle')}</h3>
        <Button size="sm" variant="ghost" icon={<Map size={14} />} onClick={() => navigate('/map')}>
          {t('dashboard.mapFull')}
        </Button>
      </div>

      <div className="relative h-60 rounded-xl overflow-hidden bg-[#EFF6E8] border border-gray-200">
        {useSatellite ? (
          <Suspense fallback={<IllustratedFarmSvg />}>
            <SatellitePreview onFail={handleSatFail} />
          </Suspense>
        ) : (
          <IllustratedFarmSvg />
        )}
        {/* Sobreposição clicável: a prévia inteira abre o mapa completo
            (o preview é não-interativo, então cobrir não atrapalha nada). */}
        <button
          type="button"
          onClick={() => navigate('/map')}
          aria-label="Abrir mapa completo"
          className="absolute inset-0 z-10 cursor-pointer bg-transparent rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-3">
        {forages.map((f) => (
          <div key={f.id} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ background: FORAGE_COLOR_MAP[f.id] ?? '#B8DDB5' }}
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

// ─── Prévia da projeção de peso (RF76) ────────────────────────────────────────

// A tela inicial mostra uma prévia do gráfico definitivo de `/gmd`: mesma
// projeção, mesmas cores por temporada, sem os controles. O lote escolhido é o
// rebanho com mais cabeças ativas na propriedade, e a duração é a padrão da
// fase. Restrita ao produtor, como a tela cheia (escopo §6.2, decisão 17).
function GMDPreview() {
  const navigate = useNavigate()
  const farm     = useFarmStore((s) => s.farm)
  const herds    = useFarmStore((s) => s.herds)
  const bovines  = useFarmStore((s) => s.bovines)
  const seasons  = useFarmStore((s) => s.seasons)
  const passages = useFarmStore((s) => s.seasonPassages)
  const { can }  = useAccess()

  const lot = useMemo(() => {
    const active = herds.filter((h) => h.farmId === farm?.id && h.active !== false)
    let chosen: { herd: typeof active[number]; heads: number } | null = null
    for (const herd of active) {
      const heads = countActiveHeads(bovines, herd.id)
      if (heads > 0 && (!chosen || heads > chosen.heads)) chosen = { herd, heads }
    }
    if (!chosen) return null

    const members = bovines.filter((b) => b.herdId === chosen!.herd.id && b.active !== false)
    return {
      name: chosen.herd.name,
      purpose: chosen.herd.purpose,
      headCount: chosen.heads,
      initialTotalWeight: members.reduce((sum, b) => sum + b.currentWeight, 0),
      gmd: suggestHerdGMD(
        passages.filter((p) => p.herdId === chosen!.herd.id).map((p) => p.gmd),
        chosen.herd.purpose,
      ),
    }
  }, [herds, bovines, passages, farm])

  const start = useMemo(() => new Date(), [])
  const days  = useMemo(
    () => (lot ? Math.max(1, differenceInCalendarDays(addMonths(start, DEFAULT_MONTHS[lot.purpose]), start)) : 0),
    [lot, start],
  )

  const projection = useMemo(() => {
    if (!lot) return null
    return buildProjection(
      {
        startDate: start,
        days,
        headCount: lot.headCount,
        initialTotalWeight: lot.initialTotalWeight,
        gmdPerHead: lot.gmd,
        monthClimate: buildMonthClimate(seasons),
        feedPct: FEED_CONSUMPTION_PCT.proteinado,
      },
      7,
    )
  }, [lot, seasons, start, days])

  const gradientStops = useMemo(() => {
    if (!projection || days <= 0) return []
    return projection.runs.flatMap((r) => [
      { offset: r.startDay / days, color: SEASON_COLOR[r.season] },
      { offset: (r.endDay + 1) / days, color: SEASON_COLOR[r.season] },
    ])
  }, [projection, days])

  // A projeção consolida informação de gestão: fora do alcance dos demais níveis.
  if (!can.reports) return null

  if (!lot || !projection) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-body font-medium text-gray-900">{t('dashboard.gmdTitle')}</h3>
        </div>
        <div className="py-8 text-center text-gray-400">
          <TrendingUp size={26} className="mx-auto mb-2 opacity-40" />
          <p className="text-caption">Cadastre um rebanho com animais para ver a projeção.</p>
        </div>
      </Card>
    )
  }

  const finalPerHead = Math.round(projection.finalTotalWeight / lot.headCount)

  return (
    <Card
      className="cursor-pointer hover:shadow-floating transition-shadow"
      onClick={() => navigate('/gmd')}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-body font-medium text-gray-900">{t('dashboard.gmdTitle')}</h3>
        <Badge variant="info">{formatGMD(lot.gmd)}</Badge>
      </div>
      <p className="text-caption text-gray-400 mb-3">
        {lot.name} · {lot.headCount} cab · {days} dias
      </p>

      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={projection.points} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="dash-gmd-stroke" x1="0" y1="0" x2="1" y2="0">
              {gradientStops.map((s, i) => (
                <stop key={i} offset={`${Math.max(0, Math.min(100, s.offset * 100))}%`} stopColor={s.color} />
              ))}
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />

          {projection.runs.map((r, i) => (
            <ReferenceArea
              key={i}
              x1={r.startDay}
              x2={r.endDay + 1}
              fill={SEASON_COLOR[r.season]}
              fillOpacity={0.05}
              stroke="none"
            />
          ))}

          <XAxis
            dataKey="day"
            type="number"
            domain={[0, days]}
            tick={{ fontSize: 10, fill: '#9E9E9E' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(d: number) => format(addDays(start, d), 'dd/MM', { locale: ptBR })}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9E9E9E' }}
            tickLine={false}
            axisLine={false}
            width={44}
            domain={['dataMin - 200', 'dataMax + 200']}
            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}t` : String(Math.round(v)))}
          />
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 12 }}
            labelFormatter={(d) => format(addDays(start, Number(d)), "dd 'de' MMM", { locale: ptBR })}
            formatter={(value) => [`${Math.round(Number(value))} kg`, 'Peso do lote']}
          />
          <Line
            type="monotone"
            dataKey="weightTotal"
            stroke="url(#dash-gmd-stroke)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: '#2E7D32' }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-around mt-4 pt-3 border-t border-gray-100">
        {[
          { label: 'Peso atual', value: `${Math.round(projection.points[0].weightTotal)} kg`, accent: 'text-gray-900' },
          { label: 'Projetado', value: `${Math.round(projection.finalTotalWeight)} kg`, accent: 'text-primary' },
          { label: 'Média/cab', value: `${finalPerHead} kg`, accent: 'text-gray-400' },
        ].map(({ label, value, accent }) => (
          <div key={label} className="text-center">
            <p className={`font-data text-body font-medium tabular-nums ${accent}`}>{value}</p>
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
  { icon: Droplets,label: 'Abastecer Cocho',  path: '/operations/supply',        color: 'water' },
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

      {/* ── Prévia da projeção de peso ── */}
      <GMDPreview />

      {/* ── Quick Actions ── */}
      <QuickActions />
    </div>
  )
}
