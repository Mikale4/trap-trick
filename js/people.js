/* ============================================================================
   people.js -- the townsfolk of Thistlewick: jointed voxel people built from a
   short description (build, skin, hair, hat, clothes, apron, what they hold),
   made the way Trap Trick herself is made, so they belong in one world with
   her: the same 2.4 cm voxels, a block head with a flat face and painted
   eyes (lash, iris, catch-lights), round-section limbs, sculpted hair with
   locks and a fringe, and clothes with seams, laces, folds, trims and cuffs.
   Godot animates them (town.gd).

   Heights, in rows of 2.4 cm (feet at y 0, facing +z):
     women ~69 rows (1.66 m, her own height), men ~73 (1.75 m), big men ~76
     (1.82 m), children ~52 (1.25 m). Each build is a little table (knee,
     hip, waist, shoulder, arm lengths, girths); the head sits 3.5 rows over
     the shoulder pivot. L.h adds rows to one person's height.
   Parts: hips (root) > torso > head, uArmL/R > fArmL/R; hips > thighL/R >
   shinL/R; hips > skirt (dresses). Hands and tools ride on the forearms.

   L.story (the cast of the story: cast.js) gives a person what the cutscenes
   need: eyes and mouth as parts with expressions, hands as parts with shapes,
   feet that flex, a skirt in two halves, a cape or a hat that moves.
   ========================================================================== */
(function () {
  'use strict';
  const H = VX.hash3, TAU = Math.PI * 2, S = 0.024;
  const ch = c => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
  const rgb = (r, g, b) => { const f = v => Math.max(0, Math.min(255, Math.round(v))); return (f(r) << 16) | (f(g) << 8) | f(b); };
  const mul = (c, kr, kg, kb) => { const [r, g, b] = ch(c); return rgb(r * kr, g * kg, b * kb); };
  const shade = (c, k) => mul(c, k, k, k);
  const tint = (c, k) => { const [r, g, b] = ch(c); return rgb(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k); };
  const mix = (a, b, t) => { const A = ch(a), B2 = ch(b); return rgb(A[0] + (B2[0] - A[0]) * t, A[1] + (B2[1] - A[1]) * t, A[2] + (B2[2] - A[2]) * t); };

  const SKIN = [0xf9ddcd, 0xf1c9ab, 0xdaa57e, 0xb27b53, 0x84563b];
  const HAIR = { black: 0x2c2430, brown: 0x5e3c28, chestnut: 0x84492a, blond: 0xe0bc64, red: 0xb44c2a, grey: 0x9c9ca6, white: 0xe8e6ea };
  const EYES = [0x4568b4, 0x6e4628, 0x3f7c4e, 0x8c6c2c, 0x50507a];
  const LASH = 0x2b1a24, WHITE = 0xffffff, LIP = 0xc9506c, BLUSH = 0xf49db2;
  const WOOD = 0x7a5032, WOOD_D = 0x553620, WOOD_L = 0xa8743e, IRON = 0x585c66, STEEL = 0xa4aab4, STEEL_L = 0xd2d8e0, STEEL_D = 0x70767f, BRASS = 0xc8a24a;

  /* the builds. K knee, Hp hip, Wt waist (the torso's first row), Sh shoulder; UA/FA upper and fore arm;
     th/kn/ca/an the leg's radius at the thigh, knee, calf and ankle; hipW, wW, wC the half-widths of the hips,
     waist and chest, dW/dC their half-depths; upR/foR the sleeve radii; head the head's rows */
  const BODY = {
    woman: { K: 18.5, Hp: 33.5, Wt: 38, Sh: 52.5, UA: 9, FA: 8, legX: 3, thR: 2.3, knR: 1.9, caR: 2.1, anR: 1.6, hipW: 4.6, wW: 3.6, wC: 4.5, dW: 2.7, dC: 3.0, bust: 0.8, upR: 1.8, foR: 1.5, head: 13, jaw: 'v' },
    man:   { K: 20.5, Hp: 36.5, Wt: 41, Sh: 56.5, UA: 10, FA: 9, legX: 3, thR: 2.3, knR: 2.0, caR: 2.2, anR: 1.8, hipW: 4.7, wW: 4.6, wC: 5.4, dW: 3.0, dC: 3.3, bust: 0, upR: 2.0, foR: 1.8, head: 13, jaw: 'square' },
    big:   { K: 21.5, Hp: 38.5, Wt: 43, Sh: 59.5, UA: 10, FA: 9, legX: 4, thR: 3.0, knR: 2.3, caR: 2.6, anR: 2.0, hipW: 6.0, wW: 5.8, wC: 6.4, dW: 3.8, dC: 3.9, bust: 0, upR: 2.6, foR: 2.0, head: 13, jaw: 'square' },
    teen:  { K: 18.5, Hp: 33.5, Wt: 37, Sh: 51.5, UA: 9, FA: 8, legX: 3, thR: 2.1, knR: 1.8, caR: 2.0, anR: 1.6, hipW: 4.2, wW: 3.9, wC: 4.6, dW: 2.7, dC: 2.9, bust: 0, upR: 1.8, foR: 1.5, head: 13, jaw: 'v' },
    kid:   { K: 11.5, Hp: 21.5, Wt: 25, Sh: 36.5, UA: 7, FA: 6, legX: 2, thR: 1.6, knR: 1.5, caR: 1.5, anR: 1.4, hipW: 3.4, wW: 3.2, wC: 3.6, dW: 2.3, dC: 2.5, bust: 0, upR: 1.5, foR: 1.5, head: 12, jaw: 'v' },
  };
  const seedOf = L => { let h = 7; const s = JSON.stringify(L); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

  function build(L) {
    const kind = L.kid ? 'kid' : L.teen ? 'teen' : L.big ? 'big' : (L.fem != null ? (L.fem ? 'woman' : 'man') : (L.dress ? 'woman' : 'man'));
    const b = Object.assign({}, BODY[kind]);
    if (L.h) { b.K += Math.round(L.h / 2); b.Hp += L.h; b.Wt += L.h; b.Sh += L.h; }
    const fem = kind === 'woman' || (kind === 'kid' && !!L.dress), story = !!L.story;
    const young = fem || kind === 'kid' || kind === 'teen';                // big eyes, a soft mouth
    const M = new VX.Model(S);
    const seed = seedOf(L);
    const skin = SKIN[L.skin || 0], skin2 = mul(skin, 0.965, 0.9, 0.875);
    const hairC = typeof L.hair === 'number' ? L.hair : HAIR[L.hair || 'brown'], hairL = tint(hairC, 0.22), hairD = shade(hairC, 0.72);
    const eyeC = L.eye || EYES[seed % EYES.length];
    const shirt = L.shirt || 0x8a6a4a, legs = L.legs || 0x4a3a30, boots = L.boots || 0x4e3628;
    const mail = !!L.tabard || !!L.mail, robe = !!(L.dress && L.long && L.sleeve);
    const sleeve = L.uniform || L.sleeve || shirt;
    const { K, Hp, Wt, Sh } = b;
    const E = Sh - b.UA, Wr = E - b.FA, B = Sh + 3.5, topRow = Sh + 0.5;
    const noise = (c, x, y, z, k) => H(x, y, z) < (k || 0.16) ? shade(c, 0.93) : c;
    const frontOf = (g, x, y) => { for (let z = 16; z >= -16; z--) if (g.get(x, y, z) >= 0) return z; return null; };
    const backOf = (g, x, y) => { for (let z = -16; z <= 16; z++) if (g.get(x, y, z) >= 0) return z; return null; };

    /* the torso's cross-section, row by row: [half-width, back half-depth, front half-depth] */
    const prof = y => {
      const t = Math.min(1, Math.max(0, (y - Wt) / Math.max(1, topRow - 1 - Wt)));
      const sm = t * t * (3 - 2 * t);
      let hw = b.wW + (b.wC - b.wW) * Math.min(1, sm * 1.3), rz = b.dW + (b.dC - b.dW) * sm, zf = rz;
      if (b.bust) zf += b.bust * Math.max(0, 1 - Math.abs(t - 0.62) / 0.24);
      if (y >= topRow) { hw -= 1.4; rz -= 0.7; zf = rz; }
      return [hw, rz, zf];
    };
    const inRow = (x, z, p) => (x / (p[0] + 0.45)) ** 2 + (z / ((z > 0 ? p[2] : p[1]) + 0.45)) ** 2 <= 1;
    const fz = (x, p) => { if (!inRow(x, 0, p)) return null; let z = 0; while (inRow(x, z + 1, p)) z++; return z; };
    let chestX = 0;
    for (let y = Wt; y < topRow; y++) { const p = prof(y); while (inRow(chestX + 1, 0, p)) chestX++; }
    const armX = chestX + 1 + (b.upR >= 1.8 ? 2 : 1);

    /* ================================================================ HIPS == */
    const hips = M.part('hips', null, [0, Hp, 0]);
    for (let y = Hp + 0.5; y <= Wt - 1; y++) for (let x = -8; x <= 8; x++) for (let z = -6; z <= 6; z++)
      if ((x / (b.hipW + 0.45)) ** 2 + (z / (b.dW + 0.45)) ** 2 <= 1) hips.set(x, y, z, noise(legs, x, y, z));
    // a tunic's skirt to mid-thigh (men and boys): a hollow shell, so the legs swing inside it
    const tunic = !L.dress && L.tunic !== false;
    let tunicHem = Wt;
    if (tunic) {
      tunicHem = Math.round(Hp - (kind === 'kid' ? 3.5 : 5.5));
      const span = Wt - 1 - tunicHem;
      for (let y = tunicHem; y <= Wt - 1; y++) {
        const t = (Wt - 1 - y) / span, rx = b.hipW + 0.6 + t * 1.3, rz = b.dW + 0.8 + t * 1.1;
        for (let x = -Math.ceil(rx) - 1; x <= Math.ceil(rx) + 1; x++) for (let z = -Math.ceil(rz) - 1; z <= Math.ceil(rz) + 1; z++) {
          if ((x / (rx + 0.45)) ** 2 + (z / (rz + 0.45)) ** 2 > 1) continue;
          if (y < Wt - 1 && (x / (rx - 1.1)) ** 2 + (z / (rz - 1.1)) ** 2 < 1) continue;
          const f = Math.cos(Math.atan2(z / rz, x / rx) * 8 + 0.5);
          hips.set(x, y, z, y === tunicHem ? shade(shirt, 0.8) : (t > 0.3 && f < -0.6 ? shade(shirt, 0.86) : noise(shirt, x, y, z)));
        }
      }
      // a leather purse on the belt
      const pz = frontOf(hips, -3, Wt - 2);
      if (pz != null) hips.box(-4, Wt - 3, pz + 1, -2, Wt - 1, pz + 1, (x, y, z) => y === Wt - 1 ? 0x4a2e1c : (x === -3 && y === Wt - 2 ? BRASS : 0x6a4228));
    }

    /* ================================================================ LEGS == */
    const bootTop = L.uniform ? Math.round(3 + (K - 3) * 0.42) : L.dress ? 2 : (kind === 'kid' ? Math.round(K * 0.45) : Math.round(3 + (K - 3) * 0.5));
    const legR = y => {
      if (y >= K) { const t = (y - K) / (Hp - K); return b.knR + (b.thR - b.knR) * Math.min(1, t * 1.7); }
      const t = (y - 3) / (K - 3);
      return t < 0.6 ? b.anR + (b.caR - b.anR) * Math.sin(Math.max(0, t - 0.05) / 0.55 * Math.PI / 2) : b.caR + (b.knR - b.caR) * (t - 0.6) / 0.4;
    };
    const shoe = L.shoes || (fem ? 0x5a3a2e : boots);
    for (const s of [1, -1]) {
      const n = s > 0 ? 'L' : 'R', cx = s * b.legX;
      const th = M.part('thigh' + n, 'hips', [cx, Hp, 0]);
      for (let y = K + 0.5; y <= Hp - 0.5; y++) th.disc(cx, 0, legR(y), y, y, (x, yy, z) => noise(legs, x, yy, z, 0.12));
      const sh = M.part('shin' + n, 'thigh' + n, [cx, K, 0]);
      for (let y = 3; y <= K - 0.5; y++) {
        const boot = y <= bootTop, r = boot ? Math.max(legR(y) + 0.35, b.anR + 0.5) : legR(y);
        sh.disc(cx, 0, r, y, y, (x, yy, z) => boot ? (H(x, yy, z) < 0.2 ? shade(shoe, 0.9) : shoe) : L.patch && s < 0 && yy >= K - 4 && z >= 1 && Math.abs(x - cx) <= 1 ? (yy === Math.round(K - 4) ? shade(L.patch, 0.8) : L.patch) : noise(legs, x, yy, z, 0.12));
      }
      if (bootTop > 4)                                                    // the boot top, turned down
        sh.disc(cx, 0, Math.max(legR(bootTop) + 0.35, b.anR + 0.5) + 0.6, bootTop, bootTop, (x, y, z) => x * s <= 0 ? -1 : tint(shoe, 0.16));
      // the foot: a sole, the upper, the instep sloping to the toe; women's shoes have a buckle
      const fw = Math.max(1, Math.round(b.anR)), toe = kind === 'kid' ? 4 : (fem ? 5 : 6), heel = kind === 'kid' ? -2 : -3;
      const ft = story ? M.part('foot' + n, 'shin' + n, [cx, 3, 0]) : sh;
      for (let y = 0; y <= 2; y++) for (let x = cx - fw; x <= cx + fw; x++) for (let z = heel; z <= toe; z++) {
        const ex = Math.abs(x - cx);
        if (ex === fw && (z === heel || z === toe)) continue;
        if (y === 2 && z > toe - 2) continue;
        if (y === 1 && z === toe && ex === fw - 1 && fw > 1) continue;
        ft.set(x, y, z, y === 0 ? shade(shoe, 0.5) : (y === 1 && z <= heel + 1 ? shade(shoe, 0.8) : shoe));
      }
      if (fem) ft.set(cx, 2, toe - 2, BRASS);
    }

    /* ======================================================= DRESS SKIRT == */
    let skirt = null;
    if (L.dress) {
      const halves = story && !L.long, pleat = !!L.uniform;
      skirt = M.part('skirt', 'hips', [0, Wt, 0]);
      const skF = halves ? M.part('skirtF', 'hips', [0, Wt - 1, 0]) : skirt, skB = halves ? M.part('skirtB', 'hips', [0, Wt - 1, 0]) : skirt;
      const hem = pleat ? Math.round(K + 1) : L.long ? 2 : Math.round(K - (kind === 'kid' ? 3 : 7));
      const flare = pleat ? 3.4 : L.long ? 5.4 : (kind === 'kid' ? 2.6 : 4.6), span = Wt - 1 - hem;
      const trim = L.trim || tint(L.dress, 0.3);
      for (let y = hem; y <= Wt - 1; y++) {
        const t = (Wt - 1 - y) / span, rx = b.hipW + 0.8 + flare * Math.pow(t, 1.1), rz = b.dW + 1.2 + flare * 0.8 * t;
        for (let x = -Math.ceil(rx) - 1; x <= Math.ceil(rx) + 1; x++) for (let z = -Math.ceil(rz) - 1; z <= Math.ceil(rz) + 1; z++) {
          if ((x / (rx + 0.45)) ** 2 + (z / (rz + 0.45)) ** 2 > 1) continue;
          if (y < Wt - 1 && (x / (rx - 1.2)) ** 2 + (z / (rz - 1.2)) ** 2 < 1) continue;
          const f = Math.cos(Math.atan2(z / rz, x / rx) * (pleat ? 14 : 10) + 0.3);
          let c = pleat ? (f < -0.35 ? shade(L.dress, 0.74) : f > 0.75 ? tint(L.dress, 0.08) : L.dress) : t > 0.22 && f < -0.55 ? shade(L.dress, 0.84) : (t > 0.22 && f > 0.8 ? tint(L.dress, 0.07) : noise(L.dress, x, y, z, 0.1));
          if (y === hem) c = shade(L.dress, 0.74);
          else if (y === hem + 2 && !robe) c = trim;
          (y >= Wt - 2 ? skirt : z >= 0 ? skF : skB).set(x, y, z, c);
        }
      }
      if (L.apron) {                                                      // the apron over the skirt's front, a pocket on it
        for (let y = hem + 3; y <= Wt - 1; y++) {
          const t = (Wt - 1 - y) / span, aw = Math.round(2.6 + t * 2.2);
          for (let x = -aw; x <= aw; x++) {
            const sk = y >= Wt - 2 ? skirt : skF, z = frontOf(sk, x, y); if (z == null) continue;
            const pocket = y >= hem + 7 && y <= hem + 10 && x >= 1 && x <= 3;
            sk.set(x, y, z + 1, y === hem + 3 ? shade(L.apron, 0.86) : (pocket && (y === hem + 10 || x === 1 || x === 3) ? shade(L.apron, 0.9) : L.apron));
          }
        }
      }
    }

    /* =============================================================== TORSO == */
    const tor = M.part('torso', 'hips', [0, Wt, 0]);
    const bod = L.dress ? (L.bodice || L.dress) : shirt;
    const torsoCol = (x, y, z, p) => {
      const ax = Math.abs(x), front = z >= 1 && z === fz(x, p);
      if (L.uniform) {                                                    // the academy's jacket over a white shirt: lapels edged in gold, a tie, brass buttons
        const cut = topRow - 5 - (fem ? 0 : 1);
        if (front && y >= cut && ax <= Math.ceil((y - cut + 1) * 0.5)) {
          const edge = ax === Math.ceil((y - cut + 1) * 0.5);
          if (edge && ax > 0) return L.band || BRASS;
          if (ax === 0 && y < topRow) return (y - cut) & 1 ? L.tie : shade(L.tie, 0.82);
          return 0xf4efe2;
        }
        if (front && ax === 1 && x > 0 && (y === cut - 2 || y === cut - 4)) return BRASS;
        if (y === Wt) return L.band || BRASS;
        if (ax === Math.round(p[0]) && z === 0) return shade(L.uniform, 0.85);
        return noise(L.uniform, x, y, z, 0.12);
      }
      if (L.braces && z !== 0 && (ax === 3) && y < topRow) return y === Wt + 1 && z > 0 ? BRASS : L.braces;
      if (L.dress && !robe) {                                             // a bodice laced over the chemise
        if (front && y >= topRow - 2 && ax <= 3) return y === topRow - 2 ? tint(shirt, 0.2) : shirt;
        if (front && ax === 0) return shirt;
        if (front && ax === 1) return ((y - Wt) & 1) ? 0xefe4cc : shade(bod, 0.85);
        if (y === Wt) return shade(bod, 0.8);
        return noise(bod, x, y, z, 0.12);
      }
      if (robe) return front && ax === 0 ? (L.band || BRASS) : noise(bod, x, y, z, 0.12);
      if (front && y >= topRow - 3 && ax <= (y - (topRow - 4)) * 0.6) return skin;        // a laced V at the neck
      if (front && y === topRow - 4 && ax <= 1) return 0x3a2a1e;
      if (L.vest) {
        if (front && ax <= 1) return noise(shirt, x, y, z);
        if (front && ax === 2 && y % 3 === 0 && y < topRow - 1) return BRASS;
        return noise(L.vest, x, y, z, 0.14);
      }
      if (y === topRow && Math.hypot(x, z) < 3.6) return tint(shirt, 0.18);
      if (ax === Math.round(p[0]) && z === 0) return shade(shirt, 0.88);                  // the side seams
      return noise(shirt, x, y, z);
    };
    for (let y = Wt; y <= topRow; y++) {
      const p = prof(y), xr = Math.ceil(p[0]) + 1;
      for (let x = -xr; x <= xr; x++) for (let z = -7; z <= 7; z++) if (inRow(x, z, p)) tor.set(x, y, z, torsoCol(x, y, z, p));
    }
    // the outer voxels of one row (for belts)
    const ring = (g, y) => {
      const pts = [];
      g.paint((x, yy, z) => { if (yy === y && (g.get(x + 1, yy, z) < 0 || g.get(x - 1, yy, z) < 0 || g.get(x, yy, z + 1) < 0 || g.get(x, yy, z - 1) < 0)) pts.push([x, z]); return false; }, 0);
      return pts;
    };

    // a guard's tabard: front and back panels to mid-thigh, gold-edged, the town's thistle on the front
    if (L.tabard) {
      const tw = chestX - 1, bot = Math.round(Hp - 7);
      for (let y = bot; y <= topRow - 1; y++) for (let x = -tw; x <= tw; x++) {
        const g = y >= Wt ? tor : hips, edge = Math.abs(x) === tw || y === bot;
        const c = edge ? BRASS : noise(L.tabard, x, y, 0, 0.1);
        let zf = frontOf(g, x, y), zb = backOf(g, x, y);
        if (y < tunicHem || zf == null) { zf = frontOf(hips, x, tunicHem) || b.dW + 2; zb = backOf(hips, x, tunicHem) || -(b.dW + 2); }
        g.set(x, y, zf + 1, c); g.set(x, y, zb - 1, c);
      }
      const cy = Wt + Math.round((topRow - Wt) * 0.45), put = (x, y, c) => tor.set(x, y, frontOf(tor, x, y), c);
      for (const [x, y] of [[-1, 1], [0, 1], [1, 1], [-1, 2], [0, 2], [1, 2]]) put(x, cy + y, 0x8a4aa8);
      for (const x of [-1, 1]) put(x, cy + 3, 0xb87ad0);
      put(0, cy + 3, 0x8a4aa8);
      for (const x of [-1, 0, 1]) put(x, cy, 0x3f7a3a);
      for (let y = cy - 3; y < cy; y++) put(0, y, 0x3f7a3a);
      put(-1, cy - 2, 0x4f8a44); put(1, cy - 2, 0x4f8a44); put(-2, cy - 2, 0x3f7a3a); put(2, cy - 2, 0x3f7a3a);
    }
    // a belt with a buckle (tunics), or a waist sash line (dresses)
    if (!L.dress && !L.uniform) {
      const belt = L.belt || 0x3a281c;
      for (const [x, z] of ring(tor, Wt)) tor.set(x, Wt, z, belt);
      const bz = frontOf(tor, 0, Wt);
      tor.set(0, Wt, bz, BRASS); tor.set(-1, Wt, bz, shade(BRASS, 0.8));
    }
    // an apron: a bib on the chest; for a smith, a leather one from the chest to the knee
    if (L.apron) {
      const top = L.dress ? Wt + 6 : topRow - 3;
      for (let y = Wt; y <= top; y++) for (let x = -(L.dress ? 2 : 3); x <= (L.dress ? 2 : 3); x++) {
        const z = frontOf(tor, x, y); if (z != null) tor.set(x, y, z + 1, y === top ? shade(L.apron, 0.85) : noise(L.apron, x, y, z, 0.12));
      }
      if (L.dress) {                                                      // the bow at the back
        const z = backOf(tor, 0, Wt + 1) - 1;
        for (let i = -3; i <= 3; i++) for (let j = -1; j <= 1; j++) if (Math.abs(i) > 0 || j === 0) if (!(Math.abs(i) === 1 && j !== 0)) tor.set(i, Wt + 1 + j, z, Math.abs(i) === 3 || j !== 0 ? shade(L.apron, 0.88) : L.apron);
        tor.set(-1, Wt - 1, z, L.apron); tor.set(1, Wt - 2, z, L.apron); tor.set(-1, Wt - 3, z, shade(L.apron, 0.88));
      } else {
        const z0 = (frontOf(hips, 0, tunicHem) || b.dW + 2) + 1;
        for (let y = K + 3; y <= Wt - 1; y++) for (let x = -4; x <= 4; x++) {
          const zf = frontOf(hips, x, y), z = Math.max(z0, zf == null ? z0 : zf + 1);
          hips.set(x, y, z, y === K + 3 ? shade(L.apron, 0.8) : noise(L.apron, x, y, z, 0.14));
        }
        for (const s of [1, -1]) tor.line(s * 3, topRow - 3, frontOf(tor, s * 3, topRow - 3) + 1, s * 2, topRow + 1, 0, shade(L.apron, 0.8));
      }
    }
    // a cloak from the shoulders, a hood folded at the neck, a gold clasp
    if (L.cloak) {
      const bot = Math.round(Hp - 6);
      for (let y = bot; y <= topRow; y++) {
        const d = Math.max(0, Wt - y), p = prof(Math.max(y, Wt));
        const zb = (backOf(tor, 0, Math.max(y, Wt)) || -3) - 1 - d * 0.12, hw = Math.round(p[0] + 1.2 + d * 0.06);
        for (let x = -hw; x <= hw; x++) {
          const fold = Math.cos(x * 1.2), z = Math.round(zb - fold * 0.5);
          const c = fold < -0.4 ? shade(L.cloak, 0.85) : (y === bot ? shade(L.cloak, 0.78) : noise(L.cloak, x, y, z, 0.12));
          tor.set(x, y, z, c); if (y >= Wt) tor.set(x, y, z + 1, L.cloak);
        }
        if (y >= Wt) for (const s of [1, -1]) for (let z = Math.round(zb); z <= 0; z++) tor.set(s * hw, y, z, noise(L.cloak, s * hw, y, z, 0.12));
      }
      tor.ell(0, topRow + 1.2, (backOf(tor, 0, topRow) || -3) - 1.2, 4, 1.4, 1.5, (x, y, z) => noise(shade(L.cloak, 0.92), x, y, z, 0.2));
      for (const s of [1, -1]) tor.set(s * 3, topRow, frontOf(tor, s * 3, topRow) + 1, BRASS);
    }

    if (L.cape) {                                                         // the academy's half-cape: hangs from the shoulders behind, and swings
      const cp = M.part('cape', 'torso', [0, topRow, (backOf(tor, 0, topRow - 1) || -3) - 0.5]);
      const bot = Math.round(Wt - (fem ? 4 : 5)), zb0 = (backOf(tor, 0, topRow - 3) || -3) - 1;
      for (let y = bot; y <= topRow; y++) {
        const t = (topRow - y) / (topRow - bot), hw = Math.round(chestX + 0.4 + t * 2.4);
        for (let x = -hw; x <= hw; x++) {
          const fold = Math.cos(x * 1.15), z = Math.round(zb0 - 0.3 - t * 1.2 - fold * 0.4 * t);
          const c = y === bot || (Math.abs(x) === hw && t > 0.1) ? (L.band || BRASS) : fold < -0.4 ? shade(L.cape, 0.84) : noise(L.cape, x, y, z, 0.12);
          cp.set(x, y, z, c); if (t < 0.12) cp.set(x, y, z + 1, L.cape);
        }
      }
      for (const s of [1, -1]) {                                          // it comes over the shoulders to a clasp on the chest
        for (let z = zb0; z <= 1; z++) for (let x = chestX - 2; x <= chestX; x++) tor.set(s * x, topRow + 1, z, x === chestX - 2 ? (L.band || BRASS) : L.cape);
        for (let x = 3; x <= chestX; x++) { const z = frontOf(tor, s * x, topRow - 1); if (z != null) { tor.set(s * x, topRow - 1, z + 1, x === 3 ? BRASS : L.cape); tor.set(s * x, topRow, z + 1, L.cape); } }
      }
    }
    if (L.satchel) {                                                      // a strap across the chest, a leather satchel on the left hip
      const lea = 0x8a5a34;
      tor.paint((x, y, z) => { const k = (y - Wt) / (topRow - Wt), sx = 5 - k * 9; return y >= Wt && y <= topRow && Math.abs(x - sx) <= 0.9 && (z >= 2 || z <= -2) && (z === frontOf(tor, x, y) || z === backOf(tor, x, y)); }, 0x6a4226);
      const bx = chestX + 2, st = M.part('satchel', 'hips', [bx - 2, Wt, 0]);
      st.box(bx - 1, Wt - 8, -4, bx + 1, Wt - 1, 4, (x, y, z) => y === Wt - 8 || Math.abs(z) === 4 ? shade(lea, 0.8) : (H(x, y, z) < 0.15 ? shade(lea, 0.92) : lea));
      st.box(bx + 2, Wt - 5, -4, bx + 2, Wt - 1, 4, (x, y, z) => y === Wt - 5 ? shade(lea, 0.75) : tint(lea, 0.08)); st.set(bx + 2, Wt - 5, 0, BRASS); st.set(bx + 2, Wt - 4, 0, BRASS);
    }

    /* ================================================================ HEAD == */
    const hd = M.part('head', 'torso', [0, Sh + 1.5, 0]);
    const nw = fem || kind === 'kid' ? 1 : 2;
    hd.box(-nw, Sh + 1.5, -nw, nw, B - 1, 1, (x, y, z) => z < 0 ? skin2 : skin);
    const W = kind === 'kid' ? 5 : 6, Z0 = kind === 'kid' ? -4 : -5, FZ = kind === 'kid' ? 4 : 5, HR = b.head;
    const JAW = b.jaw === 'square' ? [[3, -1], [4, -2], [5, -3], [W, -4]] : [[1, -1], [3, -2], [4, -3], [W - 1, -4]];
    const skRow = r => r < 0 || r >= HR ? null : (r < 4 ? [Math.min(W, JAW[r][0]), Math.max(Z0, JAW[r][1]), FZ] : [W, Z0, FZ]);
    const inSkull = (x, y, z) => {
      const k = skRow(y - B); if (!k) return false;
      const [w, z0, z1] = k;
      if (Math.abs(x) > w || z < z0 || z > z1) return false;
      if (Math.abs(x) === w && w >= 5 && (z === z0 || z === z1)) return false;   // round the corners
      return true;
    };
    for (let y = B; y < B + HR; y++) for (let x = -W; x <= W; x++) for (let z = Z0; z <= FZ; z++)
      if (inSkull(x, y, z)) hd.set(x, y, z, z >= 2 ? skin : skin2);
    for (const s of [1, -1]) { hd.set(s * (W + 1), B + 5, 0, skin2); hd.set(s * (W + 1), B + 6, 0, skin2); hd.set(s * (W + 1), B + 5, -1, skin2); }

    if (story) paintFace({ M, hd, skin, skin2, B, FZ, HR, W, inSkull, L, young, fem, kind, eyeC, hairC, hairD, seed });
    // the face, painted on the front plane like hers: lash, iris (dark to light), two catch-lights
    const put = (x, r, c) => hd.set(x, B + r, FZ, c);
    const eD = shade(eyeC, 0.5), eL = tint(eyeC, 0.4);
    if (!story) for (const s of [1, -1]) {
      const X = i => s * (2 + i), hiX = s > 0 ? X(0) : X(2), loX = s > 0 ? X(2) : X(0);
      if (L.old) {                                                        // kindly, crinkled, nearly shut
        put(s * 1, 5, LASH); put(s * 2, 6, LASH); put(s * 3, 6, LASH); put(s * 4, 6, LASH); put(s * 5, 5, LASH);
        put(s * 5, 4, skin2); put(s * 4, 4, skin2);
        for (let i = 1; i <= 4; i++) put(s * i, 8, hairC);
        for (let i = 2; i <= 4; i++) put(s * i, 9, hairC);
      } else if (fem || kind === 'kid') {                                 // big eyes, a flick at the outer corner
        for (let i = -1; i <= 2; i++) put(s * (2 + i), 8, LASH);
        put(X(3), 7, LASH);
        put(X(0), 7, eD); put(X(1), 7, eD); put(X(2), 7, eD);
        put(X(0), 6, eyeC); put(X(1), 6, eD); put(X(2), 6, eyeC);
        put(X(0), 5, eL); put(X(1), 5, eL); put(X(2), 5, eyeC);
        put(hiX, 7, WHITE); put(loX, 5, WHITE);
        if (!L.kid) for (let i = 2; i <= 4; i++) put(s * i, 10, hairD);
      } else {                                                            // men: narrower eyes under a level brow
        for (let i = -1; i <= 2; i++) put(s * (2 + i), 7, LASH);
        put(X(0), 6, eD); put(X(1), 6, eD); put(X(2), 6, eD);
        put(X(0), 5, eyeC); put(X(1), 5, eL); put(X(2), 5, eyeC);
        put(hiX, 6, WHITE);
        for (let i = -1; i <= 2; i++) put(s * (2 + i), 9, hairD);
      }
    }
    const mouth = fem || kind === 'kid' ? (L.lips ? LIP : mix(skin, LIP, 0.45)) : shade(skin, 0.7);
    if (!story) for (const x of [-1, 0, 1]) put(x, 2, mouth);
    if (!story && (L.blush || kind === 'kid')) {
      const bc = mix(skin, BLUSH, 0.6);
      for (const s of [1, -1]) if (kind === 'kid') { put(s * 3, 3, bc); put(s * 4, 3, bc); } else { put(s * 4, 3, bc); put(s * 5, 3, bc); put(s * 5, 4, bc); }
    }

    /* ---------------------------------------------------------------- hair */
    const NSTR = 26;
    const hairCol = (x, y, z) => {
      const k = Math.floor((Math.atan2(x, z + 0.5) + Math.PI) / TAU * NSTR), n = H(x, y, z);
      if (y >= B + HR && n < (y > B + HR ? 0.45 : 0.2)) return hairL;     // light on the crown
      if (k % 3 === 0) return n < 0.65 ? hairD : hairC;                   // the grooves between the locks
      return n < 0.07 ? hairD : (n > 0.94 ? hairL : hairC);
    };
    const hrx = W + 1.4, hrz = (FZ - Z0) / 2 + 1.4, hcz = (FZ + Z0) / 2 - 0.6, hcy = B + HR * 0.58, hry = HR * 0.49;
    /* hair over the skull: rows at the front from `front` up, the sides from `side`, the back from `back`. A layer fitted
       to the box of the skull, so no scalp can show at its edges, filled out round the back and over the crown by an
       ellipsoid; `reach` voxels thick (1; a headscarf over the hair takes 2) */
    const shell = (grow, front, side, back, col, reach) => {
      const rx = hrx + grow, ry = hry + grow, rz = hrz + grow, th = reach || 1, C0 = col || hairCol;
      for (let x = -W - 3; x <= W + 3; x++) for (let y = B - 1; y <= B + HR + 4; y++) for (let z = Z0 - 4; z <= FZ + 3; z++) {
        const r = y - B;
        if ((z >= FZ - 1 && r < front) || (z > -1 && r < side) || r < back) continue;
        if (inSkull(x, y, z)) continue;
        const qx = Math.max(0, Math.abs(x) - W), qy = Math.max(0, r - HR + 1), qz = Math.max(0, z - FZ, Z0 - z), d = Math.hypot(qx, qy, qz);
        let ok = d <= th + (th > 1 ? 0.3 : 0) && !(qx >= th && qz >= th);                                   // the fitted layer, its upright edges rounded
        if (ok && qy >= th) ok = !(Math.abs(x) >= W && (z <= Z0 || z >= FZ));                                   // and the top's corners
        if (!ok && qy === th + 1) ok = Math.abs(x) <= W - 2 && z >= Z0 + 1 && z <= FZ - 2 && !(Math.abs(x) === W - 2 && (z === Z0 + 1 || z === FZ - 2));      // the crown, a step in
        if (!ok && qz <= th) ok = (x / (rx + 0.5)) ** 2 + ((y - hcy) / (ry + 0.5)) ** 2 + ((z - hcz) / (rz + 0.5)) ** 2 <= 1 && qy <= th;
        if (!ok && z < Z0 - th && r < HR - 1) ok = (x / (rx - 0.3)) ** 2 + ((y - hcy) / (ry + 0.2)) ** 2 + ((z - hcz) / (rz + 0.5 + (th - 1))) ** 2 <= 1;        // fuller behind
        if (ok) hd.set(x, y, z, C0(x, y, z));
      }
      if (!col) {                                          // locks standing a little proud, round the back and sides and over the crown
        const lock = (k, r, lo, hi) => { const q = ((k + 30) % 4), jag = Math.floor(H(Math.floor((k + 30) / 4), 5, 2) * 3); return q !== 3 && r >= lo + jag && r <= hi - (q === 1 ? 0 : 1); };
        for (let r = back; r <= HR - 1; r++) {
          for (let x = -W + 1; x <= W - 1; x++) if (lock(x, r, back, HR - 2)) hd.set(x, B + r, Z0 - 2, hairCol(x, B + r, Z0 - 2));
          for (const sd of [1, -1]) for (let z = Z0 + 1; z <= 1; z++) if (lock(z + sd, r, z > -1 ? Math.max(side, back) + 1 : back + 1, HR - 2)) hd.set(sd * (W + 2), B + r, z, hairCol(sd * (W + 2), B + r, z));
        }
        for (let x = -W + 3; x <= W - 3; x++) for (let z = Z0 + 2; z <= FZ - 3; z++) if (((x + z + 30) >> 1) % 3 !== 0 && Math.abs(x) + Math.abs(z - hcz) < W) hd.set(x, B + HR + 2 - (Math.abs(x) > 1 ? 1 : 0), z, hairCol(x, B + HR + 1, z));
      }
      if (!col) hd.paint((x, y, z) => { const r = y - B; return inSkull(x, y, z) && (r >= HR - 1 || (z <= Z0 + 1 && r >= back) || (Math.abs(x) >= W && z <= 0 && r >= side)); }, hairCol);   // the scalp beneath is hair too
    };
    // the fringe: strands over the brow, len(x) rows below the top one
    const bangs = len => {
      for (let x = -W; x <= W; x++) {
        const l = len(x), r0 = HR - 2;
        for (let r = r0; r >= r0 - l; r--) hd.set(x, B + r, FZ + 1, r === r0 - l && l > 0 ? hairD : hairCol(x, B + r, FZ + 1));
      }
    };
    // face-framing locks in front of the ears
    const locks = (r0, r1) => {
      for (const s of [1, -1]) for (let r = r0; r <= r1; r++) {
        const tip = r <= r0 + 1;
        for (let z = tip ? FZ - 2 : 2; z <= FZ; z++) hd.set(s * (W + 1), B + r, z, tip && z === FZ - 2 ? hairD : hairCol(s * (W + 1), B + r, z));
        if (r >= 4) hd.set(s * W, B + r, FZ, hairCol(s * W, B + r, FZ));
      }
    };
    const FEM_BANGS = x => [1, 2, 1, 2, 2, 1, 0, 2, 2, 1, 2, 2, 1][x + 6] || 0;
    const style = L.bald ? 'bald' : (L.style || (fem ? 'long' : 'short'));
    if (style === 'short') {
      shell(0, HR - 3, HR - 5, 4);
      for (const [x, z, ry] of [[-3, 1.5, 0.9], [2.5, 2, 0.9], [0, -1.5, 1.1], [-4, -3, 0.8], [4, -2.5, 0.8]]) hd.ell(x, B + HR + 0.6, z, 1.7, ry, 1.7, hairCol);
      bangs(x => [1, 1, 2, 1, 0, 1, 2, 1, 1, 0, 1, 1, 0][x + 6] || 0);
      for (const s of [1, -1]) hd.box(s * (W + 1), B + 5, 1, s * (W + 1), B + HR - 5, 2, hairCol);   // sideburns
    } else if (style === 'long') {
      shell(0.2, HR - 3, 2, 0);
      bangs(FEM_BANGS);
      locks(1, HR - 2);
    } else if (style === 'bun' || style === 'braid') {
      shell(-0.2, HR - 3, HR - 4, 3);
      bangs(FEM_BANGS);
      locks(4, HR - 3);
      if (style === 'bun') {
        const tucked = L.hat === 'kerchief', by = tucked ? B + 3 : B + HR - 2, bz = tucked ? hcz - hrz - 0.6 : Z0 - 4.4;      // (under a headscarf it's worn low, at the nape)
        hd.ell(0, by, bz, 2.7, 2.5, 2.3, (x, y, z) => (Math.floor(Math.hypot(x, y - by) * 1.4) & 1) ? hairC : (H(x, y, z) < 0.5 ? hairD : hairL));
        if (!tucked) hd.line(-4, by + 1, bz, 4, by - 1, bz, WOOD_L);
      }
    } else if (style === 'messy') {                                      // Reiner's: a farm boy's mop, tufts every way, one that won't lie down
      shell(0.1, HR - 3, HR - 6, 3);
      for (const [x, z, rx, ry] of [[-4, 2, 1.9, 1.2], [3.5, 2.5, 1.9, 1.1], [0.5, 0, 2.3, 1.7], [-3, -3, 2, 1.4], [4, -2, 1.8, 1.4], [0, -4, 2.2, 1.2]]) hd.ell(x, B + HR + 0.9, z, rx, ry, rx, hairCol);
      hd.line(1, B + HR + 2, -2, 3, B + HR + 5, -4, hairCol, 0.5); hd.line(0, B + HR + 2, -2, -1, B + HR + 4, -5, hairCol, 0.4);      // the cowlick
      for (const sd of [1, -1]) {
        for (const [r, z] of [[HR - 4, -2], [HR - 6, 0], [HR - 8, -3], [HR - 3, 1]]) hd.line(sd * (W + 1), B + r + 1, z, sd * (W + 3), B + r - 1, z - 1, hairCol, 0.4);
        hd.box(sd * (W + 1), B + 5, 1, sd * (W + 1), B + HR - 5, 2, hairCol);
      }
      for (const [x, r] of [[-4, 2], [-1, 3], [3, 2], [0, 5], [5, 4]]) hd.line(x, B + r + 1, Z0 - 1, x * 1.1, B + r - 1, Z0 - 3, hairCol, 0.4);
      bangs(x => [3, 2, 3, 2, 1, 2, 4, 3, 1, 2, 3, 2, 3][x + 6] || 0);
      for (let x = -4; x <= 4; x++) if ((x + 20) % 3 !== 1) hd.box(x, B + HR - 3 + (x & 1), FZ + 2, x, B + HR, FZ + 2, hairCol);      // the fringe stands out in two layers
    } else if (style === 'pigtails') {                                   // a little girl's: two bunches tied high
      shell(-0.1, HR - 3, HR - 5, 3);
      bangs(FEM_BANGS);
      locks(5, HR - 3);
      for (const sd of [1, -1]) {
        const g = M.part('tuft' + (sd > 0 ? 'L' : 'R'), 'head', [sd * (W + 2), B + HR - 3, -2]), rb = L.ribbon || 0xd84a5a;
        g.ell(sd * (W + 4), B + HR - 5, -2.5, 2.3, 3.4, 2.2, hairCol); g.ell(sd * (W + 4.5), B + HR - 8.5, -2.5, 1.5, 2.2, 1.4, hairCol);
        g.box(sd * (W + 2), B + HR - 4, -3, sd * (W + 2), B + HR - 2, -1, rb); g.set(sd * (W + 2), B + HR - 1, -3, rb); g.set(sd * (W + 2), B + HR - 1, -1, shade(rb, 0.8));
      }
    } else if (style === 'bob') {                                        // cut straight at the jaw
      shell(0.2, HR - 3, 2, 1);
      bangs(x => [3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3][x + 6] || 0);
      locks(2, HR - 2);
    } else if (style === 'curls') {
      shell(0.4, HR - 3, HR - 7, 3);
      for (let i = 0; i < 34; i++) { const a = H(i, 3, seed & 255) * TAU, r = HR - 6 + H(i, 5, 1) * 8, x = Math.sin(a) * (W + 0.8), z = Math.cos(a) * (W - 0.2) - 1; if (z > 3 && r < HR - 1) continue; hd.ell(x, B + r, z, 1.4, 1.4, 1.4, hairCol); }
      bangs(x => [2, 2, 1, 2, 2, 1, 2, 2, 1, 2, 2, 1, 2][x + 6] || 0);
    } else if (style === 'maron') {                                      // Trap Trick's own hair, brushed and tied for school: see cast.js
      for (const sd of [1, -1]) for (let r = 2; r <= HR - 2; r++) for (let z = r < 4 ? 3 : 2; z <= 4; z++) hd.set(sd * (W + 1), B + r, z, r <= 2 ? hairD : hairCol(sd * (W + 1), B + r, z));
    } else if (style === 'bald') {                                       // a horseshoe of hair round the back and sides
      for (let y = B + 4; y <= B + 8; y++) for (let x = -W - 1; x <= W + 1; x++) for (let z = Z0 - 1; z <= 2; z++) {
        if (inSkull(x, y, z)) continue;
        if (!(inSkull(x + 1, y, z) || inSkull(x - 1, y, z) || inSkull(x, y, z + 1))) continue;
        if (z > 0 && y > B + 6) continue;
        hd.set(x, y, z, hairCol(x, y, z));
      }
      hd.set(2, B + HR - 1, 1, tint(skin, 0.4)); hd.set(3, B + HR - 1, 0, tint(skin, 0.3)); hd.set(2, B + HR - 1, 0, tint(skin, 0.25));
    }
    // hair that falls below the head lies on the back (on the torso, so the head turns without it)
    // (from the back of the head, z0, it curves in over six rows to lie on the back)
    const headBack = Math.round(hcz - hrz) + 1;
    const fallZ = y => {
      const onBack = (backOf(tor, 0, Math.min(y, topRow)) || -3) - 1, t = Math.min(1, Math.max(0, (B + 1 - y) / 6));
      return Math.round(headBack + (Math.max(onBack, headBack) - headBack) * t);
    };
    if (style === 'long') {
      const bot = Math.round(Sh - (kind === 'kid' ? 8 : 12));
      for (let y = B + 1; y >= bot; y--) {
        const hw = Math.round(W - 0.5 - (B - y) * 0.05), z0 = fallZ(y);
        for (let x = -hw; x <= hw; x++) {
          const tipLen = Math.floor(H(x, 7, 3) * 4);
          if (y < bot + tipLen) continue;
          const c = y <= bot + tipLen ? hairD : hairCol(x, y, z0);
          tor.set(x, y, z0, c); tor.set(x, y, z0 - 1, hairCol(x, y, z0 - 1));
        }
      }
    }
    if (style === 'braid') {
      const bot = Math.round(Sh - (kind === 'kid' ? 7 : 11)), ribbon = L.ribbon || 0xd84a5a;
      for (let y = B + 5; y >= bot; y--) {
        const onHead = y >= B, g = onHead ? hd : tor, z = onHead ? headBack - 1 : fallZ(y) - 1, j = Math.floor((B + 5 - y) / 2), ox = (j & 1) ? 1 : -1;
        if (y <= bot + 3) {
          if (y >= bot + 2) { for (let x = -1; x <= 1; x++) g.set(x, y, z, ribbon); g.set(-2, y, z, ribbon); g.set(2, y - 1, z, ribbon); }
          else g.set(0, y, z, y === bot ? hairD : hairC);
          continue;
        }
        for (let x = ox - 1; x <= ox + 1; x++) g.set(x, y, z, hairCol(x, y, z));
        g.set(-ox, y, z, hairD); g.set(ox, y, z - 1, hairCol(ox, y, z - 1));
      }
    }
    // a beard: hugging the jaw, a moustache over the mouth; a long one hangs to a point
    if (L.beard) {
      const long = L.beard === 'long', bot = long ? -6 : -1;
      for (let r = bot; r <= 4; r++) {
        const y = B + r, k = skRow(Math.max(0, r));
        for (let x = -W - 1; x <= W + 1; x++) for (let z = 0; z <= FZ + 1; z++) {
          if (inSkull(x, y, z)) continue;
          let ok = false;
          if (r < 0) { const w = long ? Math.max(0, 3 + r * 0.45) : 3; ok = Math.abs(x) <= w && z >= 1 && z <= FZ - (long ? Math.round(-r * 0.3) : 0); }
          else if (z === FZ + 1) ok = r <= 3 && Math.abs(x) <= (r <= 1 ? k[0] : 4) && !(r === 2 && Math.abs(x) <= 1);
          else ok = Math.abs(x) === k[0] + 1 && z >= Math.max(1, k[1]);
          if (ok) hd.set(x, y, z, r === bot && long ? hairD : hairCol(x, y, z));
        }
      }
      if (!story) for (const x of [-1, 0, 1]) put(x, 2, 0x5a3030);
    }

    /* ---------------------------------------------------------------- hats */
    const hc = L.hatColor || 0x6a4a2a, T0 = B + HR;
    // hair stops where a hat begins (the row it sits down to), so that none pokes through it
    const under = { cap: HR - 2, feather: HR - 1, witch: HR - 1, helmet: HR - 3, straw: HR, kerchief: HR - 3 }[L.hat];
    if (under != null) { const gone = []; hd.each((x, y, z) => { if (y - B >= under && !inSkull(x, y, z)) gone.push([x, y, z]); }); for (const q of gone) hd.del(...q); }
    if (L.hat === 'cap') {                                                // a soft cap with a short peak
      const R = [hrx + 0.5, hrx + 0.6, hrx + 0.1, hrx - 1.5];
      for (let i = 0; i < 4; i++) hd.disc(0, hcz - 0.3 - i * 0.35, R[i], T0 - 2 + i, T0 - 2 + i, (x, y, z) => i === 0 ? shade(hc, 0.78) : noise(hc, x, y, z, 0.2));
      hd.set(0, T0 + 2, Math.round(hcz - 1.4), shade(hc, 0.7));
      const pz = frontOf(hd, 0, T0 - 2);
      for (let z = pz + 1; z <= pz + 3; z++) for (let x = -(5 - (z - pz)); x <= 5 - (z - pz); x++) hd.set(x, T0 - 2, z, shade(hc, 0.85));
    }
    if (L.hat === 'kerchief') {                                           // a headscarf knotted at the nape
      { const gone = []; hd.each((x, y, z) => { if (y - B >= 6 && z < 0 && !inSkull(x, y, z)) gone.push([x, y, z]); }); for (const q of gone) hd.del(...q); }
      shell(0.5, HR - 2, HR - 4, 6, (x, y, z) => y === B + HR - 2 && z >= FZ ? tint(hc, 0.18) : noise(hc, x, y, z, 0.2), 2);
      const kz = Z0 - 4;
      hd.ell(0, B + 6.5, kz, 1.3, 1.1, 1.1, shade(hc, 0.86));
      hd.line(0, B + 6, kz - 1, -1.5, B + 2, kz - 1.5, shade(hc, 0.9)); hd.line(0, B + 6, kz - 1, 1.5, B + 2.5, kz - 1.2, hc);
    }
    if (L.hat === 'straw') {                                              // a wide straw hat, a red band
      const weave = (x, y, z) => ((x + z + y) & 1) ? 0xdcb466 : 0xc9a050;
      hd.disc(0, hcz, 11, T0, T0, (x, y, z) => { const d = Math.hypot(x, z - hcz); return d > 9.4 ? -1 : (d > 8.6 ? 0xb88c44 : weave(x, y, z)); });
      for (let x = -12; x <= 12; x++) for (let z = -13; z <= 12; z++) { const d = Math.hypot(x, z - hcz); if (d > 9.4 && d <= 11.3) hd.set(x, T0 - 1, z, d > 10.6 ? 0xb88c44 : weave(x, T0 - 1, z)); }
      const CR = [6.9, 6.9, 6.5, 5.6];
      for (let i = 0; i < 4; i++) hd.disc(0, hcz, CR[i], T0 + 1 + i, T0 + 1 + i, (x, y, z) => i < 2 && Math.hypot(x, z - hcz) > CR[i] - 1.2 ? (L.band || 0xa83a3a) : weave(x, y, z));
    }
    if (L.hat === 'helmet') {                                             // a guard's kettle hat: a steel dome and a broad brim
      const R = [7.8, 7.8, 7.7, 7.4, 6.9, 6.0, 4.6, 2.4], y0 = B + HR - 3;
      for (let i = 0; i < R.length; i++) for (let x = -9; x <= 9; x++) for (let z = -10; z <= 9; z++) {
        const d = Math.hypot(x, z - hcz);
        if (d > R[i] + 0.3 || (i < 6 && d < R[i] - 1.3)) continue;
        const y = y0 + i, rivet = i === 1 && d > R[i] - 0.7 && Math.round(Math.atan2(x, z - hcz) / TAU * 16) % 2 === 0;
        hd.set(x, y, z, rivet ? IRON : ((z > 1 && i >= 3) || H(x, y, z) < 0.12 ? STEEL_L : STEEL));
      }
      for (let x = -11; x <= 11; x++) for (let z = -12; z <= 11; z++) { const d = Math.hypot(x, z - hcz); if (d > 7.8 && d <= 10.3) hd.set(x, d > 9.4 ? y0 - 1 : y0, z, d > 9.4 ? STEEL_D : STEEL); }
      for (let z = -3; z <= 3; z++) hd.set(0, y0 + R.length, Math.round(hcz) + z, STEEL_L);
    }
    if (L.hat === 'feather') {                                            // a peaked hat, the brim turned up behind, a long plume
      const CR = [7.4, 7.4, 7.1, 6.6, 5.8], y0 = T0 - 1;
      for (let i = 0; i < CR.length; i++) hd.disc(0, hcz, CR[i], y0 + i, y0 + i, (x, y, z) => i < 2 && Math.hypot(x, z - hcz) > CR[i] - 1.2 ? (L.band || shade(hc, 0.6)) : noise(hc, x, y, z, 0.18));
      for (let x = -11; x <= 11; x++) for (let z = -12; z <= 12; z++) {
        const d = Math.hypot(x, z - hcz), th = Math.atan2(x, z - hcz), rb = 8.6 + 1.6 * Math.max(0, Math.cos(th));
        if (d <= 7.4 || d > rb) continue;
        const up = z - hcz < -2 ? (d > 8.4 ? 2 : 1) : 0;
        hd.set(x, y0 + up, z, d > rb - 0.8 ? shade(hc, 0.8) : hc);
      }
      const fc = L.feather || 0xe8e0d0;
      hd.line(5, y0 + 2, hcz - 1, 8, y0 + 7, hcz - 5, fc, 0.6); hd.line(8, y0 + 7, hcz - 5, 9, y0 + 10, hcz - 9, tint(fc, 0.3), 0.45);
      hd.line(5, y0 + 2, hcz - 1, 9, y0 + 10, hcz - 9, shade(fc, 0.75));
    }
    if (L.hat === 'witch') {
      const hd = story ? M.part('hat', 'head', [0, T0 - 1, hcz]) : M.parts.head.grid;                                              // a mage's pointed hat, bent over at the tip
      const y0 = T0 - 1;
      for (let x = -13; x <= 13; x++) for (let z = -14; z <= 12; z++) { const d = Math.hypot(x, z - hcz); if (d <= 11.8) hd.set(x, d > 10.8 ? y0 - 1 : y0, z, d > 10.8 ? shade(hc, 0.8) : noise(hc, x, y0, z, 0.15)); }
      for (let y = y0 + 1; y <= y0 + 16; y++) {
        const f = (y - y0 - 1) / 16, r = 7.0 * Math.pow(1 - f, 0.85) + 0.3;
        const ox = Math.max(0, f - 0.5) * 4, oz = -Math.pow(Math.max(0, f - 0.45), 1.5) * 12;
        hd.disc(ox, hcz + oz, r, y, y, (x, yy, z) => y <= y0 + 2 ? (L.band || BRASS) : noise(hc, x, yy, z, 0.15));
      }
    }
    if (L.ears === 'fox') for (const sd of [1, -1]) for (let k = 0; k < 7; k++) { const hw = k < 2 ? 2 : k < 5 ? 1.4 : 0.6; for (let x = -2; x <= 2; x++) if (Math.abs(x) <= hw) for (let z = -1; z <= 0; z++) hd.set(sd * (5 - k * 0.12) + x, T0 + k, z + 1, z === 0 && Math.abs(x) < hw - 0.4 && k < 5 ? 0xf0d0c0 : k > 4 ? hairD : hairC); }
    if (L.ears === 'long') for (const sd of [1, -1]) { hd.line(sd * (W + 1), B + 5, 0, sd * (W + 6), B + 8, -3, skin, 0.5); hd.set(sd * (W + 7), B + 9, -3, skin2); }
    if (L.horns) for (const sd of [1, -1]) for (let t = 0; t <= 1; t += 0.05) hd.ell(sd * (4.5 + Math.sin(t * 2.6) * 4.5), B + HR - 2 + t * 4 - t * t * 2, 2 - t * 9 + t * t * 5, 1.5 - t, 1.5 - t, 1.5 - t, Math.floor(t * 10) & 1 ? 0x8a7a68 : 0xa09080);
    if (L.flower) {                                                       // a flower tucked behind the ear
      const fx = W + 2, fy = B + HR - 3;
      hd.set(fx, fy, 3, 0xffd04a);
      for (const [y, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) hd.set(fx, fy + y, 3 + z, 0xff7aa8);
    }

    /* ================================================================ ARMS == */
    const sleeveCol = (x, y, z) => mail ? (((x + z + y) & 1) ? STEEL : STEEL_D) : noise(sleeve, x, y, z, 0.14);
    const cuffCol = mail ? STEEL_L : (robe || L.uniform ? (L.band || BRASS) : tint(sleeve, 0.2));
    const puff = L.dress && !robe && !L.uniform;
    for (const s of [1, -1]) {
      const n = s > 0 ? 'L' : 'R', ax = s * armX;
      const ua = M.part('uArm' + n, 'torso', [ax, Sh, 0]);
      for (let y = E + 0.5; y <= Sh + 0.5; y++) ua.disc(ax, 0, b.upR, y, y, sleeveCol);
      if (puff) ua.ell(ax + s * 0.3, Sh - 1.5, 0, 2.3, 2.6, 2.3, (x, y, z) => { const k = Math.floor((Math.atan2(z, x - ax) + Math.PI) / TAU * 10); return k & 1 ? sleeve : shade(sleeve, 0.9); });
      else ua.ell(ax, Sh - 0.5, 0, b.upR + 0.2, 1.4, b.upR + 0.2, sleeveCol);
      const fa = M.part('fArm' + n, 'uArm' + n, [ax, E, 0]);
      for (let y = Wr + 0.5; y <= E - 0.5; y++) {
        if (L.rolled) fa.disc(ax, 0, 1.5, y, y, (x, yy, z) => z < 0 ? skin2 : skin);
        else if (robe) fa.disc(ax, 0, b.foR + 0.2 + Math.max(0, (Wr + 4.5 - y)) * 0.35, y, y, sleeveCol);
        else fa.disc(ax, 0, b.foR, y, y, sleeveCol);
      }
      if (L.rolled) { fa.disc(ax, 0, 2.0, E - 1.5, E - 0.5, tint(sleeve, 0.12)); }
      else if (!robe) fa.disc(ax, 0, b.foR + 0.45, Wr + 0.5, Wr + 0.5, cuffCol);
      // the hand: a palm, the fingers on the inner side, a thumb in front
      const hand = L.gloves || skin, hand2 = L.gloves ? shade(L.gloves, 0.85) : skin2;
      if (story) {                                                        // hands of their own: they turn at the wrist and take shapes
        const w = Math.round(Wr - 0.5);
        M.part('hand' + n, 'fArm' + n, [ax, w + 0.5, 0], { defaultVariant: 'relax' });
        const palm = (g, y0) => g.box(ax - 1, y0, -1, ax + 1, w, 1, hand), V = k => M.variant('hand' + n, k);
        const relax = V('relax'); palm(relax, w - 2); relax.box(ax - (s > 0 ? 1 : 0), w - 3, -1, ax + (s > 0 ? 0 : 1), w - 3, 1, hand2); relax.set(ax, w - 1, 2, hand); relax.set(ax, w - 2, 2, hand2);
        const fist = V('fist'); palm(fist, w - 2); for (let z = -1; z <= 1; z++) fist.set(ax - s, w - 2, z, hand2); fist.set(ax - s, w - 1, 1, hand2); fist.set(ax, w - 1, 2, hand2);
        const point = V('point'); palm(point, w - 2); point.box(ax, w - 5, 1, ax, w - 3, 1, hand); point.set(ax, w - 5, 1, hand2); point.set(ax, w - 1, 2, hand2);
        const open = V('open'); palm(open, w - 2); for (const z of [-1, 0, 1]) open.box(ax, w - (z === 0 ? 5 : 4), z, ax, w - 3, z, z === 0 ? hand2 : hand); open.set(ax, w - 1, 2, hand); open.set(ax, w - 2, 3, hand);
        const hold = V('hold'); palm(hold, w - 2); hold.box(ax - s, w - 2, 2, ax, w - 2, 2, hand); hold.set(ax - s, w - 3, 1, hand2); hold.set(ax - s, w - 3, 0, hand2); hold.set(ax, w - 1, 2, hand2);
      } else {
      fa.box(ax - 1, Wr - 2.5, -1, ax + 1, Wr - 0.5, 1, hand);
      fa.box(ax - (s > 0 ? 1 : 0), Wr - 3.5, -1, ax + (s > 0 ? 0 : 1), Wr - 3.5, 1, hand2);
      fa.set(ax, Wr - 1.5, 2, hand); fa.set(ax, Wr - 2.5, 2, hand2);
      }
      // what the hand holds
      const gy = Wr - 1.5, tool = s > 0 ? L.left : L.right;
      if (tool === 'basket' || tool === 'bucket') {
        const bx = ax + s * 3, by = gy - (tool === 'bucket' ? 9 : 8);
        if (tool === 'basket') {
          for (let y = by - 3; y <= by + 2; y++) for (let x = bx - 3; x <= bx + 3; x++) for (let z = -2; z <= 3; z++) {
            const edge = Math.abs(x - bx) === 3 || z === -2 || z === 3;
            if (Math.abs(x - bx) === 3 && (z === -2 || z === 3)) continue;
            if (y === by + 2 && !edge) continue;
            fa.set(x, y, z, y === by + 2 ? 0xc8a068 : (((x + y + z) & 1) ? 0xb08850 : 0x8e6a3c));
          }
          for (const [x, z, c] of [[-1, 0, 0xc0303a], [1, 1, 0xc0303a], [0, 2, 0xd8a040], [1, -1, 0xd8a040], [-2, 1, 0x7aa83a]]) fa.set(bx + x, by + 2, z, c);
          fa.line(bx, by + 3, -2, ax, gy - 2, 0, 0x9a7440); fa.line(bx, by + 3, 3, ax, gy - 2, 0, 0x9a7440);
        } else {
          for (let y = by - 3; y <= by + 2; y++) fa.disc(bx, 0.5, 2.6, y, y, (x, yy, z) => {
            if (yy === by + 2 && Math.hypot(x - bx, z - 0.5) < 1.8) return 0x5a8fd0;
            return yy === by - 2 || yy === by + 1 ? IRON : (((x + z) & 1) ? 0x8a5a32 : 0x74482a);
          });
          fa.line(bx - 2.6, by + 2, 0.5, ax, gy - 3, 0, IRON); fa.line(bx + 2.6, by + 2, 0.5, ax, gy - 3, 0, IRON);
        }
      }
    }

    /* ======================================== HELD AGAINST THE BODY ======= */
    // where the hands come to in the town's poses, for things carried on the forearms
    const reach = (ua, fa) => {
      const ey = Sh - b.UA * Math.cos(ua), ez = b.UA * Math.sin(ua), d = b.FA + 2;
      return { ey, ez, hy: ey - d * Math.cos(ua + fa), hz: ez + d * Math.sin(ua + fa) };
    };
    if (L.tray) {                                                         // a board of loaves, on both forearms
      const r = reach(0.55, 1.0), y0 = Math.round(r.ey + b.foR + 1), z0 = Math.round(r.ez + 1), z1 = Math.round(r.hz + 2), xw = armX + 1;
      for (let x = -xw; x <= xw; x++) for (let z = z0; z <= z1; z++) {
        tor.set(x, y0, z, 0x8a5a32);
        if (Math.abs(x) === xw || z === z0 || z === z1) tor.set(x, y0 + 1, z, 0x6a4226);
      }
      for (const [x, z] of [[-4, 0.35], [0, 0.6], [4, 0.3], [-2, 0.8], [3, 0.85]]) tor.ell(x, y0 + 1.6, z0 + (z1 - z0) * z, 1.6, 0.8, 1.1, (xx, yy, zz) => yy > y0 + 1 && H(xx, yy, zz) < 0.4 ? 0xe0a858 : 0xc98a42);
    }
    if (L.book) {                                                         // an open book, held up to read
      const r = reach(0.5, 1.25), y0 = Math.round(r.hy + 1.5), z0 = Math.round(r.ez + 3), z1 = Math.round(r.hz + 1);
      for (let x = -5; x <= 5; x++) for (let z = z0; z <= z1; z++) {
        tor.set(x, y0, z, x === 0 ? 0x4a1a2a : 0x6a2a3a);
        if (Math.abs(x) <= 4) tor.set(x, y0 + 1, z, x === 0 ? 0xd8ccb0 : ((z & 1) && Math.abs(x) >= 1 && Math.abs(x) <= 3 ? 0xc8bca0 : 0xf1e6cc));
      }
    }
    if (L.lute) {                                                         // a lute, its own part: the town holds it and puts both hands to it
      // drawn upright, its neck up (+y) and its face to +z; the pivot is the middle of the body
      const lx = -4, ly = Wt + 3, lz = Math.round(b.dC + 3), lu = M.part('lute', 'torso', [lx, ly, lz]);
      const half = y => { const d = y - ly; return d <= -2 ? Math.sqrt(Math.max(0, 1 - ((d + 2) / 6.6) ** 2)) * 6.4 : 6.4 * Math.pow(Math.max(0, 1 - (d + 2) / 13.5), 0.62); };   // a teardrop
      for (let y = ly - 8; y <= ly + 9; y++) {
        const w = half(y); if (w < 0.6) continue;
        for (let x = Math.ceil(lx - w); x <= lx + w; x++) {
          const e = Math.abs(x - lx) / w, dep = Math.max(0, Math.round(Math.sqrt(Math.max(0, 1 - e * e)) * Math.min(3.4, w * 0.7)));
          for (let k = 1; k <= dep; k++) lu.set(x, y, lz + 2 - k, (Math.floor((x - lx + 20) / 2) & 1) ? 0x8a5428 : 0x6e3f1e);   // the ribbed bowl of its back
          const r = Math.hypot(x - lx, y - ly - 1), edge = Math.abs(x - lx) > w - 1;
          lu.set(x, y, lz + 2, r < 2.4 ? (r < 0.6 || (r > 1.2 && (x + y) & 1) ? 0x8a5a30 : 0x24150e) : r < 3.3 ? 0x7a4a26 : edge ? 0x5a3418 : (y < ly - 6 ? 0xc08a4a : 0xd8a862));   // the face: a pale top, a carved rose
        }
      }
      lu.box(lx - 3, ly - 5, lz + 3, lx + 3, ly - 5, lz + 3, 0x4a2a16);      // the bridge
      lu.box(lx - 1, ly + 8, lz + 1, lx + 1, ly + 21, lz + 1, 0x6e3f1e);     // the neck, its fingerboard and frets
      for (let y = ly + 7; y <= ly + 21; y++) lu.box(lx - 1, y, lz + 2, lx + 1, y, lz + 2, (y - ly) % 3 === 0 ? 0xc8a24a : 0x2e1c12);
      for (let k = 0; k <= 6; k++) lu.box(lx - 1, ly + 22 + (k >> 2), lz + 1 - k, lx + 1, ly + 22 + (k >> 2), lz + 1 - k, 0x4a2a16);   // the pegbox, bent back
      for (const k of [1, 3, 5]) for (const s of [-1, 1]) lu.set(lx + s * 2, ly + 22 + (k >> 2), lz + 1 - k, 0xe8dcc0);
      for (let y = ly - 4; y <= ly + 6; y++) for (const x of [-1, 1]) lu.set(lx + x, y, lz + 2, 0xf1e6cc);                             // strings over the face
      // the fingers of his left hand, curled round from under the neck onto the frets (they slide along it with the hand)
      const fi = M.part('frets', 'lute', [lx, ly, lz]);
      for (const k of [-2, -1, 0, 1]) { fi.box(lx + 2, ly + k, lz + 1, lx + 2, ly + k, lz + 3, k & 1 ? skin2 : skin); fi.box(lx + (k & 1 ? 0 : 1), ly + k, lz + 3, lx + 1, ly + k, lz + 3, k & 1 ? skin2 : skin); }
      // its strap, over the left shoulder and round the back
      tor.paint((x, y, z) => { const k = (y - Wt - 4) / (Sh - 2 - Wt - 4), sx = -5 + k * 10; return k > -0.1 && k < 1.3 && Math.abs(x - sx) <= 1 && (z >= 2 || z <= -2); }, 0x5a2a3a);
    }
    if (L.right === 'hammer') {                                           // a smith's hammer, its own part: handle along +z from the grip, its face down (-y)
      const hy = Math.round(Sh - 8), hm = M.part('hammer', 'torso', [0, hy, 10]);
      hm.box(0, hy, 7, 0, hy, 24, (x, y, z) => z < 11 ? WOOD_D : WOOD_L);
      hm.box(-1, hy - 4, 22, 1, hy + 3, 24, (x, y) => y === hy - 4 ? STEEL_L : y > hy + 1 ? STEEL : IRON); hm.box(-2, hy - 3, 22, 2, hy - 2, 24, IRON); hm.set(0, hy + 4, 23, STEEL);
    }
    if (L.left === 'tongs') {                                             // his tongs, their jaws along +z from the grip
      const ty = Math.round(Sh - 10), tg = M.part('tongs', 'torso', [0, ty, 10]);
      for (const s of [-1, 1]) { tg.line(s, ty, 4, s, ty, 10, IRON); tg.line(s, ty, 11, 0, ty, 14, IRON); tg.line(0, ty, 14, s, ty, 19, IRON); tg.set(s, ty, 21, STEEL_D); tg.line(s, ty, 19, s, ty, 22, IRON); }
      tg.set(0, ty + 1, 14, STEEL);
    }
    if (L.right === 'broom') {                                            // a birch broom, its own part: drawn standing, the pivot at its foot
      const br = M.part('broom', 'torso', [0, 0, 0]);
      br.box(0, 9, 0, 0, 60, 0, (x, y) => y % 17 === 0 ? WOOD_D : WOOD_L);
      for (let y = 0; y <= 10; y++) { const w = y > 8 ? 1 : y > 5 ? 2 : y > 2 ? 3 : 4, d = y > 5 ? 1 : 2; for (let x = -w; x <= w; x++) for (let z = -d; z <= d; z++) { if (Math.abs(x) === w && Math.abs(z) === d && y < 9) continue; if (y === 0 && H(x, z, 3) < 0.35) continue; br.set(x, y, z, y === 7 || y === 9 ? 0x8a3a2a : ((x + z * 2) & 1) ? 0xd2b060 : 0xb89448); } }
    }
    if (L.right === 'spear') {                                            // a guard's spear, its own part: the town keeps it upright in the fist
      // drawn standing, its butt on the ground; the pivot is where the hand takes it
      const sp = M.part('spear', 'torso', [0, 44, 0]), top = Math.round(B + 18);
      sp.box(0, 2, 0, 0, top, 0, (x, y) => y % 23 === 0 ? WOOD_D : WOOD_L); sp.box(0, 0, 0, 0, 1, 0, IRON);      // the ash shaft, an iron butt
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { sp.box(dx, 41, dz, dx, 47, dz, (x, y) => y & 1 ? 0x5a3a24 : 0x6e4a30); sp.box(dx, top - 2, dz, dx, top, dz, IRON); }   // a leather grip, the socket
      const BL = [1, 2, 2, 2, 1, 1, 1, 0, 0];
      for (let k = 1; k <= 9; k++) for (let x = -BL[k - 1]; x <= BL[k - 1]; x++) sp.set(x, top + k, 0, x === 0 ? STEEL : k > 1 ? STEEL_L : IRON);                         // the leaf blade, a rib down it
      sp.set(0, top + 10, 0, STEEL_L); for (const k of [1, 2, 3]) { sp.set(0, top + k, 1, STEEL); sp.set(0, top + k, -1, STEEL); }
      for (let k = 0; k < 4; k++) { sp.set(1, top - 3 - k, 0, 0x2f4f9e); sp.set(1, top - 3 - k, 1, k & 1 ? 0xe8c24a : 0x2f4f9e); }      // a ribbon in the town's colours
    }
    if (L.right === 'axe') {                                              // a long axe, its own part: the town swings it and puts both hands to it
      // drawn with the handle along +z from the upper grip (the pivot), the blade's edge down (-y): the way it's swung
      const axv = M.part('axe', 'torso', [0, Sh - 8, 14]), ay = Math.round(Sh - 8), az = 14;
      axv.box(0, ay, az - 10, 0, ay, az + 19, (x, y, z) => z <= az - 8 ? 0x5a3a20 : ((z & 7) === 0 ? WOOD : WOOD_L));
      axv.set(0, ay - 1, az - 10, 0x5a3a20); axv.set(0, ay - 1, az - 9, WOOD);              // the handle's curved butt
      axv.box(-1, ay - 1, az + 15, 1, ay + 1, az + 18, (x, y, z) => x === 0 && (z === az + 16 || z === az + 17) && y === ay + 1 ? WOOD_L : IRON);   // the eye, a wedge in it
      axv.box(-1, ay + 2, az + 16, 1, ay + 2, az + 17, 0x2e2e36);                              // the poll
      for (let k = 2; k <= 6; k++) { const f = k < 3 ? 0 : k < 5 ? 1 : 2; for (let z = az + 15 - f; z <= az + 18 + f; z++) axv.set(0, ay - k, z, k === 6 ? STEEL_L : k === 5 ? STEEL : IRON); }
      for (let z = az + 15; z <= az + 18; z++) for (const x of [-1, 1]) axv.set(x, ay - 2, z, IRON);
    }
    if (L.sack) {                                                         // a sack of grain on the right shoulder
      const sx = -(armX + 0.5), sy = Sh + 2.2, sz = -2.5;
      tor.ell(sx, sy, sz, 3.8, 3.2, 3.6, (x, y, z) => H(x, y, z) < 0.25 ? 0xae9466 : (((x + y) % 4 === 0) ? 0xb49c6e : 0xc2a878));
      tor.box(sx, sy + 3, sz, sx, sy + 5, sz, 0x8a7448); tor.set(sx - 1, sy + 5, sz, 0x9a8456); tor.set(sx + 1, sy + 5, sz, 0x9a8456);
    }

    // how tall they stand, with the hat (for speech bubbles), and what the town needs to pose them
    let top = 0;
    hd.paint((x, y) => { if (y > top) top = y; return false; }, 0);
    M.info = { kind, top: (top + 1) * S, seat: b.thR + 0.3, dress: !!L.dress, ua: b.UA * S, fa: (b.FA + 1.5) * S,
      thigh: (Hp - K) * S, shin: K * S, hip: Hp * S, head: (Sh + 1.5) * S, eye: (B + 6) * S, sh: Sh * S, armX: armX * S };   // (ua, fa: shoulder to elbow, elbow to the middle of the fist)
    return M;
  }

  /* The faces of the story's cast. The eyes (rows 4-10) and the mouth (rows 1-3) are plates of their own on the face's
     plane, each in several expressions, so any eyes go with any mouth and people can blink, look and talk. */
  function paintFace(o) {
    const { M, hd, skin, skin2, B, FZ, HR, W, inSkull, L, young, kind, eyeC, hairC, hairD } = o;
    const eD = shade(eyeC, 0.5), eL = tint(eyeC, 0.4), brow = hairD, DARK = 0x5a2030, TONGUE = 0xe07a86, TEETH = 0xfdf7f2;
    const lipC = L.lips ? LIP : young ? mix(skin, LIP, 0.5) : shade(skin, 0.68), bc = mix(skin, BLUSH, 0.6);
    const on = (x, r) => inSkull(x, B + r, FZ) && Math.abs(x) <= W - 1;
    M.part('eyes', 'head', M.parts.head.pivot, { defaultVariant: 'open' });
    M.part('mouth', 'head', M.parts.head.pivot, { defaultVariant: 'flat' });
    for (let x = -W; x <= W; x++) for (let r = 1; r <= 10; r++) if (on(x, r)) hd.del(x, B + r, FZ);
    for (let x = -W; x <= W; x++) for (let r = 1; r <= 10; r++) if (on(x, r) && inSkull(x, B + r, FZ - 1)) hd.set(x, B + r, FZ - 1, skin2);
    const blushAt = (x, r) => (L.blush || kind === 'kid') && (kind === 'kid' ? r === 3 && (Math.abs(x) === 3 || Math.abs(x) === 4) : (r === 3 && (Math.abs(x) === 4 || Math.abs(x) === 5)) || (r === 4 && Math.abs(x) === 5));
    const freckle = (x, r) => L.freckles && ((r === 4 && (Math.abs(x) === 1)) || (r === 3 && Math.abs(x) === 3) || (r === 3 && Math.abs(x) === 1 && x > 0));
    const base = (x, r) => blushAt(x, r) ? bc : freckle(x, r) ? mix(skin, 0xb06a40, 0.45) : skin;
    const plate = (part, name, r0, r1, draw) => {
      const g = M.variant(part, name);
      for (let x = -W; x <= W; x++) for (let r = r0; r <= r1; r++) if (on(x, r)) g.set(x, B + r, FZ, base(x, r));
      draw((x, r, c) => { if (on(x, r) && r >= r0 && r <= r1) g.set(x, B + r, FZ, c); });
    };
    /* eyes: f(put, s) draws one; s +1 the person's left (+x), -1 the right. X(i): i 0 inner .. 2 outer */
    const eyes = (name, f) => plate('eyes', name, 4, 10, put => { for (const s of [1, -1]) f(put, s, i => s * (2 + i)); });
    const brows = (put, s, kindOf) => {                      // up, flat, worry (inner up), stern (inner down)
      if (kind === 'kid') return;
      for (let i = 1; i <= 4; i++) { const r = kindOf === 'up' ? 10 : kindOf === 'worry' ? (i <= 2 ? 10 : 9) : kindOf === 'stern' ? (i <= 2 ? 8.6 : 9.6) : 9.6; put(s * i, Math.round(r), brow); }
    };
    if (young) {
      const lid = (put, s, r) => { for (let i = -1; i <= 2; i++) put(s * (2 + i), r, LASH); if (!L.boy) put(s * 5, r - 1, LASH); };
      const iris = (put, s, X, top, dx) => {                 // three wide, from row `top` down to row 4 (kids 5), the light at the bottom
        const x = i => X(i) + (dx || 0), hi = s > 0 ? x(0) : x(2), lo = s > 0 ? x(2) : x(0);
        if (dx) for (let i = -1; i <= 3; i++) for (let r = 4; r <= top; r++) if (Math.abs(2 + i - 3) <= 2) put(s * (2 + i), r, i < 0 || i > 2 ? skin : WHITE);
        for (let i = 0; i <= 2; i++) for (let r = 4; r <= top; r++) put(x(i), r, r >= 6 ? (r === 6 && i === 1 ? eD : r >= 7 ? eD : eyeC) : r === 5 ? (i === 1 ? eD : eyeC) : i === 2 ? eyeC : eL);
        put(hi, Math.min(top, 7), WHITE); if (top >= 7) put(hi, 6, WHITE); put(lo, 4, WHITE);
      };
      eyes('open', (put, s, X) => { lid(put, s, 8); iris(put, s, X, 7); brows(put, s, 'flat'); });
      eyes('lookL', (put, s, X) => { lid(put, s, 8); iris(put, s, X, 7, 1); brows(put, s, 'flat'); });
      eyes('lookR', (put, s, X) => { lid(put, s, 8); iris(put, s, X, 7, -1); brows(put, s, 'flat'); });
      eyes('half', (put, s, X) => { lid(put, s, 7); iris(put, s, X, 6); brows(put, s, 'flat'); });
      eyes('soft', (put, s, X) => { lid(put, s, 7); iris(put, s, X, 6); brows(put, s, 'up'); });
      eyes('shut', (put, s) => { put(s, 6, LASH); for (let i = 2; i <= 4; i++) put(s * i, 5, LASH); put(s * 5, 6, LASH); brows(put, s, 'flat'); });
      eyes('happy', (put, s) => { put(s, 5, LASH); put(s * 2, 6, LASH); put(s * 3, 7, LASH); put(s * 4, 6, LASH); put(s * 5, 5, LASH); brows(put, s, 'up'); });
      eyes('wide', (put, s, X) => { for (let i = -1; i <= 2; i++) put(s * (2 + i), 9, LASH); for (let i = -1; i <= 2; i++) for (let r = 5; r <= 8; r++) put(s * (2 + i), r, WHITE); for (let i = 0; i <= 1; i++) for (let r = 5; r <= 7; r++) put(X(i), r, r === 7 ? eD : r === 6 ? eD : eyeC); put(X(s > 0 ? 0 : 1), 7, WHITE); brows(put, s, 'up'); });
      eyes('sad', (put, s, X) => { put(s, 8, LASH); put(s * 2, 8, LASH); put(s * 3, 7, LASH); put(s * 4, 7, LASH); put(s * 5, 6, LASH); iris(put, s, X, 6); put(s * 2, 7, eD); brows(put, s, 'worry'); });
      eyes('worry', (put, s, X) => { lid(put, s, 8); iris(put, s, X, 7); brows(put, s, 'worry'); });
      eyes('stern', (put, s, X) => { put(s, 6, LASH); put(s * 2, 7, LASH); put(s * 3, 7, LASH); put(s * 4, 8, LASH); put(s * 5, 8, LASH); for (let i = 0; i <= 2; i++) for (let r = 4; r <= 6 + (i === 2 ? 1 : 0); r++) put(X(i), r, r >= 6 ? eD : r === 5 ? (i === 1 ? eD : eyeC) : eL); brows(put, s, 'stern'); });
      eyes('squeeze', (put, s) => { put(s, 6, LASH); put(s * 2, 6, LASH); put(s * 3, 7, LASH); put(s * 4, 8, LASH); put(s * 3, 5, LASH); put(s * 4, 4, LASH); put(s * 2, 6, LASH); brows(put, s, 'stern'); });      // > <
      eyes('down', (put, s, X) => { for (let i = -1; i <= 2; i++) put(s * (2 + i), 6, LASH); put(s * 5, 5, LASH); for (let i = 0; i <= 2; i++) { put(X(i), 5, eD); put(X(i), 4, eyeC); } brows(put, s, 'flat'); });
      eyes('wink', (put, s, X) => { if (s > 0) { lid(put, s, 8); iris(put, s, X, 7); } else { put(s, 5, LASH); put(s * 2, 6, LASH); put(s * 3, 7, LASH); put(s * 4, 6, LASH); put(s * 5, 5, LASH); } brows(put, s, 'flat'); });
    } else {
      const crow = put => {};
      const lid = (put, s, r) => { for (let i = -1; i <= 2; i++) put(s * (2 + i), r, LASH); };
      const iris = (put, s, X, top, dx) => { const x = i => X(i) + (dx || 0); if (dx) for (let i = 0; i <= 2; i++) for (let r = 5; r <= top; r++) put(X(i), r, WHITE); for (let i = 0; i <= 2; i++) for (let r = 5; r <= top; r++) put(x(i), r, r === top && top > 5 ? eD : i === 1 ? eL : eyeC); put(s > 0 ? x(0) : x(2), top, WHITE); };
      eyes('open', (put, s, X) => { lid(put, s, 7); iris(put, s, X, 6); brows(put, s, 'flat'); });
      eyes('lookL', (put, s, X) => { lid(put, s, 7); iris(put, s, X, 6, 1); brows(put, s, 'flat'); });
      eyes('lookR', (put, s, X) => { lid(put, s, 7); iris(put, s, X, 6, -1); brows(put, s, 'flat'); });
      eyes('half', (put, s, X) => { lid(put, s, 6); iris(put, s, X, 5); brows(put, s, 'flat'); });
      eyes('soft', (put, s, X) => { lid(put, s, 6); iris(put, s, X, 5); brows(put, s, 'up'); });
      eyes('shut', (put, s) => { for (let i = -1; i <= 2; i++) put(s * (2 + i), 5, LASH); brows(put, s, 'flat'); });
      eyes('happy', (put, s) => { put(s, 5, LASH); put(s * 2, 6, LASH); put(s * 3, 6, LASH); put(s * 4, 5, LASH); brows(put, s, 'up'); });
      eyes('wide', (put, s, X) => { lid(put, s, 8); for (let i = 0; i <= 2; i++) for (let r = 5; r <= 7; r++) put(X(i), r, WHITE); put(X(1), 6, eD); put(X(1), 5, eyeC); put(X(0), 6, eD); put(X(0), 5, eyeC); brows(put, s, 'up'); });
      eyes('sad', (put, s, X) => { put(s, 7, LASH); put(s * 2, 7, LASH); put(s * 3, 6, LASH); put(s * 4, 6, LASH); iris(put, s, X, 5); put(X(0), 6, eD); brows(put, s, 'worry'); });
      eyes('worry', (put, s, X) => { lid(put, s, 7); iris(put, s, X, 6); brows(put, s, 'worry'); });
      eyes('stern', (put, s, X) => { put(s, 6, LASH); put(s * 2, 6, LASH); put(s * 3, 7, LASH); put(s * 4, 7, LASH); iris(put, s, X, 5); brows(put, s, 'stern'); });
      eyes('squeeze', (put, s) => { put(s, 6, LASH); put(s * 2, 6, LASH); put(s * 3, 7, LASH); put(s * 3, 5, LASH); put(s * 4, 7, LASH); put(s * 4, 5, LASH); brows(put, s, 'stern'); });
      eyes('down', (put, s, X) => { lid(put, s, 5); brows(put, s, 'flat'); });
    }
    if (L.specs) for (const k in M.parts.eyes.variants) {    // round spectacles, low on the nose
      const g = M.variant('eyes', k);
      for (const s of [1, -1]) { for (let i = 2; i <= 4; i++) g.set(s * i, B + 3, FZ + 1, 0x6a5a3a); g.set(s * 5, B + 4, FZ + 1, 0x6a5a3a); g.set(s, B + 4, FZ + 1, 0x6a5a3a); }
      g.set(0, B + 5, FZ + 1, 0x6a5a3a);
    }
    const mouth = (name, rows) => plate('mouth', name, 1, 3, put => { for (const [x, r, c] of rows) put(x, r, c || lipC); });
    mouth('flat', [[-1, 2], [0, 2], [1, 2]]);
    mouth('smile', [[-2, 3], [-1, 2], [0, 2], [1, 2], [2, 3]]);
    mouth('smirk', [[-1, 2], [0, 2], [1, 2], [2, 3]]);
    mouth('frown', [[-2, 1], [-1, 2], [0, 2], [1, 2], [2, 1]]);
    mouth('wavy', [[-2, 2], [-1, 1], [0, 2], [1, 1], [2, 2]]);
    mouth('small', [[0, 2], [-1, 2]]);
    mouth('open', [[-1, 2, DARK], [0, 2, DARK], [1, 2, DARK], [-1, 1, DARK], [0, 1, TONGUE], [1, 1, DARK]]);
    mouth('mid', [[-1, 2, DARK], [0, 2, DARK], [1, 2, DARK], [0, 1]]);
    mouth('oh', [[0, 3, DARK], [-1, 2, DARK], [0, 2, DARK], [1, 2, DARK], [0, 1, DARK]]);
    mouth('grin', [[-2, 3, DARK], [-1, 3, TEETH], [0, 3, TEETH], [1, 3, TEETH], [2, 3, DARK], [-1, 2, DARK], [0, 2, TONGUE], [1, 2, DARK]]);
    mouth('shout', [[-2, 3, DARK], [-1, 3, TEETH], [0, 3, TEETH], [1, 3, TEETH], [2, 3, DARK], [-2, 2, DARK], [-1, 2, DARK], [0, 2, DARK], [1, 2, DARK], [2, 2, DARK], [-1, 1, DARK], [0, 1, TONGUE], [1, 1, DARK]]);
  }

  window.PEOPLE = { build };
})();
