"""Copy reviewed Blender gallery exports into the website; run with gallery artifact directory."""
import json, shutil, sys
from pathlib import Path
source = Path(sys.argv[1]).resolve()
target = Path(__file__).resolve().parents[1] / 'public' / 'singapore-products'
target.mkdir(parents=True, exist_ok=True)
order = ['lapis-bloom', 'tutu-keychain', 'chope-marker', 'hdb-pencil-pot', 'kopi-clip-cup', 'peranakan-coaster', 'wafer-card-stand', 'kaya-reveal-concept']
copy = {
 'lapis-bloom': ('Lapis Bloom', 'Seven layers of kueh, shaped into a scalloped flower. Grooved bands and a raised floral top make this a little desk keepsake.', 'Flat-back print · swap colours at 2.2, 4.4, 6.6, 8.8, 11 and 13.2 mm.'),
 'tutu-keychain': ('Tutu Keychain', 'A tiny scalloped kueh on its green leaf, now with a reinforced eyelet to carry a little Singapore everywhere.', 'Flat-back print · green to white at 3 mm. Add a metal keyring; strength and fit untested.'),
 'chope-marker': ('CHOPE Desk Marker', 'The familiar tissue packet, made into a playful desk marker inspired by Singapore’s seat-reserving custom.', 'Flat-back print · coral to white at 10 mm for a simple two-colour finish.'),
 'hdb-pencil-pot': ('HDB Block Pencil Pot', 'A miniature neighbourhood for your pencils. Recessed windows and a BLK 01 sign turn a small tower into a familiar home.', 'Upright print · 50 × 26 mm opening with a 4 mm floor.'),
 'kopi-clip-cup': ('Kopitiam Paperclip Cup', 'A little kopi cup and saucer to catch the small things on your desk. A nod to the everyday coffee break.', 'Base-down print · 11 mm deep well; for desk storage, not drinks.'),
 'peranakan-coaster': ('Peranakan Tile Coaster', 'An original floral pattern inspired by the decorative tiles of Singapore’s shophouses, in blue and warm ivory.', 'Flat-back print · colour change at 4 mm; heat and stability untested.'),
 'wafer-card-stand': ('Ice Cream Wafer Card Stand', 'Wafer, pink ice cream, wafer. A familiar street-side treat becomes a compact home for a note or name card.', 'Base-down print · 1.6 mm slot; colour changes at 5 and 21 mm. Light cards only.'),
 'kaya-reveal-concept': ('Kaya Reveal', 'A toast-shaped sliding fidget with a bright kaya-and-butter middle. An early idea for a familiar breakfast ritual.', 'Visual concept only. Retaining rails, clearances and sliding mechanism are not engineered.')
}
styles = '''<style>:root{--font-size-base:12px;--foreground:#253b35;--muted-foreground:#748071}*{box-sizing:border-box}body{margin:0;background:#fdfbf6;color:#253b35;font:11px/1.5 Arial,sans-serif}.btn{font:inherit;color:#405749;border:1px solid #d8ddd2;border-radius:5px;background:#f8f7f0;padding:6px 9px;cursor:pointer;min-height:32px}.btn:hover{background:#e8eddf}.btn:focus-visible{outline:2px solid #ad4939;outline-offset:2px}.text-small{font-size:10px}@media(pointer:coarse){.btn{min-height:44px}}@media(max-width:350px){.btn{padding:6px}}
</style>'''
products = {p['id']: p for p in json.loads((source / 'gallery-assets.json').read_text())}
assert set(order) == set(products), 'Eight current designs required'
catalog = []
for slug in order:
    p = products[slug]
    folder = target / slug
    folder.mkdir(exist_ok=True)
    title, description, note = copy[slug]
    item = dict(id=slug, title=title, description=description, printNote=note,
                dimensions=p['dimensions'], status=p['status'], updated=slug in order[:2])
    for kind in ['stl', 'blend', 'preview']:
        if kind in p:
            src=Path(p[kind]);dest=folder/(slug+src.suffix)
            shutil.copy2(src,dest)
            item[kind]='/singapore-products/'+slug+'/'+dest.name
    fragment=(source/'embeds'/(slug+'.html')).read_text()
    wrapper='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title>'+styles+'</head><body>'+fragment+'</body></html>'
    (folder/'viewer.html').write_text(wrapper)
    item['viewer']='/singapore-products/'+slug+'/viewer.html'
    catalog.append(item)
(target/'catalog.json').write_text(json.dumps(catalog,indent=2,ensure_ascii=False)+'\n')
print('Synced',len(catalog),'products to',target)
