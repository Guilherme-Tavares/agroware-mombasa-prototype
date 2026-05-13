/** Ganho Médio Diário = (peso_final - peso_inicial) / dias */
export function calculateGMD(
  finalWeight: number,
  initialWeight: number,
  days: number,
): number {
  if (days <= 0) return 0
  return (finalWeight - initialWeight) / days
}

export function averageGMD(gmds: number[]): number {
  if (gmds.length === 0) return 0
  return gmds.reduce((sum, v) => sum + v, 0) / gmds.length
}

export function getGMDStatus(gmd: number): 'ok' | 'warning' | 'alert' {
  if (gmd >= 0.8) return 'ok'
  if (gmd >= 0.6) return 'warning'
  return 'alert'
}
