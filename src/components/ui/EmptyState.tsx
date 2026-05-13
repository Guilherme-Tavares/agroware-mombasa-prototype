import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import Button from './Button'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'ghost'
  }
  className?: string
}

export default function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-16 px-6 text-center',
        className,
      )}
    >
      {icon && (
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400">
          {icon}
        </div>
      )}

      <div className="flex flex-col gap-1.5 max-w-xs">
        <p className="text-h2 text-gray-900">{title}</p>
        {description && (
          <p className="text-body text-gray-400">{description}</p>
        )}
      </div>

      {action && (
        <Button
          variant={action.variant ?? 'primary'}
          onClick={action.onClick}
          size="md"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
