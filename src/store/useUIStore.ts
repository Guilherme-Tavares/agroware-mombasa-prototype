import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
}

interface UIState {
  toasts: Toast[]
  sidebarOpen: boolean
  activeMapLayers: {
    divisions: boolean
    herds: boolean
    troughs: boolean
    forages: boolean
  }

  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleMapLayer: (layer: 'divisions' | 'herds' | 'troughs' | 'forages') => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      toasts: [],
      sidebarOpen: false,
      activeMapLayers: {
        divisions: true,
        herds: true,
        troughs: true,
        forages: false,
      },

      addToast: (toast) =>
        set((state) => ({
          toasts: [
            ...state.toasts.slice(-2),
            { ...toast, id: crypto.randomUUID() },
          ],
        })),

      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),

      clearToasts: () => set({ toasts: [] }),

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toggleMapLayer: (layer) =>
        set((state) => ({
          activeMapLayers: {
            ...state.activeMapLayers,
            [layer]: !state.activeMapLayers[layer],
          },
        })),
    }),
    {
      name: 'agroware:ui',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        activeMapLayers: state.activeMapLayers,
      }),
    },
  ),
)
