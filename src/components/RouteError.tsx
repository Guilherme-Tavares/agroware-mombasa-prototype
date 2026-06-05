import { useEffect } from 'react'
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

// errorElement do router. Trata, em especial, falhas de carregamento de chunk
// (lazy import) — que acontecem quando o app aberto é de uma build antiga e o
// chunk daquela rota não existe mais no servidor (deploy novo / service worker
// com cache obsoleto). Nesse caso recarrega a página UMA vez para pegar a versão
// atual; o guard por timestamp evita laço de reload.

const RELOAD_KEY = 'agroware:chunk-reload-ts'
const RELOAD_COOLDOWN_MS = 10_000

function isChunkLoadError(error: unknown): boolean {
  if (isRouteErrorResponse(error) && error.status === 404) return true
  const msg = error instanceof Error ? error.message : String(error ?? '')
  return /dynamically imported module|Importing a module script failed|Failed to fetch|error loading dynamically imported module/i.test(msg)
}

export default function RouteError() {
  const error = useRouteError()
  const navigate = useNavigate()
  const chunkError = isChunkLoadError(error)

  useEffect(() => {
    if (!chunkError) return
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
    if (Date.now() - last > RELOAD_COOLDOWN_MS) {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
      window.location.reload()
    }
  }, [chunkError])

  const title = chunkError ? 'Atualizando a aplicação…' : 'Algo deu errado'
  const body = chunkError
    ? 'Uma nova versão está disponível. Recarregando para aplicá-la.'
    : 'Não foi possível abrir esta tela. Tente novamente.'

  return (
    <div role="alert" className="flex flex-col items-center justify-center py-24 px-6 text-center gap-4">
      <div className="w-12 h-12 rounded-full bg-alert-bg text-alert-dark flex items-center justify-center">
        <AlertTriangle size={22} />
      </div>
      <div className="flex flex-col gap-1 max-w-sm">
        <p className="text-h2 text-gray-900">{title}</p>
        <p className="text-body text-gray-400">{body}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 h-10 px-4 rounded-input bg-primary text-white font-medium hover:bg-primary-dark transition-colors"
        >
          <RefreshCcw size={16} />
          Recarregar
        </button>
        {!chunkError && (
          <button
            onClick={() => navigate('/')}
            className="h-10 px-4 rounded-input bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Ir para o início
          </button>
        )}
      </div>
    </div>
  )
}
