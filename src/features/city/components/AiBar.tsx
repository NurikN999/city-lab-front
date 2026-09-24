import { useActionState, useState } from 'react'
import { ApiError } from '../../../shared/lib/api'
import type { AiPlanResponse } from '../../../shared/lib/schemas'
import { planWithAi } from '../api'
import styles from './Panels.module.css'

export function AiBar({ onResult }: { onResult: (data: AiPlanResponse) => void }) {
  // Контролируемое поле: React 19 после action сбрасывает только неконтролируемые — запрос не пропадёт при ошибке
  const [prompt, setPrompt] = useState('')
  const [error, ask, isPending] = useActionState(async (_: string | null, form: FormData) => {
    try {
      onResult(await planWithAi(String(form.get('prompt') ?? '').trim()))
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
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
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
