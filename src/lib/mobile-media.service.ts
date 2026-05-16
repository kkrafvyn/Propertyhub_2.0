import { Camera, CameraResultType, CameraSource, type Photo } from "@capacitor/camera";

export interface MobileCapturedPhoto {
  id: string;
  path?: string;
  webPath?: string;
  format?: string;
  capturedAt: string;
}

function createCaptureId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `mobile-photo-${Date.now()}`;
}

export const mobileMediaService = {
  async capturePropertyPhoto(): Promise<MobileCapturedPhoto> {
    const photo: Photo = await Camera.getPhoto({
      quality: 82,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      correctOrientation: true,
      saveToGallery: false,
      webUseInput: true,
    });

    return {
      id: createCaptureId(),
      path: photo.path,
      webPath: photo.webPath,
      format: photo.format,
      capturedAt: new Date().toISOString(),
    };
  },

  async photoToFile(photo: MobileCapturedPhoto, fallbackName = "property-photo.jpg") {
    if (!photo.webPath) {
      throw new Error("Captured photo is not readable in this environment.");
    }

    const response = await fetch(photo.webPath);
    const blob = await response.blob();
    return new File([blob], fallbackName, {
      type: blob.type || "image/jpeg",
    });
  },
};
