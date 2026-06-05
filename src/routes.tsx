import { createBrowserRouter } from 'react-router-dom'
import AppShell, { ProtectedRoute } from '@/components/layout/AppShell.tsx'
import Login from '@/pages/Login/index.tsx'
import Dashboard from '@/pages/Dashboard/index.tsx'
import MapPage from '@/pages/Map/index.tsx'
import Demarcation from '@/pages/Demarcation/index.tsx'
import BovineRegister from '@/pages/BovineRegister/index.tsx'
import DivisionRegister from '@/pages/DivisionRegister/index.tsx'
import HerdRegister from '@/pages/HerdRegister/index.tsx'
import SeasonRegister from '@/pages/SeasonRegister/index.tsx'
import TroughRegister from '@/pages/TroughRegister/index.tsx'
import MedicationRegister from '@/pages/MedicationRegister/index.tsx'
import FeedRegister from '@/pages/FeedRegister/index.tsx'
import ExpenseCategoryRegister from '@/pages/ExpenseCategoryRegister/index.tsx'
import SanitaryEventRegister from '@/pages/SanitaryEventRegister/index.tsx'
import TaskRegister from '@/pages/TaskRegister/index.tsx'
import PropertyRegister from '@/pages/PropertyRegister/index.tsx'
import ForageRegister from '@/pages/ForageRegister/index.tsx'
import MedicationStockRegister from '@/pages/MedicationStockRegister/index.tsx'
import FeedStockRegister from '@/pages/FeedStockRegister/index.tsx'
import WeighingRegister from '@/pages/WeighingRegister/index.tsx'
import SeasonPassageRegister from '@/pages/SeasonPassageRegister/index.tsx'
import MedicationApplicationRegister from '@/pages/MedicationApplicationRegister/index.tsx'
import SupplyRegister from '@/pages/SupplyRegister/index.tsx'
import SanitaryEventExecution from '@/pages/SanitaryEventExecution/index.tsx'
import MembershipRegister from '@/pages/MembershipRegister/index.tsx'
import BovineTransferRegister from '@/pages/BovineTransferRegister/index.tsx'
import ExpenseRegister from '@/pages/ExpenseRegister/index.tsx'
import SaleLotRegister from '@/pages/SaleLotRegister/index.tsx'
import SaleRegister from '@/pages/SaleRegister/index.tsx'
import HerdAllocation from '@/pages/HerdAllocation/index.tsx'
import MapBaseConfig from '@/pages/MapBaseConfig/index.tsx'
import Profile from '@/pages/Profile/index.tsx'
import Settings from '@/pages/Settings/index.tsx'
import Access from '@/pages/Access/index.tsx'
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
          { path: 'properties/new', element: <PropertyRegister /> },
          { path: 'divisions/new', element: <DivisionRegister /> },
          { path: 'forages/new', element: <ForageRegister /> },
          { path: 'herds/new', element: <HerdRegister /> },
          { path: 'seasons/new', element: <SeasonRegister /> },
          { path: 'troughs/new', element: <TroughRegister /> },
          { path: 'medications/new', element: <MedicationRegister /> },
          { path: 'feeds/new', element: <FeedRegister /> },
          { path: 'expense-categories/new', element: <ExpenseCategoryRegister /> },
          { path: 'expenses/new', element: <ExpenseRegister /> },
          { path: 'sale-lots/new', element: <SaleLotRegister /> },
          { path: 'sales/new', element: <SaleRegister /> },
          { path: 'sanitary-events/new', element: <SanitaryEventRegister /> },
          { path: 'tasks/new', element: <TaskRegister /> },
          { path: 'operations/allocation', element: <HerdAllocation /> },
          { path: 'operations/weighing', element: <WeighingRegister /> },
          { path: 'operations/season-passage', element: <SeasonPassageRegister /> },
          { path: 'operations/medication-application', element: <MedicationApplicationRegister /> },
          { path: 'operations/supply', element: <SupplyRegister /> },
          { path: 'operations/sanitary-execution', element: <SanitaryEventExecution /> },
          { path: 'operations/membership', element: <MembershipRegister /> },
          { path: 'operations/bovine-transfer', element: <BovineTransferRegister /> },
          { path: 'medication-stock/new', element: <MedicationStockRegister /> },
          { path: 'feed-stock/new', element: <FeedStockRegister /> },
          { path: 'profile', element: <Profile /> },
          { path: 'settings', element: <Settings /> },
          { path: 'access', element: <Access /> },
          { path: 'feed-troughs/:id', element: <FeedTroughDetail /> },
        ],
      },
    ],
  },
])
