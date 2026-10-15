"""Landscape kit v5: city buildings (school, hospital, restaurant, mall, office) and street furniture.

Original geometry, no external assets. Runs in Blender (GUI via the MCP add-on, or headless):
    blender --background --factory-startup --python tools/build_landscape_assets_v5.py
Same conventions as v1-v3 (vehicles and aircraft face +X; rotor and boom are pivot-centred parts): metres, Z up, origin at footprint centre on the ground, front faces -Y,
at most 5000 triangles and 6 materials per model, flat colours only (no textures).
"""
import bpy
import bmesh
import json
import math
from pathlib import Path
from mathutils import Vector

OUT = Path(globals().get('__file__', 'tools/build_landscape_assets_v5.py')).resolve().parents[1] / 'public/assets/models/props'
NAME = 'landscape-kit-v5'
for extension in ['blend', 'glb', 'mesh.json']:
    if (OUT / f'{NAME}.{extension}').exists() and not globals().get('REBUILD_LANDSCAPE_KIT', False):
        raise RuntimeError('Refusing to overwrite an existing landscape export (set REBUILD_LANDSCAPE_KIT = True)')

scene = bpy.context.scene
scene.name = 'Pioneer landscape kit v5'
scene.unit_settings.system = 'METRIC'
for stale in list(bpy.data.objects):
    bpy.data.objects.remove(stale, do_unlink=True)

roots, materials, current = {}, {}, None


def mat(name, rgb, roughness=.85, metalness=0):
    m = bpy.data.materials.new('Landscape_' + name)
    m.diffuse_color = (*rgb, 1)
    try:
        m.use_nodes = True
    except Exception:
        pass
    if m.node_tree:
        shader = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if shader:
            shader.inputs['Base Color'].default_value = (*rgb, 1)
            shader.inputs['Roughness'].default_value = roughness
            shader.inputs['Metallic'].default_value = metalness
    m['landscape_key'] = name
    materials[name] = dict(color=list(rgb), roughness=roughness, metalness=metalness)
    return m


M = dict(
    Plaster=mat('SchoolYellow', (.89, .76, .46), .9),
    Cream=mat('Cream', (.93, .9, .82), .9),
    Brick=mat('StationBrick', (.62, .22, .16), .9),
    Roof=mat('DarkRoof', (.13, .15, .17), .6, .25),
    Glass=mat('DarkGlass', (.1, .22, .27), .25, .25),
    Trim=mat('WhiteTrim', (.85, .85, .8)),
    White=mat('PaintWhite', (.93, .94, .95), .55),
    Red=mat('SignalRed', (.78, .1, .08), .55),
    Orange=mat('SafetyOrange', (.92, .45, .06), .55),
    Concrete=mat('Concrete', (.6, .59, .56), .95),
    Steel=mat('GalvSteel', (.5, .54, .56), .45, .7),
    Wood=mat('BenchWood', (.55, .38, .2), .85),
    Green=mat('ParkGreen', (.2, .5, .28), .8),
    Blue=mat('PoliceBlue', (.1, .27, .62), .55),
)


def root(name):
    global current
    current = bpy.data.objects.new(name + '_kit', None)
    scene.collection.objects.link(current)
    roots[name] = current


def finish(obj, name, material):
    obj.name = current.name + '_' + name
    obj.parent = current
    obj.data.materials.append(material)
    return obj


def box(name, pos, size, material, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    obj = bpy.context.object
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.rotation_euler = rot
    return finish(obj, name, material)


def cylinder(name, pos, radius, depth, material, vertices=12, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=pos)
    obj = bpy.context.object
    obj.rotation_euler = rot
    return finish(obj, name, material)


def cone(name, pos, r1, r2, depth, material, vertices=12, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=r1, radius2=r2, depth=depth, location=pos)
    obj = bpy.context.object
    obj.rotation_euler = rot
    return finish(obj, name, material)


def strut(name, a, b, thick, material):
    a, b = Vector(a), Vector(b)
    direction = b - a
    obj = box(name, tuple((a + b) / 2), (thick, thick, direction.length), material)
    obj.rotation_euler = direction.to_track_quat('Z', 'Y').to_euler()
    return obj


def prism(name, vertices, faces, material):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    return finish(obj, name, material)


def gable(name, width, depth, base, peak, material):
    v = [(-width/2, -depth/2, base), (width/2, -depth/2, base), (0, -depth/2, peak),
         (-width/2, depth/2, base), (width/2, depth/2, base), (0, depth/2, peak)]
    return prism(name, v, [(0, 1, 2), (3, 5, 4), (0, 2, 5, 3), (1, 4, 5, 2), (0, 3, 4, 1)], material)


def roof_slabs(name, width, depth, base, peak, thickness, material, overhang=.35):
    """Two sloped slabs, so a gable wall below keeps its own colour."""
    half = width / 2 + overhang
    angle = math.atan2(peak - base, width / 2)
    length = math.hypot(width / 2 + overhang * math.cos(angle), peak - base) + overhang
    for side in (-1, 1):
        box(name, (side * (half / 2 - .05), 0, (base + peak) / 2 + .05), (length, depth + overhang * 2, thickness), material,
            rot=(0, side * angle, 0))


try:
    def win(x, z, w, h, yface, out, mullions=1, transom=False, frame=None, glass=None, sill=True):
        """A framed window on a wall face at y = yface; out = -1 for a front (-Y) face, +1 for a back (+Y) face."""
        frame = frame or M['Trim']
        glass = glass or M['Glass']
        box('WinFrame', (x, yface + out * .03, z), (w + .22, .06, h + .22), frame)
        box('WinGlass', (x, yface + out * .06, z), (w, .08, h), glass)
        for i in range(mullions):
            box('WinMullion', (x - w / 2 + w * (i + 1) / (mullions + 1), yface + out * .09, z), (.07, .06, h), frame)
        if transom:
            box('WinTransom', (x, yface + out * .09, z + h * .12), (w, .06, .07), frame)
        if sill:
            box('WinSill', (x, yface + out * .1, z - h / 2 - .13), (w + .4, .22, .08), frame)

    def band(x, z, w, h, yface, out, step, material=None):
        """A ribbon window: glass strip with mullions, rails and a sill."""
        material = material or M['Trim']
        box('BandGlass', (x, yface + out * .06, z), (w, .08, h), M['Glass'])
        for k in range(int(w // step) + 1):
            box('BandMullion', (x - w / 2 + k * step, yface + out * .09, z), (.1, .06, h), material)
        for dz in (-h / 2, h / 2):
            box('BandRail', (x, yface + out * .08, z + dz), (w + .2, .1, .12), material)
        box('BandSill', (x, yface + out * .12, z - h / 2 - .1), (w + .4, .24, .08), material)

    def parapet(cx, cy, w, d, z, h, material, t=.25):
        for s in (-1, 1):
            box('Parapet', (cx, cy + s * (d / 2 - t / 2), z + h / 2), (w, t, h), material)
            box('Parapet', (cx + s * (w / 2 - t / 2), cy, z + h / 2), (t, d - 2 * t, h), material)

    # ---- School: three-storey block, a lower gym wing, a portico with pediment and a flagpole (front is -Y) ----------
    root('School')
    box('Slab', (0, 0, .1), (32, 16, .2), M['Trim'])
    box('Block', (-4, 0, 5.4), (20, 12, 10.4), M['Plaster'])
    box('Cornice', (-4, 0, 10.4), (20.5, 12.5, .3), M['Trim'])
    box('BlockRoof', (-4, 0, 10.75), (20.8, 12.8, .4), M['Roof'])
    parapet(-4, 0, 20.8, 12.8, 10.95, .35, M['Trim'])
    box('Gym', (11, 0, 3.8), (10, 12, 7.2), M['Brick'])
    box('GymCornice', (11, 0, 7.2), (10.4, 12.4, .3), M['Trim'])
    box('GymRoof', (11, 0, 7.55), (10.6, 12.6, .4), M['Roof'])
    parapet(11, 0, 10.6, 12.6, 7.75, .3, M['Trim'])
    for cx in (-14, 6):
        for cy in (-6, 6):
            box('Quoin', (cx + (.2 if cx < 0 else -.2), cy + (.2 if cy < 0 else -.2), 5.4), (.5, .5, 10.2), M['Trim'])
    for row in (2.6, 5.6, 8.6):
        for i in range(7):
            x = -12.6 + i * 2.7
            if not (row == 2.6 and abs(x + 4) < 3.3):      # the door (2.8 wide) and its frame own this stretch of wall
                win(x, row, 1.5, 1.7, -6.0, -1, 1, True)
            win(x, row, 1.5, 1.7, 6.0, 1, 1, False)
    for x in (8, 11, 14):
        win(x, 4.4, 1.5, 3.0, -6.0, -1, 1, True)
        win(x, 4.4, 1.5, 3.0, 6.0, 1, 1, False)
    box('Door', (-4, -6.06, 1.6), (2.8, .1, 3.0), M['Glass'])
    box('DoorFrame', (-4, -6.03, 1.75), (3.2, .06, 3.5), M['Trim'])
    for dx in (-.7, 0, .7):
        box('DoorMullion', (-4 + dx, -6.13, 1.6), (.1, .06, 3.0), M['Roof'])
    box('DoorTransom', (-4, -6.13, 2.5), (2.8, .06, .1), M['Roof'])
    box('DoorHandle', (-4.2, -6.17, 1.5), (.05, .05, .6), M['Trim'])
    box('DoorHandle', (-3.8, -6.17, 1.5), (.05, .05, .6), M['Trim'])
    box('StepA', (-4, -6.4, .25), (5.0, .6, .1), M['Trim'])
    box('StepB', (-4, -6.95, .23), (5.6, .6, .06), M['Trim'])
    box('Portico', (-4, -7.6, 4.4), (7, 3.4, .35), M['Trim'])
    pediment = gable('Pediment', 7.4, .3, 4.57, 5.8, M['Trim'])
    pediment.location = (-4, -9.15, 0)
    for x in (-6.8, -1.2):
        cylinder('Column', (x, -8.9, 2.2), .22, 4.4, M['Trim'], 12)
        box('ColumnBase', (x, -8.9, .27), (.6, .6, .15), M['Trim'])
        box('ColumnCap', (x, -8.9, 4.1), (.6, .6, .15), M['Trim'])
    box('SignBand', (-4, -6.06, 7.2), (9, .12, .8), M['Trim'])
    for i in range(6):
        box('SignLetter', (-6.5 + i * 1.0, -6.16, 7.2), (.5, .05, .5), M['Roof'])
    cylinder('FlagBase', (-12.5, -8.2, .35), .3, .3, M['Trim'], 8)
    cylinder('FlagPole', (-12.5, -8.2, 4.6), .08, 9.2, M['Trim'], 8)
    box('Flag', (-11.7, -8.2, 8.5), (1.6, .05, 1.0), M['Red'])
    for x in (-12, 4):
        box('RoofUnit', (x, 3, 11.15), (1.6, 1.0, .4), M['Roof'])
    for x in (8, 14):
        box('Skylight', (x, 0, 7.9), (2.4, 3, .15), M['Glass'])

    # ---- Hospital: tall central tower between two wings with framed ribbon windows, cross, ambulance bay, helipad ---------
    root('Hospital')
    box('Slab', (0, 0, .1), (36, 24, .2), M['Concrete'])
    box('Tower', (0, 2, 9.6), (10, 10, 18.8), M['White'])
    box('TowerRoof', (0, 2, 19.1), (10.6, 10.6, .5), M['Roof'])
    parapet(0, 2, 10.6, 10.6, 19.35, .4, M['Trim'])
    box('WingL', (-11, 0, 6.5), (12, 11, 13), M['White'])
    box('WingR', (11, 0, 6.5), (12, 11, 13), M['White'])
    box('WingLRoof', (-11, 0, 13.2), (12.6, 11.6, .4), M['Roof'])
    box('WingRRoof', (11, 0, 13.2), (12.6, 11.6, .4), M['Roof'])
    parapet(11, 0, 12.6, 11.6, 13.4, .35, M['Trim'])
    for k in range(4):
        z = 2.4 + k * 3.0
        for x in (-11, 11):
            if not (x == 11 and k == 0):                # the ambulance bay door stands there
                band(x, z, 10.4, 1.1, -5.5, -1, 2.6)
            band(x, z, 10.4, 1.1, 5.5, 1, 2.6)
    for k in range(1, 6):      # no band on the ground floor: the entrance door stands there
        band(0, 2.4 + k * 3.0, 8.4, 1.1, -3.0, -1, 2.1)
        band(0, 2.4 + k * 3.0, 8.4, 1.1, 7.0, 1, 2.1)
    box('CrossV', (0, -3.14, 15.9), (.5, .12, 1.6), M['Red'])      # between the 14.4 and 17.4 window bands
    box('CrossH', (0, -3.14, 15.9), (1.6, .12, .5), M['Red'])
    box('Canopy', (0, -8.4, 3.5), (9, 4.8, .4), M['Trim'])
    box('CanopyEdge', (0, -10.82, 3.5), (9.1, .1, .45), M['Red'])
    for x in (-4, 4):
        cylinder('Pillar', (x, -10.4, 1.75), .25, 3.5, M['Trim'], 12)
    box('Door', (0, -3.06, 1.6), (4.2, .1, 3.0), M['Glass'])
    box('DoorFrame', (0, -3.03, 1.75), (4.6, .06, 3.4), M['Trim'])
    for x in (-1.05, 0, 1.05):
        box('DoorMullion', (x, -3.13, 1.6), (.1, .06, 3.0), M['Trim'])
    box('DoorStep', (0, -3.5, .25), (4.8, .8, .1), M['Trim'])
    box('BayRoof', (11, -8.6, 3.5), (9, 5.2, .4), M['Trim'])
    box('BayDoorFrame', (11, -5.57, 1.8), (5.0, .14, 3.6), M['Trim'])
    box('BayDoor', (11, -5.64, 1.7), (4.6, .08, 3.4), M['Glass'])
    box('BayDoorSplit', (11, -5.7, 1.7), (.12, .06, 3.4), M['Trim'])
    box('BaySign', (11, -5.62, 4.45), (6, .12, .6), M['Red'])
    for x in (7, 15):
        cylinder('BayPillar', (x, -10.6, 1.75), .25, 3.5, M['Trim'], 12)
    box('BayStripe', (11, -11.25, 3.15), (9, .1, .5), M['Red'])
    cylinder('Helipad', (-11, 0, 13.55), 4.2, .3, M['Concrete'], 24)
    cylinder('HelipadRing', (-11, 0, 13.71), 3.9, .02, M['Red'], 24)
    cylinder('HelipadInner', (-11, 0, 13.725), 3.6, .02, M['Concrete'], 24)
    box('HBarA', (-12.4, 0, 13.78), (.5, 3.2, .1), M['White'])
    box('HBarB', (-9.6, 0, 13.78), (.5, 3.2, .1), M['White'])
    box('HBarC', (-11, 0, 13.78), (2.8, .5, .1), M['White'])
    box('Penthouse', (0, 2, 19.75), (4.0, 3.0, .8), M['White'])
    box('PenthouseVent', (-1.2, 2, 20.275), (.8, .8, .25), M['Roof'])
    for x in (8, 13):
        box('RoofUnit', (x, 1.5, 13.7), (2.0, 1.4, .6), M['Roof'])

    # ---- Restaurant: brick hall with a mullioned glass front, striped awning, patio rail, tables and a roof sign ---------
    root('Restaurant')
    box('Slab', (0, 0, .08), (16, 14, .16), M['Trim'])
    box('Hall', (0, 0, 2.3), (12, 8, 4.4), M['Brick'])
    box('HallBase', (0, 0, .4), (12.2, 8.2, .5), M['Trim'])
    box('HallCornice', (0, 0, 4.35), (12.4, 8.4, .25), M['Trim'])
    box('Roof', (0, 0, 4.6), (12.7, 8.7, .35), M['Roof'])
    parapet(0, 0, 12.7, 8.7, 4.775, .2, M['Trim'], .2)
    box('Front', (0, -4.03, 1.9), (9, .1, 2.6), M['Glass'])
    box('FrontTop', (0, -4.07, 3.28), (9.3, .1, .16), M['Trim'])
    box('FrontSill', (0, -4.12, .5), (9.4, .24, .1), M['Trim'])
    for x in (-4.5, -3, -1.5, 1.5, 3, 4.5):
        box('FrontMullion', (x, -4.08, 1.9), (.08, .08, 2.6), M['Trim'])
    for x in (-5.2, 5.2):
        win(x, 1.9, 1.2, 2.0, -4.0, -1, 1, False)
    box('DoorFrame', (0, -4.04, 1.5), (1.9, .06, 2.7), M['Trim'])
    box('Door', (0, -4.1, 1.4), (1.6, .1, 2.4), M['Roof'])
    box('DoorPane', (0, -4.17, 1.8), (1.2, .04, 1.2), M['Glass'])
    box('DoorHandle', (.55, -4.19, 1.2), (.05, .05, .5), M['Trim'])
    for sx in (-1, 1):
        for y in (-2, 2):
            box('SideWin', (sx * 6.04, y, 1.9), (.08, 1.2, 1.2), M['Glass'])
            box('SideWinFrame', (sx * 6.02, y, 1.9), (.06, 1.45, 1.45), M['Trim'])
            box('SideWinSill', (sx * 6.1, y, 1.1), (.22, 1.7, .08), M['Trim'])
    box('BackDoor', (3, 4.06, 1.2), (1.2, .1, 2.2), M['Roof'])
    box('BackDoorFrame', (3, 4.03, 1.3), (1.5, .06, 2.5), M['Trim'])
    stripe_w = 12 / 8
    for i in range(8):
        x0 = -6 + i * stripe_w
        v = [(x0, -4.0, 3.5), (x0 + stripe_w, -4.0, 3.5), (x0 + stripe_w, -6.4, 2.6), (x0, -6.4, 2.6),
             (x0, -4.0, 3.42), (x0 + stripe_w, -4.0, 3.42), (x0 + stripe_w, -6.4, 2.52), (x0, -6.4, 2.52)]
        prism('Awning', v, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], M['Red'] if i % 2 == 0 else M['Trim'])
        box('Valance', (x0 + stripe_w / 2, -6.42, 2.4), (stripe_w, .04, .3), M['Red'] if i % 2 == 0 else M['Trim'])
    for x in (-5.9, 5.9):
        box('AwningPost', (x, -6.3, 1.25), (.09, .09, 2.5), M['Trim'])
    for x in (-5.0, -3.0, 3.0, 5.0):
        box('PatioPost', (x, -6.8, .55), (.07, .07, .8), M['Trim'])
    for x0, x1 in ((-5.9, -1.8), (1.8, 5.9)):
        box('PatioRail', ((x0 + x1) / 2, -6.8, 1.0), (x1 - x0, .06, .06), M['Trim'])
    for tx in (-3.4, 3.4):
        cylinder('TableTop', (tx, -5.4, .75), .45, .05, M['Trim'], 14)
        cylinder('TableStem', (tx, -5.4, .38), .04, .75, M['Trim'], 8)
        cylinder('TableFoot', (tx, -5.4, .03), .25, .06, M['Trim'], 12)
        for dx in (-.8, .8):
            box('ChairSeat', (tx + dx, -5.4, .45), (.4, .4, .05), M['Trim'])
            box('ChairBack', (tx + dx * 1.22, -5.4, .72), (.05, .4, .5), M['Trim'])
            for ax in (-.15, .15):
                for ay in (-.15, .15):
                    box('ChairLeg', (tx + dx + ax, -5.4 + ay, .21), (.04, .04, .42), M['Trim'])
    box('Sign', (0, -4.2, 5.55), (5.2, .2, 1.1), M['Red'])
    for i in range(7):
        box('SignLetter', (-2.1 + i * .7, -4.33, 5.55), (.35, .05, .6), M['Trim'])
    box('Chimney', (4.2, 1.5, 5.35), (.9, .9, 1.7), M['Brick'])
    box('ChimneyCap', (4.2, 1.5, 6.25), (1.1, 1.1, .1), M['Trim'])
    for x in (-3.5, 0):
        box('RoofVent', (x, 1.8, 5.05), (.7, .7, .45), M['Roof'])

    # ---- Mall: wide box with glazed atrium, shop fronts, parapet, canopy, loading docks and a sign pylon -------------------
    root('Mall')
    box('Slab', (0, 0, .1), (50, 34, .2), M['Trim'])
    box('Body', (0, 0, 4.4), (46, 28, 8.4), M['Cream'])
    box('Cornice', (0, 0, 8.4), (46.4, 28.4, .3), M['Trim'])
    box('Roof', (0, 0, 8.75), (46.6, 28.6, .4), M['Roof'])
    parapet(0, 0, 46.6, 28.6, 8.95, .5, M['Trim'], .3)
    box('Atrium', (0, -14.04, 3.8), (18, .2, 7.0), M['Glass'])
    box('AtriumFrame', (0, -14.1, 7.5), (18.4, .2, .4), M['Trim'])
    for i in range(-3, 4):
        box('Mullion', (i * 3, -14.12, 3.8), (.18, .12, 7.0), M['Trim'])
    for z in (2.6, 5.2):
        box('Transom', (0, -14.14, z), (18, .1, .14), M['Trim'])
    for x in (-4.5, 4.5):
        box('DoorFrame', (x, -14.16, 1.45), (4.2, .1, 2.9), M['Trim'])
        for dx in (-.7, .7):
            box('DoorMullion', (x + dx, -14.2, 1.45), (.08, .06, 2.7), M['Trim'])
    box('AtriumSkylight', (0, -10, 9.1), (16, 6, .3), M['Glass'])
    box('Canopy', (0, -16.6, 5.0), (22, 5.6, .4), M['Orange'])
    box('CanopyEdge', (0, -19.42, 5.0), (22, .08, .5), M['Trim'])
    for x in (-9, -3, 3, 9):
        cylinder('Pillar', (x, -18.8, 2.5), .3, 5.0, M['Trim'], 12)
        box('PillarBase', (x, -18.8, .15), (.8, .8, .3), M['Trim'])
    for side in (-1, 1):
        for i in range(4):
            box('Panel', (side * (16 + i * 2.2), -14.06, 4.3), (1.5, .12, 7.6), M['Orange'] if i % 2 == 0 else M['Trim'])
        box('ShopWindow', (side * 12.3, -14.04, 2.0), (5.0, .1, 3.0), M['Glass'])
        box('ShopFrame', (side * 12.3, -14.01, 2.0), (5.3, .06, 3.3), M['Trim'])
        for k in (-1, 0, 1):
            box('ShopMullion', (side * 12.3 + k * 1.25, -14.1, 2.0), (.07, .06, 3.0), M['Trim'])
        box('ShopSign', (side * 12.3, -14.08, 4.4), (5.0, .1, .8), M['Orange'])
        box('SideDoorFrame', (side * 23.0, 0, 1.55), (.1, 3.0, 2.9), M['Trim'])
        box('SideDoor', (side * 23.04, 0, 1.5), (.08, 2.6, 2.6), M['Glass'])
        box('SideStrip', (side * 23.03, 0, 6.2), (.08, 22, 1.0), M['Glass'])
    box('SignBand', (0, -14.1, 8.9), (30, .3, 1.2), M['Orange'])
    for i in range(8):
        box('SignLetter', (-8.4 + i * 2.4, -14.3, 8.9), (1.0, .1, .8), M['Trim'])
    for x in (-15, -5, 5, 15):
        box('DockFrame', (x, 14.03, 1.8), (3.6, .12, 3.6), M['Trim'])
        box('DockDoor', (x, 14.1, 1.7), (3.0, .1, 3.2), M['Roof'])
        for z in (.8, 1.6, 2.4):
            box('DockRib', (x, 14.17, z), (3.0, .04, .06), M['Trim'])
        box('Bumper', (x, 14.25, .7), (2.4, .3, .3), M['Roof'])
    cylinder('Pylon', (21, -19, 6), .5, 12, M['Roof'], 10)
    box('PylonBase', (21, -19, .3), (1.6, 1.6, .6), M['Trim'])
    box('PylonSign', (21, -19, 12.6), (3.4, .4, 2.6), M['Orange'])
    box('PylonPanel', (21, -19.22, 12.6), (2.8, .06, 1.2), M['Trim'])
    for x in (-14, -4, 8):
        box('Unit', (x, 4, 9.6), (4, 3, 1.4), M['Roof'])
        cylinder('UnitFan', (x, 4, 10.35), .7, .1, M['Trim'], 12)

    # ---- Office tower: curtain-wall glass shaft on a podium with terrace, mullions, floor bands and a stepped crown ----------
    root('Office')
    box('Podium', (0, 0, 2.6), (18, 18, 5.2), M['Concrete'])
    box('PodiumCap', (0, 0, 5.3), (18.3, 18.3, .2), M['Trim'])
    box('Shaft', (0, 0, 24), (14, 14, 38), M['Glass'])
    for k in range(13):
        box('FloorBand', (0, 0, 7 + k * 2.9), (14.3, 14.3, .22), M['Trim'])
    for c in (-7, 7):
        for d in (-7, 7):
            box('Corner', (c, d, 24), (.5, .5, 38), M['Steel'])
    for i in range(-3, 4):
        x = i * 1.75
        if i:
            for s in (-1, 1):
                box('Mullion', (x, s * 7.05, 24), (.1, .1, 38), M['Steel'])
                box('Mullion', (s * 7.05, x, 24), (.1, .1, 38), M['Steel'])
    parapet(0, 0, 14.4, 14.4, 43.0, .4, M['Trim'], .3)
    box('Crown', (0, 0, 43.4), (9, 9, 2.4), M['Steel'])
    box('CrownLouver', (0, -4.52, 43.4), (7, .06, 1.6), M['Glass'])
    box('Crown2', (0, 0, 45.1), (5, 5, 1.2), M['Trim'])
    cylinder('Mast', (0, 0, 47.5), .18, 6, M['Steel'], 8)
    box('MastBar', (0, 0, 46.8), (1.6, .08, .08), M['Steel'])
    box('Lobby', (0, -9.04, 2.4), (8, .12, 3.6), M['Glass'])
    box('LobbyFrame', (0, -9.02, 2.5), (8.4, .08, 3.9), M['Steel'])
    for x in (-2, 0, 2):
        box('LobbyMullion', (x, -9.12, 2.4), (.1, .06, 3.6), M['Steel'])
    box('LobbyTransom', (0, -9.12, 3.0), (8, .06, .1), M['Steel'])
    box('Canopy', (0, -9.3, 4.2), (8.8, .6, .25), M['Steel'])
    box('LobbyStep', (0, -9.35, .08), (8.4, .5, .16), M['Concrete'])
    for s in (-1, 1):
        box('PodiumWindow', (s * 5.6, -9.04, 2.6), (3.2, .1, 2.6), M['Glass'])
        box('PodiumWinFrame', (s * 5.6, -9.01, 2.6), (3.5, .06, 2.9), M['Steel'])
        box('PodiumWindowBack', (s * 4.5, 9.04, 2.6), (6.0, .1, 2.6), M['Glass'])
        box('PodiumWinSide', (s * 9.04, 0, 2.6), (.1, 10, 2.6), M['Glass'])
        for k in range(-2, 3):
            box('PodiumMullion', (s * 9.1, k * 2.0, 2.6), (.06, .08, 2.6), M['Steel'])
    for x in (-7, -3, 3, 7):
        box('Planter', (x, -8.4, 5.55), (2.0, .6, .5), M['Green'])
    for x in (-8.0, 8.0):
        box('TerraceUnit', (x, 4, 5.9), (1.4, 1.4, .9), M['Steel'])
    for s in (-1, 1):
        box('TerraceRail', (0, s * 8.95, 6.0), (18, .05, .05), M['Steel'])
        box('TerraceRail', (s * 8.95, 0, 6.0), (.05, 18, .05), M['Steel'])
        for t in range(-4, 5):
            box('TerracePost', (t * 2.0, s * 8.95, 5.7), (.05, .05, .5), M['Steel'])
            box('TerracePost', (s * 8.95, t * 2.0, 5.7), (.05, .05, .5), M['Steel'])

    # ---- Police station: patrol-car bays with panelled doors, entrance with steps, framed windows, roof sign and mast ----------
    root('PoliceStation')
    box('Slab', (0, 0, .1), (24, 14, .2), M['Trim'])
    box('Body', (0, 0, 3.7), (20, 11, 7.4), M['Cream'])
    box('Cornice', (0, 0, 7.35), (20.4, 11.4, .3), M['Trim'])
    box('Roof', (0, 0, 7.6), (20.8, 11.8, .4), M['Roof'])
    parapet(0, 0, 20.8, 11.8, 7.8, .3, M['Trim'])
    for x in (-7.2, -2.4):                       # garage bays (4 m wide, 3.2 m high) on the left half
        box('BayFrame', (x, -5.56, 1.7), (4.4, .14, 3.4), M['Trim'])
        box('BayDoor', (x, -5.64, 1.6), (4.0, .08, 3.2), M['Steel'])
        for z in (.7, 1.3, 1.9):
            box('BayRib', (x, -5.7, z), (4.0, .04, .06), M['Roof'])
        for k in range(4):
            box('BayPane', (x - 1.5 + k * 1.0, -5.7, 2.65), (.8, .04, .4), M['Glass'])
        box('BayLamp', (x, -5.7, 3.7), (.4, .15, .2), M['Glass'])
    box('EntranceFrame', (6, -5.56, 1.7), (3.0, .14, 3.4), M['Trim'])
    box('Entrance', (6, -5.64, 1.6), (2.6, .08, 3.0), M['Glass'])
    box('EntranceMullion', (6, -5.7, 1.6), (.1, .06, 3.0), M['Steel'])
    box('EntranceTransom', (6, -5.7, 2.6), (2.6, .06, .1), M['Steel'])
    box('EntranceStep', (6, -6.2, .27), (3.4, .8, .14), M['Trim'])
    box('Canopy', (6, -6.7, 3.9), (5, 2.6, .3), M['Blue'])
    for x in (3.8, 8.2):
        cylinder('CanopyPost', (x, -7.8, 1.95), .12, 3.9, M['Trim'], 10)
    win(1.6, 2.2, 1.4, 1.4, -5.5, -1, 1, False)          # between the bays and the entrance
    win(9.1, 2.2, 1.0, 1.4, -5.5, -1, 0, False)
    for x in (-8, -4, 0, 4, 8):                  # upper floor
        win(x, 5.4, 1.8, 1.4, -5.5, -1, 1, False)
    for x in (-8, -4, 0, 4, 8):
        win(x, 5.4, 1.8, 1.4, 5.5, 1, 1, False)
        win(x, 2.2, 1.8, 1.4, 5.5, 1, 1, False)
    box('Band', (0, -5.58, 6.9), (20, .1, .5), M['Blue'])
    box('Sign', (6, -5.7, 8.6), (5.2, .25, 1.3), M['Blue'])
    for x in (3.6, 8.4):
        box('SignPost', (x, -5.7, 8.0), (.15, .15, .4), M['Steel'])
    box('Emblem', (6, -5.86, 8.6), (1.1, .08, 0.9), M['Trim'])
    for i in range(6):
        box('SignLetter', (3.7 + i * .45, -5.86, 8.6), (.28, .05, .5), M['Trim'])
    box('RoofUnit', (0, 2.5, 8.2), (2.0, 1.4, .8), M['Steel'])
    cylinder('Antenna', (-6, 2, 9.1), .08, 2.6, M['Steel'], 8)
    box('AntennaBar', (-6, 2, 9.9), (1.4, .06, .06), M['Steel'])
    cylinder('FlagBase', (-9.4, -6.6, .3), .3, .3, M['Trim'], 8)
    cylinder('FlagPole', (-9.4, -6.6, 5.2), .08, 10.4, M['Trim'], 8)
    box('Flag', (-8.6, -6.6, 9.8), (1.6, .05, 1.0), M['Blue'])

    # ---- Bench: slatted seat and raked back on two steel frames with arm rests -----------------------------------------------
    root('Bench')
    for i in range(4):
        box('Seat', (0, -.2 + i * .11, .46), (1.8, .09, .05), M['Wood'])
    for i in range(3):
        box('Back', (0, .28 + i * .02, .6 + i * .14), (1.8, .04, .11), M['Wood'], rot=(-.18, 0, 0))
    for x in (-.8, .8):
        box('LegFront', (x, -.15, .22), (.06, .06, .44), M['Steel'])
        box('LegBack', (x, .28, .22), (.06, .06, .44), M['Steel'])
        strut('BackStay', (x, .28, .43), (x, .36, .98), .05, M['Steel'])
        box('SeatRail', (x, .05, .42), (.06, .6, .05), M['Steel'])
        box('ArmPost', (x, -.12, .56), (.05, .05, .24), M['Steel'])
        box('Arm', (x, .05, .7), (.07, .56, .04), M['Wood'])
        box('Foot', (x, 0, .02), (.1, .75, .04), M['Steel'])

    # ---- Cafe table: round table with apron, four chairs and a ribbed parasol of alternating panels -------------------------
    root('CafeTable')
    cylinder('Top', (0, 0, .75), .55, .06, M['White'], 20)
    cylinder('Apron', (0, 0, .69), .5, .06, M['Steel'], 20)
    cylinder('Stem', (0, 0, .38), .05, .75, M['Steel'], 8)
    cylinder('Foot', (0, 0, .03), .3, .06, M['Steel'], 14)
    for ang in (0, 90, 180, 270):
        a = math.radians(ang)
        c, s = math.cos(a), math.sin(a)
        cx, cy = c * .95, s * .95
        seat = box('Seat', (cx, cy, .45), (.42, .42, .06), M['Wood'], rot=(0, 0, a))
        box('ChairBack', (c * 1.14, s * 1.14, .72), (.06, .42, .5), M['Wood'], rot=(0, 0, a))
        for dx in (-.17, .17):
            for dy in (-.17, .17):
                box('ChairLeg', (cx + dx * c - dy * s, cy + dx * s + dy * c, .21), (.04, .04, .42), M['Steel'])
    cylinder('Pole', (0, 0, 1.4), .035, 2.8, M['Steel'], 8)
    segments, apex, rim, rim_z = 8, (0, 0, 2.75), 1.7, 2.3
    for i in range(segments):
        a0, a1 = 2 * math.pi * i / segments, 2 * math.pi * (i + 1) / segments
        p0 = (rim * math.cos(a0), rim * math.sin(a0), rim_z)
        p1 = (rim * math.cos(a1), rim * math.sin(a1), rim_z)
        top = [apex, p0, p1]
        bottom = [(0, 0, apex[2] - .05), (p0[0], p0[1], rim_z - .05), (p1[0], p1[1], rim_z - .05)]
        prism('Parasol', top + bottom, [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)], M['Red'] if i % 2 == 0 else M['White'])
        strut('Rib', (0, 0, apex[2] - .08), (p0[0] * .98, p0[1] * .98, rim_z - .08), .03, M['Steel'])
    cylinder('Finial', (0, 0, 2.78), .05, .1, M['Steel'], 8)

    bpy.context.view_layer.update()
    bundle = {'version': 5, 'coordinates': 'metres; Z up; origin at footprint centre, ground level',
              'materials': materials, 'assets': {}}
    for name, asset_root in roots.items():
        batches = {}
        for obj in list(asset_root.children):
            batches.setdefault(obj.data.materials[0]['landscape_key'], []).append(obj)
        assert len(batches) <= 6, f'{name}: more than 6 materials ({len(batches)})'
        parts = []
        for key, objects in batches.items():
            bpy.ops.object.select_all(action='DESELECT')
            for obj in objects:
                obj.select_set(True)
            bpy.context.view_layer.objects.active = objects[0]
            if len(objects) > 1:
                bpy.ops.object.join()
            obj = bpy.context.object
            obj.name = name + '_' + key
            matrix = asset_root.matrix_world.inverted() @ obj.matrix_world
            normal_matrix = matrix.to_3x3().inverted().transposed()
            obj.data.calc_loop_triangles()
            positions, normals, indices = [], [], []
            for tri in obj.data.loop_triangles:
                normal = (normal_matrix @ tri.normal).normalized()
                for index in tri.vertices:
                    vertex = matrix @ obj.data.vertices[index].co
                    indices.append(len(positions) // 3)
                    positions.extend(round(float(v), 5) for v in vertex)
                    normals.extend(round(float(v), 5) for v in normal)
            parts.append(dict(material=key, position=positions, normal=normals, index=indices))
        bundle['assets'][name] = parts
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f'{NAME}.mesh.json').write_text(json.dumps(bundle, separators=(',', ':')), encoding='utf-8')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT / f'{NAME}.glb'), export_format='GLB', use_selection=True, use_active_scene=True)
    bpy.data.libraries.write(str(OUT / f'{NAME}.blend'), {scene}, compress=True)
    print('RESULT', json.dumps({'status': 'exported', 'assets': list(roots), 'output': str(OUT)}))
finally:
    pass


