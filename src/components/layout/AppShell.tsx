import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import Header from './Header'
import Sidebar from './Sidebar'
import MobileBottomNav from './MobileBottomNav'
import AnimatedOutlet from './AnimatedOutlet'

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

export default function AppShell() {
  return (
    <div className="flex h-svh bg-gray-50 overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto" id="main-content">
          <div className="p-4 lg:p-6 pb-20 lg:pb-6">
            <AnimatedOutlet />
          </div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  )
}
