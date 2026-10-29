# Original cue for 012 (Centre Pompidou, 1977). Analog-synth homage to the French electronic music of the 1970s: a sequenced
# arpeggio (square/saw, filtered), a warm string pad and metallic hits. 0–8 s: arpeggio in A minor; 8–13 s: 681 projects, quick
# typewriter clicks thinning to one bell; 13–19 s: assembly, one metallic clank per portal frame (14); 19–24 s: escalator, the
# arpeggio rises; 24–30 s: plaza, pad opens to C major; 30–38 s: "la refinería", low drone and pipe hits; 38–50 s: resolve.
import numpy as np, scipy.signal as ss, wave, sys
SR = 44100; DUR = 50.0; N = int(SR * DUR); rng = np.random.default_rng(12)
BUS = {k: [np.zeros(N), np.zeros(N)] for k in ('arp', 'pad', 'hit', 'click', 'low')}
def add(sig, t, pan=0.0, bus='arp'):
    i = int(t * SR)
    if i >= N or i < 0: return
    j = min(N, i + len(sig)); s = sig[:j - i]; L, R = BUS[bus]; L[i:j] += s * (1 - pan) * 0.7071; R[i:j] += s * (1 + pan) * 0.7071
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
def pluck(f, dur, amp, cut=2400):
    n = int(SR * dur); x = np.arange(n) / SR
    s = 0.6 * ss.square(2 * np.pi * f * x, 0.32) + 0.4 * ss.sawtooth(2 * np.pi * f * 1.003 * x)
    env = np.exp(-x / (dur * 0.45)) * np.minimum(1, x / 0.004)
    b = ss.butter(2, min(cut, SR / 2 - 100), 'low', fs=SR, output='sos'); return amp * ss.sosfilt(b, s) * env
def pad(ms, dur, amp, cut=1600):
    n = int(SR * dur); x = np.arange(n) / SR; s = np.zeros(n)
    for m in ms:
        for det in (-0.08, 0.0, 0.07): s += ss.sawtooth(2 * np.pi * mtof(m + det) * x + rng.random() * 6) * 0.25
    return amp * ss.sosfilt(ss.butter(2, cut, 'low', fs=SR, output='sos'), s) * np.minimum(1, x / 2.0) * np.minimum(1, (dur - x) / 2.0)
def clank(f, amp):          # metallic hit: inharmonic partials, short
    n = int(SR * 1.4); x = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * f * r * x) * np.exp(-x / d) for r, a, d in ((1.0, 1.0, 0.5), (2.41, 0.6, 0.3), (3.93, 0.4, 0.2), (5.67, 0.25, 0.12)))
    noise = ss.sosfilt(ss.butter(2, [2000, 7000], 'band', fs=SR, output='sos'), rng.normal(0, 1, n)) * np.exp(-x / 0.01) * 0.4
    return amp * (s + noise) * np.minimum(1, x / 0.001)
def click(amp):
    n = int(SR * 0.03); x = np.arange(n) / SR
    return amp * ss.sosfilt(ss.butter(2, [2500, 8000], 'band', fs=SR, output='sos'), rng.normal(0, 1, n)) * np.exp(-x / 0.004)
def drone(f, dur, amp):
    n = int(SR * dur); x = np.arange(n) / SR; s = sum(np.sin(2 * np.pi * f * k * x + k) / k ** 1.3 for k in range(1, 6))
    return amp * s * np.minimum(1, x / 1.5) * np.minimum(1, (dur - x) / 1.5)
step = 0.1875   # dieciseisavos a 80 bpm
def arp(t0, t1, notes, amp=0.16, cut=2200, pan=0.25):
    t = t0; k = 0
    while t < t1:
        add(pluck(mtof(notes[k % len(notes)]), 0.30, amp, cut), t, pan=pan if k % 2 else -pan); t += step; k += 1
# 0–8: arpegio en La menor
arp(0.0, 8.2, [57, 64, 69, 72, 69, 64, 60, 64], 0.15, 1800)
add(pad([45, 52, 57, 60], 8.6, 0.05), 0.0, bus='pad')
# 8–13: 681 proyectos, clics de máquina de escribir que se aclaran; una campana para el ganador
tt = 8.6
while tt < 11.6: add(click(0.18 * (1 - (tt - 8.6) / 3.4)), tt + rng.normal(0, 0.01), pan=rng.uniform(-0.6, 0.6), bus='click'); tt += 0.05 + (tt - 8.6) * 0.03
add(clank(mtof(81), 0.12), 12.2, bus='hit')
add(pad([48, 55, 60, 64], 5.0, 0.04), 8.4, bus='pad')
# 13–19: montaje, un golpe metálico por pórtico (14) mientras vuelve el arpegio
for i in range(14): add(clank(mtof(45 + (i % 2) * 7), 0.11), 13.0 + i * 0.33, pan=-0.6 + i * 0.09, bus='hit')
arp(13.0, 19.0, [57, 60, 64, 67, 69, 67, 64, 60], 0.13, 2000)
add(pad([45, 52, 57, 64], 6.4, 0.05), 13.0, bus='pad')
# 19–24: la escalera, el arpegio sube
arp(19.0, 24.0, [57, 60, 64, 69, 72, 76, 79, 81], 0.14, 2800)
add(pad([45, 52, 57, 60, 64], 5.4, 0.05), 19.0, bus='pad')
# 24–30: la plaza, Do mayor y el filtro se abre
arp(24.0, 30.0, [60, 64, 67, 72, 76, 72, 67, 64], 0.14, 3400)
add(pad([48, 55, 60, 64, 67], 6.4, 0.07), 24.0, bus='pad')
# 30–38: «la refinería», dron grave y golpes de tubería
add(drone(mtof(33), 8.2, 0.09), 30.0, bus='low')
for t in np.arange(30.4, 37.8, 0.75): add(clank(mtof(40 + int(rng.integers(0, 3)) * 3), 0.06), t, pan=rng.uniform(-0.5, 0.5), bus='hit')
arp(30.0, 38.0, [57, 60, 63, 57, 60, 63, 66, 63], 0.09, 1500)
# 38–50: resolución, arpegio largo y acorde final
arp(38.0, 47.5, [57, 64, 69, 72, 76, 72, 69, 64], 0.12, 2600)
add(pad([45, 52, 57, 60, 64, 69], 11.5, 0.08, 1800), 38.0, bus='pad')
add(clank(mtof(57), 0.10), 47.4, bus='hit')
lp = lambda a, f: ss.sosfilt(ss.butter(2, f, 'low', fs=SR, output='sos'), a); hp = lambda a, f: ss.sosfilt(ss.butter(2, f, 'high', fs=SR, output='sos'), a)
G = {'arp': 1.0, 'pad': 0.85, 'hit': 0.8, 'click': 0.7, 'low': 0.8}
FX = {'arp': lambda a: lp(hp(a, 140), 9000), 'pad': lambda a: lp(hp(a, 90), 4000), 'hit': lambda a: lp(hp(a, 120), 9000), 'click': lambda a: hp(a, 1500), 'low': lambda a: lp(a, 500)}
L = np.zeros(N); R = np.zeros(N)
for k, (a, b) in BUS.items(): L += G[k] * FX[k](a); R += G[k] * FX[k](b)
for dly, g in ((0.12, 0.25), (0.24, 0.14)):                     # eco estéreo, muy setentero
    d = int(dly * SR); L[d:] += g * R[:-d]; R[d:] += g * L[:-d]
fade = np.ones(N); fi = int(SR * 0.05); fo = int(SR * 3.0); fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
L *= fade; R *= fade; mx = max(np.abs(L).max(), np.abs(R).max()); L /= mx; R /= mx
st = (np.stack([L, R], 1) * 0.89 * 32767).astype(np.int16)
out = sys.argv[1] if len(sys.argv) > 1 else 'raw12.wav'
w = wave.open(out, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close(); print('ok', out)
