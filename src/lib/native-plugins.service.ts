/**
 * BaytMiftah Native Plugins Service
 *
 * Wraps all Capacitor native plugins with graceful web browser fallbacks.
 * Works transparently across:
 *  - Android (Capacitor native)
 *  - iOS (Capacitor native)
 *  - Progressive Web App / Desktop browser (fallback)
 *
 * Always check `isNativePlatform()` before using native-only features.
 */

import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Lazy import biometric to avoid crashes on web
let BiometricAuth: any = null;
async function loadBiometric() {
  if (!BiometricAuth) {
    try {
      const mod = await import('capacitor-native-biometric');
      BiometricAuth = mod.NativeBiometric;
    } catch {
      BiometricAuth = null;
    }
  }
  return BiometricAuth;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CapturedPhoto {
  base64Data: string; // Always base64-encoded jpeg/png data URL
  format: 'jpeg' | 'png';
  webPath?: string; // only on native
}

export interface CapturedLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  timestamp: number;
}

export interface BiometricCredentials {
  username: string;
  password: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const nativePluginsService = {
  /**
   * Returns true when running inside Capacitor native container (Android/iOS).
   * Returns false on web/browser PWA.
   */
  isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  },

  getPlatform(): 'android' | 'ios' | 'web' {
    const p = Capacitor.getPlatform();
    if (p === 'android' || p === 'ios') return p;
    return 'web';
  },

  // ── Camera ──────────────────────────────────────────────────────────────────

  /**
   * Capture a photo using the device camera or file picker.
   * On native: uses @capacitor/camera (Camera API with JPEG encoding).
   * On web: returns the base64 data URL from a File object.
   *
   * @param source 'camera' uses rear camera, 'gallery' opens photo gallery.
   */
  async capturePhoto(
    source: 'camera' | 'gallery' = 'camera',
    quality = 85
  ): Promise<CapturedPhoto> {
    if (this.isNativePlatform()) {
      const photo = await Camera.getPhoto({
        quality,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        saveToGallery: false,
      });

      const base64 = photo.base64String || '';
      const format = (photo.format === 'png' ? 'png' : 'jpeg') as 'jpeg' | 'png';
      const prefix = `data:image/${format};base64,`;
      return {
        base64Data: base64.startsWith('data:') ? base64 : `${prefix}${base64}`,
        format,
        webPath: photo.webPath,
      };
    }

    // Web fallback — trigger programmatic file input
    return new Promise<CapturedPhoto>((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (source === 'camera') {
        input.setAttribute('capture', 'environment');
      }
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Data = e.target?.result as string;
          resolve({
            base64Data,
            format: file.type === 'image/png' ? 'png' : 'jpeg',
          });
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      };
      input.click();
    });
  },

  // ── Geolocation ─────────────────────────────────────────────────────────────

  /**
   * Get the current device GPS coordinates.
   * On native: uses @capacitor/geolocation (precise GPS).
   * On web: uses browser navigator.geolocation.
   */
  async getCurrentLocation(
    options: { timeout?: number; enableHighAccuracy?: boolean } = {}
  ): Promise<CapturedLocation> {
    const timeout = options.timeout ?? 12000;
    const highAccuracy = options.enableHighAccuracy ?? true;

    if (this.isNativePlatform()) {
      const position = await Geolocation.getCurrentPosition({
        timeout,
        enableHighAccuracy: highAccuracy,
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        timestamp: position.timestamp,
      };
    }

    // Web fallback
    return new Promise<CapturedLocation>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported in this browser'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            timestamp: pos.timestamp,
          }),
        (err) => reject(new Error(`Geolocation error: ${err.message}`)),
        { timeout, enableHighAccuracy: highAccuracy }
      );
    });
  },

  // ── Haptics ─────────────────────────────────────────────────────────────────

  /** Light tactile click — used on checklist condition button presses */
  async hapticLight(): Promise<void> {
    if (!this.isNativePlatform()) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Silently ignore if haptics not available
    }
  },

  /** Medium impact — MoMo payment confirmation, gate access granted */
  async hapticMedium(): Promise<void> {
    if (!this.isNativePlatform()) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {}
  },

  /** Heavy impact — error states, duplicate detection, deposit exceeded */
  async hapticHeavy(): Promise<void> {
    if (!this.isNativePlatform()) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {}
  },

  /** Success notification vibration — signed inspection, approved gate pass */
  async hapticSuccess(): Promise<void> {
    if (!this.isNativePlatform()) return;
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {}
  },

  /** Error/warning vibration — failed biometric, payment declined */
  async hapticError(): Promise<void> {
    if (!this.isNativePlatform()) return;
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch {}
  },

  // ── Biometric Auth ──────────────────────────────────────────────────────────

  /**
   * Check if this device supports biometric authentication.
   */
  async isBiometricAvailable(): Promise<boolean> {
    if (!this.isNativePlatform()) return false;
    try {
      const biometric = await loadBiometric();
      if (!biometric) return false;
      const result = await biometric.isAvailable();
      return result.isAvailable === true;
    } catch {
      return false;
    }
  },

  /**
   * Prompt the user to authenticate with biometrics (Fingerprint / Face ID).
   * Returns true if successfully authenticated, false otherwise.
   */
  async authenticateWithBiometric(
    options: {
      reason?: string;
      title?: string;
      subtitle?: string;
    } = {}
  ): Promise<boolean> {
    if (!this.isNativePlatform()) return false;
    try {
      const biometric = await loadBiometric();
      if (!biometric) return false;

      await biometric.verifyIdentity({
        reason: options.reason ?? 'Verify your identity to access BaytMiftah',
        title: options.title ?? 'BaytMiftah Authentication',
        subtitle: options.subtitle ?? 'Use your fingerprint or Face ID',
        negativeButtonText: 'Use Password',
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Securely store credentials in device Keystore (biometric-protected).
   */
  async saveBiometricCredentials(credentials: BiometricCredentials): Promise<void> {
    if (!this.isNativePlatform()) return;
    try {
      const biometric = await loadBiometric();
      if (!biometric) return;
      await biometric.setCredentials({
        username: credentials.username,
        password: credentials.password,
        server: 'com.baymiftah.app',
      });
    } catch (e) {
      console.warn('Failed to save biometric credentials', e);
    }
  },

  /**
   * Load credentials from Keystore after biometric verification.
   */
  async loadBiometricCredentials(): Promise<BiometricCredentials | null> {
    if (!this.isNativePlatform()) return null;
    try {
      const biometric = await loadBiometric();
      if (!biometric) return null;

      const authenticated = await this.authenticateWithBiometric({
        reason: 'Sign in to BaytMiftah with your biometrics',
        title: 'Quick Sign In',
      });

      if (!authenticated) return null;

      const creds = await biometric.getCredentials({
        server: 'com.baymiftah.app',
      });
      return { username: creds.username, password: creds.password };
    } catch {
      return null;
    }
  },

  /**
   * Clear stored biometric credentials from device Keystore.
   */
  async clearBiometricCredentials(): Promise<void> {
    if (!this.isNativePlatform()) return;
    try {
      const biometric = await loadBiometric();
      if (biometric) {
        await biometric.deleteCredentials({ server: 'com.baymiftah.app' });
      }
    } catch {}
  },
};
