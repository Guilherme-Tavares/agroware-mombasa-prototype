import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  User,
  UserConfig,
  UserProperty,
  Invitation,
  AccessLevel,
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
  Refill,
} from '@/types/domain'
import type { MockData } from '@/data/mockFarm'

// ── Helpers de débito de estoque (Slice 2) ──
// Estoque é único por (propriedade, insumo). O débito subtrai do saldo, sem
// negativar. Para medicamento, só debita quando a unidade do estoque coincide
// com a unidade da dose (evita subtrair grandezas incompatíveis). Para alimento,
// o abastecimento é em kg, então só debita estoques em kg.

function debitMedicationStock(
  stocks: MedicationStock[], medicationId: string, propertyId: string, amount: number, unit: string,
): MedicationStock[] {
  return stocks.map((s) =>
    s.medicationId === medicationId && s.propertyId === propertyId && s.unit === unit
      ? { ...s, quantity: Math.max(0, s.quantity - amount) }
      : s,
  )
}

function debitFeedStock(
  stocks: FeedStock[], feedId: string, propertyId: string, amountKg: number,
): FeedStock[] {
  return stocks.map((s) =>
    s.feedId === feedId && s.propertyId === propertyId && s.unit === 'kg'
      ? { ...s, quantity: Math.max(0, s.quantity - amountKg) }
      : s,
  )
}

interface FarmState {
  // Conta e acesso
  user: User | null
  /** Usuário que está operando a sessão (base do modelo de níveis de acesso). */
  currentUserId: string | null
  users: User[]
  userConfig: UserConfig | null
  userProperties: UserProperty[]
  invitations: Invitation[]

  // Propriedade ativa e catálogo de propriedades
  farm: Farm | null
  farms: Farm[]
  activePropertyId: string | null

  // Pastagem
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

  // ── Ações ──
  seedFromMock: (data: MockData) => void
  setActiveProperty: (propertyId: string) => void
  setCurrentUser: (userId: string) => void
  updateCurrentUser: (updates: Partial<User>) => void
  updateUserConfig: (updates: Partial<UserConfig>) => void
  // Multiusuário (RF08–RF11)
  inviteUser: (invitation: Invitation) => void
  cancelInvitation: (invitationId: string) => void
  respondInvitation: (invitationId: string, accept: boolean) => void
  updateAccessLevel: (userPropertyId: string, level: AccessLevel) => void
  removeUserAccess: (userPropertyId: string) => void
  transferOwnership: (propertyId: string, newOwnerId: string) => void
  updateFarm: (updates: Partial<Farm>) => void
  addBovine: (bovine: Bovine) => void
  updateBovine: (id: string, updates: Partial<Bovine>) => void
  allocateHerd: (allocation: Allocation) => void
  deallocateHerd: (herdId: string) => void
  refillFeedTrough: (troughId: string, refill: Refill, newAmount: number) => void
  updateDivision: (id: string, updates: Partial<Division>) => void
  updateHerd: (id: string, updates: Partial<Herd>) => void
  addProperty: (farm: Farm) => void
  updateProperty: (id: string, updates: Partial<Farm>) => void
  addHerd: (herd: Herd) => void
  addDivision: (division: Division) => void
  addForagePlanting: (planting: ForagePlanting) => void
  addSeason: (season: Season) => void
  updateSeason: (id: string, updates: Partial<Season>) => void
  // Cadastros — catálogos e agenda (RF18–RF23)
  addFeedTrough: (trough: FeedTrough) => void
  updateFeedTrough: (id: string, updates: Partial<FeedTrough>) => void
  addMedication: (medication: Medication) => void
  updateMedication: (id: string, updates: Partial<Medication>) => void
  addFeed: (feed: Feed) => void
  updateFeed: (id: string, updates: Partial<Feed>) => void
  addExpenseCategory: (category: ExpenseCategory) => void
  updateExpenseCategory: (id: string, updates: Partial<ExpenseCategory>) => void
  updateForagePlanting: (id: string, updates: Partial<ForagePlanting>) => void
  addSanitaryEvent: (event: SanitaryEvent) => void
  updateSanitaryEvent: (id: string, updates: Partial<SanitaryEvent>) => void
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  // Operações (RF24–RF33) — Slice 1: estoques, pesagem, GMD
  addMedicationStock: (entry: MedicationStock) => void
  addFeedStock: (entry: FeedStock) => void
  addWeighing: (weighing: Weighing) => void
  addSeasonPassage: (passage: SeasonPassage) => void
  // Operações — Slice 2: consumo e débito de estoque
  applyMedication: (application: MedicationApplication) => void
  executeSanitaryEvent: (eventId: string, application?: MedicationApplication) => void
  // Operações — Slice 3: movimentação de animais
  setBovineMembership: (bovineId: string, herdId: string | null, opts: { startDate: string; entryWeightKg?: number }) => void
  transferBovine: (transfer: BovineTransfer) => void
  // Financeiro (RF39–RF41)
  addExpense: (expense: Expense) => void
  updateExpense: (id: string, updates: Partial<Expense>) => void
  addSaleLot: (lot: SaleLot, bovineIds: string[]) => void
  updateSaleLot: (id: string, updates: Partial<SaleLot>) => void
  registerSale: (sale: Sale) => void
}

const emptyState = {
  user: null,
  currentUserId: null,
  users: [],
  userConfig: null,
  userProperties: [],
  invitations: [],
  farm: null,
  farms: [],
  activePropertyId: null,
  divisions: [],
  forages: [],
  foragePlantings: [],
  feedTroughs: [],
  herds: [],
  bovines: [],
  bovinePhotos: [],
  seasons: [],
  weighings: [],
  medications: [],
  medicationStocks: [],
  medicationApplications: [],
  sanitaryEvents: [],
  feeds: [],
  feedStocks: [],
  allocations: [],
  memberships: [],
  seasonPassages: [],
  bovineTransfers: [],
  tasks: [],
  expenseCategories: [],
  expenses: [],
  saleLots: [],
  saleLotBovines: [],
  sales: [],
  notifications: [],
  notificationUsers: [],
}

export const useFarmStore = create<FarmState>()(
  persist(
    (set) => ({
      ...emptyState,

      // Carrega o dataset mock completo. A propriedade ativa padrão é a
      // `data.farm` (Sítio Santa Fé); `data.farms` é o catálogo selecionável.
      seedFromMock: (data) =>
        set({
          user: data.user,
          currentUserId: data.user.id,
          users: data.users,
          userConfig: data.userConfig,
          userProperties: data.userProperties,
          invitations: data.invitations,
          farm: data.farm,
          farms: data.farms,
          activePropertyId: data.farm.id,
          divisions: data.divisions,
          forages: data.forages,
          foragePlantings: data.foragePlantings,
          feedTroughs: data.feedTroughs,
          herds: data.herds,
          bovines: data.bovines,
          bovinePhotos: data.bovinePhotos,
          seasons: data.seasons,
          weighings: data.weighings,
          medications: data.medications,
          medicationStocks: data.medicationStocks,
          medicationApplications: data.medicationApplications,
          sanitaryEvents: data.sanitaryEvents,
          feeds: data.feeds,
          feedStocks: data.feedStocks,
          allocations: data.allocations,
          memberships: data.memberships,
          seasonPassages: data.seasonPassages,
          bovineTransfers: data.bovineTransfers,
          tasks: data.tasks,
          expenseCategories: data.expenseCategories,
          expenses: data.expenses,
          saleLots: data.saleLots,
          saleLotBovines: data.saleLotBovines,
          sales: data.sales,
          notifications: data.notifications,
          notificationUsers: data.notificationUsers,
        }),

      // Troca a propriedade ativa (RF06). Mantém `farm` em sincronia com a
      // seleção para que os consumidores existentes de `farm` sigam válidos.
      setActiveProperty: (propertyId) =>
        set((state) => {
          const next = state.farms.find((f) => f.id === propertyId)
          return next ? { activePropertyId: propertyId, farm: next } : state
        }),

      setCurrentUser: (userId) =>
        set((state) => {
          const u = state.users.find((x) => x.id === userId)
          return u ? { currentUserId: userId, user: u } : state
        }),

      updateCurrentUser: (updates) =>
        set((state) => {
          if (!state.user) return state
          const updated = { ...state.user, ...updates }
          return {
            user: updated,
            users: state.users.map((u) => (u.id === updated.id ? updated : u)),
          }
        }),

      // ── Multiusuário (RF08–RF11) ──

      inviteUser: (invitation) =>
        set((state) => ({ invitations: [...state.invitations, invitation] })),

      cancelInvitation: (invitationId) =>
        set((state) => ({
          invitations: state.invitations.map((inv) =>
            inv.id === invitationId ? { ...inv, status: 'cancelado' } : inv,
          ),
        })),

      respondInvitation: (invitationId, accept) =>
        set((state) => {
          const inv = state.invitations.find((i) => i.id === invitationId)
          if (!inv) return state

          const invitations = state.invitations.map((i) =>
            i.id === invitationId ? { ...i, status: accept ? ('aceito' as const) : ('recusado' as const) } : i,
          )
          if (!accept) return { invitations }

          // Aceite: cria ou reativa o vínculo de acesso com o nível oferecido.
          const existing = state.userProperties.find(
            (up) => up.userId === inv.invitedUserId && up.propertyId === inv.propertyId,
          )
          const userProperties = existing
            ? state.userProperties.map((up) =>
                up.id === existing.id ? { ...up, active: true, accessLevel: inv.offeredLevel } : up,
              )
            : [
                ...state.userProperties,
                {
                  id: crypto.randomUUID(),
                  userId: inv.invitedUserId,
                  propertyId: inv.propertyId,
                  accessLevel: inv.offeredLevel,
                  active: true,
                },
              ]
          return { invitations, userProperties }
        }),

      updateAccessLevel: (userPropertyId, level) =>
        set((state) => ({
          userProperties: state.userProperties.map((up) =>
            up.id === userPropertyId ? { ...up, accessLevel: level } : up,
          ),
        })),

      removeUserAccess: (userPropertyId) =>
        set((state) => {
          const up = state.userProperties.find((x) => x.id === userPropertyId)
          // O dono nunca pode ser removido (posse imutável).
          if (!up) return state
          const farm = state.farms.find((f) => f.id === up.propertyId)
          if (farm?.ownerId === up.userId) return state
          return {
            userProperties: state.userProperties.map((x) =>
              x.id === userPropertyId ? { ...x, active: false } : x,
            ),
          }
        }),

      transferOwnership: (propertyId, newOwnerId) =>
        set((state) => {
          // Apenas troca o dono; garante que o novo dono seja produtor.
          const farms = state.farms.map((f) =>
            f.id === propertyId ? { ...f, ownerId: newOwnerId } : f,
          )
          const hasLink = state.userProperties.some(
            (up) => up.userId === newOwnerId && up.propertyId === propertyId,
          )
          const userProperties = hasLink
            ? state.userProperties.map((up) =>
                up.userId === newOwnerId && up.propertyId === propertyId
                  ? { ...up, accessLevel: 'produtor' as const, active: true }
                  : up,
              )
            : [
                ...state.userProperties,
                {
                  id: crypto.randomUUID(),
                  userId: newOwnerId,
                  propertyId,
                  accessLevel: 'produtor' as const,
                  active: true,
                },
              ]
          const farm = state.farm?.id === propertyId
            ? farms.find((f) => f.id === propertyId) ?? state.farm
            : state.farm
          return { farms, userProperties, farm }
        }),

      updateUserConfig: (updates) =>
        set((state) => ({
          userConfig: state.userConfig ? { ...state.userConfig, ...updates } : state.userConfig,
        })),

      updateFarm: (updates) =>
        set((state) => {
          if (!state.farm) return state
          const updated = { ...state.farm, ...updates }
          return {
            farm: updated,
            farms: state.farms.map((f) => (f.id === updated.id ? updated : f)),
          }
        }),

      addBovine: (bovine) =>
        set((state) => ({ bovines: [...state.bovines, bovine] })),

      updateBovine: (id, updates) =>
        set((state) => ({
          bovines: state.bovines.map((b) =>
            b.id === id ? { ...b, ...updates } : b,
          ),
        })),

      allocateHerd: (allocation) =>
        set((state) => ({
          allocations: [
            ...state.allocations.map((a) =>
              a.herdId === allocation.herdId ? { ...a, active: false, endDate: allocation.startDate } : a,
            ),
            allocation,
          ],
        })),

      deallocateHerd: (herdId) =>
        set((state) => ({
          allocations: state.allocations.map((a) =>
            a.herdId === herdId && a.active
              ? { ...a, active: false, endDate: new Date().toISOString().split('T')[0] }
              : a,
          ),
        })),

      // Abastecimento (RF30): atualiza o cocho (alimentando o Sistema HP via
      // currentAmount/consumptionRate) e debita do estoque de alimento o delta
      // efetivamente adicionado (novo total − saldo anterior). `refill.amount`
      // permanece o total do abastecimento, usado pelo gráfico de evolução HP.
      refillFeedTrough: (troughId, refill, newAmount) =>
        set((state) => {
          const trough = state.feedTroughs.find((t) => t.id === troughId)
          const previous = trough?.currentAmount ?? 0
          const delta = Math.max(0, newAmount - previous)
          return {
            feedTroughs: state.feedTroughs.map((t) =>
              t.id === troughId
                ? {
                    ...t,
                    currentAmount: newAmount,
                    lastRefillDate: refill.date,
                    currentFeedId: refill.feedId,
                    consumptionRate: refill.consumptionRate ?? t.consumptionRate,
                    refillHistory: [refill, ...t.refillHistory].slice(0, 10),
                  }
                : t,
            ),
            feedStocks: state.activePropertyId && delta > 0
              ? debitFeedStock(state.feedStocks, refill.feedId, state.activePropertyId, delta)
              : state.feedStocks,
          }
        }),

      // Aplicação de medicamento (RF29): registra e debita o estoque.
      applyMedication: (application) =>
        set((state) => {
          const med = state.medications.find((m) => m.id === application.medicationId)
          return {
            medicationApplications: [...state.medicationApplications, application],
            medicationStocks: med?.propertyId
              ? debitMedicationStock(state.medicationStocks, application.medicationId, med.propertyId, application.dose, application.doseUnit)
              : state.medicationStocks,
          }
        }),

      // Execução de evento sanitário (RF32): marca executado e, quando há
      // medicamento e bovino alvo, gera a aplicação (debitando o estoque).
      executeSanitaryEvent: (eventId, application) =>
        set((state) => {
          const today = new Date().toISOString().split('T')[0]
          let medicationApplications = state.medicationApplications
          let medicationStocks = state.medicationStocks
          if (application) {
            medicationApplications = [...medicationApplications, application]
            const med = state.medications.find((m) => m.id === application.medicationId)
            if (med?.propertyId) {
              medicationStocks = debitMedicationStock(medicationStocks, application.medicationId, med.propertyId, application.dose, application.doseUnit)
            }
          }
          return {
            medicationApplications,
            medicationStocks,
            sanitaryEvents: state.sanitaryEvents.map((e) =>
              e.id === eventId
                ? { ...e, status: 'executado' as const, executionDate: today, applicationId: application?.id ?? e.applicationId }
                : e,
            ),
          }
        }),

      updateDivision: (id, updates) =>
        set((state) => ({
          divisions: state.divisions.map((d) =>
            d.id === id ? { ...d, ...updates } : d,
          ),
        })),

      // Criar uma propriedade dá ao criador o vínculo de dono e nível produtor
      // (escopo §6.1); a nova propriedade passa a ser a ativa.
      addProperty: (farm) =>
        set((state) => {
          const userProperties = state.currentUserId
            ? [
                ...state.userProperties,
                {
                  id: crypto.randomUUID(),
                  userId: state.currentUserId,
                  propertyId: farm.id,
                  accessLevel: 'produtor' as const,
                  active: true,
                },
              ]
            : state.userProperties
          return {
            farms: [...state.farms, farm],
            userProperties,
            farm,
            activePropertyId: farm.id,
          }
        }),

      updateHerd: (id, updates) =>
        set((state) => ({
          herds: state.herds.map((h) => (h.id === id ? { ...h, ...updates } : h)),
        })),

      updateProperty: (id, updates) =>
        set((state) => ({
          farms: state.farms.map((f) => (f.id === id ? { ...f, ...updates } : f)),
          farm: state.farm?.id === id ? { ...state.farm, ...updates } : state.farm,
        })),

      addHerd: (herd) =>
        set((state) => ({ herds: [...state.herds, herd] })),

      addDivision: (division) =>
        set((state) => ({ divisions: [...state.divisions, division] })),

      // Uma forragem ativa por divisão: desativa as anteriores e atualiza os
      // campos de conveniência da divisão (usados pelo mapa ilustrado).
      addForagePlanting: (planting) =>
        set((state) => ({
          foragePlantings: [
            ...state.foragePlantings.map((p) =>
              p.divisionId === planting.divisionId && p.active !== false
                ? { ...p, active: false }
                : p,
            ),
            planting,
          ],
          divisions: state.divisions.map((d) =>
            d.id === planting.divisionId
              ? { ...d, forageId: planting.speciesId ?? d.forageId, forageStartDate: planting.plantingDate ?? d.forageStartDate }
              : d,
          ),
        })),

      addSeason: (season) =>
        set((state) => ({ seasons: [...state.seasons, season] })),

      updateSeason: (id, updates) =>
        set((state) => ({
          seasons: state.seasons.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),

      addFeedTrough: (trough) =>
        set((state) => ({ feedTroughs: [...state.feedTroughs, trough] })),

      updateFeedTrough: (id, updates) =>
        set((state) => ({
          feedTroughs: state.feedTroughs.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      addMedication: (medication) =>
        set((state) => ({ medications: [...state.medications, medication] })),

      updateMedication: (id, updates) =>
        set((state) => ({
          medications: state.medications.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),

      addFeed: (feed) =>
        set((state) => ({ feeds: [...state.feeds, feed] })),

      updateFeed: (id, updates) =>
        set((state) => ({
          feeds: state.feeds.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        })),

      addExpenseCategory: (category) =>
        set((state) => ({ expenseCategories: [...state.expenseCategories, category] })),

      updateExpenseCategory: (id, updates) =>
        set((state) => ({
          expenseCategories: state.expenseCategories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      updateForagePlanting: (id, updates) =>
        set((state) => ({
          foragePlantings: state.foragePlantings.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      addSanitaryEvent: (event) =>
        set((state) => ({ sanitaryEvents: [...state.sanitaryEvents, event] })),

      updateSanitaryEvent: (id, updates) =>
        set((state) => ({
          sanitaryEvents: state.sanitaryEvents.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        })),

      addTask: (task) =>
        set((state) => ({ tasks: [...state.tasks, task] })),

      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      // ── Operações (Slice 1) ──

      // Estoque é único por (propriedade, medicamento): entrada soma à quantidade.
      addMedicationStock: (entry) =>
        set((state) => {
          const existing = state.medicationStocks.find(
            (s) => s.propertyId === entry.propertyId && s.medicationId === entry.medicationId,
          )
          if (existing) {
            return {
              medicationStocks: state.medicationStocks.map((s) =>
                s.id === existing.id
                  ? { ...s, quantity: s.quantity + entry.quantity, unit: entry.unit, minimumStock: entry.minimumStock, entryDate: entry.entryDate, updatedAt: entry.updatedAt }
                  : s,
              ),
            }
          }
          return { medicationStocks: [...state.medicationStocks, entry] }
        }),

      // Estoque é único por (propriedade, alimento): entrada soma à quantidade.
      addFeedStock: (entry) =>
        set((state) => {
          const existing = state.feedStocks.find(
            (s) => s.propertyId === entry.propertyId && s.feedId === entry.feedId,
          )
          if (existing) {
            return {
              feedStocks: state.feedStocks.map((s) =>
                s.id === existing.id
                  ? { ...s, quantity: s.quantity + entry.quantity, unit: entry.unit, minimumStock: entry.minimumStock, entryDate: entry.entryDate, updatedAt: entry.updatedAt }
                  : s,
              ),
            }
          }
          return { feedStocks: [...state.feedStocks, entry] }
        }),

      // Pesagem: registra o histórico e atualiza o cache de peso do bovino
      // quando a pesagem é a mais recente (escopo §8.13).
      addWeighing: (weighing) =>
        set((state) => ({
          weighings: [...state.weighings, weighing],
          bovines: state.bovines.map((b) =>
            b.id === weighing.bovineId && (!b.lastWeighDate || weighing.date >= b.lastWeighDate)
              ? { ...b, currentWeight: weighing.weightKg, lastWeighDate: weighing.date, updatedAt: weighing.createdAt ?? b.updatedAt }
              : b,
          ),
        })),

      // Passagem por temporada: fonte primária do GMD (nível de lote).
      addSeasonPassage: (passage) =>
        set((state) => ({ seasonPassages: [...state.seasonPassages, passage] })),

      // ── Operações (Slice 3) ──

      // Pertencimento (RF27): encerra o vínculo ativo do bovino e abre um novo
      // no rebanho destino (ou apenas o retira, quando herdId é null).
      // Mantém `bovino.herdId` como cache do rebanho atual.
      setBovineMembership: (bovineId, herdId, opts) =>
        set((state) => {
          const now = new Date().toISOString()
          const closed = state.memberships.map((m) =>
            m.bovineId === bovineId && !m.endDate && m.active !== false
              ? { ...m, endDate: opts.startDate, updatedAt: now }
              : m,
          )
          const memberships = herdId
            ? [
                ...closed,
                {
                  id: crypto.randomUUID(),
                  bovineId,
                  herdId,
                  startDate: opts.startDate,
                  entryWeightKg: opts.entryWeightKg,
                  active: true,
                  createdAt: now,
                  updatedAt: now,
                },
              ]
            : closed
          return {
            memberships,
            bovines: state.bovines.map((b) =>
              b.id === bovineId ? { ...b, herdId: herdId ?? undefined, updatedAt: now } : b,
            ),
          }
        }),

      // Transferência de bovino entre propriedades (RF33): registra o histórico,
      // muda a propriedade do bovino e encerra o pertencimento ativo na origem.
      transferBovine: (transfer) =>
        set((state) => {
          const now = new Date().toISOString()
          return {
            bovineTransfers: [...state.bovineTransfers, transfer],
            bovines: state.bovines.map((b) =>
              b.id === transfer.bovineId
                ? { ...b, propertyId: transfer.destinationPropertyId, herdId: undefined, updatedAt: now }
                : b,
            ),
            memberships: state.memberships.map((m) =>
              m.bovineId === transfer.bovineId && !m.endDate && m.active !== false
                ? { ...m, endDate: transfer.date, updatedAt: now }
                : m,
            ),
          }
        }),

      // ── Financeiro ──

      addExpense: (expense) =>
        set((state) => ({ expenses: [...state.expenses, expense] })),

      updateExpense: (id, updates) =>
        set((state) => ({
          expenses: state.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        })),

      // Lote comercial (RF40): cria o lote e os vínculos N:N com os bovinos.
      addSaleLot: (lot, bovineIds) =>
        set((state) => ({
          saleLots: [...state.saleLots, lot],
          saleLotBovines: [
            ...state.saleLotBovines,
            ...bovineIds.map((bovineId) => ({
              id: crypto.randomUUID(),
              saleLotId: lot.id,
              bovineId,
              active: true,
              createdAt: lot.createdAt ?? new Date().toISOString(),
              updatedAt: lot.updatedAt ?? new Date().toISOString(),
            })),
          ],
        })),

      updateSaleLot: (id, updates) =>
        set((state) => ({
          saleLots: state.saleLots.map((l) => (l.id === id ? { ...l, ...updates } : l)),
        })),

      // Venda (RF41): ao confirmar, marca o lote como vendido, inativa os bovinos
      // do lote e encerra seus pertencimentos ativos.
      registerSale: (sale) =>
        set((state) => {
          const now = new Date().toISOString()
          const bovineIds = new Set(
            state.saleLotBovines
              .filter((lb) => lb.saleLotId === sale.saleLotId && lb.active !== false)
              .map((lb) => lb.bovineId),
          )
          return {
            sales: [...state.sales, sale],
            saleLots: state.saleLots.map((l) =>
              l.id === sale.saleLotId ? { ...l, status: 'vendido' as const, updatedAt: now } : l,
            ),
            bovines: state.bovines.map((b) =>
              bovineIds.has(b.id) ? { ...b, active: false, updatedAt: now } : b,
            ),
            memberships: state.memberships.map((m) =>
              bovineIds.has(m.bovineId) && !m.endDate && m.active !== false
                ? { ...m, endDate: sale.date, updatedAt: now }
                : m,
            ),
          }
        }),
    }),
    {
      name: 'agroware:farm',
      // v2: modelo expandido para o escopo consolidado (32 entidades). Estados
      // persistidos da v1 (12 coleções, Fazenda São José) são descartados para
      // que `seedIfEmpty` repopule com o dataset novo na próxima carga.
      version: 2,
      migrate: () => ({ ...emptyState }) as unknown as FarmState,
    },
  ),
)
