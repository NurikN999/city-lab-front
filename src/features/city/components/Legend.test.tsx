import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Metric } from '../../../shared/lib/schemas'
import { Legend } from './Legend'

const traffic: Metric = { key: 'traffic', name: 'Загрузка дорог', unit: '%', sphere: 'transport', lower_is_better: true, min: 0, max: 100, is_computed: false }

describe('Legend', () => {
  it('fits in a pill on phones', () => {
    render(<Legend metric={traffic} compact />)

    expect(screen.getByLabelText('Легенда: Загрузка дорог')).toHaveTextContent('НормаВниманиеПроблема')
    expect(screen.queryByText('Высота столбика — насколько плохо')).not.toBeInTheDocument()
  })
})
