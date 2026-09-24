import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useMediaQuery } from './useMediaQuery'

describe('useMediaQuery', () => {
  it('follows the media query', () => {
    let listener: () => void = () => {}
    const mql = { matches: true, addEventListener: (_: string, l: () => void) => { listener = l }, removeEventListener: vi.fn() }
    vi.stubGlobal('matchMedia', vi.fn(() => mql))

    const { result } = renderHook(() => useMediaQuery('(max-width: 63.99rem)'))
    expect(result.current).toBe(true)

    mql.matches = false
    act(() => listener())
    expect(result.current).toBe(false)
  })
})
