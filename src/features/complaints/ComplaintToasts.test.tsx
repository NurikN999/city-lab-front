import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ComplaintToasts } from './ComplaintToasts'

const item = { id: 5, district_id: 11, category: 'transport' as const, text: 'Пробка у школы утром', status: 'new' as const, created_at: new Date().toISOString() }

describe('ComplaintToasts', () => {
  it('announces a new complaint and flies to its district on click', async () => {
    const onOpen = vi.fn()
    render(<ComplaintToasts items={[item]} districtName={() => '12 мкр'} onOpen={onOpen} onDismiss={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent('Новая жалоба · 12 мкр')
    await userEvent.click(screen.getByRole('button', { name: /Пробка у школы утром/ }))

    expect(onOpen).toHaveBeenCalledWith(11)
  })
})
