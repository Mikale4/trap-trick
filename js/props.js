/* ============================================================================
   props.js -- Trap Trick's signature accessory, the playing-card umbrella,
   a jointed voxel object of its own (same 2.4 cm voxels as she is), and the
   little cards of her magic puffs.

   The umbrella is built around its GRIP: its origin is the point her fist
   closes on, and its +Y runs up the shaft toward the canopy. The animation
   parents it to a hand and turns it.

   UMBRELLA  root (grip) -> canopy (spins for a twirl) -> 8 panels
             each panel: a hinge at the top of the shaft (frame, turned to its
             own heading) and a fold joint (rotation x + squeeze x): open, the
             panels make the dome; closed, they fold down along the shaft.
             canopy -> bow (the big four-loop bow on top; it folds away when closed)
   ========================================================================== */
(function () {
  'use strict';
  const T = window.TRAPTRICK, C = T.C, S = T.S, H = VX.hash3, TAU = Math.PI * 2;
  const PURPLE = 0x4a3a8f, PURPLE_L = 0x7a65c8;

  const mesh = (g, mat, gmat) => VX.meshPair(VX.meshGrid(g, S, {}), mat, { glowMat: gmat });

  /* --------------------------------------------------------- umbrella -- */
  const CAN_R = 17, HUB_Y = 32, SPAN = TAU / 8;
  const drop = r => -(0.03 * r * r + 0.16 * r);
  function panelGrid(kind) {
    // kind 0..3: navy+club, blue+heart, navy+spade, blue+diamond
    const g = new VX.Grid(); g.jit = 0.04;
    const dark = (kind & 1) === 0, suit = ['club', 'heart', 'spade', 'diamond'][kind];
    // deep navy and indigo panels, as on the sheet
    const base = dark ? C.NAVY : 0x2b2670, base2 = dark ? 0x262b74 : 0x352f80, rib = dark ? C.NAVY_D : 0x1a1650;
    // the card on each panel, painted finely: its top toward the rim
    const face = T.cardFace(7, 7, suit, ['A', 'K', 'Q', 'J'][kind], { index: 'pip', big: 0.62, bigH: 0.56 });
    g.tex = {
      test: (x, y, r) => (r >= 7 && r <= 13 && Math.abs(x) <= 3) ? 3 : 0,
      color: (px, py, pz) => { const c = face(px + 3.5, pz - 6.5); return c < 0 ? base : c; },
    };
    let prev = {};
    for (let r = 1; r <= CAN_R; r++) {
      const w = r * Math.tan(SPAN / 2) + 0.35, y = Math.round(drop(r));
      for (let x = -Math.floor(w); x <= Math.floor(w); x++) {
        let c = (Math.abs(x) >= Math.floor(w) && r > 2) ? rib : ((x + r) % 4 === 0 ? base2 : base);
        if (r <= 3) c = r === 1 ? C.BLUE_D : C.BLUE;
        else if (r === 14) c = C.LILAC;                                 // the rim: a lilac line, then a pink-and-white frill
        else if (r >= 15) c = r === 15 ? C.PINKL : ((x + r) % 3 === 0 ? C.PINKL : C.WHT);
        else if (r >= 7 && r <= 13 && Math.abs(x) <= 3) c = C.WHT;   // a card (painted finely below)
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
    canopy.add(mesh(top, mat, gmat));
    // the big four-loop bow lying on the dome, a red gem in its knot (as on the sheet's top view)
    const bw = new VX.Grid(); bw.jit = 0.05;
    const HW = [1, 2, 2, 2, 2, 1];
    for (let q = 0; q < 4; q++) {
      const a = q * Math.PI / 2 + Math.PI / 4, dx = Math.sin(a), dz = Math.cos(a), px = Math.cos(a), pz = -Math.sin(a);
      for (let t = 1; t <= 6; t++) for (let k = -HW[t - 1]; k <= HW[t - 1]; k += 0.5) {
        const x = Math.round(dx * t + px * k), z = Math.round(dz * t + pz * k), r = Math.hypot(x, z);
        const y = Math.round(drop(r)) + 1, edge = Math.abs(k) >= HW[t - 1] - 0.25 || t === 6;
        bw.set(x, y, z, edge ? C.BLUE_D : (Math.abs(k) < 0.6 ? C.BLUE_L : C.BLUE));
        if (!edge) bw.set(x, y + 1, z, Math.abs(k) < 0.6 ? C.BLUE_L : C.BLUE);   // the loops puff up
      }
    }
    bw.box(-1, 1, -1, 1, 3, 1, C.BLUE_D); bw.set(0, 4, 0, VX.glow(C.RED)); bw.set(0, 3, 1, C.BLUE); bw.set(0, 3, -1, C.BLUE); bw.set(1, 3, 0, C.BLUE); bw.set(-1, 3, 0, C.BLUE);
    const bowTop = mesh(bw, mat, gmat); canopy.add(bowTop);
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
      bowTop.scale.setScalar(0.25 + 0.75 * e);
    };
    U.setOpen(0);
    return U;
  }

  /* -------------------------------------------- a single playing card -- */
  // a small voxel card for the magic puff (when an item appears or vanishes)
  const CARD_GEO = {};
  function cardMesh(suit, mat) {
    if (!CARD_GEO[suit]) {
      const g = new VX.Grid(); g.jit = 0.02;
      g.box(-3, -4, 0, 3, 4, 0, C.WHT);
      const face = T.cardFace(7, 9, suit, 'A', {});
      g.tex = { test: () => 3, color: (px, py) => { const c = face(px + 3.5, py + 4.5); return c < 0 ? C.WHT_D : c; } };
      CARD_GEO[suit] = VX.meshGrid(g, S * 1.1, { ao: false });
    }
    const m = new THREE.Mesh(CARD_GEO[suit].lit, mat || VX.litMat());
    return m;
  }

  window.PROPS = { umbrella, cardMesh, HUB_Y, CAN_R };
})();
