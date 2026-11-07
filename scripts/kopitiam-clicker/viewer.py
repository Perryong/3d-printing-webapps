import base64
import gzip
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def write_viewer(out, slug, title, payload):
    template = (ROOT / "public/singapore-products/chope-marker/viewer.html").read_text()
    packed = base64.b64encode(
        gzip.compress(json.dumps(payload, separators=(",", ":")).encode(), mtime=0)
    ).decode()
    template = template.replace("chope-marker", slug).replace("CHOPE Desk Marker", title)
    html, n = re.subn("const encoded='[^']*';", f"const encoded='{packed}';", template)
    assert n == 1
    (out / "viewer.html").write_text(html)
