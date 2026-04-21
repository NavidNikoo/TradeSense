import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useAlertEvents } from '../hooks/useAlertEvents'

export function AppLayout() {
  const { user, signOutUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { unreadCount } = useAlertEvents()

  return (
    <div className="app-shell">
      <header className="app-topnav">
        <Link className="app-brand" to="/dashboard">TradeSense</Link>
        <nav className="app-nav-links">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/watchlist">Watchlist</NavLink>
          <NavLink to="/time-lapse">Time-Lapse</NavLink>
          <NavLink to="/alerts" className="app-nav-alerts">
            Alerts
            {unreadCount > 0 && (
              <span className="app-nav-badge" aria-label={`${unreadCount} unread alerts`}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
        <div className="app-nav-right">
          <button
            className="app-theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? '\u2600' : '\u263E'}
          </button>
          <span className="app-user-email">{user?.email}</span>
          <button
            className="app-logout-btn"
            type="button"
            onClick={signOutUser}
          >
            Log out
          </button>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
