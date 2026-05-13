import { useFarmStore } from '@/store/useFarmStore'
import { useAuthStore } from '@/store/useAuthStore'
import { mockData } from '@/data/mockFarm'

/**
 * Popula as stores com o dataset mock da Fazenda São José no primeiro carregamento.
 * Se já houver dados no localStorage, não faz nada.
 */
export function seedIfEmpty(): void {
  const { farm, seedFromMock } = useFarmStore.getState()
  if (!farm) {
    seedFromMock(mockData)
  }

  const { isAuthenticated, login } = useAuthStore.getState()
  if (!isAuthenticated) {
    login(mockData.producer.name, mockData.producer.email)
  }
}

/**
 * Reseta todas as stores para o estado inicial do mock.
 * Usado via atalho Shift+Ctrl+R ou botão em /settings.
 */
export function resetToMock(): void {
  useFarmStore.getState().seedFromMock(mockData)
  useAuthStore.getState().login(mockData.producer.name, mockData.producer.email)
}
