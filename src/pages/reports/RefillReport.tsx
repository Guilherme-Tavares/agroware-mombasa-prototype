import { useMemo, useState } from 'react'
import { Droplets } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { formatDate } from '@/utils/format'
import { downloadCsv } from '@/utils/csv'
import ReportScreen, { ReportFilters, ReportKpi } from '@/components/report/ReportScreen.tsx'
import Input from '@/components/ui/Input.tsx'

interface Row { key: string; troughId: string; date: string; amount: number; feedId: string }
function startOfYear(): string { return `${new Date().getFullYear()}-01-01` }

export default function RefillReport() {
  const farm        = useFarmStore((s) => s.farm)
  const feedTroughs = useFarmStore((s) => s.feedTroughs)
  const divisions   = useFarmStore((s) => s.divisions)
  const feeds       = useFarmStore((s) => s.feeds)

  const today = new Date().toISOString().split('T')[0]
  const [from, setFrom] = useState(startOfYear())
  const [to, setTo]     = useState(today)

  const troughLabel = (id: string) => feedTroughs.find((t) => t.id === id)?.identifier ?? 'Cocho'
  const feedName = (id: string) => feeds.find((f) => f.id === id)?.name ?? ''
  const divIds = useMemo(() => new Set(divisions.filter((d) => !farm || d.farmId === farm.id).map((d) => d.id)), [divisions, farm])

  const rows = useMemo<Row[]>(() => {
    const all: Row[] = []
    feedTroughs.filter((t) => divIds.has(t.divisionId)).forEach((t) => {
      t.refillHistory.forEach((r, i) => all.push({ key: `${t.id}-${i}-${r.date}`, troughId: t.id, date: r.date, amount: r.amount, feedId: r.feedId }))
    })
    return all
      .filter((r) => (!from || r.date >= from) && (!to || r.date <= to))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [feedTroughs, divIds, from, to])

  const totalKg = rows.reduce((s, r) => s + r.amount, 0)

  function handleExport() {
    const headers = ['Data', 'Cocho', 'Alimento', 'Quantidade (kg)']
    const data = rows.map((r) => [formatDate(r.date), troughLabel(r.troughId), feedName(r.feedId), String(r.amount).replace('.', ',')])
    data.push(['', '', 'TOTAL', String(totalKg).replace('.', ',')])
    downloadCsv(`abastecimentos_${from}_a_${to}`, headers, data)
  }

  return (
    <ReportScreen title="Relatório de Abastecimentos" subtitle={farm?.name} onExport={handleExport} exportDisabled={rows.length === 0}>
      <ReportFilters>
        <div className="grid grid-cols-2 gap-3">
          <Input label="De" type="date" max={to} value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="Até" type="date" min={from} max={today} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </ReportFilters>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <ReportKpi label="Abastecimentos" value={String(rows.length)} accent />
        <ReportKpi label="Total" value={`${totalKg} kg`} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Abastecimentos ({rows.length})</p>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Droplets size={24} className="text-gray-300" />
            <p className="text-caption text-gray-400">Nenhum abastecimento no período.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {rows.map((r) => (
              <div key={r.key} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="text-caption text-gray-400 w-20 shrink-0">{formatDate(r.date)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-caption text-gray-900 truncate">{troughLabel(r.troughId)}</p>
                  <p className="text-[11px] text-gray-400 truncate">{feedName(r.feedId)}</p>
                </div>
                <span className="font-data text-caption text-gray-900 tabular-nums shrink-0">{r.amount} kg</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ReportScreen>
  )
}
