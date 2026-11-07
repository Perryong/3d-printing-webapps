"""Generate the clicker with manifold3d and numpy. Run render.py with Blender afterwards."""

import zipfile
from pathlib import Path

import manifold3d as mf
import numpy as np

from viewer import write_viewer
from geometry import kopi, pau, saucer, stl

ROOT = Path(__file__).resolve().parents[2]
SLUG = "kopitiam-keycap-clicker"
OUT = ROOT / "public/singapore-products" / SLUG
OUT.mkdir(exist_ok=True)
TITLE = "Kopitiam Keycap Clicker"


parts = {"saucer-base": saucer(), "red-dot-pau": pau(), "kopi-cup": kopi()}
colours = {
    "celadon": (0.29, 0.64, 0.52),
    "jade": (0.10, 0.36, 0.29),
    "porcelain": (0.97, 0.90, 0.74),
    "vermilion": (0.83, 0.18, 0.13),
    "kopi": (0.22, 0.105, 0.055),
}
layout = {"saucer-base": (0, 0, 0), "red-dot-pau": (39, 0, 0), "kopi-cup": (0, 37, 0)}
# Show a pau on the switch and the interchangeable cup beside it.
display = {
    "saucer-base": (0, 0, 0),
    "red-dot-pau": (0, 0, 17.1),
    "kopi-cup": (40, 0, 0),
}


def colour(part, triangle):
    bottom, top = triangle[:, 2].min(), triangle[:, 2].max()
    radius = np.linalg.norm(triangle[:, :2], axis=1).max()
    if part == "saucer-base":
        return (
            "jade"
            if (4.39 <= bottom and top <= 5.31) or (9.19 <= bottom and top <= 10.11)
            else "celadon"
        )
    if part == "red-dot-pau":
        return "vermilion" if bottom >= 15.999 and radius < 1.56 else "porcelain"
    if bottom >= 12.94 and radius <= 12.46 and top <= 13.11:
        return "kopi"
    stripe = (6.59 <= bottom and top <= 7.26) or (12.99 <= bottom and top <= 14.01)
    return "jade" if stripe and radius < 14.51 else "porcelain"


instructions = """KOPITIAM KEYCAP CLICKER
Print the saucer base and either cap at 100% scale in millimetres.
The set STL contains all three pieces spaced apart on the bed.
The ZIP also contains an individual STL for each piece.

Use a full-height plate-mount MX-style clicky switch with a cross stem,
such as CHERRY MX Blue, and a metal split ring. Source these separately.
Print the base flat and the caps socket down. Inspect the cap cavity and cup
handle for supports; keep support material out of the small cross socket.
Press the switch into the square opening until its clips engage. Gently seat
one cap on the stem. Thread the ring through the side eyelet. To change
caps, hold the switch housing and lift the cap straight up.
No wiring is required. Fit, travel and keyring strength need a physical test.
"""
# Check the cap-to-saucer clearance throughout the click stroke.
for cap in ("red-dot-pau", "kopi-cup"):
    for travel in np.linspace(0, 4, 17):
        placed = parts[cap].translate((0, 0, 17.1 - travel))
        assert (placed ^ parts["saucer-base"]).volume() < 1e-6
payload = []
with zipfile.ZipFile(
    OUT / "clicker-stl-parts.zip", "w", zipfile.ZIP_DEFLATED
) as archive:
    for name, solid in parts.items():
        assert (
            solid.status() == mf.Error.NoError
            and len(solid.decompose()) == 1
            and solid.volume() > 0
        ), name
        archive.writestr(name + ".stl", stl(solid))
        mesh = solid.to_mesh()
        vertices = mesh.vert_properties[:, :3]
        groups = {}
        for face in mesh.tri_verts:
            shade = colour(name, vertices[face])
            groups.setdefault(shade, []).append(face)
        for shade, faces in groups.items():
            unique, index = np.unique(faces, return_inverse=True)
            points = vertices[unique] + np.array(display[name])
            payload.append(
                dict(
                    part=name,
                    bedOffset=(np.array(layout[name]) - display[name]).tolist(),
                    vertices=np.round(points, 5).tolist(),
                    triangles=index.reshape(-1, 3).tolist(),
                    color=colours[shade],
                )
            )
    archive.writestr("README.txt", instructions)
bed = mf.Manifold.compose(
    [solid.translate(layout[name]) for name, solid in parts.items()]
)
assert len(bed.decompose()) == 3
(OUT / (SLUG + ".stl")).write_bytes(stl(bed))
write_viewer(OUT, SLUG, TITLE, payload)
print(
    "Three closed printable solids. Base bounds:", parts["saucer-base"].bounding_box()
)
