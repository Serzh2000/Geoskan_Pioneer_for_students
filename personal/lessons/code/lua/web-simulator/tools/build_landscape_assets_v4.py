"""Landscape kit v4: emergency services, aircraft and wind-turbine parts for the living training map.

Original geometry, no external assets. Runs in Blender (GUI via the MCP add-on, or headless):
    blender --background --factory-startup --python tools/build_landscape_assets_v4.py
Same conventions as v1-v3 (vehicles and aircraft face +X; rotor and boom are pivot-centred parts): metres, Z up, origin at footprint centre on the ground, front faces -Y,
at most 5000 triangles and 6 materials per model, flat colours only (no textures).
"""
import bpy
import bmesh
import json
import math
from pathlib import Path
from mathutils import Vector

OUT = Path(globals().get('__file__', 'tools/build_landscape_assets_v4.py')).resolve().parents[1] / 'public/assets/models/props'
NAME = 'landscape-kit-v4'
for extension in ['blend', 'glb', 'mesh.json']:
    if (OUT / f'{NAME}.{extension}').exists() and not globals().get('REBUILD_LANDSCAPE_KIT', False):
        raise RuntimeError('Refusing to overwrite an existing landscape export (set REBUILD_LANDSCAPE_KIT = True)')

scene = bpy.context.scene
scene.name = 'Pioneer landscape kit v4'
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
    Concrete=mat('Concrete', (.55, .54, .5), .95),
    Steel=mat('GalvSteel', (.5, .54, .56), .45, .7),
    Roof=mat('DarkRoof', (.13, .15, .17), .6, .25),
    Trim=mat('WhiteTrim', (.82, .82, .76)),
    Red=mat('FireRed', (.75, .07, .06), .55),
    White=mat('PaintWhite', (.9, .92, .93), .5),
    Orange=mat('SafetyOrange', (.92, .45, .06), .55),
    Glass=mat('DarkGlass', (.08, .17, .2), .3, .2),
    Brick=mat('StationBrick', (.62, .22, .16), .9),
    Yellow=mat('Yellow', (.95, .78, .12), .6),
    Blue=mat('PlaneBlue', (.1, .25, .55), .5),
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
    # ---- Fire station: three bays, a hose tower and a flat roof with a parapet ------------------------
    root('FireStation')
    box('Slab', (0, 0, .1), (24, 15, .2), M['Concrete'])
    box('Walls', (0, 0, 2.9), (22, 13, 5.4), M['Brick'])
    box('Roof', (0, 0, 5.7), (22.6, 13.6, .3), M['Roof'])
    box('Parapet', (0, 0, 6.1), (22.6, 13.6, .5), M['Trim'])
    box('RoofCut', (0, 0, 6.2), (21.4, 12.4, .55), M['Roof'])
    for i, x in enumerate((-6.5, 0, 6.5)):
        box('BayFrame', (x, -6.55, 2.1), (5.3, .2, 4.2), M['Trim'])
        box('BayDoor', (x, -6.66, 2.0), (4.9, .08, 3.9), M['Trim'])
        for z in (.8, 1.6, 2.4, 3.2):
            box('DoorRib', (x, -6.72, z), (4.8, .04, .08), M['Roof'])
    box('Stripe', (0, -6.62, 4.7), (22, .1, .6), M['Red'])
    box('Tower', (-8.7, 4.4, 7.0), (4.2, 4.2, 14.0), M['Brick'])
    box('TowerCap', (-8.7, 4.4, 14.25), (4.8, 4.8, .5), M['Trim'])
    box('TowerWindow', (-8.7, 2.27, 11.5), (1.6, .06, 2.0), M['Glass'])
    for z in (4.5, 7.5):
        box('TowerWindow', (-8.7, 2.27, z), (1.2, .06, 1.6), M['Glass'])
    for x in (-3.3, 3.3):
        box('Window', (x, -6.52, 4.9), (1.4, .06, .9), M['Glass'])
    box('Sign', (0, -6.7, 5.25), (6.0, .08, .55), M['Red'])
    # window frames and sills, personnel door with canopy, side windows, roof plant, tower slots
    for x in (-3.3, 3.3):
        box('WindowFrame', (x, -6.5, 4.9), (1.7, .04, 1.2), M['Trim'])
        box('WindowSill', (x, -6.62, 4.27), (1.9, .22, .1), M['Trim'])
    box('PersonnelDoor', (10.1, -6.53, 1.15), (1.2, .06, 2.3), M['Glass'])
    box('PersonnelFrame', (10.1, -6.51, 1.3), (1.5, .04, 2.5), M['Trim'])
    box('Canopy', (10.1, -6.95, 2.55), (1.9, .9, .1), M['Red'])
    box('Step', (10.1, -6.85, .05), (1.6, .6, .1), M['Concrete'])
    for y in (-3.0, 0.0, 3.0):
        box('SideWindow', (11.02, y, 3.4), (.06, 1.2, 1.4), M['Glass'])
        box('SideFrame', (11.01, y, 3.4), (.04, 1.5, 1.7), M['Trim'])
    for x in (-3.0, 4.0):
        box('RoofUnit', (x, 1.5, 6.88), (1.8, 1.2, .8), M['Roof'])
        box('RoofUnitCap', (x, 1.5, 7.32), (1.9, 1.3, .08), M['Trim'])
    for z in (9.5, 13.0):
        for w in (-.9, .9):
            box('TowerSlot', (-8.7 + w, 2.27, z), (.4, .06, 1.6), M['Roof'])
    box('TowerFrame', (-8.7, 2.285, 11.5), (2.0, .03, 2.4), M['Trim'])

    # ---- Fire truck: cab, locker body with roller shutters, roof ladder, hoses, monitor and six wheels (front is +X) ----
    root('FireTruck')

    def truck_wheel(x, s, track=1.32):
        cylinder('Wheel', (x, s * track, .55), .55, .36, M['Roof'], 16, rot=(math.pi / 2, 0, 0))
        cylinder('Hub', (x, s * (track + .2), .55), .27, .05, M['Steel'], 8, rot=(math.pi / 2, 0, 0))
        cylinder('Arch', (x, s * (track - .05), .6), .6, .05, M['Roof'], 16, rot=(math.pi / 2, 0, 0))
        box('Mudguard', (x, s * (track + .04), 1.24), (1.5, .3, .06), M['Roof'])

    box('Chassis', (0, 0, .7), (8.6, 2.2, .3), M['Roof'])
    box('Body', (-1.15, 0, 1.95), (6.0, 2.5, 2.2), M['Red'])
    box('Cab', (3.0, 0, 2.025), (2.3, 2.5, 2.35), M['Red'])
    box('CabGlass', (4.16, 0, 2.55), (.06, 2.2, 1.0), M['Glass'])
    box('Grille', (4.17, 0, 1.45), (.05, 1.3, .5), M['Roof'])
    box('RoofPlate', (-1.15, 0, 3.09), (5.9, 2.3, .08), M['Steel'])
    box('CabRoof', (3.0, 0, 3.22), (2.1, 2.3, .06), M['White'])
    for s in (-1, 1):
        box('Headlight', (4.17, s * 1.0, 1.45), (.05, .3, .22), M['White'])
        box('CabWindow', (3.2, s * 1.27, 2.55), (1.4, .05, .9), M['Glass'])
        for x in (2.35, 4.02):
            box('DoorSeam', (x, s * 1.27, 2.1), (.04, .04, 1.7), M['Roof'])
        box('DoorHandle', (2.6, s * 1.285, 1.85), (.22, .04, .06), M['Steel'])
        box('Mirror', (4.0, s * 1.45, 2.65), (.12, .2, .4), M['Roof'])
        box('MirrorArm', (4.0, s * 1.33, 2.5), (.05, .22, .05), M['Steel'])
        box('Stripe', (-1.15, s * 1.265, 1.28), (5.9, .03, .1), M['White'])
        for x in (-3.3, -1.7, -.1):
            box('Shutter', (x, s * 1.28, 2.0), (1.4, .06, 1.3), M['Steel'])
            for z in (1.6, 1.9, 2.2, 2.5):
                box('ShutterRib', (x, s * 1.315, z), (1.4, .02, .04), M['Roof'])
            box('ShutterHandle', (x, s * 1.32, 1.4), (.3, .03, .06), M['Roof'])
        for x in (-3.0, 0.2, 3.0):
            truck_wheel(x, s)
        box('RearLamp', (-4.18, s * .95, 1.5), (.05, .22, .3), M['White'])
        box('Hose', (-3.0, s * 1.0, 3.28), (3.4, .2, .2), M['White'])
        box('HoseBand', (-3.0, s * 1.0, 3.28), (.08, .24, .24), M['Roof'])
        box('LadderRail', (-1.8, s * .45, 3.37), (5.2, .08, .1), M['Steel'])
        for x in (-3.9, -1.8, .3):
            box('LadderPost', (x, s * .45, 3.24), (.1, .1, .2), M['Steel'])
        box('Beacon', (3.0, s * .55, 3.4), (.3, .4, .14), M['White'])
    for i in range(10):
        box('LadderRung', (-4.0 + i * .5, 0, 3.37), (.05, .9, .05), M['Steel'])
    cylinder('MonitorBase', (.95, 0, 3.26), .22, .3, M['Steel'], 10)
    box('MonitorBarrel', (1.35, 0, 3.4), (.9, .12, .12), M['Steel'])
    box('RearStep', (-4.35, 0, .6), (.3, 1.9, .1), M['Steel'])
    box('PumpPanel', (-4.18, 0, 2.1), (.06, 1.5, .9), M['Steel'])
    box('LightBar', (3.0, 0, 3.3), (.35, 1.6, .1), M['Steel'])
    box('Bumper', (4.3, 0, .8), (.3, 2.5, .4), M['White'])

    # ---- Repair truck: crew cab, locker bed, headache rack, cable drum on a frame, outriggers ------------
    root('RepairTruck')

    def rwheel(x, s):
        cylinder('Wheel', (x, s * 1.3, .55), .55, .36, M['Roof'], 16, rot=(math.pi / 2, 0, 0))
        cylinder('Hub', (x, s * 1.5, .55), .27, .05, M['Steel'], 8, rot=(math.pi / 2, 0, 0))
        cylinder('Arch', (x, s * 1.25, .6), .6, .05, M['Roof'], 16, rot=(math.pi / 2, 0, 0))
        box('Mudguard', (x, s * 1.34, 1.24), (1.5, .3, .06), M['Roof'])

    box('Chassis', (0, 0, .7), (7.4, 2.2, .3), M['Roof'])
    box('Cab', (2.6, 0, 2.0), (2.2, 2.4, 2.1), M['White'])
    box('CabGlass', (3.71, 0, 2.5), (.06, 2.1, 1.0), M['Glass'])
    box('Grille', (3.72, 0, 1.4), (.05, 1.3, .45), M['Roof'])
    box('CabRoof', (2.6, 0, 3.07), (2.0, 2.2, .06), M['Orange'])
    box('Bed', (-1.4, 0, 1.35), (4.8, 2.4, .9), M['White'])
    box('BedDeck', (-1.4, 0, 1.84), (4.8, 2.4, .08), M['Steel'])
    box('Mount', (-2.5, 0, 2.2), (1.4, 1.2, .5), M['Steel'])
    # cable drum: flanges, core and wound cable on a frame
    for y in (-.62, .62):
        cylinder('DrumFlange', (-.2, y, 2.55), .65, .1, M['Orange'], 16, rot=(math.pi / 2, 0, 0))
        box('DrumFrame', (-.2, y * 1.15, 2.15), (.2, .08, .6), M['Steel'])
    cylinder('DrumCable', (-.2, 0, 2.55), .5, 1.14, M['Roof'], 16, rot=(math.pi / 2, 0, 0))
    cylinder('DrumCore', (-.2, 0, 2.55), .15, 1.4, M['Steel'], 8, rot=(math.pi / 2, 0, 0))
    for s in (-1, 1):
        box('CabWindow', (2.7, s * 1.22, 2.5), (1.4, .05, .9), M['Glass'])
        box('Stripe', (-1.2, s * 1.21, 1.6), (4.6, .05, .25), M['Orange'])
        box('DoorSeam', (1.9, s * 1.22, 2.0), (.04, .04, 1.6), M['Roof'])
        box('DoorHandle', (2.1, s * 1.235, 1.8), (.22, .04, .06), M['Steel'])
        box('Headlight', (3.73, s * .95, 1.4), (.05, .3, .2), M['Orange'])
        for x in (-3.0, -1.6, -.2):
            box('Locker', (x, s * 1.22, 1.3), (1.3, .05, .6), M['Steel'])
            box('LockerHandle', (x, s * 1.255, 1.3), (.3, .03, .05), M['Roof'])
        for x in (-2.6, 1.0, 2.9):
            rwheel(x, s)
        box('RackPost', (1.2, s * 1.0, 2.5), (.1, .1, 1.1), M['Steel'])
        box('RearLamp', (-3.82, s * .9, 1.4), (.05, .22, .25), M['Orange'])
        box('Outrigger', (-3.5, s * 1.6, .45), (.3, .8, .2), M['Steel'])
        box('OutriggerLeg', (-3.5, s * 1.8, .25), (.16, .16, .5), M['Steel'])
        box('OutriggerPad', (-3.5, s * 1.8, .03), (.4, .4, .06), M['Steel'])
        box('Mirror', (3.5, s * 1.4, 2.6), (.12, .2, .4), M['Roof'])
    box('RackTop', (1.2, 0, 3.05), (.1, 2.1, .1), M['Steel'])
    box('Beacon', (2.6, 0, 3.2), (.5, 1.2, .16), M['Orange'])
    box('RearBumper', (-3.85, 0, .75), (.2, 2.3, .3), M['Steel'])

    # ---- Repair boom: pivot at the origin, extends along +X, telescopic arm with hydraulic ram and bucket ------
    root('RepairBoom')
    cylinder('Pivot', (0, 0, 0), .3, .8, M['Steel'], 12, rot=(math.pi / 2, 0, 0))
    for y in (-.3, .3):
        box('Yoke', (0, y, -.02), (.7, .08, .68), M['Steel'])
    box('ArmBase', (3.0, 0, 0), (6.0, .44, .44), M['Orange'])
    box('ArmCollar', (6.0, 0, 0), (.3, .52, .52), M['Steel'])
    box('ArmTip', (8.4, 0, 0), (4.8, .32, .32), M['Orange'])
    box('ArmStripe', (3.0, 0, .222), (5.6, .2, .02), M['Orange'])
    strut('RamBarrel', (.9, 0, -.3), (3.0, 0, -.12), .14, M['Steel'])
    strut('RamRod', (3.0, 0, -.12), (4.4, 0, -.05), .07, M['Steel'])
    box('Floor', (11.4, 0, -.45), (1.2, 1.0, .12), M['Steel'])
    for dy in (-.5, .5):
        box('BucketWall', (11.4, dy, -.05), (1.2, .06, .8), M['White'])
        box('BucketRail', (11.4, dy, .45), (1.2, .08, .06), M['Orange'])
        box('BucketStripe', (11.4, dy * 1.06, -.2), (1.2, .02, .12), M['Orange'])
    box('BucketFront', (12.0, 0, -.05), (.06, 1.0, .8), M['White'])
    box('BucketBack', (10.83, 0, -.05), (.06, 1.0, .8), M['White'])
    box('BucketFrontRail', (12.0, 0, .45), (.08, 1.0, .06), M['Orange'])
    strut('Support', (10.4, 0, -.12), (10.9, 0, -.45), .08, M['Steel'])
    box('Lamp', (10.6, 0, .25), (.2, .2, .2), M['Orange'])

    # ---- Light aircraft: lofted fuselage, tapered high wing with ailerons, struts, spatted gear (nose is +X) ----
    root('Airplane')

    def loft(name, rings, sides, material):
        """rings: (x, half_width, z_centre, half_height); a closed tube along X."""
        verts = []
        for x, hw, zc, hh in rings:
            for i in range(sides):
                a = 2 * math.pi * i / sides
                verts.append((x, hw * math.cos(a), zc + hh * math.sin(a)))
        faces = []
        for r in range(len(rings) - 1):
            for i in range(sides):
                j = (i + 1) % sides
                faces.append((r * sides + i, r * sides + j, (r + 1) * sides + j, (r + 1) * sides + i))
        faces.append(tuple(reversed(range(sides))))
        n = (len(rings) - 1) * sides
        faces.append(tuple(n + i for i in range(sides)))
        return prism(name, verts, faces, material)

    def wing_slab(name, stations, material):
        """stations: (y, x_leading, x_trailing, z_centre, thickness); a lofted flat section across the span."""
        verts = []
        for y, xl, xt, zc, th in stations:
            verts += [(xl, y, zc - th / 2), (xt, y, zc - th / 2), (xt, y, zc + th / 2), (xl, y, zc + th / 2)]
        faces = []
        for k in range(len(stations) - 1):
            a, b = k * 4, (k + 1) * 4
            for i in range(4):
                j = (i + 1) % 4
                faces.append((a + i, a + j, b + j, b + i))
        faces.append((3, 2, 1, 0))
        n = (len(stations) - 1) * 4
        faces.append((n, n + 1, n + 2, n + 3))
        return prism(name, verts, faces, material)

    loft('Fuselage', [(3.0, .52, 1.75, .5), (2.2, .6, 1.8, .6), (.9, .62, 1.9, .68), (-.6, .55, 1.95, .62),
                      (-2.0, .38, 2.0, .42), (-3.2, .2, 2.05, .24), (-3.8, .1, 2.08, .14)], 8, M['White'])
    cylinder('Cowl', (3.0, 0, 1.75), .52, .5, M['White'], 12, rot=(0, math.pi / 2, 0))
    cone('Nose', (3.75, 0, 1.75), .55, .14, 1.0, M['Red'], 16, rot=(0, math.pi / 2, 0))
    box('Windshield', (1.65, 0, 2.38), (.7, .86, .45), M['Glass'], rot=(0, -.5, 0))
    for s in (-1, 1):
        box('CabinWindow', (.5, s * .6, 2.15), (1.7, .04, .5), M['Glass'])
        box('RearWindow', (-.9, s * .5, 2.2), (.8, .04, .36), M['Glass'])
        box('DoorLine', (1.35, s * .62, 1.8), (.04, .04, .95), M['Steel'])
    wing_slab('Wing', [(-4.8, .15, .85, 2.78, .1), (-.7, -.2, 1.0, 2.76, .18), (.7, -.2, 1.0, 2.76, .18), (4.8, .15, .85, 2.78, .1)], M['White'])
    for s in (-1, 1):
        box('WingTip', (.5, s * 4.85, 2.78), (.7, .12, .08), M['Red'])
        box('Aileron', (.8, s * 3.3, 2.78), (.3, 2.2, .06), M['Red'])
        box('Flap', (.9, s * 1.4, 2.78), (.26, 1.3, .07), M['Steel'])
        strut('WingStrut', (.5, s * .55, 1.45), (.45, s * 3.1, 2.7), .07, M['Steel'])
        strut('JuryStrut', (.45, s * 1.6, 2.1), (.45, s * 1.6, 2.7), .04, M['Steel'])
    box('TailFin', (-3.3, 0, 2.7), (1.1, .1, 1.3), M['Red'], rot=(0, .25, 0))
    box('Rudder', (-3.75, 0, 2.7), (.4, .06, 1.2), M['White'])
    wing_slab('Stabilizer', [(-1.6, -3.7, -3.0, 2.1, .06), (0, -3.5, -2.6, 2.1, .1), (1.6, -3.7, -3.0, 2.1, .06)], M['White'])
    box('Elevator', (-3.85, 0, 2.1), (.35, 3.0, .05), M['Red'])
    box('GearBar', (.7, 0, .78), (.12, 2.2, .12), M['Steel'])
    for s in (-1, 1):
        strut('GearLeg', (.7, s * .35, 1.4), (.7, s * 1.1, .6), .09, M['Steel'])
        cylinder('Wheel', (.7, s * 1.1, .38), .38, .22, M['Roof'], 14, rot=(math.pi / 2, 0, 0))
        cylinder('WheelHub', (.7, s * 1.23, .38), .17, .04, M['Steel'], 8, rot=(math.pi / 2, 0, 0))
    cylinder('TailWheel', (-3.3, 0, .2), .18, .12, M['Roof'], 10, rot=(math.pi / 2, 0, 0))
    strut('TailLeg', (-2.8, 0, 1.9), (-3.3, 0, .3), .06, M['Steel'])
    box('PropBlade', (4.45, 0, 1.75), (.1, .2, 2.1), M['Roof'])
    cylinder('PropHub', (4.4, 0, 1.75), .1, .08, M['Steel'], 8, rot=(0, math.pi / 2, 0))
    strut('Exhaust', (2.6, -.4, 1.45), (1.9, -.55, 1.35), .06, M['Steel'])
    strut('Antenna', (.0, 0, 2.3), (-.4, 0, 3.0), .03, M['Steel'])

    # ---- Wind turbine, split into a fixed tower and a rotor that the world spins -----------------------------
    root('WindTurbineTower')
    cylinder('Foundation', (0, 0, .25), 1.8, .5, M['Concrete'], 16)
    cone('Tower', (0, 0, 9.3), 1.15, .62, 18.5, M['White'], 16)
    box('Nacelle', (0, .2, 19.4), (1.7, 4.2, 1.7), M['White'])
    box('Door', (0, -1.1, 1.05), (.6, .08, 1.7), M['Steel'])
    box('Stripe', (0, 0, 12.0), (1.4, 1.4, .6), M['Red'])

    root('TurbineRotor')
    cylinder('Hub', (0, -.25, 0), .62, .8, M['Steel'], 16, rot=(math.pi / 2, 0, 0))
    cone('Spinner', (0, -.9, 0), .62, .05, 1.0, M['White'], 16, rot=(math.pi / 2, 0, 0))
    for i in range(3):
        a = i * 2 * math.pi / 3
        c, s = math.cos(a), math.sin(a)
        r0, r1, w0, w1, t = .55, 9.55, .9, .22, .22
        def pt(u, z, y):
            return (u * c + z * s, y, -u * s + z * c)
        v = [pt(-w0 / 2, r0, -t / 2), pt(w0 / 2, r0, -t / 2), pt(w0 / 2, r0, t / 2), pt(-w0 / 2, r0, t / 2),
             pt(-w1 / 2, r1, -t / 4), pt(w1 / 2, r1, -t / 4), pt(w1 / 2, r1, t / 4), pt(-w1 / 2, r1, t / 4)]
        f = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
        prism('Blade', v, f, M['White'])
        a0, b0 = .55 + 7.6, .55 + 9.0
        tv = [pt(-.24 / 2 - .01, a0, -.13), pt(.24 / 2 + .01, a0, -.13), pt(.24 / 2 + .01, a0, .13), pt(-.24 / 2 - .01, a0, .13),
              pt(-.2 / 2 - .005, b0 + .55, -.13), pt(.2 / 2 + .005, b0 + .55, -.13), pt(.2 / 2 + .005, b0 + .55, .13), pt(-.2 / 2 - .005, b0 + .55, .13)]
        prism('BladeTip', tv, f, M['Red'])

    bpy.context.view_layer.update()
    bundle = {'version': 4, 'coordinates': 'metres; Z up; origin at footprint centre, ground level',
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


