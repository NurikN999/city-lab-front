import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AiPlanResponse } from '../../../shared/lib/schemas'
import { AiResults } from './AiResults'

const plan = (districtAuto: boolean): AiPlanResponse => ({
  intent: { district_id: 11, district_name: '12 мкр', district_auto: districtAuto, goals: [{ metric: 'traffic', direction: 'decrease', weight: 1 }], budget: 100_000_000, fallback: false },
  stats: { combinations: 63, within_budget: 57 },
  scenarios: [],
  explanation: '',
})

describe('AiResults', () => {
  it('says when the engine picked the district itself', () => {
    render(<AiResults data={plan(true)} metrics={[]} onClose={vi.fn()} />)

    expect(screen.getByText('Район: 12 мкр — самый проблемный')).toBeInTheDocument()
  })

  it('shows a named district as is', () => {
    render(<AiResults data={plan(false)} metrics={[]} onClose={vi.fn()} />)

    expect(screen.getByText('Район: 12 мкр')).toBeInTheDocument()
  })
})
