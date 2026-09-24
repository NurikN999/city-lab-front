import { useActionState } from 'react'
import { ApiError } from '../../../shared/lib/api'
import type { AiPlanResponse } from '../../../shared/lib/schemas'
import { planWithAi } from '../api'
import styles from './Panels.module.css'

export function AiBar({ onResult }: { onResult: (data: AiPlanResponse) => void }) {
  const [error, ask, isPending] = useActionState(async (_: string | null, form: FormData) => {
    const prompt = String(form.get('prompt') ?? '').trim()
    try {
      onResult(await planWithAi(prompt))
      return null
    } catch (e) {
      return e instanceof ApiError ? e.message : 'City AI сейчас недоступен.'
    }
  }, null)

  return (
    <form action={ask} className={`${styles.panel} ${styles.aiBar}`}>
      <label htmlFor="ai-prompt" className={styles.aiLabel}>City AI</label>
      <input
        id="ai-prompt"
        name="prompt"
        required
        minLength={5}
        maxLength={500}
        placeholder="Уменьши пробки в 12 мкр, бюджет 100 млн ₸"
        className={styles.aiInput}
      />
      <button type="submit" className={styles.simulate} disabled={isPending}>{isPending ? 'Считаю варианты…' : 'Спросить'}</button>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </form>
  )
}
