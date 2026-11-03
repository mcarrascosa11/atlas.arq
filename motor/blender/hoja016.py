# Hoja de bocetos: los fotogramas de la prueba rápida (uno por escena) con su antetítulo, su título completo y, si la hay, la línea de tiempo.
# uso: hoja016.py CARPETA_PNG TEXTOS_JSON SALIDA_JPG FUENTES
import sys, glob, json, os
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
FR, TX, OUTJ, FONTS = sys.argv[1:5]; T = json.load(open(TX)); FPS = T.get('fps', 30)
for f in ('sg700', 'sm400'):
    t = TTFont(f'{FONTS}/{f}.woff2'); t.flavor = None; t.save(f'/tmp/{f}.ttf')
F = lambda f, s: ImageFont.truetype(f'/tmp/{f}.ttf', s)
INK, RED, PAPER, GREY = (26, 27, 32), (226, 64, 28), (242, 241, 236), (156, 153, 143)
ROJAS = {w.lower() for w in T.get('rojas', [])}; LIN = 'linea' in T; Y0, Y1 = T.get('rango', (0, 1)); X0, X1, YL = 90, 990, T.get('linea_y', 1780)
def fade(h, top=True, k=1.9):
    g = Image.new('L', (1, h))
    for y in range(h): g.putpixel((0, y), int(255 * min(1, max(0, ((h - y) if top else y) / h * k))))
    return g.resize((1080, h))
TOP, BOT = fade(520), fade(420, False)
def anio(t):
    L = T['linea']
    for (ta, ya), (tb, yb) in zip(L, L[1:]):
        if ta <= t <= tb: u = (t - ta) / (tb - ta) if tb > ta else 1; u = u * u * (3 - 2 * u); return ya + (yb - ya) * u
    return L[-1][1]
def cartel(im, t):
    im.paste(Image.new('RGB', (1080, 520), PAPER), (0, 0), TOP); (im.paste(Image.new('RGB', (1080, 420), PAPER), (0, 1500), BOT) if LIN else None); d = ImageDraw.Draw(im)
    cur = [x for x in T['textos'] if x[0] <= t < x[1]]
    if cur:
        _, _, kick, title = cur[-1][:4]; d.text((64, 150), kick, font=F('sm400', 27), fill=RED); FT = F('sg700', 74); x, k = 0, 0
        for wd in title.split():
            lw = d.textlength(wd, font=FT)
            if x > 0 and x + lw > 900: x, k = 0, k + 1
            d.text((62 + x, 196 + k * 77), wd, font=FT, fill=RED if wd.lower().strip('.,:;¿?…') in ROJAS else INK); x += lw + d.textlength(' ', font=FT)
    if not LIN: return im
    yr = anio(t); d.line([(X0, YL), (X1, YL)], fill=GREY, width=4); xm = X0 + (X1 - X0) * (yr - Y0) / (Y1 - Y0); d.line([(X0, YL), (xm, YL)], fill=RED, width=6)
    for yv in T['hitos']:
        x = X0 + (X1 - X0) * (yv - Y0) / (Y1 - Y0); d.line([(x, YL - 12), (x, YL + 12)], fill=INK, width=3); s = str(yv); d.text((x - d.textlength(s, font=F('sm400', 24)) / 2, YL + 22), s, font=F('sm400', 24), fill=INK)
    d.ellipse([xm - 13, YL - 13, xm + 13, YL + 13], fill=RED, outline=PAPER, width=4); return im
files = sorted(glob.glob(f'{FR}/*.png')); n = len(files); cols = 6 if n > 6 else n; rows = (n + cols - 1) // cols; w, h = 360, 640
S = Image.new('RGB', (cols * w + (cols + 1) * 12, rows * (h + 40) + 12), (255, 255, 255)); dS = ImageDraw.Draw(S)
for i, p in enumerate(files):
    f = int(os.path.basename(p)[:5]); t = f / FPS; im = cartel(Image.open(p).convert('RGB').resize((1080, 1920)), t)
    x, y = 12 + (i % cols) * (w + 12), 12 + (i // cols) * (h + 40); S.paste(im.resize((w, h)), (x, y)); dS.text((x + 4, y + h + 6), f'{t:.1f} s', font=F('sm400', 22), fill=INK)
os.makedirs(os.path.dirname(OUTJ), exist_ok=True); S.save(OUTJ, quality=88); print('hoja', n, 'bocetos')
