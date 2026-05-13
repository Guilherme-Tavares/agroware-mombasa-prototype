import { createBrowserRouter, Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import Login from '@/pages/Login/index.tsx'
import Dashboard from '@/pages/Dashboard/index.tsx'
import MapPage from '@/pages/Map/index.tsx'
import Demarcation from '@/pages/Demarcation/index.tsx'
import BovineRegister from '@/pages/BovineRegister/index.tsx'
import DivisionRegister from '@/pages/DivisionRegister/index.tsx'
import HerdRegister from '@/pages/HerdRegister/index.tsx'
import HerdAllocation from '@/pages/HerdAllocation/index.tsx'
import FeedTroughDetail from '@/pages/FeedTroughDetail/index.tsx'

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

// AppShell — placeholder para Etapa 2 (receberá Header + Sidebar)
function AppShell() {
  return (
    <div>
      <Outlet />
    </div>
  )
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'map', element: <MapPage /> },
          { path: 'demarcation', element: <Demarcation /> },
          { path: 'bovines/new', element: <BovineRegister /> },
          { path: 'bovines/:id/edit', element: <BovineRegister /> },
          { path: 'divisions/new', element: <DivisionRegister /> },
          { path: 'herds/new', element: <HerdRegister /> },
          { path: 'operations/allocation', element: <HerdAllocation /> },
          { path: 'feed-troughs/:id', element: <FeedTroughDetail /> },
        ],
      },
    ],
  },
])
