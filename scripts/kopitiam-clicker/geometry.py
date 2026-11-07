"""Millimetre geometry shared by both clicker sets."""
import math
import struct

import manifold3d as mf
import numpy as np


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


def stl(solid):
    mesh = solid.to_mesh()
    vertices = mesh.vert_properties[:, :3]
    triangles = vertices[mesh.tri_verts].astype(np.float64)
    normals = np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0])
    lengths = np.linalg.norm(normals, axis=1)
    valid = lengths > 0
    data = bytearray(
        b"Kopitiam clicker | mm".ljust(80, b" ")
        + struct.pack("<I", int(valid.sum()))
    )
    for normal, (a, b, c) in zip(normals[valid] / lengths[valid, None], triangles[valid]):
        data.extend(struct.pack("<12fH", *normal, *a, *b, *c, 0))
    return bytes(data)


def chiffon():
    # Cut a serving wedge out of the ring to show the pandan crumb.
    cake = turned([
        (13.1, 0, 0), (13.8, 0.8, 0), (15.6, 12.2, 0),
        (15.4, 13.6, 0), (14.5, 14.6, 0), (12.2, 15.2, 0),
        (7.2, 15.1, 0), (5.8, 14.1, 0), (5.4, 12.7, 0),
        (4.9, 9.7, 0), (4.1, 9.2, 0),
    ])
    wedge = mf.CrossSection([[(0, 0), (-9, -24), (11, -24)]]).extrude(20)
    # Keep a core around the switch socket and a continuous roof above the stem.
    skirt = cylinder(13.2, 7.9)
    core = cylinder(5.55, 20).rotate((0, 0, 1.7))
    cake = socket(cake - (wedge - (skirt + core)))
    # Shallow crumb pores on the exposed outer face.
    for angle, height, size in [(-65, 4.8, 0.85), (-49, 8.8, 0.95),
                                (-31, 6.3, 0.7), (-15, 10.6, 0.85),
                                (-112, 7.3, 0.9), (-138, 10, 0.75), (-144, 5.3, 0.8)]:
        radius = 13.8 + (height - 0.8) * 1.8 / 11.4
        angle = math.radians(angle)
        pore = mf.Manifold.sphere(size, 20).translate((radius * math.cos(angle), radius * math.sin(angle), height))
        cake -= pore
    return cake


def egg_tart():
    pastry = turned([
        (12.8, 0, 0.32), (13.6, 1.0, 0.48), (14.0, 4.0, 0.60),
        (15.4, 8.3, 0.85), (15.8, 9.1, 1.0), (15.4, 10.2, 1.05),
        (14.5, 10.8, 0.85), (13.1, 10.7, 0.65), (12.3, 10.0, 0.4),
        (12.0, 9.6, 0),
    ], 18)
    filling = turned([(12.0, 9.6, 0), (10.8, 10.1, 0), (7.4, 10.45, 0), (1.5, 10.55, 0)])
    return socket(pastry), filling
