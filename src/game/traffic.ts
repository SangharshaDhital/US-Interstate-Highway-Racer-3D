import { getLaneCenterX } from './highways.ts';
import type { HighwayConfig, TrafficDensity, TrafficVehicle } from './types.ts';

const TRAFFIC_COLORS = [
  0xd1d5db, // Silver
  0x1e293b, // Slate dark
  0xdc2626, // Red
  0x2563eb, // Cobalt blue
  0xf59e0b, // Amber
  0x10b981, // Emerald
  0xffffff, // White
  0x475569, // Charcoal
  0xb91c1c, // Crimson
];

let nextVehicleId = 1;

export function spawnTrafficVehicle(
  highway: HighwayConfig,
  minZ: number,
  maxZ: number,
  playerSpeedMph: number
): TrafficVehicle {
  const lanes = highway.lanes;
  const lane = Math.floor(Math.random() * lanes);
  const roadWidth = highway.roadWidth;
  const x = getLaneCenterX(lane, lanes, roadWidth);
  const z = minZ + Math.random() * (maxZ - minZ);

  // Distribution: lane 0 (rightmost) gets more trucks, left lanes get faster cars
  const isRightmostLane = lane === 0 || (lanes >= 4 && lane === 1);
  const isLeftmostLane = lane === lanes - 1;

  let type: TrafficVehicle['type'] = 'sedan';
  let width = 2.0;
  let length = 4.7;
  let height = 1.45;
  let baseSpeed = highway.speedLimitMph;

  const typeRoll = Math.random();
  if (isRightmostLane && typeRoll < 0.45) {
    type = 'semi';
    width = 2.6;
    length = 13.5;
    height = 3.6;
    baseSpeed = highway.speedLimitMph * 0.78;
  } else if (typeRoll < 0.3) {
    type = 'suv';
    width = 2.15;
    length = 5.0;
    height = 1.75;
    baseSpeed = highway.speedLimitMph * 0.95;
  } else if (isLeftmostLane && typeRoll < 0.6) {
    type = 'coupe';
    width = 1.95;
    length = 4.5;
    height = 1.35;
    baseSpeed = highway.speedLimitMph * 1.1;
  } else if (typeRoll < 0.5) {
    type = 'van';
    width = 2.1;
    length = 5.4;
    height = 2.1;
    baseSpeed = highway.speedLimitMph * 0.88;
  }

  // Slight speed variation
  const speedVariation = (Math.random() - 0.5) * 12;
  const speedMph = Math.max(35, baseSpeed + speedVariation);

  return {
    id: nextVehicleId++,
    type,
    lane,
    targetLane: lane,
    laneTransitionProgress: 1.0,
    x,
    z,
    speedMph,
    color: TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)],
    width,
    length,
    height,
    braking: false,
    blinker: 'none',
    passedByPlayer: false,
  };
}

export function initializeTrafficPool(
  highway: HighwayConfig,
  density: TrafficDensity,
  playerZ: number
): TrafficVehicle[] {
  let targetCount = 12;
  switch (density) {
    case 'light':
      targetCount = 8;
      break;
    case 'moderate':
      targetCount = 14;
      break;
    case 'heavy':
      targetCount = 22;
      break;
    case 'rush_hour':
      targetCount = 30;
      break;
  }

  const pool: TrafficVehicle[] = [];
  // Distribute over range 95m to 580m ahead of player with clear center launch lane
  for (let i = 0; i < targetCount; i++) {
    const minZ = playerZ + 95 + i * (480 / targetCount);
    const maxZ = minZ + 32;
    const v = spawnTrafficVehicle(highway, minZ, maxZ, 60);
    if (i < 3 && Math.abs(v.x) < 2.4) {
      // Shift early vehicles out of the player's center spawn line
      v.lane = 0;
      v.targetLane = 0;
      v.x = getLaneCenterX(0, highway.lanes, highway.roadWidth);
    }
    pool.push(v);
  }
  return pool;
}

export function updateTraffic(
  trafficList: TrafficVehicle[],
  highway: HighwayConfig,
  playerZ: number,
  playerSpeedMph: number,
  density: TrafficDensity,
  dt: number
): TrafficVehicle[] {
  const safeDt = Math.min(Math.max(dt, 0.001), 0.05);
  const lanes = highway.lanes;
  const roadWidth = highway.roadWidth;

  let targetCount = 14;
  switch (density) {
    case 'light':
      targetCount = 8;
      break;
    case 'moderate':
      targetCount = 14;
      break;
    case 'heavy':
      targetCount = 22;
      break;
    case 'rush_hour':
      targetCount = 30;
      break;
  }

  const updated: TrafficVehicle[] = [];

  for (const v of trafficList) {
    // Check if fallen far behind (> 90m behind player)
    if (v.z < playerZ - 90) {
      continue; // Recycled / removed
    }

    // Check if way too far ahead (> 650m)
    if (v.z > playerZ + 700) {
      continue;
    }

    // Move along Z
    const speedMps = v.speedMph * 0.44704;
    v.z += speedMps * safeDt;

    // Handle lane change transition
    if (v.laneTransitionProgress < 1.0) {
      v.laneTransitionProgress = Math.min(1.0, v.laneTransitionProgress + safeDt * 0.8);
      const startX = getLaneCenterX(v.lane, lanes, roadWidth);
      const endX = getLaneCenterX(v.targetLane, lanes, roadWidth);
      // Smooth cosine interpolation
      const t = 0.5 - 0.5 * Math.cos(v.laneTransitionProgress * Math.PI);
      v.x = startX + (endX - startX) * t;

      if (v.laneTransitionProgress >= 1.0) {
        v.lane = v.targetLane;
        v.blinker = 'none';
      }
    } else {
      // Small chance to initiate a lane change if highway has multiple lanes
      if (Math.random() < 0.004 * safeDt && lanes > 1) {
        const canGoLeft = v.lane < lanes - 1;
        const canGoRight = v.lane > 0;
        let changeDir = 0;
        if (canGoLeft && canGoRight) {
          changeDir = Math.random() < 0.5 ? -1 : 1;
        } else if (canGoLeft) {
          changeDir = 1;
        } else if (canGoRight) {
          changeDir = -1;
        }

        if (changeDir !== 0) {
          v.targetLane = v.lane + changeDir;
          v.laneTransitionProgress = 0;
          v.blinker = changeDir > 0 ? 'left' : 'right';
        }
      }
      v.x = getLaneCenterX(v.lane, lanes, roadWidth);
    }

    updated.push(v);
  }

  // Refill pool if dropped below target count
  while (updated.length < targetCount) {
    // Find highest Z in pool to spawn ahead
    let maxAheadZ = playerZ + 200;
    for (const v of updated) {
      if (v.z > maxAheadZ) maxAheadZ = v.z;
    }
    const spawnMinZ = Math.max(playerZ + 180, maxAheadZ + 30);
    const spawnMaxZ = spawnMinZ + 80;
    updated.push(spawnTrafficVehicle(highway, spawnMinZ, spawnMaxZ, playerSpeedMph));
  }

  return updated;
}
