"""Export the user-provided Pioneer assembly without changing the .blend source.

blender --background SOURCE.blend --python tools/export_pioneer_blend.py -- OUTPUT.glb [SCENE]

SCENE defaults to "Pioneer • assembled". With "Pioneer • LED + ESP32" the ESP32 module
(05D) is exported as its own esp32_module node, plugged into the optical-flow
board's headers; the simulator shows it while a Python script runs.
The simulator uses Z-up and twice real-world scale, matching its existing CAD model.
"""
import bpy
import hashlib
import json
import re
import sys
from pathlib import Path
from mathutils import Matrix, Vector

args = sys.argv[sys.argv.index('--') + 1:]
output = Path(args[0]).resolve()
scene_name = args[1] if len(args) > 1 else 'Pioneer • assembled'
source = Path(bpy.data.filepath)
scene = bpy.data.scenes[scene_name]
bpy.context.window.scene = scene
allowed = {c for c in scene.collection.children
           if not c.hide_render and re.match(r'0[1-7]', c.name)}
objects = [o for o in scene.objects if o.type in {'MESH', 'CURVE', 'FONT'}
           and not o.hide_render and any(c in allowed for c in o.users_collection)]
# Sub-millimetre bevels on electronic components do not need studio tessellation.
# Only this in-memory export copy is changed; never save the source file.
for obj in objects:
    for modifier in obj.modifiers:
        if modifier.type == 'BEVEL':
            modifier.segments = 1
            if max(obj.dimensions) < 0.015:
                modifier.show_viewport = False
        elif modifier.type == 'SUBSURF':
            modifier.levels = 1
    if obj.type in {'CURVE', 'FONT'}:
        obj.data.resolution_u = 4
        obj.data.bevel_resolution = min(obj.data.bevel_resolution, 2)
# Web budget. The source is a reference-grade model (~950k triangles, 30 MB as glTF); a viewer needs far less:
#  * printed text on the boards (legends, brand marks, revision stamps) is sub-millimetre and unreadable at simulator scale;
#  * the heaviest remaining parts (motors, scanned frame, connectors) are decimated to a few thousand triangles each.
# Only these in-memory copies change; the .blend is never saved.
TEXT_LIKE = re.compile(r'legend|brand|revision|identification|engraving|silk|label|logo|marking|stamp', re.I)
DECIMATE_ABOVE = 1200

def triangle_count(obj, graph):
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(graph), depsgraph=graph)
    try:
        return sum(len(poly.vertices) - 2 for poly in mesh.polygons)
    finally:
        bpy.data.meshes.remove(mesh)

bpy.context.view_layer.update()
_graph = bpy.context.evaluated_depsgraph_get()
_kept, _dropped = [], 0
for obj in objects:
    tris = triangle_count(obj, _graph) if obj.type in {'MESH', 'CURVE', 'FONT'} else 0
    if tris > 1500 and TEXT_LIKE.search(obj.name) and not obj.name.startswith(('ESP32 • convex', 'ESP32 • camera')):
        _dropped += tris
        continue
    if obj.type == 'MESH' and tris > DECIMATE_ABOVE:
        decimate = obj.modifiers.new('web decimate', 'DECIMATE')
        decimate.decimate_type = 'COLLAPSE'
        decimate.ratio = max(0.22, DECIMATE_ABOVE / tris)
        decimate.use_collapse_triangulate = True
    _kept.append(obj)
objects = _kept
bpy.context.view_layer.update()
depsgraph = bpy.context.evaluated_depsgraph_get()
# The feet are measured on the real vertices of the evaluated geometry (modifiers applied): object bounds can
# be a little off for beveled or curve-based parts.
import numpy as np

def lowest_z(obj):
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph), depsgraph=depsgraph)
    try:
        if not mesh.vertices:
            return None
        co = np.empty(len(mesh.vertices) * 3, dtype=np.float64)
        mesh.vertices.foreach_get('co', co)
        co = co.reshape(-1, 3)
        row = np.array(obj.matrix_world[2])
        return float((co @ row[:3]).min() + row[3])
    finally:
        bpy.data.meshes.remove(mesh)

bottom = min(z for z in (lowest_z(o) for o in objects) if z is not None)
transform = Matrix.Diagonal((2.0, 2.0, 2.0, 1.0))
transform.translation.z = -bottom * 2
centers = [transform @ bpy.data.objects[f'Rotor {i} • rotate local Z'].matrix_world.translation
           for i in (1, 3, 2, 4)]  # CW diagonal, then CCW diagonal (simulator convention).
motor_indices = {1: 0, 3: 1, 2: 2, 4: 3}
export_scene = bpy.data.scenes.new('Pioneer simulator export')
groups = {}

def group(name, position=None):
    obj = bpy.data.objects.new(name, None)
    export_scene.collection.objects.link(obj)
    if position is not None:
        obj.location = position
    groups[name] = obj
    return obj

group('frame')
motors = group('motors_group')
for i, center in enumerate(centers):
    group(f'rotor_{i}', center).parent = motors
for i in range(4):
    group(f'base_led_{i}')
# Optional accessory board (05B): plugs onto the autopilot's X8/X9 headers.
# Present only when the source .blend has the LED module collection.
led_module = group('led_module')
for i in range(25):
    group(f'module_led_{i}').parent = led_module
# ESP32 camera module (05D): plugs into the optical-flow board's white headers.
# Its node sits at the module's own centre so the simulator can slide it in and
# out along Z; esp32_camera marks the lens (the Python camera looks from there).
esp32_parts = [o for o in objects if o.name.startswith('ESP32 • ')]
if esp32_parts:
    corners = [transform @ o.matrix_world @ Vector(c) for o in esp32_parts for c in o.bound_box]
    esp32_center = sum(corners, Vector()) / len(corners)
    lens = (next((o for o in esp32_parts if o.name.startswith('ESP32 • convex front lens')), None)
            or next((o for o in esp32_parts if 'camera glass' in o.name), None))
    lens_center = (sum((transform @ lens.matrix_world @ Vector(c) for c in lens.bound_box), Vector()) / 8
                   if lens else esp32_center)
else:
    esp32_center = Vector()
    lens_center = None
group('esp32_module', esp32_center)
if lens_center is not None:
    group('esp32_camera', lens_center)

buckets = {}
source_counts = {}
for original in objects:
    name = original.name
    bucket = 'frame'
    match = re.match(r'Propeller (\d)', name)
    bell = re.match(r'Motor (\d) • (bell lower ring|top cap|shaft)', name)
    rib = re.match(r'M(\d) bell rib', name)
    rotating = match or bell or rib
    module_pixel = re.match(r'LED • WS2812B (emitter die|clear lens)\.r(\d+)c(\d+)', name)
    if rotating:
        bucket = f'rotor_{motor_indices[int(rotating[1])]}'
    elif module_pixel:
        # Light-emitting surfaces of the LED module (5x5), row-major from the top-left.
        row, col = int(module_pixel[2]), int(module_pixel[3])
        bucket = f'module_led_{row * 5 + col}'
    elif name.startswith('ESP32 • '):
        bucket = 'esp32_module'
    elif name.startswith('LED • '):
        # Everything else on the module (PCB, connectors, mounting, silkscreen)
        # stays static, merged with the rest of the module's own group.
        bucket = 'led_module'
    elif re.match(r'AP • (underside )?LED\d (RGB emitter \d|clear recessed encapsulant)', name):
        # Revised autopilot (Oct 2026): each LED is a reflector with three emitters under a clear encapsulant.
        center = sum((original.matrix_world @ Vector(c) for c in original.bound_box), Vector()) / 8
        index = (2 if center.x < 0 else 3) if 'underside' in name else (1 if center.x < 0 else 0)
        bucket = f'base_led_{index}'
    elif 'WS2812B' in name and ('transparent window' in name or 'RGB die' in name):
        center = sum((original.matrix_world @ Vector(c) for c in original.bound_box), Vector()) / 8
        # Upper right, upper left, underside left, underside right.
        index = (2 if center.x < 0 else 3) if 'underside' in name else (1 if center.x < 0 else 0)
        bucket = f'base_led_{index}'
    evaluated = original.evaluated_get(depsgraph)
    mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=depsgraph)
    local = groups[bucket].matrix_basis.inverted() @ transform @ original.matrix_world
    mesh.transform(local)
    # Negative transforms can occur on the mirrored underside electronics.
    if local.determinant() < 0:
        mesh.flip_normals()
    copy = bpy.data.objects.new(name, mesh)
    export_scene.collection.objects.link(copy)
    copy.parent = groups[bucket]
    buckets.setdefault(bucket, []).append(copy)
    source_counts[bucket] = source_counts.get(bucket, 0) + 1

# The revised autopilot model carries only the two top LEDs. The real board has two more on the underside, mirrored
# through the PCB mid-plane (top surface 88.6 mm, underside 87.0 mm in the source), so they are rebuilt from the top ones:
# emitters go to channels 2 (left) and 3 (right), the reflectors stay with the frame.
PCB_MID_Z = 0.0878
MIRROR_Z = Matrix.Translation((0, 0, 2 * PCB_MID_Z)) @ Matrix.Diagonal((1.0, 1.0, -1.0, 1.0))
for original in objects:
    top_led = re.match(r'AP • LED\d (.+)', original.name)
    if not top_led:
        continue
    emissive = bool(re.match(r'(RGB emitter \d|clear recessed encapsulant)', top_led[1]))
    center = sum((original.matrix_world @ Vector(c) for c in original.bound_box), Vector()) / 8
    bucket = (f'base_led_{2 if center.x < 0 else 3}') if emissive else 'frame'
    evaluated = original.evaluated_get(depsgraph)
    mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=depsgraph)
    local = groups[bucket].matrix_basis.inverted() @ transform @ MIRROR_Z @ original.matrix_world
    mesh.transform(local)
    if local.determinant() < 0:
        mesh.flip_normals()
    copy = bpy.data.objects.new(original.name.replace('AP • LED', 'AP • underside LED'), mesh)
    export_scene.collection.objects.link(copy)
    copy.parent = groups[bucket]
    buckets.setdefault(bucket, []).append(copy)
    source_counts[bucket] = source_counts.get(bucket, 0) + 1

bpy.context.window.scene = export_scene
# Batch static electronics by material instead of shipping ~1400 draw-call objects.
for bucket, parts in buckets.items():
    bpy.ops.object.select_all(action='DESELECT')
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    parts[0].name = bucket + '_mesh'

# Final guard: measure the lowest point of what is actually exported and put the feet exactly on z=0.
bpy.context.view_layer.update()
floor_z = min(
    float((np.array([(o.matrix_world @ v.co) for v in o.data.vertices])[:, 2]).min())
    for o in export_scene.objects if o.type == 'MESH' and len(o.data.vertices)
)
if abs(floor_z) > 1e-7:
    for obj in export_scene.objects:
        if obj.parent is None:
            obj.location.z -= floor_z
    centers = [c - Vector((0, 0, floor_z)) for c in centers]
    bpy.context.view_layer.update()

output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB',
    use_active_scene=True, export_yup=False, export_animations=False,
    export_cameras=False, export_lights=False, export_extras=False,
    export_texcoords=False)  # the model has no textures: UVs only add 16 bytes per vertex
report = {
    'source_file': source.name,
    'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'output_sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
    'coordinate_system': 'Z-up; 2 scene units per physical metre; feet at z=0',
    'web_optimization': 'Static parts merged; small-component bevels omitted; propeller subdivision level 1',
    'source_objects_by_group': source_counts,
    'rotor_centers': [list(c) for c in centers],
    'led_order': ['upper right', 'upper left', 'underside left', 'underside right'],
    'source_scene': scene_name,
    'esp32_camera': list(lens_center) if lens_center is not None else None,
    'provenance': 'User-provided Blender reconstruction; original rights retained; no new license assigned',
}
output.with_suffix('.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('PIONEER_EXPORT', json.dumps(report, ensure_ascii=False))
