import { describe, expect, it } from 'vitest'
import { clampDelta } from './drag'

const bounds = { left: 0, top: 0, right: 1000, bottom: 800 }
const panel = { left: 100, top: 100, right: 400, bottom: 500 }

describe('clampDelta', () => {
  it('moves freely inside the map', () => {
    expect(clampDelta({ x: 50, y: -40 }, panel, bounds)).toEqual({ x: 50, y: -40 })
  })

  it('stops the panel at the map edges', () => {
    expect(clampDelta({ x: -500, y: 900 }, panel, bounds)).toEqual({ x: -100, y: 300 })
    expect(clampDelta({ x: 900, y: -900 }, panel, bounds)).toEqual({ x: 600, y: -100 })
  })
})
