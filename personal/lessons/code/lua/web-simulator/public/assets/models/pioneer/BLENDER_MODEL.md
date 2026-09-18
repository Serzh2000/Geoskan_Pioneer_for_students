# Pioneer Basic in the simulator

`pioneer-basic.glb` is exported from the user-provided
`Geoscan_Pioneer/Geoscan_Pioneer_Basic.blend`, scene `Pioneer • assembled`.
The source `.blend` is not modified. Source and output hashes and ownership
information are recorded in `pioneer-basic.json`.

The export uses the simulator's Z-up axes and existing enlarged scale
(2 scene units per physical metre), with the feet at z=0. Studio objects,
reference photos, and archived versions of parts are excluded. Static parts
are combined by material; tiny component bevels are omitted for browser use.

- `frame`: fixed assembly, motor mounts, stators, and wires.
- `rotor_0` / `rotor_1`: opposite CW propellers, including bells and shafts.
- `rotor_2` / `rotor_3`: opposite CCW propellers, including bells and shafts.
- `base_led_0` / `base_led_1`: upper right / upper left luminous surfaces.
- `base_led_2` / `base_led_3`: underside left / underside right luminous surfaces.

Left/right refers to the source model's X axis. LED package bodies stay part
of the frame; the windows and dies receive individually cloned emissive
materials at runtime. Geometry is shared between drone instances.

The Basic model has no 5×5 matrix. The simulator retains its teaching matrix
as an optional module above the board, visible when any matrix pixel is on.
The legacy CAD assembly is used only if the GLB fails to load. Export tools
must await `whenDroneModelReady()` before exporting the new model.

To regenerate (replace the source path with the local `.blend` path):

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe' --background 'SOURCE.blend' --python tools/export_pioneer_blend.py -- public/assets/models/pioneer/pioneer-basic.glb
```

Regression checks are in `tests/pioneer-blender-model.test.ts`; they load the
actual GLB to check scale, ground alignment, rotor pivots, material isolation,
and stable rotor references during asynchronous loading.
