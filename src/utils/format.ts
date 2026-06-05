import { format, formatDistanceToNow, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function toDate(date: string | Date): Date {
  return typeof date === 'string' ? new Date(date) : date
}

export function formatDate(date: string | Date): string {
  return format(toDate(date), 'dd/MM/yyyy', { locale: ptBR })
}

export function formatDateTime(date: string | Date): string {
  return format(toDate(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatRelativeDate(date: string | Date): string {
  return formatDistanceToNow(toDate(date), { addSuffix: true, locale: ptBR })
}

/** Ex: 285,50 kg */
export function formatWeight(kg: number, decimals = 0): string {
  return `${kg.toFixed(decimals).replace('.', ',')} kg`
}

/** Ex: 1.250 kg */
export function formatWeightLarge(kg: number): string {
  return `${kg.toLocaleString('pt-BR')} kg`
}

/** Ex: 125,50 ha */
export function formatArea(ha: number): string {
  return `${ha.toFixed(1).replace('.', ',')} ha`
}

/** Ex: 2,15 UA/ha */
export function formatStockingRate(rate: number): string {
  return `${rate.toFixed(2).replace('.', ',')} UA/ha`
}

/** Ex: 0,850 kg/dia */
export function formatGMD(gmd: number): string {
  return `${gmd.toFixed(3).replace('.', ',')} kg/dia`
}

/** Ex: 80% */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

/** Ex: R$ 4.200,00 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Ex: 12,5 @ — arroba derivada do peso vivo (1@ ≈ 30 kg vivo a 50% de rendimento). */
export function formatArrobas(arrobas: number): string {
  return `${arrobas.toFixed(1).replace('.', ',')} @`
}

export function ageInMonths(birthDate: string | Date): number {
  const days = differenceInDays(new Date(), toDate(birthDate))
  return Math.floor(days / 30)
}

export function formatAge(birthDate: string | Date): string {
  const months = ageInMonths(birthDate)
  if (months < 12) return `${months} meses`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem > 0 ? `${years} ano${years > 1 ? 's' : ''} e ${rem} mes${rem > 1 ? 'es' : ''}` : `${years} ano${years > 1 ? 's' : ''}`
}

export function greetingByHour(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}
