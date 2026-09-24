import { lazy, Suspense } from 'react'
import styles from './App.module.css'
import { Header } from './Header'
import { useHashRoute } from './useHashRoute'

const CityPage = lazy(() => import('../features/city/CityPage'))
const ComparePage = lazy(() => import('../features/compare/ComparePage'))
const ModelPage = lazy(() => import('../features/model/ModelPage'))

export function App() {
  const route = useHashRoute()

  return (
    <div className={styles.shell}>
      <Header page={route.page} />
      <main className={styles.main}>
        <Suspense fallback={<p className={styles.status}>Загрузка…</p>}>
          {route.page === 'city' && <CityPage />}
          {route.page === 'compare' && <ComparePage ids={route.ids} />}
          {route.page === 'model' && <ModelPage />}
        </Suspense>
      </main>
    </div>
  )
}
