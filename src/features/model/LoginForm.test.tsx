import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LoginForm } from './LoginForm'
import { readToken } from './session'

describe('LoginForm', () => {
  it('shows the server error on a wrong password', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'Неверный email или пароль.', errors: { email: ['Неверный email или пароль.'] } }), { status: 422 })))
    render(<LoginForm onLogin={vi.fn()} />)

    await userEvent.type(screen.getByLabelText('Email'), 'akimat@citylab.kz')
    await userEvent.type(screen.getByLabelText('Пароль'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный email или пароль.')
  })

  it('stores the token and reports login', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ token: '1|abc', name: 'Акимат' }), { status: 200 })))
    const onLogin = vi.fn()
    render(<LoginForm onLogin={onLogin} />)

    await userEvent.type(screen.getByLabelText('Email'), 'akimat@citylab.kz')
    await userEvent.type(screen.getByLabelText('Пароль'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }))

    await vi.waitFor(() => expect(onLogin).toHaveBeenCalledWith('1|abc'))
    expect(readToken()).toBe('1|abc')
  })
})
