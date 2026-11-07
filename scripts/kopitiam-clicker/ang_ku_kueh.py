"""Generate No. 13, then run render.py in Blender with -- ang-ku-kueh-clicker."""
import json
import math
from pathlib import Path

import manifold3d as mf
import numpy as np

from colour_projects import GALLERY, JADE, component, export_gallery_set, export_project
from geometry import box, saucer, socket, turned


def banana_leaf():
    # Grow from a socket-width footprint into a thin oval leaf with projecting ends.
    leaf = turned([
        (13.12, 0, 0), (13.6, 0.65, 0), (13.7, 2.4, 0),
        (15.1, 4.2, 0), (16.75, 6.1, 0), (17.0, 6.65, 0),
        (16.8, 7.25, 0), (15.9, 7.8, 0),
    ]).warp(lambda p: (p[0] * (1.06 + 0.018 * p[2]), p[1], p[2]))
    # Diagonally trimmed ends and shallow parallel veins distinguish the leaf from the saucer.
    for angle, offset in [(22, 18.6), (205, 18.5)]:
        trim = box(20, 60, 10, 0).translate((offset + 10, 0, 0)).rotate((0, 0, angle))
        leaf -= trim
    vein = mf.Manifold.cylinder(55, 0.52, circular_segments=16)
    vein = vein.rotate((0, 90, 0)).translate((-27.5, 0, 7.75)).rotate((0, 0, 35))
    for y in (-16, -11, -6, -1, 4, 9, 14):
        leaf -= vein.translate((0, y, 0))
    return socket(leaf)


def shell_stamp():
    # Three hexagonal scutes, side panels and an oval border form the mould impression.
    radius_x, radius_y = 14.5, 11.15
    disc = mf.CrossSection.circle(1, 44)
    outline = mf.CrossSection.circle(1, 160).scale((radius_x, radius_y))
    stamp = outline.offset(0.58) - outline.offset(-0.58)

    def stroke(a, b):
        tip = disc.scale((0.58, 0.58))
        return (tip.translate(a) + tip.translate(b)).hull()

    for x in (-7, 0, 7):
        vertices = [(x, 4.7), (x + 3.5, 2.5), (x + 3.5, -2.5),
                    (x, -4.7), (x - 3.5, -2.5), (x - 3.5, 2.5)]
        for a, b in zip(vertices, vertices[1:] + vertices[:1]):
            stamp += stroke(a, b)
        outer_x = x * 1.28
        outer_y = radius_y * math.sqrt(1 - (outer_x / radius_x) ** 2)
        for side in (-1, 1):
            stamp += stroke((x, side * 4.7), (outer_x, side * outer_y))
    for side in (-1, 1):
        for sign_y in (-1, 1):
            outer_x = radius_x * math.sqrt(1 - (4.6 / radius_y) ** 2)
            stamp += stroke((side * 10.5, sign_y * 2.5), (side * outer_x, sign_y * 4.6))
    return stamp.extrude(12).translate((0, 0, 8.0))


def main():
    product = json.loads(Path(__file__).with_name("ang-ku-kueh.json").read_text())
    base, leaf = saucer(), banana_leaf()
    dome = mf.Manifold.sphere(1, 128).scale((17.8, 14.15, 9.3)).translate((0, 0, 7.8))
    cake, _ = dome.split_by_plane((0, 0, 1), 7.8)
    # A second dome gives the raised stamp even height across the curved top.
    raised = (dome.translate((0, 0, 0.85)) ^ shell_stamp()) - cake
    cap = leaf + cake + raised
    assert cap.status() == mf.Error.NoError and len(cap.decompose()) == 1
    assert abs(leaf.volume() + cake.volume() + raised.volume() - cap.volume()) < 0.001
    for travel in np.linspace(0, 4, 17):
        assert (cap.translate((0, 0, 17.1 - travel)) ^ base).volume() < 1e-6
    green, red, scarlet = "#408045", "#BA2F29", "#E84036"
    objects = {
        "Saucer": [component("Saucer base", JADE, base)],
        "Ang ku kueh": [component("Banana leaf", green, leaf), component("Red kueh", red, cake),
                        component("Tortoise-shell stamp", scarlet, raised)],
    }
    slug = product["id"]
    folder = GALLERY / slug
    folder.mkdir(exist_ok=True)
    export_gallery_set(folder, slug, product["title"], objects, {"Saucer": base, "Ang ku kueh": cap})
    export_project(folder, slug, objects, [JADE, green, red, scarlet])
    print("Cap bounds (mm):", cap.bounding_box())


if __name__ == "__main__":
    main()
