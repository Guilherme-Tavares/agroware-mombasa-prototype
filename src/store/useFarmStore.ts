import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
  Refill,
} from '@/types/domain'
import type { MockData } from '@/data/mockFarm'

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
  updateCurrentUser: (updates: Partial<User>) => void
  updateUserConfig: (updates: Partial<UserConfig>) => void
  updateFarm: (updates: Partial<Farm>) => void
  addBovine: (bovine: Bovine) => void
  updateBovine: (id: string, updates: Partial<Bovine>) => void
  allocateHerd: (allocation: Allocation) => void
  deallocateHerd: (herdId: string) => void
  refillFeedTrough: (troughId: string, refill: Refill, newAmount: number) => void
  updateDivision: (id: string, updates: Partial<Division>) => void
  addHerd: (herd: Herd) => void
  addDivision: (division: Division) => void
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

      updateCurrentUser: (updates) =>
        set((state) => {
          if (!state.user) return state
          const updated = { ...state.user, ...updates }
          return {
            user: updated,
            users: state.users.map((u) => (u.id === updated.id ? updated : u)),
          }
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

      refillFeedTrough: (troughId, refill, newAmount) =>
        set((state) => ({
          feedTroughs: state.feedTroughs.map((t) =>
            t.id === troughId
              ? {
                  ...t,
                  currentAmount: newAmount,
                  lastRefillDate: refill.date,
                  currentFeedId: refill.feedId,
                  refillHistory: [refill, ...t.refillHistory].slice(0, 10),
                }
              : t,
          ),
        })),

      updateDivision: (id, updates) =>
        set((state) => ({
          divisions: state.divisions.map((d) =>
            d.id === id ? { ...d, ...updates } : d,
          ),
        })),

      addHerd: (herd) =>
        set((state) => ({ herds: [...state.herds, herd] })),

      addDivision: (division) =>
        set((state) => ({ divisions: [...state.divisions, division] })),
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
