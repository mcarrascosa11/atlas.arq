# Original cue for 015 (Sarnago). 60 s. Soft marimba arpeggio and warm pads, joined by long overlapping crossfades (no abrupt scene changes).
# 0-12.5 s: 1955, the village alive (D major, gentle). 12.5-23 s: the exodus and the empty village (D minor, sparser, low drone).
# 23-41 s: the association comes back, hacenderas, the map (D major again, brighter). 41-53.4 s: El Refugio rises (soft wooden knocks, one per course).
# 53.4-60 s: the call to help, resolve.
import numpy as np, scipy.signal as ss, wave, sys
SR = 44100; DUR = 60.0; N = int(SR * DUR); rng = np.random.default_rng(15)
BUS = {k: [np.zeros(N), np.zeros(N)] for k in ('arp', 'pad', 'hit', 'air')}
def add(sig, t, pan=0.0, bus='arp'):
    i = int(t * SR)
    if i >= N or i < 0: return
    j = min(N, i + len(sig)); s = sig[:j - i]; L, R = BUS[bus]; L[i:j] += s * (1 - pan) * 0.7071; R[i:j] += s * (1 + pan) * 0.7071
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
def mallet(f, dur, amp):
    n = int(SR * dur); x = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * x) * np.exp(-x / (dur * 0.35)) + 0.35 * np.sin(2 * np.pi * f * 3.93 * x) * np.exp(-x / (dur * 0.08))
    return amp * s * np.minimum(1, x / 0.002)
def knock(f, amp):
    n = int(SR * 0.6); x = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * x) * np.exp(-x / 0.12) + 0.4 * np.sin(2 * np.pi * f * 2.7 * x) * np.exp(-x / 0.05)
    nz = ss.sosfilt(ss.butter(2, [300, 2500], 'band', fs=SR, output='sos'), rng.normal(0, 1, n)) * np.exp(-x / 0.008) * 0.5
    return amp * (s + nz)
def drone(f, dur, amp):
    n = int(SR * dur); x = np.arange(n) / SR; s = sum(np.sin(2 * np.pi * f * k * x + k) / k ** 1.4 for k in range(1, 6))
    return amp * s * np.minimum(1, x / 2.5) * np.minimum(1, (dur - x) / 2.5)
def padX(segs_, amp=0.06, xf=3.0, cut=1500):
    for k, (t0, t1, ms) in enumerate(segs_):
        a0 = max(0.0, t0 - xf / 2); a1 = min(DUR, t1 + xf / 2); n = int(SR * (a1 - a0)); x = np.arange(n) / SR; s_ = np.zeros(n)
        for m in ms:
            for det in (-0.06, 0.0, 0.05): s_ += np.sin(2 * np.pi * mtof(m + det) * x + rng.random() * 6) * 0.3 + 0.06 * ss.sawtooth(2 * np.pi * mtof(m + det) * x)
        env = np.ones(n); fi = int(SR * (xf if k > 0 else 1.5)); fo = int(SR * xf)
        env[:fi] = np.sin(np.linspace(0, np.pi / 2, fi)) ** 2; env[-fo:] = np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
        add(amp * ss.sosfilt(ss.butter(2, cut, 'low', fs=SR, output='sos'), s_) * env, a0, bus='pad')
# aire de monte: ruido muy filtrado y bajo, todo el vídeo
x = np.arange(N) / SR; nz = rng.normal(0, 1, N); breath = 0.6 + 0.4 * np.sin(2 * np.pi * x / 9.0) ** 2
air = ss.sosfilt(ss.butter(2, [200, 900], 'band', fs=SR, output='sos'), nz) * breath * 0.05; BUS['air'][0] += air; BUS['air'][1] += np.roll(air, int(0.017 * SR))
padX([(0.0, 3.5, [50, 57, 62, 66]), (3.5, 8.5, [50, 57, 62, 66, 69]), (8.5, 12.5, [47, 54, 59, 62, 66]), (12.5, 19.0, [50, 57, 62, 65]),
      (19.0, 23.0, [46, 53, 58, 62]), (23.0, 28.0, [50, 57, 62, 66]), (28.0, 36.0, [43, 50, 55, 59, 62]), (36.0, 41.0, [50, 57, 62, 66, 69]),
      (41.0, 48.6, [45, 52, 57, 61, 64]), (48.6, 53.4, [47, 54, 59, 62, 66]), (53.4, 60.0, [50, 57, 62, 66, 69, 74])])
SEC_ = [(0.0, [62, 69, 74, 78, 74, 69]), (3.5, [62, 66, 69, 74, 78, 74, 69, 66]), (8.5, [59, 62, 66, 71, 66, 62]), (12.5, [62, 65, 69, 74, 69, 65]),
        (19.0, [58, 62, 65, 70]), (23.0, [62, 66, 69, 74, 69, 66]), (28.0, [62, 67, 71, 74, 71, 67]), (36.0, [62, 66, 69, 74, 78, 74, 69, 66]),
        (41.0, [57, 61, 64, 69, 64, 61]), (48.6, [59, 62, 66, 71, 66, 62]), (53.4, [62, 69, 74, 78, 81, 78, 74, 69])]
step = 0.25; t = 0.0; k = 0
while t < 57.6:
    notes = [ns for (ts, ns) in SEC_ if ts <= t + 1e-6][-1]
    fe = 1.0 if t < 16.8 else 1.0 - 0.45 * min(1.0, (t - 16.8) / 2.4) if t < 21.4 else 0.55 + 0.45 * min(1.0, (t - 21.4) / 5.0)   # baja y sube despacio
    amp = 0.11 * fe * min(1.0, (57.6 - t) / 3.0 + 0.35)
    if not (19.2 <= t < 23.0 and k % 2):                                                              # el pueblo vacío: la mitad de notas
        add(mallet(mtof(notes[k % len(notes)]), 0.9, amp), t, pan=0.3 if k % 2 else -0.3)
    t += step; k += 1
add(drone(mtof(38), 11.5, 0.045), 12.6, bus='pad')                                                  # éxodo y pueblo vacío
for i in range(11): add(knock(mtof(43 + (i % 3) * 2), 0.04 + 0.004 * i), 42.2 + i * 0.5, pan=-0.4 + i * 0.08, bus='hit')     # hiladas del Refugio
for k2, m in enumerate((69, 74, 78)): add(mallet(mtof(m), 2.4, 0.032), 23.3 + 0.4 * k2, pan=-0.2 + 0.2 * k2, bus='hit')       # vuelve la asociación
for k2, m in enumerate((66, 71, 74)): add(mallet(mtof(m), 2.4, 0.06), 49.0 + 0.05 * k2, pan=-0.2 + 0.2 * k2, bus='hit')       # la lana
add(mallet(mtof(74), 3.0, 0.09), 57.4, bus='hit')
lp = lambda a, f: ss.sosfilt(ss.butter(2, f, 'low', fs=SR, output='sos'), a); hp = lambda a, f: ss.sosfilt(ss.butter(2, f, 'high', fs=SR, output='sos'), a)
G = {'arp': 1.0, 'pad': 0.85, 'hit': 0.85, 'air': 0.6}
FX = {'arp': lambda a: lp(hp(a, 120), 8000), 'pad': lambda a: lp(hp(a, 80), 3800), 'hit': lambda a: lp(hp(a, 60), 6000), 'air': lambda a: a}
L = np.zeros(N); R = np.zeros(N)
for k, (a, b) in BUS.items(): L += G[k] * FX[k](a); R += G[k] * FX[k](b)
for dly, g in ((0.19, 0.22), (0.38, 0.12)):
    d = int(dly * SR); L[d:] += g * R[:-d]; R[d:] += g * L[:-d]
fade = np.ones(N); fi = int(SR * 0.05); fo = int(SR * 3.0); fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
L *= fade; R *= fade; mx = max(np.abs(L).max(), np.abs(R).max()); L /= mx; R /= mx
st = (np.stack([L, R], 1) * 0.89 * 32767).astype(np.int16)
out = sys.argv[1] if len(sys.argv) > 1 else 'rawSar.wav'
w = wave.open(out, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close(); print('ok', out)
