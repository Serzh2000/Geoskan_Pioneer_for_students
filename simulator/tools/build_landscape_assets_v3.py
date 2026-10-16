"""Landscape kit v3: power line, airfield, town and harbour landmarks for the procedural training map.

Original geometry, no external assets. Runs in Blender (GUI via the MCP add-on, or headless):
    blender --background --factory-startup --python tools/build_landscape_assets_v3.py
Same conventions as v1/v2: metres, Z up, origin at footprint centre on the ground, front faces -Y,
at most 5000 triangles and 6 materials per model, flat colours only (no textures).
"""
import bpy
import bmesh
import json
import math
from pathlib import Path
from mathutils import Vector

OUT = Path(globals().get('__file__', 'tools/build_landscape_assets_v3.py')).resolve().parents[1] / 'public/assets/models/props'
NAME = 'landscape-kit-v3'
for extension in ['blend', 'glb', 'mesh.json']:
    if (OUT / f'{NAME}.{extension}').exists() and not globals().get('REBUILD_LANDSCAPE_KIT', False):
        raise RuntimeError('Refusing to overwrite an existing landscape export (set REBUILD_LANDSCAPE_KIT = True)')

scene = bpy.context.scene
scene.name = 'Pioneer landscape kit v3'
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
    Galv=mat('Galvanized', (.66, .68, .66), .5, .5),
    Roof=mat('DarkRoof', (.13, .15, .17), .6, .25),
    Trim=mat('WhiteTrim', (.82, .82, .76)),
    Red=mat('SignalRed', (.78, .1, .08), .6),
    White=mat('PaintWhite', (.9, .92, .93), .5),
    Orange=mat('Orange', (.9, .42, .08), .6),
    Glass=mat('DarkGlass', (.08, .17, .2), .3, .2),
    Brick=mat('Brick', (.45, .2, .14), .9),
    Plaster=mat('ChurchPlaster', (.86, .83, .72), .9),
    Copper=mat('Copper', (.25, .55, .45), .5, .4),
    Asphalt=mat('Asphalt', (.19, .2, .21), .95),
    Yellow=mat('Yellow', (.95, .78, .12), .6),
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
    def extrude_x(name, pts_yz, x0, thick, material):
        """A closed polygon in the YZ plane, extruded along X."""
        n = len(pts_yz)
        verts = [(x0 - thick / 2, y, z) for y, z in pts_yz] + [(x0 + thick / 2, y, z) for y, z in pts_yz]
        faces = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
        for i in range(n):
            j = (i + 1) % n
            faces.append((i, j, n + j, n + i))
        return prism(name, verts, faces, material)

    def pointed_x(x, y, zb, width, height, thick, material):
        """A small triangular gable (window head) in the YZ plane."""
        return extrude_x('Head', [(y - width / 2, zb), (y + width / 2, zb), (y, zb + height)], x, thick, material)

    # ---- Power pylon: lattice tower with truss cross-arms and insulator strings; the generator strings the wires ----
    root('PowerPylon')
    cylinder('Foot', (0, 0, .2), 1.6, .4, M['Concrete'], 12)
    leg = [(math.cos(a), math.sin(a)) for a in (math.pi / 4, 3 * math.pi / 4, 5 * math.pi / 4, 7 * math.pi / 4)]

    def ring4(z):
        r = 1.25 - .8 * min(1, z / 11)
        return [Vector((x * r, y * r, z)) for x, y in leg]
    levels = [.3, 3.5, 7, 10.5, 13.4]
    for k in range(len(levels) - 1):
        a, b = ring4(levels[k]), ring4(levels[k + 1])
        for i in range(4):
            strut('Leg', a[i], b[i], .14, M['Steel'])
            strut('Ring', b[i], b[(i + 1) % 4], .07, M['Steel'])
            strut('Brace', a[i], b[(i + 1) % 4], .06, M['Steel'])
            strut('Brace', a[(i + 1) % 4], b[i], .05, M['Steel'])
    for z, span in ((10.2, 5.4), (12.2, 4.2), (14.0, 3.0)):
        for side in (-1, 1):
            strut('ArmChord', (0, 0, z), (0, side * span, z), .14, M['Steel'])
            strut('ArmBrace', (0, side * .4, z - .9), (0, side * span, z - .05), .07, M['Steel'])
            strut('ArmBrace', (0, side * .4, z + .8), (0, side * span * .8, z + .05), .06, M['Steel'])
            strut('ArmBrace', (0, side * span * .8, z + .05), (0, side * span, z - .05), .05, M['Steel'])
            box('InsulatorCap', (0, side * span, z - .15), (.22, .22, .12), M['Steel'])
            for k in range(5):
                cylinder('Insulator', (0, side * span, z - .3 - k * .16), .17, .07, M['White'], 8)
            cylinder('InsulatorStem', (0, side * span, z - .65), .06, .8, M['White'], 6)
            box('Clamp', (0, side * span, z - 1.1), (.2, .2, .14), M['Steel'])
    box('Top', (0, 0, 14.6), (.2, .2, 1.2), M['Steel'])
    for side in (-1, 1):
        strut('ShieldArm', (0, 0, 14.2), (0, side * 1.4, 15.15), .06, M['Steel'])

    # ---- Hangar: arched aircraft shed with ribs, skylights, closed gable ends and sliding doors ----------------
    root('Hangar')
    box('Slab', (0, 0, .1), (22, 16.4, .2), M['Concrete'])
    box('Walls', (0, 0, 2.6), (19.8, 14.8, 5.0), M['Galv'])
    N = 16
    angles = [math.pi * i / N for i in range(N + 1)]

    def ell(a, ry, rz):
        return (-ry * math.cos(a), 5.0 + rz * math.sin(a))

    def shell(r0y, r0z, r1y, r1z, a_from, a_to, steps):
        aa = [a_from + (a_to - a_from) * k / steps for k in range(steps + 1)]
        return [ell(a, r1y, r1z) for a in aa] + [ell(a, r0y, r0z) for a in reversed(aa)]

    arc = [ell(a, 7.4, 3.6) for a in angles]
    extrude_x('Roof', shell(7.4, 3.6, 7.55, 3.75, 0, math.pi, N), 0, 20.4, M['Roof'])
    for x in (-9, -6, -3, 0, 3, 6, 9):
        extrude_x('Rib', shell(7.55, 3.75, 7.7, 3.9, 0, math.pi, N), x, .22, M['Steel'])
    for x in (-7.5, -4.5, -1.5, 1.5, 4.5, 7.5):
        extrude_x('Skylight', shell(7.55, 3.75, 7.62, 3.82, math.pi * 5 / 16, math.pi * 11 / 16, 6), x, 2.4, M['Glass'])
    for x in (-9.95, 9.95):
        extrude_x('GableEnd', arc, x, .2, M['Galv'])
        box('GableBand', (x, 0, 5.05), (.24, 14.8, .3), M['Red'])
    box('DoorFrame', (0, -7.5, 2.8), (14.2, .25, 5.5), M['Steel'])
    for x in (-3.5, 3.5):
        box('DoorLeaf', (x, -7.65, 2.7), (6.8, .08, 5.2), M['Galv'])
    for z in (.8, 2.0, 3.2, 4.4):
        box('DoorRib', (0, -7.7, z), (13.8, .04, .08), M['Steel'])
    box('DoorTrack', (0, -7.75, 5.55), (18.0, .1, .12), M['Steel'])
    for x in (-8, -4, 0, 4, 8):
        box('DoorHanger', (x, -7.72, 5.45), (.14, .1, .3), M['Steel'])
    box('DoorGuide', (0, -7.7, .08), (14.0, .12, .1), M['Steel'])
    box('Stripe', (0, -7.55, 5.55), (19.8, .06, .5), M['Red'])
    for x in (-5.5, 5.5):
        box('FrontLamp', (x, -7.5, 6.3), (.3, .2, .3), M['Glass'])
    box('SideDoor', (9.9, -2.5, 1.1), (.12, 1.0, 2.1), M['Steel'])
    box('SideDoorFrame', (9.88, -2.5, 1.2), (.1, 1.3, 2.4), M['Concrete'])
    box('SideDoorLamp', (9.95, -3.5, 2.6), (.12, .2, .2), M['Glass'])
    for y in (-4.5, 3.0):
        box('SideWindow', (9.9, y, 3.4), (.1, 1.8, .9), M['Glass'])
        box('SideWindow', (-9.9, y, 3.4), (.1, 1.8, .9), M['Glass'])
    for y in (-7.2, 7.2):
        box('Downpipe', (9.95, y, 2.5), (.12, .12, 5.0), M['Steel'])
        box('Downpipe', (-9.95, y, 2.5), (.12, .12, 5.0), M['Steel'])

    # ---- Windsock: tapered pole, swivel arm, ring and tapered striped sock ---------------------------------------------
    root('Windsock')
    cylinder('Base', (0, 0, .15), .5, .3, M['Concrete'], 12)
    cylinder('Flange', (0, 0, .33), .22, .06, M['Steel'], 8)
    cone('Pole', (0, 0, 3.1), .1, .06, 5.9, M['Steel'], 8)
    cylinder('Collar', (0, 0, 1.2), .12, .08, M['Steel'], 8)
    box('SwivelBlock', (0, 0, 6.0), (.14, .14, .2), M['Steel'])
    box('Arm', (0, -.22, 6.1), (.06, .5, .06), M['Steel'])
    cylinder('Ring', (0, -.45, 6.1), .42, .05, M['Steel'], 16, rot=(math.pi / 2, 0, 0))
    for a in (0, 1):
        box('Spoke', (0, -.45, 6.1), (.84 if a == 0 else .04, .04, .04 if a == 0 else .84), M['Steel'])
    for i in range(5):
        cone('Sock', (0, -.7 - i * .42, 6.1), .4 - i * .05, .4 - (i + 1) * .05, .42, M['Orange'] if i % 2 == 0 else M['White'], 12, rot=(math.pi / 2, 0, 0))
    box('Light', (0, 0, 6.2), (.2, .2, .2), M['Red'])
    strut('Spike', (0, 0, 6.3), (0, 0, 6.5), .03, M['Steel'])

    # ---- Church: nave with buttresses and pointed windows, porch, tower with clock, belfry and spire ----------------------
    root('Church')
    box('Plinth', (0, 0, .2), (7.4, 12.4, .4), M['Concrete'])
    box('PorchSlab', (0, -6.85, .1), (4.2, .9, .2), M['Concrete'])
    box('Nave', (0, 1, 2.8), (6.8, 10, 5.0), M['Plaster'])
    gable('NaveEnds', 6.8, 10.05, 5.3, 8.0, M['Plaster'])
    roof_slabs('NaveRoof', 6.8, 10, 5.3, 8.0, .16, M['Roof'], .3)
    box('RidgeCap', (0, 1, 8.07), (.25, 10.6, .1), M['Roof'])
    box('Tower', (0, -5.1, 5.725), (3.6, 3.6, 11.45), M['Plaster'])
    box('Belfry', (0, -5.1, 11.6), (3.9, 3.9, .3), M['Concrete'])
    box('TowerBand', (0, -5.1, 7.0), (3.8, 3.8, .2), M['Concrete'])
    for side in (-1, 1):
        box('LouverFrame', (side * 1.81, -5.1, 10.2), (.05, 1.6, 2.4), M['Concrete'])
        box('LouverFrame', (0, -5.1 + side * 1.81, 10.2), (1.6, .05, 2.4), M['Concrete'])
        box('Louver', (side * 1.84, -5.1, 10.2), (.06, 1.3, 2.1), M['Glass'])
        box('Louver', (0, -5.1 + side * 1.84, 10.2), (1.3, .06, 2.1), M['Glass'])
        for z in (9.6, 10.0, 10.4, 10.8):
            box('LouverSlat', (side * 1.87, -5.1, z), (.04, 1.3, .05), M['Roof'])
            box('LouverSlat', (0, -5.1 + side * 1.87, z), (1.3, .04, .05), M['Roof'])
    cone('Spire', (0, -5.1, 14.6), 2.5, .12, 5.6, M['Copper'], 4, rot=(0, 0, math.pi / 4))
    box('CrossV', (0, -5.1, 17.9), (.1, .1, 1.2), M['Copper'])
    box('CrossH', (0, -5.1, 18.1), (.7, .1, .1), M['Copper'])
    cylinder('Clock', (0, -6.93, 8.4), .65, .08, M['Concrete'], 16, rot=(math.pi / 2, 0, 0))
    box('ClockHandA', (0, -6.99, 8.55), (.06, .03, .5), M['Roof'])
    box('ClockHandB', (.18, -6.99, 8.4), (.36, .03, .06), M['Roof'])
    # entrance: arched frame, door leaves, hood and steps
    box('DoorFrame', (0, -6.91, 1.7), (1.9, .06, 2.9), M['Concrete'])
    door_head = gable('DoorHead', 1.9, .06, 0, .7, M['Concrete'])
    door_head.location = (0, -6.91, 3.15)
    box('Door', (0, -6.95, 1.55), (1.5, .08, 2.7), M['Brick'])
    box('DoorSeam', (0, -7.0, 1.55), (.04, .03, 2.7), M['Roof'])
    for x in (-.15, .15):
        box('DoorHandle', (x, -7.0, 1.5), (.05, .04, .25), M['Concrete'])
    box('Hood', (0, -7.1, 3.45), (2.4, .6, .1), M['Roof'], rot=(.2, 0, 0))
    for x in (-1.1, 1.1):
        box('HoodBracket', (x, -7.0, 3.2), (.1, .5, .1), M['Concrete'])
    box('Step', (0, -7.2, .1), (2.4, .4, .2), M['Concrete'])
    # side walls: buttresses and framed pointed windows
    for side in (-1, 1):
        for y in (-2.5, .5, 3.5):
            box('Buttress', (side * 3.55, y, 1.9), (.3, .45, 3.8), M['Concrete'])
            box('ButtressCap', (side * 3.55, y, 3.9), (.3, .55, .12), M['Concrete'], rot=(0, 0, 0))
        for y in (-1, 2, 5):
            box('WindowFrame', (side * 3.42, y, 3.15), (.05, 1.1, 2.0), M['Concrete'])
            box('Window', (side * 3.45, y, 3.1), (.08, .9, 1.7), M['Glass'])
            pointed_x(side * 3.45, y, 3.95, .9, .55, .08, M['Glass'])
            box('WindowMullion', (side * 3.5, y, 3.1), (.04, .05, 1.7), M['Concrete'])
            box('WindowSill', (side * 3.5, y, 2.15), (.2, 1.2, .08), M['Concrete'])
    cylinder('RoseFrame', (0, 6.05, 6.0), .65, .06, M['Concrete'], 16, rot=(math.pi / 2, 0, 0))
    cylinder('RoseWindow', (0, 6.08, 6.0), .5, .06, M['Glass'], 12, rot=(math.pi / 2, 0, 0))

    # ---- Gas station: canopy over two pump islands plus a shop ------------------------------------------------------------
    root('GasStation')
    box('Forecourt', (0, 0, .05), (16, 12, .1), M['Concrete'])
    for x in (-6.5, -4.5, 4.5, 6.5):
        box('BayLine', (x, -1.5, .105), (.1, 3.0, .02), M['White'])
    for x in (-5.5, 5.5):
        box('Pillar', (x, 0, 2.6), (.5, .5, 5.2), M['White'])
        box('PillarBase', (x, 0, .2), (.7, .7, .4), M['Roof'])
        box('PillarBand', (x, 0, 1.2), (.54, .54, .3), M['Red'])
    box('Canopy', (0, 0, 5.4), (13.5, 7.5, .5), M['White'])
    box('CanopyStripe', (0, 0, 5.4), (13.6, 7.6, .16), M['Red'])
    for x in (-4.5, 0, 4.5):
        for y in (-1.8, 1.8):
            box('CanopyLight', (x, y, 5.13), (.5, .5, .04), M['Glass'])
    for x in (-2.2, 2.2):
        box('Island', (x, 0, .2), (.9, 4.4, .2), M['Concrete'])
        for y in (-1.3, 1.3):
            box('PumpBase', (x, y, .35), (.66, .56, .12), M['Roof'])
            box('Pump', (x, y, .95), (.6, .5, 1.3), M['Red'])
            box('PumpCap', (x, y, 1.64), (.68, .58, .12), M['White'])
            box('PumpGlass', (x, y - .26, 1.2), (.4, .02, .4), M['Glass'])
            box('PumpPanel', (x, y - .26, .8), (.34, .02, .25), M['White'])
            box('Nozzle', (x + .33, y, 1.0), (.06, .1, .3), M['Roof'])
            box('Hose', (x - .33, y, 1.0), (.04, .1, .7), M['Roof'])
        for y in (-2.45, 2.45):
            cylinder('Bollard', (x, y, .5), .1, .8, M['Steel'], 8)
            cylinder('BollardBand', (x, y, .65), .105, .1, M['Red'], 8)
    for x, y in ((-3.5, 3.0), (0, 2.6), (3.5, 3.0)):
        cylinder('TankHatch', (x, y, .115), .35, .03, M['Steel'], 12)
    box('Shop', (0, 5.0, 1.6), (9.0, 3.6, 3.2), M['White'])
    box('ShopBase', (0, 3.18, .2), (9.04, .06, .4), M['Roof'])
    box('ShopRoof', (0, 5.0, 3.35), (9.5, 4.1, .3), M['Roof'])
    box('ShopFascia', (0, 3.0, 3.35), (9.5, .06, .5), M['Red'])
    box('ShopWindow', (0, 3.18, 1.6), (6.2, .06, 1.7), M['Glass'])
    box('ShopWindowFrame', (0, 3.16, 1.6), (6.4, .04, 1.9), M['Steel'])
    for x in (-2.07, -1.03, 0, 1.03, 2.07):
        box('ShopMullion', (x, 3.22, 1.6), (.06, .04, 1.7), M['Steel'])
    box('ShopDoorFrame', (-3.2, 3.17, 1.1), (1.3, .05, 2.2), M['Steel'])
    box('ShopDoor', (-3.2, 3.19, 1.05), (1.0, .06, 2.0), M['Glass'])
    box('ShopDoorHandle', (-2.85, 3.24, 1.0), (.04, .04, .4), M['Steel'])
    box('Awning', (-3.2, 2.75, 2.6), (1.8, .9, .08), M['Red'], rot=(-.25, 0, 0))
    box('ShopUnit', (2.5, 5.6, 3.8), (1.4, 1.0, .7), M['Steel'])
    box('ShopVent', (-1.5, 6.0, 3.65), (.5, .5, .5), M['Steel'])
    cylinder('Bin', (-4.2, 2.7, .45), .25, .7, M['Roof'], 10)
    box('AirStand', (3.7, 2.7, .6), (.5, .35, 1.1), M['Red'])
    cylinder('SignPole', (7.2, -4.5, 3.4), .1, 6.8, M['Steel'], 8)
    box('SignBoard', (7.2, -4.5, 6.4), (2.2, .2, 1.8), M['Red'])
    box('SignBand', (7.2, -4.62, 6.4), (2.0, .04, .5), M['White'])
    for z in (6.95, 5.95):
        box('PriceStrip', (7.2, -4.62, z), (1.9, .04, .3), M['White'])
        for x in (-.6, 0, .6):
            box('PriceDigit', (7.2 + x, -4.65, z), (.35, .03, .2), M['Roof'])
    box('SignBase', (7.2, -4.5, .15), (.6, .6, .3), M['Concrete'])

    # ---- Gantry crane: portal crane for the container yard ----------------------------------------------------------------
    root('GantryCrane')
    for x in (-8, 8):
        for y in (-3.2, 3.2):
            box('Leg', (x, y, 5.85), (.45, .45, 10.3), M['Orange'])
            box('LegFoot', (x, y, .85), (.7, .7, .3), M['Steel'])
        box('Sill', (x, 0, .55), (.7, 8.0, .4), M['Steel'])
        box('LowTie', (x, 0, 3.2), (.3, 6.4, .3), M['Orange'])
        box('HighTie', (x, 0, 9.0), (.3, 6.4, .3), M['Orange'])
        strut('XBraceLow', (x, -3.1, 3.05), (x, 3.1, .85), .12, M['Orange'])
        strut('XBraceLow', (x, 3.1, 3.05), (x, -3.1, .85), .12, M['Orange'])
        strut('XBraceHigh', (x, -3.1, 9.0), (x, 3.1, 3.35), .12, M['Orange'])
        strut('XBraceHigh', (x, 3.1, 9.0), (x, -3.1, 3.35), .12, M['Orange'])
        box('Corner', (x, 0, 10.55), (.8, 7.0, .35), M['Orange'])
        for y in (-3.6, -1.2, 1.2, 3.6):
            cylinder('Wheel', (x, y, .22), .22, .5, M['Steel'], 10, rot=(0, math.pi / 2, 0))
        box('Buffer', (x, 3.95, .55), (.4, .3, .3), M['Red'])
        box('Buffer', (x, -3.95, .55), (.4, .3, .3), M['Red'])
    for y in (-3.2, 3.2):
        box('Beam', (0, y, 11.4), (17.5, .9, 1.1), M['Orange'])
        strut('Truss', (-8, y, 10.8), (0, y, 11.9), .1, M['Steel'])
        strut('Truss', (0, y, 11.9), (8, y, 10.8), .1, M['Steel'])
        box('BeamRail', (0, y, 12.0), (17.5, .22, .1), M['Steel'])
    for y in (-3.62, 3.62):
        for x in range(-8, 9, 4):
            box('RailPost', (x, y, 12.5), (.06, .06, 1.0), M['Steel'])
        box('HandRail', (0, y, 12.95), (17.5, .05, .05), M['Steel'])
        box('MidRail', (0, y, 12.45), (17.5, .04, .04), M['Steel'])
    box('Girder', (0, 0, 12.1), (3.0, 7.4, .6), M['Steel'])
    box('Machinery', (0, 1.0, 12.65), (2.0, 2.4, .5), M['Steel'])
    cylinder('Drum', (0, -1.6, 12.75), .35, 1.6, M['Red'], 12, rot=(0, math.pi / 2, 0))
    box('Cab', (0, -3.9, 9.8), (1.8, 1.6, 2.0), M['White'])
    box('CabRoof', (0, -3.9, 10.85), (2.0, 1.8, .1), M['Steel'])
    box('CabGlass', (0, -4.72, 10.0), (1.4, .04, 1.0), M['Glass'])
    for x in (-.8, .8):
        box('CabBracket', (x, -3.75, 11.1), (.14, .3, .6), M['Steel'])
    box('CabDoor', (.92, -3.9, 9.6), (.04, .8, 1.5), M['Steel'])
    for x in (-.8, .8):
        for y in (-.4, .4):
            strut('Cable', (x, y, 11.7), (x, y, 6.0), .04, M['Steel'])
    box('Spreader', (0, 0, 5.8), (2.6, 1.2, .35), M['Red'])
    for x in (-1.2, 1.2):
        for y in (-.5, .5):
            box('Twistlock', (x, y, 5.55), (.14, .14, .2), M['Steel'])
    for y in (-3.5, 3.5):
        box('Ladder', (-8.3, y, 5.5), (.05, .05, 10.3), M['Steel'])
        box('Ladder', (-8.3, y + (.34 if y > 0 else -.34), 5.5), (.05, .05, 10.3), M['Steel'])
        for k in range(20):
            box('Rung', (-8.3, y + (.17 if y > 0 else -.17), .9 + k * .5), (.05, .34, .05), M['Steel'])
    for x in (-8, 8):
        box('Rail', (x, 0, .05), (.3, 14, .1), M['Steel'])

    bpy.context.view_layer.update()
    bundle = {'version': 3, 'coordinates': 'metres; Z up; origin at footprint centre, ground level',
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


