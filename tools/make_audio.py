"""tools/make_audio.py -- makes all of the story's sound: original music, the air of each place, voices and effects.

    python tools/make_audio.py          (needs numpy, and ffmpeg for the .ogg files)

Everything is synthesised here from sines and noise; nothing is sampled. Written to godot/assets/audio/.
"""
import os, subprocess, sys, tempfile, wave
import numpy as np

SR = 32000
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'godot', 'assets', 'audio')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)
TAU = 2 * np.pi


def T(d): return np.arange(int(d * SR)) / SR
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def env(n, a, r, sr=SR):
    e = np.ones(n); A = max(1, int(a * sr)); R = max(1, int(r * sr))
    e[:min(A, n)] = np.linspace(0, 1, A)[:n]; k = min(R, n); e[-k:] *= np.linspace(1, 0, k); return e
def lp(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); return np.fft.irfft(X / (1 + (f / fc) ** 4), len(x))
def bp(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); return np.fft.irfft(X * (1 / (1 + (lo / np.maximum(f, 1)) ** 4)) / (1 + (f / hi) ** 4), len(x))
def noise(d): return rng.standard_normal(int(d * SR))


# ------------------------------------------------------------ instruments --
def harp(f, d, v=1.0, bright=1.0):
    t = T(max(d, 1.6)); y = np.zeros_like(t)
    for h in range(1, 9):
        if f * h > SR * 0.45: break
        y += np.sin(TAU * f * h * t * (1 + 0.0004 * h * h)) * bright ** (h - 1) * 0.62 ** (h - 1) * np.exp(-t * (1.5 + h * 1.1 + f / 600))
    return y * env(len(t), 0.003, 0.2) * v * 0.5
def pluck(f, d, v=1.0):
    t = T(0.7); y = sum(np.sin(TAU * f * h * t) * 0.5 ** (h - 1) * np.exp(-t * (7 + h * 4)) for h in range(1, 7))
    return y * env(len(t), 0.002, 0.1) * v * 0.6
def box(f, d, v=1.0):
    t = T(1.8); y = np.sin(TAU * f * t) * np.exp(-t * 2.6) + 0.35 * np.sin(TAU * f * 3.01 * t) * np.exp(-t * 5) + 0.16 * np.sin(TAU * f * 5.42 * t) * np.exp(-t * 9)
    return y * env(len(t), 0.002, 0.2) * v * 0.42
def flute(f, d, v=1.0):
    t = T(d + 0.12); vib = 1 + 0.004 * np.sin(TAU * 5.1 * t) * np.clip(t * 2.2 - 0.4, 0, 1)
    ph = TAU * f * np.cumsum(vib) / SR
    y = np.sin(ph) + 0.22 * np.sin(2 * ph) + 0.07 * np.sin(3 * ph) + bp(rng.standard_normal(len(t)), f * 0.8, f * 2.4) * 0.07
    return y * env(len(t), 0.06, 0.14) * v * 0.32
def strings(f, d, v=1.0):
    t = T(d + 0.5); y = np.zeros_like(t)
    for det in (-0.0035, 0.0, 0.0038):
        ph = TAU * f * (1 + det) * np.cumsum(1 + 0.0025 * np.sin(TAU * (4.6 + det * 200) * t)) / SR
        for h in range(1, 10):
            if f * h > 7000: break
            y += np.sin(ph * h + det * 900 * h) / h * np.exp(-h * 0.22)
    return y * env(len(t), min(0.5, d * 0.35), 0.55) * v * 0.11
def reed(f, d, v=1.0):
    t = T(d + 0.05); ph = TAU * f * t
    y = sum(np.sin(ph * h) * (1.0 if h % 2 else 0.35) / h for h in range(1, 12) if f * h < 8000)
    return y * env(len(t), 0.02, 0.06) * v * 0.22
def bell(f, d, v=1.0):
    t = T(max(d, 5.0)); y = np.zeros_like(t)
    for r, a, k in ((0.5, 0.5, 0.45), (1, 1, 0.7), (1.19, 0.55, 0.9), (1.5, 0.4, 1.2), (2, 0.6, 1.1), (2.74, 0.3, 1.9), (3.0, 0.22, 2.3), (4.07, 0.16, 3.4), (5.4, 0.1, 5)):
        y += a * np.sin(TAU * f * r * t + r) * np.exp(-t * k)
    return y * env(len(t), 0.004, 0.6) * v * 0.3
def drum(f, d, v=1.0):
    t = T(0.3); return (np.sin(TAU * (f * t + 30 * (1 - np.exp(-t * 30)) / 30)) * np.exp(-t * 14) + lp(rng.standard_normal(len(t)), 1800) * np.exp(-t * 40) * 0.5) * v * 0.6
def shake(f, d, v=1.0):
    t = T(0.09); return bp(rng.standard_normal(len(t)), 4500, 11000) * np.exp(-t * 45) * v * 0.22


def verb(y, secs=1.8, mix=0.25, dark=4200):
    """stereo room: a decaying tail of noise"""
    n = int(secs * SR); t = np.arange(n) / SR; out = []
    for s in (1, 2):
        ir = lp(np.random.default_rng(s).standard_normal(n), dark) * np.exp(-t * 5.2 / secs); ir[: int(0.012 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
        x = y[s - 1] if y.ndim == 2 else y
        L = len(x) + n; out.append(np.pad(x, (0, n)) * (1 - mix * 0.5) + np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L) * mix)
    return np.array(out)


class Score:
    def __init__(self, bpm, bars, beats): self.q = 60 / bpm; self.len = bars * beats * self.q; self.beats = beats; n = int((self.len + 7) * SR); self.b = np.zeros((2, n))
    def at(self, beat, y, pan=0.0):
        i = int(beat * self.q * SR); n = min(len(y), self.b.shape[1] - i)
        if n <= 0: return
        self.b[0, i:i + n] += y[:n] * np.cos((pan + 1) * np.pi / 4); self.b[1, i:i + n] += y[:n] * np.sin((pan + 1) * np.pi / 4)
    def line(self, ins, notes, start=0.0, v=1.0, pan=0.0, tr=0):
        """notes: 'C5:1 E5:.5 -:1 ...' (beats)"""
        p = start
        for tok in notes.split():
            n, d = tok.split(':'); d = float(d)
            if n != '-':
                for m in n.split('+'): self.at(p, ins(hz(midi(m) + tr), d * self.q * 0.96, v), pan)
            p += d
        return p
    def chords(self, ins, prog, dur, v=1.0, pan=0.0, start=0.0, arp=None, tr=0):
        p = start
        for c in prog.split():
            ms = chord(c)
            if arp is None:
                for k, m in enumerate(ms): self.at(p, ins(hz(m + tr), dur * self.q, v), pan + (k - 1) * 0.15)
            else:
                st = dur / len(arp)
                for k, a in enumerate(arp):
                    if a is None: continue
                    m = ms[a % len(ms)] + 12 * (a // len(ms)); self.at(p + k * st, ins(hz(m + tr), st * self.q * 1.6, v * (1.0 if k == 0 else 0.8)), pan + ((k % 3) - 1) * 0.18)
            p += dur
    def done(self, name, room=1.9, mix=0.28, gain=0.82):
        y = verb(self.b, room, mix); n = int(self.len * SR); out = y[:, :n].copy(); tail = y[:, n:]; k = min(n, tail.shape[1]); out[:, :k] += tail[:, :k]      # the tail runs round into the start: it loops
        save('mus_' + name, out, gain)


NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def midi(s):
    m = NOTE[s[0]]; i = 1
    while i < len(s) and s[i] in '#b': m += 1 if s[i] == '#' else -1; i += 1
    return m + 12 * (int(s[i:]) + 1)
def chord(c):
    """'D3', 'D3m', 'G3M7', 'A3sus', 'A37' -> notes"""
    i = 1
    while c[i] in '#b': i += 1
    root = midi(c[:i + 1]); q = c[i + 1:]
    return [root + k for k in {'': (0, 4, 7), 'm': (0, 3, 7), 'M7': (0, 4, 7, 11), 'm7': (0, 3, 7, 10), '7': (0, 4, 7, 10), 'sus': (0, 5, 7), 'add9': (0, 4, 7, 14), 'dim': (0, 3, 6)}[q]]


def save(name, y, gain=0.85):
    y = np.atleast_2d(y); pk = np.abs(y).max() or 1; y = np.tanh(y / pk * 1.15) / np.tanh(1.15) * gain
    f = os.path.join(tempfile.gettempdir(), 'tt_' + name + '.wav')
    with wave.open(f, 'wb') as w: w.setnchannels(y.shape[0]); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y.T * 32000).astype('<i2').tobytes())
    q = '3' if name.startswith('mus') else '2'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f, '-c:a', 'libvorbis', '-q:a', q, os.path.join(OUT, name + '.ogg')], check=True); os.remove(f)


# ================================================================== music ==
def m_dawn():
    s = Score(80, 16, 3)
    P = 'D3add9 A3 B3m G3 D3add9 A3 G3 A3sus ' 'D3add9 F#3m G3 D3 E3m G3 A3sus A3'
    s.chords(harp, P, 3, 0.8, -0.2, arp=[0, 1, 2, 3, 2, 1]); s.chords(strings, P, 3, 0.55, 0.2, start=0)
    s.line(flute, '-:6 F#5:2 E5:1 D5:3 -:3 A5:2 G5:1 F#5:1.5 E5:1.5 D5:3 E5:3 F#5:2 A5:1 B5:2 A5:1 G5:2 F#5:1 E5:1 F#5:1 D5:1 E5:2 G5:1 F#5:2 D5:1 E5:3 -:3', 0, 0.9, 0.25)
    s.done('dawn', 2.4, 0.34)
def m_letter():
    s = Score(96, 16, 3)
    P = 'G3add9 D3 E3m C3 G3 B3m C3M7 D3sus ' 'E3m C3 G3 D3 C3M7 A3m D3sus D3'
    s.chords(box, P, 3, 0.8, 0.1, arp=[0, 2, 4, 1, 3, 5], tr=24); s.chords(strings, P, 3, 0.6, 0)
    s.line(harp, '-:24 ' 'B4:2 A4:1 G4:3 D5:2 B4:1 A4:3 E5:2 D5:1 C5:2 B4:1 A4:3 A4:1 B4:1 D5:1', 0, 1.0, -0.2)
    s.line(flute, 'D5:3 F#5:2 G5:1 B5:3 A5:2 G5:1 G5:2 F#5:1 D5:3 E5:2 G5:1 A5:3', 24, 0.6, 0.2)
    s.done('letter', 2.4, 0.36)
def m_road():
    s = Score(98, 16, 4)
    P = 'A3 G3 D3 A3 A3 E3m G3 D3 ' 'F#3m D3 A3 E3 D3 A3 G3 A3'
    s.chords(pluck, P, 4, 0.9, -0.15, arp=[0, 2, 1, 2, 0, 2, 1, 3]); s.chords(strings, P, 4, 0.42, 0.2); s.chords(pluck, P, 4, 1.1, 0, arp=[0, None, 0, None], tr=-12)
    s.line(flute, 'E5:2 C#5:1 A4:1 B4:2 D5:2 F#5:1.5 E5:.5 D5:2 C#5:4 E5:1.5 F#5:.5 A5:2 G5:2 E5:2 D5:1 E5:1 G5:2 F#5:4 A5:2 F#5:2 F#5:1 E5:1 D5:2 C#5:2 E5:2 B4:4 D5:1.5 E5:.5 F#5:2 E5:2 C#5:2 D5:1 B4:1 G4:2 A4:4', 0, 0.9, 0.2)
    for b in range(0, 64, 2): s.at(b, drum(70, 1, 0.35)); s.at(b + 1, shake(0, 0, 0.8), 0.3); s.at(b + 1.5, shake(0, 0, 0.5), -0.3)
    s.done('road', 1.6, 0.26)
def m_town():
    s = Score(116, 16, 4)
    P = 'F3 A3m Bb3 C3 F3 D3m G3m C37 ' 'Bb3 F3 G3m D3m Bb3 F3 C3sus C3'
    s.chords(pluck, P, 4, 1.0, 0, arp=[0, None, 1, 2, 0, None, 2, 1]); s.chords(pluck, P, 4, 1.0, 0, arp=[0, None, 2, None], tr=-12)
    s.line(reed, 'C5:1 A4:.5 C5:.5 F5:1 E5:1 D5:.5 C5:.5 A4:1 C5:2 D5:1 Bb4:.5 D5:.5 F5:1 D5:1 C5:3 -:1 A5:1 G5:.5 F5:.5 C5:1 F5:1 E5:.5 F5:.5 D5:1 A4:2 Bb4:1 C5:.5 D5:.5 G5:1 F5:1 E5:3 -:1', 0, 0.7, -0.2)
    s.line(flute, 'F5:1.5 D5:.5 Bb4:1 D5:1 C5:1 A4:1 F4:2 G4:1 Bb4:1 D5:1 G5:1 F5:2 A5:2 Bb5:1 A5:.5 G5:.5 F5:1 D5:1 C5:1 F5:1 A5:2 G5:2 F5:1 D5:1 E5:3 -:1', 32, 0.85, 0.2)
    for b in range(64): s.at(b, shake(0, 0, 0.9 if b % 2 else 0.4), 0.25); (b % 4 == 0) and s.at(b, drum(82, 1, 0.5))
    s.done('town', 1.3, 0.22)
def m_academy():
    s = Score(74, 16, 4)
    P = 'B3m G3 D3 A3 B3m F#3m G3 A3sus ' 'D3 A3 B3m G3 E3m G3 A3sus B3m'
    s.chords(strings, P, 4, 0.95, -0.1); s.chords(strings, P, 4, 0.6, 0.2, tr=12); s.chords(harp, P, 4, 0.7, 0.1, arp=[0, 1, 2, 3, 4, 3, 2, 1])
    s.line(strings, 'F#5:3 E5:1 D5:2 B4:2 A4:3 D5:1 C#5:4 D5:3 F#5:1 A5:2 F#5:2 G5:3 F#5:1 E5:4 F#5:2 A5:2 A5:3 G5:1 F#5:2 D5:2 B4:4 G5:2 F#5:1 E5:1 D5:2 B4:2 E5:2 D5:2 D5:4', 0, 1.25, 0.1)
    for b, n in ((0, 'B4'), (8, 'D5'), (16, 'B4'), (24, 'G4'), (32, 'D5'), (40, 'B4'), (48, 'E5'), (56, 'A4')): s.at(b, bell(hz(midi(n)), 4, 0.42), -0.3)
    for b in range(0, 64, 4): s.at(b, drum(52, 1, 0.6))
    s.done('academy', 3.0, 0.4)
def m_school():
    s = Score(92, 16, 4)
    P = 'C3M7 E3m F3M7 G3 A3m7 F3M7 D3m7 G3sus ' 'C3M7 A3m7 F3M7 E3m D3m7 F3 G3sus G3'
    s.chords(pluck, P, 4, 0.8, -0.1, arp=[0, 2, 1, 3, 2, 1, 2, 3], tr=12); s.chords(strings, P, 4, 0.4, 0.1)
    s.line(box, 'E5:2 G5:1 B5:1 A5:2 G5:2 C6:1.5 B5:.5 A5:1 E5:1 D5:4 E5:1 G5:1 C6:2 A5:2 G5:1 E5:1 F5:2 A5:1 G5:1 D5:4', 0, 0.9, 0.2)
    s.line(reed, 'G4:2 B4:1 C5:1 E5:2 C5:2 A4:2 G4:1 A4:1 B4:4 F4:2 A4:1 C5:1 D5:2 C5:2 G4:2 C5:2 B4:3 -:1', 32, 0.6, -0.25)
    s.line(box, '-:4 C6:1 B5:1 G5:2 -:4 G5:1 E5:1 B4:2 -:4 A5:1 C6:1 E6:2 -:8', 32, 0.6, 0.25)
    s.done('school', 1.9, 0.3)
def m_lesson():
    s = Score(124, 16, 4)
    P = 'C3m C3m F3m G37 C3m Ab3 D3dim G37 ' 'Eb3 Bb3 F3m C3m Ab3 F3m G37 G37'
    s.chords(pluck, P, 4, 1.1, 0, arp=[0, None, 1, None, 2, None, 1, None]); s.chords(pluck, P, 4, 1.2, 0, arp=[0, None, None, 2], tr=-12)
    s.line(reed, 'C4:.5 -:.5 Eb4:.5 -:.5 G4:.5 F#4:.5 G4:1 -:1 C4:.5 D4:.5 Eb4:.5 D4:.5 C4:1 F4:.5 -:.5 Ab4:.5 -:.5 C5:.5 B4:.5 C5:1 B4:.5 -:.5 G4:.5 -:.5 D4:2 C4:.5 -:.5 Eb4:.5 -:.5 G4:.5 F#4:.5 G4:1 Ab4:1 G4:.5 F4:.5 Eb4:2 D4:.5 Eb4:.5 F4:.5 D4:.5 Ab4:1 F4:1 G4:3 -:1', 0, 1.0, -0.2)
    s.line(box, '-:2 G5:.5 Bb5:.5 Eb6:1 -:2 F5:.5 Bb5:.5 D6:1 -:2 Ab5:.5 C6:.5 F6:1 -:2 G5:.5 C6:.5 Eb6:1 -:2 C6:.5 Ab5:.5 Eb5:1 -:2 F5:.5 Ab5:.5 C6:1 B5:1 D6:1 F6:1 Ab6:1 G6:2 -:2', 32, 0.8, 0.25)
    for b in range(64): (b % 2) and s.at(b, shake(0, 0, 0.7), 0.3)
    s.done('lesson', 1.1, 0.2)
def m_evening():
    s = Score(64, 16, 4)
    P = 'E3add9 B3 C#3m A3M7 E3 G#3m A3M7 B3sus ' 'C#3m A3 E3 B3 A3M7 F#3m B3sus B3'
    s.chords(harp, P, 4, 0.85, -0.1, arp=[0, 1, 2, 3, 4, 3, 2, 1]); s.chords(strings, P, 4, 0.4, 0.15)
    s.line(box, 'G#5:3 F#5:1 E5:4 -:1 E5:1 F#5:1 G#5:1 B5:4 G#5:3 B5:1 C#6:2 B5:2 A5:2 G#5:1 E5:1 F#5:4 E5:2 C#6:2 B5:3 A5:1 G#5:3 E5:1 F#5:4 C#5:1 E5:1 G#5:2 A5:2 F#5:2 E5:2 F#5:2 E5:4', 0, 0.95, 0.15)
    s.done('evening', 2.8, 0.4)
def m_wonder():
    s = Score(70, 16, 4)
    P = 'E3add9 B3 C#3m A3M7 E3 G#3m A3M7 B3sus ' 'C#3m A3 E3 B3 A3M7 F#3m B3sus E3add9'
    s.chords(strings, P, 4, 1.0, -0.15); s.chords(strings, P, 4, 0.7, 0.2, tr=12); s.chords(harp, P, 4, 0.9, 0, arp=[0, 1, 2, 3, 4, 5, 4, 3, 2, 3, 4, 5, 6, 5, 4, 3])
    s.line(flute, 'G#5:3 F#5:1 E5:4 -:1 E5:1 F#5:1 G#5:1 B5:4 G#5:3 B5:1 C#6:2 B5:2 A5:2 G#5:1 E5:1 F#5:4 E5:2 C#6:2 B5:3 A5:1 G#5:3 E5:1 F#5:4 C#5:1 E5:1 G#5:2 A5:2 F#5:2 E5:2 F#5:2 E5:4', 0, 1.0, 0.1)
    for b in range(0, 64, 8): s.at(b, bell(hz(midi('E5')), 4, 0.3), 0.3); s.at(b + 4, bell(hz(midi('B4')), 4, 0.2), -0.3)
    s.done('wonder', 3.0, 0.42)
def m_night():
    s = Score(112, 24, 3)
    P = 'A3m A3m D3m E37 A3m F3 D3m E37 ' 'C3 G3 A3m E3m F3 D3m E37 E37 ' 'A3m D3m G37 C3 F3 D3m E37 A3m'
    s.chords(pluck, P, 3, 1.0, 0, arp=[0, 2, 1]); s.chords(pluck, P, 3, 1.0, 0, arp=[0, None, None], tr=-12)
    s.line(box, 'E5:1 A5:1 B5:1 C6:2 B5:1 A5:1 F5:1 D5:1 E5:2 -:1 E5:1 A5:1 C6:1 F6:2 E6:1 D6:1 C6:1 B5:1 G#5:3 G5:1 E5:1 C5:1 D5:2 B5:1 A5:1 C6:1 E6:1 B5:3 A5:1 F5:1 C6:1 D6:1 F6:1 A6:1 G#6:2 E6:1 B5:3 C6:1 E6:1 A6:1 F6:2 D6:1 B5:1 D6:1 F6:1 E6:2 C6:1 A5:1 C6:1 F6:1 E6:1 D6:1 B5:1 G#5:1 B5:1 E6:1 A5:3', 0, 1.0, 0.15)
    s.chords(strings, P, 3, 0.3, -0.2)
    s.done('night', 2.6, 0.4)


def harpsi(f, d, v=1.0):
    t = T(max(d, 0.9)); y = np.zeros_like(t)
    for h in range(1, 14):
        if f * h > SR * 0.45: break
        y += np.sin(TAU * f * h * t) * (0.8 ** (h - 1)) * np.exp(-t * (2.6 + h * 0.5))
    return y * env(len(t), 0.001, 0.15) * v * 0.16
def m_high():
    s = Score(96, 16, 3)
    P = 'G3m D37 G3m C3m F3 Bb3 Eb3 D37 ' 'G3m C3m F37 Bb3 C3m G3m D37 G3m'
    s.chords(harpsi, P, 3, 0.9, -0.15, arp=[0, 1, 2, 3, 2, 1]); s.chords(harpsi, P, 3, 1.0, 0, arp=[0, None, None], tr=-12); s.chords(strings, P, 3, 0.3, 0.2)
    s.line(harpsi, 'D5:1 G5:1 A5:1 Bb5:1.5 A5:.5 G5:1 F#5:1 D5:1 A5:1 G5:3 Eb5:1 C5:1 G5:1 F5:1.5 Eb5:.5 C5:1 D5:1 F5:1 Bb5:1 A5:2 F5:1 G5:1 Bb5:1 Eb6:1 D6:1.5 C6:.5 Bb5:1 A5:1 F#5:1 D5:1 F#5:3 Bb5:1 A5:1 G5:1 Eb5:2 G5:1 F5:1 A5:1 C6:1 Bb5:3 Eb6:1 D6:1 C6:1 Bb5:2 G5:1 A5:1 F#5:1 D5:1 G5:3', 0, 1.1, 0.15)
    s.done('high', 1.8, 0.28)
def m_duel():
    s = Score(132, 16, 4)
    P = 'D3m D3m Bb3 A37 D3m F3 G3m A37 ' 'Bb3 F3 G3m D3m Eb3 Bb3 A37 A37'
    s.chords(pluck, P, 4, 1.1, 0, arp=[0, 0, 1, 0, 2, 0, 1, 0], tr=-12); s.chords(strings, P, 4, 0.75, 0.1)
    s.line(strings, 'A4:2 D5:2 F5:3 E5:1 D5:2 F5:2 E5:4 A5:2 F5:1 E5:1 F5:2 C5:2 Bb4:2 D5:2 C#5:4 D5:2 F5:1 Bb5:1 A5:2 C6:2 Bb5:1 A5:1 G5:2 F5:4 G5:2 Bb5:2 F5:2 D5:2 E5:1 F5:1 G5:1 E5:1 A5:4', 0, 1.3, -0.1)
    for b in range(64): (b % 2 == 0) and s.at(b, drum(60, 1, 0.8 if b % 4 == 0 else 0.5)); s.at(b + 0.5, shake(0, 0, 0.5), 0.3); (b % 4 == 3) and s.at(b + 0.5, drum(90, 1, 0.4))
    s.done('duel', 1.2, 0.2)
def m_sneak():
    s = Score(104, 16, 4)
    P = 'A3m A3m D3m E37 A3m F3 D3m E37 ' 'C3 A3m F3 D3m Bb3 F3 E37 E37'
    s.chords(pluck, P, 4, 1.1, 0, arp=[0, None, 2, None, 1, None, 2, None]); s.chords(pluck, P, 4, 1.1, 0, arp=[0, None, None, None, 2, None, None, None], tr=-12)
    s.line(reed, 'A4:.5 -:.5 C5:.5 -:.5 E5:.5 D#5:.5 E5:1 -:1 A4:.5 B4:.5 C5:1 A4:1 D5:.5 -:.5 F5:.5 -:.5 A5:.5 G#5:.5 A5:1 -:1 G#5:.5 E5:.5 B4:2', 0, 0.65, -0.2)
    s.line(box, '-:16 E6:.5 C6:.5 A5:1 -:2 F6:.5 D6:.5 A5:1 -:2 F6:1 E6:1 D6:1 B5:1 G#5:1 B5:1 E6:2 G6:.5 E6:.5 C6:1 -:2 E6:.5 C6:.5 A5:1 -:2 A5:1 C6:1 F6:2 D6:2 A5:2 Bb5:1 D6:1 F6:2 C6:2 A5:2 G#5:1 B5:1 D6:1 E6:1 -:4', 0, 0.8, 0.25)
    for b in range(64): (b % 2) and s.at(b, shake(0, 0, 0.4), 0.3)
    s.done('sneak', 2.2, 0.34)
def m_founder():
    s = Score(80, 16, 4)
    P = 'D3 G3 A3 D3 B3m G3 E3m A3sus ' 'G3 D3 A3 B3m G3 E3m A3sus D3'
    s.chords(harp, P, 4, 0.9, -0.1, arp=[0, 2, 1, 3, 2, 4, 3, 1]); s.chords(strings, P, 4, 0.5, 0.15)
    s.line(flute, 'D5:1 F#5:1 A5:2 B5:1.5 A5:.5 G5:2 E5:1 A5:1 C#6:2 D6:4 B5:2 A5:1 F#5:1 G5:2 B5:2 E5:1 F#5:1 G5:2 A5:4 B5:2 D6:2 A5:3 F#5:1 E5:2 C#5:2 D5:2 B4:2 G5:2 B5:1 A5:1 G5:2 E5:2 F#5:2 E5:2 D5:4', 0, 0.85, 0.15)
    for b in range(0, 64, 8): s.at(b, bell(hz(midi('D5')), 4, 0.25), -0.3)
    s.done('founder', 2.8, 0.38)


# Chapter Two. One little call of five notes (D F# A, G, E) goes through the roofs, the chase and the staff.
def m_bucket():
    s = Score(126, 16, 4)
    P = 'G3 G3 C3 D37 G3 E3m A3m D37 ' 'C3 G3 A3m E3m C3 G3 D3sus D37'
    s.chords(pluck, P, 4, 1.1, -0.1, arp=[0, None, 2, 1, None, 2, 1, None]); s.chords(pluck, P, 4, 1.1, 0, arp=[0, None, 2, None], tr=-12)
    s.line(reed, 'D5:.5 B4:.5 G4:1 -:.5 D5:.5 E5:.5 D5:.5 B4:1 G4:1 -:2 E5:.5 C5:.5 G4:1 C5:1 E5:1 F#5:1 D5:1 A4:2 D5:.5 B4:.5 G4:1 -:.5 D5:.5 G5:.5 F#5:.5 E5:1 B4:1 -:2 C5:.5 E5:.5 A5:1 G5:.5 E5:.5 C5:1 D5:1 F#5:1 A5:1 -:1', 0, 0.75, -0.2)
    s.line(box, 'E6:1 C6:1 G5:2 D6:1 B5:1 G5:2 C6:1 A5:1 E5:2 B5:1 G5:1 E5:2 E6:.5 D6:.5 C6:1 G5:2 D6:.5 C6:.5 B5:1 G5:2 A5:1 B5:1 C6:1 D6:1 F#6:1 D6:1 A5:1 -:1', 32, 0.85, 0.25)
    for b in range(64): (b % 2) and s.at(b, shake(0, 0, 0.7), 0.3); (b % 4 == 0) and s.at(b, drum(84, 1, 0.5)); (b % 8 == 7) and s.at(b + 0.5, drum(120, 1, 0.3))
    s.done('bucket', 1.2, 0.2)
def m_wits():
    s = Score(112, 16, 3)
    P = 'C3m C3m G37 G37 C3m F3m D3dim G37 ' 'Ab3 Eb3 F3m C3m Ab3 F3m G37 C3m'
    s.chords(harpsi, P, 3, 0.8, -0.2, arp=[None, 1, 2]); s.chords(pluck, P, 3, 1.1, 0, arp=[0, None, None], tr=-12)
    s.line(reed, 'G4:.5 F#4:.5 G4:1 C5:1 Eb5:1.5 D5:.5 C5:1 B4:.5 A#4:.5 B4:1 D5:1 G4:3 G4:.5 F#4:.5 G4:1 C5:1 F5:1.5 Eb5:.5 D5:1 D5:1 Ab4:1 F4:1 G4:3', 0, 0.75, -0.1)
    s.line(harpsi, 'Eb6:1 C6:1 Ab5:1 Bb5:1 G5:1 Eb5:1 Ab5:.5 G5:.5 F5:1 C5:1 Eb5:3 C6:1 Bb5:.5 Ab5:.5 Eb5:1 F5:.5 Ab5:.5 C6:1 Ab5:1 B5:1 D6:1 F6:1 C6:3', 24, 1.1, 0.2)
    s.done('wits', 1.3, 0.22)
def m_low():
    s = Score(56, 16, 3)
    P = 'E3m C3M7 G3 D3sus E3m C3M7 A3m7 B3sus ' 'C3M7 G3 A3m7 E3m C3M7 A3m7 B3sus E3m'
    s.chords(strings, P, 3, 0.75, -0.1); s.chords(harp, P, 3, 0.6, 0.15, arp=[0, 1, 2, None, 2, 1])
    s.line(box, 'B5:2 G5:1 E5:3 D5:2 G5:1 A5:3 B5:2 G5:1 E5:3 C6:2 B5:1 F#5:3', 0, 0.8, 0.2)
    s.line(flute, 'E5:2 G5:1 D5:3 C5:2 E5:1 B4:3 E5:2 G5:1 A5:2 C6:1 B5:2 F#5:1 E5:3', 24, 0.7, -0.15)
    s.done('low', 3.0, 0.42)
def m_roofs():
    s = Score(88, 16, 4)
    P = 'B3m G3M7 D3 A3 B3m G3M7 E3m F#37 ' 'G3M7 A3 B3m F#3m G3M7 E3m A3sus A3'
    s.chords(box, P, 4, 0.75, 0.15, arp=[0, 2, 1, 3, 2, 4, 3, 5], tr=24); s.chords(strings, P, 4, 0.6, -0.15); s.chords(pluck, P, 4, 0.9, 0, arp=[0, None, None, 0], tr=-12)
    s.line(flute, '-:8 D5:.5 F#5:.5 A5:1 G5:1 E5:1 -:4 -:8 -:4 C#5:2 F#5:2', 0, 0.7, 0.1)
    s.line(flute, 'D5:.5 F#5:.5 A5:2 G5:1 E5:3 -:1 F#5:.5 A5:.5 B5:2 A5:1 F#5:3 -:1 D5:.5 F#5:.5 A5:2 G5:1 B5:3 A5:1 G5:1 F#5:1 E5:2 E5:4', 32, 0.9, 0.1)
    for b in range(0, 64, 8): s.at(b, bell(hz(midi('F#5')), 4, 0.18), 0.35)
    s.done('roofs', 3.0, 0.42)
def m_chase():
    s = Score(164, 16, 4)
    P = 'D3 D3 G3 A37 D3 B3m E3m A37 ' 'G3 D3 E3m B3m G3 D3 A3sus A37'
    s.chords(pluck, P, 4, 1.1, -0.1, arp=[0, 1, 2, 1, 0, 1, 2, 1]); s.chords(pluck, P, 4, 1.3, 0, arp=[0, None, 2, None], tr=-12)
    s.line(reed, 'D5:.5 F#5:.5 A5:1 G5:.5 F#5:.5 E5:1 D5:.5 E5:.5 F#5:.5 D5:.5 A4:2 B4:.5 D5:.5 G5:1 F#5:.5 E5:.5 D5:1 C#5:.5 E5:.5 A5:.5 G5:.5 F#5:1 E5:1 D5:.5 F#5:.5 A5:1 G5:.5 F#5:.5 E5:1 D5:.5 F#5:.5 B5:1 A5:.5 F#5:.5 D5:1 E5:.5 G5:.5 B5:.5 G5:.5 E5:1 D5:1 C#5:.5 E5:.5 G5:.5 A5:.5 E5:2', 0, 0.9, -0.2)
    s.line(box, 'B5:.5 D6:.5 G6:1 B5:.5 D6:.5 G6:1 A5:.5 D6:.5 F#6:1 A5:.5 D6:.5 F#6:1 G5:.5 B5:.5 E6:1 G5:.5 B5:.5 E6:1 F#5:.5 B5:.5 D6:1 F#5:.5 B5:.5 D6:1 B5:1 G5:.5 B5:.5 D6:2 A5:1 F#5:.5 A5:.5 D6:2 D6:.5 C#6:.5 D6:.5 E6:.5 D6:.5 C#6:.5 B5:.5 A5:.5 C#6:.5 E6:.5 G6:1 A6:2', 32, 0.9, 0.2)
    for b in range(64): s.at(b, drum(78, 1, 0.6 if b % 2 == 0 else 0.3)); s.at(b + 0.5, shake(0, 0, 0.8), 0.3); (b % 8 == 7) and s.at(b + 0.75, drum(140, 1, 0.4))
    s.done('chase', 1.0, 0.18)
def m_staff():
    s = Score(72, 16, 4)
    P = 'D3add9 A3 B3m G3M7 D3 F#3m G3 A3sus ' 'B3m G3 D3 A3 G3 E3m A3sus D3add9'
    s.chords(strings, P, 4, 1.2, -0.15); s.chords(strings, P, 4, 0.8, 0.2, tr=12); s.chords(harp, P, 4, 1.0, 0, arp=[0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 3, 4, 5, 4, 3])
    M = 'D5:.5 F#5:.5 A5:2 G5:1 E5:3 A5:1 B5:.5 D6:.5 F#6:2 E6:1 D6:2 B5:2 A5:2 D6:1 F#6:1 E6:2 C#6:2 B5:2 G5:1 B5:1 A5:4 D5:.5 F#5:.5 B5:2 A5:1 G5:3 B5:1 D6:.5 E6:.5 F#6:2 D6:1 E6:4 G6:2 F#6:1 E6:1 E6:2 B5:2 D6:2 C#6:2 D6:4'
    s.line(strings, M, 0, 1.3, 0.1); s.line(flute, M, 0, 0.7, -0.1)
    for b in range(0, 64, 4): s.at(b, drum(48, 1, 0.7)); (b % 8 == 0) and s.at(b, bell(hz(midi('D5')), 4, 0.4), -0.3); (b % 8 == 4) and s.at(b, bell(hz(midi('A5')), 4, 0.25), 0.3)
    s.done('staff', 3.2, 0.44)


# ============================================================ the air ==
def loopn(y, x=2.0):
    k = int(x * SR); f = np.linspace(0, 1, k); y = y.copy(); y[:k] = y[:k] * f + y[-k:] * (1 - f); return y[:-k]
def wind(d, lo, hi, depth=0.6, rate=0.11):
    t = T(d); return bp(noise(d), lo, hi) * (1 - depth + depth * (0.5 + 0.5 * np.sin(TAU * rate * t)) * (0.6 + 0.4 * np.sin(TAU * rate * 2.7 * t + 1)))
def birds(d, n, lo=2200, hi=4600, v=0.3):
    y = np.zeros(int(d * SR))
    for _ in range(n):
        p = rng.uniform(0, d - 1.4); f0 = rng.uniform(lo, hi)
        for k in range(rng.integers(2, 6)):
            t = T(rng.uniform(0.05, 0.12)); c = np.sin(TAU * (f0 * t + rng.uniform(-4000, 5000) * t * t)) * np.hanning(len(t)) * v * rng.uniform(0.3, 1); i = int((p + k * rng.uniform(0.1, 0.16)) * SR); y[i:i + len(c)] += c[:max(0, len(y) - i)]
    return y
def crickets(d):
    t = T(d); return sum(np.sin(TAU * f * t) * (np.sin(TAU * r * t) > 0.2) * (0.5 + 0.5 * np.sin(TAU * q * t)) ** 3 * a for f, r, q, a in ((4300, 17, 0.9, 0.05), (4750, 21, 0.63, 0.035), (3900, 14, 0.47, 0.03)))
def murmur(d, v=0.05):
    y = np.zeros(int(d * SR))
    for k in range(9):
        t = T(d); f = rng.uniform(260, 900); y += bp(noise(d), f * 0.8, f * 1.3) * np.clip(np.sin(TAU * rng.uniform(1.6, 3.4) * t + rng.uniform(0, 6)), 0, 1) * np.clip(np.sin(TAU * rng.uniform(0.08, 0.2) * t + k), 0, 1)
    return y * v
def a_farm(): d = 26; save('amb_farm', loopn(wind(d, 120, 700) * 0.35 + birds(d, 26)), 0.5)
def a_town(): d = 24; save('amb_town', loopn(wind(d, 120, 600) * 0.25 + birds(d, 8, v=0.16) + murmur(d, 0.6)), 0.5)
def a_school(): d = 26; save('amb_school', loopn(wind(d, 140, 800) * 0.3 + birds(d, 16, v=0.22) + murmur(d, 0.32)), 0.5)
def a_night(): d = 22; save('amb_night', loopn(wind(d, 90, 500) * 0.3 + crickets(d) * 3), 0.45)
def a_rain():
    d = 18; y = bp(noise(d), 900, 7000) * 0.4 + wind(d, 80, 400) * 0.4
    for _ in range(260): i = rng.integers(0, len(y) - 900); n = 500; y[i:i + n] += np.sin(TAU * rng.uniform(900, 2600) * np.arange(n) / SR) * np.exp(-np.arange(n) / 90) * rng.uniform(0.1, 0.5)
    save('amb_rain', loopn(y), 0.4)
def a_room():
    d = 20; y = wind(d, 60, 260) * 0.25
    for _ in range(90):
        i = rng.integers(0, len(y) - 2000); n = rng.integers(60, 500); y[i:i + n] += noise(n / SR)[:n] * np.exp(-np.arange(n) / (n / 5)) * rng.uniform(0.1, 0.7)
    save('amb_room', loopn(y), 0.45)


# ============================================================== effects ==
def S(name, y, room=0.0, gain=0.8): save(name, verb(y, room, 0.3) if room else y, gain)
def sweep(d, f0, f1, curve=1.0): t = T(d); u = (t / d) ** curve; return np.sin(TAU * np.cumsum(f0 * (f1 / f0) ** u) / SR)
def effects():
    for k in range(3):
        t = T(0.16); S('step%d' % k, (bp(noise(0.16), 250 + k * 60, 1900) * np.exp(-t * 38) + np.sin(TAU * 90 * t) * np.exp(-t * 60)) * env(len(t), 0.002, 0.05), gain=0.22)
        S('step_in%d' % k, (bp(noise(0.16), 180, 1100 + k * 120) * np.exp(-t * 42) + np.sin(TAU * (150 + k * 12) * t) * np.exp(-t * 50) * 0.9) * env(len(t), 0.001, 0.05), 0.5, 0.26)
    # voices: a short vowel, per kind of speaker
    for nm, f in (('boy', 235), ('girl', 320), ('child', 420), ('woman', 265), ('man', 130), ('old', 165)):
        for k in range(4):
            d = 0.085; t = T(d); f0 = f * (1 + [0, 0.07, -0.05, 0.12][k]); ph = TAU * f0 * t * (1 + 0.04 * t / d)
            v = [(730, 1090), (530, 1840), (570, 840), (440, 1020)][k]
            y = sum(np.sin(ph * h) * (np.exp(-((f0 * h - v[0]) / 170) ** 2) + 0.55 * np.exp(-((f0 * h - v[1]) / 220) ** 2) + 0.05) for h in range(1, 18) if f0 * h < 5000)
            S('voice_%s%d' % (nm, k), y * np.hanning(len(t)) ** 0.7, gain=0.3)
    t = T(0.5); creak = sum(np.sin(TAU * np.cumsum(f * (1 + 0.5 * t)) / SR) * (np.sin(TAU * 23 * t * (1 + t)) > 0.4) for f in (240, 410, 690)); S('door', creak * 0.3 * env(len(t), 0.05, 0.2) + bp(noise(0.5), 150, 900) * np.exp(-t * 14), 0.8, 0.35)
    t = T(0.3); S('door_shut', np.sin(TAU * 85 * t) * np.exp(-t * 22) + bp(noise(0.3), 120, 1400) * np.exp(-t * 34), 0.9, 0.4)
    b = np.zeros(int(8.5 * SR))
    for k, (f, at) in enumerate(((196, 0), (196, 1.5), (247, 3.0))): y = bell(f, 5.5, 1.0); i = int(at * SR); b[i:i + len(y)] += y[: len(b) - i]
    for k in range(34): y = box(hz(86 + [0, 4, 7, 11, 14][k % 5]), 1, 0.12 * (1 - k / 40)); i = int((0.2 + k * 0.17) * SR); n = min(len(y), len(b) - i); b[i:i + n] += y[:n]      # the light in it
    S('bell', b, 3.2, 0.75)
    c = np.zeros(int(2.4 * SR))
    for k, m in enumerate((76, 80, 83, 88)): y = box(hz(m), 1, 0.8); i = int(k * 0.09 * SR); n = min(len(y), len(c) - i); c[i:i + n] += y[:n]
    S('chime', c, 2.2, 0.5)
    S('obj', np.concatenate([box(hz(79), 1, 1)[: int(0.1 * SR)], box(hz(84), 1, 1)]), 1.2, 0.28)
    S('rune', box(hz(88), 1, 1)[: int(0.5 * SR)] + harp(hz(76), 0.5)[: int(0.5 * SR)], 1.0, 0.38); t = T(0.25); S('rune_bad', (np.sin(TAU * 130 * t) + np.sin(TAU * 138 * t)) * np.exp(-t * 14), gain=0.35)
    t = T(0.05); S('tick', np.sin(TAU * 1300 * t) * np.exp(-t * 90), gain=0.2); S('pick', pluck(hz(81), 0.4), 0.8, 0.32)
    y = np.concatenate([sweep(0.16, 520, 760), np.zeros(800), sweep(0.14, 700, 820), np.zeros(800), sweep(0.2, 780, 1150), sweep(0.55, 1150, 640)]); t = np.arange(len(y)) / SR
    S('rooster', (y + 0.5 * np.sign(y) * np.abs(y) ** 0.5) * (1 + 0.4 * np.sin(TAU * 34 * t)) * env(len(y), 0.03, 0.2), 1.6, 0.3)
    t = T(0.9); S('fizz', bp(noise(0.9), 2500, 9000) * np.exp(-t * 5) * (0.5 + 0.5 * np.sin(TAU * 31 * t)), gain=0.3)
    t = T(0.8); S('poof', lp(noise(0.8), 900) * np.exp(-t * 8) + np.sin(TAU * 70 * t) * np.exp(-t * 12), 1.0, 0.55); S('puff', bp(noise(0.5), 400, 2600) * np.exp(-T(0.5) * 11), 0.8, 0.35)
    t = T(0.9); S('whoosh', bp(noise(0.9), 300, 3200) * np.sin(np.pi * t / 0.9) ** 2, 0.8, 0.5)
    t = T(0.7); S('ignite', bp(noise(0.7), 500, 4200) * np.exp(-((t - 0.12) / 0.14) ** 2) + lp(noise(0.7), 600) * np.exp(-t * 6) * 0.6, 0.6, 0.35); S('spark', sum(np.roll(box(hz(m), 1, 0.6)[: int(1.2 * SR)], int(k * 0.05 * SR)) for k, m in enumerate((84, 88, 91, 96))), 1.4, 0.4)
    t = T(0.25); S('clunk', np.sin(TAU * 310 * t) * np.exp(-t * 40) + np.sin(TAU * 180 * t) * np.exp(-t * 30) + bp(noise(0.25), 300, 2500) * np.exp(-t * 60), 0.5, 0.4); S('bounce', sweep(0.18, 700, 260) * np.exp(-T(0.18) * 14), 0.6, 0.4); S('catch', bp(noise(0.12), 400, 2400) * np.exp(-T(0.12) * 50), 0.4, 0.45)
    for k in range(2): t = T(0.35); S('grain%d' % k, bp(noise(0.35), 3000, 9000) * np.exp(-t * 9) * (rng.random(len(t)) > 0.6), gain=0.3)
    for k in range(3): y = sweep(0.07, 620 + k * 50, 900) * np.hanning(int(0.07 * SR)); S('cluck%d' % k, np.concatenate([y, np.zeros(1800), y * 0.8, np.zeros(1500), sweep(0.16, 700, 1150 + k * 60) * np.hanning(int(0.16 * SR))]), gain=0.3)
    y = np.zeros(int(2.4 * SR))
    for k in range(9): c = creak[: int(0.22 * SR)] * np.hanning(int(0.22 * SR)); i = int(k * 0.25 * SR); y[i:i + len(c)] += c
    S('well', y, 0.6, 0.22)
    t = T(0.8); S('splash', bp(noise(0.8), 500, 5200) * np.exp(-t * 7) + sweep(0.8, 900, 300) * np.exp(-t * 16) * 0.5, 0.6, 0.4)
    y = np.zeros(int(1.5 * SR))
    for k in range(14): n = int(0.05 * SR); i = int(k * 0.1 * SR); y[i:i + n] += bp(noise(0.05), 900, 5000) * np.hanning(n) * (1 - k / 18)
    S('flutter', y, 0.6, 0.32)
    S('paper', np.concatenate([bp(noise(0.12), 1500, 8000) * np.hanning(int(0.12 * SR)) * a for a in (0.6, 1, 0.5, 0.9)]), gain=0.3); S('card', bp(noise(0.09), 2000, 9000) * np.exp(-T(0.09) * 40), 0.4, 0.4)
    y = np.zeros(int(3.0 * SR))
    for k in range(12): t = T(0.12); c = np.sin(TAU * (160 + (k % 2) * 30) * t) * np.exp(-t * 45) + bp(noise(0.12), 300, 1500) * np.exp(-t * 60); i = int((k * 0.24 + (k % 2) * 0.03) * SR); y[i:i + len(c)] += c * (1 - k / 18)
    S('hooves', y, 0.6, 0.4)
    t = T(2.6); S('gate', sum(np.sin(TAU * np.cumsum(f * (1 + 0.12 * np.sin(t * 2.2))) / SR) * (0.4 + 0.6 * (np.sin(TAU * 19 * t * (1 + 0.1 * t)) > 0)) for f in (310, 466, 733)) * 0.2 * env(len(t), 0.3, 0.8) + bp(noise(2.6), 120, 700) * 0.25 * env(len(t), 0.2, 1.0), 1.6, 0.35)
    y = np.zeros(int(2.6 * SR))
    for p in range(7):
        f = [180, 240, 300, 330, 210, 280, 380][p]; st = rng.uniform(0, 0.5)
        for k in range(rng.integers(5, 9)): d = 0.1; t = T(d); ph = TAU * f * (1 - 0.02 * k) * t; c = sum(np.sin(ph * h) * np.exp(-((f * h - 750) / 320) ** 2) for h in range(1, 12)) * np.hanning(len(t)); i = int((st + k * (0.17 + p * 0.005)) * SR); n = min(len(c), len(y) - i); y[i:i + n] += c[:n] * (1 - k / 12)
    S('laugh', y, 1.0, 0.45)
    t = T(1.8); S('hum', sum(np.sin(TAU * f * t * (1 + 0.003 * np.sin(TAU * 5 * t))) * a for f, a in ((196, 1), (392, 0.4), (588, 0.15))) * env(len(t), 0.2, 0.5), 0.8, 0.35); S('bite', bp(noise(0.14), 700, 5000) * np.exp(-T(0.14) * 40) + sweep(0.14, 500, 120) * np.exp(-T(0.14) * 20), 0.3, 0.5)
    t = T(0.6); cn = sum(np.sin(TAU * f * t) * np.exp(-t * k) for f, k in ((2850, 9), (4320, 12), (6100, 16))); S('coin', cn, 0.6, 0.28)
    y = np.zeros(int(1.4 * SR))
    for k in range(11): i = int(rng.uniform(0, 0.7) * SR); y[i:i + len(cn)] += cn[: len(y) - i] * rng.uniform(0.3, 1)
    S('coins', y, 0.6, 0.35)
    t = T(0.7); f = 520 + 340 * np.sin(np.pi * t / 0.7) - 160 * t; ph = TAU * np.cumsum(f) / SR; S('meow', sum(np.sin(ph * h) / h for h in range(1, 7)) * np.sin(np.pi * t / 0.7) ** 0.8, 1.0, 0.3)

    # Chapter One
    S('ting', box(hz(93), 1, 1) * 0.9 + box(hz(81), 1, 0.4), 1.6, 0.34)
    t = T(0.8); S('gust', bp(noise(0.8), 250, 2400) * np.sin(np.pi * t / 0.8) ** 1.5 * (0.7 + 0.3 * np.sin(TAU * 9 * t)), 0.5, 0.45)
    t = T(0.6); S('wick_out', bp(noise(0.6), 1800, 8000) * np.exp(-t * 9) * 0.7 + np.sin(TAU * 420 * t * (1 - 0.4 * t)) * np.exp(-t * 16) * 0.3, 0.6, 0.34)
    y = np.zeros(int(1.4 * SR))
    for p in range(9):
        f = [190, 240, 300, 340, 210, 280, 390, 260, 320][p]; d = rng.uniform(0.35, 0.6); t = T(d); ph = TAU * f * (1 + 0.25 * t / d) * t
        c2 = (sum(np.sin(ph * h) * np.exp(-((f * h - 700) / 330) ** 2) for h in range(1, 10)) * 0.35 + bp(rng.standard_normal(len(t)), 900, 4200) * 0.7) * np.sin(np.pi * t / d) ** 0.8; i = int(rng.uniform(0, 0.18) * SR); n = min(len(c2), len(y) - i); y[i:i + n] += c2[:n]
    S('gasp', y, 1.0, 0.4)
    y = np.zeros(int(3.4 * SR))
    for p in range(16):
        f = rng.uniform(190, 430); d = rng.uniform(0.9, 1.8); t = T(d); ph = TAU * np.cumsum(f * (1 + 0.18 * np.sin(np.pi * t / d) + 0.02 * np.sin(TAU * 6 * t))) / SR
        c2 = sum(np.sin(ph * h) * (np.exp(-((f * h - 850) / 350) ** 2) + 0.2 * np.exp(-((f * h - 1400) / 400) ** 2)) for h in range(1, 12)) * np.sin(np.pi * t / d) ** 0.5; i = int(rng.uniform(0, 1.3) * SR); n = min(len(c2), len(y) - i); y[i:i + n] += c2[:n]
    for _ in range(120): i = rng.integers(0, len(y) - 1500); n = 700; y[i:i + n] += bp(rng.standard_normal(n), 900, 4000)[:n] * np.exp(-np.arange(n) / 110) * rng.uniform(0.3, 1.0)
    S('cheer', y, 1.2, 0.5)


def effects2():                                                                                   # Chapter Two
    def put(y, at, x): i = int(at * SR); n = min(len(x), len(y) - i); y[i:i + n] += x[:n]
    for k in range(3):
        d = 0.2; t = T(d); f = [980, 1180, 860][k]; S('clack%d' % k, sum(np.sin(TAU * f * r * t) * np.exp(-t * q) for r, q in ((1, 46), (2.7, 70), (4.9, 95))) * 0.6 + bp(noise(d), 1500, 6000) * np.exp(-t * 120) * 0.6, 0.35, 0.4)
    for k in range(3):                                                                            # a wand's say: two or three quick bent notes
        y = np.zeros(int(0.6 * SR))
        for j in range(2 + k % 2):
            d = 0.12; f0 = [1250, 1480, 1100][k] * (1 + 0.2 * j); t = T(d); put(y, j * 0.12, (sweep(d, f0, f0 * [1.35, 1.2, 0.8][(k + j) % 3]) + 0.25 * sweep(d, f0 * 2, f0 * 2.7)) * np.sin(np.pi * t / d) ** 0.7)
        S('chirp%d' % k, y, 0.8, 0.3)
    y = np.zeros(int(1.5 * SR))
    for _ in range(70): d = 0.05; t = T(d); put(y, rng.uniform(0, 1.15), np.sin(TAU * rng.uniform(600, 1300) * t) * np.exp(-t * 90) * rng.uniform(0.1, 0.5))
    t = T(1.5); S('roll', y + bp(noise(1.5), 200, 900) * np.sin(np.pi * np.minimum(1, t / 1.5)) ** 0.6 * 0.5, 0.4, 0.4)
    y = np.zeros(int(2.6 * SR))
    for _ in range(190): d = 0.11; t = T(d); f = rng.uniform(700, 1500); put(y, min(2.4, rng.gamma(2.2, 0.38)), (np.sin(TAU * f * t) + 0.5 * np.sin(TAU * f * 2.7 * t)) * np.exp(-t * 60) * rng.uniform(0.15, 0.8))
    S('spill', y, 0.6, 0.6)
    t = T(0.5); S('thump', (sweep(0.5, 150, 48) * np.exp(-t * 11) + bp(noise(0.5), 120, 900) * np.exp(-t * 26) * 0.7), 0.4, 0.75)
    y = np.zeros(int(0.8 * SR))
    for k in range(3): d = 0.2; t = T(d); put(y, k * 0.17, np.sin(TAU * 210 * t) * np.exp(-t * 34) + bp(noise(d), 300, 1600) * np.exp(-t * 60) * 0.5)
    S('knock', y, 0.4, 0.55)
    y = np.zeros(int(0.9 * SR))
    for k in range(4): d = 0.15; t = T(d); put(y, k * 0.19, bp(noise(d), 2200, 7000) * np.sin(np.pi * t / d) ** 0.5 * rng.uniform(0.4, 0.9))
    S('chalk', y, 0.3, 0.3)
    y = np.zeros(int(1.4 * SR))
    for k, m in enumerate((74, 78, 81, 86)): put(y, k * 0.09, box(hz(m), 1.0, 0.7))
    S('bond', y, 1.4, 0.34)
    d = 3.4; t = T(d); y = sweep(d, 70, 420, 1.6) * np.minimum(1, t / 0.9) * np.exp(-np.maximum(0, t - 1.0) * 2.2) * 0.5 + bp(noise(d), 600, 6000) * np.minimum(1, t / 1.0) ** 2 * np.exp(-np.maximum(0, t - 1.0) * 2.6) * 0.5
    for k, m in enumerate((62, 69, 74, 78, 81, 86, 90)): put(y, 0.95 + k * 0.05, bell(hz(m), 2.2, 0.5))
    S('transform', y, 2.4, 0.75)
    d = 1.8; t = T(d); y = sweep(d, 220, 880, 1.4) * np.minimum(1, t / 0.5) * np.exp(-np.maximum(0, t - 0.55) * 5) * 0.4 + bp(noise(d), 1200, 7000) * np.minimum(1, t / 0.55) ** 2 * np.exp(-np.maximum(0, t - 0.55) * 5) * 0.4
    for k, m in enumerate((74, 81, 86, 93)): put(y, 0.55 + k * 0.06, box(hz(m), 1.0, 0.8))
    S('become', y, 1.8, 0.5)


if __name__ == '__main__':
    only = sys.argv[1:]
    jobs = [m_dawn, m_letter, m_road, m_town, m_academy, m_school, m_lesson, m_evening, m_wonder, m_night, m_high, m_duel, m_sneak, m_founder, m_bucket, m_wits, m_low, m_roofs, m_chase, m_staff, a_farm, a_town, a_school, a_night, a_rain, a_room, effects, effects2]
    for j in jobs:
        if only and j.__name__ not in only: continue
        j(); print(j.__name__)
