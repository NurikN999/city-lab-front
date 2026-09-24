import { Component, type ReactNode } from 'react'
import styles from './App.module.css'

type ErrorBoundaryState = { hasError: boolean }

// Классовый компонент — единственный способ поймать ошибку рендера или упавший lazy-чанк в React
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('UI crashed', error)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div role="alert" className={styles.status}>
        <p>Что-то пошло не так. Обновите страницу — данные на сервере не потеряны.</p>
        <button type="button" onClick={() => window.location.reload()}>Перезагрузить</button>
      </div>
    )
  }
}
