# 3D Model Assets (GLTF / GLB)

Drop your Blender `.glb` export files directly into this folder!

## Supported Options:

### Option 1: Master `stage.glb` (Recommended)
Export all your modeled suit parts in a single `stage.glb` file.
Name the objects in Blender using the `PART_` prefix:
- `PART_cooling`
- `PART_trousers`
- `PART_boots`
- `PART_grounding`
- `PART_rearPanel`
- `PART_frontPanel`
- `PART_pem`
- `PART_battery`
- `PART_speaker`
- `PART_rcu`
- `PART_helmet`

The engine will automatically extract each part and hotswap it onto the holographic grid slots and the mannequin!

### Option 2: Individual GLB files
You can also drop individual `.glb` files named after the part IDs:
`cooling.glb`, `trousers.glb`, `helmet.glb`, etc.
