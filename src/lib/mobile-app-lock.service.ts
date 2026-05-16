import {
  AndroidBiometryStrength,
  BiometricAuth,
  BiometryType,
  type CheckBiometryResult,
} from "@aparajita/capacitor-biometric-auth";
import { Preferences } from "@capacitor/preferences";

interface MobileAppLockRecord {
  enabled: boolean;
  salt?: string;
  passcodeHash?: string;
  lockedAt?: string | null;
  updatedAt: string;
}

export interface MobileAppLockStatus {
  enabled: boolean;
  locked: boolean;
  lockedAt?: string | null;
  biometryAvailable: boolean;
  biometryLabel: string;
  deviceCredentialAvailable: boolean;
  nativeUnlockAvailable: boolean;
  nativeUnlockReason?: string;
}

const APP_LOCK_KEY = "propertyhub_mobile_app_lock";

function emitAppLockChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("propertyhub:app-lock-change"));
  }
}

function createSalt() {
  const bytes = new Uint8Array(16);

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPasscode(passcode: string, salt: string) {
  const encoder = new TextEncoder();
  const input = encoder.encode(`${salt}:${passcode}`);

  if (typeof crypto !== "undefined" && crypto.subtle) {
    return toHex(await crypto.subtle.digest("SHA-256", input));
  }

  return btoa(`${salt}:${passcode}`);
}

async function readRecord(): Promise<MobileAppLockRecord | null> {
  let rawValue: string | null = null;

  try {
    rawValue = (await Preferences.get({ key: APP_LOCK_KEY })).value;
  } catch {
    if (typeof window !== "undefined") {
      rawValue = window.localStorage.getItem(APP_LOCK_KEY);
    }
  }

  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as MobileAppLockRecord;
  } catch {
    return null;
  }
}

async function writeRecord(record: MobileAppLockRecord | null) {
  try {
    if (record) {
      await Preferences.set({ key: APP_LOCK_KEY, value: JSON.stringify(record) });
    } else {
      await Preferences.remove({ key: APP_LOCK_KEY });
    }
  } catch {
    if (typeof window === "undefined") return;

    if (record) {
      window.localStorage.setItem(APP_LOCK_KEY, JSON.stringify(record));
    } else {
      window.localStorage.removeItem(APP_LOCK_KEY);
    }
  }

  emitAppLockChange();
}

function getBiometryLabel(type: BiometryType) {
  switch (type) {
    case BiometryType.faceId:
    case BiometryType.faceAuthentication:
      return "Face unlock";
    case BiometryType.touchId:
    case BiometryType.fingerprintAuthentication:
      return "Fingerprint";
    case BiometryType.irisAuthentication:
      return "Iris unlock";
    default:
      return "Device unlock";
  }
}

async function checkNativeUnlock(): Promise<{
  biometryAvailable: boolean;
  biometryLabel: string;
  deviceCredentialAvailable: boolean;
  nativeUnlockAvailable: boolean;
  nativeUnlockReason?: string;
}> {
  try {
    const info: CheckBiometryResult = await BiometricAuth.checkBiometry();
    const nativeUnlockAvailable = info.isAvailable || info.deviceIsSecure;

    return {
      biometryAvailable: info.isAvailable,
      biometryLabel: getBiometryLabel(info.biometryType),
      deviceCredentialAvailable: info.deviceIsSecure,
      nativeUnlockAvailable,
      nativeUnlockReason: nativeUnlockAvailable
        ? undefined
        : info.reason || "Device unlock is not available on this device.",
    };
  } catch (error) {
    return {
      biometryAvailable: false,
      biometryLabel: "Device unlock",
      deviceCredentialAvailable: false,
      nativeUnlockAvailable: false,
      nativeUnlockReason:
        error instanceof Error ? error.message : "Device unlock is not available.",
    };
  }
}

export const mobileAppLockService = {
  async getStatus(): Promise<MobileAppLockStatus> {
    const [record, nativeUnlock] = await Promise.all([readRecord(), checkNativeUnlock()]);

    return {
      enabled: Boolean(record?.enabled && record.passcodeHash && record.salt),
      locked: Boolean(record?.enabled && record.lockedAt),
      lockedAt: record?.lockedAt || null,
      ...nativeUnlock,
    };
  },

  async enable(passcode: string) {
    if (passcode.trim().length < 4) {
      throw new Error("Use at least 4 digits or characters for your app lock.");
    }

    const salt = createSalt();
    const passcodeHash = await hashPasscode(passcode, salt);

    await writeRecord({
      enabled: true,
      salt,
      passcodeHash,
      lockedAt: null,
      updatedAt: new Date().toISOString(),
    });
  },

  async disable() {
    await writeRecord(null);
  },

  async lock() {
    const record = await readRecord();
    if (!record?.enabled) return;

    await writeRecord({
      ...record,
      lockedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },

  async verify(passcode: string) {
    const record = await readRecord();
    if (!record?.enabled || !record.passcodeHash || !record.salt) return false;

    const passcodeHash = await hashPasscode(passcode, record.salt);
    const verified = passcodeHash === record.passcodeHash;

    if (verified) {
      await writeRecord({
        ...record,
        lockedAt: null,
        updatedAt: new Date().toISOString(),
      });
    }

    return verified;
  },

  async unlockWithDevice() {
    const record = await readRecord();
    if (!record?.enabled) return false;

    try {
      await BiometricAuth.authenticate({
        reason: "Unlock your Property Hub mobile workspace",
        androidTitle: "Unlock Property Hub",
        androidSubtitle: "Use biometrics or your device lock",
        androidBiometryStrength: AndroidBiometryStrength.weak,
        allowDeviceCredential: true,
        iosFallbackTitle: "Use device passcode",
      });

      await writeRecord({
        ...record,
        lockedAt: null,
        updatedAt: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error("Device unlock failed:", error);
      return false;
    }
  },
};
