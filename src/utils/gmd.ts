import { addDays, parseISO } from 'date-fns'
import type { Season, SeasonType, HerdPurpose } from '@/types/domain'

/** Ganho Médio Diário = (peso_final - peso_inicial) / dias */
export function calculateGMD(
  finalWeight: number,
  initialWeight: number,
  days: number,
): number {
  if (days <= 0) return 0
  return (finalWeight - initialWeight) / days
}

export function averageGMD(gmds: number[]): number {
  if (gmds.length === 0) return 0
  return gmds.reduce((sum, v) => sum + v, 0) / gmds.length
}

export function getGMDStatus(gmd: number): 'ok' | 'warning' | 'alert' {
  if (gmd >= 0.8) return 'ok'
  if (gmd >= 0.6) return 'warning'
  return 'alert'
}

// ──────────────────────────────────────────────────────────────────────────────
// Projeção de evolução de peso (tela /gmd)
//
// Documentação e premissas agronômicas: reference/GMD_LOGICA_PROJECAO.md.
// Os pesos por estação e GMDs de fallback são padrões ajustáveis na UI — aqui
// ficam só como semente. A média realizada da projeção é mantida igual ao GMD
// editado pelo usuário; as estações apenas redistribuem o ganho (a linha entorta
// de acordo, sem alterar o número exibido).
// ──────────────────────────────────────────────────────────────────────────────

/** Peso relativo do ganho por estação: gado ganha mais nas águas, menos na seca. */
export const SEASON_WEIGHT: Record<SeasonType, number> = {
  aguas: 1.35,
  transicao: 1.0,
  seca: 0.55,
}

/** Cor da linha/faixa por estação (azul águas, vermelho seca, âmbar transição). */
export const SEASON_COLOR: Record<SeasonType, string> = {
  aguas: '#2563EB',
  seca: '#DC2626',
  transicao: '#D97706',
}

export const SEASON_LABEL: Record<SeasonType, string> = {
  aguas: 'Águas',
  seca: 'Seca',
  transicao: 'Transição',
}

/** GMD base (kg/cab/dia) quando não há histórico de passagens para sugerir. */
export const FALLBACK_GMD: Record<HerdPurpose, number> = {
  recria: 0.5,
  engorda: 0.8,
  misto: 0.65,
}

/** Consumo diário de ração como fração do peso vivo, por variante do produto. */
export const FEED_CONSUMPTION_PCT = {
  proteico: 0.001, // baixo consumo — 0,1% do peso vivo/dia
  proteinado: 0.01, // alto consumo — 1% do peso vivo/dia
} as const
export type FeedVariant = keyof typeof FEED_CONSUMPTION_PCT

/**
 * Mapa mês (1–12) → estação, derivado das temporadas cadastradas. Percorre as
 * temporadas por data de início marcando cada mês do intervalo; em sobreposição,
 * a de início mais recente prevalece (dá as bordas à transição). Meses sem
 * cobertura caem em 'transicao'. Year-agnostic — serve projeções em qualquer ano.
 */
export function buildMonthClimate(seasons: Season[]): Record<number, SeasonType> {
  const map: Record<number, SeasonType> = {}
  const ordered = [...seasons].sort((a, b) => a.startDate.localeCompare(b.startDate))

  for (const s of ordered) {
    const startM = parseISO(s.startDate).getMonth() + 1
    const endM = parseISO(s.endDate).getMonth() + 1
    let m = startM
    for (let guard = 0; guard < 13; guard++) {
      map[m] = s.type
      if (m === endM) break
      m = m === 12 ? 1 : m + 1 // wrap de ano (ex.: águas out→abr)
    }
  }

  for (let m = 1; m <= 12; m++) if (!map[m]) map[m] = 'transicao'
  return map
}

export function seasonForDate(monthClimate: Record<number, SeasonType>, date: Date): SeasonType {
  return monthClimate[date.getMonth() + 1] ?? 'transicao'
}

/** GMD sugerido para um rebanho: média das passagens; fallback por fase. */
export function suggestHerdGMD(passageGMDs: number[], purpose: HerdPurpose): number {
  const avg = averageGMD(passageGMDs.filter((g) => g > 0))
  return avg > 0 ? avg : FALLBACK_GMD[purpose]
}

export interface ProjectionInput {
  startDate: Date
  days: number
  headCount: number
  initialTotalWeight: number
  /** GMD médio editável (kg/cab/dia); a projeção preserva essa média. */
  gmdPerHead: number
  monthClimate: Record<number, SeasonType>
  /** Fração do peso vivo consumida em ração por dia. */
  feedPct: number
}

export interface ProjectionPoint {
  day: number // índice do dia, 0..days
  date: string // ISO
  weightTotal: number
  weightPerHead: number
  feedCumKg: number
  season: SeasonType
}

/** Trecho contíguo de mesma estação; endDay é inclusivo (índice do dia). */
export interface SeasonRun {
  season: SeasonType
  startDay: number
  endDay: number
}

export interface ProjectionResult {
  points: ProjectionPoint[]
  runs: SeasonRun[]
  finalTotalWeight: number
  totalGain: number
  feedTotalKg: number
  gmdPerHead: number
}

/**
 * Constrói a série projetada. `sampleEveryDays` controla o espaçamento dos
 * pontos amostrados (o dia 0 e o dia final sempre entram). O ganho de cada dia é
 * `k · w_estação`, com `k = gmd · D / Σ w_estação`, garantindo média = `gmd`.
 */
export function buildProjection(input: ProjectionInput, sampleEveryDays: number): ProjectionResult {
  const { startDate, days, headCount, initialTotalWeight, gmdPerHead, monthClimate, feedPct } = input
  const D = Math.max(1, Math.round(days))
  const heads = Math.max(1, headCount)
  const step = Math.max(1, Math.round(sampleEveryDays))
  const initialPerHead = initialTotalWeight / heads

  // 1) estação de cada dia + soma dos pesos relativos
  const daySeason: SeasonType[] = []
  let sumW = 0
  for (let i = 0; i < D; i++) {
    const s = seasonForDate(monthClimate, addDays(startDate, i))
    daySeason.push(s)
    sumW += SEASON_WEIGHT[s]
  }
  const k = sumW > 0 ? (gmdPerHead * D) / sumW : 0

  // 2) caminhada acumulada dia a dia, amostrando nos intervalos
  const points: ProjectionPoint[] = []
  let cumGainPerHead = 0
  let feedCum = 0

  const record = (day: number) => {
    const idx = Math.min(day, D)
    points.push({
      day,
      date: addDays(startDate, day).toISOString(),
      weightTotal: heads * (initialPerHead + cumGainPerHead),
      weightPerHead: initialPerHead + cumGainPerHead,
      feedCumKg: feedCum,
      season: daySeason[Math.min(idx, D - 1)],
    })
  }

  record(0)
  for (let i = 0; i < D; i++) {
    const liveTotal = heads * (initialPerHead + cumGainPerHead)
    feedCum += feedPct * liveTotal
    cumGainPerHead += k * SEASON_WEIGHT[daySeason[i]]
    const day = i + 1
    if (day % step === 0 || day === D) record(day)
  }

  // 3) trechos contíguos de estação (para faixas e gradiente da linha)
  const runs: SeasonRun[] = []
  let cur = daySeason[0]
  let start = 0
  for (let i = 1; i < D; i++) {
    if (daySeason[i] !== cur) {
      runs.push({ season: cur, startDay: start, endDay: i - 1 })
      cur = daySeason[i]
      start = i
    }
  }
  runs.push({ season: cur, startDay: start, endDay: D - 1 })

  return {
    points,
    runs,
    finalTotalWeight: heads * (initialPerHead + cumGainPerHead),
    totalGain: heads * cumGainPerHead,
    feedTotalKg: feedCum,
    gmdPerHead,
  }
}
