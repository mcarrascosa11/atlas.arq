# 018 · Centros de datos en Aragón · música con instrumentos grabados (piano, vibráfono y colchón), sin efectos de sonido. uso: music018.py SALIDA.wav
# Versión tranquila y continua: los acordes avanzan a su ritmo (cada 6 s), sin golpes ni acentos en los cambios de plano,
# y se encadenan con fundido para que la música no distraiga de la lectura. La menor: Am7 – Fmaj7 – Cmaj7 – G6 y cierre en Am.
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'audio'))
from mg import mg
from mgaudio import samples, synth
OUTW = sys.argv[1]; DUR = float(os.environ.get('MUSIC_DUR', '62.5')); BPM = 80.0; B = 60 / BPM; PASO = 8 * B   # un acorde cada dos compases (6 s)
m = mg.Mix(DUR, bpm=BPM, anchor=0.0); m.group('music').level = -20
CIC = [['A2', 'E3', 'G3', 'C4', 'E4'], ['F2', 'C3', 'E3', 'A3', 'C4'], ['C3', 'G3', 'B3', 'E4', 'G4'], ['G2', 'D3', 'E3', 'B3', 'D4']]
CH = []; t = 0.0; k = 0
while t < DUR - 0.5:
    notas = CIC[k % 4] if t + PASO < DUR - 2.0 else ['A2', 'E3', 'A3', 'C4', 'E4']   # el último acorde resuelve en la menor
    CH.append((t, notas)); t += PASO; k += 1
fin = lambda i: min(DUR, CH[i + 1][0] if i + 1 < len(CH) else DUR)
piano, vib = samples.inst('piano'), samples.inst('vibraphone')
pad = m.track('pad', level=-24, sends={'hall': -6})                      # colchón continuo, cada acorde se funde con el siguiente
for i, (t0, notas) in enumerate(CH): pad.add(synth.pad(notas[1:4], fin(i) - t0 + 1.2, 0.5, 'air'), t0)
p = m.track('piano', level=-27, sends={'hall': -7})                      # arpegio suave en corcheas, siempre igual de fuerte
for i, (t0, notas) in enumerate(CH):
    fig = [notas[0], notas[1], notas[2], notas[3], notas[4], notas[3], notas[2], notas[1]]; t, j = t0, 0
    while t < fin(i) - 0.05: p.add(piano.play(fig[j % 8], dur=B * 2.2, vel=0.24), t); t += B / 2; j += 1
v = m.track('vib', level=-34, sends={'hall': -6}, pan=0.15)              # una nota larga de vibráfono a mitad de cada acorde, nunca en el cambio
for i, (t0, notas) in enumerate(CH):
    if t0 + 3 * B < DUR - 1: v.add(vib.play(notas[4], vel=0.2), t0 + 3 * B)
res = m.export(OUTW, lufs=-14, tp=-1); print('música', {k: res[k] for k in ('duration', 'lufs', 'true_peak')})
