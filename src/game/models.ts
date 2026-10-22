import * as THREE from 'three';
import { VehicleConfig } from './types.ts';

// Shared wheel & brake geometries
const tireGeometry = new THREE.CylinderGeometry(0.39, 0.39, 0.34, 24);
tireGeometry.rotateZ(Math.PI / 2);

const rimBarrelGeometry = new THREE.CylinderGeometry(0.27, 0.27, 0.35, 18);
rimBarrelGeometry.rotateZ(Math.PI / 2);

const rimHubGeometry = new THREE.CylinderGeometry(0.09, 0.09, 0.37, 12);
rimHubGeometry.rotateZ(Math.PI / 2);

const spokeGeometry = new THREE.BoxGeometry(0.36, 0.045, 0.045);
spokeGeometry.rotateY(Math.PI / 2);

const brakeDiscGeometry = new THREE.CylinderGeometry(0.21, 0.21, 0.32, 16);
brakeDiscGeometry.rotateZ(Math.PI / 2);

const caliperGeometry = new THREE.BoxGeometry(0.14, 0.16, 0.12);

// Procedural carbon-fiber micro-weave bump texture
function createCarbonWeaveTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#3f3f46';
  for (let y = 0; y < 64; y += 8) {
    for (let x = 0; x < 64; x += 8) {
      if ((x + y) % 16 === 0) {
        ctx.fillRect(x, y, 6, 4);
      } else {
        ctx.fillRect(x + 2, y + 4, 6, 4);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
}

const carbonBumpTex = createCarbonWeaveTexture();

const tireMaterial = new THREE.MeshStandardMaterial({
  color: 0x141417,
  roughness: 0.85,
  metalness: 0.12,
});

const rimMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xe4e4e7,
  roughness: 0.14,
  metalness: 0.92,
  clearcoat: 0.8,
});

const darkSpokeMaterial = new THREE.MeshStandardMaterial({
  color: 0x27272a,
  roughness: 0.25,
  metalness: 0.85,
});

const brakeDiscMaterial = new THREE.MeshStandardMaterial({
  color: 0xa1a1aa,
  roughness: 0.3,
  metalness: 0.85,
});

const caliperMaterial = new THREE.MeshStandardMaterial({
  color: 0xef4444,
  emissive: 0x991b1b,
  emissiveIntensity: 0.4,
  roughness: 0.25,
  metalness: 0.6,
});

const carbonMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x18181b,
  roughness: 0.32,
  metalness: 0.45,
  clearcoat: 0.7,
  clearcoatRoughness: 0.15,
  bumpMap: carbonBumpTex,
  bumpScale: 0.015,
});

const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x090d16,
  roughness: 0.06,
  metalness: 0.15,
  clearcoat: 1.0,
  clearcoatRoughness: 0.04,
  transparent: true,
  opacity: 0.88,
});

const headlightMaterial = new THREE.MeshStandardMaterial({
  color: 0xf8fafc,
  emissive: 0xe0f2fe,
  emissiveIntensity: 3.2,
  roughness: 0.08,
});

const drlCyanMaterial = new THREE.MeshStandardMaterial({
  color: 0x38bdf8,
  emissive: 0x0ea5e9,
  emissiveIntensity: 2.4,
  roughness: 0.1,
});

const taillightMaterial = new THREE.MeshStandardMaterial({
  color: 0xef4444,
  emissive: 0xff1e1e,
  emissiveIntensity: 3.4,
  roughness: 0.15,
});

const amberMarkerMaterial = new THREE.MeshStandardMaterial({
  color: 0xf59e0b,
  emissive: 0xf59e0b,
  emissiveIntensity: 2.2,
  roughness: 0.2,
});

const chromeMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xf8fafc,
  roughness: 0.08,
  metalness: 0.98,
  clearcoat: 1.0,
});

/**
 * Creates a detailed 5-spoke performance wheel assembly with tire, alloy barrel, star spokes, rotor, and Brembo caliper.
 */
function createWheelAssembly(scale = 1.0): THREE.Group {
  const wheel = new THREE.Group();

  const tire = new THREE.Mesh(tireGeometry, tireMaterial);
  tire.castShadow = true;
  wheel.add(tire);

  const rim = new THREE.Mesh(rimBarrelGeometry, rimMaterial);
  wheel.add(rim);

  const hub = new THREE.Mesh(rimHubGeometry, chromeMaterial);
  wheel.add(hub);

  // 5 alloy spokes
  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Mesh(spokeGeometry, i % 2 === 0 ? rimMaterial : darkSpokeMaterial);
    spoke.rotation.x = (i * Math.PI * 2) / 5;
    spoke.position.x = -0.14;
    wheel.add(spoke);
  }

  const brake = new THREE.Mesh(brakeDiscGeometry, brakeDiscMaterial);
  wheel.add(brake);

  const caliper = new THREE.Mesh(caliperGeometry, caliperMaterial);
  caliper.position.set(-0.08, 0.1, -0.12);
  wheel.add(caliper);

  if (scale !== 1.0) {
    wheel.scale.set(scale, scale, scale);
  }

  return wheel;
}

/**
 * Creates a procedural contact shadow + subtle underglow disc beneath vehicle
 */
function createContactShadow(width: number, length: number, glowHex?: number): THREE.Group {
  const group = new THREE.Group();
  const shadowGeo = new THREE.PlaneGeometry(width * 1.28, length * 1.18);
  shadowGeo.rotateX(-Math.PI / 2);

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(0,0,0,0.85)');
  gradient.addColorStop(0.65, 'rgba(0,0,0,0.42)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const shadowTexture = new THREE.CanvasTexture(canvas);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0.72,
  });

  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.position.y = 0.02;
  group.add(shadowMesh);

  if (glowHex !== undefined) {
    const glowGeo = new THREE.PlaneGeometry(width * 0.95, length * 0.88);
    glowGeo.rotateX(-Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({
      color: glowHex,
      transparent: true,
      depthWrite: false,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.y = 0.03;
    group.add(glowMesh);
  }

  return group;
}

/**
 * Helper to extrude a side-profile silhouette along the X axis and center it.
 */
function createExtrudedProfile(
  points: [number, number][],
  width: number,
  bevelSize = 0.09,
  bevelThickness = 0.1
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i][0], points[i][1]);
  }
  shape.closePath();

  const extrudeWidth = Math.max(0.2, width - bevelThickness * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: extrudeWidth,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize,
    bevelThickness,
  });
  // Shape X = Z (length along car), Shape Y = Y (height). Extrude Z = X (width).
  // Rotate +90 deg around Y so Shape X maps to +Z or -Z?
  // Let's check: R_y(-PI/2) maps (z, y, x_extrude) -> (-x_extrude, y, z)!
  geo.rotateY(-Math.PI / 2);
  geo.translate(extrudeWidth / 2, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds composite showroom-grade 3D Player Car model (18+ sculpted parts).
 */
export function createPlayerCarMesh(config: VehicleConfig): THREE.Group {
  const car = new THREE.Group();
  const isTruck = config.id === 'truck4x4';
  const isSupercar = config.id === 'supercar';
  const isInterceptor = config.id === 'interceptor';

  // Automotive metallic clearcoat paint
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: config.primaryColor,
    roughness: 0.16,
    metalness: 0.76,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    reflectivity: 1.0,
  });

  const stripeMaterial = new THREE.MeshPhysicalMaterial({
    color: config.stripeColor,
    roughness: 0.2,
    metalness: 0.5,
    clearcoat: 0.9,
  });

  const trimMaterial = new THREE.MeshStandardMaterial({
    color: config.trimColor,
    roughness: 0.55,
    metalness: 0.35,
  });

  // 1. Carbon-Fiber Aerodynamic Floor Pan, Front Splitter & Side Skirts
  const floorGeo = new THREE.BoxGeometry(2.04, 0.1, 4.62);
  const floorPan = new THREE.Mesh(floorGeo, carbonMaterial);
  floorPan.position.set(0, 0.24, 0);
  floorPan.castShadow = true;
  car.add(floorPan);

  // Front splitter lip with twin winglets
  const splitterGeo = new THREE.BoxGeometry(2.08, 0.06, 0.45);
  const splitter = new THREE.Mesh(splitterGeo, carbonMaterial);
  splitter.position.set(0, 0.21, 2.22);
  car.add(splitter);

  // 2. Sculpted Aerodynamic Main Body Hull (ExtrudeGeometry with beveled edges)
  const hullProfile: [number, number][] = isTruck
    ? [
        [-2.25, 0.32],
        [2.25, 0.32],
        [2.32, 0.68],
        [2.12, 0.98],
        [0.95, 1.04],
        [-2.18, 1.02],
        [-2.3, 0.72],
      ]
    : isSupercar
    ? [
        [-2.22, 0.26],
        [2.28, 0.24],
        [2.38, 0.46],
        [1.95, 0.68],
        [0.85, 0.78],
        [-1.85, 0.82],
        [-2.28, 0.68],
      ]
    : [
        [-2.22, 0.28],
        [2.24, 0.28],
        [2.34, 0.58],
        [2.05, 0.82],
        [0.85, 0.88],
        [-1.95, 0.9],
        [-2.26, 0.68],
      ];

  const mainBodyGeo = createExtrudedProfile(hullProfile, 1.92, 0.09, 0.11);
  const mainBody = new THREE.Mesh(mainBodyGeo, bodyMaterial);
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  car.add(mainBody);

  // 3. Sculpted Widebody Fender Flares (Front & Rear wheel arches)
  const fenderProfile: [number, number][] = [
    [-0.58, 0.26],
    [0.58, 0.26],
    [0.46, 0.78],
    [-0.46, 0.78],
  ];
  const fenderGeo = createExtrudedProfile(fenderProfile, 2.08, 0.06, 0.07);
  const frontFenders = new THREE.Mesh(fenderGeo, bodyMaterial);
  frontFenders.position.set(0, 0, 1.35);
  frontFenders.castShadow = true;
  car.add(frontFenders);

  const rearFenders = new THREE.Mesh(fenderGeo, bodyMaterial);
  rearFenders.position.set(0, 0, -1.35);
  rearFenders.castShadow = true;
  car.add(rearFenders);

  // 4. Sculpted Fastback / Cockpit Cabin Greenhouse
  const cabinProfile: [number, number][] = isTruck
    ? [
        [-1.05, 0.92],
        [0.88, 0.92],
        [0.42, 1.56],
        [-0.88, 1.56],
      ]
    : isSupercar
    ? [
        [-1.45, 0.72],
        [0.95, 0.7],
        [0.18, 1.22],
        [-0.95, 1.2],
      ]
    : [
        [-1.35, 0.78],
        [0.85, 0.78],
        [0.25, 1.32],
        [-0.85, 1.3],
      ];

  const cabinGeo = createExtrudedProfile(cabinProfile, 1.48, 0.08, 0.09);
  const cabin = new THREE.Mesh(cabinGeo, glassMaterial);
  cabin.castShadow = true;
  car.add(cabin);

  // Roof cap panel in body color over cabin top
  const roofWidth = 1.26;
  const roofLength = isTruck ? 1.25 : 1.1;
  const roofY = isTruck ? 1.59 : isSupercar ? 1.24 : 1.34;
  const roofGeo = new THREE.BoxGeometry(roofWidth, 0.05, roofLength);
  const roofPanel = new THREE.Mesh(roofGeo, bodyMaterial);
  roofPanel.position.set(0, roofY, isTruck ? -0.22 : -0.32);
  car.add(roofPanel);

  // 5. Dual Racing Stripes along hood, roof, and rear deck
  const hoodStripeGeo = new THREE.BoxGeometry(0.22, 0.03, 1.45);
  const stripeL = new THREE.Mesh(hoodStripeGeo, stripeMaterial);
  stripeL.position.set(-0.18, isTruck ? 1.05 : isSupercar ? 0.79 : 0.89, 1.48);
  const stripeR = new THREE.Mesh(hoodStripeGeo, stripeMaterial);
  stripeR.position.set(0.18, isTruck ? 1.05 : isSupercar ? 0.79 : 0.89, 1.48);
  car.add(stripeL);
  car.add(stripeR);

  // 6. Aerodynamic Side Mirrors
  const mirrorGeo = new THREE.BoxGeometry(0.24, 0.09, 0.16);
  const mirrorL = new THREE.Mesh(mirrorGeo, bodyMaterial);
  mirrorL.position.set(-0.92, 0.96, 0.55);
  const mirrorR = new THREE.Mesh(mirrorGeo, bodyMaterial);
  mirrorR.position.set(0.92, 0.96, 0.55);
  car.add(mirrorL);
  car.add(mirrorR);

  // 7. Category-Specific Signature Performance Hardware
  if (config.id === 'muscle') {
    // Chrome Supercharger Blower Scoop on Hood + Ducktail Rear Wing
    const blowerBase = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.95), chromeMaterial);
    blowerBase.position.set(0, 0.94, 1.2);
    car.add(blowerBase);

    const intakeSlot = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.08), carbonMaterial);
    intakeSlot.position.set(0, 0.96, 1.68);
    car.add(intakeSlot);

    const ducktail = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.14, 0.28), carbonMaterial);
    ducktail.position.set(0, 0.96, -2.12);
    ducktail.rotation.x = 0.28;
    car.add(ducktail);
  } else if (isSupercar) {
    // Active Swan-Neck Carbon GT Wing + Roof Snorkel Scoop + Rear Engine Louvers
    const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.06, 0.42), carbonMaterial);
    wingBlade.position.set(0, 1.18, -2.08);
    wingBlade.rotation.x = 0.12;
    car.add(wingBlade);

    const endplateGeo = new THREE.BoxGeometry(0.04, 0.24, 0.48);
    const endplateL = new THREE.Mesh(endplateGeo, bodyMaterial);
    endplateL.position.set(-0.98, 1.16, -2.08);
    const endplateR = new THREE.Mesh(endplateGeo, bodyMaterial);
    endplateR.position.set(0.98, 1.16, -2.08);
    car.add(endplateL);
    car.add(endplateR);

    const pylonGeo = new THREE.BoxGeometry(0.05, 0.36, 0.22);
    const pylonL = new THREE.Mesh(pylonGeo, carbonMaterial);
    pylonL.position.set(-0.42, 0.98, -2.02);
    const pylonR = new THREE.Mesh(pylonGeo, carbonMaterial);
    pylonR.position.set(0.42, 0.98, -2.02);
    car.add(pylonL);
    car.add(pylonR);

    const roofScoop = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.55), carbonMaterial);
    roofScoop.position.set(0, 1.29, -0.15);
    car.add(roofScoop);
  } else if (isTruck) {
    // Baja Trophy Truck Roll Cage + Roof LED Lightbar + Angled Bed Spare Tire
    const lightBar = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.1, 0.14), headlightMaterial);
    lightBar.position.set(0, 1.66, 0.35);
    car.add(lightBar);

    const spareTire = createWheelAssembly(0.95);
    spareTire.rotation.z = Math.PI / 2;
    spareTire.rotation.x = -0.45;
    spareTire.position.set(0, 1.12, -1.55);
    car.add(spareTire);

    const bullBar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.18), chromeMaterial);
    bullBar.position.set(0, 0.62, 2.38);
    car.add(bullBar);
  } else if (isInterceptor) {
    // Police Pursuit V-Lightbar (Red & Blue Strobes) + Heavy Steel PIT Push-Bar
    const pushBar = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.46, 0.18), trimMaterial);
    pushBar.position.set(0, 0.56, 2.36);
    car.add(pushBar);

    const redStrobeMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 3.2,
    });
    const blueStrobeMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x2563eb,
      emissiveIntensity: 3.2,
    });
    const strobeL = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.1, 0.22), redStrobeMat);
    strobeL.position.set(-0.32, 1.42, -0.25);
    const strobeR = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.1, 0.22), blueStrobeMat);
    strobeR.position.set(0.32, 1.42, -0.25);
    car.add(strobeL);
    car.add(strobeR);

    const rearWing = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.06, 0.32), carbonMaterial);
    rearWing.position.set(0, 1.06, -2.05);
    car.add(rearWing);
  }

  // 8. Front Grille, Projector Headlights & Cyan LED DRL Blades
  const grilleMesh = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.26, 0.08), carbonMaterial);
  grilleMesh.position.set(0, 0.52, 2.33);
  car.add(grilleMesh);

  const headGeo = new THREE.BoxGeometry(0.36, 0.12, 0.12);
  const headL = new THREE.Mesh(headGeo, headlightMaterial);
  headL.position.set(-0.68, 0.62, 2.28);
  const headR = new THREE.Mesh(headGeo, headlightMaterial);
  headR.position.set(0.68, 0.62, 2.28);
  car.add(headL);
  car.add(headR);

  const drlGeo = new THREE.BoxGeometry(0.42, 0.04, 0.12);
  const drlL = new THREE.Mesh(drlGeo, drlCyanMaterial);
  drlL.position.set(-0.68, 0.53, 2.3);
  const drlR = new THREE.Mesh(drlGeo, drlCyanMaterial);
  drlR.position.set(0.68, 0.53, 2.3);
  car.add(drlL);
  car.add(drlR);

  // 9. Rear Carbon Fascia, 5-Fin Diffuser & Full-Width Cyber LED Taillight Matrix
  // Rear bodywork extends to z ≈ -2.36 with bevels, so mount rear fascia details at z = -2.38..-2.42
  const rearFasciaPanel = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.28, 0.08), carbonMaterial);
  rearFasciaPanel.position.set(0, 0.64, -2.35);
  car.add(rearFasciaPanel);

  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.18, 0.26), carbonMaterial);
  diffuser.position.set(0, 0.29, -2.29);
  car.add(diffuser);

  // 5 vertical aerodynamic diffuser strakes
  const strakeGeo = new THREE.BoxGeometry(0.03, 0.18, 0.18);
  for (const sx of [-0.78, -0.42, 0, 0.42, 0.78]) {
    const strake = new THREE.Mesh(strakeGeo, carbonMaterial);
    strake.position.set(sx, 0.29, -2.37);
    car.add(strake);
  }

  // Full-width horizon LED taillight bar + quad outer brake blades
  const tailBarGeo = new THREE.BoxGeometry(1.78, 0.075, 0.08);
  const tailLight = new THREE.Mesh(tailBarGeo, taillightMaterial);
  tailLight.position.set(0, 0.72, -2.38);
  car.add(tailLight);

  const tailOuterGeo = new THREE.BoxGeometry(0.46, 0.065, 0.08);
  const tailLowerL = new THREE.Mesh(tailOuterGeo, taillightMaterial);
  tailLowerL.position.set(-0.64, 0.61, -2.39);
  const tailLowerR = new THREE.Mesh(tailOuterGeo, taillightMaterial);
  tailLowerR.position.set(0.64, 0.61, -2.39);
  car.add(tailLowerL);
  car.add(tailLowerR);

  // Center High-Mount Stop Lamp (CHMSL) strip
  const chmsl = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.03, 0.06), drlCyanMaterial);
  chmsl.position.set(0, 0.56, -2.38);
  car.add(chmsl);

  // Rear License Plate ("USA · NITRO")
  const plateBacking = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.18, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.6 })
  );
  plateBacking.position.set(0, 0.45, -2.38);
  car.add(plateBacking);

  // 10. Quad Polished Titanium Exhaust Tips (Outer flanks)
  const exhaustGeo = new THREE.CylinderGeometry(0.058, 0.065, 0.28, 14);
  exhaustGeo.rotateX(Math.PI / 2);
  for (const ex of [-0.72, -0.56, 0.56, 0.72]) {
    const pipe = new THREE.Mesh(exhaustGeo, chromeMaterial);
    pipe.position.set(ex, 0.28, -2.36);
    car.add(pipe);
  }

  // 11. Sleek Twin Aerospace Vectoring Rocket Thruster Nozzles (Tucked into Center Diffuser)
  const nozzleMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e293b,
    metalness: 0.92,
    roughness: 0.22,
    clearcoat: 0.7,
  });
  const nozzleInnerMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.8,
  });

  const nozzleGeo = new THREE.CylinderGeometry(0.09, 0.125, 0.32, 16);
  nozzleGeo.rotateX(Math.PI / 2);

  const thrusterL = new THREE.Mesh(nozzleGeo, nozzleMat);
  thrusterL.position.set(-0.22, 0.34, -2.32);
  const thrusterR = new THREE.Mesh(nozzleGeo, nozzleMat);
  thrusterR.position.set(0.22, 0.34, -2.32);

  const nozzleRimL = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.018, 10, 20), nozzleInnerMat);
  nozzleRimL.position.set(-0.22, 0.34, -2.46);
  const nozzleRimR = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.018, 10, 20), nozzleInnerMat);
  nozzleRimR.position.set(0.22, 0.34, -2.46);

  car.add(thrusterL);
  car.add(thrusterR);
  car.add(nozzleRimL);
  car.add(nozzleRimR);

  // 12. Multi-Layer Mach Shock-Diamond Rocket Flame Plumes
  const createRocketPlume = (): THREE.Group => {
    const plume = new THREE.Group();
    // Outer fiery plasma cone
    const outerGeo = new THREE.ConeGeometry(0.16, 2.2, 14);
    outerGeo.rotateX(Math.PI / 2);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.position.z = -1.1;
    plume.add(outerMesh);

    // Inner white-cyan supersonic core
    const coreGeo = new THREE.ConeGeometry(0.09, 1.45, 12);
    coreGeo.rotateX(Math.PI / 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.z = -0.72;
    plume.add(coreMesh);

    return plume;
  };

  const thrusterFlameL = createRocketPlume();
  thrusterFlameL.position.set(-0.22, 0.34, -2.46);
  thrusterFlameL.visible = false;
  car.add(thrusterFlameL);

  const thrusterFlameR = createRocketPlume();
  thrusterFlameR.position.set(0.22, 0.34, -2.46);
  thrusterFlameR.visible = false;
  car.add(thrusterFlameR);

  // 13. Deployable Aerodynamic Flight Stabilizer Winglets
  const wingletGeo = new THREE.BoxGeometry(0.42, 0.04, 0.92);
  const wingletMat = new THREE.MeshPhysicalMaterial({
    color: config.primaryColor,
    metalness: 0.85,
    roughness: 0.15,
    clearcoat: 1.0,
  });
  const wingletL = new THREE.Mesh(wingletGeo, wingletMat);
  wingletL.position.set(-1.12, 0.62, -1.15);
  const wingletR = new THREE.Mesh(wingletGeo, wingletMat);
  wingletR.position.set(1.12, 0.62, -1.15);
  car.add(wingletL);
  car.add(wingletR);

  // 14. Underbody Vacuum Suction Turbine Rings (Cyan ground-effect vortex glow)
  const vacuumRingGeo = new THREE.TorusGeometry(0.62, 0.065, 10, 24);
  vacuumRingGeo.rotateX(Math.PI / 2);
  const vacuumRingMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
  });
  const vacuumRingFront = new THREE.Mesh(vacuumRingGeo, vacuumRingMat);
  vacuumRingFront.position.set(0, 0.16, 0.85);
  const vacuumRingRear = new THREE.Mesh(vacuumRingGeo, vacuumRingMat);
  vacuumRingRear.position.set(0, 0.16, -0.85);
  car.add(vacuumRingFront);
  car.add(vacuumRingRear);

  // 15. 4 Performance Wheel Assemblies (Front wheels wrapped in steering pivots!)
  const wheelScale = isTruck ? 1.18 : 1.0;
  const wheelY = 0.39 * wheelScale;
  const wheelOffsets: [number, number, number, boolean][] = [
    [-0.95, wheelY, 1.38, true],  // Front Left (index 0)
    [0.95, wheelY, 1.38, true],   // Front Right (index 1)
    [-0.95, wheelY, -1.38, false], // Rear Left (index 2)
    [0.95, wheelY, -1.38, false],  // Rear Right (index 3)
  ];

  const spinWheels: THREE.Group[] = [];
  const frontSteerPivots: THREE.Group[] = [];

  wheelOffsets.forEach(([wx, wy, wz, isFront]) => {
    const pivot = new THREE.Group();
    pivot.position.set(wx, wy, wz);

    const wheel = createWheelAssembly(wheelScale);
    if (wx > 0) {
      wheel.rotation.y = Math.PI;
    }
    pivot.add(wheel);
    car.add(pivot);

    spinWheels.push(wheel);
    if (isFront) {
      frontSteerPivots.push(pivot);
    }
  });

  // 16. Soft contact shadow + subtle neon underbody ambient reflection
  const shadow = createContactShadow(2.2, 4.8, config.primaryColor);
  car.add(shadow);

  // Store references for animations
  car.userData = {
    headL,
    headR,
    tailLight,
    thrusterFlameL,
    thrusterFlameR,
    wingletL,
    wingletR,
    vacuumRingFront,
    vacuumRingRear,
    wheels: spinWheels,
    frontSteerPivots,
    config,
  };

  return car;
}

/**
 * Builds 3D model for an 18-Wheeler Semi Truck (Aerodynamic Cab + Sleeper + Ribbed Freight Trailer).
 */
export function createSemiTruckMesh(color: number): THREE.Group {
  const semi = new THREE.Group();

  const cabMat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.22,
    metalness: 0.68,
    clearcoat: 0.9,
  });

  const trailerMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.38,
    metalness: 0.35,
  });

  const stripeMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0.5,
  });

  // 1. Sculpted Aerodynamic Semi Cab Profile
  const cabProfile: [number, number][] = [
    [2.6, 0.4],
    [6.1, 0.4],
    [6.15, 1.35],
    [4.95, 1.52],
    [4.45, 2.35],
    [3.65, 2.95],
    [2.6, 2.95],
  ];
  const cabGeo = createExtrudedProfile(cabProfile, 2.42, 0.08, 0.09);
  const cab = new THREE.Mesh(cabGeo, cabMat);
  cab.castShadow = true;
  cab.receiveShadow = true;
  semi.add(cab);

  // 2. Wrap-around Cab Windshield
  const windshieldGeo = new THREE.BoxGeometry(2.18, 0.68, 0.14);
  const windshield = new THREE.Mesh(windshieldGeo, glassMaterial);
  windshield.position.set(0, 1.92, 4.72);
  windshield.rotation.x = -0.32;
  semi.add(windshield);

  // 3. Heavy Chrome Grille & Bumper
  const grilleGeo = new THREE.BoxGeometry(1.55, 0.92, 0.16);
  const grille = new THREE.Mesh(grilleGeo, chromeMaterial);
  grille.position.set(0, 0.95, 6.12);
  semi.add(grille);

  const bumperGeo = new THREE.BoxGeometry(2.48, 0.34, 0.24);
  const bumper = new THREE.Mesh(bumperGeo, chromeMaterial);
  bumper.position.set(0, 0.48, 6.14);
  semi.add(bumper);

  // Cab Headlights
  const headGeo = new THREE.BoxGeometry(0.32, 0.18, 0.12);
  const headL = new THREE.Mesh(headGeo, headlightMaterial);
  headL.position.set(-0.95, 0.82, 6.12);
  const headR = new THREE.Mesh(headGeo, headlightMaterial);
  headR.position.set(0.95, 0.82, 6.12);
  semi.add(headL);
  semi.add(headR);

  // 4. Dual Chrome Vertical Exhaust Stacks
  const stackGeo = new THREE.CylinderGeometry(0.09, 0.09, 2.8, 12);
  const stackL = new THREE.Mesh(stackGeo, chromeMaterial);
  stackL.position.set(-1.26, 2.1, 2.85);
  const stackR = new THREE.Mesh(stackGeo, chromeMaterial);
  stackR.position.set(1.26, 2.1, 2.85);
  semi.add(stackL);
  semi.add(stackR);

  // 5. 53-Foot Freight Trailer Box with Side Livery Stripe & DOT Safety Tape
  const trailerGeo = new THREE.BoxGeometry(2.54, 3.05, 9.6);
  const trailer = new THREE.Mesh(trailerGeo, trailerMat);
  trailer.position.set(0, 2.15, -1.85);
  trailer.castShadow = true;
  trailer.receiveShadow = true;
  semi.add(trailer);

  const trailerStripe = new THREE.Mesh(new THREE.BoxGeometry(2.57, 0.36, 9.4), stripeMat);
  trailerStripe.position.set(0, 1.85, -1.85);
  semi.add(trailerStripe);

  // Amber roof clearance markers on trailer rear
  for (let mx = -0.9; mx <= 0.9; mx += 0.45) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.08), amberMarkerMaterial);
    marker.position.set(mx, 3.55, -6.66);
    semi.add(marker);
  }

  // 6. Rear Underride Guard & Taillights
  const rearGuard = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.18, 0.15), chromeMaterial);
  rearGuard.position.set(0, 0.52, -6.62);
  semi.add(rearGuard);

  const tailGeo = new THREE.BoxGeometry(0.45, 0.16, 0.1);
  const tailL = new THREE.Mesh(tailGeo, taillightMaterial);
  tailL.position.set(-0.88, 0.78, -6.66);
  const tailR = new THREE.Mesh(tailGeo, taillightMaterial);
  tailR.position.set(0.88, 0.78, -6.66);
  semi.add(tailL);
  semi.add(tailR);

  // 7. Multi-Axle Semi Wheels (10 wheel positions)
  const wheelZPositions = [5.1, 3.2, 2.2, -4.6, -5.6];
  for (const wz of wheelZPositions) {
    const wL = new THREE.Mesh(tireGeometry, tireMaterial);
    wL.scale.set(1.15, 1.25, 1.25);
    wL.position.set(-1.18, 0.48, wz);
    const wR = new THREE.Mesh(tireGeometry, tireMaterial);
    wR.scale.set(1.15, 1.25, 1.25);
    wR.position.set(1.18, 0.48, wz);
    semi.add(wL);
    semi.add(wR);
  }

  // 8. Contact shadow
  const shadow = createContactShadow(2.75, 13.6);
  semi.add(shadow);

  return semi;
}

/**
 * Builds sculpted 3D model for dynamic traffic cars (Sedan, SUV, Coupe, Van).
 */
export function createTrafficCarMesh(type: string, color: number): THREE.Group {
  const group = new THREE.Group();

  const paintMat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.2,
    metalness: 0.65,
    clearcoat: 0.95,
    clearcoatRoughness: 0.08,
  });

  const isSuv = type === 'suv';
  const isVan = type === 'van';
  const isCoupe = type === 'coupe';

  const width = isSuv || isVan ? 2.12 : isCoupe ? 1.96 : 2.02;
  const length = isVan ? 5.2 : isSuv ? 4.9 : isCoupe ? 4.45 : 4.65;
  const halfL = length / 2;

  // 1. Sculpted Lower Body Silhouette
  const bodyProfile: [number, number][] = [
    [-halfL, 0.28],
    [halfL, 0.28],
    [halfL + 0.06, 0.62],
    [halfL - 0.25, 0.88],
    [-halfL + 0.15, 0.92],
    [-halfL - 0.04, 0.68],
  ];
  const bodyGeo = createExtrudedProfile(bodyProfile, width, 0.07, 0.08);
  const body = new THREE.Mesh(bodyGeo, paintMat);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // 2. Sculpted Cabin Greenhouse
  const cabinTopY = isVan ? 1.72 : isSuv ? 1.56 : isCoupe ? 1.26 : 1.36;
  const cabinRearZ = isSuv || isVan ? -halfL + 0.25 : -halfL + 0.75;
  const cabinProfile: [number, number][] = [
    [cabinRearZ, 0.84],
    [halfL * 0.42, 0.82],
    [halfL * 0.12, cabinTopY],
    [cabinRearZ + (isSuv || isVan ? 0.18 : 0.45), cabinTopY],
  ];
  const cabinGeo = createExtrudedProfile(cabinProfile, width * 0.84, 0.06, 0.07);
  const cabin = new THREE.Mesh(cabinGeo, glassMaterial);
  cabin.castShadow = true;
  group.add(cabin);

  // 3. Headlights & Grille
  const grille = new THREE.Mesh(new THREE.BoxGeometry(width * 0.52, 0.22, 0.08), carbonMaterial);
  grille.position.set(0, 0.54, halfL + 0.05);
  group.add(grille);

  const headGeo = new THREE.BoxGeometry(0.32, 0.13, 0.09);
  const headL = new THREE.Mesh(headGeo, headlightMaterial);
  headL.position.set(-width * 0.34, 0.64, halfL + 0.04);
  const headR = new THREE.Mesh(headGeo, headlightMaterial);
  headR.position.set(width * 0.34, 0.64, halfL + 0.04);
  group.add(headL);
  group.add(headR);

  // 4. Full-Width + Split LED Taillights
  const tailGeo = new THREE.BoxGeometry(0.44, 0.12, 0.09);
  const tailL = new THREE.Mesh(tailGeo, taillightMaterial);
  tailL.position.set(-width * 0.32, 0.68, -halfL - 0.03);
  const tailR = new THREE.Mesh(tailGeo, taillightMaterial);
  tailR.position.set(width * 0.32, 0.68, -halfL - 0.03);
  group.add(tailL);
  group.add(tailR);

  const centerTailBar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, 0.04, 0.08), taillightMaterial);
  centerTailBar.position.set(0, 0.7, -halfL - 0.03);
  group.add(centerTailBar);

  // 5. Wheels with alloy rims
  const wZ = length * 0.31;
  const wX = width * 0.47;
  [
    [-wX, 0.38, wZ],
    [wX, 0.38, wZ],
    [-wX, 0.38, -wZ],
    [wX, 0.38, -wZ],
  ].forEach(([x, y, z]) => {
    const wheel = createWheelAssembly(0.95);
    wheel.position.set(x, y, z);
    if (x > 0) wheel.rotation.y = Math.PI;
    group.add(wheel);
  });

  // 6. Contact shadow
  const shadow = createContactShadow(width + 0.22, length + 0.22);
  group.add(shadow);

  return group;
}
