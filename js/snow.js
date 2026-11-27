/* ============================================================================
   snow.js -- Chapter Three's far country: the Drowse, a range of white mountains
   people say is a dragon lying asleep under the snow. A tourists' trail with its
   flag poles and standing stones, the mouth of a cave; the cave itself and the
   great drop beneath it (far off at x 300 and 400, and forty metres up, so there's
   nothing under their floors but dark); the open snow above, with a hole in it.
   ========================================================================== */
(function () {
  'use strict';
  const H = VX.hash3, TAU = Math.PI * 2, HP = Math.PI / 2, R = Math.round, K = TOWN_KIT, T = window.THINGS;
  const S1 = 0.024, SB = 0.048, CB = 0.096, WB = 0.192;
  const mul = (c, k) => { const f = s => Math.max(0, Math.min(255, Math.round(((c >> s) & 255) * k))); return (f(16) << 16) | (f(8) << 8) | f(0); };
  const G = () => { const g = new VX.Grid(); g.jit = 0; g.merge = true; return g; };
  const SN = [0xf2f6fc, 0xe6edf8, 0xd8e2f2], RK = [0x6c7488, 0x5c6478, 0x7c869a, 0x525a6e], ICE = [0x9cc8e8, 0xb8dcf4, 0x7cb0dc];
  const snow = (x, y, z) => { const n = H(x, y, z); return n < 0.2 ? SN[1] : n < 0.26 ? SN[2] : SN[0]; };
  const rock = (x, y, z) => { const n = H(x >> 1, y >> 1, z >> 1); return n < 0.3 ? RK[1] : n < 0.5 ? RK[2] : n < 0.62 ? RK[3] : RK[0]; };
  const ice = (x, y, z) => { const n = H(x >> 1, y >> 2, z >> 1); return n < 0.4 ? ICE[0] : n < 0.7 ? ICE[1] : ICE[2]; };

  /* a length of cliff (19 cm voxels), 42 along x, its face to +z: ledges, cracks, snow on whatever's flat */
  function cliff(seed, hi) {
    const g = G(), face = [];
    for (let x = 0; x < 42; x++) for (let y = 0; y < hi; y++) { const e = Math.min(1, (Math.min(x, 41 - x) + 1) / 7), f = R(5 + e * (3.2 * Math.sin(x * 0.3 + seed) + 2.6 * Math.sin(y * 0.22 + x * 0.1 + seed * 2) + (H(x >> 2, y >> 2, seed) - 0.5) * 4) - y * 0.16); face[x * 200 + y] = Math.max(-10, f); }
    const top = x => hi - R(6 + 5 * Math.sin(x * 0.2 + seed) + H(x >> 2, 3, seed) * 4);
    for (let x = 0; x < 42; x++) { const t = top(x); for (let y = 0; y <= t; y++) { const f = face[x * 200 + y], up = y < t ? face[x * 200 + y + 1] : -99; for (let z = Math.max(-12, f - 2); z <= f; z++) g.set(x, y, z, z > up ? snow(x, y, z) : rock(x, y, z)); if (up < f) for (let z = Math.max(-12, up); z <= f; z++) g.set(x, y, z, snow(x, y, z)); } for (let z = -12; z <= face[x * 200 + t]; z++) { g.set(x, t, z, snow(x, t, z)); if (H(x, 5, z) < 0.5) g.set(x, t + 1, z, snow(x, t + 1, z)); } }
    return g;
  }
  function crag(seed) {                                    // a shoulder of rock (19 cm), 3.4 m through at the foot, for the corners
    const g = G(), hi = 46 + (seed * 7) % 9, rad = (a, y) => 8.6 - y * 0.12 + 1.1 * Math.sin(a * 3 + seed + y * 0.13) + (H(R(a * 4), y >> 2, seed) - 0.5) * 2.2, inn = (x, y, z) => y <= hi && Math.hypot(x, z) <= rad(Math.atan2(z, x), y);
    for (let y = 0; y <= hi; y++) for (let x = -11; x <= 11; x++) for (let z = -11; z <= 11; z++) { if (!inn(x, y, z)) continue; const up = !inn(x, y + 1, z); if (!up && Math.hypot(x, z) < rad(Math.atan2(z, x), y) - 2.6) continue; g.set(x, y, z, up ? snow(x, y, z) : rock(x, y, z)); }
    return g;
  }
  function bank(seed) {                                    // a bank of snow (9.6 cm), 3 m along x
    const g = G(); for (let x = -18; x <= 18; x++) for (let z = -9; z <= 9; z++) { const h = R((9 + 3 * Math.sin(x * 0.3 + seed) + H(x >> 1, seed, z >> 1) * 2) * Math.max(0, 1 - (z / 9.5) ** 2) * Math.min(1, (19 - Math.abs(x)) / 5)); for (let y = Math.max(0, h - 2); y < h; y++) g.set(x, y, z, snow(x, y, z)); } return g;
  }
  function standing(seed) {                                // a standing stone, 2.6 m, rimed on one side: a person can get in the lee of it
    const g = G(); for (let y = 0; y < 27; y++) { const w = 7 - y * 0.09 + Math.sin(y * 0.5 + seed) * 0.6, d = 3.4 - y * 0.03; for (let x = -9; x <= 9; x++) for (let z = -5; z <= 5; z++) if (Math.abs(x + Math.sin(seed) * y * 0.06) < w && Math.abs(z) < d && !(y > 23 && Math.abs(x) > 4 - (seed % 2))) g.set(x, y, z, z < -d + 1.4 && H(x, y, seed) < 0.7 ? snow(x, y, z) : y < 5 && H(x, y, 2) < 0.6 ? snow(x, y, z) : (seed + y) % 9 === 4 && z > d - 1.2 && Math.abs(x) < 4 ? 0x3e4658 : rock(x, y, z)); } g.disc(0, 0, 5, 27, 27, (x, y, z) => Math.abs(z) < 3 ? snow(x, y, z) : -1); return g;
  }
  function pine(seed) {                                    // a fir under snow (9.6 cm)
    const g = G(); g.box(-1, 0, -1, 1, 12, 1, 0x4a3626); for (let k = 0; k < 6; k++) { const y0 = 8 + k * 9, r = 17 - k * 2.5; for (let y = 0; y < 10; y++) { const q = r * (1 - y / 11); g.disc(0, 0, q, y0 + y, y0 + y, (x, yy, z) => { const d = Math.hypot(x, z); if (d < q - 3.2) return -1; return (y > 5 || H(x, yy, z) < 0.3) && d > q - 2.4 ? snow(x, yy, z) : H(x >> 1, yy, z >> 1) < 0.5 ? 0x2c5a48 : 0x35684f; }); } } return g;
  }
  function pole() { const g = G(); g.box(-1, 0, -1, 1, 92, 1, (x, y) => y % 20 < 4 ? 0xd84a3a : 0x8a6a44); g.box(2, 72, 0, 20, 86, 0, (x, y) => x > 14 && Math.abs(y - 79) < (x - 14) * 1.2 ? -1 : (x >> 2) & 1 ? 0xd84a3a : 0xc03a2c); g.disc(0, 0, 3, 0, 4, 0xf2f6fc); return g; }
  function tourSign() { const g = G(), P2 = 0xa8743e, D = 0x5e4026; for (const s of [-1, 1]) g.box(s * 28, 0, -1, s * 28 + 2, 70, 1, D); g.box(-34, 36, 2, 36, 74, 4, (x, y) => Math.abs(x - 1) > 32 || y < 39 || y > 71 ? D : P2); g.box(-36, 75, -2, 38, 78, 6, (x, y, z) => snow(x, y, z)); const W2 = 0xf6ead0, Gr = 0x2f7a4a; for (let x = -26; x < 28; x++) { if (x % 6 < 4) { g.set(x, 64, 5, W2); g.set(x, 63, 5, W2); } if (x > -20 && x < 22 && x % 5 < 3) g.set(x, 57, 5, W2); } for (let k = 0; k < 30; k++) { const a = k / 30 * Math.PI; g.set(R(-14 + k), R(44 + Math.sin(a * 3) * 4 + Math.sin(a) * 4), 5, Gr); g.set(R(-14 + k), R(45 + Math.sin(a * 3) * 4 + Math.sin(a) * 4), 5, Gr); } g.box(17, 47, 5, 21, 50, 5, Gr); g.set(20, 49, 5, 0xf0d04a); return g; }
  function hut() {                                         // the trail's hut: logs, a deep roof of snow, a lit window, a bench
    const g = G(); g.box(-40, 0, -30, 40, 44, 30, (x, y, z) => { const e = Math.abs(x) === 40 || Math.abs(z) === 30; if (!e) return -1; const door = z === 30 && Math.abs(x + 14) < 9 && y < 34, win = z === 30 && Math.abs(x - 16) < 9 && y > 16 && y < 32; if (door) return (x + 60) % 4 === 0 ? 0x4e3420 : 0x7a5230; if (win) return (x - 16) % 6 === 0 || y === 24 ? 0x4e3420 : VX.glow(0xffd48a); return y % 7 === 0 ? 0x4a3220 : H(x >> 3, y / 7 | 0, z >> 3) < 0.4 ? 0x8a6038 : 0x7a5430; });
    for (let k = 0; k <= 34; k++) for (let x = -47; x <= 47; x++) for (const s of [-1, 1]) { const z = s * (36 - k), y = 42 + R(k * 0.8); g.set(x, y, z, 0x5a3e28); g.box(x, y + 1, z, x, y + 4 + (H(x >> 2, 1, z >> 2) < 0.4 ? 1 : 0), z, snow(x, y, z)); }
    for (const s of [-1, 1]) for (let k = 0; k < 34; k++) g.box(s * 40, 44, -(33 - k), s * 40, 42 + R(k * 0.8), 33 - k, 0x7a5430);
    g.box(22, 66, -12, 32, 92, -2, (x, y, z) => K.stoneAt(x + z, y, 3)); g.box(21, 93, -13, 33, 95, -1, snow); return g;
  }
  /* the sights: the Wing, a fin of rock with ribs in it; the Tooth, a spire; the Breathing Stone, a cairn with a vent */
  function wing() { const g = G(); for (let x = 0; x < 120; x++) { const t = x / 120, u = (x % 20) / 20, rib = x % 20 < 4, h = R(100 * Math.pow(Math.sin(Math.PI * (0.1 + t * 0.8)), 0.6) * (1 - t * 0.5) + (rib ? 6 : -9 * Math.sin(Math.PI * u))); for (let y = 0; y <= h; y++) { const d = rib ? 4 : 1 + (y < 14 ? 2 : 0); for (let z = -d; z <= d; z++) if (Math.abs(z) === d || y > h - 3) g.set(x, y, z + R(Math.sin(t * 3) * 10), y > h - 4 || (!rib && H(x >> 1, y >> 2, 3) < 0.3) ? snow(x, y, z) : rib ? mul(rock(x, y, z), 0.72) : rock(x, y, z)); } } return g; }
  function tooth() { const g = G(); for (let y = 0; y < 150; y++) { const r = 20 * Math.pow(1 - y / 152, 0.8), ox = Math.sin(y * 0.014) * 10; for (let x = -24; x <= 34; x++) for (let z = -24; z <= 24; z++) { const d = Math.hypot(x - ox, z); if (d <= r && d > r - 2.4) g.set(x, y, z, (z < 0 && H(x >> 1, y >> 1, z) < 0.4) || H(x, y, z) < 0.08 ? snow(x, y, z) : rock(x, y, z)); } } return g; }
  function cairn() { const g = G(); for (let y = 0; y < 18; y++) { const r = 15 - y * 0.55; g.disc(0, 0, r, y, y, (x, yy, z) => Math.hypot(x, z) < 3 && yy > 6 ? 0x2a2c38 : Math.hypot(x, z) < r - 3 && yy < 17 ? -1 : H(x >> 2, yy >> 2, z >> 2) < 0.3 ? snow(x, yy, z) : rock(x, yy, z)); } return g; }
  function mouth() {                                       // the mouth of the cave in its crag (19 cm)
    const g = G(); for (let x = -44; x <= 44; x++) for (let y = 0; y < 58; y++) { const t = 54 - R(Math.abs(x) * 0.32 + 5 * H(x >> 2, 2, 7)); if (y > t) continue; const hole = Math.hypot(x / 9.5, (y - 4) / 11) < 1, f = R(5 + 4 * Math.sin(x * 0.24) + 3 * Math.sin(y * 0.3 + x * 0.1) + H(x >> 2, y >> 2, 9) * 4 - y * 0.12); if (hole) { for (const z of [-14]) g.set(x, y, z, 0x10121c); continue; } const nh = Math.hypot(x / 12, (y - 4) / 13.5) < 1; for (let z = nh ? -14 : f - 2; z <= f; z++) g.set(x, y, z, y >= t - 1 || (!nh && H(x >> 1, y >> 1, 4) < 0.14) ? snow(x, y, z) : nh && z < f - 2 ? mul(rock(x, y, z), 0.6) : rock(x, y, z)); }
    for (let k = 0; k < 14; k++) { const x = -9 + R(k * 1.35), l = 2 + R(H(k, 3, 3) * 5); g.box(x, R(14.5 - Math.abs(x) * 0.5) - l, 4, x, R(15 - Math.abs(x) * 0.4), 4, ice); } return g;
  }
  /* the cave: a shell of rock round a chamber 13 by 11 m, 5 m high, its mouth to +z (14 cm voxels) */
  const CV = 0.144;
  function caveShell() {
    const g = G(), A = 46, B = 34, C = 40, rr = (x, y, z) => { const n = 1 + 0.10 * Math.sin(x * 0.21 + y * 0.1) + 0.08 * Math.sin(z * 0.27 - y * 0.2) + (H(x >> 1, y >> 1, z >> 1) - 0.5) * 0.06; return Math.sqrt((x / A) ** 2 + (y / B) ** 2 + (z / C) ** 2) / n; };
    for (let x = -54; x <= 54; x++) for (let y = 0; y <= 42; y++) for (let z = -48; z <= 48; z++) { const q = rr(x, y, z); if (q < 1 || q > 1.07) continue; if (z > 24 && Math.abs(x) < 11 && y < 19 - Math.abs(x) * 0.4) continue; g.set(x, y, z, H(x >> 2, y >> 2, z >> 2) < 0.16 ? ice(x, y, z) : y < 3 && H(x, y, z) < 0.5 ? snow(x, y, z) : mul(rock(x, y, z), 0.8 + H(x >> 3, y >> 3, 1) * 0.2)); }
    for (let k = 0; k < 46; k++) { const a = H(k, 1, 1) * TAU, p = Math.sqrt(H(k, 2, 1)) * 0.8, x = R(Math.cos(a) * A * p), z = R(Math.sin(a) * C * p), y1 = R(B * Math.sqrt(Math.max(0, 1 - p * p)) * 0.98), l = 3 + R(H(k, 3, 1) * 9); for (let i = 0; i < l; i++) { const w = i > l * 0.6 ? 1 : 0; g.box(x - w, y1 - l + i, z - w, x + w, y1 - l + i, z + w, ice); } }
    return g;
  }
  function caveSlab(i, j) {                                // a piece of its floor, 2.6 m square and 60 cm thick: it can come away
    const g = G(), N = 18; for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) for (let y = -4; y < 0; y++) { const e = x === 0 || z === 0 || x === N - 1 || z === N - 1 || y === -1 || y === -4; if (!e) continue; g.set(x, y, z, y === -1 ? (H((x + i * 18) >> 2, 2, (z + j * 18) >> 2) < 0.12 ? ICE[0] : z + j * 18 > 62 && H(x, i, z + j) < 0.6 ? snow(x, y, z) : mul(H((x + i * 18) >> 2, 4, (z + j * 18) >> 2) < 0.4 ? RK[0] : RK[1], 0.95 + H(x >> 1, 5, z >> 1) * 0.15)) : rock(x, y, z)); } return g;
  }
  /* the drop beneath: a shaft 18 m across and 40 deep (28.8 cm), a ledge on one side, the ribs of something in the ice */
  const AV = 0.288;
  function shaft() {
    const g = G(); for (let y = -46; y <= 104; y++) { const r = 31 + 3 * Math.sin(y * 0.11) - Math.max(0, y - 70) * 0.62; for (let k = 0; k < 520; k++) { const a = k / 520 * TAU, q = r + 2.4 * Math.sin(a * 5 + y * 0.07) + (H(k >> 3, y >> 2, 5) - 0.5) * 2; for (const w of [0, 1]) g.set(R(Math.cos(a) * (q + w)), y, R(Math.sin(a) * (q + w)), y > 96 ? snow(k, y, 1) : H(k >> 4, y >> 3, 2) < 0.34 ? ice(k, y, 3) : mul(rock(k, y, 4), 0.55 + Math.max(0, y) * 0.004)); } }
    return g;
  }
  function ledge() { const g = G(); for (let x = -22; x <= 22; x++) for (let z = -13; z <= 12; z++) { const e = 10 + 3 * Math.sin(x * 0.3) + H(x >> 1, 1, z >> 1) * 2; if (z > e || Math.abs(x) > 20 + H(z, 2, 2) * 3) continue; const th = 4 + R(Math.max(0, 8 - z * 0.5) * 0.6); for (let y = -th; y < 0; y++) if (y === -1 || z >= e - 1.5 || Math.abs(x) > 18) g.set(x, y, z, y === -1 ? (H(x >> 1, 3, z >> 1) < 0.4 ? snow(x, y, z) : H(x, 4, z) < 0.3 ? ice(x, y, z) : rock(x, y, z)) : rock(x, y, z)); } return g; }
  function ribs() {                                        // nine ribs, each a great curve coming out of the ice, and a line of spine over them
    const g = G(), B1 = 0xd8dccc, B2 = 0xc0c8b8; for (let k = 0; k < 9; k++) { const x0 = -36 + k * 9, s = 1 - Math.abs(k - 4) * 0.06; for (let t = 0; t <= 1; t += 0.012) { const a = -0.25 + t * 2.5, r = 21 * s, y = R(8 + Math.cos(a) * r), z = R(Math.sin(a) * r * 0.9); g.ell(x0 + t * 3, y, z, 1.5 - t * 0.7, 1.5 - t * 0.6, 1.5 - t * 0.6, (x, yy, zz) => H(x, yy, zz) < 0.3 ? B2 : H(x >> 1, yy >> 1, zz >> 1) < 0.1 ? ICE[1] : B1); } g.ell(x0, 30 * s, -3, 2.4, 2, 2.4, B2); g.box(x0, R(31 * s), -4, x0 + 1, R(36 * s), -2, B1); }
    return g;
  }
  function hollow() { const g = G(); g.ell(0, 6, 0, 17, 7, 8, (x, y, z) => { const d = Math.hypot(x / 17, (y - 6) / 7, z / 8); if (y < 0) return -1; const body = Math.hypot(x / 12, (y - 10) / 5, z / 4.4) < 1; return body ? -1 : ice(x, y, z); }); return g; }      // a block of ice, melted from within: the shape of someone lying down
  function holeEdge() { const g = G(); for (let x = -22; x <= 22; x++) for (let z = -22; z <= 22; z++) { const d = Math.hypot(x, z) + Math.sin(Math.atan2(z, x) * 5) * 1.6; if (d < 13) { g.set(x, 0, z, d < 12 ? 0x05060c : 0x2a3044); continue; } if (d < 21) { const h = R((1 - Math.abs(d - 16) / 5) * 3 + H(x >> 1, 2, z >> 1) * 2); for (let y = 0; y <= h; y++) g.set(x, y, z, H(x >> 1, y, z >> 1) < 0.2 ? rock(x, y, z) : snow(x, y, z)); } } return g; }
  /* camp things */
  function tent(c) { const g = G(); for (let x = -26; x <= 26; x++) for (let y = 0; y <= 44; y++) { const w = 26 - y * 0.56; for (const s of [-1, 1]) { const xx = R(s * w); if (Math.abs(x - xx) > 0) continue; for (let z = -30; z <= 30; z++) g.set(xx, y, z, (z + 60) % 15 === 0 ? mul(c, 0.8) : y < 3 ? mul(c, 0.7) : c); } } for (let y = 0; y <= 44; y++) { const w = R(26 - y * 0.56); g.box(-w, y, -30, w, y, -30, (x) => mul(c, 0.86)); } g.box(0, 45, -32, 0, 46, 32, 0x5e4026); return g; }
  function stove() { const g = G(); for (const [x, z] of [[-6, -5], [6, -5], [0, 6]]) g.box(x, 0, z, x, 5, z, 0x2a2a32); g.disc(0, 0, 8, 6, 14, (x, y, z) => Math.hypot(x, z) > 6.6 || y === 6 ? (y === 10 && (x + z + 40) % 3 === 0 ? VX.glow(0xff9a3a) : 0x3a3a44) : y === 13 ? VX.glow(0xffb050) : -1); g.disc(0, 0, 6, 16, 22, (x, y, z) => Math.hypot(x, z) > 4.8 || y === 16 ? 0x8a8a94 : y === 20 ? 0xc87a3a : -1); g.box(7, 18, 0, 14, 19, 0, 0x2a2a32); return g; }
  function bedroll(c) { const g = G(); g.box(-11, 0, -30, 11, 3, 30, (x, y, z) => y === 3 ? ((z + 60) % 12 < 2 ? mul(c, 0.8) : c) : mul(c, 0.7)); g.ell(0, 5, -24, 9, 3, 5, 0xe8e0d0); return g; }
  function packGrid() { const g = G(); g.box(-9, 0, -6, 9, 24, 6, (x, y, z) => y === 18 || Math.abs(x) === 5 && z === 6 ? 0x4e3420 : H(x >> 2, y >> 2, z >> 2) < 0.3 ? 0x7a6a44 : 0x8a7a50); g.box(-11, 22, -4, 11, 28, 4, (x, y, z) => Math.hypot(y - 25, z) < 4 ? (x % 5 === 0 ? 0x6a3430 : 0x8a4640) : -1); return g; }

  class Snow extends STAGE.Stage {
    constructor(scene) {
      super(scene, 'snow');
      this.farColor = 0xe8eef8; this.floors = [[-80, -110, 120, 90, 0]]; this.ramps = []; this.slabs = []; this.blocks = [];
      const path = [[0, 46], [0, 16], [3, 11], [6.5, 6], [6.5, -8.4], [5, -12.4], [1.5, -14.8], [-2.2, -16], [-3.5, -18.6], [-3.5, -37]];
      this.marks.trail = path;
      const near = (x, z) => { let b = 99; for (let i = 0; i + 1 < path.length; i++) { const [x0, z0] = path[i], [x1, z1] = path[i + 1], dx = x1 - x0, dz = z1 - z0, t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / (dx * dx + dz * dz))); b = Math.min(b, Math.hypot(x - x0 - dx * t, z - z0 - dz * t)); } return b; };
      const ground = (x, z, px, py) => { const n = H(px, py, 7), d = near(x, z) + (H(R(x * 2), R(z * 2), 3) - 0.5) * 0.5, m = H(R(x * 1.1), R(z * 1.1), 5); if (d < 1.0) return n < 0.2 ? 0xa2b0ca : n < 0.5 ? 0xb4c2da : 0xc2cee4; if (d < 1.5) return n < 0.3 ? 0xc8d4e8 : 0xd8e1f0; return n < 0.05 ? 0xdbe5f4 : m < 0.22 ? 0xe9effa : n < 0.5 ? 0xf0f5fc : 0xf4f8fe; };
      this.paintCore(-24.576, -20, 2048, ground);
      this.paintGround(220, 2048, 0, 0, (x, z, px, py) => { const m = H(R(x * 0.3), R(z * 0.3), 5), n = H(px, py, 7); return Math.abs(x) < 25 && z > -45 && z < 50 ? ground(x, z, px, py) : m < 0.2 ? 0xe2eaf6 : n < 0.3 ? 0xe9f0fa : 0xf0f5fc; });
      const P = (name, make, s, x, z, ry, o) => this.put(name, make, s, x, z, ry, o);
      // the cliffs either hand, set end to end along the trail's two bends; east of the first of it, open country
      const GR = {}, keep = (n, f) => () => (GR[n] = f()), rocks = [];              // (what's solid: see below)
      const hard = (n, x, z, ry) => { rocks.push([n, x, z, ry || 0]); return this.place(n, x, z, ry || 0); };
      [0, 1, 2].forEach(k => { this.kind('cliff' + k, keep('cliff' + k, () => cliff(k * 2.3 + 1, [58, 72, 64][k])), WB); this.kind('crag' + k, keep('crag' + k, () => crag(k * 2 + 1)), WB); });
      const face = (x, z, ry, k) => hard('cliff' + k, x, z, ry);                      // (8.06 m along its own +x, its face to its own +z)
      for (const [x, z, ry, k] of [[-4.6, 49.5, HP, 0], [-4.8, 41.5, HP, 1], [-4.5, 33.5, HP, 2], [-4.8, 25.5, HP, 0], [-4.4, 17.5, HP, 1], [-4.4, 9.6, HP, 2],      // up the first of it, on the west
        [-6.4, 6.2, 0, 0], [1.0, 7.2, HP, 2], [1.0, -0.8, HP, 1],                                                                                            // round the bend, and up
        [0.8, -7.5, Math.PI, 0], [-7.2, -7.5, Math.PI, 2],                                                                                                  // the second bend, its near side
        [-8.5, -7.0, HP, 1], [-8.5, -15.0, HP, 0], [-8.5, -23.0, HP, 2], [-8.5, -31.0, HP, 1], [-8.5, -39, HP, 0],                                            // the last of it, on the west
        [12.4, -12.6, -HP, 2], [12.4, -20.6, -HP, 1], [1.0, -19.6, 0, 2], [9.0, -19.6, 0, 0],                                                                  // the second bend, its far side
        [1.3, -27.4, -HP, 1], [1.3, -35.4, -HP, 2], [1.3, -43.4, -HP, 0]]) face(x, z, ry, k);                                                                  // the last of it, on the east
      for (const [x, z, k] of [[1.9, 7.6, 0], [1.4, -8.0, 1], [1.0, -19.3, 2], [-4.2, 7.6, 1], [12.0, -19.0, 0], [-8.2, -8.0, 2], [12.6, -5.0, 1], [-8.2, -36.4, 0], [1.2, -36.4, 1]]) hard('crag' + k, x, z, x);
      this.kind('mouth', keep('mouth', mouth), WB, { ao: false }); hard('mouth', -3.5, -38.4, 0);
      [0, 1, 2].forEach(k => this.kind('bank' + k, keep('bank' + k, () => bank(k * 1.7)), CB));
      for (const [x, z, ry, k] of [[4.0, 44, HP, 0], [4.1, 40, HP, 1], [4.0, 36.4, HP, 2], [4.2, 32.4, HP, 0], [4.0, 28.6, HP, 1], [4.2, 25, HP, 2], [4.4, 21.4, HP, 0], [5.0, 18, HP * 0.8, 1], [8.0, 15.4, HP * 0.5, 2], [10.4, 11.4, HP, 0], [10.6, 7.6, HP, 1], [10.4, 4, HP, 2], [10.6, 0.4, HP, 0], [10.4, -2.6, HP, 1]]) if (z < 30) hard('bank' + k, x, z, ry); else this.place('bank' + k, x, z, ry);
      [0, 1, 2].forEach(k => this.kind('stand' + k, () => standing(k + 1), CB));
      this.marks.stones = [[5.0, 2.6], [8.0, -4.6], [2.2, -12.6], [-4.8, -20.6], [-2.3, -27.4]];
      this.marks.stones.forEach(([x, z], i) => { this.place('stand' + (i % 3), x, z, 0.2 * (i % 2 ? 1 : -1)); this.col(x, z, 0.62); });
      for (const [x, z] of [[2.4, 38], [2.3, 29], [2.5, 20], [8.9, 8], [9.0, -1], [8.6, -9.4], [5.2, -15.6], [0.4, -16.4], [-1.9, -19.6], [-5.3, -25], [-1.9, -31.6], [-5.6, -35.2]]) { P('pole', pole, S1, x, z, (x * 7 + z) % 1); this.col(x, z, 0.15); }
      P('sign', tourSign, S1, -2.2, 41.5, 0.5); this.col(-2.2, 41.5, 0.6); P('hut', hut, SB, -2.0, 52.5, Math.PI * 0.94); this.block(-4.4, 50.6, 0.6, 54.4);
      P('bench', T.bench, S1, 1.8, 45.6, -HP); this.col(1.8, 45.6, 0.5); this.seats.push({ x: 1.8, z: 45.6, yaw: -HP, h: 0.5 });
      P('stump', () => { const g = G(); g.disc(0, 0, 9, 0, 16, (x, y, z) => y === 16 ? (Math.floor(Math.hypot(x, z)) & 1 ? 0xd8b07a : 0xc09860) : H(x, y >> 2, z) < 0.3 ? 0x4a3626 : 0x5c4430); return g; }, S1, 7.6, 43.6, 0); this.col(7.6, 43.6, 0.3); this.marks.stump = [7.6, 43.6];
      [0, 1].forEach(k => this.kind('pine' + k, () => pine(k), CB));
      for (const [x, z, k] of [[9.6, 46, 0], [12, 41.6, 1], [8.6, 38.4, 1], [14.4, 47, 0], [11.4, 35, 0], [16, 38, 1], [9, 31, 0], [13, 28, 1], [10, 51, 1], [5.4, 55, 0], [-8, 57, 1], [15.5, 53, 1]]) { this.place('pine' + k, x, z, x); this.col(x, z, 0.5); }
      P('wing', wing, WB, 37, 9, HP, { noCast: true }); P('tooth', tooth, WB, 34, 22, 0.8, { noCast: true }); P('cairn', cairn, S1, 8.6, 5.0, 0); this.col(8.6, 5.0, 0.4); this.marks.cairn = [8.6, 5.0]; this.marks.wing = [37, -3]; this.marks.tooth = [34, 22];
      for (let i = 0; i < 4; i++) this.kind('mtn' + i, () => K.mountainGrid(i), 4.0);
      for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + 0.2, r = 235 + (i % 4) * 36; this.place('mtn' + (i % 4), Math.sin(a) * r, Math.cos(a) * r, a * 3, { noCast: true, s: 1.1 + (i % 3) * 0.4, y: -8 }); }
      for (let i = 0; i < 9; i++) this.place('mtn' + (i % 4), 118 + (i % 3) * 20, -96 + i * 27, i, { noCast: true, s: 0.5 + (i % 2) * 0.16, y: -9 });
      // the open snow over the cave, the hole in it, some stones standing about
      P('hole', holeEdge, CB, 60, -60, 0, { ao: false }); for (const [x, z, k] of [[55, -64, 0], [66, -63, 1], [52.5, -55, 2], [68, -52, 0], [63, -70, 1], [49, -67, 2]]) this.place('stand' + k, x, z, x);
      // ------------------------------------------------ the cave, forty metres up
      const CX = 300, CY = 40;
      P('cave', caveShell, CV, CX, 0, 0, { y: CY, ao: false });
      for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) P('slab' + (i * 5 + j), () => caveSlab(i, j), CV, CX - 7.8 + i * 2.6, -6.5 + j * 2.6, 0, { y: CY, name: 'slab_' + (i * 5 + j) });
      this.floors.push([CX - 8, -7, CX + 8, 7, CY]);
      P('tentR', () => tent(0xb8503c), S1, CX - 3.6, -2.6, 0.5, { y: CY, name: 'camp_tent' }); P('tentB', () => tent(0x3c6a8a), S1, CX + 3.8, -3.0, -0.45, { y: CY, name: 'camp_tent2' });
      P('stove', stove, S1, CX, -0.4, 0, { y: CY, name: 'camp_stove' }); P('pack', packGrid, S1, CX - 1.9, -3.9, 0.4, { y: CY, name: 'camp_pack' }); this.place('pack', CX + 1.7, -4.0, -0.5, { y: CY, name: 'camp_pack2' });
      P('roll', () => bedroll(0x6a7a4a), S1, CX + 2.0, 1.6, 1.1, { y: CY, name: 'camp_roll' });
      this.block(CX - 9, -8, CX + 9, -5.0); this.block(CX - 9, -8, CX - 5.9, 8); this.block(CX + 5.9, -8, CX + 9, 8); this.block(CX - 9, 5.4, CX - 1.5, 8); this.block(CX + 1.5, 5.4, CX + 9, 8); this.block(CX - 2, 6.4, CX + 2, 8);
      this.light(CX, CY + 1.0, -0.4, 0xff9a4a, 1.6, 7.0, 'stove'); this.light(CX, CY + 3.0, 4.6, 0xbcd4f4, 1.1, 8.0, 'mouth');
      this.marks.cave = [CX, CY];
      // ------------------------------------------------ the drop
      const AX = 400, AY = 40;
      P('shaft', shaft, AV, AX, 0, 0, { y: AY, ao: false }); P('ledge', ledge, AV, AX, -5.4, 0, { y: AY, ao: false }); P('ribs', ribs, AV, AX - 1, -3.6, 0, { y: AY - 1.2, ao: false }); P('hollow', hollow, S1 * 3, AX + 4.2, -6.4, 0.3, { y: AY, ao: false });
      this.floors.push([AX - 6, -9, AX + 6, -2.4, AY]);
      this.light(AX, AY + 24, 0, 0xcfe0ff, 2.6, 34, 'above'); this.light(AX + 4.2, AY + 1.0, -6.0, 0xe86ab8, 0.9, 5.0, 'heart'); this.light(AX - 3, AY + 4, -3, 0x7ab0f0, 0.8, 12, 'ice');
      this.marks.drop = [AX, AY];
      this.walk = [[-4.4, 14, 3.2, 49.5], [-4.6, 6.4, 10, 15], [1, -12, 11.4, 10], [-8.2, -19.4, 12.2, -8], [-8.2, -37, 1.2, -16], [CX - 6, -5, CX + 6, 6.2], [AX - 5, -8.2, AX + 5, -3], [3, 33, 13, 49]];
      // the rock itself, as a map of 20 cm squares: 1, solid to somebody walking; 2, to the camera
      { const C = 0.2, X0 = -16, Z0 = -46, NX = 190, NZ = 510, M = new Uint8Array(NX * NZ);
        for (const [n, px, pz, ry] of rocks) { const k = n.startsWith('bank') ? CB : WB, c = Math.cos(ry), q = Math.sin(ry), cells = new Map();
          GR[n].each((x, y, z) => { const yy = (y + 0.5) * k; if (yy > 4.4 || yy < 0.28) return; const id = (x + 512) * 1024 + z + 512; cells.set(id, (cells.get(id) || 0) | (yy < 1.5 ? 3 : 2)); });
          if (n.startsWith('cliff')) for (let x = 0; x < 42; x++) { let f = -99, f2 = -99; for (let z = -14; z < 24; z++) { const v = cells.get((x + 512) * 1024 + z + 512) || 0; if (v & 1) f = z; if (v & 2) f2 = z; } for (let z = -12; z <= f2; z++) cells.set((x + 512) * 1024 + z + 512, z <= f ? 3 : 2); }
          for (const [id, v] of cells) { const lx = (Math.floor(id / 1024) - 512) * k, lz = (id % 1024 - 512) * k; for (const a of [-0.4, 0, 0.4]) for (const b of [-0.4, 0, 0.4]) { const ux = lx + a * k, uz = lz + b * k, i = Math.floor((px + ux * c + uz * q - X0) / C), j = Math.floor((pz - ux * q + uz * c - Z0) / C); if (i >= 0 && j >= 0 && i < NX && j < NZ) M[j * NX + i] |= v; } } }
        const rle = []; for (let i = 0; i < M.length;) { let j = i; while (j < M.length && M[j] === M[i]) j++; rle.push(M[i], j - i); i = j; }
        this.marks.rock = { x: X0, z: Z0, c: C, nx: NX, nz: NZ, rle }; }
    }
  }
  window.SNOW = Snow;
})();
