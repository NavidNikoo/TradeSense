/**
 * Translates Firebase auth error codes into user-friendly messages
 * Also provides recovery suggestions for better UX
 */

export function getAuthErrorMessage(error) {
  const code = error.code || error.message;
  
  const errorMessages = {
    // Login errors
    'auth/user-not-found': {
      message: 'No account found with this email address.',
      suggestion: 'Please check your email or create a new account.',
      field: 'email'
    },
    'auth/wrong-password': {
      message: 'Incorrect password.',
      suggestion: 'Please try again or reset your password.',
      field: 'password'
    },
    'auth/invalid-credential': {
      message: 'Invalid email or password.',
      suggestion: 'Please check your credentials and try again.',
      field: null
    },
    
    // Signup errors
    'auth/email-already-in-use': {
      message: 'This email is already registered.',
      suggestion: 'Try logging in or use a different email address.',
      field: 'email'
    },
    'auth/weak-password': {
      message: 'Password is too weak.',
      suggestion: 'Use at least 6 characters with a mix of uppercase, lowercase, numbers, and symbols.',
      field: 'password'
    },
    'auth/invalid-email': {
      message: 'Invalid email address.',
      suggestion: 'Please enter a valid email format (e.g., user@example.com).',
      field: 'email'
    },
    
    // General errors
    'auth/too-many-requests': {
      message: 'Too many login attempts. Please try again later.',
      suggestion: 'Your account has been temporarily locked for security. Try again in a few minutes.',
      field: null
    },
    'auth/network-request-failed': {
      message: 'Network connection error.',
      suggestion: 'Please check your internet connection and try again.',
      field: null
    },
    'auth/operation-not-allowed': {
      message: 'This operation is not allowed.',
      suggestion: 'Please contact support if this issue persists.',
      field: null
    },
    'auth/invalid-api-key': {
      message: 'Configuration error. Please contact support.',
      suggestion: 'This is a system issue, not with your credentials.',
      field: null
    },
  };

  // Check if it's a known error
  if (errorMessages[code]) {
    return errorMessages[code];
  }

  // If error message contains specific Firebase errors, parse it
  if (error.message) {
    if (error.message.includes('weak-password')) {
      return errorMessages['auth/weak-password'];
    }
    if (error.message.includes('email-already-in-use')) {
      return errorMessages['auth/email-already-in-use'];
    }
    if (error.message.includes('too-many-requests')) {
      return errorMessages['auth/too-many-requests'];
    }
  }

  // Default error
  return {
    message: error.message || 'An authentication error occurred.',
    suggestion: 'Please try again or contact support if the problem persists.',
    field: null
  };
}

/**
 * Validates email format
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates password strength and provides feedback
 */
export function validatePassword(password) {
  const feedback = {
    isValid: false,
    strength: 'weak',
    message: '',
    suggestions: []
  };

  if (!password) {
    feedback.message = 'Password is required.';
    feedback.suggestions = ['Enter a password'];
    return feedback;
  }

  if (password.length < 6) {
    feedback.message = `Password must be at least 6 characters (${password.length}/6).`;
    feedback.suggestions.push('Add more characters');
  } else if (password.length < 8) {
    feedback.strength = 'fair';
  } else {
    feedback.strength = 'good';
  }

  if (!/[a-z]/.test(password)) {
    feedback.suggestions.push('Add lowercase letters');
  }
  if (!/[A-Z]/.test(password)) {
    feedback.suggestions.push('Add uppercase letters');
  }
  if (!/\d/.test(password)) {
    feedback.suggestions.push('Add numbers');
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    feedback.suggestions.push('Add special characters');
  }

  if (password.length >= 6 && password.length < 12) {
    feedback.message = 'Password strength: Fair';
  } else if (password.length >= 12) {
    feedback.strength = 'strong';
    if (feedback.suggestions.length === 0) {
      feedback.message = 'Password strength: Strong!';
      feedback.isValid = true;
    } else {
      feedback.message = 'Password strength: Good';
      feedback.isValid = true;
    }
  }

  if (password.length >= 6 && feedback.suggestions.length === 0) {
    feedback.isValid = true;
    feedback.message = 'Password strength: Strong!';
  }

  return feedback;
}

/**
 * Validates passwords match
 */
export function validatePasswordsMatch(password, confirmPassword) {
  if (password !== confirmPassword) {
    return {
      isValid: false,
      message: 'Passwords do not match.'
    };
  }
  return {
    isValid: true,
    message: 'Passwords match!'
  };
}
