import { useSyncExternalStore } from 'react'

const canMatch = () => typeof window.matchMedia === 'function'

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (!canMatch()) return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => canMatch() && window.matchMedia(query).matches,
  )
}
