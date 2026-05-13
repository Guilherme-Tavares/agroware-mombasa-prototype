import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
}

export default function Input({
  label,
  helperText,
  error,
  icon,
  iconPosition = 'left',
  id,
  className,
  required,
  disabled,
  ...props
}: InputProps) {
  const uid = useId()
  const inputId = id ?? `input-${uid}`
  const helperId = `${inputId}-helper`
  const hasError = Boolean(error)

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        {/* ícone posicionado dentro do campo */}
        {icon && iconPosition === 'left' && (
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}

        <input
          {...props}
          id={inputId}
          required={required}
          disabled={disabled}
          // placeholder=" " (espaço) ativa o seletor peer-placeholder-shown
          // para a label flutuar via CSS puro sem estado JS
          placeholder={props.placeholder ?? ' '}
          aria-invalid={hasError}
          aria-describedby={helperText || error ? helperId : undefined}
          className={cn(
            'peer block w-full rounded-input border bg-white text-body text-gray-900 transition-all duration-150 outline-none',
            'placeholder-transparent',
            label ? 'pb-2 pt-6 px-4' : 'py-3 px-4',
            icon && iconPosition === 'left' && 'pl-10',
            icon && iconPosition === 'right' && 'pr-10',
            hasError
              ? 'border-alert focus:border-alert focus:ring-1 focus:ring-alert'
              : 'border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary',
            'disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed',
            className,
          )}
        />

        {/* label flutuante — sobe quando focused ou com valor */}
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'pointer-events-none absolute left-4 text-xs font-medium transition-all duration-150',
              icon && iconPosition === 'left' && 'left-10',
              'top-2.5',
              hasError ? 'text-alert' : 'text-primary',
              // quando input está vazio E não focado: desce para o centro
              'peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal',
              hasError
                ? 'peer-placeholder-shown:text-gray-400'
                : 'peer-placeholder-shown:text-gray-400',
              // quando focado: volta ao topo
              'peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:font-medium',
              hasError ? 'peer-focus:text-alert' : 'peer-focus:text-primary',
            )}
          >
            {label}
            {required && <span className="ml-0.5 text-alert">*</span>}
          </label>
        )}

        {icon && iconPosition === 'right' && (
          <span
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>

      {(helperText || error) && (
        <p
          id={helperId}
          className={cn('text-caption', hasError ? 'text-alert' : 'text-gray-400')}
        >
          {error ?? helperText}
        </p>
      )}
    </div>
  )
}
