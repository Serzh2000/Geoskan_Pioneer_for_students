"""Export the Pioneer Mini 2 reconstruction for the simulator without changing the .blend source.

blender --background Pioneer_Mini_2_reworked.blend --python tools/export_mini2_blend.py -- OUTPUT.glb

Source: "Пионер мини 2/Blender/revision_2/Pioneer_Mini_2_reworked.blend" (visual reconstruction from photos, scale
estimated). Only collections 01-07 (the drone itself) are exported; the studio (08) and the packed reference photos (09)
are not. The .blend is never saved: every simplification below changes in-memory copies only.

Conventions are the same as pioneer-basic.glb (tools/export_pioneer_blend.py):
  * Z up, 2 scene units per physical metre, the lowest exported vertex exactly on z=0;
  * forward is +Y. The source looks along -Y (lens at Y=-43 mm), so it is turned 180 degrees about Z;
  * rotor_0..rotor_3 stand at the same corners as the Basic model's rotors: 0 front-right (+X+Y), 1 back-left (-X-Y),
    2 front-left (-X+Y), 3 back-right (+X-Y); each rotor node sits on its motor axis, so rotating it about local Z
    spins the propeller.

Nodes:
  frame              everything static
  motors_group       parent of rotor_0..rotor_3 (propeller hub, cap and blades)
  base_led_0/1       the two amber front indicators: 0 = the drone's left, 1 = the drone's right
  camera_gimbal      pivot on the camera's tilt axis (lateral, X) with the camera housing and lens;
                     fpv_lens (empty) marks the centre of the front glass inside it
  bottom_camera_mount  empty under the body where the downward (optical-flow) camera looks from
"""
import bpy
import hashlib
import json
import math
import re
import sys
from pathlib import Path

import numpy as np
from mathutils import Matrix, Vector

args = sys.argv[sys.argv.index('--') + 1:]
output = Path(args[0]).resolve()
source = Path(bpy.data.filepath)
ROOT_NAME = 'PIONEER MINI 2 • revised assembly'
scene = next(s for s in bpy.data.scenes if ROOT_NAME in s.objects)
bpy.context.window.scene = scene

allowed = {c for c in scene.collection.children if not c.hide_render and re.match(r'0[1-7]', c.name)}


def in_allowed(obj):
    return any(c in allowed or any(c.name in p.children for p in allowed) for c in obj.users_collection)


# Too small to see at simulator scale (a USB-C port is 9 x 3 mm), or hidden inside the motor bells.
DROP = re.compile(r'USB-C .* (contact|retention spring|shell seam|dielectric tongue)|interior winding')
CAMERA_PART = re.compile(r'V2 • (camera internal mount|lens barrel|lens focus knurl|lens face ring|'
                         r'inset optical surround|coated front glass)')
candidates = [o for o in scene.objects if o.type in {'MESH', 'CURVE', 'FONT'} and not o.hide_render and in_allowed(o)]
objects = [o for o in candidates if not DROP.search(o.name)]
dropped_names = sorted(o.name for o in candidates if DROP.search(o.name))

# Web budget: the source is a ~150k triangle studio model; the simulator draws every drone several times a frame
# (main pass, sun shadow, camera windows). Bevels become single chamfers (none on millimetre parts), subdivision one
# level, curves coarser, and every part is then decimated to a budget that depends on how much of it can be seen.
def budget(obj):
    size = max(obj.dimensions)
    if re.search(r'guard rim|inward lip', obj.name):
        return 1100      # the long thin guard rings: their silhouette is most of the drone's outline
    if re.search(r'white cover|bottom shell', obj.name):
        return 1600      # the body seen from the chase camera
    if ' blade ' in obj.name:
        return 420
    if size < 0.006:
        return 48
    if size < 0.016:
        return 160
    return 380


for obj in objects:
    size = max(obj.dimensions)
    for modifier in obj.modifiers:
        if modifier.type == 'BEVEL':
            modifier.segments = min(modifier.segments, 2 if size > 0.03 else 1)
            if size < 0.006:
                modifier.show_viewport = modifier.show_render = False
        elif modifier.type == 'SUBSURF':
            modifier.levels = min(modifier.levels, 1)
            modifier.render_levels = modifier.levels
    if obj.type == 'CURVE':
        obj.data.resolution_u = min(obj.data.resolution_u, 4)
        obj.data.bevel_resolution = 0
    elif obj.type == 'FONT':
        obj.data.resolution_u = 2
        obj.data.bevel_resolution = 0


def evaluated_mesh(obj, graph):
    return bpy.data.meshes.new_from_object(obj.evaluated_get(graph), depsgraph=graph)


def triangle_count(obj, graph):
    mesh = evaluated_mesh(obj, graph)
    try:
        return sum(len(p.vertices) - 2 for p in mesh.polygons)
    finally:
        bpy.data.meshes.remove(mesh)


bpy.context.view_layer.update()
graph = bpy.context.evaluated_depsgraph_get()
source_triangles = 0
for obj in objects:
    tris = triangle_count(obj, graph)
    source_triangles += tris
    limit = budget(obj)
    if obj.type in {'MESH', 'CURVE', 'FONT'} and tris > limit * 1.15:
        decimate = obj.modifiers.new('web decimate', 'DECIMATE')
        decimate.decimate_type = 'COLLAPSE'
        decimate.ratio = max(0.04, limit / tris)
        decimate.use_collapse_triangulate = True
bpy.context.view_layer.update()
depsgraph = bpy.context.evaluated_depsgraph_get()
heaviest = sorted(((triangle_count(o, depsgraph), o.name) for o in objects), reverse=True)[:30]


def world_vertices(obj):
    mesh = evaluated_mesh(obj, depsgraph)
    try:
        co = np.empty(len(mesh.vertices) * 3, dtype=np.float64)
        mesh.vertices.foreach_get('co', co)
        co = co.reshape(-1, 3)
        m = np.array(obj.matrix_world)
        return co @ m[:3, :3].T + m[:3, 3]
    finally:
        bpy.data.meshes.remove(mesh)


# The feet are measured on real evaluated vertices, not on object bounds.
bottom = min(float(world_vertices(o)[:, 2].min()) for o in objects)
# Source (front = -Y) -> simulator (front = +Y): half a turn about Z, then 2 units per metre, feet on z=0.
transform = Matrix.Translation((0, 0, -bottom * 2)) @ Matrix.Diagonal((2.0, 2.0, 2.0, 1.0)) @ Matrix.Rotation(math.pi, 4, 'Z')

# Basic rotor corners (pioneer-basic.json rotor_centers): 0 (+,+), 1 (-,-), 2 (-,+), 3 (+,-).
QUADRANT_INDEX = {(1, 1): 0, (-1, -1): 1, (-1, 1): 2, (1, -1): 3}
rotor_sources = {}
for obj in scene.objects:
    match = re.match(r'V2 • Rotor (\d) • local Z', obj.name)
    if match:
        center = transform @ obj.matrix_world.translation
        index = QUADRANT_INDEX[(1 if center.x > 0 else -1, 1 if center.y > 0 else -1)]
        rotor_sources[int(match[1])] = (index, center)
assert sorted(i for i, _ in rotor_sources.values()) == [0, 1, 2, 3], rotor_sources

mount = bpy.data.objects['V2 • camera internal mount']
glass = bpy.data.objects['V2 • coated front glass']


def world_center(obj):
    verts = world_vertices(obj)
    return Vector(((verts.min(0) + verts.max(0)) / 2).tolist())


# Tilt axis: through the middle of the black camera block, parallel to the drone's lateral axis.
gimbal_pivot = transform @ world_center(mount)
# Lens: centre of the front glass, on its outermost (most forward) surface.
lens_center = transform @ world_center(glass)
lens_center.y = max((transform @ Vector(v)).y for v in world_vertices(glass).tolist())
shell = bpy.data.objects['V2 • bottom shell']
shell_verts = world_vertices(shell)
bottom_mount = transform @ Vector((*((shell_verts.min(0) + shell_verts.max(0)) / 2)[:2].tolist(),
                                   float(shell_verts[:, 2].min())))

export_scene = bpy.data.scenes.new('Pioneer Mini 2 simulator export')
groups = {}


def group(name, position=None, parent=None):
    obj = bpy.data.objects.new(name, None)
    export_scene.collection.objects.link(obj)
    if position is not None:
        obj.location = position
    if parent is not None:
        obj.parent = parent
        obj.location = position - parent.location
    groups[name] = obj
    return obj


group('frame')
motors = group('motors_group')
for _, (index, center) in sorted(rotor_sources.items(), key=lambda item: item[1][0]):
    group(f'rotor_{index}', center).parent = motors
group('base_led_0')
group('base_led_1')
gimbal = group('camera_gimbal', gimbal_pivot)
group('fpv_lens', lens_center, parent=gimbal)
group('bottom_camera_mount', bottom_mount - Vector((0, 0, 0.001)))
export_scene.view_layers[0].update()


def world_of(name):
    obj = groups[name]
    return (obj.parent.matrix_basis if obj.parent else Matrix()) @ obj.matrix_basis


def blade_handedness(center, verts):
    """+1 if the blade's edge facing counter-clockwise motion (seen from above) is the higher one, else -1.

    A thrust-producing blade leads with its higher edge, so +1 means the propeller is made to spin counter-clockwise.
    Measured on the outer part of the blade, across the chord (the counter-clockwise tangent at the blade's centroid).
    """
    rel = verts - np.array(center[:])
    radius = np.hypot(rel[:, 0], rel[:, 1])
    outer = rel[radius > 0.5 * radius.max()]
    cx, cy = outer[:, 0].mean(), outer[:, 1].mean()
    r0 = math.hypot(cx, cy)
    across = outer[:, 0] * (-cy / r0) + outer[:, 1] * (cx / r0)
    return 1 if float(np.corrcoef(across, outer[:, 2])[0, 1]) > 0 else -1


buckets = {}
source_counts = {}
handedness = {}
for original in objects:
    name = original.name
    bucket = 'frame'
    prop = re.match(r'V2 • propeller (\d) ', name)
    if prop:
        bucket = f'rotor_{rotor_sources[int(prop[1])][0]}'
    elif name.startswith('V2 • front LED lens'):
        center = transform @ world_center(original)
        # Simulator: forward +Y, the drone's right +X.
        bucket = 'base_led_0' if center.x < 0 else 'base_led_1'
    elif CAMERA_PART.match(name):
        bucket = 'camera_gimbal'
    mesh = evaluated_mesh(original, depsgraph)
    local = world_of(bucket).inverted() @ transform @ original.matrix_world
    mesh.transform(local)
    if local.determinant() < 0:
        mesh.flip_normals()
    if prop and ' blade ' in name:
        co = np.array([(world_of(bucket) @ v.co)[:] for v in mesh.vertices])
        index, center = rotor_sources[int(prop[1])]
        handedness.setdefault(index, []).append(blade_handedness(center, co))
    copy = bpy.data.objects.new(name, mesh)
    export_scene.collection.objects.link(copy)
    copy.parent = groups[bucket]
    buckets.setdefault(bucket, []).append(copy)
    source_counts[bucket] = source_counts.get(bucket, 0) + 1

# Simple materials for the web: no transmission (three.js renders the opaque scene a second time for it).
for obj in export_scene.objects:
    if obj.type != 'MESH':
        continue
    for material in obj.data.materials:
        if material and material.node_tree:
            for node in material.node_tree.nodes:
                if node.type == 'BSDF_PRINCIPLED' and 'Transmission Weight' in node.inputs:
                    node.inputs['Transmission Weight'].default_value = 0.0

bpy.context.window.scene = export_scene
for bucket, parts in buckets.items():
    bpy.ops.object.select_all(action='DESELECT')
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    parts[0].name = bucket + '_mesh'

# Final guard: the lowest exported vertex exactly on z=0.
bpy.context.view_layer.update()
floor_z = min(float(np.array([(o.matrix_world @ v.co)[:] for v in o.data.vertices])[:, 2].min())
              for o in export_scene.objects if o.type == 'MESH' and len(o.data.vertices))
if abs(floor_z) > 1e-7:
    for obj in export_scene.objects:
        if obj.parent is None:
            obj.location.z -= floor_z
    bpy.context.view_layer.update()
exported_triangles = sum(sum(len(p.vertices) - 2 for p in o.data.polygons)
                         for o in export_scene.objects if o.type == 'MESH')

output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB',
    use_active_scene=True, export_yup=False, export_animations=False,
    export_cameras=False, export_lights=False, export_extras=False,
    export_texcoords=False)


def node_position(name):
    obj = groups[name]
    return [round(c, 6) for c in obj.matrix_world.translation]


report = {
    'source_file': source.name,
    'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'output_sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
    'coordinate_system': 'Z-up; forward +Y (source turned 180 deg about Z); 2 scene units per physical metre; feet at z=0',
    'scale_is_estimated': True,
    'web_optimization': f'Collections 01-07 only; USB contacts and hidden motor windings dropped; bevels 1-2 segments; '
                        'every part decimated to a size-dependent budget; transmission removed',
    'triangles_before_decimation': source_triangles,
    'triangles_exported': exported_triangles,
    'dropped_objects': len(dropped_names),
    'heaviest_parts': [f'{tris} {name}' for tris, name in heaviest],
    'source_objects_by_group': source_counts,
    'rotor_centers': [node_position(f'rotor_{i}') for i in range(4)],
    'rotor_source_index': {f'rotor_{index}': n for n, (index, _) in rotor_sources.items()},
    'propeller_pitch_handedness': {f'rotor_{i}': ('ccw' if sum(h) > 0 else 'cw') for i, h in sorted(handedness.items())},
    'led_order': ["drone's left (front indicator)", "drone's right (front indicator)"],
    'camera_gimbal': node_position('camera_gimbal'),
    'fpv_lens': node_position('fpv_lens'),
    'bottom_camera_mount': node_position('bottom_camera_mount'),
    'provenance': 'User-provided Blender reconstruction from photos; original rights retained; no new license assigned',
}
output.with_suffix('.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('MINI2_EXPORT', json.dumps(report, ensure_ascii=False))
