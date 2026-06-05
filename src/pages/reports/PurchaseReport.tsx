import { useMemo, useState } from 'react'
import { ShoppingCart } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { formatDate } from '@/utils/format'
import { downloadCsv } from '@/utils/csv'
import ReportScreen, { ReportFilters, ReportKpi } from '@/components/report/ReportScreen.tsx'
import Select from '@/components/ui/Select.tsx'
import Input from '@/components/ui/Input.tsx'
import Badge from '@/components/ui/Badge.tsx'

interface Row {
  id: string
  date: string
  name: string
  kind: 'Medicamento' | 'Alimento'
  group: 'sanitario' | 'alimenticio'
  quantity: number
  unit: string
}

function startOfYear(): string { return `${new Date().getFullYear()}-01-01` }

export default function PurchaseReport() {
  const farm        = useFarmStore((s) => s.farm)
  const medStocks   = useFarmStore((s) => s.medicationStocks)
  const feedStocks  = useFarmStore((s) => s.feedStocks)
  const medications = useFarmStore((s) => s.medications)
  const feeds       = useFarmStore((s) => s.feeds)

  const today = new Date().toISOString().split('T')[0]
  const [from, setFrom] = useState(startOfYear())
  const [to, setTo]     = useState(today)
  const [group, setGroup] = useState('')

  const all = useMemo<Row[]>(() => {
    const med: Row[] = medStocks.filter((s) => s.propertyId === farm?.id).map((s) => ({
      id: s.id, date: s.entryDate, kind: 'Medicamento', group: 'sanitario',
      name: medications.find((m) => m.id === s.medicationId)?.commercialName ?? 'Medicamento',
      quantity: s.quantity, unit: s.unit,
    }))
    const fd: Row[] = feedStocks.filter((s) => s.propertyId === farm?.id).map((s) => ({
      id: s.id, date: s.entryDate, kind: 'Alimento', group: 'alimenticio',
      name: feeds.find((f) => f.id === s.feedId)?.name ?? 'Alimento',
      quantity: s.quantity, unit: s.unit,
    }))
    return [...med, ...fd]
  }, [medStocks, feedStocks, medications, feeds, farm])

  const rows = useMemo(() => all
    .filter((r) => (!from || r.date >= from) && (!to || r.date <= to))
    .filter((r) => !group || r.group === group)
    .sort((a, b) => b.date.localeCompare(a.date)),
  [all, from, to, group])

  const sanitario = rows.filter((r) => r.group === 'sanitario').length
  const alimenticio = rows.filter((r) => r.group === 'alimenticio').length

  function handleExport() {
    const headers = ['Data', 'Insumo', 'Tipo', 'Grupo', 'Quantidade', 'Unidade']
    const data = rows.map((r) => [
      formatDate(r.date), r.name, r.kind,
      r.group === 'sanitario' ? 'Insumo sanitário' : 'Insumo alimentício',
      String(r.quantity).replace('.', ','), r.unit,
    ])
    downloadCsv(`compras_insumos_${from}_a_${to}`, headers, data)
  }

  return (
    <ReportScreen title="Relatório de Compras de Insumos" subtitle={farm?.name} onExport={handleExport} exportDisabled={rows.length === 0}>
      <ReportFilters>
        <div className="grid grid-cols-2 gap-3">
          <Input label="De" type="date" max={to} value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="Até" type="date" min={from} max={today} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Select
          label="Grupo"
          value={group}
          options={[
            { value: '', label: 'Todos' },
            { value: 'alimenticio', label: 'Insumo alimentício' },
            { value: 'sanitario', label: 'Insumo sanitário' },
          ]}
          onChange={(e) => setGroup(e.target.value)}
        />
      </ReportFilters>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <ReportKpi label="Entradas" value={String(rows.length)} accent />
        <ReportKpi label="Sanitário" value={String(sanitario)} />
        <ReportKpi label="Alimentício" value={String(alimenticio)} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Entradas ({rows.length})</p>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <ShoppingCart size={24} className="text-gray-300" />
            <p className="text-caption text-gray-400">Nenhuma compra no período.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="text-caption text-gray-400 w-20 shrink-0">{formatDate(r.date)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-caption text-gray-900 truncate">{r.name}</p>
                  <Badge variant="neutral" size="sm">{r.kind}</Badge>
                </div>
                <span className="font-data text-caption text-gray-900 tabular-nums shrink-0">{r.quantity} {r.unit}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ReportScreen>
  )
}
