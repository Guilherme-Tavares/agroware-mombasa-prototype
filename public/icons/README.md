# Ícones PWA

Gerados a partir do logo do sistema (`src/assets/logo/mombasa-logo.png`):

- `pwa-192x192.png` — manifest (`purpose: any`) e `apple-touch-icon` (ver `index.html`)
- `pwa-512x512.png` — manifest (`any` e `maskable`)

O favicon da aba do navegador é `public/favicon.png` (64×64), também derivado do logo.

## Composição

Símbolo centrado sobre **fundo branco**, com ~68% da largura do canvas — isso
deixa a margem de **zona segura** exigida pelo modo *maskable* do Android (o ícone
é recortado em círculo/squircle). Fundo branco porque o lado verde do símbolo
desapareceria sobre o verde da marca.

## Como regenerar

Ao atualizar o logo em `src/assets/logo/mombasa-logo.png`, regenere os PNGs.
Qualquer rasterizador serve (pwa-asset-generator, ImageMagick, ou um script com
`System.Drawing`/`sharp`), mantendo: fundo branco, símbolo centrado a ~68% da
largura, exportado em 192×192 e 512×512 (e 64×64 para o favicon).

Os SVGs antigos do placeholder "M" ficam em `unused/old-icons/` (fora do versionamento).
