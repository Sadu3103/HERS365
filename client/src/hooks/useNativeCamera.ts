import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export interface NativeCaptureResult {
  webPath: string;
  format: string;
}

export async function captureFromCamera(): Promise<NativeCaptureResult | null> {
  if (!Capacitor.isNativePlatform()) return null;
  const photo = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
  });
  if (!photo.webPath) return null;
  return { webPath: photo.webPath, format: photo.format };
}

export async function captureFromGallery(): Promise<NativeCaptureResult | null> {
  if (!Capacitor.isNativePlatform()) return null;
  const photo = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Photos,
  });
  if (!photo.webPath) return null;
  return { webPath: photo.webPath, format: photo.format };
}
