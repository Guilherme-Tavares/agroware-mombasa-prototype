// Camada de i18n (pt-BR único). Resolve chaves do dicionário por caminho com
// ponto e interpola parâmetros `{param}`. Sem estado global nem provider:
// importe `t` direto onde precisar.

import { ptBR } from './pt-BR'

export { ptBR }
export type { Dictionary } from './pt-BR'

// Re-exporta os rótulos de enums de domínio, para um ponto único de tradução.
export * from '@/utils/labels'

type Params = Record<string, string | number>

/** Resolve um caminho "a.b.c" dentro de um objeto aninhado. */
function resolve(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

/**
 * Traduz uma chave do dicionário pt-BR.
 *
 * @example t('common.loading')                 // "Carregando…"
 * @example t('dashboard.greeting', { name })    // "Olá, Maria"
 *
 * Em caso de chave ausente, devolve a própria chave (e avisa no console em dev),
 * para que a falta apareça na UI sem quebrar a renderização.
 */
export function t(key: string, params?: Params): string {
  const value = resolve(ptBR, key)

  if (typeof value !== 'string') {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] chave ausente ou não-string: "${key}"`)
    }
    return key
  }

  if (!params) return value
  return value.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in params ? String(params[name]) : `{${name}}`,
  )
}
