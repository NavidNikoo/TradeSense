import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function AppLayout() {
  const { user, signOutUser } = useAuth()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1 className="brand">TradeSense</h1>
        <nav className="nav-links">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/watchlist">Watchlist</NavLink>
          <NavLink to="/time-lapse">Time-Lapse</NavLink>
        </nav>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div>
            <p className="muted-label">Signed in as</p>
            <p className="user-email">{user?.email}</p>
          </div>
          <button type="button" onClick={signOutUser}>
            Log out
          </button>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
