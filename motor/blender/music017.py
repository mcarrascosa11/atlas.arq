# 017 · Museo Nacional del Ecuador · música con instrumentos grabados (marimba, piano, vibráfono, timbal), sin efectos de sonido. uso: music017.py SALIDA.wav
# Distinta del 016: re menor a 88 pulsos, con un ostinato de marimba que no para (la tensión del concurso), vibráfono en cada fecha y redoble antes de «por una décima».
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'audio'))
from mg import mg
from mgaudio import samples, synth
OUTW = sys.argv[1]; DUR = float(os.environ.get('MUSIC_DUR', '36')); BPM = 88.0; B = 60 / BPM
m = mg.Mix(DUR, bpm=BPM, anchor=0.0); m.group('music').level = -20
CH = [(0.0, ['D2', 'A2', 'D3', 'F3', 'A3']), (3.0, ['A#1', 'F2', 'A#2', 'D3', 'F3']), (6.5, ['F2', 'C3', 'F3', 'A3', 'C4']),
      (10.0, ['C2', 'G2', 'C3', 'E3', 'G3']), (13.0, ['G2', 'D3', 'G3', 'A#3', 'D4']), (16.5, ['A1', 'E2', 'A2', 'C#3', 'E3']),
      (20.0, ['D2', 'A2', 'D3', 'F3', 'A3']), (23.0, ['A#1', 'F2', 'D3', 'F3', 'A#3']), (26.0, ['D#2', 'A#2', 'D#3', 'G3', 'A#3']),
      (30.0, ['A1', 'E2', 'G2', 'C#3', 'E3']), (33.0, ['D2', 'A2', 'D3', 'E3', 'A3'])]
CH = [c for c in CH if c[0] < DUR]
fin = lambda i: min(DUR, CH[i + 1][0] if i + 1 < len(CH) else DUR)
piano, vib, mar = samples.inst('piano'), samples.inst('vibraphone'), samples.inst('marimba')
p = m.track('piano', level=-23, sends={'hall': -12})                        # piano grave y escueto: solo la octava de cada acorde
for i, (t0, notes) in enumerate(CH):
    for k, n in enumerate(notes[:2]): p.add(piano.play(n, dur=fin(i) - t0 + 0.5, vel=0.45), t0 + 0.01 * k)
pad = m.track('pad', level=-31, sends={'hall': -8})
for i, (t0, notes) in enumerate(CH): pad.add(synth.pad(notes[2:], fin(i) - t0 + 0.8, 0.6, 'air'), t0)
ma = m.track('marimba', level=-26, sends={'room': -14}, pan=-0.12)          # ostinato en corcheas durante todo el concurso
for i, (t0, notes) in enumerate(CH):
    if t0 >= 33.0: continue
    fig = [notes[2], notes[4], notes[3], notes[4]]; t, j = t0, 0
    while t < fin(i) - 0.1: ma.add(mar.play(fig[j % 4], vel=0.30 + 0.08 * (j % 4 == 0)), t); t += B / 2; j += 1
vb = m.track('vib', level=-23, sends={'hall': -9}, pan=0.18)                 # una nota en cada fecha y en cada giro
for t, n in [(0.06, 'A5'), (3.05, 'F5'), (16.55, 'E5'), (26.05, 'G5'), (33.05, 'D5')]:
    if t < DUR - 0.5: vb.add(vib.play(n, vel=0.5), t)
if DUR > 30:
    tp = m.track('timpani', level=-24, sends={'hall': -10})                 # redoble con Zaera-Polo y golpe en «por una décima»
    for k in range(18): tp.add(samples.hit('timpani', vel=0.14 + 0.025 * k), 30.1 + k * (2.85 / 18))
    tp.add(samples.hit('timpani', vel=0.85), 33.0)
res = m.export(OUTW, lufs=-14, tp=-1); print('música', {k: res[k] for k in ('duration', 'lufs', 'true_peak')})
