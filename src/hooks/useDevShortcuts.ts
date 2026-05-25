import { useEffect } from 'react'
import { resetToMock } from '@/data/seed'
import { useUIStore } from '@/store/useUIStore'

/**
 * Atalhos de desenvolvimento globais.
 *
 *  Shift+Ctrl+R  → reseta as stores para o dataset mock e recarrega a UI.
 *                  Útil em demos para voltar ao estado conhecido.
 *
 * Browsers nativos também usam Shift+Ctrl+R para hard-reload — chamamos
 * preventDefault() apenas quando o atalho é capturado fora de inputs,
 * para não atrapalhar quem está digitando.
 */
export function useDevShortcuts(): void {
  const addToast = useUIStore((s) => s.addToast)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable

      if (isTyping) return

      if (e.shiftKey && e.ctrlKey && (e.key === 'R' || e.key === 'r')) {
        e.preventDefault()
        resetToMock()
        addToast({
          type: 'success',
          message: 'Dados resetados para o mock da Fazenda São José',
          duration: 2500,
        })
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [addToast])
}
