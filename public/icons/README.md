# Ícones PWA

Este diretório deve conter:

- `pwa-192x192.png` — usado no manifest e como `apple-touch-icon`
- `pwa-512x512.png` — usado no manifest e como splash em alguns devices

## Como gerar

A partir do `source.svg` desta pasta, gere os PNGs com qualquer ferramenta.
Três opções:

### 1. pwa-asset-generator (recomendado — automatizado)

```bash
npx pwa-asset-generator public/icons/source.svg public/icons \
  --opaque false \
  --icon-only \
  --type png \
  --background "#2E7D32"
```

Renomeie os arquivos gerados para `pwa-192x192.png` e `pwa-512x512.png`
(o gerador usa nomes próprios).

### 2. ImageMagick (CLI direto)

```bash
magick -background "#2E7D32" -density 384 public/icons/source.svg \
  -resize 192x192 public/icons/pwa-192x192.png

magick -background "#2E7D32" -density 1024 public/icons/source.svg \
  -resize 512x512 public/icons/pwa-512x512.png
```

### 3. Manual

Abra `source.svg` no Figma/Inkscape/Sketch, exporte como PNG em 192×192 e 512×512.

## Por que não estão versionados?

PNGs binários são gerados a partir do SVG, que é a fonte de verdade.
Quando o logo final for aprovado, atualize `source.svg` e regenere.
