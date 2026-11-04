"""Run with Blender: blender -b --python scripts/export-chope-parts.py.

Export the three original print-scene meshes at their shared millimetre origin.
"""
from pathlib import Path
import struct
import zipfile
from xml.etree import ElementTree as ET

import bpy
import bmesh

OUTPUT = Path(__file__).resolve().parents[1] / "public/singapore-products/chope-marker"
bpy.ops.wm.open_mainfile(filepath=str(OUTPUT / "chope-marker.blend"))
PARTS = [
    ("PRINT packet body", "Packet body", "body", "#D95262"),
    ("PRINT CHOPE lettering", "CHOPE lettering", "lettering", "#F6F0DC"),
    ("PRINT tissue relief", "Tissue", "tissue", "#F6F0DC"),
]
NS = "http://schemas.microsoft.com/3dmanufacturing/core/2015/02"
ET.register_namespace("", NS)


def tag(name):
    return f"{{{NS}}}{name}"


def child(parent, element_name, **attributes):
    return ET.SubElement(parent, tag(element_name), {key: str(value) for key, value in attributes.items()})


model = ET.Element(tag("model"), {"unit": "millimeter"})
child(model, "metadata", name="Title").text = "CHOPE marker - three colour parts"
resources = child(model, "resources")
materials = child(resources, "basematerials", id=1)
meshes = []
for index, (source_name, label, suffix, colour) in enumerate(PARTS):
    child(materials, "base", name=label, displaycolor=colour)
    source = bpy.data.objects[source_name]
    assert source.parent is None, "Use print geometry, not illustration copies"
    mesh = source.data.copy()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6)
    bmesh.ops.triangulate(bm, faces=list(bm.faces))
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    assert all(edge.is_manifold for edge in bm.edges), label
    assert bm.calc_volume(signed=True) > 0, label
    bm.to_mesh(mesh)
    bm.free()
    vertices = [source.matrix_world @ vertex.co for vertex in mesh.vertices]
    faces = [tuple(face.vertices) for face in mesh.polygons]
    bounds = [(min(v[axis] for v in vertices), max(v[axis] for v in vertices)) for axis in range(3)]
    assert abs(bounds[2][0] - (0 if index == 0 else 10)) < 1e-5
    print(label, "bounds (mm)", bounds, "closed manifold", len(faces), "triangles")
    obj = child(resources, "object", id=index + 2, type="model", name=label, pid=1, pindex=index)
    part_mesh = child(obj, "mesh")
    xml_vertices = child(part_mesh, "vertices")
    xml_faces = child(part_mesh, "triangles")
    for v in vertices:
        child(xml_vertices, "vertex", x=f"{v.x:.8f}", y=f"{v.y:.8f}", z=f"{v.z:.8f}")
    for face in faces:
        child(xml_faces, "triangle", v1=face[0], v2=face[1], v3=face[2])
    path = OUTPUT / f"chope-{suffix}.stl"
    with path.open("wb") as file:
        file.write(f"CHOPE {label}; millimetres; shared assembly origin".encode().ljust(80, b" "))
        file.write(struct.pack("<I", len(faces)))
        for face in faces:
            a, b, c = [vertices[i] for i in face]
            normal = (b - a).cross(c - a).normalized()
            file.write(struct.pack("<12fH", *normal, *a, *b, *c, 0))
    meshes.append(path)
    bpy.data.meshes.remove(mesh)

assembly = child(resources, "object", id=5, type="model", name="CHOPE marker")
components = child(assembly, "components")
for part_id in (2, 3, 4):
    child(components, "component", objectid=part_id)
build = child(model, "build")
child(build, "item", objectid=5, transform="1 0 0 0 1 0 0 0 1 128 128 0")
with zipfile.ZipFile(OUTPUT / "chope-multipart.3mf", "w", zipfile.ZIP_DEFLATED) as archive:
    archive.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>')
    archive.writestr("_rels/.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>')
    archive.writestr("3D/3dmodel.model", ET.tostring(model, encoding="utf-8", xml_declaration=True))
    # Bambu Studio otherwise replaces component names with assembly-name suffixes.
    config = ET.Element("config")
    object_config = ET.SubElement(config, "object", {"id": "5"})
    ET.SubElement(object_config, "metadata", {"key": "name", "value": "CHOPE marker"})
    for index, (_, label, _, _) in enumerate(PARTS):
        part_config = ET.SubElement(object_config, "part", {"id": str(index + 2), "subtype": "normal_part"})
        ET.SubElement(part_config, "metadata", {"key": "name", "value": label})
    archive.writestr("Metadata/model_settings.config", ET.tostring(config, encoding="utf-8", xml_declaration=True))
instructions = """CHOPE marker - three colour parts
Assembled size: 60 x 38 x 12 mm.

Recommended: open chope-multipart.3mf in Bambu Studio as geometry.
Expand CHOPE marker in the Objects list. Assign a filament to Packet body,
CHOPE lettering, and Tissue. Keep these as parts of one assembled object.

STL alternative: select all three STL files and import them together.
Choose to load them as one object with multiple parts. Keep their relative
positions. The lettering and tissue start at Z=10 mm on top of the body.
Do not arrange or drop the individual parts separately onto the plate.

Select your Bambu Lab A1 and PLA settings, then slice and preview.
This is an unsliced model. Assign your own AMS Lite filament slots.
Physical printing and colour results have not been tested.
"""
with zipfile.ZipFile(OUTPUT / "chope-stl-parts.zip", "w", zipfile.ZIP_DEFLATED) as archive:
    for path in meshes:
        archive.write(path, path.name)
    archive.writestr("README.txt", instructions)
print("Exported 3 aligned STL parts and one multipart 3MF")
