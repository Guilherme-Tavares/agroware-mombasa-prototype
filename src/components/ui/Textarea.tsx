import { useId } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helperText?: string
  error?: string
  rows?: number
}

export default function Textarea({
  label,
  helperText,
  error,
  rows = 4,
  id,
  className,
  required,
  disabled,
  ...props
}: TextareaProps) {
  const uid = useId()
  const textareaId = id ?? `textarea-${uid}`
  const helperId = `${textareaId}-helper`
  const hasError = Boolean(error)

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <textarea
          {...props}
          id={textareaId}
          rows={rows}
          required={required}
          disabled={disabled}
          placeholder={props.placeholder ?? ' '}
          aria-invalid={hasError}
          aria-describedby={helperText || error ? helperId : undefined}
          className={cn(
            'peer block w-full resize-y rounded-input border bg-white text-body text-gray-900 transition-all duration-150 outline-none',
            'placeholder-transparent',
            label ? 'pb-3 pt-6 px-4' : 'py-3 px-4',
            hasError
              ? 'border-alert focus:border-alert focus:ring-1 focus:ring-alert'
              : 'border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary',
            'disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed',
            className,
          )}
        />

        {label && (
          <label
            htmlFor={textareaId}
            className={cn(
              'pointer-events-none absolute left-4 top-2.5 text-xs font-medium transition-all duration-150',
              hasError ? 'text-alert' : 'text-primary',
              'peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-gray-400',
              'peer-focus:top-2.5 peer-focus:text-xs peer-focus:font-medium',
              hasError ? 'peer-focus:text-alert' : 'peer-focus:text-primary',
            )}
          >
            {label}
            {required && <span className="ml-0.5 text-alert">*</span>}
          </label>
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
