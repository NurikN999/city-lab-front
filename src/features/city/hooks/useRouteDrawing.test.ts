import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MAX_POINTS } from '../drawing'
import { useRouteDrawing } from './useRouteDrawing'

const p = (i: number) => ({ lat: 43.65 + i / 1000, lng: 51.16 })
const previewBody = { path: { type: 'LineString', coordinates: [[51.16, 43.65], [51.16, 43.651]] }, stops: [p(0), p(1)], snapped: true, district_ids: [] }

function stubPendingFetch() {
  const pending: ((response: Response) => void)[] = []
  const fetch = vi.fn(() => new Promise<Response>((resolve) => pending.push(resolve)))
  vi.stubGlobal('fetch', fetch)
  return {
    fetch,
    answer: (i: number) => pending[i](new Response(JSON.stringify(previewBody))),
    fail: (i: number) => pending[i](new Response(JSON.stringify({ message: 'Too Many Attempts.' }), { status: 429 })),
  }
}

describe('useRouteDrawing', () => {
  it('shows the road preview once two stops are placed', async () => {
    const { answer } = stubPendingFetch()
    const { result } = renderHook(() => useRouteDrawing())

    act(() => result.current.add(p(0)))
    act(() => result.current.add(p(1)))
    expect(result.current.preview.status).toBe('loading')
    await act(async () => answer(0))

    expect(result.current.preview.status).toBe('ready')
  })

  it('ignores a preview from a previous drawing session', async () => {
    const { answer } = stubPendingFetch()
    const { result } = renderHook(() => useRouteDrawing())

    act(() => result.current.add(p(0)))
    act(() => result.current.add(p(1)))
    act(() => result.current.reset())
    await act(async () => answer(0))

    expect(result.current.points).toEqual([])
    expect(result.current.preview).toEqual({ status: 'idle' })
  })

  it('does not request a preview for clicks past the stop limit', () => {
    const { fetch } = stubPendingFetch()
    const { result } = renderHook(() => useRouteDrawing())

    for (let i = 0; i < MAX_POINTS; i++) act(() => result.current.add(p(i)))
    const calls = fetch.mock.calls.length
    act(() => result.current.add(p(99)))

    expect(result.current.points).toHaveLength(MAX_POINTS)
    expect(fetch).toHaveBeenCalledTimes(calls)
  })

  it('keeps the last road line while the next preview loads', async () => {
    const { answer } = stubPendingFetch()
    const { result } = renderHook(() => useRouteDrawing())

    act(() => result.current.add(p(0)))
    act(() => result.current.add(p(1)))
    await act(async () => answer(0))
    act(() => result.current.add(p(2)))

    expect(result.current.preview.status).toBe('loading')
    expect(result.current.path).toEqual(previewBody.path.coordinates)
    act(() => result.current.reset())
    expect(result.current.path).toBeNull()
  })

  it('drops the old road line when the next preview fails', async () => {
    const { answer, fail } = stubPendingFetch()
    const { result } = renderHook(() => useRouteDrawing())

    act(() => result.current.add(p(0)))
    act(() => result.current.add(p(1)))
    await act(async () => answer(0))
    act(() => result.current.add(p(2)))
    await act(async () => fail(1))

    expect(result.current.preview.status).toBe('error')
    expect(result.current.path).toBeNull()
  })
})
