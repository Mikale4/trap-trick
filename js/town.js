/* ============================================================================
   town.js -- a small market town in an old, quiet fantasy world: half-timbered
   houses with steep roofs round a cobbled square with a fountain, market
   stalls, an inn, a bakery, a blacksmith's forge, a general store and a
   tailor's; a street south to the town gate and one east to a lookout over the
   fields, a windmill, the chapel's bell tower, hills and far mountains. And
   in a dark alley off the square, a door in the ground: the way down to Trap
   Trick's Wonder Garden.

   It also lists the townsfolk (how each looks, their job, where they stand or
   walk, what they say), which Godot brings to life (godot/scripts/town.gd).
   Buildings are voxels of 4.8 cm (twice Trap Trick's), the small things (things.js) of 2.4 cm, her own; only the far
   country is coarser. Coordinates: metres, x east, z south, the fountain at the origin.
   ========================================================================== */
(function () {
  'use strict';
  const H = VX.hash3, TAU = Math.PI * 2, HP = Math.PI / 2, T = window.THINGS, R = Math.round;
  const rnd = (() => { let s = 7654321; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const shade = (c, k) => { const r = Math.min(255, ((c >> 16) & 255) * k) | 0, g = Math.min(255, ((c >> 8) & 255) * k) | 0, b = Math.min(255, (c & 255) * k) | 0; return (r << 16) | (g << 8) | b; };
  const S1 = 0.024, SB = 0.048, U = 0.25 / SB;            // her voxel (the small things), a building's (twice hers); house sizes are given in quarter metres

  const PAL = {
    STONE: 0xa9a29a, STONE2: 0x968f88, STONE3: 0xbdb6ad, STONE4: 0xb0a596, STONE5: 0x9f9b95, MORTAR: 0x857e76,
    TIMBER: 0x4e3828, TIMBER2: 0x5c4432, GLASS: 0x2f3a52, GLASS2: 0x7f93b8, GLASS3: 0x4a5a7c, LEAD: 0x1e2434,
    WOOD: 0x8a5a32, WOOD2: 0x6b4426, WOOD3: 0xa8743e, IRON: 0x3a3a42,
    TILE: 0xa8432f, SLATE: 0x4c5670, THATCH: 0xb8955a,
    LEAF: 0x4f8f3a, LEAF2: 0x3f7a30, LEAF3: 0x67a84a, BARK: 0x6b4a32,
  };
  const grid = () => { const g = new VX.Grid(); g.jit = 0; g.merge = true; return g; };

  /* --------------------------------------------------------- the ground -- */
  // where one can walk: the square, the south street, the east street, the alley (they overlap a metre at the joins)
  const WALK = [[-12, -10, 12, 10], [-3, 9, 3, 30.5], [11, -3, 28, 3], [27, -1.7, 62, 1.7], [-20.6, -5.5, -11, -3.5]];
  const GROUND = 140;
  function groundTexture() {                             // the country round: fields, meadows, the roads out (the streets have their own, finer one)
    const N = 1024, W = GROUND, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(N, N), d = img.data;
    const put = (i, c) => { d[i] = (c >> 16) & 255; d[i + 1] = (c >> 8) & 255; d[i + 2] = c & 255; d[i + 3] = 255; };
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
      const x = (px / N - 0.5) * W, z = (py / N - 0.5) * W, i = (py * N + px) * 4;
      const n = H(px, py, 7), n2 = H(px >> 3, py >> 3, 3), n3 = H(px >> 6, py >> 6, 11);
      let c;
      if (x > -30 && x < 29 && z > -26 && z < 31.6) c = 0xaaa090;
      else if (Math.abs(x) < 2.2 && z > 31) c = shade(n < 0.5 ? 0x9a7f5e : 0x8f7556, 0.95 + n * 0.1);       // the road out of the gate
      else if (x > 28 && Math.abs(z) < 1.8) c = shade(n < 0.5 ? 0x9a7f5e : 0x8f7556, 0.95 + n * 0.1);       // the track east
      else {                                            // fields and meadows: a patchwork, rows in the crops
        const fxi = Math.floor((x + 200) / 14), fzi = Math.floor((z + 200) / 11), k = H(fxi, fzi, 2);
        const far = Math.hypot(x, z) > 45;
        if (!far || k < 0.35) c = n2 < 0.4 ? 0x5f9a45 : n2 < 0.8 ? 0x6aa64e : 0x76b056;
        else if (k < 0.6) c = ((Math.floor((x + 200) / 0.8) & 1) ? 0xd6b45a : 0xc9a44e);              // wheat
        else if (k < 0.8) c = ((Math.floor((z + 200) / 0.9) & 1) ? 0x7a5a3e : 0x6b4e36);              // ploughed
        else c = ((Math.floor((x + z + 400) / 1.0) & 1) ? 0x8fb85a : 0x7da84c);                       // young crops
        if (n3 < 0.15 && !far) c = 0x548a3e;
        if (n < 0.004) c = 0xf3eefb; else if (n < 0.007) c = 0xf0d04a;
        c = shade(c, 0.93 + n * 0.12);
      }
      put(i, c);
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearMipMapLinearFilter;
    return tex;
  }
  /* the streets, a pixel to each of her voxels (2.4 cm): hand-sized setts, flagstones along the house fronts, a gutter
     down the south street, rings of setts round the fountain, the alley's dark wet stones. Flat tones: the ground's
     shader gives each voxel its own slight shade */
  const CORE = { x0: -21.4, z0: -16.4, N: 2048 };
  function coreGround() {
    const N = CORE.N, d = new Uint8Array(N * N * 4);
    const tones = (a, b, c, e, t) => t < 0.12 ? e : t < 0.4 ? a : t < 0.75 ? b : c;
    const inWalk = (x, z, m) => WALK.some(w => x > w[0] - m && x < w[2] + m && z > w[1] - m && z < w[3] + m);
    /* setts in rows: w x h voxels, a voxel of joint between, their corners knocked off, each row shifted */
    const setts = (px, py, w, h, seed, P) => {
      const row = Math.floor(py / h), off = Math.floor(H(row, seed, 1) * w), i = Math.floor((px + off) / w), fx = (px + off) - i * w, fy = py - row * h;
      if (fx === 0 || fy === 0) return P[4];
      if ((fx === 1 || fx === w - 1) && (fy === 1 || fy === h - 1) && H(i, row, seed + fx + fy) < 0.75) return P[4];
      const t = H(i, row, seed), c = tones(P[0], P[1], P[2], P[3], t);
      return fy === h - 1 ? shade(c, 0.93) : fy === 1 ? shade(c, 1.04) : c;
    };
    const STREET = [0xb8ae9e, 0xaea494, 0xa2988a, 0xc2b8a8, 0x8a8175], FLAG = [0xbcb4a8, 0xb2aa9e, 0xa89f93, 0xc6bfb4, 0x8e867a], ALLEY = [0x6e6862, 0x645e59, 0x5a5551, 0x78726b, 0x47423d], RING = [0xc8bdb0, 0xbeb2a4, 0xb2a798, 0xd0c6ba, 0x92897d];
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
      const x = CORE.x0 + (px + 0.5) * S1, z = CORE.z0 + (py + 0.5) * S1, i = (py * N + px) * 4, r = Math.hypot(x, z);
      let c = 0x8d857a;
      if (inWalk(x, z, 0.4)) {
        const alley = x < -11.6 && z > -6 && z < -3;
        // how far from the nearest house front
        const edge = alley ? 9 : (Math.abs(x) < 12 && Math.abs(z) < 10) ? Math.min(12 - Math.abs(x) + (Math.abs(z) < 3 && x > 0 ? 9 : 0) + (z > -5.5 && z < -3.5 && x < 0 ? 9 : 0), 10 - Math.abs(z) + (Math.abs(x) < 3 && z > 0 ? 9 : 0)) : (z > 9 ? 3 - Math.abs(x) : 3 - Math.abs(z));
        if (alley) c = setts(px, py, 13, 9, 5, ALLEY);
        else if (r < 4.2) {                                                              // rings of setts round the fountain
          const ring = Math.floor(r / 0.216), fr = r / 0.216 - ring, n = Math.max(8, R(ring * 0.216 * TAU / 0.3)), a = (Math.atan2(z, x) + Math.PI) / TAU * n + (ring & 1) * 0.5, fa = a - Math.floor(a);
          c = fr < 0.11 || fa < 0.08 || ring === 18 && fr > 0.9 ? RING[4] : ring === 18 ? 0x9a9084 : tones(RING[0], RING[1], RING[2], RING[3], H(Math.floor(a) % n, ring, 4));
        } else if (edge < 0.72) c = edge > 0.68 ? 0x7d766b : (z > 9 || Math.abs(x) > 11 && Math.abs(z) < 10.4 ? setts(py, px, 25, 14, 9, FLAG) : setts(px, py, 25, 14, 9, FLAG));   // flagstones along the fronts
        else if (z > 9.6 && Math.abs(x) < 0.16) c = setts(py, px, 22, 7, 3, [0x8d867b, 0x847d72, 0x7a7369, 0x948d82, 0x6a645b]);                                              // the gutter
        else c = setts(px, py, 11, 8, 7, STREET);
      }
      d[i] = (c >> 16) & 255; d[i + 1] = (c >> 8) & 255; d[i + 2] = c & 255; d[i + 3] = 255;
    }
    return { w: N, h: N, data: d, x: CORE.x0 + N * S1 / 2, z: CORE.z0 + N * S1 / 2, size: N * S1 };
  }

  /* ------------------------------------------------------- the houses -- */
  /* dressed stone in courses, 58 x 29 cm: along a wall by (a), up it by (y) */
  const stoneAt = (a, y, seed) => {
    const row = Math.floor(y / 6), off = Math.floor(H(row, seed, 3) * 12), i = Math.floor((a + off + 600) / 12);
    if (y % 6 === 5 || (a + off + 600) % 12 === 0) return PAL.MORTAR;
    const t = H(i, row, seed); return t < 0.18 ? PAL.STONE2 : t < 0.5 ? PAL.STONE : t < 0.7 ? PAL.STONE3 : t < 0.86 ? PAL.STONE4 : PAL.STONE5;
  };
  const brickAt = (a, y) => { const row = Math.floor(y / 3), i = Math.floor((a + (row & 1) * 3 + 300) / 6); if (y % 3 === 2 || (a + (row & 1) * 3 + 300) % 6 === 0) return 0x7a5a50; const t = H(i, row, 8); return t < 0.3 ? 0x8c4a3f : t < 0.75 ? 0x9a5446 : 0x84443a; };
  /* A half-timbered house, its front (+z) to the street, in voxels of 4.8 cm: a ground floor of dressed stone, plastered
     upper floors in a timber frame that jut out over the street on their joists, leaded windows with planked shutters and
     flower boxes, a round-headed plank door (or a shop front, or an open forge), a steep roof of tile, slate or thatch, a
     brick chimney. o: { W, D (quarter metres), floors, plaster, roof, shutter, door: x offset, shop, forge, sides: which
     flank is seen from the streets ('L' -x, 'R' +x), plain: hidden behind others, seed } */
  function houseGrid(o) {
    const g = grid();
    const W = R(o.W * U / 2) * 2, D = R(o.D * U / 2) * 2, F = o.floors, FH = 62, top = F * FH, JT = 5, EV = 6, VG = o.plain ? 0 : 4;
    const x0 = -W / 2, x1 = W / 2 - 1, z0 = -D / 2, z1 = D / 2 - 1, seed = o.seed || 1;
    const plaster = o.plaster, shutter = o.shutter || 0x3f6a4a, doorX = R((o.door || 0) * U), sides = o.sides || '';
    const jet = y => y >= FH ? JT : 0, zf = y => z1 + jet(y), zb = y => z0 - jet(y);
    const zs = z0 - JT - EV, ze = z1 + JT + EV, layers = Math.ceil((ze - zs + 1) / 2), ry0 = top - EV;
    const CEIL = 55;
    g.flat = new Set([PAL.GLASS, PAL.GLASS2, PAL.GLASS3, PAL.LEAD, 0xb8b2ac]);
    g.inside = (x, y, z) => {
      if (y < 0) return true;
      if (x <= x0 || x >= x1) return false;
      if (y < top) return o.forge && y < CEIL ? false : z > zb(y) && z < zf(y);
      const k = (y - ry0) & ~1; return z > zs + k && z < ze - k;
    };
    /* the four walls, each by (a: along it from its left, y, out from its plane) */
    const P = {
      front: (a, y, out, c) => g.set(x0 + a, y, zf(y) + out, c), back: (a, y, out, c) => g.set(x1 - a, y, zb(y) - out, c),
      left: (a, y, out, c) => g.set(x0 - out, y, z0 + a, c), right: (a, y, out, c) => g.set(x1 + out, y, z1 - a, c),
    };
    const rect = (put, a0, y0, a1, y1, out, c) => { for (let a = a0; a <= a1; a++) for (let y = y0; y <= y1; y++) put(a, y, out, typeof c === 'function' ? c(a, y) : c); };
    const seen = { front: !o.plain, left: sides.includes('L'), right: sides.includes('R'), back: false };
    for (const face of ['back', 'left', 'right', 'front']) {
      const put = P[face], side = face === 'left' || face === 'right', len = side ? D : W;
      // the ground floor
      for (let y = 0; y < FH; y++) for (let a = 0; a < len; a++) {
        if (face === 'front' && o.forge && a > 4 && a < len - 5 && y < CEIL) continue;
        put(a, y, 0, seen[face] ? ((a < 8 || a >= len - 8) && (Math.floor(y / 6) & 1) && y % 6 !== 5 ? PAL.STONE3 : stoneAt(a, y, seed + (side ? 5 : 0))) : PAL.STONE2);
      }
      if (seen[face]) {
        if (!(face === 'front' && o.forge)) rect(put, 0, 0, len - 1, 5, 1, (a, y) => y === 5 ? PAL.STONE3 : (a % 16 === 0 ? PAL.MORTAR : PAL.STONE2));         // a plinth
        for (let row = 2; row < 10; row++) { const off = Math.floor(H(row, seed + (side ? 5 : 0), 3) * 12); for (let i = 1; i * 12 < len; i++) if (H(i, row, seed + 31) < 0.06) { const a0 = i * 12 - off % 12 + 1; if (a0 > 9 && a0 + 10 < len - 9 && !(face === 'front' && (o.shop || o.forge || Math.abs(a0 + 5 - len / 2 - doorX) < 24))) rect(put, a0, row * 6, a0 + 10, row * 6 + 4, 1, PAL.STONE4); } }   // a stone standing proud here and there
      }
      // the upper floors: plaster panels in a timber frame
      const e = side ? JT : 0, A0 = -e, A1 = len - 1 + e, span = A1 - A0 + 1, NP = Math.max(2, R(span / 37)), pw = span / NP;
      for (let f = 1; f < F; f++) {
        const detail = seen[face] || (side && f >= 2 && !o.plain);
        const yb = f * FH;
        rect(put, A0, yb, A1, yb + FH - 1, 0, plaster);
        if (o.plain && !detail) continue;
        rect(put, A0, yb, A1, yb + 4, 1, (a, y) => y === yb ? PAL.TIMBER2 : PAL.TIMBER); rect(put, A0, yb + FH - 3, A1, yb + FH - 1, 1, PAL.TIMBER);
        const post = a => rect(put, Math.max(A0, a), yb + 5, Math.min(A1, a + 3), yb + FH - 4, 1, PAL.TIMBER);
        post(A0); post(A1 - 3);
        if (face === 'back' || !detail) continue;
        rect(put, A0, yb + 18, A1, yb + 19, 1, PAL.TIMBER);
        for (let p = 1; p < NP; p++) post(R(A0 + p * pw) - 2);
        for (let p = 0; p < NP; p++) {
          const a0 = R(A0 + p * pw) + (p === 0 ? 4 : 2), a1 = R(A0 + (p + 1) * pw) - (p === NP - 1 ? 5 : 3), mid = R((a0 + a1) / 2);
          const win = face === 'front' ? (a1 - a0 > 24) && !(NP > 4 && H(p, f, seed) < 0.16) : seen[face] && (p + f) % 2 === 0 && a1 - a0 > 24;
          // braces under the sill rail, or the height of the panel where there's no window
          if (seen[face]) {
            const kind = Math.floor(H(p, f, seed + 2) * 3);
            const brace = (s, ya, yb2, w) => { for (let y = ya; y <= yb2; y++) { const t = (y - ya) / (yb2 - ya), a = s > 0 ? a0 + t * w : a1 - t * w; for (let k = -1; k <= 1; k++) { const q = R(a) + k; if (q >= a0 && q <= a1) put(q, y, 0, PAL.TIMBER2); } } };
            if (!win) { brace(1, yb + 5, yb + 17, (a1 - a0) * 0.35); brace(-1, yb + 5, yb + 17, (a1 - a0) * 0.35); brace(1, yb + 20, yb + FH - 4, (a1 - a0) / 2); brace(-1, yb + 20, yb + FH - 4, (a1 - a0) / 2); }
            else if (kind === 0) { brace(1, yb + 5, yb + 17, a1 - a0); brace(-1, yb + 5, yb + 17, a1 - a0); }
            else if (kind === 1) { brace(1, yb + 5, yb + 17, (a1 - a0) * 0.4); brace(-1, yb + 5, yb + 17, (a1 - a0) * 0.4); }
          }
          if (win) windowAt(put, mid - 7, yb + 22, face === 'front', face === 'front' && H(p, f, seed + 5) < 0.7, p * 7 + f * 13);
        }
      }
      if (F > 1 && !side) {                                              // the jetty: its underside and the joists that carry it
        for (let a = 0; a < len; a++) for (let k = 1; k < JT; k++) g.set(x0 + a, FH, face === 'front' ? z1 + k : z0 - k, 0x3a2a1e);
        if (seen[face]) for (let a = 4; a < len - 4; a += 12) for (let k = 1; k <= JT + 1; k++) for (let w = 0; w < 4; w++) for (let y = FH - 4; y < FH; y++) g.set(x0 + a + w, y, z1 + k, k === JT + 1 ? PAL.TIMBER2 : PAL.TIMBER);
      }
      // the ground floor's windows
      if (seen[face] && !(face === 'front' && (o.shop || o.forge))) for (let a = 14; a + 30 < len; a += 37) {
        if (face === 'front' && Math.abs(a + 8 - W / 2 - doorX) < 30) continue;
        if (face === 'front') P.front(a, 60, 0, PAL.STONE2);
        windowAt(put, a, 20, true, false, a + 3);
      }
    }
    /* a leaded window, 77 x 125 cm, its panes set back a voxel: a frame and sill, shutters, sometimes a flower box */
    function windowAt(put, a0, y0, shutters, box, sd) {
      const w = 16, h = 26, curtain = H(sd, seed, 9) < 0.45;
      for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) {
        const a = a0 + i, y = y0 + j, frame = i < 2 || i > 13 || j < 2 || j > 23 || i === 7 || i === 8 || j === 17;
        put(a, y, 1, -1);
        if (frame) { put(a, y, 0, i < 2 || i > 13 || j < 2 || j > 23 ? PAL.TIMBER : PAL.TIMBER2); continue; }
        put(a, y, 0, -1);
        const lead = i === 4 || i === 11 || (j < 17 ? j % 5 === 1 : j % 3 === 2), t = H(i > 7 ? (i - 8) >> 2 : i >> 2, j < 17 ? Math.floor((j + 3) / 5) : 9 + (j >> 2), sd + seed);
        put(a, y, -1, lead ? PAL.LEAD : curtain && (i < 4 || i > 11) && j < 17 ? 0xb8b2ac : t < 0.22 ? PAL.GLASS2 : t < 0.5 ? PAL.GLASS3 : PAL.GLASS);
      }
      rect(put, a0 - 2, y0 - 2, a0 + w + 1, y0 - 1, 1, PAL.TIMBER); rect(put, a0 - 1, y0 + h, a0 + w, y0 + h + 1, 1, PAL.TIMBER);
      rect(put, a0 - 2, y0 - 2, a0 + w + 1, y0 - 1, 2, PAL.TIMBER2);
      if (shutters) for (const s of [0, 1]) {
        const b0 = s ? a0 + w + 1 : a0 - 9;
        rect(put, b0, y0, b0 + 7, y0 + h - 1, 1, (a, y) => { const i = a - b0, j = y - y0; if (Math.abs(i - 3.5) + Math.abs(j - 14.5) < 2.2) return shade(shutter, 0.5); if (j === 4 || j === 5 || j === 21 || j === 22) return (s ? i === 0 : i === 7) ? PAL.IRON : shade(shutter, 0.86); return i === 2 || i === 5 ? shade(shutter, 0.74) : shutter; });
      }
      if (box) {
        for (let out = 2; out <= 5; out++) rect(put, a0 - 1, y0 - 6, a0 + w, y0 - 2, out, (a, y) => out > 2 && out < 5 && a > a0 - 1 && a < a0 + w ? (y === y0 - 2 ? 0x4a3424 : -1) : y === y0 - 4 ? PAL.WOOD2 : PAL.WOOD);
        for (const b of [a0 + 1, a0 + w - 2]) rect(put, b, y0 - 9, b, y0 - 7, 2, PAL.IRON);
        const cols = [[0xd8304a, 0xe8506a], [0xf08ac0, 0xfdf6fa], [0xf0d04a, 0xf0a030], [0xe86a3a, 0xd8304a], [0x9a7ae0, 0xfdf6fa]][Math.floor(H(sd, seed, 6) * 5)];
        rect(put, a0, y0 - 1, a0 + w - 1, y0 - 1, 3, PAL.LEAF2); rect(put, a0, y0 - 1, a0 + w - 1, y0 - 1, 4, PAL.LEAF); rect(put, a0, y0 - 1, a0 + w - 1, y0 - 1, 5, PAL.LEAF2);
        for (let a = a0; a < a0 + w - 1; a += 2) { const t = H(a, 5, sd + seed), out = 3 + Math.floor(t * 2.9), hh = 1 + Math.floor(H(a, 6, sd) * 2.2); for (let k = 0; k < hh; k++) put(a, y0 + k, out, PAL.LEAF); rect(put, a, y0 + hh - (t < 0.3 ? 1 : 0), a + 1, y0 + hh, out, cols[t < 0.5 ? 0 : 1]); if (t < 0.4) put(a, y0 - 2, 6, PAL.LEAF); }
      }
    }
    // the door: round-headed, planked and strapped with iron, in a stone surround, a step in front, a lantern beside it
    if (!o.forge && !o.noDoor && !o.plain) {
      const dc = R(W / 2 + doorX), arch = (i, y, r, yc) => Math.abs(i) <= r && (y <= yc || Math.hypot(i, (y - yc) * 1.05) <= r + 0.4);
      for (let i = -15; i <= 15; i++) for (let y = 0; y <= 54; y++) {
        const a = dc + i;
        if (arch(i, y, 10, 36)) {
          P.front(a, y, 1, -1); P.front(a, y, 0, -1);
          P.front(a, y, -1, (i + 20) % 5 === 0 ? 0x4a2e1a : H((i + 20) / 5 | 0, seed, 2) < 0.5 ? PAL.WOOD2 : 0x7a4e2c);
          if (y === 9 || y === 10 || y === 33 || y === 34) P.front(a, y, 0, (i + 20) % 6 === 0 ? 0x565660 : PAL.IRON);
        } else if (arch(i, y, 14, 37)) {
          const n = y <= 37 ? Math.floor(y / 8) + (i > 0 ? 1 : 0) : Math.floor(Math.atan2(y - 37, i) * 4) + 20;
          P.front(a, y, 1, n & 1 ? PAL.STONE3 : 0xc9c3ba);
        }
      }
      for (const [i, y] of [[7, 22], [6, 21], [8, 21], [6, 20], [8, 20], [7, 19]]) P.front(dc + i, y, 0, 0xc8a24a);
      for (let out = 1; out <= 5; out++) rect(P.front, dc - 16, 0, dc + 16, 2, out, (a, y) => y === 2 ? PAL.STONE3 : PAL.STONE2);
      const la = dc + 20;                                               // the lantern
      for (let out = 1; out <= 4; out++) P.front(la, 48, out, PAL.IRON);
      for (let k = 0; k < 8; k++) for (let i = -1; i <= 1; i++) for (let w = -1; w <= 1; w++) { const e2 = Math.abs(i) + Math.abs(w); P.front(la + i, 39 + k, 4 + w, k === 0 || k === 7 ? PAL.IRON : e2 === 2 ? PAL.IRON : 0xead9a6); }
    }
    // a shop front: a wide leaded window either side of the door over a panelled counter, an awning
    if (o.shop) {
      const dc = R(W / 2 + doorX);
      for (const [a0, a1] of [[8, dc - 18], [dc + 18, W - 9]]) {
        if (a1 - a0 < 16) continue;
        const n = Math.max(1, R((a1 - a0) / 18));
        for (let a = a0; a <= a1; a++) for (let y = 6; y <= 50; y++) {
          const u = (a - a0) / (a1 - a0) * n, fu = u - Math.floor(u), mull = a <= a0 + 1 || a >= a1 - 1 || fu * (a1 - a0) / n < 1.5;
          P.front(a, y, 1, -1);
          if (y < 20) { P.front(a, y, 0, y < 8 || y > 17 || mull || fu * (a1 - a0) / n < 3 || fu * (a1 - a0) / n > (a1 - a0) / n - 2 ? shade(shutter, 0.85) : shutter); continue; }      // the panelled riser
          if (mull || y > 48 || y === 20 || y === 40) { P.front(a, y, 0, PAL.TIMBER); continue; }
          P.front(a, y, 0, -1); const t = H(Math.floor(u), y >> 4, seed + 4), i = R(fu * (a1 - a0) / n);
          P.front(a, y, -1, i % 4 === 1 && y > 40 || (y > 40 && y % 4 === 0) ? PAL.LEAD : t < 0.3 ? PAL.GLASS3 : t < 0.5 ? PAL.GLASS2 : PAL.GLASS);
        }
        for (let out = 1; out <= 7; out++) rect(P.front, a0 - 1, 17, a1 + 1, 18, out, (a) => a % 9 === 0 ? PAL.WOOD2 : PAL.WOOD3);
        for (let a = a0 + 3; a < a1; a += 22) for (let k = 0; k < 6; k++) for (let out = 1; out <= 6 - k; out++) rect(P.front, a, 16 - k, a + 1, 16 - k, out, PAL.WOOD2);
        for (let a = a0 - 3; a <= a1 + 3; a++) {                         // the awning, striped and scalloped
          const i = Math.floor((a - a0 + 80) / 6), c = i & 1 ? o.awning || 0xc23a3a : 0xf1ece2, u2 = ((a - a0 + 80) % 6) - 2.5;
          for (let k = 1; k <= 18; k++) { const y = 60 - R(k * 0.36); P.front(a, y, k, c); if (R((k + 1) * 0.36) > R(k * 0.36)) P.front(a, y - 1, k, c); }
          const hang = 4 - R(u2 * u2 * 0.3); for (let k = 1; k <= hang; k++) P.front(a, 54 - k, 18, k === hang ? shade(c, 0.8) : c);
        }
        for (const a of [a0 - 2, a1 + 2]) for (let k = 1; k <= 17; k++) P.front(a, 44 + R(k * 0.5), k, PAL.IRON);
      }
    }
    // the forge: the front of the ground floor open under a great beam, the hearth glowing inside, its hood, tools on the wall
    if (o.forge) {
      for (let a = 1; a < W - 1; a++) for (let z = z0 + 1; z <= z1; z++) { g.set(x0 + a, CEIL, z, (a % 14) < 4 ? PAL.TIMBER : 0x4a3624); g.set(x0 + a, 0, z, stoneAt(a, z + 400, 9)); if (a % 14 < 4) for (let y = CEIL - 4; y < CEIL; y++) g.set(x0 + a, y, z, PAL.TIMBER); }
      for (let y = 1; y < CEIL; y++) for (let a = 1; a < W - 1; a++) g.set(x0 + a, y, z0 + 1, shade(stoneAt(a, y, seed), 0.72));
      for (let y = 1; y < CEIL; y++) for (let z = z0 + 1; z < z1; z++) { g.set(x0 + 1, y, z, shade(stoneAt(z + 200, y, seed), 0.78)); g.set(x1 - 1, y, z, shade(stoneAt(z + 200, y, seed), 0.78)); }
      for (const s of [-1, 1]) for (let y = 0; y < CEIL; y++) for (let k = 0; k < 6; k++) for (let m = 0; m < 6; m++) g.set(s < 0 ? x0 + 5 + k : x1 - 5 - k, y, z1 - m, PAL.TIMBER);
      rect(P.front, 5, CEIL - 5, W - 6, CEIL + 6, 1, (a, y) => y === CEIL + 6 ? PAL.TIMBER2 : PAL.TIMBER);
      const hz = z1 - 34;                                               // the hearth
      g.box(-20, 0, hz - 12, 20, 18, hz + 12, (x, y, z) => stoneAt(x + z + 300, y, 3)); g.box(-21, 19, hz - 13, 21, 20, hz + 13, PAL.STONE3);
      g.box(-14, 21, hz - 8, 14, 22, hz + 8, (x, y, z) => { const t = H(x >> 1, y, z >> 1); return t < 0.3 ? 0x2a2020 : VX.glow(t < 0.6 ? 0xff7a2a : t < 0.85 ? 0xffb347 : 0xffe08a); });
      for (let k = 0; k < 16; k++) g.box(-22 + R(k * 0.7), 40 + k, hz - 14 + R(k * 0.5), 22 - R(k * 0.7), 40 + k, hz + 14 - R(k * 0.5), (x, y, z) => k === 0 ? PAL.IRON : stoneAt(x + z + 300, y, 5));
      for (const s of [-1, 1]) g.box(s * 20 - 1, 21, hz - 12, s * 20 + 1, 40, hz - 10, PAL.IRON);
      for (let k = 0; k < 20; k++) g.box(26 + R(k * 0.4), 14 + R(k * 0.3), hz - 6 + R(k * 0.2), 27 + R(k * 0.4), 22 - R(k * 0.2), hz + 6 - R(k * 0.2), k % 4 === 3 ? PAL.WOOD2 : 0x5a3a2a);      // the bellows
      for (let i = 0; i < 9; i++) { const x = x0 + 18 + i * 12, y = 34; g.box(x, y - 14 - (i % 3) * 2, z0 + 2, x, y, z0 + 2, i & 1 ? PAL.WOOD : PAL.IRON); if (i % 3 === 0) g.box(x - 3, y - 16, z0 + 2, x + 3, y - 13, z0 + 2, PAL.IRON); else if (i % 3 === 1) g.box(x - 2, y - 18, z0 + 2, x + 2, y - 15, z0 + 2, 0x8a9098); }      // tools on their hooks
      g.box(x0 + 12, 35, z0 + 2, x0 + 124 > x1 - 12 ? x1 - 12 : x0 + 124, 36, z0 + 2, PAL.TIMBER);
    }
    // the roof: a steep gable along the front, its courses lipped, barge boards at the gable ends, a ridge, a brick chimney
    const RB = o.roof === 'slate' ? PAL.SLATE : o.roof === 'thatch' ? PAL.THATCH : PAL.TILE, CH = o.roof === 'thatch' ? 14 : 6;
    const rc = (x, k, back) => {
      const ci = Math.floor(k / CH), base = shade(RB, 0.95 + H(ci, seed, 1) * 0.1);
      if (back) return base;
      const tw = o.roof === 'thatch' ? 14 : 8, t = H(Math.floor((x + 512 + (ci & 1) * 4) / tw), ci, seed + 2);
      return t < 0.1 ? shade(base, 0.86) : t > 0.92 ? shade(base, 1.14) : base;
    };
    const flat = c => { g.flat.add(c); return c; }, BARGE = flat(0x4c3626), SOFFIT = flat(0x3e2e20);
    for (let k = 0; k < layers; k += 2) {                 // (in steps of two voxels; its colours take no occlusion, so the courses merge)
      const za = zs + k, zb2 = ze - k, y = ry0 + k, lip = k % CH < 2;
      for (let x = x0 - VG; x <= x1 + VG; x++) {
        const over = x < x0 || x > x1, cf = flat(rc(x, k, o.plain)), cb = flat(rc(x, k, true));
        for (let m = 0; m < 2; m++) for (let j = 0; j < 2; j++) { g.set(x, y + m, za + j, cb); g.set(x, y + m, zb2 - j, cf); }
        if (lip) { if (!o.plain) g.set(x, y, za - 1, flat(shade(cb, 0.84))); g.set(x, y, zb2 + 1, flat(shade(cf, 0.84))); if (o.roof === 'thatch' && !o.plain && H(x >> 3, k, seed) < 0.5) { g.set(x, y, zb2 + 2, flat(shade(cf, 0.84))); g.set(x, y - 1, zb2 + 1, flat(shade(cf, 0.8))); } }
        if (over) for (let m = 1; m <= 4; m++) if (y - m >= ry0 - 2) { const c = x === x0 - VG || x === x1 + VG ? BARGE : SOFFIT; for (let j = 0; j < 2; j++) { g.set(x, y - m, za + j, c); g.set(x, y - m, zb2 - j, c); } }
        if (k < EV && !over && !o.plain) for (let j = 0; j < 2; j++) { g.set(x, y - 1, zb2 - j, SOFFIT); g.set(x, y - 1, za + j, SOFFIT); }
      }
      const zm = Math.floor((zs + ze) / 2);
      if (k >= EV) for (const x of [x0, x1]) for (let z = za + 2; z < zb2 - 1; z++) for (let m = 0; m < 2; m++) g.set(x, y + m, z, !o.plain && (z === zm || z === zm + 1 || (k - EV) % 26 < 2 || z - za < 4 || zb2 - z < 4) ? PAL.TIMBER : plaster);   // the gable ends
    }
    for (let x = x0 - VG; x <= x1 + VG; x++) { const zm = Math.floor((zs + ze) / 2), yr = ry0 + layers - 1; for (let z = zm - 2; z <= zm + 3; z++) g.set(x, yr + 1, z, (x + 512) % 8 === 0 ? shade(RB, 0.72) : shade(RB, 0.9)); }
    const cx = x1 - 24 - (seed % 3) * 14, ctop = ry0 + layers + 12, cz0 = Math.floor((zs + ze) / 2) - 22;
    for (let y = ry0 + layers - 34; y <= ctop; y++) for (let x = cx; x < cx + 14; x++) for (let z = cz0; z < cz0 + 12; z++) { if (x !== cx && x !== cx + 13 && z !== cz0 && z !== cz0 + 11) continue; g.set(x, y, z, y > ctop - 3 ? PAL.STONE2 : o.plain ? 0x8c4a3f : brickAt(x + z, y)); }
    g.box(cx, ctop, cz0, cx + 13, ctop, cz0 + 11, 0x4a4442); g.box(cx + 4, ctop + 1, cz0 + 3, cx + 9, ctop + 7, cz0 + 8, (x, y, z) => y === ctop + 7 ? (x > cx + 4 && x < cx + 9 && z > cz0 + 3 && z < cz0 + 8 ? 0x2a2626 : 0xa85a3a) : 0x9a5236);
    return g;
  }
  /* the same house as a plain block, only to cast its shadow (a few dozen faces instead of ten thousand) */
  function houseShadowGrid(o) {
    const g = grid(), x0 = -o.W / 2, x1 = o.W / 2 - 1, z0 = -o.D / 2, z1 = o.D / 2 - 1, top = o.floors * 12;
    for (let y = 0; y < top; y++) { const j = y >= 12 ? 1 : 0; g.box(x0, y, z0 - j, x1, y, z1 + j, 0x808080); }
    const zs = z0 - 2, ze = z1 + 2, n = Math.ceil((ze - zs + 1) / 2);
    for (let k = 0; k < n; k++) g.box(x0 - 1, top - 1 + k, zs + k, x1 + 1, top - 1 + k, ze - k, 0x808080);
    return g;
  }
  // the chapel (seen over the roofs; voxels of 9.6 cm): stone walls, tall pointed windows, a steep slate roof, a bell tower with a spire
  const CB = 0.096;
  function chapelGrid() {
    const g = grid(), V = m => R(m / CB);
    const st = (a, y) => { const row = Math.floor(y / 6), i = Math.floor((a + (row & 1) * 5 + 400) / 10); if (y % 6 === 5 || (a + (row & 1) * 5 + 400) % 10 === 0) return 0x9a938a; return H(i, row, 3) < 0.4 ? PAL.STONE3 : 0xc4bdb2; };
    const W2 = V(3.5), D2 = V(6), HW = V(9), rise = W2 + 2, tz0 = D2 - V(0.5), tz1 = D2 + V(2.6), TW = V(1.55), TH = V(18);
    g.inside = (x, y, z) => y < 0 || (Math.abs(x) < W2 && Math.abs(z) < D2 && y < HW) || (y >= HW && Math.abs(x) < W2 - (y - HW) && Math.abs(z) < D2) || (Math.abs(x) < TW && z > tz0 && z < tz1 && (y < V(14) || (y > V(16.6) && y < TH)));
    for (let y = 0; y < HW; y++) { for (let x = -W2; x <= W2; x++) for (const z of [-D2, D2]) g.set(x, y, z, 0xb4ada4); for (let z = -D2; z <= D2; z++) for (const x of [-W2, W2]) g.set(x, y, z, 0xb4ada4); }      // (the nave is hidden behind the houses)
    for (let k = 0; k <= rise; k++) for (let z = -D2 - 3; z <= D2 + 3; z++) for (const s of [-1, 1]) { g.set(s * (rise - k), HW + k - 2, z, k % 5 === 0 ? shade(PAL.SLATE, 0.8) : PAL.SLATE); }
    for (let k = 0; k < W2; k++) for (let x = -W2 + k; x <= W2 - k; x++) for (const z of [-D2, D2]) g.set(x, HW + k, z, 0xb4ada4);
    for (let y = 0; y < TH; y++) for (let x = -TW; x <= TW; x++) for (let z = tz0; z <= tz1; z++) {
      if (Math.abs(x) !== TW && z !== tz0 && z !== tz1) continue;
      const belfry = y > V(14) && y < V(16.6) && ((Math.abs(x) < TW - 4) || (z > tz0 + 4 && z < tz1 - 4)) && !(y > V(16) && (Math.abs(x) > TW - 8));
      if (!belfry) g.set(x, y, z, y < V(8) ? 0xb4ada4 : y % V(4.5) < 2 ? PAL.STONE3 : st(x + z, y));
    }
    g.ell(0, V(15.4), (tz0 + tz1) / 2, 5, 6, 5, 0x9a7a3a); g.box(-TW, V(16.5), R((tz0 + tz1) / 2), TW, V(16.5) + 1, R((tz0 + tz1) / 2), PAL.TIMBER);
    const cz = R((tz0 + tz1) / 2), SH = V(7.5);
    for (let k = 0; k < SH; k++) { const r = (TW + 2) * (1 - k / SH); for (let x = -Math.ceil(r); x <= r; x++) for (let z = -Math.ceil(r); z <= r; z++) { const m = Math.max(Math.abs(x), Math.abs(z)); if (m >= r - 1.4 && m <= r + 0.3) g.set(x, TH + k, cz + z, k % 6 === 0 ? shade(PAL.SLATE, 0.78) : PAL.SLATE); } }
    g.box(0, TH + SH, cz, 0, TH + SH + 12, cz, 0xc8a24a); g.box(-4, TH + SH + 8, cz, 4, TH + SH + 8, cz, 0xc8a24a);
    return g;
  }
  // the town wall and its gatehouse (the gate stands open; a hay cart is pulled up in it)
  function wallGrid() {
    const g = grid(), L = 417, Hh = 125, D = 31;
    g.inside = (x, y, z) => y < 0 || (x > 0 && x < L - 1 && y < Hh - 10 && z > 0 && z < D - 1);
    for (let x = 0; x < L; x++) for (let y = 0; y < Hh; y++) for (const z of [0, D - 1]) { if (y >= Hh - 8 && (x % 22 >= 12)) continue; g.set(x, y, z, z === 0 ? stoneAt(x, y, 4) : PAL.STONE2); }
    for (let x = 0; x < L; x++) for (let z = 1; z < D - 1; z++) g.set(x, Hh - 11, z, PAL.STONE2);
    for (let y = 0; y < Hh - 10; y++) for (let z = 1; z < D - 1; z++) { g.set(0, y, z, PAL.STONE2); g.set(L - 1, y, z, PAL.STONE2); }
    return g;
  }
  function gatehouseGrid() {
    const g = grid(), X = 104, Yt = 188, Z = 31, AR = 42, AY = 94;
    const hole = (x, y) => Math.abs(x) < AR && (y < AY || Math.hypot(x, y - AY) < AR);
    g.inside = (x, y, z) => y < 0 || (Math.abs(x) < X && y < Yt && Math.abs(z) < Z && !hole(x, y));
    for (let x = -X; x <= X; x++) for (let y = 0; y <= Yt + 10; y++) {
      if (hole(x, y)) continue;
      for (const z of [-Z, Z]) {
        if (y > Yt && ((x + 220) % 22 >= 12)) continue;
        const d = y >= AY ? Math.hypot(x, y - AY) : Math.abs(x), ring = y >= 0 && d < AR + 9 && Math.abs(x) < AR + 9;
        g.set(x, y, z, ring ? ((y >= AY ? Math.floor(Math.atan2(y - AY, x) * 9) : Math.floor(y / 10)) & 1 ? PAL.STONE3 : 0xc9c3ba) : stoneAt(x + 200, y, 6));
        if (ring) g.set(x, y, z + (z < 0 ? -1 : 1), (y >= AY ? Math.floor(Math.atan2(y - AY, x) * 9) : Math.floor(y / 10)) & 1 ? PAL.STONE3 : 0xc9c3ba);
        else if (Math.abs(x) > X - 16 && Math.floor(y / 6) % 2 === 0 && y % 6 !== 5) g.set(x, y, z + (z < 0 ? -1 : 1), PAL.STONE3);
      }
    }
    for (let y = 0; y <= Yt; y++) for (let z = -Z; z <= Z; z++) for (const x of [-X, X]) g.set(x, y, z, PAL.STONE2);
    for (let x = -X; x <= X; x++) for (let z = -Z; z <= Z; z++) g.set(x, Yt, z, PAL.STONE2);
    for (let z = -Z; z <= Z; z++) { for (let y = 0; y < AY; y++) for (const s of [-1, 1]) g.set(s * AR, y, z, stoneAt(z + 200, y, 8)); for (let k = 0; k <= 280; k++) { const a = k / 280 * Math.PI; g.set(Math.cos(a) * AR, AY + Math.sin(a) * AR, z, k % 14 === 0 ? PAL.MORTAR : PAL.STONE4); } }        // the passage, vaulted
    g.box(-AR, 130, -Z - 1, AR, 130, -Z - 1, -1);
    for (let x = -34; x <= 34; x += 8) { g.box(x - 1, 108, -24, x + 1, 134, -22, (xx, y) => y < 112 && xx !== x ? -1 : PAL.IRON); } g.box(-36, 116, -24, 36, 118, -22, PAL.IRON); g.box(-36, 128, -24, 36, 130, -22, PAL.IRON);      // the raised portcullis
    for (const s of [-1, 1]) {                             // banners either side of the arch (the thistle), and leaves of the gate folded back inside it
      const bx = s * 70;
      for (let x = -14; x <= 14; x++) for (let y = 78; y <= 150; y++) { if (y < 78 + Math.abs(x) * 0.9) continue; const u = x / 10, v = (y - 116) / 16, e = Math.abs(x) > 12 || y > 147; const flower = Math.hypot(u, (v - 0.55) * 1.2) < 0.55, bulb = Math.hypot(u * 1.2, v * 1.2) < 0.5, stem = Math.abs(x) < 1 && v < -0.2 && v > -1.3, leaf = v < -0.4 && v > -1.2 && Math.abs(Math.abs(u) - (v + 1.3) * 0.5) < 0.2; for (const z of [-1, 1]) g.set(bx + x, y, z * (Z + 2), e ? 0xe8c24a : flower ? 0xa05ac0 : bulb || stem || leaf ? 0x5a9a4a : 0x2f4f9e); }
      for (const z of [-1, 1]) g.box(bx - 17, 151, z * (Z + 2), bx + 17, 152, z * (Z + 2), PAL.IRON);
      for (let y = 0; y < AY; y++) for (let z = -18; z <= 24; z++) g.set(s * (AR - 2), y, z, y % 30 < 3 ? PAL.IRON : (z + 40) % 7 === 0 ? 0x4a2e1a : PAL.WOOD2);
    }
    return g;
  }
  function parapetGrid() { const g = grid(); g.inside = (x, y, z) => y < 0; g.box(0, 0, -73, 11, 20, 73, (x, y, z) => stoneAt(x === 0 || x === 11 ? z + 200 : x + 100, y, 4)); g.box(-1, 21, -74, 12, 23, 74, (x, y, z) => (z + 100) % 20 === 0 ? PAL.MORTAR : PAL.STONE3); return g; }
  function bridgeGrid() {                                // the room built across the alley
    const g = grid(), X = 30, Z = 20, Hh = 58;
    g.inside = (x, y, z) => y > 0 && y < Hh + 4 && Math.abs(x) < X && Math.abs(z) < Z;
    for (let x = -X; x <= X; x++) for (let y = 0; y <= Hh; y++) for (let z = -Z; z <= Z; z++) {
      const ex = Math.abs(x) === X, ez = Math.abs(z) === Z; if (!ex && !ez && y !== 0) continue;
      const a = ez ? x : z, beam = y < 5 || y > Hh - 3 || Math.abs(a) > (ez ? X : Z) - 4 || y === 18 || y === 19 || (ez && Math.abs(Math.abs(x) - 14) < 2);
      const win = ez && Math.abs(x) < 11 && y > 22 && y < 48;
      g.set(x, y, z, y === 0 ? ((x + 60) % 12 < 4 ? PAL.TIMBER : 0x3a2a1e) : win ? (Math.abs(x) > 8 || Math.abs(x) < 1 || y < 25 || y > 45 || y === 38 ? PAL.TIMBER : x % 4 === 0 || y % 5 === 0 ? PAL.LEAD : H(x >> 2, y >> 2, 4) < 0.35 ? PAL.GLASS3 : PAL.GLASS) : beam ? PAL.TIMBER : 0xd8d0c0);
    }
    for (let k = 0; k <= Z + 4; k++) for (let x = -X - 4; x <= X + 4; x++) for (const s of [-1, 1]) { g.set(x, Hh - 2 + k, s * (Z + 4 - k), k % 5 === 0 ? shade(PAL.SLATE, 0.8) : PAL.SLATE); if (k % 5 === 0) g.set(x, Hh - 2 + k, s * (Z + 5 - k), shade(PAL.SLATE, 0.8)); }
    for (let k = 4; k < Z + 2; k++) for (let z = -(Z + 4 - k); z <= Z + 4 - k; z++) for (const x of [-X, X]) g.set(x, Hh - 2 + k, z, 0xd8d0c0);
    return g;
  }

  /* ------------------------------------------------- trees and the country -- */
  function treeGrid() {                                  // a town tree's planter, trunk and branches (its crown is its own piece)
    const g = grid();
    g.box(-15, 0, -15, 15, 12, 15, (x, y, z) => { if (Math.abs(x) < 13 && Math.abs(z) < 13) return y === 10 ? 0x4a3826 : -1; return y > 10 ? PAL.STONE3 : stoneAt(Math.abs(x) >= 15 ? z + 100 : x + 100, y, 3); });
    for (let y = 10; y <= 62; y++) { const t = (y - 10) / 52, r = 4.2 - t * 1.8, a = y * 0.12; g.disc(Math.cos(a) * 0.9, Math.sin(a) * 0.9, r, y, y, (x, yy, z) => H(Math.floor(Math.atan2(z, x) * 3), y >> 4, 2) < 0.4 ? 0x5a3e2a : PAL.BARK); }
    for (let k = 0; k < 4; k++) { const a = k * HP + 0.5; g.line(0, 12, 0, Math.cos(a) * 8, 10, Math.sin(a) * 8, PAL.BARK, 1.2); g.line(0, 48 + k * 3, 0, Math.cos(a) * 16, 66 + k * 4, Math.sin(a) * 16, PAL.BARK, 1.2); }
    for (let k = 0; k < 40; k++) { const x = R((H(k, 1, 7) - 0.5) * 24), z = R((H(k, 2, 7) - 0.5) * 24), c = [0xfdf6fa, 0xf0d04a, 0xd87aa0, PAL.LEAF, PAL.LEAF3][k % 5]; if (Math.hypot(x, z) > 5) { g.set(x, 11, z, PAL.LEAF2); g.set(x, 12, z, c); } }
    return g;
  }
  function crownGrid(seed) {                             // its crown: clumps of leaves, lighter toward the top, gaps between (9.6 cm)
    const g = grid();
    for (const b of [[0, 36, 0, 12, 9, 12], [8, 31.5, 5, 7.5, 6, 7.5], [-8, 33, -5, 8, 7, 8], [3, 42, -3, 8, 6, 8], [-5, 40, 6, 7, 5, 7], [6, 34, -8, 7, 5, 7]])
      g.ell(b[0], b[1], b[2], b[3], b[4], b[5], (x, y, z) => { const n = H(x >> 1, (y >> 1) + seed, z >> 1); return n < 0.05 ? -1 : y - b[1] > b[4] * 0.45 ? (n < 0.6 ? PAL.LEAF3 : 0x76b656) : y - b[1] < -b[4] * 0.4 ? (n < 0.6 ? PAL.LEAF2 : 0x356a28) : n < 0.5 ? PAL.LEAF : n < 0.8 ? PAL.LEAF2 : PAL.LEAF3; });
    return g;
  }
  function forestTreeGrid(seed) {                        // a fir, 10 m: boughs in tiers
    const g = grid();
    g.box(0, 0, 0, 1, 8, 1, PAL.BARK);
    g.flat = new Set([0x2a5a34, 0x3f8248, 0x34703e]);
    for (let y = 5; y <= 40; y++) { const tier = (y - 5) % 8, r = (41 - y) * 0.2 + (7 - tier) * 0.3; g.disc(0.5, 0.5, Math.max(0.4, Math.round(r * 2) / 2), y, y, (x, yy, z) => tier === 0 && H(x, yy, z + seed) < 0.3 ? -1 : tier === 0 ? 0x2a5a34 : tier > 4 ? 0x3f8248 : 0x34703e); }
    return g;
  }
  // bunting: little pennants on a line, sagging across the square (along x, its middle at 0; length in voxels of 4.8 cm)
  function buntingGrid(len) {
    const g = grid(), cols = [0xc8303a, 0x2f5fbf, 0xe8c24a, 0xf1ece2, 0x3f9a5a], h = len >> 1;
    for (let x = 0; x <= len; x++) {
      const y = -R(Math.sin(x / len * Math.PI) * len * 0.06), p = x % 8;
      g.set(x - h, y, 0, 0x5a4a3a);
      if (p >= 1 && p <= 5) { const c = cols[Math.floor(x / 8) % 5], d = [2, 4, 7, 4, 2][p - 1]; for (let k = 1; k <= d; k++) g.set(x - h, y - k, 0, k === 1 ? shade(c, 0.8) : c); }
    }
    return g;
  }
  const WM = 0.12;
  function windmillGrid() {                              // a tower mill, 13 m: whitewashed, a plank door, windows, a gallery, a thatched cap
    const g = grid(), V = m => R(m / WM);
    g.inside = (x, y, z) => y < 0 || (y < V(10.5) && Math.hypot(x, z) < V(3) - Math.floor(y / 11) * 0.8 - 1.2);
    for (let y = 0; y <= V(10.5); y++) { const r = V(3) - Math.floor(y / 11) * 0.8; g.disc(0, 0, r, y, y, (x, yy, z) => Math.hypot(x, z) > r - 1.6 ? (yy < 8 ? (H(x, yy >> 1, z) < 0.4 ? PAL.STONE2 : PAL.STONE) : yy % 30 < 2 ? PAL.TIMBER : 0xe8e0d0) : -1); }
    for (let k = 0; k < V(2.4); k++) g.disc(0, 0, V(2.5) - k * 0.95, V(10.5) + 1 + k, V(10.5) + 1 + k, k % 5 === 0 ? 0x96743e : PAL.THATCH);
    g.disc(0, 0, V(3.6), V(3.8), V(3.8), PAL.WOOD2); for (let k = 0; k < 28; k++) { const a = k / 28 * TAU, x = Math.cos(a) * V(3.5), z = Math.sin(a) * V(3.5); g.line(x, V(3.8), z, x, V(4.6), z, PAL.WOOD); } for (let k = 0; k < 220; k++) { const a = k / 220 * TAU; g.set(Math.cos(a) * V(3.5), V(4.6), Math.sin(a) * V(3.5), PAL.WOOD); }
    for (let y = 0; y <= V(2.2); y++) for (let k = -4; k <= 4; k++) if (y < V(1.8) || Math.abs(k) < 3) g.set(k, y, V(3), k % 3 === 0 ? 0x4a2e1a : PAL.WOOD2);
    for (const [a, y] of [[0, 6], [2.1, 6.6], [4.2, 6], [1, 8.6], [3.4, 8.6]]) for (let j = 0; j < 8; j++) for (let k = -2; k <= 2; k++) { const r = V(3) - V(y) * 0.07; g.set(Math.sin(a) * r + Math.cos(a) * k, V(y) + j, Math.cos(a) * r - Math.sin(a) * k, Math.abs(k) === 2 || j === 0 || j === 7 ? PAL.TIMBER : PAL.GLASS); }
    return g;
  }
  function sailsGrid() {                                 // the windmill's sails, turning in the xy plane about the hub: lattices with canvas
    const g = grid();
    g.box(-3, -3, 0, 3, 3, 3, PAL.WOOD2);
    for (let k = 0; k < 4; k++) { const a = k * HP, c = R(Math.cos(a)), s = R(Math.sin(a)); for (let r = 3; r <= 52; r++) { g.set(c * r, s * r, 1, PAL.WOOD2); if (r > 9) for (let w = 1; w <= 12; w++) { const lat = w === 12 || (r - 9) % 7 === 0 || w % 4 === 0; g.set(c * r - s * w, s * r + c * w, 0, lat ? PAL.WOOD : 0xe8e0d0); } } }
    return g;
  }
  /* the Mage Academy as it's seen from the town: on its hill, its back to the mountains, its front this way (+z). Forty centimetre voxels */
  function farAcademy() {
    const g = grid(), ST = [0xc0ae94, 0xb4a288, 0xccba9e], SL = 0x6c6672, SL2 = 0x5c5664, W = 0x3a4258, WL = VX.glow(0xffdc9a), st = (x, y, z) => ST[H(x >> 1, y >> 1, z >> 1) < 0.25 ? 1 : H(x >> 2, y >> 1, z >> 2) < 0.4 ? 2 : 0];
    g.inside = () => false;
    const roof = (x0, x1, z0, z1, y, h, c, c2, alongX) => { for (let k = 0; k <= h; k++) { if (alongX) { const a = R((z1 - z0) / 2 * k / h); g.box(x0 - 1, y + k, z0 - 1 + a, x1 + 1, y + k, z1 + 1 - a, (x, yy, z) => (x + k * 3) % 5 === 0 ? c2 : c); } else { const a = R((x1 - x0) / 2 * k / h); g.box(x0 - 1 + a, y + k, z0 - 1, x1 + 1 - a, y + k, z1 + 1, (x, yy, z) => (z + k * 3) % 5 === 0 ? c2 : c); } } };
    // a terrace of stone for the school, arches along it, a great stair down to the court
    const TY = 30; g.box(-58, 0, -40, 58, TY, 8, (x, y, z) => { const e = z === 8 || z === -40 || Math.abs(x) === 58 || y === TY; if (!e) return -1; if (y === TY) return 0x9a948a; const u = ((x + 400) % 14) - 7; return z === 8 && y < 20 && Math.abs(u) < 4 && Math.hypot(u, Math.max(0, y - 15)) < 4.5 ? 0x4a4650 : y > TY - 3 ? ST[2] : st(x, y, z); });
    for (let k = 0; k <= 15; k++) g.box(-10, k * 2, 8, 10, k * 2 + 1, 8 + (15 - k) * 2, (x, y, z) => Math.abs(x) > 8 ? ST[1] : y % 2 ? 0xc8c0b2 : 0xb0a89a);
    const g0 = g, up = { box: (x0, y0, z0, x1, y1, z1, c) => g0.box(x0, y0 + TY, z0, x1, y1 + TY, z1, typeof c === 'function' ? (x, y, z) => c(x, y - TY, z) : c), ell: (x, y, z, a, b, c2, c) => g0.ell(x, y + TY, z, a, b, c2, c) };
    // the school, its three rows of windows, its portal, the tower with the bell
    const roofUp = (x0, x1, z0, z1, y, h, c, c2, al) => roof(x0, x1, z0, z1, y + TY, h, c, c2, al);
    up.box(-50, 0, -34, 50, 27, 2, (x, y, z) => { const f = z === 2 || z === -34, e = Math.abs(x) === 50; if (!f && !e) return y > 25 ? ST[1] : -1; const a = f ? x : z, u = ((a + 400) % 8), r = y % 9; if (r === 8 || r === 0 && y > 0) return ST[1]; if (u > 2 && u < 6 && r > 2 && r < 7) return H(a >> 3, y >> 3, 7) < 0.22 ? WL : W; return st(x, y, z); });
    roofUp(-50, 50, -34, 2, 28, 18, SL, SL2, true);
    for (const x of [-36, -18, 18, 36]) { up.box(x - 2, 32, -6, x + 2, 38, 1, (X, y, z) => z === 1 && Math.abs(X - x) < 2 && y < 37 && y > 33 ? WL : ST[0]); roofUp(x - 2, x + 2, -8, 1, 39, 3, SL, SL2, false); }
    up.box(-8, 0, 2, 8, 15, 8, (x, y, z) => Math.abs(x) < 4 && y < 11 ? (z > 4 ? -1 : 0x3a2a20) : st(x, y, z)); roofUp(-8, 8, 2, 8, 16, 8, SL, SL2, false); up.box(-1, 18, 9, 1, 21, 9, VX.glow(0xffd080));
    for (const [x, c] of [[-30, 0x3a7a5a], [-14, 0xa83a48], [14, 0x3a5a9a], [30, 0x3a7a5a]]) up.box(x - 2, 10, 3, x + 2, 22, 3, (X, y) => y < 12 && Math.abs(X - x) > 1 ? -1 : c);
    up.box(-8, 28, -26, 8, 66, -10, (x, y, z) => { const e = Math.abs(x) === 8 || z === -26 || z === -10; if (!e) return y === 66 ? ST[1] : -1; if (y > 54 && y < 64 && Math.abs(x) < 6 && (z === -10 || z === -26)) return -1; if (y > 54 && y < 64 && z < -12 && z > -24 && Math.abs(x) === 8) return -1; return y === 53 || y === 66 ? ST[2] : st(x, y, z); });
    up.ell(0, 46, -9, 4, 4, 1, 0xf4e8c8); up.box(0, 46, -8, 0, 49, -8, 0x2a2430); up.ell(0, 58, -18, 3.6, 4, 3.6, 0xd8a838); up.box(-5, 53, -23, 5, 53, -13, 0x4a3a30);
    for (let k = 0; k <= 18; k++) { const a = R(9 * (1 - k / 18)); up.box(-a, 67 + k, -18 - a, a, 67 + k, -18 + a, k % 3 === 0 ? SL2 : SL); } up.box(0, 85, -18, 0, 90, -18, 0xe0b84a); up.ell(0, 91, -18, 1, 1, 1, VX.glow(0xffe9a8));
    // the two houses, the glasshouse, the trees, the fountain's astrolabe
    for (const [s, rc, rc2] of [[-1, 0x5c6676, 0x4c5666], [1, 0xa8483a, 0x8f3a30]]) { const x0 = s < 0 ? -58 : 38; g.box(x0, 0, 14, x0 + 20, 22, 42, (x, y, z) => { const e = x === x0 || x === x0 + 20 || z === 14 || z === 42; if (!e) return y === 22 ? 0x6b4a32 : -1; if (y < 8) return st(x, y, z); const a = (x === x0 || x === x0 + 20) ? z : x, u = (a + 200) % 6; return u === 0 || y % 7 === 1 ? 0x4e3828 : u > 2 && u < 5 && y % 7 > 2 && y % 7 < 6 ? (H(a >> 2, y >> 2, 3) < 0.3 ? WL : W) : 0xe8dcc4; }); roof(x0, x0 + 20, 14, 42, 23, 14, rc, rc2, false); }
    for (let k = 0; k <= 10; k++) g.box(-64, k, 46 - R(k * 0.3), -60, k, 54, (x, y, z) => (x + z + y) % 3 === 0 ? 0xf0ece0 : 0xbfe0d8);
    const tree = (x, z, c, c2, r) => { g.box(x, 0, z, x + 1, 8, z + 1, 0x5c4432); g.ell(x, 11, z, r, r * 0.8, r, (X, y, Z) => H(X, y, Z) < 0.4 ? c : c2); };
    tree(-30, 12, 0xf0c4de, 0xe2a8ca, 7); for (const [x, z] of [[-24, 48], [24, 48], [-30, 34], [30, 30], [28, 12], [-12, 46], [14, 44]]) tree(x, z, 0x4f8f3a, 0x62a248, 5);
    g.disc(0, 26, 5, 0, 2, ST[2]); g.ell(0, 14, 26, 2, 2, 2, VX.glow(0xbff4ea)); for (let k = 0; k < 60; k++) { const a = k / 60 * TAU; g.set(R(Math.cos(a) * 6), R(14 + Math.sin(a) * 6), 26, 0xd8a838); g.set(R(Math.cos(a) * 5), R(14 + Math.sin(a) * 2), R(26 + Math.sin(a) * 4), 0xb8882a); }
    // the wall about it all, its towers, the gatehouse
    const wallc = (x, y, z) => H(x >> 1, y >> 1, z >> 1) < 0.35 ? 0x8d857b : 0x9c948a;
    for (const s of [-1, 1]) { g.box(s * 66 - 1, 0, -46, s * 66 + 1, 8, 58, (x, y, z) => y > 6 && (z & 3) > 1 ? -1 : wallc(x, y, z)); for (const z of [-46, 58]) { g.disc(s * 66, z, 6, 0, 18, (x, y, zz) => Math.hypot(x - s * 66, zz - z) < 4.4 && y < 17 ? -1 : y > 16 && ((x + zz) & 3) > 1 ? -1 : wallc(x, y, zz)); for (let k = 0; k <= 10; k++) g.disc(s * 66, z, 6.6 * (1 - k / 11), 19 + k, 19 + k, SL2); } }
    g.box(-66, 0, -47, 66, 8, -45, (x, y, z) => y > 6 && (x & 3) > 1 ? -1 : wallc(x, y, z)); g.box(-66, 0, 57, 66, 8, 59, (x, y, z) => Math.abs(x) < 6 ? -1 : y > 6 && (x & 3) > 1 ? -1 : wallc(x, y, z));
    for (const s of [-1, 1]) { g.disc(s * 11, 58, 6, 0, 24, (x, y, z) => Math.hypot(x - s * 11, z - 58) < 4.4 && y < 23 ? -1 : wallc(x, y, z)); for (let k = 0; k <= 13; k++) g.disc(s * 11, 58, 6.8 * (1 - k / 14), 25 + k, 25 + k, SL2); }
    g.box(-6, 10, 56, 6, 16, 60, (x, y, z) => y < 13 && Math.hypot(x, y - 8) < 6 ? -1 : y > 14 && (x & 3) > 1 ? -1 : wallc(x, y, z)); for (let x = -5; x <= 5; x += 2) g.box(x, 0, 58, x, 10, 58, 0x2a2a30);
    g.ell(0, 9, 57, 2, 2.4, 2, 0xd8a838);
    return g;
  }
  /* ... and the hill it stands on: a flat top 60 m across, 20 m up, a road winding to the gate from the town's side (-x) */
  function academyHill() {
    const g = grid(), Rr = 69, Hh = 18, FL = 47, path = [[-69, 0], [-64, -12], [-59, 10], [-54, -9], [-47, 0], [-34, 0]];
    const near = (x, z) => { let b = 99; for (let i = 0; i + 1 < path.length; i++) { const [x0, z0] = path[i], [x1, z1] = path[i + 1], dx = x1 - x0, dz = z1 - z0, t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / (dx * dx + dz * dz))); b = Math.min(b, Math.hypot(x - x0 - dx * t, z - z0 - dz * t)); } return b; };
    for (let x = -Rr; x <= Rr; x++) for (let z = -Rr; z <= Rr; z++) {
      const d = Math.hypot(x, z); if (d > Rr) continue;
      const top = R(d < FL ? Hh : Hh * (Math.cos((d - FL) / (Rr - FL) * Math.PI) * 0.5 + 0.5) * (0.92 + H(x >> 2, 3, z >> 2) * 0.16)), rd = near(x, z);
      for (let y = Math.max(0, top - 3); y <= top; y++) g.set(x, y, z, y === top ? (rd < 1.6 ? (H(x, 1, z) < 0.4 ? 0xc8ac80 : 0xbc9e74) : d < FL ? (H(x >> 1, 2, z >> 1) < 0.5 ? 0x74ae54 : 0x6aa64e) : H(x >> 2, y >> 1, z >> 2) < 0.5 ? 0x6aa64e : 0x5f9a45) : top > 4 && H(x >> 1, y, z >> 1) < 0.12 ? 0x8d857b : 0x4f8a3a);
    }
    return g;
  }
  /* Thistlewick's walls: eighteen metres of pale stone, taller than every roof (9.6 cm voxels). A length of them, L voxels along x, the
     outer face at -z: a battered foot, a buttress, two string courses, loops, corbels carrying a battlemented walk */
  function greatWall(L, seed) {
    const g = grid(), Hh = 188, D = 26, B = PAL.STONE, st = (u, y, s2) => stoneAt(u + 300, y, s2);
    g.inside = (x, y, z) => y < 0 || (z > 0 && z < D && y < 166);
    const mid = L >> 1;
    for (let x = 0; x < L; x++) for (let y = 0; y < 167; y++) {
      const foot = y < 36 ? Math.ceil((36 - y) / 8) : 0, bt = Math.abs(x - mid) <= 8 && y < 126 ? (y > 114 ? R((126 - y) / 3) : 6) : 0, cs = y === 70 || y === 71 || y === 140 || y === 141 ? 1 : 0;
      const o = Math.max(foot, bt, cs), loop = y > 88 && y < 104 && [mid - 34, mid + 34].some(q => Math.abs(x - q) < (y > 94 && y < 98 ? 3 : 1));
      for (let k = 0; k <= o; k++) if (k === o || x === mid - 8 || x === mid + 8 || k === foot) g.set(x, y, -k, loop && !bt ? 0x1a1820 : cs && o === 1 ? PAL.STONE3 : st(bt && bt === o ? x + 37 : x, y, seed));
      if (o && (y === 114 || y === 125 || foot)) for (let k = 0; k < o; k++) g.set(x, y, -k, PAL.STONE2);
      const ib = Math.abs(x - mid) <= 7 && y < 120 ? 4 : 0, ivy = H(x >> 4, seed, 5) < 0.3 && y < 30 + H(x, seed, 6) * 46 && H(x >> 1, y >> 1, seed) < 0.72;
      for (let k = 0; k <= ib + (ivy ? 1 : 0); k++) if (k === ib + (ivy ? 1 : 0) || Math.abs(x - mid) === 7) g.set(x, y, D + k, ivy ? (H(x, y, 8) < 0.5 ? 0x4f7f3a : 0x5f9246) : cs ? PAL.STONE3 : st(x + 111, y, seed + 9));
      if (ib) for (let k = 0; k < ib; k++) if (y === 119) g.set(x, y, D + k, PAL.STONE3);
    }
    for (let x = 0; x < L; x++) {
      for (let z = -4; z <= D + 1; z++) g.set(x, 166, z, z > 0 && z < D ? (x % 9 === 0 ? PAL.MORTAR : PAL.STONE5) : PAL.STONE3);
      if (x % 8 < 4) for (let k = 0; k < 4; k++) g.box(x, 158 + k * 2, -1 - k, x, 159 + k * 2, -1, PAL.STONE2);
      for (let y = 167; y <= 188; y++) { const gap = y > 176 && x % 22 > 13; if (gap) continue; for (const z of [-4, -2]) g.set(x, y, z, y === 188 || y === 176 && x % 22 > 13 ? PAL.STONE3 : st(x, y, seed + 4)); g.set(x, y, -3, PAL.STONE3); }
      for (let y = 167; y <= 173; y++) for (const z of [D, D + 1]) g.set(x, y, z, y === 173 ? PAL.STONE3 : st(x, y, seed + 5));
    }
    return g;
  }
  function wallTower() {                                 // a square tower of them: 7 m across, 23 m to its battlements, a steep slate cap and a weathervane
    const g = grid(), W = 36, Hh = 236;
    g.inside = (x, y, z) => y < 0 || Math.abs(x) < W && Math.abs(z) < W && y < Hh;
    const side = (a, y, k) => { const q = Math.abs(a), w = (y > 92 && y < 112 || y > 156 && y < 176) && q < 3, wf = (y > 90 && y < 114 || y > 154 && y < 178) && q < 5; return w ? (y > 160 ? VX.glow(0xffd890) : 0x1a1820) : wf ? PAL.STONE3 : y === 70 || y === 71 || y === 140 || y === 141 || y === 196 ? PAL.STONE3 : q > W - 9 && Math.floor(y / 8) % 2 ? PAL.STONE3 : stoneAt(a + 300, y, 5 + k); };
    for (let y = 0; y <= Hh; y++) for (let a = -W; a <= W; a++) { g.set(a, y, -W, side(a, y, 0)); g.set(a, y, W, side(a, y, 1)); g.set(-W, y, a, side(a, y, 2)); g.set(W, y, a, side(a, y, 3)); }
    for (let k = 1; k <= 4; k++) for (const s2 of [-1, 1]) { const h = 42 - k * 9; g.box(-W - k, 0, s2 * (W + k), W + k, h, s2 * (W + k), (x, y) => y === h ? PAL.STONE3 : stoneAt(x + 300, y, 5)); g.box(s2 * (W + k), 0, -W - k, s2 * (W + k), h, W + k, (x, y, z) => y === h ? PAL.STONE3 : stoneAt(z + 300, y, 6)); }
    for (let i = -W; i <= W; i += 8) for (let k = 0; k < 4; k++) for (const s2 of [-1, 1]) { g.box(i, 212 + k * 2, s2 * (W + k), i + 3, 213 + k * 2, s2 * (W + 1 + k), PAL.STONE2); g.box(s2 * (W + k), 212 + k * 2, i, s2 * (W + 1 + k), 213 + k * 2, i + 3, PAL.STONE2); }
    const C = W + 4; g.box(-C, 220, -C, C, 221, C, (x, y, z) => Math.abs(x) < C - 8 && Math.abs(z) < C - 8 ? -1 : PAL.STONE5);
    for (let a2 = -C; a2 <= C; a2++) for (let y = 222; y <= 242; y++) { if (y > 232 && (a2 + 220) % 20 > 12) continue; const c = y === 242 ? PAL.STONE3 : stoneAt(a2 + 300, y, 7); for (const s2 of [-1, 1]) { g.set(a2, y, s2 * C, c); g.set(s2 * C, y, a2, c); g.set(a2, y, s2 * (C - 1), c); g.set(s2 * (C - 1), y, a2, c); } }
    for (let k = 0; k <= 74; k += 2) { const r = R((W - 1) * (1 - k / 76)), c = k % 6 === 0 ? 0x3e475c : k % 4 === 0 ? 0x566180 : 0x4c5670; g.box(-r, 224 + k, -r, r, 225 + k, r, (x, y, z) => Math.abs(x) > r - 3 || Math.abs(z) > r - 3 ? c : -1); }
    g.box(0, 298, 0, 0, 316, 0, PAL.IRON); g.box(1, 308, 0, 10, 314, 0, (x, y) => Math.abs(y - 311) > (10 - x) * 0.4 + 1 ? -1 : 0x2f5fbf);
    return g;
  }
  function gateHigh() {                                  // the block over a gatehouse's arch (its own foot at 9.1 m): three lit windows, a thistle banner, corbels and battlements
    const g = grid(), X = 54, Z = 18, Hh = 92;
    g.inside = (x, y, z) => Math.abs(x) < X && Math.abs(z) < Z && y < Hh;
    for (let x = -X; x <= X; x++) for (let y = 0; y <= Hh; y++) for (const z of [-Z, Z]) {
      const w = [-32, 0, 32].some(q => { const dx = Math.abs(x - q); return dx < 6 && y > 40 && (y < 62 || Math.hypot(dx, y - 62) < 6) && (dx > 4 || y < 43 ? 1 : 1); }), wi = [-32, 0, 32].some(q => Math.abs(x - q) < 4 && y > 42 && y < 62);
      g.set(x, y, z, wi && Math.abs(x) > 20 ? (x % 4 === 0 || y % 7 === 0 ? PAL.LEAD : VX.glow(0xffdc9a)) : w && Math.abs(x) > 20 ? PAL.STONE3 : y === 20 || y === 21 || y === 80 ? PAL.STONE3 : stoneAt(x + 300, y, 8));
    }
    for (let y = 0; y <= Hh; y++) for (let z = -Z; z <= Z; z++) for (const x of [-X, X]) g.set(x, y, z, stoneAt(z + 200, y, 9));
    for (const s of [-1, 1]) { g.box(-12, 24, s * (Z + 1), 12, 74, s * (Z + 1), (x, y) => y < 32 && Math.abs(x) > (y - 24) * 1.5 ? -1 : Math.abs(x) > 10 || y > 72 ? 0xe0b84a : Math.abs(x) < 5 && y > 56 && y < 68 && Math.hypot(x / 5, (y - 60) / 8) < 1 ? 0xb06ab8 : Math.abs(x) < 6 && y > 48 && y <= 56 && Math.abs(x) < 7 - Math.abs(y - 52) ? 0x4f8f4a : x === 0 && y > 36 && y < 50 || Math.abs(Math.abs(x) - (y - 38)) < 1.2 && y > 38 && y < 46 ? 0x4f8f4a : 0x2a4a9a); for (let x = -X; x <= X; x += 8) for (let k = 0; k < 4; k++) g.box(x, Hh - 8 + k * 2, s * (Z + k), x + 3, Hh - 7 + k * 2, s * (Z + 1 + k), PAL.STONE2); }
    g.box(-X - 1, Hh, -Z - 4, X + 1, Hh + 1, Z + 4, PAL.STONE3);
    for (let x = -X - 1; x <= X + 1; x++) for (const s of [-1, 1]) for (let y = Hh + 2; y <= Hh + 20; y++) { if (y > Hh + 11 && (x + 220) % 20 > 12) continue; for (const k of [3, 4]) g.set(x, y, s * (Z + k), y === Hh + 20 ? PAL.STONE3 : stoneAt(x + 300, y, 6)); }
    return g;
  }
  function roadSign() { const g = new VX.Grid(); g.jit = 0; g.box(-1, 0, -1, 1, 86, 1, PAL.WOOD2); g.box(0, 64, 2, 40, 76, 3, (x, y) => x > 34 && Math.abs(y - 70) > (40 - x) ? -1 : y === 64 || y === 76 ? PAL.WOOD2 : x > 5 && x < 34 && (y === 72 || y === 68) && x % 5 !== 0 ? 0x2a1c14 : PAL.WOOD3); g.ell(0, 88, 0, 2, 2, 2, PAL.WOOD2); g.box(2, 78, 2, 4, 82, 3, VX.glow(0xffd080)); g.box(3, 83, 2, 3, 84, 3, VX.glow(0xfff0c0)); return g; }
  function hillGrid(r, h, seed) {
    const g = grid();
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
      const d = Math.hypot(x, z) / r; if (d > 1) continue;
      const top = R(h * (Math.cos(d * Math.PI) * 0.5 + 0.5) * (0.9 + H(x >> 3, seed, z >> 3) * 0.2));
      for (let y = Math.max(0, top - 2); y <= top; y++) g.set(x, y, z, y === top ? (H(x >> 2, y >> 1, z >> 2) < 0.5 ? 0x6aa64e : 0x5f9a45) : 0x4f8a3a);
    }
    return g;
  }
  function mountainGrid(seed) {
    const g = grid(), Rr = 16, Hh = 18 + (seed % 3) * 4;
    for (let x = -Rr; x <= Rr; x++) for (let z = -Rr; z <= Rr; z++) {
      const d = Math.hypot(x, z) / Rr; if (d > 1) continue;
      const top = R(Hh * Math.pow(1 - d, 1.2) * (0.8 + H(x >> 1, seed, z >> 1) * 0.35));
      for (let y = Math.max(0, top - 2); y <= top; y++) g.set(x, y, z, y > Hh * 0.62 ? 0xeef2f8 : (y > Hh * 0.45 && H(x >> 1, y >> 1, z >> 1) < 0.5 ? 0xd8e0ea : (H(x >> 2, y >> 2, z >> 2) < 0.5 ? 0x7a88a8 : 0x6a7898)));
    }
    return g;
  }
  function cloudGrid(seed) {
    const g = grid();
    for (let i = 0; i < 6; i++) { const x = (H(i, seed, 1) - 0.5) * 24, z = (H(i, seed, 2) - 0.5) * 12, r = 6 + H(i, seed, 3) * 6; g.ell(x, H(i, seed, 4) * 3, z, r, 3, r * 0.7, (xx, y) => y < 0 ? 0xe6eefc : 0xffffff); }
    return g;
  }

  /* the same thing at twice the voxel, for when it's far off: a cell is there if any two of its eight are, in their commonest colour */
  function coarsen(g) {
    const cells = new Map(), o = grid();
    g.each((x, y, z, v) => { const k = Math.floor(x / 2) + ',' + Math.floor(y / 2) + ',' + Math.floor(z / 2); let c = cells.get(k); if (!c) cells.set(k, c = []); c.push(v); });
    for (const [k, c] of cells) { if (c.length < 2) continue; const [x, y, z] = k.split(',').map(Number); let best = c[0], bn = 0; for (const v of c) { const n = c.filter(w => w === v).length; if (n > bn) { bn = n; best = v; } } o.set(x, y, z, best); }
    return o;
  }

  /* ------------------------------------------------------------- town -- */
  class Town {
    constructor(scene) {
      this.scene = scene; this.walk = WALK; this.colliders = []; this.seats = []; this.clouds = []; this.named = {}; this.houses = [];
      this.groundSize = GROUND; this.farColor = 0x6aa64e;
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND, GROUND), new THREE.MeshLambertMaterial({ map: groundTexture() }));
      ground.rotation.x = -HP; scene.add(ground);
      this.core = coreGround();
      const kinds = {};
      // (everything sits on the 2.4 cm lattice, its lowest row on the ground, so the grain lines up with the voxels)
      const kind = (name, make, s) => {
        if (kinds[name]) return;
        const g = make(); kinds[name] = VX.meshGrid(g, s, { offset: s === S1 ? [-0.5, -0.5, -0.5] : [0, -0.5, 0] });
        if (s === S1 && kinds[name].lit.index.count / 6 > 1800) kinds[name + '~'] = VX.meshGrid(coarsen(g), S1 * 2, { offset: [-0.5, -0.5, -0.5] });
      };
      const place = (name, x, z, ry, sc, opts) => {
        const m = VX.meshPair(kinds[name], null, {});
        m.position.set(x, (opts && opts.y) || 0, z); m.rotation.y = ry || 0; if (sc) m.scale.setScalar(sc);
        if (opts && opts.name) m.userData.bake = opts.name;
        if (opts && opts.noCast) m.userData.noCast = true;
        if (opts && opts.near) m.userData.near = true;              // a little thing: only drawn close by
        scene.add(m);
        if (kinds[name + '~']) { m.userData.lod = 'n'; const f = VX.meshPair(kinds[name + '~'], null, {}); f.position.copy(m.position); f.rotation.y = m.rotation.y; f.userData = { noCast: true, near: m.userData.near, lod: 'f' }; scene.add(f); }
        return m;
      };
      const col = (x, z, r) => this.colliders.push([x, z, r]);

      /* the houses round the square and along the streets: [name, cx, cz, facing, options]. facing is the yaw that
         turns a house's front (+z) to its street; W and D in quarter metres */
      const S = HP, N = 0, E = -HP, Wd = HP;
      const HOUSES = [
        ['inn', -7.5, -14.5, N, { W: 36, D: 36, floors: 3, plaster: 0xeee4cc, roof: 'tile', shutter: 0x3f6a4a, door: 0, sign: 'tankard' }],
        ['bakery', 0.5, -14, N, { W: 28, D: 32, floors: 2, plaster: 0xf0dca0, roof: 'slate', shutter: 0x4a6aa0, shop: 'bread', awning: 0x3f9a5a, door: 8, sign: 'bread' }],
        ['n3', 8, -14, N, { W: 32, D: 32, floors: 3, plaster: 0xecc8c0, roof: 'tile', shutter: 0x6a4a8a, door: -6 }],
        ['w1', -16.5, -7.75, Wd, { W: 18, D: 36, floors: 3, plaster: 0xc8d0dc, roof: 'slate', shutter: 0x8a3a3a, door: 0, sides: 'L' }],
        ['w2', -16.5, 0.25, Wd, { W: 30, D: 36, floors: 3, plaster: 0xeee4cc, roof: 'tile', shutter: 0x3f6a4a, door: 4, sides: 'R' }],
        ['tailor', -16.5, 7, Wd, { W: 24, D: 36, floors: 2, plaster: 0xe0d0e8, roof: 'thatch', shutter: 0x4a6aa0, shop: 'cloth', awning: 0x8a4ab8, door: -7, sign: 'spool' }],
        ['smith', 16, -6.5, E, { W: 28, D: 32, floors: 2, plaster: 0xd8ccb8, roof: 'slate', shutter: 0x5a5a5a, forge: true, sign: 'anvil', sides: 'R' }],
        ['store', 16, 6.5, E, { W: 28, D: 32, floors: 2, plaster: 0xd8e8d0, roof: 'tile', shutter: 0x8a3a3a, shop: 'store', awning: 0x2f5fbf, door: 7, sign: 'bottle', sides: 'L' }],
        ['e1', 24, -6.5, N, { W: 32, D: 28, floors: 2, plaster: 0xf0dca0, roof: 'thatch', shutter: 0x3f6a4a, door: 3 }],
        ['e2', 24, 6.5, S + HP, { W: 32, D: 28, floors: 2, plaster: 0xeee4cc, roof: 'tile', shutter: 0x6a4a8a, door: -4 }],
        ['s1', -7.5, 14.5, Math.PI, { W: 36, D: 36, floors: 2, plaster: 0xecc8c0, roof: 'slate', shutter: 0x3f6a4a, door: 5, sides: 'L' }],
        ['s2', 7.5, 14.5, Math.PI, { W: 36, D: 36, floors: 3, plaster: 0xc8d0dc, roof: 'tile', shutter: 0x8a3a3a, door: -3, sides: 'R' }],
        ['s3', -7, 24.5, Wd, { W: 44, D: 32, floors: 2, plaster: 0xeee4cc, roof: 'thatch', shutter: 0x4a6aa0, door: 6 }],
        ['s4', 7, 24.5, E, { W: 44, D: 32, floors: 2, plaster: 0xf0dca0, roof: 'tile', shutter: 0x3f6a4a, door: -8 }],
        ['b1', -16.5, -15, N, { W: 36, D: 20, floors: 2, plaster: 0xe0d0c0, roof: 'tile', door: 0, plain: true }],
        ['b2', 16, -14.5, N, { W: 32, D: 32, floors: 2, plaster: 0xeee4cc, roof: 'slate', door: 0, plain: true }],
        ['b3', 24, -14.5, N, { W: 32, D: 32, floors: 3, plaster: 0xd8e8d0, roof: 'tile', door: 0, plain: true }],
        ['wb', -24, -4.5, Wd, { W: 16, D: 24, floors: 3, plaster: 0xb8b0a4, roof: 'slate', shutter: 0x4a4a4a, noDoor: true }],   // closes the alley
      ];
      ['tankard', 'bread', 'anvil', 'spool', 'bottle'].forEach(i => kind('sign_' + i, () => T.sign(i), S1));
      HOUSES.forEach(([nm, cx, cz, ry, o], i) => {
        o.seed = i * 7 + 3;
        kind('house_' + nm, () => houseGrid(o), SB);
        place('house_' + nm, cx, cz, ry, 1, { name: 'house_' + i });
        if (!o.forge) { kinds['shadow_' + nm] = VX.meshGrid(houseShadowGrid(o), 0.246, { offset: [-0.5, 0, -0.5] }); place('shadow_' + nm, cx, cz, ry, 1, { name: 'shadow_' + i }); }
        this.houses.push([cx, cz, ry, o.W * 0.25, o.D * 0.25, o.floors * 2.976, o.forge ? 2.9 : 0]);
        const fx = Math.sin(ry), fz = Math.cos(ry), rx = Math.cos(ry), rz = -Math.sin(ry);
        if (o.sign) {                                  // its sign hangs out over the street, by the door
          const along = ((o.door || 0) + 6) * 0.25, out = o.D / 2 * 0.25 + 0.31;
          place('sign_' + o.sign, cx + fx * out + rx * along, cz + fz * out + rz * along, ry, 1, { y: 3.1 });
        }
        if (o.shop) {                                  // what's set out on its counter
          kind('display_' + o.shop, () => T.display(o.shop), S1);
          const dc = (o.door || 0) * 0.25, w2 = o.W * 0.125, sp = dc > 0 ? [-w2 + 0.4, dc - 0.9] : [dc + 0.9, w2 - 0.4], along = (sp[0] + sp[1]) / 2, out = o.D / 2 * 0.25 + 0.03;
          place('display_' + o.shop, cx + fx * out + rx * along, cz + fz * out + rz * along, ry, 1, { y: 19 * SB, noCast: true, near: true });
        }
      });
      kind('chapel', chapelGrid, CB); place('chapel', 1, -30, Math.PI, 1, { noCast: true });
      kind('wall', wallGrid, SB); kind('gatehouse', gatehouseGrid, SB);
      place('gatehouse', 0, 32.2, 0);
      // the walls, all round: a gatehouse to the south and one to the east, towers at their sides and at the corners
      kind('wtower', wallTower, CB); kind('gatehigh', gateHigh, CB);
      place('gatehouse', 32.24, 0, HP); place('gatehigh', 0, 32.2, 0, 1, { y: 8.7, noCast: true }); place('gatehigh', 32.24, 0, HP, 1, { y: 8.7, noCast: true });
      const E0 = 32.24, N0 = -41.36, PL = 95, P = PL * CB;
      for (const [x, z] of [[-8.6, 32.24], [8.6, 32.24], [E0, -8.6], [E0, 8.6], [E0, 32.24], [-E0, 32.24], [-E0, N0], [E0, N0], [-E0, -4.5], [0, N0]]) place('wtower', x, z, 0, 1, { noCast: true });
      for (const k of [0, 1]) kind('gw' + k, () => greatWall(PL, 3 + k * 4), CB);
      const span = (x0, z0, x1, z1) => {                    // from one tower to the next (the outer face to the left of the way one goes); what's over runs into them
        const dx = x1 - x0, dz = z1 - z0, D = Math.hypot(dx, dz), ux = dx / D, uz = dz / D, n = Math.ceil((D - 5.4) / P - 0.02), ry = Math.atan2(-uz, ux);
        for (let i = 0; i < n; i++) { const t = (D - n * P) / 2 + P * i; place('gw' + (i % 2), x0 + ux * t - Math.sin(ry) * 1.25, z0 + uz * t - Math.cos(ry) * 1.25, ry, 1, { noCast: true }); }
      };
      span(-E0, N0, 0, N0); span(0, N0, E0, N0); span(E0, N0, E0, -8.6); span(E0, 8.6, E0, 32.24); span(E0, 32.24, 8.6, 32.24); span(-8.6, 32.24, -E0, 32.24); span(-E0, 32.24, -E0, -4.5); span(-E0, -4.5, -E0, N0);
      kind('roadsign', roadSign, S1); place('roadsign', 38.4, -2.7, 0.25);
      kind('haycart', T.cart, S1); place('haycart', 0.3, 32.4, 0.08); kind('hayload', () => T.hay(15, 17, 28, 3), SB); place('hayload', 0.3, 32.4, 0.08, 1, { y: 0.64 });

      /* the square: the fountain, stalls, benches, the well, trees, the forge's things, barrels and crates, bunting overhead */
      kind('fountain', T.fountain, SB); place('fountain', 0, 0, 0); kind('statue', T.statue, S1); place('statue', 0, 0, 0); col(0, 0, 1.85);
      const STALLS = [['fruit', 0xc8303a, -6.5, 5.2, Math.PI], ['fish', 0x2f5fbf, 6.5, 5.2, Math.PI], ['cloth', 0x8a4ab8, -6.2, -5.6, 0], ['flowers', 0xe8c24a, 5.4, -5.6, 0], ['bread', 0x3f9a5a, 0.5, -8.4, 0]];
      for (const [goods, c, x, z, ry] of STALLS) {
        kind('stall_' + goods, () => T.stall(c), S1); place('stall_' + goods, x, z, ry);
        kind('goods_' + goods, () => T.goods(goods), S1); place('goods_' + goods, x, z, ry, 1, { noCast: true, near: true });
        const rx = Math.cos(ry), rz = -Math.sin(ry);
        col(x - rx * 0.7, z - rz * 0.7, 0.75); col(x + rx * 0.7, z + rz * 0.7, 0.75);
      }
      kind('bench', T.bench, S1);
      for (const [x, z] of [[-3.4, 3.6], [3.4, -3.6]]) {
        const ry = Math.atan2(-x, -z);
        place('bench', x, z, ry); col(x, z, 0.75);
        if (x < 0) this.seats.push({ x: x + Math.sin(ry) * 0.1, z: z + Math.cos(ry) * 0.1, yaw: ry, h: 0.5 });   // (the old man has the other)
      }
      kind('well', T.well, S1); place('well', 8.8, 8.2, 0.4); col(8.8, 8.2, 0.75);
      kind('tree', treeGrid, SB); kind('crown0', () => crownGrid(1), 0.096); kind('crown1', () => crownGrid(4), 0.096);
      place('tree', -10.4, 8.5, 0); place('crown0', -10.4, 8.5, 0.3); col(-10.4, 8.5, 0.8); place('tree', -10.4, -8.7, 0); place('crown1', -10.4, -8.7, 1.1); col(-10.4, -8.7, 0.8);
      kind('anvil', T.anvil, S1); place('anvil', 10.2, -6.5, HP); col(10.2, -6.5, 0.4);
      kind('quench', T.quench, S1); place('quench', 11.2, -8.0, HP); col(11.2, -8.0, 0.42);
      kind('grind', T.grind, S1); place('grind', 10.9, -4.6, 0.5); col(10.9, -4.6, 0.4);
      kind('barrel', T.barrel, S1); kind('crate', () => T.crate(), S1); kind('apples', () => T.crate(true), S1); kind('sacks', T.sacks, S1);
      ['eggs', 'veg', 'apples'].forEach(k => kind('basket_' + k, () => T.basket(k), S1)); ['blue', 'green', 'red'].forEach(k => kind('pot_' + k, () => T.pot(k), S1)); kind('bucket', T.bucket, S1);
      for (const [k, x, z, ry, r] of [['barrel', 11.4, -9.4, 0, 0.38], ['barrel', 10.7, -9.5, 0.4, 0.38], ['crate', -8.8, -6.6, 0.2, 0.4], ['barrel', 11.4, 9.3, 0, 0.38], ['crate', -2.6, -9.3, 0.5, 0.4], ['barrel', 2.5, 9.6, 0, 0.38], ['apples', -8.7, 5.7, 0.3, 0.4],
        ['sacks', 11.4, 8.3, -HP, 0.42], ['basket_eggs', -1.5, -9.1, 0.4, 0.26], ['basket_veg', -4.5, 6.1, 1, 0.26], ['basket_apples', 8.4, 5.9, 0, 0.26], ['bucket', 9.75, 7.5, 0.7, 0.2]]) { place(k, x, z, ry, 1, { near: r < 0.3 }); col(x, z, r); }
      for (const [k, x, z] of [['pot_blue', -8.6, -9.72], ['pot_red', -6.4, -9.72], ['pot_green', 5.6, -9.72], ['pot_blue', 7.1, 9.72], ['pot_red', -10.1, 9.72], ['pot_green', -11.72, 2.2]]) { place(k, x, z, 0, 1, { near: true }); col(x, z, 0.2); }
      kind('post', T.post, S1);
      for (const [x, z, ry] of [[-11.4, 1.6, 0], [11.4, -1.6, Math.PI], [-2.5, 20, HP], [2.5, 27, -HP]]) { place('post', x, z, ry); col(x, z, 0.2); }
      kind('bunting1', () => buntingGrid(482), SB); kind('bunting2', () => buntingGrid(408), SB);
      for (const [k, x, z, ry, len, y] of [['bunting1', -11.6, -2, 0.18, 23.2, 6.2], ['bunting2', -9.4, 9.6, -0.33, 19.6, 5.6], ['bunting2', -9.4, -9.4, 0.3, 19.6, 6.0]])
        place(k, x + Math.cos(ry) * len / 2, z - Math.sin(ry) * len / 2, ry, 1, { y, noCast: true });
      kind('logs', T.woodpile, S1); place('logs', 2.35, 15.5, HP); col(2.4, 15.0, 0.5); col(2.4, 16.2, 0.5); col(2.35, 14.35, 0.3);
      kind('bale', T.bale, S1);
      for (const [x, z, ry, y] of [[-2.2, 29.2, 0.1, 0], [-2.15, 28.55, 0.02, 0], [-2.2, 28.9, 0.2, 0.53], [2.2, 28.8, -0.2, 0], [2.3, 28.75, 1.5, 0.53]]) place('bale', x, z, ry, 1, { y });
      col(-2.2, 28.9, 0.7); col(2.2, 28.8, 0.6);

      /* the alley: dark and narrow, a room built across it overhead, washing, crates and barrels along it, and at its
         end, the door in the ground, a black cat keeping watch */
      kind('bridge', bridgeGrid, SB); place('bridge', -15.6, -4.5, HP, 1, { y: 3.4 });
      for (const [i, x, y] of [[0, -13.5, 5.0], [1, -17.6, 5.6], [3, -19.4, 4.4]]) { kind('laundry' + i, () => T.laundry(83, i), S1); place('laundry' + i, x, -3.5, HP, 1, { y }); }
      for (const [k, x, z, ry] of [['crate', -14.2, -5.1, 0.1], ['barrel', -15.0, -3.85, 0], ['barrel', -17.6, -5.15, 0], ['crate', -20.2, -5.1, 0.3], ['crate', -20.25, -3.85, -0.2]]) { place(k, x, z, ry); col(x, z, 0.36); }
      kind('door_frame', T.doorFrame, S1); kind('door_leaf', T.doorLeaf, S1);
      this.door = { x: -18.9, z: -4.5 };
      place('door_frame', this.door.x, this.door.z, HP, 1, { y: 0.004, noCast: true });
      place('door_leaf', this.door.x - 0.4, this.door.z, HP, 1, { y: 0.05, name: 'door_leaf' });
      kind('cat', T.cat, S1); kind('cat_head', T.catHead, S1);
      place('cat', -20.2, -5.1, 0.9, 1, { y: 0.672, name: 'cat' });
      place('cat_head', -20.2 + Math.sin(0.9) * 0.05, -5.1 + Math.cos(0.9) * 0.05, 0.9, 1, { y: 0.672 + 0.29, name: 'cat_head' });

      /* chickens, a little flock by the south street */
      kind('hen_w', () => T.hen(0xf1ece2), S1); kind('hen_b', () => T.hen(0xa8683a), S1);
      this.chickens = 5;
      for (let i = 0; i < 5; i++) place(i % 2 ? 'hen_b' : 'hen_w', -1.6 + (i % 3) * 1.4, 18 + i * 1.3, rnd() * TAU, 1, { name: 'hen_' + i });

      /* beyond the town: the windmill, woods, hills, far mountains, clouds */
      kind('windmill', windmillGrid, WM); place('windmill', 48, -9, -HP, 1, { noCast: true });
      kind('sails', sailsGrid, WM); place('sails', 44.6, -9, -HP, 1, { noCast: true, y: 11.2, name: 'sails' });
      this.sails = { x: 44.6, y: 11.2, z: -9 };
      for (let i = 0; i < 3; i++) kind('ftree' + i, () => forestTreeGrid(i * 5), 0.24);
      for (let i = 0; i < 66; i++) {
        const a = rnd() * TAU, r = 44 + rnd() * 30, x = Math.sin(a) * r, z = Math.cos(a) * r;
        if (x > 28 && Math.abs(z) < 5 || Math.hypot(x - 48, z + 9) < 9 || (x > 28 && Math.abs(z) < (x - 20) * 0.42) || (x > -38 && x < 37 && z > -47 && z < 37)) continue;      // (and clear of the view of the Academy)
        if (Math.abs(x) < 5 && z > 30) continue;
        place('ftree' + (i % 3), x, z, Math.floor(rnd() * 4) * HP, 0.8 + rnd() * 0.6, { noCast: true });
      }
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * TAU + 0.3, r = 95 + (i % 3) * 18;
        if (i === 2) continue;                              // (the Academy's hill, due east, has its place)
        kind('hill' + (i % 4), () => hillGrid(27 + (i % 4) * 6, R((7 + (i % 3) * 3) * 1.5), i % 4), 1.3);
        place('hill' + (i % 4), Math.sin(a) * r, Math.cos(a) * r, a, 1, { noCast: true });
      }
      kind('achill', academyHill, 1.0); place('achill', 142, 0, 0, 1, { noCast: true });
      kind('acfar', farAcademy, 0.5); place('acfar', 138, 0, -HP, 1, { noCast: true, y: 18.4 });
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU + 0.15, r = 230 + (i % 3) * 30;
        kind('mtn' + (i % 4), () => mountainGrid(i % 4), 4.0);
        place('mtn' + (i % 4), Math.sin(a) * r, Math.cos(a) * r, a * 3, 1 + (i % 2) * 0.3, { noCast: true });
      }
      for (let i = 0; i < 4; i++) kind('cloud' + i, () => cloudGrid(i), 1.1);
      for (let i = 0; i < 12; i++) {
        const m = place('cloud' + (i % 4), (rnd() - 0.5) * 360, (rnd() - 0.5) * 360, rnd() * TAU, 1, { noCast: true, y: 55 + rnd() * 30 });
        this.clouds.push(m);
      }

      /* the townsfolk: how each looks, their job, where they work or the way they walk, what they say */
      const C = { red: 0xb83a3a, blue: 0x3a5a9a, green: 0x4a7a4a, brown: 0x7a5a3a, cream: 0xe8dcc0, grey: 0x7a7a82, navy: 0x2a3a5a, plum: 0x6a3a6a, ochre: 0xc8963a, white: 0xf1ece2, leather: 0x6a4a32 };
      const RING = (r, n, a0) => Array.from({ length: n }, (_, i) => { const a = a0 + i / n * TAU; return [Math.sin(a) * r, Math.cos(a) * r, 0]; });
      this.npcs = [
        { look: { skin: 0, hair: 'chestnut', style: 'bun', shirt: C.ochre, dress: 0xa86a3a, apron: C.white, hat: 'kerchief', hatColor: C.white, lips: true, blush: true, rolled: true },
          job: 'knead', at: [0.5, -9.3, 0], lines: ['Fresh loaves! Still warm from the oven!', 'Mind the flour, dear.', 'The honey buns go first. Always.'] },
        { look: { kid: true, skin: 1, hair: 'blond', shirt: 0x5a8a4a, legs: 0x6a4a32, hat: 'cap', hatColor: 0x8a5a32, tray: true },
          job: 'tray', route: [[2.2, -7.4, 1.2], [-3.5, -7.6, 0], [-6.5, -8.6, 0.6], [-9.3, -3.5, 0], [-7.5, 3.6, 1.0], [0, 6.3, 0], [6.5, 3.6, 1.0], [8.5, -1.5, 0], [8.8, -7.6, 0], [2.2, -7.4, 3]], lines: ['Coming through! Hot bread!', 'Mum says no samples.'] },
        { look: { big: true, skin: 2, bald: true, hair: 'brown', beard: true, shirt: 0x8a7a6a, legs: 0x3a3a3a, apron: C.leather, rolled: true, right: 'hammer', left: 'tongs' },
          job: 'hammer', at: [10.83, -6.5, -HP], lines: ['Careful. The forge bites.', 'A blade mended by morning, if you like.', 'Good iron sings. Hear that?'] },
        { look: { h: 1, skin: 1, hair: 'red', style: 'braid', shirt: 0xe8dcc0, dress: 0x5a8a4a, hat: 'straw', lips: true, blush: true, apron: 0xd8c8a8 },
          job: 'hawk', at: [-6.5, 6.1, Math.PI], lines: ['Apples from the eastern orchards! Two for a copper!', 'Pears! Sweet as anything!'], call: true },
        { look: { h: 1, skin: 3, hair: 'black', beard: true, shirt: 0xd8d0c0, vest: C.navy, legs: 0x4a4a5a, hat: 'cap', hatColor: 0x3a4a6a, rolled: true },
          job: 'hawk', at: [6.5, 6.1, Math.PI], lines: ['Caught this morning, up the river!', 'Trout! Fat river trout!'], call: true },
        { look: { old: true, skin: 0, hair: 'grey', beard: true, shirt: C.plum, sleeve: C.plum, legs: 0x3a2a3a, hat: 'feather', hatColor: 0x4a2a4a, feather: 0xe8c24a },
          job: 'fold', at: [-6.2, -6.5, 0], lines: ['Silk from the southern road. Finest you will find.', 'That colour suits you, miss.'], call: true },
        { look: { skin: 1, hair: 'blond', style: 'long', shirt: 0xf1ece2, dress: 0xd87aa0, lips: true, blush: true, flower: true },
          job: 'hawk', at: [5.4, -6.5, 0], lines: ['A posy for the pretty magician?', 'Roses! Daisies! Lavender!'], call: true },
        { look: { h: -1, skin: 2, hair: 'brown', style: 'long', shirt: 0x7a9ac8, dress: 0x3a5a9a, left: 'basket', lips: true },
          job: 'shop', route: [[-6.5, 3.7, 4], [-0.5, 4.2, 1], [6.5, 3.7, 5], [10.5, 0.5, 1.5], [5.4, -4.0, 4], [-4, -4.2, 1], [-6.2, -4.1, 5]], lines: ['Have you tried the honey buns?', 'Prices keep going up, you know.'] },
        { look: { h: -2, skin: 0, hair: 'brown', shirt: 0xa84a3a, legs: 0x5a4a3a, vest: 0x5a3a2a, hat: 'cap', hatColor: 0x5a4a3a },
          job: 'shop', route: [[16, 0.5, 2], [9.8, -0.5, 1], [5.4, -4.0, 4], [-6.2, -4.1, 3], [-9, 1, 2], [-6.5, 3.7, 4], [6.5, 3.7, 3]], lines: ['Lovely day for it.', 'Market day is the best day.'] },
        { look: { skin: 4, hair: 'black', style: 'bun', shirt: 0xc8a04a, dress: 0x8a3a4a, left: 'basket', lips: true },
          job: 'shop', route: [[0.5, -6.7, 5], [-4, -4.6, 1], [-9.6, -1.5, 2], [-6.5, 3.7, 4], [0, 6.5, 1], [0, 14, 2], [0, 6.5, 1], [6.5, 3.7, 3]], lines: ['Excuse me, dear.', 'I only came out for bread...'] },
        { look: { h: 1, skin: 1, hair: 'brown', shirt: 0x8a8a92, sleeve: 0x8a8a92, legs: 0x4a4a52, tabard: 0x2f4f9e, hat: 'helmet', right: 'spear' },
          job: 'patrol', route: RING(6.3, 10, 0.2), slow: true, lines: ['Keep out of trouble, traveller.', 'Quiet day. I like quiet days.'] },
        { look: { big: true, skin: 3, hair: 'black', beard: true, shirt: 0x8a8a92, sleeve: 0x8a8a92, legs: 0x4a4a52, tabard: 0x2f4f9e, hat: 'helmet', right: 'spear' },
          job: 'patrol', route: [[0, 11, 1], [0.6, 22, 0.5], [0, 29, 4], [-0.6, 22, 0.5], [0, 11, 3]], slow: true, lines: ['The gate closes at dusk.', 'Mind the chickens.'] },
        { look: { kid: true, skin: 0, hair: 'red', shirt: 0xd86a4a, legs: 0x5a4a3a }, job: 'run', route: RING(3.0, 8, 0), lines: ['You can\'t catch me!', 'Do a card trick! Do a card trick!'] },
        { look: { kid: true, skin: 2, hair: 'black', style: 'braid', shirt: 0xe8dcc0, dress: 0x4a8ac8 }, job: 'run', route: RING(3.0, 8, 2.1), lines: ['Tag! You\'re it!', 'Are you a real magician?'] },
        { look: { kid: true, skin: 1, hair: 'blond', shirt: 0x6a9a5a, legs: 0x4a3a30, hat: 'cap', hatColor: 0xb83a3a }, job: 'run', route: RING(3.0, 8, 4.2), lines: ['Wait for me!', 'I saw a cat go into the alley...'] },
        { look: { h: -1, skin: 0, hair: 'chestnut', shirt: 0xa83a3a, sleeve: 0xa83a3a, legs: 0x3a3a5a, hat: 'feather', hatColor: 0x6a2a2a, feather: 0xf1ece2, lute: true },
          job: 'strum', at: [-3.9, 1.9, 0.9], lines: ['♪ ...and the travellers walked on, long after the songs were done... ♪', 'A coin for the song? Or just a smile.'] },
        { look: { big: true, skin: 1, hair: 'brown', beard: true, shirt: 0xa83a3a, legs: 0x4a4a3a, hat: 'cap', hatColor: 0x4a3a2a, rolled: true, right: 'axe' },
          job: 'chop', at: [1.55, 14.35, HP], lines: ['Winter comes. Always does.', 'Stand back a bit, eh?'] },
        { look: { skin: 1, hair: 'brown', style: 'bun', shirt: 0xe8dcc0, dress: 0x6a5a8a, apron: C.white, right: 'broom', lips: true },
          job: 'sweep', route: [[-9.4, -9.3, 0.5], [-4.6, -9.3, 0.5]], lines: ['Rooms are a silver a night. Stew included.', 'Wipe your feet if you come in!'] },
        { look: { skin: 0, hair: 'white', style: 'long', shirt: 0x2f5a4a, sleeve: 0x2f5a4a, dress: 0x2f5a4a, long: true, hat: 'witch', hatColor: 0x2a3a3a, band: 0xc8a24a, book: true, lips: true, eye: 0x3a7a5a },
          job: 'read', at: [-9.6, 7.5, -2.4], lines: ['Hm? This? A book of very small spells.', 'There is a spell for warming tea. It is my favourite.'] },
        { look: { skin: 0, hair: 'white', bald: true, beard: 'long', old: true, h: -1, shirt: 0x6a6a5a, legs: 0x4a4a42, cloak: 0x4a5a4a },
          job: 'sit', at: [3.4, -3.6, Math.atan2(-3.4, 3.6)], seat: true, lines: ['In my day the fountain had fish in it.', 'The pigeons know me. Nobody else remembers.'] },
        { look: { skin: 3, hair: 'black', style: 'long', shirt: 0xc8b8a0, dress: 0x7a6a4a, right: 'bucket', left: 'bucket', kerchief: true, hat: 'kerchief', hatColor: 0x3a6a8a },
          job: 'carry', route: [[8.7, 7.0, 3], [11.2, 4.5, 2], [16, 1.2, 1], [11.2, 4.5, 1]], lines: ['Heavy, heavy...', 'Well water is the sweetest.'] },
        { look: { big: true, skin: 2, hair: 'brown', beard: true, shirt: 0xc8b088, legs: 0x5a4a3a, hat: 'straw', sack: true },
          job: 'sack', route: [[0.8, 27, 3], [0.6, 12, 1], [-2.4, 8.6, 1], [0.6, -6.8, 4], [-2.4, 8.6, 1], [0.6, 12, 1]], lines: ['Flour for the baker. Every morning.', 'Harvest was good this year.'] },
      ];
    }
  }

  window.TOWN = Town;
  window.TOWN_KIT = { houseGrid, houseShadowGrid, treeGrid, crownGrid, forestTreeGrid, windmillGrid, hillGrid, mountainGrid, cloudGrid, coarsen, stoneAt, brickAt, PAL };
  window.TOWN_WALK = WALK;
})();
