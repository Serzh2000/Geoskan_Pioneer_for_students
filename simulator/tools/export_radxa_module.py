"""Экспорт модуля Radxa Zero 3W (модель ChatGPT, Radxa_v02.blend) для Пионера Базового.

blender --background Radxa_v02.blend --python tools/export_radxa_module.py -- OUTPUT.glb

Исходный .blend не изменяется. Что делает скрипт:
  * берёт коллекции модуля (плата-адаптер, детальная плата Radxa, камера со шлейфом, кронштейн, антенна);
    студийные объекты, свет, камеры и текст (метки меньше миллиметра) в экспорт не попадают;
  * применяет модификаторы и объединяет всё по материалам - у модели 870 объектов и 218 000 треугольников,
    для браузера это слишком много, поэтому каждый материал прореживается до своего бюджета (BUDGET);
  * переворачивает модуль объективом вниз: на дроне он стоит на нижней стороне, плата-адаптер - на разъёмах
    платы расширения (по схеме сборки constr.pdf: шаг 11 показан на перевёрнутом дроне);
  * переводит в оси и масштаб симулятора: Z вверх, вперёд +Y, 2 единицы сцены на метр, и ставит модуль в тот же
    слот под корпусом, где у Базового сидит модуль ESP32.

Результат: узел radxa_module (корень, в нём меши radxa_<материал>_mesh) и radxa_camera - пустой узел в центре объектива.
Оба узла в координатах модели дрона (как esp32_module в pioneer-basic.glb).
"""
import bpy
import bmesh
import sys
from pathlib import Path
from mathutils import Matrix, Vector

args = sys.argv[sys.argv.index('--') + 1:]
output = Path(args[0]).resolve()

KEEP = ('01 Radxa and adapter', '01B Radxa detailed PCB', '02 Camera and ribbon',
        '03 Orange camera bracket', '04 Antenna')
# Бюджет треугольников на материал после прореживания (None - не трогать).
BUDGET = {
    'Stainless steel.001': 5000,
    'Contact gold.001': 3500,
    'Black polymer.001': 5000,
    'Copper heatsinks.001': 4500,
    'Green solder mask.001': 3500,
    'Orange printed polymer.002': 7000,
    'Coated optical glass.001': 900,
    'Amber flex.001': None,
    'Silkscreen.001': 500,
}
SCENE_PER_METRE = 2.0                       # единицы сцены на метр
# Слот под корпусом дрона: центр модуля по Y и высота опорной грани платы-адаптера (единицы сцены).
SLOT_Y = 0.105
SLOT_Z = 0.100

depsgraph = bpy.context.evaluated_depsgraph_get()
export_scene = bpy.data.scenes.new('radxa_export')
bpy.context.window.scene = export_scene

# 1. Перевернуть (поворот на 180 градусов вокруг Y: объектив вниз, перёд остаётся +Y), масштаб, смещение в слот.
flip = Matrix.Rotation(3.141592653589793, 4, 'Y')
placement = Matrix.Translation(Vector((0, SLOT_Y, SLOT_Z))) @ Matrix.Diagonal((SCENE_PER_METRE,) * 3 + (1,)) @ flip
local = Matrix.Diagonal((SCENE_PER_METRE,) * 3 + (1,)) @ flip       # то же без смещения: меши лежат в корне

# 2. Собрать геометрию по материалам.
buckets = {}
lens_center = None
for name in KEEP:
    for obj in bpy.data.collections[name].objects:
        if obj.type not in {'MESH', 'CURVE'} or obj.hide_render:
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        if not mesh.polygons:
            evaluated.to_mesh_clear()
            continue
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bmesh.ops.triangulate(bm, faces=bm.faces)
        bm.transform(local @ obj.matrix_world)
        slots = [s.material for s in obj.material_slots]
        # по материалу первого слота; многослотовые объекты разносятся по граням
        for face in bm.faces:
            material = slots[face.material_index] if face.material_index < len(slots) else None
            key = material.name if material else 'NONE'
            bucket = buckets.setdefault(key, {'bm': bmesh.new(), 'material': material})
            verts = [bucket['bm'].verts.new(v.co) for v in face.verts]
            try:
                bucket['bm'].faces.new(verts)
            except ValueError:
                pass
        bm.free()
        evaluated.to_mesh_clear()
        if obj.name == 'Convex coated lens':
            lens_center = (local @ obj.matrix_world @ Vector(sum((Vector(c) for c in obj.bound_box), Vector()) / 8))

# 3. Меши по материалам, прореживание, нормали.
root = bpy.data.objects.new('radxa_module', None)
root.location = (0, SLOT_Y, SLOT_Z)
export_scene.collection.objects.link(root)
report = {}
for key, bucket in buckets.items():
    bm = bucket['bm']
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    mesh = bpy.data.meshes.new(f'radxa_{key}')
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(f'radxa_{key.split(".")[0].lower().replace(" ", "_")}_mesh', mesh)
    if bucket['material']:
        mesh.materials.append(bucket['material'])
    export_scene.collection.objects.link(obj)
    obj.parent = root
    before = len(mesh.polygons)
    budget = BUDGET.get(key)
    if budget and before > budget:
        modifier = obj.modifiers.new('decimate', 'DECIMATE')
        modifier.ratio = budget / before
        modifier.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    for polygon in mesh.polygons:
        polygon.use_smooth = False
    report[key] = (before, len(mesh.polygons))

# Узел объектива: нужен, чтобы камера Basic + SDK2 при желании смотрела из модуля.
camera = bpy.data.objects.new('radxa_camera', None)
camera.parent = root
camera.location = (lens_center if lens_center is not None else Vector((0, 0, -0.05)))
export_scene.collection.objects.link(camera)

bpy.context.view_layer.update()
output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
for obj in export_scene.objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', use_selection=True, export_yup=False,
    export_animations=False, export_cameras=False, export_lights=False, export_extras=False,
    export_texcoords=False, export_apply=False)
total = sum(after for _, after in report.values())
for key, (before, after) in report.items():
    print(f'RADXA {key:30s} {before:6d} -> {after:6d}')
print('RADXA triangles', total, 'lens', tuple(round(v, 4) for v in (lens_center or ())))
