import { describe, expect, it } from 'vitest'
import type { AiPlanResponse, ScenarioWithResult } from '../../shared/lib/schemas'
import { afterAiPlan, afterSimulation, type View } from './view'

const simulated = { scenario: { district_id: 11 } } as unknown as ScenarioWithResult
const plan = { intent: { district_id: 11 } } as unknown as AiPlanResponse

describe('late responses', () => {
  it('shows the result while the user still looks at that district', () => {
    expect(afterSimulation({ mode: 'district', districtId: 11 }, 11, simulated)).toEqual({ mode: 'result', districtId: 11, data: simulated })
  })

  it('ignores a simulation that finished after the user moved to another district', () => {
    const view: View = { mode: 'district', districtId: 7 }
    expect(afterSimulation(view, 11, simulated)).toBe(view)
  })

  it('opens AI results only if the user is not busy with a district', () => {
    expect(afterAiPlan({ mode: 'explore' }, plan)).toEqual({ mode: 'ai', data: plan })
    const busy: View = { mode: 'district', districtId: 7 }
    expect(afterAiPlan(busy, plan)).toBe(busy)
  })
})
