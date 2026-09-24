import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { useFetch } from './useFetch'

const schema = z.object({ n: z.number() })

describe('useFetch', () => {
  it('goes loading → success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"n":1}', { status: 200 })))

    const { result } = renderHook(() => useFetch('/a', schema))

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current).toEqual({ status: 'success', data: { n: 1 } }))
  })

  it('reports errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"message":"Нет"}', { status: 404 })))

    const { result } = renderHook(() => useFetch('/a', schema))

    await waitFor(() => expect(result.current).toEqual({ status: 'error', error: 'Нет' }))
  })

  it('aborts the previous request when the path changes', async () => {
    const signals: AbortSignal[] = []
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => {
      if (init.signal) signals.push(init.signal)
      return new Promise<Response>(() => {})
    }))

    const { rerender } = renderHook(({ path }) => useFetch(path, schema), { initialProps: { path: '/a' } })
    rerender({ path: '/b' })

    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
  })
})
