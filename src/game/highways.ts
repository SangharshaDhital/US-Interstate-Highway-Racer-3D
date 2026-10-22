import type { HighwayConfig, HighwayId, WeatherCondition, WeatherSettings } from './types.ts';

export const HIGHWAYS: Record<HighwayId, HighwayConfig> = {
  'route-66': {
    id: 'route-66',
    name: 'Historic Route 66',
    shieldType: 'us-route',
    routeNumber: '66',
    subtitle: 'The Mother Road of America',
    fromTo: 'Chicago, IL → Santa Monica, CA',
    lengthMiles: 2448,
    lanes: 4,
    speedLimitMph: 75,
    defaultWeather: 'sunset',
    sceneryType: 'desert_rock',
    roadCurvatureFactor: 1.1,
    roadWidth: 16,
    themeColor: '#f97316',
    description: 'Neon motel signs, red sandstone mesas, weathered asphalt, and timeless roadside Americana.'
  },
  'pch-ca1': {
    id: 'pch-ca1',
    name: 'Pacific Coast Highway',
    shieldType: 'state-route',
    routeNumber: '1',
    subtitle: 'California State Route 1',
    fromTo: 'Dana Point, CA → Leggett, CA',
    lengthMiles: 656,
    lanes: 3,
    speedLimitMph: 65,
    defaultWeather: 'sunset',
    sceneryType: 'coastal_ocean',
    roadCurvatureFactor: 1.8,
    roadWidth: 14,
    themeColor: '#0ea5e9',
    description: 'Dramatic ocean cliffs, crashing Pacific waves, coastal marine fog, and winding panoramic curves.'
  },
  'i-95': {
    id: 'i-95',
    name: 'Interstate 95',
    shieldType: 'interstate',
    routeNumber: '95',
    subtitle: 'The Atlantic Main Street',
    fromTo: 'Miami, FL → Houlton, ME',
    lengthMiles: 1908,
    lanes: 6,
    speedLimitMph: 70,
    defaultWeather: 'rain',
    sceneryType: 'eastern_forest',
    roadCurvatureFactor: 0.8,
    roadWidth: 22,
    themeColor: '#3b82f6',
    description: 'Heavy multi-lane rush hour, glistening rain-soaked tarmac, overhead signage gantries, and pine forests.'
  },
  'i-70-rockies': {
    id: 'i-70-rockies',
    name: 'Interstate 70 Rockies',
    shieldType: 'interstate',
    routeNumber: '70',
    subtitle: 'Continental Divide Mountain Pass',
    fromTo: 'Denver, CO → Cove Fort, UT',
    lengthMiles: 2151,
    lanes: 4,
    speedLimitMph: 65,
    defaultWeather: 'snow',
    sceneryType: 'snow_mountains',
    roadCurvatureFactor: 1.5,
    roadWidth: 16,
    themeColor: '#38bdf8',
    description: 'Snow-dusted alpine evergreens, icy asphalt with reduced grip, rugged mountain peaks, and tunnels.'
  },
  'us-1-keys': {
    id: 'us-1-keys',
    name: 'Overseas Highway',
    shieldType: 'us-route',
    routeNumber: '1',
    subtitle: 'Highway That Goes to Sea',
    fromTo: 'Key Largo, FL → Key West, FL',
    lengthMiles: 113,
    lanes: 3,
    speedLimitMph: 60,
    defaultWeather: 'clear',
    sceneryType: 'tropical_bridge',
    roadCurvatureFactor: 0.6,
    roadWidth: 14,
    themeColor: '#14b8a6',
    description: 'Stretching across turquoise Caribbean waters on endless concrete causeway bridges.'
  },
  'i-80-plains': {
    id: 'i-80-plains',
    name: 'Interstate 80 Plains',
    shieldType: 'interstate',
    routeNumber: '80',
    subtitle: 'Transcontinental Corridor',
    fromTo: 'San Francisco, CA → Teaneck, NJ',
    lengthMiles: 2900,
    lanes: 4,
    speedLimitMph: 80,
    defaultWeather: 'clear',
    sceneryType: 'plains',
    roadCurvatureFactor: 0.5,
    roadWidth: 18,
    themeColor: '#eab308',
    description: 'Vast prairie horizons, roaring wind turbines, freight truck convoys, and wide-open speed.'
  },
  'i-10-desert': {
    id: 'i-10-desert',
    name: 'Interstate 10 Sun Belt',
    shieldType: 'interstate',
    routeNumber: '10',
    subtitle: 'Southern Transcontinental',
    fromTo: 'Santa Monica, CA → Jacksonville, FL',
    lengthMiles: 2460,
    lanes: 4,
    speedLimitMph: 80,
    defaultWeather: 'fog',
    sceneryType: 'arid_dunes',
    roadCurvatureFactor: 0.6,
    roadWidth: 18,
    themeColor: '#d97706',
    description: 'Shimmering desert heat, rolling sand dunes, occasional desert dust storms, and open throttle asphalt.'
  },
  'us-441-blueridge': {
    id: 'us-441-blueridge',
    name: 'Blue Ridge & US 441',
    shieldType: 'us-route',
    routeNumber: '441',
    subtitle: 'Great Smoky Mountains Scenic Route',
    fromTo: 'Knoxville, TN → Miami, FL',
    lengthMiles: 939,
    lanes: 3,
    speedLimitMph: 55,
    defaultWeather: 'fog',
    sceneryType: 'autumn_hills',
    roadCurvatureFactor: 2.0,
    roadWidth: 13,
    themeColor: '#c2410c',
    description: 'Cascading golden autumn hills, rolling morning mountain mist, tight hairpins, and elevation changes.'
  }
};

export const HIGHWAY_LIST = Object.values(HIGHWAYS);

export const WEATHER_SETTINGS: Record<WeatherCondition, WeatherSettings> = {
  clear: {
    name: 'Clear Skies',
    frictionMultiplier: 1.0,
    fogDensity: 0.0012,
    fogColor: 0x93c5fd,
    skyColor: 0x38bdf8,
    sunColor: 0xfffaed,
    sunIntensity: 1.6,
    ambientIntensity: 0.55,
    rainIntensity: 0,
    snowIntensity: 0,
    roadRoughness: 0.65,
    headlightsRequired: false,
  },
  sunset: {
    name: 'Golden Hour Sunset',
    frictionMultiplier: 0.98,
    fogDensity: 0.0018,
    fogColor: 0xf97316, // warm golden horizon
    skyColor: 0x312e81, // deep evening indigo
    sunColor: 0xfb923c,
    sunIntensity: 1.8,
    ambientIntensity: 0.45,
    rainIntensity: 0,
    snowIntensity: 0,
    roadRoughness: 0.6,
    headlightsRequired: false,
  },
  rain: {
    name: 'Storm Downpour',
    frictionMultiplier: 0.72,
    fogDensity: 0.004,
    fogColor: 0x475569,
    skyColor: 0x334155,
    sunColor: 0x94a3b8,
    sunIntensity: 0.8,
    ambientIntensity: 0.45,
    rainIntensity: 1.0,
    snowIntensity: 0,
    roadRoughness: 0.15, // wet sheen
    headlightsRequired: true,
  },
  snow: {
    name: 'Alpine Blizzard',
    frictionMultiplier: 0.55,
    fogDensity: 0.005,
    fogColor: 0x94a3b8,
    skyColor: 0x64748b,
    sunColor: 0xcfd8dc,
    sunIntensity: 0.9,
    ambientIntensity: 0.7,
    rainIntensity: 0,
    snowIntensity: 1.0,
    roadRoughness: 0.8,
    headlightsRequired: true,
  },
  fog: {
    name: 'Dense Coastal Fog',
    frictionMultiplier: 0.88,
    fogDensity: 0.008,
    fogColor: 0x64748b,
    skyColor: 0x475569,
    sunColor: 0xffeedd,
    sunIntensity: 0.6,
    ambientIntensity: 0.5,
    rainIntensity: 0.1,
    snowIntensity: 0,
    roadRoughness: 0.4,
    headlightsRequired: true,
  },
  night: {
    name: 'Midnight Highway',
    frictionMultiplier: 0.95,
    fogDensity: 0.003,
    fogColor: 0x050814,
    skyColor: 0x030712,
    sunColor: 0x38bdf8, // moonlight
    sunIntensity: 0.25,
    ambientIntensity: 0.2,
    rainIntensity: 0,
    snowIntensity: 0,
    roadRoughness: 0.7,
    headlightsRequired: true,
  }
};

/**
 * Calculates road curvature offset X for a given highway and distance Z.
 * Smooth analytical formula using multiple low-frequency sine waves.
 */
export function getRoadCurvature(highwayId: HighwayId, zMeters: number): { xOffset: number; curvatureAngle: number } {
  const config = HIGHWAYS[highwayId] || HIGHWAYS['route-66'];
  const factor = config.roadCurvatureFactor;

  // Combination of long sweeping bends and medium curves
  const wave1 = Math.sin(zMeters * 0.0018) * 18 * factor;
  const wave2 = Math.sin(zMeters * 0.0045 + 1.2) * 8 * factor;
  const wave3 = Math.cos(zMeters * 0.0007) * 25 * factor;
  const xOffset = wave1 + wave2 + wave3;

  // Derivative for tangent/angle
  const dW1 = Math.cos(zMeters * 0.0018) * 0.0018 * 18 * factor;
  const dW2 = Math.cos(zMeters * 0.0045 + 1.2) * 0.0045 * 8 * factor;
  const dW3 = -Math.sin(zMeters * 0.0007) * 0.0007 * 25 * factor;
  const curvatureAngle = Math.atan(dW1 + dW2 + dW3);

  return { xOffset, curvatureAngle };
}

/**
 * Helper to get lane center X coordinate relative to road center.
 */
export function getLaneCenterX(laneIndex: number, totalLanes: number, roadWidth: number): number {
  const laneWidth = (roadWidth - 2) / totalLanes;
  const leftStart = -roadWidth / 2 + 1 + laneWidth / 2;
  return leftStart + laneIndex * laneWidth;
}
