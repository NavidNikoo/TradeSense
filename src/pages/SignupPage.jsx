import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function SignupPage() {
  const { user, signUp } = useAuth()
  const [ fname, setFname ] = useState('')
  const [ lname, setLname ] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    console.log('handleSubmit fired', { email, password, fname, lname })
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    try {
      console.log('calling signUp...')
      await signUp(email, password, fname, lname)
    } catch (authError) {
      setError(authError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-page">
      <Link to="/">Back</Link>
      <h1>Create your account</h1>
      <p className="muted-label">Set up TradeSense in minutes.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
      <div style={{ display: 'flex', gap:'1rem' }}>
        <label style={{ flex: 1 }}>
          First Name
          <input 
            type="text"
            value={fname}
            onChange={(event) => setFname(event.target.value)}
            style={{ width:'100%' }}
          />
        </label>
        <label style={{ flex: 1 }}>
          Last Name
          <input 
            type="lname"
            value={lname}
            onChange={(event) => setLname(event.target.value)}
            style={{ width: '100%' }}
          />
        </label>
      </div>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <label>
          Confirm password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </section>
  )
}
