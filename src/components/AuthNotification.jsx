import { useEffect, useState } from 'react';
import './AuthNotification.css';

export function AuthNotification({
  type = 'error', // 'error', 'warning', 'success', 'info'
  title,
  message,
  suggestion,
  onDismiss,
  autoCloseDuration = 6000,
  dismissible = true,
  showIcon = true
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoCloseDuration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoCloseDuration);
      return () => clearTimeout(timer);
    }
  }, [autoCloseDuration]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!isVisible) return null;

  const icons = {
    error: '❌',
    warning: '⚠️',
    success: '✅',
    info: 'ℹ️'
  };

  return (
    <div className={`auth-notification notification-${type}`} role="alert">
      <div className="notification-content">
        {showIcon && <span className="notification-icon">{icons[type]}</span>}
        <div className="notification-text">
          {title && <p className="notification-title">{title}</p>}
          {message && <p className="notification-message">{message}</p>}
          {suggestion && <p className="notification-suggestion">{suggestion}</p>}
        </div>
      </div>
      {dismissible && (
        <button
          className="notification-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          type="button"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/**
 * Notification container component to manage multiple notifications
 */
export function AuthNotificationContainer({ notifications, onDismiss }) {
  return (
    <div className="auth-notification-container">
      {notifications.map((notification, index) => (
        <AuthNotification
          key={index}
          {...notification}
          onDismiss={() => onDismiss(index)}
        />
      ))}
    </div>
  );
}
