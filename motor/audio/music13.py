# Original cue for 013 (Piscina das Marés, Leça da Palmeira). Calm Atlantic mood: soft marimba-like arpeggio in D major, warm pad and quiet
# filtered-noise waves. 3.6 s: the walls (wooden knocks); 8 s: plan; 14 s: section (low drone); 22 s: between walls, closed; 25.6 s: the sea appears
# (open chord); 28 s: pumped seawater (low pulses); 34 s: warm chords; 40 s: resolve. Scenes are joined with long overlapping crossfades.
import numpy as np, scipy.signal as ss, wave, sys
SR = 44100; DUR = 50.0; N = int(SR * DUR); rng = np.random.default_rng(13)
BUS = {k: [np.zeros(N), np.zeros(N)] for k in ('arp', 'pad', 'hit', 'tick', 'sea')}
def add(sig, t, pan=0.0, bus='arp'):
    i = int(t * SR)
    if i >= N or i < 0: return
    j = min(N, i + len(sig)); s = sig[:j - i]; L, R = BUS[bus]; L[i:j] += s * (1 - pan) * 0.7071; R[i:j] += s * (1 + pan) * 0.7071
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
def mallet(f, dur, amp):             # marimba: fundamental + 4th partial, fast decay
    n = int(SR * dur); x = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * x) * np.exp(-x / (dur * 0.35)) + 0.35 * np.sin(2 * np.pi * f * 3.93 * x) * np.exp(-x / (dur * 0.08))
    return amp * s * np.minimum(1, x / 0.002)
def pad(ms, dur, amp, cut=1400):
    n = int(SR * dur); x = np.arange(n) / SR; s = np.zeros(n)
    for m in ms:
        for det in (-0.06, 0.0, 0.05): s += np.sin(2 * np.pi * mtof(m + det) * x + rng.random() * 6) * 0.3 + 0.08 * ss.sawtooth(2 * np.pi * mtof(m + det) * x)
    return amp * ss.sosfilt(ss.butter(2, cut, 'low', fs=SR, output='sos'), s) * np.minimum(1, x / 2.2) * np.minimum(1, (dur - x) / 2.2)
def knock(f, amp):
    n = int(SR * 0.6); x = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * x) * np.exp(-x / 0.12) + 0.4 * np.sin(2 * np.pi * f * 2.7 * x) * np.exp(-x / 0.05)
    nz = ss.sosfilt(ss.butter(2, [300, 2500], 'band', fs=SR, output='sos'), rng.normal(0, 1, n)) * np.exp(-x / 0.008) * 0.5
    return amp * (s + nz)
def tick(amp):
    n = int(SR * 0.025); x = np.arange(n) / SR
    return amp * ss.sosfilt(ss.butter(2, [2500, 9000], 'band', fs=SR, output='sos'), rng.normal(0, 1, n)) * np.exp(-x / 0.004)
def drone(f, dur, amp):
    n = int(SR * dur); x = np.arange(n) / SR; s = sum(np.sin(2 * np.pi * f * k * x + k) / k ** 1.4 for k in range(1, 6))
    return amp * s * np.minimum(1, x / 1.8) * np.minimum(1, (dur - x) / 1.8)
step = 0.25   # corcheas a 120 bpm
def arp(t0, t1, notes, amp=0.15, pan=0.3, dur=0.9):
    t = t0; k = 0
    while t < t1:
        add(mallet(mtof(notes[k % len(notes)]), dur, amp), t, pan=pan if k % 2 else -pan); t += step; k += 1
# olas: ruido filtrado que respira cada ~7 s, todo el vídeo
x = np.arange(N) / SR; nz = rng.normal(0, 1, N); swell = 0.55 + 0.45 * np.sin(2 * np.pi * x / 7.0 - 1.2) ** 2
sea = ss.sosfilt(ss.butter(2, [120, 1400], 'band', fs=SR, output='sos'), nz) * swell * 0.18
BUS['sea'][0] += sea; BUS['sea'][1] += np.roll(sea, int(0.013 * SR))
# Transiciones suaves: los colchones se encadenan con fundidos largos que se solapan y el arpegio no se corta entre escenas
def padX(segs_, amp=0.06, xf=2.6, cut=1500):
    for k, (t0, t1, ms) in enumerate(segs_):
        a0 = max(0.0, t0 - xf / 2); a1 = min(DUR, t1 + xf / 2); n = int(SR * (a1 - a0)); x = np.arange(n) / SR; s_ = np.zeros(n)
        for m in ms:
            for det in (-0.06, 0.0, 0.05): s_ += np.sin(2 * np.pi * mtof(m + det) * x + rng.random() * 6) * 0.3 + 0.06 * ss.sawtooth(2 * np.pi * mtof(m + det) * x)
        env = np.ones(n); fi = int(SR * (xf if k > 0 else 1.2)); fo = int(SR * xf)
        env[:fi] = np.sin(np.linspace(0, np.pi / 2, fi)) ** 2; env[-fo:] = np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
        add(amp * ss.sosfilt(ss.butter(2, cut, 'low', fs=SR, output='sos'), s_) * env, a0, bus='pad')
padX([(0.0, 3.8, [50, 57, 62, 66]), (3.8, 8.4, [50, 57, 62, 69]), (8.4, 14.2, [50, 57, 62, 66, 69]), (14.2, 22.2, [47, 54, 59, 62, 66]),
      (22.2, 28.4, [45, 52, 57, 62]), (28.4, 34.2, [45, 52, 57, 61, 64]), (34.2, 40.2, [43, 50, 55, 59, 62]), (40.2, 50.0, [50, 57, 62, 66, 69, 74])])
# arpegio continuo: cambia de notas con cada escena pero no de volumen
SEC_ = [(0.0, [62, 69, 74, 78, 74, 69]), (3.8, [62, 66, 69, 74, 76, 74, 69, 66]), (8.4, [62, 66, 69, 74, 78, 81, 78, 74]), (14.2, [69, 74, 76, 74, 69, 66]),
        (22.2, [57, 62, 66, 69, 66, 62]), (25.6, [74, 78, 81, 78, 74, 69]), (28.4, [62, 66, 69, 74, 69, 66]), (34.2, [62, 66, 69, 74, 69, 66, 71, 74]), (40.2, [62, 69, 74, 78, 81, 78, 74, 69])]
t = 0.0; k = 0
while t < 47.6:
    notes = [ns for (ts, ns) in SEC_ if ts <= t + 1e-6][-1]; amp = 0.12 * min(1.0, (47.6 - t) / 3.0 + 0.35)
    add(mallet(mtof(notes[k % len(notes)]), 0.9, amp), t, pan=0.3 if k % 2 else -0.3); t += step; k += 1
# los muros: golpes de madera suaves que van entrando
for i in range(10): add(knock(mtof(43 + (i % 3) * 2), 0.05 + 0.006 * i), 3.9 + i * 0.27, pan=-0.5 + i * 0.1, bus='hit')
# la sección: dron grave con entrada y salida lentas
add(drone(mtof(38), 8.6, 0.05), 13.9, bus='pad')
# aparece el mar: un acorde de marimba suave, sin golpe
for k2, m in enumerate((69, 74, 78)): add(mallet(mtof(m), 2.4, 0.07), 25.6 + 0.04 * k2, pan=-0.2 + 0.2 * k2, bus='hit')
# el agua bombeada: pulsos graves que crecen y se apagan
for k3 in range(10): add(knock(mtof(36), 0.025 + 0.025 * np.sin(np.pi * (k3 + 0.5) / 10)), 28.5 + k3 * 0.56, bus='hit')
add(mallet(mtof(74), 3.0, 0.10), 47.6, bus='hit')
lp = lambda a, f: ss.sosfilt(ss.butter(2, f, 'low', fs=SR, output='sos'), a); hp = lambda a, f: ss.sosfilt(ss.butter(2, f, 'high', fs=SR, output='sos'), a)
G = {'arp': 1.0, 'pad': 0.85, 'hit': 0.85, 'tick': 0.7, 'sea': 0.32}
FX = {'arp': lambda a: lp(hp(a, 120), 8000), 'pad': lambda a: lp(hp(a, 80), 3800), 'hit': lambda a: lp(hp(a, 60), 6000), 'tick': lambda a: hp(a, 1800), 'sea': lambda a: a}
L = np.zeros(N); R = np.zeros(N)
for k, (a, b) in BUS.items(): L += G[k] * FX[k](a); R += G[k] * FX[k](b)
for dly, g in ((0.19, 0.22), (0.38, 0.12)):
    d = int(dly * SR); L[d:] += g * R[:-d]; R[d:] += g * L[:-d]
fade = np.ones(N); fi = int(SR * 0.05); fo = int(SR * 3.0); fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
L *= fade; R *= fade; mx = max(np.abs(L).max(), np.abs(R).max()); L /= mx; R /= mx
st = (np.stack([L, R], 1) * 0.89 * 32767).astype(np.int16)
out = sys.argv[1] if len(sys.argv) > 1 else 'raw13.wav'
w = wave.open(out, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close(); print('ok', out)
