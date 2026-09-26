import { Capacitor } from "@capacitor/core";

const NATIVE_STORAGE_SERVER = "com.baymiftah.app.auth";

type NativeBiometricApi = {
  setCredentials(input: { username: string; password: string; server: string }): Promise<void>;
  getCredentials(input: { server: string }): Promise<{ username: string; password: string }>;
  deleteCredentials(input: { server: string }): Promise<void>;
};

let nativeBiometricPromise: Promise<NativeBiometricApi | null> | null = null;

async function getNativeBiometric() {
  if (!Capacitor.isNativePlatform()) return null;
  nativeBiometricPromise ??= import("capacitor-native-biometric")
    .then((module) => module.NativeBiometric as NativeBiometricApi)
    .catch(() => null);
  return nativeBiometricPromise;
}

export const secureAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    const nativeBiometric = await getNativeBiometric();
    if (!nativeBiometric) return localStorage.getItem(key);

    try {
      const credentials = await nativeBiometric.getCredentials({ server: NATIVE_STORAGE_SERVER });
      return credentials.username === key ? credentials.password : null;
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    const nativeBiometric = await getNativeBiometric();
    if (!nativeBiometric) {
      localStorage.setItem(key, value);
      return;
    }

    await nativeBiometric.setCredentials({
      username: key,
      password: value,
      server: NATIVE_STORAGE_SERVER,
    });
  },

  async removeItem(key: string): Promise<void> {
    const nativeBiometric = await getNativeBiometric();
    if (!nativeBiometric) {
      localStorage.removeItem(key);
      return;
    }

    try {
      const credentials = await nativeBiometric.getCredentials({ server: NATIVE_STORAGE_SERVER });
      if (credentials.username === key) {
        await nativeBiometric.deleteCredentials({ server: NATIVE_STORAGE_SERVER });
      }
    } catch {
      // Treat missing native credentials as already removed.
    }
  },
};