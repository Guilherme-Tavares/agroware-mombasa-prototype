import { useFarmStore } from '@/store/useFarmStore'
import { useAuthStore } from '@/store/useAuthStore'
import { mockData } from '@/data/mockFarm'

/**
 * Popula as stores com o dataset mock do Sítio Santa Fé no primeiro carregamento.
 * Se já houver dados no localStorage, não faz nada.
 *
 * Não autentica automaticamente: a aplicação abre no login e o nome do produtor
 * vem do que o usuário informa no acesso offline (decisões 5.4 e 5.7 do
 * documento de alinhamento). Sem default fixo de nome.
 */
export function seedIfEmpty(): void {
  const { farm, seedFromMock } = useFarmStore.getState()
  if (!farm) {
    seedFromMock(mockData)
  }
}

/**
 * Reseta todas as stores para o estado inicial do mock.
 * Usado via atalho Shift+Ctrl+R ou botão em /settings.
 * Mantém a sessão atual; se não houver, entra offline com o nome do mock.
 */
export function resetToMock(): void {
  useFarmStore.getState().seedFromMock(mockData)
  const { isAuthenticated, loginOffline } = useAuthStore.getState()
  if (!isAuthenticated) {
    loginOffline(mockData.user.name)
  }
}
