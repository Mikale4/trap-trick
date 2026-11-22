/* ============================================================================
   voxel.js -- the voxel kit for Trap Trick.

   The same technique as the other voxel games (Zenless Voxel, Pallet Town
   Voxel): a sparse paintable grid, a face-culled mesher with baked ambient
   occlusion and a little per-voxel colour jitter, Lambert vertex colours,
   and rigs built as a tree of pivoting parts.

   What's new here: a MODEL is painted in one shared "model space" (y up from
   the soles, +x is the character's own left, +z is the way she faces). Each
   part says where its pivot (its joint) sits in that space, and the kit
   re-bases the voxels onto the pivot. So a sleeve, a forearm and a hand are
   drawn where they belong, and the joints fall out of the pivots.

   - part(name, parent, pivot, {yaw})   a jointed part; `yaw` turns the part's
     own frame about Y (a skirt panel looks outward, so its flare is a plain
     rotation about its local X axis).
   - variant(part, name)                an alternative mesh on a part that can
     be swapped in (faces, hand shapes). Only one variant per part shows.
   - Colours are 0xRRGGBB; VX.glow(c) makes a voxel unlit (gems, highlights).
   ========================================================================== */
(function () {
  'use strict';

  const GLOW = 0x1000000;
  const glow = c => (c & 0xffffff) | GLOW;
  const isGlow = c => (c & GLOW) !== 0;

  function hash3(x, y, z) {
    let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }

  /* ---------------------------------------------------------------- grid -- */
  class Grid {
    constructor() { this.m = new Map(); this.jit = 0.05; }
    static key(x, y, z) { return ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512); }
    set(x, y, z, c) { x = Math.round(x); y = Math.round(y); z = Math.round(z); if (c == null || c < 0) this.m.delete(Grid.key(x, y, z)); else this.m.set(Grid.key(x, y, z), c); return this; }
    get(x, y, z) { const v = this.m.get(Grid.key(Math.round(x), Math.round(y), Math.round(z))); return v === undefined ? -1 : v; }
    has(x, y, z) { return this.m.has(Grid.key(x, y, z)); }
    del(x, y, z) { this.m.delete(Grid.key(Math.round(x), Math.round(y), Math.round(z))); return this; }
    box(x0, y0, z0, x1, y1, z1, c) {
      if (x0 > x1) [x0, x1] = [x1, x0]; if (y0 > y1) [y0, y1] = [y1, y0]; if (z0 > z1) [z0, z1] = [z1, z0];
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
        const v = typeof c === 'function' ? c(x, y, z) : c; if (v != null && v >= 0) this.set(x, y, z, v);
      }
      return this;
    }
    cut(x0, y0, z0, x1, y1, z1) {
      if (x0 > x1) [x0, x1] = [x1, x0]; if (y0 > y1) [y0, y1] = [y1, y0]; if (z0 > z1) [z0, z1] = [z1, z0];
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.m.delete(Grid.key(x, y, z));
      return this;
    }
    ell(cx, cy, cz, rx, ry, rz, c) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++)
        for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
          for (let z = Math.floor(cz - rz - 1); z <= Math.ceil(cz + rz + 1); z++) {
            const d = ((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 + ((z - cz) / (rz + 0.5)) ** 2;
            if (d <= 1) { const v = typeof c === 'function' ? c(x, y, z) : c; if (v != null && v >= 0) this.set(x, y, z, v); }
          }
      return this;
    }
    /* a round slab: centre (cx, cz), radius r, rows y0..y1 */
    disc(cx, cz, r, y0, y1, c) {
      for (let y = y0; y <= y1; y++)
        for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++)
          for (let z = Math.floor(cz - r - 1); z <= Math.ceil(cz + r + 1); z++) {
            if ((x - cx) ** 2 + (z - cz) ** 2 > (r + 0.3) ** 2) continue;
            const v = typeof c === 'function' ? c(x, y, z) : c; if (v != null && v >= 0) this.set(x, y, z, v);
          }
      return this;
    }
    line(x0, y0, z0, x1, y1, z1, c, r) {
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)) * 2));
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, z = z0 + (z1 - z0) * t;
        if (r) this.ell(x, y, z, r, r, r, c); else this.set(x, y, z, typeof c === 'function' ? c(Math.round(x), Math.round(y), Math.round(z)) : c);
      }
      return this;
    }
    paint(test, c) { for (const [k, v] of this.m) { const z = (k % 1024) - 512, y = (Math.floor(k / 1024) % 1024) - 512, x = Math.floor(k / 1048576) - 512; if (test(x, y, z, v)) this.m.set(k, typeof c === 'function' ? c(x, y, z, v) : c); } return this; }
    each(fn) { for (const [k, v] of this.m) { const z = (k % 1024) - 512, y = (Math.floor(k / 1024) % 1024) - 512, x = Math.floor(k / 1048576) - 512; fn(x, y, z, v); } }
    /* stamp a small bitmap (rows top-down, '#' or a palette letter) onto a plane */
    stamp(rows, pal, put) {
      const h = rows.length;
      for (let r = 0; r < h; r++) for (let i = 0; i < rows[r].length; i++) {
        const ch = rows[r][i]; if (ch === '.' || ch === ' ') continue;
        put(i, h - 1 - r, pal[ch]);
      }
    }
    get size() { return this.m.size; }
  }

  /* -------------------------------------------------------------- mesher -- */
  const FACES = [
    { d: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], s: 0.86 },
    { d: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], s: 0.86 },
    { d: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], s: 1.0 },
    { d: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], s: 0.64 },
    { d: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], s: 0.95 },
    { d: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], s: 0.8 },
  ];
  const AO = [0.55, 0.72, 0.87, 1.0];

  /* opts: { jitter, ao, offset:[x,y,z] (subtracted), yaw (the part frame's yaw: positions are turned by -yaw), solid(x,y,z) }
     FINE DETAIL: a grid may carry `tex = { test(x,y,z,v) -> n, color(px,py,pz,v) -> colour|-1 }`. A voxel that tests n > 1
     has each visible face split into n x n smaller squares, each coloured by `color` sampled at its centre (in the same
     model-space units as the voxels). The shape stays voxel; only the paint gets finer -- suits, card corners, outlines. */
  function meshGrid(grid, s, opts) {
    opts = opts || {};
    const jit = opts.jitter != null ? opts.jitter : grid.jit;
    const off = opts.offset || [0, 0, 0], cy = Math.cos(-(opts.yaw || 0)), sy = Math.sin(-(opts.yaw || 0));
    const out = { lit: { p: [], n: [], c: [], i: [] }, glow: { p: [], n: [], c: [], i: [] } };
    const solid = opts.solid || ((x, y, z) => grid.has(x, y, z));
    const col = new THREE.Color();
    const sub = new THREE.Color();
    /* one face, n x n squares: corners and ambient occlusion interpolate across it; colour comes from the grid's tex */
    const emitFine = (B, C4, aos, n, F, j, rgb, nx, ny, nz) => {
      const L = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      const P = (u, w) => L(L(C4[0], C4[1], u), L(C4[3], C4[2], u), w);
      const A = (u, w) => { const a0 = AO[aos[0]], a1 = AO[aos[1]], a2 = AO[aos[2]], a3 = AO[aos[3]]; return (a0 + (a1 - a0) * u) * (1 - w) + (a3 + (a2 - a3) * u) * w; };
      for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
        const u0 = i / n, u1 = (i + 1) / n, w0 = k / n, w1 = (k + 1) / n, mid = P((u0 + u1) / 2, (w0 + w1) / 2);
        let c = grid.tex.color(mid[0], mid[1], mid[2], rgb);
        if (c == null || c < 0) c = rgb;
        sub.setHex(c & 0xffffff);
        const base = B.p.length / 3;
        for (const [u, w] of [[u0, w0], [u1, w0], [u1, w1], [u0, w1]]) {
          const q = P(u, w), px = q[0] - off[0], py = q[1] - off[1], pz = q[2] - off[2];
          B.p.push((px * cy + pz * sy) * s, py * s, (-px * sy + pz * cy) * s); B.n.push(nx, ny, nz);
          const kk = F.s * A(u, w) * j;
          B.c.push(Math.min(1, sub.r * kk), Math.min(1, sub.g * kk), Math.min(1, sub.b * kk));
        }
        B.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    };
    grid.each((x, y, z, v) => {
      const g = isGlow(v), B = g ? out.glow : out.lit, rgb = v & 0xffffff;
      col.setHex(rgb);
      const j = 1 + (hash3(x, y, z) - 0.5) * 2 * (g ? jit * 0.3 : jit);
      for (const F of FACES) {
        const [dx, dy, dz] = F.d;
        if (grid.has(x + dx, y + dy, z + dz)) continue;
        const base = B.p.length / 3, aos = [];
        const nx = dx * cy + dz * sy, nz = -dx * sy + dz * cy;
        const fine = grid.tex && !g ? grid.tex.test(x, y, z, v) : 0;
        const corners = [];
        for (const cr of F.c) {
          const px = x - 0.5 + cr[0] - off[0], py = y - 0.5 + cr[1] - off[1], pz = z - 0.5 + cr[2] - off[2];
          corners.push([x - 0.5 + cr[0], y - 0.5 + cr[1], z - 0.5 + cr[2]]);
          if (!fine) { B.p.push((px * cy + pz * sy) * s, py * s, (-px * sy + pz * cy) * s); B.n.push(nx, dy, nz); }
          let a = 3;
          if (!g && opts.ao !== false) {
            const ox = x + dx, oy = y + dy, oz = z + dz;
            const u = [], axes = [0, 1, 2].filter(k => F.d[k] === 0);
            for (const k of axes) u.push(cr[k] ? 1 : -1);
            const e = (k, sg) => { const o = [0, 0, 0]; o[axes[k]] = sg; return o; };
            const e1 = e(0, u[0]), e2 = e(1, u[1]);
            const s1 = solid(ox + e1[0], oy + e1[1], oz + e1[2]) ? 1 : 0;
            const s2 = solid(ox + e2[0], oy + e2[1], oz + e2[2]) ? 1 : 0;
            const sc = solid(ox + e1[0] + e2[0], oy + e1[1] + e2[1], oz + e1[2] + e2[2]) ? 1 : 0;
            a = s1 && s2 ? 0 : 3 - (s1 + s2 + sc);
          }
          aos.push(a);
          if (fine) continue;
          const k = (g ? 1 : F.s * AO[a]) * j;
          B.c.push(Math.min(1, col.r * k), Math.min(1, col.g * k), Math.min(1, col.b * k));
        }
        if (fine) { emitFine(B, corners, aos, fine, F, j, rgb, nx, dy, nz); continue; }
        if (aos[0] + aos[2] > aos[1] + aos[3]) B.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
        else B.i.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
      }
    });
    const mk = B => {
      if (!B.i.length) return null;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3));
      geo.setIndex(B.i);
      geo.computeBoundingSphere();
      return geo;
    };
    return { lit: mk(out.lit), glow: mk(out.glow) };
  }

  /* ------------------------------------------------------------ materials -- */
  const MAT = {};
  const litMat = () => MAT.lit || (MAT.lit = new THREE.MeshLambertMaterial({ vertexColors: true }));
  const glowMat = () => MAT.glow || (MAT.glow = new THREE.MeshBasicMaterial({ vertexColors: true }));

  function meshPair(G, mat, opts) {
    opts = opts || {};
    const grp = new THREE.Group();
    if (G.lit) { const m = new THREE.Mesh(G.lit, mat || litMat()); m.castShadow = opts.cast !== false; m.receiveShadow = opts.receive !== false; grp.add(m); }
    if (G.glow) grp.add(new THREE.Mesh(G.glow, opts.glowMat || glowMat()));
    return grp;
  }

  /* a static object from one grid (scenery, props) */
  function object(grid, s, opts) {
    opts = opts || {};
    return meshPair(meshGrid(grid, s, opts), opts.material, opts);
  }

  /* ---------------------------------------------------------------- model -- */
  class Model {
    constructor(scale) { this.s = scale; this.parts = {}; this.order = []; }
    part(name, parent, pivot, o) {
      o = o || {};
      const P = { name, parent, pivot: pivot || [0, 0, 0], yaw: o.yaw || 0, grid: new Grid(), variants: {}, o };
      if (o.jitter != null) P.grid.jit = o.jitter;
      this.parts[name] = P; this.order.push(name);
      return P.grid;
    }
    grid(name) { return this.parts[name].grid; }
    variant(name, v) { const P = this.parts[name]; return P.variants[v] || (P.variants[v] = new Grid()); }
    /* The rig: a Group per part (its joint), nested like the parts. Each rig gets its own material
       (so it can be faded for the skeleton view). rig.parts[name] is the joint to rotate. */
    build(opts) {
      opts = opts || {};
      const s = this.s, mat = litMat().clone(), gmat = glowMat().clone();
      const root = new THREE.Group(), parts = {}, frames = {}, rest = {}, variants = {}, active = {};
      for (const name of this.order) {
        const P = this.parts[name];
        const frame = new THREE.Group(), joint = new THREE.Group();
        frame.name = name + ':frame'; joint.name = name;
        frame.add(joint);
        const mo = { offset: P.pivot, yaw: P.yaw, ao: P.o.ao };
        if (P.grid.size) joint.add(meshPair(meshGrid(P.grid, s, mo), mat, { glowMat: gmat, cast: P.o.cast }));
        for (const v in P.variants) {
          const m = meshPair(meshGrid(P.variants[v], s, mo), mat, { glowMat: gmat, cast: P.o.cast });
          m.visible = false; m.name = name + ':' + v; joint.add(m);
          (variants[name] || (variants[name] = {}))[v] = m;
        }
        parts[name] = joint; frames[name] = frame;
      }
      for (const name of this.order) {
        const P = this.parts[name], frame = frames[name];
        const Q = P.parent ? this.parts[P.parent] : null;
        const pp = Q ? Q.pivot : [0, 0, 0], py = Q ? Q.yaw : 0;
        let dx = P.pivot[0] - pp[0], dy = P.pivot[1] - pp[1], dz = P.pivot[2] - pp[2];
        const c = Math.cos(-py), sn = Math.sin(-py);
        frame.position.set((dx * c + dz * sn) * s, dy * s, (-dx * sn + dz * c) * s);
        frame.rotation.y = P.yaw - py;
        (Q ? parts[P.parent] : root).add(frame);
        rest[name] = { x: frame.position.x, y: frame.position.y, z: frame.position.z };
      }
      const R = { root, parts, frames, rest, variants, active, mat, gmat, scale: s, model: this };
      R.setVariant = (name, v) => {
        const V = variants[name]; if (!V || active[name] === v) return;
        if (!V[v]) return;
        for (const k in V) V[k].visible = k === v;
        active[name] = v;
      };
      for (const name in variants) { const first = this.parts[name].o.defaultVariant || Object.keys(variants[name])[0]; R.setVariant(name, first); }
      return R;
    }
  }

  /* a sky dome with a vertical gradient */
  function sky(scene, top, mid, bottom) {
    const geo = new THREE.SphereGeometry(400, 32, 16), pos = geo.attributes.position, cols = [];
    const T = new THREE.Color(top), M = new THREE.Color(mid), B = new THREE.Color(bottom), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const h = pos.getY(i) / 400;
      if (h >= 0) c.copy(M).lerp(T, Math.pow(h, 0.55)); else c.copy(M).lerp(B, Math.min(1, -h * 4));
      cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    m.renderOrder = -10; scene.add(m);
    return m;
  }

  window.VX = { Grid, Model, glow, isGlow, meshGrid, meshPair, object, litMat, glowMat, hash3, sky };
})();
