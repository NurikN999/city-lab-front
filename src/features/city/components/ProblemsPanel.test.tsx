import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { District, Metric } from '../../../shared/lib/schemas'
import { valuesById } from '../rank'
import { ProblemsPanel } from './ProblemsPanel'

const traffic: Metric = { key: 'traffic', name: 'Загрузка дорог', unit: '%', sphere: 'transport', lower_is_better: true, min: 0, max: 100, is_computed: false }

function district(id: number, traffic: number): District {
  return { id, name: `${id} мкр`, population: 1, center: { lat: 0, lng: 0 }, boundary: { type: 'Polygon', coordinates: [] }, values: { traffic } }
}

describe('ProblemsPanel', () => {
  it('lets keyboard users reach any district, not only the worst four', async () => {
    const districts = [1, 2, 3, 4, 5, 6].map((id) => district(id, 90 - id * 5))
    const onSelect = vi.fn()
    render(<ProblemsPanel districts={districts} values={valuesById(districts)} metric={traffic} onSelect={onSelect} />)

    await userEvent.selectOptions(screen.getByLabelText('Все районы'), '6 мкр')

    expect(onSelect).toHaveBeenCalledWith(6)
  })
})
