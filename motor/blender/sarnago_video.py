# 015 · Sarnago · vídeo animado en Blender (36 s a 30 fps). Monta la escena con sarnago_bocetos.py y anima estados y cámara.
# uso (desde run.sh): blender -b -P sarnago_video.py -- ESCENA_JSON(no se usa) CARPETA F0 F1
import sys, os, math, runpy
argv = sys.argv[sys.argv.index('--') + 1:]; OUT, F0, F1 = argv[1], int(argv[2]), int(argv[3]); FPS = 30; os.makedirs(OUT, exist_ok=True)
sys.argv = ['blender', '--', 'motor/web/vsar.json', 'motor/web/vsar3d.json', OUT, '99', 'datos/sarnago/refugio_planta.json', 'datos/sarnago/escena_ajustes.json']
g = runpy.run_path('motor/blender/sarnago_bocetos.py')
import bpy
sc = bpy.context.scene; sc.cycles.samples = 3; sc.render.use_persistent_data = True
estado, cam_, hV, cx, cz, Fy, AZC, CAMR = g['estado'], g['cam_'], g['hV'], g['cx'], g['cz'], g['Fy'], g['AZC'], g['CAMR']
ss = lambda x: 0.0 if x <= 0 else 1.0 if x >= 1 else x * x * (3 - 2 * x)
ramp = lambda t, a, b: ss((t - a) / (b - a))
# orden de aparición de las calles en las hacenderas: de la plaza hacia fuera
d0 = [min(math.hypot(p[0] + 10, p[1]) for p in L) for L in g['D']['caminos']['2019']]; ORD = sorted(range(len(CAMR)), key=lambda i: d0[i])
RC = (cx, Fy + 3.5, cz)
# cámara: (t, objetivo, semialtura, azimut, elevación)
K = [(0.0, (-10, hV, 0), 62, 192, 40), (3.0, (-10, hV, 0), 80, 198, 42), (6.5, (-12, hV, -4), 70, 208, 46), (10.0, (-6, hV, 0), 80, 222, 44),
     (13.0, (-10, hV + 2, 0), 90, 232, 48), (16.5, (-20, hV, -4), 72, 206, 42), (20.0, (-10, hV, 0), 105, 214, 60), (23.0, (-12, hV, -2), 76, 200, 44),
     (26.0, (-10, hV, 0), 95, 186, 50), (27.2, RC, 19, AZC - 45, 34), (30.0, RC, 17, AZC - 50, 36), (30.6, (cx, Fy + 3.0, cz), 9.5, AZC - 45, 58),
     (33.0, (cx, Fy + 3.0, cz), 10.5, AZC - 40, 56), (33.6, RC, 22, AZC - 45, 44), (36.0, (cx, Fy + 3, cz), 58, AZC - 45, 46)]
def camara(t):
    for (ta, A, za, aa, ea), (tb, Bv, zb, ab, eb) in zip(K, K[1:]):
        if ta <= t <= tb:
            u = ss((t - ta) / (tb - ta)); lerp = lambda a, b: a + (b - a) * u; da = (ab - aa + 180) % 360 - 180
            return (tuple(lerp(a, b) for a, b in zip(A, Bv)), math.exp(lerp(math.log(za), math.log(zb))), aa + da * u, lerp(ea, eb))
    return (K[-1][1], K[-1][2], K[-1][3], K[-1][4])
def fase(t):
    if t < 3.0: return ('vacio', 0)
    if t < 6.5: return ('1955', ramp(t, 3.0, 4.4))                              # se encienden las casas de 1955
    if t < 10.0: return ('1955', 1 - 0.92 * ramp(t, 6.8, 9.7))                   # se van apagando
    if t < 16.5: return ('vacio', 0)
    if t < 20.0: return ('calles', ramp(t, 16.8, 19.0))                          # las calles se trazan desde la plaza
    if t < 26.0: return ('2026', ramp(t, 20.2, 21.8) if t < 23.0 else 1.0)       # casas arregladas
    if t < 30.0: return ('refugio', ramp(t, 27.0, 29.2))                         # El Refugio sube hilada a hilada
    if t < 33.0: return ('seccion', 1.0)
    return ('refugio', 1.0)
for f in range(F0, F1 + 1):
    t = f / FPS; st = fase(t); s, k = st
    estado((s, k if s != 'calles' else 0))
    if s == 'calles':
        n = int(round(k * len(ORD)))
        for j, i in enumerate(ORD): CAMR[i].hide_render = j >= n
    cam_(*camara(t)); sc.render.filepath = f'{OUT}/{f:05d}.png'; bpy.ops.render.render(write_still=True)
print('vídeo ok', F0, F1)
