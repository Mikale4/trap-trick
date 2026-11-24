/* ============================================================================
   academy.js -- the Mage Academy above Thistlewick, a whole campus one can walk:
   the gatehouse, the court with its fountain and the astrolabe turning over it,
   the school (three floors round a stair hall: lecture rooms, the potions room,
   the library, the refectory, the bell tower), the glasshouse, the practice
   yard, two boarding houses, the observatory, a pond. And Reiner's room in Owl
   House, a room of its own off at (RX, RZ).

   x east, z south. Buildings 4.8 cm, furniture 2.4 cm, the far off coarser.
   Besides what's seen it lists what the game needs: the floors and stairs one
   walks on (floors, ramps), walls (blocks), doors, rooms with their seats, the
   paths people take (nav), places to loiter (spots) and things to read (signs).
   ========================================================================== */
(function () {
  'use strict';
  const H = VX.hash3, TAU = Math.PI * 2, HP = Math.PI / 2, R = Math.round, { S1, SB } = STAGE, K = window.TOWN_KIT, T = window.THINGS;
  const mul = (c, k) => { const f = s => Math.max(0, Math.min(255, Math.round(((c >> s) & 255) * k))); return (f(16) << 16) | (f(8) << 8) | f(0); };
  const G = () => { const g = new VX.Grid(); g.jit = 0; g.merge = true; return g; };
  const OAK = 0x8a5a32, OAK_D = 0x6b4426, OAK_L = 0xa8743e, DARK = 0x4a3020, BRASS = 0xc8a24a, IRON = 0x3a3a42, GREEN = 0x24564e, GOLD = 0xd0a850;
  const FY = [0.048, 3.648, 7.248], FH = 75, RX = 600, RZ = 0;

  /* ------------------------------------------------------------ finishes -- */
  const ASH = [0xc2b8a6, 0xb6ac9a, 0xcabfae, 0xada392, 0xbdb4a4], MORT = 0x978d7e;
  const ashlar = (a, y) => { const row = Math.floor(y / 7), off = (row & 1) * 7, i = Math.floor((a + off + 700) / 14); if (y % 7 === 6 || (a + off + 700) % 14 === 0) return MORT; return ASH[Math.floor(H(i, row, 3) * 5)]; };
  const hallIn = (a, y) => y < 2 ? 0x3e2a1c : y < 22 ? (a % 16 === 0 ? 0x4a3222 : y === 20 || y === 4 ? 0x6e4c32 : 0x5e402a) : y < 24 ? 0x7a5638 : y > 70 ? 0x8a7a62 : 0xe6dcc6;
  const roomIn = c => (a, y) => y < 2 ? 0x3e2a1c : y < 18 ? (a % 12 === 0 ? 0x4e3624 : 0x664630) : y === 18 ? 0x7e5a3c : y > 71 ? mul(c, 0.8) : c;
  const CREAM = roomIn(0xe8dfca), SAGE = roomIn(0xc4ceb4), BLUE = roomIn(0x9aa8c4), ROSE = roomIn(0xdcc4b4);

  /* a wall 6 voxels thick along +x, its front (z 5) facing +z. holes: { a0, a1, y0, y1, t: win | door | open, arch } */
  function wallGrid(len, h, holes, front, back, o) {
    o = o || {};
    const g = G();
    const inH = (x, y) => holes.some(q => { if (x < q.a0 || x > q.a1 || y < q.y0 || y > q.y1) return false; if (!q.arch) return true; const r = (q.a1 - q.a0 + 1) / 2, cx = (q.a0 + q.a1) / 2, yy = q.y1 + 0.5 - r; return y <= yy || (x - cx) ** 2 + (y - yy) ** 2 <= r * r; });
    g.inside = (x, y, z) => x >= 0 && x < len && y >= 0 && y < h && z > 0 && z < 5 && !inH(x, y);
    for (let x = 0; x < len; x++) for (let y = 0; y < h; y++) {
      if (inH(x, y)) continue;
      g.set(x, y, 5, front(x, y)); g.set(x, y, 0, back(x, y));
      if (x === 0 || x === len - 1 || y === h - 1 || (y === 0 && o.foot) || inH(x + 1, y) || inH(x - 1, y) || inH(x, y + 1) || inH(x, y - 1)) for (let z = 1; z < 5; z++) g.set(x, y, z, o.edge || 0xb0a692);
    }
    for (const q of holes) {
      const near = (x, y) => !inH(x, y) && (inH(x - 1, y) || inH(x + 1, y) || inH(x, y - 1) || inH(x, y + 1) || inH(x - 1, y - 1) || inH(x + 1, y - 1));
      for (let x = q.a0 - 1; x <= q.a1 + 1; x++) for (let y = Math.max(0, q.y0 - 1); y <= q.y1 + 1; y++) if (near(x, y)) { if (o.outF) g.set(x, y, 6, 0xd8cebc); else if (q.t !== 'win') g.set(x, y, 6, OAK_D); if (o.outB) g.set(x, y, -1, 0xd8cebc); else g.set(x, y, -1, OAK_D); }
      if (q.t === 'win') {
        const cx = (q.a0 + q.a1) / 2;
        for (let x = q.a0; x <= q.a1; x++) for (let y = q.y0; y <= q.y1; y++) if (inH(x, y) && (R(x - cx) === 0 || (y - q.y0) % 11 === 10 || x === q.a0 || x === q.a1 || y === q.y0 || (y > q.y1 - 12 && !inH(x, y + 1)))) g.set(x, y, 2, R(x - cx) === 0 ? 0x3a3630 : 0x46423a);
        g.box(q.a0 - 2, q.y0 - 2, o.outF ? 5 : -2, q.a1 + 2, q.y0 - 2, o.outF ? 7 : 0, 0xd8cebc);
      }
    }
    return g;
  }
  const boards = (c, c2) => (x, z) => z % 6 === 0 ? mul(c, 0.72) : H(Math.floor(z / 6), (x + Math.floor(z / 6) * 17) >> 5, 3) < 0.4 ? c2 : c;
  const tiles = (x, z) => ((Math.floor(x / 12) + Math.floor(z / 12)) & 1) ? (x % 12 === 0 || z % 12 === 0 ? 0x9a9084 : 0xc8beb0) : (x % 12 === 0 || z % 12 === 0 ? 0x5a6460 : 0x7c8a84);
  function slab(w, d, top, hole, ground) {                 // a floor: its top at row 0's top, the ceiling beneath with beams
    const g = G(), inH = (x, z) => hole && x >= hole[0] && x < hole[2] && z >= hole[1] && z < hole[3];
    g.inside = (x, y, z) => x >= 0 && x < w && z >= 0 && z < d && y < 0 && y > -5 && !inH(x, z);
    for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) {
      if (inH(x, z)) continue;
      g.set(x, 0, z, top(x, z)); if (ground) continue;
      g.set(x, -5, z, (z % 30) < 4 ? 0x5a3e28 : 0xe0d6c0);
      if (inH(x + 1, z) || inH(x - 1, z) || inH(x, z + 1) || inH(x, z - 1)) for (let y = -4; y < 0; y++) g.set(x, y, z, OAK_D);
      if ((z % 30) < 4) for (let y = -7; y < -5; y++) g.set(x, y, z, 0x54391f);
    }
    return g;
  }
  function stairGrid(n, run, wood) {                       // steps of 14.4 x 28.8 cm, 2.5 m wide, rising toward -z
    n = n || 25; run = run || 6; const g = G(), C1 = wood ? 0x9a7248 : 0xbfb5a4, C2 = wood ? 0xa8804e : 0xd8cebc, C3 = wood ? 0x7c583a : 0xa89e8c;
    for (let k = 0; k < n; k++) for (let x = 0; x < 52; x++) {
      const rug = !wood && x > 10 && x < 41;
      for (let z = 0; z < run; z++) { const Z = -(k * run + z); g.set(x, k * 3 + 2, Z, rug ? (x === 11 || x === 40 ? GOLD : 0x8a2c3a) : z === 0 ? C2 : C1); if (x === 0 || x === 51) for (let y = Math.max(0, k * 3 - 6); y <= k * 3 + 1; y++) g.set(x, y, Z, C3); }
      for (let y = 0; y < 2; y++) g.set(x, k * 3 + y, -(k * run), rug ? 0x7a2632 : C3);
      g.set(x, Math.max(0, k * 3 - 6), -(k * run + 3), mul(C3, 0.85));
    }
    g.inside = (x, y, z) => false;
    return g;
  }
  function railGrid(len, slope, run) {                     // a balustrade along -z (slope: rising with the stair)
    const g = G(); run = run || 6;
    for (let z = 0; z < len; z++) { const y0 = slope ? Math.floor(z / run) * 3 + 3 : 0; if (z % run === 2) g.box(0, y0, -z, 0, y0 + 17, -z, OAK_D); g.box(-1, y0 + 18 + (slope ? R((z % run) * 3 / run) : 0), -z, 1, y0 + 20 + (slope ? R((z % run) * 3 / run) : 0), -z, (x, y) => x === 0 ? OAK_L : OAK); }
    for (const z of [0, len - 1]) { const y0 = slope ? Math.floor(z / run) * 3 : 0; g.box(-2, y0, -z - 1, 2, y0 + 25, -z + 1, OAK_D); g.ell(0, y0 + 28, -z, 2.2, 2.2, 2.2, BRASS); }
    return g;
  }
  function doorGrid(w, h, c, win) {                        // a door leaf from its hinge along +x (2.4 cm)
    const g = G(), D = mul(c, 0.7);
    for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) {
      const glass = win && Math.hypot(x - w / 2 + 0.5, y - h * 0.72) < 8;
      if (glass) { const b = Math.abs(x - w / 2 + 0.5) < 1 || Math.abs(y - h * 0.72) < 1; g.set(x, y, 0, b ? IRON : 0x9ab0c0); continue; }
      const rim = win && Math.hypot(x - w / 2 + 0.5, y - h * 0.72) < 9.6, pan = x % 9 === 0 || x === w - 1 || y === 0 || y === h - 1;
      for (let z = -1; z <= 1; z++) g.set(x, y, z, rim ? BRASS : pan ? D : H(Math.floor(x / 9), 3, 8) < 0.4 ? mul(c, 0.94) : c);
    }
    for (const y of [10, h - 14]) for (const z of [-2, 2]) g.box(0, y, z, w - 10, y + 2, z, (x) => x > w - 14 && (x & 1) ? -1 : IRON);
    for (const z of [-2, 2]) { g.box(w - 5, 38, z, w - 4, 46, z, BRASS); g.set(w - 5, 41, z > 0 ? 3 : -3, BRASS); g.set(w - 4, 41, z > 0 ? 3 : -3, BRASS); }
    return g;
  }
  const PLATE = {};
  function plateGrid(c) { const g = G(); g.box(-9, 0, 0, 9, 7, 0, (x, y) => Math.abs(x) === 9 || y === 0 || y === 7 ? mul(BRASS, 0.75) : y === 4 && Math.abs(x) < 7 && x % 4 !== 0 ? DARK : y === 2 && Math.abs(x) < 4 ? c : BRASS); return g; }

  /* ----------------------------------------------------------- furniture -- */
  const woodTop = (x, z, n) => (z + 60) % n === 0 ? mul(OAK, 0.75) : H((z + 60) / n | 0, x >> 5, 3) < 0.4 ? OAK_L : OAK;
  function deskGrid(len) { const g = G(), h = len / 2 | 0; g.box(-10, 28, -h, 10, 30, h, (x, y, z) => y === 30 ? (x < -7 ? mul(OAK, 0.8) : woodTop(z, x, 5)) : OAK_D); for (const z of [-h + 3, 0, h - 4]) { g.box(-8, 0, z, -6, 27, z + 1, OAK_D); g.box(6, 0, z, 8, 27, z + 1, OAK_D); g.box(-8, 8, z, 8, 10, z + 1, OAK_D); } g.box(-9, 12, -h, -8, 27, h, (x, y, z) => z % 10 === 0 ? mul(OAK_D, 0.8) : OAK_D); for (let z = -h + 8; z < h; z += 42) { g.box(-9, 31, z, -8, 32, z + 1, 0x2a2430); g.line(-8, 33, z, -5, 39, z - 2, 0xf1ece2); } return g; }      // faces -x: pupils sit on its +x side
  function benchSeat(len) { const g = G(), h = len / 2 | 0; g.box(-6, 17, -h, 6, 18, h, (x, y, z) => y === 18 ? woodTop(z, x, 4) : OAK_D); for (const z of [-h + 4, h - 5]) g.box(-5, 0, z, 5, 16, z + 1, (x, y) => Math.abs(x) < 3 && y > 2 && y < 12 ? -1 : OAK_D); return g; }
  function boardGrid(len, marks) { const g = G(), h = len / 2 | 0; g.box(-h, 36, 0, h, 96, 1, (x, y) => Math.abs(x) > h - 3 || y < 38 || y > 93 ? OAK_D : H(x >> 3, y >> 3, 2) < 0.15 ? 0x2c443e : 0x26403a); g.box(-h, 34, 0, h, 35, 4, OAK); for (const x of [-20, -8, 12]) g.box(x, 36, 3, x + 2, 36, 3, 0xf4f0e8); const put = (x, y, c) => { if (Math.abs(x) < h - 3 && y > 38 && y < 93) g.set(x, y, 2, c || 0xe8ece4); }; marks(put, h); return g; }
  const circ = (put, cx, cy, r, c) => { const n = R(r * 7); for (let i = 0; i < n; i++) put(R(cx + Math.cos(i / n * TAU) * r), R(cy + Math.sin(i / n * TAU) * r), c); };
  const ln = (put, x0, y0, x1, y1, c) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5); for (let i = 0; i <= n; i++) put(R(x0 + (x1 - x0) * i / n), R(y0 + (y1 - y0) * i / n), c); };
  const script = (put, x0, x1, y, seed) => { for (let x = x0; x < x1; x++) { const q = H(x >> 2, y, seed); if (q < 0.2) continue; put(x, y + R((H(x, y, seed) - 0.5) * 2.2)); } };
  const BOARDS = {
    candle(put) { circ(put, -30, 66, 17); circ(put, -30, 66, 13); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + HP, b = (k + 2) / 6 * TAU + HP; ln(put, -30 + Math.cos(a) * 13, 66 + Math.sin(a) * 13, -30 + Math.cos(b) * 13, 66 + Math.sin(b) * 13, 0xffd88a); } ln(put, -32, 58, -32, 70, 0xffffff); ln(put, -28, 58, -28, 70, 0xffffff); ln(put, -32, 58, -28, 58); ln(put, -32, 70, -28, 70); ln(put, -30, 71, -30, 75, 0xffc04a); for (const y of [84, 76, 68, 60, 50]) script(put, 2, y === 50 ? 40 : 62, y, 3); ln(put, 2, 56, 50, 56, 0xffd88a); },
    moon(put) { for (const [x, r, f] of [[-60, 7, 0], [-36, 8, 1], [-10, 9, 2], [18, 8, 3], [44, 7, 4]]) { circ(put, x, 72, r); for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy < r * r && (f === 2 || (f === 1 && xx < -1) || (f === 3 && xx > 1) || (f === 0 && xx < -4) || (f === 4 && xx > 4))) if ((xx + yy) & 1) put(x + xx, 72 + yy); } ln(put, -70, 56, 60, 56); script(put, -66, 50, 48, 4); },
    map(put) { let x = -66, y = 60; for (let k = 0; k < 24; k++) { const nx = x + 5, ny = 60 + (H(k, 3, 2) - 0.5) * 34; ln(put, x, y, nx, ny, 0x9ad0b0); x = nx; y = ny; } for (let k = 0; k < 7; k++) { const a = -56 + k * 17, b = 50 + H(k, 8, 1) * 30; ln(put, a - 3, b, a, b + 6); ln(put, a, b + 6, a + 3, b); } script(put, -60, 10, 88, 8); },
    plant(put) { ln(put, -30, 44, -28, 80, 0x9ad07a); for (const [y, s, l] of [[56, 1, 16], [62, -1, 14], [70, 1, 12], [76, -1, 9]]) { ln(put, -29, y, -29 + s * l, y + 7, 0x9ad07a); ln(put, -29 + s * l, y + 7, -29 + s * l * 0.5, y + 1, 0x9ad07a); } circ(put, -28, 84, 5, 0xf0a0c0); for (const y of [84, 74, 64, 54]) script(put, 4, 58, y, 6); },
  };
  function lecternGrid() { const g = G(); g.box(-9, 0, -7, 9, 3, 7, OAK_D); g.box(-4, 4, -3, 4, 36, 3, (x, y) => Math.abs(x) === 4 ? OAK_D : OAK); for (let k = 0; k < 16; k++) g.box(-11, 37 + R(k * 0.35), -8 + k, 11, 39 + R(k * 0.35), -8 + k, (x) => Math.abs(x) === 11 ? OAK_D : OAK_L); g.box(-7, 41, -6, 7, 42, 5, (x, y, z) => y === 42 && x !== 0 && z % 2 === 0 ? 0xa89a90 : 0xf2e6cc); return g; }
  function teacherDesk() { const g = G(); g.box(-14, 30, -30, 14, 32, 30, (x, y, z) => y === 32 ? woodTop(z, x, 6) : OAK_D); for (const z of [-28, 12]) g.box(-12, 2, z, 12, 29, z + 16, (x, y, zz) => (y === 10 || y === 20) ? DARK : OAK); g.box(-13, 0, -29, -12, 29, 29, OAK_D); for (const [x, z, c] of [[4, -20, 0x7a2c34], [4, -20, 0x7a2c34]]) { g.box(x - 6, 33, z - 5, x + 6, 35, z + 5, c); g.box(x - 5, 36, z - 4, x + 5, 38, z + 5, GREEN); g.box(x - 5, 39, z - 5, x + 4, 40, z + 4, 0x6a5a8a); } g.disc(4, 20, 3, 33, 36, 0x4a6a9a); g.line(4, 37, 20, 7, 45, 22, 0xf1ece2); return g; }
  function shelfGrid(seed, w, hh) {                        // a bookcase against a wall, its face to +z
    const g = G(), h = w / 2 | 0, HH = hh || 92, COL = [0x7a2c34, 0x2c4a6a, 0x3a5a3a, 0x6a4a7a, 0x8a6a3a, 0x4a3a30, 0x9a4a2a, 0x24564e, 0xb89a62];
    g.box(-h, 0, 0, h, HH, 1, OAK_D); g.box(-h, 0, 2, h, 3, 12, OAK_D); g.box(-h, HH - 2, 2, h, HH, 13, OAK); for (const x of [-h, h - 1]) g.box(x, 0, 2, x + 1, HH, 12, OAK);
    for (let y = 4, k = 0; y < HH - 12; y += 18, k++) { g.box(-h, y + 15, 2, h, y + 16, 12, OAK); let x = -h + 2; while (x < h - 4) { const bw = 1 + Math.floor(H(x, k, seed) * 3), bh = 9 + Math.floor(H(x, k, seed + 1) * 5), c = COL[Math.floor(H(x, k, seed + 2) * 9)], q = H(x, k, seed + 3); if (q < 0.1) { x += 3; continue; } if (q > 0.96 && x < h - 9) { g.disc(x + 3, 7, 2.6, y, y + 8, (X, Y) => Y > 5 + y ? 0x9ab4a8 : 0x6a9a8a); x += 7; continue; } g.box(x, y, 3, x + bw - 1, y + bh, 10, (X, Y, Z) => Z < 10 ? mul(c, 0.8) : Y === y + bh - 2 || Y === y + 2 ? BRASS : c); x += bw; } }
    return g;
  }
  function longTable(len) { const g = G(), h = len / 2 | 0; g.box(-h, 28, -16, h, 30, 16, (x, y, z) => y === 30 ? woodTop(x, z, 8) : OAK_D); for (let x = -h + 8; x < h; x += (len - 18) / 3 | 0) { g.box(x - 2, 0, -12, x + 2, 27, 12, (X, y, z) => Math.abs(z) < 8 && y > 5 && y < 22 ? -1 : OAK_D); } g.box(-h + 8, 6, -1, h - 8, 8, 1, OAK_D); return g; }
  function settings(len) { const g = G(), h = len / 2 | 0; for (let x = -h + 16, k = 0; x < h - 8; x += 33, k++) for (const s of [-1, 1]) { g.disc(x, s * 9, 4.4, 0, 0, 0xd8d0c0); g.disc(x, s * 9, 3, 1, 1, 0xe8e0d0); if (H(k, s, 2) < 0.6) g.ell(x, 1.6, s * 9, 2, 0.8, 1.6, [0xc98a42, 0xb07a44, 0x8ab060][Math.floor(H(k, s, 5) * 3)]); g.disc(x + 6, s * 11, 1.4, 0, 4, OAK); } for (let x = -h + 30; x < h - 20; x += 90) { for (let y = 0; y < 5; y++) g.disc(x, 0, 6 + y * 0.4, y, y, (X, Y, Z) => Y > 0 && Math.hypot(X - x, Z) < 4.6 ? -1 : 0xb08850); for (const [a, b, c] of [[-2, 1, 0xc8303a], [2, 0, 0xd8a040], [0, -2, 0x8ab040], [0, 2, 0xc8303a]]) g.ell(x + a, 4, b, 1.7, 1.6, 1.7, c); g.ell(x + 26, 2, 0, 7, 2.6, 3.4, (X, Y) => Y >= 3 && (X + 300) % 4 === 0 ? 0xe8c890 : 0xc98a42); } return g; }
  function cauldron() { const g = G(); for (let y = 3; y <= 22; y++) { const r = 10 * Math.sin(Math.max(0.3, (y + 4) / 26 * Math.PI * 0.9)) + (y > 20 ? 1.5 : 0); g.disc(0, 0, r, y, y, (x, yy, z) => Math.hypot(x, z) < r - 1.6 ? (yy === 19 ? VX.glow(0x6ad89a) : yy < 19 ? 0x2a6a4a : -1) : yy === 21 ? 0x4a4a54 : 0x2c2c34); } for (const a of [0, 2.1, 4.2]) g.box(R(Math.cos(a) * 7) - 1, 0, R(Math.sin(a) * 7) - 1, R(Math.cos(a) * 7) + 1, 4, R(Math.sin(a) * 7) + 1, 0x2c2c34); return g; }
  function workTable() { const g = G(); g.box(-34, 32, -16, 34, 35, 16, (x, y) => y === 35 ? 0x5a5450 : OAK_D); for (const x of [-32, 30]) for (const z of [-14, 12]) g.box(x, 0, z, x + 2, 31, z + 2, OAK_D); g.box(-32, 10, -13, 32, 11, 13, OAK); for (const [x, z, c] of [[-28, 10, 0x6ad8b0], [-23, 11, 0xd86a9a], [-18, 10, 0xe8c24a], [26, 11, 0x8a6ad8], [20, 10, 0x6aa0e8]]) { g.disc(x, z, 1.6, 36, 39, c); g.box(x, 40, z, x, 42, z, 0xb0c4c0); g.set(x, 43, z, 0x8a5a32); } g.box(14, 36, -10, 22, 37, -2, 0x7a2c34); for (const x of [-20, 4]) g.disc(x, 0, 5, 12, 18, (X, Y) => Y === 18 ? 0x9a7a4a : 0x7a5a3a); return g; }
  function globe() { const g = G(); g.disc(0, 0, 7, 0, 1, OAK_D); g.box(-1, 2, -1, 1, 22, 1, OAK_D); g.ell(0, 32, 0, 8, 8, 8, (x, y, z) => H((x + 20) >> 2, (y + 4) >> 2, (z + 20) >> 2) < 0.4 ? 0x7aa05a : 0x4a7ab0); for (let k = 0; k < 40; k++) { const a = k / 40 * TAU; g.set(R(Math.cos(a) * 11), R(32 + Math.sin(a) * 11), 0, BRASS); } return g; }
  function armillary() { const g = G(); g.disc(0, 0, 12, 0, 2, OAK_D); g.box(-1, 3, -1, 1, 26, 1, BRASS); for (let k = 0; k < 140; k++) { const a = k / 140 * TAU; g.set(R(Math.cos(a) * 20), R(48 + Math.sin(a) * 20), 0, BRASS); g.set(R(Math.cos(a) * 20), R(48 + Math.sin(a) * 8), R(Math.sin(a) * 18), BRASS); g.set(R(Math.cos(a) * 14), 48, R(Math.sin(a) * 14), mul(BRASS, 0.8)); } g.ell(0, 48, 0, 4, 4, 4, VX.glow(0xffd88a)); g.ell(15, 52, 4, 1.6, 1.6, 1.6, 0x6aa0e8); g.ell(-10, 44, 9, 1.4, 1.4, 1.4, 0xd86a4a); return g; }
  function chandelier() { const g = G(); for (let y = 6; y < 34; y++) g.set(0, y, 0, IRON); for (let k = 0; k < 90; k++) { const a = k / 90 * TAU; g.box(R(Math.cos(a) * 18), 2, R(Math.sin(a) * 18), R(Math.cos(a) * 18), 4, R(Math.sin(a) * 18), IRON); } for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, x = R(Math.cos(a) * 18), z = R(Math.sin(a) * 18); g.box(x, 5, z, x, 10, z, 0xf6eeda); g.box(x, 11, z, x, 13, z, VX.glow(0xffc85a)); if (k < 4) g.line(x, 3, z, -x, 3, -z, IRON); } return g; }
  function sconce() { const g = G(); g.box(-2, 0, 0, 2, 8, 0, BRASS); g.box(0, 2, 1, 0, 3, 4, BRASS); g.disc(0, 5, 2.2, 4, 4, BRASS); g.box(0, 5, 5, 0, 9, 5, 0xf6eeda); g.box(0, 10, 5, 0, 12, 5, VX.glow(0xffc85a)); g.set(0, 13, 5, VX.glow(0xfff0b0)); return g; }
  function bannerGrid(c, e) { const g = G(); g.box(-22, 90, 0, 22, 91, 1, BRASS); for (let x = -20; x <= 20; x++) { const bot = Math.abs(x) < 20 ? R(Math.abs(Math.abs(x) - 10) * 0.9) : 10; for (let y = bot; y < 90; y++) g.set(x, y, 0, Math.abs(x) > 17 ? GOLD : (Math.cos(x * 0.5) < -0.6 ? mul(c, 0.88) : c)); } const P = (x, y, q) => g.set(x, y, 1, q); if (e === 'flame') { for (let y = 30; y < 46; y++) for (let x = -3; x <= 3; x++) P(x, y, 0xf6eeda); for (let y = 46; y < 66; y++) { const t = (y - 46) / 20, w = R(6 * Math.sin(Math.min(1, t * 1.6 + 0.25) * HP) * (1 - t) * 1.6); for (let x = -w; x <= w; x++) P(x, y, t < 0.5 && Math.abs(x) < w - 2 ? 0xfff0b0 : GOLD); } for (let x = -8; x <= 8; x++) for (let y = 26; y < 30; y++) P(x, y, GOLD); } else { for (let a = 0; a < 5; a++) for (let t = 0; t <= 1; t += 0.03) { const A = a / 5 * TAU + HP, r = 15 * t; for (let k = -2; k <= 2; k++) P(R(Math.cos(A) * r + Math.sin(A) * k * (1 - t)), R(50 + Math.sin(A) * r - Math.cos(A) * k * (1 - t)), GOLD); } } return g; }
  function noticeGrid() { const g = G(); for (const x of [-30, 28]) g.box(x, 0, 0, x + 2, 84, 2, OAK_D); g.box(-30, 36, 0, 30, 80, 1, (x, y) => Math.abs(x) > 27 || y < 39 || y > 77 ? OAK : H(x >> 1, y >> 1, 2) < 0.3 ? 0xb08a58 : 0xbc9664); for (let k = 0; k < 10; k++) g.box(-33 + k, 81 + R(k * 0.4), -4, 33 - k, 82 + R(k * 0.4), 6, k % 2 ? 0x6a5a4a : 0x7a6652); for (const [x, y, w, h, c] of [[-20, 46, 22, 28, 0xf2e6cc], [6, 58, 14, 16, 0xe8dcc0], [5, 42, 18, 11, 0xf6eeda], [24 - 4, 60, 6, 10, 0xd8e0d0]]) { g.box(x, y, 2, x + w, y + h, 2, (X, Y) => (Y - y) % 3 === 1 && X > x + 1 && X < x + w - 1 && H(X >> 1, Y, 3) < 0.8 && Y < y + h - 3 ? 0x8a7a80 : Y > y + h - 3 && Math.abs(X - x - w / 2) < 4 ? 0x7a2c34 : c); g.set(x + (w >> 1), y + h - 1, 3, 0xb83a3a); } return g; }
  function bedGrid(c) { const g = G(); g.box(-20, 8, -42, 20, 12, 42, OAK_D); for (const x of [-20, 18]) for (const z of [-42, 40]) g.box(x, 0, z, x + 2, z < 0 ? 40 : 26, z + 2, OAK_D); g.box(-20, 12, -42, 20, 38, -41, OAK); g.box(-18, 13, -40, 18, 18, 40, 0xf1ece2); g.box(-12, 19, -38, 12, 22, -26, 0xfaf6ee); g.box(-19, 18, -22, 19, 20, 41, (x, y, z) => (Math.floor((x + 60) / 8) + Math.floor((z + 60) / 8)) & 1 ? c : mul(c, 0.82)); g.box(-19, 12, 41, 19, 17, 42, c); return g; }
  function bellGrid() {                                    // hangs from its crown at the origin, the mouth below: it swings from the top
    const g = G(), Y = -30;
    for (let y = 0; y <= 24; y++) { const t = y / 24, r = y < 3 ? 14 - y * 0.6 : 8 + (1 - t) * 4.4; if (y > 21) g.disc(0, 0, 8 - (y - 21) * 2, Y + y, Y + y, BRASS); else g.disc(0, 0, r, Y + y, Y + y, (x, yy, z) => Math.hypot(x, z) < r - 1.8 ? -1 : y === 8 || y === 9 || y === 18 ? 0xf0d080 : y < 2 ? mul(BRASS, 0.85) : BRASS); }
    for (const x of [-3, 2]) g.box(x, Y + 24, -1, x + 1, 0, 1, IRON); g.box(-3, -1, -1, 3, 0, 1, IRON); g.box(-5, 0, -2, 5, 2, 2, OAK_D);
    for (let k = 0; k < 12; k++) { const q = k / 12 * TAU; if (k % 3 === 0) for (let d = 0; d < 3; d++) g.set(R(Math.cos(q) * (11 - 0.3 * d)), Y + 12 + d, R(Math.sin(q) * (11 - 0.3 * d)), VX.glow(0xbff4ea)); }
    return g;
  }
  function clapperGrid() { const g = G(); g.box(0, -27, 0, 0, -6, 0, IRON); g.ell(0, -30, 0, 2.6, 3, 2.6, (x, y) => y > -30 ? 0x5a5a64 : IRON); return g; }

  /* ------------------------------------------------------- big pieces -- */
  function roofGrid(w, d, rise) {                          // a steep slate roof along x, centred (9.6 cm)
    const g = G(), hw = w / 2, hd = d / 2, SL = [0x4c5670, 0x444e66, 0x566078, 0x3e4860];
    g.inside = (x, y, z) => Math.abs(x) < hw - 6 && y < (hd - Math.abs(z)) * rise - 2 && y >= 0;
    for (let z = -hd; z <= hd; z++) { const y0 = R((hd - Math.abs(z)) * rise); for (let x = -hw; x <= hw; x++) { const row = Math.floor(y0 / 3), i = Math.floor((x + 700 + (row & 1) * 3) / 6); const tl = Math.floor((x + 700 + (row & 1) * 7) / 14), c = y0 % 3 === 0 ? 0x3a4256 : SL[Math.floor(H(tl, row, z > 0 ? 1 : 2) * 4)]; g.set(x, y0, z, c); if (Math.abs(z) === hd || Math.abs(x) === hw) g.set(x, y0 - 1, z, 0x343c50); if (Math.abs(z) < 2) g.set(x, y0 + 1, z, 0x6a7288); } }
    for (const s of [-1, 1]) for (let z = -hd + 6; z <= hd - 6; z++) for (let y = 0; y < (hd - Math.abs(z)) * rise - 2; y++) g.set(s * (hw - 6), y, z, ashlar(z + 300, y));
    for (const x of [-hw, hw]) g.box(x, R(hd * rise) + 1, -1, x, R(hd * rise) + 9, 1, (X, y, z) => z === 0 || y < 6 && y > 2 ? BRASS : -1);
    return g;
  }
  function towerGrid() {                                   // the bell tower over the hall: a shaft, the open belfry, a spire (9.6 cm)
    const g = G(), h = 34, arch = (a, y) => y > 91 && y < 150 && Math.abs(a) < 26 && (y < 130 || (a / 26) ** 2 + ((y - 130) / 19) ** 2 < 1);
    g.inside = (x, y, z) => Math.abs(x) < h && Math.abs(z) < h && (y < 88 || (y > 152 && y < 158));
    for (let y = 0; y < 156; y++) for (let a = -h; a <= h; a++) for (const s of [-1, 1]) { const b = y === 60 || y === 61 || y === 88 || y === 89 || y > 152; const c = b ? 0xd8cebc : Math.abs(a) > h - 5 && (Math.floor(y / 7) & 1) ? 0xcabfae : ashlar(a + 300, y); if (!arch(a, y)) { g.set(a, y, s * h, c); g.set(s * h, y, a, c); if (b) { g.set(a, y, s * (h + 1), 0xd8cebc); g.set(s * (h + 1), y, a, 0xd8cebc); } } if (arch(a, y) !== arch(a + 1, y) || arch(a, y) !== arch(a - 1, y) || arch(a, y + 1) !== arch(a, y)) for (let k = 1; k < 4; k++) if (!arch(a, y)) { g.set(a, y, s * (h - k), 0xb0a692); g.set(s * (h - k), y, a, 0xb0a692); } }
    for (const s of [-1, 1]) { for (let y = 64; y < 86; y++) for (let a = -10; a <= 10; a++) { const d = Math.hypot(a, y - 75); if (d < 10.6) { const tick = d > 8 && d < 9.6 && R(Math.atan2(a, y - 75) / TAU * 12 * 4) % 4 === 0; const hand = (Math.abs(a) < 1 && y > 74 && y < 83) || (Math.abs(y - 75) < 1 && a > -1 && a < 6); g.set(a, y, s * (h + 1), d > 9.4 ? BRASS : tick || hand ? 0x2a2430 : 0xf4ead0); } } }
    g.box(-h, 88, -h, h, 89, h, (x, y, z) => Math.abs(x) < h && Math.abs(z) < h ? 0x8e8474 : 0xd8cebc); g.box(-h + 1, 152, -h + 1, h - 1, 153, h - 1, 0x5a3e28); g.box(-h + 1, 149, -2, h - 1, 151, 2, (x, y, z) => x % 12 === 0 ? IRON : OAK_D);      // the beam the bell hangs on
    for (let x = -h; x <= h; x++) for (const s of [-1, 1]) if ((x + 60) % 8 < 5) { g.box(x, 156, s * h, x, 161, s * h, ashlar(x + 60, 140)); g.box(s * h, 156, x, s * h, 161, x, ashlar(x + 60, 140)); }
    for (let y = 156; y < 270; y++) { const r = 30 * (1 - (y - 156) / 114); for (let x = -31; x <= 31; x++) for (let z = -31; z <= 31; z++) { const q = Math.max(Math.abs(x), Math.abs(z), (Math.abs(x) + Math.abs(z)) * 0.7071); if (q <= r + 0.5 && q > r - 2) { const row = Math.floor(y / 4); g.set(x, y, z, (y % 4 === 0) ? 0x343c50 : [0x4c5670, 0x444e66, 0x566078][Math.floor(H((x + z + 100) >> 2, row, 1) * 3)]); } } }
    g.box(0, 270, 0, 0, 286, 0, BRASS); g.ell(0, 274, 0, 2, 2, 2, BRASS); g.box(-3, 282, 0, 3, 282, 0, BRASS);
    return g;
  }
  function porchGrid() {                                   // the portal: steps, two clustered columns, a gable with the flame in it
    const g = G();
    for (let k = 0; k < 1; k++) g.box(-66, 0, 0, 66, 0, 42, (x, y, z) => ((x + 70) % 22 === 0 || z % 14 === 0) ? 0xa89e8c : 0xc8beac);
    for (const s of [-1, 1]) { g.box(s * 46, 1, 22, s * 34, 4, 34, 0xb0a692); for (let y = 5; y < 74; y++) for (const [dx, dz, r] of [[0, 0, 3.4], [4, 4, 1.6], [-4, 4, 1.6], [4, -4, 1.6], [-4, -4, 1.6]]) g.disc(s * 40 + dx, 28 + dz, r, y, y, y % 24 === 0 ? 0xd8cebc : 0xbfb5a4); g.box(s * 47, 74, 21, s * 33, 78, 35, 0xd8cebc); g.box(s * 46, 79, 0, s * 34, 84, 34, (x, y, z) => ashlar(z + x + 100, y)); }
    const arch = (x, y) => Math.abs(x) < 34 && (x * x) / 1156 + ((y - 70) ** 2) / 500 < 1 && y < 93;
    for (let x = -48; x <= 48; x++) for (let y = 74; y < 134; y++) { if (y > 92 + (48 - Math.abs(x)) * 0.86) continue; if (arch(x, y)) continue; g.set(x, y, 34, y > 89 + (48 - Math.abs(x)) * 0.86 ? 0xd8cebc : ashlar(x + 200, y)); g.set(x, y, 30, 0xb0a692); if (arch(x, y - 1) || arch(x + 1, y) || arch(x - 1, y)) for (let z = 31; z < 34; z++) g.set(x, y, z, 0xd8cebc); }
    for (let z = -2; z < 38; z++) for (let x = -52; x <= 52; x++) { const y = R(96 + (52 - Math.abs(x)) * 0.86); for (let q = 0; q < 2; q++) g.set(x, y + q, z, ((z + 4) % 6 === 0) ? 0x343c50 : H(x >> 2, z >> 2, 4) < 0.5 ? 0x4c5670 : 0x444e66); }
    for (let y = 98; y < 122; y++) { const t = (y - 98) / 24, w = R(7 * Math.sin(Math.min(1, t * 1.5 + 0.25) * HP) * (1 - t) * 1.6); for (let x = -w; x <= w; x++) g.set(x, y, 35, t < 0.5 && Math.abs(x) < w - 2 ? VX.glow(0xffe9a8) : GOLD); }
    return g;
  }
  function dormerGrid() { const g = G(); g.box(-9, 0, -14, 9, 18, 8, (x, y, z) => z === 8 ? (Math.abs(x) < 6 && y > 3 && y < 16 ? (x === 0 || y === 10 ? 0x3a3630 : 0xffdc9a) : Math.abs(x) > 7 ? OAK_D : 0xe0d6c0) : Math.abs(x) === 9 ? 0xd8cebc : -1); for (let k = 0; k <= 11; k++) for (const s of [-1, 1]) g.box(s * (11 - k), 18 + k, -24, s * (11 - k), 19 + k, 10, (x, y, z) => z % 4 === 0 ? 0x343c50 : 0x4c5670); for (let k = 0; k < 10; k++) g.box(-9 + k, 19 + k, 8, 9 - k, 19 + k, 8, 0xe0d6c0); return g; }
  function bigWall() { const g = G(); g.inside = (x, y, z) => x >= 0 && x < 126 && y < 40 && z > -3 && z < 3; for (let x = 0; x < 126; x++) { for (let y = 0; y < 42; y++) for (const z of [-3, 3]) g.set(x, y, z, K.stoneAt(x, y, 9)); for (let z = -4; z <= 4; z++) g.set(x, 42, z, 0xbdb6ad); if (x % 9 < 5) for (let y = 43; y < 47; y++) for (let z = -3; z <= 3; z++) g.set(x, y, z, K.stoneAt(x, y, 2)); } for (const x of [8, 60, 112]) for (let y = 0; y < 32; y++) g.box(x, y, 4, x + 6, y, 9 - (y >> 3), (X, Y) => K.stoneAt(X, Y, 5)); return g; }      // 12 m (9.6 cm)
  function gateTower() { const g = G(); for (let y = 0; y < 78; y++) { const r = 17 + (y < 8 ? 2 : 0) + (y > 66 ? 2 : 0); for (let x = -21; x <= 21; x++) for (let z = -21; z <= 21; z++) { const d = Math.hypot(x, z); if (d <= r && d > r - 2.2) g.set(x, y, z, y > 70 && (Math.floor((Math.atan2(z, x) + Math.PI) * 5) & 1) ? -1 : y === 66 ? 0xd8cebc : Math.abs(x) < 2 && y > 34 && y < 48 ? 0x2a2a34 : K.stoneAt(R(Math.atan2(z, x) * r) + 100, y, 7)); } } for (let y = 72; y < 112; y++) { const r = 19 * (1 - (y - 72) / 40); g.disc(0, 0, r, y, y, (x, yy, z) => Math.hypot(x, z) < r - 2 ? -1 : yy % 4 === 0 ? 0x343c50 : H(x >> 2, yy >> 2, z >> 2) < 0.5 ? 0x4c5670 : 0x444e66); } return g; }
  function gateArch() { const g = G(); const arch = (x, y) => Math.abs(x) < 24 && (y < 34 || x * x + (y - 34) ** 2 < 576); for (let x = -34; x <= 34; x++) for (let y = 0; y < 72; y++) { if (arch(x, y)) continue; for (const z of [-8, 8]) g.set(x, y, z, y > 66 && ((x + 60) % 9 < 4) ? -1 : y === 64 || y === 65 ? 0xd8cebc : K.stoneAt(x + 60, y, 4)); if (arch(x + 1, y) || arch(x - 1, y) || arch(x, y - 1)) for (let z = -7; z < 8; z++) g.set(x, y, z, 0xa9a29a); } g.box(-34, 63, -8, 34, 64, 8, 0xa9a29a); for (let y = 60; y < 62; y++) g.box(-10, y, 9, 10, y, 9, GOLD); for (let y = 46; y < 60; y++) { const t = (y - 46) / 14, w = R(4.6 * (1 - t) * 1.5 * Math.sin(Math.min(1, t * 1.5 + 0.3) * HP)); g.box(-w, y, 9, w, y, 9, GOLD); } return g; }
  function gateLeaf() { const g = G(); for (let x = 0; x <= 46; x++) for (let y = 0; y <= 88; y++) { const bar = x % 6 === 0, rail = y < 3 || Math.abs(y - 40) < 2 || y > 82 - R((46 - x) * 0.25); if (y > 88 - R((46 - x) * 0.3)) continue; if (bar || rail) g.set(x, y, 0, IRON); } for (let k = 0; k < 60; k++) { const a = k / 60 * TAU; g.set(R(24 + Math.cos(a) * 9), R(60 + Math.sin(a) * 9), 0, BRASS); } for (let x = 0; x <= 46; x += 6) { g.set(x, 89 - R((46 - x) * 0.3), 0, BRASS); } return g; }      // 2.2 m (4.8 cm)
  function glasshouse() {                                  // an iron frame, brick foot, glass like a breath on the air: bars only, pale panes at the ridge
    const g = G(), W = 124, D = 74, HH = 60, IW = 0xe8ece4, bar = 8;
    for (let x = -W; x <= W; x++) for (let y = 0; y < HH; y++) for (const z of [-D, D]) { if (z === D && Math.abs(x) < 14 && y < 50) continue; if (y < 10) g.set(x, y, z, K.brickAt(x + 300, y)); else if ((x + 300) % 16 === 0 || y % 20 === 0 || y === HH - 1) g.set(x, y, z, IW); }
    for (let z = -D; z <= D; z++) for (let y = 0; y < HH; y++) for (const x of [-W, W]) if (y < 10) g.set(x, y, z, K.brickAt(z + 300, y)); else if ((z + 300) % 16 === 0 || y % 20 === 0 || y === HH - 1) g.set(x, y, z, IW);
    for (let z = -D; z <= D; z++) { const y = HH + R((D - Math.abs(z)) * 0.62); for (let x = -W; x <= W; x++) if ((x + 300) % 16 === 0 || Math.abs(z) < 2 || Math.abs(Math.abs(z) - D / 2) < 1) g.set(x, y, z, IW); }
    for (const x of [-W, W]) for (let z = -D; z <= D; z += 1) { const t = HH + R((D - Math.abs(z)) * 0.62); if ((z + 300) % 16 === 0) for (let y = HH; y < t; y++) g.set(x, y, z, IW); }
    for (let x = -W; x <= W; x += 16) if (Math.abs(x) > 14) g.box(x, HH + R(D * 0.62) + 1, 0, x, HH + R(D * 0.62) + 5, 0, IW);
    for (const s of [-1, 1]) g.box(s * 15, 0, D, s * 14, 50, D + 1, OAK_D); g.box(-15, 50, D, 15, 52, D + 1, OAK_D);
    return g;
  }
  function bedPlants(seed) { const g = G(); g.box(-44, 0, -16, 44, 26, 16, (x, y, z) => Math.abs(x) === 44 || Math.abs(z) === 16 ? (y % 9 === 0 ? mul(OAK, 0.7) : OAK) : y === 24 ? 0x4a3424 : -1); const rr = n => H(n, seed, 4); for (let k = 0; k < 20; k++) { const x = -40 + rr(k) * 80, z = -12 + rr(k + 50) * 24, h = 5 + rr(k + 90) * 16, c = [0x4f8f3a, 0x67a84a, 0x3f7a50, 0x7ab04a][k & 3], f = [0xf08ab0, 0x8a7af0, 0xf0d04a, 0x6ad8c8][(k + seed) & 3]; g.line(x, 25, z, x, 25 + h, z, c); for (let q = 0; q < 4; q++) { const a = rr(k * 4 + q) * TAU, l = 3 + rr(k + q) * 4; g.line(x, 25 + h * (0.4 + q * 0.14), z, x + Math.cos(a) * l, 27 + h * (0.4 + q * 0.14), z + Math.sin(a) * l, c); } if (k % 2) g.ell(x, 26 + h, z, 2, 1.6, 2, (k % 5) === 0 ? VX.glow(f) : f); else g.ell(x, 25 + h, z, 3, 2.4, 3, c); } return g; }
  function target() { const g = G(); for (const x of [-14, 13]) g.box(x, 0, -2, x + 1, 64, -1, OAK_D); g.box(-14, 20, -2, 14, 21, -1, OAK_D); for (let y = 24; y <= 64; y++) for (let x = -20; x <= 20; x++) { const d = Math.hypot(x, y - 44); if (d < 20.5) g.box(x, y, 0, x, y, 2, (X, Y, z) => z < 2 ? 0xd8b860 : d < 4 ? 0xe8c24a : d < 9 ? 0xb83a3a : d < 14 ? 0xf1ece2 : d < 19 ? 0x2c4a6a : 0x8a6a3a); } for (const [x, y] of [[8, 50], [-6, 38], [11, 34]]) g.ell(x, y, 2, 2, 2, 1, 0x2a2422); return g; }
  function dummy() { const g = G(); g.box(-1, 0, -1, 1, 66, 1, OAK_D); g.ell(0, 46, 0, 8, 12, 6, (x, y, z) => y % 7 === 0 ? 0x8a6a3a : H(x, y, z) < 0.2 ? 0xc0a058 : 0xd0b068); g.ell(0, 64, 0, 5, 5.5, 5, (x, y) => y === 62 ? 0x8a6a3a : 0xd0b068); g.box(-18, 50, -2, 18, 53, 2, 0xc0a058); g.disc(0, 0, 9, 0, 1, OAK_D); return g; }
  function observatory() { const g = G(); for (let y = 0; y < 110; y++) for (let x = -36; x <= 36; x++) for (let z = -36; z <= 36; z++) { const d = Math.hypot(x, z), r = y < 10 ? 36 : 33; if (d <= r && d > r - 2) { const a = R(Math.atan2(z, x) * r); g.set(x, y, z, y === 60 || y > 104 ? 0xd8cebc : y < 24 && Math.abs(x) < 6 && z > 0 ? 0x3a2a1c : (y > 70 && y < 88 && Math.floor((Math.atan2(z, x) + Math.PI) / TAU * 16) % 2 === 0 && Math.abs(a % 12) < 5) ? 0x2f3a52 : ashlar(a + 300, y)); } } for (let y = 110; y < 146; y++) { const r = Math.sqrt(Math.max(0, 36 * 36 - (y - 110) ** 2)); g.disc(0, 0, r, y, y, (x, yy, z) => Math.hypot(x, z) < r - 2 ? -1 : Math.abs(x) < 4 && z > -8 ? 0x1e2434 : R(Math.atan2(z, x) * 12) % 5 === 0 ? 0x4a8a7a : 0x5aa08e); } g.line(0, 120, 20, 0, 150, 48, BRASS, 2.2); return g; }
  function astro(r, w, c) { const g = G(); const n = r * 9; for (let k = 0; k < n; k++) { const a = k / n * TAU; for (let q = 0; q < w; q++) for (let z = 0; z < 2; z++) g.set(R(Math.cos(a) * (r - q)), R(Math.sin(a) * (r - q)), z, R(a / TAU * 24) % 2 === 0 || q ? c : 0xf0d080); } for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; g.ell(Math.cos(a) * r, Math.sin(a) * r, 0.5, 1.4, 1.4, 1.2, k % 3 === 0 ? VX.glow(0x8ae8d8) : c); } return g; }
  function lantern() { const g = G(); g.disc(0, 0, 4, 0, 0, BRASS); g.disc(0, 0, 3, 1, 7, (x, y, z) => Math.hypot(x, z) < 2.2 ? VX.glow(0xffe0a0) : (Math.abs(x) === 3 || Math.abs(z) === 3) && (x === 0 || z === 0) ? BRASS : VX.glow(0xffd080)); g.disc(0, 0, 4, 8, 8, BRASS); g.disc(0, 0, 2.4, 9, 10, BRASS); g.set(0, 11, 0, BRASS); g.set(0, 12, 0, BRASS); return g; }
  function founder() { const g = G(); for (let y = 0; y < 34; y++) { const w = y < 5 ? 18 : y > 29 ? 17 : 15; g.box(-w, y, -w, w, y, w, (x, yy, z) => Math.abs(x) === w || Math.abs(z) === w || yy === 33 || yy === 4 ? (yy > 12 && yy < 24 && z === w && Math.abs(x) < 10 ? (yy % 3 === 0 ? 0x5a4a2a : BRASS) : K.stoneAt(x + z + 100, yy, 3)) : -1); } const M = (x, y, z) => H(x >> 1, y >> 1, z >> 1) < 0.3 ? 0x8a9a92 : 0x9aaaa2; for (let y = 34; y < 86; y++) { const t = (y - 34) / 52, r = 10 - t * 4; g.ell(0, y, 0, r, 0.6, r * 0.8, (x, yy, z) => Math.cos(Math.atan2(z, x) * 9) < -0.5 ? 0x7a8a82 : M(x, yy, z)); } g.ell(0, 92, 0, 5, 6, 5, M); g.disc(0, 0, 10, 97, 97, M); for (let k = 0; k < 14; k++) g.disc(k > 8 ? (k - 8) : 0, 0, 6 - k * 0.4, 98 + k, 98 + k, M); g.line(-6, 78, 0, -14, 88, 6, M, 1.6); g.ell(-15, 92, 7, 2.4, 2.4, 2.4, VX.glow(0x9af0e0)); g.box(8, 36, 4, 8, 104, 4, 0x7a6a4a); g.line(6, 76, 0, 8, 74, 4, M, 1.6); return g; }

  /* ------------------------------------------------------------ campus -- */
  class Academy extends STAGE.Stage {
    constructor(scene) {
      super(scene, 'academy');
      this.farColor = 0x6aa64e; this.floors = []; this.ramps = []; this.slabs = []; this.doors = []; this.rooms = {}; this.spots = {}; this.signs = []; this.blocks = [];
      this.nodes = []; this.edges = []; this.nodeId = {};
      const P = (n, m, s, x, z, ry, o) => this.put(n, m, s, x, z, ry, o);
      this.grounds(P); this.school(P); this.furnish(P); this.around(P); this.dorm(P);
    }
    node(name, x, z, f) { this.nodeId[name] = this.nodes.length; this.nodes.push([x, typeof f === 'number' && f >= 0 ? (f >= 10 ? f - 10 : FY[f]) : 0, z]); return name; }
    link(a, b, door) { for (const n of [a, b]) if (this.nodeId[n] == null) throw new Error('nav ' + n); this.edges.push([this.nodeId[a], this.nodeId[b], door || '']); }
    warp(a, b) { this.edges.push([this.nodeId[a], this.nodeId[b], '~']); }
    chain(...l) { for (let i = 1; i < l.length; i++) this.link(l[i - 1], l[i]); }
    /* a wall with its holes; blocks for what is solid. dir x: from (x, z) along +x, front +z. dir z: along +z, front -x, (x) its east face */
    wallAt(x, z, dir, len, y, h, holes, front, back, o) {
      const name = 'wall_' + Object.keys(this.kinds).length;
      this.put(name, () => wallGrid(len, h, holes, front, back, o), SB, dir === 'x' ? x + SB / 2 : x - SB / 2, z + SB / 2, dir === 'x' ? 0 : -HP, { y });
      const doors = holes.filter(q => q.t !== 'win').sort((a, b) => a.a0 - b.a0); let a = 0;
      const bl = (a0, a1, y0, y1) => { if (a1 <= a0) return; this.blocks.push(dir === 'x' ? [x + a0 * SB, z, x + a1 * SB, z + 0.288, y0, y1] : [x - 0.288, z + a0 * SB, x, z + a1 * SB, y0, y1]); };
      for (const q of doors) { bl(a, q.a0, y, y + h * SB); bl(q.a0, q.a1 + 1, y + q.y1 * SB, y + h * SB); a = q.a1 + 1; }
      bl(a, len, y, y + h * SB);
    }
    /* a door in a wall: (x, z) the middle of the opening; dir as the wall's; w in 2.4 cm voxels per leaf */
    doorAt(id, x, z, dir, f, o) {
      const w = o.w || 46, h = o.h || 90, y = o.y != null ? o.y : FY[f], leafs = o.leafs || 1, W = w * S1 * leafs, kindN = 'door_' + w + '_' + h + '_' + (o.c || OAK) + (o.win === false ? 'n' : '');
      this.kind(kindN, () => doorGrid(w, h, o.c || OAK, o.win !== false), S1);
      const ry = dir === 'x' ? 0 : -HP, out = [];
      for (let k = 0; k < leafs; k++) { const s = k === 0 ? -1 : 1, px = x + (dir === 'x' ? s * W / 2 : 0), pz = z + (dir === 'x' ? 0 : s * W / 2); this.place(kindN, px, pz, ry + (k ? Math.PI : 0), { y, name: 'door_' + id + '_' + k }); out.push({ x: px, z: pz, ry: ry + (k ? Math.PI : 0) }); }
      const bk = dir === 'x' ? [x - W / 2, z - 0.1, x + W / 2, z + 0.1, y, y + 2.2] : [x - 0.1, z - W / 2, x + 0.1, z + W / 2, y, y + 2.2];
      this.doors.push({ id, x, y, z, dir, leafs, block: bk, label: o.label || '', locked: o.locked || '', stay: !!o.stay, room: o.room || '' });
      if (o.label) { this.kind('plate', () => plateGrid(GREEN), S1); if (dir === 'x') this.place('plate', x + W / 2 + 0.32, z + 0.16, 0, { y: y + 1.62, near: true }); }
    }

    /* ---- the ground: paths, lawns, beds ---- */
    grounds() {
      const path = (x, z) => {                             // metres to the edge of the paving (negative: on it)
        let d = Math.abs(x) - 2.4; if (z < -6.2) d = 99; d = Math.max(d, z - 47);
        const c = Math.hypot(x, z - 14) - 6.2; d = Math.min(d, c);
        d = Math.min(d, Math.max(Math.abs(z - 14) - 1.7, Math.abs(x) - 25.5));
        d = Math.min(d, Math.max(Math.abs(z + 2.6) - 2.6, Math.abs(x) - 22.4));
        d = Math.min(d, Math.max(Math.abs(Math.abs(x) - 24) - 1.5, Math.max(-28 - z, z - 24)));
        d = Math.min(d, Math.max(Math.abs(z + 25.6) - 1.5, Math.abs(x) - 25.4));
        d = Math.min(d, Math.max(Math.abs(x) - 1.6, Math.max(-27 - z, z + 20)));
        d = Math.min(d, Math.max(Math.abs(z - 21) - 1.4, Math.max(22 - Math.abs(x), Math.abs(x) - 29)));
        d = Math.min(d, Math.max(Math.abs(z - 2) - 1.2, Math.max(22 - x, x - 34)));
        return d;
      };
      const sand = (x, z) => Math.max(Math.abs(x + 34) - 9, Math.abs(z + 8) - 9);
      const pond = (x, z) => Math.hypot((x + 34) / 1.3, z + 31) - 4.2 + Math.sin(Math.atan2(z + 31, x + 34) * 3) * 0.4;
      const PAVE = [0xc2b8a6, 0xb6ac9a, 0xcabfae, 0xada392];
      const ground = (x, z, px, py) => {
        const n = H(px, py, 7), p = path(x, z);
        if (p < 0) {
          if (p > -0.1) return 0x8e8474;
          const cr = Math.hypot(x, z - 14);
          if (cr < 6.2) { const ring = Math.floor(cr / 0.5), m = Math.max(8, R(ring * 0.5 * TAU / 0.7)), a = (Math.atan2(z - 14, x) + Math.PI) / TAU * m + (ring & 1) * 0.5, f = cr / 0.5 - ring; return f < 0.06 || a - Math.floor(a) < 0.05 ? 0x8e8474 : ring === 8 ? 0x7c8a84 : PAVE[Math.floor(H(Math.floor(a) % m, ring, 4) * 4)]; }
          const gx = Math.floor(x / 0.62 + (Math.floor(z / 0.46) & 1) * 0.5), gz = Math.floor(z / 0.46), fx = x / 0.62 + (gz & 1) * 0.5 - gx, fz = z / 0.46 - gz;
          return fx < 0.05 || fz < 0.06 ? 0x8e8474 : PAVE[Math.floor(H(gx, gz, 5) * 4)];
        }
        if (sand(x, z) < 0) return sand(x, z) > -0.2 ? 0x8a6a42 : n < 0.15 ? 0xc8b48a : n < 0.6 ? 0xd4c094 : 0xccb88c;
        if (pond(x, z) < 0) return pond(x, z) > -0.35 ? 0x9a9078 : H(R(x * 3), R(z * 8), 3) < 0.3 ? 0x6aa4cc : 0x5a94bc;
        if (p < 0.4) return n < 0.5 ? 0x4c7a38 : 0x568a40;                                         // a clipped edge
        const n2 = H(R(x * 1.4), R(z * 1.4), 3), strip = Math.abs(x) < 22 && z > -0.5 && z < 40 && (Math.floor(x / 2.2) & 1);
        let c = strip ? 0x5f9c46 : n2 < 0.4 ? 0x68a64c : 0x6eac52;
        if (n < 0.005) c = 0xf3eefb; else if (n < 0.008) c = 0xf0d04a; else if (n < 0.1) c = mul(c, 0.92);
        return c;
      };
      this.paintCore(-24.576, -6.4, 2048, ground);
      this.paintGround(150, 1536, 0, 2, (x, z, px, py) => {
        if (Math.abs(x) < 47 && z > -44 && z < 47) return ground(x, z, px, py);
        if (Math.abs(x) < 2.4 && z > 0) return H(px, py, 3) < 0.5 ? 0x9c8260 : 0xa48a68;
        return mul(H(R(x / 6), R(z / 6), 2) < 0.5 ? 0x5f9a45 : 0x68a64c, 0.93 + H(px, py, 7) * 0.12);
      });
      this.floors.push([-45, -41, 45, 45.4, 0]);
      this.pathOk = path; this.sandAt = sand; this.pondAt = pond;
    }

    /* ---- the school building ---- */
    school(P) {
      const WX = 20.16, zS = -6.288, zN = -20.4, win = (a, y0) => ({ a0: a - 10, a1: a + 9, y0: y0 || 20, y1: (y0 || 20) + 40, t: 'win', arch: true });
      const wing = 283, mid = 250;                          // voxels: a wing 13.58 m, the middle 12 m
      // the outer walls, floor by floor; the finishes inside differ with what's there
      for (let f = 0; f < 3; f++) {
        const y = FY[f] - 0.048, ext = (a, yy) => yy > 72 ? 0xd8cebc : ashlar(a, yy + f * 75), inn = hallIn;
        const ws = [22, 69, 116, 163, 210, 257].map(a => win(a, f ? 18 : 20));
        this.wallAt(-WX, zS, 'x', 294, y, FH, ws.map(q => ({ ...q, a0: q.a0 + 4, a1: q.a1 + 4 })), ext, inn, { outF: true, foot: true });
        this.wallAt(6.048, zS, 'x', 294, y, FH, ws, ext, inn, { outF: true, foot: true });
        this.wallAt(-6.048, zS, 'x', 252, y, FH, f === 0 ? [{ a0: 104, a1: 147, y0: 0, y1: 60, t: 'open', arch: true }, win(50), win(202)] : [win(40, 18), win(126, 18), win(212, 18)], ext, inn, { outF: true, foot: true });
        const inW = f === 0 ? CREAM : f === 1 ? CREAM : BLUE, inE = f === 0 ? ROSE : f === 1 ? SAGE : CREAM;
        this.wallAt(-WX, zN, 'x', 294, y, FH, ws.map(q => ({ ...q, a0: q.a0 + 4, a1: q.a1 + 4 })), inW, ext, { outB: true });
        this.wallAt(6.048, zN, 'x', 294, y, FH, ws, inE, ext, { outB: true });
        this.wallAt(-6.048, zN, 'x', 252, y, FH, f === 0 ? [{ a0: 114, a1: 137, y0: 0, y1: 46, t: 'open' }, win(60), win(192)] : [win(60, 18), win(126, 18), win(192, 18)], hallIn, ext, { outB: true });
        const ew = [40, 92, 144, 196].map(a => win(a, 20)), end = win(266, 20);
        this.wallAt(-WX + 0.288, zN + 0.288, 'z', 288, y, FH, f === 0 ? [win(40), win(244), end].slice(0, 1).concat([end]) : [win(40), end], ext, inW, { outF: true });
        this.wallAt(WX, zN + 0.288, 'z', 288, y, FH, [...ew, end], inE, ext, { outB: true });
        // the corridor's inner wall, the stair hall's sides
        const cz = -9.456, dA = (x, w) => ({ a0: R(x / SB) - w, a1: R(x / SB) + w - 1, y0: 0, y1: 45, t: 'door' });
        const X = x => x + 19.872;
        this.wallAt(-19.872, cz, 'x', 289, y, FH, f === 0 ? [dA(X(-8.5), 23)] : [dA(X(-15.5), 23), dA(X(-8.5), 23)], hallIn, inW);
        this.wallAt(6.0, cz, 'x', 289, y, FH, [dA(2.5, 23)], hallIn, inE);
        this.wallAt(-6.0, zN + 0.288, 'z', 228, y, FH, [], inW, hallIn); this.wallAt(6.288, zN + 0.288, 'z', 228, y, FH, [], hallIn, inE);
        if (f > 0) this.wallAt(-12.94, zN + 0.288, 'z', 222, y, FH, [], inW, f === 1 ? SAGE : CREAM);
      }
      // floors: ground tiles, then boards; a runner down the corridor; the stairwell open
      const board = boards(0x8a6444, 0x7c583a), run = (x, z, d) => z > d - 48 && z < d - 14 ? (z === d - 47 || z === d - 15 ? GOLD : (z + x) % 24 < 2 ? 0x7a2632 : 0x8a2c3a) : null;
      const D = 294, hall = (x, z) => { const r = run(x, z, D); return r != null ? r : z > D - 64 ? tiles(x, z) : board(x, z); };
      const gTile = (x, z) => { const r = run(x, z, D); return r != null ? r : tiles(x, z); };
      const sx = -WX + 0.288 + 0.024, sz = zN + 0.288 + 0.024;
      P('fl0w', () => slab(289, D, hall, null, true), SB, sx, sz, 0); P('fl0m', () => slab(262, D, gTile, null, true), SB, -6.288 + 0.024, sz, 0); P('fl0e', () => slab(289, D, hall, null, true), SB, 6.264, sz, 0);
      for (let f = 1; f < 3; f++) {
        const y = FY[f] - 0.048;
        P('fl1w', () => slab(289, D, hall), SB, sx, sz, 0, { y }); P('fl1e', () => slab(289, D, hall), SB, 6.264, sz, 0, { y });
        const hx0 = f === 1 ? R((-5.5 + 6.288) / SB) : R((3.0 + 6.288) / SB), hz0 = R((-18.0 + 20.112) / SB), hz1 = R((-10.8 + 20.112) / SB);
        P('fl' + f + 'm', () => slab(262, D, hall, [hx0, hz0, hx0 + 52, hz1]), SB, -6.264, sz, 0, { y });
        this.slabs.push([-20, -20.2, f === 1 ? -5.5 : 3.0, -6.2, y - 0.3, y], [f === 1 ? -3.0 : 5.5, -20.2, 20, -6.2, y - 0.3, y]);
        const a = f === 1 ? -5.5 : 3.0;
        this.floors.push([-19.9, -20.2, a, -6.2, FY[f]], [a + 2.5, -20.2, 19.9, -6.2, FY[f]], [a, -20.2, a + 2.5, -18.0, FY[f]], [a, -10.8, a + 2.5, -6.2, FY[f]]);
        this.ramps.push([a, -18.0, a + 2.5, -10.8, FY[f], FY[f - 1]]);
        P('stair', () => stairGrid(), SB, a + 0.024, -10.8 - 0.024, 0, { y: FY[f - 1] - 0.0 });
        P('srail', () => railGrid(150, true), SB, a - 0.02, -10.8, 0, { y: FY[f - 1] }); this.place('srail', a + 2.5, -10.8, 0, { y: FY[f - 1] });
        P('frail', () => railGrid(150, false), SB, a - 0.05, -10.8, 0, { y: FY[f] }); this.place('frail', a + 2.55, -10.8, 0, { y: FY[f] }); P('frail2', () => railGrid(53, false), SB, a + 2.5, -10.72, HP, { y: FY[f] });
        this.blocks.push([a - 0.1, -18.0, a + 0.02, -10.8, FY[f - 1], FY[f] + 1], [a + 2.48, -18.0, a + 2.6, -10.8, FY[f - 1], FY[f] + 1], [a, -10.86, a + 2.5, -10.7, FY[f] - 0.4, FY[f] + 1], [a, -18.0, a + 2.5, -15.6, FY[f - 1] - 0.1, FY[f - 1] + 1.6]);
      }
      this.floors.push([-19.9, -20.2, 19.9, -6.2, FY[0]]);
      // the top ceiling, the roof, the tower, the portal
      P('ceilw', () => slab(289, D, () => 0x8a6444), SB, sx, sz, 0, { y: 10.8 }); this.place('ceilw', 6.264, sz, 0, { y: 10.8 }); P('ceilm', () => slab(262, D, () => 0x8a6444), SB, -6.264, sz, 0, { y: 10.8 });
      this.slabs.push([-20.2, -20.4, 20.2, -6, 10.5, 10.9]);
      P('cornice', () => { const g = G(); g.box(-213, 0, 0, 213, 4, 6, (x, y) => y > 2 ? 0xd8cebc : (x + 400) % 12 < 6 ? 0xbfb5a4 : -1); return g; }, 0.096, 0, -6.1, 0, { y: 10.75 }); this.place('cornice', 0, -20.3, Math.PI, { y: 10.75 });
      P('roof', () => roofGrid(430, 164, 0.94), 0.096, 0, -13.2, 0, { y: 10.8, name: 'school_roof', ao: false }); P('dormer', dormerGrid, 0.096, -14, -8.4, 0, { y: 12.3 }); for (const x of [-9, 9, 14]) this.place('dormer', x, -8.4, 0, { y: 12.3 });
      P('tower', towerGrid, 0.096, 0, -13.2, 0, { y: 14.0, name: 'school_tower', ao: false }); P('bell', bellGrid, 0.115, 0, -13.2, 0, { y: 14.0 + 148 * 0.096, name: 'bell' }); P('clapper', clapperGrid, 0.115, 0, -13.2, 0, { y: 14.0 + 148 * 0.096, name: 'clapper' });
      this.marks.bell = [0, 27.6, -13.2];
      P('porch', porchGrid, SB, 0, -6.0 + 0.024, 0); for (const s of [-1, 1]) this.col(s * 1.92, -4.65, 0.4);
      for (const [x, c, e] of [[-12.5, GREEN, 'flame'], [12.5, GREEN, 'flame'], [-4.6, 0x8a2c3a, 'star'], [4.6, 0x2c4a7a, 'star']]) P('banner_' + c + e, () => bannerGrid(c, e), SB, x, -5.96, 0, { y: 4.2 });
      // doors
      this.doorAt('main', 0, -6.14, 'x', 0, { leafs: 2, w: 44, h: 112, c: 0x7a4a2a, win: false, stay: true });
      this.doorAt('north', 0, -20.26, 'x', 0, { w: 48, h: 92, c: 0x6b4426, label: 'North Garden' });
      this.doorAt('1A', -8.5, -9.31, 'x', 0, { leafs: 2, label: 'Lecture Hall 1A', room: '1A' }); this.doorAt('refectory', 8.5, -9.31, 'x', 0, { leafs: 2, label: 'Refectory', room: 'refectory' });
      this.doorAt('2A', -15.5, -9.31, 'x', 1, { leafs: 2, label: 'Room 2A: History', room: '2A' }); this.doorAt('2B', -8.5, -9.31, 'x', 1, { leafs: 2, label: 'Room 2B: Potions', room: '2B', c: 0x3f6a4a }); this.doorAt('library', 8.5, -9.31, 'x', 1, { leafs: 2, label: 'Library', room: 'library', c: 0x6a3a2a });
      this.doorAt('3A', -15.5, -9.31, 'x', 2, { leafs: 2, label: 'Room 3A: Astronomy', room: '3A', c: 0x3a4a7a }); this.doorAt('office', -8.5, -9.31, 'x', 2, { leafs: 2, label: 'Headmistress Aurel', c: 0x6a2c3a, locked: 'Locked. A brass plate reads: HEADMISTRESS AUREL. KNOCK ONCE. I HEARD YOU ON THE STAIRS.' });
      this.doorAt('3E', 8.5, -9.31, 'x', 2, { leafs: 2, label: 'Enchantments', locked: 'Locked. A note is pinned up: CLOSED UNTIL THE CEILING COMES BACK DOWN.' });
    }

    /* ---- what's in the rooms ---- */
    furnish(P) {
      const n = (name, x, z, f) => this.node(name, x, z, f);
      // corridors and stairs
      const CX = [-18.5, -15.5, -12, -8.5, -4.25, 0, 4.25, 8.5, 12, 15.5, 18.5];
      for (let f = 0; f < 3; f++) { CX.forEach((x, i) => { n('c' + f + '_' + i, x, -7.7, f); if (i) this.link('c' + f + '_' + (i - 1), 'c' + f + '_' + i); }); n('m' + f, 0, -11, f); n('l' + f, 0, -18.9, f); this.chain('c' + f + '_5', 'm' + f, 'l' + f); }
      n('s1a', -4.25, -10.2, 0); n('s1b', -4.25, -18.7, 1); n('s2a', 4.25, -10.2, 1); n('s2b', 4.25, -18.7, 2); this.chain('c0_4', 's1a', 's1b', 'l1'); this.chain('c1_6', 's2a', 's2b', 'l2'); this.link('m0', 's1a');
      n('in', 0, -7.2, 0); n('out', 0, -3.4); this.link('in', 'c0_5'); this.link('in', 'out', 'main'); n('nin', 0, -19.6, 0); n('nout', 0, -22); this.link('l0', 'nin'); this.link('nin', 'nout', 'north');
      const room = (id, f, dx, o) => { n('r' + id + 'o', dx, -8.6, f); n('r' + id, dx, -10.35, f); this.link('r' + id + 'o', 'c' + f + '_' + CX.indexOf(dx)); this.link('r' + id + 'o', 'r' + id, id); this.rooms[id] = { f, node: 'r' + id, seats: [], teacher: null, ...o }; return this.rooms[id]; };
      for (const len of [125, 150]) { this.kind('desk' + len, () => deskGrid(len), S1, { near: true }); this.kind('seat' + len, () => benchSeat(len), S1, { near: true }); }
      const rowAt = (rm, f, x, zc, len, seats) => { const y = FY[f]; this.place('desk' + len, x, zc, 0, { y, near: true }); this.place('seat' + len, x + 0.56, zc, 0, { y, near: true }); this.blocks.push([x - 0.26, zc - len * S1 / 2, x + 0.26, zc + len * S1 / 2, y, y + 0.8], [x + 0.42, zc - len * S1 / 2, x + 0.7, zc + len * S1 / 2, y, y + 0.46]); const gap = len * S1 / seats; for (let i = 0; i < seats; i++) { const z = zc + (i - (seats - 1) / 2) * gap; rm.seats.push({ x: x + 0.52, z, yaw: -HP, h: 0.46, desk: [x + 0.02, z], via: [[x + 1.2, -10.35], [x + 1.2, z]] }); } };
      const wallP = (name, make, x, z, ry, f, y) => P(name, make, S1, x, z, ry, { y: FY[f] + (y || 0), near: true });
      // 1A: the great lecture hall
      const A1 = room('1A', 0, -8.5, { label: 'Lecture Hall 1A' });
      for (const [i, x] of [-14.5, -12.4, -10.3].entries()) for (const zc of [-13.1, -17.6]) rowAt(A1, 0, x, zc, 150, 4);
      A1.seats.sort((a, b) => a.x - b.x || b.z - a.z);
      wallP('board_candle', () => boardGrid(190, BOARDS.candle), -19.84, -14.8, HP, 0, 0.1); wallP('tdesk', teacherDesk, -17.6, -17.2, 0, 0); this.blocks.push([-18, -18, -17.2, -16.4, 0, 0.8]); wallP('lectern', lecternGrid, -17.0, -13.6, -HP, 0); this.col3(-17.0, -13.6, 0.3, 0);
      A1.teacher = { x: -17.9, z: -14.4, yaw: HP, via: [[-15.9, -10.35], [-16.4, -12.4]] }; A1.front = { x: -16.2, z: -14.8 };
      wallP('shelf_a', () => shelfGrid(3, 88), -19.84, -18.9, HP, 0); wallP('globe', globe, -19.1, -11.2, 0, 0); this.col3(-19.1, -11.2, 0.3, 0);
      // 2A history, 3A astronomy: smaller rooms, two rows
      for (const [id, f, bd] of [['2A', 1, 'map'], ['3A', 2, 'moon']]) {
        const rm = room(id, f, -15.5, { label: id === '2A' ? 'Room 2A: History' : 'Room 3A: Astronomy' });
        for (const x of [-17.0, -14.95]) for (const zc of [-12.9, -17.0]) rowAt(rm, f, x, zc, 125, 3);
        rm.seats.forEach(s => { s.via = [[s.x + 0.66 > -13.6 ? -13.75 : s.x + 0.66, -10.35], [s.x + 0.66 > -13.6 ? -13.75 : s.x + 0.66, s.z]]; });
        wallP('board_' + bd, () => boardGrid(170, BOARDS[bd]), -19.84, -14.8, HP, f, 0.1); wallP('lectern', lecternGrid, -18.6, -11.6, -HP, f); this.col3(-18.6, -11.6, 0.3, f); rm.teacher = { x: -18.9, z: -14.6, yaw: HP, via: [[-18.1, -10.35], [-18.2, -13.2]] };
        wallP('shelf_' + id, () => shelfGrid(f * 7, 100), -15.0, -20.1, 0, f);
      }
      wallP('armillary', armillary, -18.7, -18.6, 0, 2); this.col3(-18.7, -18.6, 0.5, 2); wallP('globe', globe, -18.9, -18.8, 0, 1); this.col3(-18.9, -18.8, 0.3, 1);
      // 2B potions: four work tables, cauldrons, shelves of jars
      const B2 = room('2B', 1, -8.5, { label: 'Room 2B: Potions' });
      for (const [x, z] of [[-11.2, -13], [-8.2, -13], [-11.2, -16.2], [-8.2, -16.2]]) { wallP('work', workTable, x, z, 0, 1); this.blocks.push([x - 0.82, z - 0.4, x + 0.82, z + 0.4, FY[1], FY[1] + 0.9]); for (const dx of [-0.45, 0.45]) B2.seats.push({ x: x + dx, z: z + 0.72, yaw: Math.PI, h: 0, via: [[-9.7, -10.9], [-9.7, z + 0.95]] }); for (const dx of [0]) B2.seats.push({ x: x + dx, z: z - 0.72, yaw: 0, h: 0, via: [[-9.7, -10.9], [-9.7, z - 0.95]] }); wallP('cauldron', cauldron, x, z, 0, 1, 0.86); }
      B2.teacher = { x: -9.7, z: -18.6, yaw: 0, via: [[-9.7, -10.9]] }; wallP('shelf_p', () => shelfGrid(21, 100), -11.4, -20.1, 0, 1); wallP('shelf_q', () => shelfGrid(22, 100), -7.8, -20.1, 0, 1); wallP('board_plant', () => boardGrid(130, BOARDS.plant), -6.3, -14.6, -HP, 1, 0.1);
      // the refectory: three long tables
      const RF = room('refectory', 0, 8.5, { label: 'Refectory' });
      this.kind('ltable', () => longTable(360), S1, { near: true }); this.kind('lset', () => settings(360), S1, { near: true }); this.kind('lbench', () => { const g = benchSeat(360), q = G(); g.each((x, y, z, v) => q.set(z, y, x, v)); return q; }, S1);
      for (const z of [-12.4, -15.2, -18.0]) { this.place('ltable', 13.2, z, 0, { y: FY[0], near: true }); this.place('lset', 13.2, z, 0, { y: FY[0] + 31 * S1, near: true }); for (const s of [-1, 1]) { this.place('lbench', 13.2, z + s * 0.72, 0, { y: FY[0], near: true }); for (let i = 0; i < 9; i++) RF.seats.push({ x: 13.2 + (i - 4) * 0.94, z: z + s * 0.7, yaw: s > 0 ? Math.PI : 0, h: 0.46, via: [[7.6, z + s * 1.3], [13.2 + (i - 4) * 0.94, z + s * 1.3]] }); } this.blocks.push([8.9, z - 0.85, 17.5, z + 0.85, 0, 0.8]); }
      RF.seats.sort((a, b) => H(R(a.x * 10), R(a.z * 10), 3) - H(R(b.x * 10), R(b.z * 10), 3)); RF.teacher = { x: 18.6, z: -14.8, yaw: -HP };
      wallP('counter', () => { const g = G(); g.box(-70, 0, -10, 70, 38, 10, (x, y, z) => y === 38 ? OAK_L : z === 10 && x % 28 === 0 ? DARK : OAK); for (const [x, c] of [[-50, 0xb07a44], [-20, 0x8a9a5a], [10, 0xc86a3a]]) for (let y = 39; y < 52; y++) g.disc(x, 0, 8, y, y, (X, Y, Z) => Math.hypot(X - x, Z) > 6.6 ? 0x4a4a54 : Y === 49 ? c : -1); for (let k = 0; k < 5; k++) g.ell(36 + k * 7, 41, (k & 1) * 4 - 2, 4, 2.6, 3, 0xc98a42); return g; }, 19.1, -14.8, -HP, 0); this.blocks.push([18.85 - 0.2, -16.6, 19.4, -13.0, 0, 1]);
      RF.teacher = { x: 19.55, z: -14.8, yaw: -HP };
      // the library: cases in ranks, two reading tables
      const LB = room('library', 1, 8.5, { label: 'Library' });
      for (let k = 0; k < 4; k++) { const x = 11.2 + k * 2.3; for (const z of [-17.9]) { wallP('case' + (k & 1), () => shelfGrid(31 + (k & 1), 150), x, z, HP, 1); this.place('case' + (k & 1), x - 0.02, z, -HP, { y: FY[1], near: true }); this.blocks.push([x - 0.34, z - 1.8, x + 0.34, z + 1.8, FY[1], FY[1] + 2.3]); } }
      for (const x of [8.6, 18.6]) wallP('lshelf' + R(x), () => shelfGrid(R(x), 90), x, -20.1, 0, 1); for (const z of [-11.4, -14.2, -17.0]) wallP('eshelf' + R(-z), () => shelfGrid(R(-z), 96), 19.84, z - 0.6, -HP, 1);
      this.kind('rtable', () => longTable(150), S1); this.kind('rbench', () => { const g = benchSeat(150), q = G(); g.each((x, y, z, v) => q.set(z, y, x, v)); return q; }, S1);
      for (const x of [11.6, 16.0]) { const z = -12.6; this.place('rtable', x, z, 0, { y: FY[1] }); this.blocks.push([x - 1.8, z - 0.85, x + 1.8, z + 0.85, FY[1], FY[1] + 0.8]); for (const s of [-1, 1]) { this.place('rbench', x, z + s * 0.72, 0, { y: FY[1] }); for (let i = 0; i < 3; i++) LB.seats.push({ x: x + (i - 1) * 1.1, z: z + s * 0.7, yaw: s > 0 ? Math.PI : 0, h: 0.46, read: true, via: [[8.5, z + s * 1.35], [x + (i - 1) * 1.1, z + s * 1.35]] }); } }
      LB.teacher = { x: 7.3, z: -13.5, yaw: HP };
      wallP('lecternL', lecternGrid, 7.9, -13.5, -HP, 1); this.col3(7.9, -13.5, 0.3, 1);
      // lamps, hangings, the hall's rug and boards
      const LMP = [[-13, -14.8, 0], [13, -14.8, 0], [0, -14.5, 0], [-16.5, -14.8, 1], [-9.6, -14.8, 1], [13, -14.5, 1], [0, -13, 1], [-16.5, -14.8, 2], [0, -13, 2]];
      for (const [x, z, f] of LMP) { wallP('chandelier', chandelier, x, z, 0, f, 2.45); this.light(x, FY[f] + 2.3, z, 0xffcf8a, 1.3, 8.5, 'lamp'); }
      for (let f = 0; f < 3; f++) for (const x of [-17, -12, -5.2, 5.2, 12, 17]) { wallP('sconce', sconce, x, -9.168 + 0.02, 0, f, 1.9); if (Math.abs(x) !== 5.2) this.light(x, FY[f] + 2.2, -8.6, 0xffc88a, 0.7, 4.6, 'lamp'); }
      // the halls: the emblem in the carpet, settles, cabinets of prizes, plants, the masters' portraits
      P('hallrug', () => { const g = G(); for (let x = -46; x <= 46; x++) for (let z = -36; z <= 36; z++) { const d = Math.hypot(x / 46, z / 36); if (d > 1) continue; const fl = (() => { const v = (20 - z) / 40; if (v < 0 || v > 1) return false; if (v < 0.5) return Math.abs(x) < 5; const t = (v - 0.5) * 2; return Math.abs(x) < 9 * Math.sin(Math.min(1, t * 1.6 + 0.25) * HP) * (1 - t) * 1.6; })(); g.set(x, 0, z, d > 0.95 ? GOLD : d > 0.9 ? 0x1b433e : fl ? (z > 0 ? 0xf6eeda : GOLD) : d > 0.62 && d < 0.66 ? GOLD : GREEN); } return g; }, SB, 0.6, -13.6, 0, { y: FY[0] - 0.036, near: true, ao: false });
      const cabinet = () => { const g = G(); g.box(-34, 0, -9, 34, 16, 9, (x, y, z) => z === 9 && x % 17 === 0 ? DARK : OAK); g.box(-34, 17, -9, 34, 84, -8, OAK_D); for (const x of [-34, 33]) g.box(x, 17, -8, x + 1, 84, 8, OAK); g.box(-34, 84, -9, 34, 86, 10, OAK_L); for (const y of [38, 60]) g.box(-32, y, -8, 32, y, 7, OAK); for (let k = 0; k < 12; k++) { const x = -27 + (k % 4) * 18, y = [17, 39, 61][Math.floor(k / 4)], q = H(k, 4, 9); if (q < 0.4) { g.disc(x, 0, 3, y, y + 1, BRASS); g.box(x, y + 2, 0, x, y + 6, 0, BRASS); g.disc(x, 0, 4, y + 7, y + 12, (X, Y, Z) => Math.hypot(X - x, Z) > 2.8 || Y === y + 7 ? GOLD : -1); } else if (q < 0.7) { g.box(x - 4, y, -1, x + 4, y + 10, 0, (X, Y) => Math.abs(X - x) === 4 || Y === y || Y === y + 10 ? BRASS : Y > y + 3 && Math.abs(X - x) < 2 ? 0xf1c9ab : 0x4a5a6a); } else { g.ell(x, y + 5, 0, 4, 4, 4, VX.glow(H(k, 1, 1) < 0.5 ? 0x8ad8e8 : 0xe8a0d0)); g.disc(x, 0, 3, y, y + 1, OAK_D); } } return g; };
      for (const [x, z, ry, f] of [[-5.8, -14.2, HP, 0], [5.8, -12.6, -HP, 0], [5.8, -16.4, -HP, 0], [-5.8, -8.2, HP, 1], [5.8, -15.2, -HP, 1].slice(0, 4), [-5.8, -12.4, HP, 2], [-5.8, -16.4, HP, 2], [5.8, -8.0, -HP, 2]]) { if (f === 0 && x < 0) continue; wallP('cabinet', cabinet, x + (x < 0 ? 0.02 : -0.02), z, ry, f); this.blocks.push([x < 0 ? -6 : 5.5, z - 0.9, x < 0 ? -5.5 : 6, z + 0.9, FY[f], FY[f] + 2]); }
      for (const [x, z, f] of [[-1.9, -19.4, 0], [1.9, -19.4, 0], [-5.4, -6.9, 0], [5.4, -6.9, 0], [-5.4, -19.5, 1], [5.4, -19.5, 2], [-19.3, -6.8, 0], [19.3, -6.8, 0], [19.3, -6.8, 1], [-19.3, -6.8, 1], [-19.3, -6.8, 2]]) { wallP('fern', () => { const g = G(); for (let y = 0; y < 16; y++) g.disc(0, 0, 6 + y * 0.14, y, y, (x, yy, z) => Math.hypot(x, z) > 4.6 + yy * 0.14 || yy === 14 ? (yy === 14 && Math.hypot(x, z) < 5 ? 0x4a3424 : yy === 4 || yy === 12 ? 0xd0a850 : 0x2c5a7a) : -1); for (let k = 0; k < 14; k++) { const a = k / 14 * TAU + (k & 1) * 0.2, l = 10 + (k % 3) * 4; for (let t = 0; t <= 1; t += 0.06) g.ell(Math.cos(a) * t * l, 15 + Math.sin(t * 2.4) * (14 + (k % 4) * 4), Math.sin(a) * t * l, 0.8, 0.5, 0.8, H(k, R(t * 9), 2) < 0.5 ? 0x4f8f3a : 0x67a84a); } return g; }, x, z, 0, f); this.col3(x, z, 0.22, f); }
      for (const [x, z, ry, f] of [[-3.4, -19.75, 0, 2], [3.4, -19.75, 0, 1], [-2.4, -19.75, 0, 1], [12.2, -6.62, Math.PI, 0], [-8.6, -6.62, Math.PI, 1], [8.8, -6.62, Math.PI, 2], [-12, -6.62, Math.PI, 2]]) { wallP('bench', T.bench, x, z, ry, f); this.col3(x, z, 0.5, f); }
      for (const [x, f, c] of [[-1.6, 1, 0x4a3a5a], [1.6, 1, 0x2c4a44], [-1.6, 2, 0x2c3a5a], [1.6, 2, 0x4a4a2c]]) wallP('portrait' + c, () => { const g = G(); g.box(-13, 0, 0, 13, 34, 2, (X, y, z) => Math.abs(X) > 11 || y < 2 || y > 32 ? (H(X, y, 1) < 0.2 ? 0xe0c070 : BRASS) : z > 0 ? -1 : y < 13 - Math.abs(X) * 0.3 ? mul(c, 1.5) : Math.hypot(X, y - 19) < 5 ? 0xe8c8a8 : Math.hypot(X, y - 21) < 7 && y > 19 ? (c & 0xff) > 0x50 ? 0xc8c8ce : 0x6a4a30 : mul(c, 0.6)); return g; }, x, -20.09, 0, f, 1.35);
      for (const s of [-1, 1]) { P('banner_in' + s, () => bannerGrid(s < 0 ? 0x8a2c3a : GREEN, 'flame'), S1, s * 1.6, -20.1, 0, { y: FY[0] + 1.0 - 0.6 + 1.6 }); }
      wallP('notice', noticeGrid, 3.4, -9.1 + 2.62, Math.PI, 0); this.col3(3.4, -6.5, 0.5, 0);
      this.signs.push({ x: 3.4, y: FY[0], z: -7.0, r: 1.5, label: 'Read the timetable', id: 'timetable' }, { x: -19.1, y: FY[0], z: -11.2, r: 1.3, label: 'Look at the globe', text: 'The world, as it was understood forty years ago. Someone has pencilled in an island.' }, { x: -18.7, y: FY[2], z: -18.6, r: 1.5, label: 'Look at the armillary', text: 'Brass rings, and a little sun that gives off real warmth.' }, { x: 11.2, y: FY[1], z: -17.9, r: 2.2, label: 'Browse the shelves', id: 'books' }, { x: -19, y: FY[0], z: -18.9, r: 1.6, label: 'Browse the shelves', id: 'books' });
      const pics = [0x4a6a8a, 0x6a8a5a, 0x8a5a4a, 0x5a4a7a];
      for (let k = 0; k < 8; k++) P('pic' + (k & 3), () => { const g = G(); g.box(-14, 0, 0, 14, 20, 1, (x, y) => Math.abs(x) > 12 || y < 2 || y > 18 ? BRASS : y < 8 + Math.sin(x * 0.4 + k) * 3 ? mul(pics[k & 3], 0.7) : y > 14 && x > 4 && x < 9 ? 0xf4e0a0 : mul(pics[k & 3], 1.25)); return g; }, S1, [-10.4, -6.8, 10.8, 14.2][k & 3], -9.168 + 0.02, 0, { y: FY[k >> 2] + 1.6, near: true });
      for (let f = 1; f < 3; f++) {  this.spots['landing' + f] = { x: -1.5, z: -17.6, y: FY[f], yaw: 0, node: 'l' + f }; }
      // where people loiter indoors
      this.spots.hallL = { x: -2.2, z: -12.2, y: FY[0], yaw: HP, node: 'm0' }; this.spots.hallR = { x: 2.2, z: -12.4, y: FY[0], yaw: -HP, node: 'm0' }; this.spots.corrW = { x: -13.4, z: -6.8, y: FY[0], yaw: 0, node: 'c0_2' }; this.spots.corr2 = { x: 12.8, z: -6.8, y: FY[1], yaw: 0, node: 'c1_8' }; this.spots.corr2b = { x: 12.0, z: -6.9, y: FY[1], yaw: HP, node: 'c1_8' }; this.spots.corr3 = { x: -12.0, z: -6.8, y: FY[2], yaw: 0, node: 'c2_2' }; this.spots.hall2 = { x: 1.2, z: -12.6, y: FY[1], yaw: Math.PI, node: 'm1' };
    }
    col3(x, z, r, f) { this.colliders.push([x, z, r, FY[f], FY[f] + 1.6]); }

    /* ---- the campus round it ---- */
    around(P) {
      const n = (name, x, z) => this.node(name, x, z), sp = (name, x, z, yaw, node, o) => { this.spots[name] = { x, z, y: 0, yaw, node, ...o }; };
      n('gate', 0, 42); n('p0', 0, 33); n('p1', 0, 24); n('fS', 0, 20); n('fE', 5.4, 14); n('fW', -5.4, 14); n('fN', 0, 8.2); n('p2', 0, 2); n('w0', -12, 14); n('w1', -24, 14); n('e0', 12, 14); n('e1', 24, 14); n('dW', -26.2, 21); n('dE', 26.2, 21); n('w2', -24, 2); n('e2', 24, 2); n('w3', -24, -8); n('w4', -24, -25.6); n('e3', 24, -12); n('e4', 24, -25.6); n('nm', 0, -25.6); n('yard', -27, -8); n('glass', 33, 1.0); n('glassin', 33, -3.2); n('fw', -14, -2.6); n('fe', 14, -2.6); n('pondn', -28, -26); n('obs', 30, -27);
      this.chain('gate', 'p0', 'p1', 'fS', 'fE', 'fN', 'p2', 'out'); this.chain('fS', 'fW', 'fN'); this.chain('fW', 'w0', 'w1', 'w2', 'w3', 'w4', 'nm', 'nout'); this.chain('fE', 'e0', 'e1', 'e2', 'e3', 'e4', 'nm'); this.chain('w1', 'dW'); this.chain('e1', 'dE'); this.chain('w3', 'yard'); this.chain('e2', 'glass', 'glassin'); this.chain('out', 'fw', 'w2'); this.chain('out', 'fe', 'e2'); this.chain('w4', 'pondn'); this.chain('e4', 'obs');
      // the court: fountain and astrolabe, benches, lamps, trees, flower beds, floating lanterns, the founder
      P('fountain', T.fountain, SB, 0, 14, 0); this.col(0, 14, 1.9);
      P('astro0', () => astro(34, 3, BRASS), SB, 0, 14, 0, { y: 4.2, name: 'astro_0' }); P('astro1', () => astro(27, 3, 0xb08a3a), SB, 0, 14, 0, { y: 4.2, name: 'astro_1' }); P('astro2', () => astro(20, 2, 0xe0c070), SB, 0, 14, 0, { y: 4.2, name: 'astro_2' }); P('astroS', () => { const g = G(); g.ell(0, 0, 0, 6, 6, 6, (x, y, z) => VX.glow(H(x, y, z) < 0.3 ? 0xffffff : 0xbff4ea)); return g; }, SB, 0, 14, 0, { y: 4.2, name: 'astro_s' }); this.light(0, 4.2, 14, 0x9af0e0, 1.0, 9, 'astro');
      this.signs.push({ x: 0, y: 0, z: 14, r: 3.0, label: 'Look at the astrolabe', text: 'It turns by itself. The pupils say it is keeping time for something, and nobody will say what.' });
      P('founder', founder, S1, 0, 29, 0); this.col(0, 29, 0.6); this.signs.push({ x: 0, y: 0, z: 29, r: 1.8, label: 'Read the plaque', text: 'ORLIND THE SLOW. FOUNDER. "It took me nine years to light a candle. It has not gone out."' });
      P('bench', T.bench, S1, 0, -900, 0);
      const bench = (x, z, yaw, name, o) => { this.place('bench', x, z, yaw); this.col(x, z, 0.6); this.seats.push({ x: x + Math.sin(yaw) * 0.1, z: z + Math.cos(yaw) * 0.1, yaw, h: 0.5 }); if (name) sp(name, x + Math.sin(yaw) * 0.1, z + Math.cos(yaw) * 0.1, yaw, o.node, { sit: true, h: 0.5, ...o }); };
      bench(-4.6, 18.6, Math.PI * 0.78, 'benchA', { node: 'fW' }); bench(4.6, 18.6, -Math.PI * 0.78, 'benchB', { node: 'fE' }); bench(-4.6, 9.4, Math.PI * 0.25, 'benchC', { node: 'fW' }); bench(4.6, 9.4, -Math.PI * 0.25, 'benchD', { node: 'fE' }); bench(-13.2, 7.6, 0, 'treeA', { node: 'w0' }); bench(14, 22.4, Math.PI, 'treeB', { node: 'e0' }); bench(-29.6, -25.0, Math.PI * 1.1, 'pondA', { node: 'pondn' });
      sp('rimA', -2.9, 15.8, 2.1, 'fW'); sp('rimB', 2.9, 12.2, -1.0, 'fE'); sp('rimC', 1.7, 16.9, -2.8, 'fS'); sp('rimD', 2.9, 17.6, -2.5, 'fS'); sp('rimE', -1.6, 11.2, 0.6, 'fN'); sp('lawnA', 9.2, 20.4, 2.4, 'e0'); sp('lawnB', 10.4, 21.0, -1.6, 'e0'); sp('lawnC', 9.6, 21.8, 2.9, 'e0'); sp('gateA', 3.0, 35, -1.4, 'p0'); sp('portalA', -3.6, -3.0, 0.3, 'out'); sp('portalB', 4.0, -2.6, -0.3, 'out'); sp('founderA', 1.8, 30.4, -2.2, 'p0'); sp('pondB', -30.4, -27.6, -2.4, 'pondn'); sp('yardA', -29, -3.2, Math.PI, 'yard'); sp('glassA', 29.4, 1.2, 0.4, 'glass'); sp('obsA', 31.6, -28.6, 0.8, 'obs'); sp('eastA', 20.5, 6, 0.8, 'e2');
      P('post', T.post, S1, 0, -900, 0); for (const [x, z, ry] of [[-2.9, 26, HP], [2.9, 26, -HP], [-2.9, 38, HP], [2.9, 38, -HP], [-2.9, 4, HP], [2.9, 4, -HP], [-12, 15.9, 0], [12, 15.9, 0], [-22.2, 9, HP], [22.2, 9, -HP]]) { this.place('post', x, z, ry); this.col(x, z, 0.2); this.light(x, 2.5, z, 0xffcf8a, 0.8, 6, 'post'); }
      for (let i = 0; i < 12; i++) P('flo', lantern, S1, (i % 2 ? 1 : -1) * (4.6 + (i * 1.7) % 4), 3 + i * 3.1, i, { y: 2.6 + (i * 0.7) % 1.4, name: 'flo_' + i });
      this.floaters = 12;
      P('tree', K.treeGrid, SB, 0, -900, 0, { ao: false }); [0, 1].forEach(k => this.kind('crown' + k, () => K.crownGrid(1 + k * 3), 0.096));
      for (const [x, z] of [[-10, 20], [10, 8], [-17, 24], [17, 4], [-17, 30], [17, 30], [-8.5, 34], [8.5, 34], [-16, 2.5], [-38, -22], [36, -18], [-30, 36], [30, 36]]) { const k = (R(x) + 60) & 1; this.place('tree', x, z, x); this.place('crown' + k, x, z, z); this.col(x, z, 0.75); }
      // the old tree where Maron reads
      P('elder', () => { const g = G(); const bark = (x, y, z) => H(Math.floor((Math.atan2(z, x) + Math.PI) * 5 + y * 0.06), y >> 3, 2) < 0.3 ? 0x5a4a52 : 0x6b5a60; for (let y = 0; y <= 70; y++) { const r = 9 + Math.max(0, 14 - y) * 0.7; for (let x = -22; x <= 22; x++) for (let z = -22; z <= 22; z++) { const a = Math.atan2(z, x), d = Math.hypot(x - Math.sin(y * 0.05) * 4, z), rr = r * (1 + 0.18 * Math.sin(a * 4 + y * 0.06)); if (d <= rr && d > rr - 3) g.set(x, y, z, bark(x, y, z)); } } for (const [x, y, z, r] of [[44, 108, 6, 3.6], [-46, 104, 20, 3.8], [8, 122, -44, 3.4], [-10, 116, 46, 3.2], [40, 118, -34, 3]]) g.line(2, 64, 0, x, y, z, bark, r); return g; }, SB, -13.2, 5.6, 0.5, { ao: false });
      const blossom = seed => () => { const g = G(); for (let i = 0; i < 24; i++) { const a = H(i, seed, 1) * TAU, p = Math.sqrt(H(i, seed, 2)) * 21, y = (H(i, seed, 3) - 0.4) * 15, q = 5 + H(i, seed, 4) * 5; g.ell(Math.sin(a) * p, y, Math.cos(a) * p, q, q * 0.7, q, (X, Y, Z) => H(X, Y, Z) < 0.06 ? -1 : Y > y + q * 0.3 ? (H(X >> 1, Y, Z >> 1) < 0.5 ? 0xf6d8ea : 0xeec2dc) : Y < y - q * 0.3 ? 0xb888b0 : H(X >> 1, Y, Z >> 1) < 0.4 ? 0xdca8cc : 0xe6b6d6); } return g; };
      P('bl0', blossom(2), 0.096, -13.4, 5.6, 0, { y: 6.0 }); P('bl1', blossom(7), 0.096, -11.4, 7.0, 1, { y: 5.2 }); P('bl2', blossom(11), 0.096, -15.2, 4.4, 2, { y: 5.4 }); this.col(-13.2, 5.6, 0.8); this.marks.elder = [-13.2, 5.6];
      sp('maron', -12.1, 6.6, 0.4, 'w0', { ground: true });
      const bed = k => { const g = G(); for (let i = 0; i < 64; i++) { const x = (H(i, k, 1) - 0.5) * 120, z = (H(i, k, 2) - 0.5) * 26, h = 4 + H(i, k, 3) * 7, c = [0xd85a7a, 0xf0d04a, 0xf3eefb, 0x8a7ad8][(i + k) & 3]; g.line(x, 0, z, x, h, z, 0x4f8a3a); g.ell(x, h + 1, z, 1.3, 1, 1.3, c); } g.box(-64, 0, -16, 64, 2, 16, (x, y, z) => Math.abs(x) > 62 || Math.abs(z) > 14 ? 0xb0a692 : y < 2 ? 0x5a4030 : -1); return g; };
      for (const s of [-1, 1]) { P('bed0', () => bed(0), S1, s * 7.2, -0.6, 0); this.block3(s * 7.2, -0.6, 1.6, 0.5); this.place('bed0', s * 14, -0.6, 0); this.block3(s * 14, -0.6, 1.6, 0.5); }
      P('notice', noticeGrid, S1, -4.6, -4.4, 0.3); this.col(-4.6, -4.4, 0.5); this.signs.push({ x: -4.6, y: 0, z: -4.2, r: 1.8, label: 'Read the timetable', id: 'timetable' });
      // walls and the gatehouse
      P('bigwall', bigWall, 0.096, 4.6, 45.8, 0, { ao: false }); for (let i = 0; i < 4; i++) for (const s of [1, -1]) { const x = s > 0 ? 4.6 + i * 12 : -4.6 - (i + 1) * 12; if (Math.abs(x) < 46 && !(s > 0 && i === 0)) this.place('bigwall', x, 45.8, 0); }
      for (let i = 0; i < 8; i++) for (const s of [1, -1]) this.place('bigwall', s * 46, s > 0 ? 46 - i * 12 : 46 - (i + 1) * 12, s > 0 ? HP : -HP); for (let i = 0; i < 8; i++) this.place('bigwall', -48 + (i + 1) * 12, -42, Math.PI);
      for (const s of [-1, 1]) P('gtower', gateTower, 0.096, s * 4.9, 45.8, 0, { ao: false }); P('garch', gateArch, 0.096, 0, 45.8, 0); P('gleaf', gateLeaf, SB, -2.25, 45.9, 0, { name: 'gate_0' }); this.place('gleaf', 2.25, 45.9, Math.PI, { name: 'gate_1' });
      this.marks.gate = [0, 45.9];
      // boarding houses, the porter's lodge
      P('owl', () => K.houseGrid({ W: 60, D: 40, floors: 3, plaster: 0xe8dcc4, roof: 'slate', shutter: 0x2c5a50, door: 0, sides: '', seed: 31 }), SB, -33.6, 21, HP); P('hare', () => K.houseGrid({ W: 60, D: 40, floors: 3, plaster: 0xe0d4c8, roof: 'tile', shutter: 0x8a2c3a, door: 0, sides: '', seed: 33 }), SB, 33.6, 21, -HP); P('lodge', () => K.houseGrid({ W: 20, D: 20, floors: 2, plaster: 0xe8e0cc, roof: 'thatch', shutter: 0x6a4a32, door: 0, sides: 'LR', seed: 35 }), SB, 11.5, 40, -HP);
      this.blocks.push([-38.6, 13.5, -28.6, 28.5, 0, 12], [28.6, 13.5, 38.6, 28.5, 0, 12], [9, 37.5, 14, 42.5, 0, 8]);
      this.doorsOut = { owl: [-28.2, 21], hare: [28.2, 21] };
      this.signs.push({ x: -28.2, y: 0, z: 21, r: 1.8, label: 'Enter Owl House', id: 'owl' }, { x: 28.2, y: 0, z: 21, r: 1.8, label: 'Enter Hare House', id: 'hare' }, { x: 8.8, y: 0, z: 40, r: 1.6, label: "Porter's lodge", text: 'BRANDT, PORTER. Back in five minutes. The card has been there long enough to fade.' });
      // the glasshouse
      P('glasshouse', glasshouse, SB, 33, -6, 0, { noCast: true, ao: false }); const GX = 5.95, GZ = 3.55; this.blocks.push([33 - GX - 0.1, -6 - GZ - 0.1, 33 + GX + 0.1, -6 - GZ + 0.1, 0, 3], [33 - GX - 0.1, -6 - GZ, 33 - GX + 0.1, -6 + GZ, 0, 3], [33 + GX - 0.1, -6 - GZ, 33 + GX + 0.1, -6 + GZ, 0, 3], [33 - GX, -6 + GZ - 0.1, 33 - 0.72, -6 + GZ + 0.1, 0, 3], [33 + 0.72, -6 + GZ - 0.1, 33 + GX, -6 + GZ + 0.1, 0, 3]);
      const GL = this.rooms.glass = { f: -1, node: 'glassin', label: 'The Glasshouse', seats: [], teacher: { x: 33, z: -8.6, yaw: 0 } };
      for (const [i, [x, z]] of [[29.4, -4.2], [29.4, -7.2], [36.6, -4.2], [36.6, -7.2]].entries()) { P('bedp' + i, () => bedPlants(i + 1), S1, x, z, 0); this.block3(x, z, 1.08, 0.4); for (const dx of [-0.7, 0, 0.7]) GL.seats.push({ x: x + dx, z: z + 0.78, yaw: Math.PI, h: 0, via: [[33, z + 1.1], [x + dx, z + 1.1]] }); }
      for (const [x, z] of [[28.2, -9.2], [31, -9.2], [37.8, -9.2]]) { P('pot_green', () => T.pot('green'), S1, x, z, 0); this.col(x, z, 0.2); }
      // the practice yard
      const YD = this.rooms.yard = { f: -1, node: 'yard', label: 'The Practice Yard', seats: [], teacher: { x: -28.6, z: -11.2, yaw: -HP } };
      for (let i = 0; i < 5; i++) { P('target', target, S1, -41.4, -14 + i * 3, HP); this.col(-41.4, -14 + i * 3, 0.5); } for (const [x, z] of [[-37.6, -2.6], [-35.8, -1.8]]) { P('dummy', dummy, S1, x, z, 0.4); this.col(x, z, 0.3); }
      for (let i = 0; i < 10; i++) YD.seats.push({ x: -32.4 - (i % 2) * 1.4 + 0.4, z: -14.4 + (i >> 1) * 3 + (i % 2) * 0.7, yaw: -HP, h: 0, via: [] });
      for (const [x0, z0, ry, k] of [[-43, 1, 0, 8], [-43, -17, 0, 8]]) { }
      this.signs.push({ x: -41.2, y: 0, z: -8, r: 3, label: 'Look at the target', text: 'Scorched, soaked, frozen and, in one place, bitten.' });
      // the observatory, the pond
      P('observatory', observatory, 0.096, 38, -32, -0.7, { ao: false }); this.col(38, -32, 3.6); this.signs.push({ x: 35.4, y: 0, z: -29.4, r: 2.4, label: 'The observatory', text: 'Barred until nightfall. Something inside hums, a little flat.' });
      P('lily', () => { const g = G(); for (const [x, z, r] of [[0, 0, 6], [14, 5, 5], [-12, 10, 5], [4, 18, 4], [22, -8, 5]]) g.disc(x, z, r, 0, 0, (X, Y, Z) => Math.atan2(Z - z, X - x) > 2.6 ? -1 : 0x5f9a45); g.ell(0, 2, 0, 2, 1.4, 2, 0xf6d6e4); g.ell(14, 2, 5, 1.8, 1.2, 1.8, 0xfdf6ee); return g; }, S1, -34, -31, 0, { y: 0.01 }); this.place('lily', -36, -29.6, 2, { y: 0.01 }); this.colliders.push([-34, -31, 4.4]);
      // grass and the country beyond
      const seed = (() => { let q = 5151; return () => (q = (q * 16807) % 2147483647) / 2147483647; })(), grass = [], fl = [];
      for (let i = 0; i < 2600; i++) { const x = -44 + seed() * 88, z = -40 + seed() * 84; if (this.pathOk(x, z) < 0.5 || this.sandAt(x, z) < 0.2 || this.pondAt(x, z) < 0 || (Math.abs(x) < 20.6 && z < -5.8 && z > -20.6) || (Math.abs(x) < 21 && z > 0 && z < 40 && i % 3) || this.blocks.some(b => b[4] < 0.1 && x > b[0] && x < b[2] && z > b[1] && z < b[3])) continue; (i % 6 === 0 ? fl : grass).push([x, z, seed() * 6.28, 0.8 + seed() * 0.6]); }
      this.scatter('tuft', () => { const g = G(); for (const [x, z, h, c] of [[0, 0, 6, 0x6fb04a], [2, 1, 4, 0x5f9a42], [-2, 1, 5, 0x7abc54], [1, -2, 4, 0x5a9440]]) g.box(x, 0, z, x, h, z, c); return g; }, S1, grass, 28);
      this.scatter('fl', () => { const g = G(); g.box(0, 0, 0, 0, 5, 0, 0x4f8a3a); g.set(0, 6, 0, 0xf0d04a); for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.set(x, 6, z, 0xf3eefb); return g; }, S1, fl, 28);
      this.country({ trees: 34, treeR: 62, hillR: 120, seed: 31, clear: (x, z) => Math.abs(x) < 5 && z > 40 });
      for (const [x0, z0, x1, z1] of [[-45.4, 45.2, -2.2, 45.6], [2.2, 45.2, 45.4, 45.6]]) this.blocks.push([x0, z0, x1, z1, 0, 4]);
      this.marks.arrive = [0, 41];
    }
    block3(x, z, hx, hz) { this.blocks.push([x - hx, z - hz, x + hx, z + hz, 0, 0.9]); }

    /* ---- the boarding houses, inside: Owl House (boys) off at (RX, 0), Hare House (girls) at (RX, 60). A common room and
       a warden's desk below, a stair, six bedrooms for two above ---- */
    dorm(P) { this.house(P, 'owl', RX, 0, { wall: SAGE, hang: GREEN, quilt: [0x2c5a7a, 0x8a2c3a, 0x3f6a4a], warden: 'hob' }); this.house(P, 'hare', RX, 60, { wall: ROSE, hang: 0x8a2c3a, quilt: [0x8a4a7a, 0xc07a3a, 0x4a6a9a], warden: 'agnes' }); }
    house(P, id, cx, cz, st) {
      const HX = 7.2, HZ = 4.8, Y0 = 0.048, UP = 63 * SB, Y1 = Y0 + UP, hh = 60, ext = () => 0xb0a692, W = 300, D = 200, x0 = cx - HX, z0 = cz - HZ, wl = st.wall, sc = cx + 4.4, dr = (x, w) => ({ a0: R(x / SB) - w, a1: R(x / SB) + w - 1, y0: 0, y1: 45, t: 'door' }), wi = a => ({ a0: a - 9, a1: a + 8, y0: 18, y1: 46, t: 'win', arch: true });
      for (let f = 0; f < 2; f++) {
        const y = f * UP;
        this.wallAt(x0, z0 - 0.288, 'x', W, y, f ? hh : 63, f ? [wi(34), wi(100), wi(166), wi(250)] : [wi(60), wi(130), wi(250)], wl, ext); this.wallAt(x0, z0 + 2 * HZ, 'x', W, y, f ? hh : 63, f ? [wi(40), wi(118), wi(196)] : [wi(50), dr(HX, 12), wi(220)], ext, wl);
        this.wallAt(x0, z0, 'z', D, y, f ? hh : 63, [], ext, wl); this.wallAt(x0 + 2 * HX + 0.288, z0, 'z', D, y, f ? hh : 63, [wi(100)], wl, ext);
      }
      const bd = boards(0x8a6444, 0x7c583a), hx = R((sc - x0) / SB), hz0 = R((cz - 1.9 - z0) / SB), hz1 = R((cz + 3.14 - z0) / SB);
      P('dfl0', () => slab(W, D, bd, null, true), SB, x0 + 0.024, z0 + 0.024, 0); P('dfl1', () => slab(W, D, bd, [hx, hz0, hx + 52, hz1]), SB, x0 + 0.024, z0 + 0.024, 0, { y: UP }); P('dfl2', () => slab(W, D, () => 0x8a6444), SB, x0 + 0.024, z0 + 0.024, 0, { y: UP + hh * SB + 0.24 });
      this.slabs.push([x0, z0, sc, z0 + 2 * HZ, UP - 0.3, UP], [x0, z0, x0 + 2 * HX, z0 + 2 * HZ, UP + hh * SB, UP + hh * SB + 0.4]);
      this.floors.push([x0 + 0.02, z0 + 0.02, x0 + 2 * HX - 0.02, z0 + 2 * HZ, Y0], [x0 + 0.02, z0 + 0.02, sc, z0 + 2 * HZ, Y1], [sc + 2.5, z0, x0 + 2 * HX, z0 + 2 * HZ, Y1], [sc, z0, sc + 2.5, cz - 1.9, Y1], [sc, cz + 3.14, sc + 2.5, z0 + 2 * HZ, Y1]);
      this.ramps.push([sc, cz - 1.9, sc + 2.5, cz + 3.14, Y1, Y0]);
      P('dstair', () => stairGrid(21, 5, true), SB, sc + 0.024, cz + 3.14 - 0.024, 0, { y: Y0 }); P('drail', () => railGrid(105, true, 5), SB, sc, cz + 3.14, 0, { y: Y0 }); P('drail1', () => railGrid(105, false), SB, sc - 0.02, cz + 3.14, 0, { y: Y1 }); P('drail2', () => railGrid(53, false), SB, sc + 2.5, cz + 3.2, HP, { y: Y1 });
      this.blocks.push([sc - 0.08, cz - 1.9, sc + 0.04, cz + 3.14, Y0, Y1 + 1], [sc, cz + 3.1, sc + 2.5, cz + 3.26, Y1 - 0.4, Y1 + 1], [sc, cz - 1.9, sc + 2.5, cz + 0.2, 0, 1.6]);
      this.doorAt(id + '_in', cx, z0 + 2 * HZ + 0.14, 'x', 0, { y: Y0, label: '' });
      // the common room
      const put = (name, make, x, z, ry, y) => P(name, make, S1, x, z, ry, { y: y || Y0, near: true });
      P('hearthD', () => { const g = G(), stn = (x, y, z) => K.stoneAt(x + z + 100, y, 12); g.box(-22, 0, 0, 22, 1, 18, 0x968f88); g.box(-21, 2, 0, -13, 30, 10, stn); g.box(13, 2, 0, 21, 30, 10, stn); g.box(-21, 24, 0, 21, 60, 10, (x, y, z) => y < 30 && Math.abs(x) < 13 ? -1 : stn(x, y, z)); g.box(-13, 2, 0, 13, 29, 1, 0x2e2826); g.box(-24, 31, 0, 24, 33, 13, OAK_D); for (const [a, b, y, z] of [[-9, 9, 3, 7], [-8, 8, 3, 4], [-7, 7, 5, 5]]) g.box(a, y, z, b, y + 1, z + 1, (x) => H(x >> 1, y, z) < 0.35 ? VX.glow(0xff7a2a) : 0x3a241a); for (const [x, c] of [[-16, BRASS], [0, 0x7a2c34], [14, 0x2c4a6a]]) g.box(x - 2, 34, 5, x + 2, 40, 8, c); return g; }, SB, x0 + 0.05, cz - 0.6, HP, { y: Y0 });
      this.light(x0 + 0.9, 0.7, cz - 0.6, 0xff9a4a, 2.0, 6.5, 'hearth'); this.light(cx - 1.5, 2.3, cz, 0xffcf8a, 1.1, 8, 'lamp'); this.light(cx - 2, Y1 + 2, cz, 0xffcf8a, 0.9, 7, 'lamp'); this.blocks.push([x0, cz - 1.9, x0 + 0.9, cz + 0.7, 0, 2]);
      const sofa = () => { const g = G(), c = st.hang; g.box(-32, 4, -11, 32, 16, 12, (x, y, z) => y === 16 ? (x % 22 === 0 ? mul(c, 0.8) : mul(c, 1.15)) : c); g.box(-34, 4, -14, 34, 34, -10, (x, y) => x % 11 === 0 && y % 8 === 0 ? BRASS : c); for (const s of [-1, 1]) g.box(s * 32, 4, -12, s * 36, 24, 13, mul(c, 0.9)); for (const x of [-30, 28]) for (const z of [-9, 8]) g.box(x, 0, z, x + 2, 3, z + 2, OAK_D); return g; };
      const SE = this.rooms[id] = { f: 0, node: id + '_hall', label: id === 'owl' ? 'Owl House' : 'Hare House', seats: [], beds: [], teacher: { x: cx + 1.6, z: cz + 3.9, yaw: -HP } };
      for (const [x, z, ry] of [[cx - 4.6, cz - 2.9, 0], [cx - 4.6, cz + 1.7, Math.PI], [cx - 2.4, cz - 0.6, -HP]]) { put('sofa_' + id, sofa, x, z, ry); this.blocks.push(ry === -HP ? [x - 0.4, z - 0.9, x + 0.4, z + 0.9, 0, 0.8] : [x - 0.9, z - 0.4, x + 0.9, z + 0.4, 0, 0.8]); for (const d of [-0.4, 0.4]) SE.seats.push({ x: x + Math.cos(ry) * d + Math.sin(ry) * 0.06, z: z - Math.sin(ry) * d + Math.cos(ry) * 0.06, yaw: ry, h: 0.41, via: [[cx - 3.5, cz + (z < cz - 2 ? -2.0 : z > cz + 1 ? 0.9 : -0.6)]] }); }
      put('rugD_' + id, () => { const g = G(); g.box(-56, 0, -40, 56, 0, 40, (x, y, z) => Math.abs(x) > 52 || Math.abs(z) > 36 ? GOLD : Math.abs(x) > 48 || Math.abs(z) > 32 ? mul(st.hang, 0.8) : ((Math.abs(x) + Math.abs(z)) % 16 < 2 ? GOLD : st.hang)); return g; }, cx - 4.6, cz - 0.6, 0, Y0 + 0.01);
      put('rtableD', () => longTable(120), cx - 0.4, cz - 3.2, 0); this.blocks.push([cx - 1.85, cz - 4.1, cx + 1.1, cz - 2.4, 0, 0.8]); put('rbenchD', () => { const g = benchSeat(120), q = G(); g.each((x, y, z, v) => q.set(z, y, x, v)); return q; }, cx - 0.4, cz - 2.5, 0); this.place('rbenchD', cx - 0.4, cz - 3.9, 0, { y: Y0, near: true }); for (const s of [-1, 1]) for (let i = 0; i < 3; i++) SE.seats.push({ x: cx - 0.4 + (i - 1) * 0.9, z: cz - 3.2 + s * 0.68, yaw: s > 0 ? Math.PI : 0, h: 0.46, read: true, via: s > 0 ? [[cx - 0.4 + (i - 1) * 0.9, cz - 1.9]] : [[cx + 1.6, cz - 4.2], [cx - 0.4 + (i - 1) * 0.9, cz - 4.3]] });
      put('wdesk', teacherDesk, cx + 2.5, cz + 3.9, 0); this.blocks.push([cx + 2.1, cz + 3.1, cx + 2.9, cz + 4.7, 0, 0.8]); SE.teacher = { x: cx + 3.3, z: cz + 3.9, yaw: -HP };
      put('shelfD', () => shelfGrid(51, 80, 90), cx - 3.4, cz + 4.72, Math.PI); put('shelfE', () => shelfGrid(57, 60, 90), cx - 6.0, z0 + 0.06, 0); put('bannerD_' + id, () => bannerGrid(st.hang, id === 'owl' ? 'star' : 'flame'), cx + 2.6, z0 + 0.06, 0, Y0 + 0.5); put('chandelier', chandelier, cx - 1.5, cz + 0.6, 0, Y0 + 2.1);
      // upstairs: a corridor, three bedrooms to the north and three to the south
      this.wallAt(x0, cz - 1.2, 'x', 203, UP, hh, [dr(1.6, 12), dr(4.8, 12), dr(8.0, 12)], hallIn, wl); this.wallAt(x0, cz + 0.95, 'x', 237, UP, hh, [dr(1.9, 12), dr(5.7, 12), dr(9.5, 12)], wl, hallIn);
      for (const x of [3.24, 6.48, 9.74]) this.wallAt(x0 + x, z0, 'z', 75, UP, hh, [], wl, wl); for (const x of [3.8, 7.6, 11.36]) this.wallAt(x0 + x, cz + 1.24, 'z', 74, UP, hh, [], wl, wl);
      for (let q = 0; q < 3; q++) this.kind('bed_' + id + q, () => bedGrid(st.quilt[q]), S1, { near: true });
      this.kind('deskD', () => { const g = G(); g.box(-18, 28, -10, 18, 30, 10, (x, y, z) => y === 30 ? woodTop(x, z, 5) : OAK_D); for (const x of [-16, 14]) for (const z of [-8, 6]) g.box(x, 0, z, x + 2, 27, z + 2, OAK_D); g.box(-10, 31, -4, 0, 33, 6, 0x7a2c34); g.disc(10, 0, 2, 31, 36, 0xf6eeda); g.set(10, 37, 0, VX.glow(0xffc85a)); return g; }, S1, { near: true });
      const N = (nm, x, z, y) => this.node(nm, x, z, 10 + y);
      N(id + '_door', cx, cz + 4.4, Y0); N(id + '_hall', cx, cz + 1.4, Y0); N(id + '_w', cx - 2.6, cz + 0.9, Y0); N(id + '_e', cx + 3.2, cz + 2.6, Y0); N(id + '_sa', sc + 1.25, cz + 3.8, Y0); N(id + '_sb', sc + 1.25, cz - 2.6, Y1); N(id + '_l', cx + 3.2, cz - 2.2, Y1); N(id + '_c3', cx + 3.2, cz, Y1); this.chain(id + '_door', id + '_hall', id + '_w'); this.chain(id + '_hall', id + '_e', id + '_sa', id + '_sb', id + '_l', id + '_c3'); this.link(id + '_door', id + '_e');
      this.warp(id === 'owl' ? 'dW' : 'dE', id + '_door'); this.warp(id + '_door', id === 'owl' ? 'dW' : 'dE');
      let prev = id + '_c3';
      [[8.0, -1], [9.5, 1], [4.8, -1], [5.7, 1], [1.6, -1], [1.9, 1]].forEach(([dx, s], i) => {
        const X = x0 + dx, nm = id + '_r' + i; N(nm + 'c', X, cz, Y1); this.link(prev, nm + 'c'); if (s > 0) prev = nm + 'c';
        N(nm, X, cz + s * 2.0, Y1); this.link(nm + 'c', nm, nm);
        this.doorAt(nm, X, s < 0 ? cz - 1.05 : cz + 1.1, 'x', 0, { y: Y1, label: '', win: false, locked: id === 'hare' ? 'Closed, and it is going to stay that way.' : '' });
        const c0 = s < 0 ? x0 + [8.0, 0, 4.86, 0, 1.6][i] : x0 + [0, 9.3, 0, 5.6, 0, 1.75][i], hw = s < 0 ? 1.58 : 1.75, zb = cz + s * 3.5;
        for (const q of [-1, 1]) { const bx = c0 + q * (hw - 0.52); this.place('bed_' + id + ((i + (q > 0 ? 1 : 0)) % 3), bx, zb, s < 0 ? 0 : Math.PI, { y: Y1, near: true }); this.blocks.push([bx - 0.5, zb - 1.05, bx + 0.5, zb + 1.05, Y1, Y1 + 0.5]); SE.beds.push({ x: bx, z: zb, y: Y1, yaw: s < 0 ? 0 : Math.PI, room: i, node: nm, side: q }); }
        this.place('deskD', c0, cz + s * 4.48, s < 0 ? 0 : Math.PI, { y: Y1, near: true }); this.blocks.push([c0 - 0.4, cz + s * 4.5 - 0.25, c0 + 0.4, cz + s * 4.5 + 0.25, Y1, Y1 + 0.7]);
      });
      this.signs.push({ x: cx, y: Y0, z: cz + 4.6, r: 1.1, label: 'Leave ' + SE.label, id: id + '_out' });
      if (id === 'owl') this.signs.push({ x: SE.beds[0].x, y: Y1, z: SE.beds[0].z, r: 1.3, label: 'Sleep until morning', id: 'sleep' }, { x: SE.beds[1].x, y: Y1, z: SE.beds[1].z, r: 1.0, label: "Wim's bed", text: "Wim's bed is made so neatly you could cut bread on it." });
    }
  }
  window.ACADEMY = Academy;
})();
