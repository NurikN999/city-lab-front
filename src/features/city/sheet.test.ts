import { describe, expect, it } from 'vitest'
import { nearestSnap, nextSnap, snapHeight } from './sheet'

describe('bottom sheet snaps', () => {
  it('cycles peek → half → full → peek on tap', () => {
    expect(nextSnap('peek')).toBe('half')
    expect(nextSnap('half')).toBe('full')
    expect(nextSnap('full')).toBe('peek')
  })

  it('turns a snap into a height inside the map area', () => {
    expect(snapHeight('peek', 800)).toBe(152)
    expect(snapHeight('half', 800)).toBe(400)
    expect(snapHeight('full', 800)).toBe(728)
  })

  it('settles a dragged sheet on the nearest snap', () => {
    expect(nearestSnap(200, 800)).toBe('peek')
    expect(nearestSnap(430, 800)).toBe('half')
    expect(nearestSnap(700, 800)).toBe('full')
  })
})
