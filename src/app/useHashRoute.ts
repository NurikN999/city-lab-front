import { useSyncExternalStore } from 'react'

export type AppRoute = { page: 'city' } | { page: 'compare'; ids: number[] } | { page: 'model' }

export function parseHash(hash: string): AppRoute {
  const [path, query = ''] = hash.replace(/^#/, '').split('?')
  if (path === '/model') return { page: 'model' }
  if (path === '/compare') {
    const ids = (new URLSearchParams(query).get('ids') ?? '')
      .split(',')
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0)
      .slice(0, 3)
    return { page: 'compare', ids }
  }
  return { page: 'city' }
}

export function compareHref(ids: number[]): string {
  return `#/compare?ids=${ids.join(',')}`
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useHashRoute(): AppRoute {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return parseHash(hash)
}
