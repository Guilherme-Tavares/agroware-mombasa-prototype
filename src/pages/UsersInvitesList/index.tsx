import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Crown, Mail, UserCog } from 'lucide-react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess, accessLevelLabel } from '@/hooks/useAccess'
import Badge from '@/components/ui/Badge.tsx'
import Button from '@/components/ui/Button.tsx'

const INVITE_STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente', aceito: 'Aceito', recusado: 'Recusado', cancelado: 'Cancelado',
}

export default function UsersInvitesList() {
  const navigate = useNavigate()
  const farm     = useFarmStore((s) => s.farm)
  const activePropertyId = useFarmStore((s) => s.activePropertyId)
  const users          = useFarmStore((s) => s.users)
  const userProperties = useFarmStore((s) => s.userProperties)
  const invitations    = useFarmStore((s) => s.invitations)
  const { can }        = useAccess()

  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])
  const links = useMemo(
    () => userProperties.filter((up) => up.propertyId === activePropertyId && up.active !== false),
    [userProperties, activePropertyId],
  )
  const propInvites = useMemo(
    () => invitations.filter((i) => i.propertyId === activePropertyId),
    [invitations, activePropertyId],
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-title font-bold text-gray-900">Usuários e convites</h1>
          <p className="text-caption text-gray-400">{farm?.name} · somente leitura</p>
        </div>
        {can.manageUsers && (
          <Button size="sm" variant="secondary" icon={<UserCog size={15} />} onClick={() => navigate('/access')}>
            Gerenciar
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Usuários vinculados</p>
        {links.map((up) => {
          const u = usersById.get(up.userId)
          const owner = farm?.ownerId === up.userId
          return (
            <div key={up.id} className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-caption font-medium shrink-0">
                {(u?.name ?? '?').split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-body text-gray-900 truncate flex items-center gap-1.5">
                  {u?.name ?? 'Usuário'}
                  {owner && <Crown size={13} className="text-warning" aria-label="Dono" />}
                </p>
                <p className="text-caption text-gray-400 truncate">{u?.email ?? 'conta offline'}</p>
              </div>
              <Badge variant={up.accessLevel === 'produtor' ? 'ok' : up.accessLevel === 'colaborador' ? 'warning' : 'neutral'} size="sm">
                {accessLevelLabel(up.accessLevel)}
              </Badge>
            </div>
          )
        })}
      </div>

      {propInvites.length > 0 && (
        <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Convites</p>
          {propInvites.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3">
              <Mail size={15} className="text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-caption text-gray-900 truncate">
                  {usersById.get(inv.invitedUserId)?.name ?? inv.invitedEmail} · {accessLevelLabel(inv.offeredLevel)}
                </p>
              </div>
              <Badge
                variant={inv.status === 'aceito' ? 'ok' : inv.status === 'pendente' ? 'warning' : 'neutral'}
                size="sm"
              >
                {INVITE_STATUS_LABEL[inv.status] ?? inv.status}
              </Badge>
            </div>
          ))}
        </div>
      )}

      <p className="text-caption text-gray-400 mt-4 px-1">
        Esta é uma consulta. As alterações de acesso (convidar, mudar nível, remover,
        transferir posse) são feitas em Acesso e usuários.
      </p>
    </motion.div>
  )
}
