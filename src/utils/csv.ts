// Exportação de relatórios em CSV. Usa ';' como separador (padrão pt-BR no
// Excel) e BOM UTF-8 para acentuação correta. Sem dependências externas.

type Cell = string | number | null | undefined

function escapeCell(value: Cell): string {
  const s = String(value ?? '')
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function downloadCsv(filename: string, headers: string[], rows: Cell[][]): void {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(';'))
  const content = '﻿' + lines.join('\r\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
