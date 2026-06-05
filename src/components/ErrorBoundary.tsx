import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import { clearIdb } from '@/lib/idb'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleResetData = () => {
    try {
      localStorage.removeItem('agroware:farm')
      localStorage.removeItem('agroware:auth')
      localStorage.removeItem('agroware:ui')
    } catch {
      // ignore
    }
    // Limpa também o IndexedDB (tiles do mapa e mídias) antes de recarregar.
    clearIdb().catch(() => {}).finally(() => window.location.assign('/'))
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div
        role="alert"
        className="min-h-svh flex items-center justify-center p-6 bg-gray-50"
      >
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-alert-bg text-alert-dark flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h1 className="text-h2 text-gray-900">Algo deu errado</h1>
              <p className="text-caption text-gray-400">Erro inesperado na aplicação</p>
            </div>
          </div>

          <pre className="text-caption text-gray-600 bg-gray-50 rounded-lg p-3 mb-4 overflow-auto max-h-32 whitespace-pre-wrap break-words">
            {error.message}
          </pre>

          <div className="flex flex-col gap-2">
            <button
              onClick={this.handleReload}
              className="flex items-center justify-center gap-2 h-11 rounded-input bg-primary text-white font-medium hover:bg-primary-dark transition-colors"
            >
              <RefreshCcw size={16} />
              Recarregar a página
            </button>
            <button
              onClick={this.handleResetData}
              className="flex items-center justify-center gap-2 h-11 rounded-input bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Resetar dados e recarregar
            </button>
          </div>
        </div>
      </div>
    )
  }
}
