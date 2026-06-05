import { useMemo, useState } from 'react'
import { Tag } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { formatDate, formatCurrency, formatWeight, formatArrobas } from '@/utils/format'
import { downloadCsv } from '@/utils/csv'
import ReportScreen, { ReportFilters, ReportKpi } from '@/components/report/ReportScreen.tsx'
import Input from '@/components/ui/Input.tsx'

const KG_PER_ARROBA = 30
function startOfYear(): string { return `${new Date().getFullYear()}-01-01` }

export default function SalesReport() {
  const farm     = useFarmStore((s) => s.farm)
  const sales    = useFarmStore((s) => s.sales)
  const saleLots = useFarmStore((s) => s.saleLots)

  const today = new Date().toISOString().split('T')[0]
  const [from, setFrom] = useState(startOfYear())
  const [to, setTo]     = useState(today)

  const lotName = (id: string) => saleLots.find((l) => l.id === id)?.identifier ?? 'Lote'

  const rows = useMemo(() => sales
    .filter((s) => s.propertyId === farm?.id && s.active !== false)
    .filter((s) => (!from || s.date >= from) && (!to || s.date <= to))
    .sort((a, b) => b.date.localeCompare(a.date)),
  [sales, farm, from, to])

  const totalValue = rows.reduce((s, x) => s + (x.totalValue ?? 0), 0)
  const totalWeight = rows.reduce((s, x) => s + (x.totalWeightKg ?? 0), 0)

  function handleExport() {
    const headers = ['Data', 'Comprador', 'Lote', 'Peso total (kg)', 'Arrobas', 'Preço/@', 'Valor (R$)']
    const data = rows.map((s) => [
      formatDate(s.date), s.buyer ?? '', lotName(s.saleLotId),
      (s.totalWeightKg ?? 0).toFixed(1).replace('.', ','),
      ((s.totalWeightKg ?? 0) / KG_PER_ARROBA).toFixed(1).replace('.', ','),
      (s.pricePerArroba ?? 0).toFixed(2).replace('.', ','),
      (s.totalValue ?? 0).toFixed(2).replace('.', ','),
    ])
    data.push(['', '', '', '', '', 'TOTAL', totalValue.toFixed(2).replace('.', ',')])
    downloadCsv(`vendas_${from}_a_${to}`, headers, data)
  }

  return (
    <ReportScreen title="Relatório de Vendas de Gado" subtitle={farm?.name} onExport={handleExport} exportDisabled={rows.length === 0}>
      <ReportFilters>
        <div className="grid grid-cols-2 gap-3">
          <Input label="De" type="date" max={to} value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="Até" type="date" min={from} max={today} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </ReportFilters>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <ReportKpi label="Receita" value={formatCurrency(totalValue)} accent />
        <ReportKpi label="Vendas" value={String(rows.length)} />
        <ReportKpi label="Arrobas" value={formatArrobas(totalWeight / KG_PER_ARROBA)} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Vendas ({rows.length})</p>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Tag size={24} className="text-gray-300" />
            <p className="text-caption text-gray-400">Nenhuma venda no período.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {rows.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="text-caption text-gray-400 w-20 shrink-0">{formatDate(s.date)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-caption text-gray-900 truncate">{s.buyer || lotName(s.saleLotId)}</p>
                  <p className="text-[11px] text-gray-400">{s.totalWeightKg != null ? formatWeight(s.totalWeightKg) : '—'}</p>
                </div>
                <span className="font-data text-caption text-gray-900 tabular-nums shrink-0">{formatCurrency(s.totalValue ?? 0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ReportScreen>
  )
}
