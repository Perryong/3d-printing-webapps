"""Build the medium watch holder in millimetres; optional soft padding is added after printing.
Run in Blender with -- OUTPUT_DIRECTORY, then union.py and save.py.
"""

import bpy, bmesh, json, math, sys
from pathlib import Path
from mathutils import Vector
from math import pi, cos, sin

out = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.unit_settings.system = "METRIC"
sc.unit_settings.scale_length = 0.001

HEIGHT_INCREASE_MM = 9


def mat(n, c):
    m = bpy.data.materials.new(n)
    m.diffuse_color = (*c, 1)
    m.use_nodes = True
    m.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (
        *c,
        1,
    )
    return m


iv = mat("Warm plaster", (0.91, 0.75, 0.52))
teal = mat("Glazed jade", (0.055, 0.28, 0.24))


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


orange = mat("Mandarin mosaic", (0.83, 0.175, 0.026))
grout = mat("Terracotta joints", (0.50, 0.11, 0.024))
cream = mat("Ivory ceramic", (0.99, 0.83, 0.57))
blue = mat("Blue tunnel rail", (0.06, 0.33, 0.59))
red = mat("Vermilion rail", (0.83, 0.105, 0.045))
yellow = mat("Golden yellow rail", (0.99, 0.57, 0.045))
box("Sandpit rim", (-19, -22, 2.0), (113, 65, 4), grout, 1.9)
box("Sandpit", (-19, -22, 4.1), (111, 63, 2.5), iv, 1.1)


def silhouette(name, p, y, depth, m, b):
    k = len(p)
    v = [(x, yy, z) for yy in (y, y + depth) for x, z in p]
    f = [tuple(range(k)), tuple(range(2 * k - 1, k - 1, -1))] + [
        (j, j + k, (j + 1) % k + k, (j + 1) % k) for j in range(k)
    ]
    me = bpy.data.meshes.new(name)
    me.from_pydata(v, [], f)
    me.update()
    o = bpy.data.objects.new(name, me)
    sc.collection.objects.link(o)
    me.materials.append(m)
    bevel(o, b)


outline = [
    (-47, 5),
    (-28, 5),
    (-28, 27),
    (-31, 37),
    (-29, 45),
    (-33, 53),
    (-31, 63),
    (-38, 59),
    (-41, 66),
    (-45, 59),
    (-50, 64),
    (-52, 55),
    (-57, 53),
    (-66, 54),
    (-69, 50),
    (-68, 46),
    (-59, 44),
    (-51, 45),
    (-56, 40),
    (-62, 39),
    (-65, 41),
    (-65, 37),
    (-58, 34),
    (-51, 35),
    (-46, 38),
    (-44, 31),
]
outline = [(x, z if z == 5 else z + HEIGHT_INCREASE_MM) for x, z in outline]
silhouette("Mosaic dragon profile", outline, -26, 17, grout, 0.7)


def clip(poly, axis, bound, sign):
    if not poly:
        return []
    outp = []
    prev = poly[-1]
    for cur in poly:
        a = (prev[axis] - bound) * sign
        b = (cur[axis] - bound) * sign
        if (a < 0) != (b < 0):
            t = a / (a - b)
            outp.append(tuple(prev[i] + t * (cur[i] - prev[i]) for i in (0, 1)))
        if b >= 0:
            outp.append(cur)
        prev = cur
    return outp


for i in range(-17, -6):
    for j in range(1, 17):
        p = outline
        for ax, bd, sg in [
            (0, 4.5 * i + 0.18, 1),
            (0, 4.5 * i + 4.32, -1),
            (1, 4.5 * j + 0.18, 1),
            (1, 4.5 * j + 4.32, -1),
        ]:
            p = clip(p, ax, bd, sg)
        if (
            len(p) > 2
            and abs(sum(a[0] * b[1] - a[1] * b[0] for a, b in zip(p, p[1:] + p[:1])))
            > 0.5
        ):
            silhouette("Ceramic tessera", p, -26.5, 0.6, orange, 0.06)


def eye(n, x, y, z, r, depth, m):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=64, radius=r, depth=depth, location=(x, y, z), rotation=(pi / 2, 0, 0)
    )
    o = bpy.context.object
    o.name = n
    o.data.materials.append(m)
    bevel(o, 0.18)


eye("Eye surround", -45, -27, 52 + HEIGHT_INCREASE_MM, 4.9, 1.4, cream)
eye("Eye", -46, -27.9, 52.1 + HEIGHT_INCREASE_MM, 2.85, 1.2, teal)
eye("Nostril", -64, -26.9, 50 + HEIGHT_INCREASE_MM, 1.15, 1, grout)


def rod(n, a, b, r, m):
    a = Vector(a)
    b = Vector(b)
    v = b - a
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=32, radius=r, depth=v.length, location=(a + b) / 2
    )
    o = bpy.context.object
    o.name = n
    o.rotation_euler = v.to_track_quat("Z", "Y").to_euler()
    o.data.materials.append(m)
    bevel(o, 0.18)


for y, z in [(-28, 27), (-16, 27), (-22, 42)]:
    z += HEIGHT_INCREASE_MM
    rod("Tunnel spine", (-37, y, z), (-14, y, z), 1.25, teal)
for x, m in [(-28, red), (-23, yellow), (-18, blue)]:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=8.4,
        minor_radius=1.5,
        location=(x, -22, 34 + HEIGHT_INCREASE_MM),
        rotation=(0, pi / 2, 0),
    )
    bpy.context.object.name = "Playground climbing hoop"
    bpy.context.object.data.materials.append(m)
box(
    "Body support",
    (-16, -22, 19 + HEIGHT_INCREASE_MM / 2),
    (6, 8, 29 + HEIGHT_INCREASE_MM),
    orange,
    2,
)
box("Saddle arm", (-2, -22, 34 + HEIGHT_INCREASE_MM), (31, 7, 7), orange, 1.4)
box("Saddle rib", (12, -9.5, 34 + HEIGHT_INCREASE_MM), (9, 25, 7), orange, 1.2)
cy = -22
cz = 34 + HEIGHT_INCREASE_MM


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


cuff(
    "Proposed support - 22 wide - 54 x 44 nominal oval", 22, 27, 22, 4, -62, 242, orange
)


d = out
parts = []
for o in bpy.context.scene.objects:
    if (
        o.type != "MESH"
        or o.name == "Studio"
        or any(c.name.startswith("Example wristwatch") for c in o.users_collection)
    ):
        continue
    if o.name.startswith("Ceramic tessera"):
        o.modifiers.clear()
    ev = o.evaluated_get(bpy.context.evaluated_depsgraph_get())
    m = ev.to_mesh()
    bm = bmesh.new()
    bm.from_mesh(m)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=0.00001)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(m)
    bm.free()
    m.calc_loop_triangles()
    parts.append(
        (
            o.name,
            o.active_material.name,
            list(o.active_material.diffuse_color),
            [list(o.matrix_world @ v.co) for v in m.vertices],
            [list(t.vertices) for t in m.loop_triangles],
        )
    )
    ev.to_mesh_clear()
(d / "parts.json").write_text(json.dumps(parts))
