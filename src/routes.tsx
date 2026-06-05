import { createBrowserRouter } from 'react-router-dom'
import AppShell, { ProtectedRoute } from '@/components/layout/AppShell.tsx'
import Login from '@/pages/Login/index.tsx'
import Dashboard from '@/pages/Dashboard/index.tsx'
import MapPage from '@/pages/Map/index.tsx'
import Demarcation from '@/pages/Demarcation/index.tsx'
import BovineRegister from '@/pages/BovineRegister/index.tsx'
import BovineList from '@/pages/BovineList/index.tsx'
import BovineDetail from '@/pages/BovineDetail/index.tsx'
import DivisionRegister from '@/pages/DivisionRegister/index.tsx'
import DivisionList from '@/pages/DivisionList/index.tsx'
import DivisionDetail from '@/pages/DivisionDetail/index.tsx'
import HerdRegister from '@/pages/HerdRegister/index.tsx'
import HerdList from '@/pages/HerdList/index.tsx'
import HerdDetail from '@/pages/HerdDetail/index.tsx'
import SeasonRegister from '@/pages/SeasonRegister/index.tsx'
import SeasonList from '@/pages/SeasonList/index.tsx'
import SeasonDetail from '@/pages/SeasonDetail/index.tsx'
import TroughRegister from '@/pages/TroughRegister/index.tsx'
import TroughList from '@/pages/TroughList/index.tsx'
import TroughDetail from '@/pages/TroughDetail/index.tsx'
import MedicationRegister from '@/pages/MedicationRegister/index.tsx'
import MedicationList from '@/pages/MedicationList/index.tsx'
import MedicationDetail from '@/pages/MedicationDetail/index.tsx'
import FeedRegister from '@/pages/FeedRegister/index.tsx'
import FeedList from '@/pages/FeedList/index.tsx'
import FeedDetail from '@/pages/FeedDetail/index.tsx'
import ExpenseCategoryRegister from '@/pages/ExpenseCategoryRegister/index.tsx'
import ExpenseCategoryList from '@/pages/ExpenseCategoryList/index.tsx'
import ExpenseCategoryDetail from '@/pages/ExpenseCategoryDetail/index.tsx'
import SanitaryEventRegister from '@/pages/SanitaryEventRegister/index.tsx'
import SanitaryEventList from '@/pages/SanitaryEventList/index.tsx'
import SanitaryEventDetail from '@/pages/SanitaryEventDetail/index.tsx'
import TaskRegister from '@/pages/TaskRegister/index.tsx'
import TaskList from '@/pages/TaskList/index.tsx'
import TaskDetail from '@/pages/TaskDetail/index.tsx'
import PropertyRegister from '@/pages/PropertyRegister/index.tsx'
import PropertyList from '@/pages/PropertyList/index.tsx'
import PropertyDetail from '@/pages/PropertyDetail/index.tsx'
import UsersInvitesList from '@/pages/UsersInvitesList/index.tsx'
import ForageRegister from '@/pages/ForageRegister/index.tsx'
import ForageList from '@/pages/ForageList/index.tsx'
import ForageDetail from '@/pages/ForageDetail/index.tsx'
import MedicationStockRegister from '@/pages/MedicationStockRegister/index.tsx'
import MedicationStockList from '@/pages/MedicationStockList/index.tsx'
import FeedStockRegister from '@/pages/FeedStockRegister/index.tsx'
import FeedStockList from '@/pages/FeedStockList/index.tsx'
import WeighingRegister from '@/pages/WeighingRegister/index.tsx'
import SeasonPassageRegister from '@/pages/SeasonPassageRegister/index.tsx'
import MedicationApplicationRegister from '@/pages/MedicationApplicationRegister/index.tsx'
import SupplyRegister from '@/pages/SupplyRegister/index.tsx'
import SanitaryEventExecution from '@/pages/SanitaryEventExecution/index.tsx'
import MembershipRegister from '@/pages/MembershipRegister/index.tsx'
import BovineTransferRegister from '@/pages/BovineTransferRegister/index.tsx'
import ExpenseRegister from '@/pages/ExpenseRegister/index.tsx'
import ExpenseList from '@/pages/ExpenseList/index.tsx'
import ExpenseDetail from '@/pages/ExpenseDetail/index.tsx'
import SaleLotRegister from '@/pages/SaleLotRegister/index.tsx'
import SaleLotList from '@/pages/SaleLotList/index.tsx'
import SaleLotDetail from '@/pages/SaleLotDetail/index.tsx'
import SaleRegister from '@/pages/SaleRegister/index.tsx'
import SaleList from '@/pages/SaleList/index.tsx'
import SaleDetail from '@/pages/SaleDetail/index.tsx'
import HerdAllocation from '@/pages/HerdAllocation/index.tsx'
import MapBaseConfig from '@/pages/MapBaseConfig/index.tsx'
import WeighingHistory from '@/pages/history/WeighingHistory.tsx'
import ApplicationHistory from '@/pages/history/ApplicationHistory.tsx'
import RefillHistory from '@/pages/history/RefillHistory.tsx'
import AllocationHistory from '@/pages/history/AllocationHistory.tsx'
import MembershipHistory from '@/pages/history/MembershipHistory.tsx'
import PassageHistory from '@/pages/history/PassageHistory.tsx'
import TransferHistory from '@/pages/history/TransferHistory.tsx'
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
          { path: 'bovines', element: <BovineList /> },
          { path: 'bovines/new', element: <BovineRegister /> },
          { path: 'bovines/:id', element: <BovineDetail /> },
          { path: 'bovines/:id/edit', element: <BovineRegister /> },
          { path: 'properties', element: <PropertyList /> },
          { path: 'properties/new', element: <PropertyRegister /> },
          { path: 'properties/:id', element: <PropertyDetail /> },
          { path: 'properties/:id/edit', element: <PropertyRegister /> },
          { path: 'users-invites', element: <UsersInvitesList /> },
          { path: 'divisions', element: <DivisionList /> },
          { path: 'divisions/new', element: <DivisionRegister /> },
          { path: 'divisions/:id', element: <DivisionDetail /> },
          { path: 'divisions/:id/edit', element: <DivisionRegister /> },
          { path: 'forages', element: <ForageList /> },
          { path: 'forages/new', element: <ForageRegister /> },
          { path: 'forages/:id', element: <ForageDetail /> },
          { path: 'forages/:id/edit', element: <ForageRegister /> },
          { path: 'herds', element: <HerdList /> },
          { path: 'herds/new', element: <HerdRegister /> },
          { path: 'herds/:id', element: <HerdDetail /> },
          { path: 'herds/:id/edit', element: <HerdRegister /> },
          { path: 'seasons', element: <SeasonList /> },
          { path: 'seasons/new', element: <SeasonRegister /> },
          { path: 'seasons/:id', element: <SeasonDetail /> },
          { path: 'seasons/:id/edit', element: <SeasonRegister /> },
          { path: 'troughs', element: <TroughList /> },
          { path: 'troughs/new', element: <TroughRegister /> },
          { path: 'troughs/:id', element: <TroughDetail /> },
          { path: 'troughs/:id/edit', element: <TroughRegister /> },
          { path: 'medications', element: <MedicationList /> },
          { path: 'medications/new', element: <MedicationRegister /> },
          { path: 'medications/:id', element: <MedicationDetail /> },
          { path: 'medications/:id/edit', element: <MedicationRegister /> },
          { path: 'feeds', element: <FeedList /> },
          { path: 'feeds/new', element: <FeedRegister /> },
          { path: 'feeds/:id', element: <FeedDetail /> },
          { path: 'feeds/:id/edit', element: <FeedRegister /> },
          { path: 'expense-categories', element: <ExpenseCategoryList /> },
          { path: 'expense-categories/new', element: <ExpenseCategoryRegister /> },
          { path: 'expense-categories/:id', element: <ExpenseCategoryDetail /> },
          { path: 'expense-categories/:id/edit', element: <ExpenseCategoryRegister /> },
          { path: 'expenses', element: <ExpenseList /> },
          { path: 'expenses/new', element: <ExpenseRegister /> },
          { path: 'expenses/:id', element: <ExpenseDetail /> },
          { path: 'expenses/:id/edit', element: <ExpenseRegister /> },
          { path: 'sale-lots', element: <SaleLotList /> },
          { path: 'sale-lots/new', element: <SaleLotRegister /> },
          { path: 'sale-lots/:id', element: <SaleLotDetail /> },
          { path: 'sales', element: <SaleList /> },
          { path: 'sales/new', element: <SaleRegister /> },
          { path: 'sales/:id', element: <SaleDetail /> },
          { path: 'sanitary-events', element: <SanitaryEventList /> },
          { path: 'sanitary-events/new', element: <SanitaryEventRegister /> },
          { path: 'sanitary-events/:id', element: <SanitaryEventDetail /> },
          { path: 'sanitary-events/:id/edit', element: <SanitaryEventRegister /> },
          { path: 'tasks', element: <TaskList /> },
          { path: 'tasks/new', element: <TaskRegister /> },
          { path: 'tasks/:id', element: <TaskDetail /> },
          { path: 'tasks/:id/edit', element: <TaskRegister /> },
          { path: 'operations/allocation', element: <HerdAllocation /> },
          { path: 'operations/weighing', element: <WeighingRegister /> },
          { path: 'operations/season-passage', element: <SeasonPassageRegister /> },
          { path: 'operations/medication-application', element: <MedicationApplicationRegister /> },
          { path: 'operations/supply', element: <SupplyRegister /> },
          { path: 'operations/sanitary-execution', element: <SanitaryEventExecution /> },
          { path: 'operations/membership', element: <MembershipRegister /> },
          { path: 'operations/bovine-transfer', element: <BovineTransferRegister /> },
          { path: 'history/weighings', element: <WeighingHistory /> },
          { path: 'history/applications', element: <ApplicationHistory /> },
          { path: 'history/refills', element: <RefillHistory /> },
          { path: 'history/allocations', element: <AllocationHistory /> },
          { path: 'history/memberships', element: <MembershipHistory /> },
          { path: 'history/passages', element: <PassageHistory /> },
          { path: 'history/transfers', element: <TransferHistory /> },
          { path: 'medication-stock', element: <MedicationStockList /> },
          { path: 'medication-stock/new', element: <MedicationStockRegister /> },
          { path: 'feed-stock', element: <FeedStockList /> },
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
