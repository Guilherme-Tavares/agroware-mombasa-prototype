import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Bell, Scale, Sun, Globe, MapPin } from 'lucide-react'
import type { ReactNode } from 'react'

import { useFarmStore } from '@/store/useFarmStore'
import { useToast } from '@/hooks/useToast'
import Select from '@/components/ui/Select.tsx'
import type { Theme, WeightUnit } from '@/types/domain'

function Row({ icon, title, desc, control }: {
  icon: ReactNode; title: string; desc: string; control: ReactNode
}) {
  return (
    <div className="p-5 flex items-center gap-4">
      <span className="w-9 h-9 rounded-lg bg-gray-50 text-gray-500 flex items-center justify-center shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-body font-medium text-gray-900">{title}</p>
        <p className="text-caption text-gray-400">{desc}</p>
      </div>
      <div className="w-44 shrink-0">{control}</div>
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const toast    = useToast()
  const config   = useFarmStore((s) => s.userConfig)
  const farms    = useFarmStore((s) => s.farms)
  const updateUserConfig  = useFarmStore((s) => s.updateUserConfig)
  const setActiveProperty = useFarmStore((s) => s.setActiveProperty)

  function set<K extends 'theme' | 'language' | 'weightUnit' | 'alertsEnabled' | 'defaultPropertyId'>(
    key: K, value: NonNullable<typeof config>[K],
  ) {
    updateUserConfig({ [key]: value })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="max-w-xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-title font-bold text-gray-900">Configurações</h1>
          <p className="text-caption text-gray-400">Preferências do aplicativo</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
        <Row
          icon={<MapPin size={16} />}
          title="Propriedade padrão"
          desc="Abre nesta propriedade ao entrar"
          control={
            <Select
              value={config?.defaultPropertyId ?? ''}
              options={farms.map((f) => ({ value: f.id, label: f.name }))}
              placeholder="Selecione..."
              onChange={(e) => {
                set('defaultPropertyId', e.target.value)
                setActiveProperty(e.target.value)
                toast.success('Propriedade padrão atualizada.')
              }}
            />
          }
        />
        <Row
          icon={<Scale size={16} />}
          title="Unidade de peso"
          desc="Exibição de pesos e ganho"
          control={
            <Select
              value={config?.weightUnit ?? 'kg'}
              options={[
                { value: 'kg', label: 'Quilogramas (kg)' },
                { value: 'arroba', label: 'Arrobas (@)' },
              ]}
              onChange={(e) => set('weightUnit', e.target.value as WeightUnit)}
            />
          }
        />
        <Row
          icon={<Sun size={16} />}
          title="Tema"
          desc="Aparência da interface"
          control={
            <Select
              value={config?.theme ?? 'claro'}
              options={[
                { value: 'claro', label: 'Claro' },
                { value: 'escuro', label: 'Escuro' },
              ]}
              onChange={(e) => set('theme', e.target.value as Theme)}
            />
          }
        />
        <Row
          icon={<Globe size={16} />}
          title="Idioma"
          desc="Idioma da interface"
          control={
            <Select
              value={config?.language ?? 'pt-BR'}
              options={[{ value: 'pt-BR', label: 'Português (BR)' }]}
              onChange={(e) => set('language', e.target.value)}
            />
          }
        />
        <Row
          icon={<Bell size={16} />}
          title="Alertas"
          desc="Notificações de cocho, estoque e pesagem"
          control={
            <div className="flex justify-end">
              <button
                type="button"
                role="switch"
                aria-checked={config?.alertsEnabled ?? true}
                onClick={() => set('alertsEnabled', !(config?.alertsEnabled ?? true))}
                className={[
                  'inline-flex h-6 w-11 rounded-full transition-colors items-center px-0.5',
                  (config?.alertsEnabled ?? true) ? 'bg-primary' : 'bg-gray-300',
                ].join(' ')}
              >
                <span
                  className={[
                    'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                    (config?.alertsEnabled ?? true) ? 'translate-x-5' : 'translate-x-0',
                  ].join(' ')}
                />
              </button>
            </div>
          }
        />
      </div>

      <p className="text-caption text-gray-400 mt-4 px-1">
        Algumas preferências (tema escuro, unidade em arroba) são aplicadas
        progressivamente nas telas conforme a evolução do protótipo.
      </p>
    </motion.div>
  )
}
