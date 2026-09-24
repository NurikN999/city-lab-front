import { useActionState, useState } from 'react'
import { ApiError } from '../../shared/lib/api'
import { login } from './api'
import styles from './ModelPage.module.css'
import { saveToken } from './session'

export function LoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  // email контролируемый — после неудачного входа он остаётся, пароль сбрасывается
  const [email, setEmail] = useState('')
  const [error, submit, isPending] = useActionState(async (_: string | null, form: FormData) => {
    try {
      const { token } = await login(String(form.get('email') ?? ''), String(form.get('password') ?? ''))
      saveToken(token)
      onLogin(token)
      return null
    } catch (e) {
      return e instanceof ApiError ? e.message : 'Не удалось войти.'
    }
  }, null)

  return (
    <form action={submit} className={styles.login}>
      <h1 className={styles.title}>Вход для акимата</h1>
      <p className={styles.hint}>Редактирование коэффициентов и стоимостей модели.</p>
      <label className={styles.field}>
        Email
        <input name="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>
      <label className={styles.field}>
        Пароль
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <button type="submit" className={styles.primary} disabled={isPending}>{isPending ? 'Входим…' : 'Войти'}</button>
    </form>
  )
}
