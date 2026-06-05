import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  isAuthenticated: boolean
  producerName: string
  producerEmail: string | null

  login: (name: string, email?: string) => void
  loginOffline: (name: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      producerName: '',
      producerEmail: null,

      login: (name, email) =>
        set({
          isAuthenticated: true,
          producerName: name.trim(),
          producerEmail: email ?? null,
        }),

      loginOffline: (name) =>
        set({
          isAuthenticated: true,
          producerName: name.trim(),
          producerEmail: null,
        }),

      logout: () =>
        set({
          isAuthenticated: false,
          producerName: '',
          producerEmail: null,
        }),
    }),
    { name: 'agroware:auth' },
  ),
)
