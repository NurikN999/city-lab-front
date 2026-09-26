import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useBuildPreview } from './useBuildPreview'

const result = {
  before: { city: { heat: 70 }, districts: { '11': { heat: 76 } } },
  after: { city: { heat: 69 }, districts: { '11': { heat: 74 } } },
  cost: 15_000_000, budget: 100_000_000, over_budget: false,
  assumptions: { actions: [], couplings: [] },
}

describe('useBuildPreview', () => {
  it('recalculates the city for placed objects', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ result })))
    vi.stubGlobal('fetch', fetchMock)

    const { result: hook } = renderHook(() => useBuildPreview([{ action_id: 21, lat: 43.66, lng: 51.16 }], 10))

    await waitFor(() => expect(hook.current.result?.after.districts['11'].heat).toBe(74))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('stays idle with nothing placed', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { result: hook } = renderHook(() => useBuildPreview([], 10))

    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(hook.current.result).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
