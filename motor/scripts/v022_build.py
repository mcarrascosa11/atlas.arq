# 022 · Karl-Marx-Hof (Viena) · prepara motor/web/v022.json desde OpenStreetMap (datos/viena: b edificios, r edificios con patio, c calles, vías, verde y agua).
# Coordenadas locales en metros: x este, z sur. El Karl-Marx-Hof es la relación 64435 (anillos exteriores y patios).
import json, math, sys, os
ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
D = f'{ROOT}/datos/viena'
B = json.load(open(f'{D}/b.json'))['elements']; C = json.load(open(f'{D}/c.json'))['elements']; R = json.load(open(f'{D}/r.json'))['elements']
LAT0, LON0 = 48.25278, 16.36500; K = math.cos(math.radians(LAT0)); RMAX = 760
loc = lambda p: [round((p['lon'] - LON0) * 111320 * K, 2), round(-(p['lat'] - LAT0) * 110574, 2)]
ring = lambda g: (lambda r: r[:-1] if len(r) > 1 and r[0] == r[-1] else r)([loc(p) for p in g])
def alto(t, d=16.0):
    try:
        if 'height' in t: return float(t['height'].replace(' m', ''))
        if 'building:levels' in t: return float(t['building:levels']) * 3.2 + 1.5
    except Exception: pass
    return d
def dentro(p, rr):
    c = False
    for i in range(len(rr)):
        a, b = rr[i], rr[i - 1]
        if (a[1] > p[1]) != (b[1] > p[1]) and p[0] < a[0] + (p[1] - a[1]) * (b[0] - a[0]) / (b[1] - a[1]): c = not c
    return c
def area(r): return abs(sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r)))) / 2
cerca = lambda r: math.hypot(sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r)) < RMAX
out = {'ctx': [], 'hof': [], 'roads': [], 'rails': [], 'green': [], 'water': []}
for e in B:
    t = e.get('tags', {})
    if e['type'] == 'way' and 'building' in t and len(e.get('geometry', [])) > 3:
        r = ring(e['geometry'])
        if len(r) >= 3 and cerca(r): out['ctx'].append({'r': r, 'h': alto(t)})
for e in R:
    t = e.get('tags', {}); ms = e.get('members', []); cerr = lambda m: m.get('geometry') and m['geometry'][0] == m['geometry'][-1]
    outer = [ring(m['geometry']) for m in ms if m.get('role') == 'outer' and cerr(m)]; inner = [ring(m['geometry']) for m in ms if m.get('role') == 'inner' and cerr(m)]
    for o in outer:
        if len(o) < 3 or not cerca(o): continue
        hs = [h for h in inner if len(h) >= 3 and dentro(h[0], o)]
        (out['hof'] if e['id'] == 64435 else out['ctx']).append({'r': o, 'h': 18.0 if e['id'] == 64435 else alto(t), **({'holes': hs} if hs else {})})
for e in C:
    t = e.get('tags', {}); g = e.get('geometry') or []
    if len(g) < 2: continue
    if 'railway' in t and t['railway'] in ('rail', 'light_rail', 'subway', 'tram'): out['rails'].append([loc(p) for p in g])
    elif 'highway' in t and t['highway'] not in ('footway', 'steps', 'path', 'cycleway', 'service', 'corridor', 'track'): out['roads'].append([loc(p) for p in g])
    elif t.get('natural') == 'water':
        r = ring(g); out['water'].append(r) if len(r) >= 3 else None
    elif t.get('leisure') in ('park', 'garden', 'playground', 'pitch') or t.get('landuse') == 'grass':
        r = ring(g); out['green'].append(r) if len(r) >= 3 and cerca(r) else None
fp = sum(area(b['r']) - sum(area(h) for h in b.get('holes', [])) for b in out['hof'])
pts = [p for b in out['hof'] for p in b['r']]
# eje largo del edificio (componente principal) para la cota de longitud
cx = sum(p[0] for p in pts) / len(pts); cz = sum(p[1] for p in pts) / len(pts); sxx = sum((p[0] - cx) ** 2 for p in pts); szz = sum((p[1] - cz) ** 2 for p in pts); sxz = sum((p[0] - cx) * (p[1] - cz) for p in pts)
ang = 0.5 * math.atan2(2 * sxz, sxx - szz); ux, uz = math.cos(ang), math.sin(ang); pu = [(p[0] - cx) * ux + (p[1] - cz) * uz for p in pts]
out['eje'] = {'c': [round(cx, 1), round(cz, 1)], 'u': [round(ux, 4), round(uz, 4)], 'u0': round(min(pu), 1), 'u1': round(max(pu), 1)}
# Viena azul: el Ring alrededor del Palais Hansen (Schottenring), en el mismo sistema de coordenadas (unos 4 km al sur)
RB = None
for f in ('ring_b', 'ring_b2'):
    try: RB = json.load(open(f'{D}/{f}.json'))['elements']; break
    except Exception: pass
RC = []
try: RC = json.load(open(f'{D}/ring_c.json'))['elements']
except Exception: pass
out['ring'] = []; out['ringRoads'] = []; out['hansen'] = None
if RB:
    hz = []
    for e in RB:
        t = e.get('tags', {}); n = (t.get('name', '') + ' ' + t.get('addr:street', '') + ' ' + t.get('addr:housenumber', '')).lower()
        es_h = 'hansen' in n or 'kempinski' in n or e['id'] == 160760215   # la manzana Schottenring / Zelinkagasse / Neutorgasse / Gonzagagasse (4.871 m²)
        rings = []
        if e['type'] == 'way' and 'building' in t and len(e.get('geometry', [])) > 3: rings = [(ring(e['geometry']), [])]
        elif e['type'] == 'relation' and 'building' in t:
            ms = e.get('members', []); cerr = lambda m: m.get('geometry') and m['geometry'][0] == m['geometry'][-1]
            outer = [ring(m['geometry']) for m in ms if m.get('role') == 'outer' and cerr(m)]; inner = [ring(m['geometry']) for m in ms if m.get('role') == 'inner' and cerr(m)]
            rings = [(o, [h for h in inner if len(h) >= 3 and dentro(h[0], o)]) for o in outer if len(o) >= 3]
        for o, hs in rings:
            if es_h: hz.append(o); continue
            out['ring'].append({'r': o, 'h': alto(t, 24.0), **({'holes': hs} if hs else {})})
    if hz:
        pts = [p for r in hz for p in r]; cx = sum(p[0] for p in pts) / len(pts); cz = sum(p[1] for p in pts) / len(pts)
        sxx = sum((p[0] - cx) ** 2 for p in pts); szz = sum((p[1] - cz) ** 2 for p in pts); sxz = sum((p[0] - cx) * (p[1] - cz) for p in pts); an = 0.5 * math.atan2(2 * sxz, sxx - szz)
        out['hansen'] = {'c': [round(cx, 1), round(cz, 1)], 'u': [round(math.cos(an), 4), round(math.sin(an), 4)], 'osm': hz}
for e in RC:
    t = e.get('tags', {}); g = e.get('geometry') or []
    if len(g) > 1 and 'highway' in t and t['highway'] not in ('footway', 'steps', 'path', 'cycleway', 'service', 'corridor', 'track'): out['ringRoads'].append([loc(p) for p in g])
print('ring', len(out['ring']), 'calles ring', len(out['ringRoads']), 'hansen', bool(out['hansen']), out['hansen']['c'] if out['hansen'] else '')
json.dump(out, open(f'{ROOT}/motor/web/v022.json', 'w'), separators=(',', ':'))
print('contexto', len(out['ctx']), 'hof', len(out['hof']), 'patios', sum(len(b.get('holes', [])) for b in out['hof']), 'huella', round(fp), 'm2', 'largo', round(max(pu) - min(pu)), 'm', 'calles', len(out['roads']), 'vías', len(out['rails']), 'verde', len(out['green']), 'agua', len(out['water']))
