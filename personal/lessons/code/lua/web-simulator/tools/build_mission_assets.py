"""Run through Blender MCP. Original Z-up mission props; no external assets."""
import bpy
import bmesh
import math
import json
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / 'public/assets/models/props'
scene = bpy.data.scenes.new('Mission assets v1')
bpy.context.window.scene = scene
for previous in list(bpy.data.scenes):
    if previous != scene and previous.name.startswith('Mission assets v1'):
        for obj in list(previous.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.scenes.remove(previous)
scene.unit_settings.system = 'METRIC'
roots = {}
materials = {}
current = None

def material(name, color, rough=.5, metal=0, emission=0):
    m = bpy.data.materials.new('Mission_' + name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    m['mission_key'] = name
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    if emission:
        p.inputs['Emission Color'].default_value = (*color, 1)
        p.inputs['Emission Strength'].default_value = emission
    materials[name] = dict(color=list(color), roughness=rough, metalness=metal, emission=emission)
    return m

blue = material('Blue', (.025,.23,.48), .28, .45)
orange = material('Orange', (.88,.115,.025), .36, .3)
silver = material('Silver', (.47,.56,.63), .3, .7)
white = material('Ivory', (.82,.87,.88), .4, .2)
glass = material('Glass', (.025,.075,.12), .18, .45)
black = material('Rubber', (.018,.023,.029), .88)
steel = material('Steel', (.07,.095,.115), .55, .5)
lamp = material('Headlight', (1,.83,.44), .22, 0, 1.5)
red = material('TailLight', (.7,.016,.008), .25, 0, .8)
skin = material('Skin', (.65,.36,.18), .8)
cloth = material('Cloth', (.025,.045,.07), .92)
bag = material('Bag', (.25,.18,.08), .9)
rope = material('Rope', (.48,.39,.22), .95)
flame = material('Flame', (1,.095,.004), .6, 0, 1.6)
gold = material('FlameCore', (1,.48,.012), .6, 0, 2)
hot = material('HotCore', (1,.9,.3), .6, 0, 2.5)
soot = material('Soot', (.023,.028,.033), 1)
smokes = [material('Smoke'+str(i), (v,v*1.025,v*1.06), 1) for i,v in enumerate([.065,.12,.2,.29])]

def asset(name):
    global current
    current = bpy.data.objects.new(name, None)
    scene.collection.objects.link(current)
    roots[name] = current

def finish(obj, name, mat, bevel=0):
    obj.name = current.name + '_' + name
    obj.parent = current
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Soft manufactured edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 1
        mod = obj.modifiers.new('Weighted highlights', 'WEIGHTED_NORMAL')
        mod.keep_sharp = True
    return obj

def box(name, pos, size, mat, bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    obj = bpy.context.object
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, bevel)

def ellipsoid(name, pos, size, mat, detail=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=detail, radius=1, location=pos)
    obj = bpy.context.object
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for poly in obj.data.polygons: poly.use_smooth = True
    return finish(obj, name, mat)

def rod(name, a, b, radius, mat, vertices=12):
    direction = Vector(b) - Vector(a)
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=direction.length, location=(Vector(a)+Vector(b))/2)
    obj = bpy.context.object
    obj.rotation_euler = direction.to_track_quat('Z','Y').to_euler()
    return finish(obj, name, mat)

def polygon(name, points, mat):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(points, [], [tuple(range(len(points)))])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    return finish(obj,name,mat)

def profile(name, points, width, mat, bevel=.04):
    verts = [(x,y,z) for y in [-width/2,width/2] for x,z in points]
    n = len(points)
    faces = [tuple(reversed(range(n))),tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name,mesh)
    scene.collection.objects.link(obj)
    return finish(obj,name,mat,bevel)

def wheels(xs, y, radius, z=None):
    z = z or radius
    for x in xs:
        for side in [-1,1]:
            cy = side*y
            rod('Tyre',(x,cy-.12,z),(x,cy+.12,z),radius,black,24)
            rod('Rim',(x,cy+side*.125,z),(x,cy+side*.14,z),radius*.67,silver,20)
            rod('Hub',(x,cy+side*.14,z),(x,cy+side*.16,z),radius*.24,steel)
            for i in range(5):
                a=i*math.tau/5
                rod('Spoke',(x,cy+side*.15,z),(x+math.sin(a)*radius*.52,cy+side*.15,z+math.cos(a)*radius*.52),.024,steel,6)

asset('Car')
profile('Body',[(-2,.42),(1.98,.42),(2.02,.66),(1.8,.88),(.9,.94),(-1.3,.93),(-2,.75)],1.76,blue,.07)
box('Sill',(0,0,.4),(3.94,1.77,.14),steel)
profile('Cabin',[(-1.3,.92),(.95,.92),(.48,1.43),(-.78,1.43)],1.57,blue,.035)
for side in [-1,1]:
    y=side*.794
    polygon('SideWindowFront',[(.83,y,.99),(.42,y,1.36),(-.08,y,1.36),(-.08,y,.99)],glass)
    polygon('SideWindowRear',[(-.17,y,.99),(-.17,y,1.36),(-.72,y,1.36),(-1.16,y,.99)],glass)
    box('DoorHandle',(-.3,side*.888,.87),(.2,.025,.035),silver,.008)
    box('Mirror',(.65,side*.96,1.07),(.22,.17,.13),blue,.04)
    for x in [-1.28,1.28]:
        # Fender lips keep the wheels legible from a drone camera.
        box('Fender',(x,side*.86,.7),(.82,.1,.1),blue,.045)
    box('Headlight',(1.974,side*.57,.72),(.08,.42,.16),lamp,.025)
    box('TailLight',(-1.986,side*.59,.71),(.06,.37,.14),red,.02)
polygon('Windscreen',[(.966,-.69,.98),(.51,-.69,1.4),(.51,.69,1.4),(.966,.69,.98)],glass)
polygon('RearGlass',[(-1.29,.69,.98),(-.81,.69,1.4),(-.81,-.69,1.4),(-1.29,-.69,.98)],glass)
box('Roof',(-.15,0,1.445),(1.28,1.53,.055),blue,.025)
box('Grille',(2.027,0,.57),(.035,.83,.15),black,.015)
box('Plate',(2.05,0,.47),(.02,.38,.08),white,.006)
for y in [-.3,-.15,0,.15,.3]: box('GrilleSlot',(2.05,y,.6),(.02,.045,.1),silver,.004)
wheels([-1.28,1.28],.82,.34)

def train_base(length):
    box('Underframe',(0,0,.61),(length,2.32,.22),steel,.055)
    for x in [-1.85,1.85]:
        box('Bogie',(x,0,.4),(1.5,1.65,.22),steel,.04)
        wheels([x-.46,x+.46],.73,.28)
        for side in [-1,1]:
            rod('Suspension',(x-.4,side*.92,.4),(x+.4,side*.92,.4),.065,silver)
    for x in [-length/2-.14,length/2+.14]:
        box('Coupler',(x,0,.64),(.32,.25,.16),steel,.02)
    box('FuelTank',(0,0,.34),(1.6,1.15,.34),steel,.07)

asset('Locomotive')
train_base(6)
profile('Shell',[(-3,.73),(3,.73),(3,1.74),(2.57,2.46),(-2.6,2.46),(-3,2.08)],2.3,orange,.08)
box('Roof',(-.05,0,2.51),(5.15,2.22,.14),steel,.065)
for side in [-1,1]:
    box('Stripe',(0,side*1.155,1.15),(5.94,.035,.17),white,.01)
    polygon('CabSide',[(2.8,side*1.162,1.79),(2.43,side*1.162,2.31),(1.76,side*1.162,2.31),(1.76,side*1.162,1.79)],glass)
    box('Door',(-2.36,side*1.169,1.63),(.65,.04,1.45),steel,.02)
    box('DoorWindow',(-2.36,side*1.195,2.05),(.47,.025,.42),glass,.02)
    for x in [-1.52,-.7,.12,.94]:
        box('VentPanel',(x,side*1.167,1.94),(.64,.04,.65),steel,.025)
        for z in [1.72,1.83,1.94,2.05,2.16]: box('VentSlat',(x,side*1.2,z),(.57,.025,.025),silver,.003)
    for z in [.48,.66,.84]: box('Step',(-2.35,side*1.24,z),(.65,.25,.06),silver,.015)
    rod('Handrail',(-1.96,side*1.25,.91),(-1.96,side*1.25,2.2),.025,white)
polygon('FrontGlass',[(2.99,-.92,1.85),(2.62,-.92,2.37),(2.62,.92,2.37),(2.99,.92,1.85)],glass)
rod('GlassDivider',(3.0,0,1.85),(2.64,0,2.37),.024,steel)
for side in [-1,1]: box('Lamp',(3.025,side*.76,1.49),(.055,.27,.19),lamp,.05)
box('Pilot',(3.04,0,.82),(.13,2.12,.25),steel,.05)
for x in [-.85,.3]:
    rod('RoofFan',(x,0,2.57),(x,0,2.62),.42,steel,24)
    for i in range(5):
        a=i*math.tau/5
        rod('FanSpoke',(x,0,2.636),(x+math.cos(a)*.35,math.sin(a)*.35,2.636),.025,silver,6)

asset('Wagon')
train_base(5.6)
box('Shell',(0,0,1.52),(5.6,2.3,1.8),blue,.09)
box('Roof',(0,0,2.45),(5.56,2.28,.12),silver,.055)
for side in [-1,1]:
    box('Stripe',(0,side*1.158,1.24),(5.48,.035,.12),white,.012)
    for x in [-1.64,-.55,.55,1.64]:
        box('WindowFrame',(x,side*1.16,1.85),(.92,.04,.68),silver,.06)
        box('Window',(x,side*1.19,1.85),(.82,.03,.56),glass,.05)
    for x in [-2.4,2.4]:
        box('Door',(x,side*1.17,1.56),(.48,.04,1.53),steel,.025)
        box('DoorGlass',(x,side*1.2,1.96),(.31,.02,.43),glass,.025)
for x in [-2.84,2.84]:
    box('Gangway',(x,0,1.5),(.13,.95,1.48),black,.06)
    for z in [.91,1.13,1.35,1.57,1.79,2.01]: box('Bellows',(x,0,z),(.16,.98,.035),steel,.008)

# Incidents use window-centre origin, +Y facing out, Z up.
asset('Thief')
ellipsoid('Jacket',(0,.24,-.02),(.12,.08,.16),cloth)
ellipsoid('Head',(.02,.26,.2),(.072,.067,.087),skin)
ellipsoid('Beanie',(.016,.252,.249),(.076,.07,.055),cloth)
box('Mask',(.02,.32,.208),(.127,.024,.037),black,.012)
for x in [-.01,.05]: ellipsoid('Eye',(x,.335,.213),(.009,.006,.009),white,1)
ellipsoid('Sack',(-.13,.16,-.005),(.1,.085,.135),bag)
rod('SackStrap',(-.09,.23,.1),(.07,.32,-.12),.015,rope)
for a,b,c in [((-.1,.25,.06),(-.19,.29,.17),(-.12,.3,.34)),((.1,.25,.06),(.19,.24,.13),(.21,.1,.23)),((-.065,.24,-.12),(-.16,.4,-.23),(-.15,.12,-.37)),((.06,.24,-.12),(.16,.4,-.29),(.22,.12,-.4))]:
    rod('Limb',a,b,.035,cloth)
    rod('Limb',b,c,.029,cloth)
    ellipsoid('GloveBoot',c,(.045,.052,.035),black)
rod('Rope',(-.12,.3,-.62),(-.12,.3,.91),.009,rope,8)

def plume(name, x,y,z,height,width,mat,lean=0):
    verts=[]
    rings=[(0,.56),(.22,1),(.5,.68),(.76,.34),(1,.012)]
    for h,r in rings:
        for i in range(9):
            a=i*math.tau/9
            verts.append((x+math.cos(a)*width*r+lean*h*h,y+math.sin(a)*width*r*.65,z+h*height))
    faces=[]
    for j in range(4):
        for i in range(9): faces.append((j*9+i,j*9+(i+1)%9,(j+1)*9+(i+1)%9,(j+1)*9+i))
    faces.append(tuple(reversed(range(9))))
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    obj=bpy.data.objects.new(name,mesh); scene.collection.objects.link(obj)
    for poly in mesh.polygons: poly.use_smooth=True
    finish(obj,name,mat)

asset('Fire')
box('BurnMark',(0,.035,.08),(.67,.03,.42),soot,.08)
for x,h,w,l in [(-.23,.52,.11,-.1),(-.1,.72,.14,.13),(.08,.61,.13,-.1),(.24,.43,.1,.05)]:
    plume('OuterFlame',x,.21,-.18,h,w,flame,l)
    plume('InnerFlame',x,.28,-.18,h*.7,w*.66,gold,l*.6)
    plume('HotFlame',x,.32,-.18,h*.38,w*.32,hot,l*.3)
for i in range(7):
    ellipsoid('Ember',(-.25+i*.08,.27+(i%3)*.04,.35+(i%4)*.13),(.013,.014,.027),gold,1)

asset('Smoke')
box('Soot',(0,.025,.06),(.69,.025,.36),soot,.07)
for i in range(12):
    t=i/11
    x=math.sin(i*2.1)*(.08+t*.11)+t*.16
    y=.16+t*.48
    z=-.08+t*1.25
    r=.12+t*.19
    ellipsoid('Billow',(x,y,z),(r*(1+.14*math.sin(i)),r*.85,r*.94),smokes[min(3,i//3)])

# Bake modifiers, merge by material for a small number of draw calls, then
# emit the same mesh data synchronously consumed by Three.js (no async pop-in).
bpy.context.view_layer.update()
bundle={'version':1,'coordinates':'Z up, +X vehicle forward; incident +Y outward','materials':materials,'assets':{}}
for name,root in roots.items():
    batches={}
    for obj in list(root.children):
        if obj.type!='MESH': continue
        bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active=obj
        bpy.ops.object.convert(target='MESH')
        batches.setdefault(obj.data.materials[0].name,[]).append(obj)
    output=[]
    for matname,parts in batches.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in parts: obj.select_set(True)
        bpy.context.view_layer.objects.active=parts[0]
        if len(parts) > 1: bpy.ops.object.join()
        obj=bpy.context.object
        obj.name=name+'_'+matname
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        mesh=obj.data; mesh.calc_loop_triangles()
        # Split normals preserve crisp panels and smooth bevels alike.
        positions=[]; normals=[]; indices=[]; lookup={}
        for tri in mesh.loop_triangles:
            for loop in tri.loops:
                v=mesh.vertices[mesh.loops[loop].vertex_index].co
                n=mesh.corner_normals[loop].vector
                key=tuple(round(c,5) for c in (*v,*n))
                if key not in lookup:
                    lookup[key]=len(positions)//3; positions.extend(key[:3]); normals.extend(key[3:])
                indices.append(lookup[key])
        output.append(dict(material=obj.data.materials[0]['mission_key'],position=positions,normal=normals,index=indices))
    bundle['assets'][name]=output
OUT.mkdir(parents=True,exist_ok=True)
(OUT/'mission-assets-v1.mesh.json').write_text(json.dumps(bundle,separators=(',',':')),encoding='utf-8')
bpy.ops.object.select_all(action='DESELECT')
for root in roots.values():
    root.select_set(True)
    for child in root.children: child.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'mission-assets-v1.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_yup=False,export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'mission-assets-v1.blend'))
result={'assets':{name:dict(triangles=sum(len(m['index'])//3 for m in meshes),drawCalls=len(meshes)) for name,meshes in bundle['assets'].items()},'output':str(OUT)}
