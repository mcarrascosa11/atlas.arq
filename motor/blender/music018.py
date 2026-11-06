# 018 · Centros de datos en Aragón · música con instrumentos grabados (vibráfono, piano, marimba, timbal), sin efectos de sonido. uso: music018.py SALIDA.wav
# Distinta del 016 y el 017: la menor a 104 pulsos, arpegio de vibráfono en corcheas (el zumbido de las máquinas), bajo de piano a contratiempo
# y un golpe de timbal en cada capítulo nuevo (11 capítulos de 4,5 a 6 s), para marcar los datos.
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'audio'))
from mg import mg
from mgaudio import samples, synth
OUTW = sys.argv[1]; DUR = float(os.environ.get('MUSIC_DUR', '62.5')); BPM = 104.0; B = 60 / BPM
m = mg.Mix(DUR, bpm=BPM, anchor=0.0); m.group('music').level = -20
CAP = [0.0, 5.5, 11.5, 17.5, 22.5, 28.5, 34.5, 40.5, 46.0, 52.0, 56.5]
PROG = [['A2', 'E3', 'A3', 'C4', 'E4'], ['F2', 'C3', 'F3', 'A3', 'C4'], ['C3', 'G3', 'C4', 'E4', 'G4'], ['G2', 'D3', 'G3', 'B3', 'D4'],
        ['A2', 'E3', 'A3', 'C4', 'E4'], ['D3', 'A3', 'D4', 'F4', 'A4'], ['F2', 'C3', 'F3', 'A3', 'C4'], ['E2', 'B2', 'E3', 'G#3', 'B3'],
        ['A2', 'E3', 'A3', 'C4', 'E4'], ['F2', 'C3', 'F3', 'A3', 'C4'], ['D3', 'A3', 'D4', 'F4', 'A4'], ['E2', 'B2', 'E3', 'G#3', 'B3']]
CH = [(t, PROG[i]) for i, t in enumerate(CAP) if t < DUR]
fin = lambda i: min(DUR, CH[i + 1][0] if i + 1 < len(CH) else DUR)
piano, vib, mar = samples.inst('piano'), samples.inst('vibraphone'), samples.inst('marimba')
v = m.track('vib', level=-27, sends={'hall': -12}, pan=0.15)               # arpegio continuo: el zumbido de la sala de servidores
for i, (t0, notes) in enumerate(CH):
    fig = [notes[2], notes[3], notes[4], notes[3]]; t, j = t0, 0
    while t < fin(i) - 0.05: v.add(vib.play(fig[j % 4], vel=0.22 + 0.06 * (j % 4 == 0)), t); t += B / 2; j += 1   # corcheas: más calma para leer
p = m.track('piano', level=-24, sends={'hall': -12})                       # bajo a contratiempo
for i, (t0, notes) in enumerate(CH):
    t = t0 + B / 2
    while t < fin(i) - 0.1: p.add(piano.play(notes[0], dur=B * 0.9, vel=0.42), t); t += B
pad = m.track('pad', level=-32, sends={'hall': -8})
for i, (t0, notes) in enumerate(CH): pad.add(synth.pad(notes[1:4], fin(i) - t0 + 0.6, 0.5, 'air'), t0)
mk = m.track('marimba', level=-25, sends={'room': -12}, pan=-0.15)          # una nota de marimba al entrar cada cifra
for i, (t0, notes) in enumerate(CH): mk.add(mar.play(notes[4], vel=0.5), t0 + 0.4)
tp = m.track('timpani', level=-23, sends={'hall': -10})                    # golpe de timbal en cada capítulo
for t0, _ in CH: tp.add(samples.hit('timpani', vel=0.5 if t0 not in (52.0, 56.5) else 0.75), t0)
res = m.export(OUTW, lufs=-14, tp=-1); print('música', {k: res[k] for k in ('duration', 'lufs', 'true_peak')})
