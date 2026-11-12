# 021 · Monumento a los Caídos (Pamplona) · prepara motor/web/v021.json desde OpenStreetMap (datos/caidos: b2 edificios, r2 edificios con patio, c2 calles y zonas verdes).
# Coordenadas locales en metros respecto al monumento: x este, z sur. Piezas del conjunto por su id de OSM.
import json, math, sys, os
ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
D = f'{ROOT}/datos/caidos'
B = json.load(open(f'{D}/b2.json'))['elements']; C = json.load(open(f'{D}/c2.json'))['elements']
try: R = json.load(open(f'{D}/r2.json'))['elements']
except Exception: R = []
LAT0, LON0 = 42.80911, -1.63472; K = math.cos(math.radians(LAT0)); RMAX = 330
loc = lambda p: [round((p['lon'] - LON0) * 111320 * K, 2), round(-(p['lat'] - LAT0) * 110574, 2)]
ring = lambda g: (lambda r: r[:-1] if len(r) > 1 and r[0] == r[-1] else r)([loc(p) for p in g])
def alto(t):
    try:
        if 'height' in t: return float(t['height'].replace(' m', ''))
        if 'building:levels' in t: return float(t['building:levels']) * 3.2 + 1.2
    except Exception: pass
    return 20.0
PIEZA = {82360571: 'monumento', 378577675: 'arqueria_ne', 378577676: 'arqueria_so', 378577674: 'iglesia', 378577673: 'casa'}
out = {'ctx': [], 'roads': [], 'green': [], 'piezas': {}}
cerca = lambda r: math.hypot(sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r)) < RMAX
for e in B:
    t = e.get('tags', {})
    if e['type'] != 'way' or 'building' not in t or len(e.get('geometry', [])) < 4: continue
    r = ring(e['geometry'])
    if e['id'] in PIEZA: out['piezas'][PIEZA[e['id']]] = r
    elif cerca(r): out['ctx'].append({'r': r, 'h': alto(t)})
for e in R:
    t = e.get('tags', {})
    for m in e.get('members', []):
        if m.get('role') == 'outer' and m.get('geometry') and m['geometry'][0] == m['geometry'][-1]:
            r = ring(m['geometry'])
            if len(r) >= 3 and cerca(r): out['ctx'].append({'r': r, 'h': alto(t)})
for e in C:
    t = e.get('tags', {}); g = e.get('geometry') or []
    if len(g) < 2: continue
    if 'highway' in t and t['highway'] not in ('footway', 'steps', 'path', 'cycleway', 'service', 'corridor', 'track'): out['roads'].append([loc(p) for p in g])
    elif t.get('leisure') in ('park', 'garden') or t.get('place') == 'square':
        r = ring(g)
        if len(r) >= 3 and cerca(r): out['green'].append(r)
# eje del conjunto: de la arquería suroeste a la noreste (dirección de las arquerías) y su perpendicular (eje de Carlos III)
a = out['piezas']['arqueria_so']; b = out['piezas']['arqueria_ne']
ca = [sum(p[0] for p in a) / len(a), sum(p[1] for p in a) / len(a)]; cb = [sum(p[0] for p in b) / len(b), sum(p[1] for p in b) / len(b)]
out['eje'] = round(math.atan2(cb[1] - ca[1], cb[0] - ca[0]), 4)
json.dump(out, open(f'{ROOT}/motor/web/v021.json', 'w'), separators=(',', ':'))
print('contexto', len(out['ctx']), 'calles', len(out['roads']), 'verde', len(out['green']), 'piezas', list(out['piezas']), 'eje', round(math.degrees(out['eje']), 1))
