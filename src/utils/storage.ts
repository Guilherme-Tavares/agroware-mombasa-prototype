export function getItem<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key)
    if (stored === null) return defaultValue
    return JSON.parse(stored) as T
  } catch {
    return defaultValue
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // quota excedida ou modo privado
  }
}

export function removeItem(key: string): void {
  localStorage.removeItem(key)
}

export function hasItem(key: string): boolean {
  return localStorage.getItem(key) !== null
}

export function clearAll(): void {
  localStorage.clear()
}

/** Remove todas as chaves que começam com o prefixo informado */
export function clearByPrefix(prefix: string): void {
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(prefix)) keysToRemove.push(key)
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k))
}
