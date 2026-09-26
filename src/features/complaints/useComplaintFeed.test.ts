import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useComplaintFeed } from './useComplaintFeed'

const complaint = (id: number) => ({ id, district_id: 11, category: 'transport', text: `Жалоба ${id}`, status: 'new', created_at: '2026-09-26T10:00:00+00:00' })

describe('useComplaintFeed', () => {
  it('announces only complaints that arrive after the first load', async () => {
    const responses = [[complaint(1)], [complaint(2), complaint(1)]]
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(responses.length > 1 ? responses.shift() : responses[0]))))

    const { result } = renderHook(() => useComplaintFeed(20))

    await waitFor(() => expect(result.current.complaints.map((c) => c.id)).toEqual([2, 1]))
    expect(result.current.fresh.map((c) => c.id)).toEqual([2])
  })
})
