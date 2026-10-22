import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from './audio.ts';
import { HighwayWorld } from './environment.ts';
import { HIGHWAYS, WEATHER_SETTINGS, getRoadCurvature } from './highways.ts';
import { createPlayerCarMesh, createSemiTruckMesh, createTrafficCarMesh } from './models.ts';
import {
  checkCollisionsAndNearMisses,
  createInitialPlayerState,
  updatePlayerPhysics,
  VEHICLES,
} from './physics.ts';
import { initializeTrafficPool, updateTraffic } from './traffic.ts';
import {
  CameraView,
  GameState,
  HighwayConfig,
  HighwayId,
  InputState,
  PlayerCarState,
  TrafficDensity,
  TrafficVehicle,
  VehicleConfig,
  VehicleId,
  WeatherCondition,
  WeatherSettings,
} from './types.ts';

export class GameEngine {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public dirLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;

  private container: HTMLElement;
  private animFrameId: number | null = null;
  private clock: THREE.Clock;

  // Active configurations
  public highway: HighwayConfig;
  public weatherCondition: WeatherCondition;
  public weatherSettings: WeatherSettings;
  public vehicleConfig: VehicleConfig;
  public trafficDensity: TrafficDensity = 'moderate';
  public cameraView: CameraView = 'chase';

  // Game state
  public gameState: GameState = 'title';
  public playerState: PlayerCarState;
  public trafficList: TrafficVehicle[] = [];

  // 3D Objects
  private world: HighwayWorld;
  private playerCarMesh: THREE.Group;
  private trafficMeshMap: Map<number, THREE.Group> = new Map();

  // Headlight spot lights
  private headLightL: THREE.SpotLight;
  private headLightR: THREE.SpotLight;
  private headTargetL: THREE.Object3D;
  private headTargetR: THREE.Object3D;

  // Particle systems (sparks, nitro flame, speed streaks)
  private sparkParticles: THREE.Points;
  private nitroFlameMesh!: THREE.Mesh;
  private speedStreaksMesh!: THREE.LineSegments;
  private speedStreakPositions!: Float32Array;
  private speedStreakOffsets!: Float32Array;
  private speedStreakCount = 240;

  // Inputs
  public inputs: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    drift: false,
    boost: false,
    thruster: false,
    tiltSteer: 0,
    swipeSteer: 0,
    autoThrottle: false,
    vacuumToggleJustPressed: false,
    headlightsToggleJustPressed: false,
    cameraToggleJustPressed: false,
    pauseJustPressed: false,
  };

  // State callbacks to React HUD (throttled to <= 10Hz)
  private onHudUpdate?: (player: PlayerCarState, highway: HighwayConfig, weather: WeatherCondition) => void;
  private onGameEnd?: (isVictory: boolean, stats: PlayerCarState) => void;
  private hudUpdateTimer = 0;
  private runElapsedSeconds = 0;

  // Camera damping scratch variables (zero GC in render loop)
  private currentCamPos = new THREE.Vector3();
  private currentCamLook = new THREE.Vector3();
  private desiredCamPosVec = new THREE.Vector3();
  private desiredCamLookVec = new THREE.Vector3();
  private cinematicAngle = 0;
  private isSoftwareGl = false;

  constructor(
    container: HTMLElement,
    highwayId: HighwayId = 'route-66',
    vehicleId: VehicleId = 'muscle',
    weather?: WeatherCondition,
    onHudUpdate?: (player: PlayerCarState, highway: HighwayConfig, weather: WeatherCondition) => void,
    onGameEnd?: (isVictory: boolean, stats: PlayerCarState) => void
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.onGameEnd = onGameEnd;

    this.highway = HIGHWAYS[highwayId] || HIGHWAYS['route-66'];
    this.vehicleConfig = VEHICLES[vehicleId] || VEHICLES['muscle'];
    this.weatherCondition = weather || this.highway.defaultWeather;
    this.weatherSettings = WEATHER_SETTINGS[this.weatherCondition];

    this.clock = new THREE.Clock();
    this.playerState = createInitialPlayerState();

    // 1. Renderer initialization with software WebGL detection
    const probeCanvas = document.createElement('canvas');
    const probeGl = probeCanvas.getContext('webgl');
    const dbgInfo = probeGl?.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbgInfo
      ? probeGl?.getParameter(dbgInfo.UNMASKED_RENDERER_WEBGL) || ''
      : '';
    this.isSoftwareGl =
      /SwiftShader|llvmpipe|softpipe/i.test(rendererStr) ||
      (typeof navigator !== 'undefined' &&
        (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent)));

    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: !this.isSoftwareGl,
      depth: true,
      stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1.0 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(container.clientWidth || 1280, container.clientHeight || 720);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 2. Scene & Environment Map (Studio PBR reflection via RoomEnvironment)
    this.scene = new THREE.Scene();
    this.applyAtmosphere();

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Camera
    this.camera = new THREE.PerspectiveCamera(65, (container.clientWidth || 1280) / (container.clientHeight || 720), 0.1, 800);

    // 4. Lighting Rig (Warm Key Light + Cool Hemisphere Fill)
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, this.weatherSettings.ambientIntensity);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(this.weatherSettings.sunColor, this.weatherSettings.sunIntensity);
    this.dirLight.position.set(40, 60, -30);
    this.dirLight.castShadow = !this.isSoftwareGl;
    if (this.dirLight.shadow) {
      this.dirLight.shadow.mapSize.width = 1024;
      this.dirLight.shadow.mapSize.height = 1024;
      this.dirLight.shadow.camera.near = 10;
      this.dirLight.shadow.camera.far = 150;
      this.dirLight.shadow.camera.left = -25;
      this.dirLight.shadow.camera.right = 25;
      this.dirLight.shadow.camera.top = 25;
      this.dirLight.shadow.camera.bottom = -25;
      this.dirLight.shadow.bias = -0.0005;
    }
    this.scene.add(this.dirLight);

    // 5. Build Road Environment
    this.world = new HighwayWorld(this.scene, this.highway, this.weatherSettings);

    // 6. Player Vehicle Mesh
    this.playerCarMesh = createPlayerCarMesh(this.vehicleConfig);
    this.scene.add(this.playerCarMesh);

    // 7. Dynamic Headlight Spots
    this.headLightL = new THREE.SpotLight(0xffffff, 4.0, 80, Math.PI / 7, 0.4, 1.2);
    this.headLightR = new THREE.SpotLight(0xffffff, 4.0, 80, Math.PI / 7, 0.4, 1.2);
    this.headTargetL = new THREE.Object3D();
    this.headTargetR = new THREE.Object3D();
    this.scene.add(this.headLightL);
    this.scene.add(this.headLightR);
    this.scene.add(this.headTargetL);
    this.scene.add(this.headTargetR);
    this.headLightL.target = this.headTargetL;
    this.headLightR.target = this.headTargetR;

    // 8. Nitro Flame & Sparks Mesh
    const nitroGeo = new THREE.ConeGeometry(0.24, 2.2, 8);
    nitroGeo.rotateX(Math.PI / 2);
    const nitroMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.95,
    });
    this.nitroFlameMesh = new THREE.Mesh(nitroGeo, nitroMat);
    this.nitroFlameMesh.visible = false;
    this.playerCarMesh.add(this.nitroFlameMesh);
    this.nitroFlameMesh.position.set(0, 0.35, -2.8);

    // 9. 3D Speed Lines / Wind Streaks Particle System
    this.buildSpeedStreaks();

    // 10. Spark particles
    const sparkGeo = new THREE.BufferGeometry();
    const sparkCount = 60;
    const sparkPos = new Float32Array(sparkCount * 3);
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 0.25,
      transparent: true,
      opacity: 0.9,
    });
    this.sparkParticles = new THREE.Points(sparkGeo, sparkMat);
    this.sparkParticles.visible = false;
    this.scene.add(this.sparkParticles);

    // Pre-warm shaders
    this.renderer.compile(this.scene, this.camera);

    // Setup traffic pool
    this.trafficList = initializeTrafficPool(this.highway, this.trafficDensity, 0);

    // Resize listener
    window.addEventListener('resize', this.handleResize);

    // Start loop
    this.clock.start();
    this.tick();
  }

  private applyAtmosphere() {
    this.scene.background = new THREE.Color(this.weatherSettings.skyColor);
    this.scene.fog = new THREE.FogExp2(this.weatherSettings.fogColor, this.weatherSettings.fogDensity);
  }

  private buildSpeedStreaks() {
    this.speedStreakPositions = new Float32Array(this.speedStreakCount * 6);
    this.speedStreakOffsets = new Float32Array(this.speedStreakCount * 3);

    for (let i = 0; i < this.speedStreakCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.2 + Math.random() * 8.0;
      const x = Math.cos(angle) * radius;
      const y = 0.6 + Math.abs(Math.sin(angle)) * radius * 0.55;
      const z = (Math.random() - 0.5) * 70;

      this.speedStreakOffsets[i * 3] = x;
      this.speedStreakOffsets[i * 3 + 1] = y;
      this.speedStreakOffsets[i * 3 + 2] = z;

      const idx = i * 6;
      this.speedStreakPositions[idx] = x;
      this.speedStreakPositions[idx + 1] = y;
      this.speedStreakPositions[idx + 2] = z;

      this.speedStreakPositions[idx + 3] = x;
      this.speedStreakPositions[idx + 4] = y;
      this.speedStreakPositions[idx + 5] = z + 2.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.speedStreakPositions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    this.speedStreaksMesh = new THREE.LineSegments(geo, mat);
    this.scene.add(this.speedStreaksMesh);
  }

  public setHighway(id: HighwayId) {
    if (!HIGHWAYS[id]) return;
    this.highway = HIGHWAYS[id];
    this.world.dispose();
    this.world = new HighwayWorld(this.scene, this.highway, this.weatherSettings);
    this.trafficList = initializeTrafficPool(this.highway, this.trafficDensity, this.playerState.z);
    this.syncTrafficMeshes();
  }

  public setVehicle(id: VehicleId) {
    if (!VEHICLES[id]) return;
    this.vehicleConfig = VEHICLES[id];
    this.scene.remove(this.playerCarMesh);
    this.playerCarMesh = createPlayerCarMesh(this.vehicleConfig);
    this.scene.add(this.playerCarMesh);
    this.playerCarMesh.add(this.nitroFlameMesh);
  }

  public setWeather(condition: WeatherCondition) {
    this.weatherCondition = condition;
    this.weatherSettings = WEATHER_SETTINGS[condition];
    this.applyAtmosphere();

    this.hemiLight.color.setHex(0xffffff);
    this.hemiLight.intensity = this.weatherSettings.ambientIntensity;
    this.dirLight.color.setHex(this.weatherSettings.sunColor);
    this.dirLight.intensity = this.weatherSettings.sunIntensity;

    this.world.updateWeatherState(condition, this.weatherSettings);
  }

  public setTrafficDensity(density: TrafficDensity) {
    this.trafficDensity = density;
    this.trafficList = initializeTrafficPool(this.highway, density, this.playerState.z);
    this.syncTrafficMeshes();
  }

  public setCameraView(view: CameraView) {
    this.cameraView = view;
  }

  public startGame() {
    this.gameState = 'playing';
    document.body.dataset.state = 'playing';
    this.playerState = createInitialPlayerState();
    this.runElapsedSeconds = 0;
    this.trafficList = initializeTrafficPool(this.highway, this.trafficDensity, 0);
    this.syncTrafficMeshes();
    soundEngine.ensureUnlocked();
    soundEngine.playUiClick();
  }

  public pauseGame() {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      document.body.dataset.state = 'paused';
      soundEngine.pauseSounds();
    }
  }

  public resumeGame() {
    if (this.gameState === 'paused') {
      this.gameState = 'playing';
      document.body.dataset.state = 'playing';
      soundEngine.ensureUnlocked();
    }
  }

  public restartGame() {
    this.startGame();
  }

  public returnToTitle() {
    this.gameState = 'title';
    document.body.dataset.state = 'title';
    this.playerState = createInitialPlayerState();
    soundEngine.pauseSounds();
  }

  private syncTrafficMeshes() {
    // Remove unused meshes
    const currentIds = new Set(this.trafficList.map((t) => t.id));
    for (const [id, mesh] of this.trafficMeshMap.entries()) {
      if (!currentIds.has(id)) {
        this.scene.remove(mesh);
        this.trafficMeshMap.delete(id);
      }
    }

    // Add new meshes
    for (const t of this.trafficList) {
      if (!this.trafficMeshMap.has(t.id)) {
        let mesh: THREE.Group;
        if (t.type === 'semi') {
          mesh = createSemiTruckMesh(t.color);
        } else {
          mesh = createTrafficCarMesh(t.type, t.color);
        }
        this.scene.add(mesh);
        this.trafficMeshMap.set(t.id, mesh);
      }
    }
  }

  private handleResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.animFrameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.animFrameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.animFrameId = window.setTimeout(cb, 80);
      }
    };
    this.animFrameId = window.setTimeout(poll, 5);
  }

  private tick = () => {
    const rawDt = this.clock.getDelta();
    // Clamped frame delta time
    const dt = Math.min(rawDt, 0.05);

    if (this.gameState === 'playing') {
      this.updatePlayingState(dt);
    } else if (this.gameState === 'title') {
      this.updateTitleState(dt);
    } else if (this.gameState === 'paused') {
      // Keep static render without advancing physics
    }

    // Render frame
    this.renderer.render(this.scene, this.camera);

    // Reset single-frame edge triggers
    this.inputs.vacuumToggleJustPressed = false;
    this.inputs.headlightsToggleJustPressed = false;
    this.inputs.cameraToggleJustPressed = false;
    this.inputs.pauseJustPressed = false;

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.animFrameId = requestAnimationFrame(this.tick);
    }
  };

  public getPlayerState(): PlayerCarState {
    return this.playerState;
  }

  private updateTitleState(dt: number) {
    // Live highway cruise showcase on Title Screen
    this.cinematicAngle += dt * 0.6;
    const demoZ = this.cinematicAngle * 28;
    const { xOffset, curvatureAngle } = getRoadCurvature(this.highway.id, demoZ);

    // Update road, streetlamps, gantry signs, and horizon vista along the cruise
    this.world.update(demoZ, dt);

    // Position hero car on the highway asphalt (slightly offset so it sits in the right-center showcase zone)
    const carShowX = xOffset - 1.4;
    this.playerCarMesh.position.set(carShowX, 0, demoZ);
    this.playerCarMesh.rotation.set(0, curvatureAngle + Math.sin(this.cinematicAngle * 0.7) * 0.06, 0);

    // Dynamic low-slung showcase camera looking forward down the illuminated highway toward the horizon sun/mountains
    const camSwayX = Math.sin(this.cinematicAngle * 0.75) * 2.1;
    const camX = carShowX + 1.35 + camSwayX;
    const camZ = demoZ - 5.2 + Math.cos(this.cinematicAngle * 0.75) * 0.85;
    const camY = 1.55 + Math.sin(this.cinematicAngle * 0.5) * 0.22;

    this.camera.fov = 62;
    this.camera.updateProjectionMatrix();
    this.camera.up.set(0, 1, 0);
    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(carShowX + 0.85, 1.05, demoZ + 18);

    // Rotate wheels at highway cruise speed
    const wheels = this.playerCarMesh.userData.wheels as THREE.Group[];
    if (wheels) {
      wheels.forEach((w) => (w.rotation.x += dt * 14));
    }
  }

  private updatePlayingState(dt: number) {
    this.runElapsedSeconds += dt;

    // Handle view switch shortcut
    if (this.inputs.cameraToggleJustPressed) {
      if (this.cameraView === 'chase') this.cameraView = 'hood';
      else if (this.cameraView === 'hood') this.cameraView = 'bumper';
      else this.cameraView = 'chase';
      soundEngine.playUiClick();
    }

    // Handle pause shortcut
    if (this.inputs.pauseJustPressed) {
      this.pauseGame();
      return;
    }

    // 0. Query overhead ceiling status (tunnel or highway overpass) from road world
    const ceilingStatus = this.world.getCeilingStatus(this.playerState.z);
    this.playerState.inTunnel = ceilingStatus.inTunnel;
    this.playerState.inOverpass = ceilingStatus.inOverpass;

    // 1. Step vehicle physics forward
    const roadHalfWidth = this.highway.roadWidth / 2;
    const prevState = { ...this.playerState };
    this.playerState = updatePlayerPhysics(
      this.playerState,
      this.inputs,
      this.vehicleConfig,
      this.weatherSettings,
      roadHalfWidth,
      dt
    );

    // Nitro sound trigger
    if (this.playerState.isBoosting && !prevState.isBoosting) {
      soundEngine.playNitroBoost();
    }

    // 2. Update dynamic traffic
    this.trafficList = updateTraffic(
      this.trafficList,
      this.highway,
      this.playerState.z,
      this.playerState.speedMph,
      this.trafficDensity,
      dt
    );
    this.syncTrafficMeshes();

    // Slipstream Drafting detection
    let isDrafting = false;
    for (const t of this.trafficList) {
      const dz = t.z - this.playerState.z;
      const dx = Math.abs(t.x - this.playerState.x);
      if (dz > 1.8 && dz < 26 && dx < 1.4 && this.playerState.speedMph > 50) {
        isDrafting = true;
        break;
      }
    }
    this.playerState.isDrafting = isDrafting;
    if (isDrafting) {
      this.playerState.draftProgress = Math.min(1.0, this.playerState.draftProgress + dt * 1.8);
      // Aerodynamic draft suction surge
      this.playerState.speedMph = Math.min(this.playerState.speedMph + 20 * dt, this.vehicleConfig.topSpeedMph * 1.16);
      this.playerState.score += Math.round(dt * 150);
    } else {
      this.playerState.draftProgress = Math.max(0, this.playerState.draftProgress - dt * 2.2);
    }

    // 3. Collision & Near-Miss check
    const { collidedWith, nearMissWith, updatedPlayer } = checkCollisionsAndNearMisses(
      this.playerState,
      this.trafficList
    );
    this.playerState = updatedPlayer;

    // 4. Update road world & compute road curve offset
    this.world.update(this.playerState.z, dt);
    const { xOffset, curvatureAngle } = getRoadCurvature(this.highway.id, this.playerState.z);

    if (collidedWith) {
      soundEngine.playCrashImpact();
      this.triggerCrashSparks(xOffset - collidedWith.x, collidedWith.z);
    } else if (nearMissWith) {
      soundEngine.playNearMissWhoosh();
    }

    // Check game over (health <= 0)
    if (this.playerState.health <= 0) {
      this.gameState = 'gameover';
      document.body.dataset.state = 'gameover';
      soundEngine.pauseSounds();
      this.onGameEnd?.(false, this.playerState);
      return;
    }

    // Check victory (completed target distance e.g. 10,000 meters / 6.2 miles sprint)
    if (this.playerState.totalDistanceMeters >= 10000) {
      this.gameState = 'gameover';
      document.body.dataset.state = 'gameover';
      soundEngine.playVictoryFanfare();
      this.onGameEnd?.(true, this.playerState);
      return;
    }

    // 5. Update audio synth (including rocket thrusters and vacuum suction)
    soundEngine.updateEngineSound(
      this.playerState.speedMph,
      this.playerState.rpm,
      this.playerState.isBoosting,
      this.playerState.isDrifting,
      this.playerState.isBraking,
      this.playerState.isFlying,
      this.playerState.isInverted,
      this.playerState.vacuumActive
    );

    // 6. Update player car 3D mesh transform along road curve
    // NOTE: Camera looks down +Z with +Y up, so Screen Left is +X and Screen Right is -X.
    // Since playerState.x < 0 is Left and playerState.x > 0 is Right, world X = xOffset - playerState.x!
    const carX = xOffset - this.playerState.x;
    const carY = this.playerState.y;
    const carZ = this.playerState.z;

    this.playerCarMesh.position.set(carX, carY, carZ);
    // Yaw follows road curve + steering & drift angle (steeringAngle < 0 = Left = +Y rotation toward +X!)
    this.playerCarMesh.rotation.y =
      curvatureAngle - this.playerState.slipAngle - this.playerState.steeringAngle * 0.14;
    // Roll bank: includes rollAngle (smoothly reaches Math.PI when inverted on ceiling!) + subtle turn bank
    this.playerCarMesh.rotation.z =
      this.playerState.rollAngle +
      this.playerState.steeringAngle * (this.playerState.isFlying ? 0.22 : 0.07);
    // Pitch: nose lifts when flying, squats under acceleration, dives under braking
    this.playerCarMesh.rotation.x = this.playerState.isFlying
      ? -0.075
      : this.playerState.isBraking
      ? 0.04
      : this.playerState.isAccelerating
      ? -0.025
      : 0;

    // Spin wheels & steer front wheel pivots
    const wheelRotSpeed = (this.playerState.speedMph * 0.44704) / 0.39;
    const uData = this.playerCarMesh.userData;
    const wheels = uData.wheels as THREE.Group[];
    if (wheels) {
      wheels.forEach((w) => (w.rotation.x += wheelRotSpeed * dt));
    }
    const frontSteerPivots = uData.frontSteerPivots as THREE.Group[];
    if (frontSteerPivots) {
      const steerYaw = -this.playerState.steeringAngle * 0.38;
      frontSteerPivots.forEach((pivot) => {
        pivot.rotation.y = steerYaw;
      });
    }

    // Animate rocket thrusters, stabilizer winglets, and vacuum rings
    if (uData.thrusterFlameL && uData.thrusterFlameR) {
      const isFlying = this.playerState.isFlying;
      uData.thrusterFlameL.visible = isFlying;
      uData.thrusterFlameR.visible = isFlying;
      if (isFlying) {
        const pulse = 1.0 + (Math.random() - 0.5) * 0.42;
        uData.thrusterFlameL.scale.set(pulse, pulse, pulse * 1.55);
        uData.thrusterFlameR.scale.set(pulse, pulse, pulse * 1.55);
      }
    }
    if (uData.wingletL && uData.wingletR) {
      const targetRoll = this.playerState.isFlying ? -0.28 : 0;
      uData.wingletL.rotation.z += (targetRoll - uData.wingletL.rotation.z) * Math.min(1.0, dt * 10);
      uData.wingletR.rotation.z += (-targetRoll - uData.wingletR.rotation.z) * Math.min(1.0, dt * 10);
    }
    if (uData.vacuumRingFront && uData.vacuumRingRear) {
      const isVacActive =
        this.playerState.isInverted ||
        this.playerState.vacuumActive ||
        (this.playerState.invulnerableTimer ?? 0) > 0;
      const ringMatF = uData.vacuumRingFront.material as THREE.MeshBasicMaterial;
      const ringMatR = uData.vacuumRingRear.material as THREE.MeshBasicMaterial;
      if (isVacActive) {
        ringMatF.opacity = this.playerState.isInverted ? 0.95 : 0.65;
        ringMatR.opacity = this.playerState.isInverted ? 0.95 : 0.65;
        uData.vacuumRingFront.rotation.z += dt * 25;
        uData.vacuumRingRear.rotation.z += dt * 25;
      } else {
        ringMatF.opacity = 0.16;
        ringMatR.opacity = 0.16;
      }
    }

    // Nitro exhaust flame visibility & scale
    if (this.nitroFlameMesh) {
      this.nitroFlameMesh.visible = this.playerState.isBoosting && !this.playerState.isFlying;
      if (this.playerState.isBoosting) {
        const flicker = 1.0 + (Math.random() - 0.5) * 0.3;
        this.nitroFlameMesh.scale.set(flicker, flicker, flicker * 1.5);
      }
    }

    // 7. Update Speed Streaks / Wind Rush Lines
    if (this.speedStreaksMesh) {
      const speed = this.playerState.speedMph;
      const speedRatio = speed / 220;
      const mat = this.speedStreaksMesh.material as THREE.LineBasicMaterial;

      if (speed > 45) {
        mat.opacity = Math.min(
          0.9,
          (speed - 45) / 95 + (this.playerState.isBoosting ? 0.35 : 0) + (this.playerState.isFlying ? 0.45 : 0)
        );
        mat.color.setHex(
          this.playerState.isFlying
            ? 0x38bdf8
            : this.playerState.isBoosting
            ? 0x67e8f9
            : this.playerState.isDrafting
            ? 0x34d399
            : 0xffffff
        );

        const streakLength =
          1.8 + speedRatio * 5.5 + (this.playerState.isBoosting ? 3.0 : 0) + (this.playerState.isFlying ? 4.5 : 0);
        const speedMps = speed * 0.44704;

        for (let i = 0; i < this.speedStreakCount; i++) {
          this.speedStreakOffsets[i * 3 + 2] -= speedMps * dt * 2.0;
          if (this.speedStreakOffsets[i * 3 + 2] < -15) {
            this.speedStreakOffsets[i * 3 + 2] = 50 + Math.random() * 25;
          }

          const localX = this.speedStreakOffsets[i * 3];
          const localY = this.speedStreakOffsets[i * 3 + 1];
          const localZ = this.speedStreakOffsets[i * 3 + 2];

          const pIdx = i * 6;
          this.speedStreakPositions[pIdx] = carX + localX;
          this.speedStreakPositions[pIdx + 1] = carY + localY;
          this.speedStreakPositions[pIdx + 2] = carZ + localZ;

          this.speedStreakPositions[pIdx + 3] = carX + localX;
          this.speedStreakPositions[pIdx + 4] = carY + localY;
          this.speedStreakPositions[pIdx + 5] = carZ + localZ + streakLength;
        }
        this.speedStreaksMesh.geometry.attributes.position.needsUpdate = true;
      } else {
        mat.opacity = 0;
      }
    }

    // 8. Update Headlight Spotlights
    const lightOn = this.playerState.headlightsOn;
    this.headLightL.intensity = lightOn ? 4.8 : 0;
    this.headLightR.intensity = lightOn ? 4.8 : 0;
    const fwdDist = 55;
    const beamAngle = curvatureAngle - this.playerState.slipAngle;
    const beamZ = carZ + Math.cos(beamAngle) * fwdDist;
    const beamX = carX + Math.sin(beamAngle) * fwdDist;

    this.headLightL.position.set(carX - 0.7, carY + 0.7, carZ + 1.8);
    this.headLightR.position.set(carX + 0.7, carY + 0.7, carZ + 1.8);
    this.headTargetL.position.set(beamX - 1.2, carY + 0.2, beamZ);
    this.headTargetR.position.set(beamX + 1.2, carY + 0.2, beamZ);

    // 9. Update Traffic Meshes (world X = tCurv.xOffset - t.x so Left/Right matches player!)
    for (const t of this.trafficList) {
      const mesh = this.trafficMeshMap.get(t.id);
      if (mesh) {
        const tCurv = getRoadCurvature(this.highway.id, t.z);
        mesh.position.set(tCurv.xOffset - t.x, 0, t.z);
        mesh.rotation.y = tCurv.curvatureAngle;
      }
    }

    // 10. Camera Follow Rig with Exponential Damping & Trauma Shake
    this.updateCamera(carX, carY, carZ, curvatureAngle, dt);

    // 11. Throttle HUD update to React (10Hz)
    this.hudUpdateTimer += dt;
    if (this.hudUpdateTimer >= 0.1) {
      this.hudUpdateTimer = 0;
      this.onHudUpdate?.(this.playerState, this.highway, this.weatherCondition);
    }
  }

  private updateCamera(targetX: number, targetY: number, targetZ: number, roadAngle: number, dt: number) {
    let desiredCamX = targetX;
    let desiredCamY = targetY;
    let desiredCamZ = targetZ;
    let lookX = targetX + Math.sin(roadAngle) * 24;
    let lookY = targetY + 1.0;
    let lookZ = targetZ + 24;

    const speedRatio = this.playerState.speedMph / 220;
    // Dynamic FOV warp: up to 112° on Thruster Flight Mode!
    const targetFov =
      72 +
      speedRatio * 28 +
      (this.playerState.isBoosting ? 12 : 0) +
      (this.playerState.isFlying ? 16 : 0);
    this.camera.fov = targetFov;
    this.camera.updateProjectionMatrix();

    if (this.cameraView === 'chase') {
      const dist = 4.9 + speedRatio * 1.05 + (this.playerState.isBoosting ? 0.55 : 0);
      const height = this.playerState.isInverted ? -1.15 : 1.32 + speedRatio * 0.12;
      desiredCamX = targetX - Math.sin(roadAngle) * dist;
      desiredCamZ = targetZ - Math.cos(roadAngle) * dist;
      desiredCamY = targetY + height;
      lookZ = targetZ + 26;
      lookY = targetY + (this.playerState.isInverted ? -0.45 : 0.88);
    } else if (this.cameraView === 'hood') {
      desiredCamX = targetX + Math.sin(roadAngle) * 0.4;
      desiredCamZ = targetZ + 0.8;
      desiredCamY = targetY + 0.98;
      lookZ = targetZ + 32;
      lookY = targetY + 0.85;
    } else if (this.cameraView === 'bumper') {
      desiredCamX = targetX;
      desiredCamZ = targetZ + 1.9;
      desiredCamY = targetY + 0.38;
      lookZ = targetZ + 36;
      lookY = targetY + 0.32;
    }

    // Subtle dynamic camera horizon tilt on sharp turns while keeping UP upright so Left/Right never invert
    const camRollTilt = -this.playerState.steeringAngle * 0.035;
    this.camera.up.set(Math.sin(camRollTilt), Math.cos(camRollTilt), 0);

    // High speed micro-vibrations
    if (this.playerState.speedMph > 75) {
      const tremor = ((this.playerState.speedMph - 75) / 150) * 0.04;
      desiredCamX += (Math.random() - 0.5) * tremor;
      desiredCamY += (Math.random() - 0.5) * tremor;
    }

    // Crash trauma shake
    const trauma = this.playerState.trauma;
    if (trauma > 0.01) {
      const shakeAmt = trauma * trauma * 0.42;
      desiredCamX += (Math.random() - 0.5) * shakeAmt;
      desiredCamY += (Math.random() - 0.5) * shakeAmt;
      desiredCamZ += (Math.random() - 0.5) * shakeAmt;
    }

    // Frame-rate independent exponential damping (zero allocation)
    const dampFactor = 1 - Math.exp(-15 * dt);
    this.desiredCamPosVec.set(desiredCamX, desiredCamY, desiredCamZ);
    this.desiredCamLookVec.set(lookX, lookY, lookZ);
    this.currentCamPos.lerp(this.desiredCamPosVec, dampFactor);
    this.currentCamLook.lerp(this.desiredCamLookVec, dampFactor);

    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentCamLook);
  }

  private triggerCrashSparks(x: number, z: number) {
    if (!this.sparkParticles) return;
    this.sparkParticles.visible = true;
    this.sparkParticles.position.set(x, 0.8, z);

    const pos = this.sparkParticles.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i] = (Math.random() - 0.5) * 2.5;
      pos[i + 1] = Math.random() * 1.8;
      pos[i + 2] = (Math.random() - 0.5) * 2.5;
    }
    this.sparkParticles.geometry.attributes.position.needsUpdate = true;

    setTimeout(() => {
      if (this.sparkParticles) this.sparkParticles.visible = false;
    }, 280);
  }

  public dispose() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      clearTimeout(this.animFrameId);
    }
    window.removeEventListener('resize', this.handleResize);
    soundEngine.pauseSounds();
    if (this.speedStreaksMesh) {
      this.scene.remove(this.speedStreaksMesh);
      this.speedStreaksMesh.geometry.dispose();
    }
    this.world.dispose();
    this.renderer.dispose();
  }
}
