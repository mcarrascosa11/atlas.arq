# 002 en inglés · Sagrada Família · música con instrumentos grabados (piano, vibráfono y colchón), sin efectos de sonido. uso: music002_en.py SALIDA.wav
# Como la del 018 corregida: continua y armónica, sin golpes en los cambios de plano; los acordes avanzan a su ritmo y se funden.
# Distinta: mi menor a 80 pulsos (Em9 – Cmaj7 – G – D6) y cierre en mi menor.
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'audio'))
from mg import mg
from mgaudio import samples, synth
OUTW = sys.argv[1]; DUR = float(os.environ.get('MUSIC_DUR', '60.0')); BPM = 80.0; B = 60 / BPM; PASO = 8 * B
m = mg.Mix(DUR, bpm=BPM, anchor=0.0); m.group('music').level = -20
CIC = [['E2', 'B2', 'D3', 'G3', 'F#4'], ['C3', 'G3', 'B3', 'E4', 'G4'], ['G2', 'D3', 'G3', 'B3', 'D4'], ['D3', 'A3', 'B3', 'F#4', 'A4']]
CH = []; t = 0.0; k = 0
while t < DUR - 0.5:
    CH.append((t, CIC[k % 4] if t + PASO < DUR - 2.0 else ['E2', 'B2', 'E3', 'G3', 'B3'])); t += PASO; k += 1
fin = lambda i: min(DUR, CH[i + 1][0] if i + 1 < len(CH) else DUR)
piano, vib = samples.inst('piano'), samples.inst('vibraphone')
pad = m.track('pad', level=-24, sends={'hall': -6})
for i, (t0, notas) in enumerate(CH): pad.add(synth.pad(notas[1:4], fin(i) - t0 + 1.2, 0.5, 'air'), t0)
p = m.track('piano', level=-27, sends={'hall': -7})
for i, (t0, notas) in enumerate(CH):
    fig = [notas[0], notas[2], notas[1], notas[3], notas[4], notas[3], notas[1], notas[2]]; t, j = t0, 0
    while t < fin(i) - 0.05: p.add(piano.play(fig[j % 8], dur=B * 2.2, vel=0.24), t); t += B / 2; j += 1
v = m.track('vib', level=-34, sends={'hall': -6}, pan=-0.15)
for i, (t0, notas) in enumerate(CH):
    if t0 + 3 * B < DUR - 1: v.add(vib.play(notas[4], vel=0.2), t0 + 3 * B)
res = m.export(OUTW, lufs=-14, tp=-1); print('música', {k: res[k] for k in ('duration', 'lufs', 'true_peak')})
