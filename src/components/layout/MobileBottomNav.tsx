import { NavLink } from 'react-router-dom'
import { Home, Map, PlusCircle, ArrowLeftRight, MoreHorizontal } from 'lucide-react'
import { cn } from '@/utils/cn'

const NAV_ITEMS = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/map', label: 'Mapa', icon: Map, end: false },
  { to: '/bovines/new', label: 'Cadastrar', icon: PlusCircle, end: false },
  { to: '/operations/allocation', label: 'Operações', icon: ArrowLeftRight, end: false },
  { to: '/settings', label: 'Mais', icon: MoreHorizontal, end: false },
]

export default function MobileBottomNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 safe-area-bottom"
      aria-label="Navegação principal"
    >
      <ul className="flex">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-h-[56px] w-full transition-colors',
                  isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.75}
                    aria-hidden="true"
                  />
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
