/**
 * Password Security Utility
 * 
 * Checks passwords against the HaveIBeenPwned API using k-Anonymity.
 * Only the first 5 characters of the SHA-1 hash are sent to the API,
 * so the actual password is never exposed.
 * 
 * Also enforces basic password strength requirements.
 */

// Common weak passwords to reject immediately (top 20)
const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', '123456789', '1234567890',
  'qwerty', 'abc123', 'password1', 'iloveyou', '000000',
  'admin', 'letmein', 'welcome', 'monkey', 'dragon',
  'master', 'login', 'princess', 'football', 'shadow'
]);

/**
 * Hash a string using SHA-1 (Web Crypto API)
 * @param {string} message 
 * @returns {Promise<string>} Uppercase hex SHA-1 hash
 */
async function sha1(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Check if password has been found in known data breaches
 * Uses the HaveIBeenPwned Passwords API with k-Anonymity
 * (only first 5 chars of SHA-1 hash are sent)
 * 
 * @param {string} password - The password to check
 * @returns {Promise<{breached: boolean, count: number}>} 
 *   breached: true if found in breaches
 *   count: number of times seen in breaches (0 if not found)
 */
export async function checkPasswordBreach(password) {
  try {
    const hash = await sha1(password);
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' } // Adds padding to prevent response-length analysis
    });

    if (!response.ok) {
      // If API is unavailable, don't block the user — just skip the check
      console.warn('HIBP API unavailable, skipping breach check');
      return { breached: false, count: 0 };
    }

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        return { breached: true, count: parseInt(count.trim(), 10) };
      }
    }

    return { breached: false, count: 0 };
  } catch (error) {
    // Network error — don't block signup, just log
    console.warn('Password breach check failed:', error.message);
    return { breached: false, count: 0 };
  }
}

/**
 * Validate password strength
 * @param {string} password 
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validatePasswordStrength(password) {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a stronger one');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Full password security check: strength + breach detection
 * Call this before supabase.auth.signUp()
 * 
 * @param {string} password 
 * @returns {Promise<{safe: boolean, errors: string[]}>}
 */
export async function validatePassword(password) {
  // Step 1: Basic strength checks (instant)
  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    return { safe: false, errors: strength.errors };
  }

  // Step 2: Breach check via HIBP API
  const breach = await checkPasswordBreach(password);
  if (breach.breached) {
    return {
      safe: false,
      errors: [
        `This password has appeared in ${breach.count.toLocaleString()} known data breaches. Please choose a different password.`
      ]
    };
  }

  return { safe: true, errors: [] };
}
