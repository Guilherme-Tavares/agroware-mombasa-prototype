import { NavLink } from 'react-router-dom'
import {
  Home,
  Map,
  MapPinned,
  ListTodo,
  Layers,
  Droplets,
  Droplet,
  Sprout,
  CircleSmall,
  CirclePile,
  Wheat,
  Pill,
  Warehouse,
  Link2,
  ArrowLeftRight,
  Scale,
  Truck,
  TrendingUp,
  CalendarRange,
  Milestone,
  Syringe,
  CalendarDays,
  ClipboardCheck,
  Tag,
  Package,
  Receipt,
  DollarSign,
  BarChart2,
  History,
  UserCircle,
  Users,
  UserPlus,
  Settings,
  HelpCircle,
  LogOut,
  X,
} from 'lucide-react'
import { useUIStore } from '@/store/useUIStore'
import { useAccess } from '@/hooks/useAccess'
import type { AccessCapabilities } from '@/hooks/useAccess'
import { useAuthStore } from '@/store/useAuthStore'
import { cn } from '@/utils/cn'
import AgrowareLogo from '@/assets/logo/AgrowareLogo.tsx'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  end?: boolean
  /** Capacidade exigida para o item aparecer. Ausente = visível a todos. */
  requires?: keyof AccessCapabilities
}

const NAV_SECTIONS: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { to: '/', label: 'Início', icon: <Home size={18} />, end: true },
      { to: '/map', label: 'Mapa', icon: <Map size={18} /> },
      { to: '/properties', label: 'Propriedades', icon: <MapPinned size={18} />, end: true },
      { to: '/tasks', label: 'Tarefas', icon: <ListTodo size={18} />, end: true },
    ],
  },
  {
    title: 'Terra',
    items: [
      { to: '/divisions', label: 'Divisões', icon: <Layers size={18} />, end: true },
      { to: '/troughs', label: 'Cochos', icon: <Droplets size={18} />, end: true },
      { to: '/forages', label: 'Forragem', icon: <Sprout size={18} />, end: true },
    ],
  },
  {
    title: 'Gado',
    items: [
      { to: '/bovines', label: 'Bovinos', icon: <CircleSmall size={18} />, end: true },
      { to: '/herds', label: 'Rebanhos', icon: <CirclePile size={18} />, end: true },
    ],
  },
  {
    title: 'Insumos',
    items: [
      { to: '/feeds', label: 'Alimentos', icon: <Wheat size={18} />, end: true },
      { to: '/medications', label: 'Medicamentos', icon: <Pill size={18} />, end: true },
      { to: '/stock', label: 'Estoques', icon: <Warehouse size={18} />, end: true },
    ],
  },
  {
    title: 'Manejo',
    items: [
      { to: '/operations/membership', label: 'Pertencimento', icon: <Link2 size={18} /> },
      { to: '/operations/allocation', label: 'Lotação', icon: <ArrowLeftRight size={18} /> },
      { to: '/operations/weighing', label: 'Pesagem', icon: <Scale size={18} /> },
      { to: '/operations/bovine-transfer', label: 'Transferência', icon: <Truck size={18} /> },
    ],
  },
  {
    title: 'Evolução',
    items: [
      { to: '/gmd', label: 'GMD', icon: <TrendingUp size={18} />, end: true, requires: 'reports' },
      { to: '/seasons', label: 'Temporadas', icon: <CalendarRange size={18} />, end: true },
      { to: '/operations/season-passage', label: 'Passagem', icon: <Milestone size={18} /> },
    ],
  },
  {
    title: 'Alimentação & Sanidade',
    items: [
      { to: '/operations/supply', label: 'Abastecimento', icon: <Droplet size={18} /> },
      { to: '/operations/medication-application', label: 'Aplicação', icon: <Syringe size={18} /> },
      { to: '/sanitary-events', label: 'Calendário sanitário', icon: <CalendarDays size={18} />, end: true },
      { to: '/operations/sanitary-execution', label: 'Executar eventos', icon: <ClipboardCheck size={18} /> },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { to: '/sales', label: 'Vendas', icon: <Tag size={18} />, end: true },
      { to: '/sale-lots', label: 'Lotes comerciais', icon: <Package size={18} />, end: true },
      { to: '/expenses', label: 'Despesas', icon: <Receipt size={18} />, end: true },
      { to: '/expense-categories', label: 'Categorias', icon: <DollarSign size={18} />, end: true },
    ],
  },
  {
    title: 'Dados',
    items: [
      { to: '/reports', label: 'Relatórios', icon: <BarChart2 size={18} />, requires: 'reports' },
      { to: '/history', label: 'Históricos', icon: <History size={18} />, end: true },
    ],
  },
  {
    title: 'Conta & Acesso',
    items: [
      { to: '/profile', label: 'Perfil', icon: <UserCircle size={18} />, end: true },
      { to: '/access', label: 'Usuários', icon: <Users size={18} />, end: true },
      { to: '/users-invites', label: 'Convites', icon: <UserPlus size={18} />, end: true },
    ],
  },
]

function NavItemLink({ to, label, icon, end }: NavItem) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-body font-medium transition-colors',
          isActive
            ? 'bg-primary-bg text-primary'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        )
      }
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </NavLink>
  )
}

export default function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)
  const logout = useAuthStore((s) => s.logout)
  const { can } = useAccess()

  // Esconde o que o nível do usuário não alcança, para o menu não oferecer
  // destino que a tela vai negar (relatórios e projeção: escopo §6.2).
  const visibleSections = NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.requires || can[item.requires]),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <>
      {/* overlay para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-40 w-60 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300',
          'lg:static lg:translate-x-0 lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* logo */}
        <div className="flex items-center justify-between h-[60px] px-4 border-b border-gray-200 shrink-0">
          <AgrowareLogo size={30} variant="wordmark" />
          <button
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {visibleSections.map((section, i) => (
            <div key={section.title ?? `top-${i}`}>
              {section.title && (
                <p className="px-3 mb-1.5 text-caption font-medium text-gray-400 uppercase tracking-wide">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavItemLink to={item.to} label={item.label} icon={item.icon} end={item.end} />
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <ul className="space-y-0.5">
              <li>
                <NavItemLink to="/settings" label="Configurações" icon={<Settings size={18} />} end />
              </li>
              <li>
                <a
                  href="#"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-body font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <HelpCircle size={18} aria-hidden="true" />
                  Ajuda
                </a>
              </li>
              <li>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-body font-medium text-alert hover:bg-alert-bg transition-colors"
                >
                  <LogOut size={18} aria-hidden="true" />
                  Sair
                </button>
              </li>
            </ul>
          </div>
        </nav>
      </aside>
    </>
  )
}
