export type WeatherCondition = 'clear' | 'sunset' | 'rain' | 'snow' | 'fog' | 'night';

export type TrafficDensity = 'light' | 'moderate' | 'heavy' | 'rush_hour';

export type HighwayId =
  | 'route-66'
  | 'pch-ca1'
  | 'i-95'
  | 'i-70-rockies'
  | 'us-1-keys'
  | 'i-80-plains'
  | 'i-10-desert'
  | 'us-441-blueridge';

export type VehicleId = 'muscle' | 'supercar' | 'truck4x4' | 'interceptor';

export type CameraView = 'chase' | 'hood' | 'bumper';

export type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export interface HighwayConfig {
  id: HighwayId;
  name: string;
  shieldType: 'us-route' | 'interstate' | 'state-route';
  routeNumber: string;
  subtitle: string;
  fromTo: string;
  lengthMiles: number;
  lanes: number;
  speedLimitMph: number;
  defaultWeather: WeatherCondition;
  sceneryType: 'desert_rock' | 'coastal_ocean' | 'eastern_forest' | 'snow_mountains' | 'tropical_bridge' | 'plains' | 'arid_dunes' | 'autumn_hills';
  roadCurvatureFactor: number;
  roadWidth: number;
  themeColor: string;
  description: string;
}

export interface VehicleConfig {
  id: VehicleId;
  name: string;
  category: string;
  topSpeedMph: number;
  acceleration: number; // 0 to 1
  handling: number;     // 0 to 1
  driftGrip: number;    // 0 to 1
  boostPower: number;   // 0 to 1
  primaryColor: number;
  stripeColor: number;
  trimColor: number;
  description: string;
}

export interface WeatherSettings {
  name: string;
  frictionMultiplier: number;
  fogDensity: number;
  fogColor: number;
  skyColor: number;
  sunColor: number;
  sunIntensity: number;
  ambientIntensity: number;
  rainIntensity: number;
  snowIntensity: number;
  roadRoughness: number;
  headlightsRequired: boolean;
}

export interface PlayerCarState {
  x: number;               // lateral highway pos (-laneWidth * lanes/2 to +...)
  y: number;               // height above road
  z: number;               // distance traveled along highway (meters)
  speedMph: number;
  gear: number;
  rpm: number;             // 0.0 to 1.0
  steeringAngle: number;   // -1 to 1
  slipAngle: number;       // drift angle in radians
  isDrifting: boolean;
  isBraking: boolean;
  isAccelerating: boolean;
  nitroRemaining: number;  // 0 to 100
  isBoosting: boolean;
  isDrafting: boolean;
  draftProgress: number;   // 0 to 1
  nearMissCount: number;
  nearMissCombo: number;
  comboTimer: number;
  totalDistanceMeters: number;
  score: number;
  health: number;          // 0 to 100
  trauma: number;          // camera shake trauma 0 to 1
  hitstopRemaining: number;
  invulnerableTimer?: number; // post-collision shield timer in seconds
  headlightsOn: boolean;
  // Rocket Thrusters & Inverted Ceiling Vacuum Mode
  isFlying: boolean;
  thrusterFuel: number;    // 0 to 100
  isInverted: boolean;     // upside down on ceiling
  rollAngle: number;       // 0 to Math.PI
  inTunnel: boolean;
  inOverpass: boolean;
  vacuumActive: boolean;
  vacuumAttached: boolean;
  ceilingFlyoverCount: number;
}

export interface TrafficVehicle {
  id: number;
  type: 'sedan' | 'semi' | 'coupe' | 'suv' | 'van';
  lane: number;
  targetLane: number;
  laneTransitionProgress: number;
  x: number;
  z: number;
  speedMph: number;
  color: number;
  width: number;
  length: number;
  height: number;
  braking: boolean;
  blinker: 'none' | 'left' | 'right';
  passedByPlayer: boolean;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  drift: boolean;
  boost: boolean;
  thruster: boolean;
  /** Analog steering from phone gyroscope/tilt (-1 left to +1 right) */
  tiltSteer?: number;
  /** Analog/gesture steering from touch/mouse left-right swipe (-1 left to +1 right) */
  swipeSteer?: number;
  /** Optional cruise auto-throttle for one-handed tilt/swipe steering */
  autoThrottle?: boolean;
  vacuumToggleJustPressed: boolean;
  headlightsToggleJustPressed: boolean;
  cameraToggleJustPressed: boolean;
  pauseJustPressed: boolean;
}

export interface RunResults {
  highwayName: string;
  distanceMiles: number;
  timeSeconds: number;
  topSpeedMph: number;
  avgSpeedMph: number;
  nearMisses: number;
  maxCombo: number;
  score: number;
  isVictory: boolean;
}

export const GAME_VERSION = '1.0.0';
