import sys
from pathlib import Path
import json, manifold3d as m, numpy as np

d = Path(sys.argv[1]).resolve()
parts = json.loads((d / "parts.json").read_text())
solids = []
palette = {}
for name, mat, col, vs, fs in parts:
    solid = m.Manifold(
        m.Mesh(np.array(vs, dtype="float32"), np.array(fs, dtype="uint32"))
    ).as_original()
    if solid.volume() < 0:
        solid = m.Manifold(
            m.Mesh(
                np.array(vs, dtype="float32"),
                np.array([f[::-1] for f in fs], dtype="uint32"),
            )
        ).as_original()
    assert solid.status() == m.Error.NoError and solid.volume() > 0, (
        name,
        solid.status(),
        solid.volume(),
    )
    solids.append(solid)
    palette[solid.original_id()] = (mat, col)
solid = m.Manifold.batch_boolean(solids, m.OpType.Add).simplify(0.006)
assert solid.status() == m.Error.NoError
print([(s.volume(), s.num_tri()) for s in solid.decompose()])
pieces = sorted(solid.decompose(), key=lambda s: s.volume(), reverse=True)
# Clipped mosaic corners can leave sub-millimetre islands outside the bevel.
# Omit only these tiny fragments; a detached functional part must fail export.
assert all(p.volume() < 0.5 for p in pieces[1:])
assert sum(p.volume() for p in pieces[1:]) < 1.0
solid = pieces[0]
assert len(solid.decompose()) == 1
mesh = solid.to_mesh()
labels = []
for i, id in enumerate(mesh.run_original_id):
    labels.extend([palette[id][0]] * ((mesh.run_index[i + 1] - mesh.run_index[i]) // 3))
(d / "solid.json").write_text(
    json.dumps(
        [
            mesh.vert_properties.tolist(),
            mesh.tri_verts.tolist(),
            labels,
            dict(palette.values()),
            solid.volume(),
        ]
    )
)
