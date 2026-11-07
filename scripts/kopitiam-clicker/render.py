"""Save a print-layout Blender file and render the two interchangeable cap designs."""

import base64
import gzip
import json
import re
import sys
from pathlib import Path
import bpy
from mathutils import Vector

slug = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "kopitiam-keycap-clicker"
folder = Path(__file__).resolve().parents[2] / "public/singapore-products" / slug
html = (folder / "viewer.html").read_text()
payload = json.loads(
    gzip.decompress(base64.b64decode(re.search("const encoded='([^']+)'", html)[1]))
)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 0.001
scene.unit_settings.length_unit = "MILLIMETERS"


def material(name, color):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = tuple(c**2.2 for c in color) + (1,)
    mat.use_nodes = True
    shader = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = mat.diffuse_color
    shader.inputs["Roughness"].default_value = 0.38
    return mat


objects = []
for part in dict.fromkeys(group["part"] for group in payload):
    vertices, faces, indices, materials = [], [], [], []
    lookup = {}
    for group in (g for g in payload if g["part"] == part):
        materials.append(material(part + " finish", group["color"]))
        remap = []
        for point in group["vertices"]:
            key = tuple(point)
            if key not in lookup:
                lookup[key] = len(vertices)
                vertices.append(point)
            remap.append(lookup[key])
        for tri in group["triangles"]:
            faces.append([remap[i] for i in tri])
            indices.append(len(materials) - 1)
        bed_offset = group["bedOffset"]
    mesh = bpy.data.meshes.new(part)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(part, mesh)
    scene.collection.objects.link(obj)
    for mat in materials:
        mesh.materials.append(mat)
    for poly, idx in zip(mesh.polygons, indices):
        poly.material_index = idx
        poly.use_smooth = True
    mesh.set_sharp_from_angle(angle=0.48)
    obj.location = bed_offset
    objects.append(obj)
for area in bpy.context.screen.areas:
    if area.type == "VIEW_3D":
        space = area.spaces.active
        space.shading.color_type = "MATERIAL"
        space.overlay.show_overlays = False
        space.region_3d.view_location = (14, 13, 7)
        space.region_3d.view_distance = 122
        space.region_3d.view_rotation = Vector((0.25, -1, 0.7)).to_track_quat("Z", "Y")
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(folder / (slug + ".blend")), compress=True)
for obj in objects:
    obj.location = (0, 0, 0)

# The switch body is illustrated in the preview only.
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 14.5))
switch = bpy.context.object
switch.dimensions = (15.6, 15.6, 4.2)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
switch.data.materials.append(material("Switch housing", (0.18, 0.20, 0.18)))
bpy.ops.mesh.primitive_plane_add(size=2000, location=(0, 0, -0.05))
bpy.context.object.data.materials.append(material("Warm paper", (0.87, 0.83, 0.75)))
scene.world = bpy.data.worlds.new("Soft studio")
scene.world.color = (0.34, 0.34, 0.34)
target = Vector((17, 0, 13))
for loc, energy, size in [
    ((-35, -70, 105), 165000, 85),
    ((75, 45, 95), 160000, 65),
    ((55, -60, 70), 65000, 65),
]:
    bpy.ops.object.light_add(type="AREA", location=loc)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.rotation_euler = (target - light.location).to_track_quat("-Z", "Y").to_euler()
bpy.ops.object.camera_add(location=(52, -140, 90))
camera = bpy.context.object
camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.type = "ORTHO"
camera.data.ortho_scale = 99
scene.camera = camera
scene.render.engine = "CYCLES"
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 1100
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.filepath = str(folder / (slug + ".png"))
bpy.ops.render.render(write_still=True)
