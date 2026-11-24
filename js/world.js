/* ============================================================================
   world.js -- the Wonder Garden: Trap Trick's own little dimension, which only
   she can reach. A round rose courtyard at twilight, closed by a wrought-iron
   fence of card suits, lamps lit; through the gate a path runs to the Heart
   Castle with its clock tower, a great moon rising behind it. Outside the
   fence: a teacup glasshouse glowing amber, a brick tower roofed with a giant
   top hat, toadstools, twisted trees hung with lanterns, topiary suits, giant
   playing cards standing in the lawn and floating in the air, and a hedge all
   round the edge of her world.

   Scenery is voxels too, only bigger ones (the fence's voxel is 5 cm, the
   castle's 35 cm), meshed once per kind and placed many times.
   Collision is a set of circles plus the fence (`bound`); sit spots (the
   toadstools) are in `seats`; the lamps' lights are listed in `lights`.
   ========================================================================== */
(function () {
  'use strict';
  const H = VX.hash3, TAU = Math.PI * 2;
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

  /* --------------------------------------------------- the courtyard -- */
  // a little playing card (5 x 7) in the xy plane at z, its suit in the middle
  function miniCard(g, x0, y0, z, suit) {
    g.box(x0, y0, z, x0 + 4, y0 + 6, z, PAL.WHITE);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 7; j++) if ((i === 0 || i === 4) && (j === 0 || j === 6)) g.del(x0 + i, y0 + j, z);
    for (let i = 1; i <= 3; i++) for (let j = 2; j <= 4; j++) if (suitShape(suit, (i - 2) / 1.3, (j - 3) / 1.3)) g.set(x0 + i, y0 + j, z, SUIT_RED[suit] ? PAL.RED : PAL.BLACK);
  }
  // the lamp: a twisted iron post, scroll arms with a lantern on each, a card plaque under each, a crowned heart on top
  function lampGrid() {
    const g = new VX.Grid(); g.jit = 0.03;
    g.box(-3, 0, -3, 3, 1, 3, PAL.STONE3); g.box(-2, 2, -2, 2, 3, 2, PAL.IRON);
    for (let y = 4; y <= 52; y++) {
      g.box(-1, y, -1, 1, y, 1, (x, yy, z) => ((x + z + yy) % 3 === 0) ? PAL.IRON2 : PAL.IRON);
      if (y % 12 === 4) g.box(-2, y, -2, 2, y, 2, PAL.IRON2);
    }
    for (const s of [1, -1]) {
      for (let i = 0; i <= 9; i++) g.set(s * (1 + i), 50 + Math.round(Math.sin(i / 9 * Math.PI) * 3), 0, PAL.IRON);
      for (let k = 0; k < 12; k++) { const t = k / 12 * TAU * 0.8 + 0.5; g.set(s * (5 + Math.round(Math.cos(t) * 2)), 47 + Math.round(Math.sin(t) * 2), 0, PAL.IRON); }
      const lx = s * 10;
      g.set(lx, 49, 0, PAL.IRON); g.set(lx, 48, 0, PAL.IRON);
      g.box(lx - 2, 47, -2, lx + 2, 47, 2, PAL.IRON); g.set(lx, 48, 0, PAL.IRON);
      g.box(lx - 2, 40, -2, lx + 2, 46, 2, (x, y, z) => (Math.abs(x - lx) === 2 && Math.abs(z) === 2) ? PAL.IRON : VX.glow(y >= 42 && y <= 44 && Math.abs(x - lx) < 2 && Math.abs(z) < 2 ? PAL.LAMP2 : PAL.LAMP));
      g.box(lx - 1, 39, -1, lx + 1, 39, 1, PAL.IRON); g.set(lx, 38, 0, PAL.GOLD);
      // a card plaque on a little bracket, under the arm
      g.set(s * 2, 37, 0, PAL.IRON); g.set(s * 3, 37, 0, PAL.IRON); g.set(s * 4, 36, 0, PAL.IRON);
      miniCard(g, s > 0 ? 2 : -6, 28, 0, s > 0 ? 'heart' : 'spade');
    }
    // the crowned heart on top: a glowing glass heart in an iron rim, a gold crown
    for (let x = -4; x <= 4; x++) for (let y = 0; y <= 8; y++) {
      const u = x / 4.2, v = (y - 4.6) / 4.2;
      if (!heartF(u, v)) continue;
      const rim = !heartF((x + 1) / 4.2, v) || !heartF((x - 1) / 4.2, v) || !heartF(u, (y + 1 - 4.6) / 4.2) || !heartF(u, (y - 1 - 4.6) / 4.2);
      for (let z = -1; z <= 1; z++) g.set(x, 53 + y, z, rim || z !== 0 && (x + y) % 3 === 0 ? PAL.IRON : VX.glow(0xff7aa2));
    }
    g.box(-3, 62, -1, 3, 62, 1, PAL.GOLD);
    for (const x of [-3, 0, 3]) { g.set(x, 63, 0, PAL.GOLD); g.set(x, 64, 0, PAL.GOLD2); }
    g.set(0, 65, 0, VX.glow(0xff5b7d));
    return g;
  }
  // a fence panel: bars under an arched rail, a row of scrolls, a suit in a medallion; 44 voxels wide
  function fencePanelGrid(suit) {
    const g = new VX.Grid(); g.jit = 0.02;
    const top = x => 30 + Math.round(6 * Math.cos(x / 22 * Math.PI / 2));
    const MC = [0, 28], MR = 5.6;
    const inMed = (x, y) => Math.hypot(x - MC[0], y - MC[1]) < MR;
    for (let x = -22; x <= 21; x++) {
      g.set(x, 2, 0, PAL.IRON); g.set(x, 3, 0, PAL.IRON2); g.set(x, 20, 0, PAL.IRON);
      g.set(x, top(x), 0, PAL.IRON2); g.set(x, top(x) - 1, 0, PAL.IRON);
      if (((x % 3) + 3) % 3 === 0) {
        for (let y = 4; y < top(x) - 1; y++) if (!inMed(x, y) || Math.hypot(x - MC[0], y - MC[1]) > MR - 0.6) g.set(x, y, 0, PAL.IRON);
        if (((x % 6) + 6) % 6 === 0) { g.set(x, top(x) + 1, 0, PAL.IRON); g.set(x - 1, top(x) + 1, 0, PAL.IRON); g.set(x + 1, top(x) + 1, 0, PAL.IRON); g.set(x, top(x) + 2, 0, PAL.IRON); g.set(x, top(x) + 3, 0, PAL.GOLD); }
      }
    }
    // a row of scrolls along the bottom
    for (let k = -3; k <= 3; k++) for (let t = 0; t < 16; t++) {
      const a = t / 16 * TAU, cx = k * 6 + 1.5;
      if (cx > 19) continue;
      g.set(Math.round(cx + Math.cos(a) * 2.3), Math.round(8 + Math.sin(a) * 2.3), 0, PAL.IRON);
    }
    // the medallion: a ring with the suit in it, red enamel for hearts and diamonds
    for (let t = 0; t < 40; t++) { const a = t / 40 * TAU; g.set(Math.round(MC[0] + Math.cos(a) * MR), Math.round(MC[1] + Math.sin(a) * MR), 0, PAL.IRON2); }
    for (let x = -4; x <= 4; x++) for (let y = -4; y <= 4; y++) if (suitShape(suit, x / 4.2, y / 4.2)) g.set(MC[0] + x, MC[1] + y, 0, SUIT_RED[suit] ? PAL.RED : PAL.IRON2);
    return g;
  }
  function fencePostGrid() {
    const g = new VX.Grid(); g.jit = 0.02;
    g.box(-1, 0, -1, 1, 40, 1, (x, y, z) => y % 10 === 0 ? PAL.IRON2 : PAL.IRON);
    g.box(-2, 0, -2, 2, 1, 2, PAL.IRON);
    g.box(-2, 41, -2, 2, 41, 2, PAL.IRON2);
    for (let x = -2; x <= 2; x++) for (let y = 0; y <= 5; y++) if (suitShape('spade', x / 2.4, (y - 2.6) / 2.6)) g.set(x, 42 + y, 0, PAL.GOLD);
    return g;
  }
  // the gate: stone pillars with crowned hearts, a double iron gate, an arch with a clock over it (its face toward -z)
  function gateGrid() {
    const g = new VX.Grid(); g.jit = 0.03;
    const stone = (x, y, z) => y % 8 === 0 ? PAL.STONE3 : (H(x, y, z) < 0.3 ? PAL.STONE2 : PAL.STONE);
    for (const s of [1, -1]) {
      const x0 = s * 30, x1 = s * 37;
      g.box(x0, 0, -4, x1, 62, 3, stone);
      g.box(x0 - s, 63, -5, x1 + s, 64, 4, PAL.STONE3);
      for (let x = -4; x <= 4; x++) for (let y = 0; y <= 8; y++) if (heartF(x / 4.2, (y - 4.6) / 4.2)) for (let z = -1; z <= 0; z++) g.set(s * 33.5 + x, 65 + y, z, PAL.RED);
      g.box(s * 33.5 - 3, 74, -1, s * 33.5 + 3, 74, 0, PAL.GOLD);
      for (const dx of [-3, 0, 3]) g.set(s * 33.5 + dx, 75, 0, PAL.GOLD);
    }
    const top = x => 44 + Math.round(10 * Math.cos(x / 29 * Math.PI / 2));
    for (let x = -29; x <= 29; x++) {
      g.set(x, 1, 0, PAL.IRON2); g.set(x, 2, 0, PAL.IRON); g.set(x, 22, 0, PAL.IRON); g.set(x, top(x), 0, PAL.IRON2);
      if (x % 3 === 0 || x === 0 || x === 1) for (let y = 3; y < top(x); y++) if (Math.hypot(x, y - 34) > 8.4 || Math.abs(x) <= 1) g.set(x, y, 0, PAL.IRON);
      if (x % 6 === 0) { g.set(x, top(x) + 1, 0, PAL.IRON); g.set(x, top(x) + 2, 0, PAL.GOLD); }
    }
    for (const s of [1, -1]) for (let k = 0; k < 2; k++) for (let t = 0; t < 22; t++) {   // big scrolls low on each leaf
      const a = t / 22 * TAU * 0.85, cx = s * (8 + k * 12);
      g.set(Math.round(cx + Math.cos(a) * 3.5 * s), Math.round(10 + Math.sin(a) * 3.5), 0, PAL.IRON2);
    }
    // the crowned heart over the meeting of the two leaves
    for (let t = 0; t < 52; t++) { const a = t / 52 * TAU; g.set(Math.round(Math.cos(a) * 8.4), Math.round(34 + Math.sin(a) * 8.4), 0, PAL.IRON2); }
    for (let x = -6; x <= 6; x++) for (let y = -6; y <= 6; y++) if (heartF(x / 6, y / 6 + 0.1)) g.set(x, 33 + y, 0, PAL.RED);
    for (const x of [-4, -2, 0, 2, 4]) g.set(x, 41, 0, PAL.GOLD);
    g.box(-4, 40, 0, 4, 40, 0, PAL.GOLD);
    // the arch over the gate, and the clock in it
    for (let x = -30; x <= 30; x++) { const y = 62 + Math.round(5 * Math.cos(x / 30 * Math.PI / 2)); g.set(x, y, 0, PAL.IRON2); g.set(x, y - 1, 0, PAL.IRON); }
    for (let x = -6; x <= 6; x++) for (let y = -6; y <= 6; y++) {
      const d = Math.hypot(x, y); if (d > 6.3) continue;
      const c = d > 5.4 ? PAL.GOLD : (d < 0.8 ? PAL.IRON : VX.glow(0xfff1d6));
      g.set(x, 70 + y, 0, c);
    }
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.set(Math.round(Math.sin(a) * 4.4), Math.round(70 + Math.cos(a) * 4.4), -1, PAL.IRON); }
    for (let k = 1; k <= 4; k++) g.set(-Math.round(k * 0.7), 70 + Math.round(k * 0.55), -1, PAL.IRON);   // the hands: ten to two... ish
    for (let k = 1; k <= 3; k++) g.set(Math.round(k * 1.0), 70 + Math.round(k * 0.6), -1, PAL.IRON);
    return g;
  }
  /* the summoning circle on her stage, where one arrives in her garden: two rings of glowing runes lying on the ground,
     which turn opposite ways. The outer: two circles with a band of runes between; the inner: a circle, a dotted ring
     inside it, and the four suits between it and the outer ring */
  function summonOuterGrid() {
    const g = new VX.Grid(); g.jit = 0;
    const R1 = 48.4, R2 = 42.4, C = VX.glow(0xff9ccf), C2 = VX.glow(0xd7a8ff);
    for (let t = 0; t < 420; t++) { const a = t / 420 * TAU; g.set(Math.round(Math.sin(a) * R1), 0, Math.round(Math.cos(a) * R1), C); }
    for (let t = 0; t < 380; t++) { const a = t / 380 * TAU; g.set(Math.round(Math.sin(a) * R2), 0, Math.round(Math.cos(a) * R2), C); }
    for (let i = 0; i < 36; i++) {
      const a = i / 36 * TAU, rm = (R1 + R2) / 2, sx = Math.sin(a), cz = Math.cos(a);
      const put = (dr, dt) => g.set(Math.round(sx * (rm + dr) + cz * dt), 0, Math.round(cz * (rm + dr) - sx * dt), C2);
      if (i % 3 === 0) for (let d = -2; d <= 2; d++) put(d, 0);              // a dash across the band
      else if (i % 3 === 1) { put(0, 0); put(0, 1); put(0, -1); }           // a short bar along it
      else { put(0, 0); put(1, 0); put(-1, 0); put(0, 1); put(0, -1); }     // a little diamond
    }
    return g;
  }
  function summonInnerGrid() {
    const g = new VX.Grid(); g.jit = 0;
    const C = VX.glow(0xff9ccf);
    for (let t = 0; t < 300; t++) { const a = t / 300 * TAU; g.set(Math.round(Math.sin(a) * 34.4), 0, Math.round(Math.cos(a) * 34.4), C); }
    for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; g.set(Math.round(Math.sin(a) * 30.5), 0, Math.round(Math.cos(a) * 30.5), C); }
    ['heart', 'club', 'diamond', 'spade'].forEach((s, i) => {
      const a = i / 4 * TAU + TAU / 8, cx = Math.sin(a) * 39, cz = Math.cos(a) * 39;
      for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) if (suitShape(s, x / 3.6, -z / 3.6)) g.set(Math.round(cx + x), 0, Math.round(cz + z), VX.glow(SUIT_RED[s] ? 0xff6f91 : 0xbfa8ff));
    });
    return g;
  }
  // a toadstool to sit on (her seats): its flat cap 0.65 m up
  function toadstoolGrid() {
    const g = new VX.Grid(); g.jit = 0.04;
    g.disc(0, 0, 3.6, 0, 8, (x, y, z) => H(x, y, z) < 0.3 ? 0xe2d6c4 : 0xf1e6d6);
    g.disc(0, 0, 4.4, 0, 0, 0xe2d6c4);
    const R = { 9: 8.6, 10: 9.0, 11: 8.6, 12: 7.4 };
    for (let y = 9; y <= 12; y++) g.disc(0, 0, R[y], y, y, (x, yy, z) => {
      if (yy === 9 && Math.hypot(x, z) < 7.5) return 0xe8d6c0;                // the gills
      return H(x >> 1, yy, z >> 1) < 0.2 && (yy === 12 || Math.hypot(x, z) > R[yy] - 1.2) ? PAL.WHITE : (H(x, yy, z) < 0.4 ? PAL.RED2 : PAL.RED);
    });
    return g;
  }
  // a rose: stem, leaves and a bloom (red, white, white half painted red, or blue)
  function roseGrid(bloom, top) {
    const g = new VX.Grid(); g.jit = 0.12;
    g.box(0, 0, 0, 0, 5, 0, 0x2f6b2e);
    g.set(1, 2, 0, 0x3f8a3a); g.set(-1, 3, 0, 0x3f8a3a); g.set(0, 4, 1, 0x3f8a3a); g.set(0, 1, -1, 0x3f8a3a);
    g.box(-1, 6, -1, 1, 6, 1, bloom); g.box(-1, 7, -1, 1, 7, 1, top);
    for (const [x, z] of [[-1, -1], [1, 1]]) g.del(x, 7, z);
    g.set(0, 8, 0, top);
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
  // a glasshouse shaped like a teacup on its saucer: amber panes in a gold frame, a porcelain handle (on +x)
  function teacupGrid() {
    const g = new VX.Grid(); g.jit = 0.03;
    const SR = [22, 27, 30, 30];
    for (let y = 0; y <= 3; y++) g.disc(0, 0, SR[y], y, y, (x, yy, z) => {
      const d = Math.hypot(x, z);
      if (yy === 3) return d > 27.6 ? (d > 29.2 ? PAL.GOLD : PAL.PORC) : -1;
      if (yy === 2 && d > 24.5 && d < 25.8) return PAL.BLUE;
      return d > 29.3 ? PAL.GOLD : PAL.PORC;
    });
    const CR = y => 12 + (y - 4) * 0.38;
    for (let y = 4; y <= 37; y++) {
      const R = CR(y);
      for (let x = -Math.ceil(R + 1); x <= R + 1; x++) for (let z = -Math.ceil(R + 1); z <= R + 1; z++) {
        const d = Math.hypot(x, z); if (d > R + 0.3 || d < R - 1.4) continue;
        let c;
        if (y <= 6) c = y === 6 ? PAL.GOLD : PAL.PORC;                         // the foot
        else if (y >= 36) c = y === 37 ? PAL.GOLD : PAL.PORC;                  // the rim
        else {
          const seg = (Math.atan2(z, x) / TAU * 22 + 22) % 1;
          const frame = seg < 0.14 || (y - 7) % 7 === 0;
          c = frame ? (y % 2 ? PAL.GOLD2 : PAL.GOLD) : VX.glow(H(x >> 1, y >> 1, z >> 1) < 0.3 ? 0xffc77a : (H(x, y, z) < 0.5 ? 0xffb45e : 0xf8a957));   // brightly lit: what's inside?
        }
        g.set(x, y, z, c);
      }
    }
    // the handle
    const hx = CR(22) + 5.5, hy = 21;
    for (let x = Math.floor(hx - 9); x <= hx + 9; x++) for (let y = hy - 9; y <= hy + 9; y++) for (let z = -2; z <= 2; z++) {
      if (Math.hypot(x, z) < CR(y) - 0.5) continue;
      const q = Math.hypot(Math.hypot(x - hx, y - hy) - 6.5, z);
      if (q <= 1.9) g.set(x, y, z, Math.abs(z) < 1 && Math.hypot(x - hx, y - hy) > 7.6 ? PAL.GOLD : PAL.PORC);
    }
    return g;
  }
  // a round brick tower whose roof is a giant top hat (black, a blue band, a card tucked in it); its front (+z) to the garden
  function hatTowerGrid() {
    const g = new VX.Grid(); g.jit = 0.03;
    const R = 11, TOP = 50;
    const brick = (x, y, z) => {
      const along = (Math.atan2(z, x) + Math.PI) * R + (y % 2) * 2;
      if (y % 3 === 0 || along % 4 < 0.6) return 0x5a3a44;
      const n = H(Math.floor(along / 4), Math.floor(y / 3), 3);
      return n < 0.33 ? 0x8c4a4f : n < 0.66 ? 0x7d3f47 : 0x9a5656;
    };
    for (let y = 0; y <= TOP; y++) g.disc(0, 0, R, y, y, (x, yy, z) => Math.hypot(x, z) > R - 1.5 ? brick(x, yy, z) : -1);
    const win = (a, y0) => {
      const wx = Math.sin(a) * R, wz = Math.cos(a) * R;
      for (let k = -1; k <= 1; k++) for (let y = y0; y <= y0 + 6; y++) {
        if (y === y0 + 6 && k !== 0) continue;
        const x = Math.round(wx + Math.cos(a) * k), z = Math.round(wz - Math.sin(a) * k);
        g.set(x, y, z, k === 0 && y === y0 + 3 ? PAL.IRON : VX.glow(y > y0 + 3 ? 0xffd590 : 0xffbf70));
      }
    };
    for (const [a, y] of [[0, 12], [0.9, 26], [-0.7, 28], [0, 40], [2.2, 18], [-2.4, 34]]) win(a, y);
    for (let y = 0; y <= 8; y++) for (let k = -2; k <= 2; k++) if (y < 6 || Math.abs(k) < 2) g.set(k, y, R, y === 4 && k === 1 ? PAL.GOLD : 0x4a2f3a);   // the door
    // the hat
    g.disc(0, 0, R + 6, TOP + 1, TOP + 2, (x, y, z) => y === TOP + 2 && Math.hypot(x, z) > R + 4.6 ? PAL.BLACK2 : PAL.BLACK);
    for (let y = TOP + 3; y <= TOP + 26; y++) {
      const r = R - 1 + (y - TOP - 3) * 0.07;
      g.disc(0, 0, r, y, y, (x, yy, z) => {
        if (Math.hypot(x, z) < r - 1.5 && yy < TOP + 26) return -1;
        if (yy >= TOP + 4 && yy <= TOP + 8) return yy === TOP + 4 || yy === TOP + 8 ? 0x22368f : PAL.BLUE;
        return H(x, yy, z) < 0.15 ? PAL.BLACK2 : PAL.BLACK;
      });
    }
    // the card in the band, and a bow on its side
    const cz = Math.round(R - 0.6) + 1;
    for (let x = -4; x <= 4; x++) for (let y = 0; y <= 12; y++) {
      if ((Math.abs(x) === 4) && (y === 0 || y === 12)) continue;
      g.set(x, TOP + 5 + y, cz, PAL.WHITE);
    }
    for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) if (heartF(x / 3, y / 3 + 0.1)) g.set(x, TOP + 11 + y, cz + 1, PAL.RED);
    for (const s of [1, -1]) g.ell(s * 4.5 - (R - 1), TOP + 6, 0, 2.5, 2, 1.5, PAL.BLUE);
    return g;
  }
  // a twisted tree: two strands winding round each other, curling branches, pink blossom puffs, lanterns hung on strings
  function twistTreeGrid(seed) {
    const g = new VX.Grid(); g.jit = 0.06;
    const bark = (x, y, z) => H(x, y, z) < 0.35 ? PAL.BARK2 : PAL.BARK;
    for (let y = 0; y <= 22; y++) for (const s of [0, Math.PI]) {
      const a = y * 0.32 + s + seed, r = 1.9 - y * 0.045;
      g.ell(Math.cos(a) * 1.3, y, Math.sin(a) * 1.3, r, 0.7, r, bark);
    }
    for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + seed; g.line(0, 1, 0, Math.cos(a) * 4, 0, Math.sin(a) * 4, bark, 0.9); }
    for (let k = 0; k < 4; k++) {
      const b = seed * 1.7 + k * TAU / 4 + 0.4, y0 = 17 + (k % 2) * 4, len = 8 + (k % 3);
      let px = 0, py = y0, pz = 0;
      for (let i = 1; i <= 12; i++) {
        const t = i / 12, x = Math.cos(b) * t * len, y = y0 + Math.sin(t * Math.PI * 0.8) * 4 + t * 2, z = Math.sin(b) * t * len;
        g.line(px, py, pz, x, y, z, bark, 1.1 - t * 0.6); px = x; py = y; pz = z;
      }
      for (let i = 0; i < 10; i++) {                                    // the branch end curls over
        const u = i / 10 * Math.PI * 1.6, cr = 2 - i * 0.12;
        g.set(Math.round(px + Math.cos(b) * Math.sin(u) * cr), Math.round(py + 2 - Math.cos(u) * 2), Math.round(pz + Math.sin(b) * Math.sin(u) * cr), PAL.BARK);
      }
      if (k % 2 === 0) g.ell(px, py + 2, pz, 2.6, 2, 2.6, (x, y, z) => H(x, y, z) < 0.12 ? -1 : (H(x, y, z) < 0.55 ? PAL.BLOS : PAL.BLOS2));
      else {
        const lx = Math.round(px * 0.7), lz = Math.round(pz * 0.7), ly = Math.round(y0 + 3);
        for (let y = ly - 4; y < ly; y++) g.set(lx, y, lz, PAL.IRON);
        g.box(lx - 1, ly - 8, lz - 1, lx + 1, ly - 5, lz + 1, (x, y, z) => y === ly - 5 || y === ly - 8 ? PAL.IRON : VX.glow(PAL.LAMP));
      }
    }
    return g;
  }
  function mushroomGrid(kind) {
    const g = new VX.Grid(); g.jit = 0.05;
    const cap = kind === 'teal' ? [0x2c8fa8, 0x237a91] : kind === 'pink' ? [0xe36fae, 0xc9579a] : [PAL.RED, PAL.RED2];
    const spot = kind === 'teal' ? VX.glow(0xaaf6ff) : kind === 'pink' ? VX.glow(0xffe3f3) : PAL.WHITE;
    const Hs = 9, R = 9;
    for (let y = 0; y <= Hs; y++) g.disc(0, 0, 2.6 + (y < 2 ? 1 : 0) - y * 0.05, y, y, (x, yy, z) => H(x, yy, z) < 0.3 ? 0xe2d6c4 : 0xf1e6d6);
    const inCap = (x, y, z) => y >= 0 && (x / R) ** 2 + (y / (R * 0.6)) ** 2 + (z / R) ** 2 <= 1;
    for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) for (let y = 0; y <= R * 0.6; y++) {
      if (!inCap(x, y, z)) continue;
      const outer = !inCap(x + 1, y, z) || !inCap(x - 1, y, z) || !inCap(x, y + 1, z) || !inCap(x, y, z + 1) || !inCap(x, y, z - 1);
      let c = y === 0 ? 0xe8d6c0 : (H(x, y, z) < 0.4 ? cap[1] : cap[0]);
      if (outer && y > 0 && H(x >> 1, y >> 1, z >> 1) < 0.2) c = spot;
      g.set(x, Hs + 1 + y, z, c);
    }
    return g;
  }
  function topiaryGrid(suit) {
    const g = new VX.Grid(); g.jit = 0.07;
    g.box(-5, 0, -5, 5, 3, 5, (x, y, z) => y === 3 || Math.abs(x) === 5 && Math.abs(z) === 5 ? PAL.STONE2 : PAL.STONE);
    for (let x = -9; x <= 9; x++) for (let y = 0; y <= 18; y++) {
      if (!suitShape(suit, x / 8.5, (y - 9) / 8.5)) continue;
      for (let z = -2; z <= 2; z++) {
        const n = H(x, y, z);
        g.set(x, 4 + y, z, Math.abs(z) === 2 && n < 0.06 ? (n < 0.03 ? PAL.RED : PAL.WHITE) : (n < 0.3 ? PAL.LEAF3 : n < 0.7 ? PAL.LEAF2 : PAL.LEAF));
      }
    }
    return g;
  }
  function hedgeGrid() {
    const g = new VX.Grid(); g.jit = 0.1;
    g.box(-4, 0, -1, 4, 5, 1, (x, y, z) => {
      const n = H(x, y, z);
      if (y === 5 && n < 0.35) return -1;
      if (n < 0.05) return PAL.RED; if (n < 0.08) return PAL.WHITE;
      return n < 0.5 ? 0x2b5a35 : 0x346a3e;
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
  function tuftGrid() {
    const g = new VX.Grid(); g.jit = 0.12;
    for (const [x, z, h] of [[0, 0, 3], [1, 0, 2], [-1, 1, 2], [0, -1, 2], [1, 1, 1]]) for (let y = 0; y < h; y++) g.set(x, y, z, y === h - 1 ? 0x5fae54 : 0x3e8040);
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

      const kinds = {};
      const kind = (name, grid, s, o) => kinds[name] || (kinds[name] = VX.meshGrid(grid(), s, o || {}));
      const place = (name, x, z, ry, sc, opts) => {
        const G = kinds[name];
        const m = VX.meshPair(G, null, { cast: !(opts && opts.noCast) });
        m.position.set(x, (opts && opts.y) || 0, z); m.rotation.y = ry || 0; if (sc) m.scale.setScalar(sc);
        if (opts && opts.name) m.userData.bake = opts.name;
        if (opts && opts.noCast) m.userData.noCast = true;
        scene.add(m); return m;
      };
      const col = (x, z, r) => this.colliders.push({ x, z, r });
      const facing = (x, z) => Math.atan2(-x, -z);                     // a prop's +z toward the middle
      const light = (x, y, z, c, e, r) => this.lights.push({ p: [x, y, z], c, e, r });

      /* the fence: 28 panels round the courtyard, a post at each joint, the gate to the north */
      ['heart', 'spade', 'diamond', 'club'].forEach(s => kind('panel_' + s, () => fencePanelGrid(s), 0.05));
      kind('fpost', fencePostGrid, 0.05); kind('gate', gateGrid, 0.05);
      const GATE_HALF = 3.85 / 2 / R_FENCE, NP = 28, step = (TAU - 2 * GATE_HALF) / NP, a0 = Math.PI + GATE_HALF;
      const Rc = R_FENCE * Math.cos(step / 2), chord = 2 * R_FENCE * Math.sin(step / 2);
      for (let i = 0; i < NP; i++) {
        const a = a0 + (i + 0.5) * step;
        const m = place('panel_' + ['heart', 'spade', 'diamond', 'club'][i % 4], Math.sin(a) * Rc, Math.cos(a) * Rc, a);
        m.scale.x = chord / 2.2;
      }
      for (let i = 0; i <= NP; i++) { const a = a0 + i * step; place('fpost', Math.sin(a) * R_FENCE, Math.cos(a) * R_FENCE, a); }
      place('gate', 0, -R_FENCE, Math.PI);

      /* six lamps just inside the fence, lit */
      kind('lamp', lampGrid, 0.05);
      for (const a of [Math.PI - 0.42, Math.PI + 0.42, Math.PI / 2 + 0.25, -Math.PI / 2 - 0.25, 0.62, -0.62]) {
        const x = Math.sin(a) * 10.05, z = Math.cos(a) * 10.05;
        place('lamp', x, z, a); col(x, z, 0.25);
        light(x, 2.15, z, 0xffc27a, 2.2, 5.5);
      }
      // two more outside the gate, along the path
      for (const sx of [-2.6, 2.6]) place('lamp', sx, -17, Math.PI / 2);

      /* her stage's glowing ring, and four toadstools to sit on round the path */
      kind('summon_o', summonOuterGrid, 0.05); kind('summon_i', summonInnerGrid, 0.05);
      this.summon = [place('summon_o', 0, 0, 0, 1, { noCast: true, y: -0.012, name: 'summon_outer' }),
                     place('summon_i', 0, 0, 0, 1, { noCast: true, y: -0.01, name: 'summon_inner' })];
      kind('toad', toadstoolGrid, 0.05);
      for (const a of [1.05, -1.05, Math.PI - 1.08, -(Math.PI - 1.08)]) {
        const x = Math.sin(a) * 8.75, z = Math.cos(a) * 8.75;
        place('toad', x, z, facing(x, z)); col(x, z, 0.45); this.seats.push({ x, z, yaw: facing(x, z), h: 0.65 });
      }

      /* the backdrop: the castle and the moon to the north, the teacup glasshouse west, the hat tower east */
      kind('castle', castleGrid, 0.3);
      place('castle', 0, -78, 0, 1, { noCast: true });
      kind('moon', moonGrid, 1.25);   // rising to the right of the castle, its towers across it
      place('moon', 30, -200, -0.15, 1, { noCast: true, y: 38, name: 'moon' });
      kind('teacup', teacupGrid, 0.25);
      place('teacup', -21, -13, -1.3);
      light(-21, 4.5, -13, 0xffaa55, 2.0, 9);
      kind('hattower', hatTowerGrid, 0.25);
      place('hattower', 21, -13, facing(21, -13));

      /* toadstools big and small, twisted trees, topiary suits, giant cards in the lawn */
      ['red', 'teal', 'pink'].forEach(k => kind('mush_' + k, () => mushroomGrid(k), 0.12));
      for (const [k, x, z, s] of [['teal', -13.8, -5.5, 1.7], ['red', -15.5, -1.5, 1.2], ['pink', -12.4, -9.4, 0.9], ['teal', -27, -3, 2.2], ['red', -17, -22, 1.6],
                                  ['red', 14.6, -4.6, 1.4], ['teal', 13.2, -8.2, 0.9], ['pink', 27, -4, 1.9], ['red', -7, 15, 1.3], ['teal', 8, 15.5, 1.6],
                                  ['pink', -3, 18.5, 1.1], ['teal', 17, 13, 1.2]]) place('mush_' + k, x, z, rnd() * TAU, s);
      for (let i = 0; i < 3; i++) kind('ttree' + i, () => twistTreeGrid(i * 2.1 + 0.5), 0.15);
      [[-14.5, 9, 0], [15.5, 7.5, 1], [-27, 12, 2], [28, 14, 0], [0.5, 21, 1], [-22, 24, 2], [21, 24, 0]].forEach(([x, z, k], i) => place('ttree' + k, x, z, i * 1.3, 1 + (i % 3) * 0.12));
      ['heart', 'spade', 'club', 'diamond'].forEach(s => kind('topi_' + s, () => topiaryGrid(s), 0.12));
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
      kind('hedge', hedgeGrid, 0.5);
      const NH = 62;
      for (let i = 0; i < NH; i++) {
        const a = i / NH * TAU;
        if (Math.abs(a - Math.PI) < 0.05) continue;
        place('hedge', Math.sin(a) * 41, Math.cos(a) * 41, a, 1, { noCast: true });   // (too far for shadows)
      }

      /* roses filling the bed round her stage, grass tufts on the lawn: instanced */
      const scatterAt = (geo, pts) => {
        if (!pts.length) return;
        const im = new THREE.InstancedMesh(geo, VX.litMat(), pts.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
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
      ROSES.forEach(([b, t], k) => scatterAt(VX.meshGrid(roseGrid(b, t), 0.04, {}).lit, rosePts[k]));
      const tufts = [];
      for (let i = 0; i < 2600 && tufts.length < 1100; i++) {
        const a = rnd() * TAU, r = 11.4 + rnd() * 28, x = Math.sin(a) * r, z = Math.cos(a) * r;
        if (Math.abs(x) < 2.2 && z < 0) continue;
        if (Math.hypot(x + 21, z + 13) < 8.5 || Math.hypot(x - 21, z + 13) < 5) continue;
        tufts.push([x, z, 1]);
      }
      scatterAt(VX.meshGrid(tuftGrid(), 0.06, {}).lit, tufts);
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
