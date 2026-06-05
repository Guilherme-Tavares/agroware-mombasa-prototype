import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import * as L from 'leaflet'
import { getTile, putTile } from '@/lib/idb'
import { tileKey, type TileSourceId } from '@/lib/tiles'

// ──────────────────────────────────────────────────────────────────────────────
// Camada de tiles ciente de cache (RF36, §11 do alinhamento).
//
// Subclasse de L.TileLayer que, ao carregar um tile, consulta primeiro o
// IndexedDB. Se ausente e online, busca na rede e grava. No modo offline, os
// tiles previamente baixados (pela tela de configuração) são servidos do cache.
//
// É um componente imperativo (useMap + addLayer) porque precisamos sobrescrever
// createTile, o que o <TileLayer> declarativo não permite.
// ──────────────────────────────────────────────────────────────────────────────

interface OfflineTilesProps {
  sourceId: TileSourceId
  url: string
  attribution: string
  maxZoom: number
}

// L.TileLayer.extend não é fortemente tipado; o interop fica encapsulado aqui.
const CachedTileLayer = L.TileLayer.extend({
  createTile(this: L.TileLayer, coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const img = document.createElement('img')
    img.setAttribute('role', 'presentation')
    img.alt = ''

    const sourceId = (this.options as { sourceId?: string }).sourceId ?? 'tiles'
    const key = tileKey(sourceId, coords.z, coords.x, coords.y)
    const url = this.getTileUrl(coords)

    getTile(key)
      .then((blob) => {
        if (blob) {
          img.src = URL.createObjectURL(blob)
          done(undefined, img)
          return
        }
        // Não está em cache: busca na rede e grava para uso offline futuro.
        fetch(url)
          .then((res) => (res.ok ? res.blob() : Promise.reject(new Error('tile fetch failed'))))
          .then((fetched) => {
            putTile(key, fetched).catch(() => {})
            img.src = URL.createObjectURL(fetched)
            done(undefined, img)
          })
          .catch((err) => {
            // Sem rede e sem cache: deixa o Leaflet exibir o tile de erro.
            img.src = url
            done(err as Error, img)
          })
      })
      .catch(() => {
        img.src = url
        done(undefined, img)
      })

    return img
  },
})

export default function OfflineTiles({ sourceId, url, attribution, maxZoom }: OfflineTilesProps) {
  const map = useMap()

  useEffect(() => {
    const layer = new (CachedTileLayer as unknown as typeof L.TileLayer)(url, {
      attribution,
      maxZoom,
      // Propriedade custom lida em createTile.
      sourceId,
    } as L.TileLayerOptions)

    layer.addTo(map)
    return () => {
      map.removeLayer(layer)
    }
  }, [map, sourceId, url, attribution, maxZoom])

  return null
}
