"""Render the exported holder with an illustrative watch and soft contact pad."""

import bpy, math, sys
from pathlib import Path
from mathutils import Vector
from math import pi, cos, sin

out = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
bpy.ops.wm.open_mainfile(filepath=str(out / "dragon-playground-watch-holder.blend"))
sc = bpy.context.scene
cy = -22
cz = 43


def mat(n, c):
    m = bpy.data.materials.new(n)
    m.diffuse_color = (*c, 1)
    m.use_nodes = True
    m.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (
        *c,
        1,
    )
    return m


def bevel(o, b):
    if b:
        m = o.modifiers.new("Soft edges", "BEVEL")
        m.width = b
        m.segments = 3
        o.modifiers.new("Face normals", "WEIGHTED_NORMAL")


def box(n, loc, size, m, b=0.24):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = n
    o.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(m)
    bevel(o, b)
    return o


def cuff(name, width, ry, rz, th, a, b, material):
    verts = []
    faces = []
    N = 120
    for i in range(N + 1):
        t = math.radians(a + (b - a) * i / N)
        for x, dr in [
            (-width / 2, 0),
            (width / 2, 0),
            (width / 2, -th),
            (-width / 2, -th),
        ]:
            verts.append((x + 12, cy - (ry + dr) * cos(t), cz + (rz + dr) * sin(t)))
    for i in range(N):
        for j in range(4):
            faces.append(
                (4 * i + j, 4 * i + (j + 1) % 4, 4 * i + 4 + (j + 1) % 4, 4 * i + 4 + j)
            )
    faces.extend([(3, 2, 1, 0), tuple(4 * N + i for i in range(4))])
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(name, me)
    sc.collection.objects.link(o)
    me.materials.append(material)
    bevel(o, 0.45)
    return o


iv = bpy.data.materials["Warm plaster"]
brass = mat("Ochre detailing", (0.67, 0.39, 0.14))
felt = mat("1 mm protective pad - illustration", (0.12, 0.14, 0.13))
cuff("Optional 1 mm felt pad", 22, 28, 23, 1, -62, 242, felt)
before = set(sc.objects)
leather = mat("Cognac strap", (0.23, 0.077, 0.034))
metal = mat("Brushed steel", (0.52, 0.54, 0.53))
ink = mat("Midnight dial", (0.018, 0.049, 0.057))
cuff("Illustrative strap - 20 mm", 20, 29.8, 24.8, 1.8, -180, 180, leather)
t = 0.63
ang = pi / 2 - t
center = Vector((12, cy - 28 * cos(t), cz + 23 * sin(t)))
n = Vector((0, -cos(t), sin(t)))
up = Vector((0, sin(t), cos(t)))
right = Vector((1, 0, 0))


def disk(name, r, d, h, m):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=96, radius=r, depth=d, location=center + n * h, rotation=(ang, 0, 0)
    )
    o = bpy.context.object
    o.name = name
    o.data.materials.append(m)
    bevel(o, 0.35)


disk("42.5 mm example case - 13.4 mm thick", 21.25, 13.4, 6.7, metal)
disk("Dial", 19.3, 0.6, 13.4, ink)
from mathutils import Matrix


def stroke(name, a, b, w, h, m):
    v = b - a
    o = box(name, (a + b) / 2, (w, v.length, h), m, 0.13)
    v.normalize()
    o.rotation_euler = Matrix((v.cross(n), v, n)).transposed().to_euler()


for i in range(12):
    v = up * cos(i * pi / 6) + right * sin(i * pi / 6)
    stroke(
        "Hour marker",
        center + v * 13.8 + n * 13.9,
        center + v * 15.8 + n * 13.9,
        0.8,
        0.35,
        iv,
    )
for k, length in [(-1.02, 8.9), (1.05, 12.2)]:
    stroke(
        "Hand",
        center + n * 14.4,
        center + n * 14.4 + (up * cos(k) + right * sin(k)) * length,
        1,
        0.55,
        brass,
    )
props = set(sc.objects) - before
collection = bpy.data.collections.new("Example wristwatch — hide to see empty holder")
sc.collection.children.link(collection)
for o in props:
    for c in list(o.users_collection):
        c.objects.unlink(o)
    collection.objects.link(o)
box("Studio", (0, 0, -2), (2000, 2000, 3), mat("Sand", (0.69, 0.64, 0.55)))
sc.world = bpy.data.worlds.new("Studio world")
sc.world.color = (0.42, 0.42, 0.42)
target = Vector((-20, -22, 34))
for loc, energy, size in [
    ((-75, -115, 175), 590000, 140),
    ((95, -35, 115), 250000, 95),
    ((5, 100, 105), 340000, 75),
]:
    bpy.ops.object.light_add(type="AREA", location=loc)
    o = bpy.context.object
    o.data.energy = energy
    o.data.shape = "DISK"
    o.data.size = size
    o.rotation_euler = (target - o.location).to_track_quat("-Z", "Y").to_euler()
bpy.ops.object.camera_add(location=(63, -265, 120))
cam = bpy.context.object
cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
cam.data.type = "ORTHO"
cam.data.ortho_scale = 145
sc.camera = cam
sc.render.engine = "CYCLES"
sc.cycles.samples = 20
sc.cycles.use_denoising = True
sc.render.resolution_x = 1200
sc.render.resolution_y = 780
sc.render.resolution_percentage = 100
for area in bpy.context.screen.areas:
    if area.type == "VIEW_3D":
        area.spaces.active.region_3d.view_perspective = "CAMERA"
        area.spaces.active.shading.color_type = "MATERIAL"
        area.spaces.active.overlay.show_overlays = False
bpy.context.preferences.filepaths.save_version = 0
sc.render.filepath = str(out / "watch-sizing-concept.png")
bpy.ops.render.render(write_still=True)
collection.hide_render = True
sc.render.filepath = str(out / "watch-sizing-empty.png")
bpy.ops.render.render(write_still=True)
