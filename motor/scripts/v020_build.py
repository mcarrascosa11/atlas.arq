# 020 · Mercado de Olavide · prepara motor/web/v020.json desde datos/olavide/osm.json (OpenStreetMap):
# edificios del entorno con su altura (plantas del Catastro) y patios, calles, jardines y árboles de la plaza de hoy,
# en metros respecto al centro de la plaza; además, el giro del octógono de la plaza (para orientar el mercado).
import json, math, sys, os
ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
E = json.load(open(f'{ROOT}/datos/olavide/osm.json'))['elements']
LAT0, LON0 = 40.432767, -3.701047; K = math.cos(math.radians(LAT0)); RMAX = 330.0
loc = lambda p: [round((p['lon'] - LON0) * 111320 * K, 2), round(-(p['lat'] - LAT0) * 110574, 2)]   # x este, z sur
def ring(g):
    r = [loc(p) for p in g]
    return r[:-1] if len(r) > 1 and r[0] == r[-1] else r
def alto(t):
    try:
        if 'height' in t: return float(t['height'].replace(' m', ''))
        if 'building:levels' in t: return float(t['building:levels']) * 3.2 + 1.2
    except Exception: pass
    return 19.0                                      # sin dato: altura típica de Chamberí (6 plantas)
def dentro(p, rr):
    c = False
    for i in range(len(rr)):
        a, b = rr[i], rr[i - 1]
        if (a[1] > p[1]) != (b[1] > p[1]) and p[0] < a[0] + (p[1] - a[1]) * (b[0] - a[0]) / (b[1] - a[1]): c = not c
    return c
cerca = lambda r: math.hypot(sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r)) < RMAX
out = {'ctx': [], 'roads': [], 'gardens': [], 'trees': [], 'square': None, 'rot': 0.0}
for e in E:
    t = e.get('tags', {})
    if e['type'] == 'way' and 'building' in t and len(e.get('geometry', [])) > 3:
        r = ring(e['geometry'])
        if len(r) >= 3 and cerca(r): out['ctx'].append({'r': r, 'h': alto(t)})
    elif e['type'] == 'relation' and 'building' in t:
        ms = e.get('members', []); cerr = lambda m: m.get('geometry') and m['geometry'][0] == m['geometry'][-1]
        outer = [ring(m['geometry']) for m in ms if m.get('role') == 'outer' and cerr(m)]; inner = [ring(m['geometry']) for m in ms if m.get('role') == 'inner' and cerr(m)]
        for o in outer:
            if len(o) >= 3 and cerca(o):
                hs = [h for h in inner if len(h) >= 3 and dentro(h[0], o)]
                out['ctx'].append({'r': o, 'h': alto(t), **({'holes': hs} if hs else {})})
    elif e['type'] == 'way' and 'highway' in t and len(e.get('geometry', [])) > 1 and t['highway'] not in ('footway', 'steps', 'path', 'cycleway', 'service', 'corridor'):
        r = [loc(p) for p in e['geometry']]
        if any(math.hypot(*p) < RMAX for p in r): out['roads'].append(r)
    elif e['type'] == 'way' and t.get('leisure') == 'garden': out['gardens'].append(ring(e['geometry']))
    elif e['type'] == 'way' and t.get('place') == 'square': out['square'] = ring(e['geometry'])
    elif e['type'] == 'node' and t.get('natural') == 'tree':
        p = loc(e); out['trees'].append(p) if math.hypot(*p) < 45 else None
# giro del octógono: ángulo medio de los lados largos del polígono de la plaza, módulo 45°
sq = out['square']; ang = []
for i in range(len(sq)):
    a, b = sq[i], sq[(i + 1) % len(sq)]; L = math.dist(a, b)
    if L > 8: ang.append((math.degrees(math.atan2(b[1] - a[1], b[0] - a[0])) % 45, L))
s = sum(math.sin(math.radians(a * 8)) * L for a, L in ang); c = sum(math.cos(math.radians(a * 8)) * L for a, L in ang)
out['rot'] = round((math.degrees(math.atan2(s, c)) / 8) % 45, 2)
json.dump(out, open(f'{ROOT}/motor/web/v020.json', 'w'), separators=(',', ':'))
print('edificios', len(out['ctx']), 'con patio', sum(1 for b in out['ctx'] if 'holes' in b), 'calles', len(out['roads']), 'jardines', len(out['gardens']), 'árboles', len(out['trees']), 'giro', out['rot'], os.path.getsize(f'{ROOT}/motor/web/v020.json'), 'B')
