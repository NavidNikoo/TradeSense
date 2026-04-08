import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthFormField } from '../components/AuthFormField';
import { AuthNotification } from '../components/AuthNotification';
import { getAuthErrorMessage, validateEmail } from '../utils/authErrorHandler';

export function LoginPage() {
  const { user, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  function validateForm() {
    const newErrors = {};

    if (!email) {
      newErrors.email = 'Email is required.';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setNotification(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await signIn(email, password);
      setNotification({
        type: 'success',
        title: 'Success!',
        message: 'You have been signed in successfully.',
        autoCloseDuration: 2000
      });
    } catch (authError) {
      const errorInfo = getAuthErrorMessage(authError);
      const newErrors = {};
      if (errorInfo.field) {
        newErrors[errorInfo.field] = errorInfo.message;
      }
      setErrors(newErrors);
      setNotification({
        type: 'error',
        title: 'Sign In Failed',
        message: errorInfo.message,
        suggestion: errorInfo.suggestion,
        autoCloseDuration: 6000
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <Link className="auth-back" to="/">&larr; Back to home</Link>

      {notification && <AuthNotification {...notification} />}

      <div className="auth-card">
        <Link className="auth-brand" to="/">TradeSense</Link>

        <h1 className="auth-heading">Welcome back</h1>
        <p className="auth-sub">
          {location.state?.message || 'Sign in to access your dashboard.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <AuthFormField
            id="login-email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors({ ...errors, email: '' });
            }}
            error={errors.email}
            autoComplete="email"
            required
          />

          <AuthFormField
            id="login-password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors({ ...errors, password: '' });
            }}
            error={errors.password}
            autoComplete="current-password"
            required
            showPasswordToggle
          />

          <button 
            className="auth-submit" 
            type="submit" 
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Signing in&hellip;
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="auth-footer">
          Don&rsquo;t have an account?{' '}
          <Link to="/signup">Create one</Link>
        </p>
      </div>
    </div>
  );
}
