import { Loader2 } from 'lucide-react'

// Fallback do Suspense enquanto o chunk da rota (lazy) é baixado. Em rede local
// /cache é quase imperceptível; aparece sobretudo no primeiro acesso de cada tela.
export default function RouteFallback() {
  return (
    <div
      className="flex items-center justify-center py-24"
      role="status"
      aria-label="Carregando"
    >
      <Loader2 className="animate-spin text-primary" size={28} />
    </div>
  )
}
