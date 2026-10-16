import { CalibrationSettings } from '../types/adas';

export interface BoundingBox2D {
  x: number;       // Center X percentage (0-100)
  y: number;       // Bottom Y percentage (0-100)
  width: number;   // Width percentage (0-100)
  height: number;  // Height percentage (0-100)
}

/**
 * Projects a 3D target vehicle distance Z (meters) and lateral offset X (meters)
 * into 2D screen percentage coordinates using inverse pinhole perspective.
 */
export function projectLeadVehicle(
  distanceZ: number,
  lateralOffset: number,
  calibration: CalibrationSettings
): BoundingBox2D {
  const { horizonY, vanishingPointX, leadScaleFactor } = calibration;
  
  // Clamp distance to reasonable detection range [3m, 120m]
  const clampedZ = Math.max(3.5, Math.min(120, distanceZ));

  // Virtual focal length scaling constants (tuned for 16:9 dashcam FOV ~ 65-75 deg)
  const Ky = 380 * leadScaleFactor; 
  const Kw = 240 * leadScaleFactor; 

  // Pinhole projection for ground contact / bumper
  // yScreen = horizon + (Ky / Z)
  const projectedY = horizonY + (Ky / clampedZ);
  const clampedY = Math.min(88, Math.max(horizonY + 2, projectedY));

  // Width inversely proportional to distance Z
  const projectedW = Kw / clampedZ;
  const clampedW = Math.min(48, Math.max(2.8, projectedW));

  // Typical passenger car rear aspect ratio is approx 1.4:1 (width:height)
  const clampedH = clampedW * 0.72;

  // Lateral projection: offset expands as object gets closer
  const Kx = 1.8 * leadScaleFactor;
  const projectedX = vanishingPointX + (lateralOffset * Kx * (100 / clampedZ));
  const clampedX = Math.min(92, Math.max(8, projectedX));

  return {
    x: clampedX,
    y: clampedY,
    width: clampedW,
    height: clampedH
  };
}

/**
 * Computes the 4 corners of the 3D perspective lane trapezoid in SVG coordinates [0, 100]
 */
export function getLanePolygonPoints(calibration: CalibrationSettings): string {
  const { horizonY, vanishingPointX, laneBottomWidth, laneTopWidth } = calibration;
  
  const topHalf = laneTopWidth / 2;
  const bottomHalf = laneBottomWidth / 2;

  const topLeftX = Math.max(0, vanishingPointX - topHalf);
  const topRightX = Math.min(100, vanishingPointX + topHalf);
  const bottomLeftX = Math.max(0, vanishingPointX - bottomHalf);
  const bottomRightX = Math.min(100, vanishingPointX + bottomHalf);

  const topY = horizonY;
  const bottomY = 100;

  // Polygon points order: Top-Left -> Top-Right -> Bottom-Right -> Bottom-Left
  return `${topLeftX},${topY} ${topRightX},${topY} ${bottomRightX},${bottomY} ${bottomLeftX},${bottomY}`;
}
