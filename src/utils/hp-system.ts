export function calculateRemainingDays(
  currentAmount: number,
  consumptionRate: number,
): number {
  if (consumptionRate <= 0) return Infinity
  return Math.floor(currentAmount / consumptionRate)
}

export function getHPStatus(currentPercentage: number): 'ok' | 'warning' | 'alert' {
  if (currentPercentage > 50) return 'ok'
  if (currentPercentage > 20) return 'warning'
  return 'alert'
}

export function calculateHPPercentage(current: number, capacity: number): number {
  if (capacity <= 0) return 0
  return Math.min(100, (current / capacity) * 100)
}

export function calculateExhaustionDate(
  currentAmount: number,
  consumptionRate: number,
): Date | null {
  const days = calculateRemainingDays(currentAmount, consumptionRate)
  if (!isFinite(days)) return null
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}
