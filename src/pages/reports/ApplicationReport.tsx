import { useMemo, useState } from 'react'
import { Syringe } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { formatDate } from '@/utils/format'
import { downloadCsv } from '@/utils/csv'
import ReportScreen, { ReportFilters, ReportKpi } from '@/components/report/ReportScreen.tsx'
import Input from '@/components/ui/Input.tsx'
import Select from '@/components/ui/Select.tsx'

function startOfYear(): string { return `${new Date().getFullYear()}-01-01` }

export default function ApplicationReport() {
  const farm         = useFarmStore((s) => s.farm)
  const applications = useFarmStore((s) => s.medicationApplications)
  const bovines      = useFarmStore((s) => s.bovines)
  const medications  = useFarmStore((s) => s.medications)

  const today = new Date().toISOString().split('T')[0]
  const [from, setFrom] = useState(startOfYear())
  const [to, setTo]     = useState(today)
  const [medId, setMedId] = useState('')

  const bovineName = (id: string) => bovines.find((b) => b.id === id)?.name ?? 'Bovino'
  const medName = (id: string) => medications.find((m) => m.id === id)?.commercialName ?? 'Medicamento'
  const inProperty = useMemo(
    () => new Set(bovines.filter((b) => !b.propertyId || b.propertyId === farm?.id).map((b) => b.id)),
    [bovines, farm],
  )

  const rows = useMemo(() => applications
    .filter((a) => inProperty.has(a.bovineId) && a.active !== false)
    .filter((a) => (!from || a.appliedAt.slice(0, 10) >= from) && (!to || a.appliedAt.slice(0, 10) <= to))
    .filter((a) => !medId || a.medicationId === medId)
    .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt)),
  [applications, inProperty, from, to, medId])

  const medOptions = [
    { value: '', label: 'Todos os medicamentos' },
    ...medications.filter((m) => m.propertyId === farm?.id).map((m) => ({ value: m.id, label: m.commercialName })),
  ]

  function handleExport() {
    const headers = ['Data', 'Bovino', 'Medicamento', 'Dose', 'Unidade']
    const data = rows.map((a) => [
      formatDate(a.appliedAt.slice(0, 10)), bovineName(a.bovineId), medName(a.medicationId),
      String(a.dose).replace('.', ','), a.doseUnit,
    ])
    downloadCsv(`aplicacoes_${from}_a_${to}`, headers, data)
  }

  return (
    <ReportScreen title="Relatório de Aplicações" subtitle={farm?.name} onExport={handleExport} exportDisabled={rows.length === 0}>
      <ReportFilters>
        <div className="grid grid-cols-2 gap-3">
          <Input label="De" type="date" max={to} value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="Até" type="date" min={from} max={today} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Select label="Medicamento" value={medId} options={medOptions} onChange={(e) => setMedId(e.target.value)} />
      </ReportFilters>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <ReportKpi label="Aplicações" value={String(rows.length)} accent />
        <ReportKpi label="Animais" value={String(new Set(rows.map((r) => r.bovineId)).size)} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Aplicações ({rows.length})</p>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Syringe size={24} className="text-gray-300" />
            <p className="text-caption text-gray-400">Nenhuma aplicação no período.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {rows.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="text-caption text-gray-400 w-20 shrink-0">{formatDate(a.appliedAt.slice(0, 10))}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-caption text-gray-900 truncate">{bovineName(a.bovineId)}</p>
                  <p className="text-[11px] text-gray-400 truncate">{medName(a.medicationId)}</p>
                </div>
                <span className="font-data text-caption text-gray-900 tabular-nums shrink-0">{a.dose} {a.doseUnit}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ReportScreen>
  )
}
