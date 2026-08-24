import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { differenceInDays, parseISO } from 'date-fns'
import {
  X, MapPin, Wheat, Users, Activity, Droplets,
  Calendar, Scale, ArrowRight, TrendingUp, History,
  Pencil, Move, Trash2,
} from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import Badge from '@/components/ui/Badge.tsx'
import Button from '@/components/ui/Button.tsx'
import {
  formatArea, formatDate, formatGMD, formatPercent, formatStockingRate, formatWeight,
} from '@/utils/format.ts'
import {
  calculateStockingRate, getIdealStockingRate, getStockingStatus,
} from '@/utils/stocking-rate.ts'
import {
  calculateHPPercentage, calculateRemainingDays, getHPStatus,
} from '@/utils/hp-system.ts'
import type { SelectedElement } from './StylizedFarmMap.tsx'

type OnStartEdit = (target: 'farm' | 'division', divisionId?: string) => void
type OnStartReposition = (elementType: 'herd' | 'trough', elementId: string) => void

// ─── Status helpers ───────────────────────────────────────────────────────────

const HP_BADGE: Record<'ok' | 'warning' | 'alert', 'ok' | 'warning' | 'alert'> = {
  ok: 'ok', warning: 'warning', alert: 'alert',
}

const HP_LABEL: Record<'ok' | 'warning' | 'alert', string> = {
  ok: 'Adequado', warning: 'Atenção', alert: 'Crítico',
}

const STOCK_BADGE: Record<'ok' | 'warning' | 'alert', 'ok' | 'warning' | 'alert'> = {
  ok: 'ok', warning: 'warning', alert: 'alert',
}

const STOCK_LABEL: Record<'ok' | 'warning' | 'alert', string> = {
  ok: 'Dentro do ideal',
  warning: 'Levemente acima',
  alert:   'Superlotação',
}

// ─── Shared building blocks ───────────────────────────────────────────────────

interface PanelHeaderProps {
  icon:        React.ReactNode
  title:       string
  subtitle?:   string
  onClose:     () => void
  iconAccent?: string
}

function PanelHeader({ icon, title, subtitle, onClose, iconAccent = 'bg-primary-bg text-primary' }: PanelHeaderProps) {
  return (
    <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
      <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${iconAccent}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-h2 text-gray-900 truncate">{title}</p>
        {subtitle && <p className="text-caption text-gray-400 mt-0.5 truncate">{subtitle}</p>}
      </div>
      <button
        onClick={onClose}
        aria-label="Fechar painel"
        className="shrink-0 w-9 h-9 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors flex items-center justify-center"
      >
        <X size={18} />
      </button>
    </div>
  )
}

interface SectionProps {
  icon:     React.ReactNode
  title:    string
  children: React.ReactNode
}

function Section({ icon, title, children }: SectionProps) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 text-caption uppercase tracking-wide text-gray-400 font-medium">
        <span className="text-gray-400">{icon}</span>
        {title}
      </div>
      <div className="text-body text-gray-900">{children}</div>
    </section>
  )
}

function DataRow({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-caption text-gray-400">{label}</span>
      <span className={`text-body ${accent ?? 'text-gray-900'} font-data tabular-nums`}>{value}</span>
    </div>
  )
}

// ─── Inline remove confirmation ───────────────────────────────────────────────

function RemoveRow({ message, onConfirm }: { message: string; onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false)
  return confirming ? (
    <div className="flex flex-col gap-2 mt-1">
      <p className="text-caption text-gray-500 text-center">{message}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="flex-1 py-2 rounded-lg text-button text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => { setConfirming(false); onConfirm() }}
          className="flex-1 py-2 rounded-lg text-button text-white bg-red-500 hover:bg-red-600 transition-colors"
        >
          Remover
        </button>
      </div>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-caption text-gray-400 hover:text-red-500 transition-colors"
    >
      <Trash2 size={12} />
      Remover do mapa
    </button>
  )
}

// ─── Farm detail ──────────────────────────────────────────────────────────────

function FarmDetail({ onClose, onStartEdit }: { onClose: () => void; onStartEdit?: OnStartEdit }) {
  const farm              = useFarmStore((s) => s.farm)
  const divisions         = useFarmStore((s) => s.divisions)
  const herds             = useFarmStore((s) => s.herds)
  const allocations       = useFarmStore((s) => s.allocations)
  const removeFarmFromMap = useFarmStore((s) => s.removeFarmFromMap)

  if (!farm) return null

  const activeDivisions = divisions.filter((d) => d.status === 'active').length
  const activeHerds = allocations.filter((a) => a.active).length
  const isOnMap = farm.polygon.length >= 3

  return (
    <div className="flex flex-col h-full">
      <PanelHeader
        icon={<MapPin size={20} />}
        title={farm.name}
        subtitle={`${farm.city}, ${farm.state}`}
        onClose={onClose}
        iconAccent="bg-blue-50 text-blue-700"
      />

      <div className="flex-1 overflow-y-auto py-4 space-y-5">
        <Section icon={<Activity size={14} />} title="Dados gerais">
          <DataRow label="Área total"   value={formatArea(farm.totalArea)} />
          <DataRow label="Divisões ativas" value={activeDivisions.toString()} />
          <DataRow label="Rebanhos alocados" value={activeHerds.toString()} />
          <DataRow label="Lotes registrados" value={herds.length.toString()} />
        </Section>
      </div>

      <div className="border-t border-gray-100 pt-4 flex flex-col gap-2">
        <Button
          variant="secondary"
          fullWidth
          icon={<Pencil size={14} />}
          onClick={() => { onStartEdit?.('farm'); onClose() }}
        >
          Rever demarcação
        </Button>
        {isOnMap && (
          <RemoveRow
            message="Remove a demarcação da propriedade e de todas as divisões, cochos e rebanhos do mapa."
            onConfirm={() => { removeFarmFromMap(); onClose() }}
          />
        )}
      </div>
    </div>
  )
}

// ─── Division detail ──────────────────────────────────────────────────────────

function DivisionDetail({ id, onClose, onStartEdit }: { id: string; onClose: () => void; onStartEdit?: OnStartEdit }) {
  const navigate              = useNavigate()
  const divisions             = useFarmStore((s) => s.divisions)
  const forages               = useFarmStore((s) => s.forages)
  const herds                 = useFarmStore((s) => s.herds)
  const bovines               = useFarmStore((s) => s.bovines)
  const allocations           = useFarmStore((s) => s.allocations)
  const feedTroughs           = useFarmStore((s) => s.feedTroughs)
  const feeds                 = useFarmStore((s) => s.feeds)
  const seasonPassages        = useFarmStore((s) => s.seasonPassages)
  const removeDivisionFromMap = useFarmStore((s) => s.removeDivisionFromMap)

  const division = divisions.find((d) => d.id === id)
  if (!division) return null

  const forage = forages.find((f) => f.id === division.forageId)
  const forageAge = division.forageStartDate
    ? differenceInDays(new Date(), parseISO(division.forageStartDate))
    : null

  const activeAlloc = allocations.find((a) => a.divisionId === division.id && a.active)
  const currentHerd = activeAlloc ? herds.find((h) => h.id === activeAlloc.herdId) : undefined
  const herdBovines = currentHerd ? bovines.filter((b) => b.herdId === currentHerd.id) : []
  const avgWeight   = herdBovines.length > 0
    ? herdBovines.reduce((s, b) => s + b.currentWeight, 0) / herdBovines.length
    : 0
  // Cálculo direto (sem useMemo): este componente roda após o early return de
  // `division`, então um hook aqui violaria rules-of-hooks; o custo é trivial.
  const herdGMD = (() => {
    if (!currentHerd) return null
    const passages = seasonPassages.filter((sp) => sp.herdId === currentHerd.id)
    if (passages.length === 0) return null
    return passages[passages.length - 1].gmd
  })()

  // Stocking rate
  const forageKey: 'mombaca' | 'brachiaria' | 'other' =
    forage?.name.toLowerCase().includes('mombaça') ? 'mombaca'
    : forage?.name.toLowerCase().includes('brachiaria') ? 'brachiaria'
    : 'other'
  const idealRate   = getIdealStockingRate(forageKey)
  const currentRate = currentHerd && avgWeight > 0
    ? calculateStockingRate(herdBovines.length, avgWeight, division.area)
    : 0
  const stockingStatus = getStockingStatus(currentRate, idealRate)

  // Cochos
  const troughs = feedTroughs.filter((t) => t.divisionId === division.id)

  // Histórico — últimas 3 alocações nesta divisão (ativas ou não)
  const history = allocations
    .filter((a) => a.divisionId === division.id)
    .slice(-3).reverse()

  return (
    <div className="flex flex-col h-full">
      <PanelHeader
        icon={<MapPin size={20} />}
        title={division.name}
        subtitle={`${formatArea(division.area)} · ${division.type === 'pasto' ? 'Pastagem' : division.type}`}
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto py-4 space-y-5">
        {/* Status */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={division.status === 'active' ? 'ok' : 'neutral'}>
            {division.status === 'active' ? 'Ativo' : 'Inativo'}
          </Badge>
          {forage && <Badge variant="info">{forage.name}</Badge>}
        </div>

        {/* Forragem */}
        {forage && (
          <Section icon={<Wheat size={14} />} title="Forragem">
            <DataRow label="Tipo"             value={forage.name} />
            {division.forageStartDate && (
              <DataRow label="Data de plantio" value={formatDate(division.forageStartDate)} />
            )}
            {forageAge !== null && (
              <DataRow label="Idade do pasto"  value={`${forageAge} dias`} />
            )}
          </Section>
        )}

        {/* Rebanho lotado */}
        {currentHerd && activeAlloc ? (
          <Section icon={<Users size={14} />} title="Rebanho lotado">
            <DataRow label="Nome"          value={currentHerd.name} />
            <DataRow label="Cabeças"       value={herdBovines.length.toString()} />
            <DataRow label="Peso médio"    value={formatWeight(avgWeight)} />
            {herdGMD !== null && (
              <DataRow label="GMD"          value={formatGMD(herdGMD)} accent="text-primary" />
            )}
            <DataRow label="Entrada"       value={formatDate(activeAlloc.startDate)} />
          </Section>
        ) : (
          <Section icon={<Users size={14} />} title="Rebanho lotado">
            <p className="text-caption text-gray-400">Divisão sem rebanho alocado.</p>
          </Section>
        )}

        {/* Taxa de lotação */}
        <Section icon={<Activity size={14} />} title="Taxa de lotação">
          <DataRow label="Atual"  value={formatStockingRate(currentRate)} />
          <DataRow label="Ideal"  value={formatStockingRate(idealRate)} accent="text-gray-400" />
          <StockingBar current={currentRate} ideal={idealRate} status={stockingStatus} />
          <div className="mt-2">
            <Badge variant={STOCK_BADGE[stockingStatus]} size="sm">
              {STOCK_LABEL[stockingStatus]}
            </Badge>
          </div>
        </Section>

        {/* Cochos */}
        {troughs.length > 0 && (
          <Section icon={<Droplets size={14} />} title={`Cochos (${troughs.length})`}>
            <div className="flex flex-col gap-2">
              {troughs.map((t) => {
                const pct = calculateHPPercentage(t.currentAmount, t.capacity)
                const status = getHPStatus(pct)
                const feed = feeds.find((f) => f.id === t.currentFeedId)
                return (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/feed-troughs/${t.id}`)}
                    className="flex items-center justify-between gap-3 p-2 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant={HP_BADGE[status]} size="sm">{t.identifier}</Badge>
                      <span className="text-caption text-gray-400 truncate">{feed?.name ?? '—'}</span>
                    </div>
                    <span className="font-data text-body text-gray-900 tabular-nums shrink-0">
                      {formatPercent(pct)}
                    </span>
                  </button>
                )
              })}
            </div>
          </Section>
        )}

        {/* Histórico */}
        {history.length > 0 && (
          <Section icon={<History size={14} />} title="Histórico (últimas 3 lotações)">
            <div className="flex flex-col gap-1.5">
              {history.map((a) => {
                const h = herds.find((x) => x.id === a.herdId)
                return (
                  <div key={a.id} className="flex items-center justify-between gap-2">
                    <span className="text-body text-gray-900 truncate">{h?.name ?? a.herdId}</span>
                    <span className="text-caption text-gray-400 font-data tabular-nums shrink-0">
                      {formatDate(a.startDate)}
                      {!a.active && a.endDate && ` → ${formatDate(a.endDate)}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </Section>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 pt-4 flex flex-col gap-2">
        <Button
          variant="secondary"
          fullWidth
          icon={<Pencil size={14} />}
          onClick={() => { onStartEdit?.('division', division.id); onClose() }}
        >
          Rever demarcação
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" fullWidth onClick={() => navigate(`/divisions/new`)}>
            Editar dados
          </Button>
          <Button variant="primary" fullWidth onClick={() => navigate('/operations/allocation')}>
            Operações
          </Button>
        </div>
        {division.polygon.length >= 3 && (
          <RemoveRow
            message="Remove esta divisão do mapa. Cochos e rebanhos dentro dela serão desvinculados."
            onConfirm={() => { removeDivisionFromMap(division.id); onClose() }}
          />
        )}
      </div>
    </div>
  )
}

function StockingBar({
  current, ideal, status,
}: { current: number; ideal: number; status: 'ok' | 'warning' | 'alert' }) {
  const pct = ideal > 0 ? Math.min(150, (current / ideal) * 100) : 0
  const barColor: Record<'ok' | 'warning' | 'alert', string> = {
    ok:      'bg-primary',
    warning: 'bg-warning',
    alert:   'bg-alert',
  }
  return (
    <div className="mt-2 relative">
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full ${barColor[status]} transition-[width] duration-500`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      {/* Ideal marker at ~67% (100% of ideal scaled into our 0–150% range) */}
      <div className="absolute top-0 h-2 w-px bg-gray-400" style={{ left: `${(100 / 150) * 100}%` }}>
        <div className="absolute -top-1 -translate-x-1/2 w-2 h-1 bg-gray-400 rounded-sm" />
      </div>
    </div>
  )
}

// ─── Herd detail ──────────────────────────────────────────────────────────────

function HerdDetail({ id, onClose, onStartReposition }: { id: string; onClose: () => void; onStartReposition?: OnStartReposition }) {
  const navigate          = useNavigate()
  const herds             = useFarmStore((s) => s.herds)
  const bovines           = useFarmStore((s) => s.bovines)
  const allocations       = useFarmStore((s) => s.allocations)
  const divisions         = useFarmStore((s) => s.divisions)
  const seasonPassages    = useFarmStore((s) => s.seasonPassages)
  const seasons           = useFarmStore((s) => s.seasons)
  const removeHerdFromMap = useFarmStore((s) => s.removeHerdFromMap)

  const herd = herds.find((h) => h.id === id)
  if (!herd) return null

  const herdBovines = bovines.filter((b) => b.herdId === herd.id)
  const avgWeight   = herdBovines.length > 0
    ? herdBovines.reduce((s, b) => s + b.currentWeight, 0) / herdBovines.length
    : 0
  const activeAlloc = allocations.find((a) => a.herdId === herd.id && a.active)
  const currentDiv  = activeAlloc ? divisions.find((d) => d.id === activeAlloc.divisionId) : undefined
  const passages    = seasonPassages.filter((sp) => sp.herdId === herd.id)
  const latestGMD   = passages.length > 0 ? passages[passages.length - 1].gmd : null

  const purposeAccent = herd.purpose === 'engorda' ? 'bg-[#EFEBE9] text-earth' : 'bg-primary-bg text-primary'

  return (
    <div className="flex flex-col h-full">
      <PanelHeader
        icon={<Users size={20} />}
        title={herd.name}
        subtitle={herd.purpose === 'recria' ? 'Recria' : 'Engorda'}
        onClose={onClose}
        iconAccent={purposeAccent}
      />

      <div className="flex-1 overflow-y-auto py-4 space-y-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant={herd.purpose === 'engorda' ? 'warning' : 'info'}>
            {herd.purpose === 'engorda' ? 'Engorda' : 'Recria'}
          </Badge>
          <Badge variant="neutral">Formado em {formatDate(herd.formedAt)}</Badge>
        </div>

        <Section icon={<Scale size={14} />} title="Dados zootécnicos">
          <DataRow label="Cabeças"     value={herdBovines.length.toString()} />
          <DataRow label="Peso médio"  value={formatWeight(avgWeight)} />
          {latestGMD !== null && (
            <DataRow label="GMD atual" value={formatGMD(latestGMD)} accent="text-primary" />
          )}
        </Section>

        {currentDiv && (
          <Section icon={<MapPin size={14} />} title="Localização atual">
            <DataRow label="Divisão"  value={currentDiv.name} />
            <DataRow label="Área"     value={formatArea(currentDiv.area)} />
            {activeAlloc && (
              <DataRow label="Entrada" value={formatDate(activeAlloc.startDate)} />
            )}
          </Section>
        )}

        {herd.notes && (
          <Section icon={<Calendar size={14} />} title="Observações">
            <p className="text-body text-gray-600 leading-relaxed">{herd.notes}</p>
          </Section>
        )}

        {passages.length > 0 && (
          <Section icon={<TrendingUp size={14} />} title="Histórico de temporadas">
            <div className="flex flex-col gap-2">
              {passages.map((sp) => {
                const season = seasons.find((s) => s.id === sp.seasonId)
                return (
                  <div key={sp.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-body text-gray-900 truncate">{season?.name ?? sp.seasonId}</p>
                      <p className="text-caption text-gray-400">
                        {formatWeight(sp.initialWeight)} → {formatWeight(sp.finalWeight)} · {sp.days} dias
                      </p>
                    </div>
                    <span className="font-data text-body text-primary font-medium tabular-nums shrink-0">
                      {formatGMD(sp.gmd)}
                    </span>
                  </div>
                )
              })}
            </div>
          </Section>
        )}
      </div>

      <div className="border-t border-gray-100 pt-4 flex flex-col gap-2">
        <Button
          variant="secondary"
          fullWidth
          icon={<Move size={14} />}
          onClick={() => { onStartReposition?.('herd', herd.id); onClose() }}
        >
          Reposicionar no mapa
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" fullWidth onClick={() => navigate(`/herds/new`)}>
            Editar rebanho
          </Button>
          <Button
            variant="primary"
            fullWidth
            icon={<ArrowRight size={14} />}
            iconPosition="right"
            onClick={() => navigate('/operations/allocation')}
          >
            Lotar / Mover
          </Button>
        </div>
        {activeAlloc && (
          <RemoveRow
            message="Remove este rebanho do mapa e encerra a alocação ativa na divisão."
            onConfirm={() => { removeHerdFromMap(herd.id); onClose() }}
          />
        )}
      </div>
    </div>
  )
}

// ─── Trough detail ────────────────────────────────────────────────────────────

function TroughDetail({ id, onClose, onStartReposition }: { id: string; onClose: () => void; onStartReposition?: OnStartReposition }) {
  const navigate            = useNavigate()
  const feedTroughs         = useFarmStore((s) => s.feedTroughs)
  const feeds               = useFarmStore((s) => s.feeds)
  const divisions           = useFarmStore((s) => s.divisions)
  const removeTroughFromMap = useFarmStore((s) => s.removeTroughFromMap)

  const trough = feedTroughs.find((t) => t.id === id)
  if (!trough) return null

  const feed     = feeds.find((f) => f.id === trough.currentFeedId)
  const division = divisions.find((d) => d.id === trough.divisionId)
  const pct      = calculateHPPercentage(trough.currentAmount, trough.capacity)
  const status   = getHPStatus(pct)
  const days     = calculateRemainingDays(trough.currentAmount, trough.consumptionRate)

  const hpBgColor: Record<'ok' | 'warning' | 'alert', string> = {
    ok: 'bg-ok-bg', warning: 'bg-warning-bg', alert: 'bg-alert-bg',
  }
  const hpFillColor: Record<'ok' | 'warning' | 'alert', string> = {
    ok: 'bg-ok', warning: 'bg-warning', alert: 'bg-alert',
  }
  const hpTextColor: Record<'ok' | 'warning' | 'alert', string> = {
    ok: 'text-ok', warning: 'text-warning-dark', alert: 'text-alert-dark',
  }

  return (
    <div className="flex flex-col h-full">
      <PanelHeader
        icon={<Droplets size={20} />}
        title={`Cocho ${trough.identifier}`}
        subtitle={division ? `Em ${division.name} · ${trough.capacity} kg cap.` : `${trough.capacity} kg cap.`}
        onClose={onClose}
        iconAccent={`${hpBgColor[status]} ${hpTextColor[status]}`}
      />

      <div className="flex-1 overflow-y-auto py-4 space-y-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant={HP_BADGE[status]}>{HP_LABEL[status]}</Badge>
          <Badge variant="neutral">{trough.material === 'concreto' ? 'Concreto'
            : trough.material === 'plastico' ? 'Plástico'
            : trough.material === 'madeira' ? 'Madeira' : 'Metal'}</Badge>
        </div>

        {/* Autonomia do cocho: nível restante e previsão de esgotamento */}
        <Section icon={<Activity size={14} />} title="Autonomia do cocho">
          <div className="flex items-end justify-between mb-2">
            <span className={`font-data text-display ${hpTextColor[status]} tabular-nums`}>
              {Math.round(pct)}<span className="text-h2 ml-0.5">%</span>
            </span>
            <span className="text-caption text-gray-400 font-data tabular-nums">
              {trough.currentAmount} / {trough.capacity} kg
            </span>
          </div>
          <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full ${hpFillColor[status]} transition-[width] duration-500`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-caption text-gray-400 mt-2">
            {isFinite(days) ? `~${days} dia${days !== 1 ? 's' : ''} restante${days !== 1 ? 's' : ''}` : 'Consumo não definido'}
            {' · '}taxa {trough.consumptionRate} kg/dia
          </p>
        </Section>

        {/* Alimento atual */}
        {feed && (
          <Section icon={<Wheat size={14} />} title="Alimento atual">
            <DataRow label="Tipo"           value={feed.name} />
            {feed.proteinPercentage !== undefined && feed.proteinPercentage > 0 && (
              <DataRow label="Proteína bruta" value={`${feed.proteinPercentage}%`} />
            )}
            <DataRow label="Último abastec." value={formatDate(trough.lastRefillDate)} />
          </Section>
        )}

        {/* Histórico recente */}
        {trough.refillHistory.length > 0 && (
          <Section icon={<History size={14} />} title="Abastecimentos recentes">
            <div className="flex flex-col gap-1.5">
              {trough.refillHistory.slice(0, 3).map((r, i) => {
                const f = feeds.find((x) => x.id === r.feedId)
                return (
                  <div key={i} className="flex items-center justify-between gap-2 py-1">
                    <span className="text-body text-gray-900 truncate">{f?.name ?? r.feedId}</span>
                    <span className="text-caption text-gray-400 font-data tabular-nums shrink-0">
                      {formatDate(r.date)} · {r.amount} kg
                    </span>
                  </div>
                )
              })}
            </div>
          </Section>
        )}
      </div>

      <div className="border-t border-gray-100 pt-4 flex flex-col gap-2">
        <Button
          variant="secondary"
          fullWidth
          icon={<Move size={14} />}
          onClick={() => { onStartReposition?.('trough', trough.id); onClose() }}
        >
          Reposicionar no mapa
        </Button>
        <Button
          variant="primary"
          fullWidth
          icon={<ArrowRight size={14} />}
          iconPosition="right"
          onClick={() => navigate(`/feed-troughs/${trough.id}`)}
        >
          Abrir autonomia completa
        </Button>
        {trough.divisionId !== '' && (
          <RemoveRow
            message="Remove este cocho do mapa e desvincula-o da divisão."
            onConfirm={() => { removeTroughFromMap(trough.id); onClose() }}
          />
        )}
      </div>
    </div>
  )
}

// ─── Router ───────────────────────────────────────────────────────────────────

interface DetailPanelProps {
  selected:           SelectedElement
  onClose:            () => void
  onStartEdit?:       OnStartEdit
  onStartReposition?: OnStartReposition
}

export default function DetailPanel({ selected, onClose, onStartEdit, onStartReposition }: DetailPanelProps) {
  if (!selected) return null
  switch (selected.type) {
    case 'farm':     return <FarmDetail     onClose={onClose} onStartEdit={onStartEdit} />
    case 'division': return <DivisionDetail id={selected.id} onClose={onClose} onStartEdit={onStartEdit} />
    case 'herd':     return <HerdDetail     id={selected.id} onClose={onClose} onStartReposition={onStartReposition} />
    case 'trough':   return <TroughDetail   id={selected.id} onClose={onClose} onStartReposition={onStartReposition} />
  }
}
