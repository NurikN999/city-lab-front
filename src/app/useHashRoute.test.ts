import { describe, expect, it } from 'vitest'
import { compareHref, parseHash } from './useHashRoute'

describe('parseHash', () => {
  it('defaults to the city', () => {
    expect(parseHash('')).toEqual({ page: 'city' })
    expect(parseHash('#/')).toEqual({ page: 'city' })
    expect(parseHash('#/unknown')).toEqual({ page: 'city' })
  })

  it('parses compare ids, keeping at most three valid ones', () => {
    expect(parseHash('#/compare?ids=3,5')).toEqual({ page: 'compare', ids: [3, 5] })
    expect(parseHash('#/compare?ids=1,x,2,3,4')).toEqual({ page: 'compare', ids: [1, 2, 3] })
    expect(parseHash('#/compare')).toEqual({ page: 'compare', ids: [] })
  })

  it('parses the model page', () => {
    expect(parseHash('#/model')).toEqual({ page: 'model' })
  })

  it('builds compare links', () => {
    expect(compareHref([4, 7])).toBe('#/compare?ids=4,7')
  })
})
