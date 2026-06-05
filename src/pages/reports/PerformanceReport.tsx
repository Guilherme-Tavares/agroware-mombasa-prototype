import { useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { formatGMD } from '@/utils/format'
import { downloadCsv } from '@/utils/csv'
import ReportScreen, { ReportFilters, ReportKpi } from '@/components/report/ReportScreen.tsx'
import Select from '@/components/ui/Select.tsx'
import Badge from '@/components/ui/Badge.tsx'

export default function PerformanceReport() {
  const farm     = useFarmStore((s) => s.farm)
  const passages = useFarmStore((s) => s.seasonPassages)
  const herds    = useFarmStore((s) => s.herds)
  const seasons  = useFarmStore((s) => s.seasons)

  const [herdId, setHerdId] = useState('')

  const herdName = (id: string) => herds.find((h) => h.id === id)?.name ?? 'Rebanho'
  const seasonName = (id: string) => seasons.find((s) => s.id === id)?.name ?? 'Temporada'
  const inProperty = useMemo(() => new Set(herds.filter((h) => !farm || h.farmId === farm.id).map((h) => h.id)), [herds, farm])

  const rows = useMemo(() => passages
    .filter((p) => inProperty.has(p.herdId))
    .filter((p) => !herdId || p.herdId === herdId)
    .sort((a, b) => b.gmd - a.gmd),
  [passages, inProperty, herdId])

  const avgGmd = rows.length ? rows.reduce((s, p) => s + p.gmd, 0) / rows.length : 0

  const herdOptions = [
    { value: '', label: 'Todos os rebanhos' },
    ...herds.filter((h) => !farm || h.farmId === farm.id).map((h) => ({ value: h.id, label: h.name })),
  ]

  function handleExport() {
    const headers = ['Rebanho', 'Temporada', 'Peso inicial', 'Peso final', 'Ganho (kg)', 'Dias', 'GMD (kg/dia)']
    const data = rows.map((p) => [
      herdName(p.herdId), seasonName(p.seasonId),
      String(p.initialWeight).replace('.', ','), String(p.finalWeight).replace('.', ','),
      String(p.finalWeight - p.initialWeight).replace('.', ','), String(p.days),
      p.gmd.toFixed(3).replace('.', ','),
    ])
    downloadCsv('desempenho_zootecnico', headers, data)
  }

  return (
    <ReportScreen title="Relatório de Desempenho Zootécnico" subtitle={farm?.name} onExport={handleExport} exportDisabled={rows.length === 0}>
      <ReportFilters>
        <Select label="Rebanho" value={herdId} options={herdOptions} onChange={(e) => setHerdId(e.target.value)} />
      </ReportFilters>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <ReportKpi label="GMD médio" value={formatGMD(avgGmd)} accent />
        <ReportKpi label="Passagens" value={String(rows.length)} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Passagens ({rows.length})</p>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <TrendingUp size={24} className="text-gray-300" />
            <p className="text-caption text-gray-400">Nenhuma passagem registrada.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {rows.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-caption text-gray-900 truncate">{herdName(p.herdId)}</p>
                  <p className="text-[11px] text-gray-400 truncate">{seasonName(p.seasonId)} · {p.initialWeight}→{p.finalWeight} kg · {p.days} dias</p>
                </div>
                <Badge variant="ok" size="sm">{formatGMD(p.gmd)}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </ReportScreen>
  )
}
