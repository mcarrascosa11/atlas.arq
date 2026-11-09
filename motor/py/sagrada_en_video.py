# 002 en inglés · ¿Hay que derribar casas para terminar la Sagrada Família? · rehecho en 2D (plantas y gráficos) con matplotlib.
# Ensanche esquemático (manzanas de 113,3 m con chaflán, calles de 20 m), como en el 002 original; posiciones y huellas aproximadas.
# uso: python3 sagrada_en_video.py -- ESCENA_JSON(no se usa) CARPETA F0 F1 [PORCENTAJE]
import sys, os, math, time
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import Polygon, Rectangle
from fontTools.ttLib import TTFont
argv = sys.argv[sys.argv.index('--') + 1:]; OUT = argv[1]; os.makedirs(OUT, exist_ok=True)
FRAMES = [int(x) for x in argv[2].split(',')] if ',' in argv[2] else list(range(int(argv[2]), int(argv[3]) + 1)); PCT = int(argv[4]) if len(argv) > 4 else 100
FPS = 30; W, H = 1080, 1920
PAPER, INK, RED, GREY, PINK, LGREY = '#F2F1EC', '#1A1B20', '#E2401C', '#9C998F', '#F3C1B0', '#BDBAB2'
for f in ('sg700', 'sm400'):
    t = TTFont(f'motor/web/fonts/{f}.woff2'); t.flavor = None; t.save(f'/tmp/{f}.ttf'); font_manager.fontManager.addfont(f'/tmp/{f}.ttf')
SG = font_manager.FontProperties(fname='/tmp/sg700.ttf'); SM = font_manager.FontProperties(fname='/tmp/sm400.ttf')
ss = lambda x: 0.0 if x <= 0 else 1.0 if x >= 1 else x * x * (3 - 2 * x)
fig = plt.figure(figsize=(W / 100, H / 100), dpi=100 * PCT / 100); ax = fig.add_axes([0, 0, 1, 1])
def lienzo():
    ax.cla(); ax.set_xlim(0, W); ax.set_ylim(0, H); ax.axis('off'); fig.patch.set_facecolor(PAPER); ax.set_facecolor(PAPER)
def txt(x, y, s, size=22, font=None, color=INK, ha='left', va='baseline', alpha=1.0, rot=0):
    ax.text(x, y, s, fontproperties=font or SM, fontsize=size * 0.72, color=color, ha=ha, va=va, alpha=alpha, rotation=rot, zorder=9)
# --- Ensanche esquemático: 3 columnas × 4 filas; la Sagrada Família en la fila 1, columna central
B, S_, CH = 113.3, 20.0, 14.0; K = 1.85; X0, Y0 = 188, 236                 # metros → píxeles
def mx(x): return X0 + x * K
def my(y): return Y0 + y * K
def bloque(c, r): x = c * (B + S_); y = (3 - r) * (B + S_); return x, y      # esquina inferior izquierda de la manzana (fila 0 arriba)
def octo(x, y, b=B, ch=CH): return [(x + ch, y), (x + b - ch, y), (x + b, y + ch), (x + b, y + b - ch), (x + b - ch, y + b), (x + ch, y + b), (x, y + b - ch), (x, y + ch)]
P = lambda pts: [(mx(a), my(b)) for a, b in pts]
def ensanche(sf=True, parques=True, alpha=1.0):
    for c in range(3):
        for r in range(4):
            x, y = bloque(c, r); hatch = '////' if (parques and r == 1 and c != 1) else None
            ax.add_patch(Polygon(P(octo(x, y)), closed=True, fc=PAPER, ec=INK, lw=1.4, hatch=hatch, alpha=alpha))
            if not (r == 1 and c != 1) and not (r == 1 and c == 1): ax.add_patch(Polygon(P(octo(x + 18, y + 18, B - 36, 8)), closed=True, fc='#ECEAE3', ec=GREY, lw=0.6, alpha=alpha))
    calles = [('PROVENÇA', 3, 'h'), ('MALLORCA', 2, 'h'), ('VALÈNCIA', 1, 'h'), ('ARAGÓ', 0, 'h')]
    for nom, k, _ in calles: txt(mx(B / 2), my(k * (B + S_) - S_ / 2) - 6 if k else my(-14), nom, 14, color=GREY, ha='center')
    txt(mx(B + S_ / 2) + 5, my(3 * (B + S_) + B / 2), 'SARDENYA', 14, color=GREY, ha='center', rot=90); txt(mx(2 * B + 1.5 * S_) + 5, my(3 * (B + S_) + B / 2), 'MARINA', 14, color=GREY, ha='center', rot=90)
    if sf: templo()
def templo(c=INK):                                                          # planta en cruz latina, esquemática
    x, y = bloque(1, 1); cx, cy = x + B / 2, y + B / 2
    cruz = [(cx - 12, cy - 45), (cx + 12, cy - 45), (cx + 12, cy - 6), (cx + 40, cy - 6), (cx + 40, cy + 16), (cx + 12, cy + 16), (cx + 12, cy + 45), (cx - 12, cy + 45),
            (cx - 12, cy + 16), (cx - 40, cy + 16), (cx - 40, cy - 6), (cx - 12, cy - 6)]
    ax.add_patch(Polygon(P(cruz), closed=True, fc=c, ec='none', zorder=5))
def estrella(n, r1, r2, a, rot=0.0):
    x, y = bloque(1, 1); cx, cy = x + B / 2, y + B / 2; pts = []
    for i in range(2 * n):
        r = r1 if i % 2 == 0 else r2; ang = rot + math.pi * i / n
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    ax.add_patch(Polygon(P(pts), closed=True, fc=PINK, ec=RED, lw=2, alpha=0.75 * a, zorder=4))
def barra(x, y, w_max, v, vmax, color, etiqueta, valor, u):
    txt(x, y + 58, etiqueta, 22); w = w_max * v / vmax * ss(u)
    ax.add_patch(Rectangle((x, y), w, 46, fc=color, ec='none')); txt(x + w + 18, y + 10, valor, 30, SG, color if color == RED else INK)
# --- escenas
def e_gancho(u, t): ensanche(); a = ss(u / 0.5); x, y = bloque(1, 1); ax.add_patch(Polygon(P(octo(x, y)), closed=True, fc='none', ec=RED, lw=3, ls='--', alpha=a, zorder=6))
def e_solar(u, t):
    ensanche(); x, y = bloque(1, 1); ax.add_patch(Polygon(P(octo(x, y)), closed=True, fc='none', ec=RED, lw=3, ls='--', zorder=6))
    txt(mx(x + B / 2), my(y) - 30, '1 BLOCK · 113 × 113 m', 15, color=RED, ha='center')
def e_gloria(u, t):
    ensanche(); x, y = bloque(1, 1); a = ss(u / 0.5)
    txt(mx(x + B / 2), my(y + B) + 14, 'PASSION', 13, color=GREY, ha='center'); txt(mx(x + B) + 10, my(y + B / 2), 'NATIVITY', 13, color=GREY)
    ax.plot([mx(x + 20), mx(x + B - 20)], [my(y) - 4, my(y) - 4], color=RED, lw=5 * a + 0.1, zorder=6); txt(mx(x + B / 2), my(y) - 34, 'GLORY FAÇADE · MAIN', 15, color=RED, ha='center', alpha=a)
def e_estrella(u, t): ensanche(alpha=0.9); estrella(8, 235, 120, ss(u / 0.5), rot=math.pi / 8); txt(150, 190, 'APPROXIMATE SCHEME OF GAUDÍ’S PROJECT', 13, color=GREY)
def e_cuatro(u, t):
    ensanche(alpha=0.9); k = ss((u - 0.1) / 0.5)
    if k < 1: estrella(8, 235, 120, 1 - k, rot=math.pi / 8)
    estrella(4, 235, 70, k, rot=math.pi / 4); txt(150, 190, 'APPROXIMATE SCHEME OF GAUDÍ’S PROJECT', 13, color=GREY)
def escalinata(a, rojo=RED):
    x, y = bloque(1, 1); x0, x1 = x + B / 2 - 32, x + B / 2 + 32; y1 = y; y0 = y - 35 * a
    ax.add_patch(Polygon(P([(x0, y0), (x1, y0), (x1, y1), (x0, y1)]), closed=True, fc=rojo, ec=INK, lw=1.2, zorder=6))
    for k in range(1, int(9 * a)): yy = y - k * 3.9; ax.plot([mx(x0), mx(x1)], [my(yy), my(yy)], color=PAPER, lw=1, zorder=7)
def e_escalinata(u, t):
    ensanche(); a = ss(u / 0.6); escalinata(a)
    x, y = bloque(1, 1)
    if a > 0.9: ax.annotate('', xy=(mx(x + B / 2 + 45), my(y - 35)), xytext=(mx(x + B / 2 + 45), my(y)), arrowprops=dict(arrowstyle='<->', color=RED, lw=1.5)); txt(mx(x + B / 2 + 52), my(y - 20), '35 m', 22, SG, RED)
def e_1974(u, t):
    ensanche(); escalinata(1, rojo=PINK); x, y = bloque(1, 2); a = ss(u / 0.5)
    ax.add_patch(Polygon(P([(x + 25, y + B - 20), (x + B - 25, y + B - 20), (x + B - 25, y + B), (x + 25, y + B)]), closed=True, fc=RED, ec=INK, lw=1.2, alpha=a, zorder=7))
    txt(mx(x + B) + 12, my(y + B - 14), '11 FLOORS · 1974', 15, color=RED, alpha=a)
def avenida(a, fill=False):
    for r in (2, 3):
        x, y = bloque(1, r)
        if fill: ax.add_patch(Polygon(P(octo(x, y)), closed=True, fc=PINK, ec=RED, lw=1.5, alpha=a, zorder=3))
    x, y = bloque(1, 3); x0, x1 = x + B / 2 - 30, x + B / 2 + 30; ytop = bloque(1, 2)[1] + B; ybot = ytop - (ytop - y) * a
    ax.add_patch(Polygon(P([(x0, ybot), (x1, ybot), (x1, ytop), (x0, ytop)]), closed=True, fc='none', ec=RED, lw=2, hatch='////', zorder=6))
def e_1976(u, t):
    ensanche(); escalinata(1, rojo=PINK); avenida(ss(u / 0.6)); x, y = bloque(1, 3)
    txt(mx(x + B) + 12, my(y + B / 2), '60 m · GENERAL PLAN 1976', 15, color=RED)
def e_1020(u, t):
    ensanche(); escalinata(1, rojo=PINK); avenida(1, fill=True); x, y = bloque(1, 3)
    txt(mx(x + B) + 12, my(y + B / 2), 'UP TO 1,020 HOMES', 18, SG, RED, alpha=ss(u / 0.4))
def e_escala(u, t):
    txt(140, 1250, 'HOMES AFFECTED', 18, color=RED)
    barra(140, 1060, 640, 1020, 1020, INK, 'GENERAL PLAN 1976 · MAXIMUM', '1,020', ss(u / 0.3))
    barra(140, 900, 640, 171, 1020, GREY, '2024 · OPTION A', '171', ss((u - 0.2) / 0.25))
    barra(140, 740, 640, 92, 1020, GREY, '2024 · OPTION B', '92', ss((u - 0.35) / 0.25))
    barra(140, 580, 640, 194, 1020, RED, '2026 · PRE-AGREEMENT', '194', ss((u - 0.55) / 0.25))
    txt(140, 470, 'SOURCES: ELNACIONAL.CAT, ARA', 13, color=GREY)
def e_2026(u, t):
    ensanche(); escalinata(1); a = ss(u / 0.35); b = ss((u - 0.35) / 0.3); c = ss((u - 0.65) / 0.3)
    x, y = bloque(1, 2)                                                      # hueco en forma de ele invertida en la primera manzana (esquema)
    ax.add_patch(Polygon(P([(x + 20, y + B - 22), (x + B - 20, y + B - 22), (x + B - 20, y + B), (x + 20, y + B)]), closed=True, fc=RED, ec=INK, lw=1.2, alpha=a, zorder=7))
    ax.add_patch(Polygon(P([(x + B / 2 - 22, y + 20), (x + B / 2 + 22, y + 20), (x + B / 2 + 22, y + B - 22), (x + B / 2 - 22, y + B - 22)]), closed=True, fc=RED, ec=INK, lw=1.2, alpha=a, zorder=7))
    if a > 0.5: txt(mx(x) - 12, my(y + B - 10), '194 FLATS', 15, color=RED, ha='right')
    x2, y2 = bloque(2, 2)
    ax.add_patch(Polygon(P(octo(x2, y2)), closed=True, fc=LGREY, ec=INK, lw=2, alpha=b, zorder=6)); txt(mx(x2 + B / 2), my(y2 + B / 2) - 6, 'REHOUSING', 15, color=INK, ha='center', alpha=b)
    x3, y3 = bloque(1, 3)
    ax.plot([mx(x3 + B / 2)] * 2, [my(y3 + B), my(y3 - 30)], color=INK, lw=2, ls='--', alpha=c, zorder=6)
    ax.plot([mx(x3 + B / 2 - 14), mx(x3 + B / 2 + 14)], [my(y3 + B / 2 - 14), my(y3 + B / 2 + 14)], color=RED, lw=5 * c + 0.1, zorder=7)
    ax.plot([mx(x3 + B / 2 - 14), mx(x3 + B / 2 + 14)], [my(y3 + B / 2 + 14), my(y3 + B / 2 - 14)], color=RED, lw=5 * c + 0.1, zorder=7)
    txt(mx(x3 + B) + 12, my(y3 + B / 2), 'NO AVENUE TO THE DIAGONAL', 14, color=INK, alpha=c)
    txt(150, 190, 'SCHEMATIC · PRE-AGREEMENT OF JULY 2026', 13, color=GREY)
def e_hoy(u, t):
    ensanche(); escalinata(1); x, y = bloque(1, 2)
    ax.add_patch(Polygon(P([(x + 20, y + B - 22), (x + B - 20, y + B - 22), (x + B - 20, y + B), (x + 20, y + B)]), closed=True, fc=RED, ec=INK, lw=1.2, zorder=7))
    ax.add_patch(Polygon(P([(x + B / 2 - 22, y + 20), (x + B / 2 + 22, y + 20), (x + B / 2 + 22, y + B - 22), (x + B / 2 - 22, y + B - 22)]), closed=True, fc=RED, ec=INK, lw=1.2, zorder=7))
    a = ss((u - 0.3) / 0.4); txt(540, 160, '?', 90 * a + 1, SG, RED, ha='center')
SCN = [(0.0, 4.0, e_gancho), (4.0, 8.5, e_solar), (8.5, 13.0, e_gloria), (13.0, 18.0, e_estrella), (18.0, 22.0, e_cuatro), (22.0, 28.0, e_escalinata),
       (28.0, 33.0, e_1974), (33.0, 38.0, e_1976), (38.0, 42.0, e_1020), (42.0, 49.0, e_escala), (49.0, 56.0, e_2026), (56.0, 60.0, e_hoy)]
t0 = time.time(); n = len(FRAMES)
for k, f in enumerate(FRAMES):
    t = f / FPS; lienzo()
    for a, b, fn in SCN:
        if a <= t < b or (fn is SCN[-1][2] and t >= a): fn((t - a) / (b - a), t); break
    fig.savefig(f'{OUT}/{f:05d}.png', facecolor=PAPER)
    if (k + 1) % 30 == 0 or k + 1 == n or n <= 15: print(f'fotograma {k + 1}/{n} · {time.time() - t0:.0f} s', flush=True)
print('vídeo ok', n)
