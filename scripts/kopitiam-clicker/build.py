"""Generate the clicker with manifold3d and numpy. Run render.py with Blender afterwards."""

import base64
import gzip
import json
import math
import re
import struct
import zipfile
from pathlib import Path

import manifold3d as mf
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SLUG = "kopitiam-keycap-clicker"
OUT = ROOT / "public/singapore-products" / SLUG
OUT.mkdir(exist_ok=True)
TITLE = "Kopitiam Keycap Clicker"


def cylinder(radius, height, z=0):
    return mf.Manifold.cylinder(height, radius, circular_segments=96).translate(
        (0, 0, z)
    )


def box(x, y, z, bottom):
    return mf.Manifold.cube((x, y, z)).translate((-x / 2, -y / 2, bottom))


def turned(profile, pleats=0):
    """Closed lathed profile. Optional angular grooves twist towards the bun's pinch."""
    steps = 120
    vertices = []
    faces = []
    for radius, height, groove in profile:
        for i in range(steps):
            angle = math.tau * i / steps
            fold = ((1 + math.cos(pleats * angle + 0.23 * height)) / 2) ** 3
            r = radius - groove * fold
            vertices.append((r * math.cos(angle), r * math.sin(angle), height))
    for j in range(len(profile) - 1):
        for i in range(steps):
            a = j * steps + i
            b = j * steps + (i + 1) % steps
            faces.extend([(a, b, b + steps), (a, b + steps, a + steps)])
    last = (len(profile) - 1) * steps
    for i in range(1, steps - 1):
        faces.extend([(0, i + 1, i), (last, last + i, last + i + 1)])
    return mf.Manifold(
        mf.Mesh(np.array(vertices, np.float32), np.array(faces, np.uint32))
    )


def socket(cap):
    # Housing clearance surrounds the central stem boss. The two crossed slots
    # open on the bed-facing side; their ends and roof remain inside the boss.
    hollow = cylinder(11.85, 7, -0.1)
    boss = cylinder(2.75, 7.1)
    recess = box(4.15, 1.32, 4.1, -0.1) + box(1.24, 4.15, 4.1, -0.1)
    return ((cap - hollow) + boss) - recess


def saucer():
    profile = [
        (15, 0, 0),
        (15.8, 0.8, 0),
        (15.8, 4, 0),
        (16.3, 4.4, 0),
        (16.3, 5.3, 0),
        (16, 5.6, 0),
        (16.9, 8, 0),
        (18, 9.2, 0),
        (18, 10.1, 0),
        (17.5, 10.6, 0),
        (16.5, 10.6, 0),
        (15.7, 9.8, 0),
    ]
    body = turned(profile) + cylinder(11.45, 4.2, 9.1)
    eye = cylinder(4.8, 4).translate((-17.6, 0, 0))
    body = (body + eye) - cylinder(2.25, 5, -0.1).translate((-17.6, 0, 0))
    # Nominal MX cutout 14 mm with 0.1 mm total print allowance, 1.5 mm clip lip.
    chamber = box(18.1, 18.1, 12.0, -0.2) ^ cylinder(11.0, 12.0, -0.2)
    return body - chamber - box(14.1, 14.1, 14, -0.1)


def pau():
    profile = [
        (12.8, 0, 0),
        (13.6, 1, 0),
        (14.4, 3, 0.10),
        (14.5, 5, 0.35),
        (14.1, 7, 0.65),
        (13.3, 9, 1.15),
        (11.8, 11, 1.9),
        (9.8, 12.8, 2.60),
        (7.5, 14.2, 2.8),
        (5.1, 15.2, 2.0),
        (2.8, 15.8, 0.75),
        (1.9, 16, 0),
    ]
    return socket(turned(profile, 10)) + cylinder(1.55, 0.65, 15.95)


def kopi():
    profile = [
        (12.6, 0, 0),
        (13.2, 0.6, 0),
        (13.2, 1.8, 0),
        (12.75, 2.35, 0),
        (13.35, 6.3, 0),
        (13.48, 6.6, 0),
        (13.48, 7.25, 0),
        (13.43, 7.4, 0),
        (14.25, 12.4, 0),
        (14.5, 13.0, 0),
        (14.5, 14.0, 0),
        (14.15, 14.3, 0),
        (12.8, 14.3, 0),
        (12.45, 13.9, 0),
        (12.45, 13.1, 0),
        (12.1, 12.95, 0),
    ]
    # A through-opening makes the cup handle readable even in a single filament.
    handle = (cylinder(6.3, 3.4) - cylinder(3.8, 4, -0.2)).scale((1, 0.88, 1))
    handle = handle.rotate((90, 0, 0)).translate((14.2, 1.7, 7.65))
    return socket(turned(profile) + handle)


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


def stl(solid):
    mesh = solid.to_mesh()
    vertices = mesh.vert_properties[:, :3]
    data = bytearray(
        b"Kopitiam clicker | mm".ljust(80, b" ")
        + struct.pack("<I", len(mesh.tri_verts))
    )
    for ids in mesh.tri_verts:
        a, b, c = vertices[ids]
        normal = np.cross(b - a, c - a)
        normal /= np.linalg.norm(normal)
        data.extend(struct.pack("<12fH", *normal, *a, *b, *c, 0))
    return bytes(data)


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
template = (ROOT / "public/singapore-products/chope-marker/viewer.html").read_text()
packed = base64.b64encode(
    gzip.compress(json.dumps(payload, separators=(",", ":")).encode(), mtime=0)
).decode()
template = template.replace("chope-marker", SLUG).replace("CHOPE Desk Marker", TITLE)
html, n = re.subn("const encoded='[^']*';", f"const encoded='{packed}';", template)
assert n == 1
(OUT / "viewer.html").write_text(html)
print(
    "Three closed printable solids. Base bounds:", parts["saucer-base"].bounding_box()
)
