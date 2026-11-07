"""Generate No. 10, then run render.py in Blender with -- iced-gem-biscuit-clicker."""
import json
import math
from pathlib import Path

import manifold3d as mf
import numpy as np

from colour_projects import GALLERY, JADE, component, export_gallery_set, export_project
from geometry import saucer, socket, turned


def biscuit():
    # The smaller skirt underneath houses the socket. The scalloped edge projects above it.
    dough = socket(turned([
        (13.05, 0, 0), (13.5, 0.65, 0), (13.5, 3.8, 0),
        (14.45, 4.6, 0.40), (15.8, 5.8, 0.95), (16.0, 6.7, 1.0),
        (15.95, 7.8, 1.05), (15.5, 8.6, 0.95), (14.8, 9.0, 0.65), (11.2, 9.0, 0),
    ], 16))
    # Shallow docking marks on the exposed ring of biscuit around the icing.
    dimple = mf.Manifold.sphere(0.78, 24).scale((1, 1, 0.85))
    for i in range(10):
        angle = math.tau * i / 10
        dough -= dimple.translate((12.6 * math.cos(angle), 12.6 * math.sin(angle), 9.09))
    return dough


def piped_icing():
    icing = turned([
        (6.7, 9, 0), (9.25, 9, 1.7), (10.05, 9.7, 2.25), (10.25, 10.7, 2.8),
        (9.85, 12.1, 3.1), (8.95, 13.6, 3.05), (7.5, 15.2, 2.55),
        (5.7, 16.6, 1.9), (3.95, 18.0, 1.2), (2.45, 19.25, 0.72),
        (1.45, 20.4, 0.30), (0.95, 21.0, 0.10), (0.65, 21.2, 0),
    ], 7)

    def curl_tip(point):
        x, y, z = point
        bend = (max(z - 14, 0) / 7.2) ** 2
        return (x + 3.2 * bend, y - 0.9 * bend, z)

    return icing.warp(curl_tip)


def main():
    product = json.loads(Path(__file__).with_name("iced-gem.json").read_text())
    base, dough, icing = saucer(), biscuit(), piped_icing()
    cap = dough + icing
    assert cap.status() == mf.Error.NoError and len(cap.decompose()) == 1
    assert abs(dough.volume() + icing.volume() - cap.volume()) < 0.001
    for travel in np.linspace(0, 4, 17):
        assert (cap.translate((0, 0, 17.1 - travel)) ^ base).volume() < 1e-6
    biscuit_gold, icing_pink = "#DBA65C", "#F282B1"
    objects = {
        "Saucer": [component("Saucer base", JADE, base)],
        "Iced gem biscuit": [component("Scalloped biscuit", biscuit_gold, dough),
                             component("Piped icing", icing_pink, icing)],
    }
    slug = product["id"]
    folder = GALLERY / slug
    folder.mkdir(exist_ok=True)
    export_gallery_set(folder, slug, product["title"], objects, {"Saucer": base, "Iced gem biscuit": cap})
    export_project(folder, slug, objects, [JADE, biscuit_gold, icing_pink])


if __name__ == "__main__":
    main()
