"""Visual check of the exported Pioneer Mini 2 GLB: front, top, side and three-quarter renders.

blender --background --factory-startup --python tools/render_mini2_glb.py -- MODEL.glb OUT_DIR [CAMERA_TILT_DEG]

The GLB is in simulator coordinates (Z up, forward +Y, 2 units per metre); the glTF importer assumes Y up, so the
imported nodes are turned back. CAMERA_TILT_DEG rotates camera_gimbal the way setDroneCameraTilt does (negative = down).
"""
import bpy
import math
import sys
from pathlib import Path
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
model, out_dir = Path(args[0]).resolve(), Path(args[1]).resolve()
tilt = float(args[2]) if len(args) > 2 else None
out_dir.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=str(model))
roots = [o for o in scene.objects if o.parent is None]
axis = bpy.data.objects.new('to Z-up', None)
scene.collection.objects.link(axis)
axis.rotation_euler.x = -math.pi / 2
for obj in roots:
    obj.parent = axis
bpy.context.view_layer.update()
if tilt is not None:
    gimbal = bpy.data.objects['camera_gimbal']
    # In the GLB's own frame the lateral axis is X; the importer keeps X, so the local X rotation is the tilt.
    gimbal.rotation_mode = 'XYZ'
    gimbal.rotation_euler.x += math.radians(tilt)
    bpy.context.view_layer.update()

meshes = [o for o in scene.objects if o.type == 'MESH']
corners = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
hi = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
center = (lo + hi) / 2
print('MINI2_BOUNDS', tuple(round(v, 4) for v in lo), tuple(round(v, 4) for v in hi))

world = bpy.data.worlds.new('studio')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.42, 0.45, 0.5, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
scene.world = world
for name, rot, energy in (('key', (0.8, 0.2, 0.6), 2.2), ('fill', (1.0, -0.4, -2.2), 0.7), ('rim', (-0.6, 0.0, 3.0), 0.6)):
    light = bpy.data.objects.new(name, bpy.data.lights.new(name, 'SUN'))
    light.data.energy = energy
    light.rotation_euler = rot
    scene.collection.objects.link(light)
ground = bpy.data.meshes.new('ground')
ground.from_pydata([(-2, -2, 0), (2, -2, 0), (2, 2, 0), (-2, 2, 0)], [], [(0, 1, 2, 3)])
ground_obj = bpy.data.objects.new('ground', ground)
mat = bpy.data.materials.new('ground')
mat.diffuse_color = (0.32, 0.34, 0.37, 1)
ground.materials.append(mat)
scene.collection.objects.link(ground_obj)

camera = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(camera)
scene.camera = camera
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'AgX'

span = max(hi.x - lo.x, hi.y - lo.y)
views = {
    'front': ((0, 1, 0.12), (1600, 800), True),        # forward is +Y: looking at the nose
    'top': ((0, -0.0001, 1), (1400, 1100), True),     # nose up
    'side': ((1, 0, 0.05), (1600, 700), True),        # from the drone's right
    'three-quarter': ((0.9, 1.1, 0.75), (1600, 1100), False),
}
suffix = f'-tilt{int(tilt)}' if tilt is not None else ''
for name, (direction, (w, h), ortho) in views.items():
    scene.render.resolution_x, scene.render.resolution_y = w, h
    d = Vector(direction).normalized()
    camera.location = center + d * span * (3 if ortho else 1.9)
    camera.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    camera.data.clip_end = 100
    if ortho:
        camera.data.type = 'ORTHO'
        camera.data.ortho_scale = span * 1.08
    else:
        camera.data.type = 'PERSP'
        camera.data.lens = 50
    ground_obj.hide_render = name == 'top'
    scene.render.filepath = str(out_dir / f'mini2-{name}{suffix}.png')
    bpy.ops.render.render(write_still=True)
    print('MINI2_RENDER', scene.render.filepath)
