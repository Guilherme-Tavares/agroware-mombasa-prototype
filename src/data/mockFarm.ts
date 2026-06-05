import type {
  User,
  UserConfig,
  UserProperty,
  Invitation,
  Farm,
  Division,
  Forage,
  ForagePlanting,
  Herd,
  Bovine,
  BovinePhoto,
  Season,
  Weighing,
  Medication,
  MedicationStock,
  MedicationApplication,
  SanitaryEvent,
  Feed,
  FeedStock,
  Allocation,
  Membership,
  SeasonPassage,
  FeedTrough,
  BovineTransfer,
  Task,
  ExpenseCategory,
  Expense,
  SaleLot,
  SaleLotBovine,
  Sale,
  Notification,
  NotificationUser,
} from '@/types/domain'

export interface MockData {
  // Conta e acesso
  user: User
  users: User[]
  userConfig: UserConfig
  userProperties: UserProperty[]
  invitations: Invitation[]
  // Propriedade e pastagem
  farm: Farm
  farms: Farm[]
  divisions: Division[]
  forages: Forage[]
  foragePlantings: ForagePlanting[]
  feedTroughs: FeedTrough[]
  // Rebanho e animais
  herds: Herd[]
  bovines: Bovine[]
  bovinePhotos: BovinePhoto[]
  seasons: Season[]
  weighings: Weighing[]
  // Sanidade
  medications: Medication[]
  medicationStocks: MedicationStock[]
  medicationApplications: MedicationApplication[]
  sanitaryEvents: SanitaryEvent[]
  // Alimentação
  feeds: Feed[]
  feedStocks: FeedStock[]
  // Operações
  allocations: Allocation[]
  memberships: Membership[]
  seasonPassages: SeasonPassage[]
  bovineTransfers: BovineTransfer[]
  // Agenda
  tasks: Task[]
  // Financeiro
  expenseCategories: ExpenseCategory[]
  expenses: Expense[]
  saleLots: SaleLot[]
  saleLotBovines: SaleLotBovine[]
  sales: Sale[]
  // Notificações
  notifications: Notification[]
  notificationUsers: NotificationUser[]

  /** Alias histórico do dono; usar `user`. */
  producer: User
}

// IDs estáveis usados em todo o dataset.
const OWNER_ID = 'user_001'
const FARM_ID = 'farm_001'
const FARM_2_ID = 'farm_002'

const NOW = '2026-06-05T08:00:00.000Z'
const audit = { active: true, createdAt: NOW, updatedAt: NOW }

// ─── Usuários e acesso ──────────────────────────────────────────────────────

const user: User = {
  id: OWNER_ID,
  name: 'Produtor Demonstração',
  email: null,
  phone: null,
  online: false,
  ...audit,
}

// Usuários mock para demonstrar o multiusuário (sem e-mail real enviado).
const users: User[] = [
  user,
  { id: 'user_002', name: 'João Vaqueiro', email: 'joao@exemplo.com', phone: '69 99999-0002', online: true, ...audit },
  { id: 'user_003', name: 'Maria Campo', email: 'maria@exemplo.com', phone: '69 99999-0003', online: true, ...audit },
]

const userConfig: UserConfig = {
  id: 'config_001',
  userId: OWNER_ID,
  defaultPropertyId: FARM_ID,
  theme: 'claro',
  language: 'pt-BR',
  weightUnit: 'kg',
  alertsEnabled: true,
  ...audit,
}

const userProperties: UserProperty[] = [
  { id: 'up_001', userId: OWNER_ID, propertyId: FARM_ID, accessLevel: 'produtor', ...audit },
  { id: 'up_002', userId: 'user_002', propertyId: FARM_ID, accessLevel: 'colaborador', ...audit },
  { id: 'up_003', userId: 'user_003', propertyId: FARM_ID, accessLevel: 'visitante', ...audit },
  { id: 'up_004', userId: OWNER_ID, propertyId: FARM_2_ID, accessLevel: 'produtor', ...audit },
]

const invitations: Invitation[] = [
  {
    id: 'inv_001',
    propertyId: FARM_ID,
    inviterUserId: OWNER_ID,
    invitedUserId: 'user_003',
    invitedEmail: 'maria@exemplo.com',
    offeredLevel: 'visitante',
    status: 'aceito',
    ...audit,
  },
]

// ─── Propriedades ──────────────────────────────────────────────────────────
// Sítio Santa Fé, próximo a Ji-Paraná, Rondônia. Polígono ilustrado no
// viewBox 1000×700; polígono geográfico real plausível para o mapa Leaflet.

const GEO_CENTER = { lat: -10.9295, lng: -61.9912 }

const farm: Farm = {
  id: FARM_ID,
  ownerId: OWNER_ID,
  name: 'Sítio Santa Fé',
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
  geoCenter: GEO_CENTER,
  geoPolygon: [
    { lat: -10.9210, lng: -62.0010 },
    { lat: -10.9205, lng: -61.9905 },
    { lat: -10.9215, lng: -61.9805 },
    { lat: -10.9270, lng: -61.9770 },
    { lat: -10.9355, lng: -61.9785 },
    { lat: -10.9395, lng: -61.9865 },
    { lat: -10.9390, lng: -61.9965 },
    { lat: -10.9340, lng: -62.0025 },
    { lat: -10.9260, lng: -62.0035 },
  ],
  mapBaseCapturedAt: null,
  ...audit,
}

// Segunda propriedade (mínima) para demonstrar seleção de propriedade ativa
// (RF06) e transferência de bovino entre propriedades (RF33). A propriedade
// ativa padrão é o Sítio Santa Fé (FARM_ID).
const farm2: Farm = {
  id: FARM_2_ID,
  ownerId: OWNER_ID,
  name: 'Sítio Serra Azul',
  city: 'Presidente Médici',
  state: 'RO',
  totalArea: 88.0,
  perimeter: 3900,
  polygon: [
    { x: 120, y: 120 },
    { x: 700, y: 90 },
    { x: 880, y: 300 },
    { x: 760, y: 600 },
    { x: 240, y: 620 },
    { x: 90, y: 360 },
  ],
  geoCenter: { lat: -11.1750, lng: -61.9010 },
  mapBaseCapturedAt: null,
  ...audit,
}

const farms: Farm[] = [farm, farm2]

// ─── Forragens (catálogo de espécies) ────────────────────────────────────────

const forages: Forage[] = [
  { id: 'forage_01', name: 'Capim Mombaça', scientificName: 'Megathyrsus maximus cv. Mombaça' },
  { id: 'forage_02', name: 'Brachiaria', scientificName: 'Urochloa brizantha cv. Marandu' },
]

// ─── Divisões (Piquetes) ──────────────────────────────────────────────────────

const divisions: Division[] = [
  {
    id: 'div_01', farmId: FARM_ID, name: 'Piquete 1', area: 5.2, type: 'pasto',
    status: 'active', forageId: 'forage_01', forageStartDate: '2025-03-15',
    polygon: [
      { x: 680, y: 100 }, { x: 820, y: 130 }, { x: 870, y: 250 },
      { x: 800, y: 340 }, { x: 650, y: 310 }, { x: 620, y: 200 },
    ],
    ...audit,
  },
  {
    id: 'div_02', farmId: FARM_ID, name: 'Piquete 2', area: 4.8, type: 'pasto',
    status: 'active', forageId: 'forage_01', forageStartDate: '2025-04-10',
    polygon: [
      { x: 360, y: 120 }, { x: 560, y: 100 }, { x: 600, y: 200 },
      { x: 540, y: 295 }, { x: 380, y: 285 }, { x: 320, y: 210 },
    ],
    ...audit,
  },
  {
    id: 'div_03', farmId: FARM_ID, name: 'Piquete 3', area: 6.0, type: 'pasto',
    status: 'active', forageId: 'forage_01', forageStartDate: '2025-02-20',
    polygon: [
      { x: 310, y: 305 }, { x: 540, y: 305 }, { x: 640, y: 345 },
      { x: 670, y: 460 }, { x: 530, y: 510 }, { x: 360, y: 500 }, { x: 255, y: 415 },
    ],
    ...audit,
  },
  {
    id: 'div_04', farmId: FARM_ID, name: 'Piquete 4', area: 3.5, type: 'pasto',
    status: 'active', forageId: 'forage_02', forageStartDate: '2024-11-05',
    polygon: [
      { x: 90, y: 215 }, { x: 245, y: 185 }, { x: 285, y: 295 },
      { x: 240, y: 390 }, { x: 100, y: 375 }, { x: 72, y: 290 },
    ],
    ...audit,
  },
  {
    id: 'div_05', farmId: FARM_ID, name: 'Piquete 5', area: 8.0, type: 'pasto',
    status: 'active', forageId: 'forage_01', forageStartDate: '2025-08-01',
    polygon: [
      { x: 100, y: 430 }, { x: 255, y: 420 }, { x: 360, y: 530 }, { x: 460, y: 595 },
      { x: 590, y: 575 }, { x: 680, y: 515 }, { x: 720, y: 580 }, { x: 600, y: 640 },
      { x: 380, y: 648 }, { x: 160, y: 620 }, { x: 88, y: 520 },
    ],
    ...audit,
  },
]

// forragem (DDL): plantio derivado das divisões com forrageira ativa.
const foragePlantings: ForagePlanting[] = divisions
  .filter((d) => d.forageId)
  .map((d, i) => ({
    id: `planting_${String(i + 1).padStart(2, '0')}`,
    divisionId: d.id,
    speciesId: d.forageId,
    type: forages.find((f) => f.id === d.forageId)?.name ?? 'Capim Mombaça',
    plantingDate: d.forageStartDate,
    ...audit,
  }))

// ─── Rebanhos ──────────────────────────────────────────────────────────────────

const herds: Herd[] = [
  { id: 'herd_01', farmId: FARM_ID, name: 'Lote A - Recria', purpose: 'recria', formedAt: '2025-12-10', notes: 'Animais adquiridos em Cacoal, desmamados com peso médio 195 kg.', ...audit },
  { id: 'herd_02', farmId: FARM_ID, name: 'Lote B - Engorda', purpose: 'engorda', formedAt: '2025-10-15', notes: 'Lote em fase final de engorda. Verificar pesagem — atrasada.', ...audit },
  { id: 'herd_03', farmId: FARM_ID, name: 'Lote C - Recria', purpose: 'recria', formedAt: '2026-01-20', notes: 'Entrada mais recente. Animais em adaptação ao pasto.', ...audit },
]

// ─── Bovinos (factory) ──────────────────────────────────────────────────────────

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
      propertyId: FARM_ID,
      herdId,
      name,
      earTag: `BR-2024-${String(earTagStart + i).padStart(3, '0')}`,
      sex: 'M' as const,
      breed: BREEDS[i % BREEDS.length],
      birthDate: BIRTH_DATES[i % BIRTH_DATES.length],
      currentWeight: Math.max(185, avgWeight + weightVariation),
      lastWeighDate,
      origin: 'comprado' as const,
      ...audit,
    }
  })
}

const bovines: Bovine[] = [
  ...makeBovines('herd_01', 25, 0, 285, 101, WEIGH_DATES_LOTE_A),
  ...makeBovines('herd_02', 40, 25, 420, 126, WEIGH_DATES_LOTE_B),
  ...makeBovines('herd_03', 20, 65, 260, 166, WEIGH_DATES_LOTE_C),
]

// Sem fotos por padrão; coleção pronta para receber base64/caminho.
const bovinePhotos: BovinePhoto[] = []

// pesagem: a última pesagem de cada bovino, coerente com o cache de peso.
const weighings: Weighing[] = bovines.map((b, i) => ({
  id: `weigh_${String(i + 1).padStart(3, '0')}`,
  bovineId: b.id,
  date: b.lastWeighDate,
  weightKg: b.currentWeight,
  method: 'visual' as const,
  ...audit,
}))

// pertencimento: vínculo atual de cada bovino com seu rebanho.
const memberships: Membership[] = bovines.map((b, i) => ({
  id: `member_${String(i + 1).padStart(3, '0')}`,
  bovineId: b.id,
  herdId: b.herdId as string,
  startDate: herds.find((h) => h.id === b.herdId)?.formedAt ?? '2025-12-10',
  entryWeightKg: Math.max(180, b.currentWeight - 40),
  ...audit,
}))

// ─── Temporadas ─────────────────────────────────────────────────────────────

const seasons: Season[] = [
  { id: 'season_01', propertyId: FARM_ID, name: 'Seca 2025', type: 'seca', startDate: '2025-05-01', endDate: '2025-09-30', ...audit },
  { id: 'season_02', propertyId: FARM_ID, name: 'Águas 2025/2026', type: 'aguas', startDate: '2025-10-01', endDate: '2026-04-30', ...audit },
  { id: 'season_03', propertyId: FARM_ID, name: 'Transição 2026', type: 'transicao', startDate: '2026-05-01', endDate: '2026-06-30', ...audit },
]

const seasonPassages: SeasonPassage[] = [
  { id: 'sp_01', herdId: 'herd_02', seasonId: 'season_01', initialWeight: 220, finalWeight: 320, days: 153, gmd: Number(((320 - 220) / 153).toFixed(3)), ...audit },
  { id: 'sp_02', herdId: 'herd_01', seasonId: 'season_02', initialWeight: 195, finalWeight: 285, days: 122, gmd: Number(((285 - 195) / 122).toFixed(3)), ...audit },
  { id: 'sp_03', herdId: 'herd_02', seasonId: 'season_02', initialWeight: 320, finalWeight: 420, days: 109, gmd: Number(((420 - 320) / 109).toFixed(3)), ...audit },
]

// ─── Medicamentos e estoque ───────────────────────────────────────────────────

const medications: Medication[] = [
  { id: 'med_01', propertyId: FARM_ID, commercialName: 'Ivomec Gold', activeIngredient: 'Ivermectina 3,15%', type: 'antiparasitario', ...audit },
  { id: 'med_02', propertyId: FARM_ID, commercialName: 'Vencobenzol', activeIngredient: 'Albendazol', type: 'antiparasitario', ...audit },
  { id: 'med_03', propertyId: FARM_ID, commercialName: 'Zoetis Botuvacina', activeIngredient: 'Toxoide botulínico', type: 'vacina', ...audit },
  { id: 'med_04', propertyId: FARM_ID, commercialName: 'ADE Vallée', activeIngredient: 'Vitaminas A, D, E', type: 'vitamina', ...audit },
]

const medicationStocks: MedicationStock[] = [
  { id: 'medstock_01', propertyId: FARM_ID, medicationId: 'med_01', quantity: 500, unit: 'ml', entryDate: '2026-03-01', minimumStock: 200, ...audit },
  { id: 'medstock_02', propertyId: FARM_ID, medicationId: 'med_02', quantity: 1200, unit: 'ml', entryDate: '2026-02-15', minimumStock: 300, ...audit },
  { id: 'medstock_03', propertyId: FARM_ID, medicationId: 'med_03', quantity: 40, unit: 'doses', entryDate: '2026-04-10', minimumStock: 50, ...audit }, // abaixo do mínimo
  { id: 'medstock_04', propertyId: FARM_ID, medicationId: 'med_04', quantity: 800, unit: 'ml', entryDate: '2026-03-20', minimumStock: 200, ...audit },
]

const medicationApplications: MedicationApplication[] = [
  { id: 'app_01', bovineId: 'bovine_026', medicationId: 'med_01', appliedAt: '2026-04-12T09:30:00', dose: 8, doseUnit: 'ml', ...audit },
  { id: 'app_02', bovineId: 'bovine_027', medicationId: 'med_01', appliedAt: '2026-04-12T09:35:00', dose: 8, doseUnit: 'ml', ...audit },
  { id: 'app_03', bovineId: 'bovine_001', medicationId: 'med_04', appliedAt: '2026-03-22T15:00:00', dose: 5, doseUnit: 'ml', ...audit },
]

const sanitaryEvents: SanitaryEvent[] = [
  { id: 'sanit_01', propertyId: FARM_ID, medicationId: 'med_03', herdId: 'herd_02', type: 'Vacinação botulismo', scheduledDate: '2026-06-15', status: 'pendente', ...audit },
  { id: 'sanit_02', propertyId: FARM_ID, medicationId: 'med_01', herdId: 'herd_01', type: 'Vermifugação', scheduledDate: '2026-04-12', status: 'executado', executionDate: '2026-04-12', applicationId: 'app_01', ...audit },
  { id: 'sanit_03', propertyId: FARM_ID, medicationId: 'med_04', herdId: 'herd_03', type: 'Suplementação ADE', scheduledDate: '2026-06-08', status: 'pendente', ...audit },
]

// ─── Alimentos e estoque ────────────────────────────────────────────────────

const feeds: Feed[] = [
  { id: 'feed_01', propertyId: FARM_ID, name: 'Ração 18% PB', type: 'racao', proteinPercentage: 18, ...audit },
  { id: 'feed_02', propertyId: FARM_ID, name: 'Ração 16% PB', type: 'racao', proteinPercentage: 16, ...audit },
  { id: 'feed_03', propertyId: FARM_ID, name: 'Sal Mineral', type: 'sal_mineral', proteinPercentage: 0, ...audit },
]

const feedStocks: FeedStock[] = [
  { id: 'feedstock_01', propertyId: FARM_ID, feedId: 'feed_01', quantity: 1500, unit: 'kg', entryDate: '2026-04-25', minimumStock: 500, ...audit },
  { id: 'feedstock_02', propertyId: FARM_ID, feedId: 'feed_02', quantity: 400, unit: 'kg', entryDate: '2026-05-01', minimumStock: 500, ...audit }, // abaixo do mínimo
  { id: 'feedstock_03', propertyId: FARM_ID, feedId: 'feed_03', quantity: 800, unit: 'kg', entryDate: '2026-04-18', minimumStock: 200, ...audit },
]

// ─── Cochos ─────────────────────────────────────────────────────────────────

const feedTroughs: FeedTrough[] = [
  {
    id: 'trough_01', divisionId: 'div_01', identifier: 'C-01', capacity: 200, material: 'concreto',
    position: { x: 730, y: 175 }, currentAmount: 160, currentFeedId: 'feed_01', consumptionRate: 15,
    lastRefillDate: '2026-05-02',
    refillHistory: [
      { date: '2026-05-02', amount: 200, feedId: 'feed_01', consumptionRate: 15 },
      { date: '2026-04-19', amount: 180, feedId: 'feed_01', consumptionRate: 15 },
      { date: '2026-04-07', amount: 200, feedId: 'feed_01', consumptionRate: 15 },
      { date: '2026-03-25', amount: 190, feedId: 'feed_01', consumptionRate: 15 },
      { date: '2026-03-12', amount: 200, feedId: 'feed_01', consumptionRate: 15 },
    ],
    ...audit,
  },
  {
    id: 'trough_02', divisionId: 'div_01', identifier: 'C-02', capacity: 200, material: 'concreto',
    position: { x: 780, y: 265 }, currentAmount: 90, currentFeedId: 'feed_01', consumptionRate: 12,
    lastRefillDate: '2026-04-30',
    refillHistory: [
      { date: '2026-04-30', amount: 200, feedId: 'feed_01', consumptionRate: 12 },
      { date: '2026-04-14', amount: 185, feedId: 'feed_01', consumptionRate: 12 },
      { date: '2026-03-31', amount: 200, feedId: 'feed_01', consumptionRate: 12 },
      { date: '2026-03-17', amount: 190, feedId: 'feed_01', consumptionRate: 12 },
      { date: '2026-03-04', amount: 200, feedId: 'feed_01', consumptionRate: 12 },
    ],
    ...audit,
  },
  {
    id: 'trough_03', divisionId: 'div_03', identifier: 'C-03', capacity: 250, material: 'plastico',
    position: { x: 490, y: 405 }, currentAmount: 30, currentFeedId: 'feed_03', consumptionRate: 5,
    lastRefillDate: '2026-04-28',
    refillHistory: [
      { date: '2026-04-28', amount: 250, feedId: 'feed_03', consumptionRate: 5 },
      { date: '2026-04-03', amount: 220, feedId: 'feed_03', consumptionRate: 5 },
      { date: '2026-03-10', amount: 250, feedId: 'feed_03', consumptionRate: 5 },
      { date: '2026-02-15', amount: 240, feedId: 'feed_03', consumptionRate: 5 },
      { date: '2026-01-22', amount: 250, feedId: 'feed_03', consumptionRate: 5 },
    ],
    ...audit,
  },
  {
    id: 'trough_04', divisionId: 'div_04', identifier: 'C-04', capacity: 150, material: 'metal',
    position: { x: 175, y: 295 }, currentAmount: 120, currentFeedId: 'feed_02', consumptionRate: 10,
    lastRefillDate: '2026-05-05',
    refillHistory: [
      { date: '2026-05-05', amount: 150, feedId: 'feed_02', consumptionRate: 10 },
      { date: '2026-04-20', amount: 140, feedId: 'feed_02', consumptionRate: 10 },
      { date: '2026-04-06', amount: 150, feedId: 'feed_02', consumptionRate: 10 },
      { date: '2026-03-23', amount: 145, feedId: 'feed_02', consumptionRate: 10 },
      { date: '2026-03-09', amount: 150, feedId: 'feed_02', consumptionRate: 10 },
    ],
    ...audit,
  },
]

// ─── Lotação ────────────────────────────────────────────────────────────────

const allocations: Allocation[] = [
  { id: 'alloc_01', herdId: 'herd_01', divisionId: 'div_01', startDate: '2025-12-10', headCount: 25, ...audit },
  { id: 'alloc_02', herdId: 'herd_02', divisionId: 'div_03', startDate: '2025-10-15', headCount: 40, ...audit },
  { id: 'alloc_03', herdId: 'herd_03', divisionId: 'div_04', startDate: '2026-01-20', headCount: 20, ...audit },
]

// ─── Transferência de bovino ──────────────────────────────────────────────────

const bovineTransfers: BovineTransfer[] = [
  { id: 'transf_01', bovineId: 'bovine_085', originPropertyId: FARM_2_ID, destinationPropertyId: FARM_ID, userId: OWNER_ID, date: '2026-01-20', reason: 'Realocação para recria', ...audit },
]

// ─── Agenda de tarefas ────────────────────────────────────────────────────────

const tasks: Task[] = [
  { id: 'task_01', propertyId: FARM_ID, divisionId: 'div_03', title: 'Reparar cerca do Piquete 3', description: 'Mourão caído na divisa leste.', dueDate: '2026-06-10', status: 'pendente', ...audit },
  { id: 'task_02', propertyId: FARM_ID, herdId: 'herd_02', title: 'Pesar Lote B', description: 'Pesagem atrasada desde 28/03.', dueDate: '2026-06-07', status: 'pendente', ...audit },
  { id: 'task_03', propertyId: FARM_ID, title: 'Cotar preço da arroba', dueDate: '2026-06-06', status: 'concluida', ...audit },
]

// ─── Financeiro ───────────────────────────────────────────────────────────────

const expenseCategories: ExpenseCategory[] = [
  { id: 'cat_01', propertyId: FARM_ID, name: 'Ração e suplemento', group: 'insumo_alimenticio', ...audit },
  { id: 'cat_02', propertyId: FARM_ID, name: 'Medicamentos e vacinas', group: 'insumo_sanitario', ...audit },
  { id: 'cat_03', propertyId: FARM_ID, name: 'Cercas e instalações', group: 'infraestrutura', ...audit },
  { id: 'cat_04', propertyId: FARM_ID, name: 'Frete e serviços', group: 'servico', ...audit },
]

const expenses: Expense[] = [
  { id: 'exp_01', propertyId: FARM_ID, categoryId: 'cat_01', description: 'Compra de 1,5 t de ração 18% PB', amount: 4200, date: '2026-04-25', ...audit },
  { id: 'exp_02', propertyId: FARM_ID, categoryId: 'cat_02', description: 'Ivomec Gold 500 ml', amount: 320, date: '2026-03-01', ...audit },
  { id: 'exp_03', propertyId: FARM_ID, categoryId: 'cat_03', divisionId: 'div_03', description: 'Reforma de cerca', amount: 1800, date: '2026-02-10', ...audit },
  { id: 'exp_04', propertyId: FARM_ID, categoryId: 'cat_04', description: 'Frete de bezerros', amount: 950, date: '2025-12-08', ...audit },
]

const saleLots: SaleLot[] = [
  { id: 'salelot_01', propertyId: FARM_ID, identifier: 'Lote Venda 01/2026', status: 'disponivel', averageWeightKg: 425, totalArrobas: 0, ...audit },
]

// N:N: associa alguns bovinos do Lote B (engorda) ao lote comercial.
const saleLotBovines: SaleLotBovine[] = bovines
  .filter((b) => b.herdId === 'herd_02')
  .slice(0, 10)
  .map((b, i) => ({
    id: `salelotbov_${String(i + 1).padStart(2, '0')}`,
    saleLotId: 'salelot_01',
    bovineId: b.id,
    ...audit,
  }))

const sales: Sale[] = []

// ─── Notificações (derivadas dos dados) ───────────────────────────────────────

const notifications: Notification[] = [
  { id: 'notif_01', propertyId: FARM_ID, type: 'cocho_critico', title: 'Cocho C-03 crítico', message: 'Restam 30 kg de 250 kg (12%). Esgotamento em ~6 dias.', severity: 'critico', referenceType: 'feedTrough', referenceId: 'trough_03', resolved: false, ...audit },
  { id: 'notif_02', propertyId: FARM_ID, type: 'pesagem_atrasada', title: 'Pesagem atrasada — Lote B', message: 'Último registro em 28/03/2026.', severity: 'atencao', referenceType: 'herd', referenceId: 'herd_02', resolved: false, ...audit },
  { id: 'notif_03', propertyId: FARM_ID, type: 'estoque_baixo', title: 'Estoque baixo — Ração 16% PB', message: '400 kg abaixo do mínimo de 500 kg.', severity: 'atencao', referenceType: 'feedStock', referenceId: 'feedstock_02', resolved: false, ...audit },
  { id: 'notif_04', propertyId: FARM_ID, type: 'estoque_baixo', title: 'Estoque baixo — Botuvacina', message: '40 doses abaixo do mínimo de 50.', severity: 'atencao', referenceType: 'medicationStock', referenceId: 'medstock_03', resolved: false, ...audit },
  { id: 'notif_05', propertyId: FARM_ID, type: 'evento_proximo', title: 'Vacinação botulismo em 15/06', message: 'Evento sanitário pendente para o Lote B.', severity: 'informativo', referenceType: 'sanitaryEvent', referenceId: 'sanit_01', resolved: false, ...audit },
]

const notificationUsers: NotificationUser[] = notifications.map((n, i) => ({
  id: `notifuser_${String(i + 1).padStart(2, '0')}`,
  notificationId: n.id,
  userId: OWNER_ID,
  read: false,
  dismissed: false,
  ...audit,
}))

// ─── Export ───────────────────────────────────────────────────────────────────

export const mockData: MockData = {
  user,
  users,
  userConfig,
  userProperties,
  invitations,
  farm,
  farms,
  divisions,
  forages,
  foragePlantings,
  feedTroughs,
  herds,
  bovines,
  bovinePhotos,
  seasons,
  weighings,
  medications,
  medicationStocks,
  medicationApplications,
  sanitaryEvents,
  feeds,
  feedStocks,
  allocations,
  memberships,
  seasonPassages,
  bovineTransfers,
  tasks,
  expenseCategories,
  expenses,
  saleLots,
  saleLotBovines,
  sales,
  notifications,
  notificationUsers,
  producer: user,
}
