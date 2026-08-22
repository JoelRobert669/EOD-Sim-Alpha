# EOD-Sim-Alpha — Project Handoff / Walkthrough

**Last updated:** 2026-08-21
**Repo:** https://github.com/JoelRobert669/EOD-Sim-Alpha
**Owner:** Joel (joelrobert669@gmail.com)

---

## 1. What this project is

A **WebXR training simulation for Meta Quest 3** that teaches the donning sequence of an EOD
bomb-disposal suit. The user stands in front of a **floating high-tech blue holographic grid** (11 numbered slots)
and a mannequin. The 11 suit components appear **jumbled** across the slots. The user re-orders the components
via **drag-and-drop / slot swapping**. When an item is placed into its correct slot (1 through 11), it
**dynamically reflects on the mannequin in real time**. When all 11 slots are correctly matched, the mannequin
is 100% equipped and victory is achieved. No lives penalty.

Target hardware: Meta Quest 3 (Meta Quest Browser). Mixed Reality Passthrough & VR modes. Desktop browser preview mode.

## 2. Tech stack

- **Three.js** (^0.169) via npm — rendering + WebXR (MR Passthrough `immersive-ar` + `immersive-vr`)
- **Vite 5** — dev server & bundler, `@vitejs/plugin-basic-ssl` for HTTPS (required for WebXR)
- No framework, no build-time TS. Plain ES modules.
- Custom modern glassmorphic `XRButton` (`src/xrbutton.js`).

## 3. How to run

```bash
npm install
npm run dev        # serves HTTPS on port 5173, --host exposes to LAN
```

- **PC preview:** open `https://localhost:5173` → accept self-signed cert warning
- **Quest 3:** same Wi-Fi → open `https://<PC-LAN-IP>:5173` in Quest Browser → accept cert → ENTER MR / VR
- Alternative: `adb reverse tcp:5173 tcp:5173` then use `http://localhost:5173` on Quest

## 4. File structure

```
index.html          entry page
vite.config.js      vite + basicSsl plugin
src/
  config.js         PARTS list, 11 SLOT_POSITIONS, targetSlot indices, anchor points
  main.js           holographic grid platform, 11 slot pads, drag-and-drop swap logic,
                    dynamic mannequin reflection, high-DPI glassmorphism HUD, VR controllers
  xrbutton.js       modern glassmorphic MR Passthrough & VR launcher card
  vrbutton.js       re-exports XRButton & VRButton
public/models/      (future) GLTF/GLB files go here
HANDOFF.md          this file
```

## 5. Game rules implemented

- 11 Numbered Hologram Slots on the floating grid (Slots 01 → 11).
- Target sequence:
  1. Cooling Suit → 2. Trousers (C) → 3. PEM into Trousers (J) → 4. Helmet & Visor (I)
  → 5. Rear Jacket Panel (A) → 6. Front Jacket Panel (B) → 7. Grounding Straps (F)
  → 8. Foot Protection (D) → 9. RCU into Left Arm (K) → 10. Suit Speaker into Right Arm (N) → 11. Battery Pack behind (M)
- **Jumbled Start:** Items start randomly shuffled across the 11 slots.
- **Drag & Drop / Swap:** Grabbing and dropping an item onto another slot swaps the two items.
- **Real-time Mannequin Reflection:** An item appears equipped on the mannequin *if and only if* it is in its correct slot number.
- **No Life Loss:** Free experimentation and re-ordering without penalties.
- **Victory:** Triggered when all 11 slots are verified ($11/11$).
- **Reset:** `[↺ SHUFFLE]` button re-randomizes the grid for a new trial.

## 6. Controls

| Input | Action |
|---|---|
| Controller trigger (press & hold) | Grab and drag highlighted part |
| Controller trigger (release) | Drop & swap into target slot / item |
| Left thumbstick | Smooth locomotion (2.2 m/s, head-relative) |
| Right thumbstick | Snap turn 30° |
| Physical walking | Works — scene anchored via local-floor |
| Mouse drag / click (desktop) | Drag & drop parts to swap, or click-to-select then click-to-swap |
| Mouse drag background / wheel | Orbit / zoom preview camera |

## 7. Current state (as of this doc)

DONE:
- High-tech floating blue holographic grid with glowing neon edges (no legs).
- 11 holographic numbered slot pads with live status indicators (`✓ VERIFIED` / standby).
- Drag-and-drop with automatic slot swapping (WebXR laser + Desktop mouse).
- Jumbled shuffle initialization and `[↺ SHUFFLE]` button.
- Dynamic mannequin reflection: parts equip/unequip in real time based on slot accuracy.
- High-DPI glassmorphic in-XR HUD with live progress tracker & segmented capsule bar.
- Mixed Reality (Passthrough MR) and VR dual support with glassmorphic launcher.
- Distance-adaptive VR laser reticles.

NOT DONE / ROADMAP:
1. **Swap placeholders for real GLTF models** (client preparing in Blender)
   - Use THREE.GLTFLoader, load from /public/models/
   - Match by naming convention below
2. **Blender-driven scene**: client builds master .blend (room/table/mannequin/parts),
   exports stage.glb; app should load it and map objects by name instead of procedural builders
   - Consider auto-export watch script (blender CLI --python export on .blend save)
3. Confirm final SOP order with client → update config.js step values
4. Audio feedback (correct/wrong sounds)
5. Score/timing tracking, restart flow after win/fail (currently must reload page)
6. Deploy somewhere with valid HTTPS (GitHub Pages won't do WebXR over custom... actually
   GitHub Pages IS https so WebXR works; consider deploying dist/ there)

## 8. Blender naming convention (agreed with client)

Client knows Blender; will prepare GLTF files using this convention:

- Parts (interactive): `PART_cooling`, `PART_trousers`, `PART_boots`, `PART_grounding`,
  `PART_rearPanel`, `PART_frontPanel`, `PART_pem`, `PART_battery`, `PART_speaker`,
  `PART_rcu`, `PART_helmet`
- Anchors (Empties parented to mannequin): `ANCHOR_head`, `ANCHOR_chestFront`,
  `ANCHOR_chestBack`, `ANCHOR_back`, `ANCHOR_torso`, `ANCHOR_waist`, `ANCHOR_hips`, `ANCHOR_feet`
- Mannequin: `MANNEQUIN_root` parent + `MANNEQUIN_head`, `_torso`, `_hips`, `_arm_L/R`,
  `_leg_L/R`, `_foot_L/R`
- Table: `TABLE_root` + `TABLE_top`, `TABLE_leg_1..4`
- Static env: `ENV_*` prefix
- Lights: only `LIGHT_sun` directional survives glTF well; bake or emissive otherwise
- Rules: case-sensitive names, apply transforms before export, object origin = attachment point,
  one material per part named `MAT_<part>`

## 9. Key implementation notes for whoever continues

- **Player rig:** `player` Group contains the camera. Locomotion moves/rotates `player`,
  NOT the world. World objects (table/mannequin/HUD) stay at scene root = room-locked.
- **Picking:** raycast from controller world pos/dir against visible non-attached part meshes.
  Desktop uses same `pickFromRay()` with camera ray.
- **Attaching:** `attachPart()` re-parents mesh to `mannequin` group at anchor+offset from config.
  When switching to GLTF anchors, read ANCHOR_ empties' world positions instead of config ANCHORS.
- **HUD:** 2D canvas texture on a plane at y=2.2 facing spawn. `updateHUD()` redraws.
- **Hover highlight:** emissive color pulse on hovered mesh; reset to black on unhover.
- Known quirk: after win/fail there's no restart button — reload the page (browser back/forward).
- Known quirk: snap turn rotates around head position; cooldown 0.25s.

## 10. Git workflow

- Branch: main, push directly (solo project)
- Commit style: short imperative summaries
- Identity configured repo-local: joelrobert669 <joelrobert669@gmail.com>
- GitHub auth: Git Credential Manager popup (account JoelRobert669); stale creds for
  "plutopass11-ship-it" were deleted from Windows Credential Manager once already —
  if push says denied to that account again, delete `git:https://github.com` entries in cmdkey.
