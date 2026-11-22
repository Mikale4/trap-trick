/* ============================================================================
   world.js -- the open space: a wide garden around a cobbled plaza with a
   chequered Looking-Glass mosaic, lamp posts, flower beds, rose hedges,
   crates to sit on, giant playing cards, a house-of-cards arch, blossom and
   oak trees, a castle on the northern horizon, hills and drifting clouds.

   Scenery is voxels too, only bigger ones (a tree's voxel is 20 cm, the
   castle's a metre), meshed once per kind and placed many times.
   Collision is a set of circles; sit spots are listed in `seats`.
   ========================================================================== */
(function () {
  'use strict';
  const H = VX.hash3, TAU = Math.PI * 2;
  const rnd = (() => { let s = 1234567; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

  const PAL = {
    G1: 0x6cbf47, G2: 0x5eae3d, G3: 0x7fcc55, G4: 0x4f9a36,
    LEAF: 0x4fa83d, LEAF2: 0x3e8f32, LEAF3: 0x6cc24c, BARK: 0x7a5232, BARK2: 0x5e3f26,
    BLOS: 0xf4a8cf, BLOS2: 0xe88bbd, BLOS3: 0xffd2e8,
    IRON: 0x2c2a36, IRON2: 0x45425a, LAMP: 0xffd98a,
    WOOD: 0xb07a45, WOOD2: 0x8a5a32, WOOD3: 0x6b4426,
    STONE: 0xd6cfdc, STONE2: 0xbfb6cb, STONE3: 0xa69cb5, ROOF: 0x2f3f9e, ROOF2: 0x3b56c8, GOLD: 0xebc55c,
    RED: 0xdc2741, WHITE: 0xf7f4fd, NAVY: 0x1e2260,
  };

  /* ------------------------------------------------------------ ground -- */
  function groundTexture() {
    const N = 1024, W = 200, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(N, N), d = img.data;
    const put = (i, c) => { d[i] = (c >> 16) & 255; d[i + 1] = (c >> 8) & 255; d[i + 2] = c & 255; d[i + 3] = 255; };
    const shade = (c, k) => { const r = Math.min(255, ((c >> 16) & 255) * k), g = Math.min(255, ((c >> 8) & 255) * k), b = Math.min(255, (c & 255) * k); return (r << 16) | (g << 8) | b; };
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
      const x = (px / N - 0.5) * W, z = (py / N - 0.5) * W, i = (py * N + px) * 4;
      const r = Math.hypot(x, z);
      const n = H(px, py, 7), n2 = H(px >> 3, py >> 3, 3), n3 = H(px >> 5, py >> 5, 11);
      const onPath = (Math.abs(x) < 2.2 && (z < -14 || z > 14) && Math.abs(z) < 96) || (Math.abs(z) < 2.2 && Math.abs(x) > 14 && Math.abs(x) < 70);
      if (r < 5.2) {                                   // the chequered mosaic with a heart in the middle
        const hx = x / 2.1, hz = -z / 2.1 + 0.25;
        const heart = Math.pow(hx * hx + hz * hz - 1, 3) - hx * hx * hz * hz * hz < 0;
        let c = ((Math.floor(x + 100) + Math.floor(z + 100)) & 1) ? 0x2b2833 : 0xf1edf4;
        if (heart) c = 0xd92b45;
        if (r > 4.9) c = 0xebc55c;
        put(i, shade(c, 0.94 + n * 0.08));
      } else if (r < 16 || onPath) {                   // cobbles: stones with mortar lines
        const sx = Math.floor((x + 100) / 0.6 + (Math.floor((z + 100) / 0.45) & 1) * 0.5), sz = Math.floor((z + 100) / 0.45);
        const fx = ((x + 100) / 0.6 + (Math.floor((z + 100) / 0.45) & 1) * 0.5) % 1, fz = ((z + 100) / 0.45) % 1;
        const mortar = fx < 0.1 || fz < 0.12;
        const tone = H(sx, sz, 5);
        let c = tone < 0.33 ? 0xd8cfc0 : tone < 0.66 ? 0xc9bfb0 : 0xbdb3a6;
        if (r > 15.4 && r < 16) c = 0xa79d93;
        put(i, mortar ? 0x9c9288 : shade(c, 0.95 + n * 0.08));
      } else {                                          // grass with patches and tiny flowers
        let c = n2 < 0.3 ? PAL.G2 : n2 < 0.75 ? PAL.G1 : PAL.G3;
        if (n3 < 0.2) c = PAL.G4;
        if (n < 0.006) c = 0xffffff; else if (n < 0.01) c = 0xffe066; else if (n < 0.013) c = 0xf6a2cf;
        put(i, shade(c, 0.93 + n * 0.12));
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearMipMapLinearFilter; tex.anisotropy = 4;
    return tex;
  }

  /* ------------------------------------------------------------- props -- */
  function treeGrid(kind) {
    const g = new VX.Grid(); g.jit = 0.08;
    const blos = kind === 'blossom';
    const h = blos ? 11 : 13;
    for (let y = 0; y <= h; y++) g.box(0, y, 0, 1, y, 1, (x, yy, z) => H(x, yy, z) < 0.3 ? PAL.BARK2 : PAL.BARK);
    g.box(-1, 0, 0, 2, 1, 1, PAL.BARK2); g.box(0, 0, -1, 1, 1, 2, PAL.BARK2);
    g.line(1, h - 3, 1, 4, h + 1, 3, PAL.BARK); g.line(0, h - 2, 0, -3, h + 2, -2, PAL.BARK);
    const leaf = (x, y, z) => {
      const n = H(x, y, z);
      if (blos) return n < 0.12 ? PAL.BLOS3 : (y > h + 5 ? (n < 0.5 ? PAL.BLOS3 : PAL.BLOS) : (n < 0.55 ? PAL.BLOS : PAL.BLOS2));
      return y > h + 6 ? (n < 0.5 ? PAL.LEAF3 : PAL.LEAF) : (n < 0.6 ? PAL.LEAF : PAL.LEAF2);
    };
    const blobs = blos ? [[0, h + 3, 0, 6, 4, 6], [4, h + 2, 2, 4, 3, 4], [-4, h + 3, -2, 4, 3, 4], [1, h + 6, -1, 4, 3, 4]]
                       : [[0, h + 4, 0, 6, 5, 6], [4, h + 2, 3, 4, 4, 4], [-4, h + 3, -3, 4, 4, 4], [-3, h + 2, 4, 4, 3, 3], [2, h + 8, 0, 4, 3, 4]];
    for (const b of blobs) g.ell(b[0], b[1], b[2], b[3], b[4], b[5], (x, y, z) => H(x * 3, y, z * 7) < 0.07 ? -1 : leaf(x, y, z));
    return g;
  }
  function lampGrid() {
    const g = new VX.Grid(); g.jit = 0.03;
    g.box(-2, 0, -2, 2, 1, 2, PAL.IRON); g.box(-1, 2, -1, 1, 3, 1, PAL.IRON2);
    for (let y = 4; y <= 34; y++) g.box(0, y, 0, 0, y, 0, (y % 8 === 0) ? PAL.IRON2 : PAL.IRON);
    g.box(-1, 34, -1, 1, 34, 1, PAL.IRON);
    g.box(-2, 35, -2, 2, 35, 2, PAL.IRON);
    g.box(-2, 36, -2, 2, 40, 2, (x, y, z) => (Math.abs(x) === 2 && Math.abs(z) === 2) ? PAL.IRON : VX.glow(PAL.LAMP));
    g.box(-1, 37, -1, 1, 39, 1, VX.glow(0xfff2c4));
    g.box(-3, 41, -3, 3, 41, 3, PAL.IRON); g.box(-2, 42, -2, 2, 42, 2, PAL.IRON); g.box(-1, 43, -1, 1, 43, 1, PAL.IRON);
    // a spade finial
    g.set(0, 44, 0, PAL.GOLD); g.box(-1, 45, 0, 1, 46, 0, PAL.GOLD); g.set(0, 47, 0, PAL.GOLD);
    return g;
  }
  function crateGrid() {
    const g = new VX.Grid(); g.jit = 0.06;
    for (let x = 0; x < 10; x++) for (let y = 0; y < 10; y++) for (let z = 0; z < 10; z++) {
      const ex = x === 0 || x === 9, ey = y === 0 || y === 9, ez = z === 0 || z === 9;
      if (!(ex || ey || ez)) continue;
      const frame = (ex + ey + ez) >= 2;
      const plank = ey ? (x % 3 === 2) : (y % 3 === 2);
      g.set(x - 4.5, y, z - 4.5, frame ? PAL.WOOD3 : (plank ? PAL.WOOD2 : (H(x, y, z) < 0.5 ? PAL.WOOD : 0xb98451)));
    }
    // a diagonal brace on the sides
    for (let i = 1; i < 9; i++) for (const z of [-4.5, 4.5]) g.set(i - 4.5, i, z, PAL.WOOD3);
    return g;
  }
  function hedgeGrid() {
    const g = new VX.Grid(); g.jit = 0.1;
    g.box(-4, 0, -2, 4, 4, 2, (x, y, z) => {
      if (y === 4 && (Math.abs(x) === 4 || Math.abs(z) === 2)) return -1;
      const n = H(x, y, z);
      if ((Math.abs(z) === 2 || y === 4) && n < 0.12) return PAL.RED;
      if ((Math.abs(z) === 2 || y === 4) && n < 0.18) return PAL.WHITE;
      return n < 0.5 ? PAL.LEAF2 : 0x357a2b;
    });
    return g;
  }
  function flowerBedGrid(len) {
    const g = new VX.Grid(); g.jit = 0.06;
    g.box(0, 0, 0, len - 1, 1, 7, (x, y, z) => (x === 0 || z === 0 || x === len - 1 || z === 7) ? 0xa79d93 : 0x6b4a33);
    for (let x = 1; x < len - 1; x++) for (let z = 1; z < 7; z++) {
      const n = H(x, 3, z);
      if (n < 0.55) { g.set(x, 2, z, 0x3e8f32); if (n < 0.3) g.set(x, 3, z, n < 0.1 ? PAL.RED : n < 0.17 ? PAL.WHITE : n < 0.24 ? 0x6f8df2 : 0xf6a2cf); }
    }
    return g;
  }
  /* a giant playing card: its face painted finely with the same true suits as her outfit, a lattice back */
  function bigCardGrid(suit, rank) {
    const g = new VX.Grid(); g.jit = 0.02;
    const W = 15, Hh = 21;
    for (let x = 0; x < W; x++) for (let y = 0; y < Hh; y++) {
      const corner = (x === 0 || x === W - 1) && (y === 0 || y === Hh - 1);
      if (corner) continue;
      const edge = x === 0 || x === W - 1 || y === 0 || y === Hh - 1;
      g.set(x - 7, y, 0, PAL.WHITE);
      // the back: navy with a white lattice
      const lat = ((x + y) % 4 === 0 || (x - y + 40) % 4 === 0);
      g.set(x - 7, y, -1, edge || x === 1 || y === 1 || x === W - 2 || y === Hh - 2 ? PAL.WHITE : (lat ? 0x3a5fe0 : PAL.NAVY));
    }
    const face = window.TRAPTRICK.cardFace(W, Hh, suit, rank, { big: 0.6, bigH: 0.44 });
    g.tex = { test: (x, y, z) => z === 0 ? 3 : 0, color: (px, py, pz) => pz < 0.4 ? -1 : (c => c < 0 ? 0xd8d2ea : c)(face(px + 7.5, py + 0.5)) };
    return g;
  }
  function castleGrid() {
    const g = new VX.Grid(); g.jit = 0.05;
    const wall = (x, y, z) => { const n = H(x, y, z); return y % 4 === 0 ? PAL.STONE2 : (n < 0.2 ? PAL.STONE3 : n < 0.6 ? PAL.STONE : PAL.STONE2); };
    const shell = (x0, y0, z0, x1, y1, z1) => {
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
        if (x !== x0 && x !== x1 && z !== z0 && z !== z1 && y !== y1) continue;
        g.set(x, y, z, wall(x, y, z));
      }
      for (let x = x0; x <= x1; x++) for (const z of [z0, z1]) if ((x & 1) === 0) g.set(x, y1 + 1, z, wall(x, y1 + 1, z));
      for (let z = z0; z <= z1; z++) for (const x of [x0, x1]) if ((z & 1) === 0) g.set(x, y1 + 1, z, wall(x, y1 + 1, z));
    };
    const tower = (cx, cz, r, h, roofH) => {
      for (let y = 0; y <= h; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) for (let z = Math.floor(cz - r - 1); z <= cz + r + 1; z++) {
        const d = Math.hypot(x - cx, z - cz);
        if (d <= r + 0.3 && (d > r - 1.2 || y === h)) g.set(x, y, z, wall(x, y, z));
      }
      for (let y = 0; y <= roofH; y++) {
        const rr = (r + 1.2) * (1 - y / (roofH + 0.5));
        for (let x = Math.floor(cx - rr - 1); x <= cx + rr + 1; x++) for (let z = Math.floor(cz - rr - 1); z <= cz + rr + 1; z++) {
          const d = Math.hypot(x - cx, z - cz);
          if (d <= rr + 0.3 && d > rr - 1.3) g.set(x, h + 1 + y, z, (y % 3 === 0) ? PAL.ROOF2 : PAL.ROOF);
        }
      }
      g.set(cx, h + roofH + 2, cz, PAL.GOLD); g.set(cx, h + roofH + 3, cz, PAL.GOLD);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) g.set(cx + 1 + i, h + roofH + 3 - j, cz, PAL.RED);
      // windows
      for (let y = 6; y < h - 2; y += 6) for (const [dx, dz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const wx = Math.round(cx + dx * r), wz = Math.round(cz + dz * r);
        g.set(wx, y, wz, VX.glow(0xffe3a0)); g.set(wx, y + 1, wz, VX.glow(0xffe3a0)); g.set(wx, y + 2, wz, 0x3a3550);
      }
    };
    shell(-14, 0, -9, 14, 14, 9);                     // the keep
    shell(-26, 0, 6, 26, 8, 8);                        // the front curtain wall
    for (let y = 0; y <= 7; y++) for (let x = -3; x <= 3; x++) if (Math.hypot(x, y - 3) < 3.6 || y < 3) g.cut(x, y, 6, x, y, 8); // the gate
    for (let x = -3; x <= 3; x++) for (let y = 0; y <= 6; y++) if (Math.hypot(x, y - 3) < 3.6 || y < 3) g.set(x, y, 7, (x + y) & 1 ? 0x2a2640 : 0x3a3550);
    tower(-26, 7, 3.5, 20, 8); tower(26, 7, 3.5, 20, 8);
    tower(-14, -9, 4, 26, 10); tower(14, -9, 4, 26, 10);
    tower(-14, 9, 3.2, 22, 8); tower(14, 9, 3.2, 22, 8);
    tower(0, 0, 5.5, 36, 14);
    for (let x = -12; x <= 12; x += 4) for (let y = 4; y <= 11; y += 7) { g.set(x, y, 9, VX.glow(0xffe3a0)); g.set(x, y + 1, 9, VX.glow(0xffe3a0)); }
    return g;
  }
  function hillGrid(r, h, seed) {
    const g = new VX.Grid(); g.jit = 0.05;
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
      const d = Math.hypot(x, z) / r; if (d > 1) continue;
      const top = Math.round(h * (Math.cos(d * Math.PI) * 0.5 + 0.5) * (0.85 + H(x >> 2, seed, z >> 2) * 0.3));
      for (let y = Math.max(0, top - 2); y <= top; y++) g.set(x, y, z, y === top ? (H(x, y, z) < 0.5 ? 0x7cc65a : 0x6db84d) : 0x5d9c43);
    }
    return g;
  }
  function cloudGrid(seed) {
    const g = new VX.Grid(); g.jit = 0.02;
    for (let i = 0; i < 5; i++) {
      const x = (H(i, seed, 1) - 0.5) * 12, z = (H(i, seed, 2) - 0.5) * 6, r = 3 + H(i, seed, 3) * 3;
      g.ell(x, 0, z, r, 1.5, r * 0.7, (xx, y, zz) => y < 0 ? 0xe6eefc : 0xffffff);
    }
    return g;
  }
  function tuftGrid() {
    const g = new VX.Grid(); g.jit = 0.12;
    for (const [x, z, h] of [[0, 0, 3], [1, 0, 2], [-1, 1, 2], [0, -1, 2], [1, 1, 1]]) for (let y = 0; y < h; y++) g.set(x, y, z, y === h - 1 ? 0x8fd864 : 0x5eae3d);
    return g;
  }
  function flowerGrid(col) {
    const g = new VX.Grid(); g.jit = 0.05;
    g.box(0, 0, 0, 0, 2, 0, 0x3e8f32); g.set(0, 3, 0, 0xffe066); g.set(1, 3, 0, col); g.set(-1, 3, 0, col); g.set(0, 3, 1, col); g.set(0, 3, -1, col); g.set(1, 1, 0, 0x3e8f32);
    return g;
  }

  /* ------------------------------------------------------------- world -- */
  class World {
    constructor(scene) {
      this.scene = scene; this.colliders = []; this.seats = []; this.clouds = []; this.bound = 92;
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshLambertMaterial({ map: groundTexture() }));
      ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
      const far = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshLambertMaterial({ color: 0x67b346 }));
      far.rotation.x = -Math.PI / 2; far.position.y = -0.02; scene.add(far);

      const kinds = {};
      const kind = (name, grid, s, o) => kinds[name] || (kinds[name] = VX.meshGrid(grid(), s, o || {}));
      const place = (name, x, z, ry, sc, opts) => {
        const G = kinds[name];
        const m = VX.meshPair(G, null, { cast: !(opts && opts.noCast) });
        m.position.set(x, (opts && opts.y) || 0, z); m.rotation.y = ry || 0; if (sc) m.scale.setScalar(sc);
        scene.add(m); return m;
      };
      const col = (x, z, r) => this.colliders.push({ x, z, r });

      /* lamp posts around the plaza and along the avenue */
      kind('lamp', lampGrid, 0.075);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + TAU / 16, x = Math.sin(a) * 15, z = Math.cos(a) * 15; place('lamp', x, z, 0); col(x, z, 0.2); }
      for (let z = -24; z >= -84; z -= 12) for (const x of [-3.4, 3.4]) { place('lamp', x, z, 0); col(x, z, 0.2); }

      /* flower beds in the plaza's four quarters */
      kind('bed', () => flowerBedGrid(28), 0.125);
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * TAU + TAU / 8, x = Math.sin(a) * 10.5, z = Math.cos(a) * 10.5;
        const m = place('bed', x, z, a + Math.PI / 2, 1, { noCast: true });
        m.children.forEach(c => c.position.set(-1.75, 0, -0.5));
        for (let k = -1; k <= 1; k++) col(x + Math.cos(a) * k * 1.15, z - Math.sin(a) * k * 1.15, 0.6);
      }

      /* crates to sit on (singles facing the centre) and a few stacks */
      kind('crate', crateGrid, 0.0625);
      const seatAt = (x, z, yaw) => { place('crate', x, z, yaw); col(x, z, 0.42); this.seats.push({ x, z, yaw, h: 0.625 }); };
      seatAt(6.2, 6.2 + 1.8, Math.atan2(-6.2, -8)); seatAt(-7.6, 5.0, Math.atan2(7.6, -5));
      seatAt(7.4, -5.6, Math.atan2(-7.4, 5.6)); seatAt(-6.0, -7.8, Math.atan2(6, 7.8));
      const stack = (x, z, r) => { place('crate', x, z, r); place('crate', x + 0.66, z, r + 0.1); place('crate', x + 0.3, z, r - 0.15, 1, { y: 0.625 }); col(x + 0.33, z, 0.75); };
      stack(17.5, 3.5, 0.2); stack(-19, -3, -0.3); stack(4, 19, 0.5);

      /* hedges with roses: a broken ring outside the plaza */
      kind('hedge', hedgeGrid, 0.25);
      for (let i = 0; i < 40; i++) {
        const a = i / 40 * TAU;
        const deg = (a / TAU) * 360;
        if ([0, 90, 180, 270, 360].some(d => Math.abs(deg - d) < 14)) continue;
        const x = Math.sin(a) * 22, z = Math.cos(a) * 22;
        place('hedge', x, z, a + Math.PI / 2); col(x, z, 1.0);
      }

      /* giant playing cards: lining the avenue to the castle, and leaning about the garden */
      const CARDS = [['heart', 'A'], ['spade', 'K'], ['diamond', 'Q'], ['club', 'J'], ['heart', 'K'], ['spade', 'A'], ['diamond', 'J'], ['club', 'Q']];
      CARDS.forEach(([s, r], i) => kind('card' + i, () => bigCardGrid(s, r), 0.085));
      let ci = 0;
      for (let z = -30; z >= -78; z -= 12) for (const sd of [-1, 1]) {
        const x = sd * 6.2, m = place('card' + (ci++ % 8), x, z, sd > 0 ? -Math.PI / 2 : Math.PI / 2);
        col(x, z - 0.4, 0.45); col(x, z + 0.4, 0.45);
      }
      for (const [x, z, ry, rz] of [[28, 18, 0.6, 0.12], [-30, 14, -0.9, -0.1], [33, -22, 2.2, 0], [-27, -30, 1.1, 0.08], [12, 34, 3.4, -0.15], [-14, 38, 2.6, 0.1]]) {
        const m = place('card' + (ci++ % 8), x, z, ry); m.rotation.z = rz; col(x, z, 0.7);
      }
      /* a card arch over the south path: two standing cards and one laid across them, with two leaning by */
      for (const sd of [-1, 1]) {
        const m = place('card' + (sd < 0 ? 0 : 5), sd * 1.35, 30, Math.PI / 2, 1.6);
        col(sd * 1.35, 29.4, 0.3); col(sd * 1.35, 30.6, 0.3);
        const lean = place('card' + (sd < 0 ? 2 : 3), sd * 2.35, 30, Math.PI / 2, 1.3);
        lean.rotation.order = 'ZYX'; lean.rotation.z = -sd * 0.32; col(sd * 2.6, 30, 0.45);
      }
      { const m = place('card1', 1.43 * 1.0, 30, 0, 1.6); m.rotation.order = 'YXZ'; m.rotation.set(-Math.PI / 2, Math.PI / 2, 0); m.position.set(1.43, 21 * 0.085 * 1.6 + 0.02, 30); }
      /* trees: oaks and blossoms around the garden */
      kind('oak', () => treeGrid('oak'), 0.2); kind('blossom', () => treeGrid('blossom'), 0.2);
      for (let i = 0; i < 46; i++) {
        let x, z, ok = false, tries = 0;
        while (!ok && tries++ < 40) {
          const a = rnd() * TAU, r = 27 + rnd() * 60;
          x = Math.sin(a) * r; z = Math.cos(a) * r;
          ok = Math.abs(x) > 6 && !(Math.abs(x) < 9 && z < -10) && Math.abs(z) > 4 && this.colliders.every(c => Math.hypot(c.x - x, c.z - z) > 4.5);
        }
        if (!ok) continue;
        const k = rnd() < 0.4 ? 'blossom' : 'oak';
        place(k, x, z, rnd() * TAU, 0.85 + rnd() * 0.4); col(x + 0.2, z + 0.2, 0.42);
      }

      /* the castle to the north, hills and clouds */
      kind('castle', castleGrid, 1.0);
      { const m = place('castle', 0, -120, 0, 1, { noCast: true }); }
      this.colliders.push({ x: 0, z: -120, r: 30 });
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * TAU + 0.2, r = 150 + (i % 3) * 25;
        kind('hill' + (i % 4), () => hillGrid(18 + (i % 4) * 4, 7 + (i % 3) * 3, i % 4), 2.0);
        place('hill' + (i % 4), Math.sin(a) * r, Math.cos(a) * r, a, 1, { noCast: true });
      }
      for (let i = 0; i < 4; i++) kind('cloud' + i, () => cloudGrid(i), 2.2);
      for (let i = 0; i < 14; i++) {
        const m = place('cloud' + (i % 4), (rnd() - 0.5) * 360, (rnd() - 0.5) * 360, rnd() * TAU, 1, { noCast: true, y: 55 + rnd() * 30 });
        this.clouds.push(m);
      }

      /* grass tufts and little flowers, instanced */
      const scatter = (geo, n, s, test) => {
        const im = new THREE.InstancedMesh(geo, VX.litMat(), n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
        let k = 0;
        for (let i = 0; i < n * 3 && k < n; i++) {
          const x = (rnd() - 0.5) * 180, z = (rnd() - 0.5) * 180;
          if (!test(x, z)) continue;
          q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * TAU);
          m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s, s)); im.setMatrixAt(k++, m4);
        }
        im.count = k; im.receiveShadow = true; scene.add(im);
      };
      const grassy = (x, z) => Math.hypot(x, z) > 17 && !(Math.abs(x) < 3 && z < -14) && !(Math.abs(x) < 3 && z > 14) && !(Math.abs(z) < 3 && Math.abs(x) > 14 && Math.abs(x) < 70) && Math.hypot(x, z + 120) > 34;
      scatter(VX.meshGrid(tuftGrid(), 0.06, {}).lit, 2600, 1, grassy);
      [0xf6a2cf, 0xffffff, 0x6f8df2, 0xdc2741].forEach(c => scatter(VX.meshGrid(flowerGrid(c), 0.05, {}).lit, 260, 1, grassy));
    }

    collide(p, r) {
      for (const c of this.colliders) {
        const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
        if (d < m && d > 1e-5) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; }
      }
      const d = Math.hypot(p.x, p.z);
      if (d > this.bound) { p.x *= this.bound / d; p.z *= this.bound / d; }
    }
    update(dt) {
      for (const c of this.clouds) { c.position.x += dt * 1.2; if (c.position.x > 200) c.position.x -= 400; }
    }
  }
  window.WORLD = World;
})();
