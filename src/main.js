import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { XRButton } from './xrbutton.js';
import { SLOT_POSITIONS, PARTS, ANCHORS } from './config.js';

// --- Scene & Renderer Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10141f);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 100);
camera.position.set(0, 1.6, 2.2);

const player = new THREE.Group();
player.add(camera);
scene.add(player);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(XRButton.createButton(renderer));

// Lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x334466, 1.3));
const dirLight = new THREE.DirectionalLight(0xddeeff, 1.8);
dirLight.position.set(2, 4, 2);
scene.add(dirLight);

const blueAccentLight = new THREE.PointLight(0x00e5ff, 2.5, 6);
blueAccentLight.position.set(0, 1.2, -0.65);
scene.add(blueAccentLight);

// Solid floor for VR / desktop preview
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(14, 14),
  new THREE.MeshStandardMaterial({ color: 0x181c28, roughness: 0.85 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// --- Mannequin Setup with Reflection Clones ---
function buildMannequin() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.6 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.45, 8, 16), mat);
  torso.position.y = 1.2;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), mat);
  head.position.y = 1.62;
  const hips = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.12, 8, 16), mat);
  hips.position.y = 0.95;
  proceduralMannequinGroup.add(torso, head, hips);
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.55, 6, 12), mat);
    arm.position.set(sx * 0.26, 1.22, 0);
    arm.rotation.z = sx * 0.12;
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.7, 6, 12), mat);
    leg.position.set(sx * 0.11, 0.48, 0);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.26), mat);
    foot.position.set(sx * 0.11, 0.04, 0.05);
    proceduralMannequinGroup.add(arm, leg, foot);
  }
  g.add(proceduralMannequinGroup);
  return g;
}

const proceduralMannequinGroup = new THREE.Group();
const mannequin = buildMannequin();
mannequin.position.set(0, 0, -1.9);
mannequin.rotation.y = 0; // Front of Blender mannequin faces forward towards player
scene.add(mannequin);

// Ground Contact Soft Shadow Texture
function createGroundShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.55)');
  grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.18)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

const shadowGeo = new THREE.PlaneGeometry(1.4, 1.4);
const shadowMat = new THREE.MeshBasicMaterial({
  map: createGroundShadowTexture(),
  transparent: true,
  opacity: 0.8,
  depthWrite: false,
});
const mannequinShadow = new THREE.Mesh(shadowGeo, shadowMat);
mannequinShadow.rotation.x = -Math.PI / 2;
mannequinShadow.position.y = 0.002;
mannequinShadow.userData.isMannequin = true;
mannequin.add(mannequinShadow);

// Cyber Base Ring under Mannequin for grasping & translation
const ringGeo = new THREE.RingGeometry(0.38, 0.42, 48);
const ringMat = new THREE.MeshBasicMaterial({
  color: 0x00e5ff,
  transparent: true,
  opacity: 0.7,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const mannequinRing = new THREE.Mesh(ringGeo, ringMat);
mannequinRing.rotation.x = -Math.PI / 2;
mannequinRing.position.y = 0.004;
mannequinRing.userData.isMannequin = true;
mannequin.add(mannequinRing);

// Outer Cyber Rotation Ring Gizmo (Drag/Twist to rotate mannequin)
const rotateRingGeo = new THREE.RingGeometry(0.46, 0.52, 48);
const rotateRingMat = new THREE.MeshBasicMaterial({
  color: 0x38bdf8,
  transparent: true,
  opacity: 0.65,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const mannequinRotateRing = new THREE.Mesh(rotateRingGeo, rotateRingMat);
mannequinRotateRing.rotation.x = -Math.PI / 2;
mannequinRotateRing.position.y = 0.005;
mannequinRotateRing.userData.isMannequinRotate = true;
mannequin.add(mannequinRotateRing);

// 4 Directional Chevron Tick Markers on the Rotation Ring
for (let i = 0; i < 4; i++) {
  const angle = (i * Math.PI) / 2;
  const tick = new THREE.Mesh(
    new THREE.BoxGeometry(0.024, 0.006, 0.08),
    new THREE.MeshBasicMaterial({ color: 0x00ffff })
  );
  tick.position.set(Math.cos(angle) * 0.49, 0.006, Math.sin(angle) * 0.49);
  tick.rotation.y = -angle;
  tick.userData.isMannequinRotate = true;
  mannequin.add(tick);
}

// Mannequin invisible interaction collider cylinder (height 1.85m, radius 0.45m)
const mannequinCollider = new THREE.Mesh(
  new THREE.CylinderGeometry(0.45, 0.48, 1.85, 16),
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
);
mannequinCollider.position.y = 0.925;
mannequinCollider.userData.isMannequin = true;
mannequin.add(mannequinCollider);

function makeShape(part) {
  switch (part.shape) {
    case 'box':
      return new THREE.BoxGeometry(...part.size);
    case 'sphere':
      return new THREE.SphereGeometry(...part.size);
    case 'cylinder':
      return new THREE.CylinderGeometry(...part.size);
    case 'torus':
      return new THREE.TorusGeometry(...part.size);
    default:
      return new THREE.BoxGeometry(0.2, 0.2, 0.2);
  }
}

// Mannequin clone suit parts (Reflected when placed in correct slot)
const mannequinClones = new Map();
for (const part of PARTS) {
  const cloneMesh = new THREE.Mesh(
    makeShape(part),
    new THREE.MeshStandardMaterial({
      color: part.color,
      roughness: 0.4,
      metalness: 0.2,
      emissive: new THREE.Color(part.color).multiplyScalar(0.25),
    })
  );
  const anchor = new THREE.Vector3(...ANCHORS[part.anchor]);
  const offset = new THREE.Vector3(...part.mannequinOffset);
  cloneMesh.position.copy(anchor).add(offset);
  cloneMesh.scale.setScalar(0.9);
  cloneMesh.visible = false;
  mannequin.add(cloneMesh);
  mannequinClones.set(part.id, cloneMesh);
}

// --- VisionOS Floating Smoked Glass Work Surface ---
const gridOrigin = new THREE.Vector3(0, 0.85, -0.65);
const holoGridGroup = new THREE.Group();
holoGridGroup.position.copy(gridOrigin);
scene.add(holoGridGroup);

const GRID_W = 1.48;
const GRID_D = 0.90;
const GRID_H = 0.022;

// 1. Smoked Glass Platform Slab (Apple VisionOS Glassmorphic Table)
const glassSlabMat = new THREE.MeshStandardMaterial({
  color: 0x09111e,
  transparent: true,
  opacity: 0.84,
  roughness: 0.12,
  metalness: 0.85,
  emissive: 0x020713,
  emissiveIntensity: 0.35,
});
const holoBaseSlab = new THREE.Mesh(
  new THREE.BoxGeometry(GRID_W, GRID_H, GRID_D),
  glassSlabMat
);
holoBaseSlab.position.y = 0;
holoGridGroup.add(holoBaseSlab);

// 2. Ultra-Thin Luminous Perimeter Bevel Rim
const halfW = GRID_W / 2;
const halfD = GRID_D / 2;
const lineY = GRID_H / 2 + 0.002;

const rimLineMat = new THREE.LineBasicMaterial({
  color: 0x38bdf8,
  transparent: true,
  opacity: 0.75,
});
const rimPoints = [
  new THREE.Vector3(-halfW, lineY, -halfD), new THREE.Vector3(halfW, lineY, -halfD),
  new THREE.Vector3(halfW, lineY, -halfD), new THREE.Vector3(halfW, lineY, halfD),
  new THREE.Vector3(halfW, lineY, halfD), new THREE.Vector3(-halfW, lineY, halfD),
  new THREE.Vector3(-halfW, lineY, halfD), new THREE.Vector3(-halfW, lineY, -halfD),
];
const borderWire = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints(rimPoints),
  rimLineMat
);
holoGridGroup.add(borderWire);
const borderWireMat = rimLineMat;
const frameMat = glassSlabMat;

// 3. Subtle Embedded Technical Grid
const stepX = 0.08;
const stepZ = 0.09;
const gridPoints = [];
for (let x = -halfW + stepX; x < halfW; x += stepX) {
  gridPoints.push(new THREE.Vector3(x, lineY, -halfD + 0.04), new THREE.Vector3(x, lineY, halfD - 0.04));
}
for (let z = -halfD + stepZ; z < halfD; z += stepZ) {
  gridPoints.push(new THREE.Vector3(-halfW + 0.04, lineY, z), new THREE.Vector3(halfW - 0.04, lineY, z));
}
const embeddedGridMat = new THREE.LineBasicMaterial({
  color: 0x1e293b,
  transparent: true,
  opacity: 0.45,
});
const majorGrid = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints(gridPoints),
  embeddedGridMat
);
const majorGridMat = embeddedGridMat;
holoGridGroup.add(majorGrid);
holoGridGroup.add(borderWire);

// Glowing Particle Sprites Helper
function createGlowParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.25, 'rgba(0, 229, 255, 0.85)');
  grad.addColorStop(0.6, 'rgba(0, 119, 255, 0.35)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
const particleTexture = createGlowParticleTexture();

// --- Holographic Forming Materialization Particles (Active only during refresh/reset) ---
const NUM_FORM_PARTICLES = 120;
const formPositions = new Float32Array(NUM_FORM_PARTICLES * 3);
const formVelocities = new Float32Array(NUM_FORM_PARTICLES * 3);

for (let i = 0; i < NUM_FORM_PARTICLES; i++) {
  formPositions[i * 3 + 1] = -100;
}

const formGeo = new THREE.BufferGeometry();
formGeo.setAttribute('position', new THREE.BufferAttribute(formPositions, 3));
const formMat = new THREE.PointsMaterial({
  color: 0x00ffff,
  size: 0.035,
  map: particleTexture,
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const formingParticleSystem = new THREE.Points(formGeo, formMat);
holoGridGroup.add(formingParticleSystem);

function initFormingParticles() {
  formingParticleSystem.visible = true;
  formMat.opacity = 1.0;
  for (let i = 0; i < NUM_FORM_PARTICLES; i++) {
    formPositions[i * 3 + 0] = (Math.random() - 0.5) * GRID_W * 0.9;
    formPositions[i * 3 + 1] = Math.random() * 0.05;
    formPositions[i * 3 + 2] = (Math.random() - 0.5) * GRID_D * 0.9;

    const angle = Math.random() * Math.PI * 2;
    const speed = 0.15 + Math.random() * 0.35;
    formVelocities[i * 3 + 0] = Math.cos(angle) * speed;
    formVelocities[i * 3 + 1] = 0.35 + Math.random() * 0.6; // upward burst
    formVelocities[i * 3 + 2] = Math.sin(angle) * speed;
  }
  formGeo.attributes.position.needsUpdate = true;
}

// --- Apple VisionOS Spatial Precision Materialization FX System ---
// 1. Razor-Thin Optical Light Ring Sweep (Hugs the suit piece as it scans down)
const sweepRingGeo = new THREE.TorusGeometry(0.18, 0.0018, 16, 64);
const sweepRingMat = new THREE.MeshBasicMaterial({
  color: 0x93c5fd, // Soft optical ice-blue
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const equipSweepRing = new THREE.Mesh(sweepRingGeo, sweepRingMat);
equipSweepRing.rotation.x = Math.PI / 2;
scene.add(equipSweepRing);

// 2. Micro-Dust Pinpoint Optical Sparkles (24 tiny ambient dust specs)
const NUM_SPARKLES = 24;
const sparklePositions = new Float32Array(NUM_SPARKLES * 3);
const sparkleVelocities = new Float32Array(NUM_SPARKLES * 3);
for (let i = 0; i < NUM_SPARKLES; i++) {
  sparklePositions[i * 3 + 1] = -100;
}
const sparkleGeo = new THREE.BufferGeometry();
sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
const sparkleMat = new THREE.PointsMaterial({
  color: 0xdbeafe, // Soft ice white
  size: 0.012,
  map: particleTexture,
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const equipSparkleSystem = new THREE.Points(sparkleGeo, sparkleMat);
scene.add(equipSparkleSystem);

const equipBaseWorldPos = new THREE.Vector3();
let isEquipFxActive = false;
let equipFxTimer = 0;
const EQUIP_FX_DURATION = 0.42; // Snappy, elegant 420ms Apple spring animation
let activeEquipClone = null;
let equipStartY = 0;
let equipEndY = 0;
let equipRadius = 0.18;

function getEquipWorldPosition(partId) {
  const clone = mannequinClones.get(partId);
  if (clone) {
    const bbox = new THREE.Box3().setFromObject(clone);
    if (!bbox.isEmpty()) {
      const center = new THREE.Vector3();
      bbox.getCenter(center);
      if (center.y > 0.08) return center;
    }
  }
  const manPos = new THREE.Vector3();
  mannequin.getWorldPosition(manPos);
  const part = PARTS.find((p) => p.id === partId);
  const anchorY = ANCHORS[part?.anchor]?.[1] || 1.25;
  return new THREE.Vector3(manPos.x, manPos.y + anchorY, manPos.z);
}

function triggerEquipFX(worldPos, cloneMesh = null) {
  isEquipFxActive = true;
  equipFxTimer = 0;
  equipBaseWorldPos.copy(worldPos);
  activeEquipClone = cloneMesh;

  let halfH = 0.12;
  let rad = 0.18;
  if (activeEquipClone) {
    const bbox = new THREE.Box3().setFromObject(activeEquipClone);
    if (!bbox.isEmpty()) {
      const sz = new THREE.Vector3();
      bbox.getSize(sz);
      halfH = Math.max(0.06, sz.y / 2);
      rad = Math.max(0.09, Math.max(sz.x, sz.z) / 2 + 0.02);
    }
    // Pure optical specular highlight pulse (transform remains 100% exact)
    setEmissive(activeEquipClone, 0x38bdf8, 0.65);
  }

  equipRadius = rad;
  equipStartY = worldPos.y + halfH + 0.02;
  equipEndY = worldPos.y - halfH - 0.02;

  // Setup optical sweep ring
  equipSweepRing.position.set(worldPos.x, equipStartY, worldPos.z);
  const ringScale = rad / 0.18;
  equipSweepRing.scale.set(ringScale, ringScale, ringScale);
  sweepRingMat.opacity = 0.85;

  // Setup subtle micro sparkles
  for (let i = 0; i < NUM_SPARKLES; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = rad * (0.8 + Math.random() * 0.3);
    const yOff = (Math.random() - 0.5) * halfH * 1.5;
    sparklePositions[i * 3 + 0] = worldPos.x + Math.cos(angle) * r;
    sparklePositions[i * 3 + 1] = worldPos.y + yOff;
    sparklePositions[i * 3 + 2] = worldPos.z + Math.sin(angle) * r;

    sparkleVelocities[i * 3 + 0] = Math.cos(angle) * 0.04;
    sparkleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.025;
    sparkleVelocities[i * 3 + 2] = Math.sin(angle) * 0.04;
  }
  sparkleGeo.attributes.position.needsUpdate = true;
  sparkleMat.opacity = 0.75;
}

// --- Transparent Holographic Slot Pads (Grid passes cleanly through!) ---
function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// --- Apple VisionOS Glassmorphism Drawing Helper ---
function drawVisionOSGlass(ctx, x, y, w, h, r, options = {}) {
  const { bgAlpha = 0.68, borderAlpha = 0.28, shadow = true } = options;

  if (shadow) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
  }

  // Smoked Translucent Dark Glass Body
  const glassGrad = ctx.createLinearGradient(x, y, x, y + h);
  glassGrad.addColorStop(0, `rgba(16, 24, 38, ${bgAlpha})`);
  glassGrad.addColorStop(0.5, `rgba(9, 14, 24, ${bgAlpha * 1.1})`);
  glassGrad.addColorStop(1, `rgba(5, 8, 16, ${bgAlpha * 1.25})`);
  ctx.fillStyle = glassGrad;
  drawRoundedRect(ctx, x, y, w, h, r);
  ctx.fill();

  if (shadow) {
    ctx.restore();
  }

  // Ultra-Thin Crisp White/Cyan Border
  const borderGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  borderGrad.addColorStop(0, `rgba(255, 255, 255, ${borderAlpha * 1.5})`);
  borderGrad.addColorStop(0.25, `rgba(56, 189, 248, ${borderAlpha * 1.1})`);
  borderGrad.addColorStop(0.7, `rgba(255, 255, 255, ${borderAlpha * 0.4})`);
  borderGrad.addColorStop(1, `rgba(0, 0, 0, 0.4)`);
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, x + 1, y + 1, w - 2, h - 2, r - 1);
  ctx.stroke();

  // Subtle Top-Edge Sheen
  ctx.beginPath();
  ctx.moveTo(x + r * 1.2, y + 2.5);
  ctx.lineTo(x + w - r * 1.2, y + 2.5);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function createSlotPadTexture(label, isCorrect = false, isHovered = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');

  let bgOpacity = 0.50;
  let borderColor = 'rgba(255, 255, 255, 0.18)';
  let textColor = '#ffffff';
  let subtitleColor = '#94a3b8';
  let subtitleText = 'DRAG HERE';

  if (isCorrect) {
    bgOpacity = 0.62;
    borderColor = 'rgba(16, 185, 129, 0.85)';
    textColor = '#34d399';
    subtitleColor = '#34d399';
    subtitleText = '✓ VERIFIED';
    ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
    drawRoundedRect(ctx, 24, 24, 976, 720, 48);
    ctx.fill();
  } else if (isHovered) {
    bgOpacity = 0.68;
    borderColor = 'rgba(56, 189, 248, 0.9)';
    textColor = '#38bdf8';
    subtitleColor = '#38bdf8';
    subtitleText = 'RELEASE TO DROP';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
    drawRoundedRect(ctx, 24, 24, 976, 720, 48);
    ctx.fill();
  }

  // VisionOS Smoked Glass Pad Base
  drawVisionOSGlass(ctx, 24, 24, 976, 720, 48, {
    bgAlpha: bgOpacity,
    borderAlpha: isHovered || isCorrect ? 0.8 : 0.3,
    shadow: false,
  });

  // Etched Slot Label (Modern Bold Geometric Typography)
  ctx.fillStyle = textColor;
  ctx.font = '900 100px "Space Grotesk", "Plus Jakarta Sans", -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`SLOT ${label}`, 512, 300);

  // Subtitle
  ctx.fillStyle = subtitleColor;
  ctx.font = '800 64px "Plus Jakarta Sans", "Inter", -apple-system, sans-serif';
  ctx.fillText(subtitleText, 512, 490);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = 8;
  return texture;
}

const slotPads = [];
for (let i = 0; i < SLOT_POSITIONS.length; i++) {
  const slotDef = SLOT_POSITIONS[i];
  const padMat = new THREE.MeshBasicMaterial({
    map: createSlotPadTexture(slotDef.label, false, false),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const padMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.19), padMat);
  padMesh.rotation.x = -Math.PI / 2;
  padMesh.position.set(slotDef.pos[0], lineY + 0.003, slotDef.pos[2]);
  padMesh.userData.slotIndex = i;
  padMesh.userData.slotDef = slotDef;
  holoGridGroup.add(padMesh);
  slotPads.push(padMesh);
}

// --- VisionOS Floating Spatial Capsule Badges (Above 3D Parts) ---
const labels = [];
function createBadge(text, stepNum) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');

  // Outer Smoked Glass Capsule
  drawVisionOSGlass(ctx, 10, 10, 1004, 220, 60, { bgAlpha: 0.82, borderAlpha: 0.45, shadow: true });

  // Left Sequence Number Pill
  const numPillWidth = 170;
  const numGrad = ctx.createLinearGradient(24, 24, 24, 216);
  numGrad.addColorStop(0, 'rgba(30, 41, 59, 0.98)');
  numGrad.addColorStop(1, 'rgba(15, 23, 42, 1.0)');
  ctx.fillStyle = numGrad;
  drawRoundedRect(ctx, 24, 24, numPillWidth, 192, 48);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 24, 24, numPillWidth, 192, 48);
  ctx.stroke();

  // Number String (e.g. 01, 02)
  const stepStr = String(stepNum).padStart(2, '0');
  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 78px "Space Grotesk", "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(stepStr, 24 + numPillWidth / 2, 120);

  // Component Name String
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 58px "Plus Jakarta Sans", "Inter", -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(text, 225, 120);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = 8;

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.066),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  plane.visible = false; // Hidden by default, appears on gaze/hover!
  labels.push(plane);
  return plane;
}

// --- Suit Parts Creation ---
const partsById = new Map();
const allPartMeshes = [];

for (const part of PARTS) {
  const mesh = new THREE.Mesh(
    makeShape(part),
    new THREE.MeshStandardMaterial({
      color: part.color,
      roughness: 0.4,
      metalness: 0.2,
      emissive: new THREE.Color(0x000000),
    })
  );
  mesh.userData.part = part;
  mesh.userData.isPart = true;
  mesh.userData.currentSlot = 0;
  mesh.userData.targetPos = new THREE.Vector3();
  mesh.userData.isGrabbed = false;

  const halfH = part.shape === 'sphere' ? part.size[0] : (part.size[1] || 0.08) / 2;
  mesh.userData.halfH = halfH;

  scene.add(mesh);
  partsById.set(part.id, mesh);
  allPartMeshes.push(mesh);

  const label = createBadge(part.label || part.name, part.step);
  scene.add(label);
  mesh.userData.label = label;
}

function setEmissive(mesh, colorHex, intensity = 1.0) {
  if (!mesh) return;
  mesh.traverse((c) => {
    if (c.isMesh && c.material) {
      const mats = Array.isArray(c.material) ? c.material : [c.material];
      for (const m of mats) {
        if (m && m.emissive) {
          m.emissive.setHex(colorHex);
          m.emissiveIntensity = intensity;
        }
      }
    }
  });
}

// --- GLTF / GLB Model Hotswapper ---
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('./draco/');
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

function loadGLBModels() {
  // 1. Try master stage.glb
  gltfLoader.load(
    './models/stage.glb',
    (gltf) => {
      console.log('✅ Loaded master stage.glb! Hotswapping 3D suit assets...');

      // Find reference center for mannequin in Blender coordinates
      let refX = 0.67;
      let refZ = -0.11;
      gltf.scene.traverse((child) => {
        if (child.name && child.name.startsWith('MANNEQUIN') && child.position) {
          refX = child.position.x;
          refZ = child.position.z;
        }
      });

      // 1. Process MANNEQUIN_body (supports Group and Mesh)
      gltf.scene.children.forEach((child) => {
        if (child.name && child.name.startsWith('MANNEQUIN')) {
          proceduralMannequinGroup.visible = false;
          const bodyClone = child.clone();
          bodyClone.position.set(child.position.x - refX, child.position.y, child.position.z - refZ);
          bodyClone.quaternion.copy(child.quaternion);
          bodyClone.scale.copy(child.scale);
          bodyClone.visible = true;
          mannequin.add(bodyClone);
        }
      });

      // 2. Process EQUIPPED_ nodes (fitted suit on mannequin)
      gltf.scene.children.forEach((child) => {
        if (child.name && (child.name.startsWith('EQUIPPED_') || child.name.startsWith('FIT_'))) {
          let partId = child.name.replace('EQUIPPED_', '').replace('FIT_', '');
          if (partId === 'trousers.001') partId = 'pem';

          const mannequinMesh = mannequinClones.get(partId);
          if (mannequinMesh) {
            // Reset container transform to origin (0, 0, 0)
            mannequinMesh.position.set(0, 0, 0);
            mannequinMesh.quaternion.identity();
            mannequinMesh.scale.set(1, 1, 1);

            // Remove procedural shape and make container transparent
            mannequinMesh.geometry.dispose();
            mannequinMesh.geometry = new THREE.BufferGeometry();
            mannequinMesh.material = new THREE.MeshBasicMaterial({ visible: false });

            while (mannequinMesh.children.length > 0) {
              mannequinMesh.remove(mannequinMesh.children[0]);
            }

            const clone = child.clone();
            clone.position.set(child.position.x - refX, child.position.y, child.position.z - refZ);
            clone.quaternion.copy(child.quaternion);
            clone.scale.copy(child.scale);
            clone.visible = true;
            mannequinMesh.add(clone);
          }
        }
      });

      // 3. Process PART_ nodes (table slot models)
      gltf.scene.children.forEach((child) => {
        if (child.name && child.name.startsWith('PART_')) {
          const partId = child.name.replace('PART_', '');
          const gridMesh = partsById.get(partId);
          if (gridMesh) {
            while (gridMesh.children.length > 0) {
              gridMesh.remove(gridMesh.children[0]);
            }

            const clone = child.clone();
            clone.position.set(0, 0, 0);
            clone.rotation.set(0, 0, 0);

            // Center geometry inside carrier box
            const bbox = new THREE.Box3().setFromObject(clone);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            clone.position.sub(center);

            // Scale to fit nicely within slot pad
            const size = new THREE.Vector3();
            bbox.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 0.001) {
              const targetSize = 0.18;
              const scaleFactor = Math.min(1.5, targetSize / Math.max(0.18, maxDim));
              clone.scale.multiplyScalar(scaleFactor);
              clone.position.multiplyScalar(scaleFactor);
            }

            const scaledBbox = new THREE.Box3().setFromObject(clone);
            scaledBbox.getSize(size);
            gridMesh.userData.halfH = Math.max(0.04, size.y / 2);

            // Make carrier mesh an invisible collider
            gridMesh.geometry.dispose();
            gridMesh.geometry = new THREE.BoxGeometry(0.20, Math.max(0.08, size.y), 0.16);
            gridMesh.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });

            gridMesh.add(clone);
          }
        }
      });

      // Update target positions for current slots with new geometry half-heights
      for (const mesh of allPartMeshes) {
        mesh.userData.targetPos.copy(
          getSlotWorldPosition(mesh.userData.currentSlot, mesh.userData.halfH)
        );
        mesh.position.copy(mesh.userData.targetPos);
      }
      updateMannequinReflection();
    },
    undefined,
    () => {
      // 2. Fallback: Check for individual part GLB files in /models/
      for (const part of PARTS) {
        gltfLoader.load(
          `./models/${part.id}.glb`,
          (gltf) => {
            let foundMesh = null;
            gltf.scene.traverse((c) => {
              if (c.isMesh && !foundMesh) foundMesh = c;
            });
            if (foundMesh) {
              const gridMesh = partsById.get(part.id);
              if (gridMesh) {
                gridMesh.geometry.dispose();
                const geo = foundMesh.geometry.clone();
                geo.center();
                gridMesh.geometry = geo;
                if (foundMesh.material) gridMesh.material = foundMesh.material.clone();
              }
            }
          },
          undefined,
          () => {} // Silent fallback to procedural primitives
        );
      }
    }
  );
}
loadGLBModels();

// Slot occupancy tracker: slotOccupants[slotIndex] = mesh
let slotOccupants = new Array(SLOT_POSITIONS.length).fill(null);

function getSlotWorldPosition(slotIndex, halfH = 0.04) {
  const slotDef = SLOT_POSITIONS[slotIndex];
  return new THREE.Vector3(
    gridOrigin.x + slotDef.pos[0],
    gridOrigin.y + 0.015 + halfH,
    gridOrigin.z + slotDef.pos[2]
  );
}

// --- Apple VisionOS Spatial UI Setup ---
// 1. Main Objective Panel (Floating Upper-Left)
const objCanvas = document.createElement('canvas');
objCanvas.width = 2048;
objCanvas.height = 1600;
const objCtx = objCanvas.getContext('2d');
const objTexture = new THREE.CanvasTexture(objCanvas);
objTexture.generateMipmaps = true;
objTexture.minFilter = THREE.LinearMipmapLinearFilter;
objTexture.anisotropy = 8;

const objectivePanel = new THREE.Mesh(
  new THREE.PlaneGeometry(0.86, 0.67),
  new THREE.MeshBasicMaterial({ map: objTexture, transparent: true, depthWrite: false })
);
objectivePanel.position.set(-0.80, 1.48, -1.30);
objectivePanel.rotation.set(-0.04, 0.26, 0);
objectivePanel.userData.isUI = true;
scene.add(objectivePanel);

// Side chevron navigation handle on Objective panel
const navPillGeo = new THREE.RingGeometry(0.028, 0.038, 32);
const navPillMat = new THREE.MeshBasicMaterial({
  color: 0x38bdf8,
  transparent: true,
  opacity: 0.75,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const navPill = new THREE.Mesh(navPillGeo, navPillMat);
navPill.position.set(0.44, 0.05, 0.01);
objectivePanel.add(navPill);

// 2. Sequencing Progress Card (Floating Upper-Right)
const progCanvas = document.createElement('canvas');
progCanvas.width = 1600;
progCanvas.height = 960;
const progCtx = progCanvas.getContext('2d');
const progTexture = new THREE.CanvasTexture(progCanvas);
progTexture.generateMipmaps = true;
progTexture.minFilter = THREE.LinearMipmapLinearFilter;
progTexture.anisotropy = 8;

const progressPanel = new THREE.Mesh(
  new THREE.PlaneGeometry(0.60, 0.36),
  new THREE.MeshBasicMaterial({ map: progTexture, transparent: true, depthWrite: false })
);
progressPanel.position.set(0.76, 1.50, -1.30);
progressPanel.rotation.set(-0.04, -0.26, 0);
progressPanel.userData.isUI = true;
scene.add(progressPanel);

// Shuffle Action Button inside Progress Card
const shuffleBtn = new THREE.Mesh(
  new THREE.PlaneGeometry(0.32, 0.09),
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
);
shuffleBtn.position.set(0, -0.075, 0.01);
shuffleBtn.userData.isReset = true;
progressPanel.add(shuffleBtn);

// Unified references for legacy event handling
const hud = objectivePanel;
const resetBtn = shuffleBtn;

let gameState = 'playing';

function updateHUD(correctCount = 0) {
  // 1. RENDER OBJECTIVE PANEL (High-Density Ultra-Crisp Canvas)
  objCtx.clearRect(0, 0, 2048, 1600);
  drawVisionOSGlass(objCtx, 24, 24, 2000, 1552, 64, { bgAlpha: 0.70, borderAlpha: 0.40, shadow: true });

  // Header status pill
  objCtx.beginPath();
  objCtx.arc(110, 120, 12, 0, Math.PI * 2);
  objCtx.fillStyle = '#00f0ff';
  objCtx.shadowColor = '#00f0ff';
  objCtx.shadowBlur = 16;
  objCtx.fill();
  objCtx.shadowBlur = 0;

  objCtx.fillStyle = '#38bdf8';
  objCtx.font = '800 38px "Plus Jakarta Sans", "Inter", sans-serif';
  objCtx.textAlign = 'left';
  objCtx.fillText('OBJECTIVE', 140, 132);

  // Large Bold Title
  objCtx.fillStyle = '#ffffff';
  objCtx.font = '800 88px "Plus Jakarta Sans", "Inter", -apple-system, sans-serif';
  objCtx.fillText('Sort Components into', 110, 265);
  objCtx.fillText('SOP Order (1 → 11)', 110, 375);

  // Secondary Instructional text
  objCtx.fillStyle = '#cbd5e1';
  objCtx.font = '600 44px "Inter", "Plus Jakarta Sans", sans-serif';
  objCtx.fillText('Drag & drop parts between holographic slots.', 110, 500);
  objCtx.fillText('Correct placement snaps the component.', 110, 565);

  // Hairline divider
  objCtx.beginPath();
  objCtx.moveTo(110, 650);
  objCtx.lineTo(1938, 650);
  objCtx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  objCtx.lineWidth = 3;
  objCtx.stroke();

  // Bottom Counter Metric
  objCtx.beginPath();
  objCtx.arc(155, 800, 34, 0, Math.PI * 2);
  objCtx.strokeStyle = '#38bdf8';
  objCtx.lineWidth = 4.5;
  objCtx.stroke();
  objCtx.beginPath();
  objCtx.moveTo(155, 780);
  objCtx.lineTo(155, 800);
  objCtx.lineTo(170, 800);
  objCtx.strokeStyle = '#38bdf8';
  objCtx.lineWidth = 4;
  objCtx.stroke();

  objCtx.fillStyle = '#ffffff';
  objCtx.font = '900 96px "Space Grotesk", "Plus Jakarta Sans", sans-serif';
  objCtx.fillText(`${correctCount} / 11`, 215, 825);

  objCtx.fillStyle = '#94a3b8';
  objCtx.font = '700 48px "Plus Jakarta Sans", sans-serif';
  objCtx.fillText('Components placed', 560, 825);

  // Abstract Blue Wave Graphic at bottom
  const waveY = 1320;
  for (let w = 0; w < 3; w++) {
    objCtx.beginPath();
    objCtx.moveTo(100, waveY + w * 28);
    for (let x = 100; x <= 1948; x += 60) {
      const y = waveY + Math.sin((x * 0.005) + w * 1.5) * 65 + Math.cos(x * 0.003) * 30;
      objCtx.lineTo(x, y);
    }
    objCtx.strokeStyle = `rgba(56, 189, 248, ${0.18 + w * 0.1})`;
    objCtx.lineWidth = 3.5;
    objCtx.stroke();
  }
  objTexture.needsUpdate = true;

  // 2. RENDER PROGRESS PANEL (High-Density Canvas)
  progCtx.clearRect(0, 0, 1600, 960);
  drawVisionOSGlass(progCtx, 24, 24, 1552, 912, 56, { bgAlpha: 0.72, borderAlpha: 0.40, shadow: true });

  // Progress Header
  progCtx.beginPath();
  progCtx.arc(90, 100, 10, 0, Math.PI * 2);
  progCtx.fillStyle = '#00f0ff';
  progCtx.shadowColor = '#00f0ff';
  progCtx.shadowBlur = 14;
  progCtx.fill();
  progCtx.shadowBlur = 0;

  progCtx.fillStyle = '#38bdf8';
  progCtx.font = '800 36px "Plus Jakarta Sans", "Inter", sans-serif';
  progCtx.textAlign = 'left';
  progCtx.fillText('SEQUENCING PROGRESS', 118, 112);

  // 11 Segmented Progress Pills (Large & High Contrast)
  const segW = 112;
  const segH = 24;
  const segGap = 18;
  const startX = 90;
  for (let i = 0; i < PARTS.length; i++) {
    const px = startX + i * (segW + segGap);
    const isSlotCorrect = slotOccupants[i] && slotOccupants[i].userData.part.targetSlot === i;
    progCtx.fillStyle = isSlotCorrect ? '#00f0ff' : 'rgba(71, 85, 105, 0.65)';
    if (isSlotCorrect) {
      progCtx.shadowColor = '#00f0ff';
      progCtx.shadowBlur = 12;
    }
    drawRoundedRect(progCtx, px, 210, segW, segH, 12);
    progCtx.fill();
    progCtx.shadowBlur = 0;
  }

  // Large Pill-Shaped SHUFFLE Button
  const btnX = 420;
  const btnY = 560;
  const btnW = 760;
  const btnH = 180;
  drawVisionOSGlass(progCtx, btnX, btnY, btnW, btnH, 90, { bgAlpha: 0.85, borderAlpha: 0.50, shadow: true });

  // Shuffle Icon & Text
  progCtx.fillStyle = '#ffffff';
  progCtx.font = '800 68px "Plus Jakarta Sans", "Inter", -apple-system, sans-serif';
  progCtx.textAlign = 'center';
  progCtx.textBaseline = 'middle';
  progCtx.fillText('↝  SHUFFLE', btnX + btnW / 2, btnY + btnH / 2);
  progTexture.needsUpdate = true;
}

// --- Shuffling, Jumbling, and Holographic Forming Animation ---
let isForming = false;
let formTimer = 0;
const FORM_DURATION = 0.9;
let lastPermutationKey = '';

function generateJumbledIndices() {
  const n = PARTS.length;
  let indices;
  let attempts = 0;

  do {
    indices = Array.from({ length: n }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Strict Derangement Check: Zero parts are in their correct target slot
    let hasAnyMatch = false;
    for (let i = 0; i < n; i++) {
      if (indices[i] === PARTS[i].targetSlot) {
        hasAnyMatch = true;
        break;
      }
    }

    const key = indices.join(',');
    if (!hasAnyMatch && (key !== lastPermutationKey || attempts > 60)) {
      lastPermutationKey = key;
      return indices;
    }
    attempts++;
  } while (attempts < 200);

  // Guaranteed derangement fallback (shift by 1..n-1)
  const shift = 1 + Math.floor(Math.random() * (n - 1));
  indices = Array.from({ length: n }, (_, i) => (PARTS[i].targetSlot + shift) % n);
  lastPermutationKey = indices.join(',');
  return indices;
}

function triggerFormingAnimation() {
  isForming = true;
  formTimer = 0;
  holoGridGroup.scale.set(0.001, 0.001, 0.001);
  frameMat.emissiveIntensity = 2.5;

  initFormingParticles();

  for (let i = 0; i < allPartMeshes.length; i++) {
    const mesh = allPartMeshes[i];
    mesh.userData.spawnDelay = i * 0.045; // Staggered entry
    mesh.scale.set(0.001, 0.001, 0.001);
    mesh.position.y = mesh.userData.targetPos.y + 0.35;
    setEmissive(mesh, 0x00e5ff, 2.0);
    if (mesh.userData.label) {
      mesh.userData.label.scale.set(0.001, 0.001, 0.001);
    }
  }
}

function shuffleAndAssign() {
  gameState = 'playing';
  const indices = generateJumbledIndices();
  slotOccupants = new Array(SLOT_POSITIONS.length).fill(null);

  for (let i = 0; i < allPartMeshes.length; i++) {
    const mesh = allPartMeshes[i];
    const slotIdx = indices[i];
    slotOccupants[slotIdx] = mesh;
    mesh.userData.currentSlot = slotIdx;
    mesh.userData.targetPos.copy(getSlotWorldPosition(slotIdx, mesh.userData.halfH));
    mesh.position.copy(mesh.userData.targetPos);
  }

  updateMannequinReflection();
  triggerFormingAnimation();
}

const equippedState = new Map();

function updateMannequinReflection() {
  let correctCount = 0;

  for (let s = 0; s < SLOT_POSITIONS.length; s++) {
    const mesh = slotOccupants[s];
    const pad = slotPads[s];
    const isCorrect = mesh && mesh.userData.part.targetSlot === s;

    if (pad) {
      pad.material.map = createSlotPadTexture(SLOT_POSITIONS[s].label, isCorrect, false);
      pad.material.map.needsUpdate = true;
    }

    if (isCorrect) {
      correctCount++;
      const partId = mesh.userData.part.id;
      const clone = mannequinClones.get(partId);
      if (clone) {
        clone.visible = true;
        if (!equippedState.get(partId)) {
          equippedState.set(partId, true);
          const equipPos = getEquipWorldPosition(partId);
          triggerEquipFX(equipPos, clone);
        }
      }
    } else {
      if (mesh) {
        const partId = mesh.userData.part.id;
        const clone = mannequinClones.get(partId);
        if (clone) clone.visible = false;
        equippedState.set(partId, false);
      }
    }
  }

  // Hide any clones for items not correctly placed
  for (const part of PARTS) {
    const mesh = partsById.get(part.id);
    if (!mesh || mesh.userData.currentSlot !== part.targetSlot) {
      const clone = mannequinClones.get(part.id);
      if (clone) clone.visible = false;
      equippedState.set(part.id, false);
    }
  }

  if (correctCount === PARTS.length && gameState === 'playing') {
    gameState = 'victory';
  }

  updateHUD(correctCount);
}

// Initial Shuffle & Materialization
shuffleAndAssign();

// --- Drag & Drop / Swapping / Rotation State ---
let grabbedItem = null;
let grabController = null;
let hoveredSlotIndex = -1;
let grabbedUI = null;
let uiGrabController = null;
let uiGrabDist = 1.6;
let isDraggingUI = false;

let isDraggingMannequin = false;
let isRotatingMannequin = false;
let mannequinGrabController = null;
let mannequinGrabDist = 2.0;
let mannequinRotateStartAngle = 0;
let mannequinInitialRotY = 0;

const raycaster = new THREE.Raycaster();
const controllers = [];
const controllerModelFactory = new XRControllerModelFactory();

function setupController(index) {
  const controller = renderer.xr.getController(index);
  player.add(controller);

  // Glowing laser beam
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -5)]),
    new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.85 })
  );
  controller.add(line);
  controller.userData.line = line;
  controller.userData.hovered = null;

  // Pointer reticle ring
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.012, 0.02, 32),
    new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthTest: false,
    })
  );
  reticle.position.set(0, 0, -5);
  controller.add(reticle);
  controller.userData.reticle = reticle;

  const grip = renderer.xr.getControllerGrip(index);
  grip.add(controllerModelFactory.createControllerModel(grip));
  player.add(grip);

  controller.addEventListener('selectstart', () => onVRSelectStart(controller));
  controller.addEventListener('selectend', () => onVRSelectEnd(controller));
  controllers.push(controller);
  return controller;
}
setupController(0);
setupController(1);

renderer.xr.addEventListener('sessionstart', () => {
  const session = renderer.xr.getSession();
  const isAR =
    session?.mode === 'immersive-ar' ||
    session?.environmentBlendMode === 'additive' ||
    session?.environmentBlendMode === 'alpha-blend';

  if (isAR) {
    scene.background = null;
    renderer.setClearColor(0x000000, 0);
    floor.visible = false;
  } else {
    scene.background = new THREE.Color(0x10141f);
    renderer.setClearColor(0x10141f, 1);
    floor.visible = true;
  }

  camera.position.set(0, 0, 0);
  camera.quaternion.identity();
});

renderer.xr.addEventListener('sessionend', () => {
  scene.background = new THREE.Color(0x10141f);
  renderer.setClearColor(0x10141f, 1);
  floor.visible = true;
  updateOrbitCamera();
});

function pickFromRay(origin, direction) {
  raycaster.ray.origin.copy(origin);
  raycaster.ray.direction.copy(direction);

  const targets = [
    ...allPartMeshes,
    ...slotPads,
    shuffleBtn,
    objectivePanel,
    progressPanel,
    mannequinRotateRing,
    mannequinCollider,
    mannequinRing,
    mannequinShadow,
  ];
  const hits = raycaster.intersectObjects(targets, false);
  return hits.length ? hits[0] : null;
}

const _tempOrigin = new THREE.Vector3();
const _tempDir = new THREE.Vector3();
const _tempQuat = new THREE.Quaternion();

function pick(controller) {
  controller.getWorldPosition(_tempOrigin);
  controller.getWorldQuaternion(_tempQuat);
  _tempDir.set(0, 0, -1).applyQuaternion(_tempQuat);
  const hitData = pickFromRay(_tempOrigin, _tempDir);
  if (hitData) {
    if (controller.userData.reticle) {
      controller.userData.reticle.position.z = -hitData.distance;
      controller.userData.reticle.scale.setScalar(Math.max(0.3, hitData.distance * 0.35));
    }
    if (controller.userData.line) {
      controller.userData.line.scale.z = hitData.distance / 5;
    }
    return hitData;
  } else {
    if (controller.userData.reticle) {
      controller.userData.reticle.position.z = -5;
      controller.userData.reticle.scale.setScalar(1);
    }
    if (controller.userData.line) {
      controller.userData.line.scale.z = 1;
    }
    return null;
  }
}

// Find closest slot to a given world position
function findClosestSlot(worldPos) {
  let closestIdx = -1;
  let minDist = Infinity;
  for (let s = 0; s < SLOT_POSITIONS.length; s++) {
    const slotWorldPos = getSlotWorldPosition(s, 0);
    const dist = worldPos.distanceTo(slotWorldPos);
    if (dist < minDist) {
      minDist = dist;
      closestIdx = s;
    }
  }
  return { index: closestIdx, distance: minDist };
}

function swapSlots(sourceSlotIdx, targetSlotIdx) {
  if (sourceSlotIdx === targetSlotIdx || sourceSlotIdx < 0 || targetSlotIdx < 0) return;

  const itemA = slotOccupants[sourceSlotIdx];
  const itemB = slotOccupants[targetSlotIdx];

  if (!itemA) return;

  if (itemB) {
    slotOccupants[sourceSlotIdx] = itemB;
    itemB.userData.currentSlot = sourceSlotIdx;
    itemB.userData.targetPos.copy(getSlotWorldPosition(sourceSlotIdx, itemB.userData.halfH));
  } else {
    slotOccupants[sourceSlotIdx] = null;
  }

  slotOccupants[targetSlotIdx] = itemA;
  itemA.userData.currentSlot = targetSlotIdx;
  itemA.userData.targetPos.copy(getSlotWorldPosition(targetSlotIdx, itemA.userData.halfH));

  updateMannequinReflection();
}

function onVRSelectStart(controller) {
  const hitData = pick(controller);
  if (!hitData) return;
  const hit = hitData.object;

  if (hit === shuffleBtn || hit?.userData?.isReset) {
    shuffleAndAssign();
    return;
  }

  if (hit === objectivePanel || hit === progressPanel) {
    grabbedUI = hit;
    uiGrabController = controller;
    uiGrabDist = Math.max(0.6, hitData.distance);
    return;
  }

  // Rotation ring grabbed
  if (hit === mannequinRotateRing || hit?.userData?.isMannequinRotate) {
    isRotatingMannequin = true;
    mannequinGrabController = controller;
    const hitPt = hitData.point;
    mannequinRotateStartAngle = Math.atan2(hitPt.x - mannequin.position.x, hitPt.z - mannequin.position.z);
    mannequinInitialRotY = mannequin.rotation.y;
    return;
  }

  if (
    hit === mannequinCollider ||
    hit === mannequinRing ||
    hit === mannequinShadow ||
    hit.userData?.isMannequin
  ) {
    isDraggingMannequin = true;
    mannequinGrabController = controller;
    mannequinGrabDist = Math.max(0.8, hitData.distance);
    return;
  }

  // If grabbed a part mesh
  if (hit.userData && hit.userData.isPart) {
    grabbedItem = hit;
    grabController = controller;
    grabbedItem.userData.isGrabbed = true;
    setEmissive(grabbedItem, 0x00e5ff, 1.0);
  }
}

function onVRSelectEnd(controller) {
  if (grabbedUI && uiGrabController === controller) {
    grabbedUI = null;
    uiGrabController = null;
  }

  if ((isDraggingMannequin || isRotatingMannequin) && mannequinGrabController === controller) {
    isDraggingMannequin = false;
    isRotatingMannequin = false;
    mannequinGrabController = null;
  }

  if (grabbedItem && grabController === controller) {
    // Drop logic
    const { index: closestSlot, distance } = findClosestSlot(grabbedItem.position);
    if (closestSlot !== -1 && distance < 0.35) {
      swapSlots(grabbedItem.userData.currentSlot, closestSlot);
    } else {
      // return to original slot
      grabbedItem.userData.targetPos.copy(
        getSlotWorldPosition(grabbedItem.userData.currentSlot, grabbedItem.userData.halfH)
      );
    }

    setEmissive(grabbedItem, 0x000000, 0);
    grabbedItem.userData.isGrabbed = false;
    grabbedItem = null;
    grabController = null;
    updateMannequinReflection();
  }
}

// --- Animation Loop ---
const clock = new THREE.Clock();
const MOVE_SPEED = 2.2;
const SNAP_ANGLE = Math.PI / 6;
let snapCooldown = 0;

function updateLocomotion(dt) {
  const session = renderer.xr.getSession();
  if (!session) return;
  snapCooldown -= dt;
  for (const source of session.inputSources) {
    if (!source.gamepad) continue;
    const axes = source.gamepad.axes;
    const x = axes[2] ?? 0;
    const y = axes[3] ?? 0;

    // If currently manipulating mannequin, thumbstick rotates mannequin!
    if (isDraggingMannequin || isRotatingMannequin) {
      if (Math.abs(x) > 0.15) {
        mannequin.rotation.y += x * dt * 3.0;
      }
      continue;
    }

    if (source.handedness === 'left') {
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).negate();
      const move = new THREE.Vector3().addScaledVector(forward, -y).addScaledVector(right, x);
      if (move.lengthSq() > 0.01) {
        player.position.addScaledVector(move.normalize(), MOVE_SPEED * dt);
      }
    } else if (source.handedness === 'right' && snapCooldown <= 0) {
      if (Math.abs(x) > 0.7) {
        const angle = x > 0 ? -SNAP_ANGLE : SNAP_ANGLE;
        const quat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        const head = camera.getWorldPosition(new THREE.Vector3());
        player.position.sub(head).applyQuaternion(quat).add(head);
        player.quaternion.premultiply(quat);
        snapCooldown = 0.25;
      }
    }
  }
}

function animate() {
  const dt = clock.getDelta();
  const t = clock.elapsedTime;
  updateLocomotion(dt);

  // Subtle floating hover bob on holographic platform
  holoGridGroup.position.y = gridOrigin.y + Math.sin(t * 1.5) * 0.006;

  // Glowing pulse on holographic grid lines and outer edges
  majorGridMat.opacity = 0.45 + Math.sin(t * 2.0) * 0.1;
  borderWireMat.opacity = 0.75 + Math.sin(t * 2.5) * 0.15;
  mannequinRing.material.opacity = 0.55 + Math.sin(t * 2.5) * 0.25;
  mannequinRotateRing.material.opacity = 0.6 + Math.sin(t * 2.0) * 0.2;

  // Apple VisionOS Spatial Precision Materialization Animation Update
  if (isEquipFxActive) {
    equipFxTimer += dt;
    const p = Math.min(1, equipFxTimer / EQUIP_FX_DURATION);

    // 1. Soft optical specular pulse fade
    if (activeEquipClone) {
      setEmissive(activeEquipClone, 0x38bdf8, Math.max(0, 0.75 * (1.0 - p * 1.25)));
    }

    // 2. Razor-Thin Optical Light Ring Sweep (Top -> Bottom)
    const sweepEase = Math.sin((p * Math.PI) / 2);
    equipSweepRing.position.y = THREE.MathUtils.lerp(equipStartY, equipEndY, sweepEase);
    sweepRingMat.opacity = Math.max(0, Math.sin(p * Math.PI) * 0.85);

    // 3. Ambient Micro-Dust Sparkles Dissolve
    sparkleMat.opacity = Math.max(0, (1.0 - p) * 0.75);
    for (let i = 0; i < NUM_SPARKLES; i++) {
      sparklePositions[i * 3 + 0] += sparkleVelocities[i * 3 + 0] * dt;
      sparklePositions[i * 3 + 1] += sparkleVelocities[i * 3 + 1] * dt;
      sparklePositions[i * 3 + 2] += sparkleVelocities[i * 3 + 2] * dt;
    }
    sparkleGeo.attributes.position.needsUpdate = true;

    if (equipFxTimer >= EQUIP_FX_DURATION) {
      isEquipFxActive = false;
      sweepRingMat.opacity = 0;
      sparkleMat.opacity = 0;
      if (activeEquipClone) {
        setEmissive(activeEquipClone, 0x000000, 0);
        activeEquipClone = null;
      }
    }
  }

  if (isForming) {
    formTimer += dt;
    const p = Math.min(1, formTimer / FORM_DURATION);

    // Update forming particles (rise and fade completely)
    formMat.opacity = Math.max(0, 1.0 - p * 1.15);
    for (let i = 0; i < NUM_FORM_PARTICLES; i++) {
      formPositions[i * 3 + 0] += formVelocities[i * 3 + 0] * dt;
      formPositions[i * 3 + 1] += formVelocities[i * 3 + 1] * dt;
      formPositions[i * 3 + 2] += formVelocities[i * 3 + 2] * dt;
    }
    formGeo.attributes.position.needsUpdate = true;

    // Grid expansion ease
    const gridP = Math.min(1, formTimer / 0.35);
    const gridEase = Math.sin((gridP * Math.PI) / 2);
    holoGridGroup.scale.set(gridEase, gridEase, gridEase);
    frameMat.emissiveIntensity = 0.7 + (1 - gridP) * 2.0;

    // Staggered materialization for each suit component
    let allFinished = true;
    for (let i = 0; i < allPartMeshes.length; i++) {
      const mesh = allPartMeshes[i];
      const delay = mesh.userData.spawnDelay;
      if (formTimer < delay) {
        mesh.scale.set(0.001, 0.001, 0.001);
        if (mesh.userData.label) mesh.userData.label.scale.set(0.001, 0.001, 0.001);
        allFinished = false;
        continue;
      }
      const itemTimer = formTimer - delay;
      const itemDuration = 0.35;
      const itemP = Math.min(1, itemTimer / itemDuration);
      const itemEase = Math.sin((itemP * Math.PI) / 2);
      const scaleVal = Math.min(1, itemP * 1.15);
      mesh.scale.set(scaleVal, scaleVal, scaleVal);

      if (mesh.userData.label) {
        mesh.userData.label.scale.set(scaleVal, scaleVal, scaleVal);
        mesh.userData.label.position.set(
          mesh.position.x,
          mesh.position.y + mesh.userData.halfH + 0.065,
          mesh.position.z
        );
      }

      // Drop smoothly from +0.35m
      const targetY = holoGridGroup.position.y + 0.015 + mesh.userData.halfH;
      mesh.position.y = THREE.MathUtils.lerp(targetY + 0.35, targetY, itemEase);
      mesh.position.x = mesh.userData.targetPos.x;
      mesh.position.z = mesh.userData.targetPos.z;

      // Flare fade
      setEmissive(mesh, itemP >= 1 ? 0x000000 : 0x00e5ff, Math.max(0, 2.0 * (1 - itemP)));

      if (itemP < 1) allFinished = false;
    }

    if (formTimer >= FORM_DURATION && allFinished) {
      isForming = false;
      formingParticleSystem.visible = false;
      formMat.opacity = 0;
      holoGridGroup.scale.set(1, 1, 1);
      for (const mesh of allPartMeshes) {
        mesh.scale.set(1, 1, 1);
        if (mesh.userData.label) mesh.userData.label.scale.set(1, 1, 1);
        setEmissive(mesh, 0x000000, 0);
      }
    }
  } else {
    // Normal update part positions without any lingering particles
    for (const mesh of allPartMeshes) {
      if (!mesh.userData.isGrabbed) {
        mesh.userData.targetPos.y =
          holoGridGroup.position.y + 0.015 + mesh.userData.halfH;
        mesh.position.lerp(mesh.userData.targetPos, 0.18);
      }
      if (mesh.userData.label) {
        mesh.userData.label.position.set(
          mesh.position.x,
          mesh.position.y + mesh.userData.halfH + 0.065,
          mesh.position.z
        );
      }
    }
  }

  // Hover-Only visibility for object labels & orient towards camera
  for (const mesh of allPartMeshes) {
    const label = mesh.userData.label;
    if (label) {
      const isVRHover = controllers.some((c) => c.userData.hovered === mesh);
      const isMouseHover = mouseHovered === mesh;
      const isGrab = mesh.userData.isGrabbed || selectedPartForSwap === mesh;
      label.visible = isVRHover || isMouseHover || isGrab;
      if (label.visible) {
        label.quaternion.copy(camera.quaternion);
      }
    }
  }

  // In VR, update grabbed item & mannequin positions
  if (renderer.xr.isPresenting) {
    if (grabbedUI && uiGrabController) {
      const rayOrigin = uiGrabController.getWorldPosition(new THREE.Vector3());
      const rayDir = new THREE.Vector3(0, 0, -1).applyQuaternion(
        uiGrabController.getWorldQuaternion(new THREE.Quaternion())
      );
      grabbedUI.position.copy(rayOrigin).addScaledVector(rayDir, uiGrabDist);
      grabbedUI.lookAt(camera.getWorldPosition(new THREE.Vector3()));
    }

    if (isRotatingMannequin && mannequinGrabController) {
      const rayOrigin = mannequinGrabController.getWorldPosition(new THREE.Vector3());
      const rayDir = new THREE.Vector3(0, 0, -1).applyQuaternion(
        mannequinGrabController.getWorldQuaternion(new THREE.Quaternion())
      );
      if (Math.abs(rayDir.y) > 0.02) {
        const dist = -rayOrigin.y / rayDir.y;
        if (dist > 0 && dist < 8) {
          const pt = rayOrigin.clone().addScaledVector(rayDir, dist);
          const currentAngle = Math.atan2(pt.x - mannequin.position.x, pt.z - mannequin.position.z);
          const deltaAngle = currentAngle - mannequinRotateStartAngle;
          mannequin.rotation.y = mannequinInitialRotY + deltaAngle;
        }
      }
    } else if (isDraggingMannequin && mannequinGrabController) {
      const rayOrigin = mannequinGrabController.getWorldPosition(new THREE.Vector3());
      const rayDir = new THREE.Vector3(0, 0, -1).applyQuaternion(
        mannequinGrabController.getWorldQuaternion(new THREE.Quaternion())
      );
      if (Math.abs(rayDir.y) > 0.02) {
        const dist = -rayOrigin.y / rayDir.y;
        if (dist > 0 && dist < 8) {
          const pt = rayOrigin.clone().addScaledVector(rayDir, dist);
          mannequin.position.x = pt.x;
          mannequin.position.z = pt.z;
        }
      }
    }

    if (grabbedItem && grabController) {
      const rayOrigin = grabController.getWorldPosition(new THREE.Vector3());
      const rayDir = new THREE.Vector3(0, 0, -1).applyQuaternion(
        grabController.getWorldQuaternion(new THREE.Quaternion())
      );
      const planeY = holoGridGroup.position.y + 0.08;
      const dist = (planeY - rayOrigin.y) / rayDir.y;
      if (dist > 0 && dist < 4) {
        const targetPoint = rayOrigin.clone().addScaledVector(rayDir, dist);
        grabbedItem.position.lerp(targetPoint, 0.35);
      }
    }

    for (const controller of controllers) {
      const hitData = pick(controller);
      const hit = hitData ? hitData.object : null;
      const prev = controller.userData.hovered;
      if (prev && prev !== hit) {
        if (!prev.userData.isGrabbed) {
          setEmissive(prev, 0x000000, 0);
        }
        controller.userData.hovered = null;
      }
      if (hit && hit !== prev) {
        controller.userData.hovered = hit;
      }
      if (controller.userData.hovered && !controller.userData.hovered.userData.isGrabbed) {
        const h = controller.userData.hovered;
        setEmissive(h, h.userData.isReset ? 0x0077aa : 0x00e5ff, 0.8 + Math.sin(t * 8) * 0.4);
      }
    }
  } else if (mouseHovered && !mouseHovered.userData.isGrabbed) {
    setEmissive(mouseHovered, mouseHovered.userData.isReset ? 0x0077aa : 0x00e5ff, 0.8 + Math.sin(t * 8) * 0.4);
  }

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// --- Desktop Preview Controls (Drag & Drop + Click to Swap + Mannequin Drag/Rotate) ---
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Disable default context menu so right click drag rotates smoothly
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

const mouse = new THREE.Vector2();
let mouseHovered = null;
let draggingCam = false;
let lastX = 0;
let lastY = 0;
const orbitTarget = new THREE.Vector3(0, 1.1, -1);
let orbitAngle = Math.PI;
let orbitElevation = 0.25;
let orbitDist = 3.2;

let selectedPartForSwap = null; // Click-to-swap support
let isDraggingPart = false;

function updateOrbitCamera() {
  camera.position.set(
    orbitTarget.x + orbitDist * Math.cos(orbitElevation) * Math.sin(orbitAngle),
    orbitTarget.y + orbitDist * Math.sin(orbitElevation),
    orbitTarget.z + orbitDist * Math.cos(orbitElevation) * Math.cos(orbitAngle)
  );
  camera.lookAt(orbitTarget);
}
updateOrbitCamera();

function updateMouseRay(event) {
  mouse.x = (event.clientX / innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
}

const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -gridOrigin.y - 0.08);

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (renderer.xr.isPresenting) return;
  updateMouseRay(e);

  const hitData = pickFromRay(raycaster.ray.origin, raycaster.ray.direction);
  const hit = hitData ? hitData.object : null;

  if (hit === shuffleBtn || hit === resetBtn || hit?.userData?.isReset) {
    shuffleAndAssign();
  } else if (hit === progressPanel) {
    // If clicked on lower region of progress panel (shuffle button)
    shuffleAndAssign();
  } else if (hit === objectivePanel) {
    isDraggingUI = true;
    grabbedUI = objectivePanel;
  } else if (
    e.button === 2 ||
    (e.button === 0 && e.shiftKey) ||
    hit === mannequinRotateRing ||
    hit?.userData?.isMannequinRotate
  ) {
    // Rotate mannequin with Right Click, Shift+Click, or clicking rotation ring
    isRotatingMannequin = true;
    lastX = e.clientX;
    lastY = e.clientY;
  } else if (
    hit === mannequinCollider ||
    hit === mannequinRing ||
    hit === mannequinShadow ||
    hit?.userData?.isMannequin
  ) {
    isDraggingMannequin = true;
  } else if (hit && hit.userData.isPart) {
    // Start dragging part
    grabbedItem = hit;
    isDraggingPart = true;
    grabbedItem.userData.isGrabbed = true;
    setEmissive(grabbedItem, 0x00e5ff, 1.0);
  } else if (e.button === 0 && !hit) {
    draggingCam = true;
    lastX = e.clientX;
    lastY = e.clientY;
  }
});

addEventListener('pointerup', (e) => {
  if (renderer.xr.isPresenting) return;

  if (isDraggingUI) {
    isDraggingUI = false;
    grabbedUI = null;
  }

  if (isDraggingMannequin) {
    isDraggingMannequin = false;
  }

  if (isRotatingMannequin) {
    isRotatingMannequin = false;
  }

  if (isDraggingPart && grabbedItem) {
    const { index: closestSlot, distance } = findClosestSlot(grabbedItem.position);
    if (closestSlot !== -1 && distance < 0.35) {
      swapSlots(grabbedItem.userData.currentSlot, closestSlot);
    } else {
      grabbedItem.userData.targetPos.copy(
        getSlotWorldPosition(grabbedItem.userData.currentSlot, grabbedItem.userData.halfH)
      );
    }
    setEmissive(grabbedItem, 0x000000, 0);
    grabbedItem.userData.isGrabbed = false;
    grabbedItem = null;
    isDraggingPart = false;
    updateMannequinReflection();
  }

  draggingCam = false;
});

renderer.domElement.addEventListener('pointermove', (e) => {
  if (renderer.xr.isPresenting) return;
  updateMouseRay(e);

  if (isDraggingUI && grabbedUI) {
    const panelNormal = new THREE.Vector3().subVectors(camera.position, grabbedUI.position).normalize();
    dragPlane.setFromNormalAndCoplanarPoint(panelNormal, grabbedUI.position);
    const panelPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlane, panelPoint)) {
      grabbedUI.position.copy(panelPoint);
      grabbedUI.lookAt(camera.position);
    }
    return;
  }

  if (isRotatingMannequin) {
    const deltaX = e.clientX - lastX;
    mannequin.rotation.y += deltaX * 0.015;
    lastX = e.clientX;
    lastY = e.clientY;
    return;
  }

  if (isDraggingMannequin) {
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(floorPlane, intersectPoint)) {
      mannequin.position.x = intersectPoint.x;
      mannequin.position.z = intersectPoint.z;
    }
    return;
  }

  if (isDraggingPart && grabbedItem) {
    const intersectPoint = new THREE.Vector3();
    dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, gridOrigin.y + 0.08, 0));
    raycaster.ray.intersectPlane(dragPlane, intersectPoint);
    if (intersectPoint) {
      grabbedItem.position.copy(intersectPoint);
    }
    return;
  }

  if (draggingCam) {
    orbitAngle -= (e.clientX - lastX) * 0.005;
    orbitElevation = Math.min(1.4, Math.max(-0.2, orbitElevation + (e.clientY - lastY) * 0.005));
    lastX = e.clientX;
    lastY = e.clientY;
    updateOrbitCamera();
    return;
  }

  const hitData = pickFromRay(raycaster.ray.origin, raycaster.ray.direction);
  const hit = hitData ? hitData.object : null;

  if (mouseHovered && mouseHovered !== hit) {
    if (!mouseHovered.userData.isGrabbed) {
      setEmissive(mouseHovered, 0x000000, 0);
    }
    mouseHovered = null;
  }
  if (hit && hit !== mouseHovered) {
    mouseHovered = hit;
    setEmissive(hit, hit.userData.isReset ? 0x0077aa : 0x00e5ff, 1.0);
  }
});

// Click-to-swap support for desktop convenience
renderer.domElement.addEventListener('click', (e) => {
  if (renderer.xr.isPresenting) return;
  updateMouseRay(e);

  const hitData = pickFromRay(raycaster.ray.origin, raycaster.ray.direction);
  const hit = hitData ? hitData.object : null;

  if (hit === shuffleBtn || hit === resetBtn || hit === progressPanel || hit?.userData?.isReset) {
    shuffleAndAssign();
    return;
  }

  if (hit && hit.userData.isPart) {
    if (!selectedPartForSwap) {
      selectedPartForSwap = hit;
      setEmissive(selectedPartForSwap, 0x38bdf8, 1.0);
    } else if (selectedPartForSwap === hit) {
      setEmissive(selectedPartForSwap, 0x000000, 0);
      selectedPartForSwap = null;
    } else {
      // Swap clicked parts
      swapSlots(selectedPartForSwap.userData.currentSlot, hit.userData.currentSlot);
      setEmissive(selectedPartForSwap, 0x000000, 0);
      selectedPartForSwap = null;
    }
  } else if (hit && hit.userData.slotIndex !== undefined && selectedPartForSwap) {
    // Clicked a slot while holding a selected part
    swapSlots(selectedPartForSwap.userData.currentSlot, hit.userData.slotIndex);
    setEmissive(selectedPartForSwap, 0x000000, 0);
    selectedPartForSwap = null;
  }
});

renderer.domElement.addEventListener('wheel', (e) => {
  if (renderer.xr.isPresenting) return;
  orbitDist = Math.min(8, Math.max(1.2, orbitDist + e.deltaY * 0.002));
  updateOrbitCamera();
});
