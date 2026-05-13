import { useId } from 'react'
import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: SelectOption[]
  placeholder?: string
  helperText?: string
  error?: string
}

export default function Select({
  label,
  options,
  placeholder = 'Selecione...',
  helperText,
  error,
  id,
  className,
  required,
  disabled,
  ...props
}: SelectProps) {
  const uid = useId()
  const selectId = id ?? `select-${uid}`
  const helperId = `${selectId}-helper`
  const hasError = Boolean(error)

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={selectId}
          className={cn(
            'text-caption font-medium',
            hasError ? 'text-alert' : 'text-gray-600',
          )}
        >
          {label}
          {required && <span className="ml-0.5 text-alert">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          {...props}
          id={selectId}
          required={required}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={helperText || error ? helperId : undefined}
          className={cn(
            'block w-full appearance-none rounded-input border bg-white py-2.5 pl-4 pr-10 text-body text-gray-900 transition-all duration-150 outline-none',
            'min-h-[44px]',
            hasError
              ? 'border-alert focus:border-alert focus:ring-1 focus:ring-alert'
              : 'border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary',
            'disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed',
            className,
          )}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
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
