const KEY = 'city-lab-token'

// sessionStorage может быть недоступен (приватный режим, запрет cookies) — тогда живём без сохранения
export function readToken(): string | null {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function saveToken(token: string): void {
  try {
    sessionStorage.setItem(KEY, token)
  } catch (error) {
    console.warn('sessionStorage unavailable, token kept only in memory', error)
  }
}

export function clearToken(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch (error) {
    console.warn('sessionStorage unavailable', error)
  }
}
