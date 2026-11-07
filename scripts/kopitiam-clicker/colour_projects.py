"""Build unsliced A1 projects with Bambu Studio + the geometry.py dependencies.

Run with python colour_projects.py, then render.py in Blender with -- hawker-bakes-clicker.
"""
import json
import os
import subprocess
import tempfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

import manifold3d as mf
import numpy as np

from geometry import chiffon, cylinder, egg_tart, kopi, pau, saucer, stl
from viewer import ROOT, write_viewer

GALLERY = ROOT / "public/singapore-products"
STUDIO = Path(os.getenv("BAMBU_STUDIO", "/Applications/BambuStudio.app/Contents/MacOS/BambuStudio"))
PROFILES = Path(os.getenv("BAMBU_PROFILES", str(STUDIO.parent.parent / "Resources/profiles/BBL")))
JADE, CREAM, RED, COFFEE = "#43947D", "#FFF1CC", "#DC302D", "#653423"
PANDAN, CRUST, CUSTARD = "#9BC76F", "#CB8647", "#FFD050"


def preset(kind, name):
    data = json.loads(next((PROFILES / kind).rglob(name + ".json")).read_text())
    result = preset(kind, data["inherits"]) if "inherits" in data else {}
    for include in data.get("include", []):
        result.update(preset(kind, include))
    result.update({k: v for k, v in data.items() if k not in ("include", "inherits")})
    return result


def component(name, colour, solid):
    assert solid.status() == mf.Error.NoError and solid.volume() > 0, name
    return name, colour, solid


def make_sets():
    base = [component("Saucer base", JADE, saucer())]
    bun = pau()
    dot, dough = bun.split_by_plane((0, 0, 1), 16)
    cup = kopi()
    coffee, body = cup.split(cylinder(12.44, 2.0, 12.35))
    bands, porcelain = body.split(cylinder(13.48, 0.8, 6.6) + cylinder(14.5, 1, 13))
    cake = chiffon()
    crust, crumb = cake.split_by_plane((0, 0, 1), 13.6)
    shell, filling = egg_tart()
    kopitiam = {
        "Saucer": base,
        "Red-dot pau": [component("Pau dough", CREAM, dough), component("Red dot", RED, dot)],
        "Kopi cup": [component("Porcelain", CREAM, porcelain), component("Green bands", JADE, bands),
                     component("Coffee", COFFEE, coffee)],
    }
    bakes = {
        "Saucer": base,
        "Pandan chiffon": [component("Pandan crumb", PANDAN, crumb), component("Golden crust", CRUST, crust)],
        "Egg tart": [component("Fluted pastry", CRUST, shell), component("Egg custard", CUSTARD, filling)],
    }
    for label, original, parts in [
        ("pau", bun, kopitiam["Red-dot pau"]), ("kopi", cup, kopitiam["Kopi cup"]),
        ("chiffon", cake, bakes["Pandan chiffon"]), ("tart", shell + filling, bakes["Egg tart"]),
    ]:
        assembled = mf.Manifold.batch_boolean([s for _, _, s in parts], mf.OpType.Add)
        assert sum(s.volume() > 1e-5 for s in assembled.decompose()) == 1 and (assembled - original).volume() < 1e-5, label
        assert abs(sum(s.volume() for _, _, s in parts) - original.volume()) < 1e-3, label
        for travel in np.linspace(0, 4, 17):
            assert (assembled.translate((0, 0, 17.1 - travel)) ^ base[0][2]).volume() < 1e-6, label
    return kopitiam, bakes


def write_model(path, objects, palette):
    # Input assembly in shared part coordinates. Studio converts this to its native project format.
    model = ET.Element("model", unit="millimeter", xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02")
    resources = ET.SubElement(model, "resources")
    build = ET.SubElement(model, "build")
    config = ET.Element("config")
    plate = ET.SubElement(config, "plate")
    ET.SubElement(plate, "metadata", key="plater_id", value="1")
    next_id = 1
    for (name, parts), (x, y) in zip(objects.items(), [(105, 105), (155, 105), (105, 154)], strict=True):
        assembly_id = next_id + len(parts)
        settings = ET.SubElement(config, "object", id=str(assembly_id))
        ET.SubElement(settings, "metadata", key="name", value=name)
        ET.SubElement(settings, "metadata", key="extruder", value=str(palette.index(parts[0][1]) + 1))
        for label, colour, solid in parts:
            obj = ET.SubElement(resources, "object", id=str(next_id), type="model", name=label)
            mesh = ET.SubElement(obj, "mesh")
            verts = ET.SubElement(mesh, "vertices")
            tris = ET.SubElement(mesh, "triangles")
            data = solid.to_mesh()
            for vx, vy, vz in data.vert_properties[:, :3]:
                ET.SubElement(verts, "vertex", x=str(vx), y=str(vy), z=str(vz))
            for a, b, c in data.tri_verts:
                ET.SubElement(tris, "triangle", v1=str(a), v2=str(b), v3=str(c))
            part = ET.SubElement(settings, "part", id=str(next_id), subtype="normal_part")
            ET.SubElement(part, "metadata", key="name", value=label)
            ET.SubElement(part, "metadata", key="extruder", value=str(palette.index(colour) + 1))
            next_id += 1
        assembly = ET.SubElement(resources, "object", id=str(assembly_id), type="model", name=name)
        components = ET.SubElement(assembly, "components")
        for part_id in range(assembly_id - len(parts), assembly_id):
            ET.SubElement(components, "component", objectid=str(part_id))
        ET.SubElement(build, "item", objectid=str(assembly_id), transform=f"1 0 0 0 1 0 0 0 1 {x} {y} 0")
        instance = ET.SubElement(plate, "model_instance")
        ET.SubElement(instance, "metadata", key="object_id", value=str(assembly_id))
        ET.SubElement(instance, "metadata", key="instance_id", value="0")
        ET.SubElement(instance, "metadata", key="identify_id", value=str(assembly_id))
        next_id += 1
    with zipfile.ZipFile(GALLERY / "chope-marker/chope-multipart.3mf") as template, zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        for item in ("[Content_Types].xml", "_rels/.rels"):
            z.writestr(item, template.read(item))
        z.writestr("3D/3dmodel.model", ET.tostring(model))
        z.writestr("Metadata/model_settings.config", ET.tostring(config))


def export_project(folder, slug, objects, palette):
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        write_model(tmp / "parts.3mf", objects, palette)
        machine = preset("machine", "Bambu Lab A1 0.4 nozzle")
        process = preset("process", "0.20mm Standard @BBL A1")
        process.update(curr_bed_type="Textured PEI Plate", wall_loops="3", wipe_tower_x=["38"], wipe_tower_y=["155"])
        for name, data in [("machine", machine), ("process", process)]:
            (tmp / (name + ".json")).write_text(json.dumps(data))
        filament = preset("filament", "Generic PLA @BBL A1")
        names = []
        for i, colour in enumerate(palette):
            names.append(f"pla{i + 1}.json")
            (tmp / names[-1]).write_text(json.dumps({**filament, "filament_colour": [colour]}))
        subprocess.run([str(STUDIO), "--load-settings", f"{tmp}/machine.json;{tmp}/process.json", "--load-filaments",
                        ";".join(str(tmp / n) for n in names), "--outputdir", str(tmp), "--arrange", "0", "--orient", "0", "--export-3mf",
                        "project.3mf", str(tmp / "parts.3mf")], cwd=tmp, check=True)
        (folder / (slug + ".3mf")).write_bytes((tmp / "project.3mf").read_bytes())


def export_gallery_set(folder, slug, title, objects, originals):
    payload, solids = [], []
    bed_xy = [(0, 0), (42, 0), (0, 38)]
    display_xyz = [(0, 0, 0), (0, 0, 17.1), (40, 0, 0)]
    for (name, parts), (x, y), display in zip(objects.items(), bed_xy, display_xyz, strict=True):
        solids.append(originals[name].translate((x, y, 0)))
        tagged = [s.as_original() for _, _, s in parts]
        data = mf.Manifold.batch_boolean(tagged, mf.OpType.Add).to_mesh()
        for (_, colour, _), source in zip(parts, tagged, strict=True):
            faces = []
            for run, origin in enumerate(data.run_original_id):
                if origin == source.original_id():
                    faces.extend(data.tri_verts[data.run_index[run] // 3:data.run_index[run + 1] // 3])
            unique, inverse = np.unique(faces, return_inverse=True)
            payload.append(dict(part=name, bedOffset=(np.array([x, y, 0]) - display).tolist(),
                                vertices=np.round(data.vert_properties[unique, :3] + display, 5).tolist(),
                                triangles=inverse.reshape(-1, 3).tolist(),
                                color=[int(colour[i:i+2], 16) / 255 for i in (1, 3, 5)]))
    bed = mf.Manifold.compose(solids)
    assert len(bed.decompose()) == 3
    (folder / (slug + ".stl")).write_bytes(stl(bed))
    write_viewer(folder, slug, title, payload)


if __name__ == "__main__":
    kopitiam, bakes = make_sets()
    for slug, objects, palette in [
        ("kopitiam-keycap-clicker", kopitiam, [CREAM, RED, JADE, COFFEE]),
        ("hawker-bakes-clicker", bakes, [PANDAN, CRUST, CUSTARD, JADE]),
    ]:
        folder = GALLERY / slug
        folder.mkdir(exist_ok=True)
        if slug == "hawker-bakes-clicker":
            shell, filling = egg_tart()
            originals = {"Saucer": saucer(), "Pandan chiffon": chiffon(), "Egg tart": shell + filling}
            export_gallery_set(folder, slug, "Hawker Bakes Keycap Clicker", objects, originals)
        export_project(folder, slug, objects, palette)
