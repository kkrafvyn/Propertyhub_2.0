const APP_LOCK_KEY = "bm_biometric_app_lock";

export function isBiometricAppLockEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(APP_LOCK_KEY) === "true";
}

export function setBiometricAppLockEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  if (enabled) localStorage.setItem(APP_LOCK_KEY, "true");
  else localStorage.removeItem(APP_LOCK_KEY);
}
