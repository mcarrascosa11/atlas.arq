# 001 en inglés · prepara motor/web/v001en.json a partir de datos/brunelleschi/osm.json (OpenStreetMap):
# edificios del entorno del Duomo (con sus patios), calles, campanile y baptisterio, en metros respecto al eje de la cúpula.
# El templo está girado 1,35° respecto al norte: se deshace ese giro para que la nave quede sobre el eje −x. x este, z sur.
import json, math, sys, os
ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
E = json.load(open(f'{ROOT}/datos/brunelleschi/osm.json'))['elements']
for f in ('rel_a', 'rel_b', 'rel_c', 'rel'):                    # edificios con patio (relaciones con su geometría), de la descarga que haya respondido
    q = f'{ROOT}/datos/brunelleschi/{f}.json'
    try:
        R = json.load(open(q))['elements']; E = [e for e in E if not (e['type'] == 'relation')] + R; print('relaciones de', f, len(R)); break
    except Exception: pass
LAT0, LON0 = 43.77310, 11.25650; K = math.cos(math.radians(LAT0)); AX, AY = 36.28, 2.27; TH = math.radians(1.35); RMAX = 400.0
def loc(p):
    dx = (p['lon'] - LON0) * 111320 * K - AX; dy = (p['lat'] - LAT0) * 110574 - AY
    return [round(dx * math.cos(TH) - dy * math.sin(TH), 2), round(-(dx * math.sin(TH) + dy * math.cos(TH)), 2)]
def ring(g):
    r = [loc(p) for p in g]
    if len(r) > 1 and r[0] == r[-1]: r = r[:-1]
    return r
def alto(t):
    try:
        if 'height' in t: return float(t['height'].replace(' m', ''))
        if 'building:levels' in t: return float(t['building:levels']) * 3.4 + 1.0
    except Exception: pass
    return 17.0                                              # sin dato: altura típica del centro de Florencia (4-5 plantas)
ESP = {43768260: 'catedral', 251650632: 'campanile', 166821303: 'baptisterio'}
out = {'ctx': [], 'roads': [], 'campanile': None, 'baptisterio': None}
def cerca(r): cx = sum(p[0] for p in r) / len(r); cz = sum(p[1] for p in r) / len(r); return math.hypot(cx, cz) < RMAX
for e in E:
    t = e.get('tags', {})
    if e['type'] == 'way' and 'building' in t and len(e.get('geometry', [])) > 3:
        r = ring(e['geometry'])
        if e['id'] in ESP:
            if ESP[e['id']] != 'catedral': out[ESP[e['id']]] = r
            continue
        if len(r) >= 3 and cerca(r): out['ctx'].append({'r': r, 'h': alto(t)})
    elif e['type'] == 'relation' and 'building' in t:
        outer = [ring(m['geometry']) for m in e.get('members', []) if m.get('role') == 'outer' and m.get('geometry')]
        inner = [ring(m['geometry']) for m in e.get('members', []) if m.get('role') == 'inner' and m.get('geometry')]
        # solo anillos cerrados (los que vienen partidos en varios tramos se descartan)
        cerr = lambda m: m['geometry'][0] == m['geometry'][-1]
        outer = [ring(m['geometry']) for m in e.get('members', []) if m.get('role') == 'outer' and m.get('geometry') and cerr(m)]
        inner = [ring(m['geometry']) for m in e.get('members', []) if m.get('role') == 'inner' and m.get('geometry') and cerr(m)]
        for o in outer:
            if len(o) >= 3 and cerca(o):
                def dentro(p, rr):
                    c = False
                    for i in range(len(rr)):
                        a, b = rr[i], rr[i - 1]
                        if (a[1] > p[1]) != (b[1] > p[1]) and p[0] < a[0] + (p[1] - a[1]) * (b[0] - a[0]) / (b[1] - a[1]): c = not c
                    return c
                hs = [h for h in inner if len(h) >= 3 and dentro(h[0], o)]
                out['ctx'].append({'r': o, 'h': alto(t), 'holes': hs} if hs else {'r': o, 'h': alto(t)})
    elif e['type'] == 'way' and 'highway' in t and t['highway'] in ('pedestrian', 'residential', 'tertiary', 'secondary', 'living_street', 'unclassified', 'primary') and len(e.get('geometry', [])) > 1:
        r = [loc(p) for p in e['geometry']]
        if any(math.hypot(p[0], p[1]) < RMAX for p in r): out['roads'].append(r)
json.dump(out, open(f'{ROOT}/motor/web/v001en.json', 'w'), separators=(',', ':'))
print('contexto', len(out['ctx']), 'edificios,', sum(1 for b in out['ctx'] if 'holes' in b), 'con patio,', len(out['roads']), 'calles; campanile', len(out['campanile'] or []), 'baptisterio', len(out['baptisterio'] or []), os.path.getsize(f'{ROOT}/motor/web/v001en.json'), 'B')
