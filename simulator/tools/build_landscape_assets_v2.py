"""Landscape kit v2: farm, energy, logistics and street furniture for the procedural training map.

Original geometry, no external assets. Runs in Blender (GUI via the MCP add-on, or headless):
    blender --background --factory-startup --python tools/build_landscape_assets_v2.py
Same conventions as v1: metres, Z up, origin at footprint centre on the ground, front faces -Y,
at most 5000 triangles and 6 materials per model, flat colours only (no textures).
"""
import bpy
import bmesh
import json
import math
from pathlib import Path
from mathutils import Vector

OUT = Path(globals().get('__file__', 'tools/build_landscape_assets_v2.py')).resolve().parents[1] / 'public/assets/models/props'
NAME = 'landscape-kit-v2'
for extension in ['blend', 'glb', 'mesh.json']:
    if (OUT / f'{NAME}.{extension}').exists() and not globals().get('REBUILD_LANDSCAPE_KIT', False):
        raise RuntimeError('Refusing to overwrite an existing landscape export (set REBUILD_LANDSCAPE_KIT = True)')

scene = bpy.context.scene
scene.name = 'Pioneer landscape kit v2'
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
    Wood=mat('BarnWood', (.38, .10, .07), .9),
    Roof=mat('DarkRoof', (.13, .15, .17), .6, .25),
    Trim=mat('WhiteTrim', (.82, .82, .76)),
    Steel=mat('GalvSteel', (.5, .54, .56), .45, .7),
    Galv=mat('Galvanized', (.66, .68, .66), .5, .5),
    White=mat('TurbineWhite', (.9, .92, .93), .5),
    Red=mat('SignalRed', (.78, .1, .08), .6),
    Glass=mat('GreenGlass', (.35, .55, .5), .25, .1),
    Solar=mat('SolarCell', (.04, .09, .22), .2, .3),
    Hay=mat('Hay', (.78, .64, .28), 1),
    Rock=mat('Rock', (.36, .35, .33), 1),
    RockDark=mat('RockDark', (.26, .26, .25), 1),
    Blue=mat('ContainerBlue', (.1, .25, .5), .6, .3),
    Orange=mat('ContainerOrange', (.75, .34, .08), .6, .3),
    Green=mat('ContainerGreen', (.12, .38, .22), .6, .3),
    Lamp=mat('LampLens', (.95, .93, .8), .4),
    Sign=mat('BusSign', (.08, .3, .62), .5),
    Bench=mat('BenchWood', (.45, .32, .18), .9),
    HayDark=mat('HayDark', (.6, .46, .18), 1),
    Twine=mat('Twine', (.3, .2, .1), 1),
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
    """A thin square bar between two points."""
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


def blade(name, hub, length, root_w, tip_w, thick, angle, material):
    """Tapered blade in the XZ plane around hub, angle measured from straight up."""
    def point(u, z, y):
        c, s = math.cos(angle), math.sin(angle)
        return (hub[0] + u * c + z * s, hub[1] + y, hub[2] - u * s + z * c)
    r0, r1 = .55, .55 + length
    v = [point(-root_w/2, r0, -thick/2), point(root_w/2, r0, -thick/2), point(root_w/2, r0, thick/2), point(-root_w/2, r0, thick/2),
         point(-tip_w/2, r1, -thick/4), point(tip_w/2, r1, -thick/4), point(tip_w/2, r1, thick/4), point(-tip_w/2, r1, thick/4)]
    f = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    return prism(name, v, f, material)


try:
    # ---- Barn -------------------------------------------------------------------------
    root('Barn')
    box('Foundation', (0, 0, .15), (12.4, 8.4, .3), M['Concrete'])
    box('Walls', (0, 0, 2.4), (12, 8, 4.2), M['Wood'])
    gable('GableEnds', 12, 8.05, 4.5, 6.9, M['Wood'])
    roof_slabs('Roof', 12, 8, 4.5, 6.9, .16, M['Roof'])
    box('DoorFrame', (0, -4.06, 1.95), (4.4, .14, 3.9), M['Trim'])
    for side in (-1, 1):
        box('DoorLeaf', (side * 1.0, -4.15, 1.9), (1.9, .08, 3.6), M['Wood'])
        box('DoorCross', (side * 1.0, -4.2, 1.9), (1.9, .05, .14), M['Trim'])
    for z in (.7, 3.1):
        box('DoorBrace', (0, -4.2, z), (4.0, .05, .14), M['Trim'])
    box('LoftDoor', (0, -4.07, 5.5), (1.5, .12, 1.5), M['Trim'])
    box('LoftHatch', (0, -4.14, 5.5), (1.3, .06, 1.3), M['Wood'])
    for x in (-5.9, 5.9):
        box('CornerBoard', (x, -4.03, 2.4), (.2, .08, 4.2), M['Trim'])
    for x in (-3.6, 3.6):
        box('SideWindow', (x, -4.03, 3.0), (.9, .08, .8), M['Trim'])
        box('WindowPane', (x, -4.08, 3.0), (.66, .04, .56), M['Roof'])
        box('WindowSill', (x, -4.1, 2.55), (1.1, .16, .07), M['Trim'])
        box('WindowMullion', (x, -4.1, 3.0), (.05, .04, .56), M['Trim'])
    box('LoftPane', (0, -4.2, 5.5), (1.1, .03, 1.1), M['Roof'])
    box('LoftCross', (0, -4.22, 5.5), (.07, .03, 1.1), M['Trim'])
    box('LoftCrossH', (0, -4.22, 5.5), (1.1, .03, .07), M['Trim'])
    box('SlidingRail', (0, -4.22, 4.1), (9.0, .07, .1), M['Concrete'])
    for x in (-3.5, -1.1, 1.1, 3.5):
        box('RailHanger', (x, -4.2, 4.0), (.1, .06, .22), M['Concrete'])
    box('HoistBeam', (0, -4.4, 7.0), (.18, .5, .18), M['Wood'])
    box('HoistBrace', (0, -4.25, 6.75), (.14, .14, .7), M['Wood'], rot=(.0, 0, 0))
    box('RidgeCap', (0, 0, 6.97), (.3, 8.9, .12), M['Roof'])
    box('SideDoor', (6.04, -1.0, 1.1), (.08, 1.1, 2.2), M['Trim'])
    box('SideDoorLeaf', (6.09, -1.0, 1.05), (.05, .9, 2.0), M['Wood'])
    box('SideStep', (6.28, -1.0, .1), (.5, 1.4, .2), M['Concrete'])
    for x in (-5.9, 5.9):
        box('Downpipe', (x, -4.1, 2.4), (.1, .1, 4.4), M['Concrete'])
    box('BaseBand', (0, -4.03, .45), (11.9, .04, .3), M['Trim'])

    # ---- Silo -------------------------------------------------------------------------
    root('Silo')
    cylinder('Base', (0, 0, .2), 2.6, .4, M['Concrete'], 20)
    cylinder('Body', (0, 0, 5.4), 2.2, 10, M['Galv'], 20)
    for z in (2.2, 4.6, 7.0, 9.4):
        cylinder('Band', (0, 0, z), 2.27, .14, M['Steel'], 20)
    cone('Dome', (0, 0, 11.0), 2.3, .3, 2.0, M['Roof'], 20)
    cylinder('Cap', (0, 0, 12.1), .35, .3, M['Steel'], 8)
    for x in (-.3, .3):
        box('LadderRail', (x, -2.28, 5.2), (.07, .07, 10), M['Steel'])
    for i in range(16):
        box('LadderRung', (0, -2.28, .9 + i * .6), (.6, .06, .06), M['Steel'])
    box('Hatch', (0, -2.2, 1.0), (1.0, .08, 1.6), M['Steel'])

    # ---- Wind turbine -----------------------------------------------------------------
    root('WindTurbine')
    cylinder('Foundation', (0, 0, .25), 1.8, .5, M['Concrete'], 16)
    cone('Tower', (0, 0, 9.3), 1.15, .62, 18.5, M['White'], 16)
    box('Nacelle', (0, .2, 19.4), (1.7, 4.2, 1.7), M['White'])
    cylinder('Hub', (0, -1.95, 19.4), .62, .8, M['Steel'], 16, rot=(math.pi / 2, 0, 0))
    cone('Spinner', (0, -2.6, 19.4), .62, .05, 1.0, M['White'], 16, rot=(math.pi / 2, 0, 0))
    hub = (0, -2.2, 19.4)
    for i in range(3):
        blade('Blade', hub, 9.0, .9, .22, .22, i * 2 * math.pi / 3, M['White'])
        blade('BladeTip', hub, 1.4, .26, .2, .24, i * 2 * math.pi / 3, M['Red'])
    box('Door', (0, -1.1, 1.05), (.6, .08, 1.7), M['Steel'])
    for z in (6.0, 12.0):
        cylinder('TowerFlange', (0, 0, z), 1.0 - .3 * z / 18.5 + .08, .12, M['Steel'], 16)
    for y in (-.6, .6):
        box('NacelleVent', (0, .2 + y, 20.3), (.8, .4, .12), M['Steel'])
    box('NacelleRear', (0, 2.4, 19.4), (1.3, .3, 1.3), M['Steel'])
    box('AnemometerMast', (0, 1.2, 20.55), (.05, .05, .5), M['Steel'])
    box('AnemometerArm', (0, 1.2, 20.8), (.5, .04, .04), M['Steel'])
    box('WindVane', (0, 1.6, 20.7), (.03, .5, .2), M['Red'])
    box('AccessHatch', (0, .2, 20.27), (.6, .6, .06), M['Steel'])

    # ---- Radio mast -------------------------------------------------------------------
    root('RadioMast')
    cylinder('Foundation', (0, 0, .2), 2.0, .4, M['Concrete'], 12)
    sections, height = 6, 24.0
    legs = [(math.cos(a), math.sin(a)) for a in (math.pi / 2, math.pi / 2 + 2 * math.pi / 3, math.pi / 2 + 4 * math.pi / 3)]
    def ring(z):
        r = 1.2 - .75 * (z / height)
        return [Vector((x * r, y * r, z)) for x, y in legs]
    for s in range(sections):
        z0, z1 = .4 + s * (height - .4) / sections, .4 + (s + 1) * (height - .4) / sections
        a, b = ring(z0), ring(z1)
        band = M['Red'] if s % 2 == 0 else M['White']
        for i in range(3):
            strut('Leg', a[i], b[i], .14, band)
            strut('Ring', b[i], b[(i + 1) % 3], .08, M['Steel'])
            strut('Brace', a[i], b[(i + 1) % 3], .06, M['Steel'])
    for i, (x, y) in enumerate(legs):
        box('Antenna', (x * .5, y * .5, height + .9), (.25, .06, 1.8), M['White'], rot=(0, 0, i * 2 * math.pi / 3))
    cylinder('Dish', (0, -.9, height - 4), .55, .12, M['White'], 16, rot=(math.pi / 2, 0, 0))
    cylinder('Beacon', (0, 0, height + 2.0), .14, .3, M['Red'], 8)

    # ---- Container stack: corrugated boxes with corner castings, rails, locking-bar doors -----------------
    root('ContainerStack')

    def container(x, y, z, material):
        L, W, H = 6.06, 2.44, 2.59
        box('Shell', (x, y, z + H / 2), (L, W, H), material)
        for i in range(-5, 6):
            for side in (-1, 1):
                box('Rib', (x + i * .5, y + side * (W / 2 + .02), z + H / 2), (.1, .05, H - .36), material)
        for side in (-1, 1):
            for zz in (.06, H - .06):
                box('Rail', (x, y + side * (W / 2 + .015), z + zz), (L, .06, .12), M['Steel'])
        for sx in (-1, 1):
            for sy in (-1, 1):
                for zz in (.1, H - .1):
                    box('Casting', (x + sx * (L / 2 - .09), y + sy * (W / 2 - .09), z + zz), (.2, .2, .2), M['Steel'])
        # doors at the +X end: two leaves with locking bars and handles
        ex = x + L / 2 + .02
        box('DoorFrame', (ex - .01, y, z + H / 2), (.04, W - .1, H - .3), M['Steel'])
        for side in (-1, 1):
            box('DoorLeaf', (ex + .02, y + side * .55, z + H / 2), (.04, 1.0, H - .5), material)
            for off in (.25, .8):
                cylinder('LockBar', (ex + .07, y + side * off, z + H / 2), .025, H - .45, M['Steel'], 6)
            box('DoorHandle', (ex + .08, y + side * .5, z + H / 2), (.04, .12, .08), M['Steel'])
        box('DoorSeam', (ex + .045, y, z + H / 2), (.02, .03, H - .5), M['Steel'])
        # end-wall label plate on the opposite side
        box('Plate', (x - L / 2 - .02, y, z + 1.6), (.03, .6, .35), M['Steel'])

    container(0, -1.35, 0, M['Blue'])
    container(0, 1.35, 0, M['Orange'])
    container(0, 0, 2.59, M['Green'])
    for x in (-3.0, 3.0):
        for y in (-2.45, 2.45):
            box('Foot', (x, y, .05), (.4, .4, .1), M['Steel'])

    # ---- Solar array: two rows of framed, cell-ruled panels on proper legs ---------------------------------
    root('SolarArray')
    tilt = math.radians(28)
    st, ct = math.sin(tilt), math.cos(tilt)

    def on_panel(cx, cy, cz, a, b):
        """World position of the panel-local point (a along X, b across the slope)."""
        return (cx + a, cy + b * ct, cz + b * st)

    for row in (-1, 1):
        for col in (-1, 0, 1):
            cx, cy, cz = col * 3.45, row * 2.4, 1.2
            box('Panel', (cx, cy, cz), (3.3, 1.9, .05), M['Solar'], rot=(tilt, 0, 0))
            for k in (-1, 1):
                box('FrameLong', on_panel(cx, cy, cz, 0, k * .95), (3.4, .08, .08), M['Steel'], rot=(tilt, 0, 0))
                box('FrameShort', on_panel(cx, cy, cz, k * 1.65, 0), (.08, 1.9, .08), M['Steel'], rot=(tilt, 0, 0))
            for i in range(-2, 3):
                box('CellLine', on_panel(cx, cy, cz + .03 * ct, i * .55, -.03 * st / ct), (.025, 1.84, .02), M['Steel'], rot=(tilt, 0, 0))
            box('CellRow', on_panel(cx, cy, cz + .03 * ct, 0, -.03 * st / ct), (3.24, .025, .02), M['Steel'], rot=(tilt, 0, 0))
            for k in (-1, 1):
                box('Purlin', on_panel(cx, cy, cz, 0, k * .5)[:2] + (cz + k * .5 * st - .07,), (3.2, .07, .07), M['Concrete'], rot=(tilt, 0, 0))
            for k in (-1.4, 1.4):
                low = on_panel(cx + k, cy, cz, 0, -.8)
                high = on_panel(cx + k, cy, cz, 0, .8)
                strut('FrontLeg', (low[0], low[1], 0), (low[0], low[1], low[2] - .08), .08, M['Steel'])
                strut('BackLeg', (high[0], high[1], 0), (high[0], high[1], high[2] - .08), .08, M['Steel'])
                strut('Brace', (low[0], low[1], .25), (high[0], high[1], .5), .04, M['Steel'])
                for p in (low, high):
                    box('Footing', (p[0], p[1], .06), (.3, .3, .12), M['Concrete'])

    # ---- Greenhouse: knee wall, glazed walls and gable roof (ridge along X), mullions, door and roof vents ----
    root('Greenhouse')
    box('Base', (0, 0, .12), (12.2, 5.2, .24), M['Concrete'])
    box('KneeWall', (0, 0, .5), (12, 5, .52), M['Concrete'])
    box('Walls', (0, 0, 1.4), (11.9, 4.9, 1.28), M['Glass'])
    eave, ridge = 2.05, 3.5
    prism('RoofGlass', [(-5.95, -2.45, eave), (5.95, -2.45, eave), (5.95, 2.45, eave), (-5.95, 2.45, eave),
                        (-5.95, 0, ridge), (5.95, 0, ridge)],
          [(0, 1, 2, 3), (0, 4, 5, 1), (3, 2, 5, 4), (0, 3, 4), (1, 5, 2)], M['Glass'])
    slope = math.atan2(ridge - eave, 2.5)
    for i in range(7):
        x = -6 + i * 2
        for side in (-1, 1):
            box('Post', (x, side * 2.5, 1.4), (.1, .1, 1.3), M['Trim'])
            box('Rafter', (x, side * 1.25, (eave + ridge) / 2 + .02), (.09, 2.9, .09), M['Trim'], rot=(-side * slope, 0, 0))
    for x in (-6.0, 6.0):
        for y in (-1.25, 0, 1.25):
            box('EndPost', (x, y, 1.4), (.1, .1, 1.3), M['Trim'])
        for side in (-1, 1):
            box('EndRafter', (x, side * 1.25, (eave + ridge) / 2 + .02), (.09, 2.9, .09), M['Trim'], rot=(-side * slope, 0, 0))
        box('EndEave', (x, 0, eave), (.1, 5.0, .1), M['Trim'])
    box('Ridge', (0, 0, ridge + .03), (12.1, .12, .1), M['Trim'])
    for side in (-1, 1):
        box('EaveRail', (0, side * 2.5, eave), (12.1, .1, .1), M['Trim'])
        box('MidRail', (0, side * 2.5, 1.45), (12.1, .08, .06), M['Trim'])
        box('Gutter', (0, side * 2.62, eave - .05), (12.2, .14, .1), M['Concrete'])
    for x in (-3.0, 1.0, 5.0):
        box('VentFlap', (x, -.55, 3.38), (1.4, .9, .05), M['Trim'], rot=(slope - .35, 0, 0))
    box('DoorFrame', (-6.04, 0, 1.12), (.08, 1.3, 1.78), M['Trim'])
    box('DoorGlass', (-6.07, 0, 1.12), (.04, 1.08, 1.6), M['Glass'])
    box('DoorBar', (-6.1, 0, 1.12), (.04, .05, 1.6), M['Trim'])
    box('DoorStep', (-6.2, 0, .06), (.35, 1.5, .12), M['Concrete'])

    # ---- Street lamp: flanged base, tapered pole, junction box, curved arm and a luminaire with visor -------
    root('StreetLamp')
    cylinder('Plinth', (0, 0, .2), .2, .4, M['Steel'], 8)
    cylinder('Flange', (0, 0, .43), .17, .06, M['Steel'], 8)
    for a in range(4):
        box('Bolt', (.14 * math.cos(a * math.pi / 2 + .785), .14 * math.sin(a * math.pi / 2 + .785), .49), (.04, .04, .05), M['Steel'])
    cone('Pole', (0, 0, 3.2), .1, .06, 5.6, M['Steel'], 8)
    cylinder('PoleCollar', (0, 0, 1.7), .115, .08, M['Steel'], 8)
    cylinder('PoleCollar', (0, 0, 5.8), .08, .08, M['Steel'], 8)
    box('JunctionBox', (0, .12, 1.15), (.16, .1, .5), M['Roof'])
    box('JunctionDoor', (0, .17, 1.15), (.12, .02, .4), M['Steel'])
    pts = [(0, 0, 5.95), (0, -.06, 6.12), (0, -.3, 6.23), (0, -.7, 6.27), (0, -1.0, 6.23)]
    for a, b in zip(pts, pts[1:]):
        strut('Arm', a, b, .07, M['Steel'])
    box('Head', (0, -1.1, 6.18), (.46, .9, .14), M['Roof'])
    box('Visor', (0, -1.1, 6.255), (.36, .8, .02), M['Steel'])
    box('Lens', (0, -1.1, 6.09), (.38, .78, .04), M['Lamp'])
    box('LensRim', (0, -1.1, 6.115), (.44, .86, .03), M['Steel'])
    box('Photocell', (0, -.62, 6.31), (.08, .08, .06), M['Roof'])

    # ---- Bus stop: framed glass shelter, roof with gutter, bench with arms, bin, ad panel, timetable and sign ----
    root('BusStop')
    box('Slab', (0, 0, .05), (3.8, 1.9, .1), M['Roof'])
    for x in (-1.7, 1.7):
        for y in (-.75, .75):
            box('Post', (x, y, 1.3), (.1, .1, 2.4), M['Steel'])
    box('Roof', (0, 0, 2.55), (3.9, 2.0, .1), M['Roof'])
    box('RoofEdge', (0, -1.0, 2.58), (3.9, .05, .16), M['Trim'])
    box('Gutter', (0, .98, 2.5), (3.9, .1, .1), M['Steel'])
    box('Downpipe', (1.7, .9, 1.25), (.06, .06, 2.5), M['Steel'])
    for x in (-.65, .65):
        box('RoofRib', (x, 0, 2.62), (.08, 2.0, .06), M['Steel'])
    box('BackGlass', (0, .76, 1.35), (3.3, .04, 1.9), M['Glass'])
    for x in (-.55, .55):
        box('BackMullion', (x, .76, 1.35), (.06, .06, 1.9), M['Steel'])
    box('BackBase', (0, .77, .35), (3.3, .06, .3), M['Steel'])
    box('AdPanel', (-1.1, .8, 1.5), (1.0, .05, 1.4), M['Sign'])
    box('AdFrame', (-1.1, .79, 1.5), (1.1, .03, 1.5), M['Steel'])
    box('Timetable', (1.1, .8, 1.5), (.7, .04, .9), M['Trim'])
    for z in (1.25, 1.5, 1.75):
        box('TimetableRow', (1.1, .83, z), (.55, .02, .05), M['Roof'])
    for x in (-1.7, 1.7):
        box('SideGlass', (x, 0, 1.35), (.04, 1.4, 1.9), M['Glass'])
        box('SideRail', (x, 0, 1.35), (.06, .06, 1.9), M['Steel'])
    box('BenchSeat', (0, .45, .5), (2.6, .45, .07), M['Bench'])
    box('BenchBack', (0, .68, .78), (2.6, .06, .45), M['Bench'])
    for x in (-1.3, 1.3):
        box('BenchArm', (x, .45, .72), (.06, .45, .05), M['Steel'])
    for x in (-1.1, 1.1):
        box('BenchLeg', (x, .45, .25), (.06, .4, .5), M['Steel'])
    cylinder('Bin', (-1.45, -.6, .4), .2, .6, M['Roof'], 10)
    cylinder('BinLid', (-1.45, -.6, .72), .22, .05, M['Steel'], 10)
    cylinder('SignPole', (2.3, -.8, 1.7), .04, 3.4, M['Steel'], 8)
    cylinder('SignDisc', (2.3, -.8, 3.15), .3, .04, M['Sign'], 16, rot=(math.pi / 2, 0, 0))
    box('SignPlate', (2.3, -.8, 2.65), (.45, .03, .3), M['Trim'])
    box('SignLetter', (2.3, -.83, 3.15), (.08, .02, .32), M['Trim'])
    box('SignLetter', (2.3, -.83, 3.15), (.22, .02, .07), M['Trim'])

    # ---- Hay bales: wrapped round bales with spiral cores and twine, plus square bales ----------------------
    root('HayBales')
    r, l = .72, 1.25

    def round_bale(x, y, z):
        cylinder('Bale', (x, y, z), r, l, M['Hay'], 16, rot=(math.pi / 2, 0, 0))
        cylinder('Core', (x, y, z), r * .55, l + .04, M['HayDark'], 12, rot=(math.pi / 2, 0, 0))
        cylinder('Core', (x, y, z), r * .2, l + .06, M['Hay'], 8, rot=(math.pi / 2, 0, 0))
        for d in (-.32, .32):
            cylinder('Twine', (x, y + d, z), r + .015, .04, M['HayDark'], 16, rot=(math.pi / 2, 0, 0))

    for i in range(4):
        round_bale((i - 1.5) * 1.5, 0, r)
    for i in range(3):
        round_bale((i - 1) * 1.5, 0, r * 2 + .5)
    for x in (-2.25, 2.25):
        round_bale(x, 1.5, r)
    for z in (.22, .67):
        box('SquareBale', (0, 1.5, z), (1.3, .9, .44), M['Hay'])
        for dx in (-.35, .35):
            box('SquareTwine', (dx, 1.5, z), (.04, .93, .47), M['HayDark'])
    box('SquareBale', (0, 1.5, 1.12), (1.3, .9, .44), M['HayDark'])

    # ---- Rocks: faceted boulders (displaced, flat-bottomed) with pebbles ------------------------------------
    root('Rocks')
    import random
    rng = random.Random(7)
    rocks = [((0, 0), (1.9, 1.5, 1.35), 20, 'Rock'), ((2.1, -.6), (1.2, 1.0, 1.0), 70, 'RockDark'),
             ((-1.9, .9), (1.4, 1.1, .8), 115, 'Rock'), ((.9, 1.7), (.9, .8, .55), 200, 'RockDark'),
             ((-.6, -1.8), (1.0, .9, .65), 300, 'Rock'), ((3.2, 1.2), (.7, .65, .45), 40, 'RockDark'),
             ((-2.55, -.7), (.45, .4, .3), 10, 'Rock'), ((1.8, -1.8), (.4, .35, .25), 80, 'RockDark'),
             ((-1.2, 2.0), (.35, .3, .22), 150, 'Rock')]
    for (x, y), (sx, sy, sz), yaw, key in rocks:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2 if sx > .6 else 1, radius=1, location=(x, y, sz * .8))
        obj = bpy.context.object
        for v in obj.data.vertices:
            k = 1 + rng.uniform(-.2, .12)
            v.co = (v.co.x * k + rng.uniform(-.06, .06), v.co.y * k + rng.uniform(-.06, .06), max(v.co.z * k, -.55))
        obj.scale = (sx, sy, sz)
        obj.rotation_euler = (math.radians(yaw % 17), math.radians(yaw % 11), math.radians(yaw))
        finish(obj, 'Rock', M[key])

    bpy.context.view_layer.update()
    # Rocks sit on the ground rather than floating: lower each stone so its lowest vertex is at z = 0.
    for obj in roots['Rocks'].children:
        lowest = min((obj.matrix_world @ v.co).z for v in obj.data.vertices)
        obj.location.z -= lowest
    bpy.context.view_layer.update()

    bundle = {'version': 2, 'coordinates': 'metres; Z up; origin at footprint centre, ground level',
              'materials': materials, 'assets': {}}
    for name, asset_root in roots.items():
        batches = {}
        for obj in list(asset_root.children):
            batches.setdefault(obj.data.materials[0]['landscape_key'], []).append(obj)
        assert len(batches) <= 6, f'{name}: more than 6 materials'
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
    result = {'status': 'exported', 'assets': list(roots), 'output': str(OUT)}
    print('RESULT', json.dumps(result))
finally:
    pass
