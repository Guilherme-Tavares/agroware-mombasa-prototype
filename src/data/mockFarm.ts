import type {
  Producer,
  Farm,
  Division,
  Forage,
  Herd,
  Bovine,
  Allocation,
  FeedTrough,
  Feed,
  Season,
  SeasonPassage,
} from '@/types/domain'

export interface MockData {
  producer: Producer
  farm: Farm
  divisions: Division[]
  forages: Forage[]
  herds: Herd[]
  bovines: Bovine[]
  allocations: Allocation[]
  feedTroughs: FeedTrough[]
  feeds: Feed[]
  seasons: Season[]
  seasonPassages: SeasonPassage[]
}

// ─── Producer ────────────────────────────────────────────────────────────────

const producer: Producer = {
  id: 'producer_001',
  name: 'Guilherme Maricato Tavares',
  email: 'guilhermemaricatotavares@gmail.com',
}

// ─── Farm ─────────────────────────────────────────────────────────────────────
// Polígono no viewBox 1000×700 — forma orgânica irregular representando a Fazenda São José

const farm: Farm = {
  id: 'farm_001',
  producerId: 'producer_001',
  name: 'Fazenda São José',
  city: 'Ji-Paraná',
  state: 'RO',
  totalArea: 125.5,
  perimeter: 4820,
  polygon: [
    { x: 80, y: 100 },
    { x: 220, y: 55 },
    { x: 420, y: 40 },
    { x: 620, y: 50 },
    { x: 800, y: 80 },
    { x: 920, y: 180 },
    { x: 940, y: 360 },
    { x: 900, y: 540 },
    { x: 780, y: 640 },
    { x: 580, y: 660 },
    { x: 380, y: 655 },
    { x: 200, y: 630 },
    { x: 90, y: 520 },
    { x: 65, y: 320 },
  ],
}

// ─── Forages ──────────────────────────────────────────────────────────────────

const forages: Forage[] = [
  {
    id: 'forage_01',
    name: 'Capim Mombaça',
    scientificName: 'Megathyrsus maximus cv. Mombaça',
  },
  {
    id: 'forage_02',
    name: 'Brachiaria',
    scientificName: 'Urochloa brizantha cv. Marandu',
  },
]

// ─── Divisions (Piquetes) ─────────────────────────────────────────────────────

const divisions: Division[] = [
  {
    id: 'div_01',
    farmId: 'farm_001',
    name: 'Piquete 1',
    area: 5.2,
    type: 'pasture',
    status: 'active',
    forageId: 'forage_01',
    forageStartDate: '2025-03-15',
    polygon: [
      { x: 680, y: 100 },
      { x: 820, y: 130 },
      { x: 870, y: 250 },
      { x: 800, y: 340 },
      { x: 650, y: 310 },
      { x: 620, y: 200 },
    ],
  },
  {
    id: 'div_02',
    farmId: 'farm_001',
    name: 'Piquete 2',
    area: 4.8,
    type: 'pasture',
    status: 'active',
    forageId: 'forage_01',
    forageStartDate: '2025-04-10',
    polygon: [
      { x: 360, y: 120 },
      { x: 560, y: 100 },
      { x: 600, y: 200 },
      { x: 540, y: 295 },
      { x: 380, y: 285 },
      { x: 320, y: 210 },
    ],
  },
  {
    id: 'div_03',
    farmId: 'farm_001',
    name: 'Piquete 3',
    area: 6.0,
    type: 'pasture',
    status: 'active',
    forageId: 'forage_01',
    forageStartDate: '2025-02-20',
    polygon: [
      { x: 310, y: 305 },
      { x: 540, y: 305 },
      { x: 640, y: 345 },
      { x: 670, y: 460 },
      { x: 530, y: 510 },
      { x: 360, y: 500 },
      { x: 255, y: 415 },
    ],
  },
  {
    id: 'div_04',
    farmId: 'farm_001',
    name: 'Piquete 4',
    area: 3.5,
    type: 'pasture',
    status: 'active',
    forageId: 'forage_02',
    forageStartDate: '2024-11-05',
    polygon: [
      { x: 90, y: 215 },
      { x: 245, y: 185 },
      { x: 285, y: 295 },
      { x: 240, y: 390 },
      { x: 100, y: 375 },
      { x: 72, y: 290 },
    ],
  },
  {
    id: 'div_05',
    farmId: 'farm_001',
    name: 'Piquete 5',
    area: 8.0,
    type: 'pasture',
    status: 'active',
    forageId: 'forage_01',
    forageStartDate: '2025-08-01',
    polygon: [
      { x: 100, y: 430 },
      { x: 255, y: 420 },
      { x: 360, y: 530 },
      { x: 460, y: 595 },
      { x: 590, y: 575 },
      { x: 680, y: 515 },
      { x: 720, y: 580 },
      { x: 600, y: 640 },
      { x: 380, y: 648 },
      { x: 160, y: 620 },
      { x: 88, y: 520 },
    ],
  },
]

// ─── Herds ────────────────────────────────────────────────────────────────────

const herds: Herd[] = [
  {
    id: 'herd_01',
    farmId: 'farm_001',
    name: 'Lote A - Recria',
    purpose: 'recria',
    formedAt: '2025-12-10',
    notes: 'Animais adquiridos em Cacoal, desmamados com peso médio 195 kg.',
  },
  {
    id: 'herd_02',
    farmId: 'farm_001',
    name: 'Lote B - Engorda',
    purpose: 'engorda',
    formedAt: '2025-10-15',
    notes: 'Lote em fase final de engorda. Verificar pesagem — atrasada.',
  },
  {
    id: 'herd_03',
    farmId: 'farm_001',
    name: 'Lote C - Recria',
    purpose: 'recria',
    formedAt: '2026-01-20',
    notes: 'Entrada mais recente. Animais em adaptação ao pasto.',
  },
]

// ─── Bovine factory ───────────────────────────────────────────────────────────

const NAMES_POOL = [
  'Trovão', 'Estrela', 'Pardo', 'Manchado', 'Pintado',
  'Branco', 'Negão', 'Vermelho', 'Ligeiro', 'Valente',
  'Barroso', 'Escuro', 'Rajado', 'Faísca', 'Relâmpago',
  'Fumaça', 'Peão', 'Forte', 'Sereno', 'Calmo',
  'Guerreiro', 'Laço', 'Bravão', 'Marrão', 'Pedrão',
  'Foguete', 'Ventania', 'Ciclone', 'Tonelada', 'Gigante',
  'Sertão', 'Bravo', 'Manso', 'Sertanejo', 'Boiadeiro',
  'Tropeiro', 'Mascavo', 'Catingueiro', 'Barrilão', 'Xerém',
]

const BREEDS = ['Nelore', 'Nelore', 'Nelore', 'Anelorado', 'Nelore', 'Nelore', 'Brangus']

const BIRTH_DATES = [
  '2025-01-10', '2025-01-25', '2025-02-08', '2025-02-20',
  '2025-03-05', '2025-03-18', '2025-04-02',
]

const WEIGH_DATES_LOTE_A = '2026-04-10'
const WEIGH_DATES_LOTE_B = '2026-03-28' // pesagem atrasada (~44 dias)
const WEIGH_DATES_LOTE_C = '2026-04-22'

function makeBovines(
  herdId: string,
  count: number,
  globalStart: number,
  avgWeight: number,
  earTagStart: number,
  lastWeighDate: string,
): Bovine[] {
  return Array.from({ length: count }, (_, i) => {
    const globalIndex = globalStart + i
    const nameIndex = globalIndex % NAMES_POOL.length
    const name = globalIndex < NAMES_POOL.length
      ? NAMES_POOL[nameIndex]
      : `${NAMES_POOL[nameIndex]} ${Math.floor(globalIndex / NAMES_POOL.length) + 1}`
    const weightVariation = ((i % 7) - 3) * 15
    return {
      id: `bovine_${String(globalIndex + 1).padStart(3, '0')}`,
      herdId,
      name,
      earTag: `BR-2024-${String(earTagStart + i).padStart(3, '0')}`,
      sex: 'M' as const,
      breed: BREEDS[i % BREEDS.length],
      birthDate: BIRTH_DATES[i % BIRTH_DATES.length],
      currentWeight: Math.max(185, avgWeight + weightVariation),
      lastWeighDate,
      origin: 'purchased' as const,
    }
  })
}

// Lote A: 25 cabeças, peso médio 285 kg, GMD 0.850
// Lote B: 40 cabeças, peso médio 420 kg, GMD 0.920
// Lote C: 20 cabeças, peso médio 260 kg, GMD 0.780
const bovines: Bovine[] = [
  ...makeBovines('herd_01', 25, 0, 285, 101, WEIGH_DATES_LOTE_A),
  ...makeBovines('herd_02', 40, 25, 420, 126, WEIGH_DATES_LOTE_B),
  ...makeBovines('herd_03', 20, 65, 260, 166, WEIGH_DATES_LOTE_C),
]

// ─── Allocations ──────────────────────────────────────────────────────────────

const allocations: Allocation[] = [
  {
    id: 'alloc_01',
    herdId: 'herd_01',
    divisionId: 'div_01',
    startDate: '2025-12-10',
    active: true,
  },
  {
    id: 'alloc_02',
    herdId: 'herd_02',
    divisionId: 'div_03',
    startDate: '2025-10-15',
    active: true,
  },
  {
    id: 'alloc_03',
    herdId: 'herd_03',
    divisionId: 'div_04',
    startDate: '2026-01-20',
    active: true,
  },
]

// ─── Feeds ────────────────────────────────────────────────────────────────────

const feeds: Feed[] = [
  { id: 'feed_01', name: 'Ração 18% PB', proteinPercentage: 18 },
  { id: 'feed_02', name: 'Ração 16% PB', proteinPercentage: 16 },
  { id: 'feed_03', name: 'Sal Mineral', proteinPercentage: 0 },
]

// ─── Feed Troughs ─────────────────────────────────────────────────────────────

const feedTroughs: FeedTrough[] = [
  {
    id: 'trough_01',
    divisionId: 'div_01',
    identifier: 'C-01',
    capacity: 200,
    material: 'concrete',
    position: { x: 730, y: 175 },
    currentAmount: 160,
    currentFeedId: 'feed_01',
    consumptionRate: 15,
    lastRefillDate: '2026-05-02',
    refillHistory: [
      { date: '2026-05-02', amount: 200, feedId: 'feed_01' },
      { date: '2026-04-19', amount: 180, feedId: 'feed_01' },
      { date: '2026-04-07', amount: 200, feedId: 'feed_01' },
      { date: '2026-03-25', amount: 190, feedId: 'feed_01' },
      { date: '2026-03-12', amount: 200, feedId: 'feed_01' },
    ],
  },
  {
    id: 'trough_02',
    divisionId: 'div_01',
    identifier: 'C-02',
    capacity: 200,
    material: 'concrete',
    position: { x: 780, y: 265 },
    currentAmount: 90,
    currentFeedId: 'feed_01',
    consumptionRate: 12,
    lastRefillDate: '2026-04-30',
    refillHistory: [
      { date: '2026-04-30', amount: 200, feedId: 'feed_01' },
      { date: '2026-04-14', amount: 185, feedId: 'feed_01' },
      { date: '2026-03-31', amount: 200, feedId: 'feed_01' },
      { date: '2026-03-17', amount: 190, feedId: 'feed_01' },
      { date: '2026-03-04', amount: 200, feedId: 'feed_01' },
    ],
  },
  {
    id: 'trough_03',
    divisionId: 'div_03',
    identifier: 'C-03',
    capacity: 250,
    material: 'plastic',
    position: { x: 490, y: 405 },
    currentAmount: 30,
    currentFeedId: 'feed_03',
    consumptionRate: 5,
    lastRefillDate: '2026-04-28',
    refillHistory: [
      { date: '2026-04-28', amount: 250, feedId: 'feed_03' },
      { date: '2026-04-03', amount: 220, feedId: 'feed_03' },
      { date: '2026-03-10', amount: 250, feedId: 'feed_03' },
      { date: '2026-02-15', amount: 240, feedId: 'feed_03' },
      { date: '2026-01-22', amount: 250, feedId: 'feed_03' },
    ],
  },
  {
    id: 'trough_04',
    divisionId: 'div_04',
    identifier: 'C-04',
    capacity: 150,
    material: 'metal',
    position: { x: 175, y: 295 },
    currentAmount: 120,
    currentFeedId: 'feed_02',
    consumptionRate: 10,
    lastRefillDate: '2026-05-05',
    refillHistory: [
      { date: '2026-05-05', amount: 150, feedId: 'feed_02' },
      { date: '2026-04-20', amount: 140, feedId: 'feed_02' },
      { date: '2026-04-06', amount: 150, feedId: 'feed_02' },
      { date: '2026-03-23', amount: 145, feedId: 'feed_02' },
      { date: '2026-03-09', amount: 150, feedId: 'feed_02' },
    ],
  },
]

// ─── Seasons ──────────────────────────────────────────────────────────────────

const seasons: Season[] = [
  {
    id: 'season_01',
    name: 'Seca 2025',
    type: 'seca',
    startDate: '2025-05-01',
    endDate: '2025-09-30',
  },
  {
    id: 'season_02',
    name: 'Águas 2025/2026',
    type: 'aguas',
    startDate: '2025-10-01',
    endDate: '2026-04-30',
  },
  {
    id: 'season_03',
    name: 'Transição 2026',
    type: 'transicao',
    startDate: '2026-05-01',
    endDate: '2026-06-30',
  },
]

// ─── Season Passages (histórico de desempenho) ────────────────────────────────

const seasonPassages: SeasonPassage[] = [
  // Seca 2025: Lote B precursor (animais que hoje são o Lote B, em recria na seca)
  {
    id: 'sp_01',
    herdId: 'herd_02',
    seasonId: 'season_01',
    initialWeight: 220,
    finalWeight: 320,
    days: 153,
    gmd: Number(((320 - 220) / 153).toFixed(3)),
  },
  // Águas 2025/2026: Lote A
  {
    id: 'sp_02',
    herdId: 'herd_01',
    seasonId: 'season_02',
    initialWeight: 195,
    finalWeight: 285,
    days: 122,
    gmd: Number(((285 - 195) / 122).toFixed(3)),
  },
  // Águas 2025/2026: Lote B
  {
    id: 'sp_03',
    herdId: 'herd_02',
    seasonId: 'season_02',
    initialWeight: 320,
    finalWeight: 420,
    days: 109,
    gmd: Number(((420 - 320) / 109).toFixed(3)),
  },
]

// ─── Export ───────────────────────────────────────────────────────────────────

export const mockData: MockData = {
  producer,
  farm,
  divisions,
  forages,
  herds,
  bovines,
  allocations,
  feedTroughs,
  feeds,
  seasons,
  seasonPassages,
}
