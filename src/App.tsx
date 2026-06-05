import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes.tsx'
import { ToastContainer } from '@/components/ui/Toast.tsx'
import ErrorBoundary from '@/components/ErrorBoundary.tsx'
import { useDevShortcuts } from '@/hooks/useDevShortcuts.ts'
import { useFarmStore } from '@/store/useFarmStore'

export default function App() {
  useDevShortcuts()

  // Reconcilia as notificações derivadas dos dados ao iniciar e quando muda a
  // propriedade ativa ou o usuário corrente (RF67).
  const reconcileNotifications = useFarmStore((s) => s.reconcileNotifications)
  const activePropertyId = useFarmStore((s) => s.activePropertyId)
  const currentUserId = useFarmStore((s) => s.currentUserId)
  useEffect(() => {
    reconcileNotifications()
  }, [reconcileNotifications, activePropertyId, currentUserId])

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <ToastContainer />
    </ErrorBoundary>
  )
}
