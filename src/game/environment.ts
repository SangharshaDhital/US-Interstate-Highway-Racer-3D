import * as THREE from 'three';
import { getRoadCurvature } from './highways.ts';
import { HighwayConfig, WeatherCondition, WeatherSettings } from './types.ts';

/**
 * Procedural generator for realistic asphalt highway texture + bump map with lane markers, rumble strips, and cat's-eye studs.
 */
function createHighwayTextures(
  lanes: number,
  roadWidth: number,
  shieldType: string,
  routeNumber: string
): { colorMap: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 512;
  bumpCanvas.height = 512;
  const bCtx = bumpCanvas.getContext('2d')!;

  // 1. Deep charcoal asphalt base with subtle wear tracks
  ctx.fillStyle = '#1e242d';
  ctx.fillRect(0, 0, 1024, 1024);

  // Micro-noise for asphalt aggregate grain
  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 22;
    data[i] = Math.min(255, Math.max(0, data[i] + grain));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain));
  }
  ctx.putImageData(imgData, 0, 0);

  // Bump map noise
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 512, 512);
  const bData = bCtx.getImageData(0, 0, 512, 512);
  for (let i = 0; i < bData.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 60;
    bData.data[i] = v;
    bData.data[i + 1] = v;
    bData.data[i + 2] = v;
  }
  bCtx.putImageData(bData, 0, 0);

  // Shoulder asphalt borders & rumble strips
  ctx.fillStyle = '#2d3542';
  ctx.fillRect(0, 0, 52, 1024);
  ctx.fillRect(972, 0, 52, 1024);

  // Textured red/amber and white shoulder rumble strips
  for (let y = 0; y < 1024; y += 32) {
    ctx.fillStyle = y % 64 === 0 ? '#dc2626' : '#f8fafc';
    ctx.fillRect(10, y + 4, 24, 16);
    ctx.fillRect(990, y + 4, 24, 16);
  }

  // Note: Camera looks toward +Z, so world +X (u=1, x=960) is Screen Left, and world -X (u=0, x=64) is Screen Right!
  // 2. Yellow solid double line on LEFT shoulder (near x = 955)
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(956, 0, 10, 1024);
  ctx.fillRect(938, 0, 10, 1024);

  // 3. White solid line on RIGHT shoulder (near x = 56)
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(54, 0, 14, 1024);

  // 4. Tire polish tracks in center of each lane + dashed white lane dividers + reflective cat's eyes
  const laneSpanPx = (938 - 68) / lanes;
  for (let l = 0; l < lanes; l++) {
    const laneCenter = 68 + (l + 0.5) * laneSpanPx;
    const grad = ctx.createLinearGradient(laneCenter - laneSpanPx * 0.35, 0, laneCenter + laneSpanPx * 0.35, 0);
    grad.addColorStop(0, 'rgba(15,23,42,0)');
    grad.addColorStop(0.3, 'rgba(15,23,42,0.22)');
    grad.addColorStop(0.5, 'rgba(148,163,184,0.06)');
    grad.addColorStop(0.7, 'rgba(15,23,42,0.22)');
    grad.addColorStop(1, 'rgba(15,23,42,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(laneCenter - laneSpanPx * 0.4, 0, laneSpanPx * 0.8, 1024);
  }

  for (let l = 1; l < lanes; l++) {
    const x = 68 + l * laneSpanPx;
    for (let y = 0; y < 1024; y += 128) {
      // Crisp white lane dash
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(x - 6, y + 18, 12, 84);
      // Glowing cyan/amber reflective cat's-eye road stud in the gap
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(x - 5, y + 110, 10, 10);
    }
  }

  // 5. Road shield stencil (Interstate or Route 66 crest stamped on pavement)
  // Flip X on canvas so when viewed looking toward +Z, the stencil reads left-to-right!
  ctx.save();
  ctx.translate(512, 512);
  ctx.scale(-1, -1);
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 7;

  ctx.beginPath();
  ctx.arc(0, -24, 58, Math.PI, 0, false);
  ctx.lineTo(48, 54);
  ctx.lineTo(0, 88);
  ctx.lineTo(-48, 54);
  ctx.closePath();
  ctx.stroke();

  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(routeNumber, 0, 12);
  ctx.restore();

  const colorMap = new THREE.CanvasTexture(canvas);
  colorMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = THREE.RepeatWrapping;
  colorMap.repeat.set(1, 14);
  colorMap.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(4, 56);

  return { colorMap, bumpMap };
}

export class HighwayWorld {
  public scene: THREE.Scene;
  public roadGroup: THREE.Group;
  public sceneryGroup: THREE.Group;
  public weatherGroup: THREE.Group;
  public horizonGroup: THREE.Group;
  public roadMaterial: THREE.MeshStandardMaterial;

  private roadSegments: THREE.Mesh[] = [];
  private segmentCount = 35;
  private segmentLength = 25; // 25m each = 875m total active roadway
  private activeHighway: HighwayConfig;
  private rainParticles: THREE.Points | null = null;
  private snowParticles: THREE.Points | null = null;
  private gantrySigns: THREE.Group[] = [];

  private terrainMesh!: THREE.Mesh;
  private delineatorInst!: THREE.InstancedMesh;
  private streetLampPoleInst!: THREE.InstancedMesh;
  private streetLampBulbInst!: THREE.InstancedMesh;
  private delineatorCount = 100;
  private delineatorSpacing = 8;
  private streetLampCount = 40;
  private streetLampSpacing = 24;
  private tunnels: { mesh: THREE.Group; startZ: number; length: number }[] = [];
  private overpasses: { mesh: THREE.Group; startZ: number; length: number }[] = [];
  public tunnelLength = 120;
  public overpassLength = 40;
  public cycleSpan = 960;

  private dummy = new THREE.Object3D();

  constructor(scene: THREE.Scene, highway: HighwayConfig, weather: WeatherSettings) {
    this.scene = scene;
    this.activeHighway = highway;

    this.roadGroup = new THREE.Group();
    this.sceneryGroup = new THREE.Group();
    this.weatherGroup = new THREE.Group();
    this.horizonGroup = new THREE.Group();

    this.scene.add(this.roadGroup);
    this.scene.add(this.sceneryGroup);
    this.scene.add(this.weatherGroup);
    this.scene.add(this.horizonGroup);

    // Create road material with procedural asphalt texture + bump grain
    const { colorMap, bumpMap } = createHighwayTextures(
      highway.lanes,
      highway.roadWidth,
      highway.shieldType,
      highway.routeNumber
    );
    this.roadMaterial = new THREE.MeshStandardMaterial({
      map: colorMap,
      bumpMap,
      bumpScale: 0.02,
      color: 0xffffff, // Full texture brightness per Three.js PBR standard
      roughness: weather.roadRoughness,
      metalness: 0.22,
    });

    this.buildTerrain();
    this.buildHorizonVista(weather);
    this.buildRoadSegments();
    this.buildDelineatorPosts();
    this.buildStreetLamps();
    this.buildScenery();
    this.buildTunnels();
    this.buildOverpasses();
    this.buildWeatherParticles();
    this.buildOverheadGantries();
  }

  /**
   * Builds a dramatic horizon backdrop (Glowing Sun/Moon Corona + Layered Mountain Ridgeline Silhouette)
   * that tracks playerZ so the highway always drives toward an epic vista.
   */
  private buildHorizonVista(_weather: WeatherSettings) {
    // 1. Atmospheric Horizon Glow Band behind the mountains
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 512;
    glowCanvas.height = 256;
    const gCtx = glowCanvas.getContext('2d')!;
    const hGrad = gCtx.createLinearGradient(0, 0, 0, 256);
    hGrad.addColorStop(0, 'rgba(30, 27, 75, 0)');
    hGrad.addColorStop(0.45, 'rgba(234, 88, 12, 0.38)');
    hGrad.addColorStop(0.82, 'rgba(251, 191, 36, 0.65)');
    hGrad.addColorStop(1, 'rgba(249, 115, 22, 0.15)');
    gCtx.fillStyle = hGrad;
    gCtx.fillRect(0, 0, 512, 256);

    const glowTex = new THREE.CanvasTexture(glowCanvas);
    glowTex.colorSpace = THREE.SRGBColorSpace;
    const glowMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide,
    });
    const glowPlane = new THREE.Mesh(new THREE.PlaneGeometry(1100, 180), glowMat);
    glowPlane.position.set(0, 62, 430);
    this.horizonGroup.add(glowPlane);

    // 2. Glowing Solar / Lunar Disc & Horizon Corona Billboard framed over the highway
    const sunCanvas = document.createElement('canvas');
    sunCanvas.width = 512;
    sunCanvas.height = 512;
    const sCtx = sunCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(256, 256, 22, 256, 256, 245);
    grad.addColorStop(0, 'rgba(255, 253, 240, 1.0)');
    grad.addColorStop(0.24, 'rgba(253, 224, 71, 0.95)');
    grad.addColorStop(0.48, 'rgba(249, 115, 22, 0.55)');
    grad.addColorStop(0.78, 'rgba(225, 29, 72, 0.18)');
    grad.addColorStop(1, 'rgba(225, 29, 72, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 512, 512);

    // Crisp horizontal horizon scanlines across lower sun disc
    sCtx.globalCompositeOperation = 'destination-out';
    for (let y = 285; y < 390; y += 13) {
      const h = Math.max(2, (y - 275) * 0.085);
      sCtx.fillRect(90, y, 332, h);
    }
    sCtx.globalCompositeOperation = 'source-over';

    const sunTex = new THREE.CanvasTexture(sunCanvas);
    sunTex.colorSpace = THREE.SRGBColorSpace;
    const sunMat = new THREE.MeshBasicMaterial({
      map: sunTex,
      transparent: true,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const sunGeo = new THREE.PlaneGeometry(165, 165);
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(0, 42, 415);
    this.horizonGroup.add(sunMesh);

    // 3. Panoramic Mountain Range Silhouette across the horizon with central highway pass
    const mountainShape = new THREE.Shape();
    mountainShape.moveTo(-520, -4);
    const peaks: [number, number][] = [
      [-460, 42],
      [-380, 22],
      [-305, 68],
      [-230, 28],
      [-155, 76],
      [-85, 34],
      [-38, 8], // Wide central highway canyon pass
      [38, 8],
      [92, 48],
      [168, 78],
      [245, 32],
      [330, 66],
      [415, 28],
      [520, 46],
    ];
    for (const [px, py] of peaks) {
      mountainShape.lineTo(px, py);
    }
    mountainShape.lineTo(520, -4);
    mountainShape.closePath();

    const mountainGeo = new THREE.ExtrudeGeometry(mountainShape, {
      depth: 12,
      bevelEnabled: true,
      bevelSize: 1.5,
      bevelThickness: 2,
      bevelSegments: 2,
    });
    const mountainColor =
      this.activeHighway.sceneryType === 'snow_mountains'
        ? 0x334155
        : this.activeHighway.sceneryType === 'desert_rock'
        ? 0x451a03
        : 0x0f172a;
    const mountainMat = new THREE.MeshBasicMaterial({
      color: mountainColor,
      fog: false,
    });
    const mountainMesh = new THREE.Mesh(mountainGeo, mountainMat);
    mountainMesh.position.set(0, -2, 395);
    this.horizonGroup.add(mountainMesh);
  }

  private buildDelineatorPosts() {
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6);
    postGeo.translate(0, 0.6, 0);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.5,
    });
    this.delineatorInst = new THREE.InstancedMesh(postGeo, postMat, this.delineatorCount);
    this.delineatorInst.frustumCulled = false;
    this.scene.add(this.delineatorInst);
  }

  private buildStreetLamps() {
    // Tall curved highway luminaire poles + glowing LED light heads
    const poleGeo = new THREE.CylinderGeometry(0.09, 0.14, 7.5, 8);
    poleGeo.translate(0, 3.75, 0);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.85,
      roughness: 0.25,
    });
    this.streetLampPoleInst = new THREE.InstancedMesh(poleGeo, poleMat, this.streetLampCount);
    this.streetLampPoleInst.frustumCulled = false;
    this.scene.add(this.streetLampPoleInst);

    const bulbGeo = new THREE.BoxGeometry(1.4, 0.14, 0.4);
    bulbGeo.translate(0, 7.5, 0);
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfbbf24,
      emissiveIntensity: 2.8,
      roughness: 0.1,
    });
    this.streetLampBulbInst = new THREE.InstancedMesh(bulbGeo, bulbMat, this.streetLampCount);
    this.streetLampBulbInst.frustumCulled = false;
    this.scene.add(this.streetLampBulbInst);
  }

  private buildTerrain() {
    const geo = new THREE.PlaneGeometry(900, 1400);
    geo.rotateX(-Math.PI / 2);

    let terrainColor = 0x9a3412;
    const type = this.activeHighway.sceneryType;
    if (type === 'desert_rock' || type === 'arid_dunes') {
      terrainColor = 0x9a3412;
    } else if (type === 'snow_mountains') {
      terrainColor = 0x94a3b8;
    } else if (type === 'eastern_forest') {
      terrainColor = 0x14532d;
    } else if (type === 'plains') {
      terrainColor = 0x713f12;
    } else if (type === 'autumn_hills') {
      terrainColor = 0x7c2d12;
    } else if (type === 'coastal_ocean' || type === 'tropical_bridge') {
      terrainColor = 0x0369a1;
    }

    const mat = new THREE.MeshStandardMaterial({
      color: terrainColor,
      roughness: 0.92,
      metalness: 0.06,
    });

    this.terrainMesh = new THREE.Mesh(geo, mat);
    this.terrainMesh.position.set(0, -0.05, 400);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);
  }

  private buildRoadSegments() {
    const width = this.activeHighway.roadWidth;
    const geo = new THREE.PlaneGeometry(width, this.segmentLength, 2, 2);
    geo.rotateX(-Math.PI / 2);

    // Concrete shoulder curb / jersey barrier rails on each road segment
    const barrierGeo = new THREE.BoxGeometry(0.45, 0.72, this.segmentLength);
    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.65,
      metalness: 0.25,
    });

    for (let i = 0; i < this.segmentCount; i++) {
      const mesh = new THREE.Mesh(geo, this.roadMaterial);
      mesh.receiveShadow = true;
      mesh.position.y = 0;

      // Left & Right concrete highway guardrails
      const barrierL = new THREE.Mesh(barrierGeo, barrierMat);
      barrierL.position.set(width / 2 + 0.55, 0.36, 0);
      mesh.add(barrierL);

      const barrierR = new THREE.Mesh(barrierGeo, barrierMat);
      barrierR.position.set(-width / 2 - 0.55, 0.36, 0);
      mesh.add(barrierR);

      this.roadSegments.push(mesh);
      this.roadGroup.add(mesh);
    }
  }

  private buildScenery() {
    const type = this.activeHighway.sceneryType;

    if (type === 'desert_rock' || type === 'arid_dunes') {
      this.buildDesertScenery();
    } else if (type === 'coastal_ocean') {
      this.buildCoastalScenery();
    } else if (type === 'snow_mountains') {
      this.buildSnowMountainsScenery();
    } else if (type === 'tropical_bridge') {
      this.buildBridgeScenery();
    } else {
      this.buildForestScenery(type === 'autumn_hills');
    }
  }

  private buildDesertScenery() {
    // Flat-topped terraced Monument Valley mesas set well outside the highway corridor
    const mesaGeo = new THREE.CylinderGeometry(8, 15, 18, 7);
    mesaGeo.translate(0, 9, 0);
    const mesaMat = new THREE.MeshStandardMaterial({
      color: 0x9a3412,
      roughness: 0.92,
      metalness: 0.05,
    });
    const mesaInst = new THREE.InstancedMesh(mesaGeo, mesaMat, 36);
    mesaInst.frustumCulled = false;

    const dummy = new THREE.Object3D();
    const rockPalette = [0x9a3412, 0x7c2d12, 0xb45309, 0x92400e];
    for (let i = 0; i < 36; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const z = i * 26;
      const { xOffset } = getRoadCurvature(this.activeHighway.id, z);
      const lateralClearance = this.activeHighway.roadWidth / 2 + 48 + (i % 4) * 22;
      const x = xOffset + side * lateralClearance;
      const scale = 0.8 + (i % 3) * 0.45;
      dummy.position.set(x, -0.5, z);
      dummy.scale.set(scale * 1.3, scale * 0.95, scale * 1.2);
      dummy.rotation.set(0, (i * 1.1) % Math.PI, 0);
      dummy.updateMatrix();
      mesaInst.setMatrixAt(i, dummy.matrix);
      mesaInst.setColorAt(i, new THREE.Color(rockPalette[i % rockPalette.length]));
    }
    mesaInst.instanceMatrix.needsUpdate = true;
    if (mesaInst.instanceColor) mesaInst.instanceColor.needsUpdate = true;
    this.sceneryGroup.add(mesaInst);

    // Saguaro Cacti along the highway shoulders (aligned with road curvature)
    const cactusGeo = new THREE.CylinderGeometry(0.28, 0.36, 4.4, 8);
    cactusGeo.translate(0, 2.2, 0);
    const cactusMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.78,
    });
    const cactusInst = new THREE.InstancedMesh(cactusGeo, cactusMat, 48);
    cactusInst.frustumCulled = false;
    for (let i = 0; i < 48; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const z = i * 19;
      const { xOffset } = getRoadCurvature(this.activeHighway.id, z);
      const x = xOffset + side * (this.activeHighway.roadWidth / 2 + 6.5 + (i % 5) * 4.5);
      dummy.position.set(x, 0, z);
      dummy.scale.set(1, 0.85 + (i % 3) * 0.22, 1);
      dummy.rotation.set(0, i * 0.7, 0);
      dummy.updateMatrix();
      cactusInst.setMatrixAt(i, dummy.matrix);
    }
    cactusInst.instanceMatrix.needsUpdate = true;
    this.sceneryGroup.add(cactusInst);
  }

  private buildCoastalScenery() {
    const oceanGeo = new THREE.PlaneGeometry(350, 1100);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      roughness: 0.12,
      metalness: 0.85,
      clearcoat: 1.0,
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.position.set(210, -4.5, 400);
    this.sceneryGroup.add(ocean);

    const cliffGeo = new THREE.BoxGeometry(45, 26, 950);
    const cliffMat = new THREE.MeshStandardMaterial({
      color: 0x78716c,
      roughness: 0.92,
    });
    const cliff = new THREE.Mesh(cliffGeo, cliffMat);
    cliff.position.set(-this.activeHighway.roadWidth / 2 - 48, 10, 400);
    this.sceneryGroup.add(cliff);
  }

  private buildSnowMountainsScenery() {
    const pineGeo = new THREE.ConeGeometry(2.2, 6.2, 7);
    pineGeo.translate(0, 3.1, 0);

    const pineMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.78,
    });
    const pineInst = new THREE.InstancedMesh(pineGeo, pineMat, 85);
    pineInst.frustumCulled = false;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < 85; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const z = i * 11;
      const { xOffset } = getRoadCurvature(this.activeHighway.id, z);
      const x = xOffset + side * (this.activeHighway.roadWidth / 2 + 8 + (i % 6) * 7);
      const s = 0.8 + (i % 4) * 0.25;
      dummy.position.set(x, 0, z);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      pineInst.setMatrixAt(i, dummy.matrix);
    }
    pineInst.instanceMatrix.needsUpdate = true;
    this.sceneryGroup.add(pineInst);
  }

  private buildBridgeScenery() {
    const waterGeo = new THREE.PlaneGeometry(850, 1100);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x0d9488,
      roughness: 0.14,
      metalness: 0.8,
      clearcoat: 1.0,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(0, -4.5, 400);
    this.sceneryGroup.add(water);
  }

  private buildForestScenery(isAutumn: boolean) {
    const leafGeo = new THREE.ConeGeometry(2.4, 5.6, 7);
    leafGeo.translate(0, 2.8, 0);
    const leafColors = isAutumn
      ? [0xea580c, 0xd97706, 0xb91c1c, 0xfacc15]
      : [0x15803d, 0x166534, 0x14532d, 0x22c55e];

    const leafMat = new THREE.MeshStandardMaterial({
      color: leafColors[0],
      roughness: 0.78,
    });
    const inst = new THREE.InstancedMesh(leafGeo, leafMat, 90);
    inst.frustumCulled = false;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < 90; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const z = i * 10;
      const { xOffset } = getRoadCurvature(this.activeHighway.id, z);
      const x = xOffset + side * (this.activeHighway.roadWidth / 2 + 8 + (i % 6) * 7.5);
      const s = 0.85 + (i % 4) * 0.25;
      dummy.position.set(x, 0, z);
      dummy.scale.set(s, s * 1.15, s);
      dummy.rotation.set(0, i * 0.6, 0);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);

      const col = new THREE.Color(leafColors[i % leafColors.length]);
      inst.setColorAt(i, col);
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    this.sceneryGroup.add(inst);
  }

  private buildWeatherParticles() {
    const rainCount = 1800;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 60;
      rainPositions[i * 3 + 1] = Math.random() * 30;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.18,
      transparent: true,
      opacity: 0.7,
    });
    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.rainParticles.visible = false;
    this.weatherGroup.add(this.rainParticles);

    const snowCount = 1200;
    const snowGeo = new THREE.BufferGeometry();
    const snowPositions = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount; i++) {
      snowPositions[i * 3] = (Math.random() - 0.5) * 60;
      snowPositions[i * 3 + 1] = Math.random() * 25;
      snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
    const snowMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.28,
      transparent: true,
      opacity: 0.85,
    });
    this.snowParticles = new THREE.Points(snowGeo, snowMat);
    this.snowParticles.visible = false;
    this.weatherGroup.add(this.snowParticles);
  }

  private buildOverheadGantries() {
    const signs = [
      `${this.activeHighway.name.toUpperCase()}`,
      `${this.activeHighway.fromTo.toUpperCase()}`,
      `SPEED LIMIT ${this.activeHighway.speedLimitMph} MPH`,
    ];

    for (let i = 0; i < 4; i++) {
      const gantry = new THREE.Group();
      const width = this.activeHighway.roadWidth + 4.4;

      const frameGeo = new THREE.BoxGeometry(width, 0.45, 0.45);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.22 });
      const topBeam = new THREE.Mesh(frameGeo, frameMat);
      topBeam.position.y = 6.3;
      gantry.add(topBeam);

      const postGeo = new THREE.CylinderGeometry(0.26, 0.28, 6.3, 10);
      const postL = new THREE.Mesh(postGeo, frameMat);
      postL.position.set(-width / 2, 3.15, 0);
      const postR = new THREE.Mesh(postGeo, frameMat);
      postR.position.set(width / 2, 3.15, 0);
      gantry.add(postL);
      gantry.add(postR);

      // Backing plate
      const backPlate = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.72, 1.9, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.5 })
      );
      backPlate.position.set(0, 6.3, 0);
      gantry.add(backPlate);

      // Green Interstate sign board facing oncoming player (-Z) with rotation.y = Math.PI
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 512;
      signCanvas.height = 128;
      const sCtx = signCanvas.getContext('2d')!;
      sCtx.fillStyle = '#047857';
      sCtx.fillRect(0, 0, 512, 128);
      sCtx.strokeStyle = '#ffffff';
      sCtx.lineWidth = 6;
      sCtx.strokeRect(8, 8, 496, 112);
      sCtx.fillStyle = '#ffffff';
      sCtx.font = 'bold 28px sans-serif';
      sCtx.textAlign = 'center';
      sCtx.textBaseline = 'middle';
      sCtx.fillText(signs[i % signs.length], 256, 64);

      const signTex = new THREE.CanvasTexture(signCanvas);
      signTex.colorSpace = THREE.SRGBColorSpace;
      const signMat = new THREE.MeshBasicMaterial({ map: signTex });
      const signGeo = new THREE.PlaneGeometry(width * 0.7, 1.82);
      const signMesh = new THREE.Mesh(signGeo, signMat);
      signMesh.rotation.y = Math.PI; // Faces -Z (toward oncoming camera) so text is unmirrored!
      signMesh.position.set(0, 6.3, -0.08);
      gantry.add(signMesh);

      gantry.position.z = 140 + i * 220;
      this.gantrySigns.push(gantry);
      this.scene.add(gantry);
    }
  }

  private createTunnelMesh(): THREE.Group {
    const tunnel = new THREE.Group();
    const width = this.activeHighway.roadWidth + 3.4;
    const height = 6.5;
    const length = this.tunnelLength;

    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.78,
      metalness: 0.25,
      side: THREE.DoubleSide,
    });

    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.5,
      metalness: 0.4,
      side: THREE.DoubleSide,
    });

    const wallGeo = new THREE.BoxGeometry(0.85, height, length);
    const wallL = new THREE.Mesh(wallGeo, concreteMat);
    wallL.position.set(-width / 2, height / 2, length / 2);
    wallL.castShadow = true;
    wallL.receiveShadow = true;
    tunnel.add(wallL);

    const wallR = new THREE.Mesh(wallGeo, concreteMat);
    wallR.position.set(width / 2, height / 2, length / 2);
    wallR.castShadow = true;
    wallR.receiveShadow = true;
    tunnel.add(wallR);

    const ceilingGeo = new THREE.PlaneGeometry(width, length);
    ceilingGeo.rotateX(Math.PI / 2);
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.position.set(0, height, length / 2);
    tunnel.add(ceiling);

    // Glowing Overhead Neon Strips + Warm Tunnel Wall Sconces
    const neonGeo = new THREE.BoxGeometry(0.38, 0.12, length);
    const neonMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 3.4,
      roughness: 0.1,
    });
    const neonL = new THREE.Mesh(neonGeo, neonMat);
    neonL.position.set(-width * 0.26, height - 0.06, length / 2);
    const neonR = new THREE.Mesh(neonGeo, neonMat);
    neonR.position.set(width * 0.26, height - 0.06, length / 2);
    tunnel.add(neonL);
    tunnel.add(neonR);

    const sconceMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.5,
    });
    const sconceGeo = new THREE.BoxGeometry(0.12, 0.22, length * 0.92);
    const sconceL = new THREE.Mesh(sconceGeo, sconceMat);
    sconceL.position.set(-width / 2 + 0.48, 3.6, length / 2);
    const sconceR = new THREE.Mesh(sconceGeo, sconceMat);
    sconceR.position.set(width / 2 - 0.48, 3.6, length / 2);
    tunnel.add(sconceL);
    tunnel.add(sconceR);

    // Entrance & Exit Portal Arches
    const portalGeo = new THREE.BoxGeometry(width + 2.2, 2.2, 1.4);
    const portalMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.3 });
    const portalIn = new THREE.Mesh(portalGeo, portalMat);
    portalIn.position.set(0, height + 1.1, 0);
    tunnel.add(portalIn);

    const portalOut = new THREE.Mesh(portalGeo, portalMat);
    portalOut.position.set(0, height + 1.1, length);
    tunnel.add(portalOut);

    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 512;
    bannerCanvas.height = 128;
    const bCtx = bannerCanvas.getContext('2d')!;
    bCtx.fillStyle = '#0f172a';
    bCtx.fillRect(0, 0, 512, 128);
    bCtx.strokeStyle = '#38bdf8';
    bCtx.lineWidth = 6;
    bCtx.strokeRect(8, 8, 496, 112);
    bCtx.fillStyle = '#38bdf8';
    bCtx.font = 'bold 28px sans-serif';
    bCtx.textAlign = 'center';
    bCtx.textBaseline = 'middle';
    bCtx.fillText('TUNNEL · VACUUM CEILING [V]', 256, 64);

    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    bannerTex.colorSpace = THREE.SRGBColorSpace;
    const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex });
    const bannerGeo = new THREE.PlaneGeometry(width * 0.68, 1.65);
    const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
    bannerMesh.rotation.y = Math.PI; // Faces oncoming camera (-Z)
    bannerMesh.position.set(0, height + 1.1, -0.72);
    tunnel.add(bannerMesh);

    return tunnel;
  }

  private createOverpassMesh(): THREE.Group {
    const overpass = new THREE.Group();
    const width = this.activeHighway.roadWidth + 8;
    const height = 6.4;
    const length = this.overpassLength;

    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.75,
      metalness: 0.25,
    });

    const undersideMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.55,
      metalness: 0.45,
      side: THREE.DoubleSide,
    });

    const deckGeo = new THREE.BoxGeometry(width, 2.2, length);
    const deck = new THREE.Mesh(deckGeo, concreteMat);
    deck.position.set(0, height + 1.1, length / 2);
    deck.castShadow = true;
    deck.receiveShadow = true;
    overpass.add(deck);

    const ceilingGeo = new THREE.PlaneGeometry(this.activeHighway.roadWidth + 2.5, length);
    ceilingGeo.rotateX(Math.PI / 2);
    const ceiling = new THREE.Mesh(ceilingGeo, undersideMat);
    ceiling.position.set(0, height - 0.02, length / 2);
    overpass.add(ceiling);

    const railGeo = new THREE.BoxGeometry(0.32, 0.1, length);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 3.0,
      roughness: 0.15,
    });
    const railL = new THREE.Mesh(railGeo, railMat);
    railL.position.set(-this.activeHighway.roadWidth * 0.28, height - 0.05, length / 2);
    const railR = new THREE.Mesh(railGeo, railMat);
    railR.position.set(this.activeHighway.roadWidth * 0.28, height - 0.05, length / 2);
    overpass.add(railL);
    overpass.add(railR);

    const pierGeo = new THREE.BoxGeometry(1.6, height, 2.4);
    const pierL = new THREE.Mesh(pierGeo, concreteMat);
    pierL.position.set(-width / 2 + 1.2, height / 2, length / 2);
    pierL.castShadow = true;
    const pierR = new THREE.Mesh(pierGeo, concreteMat);
    pierR.position.set(width / 2 - 1.2, height / 2, length / 2);
    pierR.castShadow = true;
    overpass.add(pierL);
    overpass.add(pierR);

    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sCtx = signCanvas.getContext('2d')!;
    sCtx.fillStyle = '#065f46';
    sCtx.fillRect(0, 0, 512, 128);
    sCtx.strokeStyle = '#f8fafc';
    sCtx.lineWidth = 6;
    sCtx.strokeRect(8, 8, 496, 112);
    sCtx.fillStyle = '#f8fafc';
    sCtx.font = 'bold 26px sans-serif';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText('OVERPASS · VACUUM CEILING [V]', 256, 64);

    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.colorSpace = THREE.SRGBColorSpace;
    const signMat = new THREE.MeshBasicMaterial({ map: signTex });
    const signGeo = new THREE.PlaneGeometry(width * 0.65, 1.8);
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.rotation.y = Math.PI; // Faces oncoming camera (-Z)
    signMesh.position.set(0, height + 1.1, -0.12);
    overpass.add(signMesh);

    return overpass;
  }

  private buildTunnels() {
    const offsets = [180, 660];
    for (const startZ of offsets) {
      const mesh = this.createTunnelMesh();
      mesh.position.z = startZ;
      this.tunnels.push({ mesh, startZ, length: this.tunnelLength });
      this.scene.add(mesh);
    }
  }

  private buildOverpasses() {
    const offsets = [420, 880];
    for (const startZ of offsets) {
      const mesh = this.createOverpassMesh();
      mesh.position.z = startZ;
      this.overpasses.push({ mesh, startZ, length: this.overpassLength });
      this.scene.add(mesh);
    }
  }

  public isInsideTunnel(z: number): boolean {
    for (const t of this.tunnels) {
      if (z >= t.startZ - 4 && z <= t.startZ + t.length + 4) {
        return true;
      }
    }
    return false;
  }

  public isUnderOverpass(z: number): boolean {
    for (const o of this.overpasses) {
      if (z >= o.startZ - 3 && z <= o.startZ + o.length + 3) {
        return true;
      }
    }
    return false;
  }

  public getCeilingStatus(z: number): { inTunnel: boolean; inOverpass: boolean } {
    return {
      inTunnel: this.isInsideTunnel(z),
      inOverpass: this.isUnderOverpass(z),
    };
  }

  public updateWeatherState(condition: WeatherCondition, settings: WeatherSettings) {
    this.roadMaterial.roughness = settings.roadRoughness;

    if (this.rainParticles) {
      this.rainParticles.visible = condition === 'rain' || settings.rainIntensity > 0;
    }
    if (this.snowParticles) {
      this.snowParticles.visible = condition === 'snow' || settings.snowIntensity > 0;
    }
  }

  public update(playerZ: number, dt: number) {
    // 1. Move road segments in circular buffer ahead of player
    const totalRoadLength = this.segmentCount * this.segmentLength;
    const startZ = playerZ - 50;

    for (let i = 0; i < this.segmentCount; i++) {
      const seg = this.roadSegments[i];
      let targetZ = Math.floor(startZ / this.segmentLength) * this.segmentLength + i * this.segmentLength;
      if (targetZ < startZ) {
        targetZ += totalRoadLength;
      }

      const { xOffset, curvatureAngle } = getRoadCurvature(this.activeHighway.id, targetZ);
      seg.position.set(xOffset, 0, targetZ);
      seg.rotation.y = curvatureAngle;
    }

    // 2. Scroll terrain & horizon mountain/sun vista with player
    if (this.terrainMesh) {
      this.terrainMesh.position.z = playerZ + 450;
    }
    if (this.horizonGroup) {
      const horizonCurv = getRoadCurvature(this.activeHighway.id, playerZ + 380);
      this.horizonGroup.position.set(horizonCurv.xOffset * 0.65, 0, playerZ);
    }

    // 3. Update roadside delineator reflector posts
    if (this.delineatorInst) {
      const halfCount = this.delineatorCount / 2;
      const baseZ = Math.floor((playerZ - 30) / this.delineatorSpacing) * this.delineatorSpacing;
      const roadHalfWidth = this.activeHighway.roadWidth / 2;

      for (let i = 0; i < halfCount; i++) {
        const postZ = baseZ + i * this.delineatorSpacing;
        const { xOffset, curvatureAngle } = getRoadCurvature(this.activeHighway.id, postZ);

        this.dummy.position.set(xOffset - roadHalfWidth - 0.85, 0, postZ);
        this.dummy.rotation.set(0, curvatureAngle, 0);
        this.dummy.updateMatrix();
        this.delineatorInst.setMatrixAt(i * 2, this.dummy.matrix);

        this.dummy.position.set(xOffset + roadHalfWidth + 0.85, 0, postZ);
        this.dummy.rotation.set(0, curvatureAngle, 0);
        this.dummy.updateMatrix();
        this.delineatorInst.setMatrixAt(i * 2 + 1, this.dummy.matrix);
      }
      this.delineatorInst.instanceMatrix.needsUpdate = true;
    }

    // 4. Update roadside highway luminaire streetlamps
    if (this.streetLampPoleInst && this.streetLampBulbInst) {
      const halfLamps = this.streetLampCount / 2;
      const baseLampZ = Math.floor((playerZ - 30) / this.streetLampSpacing) * this.streetLampSpacing;
      const roadHalfWidth = this.activeHighway.roadWidth / 2;

      for (let i = 0; i < halfLamps; i++) {
        const lampZ = baseLampZ + i * this.streetLampSpacing;
        const { xOffset, curvatureAngle } = getRoadCurvature(this.activeHighway.id, lampZ);

        // Right shoulder lamp
        this.dummy.position.set(xOffset - roadHalfWidth - 1.6, 0, lampZ);
        this.dummy.rotation.set(0, curvatureAngle, 0);
        this.dummy.updateMatrix();
        this.streetLampPoleInst.setMatrixAt(i * 2, this.dummy.matrix);

        this.dummy.position.set(xOffset - roadHalfWidth - 0.8, 0, lampZ);
        this.dummy.updateMatrix();
        this.streetLampBulbInst.setMatrixAt(i * 2, this.dummy.matrix);

        // Left shoulder lamp
        this.dummy.position.set(xOffset + roadHalfWidth + 1.6, 0, lampZ);
        this.dummy.rotation.set(0, curvatureAngle, 0);
        this.dummy.updateMatrix();
        this.streetLampPoleInst.setMatrixAt(i * 2 + 1, this.dummy.matrix);

        this.dummy.position.set(xOffset + roadHalfWidth + 0.8, 0, lampZ);
        this.dummy.updateMatrix();
        this.streetLampBulbInst.setMatrixAt(i * 2 + 1, this.dummy.matrix);
      }
      this.streetLampPoleInst.instanceMatrix.needsUpdate = true;
      this.streetLampBulbInst.instanceMatrix.needsUpdate = true;
    }

    // 5. Wrap overhead gantry signs
    for (const gantry of this.gantrySigns) {
      if (gantry.position.z < playerZ - 60) {
        gantry.position.z += 880;
      }
      const { xOffset, curvatureAngle } = getRoadCurvature(this.activeHighway.id, gantry.position.z);
      gantry.position.x = xOffset;
      gantry.rotation.y = curvatureAngle;
    }

    // 6. Update rain / snow particles relative to player
    if (this.rainParticles && this.rainParticles.visible) {
      const positions = this.rainParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= dt * 65;
        if (positions[i] < 0) {
          positions[i] = 30;
        }
      }
      this.rainParticles.geometry.attributes.position.needsUpdate = true;
      this.rainParticles.position.set(0, 0, playerZ);
    }

    if (this.snowParticles && this.snowParticles.visible) {
      const positions = this.snowParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] -= dt * 0.4;
        positions[i + 1] -= dt * 12;
        if (positions[i + 1] < 0) {
          positions[i + 1] = 25;
          positions[i] = (Math.random() - 0.5) * 60;
        }
      }
      this.snowParticles.geometry.attributes.position.needsUpdate = true;
      this.snowParticles.position.set(0, 0, playerZ);
    }

    // 7. Wrap tunnels along highway curve
    for (const t of this.tunnels) {
      if (t.startZ + t.length < playerZ - 60) {
        t.startZ += this.cycleSpan;
      }
      const { xOffset, curvatureAngle } = getRoadCurvature(this.activeHighway.id, t.startZ);
      t.mesh.position.set(xOffset, 0, t.startZ);
      t.mesh.rotation.y = curvatureAngle;
    }

    // 8. Wrap overpasses along highway curve
    for (const o of this.overpasses) {
      if (o.startZ + o.length < playerZ - 50) {
        o.startZ += this.cycleSpan;
      }
      const { xOffset, curvatureAngle } = getRoadCurvature(this.activeHighway.id, o.startZ);
      o.mesh.position.set(xOffset, 0, o.startZ);
      o.mesh.rotation.y = curvatureAngle;
    }
  }

  public dispose() {
    this.scene.remove(this.roadGroup);
    this.scene.remove(this.sceneryGroup);
    this.scene.remove(this.weatherGroup);
    this.scene.remove(this.horizonGroup);
    if (this.terrainMesh) {
      this.scene.remove(this.terrainMesh);
      this.terrainMesh.geometry.dispose();
    }
    if (this.delineatorInst) {
      this.scene.remove(this.delineatorInst);
      this.delineatorInst.geometry.dispose();
    }
    if (this.streetLampPoleInst) {
      this.scene.remove(this.streetLampPoleInst);
      this.streetLampPoleInst.geometry.dispose();
    }
    if (this.streetLampBulbInst) {
      this.scene.remove(this.streetLampBulbInst);
      this.streetLampBulbInst.geometry.dispose();
    }
    for (const g of this.gantrySigns) {
      this.scene.remove(g);
    }
    for (const t of this.tunnels) {
      this.scene.remove(t.mesh);
    }
    for (const o of this.overpasses) {
      this.scene.remove(o.mesh);
    }
    this.roadMaterial.dispose();
  }
}
