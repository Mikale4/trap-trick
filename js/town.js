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
   Coordinates: metres, x east, z south, the fountain at the origin.
   ========================================================================== */
(function () {
  'use strict';
  const H = VX.hash3, TAU = Math.PI * 2, HP = Math.PI / 2;
  const rnd = (() => { let s = 7654321; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const shade = (c, k) => { const r = Math.min(255, ((c >> 16) & 255) * k) | 0, g = Math.min(255, ((c >> 8) & 255) * k) | 0, b = Math.min(255, (c & 255) * k) | 0; return (r << 16) | (g << 8) | b; };
  const SB = 0.25;                                       // a building voxel

  const PAL = {
    STONE: 0xa9a29a, STONE2: 0x968f88, STONE3: 0xbdb6ad, MORTAR: 0x7d776f,
    TIMBER: 0x4e3828, TIMBER2: 0x3e2c20, GLASS: 0x2f3a52, GLASS2: 0x7f93b8,
    WOOD: 0x8a5a32, WOOD2: 0x6b4426, WOOD3: 0xa8743e, IRON: 0x3a3a42,
    TILE: 0xa8432f, TILE2: 0x8f3626, SLATE: 0x4a5468, SLATE2: 0x3c4456, THATCH: 0xb8955a, THATCH2: 0xa3824c,
    LEAF: 0x4f8f3a, LEAF2: 0x3f7a30, LEAF3: 0x67a84a, BARK: 0x6b4a32,
  };

  /* --------------------------------------------------------- the ground -- */
  // where one can walk: the square, the south street, the east street, the alley (they overlap a metre at the joins)
  const WALK = [[-12, -10, 12, 10], [-3, 9, 3, 30.5], [11, -3, 28, 3], [-20.6, -5.5, -11, -3.5]];
  const GROUND = 140;
  function groundTexture() {
    const N = 1024, W = GROUND, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(N, N), d = img.data;
    const put = (i, c) => { d[i] = (c >> 16) & 255; d[i + 1] = (c >> 8) & 255; d[i + 2] = c & 255; d[i + 3] = 255; };
    const cobble = (x, z, n, tones, mortarC, sz) => {
      const row = Math.floor((z + 100) / (0.42 * sz)), sx = (x + 100) / (0.55 * sz) + (row & 1) * 0.5;
      const fx = sx % 1, fz = ((z + 100) / (0.42 * sz)) % 1;
      if (fx < 0.1 || fz < 0.12) return mortarC;
      const t = H(Math.floor(sx), row, 5);
      return shade(t < 0.33 ? tones[0] : t < 0.66 ? tones[1] : tones[2], 0.95 + n * 0.08);
    };
    const STREET = [0xb8ae9e, 0xaaa090, 0x9d9385], ALLEY = [0x6e6862, 0x635d58, 0x58534f];
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
      const x = (px / N - 0.5) * W, z = (py / N - 0.5) * W, i = (py * N + px) * 4;
      const n = H(px, py, 7), n2 = H(px >> 3, py >> 3, 3), n3 = H(px >> 6, py >> 6, 11);
      let c;
      const inTown = x > -30 && x < 29 && z > -26 && z < 31.6;
      if (x < -11.5 && x > -21.5 && z > -5.6 && z < -3.4) c = cobble(x, z, n, ALLEY, 0x4a4540, 1);        // the alley: dark, damp stones
      else if (Math.hypot(x, z) < 3.2) c = cobble(x, z, n, [0xc8bdb0, 0xbcb0a2, 0xb0a596], 0x8d8478, 0.8);   // round the fountain
      else if (Math.abs(Math.hypot(x, z) - 3.4) < 0.18) c = 0x8d8478;
      else if (inTown) c = cobble(x, z, n, STREET, 0x837a6e, 1);
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

  /* ------------------------------------------------------- the houses -- */
  /* A half-timbered house, its front (+z) to the street: a stone ground floor, plastered upper floors in a timber
     frame that jut out a little over the street, shuttered windows with flower boxes, a door (or a shop front, or an
     open forge), a steep gabled roof with a chimney. o: { W, D (voxels), floors, plaster, roof: 'tile'|'slate'|'thatch',
     shutter, door: x offset, shop, forge, seed } */
  function houseGrid(o) {
    const g = new VX.Grid(); g.jit = 0; g.merge = true;
    const W = o.W, D = o.D, F = o.floors, FH = 12, top = F * FH;
    const x0 = -W / 2, x1 = W / 2 - 1, z0 = -D / 2, z1 = D / 2 - 1, seed = o.seed || 1;
    const plaster = o.plaster, shutter = o.shutter || 0x3f6a4a, doorX = o.door != null ? o.door : 0;
    const stone = (x, y, z) => { if (y % 3 === 0 || ((x + z) + (Math.floor(y / 3) & 1) * 3) % 6 === 0) return PAL.MORTAR; const n = H((x + z + (Math.floor(y / 3) & 1) * 3) / 6 | 0, y / 3 | 0, seed); return n < 0.3 ? PAL.STONE2 : n < 0.8 ? PAL.STONE : PAL.STONE3; };   // stone blocks, one shade each
    const jet = f => f >= 1 ? 1 : 0;
    const wallCol = (x, y, z, f, along, len) => {
      if (f === 0) return stone(x, y, z);
      const fy = y % FH;
      if (fy === 0 || fy === FH - 1) return PAL.TIMBER;                              // the beams between the floors
      const a = ((along % 8) + 8) % 8;
      if (along === 0 || along === len - 1 || a === 0) return PAL.TIMBER;            // posts
      if ((a === fy % 8 || a === 8 - (fy % 8)) && fy > 1 && fy < FH - 2 && ((Math.floor(along / 8) + f) & 1)) return PAL.TIMBER2;   // braces
      return plaster;
    };
    // the walls: a shell, the upper floors jutting out a voxel front and back
    for (let y = 0; y < top; y++) {
      const f = Math.floor(y / FH), j = jet(f);
      for (let x = x0; x <= x1; x++) for (const z of [z0 - j, z1 + j]) g.set(x, y, z, wallCol(x, y, z, f, x - x0, W));
      for (let z = z0 - j; z <= z1 + j; z++) for (const x of [x0, x1]) g.set(x, y, z, wallCol(x, y, z, f, z - z0 + j, D + 2 * j));
    }
    // solid inside, so only the outside is meshed
    for (let y = 0; y < top; y++) { const j = jet(Math.floor(y / FH)); g.box(x0 + 1, y, z0 - j + 1, x1 - 1, y, z1 + j - 1, 0x2a2420); }
    // windows: on every floor of the front and back, the upper floors of the sides
    const windowAt = (put, along, f, side) => {
      const yb = f * FH + 4;
      for (let k = 0; k < 3; k++) for (let y = yb; y < yb + 5; y++) put(along + k, y, 0, y === yb + 4 || (k === 1 && y === yb + 2) ? PAL.TIMBER : (y === yb + 3 && k === 0 ? PAL.GLASS2 : PAL.GLASS));
      for (let y = yb; y < yb + 5; y++) { put(along - 1, y, 1, shutter); put(along + 3, y, 1, shutter); }
      if (f >= 1 && side !== 'side') for (let k = -1; k <= 3; k++) { put(along + k, yb - 1, 1, PAL.WOOD2); if (k >= 0 && k <= 2 && H(along + k, yb, f + seed) < 0.85) put(along + k, yb, 1, [0xd8304a, 0xf08ac0, 0xf0d04a, 0xe86a3a][(along + k + f + seed) % 4]); }
    };
    const front = (a, y, out, c) => g.set(x0 + a, y, z1 + jet(Math.floor(y / FH)) + out, c);
    const back = (a, y, out, c) => g.set(x1 - a, y, z0 - jet(Math.floor(y / FH)) - out, c);
    const sideL = (a, y, out, c) => g.set(x0 - out, y, z0 + a, c);
    const sideR = (a, y, out, c) => g.set(x1 + out, y, z1 - a, c);
    for (let f = 0; f < F; f++) {
      for (let a = 3; a + 3 < W - 2; a += 7) {
        const mid = W / 2 + doorX;
        if (f === 0 && (o.shop || o.forge) && a > 2 && a < W - 6) continue;
        if (f === 0 && Math.abs(a + 1 - mid) < 5) continue;                             // leave room for the door
        windowAt(front, a, f, 'front');
        windowAt(back, a, f, 'back');
      }
      if (f >= 1) for (let a = 4; a + 3 < D - 3; a += 8) { windowAt(sideL, a, f, 'side'); windowAt(sideR, a, f, 'side'); }
    }
    // the door: planked, under a stone arch, a step in front
    if (!o.forge && !o.noDoor) {
      const dx = Math.round(doorX) - 2;
      for (let x = dx; x <= dx + 3; x++) for (let y = 0; y <= 7; y++) {
        if (y === 7 && (x === dx || x === dx + 3)) { g.set(x, y, z1, PAL.STONE3); continue; }
        g.set(x, y, z1, y === 4 && x === dx + 3 ? 0xc8a24a : ((x - dx) & 1 ? PAL.WOOD2 : PAL.WOOD));
      }
      for (let y = 0; y <= 8; y++) { g.set(dx - 1, y, z1 + 1, PAL.STONE3); g.set(dx + 4, y, z1 + 1, PAL.STONE3); }
      g.box(dx - 1, 8, z1 + 1, dx + 4, 8, z1 + 1, PAL.STONE3);
    }
    // a shop front: a wide window with a counter under it, an awning over
    if (o.shop) {
      for (let x = x0 + 3; x <= x1 - 4; x++) {
        if (Math.abs(x - doorX) <= 3) continue;
        for (let y = 3; y <= 8; y++) g.set(x, y, z1, y === 8 || (x - x0) % 5 === 0 ? PAL.TIMBER : (y === 7 ? PAL.GLASS2 : PAL.GLASS));
        g.set(x, 2, z1 + 1, PAL.WOOD3); g.set(x, 2, z1 + 2, PAL.WOOD3);
        for (let k = 0; k < 3; k++) g.set(x, 10 - k, z1 + 1 + k, ((x - x0) >> 1) & 1 ? o.awning || 0xc23a3a : 0xf1ece2);
      }
    }
    // the forge: the front of the ground floor open, the forge glowing inside, a hood over it
    if (o.forge) {
      g.cut(x0 + 1, 0, z0 + 1, x1 - 1, 10, z1 - 1);
      for (let x = x0 + 2; x <= x1 - 2; x++) for (let y = 0; y <= 9; y++) g.del(x, y, z1);
      g.box(x0 + 1, 0, z1 - 1, x1 - 1, 0, z1 - 1, PAL.STONE2);
      g.box(-4, 0, z1 - 7, 4, 4, z1 - 3, stone);
      g.box(-3, 5, z1 - 6, 3, 5, z1 - 4, (x, y, z) => VX.glow(H(x, y, z) < 0.5 ? 0xff7a2a : 0xffb347));
      g.box(-4, 9, z1 - 8, 4, 11, z1 - 2, PAL.STONE2);
      for (let x = x0 + 1; x <= x1 - 1; x++) for (let z = z0 + 1; z <= z1 - 1; z++) g.set(x, 11, z, PAL.WOOD2);   // the ceiling over it
      for (let y = 1; y <= 10; y++) for (let x = x0 + 1; x <= x1 - 1; x++) g.set(x, y, z0, shade(stone(x, y, z0), 0.7));
    }
    // the roof: a steep gable, ridge along the front, eaves overhanging; tiles, slate or thatch
    const RJ = jet(F - 1) + 1, zs = z0 - RJ, ze = z1 + RJ, layers = Math.ceil((ze - zs + 1) / 2);
    const rc = (x, k, z) => {                           // a colour per course, so each course is a few long quads
      if (o.roof === 'slate') return (k & 1) ? PAL.SLATE2 : PAL.SLATE;
      if (o.roof === 'thatch') return k % 3 === 2 ? PAL.THATCH2 : PAL.THATCH;
      return (k & 1) ? PAL.TILE2 : PAL.TILE;
    };
    for (let k = 1; k < layers; k++) { const za = zs + k, zb = ze - k; if (zb - za > 1) g.box(x0 + 1, top + k - 1, za + 1, x1 - 1, top + k - 1, zb - 1, 0x2a2420); }   // the attic, solid
    for (let k = 0; k < layers; k++) {
      const za = zs + k, zb = ze - k, y = top + k;
      for (let x = x0 - 1; x <= x1 + 1; x++) for (const z of za === zb ? [za] : [za, zb]) { g.set(x, y, z, rc(x, k, z)); if (k > 0 && za !== zb) g.set(x, y - 1, z + (z === za ? 1 : -1), rc(x, k, z)); }
      for (const x of [x0, x1]) for (let z = za + 1; z < zb; z++) g.set(x, y, z, k % 4 === 3 ? PAL.TIMBER : plaster);   // the gable ends
    }
    // a chimney on the back slope
    const cx = x1 - 5 - (seed % 3) * 3, ctop = top + layers + 2;
    for (let y = top; y <= ctop; y++) g.box(cx, y, z0 + 4, cx + 2, y, z0 + 6, y === ctop ? 0x2a2626 : stone);
    return g;
  }
  // the chapel: stone walls, tall pointed windows, a steep slate roof, a bell tower with a spire
  function chapelGrid() {
    const g = new VX.Grid(); g.jit = 0; g.merge = true;
    const st = (x, y, z) => (y % 3 === 0 ? PAL.MORTAR : (H(x, y, z) < 0.4 ? PAL.STONE3 : 0xc4bdb2));
    const W = 28, D = 48, HW = 36;
    for (let y = 0; y < HW; y++) for (let x = -W / 2; x < W / 2; x++) for (let z = -D / 2; z < D / 2; z++) {
      g.set(x, y, z, st(x, y, z));
    }
    for (let k = 0; k < W / 2 + 1; k++) for (let z = -D / 2 - 1; z <= D / 2; z++) { g.set(-W / 2 - 1 + k, HW + k, z, k & 1 ? PAL.SLATE2 : PAL.SLATE); g.set(W / 2 - k, HW + k, z, k & 1 ? PAL.SLATE2 : PAL.SLATE); }
    for (let k = 0; k < W / 2; k++) for (let x = -W / 2 + k + 1; x < W / 2 - k - 1; x++) for (let z = -D / 2; z < D / 2; z++) g.set(x, HW + k, z, st(x, HW + k, z));
    for (let z = -D / 2 + 5; z < D / 2 - 5; z += 8) for (const x of [-W / 2, W / 2 - 1]) for (let y = 10; y < 28; y++) for (let k = -1; k <= 1; k++) if (y < 25 || Math.abs(k) < 1) g.set(x, y, z + k, (y + k) % 4 === 0 ? 0x6a5a4a : VX.glow(0)) ;
    g.paint((x, y, z, v) => v === VX.glow(0), (x, y, z) => H(x, y, z) < 0.5 ? 0x5a6a9a : 0x8a5a7a);     // stained glass, unlit by day
    // the bell tower on the front, its spire
    for (let y = 0; y < 72; y++) for (let x = -6; x < 6; x++) for (let z = D / 2 - 2; z < D / 2 + 10; z++) {
      if (x !== -6 && x !== 5 && z !== D / 2 - 2 && z !== D / 2 + 9) continue;
      const belfry = y > 56 && y < 66 && ((x > -4 && x < 3) || (z > D / 2 && z < D / 2 + 7));
      if (!belfry) g.set(x, y, z, st(x, y, z));
    }
    g.box(-2, 58, D / 2 + 2, 1, 62, D / 2 + 5, 0x8a6a3a);              // the bell
    for (let k = 0; k < 30; k++) { const r = 7 * (1 - k / 30); for (let x = -Math.ceil(r); x <= r; x++) for (let z = -Math.ceil(r); z <= r; z++) if (Math.max(Math.abs(x), Math.abs(z)) >= r - 1.2 && Math.max(Math.abs(x), Math.abs(z)) <= r + 0.3) g.set(x - 0.5, 72 + k, z + D / 2 + 3.5, k & 1 ? PAL.SLATE2 : PAL.SLATE); }
    g.box(0, 102, D / 2 + 3, 0, 106, D / 2 + 3, 0xc8a24a); g.box(-1, 105, D / 2 + 3, 1, 105, D / 2 + 3, 0xc8a24a);
    return g;
  }
  // the town wall and its gatehouse (the gate stands open; a hay cart is pulled up in it)
  function wallGrid(len) {
    const g = new VX.Grid(); g.jit = 0; g.merge = true;
    for (let x = 0; x < len; x++) for (let y = 0; y < 24; y++) for (let z = 0; z < 6; z++) {
      if (y >= 22 && (z > 0 && z < 5)) continue;
      if (y === 23 && (x % 4 >= 2)) continue;
      g.set(x, y, z, y % 3 === 0 ? PAL.MORTAR : (H(x, y, z) < 0.4 ? PAL.STONE2 : PAL.STONE));
    }
    return g;
  }
  function gatehouseGrid() {
    const g = new VX.Grid(); g.jit = 0; g.merge = true;
    const st = (x, y, z) => y % 3 === 0 ? PAL.MORTAR : (H(x, y, z) < 0.4 ? PAL.STONE2 : PAL.STONE);
    for (let x = -20; x < 20; x++) for (let y = 0; y < 38; y++) for (let z = -6; z < 6; z++) {
      if (Math.abs(x) < 8 && (y < 18 || Math.hypot(x, y - 18) < 8)) continue;   // the arch
      if (y >= 36 && ((x + 40) % 4 >= 2) && (x === -20 || x === 19 || z === -6 || z === 5)) continue;
      g.set(x, y, z, st(x, y, z));
    }
    for (let x = -8; x < 8; x++) for (let z = -6; z < 6; z++) for (let y = 0; y < 26; y++) if (y >= 18 && Math.hypot(x, y - 18) >= 7.5 && Math.hypot(x, y - 18) < 8.5) g.set(x, y, z, PAL.STONE3);
    for (let x = -7; x <= 7; x += 2) g.box(x, 22, -6, x, 25, -6, PAL.IRON);  // the raised portcullis' teeth
    // banners either side of the arch
    for (const s of [-1, 1]) g.box(s * 12 - 1, 14, 6, s * 12 + 1, 28, 6, (x, y, z) => y === 14 && x !== s * 12 ? -1 : (Math.abs(x - s * 12) < 1 && y > 18 && y < 24 ? 0xe8c24a : 0x2f4f9e));
    return g;
  }

  /* -------------------------------------------------- the square's things -- */
  function fountainGrid() {
    const g = new VX.Grid(); g.jit = 0; g.merge = true;
    const st = (x, y, z) => H(x, y, z) < 0.4 ? 0xc8c0b6 : 0xb8b0a6;
    for (let y = 0; y <= 5; y++) g.disc(0, 0, 16, y, y, (x, yy, z) => { const r = Math.hypot(x, z); if (r > 14.6 && r <= 16.3) return yy === 5 ? 0xd6cfc4 : st(x, yy, z); if (r <= 14.6 && yy === 3) return H(x, yy, z) < 0.15 ? 0x9cc4ec : (Math.sin(r * 1.3) > 0.6 ? 0x6f9fd8 : 0x5a8ccc); return -1; });
    g.disc(0, 0, 3, 0, 14, st);
    for (let y = 12; y <= 14; y++) g.disc(0, 0, 7, y, y, (x, yy, z) => { const r = Math.hypot(x, z); if (r > 5.6) return yy === 14 ? 0xd6cfc4 : st(x, yy, z); return yy === 13 ? 0x6f9fd8 : (yy === 12 ? st(x, yy, z) : -1); });
    g.disc(0, 0, 1.6, 15, 22, st);
    // a little statue on top: a robed figure with a raised staff
    g.box(-1, 23, -1, 1, 28, 1, 0xd6cfc4); g.box(-1, 29, -1, 1, 31, 1, 0xd6cfc4); g.box(2, 24, 0, 2, 34, 0, 0xc8c0b6); g.set(2, 35, 0, 0xe6dcc8);
    for (let k = 0; k < 4; k++) { const a = k / 4 * TAU; g.set(Math.round(Math.sin(a) * 6.5), 12, Math.round(Math.cos(a) * 6.5), 0x8a8279); }   // spouts
    return g;
  }
  // a market stall: a counter with goods on it, posts, a striped awning. Its customers' side is +z, the seller stands at -z
  function stallGrid(stripe, goods) {
    const g = new VX.Grid(); g.jit = 0.04;
    g.box(-12, 7, -5, 11, 8, 5, PAL.WOOD3);
    g.box(-12, 0, 5, 11, 6, 5, (x, y, z) => (x & 3) === 0 ? PAL.WOOD2 : PAL.WOOD);
    for (const [x, z, h] of [[-12, -5, 23], [11, -5, 23], [-12, 5, 19], [11, 5, 19]]) g.box(x, 0, z, x, h, z, PAL.WOOD2);
    for (let z = -6; z <= 8; z++) { const y = Math.round(23 - (z + 6) * 4 / 14); for (let x = -13; x <= 12; x++) g.set(x, y, z, ((x + 13) >> 1) % 3 === 0 ? 0xf1ece2 : stripe); }
    for (let x = -13; x <= 12; x++) if (x & 1) g.set(x, 18, 8, ((x + 13) >> 1) % 3 === 0 ? 0xf1ece2 : stripe);   // a scalloped edge
    const top = 9;
    if (goods === 'fruit') for (const [cx, cz, c] of [[-8, 0, 0xc8303a], [-3, 0, 0xe8862a], [2, 0, 0x8fc04a], [7, 0, 0x7a3a8a]]) { g.box(cx - 2, top, cz - 3, cx + 2, top, cz + 3, PAL.WOOD2); g.box(cx - 2, top + 1, cz - 3, cx + 2, top + 2, cz + 3, (x, y, z) => y === top + 2 && (x + z) & 1 ? -1 : (H(x, y, z) < 0.3 ? shade(c, 0.8) : c)); }
    if (goods === 'fish') { g.box(-11, top, -4, 10, top, 4, 0xdfe8f0); for (let i = 0; i < 9; i++) { const x = -9 + i * 2.3, z = (i & 1) ? -2 : 2; g.box(Math.round(x) - 1, top + 1, Math.round(z) - 2, Math.round(x), top + 1, Math.round(z) + 2, (xx, y, zz) => zz === Math.round(z) + 2 ? 0x5a6a7a : (H(xx, y, zz) < 0.5 ? 0x9aaabb : 0xb8c4d0)); } }
    if (goods === 'cloth') for (let i = 0; i < 6; i++) { const c = [0xb83a5a, 0x3a6ab8, 0xd8b84a, 0x4a9a6a, 0x8a4ab8, 0xe8e0d0][i]; g.box(-11 + i * 4, top, -3, -9 + i * 4, top + 2 - (i & 1), 3, c); }
    if (goods === 'flowers') for (let i = 0; i < 5; i++) { const cx = -9 + i * 4.5; g.box(cx - 1, top, -1, cx + 1, top + 2, 1, PAL.WOOD2); for (let k = 0; k < 7; k++) g.set(cx - 1 + (k % 3), top + 3 + (k >> 2), -1 + ((k * 2) % 3), [0xe8304a, 0xf08ac0, 0xf0d04a, 0xffffff, 0x9a6ad8][(i + k) % 5]); }
    if (goods === 'bread') for (let i = 0; i < 8; i++) { const x = -10 + i * 2.8, z = (i & 1) ? -2 : 1; g.box(Math.round(x), top, Math.round(z), Math.round(x) + 1, top + 1, Math.round(z) + 2, (xx, y, zz) => y === top + 1 ? 0xc8883a : 0xa8702e); }
    return g;
  }
  function benchGrid() {
    const g = new VX.Grid(); g.jit = 0.04;
    g.box(-8, 4, -2, 8, 4, 2, PAL.WOOD3); g.box(-8, 6, -3, 8, 9, -3, (x, y, z) => y === 7 ? -1 : PAL.WOOD3);
    for (const x of [-7, 7]) { g.box(x, 0, -2, x, 3, 2, PAL.IRON); g.box(x, 5, -3, x, 9, -3, PAL.IRON); }
    return g;
  }
  function wellGrid() {
    const g = new VX.Grid(); g.jit = 0.04;
    for (let y = 0; y <= 7; y++) g.disc(0, 0, 6, y, y, (x, yy, z) => Math.hypot(x, z) > 4.6 ? (yy % 2 ? 0xa9a29a : 0x968f88) : (yy === 3 ? 0x2a3a52 : -1));
    for (const x of [-5, 5]) g.box(x, 8, 0, x, 18, 0, PAL.WOOD2);
    g.box(-6, 19, -3, 6, 19, 3, PAL.TILE); g.box(-5, 20, -2, 5, 20, 2, PAL.TILE2); g.box(-6, 16, 0, 6, 16, 0, PAL.WOOD);
    g.box(-1, 10, -1, 1, 13, 1, PAL.WOOD); g.box(0, 14, 0, 0, 15, 0, PAL.IRON);
    return g;
  }
  function treeGrid(seed) {
    const g = new VX.Grid(); g.jit = 0.08;
    g.box(-3, 0, -3, 3, 2, 3, PAL.STONE2); g.box(-2, 3, -2, 2, 3, 2, 0x5a4a32);   // a planter
    for (let y = 3; y <= 13; y++) g.box(0, y, 0, 1, y, 1, H(0, y, 0) < 0.3 ? 0x5a3e2a : PAL.BARK);
    for (const b of [[0, 17, 0, 6, 5, 6], [4, 15, 2, 4, 3, 4], [-4, 16, -2, 4, 4, 4], [1, 20, -1, 4, 3, 4]]) g.ell(b[0], b[1], b[2], b[3], b[4], b[5], (x, y, z) => H(x * 3, y + seed, z * 7) < 0.06 ? -1 : (y > 19 ? PAL.LEAF3 : (H(x, y, z) < 0.5 ? PAL.LEAF : PAL.LEAF2)));
    return g;
  }
  function forestTreeGrid(seed) {
    const g = new VX.Grid(); g.jit = 0; g.merge = true;
    for (let y = 0; y <= 6; y++) g.set(0, y, 0, PAL.BARK);
    for (let y = 4; y <= 16; y++) { const r = (16 - y) * 0.35 + 0.6; g.disc(0, 0, r, y, y, (x, yy, z) => (yy + seed) % 3 === 0 ? 0x2f6a3a : 0x3a7a42); }
    return g;
  }
  function barrelGrid() { const g = new VX.Grid(); g.jit = 0.05; for (let y = 0; y <= 8; y++) g.disc(0, 0, y === 0 || y === 8 ? 2.6 : 3.1, y, y, (x, yy, z) => yy === 2 || yy === 6 ? PAL.IRON : (yy === 8 ? PAL.WOOD3 : ((Math.atan2(z, x) * 3 | 0) & 1 ? PAL.WOOD : PAL.WOOD2))); return g; }
  function crateGrid() {
    const g = new VX.Grid(); g.jit = 0.06;
    g.box(-3, 0, -3, 3, 6, 3, (x, y, z) => { const e = (Math.abs(x) === 3) + (y === 0 || y === 6) + (Math.abs(z) === 3); return e >= 2 ? PAL.WOOD2 : (y % 3 === 2 ? 0x7a4e2c : PAL.WOOD3); });
    return g;
  }
  function anvilGrid() {
    const g = new VX.Grid(); g.jit = 0.03;
    g.box(-2, 0, -2, 2, 5, 2, PAL.WOOD2);                               // the stump
    g.box(-1, 6, -1, 1, 7, 1, PAL.IRON); g.box(-4, 8, -2, 3, 9, 2, 0x4a4a54); g.box(4, 9, -1, 6, 9, 1, 0x4a4a54);
    return g;
  }
  function logsGrid() {
    const g = new VX.Grid(); g.jit = 0.05;
    for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) {
      const cz = -4.5 + i * 3 + row * 1.5, cy = 1.5 + row * 2.6;
      for (let x = -7; x <= 7; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) if (y * y + z * z <= 2) g.set(x, cy + y, cz + z, Math.abs(x) === 7 ? 0xd8b07a : (H(x, y, z) < 0.5 ? PAL.BARK : 0x5a3e2a));
    }
    g.box(10, 0, -2, 13, 4, 2, 0x6b4a32); g.box(10, 5, -2, 13, 5, 2, 0xd8b07a);   // the chopping block
    return g;
  }
  function haycartGrid() {
    const g = new VX.Grid(); g.jit = 0.05;
    g.box(-8, 5, -14, 8, 6, 14, PAL.WOOD); g.box(-8, 7, -14, -8, 10, 14, PAL.WOOD2); g.box(8, 7, -14, 8, 10, 14, PAL.WOOD2);
    for (const s of [-1, 1]) for (const zc of [-9, 9]) for (let y = 0; y <= 9; y++) for (let z = zc - 4; z <= zc + 4; z++) { const r = Math.hypot(y - 4.5, z - zc); if (r <= 4.6 && (r > 3.4 || Math.abs(y - 4.5) < 0.6 || Math.abs(z - zc) < 0.6)) g.set(s * 9, y, z, PAL.WOOD2); }
    g.ell(0, 11, 0, 7.5, 5, 13, (x, y, z) => y < 7 ? -1 : (H(x, y, z) < 0.4 ? 0xd8b85a : 0xe6c86a));
    g.box(-1, 5, 15, 1, 5, 24, PAL.WOOD2);
    return g;
  }
  function haybaleGrid() { const g = new VX.Grid(); g.jit = 0.06; g.box(-5, 0, -3, 5, 6, 3, (x, y, z) => H(x, y, z) < 0.4 ? 0xd8b85a : 0xe6c86a); return g; }
  function lanternPostGrid() {
    const g = new VX.Grid(); g.jit = 0.03;
    g.box(-1, 0, -1, 1, 1, 1, PAL.IRON); g.box(0, 2, 0, 0, 26, 0, PAL.IRON); g.box(0, 26, 0, 4, 26, 0, PAL.IRON);
    g.box(3, 20, -1, 5, 24, 1, (x, y, z) => (y === 20 || y === 24) ? PAL.IRON : 0xe8d8a8); g.set(4, 25, 0, PAL.IRON);
    return g;
  }
  // bunting: little pennants on a line, sagging across the square (along x, length in voxels)
  function buntingGrid(len) {
    const g = new VX.Grid(); g.jit = 0;
    const cols = [0xc8303a, 0x2f5fbf, 0xe8c24a, 0xf1ece2, 0x3f9a5a];
    for (let x = 0; x <= len; x++) {
      const sag = Math.round(Math.sin(x / len * Math.PI) * len * 0.06), y = -sag;
      g.set(x, y, 0, 0x5a4a3a);
      const p = x % 6;
      if (p >= 1 && p <= 4) for (let k = 1; k <= 4 - Math.abs(p - 2.5) * 1.6; k++) g.set(x, y - k, 0, cols[Math.floor(x / 6) % 5]);
    }
    return g;
  }
  // a washing line across the alley (along x), shirts and sheets pegged on it
  function laundryGrid(len) {
    const g = new VX.Grid(); g.jit = 0;
    for (let x = 0; x <= len; x++) g.set(x, -Math.round(Math.sin(x / len * Math.PI) * 1.5), 0, 0x8a7a6a);
    let x = 2;
    const cols = [0xe8e0d0, 0x8a9ab8, 0xc8a0a0, 0xd8d0a0, 0xa0b8a0];
    for (let i = 0; x < len - 5; i++) {
      const w = 3 + (i % 3), h = 4 + (i % 2) * 2, y0 = -Math.round(Math.sin((x + w / 2) / len * Math.PI) * 1.5);
      g.box(x, y0 - h, 0, x + w - 1, y0 - 1, 0, (xx, y, z) => H(xx, y, i) < 0.15 ? shade(cols[i % 5], 0.85) : cols[i % 5]);
      x += w + 2;
    }
    return g;
  }
  // the door in the ground: a stone frame around a dark pit lit pink from below (the hatch is its own piece, so it opens)
  function trapdoorFrameGrid() {
    const g = new VX.Grid(); g.jit = 0.02;
    for (let x = -13; x <= 13; x++) for (let z = -10; z <= 10; z++) {
      const rim = Math.abs(x) >= 11 || Math.abs(z) >= 8;
      if (rim) g.set(x, 0, z, H(x, 0, z) < 0.4 ? 0x5a5550 : 0x6a645e);
      else g.set(x, 0, z, VX.glow(H(x, 0, z) < 0.5 ? 0xff7ac0 : 0xc85ad8));    // the light down there (the hatch covers it)
    }
    return g;
  }
  function trapdoorLeafGrid() {                         // hinged along its back edge (z 0), it lies toward +z
    const g = new VX.Grid(); g.jit = 0.02;
    for (let x = -10; x <= 10; x++) for (let z = 0; z <= 16; z++) {
      if ((x + 11) % 5 === 0 && z > 0 && z < 16 && H(x, z, 3) < 0.35) { g.set(x, 0, z, VX.glow(0xff8fd0)); continue; }    // light through the cracks
      g.set(x, 0, z, z === 3 || z === 13 ? PAL.IRON : (((x + 11) / 5 | 0) & 1 ? 0x5a3a24 : 0x4e3220));
    }
    g.set(0, 1, 14, PAL.IRON); g.set(-1, 1, 15, PAL.IRON); g.set(1, 1, 15, PAL.IRON);   // a ring to pull
    for (let x = -1; x <= 1; x++) for (let z = 7; z <= 9; z++) if (!(x === 0 && z === 8)) g.set(x, 1, z, 0xb04a7a);   // a little suit carved in it
    return g;
  }
  function catGrid() {
    const g = new VX.Grid(); g.jit = 0.02;
    g.ell(0, 4, 0, 3, 4, 3.5, 0x1e1c22); g.box(-2, 0, 2, -1, 2, 3, 0x1e1c22); g.box(1, 0, 2, 2, 2, 3, 0x1e1c22);
    for (let k = 0; k < 9; k++) g.set(Math.round(Math.sin(k * 0.5) * 3) + 3, 0 + Math.round(k * 0.3), -3 + Math.round(Math.cos(k * 0.5)), 0x1e1c22);   // the tail curled round
    return g;
  }
  function catHeadGrid() {
    const g = new VX.Grid(); g.jit = 0.02;
    g.box(-2, -1, -2, 2, 2, 2, 0x1e1c22); g.box(-2, 3, 0, -2, 4, 1, 0x1e1c22); g.box(2, 3, 0, 2, 4, 1, 0x1e1c22);
    g.set(-1, 1, 3, VX.glow(0xc8e84a)); g.set(1, 1, 3, VX.glow(0xc8e84a)); g.set(0, 0, 3, 0x5a4a52);
    return g;
  }
  function chickenGrid(c) {
    const g = new VX.Grid(); g.jit = 0.02;
    g.ell(0, 4, 0, 2.2, 2.2, 3, c); g.box(-1, 6, 2, 1, 8, 3, c); g.set(0, 9, 2, 0xd8303a); g.set(0, 8, 3, 0xd8303a); g.set(0, 7, 4, 0xe8b03a);
    g.box(-1, 0, 0, -1, 2, 0, 0xe8b03a); g.box(1, 0, 0, 1, 2, 0, 0xe8b03a); g.box(-1, 4, -4, 1, 6, -3, shade(c, 0.85));
    return g;
  }
  function windmillGrid() {
    const g = new VX.Grid(); g.jit = 0; g.merge = true;
    for (let y = 0; y <= 40; y++) { const r = 8 - y * 0.08; g.disc(0, 0, r, y, y, (x, yy, z) => Math.hypot(x, z) > r - 1.3 ? (yy % 9 === 0 ? PAL.TIMBER : 0xe8e0d0) : -1); }
    for (let k = 0; k < 9; k++) g.disc(0, 0, 6.5 - k * 0.7, 41 + k, 41 + k, PAL.THATCH);
    g.box(-1, 0, 7, 1, 5, 7, PAL.WOOD2);
    return g;
  }
  function sailsGrid() {                                // the windmill's sails, turning in the xy plane about the hub
    const g = new VX.Grid(); g.jit = 0;
    g.box(-1, -1, 0, 1, 1, 1, PAL.WOOD2);
    for (let k = 0; k < 4; k++) { const a = k * HP; for (let r = 2; r <= 22; r++) { const x = Math.round(Math.cos(a) * r), y = Math.round(Math.sin(a) * r); g.set(x, y, 0, PAL.WOOD2); if (r > 5) for (let w = 1; w <= 4; w++) g.set(x + Math.round(-Math.sin(a) * w), y + Math.round(Math.cos(a) * w), 0, (r + w) % 3 === 0 ? PAL.WOOD : 0xe8e0d0); } }
    return g;
  }
  function hillGrid(r, h, seed) {
    const g = new VX.Grid(); g.jit = 0; g.merge = true;
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
      const d = Math.hypot(x, z) / r; if (d > 1) continue;
      const top = Math.round(h * (Math.cos(d * Math.PI) * 0.5 + 0.5) * (0.85 + H(x >> 2, seed, z >> 2) * 0.3));
      for (let y = Math.max(0, top - 2); y <= top; y++) g.set(x, y, z, y === top ? (H(x >> 2, y >> 1, z >> 2) < 0.5 ? 0x6aa64e : 0x5f9a45) : 0x4f8a3a);
    }
    return g;
  }
  function mountainGrid(seed) {
    const g = new VX.Grid(); g.jit = 0; g.merge = true;
    const R = 16, Hh = 18 + (seed % 3) * 4;
    for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
      const d = Math.hypot(x, z) / R; if (d > 1) continue;
      const top = Math.round(Hh * Math.pow(1 - d, 1.2) * (0.8 + H(x >> 1, seed, z >> 1) * 0.35));
      for (let y = Math.max(0, top - 2); y <= top; y++) g.set(x, y, z, y > Hh * 0.62 ? 0xeef2f8 : (y > Hh * 0.45 && H(x >> 1, y >> 1, z >> 1) < 0.5 ? 0xd8e0ea : (H(x >> 2, y >> 2, z >> 2) < 0.5 ? 0x7a88a8 : 0x6a7898)));
    }
    return g;
  }
  function cloudGrid(seed) {
    const g = new VX.Grid(); g.jit = 0.02;
    for (let i = 0; i < 5; i++) { const x = (H(i, seed, 1) - 0.5) * 12, z = (H(i, seed, 2) - 0.5) * 6, r = 3 + H(i, seed, 3) * 3; g.ell(x, 0, z, r, 1.5, r * 0.7, (xx, y, zz) => y < 0 ? 0xe6eefc : 0xffffff); }
    return g;
  }
  // a little sign on an iron bracket (it hangs out from a wall, its faces to +x and -x): an icon for the trade
  function signGrid(icon) {
    const g = new VX.Grid(); g.jit = 0.02;
    g.box(0, 14, 0, 0, 14, 12, PAL.IRON); g.box(0, 15, 0, 0, 15, 1, PAL.IRON);
    for (const z of [3, 11]) g.set(0, 13, z, PAL.IRON);
    g.box(0, 2, 2, 0, 12, 12, (x, y, z) => (y === 2 || y === 12 || z === 2 || z === 12) ? 0x5a3a24 : 0xd8c8a0);
    const put = (y, z, c) => { g.set(1, y, z, c); g.set(-1, y, z, c); };
    const I = {
      tankard: () => { for (let y = 4; y <= 9; y++) for (let z = 5; z <= 8; z++) put(y, z, y === 9 ? 0xf1ece2 : 0x8a5a32); for (let y = 5; y <= 8; y++) put(y, 9 + (y === 5 || y === 8 ? 0 : 1), 0x8a5a32); },
      bread: () => { for (let z = 4; z <= 10; z++) for (let y = 5; y <= 8; y++) if (Math.hypot((z - 7) / 3.4, (y - 6) / 2.4) < 1) put(y, z, (z + y) % 3 === 0 ? 0xa8702e : 0xc8883a); },
      anvil: () => { for (let z = 4; z <= 10; z++) put(8, z, 0x3a3a42); for (let z = 5; z <= 9; z++) put(7, z, 0x3a3a42); for (let y = 4; y <= 6; y++) put(y, 7, 0x3a3a42); for (let z = 5; z <= 9; z++) put(4, z, 0x3a3a42); },
      spool: () => { for (let z = 5; z <= 9; z++) { put(4, z, 0x8a5a32); put(9, z, 0x8a5a32); } for (let y = 5; y <= 8; y++) for (let z = 6; z <= 8; z++) put(y, z, 0xb83a5a); put(10, 10, 0x9aa0ac); put(9, 10, 0x9aa0ac); },
      bottle: () => { for (let y = 4; y <= 7; y++) for (let z = 5; z <= 9; z++) put(y, z, 0x3a8a6a); for (let y = 8; y <= 9; y++) put(y, 7, 0x3a8a6a); put(10, 7, 0x8a5a32); },
    };
    if (I[icon]) I[icon]();
    return g;
  }

  /* ------------------------------------------------------------- town -- */
  class Town {
    constructor(scene) {
      this.scene = scene; this.walk = WALK; this.colliders = []; this.seats = []; this.clouds = []; this.named = {};
      this.groundSize = GROUND; this.farColor = 0x6aa64e;
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND, GROUND), new THREE.MeshLambertMaterial({ map: groundTexture() }));
      ground.rotation.x = -HP; scene.add(ground);
      const kinds = {};
      const kind = (name, grid, s, o) => kinds[name] || (kinds[name] = VX.meshGrid(grid(), s, o || {}));
      const place = (name, x, z, ry, sc, opts) => {
        const m = VX.meshPair(kinds[name], null, {});
        m.position.set(x, (opts && opts.y) || 0, z); m.rotation.y = ry || 0; if (sc) m.scale.setScalar(sc);
        if (opts && opts.name) m.userData.bake = opts.name;
        if (opts && opts.noCast) m.userData.noCast = true;
        scene.add(m); return m;
      };
      const col = (x, z, r) => this.colliders.push([x, z, r]);

      /* the houses round the square and along the streets: [name, cx, cz, facing, options]. facing is the yaw that
         turns a house's front (+z) to its street */
      const S = HP, N = 0, E = -HP, Wd = HP;
      const HOUSES = [
        ['inn', -7.5, -14.5, N, { W: 36, D: 36, floors: 3, plaster: 0xeee4cc, roof: 'tile', shutter: 0x3f6a4a, door: 0, sign: 'tankard' }],
        ['bakery', 0.5, -14, N, { W: 28, D: 32, floors: 2, plaster: 0xf0dca0, roof: 'slate', shutter: 0x4a6aa0, shop: true, awning: 0x3f9a5a, door: 8, sign: 'bread' }],
        ['n3', 8, -14, N, { W: 32, D: 32, floors: 3, plaster: 0xecc8c0, roof: 'tile', shutter: 0x6a4a8a, door: -6 }],
        ['w1', -16.5, -7.75, Wd, { W: 18, D: 36, floors: 3, plaster: 0xc8d0dc, roof: 'slate', shutter: 0x8a3a3a, door: 0 }],
        ['w2', -16.5, 0.25, Wd, { W: 30, D: 36, floors: 3, plaster: 0xeee4cc, roof: 'tile', shutter: 0x3f6a4a, door: 4 }],
        ['tailor', -16.5, 7, Wd, { W: 24, D: 36, floors: 2, plaster: 0xe0d0e8, roof: 'thatch', shutter: 0x4a6aa0, shop: true, awning: 0x8a4ab8, door: -7, sign: 'spool' }],
        ['smith', 16, -6.5, E, { W: 28, D: 32, floors: 2, plaster: 0xd8ccb8, roof: 'slate', shutter: 0x5a5a5a, forge: true, sign: 'anvil' }],
        ['store', 16, 6.5, E, { W: 28, D: 32, floors: 2, plaster: 0xd8e8d0, roof: 'tile', shutter: 0x8a3a3a, shop: true, awning: 0x2f5fbf, door: 7, sign: 'bottle' }],
        ['e1', 24, -6.5, N, { W: 32, D: 28, floors: 2, plaster: 0xf0dca0, roof: 'thatch', shutter: 0x3f6a4a, door: 3 }],
        ['e2', 24, 6.5, S + HP, { W: 32, D: 28, floors: 2, plaster: 0xeee4cc, roof: 'tile', shutter: 0x6a4a8a, door: -4 }],
        ['s1', -7.5, 14.5, Math.PI, { W: 36, D: 36, floors: 2, plaster: 0xecc8c0, roof: 'slate', shutter: 0x3f6a4a, door: 5 }],
        ['s2', 7.5, 14.5, Math.PI, { W: 36, D: 36, floors: 3, plaster: 0xc8d0dc, roof: 'tile', shutter: 0x8a3a3a, door: -3 }],
        ['s3', -7, 24.5, Wd, { W: 44, D: 32, floors: 2, plaster: 0xeee4cc, roof: 'thatch', shutter: 0x4a6aa0, door: 6 }],
        ['s4', 7, 24.5, E, { W: 44, D: 32, floors: 2, plaster: 0xf0dca0, roof: 'tile', shutter: 0x3f6a4a, door: -8 }],
        ['b1', -16.5, -15, N, { W: 36, D: 20, floors: 2, plaster: 0xe0d0c0, roof: 'tile', door: 0 }],
        ['b2', 16, -14.5, N, { W: 32, D: 32, floors: 2, plaster: 0xeee4cc, roof: 'slate', door: 0 }],
        ['b3', 24, -14.5, N, { W: 32, D: 32, floors: 3, plaster: 0xd8e8d0, roof: 'tile', door: 0 }],
        ['wb', -24, -4.5, Wd, { W: 16, D: 24, floors: 3, plaster: 0xb8b0a4, roof: 'slate', shutter: 0x4a4a4a, noDoor: true }],   // closes the alley
      ];
      HOUSES.forEach(([nm, cx, cz, ry, o], i) => {
        o.seed = i * 7 + 3;
        kind('house_' + nm, () => houseGrid(o), SB);
        place('house_' + nm, cx, cz, ry);
        if (o.sign) {                                  // its sign hangs out over the street, by the door
          kind('sign_' + o.sign, () => signGrid(o.sign), 0.06);
          const fx = Math.sin(ry), fz = Math.cos(ry), rx = Math.cos(ry), rz = -Math.sin(ry);
          const along = ((o.door || 0) + 4.5) * SB, out = o.D / 2 * SB + 0.25;
          place('sign_' + o.sign, cx + fx * out + rx * along, cz + fz * out + rz * along, ry, 1, { y: 3.3 });
        }
      });
      kind('chapel', chapelGrid, SB); place('chapel', 1, -30, Math.PI, 1, { noCast: true });
      kind('wall', () => wallGrid(80), SB); kind('gatehouse', gatehouseGrid, SB);
      place('gatehouse', 0, 32.2, 0);
      for (const s of [-1, 1]) place('wall', s > 0 ? 5 : -25, 31.5, 0);
      kind('parapet', () => { const g = new VX.Grid(); g.jit = 0.03; g.box(0, 0, -14, 2, 4, 14, (x, y, z) => y === 4 ? PAL.STONE3 : (H(x, y, z) < 0.4 ? PAL.STONE2 : PAL.STONE)); return g; }, SB);
      place('parapet', 28.5, 0, 0);
      kind('haycart', haycartGrid, 0.1); place('haycart', 0.3, 32.4, 0.08);

      /* the square: the fountain, stalls, benches, the well, trees, the anvil, barrels and crates, bunting overhead */
      kind('fountain', fountainGrid, 0.1); place('fountain', 0, 0, 0); col(0, 0, 1.85);
      const STALLS = [['fruit', 0xc8303a, -6.5, 5.2, Math.PI], ['fish', 0x2f5fbf, 6.5, 5.2, Math.PI], ['cloth', 0x8a4ab8, -6.2, -5.6, 0], ['flowers', 0xe8c24a, 5.4, -5.6, 0], ['bread', 0x3f9a5a, 0.5, -8.4, 0]];
      for (const [goods, c, x, z, ry] of STALLS) {
        kind('stall_' + goods, () => stallGrid(c, goods), 0.1); place('stall_' + goods, x, z, ry);
        const rx = Math.cos(ry), rz = -Math.sin(ry);
        col(x - rx * 0.7, z - rz * 0.7, 0.75); col(x + rx * 0.7, z + rz * 0.7, 0.75);
      }
      kind('bench', benchGrid, 0.1);
      for (const [x, z] of [[-3.4, 3.6], [3.4, -3.6]]) {
        const ry = Math.atan2(-x, -z);
        place('bench', x, z, ry); col(x, z, 0.75);
        if (x < 0) this.seats.push({ x: x + Math.sin(ry) * 0.1, z: z + Math.cos(ry) * 0.1, yaw: ry, h: 0.5 });   // (the old man has the other)
      }
      kind('well', wellGrid, 0.1); place('well', 8.8, 8.2, 0.4); col(8.8, 8.2, 0.75);
      kind('tree0', () => treeGrid(1), 0.2); kind('tree1', () => treeGrid(2), 0.2);
      place('tree0', -10.4, 8.5, 0.3); col(-10.4, 8.5, 0.7); place('tree1', -10.4, -8.7, 1.1); col(-10.4, -8.7, 0.7);
      kind('anvil', anvilGrid, 0.1); place('anvil', 10.2, -6.5, HP); col(10.2, -6.5, 0.45);
      kind('barrel', barrelGrid, 0.1); kind('crate', crateGrid, 0.1);
      for (const [k, x, z, ry, y] of [['barrel', 11.4, -9.4, 0, 0], ['barrel', 10.8, -9.5, 0.4, 0], ['crate', -8.8, -6.6, 0.2, 0], ['barrel', 11.4, 9.3, 0, 0], ['crate', -2.6, -9.4, 0.5, 0], ['barrel', 2.5, 9.6, 0, 0]]) {
        place(k, x, z, ry, 1, { y }); col(x, z, 0.38);
      }
      kind('post', lanternPostGrid, 0.1);
      for (const [x, z, ry] of [[-11.4, 1.6, 0], [11.4, -1.6, Math.PI], [-2.5, 20, HP], [2.5, 27, -HP]]) { place('post', x, z, ry); col(x, z, 0.2); }
      kind('bunting1', () => buntingGrid(386), 0.06); kind('bunting2', () => buntingGrid(326), 0.06);
      place('bunting1', -11.6, -2, 0.18, 1, { y: 6.2, noCast: true });
      place('bunting2', -9.4, 9.6, -0.33, 1, { y: 5.6, noCast: true });
      place('bunting2', -9.4, -9.4, 0.3, 1, { y: 6.0, noCast: true });
      kind('logs', logsGrid, 0.1); place('logs', 2.35, 15.5, HP); col(2.4, 15.0, 0.5); col(2.4, 16.2, 0.5); col(2.35, 14.35, 0.3);
      kind('bale', haybaleGrid, 0.12); place('bale', -2.2, 29.2, 0.1); col(-2.2, 29.2, 0.6); place('bale', 2.2, 28.8, -0.2); col(2.2, 28.8, 0.6);

      /* the alley: dark and narrow, a room built across it overhead, laundry, crates and barrels along it, and at its
         end, the door in the ground, a black cat keeping watch */
      kind('bridge', () => { const g = new VX.Grid(); g.jit = 0; g.merge = true;
        g.box(-6, 0, -4, 5, 11, 3, (x, y, z) => y <= 1 ? PAL.TIMBER : (y === 11 || Math.abs(x) === 6 || x === 5 || (x % 4 === 0) ? PAL.TIMBER : (Math.abs(z) === 4 || z === 3) && y > 4 && y < 9 && Math.abs(x) < 3 ? PAL.GLASS : 0xd8d0c0));
        for (let k = 0; k < 6; k++) g.box(-7, 12 + k, -5 + k, 6, 12 + k, 4 - k, (k & 1) ? PAL.SLATE2 : PAL.SLATE); return g; }, SB);
      place('bridge', -15.6, -4.5, HP, 1, { y: 3.4 });
      kind('laundry', () => laundryGrid(20), 0.1);
      for (const [x, y] of [[-13.5, 5.2], [-16.2, 6.0], [-18.8, 4.6]]) place('laundry', x, -3.5, -HP, 1, { y, noCast: false });
      for (const [k, x, z, ry] of [['crate', -14.2, -5.15, 0.1], ['barrel', -15.0, -3.85, 0], ['barrel', -17.6, -5.2, 0], ['crate', -20.2, -5.15, 0.3], ['crate', -20.25, -3.85, -0.2]]) { place(k, x, z, ry); col(x, z, 0.36); }
      kind('door_frame', trapdoorFrameGrid, 0.05); kind('door_leaf', trapdoorLeafGrid, 0.05);
      this.door = { x: -18.9, z: -4.5 };
      place('door_frame', this.door.x, this.door.z, HP, 1, { y: 0.0, noCast: true });
      place('door_leaf', this.door.x - 0.4, this.door.z, HP, 1, { y: 0.05, name: 'door_leaf' });
      kind('cat', catGrid, 0.04); kind('cat_head', catHeadGrid, 0.04);
      place('cat', -20.2, -5.15, 0.9, 1, { y: 0.65, name: 'cat' });
      place('cat_head', -20.2 + Math.sin(0.9) * 0.08, -5.15 + Math.cos(0.9) * 0.08, 0.9, 1, { y: 0.65 + 0.34, name: 'cat_head' });

      /* chickens, a little flock by the south street */
      kind('hen_w', () => chickenGrid(0xf1ece2), 0.04); kind('hen_b', () => chickenGrid(0xa8683a), 0.04);
      this.chickens = 5;
      for (let i = 0; i < 5; i++) place(i % 2 ? 'hen_b' : 'hen_w', -1.6 + (i % 3) * 1.4, 18 + i * 1.3, rnd() * TAU, 1, { name: 'hen_' + i });

      /* beyond the town: the windmill, woods, hills, far mountains, clouds */
      kind('windmill', windmillGrid, 0.25); place('windmill', 48, -9, -HP, 1, { noCast: true });
      kind('sails', sailsGrid, 0.25); place('sails', 46, 9.8, -HP, 1, { noCast: true, y: 9.8, name: 'sails' });
      this.sails = { x: 46, y: 9.8, z: -9 };
      for (let i = 0; i < 3; i++) kind('ftree' + i, () => forestTreeGrid(i), 0.3);
      for (let i = 0; i < 70; i++) {
        const a = rnd() * TAU, r = 42 + rnd() * 30, x = Math.sin(a) * r, z = Math.cos(a) * r;
        if (x > 28 && Math.abs(z) < 4) continue;
        if (Math.abs(x) < 4 && z > 30) continue;
        place('ftree' + (i % 3), x, z, rnd() * TAU, 0.8 + rnd() * 0.6, { noCast: true });
      }
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * TAU + 0.3, r = 95 + (i % 3) * 18;
        kind('hill' + (i % 4), () => hillGrid(18 + (i % 4) * 4, 7 + (i % 3) * 3, i % 4), 2.0);
        place('hill' + (i % 4), Math.sin(a) * r, Math.cos(a) * r, a, 1, { noCast: true });
      }
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU + 0.15, r = 230 + (i % 3) * 30;
        kind('mtn' + (i % 4), () => mountainGrid(i % 4), 4.0);
        place('mtn' + (i % 4), Math.sin(a) * r, Math.cos(a) * r, a * 3, 1 + (i % 2) * 0.3, { noCast: true });
      }
      for (let i = 0; i < 4; i++) kind('cloud' + i, () => cloudGrid(i), 2.2);
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
          job: 'hammer', at: [11.05, -6.5, -HP], lines: ['Careful. The forge bites.', 'A blade mended by morning, if you like.', 'Good iron sings. Hear that?'] },
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
  window.TOWN_WALK = WALK;
})();
