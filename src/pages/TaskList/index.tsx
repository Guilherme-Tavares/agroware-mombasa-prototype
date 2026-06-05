import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ListTodo, ChevronRight } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess } from '@/hooks/useAccess'
import { formatDate } from '@/utils/format'
import { TASK_STATUS_LABEL } from '@/utils/labels'
import { cn } from '@/utils/cn'
import ConsultScreen from '@/components/consult/ConsultScreen.tsx'
import Badge from '@/components/ui/Badge.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'

const STATUS_VARIANT: Record<string, 'warning' | 'ok' | 'neutral'> = {
  pendente: 'warning', concluida: 'ok', cancelada: 'neutral',
}

export default function TaskList() {
  const navigate = useNavigate()
  const farm     = useFarmStore((s) => s.farm)
  const tasks    = useFarmStore((s) => s.tasks)
  const { can }  = useAccess()

  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tasks
      .filter((t) => t.propertyId === farm?.id)
      .filter((t) => (showInactive ? true : t.active !== false))
      .filter((t) => !q || t.title.toLowerCase().includes(q))
      .sort((a, b) => (b.dueDate ?? '').localeCompare(a.dueDate ?? ''))
  }, [tasks, farm, showInactive, search])

  return (
    <ConsultScreen
      title="Agenda de tarefas"
      count={filtered.length}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Buscar por título..."
      showInactive={showInactive}
      onToggleInactive={() => setShowInactive((v) => !v)}
      onNew={can.writeHusbandry ? () => navigate('/tasks/new') : undefined}
      newLabel="Nova tarefa"
    >
      {filtered.length === 0 ? (
        <EmptyState
          icon={<ListTodo size={28} />}
          title={search ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa'}
          description={search ? 'Ajuste a busca ou inclua inativas.' : 'Adicione itens à agenda da propriedade.'}
          action={can.writeHusbandry ? { label: 'Nova tarefa', onClick: () => navigate('/tasks/new') } : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((t) => {
            const inactive = t.active === false
            return (
              <motion.button
                key={t.id}
                layout
                onClick={() => navigate(`/tasks/${t.id}`)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border bg-white text-left transition-colors',
                  inactive ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm',
                )}
              >
                <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <ListTodo size={18} className="text-gray-400" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-body font-medium text-gray-900 truncate', t.status === 'concluida' && 'line-through text-gray-400')}>{t.title}</p>
                  <p className="text-caption text-gray-400 truncate">{t.dueDate ? formatDate(t.dueDate) : 'Sem data'}</p>
                </div>
                <Badge variant={STATUS_VARIANT[t.status] ?? 'neutral'} size="sm">{TASK_STATUS_LABEL[t.status] ?? t.status}</Badge>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </motion.button>
            )
          })}
        </div>
      )}
    </ConsultScreen>
  )
}
