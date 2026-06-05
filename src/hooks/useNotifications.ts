import { useMemo } from 'react'
import { useFarmStore } from '@/store/useFarmStore'
import type { Notification } from '@/types/domain'

// ──────────────────────────────────────────────────────────────────────────────
// Seletores de notificação (RF67). Juntam `notificacao` (por propriedade ativa)
// com o estado de leitura do usuário atual (`notificacao_usuario`).
// ──────────────────────────────────────────────────────────────────────────────

export interface NotificationItem extends Notification {
  read: boolean
  dismissed: boolean
}

export function useNotifications(includeResolved = false): NotificationItem[] {
  const notifications     = useFarmStore((s) => s.notifications)
  const notificationUsers = useFarmStore((s) => s.notificationUsers)
  const currentUserId     = useFarmStore((s) => s.currentUserId)
  const activePropertyId  = useFarmStore((s) => s.activePropertyId)

  return useMemo(() => {
    const stateByNotif = new Map(
      notificationUsers.filter((nu) => nu.userId === currentUserId).map((nu) => [nu.notificationId, nu]),
    )
    return notifications
      .filter((n) => n.propertyId === activePropertyId)
      .filter((n) => (includeResolved ? true : !n.resolved))
      .filter((n) => {
        const st = stateByNotif.get(n.id)
        return !st?.dismissed
      })
      .map((n) => {
        const st = stateByNotif.get(n.id)
        return { ...n, read: st?.read ?? false, dismissed: st?.dismissed ?? false }
      })
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  }, [notifications, notificationUsers, currentUserId, activePropertyId, includeResolved])
}

export function useUnreadCount(): number {
  const items = useNotifications(false)
  return useMemo(() => items.filter((n) => !n.read).length, [items])
}
