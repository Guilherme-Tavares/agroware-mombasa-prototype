// Logo Agroware Mombasa — símbolo "M" com a silhueta do zebu (PNG transparente,
// recortado justo de mombasa-logo.png). O `color` aplica-se apenas ao texto do
// wordmark (o símbolo tem cor própria). `size` é a altura do símbolo em px.

import logoMark from './mombasa-logo.png'

interface AgrowareLogoProps {
  size?: number
  variant?: 'mark' | 'wordmark'
  color?: string
  className?: string
}

export default function AgrowareLogo({
  size = 40,
  variant = 'mark',
  color = '#2E7D32',
  className,
}: AgrowareLogoProps) {
  const mark = (
    <img
      src={logoMark}
      alt=""
      aria-hidden="true"
      style={{ height: size, width: 'auto', display: 'block' }}
      className={variant === 'mark' ? className : undefined}
    />
  )

  if (variant === 'wordmark') {
    return (
      <div
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.26 }}
      >
        {mark}
        <span
          style={{
            fontFamily: 'Roboto, system-ui, sans-serif',
            fontWeight: 700,
            fontSize: size * 0.52,
            color,
            letterSpacing: '-0.025em',
            wordSpacing: '-0.12em',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          Agroware Mombasa
        </span>
      </div>
    )
  }

  return mark
}
