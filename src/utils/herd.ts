import type { Bovine } from '@/types/domain'

/**
 * Cabeças ativas de um rebanho. Animais vendidos ficam inativos e mantêm o
 * `herdId` (o vínculo histórico vive no pertencimento), então a contagem
 * precisa filtrar por `active` para não somar gado que já saiu.
 *
 * Fonte única do número de cabeças usado na lotação (RF26, `numero_cabecas`)
 * e nas estatísticas de rebanho.
 */
export function countActiveHeads(bovines: Bovine[], herdId: string): number {
  return bovines.filter((b) => b.herdId === herdId && b.active !== false).length
}
