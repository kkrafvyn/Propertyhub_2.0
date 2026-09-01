import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nativePluginsService } from './native-plugins.service';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Mock Capacitor plugins
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn(),
  },
}));

vi.mock('@capacitor/camera', () => ({
  Camera: {
    getPhoto: vi.fn(),
  },
  CameraResultType: {
    Base64: 'base64',
    Uri: 'uri',
  },
  CameraSource: {
    Camera: 'camera',
    Photos: 'photos',
  },
}));

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    getCurrentPosition: vi.fn(),
  },
}));

vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn(),
    notification: vi.fn(),
  },
  ImpactStyle: {
    Light: 'LIGHT',
    Medium: 'MEDIUM',
    Heavy: 'HEAVY',
  },
  NotificationType: {
    Success: 'SUCCESS',
    Error: 'ERROR',
  },
}));

describe('nativePluginsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Platform Detection', () => {
    it('returns true when Capacitor is running on native device', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      expect(nativePluginsService.isNativePlatform()).toBe(true);
    });

    it('returns false when running on web browser', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
      expect(nativePluginsService.isNativePlatform()).toBe(false);
    });

    it('resolves platform identifier accurately', () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
      expect(nativePluginsService.getPlatform()).toBe('android');

      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
      expect(nativePluginsService.getPlatform()).toBe('ios');

      vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
      expect(nativePluginsService.getPlatform()).toBe('web');
    });
  });

  describe('Camera Capture on Native', () => {
    it('calls Camera.getPhoto and formats base64 data correctly', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Camera.getPhoto).mockResolvedValue({
        base64String: 'testBase64StringData',
        format: 'jpeg',
        webPath: 'capacitor://localhost/_capacitor_file_/photo.jpg',
      } as any);

      const photo = await nativePluginsService.capturePhoto('camera', 90);

      expect(Camera.getPhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          quality: 90,
          allowEditing: false,
          source: 'camera',
        })
      );
      expect(photo.base64Data).toBe('data:image/jpeg;base64,testBase64StringData');
      expect(photo.format).toBe('jpeg');
      expect(photo.webPath).toBe('capacitor://localhost/_capacitor_file_/photo.jpg');
    });
  });

  describe('Geolocation on Native', () => {
    it('calls Geolocation.getCurrentPosition with high accuracy and returns coords', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue({
        coords: {
          latitude: 5.6037,
          longitude: -0.1870,
          accuracy: 5,
          altitude: 45,
        },
        timestamp: 1720000000000,
      } as any);

      const loc = await nativePluginsService.getCurrentLocation();

      expect(Geolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.objectContaining({
          enableHighAccuracy: true,
        })
      );
      expect(loc.latitude).toBe(5.6037);
      expect(loc.longitude).toBe(-0.1870);
      expect(loc.accuracy).toBe(5);
      expect(loc.timestamp).toBe(1720000000000);
    });
  });

  describe('Haptics', () => {
    it('triggers light impact on native platform', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      await nativePluginsService.hapticLight();
      expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Light });
    });

    it('triggers success notification on native platform', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      await nativePluginsService.hapticSuccess();
      expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Success });
    });

    it('skips haptic calls on web without throwing', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
      await expect(nativePluginsService.hapticLight()).resolves.toBeUndefined();
      expect(Haptics.impact).not.toHaveBeenCalled();
    });
  });
});
