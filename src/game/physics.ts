import type { InputState, PlayerCarState, TrafficVehicle, VehicleConfig, WeatherSettings } from './types.ts';

export const VEHICLES: Record<string, VehicleConfig> = {
  muscle: {
    id: 'muscle',
    name: 'Venom GT 500',
    category: 'V8 American Muscle',
    topSpeedMph: 205,
    acceleration: 0.94,
    handling: 0.78,
    driftGrip: 0.78,
    boostPower: 0.96,
    primaryColor: 0xd92626, // Crimson red
    stripeColor: 0xf3f4f6,  // White racing stripes
    trimColor: 0x1f2937,    // Matte dark trim
    description: 'Raw supercharged V8 torque, thunderous exhaust note, and aggressive power-sliding capabilities.'
  },
  supercar: {
    id: 'supercar',
    name: 'Apex Cyclone RS',
    category: 'American Mid-Engine Supercar',
    topSpeedMph: 235,
    acceleration: 0.98,
    handling: 0.94,
    driftGrip: 0.88,
    boostPower: 0.99,
    primaryColor: 0x0284c7, // Electric blue
    stripeColor: 0x38bdf8,
    trimColor: 0x111827,
    description: 'Pinpoint cornering precision, active aerodynamics, lightweight carbon composite frame, and blistering acceleration.'
  },
  truck4x4: {
    id: 'truck4x4',
    name: 'Baja Marauder 4x4',
    category: 'Heavy-Duty Trophy Truck',
    topSpeedMph: 175,
    acceleration: 0.86,
    handling: 0.72,
    driftGrip: 0.84,
    boostPower: 0.90,
    primaryColor: 0xeab308, // Hazard yellow
    stripeColor: 0x18181b,
    trimColor: 0x27272a,
    description: 'High-clearance trophy suspension, dual shocks, brutal crash resilience, and all-weather traction dominance.'
  },
  interceptor: {
    id: 'interceptor',
    name: 'Highway Patrol V8',
    category: 'Special Enforcement Unit',
    topSpeedMph: 215,
    acceleration: 0.93,
    handling: 0.86,
    driftGrip: 0.82,
    boostPower: 0.95,
    primaryColor: 0x0f172a, // Deep obsidian black
    stripeColor: 0xffffff,  // White doors
    trimColor: 0x3b82f6,    // Police blue strobe
    description: 'Heavy push-bar, strobe lightbars, balanced pursuit suspension, and relentless high-speed stability.'
  }
};

export const VEHICLE_LIST = Object.values(VEHICLES);

export function createInitialPlayerState(): PlayerCarState {
  return {
    x: 0,
    y: 0,
    z: 0,
    speedMph: 0,
    gear: 1,
    rpm: 0.15,
    steeringAngle: 0,
    slipAngle: 0,
    isDrifting: false,
    isBraking: false,
    isAccelerating: false,
    nitroRemaining: 100,
    isBoosting: false,
    isDrafting: false,
    draftProgress: 0,
    isFlying: false,
    thrusterFuel: 100,
    isInverted: false,
    rollAngle: 0,
    inTunnel: false,
    inOverpass: false,
    vacuumActive: false,
    vacuumAttached: false,
    ceilingFlyoverCount: 0,
    nearMissCount: 0,
    nearMissCombo: 0,
    comboTimer: 0,
    totalDistanceMeters: 0,
    score: 0,
    health: 100,
    trauma: 0,
    hitstopRemaining: 0,
    invulnerableTimer: 0,
    headlightsOn: true,
  };
}

/**
 * Step vehicle physics forward by dt seconds.
 * Clamps dt and computes gear ratios, acceleration, drag, drift slip, and steering.
 */
export function updatePlayerPhysics(
  state: PlayerCarState,
  input: InputState,
  vehicle: VehicleConfig,
  weather: WeatherSettings,
  roadHalfWidth: number,
  dt: number
): PlayerCarState {
  // Clamped dt
  const safeDt = Math.min(Math.max(dt, 0.001), 0.05);

  // If hitstop is active, decrement hitstop without moving simulation
  if (state.hitstopRemaining > 0) {
    const nextHitstop = Math.max(0, state.hitstopRemaining - safeDt);
    const nextTrauma = Math.max(0, state.trauma - safeDt * 1.5);
    return {
      ...state,
      hitstopRemaining: nextHitstop,
      trauma: nextTrauma,
    };
  }

  let {
    speedMph,
    nitroRemaining,
    x,
    y,
    z,
    slipAngle,
    nearMissCombo,
    comboTimer,
    score,
    trauma,
    headlightsOn,
    thrusterFuel,
    rollAngle,
    isInverted,
    inTunnel,
    inOverpass,
    vacuumActive,
    vacuumAttached,
  } = state;

  // Toggle headlights
  if (input.headlightsToggleJustPressed) {
    headlightsOn = !headlightsOn;
  }

  // Vacuum Mode: toggle upside-down ceiling driving in tunnels/overpasses
  const hasCeilingAbove = inTunnel || inOverpass;
  if (input.vacuumToggleJustPressed) {
    vacuumActive = !vacuumActive;
    if (vacuumActive && hasCeilingAbove) {
      isInverted = true;
      vacuumAttached = true;
    } else {
      isInverted = false;
      vacuumAttached = false;
    }
  }

  // If vacuum mode is active and we enter a tunnel or overpass, auto-latch onto ceiling
  if (vacuumActive && hasCeilingAbove) {
    isInverted = true;
    vacuumAttached = true;
  } else if (!hasCeilingAbove && isInverted) {
    // When clearing tunnel or overpass, lose ceiling suction and smoothly return to road
    isInverted = false;
    vacuumAttached = false;
  }

  // Smooth roll angle transition (0 = normal road orientation, Math.PI = 180° upside down)
  const targetRoll = isInverted ? Math.PI : 0;
  rollAngle += (targetRoll - rollAngle) * Math.min(1.0, safeDt * 9.5);

  // Rocket Thruster Flight
  let isFlying = state.isFlying;
  if (input.thruster && thrusterFuel > 1) {
    isFlying = true;
    // Consume fuel (~13% per second = ~7.5 seconds continuous burn)
    thrusterFuel = Math.max(0, thrusterFuel - safeDt * 13.5);
    // Lift off into the air up to 5.2m altitude (flying high over 18-wheelers!)
    const targetFlightY = 5.2;
    y += (targetFlightY - y) * Math.min(1.0, safeDt * 5.2);
    // Score bonus for rocket flight
    score += Math.round(safeDt * 220);
  } else if (isInverted) {
    isFlying = false;
    // Attached to tunnel / overpass ceiling at y = 5.4m
    const ceilingY = 5.4;
    y += (ceilingY - y) * Math.min(1.0, safeDt * 9.5);
    // Heavy score multiplier while driving upside down
    score += Math.round(safeDt * 350);
  } else {
    // Gravity descent back to asphalt
    y += (0 - y) * Math.min(1.0, safeDt * 6.5);
    if (y < 0.04) {
      y = 0;
      isFlying = false;
    }
    // Thruster fuel recharges while driving on the ground
    if (thrusterFuel < 100) {
      thrusterFuel = Math.min(100, thrusterFuel + safeDt * 11);
    }
  }

  // Weather traction multiplier
  const surfaceGrip = weather.frictionMultiplier * vehicle.driftGrip;

  // Nitro boost logic
  let isBoosting = false;
  if (input.boost && nitroRemaining > 1 && speedMph > 5) {
    isBoosting = true;
    nitroRemaining = Math.max(0, nitroRemaining - safeDt * 22);
  } else if (!input.boost && nitroRemaining < 100) {
    // Progressive recharge
    nitroRemaining = Math.min(100, nitroRemaining + safeDt * 8.5);
  }

  // Speed calculation with thrilling top speeds
  // Normal: 205-235 MPH. Nitro: up to 285 MPH. Rocket Thrusters: up to 325 MPH!
  const effectiveTopSpeed = isFlying
    ? vehicle.topSpeedMph * 1.38
    : isBoosting
    ? vehicle.topSpeedMph * 1.28
    : isInverted
    ? vehicle.topSpeedMph * 1.18
    : vehicle.topSpeedMph;

  // High-torque launch bonus under 85 mph for exciting, immediate acceleration
  const launchBonus = speedMph < 85 ? 2.1 : speedMph < 140 ? 1.4 : 1.0;
  const baseAccel = isFlying
    ? 90 * vehicle.boostPower
    : isBoosting
    ? 82 * vehicle.boostPower
    : 52 * vehicle.acceleration;
  const accelRate = baseAccel * launchBonus * Math.max(0.25, 1 - (speedMph / (effectiveTopSpeed * 1.02)) ** 1.5);

  // Analog tilt & swipe steering values (-1 to 1)
  const tiltVal = input.tiltSteer ?? 0;
  const swipeVal = input.swipeSteer ?? 0;
  const hasAnalogSteerActive = Math.abs(tiltVal) > 0.05 || Math.abs(swipeVal) > 0.05;

  // Acceleration / Braking (auto-accelerates when autoThrottle is on or when tilting/swiping without braking)
  const isAccelerating =
    input.forward ||
    input.thruster ||
    Boolean((input.autoThrottle || hasAnalogSteerActive) && !input.backward);
  const isBraking = input.backward;

  if (isAccelerating) {
    speedMph += accelRate * safeDt;
  } else if (isBraking) {
    // Foot braking
    speedMph -= 75 * safeDt;
  } else {
    // Natural engine drag / coasting
    speedMph -= 8 * safeDt;
  }

  // Aerodynamic drag
  const dragCoeff = isFlying ? 0.00014 : 0.00024;
  speedMph -= speedMph * speedMph * dragCoeff * safeDt;

  // Speed clamping
  speedMph = Math.max(0, Math.min(speedMph, effectiveTopSpeed));

  // Gear calculation
  const speedRatio = speedMph / vehicle.topSpeedMph;
  let gear = 1;
  let rpm = 0.15;
  if (speedMph < 35) {
    gear = 1;
    rpm = 0.2 + (speedMph / 35) * 0.75;
  } else if (speedMph < 70) {
    gear = 2;
    rpm = 0.35 + ((speedMph - 35) / 35) * 0.65;
  } else if (speedMph < 110) {
    gear = 3;
    rpm = 0.4 + ((speedMph - 70) / 40) * 0.6;
  } else if (speedMph < 150) {
    gear = 4;
    rpm = 0.45 + ((speedMph - 110) / 40) * 0.55;
  } else if (speedMph < 190) {
    gear = 5;
    rpm = 0.5 + ((speedMph - 150) / 40) * 0.5;
  } else {
    gear = 6;
    rpm = Math.min(1.0, 0.6 + ((speedMph - 190) / 40) * 0.4);
  }

  if (isBoosting) {
    rpm = Math.min(1.0, rpm * 1.15);
  }

  // Steering & Drifting (simultaneously supports buttons/keys, phone tilt sensor, and left/right swipe mode)
  let buttonSteer = 0;
  if (input.left) buttonSteer -= 1;
  if (input.right) buttonSteer += 1;

  const steerIntent = Math.max(-1, Math.min(1, buttonSteer + tiltVal + swipeVal));

  // Steering sensitivity inversely scales at ultra high speed to prevent twitchiness
  const speedSensitivity = Math.max(0.45, 1.0 - (speedMph / 260) * 0.42);
  const steerRate = 4.1 * vehicle.handling * speedSensitivity;
  const targetSteeringAngle = steerIntent;

  // Smooth steering
  const steeringAngle = state.steeringAngle + (targetSteeringAngle - state.steeringAngle) * Math.min(1.0, safeDt * 12);

  // Drift initiation
  const isDrifting = input.drift && speedMph > 40 && Math.abs(steerIntent) > 0.1;
  const targetSlip = isDrifting ? steerIntent * 0.42 * (1.1 - surfaceGrip * 0.3) : 0;
  slipAngle += (targetSlip - slipAngle) * Math.min(1.0, safeDt * (isDrifting ? 6 : 9));

  // Lateral movement calculation: speed in meters/sec
  const speedMps = speedMph * 0.44704;
  const lateralSpeed = steeringAngle * steerRate * Math.min(speedMph / 26, 1.0) * (isDrifting ? 1.45 : 1.0);
  x += lateralSpeed * safeDt * 4.4;

  // Road boundary constraint with gentle shoulder friction
  const playableBound = roadHalfWidth - 1.2;
  let currentHealth = state.health;
  if (Math.abs(x) > playableBound) {
    const overage = Math.abs(x) - playableBound;
    x = Math.sign(x) * (playableBound + overage * 0.15);
    // Shoulder friction slowdown & gentle rumble trauma
    speedMph = Math.max(0, speedMph - 18 * safeDt);
    trauma = Math.min(0.6, trauma + safeDt * 0.25);
  }

  // Post-collision invulnerability shield countdown & Nano-Hull auto-recovery
  let invulnerableTimer = Math.max(0, (state.invulnerableTimer ?? 0) - safeDt);
  if (invulnerableTimer === 0 && currentHealth > 0 && currentHealth < 100 && speedMph > 25) {
    currentHealth = Math.min(100, currentHealth + safeDt * 3.5);
  }

  // Longitudinal forward progression
  const deltaDistance = speedMps * safeDt;
  z += deltaDistance;
  const totalDistanceMeters = state.totalDistanceMeters + deltaDistance;

  // Combo timer management
  if (comboTimer > 0) {
    comboTimer = Math.max(0, comboTimer - safeDt);
    if (comboTimer === 0) {
      nearMissCombo = 0; // Combo expired
    }
  }

  // Natural score accrual with speed multiplier
  score += Math.round((speedMph * 0.08 + (isDrifting ? 4 : 0)) * safeDt * 30);

  // Trauma decay
  trauma = Math.max(0, trauma - safeDt * 1.8);

  return {
    ...state,
    x,
    y,
    z,
    speedMph,
    gear,
    rpm,
    steeringAngle,
    slipAngle,
    isDrifting,
    isBraking,
    isAccelerating,
    nitroRemaining,
    isBoosting,
    isFlying,
    thrusterFuel,
    isInverted,
    rollAngle,
    inTunnel,
    inOverpass,
    vacuumActive,
    vacuumAttached,
    nearMissCombo,
    comboTimer,
    totalDistanceMeters,
    score,
    health: currentHealth,
    trauma,
    invulnerableTimer,
    headlightsOn,
  };
}

/**
 * Checks for collision between player car and dynamic traffic.
 * Also calculates near-misses when passing within danger proximity without hitting.
 */
export function checkCollisionsAndNearMisses(
  player: PlayerCarState,
  trafficList: TrafficVehicle[],
  playerWidth = 2.0,
  playerLength = 4.6
): {
  collidedWith: TrafficVehicle | null;
  nearMissWith: TrafficVehicle | null;
  updatedPlayer: PlayerCarState;
} {
  let collidedWith: TrafficVehicle | null = null;
  let nearMissWith: TrafficVehicle | null = null;
  let updatedPlayer = { ...player };

  const playerZ = player.z;
  const playerX = player.x;
  const isInvulnerable = (player.invulnerableTimer ?? 0) > 0;

  for (const traffic of trafficList) {
    const dz = Math.abs(traffic.z - playerZ);
    const dx = Math.abs(traffic.x - playerX);

    const hitZ = (playerLength + traffic.length) * 0.42;
    const hitX = (playerWidth + traffic.width) * 0.39;

    // Vertical clearance check: if flying or inverted ceiling driving, player clears traffic!
    const isAboveTraffic = player.y > 2.0;

    // Hard collision check
    if (dz < hitZ && dx < hitX) {
      if (isAboveTraffic) {
        // High-altitude rocket flyover or ceiling overtake!
        if (!traffic.passedByPlayer) {
          traffic.passedByPlayer = true;
          nearMissWith = traffic;
          updatedPlayer.ceilingFlyoverCount += 1;
          updatedPlayer.score += 450;
        }
        continue;
      }

      // If post-collision shield is active, ghost cleanly through overlapping traffic without taking multi-frame damage!
      if (isInvulnerable) {
        traffic.passedByPlayer = true;
        continue;
      }

      collidedWith = traffic;
      traffic.passedByPlayer = true;
      // Push traffic vehicle ahead/aside so it never re-collides on subsequent frames
      traffic.z = Math.max(traffic.z, playerZ + hitZ + 6);
      traffic.speedMph = Math.max(traffic.speedMph, player.speedMph * 0.85 + 20);

      // Hitstop freeze, forgiving arcade speed retention, trauma shake, and 1.6s shield immunity
      const relativeSpeed = Math.abs(player.speedMph - traffic.speedMph);
      const impactSeverity = Math.min(1.0, relativeSpeed / 85);

      updatedPlayer.speedMph = Math.max(40, player.speedMph * 0.68);
      updatedPlayer.trauma = Math.min(0.85, updatedPlayer.trauma + 0.45 * impactSeverity);
      updatedPlayer.hitstopRemaining = 0.045; // 45ms crisp arcade hitstop
      updatedPlayer.invulnerableTimer = 1.6; // 1.6s invulnerability shield prevents multi-hit instant totaling
      updatedPlayer.health = Math.max(0, updatedPlayer.health - Math.round(7 + impactSeverity * 8));
      updatedPlayer.nearMissCombo = 0;
      updatedPlayer.comboTimer = 0;
      break;
    }

    // Near-miss check: tight lateral proximity, player passing traffic faster
    const nearMissZoneZ = hitZ * 1.75;
    const nearMissZoneX = hitX + 1.45;

    if (!traffic.passedByPlayer && dz < nearMissZoneZ && dx < nearMissZoneX) {
      // Must have high relative speed to count as a thrill near-miss
      if (player.speedMph > traffic.speedMph + 15 && player.speedMph > 45) {
        traffic.passedByPlayer = true;
        nearMissWith = traffic;

        const newCombo = updatedPlayer.nearMissCombo + 1;
        const comboMultiplier = Math.min(newCombo, 10);
        const nearMissScoreBonus = 250 * comboMultiplier;

        updatedPlayer.nearMissCount += 1;
        updatedPlayer.nearMissCombo = newCombo;
        updatedPlayer.comboTimer = 3.5; // 3.5s to chain next near-miss
        updatedPlayer.score += nearMissScoreBonus;
        // Near miss gives a quick +15% nitro reward!
        updatedPlayer.nitroRemaining = Math.min(100, updatedPlayer.nitroRemaining + 15);
      }
    }
  }

  return {
    collidedWith,
    nearMissWith,
    updatedPlayer,
  };
}

/**
 * Computes finish run summary.
 */
export function calculateRunResults(
  highwayName: string,
  state: PlayerCarState,
  elapsedSeconds: number,
  isVictory: boolean
): {
  highwayName: string;
  distanceMiles: number;
  timeSeconds: number;
  topSpeedMph: number;
  avgSpeedMph: number;
  nearMisses: number;
  maxCombo: number;
  score: number;
  isVictory: boolean;
} {
  const distanceMiles = state.totalDistanceMeters * 0.000621371;
  const avgSpeedMph = elapsedSeconds > 0 ? (distanceMiles / (elapsedSeconds / 3600)) : 0;

  return {
    highwayName,
    distanceMiles: Number(distanceMiles.toFixed(2)),
    timeSeconds: Math.round(elapsedSeconds),
    topSpeedMph: Math.round(state.speedMph),
    avgSpeedMph: Math.round(avgSpeedMph),
    nearMisses: state.nearMissCount,
    maxCombo: state.nearMissCombo,
    score: state.score,
    isVictory,
  };
}

/**
 * Converts phone DeviceOrientationEvent gamma/beta angles into a smooth steering axis in [-1, 1].
 * Automatically adapts to Portrait (0°), Landscape-Primary (90°), and Landscape-Secondary (-90° / 270°).
 */
export function computeTiltSteerAxis(
  gamma: number | null,
  beta: number | null,
  orientationAngle = 0,
  calibrationOffset = 0,
  deadzoneDeg = 2.2,
  maxTiltDeg = 24
): number {
  let rawDeg = 0;
  const normalizedOrientation = ((orientationAngle % 360) + 360) % 360;

  if (normalizedOrientation === 90) {
    // Landscape primary: tilting top of phone right/left uses beta
    rawDeg = beta ?? 0;
  } else if (normalizedOrientation === 270) {
    // Landscape secondary: inverted beta
    rawDeg = -(beta ?? 0);
  } else if (normalizedOrientation === 180) {
    // Upside-down portrait: inverted gamma
    rawDeg = -(gamma ?? 0);
  } else {
    // Standard portrait (0°): gamma is left-to-right tilt (-90 to 90)
    rawDeg = gamma ?? 0;
  }

  const calibrated = rawDeg - calibrationOffset;
  const absDeg = Math.abs(calibrated);
  if (absDeg <= deadzoneDeg) {
    return 0;
  }

  const span = Math.max(5, maxTiltDeg - deadzoneDeg);
  const linear = Math.min(1, (absDeg - deadzoneDeg) / span);
  // Subtle progressive curve for fine center control and responsive full lock
  const curved = Math.pow(linear, 1.12);
  return Number((Math.sign(calibrated) * curved).toFixed(4));
}

/**
 * Converts a horizontal touch/pointer swipe or drag deltaX (in pixels) into a steering axis in [-1, 1].
 */
export function computeSwipeSteerAxis(
  deltaX: number,
  viewportWidth = 390,
  deadzonePx = 3
): number {
  const absPx = Math.abs(deltaX);
  if (absPx <= deadzonePx) {
    return 0;
  }

  // Full steering lock occurs across ~20% of the screen width (clamped between 65px and 150px)
  const fullSwipeSpan = Math.max(65, Math.min(150, viewportWidth * 0.2));
  const normalized = Math.min(1, (absPx - deadzonePx) / fullSwipeSpan);
  return Number((Math.sign(deltaX) * normalized).toFixed(4));
}

