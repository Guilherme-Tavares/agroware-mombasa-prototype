import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Bell, ChevronDown, Check, MapPin } from 'lucide-react'
import { useFarmStore } from '@/store/useFarmStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useUIStore } from '@/store/useUIStore'
import { useAccess, accessLevelLabel } from '@/hooks/useAccess'
import { cn } from '@/utils/cn'

export default function Header() {
  const navigate = useNavigate()
  const farm = useFarmStore((s) => s.farm)
  const farms = useFarmStore((s) => s.farms)
  const activePropertyId = useFarmStore((s) => s.activePropertyId)
  const setActiveProperty = useFarmStore((s) => s.setActiveProperty)
  const producerName = useAuthStore((s) => s.producerName)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const { level } = useAccess()

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  // Fecha o seletor ao clicar fora.
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

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

        {/* Seletor de propriedade ativa (RF06) */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => farms.length > 1 && setOpen((o) => !o)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-2 py-1 -ml-2 text-left transition-colors',
              farms.length > 1 ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-default',
            )}
            aria-haspopup={farms.length > 1 ? 'listbox' : undefined}
            aria-expanded={farms.length > 1 ? open : undefined}
          >
            <div>
              <p className="text-body font-medium text-gray-900 leading-tight flex items-center gap-1.5">
                {farm?.name ?? 'Agroware Mombasa'}
                {farms.length > 1 && <ChevronDown size={14} className="text-gray-400" />}
              </p>
              {farm && (
                <p className="text-caption text-gray-400 leading-tight">
                  {farm.city}, {farm.state} &middot; {farm.totalArea.toLocaleString('pt-BR')} ha
                </p>
              )}
            </div>
          </button>

          {open && farms.length > 1 && (
            <div
              role="listbox"
              className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl border border-gray-200 shadow-floating p-1.5 z-30"
            >
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Propriedade ativa
              </p>
              {farms.map((f) => {
                const isActive = f.id === activePropertyId
                return (
                  <button
                    key={f.id}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => { setActiveProperty(f.id); setOpen(false) }}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors',
                      isActive ? 'bg-primary-bg' : 'hover:bg-gray-50',
                    )}
                  >
                    <MapPin size={14} className={isActive ? 'text-primary' : 'text-gray-400'} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-body text-gray-900 truncate">{f.name}</span>
                      <span className="block text-caption text-gray-400 truncate">{f.city}, {f.state}</span>
                    </span>
                    {isActive && <Check size={15} className="text-primary shrink-0" />}
                  </button>
                )
              })}
            </div>
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
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-alert" aria-hidden="true" />
        </button>

        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 rounded-full pl-1 pr-0.5 py-0.5 hover:bg-gray-100 transition-colors"
          title={`${producerName} · ${accessLevelLabel(level)}`}
          aria-label="Perfil"
        >
          <span className="hidden sm:block text-caption text-gray-400">{accessLevelLabel(level)}</span>
          <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-caption font-medium select-none">
            {initials || 'A'}
          </span>
        </button>
      </div>
    </header>
  )
}
