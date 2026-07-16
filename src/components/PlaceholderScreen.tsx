import { Link } from 'react-router-dom'
import { Construction, ChevronRight } from 'lucide-react'

interface PlaceholderLink {
  to: string
  label: string
}

interface PlaceholderScreenProps {
  title: string
  note?: string
  /** Links de acesso interino para as telas que esta ainda vai consolidar. */
  links?: PlaceholderLink[]
}

/**
 * Tela provisória para rotas cujo conteúdo definitivo será implementado depois
 * (ex.: Estoques e Históricos, que unificarão várias telas num alternador; GMD,
 * que ganhará gráfico e lógica própria). Quando há `links`, funciona como um
 * índice temporário — preserva o acesso às telas atuais até a consolidação.
 */
export default function PlaceholderScreen({ title, note, links }: PlaceholderScreenProps) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1 text-gray-900">{title}</h1>

      {links && links.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-body text-gray-400">
            {note ?? 'Esta tela unificará as opções abaixo (em construção). Por ora, acesse cada uma:'}
          </p>
          <ul className="flex flex-col gap-2">
            {links.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="card flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-body text-gray-900">{l.label}</span>
                  <ChevronRight size={16} className="text-gray-400" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="card flex flex-col items-center justify-center text-center gap-3 py-16">
          <div className="w-12 h-12 rounded-xl bg-primary-bg text-primary flex items-center justify-center">
            <Construction size={24} aria-hidden="true" />
          </div>
          <p className="text-h2 text-gray-900">Em construção</p>
          <p className="text-body text-gray-400 max-w-sm">
            {note ?? 'Esta tela será implementada em breve.'}
          </p>
        </div>
      )}
    </div>
  )
}
