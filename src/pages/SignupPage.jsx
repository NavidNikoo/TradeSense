import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthFormField } from '../components/AuthFormField';
import { AuthNotification } from '../components/AuthNotification';
import { 
  getAuthErrorMessage, 
  validateEmail, 
  validatePassword, 
  validatePasswordsMatch 
} from '../utils/authErrorHandler';

export function SignupPage() {
  const { user, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [passwordsMatch, setPasswordsMatch] = useState(null);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  function handlePasswordChange(e) {
    const newPassword = e.target.value;
    setPassword(newPassword);
    
    // Update password strength indicator
    const strength = validatePassword(newPassword);
    setPasswordStrength(strength);
    
    // Check if passwords match
    if (confirmPassword) {
      const match = validatePasswordsMatch(newPassword, confirmPassword);
      setPasswordsMatch(match);
    }
    
    // Clear password error
    if (errors.password) {
      setErrors({ ...errors, password: '' });
    }
  }

  function handleConfirmPasswordChange(e) {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    
    // Check if passwords match
    const match = validatePasswordsMatch(password, newConfirmPassword);
    setPasswordsMatch(match);
    
    // Clear confirm password error
    if (errors.confirmPassword) {
      setErrors({ ...errors, confirmPassword: '' });
    }
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
    } else {
      const strength = validatePassword(password);
      if (!strength.isValid) {
        newErrors.password = strength.message;
      }
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else {
      const match = validatePasswordsMatch(password, confirmPassword);
      if (!match.isValid) {
        newErrors.confirmPassword = match.message;
      }
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
      await signUp(email, password);
      setNotification({
        type: 'success',
        title: 'Account Created!',
        message: 'Your account has been created successfully.',
        suggestion: 'Redirecting to dashboard...',
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
        title: 'Sign Up Failed',
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

        <h1 className="auth-heading">Create your account</h1>
        <p className="auth-sub">Start exploring the market in minutes.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <AuthFormField
            id="signup-email"
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
            id="signup-password"
            label="Password"
            type="password"
            placeholder="Create a strong password"
            value={password}
            onChange={handlePasswordChange}
            error={errors.password}
            autoComplete="new-password"
            required
            showPasswordToggle
            showStrengthIndicator={password.length > 0}
            strengthLevel={passwordStrength}
          />

          <AuthFormField
            id="signup-confirm"
            label="Confirm Password"
            type="password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            error={errors.confirmPassword}
            hint={
              confirmPassword && passwordsMatch?.isValid
                ? '✓ Passwords match!'
                : confirmPassword && passwordsMatch && !passwordsMatch.isValid
                ? '✗ Passwords do not match'
                : 'Must match password above'
            }
            autoComplete="new-password"
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
                Creating account&hellip;
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
