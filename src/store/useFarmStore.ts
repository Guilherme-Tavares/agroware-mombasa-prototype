import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
  Refill,
} from '@/types/domain'
import type { MockData } from '@/data/mockFarm'

interface FarmState {
  producer: Producer | null
  farm: Farm | null
  divisions: Division[]
  forages: Forage[]
  herds: Herd[]
  bovines: Bovine[]
  allocations: Allocation[]
  feedTroughs: FeedTrough[]
  feeds: Feed[]
  seasons: Season[]
  seasonPassages: SeasonPassage[]

  seedFromMock: (data: MockData) => void
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

export const useFarmStore = create<FarmState>()(
  persist(
    (set) => ({
      producer: null,
      farm: null,
      divisions: [],
      forages: [],
      herds: [],
      bovines: [],
      allocations: [],
      feedTroughs: [],
      feeds: [],
      seasons: [],
      seasonPassages: [],

      updateFarm: (updates) =>
        set((state) => ({
          farm: state.farm ? { ...state.farm, ...updates } : state.farm,
        })),

      seedFromMock: (data) =>
        set({
          producer: data.producer,
          farm: data.farm,
          divisions: data.divisions,
          forages: data.forages,
          herds: data.herds,
          bovines: data.bovines,
          allocations: data.allocations,
          feedTroughs: data.feedTroughs,
          feeds: data.feeds,
          seasons: data.seasons,
          seasonPassages: data.seasonPassages,
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
    { name: 'agroware:farm' },
  ),
)
