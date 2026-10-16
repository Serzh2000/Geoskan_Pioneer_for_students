"""Original landscape kit. Run via Blender MCP; existing user scene is preserved."""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / 'public/assets/models/props'
NAME = 'landscape-kit-v1'
for extension in ['blend', 'glb', 'mesh.json']:
    if (OUT / f'{NAME}.{extension}').exists() and not globals().get('REBUILD_LANDSCAPE_KIT', False):
        raise RuntimeError('Refusing to overwrite an existing landscape export')
previous_scene = bpy.context.window.scene
scene = bpy.data.scenes.new('Pioneer landscape kit v1')
bpy.context.window.scene = scene
scene.unit_settings.system = 'METRIC'
roots = {}
materials = {}
current = None

def mat(name, rgb, roughness=.85, metalness=0):
    m = bpy.data.materials.new('Landscape_' + name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    shader = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value = (*rgb, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metalness
    m['landscape_key'] = name
    materials[name] = dict(color=list(rgb), roughness=roughness, metalness=metalness)
    return m

plaster = mat('Plaster', (.63,.57,.43))
brick = mat('Brick', (.32,.14,.09))
roof = mat('Roof', (.11,.17,.18), .7, .15)
glass = mat('Glass', (.06,.17,.21), .35, .25)
trim = mat('Trim', (.76,.77,.65))
steel = mat('Steel', (.24,.31,.32), .45, .65)

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

def box(name, pos, size, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    obj = bpy.context.object
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, material)

def cylinder(name, pos, radius, depth, material, vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=pos)
    return finish(bpy.context.object, name, material)

def gable(name, width, depth, base, peak, material):
    vertices = [(-width/2,-depth/2,base),(width/2,-depth/2,base),(0,-depth/2,peak),
                (-width/2,depth/2,base),(width/2,depth/2,base),(0,depth/2,peak)]
    faces = [(0,1,2),(3,5,4),(0,2,5,3),(1,4,5,2),(0,3,4,1)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    return finish(obj, name, material)

def windows(width, depth, z, count, door=None):
    """Windows on both long walls. `door` = half width of the front entrance (with its frame): no front window overlaps it."""
    for side in [-1,1]:
        for i in range(count):
            x = -width/2 + width*(i+1)/(count+1)
            if door is not None and side == -1 and abs(x) < door + .41:
                continue
            box('WindowFrame', (x,side*(depth/2+.015),z),(.82,.08,1.1),trim)
            box('WindowGlass', (x,side*(depth/2+.06),z),(.64,.025,.88),glass)
            box('WindowMullion', (x,side*(depth/2+.08),z),(.035,.035,.88),trim)

try:
    root('Cottage')
    box('Foundation',(0,0,.18),(5.5,4.4,.36),brick)
    box('Walls',(0,0,1.5),(5.2,4.1,2.6),plaster)
    gable('PitchedRoof',5.8,4.8,2.85,4.15,roof)
    box('RidgeCap',(0,0,4.17),(.28,4.9,.1),roof)
    windows(5.2,4.1,1.6,3,door=.4)
    for x in [-1.3,1.3]: box('WindowSill',(x,-2.15,.98),(.98,.2,.07),trim)
    for x in [-1.3,0,1.3]: box('WindowSill',(x,2.15,.98),(.98,.2,.07),trim)
    box('DoorFrame',(0,-2.11,1.1),(1.1,.06,2.0),trim)
    box('FrontDoor',(0,-2.13,1.06),(.8,.08,1.8),roof)
    box('DoorHandle',(.28,-2.2,1.0),(.05,.05,.14),trim)
    box('DoorPanel',(0,-2.18,1.45),(.5,.03,.55),trim)
    box('Porch',(0,-2.8,.12),(1.8,1.4,.24),trim)
    box('PorchStep',(0,-3.6,.07),(1.6,.2,.14),trim)
    box('PorchCanopy',(0,-2.65,2.55),(1.9,1.4,.12),roof)
    for x in [-.82,.82]:
        box('PorchPost',(x,-3.15,1.4),(.08,.08,2.3),trim)
        box('PorchRail',(x * .96,-2.8,.8),(.04,1.2,.04),trim)
    box('AtticFrame',(0,-2.42,3.55),(.62,.05,.72),trim)
    box('AtticWindow',(0,-2.45,3.55),(.46,.03,.56),glass)
    box('AtticWindow',(0,2.42,3.55),(.46,.03,.56),glass)
    for x in (-2.95,2.95):
        box('Gutter',(x,0,2.82),(.1,4.9,.1),trim)
        box('Downpipe',(x,-2.25,1.45),(.07,.07,2.8),trim)
    box('Chimney',(1.55,.8,3.65),(.45,.5,1.4),brick)
    box('ChimneyCap',(1.55,.8,4.4),(.6,.65,.1),trim)

    root('Station')
    box('Plinth',(0,0,.2),(12.4,5.9,.4),brick)
    box('MainHall',(0,0,2),(12,5.5,3.6),plaster)
    gable('StationRoof',12.8,6.2,3.8,5.25,roof)
    box('RidgeCap',(0,0,5.27),(.3,6.3,.1),roof)
    windows(12,5.5,2.05,6,door=.95)
    for i in range(6):
        x = -6 + 12 * (i + 1) / 7
        if abs(x) >= 1.36: box('WindowSill',(x,-2.84,1.42),(1.0,.2,.07),trim)
        box('WindowSill',(x,2.84,1.42),(1.0,.2,.07),trim)
    box('EntranceFrame',(0,-2.84,1.45),(1.9,.12,2.45),trim)
    box('Entrance',(0,-2.94,1.45),(1.55,.06,2.2),glass)
    box('EntranceMullion',(0,-2.98,1.45),(.07,.04,2.2),trim)
    box('EntranceStep',(0,-3.1,.1),(2.2,.55,.2),trim)
    box('EntranceCanopy',(0,-3.45,3.05),(3.4,1.5,.14),roof)
    for x in (-1.55,1.55): box('CanopyBracket',(x,-3.2,2.8),(.1,1.0,.1),trim)
    box('SignBacking',(0,-2.84,3.4),(3.6,.1,.34),roof)
    for i in range(9): box('SignLetter',(-1.45+i*.36,-2.92,3.4),(.17,.025,.2),trim)
    for x in (-6.35,6.35):
        box('Gutter',(x,0,3.78),(.1,6.2,.1),trim)
    for x in (-5.9,5.9):
        box('Downpipe',(x,-2.79,1.9),(.07,.07,3.0),trim)
    # Clock tower is a clear visual landmark from the air.
    box('Tower',(4.1,0,3.8),(2.1,2.1,7.2),brick)
    box('TowerBand',(4.1,0,5.6),(2.3,2.3,.14),trim)
    box('TowerCornice',(4.1,0,7.25),(2.4,2.4,.14),trim)
    for side in (-1,1): box('Louver',(4.1+side*1.06,0,6.4),(.05,.7,1.0),glass)
    box('Louver',(4.1,1.06,6.4),(.7,.05,1.0),glass)
    gable('TowerRoof',2.6,2.7,7.4,8.35,roof).location.x = 4.1
    clock = cylinder('Clock',(4.1,-1.09,6.5),.62,.09,trim,24)
    clock.rotation_euler.x = math.pi/2
    box('ClockHand',(4.1,-1.16,6.7),(.05,.035,.45),roof)
    box('ClockHand',(4.28,-1.17,6.5),(.4,.035,.05),roof)

    root('Warehouse')
    box('Base',(0,0,.16),(14.2,8.2,.32),trim)
    box('Walls',(0,0,2.35),(14,8,4.3),steel)
    gable('Roof',14.6,8.6,4.55,6,roof)
    box('RidgeCap',(0,0,6.02),(.3,8.7,.1),roof)
    for x in [-4.2,0,4.2]:
        box('DoorFrame',(x,-4.08,1.65),(3.3,.15,3.1),trim)
        box('RollerDoor',(x,-4.19,1.65),(3,.06,2.85),roof)
        for z in [.45,.85,1.25,1.65,2.05,2.45,2.85]:
            box('DoorSlat',(x,-4.24,z),(3,.02,.04),steel)
        box('DoorHood',(x,-4.25,3.3),(3.4,.3,.08),trim)
        box('DockNumber',(x,-4.12,3.55),(.5,.03,.35),trim)
    for x in [-6,-3,0,3,6]: box('RoofRib',(x,0,4.65),(.1,8.3,.15),trim)
    windows(14,8,3.8,6)
    for x in (-6.5,-2.1,2.1,6.5):
        box('WallSeam',(x,-4.03,2.2),(.06,.04,3.8),roof)
        box('WallSeam',(x,4.03,2.2),(.06,.04,3.8),roof)
    for x in (-7.35,7.35):
        box('Gutter',(x,0,4.55),(.1,8.6,.1),trim)
        for y in (-4.1,4.1): box('Downpipe',(x * .96,y,2.3),(.08,.08,4.5),steel)
    box('SideDoorFrame',(7.04,2.0,1.15),(.08,1.3,2.3),trim)
    box('SideDoor',(7.08,2.0,1.1),(.06,1.0,2.1),roof)
    box('SideStep',(7.3,2.0,.1),(.5,1.4,.2),trim)

    root('WaterTower')
    for x in [-1.4,1.4]:
        for y in [-1.4,1.4]:
            box('Support',(x,y,3.8),(.24,.24,7.6),steel)
            box('Footing',(x,y,.15),(.6,.6,.3),steel)
    for z in [1.4,3.6,5.8]:
        box('CrossBrace',(0,-1.4,z),(3,.14,.15),steel)
        box('CrossBrace',(0,1.4,z),(3,.14,.15),steel)
        box('CrossBrace',(-1.4,0,z),(.14,3,.15),steel)
        box('CrossBrace',(1.4,0,z),(.14,3,.15),steel)
    for z0, z1 in ((1.4,3.6),(3.6,5.8)):
        for fy in (-1.4,1.4):
            for sx in (-1,1):
                strut_a = Vector((-1.4 * sx, fy, z0)); strut_b = Vector((1.4 * sx, fy, z1))
                d = strut_b - strut_a
                brace = box('Diagonal',tuple((strut_a + strut_b) / 2),(.08,.08,d.length),steel)
                brace.rotation_euler = d.to_track_quat('Z','Y').to_euler()
        for fx in (-1.4,1.4):
            for sy in (-1,1):
                strut_a = Vector((fx, -1.4 * sy, z0)); strut_b = Vector((fx, 1.4 * sy, z1))
                d = strut_b - strut_a
                brace = box('Diagonal',tuple((strut_a + strut_b) / 2),(.08,.08,d.length),steel)
                brace.rotation_euler = d.to_track_quat('Z','Y').to_euler()
    cylinder('TankFloor',(0,0,6.1),1.9,.3,steel,24)
    cylinder('Reservoir',(0,0,8),2.1,3.5,plaster,24)
    for z in (6.9,8.0,9.1): cylinder('TankBand',(0,0,z),2.14,.1,steel,24)
    cylinder('RoofRim',(0,0,9.8),2.25,.18,roof,24)
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=2.2, radius2=.25, depth=.4, location=(0,0,10.09))
    finish(bpy.context.object,'RoofCone',roof)
    cylinder('RoofHatch',(0,0,10.31),.3,.06,steel,12)
    cylinder('Pipe',(.9,.9,3.7),.1,7.4,steel)
    box('PipeElbow',(.9,.9,6.2),(.3,.3,.3),steel)
    for x in (-.25,.25):
        box('LadderRail',(x,-2.3,5.0),(.06,.06,9.8),steel)
    for k in range(24):
        box('LadderRung',(0,-2.3,.5+k*.4),(.5,.05,.05),steel)
    for z in (1.5,4.5,7.0):
        box('LadderBracket',(0,-1.85,z),(.08,.9,.08),steel)

    bpy.context.view_layer.update()
    bundle = {'version':1,'coordinates':'metres; Z up; origin at footprint centre, ground level',
              'materials':materials,'assets':{}}
    for name, asset_root in roots.items():
        batches = {}
        for obj in list(asset_root.children):
            batches.setdefault(obj.data.materials[0]['landscape_key'], []).append(obj)
        parts = []
        for key, objects in batches.items():
            bpy.ops.object.select_all(action='DESELECT')
            for obj in objects: obj.select_set(True)
            bpy.context.view_layer.objects.active = objects[0]
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
                    indices.append(len(positions)//3)
                    positions.extend(round(float(v),5) for v in vertex)
                    normals.extend(round(float(v),5) for v in normal)
            parts.append(dict(material=key,position=positions,normal=normals,index=indices))
        bundle['assets'][name] = parts
    (OUT / f'{NAME}.mesh.json').write_text(json.dumps(bundle,separators=(',',':')),encoding='utf-8')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT / f'{NAME}.glb'),export_format='GLB',use_selection=True,use_active_scene=True)
    # Save only the kit and its dependencies, keeping the user's original scene outside the asset file.
    bpy.data.libraries.write(str(OUT / f'{NAME}.blend'), {scene}, compress=True)
    result = {'status':'exported','assets':list(roots),'scene':scene.name,'output':str(OUT)}
finally:
    bpy.context.window.scene = previous_scene
