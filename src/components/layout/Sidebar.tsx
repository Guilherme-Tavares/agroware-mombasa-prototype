import { NavLink } from 'react-router-dom'
import {
  Home,
  Map,
  Beef,
  Layers,
  Users,
  ArrowLeftRight,
  BarChart2,
  Settings,
  HelpCircle,
  LogOut,
  UserCircle,
  X,
} from 'lucide-react'
import { useUIStore } from '@/store/useUIStore'
import { useAuthStore } from '@/store/useAuthStore'
import { cn } from '@/utils/cn'
import AgrowareLogo from '@/assets/logo/AgrowareLogo.tsx'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  end?: boolean
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Principal',
    items: [
      { to: '/', label: 'Início', icon: <Home size={18} />, end: true },
      { to: '/map', label: 'Mapa', icon: <Map size={18} /> },
    ],
  },
  {
    title: 'Cadastros',
    items: [
      { to: '/bovines/new', label: 'Bovinos', icon: <Beef size={18} /> },
      { to: '/divisions/new', label: 'Divisões', icon: <Layers size={18} /> },
      { to: '/herds/new', label: 'Rebanhos', icon: <Users size={18} /> },
    ],
  },
  {
    title: 'Operações',
    items: [
      { to: '/operations/allocation', label: 'Lotação', icon: <ArrowLeftRight size={18} /> },
    ],
  },
  {
    title: 'Relatórios',
    items: [
      { to: '/reports', label: 'Relatórios', icon: <BarChart2 size={18} /> },
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
          <AgrowareLogo size={28} variant="wordmark" />
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
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="px-3 mb-1.5 text-caption font-medium text-gray-400 uppercase tracking-wide">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavItemLink {...item} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* rodapé */}
        <div className="shrink-0 border-t border-gray-200 px-3 py-3 space-y-0.5">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-body font-medium transition-colors',
                isActive
                  ? 'bg-primary-bg text-primary'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              )
            }
          >
            <UserCircle size={18} aria-hidden="true" />
            Perfil
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-body font-medium transition-colors',
                isActive
                  ? 'bg-primary-bg text-primary'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              )
            }
          >
            <Settings size={18} aria-hidden="true" />
            Configurações
          </NavLink>

          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-body font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <HelpCircle size={18} aria-hidden="true" />
            Ajuda
          </a>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-body font-medium text-alert hover:bg-alert-bg transition-colors"
          >
            <LogOut size={18} aria-hidden="true" />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
