import { useMemo, useState } from 'react'
import { Receipt } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { formatDate, formatCurrency } from '@/utils/format'
import { EXPENSE_GROUP_LABEL } from '@/utils/labels'
import { downloadCsv } from '@/utils/csv'
import ReportScreen, { ReportFilters, ReportKpi } from '@/components/report/ReportScreen.tsx'
import Select from '@/components/ui/Select.tsx'
import Input from '@/components/ui/Input.tsx'
import Badge from '@/components/ui/Badge.tsx'

function startOfYear(): string {
  return `${new Date().getFullYear()}-01-01`
}

export default function ExpenseReport() {
  const farm       = useFarmStore((s) => s.farm)
  const expenses   = useFarmStore((s) => s.expenses)
  const categories = useFarmStore((s) => s.expenseCategories)

  const today = new Date().toISOString().split('T')[0]
  const [from, setFrom]   = useState(startOfYear())
  const [to, setTo]       = useState(today)
  const [group, setGroup] = useState('')

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const rows = useMemo(() => {
    return expenses
      .filter((e) => e.propertyId === farm?.id && e.active !== false)
      .filter((e) => (!from || e.date >= from) && (!to || e.date <= to))
      .filter((e) => !group || catById.get(e.categoryId)?.group === group)
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [expenses, farm, from, to, group, catById])

  const total = rows.reduce((s, e) => s + e.amount, 0)

  // Quebra por grupo (alimenta relatórios e o resumo).
  const byGroup = useMemo(() => {
    const map = new Map<string, number>()
    rows.forEach((e) => {
      const g = catById.get(e.categoryId)?.group ?? 'outro'
      map.set(g, (map.get(g) ?? 0) + e.amount)
    })
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [rows, catById])

  const GROUP_OPTIONS = [
    { value: '', label: 'Todos os grupos' },
    ...Object.entries(EXPENSE_GROUP_LABEL).map(([value, label]) => ({ value, label })),
  ]

  function handleExport() {
    const headers = ['Data', 'Descrição', 'Categoria', 'Grupo', 'Valor (R$)']
    const data = rows.map((e) => {
      const cat = catById.get(e.categoryId)
      return [
        formatDate(e.date),
        e.description,
        cat?.name ?? '',
        cat ? (EXPENSE_GROUP_LABEL[cat.group] ?? cat.group) : '',
        e.amount.toFixed(2).replace('.', ','),
      ]
    })
    data.push(['', '', '', 'TOTAL', total.toFixed(2).replace('.', ',')])
    downloadCsv(`despesas_${from}_a_${to}`, headers, data)
  }

  return (
    <ReportScreen
      title="Relatório de Despesas"
      subtitle={farm?.name}
      onExport={handleExport}
      exportDisabled={rows.length === 0}
    >
      <ReportFilters>
        <div className="grid grid-cols-2 gap-3">
          <Input label="De" type="date" max={to} value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="Até" type="date" min={from} max={today} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Select label="Grupo" value={group} options={GROUP_OPTIONS} onChange={(e) => setGroup(e.target.value)} />
      </ReportFilters>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <ReportKpi label="Total" value={formatCurrency(total)} accent />
        <ReportKpi label="Lançamentos" value={String(rows.length)} />
      </div>

      {/* Quebra por grupo */}
      {byGroup.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Por grupo</p>
          <div className="flex flex-col">
            {byGroup.map(([g, v]) => (
              <div key={g} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-caption text-gray-600">{EXPENSE_GROUP_LABEL[g] ?? g}</span>
                <span className="font-data text-caption text-gray-900 tabular-nums">{formatCurrency(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Lançamentos ({rows.length})
        </p>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Receipt size={24} className="text-gray-300" />
            <p className="text-caption text-gray-400">Nenhuma despesa no período.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {rows.map((e) => {
              const cat = catById.get(e.categoryId)
              return (
                <div key={e.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                  <span className="text-caption text-gray-400 w-20 shrink-0">{formatDate(e.date)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-caption text-gray-900 truncate">{e.description}</p>
                    {cat && <Badge variant="neutral" size="sm">{EXPENSE_GROUP_LABEL[cat.group] ?? cat.group}</Badge>}
                  </div>
                  <span className="font-data text-caption text-gray-900 tabular-nums shrink-0">{formatCurrency(e.amount)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ReportScreen>
  )
}
