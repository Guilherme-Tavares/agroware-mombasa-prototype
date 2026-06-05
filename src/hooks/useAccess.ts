import { useMemo } from 'react'
import { useFarmStore } from '@/store/useFarmStore'
import type { AccessLevel, User } from '@/types/domain'

// ──────────────────────────────────────────────────────────────────────────────
// Modelo de níveis de acesso (escopo §6.2). Fonte única de verdade sobre o que o
// usuário atual pode fazer na propriedade ativa. As telas de escrita devem
// consultar `useAccess()` e desabilitar/ocultar ações conforme `can`.
//
//   produtor    → tudo
//   colaborador → escrita no manejo zootécnico; sem usuários, financeiro,
//                 demarcação, transferência de bovino ou de posse
//   visitante   → somente leitura (consulta e exportação de relatórios)
// ──────────────────────────────────────────────────────────────────────────────

export interface AccessCapabilities {
  /** Consultar dados e exportar relatórios. Sempre verdadeiro. */
  read: boolean
  /** Criar/editar/remover no manejo zootécnico (bovinos, rebanhos, divisões,
   *  lotações, pertencimentos, pesagens, aplicações, abastecimentos, agenda). */
  writeHusbandry: boolean
  /** Convidar e gerir usuários, responder à gestão de acesso. */
  manageUsers: boolean
  /** Acessar e lançar no financeiro (despesas, lotes, vendas). */
  finance: boolean
  /** Demarcar e subdividir a propriedade. */
  demarcate: boolean
  /** Transferir bovino entre propriedades e transferir a posse. */
  transfer: boolean
}

export interface AccessInfo {
  user: User | null
  level: AccessLevel
  isOwner: boolean
  isReadOnly: boolean
  can: AccessCapabilities
}

function capabilitiesFor(level: AccessLevel): AccessCapabilities {
  switch (level) {
    case 'produtor':
      return { read: true, writeHusbandry: true, manageUsers: true, finance: true, demarcate: true, transfer: true }
    case 'colaborador':
      return { read: true, writeHusbandry: true, manageUsers: false, finance: false, demarcate: false, transfer: false }
    case 'visitante':
    default:
      return { read: true, writeHusbandry: false, manageUsers: false, finance: false, demarcate: false, transfer: false }
  }
}

export function useAccess(): AccessInfo {
  const currentUserId  = useFarmStore((s) => s.currentUserId)
  const activePropertyId = useFarmStore((s) => s.activePropertyId)
  const userProperties = useFarmStore((s) => s.userProperties)
  const users          = useFarmStore((s) => s.users)
  const farm           = useFarmStore((s) => s.farm)

  return useMemo<AccessInfo>(() => {
    const user = users.find((u) => u.id === currentUserId) ?? null
    const isOwner = Boolean(farm?.ownerId && farm.ownerId === currentUserId)

    // Nível vem do vínculo usuario_propriedade; o dono é sempre produtor; na
    // ausência de vínculo, trata-se como visitante (somente leitura).
    const link = userProperties.find(
      (up) => up.userId === currentUserId && up.propertyId === activePropertyId && up.active !== false,
    )
    const level: AccessLevel = link?.accessLevel ?? (isOwner ? 'produtor' : 'visitante')

    return {
      user,
      level,
      isOwner,
      isReadOnly: level === 'visitante',
      can: capabilitiesFor(level),
    }
  }, [currentUserId, activePropertyId, userProperties, users, farm])
}

/** Rótulo em português para um nível de acesso. */
export function accessLevelLabel(level: AccessLevel): string {
  return level === 'produtor' ? 'Produtor'
    : level === 'colaborador' ? 'Colaborador'
    : 'Visitante'
}
