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

  /* Chapter One. The High Table (third years who wear pale capes and white gloves): Lucan Vael, Dorn, Sibyl Voss. Bet
     Marl, a scholarship girl who works her way in the kitchen. Proctor Vane, hired to catch a trickster */
  const PALE = 0xd6d4dc, SILV = 0xe8e2cc, GLOVE = 0xf4f0ea;
  Object.assign(people, {
    lucan: boy({ hair: 0xeadfc0, style: 'long', skin: 0, eye: 0x7a78b8, tie: T3, cape: PALE, band: SILV, gloves: GLOVE, h: 5, lips: true }),
    dorn: { story: true, big: true, tunic: false, uniform: UNI, cape: PALE, band: SILV, tie: T3, legs: SLATE, boots: 0x4a3222, shirt: 0xf4efe2, gloves: GLOVE, hair: 0x4a3626, style: 'short', skin: 1, eye: 0x6e5a3a, h: 1 },
    sibyl: girl({ hair: 0x3c2c50, style: 'bob', skin: 0, eye: 0x8fb4cc, tie: T3, cape: PALE, band: SILV, trim: SILV, gloves: GLOVE, h: 2, lips: true }),
    bet: girl({ hair: 0xd8702c, style: 'curls', skin: 1, eye: 0x4f9488, freckles: true, apron: 0xd8ccb0, cape: null, rolled: true, h: -2 }),
    vane: { story: true, fem: false, dress: 0x3b3e48, long: true, sleeve: 0x3b3e48, shirt: 0x3b3e48, band: 0x8a8a94, hair: 0x22222a, style: 'short', eye: 0x8a96a4, skin: 0, specs: true, gloves: 0x2a2a30, h: 3 },
  });

  /* Chapter Two. Mistress Thorne, the wandwright, with her tub of wands; Cassian Roe and Odile Fray, second years, who
     think other people are very funny */
  Object.assign(people, {
    thorne: { story: true, big: true, fem: true, dress: 0x6a5038, bodice: 0x55402c, shirt: 0xd8c8a0, sleeve: 0xd8c8a0, apron: 0x8a6a42, long: true, hair: 0xb8bcc4, style: 'bun', eye: 0x4f7a50, skin: 2, rolled: true, gloves: 0x6a4a30, ribbon: 0xc8a24a },
    cassian: boy({ hair: 0x6e2434, style: 'bob', skin: 0, eye: 0x9a8a3c, tie: T2, h: 4, lips: true }),
    odile: girl({ hair: 0xe0b878, style: 'curls', skin: 0, eye: 0x6aa0c0, tie: T2, h: 1, blush: true, lips: true }),
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

  /* a wand, 33 cm: a turned grip, the shaft thinning to its tip; three ways of turning it */
  function wandGrid(c, d, kind) {
    const g = G();
    for (let z = -4; z <= 9; z++) { if (z <= 0) { for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) if (Math.abs(x) + Math.abs(y) <= (kind === 2 && (z === -2) ? 2 : 1)) g.set(x, y, z, z === 0 || z === -4 ? d : (z & 1) && kind ? mul(c, 0.8) : c); } else g.set(0, 0, z, kind === 1 && z % 3 === 0 ? d : z === 9 ? mul(c, 1.2) : c); }
    if (kind === 0) { g.set(0, 1, 1, c); g.set(0, -1, 1, c); }
    return g;
  }
  /* a card's suit, drawn in light (9 x 9 voxels, two thick) */
  function suitGrid(suit, c) {
    const g = G(), P = { heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'], diamond: ['...#...', '..###..', '.#####.', '.#####.', '..###..', '...#...'], spade: ['...#...', '..###..', '.#####.', '#######', '##.#.##', '..###..'], club: ['..###..', '..###..', '###.###', '#######', '...#...', '..###..'] }[suit];
    P.forEach((row, r) => [...row].forEach((ch, i) => { if (ch === '#') { g.set(i - 3, 3 - r, 0, VX.glow(c)); } }));
    return g;
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
      for (const s of [-1, 1]) { g.box(s * 14, 3, -34, s * 12, 5, 30, OAK_D); for (let z = -34; z <= 30; z += 16) g.box(s * 20, 6, z, s * 21, 24, z + 1, OAK_D); for (const y of [11, 12, 13, 17, 18, 19]) g.box(s * 19, y, -34, s * 19, y, 30, (x, yy) => pl(yy * 7, 5, OAK_L)); g.box(s * 19, 23, -34, s * 21, 24, 30, OAK_D); }
      for (const z of [-34]) for (const y of [11, 12, 13, 17, 18, 19]) g.box(-19, y, z, 19, y, z, OAK_L);
      // the pole between the pair, the bars they pull on, the traces, and the yoke at their collars
      g.line(0, 4, 18, 0, 12, 116, (x, y, z) => z > 112 ? 0x3a3a42 : OAK_D, 1.2); g.box(-19, 5, 34, 19, 6, 35, OAK_D); g.box(-24, 12, 112, 24, 13, 113, (x) => Math.abs(x) > 22 ? 0x3a3a42 : OAK_D);
      for (const s of [-1, 1]) { g.box(s * 17 - 9, 6, 38, s * 17 + 9, 7, 39, OAK_D); g.line(s * 17, 5, 35, s * 17, 6, 38, 0x3a3a42, 0.4); for (const t of [-1, 1]) { g.line(s * 17 + t * 9, 6, 39, s * 17 + t * 10, 13, 76, 0x4a2c1c, 0.4); g.line(s * 17 + t * 10, 13, 76, s * 17 + t * 8, 17, 110, 0x4a2c1c, 0.4); } g.line(s * 17, 13, 113, s * 17, 18, 112, 0x4a2c1c, 0.4); }
      g.box(-20, 20, 14, 20, 22, 27, (x, y, z) => y === 22 ? pl(z, 5, OAK_L) : OAK_D); g.box(-20, 24, 11, 20, 33, 12, (x, y) => pl(y, 5, OAK)); g.box(-19, 8, 28, 19, 14, 30, OAK_D);
      return g;
    },
    cart_rim() { const g = G(); for (let y = -30; y <= 30; y++) for (let z = -30; z <= 30; z++) { const d = Math.hypot(y, z), a = (Math.atan2(y, z) + Math.PI) / TAU * 10, f = Math.abs(a - R(a)) * d * TAU / 10; for (let x = -1; x <= 1; x++) { if (d > 29.4 && d < 30.6) g.set(x, y, z, 0x4a4a52); else if (d > 25.6 && d <= 29.4) g.set(x, y, z, H(R(a * 2) >> 1, 1, 2) < 0.5 ? OAK : OAK_L); else if (d < 5.2) g.set(x, y, z, d < 2 ? 0x3a3a42 : OAK_D); else if (x === 0 && f < 1.2 && d < 26) g.set(x, y, z, OAK_L); } } g.box(-3, -2, -2, 3, 2, 2, (x, y, z) => Math.abs(y) === 2 && Math.abs(z) === 2 ? -1 : 0x3a3a42); return g; },
    /* Chapter One */
    tophat() { const g = G(), K = 0x1e1a26; g.disc(0, 0, 10, 0, 0, (x, y, z) => Math.hypot(x, z) > 9 ? 0x342c40 : K); for (let y = 1; y <= 12; y++) g.disc(0, 0, 6.4 + (y > 9 ? 0.5 : 0), y, y, (x, yy, z) => yy < 4 ? 0x3a5fe0 : Math.hypot(x, z) < 5 && yy < 12 ? -1 : K); g.box(-3, 4, 7, 2, 11, 7, (x, y) => (x === -3 || x === 2) && (y === 4 || y === 11) ? -1 : Math.abs(x + 0.5) + Math.abs(y - 7.5) < 2 ? 0xdc2741 : 0xf7f4fd); return g; },
    turnip() { const g = G(), L2 = VX.glow(0xffc04a); g.ell(0, 5, 0, 6, 5.4, 6, (x, y, z) => { if (z > 4 && ((Math.abs(Math.abs(x) - 2.5) < 1.1 && Math.abs(y - 7) < 1.1) || (y >= 3 && y <= 4 && Math.abs(x) < 4) || (y === 5 && Math.abs(x) > 2.4 && Math.abs(x) < 4.6))) return L2; return y > 7 ? 0xb06aa0 : H(x, y, z) < 0.2 ? 0xe4dcc8 : 0xf0e8d6; }); for (const [x, z] of [[0, 0], [1, 1], [-1, 0], [0, -1]]) g.box(x, 10, z, x + (x ? x : 0), 15, z, 0x5a9a44); g.box(0, -1, 0, 0, -1, 0, 0xd8ccb4); return g; },
    ledger() { const g = G(), C = 0x2c2436; g.box(-9, 0, -12, 9, 7, 12, (x, y, z) => y === 0 || y === 7 ? C : x === -9 ? mul(C, 0.8) : (x === 9 || Math.abs(z) === 12) ? -1 : PAPER_D); g.box(-8, 1, -11, 8, 6, 11, (x, y, z) => x === 8 || Math.abs(z) === 11 ? (y & 1 ? PAPER_D : PAPER) : -1); g.box(-3, 8, -3, 3, 8, 3, (x, y, z) => Math.abs(x) + Math.abs(z) < 4 ? 0xe8e2cc : -1); return g; },
    page() { const g = G(); g.box(-5, 0, 0, 5, 14, 0, (x, y) => y > 12 || y < 2 || Math.abs(x) > 3 ? PAPER : (y % 2 === 0 ? (H(x, y, 2) < 0.75 ? INK : PAPER) : PAPER)); g.set(0, 13, 1, 0xdc2741); return g; },
    tray() { const g = G(); g.box(-11, 0, -7, 11, 0, 7, OAK); g.box(-11, 1, -7, 11, 1, 7, (x, y, z) => Math.abs(x) === 11 || Math.abs(z) === 7 ? OAK_D : -1); for (const [x, z] of [[-6, 0], [5, -2]]) { g.disc(x, z, 4, 1, 1, 0xe8e0d0); g.ell(x, 2, z, 2.4, 1, 2, x < 0 ? 0xc98a42 : 0x8ab060); } g.disc(1, 4, 1.8, 1, 6, 0x8ab0c8); return g; },
    glove() { const g = G(), W2 = 0xf4f0ea; g.box(-2, 0, -1, 2, 5, 1, W2); for (const [x, h] of [[-2, 9], [-1, 10], [0, 10], [1, 9]]) g.box(x, 6, 0, x, h, 0, W2); g.box(3, 3, 0, 4, 5, 0, W2); g.box(-2, -2, -1, 2, -1, 1, 0xe8e2cc); return g; },
    hood() { const g = G(), T0 = 0xa4aab4; for (let y = 0; y <= 12; y++) g.disc(0, 0, 4.4, y, y, (x, yy, z) => Math.hypot(x, z) < 3.4 ? -1 : z > 2 && yy > 2 && yy < 10 ? -1 : H(x, yy, z) < 0.2 ? 0x8a9098 : T0); for (let k = 0; k < 4; k++) g.disc(0, 0, 4.4 - k, 13 + k, 13 + k, T0); g.line(0, 16, 0, 0, 19, 0, 0x585c66); g.line(-4, 2, 0, 4, 2, 0, 0x585c66); return g; },
    stand() { const g = G(), st = (x, y, z) => H(x >> 2, y >> 2, z >> 2) < 0.4 ? 0xb0a692 : 0xbfb5a4; g.box(-9, 0, -9, 9, 3, 9, st); g.box(-7, 4, -7, 7, 6, 7, st); for (let y = 7; y < 38; y++) g.disc(0, 0, 4.6, y, y, (x, yy, z) => Math.cos(Math.atan2(z, x) * 8) < -0.4 ? 0x9a907e : 0xbfb5a4); g.box(-7, 38, -7, 7, 40, 7, st); g.box(-9, 41, -9, 9, 43, 9, (x, y, z) => y === 43 && Math.abs(x) < 8 && Math.abs(z) < 8 ? 0xcabfae : 0xd8cebc); return g; },
    blackcard() { const g = G(); g.box(-5, 0, 0, 5, 14, 0, (x, y) => (Math.abs(x) === 5 && (y === 0 || y === 14)) ? -1 : Math.abs(x) === 5 || y === 0 || y === 14 ? 0x3a3448 : 0x14111a); for (const [y, w] of [[13, 0], [12, 1], [11, 1], [10, 2], [9, 3], [8, 3], [7, 3], [6, 0], [5, 0], [4, 1]]) for (let x = -w; x <= w; x++) if (!(y === 7 && Math.abs(x) === 1)) g.set(x, y, 1, 0xe8e4f0); return g; },
    net() { const g = G(); g.line(0, 0, 0, 0, 46, 0, OAK_L, 0.5); for (let k = 0; k < 60; k++) { const a = k / 60 * TAU; g.set(R(Math.cos(a) * 10), R(57 + Math.sin(a) * 10), 0, 0x585c66); } for (let y = 47; y < 67; y++) for (let x = -9; x <= 9; x++) { const d = Math.hypot(x, y - 57); if (d < 9.6 && ((x + y) % 3 === 0 || (x - y + 90) % 3 === 0)) g.set(x, y, -R((9.6 - d) * 0.9), 0xe8e4da); } return g; },
    bullseye() { const g = G(); g.box(-4, 0, -4, 4, 10, 4, (x, y, z) => Math.abs(x) === 4 || Math.abs(z) === 4 || y === 0 || y === 10 ? 0x3a3a42 : -1); g.disc(0, 0, 3, 11, 12, 0x585c66); g.box(-2, 3, 5, 2, 7, 5, VX.glow(0xffe9a8)); g.box(0, 13, 0, 0, 16, 0, 0x585c66); g.box(-2, 17, 0, 2, 17, 0, 0x585c66); return g; },
    sprout() { const g = G(); for (let y = 0; y < 7; y++) g.disc(0, 0, 3.4 + y * 0.2, y, y, (x, yy, z) => Math.hypot(x, z) > 2.4 + yy * 0.2 || yy === 5 ? (yy === 5 && Math.hypot(x, z) < 3 ? 0x4a3424 : 0xb0603c) : -1); g.box(0, 6, 0, 0, 13, 0, 0x5a9a44); for (const [x, y, z] of [[1, 10, 0], [2, 11, 0], [-1, 12, 0], [-2, 13, 0], [0, 14, 1], [0, 14, -1], [0, 15, 0]]) g.set(x, y, z, 0x74b04c); g.set(0, 16, 0, VX.glow(0x9af0c0)); return g; },
    sprout_flat() { const g = G(); for (const [x, z, h] of [[0, 0, 2], [4, 1, 1], [-4, -2, 2], [2, -4, 1], [-2, 4, 1], [5, -3, 1]]) g.box(x - 1, 0, z - 1, x + 1, h, z + 1, 0xb0603c); g.ell(0, 1, 0, 3, 1, 3, 0x4a3424); g.line(0, 2, 0, 6, 1, 3, 0x5a9a44); g.set(6, 2, 3, 0x74b04c); g.set(7, 1, 3, 0x9ac0a0); return g; },
    bell_bow() { const g = G(), P2 = 0xf2659f; for (const s of [-1, 1]) { g.ell(s * 6, 0, 0, 5, 3.4, 1.4, P2); g.line(s, -1, 0, s * 5, -11, 0, mul(P2, 0.85), 1); } g.ell(0, 0, 0, 2, 2, 2, mul(P2, 0.8)); return g; },
    /* Chapter Two: the wands. Each lies along z, its grip at the origin, its tip at +z */
    wand_oak() { return wandGrid(0xa8743e, 0x6b4426, 0); }, wand_ash() { return wandGrid(0xd8c49a, 0xa8925e, 1); }, wand_cherry() { return wandGrid(0x9a4a34, 0x5e2a20, 2); }, wand_holly() { return wandGrid(0x4a5a48, 0x2c3a2c, 1); }, wand_birch() { return wandGrid(0xeee6d6, 0x8a8478, 0); }, wand_plum() { return wandGrid(0x6a4668, 0x40283e, 2); },
    wand_leaf() { const g = wandGrid(0x8a6a3a, 0x5a4020, 1); g.set(0, 1, 11, 0x74b04c); g.set(1, 2, 11, 0x5f9a42); g.set(0, 2, 12, 0x8ac85a); return g; },
    wand_stub() { const g = G(); g.box(-1, -1, -3, 1, 1, 4, (x, y, z) => Math.abs(x) + Math.abs(y) === 2 ? -1 : (z & 1) ? 0x6b4426 : 0x7a5030); g.disc(0, 0, 0, 0, 0, 0x6b4426); g.box(0, 0, 5, 0, 0, 9, 0x8a5a32); return g; },
    /* ... and what they turn into, once they've found who they were after: each the nature of the one who holds it. Held
       upright they're seen from -y; the grip's at the origin, the working end at +z. */
    wand_lucan() { const g = wandGrid(0xe8e0d0, 0xb8bcc8, 1); g.set(0, 0, 10, 0xd8dce4); g.set(0, 0, -5, 0xd8dce4); return g; },
    form_isolde() {                                      // a frost-white quill: to know, and to have it written down
      const g = G(), E = VX.glow(0x3f7cae), A = 0xf2f8fe, A2 = VX.glow(0x587690), S2 = VX.glow(0xd8f2ff);
      g.box(0, 0, -6, 0, 0, 25, (x, y, z) => z < -3 ? 0x3a4a68 : 0xdfeaf4); for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.box(x, y, -3, x, y, 1, 0xc8a850); g.set(0, 0, -7, S2);
      for (let z = 3; z <= 26; z++) { const u = (z - 3) / 23, w = Math.round(4.6 * Math.sin(Math.PI * Math.min(1, 0.12 + u * 0.88)) ** 0.75), bend = Math.round(u * u * 3), cut = z === 9 || z === 15 || z === 20 ? 2 : 0; for (let x = -w + cut; x <= w - (z === 12 || z === 18 ? 2 : 0); x++) g.set(x + bend, 0, z, x === 0 ? 0xf6fbff : Math.abs(x) === w ? E : (x + z * 2 + 90) % 4 < 2 ? A : A2); }
      for (const [x, z] of [[3, 11], [-2, 16], [4, 21], [1, 26]]) g.set(x, -1, z, S2); return g;
    },
    form_petra() {                                       // fire, through and through
      const g = G(), A = VX.glow(0xfff6c8), B = VX.glow(0xffc04a), C = VX.glow(0xff7a1e), D = VX.glow(0xe83a14), K = 0x2c1a16;
      for (let z = -6; z <= 9; z++) for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) if (Math.abs(x) + Math.abs(y) <= (z > 6 ? 2 : 1)) g.set(x, y, z, H(x, y, z) < 0.34 ? (H(z, x, 2) < 0.5 ? C : B) : K);
      for (const s2 of [1, -1]) { g.line(s2, 0, 5, s2 * 4, 0, 10, K, 0.5); g.set(s2 * 4, 0, 11, C); g.set(s2 * 3, 0, 12, B); g.set(s2 * 4, 0, 13, D); }
      for (let z = 8; z <= 21; z++) { const u = (z - 8) / 13, w = 3.4 * Math.sin(Math.PI * (0.22 + u * 0.78)) ** 0.9, ox = Math.sin(z * 0.8) * u * 1.4; g.ell(ox, 0, z, w, w * 0.8, 0.6, (x, y) => { const d = Math.hypot(x - ox, y) / Math.max(0.5, w); return d < 0.38 && u < 0.6 ? A : d < 0.72 && u < 0.8 ? B : u > 0.75 || H(x, y, z) < 0.3 ? D : C; }); }
      g.set(2, 0, 20, D); g.set(-2, 0, 18, C); g.set(3, 0, 17, D); g.set(1, 0, 23, D); g.set(-3, 0, 20, C); return g;
    },
    form_otto() {                                        // his dinner
      const g = G(), BN = 0xf6eedc;
      for (let z = -6; z <= 7; z++) for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) if (Math.abs(x) + Math.abs(y) <= 1) g.set(x, y, z, z % 5 === 0 ? 0xe2d6bc : BN);
      for (const s2 of [1, -1]) g.ell(s2 * 1.6, 0, -7, 1.6, 1.3, 1.6, BN);
      for (let z = 4; z <= 20; z++) { const u = (z - 4) / 16, w = 1.2 + 4.2 * Math.sin(Math.PI * Math.min(0.94, 0.06 + u * 0.88)) ** 0.8; g.disc; for (let x = -6; x <= 6; x++) for (let y = -6; y <= 6; y++) if (Math.hypot(x, y) <= w) g.set(x, y, z, H(x >> 1, y >> 1, z >> 1) < 0.18 ? 0x7a3e14 : y < -1 && x < 1 && H(x, y, z) < 0.6 ? 0xe8a24a : H(x, y, z) < 0.35 ? 0xb8682a : 0xc87a34); }
      g.set(-1, -5, 13, 0xfff0c8); g.set(-2, -5, 12, 0xfff0c8); g.set(0, -4, 17, VX.glow(0xffd88a)); return g;
    },
    form_kas() {                                         // a branch that never stopped growing
      const g = G(), L = [0x74b04c, 0x5f9a42, 0x8ac85a];
      for (let z = -6; z <= 14; z++) { const ox = Math.round(Math.sin(z * 0.35) * 0.8); g.set(ox, 0, z, z & 1 ? 0x7a5a30 : 0x8a6a3a); if (z < 6) { g.set(ox + 1, 0, z, 0x6a4c28); g.set(ox, 1, z, 0x6a4c28); g.set(ox, -1, z, 0x8a6a3a); } }
      for (const [x, z, x2, z2] of [[0, 6, 5, 12], [0, 8, -5, 13], [0, 12, 2, 20], [0, 13, -3, 19]]) g.line(x, 0, z, x2, 0, z2, 0x7a5a30, 0.4);
      for (const [cx, cz, r] of [[5, 13, 2.4], [-5, 14, 2.4], [2, 20, 2.8], [-3, 19, 2.2], [0, 16, 2]]) g.ell(cx, 0, cz, r, r * 0.8, r, (x, y, z) => H(x, y, z) < 0.62 ? L[(x + y + z + 60) % 3] : -1);
      for (let z = -5; z < 12; z++) { const t = z * 0.9; g.set(Math.round(Math.cos(t) * 2), Math.round(Math.sin(t) * 2), z, z % 3 ? 0x5a9a44 : L[2]); }
      for (const [x, y, z, c] of [[5, -2, 13, 0xffa0c8], [-5, -2, 15, 0x9ab4ff], [2, -3, 20, 0xffd0ea], [-3, -2, 18, 0xffa0c8], [0, -2, 11, 0x9ab4ff]]) { g.set(x, y, z, VX.glow(0xfff0b0)); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.set(x + a, y, z + b, c); }
      return g;
    },
    form_wim() {                                         // something small, warm, and not as brave as it looks: a cat
      const g = G(), K = 0x7a7288, K2 = 0x5e566c, W2 = 0xf6f2ea, P2 = 0xf2a0b8, E = VX.glow(0xd8f070), D = 0x241e2c;
      for (let z = -9; z <= 2; z++) { const ox = z < -3 ? Math.round(((-3 - z) / 6) ** 2 * 4) : 0; for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) if (Math.abs(x) + Math.abs(y) <= 1) g.set(ox + x, y, z, z < -7 ? W2 : (z & 3) === 1 ? K2 : K); }
      g.ell(0, 0, 5, 3.4, 2.8, 4, (x, y, z) => y < -1 && Math.abs(x) < 2 && z > 3 ? W2 : Math.abs(x) > 1 && (z & 3) === 1 ? K2 : K);
      for (const s2 of [1, -1]) { g.ell(s2 * 2, -3, 4, 1.1, 1.2, 1.6, K); g.box(s2 * 2, -4, 3, s2 * 2, -4, 4, W2); }
      g.ell(0, 0, 13, 5.6, 4.2, 4.6, (x, y, z) => z > 16 && Math.abs(x) < 1 ? K2 : K);
      for (let x = -3; x <= 3; x++) for (let z = 9; z <= 12; z++) if (Math.abs(x) + (z < 10 ? 1 : 0) < 4) g.set(x, -4, z, W2);      // the muzzle
      for (const s2 of [1, -1]) { for (let k = 0; k < 4; k++) for (let x = 2 + (k >> 1); x <= 5 - (k >> 1); x++) g.box(s2 * x, -1, 16 + k, s2 * x, 0, 16 + k, x === 3 && k < 3 ? P2 : K2); for (const z of [13, 14]) { g.set(s2 * 2, -5, z, E); g.set(s2 * 3, -5, z, E); g.set(s2 * 2, -5, z, D); } g.set(s2 * 4, -5, 11, W2); g.set(s2 * 6, -4, 12, W2); g.set(s2 * 6, -4, 10, W2); }
      g.set(0, -5, 12, P2); g.set(-1, -5, 10, D); g.set(1, -5, 10, D); g.set(0, -5, 11, D); return g;
    },
    form_bet() {                                         // her mother's ladle
      const g = G(), O = 0x8a5a32, O2 = 0x6b4426, CU = 0xc8783a, CU2 = 0xe8a060;
      for (let z = -7; z <= 10; z++) { g.set(0, 0, z, z & 1 ? O : O2); if (z < 3) for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.set(x, y, z, (z + 20) % 4 === 0 ? CU : O); }
      for (let z = 8; z <= 10; z++) for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.set(x, y, z, CU); g.ell(0, 0, -8, 1.4, 1.4, 1, CU);
      for (let x = -6; x <= 6; x++) for (let y = -2; y <= 5; y++) for (let z = -6; z <= 6; z++) { const d = Math.hypot(x, y * 1.15, z); if (d > 5.7 || y < -1) continue; g.set(x, y, z + 15, d > 4.4 ? (y === -1 ? CU2 : H(x, y, z) < 0.2 ? CU2 : CU) : y === 0 ? (H(x, 3, z) < 0.22 ? 0xf0c070 : H(x, 5, z) < 0.12 ? 0x8ac85a : 0xd08a3a) : y > 0 ? 0xb87430 : -1); }
      g.set(1, 0, 16, VX.glow(0xffd890)); g.set(-2, 0, 14, VX.glow(0xffd890)); return g;
    },
    form_tobin() {                                       // an ear-trumpet: for listening with
      const g = G(), B1 = 0xd8a838, B2 = 0xf0d070, B3 = 0xa87a24;
      for (let z = -7; z <= 17; z++) { const u = (z + 7) / 24, r = 0.9 + u ** 2.2 * 5.6; for (let x = -7; x <= 7; x++) for (let y = -7; y <= 7; y++) { const d = Math.hypot(x, y); if (d <= r && (d > r - 1.1 || z < 4)) g.set(x, y, z, z === 17 ? B2 : z % 7 === 0 ? B3 : x < 0 && y < 0 ? B2 : B1); } }
      g.ell(0, 0, -8, 1.6, 1.6, 1, 0x2c2436); for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; g.set(R(Math.cos(a) * 3), R(Math.sin(a) * 3) , 13, VX.glow(0xfff0b0)); } return g;
    },
    form_selma() {                                       // sleep
      const g = G(), N = 0x2a3466, N2 = 0x3c4a8a, M = VX.glow(0xfff2bc), M2 = VX.glow(0xffe08a), CL = 0xf2f0fa;
      for (let z = -6; z <= 9; z++) for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) if (Math.abs(x) + Math.abs(y) <= 1) g.set(x, y, z, H(x, y, z) < 0.16 ? M : z & 1 ? N : N2);
      for (const [x, z, r] of [[0, 9, 2.4], [3, 9, 1.8], [-3, 9, 1.8], [1, 10, 2]]) g.ell(x, 0, z, r, r, r * 0.8, CL);
      for (let x = -7; x <= 7; x++) for (let z = -7; z <= 7; z++) { if (Math.hypot(x, z) <= 6.2 && Math.hypot(x - 3.2, z - 1.4) > 4.9) for (let y = -1; y <= 1; y++) g.set(x, y, z + 18, y ? M2 : M); }
      for (const [x, z] of [[4, 18], [2, 21], [6, 22]]) { g.set(x, 0, z, M); if (z !== 22) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (z === 18) g.set(x + a, 0, z + b, M2); } return g;
    },
    form_nadi() {                                        // lightning, all talk
      const g = G(), A = VX.glow(0xfffbe0), B = VX.glow(0xffe23a), C = VX.glow(0x7ac8ff), N = 0x2c3a5a;
      for (let z = -6; z <= 5; z++) for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) if (Math.abs(x) + Math.abs(y) <= 1) g.set(x, y, z, z % 3 === 0 ? 0xc8783a : N);
      const pts = [[0, 5], [3, 10], [-2, 11], [4, 18], [-1, 17], [2, 25]];
      for (let k = 0; k + 1 < pts.length; k++) { const [x, z] = pts[k], [x2, z2] = pts[k + 1]; g.line(x, 0, z, x2, 0, z2, B, 1); } for (let k = 0; k + 1 < pts.length; k++) { const [x, z] = pts[k], [x2, z2] = pts[k + 1]; g.line(x, -1, z, x2, -1, z2, A, 0.3); }
      for (const [x, y, z] of [[5, 0, 13], [6, 0, 14], [-4, 0, 14], [-5, 0, 16], [4, 0, 23], [-3, 0, 21]]) g.set(x, y, z, C); return g;
    },
    form_cassian() {                                     // a looking-glass: everybody but himself
      const g = G(), AU = 0xd8b050, AU2 = 0xf4dc90;
      for (let z = -7; z <= 6; z++) for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) if (Math.abs(x) + Math.abs(y) <= (z === -6 || z === 0 ? 2 : 1)) g.set(x, y, z, z % 4 === 0 ? AU2 : AU);
      for (let x = -6; x <= 6; x++) for (let z = -8; z <= 8; z++) { const d = Math.hypot(x / 5.4, z / 7.2); if (d > 1.04) continue; for (let y = -1; y <= 1; y++) g.set(x, y, z + 13, d > 0.82 ? ((x * 3 + z * 5 + 90) % 4 === 0 ? AU2 : AU) : y === -1 ? (Math.abs(x + z) < 2 || Math.abs(x + z - 5) < 1 ? 0xf6fcff : 0xb4d4e8) : AU); }
      for (const s2 of [1, -1]) g.ell(s2 * 6, 0, 13, 1.2, 1, 1.6, AU2); g.ell(0, 0, 21, 1.6, 1, 1.4, AU2); return g;
    },
    form_odile() {                                       // a sugar rose, with the thorns left on
      const g = G(), P1 = 0xffc4dc, P2 = 0xf28ab4, P3 = 0xd85a90;
      for (let z = -6; z <= 13; z++) { g.set(0, 0, z, z & 1 ? 0x4a8a44 : 0x3a7238); if (z < 4) { g.set(1, 0, z, 0x3a7238); g.set(0, 1, z, 0x3a7238); } }
      for (const [x, y, z] of [[1, 0, 6], [-1, 0, 8], [1, 0, 11], [0, -1, 5], [0, -1, 10]]) { g.set(x, y, z, 0x8a3a4a); g.set(x * 2, y * 2, z + 1, 0xc85a6a); g.set(x * 3, y * 3, z + 1, 0xf2e0e4); }
      g.ell(0, 0, 17, 4.4, 4, 3.8, (x, y, z) => { const r = Math.hypot(x, y), sp = Math.floor((Math.atan2(y, x) / TAU * 5 + r * 0.4 + 10)) % 2; return r < 1.4 ? P3 : sp ? P1 : P2; });
      for (let k = 0; k < 14; k++) g.set(R(Math.cos(k) * 4), R(Math.sin(k) * 3.6), 16 + (k % 4), 0xfff6fa); for (const s2 of [1, -1]) g.ell(s2 * 2.6, 0, 12, 2, 0.8, 1, 0x4a8a44); return g;
    },
    form_lucan() {                                       // a night-light
      const g = G(), V = 0xe8e0d0, SV = 0xc8ccd8, F = VX.glow(0xffc860), F2 = VX.glow(0xfff4c8), GL = 0xffe2a0;
      for (let z = -6; z <= 16; z++) { g.set(0, 0, z, z % 5 === 0 ? SV : V); if (z < 5) for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.set(x, y, z, z % 5 === 0 ? SV : V); }
      g.line(0, 0, 16, -2, 0, 19, SV, 0.4); g.line(-2, 0, 19, -5, 0, 19, SV, 0.4); g.box(-6, 0, 16, -6, 0, 18, SV);
      for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) for (let z = 8; z <= 15; z++) { const e = Math.abs(x) === 3 || Math.abs(y) === 3, c = Math.abs(x) === 3 && Math.abs(y) === 3; if (z === 8 || z === 15 || c) g.set(-6 + x, y, z, SV); else if (e) g.set(-6 + x, y, z, z > 9 && z < 13 && Math.abs(x + y) % 6 < 2 ? F2 : z > 13 || z < 10 ? GL : F); }
      g.box(-8, -2, 16, -4, 2, 16, SV); return g;
    },
    form_sibyl() {                                       // the hours
      const g = G(), K = 0x3a2c4c, AU = 0xd8b050, GL = 0xd4e4f0, SD = VX.glow(0xffd88a);
      for (let z = -6; z <= 6; z++) for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) if (Math.abs(x) + Math.abs(y) <= 1) g.set(x, y, z, z % 4 === 0 ? AU : K);
      for (let z = 7; z <= 21; z++) { const k = Math.abs(z - 14) / 7, r = z === 7 || z === 21 ? 4.6 : 0.8 + k * 3.2; for (let x = -5; x <= 5; x++) for (let y = -5; y <= 5; y++) { const d = Math.hypot(x, y); if (d > r) continue; g.set(x, y, z, z === 7 || z === 21 ? AU : (z < 11 || (z > 14 && z < 18) || d < 0.7) ? SD : GL); } }
      for (const [x, y] of [[4, 0], [-4, 0]]) g.box(x, y, 8, x, y, 20, AU); return g;
    },
    form_dorn() {                                        // a mountain, minding something small
      const g = G(), st = (x, y, z) => H(x >> 1, y >> 1, z >> 1) < 0.35 ? 0x8a8680 : H(x, y, z) < 0.2 ? 0xa8a49a : 0x9a968e;
      for (let z = -7; z <= 12; z++) { const r = z < 2 ? 1.5 : 1.5 + (z - 2) * 0.3; for (let x = -5; x <= 5; x++) for (let y = -5; y <= 5; y++) if (Math.hypot(x, y) <= r) g.set(x, y, z, z > 9 && H(x, y, z) < 0.6 ? 0x6a9a4a : st(x, y, z)); }
      g.box(0, 0, 13, 0, 0, 17, 0x5a9a44); for (const [x, y, z] of [[1, 0, 16], [2, 0, 17], [-1, 0, 17], [-2, 0, 18], [0, 1, 18], [0, -1, 18]]) g.set(x, y, z, 0x8ac85a); g.set(0, 0, 18, VX.glow(0xfff0b0)); return g;
    },
    form_thorne() {                                      // a whittling knife
      const g = G(); for (let z = -6; z <= 3; z++) for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) if (Math.abs(x) + Math.abs(y) <= 1) g.set(x, y, z, z === 3 ? 0xc8783a : z & 1 ? 0x8a5a32 : 0x6b4426);
      for (let z = 4; z <= 14; z++) { const w = z < 11 ? 1 : 0; for (let x = -w; x <= 1; x++) g.set(x, 0, z, x === -w ? 0xf4f8fc : 0xb8c0cc); } for (let k = 0; k < 12; k++) g.set(2 + R(Math.cos(k * 0.6) * 1.6), R(Math.sin(k * 0.6) * 1.6), 9 + (k >> 1), k & 1 ? 0xe8d0a0 : 0xd0a860); return g;
    },
    /* the one that fell: a black baton with gold coverings */
    wand_black() { const g = G(), K = 0x16131c, K2 = 0x241f2e, AU = 0xe0b84a, AU2 = 0xf6dc8a; for (let z = -6; z <= 10; z++) for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) { const c = Math.abs(x) + Math.abs(y); if (z <= -4 || z >= 8 ? c > 2 : c > 1) continue; g.set(x, y, z, z <= -4 || z >= 8 ? (c === 2 ? AU : AU2) : z === -1 || z === 4 ? AU : H(x, y, z) < 0.3 ? K2 : K); } g.set(0, 0, -7, AU2); g.set(0, 0, 11, AU2); for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.set(x * 2, y * 2, -5, AU); g.set(x * 2, y * 2, 9, AU); } return g; },
    /* and what it becomes: a great staff, standing on its foot (the grip 1.05 m up) */
    staff() {
      const g = G(), K = 0x16131c, K2 = 0x2a2436, AU = 0xe0b84a, AU2 = 0xf6dc8a;
      for (let y = 0; y <= 66; y++) g.disc(0, 0, y < 3 ? 1.6 : 1.2, y, y, (x, yy, z) => yy < 3 || (yy % 11 === 0) ? AU : H(x, yy, z) < 0.25 ? K2 : K);
      for (let y = 4; y < 64; y++) { const t = y * 0.42; g.set(R(Math.cos(t) * 2), y, R(Math.sin(t) * 2), y % 3 ? AU : AU2); }      // a gold vine up it
      for (const s2 of [1, -1]) { for (let t = 0; t <= 1; t += 0.02) { const a = -0.5 + t * 2.9, r = 8; g.ell(s2 * (Math.sin(a) * r + (t < 0.2 ? 0 : 0)), 72 - Math.cos(a) * r + 2, 0, 1.2 - t * 0.5, 1.2 - t * 0.5, 1.2 - t * 0.4, t > 0.85 ? AU2 : (R(t * 30) % 5 === 0 ? AU2 : AU)); } for (const [t, l] of [[0.35, 3], [0.62, 4]]) { const a = -0.5 + t * 2.9; g.line(s2 * Math.sin(a) * 8, 74 - Math.cos(a) * 8, 0, s2 * (Math.sin(a) * 8 + l), 75 - Math.cos(a) * 8 + 1, 0, AU2, 0.4); } }
      for (let y = 66; y < 70; y++) g.disc(0, 0, 2.2 - (y - 66) * 0.3, y, y, AU); g.disc(0, 0, 2.6, 64, 65, AU2);
      return g;
    },
    staff_gem() { const g = G(), A = VX.glow(0xfff4d0), B = VX.glow(0xc8b4ff), C2 = VX.glow(0x8ad8ff); for (let y = -5; y <= 5; y++) { const w = 3.4 - Math.abs(y) * 0.62; for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) if (Math.abs(x) + Math.abs(z) <= w) g.set(x, y, z, y > 1 ? A : x + z > 0 ? B : C2); } return g; },
    staff_ring() { const g = G(), AU2 = VX.glow(0xffe29a); for (let k = 0; k < 150; k++) { const a = k / 150 * TAU; if (R(a / TAU * 10) % 2) g.set(R(Math.cos(a) * 14), 0, R(Math.sin(a) * 14), AU2); } for (let k = 0; k < 10; k++) { const a = (k + 0.5) / 10 * TAU; g.box(R(Math.cos(a) * 14) - 1, 0, R(Math.sin(a) * 14) - 1, R(Math.cos(a) * 14) + 1, 0, R(Math.sin(a) * 14) + 1, VX.glow(k % 2 ? 0xc8b4ff : 0x8ad8ff)); } return g; },
    tub() {                                              // the wandwright's tub: a great banded bucket, 1.15 m tall, its foot at the origin
      const g = G();
      for (let y = 0; y <= 47; y++) { const r = 17 + y * 0.13; g.disc(0, 0, r, y, y, (x, yy, z) => Math.hypot(x, z) > r - 2 || yy < 2 ? (yy === 8 || yy === 9 || yy === 34 || yy === 35 ? 0x585c66 : (R((Math.atan2(z, x) + Math.PI) / TAU * 26) & 1) ? OAK : OAK_D) : -1); }
      for (const s2 of [-1, 1]) g.box(s2 * 23, 38, -2, s2 * 25, 43, 2, 0x3a3a42);
      return g;
    },
    tubfill() { const g = G(); for (let k = 0; k < 46; k++) { const a = H(k, 1, 2) * TAU, r = Math.sqrt(H(k, 2, 3)) * 15, x = Math.cos(a) * r, z = Math.sin(a) * r, c = [0xa8743e, 0xd8c49a, 0x9a4a34, 0x4a5a48, 0xeee6d6, 0x6a4668][k % 6]; g.line(x * 0.6, 30, z * 0.6, x * 1.12, 42 + H(k, 3, 4) * 12, z * 1.12, c, 0.5); } return g; },
    spoon() { const g = G(); g.box(0, 0, -7, 0, 0, 3, 0xb8884a); g.ell(0, 0, 6, 2, 0.8, 2.6, (x, y, z) => y > 0 && Math.hypot(x, z - 6) < 1.6 ? -1 : 0xc89a5a); return g; },
    breadstick() { const g = G(); for (let z = -8; z <= 9; z++) g.ell(0, 0, z, 1, 0.9, 0.8, (x, y) => H(x, y, z) < 0.3 ? 0xe8c890 : 0xc98a42); return g; },
    tally() { const g = G(); g.box(-24, 0, 0, 24, 34, 1, (x, y) => Math.abs(x) > 22 || y < 2 || y > 32 ? OAK_D : H(x >> 3, y >> 3, 2) < 0.2 ? 0x2a2a34 : 0x24242c); const W2 = 0xe8e8ec; for (const [x0, x1, y] of [[-18, 18, 28], [-14, 4, 25]]) for (let x = x0; x < x1; x++) if (H(x >> 1, y, 4) < 0.75) g.set(x, y, 2, W2); for (let k = 0; k < 3; k++) for (let j = 0; j < 5; j++) { const x = -18 + k * 13 + j * 2; if (j < 4) g.box(x, 10, 2, x, 18, 2, W2); else g.line(-19 + k * 13, 11, 2, -11 + k * 13, 17, 2, W2); } return g; },
    suit_heart() { return suitGrid('heart', 0xff5a7a); }, suit_diamond() { return suitGrid('diamond', 0xff8ab0); }, suit_spade() { return suitGrid('spade', 0x9ab4ff); }, suit_club() { return suitGrid('club', 0xb8a0ff); },
    bellflower() { const g = G(); for (let y = 0; y < 9; y++) g.disc(0, 0, 4 + y * 0.2, y, y, (x, yy, z) => Math.hypot(x, z) > 3 + yy * 0.2 || yy === 7 ? (yy === 7 && Math.hypot(x, z) < 4 ? 0x4a3424 : 0xb0603c) : -1); g.line(0, 8, 0, 2, 20, 0, 0x5a9a44, 0.4); g.line(2, 20, 0, 5, 21, 0, 0x5a9a44, 0.4); for (let y = 0; y < 6; y++) g.disc(6, 0, 1 + y * 0.35, 20 - y, 20 - y, (x, yy, z) => Math.hypot(x - 6, z) > 0.4 + y * 0.35 ? (y > 4 ? 0xc8d8ff : 0x8aa0f0) : -1); g.set(6, 14, 0, VX.glow(0xfff0b0)); for (const [x, y, z] of [[1, 12, 1], [2, 13, 2], [-1, 11, 0], [-2, 12, -1]]) g.set(x, y, z, 0x74b04c); return g; },
    cup() { const g = G(); g.disc(0, 0, 2.2, 0, 4, (x, y, z) => y === 0 || Math.hypot(x, z) > 1.4 ? (y === 3 ? 0x8a4a7a : 0xf1ece2) : y === 3 ? 0x9a6a3a : -1); return g; },
    key() { const g = G(), I = 0x8a8a94; g.box(0, 0, -5, 0, 0, 4, I); for (let k = 0; k < 20; k++) g.set(R(Math.cos(k) * 2), 0, 6 + R(Math.sin(k) * 2), I); g.set(1, 0, -5, I); g.set(1, 0, -3, I); return g; },
    shavings() { const g = G(); for (let k = 0; k < 70; k++) { const a = H(k, 1, 1) * TAU, r = Math.sqrt(H(k, 2, 1)) * 16; g.line(Math.cos(a) * r, 0, Math.sin(a) * r, Math.cos(a) * r + 2, 1 + (k % 3), Math.sin(a) * r + 1, k & 1 ? 0xe8d0a0 : 0xd0a860); } return g; },
    rune(k) { return G(); },
  };
  delete props.rune;

  window.CAST = { people, build, beasts: { horse: () => horse(0x8a5a34, 0x3a2418), horse2: () => horse(0xa8a298, 0x5a544e), cow }, props };
})();
