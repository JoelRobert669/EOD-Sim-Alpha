import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { LIVES, PARTS, ANCHORS } from './config.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202028);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 100);
camera.position.set(0, 1.6, 2.2);

const player = new THREE.Group();
player.add(camera);
scene.add(player);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

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

const tableTopY = 0.9;
const table = new THREE.Group();
table.position.set(0, 0, -0.6);
scene.add(table);

const top = new THREE.Mesh(
  new THREE.BoxGeometry(2.6, 0.05, 1.6),
  new THREE.MeshStandardMaterial({ color: 0x6b4f35 })
);
top.position.y = tableTopY;
table.add(top);
for (const [lx, lz] of [[-1.2, -0.7], [1.2, -0.7], [-1.2, 0.7], [1.2, 0.7]]) {
  const leg = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, tableTopY, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x553f2a })
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
    new THREE.MeshStandardMaterial({ color: part.color })
  );
  mesh.userData.part = part;
  mesh.position.copy(table.position);
  mesh.position.x += part.tablePos[0];
  mesh.position.y += tableTopY + 0.03 + part.size[1] / 2;
  mesh.position.z += part.tablePos[2];
  scene.add(mesh);
  partsById.set(part.id, mesh);
}

const raycaster = new THREE.Raycaster();
const controllers = [];
const controllerModelFactory = new XRControllerModelFactory();

function setupController(index) {
  const controller = renderer.xr.getController(index);
  player.add(controller);

  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -5)]),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
  );
  controller.add(line);
  controller.userData.line = line;
  controller.userData.hovered = null;

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
  camera.position.set(0, 0, 0);
  camera.quaternion.identity();
});

renderer.xr.addEventListener('sessionend', () => {
  updateOrbitCamera();
});

function pickFromRay(origin, direction) {
  raycaster.ray.origin.copy(origin);
  raycaster.ray.direction.copy(direction);
  const meshes = [...partsById.values()].filter((m) => m.visible && !m.userData.attached);
  const hits = raycaster.intersectObjects(meshes, false);
  return hits.length ? hits[0].object : null;
}

const _tempOrigin = new THREE.Vector3();
const _tempDir = new THREE.Vector3();
const _tempQuat = new THREE.Quaternion();

function pick(controller) {
  controller.getWorldPosition(_tempOrigin);
  controller.getWorldQuaternion(_tempQuat);
  _tempDir.set(0, 0, -1).applyQuaternion(_tempQuat);
  return pickFromRay(_tempOrigin, _tempDir);
}

let stepIndex = 0;
let lives = LIVES;
let gameState = 'playing';

function onSelect(controller) {
  if (gameState !== 'playing') return;
  const hit = controller.userData.hovered || pick(controller);
  if (hit) {
    selectPart(hit);
  }
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

const hudCanvas = document.createElement('canvas');
hudCanvas.width = 1024;
hudCanvas.height = 256;
const hudCtx = hudCanvas.getContext('2d');
const hudTexture = new THREE.CanvasTexture(hudCanvas);
const hud = new THREE.Mesh(
  new THREE.PlaneGeometry(1.6, 0.4),
  new THREE.MeshBasicMaterial({ map: hudTexture, transparent: true })
);
hud.position.set(0, 2.2, -2.6);
scene.add(hud);

function updateHUD() {
  hudCtx.clearRect(0, 0, 1024, 256);
  hudCtx.fillStyle = 'rgba(0,0,0,0.65)';
  hudCtx.fillRect(0, 0, 1024, 256);
  hudCtx.textAlign = 'center';
  if (gameState === 'won') {
    hudCtx.fillStyle = '#44ff66';
    hudCtx.font = 'bold 72px sans-serif';
    hudCtx.fillText('SUIT COMPLETE — WELL DONE', 512, 150);
  } else if (gameState === 'lost') {
    hudCtx.fillStyle = '#ff4444';
    hudCtx.font = 'bold 72px sans-serif';
    hudCtx.fillText('TRAINING FAILED', 512, 110);
    hudCtx.fillStyle = '#ffffff';
    hudCtx.font = '40px sans-serif';
    hudCtx.fillText(`Reached step ${stepIndex + 1} of ${PARTS.length}`, 512, 180);
  } else {
    hudCtx.fillStyle = '#ffffff';
    hudCtx.font = 'bold 52px sans-serif';
    hudCtx.fillText(`Step ${stepIndex + 1}/${PARTS.length}: ${PARTS[stepIndex].name}`, 512, 100);
    hudCtx.font = '44px sans-serif';
    hudCtx.fillText('Lives: ' + '\u2665'.repeat(lives) + '\u2661'.repeat(LIVES - lives), 512, 190);
  }
  hudTexture.needsUpdate = true;
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

  if (renderer.xr.isPresenting) {
    for (const controller of controllers) {
      const hit = pick(controller);
      const prev = controller.userData.hovered;
      if (prev && prev !== hit) {
        prev.material.emissive.setHex(0x000000);
        controller.userData.hovered = null;
      }
      if (hit && hit !== prev) {
        controller.userData.hovered = hit;
      }
      if (controller.userData.hovered) {
        controller.userData.hovered.material.emissive.setHex(0x333311);
        controller.userData.hovered.material.emissiveIntensity = 1 + Math.sin(t * 6) * 0.5;
      }
    }
  } else if (mouseHovered) {
    mouseHovered.material.emissiveIntensity = 1 + Math.sin(t * 6) * 0.5;
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
  const hit = pickFromRay(raycaster.ray.origin.clone(), raycaster.ray.direction.clone());
  if (mouseHovered && mouseHovered !== hit) {
    mouseHovered.material.emissive.setHex(0x000000);
    mouseHovered = null;
  }
  if (hit && hit !== mouseHovered) {
    mouseHovered = hit;
    hit.material.emissive.setHex(0x333311);
  }
});

renderer.domElement.addEventListener('click', (e) => {
  if (renderer.xr.isPresenting) return;
  updateMouseRay(e);
  const hit = pickFromRay(raycaster.ray.origin.clone(), raycaster.ray.direction.clone());
  selectPart(hit);
});

renderer.domElement.addEventListener('wheel', (e) => {
  if (renderer.xr.isPresenting) return;
  orbitDist = Math.min(8, Math.max(1.2, orbitDist + e.deltaY * 0.002));
  updateOrbitCamera();
});
