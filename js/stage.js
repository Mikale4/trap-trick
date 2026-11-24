/* ============================================================================
   stage.js -- what the story's places (farm.js, academy.js) are built with: a
   Stage keeps a scene's kinds of things and where they're placed, the ground
   close by (a pixel to each 2.4 cm voxel) and further off, where one may walk,
   what's in the way, lamps, and fields of grass and wheat (instances).
   ========================================================================== */
(function () {
  'use strict';
  const S1 = 0.024, SB = 0.048, HP = Math.PI / 2;
  class Stage {
    constructor(scene, name) {
      this.scene = scene; this.name = name; this.walk = []; this.colliders = []; this.seats = []; this.clouds = []; this.lights = []; this.instances = []; this.marks = {};
      this.kinds = {}; this.core = null; this.ground = null; this.groundSize = 0; this.farColor = null; this.hens = 0;
    }
    kind(name, make, s, o) {
      if (this.kinds[name]) return;
      const g = make();
      this.kinds[name] = VX.meshGrid(g, s, { offset: s === S1 ? [-0.5, -0.5, -0.5] : [0, -0.5, 0], ao: o && o.ao === false ? false : undefined });
      if (s === S1 && !(o && o.near) && this.kinds[name].lit && this.kinds[name].lit.index.count / 6 > 1800) this.kinds[name + '~'] = VX.meshGrid(TOWN_KIT.coarsen(g), S1 * 2, { offset: [-0.5, -0.5, -0.5] });
    }
    /* opts: y, name (kept, so the game can find it), noCast, near (drawn only close by) */
    place(name, x, z, ry, opts) {
      opts = opts || {};
      if (!this.kinds[name]) throw new Error(this.name + ': no kind ' + name);
      const m = VX.meshPair(this.kinds[name], null, {});
      m.position.set(x, opts.y || 0, z); m.rotation.y = ry || 0; if (opts.s) m.scale.setScalar(opts.s);
      if (opts.name) m.userData.bake = opts.name;
      if (opts.noCast) m.userData.noCast = true;
      if (opts.near) m.userData.near = true;
      this.scene.add(m);
      if (this.kinds[name + '~'] && !opts.name && !opts.s) { m.userData.lod = 'n'; const f = VX.meshPair(this.kinds[name + '~'], null, {}); f.position.copy(m.position); f.rotation.y = m.rotation.y; f.userData = { noCast: true, near: opts.near, lod: 'f' }; this.scene.add(f); }
      return m;
    }
    put(name, make, s, x, z, ry, opts) { this.kind(name, make, s, opts); return this.place(name, x, z, ry, opts); }
    col(x, z, r) { this.colliders.push([x, z, r]); }
    /* a line of circles along a wall or a fence */
    wall(x0, z0, x1, z1, r) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / (r * 1.1))); for (let i = 0; i <= n; i++) this.col(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n, r); }
    block(x0, z0, x1, z1) { (this.blocks || (this.blocks = [])).push([x0, z0, x1, z1]); }      // a solid rectangle
    light(x, y, z, c, e, r, name) { this.lights.push({ p: [x, y, z], c, e, r, name: name || '' }); }
    /* many of one small thing: list of [x, z, yaw, scale] */
    scatter(name, make, s, list, near) { this.instances.push({ geo: VX.meshGrid(make(), s, { offset: s === S1 ? [-0.5, -0.5, -0.5] : [0, -0.5, 0] }), list, near: near || 0 }); }
    paintCore(x0, z0, N, f) {
      const d = new Uint8Array(N * N * 4);
      for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) { const c = f(x0 + (px + 0.5) * S1, z0 + (py + 0.5) * S1, px, py), i = (py * N + px) * 4; d[i] = (c >> 16) & 255; d[i + 1] = (c >> 8) & 255; d[i + 2] = c & 255; d[i + 3] = 255; }
      this.core = { w: N, h: N, data: d, x: x0 + N * S1 / 2, z: z0 + N * S1 / 2, size: N * S1 };
    }
    paintGround(W, N, cx, cz, f) {
      const d = new Uint8Array(N * N * 4);
      for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) { const c = f(cx + (px / N - 0.5) * W, cz + (py / N - 0.5) * W, px, py), i = (py * N + px) * 4; d[i] = (c >> 16) & 255; d[i + 1] = (c >> 8) & 255; d[i + 2] = c & 255; d[i + 3] = 255; }
      this.ground = { w: N, h: N, data: d, x: cx, z: cz, size: W };
    }
    /* hills, mountains, clouds and woods round a place */
    country(o) {
      const K = TOWN_KIT; let seed = o.seed || 99; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, TAU = Math.PI * 2;
      const [cx, cz] = o.at || [0, 0];
      for (let i = 0; i < 3; i++) this.kind('ftree' + i, () => K.forestTreeGrid(i * 5), 0.24, { ao: false });
      for (let i = 0; i < (o.trees || 0); i++) { const a = rnd() * TAU, r = (o.treeR || 44) + rnd() * 30, x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r; if (o.clear && o.clear(x, z)) continue; this.place('ftree' + (i % 3), x, z, Math.floor(rnd() * 4) * HP, { noCast: true, s: 0.8 + rnd() * 0.6 }); }
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + 0.3, r = (o.hillR || 95) + (i % 3) * 18; this.kind('hill' + (i % 4), () => K.hillGrid(27 + (i % 4) * 6, Math.round((7 + (i % 3) * 3) * 1.5), i % 4), 1.3, { ao: false }); const x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r; if (o.clear && o.clear(x, z)) continue; this.place('hill' + (i % 4), x, z, a, { noCast: true }); }
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + 0.15, r = 230 + (i % 3) * 30; this.kind('mtn' + (i % 4), () => K.mountainGrid(i % 4), 4.0, { ao: false }); this.place('mtn' + (i % 4), cx + Math.sin(a) * r, cz + Math.cos(a) * r, a * 3, { noCast: true, s: 1 + (i % 2) * 0.3 }); }
      for (let i = 0; i < 4; i++) this.kind('cloud' + i, () => K.cloudGrid(i), 1.1, { ao: false });
      for (let i = 0; i < 12; i++) this.clouds.push(this.place('cloud' + (i % 4), (rnd() - 0.5) * 360, (rnd() - 0.5) * 360, rnd() * TAU, { noCast: true, y: 55 + rnd() * 30 }));
    }
  }
  window.STAGE = { Stage, S1, SB };
})();
