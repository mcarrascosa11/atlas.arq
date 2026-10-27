# Original cue for 010 (bloques cebra / îlot A3). Idea: the same two-note figure (A–E) twice.
# 0–24 s, Zaragoza: a rigid copy-paste loop (dry ticks on an exact grid, steady thump, cold hollow pad on a static
# A-minor drone): every bar identical. 24 s, the pan to Lyon: a short noise rise and the harmony opens to Fmaj7.
# 24–48 s, Lyon: the same A–E now sits warm on Fmaj7–G6–Em7–Am9; one kalimba note per building as the A3 grows
# (the hall at 30.0, then 30.4 + 0.4·j, as in v010.js), FM electric piano with human timing, round bass, a soft shaker for the street.
# Different from 007 (minor pads), 008 (bossa guitar) and 009 (marimba in F). Clean mix, no saturation.
import numpy as np, scipy.signal as ss, wave, sys
SR = 44100; DUR = 48.0; BAR = 3.0; BEAT = BAR / 4; E8 = BEAT / 2; S16 = BEAT / 4
N = int(SR * DUR); BUS = {k: [np.zeros(N), np.zeros(N)] for k in ('tick', 'kick', 'hat', 'pad', 'rise', 'ep', 'bass', 'kal', 'shk')}
rng = np.random.default_rng(10)
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def add(sig, t, pan=0.0, bus='ep'):
    i = int(t * SR)
    if i >= N or i < 0: return
    j = min(N, i + len(sig)); s = sig[:j - i]; Lb, Rb = BUS[bus]
    Lb[i:j] += s * (1 - pan) * 0.5 ** 0.5; Rb[i:j] += s * (1 + pan) * 0.5 ** 0.5
def env(n, a, d): x = np.arange(n) / SR; return np.minimum(1, x / a) * np.exp(-x / d)
def tick(f, amp):                       # dry, short, glassy: the "copy-paste" figure
    n = int(SR * 0.18); x = np.arange(n) / SR
    return amp * env(n, 0.001, 0.045) * (np.sin(2 * np.pi * f * x) + 0.25 * np.sin(2 * np.pi * 2 * f * x))
def thump(amp=0.5):
    n = int(SR * 0.3); x = np.arange(n) / SR; ph = 2 * np.pi * np.cumsum(50 + 70 * np.exp(-x / 0.03)) / SR
    return amp * env(n, 0.002, 0.12) * np.sin(ph)
def hat(amp):
    n = int(SR * 0.05); return amp * env(n, 0.0005, 0.010) * ss.sosfilt(ss.butter(2, 7000, 'high', fs=SR, output='sos'), rng.normal(0, 1, n))
def hollow(f, dur, amp):                # cold pad: odd harmonics only, slow swell
    n = int(SR * dur); x = np.arange(n) / SR; s = sum(np.sin(2 * np.pi * k * f * x) / k for k in (1, 3, 5, 7))
    return amp * s * np.minimum(1, x / 1.6) * np.minimum(1, (dur - x) / 0.8)
def ep(f, dur, amp):                    # FM electric piano
    n = int(SR * dur); x = np.arange(n) / SR; idx = 0.3 + 2.2 * np.exp(-x / 0.25)
    car = np.sin(2 * np.pi * f * x + idx * np.sin(2 * np.pi * f * x)); tine = 0.15 * np.sin(2 * np.pi * 14 * f * x) * np.exp(-x / 0.02)
    return amp * env(n, 0.003, 1.1) * (car + tine)
def kal(f, dur, amp):                   # kalimba: one note per building
    n = int(SR * dur); x = np.arange(n) / SR
    return amp * env(n, 0.002, 0.7) * (np.sin(2 * np.pi * f * x) + 0.35 * np.sin(2 * np.pi * 5.4 * f * x) * np.exp(-x / 0.08) + 0.12 * np.sin(2 * np.pi * 13.2 * f * x) * np.exp(-x / 0.02))
def bassn(f0, f1, dur, amp):            # round bass with a little slide
    n = int(SR * dur); x = np.arange(n) / SR; fr = f1 + (f0 - f1) * np.exp(-x / 0.06); ph = 2 * np.pi * np.cumsum(fr) / SR
    return amp * np.minimum(1, x / 0.01) * np.exp(-x / 0.9) * np.minimum(1, (dur - x) / 0.05) * (np.sin(ph) + 0.1 * np.sin(2 * ph))
def shaker(amp):
    n = int(SR * 0.06); return amp * env(n, 0.003, 0.022) * ss.sosfilt(ss.butter(2, [4000, 10000], 'band', fs=SR, output='sos'), rng.normal(0, 1, n))
# ---------------- part 1: Zaragoza, 0–24 s (8 identical bars) ----------------
T1 = 8 * BAR
fig = [81, 76, 81, 76, 81, 76, 81, 76]                                  # A5 E5 ... identical in every bar
for b in range(8):
    t0 = b * BAR
    for i, m in enumerate(fig): add(tick(mtof(m), 0.26 if i % 2 == 0 else 0.2), t0 + i * E8, pan=0.18 if i % 2 else -0.18, bus='tick')
    for q in (0, 2): add(thump(0.4), t0 + q * BEAT, bus='kick')
    if b >= 1:
        for s16 in range(16): add(hat(0.05 if s16 % 4 else 0.08), t0 + s16 * S16, pan=0.35, bus='hat')
for m in (57, 60, 64): add(hollow(mtof(m), T1 - 2 * BAR + 0.6, 0.05), 2 * BAR, pan=-0.1 if m == 60 else 0.1, bus='pad')
# the noise rise into the flip
n = int(SR * 2.4)
x = np.arange(n) / SR; nz = rng.normal(0, 1, n); rise = np.zeros(n)
for k in range(12):                                                    # widening band, louder towards 22 s
    lo = 400 * 1.28 ** k; seg = ss.sosfilt(ss.butter(2, [lo, min(lo * 3, 16000)], 'band', fs=SR, output='sos'), nz)
    w = np.clip((x / 2.4) * 12 - k, 0, 1) * np.clip(k + 2 - (x / 2.4) * 12, 0, 1); rise += seg * w
add(0.05 * rise * (x / 2.4) ** 2, T1 - 2.4, bus='rise')
# ---------------- part 2: Lyon, 24–48 s ----------------
prog = [(53, [65, 69, 72, 76]), (53, [65, 69, 72, 76]), (55, [67, 71, 74, 76]), (52, [64, 67, 71, 74]), (57, [69, 72, 76, 83]),
        (53, [65, 69, 72, 76]), (55, [67, 71, 74, 76]), (48, [60, 64, 67, 74])]   # Fmaj7 Fmaj7 G6 Em7 Am9 Fmaj7 G6 Cadd9
for b, (root, ch) in enumerate(prog):
    t0 = T1 + b * BAR
    if t0 > DUR - 1: break
    last = b == len(prog) - 1
    for hit, dur in ((0.0, BAR * 0.9), (1.5 * BEAT, BAR * 0.6)) if not last else ((0.0, 5.0),):
        th = t0 + hit + rng.normal(0, 0.008)
        for k2, m in enumerate(ch): add(ep(mtof(m), dur, 0.05 * (0.9 + 0.2 * rng.random())), th + k2 * 0.012, pan=-0.25 + 0.17 * k2, bus='ep')
    if b >= 1:
        add(bassn(mtof(root - 12 - 2), mtof(root - 12), BAR * 0.95 if not last else 5.0, 0.3), t0 + rng.normal(0, 0.005), bus='bass')
        if not last: add(bassn(mtof(root - 12 + 7), mtof(root - 12 + 7), BAR * 0.4, 0.2), t0 + 2.5 * BEAT, bus='bass')
# one kalimba note per building: the hall first, then the eight new ones (same timings as lyon.js)
add(kal(mtof(53), 2.0, 0.22), 30.0, pan=0.0, bus='kal')
for j, m in enumerate([65, 69, 72, 76, 74, 77, 81, 88]): add(kal(mtof(m), 1.6 if j < 7 else 3.0, 0.16 if j < 7 else 0.2), 30.4 + j * 0.4, pan=-0.4 + 0.1 * j, bus='kal')
# the A–E figure again, now warm and never twice the same
phr = [[(0, 81), (0.5, 76), (1, 79), (2, 81)], [(0, 81), (0.75, 76), (1.5, 74), (2.5, 76)], [(0, 83), (0.5, 81), (1, 76), (2, 79)], [(0, 81), (1, 76), (1.5, 79), (2, 81), (3, 84)]]
for p, t0 in enumerate([T1 + 3 * BAR, T1 + 4 * BAR, T1 + 5 * BAR, T1 + 6 * BAR]):
    for be, m in phr[p]: add(kal(mtof(m), 1.2, 0.12 * (0.85 + 0.3 * rng.random())), t0 + be * BEAT + rng.normal(0, 0.01), pan=0.3, bus='kal')
# the street: a soft shaker with human timing from 36 s, when the people appear
for s16 in range(int((DUR - 36.0) / S16)):
    t0 = 36.0 + s16 * S16
    if t0 > DUR - 2.5: break
    add(shaker((0.05 if s16 % 2 else 0.025) * (0.7 + 0.6 * rng.random())), t0 + rng.normal(0, 0.006), pan=-0.3, bus='shk')
# ---------------- mix ----------------
lp = lambda a, f: ss.sosfilt(ss.butter(2, f, 'low', fs=SR, output='sos'), a); hp = lambda a, f: ss.sosfilt(ss.butter(2, f, 'high', fs=SR, output='sos'), a)
G = {'tick': 0.9, 'kick': 0.6, 'hat': 0.6, 'pad': 0.7, 'rise': 0.7, 'ep': 1.0, 'bass': 0.8, 'kal': 0.9, 'shk': 0.6}
FX = {'tick': lambda a: lp(hp(a, 300), 9000), 'kick': lambda a: lp(a, 300), 'hat': lambda a: lp(a, 12000), 'pad': lambda a: lp(hp(a, 120), 2200),
      'rise': lambda a: lp(a, 14000), 'ep': lambda a: lp(hp(a, 110), 7000), 'bass': lambda a: lp(a, 500), 'kal': lambda a: lp(hp(a, 200), 9000), 'shk': lambda a: lp(a, 11000)}
L = np.zeros(N); R = np.zeros(N)
for k, (a, b) in BUS.items(): L += G[k] * FX[k](a); R += G[k] * FX[k](b)
fade = np.ones(N); fi = int(SR * 0.05); fo = int(SR * 3.0); fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
L *= fade; R *= fade; mx = max(np.abs(L).max(), np.abs(R).max()); L /= mx; R /= mx
st = (np.stack([L, R], 1) * 0.89 * 32767).astype(np.int16)
out = sys.argv[1] if len(sys.argv) > 1 else 'raw10.wav'
w = wave.open(out, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close(); print('ok', out)
