import { createBrowserRouter } from 'react-router-dom'
import AppShell, { ProtectedRoute } from '@/components/layout/AppShell.tsx'
import Login from '@/pages/Login/index.tsx'
import Dashboard from '@/pages/Dashboard/index.tsx'
import MapPage from '@/pages/Map/index.tsx'
import Demarcation from '@/pages/Demarcation/index.tsx'
import BovineRegister from '@/pages/BovineRegister/index.tsx'
import DivisionRegister from '@/pages/DivisionRegister/index.tsx'
import HerdRegister from '@/pages/HerdRegister/index.tsx'
import HerdAllocation from '@/pages/HerdAllocation/index.tsx'
import MapBaseConfig from '@/pages/MapBaseConfig/index.tsx'
import FeedTroughDetail from '@/pages/FeedTroughDetail/index.tsx'
import DevComponents from '@/pages/DevComponents/index.tsx'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  // Rota de desenvolvimento — fora do AppShell e sem proteção de auth
  {
    path: '/dev/components',
    element: <DevComponents />,
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
          { path: 'map/offline', element: <MapBaseConfig /> },
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
