# 019 · Ayuntamiento de Säynätsalo (Alvar Aalto, 1949-1952) · vídeo bilingüe dibujado en 2D (planta, sección y axonometría) con matplotlib.
# Plantas reales de OpenStreetMap (datos/saynatsalo/osm.json: ayuntamiento, edificios, calles, agua). Alturas, torre del consejo,
# escaleras y programa: esquema aproximado a partir de la documentación publicada (se indica en pantalla).
# uso: python3 saynatsalo_video.py -- ESCENA_JSON(no se usa) CARPETA F0 F1 [PORCENTAJE]   (F0 puede ser una lista: 45,142,...)
import sys, os, json, math, time
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import Polygon, Rectangle, Circle
from fontTools.ttLib import TTFont
argv = sys.argv[sys.argv.index('--') + 1:]; OUT = argv[1]; os.makedirs(OUT, exist_ok=True)
FRAMES = [int(x) for x in argv[2].split(',')] if ',' in argv[2] else list(range(int(argv[2]), int(argv[3]) + 1)); PCT = int(argv[4]) if len(argv) > 4 else 100
FPS = 30; W, H = 1080, 1920
PAPER, INK, RED, GREY, PINK, GRASS, WATER = '#F2F1EC', '#1A1B20', '#E2401C', '#9C998F', '#F3C1B0', '#C9D8B4', '#DCE3E6'
for f in ('sg700', 'sm400'):
    t = TTFont(f'motor/web/fonts/{f}.woff2'); t.flavor = None; t.save(f'/tmp/{f}.ttf'); font_manager.fontManager.addfont(f'/tmp/{f}.ttf')
SG = font_manager.FontProperties(fname='/tmp/sg700.ttf'); SM = font_manager.FontProperties(fname='/tmp/sm400.ttf')
ss = lambda x: 0.0 if x <= 0 else 1.0 if x >= 1 else x * x * (3 - 2 * x)
# --- datos: coordenadas locales en metros con origen junto al ayuntamiento
OSM = json.load(open('datos/saynatsalo/osm.json'))['elements']
LAT0, LON0 = 62.14000, 25.76900; KX = math.cos(math.radians(LAT0))
def xy(p): return ((p['lon'] - LON0) * 111320 * KX, (p['lat'] - LAT0) * 110574)
U = next([xy(p) for p in e['geometry']][:-1] for e in OSM if e.get('id') == 165019314)      # ala en U: oficinas, consejo, viviendas
LIB = next([xy(p) for p in e['geometry']][:-1] for e in OSM if e.get('id') == 165019321)    # bloque de la biblioteca (tiendas abajo)
TORRE = [(15.3, 26.0), (19.9, 17.1), (33.4, 23.9), (28.1, 34.4), (24.9, 32.8), (20.2, 28.4)]   # sala del consejo (posición y planta aproximadas)
PATIO = [(5.1, 14.5), (-2.0, 28.4), (15.6, 37.3), (20.2, 28.4), (15.3, 26.0), (19.9, 17.1), (21.4, 13.8), (20.6, 15.5), (6.2, 9.1)]
CTX = [e for e in OSM if e.get('type') == 'way' and len(e.get('geometry', [])) > 2 and e.get('id') not in (165019314, 165019321)]
fig = plt.figure(figsize=(W / 100, H / 100), dpi=100 * PCT / 100); ax = fig.add_axes([0, 0, 1, 1])
def lienzo():
    ax.cla(); ax.set_xlim(0, W); ax.set_ylim(0, H); ax.axis('off'); fig.patch.set_facecolor(PAPER); ax.set_facecolor(PAPER)
def txt(x, y, s, size=22, font=None, color=INK, ha='left', va='baseline', alpha=1.0, fondo=False):
    ax.text(x, y, s, fontproperties=font or SM, fontsize=size * 0.72, color=color, ha=ha, va=va, alpha=alpha, zorder=8,
            bbox=dict(fc=PAPER, ec='none', pad=5, alpha=0.92 * alpha) if fondo else None)          # sobre los mapas, con fondo de papel para que se lea
# --- planta (mapa) con escala y centro dados
def planta(cx, cy, s, R, resalta=1.0, gris=False):
    T = lambda p: (cx + p[0] * s, cy + p[1] * s)
    for e in CTX:
        t = e.get('tags', {}); g = [xy(p) for p in e['geometry']]
        if not any(abs(x) < R and abs(y) < R * 1.4 for x, y in g): continue
        if t.get('natural') == 'water': ax.add_patch(Polygon([T(p) for p in g], closed=True, fc=WATER, ec='none', zorder=1))
        elif t.get('natural') in ('wood',) or t.get('landuse') in ('forest', 'grass', 'meadow') or t.get('name') == 'Kunnantalon puisto':
            ax.add_patch(Polygon([T(p) for p in g], closed=True, fc='#E3EAD8', ec='none', zorder=1))
    for e in CTX:
        t = e.get('tags', {}); g = [xy(p) for p in e['geometry']]
        if not any(abs(x) < R and abs(y) < R * 1.4 for x, y in g): continue
        if 'highway' in t:
            xs, ys = zip(*[T(p) for p in g]); ax.plot(xs, ys, color='#CFCBC0', lw=2.2 if t['highway'] in ('primary', 'secondary', 'tertiary') else 1.0, zorder=2, solid_capstyle='round')
        elif 'building' in t: ax.add_patch(Polygon([T(p) for p in g], closed=True, fc=PAPER, ec=INK, lw=0.8, zorder=3))
    c = GREY if gris else RED
    for P in (U, LIB): ax.add_patch(Polygon([T(p) for p in P], closed=True, fc=c, ec=INK, lw=1.0, zorder=4, alpha=resalta))
# --- axonometría: el conjunto en piezas convexas (alas, torre, biblioteca); cada pieza dibuja solo las caras que ve el observador
AZ = math.radians(35)
def pr(x, y, z, cx, cy, s):
    u = x * math.cos(AZ) - y * math.sin(AZ); v = x * math.sin(AZ) + y * math.cos(AZ)
    return (cx + u * s * 0.87, cy + v * s * 0.62 + z * s * 0.9)   # algo más cenital: se ve el patio
OESTE = [(-6.2, 8.8), (5.1, 14.5), (-2.0, 28.4), (-17.1, 30.2)]           # ala oeste (viviendas)
NORTE = [(-17.1, 30.2), (-2.0, 28.4), (15.6, 37.3), (17.3, 47.6)]          # ala norte (oficinas)
ESTE = [(15.6, 37.3), (20.2, 28.4), (24.9, 32.8), (17.3, 47.6)]            # ala este (oficinas)
CONSEJO = [(15.3, 26.0), (19.9, 17.1), (33.4, 23.9), (28.1, 34.4)]         # torre de la sala del consejo (aprox.)
def hull(P):
    P = sorted(set(P)); cr = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); lo, up = [], []
    for q in P:
        while len(lo) > 1 and cr(lo[-2], lo[-1], q) <= 0: lo.pop()
        lo.append(q)
    for q in reversed(P):
        while len(up) > 1 and cr(up[-2], up[-1], q) <= 0: up.pop()
        up.append(q)
    return lo[:-1] + up[:-1]
BIBLIO = hull(LIB)
def ccw(P): return P if sum(P[i][0] * P[(i + 1) % len(P)][1] - P[(i + 1) % len(P)][0] * P[i][1] for i in range(len(P))) > 0 else P[::-1]
VX, VY = math.sin(AZ), math.cos(AZ)                                       # dirección hacia el observador en planta (se mira desde -y girado)
PATIO_C = (10.0, 26.0)                                                     # centro del patio: las caras que miran hacia él son las acristaladas
def zt(P, z1, sube, dirv):                                                # cubierta a un agua: altura de cada vértice según la dirección de la pendiente
    if not sube: return [z1] * len(P)
    d = [x * dirv[0] + y * dirv[1] for x, y in P]; d0, d1 = min(d), max(d)
    return [z1 - sube + sube * (v - d0) / (d1 - d0) for v in d]
def huecos(a, b, za, zb, z0, tipo, cx, cy, s):                            # ventanas sobre una fachada (a, b en planta; za, zb alturas de cubierta en sus extremos)
    L = math.dist(a, b); n = max(1, int(L / 3.0))
    P = lambda f, z: pr(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, z, cx, cy, s)
    if tipo == 'patio':                                                   # corredor acristalado alrededor del patio: banda continua con montantes
        z1, z2 = 3.4, 6.2
        ax.add_patch(Polygon([P(0.04, z1), P(0.96, z1), P(0.96, z2), P(0.04, z2)], closed=True, fc='#DCE3E6', ec=INK, lw=0.8))
        for k in range(1, n * 2): f = 0.04 + 0.92 * k / (n * 2); ax.plot(*zip(P(f, z1), P(f, z2)), color=INK, lw=0.5, zorder=1)
    elif tipo == 'lamas':                                                 # ventanal de lamas de la sala del consejo, hacia el oeste
        z1, z2 = 7.0, min(za, zb) - 1.2
        ax.add_patch(Polygon([P(0.2, z1), P(0.8, z1), P(0.8, z2), P(0.2, z2)], closed=True, fc='#DCE3E6', ec=INK, lw=0.8))
        for k in range(1, 22): f = 0.2 + 0.6 * k / 22; ax.plot(*zip(P(f, z1), P(f, z2)), color=INK, lw=0.6, zorder=1)
    else:                                                                 # fachada exterior de ladrillo: huecos sueltos
        for lv in ((1.2, 2.6), (6.0, 7.6)) if min(za, zb) > 8 else ((1.2, 2.6),):
            for k in range(n):
                f0, f1 = (k + 0.3) / n, (k + 0.7) / n
                ax.add_patch(Polygon([P(f0, lv[0]), P(f1, lv[0]), P(f1, lv[1]), P(f0, lv[1])], closed=True, fc='#DCE3E6', ec=INK, lw=0.6))
def prisma(P, z0, z1, top, lado, cx, cy, s, lw=1.0, sube=0.0, dirv=(0, 1), torre=False, ec=INK):
    P = ccw(P); n = len(P); Z = zt(P, z1, sube, dirv)
    for i in range(n):
        a, b = P[i], P[(i + 1) % n]; nx, ny = (b[1] - a[1]), -(b[0] - a[0])         # normal exterior de la cara
        if nx * (-VX) + ny * (-VY) <= 0: continue                                     # cara de espaldas: no se dibuja
        za, zb = Z[i], Z[(i + 1) % n]
        ax.add_patch(Polygon([pr(a[0], a[1], z0, cx, cy, s), pr(b[0], b[1], z0, cx, cy, s), pr(b[0], b[1], zb, cx, cy, s), pr(a[0], a[1], za, cx, cy, s)],
                             closed=True, fc=lado, ec=ec, lw=lw, hatch='////' if lado == PAPER else None))
        if lado == PAPER and z1 > 5:
            mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2; hacia = (PATIO_C[0] - mx) * nx + (PATIO_C[1] - my) * ny
            tipo = 'lamas' if (torre and nx < -0.3 * math.hypot(nx, ny)) else 'patio' if (hacia > 0 and not torre) else 'ext'
            huecos(a, b, za, zb, z0, tipo, cx, cy, s)
    ax.add_patch(Polygon([pr(x, y, z, cx, cy, s) for (x, y), z in zip(P, Z)], closed=True, fc=top, ec=ec, lw=lw))
def profundo(P): return sum(x * VX + y * VY for x, y in P) / len(P)       # más lejos = mayor valor: se dibuja antes
def prismas(cuerpos, cx, cy, s, crecer=1.0):
    for c in sorted(cuerpos, key=lambda c: -profundo(c[0])):
        P, z0, z1, top, lado, lw = c[:6]; extra = c[6] if len(c) > 6 else {}
        prisma(P, z0, z0 + (z1 - z0) * crecer, top, lado, cx, cy, s, lw, **extra)
def hierba(cx, cy, s, a=1.0):                         # escalera de hierba: terrazas que bajan del patio al terreno, hacia el oeste
    pasos = 5; cs = []
    for k in range(pasos):
        f = k / pasos; z = 3.0 * (1 - (k + 1) / pasos)
        P = [(5.1 - 6.5 * f - 1.3, 14.5 - 3.3 * f - 0.7), (6.2 - 6.5 * f - 1.3, 9.1 - 3.3 * f - 0.7), (6.2 - 6.5 * f, 9.1 - 3.3 * f), (5.1 - 6.5 * f, 14.5 - 3.3 * f)]
        if f <= a: cs.append((P, 0.0, z + 0.6, GRASS, '#B7C9A0', 0.6))
    prismas(cs, cx, cy, s)
# --- contexto del lugar (OpenStreetMap): el ayuntamiento no es un objeto suelto
RC = 170.0; C0 = (8.0, 20.0)
def _cerca(g): cxg = sum(x for x, _ in g) / len(g); cyg = sum(y for _, y in g) / len(g); return math.hypot(cxg - C0[0], cyg - C0[1]) < RC
ALT = {'apartments': 9.0, 'detached': 6.0, 'terrace': 4.0, 'shed': 3.0, 'retail': 4.5, 'warehouse': 6.0}
CTX_B, CTX_G, CTX_R = [], [], []
for e in CTX:
    t = e.get('tags', {}); g = [xy(p) for p in e['geometry']]
    if not _cerca(g): continue
    if 'building' in t:
        lv = t.get('building:levels'); h = float(lv) * 3.0 + 0.5 if lv and lv.replace('.', '').isdigit() else ALT.get(t['building'], 6.0)
        CTX_B.append((hull(g[:-1] if g[0] == g[-1] else g), h))
    elif t.get('natural') in ('wood',) or t.get('landuse') in ('forest', 'grass', 'meadow') or t.get('leisure') == 'park': CTX_G.append(g)
    elif 'highway' in t: CTX_R.append((g, t['highway']))
def _dentro(x, y, g):
    c = False
    for i in range(len(g)):
        (x1, y1), (x2, y2) = g[i], g[i - 1]
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1): c = not c
    return c
import random as _rnd
_R = _rnd.Random(19); ARBOLES = []
for g in CTX_G:                                                           # arbolado: puntos al tresbolillo dentro de bosques y parques, sin pisar edificios
    xs = [x for x, _ in g]; ys = [y for _, y in g]
    for gx in range(int(min(xs)), int(max(xs)), 9):
        for gy in range(int(min(ys)), int(max(ys)), 9):
            x, y = gx + _R.uniform(-3, 3), gy + _R.uniform(-3, 3)
            if math.hypot(x - C0[0], y - C0[1]) < RC and _dentro(x, y, g) and not any(_dentro(x, y, b) for b, _ in CTX_B) and not (-25 < x < 40 and -8 < y < 52):
                ARBOLES.append((x, y))
ARBOLES = ARBOLES[:260]
def suelo(cx, cy, s):                                                     # zonas verdes y calles, en el plano del terreno
    for g in CTX_G: ax.add_patch(Polygon([pr(x, y, 0, cx, cy, s) for x, y in g], closed=True, fc='#E8EDDF', ec='none'))
    for g, kind in CTX_R:
        xs, ys = zip(*[pr(x, y, 0, cx, cy, s) for x, y in g])
        ax.plot(xs, ys, color='#D9D5CB', lw=6 if kind in ('tertiary', 'residential') else 2.5, solid_capstyle='round', zorder=1)
def arbol(x, y, cx, cy, s):
    a = pr(x, y, 0, cx, cy, s); b = pr(x, y, 5.5, cx, cy, s)
    ax.add_patch(Polygon([a, (a[0] + 1, a[1]), (b[0] + 1, b[1]), b], closed=True, fc=GREY, ec='none'))
    ax.add_patch(Circle(b, 2.6 * s * 0.9, fc='#E3EAD8', ec=GREY, lw=0.5))
def edificio(cx, cy, s, crecer=1.0, c_res=PAPER, c_ofi=PAPER, c_con=PAPER, c_bib=PAPER, patio=True, contexto=True, hierba_a=1.0):
    if contexto: suelo(cx, cy, s)
    if patio: ax.add_patch(Polygon([pr(x, y, 3.0, cx, cy, s) for x, y in PATIO], closed=True, fc='#E6E3DA', ec=INK, lw=0.6))
    hacia_fuera = lambda P: (lambda c: (c[0] - PATIO_C[0], c[1] - PATIO_C[1]))((sum(x for x, _ in P) / len(P), sum(y for _, y in P) / len(P)))
    piezas = [(OESTE, 0.0, 10.0, c_res, PAPER, 1.0, dict(sube=1.2, dirv=hacia_fuera(OESTE))), (NORTE, 0.0, 10.0, c_ofi, PAPER, 1.0, dict(sube=1.2, dirv=hacia_fuera(NORTE))),
              (ESTE, 0.0, 10.0, c_ofi, PAPER, 1.0, dict(sube=1.2, dirv=hacia_fuera(ESTE))),
              (CONSEJO, 0.0, 17.0, c_con, PAPER, 1.0, dict(sube=3.5, dirv=(-1, 0.3), torre=True)), (BIBLIO, 0.0, 7.5, c_bib, PAPER, 1.0, dict(sube=0.8, dirv=(0, -1)))]
    items = []
    for P, z0, z1, top, lado, lw, extra in piezas: items.append((profundo(P), lambda P=P, z0=z0, z1=z1, top=top, lado=lado, lw=lw, extra=extra: prisma(P, z0, z0 + (z1 - z0) * crecer, top, lado, cx, cy, s, lw, **extra)))
    pasos = 5
    for k in range(pasos):                                                  # escalera de hierba: terrazas que bajan del patio al terreno, hacia el oeste
        f = k / pasos; z = 3.0 * (1 - (k + 1) / pasos)
        P = [(5.1 - 6.5 * f - 1.3, 14.5 - 3.3 * f - 0.7), (6.2 - 6.5 * f - 1.3, 9.1 - 3.3 * f - 0.7), (6.2 - 6.5 * f, 9.1 - 3.3 * f), (5.1 - 6.5 * f, 14.5 - 3.3 * f)]
        if f <= hierba_a: items.append((profundo(P), lambda P=P, z=z: prisma(P, 0.0, z + 0.6, GRASS, '#B7C9A0', cx, cy, s, 0.6)))
    if contexto:
        for P, h in CTX_B: items.append((profundo(P), lambda P=P, h=h: prisma(P, 0.0, h, PAPER, '#ECEAE3', cx, cy, s, 0.5, ec=GREY)))
        for x, y in ARBOLES: items.append((x * VX + y * VY, lambda x=x, y=y: arbol(x, y, cx, cy, s)))
    for _, fn in sorted(items, key=lambda it: -it[0]): fn()
# --- escenas
def e_mapa(u, t):
    z = 0.32 + 1.3 * ss((u - 0.2) / 0.7); planta(540, 760, z, 900 / z * 1.2)
    txt(90, 300, 'SÄYNÄTSALO · FINLANDIA · FINLAND', 18, color=GREY, fondo=True); txt(90, 260, 'UNOS 3.000 VECINOS · ABOUT 3,000 RESIDENTS (1949)', 18, color=RED, fondo=True)
def e_concurso(u, t):
    s = 13.0; cx, cy = 470, 640
    for P in (U, LIB):
        n = len(P); k = ss(u / 0.75) * n
        for i in range(int(k)):
            a, b = P[i], P[(i + 1) % n]; ax.plot([cx + a[0] * s, cx + b[0] * s], [cy + a[1] * s, cy + b[1] * s], color=INK, lw=2.5)
        if k >= n - 0.01: ax.add_patch(Polygon([(cx + x * s, cy + y * s) for x, y in P], closed=True, fc=PINK, ec=INK, lw=2.5))
    d = ss((u - 0.6) / 0.3)
    if d > 0: txt(90, 330, '«CURIA»', 70 * d + 1, SG, RED); txt(90, 270, 'LEMA DEL CONCURSO · COMPETITION ENTRY, 1949', 16, color=GREY, alpha=d)
def e_seccion(u, t):
    yA, yB = 1060, 660                                                    # ladera: de arriba a la izquierda a abajo a la derecha
    ladera = lambda x: yA + (yB - yA) * (x - 90) / 900
    ax.fill_between([90, 990], [ladera(90), ladera(990)], [520, 520], color='#E6E3DA', zorder=1)
    ax.plot([90, 990], [ladera(90), ladera(990)], color=INK, lw=1.5, zorder=3)
    yp = ladera(540)                                                       # cota del patio: la de la mitad de la ladera
    corte = [(330, ladera(330)), (540, yp), (330, yp)]                    # tierra que sobra arriba
    relleno = [(540, yp), (750, yp), (750, ladera(750))]                  # hueco que falta abajo
    k = ss((u - 0.25) / 0.45)
    pts = [(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k) for a, b in zip(corte, [relleno[2], relleno[0], relleno[1]])]
    ax.add_patch(Polygon(corte, closed=True, fc=PAPER, ec=GREY, lw=1, ls='--', zorder=2, alpha=k))
    ax.add_patch(Polygon(pts, closed=True, fc=PINK, ec=RED, lw=2, hatch='////', zorder=4))
    p = ss((u - 0.65) / 0.25)
    if p > 0:
        ax.plot([330, 750], [yp, yp], color=RED, lw=5 * p, zorder=5)
        for x0, w, h in ((250, 80, 300), (750, 90, 330)): ax.add_patch(Rectangle((x0, yp), w, h * p, fc=PAPER, ec=INK, lw=2, zorder=6))
        txt(420, yp + 22, 'PATIO · COURTYARD', 16, color=RED, alpha=p)
    txt(90, 470, 'DE LA LADERA AL PATIO ELEVADO', 16, color=RED); txt(90, 435, 'FROM THE SLOPE TO THE RAISED COURTYARD', 16, color=GREY)
    txt(90, 380, 'SECCIÓN ESQUEMÁTICA · SCHEMATIC SECTION', 13, color=GREY)
def e_hierba(u, t):
    cx, cy, s = 500, 560, 12.5; edificio(cx, cy, s, hierba_a=ss(u / 0.6))
    txt(90, 330, 'ESCALERA DE HIERBA · GRASS STAIRS', 16, color=GREY, fondo=True); txt(90, 290, 'VOLUMETRÍA APROXIMADA · APPROXIMATE MASSING', 13, color=GREY, fondo=True)
def e_programa(u, t):
    cx, cy, s = 500, 560, 12.5; k = ss(u / 0.5)
    edificio(cx, cy, s, c_con=PINK if u > 0.3 else PAPER, c_bib=PINK if u > 0.1 else PAPER, c_res=PINK if u > 0.7 else PAPER, c_ofi=PINK if u > 0.85 else PAPER)
    labs = [((25, 25, 18), 'CONSEJO · COUNCIL', 0.3), ((15, 5, 8), 'BIBLIOTECA · LIBRARY', 0.1), ((15, 5, 1), 'TIENDAS · SHOPS', 0.5), ((-12, 25, 10), 'VIVIENDAS · HOMES', 0.7), ((0, 40, 10), 'OFICINAS · OFFICES', 0.85)]
    for (x, y, z), lab, a0 in labs:
        a = ss((u - a0) / 0.15)
        if a > 0:
            px, py = pr(x, y, z, cx, cy, s); ax.add_patch(Circle((px, py), 6, fc=RED, ec='none', alpha=a, zorder=8)); txt(px + 14, py + 8, lab, 17, color=INK, alpha=a, fondo=True)
def e_siena(u, t):                                                        # «Siena tiene 16 m; propongo 17»: dos alturas a la misma escala
    k = 44.0; y0 = 330
    def sala(x, h, c, a, lab, sub):
        hh = h * k * ss(a)
        ax.add_patch(Rectangle((x, y0), 260, hh, fc=c, ec=INK, lw=2, hatch='////' if c == PAPER else None))
        if a > 0.95: txt(x + 130, y0 + hh + 24, f'{h} m', 44, SG, RED if c != PAPER else INK, ha='center')
        txt(x + 130, y0 - 46, lab, 17, color=INK, ha='center'); txt(x + 130, y0 - 78, sub, 13, color=GREY, ha='center')
    sala(190, 16, PAPER, (u - 0.05) / 0.35, 'SIENA', 'SALA DEL CONSIGLIO')
    sala(630, 17, PINK, (u - 0.4) / 0.35, 'SÄYNÄTSALO', 'SALA DEL CONSEJO · COUNCIL')
    for x in (470,):                                                       # una persona de 1,8 m para dar la escala
        ax.add_patch(Rectangle((x + 30, y0), 14, 1.2 * k, fc=INK, ec='none')); ax.add_patch(Circle((x + 37, y0 + 1.55 * k), 0.28 * k, fc=INK, ec='none'))
    ax.plot([140, 940], [y0, y0], color=INK, lw=1.5)
    txt(540, 200, 'ALTURAS SEGÚN AALTO · HEIGHTS AS STATED BY AALTO', 13, color=GREY, ha='center')
def e_fusion(u, t):
    z = 1.62 - 1.2 * ss(u / 0.7); planta(540, 760, z, 900 / z * 1.2, gris=u > 0.45)
    a = ss((u - 0.45) / 0.3)
    txt(90, 300, '1993 · SÄYNÄTSALO + JYVÄSKYLÄ', 22, SG, INK, alpha=max(a, 0.01), fondo=True); txt(90, 260, 'EL MUNICIPIO DESAPARECE · THE MUNICIPALITY IS MERGED', 15, color=INK, alpha=max(a, 0.01), fondo=True)
def e_unesco(u, t):
    cx, cy, s = 500, 560, 12.5; edificio(cx, cy, s, c_res=RED, c_ofi=RED, c_con=RED, c_bib=RED)
    a = ss((u - 0.3) / 0.3)
    txt(90, 330, 'PATRIMONIO MUNDIAL · WORLD HERITAGE · 2026', 18, color=RED, alpha=max(a, 0.01), fondo=True); txt(90, 290, 'JUNTO A OTRAS 12 OBRAS DE AALTO · WITH 12 OTHER AALTO WORKS', 13, color=GREY, alpha=max(a, 0.01), fondo=True)
SCN = [(0.0, 5.0, e_mapa), (5.0, 10.0, e_concurso), (10.0, 15.0, e_seccion), (15.0, 19.5, e_hierba), (19.5, 24.5, e_programa),
       (24.5, 29.0, e_siena), (29.0, 35.0, e_fusion), (35.0, 40.0, e_unesco)]
t0 = time.time(); n = len(FRAMES)
for k, f in enumerate(FRAMES):
    t = f / FPS; lienzo()
    for a, b, fn in SCN:
        if a <= t < b or (fn is SCN[-1][2] and t >= a): fn((t - a) / (b - a), t); break
    fig.savefig(f'{OUT}/{f:05d}.png', facecolor=PAPER)
    if (k + 1) % 30 == 0 or k + 1 == n or n <= 15: print(f'fotograma {k + 1}/{n} · {time.time() - t0:.0f} s', flush=True)
print('vídeo ok', n)
