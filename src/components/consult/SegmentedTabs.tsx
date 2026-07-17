import { cn } from '@/utils/cn'

export interface SegmentedTabOption {
  value: string
  label: string
}

interface SegmentedTabsProps {
  value: string
  onChange: (value: string) => void
  options: SegmentedTabOption[]
  className?: string
}

/**
 * Alternador de abas em "pílulas". Rola na horizontal quando há muitos itens
 * (ex.: os 7 tipos de histórico), então serve tanto para 2 opções (Estoques)
 * quanto para várias. Pensado para o slot `tabs` do ConsultScreen.
 */
export default function SegmentedTabs({ value, onChange, options, className }: SegmentedTabsProps) {
  return (
    <div className={cn('flex gap-1.5 overflow-x-auto pb-1 -mb-1', className)} role="tablist">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'shrink-0 px-3 h-9 rounded-xl text-button transition-colors border',
              active
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}