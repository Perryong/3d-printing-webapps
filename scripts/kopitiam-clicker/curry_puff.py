"""Build No. 11, then run render.py in Blender with -- curry-puff-clicker."""
import json
import math
from pathlib import Path

import manifold3d as mf
import numpy as np

from colour_projects import GALLERY, JADE, component, export_gallery_set, export_project
from geometry import saucer, socket, turned


def pastry_shell():
    def shape(point):
        x, y, z = point
        # A plump pocket above the fold, with a flatter underside toward the two tips.
        px, pz = 18.8 * x, 7.8 + (14.0 if z > 0 else 4.7) * z
        # Three shallow arcs pressed into the pastry face suggest the layers of the dough.
        radius = math.hypot((px + 13.5) * 0.80, pz - 4.0)
        grooves = sum(math.exp(-((radius - r) / 0.48) ** 2) for r in (10.0, 13.1, 16.2))
        py = 12.6 * y + 0.62 * max(0, -y) ** 2 * grooves
        return px, py, pz

    pocket = mf.Manifold.sphere(1, 184).warp(shape)
    skirt = turned([(13.05, 0, 0), (13.5, 0.65, 0), (13.5, 4.0, 0),
                    (13.2, 5.5, 0), (12.8, 7.8, 0), (11.9, 8.2, 0)])
    return socket(skirt + pocket)


def folded_edge():
    # Overlapping diagonal pinches follow the pastry arch and taper at both ends.
    pinch = mf.Manifold.sphere(1, 32)
    crimps = []
    for theta in np.linspace(0.015, math.pi - 0.015, 21):
        sine, cosine = math.sin(theta), math.cos(theta)
        tangent = math.degrees(math.atan2(14 * cosine, -18.8 * sine))
        size = 0.72 + 0.28 * sine
        crimp = pinch.scale((2.82 * size, 2.55 * size, 1.48 * size))
        crimp = crimp.rotate((0, 0, -30)).rotate((0, -tangent, 0))
        crimps.append(crimp.translate((18.8 * cosine, 0, 7.8 + 14 * sine)))
    return mf.Manifold.batch_boolean(crimps, mf.OpType.Add)


def main():
    product = json.loads(Path(__file__).with_name("curry-puff.json").read_text())
    base, shell, seam = saucer(), pastry_shell(), folded_edge()
    cap = shell + seam
    pastry = shell - seam
    assert all(len(s.decompose()) == 1 for s in (cap, seam, pastry))
    assert abs(pastry.volume() + seam.volume() - cap.volume()) < 0.001
    for travel in np.linspace(0, 4, 17):
        assert (cap.translate((0, 0, 17.1 - travel)) ^ base).volume() < 1e-6
    gold, toasted = "#E2A454", "#BC773D"
    objects = {
        "Saucer": [component("Saucer base", JADE, base)],
        "Curry puff": [component("Golden pastry", gold, pastry), component("Crimped seam", toasted, seam)],
    }
    slug = product["id"]
    folder = GALLERY / slug
    folder.mkdir(exist_ok=True)
    export_gallery_set(folder, slug, product["title"], objects, {"Saucer": base, "Curry puff": cap})
    export_project(folder, slug, objects, [JADE, gold, toasted], supported_object="Curry puff")
    print("Cap bounds in millimetres:", cap.bounding_box())


if __name__ == "__main__":
    main()
