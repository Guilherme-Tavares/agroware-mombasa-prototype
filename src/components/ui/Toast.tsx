import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useUIStore } from '@/store/useUIStore'
import type { Toast as ToastType } from '@/store/useUIStore'

// ─── Item individual ──────────────────────────────────────────────────────────

const toastConfig = {
  success: {
    icon: CheckCircle2,
    classes: 'bg-white border-ok text-ok',
    titleClass: 'text-gray-900',
  },
  error: {
    icon: AlertCircle,
    classes: 'bg-white border-alert text-alert',
    titleClass: 'text-gray-900',
  },
  warning: {
    icon: AlertTriangle,
    classes: 'bg-white border-warning text-warning-dark',
    titleClass: 'text-gray-900',
  },
  info: {
    icon: Info,
    classes: 'bg-white border-water text-water',
    titleClass: 'text-gray-900',
  },
}

function ToastItem({ toast }: { toast: ToastType }) {
  const removeToast = useUIStore((s) => s.removeToast)
  const { icon: Icon, classes, titleClass } = toastConfig[toast.type]

  useEffect(() => {
    const timer = setTimeout(
      () => removeToast(toast.id),
      toast.duration ?? 3000,
    )
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, removeToast])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.9 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
      className={cn(
        'flex items-start gap-3 w-80 max-w-[calc(100vw-2rem)] px-4 py-3',
        'rounded-card border-l-4 shadow-floating pointer-events-auto',
        classes,
      )}
      role="alert"
      aria-live="polite"
    >
      <Icon size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
      <p className={cn('flex-1 text-body', titleClass)}>{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 p-0.5 rounded text-current opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dispensar notificação"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}

// ─── Container (renderizado no App) ──────────────────────────────────────────

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts)

  return createPortal(
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      aria-label="Notificações"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  )
}
