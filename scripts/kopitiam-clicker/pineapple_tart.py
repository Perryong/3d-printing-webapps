"""Build No. 12, then render in Blender with render.py -- pineapple-tart-clicker."""
import json
import math
from pathlib import Path

import manifold3d as mf
import numpy as np

from colour_projects import GALLERY, JADE, component, export_gallery_set, export_project
from geometry import box, saucer, socket, turned


def shortcrust():
    # The flutes deepen above the socket, forming petals around the filling.
    return socket(turned([
        (13.1, 0, 0), (13.6, 0.8, 0), (13.7, 3.2, 0),
        (14.8, 4.6, 0.65), (16.2, 6.1, 1.6), (17.2, 7.6, 2.3),
        (17.35, 8.7, 2.45), (16.9, 9.65, 2.35), (15.8, 10.25, 1.85),
        (13.9, 10.45, 1.05), (12.25, 10.2, 0.25), (11.2, 9.7, 0),
        (9.7, 9.2, 0),
    ], 10))


def topping():
    dome = mf.Manifold.sphere(1, 152)

    def jam_surface(point):
        x, y, z = point
        # Shallow, irregular strands across the exposed jam.
        fibres = math.sin(19 * y + 3 * math.sin(4 * x)) + 0.55 * math.sin(29 * y - 6 * x)
        relief = 0.31 * max(0, z) * fibres
        return (10.85 * x, 10.6 * y, 9.5 + 6.4 * z + relief)

    jam = dome.warp(jam_surface)
    # Two pastry strips follow the dome. Their tips extend into the shell.
    blanket = dome.scale((11.6, 11.4, 7.3)).translate((0, 0, 9.5))
    strip = box(1.95, 25.0, 12.0, 9)
    cross = strip.rotate((0, 0, 37)) + strip.rotate((0, 0, -37))
    lattice = blanket ^ cross
    return jam, lattice


def main():
    product = json.loads(Path(__file__).with_name("pineapple-tart.json").read_text())
    base, shell = saucer(), shortcrust()
    filling, lattice = topping()
    # Clip the buried portion of the dome before assigning colours to preserve the socket.
    filling, _ = filling.split_by_plane((0, 0, 1), 8.9)
    pastry = shell + lattice
    jam = filling - pastry
    cap = pastry + filling
    assert cap.status() == mf.Error.NoError and len(cap.decompose()) == 1
    assert abs(pastry.volume() + jam.volume() - cap.volume()) < 0.001
    for travel in np.linspace(0, 4, 17):
        assert (cap.translate((0, 0, 17.1 - travel)) ^ base).volume() < 1e-6
    butter, amber = "#E9B870", "#C77828"
    objects = {
        "Saucer": [component("Saucer base", JADE, base)],
        "Pineapple tart": [component("Shortcrust and lattice", butter, pastry),
                           component("Pineapple jam", amber, jam)],
    }
    slug = product["id"]
    folder = GALLERY / slug
    folder.mkdir(exist_ok=True)
    export_gallery_set(folder, slug, product["title"], objects, {"Saucer": base, "Pineapple tart": cap})
    export_project(folder, slug, objects, [JADE, butter, amber])
    print("Cap bounds in millimetres:", cap.bounding_box())


if __name__ == "__main__":
    main()
