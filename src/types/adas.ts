export type AlertLevel = 'safe' | 'warning' | 'danger';

export type SimulationMode = 'auto' | 'scenario' | 'manual';

export interface VideoSource {
  type: 'youtube' | 'file';
  youtubeUrl: string;
  youtubeId: string;
  fileUrl: string | null;
  fileName: string | null;
  isMuted: boolean;
  isPlaying: boolean;
}

export interface CalibrationSettings {
  horizonY: number;        // Percentage from top (e.g., 48%)
  vanishingPointX: number; // Percentage from left (e.g., 50%)
  laneBottomWidth: number; // Percentage width at bottom of screen (e.g., 68%)
  laneTopWidth: number;    // Percentage width at horizon (e.g., 8%)
  leadScaleFactor: number; // Scale tuning for lead vehicle bounding box
  safeTimeGap: number;     // 2.0 or 3.0 seconds safe distance rule
}

export interface AdasTelemetry {
  egoSpeedKmH: number;          // Ego vehicle speed in km/h
  leadDistance: number;          // Distance in meters (Z)
  uncertainty: number;           // ± uncertainty in meters
  relSpeedKmH: number;           // Relative speed (v_lead - v_ego) in km/h: negative when closing in!
  lateralOffset: number;        // -50% to +50% lateral offset from lane center
  ttc: number | null;            // Time-to-collision in seconds (null or > 10 if opening or stationary)
  alertLevel: AlertLevel;
  alertMessage: string;
  minSafeDistance: number;       // In meters, based on egoSpeed and safeTimeGap
  timeHeadway: number;           // Current time headway in seconds (leadDistance / egoSpeed_ms)
  targetLocked: boolean;         // Lead car detected and locked
}

export interface DistanceDataPoint {
  timestamp: number;
  distance: number;
  alertLevel: AlertLevel;
}

export interface ScenarioPreset {
  id: string;
  title: string;
  subtitle: string;
  targetDistance: number;
  targetSpeed: number;
  targetRelSpeed: number;
  durationMs: number;
  lateralOffset?: number;
}
