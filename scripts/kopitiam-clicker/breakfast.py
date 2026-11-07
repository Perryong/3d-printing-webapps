"""Generate No. 9. Run with Python, then render.py in Blender with -- kaya-toast-egg-clicker."""
import json
from pathlib import Path

import manifold3d as mf
import numpy as np

from colour_projects import GALLERY, component, export_gallery_set, export_project
from geometry import cylinder, saucer, socket, turned

GREEN, BROWN, CREAM, YELLOW = "#629871", "#B26E39", "#FFF0CC", "#FFBC38"


def rectangle(width, depth, radius):
    return mf.CrossSection.square((width - 2 * radius, depth - 2 * radius), center=True).offset(
        radius, circular_segments=48
    )


def ellipsoid(x, y, z, rx, ry, rz):
    return mf.Manifold.sphere(1, 56).scale((rx, ry, rz)).translate((x, y, z))


def toast():
    bread = rectangle(30, 27.6, 3.4)
    lower = bread.extrude(4.4)
    spread = rectangle(29.2, 27, 3.5).extrude(1.8).translate((0, 0, 4.4))
    butter = rectangle(28, 26.3, 2).rotate(4).extrude(1.6).translate((0, -0.45, 6.2))
    upper = bread.rotate(-4).extrude(5.5, scale_top=(0.97, 0.97)).translate((0, 0, 7.8))
    # Shallow pores catch light on the crumb and stay wide enough for the 0.4 mm nozzle.
    for x, y, radius in [(-9, -8.2, 0.85), (-8.2, -6.6, 0.55), (-8, 9, 0.7),
                         (0.9, 8.2, 0.8), (7.7, 7, 0.65), (10.9, 3.9, 0.9),
                         (2.6, -8.6, 0.7), (-2, -5.8, 0.65), (10.8, -7.5, 0.6)]:
        upper -= ellipsoid(x, y, 13.35, radius, 0.8 * radius, 0.55)
    solid = socket(lower + spread + butter + upper)

    # A shallow inset of pale crumb leaves a visible crust around the top slice.
    face = rectangle(26.5, 24.1, 3).rotate(-4).extrude(2).translate((0, 0, 12.5))
    for x, y, length in [(-6, 3, 14), (0, 0, 18), (6, -3, 14)]:
        grill = rectangle(1.15, length, 0.55).rotate(-30).extrude(2).translate((x, y, 12.5))
        face -= grill
    crumb, bread_and_fillings = solid.split(face)
    kaya, rest = bread_and_fillings.split(spread)
    butter_layer, crust = rest.split(butter)
    return solid, [
        component("Toast crust and grill marks", BROWN, crust), component("Bread crumb", CREAM, crumb),
        component("Pandan kaya", GREEN, kaya), component("Butter", YELLOW, butter_layer),
    ]


def egg():
    # Low kopitiam dish with a rolled lip and a shallow well for the runny white.
    bowl = socket(turned([
        (12.9, 0, 0), (13.45, 0.6, 0), (13.45, 2, 0), (13.1, 2.6, 0),
        (14.3, 5.5, 0), (16.5, 9.3, 0), (16.9, 10.2, 0), (16.9, 11, 0),
        (16.4, 11.55, 0), (15.5, 11.55, 0), (14.9, 10.9, 0), (14.2, 9.1, 0),
        (13.6, 8.7, 0),
    ]))
    white = ellipsoid(-0.4, 0, 9, 14, 12.8, 2.05) + ellipsoid(2.4, -1.4, 9, 10.8, 11.5, 1.8)
    yolk = ellipsoid(-1.8, 0.7, 10.55, 6.7, 6.25, 3.35)
    # Soy sauce pools against one side of the yolk with a smaller drop beside it.
    soy = ellipsoid(5.8, -4.4, 10.65, 4.2, 1.65, 0.65).rotate((0, 0, 15))
    soy += ellipsoid(7.8, 1.9, 10.54, 1.4, 1.1, 0.72)
    solid = bowl + white + yolk + soy
    egg_white = white - bowl
    visible_yolk = yolk - (bowl + white)
    sauce = soy - (bowl + white + yolk)
    return solid, [
        component("Kopitiam dish", GREEN, bowl), component("Egg white", CREAM, egg_white),
        component("Soft yolk", YELLOW, visible_yolk), component("Soy sauce", BROWN, sauce),
    ]


def main():
    product = json.loads(Path(__file__).with_name("breakfast.json").read_text())
    base = saucer()
    objects = {"Saucer": [component("Saucer base", GREEN, base)]}
    originals = {"Saucer": base}
    for name, (solid, parts) in [("Kaya toast", toast()), ("Soft-boiled egg", egg())]:
        assert len(solid.decompose()) == 1, name
        assert abs(sum(s.volume() for _, _, s in parts) - solid.volume()) < 0.001, name
        for travel in np.linspace(0, 4, 17):
            assert (solid.translate((0, 0, 17.1 - travel)) ^ base).volume() < 1e-6, name
        objects[name], originals[name] = parts, solid
    slug = product["id"]
    folder = GALLERY / slug
    folder.mkdir(exist_ok=True)
    export_gallery_set(folder, slug, product["title"], objects, originals)
    export_project(folder, slug, objects, [GREEN, BROWN, CREAM, YELLOW])


if __name__ == "__main__":
    main()
