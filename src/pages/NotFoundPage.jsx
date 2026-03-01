import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="auth-page">
      <h1>Page not found</h1>
      <p className="muted-label">The page you requested does not exist.</p>
      <Link to="/dashboard">Back to dashboard</Link>
    </section>
  )
}
