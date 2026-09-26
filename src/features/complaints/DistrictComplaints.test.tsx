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
})
