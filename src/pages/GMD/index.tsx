import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceArea,
} from 'recharts'
import { ChevronLeft, TrendingUp } from 'lucide-react'
import { addDays, addMonths, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import type { Weighing, HerdPurpose, SeasonType } from '@/types/domain'
import Card from '@/components/ui/Card.tsx'
import Badge from '@/components/ui/Badge.tsx'
import Select from '@/components/ui/Select.tsx'
import Input from '@/components/ui/Input.tsx'
import SegmentedTabs from '@/components/consult/SegmentedTabs.tsx'
import AccessDenied from '@/components/ui/AccessDenied.tsx'
import { cn } from '@/utils/cn'
import { formatGMD, formatWeightLarge } from '@/utils/format'
import {
  buildMonthClimate, buildProjection, suggestHerdGMD, calculateGMD,
  FALLBACK_GMD, FEED_CONSUMPTION_PCT, SEASON_COLOR, SEASON_LABEL,
  type FeedVariant, type ProjectionPoint,
} from '@/utils/gmd'

// ──────────────────────────────────────────────────────────────────────────────
// Tela GMD — evolução/projeção de peso de um lote (rebanho ou bovino) ao longo de
// uma temporada. O GMD é um número complementar; a linha muda de cor e inclinação
// por estação. Ver reference/GMD_LOGICA_PROJECAO.md para a lógica e premissas.
// ──────────────────────────────────────────────────────────────────────────────

type LotType = 'rebanho' | 'bovino'
type IntervalKey = 'diario' | 'semanal' | 'mensal' | 'trimestral'

const INTERVALS: { value: IntervalKey; label: string; step: number }[] = [
  { value: 'diario', label: 'Diário', step: 1 },
  { value: 'semanal', label: 'Semanal', step: 7 },
  { value: 'mensal', label: 'Mensal', step: 30 },
  { value: 'trimestral', label: 'Trimestral', step: 90 },
]

const DURATIONS = [1, 2, 3, 6, 9, 12] // meses

/** Padrão de duração por fase (recria mais curta, engorda mais longa). */
const DEFAULT_MONTHS: Record<HerdPurpose, number> = { recria: 3, engorda: 6, misto: 4 }

function autoInterval(days: number): IntervalKey {
  if (days <= 21) return 'diario'
  if (days <= 120) return 'semanal'
  if (days <= 400) return 'mensal'
  return 'trimestral'
}

/** GMD de um bovino a partir das pesagens; fallback por fase quando insuficiente. */
function bovineGMD(weighings: Weighing[], fallback: number): number {
  if (weighings.length < 2) return fallback
  const sorted = [...weighings].sort((a, b) => a.date.localeCompare(b.date))
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const days = differenceInCalendarDays(parseISO(last.date), parseISO(first.date))
  const g = calculateGMD(last.weightKg, first.weightKg, days)
  return g > 0 ? g : fallback
}

const today = () => format(new Date(), 'yyyy-MM-dd')

export default function GMD() {
  const navigate = useNavigate()
  const farm = useFarmStore((s) => s.farm)
  const herds = useFarmStore((s) => s.herds)
  const bovines = useFarmStore((s) => s.bovines)
  const seasons = useFarmStore((s) => s.seasons)
  const weighings = useFarmStore((s) => s.weighings)
  const seasonPassages = useFarmStore((s) => s.seasonPassages)
  const { can } = useAccess()

  const [lotType, setLotType] = useState<LotType>('rebanho')
  const [lotId, setLotId] = useState('')
  const [startISO, setStartISO] = useState(today)
  const [variant, setVariant] = useState<FeedVariant>('proteinado')
  const [gmdInput, setGmdInput] = useState('')
  // Duração e intervalo: `null` = usar o padrão automático (por fase / extensão);
  // um valor = escolha explícita do usuário. Evita efeitos que resetam estado.
  const [monthsOverride, setMonthsOverride] = useState<number | null>(null)
  const [intervalOverride, setIntervalOverride] = useState<IntervalKey | null>(null)
  const [prevLotKey, setPrevLotKey] = useState('')

  const activeHerds = useMemo(
    () => herds.filter((h) => h.farmId === farm?.id && h.active !== false),
    [herds, farm],
  )
  const activeBovines = useMemo(
    () => bovines.filter((b) => b.active !== false && (!b.propertyId || b.propertyId === farm?.id)),
    [bovines, farm],
  )

  const lotOptions = useMemo(
    () =>
      (lotType === 'rebanho' ? activeHerds : activeBovines).map((e) => ({
        value: e.id,
        label: 'earTag' in e && e.earTag ? `${e.name} · ${e.earTag}` : e.name,
      })),
    [lotType, activeHerds, activeBovines],
  )

  // Lote resolvido → nº de cabeças, peso inicial total, fase e GMD sugerido.
  const lot = useMemo(() => {
    const monthClimate = buildMonthClimate(seasons)
    if (lotType === 'rebanho') {
      const h = activeHerds.find((x) => x.id === lotId)
      if (!h) return null
      const members = bovines.filter((b) => b.herdId === h.id && b.active !== false)
      const initialTotalWeight = members.reduce((s, b) => s + b.currentWeight, 0)
      const suggested = suggestHerdGMD(
        seasonPassages.filter((p) => p.herdId === h.id).map((p) => p.gmd),
        h.purpose,
      )
      return { name: h.name, headCount: members.length || 1, initialTotalWeight, purpose: h.purpose, suggested, monthClimate }
    }
    const b = activeBovines.find((x) => x.id === lotId)
    if (!b) return null
    const purpose: HerdPurpose = herds.find((h) => h.id === b.herdId)?.purpose ?? 'misto'
    const suggested = bovineGMD(weighings.filter((w) => w.bovineId === b.id), FALLBACK_GMD[purpose])
    return { name: b.name, headCount: 1, initialTotalWeight: b.currentWeight, purpose, suggested, monthClimate }
  }, [lotType, lotId, activeHerds, activeBovines, bovines, herds, weighings, seasons, seasonPassages])

  // Ao trocar de lote (em fase de render, sem efeito): semeia o GMD editável com a
  // sugestão e volta duração/intervalo aos padrões automáticos da nova fase.
  const lotKey = `${lotType}:${lotId}`
  if (lot && lotKey !== prevLotKey) {
    setPrevLotKey(lotKey)
    setGmdInput(lot.suggested.toFixed(3))
    setMonthsOverride(null)
    setIntervalOverride(null)
  }

  const months = monthsOverride ?? (lot ? DEFAULT_MONTHS[lot.purpose] : 6)

  const days = useMemo(
    () => Math.max(1, differenceInCalendarDays(addMonths(parseISO(startISO), months), parseISO(startISO))),
    [startISO, months],
  )

  const intervalOptions = useMemo(
    () =>
      INTERVALS.map((it) => {
        const pts = Math.ceil(days / it.step) + 1
        return { value: it.value, label: it.label, disabled: pts < 3 || pts > 70 }
      }),
    [days],
  )

  // Intervalo efetivo: escolha do usuário se ainda válida para a extensão atual;
  // senão, o padrão automático pela extensão.
  const intervalKey = useMemo<IntervalKey>(() => {
    const auto = autoInterval(days)
    if (!intervalOverride) return auto
    const opt = INTERVALS.find((i) => i.value === intervalOverride)
    if (!opt) return auto
    const pts = Math.ceil(days / opt.step) + 1
    return pts < 3 || pts > 70 ? auto : intervalOverride
  }, [intervalOverride, days])

  const gmd = useMemo(() => {
    const v = parseFloat(gmdInput.replace(',', '.'))
    return Number.isFinite(v) && v > 0 ? v : lot?.suggested ?? 0.65
  }, [gmdInput, lot])

  const projection = useMemo(() => {
    if (!lot) return null
    const step = INTERVALS.find((i) => i.value === intervalKey)?.step ?? 30
    return buildProjection(
      {
        startDate: parseISO(startISO),
        days,
        headCount: lot.headCount,
        initialTotalWeight: lot.initialTotalWeight,
        gmdPerHead: gmd,
        monthClimate: lot.monthClimate,
        feedPct: FEED_CONSUMPTION_PCT[variant],
      },
      step,
    )
  }, [lot, startISO, days, gmd, variant, intervalKey])

  // Paradas do gradiente da linha: cor por estação ao longo do eixo x (dia/D).
  const gradientStops = useMemo(() => {
    if (!projection) return []
    return projection.runs.flatMap((r) => {
      const color = SEASON_COLOR[r.season]
      return [
        { offset: r.startDay / days, color },
        { offset: (r.endDay + 1) / days, color },
      ]
    })
  }, [projection, days])

  const seasonsInView = useMemo(() => {
    if (!projection) return [] as SeasonType[]
    return [...new Set(projection.runs.map((r) => r.season))]
  }, [projection])

  const start = parseISO(startISO)

  // Projeção de desempenho é exclusiva do produtor, como os relatórios
  // (escopo §6.2, decisão 17). A guarda fica após os hooks, nunca antes.
  if (!can.reports) {
    return <AccessDenied title="GMD" width="wide" />
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-title font-bold text-gray-900">GMD</h1>
          <p className="text-caption text-gray-400">Projeção de evolução de peso do lote</p>
        </div>
        <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <TrendingUp size={18} />
        </span>
      </div>

      {/* Seleção */}
      <Card className="mb-4">
        <div className="flex flex-col gap-3">
          <SegmentedTabs
            value={lotType}
            onChange={(v) => { setLotType(v as LotType); setLotId('') }}
            options={[
              { value: 'rebanho', label: 'Rebanho' },
              { value: 'bovino', label: 'Bovino' },
            ]}
          />
          <Select
            label={lotType === 'rebanho' ? 'Rebanho' : 'Bovino'}
            placeholder={lotOptions.length ? 'Selecione o lote...' : 'Nenhum cadastrado'}
            options={lotOptions}
            value={lotId}
            onChange={(e) => setLotId(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="Início"
              value={startISO}
              onChange={(e) => setStartISO(e.target.value || today())}
            />
            <Select
              label="Duração"
              placeholder=""
              options={DURATIONS.map((m) => ({ value: String(m), label: `${m} ${m === 1 ? 'mês' : 'meses'}` }))}
              value={String(months)}
              onChange={(e) => setMonthsOverride(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Intervalo"
              placeholder=""
              options={intervalOptions}
              value={intervalKey}
              onChange={(e) => setIntervalOverride(e.target.value as IntervalKey)}
            />
            <Input
              type="text"
              inputMode="decimal"
              label="GMD projetado"
              value={gmdInput}
              onChange={(e) => setGmdInput(e.target.value)}
              helperText={lot ? `Sugestão: ${lot.suggested.toFixed(3).replace('.', ',')} kg/dia` : 'kg/cab/dia'}
            />
          </div>

          <div>
            <p className="text-caption text-gray-400 mb-1.5">Ração (consumo estimado)</p>
            <SegmentedTabs
              value={variant}
              onChange={(v) => setVariant(v as FeedVariant)}
              options={[
                { value: 'proteico', label: 'Proteico · baixo (0,1%)' },
                { value: 'proteinado', label: 'Proteinado · alto (1%)' },
              ]}
            />
          </div>
        </div>
      </Card>

      {!lot || !projection ? (
        <Card>
          <div className="py-10 text-center text-gray-400">
            <TrendingUp size={28} className="mx-auto mb-3 opacity-40" />
            <p className="text-body">Selecione um {lotType} para projetar a evolução.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Chips de resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <Stat label="Peso inicial" value={formatWeightLarge(Math.round(projection.points[0].weightTotal))} />
            <Stat label="Peso projetado" value={formatWeightLarge(Math.round(projection.finalTotalWeight))} accent="text-primary" />
            <Stat label="Ganho no período" value={`+${formatWeightLarge(Math.round(projection.totalGain))}`} accent="text-ok" />
            <Stat label="Ração estimada" value={formatWeightLarge(Math.round(projection.feedTotalKg))} />
          </div>

          {/* Gráfico */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-body font-medium text-gray-900">{lot.name}</h3>
                <p className="text-caption text-gray-400">
                  {lot.headCount} cab · {days} dias · média/cab {Math.round(projection.finalTotalWeight / lot.headCount)} kg
                </p>
              </div>
              <Badge variant="info">{formatGMD(gmd)}</Badge>
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={projection.points} margin={{ top: 8, right: 4, bottom: 0, left: -6 }}>
                <defs>
                  <linearGradient id="gmd-weight-stroke" x1="0" y1="0" x2="1" y2="0">
                    {gradientStops.map((s, i) => (
                      <stop key={i} offset={`${Math.max(0, Math.min(100, s.offset * 100))}%`} stopColor={s.color} />
                    ))}
                  </linearGradient>
                  <linearGradient id="gmd-feed-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9CA3AF" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#9CA3AF" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />

                {projection.runs.map((r, i) => (
                  <ReferenceArea
                    key={i}
                    yAxisId="w"
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
                  yAxisId="w"
                  tick={{ fontSize: 10, fill: '#9E9E9E' }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}t` : String(Math.round(v)))}
                />
                <YAxis
                  yAxisId="f"
                  orientation="right"
                  tick={{ fontSize: 10, fill: '#C4C4C4' }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}t` : String(Math.round(v)))}
                />

                <Tooltip content={<ChartTooltip headCount={lot.headCount} start={start} />} />

                <Area
                  yAxisId="f"
                  type="monotone"
                  dataKey="feedCumKg"
                  stroke="#9CA3AF"
                  strokeWidth={1}
                  fill="url(#gmd-feed-fill)"
                  dot={false}
                />
                <Line
                  yAxisId="w"
                  type="monotone"
                  dataKey="weightTotal"
                  stroke="url(#gmd-weight-stroke)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Legenda de estações */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-gray-100">
              {seasonsInView.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 text-caption text-gray-500">
                  <span className="w-3 h-1.5 rounded-full" style={{ background: SEASON_COLOR[s] }} />
                  {SEASON_LABEL[s]}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 text-caption text-gray-400 ml-auto">
                <span className="w-3 h-1.5 rounded-full bg-gray-300" />
                Ração acum. (kg)
              </span>
            </div>
          </Card>

          <p className="text-caption text-gray-400 mt-3 px-1">
            Pesos projetados a partir do GMD editável, redistribuído por estação (águas ganha mais, seca menos).
            Ajuste o GMD ou a variante da ração para simular cenários.
          </p>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, accent = 'text-gray-900' }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3">
      <p className="text-caption text-gray-400 mb-0.5">{label}</p>
      <p className={cn('font-data text-body font-semibold tabular-nums', accent)}>{value}</p>
    </div>
  )
}

// Props próprias: no recharts v3 o render-prop `content` recebe um tipo que omite
// `payload`/`active`, então não dá para usar TooltipProps aqui.
interface ChartTooltipProps {
  active?: boolean
  payload?: { payload: ProjectionPoint }[]
  headCount: number
  start: Date
}

function ChartTooltip({ active, payload, headCount, start }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-caption">
      <p className="font-medium text-gray-900">{format(addDays(start, p.day), "dd 'de' MMM", { locale: ptBR })}</p>
      <p className="text-gray-600 mt-1">
        Peso: <span className="font-data text-gray-900">{formatWeightLarge(Math.round(p.weightTotal))}</span>
        <span className="text-gray-400"> · {Math.round(p.weightTotal / headCount)} kg/cab</span>
      </p>
      <p className="text-gray-600">Ração acum.: <span className="font-data text-gray-900">{formatWeightLarge(Math.round(p.feedCumKg))}</span></p>
      <p className="mt-1 inline-flex items-center gap-1.5" style={{ color: SEASON_COLOR[p.season] }}>
        <span className="w-2 h-2 rounded-full" style={{ background: SEASON_COLOR[p.season] }} />
        {SEASON_LABEL[p.season]}
      </p>
    </div>
  )
}
