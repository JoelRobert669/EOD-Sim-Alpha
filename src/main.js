import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
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

// --- Floating High-Tech Blue Holographic Grid ---
const gridOrigin = new THREE.Vector3(0, 0.85, -0.65);
const holoGridGroup = new THREE.Group();
holoGridGroup.position.copy(gridOrigin);
scene.add(holoGridGroup);

const GRID_W = 1.44;
const GRID_D = 0.88;
const GRID_H = 0.015;

// 1. Underlying Translucent Cyber Base Slab
const holoBaseSlab = new THREE.Mesh(
  new THREE.BoxGeometry(GRID_W, GRID_H, GRID_D),
  new THREE.MeshStandardMaterial({
    color: 0x020a1c,
    transparent: true,
    opacity: 0.88,
    roughness: 0.1,
    metalness: 0.9,
    emissive: 0x01132b,
    emissiveIntensity: 0.5,
  })
);
holoBaseSlab.position.y = 0;
holoGridGroup.add(holoBaseSlab);

// 2. Glowing Outer Perimeter Frame Rails
const frameMat = new THREE.MeshStandardMaterial({
  color: 0x021c3d,
  emissive: 0x00e5ff,
  emissiveIntensity: 0.9,
  roughness: 0.2,
  metalness: 0.8,
});

const railThickness = 0.014;
const railHeight = 0.020;

// Front & Back rails
for (const rz of [-GRID_D / 2, GRID_D / 2]) {
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(GRID_W + railThickness, railHeight, railThickness),
    frameMat
  );
  rail.position.set(0, railHeight / 2 - GRID_H / 2, rz);
  holoGridGroup.add(rail);
}

// Left & Right rails
for (const rx of [-GRID_W / 2, GRID_W / 2]) {
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(railThickness, railHeight, GRID_D + railThickness),
    frameMat
  );
  rail.position.set(rx, railHeight / 2 - GRID_H / 2, 0);
  holoGridGroup.add(rail);
}

// 3. High-Contrast 3D Vector Grid Lines & Intersection Nodes
const minorPoints = [];
const majorPoints = [];
const nodePoints = [];

const stepX = 0.08;
const stepZ = 0.09;
const halfW = GRID_W / 2;
const halfD = GRID_D / 2;
const lineY = GRID_H / 2 + 0.002;

// Vertical lines (along Z)
let colIdx = 0;
for (let x = -halfW; x <= halfW + 0.001; x += stepX) {
  const isMajor = colIdx % 2 === 0;
  const targetArray = isMajor ? majorPoints : minorPoints;
  targetArray.push(new THREE.Vector3(x, lineY, -halfD), new THREE.Vector3(x, lineY, halfD));
  colIdx++;
}

// Horizontal lines (along X)
let rowIdx = 0;
for (let z = -halfD; z <= halfD + 0.001; z += stepZ) {
  const isMajor = rowIdx % 2 === 0;
  const targetArray = isMajor ? majorPoints : minorPoints;
  targetArray.push(new THREE.Vector3(-halfW, lineY, z), new THREE.Vector3(halfW, lineY, z));
  rowIdx++;
}

// Node points at major intersections
for (let x = -halfW; x <= halfW + 0.001; x += stepX * 2) {
  for (let z = -halfD; z <= halfD + 0.001; z += stepZ * 2) {
    nodePoints.push(new THREE.Vector3(x, lineY + 0.001, z));
  }
}

// Minor grid lines
const minorGridMat = new THREE.LineBasicMaterial({
  color: 0x0088dd,
  transparent: true,
  opacity: 0.65,
});
const minorGrid = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints(minorPoints),
  minorGridMat
);
holoGridGroup.add(minorGrid);

// Major grid lines
const majorGridMat = new THREE.LineBasicMaterial({
  color: 0x00ffff,
  transparent: true,
  opacity: 1.0,
});
const majorGrid = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints(majorPoints),
  majorGridMat
);
holoGridGroup.add(majorGrid);

// Outer luminous neon border wire
const borderPoints = [
  new THREE.Vector3(-halfW, lineY + 0.001, -halfD),
  new THREE.Vector3(halfW, lineY + 0.001, -halfD),
  new THREE.Vector3(halfW, lineY + 0.001, -halfD),
  new THREE.Vector3(halfW, lineY + 0.001, halfD),
  new THREE.Vector3(halfW, lineY + 0.001, halfD),
  new THREE.Vector3(-halfW, lineY + 0.001, halfD),
  new THREE.Vector3(-halfW, lineY + 0.001, halfD),
  new THREE.Vector3(-halfW, lineY + 0.001, -halfD),
];
const borderWireMat = new THREE.LineBasicMaterial({
  color: 0x38bdf8,
  transparent: true,
  opacity: 1.0,
});
const borderWire = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints(borderPoints),
  borderWireMat
);
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

// Grid Node Points
const nodeGeo = new THREE.BufferGeometry().setFromPoints(nodePoints);
const nodeMat = new THREE.PointsMaterial({
  color: 0x00ffff,
  size: 0.022,
  map: particleTexture,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const gridNodes = new THREE.Points(nodeGeo, nodeMat);
holoGridGroup.add(gridNodes);

// 4. Cyber Corner Brackets
function createCornerBracket(x, z, rotY) {
  const bracketGroup = new THREE.Group();
  const bMat = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 1.2,
  });
  const armLen = 0.07;
  const armThick = 0.007;
  const arm1 = new THREE.Mesh(new THREE.BoxGeometry(armLen, 0.006, armThick), bMat);
  arm1.position.set(armLen / 2, lineY + 0.003, 0);
  const arm2 = new THREE.Mesh(new THREE.BoxGeometry(armThick, 0.006, armLen), bMat);
  arm2.position.set(0, lineY + 0.003, armLen / 2);
  bracketGroup.add(arm1, arm2);
  bracketGroup.position.set(x, 0, z);
  bracketGroup.rotation.y = rotY;
  return bracketGroup;
}
holoGridGroup.add(createCornerBracket(-halfW + 0.01, -halfD + 0.01, 0));
holoGridGroup.add(createCornerBracket(halfW - 0.01, -halfD + 0.01, -Math.PI / 2));
holoGridGroup.add(createCornerBracket(halfW - 0.01, halfD - 0.01, Math.PI));
holoGridGroup.add(createCornerBracket(-halfW + 0.01, halfD - 0.01, Math.PI / 2));

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

function createSlotPadTexture(label, isCorrect = false, isHovered = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');

  let borderColor = 'rgba(0, 229, 255, 0.75)';
  let textColor = '#38bdf8';
  let cornerColor = '#00e5ff';

  if (isCorrect) {
    borderColor = '#10b981';
    textColor = '#34d399';
    cornerColor = '#34d399';
    // Subtle translucent emerald glow only on verified
    ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
    drawRoundedRect(ctx, 16, 16, 480, 352, 28);
    ctx.fill();
  } else if (isHovered) {
    borderColor = '#38bdf8';
    textColor = '#ffffff';
    cornerColor = '#ffffff';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
    drawRoundedRect(ctx, 16, 16, 480, 352, 28);
    ctx.fill();
  }

  // Glowing boundary outline (center is transparent so grid lines are 100% visible!)
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = isHovered || isCorrect ? 6 : 4;
  drawRoundedRect(ctx, 16, 16, 480, 352, 28);
  ctx.stroke();

  // Corner crosshairs on slot pad
  ctx.strokeStyle = cornerColor;
  ctx.lineWidth = 6;
  const ch = 32;
  // TL
  ctx.beginPath(); ctx.moveTo(24, 24 + ch); ctx.lineTo(24, 24); ctx.lineTo(24 + ch, 24); ctx.stroke();
  // TR
  ctx.beginPath(); ctx.moveTo(488 - ch, 24); ctx.lineTo(488, 24); ctx.lineTo(488, 24 + ch); ctx.stroke();
  // BL
  ctx.beginPath(); ctx.moveTo(24, 360 - ch); ctx.lineTo(24, 360); ctx.lineTo(24 + ch, 360); ctx.stroke();
  // BR
  ctx.beginPath(); ctx.moveTo(488 - ch, 360); ctx.lineTo(488, 360); ctx.lineTo(488, 360 - ch); ctx.stroke();

  // Slot header text
  ctx.fillStyle = textColor;
  ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`SLOT ${label}`, 256, 145);

  // Status subtitle
  ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
  if (isCorrect) {
    ctx.fillStyle = '#34d399';
    ctx.fillText('✓ VERIFIED', 256, 255);
  } else if (isHovered) {
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('DROP TO SWAP', 256, 255);
  } else {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
    ctx.fillText('STEP ' + label, 256, 255);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
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

// --- Floating Glassmorphic Part Badges ---
const labels = [];
function createBadge(text, stepNum) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const bgGrad = ctx.createLinearGradient(0, 0, 0, 128);
  bgGrad.addColorStop(0, 'rgba(15, 23, 42, 0.85)');
  bgGrad.addColorStop(1, 'rgba(8, 14, 28, 0.95)');
  ctx.fillStyle = bgGrad;
  drawRoundedRect(ctx, 4, 4, 504, 120, 26);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Top sheen
  ctx.beginPath();
  ctx.moveTo(32, 6);
  ctx.lineTo(480, 6);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Text
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.055),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
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
const gltfLoader = new GLTFLoader();

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

// --- HUD Setup ---
const hudCanvas = document.createElement('canvas');
hudCanvas.width = 2048;
hudCanvas.height = 512;
const hudCtx = hudCanvas.getContext('2d');
const hudTexture = new THREE.CanvasTexture(hudCanvas);
hudTexture.minFilter = THREE.LinearFilter;

const hud = new THREE.Mesh(
  new THREE.PlaneGeometry(1.6, 0.4),
  new THREE.MeshBasicMaterial({ map: hudTexture, transparent: true })
);
hud.position.set(0, 2.2, -2.6);
scene.add(hud);

function createButtonTexture(text, bgGradient = ['#0284c7', '#0369a1']) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, 192);
  grad.addColorStop(0, bgGradient[0]);
  grad.addColorStop(1, bgGradient[1]);
  ctx.fillStyle = grad;
  drawRoundedRect(ctx, 8, 8, 496, 176, 36);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0, 242, 254, 0.75)';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(40, 14);
  ctx.lineTo(472, 14);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 58px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 96);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

const resetBtn = new THREE.Mesh(
  new THREE.BoxGeometry(0.32, 0.10, 0.03),
  new THREE.MeshStandardMaterial({
    map: createButtonTexture('↺ SHUFFLE', ['#0284c7', '#075985']),
    roughness: 0.3,
    metalness: 0.2,
  })
);
resetBtn.position.set(0.56, -0.06, 0.02);
resetBtn.userData.isReset = true;
hud.add(resetBtn);

let gameState = 'playing';

function updateHUD(correctCount = 0) {
  hudCtx.clearRect(0, 0, 2048, 512);

  // Main Frosted Glass Panel
  const mainGrad = hudCtx.createLinearGradient(0, 0, 0, 512);
  mainGrad.addColorStop(0, 'rgba(15, 23, 42, 0.78)');
  mainGrad.addColorStop(1, 'rgba(8, 12, 24, 0.92)');
  hudCtx.fillStyle = mainGrad;
  drawRoundedRect(hudCtx, 20, 20, 2008, 472, 48);
  hudCtx.fill();

  const borderGrad = hudCtx.createLinearGradient(0, 0, 0, 512);
  borderGrad.addColorStop(0, 'rgba(0, 229, 255, 0.55)');
  borderGrad.addColorStop(0.5, 'rgba(0, 229, 255, 0.2)');
  borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
  hudCtx.strokeStyle = borderGrad;
  hudCtx.lineWidth = 4;
  hudCtx.stroke();

  // Top Light Sheen
  hudCtx.beginPath();
  hudCtx.moveTo(80, 26);
  hudCtx.lineTo(1968, 26);
  hudCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  hudCtx.lineWidth = 2.5;
  hudCtx.stroke();

  if (correctCount === PARTS.length) {
    // VICTORY
    hudCtx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    drawRoundedRect(hudCtx, 80, 60, 480, 54, 18);
    hudCtx.fill();
    hudCtx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
    hudCtx.lineWidth = 2;
    hudCtx.stroke();

    hudCtx.fillStyle = '#34d399';
    hudCtx.font = 'bold 28px system-ui, sans-serif';
    hudCtx.textAlign = 'center';
    hudCtx.fillText('🏆  SOP ORDER VERIFIED', 320, 96);

    hudCtx.fillStyle = '#f8fafc';
    hudCtx.font = 'bold 64px system-ui, sans-serif';
    hudCtx.textAlign = 'left';
    hudCtx.fillText('MANNEQUIN FULLY EQUIPPED', 80, 210);

    hudCtx.fillStyle = '#94a3b8';
    hudCtx.font = '500 32px system-ui, sans-serif';
    hudCtx.fillText('All 11 components placed in flawless SOP donning order.', 80, 275);

    hudCtx.fillStyle = '#38bdf8';
    hudCtx.font = '600 28px system-ui, sans-serif';
    hudCtx.fillText('Select [↺ SHUFFLE] on the right to start a new trial.', 80, 390);
  } else {
    // IN PROGRESS
    hudCtx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    drawRoundedRect(hudCtx, 80, 56, 380, 50, 16);
    hudCtx.fill();
    hudCtx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    hudCtx.lineWidth = 2;
    hudCtx.stroke();

    hudCtx.fillStyle = '#38bdf8';
    hudCtx.font = 'bold 26px system-ui, sans-serif';
    hudCtx.textAlign = 'center';
    hudCtx.fillText(`● SEQUENCING PROGRESS`, 270, 90);

    // 11 Progress segments
    const segStart = 490;
    const segWidth = 60;
    const segGap = 8;
    for (let i = 0; i < PARTS.length; i++) {
      const sx = segStart + i * (segWidth + segGap);
      const isSlotCorrect = slotOccupants[i] && slotOccupants[i].userData.part.targetSlot === i;
      hudCtx.fillStyle = isSlotCorrect ? '#10b981' : 'rgba(255, 255, 255, 0.12)';
      drawRoundedRect(hudCtx, sx, 72, segWidth, 18, 9);
      hudCtx.fill();
    }

    // Title Instruction
    hudCtx.fillStyle = '#f8fafc';
    hudCtx.font = 'bold 58px system-ui, sans-serif';
    hudCtx.textAlign = 'left';
    hudCtx.fillText('Sort Components into SOP Order (1 → 11)', 80, 220);

    hudCtx.fillStyle = '#94a3b8';
    hudCtx.font = '500 30px system-ui, sans-serif';
    hudCtx.fillText('Drag & drop parts between holographic slots. Correct placements equip the mannequin.', 80, 280);

    // Score pill (Bottom Left)
    hudCtx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    drawRoundedRect(hudCtx, 80, 350, 420, 84, 20);
    hudCtx.fill();
    hudCtx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
    hudCtx.lineWidth = 2;
    hudCtx.stroke();

    hudCtx.fillStyle = '#94a3b8';
    hudCtx.font = 'bold 24px system-ui, sans-serif';
    hudCtx.textAlign = 'left';
    hudCtx.fillText('CORRECT SLOTS', 110, 400);

    hudCtx.fillStyle = '#38bdf8';
    hudCtx.font = 'bold 36px system-ui, sans-serif';
    hudCtx.fillText(`${correctCount} / ${PARTS.length}`, 330, 400);
  }

  hudTexture.needsUpdate = true;
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
      const clone = mannequinClones.get(mesh.userData.part.id);
      if (clone) clone.visible = true;
      if (mesh.userData.label) {
        mesh.userData.label.visible = true;
      }
    } else {
      if (mesh) {
        const clone = mannequinClones.get(mesh.userData.part.id);
        if (clone) clone.visible = false;
      }
    }
  }

  // Hide any clones for items not correctly placed
  for (const part of PARTS) {
    const mesh = partsById.get(part.id);
    if (!mesh || mesh.userData.currentSlot !== part.targetSlot) {
      const clone = mannequinClones.get(part.id);
      if (clone) clone.visible = false;
    }
  }

  if (correctCount === PARTS.length && gameState === 'playing') {
    gameState = 'victory';
  }

  updateHUD(correctCount);
}

// Initial Shuffle & Materialization
shuffleAndAssign();

// --- Drag & Drop / Swapping State ---
let grabbedItem = null;
let grabController = null;
let hoveredSlotIndex = -1;
let grabbedUI = null;
let uiGrabController = null;
let uiGrabDist = 1.6;
let isDraggingUI = false;

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

  const targets = [...allPartMeshes, ...slotPads, resetBtn, hud];
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
    // Two-item swap
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

  if (hit === resetBtn) {
    shuffleAndAssign();
    return;
  }

  if (hit === hud) {
    grabbedUI = hud;
    uiGrabController = controller;
    uiGrabDist = Math.max(0.6, hitData.distance);
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
    if (!source.gamepad || !source.handedness) continue;
    const axes = source.gamepad.axes;
    const x = axes[2] ?? 0;
    const y = axes[3] ?? 0;
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
  majorGridMat.opacity = 0.85 + Math.sin(t * 3.0) * 0.15;
  borderWireMat.opacity = 0.85 + Math.sin(t * 3.0) * 0.15;
  frameMat.emissiveIntensity = isForming ? frameMat.emissiveIntensity : (0.7 + Math.sin(t * 3.0) * 0.3);
  nodeMat.size = 0.020 + Math.sin(t * 3.5) * 0.006;

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

  // Orient all floating labels towards camera
  for (const label of labels) {
    if (label.visible) {
      label.quaternion.copy(camera.quaternion);
    }
  }

  // In VR, update grabbed item position along controller ray
  if (renderer.xr.isPresenting) {
    if (grabbedUI && uiGrabController) {
      const rayOrigin = uiGrabController.getWorldPosition(new THREE.Vector3());
      const rayDir = new THREE.Vector3(0, 0, -1).applyQuaternion(
        uiGrabController.getWorldQuaternion(new THREE.Quaternion())
      );
      grabbedUI.position.copy(rayOrigin).addScaledVector(rayDir, uiGrabDist);
      grabbedUI.lookAt(camera.getWorldPosition(new THREE.Vector3()));
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

// --- Desktop Preview Controls (Drag & Drop + Click to Swap) ---
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

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

  if (hit === resetBtn) {
    shuffleAndAssign();
  } else if (hit === hud) {
    isDraggingUI = true;
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

  if (isDraggingUI) {
    const panelNormal = new THREE.Vector3().subVectors(camera.position, hud.position).normalize();
    dragPlane.setFromNormalAndCoplanarPoint(panelNormal, hud.position);
    const panelPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlane, panelPoint)) {
      hud.position.copy(panelPoint);
      hud.lookAt(camera.position);
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

  if (hit === resetBtn) {
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
