import { useMemo, useState } from 'react'
import { Beef } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { formatWeight, formatArrobas } from '@/utils/format'
import { downloadCsv } from '@/utils/csv'
import ReportScreen, { ReportFilters, ReportKpi } from '@/components/report/ReportScreen.tsx'
import Select from '@/components/ui/Select.tsx'

const KG_PER_ARROBA = 30
const ORIGIN_LABEL: Record<string, string> = { comprado: 'Comprado', doacao: 'Doação', transferido: 'Transferido' }

export default function InventoryReport() {
  const farm    = useFarmStore((s) => s.farm)
  const bovines = useFarmStore((s) => s.bovines)
  const herds   = useFarmStore((s) => s.herds)

  const [herdId, setHerdId] = useState('')

  const herdName = (id?: string) => (id ? herds.find((h) => h.id === id)?.name : undefined)

  const rows = useMemo(() => bovines
    .filter((b) => (!b.propertyId || b.propertyId === farm?.id) && b.active !== false)
    .filter((b) => !herdId || b.herdId === herdId)
    .sort((a, b) => a.name.localeCompare(b.name)),
  [bovines, farm, herdId])

  const totalWeight = rows.reduce((s, b) => s + b.currentWeight, 0)
  const avgWeight = rows.length ? totalWeight / rows.length : 0

  const herdOptions = [
    { value: '', label: 'Todos os rebanhos' },
    ...herds.filter((h) => !farm || h.farmId === farm.id).map((h) => ({ value: h.id, label: h.name })),
  ]

  function handleExport() {
    const headers = ['Nome', 'Brinco', 'Raça', 'Sexo', 'Rebanho', 'Peso (kg)', 'Origem']
    const data = rows.map((b) => [
      b.name, b.earTag ?? '', b.breed, b.sex === 'M' ? 'Macho' : 'Fêmea',
      herdName(b.herdId) ?? 'Sem rebanho', String(b.currentWeight).replace('.', ','),
      ORIGIN_LABEL[b.origin] ?? b.origin,
    ])
    data.push(['', '', '', '', 'TOTAL', String(totalWeight).replace('.', ','), `${rows.length} cab.`])
    downloadCsv('inventario_animais', headers, data)
  }

  return (
    <ReportScreen title="Relatório de Inventário de Animais" subtitle={farm?.name} onExport={handleExport} exportDisabled={rows.length === 0}>
      <ReportFilters>
        <Select label="Rebanho" value={herdId} options={herdOptions} onChange={(e) => setHerdId(e.target.value)} />
      </ReportFilters>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <ReportKpi label="Cabeças" value={String(rows.length)} accent />
        <ReportKpi label="Peso médio" value={formatWeight(avgWeight)} />
        <ReportKpi label="Arrobas" value={formatArrobas(totalWeight / KG_PER_ARROBA)} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Animais ({rows.length})</p>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Beef size={24} className="text-gray-300" />
            <p className="text-caption text-gray-400">Nenhum animal no inventário.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {rows.map((b) => (
              <div key={b.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-caption text-gray-900 truncate">{b.name}{b.earTag ? ` · ${b.earTag}` : ''}</p>
                  <p className="text-[11px] text-gray-400 truncate">{b.breed} · {herdName(b.herdId) ?? 'Sem rebanho'}</p>
                </div>
                <span className="font-data text-caption text-gray-900 tabular-nums shrink-0">{formatWeight(b.currentWeight)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ReportScreen>
  )
}
