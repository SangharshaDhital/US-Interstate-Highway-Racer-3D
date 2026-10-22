import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialPlayerState,
  updatePlayerPhysics,
  checkCollisionsAndNearMisses,
  calculateRunResults,
  computeTiltSteerAxis,
  computeSwipeSteerAxis,
  VEHICLES
} from './physics.ts';
import { WEATHER_SETTINGS, HIGHWAYS, getRoadCurvature, getLaneCenterX } from './highways.ts';
import { spawnTrafficVehicle, updateTraffic } from './traffic.ts';
import type { InputState } from './types.ts';

const mockNeutralInput: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  drift: false,
  boost: false,
  thruster: false,
  vacuumToggleJustPressed: false,
  headlightsToggleJustPressed: false,
  cameraToggleJustPressed: false,
  pauseJustPressed: false,
};

test('Player initializes with zero speed and full health', () => {
  const p = createInitialPlayerState();
  assert.equal(p.speedMph, 0);
  assert.equal(p.health, 100);
  assert.equal(p.nitroRemaining, 100);
  assert.equal(p.nearMissCombo, 0);
});

test('Vehicle accelerates with forward input', () => {
  const initial = createInitialPlayerState();
  const input: InputState = { ...mockNeutralInput, forward: true };
  const vehicle = VEHICLES['muscle'];
  const weather = WEATHER_SETTINGS['clear'];

  const updated = updatePlayerPhysics(initial, input, vehicle, weather, 8, 0.05);
  assert.ok(updated.speedMph > 0, 'Speed should increase when forward input is active');
  assert.ok(updated.gear >= 1, 'Gear should be at least 1');
});

test('Nitro boost accelerates faster and depletes tank', () => {
  const initial = { ...createInitialPlayerState(), speedMph: 80, nitroRemaining: 100 };
  const boostInput: InputState = { ...mockNeutralInput, forward: true, boost: true };
  const normalInput: InputState = { ...mockNeutralInput, forward: true, boost: false };
  const vehicle = VEHICLES['supercar'];
  const weather = WEATHER_SETTINGS['clear'];

  const boostState = updatePlayerPhysics(initial, boostInput, vehicle, weather, 8, 0.05);
  const normalState = updatePlayerPhysics(initial, normalInput, vehicle, weather, 8, 0.05);

  assert.ok(boostState.speedMph > normalState.speedMph, 'Boosted car should be faster');
  assert.ok(boostState.nitroRemaining < 100, 'Nitro should be consumed');
  assert.equal(boostState.isBoosting, true);
});

test('Near-miss detection registers when passing traffic closely at high speed', () => {
  const player = { ...createInitialPlayerState(), x: 0, z: 100, speedMph: 120 };
  const traffic = [{
    id: 1,
    type: 'sedan' as const,
    lane: 1,
    targetLane: 1,
    laneTransitionProgress: 1,
    x: 2.2, // close lateral offset
    z: 103, // within close longitudinal threshold
    speedMph: 60,
    color: 0xffffff,
    width: 2.0,
    length: 4.6,
    height: 1.4,
    braking: false,
    blinker: 'none' as const,
    passedByPlayer: false,
  }];

  const result = checkCollisionsAndNearMisses(player, traffic);
  assert.equal(result.collidedWith, null, 'Should not be a direct collision');
  assert.ok(result.nearMissWith !== null, 'Should register a near miss');
  assert.equal(result.updatedPlayer.nearMissCount, 1, 'Near miss count should increment');
  assert.equal(result.updatedPlayer.nearMissCombo, 1, 'Combo should start at 1');
  assert.ok(result.updatedPlayer.score > player.score, 'Score should increase on near miss');
});

test('Direct collision causes damage, hitstop, and speed reduction', () => {
  const player = { ...createInitialPlayerState(), x: 0, z: 100, speedMph: 100, health: 100 };
  const traffic = [{
    id: 1,
    type: 'semi' as const,
    lane: 0,
    targetLane: 0,
    laneTransitionProgress: 1,
    x: 0.1, // Directly in front
    z: 102, // Overlapping collision box
    speedMph: 40,
    color: 0x999999,
    width: 2.6,
    length: 12.0,
    height: 3.5,
    braking: false,
    blinker: 'none' as const,
    passedByPlayer: false,
  }];

  const result = checkCollisionsAndNearMisses(player, traffic);
  assert.ok(result.collidedWith !== null, 'Should register hard collision');
  assert.ok(result.updatedPlayer.health < 100, 'Health must decrease after crash');
  assert.ok(result.updatedPlayer.speedMph < 100, 'Speed must be knocked down');
  assert.ok(result.updatedPlayer.hitstopRemaining > 0, 'Hitstop must be triggered');
});

test('Road curvature calculation generates continuous smooth values', () => {
  const c1 = getRoadCurvature('route-66', 0);
  const c2 = getRoadCurvature('route-66', 500);
  assert.equal(typeof c1.xOffset, 'number');
  assert.equal(typeof c1.curvatureAngle, 'number');
  assert.notEqual(c1.xOffset, c2.xOffset);
});

test('Lane center positions are distributed evenly across road width', () => {
  const lane0 = getLaneCenterX(0, 4, 16);
  const lane1 = getLaneCenterX(1, 4, 16);
  const lane2 = getLaneCenterX(2, 4, 16);
  const lane3 = getLaneCenterX(3, 4, 16);

  assert.ok(lane0 < lane1);
  assert.ok(lane1 < lane2);
  assert.ok(lane2 < lane3);
  assert.equal(Math.abs(lane0 + lane3), 0); // Symmetric about 0
});

test('Traffic updates spawn and move along highway', () => {
  const highway = HIGHWAYS['route-66'];
  const pool = [spawnTrafficVehicle(highway, 100, 200, 70)];
  const initialZ = pool[0].z;

  const updated = updateTraffic(pool, highway, 50, 70, 'moderate', 0.05);
  assert.ok(updated.length > 0);
  assert.ok(updated[0].z > initialZ, 'Traffic vehicle should move forward with delta time');
});

test('Calculate run results formats metrics properly', () => {
  const player = { ...createInitialPlayerState(), totalDistanceMeters: 5000, speedMph: 145, nearMissCount: 4, nearMissCombo: 3, score: 8500 };
  const summary = calculateRunResults('Historic Route 66', player, 60, true);

  assert.equal(summary.highwayName, 'Historic Route 66');
  assert.ok(summary.distanceMiles > 3.0);
  assert.equal(summary.nearMisses, 4);
  assert.equal(summary.isVictory, true);
});

test('Rocket thruster flight lifts vehicle into the air and consumes fuel', () => {
  const initial = { ...createInitialPlayerState(), speedMph: 100, thrusterFuel: 100, y: 0 };
  const thrusterInput: InputState = { ...mockNeutralInput, thruster: true };
  const vehicle = VEHICLES['supercar'];
  const weather = WEATHER_SETTINGS['clear'];

  const updated = updatePlayerPhysics(initial, thrusterInput, vehicle, weather, 8, 0.05);
  assert.equal(updated.isFlying, true, 'Vehicle should be in flying mode');
  assert.ok(updated.y > 0, 'Altitude Y should rise above the asphalt');
  assert.ok(updated.thrusterFuel < 100, 'Thruster fuel should be consumed');
  assert.ok(updated.speedMph > 100, 'Thrusters should accelerate the car');
});

test('Vacuum mode locks onto ceiling when inside tunnel or overpass', () => {
  // 1. In tunnel with vacuum toggle pressed
  const inTunnelState = { ...createInitialPlayerState(), inTunnel: true, vacuumActive: false, isInverted: false };
  const toggleInput: InputState = { ...mockNeutralInput, vacuumToggleJustPressed: true };
  const vehicle = VEHICLES['muscle'];
  const weather = WEATHER_SETTINGS['clear'];

  const updated = updatePlayerPhysics(inTunnelState, toggleInput, vehicle, weather, 8, 0.05);
  assert.equal(updated.vacuumActive, true, 'Vacuum mode should be activated');
  assert.equal(updated.isInverted, true, 'Car should be inverted on ceiling');
  assert.equal(updated.vacuumAttached, true, 'Car should be attached to ceiling');
  assert.ok(updated.rollAngle > 0, 'Roll angle should rotate towards upside down Math.PI');

  // 2. Flying over traffic while airborne clears collision
  const airbornePlayer = { ...createInitialPlayerState(), x: 0, z: 100, y: 4.5, speedMph: 200, isFlying: true };
  const groundTraffic = [{
    id: 99,
    type: 'semi' as const,
    lane: 0,
    targetLane: 0,
    laneTransitionProgress: 1,
    x: 0,
    z: 100,
    speedMph: 55,
    color: 0x333333,
    width: 2.6,
    length: 12.0,
    height: 3.5,
    braking: false,
    blinker: 'none' as const,
    passedByPlayer: false,
  }];

  const collResult = checkCollisionsAndNearMisses(airbornePlayer, groundTraffic);
  assert.equal(collResult.collidedWith, null, 'Airborne car must clear ground traffic without crashing');
  assert.equal(collResult.updatedPlayer.ceilingFlyoverCount, 1, 'Should record aerial flyover');

  // 3. Under highway overpass with vacuum active locks onto overpass ceiling
  const underOverpassState = { ...createInitialPlayerState(), inOverpass: true, vacuumActive: true, isInverted: false };
  const overpassUpdated = updatePlayerPhysics(underOverpassState, mockNeutralInput, vehicle, weather, 8, 0.05);
  assert.equal(overpassUpdated.isInverted, true, 'Car should invert onto overpass ceiling');
  assert.equal(overpassUpdated.vacuumAttached, true, 'Car should attach to overpass ceiling');
});

test('Phone tilt steering maps gamma (portrait) and beta (landscape) with deadzone and calibration', () => {
  // Small tilt within deadzone returns 0
  assert.equal(computeTiltSteerAxis(1.5, 0, 0), 0);
  // Tilting right in portrait (gamma = +15°) steers right (> 0)
  const rightTilt = computeTiltSteerAxis(15, 0, 0);
  assert.ok(rightTilt > 0.4 && rightTilt < 1, 'Portrait right tilt should produce positive steer');
  // Tilting left in portrait (gamma = -26°) clamps to -1
  assert.equal(computeTiltSteerAxis(-26, 0, 0), -1);
  // Landscape primary (90°) uses beta angle
  const landscapeRight = computeTiltSteerAxis(0, 18, 90);
  assert.ok(landscapeRight > 0.5, 'Landscape right tilt should use beta and steer right');
  // Calibration offset shifts center point
  assert.equal(computeTiltSteerAxis(10, 0, 0, 10), 0, 'Calibrated center angle should produce 0 steer');
});

test('Swipe left/right steering computes proportional analog steer and drives vehicle laterally', () => {
  assert.equal(computeSwipeSteerAxis(2, 390), 0, 'Tiny touch jitter within deadzone should be ignored');
  const swipeLeft = computeSwipeSteerAxis(-45, 390);
  const swipeRight = computeSwipeSteerAxis(85, 390);
  assert.ok(swipeLeft < -0.4, 'Left swipe deltaX should produce negative steer axis');
  assert.equal(swipeRight, 1, 'Full right swipe deltaX should reach +1.0 full lock');

  // Verify swipeSteer and tiltSteer move the player car in updatePlayerPhysics
  const movingCar = { ...createInitialPlayerState(), speedMph: 90, x: 0 };
  const vehicle = VEHICLES['supercar'];
  const weather = WEATHER_SETTINGS['clear'];

  const afterSwipeRight = updatePlayerPhysics(
    movingCar,
    { ...mockNeutralInput, swipeSteer: 0.8 },
    vehicle,
    weather,
    10,
    0.05
  );
  assert.ok(afterSwipeRight.steeringAngle > 0, 'Swipe right should angle front wheels right');
  assert.ok(afterSwipeRight.x > 0, 'Swipe right should move car right across lanes');
  assert.equal(afterSwipeRight.isAccelerating, true, 'Active swipe steering should engage auto-throttle');

  const afterTiltLeft = updatePlayerPhysics(
    movingCar,
    { ...mockNeutralInput, tiltSteer: -0.75 },
    vehicle,
    weather,
    10,
    0.05
  );
  assert.ok(afterTiltLeft.steeringAngle < 0, 'Tilt left should angle front wheels left');
  assert.ok(afterTiltLeft.x < 0, 'Tilt left should move car left across lanes');
});

test('Keyboard Left and Right arrows steer in exact intended lateral directions', () => {
  const movingCar = { ...createInitialPlayerState(), speedMph: 95, x: 0 };
  const vehicle = VEHICLES['supercar'];
  const weather = WEATHER_SETTINGS['clear'];

  const afterLeftArrow = updatePlayerPhysics(
    movingCar,
    { ...mockNeutralInput, forward: true, left: true },
    vehicle,
    weather,
    10,
    0.05
  );
  assert.ok(afterLeftArrow.steeringAngle < 0, 'Left arrow must produce negative steeringAngle (left)');
  assert.ok(afterLeftArrow.x < 0, 'Left arrow must move car left (x < 0)');

  const afterRightArrow = updatePlayerPhysics(
    movingCar,
    { ...mockNeutralInput, forward: true, right: true },
    vehicle,
    weather,
    10,
    0.05
  );
  assert.ok(afterRightArrow.steeringAngle > 0, 'Right arrow must produce positive steeringAngle (right)');
  assert.ok(afterRightArrow.x > 0, 'Right arrow must move car right (x > 0)');
});

test('Post-collision shield immunity prevents instant multi-frame totaling on crash', () => {
  const player = { ...createInitialPlayerState(), x: 0, z: 100, speedMph: 120, health: 100 };
  const traffic = [{
    id: 7,
    type: 'semi' as const,
    lane: 0,
    targetLane: 0,
    laneTransitionProgress: 1,
    x: 0,
    z: 101.5,
    speedMph: 45,
    color: 0x999999,
    width: 2.6,
    length: 12.0,
    height: 3.5,
    braking: false,
    blinker: 'none' as const,
    passedByPlayer: false,
  }];

  // Frame 1: Initial collision registers capped damage and activates 1.35s shield immunity
  const hit1 = checkCollisionsAndNearMisses(player, traffic);
  assert.ok(hit1.collidedWith !== null, 'First frame should register collision');
  assert.ok(hit1.updatedPlayer.health >= 84, 'Single crash should deal at most 16 HP damage');
  assert.ok((hit1.updatedPlayer.invulnerableTimer ?? 0) > 1.0, 'Post-collision shield timer should be active');

  // Frame 2: Overlapping traffic on the next frame must NOT drain additional health while shielded
  const hit2 = checkCollisionsAndNearMisses(hit1.updatedPlayer, traffic);
  assert.equal(hit2.collidedWith, null, 'Shielded player must ignore overlapping traffic');
  assert.equal(hit2.updatedPlayer.health, hit1.updatedPlayer.health, 'Health must not drain during shield window');
});



