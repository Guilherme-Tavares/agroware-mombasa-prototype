/** UA (Unidade Animal) equivale a 450 kg de peso vivo */
const UA_WEIGHT_KG = 450

export function weightToUA(weightKg: number): number {
  return weightKg / UA_WEIGHT_KG
}

/** Taxa de lotação atual em UA/ha */
export function calculateStockingRate(
  headCount: number,
  averageWeightKg: number,
  areaHa: number,
): number {
  if (areaHa <= 0) return 0
  const totalUA = headCount * weightToUA(averageWeightKg)
  return totalUA / areaHa
}

/** Capacidade suportada pelo pasto em UA/ha (referência Mombaça: ~3 UA/ha, Brachiaria: ~1.5 UA/ha) */
export function getIdealStockingRate(forageType: 'mombaca' | 'brachiaria' | 'other'): number {
  const rates: Record<string, number> = {
    mombaca: 3.0,
    brachiaria: 1.5,
    other: 2.0,
  }
  return rates[forageType] ?? 2.0
}

export function getStockingStatus(
  current: number,
  ideal: number,
): 'ok' | 'warning' | 'alert' {
  const ratio = ideal > 0 ? current / ideal : 0
  if (ratio <= 1.0) return 'ok'
  if (ratio <= 1.25) return 'warning'
  return 'alert'
}
