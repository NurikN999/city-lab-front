import { lazy, Suspense } from 'react'
import styles from './App.module.css'
import { ErrorBoundary } from './ErrorBoundary'
import { Header } from './Header'
import { useHashRoute } from './useHashRoute'

const CityPage = lazy(() => import('../features/city/CityPage'))
const ComparePage = lazy(() => import('../features/compare/ComparePage'))
const ModelPage = lazy(() => import('../features/model/ModelPage'))
const ReportPage = lazy(() => import('../features/complaints/ReportPage'))

export function App() {
  const route = useHashRoute()

  return (
    <div className={styles.shell}>
      <Header page={route.page} />
      <main className={styles.main}>
        <ErrorBoundary key={route.page}>
          <Suspense fallback={<p className={styles.status}>Загрузка…</p>}>
            {route.page === 'city' && <CityPage />}
            {route.page === 'compare' && <ComparePage ids={route.ids} />}
            {route.page === 'model' && <ModelPage />}
            {route.page === 'report' && <ReportPage />}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  )
}
