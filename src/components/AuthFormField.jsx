import { useState } from 'react';
import './AuthFormField.css';


export function AuthFormField({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  hint,
  required = false,
  autoComplete,
  disabled = false,
  showStrengthIndicator = false,
  strengthLevel = null,
  showPasswordToggle = false,
  onPasswordVisibilityChange = null
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  const handlePasswordToggle = () => {
    setIsPasswordVisible(!isPasswordVisible);
    if (onPasswordVisibilityChange) {
      onPasswordVisibilityChange(!isPasswordVisible);
    }
  };

  const actualType = type === 'password' && isPasswordVisible ? 'text' : type;
  const hasError = !!error;
  const isPasswordField = type === 'password';

  return (
    <div className={`auth-field-wrapper ${hasError ? 'has-error' : ''}`}>
      <div className="auth-field-header">
        <label htmlFor={id} className="auth-field-label">
          {label}
          {required && <span className="required-indicator">*</span>}
        </label>
        {isPasswordField && showPasswordToggle && (
          <button
            type="button"
            className="password-toggle"
            onClick={handlePasswordToggle}
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {isPasswordVisible ? '👁️' : '👁️‍🗨️'}
          </button>
        )}
      </div>

      <div className="auth-field-input-wrapper">
        <input
          id={id}
          type={actualType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          className={`auth-field-input ${hasError ? 'input-error' : ''}`}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
        {isPasswordField && showPasswordToggle && (
          <div className="password-visibility-indicator">
            {isPasswordVisible ? '✓ Visible' : '✗ Hidden'}
          </div>
        )}
      </div>

      {showStrengthIndicator && strengthLevel && (
        <div className={`strength-indicator strength-${strengthLevel.strength}`}>
          <div className="strength-bar">
            <div className={`strength-fill strength-fill-${strengthLevel.strength}`}></div>
          </div>
          <span className="strength-text">{strengthLevel.message}</span>
        </div>
      )}

      {hasError && (
        <p id={`${id}-error`} className="auth-field-error">
          ⚠ {error}
        </p>
      )}

      {hint && !hasError && (
        <p id={`${id}-hint`} className="auth-field-hint">
          ℹ {hint}
        </p>
      )}
    </div>
  );
}
