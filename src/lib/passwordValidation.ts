/**
 * Password validation utility for consistent security across the app
 */

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePassword(password: string): PasswordValidationResult {
  if (password.length < 12) {
    return { valid: false, error: 'Password must be at least 12 characters' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  
  return { valid: true };
}

export function getPasswordRequirementsText(): string {
  return 'Min. 12 characters with uppercase, lowercase, and number';
}
