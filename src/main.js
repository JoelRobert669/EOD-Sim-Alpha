import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRButton } from './xrbutton.js';
import { LIVES, PARTS, ANCHORS } from './config.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202028);

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

scene.add(new THREE.HemisphereLight(0xffffff, 0x444455, 1.2));
const dir = new THREE.DirectionalLight(0xffffff, 1.5);
dir.position.set(2, 4, 2);
scene.add(dir);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(12, 12),
  new THREE.MeshStandardMaterial({ color: 0x3a3a42 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const tableTopY = 0.85;
const table = new THREE.Group();
table.position.set(0, 0, -0.65);
scene.add(table);

const top = new THREE.Mesh(
  new THREE.BoxGeometry(1.3, 0.04, 0.8),
  new THREE.MeshStandardMaterial({ color: 0x6b4f35, roughness: 0.8 })
);
top.position.y = tableTopY;
table.add(top);

for (const [lx, lz] of [[-0.58, -0.34], [0.58, -0.34], [-0.58, 0.34], [0.58, 0.34]]) {
  const leg = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, tableTopY, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x553f2a, roughness: 0.8 })
  );
  leg.position.set(lx, tableTopY / 2, lz);
  table.add(leg);
}

function buildMannequin() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x8899aa });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.45, 8, 16), mat);
  torso.position.y = 1.2;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), mat);
  head.position.y = 1.62;
  const hips = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.12, 8, 16), mat);
  hips.position.y = 0.95;
  g.add(torso, head, hips);
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.55, 6, 12), mat);
    arm.position.set(sx * 0.26, 1.22, 0);
    arm.rotation.z = sx * 0.12;
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.7, 6, 12), mat);
    leg.position.set(sx * 0.11, 0.48, 0);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.26), mat);
    foot.position.set(sx * 0.11, 0.04, 0.05);
    g.add(arm, leg, foot);
  }
  return g;
}
const mannequin = buildMannequin();
mannequin.position.set(0, 0, -1.9);
mannequin.rotation.y = Math.PI;
scene.add(mannequin);

const labels = [];

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

function createBadge(text, stepNum, width = 0.22, height = 0.055) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Frosted glass background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 128);
  bgGrad.addColorStop(0, 'rgba(30, 41, 59, 0.82)');
  bgGrad.addColorStop(1, 'rgba(15, 23, 42, 0.92)');
  ctx.fillStyle = bgGrad;
  drawRoundedRect(ctx, 4, 4, 504, 120, 28);
  ctx.fill();

  // Glass specular top border
  const borderGrad = ctx.createLinearGradient(0, 0, 0, 128);
  borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  borderGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
  borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Specular top highlight sheen
  ctx.beginPath();
  ctx.moveTo(32, 6);
  ctx.lineTo(480, 6);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Step number disc badge
  if (stepNum) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.beginPath();
    ctx.arc(58, 64, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(stepNum), 58, 65);

    // Part text
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 110, 64);
  } else {
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
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

const partsById = new Map();
for (const part of PARTS) {
  const mesh = new THREE.Mesh(
    makeShape(part),
    new THREE.MeshStandardMaterial({ color: part.color, roughness: 0.5, metalness: 0.1 })
  );
  mesh.userData.part = part;
  mesh.position.copy(table.position);
  mesh.position.x += part.tablePos[0];
  const halfH = part.shape === 'sphere' ? part.size[0] : (part.size[1] || 0.08) / 2;
  mesh.position.y += tableTopY + 0.02 + halfH;
  mesh.position.z += part.tablePos[2];
  scene.add(mesh);
  partsById.set(part.id, mesh);

  const label = createBadge(part.label || part.name, part.step, 0.22, 0.055);
  label.position.set(mesh.position.x, mesh.position.y + halfH + 0.065, mesh.position.z);
  scene.add(label);
  mesh.userData.label = label;
}

function createButtonTexture(text, bgGradient = ['#ef4444', '#b91c1c']) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');

  // Frosted gradient fill
  const grad = ctx.createLinearGradient(0, 0, 0, 192);
  grad.addColorStop(0, bgGradient[0]);
  grad.addColorStop(1, bgGradient[1]);
  ctx.fillStyle = grad;
  drawRoundedRect(ctx, 8, 8, 496, 176, 36);
  ctx.fill();

  // Glass border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Specular sheen
  ctx.beginPath();
  ctx.moveTo(40, 14);
  ctx.lineTo(472, 14);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 96);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

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

// Floating 3D Reset Button right next to the Lives section on the HUD
const resetBtn = new THREE.Mesh(
  new THREE.BoxGeometry(0.28, 0.10, 0.03),
  new THREE.MeshStandardMaterial({
    map: createButtonTexture('↺ RESET', ['#dc2626', '#991b1b']),
    roughness: 0.3,
    metalness: 0.1,
  })
);
resetBtn.position.set(0.56, -0.06, 0.02);
resetBtn.userData.isReset = true;
hud.add(resetBtn);

function updateHUD() {
  hudCtx.clearRect(0, 0, 2048, 512);

  // Main Frosted Glass Panel
  const mainGrad = hudCtx.createLinearGradient(0, 0, 0, 512);
  mainGrad.addColorStop(0, 'rgba(15, 23, 42, 0.72)');
  mainGrad.addColorStop(1, 'rgba(8, 12, 24, 0.88)');
  hudCtx.fillStyle = mainGrad;
  drawRoundedRect(hudCtx, 20, 20, 2008, 472, 48);
  hudCtx.fill();

  // Glass Border with specular light catch
  const borderGrad = hudCtx.createLinearGradient(0, 0, 0, 512);
  borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
  borderGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)');
  borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.04)');
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

  if (gameState === 'won') {
    // Trophy Badge
    hudCtx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    drawRoundedRect(hudCtx, 80, 60, 480, 54, 18);
    hudCtx.fill();
    hudCtx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
    hudCtx.lineWidth = 2;
    hudCtx.stroke();

    hudCtx.fillStyle = '#34d399';
    hudCtx.font = 'bold 28px system-ui, sans-serif';
    hudCtx.textAlign = 'center';
    hudCtx.fillText('🏆  TRAINING CERTIFIED', 320, 96);

    hudCtx.fillStyle = '#f8fafc';
    hudCtx.font = 'bold 64px system-ui, sans-serif';
    hudCtx.textAlign = 'left';
    hudCtx.fillText('SUIT DONNING COMPLETE', 80, 210);

    hudCtx.fillStyle = '#94a3b8';
    hudCtx.font = '500 32px system-ui, sans-serif';
    hudCtx.fillText('All 11 components equipped in flawless SOP sequence.', 80, 275);

    hudCtx.fillStyle = '#38bdf8';
    hudCtx.font = '600 28px system-ui, sans-serif';
    hudCtx.fillText('Point controller at [↺ RESET] on the right to restart.', 80, 390);
  } else if (gameState === 'lost') {
    // Fail Badge
    hudCtx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    drawRoundedRect(hudCtx, 80, 60, 480, 54, 18);
    hudCtx.fill();
    hudCtx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    hudCtx.lineWidth = 2;
    hudCtx.stroke();

    hudCtx.fillStyle = '#f87171';
    hudCtx.font = 'bold 28px system-ui, sans-serif';
    hudCtx.textAlign = 'center';
    hudCtx.fillText('⚠️  SOP VIOLATION — FAILED', 320, 96);

    hudCtx.fillStyle = '#f8fafc';
    hudCtx.font = 'bold 64px system-ui, sans-serif';
    hudCtx.textAlign = 'left';
    hudCtx.fillText('TRAINING SEQUENCE FAILED', 80, 210);

    hudCtx.fillStyle = '#fca5a5';
    hudCtx.font = '500 32px system-ui, sans-serif';
    hudCtx.fillText(`Lives depleted. Correctly reached step ${stepIndex + 1} of ${PARTS.length}.`, 80, 275);

    hudCtx.fillStyle = '#fca5a5';
    hudCtx.font = '600 28px system-ui, sans-serif';
    hudCtx.fillText('Point controller at [↺ RESET] on the right to try again.', 80, 390);
  } else {
    // Step Badge
    hudCtx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    drawRoundedRect(hudCtx, 80, 56, 320, 50, 16);
    hudCtx.fill();
    hudCtx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    hudCtx.lineWidth = 2;
    hudCtx.stroke();

    hudCtx.fillStyle = '#38bdf8';
    hudCtx.font = 'bold 26px system-ui, sans-serif';
    hudCtx.textAlign = 'center';
    hudCtx.fillText(`● STEP ${stepIndex + 1} OF ${PARTS.length}`, 240, 90);

    // Segmented Progress Bar (11 segments)
    const segStart = 430;
    const segWidth = 65;
    const segGap = 8;
    for (let i = 0; i < PARTS.length; i++) {
      const sx = segStart + i * (segWidth + segGap);
      if (i < stepIndex) {
        hudCtx.fillStyle = '#10b981';
      } else if (i === stepIndex) {
        hudCtx.fillStyle = '#38bdf8';
      } else {
        hudCtx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      }
      drawRoundedRect(hudCtx, sx, 72, segWidth, 18, 9);
      hudCtx.fill();
    }

    // Target Component Title
    hudCtx.fillStyle = '#f8fafc';
    hudCtx.font = 'bold 62px system-ui, sans-serif';
    hudCtx.textAlign = 'left';
    hudCtx.fillText(PARTS[stepIndex].name, 80, 220);

    // Subtitle instruction
    hudCtx.fillStyle = '#94a3b8';
    hudCtx.font = '500 30px system-ui, sans-serif';
    hudCtx.fillText('Locate and select this piece from the table', 80, 280);

    // Lives Container (Bottom Left)
    hudCtx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    drawRoundedRect(hudCtx, 80, 350, 360, 84, 20);
    hudCtx.fill();
    hudCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    hudCtx.lineWidth = 2;
    hudCtx.stroke();

    hudCtx.fillStyle = '#94a3b8';
    hudCtx.font = 'bold 24px system-ui, sans-serif';
    hudCtx.textAlign = 'left';
    hudCtx.fillText('LIVES', 110, 400);

    // Hearts
    let heartsStr = '';
    for (let i = 0; i < lives; i++) heartsStr += '♥ ';
    for (let i = 0; i < LIVES - lives; i++) heartsStr += '♡ ';
    hudCtx.fillStyle = '#f43f5e';
    hudCtx.font = 'bold 36px system-ui, sans-serif';
    hudCtx.fillText(heartsStr.trim(), 210, 400);
  }

  hudTexture.needsUpdate = true;
}

const raycaster = new THREE.Raycaster();
const controllers = [];
const controllerModelFactory = new XRControllerModelFactory();

function setupController(index) {
  const controller = renderer.xr.getController(index);
  player.add(controller);

  // Modern glowing laser ray
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -5)]),
    new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
  );
  controller.add(line);
  controller.userData.line = line;
  controller.userData.hovered = null;

  // Pointer reticle ring
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.012, 0.018, 32),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
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

  controller.addEventListener('selectstart', () => onSelect(controller));
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
    scene.background = new THREE.Color(0x202028);
    renderer.setClearColor(0x202028, 1);
    floor.visible = true;
  }

  camera.position.set(0, 0, 0);
  camera.quaternion.identity();
});

renderer.xr.addEventListener('sessionend', () => {
  scene.background = new THREE.Color(0x202028);
  renderer.setClearColor(0x202028, 1);
  floor.visible = true;
  updateOrbitCamera();
});

function pickFromRay(origin, direction) {
  raycaster.ray.origin.copy(origin);
  raycaster.ray.direction.copy(direction);
  const targets = [...partsById.values()].filter((m) => m.visible && !m.userData.attached);
  if (resetBtn) targets.push(resetBtn);
  if (gameState !== 'playing' && hud) targets.push(hud);
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
      controller.userData.reticle.scale.setScalar(Math.max(0.4, hitData.distance * 0.4));
    }
    if (controller.userData.line) {
      controller.userData.line.scale.z = hitData.distance / 5;
    }
    return hitData.object;
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

let stepIndex = 0;
let lives = LIVES;
let gameState = 'playing';

function onSelect(controller) {
  const hit = controller.userData.hovered || pick(controller);
  if (hit) {
    handleTargetClick(hit);
  }
}

function handleTargetClick(target) {
  if (!target) return;
  if (target === resetBtn || (target === hud && gameState !== 'playing')) {
    resetGame();
    return;
  }
  if (gameState !== 'playing') return;
  if (target.userData && target.userData.part) {
    selectPart(target);
  }
}

function resetGame() {
  stepIndex = 0;
  lives = LIVES;
  gameState = 'playing';

  for (const part of PARTS) {
    const mesh = partsById.get(part.id);
    if (mesh) {
      mesh.userData.attached = false;
      scene.add(mesh);
      mesh.position.copy(table.position);
      mesh.position.x += part.tablePos[0];
      const halfH = part.shape === 'sphere' ? part.size[0] : (part.size[1] || 0.08) / 2;
      mesh.position.y += tableTopY + 0.02 + halfH;
      mesh.position.z += part.tablePos[2];
      mesh.rotation.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
      mesh.material.color.setHex(part.color);
      mesh.material.emissive.setHex(0x000000);

      if (mesh.userData.label) {
        mesh.userData.label.visible = true;
      }
    }
  }

  updateHUD();
}

function selectPart(target) {
  if (gameState !== 'playing' || !target) return;
  const part = target.userData.part;

  if (part.step === stepIndex + 1) {
    attachPart(target, part);
    stepIndex++;
    if (stepIndex >= PARTS.length) {
      gameState = 'won';
    }
  } else {
    lives--;
    flashRed(target);
    if (lives <= 0) gameState = 'lost';
  }
  updateHUD();
}

function attachPart(mesh, part) {
  mesh.userData.attached = true;
  if (mesh.userData.label) {
    mesh.userData.label.visible = false;
  }
  const anchor = new THREE.Vector3(...ANCHORS[part.anchor]);
  const offset = new THREE.Vector3(...part.mannequinOffset);
  mannequin.add(mesh);
  mesh.position.copy(anchor).add(offset);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.setScalar(0.9);
}

function flashRed(mesh) {
  const orig = mesh.material.color.getHex();
  mesh.material.color.setHex(0xff2222);
  setTimeout(() => mesh.material.color.setHex(orig), 400);
}

updateHUD();

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
      const move = new THREE.Vector3()
        .addScaledVector(forward, -y)
        .addScaledVector(right, x);
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

  // Orient all floating labels towards camera
  for (const label of labels) {
    if (label.visible) {
      label.quaternion.copy(camera.quaternion);
    }
  }

  if (renderer.xr.isPresenting) {
    for (const controller of controllers) {
      const hit = pick(controller);
      const prev = controller.userData.hovered;
      if (prev && prev !== hit) {
        if (prev.material && prev.material.emissive) {
          prev.material.emissive.setHex(0x000000);
        }
        controller.userData.hovered = null;
      }
      if (hit && hit !== prev) {
        controller.userData.hovered = hit;
      }
      if (controller.userData.hovered) {
        const h = controller.userData.hovered;
        if (h.material && h.material.emissive) {
          if (h.userData && h.userData.isReset) {
            h.material.emissive.setHex(0x551111);
          } else {
            h.material.emissive.setHex(0x333311);
          }
          h.material.emissiveIntensity = 1 + Math.sin(t * 6) * 0.5;
        }
      }
    }
  } else if (mouseHovered) {
    if (mouseHovered.material && mouseHovered.material.emissive) {
      mouseHovered.material.emissiveIntensity = 1 + Math.sin(t * 6) * 0.5;
    }
  }

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const mouse = new THREE.Vector2();
let mouseHovered = null;
let dragging = false;
let lastX = 0;
let lastY = 0;
const orbitTarget = new THREE.Vector3(0, 1.2, -1);
let orbitAngle = Math.PI;
let orbitElevation = 0.25;
let orbitDist = 3.4;

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

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (renderer.xr.isPresenting) return;
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
});

addEventListener('pointerup', () => (dragging = false));

renderer.domElement.addEventListener('pointermove', (e) => {
  if (renderer.xr.isPresenting) return;
  if (dragging) {
    orbitAngle -= (e.clientX - lastX) * 0.005;
    orbitElevation = Math.min(1.4, Math.max(-0.2, orbitElevation + (e.clientY - lastY) * 0.005));
    lastX = e.clientX;
    lastY = e.clientY;
    updateOrbitCamera();
    return;
  }
  updateMouseRay(e);
  const hitData = pickFromRay(raycaster.ray.origin, raycaster.ray.direction);
  const hit = hitData ? hitData.object : null;
  if (mouseHovered && mouseHovered !== hit) {
    if (mouseHovered.material && mouseHovered.material.emissive) {
      mouseHovered.material.emissive.setHex(0x000000);
    }
    mouseHovered = null;
  }
  if (hit && hit !== mouseHovered) {
    mouseHovered = hit;
    if (hit.material && hit.material.emissive) {
      hit.material.emissive.setHex(hit.userData?.isReset ? 0x551111 : 0x333311);
    }
  }
});

renderer.domElement.addEventListener('click', (e) => {
  if (renderer.xr.isPresenting) return;
  updateMouseRay(e);
  const hitData = pickFromRay(raycaster.ray.origin, raycaster.ray.direction);
  const hit = hitData ? hitData.object : null;
  handleTargetClick(hit);
});

renderer.domElement.addEventListener('wheel', (e) => {
  if (renderer.xr.isPresenting) return;
  orbitDist = Math.min(8, Math.max(1.2, orbitDist + e.deltaY * 0.002));
  updateOrbitCamera();
});
