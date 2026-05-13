import { useState, useEffect } from 'react'
import { getItem, setItem } from '@/utils/storage'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => getItem(key, initialValue))

  useEffect(() => {
    setItem(key, value)
  }, [key, value])

  return [value, setValue] as const
}
