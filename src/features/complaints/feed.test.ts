import { describe, expect, it } from 'vitest'
import type { Complaint } from '../../shared/lib/schemas'
import { alertsByDistrict, timeAgo } from './feed'

const complaint = (id: number, districtId: number): Complaint => ({
  id, district_id: districtId, category: 'transport', text: 'Пробка у школы', status: 'new', created_at: '2026-09-26T10:00:00Z',
})

describe('complaint feed helpers', () => {
  it('counts complaints per district, busiest first', () => {
    expect(alertsByDistrict([complaint(1, 11), complaint(2, 7), complaint(3, 11)])).toEqual([
      { districtId: 11, count: 2 },
      { districtId: 7, count: 1 },
    ])
  })

  it('says how long ago a complaint came in', () => {
    const now = Date.parse('2026-09-26T10:00:00Z')
    expect(timeAgo('2026-09-26T09:59:40Z', now)).toBe('только что')
    expect(timeAgo('2026-09-26T09:48:00Z', now)).toBe('12 мин назад')
    expect(timeAgo('2026-09-26T07:00:00Z', now)).toBe('3 ч назад')
  })
})
