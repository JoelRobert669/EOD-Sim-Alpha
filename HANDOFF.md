# EOD-Sim-Alpha — Project Handoff / Walkthrough

**Last updated:** 2026-08-21
**Repo:** https://github.com/JoelRobert669/EOD-Sim-Alpha
**Owner:** Joel (joelrobert669@gmail.com)

---

## 1. What this project is

A **WebXR training game for Meta Quest 3** that teaches the donning sequence of an EOD
bomb-disposal suit. The user stands in a room with a table of suit parts and a mannequin.
They must select parts **in the correct SOP order**; correct picks fly onto the mannequin,
wrong picks flash red and cost a life (3 lives). Win screen on completion, fail screen at 0 lives.

Target hardware: Meta Quest 3 (Meta Quest Browser). Desktop browser preview mode exists for testing.

## 2. Tech stack

- **Three.js** (^0.169) via npm — rendering + WebXR
- **Vite 5** — dev server & bundler, `@vitejs/plugin-basic-ssl` for HTTPS (required for WebXR)
- No framework, no build-time TS. Plain ES modules.
- Custom minimal VRButton (`src/vrbutton.js`) instead of three's example one.

## 3. How to run

```bash
npm install
npm run dev        # serves HTTPS on port 5173, --host exposes to LAN
```

- **PC preview:** open `https://localhost:5173` → accept self-signed cert warning
- **Quest 3:** same Wi-Fi → open `https://<PC-LAN-IP>:5173` in Quest Browser → accept cert → ENTER VR
- Alternative: `adb reverse tcp:5173 tcp:5173` then use `http://localhost:5173` on Quest

Server is often run in background:
```powershell
Start-Process -WindowStyle Hidden pwsh -ArgumentList '-Command', 'npm run dev *>> C:\AI\XR\vite.log'
```

## 4. File structure

```
index.html          entry page, ENTER VR button
vite.config.js      vite + basicSsl plugin
src/
  config.js         ALL game data: part list, order, colors, table positions,
                    anchor points, LIVES constant. EDIT THIS for gameplay changes.
  main.js           scene setup, table+mannequin builders (placeholder geometry),
                    controller ray picking, selection logic, HUD canvas panel,
                    locomotion, desktop mouse/orbit preview
  vrbutton.js       WebXR session entry button
public/models/      (future) GLTF/GLB files go here
HANDOFF.md          this file
```

## 5. Game rules implemented

- Correct order currently hardcoded in `src/config.js` PARTS array via `step` field:
  1. Cooling Suit → 2. Trousers → 3. Boots → 4. Grounding Straps → 5. Rear Panel A
  → 6. Front Panel B → 7. PEM → 8. Battery → 9. Speaker → 10. RCU → 11. Helmet
- **PENDING CLIENT CONFIRMATION** — order may change; it's just the `step` numbers in config.
- 3 lives (LIVES const in config.js). Wrong pick = red flash + lose life.
- Win when all parts attached; fail at 0 lives.

## 6. Controls

| Input | Action |
|---|---|
| Controller trigger | Select highlighted part |
| Left thumbstick | Smooth locomotion (2.2 m/s, head-relative) |
| Right thumbstick | Snap turn 30° |
| Physical walking | Works — scene anchored via local-floor |
| Mouse move/click (desktop) | Hover/select parts |
| Mouse drag / wheel (desktop) | Orbit / zoom camera |

## 7. Current state (as of this doc)

DONE:
- Full game loop: pick → attach / wrong → life loss → win/fail screens
- Placeholder primitive shapes for all 11 parts (colored boxes/spheres etc.)
- Procedural placeholder mannequin + table
- In-VR HUD panel (step name + hearts), win/fail states
- Desktop mouse preview mode
- Thumbstick locomotion + snap turn
- HTTPS dev server working on Quest

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
