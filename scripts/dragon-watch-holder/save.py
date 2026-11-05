import sys
import bpy, json, struct
from mathutils import Vector
from pathlib import Path

d = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
slug = "dragon-playground-watch-holder"
vs, fs, labels, palette, volume = json.loads((d / "solid.json").read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
mesh = bpy.data.meshes.new("Stand only")
mesh.from_pydata(vs, [], fs)
mesh.update()
o = bpy.data.objects.new("PRODUCT", mesh)
bpy.context.scene.collection.objects.link(o)
names = list(palette)
for name in names:
    m = bpy.data.materials.new(name)
    m.diffuse_color = palette[name]
    m.use_nodes = True
    m.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (
        palette[name]
    )
    mesh.materials.append(m)
for p, n in zip(mesh.polygons, labels):
    p.material_index = names.index(n)
sc = bpy.context.scene
sc.unit_settings.system = "METRIC"
sc.unit_settings.scale_length = 0.001
sc.unit_settings.length_unit = "MILLIMETERS"
for area in bpy.context.screen.areas:
    if area.type == "VIEW_3D":
        space = area.spaces.active
        space.shading.color_type = "MATERIAL"
        space.overlay.show_overlays = False
        reg = space.region_3d
        reg.view_distance = 160
        reg.view_location = (-20, -22, 29)
        reg.view_rotation = Vector((0.39, -1, 0.38)).to_track_quat("Z", "Y")
        reg.view_perspective = "ORTHO"
bpy.context.view_layer.update()
dims = list(o.dimensions)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(d / (slug + ".blend")), compress=True)
with (d / (slug + ".stl")).open("wb") as f:
    f.write(b"Dragon Playground Watch Holder | holder only | mm".ljust(80, b" "))
    f.write(struct.pack("<I", len(fs)))
    for p, idx in zip(mesh.polygons, fs):
        f.write(
            struct.pack("<12fH", *p.normal, *vs[idx[0]], *vs[idx[1]], *vs[idx[2]], 0)
        )
(d / "model-info.json").write_text(
    json.dumps(
        dict(
            title="Dragon Playground Watch Holder",
            notes="Holder only. Print base down with supports as needed under the cuff, rails and snout.",
            dimensions_mm=dims,
            volume_mm3=volume,
        )
    )
)
