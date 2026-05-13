// Placeholder do logo Agroware Mombasa.
// Substituir pelo SVG definitivo quando o logo final for aprovado.
//
// Conceito: letra M geométrica com stroke arredondado.
// O arco central (Q 32,42 42,28) sugere o dorso e cupim do zebu na silhueta.

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
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={variant === 'mark' ? className : undefined}
    >
      {/* M geométrico. As diagonais encontram-se num arco
          que alude ao dorso curvilíneo do zebu (cupim + lombo). */}
      <path
        d="M 7,56 L 7,8 L 22,28 Q 32,42 42,28 L 57,8 L 57,56"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )

  if (variant === 'wordmark') {
    return (
      <div
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.28 }}
      >
        {mark}
        <span
          style={{
            fontFamily: 'Roboto, system-ui, sans-serif',
            fontWeight: 500,
            fontSize: size * 0.44,
            color,
            letterSpacing: '-0.01em',
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
