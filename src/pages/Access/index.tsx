import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, UserPlus, Crown, X, Check, Mail, ShieldAlert, Repeat,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { useFarmStore } from '@/store/useFarmStore'
import { useAccess, accessLevelLabel } from '@/hooks/useAccess'
import { useToast } from '@/hooks/useToast'
import Button from '@/components/ui/Button.tsx'
import Select from '@/components/ui/Select.tsx'
import Badge from '@/components/ui/Badge.tsx'
import Modal from '@/components/ui/Modal.tsx'
import type { AccessLevel } from '@/types/domain'

const LEVEL_OPTIONS = [
  { value: 'produtor', label: 'Produtor' },
  { value: 'colaborador', label: 'Colaborador' },
  { value: 'visitante', label: 'Visitante' },
]

function SectionHeader({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{children}</p>
      {action}
    </div>
  )
}

export default function Access() {
  const navigate = useNavigate()
  const toast    = useToast()

  const farm             = useFarmStore((s) => s.farm)
  const farms            = useFarmStore((s) => s.farms)
  const activePropertyId = useFarmStore((s) => s.activePropertyId)
  const users            = useFarmStore((s) => s.users)
  const userProperties   = useFarmStore((s) => s.userProperties)
  const invitations      = useFarmStore((s) => s.invitations)
  const currentUserId    = useFarmStore((s) => s.currentUserId)

  const setCurrentUser   = useFarmStore((s) => s.setCurrentUser)
  const inviteUser       = useFarmStore((s) => s.inviteUser)
  const cancelInvitation = useFarmStore((s) => s.cancelInvitation)
  const respondInvitation = useFarmStore((s) => s.respondInvitation)
  const updateAccessLevel = useFarmStore((s) => s.updateAccessLevel)
  const removeUserAccess = useFarmStore((s) => s.removeUserAccess)
  const transferOwnership = useFarmStore((s) => s.transferOwnership)

  const { user, level, isOwner, can } = useAccess()
  const isOnline = Boolean(user?.online || user?.email)

  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])

  const links = useMemo(
    () => userProperties.filter((up) => up.propertyId === activePropertyId && up.active !== false),
    [userProperties, activePropertyId],
  )
  const sentPending = useMemo(
    () => invitations.filter((i) => i.propertyId === activePropertyId && i.status === 'pendente'),
    [invitations, activePropertyId],
  )
  const pendingForMe = useMemo(
    () => invitations.filter((i) => i.invitedUserId === currentUserId && i.status === 'pendente'),
    [invitations, currentUserId],
  )
  const invitableUsers = useMemo(() => {
    const linkedIds = new Set(links.map((l) => l.userId))
    const pendingIds = new Set(sentPending.map((i) => i.invitedUserId))
    return users.filter((u) => u.online && !linkedIds.has(u.id) && !pendingIds.has(u.id))
  }, [users, links, sentPending])

  // ── Convite (RF08) ──
  const [inviteUserId, setInviteUserId] = useState('')
  const [inviteLevel, setInviteLevel]   = useState<AccessLevel>('colaborador')

  function handleInvite() {
    if (!inviteUserId || !activePropertyId || !currentUserId) return
    const invited = usersById.get(inviteUserId)
    inviteUser({
      id: crypto.randomUUID(),
      propertyId: activePropertyId,
      inviterUserId: currentUserId,
      invitedUserId: inviteUserId,
      invitedEmail: invited?.email ?? undefined,
      offeredLevel: inviteLevel,
      status: 'pendente',
      active: true,
    })
    setInviteUserId('')
    toast.success(`Convite enviado a ${invited?.name ?? 'usuário'} (simulado).`)
  }

  // ── Transferência de posse (RF11) ──
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferTo, setTransferTo]     = useState('')
  const transferCandidates = useMemo(
    () => links
      .filter((l) => l.userId !== farm?.ownerId)
      .map((l) => usersById.get(l.userId))
      .filter((u): u is NonNullable<typeof u> => Boolean(u && u.online)),
    [links, farm, usersById],
  )

  function handleTransfer() {
    if (!transferTo || !activePropertyId) return
    transferOwnership(activePropertyId, transferTo)
    setTransferOpen(false)
    const name = usersById.get(transferTo)?.name ?? 'novo dono'
    setTransferTo('')
    toast.success(`Posse transferida para ${name}.`)
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
          <h1 className="text-title font-bold text-gray-900">Acesso e usuários</h1>
          <p className="text-caption text-gray-400">{farm?.name} · seu nível: {accessLevelLabel(level)}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Switcher de demonstração */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
          <SectionHeader>Atuar como (demonstração)</SectionHeader>
          <p className="text-caption text-gray-400">
            Alterne o usuário corrente para ver o sistema sob cada nível de acesso. Sem envio real de e-mail.
          </p>
          <Select
            value={currentUserId ?? ''}
            options={users.map((u) => ({
              value: u.id,
              label: `${u.name}${u.online ? '' : ' (offline)'}`,
            }))}
            onChange={(e) => setCurrentUser(e.target.value)}
          />
        </div>

        {/* Convites para o usuário corrente (RF09) */}
        <AnimatePresence>
          {pendingForMe.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white rounded-2xl border border-primary/30 shadow-sm p-5 flex flex-col gap-3">
                <SectionHeader>Convites para você</SectionHeader>
                {pendingForMe.map((inv) => {
                  const prop = farms.find((f) => f.id === inv.propertyId)
                  return (
                    <div key={inv.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2 min-w-0">
                        <Mail size={15} className="text-primary mt-0.5 shrink-0" />
                        <p className="text-caption text-gray-600">
                          Convite para <strong className="text-gray-900">{prop?.name ?? 'propriedade'}</strong> como{' '}
                          <strong>{accessLevelLabel(inv.offeredLevel)}</strong>
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => { respondInvitation(inv.id, false); toast.info('Convite recusado.') }}>
                          Recusar
                        </Button>
                        <Button size="sm" icon={<Check size={14} />} onClick={() => { respondInvitation(inv.id, true); toast.success('Convite aceito.') }}>
                          Aceitar
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gestão (somente produtor) */}
        {can.manageUsers ? (
          <>
            {/* Usuários vinculados (RF10) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
              <SectionHeader>Usuários da propriedade</SectionHeader>
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
                    {owner ? (
                      <Badge variant="ok" size="sm">Dono · Produtor</Badge>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Select
                          value={up.accessLevel}
                          options={LEVEL_OPTIONS}
                          onChange={(e) => updateAccessLevel(up.id, e.target.value as AccessLevel)}
                          className="!min-h-0 !py-1.5 text-caption w-36"
                        />
                        <button
                          onClick={() => { removeUserAccess(up.id); toast.info('Acesso removido.') }}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-alert hover:bg-alert-bg transition-colors"
                          aria-label={`Remover ${u?.name ?? 'usuário'}`}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Convidar (RF08) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
              <SectionHeader>Convidar usuário</SectionHeader>
              {!isOnline ? (
                <div className="flex items-start gap-2 px-3 py-3 rounded-xl bg-warning-bg text-warning-dark text-caption">
                  <ShieldAlert size={15} className="mt-0.5 shrink-0" />
                  <span>
                    Convidar exige conta online.{' '}
                    <button className="underline font-medium" onClick={() => navigate('/profile')}>
                      Converta seu perfil
                    </button>{' '}
                    para enviar convites.
                  </span>
                </div>
              ) : invitableUsers.length === 0 ? (
                <p className="text-caption text-gray-400">Nenhum usuário online disponível para convite.</p>
              ) : (
                <>
                  <Select
                    label="Usuário (por e-mail)"
                    value={inviteUserId}
                    options={invitableUsers.map((u) => ({ value: u.id, label: `${u.name} · ${u.email}` }))}
                    placeholder="Selecione..."
                    onChange={(e) => setInviteUserId(e.target.value)}
                  />
                  <Select
                    label="Nível de acesso"
                    value={inviteLevel}
                    options={LEVEL_OPTIONS}
                    onChange={(e) => setInviteLevel(e.target.value as AccessLevel)}
                  />
                  <div>
                    <Button icon={<UserPlus size={15} />} onClick={handleInvite} disabled={!inviteUserId}>
                      Enviar convite
                    </Button>
                  </div>
                </>
              )}

              {/* Convites pendentes enviados */}
              {sentPending.length > 0 && (
                <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                  <p className="text-caption text-gray-400">Pendentes</p>
                  {sentPending.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between gap-3">
                      <p className="text-caption text-gray-600 truncate">
                        {usersById.get(inv.invitedUserId)?.name ?? inv.invitedEmail} · {accessLevelLabel(inv.offeredLevel)}
                      </p>
                      <button
                        onClick={() => { cancelInvitation(inv.id); toast.info('Convite cancelado.') }}
                        className="text-caption text-gray-400 hover:text-alert transition-colors shrink-0"
                      >
                        Cancelar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transferir posse (RF11) — somente dono */}
            {isOwner && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
                <SectionHeader>Transferir posse</SectionHeader>
                <p className="text-caption text-gray-400">
                  A posse é imutável, exceto por transferência. Após transferir, apenas o novo dono terá os poderes de posse.
                </p>
                <Button
                  variant="secondary"
                  icon={<Repeat size={15} />}
                  onClick={() => setTransferOpen(true)}
                  disabled={transferCandidates.length === 0}
                >
                  {transferCandidates.length === 0 ? 'Sem usuários online elegíveis' : 'Transferir posse'}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-2">
            <ShieldAlert size={16} className="text-gray-400 mt-0.5 shrink-0" />
            <p className="text-caption text-gray-500">
              Somente o produtor gerencia o acesso desta propriedade. Seu nível atual é {accessLevelLabel(level)}.
            </p>
          </div>
        )}
      </div>

      {/* Modal de confirmação de transferência */}
      <Modal
        isOpen={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="Transferir posse da propriedade"
        description="Esta ação é irreversível sem uma nova transferência."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTransferOpen(false)}>Cancelar</Button>
            <Button variant="danger" icon={<Crown size={15} />} onClick={handleTransfer} disabled={!transferTo}>
              Confirmar transferência
            </Button>
          </>
        }
      >
        <Select
          label="Novo dono"
          value={transferTo}
          options={transferCandidates.map((u) => ({ value: u.id, label: `${u.name} · ${u.email}` }))}
          placeholder="Selecione..."
          onChange={(e) => setTransferTo(e.target.value)}
        />
        <p className="text-caption text-gray-400 mt-3">
          O novo dono passa a ser produtor. Você mantém seu vínculo atual, mas perde os poderes de posse.
        </p>
      </Modal>
    </motion.div>
  )
}
