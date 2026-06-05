import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Bell, BellOff, CheckCheck, Check, X,
  AlertTriangle, AlertCircle, Info,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { useFarmStore } from '@/store/useFarmStore'
import { useNotifications } from '@/hooks/useNotifications'
import { formatRelativeDate } from '@/utils/format'
import { cn } from '@/utils/cn'
import Button from '@/components/ui/Button.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

const SEVERITY: Record<string, { icon: ReactNode; ring: string; dot: string }> = {
  critico:     { icon: <AlertCircle size={16} />,   ring: 'bg-alert-bg text-alert-dark',     dot: 'bg-alert' },
  atencao:     { icon: <AlertTriangle size={16} />, ring: 'bg-warning-bg text-warning-dark', dot: 'bg-warning' },
  informativo: { icon: <Info size={16} />,          ring: 'bg-blue-50 text-blue-700',        dot: 'bg-blue-500' },
}

export default function Notifications() {
  const navigate = useNavigate()
  const farm     = useFarmStore((s) => s.farm)
  const reconcile = useFarmStore((s) => s.reconcileNotifications)
  const markRead = useFarmStore((s) => s.markNotificationRead)
  const markDismissed = useFarmStore((s) => s.markNotificationDismissed)
  const markAllRead = useFarmStore((s) => s.markAllNotificationsRead)

  const [includeResolved, setIncludeResolved] = useState(false)

  // Recalcula as condições ao abrir a tela.
  useEffect(() => { reconcile() }, [reconcile])

  const items = useNotifications(includeResolved)
  const unread = items.filter((n) => !n.read).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-title font-bold text-gray-900">Notificações</h1>
          <p className="text-caption text-gray-400">
            {farm?.name}{unread > 0 ? ` · ${unread} não lida${unread !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        {unread > 0 && (
          <Button size="sm" variant="secondary" icon={<CheckCheck size={15} />} onClick={markAllRead}>
            Marcar lidas
          </Button>
        )}
      </div>

      {/* Toggle resolvidas */}
      <button
        onClick={() => setIncludeResolved((v) => !v)}
        className={cn(
          'mb-4 flex items-center gap-1.5 px-3 h-9 rounded-xl border text-button transition-colors',
          includeResolved ? 'border-primary text-primary bg-primary/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50',
        )}
      >
        <BellOff size={15} />
        {includeResolved ? 'Ocultar resolvidas' : 'Incluir resolvidas'}
      </button>

      {items.length === 0 ? (
        <EmptyState
          icon={<Bell size={28} />}
          title="Tudo em ordem"
          description="Nenhuma notificação ativa. Alertas de cocho, estoque, pesagem e eventos aparecem aqui."
        />
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {items.map((n) => {
              const sev = SEVERITY[n.severity] ?? SEVERITY.informativo
              return (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl border bg-white transition-colors',
                    n.read ? 'border-gray-100 opacity-70' : 'border-gray-200',
                    n.resolved && 'opacity-50',
                  )}
                >
                  <span className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', sev.ring)}>
                    {sev.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!n.read && !n.resolved && <span className={cn('w-2 h-2 rounded-full shrink-0', sev.dot)} />}
                      <p className="text-body font-medium text-gray-900 truncate">{n.title}</p>
                    </div>
                    <p className="text-caption text-gray-500">{n.message}</p>
                    <p className="text-[11px] text-gray-300 mt-0.5">
                      {n.createdAt ? formatRelativeDate(n.createdAt) : ''}
                      {n.resolved && ' · resolvida'}
                    </p>
                  </div>
                  {!n.resolved && (
                    <div className="flex items-center gap-1 shrink-0">
                      {!n.read && (
                        <button
                          onClick={() => markRead(n.id)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-primary hover:bg-primary/5 transition-colors"
                          aria-label="Marcar como lida"
                        >
                          <Check size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => markDismissed(n.id)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        aria-label="Dispensar"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
