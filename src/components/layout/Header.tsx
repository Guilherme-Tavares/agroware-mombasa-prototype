import { Menu, Bell } from 'lucide-react'
import { useFarmStore } from '@/store/useFarmStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useUIStore } from '@/store/useUIStore'

export default function Header() {
  const farm = useFarmStore((s) => s.farm)
  const producerName = useAuthStore((s) => s.producerName)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

  const initials = producerName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <header className="h-[60px] shrink-0 flex items-center justify-between px-4 bg-white border-b border-gray-200 z-20">
      {/* esquerda */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Menu"
        >
          <Menu size={20} />
        </button>

        <div>
          <p className="text-body font-medium text-gray-900 leading-tight">
            {farm?.name ?? 'Agroware Mombasa'}
          </p>
          {farm && (
            <p className="text-caption text-gray-400 leading-tight">
              {farm.city}, {farm.state} &middot; {farm.totalArea.toLocaleString('pt-BR')} ha
            </p>
          )}
        </div>
      </div>

      {/* direita */}
      <div className="flex items-center gap-2">
        <button
          className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Notificações"
        >
          <Bell size={18} />
          {/* badge de contagem — populado nas telas */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-alert" aria-hidden="true" />
        </button>

        <div
          className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-caption font-medium select-none"
          title={producerName}
        >
          {initials || 'A'}
        </div>
      </div>
    </header>
  )
}
