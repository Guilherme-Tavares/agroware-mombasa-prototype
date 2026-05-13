import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface CardProps {
  children?: ReactNode
  header?: ReactNode
  footer?: ReactNode
  interactive?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export default function Card({
  children,
  header,
  footer,
  interactive = false,
  padding = 'md',
  className,
  onClick,
}: CardProps) {
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      onClick={onClick}
      className={cn(
        'bg-white border border-gray-200 rounded-card shadow-card',
        interactive &&
          'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-floating',
        onClick && 'w-full text-left',
        className,
      )}
    >
      {header && (
        <div
          className={cn(
            'border-b border-gray-200',
            padding !== 'none' && paddingClasses[padding],
          )}
        >
          {header}
        </div>
      )}
      {children && (
        <div className={cn(padding !== 'none' && paddingClasses[padding])}>
          {children}
        </div>
      )}
      {footer && (
        <div
          className={cn(
            'border-t border-gray-200 bg-gray-50 rounded-b-card',
            padding !== 'none' && paddingClasses[padding],
          )}
        >
          {footer}
        </div>
      )}
    </Tag>
  )
}
