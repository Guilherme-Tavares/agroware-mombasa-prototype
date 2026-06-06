// ──────────────────────────────────────────────────────────────────────────────
// Modelo de domínio — Agroware Mombasa
//
// Espelha a seção 8 do escopo consolidado e o modelo físico (mombasa_ddl.sql,
// 32 tabelas). Convenção: nomes de entidade e campo em inglês; valores de enum
// em português, idênticos ao DDL. Campos transversais de auditoria
// (createdAt, updatedAt, active) e FKs por propriedade são opcionais no
// protótipo para não quebrar construtores existentes; o mock os popula sempre.
//
// Nota de modelagem: para preservar o build durante a Fase 0, as entidades que
// já existiam mantêm seus nomes. Entidades novas do escopo são adicionadas.
// `Forage` segue sendo o catálogo de espécies (conveniência); a tabela
// `forragem` do DDL (plantio por divisão) é modelada como `ForagePlanting`.
// ──────────────────────────────────────────────────────────────────────────────

// ─── Geometria ──────────────────────────────────────────────────────────────

/** Coordenada relativa no viewBox ilustrado (offline). */
export interface Point {
  x: number
  y: number
}

/** Coordenada geográfica real (online), para o mapa Leaflet. */
export interface GeoPoint {
  lat: number
  lng: number
}

// ─── Enums padronizados (§8.1 do escopo) ──────────────────────────────────────

export type AccessLevel = 'produtor' | 'colaborador' | 'visitante'
export type InvitationStatus = 'pendente' | 'aceito' | 'recusado' | 'cancelado'
export type DivisionType = 'pasto' | 'reserva' | 'curral' | 'manga' | 'instalacao'
export type HerdPurpose = 'recria' | 'engorda' | 'misto'
export type SeasonType = 'aguas' | 'seca' | 'transicao'
export type MedicationType = 'antibiotico' | 'antiparasitario' | 'vitamina' | 'vacina' | 'outro'
export type FeedType = 'racao' | 'sal_mineral' | 'silagem' | 'farelo' | 'suplemento' | 'outro'
export type TroughMaterial = 'madeira' | 'concreto' | 'plastico' | 'metal'
export type BovineSex = 'M' | 'F'
export type BovineOrigin = 'comprado' | 'doacao' | 'transferido'
export type WeighingMethod = 'visual' | 'balanca' | 'nota_abate' | 'projecao'
export type SanitaryEventStatus = 'pendente' | 'executado' | 'cancelado'
export type TaskStatus = 'pendente' | 'concluida' | 'cancelada'
export type SaleLotStatus = 'disponivel' | 'vendido'
export type ExpenseGroup = 'insumo_alimenticio' | 'insumo_sanitario' | 'infraestrutura' | 'servico' | 'outro'
export type NotificationSeverity = 'informativo' | 'atencao' | 'critico'
export type MedicationStockUnit = 'ml' | 'l' | 'g' | 'kg' | 'doses' | 'frascos'
export type FeedStockUnit = 'kg' | 'sacos' | 'toneladas'
export type DoseUnit = 'ml' | 'g' | 'doses'
export type Theme = 'claro' | 'escuro'
export type WeightUnit = 'kg' | 'arroba'

/** Campos transversais de auditoria e reversibilidade (§7 do escopo). */
export interface AuditFields {
  active?: boolean
  createdAt?: string
  updatedAt?: string
}

// ─── Conta e acesso ───────────────────────────────────────────────────────────

/** usuario. Conta offline (email/senha nulos) ou online (ambos preenchidos). */
export interface User extends AuditFields {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  /** Derivado: conta com e-mail é considerada online. */
  online?: boolean
}

/** Alias histórico mantido para compatibilidade; usar `User` em código novo. */
export type Producer = User

/** configuracao_usuario. */
export interface UserConfig extends AuditFields {
  id: string
  userId: string
  defaultPropertyId?: string | null
  theme: Theme
  language: string
  weightUnit: WeightUnit
  alertsEnabled: boolean
}

/** usuario_propriedade. Vínculo N:N com nível de acesso. */
export interface UserProperty extends AuditFields {
  id: string
  userId: string
  propertyId: string
  accessLevel: AccessLevel
}

/** convite. */
export interface Invitation extends AuditFields {
  id: string
  propertyId: string
  inviterUserId: string
  invitedUserId: string
  invitedEmail?: string
  offeredLevel: AccessLevel
  status: InvitationStatus
}

// ─── Propriedade e pastagem ────────────────────────────────────────────────────

/** propriedade. Dono imutável; geometria relativa (offline) e geo (online). */
export interface Farm extends AuditFields {
  id: string
  /** fk_id_usuario_dono. */
  ownerId?: string
  name: string
  city: string
  state: string
  totalArea: number
  perimeter?: number
  /** Polígono relativo no viewBox ilustrado. */
  polygon: Point[]
  /** Polígono geográfico real, para o mapa Leaflet. */
  geoPolygon?: GeoPoint[]
  /** Centro geográfico para enquadrar o mapa base. */
  geoCenter?: GeoPoint
  /** Carimbo de captura do mapa base offline (cache de tiles). */
  mapBaseCapturedAt?: string | null
}

/** divisao. */
export interface Division extends AuditFields {
  id: string
  farmId: string
  name: string
  area: number
  type: DivisionType
  status: 'active' | 'inactive'
  forageId?: string
  forageStartDate?: string
  polygon: Point[]
  geoPolygon?: GeoPoint[]
}

/** Catálogo de espécies forrageiras (conveniência, fora do DDL). */
export interface Forage {
  id: string
  name: string
  scientificName: string
}

/** forragem (DDL): plantio de uma forragem em uma divisão. */
export interface ForagePlanting extends AuditFields {
  id: string
  divisionId: string
  /** Espécie plantada; referencia `Forage.id` quando disponível. */
  speciesId?: string
  type: string
  plantingDate?: string
}

/** cocho. Cadastro do cocho (estado de abastecimento vem dos refills). */
export interface FeedTrough extends AuditFields {
  id: string
  divisionId: string
  identifier: string
  capacity: number
  material: TroughMaterial
  position: Point
  geoPosition?: GeoPoint
  currentAmount: number
  currentFeedId?: string
  consumptionRate: number
  lastRefillDate: string
  refillHistory: Refill[]
}

// ─── Rebanho e animais ──────────────────────────────────────────────────────────

/** rebanho. */
export interface Herd extends AuditFields {
  id: string
  farmId: string
  name: string
  purpose: HerdPurpose
  formedAt: string
  notes?: string
  /** Posição visual no mapa ilustrado (viewBox). Ausente = centroide calculado. */
  position?: Point
}

/** bovino. peso_atual_kg e data_ultima_pesagem são cache da última pesagem. */
export interface Bovine extends AuditFields {
  id: string
  /** fk_id_propriedade (catálogo por propriedade). */
  propertyId?: string
  herdId?: string
  name: string
  earTag?: string
  sex: BovineSex
  breed: string
  birthDate: string
  currentWeight: number
  lastWeighDate: string
  origin: BovineOrigin
  /** Foto principal (cache base64). Fotos adicionais em `BovinePhoto`. */
  photoBase64?: string
}

/** foto_bovino. */
export interface BovinePhoto extends AuditFields {
  id: string
  bovineId: string
  base64?: string
  path?: string
  primary: boolean
}

/** temporada. */
export interface Season extends AuditFields {
  id: string
  propertyId?: string
  name: string
  type: SeasonType
  startDate: string
  endDate: string
}

/** pesagem. */
export interface Weighing extends AuditFields {
  id: string
  bovineId: string
  date: string
  weightKg: number
  method: WeighingMethod
  carcassWeightKg?: number
  yieldPercentage?: number
}

// ─── Sanidade ───────────────────────────────────────────────────────────────────

/** medicamento. */
export interface Medication extends AuditFields {
  id: string
  propertyId: string
  commercialName: string
  activeIngredient?: string
  type: MedicationType
}

/** estoque_medicamento. */
export interface MedicationStock extends AuditFields {
  id: string
  propertyId: string
  medicationId: string
  quantity: number
  unit: MedicationStockUnit
  entryDate: string
  minimumStock: number
}

/** aplicacao_medicamento. Debita o estoque de medicamento. */
export interface MedicationApplication extends AuditFields {
  id: string
  bovineId: string
  medicationId: string
  appliedAt: string
  dose: number
  doseUnit: DoseUnit
}

/** evento_sanitario. Calendário sanitário. */
export interface SanitaryEvent extends AuditFields {
  id: string
  propertyId: string
  medicationId?: string
  herdId?: string
  bovineId?: string
  applicationId?: string
  type: string
  scheduledDate: string
  status: SanitaryEventStatus
  executionDate?: string
  notes?: string
}

// ─── Alimentação ────────────────────────────────────────────────────────────────

/** alimento. */
export interface Feed extends AuditFields {
  id: string
  propertyId?: string
  name: string
  type?: FeedType
  proteinPercentage?: number
}

/** estoque_alimento. */
export interface FeedStock extends AuditFields {
  id: string
  propertyId: string
  feedId: string
  quantity: number
  unit: FeedStockUnit
  entryDate: string
  minimumStock: number
}

// ─── Operações ──────────────────────────────────────────────────────────────────

/** lotacao. Rebanho em divisão; base do cálculo de UA/ha. */
export interface Allocation extends AuditFields {
  id: string
  herdId: string
  divisionId: string
  startDate: string
  endDate?: string
  headCount?: number
}

/** pertencimento. Bovino em rebanho. */
export interface Membership extends AuditFields {
  id: string
  bovineId: string
  herdId: string
  startDate: string
  endDate?: string
  entryWeightKg?: number
}

/** passagem_temporada. Fonte primária do GMD (nível de lote). */
export interface SeasonPassage extends AuditFields {
  id: string
  herdId: string
  seasonId: string
  initialWeight: number
  finalWeight: number
  days: number
  gmd: number
}

/** abastecimento_cocho. Debita o estoque de alimento. */
export interface Refill {
  date: string
  amount: number
  feedId: string
  /** taxa_consumo_kg_dia, alimenta o Sistema HP. */
  consumptionRate?: number
  remainingKg?: number
  depleted?: boolean
}

/** transferencia_bovino. Exclusiva do produtor. */
export interface BovineTransfer extends AuditFields {
  id: string
  bovineId: string
  originPropertyId: string
  destinationPropertyId: string
  userId: string
  date: string
  reason?: string
}

// ─── Agenda ─────────────────────────────────────────────────────────────────────

/** tarefa. */
export interface Task extends AuditFields {
  id: string
  propertyId: string
  divisionId?: string
  herdId?: string
  title: string
  description?: string
  dueDate?: string
  status: TaskStatus
}

// ─── Financeiro ───────────────────────────────────────────────────────────────

/** categoria_despesa. */
export interface ExpenseCategory extends AuditFields {
  id: string
  propertyId: string
  name: string
  group: ExpenseGroup
}

/** despesa. */
export interface Expense extends AuditFields {
  id: string
  propertyId: string
  categoryId: string
  divisionId?: string
  herdId?: string
  description: string
  amount: number
  date: string
}

/** lote (comercial). */
export interface SaleLot extends AuditFields {
  id: string
  propertyId: string
  identifier: string
  status: SaleLotStatus
  averageWeightKg?: number
  totalArrobas?: number
}

/** lote_bovino. N:N entre lote comercial e bovino. */
export interface SaleLotBovine extends AuditFields {
  id: string
  saleLotId: string
  bovineId: string
}

/** venda. Ao confirmar, inativa os bovinos e encerra pertencimentos. */
export interface Sale extends AuditFields {
  id: string
  propertyId: string
  saleLotId: string
  buyer?: string
  date: string
  totalWeightKg?: number
  pricePerArroba?: number
  totalValue?: number
  margin?: number
}

// ─── Notificações ───────────────────────────────────────────────────────────────

/** notificacao. Derivada dos dados, sem duplicar enquanto a condição persiste. */
export interface Notification extends AuditFields {
  id: string
  propertyId: string
  type: string
  title: string
  message: string
  severity: NotificationSeverity
  referenceType?: string
  referenceId?: string
  resolved: boolean
  resolutionDate?: string | null
}

/** notificacao_usuario. Estado de leitura por usuário. */
export interface NotificationUser extends AuditFields {
  id: string
  notificationId: string
  userId: string
  read: boolean
  readDate?: string | null
  dismissed: boolean
}
