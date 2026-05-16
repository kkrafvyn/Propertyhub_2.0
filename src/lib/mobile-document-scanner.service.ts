import { Camera, CameraResultType, CameraSource, type Photo } from "@capacitor/camera";
import type { MobileCapturedPhoto } from "./mobile-media.service";

export interface MobileScannedDocument {
  id: string;
  title: string;
  photo: MobileCapturedPhoto;
  scannedAt: string;
}

function createScanId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `mobile-scan-${Date.now()}`;
}

export const mobileDocumentScannerService = {
  async scanDocument(title = "Scanned deal document"): Promise<MobileScannedDocument> {
    const photo: Photo = await Camera.getPhoto({
      quality: 88,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      correctOrientation: true,
      saveToGallery: false,
      webUseInput: true,
    });

    const scannedAt = new Date().toISOString();

    return {
      id: createScanId(),
      title,
      scannedAt,
      photo: {
        id: createScanId(),
        path: photo.path,
        webPath: photo.webPath,
        format: photo.format,
        capturedAt: scannedAt,
      },
    };
  },
};
