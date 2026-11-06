# 018 · Centros de datos en Aragón · vídeo de 62,5 s dibujado en 2D (plantas y gráficos, como el 002) con matplotlib.
# Datos: comunidades autónomas (datos/cdd/ccaa.geojson), Casco Histórico de Zaragoza (datos/cdd/casco_osm.json, OpenStreetMap).
# Los puntos de los proyectos son ubicaciones aproximadas por municipio y los símbolos del mapa no están a escala (se indica en pantalla).
# uso: python3 cdd_video.py -- ESCENA_JSON(no se usa) CARPETA F0 F1 [PORCENTAJE]   (F0 puede ser una lista: 45,142,...)
import sys, os, json, math, time
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import Polygon, Rectangle, Circle, FancyArrowPatch
from fontTools.ttLib import TTFont
argv = sys.argv[sys.argv.index('--') + 1:]; OUT = argv[1]; os.makedirs(OUT, exist_ok=True)
FRAMES = [int(x) for x in argv[2].split(',')] if ',' in argv[2] else list(range(int(argv[2]), int(argv[3]) + 1)); PCT = int(argv[4]) if len(argv) > 4 else 100
FPS = 30; W, H = 1080, 1920
PAPER, INK, RED, GREY, PINK = '#F2F1EC', '#1A1B20', '#E2401C', '#9C998F', '#F3C1B0'
for f in ('sg700', 'sm400'):
    t = TTFont(f'motor/web/fonts/{f}.woff2'); t.flavor = None; t.save(f'/tmp/{f}.ttf'); font_manager.fontManager.addfont(f'/tmp/{f}.ttf')
SG = font_manager.FontProperties(fname='/tmp/sg700.ttf'); SM = font_manager.FontProperties(fname='/tmp/sm400.ttf')
ss = lambda x: 0.0 if x <= 0 else 1.0 if x >= 1 else x * x * (3 - 2 * x)
# --- geometría: comunidades (proyección equirectangular a 40º N) y el Casco Histórico
K = math.cos(math.radians(40))
def anillos(geom):
    cs = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
    return [[(x * K, y) for x, y in pol[0]] for pol in cs]
CC = {f['properties']['name']: anillos(f['geometry']) for f in json.load(open('datos/cdd/ccaa.geojson'))['features']}
PEN = [n for n in CC if n not in ('Canarias', 'Ceuta', 'Melilla')]
def casco():
    try:
        E = json.load(open('datos/cdd/casco_osm.json'))['elements']
        rel = [e for e in E if e['type'] == 'relation' and 'Casco' in e.get('tags', {}).get('name', '')]
        ways = [[(p['lon'], p['lat']) for p in m['geometry']] for m in rel[0]['members'] if m.get('role') == 'outer' and 'geometry' in m]
        anillo = ways.pop(0)
        while ways:                                    # se cosen los tramos del contorno en un solo anillo
            fin = anillo[-1]; k = min(range(len(ways)), key=lambda i: min(math.dist(fin, ways[i][0]), math.dist(fin, ways[i][-1])))
            w = ways.pop(k); anillo += (w if math.dist(fin, w[0]) <= math.dist(fin, w[-1]) else w[::-1])
        lat0 = sum(p[1] for p in anillo) / len(anillo)
        return [((x - anillo[0][0]) * 111320 * math.cos(math.radians(lat0)), (y - anillo[0][1]) * 110574) for x, y in anillo], True
    except Exception as e:
        print('Casco Histórico sin datos de OSM, esquema aproximado:', e, flush=True)
        r = 794; return [(r * math.cos(a / 40 * 2 * math.pi), r * 0.8 * math.sin(a / 40 * 2 * math.pi)) for a in range(40)], False
CASCO, CASCO_OSM = casco()
def area(p): return abs(sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p)))) / 2
CASCO_HA = area(CASCO) / 1e4; print('Casco Histórico', round(CASCO_HA), 'ha', 'OSM' if CASCO_OSM else 'aprox.', flush=True)
# proyectos (municipio aproximado; ha según DIGA/PIGA y prensa) — los símbolos no están a escala
SITIOS = [('Huesca', 42.12, -0.43), ('Villanueva de Gállego', 41.77, -0.83), ('San Mateo de Gállego', 41.83, -0.77), ('El Burgo de Ebro', 41.57, -0.74),
          ('Villamayor de Gállego', 41.69, -0.77), ('Zaragoza', 41.62, -0.89), ('La Muela', 41.58, -1.12), ('Calatorao', 41.52, -1.35),
          ('La Puebla de Alfindén', 41.63, -0.75), ('Luceni', 41.83, -1.24), ('La Puebla de Híjar', 41.21, -0.45), ('Azaila', 41.29, -0.49)]
CIUDADES = [('ZARAGOZA', 41.65, -0.88), ('HUESCA', 42.14, -0.41), ('TERUEL', 40.34, -1.11)]
fig = plt.figure(figsize=(W / 100, H / 100), dpi=100 * PCT / 100); ax = fig.add_axes([0, 0, 1, 1])
def lienzo():
    ax.cla(); ax.set_xlim(0, W); ax.set_ylim(0, H); ax.axis('off'); fig.patch.set_facecolor(PAPER); ax.set_facecolor(PAPER)
def txt(x, y, s, size=22, font=None, color=INK, ha='left', va='baseline', alpha=1.0):
    ax.text(x, y, s, fontproperties=font or SM, fontsize=size * 0.72, color=color, ha=ha, va=va, alpha=alpha)
def mapa(nombres, caja, rellenos=None, alpha=1.0, lw=1.2):    # dibuja comunidades encajadas en caja (x0, y0, x1, y1) en píxeles
    pts = [p for n in nombres for r in CC[n] for p in r]; mx0, mx1 = min(p[0] for p in pts), max(p[0] for p in pts); my0, my1 = min(p[1] for p in pts), max(p[1] for p in pts)
    s = min((caja[2] - caja[0]) / (mx1 - mx0), (caja[3] - caja[1]) / (my1 - my0)); ox = caja[0] + ((caja[2] - caja[0]) - (mx1 - mx0) * s) / 2; oy = caja[1] + ((caja[3] - caja[1]) - (my1 - my0) * s) / 2
    T = lambda x, y: (ox + (x - mx0) * s, oy + (y - my0) * s)
    for n in nombres:
        fc, hatch, ec = (rellenos or {}).get(n, (PAPER, None, INK))
        for r in CC[n]: ax.add_patch(Polygon([T(*p) for p in r], closed=True, fc=fc, ec=ec, lw=lw, hatch=hatch, alpha=alpha))
    return lambda lat, lon: T(lon * K, lat)
def barra(x, y, w_max, v, vmax, color, etiqueta, valor, u):
    txt(x, y + 58, etiqueta, 22); w = w_max * v / vmax * ss(u)
    ax.add_patch(Rectangle((x, y), w, 46, fc=color, ec='none')); txt(x + w + 18, y + 10, valor, 30, SG, color if color == RED else INK)
# --- escenas: (inicio, fin, función(u, t)); u va de 0 a 1 dentro de la escena
def e_mapa(u, t):
    P = mapa(['Aragon'], (150, 300, 930, 1330), {'Aragon': (PAPER, None, INK)}, lw=1.6)
    for n, la, lo in CIUDADES:
        x, y = P(la, lo); ax.add_patch(Circle((x, y), 5, fc=INK)); txt(x + 12, y + 8, n, 18, color=GREY)
    for k, (n, la, lo) in enumerate(SITIOS):
        a = ss((u * 1.4 - k * 0.07) * 3)
        if a > 0: x, y = P(la, lo); s = 18 * a; ax.add_patch(Rectangle((x - s / 2, y - s / 2), s, s, fc=RED, ec=INK, lw=0.8))
    txt(150, 240, '82 NAVES · 9 PROYECTOS · UBICACIÓN APROXIMADA, SÍMBOLOS NO A ESCALA', 15, color=GREY)
def e_escala(u, t):
    xs = [p[0] for p in CASCO]; ys = [p[1] for p in CASCO]; bw, bh = max(xs) - min(xs), max(ys) - min(ys); S = min(0.105, 200 / bw)   # cuatro por fila, misma escala que el cuadrado rojo
    for k in range(7):
        a = ss((u * 1.6 - k * 0.1) * 4)
        if a <= 0: continue
        cx, cy = 130 + (k % 4) * (bw * S + 28), 1210 - (k // 4) * (bh * S + 50)
        pol = [(cx + (x - min(xs)) * S, cy + (y - min(ys)) * S) for x, y in CASCO]
        ax.add_patch(Polygon(pol, closed=True, fc=PAPER, ec=INK, lw=1.2, hatch='////', alpha=a))
    txt(140, 1450, f'CASCO HISTÓRICO DE ZARAGOZA · {CASCO_HA:.0f} ha' + ('' if CASCO_OSM else ' (ESQUEMA)'), 17, color=GREY)
    b = ss((u - 0.45) / 0.4); lado = math.sqrt(1400e4) * S
    if b > 0:
        ax.add_patch(Rectangle((140, 260), lado * b, lado * b, fc=PINK, ec=RED, lw=2))
        txt(140 + lado * b + 24, 260 + 20, '1.400 ha', 44 * max(0.3, b), SG, RED); txt(140, 220, 'PROYECTOS CON SUPERFICIE PUBLICADA · MISMA ESCALA', 15, color=GREY)
        h1 = 100 * S; ax.add_patch(Rectangle((140 + lado + 30, 260 + lado - h1), h1, h1, fc=INK, ec='none', alpha=b)); txt(140 + lado + 30 + h1 + 12, 260 + lado - h1, '1 ha = 100 × 100 m', 15, color=INK, alpha=b)
def e_icio(u, t):
    txt(140, 1220, 'ICIO QUE DEJARÍA DE COBRAR VILLAMAYOR DE GÁLLEGO', 18, color=GREY)
    txt(140, 1000, '50–60 M€', 120, SG, INK)
    c = ss((u - 0.35) / 0.3)
    if c > 0: ax.plot([130, 130 + 720 * c], [1035, 1035], color=RED, lw=10, solid_capstyle='butt')
    d = ss((u - 0.62) / 0.25)
    if d > 0: txt(140, 760, '0 €', 120 * d + 1, SG, RED); txt(140, 690, 'CON EL PIGA, EXENTOS · ESTIMACIÓN DEL ALCALDE', 18, color=GREY, alpha=d)
def e_empleo(u, t):
    c0x, c0y, L = 160, 330, 84
    for i in range(9):
        for j in range(9):
            a = ss((u * 2 - (i + j) * 0.04) * 3)
            if a > 0: ax.add_patch(Rectangle((c0x + i * L, c0y + j * L), L * a, L * a, fc=PAPER, ec=GREY, lw=0.8, hatch='////'))
    txt(160, 1140, 'MICROSOFT EN VILLAMAYOR · 81 ha · CADA CUADRO, 1 ha = 100 × 100 m', 17, color=GREY)
    import random; R = random.Random(18); n = int(40 * ss((u - 0.45) / 0.4))
    for k in range(n):
        x, y = c0x + R.uniform(10, 9 * L - 10), c0y + R.uniform(10, 9 * L - 10); ax.add_patch(Circle((x, y), 7, fc=RED, ec='none'))
    if n: txt(160, 260, '30–40 EMPLEOS, SEGÚN EL ALCALDE' if n >= 30 else f'{n}', 26, SG, RED)
def e_confi(u, t):
    x0, y0, w, h = 240, 330, 600, 820
    ax.add_patch(Rectangle((x0, y0), w, h, fc='white', ec=INK, lw=1.5)); txt(x0 + 40, y0 + h - 70, 'ACUERDO DE', 22, SG); txt(x0 + 40, y0 + h - 112, 'CONFIDENCIALIDAD', 22, SG)
    for k in range(12):
        y = y0 + h - 180 - k * 44; L = w - 80 - (k * 37 % 130)
        ax.plot([x0 + 40, x0 + 40 + L], [y, y], color=GREY, lw=2)
        a = ss((u * 1.5 - k * 0.06) * 4)
        if a > 0: ax.add_patch(Rectangle((x0 + 40, y - 9), L * a, 18, fc=INK, ec='none'))
    s = ss((u - 0.7) / 0.2)
    if s > 0:
        ax.plot([x0 + 60, x0 + 300], [y0 + 70, y0 + 70], color=INK, lw=1.5); txt(x0 + 60, y0 + 40, 'FIRMA', 14, color=GREY)
        txt(x0 + w - 60, y0 + 90, '¿CON QUIÉN?', 30 * s + 1, SG, RED, ha='right')
def e_red(u, t):
    txt(140, 1250, 'POTENCIA, MEGAVATIOS', 18, color=GREY)
    barra(140, 1000, 640, 1700, 3600, INK, 'PICO DE DEMANDA DE TODO ARAGÓN', '1.700', ss(u / 0.4))
    barra(140, 760, 640, 3600, 3600, RED, 'CENTROS DE DATOS CON ACCESO A LA RED', '3.600', ss((u - 0.3) / 0.45))
    txt(140, 640, 'RED ELÉCTRICA · NUDOS CRÍTICOS: MONTETORRERO, PLAZA, PEÑAFLOR, VILLANUEVA', 14, color=GREY)
def e_agua(u, t):
    txt(140, 1250, 'AGUA PARA REFRIGERAR, m³ AL AÑO', 18, color=GREY)
    barra(140, 1000, 640, 53961, 755000, INK, 'EL BURGO DE EBRO, AUTORIZADO TRAS SUBIR UN 48 %', '53.961', ss(u / 0.4))
    barra(140, 760, 640, 755000, 755000, RED, 'AMPLIACIÓN DE AMAZON A PLENO RENDIMIENTO', '755.000', ss((u - 0.3) / 0.45))
    txt(140, 640, 'AWS · INAGA · DOCUMENTACIÓN DEL PIGA', 14, color=GREY)
def e_sector(u, t):
    def molino(x, y, a):
        ax.plot([x, x], [y, y + 260], color=INK, lw=3)
        for k in range(3):
            g = a + k * 2 * math.pi / 3; ax.plot([x, x + 120 * math.cos(g)], [y + 260, y + 260 + 120 * math.sin(g)], color=INK, lw=3)
    molino(260, 820, t * 2.5); molino(420, 760, t * 2.5 + 1)
    for i in range(3):
        for j in range(2): ax.add_patch(Rectangle((600 + i * 90, 820 + j * 60), 80, 50, fc=PAPER, ec=INK, lw=1.5, hatch='////'))
    ax.add_patch(Rectangle((200, 560), 680, 140, fc=PINK, ec=RED, lw=2)); txt(220, 610, 'SUELO', 28, SG, RED)
    d = ss((u - 0.5) / 0.3)
    if d > 0:
        cx, cy = 540, 400; ax.add_patch(Polygon([(cx, cy + 70), (cx - 40, cy), (cx + 40, cy)], closed=True, fc=PAPER, ec=INK, lw=2)); ax.add_patch(Circle((cx, cy - 5), 40, fc=PAPER, ec=INK, lw=2))
        ax.plot([cx - 70, cx + 70], [cy - 60, cy + 90], color=RED, lw=6 * d)
    txt(200, 300, 'SPAIN DC, ASOCIACIÓN DEL SECTOR', 16, color=GREY)
def e_espana(u, t, foco, rellenos, lineas):
    a = ss(u / 0.3); mapa(PEN, (90, 520, 990, 1380), rellenos, alpha=1.0, lw=0.9)
    for k, (et, v, vmax, col) in enumerate(lineas): barra(140, 360 - k * 120, 600, v, vmax, col, et, f'{v:g} %'.replace('.', ','), ss((u - 0.25 - k * 0.15) / 0.4))
def e_produce(u, t): e_espana(u, t, 'Aragon', {'Aragon': (PINK, '////', RED)}, [('ARAGÓN · CONSUME (% DE ESPAÑA)', 4.2, 11.3, INK), ('ARAGÓN · PRODUCE (% DE ESPAÑA)', 8.2, 11.3, RED)])
def e_consume(u, t):
    e_espana(u, t, 'Madrid', {'Madrid': (INK, None, INK)}, [('MADRID · CONSUME (% DE ESPAÑA)', 11.3, 11.3, INK), ('MADRID · PRODUCE (% DE ESPAÑA)', 0.5, 11.3, RED)])
    if u > 0.6: txt(140, 200, '0 PARQUES EÓLICOS EN MADRID', 22, SG, RED)
def e_territorio(u, t):
    exp = ['Aragon', 'Castilla-Leon', 'Castilla-La Mancha', 'Extremadura', 'Galicia']
    R = {n: (PINK, '////', RED) for n in exp}; R['Madrid'] = (INK, None, INK)
    P = mapa(PEN, (90, 400, 990, 1380), R, lw=0.9)
    txt(140, 330, 'COMUNIDADES QUE PRODUCEN MÁS DE LO QUE CONSUMEN', 16, color=RED); txt(140, 290, 'MADRID: CONSUME EL 11 % Y PRODUCE EL 0,5 %', 16, color=INK)
def e_reloj(u, t):
    import random; R = random.Random(82); cx, cy = 540, 820
    a = ss((u - 0.15) / 0.55)                                         # de la nube de naves a la esfera del reloj
    w = ss((u - 0.5) / 0.3)
    if w > 0:
        ax.add_patch(Rectangle((cx - 70, cy + 120), 140, 300, fc=PAPER, ec=INK, lw=2, alpha=w)); ax.add_patch(Rectangle((cx - 70, cy - 420), 140, 300, fc=PAPER, ec=INK, lw=2, alpha=w))
        ax.add_patch(Circle((cx, cy), 150, fc=PAPER, ec=INK, lw=3, alpha=w))
    for k in range(82):
        x0, y0 = R.uniform(160, 920), R.uniform(330, 1330); ang = k * 2.39996; rr = 95 * math.sqrt((k + 0.5) / 82)
        x1, y1 = cx + rr * math.cos(ang), cy + rr * math.sin(ang)
        x, y = x0 + (x1 - x0) * a, y0 + (y1 - y0) * a; sz = 26 * (1 - a) + 9 * a
        ax.add_patch(Rectangle((x - sz / 2, y - sz / 2), sz, sz, fc=RED, ec=INK, lw=0.6))
    if u < 0.3: txt(160, 260, '82 NAVES', 26, SG, RED)
SCN = [(0.0, 5.5, e_mapa), (5.5, 11.5, e_escala), (11.5, 17.5, e_icio), (17.5, 22.5, e_empleo), (22.5, 28.5, e_red), (28.5, 34.5, e_agua), (34.5, 40.5, e_sector), (40.5, 46.0, e_produce), (46.0, 52.0, e_consume), (52.0, 56.5, e_territorio), (56.5, 62.5, e_reloj)]   # escenas más largas: tiempo para leer el título con el gráfico ya dibujado
t0 = time.time(); n = len(FRAMES)
for k, f in enumerate(FRAMES):
    t = f / FPS; lienzo()
    for a, b, fn in SCN:
        if a <= t < b or (fn is SCN[-1][2] and t >= a): fn((t - a) / (b - a), t); break
    fig.savefig(f'{OUT}/{f:05d}.png', facecolor=PAPER)
    if (k + 1) % 30 == 0 or k + 1 == n or n <= 15: print(f'fotograma {k + 1}/{n} · {time.time() - t0:.0f} s', flush=True)
print('vídeo ok', n)
