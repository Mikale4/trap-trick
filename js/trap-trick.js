/* ============================================================================
   trap-trick.js -- Trap Trick, the voxel model (reference: reference/*.png).

   Model space: 1 voxel = 2.4 cm, y up from the soles (she stands 69 voxels =
   1.65 m, 80 with the hat), +x is HER left, +z is the way she faces.

   THE SKELETON (every name below is a joint the animation drives)
     hips (root, the pelvis)
       spine (waist) -> chest -> neck -> head -> hat -> hatCharm (dangling card)
                                        head -> lockL1 -> lockL2, lockR1 -> lockR2   (front ringlets)
                                        head -> back0a..back4a -> back0b..back4b   (back hair, 5 locks x 2)
                          chest -> uArmL -> fArmL -> handL      (shoulder, elbow, wrist)
                          chest -> uArmR -> fArmR -> handR
       hips -> thighL -> shinL -> footL                          (hip, knee, ankle)
       hips -> thighR -> shinR -> footR
       hips -> skirt0..skirt11   (12 skirt panels; each flares about its own waist hinge)
              skirt3 -> cardL, skirt9 -> cardR                  (cards hanging from the hem)
       hips -> bow -> tailL1 -> tailL2, tailR1 -> tailR2        (the back bow and its card-tipped tails)
   Variants: head faces (smug, smile, happy, pout, surprised, wink, blink),
             hands (relax, grip, point, peace, open).
   ========================================================================== */
(function () {
  'use strict';

  const C = {
    SKIN: 0xfadfd2, SKIN2: 0xf1c6b6, BLUSH: 0xf49db2,
    HAIR: 0xd8479c, HAIR_L: 0xf27dc4, HAIR_D: 0xa93079, HAIR_DD: 0x7a1d58,
    EYE_D: 0x4b0c46, EYE: 0xb52282, EYE_L: 0xf36fcb, LASH: 0x2b1429, WHITE: 0xffffff,
    MOUTH: 0xc9506c, MOUTH_D: 0x84253f, TONGUE: 0xf27c93, TEETH: 0xfdf7fb,
    NAVY: 0x1e2260, NAVY_D: 0x131641, NAVY_L: 0x2e3889,
    BLUE: 0x3a5fe0, BLUE_D: 0x243fa6, BLUE_L: 0x7090f4,
    ICE: 0xc3d0f8, ICE_D: 0x95a7e4, PERI: 0x8d9ff0, PERI_D: 0x6c80da,
    WHT: 0xf7f4fd, WHT_D: 0xd8d2ea,
    LILAC: 0xc6a0ee, PINKL: 0xefaedb, PINK: 0xf2659f,
    BLACK: 0x19161f, BLACK_L: 0x302b3b, GREY: 0x5a536a,
    RED: 0xdc2741, RED_D: 0xa1162b, GOLD: 0xebc55c, GEM: 0x4d86ff,
    ARGY_D: 0x241f50, ARGY_L: 0x8a76d6,
  };

  /* playing-card pips: 5 wide, 6 tall, and 3x3 minis */
  const PIP = {
    heart: ['.#.#.', '#####', '#####', '#####', '.###.', '..#..'],
    diamond: ['..#..', '.###.', '#####', '#####', '.###.', '..#..'],
    spade: ['..#..', '.###.', '#####', '#####', '..#..', '.###.'],
    club: ['.###.', '.###.', '#####', '#####', '..#..', '.###.'],
  };
  const MINI = {
    heart: ['#.#', '###', '.#.'], diamond: ['.#.', '#.#', '.#.'],
    spade: ['.#.', '###', '.#.'], club: ['###', '###', '.#.'],
  };
  const PIP5 = {
    heart: ['.#.#.', '#####', '#####', '.###.', '..#..'], diamond: ['..#..', '.###.', '#####', '.###.', '..#..'],
    spade: ['..#..', '.###.', '#####', '..#..', '.###.'], club: ['.###.', '#####', '#####', '..#..', '.###.'],
  };
  const SUIT_RED = { heart: true, diamond: true, spade: false, club: false };
  /* SUITS DRAWN TRUE: u, v in [-1, 1], v up. Sampled finely on voxel faces (VX tex), so a heart has round lobes and a
     point, a spade and a club a thin stem on a flared foot, a club three round leaves, as on the character sheet. */
  const heartIn = (u, v) => { const x = u * 1.14, y = -1 + (v + 1) * 1.115; return (x * x + y * y - 1) ** 3 - x * x * y * y * y <= 0; };
  const stemIn = (u, v, top) => v >= -1 && v <= top && Math.abs(u) <= 0.07 + Math.max(0, -0.55 - v) * 0.95;
  const SUIT = {
    heart: heartIn,
    diamond: (u, v) => Math.abs(u) * 1.32 + Math.abs(v) <= 1,
    spade: (u, v) => (v > -0.56 && heartIn(u, -((v + 0.56) / 1.56 * 2 - 1))) || stemIn(u, v, -0.3),
    club: (u, v) => { const o = (cx, cy) => (u - cx) ** 2 + (v - cy) ** 2 <= 0.37 * 0.37; return o(0, 0.52) || o(-0.43, -0.04) || o(0.43, -0.04) || (Math.abs(u) < 0.2 && v > -0.3 && v < 0.52) || stemIn(u, v, -0.25); },
  };
  const GLYPH = { A: ['.#.', '#.#', '###', '#.#', '#.#'], K: ['#.#', '##.', '#..', '##.', '#.#'], Q: ['.#.', '#.#', '#.#', '.#.', '..#'], J: ['..#', '..#', '..#', '#.#', '.#.'] };
  /* A playing card's face, w x h in voxel units. Returns (cu, cv) -> colour (cu from its left edge, cv from its bottom),
     or -1 outside its rounded corners. A big suit in the middle; in the top-left corner the rank over a little suit
     (just the little suit on small cards), and the same upside down in the bottom-right. */
  function cardFace(w, h, suit, rank, o) {
    o = o || {};
    const ink = SUIT_RED[suit] ? C.RED : C.BLACK, paper = C.WHT, edge = C.WHT_D;
    const r = o.round === false ? 0 : Math.min(w, h) * 0.17, ew = o.edgeW || 0.16;
    const bw = w * (o.big || 0.62), bh = h * (o.bigH || 0.5), cy0 = h / 2 + (o.lift || 0);
    const letters = o.index !== false && o.index !== 'pip', pips = o.index !== false;
    const m = Math.max(0.22, w * 0.07), gw = Math.max(0.6, w * 0.12), gh = gw * 1.6, ps = gw * 1.05;
    return (cu, cv) => {
      const dx = Math.max(r - cu, cu - (w - r), 0), dy = Math.max(r - cv, cv - (h - r), 0);
      const dd = Math.sqrt(dx * dx + dy * dy);
      if (r && dd > r) return -1;
      if (Math.min(cu, cv, w - cu, h - cv) < ew || (r && dx > 0 && dy > 0 && dd > r - ew)) return edge;
      if (SUIT[suit]((cu - w / 2) / (bw / 2), (cv - cy0) / (bh / 2))) return ink;
      if (pips) for (const flip of [1, -1]) {
        const lx = flip > 0 ? cu - m : (w - m) - cu, ly = flip > 0 ? (h - m) - cv : cv - m;   // from the corner, inward
        let top = 0;
        if (letters) {
          if (lx >= 0 && lx < gw && ly >= 0 && ly < gh) {
            const G = GLYPH[rank] || GLYPH.A, row = G[Math.min(4, Math.floor(ly / gh * 5))];
            return row[Math.min(2, Math.floor(lx / gw * 3))] === '#' ? ink : paper;
          }
          top = gh + gw * 0.2;
        }
        const sy = ly - top;
        if (lx >= 0 && lx < ps && sy >= 0 && sy < ps && SUIT[suit]((lx - ps / 2) / (ps / 2), (ps / 2 - sy) / (ps / 2))) return ink;
      }
      return paper;
    };
  }
  /* fine paint for cards in a grid: each card is a box of voxels, a face painter, and how a point maps to (cu, cv) */
  function cardTex(cards, rest) {
    const inBox = (k, x, y, z, e) => x >= k.x0 - e && x <= k.x1 + e && y >= k.y0 - e && y <= k.y1 + e && z >= k.z0 - e && z <= k.z1 + e;
    return {
      test: (x, y, z, v) => { for (const k of cards) if (inBox(k, x, y, z, 0)) return k.n || 4; return rest ? rest.test(x, y, z, v) : 0; },
      color: (px, py, pz, v) => {
        for (const k of cards) if (inBox(k, px, py, pz, 0.51)) { const [cu, cv] = k.uv(px, py, pz), c = k.face(cu, cv); return c < 0 ? (k.out != null ? k.out : C.WHT_D) : c; }
        return rest ? rest.color(px, py, pz, v) : v;
      },
    };
  }
  const pipAt = (bm, col, row) => row >= 0 && row < bm.length && col >= 0 && col < bm[row].length && bm[row][col] === '#';

  const H = VX.hash3;
  const TAU = Math.PI * 2;

  /* ---------------------------------------------------------- dimensions -- */
  const S = 0.024;
  const J = {
    ankle: 7.5, knee: 20.5, hip: 34.5, legX: 3,
    pelvis: 37.5, waist: 42.5, chest: 47.5, neck: 54.5, head: 56.5, hat: 70,
    shoulder: 53.5, elbow: 44.5, wrist: 36.5, armX: 8,
    skirtTop: 44.5, skirtHinge: 6,
  };
  /* the skirt's outer radius, row by row (a poofy bell: waist 44 to hem 30) */
  const SK = { 44: 7.0, 43: 8.8, 42: 10.2, 41: 11.3, 40: 12.1, 39: 12.7, 38: 13.1, 37: 13.4, 36: 13.6, 35: 14.1, 34: 14.5, 33: 14.8, 32: 15.1, 31: 15.3, 30: 15.6 };
  const PANELS = 12, PW = TAU / PANELS;
  const panelOf = th => Math.floor((((th + PW / 2) % TAU) + TAU) % TAU / PW) % PANELS;

  /* ------------------------------------------------------------- helpers -- */
  const curl = (x, y, z) => {           // curly-hair banding: light tops of each curl, dark undersides
    const k = (y + Math.floor(H(x >> 1, 0, z >> 1) * 4)) & 3;
    const n = H(x, y, z);
    if (k === 0) return n < 0.75 ? C.HAIR_L : C.HAIR;
    if (k === 3) return n < 0.6 ? C.HAIR_D : C.HAIR;
    return n < 0.08 ? C.HAIR_D : C.HAIR;
  };
  function ringRow(g, cx, cz, r0, r1, y, col) {
    for (let x = Math.floor(cx - r1 - 1); x <= Math.ceil(cx + r1 + 1); x++)
      for (let z = Math.floor(cz - r1 - 1); z <= Math.ceil(cz + r1 + 1); z++) {
        const d = Math.hypot(x - cx, z - cz);
        if (d <= r1 + 0.3 && d >= r0 - 0.3) { const v = typeof col === 'function' ? col(x, y, z, d) : col; if (v != null && v >= 0) g.set(x, y, z, v); }
      }
  }
  function rows(g, cx, cz, y0, y1, rFn, col) {
    for (let y = y0; y <= y1; y++) g.disc(cx, cz, rFn(y), y, y, (x, yy, z) => typeof col === 'function' ? col(x, yy, z) : col);
  }
  /* a little bow on a plane: centre (cx,cy,cz), loops spread along axis 'x' or 'z', faces out along the other */
  function bow(g, cx, cy, cz, span, h, along, out, cols) {
    const [B, BD, BL] = cols || [C.BLUE, C.BLUE_D, C.BLUE_L];
    for (let i = -span; i <= span; i++) {
      const a = Math.abs(i); if (a === 0) continue;
      const half = Math.min(h, Math.round(0.6 + a * 0.55));
      for (let j = -half; j <= half; j++) {
        const col = a === span || Math.abs(j) === half ? BD : (a === 1 ? BD : (j === half - 1 && a > 1 ? BL : B));
        if (along === 'x') g.set(cx + i, cy + j, cz, col); else g.set(cx, cy + j, cz + i, col);
      }
    }
    // the knot sits proud of the loops
    if (along === 'x') { g.set(cx, cy, cz, BD); g.set(cx, cy, cz + out, B); g.set(cx, cy - 1, cz, BD); g.set(cx, cy + 1, cz, BD); }
    else { g.set(cx, cy, cz, BD); g.set(cx + out, cy, cz, B); g.set(cx, cy - 1, cz, BD); g.set(cx, cy + 1, cz, BD); }
  }

  /* The head is one flat-fronted block: the face sits on a single plane, chin to brow.
     opts.blockFace = false brings back the first version, whose jaw stepped back twice below the eyes. */
  function build(opts) {
    opts = opts || {};
    const BLOCK = opts.blockFace !== false;
    const M = new VX.Model(S);
    const meta = { S, J, C, panels: [], chains: [], dangles: [], sockets: {} };

    /* ============================================================ PELVIS == */
    const hips = M.part('hips', null, [0, J.pelvis, 0]);
    // bloomers
    hips.ell(0, 37.5, 0, 5.5, 5, 4, (x, y, z) => y < 32 ? -1 : (y < 34 ? C.WHT_D : C.WHT));
    // the petticoat under the panels (shows in the gaps when the skirt flares)
    for (let y = 31; y <= 43; y++) {
      const R = SK[y] - 2.2;
      ringRow(hips, 0, 0, R - 0.8, R, y, (x, yy, z) => {
        const th = Math.atan2(x, z);
        if (yy === 31) return Math.cos(th * 30) > 0 ? C.PINKL : -1;
        return yy < 34 ? ((Math.cos(th * 30) > 0.3) ? C.PINKL : C.WHT) : C.WHT_D;
      });
    }

    /* ============================================================= SKIRT == */
    // twelve panels hinged at the waist. Tiers, top to bottom:
    //   44-42 pleated blue, 41-36 the card band (a card per panel), 35-34 blue ruffle,
    //   33-32 white ruffle with pink edge, 31-30 navy ruffle with lilac scallops.
    const SUITS = ['heart', 'spade', 'diamond', 'club'];
    const skirtG = [];
    for (let i = 0; i < PANELS; i++) {
      const th = i * PW;
      const g = M.part('skirt' + i, 'hips', [Math.sin(th) * J.skirtHinge, J.skirtTop, Math.cos(th) * J.skirtHinge], { yaw: th });
      skirtG.push(g);
      meta.panels.push({ name: 'skirt' + i, th });
    }
    const skirtColour = (x, y, z, d, R, scal) => {
      const th = Math.atan2(x, z), i = panelOf(th), thc = i * PW;
      let dth = th - thc; if (dth > Math.PI) dth -= TAU; if (dth < -Math.PI) dth += TAU;
      const u = dth * d;                                   // arc offset from the panel's middle, in voxels
      if (y >= 42) {                                       // pleats
        if (y === 44) return C.NAVY_D;
        const k = Math.floor((th + Math.PI) * d / 2) % 3;
        return k === 0 ? C.PERI_D : (k === 1 ? C.PERI : (y === 43 ? C.ICE : C.PERI));
      }
      if (y >= 36) {                                       // the card band
        const suit = SUITS[i % 4], row = 41 - y, col = Math.round(u) + 2;
        if (Math.abs(u) > 2.9) return y === 36 ? C.NAVY : C.ICE_D;     // card edges
        if (y === 36) return Math.abs(u) > 2.4 ? C.NAVY : C.WHT;
        if (pipAt(PIP[suit], col, row)) return SUIT_RED[suit] ? C.RED : C.BLACK;
        return C.WHT;
      }
      if (y >= 34) return y === 34 ? (scal ? C.BLUE_D : -1) : (Math.cos(th * 36) > 0.2 ? C.BLUE_L : C.BLUE);
      if (y >= 32) return y === 32 ? (scal ? C.PINKL : -1) : C.WHT;
      return y === 30 ? (scal ? C.LILAC : -1) : C.NAVY;
    };
    for (let y = 30; y <= 44; y++) {
      const R = SK[y];
      for (let x = -17; x <= 17; x++) for (let z = -17; z <= 17; z++) {
        const d = Math.hypot(x, z), th = Math.atan2(x, z);
        const scal = Math.cos(th * 36) > -0.25;              // scallops on the ruffles' lower rows
        const bump = (y === 35 || y === 33 || y === 31) ? 0.6 : 0;   // each ruffle's frill stands proud
        const Ro = R + bump + (scal && (y === 34 || y === 32 || y === 30) ? 0.4 : 0);
        if (d > Ro + 0.45 || d < Ro - 1.9) continue;
        const c = skirtColour(x, y, z, d, R, scal);
        if (c == null || c < 0) continue;
        skirtG[panelOf(th)].set(x, y, z, c);
      }
    }
    // the card band, painted finely: one card per panel, big suit in the middle, little suits in the corners
    const BAND_W = 6.6, bandFace = SUITS.map(su => cardFace(BAND_W, 6, su, 'A', { index: 'pip', big: 0.64, bigH: 0.56 }));
    const bandTex = {
      test: (x, y, z) => { const d = Math.hypot(x, z); return (y >= 36 && y <= 41 && d > SK[y] - 1.0 && d < SK[y] + 0.8) ? 3 : 0; },   // (not the ribbons laid over it)
      color: (px, py, pz, v) => {
        const th = Math.atan2(px, pz), i = panelOf(th);
        let dth = th - i * PW; if (dth > Math.PI) dth -= TAU; if (dth < -Math.PI) dth += TAU;
        const cv = py - 35.5, c = bandFace[i % 4]((dth / PW + 0.5) * BAND_W, cv);
        return c >= 0 ? c : (cv < 3 ? C.NAVY : C.PERI_D);          // between the cards' round corners
      },
    };
    for (const g of skirtG) g.tex = bandTex;
    // the navy bow at the front of the waist with a red gem, its two ribbons falling over the pleats and the cards
    for (let i = -4; i <= 4; i++) {
      const a = Math.abs(i); if (!a) continue;
      const half = a >= 3 ? 2 : 1;
      for (let j = -half; j <= half; j++) {
        const y = 43 + j, z = Math.round((SK[y] || 7) + 0.9);
        skirtG[0].set(i, y, z, a === 4 || Math.abs(j) === half ? C.NAVY_D : (j > 0 ? C.NAVY_L : C.NAVY));
      }
    }
    skirtG[0].set(0, 43, Math.round(SK[43] + 1.9), VX.glow(C.RED)); skirtG[0].set(0, 42, Math.round(SK[42] + 0.9), C.NAVY_D); skirtG[0].set(0, 44, Math.round(SK[44] + 0.9), C.NAVY_D);
    for (const sd of [1, -1]) for (let y = 36; y <= 41; y++) {
      const x0 = sd * (1 + Math.floor((41 - y) / 3)), w = y === 36 ? 0 : 1;
      for (let k = 0; k <= w; k++) { const x = x0 + sd * k, R = SK[y] + 1.2; skirtG[0].set(x, y, Math.round(Math.sqrt(Math.max(0, R * R - x * x))), k === w && w ? C.NAVY_L : C.NAVY); }
    }

    /* cards hanging from the hem at her left and right */
    for (const [side, pi] of [[1, 3], [-1, 9]]) {
      const name = side > 0 ? 'cardL' : 'cardR', x0 = side * 16;
      const g = M.part(name, 'skirt' + pi, [x0, 33.5, 0], { yaw: pi * PW });
      g.set(x0, 33, 0, C.GOLD);
      g.box(x0, 26, -2, x0, 32, 2, C.WHT);
      const face = cardFace(5, 7, side > 0 ? 'heart' : 'club', side > 0 ? 'A' : 'K', { index: 'pip' });
      g.tex = cardTex([{ x0, x1: x0, y0: 26, y1: 32, z0: -2, z1: 2, n: 4, face, uv: (px, py, pz) => [side > 0 ? 2.5 - pz : pz + 2.5, py - 25.5] }]);
      meta.dangles.push({ name, kind: 'card' });
    }

    /* ============================================================ BACK BOW == */
    const bowG = M.part('bow', 'hips', [0, 43, -10]);
    const outside = (x, y) => { const R = (SK[y] || 7) + 0.8; return Math.abs(x) >= R ? 0 : -Math.sqrt(R * R - x * x); };
    for (const s of [1, -1]) {
      for (let a = 1; a <= 9; a++) {
        const half = Math.min(4, Math.round(1 + a * 0.38));
        for (let j = -half; j <= half; j++) {
          const x = s * a, y = 44 + j + (a > 6 ? 1 : 0);
          const z0 = Math.min(-9.6, outside(x, y));
          const edge = a === 9 || Math.abs(j) === half, fold = a === 3 || a === 6;
          const c = edge ? C.BLUE_D : fold ? C.BLUE_D : (j > 0 ? C.BLUE_L : C.BLUE);
          bowG.set(x, y, Math.round(z0), c); bowG.set(x, y, Math.round(z0) - 1, edge ? C.BLUE_D : C.BLUE);
        }
      }
    }
    bowG.box(-1, 43, -12, 1, 45, -10, C.BLUE_D); bowG.box(0, 44, -13, 0, 44, -13, C.BLUE); bowG.set(0, 44, -13, C.BLUE_L);
    // the tails: down the back of the skirt, then past the hem, each ending in a card
    for (const s of [1, -1]) {
      const n = s > 0 ? 'L' : 'R';
      const t1 = M.part('tail' + n + '1', 'bow', [s * 1.5, 42.5, -11]);
      const t2 = M.part('tail' + n + '2', 'tail' + n + '1', [s * 6.5, 31.5, -15.6]);
      for (let y = 32; y <= 42; y++) {
        const R = (SK[y] || 7) + 1.1, xc = s * (1.5 + (42 - y) * 0.5);
        for (let k = -1; k <= 1; k++) {
          const x = Math.round(xc) + k, z = Math.round(-Math.sqrt(Math.max(0, R * R - x * x)));
          t1.set(x, y, z, k === s ? C.BLUE_D : C.BLUE); t1.set(x, y, z - 1, C.BLUE_D);
        }
      }
      for (let y = 28; y <= 31; y++) for (let k = -1; k <= 1; k++) t2.set(s * 7 + k, y, -16, k === s ? C.BLUE_D : C.BLUE);
      const cx = s * 7;
      t2.box(cx - 2, 21, -16, cx + 2, 27, -16, C.WHT);
      const face = cardFace(5, 7, s > 0 ? 'diamond' : 'heart', s > 0 ? 'Q' : 'A', { index: 'pip' });
      t2.tex = cardTex([{ x0: cx - 2, x1: cx + 2, y0: 21, y1: 27, z0: -16, z1: -16, n: 4, face, uv: (px, py) => [cx + 2.5 - px, py - 20.5] }]);
      meta.chains.push({ names: ['tail' + n + '1', 'tail' + n + '2'], kind: 'tail' });
    }

    /* =========================================================== CORSET == */
    const spine = M.part('spine', 'hips', [0, J.waist, 0]);
    const torsoRow = (g, y, rx, rz, col, zf) => {
      for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) for (let z = -Math.ceil(rz) - 1; z <= Math.ceil(zf || rz); z++) {
        const zr = z > 0 ? (zf || rz) : rz;
        if ((x / (rx + 0.45)) ** 2 + (z / (zr + 0.45)) ** 2 > 1) continue;
        g.set(x, y, z, col(x, y, z));
      }
    };
    const corset = (x, y, z) => {
      if (z >= 3 && x === 0 && (y & 1) === 0) return C.PINK;           // the button row
      if (z >= 2 && Math.abs(x) === 2) return C.BLACK_L;               // seams
      if (Math.abs(x) >= 4 && z > -2) return C.BLUE_D;                 // blue side panels
      return C.BLACK;
    };
    for (let y = 43; y <= 47; y++) torsoRow(spine, y, y < 46 ? 4.4 : 5.0, 3.3, corset);

    /* ============================================================ BODICE == */
    const chest = M.part('chest', 'spine', [0, J.chest, 0]);
    const bodice = (x, y, z) => {
      const front = z >= 2;
      if (y === 48) return front && x === 0 ? C.PINK : (Math.abs(x) <= 4 && z >= 3 ? C.BLUE_L : C.BLACK);   // corset top, trimmed
      if (front && Math.abs(x) <= 2) return C.WHT;                     // blouse
      if (front && Math.abs(x) === 3) return C.BLUE_L;
      return (Math.abs(x) + y) % 5 === 0 ? C.NAVY_L : C.NAVY;
    };
    torsoRow(chest, 48, 5.2, 3.4, bodice, 3.6);
    torsoRow(chest, 49, 5.4, 3.4, bodice, 4.3);
    torsoRow(chest, 50, 5.6, 3.4, bodice, 4.4);
    torsoRow(chest, 51, 5.8, 3.4, bodice, 3.9);
    torsoRow(chest, 52, 6.1, 3.3, bodice, 3.5);
    torsoRow(chest, 53, 6.2, 3.1, bodice, 3.2);
    torsoRow(chest, 54, 4.6, 2.6, (x, y, z) => C.WHT, 2.6);           // collar
    ringRow(chest, 0, 0, 2.2, 3.4, 54, (x, y, z) => (x + z) & 1 ? C.WHT : C.ICE);
    // the jabot: tiers of frills down the front of the blouse
    for (let y = 49; y <= 53; y++) {
      const w = y >= 52 ? 2 : 1, z = y <= 50 ? 5 : 4;
      for (let x = -w; x <= w; x++) chest.set(x, y, z, (y & 1) ? C.WHT : C.PINKL);
    }
    // the black bow tie with its blue gem
    for (const s of [1, -1]) {
      for (let a = 1; a <= 4; a++) {
        const half = a >= 3 ? 1 : (a === 1 ? 0 : 1);
        for (let j = -half; j <= half; j++) chest.set(s * a, 54 + j, 4, a === 4 || Math.abs(j) === 1 && a === 3 ? C.BLACK_L : C.BLACK);
      }
      chest.set(s * 4, 52, 4, C.BLACK); chest.set(s * 3, 51, 4, C.BLACK);    // the tie's tails
    }
    chest.box(0, 53, 4, 0, 55, 4, C.BLACK);
    chest.set(0, 54, 5, VX.glow(C.GEM));

    /* ============================================================== NECK == */
    const neck = M.part('neck', 'chest', [0, J.neck, 0]);
    neck.box(-1, 55, -1, 1, 56, 1, C.SKIN); neck.box(-1, 55, -2, 1, 56, -2, C.SKIN2);

    /* ============================================================== HEAD == */
    const head = M.part('head', 'neck', [0, J.head, 0], { defaultVariant: 'smug' });
    const SKULL = BLOCK ? { 56: [1, -1, 5], 57: [3, -2, 5], 58: [4, -3, 5], 59: [5, -4, 5], 60: [6, -5, 5], 61: [6, -5, 5], 62: [6, -5, 5], 63: [6, -5, 5], 64: [6, -5, 5], 65: [6, -5, 5], 66: [6, -5, 5], 67: [6, -5, 5], 68: [6, -5, 5], 69: [6, -5, 5] }
                        : { 57: [2, -1, 3], 58: [4, -3, 4], 59: [5, -4, 5], 60: [6, -5, 5], 61: [6, -5, 5], 62: [6, -5, 5], 63: [6, -5, 5], 64: [6, -5, 5], 65: [6, -5, 5], 66: [6, -5, 5], 67: [6, -5, 5], 68: [6, -5, 4], 69: [5, -4, 3] };
    const MOUTH_Z = BLOCK ? 5 : 4;   // the mouth row sits on the face plane, or a step back on the jaw
    const JAW = { 56: 1, 57: 3, 58: 4 };   // the block face's half-width on its bottom rows: a V-shaped chin
    const inPlate = (x, y, z) => (y >= 59 && y <= 65 && z === 5 && Math.abs(x) <= 5) || (y === 58 && z === MOUTH_Z && Math.abs(x) <= 4) || (BLOCK && (y === 57 || y === 56) && z === 5 && Math.abs(x) <= JAW[y]);
    const inSkull = (x, y, z) => {
      const S2 = SKULL[y]; if (!S2) return false;
      const [w, z0, z1] = S2;
      if (Math.abs(x) > w || z < z0 || z > z1) return false;
      if (Math.abs(x) === w && (z === z0 || z === z1) && w >= 5) return false;   // round the corners
      return true;
    };
    for (let y = BLOCK ? 56 : 57; y <= 69; y++) for (let x = -6; x <= 6; x++) for (let z = -5; z <= 5; z++) {
      if (!inSkull(x, y, z) || inPlate(x, y, z)) continue;
      head.set(x, y, z, z === 5 || (!BLOCK && y <= 58) ? C.SKIN : C.SKIN2);
    }
    head.set(7, 61, 0, C.SKIN2); head.set(-7, 61, 0, C.SKIN2);   // ears (mostly under hair)

    /* the faces: each draws the whole plate (skin + features) */
    const FACE = {}, MOUTHS = new Set([C.MOUTH, C.MOUTH_D, C.TONGUE, C.TEETH]);
    const eyeOpen = (put, s) => {            // s = +1 her left eye (x 1..4), -1 her right; 4 rows of iris under the lash
      const X = i => s * (2 + i);            // i 0 inner .. 2 outer
      for (let i = -1; i <= 3; i++) put(s * (2 + i), 64, C.LASH);
      put(X(3), 63, C.LASH);
      put(X(0), 63, C.EYE_D); put(X(1), 63, C.EYE_D); put(X(2), 63, C.EYE_D);
      put(X(0), 62, C.EYE_D); put(X(1), 62, C.EYE_D); put(X(2), 62, C.EYE_D);
      put(s > 0 ? X(0) : X(2), 63, C.WHITE); put(s > 0 ? X(0) : X(2), 62, C.WHITE);
      put(X(0), 61, C.EYE); put(X(1), 61, C.EYE_D); put(X(2), 61, C.EYE);
      put(X(0), 60, C.EYE_L); put(X(1), 60, C.EYE_L); put(X(2), 60, C.EYE);
      put(s < 0 ? X(0) : X(2), 60, C.WHITE);
    };
    const eyeHalf = (put, s) => {            // half-lidded: the lash drops a row
      const X = i => s * (2 + i);
      for (let i = -1; i <= 3; i++) put(s * (2 + i), 63, C.LASH);
      put(X(0), 62, C.EYE_D); put(X(1), 62, C.EYE_D); put(X(2), 62, C.EYE_D);
      put(s > 0 ? X(0) : X(2), 62, C.WHITE);
      put(X(0), 61, C.EYE); put(X(1), 61, C.EYE_D); put(X(2), 61, C.EYE);
      put(X(0), 60, C.EYE_L); put(X(1), 60, C.EYE_L); put(X(2), 60, C.EYE);
      put(s < 0 ? X(0) : X(2), 60, C.WHITE);
    };
    const eyeClosedArc = (put, s) => { put(s * 1, 61, C.LASH); put(s * 2, 62, C.LASH); put(s * 3, 63, C.LASH); put(s * 4, 62, C.LASH); put(s * 5, 61, C.LASH); };
    const eyeShut = (put, s) => { put(s * 1, 62, C.LASH); put(s * 2, 61, C.LASH); put(s * 3, 61, C.LASH); put(s * 4, 61, C.LASH); put(s * 5, 62, C.LASH); };
    const eyeCross = (put, s) => {           // an annoyed eye: the lid slants down toward the nose
      put(s * 1, 62, C.LASH); put(s * 2, 63, C.LASH); put(s * 3, 63, C.LASH); put(s * 4, 64, C.LASH); put(s * 5, 64, C.LASH);
      put(s * 2, 62, C.EYE_D); put(s * 3, 62, C.EYE_D); put(s * 4, 63, C.EYE_D); put(s * 4, 62, C.EYE_D);
      put(s * 2, 61, C.EYE); put(s * 3, 61, C.EYE_D); put(s * 4, 61, C.EYE);
      put(s * 2, 60, C.EYE_L); put(s * 3, 60, C.EYE_L); put(s * 4, 60, C.EYE);
    };
    const blush = put => { for (const s of [1, -1]) { put(s * 4, 59, C.BLUSH); put(s * 5, 59, C.BLUSH); put(s * 5, 60, C.BLUSH); } };
    const faceDefs = {
      smug: put => { eyeHalf(put, 1); eyeHalf(put, -1); blush(put); put(-1, 58, C.MOUTH); put(0, 58, C.MOUTH); put(1, 59, C.MOUTH); },   // a centred smirk, one corner up
      smile: put => { eyeOpen(put, 1); eyeOpen(put, -1); blush(put); put(-1, 58, C.MOUTH); put(0, 58, C.MOUTH); put(1, 58, C.MOUTH); },
      happy: put => { eyeClosedArc(put, 1); eyeClosedArc(put, -1); blush(put); put(-2, 59, C.MOUTH_D); put(-1, 59, C.MOUTH_D); put(0, 59, C.MOUTH_D); put(1, 59, C.MOUTH_D); put(2, 59, C.MOUTH_D); put(-1, 58, C.MOUTH_D); put(0, 58, C.TONGUE); put(1, 58, C.MOUTH_D); },
      pout: put => { eyeCross(put, 1); eyeCross(put, -1); for (const s of [1, -1]) { put(s * 3, 59, C.BLUSH); put(s * 4, 59, C.BLUSH); put(s * 5, 59, C.BLUSH); } put(-1, 58, C.MOUTH); put(0, 58, C.MOUTH_D); put(1, 58, C.MOUTH); },
      surprised: put => {
        eyeOpen(put, 1); eyeOpen(put, -1);
        if (BLOCK) {   // as on the sheet's "!?" face: a small open mouth, upper teeth over a dark inside (drawn a row high; mouths drop a row)
          put(-2, 59, C.MOUTH); put(-1, 59, C.TEETH); put(0, 59, C.TEETH); put(1, 59, C.TEETH); put(2, 59, C.MOUTH);
          put(-1, 58, C.MOUTH_D); put(0, 58, C.TONGUE); put(1, 58, C.MOUTH_D);
        } else { put(0, 58, C.MOUTH_D); put(0, 59, C.MOUTH_D); put(-1, 58, C.MOUTH); put(1, 58, C.MOUTH); }
      },
      wink: put => { eyeOpen(put, 1); eyeClosedArc(put, -1); blush(put); put(-2, 59, C.MOUTH); put(-1, 58, C.MOUTH); put(0, 58, C.MOUTH_D); put(1, 58, C.TONGUE); put(2, 59, C.MOUTH); },
      blink: put => { eyeShut(put, 1); eyeShut(put, -1); blush(put); put(-1, 58, C.MOUTH); put(0, 58, C.MOUTH); put(1, 59, C.MOUTH); },
    };
    for (const name in faceDefs) {
      const v = M.variant('head', name);
      for (let x = -5; x <= 5; x++) for (let y = 56; y <= 65; y++) { const z = y === 58 ? MOUTH_Z : 5; if (inPlate(x, y, z)) v.set(x, y, z, C.SKIN); }
      // on the block face every mouth sits a row lower than it's drawn, leaving a clear row under the eyes and a chin below
      faceDefs[name]((x, y, c) => { if (BLOCK && MOUTHS.has(c)) y -= 1; const z = y === 58 ? MOUTH_Z : 5; if (inPlate(x, y, z)) v.set(x, y, z, c); });
      FACE[name] = v;
    }
    meta.faces = Object.keys(faceDefs);

    /* ============================================================== HAIR == */
    // the cap: a shell around the skull, open over the face
    head.ell(0, 64.5, -0.6, 7.6, 6.9, 7.3, (x, y, z) => {
      if (inSkull(x, y, z)) return -1;
      if (z >= 3 && y < 65 && Math.abs(x) <= 5) return -1;
      if (z >= 4 && y < 66 && Math.abs(x) <= 6) return -1;
      if (y >= 69) return (y === 70 || y === 69) && H(x, y, z) < 0.6 ? C.HAIR_L : C.HAIR;   // the shine ring under the hat
      return curl(x, y, z);
    });
    // puffy sides over the ears
    for (const s of [1, -1]) head.ell(s * 7.6, 61.5, -0.8, 2.3, 4.6, 3.6, (x, y, z) => inSkull(x, y, z) ? -1 : curl(x, y, z));
    // the bangs: a fringe at z 6 with jagged strands
    const BANG = { '-7': BLOCK ? 58 : 57, '-6': BLOCK ? 59 : 58, '-5': 62, '-4': 65, '-3': 66, '-2': 64, '-1': 65, '0': 66, '1': 65, '2': 64, '3': 66, '4': 65, '5': 62, '6': BLOCK ? 59 : 58, '7': BLOCK ? 58 : 57 };
    for (let x = -7; x <= 7; x++) {
      const bottom = BANG[x];
      for (let y = bottom; y <= 69; y++) {
        const z = Math.abs(x) >= 6 ? 5 : 6;
        const strand = (x & 1) === 0 && y < 68 && Math.abs(x) < 6 ? C.HAIR_D : C.HAIR;   // strand lines
        head.set(x, y, z, y === bottom ? C.HAIR_D : (y >= 68 && H(x, y, 9) < 0.5 ? C.HAIR_L : (y === bottom + 1 ? C.HAIR : strand === C.HAIR_D && H(x, y, 3) < 0.5 ? C.HAIR_D : C.HAIR)));
        if (y >= 67 && Math.abs(x) <= 5 && !(y === 67 && (x & 1))) head.set(x, y, 7, y === 69 ? C.HAIR_L : C.HAIR);
      }
    }

    /* the front ringlets (two segments each, framing the face down to the chest) */
    for (const s of [1, -1]) {
      const n = s > 0 ? 'L' : 'R';
      const a = M.part('lock' + n + '1', 'head', [s * 7, 62.5, 3.5]);
      const b = M.part('lock' + n + '2', 'lock' + n + '1', [s * 7.2, 53.5, 3.8]);
      for (let y = 54; y <= 63; y++) {
        const cx = s * (7 + 0.7 * Math.sin((63 - y) * 0.9)), r = 1.6;
        a.disc(cx, 3.6, r, y, y, (x, yy, z) => curl(x, yy, z));
      }
      for (let y = 44; y <= 53; y++) {
        const cx = s * (7.2 + 0.9 * Math.sin((63 - y) * 0.9)), r = y <= 46 ? 2.1 : 1.7;
        b.disc(cx, 3.9, r, y, y, (x, yy, z) => curl(x, yy, z));
      }
      b.set(s * 7, 43, 4, C.HAIR_D);
      meta.chains.push({ names: ['lock' + n + '1', 'lock' + n + '2'], kind: 'hair', front: true });
    }

    /* the back: five big curly locks, two segments each, to the waist */
    const BACK = [{ x: -8, bot: 42 }, { x: -4, bot: 44 }, { x: 0, bot: 45 }, { x: 4, bot: 44 }, { x: 8, bot: 42 }];
    BACK.forEach((L, i) => {
      const a = M.part('back' + i + 'a', 'head', [L.x, 63.5, -6]);
      const xb = L.x * 1.12;
      const b = M.part('back' + i + 'b', 'back' + i + 'a', [xb, 53.5, -7.2]);
      for (let y = 54; y <= 64; y++) {
        const t = (64 - y) / 10, cx = L.x + (xb - L.x) * t, rx = 3.1 + (Math.abs(L.x) > 6 ? 0.4 : 0), rz = 2.3;
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) for (let z = -10; z <= -4; z++) {
          if (((x - cx) / (rx + 0.4)) ** 2 + ((z + 7) / (rz + 0.4)) ** 2 > 1) continue;
          if (inSkull(x, y, z)) continue;
          a.set(x, y, z, curl(x, y, z));
        }
      }
      for (let y = L.bot; y <= 53; y++) {
        const t = (53 - y) / (53 - L.bot);
        const wob = Math.sin(y * 0.8 + i * 1.7) * 0.9;
        const cx = xb + wob + Math.sign(L.x) * t * 1.2, rx = (3.2 + (Math.abs(L.x) > 6 ? 0.3 : 0)) * (1 - t * 0.35), rz = 2.2 * (1 - t * 0.25);
        const cz = -7.4 - t * 0.6;
        for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) for (let z = -11; z <= -4; z++) {
          if (((x - cx) / (rx + 0.4)) ** 2 + ((z - cz) / (rz + 0.4)) ** 2 > 1) continue;
          if (y === L.bot && H(x, y, z) < 0.45) continue;           // ragged curl tips
          b.set(x, y, z, curl(x, y, z));
        }
      }
      meta.chains.push({ names: ['back' + i + 'a', 'back' + i + 'b'], kind: 'hair' });
    });

    /* =============================================================== HAT == */
    const hat = M.part('hat', 'head', [0, J.hat, 0]);
    hat.disc(0, 0, 9.2, 70, 70, (x, y, z) => Math.hypot(x, z) > 8.4 ? C.BLACK_L : C.BLACK);
    ringRow(hat, 0, 0, 8.2, 9.2, 71, C.BLACK_L);
    hat.disc(0, 0, 6, 71, 78, (x, y, z) => (x === -3 && z > 2) || (x === -4 && z > 1 && y > 74) ? C.BLACK_L : C.BLACK);
    hat.disc(0, 0, 6.5, 79, 80, (x, y, z) => y === 80 && Math.hypot(x, z) > 5.6 ? C.BLACK_L : C.BLACK);
    ringRow(hat, 0, 0, 5.6, 6.5, 72, C.BLUE); ringRow(hat, 0, 0, 5.6, 6.5, 73, (x, y, z) => (x + z) & 1 ? C.BLUE : C.BLUE_L);
    // the big side bow (her left), loops fore and aft along the crown
    for (const s of [1, -1]) for (let a = 1; a <= 5; a++) {
      const half = Math.min(3, Math.round(0.6 + a * 0.6));
      for (let j = -half; j <= half; j++) {
        const z = 0.5 + s * a, y = 74 + j + (a >= 4 ? 1 : 0);
        const c = a === 5 || Math.abs(j) === half ? C.BLUE_D : (j > 0 ? C.BLUE_L : C.BLUE);
        hat.set(7, y, Math.round(z), c); hat.set(6, y, Math.round(z), c === C.BLUE_L ? C.BLUE : C.BLUE_D);
        if (a <= 3) hat.set(8, y, Math.round(z), a === 3 || Math.abs(j) === half ? C.BLUE_D : C.BLUE);
      }
    }
    hat.box(7, 73, 0, 9, 75, 1, C.BLUE_D); hat.set(9, 74, 1, C.BLUE_L);
    hat.box(8, 70, 2, 8, 72, 2, C.BLUE); hat.box(8, 69, -1, 8, 72, -1, C.BLUE); hat.set(8, 69, 2, C.BLUE_D);
    // a white frill rosette in the bow
    hat.set(8, 77, -2, C.WHT); hat.set(8, 77, -3, C.WHT); hat.set(8, 78, -2, C.PINKL); hat.set(7, 78, -3, C.WHT);
    // the heart card tucked in the band, front and to her right
    hat.box(-4, 72, 7, 0, 78, 7, C.WHT);
    // a spade card tucked in on her right side
    hat.box(-7, 72, -2, -7, 77, 1, C.WHT);
    hat.tex = cardTex([
      { x0: -4, x1: 0, y0: 72, y1: 78, z0: 7, z1: 7, n: 5, face: cardFace(5, 7, 'heart', 'A', { big: 0.7, bigH: 0.5 }), uv: (px, py) => [px + 4.5, py - 71.5] },
      { x0: -7, x1: -7, y0: 72, y1: 77, z0: -2, z1: 1, n: 4, face: cardFace(4, 6, 'spade', 'A', { index: 'pip' }), uv: (px, py, pz) => [pz + 2.5, py - 71.5] },
    ]);
    // the little dangling card charm (its own joint)
    const charm = M.part('hatCharm', 'hat', [8.6, 70, 4]);
    charm.box(9, 68, 4, 9, 69, 4, C.GOLD);
    charm.box(9, 63, 3, 9, 67, 5, C.WHT);
    charm.tex = cardTex([{ x0: 9, x1: 9, y0: 63, y1: 67, z0: 3, z1: 5, n: 4, face: cardFace(3, 5, 'diamond', 'A', { index: false, big: 0.7, bigH: 0.55 }), uv: (px, py, pz) => [5.5 - pz, py - 62.5] }]);
    meta.dangles.push({ name: 'hatCharm', kind: 'card' });

    /* ============================================================== ARMS == */
    const HANDS = {};
    for (const s of [1, -1]) {
      const n = s > 0 ? 'L' : 'R', ax = s * J.armX;
      const ua = M.part('uArm' + n, 'chest', [ax, J.shoulder, 0]);
      // the puff sleeve, pleated navy with blue lights
      ua.ell(ax + s * 0.4, 50.5, 0, 3.3, 3.6, 3.3, (x, y, z) => {
        const k = Math.floor((Math.atan2(z, x - ax) + Math.PI) / TAU * 12);
        if (y >= 53 && (k & 1)) return C.BLUE_L;
        return k & 1 ? C.NAVY_L : C.NAVY;
      });
      ringRow(ua, ax, 0, 2.0, 3.5, 47, (x, y, z) => C.WHT);
      ringRow(ua, ax, 0, 2.0, 3.6, 46, (x, y, z) => { const t = Math.atan2(z, x - ax); return Math.cos(t * 8) > 0 ? C.PINKL : C.WHT_D; });
      ua.box(ax - 1, 45, -1, ax + 1, 47, 1, C.SKIN);
      ua.set(ax + s * 3, 49, 2, C.BLUE); ua.set(ax + s * 3, 50, 2, C.BLUE_L);    // a blue ribbon on the puff
      // forearm and the frilled wrist cuff with a blue band
      const fa = M.part('fArm' + n, 'uArm' + n, [ax, J.elbow, 0]);
      fa.box(ax - 1, 40, -1, ax + 1, 44, 1, C.SKIN);
      fa.set(ax, 44, -1, C.SKIN2);
      ringRow(fa, ax, 0, 0, 2.1, 39, C.BLUE);
      ringRow(fa, ax, 0, 0, 2.6, 38, C.WHT);
      ringRow(fa, ax, 0, 0, 2.8, 37, (x, y, z) => { const t = Math.atan2(z, x - ax); return Math.cos(t * 8) > 0 ? C.WHT : C.ICE; });
      // hands (white gloves), one shape per variant
      const hd = M.part('hand' + n, 'fArm' + n, [ax, J.wrist, 0], { defaultVariant: 'relax' });
      const glove = (g, x, y, z) => g.set(x, y, z, C.WHT);
      const fist = g => { g.box(ax - 1, 33, -1, ax + 1, 36, 1, C.WHT); for (let y = 33; y <= 35; y++) g.set(ax - s, y, 1, (y & 1) ? C.WHT_D : C.WHT); g.set(ax, 35, 2, C.WHT); g.set(ax, 34, 2, C.WHT_D); };
      const shapes = {
        relax: g => { g.box(ax - 1, 34, -1, ax + 1, 36, 1, C.WHT); g.box(ax - (s > 0 ? 1 : 0), 32, -1, ax + (s > 0 ? 0 : 1), 33, 1, C.WHT); g.set(ax, 32, 1, C.WHT_D); g.set(ax, 34, 2, C.WHT); g.set(ax, 33, 2, C.WHT_D); },
        grip: g => fist(g),
        point: g => { fist(g); for (let y = 29; y <= 32; y++) glove(g, ax, y, 1); g.set(ax, 29, 1, C.WHT_D); },
        peace: g => { fist(g); for (let y = 29; y <= 32; y++) { glove(g, ax, y, y <= 30 ? 2 : 1); glove(g, ax, y, y <= 30 ? -2 : -1); } },
        open: g => { g.box(ax - 1, 33, -1, ax + 1, 36, 1, C.WHT); for (const z of [-1, 0, 1]) for (let y = 29; y <= 32; y++) if (!(z === 0 && y === 29)) g.set(ax, y, z, z === 0 ? C.WHT_D : C.WHT); g.box(ax, 33, 2, ax, 35, 2, C.WHT); },
      };
      for (const k in shapes) shapes[k](M.variant('hand' + n, k));
      meta.sockets['grip' + n] = { part: 'hand' + n, at: [0, -2, 0] };
      HANDS[n] = shapes;
    }
    meta.hands = ['relax', 'grip', 'point', 'peace', 'open'];

    /* ============================================================== LEGS == */
    for (const s of [1, -1]) {
      const n = s > 0 ? 'L' : 'R', cx = s * J.legX;
      const th = M.part('thigh' + n, 'hips', [cx, J.hip, 0]);
      const sh = M.part('shin' + n, 'thigh' + n, [cx, J.knee, 0]);
      const ft = M.part('foot' + n, 'shin' + n, [cx, J.ankle, 0]);
      // her right leg: a dark argyle stocking to the thigh; her left: a white stocking with little suit prints
      const argyle = (x, y, z) => {
        const a = Math.atan2(x - cx, z), u = Math.round((a + Math.PI) / TAU * 16);
        const p = Math.floor((u + y) / 3) + Math.floor((u - y + 300) / 3);
        return p & 1 ? C.ARGY_L : C.ARGY_D;
      };
      const printed = (x, y, z) => {            // a white stocking with a lilac harlequin lattice
        const a = Math.atan2(x - cx, z), u = Math.round((a + Math.PI) / TAU * 16);
        return ((u + y) % 5 === 0 || (u - y + 500) % 5 === 0) ? C.LILAC : C.WHT;
      };
      const stock = s < 0 ? argyle : printed;
      // thigh
      for (let y = 21; y <= 34; y++) {
        const r = y >= 32 ? 3.0 : y >= 29 ? 2.6 : 2.1;
        th.disc(cx, 0, r, y, y, (x, yy, z) => {
          if (yy <= 25) return stock(x, yy, z);
          if (yy <= 27) return s < 0 ? (yy === 27 && ((x + z) & 1) ? C.BLUE_L : C.BLUE) : (yy === 27 ? C.PINKL : C.WHT);
          return C.SKIN;
        });
      }
      ringRow(th, cx, 0, 2.4, 3.7, 32, (x, y, z) => C.WHT);
      ringRow(th, cx, 0, 2.4, 3.9, 31, (x, y, z) => { const t = Math.atan2(z, x - cx); return Math.cos(t * 7) > 0 ? C.PINKL : -1; });
      bow(th, cx + s * 3, 27, 0, 2, 1, 'z', s, null);           // garter bow, outer side

      // shin: the sock frill, the ankle, the calf, and the big blue ankle bow
      for (let y = 8; y <= 20; y++) {
        const r = y <= 9 ? 2.8 : y <= 12 ? 1.4 : 2.05;
        sh.disc(cx, 0, r, y, y, (x, yy, z) => {
          if (yy <= 9) return yy === 8 ? ((x + z) & 1 ? C.WHT : C.ICE) : C.WHT;
          return stock(x, yy, z);
        });
      }

      for (let i = -4; i <= 4; i++) {           // the ankle bow, facing forward
        const a = Math.abs(i); if (a === 0) continue;
        const half = a >= 3 ? 2 : 1;
        for (let j = -half; j <= half; j++) {
          const c = a === 4 || Math.abs(j) === half ? C.BLUE_D : (j > 0 ? C.BLUE_L : C.BLUE);
          sh.set(cx + i, 12 + j, 2, c); if (a <= 3) sh.set(cx + i, 12 + j, 3, c === C.BLUE_L ? C.BLUE : C.BLUE_D);
        }
      }
      sh.box(cx, 11, 3, cx, 13, 4, C.BLUE_D); sh.set(cx, 12, 4, C.BLUE_L);
      sh.set(cx - 1, 9, 3, C.BLUE); sh.set(cx - 2, 8, 3, C.BLUE_D); sh.set(cx + 1, 9, 3, C.BLUE); sh.set(cx + 2, 8, 3, C.BLUE_D);
      // foot: chunky black platform Mary Janes
      for (let y = 0; y <= 7; y++) for (let x = cx - 3; x <= cx + 3; x++) for (let z = -3; z <= 6; z++) {
        const ex = Math.abs(x - cx), corner = (ex === 3 && (z === -3 || z === 6));
        if (y <= 3) {
          if (corner) continue;
          if (y <= 1 && z > 5) continue;
          const c = y === 0 ? C.BLACK : y === 1 ? (ex === 3 || z === -3 || z === 5 ? C.GREY : C.BLACK) : C.BLACK;
          ft.set(x, y, z, c);
        } else if (y <= 5) {
          if (ex > 2 || z > 5 || (z === 5 && ex === 2)) continue;
          if (y === 5 && z >= 0 && z <= 1 && ex <= 1) { ft.set(x, y, z, C.WHT); continue; }
          ft.set(x, y, z, z >= 2 && y === 5 ? C.BLACK_L : C.BLACK);
        } else if (y === 6) {
          if (ex > 2 || z > 2 || z < -3) continue;
          ft.set(x, y, z, z === 2 || z === 1 ? (ex === 2 ? C.GOLD : C.BLACK) : (ex <= 1 && z >= -1 ? C.WHT : C.BLACK));
        } else {
          if (ex > 1 || z > 1 || z < -2) continue;
          ft.set(x, y, z, C.WHT);
        }
      }
      ringRow(ft, cx, -0.5, 1.6, 2.6, 7, (x, y, z) => (x + z) & 1 ? C.WHT : C.ICE);
    }

    /* ====================================================== metadata ==== */
    meta.legLen = { thigh: J.hip - J.knee, shin: J.knee - J.ankle, foot: J.ankle + 0.5 };
    meta.footHeel = [-3.5, -J.ankle - 0.5]; meta.footToe = [6.5, -J.ankle - 0.5];
    return { model: M, meta };
  }

  window.TRAPTRICK = { build, C, PIP, PIP5, MINI, SUIT, SUIT_RED, cardFace, cardTex, S, J };
})();
