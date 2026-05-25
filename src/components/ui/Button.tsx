import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-dark active:bg-primary-dark focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  secondary:
    'bg-white border border-primary text-primary hover:bg-primary-bg active:bg-primary-bg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  ghost:
    'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2',
  danger:
    'bg-alert text-white hover:bg-alert-dark active:bg-alert-dark focus-visible:ring-2 focus-visible:ring-alert focus-visible:ring-offset-2',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-11 px-4 text-button gap-2',
  lg: 'h-12 px-6 text-sm gap-2',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = 'left',
  type = 'button',
  children,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      {...props}
      type={type}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center rounded-input font-medium transition-all duration-150 outline-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
    >
      {loading && (
        <Loader2
          size={size === 'sm' ? 14 : 16}
          className="animate-spin shrink-0"
          aria-hidden="true"
        />
      )}
      {!loading && icon && iconPosition === 'left' && (
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      {children && <span>{children}</span>}
      {!loading && icon && iconPosition === 'right' && (
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
    </button>
  )
}
