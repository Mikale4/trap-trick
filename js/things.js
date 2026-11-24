/* ============================================================================
   things.js -- the town's things at Trap Trick's own voxel (2.4 cm): the food
   and goods on the stalls, the stalls themselves, benches, barrels, crates,
   the well, the fountain, the forge's anvil, firewood, the hay cart, lanterns,
   signs, washing, the door in the ground, the black cat and the hens.

   Everything is drawn in voxels of 2.4 cm, y up from row 0 on the ground (or on
   the table it stands on), at the size it really is beside someone 1.66 m (69
   rows) tall. The little things (an apple, a trout, a loaf) are functions that
   draw into a grid at a place; the bigger ones return a grid. Colours are flat:
   Godot's grain shader gives each voxel its own slight shade.
   ========================================================================== */
(function () {
  'use strict';
  const H = VX.hash3, TAU = Math.PI * 2, R = Math.round;
  const mul = (c, k) => { const f = s => Math.max(0, Math.min(255, Math.round(((c >> s) & 255) * k))); return (f(16) << 16) | (f(8) << 8) | f(0); };
  const mix = (a, b, t) => { const f = s => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t); return (f(16) << 16) | (f(8) << 8) | f(0); };
  const G = () => { const g = new VX.Grid(); g.jit = 0; g.merge = true; return g; };
  const rng = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
  const C = {
    OAK: 0x8a5a32, OAK_D: 0x6b4426, OAK_L: 0xa8743e, DARK: 0x4a3020, END: 0xd8b07a, BARK: 0x6b4a32, BARK_D: 0x523826,
    IRON: 0x3a3a42, IRON_L: 0x565660, STEEL: 0xa4aab4, STEEL_L: 0xd2d8e0, BRASS: 0xc8a24a, BRASS_D: 0x9a7630,
    ROPE: 0xb89a62, SACK: 0xc2a878, SACK_D: 0xa88e60, WICK: 0xb08850, WICK_D: 0x8e6a3c, WICK_L: 0xc8a068, CREAM: 0xf1ece2, LINEN: 0xe8dcc0,
    STONE: 0xa9a29a, STONE_D: 0x8d867e, STONE_L: 0xc2bbb1, LEAF: 0x4f8f3a, LEAF_D: 0x3a6f2c, LEAF_L: 0x74b04c, STEM: 0x5a8a3a,
    STRAW: 0xe0c064, STRAW_D: 0xc6a24a, STRAW_L: 0xf0d684, WATER: 0x5a8ccc, WATER_L: 0x8cb8e8,
  };
  /* a rounded thing, a little lighter on its upper left, darker beneath */
  const ball = (g, x, y, z, r, c, ry, rz) => {
    ry = ry || r; rz = rz || r;
    return g.ell(x, y, z, r, ry, rz, (X, Y, Z) => { const l = (Y - y) / (ry + 0.5) + 0.3 * (Z - z) / (rz + 0.5) - 0.2 * (X - x) / (r + 0.5); return l > 0.62 ? mul(c, 1.15) : l < -0.5 ? mul(c, 0.8) : c; });
  };
  /* planks w wide along a coordinate: each its own tone, a dark joint between */
  const plank = (a, w, seed, base) => { const i = Math.floor(a / w), t = H(i, seed, 7); return ((a % w) + w) % w === 0 ? mul(base, 0.62) : t < 0.33 ? mul(base, 0.9) : t < 0.7 ? base : mul(base, 1.1); };
  /* a round wall of thickness t */
  const tube = (g, x, z, r, t, y0, y1, c) => g.disc(x, z, r, y0, y1, (X, Y, Z) => Math.hypot(X - x, Z - z) > r - t ? (typeof c === 'function' ? c(X, Y, Z) : c) : -1);
  const ang = (x, z, n) => Math.floor((Math.atan2(z, x) + Math.PI) / TAU * n);

  const own = (c, x, y, z) => mul(c, 0.84 + H(x, y, z) * 0.3);

  /* ------------------------------------------------------------- the food -- */
  const F = {
    /* (each fruit a shade of its own, so a pile reads as fruit) */
    apple(g, x, y, z, c, k) { c = own(c, x, y, z); ball(g, x, y + 1, z, 1.2, c); g.set(x, y + 3, z, 0x4a3020); if (k) g.set(x + 1, y + 3, z, C.LEAF_L); },
    orange(g, x, y, z, c) { c = own(c, x, y, z); ball(g, x, y + 1, z, 1.2, c); g.set(x, y + 2, z, mix(c, 0x3a5a1a, 0.55)); },
    pear(g, x, y, z) { const c = own(0xb8c050, x, y, z); ball(g, x, y + 1, z, 1.2, c); g.set(x, y + 3, z, mul(c, 1.1)); g.set(x, y + 4, z, 0x4a3020); g.set(x + 1, y, z + 1, 0xa89a48); },
    plum(g, x, y, z) { g.box(x, y, z, x + 1, y + 1, z + 1, 0x5a2a72); g.set(x, y + 1, z, 0x7a4a94); g.set(x + 1, y + 2, z, 0x4a3020); },
    lemon(g, x, y, z) { g.box(x - 1, y, z - 1, x + 1, y + 1, z + 1, own(0xf0d848, x, y, z)); g.set(x - 2, y, z, 0xd8bc3a); g.set(x + 2, y, z, 0xd8bc3a); g.set(x, y + 2, z, 0xfae87a); },
    grapes(g, x, y, z, c) {
      for (const [dx, dy, dz] of [[0, 0, 0], [-1, 1, 0], [1, 1, 0], [0, 1, 1], [0, 1, -1], [-2, 2, 0], [2, 2, 0], [0, 2, 0], [-1, 2, 1], [1, 2, 1], [-1, 2, -1], [1, 2, -1], [0, 2, 2]])
        g.set(x + dx, y + dy, z + dz, H(x + dx, y + dy, z + dz) < 0.35 ? mul(c, 1.3) : H(dx, dz, y) < 0.4 ? mul(c, 0.8) : c);
      g.set(x, y + 3, z, 0x6a5030); g.set(x + 1, y + 3, z, C.LEAF); g.set(x + 2, y + 3, z, C.LEAF_L);
    },
    cabbage(g, x, y, z, c) {
      c = c || 0x8fbf5a;
      g.ell(x, y + 2.4, z, 2.8, 2.4, 2.8, (X, Y, Z) => { const a = ang(X - x, Z - z, 7), v = (Math.atan2(Z - z, X - x) + Math.PI) / TAU * 7 % 1; return v < 0.16 ? mix(c, 0xeef4d8, 0.6) : (a + (Y - y >> 1)) & 1 ? mul(c, 0.86) : c; });
      g.disc(x, z, 1.2, y + 5, y + 5, mix(c, 0xeef4d8, 0.4));
      for (const [dx, dz] of [[3, 2], [-3, 1], [1, -3], [-2, 3]]) g.set(x + dx, y + 1, z + dz, mul(c, 0.75));
    },
    carrot(g, x, y, z) {
      for (let k = 0; k < 8; k++) { const w = k < 3 ? 1 : 0; g.box(x, y, z + k, x + w, y + w, z + k, k % 3 === 2 ? 0xd86a1a : 0xee8430); }
      for (const [dx, dy, dz] of [[0, 0, -1], [1, 1, -1], [0, 1, -2], [1, 0, -3], [-1, 1, -3], [0, 1, -4], [1, 1, -4]]) g.set(x + dx, y + dy, z + dz, dz & 1 ? C.LEAF_L : C.LEAF);
    },
    leek(g, x, y, z) { for (let k = 0; k < 13; k++) { const c = k < 5 ? 0xf0f0dc : k < 8 ? 0xb8d484 : k & 1 ? 0x5a9a4a : 0x4a8440; g.set(x, y, z + k, c); g.set(x, y + 1, z + k, c); if (k > 8) g.set(x + (k & 1 ? 1 : -1), y + (k & 1), z + k, 0x5a9a4a); } },
    onion(g, x, y, z) { ball(g, x, y + 1, z, 1.2, own(0xc88a48, x, y, z)); g.set(x, y + 3, z, 0xe0c090); g.set(x + 1, y + 1, z + 1, 0xb07436); },
    tomato(g, x, y, z) { ball(g, x, y + 1, z, 1.2, own(0xd83a2a, x, y, z), 0.9); g.set(x, y + 2, z, C.LEAF); g.set(x + 1, y + 2, z, C.LEAF_D); },
    pumpkin(g, x, y, z, r) {
      r = r || 4.5;
      g.ell(x, y + r * 0.72, z, r, r * 0.72, r, (X, Y, Z) => { const v = (Math.atan2(Z - z, X - x) + Math.PI) / TAU * 9 % 1; return v < 0.18 ? 0xb85a18 : v > 0.45 && v < 0.75 ? 0xf09a3c : 0xe07c24; });
      const top = R(y + r * 1.44 + 0.5); g.box(x, top, z, x, top + 2, z, 0x5a6a2a); g.set(x + 1, top + 2, z, 0x5a6a2a); g.set(x - 1, top, z + 1, C.LEAF);
    },
    melon(g, x, y, z, r) { r = r || 3.6; g.ell(x, y + r, z, r * 1.2, r, r, (X, Y, Z) => { const v = (Math.atan2(Z - z, Y - y - r) + Math.PI) / TAU * 8 % 1; return v < 0.3 ? 0x2f6a34 : H(X, Y, Z) < 0.2 ? 0x7ab850 : 0x5aa044; }); },
    egg(g, x, y, z, c) { g.box(x, y, z, x + 1, y + 1, z + 1, c || 0xf2e4d0); g.set(x, y + 2, z, mul(c || 0xf2e4d0, 1.05)); },
    cheese(g, x, y, z, r) {
      r = r || 5;
      g.disc(x, z, r, y, y + 4, (X, Y, Z) => {
        const a = Math.atan2(Z - z, X - x); if (a > 0.3 && a < 1.2 && Math.hypot(X - x, Z - z) > 0.5) return -1;      // a wedge already cut
        const cut = Math.hypot(X - x, Z - z) < r - 1.2 && (Math.abs(a - 0.25) < 0.4 || Math.abs(a - 1.25) < 0.4);
        return cut ? (H(X, Y, Z) < 0.16 ? 0xd8a838 : 0xf6dc80) : Y === y + 4 ? 0xe8b848 : (Y - y) === 2 ? 0xc88a2c : 0xd89c38;
      });
    },
    /* bread */
    boule(g, x, y, z, r) { r = r || 3.6; g.ell(x, y + 1.4, z, r, r * 0.62, r, (X, Y, Z) => { if (Y < y) return -1; const d = Math.hypot(X - x, Z - z) / r; if (Y > y + r * 0.42 && (X === x || Z === z) && d < 0.8) return 0xf0dcae; return Y <= y ? 0x7a4a1e : d > 0.85 ? 0x9a6228 : H(X, Y, Z) < 0.22 ? 0xd8a45c : 0xc08038; }); },
    batard(g, x, y, z, c) { c = c || 0xc8883c; g.ell(x, y + 1.2, z, 1.8, 1.3, 5, (X, Y, Z) => { if (Y < y) return -1; if (Y > y + 1 && (Z - z + X - x + 30) % 4 === 0) return 0xf2deb0; return Y <= y ? mul(c, 0.66) : Math.abs(Z - z) > 4 ? mul(c, 0.8) : c; }); },
    stickBread(g, x, y, z, lean, h) { for (let k = 0; k < h; k++) { const X = R(x + lean[0] * k / h), Z = R(z + lean[1] * k / h); g.box(X, y + k, Z, X + 1, y + k, Z + 1, k === h - 1 ? 0xb87430 : (k % 4) < 1 ? 0xf0d8a4 : 0xc8883c); } },
    plait(g, x, y, z, len) {
      len = len || 14;
      for (let k = 0; k < len; k++) { const a = k * 0.9, e = Math.sin(k / (len - 1) * Math.PI); for (const ph of [0, 2.1, 4.2]) { const dx = R(Math.sin(a + ph) * 1.6 * e), dy = R((Math.cos(a + ph) + 1) * 0.6 * e); g.set(x + dx, y + dy, z + k, (R((a + ph) / 1.1) & 1) ? 0xd89a44 : 0xb4742c); g.set(x, y, z + k, 0x8a5422); } }
    },
    bun(g, x, y, z, c) { c = c || 0xc87f34; g.disc(x, z, 1.4, y, y, mul(c, 0.78)); g.disc(x, z, 1.4, y + 1, y + 1, (X, Y, Z) => X < x && Z > z - 1 ? mul(c, 1.2) : c); g.set(x, y + 2, z, mul(c, 1.28)); },
    honeybun(g, x, y, z) { x = R(x); z = R(z); g.disc(x, z, 2.2, y, y, 0xa8642a); for (let k = 0; k < 20; k++) { const a = k * 0.5, r = 2.4 - k * 0.11; g.set(R(x + Math.cos(a) * r), y + 1, R(z + Math.sin(a) * r), k % 4 === 3 ? 0x8a4a1c : 0xd8944a); } g.set(x, y + 2, z, 0xf2c468); g.set(x + 1, y + 2, z - 1, 0xfff0d0); },
    pretzel(g, x, y, z) { ['.###.###.', '##..#..##', '#..#.#..#', '##.#.#.##', '.##...##.', '..#####..'].forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') g.set(x + i - 4, y, z + j - 3, (i * 5 + j * 2) % 11 === 0 ? 0xf6ecd8 : j & 1 ? 0x94501f : 0xa65e28); })); },
    pie(g, x, y, z, fill) {
      g.disc(x, z, 4.2, y, y, 0x9aa0a8); g.disc(x, z, 4.4, y + 1, y + 1, (X, Y, Z) => Math.hypot(X - x, Z - z) > 3.4 ? 0xc88a44 : fill);
      g.disc(x, z, 4, y + 2, y + 2, (X, Y, Z) => { const d = Math.hypot(X - x, Z - z); if (d > 3.3) return (ang(X - x, Z - z, 16) & 1) ? 0xe0ac62 : 0xc88a44; return (X - x + 20) % 3 === 0 || (Z - z + 20) % 3 === 0 ? 0xe0ac62 : fill; });
    },
    cake(g, x, y, z) {
      g.disc(x, z, 4.2, y, y, 0xf3eee6); g.disc(x, z, 3.2, y + 1, y + 4, (X, Y) => Y === y + 2 ? 0xfff2dc : Y === y + 4 ? 0xfbeef0 : 0xc88a50);
      for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; g.set(R(x + Math.cos(a) * 2.4), y + 5, R(z + Math.sin(a) * 2.4), k & 1 ? 0xd83a50 : 0xf6f0ea); }
      g.set(x, y + 5, z, 0xd83a50); g.set(x, y + 6, z, C.LEAF); for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; g.set(R(x + Math.cos(a) * 3.2), y + 3, R(z + Math.sin(a) * 3.2), 0xfbeef0); }
    },
    /* the catch: a fish lying on its side along z, its head to +z (or -z with dir -1) */
    trout(g, x, y, z, o) {
      o = o || {}; const L = o.len || 14, c = o.c || 0x8a9aa4, b = o.belly || 0xe2e6e4, d = o.dir || 1;
      for (let k = 0; k < L; k++) {
        const t = k / (L - 1), w = t < 0.16 ? 0.4 : Math.max(1, Math.sin(Math.min(1, (t - 0.1) / 0.84) * Math.PI * 0.86 + 0.18) * (o.w || 2.3));
        const Z = R(z + d * (k - L / 2));
        if (t < 0.15) { const f = 2 - k; g.set(x - 1 - f, y, Z, mul(c, 0.75)); g.set(x + 1 + f, y, Z, mul(c, 0.75)); g.set(x, y, Z, mul(c, 0.8)); continue; }      // the forked tail
        for (let X = -Math.floor(w); X <= Math.floor(w); X++) {
          const e = X / Math.max(1, w), col = e > 0.4 ? b : e < -0.45 ? mul(c, 0.72) : (o.spot && H(x + X, Z, 3) < 0.22 ? o.spot : c);      // a dark back, a pale belly
          g.set(x + X, y, Z, mul(col, 0.8)); if (Math.abs(X) < w - 0.6) g.set(x + X, y + 1, Z, k === Math.floor(L * 0.78) ? mul(c, 0.6) : col);
        }
        if (k === L - 3) { g.set(x - 1, y + 1, Z, 0x14141c); g.set(x - 1, y + 1, Z - d, 0xe8ecec); }                                                                                 // its eye
        if (k === Math.floor(L * 0.5)) { g.set(x - Math.floor(w) - 1, y, Z, mul(c, 0.8)); g.set(x - Math.floor(w) - 1, y, Z - d, mul(c, 0.7)); }   // a fin
      }
    },
    crab(g, x, y, z) {
      const c = 0xd8482c; g.ell(x, y + 1, z, 2.6, 0.8, 1.8, (X, Y, Z) => Y === y + 2 && (X + Z & 1) ? 0xec6a44 : c);
      for (const s of [-1, 1]) { for (let k = 0; k < 3; k++) { g.set(x + s * 4, y, z - 1 + k, mul(c, 0.8)); g.set(x + s * 5, y, z - 2 + k * 2, mul(c, 0.7)); } g.line(x + s * 3, y + 1, z + 1, x + s * 4, y + 1, z + 4, c); g.box(x + s * 3, y + 1, z + 4, x + s * 4, y + 2, z + 5, 0xec6a44); g.set(x + s * 3, y + 2, z + 6, c); g.set(x + s * 5, y + 1, z + 6, c); g.set(x + s, y + 2, z + 2, 0x14141c); }
    },
    mussel(g, x, y, z) { g.box(x, y, z, x, y, z + 2, 0x2a2a44); g.set(x + 1, y, z + 1, 0x3c3c62); g.set(x, y + 1, z + 1, 0x4c4c78); },
    /* jars and bottles */
    jar(g, x, y, z, c, lid) { g.disc(x, z, 1.4, y, y + 3, (X, Y, Z) => X < x && Z > z ? mul(c, 1.35) : c); g.disc(x, z, 1.4, y + 4, y + 4, lid || 0xe8dcc0); g.disc(x, z, 1, y + 5, y + 5, mul(lid || 0xe8dcc0, 0.9)); },
    bottle(g, x, y, z, c, h) { h = h || 5; g.disc(x, z, 1.2, y, y + h - 1, (X) => X < x ? mul(c, 1.4) : c); g.box(x, y + h, z, x, y + h + 2, z, mul(c, 1.1)); g.set(x, y + h + 3, z, 0x9a7040); g.box(x - 1, y + 1, z + 1, x + 1, y + 2, z + 1, 0xf1e6cc); },
    flask(g, x, y, z, c) { g.ell(x, y + 2, z, 1.9, 1.9, 1.9, (X, Y) => X < x && Y > y + 2 ? 0xffffff : Y > y + 3 ? mix(c, 0xe8f0f8, 0.7) : c); g.box(x, y + 5, z, x, y + 6, z, 0xd8e6f0); g.set(x, y + 7, z, 0x9a7040); },
    candle(g, x, y, z, h) { g.disc(x, z, 1.2, y, y, C.BRASS); g.box(x, y + 1, z, x, y + h, z, 0xf6ecd0); g.set(x, y + h + 1, z, 0x2a2420); },
    mug(g, x, y, z, c) { g.disc(x, z, 1.4, y, y + 3, (X, Y, Z) => Y === y + 3 && Math.hypot(X - x, Z - z) < 1 ? 0x4a2e1c : c); g.set(x + 2, y + 1, z, mul(c, 0.8)); g.set(x + 2, y + 2, z, mul(c, 0.8)); },
  };

  /* ---------------------------------------------------------- what holds it -- */
  /* a shallow slatted crate, w x d, h rows; what's in it is piled by fill(g, x, y, z, random) on a lattice of `pitch` */
  function tray(g, x0, y, z0, w, d, h, pitch, fill, seed) {
    g.box(x0, y, z0, x0 + w - 1, y + 1, z0 + d - 1, C.DARK);
    for (let yy = y; yy < y + h; yy++) for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) {
      const ex = x === x0 || x === x0 + w - 1, ez = z === z0 || z === z0 + d - 1; if (!ex && !ez) continue;
      const corner = (x <= x0 + 1 || x >= x0 + w - 2) && (z <= z0 + 1 || z >= z0 + d - 2);
      if (!corner && (yy - y) % 3 === 2) continue;                              // the gaps between the slats
      g.set(x, yy, z, corner ? C.OAK_D : H(yy - y >> 1, seed, ex ? 1 : 2) < 0.5 ? C.OAK_L : 0x9c6a38);
    }
    const r = rng(seed * 977 + 13);
    for (let layer = 0; layer < 2; layer++) {
      const m = layer * pitch * 0.75 + 2;
      for (let z = z0 + m; z <= z0 + d - 1 - m; z += pitch) for (let x = x0 + m; x <= x0 + w - 1 - m; x += pitch)
        fill(g, R(x + (r() - 0.5) * 0.8), y + h - 3 + layer * 2, R(z + (r() - 0.5) * 0.8), r());
    }
  }
  /* a round wicker basket: radius r at the rim, h rows */
  function basket(g, x, y, z, r, h, o) {
    o = o || {};
    for (let k = 0; k < h; k++) { const rr = r - (h - k) * 0.22; tube(g, x, z, rr, 1.3, y + k, y + k, (X, Y, Z) => k === h - 1 ? C.WICK_L : ((ang(X - x, Z - z, Math.round(rr * 5)) + k) & 1) ? C.WICK : C.WICK_D); }
    g.disc(x, z, r - h * 0.22, y, y, C.WICK_D);
    if (o.fill != null) g.disc(x, z, r - 1.6, y + h - 2, y + h - 2, o.fill);
    if (o.handle) for (let k = 0; k <= 24; k++) { const a = k / 24 * Math.PI; g.set(R(x + Math.cos(a) * (r - 0.3)), R(y + h + Math.sin(a) * o.handle), z, C.WICK_L); }
  }
  function bucketAt(g, x, y, z, r, h, o) {
    o = o || {};
    for (let k = 0; k < h; k++) tube(g, x, z, r - (h - k) * 0.12, 1.3, y + k, y + k, (X, Y, Z) => k === 1 || k === h - 3 ? C.IRON : (ang(X - x, Z - z, 14) & 1) ? C.OAK : C.OAK_D);
    g.disc(x, z, r - 1.4, y, y, C.OAK_D);
    if (o.fill != null) g.disc(x, z, r - 1.2, y + h - 2, y + h - 2, o.fill);
    if (o.handle) for (let k = 0; k <= 20; k++) { const a = k / 20 * Math.PI; g.set(R(x + Math.cos(a) * r), R(y + h - 1 + Math.sin(a) * o.handle), z, C.IRON); }
  }
  function sackAt(g, x, y, z, r, h, c) {
    c = c || C.SACK;
    for (let k = 0; k <= h; k++) {
      const t = k / h, rr = r * (t < 0.15 ? 0.85 + t : t < 0.7 ? 1.02 - (t - 0.15) * 0.1 : 0.96 - (t - 0.7) * 2.1);
      g.disc(x, z, Math.max(1.2, rr), y + k, y + k, (X, Y, Z) => ((X + Y * 2 + 60) % 7 === 0 && (Z + Y) % 3 === 0) ? mul(c, 0.82) : (ang(X - x, Z - z, 9) + (k >> 2)) % 4 === 0 ? mul(c, 0.92) : c);
    }
    g.disc(x, z, 1.4, y + h, y + h, C.ROPE); g.disc(x, z, 2, y + h + 1, y + h + 2, mul(c, 1.06)); g.set(x, y + h + 2, z, mul(c, 0.7));
  }
  function slate(g, x, y, z, marks) {                    // a little price slate on a stick
    g.box(x, y, z, x, y + 3, z, C.OAK_D);
    g.box(x - 3, y + 4, z, x + 3, y + 8, z, (X, Y) => Math.abs(X - x) === 3 || Y === y + 4 || Y === y + 8 ? C.OAK : 0x2c3036);
    for (const [dx, dy] of marks || [[-1, 6], [0, 6], [1, 6], [1, 7], [-1, 5]]) g.set(x + dx, y + dy, z, 0xe8ecec);
  }
  function scales(g, x, y, z) {                          // a brass balance
    g.box(x - 2, y, z - 1, x + 2, y, z + 1, C.BRASS_D); g.box(x, y + 1, z, x, y + 12, z, C.BRASS); g.box(x - 7, y + 12, z, x + 7, y + 12, z, C.BRASS); g.set(x, y + 13, z, 0xe8c86a);
    for (const s of [-1, 1]) { const yy = s > 0 ? 4 : 5; for (let k = yy; k < 12; k++) g.set(x + s * 7, y + k, z, C.BRASS_D); g.disc(x + s * 7, z, 2.6, y + yy, y + yy, C.BRASS); tube(g, x + s * 7, z, 2.6, 1, y + yy + 1, y + yy + 1, 0xe8c86a); }
  }
  /* a bloom, its middle at (x, y, z): the stem is the caller's */
  function bloom(g, x, y, z, kind, c) {
    if (kind === 'rose') { g.box(x - 1, y, z - 1, x + 1, y + 1, z + 1, (X, Y, Z) => (X + Z + Y) & 1 ? mul(c, 0.82) : c); for (const [a, b] of [[-1, -1], [1, 1]]) g.del(x + a, y + 1, z + b); g.set(x, y + 2, z, mul(c, 1.15)); g.set(x, y - 1, z, C.LEAF_D); }
    else if (kind === 'daisy') { for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.set(x + a, y, z + b, c); for (const [a, b] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) g.set(x + a, y, z + b, mul(c, 0.92)); g.set(x, y, z, 0xf0c030); g.set(x, y + 1, z, 0xf6d24a); }
    else if (kind === 'tulip') { g.box(x, y, z, x + 1, y + 1, z + 1, c); g.set(x, y + 2, z, mul(c, 1.15)); g.set(x + 1, y + 2, z + 1, mul(c, 1.15)); }
    else if (kind === 'lavender') for (let k = 0; k < 5; k++) { g.set(x + (k & 1), y + k, z, k & 1 ? mul(c, 1.2) : c); if (k < 3) g.set(x, y + k, z + 1, mul(c, 0.85)); }
    else if (kind === 'sun') { for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; g.set(R(x + Math.cos(a) * 2.4), R(y + Math.sin(a) * 2.4), z, k & 1 ? 0xf6c830 : 0xe8a820); } for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { g.set(x + a, y + b, z, 0x5a3418); g.set(x + a, y + b, z - 1, C.LEAF); } g.set(x, y, z + 1, 0x6e4420); }
    else { g.set(x, y, z, c); g.set(x, y + 1, z, mul(c, 1.15)); }
  }
  /* a bunch of flowers rising from (x, y, z), spreading to radius r at height h */
  function bunch(g, x, y, z, r, h, kind, cols, n, seed) {
    g.ell(x, y + h * 0.3, z, r * 0.8, h * 0.34, r * 0.8, (X, Y, Z) => Y < y ? -1 : H(X >> 1, Y, Z >> 1) < 0.4 ? C.LEAF_D : H(X, Y >> 1, Z) < 0.3 ? C.LEAF_L : C.LEAF);      // a mound of leaves
    for (let k = 0; k < n; k++) {
      const a = k * 2.4 + seed, d = Math.sqrt((k + 0.4) / n) * r, hh = h * (0.98 - 0.3 * (d / r) * (d / r)), X = R(x + Math.cos(a) * d), Z = R(z + Math.sin(a) * d), Y = R(y + hh);
      const base = y + h * 0.3 + h * 0.34 * Math.sqrt(Math.max(0, 1 - (d / (r * 0.85)) ** 2));
      if (Y - 1 > base) g.box(X, R(base), Z, X, Y - 1, Z, C.STEM);
      bloom(g, X, Y, Z, kind, cols[k % cols.length]);
    }
  }
  function clothRoll(g, x0, x1, y, z, r, c, pat) {       // a bolt of cloth lying along x
    for (let x = x0; x <= x1; x++) for (let Y = -Math.ceil(r); Y <= r; Y++) for (let Z = -Math.ceil(r); Z <= r; Z++) {
      const d = Math.hypot(Y, Z); if (d > r + 0.3) continue;
      const end = x === x0 || x === x1;
      g.set(x, y + R(r) + Y, z + Z, end ? (d < 1 ? C.OAK_D : (R(d) & 1) ? mul(c, 0.78) : mul(c, 1.1)) : pat === 'stripe' ? ((x - x0) % 5 < 2 ? mix(c, 0xffffff, 0.55) : c) : pat === 'dots' ? (((x - x0) % 4 === 1 && (Y + Z + 20) % 3 === 0) ? 0xf6e6b8 : c) : pat === 'edge' ? (x - x0 < 3 || x1 - x < 3 ? C.BRASS : c) : c);
    }
  }
  function folded(g, x, y, z, w, d, cols) {              // folded cloths in a stack
    cols.forEach((c, i) => { const yy = y + i * 2, o = i & 1; g.box(x + o, yy, z, x + w - 1, yy + 1, z + d - 1 - o, (X, Y, Z) => Z === z + d - 1 - o ? (Y === yy ? mul(c, 0.72) : mul(c, 1.08)) : (X === x + w - 2 ? mix(c, 0xffffff, 0.45) : Y === yy ? mul(c, 0.85) : c)); });
  }

  /* ------------------------------------------------------------ the stalls -- */
  /* a market stall, 2.4 m wide: a counter on planked legs, a drape in its colours, four posts, a striped awning with a
     scalloped edge (high enough for a top hat). Customers stand at +z, the seller at -z */
  const TOP = 38;                                         // the counter's first free row (0.91 m up)
  function stallGrid(stripe) {
    const g = G(), W2 = 50, white = C.CREAM;
    g.box(-W2, 35, -23, W2, 37, 22, (x, y, z) => y < 37 && (z === -23 || z === 22 || Math.abs(x) === W2) ? C.OAK_D : plank(z + 23, 9, 3, C.OAK_L));
    for (const x of [-W2 + 2, 0, W2 - 2]) for (const z of [-20, 19]) g.box(x - 1, 0, z - 1, x + 1, 34, z + 1, C.OAK_D);
    for (const z of [-20, 19]) g.box(-W2 + 2, 10, z, W2 - 2, 12, z, C.OAK_D);
    g.box(-W2 + 2, 11, -20, W2 - 2, 11, 19, (x, y, z) => plank(z + 20, 8, 5, C.OAK));            // the shelf below
    // the drape over the front: stripes, a gold braid, a scalloped hem
    for (let x = -W2; x <= W2; x++) {
      const i = Math.floor((x + W2) / 8), u = ((x + W2) % 8) - 3.5, hem = 14 + R(u * u * 0.22), c = i & 1 ? white : stripe;
      for (let y = hem; y <= 36; y++) g.set(x, y, 23, y === hem ? mul(c, 0.8) : y === 33 ? C.BRASS : (u === -3.5 ? mul(c, 0.86) : c));
      g.set(x, 37, 23, mul(stripe, 0.8)); g.set(x, 38, 23, mul(stripe, 0.8));
    }
    // the posts, their braces, the beams
    const back = 114, front = 103;
    for (const s of [-1, 1]) {
      for (const [z, h] of [[-24, back - 2], [24, front - 1]]) {
        const x = s * 51; g.box(x - 1, 0, z - 1, x + 1, h, z + 1, (X, Y) => Y % 19 === 0 ? C.DARK : C.OAK_D); g.box(x - 2, 0, z - 2, x + 2, 2, z + 2, C.DARK);
        for (let k = 0; k < 10; k++) g.box(x - s * (2 + k), h - 14 + k, z, x - s * (2 + k), h - 12 + k, z, C.OAK_D);
      }
      for (let z = -23; z <= 24; z++) { const y = back - 2 - R((z + 24) * (back - front) / 48); g.box(s * 51, y, z, s * 51, y + 1, z, C.OAK_D); }
    }
    g.box(-52, back - 3, -24, 52, back - 1, -24, C.OAK_D); g.box(-52, front - 2, 24, 52, front - 1, 24, C.OAK_D);
    // the awning
    const ay = z => back + 1 - R((z + 28) * (back - front + 1) / 60);
    for (let x = -55; x <= 55; x++) {
      const i = Math.floor((x + 55) / 8), c = i & 1 ? white : stripe, seam = (x + 55) % 8 === 0;
      for (let z = -28; z <= 36; z++) { g.set(x, ay(z), z, seam ? mul(c, 0.88) : c); if (z < 36 && ay(z + 1) < ay(z)) g.set(x, ay(z) - 1, z, seam ? mul(c, 0.88) : c); }
      const u = ((x + 55) % 8) - 3.5, hang = 7 - R(u * u * 0.3), y0 = ay(36);
      for (let k = 1; k <= hang; k++) g.set(x, y0 - k, 36, k === hang ? C.BRASS : k === 1 ? mul(c, 0.86) : c);
    }
    return g;
  }
  const GOODS = {
    fruit(g) {
      const row = (z0, y, list) => list.forEach(([x, fill, pitch], i) => tray(g, x, y, z0, 18, 17, 6, pitch, fill, i + z0 + 40));
      row(4, TOP, [
        [-48, (q, x, y, z, r) => F.apple(q, x, y, z, r < 0.7 ? 0xc8303a : 0xd8783a, r < 0.4), 4], [-29, (q, x, y, z) => F.pear(q, x, y, z), 4],
        [-10, (q, x, y, z) => F.orange(q, x, y, z, 0xee8a2c), 4], [9, (q, x, y, z) => F.lemon(q, x, y, z), 5], [28, (q, x, y, z) => F.tomato(q, x, y, z), 4],
      ]);
      g.box(-50, TOP, -15, 50, TOP + 3, 2, (x, y, z) => y === TOP + 3 ? plank(x + 50, 10, 9, C.OAK_L) : z === 2 ? C.OAK : C.OAK_D);
      row(-15, TOP + 4, [
        [-48, (q, x, y, z, r) => F.grapes(q, x, y, z, r < 0.5 ? 0x6a2a7a : 0x8fb84a), 5], [-29, (q, x, y, z) => F.plum(q, x, y, z), 2.8], [-10, (q, x, y, z) => F.onion(q, x, y, z), 4],
      ]);
      for (const [x, z, r] of [[13, -9, 4.5], [22, -5, 3.6], [15, -1, 3]]) F.pumpkin(g, x, TOP + 4, z, r);
      F.melon(g, 30, TOP + 4, -8, 3.6); F.melon(g, 33, TOP + 4, -1, 3.2);
      for (const [x, z] of [[41, -10], [47, -6], [41, -3]]) F.cabbage(g, x, TOP + 4, z);
      scales(g, 42, TOP + 4, -12); for (const [x, z] of [[40, 14], [46, 11]]) F.cabbage(g, x - 1, TOP + 6, z, 0xa86a9a);
      slate(g, -40, TOP + 4, 21); slate(g, -2, TOP + 4, 21, [[-1, 5], [-1, 6], [-1, 7], [1, 5], [1, 7]]); slate(g, 36, TOP + 4, 21);
      // below: carrots and leeks in a crate, a sack of onions; garlic strings on the posts
      tray(g, -44, 12, -4, 22, 18, 7, 5, (q, x, y, z) => F.carrot(q, x, y, z - 3), 71);
      sackAt(g, 6, 12, 2, 7, 13); for (const [x, z] of [[5, 1], [8, 3], [6, 5], [3, 3]]) F.onion(g, x, 23, z);
      for (const s of [-1, 1]) for (let k = 0; k < 8; k++) { ball(g, s * 47, 92 - k * 4, 25, 1.2, k & 1 ? 0xf1e6d8 : 0xe6d2c4); g.set(s * 47, 94 - k * 4, 25, 0x9a8a5a); }
    },
    fish(g) {
      // two terraces of chipped ice in a wooden tray
      const ice = (x, y, z) => H(x >> 1, y, z >> 1) < 0.35 ? 0xcfe2f0 : H(x, y, z) < 0.3 ? 0xf6fbff : 0xe2eff8;
      g.box(-48, TOP, -14, 48, TOP + 2, 20, (x, y, z) => (Math.abs(x) >= 47 || z === -14 || z === 20) ? C.OAK_D : y === TOP + 2 ? ice(x, y, z) : 0xe2eff8);
      g.box(-46, TOP + 3, -13, 46, TOP + 5, 2, (x, y, z) => y === TOP + 5 || z === 2 ? ice(x, y, z) : 0xe2eff8);
      for (let x = -46; x <= 46; x++) for (let z = -13; z <= 19; z++) if (H(x, 3, z) < 0.025) g.set(x, z <= 2 ? TOP + 6 : TOP + 3, z, 0xf2f9ff);
      for (let i = 0; i < 6; i++) F.trout(g, -41 + i * 10, TOP + 3, 11 + (i & 1), { len: 18, w: 3.2, c: i % 3 === 1 ? 0x7a8a6a : 0x93a2ac, spot: 0x4a5a5c, dir: 1 });
      for (let i = 0; i < 4; i++) F.trout(g, -40 + i * 12, TOP + 6, -5, { len: 18, w: 4.2, c: 0x7f93a8, belly: 0xf0d0c4, spot: 0x55677a, dir: -1 });
      for (const [x, z] of [[8, -9], [10, -2], [18, -7]]) F.crab(g, x, TOP + 6, z);
      for (let i = 0; i < 16; i++) F.mussel(g, 26 + (i * 5) % 12, TOP + 6 + (i > 10 ? 1 : 0), -11 + ((i * 7) % 11));
      for (let i = 0; i < 3; i++) F.trout(g, 20 + i * 5, TOP + 3, 11, { len: 12, w: 1.8, c: 0x9fb4c8, dir: -1 });     // little silver ones
      for (let k = 0; k < 26; k++) { const a = k * 0.5, r = 1.5 + k * 0.12, X = R(41 + Math.cos(a) * r), Z = R(-5 + Math.sin(a) * r); g.set(X, TOP + 6, Z, k & 1 ? 0x4a4a3a : 0x5a5a48); g.set(X, TOP + 7, Z, 0x6a6a56); }   // an eel, coiled
      F.lemon(g, 37, TOP + 3, 8); F.lemon(g, 42, TOP + 3, 11); g.disc(38, 14, 1.4, TOP + 3, TOP + 3, 0xfaf0b0); g.disc(43, 16, 1.4, TOP + 3, TOP + 3, 0xfaf0b0);
      for (const [x, z] of [[-30, 5], [2, 5], [30, 4]]) for (let k = 0; k < 5; k++) g.set(x + (k % 3) - 1, TOP + 4 + (k >> 1), z + (k & 1), k & 1 ? 0x5a9a4a : 0x7ab85a);      // parsley
      // a board, a knife, a fillet at the seller's side
      g.box(-30, TOP, -22, -8, TOP, -16, C.END); F.trout(g, -24, TOP + 1, -19, { len: 5, c: 0xf0a08a, belly: 0xf6c0ae, w: 1.8 }); g.box(-18, TOP + 1, -20, -12, TOP + 1, -19, C.STEEL_L); g.box(-11, TOP + 1, -20, -8, TOP + 1, -20, C.DARK);
      slate(g, -20, TOP + 1, 21); slate(g, 16, TOP + 1, 21, [[-1, 5], [0, 6], [1, 7], [-1, 7], [1, 5]]);
      // fish drying on a line under the front beam, a tub with tails over its edge
      for (let i = 0; i < 9; i++) {
        const x = -40 + i * 10, L = 9 + (i & 1) * 2; g.set(x, 100, 24, C.ROPE);
        for (let k = 0; k < L; k++) { const w = Math.sin((k + 1) / (L + 1) * Math.PI) * 1.7; for (let X = -Math.floor(w); X <= Math.floor(w); X++) g.set(x + X, 99 - k, 25, X === 0 ? 0xa8906a : 0xc2ac84); }
        g.set(x - 1, 99 - L, 25, 0x8a744e); g.set(x + 1, 99 - L, 25, 0x8a744e);
      }
      bucketAt(g, -30, 12, 2, 8, 12, { fill: 0x7aa0b8 }); for (const [x, z] of [[-33, 1], [-28, 4], [-30, -2]]) { g.box(x, 22, z, x, 26, z, 0x8a9aa4); g.set(x - 1, 27, z, 0x7a8a94); g.set(x + 1, 27, z, 0x7a8a94); }
    },
    cloth(g) {
      [[0xb83a5a, 'edge'], [0x3a6ab8, 'stripe'], [0xd8b84a, null], [0x4a9a6a, 'dots']].forEach(([c, p], i) => clothRoll(g, -46 + i * 23, -26 + i * 23, TOP, -12, 3.4, c, p));
      [[0x8a4ab8, 'stripe'], [0xe8e0d0, 'edge'], [0xc86a3a, 'dots'], [0x2a3a5a, 'stripe']].forEach(([c, p], i) => clothRoll(g, -44 + i * 23, -24 + i * 23, TOP, -4, 3.4, c, p));
      [[0x4a9a9a, 'edge'], [0xd87aa0, 'stripe'], [0x9a3a3a, null]].forEach(([c, p], i) => clothRoll(g, -38 + i * 25, -18 + i * 25, TOP + 6, -8, 3.4, c, p));
      [[0xd87aa0, 0xe8e0d0, 0x8a4ab8], [0x3a6ab8, 0xd8b84a, 0x3a6ab8, 0xf1ece2], [0x4a9a6a, 0x9ac87a], [0xb83a5a, 0xe86a6a, 0xf1ece2], [0x2a3a5a, 0x5a7ab8, 0xc8d4e8]].forEach((cols, i) => folded(g, -47 + i * 15, TOP, 4, 12, 13, cols));
      // ribbon spools on a rack, a pincushion, shears
      g.box(28, TOP, 4, 46, TOP, 14, C.OAK_D);
      [0xd83a50, 0xf0c030, 0x3a8ac8, 0x8a4ab8, 0x4aa86a, 0xf08ac0].forEach((c, i) => { const x = 31 + (i % 3) * 6, z = 7 + Math.floor(i / 3) * 5; g.disc(x, z, 2, TOP + 1, TOP + 1, C.OAK_L); g.disc(x, z, 1.4, TOP + 2, TOP + 4, (X, Y) => Y & 1 ? c : mul(c, 0.85)); g.disc(x, z, 2, TOP + 5, TOP + 5, C.OAK_L); });
      ball(g, 40, TOP + 1, 18, 1.8, 0xd83a50, 1.2); for (const [x, z] of [[39, 18], [41, 19], [40, 17]]) g.set(x, TOP + 4, z, 0xe8ecf0);
      g.box(14, TOP, 19, 19, TOP, 19, C.STEEL_L); g.box(14, TOP, 20, 18, TOP, 20, C.STEEL); g.box(20, TOP, 18, 22, TOP, 18, C.IRON); g.box(20, TOP, 21, 22, TOP, 21, C.IRON); g.set(23, TOP, 19, C.IRON); g.set(23, TOP, 20, C.IRON);
      // scarves hung along the front beam
      const cols = [0xb83a5a, 0xd8b84a, 0x3a6ab8, 0xe8e0d0, 0x8a4ab8, 0x4a9a6a, 0xd87aa0];
      for (let i = 0; i < 7; i++) {
        const x = -42 + i * 14, h = 16 + (i * 5) % 9, c = cols[i];
        for (let X = 0; X < 6; X++) for (let k = 0; k < h; k++) g.set(x + X, 101 - k, 25, k > h - 3 ? ((X & 1) ? -1 : 0xf1e6cc) : (k % 8 === 4 ? mix(c, 0xffffff, 0.5) : X === 2 ? mul(c, 0.85) : c));
      }
      // a basket of wool and more folded cloth below
      basket(g, -20, 12, 2, 9, 10, { fill: 0x8e6a3c }); [0xd83a50, 0x3a8ac8, 0xf0e6d0, 0xe0a030, 0x7a5ab0].forEach((c, i) => { const a = i / 5 * TAU; g.ell(-20 + Math.cos(a) * 4, 22, 2 + Math.sin(a) * 4, 2.2, 2.2, 2.2, (X, Y, Z) => (X + Y + Z) % 3 === 0 ? mul(c, 0.8) : c); });
      folded(g, 8, 12, -6, 18, 16, [0x6a4a32, 0x8a6a4a, 0xa88a5a, 0x5a5a6a]);
    },
    flowers(g) {
      const B = [['rose', [0xd8304a, 0xe8506a]], ['tulip', [0xf0c030, 0xe86a3a, 0xf08ac0]], ['daisy', [0xfdfaf2]], ['lavender', [0x8a6ad0, 0x9a7ae0]], ['rose', [0xf6e6ea, 0xf4b8cc]]];
      B.forEach(([k, cols], i) => { const x = -40 + i * 20; g.box(x - 8, TOP, -18, x + 8, TOP + 3, -4, (X, Y) => Y === TOP + 3 ? C.OAK_L : C.OAK_D); bucketAt(g, x, TOP + 4, -11, 6.5, 9, { fill: C.LEAF_D }); bunch(g, x, TOP + 11, -11, 7, 10, k, cols, 11, i + 3); });
      const B2 = [['tulip', [0xd83a50, 0xf6f0ea]], ['daisy', [0xf0c8e0, 0xfdfaf2]], ['lavender', [0x7a5ac8]], ['rose', [0xf0c030, 0xf6d868]], ['tulip', [0x9a5ad0, 0xc88af0]]];
      B2.forEach(([k, cols], i) => { const x = -40 + i * 20; bucketAt(g, x, TOP, 6, 5.5, 8, { fill: C.LEAF_D }); bunch(g, x, TOP + 6, 6, 5.6, 9, k, cols, 8, i + 23); });
      // posies wrapped in paper, along the front
      for (let i = 0; i < 4; i++) {
        const x = -30 + i * 20;
        for (let k = 0; k < 7; k++) { const w = R(0.5 + k * 0.4); g.box(x - w, TOP, 21 - k, x + w, TOP + (k > 3 ? 1 : 0), 21 - k, (k + i) & 1 ? 0xe8d8b8 : 0xdcc8a0); }
        g.box(x - 1, TOP + 1, 19, x + 1, TOP + 1, 19, [0xd83a50, 0x3a6ab8, 0x8a4ab8, 0xe8b030][i]);
        for (const [dx, dz] of [[-3, 0], [0, 0], [3, 0], [-1, -2], [2, -2]]) bloom(g, x + dx, TOP + 2, 14 + dz, 'daisy', [0xf08ac0, 0xfdfaf2, 0xf0d04a, 0xe8506a][(i + dx + 4) % 4]);
      }
      // sunflowers in a tall jug at the end, hanging baskets under the front beam
      bucketAt(g, 46, TOP, 16, 3.4, 9, { fill: C.LEAF_D }); for (const [dx, h] of [[-2, 12], [1, 16], [3, 10]]) { g.line(46, TOP + 7, 16, 46 + dx, TOP + 8 + h, 16, C.STEM); bloom(g, 46 + dx, TOP + 8 + h, 17, 'sun'); }
      for (const x of [-28, 28]) {
        for (let y = 92; y <= 100; y++) g.set(x, y, 26, C.ROPE); basket(g, x, 82, 26, 5, 6, { fill: C.LEAF_D });
        for (let k = 0; k < 26; k++) { const a = k * 2.4, r = 2 + (k % 5), y = 88 - Math.max(0, r - 4) * 2 + (k % 3); g.set(R(x + Math.cos(a) * r), R(y), R(26 + Math.sin(a) * r), [C.LEAF, C.LEAF_L, 0xf08ac0, 0xd8304a, 0xfdfaf2][k % 5]); }
      }
      // pots below
      for (const [x, c] of [[-38, 0xb8603a], [-26, 0xa85432], [-14, 0xc06a42]]) { for (let k = 0; k < 9; k++) tube(g, x, 2, 3.4 + k * 0.25, 1.3, 12 + k, 12 + k, k > 6 ? mul(c, 1.12) : c); g.disc(x, 2, 4, 19, 19, 0x4a3424); bunch(g, x, 20, 2, 3.4, 4, 'bud', [0xf0d04a, 0xf08ac0], 5, x + 60); }
    },
    bread(g) {
      // the baker's half: a floured board, dough, a rolling pin, a bowl
      g.box(-24, TOP, -22, 20, TOP, -6, (x, y, z) => x === -24 || x === 20 || z === -22 || z === -6 ? C.OAK_L : H(x >> 1, 1, z >> 1) < 0.55 ? 0xf1e8d6 : C.END);
      ball(g, -2, TOP + 2, -14, 5.5, 0xf2e2bc, 2.2, 4); for (const [x, z] of [[-4, -14], [0, -13], [2, -15]]) g.set(x, TOP + 5, z, 0xe2cd9e);
      for (let x = 8; x <= 18; x++) for (let Y = 0; Y <= 2; Y++) for (let Z = -1; Z <= 1; Z++) if (!(Math.abs(Z) === 1 && Y !== 1)) g.set(x, TOP + 1 + Y, -16 + Z, C.END);
      g.box(5, TOP + 2, -16, 7, TOP + 2, -16, C.OAK); g.box(19, TOP + 2, -16, 21, TOP + 2, -16, C.OAK);
      for (let k = 0; k < 5; k++) tube(g, -34, -14, 4 + k * 0.5, 1.3, TOP + k, TOP + k, k === 4 ? 0xd8dee6 : k === 2 ? 0x4a6aa0 : 0xeef0f2); g.disc(-34, -14, 4.6, TOP + 3, TOP + 3, 0xf6efe0);
      for (const [x, z] of [[14, -10], [17, -11], [11, -9]]) F.bun(g, x, TOP + 1, z, 0xf0deb4);                   // raw buns
      sackAt(g, 36, TOP, -14, 6, 11, 0xf1ece2);
      // the customers' half: a cloth, then baskets and boards of loaves
      g.box(-49, TOP, -3, 49, TOP, 21, (x, y, z) => z > 18 ? (z === 20 ? 0x3f9a5a : 0xf6f0e2) : ((x >> 2) + (z >> 2)) & 1 ? 0xf6f0e2 : 0xece2cc);
      basket(g, -40, TOP + 1, 4, 7.5, 9, { fill: 0xe8dcc0 });
      [[-2, -2], [2, -1], [0, 2], [-3, 2], [3, 3], [-1, 0]].forEach(([dx, dz], i) => F.stickBread(g, -40 + dx, TOP + 5, 4 + dz, [dx * 1.5, dz * 1.2], 20 - (i % 3) * 2));
      for (const [x, z, y] of [[-25, 2, 0], [-25, 11, 0], [-17, 6, 0], [-21, 6, 3]]) F.boule(g, x, TOP + 1 + y, z, 3.6);
      g.box(-10, TOP + 1, -1, 8, TOP + 1, 12, (x, y, z) => x === -10 || x === 8 || z === -1 || z === 12 ? C.OAK_D : C.OAK);
      for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) F.honeybun(g, -7 + i * 4.6, TOP + 2, 2 + k * 4.4);
      for (const [x, y] of [[12, 0], [17, 0], [14, 2]]) F.batard(g, x, TOP + 1 + y, 4, 0xb8752e); F.batard(g, 22, TOP + 1, 5, 0x8a5426);
      F.plait(g, 28, TOP + 1, -2, 16); F.plait(g, 33, TOP + 1, -1, 14);
      F.pie(g, 42, TOP + 1, 3, 0xa02838); F.pie(g, 42, TOP + 1, 13, 0x5a2a6a);
      for (let i = 0; i < 4; i++) F.pretzel(g, -43 + i * 11, TOP + 1, 16);
      for (const [x, z] of [[4, 16], [8, 16], [6, 15]]) F.bun(g, x, TOP + 1 + (z === 15 ? 2 : 0), z);
      for (let i = 0; i < 4; i++) F.jar(g, 13 + i * 4, TOP + 1, 17, 0xe0a030, i & 1 ? 0xb83a5a : 0xe8dcc0);
      F.cake(g, 32, TOP + 1, 17);
      slate(g, -33, TOP + 1, 21); slate(g, 26, TOP + 1, 14, [[-1, 6], [0, 6], [1, 6], [0, 5], [0, 7]]);
      // pretzels and plaits hung along the front beam; flour sacks and loaves below
      for (let i = 0; i < 8; i++) {
        const x = -42 + i * 12; g.box(x, 99, 25, x, 100, 25, C.ROPE);
        if (i & 1) { for (let k = 0; k < 12; k++) g.box(x - 1 + (k & 1), 98 - k, 25, x + (k & 1), 98 - k, 25, k % 3 ? 0xc8883c : 0xa8682a); }
        else ['.###.###.', '##..#..##', '#..#.#..#', '##.#.#.##', '.##...##.', '..#####..'].forEach((r, j) => [...r].forEach((ch, k) => { if (ch === '#') g.set(x + k - 4, 98 - j, 25, (k * 5 + j * 2) % 11 === 0 ? 0xf6ecd8 : j & 1 ? 0x94501f : 0xa65e28); }));
      }
      sackAt(g, -36, 12, 0, 8, 16, 0xe8dcc0); sackAt(g, -18, 12, 3, 7, 14, 0xe2d4b4); basket(g, 12, 12, 2, 9, 8, { fill: 0xe8dcc0 }); for (const [x, z] of [[8, 0], [14, -1], [12, 5]]) F.boule(g, x, 19, z, 3.4);
    },
  };
  function goodsGrid(kind) { const g = G(); GOODS[kind](g); return g; }

  /* what stands on the shops' front counters (a shelf 3 m long, 10 deep) */
  function displayGrid(kind) {
    const g = G();
    if (kind === 'bread') {
      [0, 1, 2].forEach(i => { const x = -58 + i * 12; g.box(x - 5, 0, 1, x + 5, 0, 9, C.OAK); F.boule(g, x, 1, 5, 3.4); });
      for (let i = 0; i < 5; i++) F.batard(g, -24 + i * 5, 0, 5, i & 1 ? 0xb8752e : 0xc8883c);
      basket(g, 6, 0, 5, 5, 6, { fill: 0xe8dcc0 }); for (const [dx, dz] of [[-2, 0], [1, -1], [2, 2], [-1, 2]]) F.bun(g, 6 + dx, 5, 5 + dz);
      F.pie(g, 18, 0, 5, 0xa02838); F.cake(g, 30, 0, 5); F.plait(g, 40, 0, -1, 12); for (let i = 0; i < 3; i++) F.jar(g, 47 + i * 4, 0, 4, 0xe0a030, 0xb83a5a);
    } else if (kind === 'cloth') {
      [[0xb83a5a, 'edge'], [0x3a6ab8, 'stripe'], [0x8a4ab8, 'dots'], [0xd8b84a, null], [0x4a9a6a, 'stripe']].forEach(([c, p], i) => clothRoll(g, -58 + i * 22, -40 + i * 22, 0, 4, 2.4, c, p));
      folded(g, 50, 0, 0, 10, 9, [0xe8e0d0, 0xd87aa0, 0x5a7ab8]);
    } else {
      F.flask(g, -56, 0, 5, 0xc83a6a); F.flask(g, -49, 0, 4, 0x3a8ac8); F.flask(g, -43, 0, 6, 0x5ac86a); F.bottle(g, -37, 0, 5, 0x3a6a3a); F.bottle(g, -33, 0, 4, 0x6a3a2a, 6);
      for (let i = 0; i < 4; i++) F.jar(g, -26 + i * 4, 0, 5, [0xe0a030, 0xa03040, 0x7a9a3a, 0x5a3a7a][i], i & 1 ? 0xb83a5a : 0xe8dcc0);
      F.cheese(g, -5, 0, 5, 4.4); for (let i = 0; i < 3; i++) F.candle(g, 4 + i * 4, 0, 4 + (i & 1) * 2, 5 + i);
      for (let k = 0; k < 40; k++) { const a = k * 0.55, r = 3.6; g.set(R(20 + Math.cos(a) * r), Math.floor(k / 12), R(5 + Math.sin(a) * r), k & 1 ? C.ROPE : mul(C.ROPE, 0.8)); }
      [[0x7a2a3a, 0], [0x2a4a6a, 2], [0x3a5a3a, 4]].forEach(([c, y], i) => g.box(27 + i, y, 1, 35 - i, y + 1, 8, (X, Y, Z) => Z === 8 && Y === y ? 0xf1e6cc : X === 35 - i ? 0xf1e6cc : c));
      for (let i = 0; i < 3; i++) F.mug(g, 41 + i * 5, 0, 5, [0xc87a4a, 0x8a9ab0, 0xe8dcc0][i]);
      g.disc(58, 5, 2.4, 0, 0, C.IRON); g.box(57, 1, 4, 59, 5, 6, (X, Y, Z) => X !== 58 && Z !== 5 ? C.IRON : 0xffe0a0); g.disc(58, 5, 2, 6, 6, C.IRON); g.set(58, 7, 5, C.IRON);
    }
    return g;
  }

  /* ------------------------------------------------------ the square's things -- */
  function benchGrid() {                                 // seat 0.5 m up, 1.7 m wide: oak slats on curled iron ends
    const g = G();
    for (let z = -8; z <= 9; z++) if ((z + 8) % 6 < 5) g.box(-36, 19, z, 36, 20, z, plank(Math.floor((z + 8) / 6) * 3 + 1, 3, 4, C.OAK_L));
    for (const [y0, z] of [[25, -10], [31, -11]]) g.box(-36, y0, z, 36, y0 + 4, z, (x, y) => y === y0 ? C.OAK : C.OAK_L);
    for (const s of [-1, 1]) {
      const x = s * 33;
      for (const zz of [-7, 7]) { g.box(x - 1, 0, zz, x + 1, 18, zz + 1, C.IRON); g.box(x - 1, 0, zz - 1, x + 1, 1, zz + 2, C.IRON_L); }
      g.box(x - 1, 17, -8, x + 1, 18, 9, C.IRON); g.box(x - 1, 19, -10, x + 1, 37, -9, C.IRON); g.box(x - 1, 37, -11, x + 1, 38, -9, C.IRON_L);
      for (let z = -8; z <= 9; z++) g.set(x, z > 6 ? 29 : 30, z, C.IRON); g.box(x, 21, 8, x, 29, 9, C.IRON); g.set(x, 28, 10, C.IRON); g.set(x, 27, 11, C.IRON_L);
      for (let k = 0; k < 10; k++) { const a = k / 10 * TAU * 0.8; g.set(x, R(10 + Math.sin(a) * 3), R(Math.cos(a) * 3), C.IRON); }
    }
    return g;
  }
  function wellGrid() {                                  // a round stone well under a shingled roof, a windlass and a bucket
    const g = G();
    const stone = (x, y, z) => { const row = Math.floor(y / 6), a = (Math.atan2(z, x) + Math.PI) / TAU * 16 + (row & 1) * 0.5; if (y % 6 === 5 || a % 1 < 0.1) return 0x7d766e; const t = H(Math.floor(a) % 16, row, 4); return t < 0.3 ? C.STONE_D : t < 0.75 ? C.STONE : C.STONE_L; };
    tube(g, 0, 0, 26, 7, 0, 29, stone); tube(g, 0, 0, 27, 8, 30, 33, (x, y, z) => ang(x, z, 12) & 1 ? C.STONE_L : 0xb4ada4); g.disc(0, 0, 20, 8, 8, 0x1e2c40);
    for (const s of [-1, 1]) { const x = s * 23; g.box(x - 2, 30, -2, x + 2, 96, 2, (X, Y) => Y % 22 === 0 ? C.DARK : C.OAK_D); for (let k = 0; k < 12; k++) g.box(x - s * k, 82 + k, -1, x - s * k, 84 + k, 1, C.OAK_D); }
    g.box(-30, 94, -2, 30, 97, 2, C.OAK_D);
    for (let x = -22; x <= 22; x++) for (let y = -3; y <= 3; y++) for (let z = -3; z <= 3; z++) if (Math.hypot(y, z) <= 3.2) g.set(x, 72 + y, z, Math.abs(x) < 9 ? ((x & 1) ? C.ROPE : mul(C.ROPE, 0.8)) : C.OAK);
    g.box(24, 71, -1, 29, 73, 1, C.IRON); g.box(29, 71, -1, 29, 73, 11, C.IRON); g.box(29, 71, 10, 36, 73, 12, C.OAK_L);       // the crank
    for (let y = 46; y < 69; y++) g.set(0, y, 3, y & 1 ? C.ROPE : mul(C.ROPE, 0.8));
    for (let k = 0; k <= 16; k++) { const a = k / 16 * Math.PI; g.set(R(Math.cos(a) * 6), R(39 + Math.sin(a) * 7), 3, C.IRON); }
    bucketAt(g, 0, 29, 3, 6.4, 11, { fill: C.WATER });
    const shingle = (x, k) => { const row = Math.floor(k / 4), i = Math.floor((x + 200 + (row & 1) * 3) / 6), t = H(i, row, 8); return k % 4 === 0 ? 0x7a3024 : t < 0.2 ? 0x9a3c2c : 0xa8432f; };
    for (let k = 0; k <= 24; k++) for (let x = -34; x <= 34; x++) for (const s of [-1, 1]) { const z = s * (26 - k), y = 92 + R(k * 0.85); g.set(x, y, z, shingle(x, k)); g.set(x, y - 1, z, k % 4 === 0 ? 0x7a3024 : C.OAK_D); if (k % 4 === 0) g.set(x, y, z + s, shingle(x, k + 1)); }
    g.box(-35, 113, -2, 35, 114, 2, 0x8f3626);
    for (const s of [-1, 1]) for (let k = 0; k <= 22; k++) g.box(s * 30, 93, -(25 - k), s * 30, 92 + R(k * 0.85), 25 - k, (x, y, z) => Math.abs(z) < 2 || y < 96 ? C.OAK_D : C.OAK);
    return g;
  }
  function barrelGrid() {
    const g = G();
    for (let y = 0; y <= 37; y++) {
      const r = 11.2 + Math.sin(y / 37 * Math.PI) * 2.3, hoop = (y >= 4 && y <= 5) || (y >= 13 && y <= 14) || (y >= 23 && y <= 24) || (y >= 32 && y <= 33);
      tube(g, 0, 0, r + (hoop ? 0.6 : 0), y < 35 ? 99 : 2.2, y, y, (x, yy, z) => { if (hoop) return (ang(x, z, 24) === 3) ? C.IRON_L : C.IRON; const t = H(ang(x, z, 18), 5, 1); return t < 0.35 ? C.OAK_D : t < 0.75 ? C.OAK : 0x9a6a3a; });
    }
    g.disc(0, 0, 10.4, 35, 35, (x, y, z) => Math.abs(z) > 6 && Math.abs(z) < 8 ? C.OAK_D : plank(x + 40, 6, 2, C.OAK_L)); g.disc(0, 0, 10, 1, 1, C.OAK_D);
    g.box(-1, 17, 14, 1, 19, 14, C.OAK_D); g.set(0, 18, 15, C.END);                          // the bung
    return g;
  }
  function crateGrid(open) {                             // a planked crate, 0.7 m; open: full of apples
    const g = G(), N = 14;
    for (let x = -N; x <= N; x++) for (let y = 0; y <= 27; y++) for (let z = -N; z <= N; z++) {
      const ex = Math.abs(x) >= N - 1, ey = y === 0 || (y === 27 && !open), ez = Math.abs(z) >= N - 1; if (!ex && !ey && !ez) continue;
      g.set(x, y, z, ey && !ex && !ez ? plank(x + 40, 7, 3, C.OAK_L) : y % 7 === 0 && y > 0 ? 0x5a3a20 : H(Math.floor(y / 7), ex ? 1 : 2, x + z > 0 ? 1 : 0) < 0.5 ? 0x9c6a38 : C.OAK_L);
    }
    for (const s of [-1, 1]) for (const t of [-1, 1]) for (let y = 0; y <= 27; y++) for (let k = N - 4; k <= N; k++) { g.set(s * (N + 1), y, t * k, C.OAK); g.set(t * k, y, s * (N + 1), C.OAK); }        // the corner battens, and a diagonal
    for (const s of [-1, 1]) for (let y = 1; y <= 26; y++) for (let k = -1; k <= 1; k++) { const a = R(-N + 4 + (y - 1) / 25 * (2 * N - 8)) + k; if (Math.abs(a) < N - 4) { g.set(s * (N + 1), y, a, C.OAK_D); g.set(a, y, s * (N + 1), C.OAK_D); } }
    for (const s of [-1, 1]) for (const t of [-1, 1]) for (const y of [3, 24]) { g.set(s * (N + 2), y, t * (N - 2), C.IRON); g.set(t * (N - 2), y, s * (N + 2), C.IRON); }
    if (open) {
      g.box(-N + 2, 22, -N + 2, N - 2, 22, N - 2, C.DARK); const r = rng(77);
      for (let x = -10; x <= 10; x += 3.4) for (let z = -10; z <= 10; z += 3.4) F.apple(g, R(x + r() - 0.5), 23, R(z + r() - 0.5), r() < 0.6 ? 0xc8303a : 0x9abf3a, r() < 0.3);
      for (let x = -5; x <= 5; x += 3.4) for (let z = -5; z <= 5; z += 3.4) F.apple(g, R(x), 25, R(z), r() < 0.6 ? 0xc8303a : 0xd8583a, true);
    }
    return g;
  }
  function sacksGrid() { const g = G(); sackAt(g, -8, 0, 0, 9, 20); sackAt(g, 9, 0, 3, 8.4, 18, 0xb8a070); sackAt(g, 2, 0, -11, 8, 17, 0xcab48a); return g; }
  function basketGrid(kind) {
    const g = G();
    basket(g, 0, 0, 0, 10, 10, { fill: C.WICK_D, handle: 11 });
    if (kind === 'eggs') { g.disc(0, 0, 8, 8, 8, C.STRAW_D); for (let k = 0; k < 14; k++) { const a = k * 2.4, d = Math.sqrt(k) * 1.9; F.egg(g, R(Math.cos(a) * d), 9, R(Math.sin(a) * d), k % 3 ? 0xf2e4d0 : 0xd8b08a); } }
    else if (kind === 'veg') { for (const [x, z] of [[-4, -3], [4, 2]]) F.cabbage(g, x, 8, z); for (let k = 0; k < 3; k++) F.carrot(g, -3 + k * 3, 10, -2 + k); F.leek(g, 5, 11, -8); F.tomato(g, -4, 9, 5); F.tomato(g, 0, 9, 6); }
    else for (let k = 0; k < 16; k++) { const a = k * 2.4, d = Math.sqrt(k) * 1.9; F.apple(g, R(Math.cos(a) * d), 8 + (k < 5 ? 2 : 0), R(Math.sin(a) * d), k % 3 ? 0xc8303a : 0x9abf3a, k % 4 === 0); }
    return g;
  }
  function potGrid(kind) {                               // a glazed pot with a plant, for a doorstep
    const g = G(), c = kind === 'blue' ? 0x3a5a9a : kind === 'green' ? 0x4a7a5a : 0xb8603a;
    for (let k = 0; k < 14; k++) tube(g, 0, 0, 6 + Math.sin(k / 13 * 2.2) * 2.2, 1.6, k, k, k === 13 ? mul(c, 1.2) : k === 9 ? mul(c, 0.75) : c); g.disc(0, 0, 6, 1, 1, c);
    g.disc(0, 0, 6.6, 12, 12, 0x4a3424);
    if (kind === 'blue') bunch(g, 0, 13, 0, 7, 12, 'daisy', [0xfdfaf2, 0xf0c8e0], 12, 5);
    else if (kind === 'green') bunch(g, 0, 13, 0, 6, 16, 'lavender', [0x8a6ad0, 0x9a7ae0], 13, 9);
    else { g.ell(0, 22, 0, 7, 8, 7, (x, y, z) => H(x, y, z) < 0.18 ? -1 : H(x >> 1, y >> 1, z >> 1) < 0.4 ? C.LEAF_D : H(x, y, z) < 0.55 ? C.LEAF : C.LEAF_L); for (let k = 0; k < 12; k++) { const a = k * 2.4; g.set(R(Math.cos(a) * 6.6), 18 + (k * 5) % 11, R(Math.sin(a) * 6.6), k & 1 ? 0xd8304a : 0xe8506a); } }
    return g;
  }
  function bucketGrid() { const g = G(); bucketAt(g, 0, 0, 0, 6.6, 12, { fill: C.WATER, handle: 7 }); return g; }

  /* --------------------------------------------------------- the working places -- */
  function anvilGrid() {                                 // an anvil on a banded stump, its face 0.86 m up, the horn to +x
    const g = G();
    for (let y = 0; y <= 23; y++) g.disc(0, 0, y < 3 ? 10.4 : 9.6, y, y, (x, yy, z) => { if (yy === 23) { const d = Math.hypot(x, z); return d > 8.6 ? C.BARK : (R(d * 0.9) & 1) ? C.END : 0xc49a64; } if (yy === 5 || yy === 18) return C.IRON; return (ang(x, z, 22) & 1) ? C.BARK : C.BARK_D; });
    const A = 0x4a4a54, AL = 0x6a6a76, AD = 0x34343c;
    g.box(-7, 24, -5, 7, 25, 5, AD); g.box(-5, 26, -4, 5, 26, 4, A); g.box(-3, 27, -3, 3, 29, 3, A); g.box(-6, 30, -4, 6, 30, 4, A);
    g.box(-10, 31, -4, 8, 35, 4, (x, y) => y === 35 ? AL : A); g.box(9, 33, -4, 10, 34, 4, A);
    for (let k = 0; k < 9; k++) { const w = Math.max(0, R(3.4 - k * 0.42)); g.box(11 + k, 34 - R(w * 0.7) + (k > 5 ? 1 : 0), -w, 11 + k, 34, w, (x, y) => y === 34 ? AL : A); }
    g.set(-8, 35, 0, 0x14141a); g.set(-6, 35, 2, 0x14141a);                              // the hardy hole
    g.box(-9, 36, -1, 4, 36, 1, (x) => x < -4 ? 0x4a3a3a : VX.glow(x > 1 ? 0xffd27a : x > -1 ? 0xff9a3a : 0xd0502a));        // the hot iron
    return g;
  }
  function quenchGrid() {                                // the smith's trough of water, tongs hung on its edge
    const g = G();
    g.box(-16, 0, -9, 16, 19, 9, (x, y, z) => { const e = Math.abs(x) >= 15 || Math.abs(z) >= 8; if (!e) return y === 16 ? (H(x >> 2, y, z >> 1) < 0.2 ? 0x4a6a88 : 0x33506c) : y === 0 ? C.OAK_D : -1; return y === 4 || y === 15 ? C.IRON : plank(Math.abs(z) >= 8 ? x + 60 : z + 60, 6, 6, C.OAK_D); });
    for (const s of [0, 4]) g.box(6 + s, 6, 10, 6 + s, 22, 10, C.IRON); g.box(7, 20, 10, 9, 20, 10, C.IRON_L); g.box(6, 22, 9, 6, 22, 10, C.IRON);
    return g;
  }
  function grindGrid() {                                 // a grindstone in its frame
    const g = G();
    for (const s of [-1, 1]) { for (let k = 0; k < 26; k++) { g.box(R(-12 + k * 0.45), k, s * 6, R(-10 + k * 0.45), k, s * 6, C.OAK_D); g.box(R(10 - k * 0.45), k, s * 6, R(12 - k * 0.45), k, s * 6, C.OAK_D); } g.box(-3, 24, s * 6, 3, 28, s * 6, C.OAK); }
    for (let z = -2; z <= 2; z++) for (let x = -13; x <= 13; x++) for (let y = -13; y <= 13; y++) { const d = Math.hypot(x, y); if (d <= 12.4) g.set(x, 26 + y, z, d < 2 ? C.IRON : d > 11 ? C.STONE_L : (R(d / 2) & 1) ? C.STONE : 0x9c958c); }
    g.box(0, 26, -9, 0, 26, 8, C.IRON); g.box(0, 26, -9, 0, 32, -9, C.IRON); g.box(0, 32, -13, 0, 32, -9, C.OAK_L);
    return g;
  }
  function logAt(g, x0, x1, cy, cz, r, seed) {           // a round of wood along x: ridged bark, ringed ends
    for (let y = -Math.ceil(r); y <= r; y++) for (let z = -Math.ceil(r); z <= r; z++) {
      const d = Math.hypot(y, z); if (d > r + 0.2) continue;
      const c = H(ang(y, z, 14), seed, 2) < 0.4 ? C.BARK_D : H(ang(y, z, 14), seed, 3) < 0.4 ? 0x7a563a : C.BARK;
      for (let x = x0; x <= x1; x++) { const end = x === x0 || x === x1; if (!end && d < r - 1.6) continue; g.set(x, cy + y, cz + z, end ? (d > r - 0.9 ? C.BARK_D : Math.abs(x) > 18 && (R(d + seed) & 1) ? 0xc49a64 : C.END) : c); }
    }
  }
  function woodpileGrid() {                              // split firewood, two stacks, then the chopping block with a round on it (its middle 1.15 m along +x)
    const g = G(), r = 7;
    for (const [x0, x1] of [[-29, -2], [1, 28]]) for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) logAt(g, x0 + ((i + row) % 3), x1 - ((i * 2 + row) % 3), R(r + row * 13), R(-23 + i * 15 + row * 7.5), r, i * 5 + row * 11 + (x0 & 7));
    for (const x of [-30, 29]) for (const z of [-34, 34]) g.box(x - 1, 0, z - 1, x + 1, 24, z + 1, C.OAK_D);      // stakes
    const bx = 48;
    for (let y = 0; y <= 17; y++) g.disc(bx, 0, y < 2 ? 10.6 : 9.8, y, y, (x, yy, z) => { if (yy === 17) { const d = Math.hypot(x - bx, z); return d > 9 ? C.BARK : H(x, z, 5) < 0.06 ? 0x6b4a32 : (R(d * 0.8) & 1) ? C.END : 0xc49a64; } return H(ang(x - bx, z, 20), 4, 4) < 0.45 ? C.BARK_D : C.BARK; });
    for (let y = 18; y <= 28; y++) g.disc(bx, 0, 4.6, y, y, (x, yy, z) => { const d = Math.hypot(x - bx, z); if (yy === 28) return z === 0 ? 0x6b4a32 : d > 3.8 ? C.BARK : (R(d) & 1) ? C.END : 0xc49a64; return H(ang(x - bx, z, 12), 9, 4) < 0.45 ? C.BARK_D : C.BARK; });
    // split pieces and chips lying about
    for (const [x, z, a] of [[bx + 2, 17, 0], [bx - 8, 15, 1], [bx + 3, -17, 1], [bx - 10, -16, 0]]) for (let k = -5; k <= 5; k++) for (let w = -2; w <= 2; w++) { const X = a ? x + w : x + k, Z = a ? z + k : z + w; for (let y = 0; y <= 2 - Math.abs(w); y++) g.set(X, y, Z, Math.abs(k) === 5 ? C.END : w < 0 ? 0xd0a468 : y === 2 - Math.abs(w) && w > 0 ? C.BARK : 0xc49a64); }
    for (let k = 0; k < 30; k++) g.set(R(bx - 14 + H(k, 1, 1) * 28), 0, R(-16 + H(k, 2, 1) * 32), k & 1 ? C.END : 0xc49a64);
    return g;
  }
  function cartGrid() {                                  // a hay cart, its shafts to +z (the hay is its own grid)
    const g = G();
    g.box(-32, 24, -58, 32, 26, 58, (x, y, z) => y === 26 ? plank(x + 64, 8, 5, C.OAK) : C.OAK_D);
    for (const s of [-1, 1]) { for (let z = -58; z <= 58; z += 13) g.box(s * 32, 27, z, s * 32, 46, z + 1, C.OAK_D); for (const y of [33, 40, 46]) g.box(s * 33, y, -58, s * 33, y + 2, 58, C.OAK); g.box(s * 20, 22, -60, s * 22, 23, 100, C.OAK_D); }
    for (const z of [-58, 58]) for (const y of [33, 40]) g.box(-32, y, z, 32, y + 2, z, C.OAK);
    for (const s of [-1, 1]) for (let y = 0; y <= 46; y++) for (let z = -24; z <= 24; z++) {
      const r = Math.hypot(y - 23, z), a = (Math.atan2(y - 23, z) + Math.PI) / TAU * 10 % 1;
      let c = -1; if (r > 21.5 && r <= 23.2) c = C.IRON; else if (r > 18 && r <= 21.5) c = (ang(y - 23, z, 10) & 1) ? C.OAK : C.OAK_D; else if (r <= 4) c = r < 1.6 ? C.IRON : C.OAK_D; else if (r <= 18 && Math.min(a, 1 - a) * r * TAU / 10 < 1.3) c = C.OAK_L;
      if (c >= 0) for (const x of r <= 4 ? [36, 37, 38, 39, 40] : [37, 38]) g.set(s * x, y, z, c);
    }
    g.box(-36, 21, -2, 36, 25, 2, C.OAK_D); g.box(-1, 0, 50, 1, 23, 52, C.OAK_D);
    g.line(28, 47, 30, 20, 96, 8, C.OAK_L, 0.6); for (const d of [-4, 0, 4]) g.line(20, 96, 8, 19 + d * 0.4, 108, 7 + d, C.IRON);      // a pitchfork in the hay
    return g;
  }
  function hayGrid(rx, ry, rz, seed, flat) {             // a heap of hay
    const g = G();
    for (let x = -rx; x <= rx; x++) for (let z = -rz; z <= rz; z++) {
      const d = (x / rx) ** 2 + (z / rz) ** 2; if (d > 1) continue;
      const n = H(x >> 2, seed, z >> 1) * 0.22, top = R(ry * Math.pow(1 - d, flat || 0.45) * (0.85 + n));
      for (let y = 0; y <= top; y++) { if (y < top - 3 && d < 0.72) continue; const t = H(x >> 2, y, z); g.set(x, y, z, t < 0.22 ? C.STRAW_D : t < 0.8 ? C.STRAW : C.STRAW_L); }
    }
    return g;
  }
  function baleGrid() {                                  // a bound bale of straw, 1 x 0.5 x 0.5 m
    const g = G();
    g.box(-21, 0, -11, 21, 21, 11, (x, y, z) => { if (Math.abs(x) === 21 && (y === 0 || y === 21) || (Math.abs(z) === 11 && (y === 0 || y === 21))) return -1; if (Math.abs(Math.abs(x) - 11) < 1) return C.ROPE; const k = Math.abs(x) === 21 ? H(y >> 1, 3, z >> 1) : H(x >> 3, y, z > 0 ? 1 : 2); return k < 0.28 ? C.STRAW_D : k < 0.72 ? C.STRAW : C.STRAW_L; });
    for (let k = 0; k < 40; k++) { const x = R((H(k, 1, 4) - 0.5) * 40), z = H(k, 2, 4) < 0.5 ? -12 : 12; g.set(x, R(1 + H(k, 3, 4) * 18), z, C.STRAW_L); }
    return g;
  }

  /* ---------------------------------------------------------- on posts and lines -- */
  function lanternPostGrid() {                           // 3 m: a fluted iron post, a scrolled arm, a glass lantern, a basket of flowers
    const g = G();
    g.box(-5, 0, -5, 5, 3, 5, C.STONE); g.box(-4, 4, -4, 4, 5, 4, C.STONE_L); g.disc(0, 0, 3, 6, 9, C.IRON); g.disc(0, 0, 2.4, 10, 11, C.IRON_L);
    g.disc(0, 0, 1.5, 12, 122, (x, y, z) => Math.abs(x) + Math.abs(z) === 1 ? C.IRON_L : C.IRON); for (const y of [40, 78, 112]) g.disc(0, 0, 2.4, y, y + 1, C.IRON_L);
    g.disc(0, 0, 2.2, 123, 124, C.IRON); ball(g, 0, 127, 0, 1.6, C.BRASS); g.box(0, 129, 0, 0, 130, 0, C.BRASS);
    for (let x = 1; x <= 18; x++) g.box(x, 117, 0, x, 118, 0, C.IRON);
    for (let k = 0; k < 26; k++) { const a = k / 26 * TAU * 0.82 + 0.4, r = 6 - k * 0.12; g.set(R(8 + Math.cos(a) * r), R(109 + Math.sin(a) * r), 0, C.IRON); }
    g.box(16, 114, 0, 16, 116, 0, C.IRON);
    const lx = 16; g.box(lx - 2, 113, -2, lx + 2, 113, 2, C.IRON); g.box(lx - 4, 112, -4, lx + 4, 112, 4, C.IRON_L); g.box(lx - 5, 111, -5, lx + 5, 111, 5, C.IRON);
    g.box(lx - 4, 98, -4, lx + 4, 110, 4, (x, y, z) => { const ex = Math.abs(x - lx) === 4, ez = Math.abs(z) === 4; if (ex && ez) return C.IRON; if (!ex && !ez) return Math.abs(x - lx) < 2 && Math.abs(z) < 2 && y < 103 ? 0xf6ecd0 : -1; return (y === 104) || (ex ? z === 0 : x === lx) ? C.IRON_L : (y > 106 ? 0xf2ead2 : 0xe8d8a8); });
    g.box(lx - 4, 97, -4, lx + 4, 97, 4, C.IRON); g.box(lx - 2, 96, -2, lx + 2, 96, 2, C.IRON_L); g.set(lx, 95, 0, C.BRASS);
    for (let x = -12; x <= -1; x++) g.box(x, 100, 0, x, 101, 0, C.IRON); g.box(-11, 92, 0, -11, 99, 0, C.IRON_L);
    basket(g, -11, 80, 0, 6.5, 7, { fill: C.LEAF_D }); const q = rng(5);
    for (let k = 0; k < 60; k++) { const a = q() * TAU, r = 2 + q() * 5.5, y = 88 - Math.max(0, r - 4.5) * 3 * q() + q() * 2; g.set(R(-11 + Math.cos(a) * r), R(y), R(Math.sin(a) * r), [C.LEAF, C.LEAF_L, C.LEAF_D, 0xd8304a, 0xf08ac0, 0xfdfaf2][k % 6]); }
    return g;
  }
  const ICON = {                                         // what's painted on a sign: colour at (u, v), each -1..1
    tankard(u, v) { if (v > 0.42 && v < 0.82 && Math.abs(u + 0.12) < 0.5 - (v > 0.66 ? 0.14 : 0)) return 0xf8f2e6; if (Math.abs(u + 0.12) < 0.46 && v > -0.72 && v <= 0.42) return Math.abs(v + 0.45) < 0.08 || Math.abs(v - 0.2) < 0.08 ? 0x4a4a52 : (Math.floor((u + 2) * 7) & 1) ? 0x9a6436 : 0x80502a; const d = Math.hypot(u - 0.38, (v + 0.12) * 0.9); return d < 0.36 && d > 0.2 && u > 0.32 ? 0x80502a : -1; },
    bread(u, v) { const e = (u / 0.82) ** 2 + ((v + 0.05) / 0.52) ** 2; if (e > 1) return -1; if (v > 0 && Math.abs(((u * 2.2 + v * 1.2 + 10) % 1) - 0.5) < 0.14) return 0xf6e2b4; return e > 0.78 ? 0x8a5422 : v < -0.25 ? 0xa8682a : 0xd09444; },
    anvil(u, v) { if (v > 0.18 && v < 0.5 && u > -0.55 && u < 0.5) return v > 0.4 ? 0x6a6a76 : 0x3a3a44; if (u >= 0.5 && u < 0.86 && v < 0.48 && v > 0.48 - (0.86 - u) * 0.8) return 0x3a3a44; if (Math.abs(u) < 0.22 && v > -0.3 && v <= 0.18) return 0x44444e; if (Math.abs(u) < 0.46 && v > -0.56 && v <= -0.3) return 0x3a3a44; return -1; },
    spool(u, v) { if (Math.abs(u + 0.1) < 0.5 && Math.abs(Math.abs(v) - 0.58) < 0.12) return 0x9a6436; if (Math.abs(u + 0.1) < 0.34 && Math.abs(v) < 0.46) return (Math.floor((v + u * 0.3 + 4) * 9) & 1) ? 0xb83a5a : 0xd8587a; if (Math.abs(u - 0.62 - v * 0.14) < 0.06 && v > -0.7 && v < 0.74) return 0xb4bac6; return -1; },
    bottle(u, v) { const e = Math.hypot(u, v + 0.25); if (e < 0.52) return u < -0.18 && v > -0.2 && v < 0.05 ? 0xd8f4e4 : v > -0.05 ? 0xa8e0c4 : 0x3a9a72; if (Math.abs(u) < 0.16 && v > 0.2 && v < 0.62) return 0xa8e0c4; if (Math.abs(u) < 0.22 && v >= 0.62 && v < 0.82) return 0x9a6436; return -1; },
  };
  function signGrid(icon) {                              // hangs out from a wall on a scrolled iron arm (along +z), a face to each side
    const g = G(), N = 14, cy = 17, cz = 18;
    g.box(0, 36, 0, 0, 37, 34, C.IRON); g.box(-1, 28, 0, 1, 42, 1, C.IRON);
    for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 0.55; g.set(0, R(28 + Math.sin(a) * 8), R(1 + (1 - Math.cos(a)) * 14), C.IRON); } ball(g, 0, 37, 35, 0.8, C.BRASS);
    for (const z of [cz - 9, cz + 9]) for (let y = 32; y <= 35; y++) g.set(y & 1 ? 0 : 1, y, z, C.IRON_L);
    for (let y = -N; y <= N; y++) for (let z = -N; z <= N; z++) {
      const corner = Math.hypot(Math.max(0, Math.abs(y) - N + 4), Math.max(0, Math.abs(z) - N + 4)); if (corner > 4.3) continue;
      const rim = Math.abs(y) >= N - 1 || Math.abs(z) >= N - 1 || corner > 3;
      for (const s of [-1, 1]) { const c = rim ? -1 : ICON[icon](z / (N - 2) * (s > 0 ? -1 : 1), y / (N - 2)); g.set(s, cy + y, cz + z, rim ? 0x5a3a24 : c >= 0 ? c : (z + 30) % 7 === 0 ? 0xc8b48a : 0xd8c8a0); if (!rim && c >= 0) g.set(s * 2, cy + y, cz + z, c); }
      g.set(0, cy + y, cz + z, rim ? C.BRASS : C.OAK_D);
    }
    return g;
  }
  function laundryGrid(len, seed) {                      // a washing line along x: shirts, trousers, stockings, a sheet, pegged on
    const g = G(), sag = x => -R(Math.sin(x / len * Math.PI) * 4);
    for (let x = 0; x <= len; x++) g.set(x, sag(x), 0, 0xb0a080);
    const cols = [0xe8e0d0, 0x8a9ab8, 0xc87a7a, 0xd8d0a0, 0x8ab08a, 0xb89ac8];
    let x = 4, i = seed;
    const peg = (px, y) => { g.set(px, y + 1, 0, C.OAK_L); g.set(px, y, 1, C.OAK_L); };
    while (x < len - 20) {
      const c = cols[i % 6], kind = i % 4, y0 = sag(x + 8) - 1;
      const put = (a, b, col) => g.set(x + a, y0 - b, 0, col);
      if (kind === 0) {                                  // a shirt
        for (let b = 0; b < 22; b++) for (let a = 0; a < 18; a++) { const sleeve = a < 4 || a > 13; if (sleeve && b >= 9) continue; if (b < 3 && Math.abs(a - 8.5) < 3 - b) continue; put(a, b, a === 8 && b < 14 ? mul(c, 0.8) : b === 21 ? mul(c, 0.85) : sleeve && b === 8 ? mul(c, 0.85) : c); }
        peg(x + 3, y0); peg(x + 14, y0); x += 22;
      } else if (kind === 1) {                           // trousers
        for (let b = 0; b < 26; b++) for (let a = 0; a < 13; a++) { if (b > 8 && Math.abs(a - 6) < 1 + (b - 8) * 0.03) continue; put(a, b, b < 2 ? mul(0x6a5a4a, 0.8) : b > 23 ? 0x5a4a3c : 0x6a5a4a); }
        peg(x + 1, y0); peg(x + 11, y0); x += 17;
      } else if (kind === 2) {                           // a pair of striped stockings
        for (let k = 0; k < 2; k++) { for (let b = 0; b < 15; b++) for (let a = 0; a < (b > 11 ? 6 : 4); a++) put(k * 8 + a, b, b % 4 < 2 ? c : 0xf1ece2); peg(x + k * 8 + 1, y0); }
        x += 18;
      } else {                                           // a sheet with a border
        for (let b = 0; b < 30; b++) for (let a = 0; a < 24; a++) put(a, b, b === 2 || b === 27 ? mix(c, 0x8a3a5a, 0.4) : b === 29 && a % 3 === 0 ? -1 : c);
        peg(x + 1, y0); peg(x + 12, y0); peg(x + 22, y0); x += 28;
      }
      i++;
    }
    return g;
  }

  /* ------------------------------------------------------ the door in the ground -- */
  const suitIn = (s, u, v) => {
    const heart = (a, b) => Math.pow(a * a + b * b - 1, 3) - a * a * b * b * b < 0;
    if (s === 'heart') return heart(u * 1.15, v * 1.15 + 0.12);
    if (s === 'diamond') return Math.abs(u) * 1.35 + Math.abs(v) < 1;
    if (s === 'spade') return heart(u * 1.2, -v * 1.2 + 0.3) || (v < -0.25 && v > -1 && Math.abs(u) < 0.1 + (-v - 0.25) * 0.45);
    const c = (cx, cy, r) => (u - cx) ** 2 + (v - cy) ** 2 < r * r; return c(0, 0.42, 0.36) || c(-0.4, -0.1, 0.36) || c(0.4, -0.1, 0.36) || (v < -0.1 && v > -1 && Math.abs(u) < 0.08 + (-v - 0.1) * 0.35);
  };
  function trapdoorFrameGrid() {                         // a frame of worn stones round a pit lit pink from below, a suit carved at each corner
    const g = G();
    for (let x = -28; x <= 28; x++) for (let z = -22; z <= 22; z++) {
      const rim = Math.abs(x) >= 22 || Math.abs(z) >= 17;
      if (!rim) { const d = Math.hypot(x / 22, z / 17); g.set(x, 0, z, VX.glow(d < 0.45 ? 0xffb0dc : H(x >> 1, 0, z >> 1) < 0.5 ? 0xff7ac0 : 0xc85ad8)); continue; }
      if (Math.abs(x) === 28 && Math.abs(z) >= 21) continue;
      const along = Math.abs(x) >= 22 ? z : x, i = Math.floor((along + 60) / 11), joint = (along + 60) % 11 === 0 || (Math.abs(x) >= 22 && Math.abs(z) === 16);
      const c = H(i, Math.abs(x) >= 22 ? (x > 0 ? 1 : 2) : (z > 0 ? 3 : 4), 6), tone = joint ? 0x3e3a38 : c < 0.35 ? 0x5a5550 : c < 0.75 ? 0x6a645e : 0x78716a;
      g.set(x, 0, z, tone); if (!joint && Math.abs(x) < 28 && Math.abs(z) < 22) g.set(x, 1, z, tone);
    }
    ['heart', 'spade', 'diamond', 'club'].forEach((s, i) => { const cx = (i & 1 ? 1 : -1) * 25, cz = (i & 2 ? 1 : -1) * 19.5; for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) if (suitIn(s, a / 2.2, b / 2.2)) g.set(R(cx + a), 1, R(cz + b), s === 'heart' || s === 'diamond' ? 0x9a3a5a : 0x2e2a30); });
    return g;
  }
  function trapdoorLeafGrid() {                          // hinged along its back edge (z 0), it lies toward +z: old planks, iron straps, a ring, light through the cracks
    const g = G();
    for (let x = -21; x <= 21; x++) for (let z = 0; z <= 33; z++) for (let y = 0; y <= 1; y++) {
      const i = Math.floor((x + 21) / 7), crack = (x + 21) % 7 === 0 && x > -21 && x < 21 && z > 1 && z < 32;
      if (crack) { if (y === 0) g.set(x, y, z, H(i, z >> 3, 3) < 0.55 ? VX.glow(0xff8fd0) : 0x24160e); continue; }
      g.set(x, y, z, H(x, 5, z >> 3) < 0.16 ? 0x3e2818 : (i & 1) ? 0x5a3a24 : 0x4e3220);
    }
    for (const z of [6, 27]) { g.box(-21, 2, z - 1, 21, 2, z + 1, (x) => Math.abs(x) % 9 === 4 ? C.IRON_L : C.IRON); for (const s of [-1, 1]) g.box(s * 20, 2, z - 2, s * 21, 2, z + 2, C.IRON); }
    for (let a = -6; a <= 6; a++) for (let b = -6; b <= 6; b++) if (suitIn('heart', a / 6, -b / 6)) g.set(a, 2, 16 + b, suitIn('heart', a / 4, -b / 4) ? VX.glow(0xff9ad8) : 0xb04a7a);
    for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; g.set(R(Math.cos(a) * 3), 2, R(31 + Math.sin(a) * 2.2), C.IRON_L); } g.box(-1, 2, 29, 1, 3, 29, C.IRON);
    return g;
  }

  /* --------------------------------------------------------------- the animals -- */
  function catGrid() {                                   // sitting, its tail round its feet; the head is its own piece
    const g = G(), B = 0x1e1c24, B2 = 0x2c2934;
    g.ell(0, 5, -1, 3.8, 5, 4.2, (x, y, z) => (x + y * 2) % 7 === 0 && H(x, y, z) < 0.4 ? B2 : B); g.ell(0, 8.5, 1, 3, 3.6, 2.6, B); g.box(-1, 5, 3, 1, 9, 3, (x, y) => x === 0 && y > 6 ? 0xf1ece2 : B);
    for (const s of [-1, 1]) { g.box(s * 2 - (s > 0 ? 1 : 0), 0, 3, s * 2 + (s > 0 ? 0 : 1), 6, 4, B); g.box(s * 2 - (s > 0 ? 1 : 0), 0, 4, s * 2 + (s > 0 ? 0 : 1), 0, 5, 0xf1ece2); g.ell(s * 3, 2, -1, 1.2, 1.6, 2.4, B2); }
    for (let k = 0; k < 18; k++) { const a = -0.5 + k * 0.17; g.set(R(Math.sin(a) * 5.4), k > 14 ? 1 : 0, R(-1 - Math.cos(a) * 5.2), k > 14 ? 0xf1ece2 : B); g.set(R(Math.sin(a) * 4.8), 0, R(-1 - Math.cos(a) * 4.6), B2); }
    for (let x = -2; x <= 2; x++) g.set(x, 11, 3, 0x8a2a4a); g.set(0, 10, 4, C.BRASS);          // a collar, a bell
    return g;
  }
  function catHeadGrid() {
    const g = G(), B = 0x1e1c24;
    g.ell(0, 2, 0, 3.4, 2.8, 2.8, B);
    for (const s of [-1, 1]) {
      g.box(s * 2, 5, -1, s * 3, 5, 0, B); g.box(s * 3, 6, -1, s * 3, 6, 0, B); g.set(s * 3, 7, 0, B); g.set(s * 2, 5, 1, 0x6a4a56);
      g.box(s * 2 - (s > 0 ? 1 : 0), 2, 3, s * 2 + (s > 0 ? 0 : 1), 3, 3, VX.glow(0xc8e84a)); g.set(s, 2, 3, 0x14181a); g.set(s, 0, 3, 0x2c2934); g.set(s * 4, 0, 2, 0xd8d8d8); g.set(s * 5, 1, 2, 0xd8d8d8);
    }
    g.set(0, 1, 4, 0xd88a9a); g.set(0, 0, 3, 0x2c2934); g.set(0, 5, 2, 0xf1ece2);
    return g;
  }
  function chickenGrid(c) {
    const g = G(), d = mul(c, 0.84), l = mul(c, 1.06);
    g.ell(0, 6.5, -0.5, 3, 3, 4.6, (x, y, z) => Math.abs(x) >= 2 && y > 4 && y < 9 && z < 3 && z > -4 ? ((z + y) % 3 === 0 ? mul(c, 0.72) : d) : H(x, y, z) < 0.15 ? l : c);
    for (let k = 0; k < 5; k++) for (let x = -1; x <= 1; x++) { g.set(x, 9 + k, -4 - R(k * 0.7), k & 1 ? d : mul(c, 0.7)); if (k < 4) g.set(x, 8 + k, -5 - R(k * 0.6), d); }
    for (let y = 8; y <= 12; y++) g.disc(0, 2.6 + (y - 8) * 0.25, 1.8 - (y - 8) * 0.12, y, y, y & 1 ? l : c);
    g.ell(0, 13, 4, 1.4, 1.4, 1.4, c); g.box(0, 13, 6, 0, 13, 7, 0xe8a83a); g.box(0, 11, 5, 0, 12, 5, 0xd8303a); for (const [y, z] of [[15, 5], [15, 4], [16, 4], [15, 3], [16, 2], [15, 2]]) g.set(0, y, z, 0xd8303a);
    for (const s of [-1, 1]) { g.set(s * 2, 13, 5, 0x14141a); g.box(s, 1, 0, s, 3, 0, 0xe8a83a); g.set(s, 0, 0, 0xe8a83a); for (const [dx, dz] of [[0, 1], [0, 2], [s, 1], [0, -1]]) g.set(s + dx, 0, dz, 0xd8983a); }
    return g;
  }

  /* --------------------------------------------------------------- the fountain -- */
  function fountainGrid() {                              // (its own grid at 4.8 cm) 3.6 m across: a stepped round basin with carved panels, a pedestal, a wide bowl
    const g = G(), ST = [0xb8b0a6, 0xc8c0b6, 0xd6cfc4, 0xa69e94];
    const step = (x, y, z) => { const a = (Math.atan2(z, x) + Math.PI) / TAU * 20; return a % 1 < 0.06 ? 0x8d857b : H(Math.floor(a) % 20, 3, 2) < 0.4 ? ST[1] : ST[0]; };
    g.disc(0, 0, 37, 0, 2, (x, y, z) => Math.hypot(x, z) < 26 ? -1 : y === 2 ? ST[2] : step(x, y, z));
    const panel = (x, z) => ((Math.atan2(z, x) + Math.PI) / TAU * 16) % 1;
    tube(g, 0, 0, 32, 4, 3, 10, (x, y, z) => { const a = panel(x, z); if (a < 0.12 || a > 0.92) return ST[2]; if (y === 3 || y === 10) return ST[1]; const u = (a - 0.52) * 3.2, v = (y - 6.5) / 3; return Math.abs(u) * 1.1 + Math.abs(v) < 0.9 ? ST[2] : ST[3]; });      // panels, a lozenge in each
    tube(g, 0, 0, 33.5, 5.5, 11, 12, (x, y) => y === 12 ? ST[2] : ST[1]);
    g.disc(0, 0, 28, 9, 9, (x, y, z) => { const r = Math.hypot(x, z); return Math.sin(r * 1.05) > 0.93 ? C.WATER_L : r < 8 ? 0x74a4dc : C.WATER; });
    const prof = y => y < 12 ? 7 : y < 15 ? 6 : y < 23 ? 4 + Math.sin((y - 15) / 8 * Math.PI) * 1.6 : 4.5;
    for (let y = 9; y <= 25; y++) g.disc(0, 0, prof(y), y, y, (x, yy, z) => (yy === 12 || yy === 15 || yy === 23) ? ST[2] : (ang(x, z, 16) & 1) ? ST[0] : ST[1]);
    for (let y = 24; y <= 29; y++) tube(g, 0, 0, 6 + (y - 24) * 1.8, 2.4, y, y, (x, yy, z) => yy === 29 ? ST[2] : (ang(x, z, 20) & 1) ? ST[0] : ST[1]);
    g.disc(0, 0, 13.6, 28, 28, (x, y, z) => Math.sin(Math.hypot(x, z) * 1.6) > 0.9 ? C.WATER_L : C.WATER);
    for (let k = 0; k < 8; k++) { const a = (k + 0.5) / 8 * TAU, x = Math.cos(a), z = Math.sin(a); g.set(R(x * 16), 28, R(z * 16), ST[3]); g.set(R(x * 17), 28, R(z * 17), 0x6a6259); }
    return g;
  }
  function statueGrid() {                                // on the fountain: a hooded traveller, cloak to the feet, a staff with a lantern; lilies on the water
    const g = G(), ST = [0xb8b0a6, 0xc8c0b6, 0xd6cfc4, 0xa69e94];
    for (let y = 56; y <= 62; y++) g.disc(0, 0, 8 - (y > 60 ? 1 : 0), y, y, y === 62 || y === 59 ? ST[2] : ST[1]);
    for (let y = 63; y <= 94; y++) { const t = (y - 63) / 31, r = 6.4 - t * 2.6; g.ell(0, y, 0, r, 0.4, r * 0.8, (x, yy, z) => { const f = ang(x, z, 12); return (f & 1) ? ST[1] : (f % 4 === 0 ? ST[3] : ST[0]); }); }
    g.ell(0, 95, 0, 5.6, 2.4, 3.6, ST[1]); g.ell(0, 101, 0, 3.6, 4, 3.6, (x, y, z) => z > 1.5 && Math.abs(x) < 2.4 && y < 104 ? ST[3] : ST[2]); g.box(-1, 99, 3, 1, 102, 3, ST[1]); g.set(0, 105, -2, ST[2]); g.set(0, 105, -3, ST[2]);
    g.line(-4, 94, 1, -6, 88, 4, ST[1], 1); g.line(-6, 88, 4, -2, 87, 6, ST[2], 0.8); g.line(5, 94, 1, 8, 88, 3, ST[1], 1); g.line(8, 88, 3, 9, 90, 5, ST[2], 0.8);
    g.box(9, 63, 5, 9, 108, 5, ST[3]); g.box(9, 109, 4, 9, 109, 8, ST[3]); g.box(8, 103, 7, 10, 107, 9, (x, y, z) => x !== 9 && z !== 8 || y === 103 || y === 107 ? ST[3] : VX.glow(0xffe6b0)); g.set(9, 108, 8, ST[3]);
    for (const [x, z, r] of [[34, 18, 5], [40, 8, 4], [-30, 28, 5], [-38, -18, 4.5], [20, -40, 4]]) g.disc(x, z, r, 20, 20, (X, Y, Z) => Math.atan2(Z - z, X - x) > 2.7 ? -1 : C.LEAF);
    for (const [x, z, c] of [[34, 18, 0xf6d6e4], [-30, 28, 0xfdf6ee]]) { g.box(x - 1, 21, z - 1, x + 1, 21, z + 1, c); g.set(x, 22, z, 0xf0d04a); for (const [a, b] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) g.set(x + a, 21, z + b, mul(c, 0.92)); }
    return g;
  }

  window.THINGS = {
    S: 0.024, F, mul, mix, stall: stallGrid, goods: goodsGrid, display: displayGrid, bench: benchGrid, well: wellGrid, barrel: barrelGrid, crate: crateGrid, sacks: sacksGrid, basket: basketGrid, pot: potGrid, bucket: bucketGrid,
    anvil: anvilGrid, quench: quenchGrid, grind: grindGrid, woodpile: woodpileGrid, cart: cartGrid, hay: hayGrid, bale: baleGrid, post: lanternPostGrid, sign: signGrid, laundry: laundryGrid, doorFrame: trapdoorFrameGrid, doorLeaf: trapdoorLeafGrid,
    cat: catGrid, catHead: catHeadGrid, hen: chickenGrid, fountain: fountainGrid, statue: statueGrid,
  };
})();
