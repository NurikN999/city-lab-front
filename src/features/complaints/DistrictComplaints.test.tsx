import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DistrictComplaints } from './DistrictComplaints'

const item = { id: 5, district_id: 11, category: 'water' as const, text: 'Нет воды с утра', status: 'new' as const, created_at: new Date().toISOString() }

describe('DistrictComplaints', () => {
  it('lists residents complaints without moderation for guests', () => {
    render(<DistrictComplaints complaints={[item]} onStatus={null} />)

    expect(screen.getByText('Жалобы жителей · 1')).toBeInTheDocument()
    expect(screen.getByText('Нет воды с утра')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Решено/ })).not.toBeInTheDocument()
  })

  it('lets the akimat resolve a complaint', async () => {
    const onStatus = vi.fn()
    render(<DistrictComplaints complaints={[item]} onStatus={onStatus} />)

    await userEvent.click(screen.getByRole('button', { name: 'Решено: Нет воды с утра' }))

    expect(onStatus).toHaveBeenCalledWith(5, 'resolved')
  })

  it('renders nothing when the district is quiet', () => {
    const { container } = render(<DistrictComplaints complaints={[]} onStatus={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('sends a complaint to the city builder', async () => {
    const onSolve = vi.fn()
    render(<DistrictComplaints complaints={[{ ...item, category: 'transport' }]} onStatus={null} onSolve={onSolve} />)

    await userEvent.click(screen.getByRole('button', { name: 'Решить в конструкторе: Нет воды с утра' }))

    expect(onSolve).toHaveBeenCalledWith(expect.objectContaining({ id: 5 }))
  })

  it('shows which scenario took the complaint into work', () => {
    render(<DistrictComplaints complaints={[{ ...item, status: 'accepted', scenario_id: 9, scenario_name: 'Конструктор: Остановка' }]} onStatus={null} onSolve={vi.fn()} />)

    expect(screen.getByText('Принята · «Конструктор: Остановка»')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Решить в конструкторе/ })).not.toBeInTheDocument()
  })
})
