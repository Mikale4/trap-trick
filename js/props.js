/* ============================================================================
   props.js -- Trap Trick's two signature accessories, each its own jointed
   voxel object (same 2.4 cm voxels as she is).

   Both are built around their GRIP: the item's origin is the point her fist
   closes on, and its +Y runs up the shaft toward the canopy / crook. The
   animation parents the item to a hand (or a carry point) and turns it.

   UMBRELLA  root (grip) -> canopy (spins for a twirl) -> 8 panels
             each panel: a hinge at the top of the shaft (frame, turned to its
             own heading) and a fold joint (rotation x + squeeze x): open, the
             panels make the dome; closed, they fold down along the shaft.
   CANE      root (grip) -> charm (a little card on a ribbon, swings)
   ========================================================================== */
(function () {
  'use strict';
  const T = window.TRAPTRICK, C = T.C, S = T.S, H = VX.hash3, TAU = Math.PI * 2;
  const MINI = T.MINI, SUIT_RED = T.SUIT_RED;
  const PURPLE = 0x4a3a8f, PURPLE_L = 0x7a65c8, PURPLE_D = 0x2c2160;

  const mesh = (g, mat, gmat) => VX.meshPair(VX.meshGrid(g, S, {}), mat, { glowMat: gmat });

  /* --------------------------------------------------------- umbrella -- */
  const CAN_R = 17, HUB_Y = 32, SPAN = TAU / 8;
  const drop = r => -(0.03 * r * r + 0.16 * r);
  function panelGrid(kind) {
    // kind 0..3: navy+club, blue+heart, navy+spade, blue+diamond
    const g = new VX.Grid(); g.jit = 0.04;
    const dark = (kind & 1) === 0, suit = ['club', 'heart', 'spade', 'diamond'][kind];
    const base = dark ? C.NAVY : 0x2f47b5, base2 = dark ? C.NAVY_L : 0x3b56c8, rib = dark ? C.NAVY_D : 0x22358f;
    const bm = T.PIP5[suit];
    let prev = {};
    for (let r = 1; r <= CAN_R; r++) {
      const w = r * Math.tan(SPAN / 2) + 0.35, y = Math.round(drop(r));
      for (let x = -Math.floor(w); x <= Math.floor(w); x++) {
        let c = (Math.abs(x) >= Math.floor(w) && r > 2) ? rib : ((x + r) % 4 === 0 ? base2 : base);
        if (r <= 3) c = r === 1 ? C.BLUE_D : C.BLUE;
        else if (r === 13) c = C.BLUE_L;
        else if (r >= 14) c = r === 14 ? C.ICE : C.WHT;
        else if (r >= 6 && r <= 12 && Math.abs(x) <= 3) {            // a little white card with its pip
          c = (r === 6 || r === 12 || Math.abs(x) === 3) ? C.WHT_D : C.WHT;
          const row = 11 - r, col = x + 2;                           // (row 0 is the pip's top, toward the rim)
          if (row >= 0 && row < 5 && col >= 0 && col < 5 && bm[4 - row][col] === '#') c = SUIT_RED[suit] ? C.RED : C.BLACK;
        }
        const y0 = prev[x] != null ? prev[x] : y;
        for (let yy = Math.min(y, y0); yy <= Math.max(y, y0); yy++) g.set(x, yy, r, c);
        prev[x] = y;
        // the frilled rim: scallops hanging under the edge
        if (r >= 16) {
          const sc = ((x + 40) % 3) !== 0;
          if (sc) { g.set(x, y - 1, r, r === CAN_R ? C.PINKL : C.WHT); if (r === CAN_R) g.set(x, y - 2, r, C.PINKL); }
        }
      }
    }
    return g;
  }
  let PANEL_GEO = null;
  function umbrella() {
    const mat = VX.litMat().clone(), gmat = VX.glowMat().clone();
    if (!PANEL_GEO) PANEL_GEO = [0, 1, 2, 3].map(k => VX.meshGrid(panelGrid(k), S, {}));
    const root = new THREE.Group(); root.name = 'umbrella';
    // shaft, crook, bow, hub, tip (one static mesh)
    const g = new VX.Grid(); g.jit = 0.04;
    for (let y = -2; y <= HUB_Y; y++) g.set(0, y, 0, (y % 5 === 0) ? PURPLE_L : PURPLE);
    // the crook: a candy-striped J below the grip, opening forward (+z), with red heart dots
    const N = 40;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      let p;
      if (t < 0.3) p = [0, -2 - t / 0.3 * 3.5, 0];
      else { const a = (t - 0.3) / 0.7 * Math.PI * 1.15; p = [0, -5.5 - Math.sin(a) * 3.2, 3.2 - Math.cos(a) * 3.2]; }
      const stripe = Math.floor(t * 9) & 1;
      g.ell(p[0], p[1], p[2], 0.75, 0.75, 0.75, (x, y, z) => g.has(x, y, z) ? -1 : (stripe ? C.PINKL : C.WHT));
    }
    for (const [y, z] of [[-4, 0], [-8, 2], [-7, 6]]) { g.set(1, y, z, C.RED); g.set(-1, y, z, C.RED); }
    // a blue bow tied on the shaft (where the closed canopy ends)
    for (let i = -3; i <= 3; i++) { const a = Math.abs(i); if (!a) continue; for (let j = -Math.min(2, a); j <= Math.min(2, a); j++) g.set(i, 13 + j, 1, a === 3 || Math.abs(j) === 2 ? C.BLUE_D : (j > 0 ? C.BLUE_L : C.BLUE)); }
    g.set(0, 13, 2, C.BLUE_D); g.box(-1, 10, 1, -1, 11, 1, C.BLUE); g.box(1, 10, 1, 1, 11, 1, C.BLUE);
    const body = mesh(g, mat, gmat);
    root.add(body);
    // the canopy: hub, top bow, ferrule, eight panels on hinges
    const canopy = new THREE.Group(); canopy.position.y = HUB_Y * S; root.add(canopy);
    const top = new VX.Grid();
    top.disc(0, 0, 1.6, 0, 1, C.BLUE_D); top.disc(0, 0, 0.8, 2, 2, C.BLUE);
    for (let y = 3; y <= 6; y++) top.set(0, y, 0, y >= 5 ? C.ICE : PURPLE_L);
    top.set(0, 7, 0, VX.glow(0xfff4ff)); top.set(0, 3, 1, VX.glow(C.RED));
    for (let i = -3; i <= 3; i++) { const a = Math.abs(i); if (!a) continue; for (let j = -Math.min(1, a - 1); j <= Math.min(1, a - 1); j++) top.set(i, 3 + j, 0, a === 3 ? C.BLUE_D : C.BLUE); }
    canopy.add(mesh(top, mat, gmat));
    const panels = [];
    for (let i = 0; i < 8; i++) {
      const frame = new THREE.Group(); frame.rotation.y = i * SPAN; canopy.add(frame);
      const fold = new THREE.Group(); frame.add(fold);
      fold.add(VX.meshPair(PANEL_GEO[i % 4], mat, { glowMat: gmat }));
      panels.push(fold);
    }
    const U = { kind: 'umbrella', root, canopy, panels, mat, gmat, open: 0, length: (HUB_Y + 8) * S };
    /* t: 0 closed .. 1 open. Closed, each panel hangs down along the shaft and is squeezed thin. */
    U.setOpen = t => {
      U.open = t;
      const e = t * t * (3 - 2 * t);
      const ang = (1 - e) * 0.98, sq = 0.13 + 0.87 * Math.pow(e, 0.7);
      for (const p of panels) { p.rotation.x = ang; p.scale.set(sq, 1, 1 - (1 - e) * 0.08); }
    };
    U.setOpen(0);
    return U;
  }

  /* ------------------------------------------------------------- cane -- */
  function cane() {
    const mat = VX.litMat().clone(), gmat = VX.glowMat().clone();
    const root = new VX.Grid(); root.jit = 0.04;
    // the shaft: dark violet, a plus-shaped section, with white diamonds and red pips spiralling down it
    for (let y = -37; y <= 1; y++) {
      const inner = y >= -3;
      root.set(0, y, 0, PURPLE_D);
      if (inner) continue;
      const k = ((y % 6) + 6) % 6;
      for (const [dx, dz, face] of [[1, 0, 0], [0, 1, 1], [-1, 0, 2], [0, -1, 3]]) {
        let c = PURPLE_D;
        if ((k === 0 || k === 1) && ((Math.floor(y / 6) + face) & 1)) c = C.WHT;
        else if (k === 3 && ((Math.floor(y / 6) + face) % 4 === 0)) c = C.RED;
        else if (k === 4) c = PURPLE;
        root.set(dx, y, dz, c);
      }
    }
    // the tip: a silver ferrule with a blue gem
    root.box(-1, -40, -1, 1, -38, 1, (x, y, z) => (Math.abs(x) + Math.abs(z) === 2) ? -1 : (y === -40 ? C.GREY : C.ICE));
    root.set(0, -39, 2, VX.glow(C.GEM)); root.set(0, -39, -2, VX.glow(C.GEM));
    // the crook: white card tiles with red and black pips, a rectangular hook opening forward
    const path = [];
    for (let y = 2; y <= 8; y++) path.push([0, y, 0]);
    for (let z = 1; z <= 7; z++) path.push([0, 8, z]);
    for (let y = 7; y >= 4; y--) path.push([0, y, 7]);
    path.forEach(([x, y, z], i) => {
      const sep = i % 3 === 2;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const vertical = i < 7 || i >= 14;
        const px = x + a, py = vertical ? y : y + b, pz = vertical ? z + b : z;
        const edge = Math.abs(a) === 1 && Math.abs(b) === 1;
        let c = sep ? C.PINKL : C.WHT;
        if (edge) c = sep ? C.PINKL : C.WHT_D;
        if (!sep && Math.abs(a) === 1 && b === 0 && i % 3 === 0) c = (i % 6 === 0) ? C.RED : C.BLACK;
        root.set(px, py, pz, c);
      }
    });
    // the blue bow under the crook with a gem
    for (let i = -4; i <= 4; i++) { const a = Math.abs(i); if (!a) continue; const h = a >= 3 ? 2 : 1; for (let j = -h; j <= h; j++) root.set(i, -1 + j, 1, a === 4 || Math.abs(j) === h ? C.BLUE_D : (j > 0 ? C.BLUE_L : C.BLUE)); }
    root.box(0, -2, 1, 0, 0, 2, C.BLUE_D); root.set(0, -1, 2, VX.glow(C.GEM));
    const group = new THREE.Group(); group.name = 'cane';
    const body = VX.meshPair(VX.meshGrid(root, S, {}), mat, { glowMat: gmat }); group.add(body);
    // the dangling card charm (its own joint)
    const ch = new VX.Grid();
    ch.box(0, -1, 0, 0, -2, 0, C.BLUE);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) ch.set(i - 1, -6 + j, 0, (i === 1 && (j === 1 || j === 2)) ? C.RED : (j === 0 || j === 3 ? C.WHT_D : C.WHT));
    ch.set(0, -3, 0, C.WHT_D);
    const charm = new THREE.Group(); charm.position.set(0, -2 * S, 2 * S);
    charm.add(VX.meshPair(VX.meshGrid(ch, S, {}), mat, { glowMat: gmat }));
    group.add(charm);
    return { kind: 'cane', root: group, charm, mat, gmat, length: 49 * S, tip: -40 };
  }

  /* -------------------------------------------- a single playing card -- */
  // a small voxel card for the magic puff (when an item appears or vanishes)
  const CARD_GEO = {};
  function cardMesh(suit, mat) {
    if (!CARD_GEO[suit]) {
      const g = new VX.Grid(); g.jit = 0.02;
      for (let i = 0; i < 7; i++) for (let j = 0; j < 9; j++) g.set(i - 3, j - 4, 0, (i === 0 || i === 6 || j === 0 || j === 8) ? C.WHT_D : C.WHT);
      const bm = T.PIP[suit];
      for (let r = 0; r < 6; r++) for (let c = 0; c < 5; c++) if (bm[r][c] === '#') g.set(c - 2, 2 - r, 0, SUIT_RED[suit] ? C.RED : C.BLACK);
      CARD_GEO[suit] = VX.meshGrid(g, S * 1.1, { ao: false });
    }
    const m = new THREE.Mesh(CARD_GEO[suit].lit, mat || VX.litMat());
    return m;
  }

  window.PROPS = { umbrella, cane, cardMesh, HUB_Y, CAN_R };
})();
