const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "12345678",
  "123456789",
  "qwerty123",
  "baytmiftah",
  "letmein",
  "welcome1",
]);

export type PasswordValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Include at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Include at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Include at least one number");
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Include at least one special character");
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push("This password is too common");
  }

  return { valid: errors.length === 0, errors };
}

export function isEmailVerified(user: { email_confirmed_at?: string | null } | null) {
  return Boolean(user?.email_confirmed_at);
}

export function isUserBanned(profile: { banned?: boolean | null } | null) {
  return Boolean(profile?.banned);
}
