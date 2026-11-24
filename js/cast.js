/* ============================================================================
   cast.js -- the cast of the Opening Act and the things they handle, in Trap
   Trick's own voxel (2.4 cm).

     Reiner      a farm boy of fifteen, newly accepted at the Mage Academy
                 (two rigs: his farm clothes, and the uniform)
     Lotte       his little sister; Mother and Father
     Maron       his classmate, in her school uniform. She is Trap Trick: her
                 head is Trap Trick's own (skull, bangs, dome of curls), her
                 ringlets tied into two plaits
     Professor Halden, Brandt the porter, and the other pupils
     a horse, a cow; a paper bird with a letter; candles, books, coins, buns

   CAST.people: { name: look } built by PEOPLE.build (CAST.build adds what is
   special); CAST.beasts: rigs; CAST.props: { name: grid }, pivot at the origin.
   ========================================================================== */
(function () {
  'use strict';
  const H = VX.hash3, TAU = Math.PI * 2, R = Math.round;
  const mul = (c, k) => { const f = s => Math.max(0, Math.min(255, Math.round(((c >> s) & 255) * k))); return (f(16) << 16) | (f(8) << 8) | f(0); };
  const G = () => { const g = new VX.Grid(); g.jit = 0; g.merge = true; return g; };
  const BRASS = 0xd0a850, OAK = 0x8a5a32, OAK_D = 0x6b4426, OAK_L = 0xa8743e, PAPER = 0xf2e6cc, PAPER_D = 0xd8c8a6, INK = 0x4a3a52, WAX = 0xb02838;

  /* the academy's colours: a deep green, gold edging, a wine tie for the first years */
  const UNI = 0x24564e, UNI_D = 0x1b433e, TIE = 0x9a2c44, SLATE = 0x4a505e, STOCK = 0x33303e;
  const boy = o => Object.assign({ story: true, teen: true, boy: true, tunic: false, uniform: UNI, cape: UNI_D, band: BRASS, tie: TIE, legs: SLATE, boots: 0x4a3222, shirt: 0xf4efe2 }, o);
  const girl = o => Object.assign({ story: true, fem: true, uniform: UNI, cape: UNI_D, band: BRASS, tie: TIE, dress: SLATE, trim: BRASS, legs: STOCK, shoes: 0x4a2e22, shirt: 0xf4efe2 }, o);
  const REINER = { hair: 0xb07a3c, style: 'messy', eye: 0x4f9450, freckles: true, skin: 1 };

  const people = {
    reiner: { story: true, teen: true, boy: true, tunic: false, ...REINER, shirt: 0xe6dac0, sleeve: 0xe6dac0, rolled: true, braces: 0x6a4226, legs: 0x6a5a48, boots: 0x5a3c26, patch: 0x9a8a5a },
    reiner_uni: boy({ ...REINER, satchel: true }),
    lotte: { story: true, kid: true, dress: 0xc8503c, shirt: 0xf1e6cc, sleeve: 0xf1e6cc, bodice: 0xc8503c, hair: 0xc08a48, style: 'pigtails', eye: 0x4f9450, ribbon: 0xf0c850, skin: 1, apron: 0xf1e6cc },
    mother: { story: true, fem: true, dress: 0x4a6a86, bodice: 0x3c5870, shirt: 0xf1e6cc, sleeve: 0xf1e6cc, apron: 0xf1e6cc, hair: 0x9a6030, style: 'bun', eye: 0x5a7a4a, skin: 1, lips: true, long: true, legs: 0x4a3a30, rolled: true },
    father: { story: true, big: true, tunic: false, shirt: 0xcabf9e, sleeve: 0xcabf9e, vest: 0x6a4a32, legs: 0x4e4238, boots: 0x44301f, hair: 0x6a4426, style: 'short', beard: 'short', eye: 0x4f7a50, skin: 1, rolled: true },
    maron: girl({ hair: 0xf46cc6, style: 'maron', eye: 0xb52282, skin: 0, blush: true, lips: true }),
    halden: { story: true, fem: false, dress: 0x3b3558, long: true, sleeve: 0x3b3558, shirt: 0x3b3558, band: BRASS, hat: 'witch', hatColor: 0x3b3558, hair: 'grey', beard: 'long', eye: 0x50607a, skin: 0, specs: true, h: 1 },
    brandt: { story: true, fem: false, dress: 0x5a3c34, long: true, sleeve: 0x5a3c34, shirt: 0x5a3c34, band: 0x8a8a92, hat: 'cap', hatColor: 0x44302a, hair: 'white', beard: 'short', eye: 0x6e5a3a, skin: 1, h: -2 },
    wim: boy({ hair: 'black', style: 'curls', skin: 3, eye: 0x6e4628, h: -1 }),
    tobin: boy({ hair: 'blond', style: 'short', skin: 0, eye: 0x4568b4, h: 3 }),
    isolde: girl({ hair: 0x2c2a3c, style: 'long', skin: 0, eye: 0x50507a, h: 1 }),
    petra: girl({ hair: 'red', style: 'braid', skin: 0, eye: 0x3f7c4e, freckles: true, ribbon: BRASS }),
    nadi: girl({ hair: 'black', style: 'bun', skin: 4, eye: 0x6e4628 }),
    otto: boy({ hair: 'brown', style: 'short', skin: 1, eye: 0x6e4628, h: 1 }),
    selma: girl({ hair: 0xc8ccd8, style: 'bob', skin: 1, eye: 0x4568b4, h: -2 }),
    kas: boy({ hair: 'chestnut', style: 'bob', skin: 2, eye: 0x8c6c2c }),
  };

  const T2 = 0x2c5a9a, T3 = 0xc89a30;                     // second years wear blue, third years gold
  Object.assign(people, {
    rowan: boy({ hair: 'brown', style: 'curls', skin: 2, eye: 0x6e4628, tie: T2 }), ilse: girl({ hair: 'blond', style: 'braid', skin: 0, eye: 0x4568b4, tie: T2, ribbon: T2 }),
    fenn: boy({ hair: 0xc8702c, style: 'messy', skin: 0, eye: 0xc89a30, ears: 'fox', tie: T2 }), yve: girl({ hair: 0xb8d8b0, style: 'long', skin: 0, eye: 0x3f7c4e, ears: 'long', tie: T2, h: 2 }),
    joss: boy({ hair: 'black', style: 'short', skin: 4, eye: 0x6e4628, tie: T2, h: 2 }), marta: girl({ hair: 'chestnut', style: 'bun', skin: 1, eye: 0x6e4628, tie: T2, h: -1 }),
    bram: boy({ hair: 'grey', style: 'short', skin: 3, eye: 0xc89a30, horns: true, tie: T3, h: 6 }), sunniva: girl({ hair: 'red', style: 'bob', skin: 0, eye: 0x3f7c4e, horns: true, tie: T3, h: 2 }),
    cato: boy({ hair: 0xe8e6ea, style: 'messy', skin: 0, eye: 0x7a4ab0, tie: T3, h: 3 }), liss: girl({ hair: 'black', style: 'bob', skin: 2, eye: 0x50507a, ears: 'fox', tie: T3 }),
    orin: boy({ hair: 'chestnut', style: 'bob', skin: 1, eye: 0x4568b4, ears: 'long', tie: T3, h: 4 }), dove: girl({ hair: 0x9ab4d8, style: 'curls', skin: 1, eye: 0x4568b4, tie: T3 }),
    wren: { story: true, fem: true, dress: 0x5a7a4a, bodice: 0x4a6a3c, shirt: 0xf1e6cc, sleeve: 0xf1e6cc, apron: 0x8a7a58, long: true, hair: 'chestnut', style: 'braid', hat: 'straw', band: 0x3f7a50, eye: 0x3f7c4e, skin: 2, rolled: true, ribbon: 0x3f7a50 },
    marrow: { story: true, fem: false, dress: 0x6a5a4a, long: true, sleeve: 0x6a5a4a, shirt: 0x6a5a4a, band: 0x8a7a50, bald: true, hair: 'white', beard: 'long', eye: 0x50607a, skin: 0, specs: true, h: -3 },
    corvin: { story: true, big: true, tunic: false, shirt: 0x3a3a44, sleeve: 0x3a3a44, vest: 0x5a3230, legs: 0x2e2e36, boots: 0x2a2220, hair: 'black', style: 'short', beard: 'short', eye: 0x6e4628, skin: 3, cape: 0x4a2226, band: 0xa8843a },
    lys: { story: true, fem: true, dress: 0x2a3462, long: true, sleeve: 0x2a3462, shirt: 0x2a3462, band: 0xc8ccd8, hair: 'white', style: 'long', eye: 0x7a8ad0, skin: 0, lips: true, h: 2 },
    aurel: { story: true, fem: true, dress: 0x4a2a4a, long: true, sleeve: 0x4a2a4a, shirt: 0x4a2a4a, band: 0xd0a850, hair: 'grey', style: 'bun', eye: 0x8c6c2c, skin: 1, lips: true, h: 3, cape: 0x3a1f3c },
    sabine: { story: true, fem: true, dress: 0x46506a, long: true, sleeve: 0x46506a, shirt: 0x46506a, band: 0x8a8a92, hair: 'black', style: 'bun', eye: 0x50507a, skin: 1, specs: true },
    dorle: { story: true, fem: true, dress: 0xb0604a, bodice: 0x8a4638, shirt: 0xf1e6cc, sleeve: 0xf1e6cc, apron: 0xf6f0e2, long: true, hair: 'red', style: 'bun', hat: 'kerchief', hatColor: 0xf1e6cc, eye: 0x3f7c4e, skin: 1, blush: true, rolled: true },
    hob: { story: true, big: true, tunic: false, shirt: 0xd8ccb0, sleeve: 0xd8ccb0, vest: 0x2c5a50, legs: 0x4a4238, boots: 0x3a2a1e, bald: true, hair: 'brown', beard: 'short', eye: 0x6e4628, skin: 1, rolled: true },
    agnes: { story: true, fem: true, dress: 0x7a3440, bodice: 0x642834, shirt: 0xf1e6cc, sleeve: 0xf1e6cc, long: true, hair: 'grey', style: 'bun', eye: 0x50607a, skin: 0, h: -2 },
  });

  function build(name) {
    const L = people[name], M = PEOPLE.build(L);
    if (name === 'maron') {
      /* Trap Trick's head: every hair voxel of hers (bangs, the dome of curls, its crown), over the same skull; no ringlets */
      const TT = TRAPTRICK.build().model, C = TRAPTRICK.C, HAIRS = new Set([C.HAIR, C.HAIR_L, C.HAIR_D, C.HAIR_DD]), hd = M.parts.head.grid;
      for (const p of ['head', 'crown']) TT.parts[p].grid.each((x, y, z, v) => { if (HAIRS.has(v) && !(y < 60 && z > 0)) hd.set(x, y, z, v); });
      for (let x = -9; x <= 9; x++) for (let y = 70; y <= 78; y++) for (let z = -12; z <= 9; z++) { const v = hd.get(x, y, z); if (v >= 0 && y > 74) hd.del(x, y, z); }
      // two plaits over her shoulders, each in two pieces so they swing; a green ribbon at each end
      for (const s of [1, -1]) {
        const n = s > 0 ? 'L' : 'R', a = M.part('braid' + n + '1', 'head', [s * 8, 60, 1]), b = M.part('braid' + n + '2', 'braid' + n + '1', [s * 8.2, 49.5, 3.5]);
        const tone = (x, y, z, k) => { const n2 = H(x, y, z); return k ? (n2 < 0.6 ? C.HAIR_L : C.HAIR) : (n2 < 0.5 ? C.HAIR_D : C.HAIR); };
        for (let y = 62; y >= 41; y--) {
          const g = y >= 50 ? a : b, cz = 1 + Math.min(1, (62 - y) / 10) * 2.8, cx = s * (8.1 + Math.sin((62 - y) / 21 * 2) * 0.5), j = Math.floor((62 - y) / 2), ox = (j & 1) ? 0.8 : -0.8;
          if (y <= 44) { if (y >= 43) { for (let dx = -2; dx <= 2; dx++) for (let dz = -1; dz <= 1; dz++) if (Math.abs(dx) < 2 || dz === 0) g.set(cx + dx, y, cz + dz, y === 44 ? UNI : mul(UNI, 1.25)); } else { g.set(cx, y, cz, C.HAIR_D); g.set(cx, y, cz - 1, C.HAIR); } continue; }
          for (let dx = -1.6; dx <= 1.6; dx += 0.8) for (let dz = -1.4; dz <= 1.4; dz += 0.7) if (Math.hypot(dx, dz) < 1.9) g.set(cx + dx + ox, y, cz + dz, tone(R(cx + dx), y, R(cz + dz), ((62 - y) & 3) === 0 || (dz > 0.5 && ox * dx > 0)));
          g.set(cx - ox * 2, y, cz + 0.5, C.HAIR_DD);
        }
        const gg = hd;                                                // where each plait is gathered, behind the ear
        gg.ell(s * 8, 62, -0.5, 1.8, 1.6, 2.2, (x, y, z) => H(x, y, z) < 0.5 ? C.HAIR_D : C.HAIR);
      }
    }
    return M;
  }

  /* ------------------------------------------------------------- beasts -- */
  function horse(coat, mane) {
    const M = new VX.Model(0.024), D = mul(coat, 0.78), L = mul(coat, 1.1), HOOF = 0x3a3028, LEA = 0x4a2c1c;
    const tone = (x, y, z) => y < 42 ? D : H(x, y, z) < 0.1 ? mul(coat, 0.93) : y > 56 ? L : coat;
    const b = M.part('body', null, [0, 46, 0]);
    b.ell(0, 47, 0, 9, 10, 22, tone); b.ell(0, 48, 14, 8.6, 10.5, 9, tone); b.ell(0, 49, -15, 9.2, 10.5, 10, tone);
    b.box(-9, 40, 6, 9, 41, 7, (x, y, z) => Math.abs(x) >= 9 ? LEA : -1);
    b.paint((x, y, z) => (z === 6 || z === 7) && Math.hypot(x / 9.5, (y - 47) / 10.5) > 0.88, LEA);      // the girth
    const nk = M.part('neck', 'body', [0, 52, 17]);
    for (let t = 0; t <= 1; t += 0.04) nk.ell(0, 52 + t * 23, 17 + t * 12, 5.2 - t * 1.6, 6.5 - t * 2.2, 6 - t * 1.4, tone);
    for (let t = 0; t <= 1; t += 0.05) { const y = 58 + t * 22, z = 12 + t * 12.5; nk.box(-1, y - 4, z - 2, 1, y + 1, z, (x, yy, zz) => H(x, yy, zz) < 0.3 ? mul(mane, 0.8) : mane); nk.box(2, y - 7, z - 1, 2, y - 1, z + 1, mane); }
    nk.paint((x, y, z) => { const d = (y - 53) * 0.46 + (z - 18); return d > -1.5 && d < 1.8 && y < 62; }, 0x6a3a22);      // the collar
    const hd = M.part('head', 'neck', [0, 76, 29]);
    hd.ell(0, 76, 32, 3.6, 4.2, 4.6, tone); for (let t = 0; t <= 1; t += 0.05) hd.ell(0, 75 - t * 9, 33 + t * 10, 3.2 - t * 0.7, 3.4 - t * 0.8, 3 - t * 0.2, t > 0.75 ? mul(coat, 0.62) : tone);
    for (const s of [1, -1]) { hd.box(s * 4, 76, 34, s * 4, 77, 35, 0x1c1410); hd.set(s * 4, 77, 35, 0xffffff); hd.box(s * 2, 80, 29, s * 3, 83, 30, coat); hd.set(s * 2, 84, 29, D); hd.set(s * 2, 66, 45, 0x2a1c16); }
    hd.box(-1, 78, 32, 1, 81, 34, mane); hd.box(0, 74, 37, 0, 78, 36, 0xf4ece0); hd.paint((x, y, z) => Math.abs((y - 71) - (z - 37) * 0.2) < 0.8 && z > 33, LEA); hd.box(-4, 74, 31, 4, 74, 32, (x) => Math.abs(x) === 4 ? LEA : -1);
    for (const [n, x, z] of [['FL', 5, 14], ['FR', -5, 14], ['BL', 5, -16], ['BR', -5, -16]]) {
      const up = M.part('up' + n, 'body', [x, 42, z]), lo = M.part('lo' + n, 'up' + n, [x, 22, z]), back = n[0] === 'B';
      for (let y = 22; y <= 44; y++) { const t = (y - 22) / 22, r = back ? 2.2 + t * 2.6 : 2 + t * 1.9; up.disc(x, z + (back ? t * 1.2 - 0.6 : 0), r, y, y, tone); }
      for (let y = 0; y <= 22; y++) lo.disc(x, z + (y < 4 ? 0.6 : 0), y < 4 ? 2.6 : y < 8 ? 1.9 : 1.7, y, y, (X, Y, Z) => Y < 4 ? HOOF : Y < 9 ? 0xe8e0d2 : D);
    }
    const tl = M.part('tail', 'body', [0, 55, -24]);
    for (let y = 55; y >= 22; y--) tl.disc(0, -25 - Math.min(4, (55 - y) * 0.4), y > 50 ? 1.2 : y < 27 ? 1.3 : 2.2, y, y, (x, yy, z) => H(x, yy, z) < 0.3 ? mul(mane, 0.8) : mane);
    return M;
  }
  function cow() {
    const M = new VX.Model(0.024), W = 0xf1ebe0, K = 0x5a3a2a, P = 0xe8a8a0;
    const tone = (x, y, z) => H((x + 60) >> 3, (y + 2) >> 3, (z + 60) >> 3) < 0.42 ? (H(x, y, z) < 0.1 ? mul(K, 0.9) : K) : (H(x, y, z) < 0.08 ? mul(W, 0.95) : W);
    const b = M.part('body', null, [0, 40, 0]);
    b.ell(0, 41, 0, 10, 11, 24, tone); b.ell(0, 43, 16, 9.5, 10.5, 9, tone); b.ell(0, 44, -17, 10, 10, 9, tone); b.ell(0, 29, -14, 4.5, 3.5, 5, P);
    const hd = M.part('head', 'body', [0, 50, 24]);
    hd.ell(0, 49, 25, 4.5, 5, 5, tone); hd.ell(0, 47, 31, 4.4, 4.6, 5, (x, y, z) => Math.abs(x) < 2 ? W : K); hd.ell(0, 43, 36, 4, 3.2, 3, P);
    for (const s of [1, -1]) { hd.box(s * 4, 48, 34, s * 4, 49, 34, 0x1c1410); hd.box(s * 5, 50, 29, s * 8, 51, 30, K); hd.line(s * 3, 52, 30, s * 6, 56, 31, 0xe8dcc0, 0.5); hd.set(s * 2, 43, 39, 0x6a3a38); }
    for (const [n, x, z] of [['FL', 6, 15], ['FR', -6, 15], ['BL', 6, -17], ['BR', -6, -17]]) { const u = M.part('up' + n, 'body', [x, 36, z]); for (let y = 0; y <= 37; y++) u.disc(x, z, y < 4 ? 2.6 : y < 18 ? 2.1 : 2.1 + (y - 18) * 0.12, y, y, (X, Y, Z) => Y < 4 ? 0x3a3028 : tone(X, Y, Z)); }
    const tl = M.part('tail', 'body', [0, 50, -25]); tl.line(0, 50, -26, 0, 28, -28, W, 0.5); tl.ell(0, 25, -28, 1.4, 3, 1.4, K);
    return M;
  }

  /* -------------------------------------------------------------- things -- */
  const props = {
    candle() { const g = G(); g.disc(0, 0, 4, 0, 0, BRASS); g.disc(0, 0, 4.6, 1, 1, (x, y, z) => Math.hypot(x, z) > 3.6 ? BRASS : -1); g.disc(0, 0, 1.6, 1, 2, mul(BRASS, 0.8)); g.box(5, 1, -1, 6, 2, 1, (x, y, z) => x === 5 || z ? BRASS : -1); g.disc(0, 0, 1.3, 2, 9, (x, y, z) => H(x, y, z) < 0.2 ? 0xe8dcbc : 0xf6eeda); g.set(1, 10, 0, 0xf6eeda); g.set(0, 10, 0, 0x3a2a24); g.set(0, 11, 0, 0x241a18); g.set(-2, 7, 0, 0xf6eeda); g.set(-2, 6, 0, 0xe8dcbc); return g; },
    candle_melt() { const g = G(); g.disc(0, 0, 4, 0, 0, BRASS); g.disc(0, 0, 4.6, 1, 1, (x, y, z) => Math.hypot(x, z) > 3.6 ? BRASS : 0xf0e6ce); g.disc(1, 1, 2, 2, 2, 0xf6eeda); g.disc(4, 2, 2, 0, 0, 0xf0e6ce); g.disc(-4, -3, 1.4, 0, 0, 0xf0e6ce); g.set(1, 3, 1, 0x241a18); return g; },
    flame() { const g = G(), A = VX.glow(0xfff2b0), B = VX.glow(0xffc04a), C = VX.glow(0xff8a2a); g.set(0, 0, 0, VX.glow(0x8ab4ff)); g.box(-1, 1, -1, 1, 2, 1, (x, y, z) => x && z ? -1 : B); g.set(0, 1, 0, A); g.set(0, 2, 0, A); g.box(0, 3, 0, 0, 4, 0, B); g.set(0, 5, 0, C); g.set(1, 3, 0, C); g.set(-1, 3, 0, C); return g; },
    letter() { const g = G(); g.box(-6, 0, 0, 6, 17, 0, (x, y) => (y < 3 || y > 14 || Math.abs(x) > 4) ? PAPER : (y % 2 === 0 && !(y === 4 && x > 1) ? 0x8a7a8a : PAPER)); g.box(-1, 15, 0, 1, 16, 0, BRASS); g.disc(0, 0, 0.1, 0, 0, -1); g.box(-1, 1, 0, 1, 2, 1, WAX); g.set(0, 2, 1, 0xd84a58); return g; },
    bird_body() { const g = G(); for (let z = -7; z <= 7; z++) { const h = z < -3 ? 1 : z > 4 ? 1 : 2; for (let y = 0; y <= h; y++) g.set(0, y, z, (z + y) % 4 === 0 ? PAPER_D : PAPER); } g.box(0, 2, 5, 0, 5, 7, PAPER); g.box(0, 5, 8, 0, 5, 9, PAPER_D); g.box(0, 2, -9, 0, 4, -7, PAPER); g.box(-1, 1, -2, 1, 1, 2, PAPER); g.set(0, 3, 1, WAX); g.set(0, 3, 0, WAX); return g; },
    bird_wing() { const g = G(); for (let x = 0; x <= 13; x++) for (let z = -4; z <= 4; z++) { const hw = 4 - x * 0.28; if (Math.abs(z + x * 0.15) <= hw) g.set(x, 0, z, x % 4 === 3 ? PAPER_D : (x > 3 && x < 11 && z % 2 === 0 ? 0xc4b6c0 : PAPER)); } return g; },
    book() { const g = G(), C = 0x3b3558; g.box(-5, 0, -7, 5, 4, 7, (x, y, z) => y === 0 || y === 4 ? C : x === -5 ? mul(C, 0.85) : (x === 5 || Math.abs(z) === 7 ? -1 : PAPER_D)); g.box(-4, 1, -6, 4, 3, 6, (x, y, z) => x === 4 || Math.abs(z) === 6 ? (y & 1 ? PAPER_D : PAPER) : -1); g.box(-1, 5, -1, 1, 5, 1, (x, y, z) => x && z ? -1 : BRASS); for (const [x, z] of [[4, 6], [4, -6], [-4, 6], [-4, -6]]) g.set(x, 5, z, BRASS); return g; },
    book_open() { const g = G(), C = 0x3b3558; for (let x = -9; x <= 9; x++) for (let z = -6; z <= 6; z++) { const ax = Math.abs(x); g.set(x, 0, z, C); if (ax >= 1 && ax <= 8 && Math.abs(z) <= 5) { g.set(x, 1, z, z % 2 === 0 && ax > 1 && ax < 8 && Math.abs(z) < 5 && !(x > 0 && z > 1) ? 0x9a8a96 : PAPER); if (ax < 6) g.set(x, 2, z, z % 2 === 0 && ax > 1 && Math.abs(z) < 5 && !(x > 0 && z > 1) ? 0x9a8a96 : PAPER); } } for (const [x, z] of [[4, 3], [3, 3], [5, 3], [4, 2], [4, 4]]) g.set(x, 2, z, WAX); return g; },
    coin() { const g = G(); g.disc(0, 0, 1.3, 0, 0, (x, y, z) => x + z > 0 ? 0xffe08a : 0xe0b040); return g; },
    coins() { const g = G(); for (const [x, z, n] of [[0, 0, 4], [3, 1, 2], [-3, 1, 3], [1, 4, 1], [-1, -3, 2]]) for (let i = 0; i < n; i++) g.disc(x, z, 1.2, i, i, i & 1 ? 0xe0b040 : 0xf4cf62); return g; },
    pouch() { const g = G(); g.ell(0, 3, 0, 4, 3.4, 4, (x, y, z) => H(x, y, z) < 0.2 ? 0x6a4226 : 0x7a5030); g.disc(0, 0, 2, 7, 7, BRASS); g.disc(0, 0, 2.6, 8, 9, (x, y, z) => (x + z) & 1 ? 0x7a5030 : 0x6a4226); return g; },
    jar() { const g = G(); g.disc(0, 0, 4, 0, 9, (x, y, z) => Math.hypot(x, z) > 3 ? (y < 5 && H(x, y, z) < 0.4 ? 0xe0b040 : 0x9ab4a8) : y < 5 ? 0xd0a038 : -1); g.disc(0, 0, 3.2, 10, 10, 0xb89a72); g.disc(0, 0, 3.4, 11, 11, 0xa08058); return g; },
    bun() { const g = G(); g.ell(0, 1.4, 0, 3, 1.8, 3, (x, y, z) => { const a = Math.atan2(z, x) * 1.2 + Math.hypot(x, z) * 1.6; return y >= 2 && Math.sin(a * 2) > 0.2 ? 0x9a5a22 : y >= 2 ? 0xe8b460 : 0xc98a42; }); return g; },
    bundle() { const g = G(), C = 0xd8e0ea, B = 0x5a7ab0; g.ell(0, 4, 0, 6, 4.4, 6, (x, y, z) => ((x + 20) % 4 === 0 || (z + 20) % 4 === 0) ? B : C); g.box(-1, 8, -1, 1, 10, 1, C); for (const s of [-1, 1]) { g.box(s * 2, 9, -1, s * 4, 11, 1, (x, y) => Math.abs(x) === 4 && y === 9 ? -1 : C); g.set(s * 4, 11, 0, B); } return g; },
    toyhen() { const g = G(), W2 = 0xd8a868, D = 0xb07f42; g.ell(0, 3, 0, 2, 2, 3, (x, y, z) => H(x, y, z) < 0.25 ? D : W2); g.box(0, 5, 2, 0, 7, 3, W2); g.set(0, 6, 4, 0xc8803a); g.set(0, 8, 2, 0xb83a3a); g.box(0, 5, -4, 0, 6, -3, D); g.box(-1, 0, -1, 1, 0, 1, D); g.set(1, 6, 3, 0x2a1c16); g.set(-1, 6, 3, 0x2a1c16); return g; },
    apple() { const g = G(); g.ell(0, 1.5, 0, 1.6, 1.5, 1.6, (x, y, z) => x < 0 && y > 1 ? 0xe85a4a : 0xc8303a); g.set(0, 4, 0, 0x5a3a22); g.set(1, 4, 0, 0x5a8a3a); return g; },
    bowl() { const g = G(); g.disc(0, 0, 3, 0, 0, OAK_D); for (let y = 1; y <= 3; y++) g.disc(0, 0, 3 + y * 0.7, y, y, (x, yy, z) => Math.hypot(x, z) > 2.2 + yy * 0.7 ? OAK : yy === 2 ? 0xb07a44 : yy < 2 ? 0x8a5a32 : -1); return g; },
    mug() { const g = G(); g.disc(0, 0, 2.4, 0, 6, (x, y, z) => y === 0 || Math.hypot(x, z) > 1.6 ? (y === 1 || y === 5 ? 0x7a7a84 : OAK) : y === 4 ? 0xe8dcc0 : y < 4 ? 0xd8c8a0 : -1); g.box(3, 2, 0, 4, 5, 0, (x, y) => x === 4 || y === 2 || y === 5 ? OAK_D : -1); return g; },
    loaf() { const g = G(); g.ell(0, 2, 0, 6, 2.8, 3.4, (x, y, z) => y >= 3 && (x + 30) % 4 === 0 ? 0xe8c890 : y >= 2 ? 0xc98a42 : 0xa86e30); return g; },
    jug() { const g = G(), C = 0x6a8ab0; for (let y = 0; y <= 12; y++) { const r = y < 8 ? 2.6 + Math.sin(y / 8 * Math.PI) * 1.6 : 2.2 + (y > 10 ? 0.6 : 0); g.disc(0, 0, r, y, y, (x, yy, z) => Math.hypot(x, z) > r - 1.1 || y === 0 ? (y === 4 || y === 6 ? 0xf1ece2 : C) : -1); } g.box(4, 4, 0, 5, 10, 0, (x, y) => x === 5 || y === 4 || y === 10 ? C : -1); return g; },
    eggs() { const g = G(); for (let y = 0; y <= 4; y++) g.disc(0, 0, 4 + y * 0.3, y, y, (x, yy, z) => Math.hypot(x, z) > 2.8 + yy * 0.3 || yy === 0 ? ((x + yy + z) & 1 ? 0xb08850 : 0x8e6a3c) : yy < 4 ? 0xd8c078 : -1); for (const [x, z] of [[0, 0], [2, 1], [-2, 1], [0, -2], [1, 3], [-1, 2]]) g.ell(x, 5, z, 0.9, 1.2, 0.9, (x + z) & 1 ? 0xf4ead8 : 0xe0bc94); return g; },
    trunk() { const g = G(); g.box(-11, 0, -7, 11, 12, 7, (x, y, z) => Math.abs(x) === 8 || Math.abs(x) === 11 && (y === 0 || y === 12) ? 0x3a3a42 : y === 8 ? mul(OAK_D, 0.7) : (y % 4 === 0 ? mul(OAK, 0.8) : OAK)); g.box(-1, 7, 8, 1, 9, 8, BRASS); g.box(-12, 6, -1, -12, 8, 1, 0x4a2c1c); g.box(12, 6, -1, 12, 8, 1, 0x4a2c1c); return g; },
    grain() { const g = G(); g.ell(0, 3, 0, 5, 3.6, 5, (x, y, z) => y >= 5 ? -1 : Math.hypot(x, z) < 4 && y >= 4 ? (H(x, y, z) < 0.5 ? 0xe8c86a : 0xd0a84a) : ((x + y + z) & 1 ? 0xb08850 : 0x8e6a3c)); g.line(-5, 4, 0, 0, 11, 0, 0x9a7440); g.line(5, 4, 0, 0, 11, 0, 0x9a7440); return g; },
    pail(full) { const g = G(); for (let y = 0; y <= 11; y++) { const r = 4 + y * 0.12; g.disc(0, 0, r, y, y, (x, yy, z) => Math.hypot(x, z) > r - 1.1 || y === 0 ? (y === 2 || y === 9 ? 0x585c66 : ((x + z) & 1 ? OAK : OAK_D)) : y === 9 ? 0x5a8ccc : -1); } for (let a = -5; a <= 5; a++) g.set(a, 12 + R(Math.sqrt(Math.max(0, 25 - a * a))), 0, 0x3a3a42); return g; },
    feather() { const g = G(); for (let y = 0; y <= 14; y++) { g.set(0, y, 0, 0xe8e0d0); if (y > 4) { const w = y < 8 ? 1 : y < 13 ? 2 : 1; for (let x = -w; x <= w; x++) g.set(x, y, 0, x === 0 ? 0xd8ccb4 : (H(x, y, 1) < 0.2 ? 0xd0d8e8 : 0xf6f2ea)); } } return g; },
    stool() { const g = G(); g.disc(0, 0, 7, 16, 18, (x, y, z) => y === 18 ? ((x + 20) % 5 === 0 ? mul(OAK, 0.8) : OAK_L) : OAK); for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + 0.5; g.line(Math.cos(a) * 4, 16, Math.sin(a) * 4, Math.cos(a) * 7, 0, Math.sin(a) * 7, OAK_D, 0.6); } return g; },
    cart_body() {                                        // a two-wheeled farm cart: its axle at the origin, the shafts to +z
      const g = G(), pl = (a, w, c) => ((a + 300) % w === 0 ? mul(c, 0.66) : H(Math.floor((a + 300) / w), 3, 5) < 0.4 ? mul(c, 0.9) : c);
      g.box(-19, 6, -34, 19, 7, 30, (x) => pl(x, 6, OAK)); g.box(-2, -1, -1, 2, 5, 1, OAK_D); g.box(-24, -1, -1, 24, 1, 1, OAK_D);
      for (const s of [-1, 1]) { g.box(s * 14, 3, -34, s * 12, 5, 30, OAK_D); for (let z = -34; z <= 30; z += 16) g.box(s * 20, 6, z, s * 21, 24, z + 1, OAK_D); for (const y of [11, 12, 13, 17, 18, 19]) g.box(s * 19, y, -34, s * 19, y, 30, (x, yy) => pl(yy * 7, 5, OAK_L)); g.box(s * 19, 23, -34, s * 21, 24, 30, OAK_D); g.box(s * 13, 4, 30, s * 12, 6, 96, (x, y, z) => z > 92 ? 0x3a3a42 : OAK_D); }
      for (const z of [-34]) for (const y of [11, 12, 13, 17, 18, 19]) g.box(-19, y, z, 19, y, z, OAK_L);
      g.box(-20, 20, 14, 20, 22, 27, (x, y, z) => y === 22 ? pl(z, 5, OAK_L) : OAK_D); g.box(-20, 24, 11, 20, 33, 12, (x, y) => pl(y, 5, OAK)); g.box(-19, 8, 28, 19, 14, 30, OAK_D);
      return g;
    },
    cart_rim() { const g = G(); for (let y = -30; y <= 30; y++) for (let z = -30; z <= 30; z++) { const d = Math.hypot(y, z), a = (Math.atan2(y, z) + Math.PI) / TAU * 10, f = Math.abs(a - R(a)) * d * TAU / 10; for (let x = -1; x <= 1; x++) { if (d > 29.4 && d < 30.6) g.set(x, y, z, 0x4a4a52); else if (d > 25.6 && d <= 29.4) g.set(x, y, z, H(R(a * 2) >> 1, 1, 2) < 0.5 ? OAK : OAK_L); else if (d < 5.2) g.set(x, y, z, d < 2 ? 0x3a3a42 : OAK_D); else if (x === 0 && f < 1.2 && d < 26) g.set(x, y, z, OAK_L); } } g.box(-3, -2, -2, 3, 2, 2, (x, y, z) => Math.abs(y) === 2 && Math.abs(z) === 2 ? -1 : 0x3a3a42); return g; },
    rune(k) { return G(); },
  };
  delete props.rune;

  window.CAST = { people, build, beasts: { horse: () => horse(0x8a5a34, 0x3a2418), cow }, props };
})();
