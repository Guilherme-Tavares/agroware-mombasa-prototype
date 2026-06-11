import type {
  Point,
  GeoPoint,
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

const GEO_CENTER = { lat: -10.782216145347679, lng: -61.7676694148614 }

const farm: Farm = {
  id: FARM_ID,
  ownerId: OWNER_ID,
  name: 'Sítio Santa Fé',
  city: 'Ji-Paraná',
  state: 'RO',
  totalArea: 97.2,
  perimeter: 4853,
  // Contorno quase-retangular com um canto inferior-esquerdo levemente recuado
  // (76,640) para manter aparência de demarcação manual. As bordas superior,
  // direita e inferior são retas para que os piquetes (que tangenciam essas
  // bordas) fiquem estritamente contidos na fazenda — sem isso, a validação de
  // edição rejeita a divisão por cruzamento de aresta. O geoPolygon é a projeção
  // afim exata deste polígono (relativeToGeo), garantindo que contenção no
  // viewbox implique contenção em lat/lng.
  polygon: [
    { x: 76,  y: 640 },
    { x: 940, y: 640 },
    { x: 940, y: 60  },
    { x: 60,  y: 60  },
  ],
  geoCenter: GEO_CENTER,
  geoPolygon: [
    { lat: -10.792587470179175, lng: -61.770408505031995 },
    { lat: -10.792587470179175, lng: -61.76579783178139  },
    { lat: -10.775310791557718, lng: -61.76579783178139  },
    { lat: -10.775310791557718, lng: -61.77049388786997  },
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
    { x: 120, y: 90  },
    { x: 880, y: 90  },
    { x: 880, y: 610 },
    { x: 120, y: 610 },
  ],
  geoCenter: { lat: -11.1750, lng: -61.9010 },
  mapBaseCapturedAt: null,
  ...audit,
}

const farms: Farm[] = [farm, farm2]

// ─── Projeção relativa → geográfica ────────────────────────────────────────
// As geometrias de divisões e cochos são autoradas em coordenadas relativas
// (viewBox ilustrado). Para o mapa real (Leaflet), derivamos lat/lng mapeando
// linearmente o bounding box relativo da fazenda no bounding box geográfico
// dela. Assim o mock carrega coordenadas reais coerentes, sem autoria manual
// ponto a ponto. Eixo Y do viewBox cresce para baixo; latitude cresce para o
// norte, por isso a inversão no cálculo de `lat`.

function bboxOf<T>(items: T[], gx: (t: T) => number, gy: (t: T) => number) {
  const xs = items.map(gx)
  const ys = items.map(gy)
  return {
    xMin: Math.min(...xs), xMax: Math.max(...xs),
    yMin: Math.min(...ys), yMax: Math.max(...ys),
  }
}

const REL_BBOX = bboxOf(farm.polygon, (p) => p.x, (p) => p.y)
const GEO_BBOX = (() => {
  const geo = farm.geoPolygon ?? []
  return {
    lngMin: Math.min(...geo.map((g) => g.lng)),
    lngMax: Math.max(...geo.map((g) => g.lng)),
    latMin: Math.min(...geo.map((g) => g.lat)),
    latMax: Math.max(...geo.map((g) => g.lat)),
  }
})()

function relativeToGeo(p: Point): GeoPoint {
  const fx = (p.x - REL_BBOX.xMin) / (REL_BBOX.xMax - REL_BBOX.xMin)
  const fy = (p.y - REL_BBOX.yMin) / (REL_BBOX.yMax - REL_BBOX.yMin)
  return {
    lng: GEO_BBOX.lngMin + fx * (GEO_BBOX.lngMax - GEO_BBOX.lngMin),
    lat: GEO_BBOX.latMax - fy * (GEO_BBOX.latMax - GEO_BBOX.latMin),
  }
}

// ─── Forragens (catálogo de espécies) ────────────────────────────────────────

const forages: Forage[] = [
  { id: 'forage_01', name: 'Capim Mombaça', scientificName: 'Megathyrsus maximus cv. Mombaça' },
  { id: 'forage_02', name: 'Brachiaria', scientificName: 'Urochloa brizantha cv. Marandu' },
]

// ─── Divisões (Piquetes) ──────────────────────────────────────────────────────

const divisions: Division[] = [
  // Sítio Santa Fé: 5 piquetes cobrindo (70,60)–(935,638).
  // Layout: 2 piquetes na linha norte (y 60-350) + 3 na linha sul (y 350-638).
  {
    id: 'div_sf_01', farmId: FARM_ID, name: 'Piquete 1', area: 24.1, type: 'pasto',
    status: 'active', forageId: 'forage_01', forageStartDate: '2025-10-01',
    polygon: [
      { x: 70,  y: 60  }, { x: 500, y: 60  },
      { x: 500, y: 350 }, { x: 70,  y: 350 },
    ],
    ...audit,
  },
  {
    id: 'div_sf_02', farmId: FARM_ID, name: 'Piquete 2', area: 24.4, type: 'pasto',
    status: 'active', forageId: 'forage_01', forageStartDate: '2025-10-01',
    polygon: [
      { x: 500, y: 60  }, { x: 935, y: 60  },
      { x: 935, y: 350 }, { x: 500, y: 350 },
    ],
    ...audit,
  },
  {
    id: 'div_sf_03', farmId: FARM_ID, name: 'Piquete 3', area: 17.8, type: 'pasto',
    status: 'active', forageId: 'forage_02', forageStartDate: '2025-06-01',
    polygon: [
      { x: 78,  y: 350 }, { x: 390, y: 350 },
      { x: 390, y: 638 }, { x: 78,  y: 638 },
    ],
    ...audit,
  },
  {
    id: 'div_sf_04', farmId: FARM_ID, name: 'Piquete 4', area: 15.0, type: 'pasto',
    status: 'active', forageId: 'forage_01', forageStartDate: '2026-01-15',
    polygon: [
      { x: 390, y: 350 }, { x: 660, y: 350 },
      { x: 660, y: 638 }, { x: 390, y: 638 },
    ],
    ...audit,
  },
  {
    id: 'div_sf_05', farmId: FARM_ID, name: 'Piquete 5', area: 15.3, type: 'pasto',
    status: 'active', forageId: 'forage_01', forageStartDate: '2026-01-15',
    polygon: [
      { x: 660, y: 350 }, { x: 935, y: 350 },
      { x: 930, y: 638 }, { x: 660, y: 638 },
    ],
    ...audit,
  },
  // Serra Azul: grade L + 2 direita preenchendo (120,90)–(880,610).
  {
    id: 'div_sa_01', farmId: FARM_2_ID, name: 'Pasto Norte', area: 12.0, type: 'pasto',
    status: 'active', forageId: 'forage_02', forageStartDate: '2025-06-01',
    polygon: [
      { x: 120, y: 90  }, { x: 500, y: 90  },
      { x: 500, y: 610 }, { x: 120, y: 610 },
    ],
    ...audit,
  },
  {
    id: 'div_sa_02', farmId: FARM_2_ID, name: 'Pasto Leste Superior', area: 8.0, type: 'pasto',
    status: 'active', forageId: 'forage_01', forageStartDate: '2025-07-15',
    polygon: [
      { x: 500, y: 90  }, { x: 880, y: 90  },
      { x: 880, y: 350 }, { x: 500, y: 350 },
    ],
    ...audit,
  },
  {
    id: 'div_sa_03', farmId: FARM_2_ID, name: 'Pasto Leste Inferior', area: 8.0, type: 'pasto',
    status: 'active', forageId: 'forage_01', forageStartDate: '2025-07-15',
    polygon: [
      { x: 500, y: 350 }, { x: 880, y: 350 },
      { x: 880, y: 610 }, { x: 500, y: 610 },
    ],
    ...audit,
  },
]

// Deriva o polígono geográfico apenas das divisões do Sítio Santa Fé —
// a projeção relativeToGeo usa o bbox geográfico dessa propriedade.
divisions.filter((d) => d.farmId === FARM_ID).forEach((d) => {
  d.geoPolygon = d.polygon.map(relativeToGeo)
})

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
// Um cocho de sal mineral por piquete, posicionado no centro visual de cada um.

const feedTroughs: FeedTrough[] = [
  {
    id: 'trough_sf_01', divisionId: 'div_sf_01',
    identifier: 'Cocho P1',
    capacity: 200, material: 'concreto',
    position: { x: 355, y: 250 },
    currentAmount: 120, currentFeedId: 'feed_03',
    consumptionRate: 5, lastRefillDate: '2026-06-01',
    refillHistory: [],
    ...audit,
  },
  {
    id: 'trough_sf_02', divisionId: 'div_sf_02',
    identifier: 'Cocho P2',
    capacity: 200, material: 'concreto',
    position: { x: 645, y: 250 },
    currentAmount: 80, currentFeedId: 'feed_03',
    consumptionRate: 4, lastRefillDate: '2026-06-01',
    refillHistory: [],
    ...audit,
  },
  {
    id: 'trough_sf_03', divisionId: 'div_sf_03',
    identifier: 'Cocho P3',
    capacity: 150, material: 'metal',
    position: { x: 230, y: 530 },
    currentAmount: 60, currentFeedId: 'feed_03',
    consumptionRate: 3, lastRefillDate: '2026-05-28',
    refillHistory: [],
    ...audit,
  },
  {
    id: 'trough_sf_04', divisionId: 'div_sf_04',
    identifier: 'Cocho P4',
    capacity: 200, material: 'concreto',
    position: { x: 525, y: 545 },
    currentAmount: 140, currentFeedId: 'feed_03',
    consumptionRate: 4, lastRefillDate: '2026-06-03',
    refillHistory: [],
    ...audit,
  },
  {
    id: 'trough_sf_05', divisionId: 'div_sf_05',
    identifier: 'Cocho P5',
    capacity: 100, material: 'madeira',
    position: { x: 797, y: 530 },
    currentAmount: 45, currentFeedId: 'feed_03',
    consumptionRate: 2, lastRefillDate: '2026-05-30',
    refillHistory: [],
    ...audit,
  },
]

feedTroughs.forEach((t) => {
  const div = divisions.find((d) => d.id === t.divisionId)
  if (div?.farmId === FARM_ID) t.geoPosition = relativeToGeo(t.position)
})

// ─── Lotação ────────────────────────────────────────────────────────────────
// Lote B (engorda, 40 cab) → P1 | Lote A (recria, 25 cab) → P2 | Lote C (recria, 20 cab) → P4.
// P3 e P5 em descanso/rotação.

const allocations: Allocation[] = [
  { id: 'alloc_01', herdId: 'herd_02', divisionId: 'div_sf_01', startDate: '2026-05-01', headCount: 40, ...audit },
  { id: 'alloc_02', herdId: 'herd_01', divisionId: 'div_sf_02', startDate: '2026-04-20', headCount: 25, ...audit },
  { id: 'alloc_03', herdId: 'herd_03', divisionId: 'div_sf_04', startDate: '2026-05-15', headCount: 20, ...audit },
]

// ─── Transferência de bovino ──────────────────────────────────────────────────

const bovineTransfers: BovineTransfer[] = [
  { id: 'transf_01', bovineId: 'bovine_085', originPropertyId: FARM_2_ID, destinationPropertyId: FARM_ID, userId: OWNER_ID, date: '2026-01-20', reason: 'Realocação para recria', ...audit },
]

// ─── Agenda de tarefas ────────────────────────────────────────────────────────

const tasks: Task[] = [
  { id: 'task_01', propertyId: FARM_ID, title: 'Reparar cerca da propriedade', description: 'Mourão caído na divisa leste.', dueDate: '2026-06-10', status: 'pendente', ...audit },
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
  { id: 'exp_03', propertyId: FARM_ID, categoryId: 'cat_03', description: 'Reforma de cerca', amount: 1800, date: '2026-02-10', ...audit },
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
