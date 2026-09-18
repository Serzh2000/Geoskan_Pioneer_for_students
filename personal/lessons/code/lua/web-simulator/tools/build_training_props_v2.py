"""Original Pioneer simulator equipment, authored through Blender MCP. Metres, Z up.
Budget: <= 45k triangles total, <= 12 material batches per prop; no external textures.
Source geometry only; existing asset files are preserved. Re-run in a fresh Blender file.
"""
import bpy, math, os, json
from mathutils import Vector
BASE = r'C:\Users\serzh\Documents\GitHub\Geoskan-Pioneer-for-students\personal\lessons\code\lua\web-simulator'
OUT = os.path.join(BASE,'public','assets','models','props')
scene=bpy.data.scenes.new('Pioneer_Equipment_V2'); bpy.context.window.scene=scene
scene.unit_settings.system='METRIC'
def mat(name,color,metal=0,rough=.5,emission=0):
 m=bpy.data.materials.new('V2_'+name); m.diffuse_color=(*color,1); m.use_nodes=True
 bs=next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); bs.inputs['Base Color'].default_value=(*color,1); bs.inputs['Metallic'].default_value=metal; bs.inputs['Roughness'].default_value=rough
 if emission: bs.inputs['Emission Color'].default_value=(*color,1); bs.inputs['Emission Strength'].default_value=emission
 return m
steel=mat('Graphite',(.065,.095,.12),.65,.35); metal=mat('BrushedAluminium',(.43,.49,.52),.8,.32)
white=mat('IvoryPowdercoat',(.73,.77,.75),.15,.46); orange=mat('SafetyOrange',(.8,.24,.045),.15,.45)
rubber=mat('Rubber',(.025,.032,.039),0,.86); glass=mat('OpticalGlass',(.025,.105,.14),.45,.19)
screen=mat('Display',(.025,.31,.36),.2,.3,.25); glow=mat('LampGlass',(.92,.86,.66),.1,.25,1)
concrete=mat('Concrete',(.55,.55,.50),0,.9); facade=mat('Facade',(.61,.65,.63),0,.82)
root=None
roots=[]
def group(name):
 global root
 root=bpy.data.objects.new('V2_'+name,None); scene.collection.objects.link(root); roots.append(root); return root

def finish(o,name,material,bevel=0):
 o.name='V2_'+name; o.parent=root; o.data.materials.append(material)
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Manufactured edges','BEVEL'); mod.width=bevel; mod.segments=2
  bpy.ops.object.modifier_apply(modifier=mod.name)
 return o

def box(name,p,d,m=steel,b=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p); o=bpy.context.object; o.dimensions=d
 return finish(o,name,m,min(b,min(d)*.2))
def cyl(name,p,r,h,m=metal,rot=(0,0,0),verts=24):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=h,location=p,rotation=rot)
 o=finish(bpy.context.object,name,m,.004)
 for face in o.data.polygons: face.use_smooth=len(face.vertices)==4
 return o
def rod(name,a,b,r=.025,m=metal):
 a,b=Vector(a),Vector(b); o=cyl(name,(a+b)/2,r,(b-a).length,m); o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler(); return o
def bolts(z,spread):
 for x in [-spread,spread]:
  for y in [-spread,spread]: cyl('AnchorBolt',(x,y,z),.022,.035,steel,verts=6)
def label(text,p,size=.1):
 bpy.ops.object.text_add(location=p); o=bpy.context.object; o.data.body=text; o.data.size=size; o.data.align_x='CENTER'; o.data.extrude=.0005; o.rotation_euler=(math.pi/2,0,0)
 o.data.materials.append(white); o.parent=root
 bpy.ops.object.convert(target='MESH'); return o
# Small ferromagnetic training payload: low centre of mass, visible target and carry eye.
group('Cargo')
box('PayloadFoot',(0,0,.023),(.32,.32,.046),rubber,.01)
box('PayloadBody',(0,0,.12),(.28,.28,.16),orange,.018)
box('PayloadCap',(0,0,.21),(.29,.29,.035),steel,.008)
for x in [-.1,.1]: box('Band',(x,0,.125),(.023,.288,.17),metal,.003)
cyl('MagneticPickup',(0,0,.237),.085,.025,metal)
cyl('PickupTarget',(0,0,.252),.041,.006,orange)
label('01',(0,-.146,.095),.085)
# Compact service rover, wheelbase and body built as distinct functional volumes.
group('Transport')
box('Chassis',(0,0,.23),(.62,1.13,.14),steel,.035)
box('Body',(0,.04,.40),(.61,.92,.27),white,.05)
box('Bonnet',(0,-.39,.40),(.59,.30,.18),orange,.035)
box('Cabin',(0,-.01,.64),(.53,.48,.30),glass,.055)
box('Roof',(0,.015,.81),(.59,.53,.045),white,.015)
for x in [-.265,.265]:
 for y in [-.22,.24]: rod('Pillar',(x,y,.49),(x*.92,y*.85,.79),.018,white)
 box('DoorHandle',(x*1.15,.17,.5),(.02,.105,.021),steel,.003)
for x in [-.35,.35]:
 for y in [-.36,.36]:
  cyl('Tyre',(x,y,.21),.205,.115,rubber,(0,math.pi/2,0),32)
  cyl('Hub',(x*1.18,y,.21),.103,.015,metal,(0,math.pi/2,0))
  cyl('HubCenter',(x*1.205,y,.21),.037,.02,steel,(0,math.pi/2,0))
for y in [-.61,.59]: box('Bumper',(0,y,.29),(.63,.07,.09),rubber,.015)
for x in [-.2,.2]:
 box('Headlight',(x,-.559,.44),(.13,.02,.065),glow,.009)
 box('TailLight',(x,.514,.42),(.08,.025,.05),orange,.006)
for z in [.33,.37]: box('Grille',(0,-.557,z),(.21,.018,.018),steel,.003)
label('P / 02',(0,-.577,.31),.075)
# Video mast with base fasteners, access enclosure, wired arm and optical housing.
group('VideoTower')
box('Foundation',(0,0,.07),(.64,.64,.14),concrete,.035)
box('Footplate',(0,0,.16),(.38,.38,.035),steel,.015); bolts(.19,.145)
cyl('LowerMast',(0,0,1.01),.065,1.68,metal)
cyl('UpperMast',(0,0,2.49),.045,1.30,metal)
for z in [.45,1.8,2.96]: cyl('Clamp',(0,0,z),.082,.055,steel)
box('JunctionBox',(0,.11,.59),(.23,.16,.34),white,.02)
rod('CameraArm',(0,0,3.04),(0,-.35,3.04),.037,steel)
box('CameraHousing',(0,-.43,3.14),(.22,.37,.19),white,.026)
box('Sunshade',(0,-.45,3.255),(.27,.43,.025),steel,.006)
cyl('LensBezel',(0,-.633,3.14),.063,.045,steel,(math.pi/2,0,0))
cyl('Optics',(0,-.662,3.14),.045,.008,glass,(math.pi/2,0,0))
rod('Cable',(0,.077,.8),(0,.077,2.95),.009,rubber)
label('CAM 01',(0,-.077,.53),.056)
# Portable operator console with folding legs, protected display and physical controls.
group('ControlStation')
for x in [-.4,.4]:
 for y in [-.21,.21]:
  rod('FoldingLeg',(x,y,.06),(x*.8,y*.7,.88),.035,steel)
  box('Foot',(x,y,.035),(.16,.16,.045),rubber,.01)
rod('Brace',(-.4,0,.29),(.4,0,.29),.02,metal)
box('ConsoleCase',(0,0,.93),(1.02,.59,.16),steel,.045)
box('TopPanel',(0,-.045,1.025),(.93,.45,.03),white,.015)
box('DisplayCase',(0,.205,1.25),(.66,.07,.38),steel,.025)
box('Screen',(0,.162,1.26),(.58,.009,.29),glass,.008)
for i in range(5): box('DisplayLine',(-.14+i*.067,.155,1.27),(.034,.008,.06+i*.018),screen,.001)
for x in [-.28,.28]: cyl('JoystickBase',(x,-.09,1.061),.062,.045,rubber); cyl('Joystick',(x,-.09,1.10),.018,.065,steel)
cyl('EmergencyStop',(.40,-.13,1.065),.032,.046,orange)
for x in [-.1,0,.1]: cyl('Key',(x,-.13,1.048),.019,.015,steel)
label('PIONEER / CONTROL',(0,-.302,.90),.065)
# Floodlight mast: a telescopic column, stable outriggers and four finned LED heads.
group('LightTower')
box('PowerBase',(0,0,.23),(.65,.56,.46),steel,.045)
for x in [-1,1]:
 for y in [-1,1]:
  rod('Outrigger',(x*.15,y*.15,.13),(x*.52,y*.45,.06),.038,metal)
  box('Stabilizer',(x*.52,y*.45,.033),(.18,.16,.055),rubber,.014)
for z,r,h in [(1.0,.075,1.4),(2.2,.059,1.2),(3.3,.045,1.1)]: cyl('TelescopicPole',(0,0,z),r,h,metal)
for z in [.46,1.68,2.82]: cyl('LockingCollar',(0,0,z),.096,.075,steel)
box('HeadBar',(0,0,3.94),(1.34,.09,.085),steel,.012)
for x in [-.45,-.15,.15,.45]:
 box('LampHousing',(x,-.04,4.15),(.265,.18,.34),steel,.022)
 box('LampGlass',(x,-.139,4.15),(.215,.012,.275),glow,.008)
 for dz in [-.10,-.05,0,.05,.1]: box('CoolingFin',(x,.074,4.15+dz),(.245,.07,.018),metal,.002)
 rod('LampBracket',(x,0,3.94),(x,0,4.0),.02,metal)
label('LIGHT',(0,-.288,.23),.09)
# Parametric apartment: Blender-authored floor, roof and facade modules.
group('BuildingFloor')
box('FloorCore',(0,0,.36),(4.8,3.6,.72),facade,.022)
for y in [-1.815,1.815]:
 box('FloorBand',(0,y,.025),(4.87,.075,.05),white,.006)
 for x in [-2.15,2.15]: box('FacadeStrip',(x,y,.36),(.21,.09,.72),orange,.005)
for x in [-2.405,2.405]:
 for y in [-.85,.85]:
  box('SideGlass',(x,y,.40),(.018,.65,.36),glass,.002)
  box('SideSill',(x,y,.205),(.07,.73,.035),white,.005)
group('BuildingRoof')
box('RoofSlab',(0,0,.065),(5.02,3.82,.13),steel,.018)
for y in [-1.87,1.87]: box('Parapet',(0,y,.24),(5.02,.10,.30),white,.012)
for x in [-2.46,2.46]: box('Parapet',(x,0,.24),(.10,3.7,.30),white,.012)
box('LiftOverrun',(.4,0,.40),(1.4,1.3,.68),facade,.02)
for x in [-1.5,-.7]:
 box('VentUnit',(x,.35,.26),(.55,.65,.34),metal,.015)
 for y in [.15,.25,.35,.45,.55]: box('VentSlat',(x,y,.44),(.47,.025,.01),steel,.002)
group('WindowModule')
box('Niche',(0,.006,0),(.91,.05,.51),steel,.004)
box('WindowGlass',(0,.039,0),(.80,.018,.40),glass,.002)
for x in [-.43,.43]: box('Frame',(x,.061,0),(.034,.05,.48),white,.003)
for z in [-.23,.23]: box('Frame',(0,.061,z),(.89,.05,.035),white,.003)
box('MullionV',(0,.068,0),(.027,.035,.43),white,.002)
box('Sill',(0,.096,-.26),(.98,.20,.045),white,.004)
# Shallow safety rail instead of oversized repeated balconies.
box('BalconyFloor',(0,.18,-.32),(1.0,.34,.055),concrete,.007)
rod('TopRail',(-.46,.32,-.04),(.46,.32,-.04),.014,steel)
for x in [-.46,-.23,0,.23,.46]: rod('Baluster',(x,.32,-.30),(x,.32,-.04),.009,steel)
group('EntranceModule')
box('EntranceFrame',(0,1.875,.35),(1.10,.14,.70),steel,.015)
box('EntranceDoor',(0,1.956,.35),(.90,.025,.58),glass,.008)
box('EntranceCanopy',(0,2.05,.78),(1.55,.68,.075),steel,.012)
box('EntranceStep',(0,2.0,.045),(1.45,.62,.09),concrete,.014)
for x in [-.08,.08]: box('EntranceHandle',(x,1.985,.36),(.021,.029,.18),metal,.003)
# Join static components by material per root, preserving semantic window parts for recolouring.
for r in roots:
 if r.name in ['V2_WindowModule','V2_EntranceModule']: continue
 groups={}
 for o in list(r.children):
  if o.type=='MESH': groups.setdefault(o.data.materials[0].name,[]).append(o)
 for name,objects in groups.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects: o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0]; bpy.ops.object.join()
  bpy.context.object.name=r.name+'_'+name
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'training-props-v2.glb'),export_format='GLB',use_active_scene=True,export_yup=False,export_apply=True)
bpy.data.libraries.write(os.path.join(OUT,'training-props-v2.blend'),{scene},compress=True)
stats=[]
for r in roots:
 meshes=[o for o in r.children_recursive if o.type=='MESH']; tris=0
 for o in meshes: o.data.calc_loop_triangles(); tris+=len(o.data.loop_triangles)
 stats.append({'node':r.name,'meshes':len(meshes),'triangles':tris})
with open(os.path.join(OUT,'training-props-v2.json'),'w',encoding='utf8') as f: json.dump({'source':'Original geometry authored via Blender MCP','coordinates':'metres, Z up; export_yup=false','assets':stats},f,indent=2)
result={'assets':stats,'file':os.path.join(OUT,'training-props-v2.glb')}
