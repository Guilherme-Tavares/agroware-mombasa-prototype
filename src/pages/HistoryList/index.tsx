import { useState, type ComponentType } from 'react'

import { HistoryEmbeddedContext } from '@/components/consult/HistoryScreen.tsx'
import SegmentedTabs from '@/components/consult/SegmentedTabs.tsx'
import WeighingHistory from '@/pages/history/WeighingHistory.tsx'
import ApplicationHistory from '@/pages/history/ApplicationHistory.tsx'
import RefillHistory from '@/pages/history/RefillHistory.tsx'
import AllocationHistory from '@/pages/history/AllocationHistory.tsx'
import MembershipHistory from '@/pages/history/MembershipHistory.tsx'
import PassageHistory from '@/pages/history/PassageHistory.tsx'
import TransferHistory from '@/pages/history/TransferHistory.tsx'

// Tela unificada de Históricos: as abas selecionam o tipo e a tela de histórico
// correspondente é renderizada "embutida" (sem o próprio botão voltar). Reaproveita
// as telas existentes — nenhuma lógica de linha é duplicada.

const TABS = [
  { value: 'weighings', label: 'Pesagens' },
  { value: 'applications', label: 'Aplicações' },
  { value: 'refills', label: 'Abastecimentos' },
  { value: 'allocations', label: 'Lotações' },
  { value: 'memberships', label: 'Pertencimentos' },
  { value: 'passages', label: 'Passagens' },
  { value: 'transfers', label: 'Transferências' },
]

const SCREENS: Record<string, ComponentType> = {
  weighings: WeighingHistory,
  applications: ApplicationHistory,
  refills: RefillHistory,
  allocations: AllocationHistory,
  memberships: MembershipHistory,
  passages: PassageHistory,
  transfers: TransferHistory,
}

export default function HistoryList() {
  const [tab, setTab] = useState('weighings')
  const Screen = SCREENS[tab] ?? WeighingHistory

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <SegmentedTabs value={tab} onChange={setTab} options={TABS} />
      </div>
      <HistoryEmbeddedContext.Provider value={true}>
        <Screen />
      </HistoryEmbeddedContext.Provider>
    </div>
  )
}