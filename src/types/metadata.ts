/**
 * Camera information extracted from EXIF data.
 */
export interface CameraInfo {
  make?: string;
  model?: string;
}

/**
 * Shooting settings extracted from EXIF data.
 */
export interface ShootingSettings {
  iso?: number;
  aperture?: number;
  shutterSpeed?: string;
  focalLength?: number;
}

/**
 * GPS coordinates from EXIF data.
 */
export interface GpsInfo {
  latitude: number;
  longitude: number;
  altitude?: number;
}

/**
 * Full image metadata response from the API.
 */
export interface ImageMetadata {
  camera?: CameraInfo;
  lens?: string;
  settings?: ShootingSettings;
  gps?: GpsInfo;
  datetime?: string;
  dimensions?: {
    width: number;
    height: number;
  };
}
