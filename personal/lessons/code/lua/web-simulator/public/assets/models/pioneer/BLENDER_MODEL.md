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
- `led_module`: the optional 05B accessory board (plugs onto the autopilot's
  X8/X9 headers), present only when the source `.blend` has that collection.
- `module_led_0` .. `module_led_24`: the board's 5×5 pixels, row-major from
  the top-left (`index = row * 5 + col`), each holding that pixel's emitter
  dies and lens. Everything else on the board (PCB, connectors, mounting,
  silkscreen) is merged into `led_module` itself as static geometry.

Left/right refers to the source model's X axis. LED package bodies stay part
of the frame; the windows and dies receive individually cloned emissive
materials at runtime. Geometry is shared between drone instances.

When the source `.blend` has no LED module collection, `led_module` is an
empty node and the simulator falls back to its synthetic teaching matrix
(`led_matrix_group` / `matrix_led_N`), shown as an optional module above the
board whenever a program lights a pixel past index 3. Once the asset does
provide a real module, `attachBlenderModel` prefers it and removes the
synthetic one. Both are hidden until a program actually calls
`Ledbar.new(count)` with `count > 4` and lights a pixel — see
`updateLEDs()` in `drone-model/index.ts`. The legacy CAD assembly is used
only if the GLB fails to load. Export tools must await
`whenDroneModelReady()` before exporting the new model.

To regenerate (replace the source path with the local `.blend` path):

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe' --background 'SOURCE.blend' --python tools/export_pioneer_blend.py -- public/assets/models/pioneer/pioneer-basic.glb
```

Regression checks are in `tests/pioneer-blender-model.test.ts`; they load the
actual GLB to check scale, ground alignment, rotor pivots, material isolation,
and stable rotor references during asynchronous loading.
