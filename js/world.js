/* ============================================================================
   world.js -- the Wonder Garden: Trap Trick's own little dimension, which only
   she can reach. A round rose courtyard at twilight, closed by a wrought-iron
   fence of card suits, lamps lit; through the gate a path runs to the Heart
   Castle with its clock tower, a great moon rising behind it. Outside the
   fence: a teacup glasshouse glowing amber, a brick tower roofed with a giant
   top hat, toadstools, twisted trees hung with lanterns, topiary suits, giant
   playing cards standing in the lawn and floating in the air, and a hedge all
   round the edge of her world.

   Scenery is made of her own voxels too: 2.4 cm in the courtyard (the fence,
   lamps, gate, toadstools, roses), twice and four times that beyond the fence,
   coarser only for the far castle; meshed once per kind, placed many times.
   Collision is a set of circles plus the fence (`bound`); sit spots (the
   toadstools) are in `seats`; the lamps' lights are listed in `lights`.
   ========================================================================== */
(function () {
  'use strict';
  const H = VX.hash3, TAU = Math.PI * 2, R_ = Math.round;
  const S1 = 0.024, S2 = 0.048, S4 = 0.096;                // her voxel, twice and four times it
  const grid = () => { const g = new VX.Grid(); g.jit = 0; g.merge = true; return g; };
  const mul = (c, k) => { const f = s => Math.max(0, Math.min(255, Math.round(((c >> s) & 255) * k))); return (f(16) << 16) | (f(8) << 8) | f(0); };
  const tube = (g, x, z, r, t, y0, y1, c) => g.disc(x, z, r, y0, y1, (X, Y, Z) => Math.hypot(X - x, Z - z) > r - t ? (typeof c === 'function' ? c(X, Y, Z) : c) : -1);
  const ang = (x, z, n) => Math.floor((Math.atan2(z, x) + Math.PI) / TAU * n);
  const rnd = (() => { let s = 1234567; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

  const PAL = {
    IRON: 0x2a2838, IRON2: 0x474360, GOLD: 0xebc55c, GOLD2: 0xc99a3a, LAMP: 0xffc879, LAMP2: 0xfff0c2,
    STONE: 0xc9c2d6, STONE2: 0xb3abc4, STONE3: 0x958ca8, RED: 0xd42a45, RED2: 0xa91d37, WHITE: 0xf5f1fb, NAVY: 0x1e2260,
    LEAF: 0x2f6b3b, LEAF2: 0x3b8048, LEAF3: 0x4f9a52, BARK: 0x3a2d4d, BARK2: 0x2a2140,
    BLOS: 0xf2a6cf, BLOS2: 0xe887bd, PORC: 0xf3eef8, BLUE: 0x3e63d8, BLACK: 0x1d1b26, BLACK2: 0x2e2b3c,
  };
  // the courtyard's rings (metres from the middle)
  const R_STAGE = 2.4, R_BED = 7.4, R_PATH = 10.75, R_FENCE = 10.95, BOUND = 10.0, GROUND = 120;
  const crossPath = (x, z) => Math.abs(x) < 0.8 || Math.abs(z) < 0.8;   // the four paths through the roses

  /* the four suits as 2D shapes, u and v in about -1..1 (v up) */
  const heartF = (u, v) => Math.pow(u * u + v * v - 1, 3) - u * u * v * v * v < 0;
  function suitShape(suit, u, v) {
    if (suit === 'heart') return heartF(u * 1.15, v * 1.15 + 0.12);
    if (suit === 'diamond') return Math.abs(u) * 1.35 + Math.abs(v) < 1.0;
    if (suit === 'spade') return heartF(u * 1.2, -v * 1.2 + 0.3) || (v < -0.25 && v > -1.0 && Math.abs(u) < 0.1 + (-v - 0.25) * 0.45);
    if (suit === 'club') {
      const c = (cx, cy, r) => (u - cx) ** 2 + (v - cy) ** 2 < r * r;
      return c(0, 0.42, 0.36) || c(-0.4, -0.1, 0.36) || c(0.4, -0.1, 0.36) || (v < -0.1 && v > -1.0 && Math.abs(u) < 0.08 + (-v - 0.1) * 0.35);
    }
    return false;
  }
  const SUIT_RED = { heart: true, diamond: true };

  /* ------------------------------------------------------------ ground -- */
  function groundTexture() {
    const N = 1024, W = GROUND, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(N, N), d = img.data;
    const put = (i, c) => { d[i] = (c >> 16) & 255; d[i + 1] = (c >> 8) & 255; d[i + 2] = c & 255; d[i + 3] = 255; };
    const shade = (c, k) => { const r = Math.min(255, ((c >> 16) & 255) * k), g = Math.min(255, ((c >> 8) & 255) * k), b = Math.min(255, (c & 255) * k); return (r << 16) | (g << 8) | b; };
    const cobble = (x, z, n, tones, mortarC) => {
      const row = Math.floor((z + 100) / 0.45), sx = (x + 100) / 0.6 + (row & 1) * 0.5;
      const fx = sx % 1, fz = ((z + 100) / 0.45) % 1;
      if (fx < 0.1 || fz < 0.12) return mortarC;
      const t = H(Math.floor(sx), row, 5);
      return shade(t < 0.33 ? tones[0] : t < 0.66 ? tones[1] : tones[2], 0.95 + n * 0.08);
    };
    const PATHC = [0xcfc8da, 0xc2bacf, 0xb5adc3];
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
      const x = (px / N - 0.5) * W, z = (py / N - 0.5) * W, i = (py * N + px) * 4;
      const r = Math.hypot(x, z);
      const n = H(px, py, 7), n2 = H(px >> 3, py >> 3, 3), n3 = H(px >> 5, py >> 5, 11);
      let c;
      if (r < R_STAGE) {                                   // her stage: paved like the paths, a red heart in the middle
        const hu = x / 1.15, hv = -z / 1.15 + 0.15;
        c = heartF(hu, hv) ? shade(0xd92b45, 0.94 + n * 0.08) : cobble(x, z, n, PATHC, 0x7d7590);
      } else if (r < R_BED && !crossPath(x, z)) {          // the rose bed: dark leaves, a few fallen petals
        c = n2 < 0.3 ? 0x2a4a2c : n2 < 0.7 ? 0x31572f : 0x3a6436;
        if (n < 0.02) c = 0xb8263c; else if (n < 0.026) c = 0xe9e3ef;
        c = shade(c, 0.9 + n * 0.15);
      } else if (r < R_BED + 0.3 && !crossPath(x, z)) {    // its stone kerb
        c = shade((Math.floor(Math.atan2(x, z) * R_BED / 0.6) & 1) ? 0x9d94b0 : 0x8d84a1, 0.95 + n * 0.08);
      } else if (r < R_PATH || (r < R_BED && crossPath(x, z))) {
        c = cobble(x, z, n, PATHC, 0x7d7590);
      } else if (r < R_PATH + 0.3) {                       // the fence's footing
        c = shade(0x5d5670, 0.95 + n * 0.1);
      } else if (Math.abs(x) < 1.5 + Math.max(0, -z - 30) * 0.02 && z < 0) {   // the path out of the gate to the castle
        c = Math.abs(x) > 1.3 + Math.max(0, -z - 30) * 0.02 ? 0x5d5670 : cobble(x, z, n, PATHC, 0x7d7590);
      } else {                                              // the lawn, with little white and pink flowers
        c = n2 < 0.3 ? 0x3a7040 : n2 < 0.75 ? 0x447c46 : 0x4e8a4d;
        if (n3 < 0.2) c = 0x325f38;
        if (n < 0.005) c = 0xf3eefb; else if (n < 0.008) c = 0xf6a2cf;
        c = shade(c, 0.93 + n * 0.12);
      }
      put(i, c);
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearMipMapLinearFilter; tex.anisotropy = 4;
    return tex;
  }

  /* the courtyard's ground, a pixel to each of her voxels (2.4 cm): her stage with its inlaid heart, the paths' setts in
     rings and rows, the bed's earth with fallen petals, the kerb, the fence's footing, the edge of the lawn */
  const CORE = { N: 1024 };
  function coreGround() {
    const N = CORE.N, d = new Uint8ClampedArray(N * N * 4), P = [0xcfc8da, 0xc6bfd2, 0xb9b1c7, 0xd8d2e2], J = 0x857d98;
    const tone = t => t < 0.14 ? P[3] : t < 0.45 ? P[0] : t < 0.78 ? P[1] : P[2];
    const rings = (r, x, z, w, len, seed) => {           // setts laid in rings
      const k = Math.floor(r / w), fr = r / w - k, n = Math.max(6, R_((k + 0.5) * w * TAU / len)), a = (Math.atan2(z, x) + Math.PI) / TAU * n + (k & 1) * 0.5, fa = (a - Math.floor(a)) * (k + 0.5) * w * TAU / n;
      return fr < 0.11 || fa < 0.024 ? J : tone(H(Math.floor(a) % n, k, seed));
    };
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
      const x = (px - N / 2 + 0.5) * S1, z = (py - N / 2 + 0.5) * S1, r = Math.hypot(x, z), i = (py * N + px) * 4, n = H(px, py, 7);
      let c;
      const path = crossPath(x, z);
      if (r < R_STAGE) {
        const hu = x / 1.15, hv = -z / 1.15 + 0.15, edge = heartF(hu * 1.06, hv * 1.06) !== heartF(hu, hv);
        c = heartF(hu, hv) ? (edge ? 0xebc55c : ((px % 9 === 0 || py % 9 === 0) ? 0xa81f36 : H(Math.floor(px / 9), Math.floor(py / 9), 4) < 0.5 ? 0xd92b45 : 0xcb2740)) : r > R_STAGE - 0.07 ? 0x9d94b0 : rings(r, x, z, 0.26, 0.34, 3);
      } else if (r < R_BED && !path) {
        c = n < 0.25 ? 0x2e2430 : n < 0.6 ? 0x362a36 : 0x3e3040;                        // dark earth under the roses
        const l = H(px >> 2, py >> 2, 9); if (l < 0.34) c = n < 0.5 ? 0x2a4a2c : 0x345c31;
        const f = H(px >> 1, py >> 1, 21); if (f < 0.006) c = 0xb8263c; else if (f < 0.008) c = 0xe9e3ef;
      } else if (r < R_BED + 0.3 && !path) {
        const a = Math.floor(Math.atan2(x, z) * R_BED / 0.5), fa = Math.atan2(x, z) * R_BED / 0.5 - a, t = r - R_BED;
        c = fa < 0.05 || t < 0.024 || t > 0.276 ? 0x6b6380 : t < 0.08 ? 0xb2a9c4 : H(a, 5, 2) < 0.5 ? 0x9d94b0 : 0x938aa7;
      } else if (path && r < R_BED + 0.3) {
        const along = Math.abs(x) < 0.8 ? py : px, across = (Math.abs(x) < 0.8 ? x : z) + 0.8, pa = Math.floor(across / S1);
        if (pa < 6 || pa > 60) c = (along % 24 === 0 || pa === 5 || pa === 61) ? J : 0xada4be;        // a border of long stones
        else { const row = Math.floor(along / 10), off = Math.floor(H(row, 3, 1) * 14), k = Math.floor((pa + off) / 14); c = along % 10 === 0 || (pa + off) % 14 === 0 ? J : tone(H(k, row, 6)); }
      } else if (r < R_PATH) c = rings(r, x, z, 0.24, 0.36, 8);
      else if (r < R_PATH + 0.3) { const a = Math.floor(Math.atan2(x, z) * R_PATH / 0.6), fa = Math.atan2(x, z) * R_PATH / 0.6 - a; c = fa < 0.04 ? 0x3e3852 : H(a, 2, 2) < 0.5 ? 0x5d5670 : 0x544d66; }
      else if (Math.abs(x) < 1.5 && z < 0) {
        const pa = R_((x + 1.5) / S1), row = Math.floor(py / 10), off = Math.floor(H(row, 3, 1) * 14);
        c = Math.abs(x) > 1.32 ? (py % 24 === 0 ? 0x3e3852 : 0x5d5670) : py % 10 === 0 || (pa + off) % 14 === 0 ? J : tone(H(Math.floor((pa + off) / 14), row, 6));
      } else {                                             // the lawn: the same patches as the wide ground's, with blades in them
        const gx = Math.floor((x / GROUND + 0.5) * 1024), gz = Math.floor((z / GROUND + 0.5) * 1024), n2 = H(gx >> 3, gz >> 3, 3), n3 = H(gx >> 5, gz >> 5, 11), nb = H(gx, gz, 7);
        c = n2 < 0.3 ? 0x3a7040 : n2 < 0.75 ? 0x447c46 : 0x4e8a4d; if (n3 < 0.2) c = 0x325f38;
        c = mul(c, 0.93 + nb * 0.12); if (H(px, py >> 1, 5) < 0.2) c = mul(c, 1.1); else if (H(px, py >> 1, 6) < 0.2) c = mul(c, 0.9);
      }
      d[i] = (c >> 16) & 255; d[i + 1] = (c >> 8) & 255; d[i + 2] = c & 255; d[i + 3] = 255;
    }
    return { w: N, h: N, data: d, size: N * S1 };
  }

  /* --------------------------------------------------- the courtyard -- */
  // a little playing card (9 x 13) in the xy plane at z, both faces: a border, its suit in the middle, pips in the corners
  function miniCard(g, x0, y0, z, suit) {
    const c = SUIT_RED[suit] ? PAL.RED : PAL.BLACK;
    for (let i = 0; i < 9; i++) for (let j = 0; j < 13; j++) { if ((i === 0 || i === 8) && (j === 0 || j === 12)) continue; const s = suitShape(suit, (i - 4) / 3, (j - 6) / 3.4), pip = (i === 1 && j === 11) || (i === 7 && j === 1); g.set(x0 + i, y0 + j, z, s || pip ? c : i === 0 || i === 8 || j === 0 || j === 12 ? 0xd8d2ea : PAL.WHITE); }
  }
  /* a crowned heart, its foot at (x, y): glass (glowing) or enamel in a rim, a gold crown over it */
  function crownedHeart(g, cx, y0, z0, z1, w, o) {
    for (let x = -w; x <= w; x++) for (let y = 0; y <= w * 2; y++) {
      const u = x / w, v = (y - w * 1.12) / w; if (!heartF(u, v)) continue;
      const rim = !heartF((x + 1.6) / w, v) || !heartF((x - 1.6) / w, v) || !heartF(u, (y + 1.6 - w * 1.12) / w) || !heartF(u, (y - 1.6 - w * 1.12) / w);
      for (let z = z0; z <= z1; z++) { const face = z === z0 || z === z1; if (face && rim && !o.flatRim) continue; g.set(cx + x, y0 + y, z, rim ? o.rim : o.glass ? VX.glow(u < -0.2 && v > 0.3 ? 0xffb0c8 : (x === 0 || (y % 6 === 0)) ? 0xe85a86 : 0xff7aa2) : (u < -0.25 && v > 0.3 ? 0xe85a70 : PAL.RED)); }
      if (rim) { g.set(cx + x, y0 + y, z0 - 1, o.rim); g.set(cx + x, y0 + y, z1 + 1, o.rim); }
    }
    const yc = y0 + R_(w * 2.0) - 1, cw = R_(w * 0.72), zm0 = z0 - 1, zm1 = z1 + 1;
    g.box(cx - cw, yc, zm0, cx + cw, yc + 1, zm1, PAL.GOLD2); g.box(cx - cw, yc + 2, zm0, cx + cw, yc + 2, zm1, PAL.GOLD);
    for (let k = -2; k <= 2; k++) { const x = cx + R_(k * cw / 2), h = k % 2 === 0 ? 4 : 3; g.box(x, yc + 3, zm0, x, yc + 2 + h, zm1, PAL.GOLD); g.box(x, yc + 3 + h, z0, x, yc + 3 + h, z1, k % 2 === 0 ? VX.glow(0xff5b7d) : PAL.GOLD); }
    for (let k = -1; k <= 1; k++) g.set(cx + k * R_(cw * 0.6), yc + 1, zm1 + 0, k === 0 ? PAL.RED : PAL.BLUE);
  }
  // the lamp: a twisted iron post on a stone foot, a rose climbing it, scroll arms with a lantern on each, card plaques, a crowned heart on top
  function lampGrid() {
    const g = grid();
    g.disc(0, 0, 8, 0, 2, PAL.STONE3); g.disc(0, 0, 7, 3, 4, PAL.STONE2); g.disc(0, 0, 5.4, 5, 7, PAL.IRON); g.disc(0, 0, 4.2, 8, 10, PAL.IRON2); g.disc(0, 0, 3.2, 11, 13, PAL.IRON);
    for (let y = 14; y <= 108; y++) g.disc(0, 0, 2, y, y, (x, yy, z) => ((Math.floor((Math.atan2(z, x) + Math.PI) / TAU * 4 + yy / 7)) & 1) ? PAL.IRON2 : PAL.IRON);      // twisted
    for (const y of [32, 58, 84, 106]) { g.disc(0, 0, 3.2, y, y + 1, PAL.IRON2); g.disc(0, 0, 2.6, y + 2, y + 2, PAL.GOLD2); }
    for (let k = 0; k < 64; k++) {                         // the climbing rose
      const a = k * 0.21, y = 6 + k * 1.05, x = Math.cos(a) * 3.2, z = Math.sin(a) * 3.2; g.set(x, y, z, 0x3f6a34);
      if (k % 4 === 1) { g.set(Math.cos(a) * 4.4, y, Math.sin(a) * 4.4, PAL.LEAF3); g.set(Math.cos(a + 0.3) * 4.4, y + 1, Math.sin(a + 0.3) * 4.4, PAL.LEAF2); }
      if (k % 13 === 6) { const X = R_(Math.cos(a) * 4.6), Z = R_(Math.sin(a) * 4.6), Y = R_(y); g.box(X - 1, Y, Z - 1, X + 1, Y + 1, Z + 1, (xx, yy, zz) => (xx + zz) & 1 ? PAL.RED2 : PAL.RED); g.set(X, Y + 2, Z, 0xe8586e); }
    }
    for (const s of [1, -1]) {
      for (let i = 0; i <= 40; i++) { const t = i / 40; g.set(s * (2 + t * 19), 104 + Math.sin(t * Math.PI) * 7, 0, PAL.IRON); g.set(s * (2 + t * 19), 105 + Math.sin(t * Math.PI) * 7, 0, PAL.IRON2); }
      for (let k = 0; k < 40; k++) { const t = k / 40, a = t * TAU * 1.35 + 0.5, r = 5.4 * (1 - t * 0.6); g.set(s * (10 + Math.cos(a) * r), 98 + Math.sin(a) * r, 0, PAL.IRON); }
      const lx = s * 21;
      g.box(lx, 103, 0, lx, 105, 0, PAL.IRON); g.box(lx - 2, 102, -2, lx + 2, 102, 2, PAL.IRON2); g.box(lx - 3, 101, -3, lx + 3, 101, 3, PAL.IRON); g.box(lx - 5, 100, -5, lx + 5, 100, 5, PAL.IRON); g.box(lx - 6, 99, -6, lx + 6, 99, 6, PAL.IRON2);
      for (let y = 84; y <= 98; y++) { const w = y > 88 ? 5 : 4; g.box(lx - w, y, -w, lx + w, y, w, (x, yy, z) => { const ex = Math.abs(x - lx) === w, ez = Math.abs(z) === w; if (ex && ez) return PAL.IRON; if (!ex && !ez) return Math.abs(x - lx) < 2 && Math.abs(z) < 2 ? VX.glow(PAL.LAMP2) : -1; const a = ex ? z : x - lx; if (yy === 84 || yy === 98) return PAL.IRON; if (a === 0 && yy > 95) return PAL.IRON; return VX.glow(Math.abs(a) < 3 && yy > 86 && yy < 93 ? PAL.LAMP2 : PAL.LAMP); }); }
      g.box(lx - 3, 83, -3, lx + 3, 83, 3, PAL.IRON2); g.box(lx - 1, 82, -1, lx + 1, 82, 1, PAL.IRON); g.box(lx, 80, 0, lx, 81, 0, PAL.GOLD);
      g.box(s * 3, 78, 0, s * 10, 78, 0, PAL.IRON); g.set(s * 11, 79, 0, PAL.IRON); for (const x of [4, 10]) g.box(s * x, 75, 0, s * x, 77, 0, PAL.IRON2);
      miniCard(g, s > 0 ? 3 : -11, 62, 0, s > 0 ? 'heart' : 'spade');
    }
    crownedHeart(g, 0, 109, -2, 2, 9, { rim: PAL.IRON, glass: true });
    return g;
  }
  // a fence panel, 2.3 m: slender bars under an arched rail with gold spearheads, a row of scrolls, a suit in a medallion
  function fencePanelGrid(suit) {
    const g = grid(), W = 48, top = x => 63 + R_(12 * Math.cos(x / W * Math.PI / 2)), MY = 58, MR = 12.5;
    const dM = (x, y) => Math.hypot(x + 0.5, y - MY);
    for (let x = -W; x < W; x++) {
      g.box(x, 4, 0, x, 5, 1, PAL.IRON); g.set(x, 6, 0, PAL.IRON2); g.box(x, 24, 0, x, 25, 1, PAL.IRON);
      if (dM(x, 42) > MR) g.box(x, 42, 0, x, 43, 1, PAL.IRON);
      g.box(x, top(x) - 1, 0, x, top(x), 1, PAL.IRON2); g.set(x, top(x) - 2, 0, PAL.IRON);
    }
    for (let i = -8; i <= 7; i++) {
      const x = i * 6 + 2;
      for (let y = 6; y < top(x) - 1; y++) if (dM(x, y) > MR && dM(x + 1, y) > MR) g.box(x, y, 0, x + 1, y, 1, PAL.IRON);
      const t = top(x) + 1; g.box(x, t, 0, x + 1, t + 1, 1, PAL.IRON); g.box(x - 1, t + 2, 0, x + 2, t + 2, 1, PAL.IRON2); g.box(x - 1, t + 3, 0, x + 2, t + 4, 1, PAL.GOLD2); g.box(x, t + 5, 0, x + 1, t + 6, 1, PAL.GOLD);
    }
    for (let k = -4; k < 4; k++) {                          // the scrolls, in pairs that meet
      const cx = k * 12 + 6;
      for (const s of [-1, 1]) for (let t = 0; t < 44; t++) { const u = t / 44, a = u * TAU * 1.4, r = 5 * (1 - u * 0.72); g.set(cx + s * (Math.sin(a) * r * 0.95 + 0.5), 15 + s * (Math.cos(a) * r - 4.2) * 0 + Math.cos(a) * r, 0, u > 0.85 ? PAL.GOLD2 : PAL.IRON2); }
    }
    for (let x = -14; x <= 13; x++) for (let y = MY - 14; y <= MY + 14; y++) {
      const d = dM(x, y); if (d > MR + 0.4) continue;
      if (d > MR - 1.6) { for (let z = -1; z <= 2; z++) g.set(x, y, z, d > MR - 0.5 ? PAL.IRON2 : PAL.IRON); continue; }
      const u = (x + 0.5) / 8.6, v = (y - MY) / 8.6; if (!suitShape(suit, u, v)) continue;
      const rim = !suitShape(suit, (x + 1.5) / 8.6, v) || !suitShape(suit, (x - 0.5) / 8.6, v) || !suitShape(suit, u, (y + 1 - MY) / 8.6) || !suitShape(suit, u, (y - 1 - MY) / 8.6);
      for (let z = 0; z <= 1; z++) g.set(x, y, z, rim ? (SUIT_RED[suit] ? PAL.RED2 : PAL.IRON) : SUIT_RED[suit] ? (u < -0.2 && v > 0.25 ? 0xe8586e : PAL.RED) : (u < -0.2 && v > 0.1 ? 0x6e6a90 : PAL.IRON2));
      if (!rim) { g.set(x, y, -1, SUIT_RED[suit] ? PAL.RED : PAL.IRON2); g.set(x, y, 2, SUIT_RED[suit] ? PAL.RED : PAL.IRON2); }
    }
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) for (let k = 0; k < 2; k++) g.box(R_(dx * (MR + 1)) - 1, MY + R_(dy * (MR + 1)) - 1, 0, R_(dx * (MR + 1)), MY + R_(dy * (MR + 1)), 1, PAL.GOLD2);
    return g;
  }
  function fencePostGrid() {
    const g = grid();
    g.box(-6, 0, -6, 5, 3, 5, PAL.STONE3); g.box(-5, 4, -5, 4, 5, 4, PAL.STONE2);
    g.box(-3, 6, -3, 2, 84, 2, (x, y, z) => ((x === -3 || x === 2) && (z === -3 || z === 2)) ? PAL.IRON2 : (y > 12 && y < 78 && (x === -1 || x === 0 || z === -1 || z === 0)) ? 0x232130 : PAL.IRON);      // a panelled column
    for (const y of [10, 44, 80]) g.box(-4, y, -4, 3, y + 1, 3, PAL.IRON2);
    g.box(-5, 85, -5, 4, 86, 4, PAL.IRON2); g.box(-4, 87, -4, 3, 87, 3, PAL.IRON); g.box(-2, 88, -2, 1, 89, 1, PAL.GOLD2);
    for (let x = -6; x <= 5; x++) for (let y = 0; y <= 13; y++) { const u = (x + 0.5) / 5.6, v = (y - 7) / 6.4; if (suitShape('spade', u, v)) for (let z = -2; z <= 1; z++) if (Math.abs(z + 0.5) < 1 || suitShape('spade', u * 1.35, v * 1.25)) g.set(x, 90 + y, z, u < -0.2 && v > 0 ? 0xf6dc84 : PAL.GOLD); }
    return g;
  }
  // the gate: stone pillars with crowned hearts, a double iron gate, an arch with a clock over it (its face toward -z)
  function gateGrid() {
    const g = grid();
    const stone = (a, y) => { const row = Math.floor(y / 9), i = Math.floor((a + 200 + (row & 1) * 7) / 14); return y % 9 === 8 || (a + 200 + (row & 1) * 7) % 14 === 0 ? PAL.STONE3 : H(i, row, 3) < 0.35 ? PAL.STONE2 : PAL.STONE; };
    for (const s of [1, -1]) {
      const px = s * 70;
      g.box(px - 10, 0, -11, px + 10, 5, 10, PAL.STONE3); g.box(px - 8, 6, -9, px + 8, 128, 8, (x, y, z) => stone(Math.abs(z) >= 8 || z === -9 ? x : z, y));
      g.box(px - 10, 129, -11, px + 10, 131, 10, PAL.STONE3); g.box(px - 9, 132, -10, px + 9, 133, 9, PAL.STONE2); g.box(px - 4, 134, -5, px + 4, 135, 4, PAL.STONE3);
      crownedHeart(g, px, 134, -3, 2, 10, { rim: PAL.RED2, flatRim: true });
      for (const z of [-10, 9]) for (let x = -5; x <= 5; x++) for (let y = -6; y <= 6; y++) if (suitShape(s > 0 ? 'diamond' : 'club', x / 5.4, y / 5.6)) g.set(px + x, 96 + y, z, s > 0 ? PAL.RED : PAL.IRON2);
    }
    const top = x => 92 + R_(21 * Math.cos(x / 61 * Math.PI / 2)), CY = 71, CR = 18;
    for (let x = -61; x <= 61; x++) {
      g.box(x, 2, 0, x, 4, 1, PAL.IRON2); g.box(x, 46, 0, x, 47, 1, PAL.IRON); g.box(x, top(x) - 1, 0, x, top(x), 1, PAL.IRON2);
      if (((x + 60) % 6) < 2 && Math.abs(x) > 2) for (let y = 5; y < top(x); y++) if (Math.hypot(x, y - CY) > CR) g.box(x, y, 0, x, y, 1, PAL.IRON);
      if (((x + 60) % 12) < 2) { g.box(x, top(x) + 1, 0, x, top(x) + 2, 1, PAL.IRON); g.box(x, top(x) + 3, 0, x, top(x) + 5, 1, PAL.GOLD); }
    }
    for (const s of [1, -1]) { for (let y = 5; y < top(2); y++) if (Math.hypot(2, y - CY) > CR) g.box(s * 2 - (s > 0 ? 0 : 1), y, -1, s * 2 + (s > 0 ? 1 : 0), y, 2, PAL.IRON2); g.box(s * 5 - 1, 44, -2, s * 5 + 1, 50, 3, PAL.GOLD2); }
    for (const s of [1, -1]) for (let k = 0; k < 3; k++) for (let t = 0; t < 70; t++) { const u = t / 70, a = u * TAU * 1.5, r = 9 * (1 - u * 0.75), cx = s * (12 + k * 19); g.set(cx + Math.cos(a) * r * s, 25 + Math.sin(a) * r * (k & 1 ? -1 : 1), 0, u > 0.85 ? PAL.GOLD2 : PAL.IRON2); g.set(cx + Math.cos(a) * r * s, 25 + Math.sin(a) * r * (k & 1 ? -1 : 1), 1, PAL.IRON2); }      // big scrolls low on each leaf
    for (let x = -20; x <= 20; x++) for (let y = -20; y <= 20; y++) { const d = Math.hypot(x, y); if (d <= CR + 0.4 && d > CR - 2) for (let z = -1; z <= 2; z++) g.set(x, CY + y, z, d > CR - 0.6 ? PAL.IRON2 : PAL.IRON); }
    crownedHeart(g, 0, CY - 14, 0, 1, 11, { rim: PAL.RED2, flatRim: true });
    for (let x = -64; x <= 64; x++) { const y = 130 + R_(10 * Math.cos(x / 64 * Math.PI / 2)); g.box(x, y, 0, x, y + 1, 1, PAL.IRON2); g.box(x, y - 6, 0, x, y - 6, 1, PAL.IRON); if ((x + 64) % 8 === 4) g.box(x, y - 5, 0, x, y - 1, 0, PAL.IRON); }
    const KY = 148;                                        // the arch over the gate, and the clock in it
    for (let x = -14; x <= 14; x++) for (let y = -14; y <= 14; y++) {
      const d = Math.hypot(x, y); if (d > 13.3) continue;
      for (let z = -1; z <= 1; z++) g.set(x, KY + y, z, d > 11.6 ? (d > 12.6 ? PAL.GOLD2 : PAL.GOLD) : VX.glow(d < 3 ? 0xfff8e6 : 0xfff1d6));
      if (d > 11.6) { g.set(x, KY + y, -2, PAL.GOLD); g.set(x, KY + y, 2, PAL.GOLD); }
    }
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, long = i % 3 === 0 ? 2 : 1; for (let k = 0; k < long; k++) for (const z of [-2, 2]) g.set(Math.sin(a) * (10 - k), KY + Math.cos(a) * (10 - k), z, PAL.IRON); }
    for (const z of [-2, 2]) { for (let k = 0; k <= 8; k++) g.set(-Math.sign(z) * -k * 0.62, KY + k * 0.62, z, PAL.IRON); for (let k = 0; k <= 6; k++) g.set(Math.sign(z) * -k * 0.86, KY + k * 0.5, z, PAL.IRON2); g.set(0, KY, z, PAL.GOLD2); }
    g.box(-2, KY + 13, -1, 2, KY + 14, 1, PAL.GOLD2); g.box(0, KY + 15, 0, 0, KY + 18, 0, PAL.GOLD);
    return g;
  }
  /* the summoning circle on her stage, where one arrives in her garden: two rings of glowing runes lying on the ground,
     which turn opposite ways. The outer: two circles with a band of runes between; the inner: a circle, a dotted ring
     inside it, and the four suits between it and the outer ring */
  function ringLine(g, r, w, c) { const n = Math.ceil(r * 9); for (let t = 0; t < n; t++) { const a = t / n * TAU; for (let k = 0; k < w; k++) g.set(Math.sin(a) * (r - k), 0, Math.cos(a) * (r - k), c); } }
  function summonOuterGrid() {
    const g = grid(), R1 = 101, R2 = 88, C = VX.glow(0xff9ccf), C2 = VX.glow(0xd7a8ff);
    ringLine(g, R1, 2, C); ringLine(g, R2, 2, C);
    for (let i = 0; i < 36; i++) {
      const a = i / 36 * TAU, rm = (R1 + R2) / 2 - 0.5, sx = Math.sin(a), cz = Math.cos(a);
      const put = (dr, dt) => g.set(sx * (rm + dr) + cz * dt, 0, cz * (rm + dr) - sx * dt, C2);
      if (i % 3 === 0) for (let d = -4; d <= 4; d += 0.5) { put(d, 0); if (Math.abs(d) > 3) { put(d, 1.5); put(d, -1.5); } }      // a stave across the band
      else if (i % 3 === 1) for (let t = -4; t <= 4; t += 0.5) { put(2, t); put(-2, t); if (Math.abs(t) < 0.6) for (let d = -4; d <= 4; d += 0.5) put(d, t); }      // a double bar, crossed
      else for (let t = 0; t < 24; t++) { const b = t / 24 * TAU; put(Math.cos(b) * 3.4, Math.sin(b) * 3.4); if (t % 6 === 0) put(Math.cos(b) * 1.2, Math.sin(b) * 1.2); }      // a ring, four dots in it
    }
    return g;
  }
  function summonInnerGrid() {
    const g = grid(), C = VX.glow(0xff9ccf);
    ringLine(g, 72, 2, C);
    for (let i = 0; i < 60; i++) { const a = i / 60 * TAU; for (let k = 0; k < (i % 5 === 0 ? 4 : 2); k++) g.set(Math.sin(a) * (64 - k), 0, Math.cos(a) * (64 - k), C); }
    ['heart', 'club', 'diamond', 'spade'].forEach((s, i) => {
      const a = i / 4 * TAU + TAU / 8, cx = Math.sin(a) * 80, cz = Math.cos(a) * 80;
      for (let x = -9; x <= 9; x++) for (let z = -9; z <= 9; z++) if (suitShape(s, x / 7, -z / 7)) g.set(cx + x, 0, cz + z, VX.glow(SUIT_RED[s] ? 0xff6f91 : 0xbfa8ff));
    });
    return g;
  }
  // a toadstool to sit on (her seats): its flat cap 0.65 m up
  function toadstoolGrid() {
    const g = grid(), SPOTS = [[0, 0, 4.2], [9, 5, 3], [-8, 7, 3.4], [-4, -10, 3], [8, -8, 2.6], [15, -1, 2.2], [-15, -2, 2.4], [3, 15, 2.4], [-11, -11, 1.8], [12, 12, 1.6]];
    for (let y = 0; y <= 17; y++) g.disc(0, 0, 7.4 + (y < 3 ? (3 - y) * 0.9 : 0) - Math.sin(y / 17 * Math.PI) * 0.9, y, y, (x, yy, z) => (ang(x, z, 22) & 1) ? 0xf1e6d6 : 0xe6dac8);
    g.disc(0, 0, 10.4, 12, 12, 0xf6eee2); g.disc(0, 0, 9.4, 13, 13, 0xe8dccc);                                   // a frilled ring round the stem
    const RR = { 18: 17.4, 19: 18.6, 20: 19, 21: 19, 22: 18.6, 23: 17.8, 24: 16.4, 25: 14.4, 26: 11.4 };
    for (let y = 18; y <= 26; y++) g.disc(0, 0, RR[y], y, y, (x, yy, z) => {
      const d = Math.hypot(x, z);
      if (yy === 18) return d > 15.8 ? PAL.RED2 : (ang(x, z, 40) & 1) ? 0xe8d6c0 : 0xd2bea6;                        // the gills
      for (const [sx, sz, sr] of SPOTS) if (Math.hypot(x - sx, z - sz) < sr && (yy === 26 || d > RR[yy + 1] - 0.4)) return PAL.WHITE;
      return yy > 24 ? 0xdd3550 : yy > 20 ? PAL.RED : PAL.RED2;
    });
    for (const [sx, sz, sr] of SPOTS) if (Math.hypot(sx, sz) < 9) g.disc(sx, sz, sr - 1, 27, 27, (x, y, z) => g.get(x, 26, z) >= 0 ? PAL.WHITE : -1);
    return g;
  }
  // a rose, 0.4 m: a thorned stem, leaves in threes, a bloom of curled petals (red, white, white half painted red, or blue)
  function roseGrid(bloom, top) {
    const g = grid(), d = mul(bloom, 0.8), hi = mul(top, 1.12), L = 0x3f8a3a, L2 = 0x2f6b2e;
    g.box(0, 0, 0, 0, 11, 0, L2);
    for (const [y, dx, dz] of [[3, 1, 0], [6, -1, 0], [8, 0, 1]]) { g.set(dx, y, dz, L2); g.box(dx * 2 - (dz ? 1 : 0), y, dz * 2 - (dx ? 1 : 0), dx * 3 + (dz ? 1 : 0), y, dz * 3 + (dx ? 1 : 0), L); }
    g.box(-1, 11, -1, 1, 11, 1, L2);                                                                              // the sepals
    g.box(-2, 12, -2, 2, 13, 2, (x, y, z) => Math.abs(x) === 2 && Math.abs(z) === 2 ? -1 : (Math.abs(x) === 2 ? d : bloom));
    g.box(-2, 14, -2, 2, 14, 2, (x, y, z) => Math.abs(x) + Math.abs(z) > 3 ? -1 : (Math.abs(x) === 2 || Math.abs(z) === 2) ? top : mul(top, 0.82));
    g.box(-1, 15, -1, 1, 15, 1, (x, y, z) => (x === 1 && z === 1) || (x === -1 && z === -1) ? -1 : x === 0 && z === 0 ? mul(top, 0.72) : top); g.set(0, 16, 0, hi);
    for (const [x, z] of [[3, 0], [-1, -3]]) g.set(x, 12, z, d);                                  // outer petals, curling away
    return g;
  }

  /* ----------------------------------------------------- the backdrop -- */
  function castleGrid() {
    const g = new VX.Grid(); g.jit = 0.04;
    const stone = (x, y, z) => { const n = H(x, y, z); return y % 5 === 0 ? 0xa59bbd : (n < 0.25 ? 0x8b81a3 : n < 0.7 ? 0xb8afcb : 0xa59bbd); };
    // the hill it stands on
    for (let x = -44; x <= 44; x++) for (let z = -34; z <= 26; z++) {
      const d = Math.hypot(x / 44, (z + 4) / 30); if (d > 1) continue;
      const top = Math.round(7 * (1 - d * d));
      for (let y = Math.max(0, top - 2); y <= top; y++) g.set(x, y, z, y === top ? (H(x, y, z) < 0.5 ? 0x2f5a3a : 0x376640) : 0x4a4560);
    }
    const Y0 = 7;
    const shell = (x0, y0, z0, x1, y1, z1) => {
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
        if (x !== x0 && x !== x1 && z !== z0 && z !== z1 && y !== y1) continue;
        g.set(x, y, z, stone(x, y, z));
      }
      for (let x = x0; x <= x1; x++) for (const z of [z0, z1]) if ((x & 1) === 0) g.set(x, y1 + 1, z, (x & 2) ? PAL.RED : PAL.WHITE);
      for (let z = z0; z <= z1; z++) for (const x of [x0, x1]) if ((z & 1) === 0) g.set(x, y1 + 1, z, (z & 2) ? PAL.RED : PAL.WHITE);
    };
    const roofCol = (style, x, y, z, cx, cz) => {
      if (style === 'stripe') return (y >> 1) & 1 ? PAL.RED : PAL.WHITE;
      if (style === 'check') return ((Math.floor(Math.atan2(z - cz, x - cx) / TAU * 12 + 12) + (y >> 1)) & 1) ? PAL.BLACK2 : PAL.WHITE;
      return (y % 3 === 0) ? 0x3b56c8 : 0x2f3f9e;
    };
    const tower = (cx, cz, r, y0, h, roofH, style, lean) => {
      const off = y => (lean || 0) * (y - y0);
      for (let y = y0; y <= y0 + h; y++) {
        const ox = cx + off(y);
        for (let x = Math.floor(ox - r - 1); x <= ox + r + 1; x++) for (let z = Math.floor(cz - r - 1); z <= cz + r + 1; z++) {
          const d = Math.hypot(x - ox, z - cz);
          if (d <= r + 0.3 && (d > r - 1.3 || y === y0 + h)) g.set(x, y, z, stone(x, y, z));
        }
      }
      const yb = y0 + h + 1;
      for (let y = 0; y <= roofH; y++) {
        const rr = (r + 1.4) * (1 - y / (roofH + 0.5)), ox = cx + off(yb + y) * 1.4;
        for (let x = Math.floor(ox - rr - 1); x <= ox + rr + 1; x++) for (let z = Math.floor(cz - rr - 1); z <= cz + rr + 1; z++) {
          const d = Math.hypot(x - ox, z - cz);
          if (d <= rr + 0.3 && d > rr - 1.4) g.set(x, yb + y, z, roofCol(style, x, y, z, ox, cz));
        }
      }
      const tx = Math.round(cx + off(yb + roofH) * 1.4);
      g.set(tx, yb + roofH + 1, cz, PAL.GOLD); g.set(tx, yb + roofH + 2, cz, PAL.GOLD);
      // heart windows round it, lit
      for (let y = y0 + 5; y < y0 + h - 3; y += 7) for (const a of [0, TAU / 4, -TAU / 4, TAU / 2]) {
        const wx = Math.round(cx + off(y) + Math.sin(a) * r), wz = Math.round(cz + Math.cos(a) * r);
        g.set(wx, y, wz, VX.glow(0xffc98a)); g.set(wx, y + 1, wz, VX.glow(0xffc98a));
      }
    };
    const heartWindow = (cx, cy, z) => {
      for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) if (heartF(x / 3, y / 3 + 0.1)) g.set(cx + x, cy + y, z, VX.glow((x + y) & 1 ? 0xffc98a : 0xffb3a8));
    };
    // the keep, its front (+z) to the garden
    shell(-18, Y0, -10, 18, Y0 + 26, 9);
    for (const x of [-12, -5, 5, 12]) for (const y of [Y0 + 7, Y0 + 15]) heartWindow(x, y, 9);
    for (let x = -4; x <= 4; x++) for (let y = 0; y <= 9; y++) if (y < 5 || Math.hypot(x, y - 5) < 4.6) g.set(x, Y0 + y, 9, VX.glow(y < 2 ? 0xffd9a0 : 0xffc583));   // the door, lit
    for (const s of [1, -1]) for (let y = Y0 + 12; y <= Y0 + 23; y++) for (let x = 0; x <= 2; x++) {    // suit banners
      const bx = s * 9 + x - 1, u = (x - 1) / 1.3, v = (y - Y0 - 18) / 2.2;
      if (y === Y0 + 12 && x === 1) continue;
      g.set(bx, y, 10, Math.abs(u) < 0.8 && Math.abs(v) < 0.8 && heartF(u * 1.2, v * 1.2) ? PAL.WHITE : PAL.RED);
    }
    // the clock tower in the middle, its face to the garden
    tower(0, -1, 7, Y0 + 26, 14, 18, 'stripe');
    for (let x = -6; x <= 6; x++) for (let y = -6; y <= 6; y++) {
      const d = Math.hypot(x, y); if (d > 6.3) continue;
      g.set(x, Y0 + 34 + y, 7, d > 5.3 ? PAL.GOLD : VX.glow(0xfff0d0));
    }
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.set(Math.round(Math.sin(a) * 4.4), Y0 + 34 + Math.round(Math.cos(a) * 4.4), 8, PAL.BLACK); }
    for (let k = 0; k <= 4; k++) g.set(-Math.round(k * 0.6), Y0 + 34 + k, 8, PAL.BLACK);
    for (let k = 0; k <= 3; k++) g.set(k, Y0 + 34 - Math.round(k * 0.4), 8, PAL.BLACK);
    // the towers: a tall crooked spire, a checkered one, two striped corner turrets, a blue one
    tower(-13, -6, 4, Y0, 44, 14, 'check', 0.16);
    tower(14, -6, 5, Y0, 34, 12, 'blue');
    tower(-22, 6, 3.6, Y0, 22, 9, 'stripe');
    tower(22, 6, 3.6, Y0, 25, 9, 'stripe');
    tower(25, -8, 3, Y0, 16, 7, 'check');
    // a heart weathervane on the crooked spire
    const vx = Math.round(-13 + 0.16 * 44 * 1.4 + 0.16 * 14 * 1.4), vy = Y0 + 44 + 1 + 14 + 3;
    for (let x = -2; x <= 2; x++) for (let y = 0; y <= 4; y++) if (heartF(x / 2.2, (y - 2.4) / 2.2)) g.set(vx + x, vy + y, -6, PAL.GOLD);
    return g;
  }
  function moonGrid() {
    const g = new VX.Grid(); g.jit = 0;
    const R = 16, CR = [[-5, 4, 3.6], [6, -3, 3], [2, 9, 2.2], [-7, -7, 2.8], [9, 6, 1.8], [-1, -10, 2]];
    for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) {
      const d = Math.hypot(x, y); if (d > R + 0.3) continue;
      let c = H(x, y, 9) < 0.3 ? 0xffe9d9 : 0xfff2e6;
      for (const [cx, cy, cr] of CR) { const e = Math.hypot(x - cx, y - cy); if (e < cr - 0.6) c = 0xf3d3c4; else if (e < cr + 0.4) c = 0xfaddce; }
      if (d > R - 1.2) c = 0xffdccc;
      g.set(x, y, 0, VX.glow(c));
    }
    return g;
  }
  // a glasshouse shaped like a teacup on its saucer: amber panes in a gold frame, a porcelain handle (on +x); voxels of 9.6 cm
  function teacupGrid() {
    const g = grid(), K = 0.25 / S4;
    g.flat = new Set([0xffc77a, 0xffb45e, 0xf8a957].map(VX.glow));
    for (let y = 0; y <= 9; y++) g.disc(0, 0, [52, 62, 69, 73, 75, 76.5, 78, 78, 78, 78][y], y, y, (x, yy, z) => {
      const d = Math.hypot(x, z);
      if (yy >= 7) return d > 72 ? (d > 76.6 ? PAL.GOLD : PAL.PORC) : -1;
      if (yy === 6 && d > 63 && d < 67) return (ang(x, z, 48) & 1) ? PAL.BLUE : 0x2f4fb8;                           // a blue ring round the saucer
      if (yy < 6 && d < 46) return -1;
      return d > 76.4 ? PAL.GOLD : PAL.PORC;
    });
    const CR = y => Math.round((12 + Math.max(0, Math.floor(y / 4) * 4 / K - 4) * 0.38) * K * 2) / 2, Y0 = 8, Y1 = 98;
    g.inside = (x, y, z) => y >= 7 && y <= Y1 - 6 && Math.hypot(x, z) < CR(y) - 2.2;
    for (let y = Y0; y <= Y1; y++) {
      const R = CR(y);
      for (let x = -Math.ceil(R + 1); x <= R + 1; x++) for (let z = -Math.ceil(R + 1); z <= R + 1; z++) {
        const d = Math.hypot(x, z); if (d > R + 0.3 || d < R - 1.7) continue;
        let c;
        if (y <= 15) c = y >= 14 ? PAL.GOLD : y === 8 ? PAL.GOLD2 : PAL.PORC;                         // the foot
        else if (y >= 93) c = y >= 97 ? PAL.GOLD : PAL.PORC;                                          // the rim
        else {
          const n = 22, sg = (Math.atan2(z, x) / TAU * n + n) % 1, row = Math.floor((y - 16) / 11), wob = 0.5 - Math.abs(sg - 0.5), arc = row === 6 && wob < 0.06 + (y - 82) * 0.02;
          const frame = wob * R * TAU / n < 1.15 || (y - 16) % 11 < 1 || arc, seg = Math.floor((Math.atan2(z, x) / TAU * n + n)), fine = false;
          c = frame ? ((y - 16) % 11 < 1 ? PAL.GOLD : PAL.GOLD2) : fine ? PAL.GOLD2 : VX.glow(H(seg % n, row, 1) < 0.28 ? 0xffc77a : H(seg % n, row, 2) < 0.55 ? 0xffb45e : 0xf8a957);   // brightly lit: what's inside?
        }
        g.set(x, y, z, c);
      }
    }
    for (let k = 0; k < 22; k++) { const a = (k + 0.5) / 22 * TAU, r = CR(95) + 0.6, x = Math.cos(a) * r, z = Math.sin(a) * r; g.ell(x, 95, z, 0.8, 0.8, 0.8, k % 2 ? PAL.RED : PAL.BLUE); }      // painted dots round the rim
    const hx = CR(57) + 14, hy = 54;                       // the handle
    for (let x = Math.floor(hx - 24); x <= hx + 24; x++) for (let y = hy - 24; y <= hy + 24; y++) for (let z = -5; z <= 5; z++) {
      if (Math.hypot(x, z) < CR(y) - 1) continue;
      const q = Math.hypot(Math.hypot(x - hx, y - hy) - 17, z);
      if (q <= 4.6) g.set(x, y, z, Math.abs(z) < 2 && Math.hypot(x - hx, y - hy) > 20 ? PAL.GOLD : PAL.PORC);
    }
    return g;
  }
  // a round brick tower whose roof is a giant top hat (black, a blue band, a card tucked in it); its front (+z) to the garden; voxels of 9.6 cm
  function hatTowerGrid() {
    const g = grid(), K = 0.25 / S4, R = 28.6, TOP = R_(50 * K);
    g.inside = (x, y, z) => y < TOP && Math.hypot(x, z) < R - 1.2;
    const brick = (x, y, z) => {
      const row = Math.floor(y / 4), n = 28, a = (Math.atan2(z, x) + Math.PI) / TAU * n + (row & 1) * 0.5;
      if (y % 4 === 3 || a % 1 < 0.12) return 0x5a3a44;
      const t = H(Math.floor(a) % n, row, 3);
      return t < 0.3 ? 0x8c4a4f : t < 0.66 ? 0x7d3f47 : 0x9a5656;
    };
    for (let y = 0; y <= TOP; y++) g.disc(0, 0, y < 8 ? R + 1 : R, y, y, (x, yy, z) => Math.hypot(x, z) > R - 1.6 ? (yy < 8 ? (yy === 7 ? PAL.STONE2 : (ang(x, z, 26) & 1) ? PAL.STONE3 : 0x8a819d) : brick(x, yy, z)) : -1);
    const win = (a, y0) => {
      for (let k = -5; k <= 5; k++) for (let y = -2; y <= 18; y++) {
        const arch = y < 12 ? 4 : Math.sqrt(Math.max(0, 16 - ((y - 12) * 0.7) ** 2)), frame = Math.abs(k) > arch - 0.5 || y < 0; if (Math.abs(k) > arch + 1.2 || y > 17) continue;
        for (const out of frame ? [0, 0.8] : [0]) g.set(Math.sin(a) * (R + out) + Math.cos(a) * k, y0 + y, Math.cos(a) * (R + out) - Math.sin(a) * k, frame ? (y < 0 ? PAL.STONE2 : 0x4a2f3a) : (k === 0 || y === 7) ? PAL.IRON : VX.glow(y > 8 ? 0xffd590 : 0xffbf70));
      }
    };
    for (const [a, y] of [[0, 12], [0.9, 26], [-0.7, 28], [0, 40], [2.2, 18], [-2.4, 34]]) win(a, R_(y * K));
    for (let y = 0; y <= 25; y++) for (let k = -8; k <= 8; k++) { const arch = y < 17 ? 7 : Math.sqrt(Math.max(0, 49 - (y - 17) ** 2)); if (Math.abs(k) > arch + 1) continue; const z = R_(Math.sqrt(R * R - k * k)); g.set(k, y, z + 1, Math.abs(k) > arch - 0.5 ? PAL.STONE2 : (y === 11 || y === 12) && k === 5 ? PAL.GOLD : y === 5 || y === 18 ? PAL.IRON : (k + 20) % 3 === 0 ? 0x38222c : 0x4a2f3a); }   // the door
    // the hat
    g.disc(0, 0, R + 16, TOP + 1, TOP + 4, (x, y, z) => { const d = Math.hypot(x, z); return d < R - 3 && y < TOP + 4 ? -1 : d > R + 14.4 ? (y === TOP + 4 ? PAL.BLACK2 : 0x23212e) : PAL.BLACK; });
    tube(g, 0, 0, R + 16, 2, TOP + 5, TOP + 5, PAL.BLACK2);
    for (let y = TOP + 5; y <= TOP + 66; y++) {
      const f = (y - TOP - 5) / 61, r = R - 2.4 + f * f * 4.4;
      g.disc(0, 0, r, y, y, (x, yy, z) => {
        if (Math.hypot(x, z) < r - 1.8 && yy < TOP + 66) return -1;
        if (yy >= TOP + 7 && yy <= TOP + 20) return yy < TOP + 9 || yy > TOP + 18 ? 0x22368f : PAL.BLUE;
        return yy === TOP + 66 && Math.hypot(x, z) > r - 2 ? PAL.BLACK2 : (ang(x, z, 34) % 5 === 0) ? PAL.BLACK2 : PAL.BLACK;
      });
    }
    // the card in the band, and a bow on its side
    const cz = R_(R) + 1;
    for (let x = -10; x <= 10; x++) for (let y = 0; y <= 32; y++) { if (Math.abs(x) === 10 && (y === 0 || y === 32)) continue; const e = Math.abs(x) >= 9 || y < 1 || y > 31; g.set(x, TOP + 12 + y, cz, e ? 0xd8d2ea : PAL.WHITE); }
    for (let x = -7; x <= 7; x++) for (let y = -8; y <= 8; y++) if (heartF(x / 6, y / 6.4 + 0.1)) g.set(x, TOP + 28 + y, cz + 1, PAL.RED);
    for (const [x, y] of [[-7, 39], [7, 15]]) g.box(x - 1, TOP + y, cz + 1, x + 1, TOP + y + 2, cz + 1, PAL.RED);
    for (const s of [1, -1]) { g.ell(s * 10 - R, TOP + 14, 0, 6, 5, 3, (x, y, z) => (Math.abs(y - TOP - 14) < 1) ? 0x2a48a8 : PAL.BLUE); g.line(s * 3 - R, TOP + 10, 0, s * 8 - R, TOP - 6, 1, 0x2f52c4, 1.4); }
    g.ell(-R, TOP + 14, 0, 2.4, 3, 3.4, 0x22368f);
    return g;
  }
  // a twisted tree: two strands winding round each other, curling branches, pink blossom puffs, lanterns hung on strings (7.2 cm)
  function twistTreeGrid(seed) {
    const g = grid(), K = 2.08;
    const bark = (x, y, z) => H(ang(x, z, 14), y >> 3, 2) < 0.4 ? PAL.BARK2 : PAL.BARK;
    for (let y = 0; y <= 22 * K; y++) for (const s of [0, Math.PI]) {
      const a = y / K * 0.32 + s + seed, r = (1.9 - y / K * 0.045) * K;
      g.ell(Math.cos(a) * 1.3 * K, y, Math.sin(a) * 1.3 * K, r - 0.3, 0.6, r - 0.3, s ? bark : (x, yy, z) => H(ang(x, z, 14), yy >> 3, 5) < 0.4 ? PAL.BARK : 0x46375c);
    }
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + seed; g.line(0, 3, 0, Math.cos(a) * 4.6 * K, 0, Math.sin(a) * 4.6 * K, bark, 1.6); }
    for (let k = 0; k < 4; k++) {
      const b = seed * 1.7 + k * TAU / 4 + 0.4, y0 = (17 + (k % 2) * 4) * K, len = (8 + (k % 3)) * K;
      let px = 0, py = y0, pz = 0;
      for (let i = 1; i <= 24; i++) {
        const t = i / 24, x = Math.cos(b) * t * len, y = y0 + (Math.sin(t * Math.PI * 0.8) * 4 + t * 2) * K, z = Math.sin(b) * t * len;
        g.line(px, py, pz, x, y, z, bark, 2 - t * 1.3); px = x; py = y; pz = z;
      }
      for (let i = 0; i < 26; i++) {                                    // the branch end curls over
        const u = i / 26 * Math.PI * 1.8, cr = (2 - i * 0.045) * K;
        g.set(px + Math.cos(b) * Math.sin(u) * cr, py + 2 * K - Math.cos(u) * 2 * K, pz + Math.sin(b) * Math.sin(u) * cr, PAL.BARK);
      }
      if (k % 2 === 0) for (const [dx, dy, dz, r] of [[0, 4, 0, 5], [4, 3, 2, 3.4], [-3, 3, -3, 3.4], [1, 7, -1, 3]]) g.ell(px + dx, py + dy, pz + dz, r, r * 0.8, r, (x, y, z) => { const n = H(x >> 1, y >> 1, z >> 1); return H(x, y, z) < 0.08 ? -1 : n < 0.12 ? 0xfbd2e6 : n < 0.6 ? PAL.BLOS : PAL.BLOS2; });
      else {
        const lx = R_(px * 0.7), lz = R_(pz * 0.7), ly = R_(y0 + 3 * K);
        g.box(lx, ly - 8, lz, lx, ly, lz, PAL.IRON); g.box(lx - 1, ly - 9, lz - 1, lx + 1, ly - 9, lz + 1, PAL.IRON2);
        g.box(lx - 3, ly - 10, lz - 3, lx + 3, ly - 10, lz + 3, PAL.IRON);
        g.box(lx - 2, ly - 16, lz - 2, lx + 2, ly - 11, lz + 2, (x, y, z) => Math.abs(x - lx) === 2 && Math.abs(z - lz) === 2 ? PAL.IRON : VX.glow(y > ly - 13 ? PAL.LAMP : PAL.LAMP2)); g.box(lx - 2, ly - 17, lz - 2, lx + 2, ly - 17, lz + 2, PAL.IRON); g.set(lx, ly - 18, lz, PAL.GOLD);
      }
    }
    return g;
  }
  // a giant toadstool, its cap `rad` metres across its radius, in voxels of `sv`: a frilled stem, gills, round spots
  function mushroomGrid(kind, rad, sv) {
    const g = grid(), V = m => m / sv;
    const cap = kind === 'teal' ? [0x2c8fa8, 0x237a91, 0x36a4be] : kind === 'pink' ? [0xe36fae, 0xc9579a, 0xf088c0] : [PAL.RED, PAL.RED2, 0xdd3550];
    const spot = kind === 'teal' ? VX.glow(0xaaf6ff) : kind === 'pink' ? VX.glow(0xffe3f3) : PAL.WHITE;
    g.flat = new Set([spot]);
    const Rr = V(rad), Hs = R_(V(rad * 1.0)), Hc = Rr * 0.6, sr = V(rad * 0.29);
    g.inside = (x, y, z) => y > Hs + 1 && (x / (Rr - 2)) ** 2 + ((y - Hs - 1) / (Hc - 2)) ** 2 + (z / (Rr - 2)) ** 2 < 1;
    for (let y = 0; y <= Hs; y++) { const t = y / Hs, r = sr * (1.25 - 0.35 * Math.sin(t * Math.PI * 0.6)) ; g.disc(0, 0, r, y, y, (x, yy, z) => Math.hypot(x, z) < r - 2.4 ? -1 : (ang(x, z, 26) % 3 === 0) ? 0xe2d6c4 : 0xf1e6d6); }
    for (let k = 0; k < 3; k++) tube(g, 0, 0, sr * 1.5 - k * 0.8, sr * 0.6, R_(Hs * 0.66) + k, R_(Hs * 0.66) + k, k === 0 ? 0xf6eee2 : 0xe8dccc);
    const SP = []; for (let i = 0; i < 16; i++) { const a = i * 2.4 + rad * 7, d = Math.sqrt((i + 0.3) / 16) * 0.97; SP.push([Math.cos(a) * d * Rr, Math.sin(a) * d * Rr, Rr * (0.06 + H(i, 3, R_(rad * 10)) * 0.1)]); }
    for (let x = -Math.ceil(Rr); x <= Rr; x++) for (let z = -Math.ceil(Rr); z <= Rr; z++) {
      const d = (x / Rr) ** 2 + (z / Rr) ** 2; if (d > 1) continue;
      const top = Math.floor(Hc * Math.sqrt(1 - d)), dd = Math.hypot(x, z);
      g.set(x, Hs + 1, z, dd > Rr - 1.6 ? cap[1] : (ang(x, z, 44) & 1) ? 0xe8d6c0 : 0xd6c2aa);                      // the gills
      const nd = Math.max(((Math.abs(x) + 1) / Rr) ** 2 + (z / Rr) ** 2, (x / Rr) ** 2 + ((Math.abs(z) + 1) / Rr) ** 2), low = nd > 1 ? 0 : Math.floor(Hc * Math.sqrt(1 - nd));
      let c = null; for (const [sx, sz, r] of SP) if (Math.hypot(x - sx, z - sz) < r) { c = spot; break; }
      for (let y = Math.max(1, low); y <= top; y++) g.set(x, Hs + 1 + y, z, c != null ? c : y > Hc * 0.8 ? cap[2] : y > Hc * 0.3 ? cap[0] : cap[1]);
    }
    return g;
  }
  function topiaryGrid(suit) {                             // a suit clipped out of box, in a stone planter (4.8 cm)
    const g = grid(), K = 2.5;
    g.inside = (x, y, z) => y > 0 && y < 8 && Math.abs(x) < 12 && Math.abs(z) < 12;
    g.box(-13, 0, -13, 13, 10, 13, (x, y, z) => { const e = Math.abs(x) > 11 || Math.abs(z) > 11; if (!e) return y === 8 ? 0x3e3040 : -1; return y > 8 ? PAL.STONE2 : y < 2 ? PAL.STONE3 : (Math.abs(x) > 11 && Math.abs(z) > 11) ? PAL.STONE2 : suitShape(suit, (Math.abs(x) > 11 ? z : x) / 3.4, (y - 5) / 3) ? (SUIT_RED[suit] ? PAL.RED2 : PAL.IRON2) : PAL.STONE; });
    for (let y = 9; y <= 14; y++) g.disc(0, 0, 2.4, y, y, PAL.BARK);
    const R = 8.5 * K, cy = 12 + 9 * K;
    for (let x = -Math.ceil(R); x <= R; x++) for (let y = -Math.ceil(R); y <= R; y++) {
      if (!suitShape(suit, x / R, y / R)) continue;
      let depth = 5; for (const k of [1, 2, 3]) if (!suitShape(suit, (x + k) / R, y / R) || !suitShape(suit, (x - k) / R, y / R) || !suitShape(suit, x / R, (y + k) / R) || !suitShape(suit, x / R, (y - k) / R)) { depth = k + 1; break; }      // rounded edges
      for (let z = -depth; z <= depth; z++) {
        const n = H(x >> 1, y >> 1, z >> 1), fl = H(x >> 1, y >> 1, z > 0 ? 7 : 8);
        if (Math.abs(z) === depth && H(x, y, z) < 0.1) continue;
        g.set(x, cy + y, z, Math.abs(z) === depth && fl < 0.02 ? PAL.RED : Math.abs(z) === depth && fl < 0.034 ? PAL.WHITE : n < 0.26 ? PAL.LEAF3 : n < 0.7 ? PAL.LEAF2 : PAL.LEAF);
      }
    }
    return g;
  }
  function hedgeGrid() {                                   // the hedge at the edge of her world, 4.5 m of it, 3 m high (20 cm: it's 30 m off)
    const g = grid();
    g.inside = (x, y, z) => y < 13 && Math.abs(x) < 11 && Math.abs(z) < 2;
    g.box(-11, 0, -3, 11, 14, 3, (x, y, z) => {
      if (Math.abs(x) < 11 && y < 13 && Math.abs(z) < 2) return -1;
      const n = H(Math.floor(x / 4), Math.floor(y / 3), z >> 2), f = H(x, y, z);
      if (y === 14 && n < 0.4) return -1;
      if (f > 0.99) return PAL.RED; if (f > 0.984) return PAL.WHITE;
      return n < 0.35 ? 0x264f30 : n < 0.7 ? 0x2b5a35 : 0x346a3e;
    });
    return g;
  }
  /* a giant playing card: its face painted finely with the same true suits as her outfit, a lattice back */
  function bigCardGrid(suit, rank) {
    const g = new VX.Grid(); g.jit = 0.02;
    const W = 15, Hh = 21;
    for (let x = 0; x < W; x++) for (let y = 0; y < Hh; y++) {
      const corner = (x === 0 || x === W - 1) && (y === 0 || y === Hh - 1);
      if (corner) continue;
      const edge = x === 0 || x === W - 1 || y === 0 || y === Hh - 1;
      g.set(x - 7, y, 0, PAL.WHITE);
      const lat = ((x + y) % 4 === 0 || (x - y + 40) % 4 === 0);
      g.set(x - 7, y, -1, edge || x === 1 || y === 1 || x === W - 2 || y === Hh - 2 ? PAL.WHITE : (lat ? 0x3a5fe0 : PAL.NAVY));
    }
    const face = window.TRAPTRICK.cardFace(W, Hh, suit, rank, { big: 0.6, bigH: 0.44 });
    g.tex = { test: (x, y, z) => z === 0 ? 3 : 0, color: (px, py, pz) => pz < 0.4 ? -1 : (c => c < 0 ? 0xd8d2ea : c)(face(px + 7.5, py + 0.5)) };
    return g;
  }
  function tuftGrid() {                                    // a tuft of grass: blades of a voxel, leaning out, paler at the tips
    const g = grid();
    for (const [x, z, h, lx, lz] of [[0, 0, 6, 0, 0], [2, 1, 4, 1, 0], [-2, 1, 5, -1, 0], [1, -2, 4, 0, -1]]) for (let y = 0; y < h; y++) g.set(x + (y > 2 ? lx : 0), y, z + (y > 2 ? lz : 0), y > 2 ? 0x62b455 : 0x438845);
    return g;
  }

  /* ------------------------------------------------------------- world -- */
  class World {
    constructor(scene) {
      this.scene = scene; this.colliders = []; this.seats = []; this.clouds = []; this.floaters = []; this.lights = [];
      this.bound = BOUND; this.groundSize = GROUND; this.farColor = 0x23302c; this.t = 0;
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND, GROUND), new THREE.MeshLambertMaterial({ map: groundTexture() }));
      ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
      const far = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshLambertMaterial({ color: this.farColor }));
      far.rotation.x = -Math.PI / 2; far.position.y = -0.02; scene.add(far);

      const core = this.core = coreGround();                 // the courtyard's own ground, laid over the wide one
      {
        const cv = document.createElement('canvas'); cv.width = cv.height = core.w;
        const ctx = cv.getContext('2d');
        if (ctx.putCore) ctx.putCore(core); else { const img = ctx.createImageData(core.w, core.h); img.data.set(core.data); ctx.putImageData(img, 0, 0); }
        const tex = new THREE.CanvasTexture(cv); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearMipMapLinearFilter; tex.anisotropy = 4;
        const cg = new THREE.Mesh(new THREE.PlaneGeometry(core.size, core.size), new THREE.MeshLambertMaterial({ map: tex }));
        cg.rotation.x = -Math.PI / 2; cg.position.y = 0.004; cg.receiveShadow = true; scene.add(cg);
      }

      const kinds = {};
      // (everything sits on the 2.4 cm lattice, its lowest row on the ground, so the grain lines up with the voxels)
      const kind = (name, make, s, o) => kinds[name] || (kinds[name] = VX.meshGrid(make(), s, { offset: s === S1 ? [-0.5, -0.5, -0.5] : s === S2 || s === S4 ? [0, -0.5, 0] : [0, 0, 0], ...o }));
      const FLAT = { ao: false };                              // (thin ironwork and glass: no baked occlusion, so it merges)
      const place = (name, x, z, ry, sc, opts) => {
        const G = kinds[name];
        const m = VX.meshPair(G, VX.grainMat(), { cast: !(opts && opts.noCast), glowMat: opts && opts.glowMat });
        m.position.set(x, (opts && opts.y) || 0, z); m.rotation.y = ry || 0; if (sc) m.scale.setScalar(sc);
        if (opts && opts.name) m.userData.bake = opts.name;
        if (opts && opts.noCast) m.userData.noCast = true;
        scene.add(m); return m;
      };
      const col = (x, z, r) => this.colliders.push({ x, z, r });
      const facing = (x, z) => Math.atan2(-x, -z);                     // a prop's +z toward the middle
      const light = (x, y, z, c, e, r) => this.lights.push({ p: [x, y, z], c, e, r });

      /* the fence: 28 panels round the courtyard, a post at each joint, the gate to the north */
      ['heart', 'spade', 'diamond', 'club'].forEach(s => kind('panel_' + s, () => fencePanelGrid(s), S1, FLAT));
      kind('fpost', fencePostGrid, S1); kind('gate', gateGrid, S1, FLAT);
      const GATE_HALF = 3.85 / 2 / R_FENCE, NP = 28, step = (TAU - 2 * GATE_HALF) / NP, a0 = Math.PI + GATE_HALF;
      const Rc = R_FENCE * Math.cos(step / 2);
      for (let i = 0; i < NP; i++) {
        const a = a0 + (i + 0.5) * step;
        place('panel_' + ['heart', 'spade', 'diamond', 'club'][i % 4], Math.sin(a) * Rc, Math.cos(a) * Rc, a);
      }
      for (let i = 0; i <= NP; i++) { const a = a0 + i * step; place('fpost', Math.sin(a) * R_FENCE, Math.cos(a) * R_FENCE, a); }
      place('gate', 0, -R_FENCE, Math.PI);

      /* six lamps just inside the fence, lit */
      kind('lamp', lampGrid, S1);
      for (const a of [Math.PI - 0.42, Math.PI + 0.42, Math.PI / 2 + 0.25, -Math.PI / 2 - 0.25, 0.62, -0.62]) {
        const x = Math.sin(a) * 10.05, z = Math.cos(a) * 10.05;
        place('lamp', x, z, a); col(x, z, 0.25);
        light(x, 2.15, z, 0xffc27a, 2.2, 5.5);
      }
      // two more outside the gate, along the path
      for (const sx of [-2.6, 2.6]) place('lamp', sx, -17, Math.PI / 2);

      /* her stage's glowing ring, and four toadstools to sit on round the path */
      kind('summon_o', summonOuterGrid, S1); kind('summon_i', summonInnerGrid, S1);
      this.summon = [place('summon_o', 0, 0, 0, 1, { noCast: true, y: 0.008, name: 'summon_outer' }),
                     place('summon_i', 0, 0, 0, 1, { noCast: true, y: 0.01, name: 'summon_inner' })];
      kind('toad', toadstoolGrid, S1);
      for (const a of [1.05, -1.05, Math.PI - 1.08, -(Math.PI - 1.08)]) {
        const x = Math.sin(a) * 8.75, z = Math.cos(a) * 8.75;
        place('toad', x, z, facing(x, z)); col(x, z, 0.45); this.seats.push({ x, z, yaw: facing(x, z), h: 0.65 });
      }

      /* the backdrop: the castle and the moon to the north, the teacup glasshouse west, the hat tower east */
      kind('castle', castleGrid, 0.3);
      place('castle', 0, -78, 0, 1, { noCast: true });
      kind('moon', moonGrid, 1.25);   // rising to the right of the castle, its towers across it
      place('moon', 30, -200, -0.15, 1, { noCast: true, y: 38, name: 'moon', glowMat: new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }) });   // (out of the mist)
      kind('teacup', teacupGrid, S4, FLAT);
      place('teacup', -21, -13, -1.3);
      light(-21, 4.5, -13, 0xffaa55, 2.0, 9);
      kind('hattower', hatTowerGrid, S4, FLAT);
      place('hattower', 21, -13, facing(21, -13));

      /* toadstools big and small, twisted trees, topiary suits, giant cards in the lawn */
      for (const [k, x, z, s] of [['teal', -13.8, -5.5, 1.7], ['red', -15.5, -1.5, 1.2], ['pink', -12.4, -9.4, 0.9], ['teal', -27, -3, 2.2], ['red', -17, -22, 1.6],
                                  ['red', 14.6, -4.6, 1.4], ['teal', 13.2, -8.2, 0.9], ['pink', 27, -4, 1.9], ['red', -7, 15, 1.3], ['teal', 8, 15.5, 1.6],
                                  ['pink', -3, 18.5, 1.1], ['teal', 17, 13, 1.2]]) { const nm = 'mush_' + k + s, sv = Math.hypot(x, z) > 17 ? S4 : 0.072; kind(nm, () => mushroomGrid(k, s * 1.08, sv), sv); place(nm, x, z, rnd() * TAU); }
      for (let i = 0; i < 3; i++) kind('ttree' + i, () => twistTreeGrid(i * 2.1 + 0.5), 0.072);
      [[-14.5, 9, 0], [15.5, 7.5, 1], [-27, 12, 2], [28, 14, 0], [0.5, 21, 1], [-22, 24, 2], [21, 24, 0]].forEach(([x, z, k], i) => place('ttree' + k, x, z, i * 1.3, 1 + (i % 3) * 0.12));
      ['heart', 'spade', 'club', 'diamond'].forEach(s => kind('topi_' + s, () => topiaryGrid(s), S2));
      [[Math.PI - 0.9, 'heart'], [Math.PI + 0.9, 'spade'], [0.78, 'club'], [-0.78, 'diamond']].forEach(([a, s]) => {
        const x = Math.sin(a) * 13.4, z = Math.cos(a) * 13.4; place('topi_' + s, x, z, facing(x, z));
      });
      const CARDS = [['heart', 'A'], ['spade', 'K'], ['diamond', 'Q'], ['club', 'J'], ['heart', 'K'], ['spade', 'A'], ['diamond', 'J'], ['club', 'Q']];
      CARDS.forEach(([s, r], i) => kind('card' + i, () => bigCardGrid(s, r), 0.085));
      for (const [x, z, ry, rz, i] of [[11.5, 15.5, 2.6, 0.1, 0], [-12.5, 16, -2.5, -0.12, 2], [25, 2, 1.4, 0.08, 4], [-25, -1, -1.6, -0.1, 6]]) {
        const m = place('card' + i, x, z, ry, 1.2); m.rotation.z = rz;
      }
      /* giant cards floating in the air over the garden, turning slowly */
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU + 0.35, r = 15 + (i % 3) * 6;
        const m = place('card' + (i % 8), Math.sin(a) * r, Math.cos(a) * r, rnd() * TAU, 1.3 + (i % 2) * 0.3, { noCast: true, y: 6 + (i % 4) * 2.5, name: 'float_' + i });
        m.rotation.z = (rnd() - 0.5) * 0.6;
        this.floaters.push({ m, y0: m.position.y, ph: rnd() * TAU, spin: (rnd() < 0.5 ? -1 : 1) * (0.08 + rnd() * 0.1) });
      }
      /* the hedge round the edge of her world (a gap for the castle path) */
      kind('hedge', hedgeGrid, 0.2, FLAT);
      const NH = 62;
      for (let i = 0; i < NH; i++) {
        const a = i / NH * TAU;
        if (Math.abs(a - Math.PI) < 0.05) continue;
        place('hedge', Math.sin(a) * 41, Math.cos(a) * 41, a, 1, { noCast: true });   // (too far for shadows)
      }

      /* roses filling the bed round her stage, grass tufts on the lawn: instanced */
      const scatterAt = (geo, pts) => {
        if (!pts.length) return;
        const im = new THREE.InstancedMesh(geo, VX.grainMat(), pts.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
        pts.forEach(([x, z, s], k) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * TAU); m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s, s)); im.setMatrixAt(k, m4); });
        im.receiveShadow = true; scene.add(im);
      };
      const ROSES = [[0xd42a45, 0xe23752, 0.52], [0xf3eef6, 0xffffff, 0.2], [0xf3eef6, 0xd42a45, 0.16], [0x4f7df0, 0x6f95ff, 0.12]];
      const rosePts = ROSES.map(() => []);
      for (let gx = -R_BED; gx <= R_BED; gx += 0.36) for (let gz = -R_BED; gz <= R_BED; gz += 0.36) {
        const x = gx + (rnd() - 0.5) * 0.3, z = gz + (rnd() - 0.5) * 0.3, r = Math.hypot(x, z);
        if (r < R_STAGE + 0.35 || r > R_BED - 0.2 || Math.abs(x) < 0.95 || Math.abs(z) < 0.95) continue;
        let p = rnd(), k = 0; while (k < ROSES.length - 1 && p > ROSES[k][2]) { p -= ROSES[k][2]; k++; }
        rosePts[k].push([x, z, 0.85 + rnd() * 0.3]);
      }
      ROSES.forEach(([b, t], k) => scatterAt(VX.meshGrid(roseGrid(b, t), S1, { offset: [-0.5, -0.5, -0.5], ao: false }).lit, rosePts[k]));
      const tufts = [];
      for (let i = 0; i < 2600 && tufts.length < 1100; i++) {
        const a = rnd() * TAU, r = 11.4 + rnd() * 28, x = Math.sin(a) * r, z = Math.cos(a) * r;
        if (Math.abs(x) < 2.2 && z < 0) continue;
        if (Math.hypot(x + 21, z + 13) < 8.5 || Math.hypot(x - 21, z + 13) < 5) continue;
        tufts.push([x, z, 1]);
      }
      scatterAt(VX.meshGrid(tuftGrid(), S1, { offset: [-0.5, -0.5, -0.5], ao: false }).lit, tufts);
    }

    collide(p, r) {
      for (const c of this.colliders) {
        const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
        if (d < m && d > 1e-5) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; }
      }
      const d = Math.hypot(p.x, p.z);
      if (d > this.bound) { p.x *= this.bound / d; p.z *= this.bound / d; }
    }
    update(dt) {
      this.t += dt;
      for (const f of this.floaters) { f.m.position.y = f.y0 + Math.sin(this.t * 0.6 + f.ph) * 0.45; f.m.rotation.y += dt * f.spin; }
      if (this.summon) { this.summon[0].rotation.y += dt * 0.18; this.summon[1].rotation.y -= dt * 0.3; }   // the circle's rings turn
    }
  }
  window.WORLD = World;
})();
