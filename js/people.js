/* ============================================================================
   people.js -- the townsfolk: jointed voxel people built from a short
   description (build, skin, hair, hat, clothes, apron, what they hold), so
   every one of them can look different. Godot animates them (town.gd).

   One layout for everyone (voxels, feet at y 0, facing +z):
     feet 0-1, shins 2-10 (knee 10.5), thighs 11-20 (hip 20.5), pelvis 19-23,
     torso 23-35 (shoulders 34.5), neck 35-36, head 37-46, hair and hats above.
   Parts: hips (root) > torso > head, uArmL/R > fArmL/R; hips > thighL/R >
   shinL/R; hips > skirt (dresses and robes). Children are the same model built
   with smaller voxels.
   ========================================================================== */
(function () {
  'use strict';
  const H = VX.hash3;
  const SKIN = [0xf3d2b8, 0xe8bf9c, 0xd4a07a, 0xb07a52, 0x8a5a3a];
  const HAIR = { black: 0x2a2228, brown: 0x5a3a26, chestnut: 0x7a4a2a, blond: 0xd9b45e, red: 0xa8482c, grey: 0x9a9aa2, white: 0xe4e2e6 };
  const shade = (c, k) => { const r = Math.min(255, ((c >> 16) & 255) * k) | 0, g = Math.min(255, ((c >> 8) & 255) * k) | 0, b = Math.min(255, (c & 255) * k) | 0; return (r << 16) | (g << 8) | b; };

  function build(L) {
    const M = new VX.Model(L.kid ? 0.025 : (L.big ? 0.037 : 0.034));
    const skin = SKIN[L.skin || 0], hair = HAIR[L.hair || 'brown'], shirt = L.shirt || 0x8a6a4a, legs = L.legs || 0x4a3a30;
    const boots = L.boots || 0x3a2a22, wide = L.big ? 1 : 0;
    const cloth = (c, x, y, z) => H(x, y, z) < 0.25 ? shade(c, 0.9) : c;

    /* hips (the root) and the pelvis */
    const hips = M.part('hips', null, [0, 20.5, 0]);
    hips.box(-3 - wide, 19, -2, 3 + wide, 23, 2, (x, y, z) => cloth(L.dress ? L.dress : legs, x, y, z));
    hips.box(-3 - wide, 23, -2, 3 + wide, 23, 2, L.belt || 0x3a2a22);
    /* legs */
    for (const s of [1, -1]) {
      const n = s > 0 ? 'L' : 'R', x0 = s * 2;
      const th = M.part('thigh' + n, 'hips', [x0, 20.5, 0]);
      th.box(x0 - 1, 11, -1, x0 + 1, 20, 1, (x, y, z) => cloth(legs, x, y, z));
      const sh = M.part('shin' + n, 'thigh' + n, [x0, 10.5, 0]);
      sh.box(x0 - 1, 2, -1, x0 + 1, 10, 1, (x, y, z) => y <= 4 ? boots : cloth(legs, x, y, z));
      sh.box(x0 - 1, 0, -1, x0 + 1, 1, 3, boots);                        // the foot
    }
    /* a skirt, dress or robe: a cone from the waist, the legs swing inside it */
    if (L.dress) {
      const sk = M.part('skirt', 'hips', [0, 22, 0]);
      const bottom = L.long ? 2 : 9;
      for (let y = bottom; y <= 22; y++) {
        const r = 4 + wide + (22 - y) * (L.long ? 0.16 : 0.2);
        for (let x = -Math.ceil(r); x <= r; x++) for (let z = -Math.ceil(r * 0.75); z <= r * 0.75; z++) {
          const e = (x / r) ** 2 + (z / (r * 0.75)) ** 2;
          if (e > 1.05 || e < 0.45) continue;
          sk.set(x, y, z, y === bottom ? shade(L.dress, 0.8) : cloth(L.dress, x, y, z));
        }
      }
    }
    /* the torso, with an apron, a vest or a tabard over it */
    const tor = M.part('torso', 'hips', [0, 23, 0]);
    tor.box(-4 - wide, 24, -2, 4 + wide, 34, 2, (x, y, z) => cloth(shirt, x, y, z));
    tor.box(-3 - wide, 35, -2, 3 + wide, 35, 2, (x, y, z) => cloth(shirt, x, y, z));
    if (L.vest) tor.box(-4 - wide, 24, -2, 4 + wide, 33, 2, (x, y, z) => (Math.abs(x) <= 1 && z === 2) ? shirt : cloth(L.vest, x, y, z));
    if (L.tabard) {
      tor.box(-3, 22, 3, 3, 34, 3, (x, y, z) => cloth(L.tabard, x, y, z));
      for (const [x, y] of [[0, 30], [-1, 29], [1, 29], [0, 28], [0, 31]]) tor.set(x, y, 4, 0xe8c24a);   // the town's emblem
    }
    if (L.apron) for (let y = 14; y <= 32; y++) for (let x = -3 - wide; x <= 3 + wide; x++) {
      if (y > 26 && Math.abs(x) > 2) continue;
      (y >= 23 ? tor : hips).set(x, y, 3, y === 26 ? shade(L.apron, 0.85) : L.apron);   // (its lower half hangs from the hips)
    }
    if (L.cloak) for (let y = 12; y <= 35; y++) for (let x = -5 - wide; x <= 5 + wide; x++) tor.set(x, y, -3, cloth(L.cloak, x, y, -3));
    if (L.lute) {                                                      // a lute slung in front
      tor.ell(-1.5, 27, 4.5, 3, 3.2, 1.2, (x, y, z) => z >= 5 && Math.hypot(x + 1.5, y - 27) < 1.2 ? 0x2a1a12 : 0xb07a3a);
      tor.line(0, 29, 5, 4, 35, 5, 0x6b4426);
      tor.set(4, 36, 5, 0x3a2a22);
    }
    if (L.book) { tor.box(-2, 28, 5, 2, 28, 7, 0xf1e6cc); tor.box(-2, 27, 5, 2, 27, 7, 0x6a2a3a); }   // an open book held in front
    if (L.tray) { tor.box(-4, 28, 4, 4, 28, 9, 0x8a5a32); for (const [x, z] of [[-2, 6], [1, 5], [2, 8], [-1, 8]]) tor.box(x, 29, z, x + 1, 29, z, 0xc98a42); }
    if (L.sack) tor.ell(-3.5, 37, -1, 3, 2.5, 2.5, 0xc2a878);         // a sack over the right shoulder
    /* the head */
    const hd = M.part('head', 'torso', [0, 36, 0]);
    hd.box(-1, 35, -1, 1, 36, 1, skin);
    hd.box(-4, 37, -4, 4, 46, 4, (x, y, z) => skin);
    for (const s of [1, -1]) {                                          // eyes, brows, a nose, a mouth
      hd.set(s * 2, 41, 4, 0x2a2030); hd.set(s * 2, 42, 4, L.eye || 0x3a4a7a);
      hd.set(s * 2, 43, 4, L.bald ? shade(skin, 0.8) : hair); hd.set(s * 3, 43, 4, L.bald ? shade(skin, 0.8) : hair);
    }
    hd.set(0, 40, 5, shade(skin, 0.92));
    hd.box(-1, 38, 4, 1, 38, 4, L.kid || L.lips ? 0xc8606a : shade(skin, 0.75));
    if (L.blush) { hd.set(3, 40, 4, 0xeea0a0); hd.set(-3, 40, 4, 0xeea0a0); }
    // hair
    const hc = (x, y, z) => H(x, y, z) < 0.3 ? shade(hair, 0.85) : hair;
    if (!L.bald) {
      hd.box(-5, 44, -5, 5, 47, 5, hc);                                 // the cap of hair
      hd.box(-5, 40, -5, 5, 43, -4, hc);                                // the back
      hd.box(-5, 41, -4, -5, 43, 2, hc); hd.box(5, 41, -4, 5, 43, 2, hc);
      hd.box(-4, 44, 5, 4, 45, 5, hc);                                  // a fringe
      if (L.style === 'long') { hd.box(-5, 33, -5, 5, 40, -4, hc); hd.box(-5, 35, -4, -5, 41, 2, hc); hd.box(5, 35, -4, 5, 41, 2, hc); }
      if (L.style === 'bun') hd.ell(0, 46, -5, 2.5, 2.5, 2, hc);
      if (L.style === 'braid') for (let y = 28; y <= 40; y++) hd.set((y & 1) ? 1 : 0, y, -6, hc(0, y, -6));
    } else hd.box(-5, 41, -4, 5, 42, -2, (x, y, z) => Math.abs(x) >= 4 || z === -4 ? hc(x, y, z) : -1);   // a fringe round the back
    if (L.beard) { hd.box(-4, 37, 2, 4, 39, 5, (x, y, z) => (z === 5 && y === 39 && Math.abs(x) < 2) ? -1 : hc(x, y, z)); hd.box(-2, 39, 5, 2, 39, 5, hc); }
    // hats
    const hat = L.hat, hcol = L.hatColor || 0x6a4a2a;
    if (hat === 'kerchief') { hd.box(-5, 44, -5, 5, 48, 5, (x, y, z) => y === 48 && (Math.abs(x) === 5 || Math.abs(z) === 5) ? -1 : hcol); hd.box(-1, 41, -6, 1, 44, -6, hcol); }
    if (hat === 'cap') { hd.box(-5, 46, -5, 5, 48, 5, hcol); hd.box(-4, 46, 6, 4, 46, 8, shade(hcol, 0.8)); }
    if (hat === 'straw') { hd.disc(0, 0, 8.5, 46, 46, (x, y, z) => Math.hypot(x, z) > 7.6 ? 0xc89a4a : 0xdcb466); hd.disc(0, 0, 5, 47, 49, 0xdcb466); hd.disc(0, 0, 5.2, 47, 47, 0xa83a3a); }
    if (hat === 'helmet') { hd.ell(0, 45, 0, 5.6, 4.2, 5.6, (x, y, z) => y < 44 ? -1 : (H(x, y, z) < 0.3 ? 0x9aa0ac : 0xb8bec8)); hd.box(-6, 44, -6, 6, 44, 6, 0x8a909c); hd.box(0, 40, 5, 0, 44, 5, 0x9aa0ac); }
    if (hat === 'feather') { hd.box(-5, 46, -5, 5, 48, 5, hcol); hd.box(-6, 46, -6, 6, 46, 6, hcol); hd.line(3, 48, -2, 7, 53, -4, L.feather || 0xe8e0d0); }
    if (hat === 'witch') {                                              // a wide brim and a tall crown that bends over
      hd.disc(0, 0, 9, 46, 46, hcol);
      for (let y = 47; y <= 56; y++) { const r = 5.2 * (1 - (y - 47) / 11), ox = Math.max(0, y - 52) * 0.7; hd.disc(-ox, 0, r, y, y, (x, yy, z) => yy === 47 ? (L.band || 0xc8a24a) : hcol); }
    }
    if (hat === 'hood') { hd.box(-5, 37, -5, 5, 48, -3, hcol); hd.box(-5, 44, -5, 5, 48, 5, (x, y, z) => z > 3 && y < 47 ? -1 : hcol); hd.box(-6, 37, -4, -6, 46, 3, hcol); hd.box(6, 37, -4, 6, 46, 3, hcol); }
    if (L.flower) { hd.set(4, 45, 3, 0xff7aa8); hd.set(5, 45, 3, 0xffd04a); }
    /* arms: an upper arm and a forearm with the hand, and what the hand holds */
    for (const s of [1, -1]) {
      const n = s > 0 ? 'L' : 'R', ax = s * (6 + wide);
      const ua = M.part('uArm' + n, 'torso', [ax, 34.5, 0]);
      ua.box(ax - 1, 28, -1, ax + 1, 34, 1, (x, y, z) => cloth(L.sleeve || shirt, x, y, z));
      const fa = M.part('fArm' + n, 'uArm' + n, [ax, 27.5, 0]);
      fa.box(ax - 1, 23, -1, ax + 1, 27, 1, (x, y, z) => L.rolled ? skin : cloth(L.sleeve || shirt, x, y, z));
      fa.box(ax - 1, 20, -1, ax + 1, 22, 1, skin);                    // the hand
      const tool = s > 0 ? L.left : L.right;
      if (tool === 'hammer') { fa.box(ax, 21, 1, ax, 21, 7, 0x6b4426); fa.box(ax - 1, 20, 7, ax + 1, 23, 8, 0x5a5e68); }
      if (tool === 'axe') { fa.box(ax, 21, 1, ax, 21, 10, 0x6b4426); fa.box(ax, 21, 9, ax, 25, 11, 0x9aa0ac); }
      if (tool === 'tongs') { fa.box(ax, 21, 1, ax, 21, 6, 0x3a3a42); fa.box(ax - 1, 21, 6, ax - 1, 21, 7, 0x3a3a42); }
      if (tool === 'broom') { fa.box(ax, 4, 1, ax, 30, 1, 0x8a5a32); fa.box(ax - 2, 0, 0, ax + 2, 4, 2, 0xc8a85a); }
      if (tool === 'spear') { fa.box(ax, 6, 1, ax, 56, 1, 0x6b4426); fa.box(ax, 57, 1, ax, 60, 1, 0xb8bec8); fa.box(ax, 57, 0, ax, 58, 2, 0xb8bec8); }
      if (tool === 'basket') { fa.box(ax - 2, 14, -1, ax + 2, 18, 3, (x, y, z) => y === 18 && Math.abs(x - ax) < 2 && z > -1 && z < 3 ? (H(x, y, z) < 0.5 ? 0xc0303a : 0xd8a040) : 0xb08850); fa.box(ax, 19, 1, ax, 20, 1, 0xb08850); }
      if (tool === 'bucket') { fa.box(ax - 2, 12, -2, ax + 2, 17, 2, (x, y, z) => y === 17 && Math.abs(x - ax) < 2 && Math.abs(z) < 2 ? 0x5a8fd0 : (y === 13 || y === 16 ? 0x5a5e68 : 0x8a5a32)); fa.box(ax, 18, 0, ax, 19, 0, 0x5a5e68); }
    }
    return M;
  }

  window.PEOPLE = { build };
})();
