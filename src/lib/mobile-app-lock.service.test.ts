import { beforeEach, describe, expect, it, vi } from "vitest";
import { mobileAppLockService } from "./mobile-app-lock.service";

const preferenceStore = vi.hoisted(() => new Map<string, string>());
const biometricState = vi.hoisted(() => ({
  authenticate: vi.fn(async () => undefined),
  checkResult: {
    isAvailable: true,
    strongBiometryIsAvailable: true,
    biometryType: 2,
    biometryTypes: [2],
    deviceIsSecure: true,
    reason: "",
    code: "",
    strongReason: "",
    strongCode: "",
  },
}));

vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({
      value: preferenceStore.get(key) || null,
    })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      preferenceStore.set(key, value);
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      preferenceStore.delete(key);
    }),
  },
}));

vi.mock("@aparajita/capacitor-biometric-auth", () => ({
  AndroidBiometryStrength: {
    weak: 0,
    strong: 1,
  },
  BiometricAuth: {
    authenticate: biometricState.authenticate,
    checkBiometry: vi.fn(async () => biometricState.checkResult),
  },
  BiometryType: {
    none: 0,
    touchId: 1,
    faceId: 2,
    fingerprintAuthentication: 3,
    faceAuthentication: 4,
    irisAuthentication: 5,
  },
}));

describe("mobileAppLockService", () => {
  beforeEach(() => {
    preferenceStore.clear();
    biometricState.authenticate.mockClear();
    biometricState.checkResult = {
      isAvailable: true,
      strongBiometryIsAvailable: true,
      biometryType: 2,
      biometryTypes: [2],
      deviceIsSecure: true,
      reason: "",
      code: "",
      strongReason: "",
      strongCode: "",
    };
  });

  it("enables, locks, verifies, and disables the local app lock", async () => {
    await mobileAppLockService.enable("1234");
    expect(await mobileAppLockService.getStatus()).toMatchObject({
      enabled: true,
      locked: false,
    });

    await mobileAppLockService.lock();
    expect(await mobileAppLockService.getStatus()).toMatchObject({
      enabled: true,
      locked: true,
    });

    expect(await mobileAppLockService.verify("0000")).toBe(false);
    expect(await mobileAppLockService.getStatus()).toMatchObject({
      enabled: true,
      locked: true,
    });

    expect(await mobileAppLockService.verify("1234")).toBe(true);
    expect(await mobileAppLockService.getStatus()).toMatchObject({
      enabled: true,
      locked: false,
    });

    await mobileAppLockService.disable();
    expect(await mobileAppLockService.getStatus()).toMatchObject({
      enabled: false,
      locked: false,
      lockedAt: null,
      biometryAvailable: true,
      biometryLabel: "Face unlock",
      deviceCredentialAvailable: true,
      nativeUnlockAvailable: true,
    });
  });

  it("rejects very short passcodes", async () => {
    await expect(mobileAppLockService.enable("12")).rejects.toThrow(
      "Use at least 4 digits or characters"
    );
  });

  it("unlocks with native biometry or device credentials", async () => {
    await mobileAppLockService.enable("1234");
    await mobileAppLockService.lock();

    await expect(mobileAppLockService.unlockWithDevice()).resolves.toBe(true);
    expect(biometricState.authenticate).toHaveBeenCalledWith(
      expect.objectContaining({
        allowDeviceCredential: true,
        androidTitle: "Unlock BaytMiftah",
      })
    );
    expect(await mobileAppLockService.getStatus()).toMatchObject({
      enabled: true,
      locked: false,
    });
  });
});
