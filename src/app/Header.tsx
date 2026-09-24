import styles from './Header.module.css'
import type { AppRoute } from './useHashRoute'

const LINKS = [
  { page: 'city', href: '#/', label: 'Город' },
  { page: 'compare', href: '#/compare', label: 'Сравнение' },
  { page: 'model', href: '#/model', label: 'Модель' },
] as const

export function Header({ page }: { page: AppRoute['page'] }) {
  return (
    <header className={styles.header}>
      <a href="#/" className={styles.brand}>
        <span className={styles.logo} aria-hidden="true" />
        Aktau City Lab
      </a>
      <nav aria-label="Разделы">
        <ul className={styles.nav}>
          {LINKS.map((link) => (
            <li key={link.page}>
              <a href={link.href} className={styles.link} aria-current={link.page === page ? 'page' : undefined}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <span className={styles.note}>Районы — OpenStreetMap · метрики — демо</span>
    </header>
  )
}
