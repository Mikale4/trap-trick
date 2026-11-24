/* ============================================================================
   farm.js -- Reiner's home: a farm a morning's ride from Thistlewick. A
   thatched cottage, a plank barn, the hen yard, a well, beehives (his mother's
   honey buns), a vegetable garden, rail fences, wheat and ploughland, a great
   oak on its rise to the west, and the road south to the town. Its kitchen is a
   room of its own, off at (KX, KZ).
   x east, z south. Small things 2.4 cm, buildings 4.8 cm.
   ========================================================================== */
(function () {
  'use strict';
  const H = VX.hash3, TAU = Math.PI * 2, HP = Math.PI / 2, R = Math.round, { S1, SB } = STAGE, K = window.TOWN_KIT, T = window.THINGS;
  const mul = (c, k) => { const f = s => Math.max(0, Math.min(255, Math.round(((c >> s) & 255) * k))); return (f(16) << 16) | (f(8) << 8) | f(0); };
  const G = () => { const g = new VX.Grid(); g.jit = 0; g.merge = true; return g; };
  const OAK = 0x8a5a32, OAK_D = 0x6b4426, OAK_L = 0xa8743e, DARK = 0x4a3020, STRAW = 0xd8b860;
  const KX = 600, KZ = 0;

  /* a barn: tarred planks over a stone foot, a great pair of doors with cross braces, a loft door with a beam, thatch */
  function barnGrid() {
    const g = G(), W = 150, D = 190, Hh = 66, top = Hh, x0 = -W / 2, x1 = W / 2 - 1, z0 = -D / 2, z1 = D / 2 - 1, RED = 0x8c4430, RED2 = 0x7c3a2a, RED3 = 0x9a5038;
    const gy = x => top + R((W / 2 + 4 - Math.abs(x + 0.5)) * 0.95);
    g.inside = (x, y, z) => y < 0 || (x > x0 && x < x1 && z > z0 && z < z1 && y < gy(x) - 4);
    const plank = a => { const i = Math.floor((a + 400) / 5), t = H(i, 9, 2); return (a + 400) % 5 === 0 ? 0x5a2c20 : t < 0.33 ? RED : t < 0.66 ? RED2 : RED3; };
    const stone = (a, y) => K.stoneAt(a, y, 6);
    for (let y = 0; y < Hh + 80; y++) {
      for (let x = x0; x <= x1; x++) { if (y >= gy(x) - 1) continue; for (const z of [z0, z1]) g.set(x, y, z, y < 12 ? stone(x + 100, y) : y === 12 || y === 64 ? DARK : plank(x)); }
      if (y < top + 3) for (let z = z0; z <= z1; z++) for (const x of [x0, x1]) g.set(x, y, z, y < 12 ? stone(z + 100, y) : y === 12 ? DARK : plank(z));
    }
    for (const x of [x0, x0 + 1, x1 - 1, x1]) g.box(x, 0, z1 + 1, x, top, z1 + 1, DARK);
    // the doors on the south front (+z)
    g.box(-31, 0, z1 + 1, 30, 58, z1 + 2, (x, y) => Math.abs(x + 0.5) > 29 || y > 56 ? DARK : x === -1 || x === 0 ? 0x2a1a12 : ((x + 60) % 6 === 0 ? 0x5a3c26 : OAK_D));
    for (const s of [-1, 1]) for (let t = 0; t <= 1; t += 0.01) { const a = s * (3 + t * 25) - (s < 0 ? 1 : 0); g.box(R(a) - 1, R(4 + t * 48), z1 + 3, R(a) + 1, R(6 + t * 48), z1 + 3, OAK_L); g.box(R(a) - 1, R(52 - t * 48), z1 + 3, R(a) + 1, R(54 - t * 48), z1 + 3, OAK_L); }
    for (const s of [-1, 1]) for (const y of [4, 28, 52]) g.box(s < 0 ? -29 : 2, y, z1 + 3, s < 0 ? -3 : 28, y + 2, z1 + 3, OAK_L);
    g.box(-12, 78, z1 + 1, 11, 104, z1 + 1, (x, y) => x < -10 || x > 9 || y < 80 || y > 102 ? DARK : ((x + 60) % 5 === 0 ? 0x3a2418 : 0x2c1c14));
    g.box(-2, 112, z1 - 6, 1, 115, z1 + 22, DARK); g.box(-1, 98, z1 + 19, 0, 111, z1 + 19, 0xb89a62);
    // thatch, overhanging, its ridge bound with a lattice
    for (let z = z0 - 8; z <= z1 + 8; z++) for (let x = x0 - 8; x <= x1 + 8; x++) { const t = gy(x); if (t < top - 8) continue; for (let y = t - 1; y <= t + 2; y++) { const ridge = Math.abs(x + 0.5) < 12, n = H(x >> 1, y >> 1, z >> 2); g.set(x, y, z, z === z0 - 8 || z === z1 + 8 ? 0xa88a48 : ridge && y === t + 2 ? ((z + R(Math.abs(x))) % 8 === 0 ? 0x8a6c34 : 0xc8a858) : n < 0.25 ? 0xb0924e : n > 0.8 ? 0xceb066 : 0xbfa058); } }
    return g;
  }
  function coopGrid() {                                  // a hen house on legs, a ramp, nest windows
    const g = G();
    for (const x of [-26, 25]) for (const z of [-18, 17]) g.box(x, 0, z, x + 1, 14, z + 1, DARK);
    g.box(-27, 14, -19, 27, 15, 19, OAK_D);
    g.box(-26, 16, -18, 26, 46, 18, (x, y, z) => Math.abs(x) === 26 || Math.abs(z) === 18 || y === 46 ? ((y % 6 === 0) ? mul(OAK, 0.7) : H(y >> 3, x >> 5, z >> 5) < 0.4 ? OAK_L : OAK) : -1);
    g.box(-5, 17, 19, 5, 33, 19, (x, y) => Math.abs(x) === 5 || y === 33 ? DARK : 0x1a120e); for (const s of [-1, 1]) g.box(s * 18 - 4, 26, 19, s * 18 + 4, 36, 19, (x, y) => Math.abs(x - s * 18) === 4 || y === 26 || y === 36 ? DARK : (x + y) & 1 ? 0x2a1c14 : 0xc8b070);
    for (let k = 0; k <= 26; k++) g.box(-4, R(15 - k * 0.56), 19 + k, 4, R(15 - k * 0.56), 19 + k, k % 5 === 0 ? DARK : OAK_L);
    for (let i = 0; i <= 14; i++) g.box(-31, 46 + i, -(24 - R(i * 1.6)), 31, 47 + i, 24 - R(i * 1.6), (x, y, z) => Math.abs(z) > 22 - i * 1.6 || i > 12 || Math.abs(x) === 31 ? ((x + 60 + (i & 1) * 4) % 8 === 0 ? 0x6a5a4a : H(x >> 3, i, 4) < 0.4 ? 0x8a7660 : 0x7a6652) : -1);
    return g;
  }
  function skepGrid() { const g = G(); g.box(-11, 0, -11, 11, 1, 11, OAK_D); for (const s of [-1, 1]) g.box(s * 9, -12, -9, s * 8, -1, 9, (x, y, z) => Math.abs(z) > 7 ? OAK_D : -1); for (let y = 2; y <= 22; y++) { const r = 9 * Math.sqrt(Math.max(0, 1 - ((y - 2) / 22) ** 2)) + 0.6; g.disc(0, 0, r, y, y, (x, yy, z) => Math.hypot(x, z) < r - 2 ? -1 : y % 3 === 0 ? 0xb08c3c : H(x, y, z) < 0.3 ? 0xd0ae5c : 0xc8a24a); } g.box(-2, 3, 8, 2, 5, 11, 0x1a120e); return g; }
  function railGrid() {                                  // a split-rail fence, 2 m along x
    const g = G();
    g.box(-2, 0, -2, 1, 46, 1, (x, y) => y > 44 ? OAK_L : H(x, y >> 2, 1) < 0.3 ? 0x7a6248 : 0x8a7052);
    for (const [y, w] of [[18, 0], [36, 1]]) g.box(2, y, -1, 82, y + 3, 1, (x, yy, z) => (yy === y + 3 ? 0x9c8260 : H(x >> 4, yy, w) < 0.4 ? 0x7e6448 : 0x8c7254));
    return g;
  }
  function scarecrowGrid() {
    const g = G(); g.box(-1, 0, -1, 0, 60, 0, OAK_D); g.box(-30, 44, -1, 30, 46, 0, OAK_D);
    g.box(-8, 24, -4, 8, 47, 4, (x, y, z) => H(x >> 2, y >> 2, z) < 0.12 ? 0xb83a3a : y < 26 && H(x, 3, z) < 0.5 ? -1 : 0x5a6a8a); for (const s of [-1, 1]) { g.box(s * 9, 41, -3, s * 24, 49, 3, (x, y, z) => H(x >> 2, y >> 2, z) < 0.1 ? 0xc8a858 : 0x5a6a8a); for (let k = 0; k < 5; k++) g.line(s * 25, 43 + k, k - 2, s * 31, 41 + k * 1.5, k - 2, STRAW); }
    g.ell(0, 55, 0, 6, 6.5, 6, 0xc8b088); for (const s of [-1, 1]) { g.set(s * 2, 57, 6, 0x2a1c14); g.set(s * 3, 56, 6, 0x2a1c14); } g.line(-3, 52, 6, 3, 52, 6, 0x2a1c14);
    g.disc(0, 0, 11, 60, 60, 0x9a7a3a); g.disc(0, 0, 6, 61, 66, 0xa88640); return g;
  }
  function oakGrid() {                                   // the great oak: a buttressed trunk, big limbs (4.8 cm)
    const g = G(), bark = (x, y, z) => { const a = Math.floor((Math.atan2(z, x) + Math.PI) * 5 + y * 0.06); return H(a, y >> 3, 2) < 0.3 ? 0x4a3626 : H(x, y, z) < 0.2 ? 0x6b5038 : 0x5c4430; };
    for (let y = 0; y <= 74; y++) { const r = 11 + Math.max(0, 16 - y) * 0.6 - y * 0.06, a0 = y * 0.05; for (let x = -24; x <= 24; x++) for (let z = -24; z <= 24; z++) { const a = Math.atan2(z, x), d = Math.hypot(x - y * 0.06, z), rr = r * (1 + 0.16 * Math.sin(a * 5 + a0)); if (d <= rr && d > rr - 3) g.set(x, y, z, bark(x, y, z)); } }
    for (const [x, y, z, r] of [[52, 118, 10, 4], [-50, 112, 22, 4.4], [10, 128, -50, 4], [-14, 124, 48, 3.6], [34, 132, -30, 3.4], [-40, 130, -28, 3.6], [60, 94, -18, 3]]) g.line(4, 66, 0, x, y, z, bark, r);
    g.line(8, 62, 4, 48, 72, 30, bark, 3.4); g.line(48, 72, 30, 62, 74, 34, bark, 2.6);      // the low bough the swing hangs from
    return g;
  }
  function oakCrown(seed, r) { const g = G(); for (let i = 0; i < 26; i++) { const a = H(i, seed, 1) * TAU, p = Math.sqrt(H(i, seed, 2)) * r, y = (H(i, seed, 3) - 0.4) * r * 0.75, q = 5 + H(i, seed, 4) * 6; g.ell(Math.sin(a) * p, y, Math.cos(a) * p, q, q * 0.75, q, (X, Y, Z) => { const n = H(X >> 1, Y >> 1, Z >> 1); if (H(X, Y, Z) < 0.05) return -1; return Y > y + q * 0.35 ? (n < 0.4 ? 0x7cb04a : 0x6aa040) : Y < y - q * 0.3 ? 0x3c6c2a : n < 0.3 ? 0x4c8232 : 0x58923a; }); } return g; }
  function swingGrid() {                                  // drawn from its knots on the bough (the origin) down: two ropes, a plank seat, its top 3.1 m below
    const g = G();
    for (const s of [-1, 1]) { g.box(s * 12, -130, 0, s * 12, 3, 0, (x, y) => ((y + 400) % 5) === 0 ? 0x8a7042 : 0xb89a62); g.box(s * 12 - 1, 0, -3, s * 12 + 1, 1, 3, 0xa88a52); g.box(s * 12 - 1, -134, -1, s * 12 + 1, -133, 1, 0xa88a52); }
    g.box(-14, -132, -4, 14, -131, 4, (x, y, z) => Math.abs(x) === 12 && z === 0 ? 0xb89a62 : z === 0 ? OAK : y === -131 ? OAK_L : OAK_D);
    return g;
  }
  function wheatGrid() { const g = G(); for (const [x, z, h, l] of [[0, 0, 15, 1], [3, 1, 14, -1], [-2, 3, 16, 1], [1, -3, 13, 0], [-4, -1, 14, -1], [4, -3, 15, 1]]) { g.box(x, 0, z, x, h - 4, z, h & 1 ? 0xc8a848 : 0xb89840); g.box(x, h - 4, z, x, h, z, 0xe4c25c); g.set(x + l, h - 2, z, 0xd8b04c); } return g; }
  function tuftGrid() { const g = G(); for (const [x, z, h, c] of [[0, 0, 7, 0x6fb04a], [2, 1, 5, 0x5f9a42], [-2, 1, 6, 0x7abc54], [1, -2, 4, 0x5a9440], [-1, -1, 8, 0x68a848]]) g.box(x, 0, z, x, h, z, c); return g; }
  function flowerGrid(c) { const g = G(); g.box(0, 0, 0, 0, 5, 0, 0x4f8a3a); g.set(1, 2, 0, 0x5f9a42); g.set(0, 6, 0, 0xf0d04a); for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.set(x, 6, z, c); return g; }
  function cabbageGrid() { const g = G(); g.ell(0, 3, 0, 4, 3, 4, (x, y, z) => H(x, y, z) < 0.3 ? 0x9cc878 : 0x84b860); for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; g.line(Math.cos(a) * 3, 1, Math.sin(a) * 3, Math.cos(a) * 6, 4, Math.sin(a) * 6, 0x5f9a48, 0.7); } return g; }
  function troughGrid() { const g = G(); for (const s of [-1, 1]) g.box(s * 20 - 2, 0, -8, s * 20 + 2, 6, 8, OAK_D); g.box(-26, 7, -8, 26, 22, 8, (x, y, z) => Math.abs(x) > 24 || Math.abs(z) > 6 || y < 9 ? (y % 7 === 0 ? mul(OAK, 0.7) : OAK) : y === 18 ? 0x5a8ccc : -1); return g; }
  function gatePost() { const g = G(); g.box(-5, 0, -5, 5, 60, 5, (x, y, z) => K.stoneAt(x + z + 60, y, 3)); g.box(-6, 61, -6, 6, 64, 6, 0xbdb6ad); g.ell(0, 69, 0, 4, 4, 4, 0xa9a29a); return g; }
  function milestone() { const g = G(); g.box(-5, 0, -3, 5, 22, 3, (x, y, z) => y > 18 && Math.abs(x) > 3 ? -1 : H(x >> 1, y >> 1, z) < 0.3 ? 0x968f88 : 0xa9a29a); for (const [x, y] of [[-2, 14], [-1, 14], [0, 14], [1, 14], [2, 14], [0, 13], [0, 12], [0, 11], [0, 10]]) g.set(x, y, 4, 0x5a544e); return g; }
  function signGrid() { const g = G(); g.box(-1, 0, -1, 1, 70, 1, OAK_D); for (const [y, s, w] of [[56, 1, 24], [44, -1, 20]]) g.box(s > 0 ? 0 : -w, y, 2, s > 0 ? w : 0, y + 9, 3, (x, yy) => (Math.abs(x) > w - 4 && Math.abs(yy - y - 4.5) > (w - Math.abs(x)) + 1) ? -1 : yy === y || yy === y + 9 ? DARK : yy === y + 5 && Math.abs(x) % 4 !== 0 && Math.abs(x) > 3 && Math.abs(x) < w - 5 ? DARK : OAK_L); return g; }

  /* ------------------------------------------------------- the kitchen -- */
  const KW = 150, KD = 116, KH = 56;                        // 7.2 x 5.57 x 2.69 m
  const plaster = (a, y) => y < 2 ? DARK : H(a >> 3, y >> 3, 4) < 0.12 ? 0xe4d6b8 : 0xeee2c8;
  const beamAt = (a, n) => ((a % n) + n) % n < 4;
  function kWall(len, holes, seed) {                       // a plastered wall with posts and a rail, along x, its face to +z
    const g = G(); const open = (x, y) => holes.some(h => x >= h[0] && x <= h[1] && y >= h[2] && y <= h[3]);
    g.inside = (x, y, z) => z < 0 && z > -5 && x >= 0 && x < len && y >= 0 && y < KH && !open(x, y);
    for (let x = 0; x < len; x++) for (let y = 0; y < KH; y++) if (!open(x, y)) { g.set(x, y, 0, beamAt(x + seed, 36) || y < 3 || y === 22 || y === 23 ? (H(x, y >> 2, 1) < 0.2 ? 0x46301f : 0x523826) : plaster(x, y)); g.set(x, y, -5, 0xd8ccb0); if (x === 0 || x === len - 1 || y === KH - 1) for (let z = -4; z < 0; z++) g.set(x, y, z, 0xd8ccb0); }
    for (const h of holes) { for (let y = h[2] - 1; y <= h[3] + 1; y++) for (let z = -5; z <= 1; z++) { g.set(h[0] - 1, y, z, OAK_D); g.set(h[1] + 1, y, z, OAK_D); } for (let x = h[0] - 2; x <= h[1] + 2; x++) for (let z = -5; z <= 1; z++) { g.set(x, h[3] + 1, z, OAK_D); if (h[2] > 2) g.set(x, h[2] - 1, z, OAK); }
      if (h[2] > 2) { const mx = R((h[0] + h[1]) / 2), my = R((h[2] + h[3]) / 2); for (let y = h[2]; y <= h[3]; y++) g.set(mx, y, -3, OAK_D); for (let x = h[0]; x <= h[1]; x++) g.set(x, my, -3, OAK_D); } }
    return g;
  }
  function kCeil() { const g = G(); g.box(0, 0, 0, KW - 1, 0, KD - 1, (x, y, z) => x % 8 === 0 ? 0x4a3322 : H(x >> 3, 1, z >> 6) < 0.4 ? 0x6a4a30 : 0x745236); for (const z of [14, 48, 82, 108]) g.box(0, -6, z, KW - 1, -1, z + 5, (x, y) => H(x >> 3, y, z) < 0.2 ? 0x46301f : 0x523826); return g; }
  function hearthGrid() {                                  // a wide stone hearth, 2 m, a mantel with things on it
    const g = G(), st = (x, y, z) => K.stoneAt(x + z + 100, y, 12);
    g.box(-22, 0, 0, 22, 1, 20, 0x968f88); g.box(-21, 2, 0, -13, 30, 12, st); g.box(13, 2, 0, 21, 30, 12, st); g.box(-21, 24, 0, 21, 55, 12, (x, y, z) => y < 30 && Math.abs(x) < 13 ? (y < 24 + Math.abs(x) * 0.3 ? -1 : st(x, y, z)) : st(x, y, z)); g.box(-13, 2, 0, 13, 23, 1, (x, y) => H(x >> 1, y >> 1, 4) < 0.4 ? 0x2a2422 : 0x3a322e); g.box(-24, 31, 0, 24, 33, 15, OAK_D);
    for (const [x, c] of [[-18, 0x6a8ab0], [-8, 0xc8a24a], [10, 0xb83a3a], [18, 0x6a8a5a]]) g.disc(x, 8, 2, 34, 38, c);
    for (const [x0, x1, y, z] of [[-9, 9, 3, 8], [-8, 8, 3, 5], [-7, 7, 5, 6]]) g.box(x0, y, z, x1, y + 1, z + 1, (x) => H(x >> 1, y, z) < 0.35 ? VX.glow(0xff7a2a) : 0x3a241a);
    g.box(-1, 23, 7, 0, 14, 7, 0x2a2a30); for (let y = 8; y <= 14; y++) g.disc(0, 7, y === 8 ? 3 : 5, y, y, (x, yy, z) => y === 14 && Math.hypot(x, z - 7) < 4 ? 0xb07a44 : 0x2c2c34);
    return g;
  }
  function tableGrid() { const g = G(); g.box(-48, 28, -20, 48, 30, 20, (x, y, z) => y === 30 ? ((z + 40) % 8 === 0 ? mul(OAK, 0.75) : H((z + 40) >> 3, x >> 5, 3) < 0.4 ? OAK_L : OAK) : OAK_D); for (const x of [-42, 40]) { for (const z of [-14, 12]) g.box(x, 0, z, x + 3, 27, z + 3, OAK_D); g.box(x, 22, -14, x + 3, 25, 14, OAK_D); } g.box(-40, 8, -1, 40, 10, 1, OAK_D); return g; }   // (2.4 cm; 2.3 m long, 0.74 m high)
  function chairGrid() { const g = G(); g.box(-8, 17, -8, 8, 18, 8, (x, y, z) => y === 18 ? ((x + z) & 1 ? 0xd0b068 : 0xc0a058) : OAK_D); for (const x of [-8, 7]) for (const z of [-8, 7]) g.box(x, 0, z, x + 1, z < 0 ? 42 : 17, z + 1, OAK_D); for (const y of [26, 32, 38]) g.box(-7, y, -8, 7, y + 2, -7, OAK); return g; }
  function dresserGrid() {
    const g = G(); g.box(-30, 0, -9, 30, 36, 9, (x, y, z) => y === 36 ? OAK_L : (Math.abs(x) % 20 === 0 || y === 18 || y < 2) && z === 9 ? DARK : OAK); for (const x of [-10, 10]) g.set(x, 24, 10, 0xc8a24a); g.box(-30, 37, -9, 30, 84, -8, OAK_D); for (const x of [-30, 29]) g.box(x, 37, -9, x + 1, 84, 0, OAK_D); for (const y of [50, 66, 82]) g.box(-30, y, -9, 30, y + 1, 0, OAK);
    const plate = (x, y, c) => g.box(x - 5, y, -6, x + 5, y + 10, -5, (X, Y) => { const d = Math.hypot(X - x, Y - y - 5); return d > 5.3 ? -1 : d > 4 ? c : d < 2 ? c : 0xf1ece2; }); for (const [x, y, c] of [[-20, 52, 0x4a6aa0], [-6, 52, 0x4a6aa0], [8, 52, 0x4a6aa0], [21, 52, 0x4a6aa0], [-20, 68, 0xb85a4a], [-6, 68, 0xb85a4a]]) plate(x, y, c); for (const x of [8, 16, 24]) g.disc(x, -4, 2.4, 68, 73, (X, Y) => Y === 71 ? 0x6a8a5a : 0xe0d4bc); for (const x of [-22, -12]) g.disc(x, 1, 3, 37, 44, x < -15 ? 0x8a5a3a : 0x6a8ab0); g.ell(6, 39, 2, 5, 2.4, 3, 0xc98a42); return g;
  }
  function herbs() { const g = G(); for (const [x, c, h] of [[-30, 0x6a9a4a, 10], [-18, 0xc8a048, 12], [-6, 0x8a6aa8, 9], [8, 0xd8d0c0, 11], [20, 0xb85a3a, 12], [31, 0x5a8a3a, 9]]) { g.box(x, 0, 0, x, 3, 0, 0xb89a62); for (let y = -1; y >= -h; y--) g.disc(x, 0, c === 0xd8d0c0 || c === 0xb85a3a ? (y % 4 === 0 ? 1 : 2) : 1 + -y * 0.2, y, y, (X, Y, Z) => H(X, Y, Z) < 0.2 ? mul(c, 0.8) : H(X, Y, Z) < 0.35 ? -1 : c); } return g; }
  function rug() { const g = G(); g.box(-34, 0, -22, 34, 0, 22, (x, y, z) => Math.abs(x) > 31 || Math.abs(z) > 19 ? 0xc8a858 : Math.abs(x) > 28 || Math.abs(z) > 16 ? 0x7a2c34 : ((Math.abs(x) + Math.abs(z)) % 12 < 2 ? 0xd8b868 : 0x98404a)); return g; }

  class Farm extends STAGE.Stage {
    constructor(scene) {
      super(scene, 'farm');
      this.farColor = 0x76a850;
      const road = (x, z) => Math.abs(x - 0.5 - (z > 20 ? Math.sin((z - 20) * 0.05) * 3 * Math.min(1, (z - 20) / 20) : 0));
      const yard = (x, z) => { const d = Math.max(Math.abs(x - 1) - 10.5, Math.abs(z - 3) - 7.5); return d + (H(R(x * 2), R(z * 2), 3) - 0.5) * 0.9; };
      const field = (x, z) => x > 15.5 && z > -22 && z < 40 ? 'wheat' : x < -24 && z > 14 ? 'wheat' : z > 17 && x < -6 && x > -23 ? 'plough' : z > 17 && x > 5 && x < 15 ? 'young' : '';
      const garden = (x, z) => x > -15.2 && x < -9.6 && z > 4.6 && z < 9.6;
      const ground = (x, z, px, py) => {
        const n = H(px, py, 7), n2 = H(R(x * 1.6), R(z * 1.6), 3), rd = road(x, z);
        if (garden(x, z)) return ((Math.floor(z * 2.2)) & 1) ? (n < 0.3 ? 0x5a4030 : 0x664a38) : (n < 0.3 ? 0x6e523e : 0x7a5c46);
        if (z > 9 && rd < 1.5) { const rut = Math.abs(Math.abs(x - 0.5 - (z > 20 ? Math.sin((z - 20) * 0.05) * 3 * Math.min(1, (z - 20) / 20) : 0)) - 0.75) < 0.16; return rut ? (n < 0.4 ? 0x7c6348 : 0x856a4e) : rd < 0.35 ? (n < 0.3 ? 0x7a9a50 : 0x948050) : n < 0.35 ? 0x9c8260 : n < 0.7 ? 0xa48a68 : 0x927858; }
        const y = yard(x, z);
        if (y < 0) return n < 0.12 ? 0xb8a280 : n < 0.5 ? 0xa48c68 : n < 0.9 ? 0x9c8460 : 0x8a7454;
        const f = field(x, z);
        if (f === 'wheat') return n < 0.5 ? 0xb8984a : 0xa88a42;
        if (f === 'plough') return (Math.floor((x + 200) / 0.36) & 1) ? (n < 0.4 ? 0x6b4e36 : 0x735640) : (n < 0.4 ? 0x7a5a3e : 0x846548);
        if (f === 'young') return (Math.floor((x + 200) / 0.4) & 1) ? 0x7da84c : (n < 0.4 ? 0x7a5c40 : 0x846548);
        let c = n2 < 0.35 ? 0x5f9a45 : n2 < 0.75 ? 0x69a44c : 0x74ae54;
        if (y < 0.5) c = n < 0.5 ? 0x8a9a56 : c;
        if (n < 0.004) c = 0xf3eefb; else if (n < 0.007) c = 0xf0d04a; else if (n < 0.1) c = mul(c, 0.9);
        return c;
      };
      this.paintCore(-24.576, -14.0, 2048, ground);
      this.paintGround(190, 1024, 0, 40, (x, z, px, py) => {
        const f = field(x, z); if (Math.max(Math.abs(x), Math.abs(z - 8)) < 26 || road(x, z) < 2 && z > 9) return ground(x, z, px, py);
        if (f) return ground(x, z, px, py);
        const k = H(Math.floor((x + 200) / 16), Math.floor((z + 200) / 13), 2), n = H(px, py, 7);
        return mul(k < 0.4 ? 0x69a44c : k < 0.6 ? 0xcaa850 : k < 0.75 ? 0x7a5a3e : 0x7da84c, 0.93 + n * 0.12);
      });
      const P = (name, make, s, x, z, ry, o) => this.put(name, make, s, x, z, ry, o);
      // the cottage, the barn
      P('cottage', () => K.houseGrid({ W: 34, D: 26, floors: 2, plaster: 0xeee4cc, roof: 'thatch', shutter: 0x4a7a8a, door: 2, sides: 'LR', seed: 21 }), SB, -7.5, -8.2, 0, { name: 'cottage' });
      this.block(-11.9, -11.8, -3.1, -4.7);
      P('barn', barnGrid, SB, 11.2, -8.5, 0, { ao: false }); this.block(7.4, -13.2, 15.0, -3.8);
      // the yard
      P('well', T.well, S1, 4.2, 0.4, 0.4); this.col(4.2, 0.4, 0.8); this.marks.well = [4.2, 0.4];
      P('trough', troughGrid, S1, 8.2, -2.6, 0); this.col(8.0, -2.6, 0.5); this.col(8.7, -2.6, 0.5); this.marks.trough = [8.2, -2.6];
      P('logs', T.woodpile, S1, -3.0, -3.9, 0); this.col(-2.4, -3.9, 0.6); this.col(-3.6, -3.9, 0.5); this.col(-1.8, -3.8, 0.4);
      P('barrel', T.barrel, S1, -11.2, -3.9, 0); this.col(-11.2, -3.9, 0.4); P('barrel', T.barrel, S1, 7.1, -3.3, 0.6); this.col(7.1, -3.3, 0.4);
      P('crate', () => T.crate(), S1, 14.0, -3.0, 0.2); this.col(14.0, -3.0, 0.45); P('bale', T.bale, S1, 13.1, -2.8, 0.3); this.col(13.1, -2.8, 0.6); P('bale2', T.bale, S1, 13.4, -2.1, 1.3); this.col(13.4, -2.1, 0.6);
      P('hay', () => T.hay(24, 30, 24, 3), SB, 13.6, 1.6, 0, { ao: false }); this.col(13.6, 1.6, 1.3);
      P('laundry', () => T.laundry(150, 2), S1, -12.9, -2.6, HP, { y: 1.75 }); for (const z of [-4.5, -0.7]) { P('lpost', () => { const g = G(); g.box(-1, 0, -1, 1, 76, 1, OAK_D); g.box(-1, 74, -8, 1, 75, 8, OAK_D); return g; }, S1, -12.9, z, HP); this.col(-12.9, z, 0.15); }
      ['blue', 'red'].forEach((c, i) => P('pot_' + c, () => T.pot(c), S1, -8.6 + i * 2.9, -4.45, 0, { near: true }));
      P('bench', T.bench, S1, -9.9, -4.25, 0); this.col(-9.9, -4.25, 0.6); this.seats.push({ x: -9.9, z: -4.1, yaw: 0, h: 0.5 });
      // hen yard (west): a coop, a low fence
      P('coop', coopGrid, S1, -13.2, 11.8, 0); this.block(-14.0, 11.3, -12.4, 12.35);
      this.marks.hens = [-10.6, 12.6]; this.hens = 6; this.kind('hen_w', () => T.hen(0xf1ece2), S1); this.kind('hen_b', () => T.hen(0xa8683a), S1);
      for (let i = 0; i < 6; i++) this.place(i % 2 ? 'hen_b' : 'hen_w', -11.6 + (i % 3) * 1.1, 11.9 + i * 0.35, i * 1.3, { name: 'hen_' + i });
      // beehives, the vegetable garden
      for (let i = 0; i < 3; i++) { P('skep', skepGrid, S1, -16.2, 5.4 + i * 1.3, HP, { y: 0.29 }); this.col(-16.2, 5.4 + i * 1.3, 0.4); }
      this.marks.bees = [-16.2, 6.7];
      P('cabbage', cabbageGrid, S1, -14.6, 5.2, 0); for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) if (i + j) this.place('cabbage', -14.6 + j * 0.62, 5.2 + i * 0.95, (i * 3 + j) * 0.8, { near: true });
      this.block(-15.0, 4.8, -9.8, 9.3);
      // fences: round the yard, the hen yard, along the road
      const fence = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), n = R(L / 2), ry = Math.atan2(-(z1 - z0), x1 - x0); for (let i = 0; i < n; i++) P('rail', railGrid, S1, x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n, ry); this.wall(x0, z0, x1, z1, 0.16); };
      fence(-17, 14, -1.5, 14); fence(2.5, 14, 15, 14); fence(15, 14, 15, -2); fence(-17, 10.4, -8.6, 10.4); fence(-8.6, 10.4, -8.6, 11.4); fence(-8.6, 12.9, -8.6, 14);
      fence(-1.5, 15, -1.5, 21); fence(2.5, 15, 2.5, 21);
      for (const x of [-1.5, 2.5]) { P('gatepost', gatePost, S1, x, 14.2, 0); this.col(x, 14.2, 0.25); }
      P('sign', signGrid, S1, 3.4, 15.2, 0.2); this.col(3.4, 15.2, 0.2); this.marks.sign = [3.4, 15.2];
      for (const z of [32, 52, 74]) P('mile', milestone, S1, 3.2, z, -0.2);
      P('scarecrow', scarecrowGrid, S1, 20.5, 6.5, -0.7);
      // the oak on the west side, the swing
      P('oak', oakGrid, SB, -20.4, -2.2, 0, { ao: false }); P('oakc0', () => oakCrown(1, 24), 0.096, -20.4, -2.2, 0.2, { y: 6.6 }); P('oakc1', () => oakCrown(5, 17), 0.096, -18.2, -3.6, 1.4, { y: 5.7 }); P('oakc2', () => oakCrown(9, 17), 0.096, -22.4, 0.2, 2.4, { y: 5.6 });
      this.col(-20.4, -2.2, 0.95); this.marks.oak = [-20.4, -2.2]; P('swing', swingGrid, S1, -17.5, -0.6, 0.5, { name: 'swing', y: 3.6 });
      P('stump', () => { const g = G(); g.disc(0, 0, 8, 0, 15, (x, y, z) => y === 15 ? (Math.floor(Math.hypot(x, z)) & 1 ? 0xd8b07a : 0xc09860) : H(x, y >> 2, z) < 0.3 ? 0x4a3626 : 0x5c4430); return g; }, S1, -17.2, 2.2, 0); this.col(-17.2, 2.2, 0.25); this.marks.stump = [-17.2, 2.2];
      for (const [x, z, s] of [[18, -19, 1], [-16, -17, 1], [6, -20, 2], [-2, -21, 1]]) { P('tree', K.treeGrid, SB, x, z, s, { ao: false }); P('crown' + (s & 1), () => K.crownGrid(s * 3), 0.096, x, z, s); }
      // grass, flowers and wheat
      const seed = (() => { let q = 4242; return () => (q = (q * 16807) % 2147483647) / 2147483647; })();
      const grass = [], fl = [[], []], wheat = [[], [], []];
      for (let i = 0; i < 2600; i++) { const x = -24 + seed() * 39, z = -13.5 + seed() * 34; if (yard(x, z) < 0.3 || (z > 9 && road(x, z) < 1.7) || garden(x, z) || field(x, z) || (x > -12.2 && x < -2.8 && z > -12 && z < -4.4) || (x > 7 && x < 15.2 && z < -3.5 && z > -13.5)) continue; (i % 9 === 0 ? fl[i % 2] : grass).push([x, z, seed() * 6.28, 0.8 + seed() * 0.7]); }
      for (let i = 0; i < 2300; i++) { const x = 15.8 + seed() * 13, z = -8 + seed() * 30; wheat[0].push([x, z, seed() * 6.28, 0.85 + seed() * 0.3]); }
      for (let i = 0; i < 900; i++) wheat[1].push([3.6 + seed() * 12, 24 + seed() * 16, seed() * 6.28, 0.85 + seed() * 0.3]);
      for (let i = 0; i < 900; i++) wheat[2].push([-15 + seed() * 12, 34 + seed() * 22, seed() * 6.28, 0.85 + seed() * 0.3]);
      this.scatter('tuft', tuftGrid, S1, grass, 30); this.scatter('fl0', () => flowerGrid(0xf3eefb), S1, fl[0], 30); this.scatter('fl1', () => flowerGrid(0xf08ab0), S1, fl[1], 30);
      wheat.forEach((w, i) => this.scatter('wheat' + i, wheatGrid, SB, w, 0));
      this.country({ trees: 50, treeR: 48, at: [0, 10], seed: 77, clear: (x, z) => (Math.abs(x) < 9 && z > 20) || (x > -30 && x < 30 && z > -20 && z < 40) });
      P('windmill', K.windmillGrid, 0.12, 46, 30, -HP - 0.5, { noCast: true });
      this.walk = [[-23, -3.8, 14.8, 13.8], [-3.0, -4.6, 7.3, 0], [-1.3, 13, 2.3, 21], [-23.5, -12, -12.2, 4], [-16.8, 10.6, -8.8, 13.8]];
      this.door = [-7.0, -4.5];

      /* ---- the kitchen ---- */
      const x0 = KX - KW * SB / 2, z0 = KZ - KD * SB / 2, w = KW * SB, d = KD * SB;
      this.kitchen = { x: KX, z: KZ, w, d, h: KH * SB };
      P('kn', () => kWall(KW, [[100, 122, 0, 45]], 0), SB, x0, z0, 0);                                                    // north: the door
      P('kw', () => kWall(KD, [[36, 78, 20, 44]], 4), SB, x0, z0 + d, HP);                                                  // west: the wide window
      P('ke', () => kWall(KD, [], 9), SB, x0 + w, z0, -HP);
      P('ks', () => kWall(KW, [[20, 48, 20, 42]], 2), SB, x0 + w, z0 + d, Math.PI, { name: 'kitchen_south' });
      P('kdoor', () => { const g = G(); g.box(0, 0, 0, 45, 90, 2, (x, y, z) => x % 9 === 0 ? mul(OAK, 0.7) : H(Math.floor(x / 9), 2, 2) < 0.4 ? OAK_L : OAK); for (const y of [12, 74]) g.box(0, y, 3, 40, y + 3, 3, 0x3a3a42); g.box(40, 44, 3, 41, 47, 4, 0xc8a24a); return g; }, S1, x0 + 100 * SB, z0 - 0.1, 0, { name: 'kitchen_door' });
      P('kceil', kCeil, SB, x0, z0, 0, { y: KH * SB + 0.02, name: 'kitchen_ceiling' });
      P('kfloor', () => { const g = G(); g.box(0, -1, 0, KW - 1, -1, KD - 1, (x, y, z) => z % 7 === 0 ? 0x6a4c34 : H(Math.floor(z / 7), x >> 5, 3) < 0.35 ? 0x8a6444 : 0x96704c); return g; }, SB, x0, z0, 0);
      P('hearth', hearthGrid, SB, x0 + w, KZ - 0.2, -HP); this.marks.hearth = [x0 + w - 0.36, KZ - 0.2];
      P('table', tableGrid, S1, KX - 0.2, KZ + 0.25, 0); P('chair', chairGrid, S1, KX - 0.8, KZ - 0.55, 0); this.place('chair', KX + 0.4, KZ - 0.55, 0); this.place('chair', KX - 0.8, KZ + 1.05, Math.PI); this.place('chair', KX + 0.4, KZ + 1.05, Math.PI); this.place('chair', KX - 1.65, KZ + 0.25, HP);
      P('dresser', dresserGrid, S1, KX - 1.4, z0 + 0.24, 0); P('herbs', herbs, S1, KX + 0.5, z0 + 2.4, 0, { y: KH * SB - 0.36 }); this.place('herbs', KX - 1.6, z0 + 4.1, 0.1, { y: KH * SB - 0.36 });
      P('rug', rug, S1, KX + 2.1, KZ + 0.1, HP, { y: 0.012 });
      P('kbarrel', T.barrel, S1, x0 + 0.5, z0 + 0.5, 0); P('ksacks', T.sacks, S1, x0 + 0.5, z0 + d - 0.6, 0.4); P('kbasket', () => T.basket('veg'), S1, KX + 3.0, z0 + 0.5, 0.4);
      P('stool', CAST.props.stool, S1, x0 + w - 1.1, KZ + 1.2, 0);
      this.light(x0 + w - 0.7, 0.55, KZ - 0.2, 0xff9a4a, 2.2, 6.0, 'hearth'); this.light(KX - 0.2, 1.75, KZ + 0.2, 0xffcf8a, 0.9, 4.0, 'lamp');
      P('lamp', () => { const g = G(); for (let y = 8; y < 30; y++) g.set(0, y, 0, 0x3a3a42); g.disc(0, 0, 4, 0, 0, 0x3a3a42); g.disc(0, 0, 2, 1, 4, VX.glow(0xffd88a)); for (let k = 0; k < 4; k++) g.box(R(Math.cos(k * HP) * 3), 1, R(Math.sin(k * HP) * 3), R(Math.cos(k * HP) * 3), 5, R(Math.sin(k * HP) * 3), 0x3a3a42); g.disc(0, 0, 4, 6, 7, 0x3a3a42); return g; }, S1, KX - 0.2, KZ + 0.2, 0, { y: KH * SB - 0.74 });
    }
  }
  window.FARM = Farm;
})();
