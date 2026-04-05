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
        <header className="topbar" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div>
              <p className="muted-label">Signed in as</p>
              <p className="user-email">{user?.email}</p>
            </div>
          </div>
            <h1 className="name-display" style={{ position: 'absolute', left: '57%', transform: 'translateX(-50%)' }}>
              Welcome {user?.displayName ?? 'User'}
            </h1>
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
