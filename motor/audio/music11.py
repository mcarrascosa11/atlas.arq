# Original cue for 011 (Arantzazu). Wood and stone: a txalaparta-like figure of two players on planks (short, dry, pitched knocks),
# a low drone in D and a slow choir-like pad. 0–18 s: the building, two players alternating (ttakuna) at a calm pace.
# 18–23 s: the ban, the pattern breaks off to single knocks over the drone. 23–30 s: the ditch, one knock per year (1955–1968).
# 30–42 s: 1969, the crane, the two players back and accelerating, one bell-like stone hit per apostle on the frieze.
# 42–50 s: the pilgrims, full pattern softening into the pad. Different from 007–010. Clean mix, no saturation.
import numpy as np, scipy.signal as ss, wave, sys
SR = 44100; DUR = 50.0; N = int(SR * DUR); rng = np.random.default_rng(11)
BUS = {k: [np.zeros(N), np.zeros(N)] for k in ('wood', 'drone', 'pad', 'bell', 'low')}
def add(sig, t, pan=0.0, bus='wood'):
    i = int(t * SR)
    if i >= N or i < 0: return
    j = min(N, i + len(sig)); s = sig[:j - i]; L, R = BUS[bus]; L[i:j] += s * (1 - pan) * 0.7071; R[i:j] += s * (1 + pan) * 0.7071
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def knock(f, amp, dur=0.32):          # plank: a few inharmonic modes with fast decay
    n = int(SR * dur); x = np.arange(n) / SR; s = np.zeros(n)
    for r, a, d in ((1.0, 1.0, 0.09), (2.76, 0.45, 0.05), (5.4, 0.25, 0.025), (8.9, 0.12, 0.012)): s += a * np.sin(2 * np.pi * f * r * x) * np.exp(-x / d)
    click = ss.sosfilt(ss.butter(2, [1500, 6000], 'band', fs=SR, output='sos'), rng.normal(0, 1, n)) * np.exp(-x / 0.004) * 0.3
    return amp * (s + click) * np.minimum(1, x / 0.0008)
def drone(f, dur, amp):
    n = int(SR * dur); x = np.arange(n) / SR; s = sum(np.sin(2 * np.pi * f * k * x + k) / k ** 1.4 for k in range(1, 7))
    return amp * s * (0.85 + 0.15 * np.sin(2 * np.pi * 0.11 * x)) * np.minimum(1, x / 3) * np.minimum(1, (dur - x) / 3)
def pad(ms, dur, amp):                 # choir-like: detuned saws through a soft low-pass, slow swell
    n = int(SR * dur); x = np.arange(n) / SR; s = np.zeros(n)
    for m in ms:
        for det in (-0.07, 0.0, 0.06):
            f = mtof(m + det); s += ss.sawtooth(2 * np.pi * f * x + rng.random() * 6) * 0.3
    s = ss.sosfilt(ss.butter(2, 1400, 'low', fs=SR, output='sos'), s)
    return amp * s * np.minimum(1, x / 2.5) * np.minimum(1, (dur - x) / 2.5)
def bell(f, amp):                      # stone/bell hit for each apostle placed
    n = int(SR * 2.4); x = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * f * r * x) * np.exp(-x / d) for r, a, d in ((1.0, 1.0, 1.1), (2.0, 0.5, 0.7), (2.92, 0.35, 0.45), (4.07, 0.2, 0.3)))
    return amp * s * np.minimum(1, x / 0.002)
PL = [mtof(62), mtof(69)]              # two planks: D and A (one per player)
def pattern(t0, t1, step, swing=0.0, amp=0.32):
    t = t0; k = 0
    while t < t1:
        p = k % 2; tt = t + (swing * step if p else 0) + rng.normal(0, 0.006)
        add(knock(PL[p] * (1 + rng.normal(0, 0.004)), amp * (0.85 + 0.3 * rng.random())), tt, pan=-0.35 if p == 0 else 0.35)
        if k % 4 == 3: add(knock(PL[p] * 1.5, amp * 0.6), tt + step * 0.5, pan=0.0)
        t += step; k += 1
# 0–18 s: calm alternation
pattern(0.0, 18.0, 0.375, 0.08, 0.30)
add(drone(mtof(38), 50.0, 0.07), 0.0, bus='drone')
add(pad([62, 69, 74], 18.0, 0.05), 0.5, bus='pad')
# 18–23 s: the ban, single knocks
for t in (18.2, 19.4, 20.6, 21.8): add(knock(PL[0] * 0.75, 0.32), t, pan=0.0); add(knock(PL[0] * 0.5, 0.18, 0.5), t, bus='low')
# 23–30 s: one knock per year in the ditch (14 years)
for j in range(14): add(knock(PL[j % 2], 0.26), 23.5 + j * 0.45, pan=-0.2 + 0.03 * j)
add(pad([57, 64, 69], 7.5, 0.04), 23.0, bus='pad')
# 30–42 s: 1969, the crane, players back and accelerating; one stone bell per apostle (31.2 + 0.38·k + 1.25)
pattern(30.0, 34.0, 0.33, 0.06, 0.30); pattern(34.0, 42.0, 0.25, 0.04, 0.32)
for k in range(14): add(bell(mtof([74, 76, 78, 81, 83, 81, 78, 76, 74, 78, 81, 83, 86, 81][k]), 0.10), 31.2 + k * 0.38 + 1.25, pan=-0.5 + k / 13.0, bus='bell')
add(bell(mtof(62), 0.16), 37.6, bus='bell')                          # la Piedad
add(pad([62, 66, 69, 74], 14.0, 0.06), 30.0, bus='pad')
# 42–50 s: pilgrims, the pattern softens into the pad
pattern(42.0, 47.0, 0.375, 0.08, 0.22)
add(pad([62, 69, 74, 78], 8.5, 0.07), 41.5, bus='pad')
add(bell(mtof(50), 0.18), 46.8, bus='bell')
lp = lambda a, f: ss.sosfilt(ss.butter(2, f, 'low', fs=SR, output='sos'), a); hp = lambda a, f: ss.sosfilt(ss.butter(2, f, 'high', fs=SR, output='sos'), a)
G = {'wood': 1.0, 'drone': 0.8, 'pad': 0.8, 'bell': 0.9, 'low': 0.7}
FX = {'wood': lambda a: lp(hp(a, 120), 9000), 'drone': lambda a: lp(a, 600), 'pad': lambda a: lp(hp(a, 100), 3000), 'bell': lambda a: lp(hp(a, 150), 8000), 'low': lambda a: lp(a, 400)}
L = np.zeros(N); R = np.zeros(N)
for k, (a, b) in BUS.items(): L += G[k] * FX[k](a); R += G[k] * FX[k](b)
# a little room: two short reflections
for dly, g in ((0.031, 0.22), (0.057, 0.14)):
    d = int(dly * SR); L[d:] += g * R[:-d]; R[d:] += g * L[:-d]
fade = np.ones(N); fi = int(SR * 0.05); fo = int(SR * 3.0); fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
L *= fade; R *= fade; mx = max(np.abs(L).max(), np.abs(R).max()); L /= mx; R /= mx
st = (np.stack([L, R], 1) * 0.89 * 32767).astype(np.int16)
out = sys.argv[1] if len(sys.argv) > 1 else 'raw11.wav'
w = wave.open(out, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close(); print('ok', out)
