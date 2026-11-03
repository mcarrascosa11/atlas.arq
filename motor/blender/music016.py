# 016 · San Cataldo · música con instrumentos grabados (piano, vibráfono, marimba, timbal), sin efectos de sonido. uso: music016.py SALIDA.wav
# Duración: variable MUSIC_DUR (por defecto 36 s; el boceto usa menos). Escenas en BEATS; armonía en la menor sin resolver al final.
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'audio'))
from mg import mg
from mgaudio import samples, synth
OUTW = sys.argv[1]; DUR = float(os.environ.get('MUSIC_DUR', '36')); BPM = 72.0; B = 60 / BPM
m = mg.Mix(DUR, bpm=BPM, anchor=0.0); m.group('music').level = -20
CH = [(0.0, ['A2', 'E3', 'A3', 'C4', 'E4']), (6.5, ['F2', 'C3', 'A3', 'C4', 'F4']), (13.0, ['C3', 'G3', 'C4', 'E4', 'G4']),
      (20.0, ['D2', 'A2', 'D3', 'F3', 'A3']), (26.0, ['E2', 'B2', 'E3', 'A3', 'B3']), (30.0, ['E2', 'B2', 'E3', 'G#3', 'B3']),
      (33.0, ['A1', 'E2', 'A2', 'E3', 'A3'])]
CH = [c for c in CH if c[0] < DUR]
fin = lambda i: min(DUR, CH[i + 1][0] if i + 1 < len(CH) else DUR)
piano, vib, mar = samples.inst('piano'), samples.inst('vibraphone'), samples.inst('marimba')
p = m.track('piano', level=-22, sends={'hall': -12})
for i, (t0, notes) in enumerate(CH):
    for k, n in enumerate(notes): p.add(piano.play(n, dur=fin(i) - t0 + 0.6, vel=0.42 + 0.05 * (k == 0)), t0 + 0.012 * k)   # acorde arpegiado a mano
pad = m.track('pad', level=-30, sends={'hall': -8})
for i, (t0, notes) in enumerate(CH): pad.add(synth.pad(notes[1:], fin(i) - t0 + 0.8, 0.7, 'air'), t0)
ma = m.track('marimba', level=-27, sends={'room': -14}, pan=-0.15)          # la marimba de atlas, en las escenas de construcción
for i, (t0, notes) in enumerate(CH):
    if not (6.5 <= t0 < 26.0): continue
    up = notes[2:] + [notes[2]]; t, j = t0, 0
    while t < fin(i) - 0.2: ma.add(mar.play(up[j % len(up)], vel=0.33 + 0.06 * (j % 4 == 0)), t); t += B / 2; j += 1
vb = m.track('vib', level=-24, sends={'hall': -9}, pan=0.2)                  # una nota de vibráfono en cada momento clave
for t, n in [(0.08, 'E5'), (3.05, 'C5'), (13.05, 'A5'), (16.55, 'G5'), (20.05, 'F5'), (26.05, 'B4'), (33.05, 'A4')]:
    if t < DUR - 0.5: vb.add(vib.play(n, vel=0.5), t)
if DUR > 30:
    tp = m.track('timpani', level=-24, sends={'hall': -10})                 # redoble en «sigue sin terminar» y golpe en 1997
    for k in range(16): tp.add(samples.hit('timpani', vel=0.16 + 0.02 * k), 26.2 + k * (3.6 / 16))
    tp.add(samples.hit('timpani', vel=0.8), 30.0)
res = m.export(OUTW, lufs=-14, tp=-1); print('música', {k: res[k] for k in ('duration', 'lufs', 'true_peak')})
