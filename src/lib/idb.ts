import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'

// ──────────────────────────────────────────────────────────────────────────────
// Camada IndexedDB — scaffolding da Fase 0 (item 0.9 do PLANO_DE_ACAO).
//
// Por que IndexedDB e não localStorage: dois tipos de dado podem estourar a cota
// do localStorage (~5 MB) e não cabem no estado persistido do Zustand:
//
//   1. tiles  — blocos do mapa base (Leaflet) baixados para uso offline (RF36).
//   2. media  — fotos de bovino em base64 (escopo §8, foto_bovino).
//
// O estado estruturado da aplicação continua no Zustand + localStorage. Este
// módulo expõe um acesso tipado e mínimo aos dois object stores. As fases que
// consomem isto (mapa real e fotos) chegam depois; aqui fica só a fundação.
// ──────────────────────────────────────────────────────────────────────────────

const DB_NAME = 'agroware'
const DB_VERSION = 1

interface AgrowareDB extends DBSchema {
  /** Tiles do mapa base, chaveados por "z/x/y" (ou URL do tile). */
  tiles: {
    key: string
    value: {
      key: string
      blob: Blob
      capturedAt: number
    }
  }
  /** Mídias grandes (ex.: fotos de bovino), chaveadas por id próprio. */
  media: {
    key: string
    value: {
      key: string
      /** base64 ou Blob, conforme a origem. */
      data: string | Blob
      contentType?: string
      updatedAt: number
    }
  }
}

let dbPromise: Promise<IDBPDatabase<AgrowareDB>> | null = null

/** Abre (e cria/migra) o banco uma única vez por sessão. */
function getDB(): Promise<IDBPDatabase<AgrowareDB>> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB indisponível neste ambiente'))
  }
  if (!dbPromise) {
    dbPromise = openDB<AgrowareDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tiles')) {
          db.createObjectStore('tiles', { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains('media')) {
          db.createObjectStore('media', { keyPath: 'key' })
        }
      },
    })
  }
  return dbPromise
}

// ─── Tiles do mapa ──────────────────────────────────────────────────────────

export async function putTile(key: string, blob: Blob): Promise<void> {
  const db = await getDB()
  await db.put('tiles', { key, blob, capturedAt: Date.now() })
}

export async function getTile(key: string): Promise<Blob | null> {
  const db = await getDB()
  const row = await db.get('tiles', key)
  return row?.blob ?? null
}

export async function countTiles(): Promise<number> {
  const db = await getDB()
  return db.count('tiles')
}

export async function clearTiles(): Promise<void> {
  const db = await getDB()
  await db.clear('tiles')
}

// ─── Mídias (fotos) ───────────────────────────────────────────────────────────

export async function putMedia(
  key: string,
  data: string | Blob,
  contentType?: string,
): Promise<void> {
  const db = await getDB()
  await db.put('media', { key, data, contentType, updatedAt: Date.now() })
}

export async function getMedia(key: string): Promise<string | Blob | null> {
  const db = await getDB()
  const row = await db.get('media', key)
  return row?.data ?? null
}

export async function deleteMedia(key: string): Promise<void> {
  const db = await getDB()
  await db.delete('media', key)
}

/** Limpa todo o banco IndexedDB do app (usado em reset de dados). */
export async function clearIdb(): Promise<void> {
  const db = await getDB()
  await Promise.all([db.clear('tiles'), db.clear('media')])
}
