/* tools/bake_godot.js -- bakes Trap Trick's voxel models into files Godot can import.

     node tools/bake_godot.js

   It runs the same builders the web version uses (js/voxel.js, js/trap-trick.js, js/props.js, js/world.js) and writes,
   into godot/assets/:
     trap_trick.glb   her rig: frame -> joint -> mesh nodes, named like the parts (face and hand shapes as variants)
     umbrella.glb     the umbrella: canopy, eight folding panels, the top bow
     cards.glb        the four little cards of the magic puffs
     world.glb        every piece of scenery, placed
     ground.png       the garden's ground texture
     ground_core.png  the courtyard's, a pixel to each of her voxels
     town.glb         the town: houses, the square and its stalls, the alley and the door in the ground, the country round
     town_ground.png  the country round it
     town_core.png    its streets, a pixel to each of her voxels
     people.glb       the townsfolk, each a small rig: person_N > pN_<part>__frame > pN_<part> > pN_<part>__mesh
     bake.json        the rig's metadata (joints, rest positions, panels, hair chains, sockets...), the world's colliders,
                      seats, clouds and the grass and flower instances
   Vertex colours are written as sRGB bytes; Godot's materials read them as sRGB (vertex_color_is_srgb, grain.gdshader). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'godot', 'assets');
fs.mkdirSync(OUT, { recursive: true });
/* write a file only if it has changed, and try again if something else has it open for a moment */
function writeOut(file, buf) {
  const f = path.join(OUT, file);
  for (let k = 0; ; k++) {
    try { if (fs.existsSync(f) && fs.readFileSync(f).equals(buf)) return; fs.writeFileSync(f, buf); return; }
    catch (e) { if (k > 20) throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250); }
  }
}

/* ------------------------------------------------- run the web builders -- */
globalThis.window = globalThis;
globalThis.THREE = require(path.join(ROOT, 'lib', 'three.min.js'));
let groundPixels = null;
globalThis.document = {
  createElement: () => ({
    width: 0, height: 0,
    getContext: () => ({ putCore() {}, createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), putImageData: img => { groundPixels = img; } }),
  }),
};
for (const f of ['voxel.js', 'trap-trick.js', 'props.js', 'world.js', 'people.js', 'things.js', 'town.js']) vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), { filename: f });

/* ------------------------------------------------------------- GLB writer -- */
function GLB() {
  const json = {
    asset: { version: '2.0', generator: 'trap-trick bake_godot.js' }, scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], accessors: [], bufferViews: [], buffers: [{ byteLength: 0 }],
    materials: [
      { name: 'voxel', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1 } },
      { name: 'voxel_glow', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1 }, extensions: { KHR_materials_unlit: {} } },
    ],
    extensionsUsed: ['KHR_materials_unlit', 'KHR_mesh_quantization'],
  };
  const parts = []; let len = 0;
  const view = (typed, target) => {
    const pad = (4 - (len % 4)) % 4; if (pad) { parts.push(Buffer.alloc(pad)); len += pad; }
    const b = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength); parts.push(b);
    json.bufferViews.push({ buffer: 0, byteOffset: len, byteLength: b.length, target }); len += b.length;
    return json.bufferViews.length - 1;
  };
  const acc = (typed, type, comp, count, target, mm) => {
    const a = { bufferView: view(typed, target), componentType: comp, count, type };
    if (mm) { a.min = mm[0]; a.max = mm[1]; }
    json.accessors.push(a); return json.accessors.length - 1;
  };
  const geoCache = new Map();
  /* a mesh from one or more [BufferGeometry, glow?] primitives */
  function mesh(prims, name) {
    const key = prims.map(p => p[0].uuid + (p[1] ? 'g' : '')).join('|');
    if (geoCache.has(key)) return geoCache.get(key);
    const out = [];
    for (const [geo, glow] of prims) {
      const P = geo.attributes.position.array, N = geo.attributes.normal.array, Cc = geo.attributes.color.array, I = geo.index.array, n = P.length / 3;
      const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { const v = P[i * 3 + k]; if (v < mn[k]) mn[k] = v; if (v > mx[k]) mx[k] = v; }
      // lean vertices: the position as floats, the normal as 4 bytes, the colour as 4 bytes (sRGB: the Godot materials
      // convert it), indices 16-bit where they fit
      const col = new Uint8Array(n * 4), nor = new Int8Array(n * 4);
      for (let i = 0; i < n; i++) { for (let k = 0; k < 3; k++) { col[i * 4 + k] = Math.round(Math.min(1, Math.max(0, Cc[i * 3 + k])) * 255); nor[i * 4 + k] = Math.round(N[i * 3 + k] * 127); } col[i * 4 + 3] = 255; }
      // the alpha byte says which axes of the mesh sit half a 2.4 cm cell off the lattice (for the grain shader)
      let half = 0; for (let k = 0; k < 3; k++) { const v = P[k] / 0.024; if (Math.abs(v - Math.round(v)) > 0.25) half |= 1 << k; }
      for (let i = 0; i < n; i++) col[i * 4 + 3] = 255 - half;
      const small = n < 65536;
      const colAcc = acc(col, 'VEC4', 5121, n, 34962); json.accessors[colAcc].normalized = true;
      const norAcc = acc(nor, 'VEC3', 5120, n, 34962); json.accessors[norAcc].normalized = true; json.bufferViews[json.accessors[norAcc].bufferView].byteStride = 4;
      out.push({
        attributes: { POSITION: acc(new Float32Array(P), 'VEC3', 5126, n, 34962, [mn, mx]), NORMAL: norAcc, COLOR_0: colAcc },
        indices: small ? acc(new Uint16Array(I), 'SCALAR', 5123, I.length, 34963) : acc(new Uint32Array(I), 'SCALAR', 5125, I.length, 34963), material: glow ? 1 : 0,
      });
    }
    json.meshes.push({ name: name || 'mesh', primitives: out });
    geoCache.set(key, json.meshes.length - 1);
    return json.meshes.length - 1;
  }
  const safe = s => String(s || '').replace(/[:.@/"%]/g, '_');
  /* a Three object tree as glTF nodes; a group holding only meshes (a voxel "mesh pair") becomes one node with one mesh */
  function node(o, name) {
    const n = { name: safe(name != null ? name : o.name) || 'node' };
    const p = o.position, q = o.quaternion, s = o.scale;
    if (p.x || p.y || p.z) n.translation = [p.x, p.y, p.z];
    if (q.x || q.y || q.z || q.w !== 1) n.rotation = [q.x, q.y, q.z, q.w];
    if (s.x !== 1 || s.y !== 1 || s.z !== 1) n.scale = [s.x, s.y, s.z];
    if (o.isMesh && !o.isInstancedMesh) n.mesh = mesh([[o.geometry, o.material && o.material.type === 'MeshBasicMaterial']], n.name);
    else if (o.children.length && o.children.every(c => c.isMesh && !c.isInstancedMesh)) n.mesh = mesh(o.children.map(c => [c.geometry, c.material.type === 'MeshBasicMaterial']), n.name);
    else if (o.children.length) n.children = o.children.filter(c => !c.isInstancedMesh && c.name !== 'shadow').map(c => node(c));
    if (o.visible === false) n.extras = { hidden: true };
    json.nodes.push(n); return json.nodes.length - 1;
  }
  return {
    json, node, mesh, root: i => json.scenes[0].nodes.push(i),
    write(file) {
      json.buffers[0].byteLength = len;
      const bin = Buffer.concat(parts), binPad = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]);
      let js = Buffer.from(JSON.stringify(json)); js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
      const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + binPad.length, 8);
      const jh = Buffer.alloc(8); jh.writeUInt32LE(js.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
      const bh = Buffer.alloc(8); bh.writeUInt32LE(binPad.length, 0); bh.writeUInt32LE(0x004e4942, 4);
      writeOut(file, Buffer.concat([head, jh, js, bh, binPad]));
      return (12 + 16 + js.length + binPad.length);
    },
  };
}

/* ------------------------------------------------------------- PNG writer -- */
function png(file, w, h, rgba) {
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = b => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  writeOut(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}

const bake = {};
const r3 = v => Math.round(v * 1000) / 1000;

/* ------------------------------------------------------------- Trap Trick -- */
{
  const B = TRAPTRICK.build(), rig = B.model.build(), M = B.meta, glb = GLB();
  for (const name in rig.parts) for (const c of rig.parts[name].children) {
    if (c.name && c.name.includes(':') && !c.name.endsWith(':frame')) c.name = name + '__v_' + c.name.split(':')[1];
    else if (!c.name) c.name = name + '__mesh';
  }
  for (const name in rig.frames) rig.frames[name].name = name + '__frame';
  rig.root.name = 'rig';
  glb.root(glb.node(rig.root));
  const size = glb.write('trap_trick.glb');
  const joints = {};
  for (const name of B.model.order) {
    const P = B.model.parts[name];
    joints[name] = { parent: P.parent, pivot: P.pivot, yaw: P.yaw, variants: Object.keys(P.variants), default: P.o.defaultVariant || null };
  }
  bake.rig = { S: M.S, J: M.J, panels: M.panels, chains: M.chains, dangles: M.dangles, sockets: M.sockets, faces: M.faces, hands: M.hands, joints, order: B.model.order };
  console.log('trap_trick.glb', (size / 1048576).toFixed(2), 'MB,', B.model.order.length, 'joints');
}

/* --------------------------------------------------------------- umbrella -- */
{
  const U = PROPS.umbrella(), glb = GLB();
  U.setOpen(1);
  U.root.name = 'umbrella'; U.canopy.name = 'canopy';
  U.root.children[0].name = 'shaft';
  U.canopy.children[0].name = 'ferrule'; U.canopy.children[1].name = 'bow_top';
  U.panels.forEach((p, i) => { p.name = 'fold_' + i; p.parent.name = 'panel_' + i; p.children[0].name = 'panel_mesh_' + i; });
  glb.root(glb.node(U.root));
  console.log('umbrella.glb', (glb.write('umbrella.glb') / 1024).toFixed(0), 'KB');
  bake.umbrella = { hubY: PROPS.HUB_Y * TRAPTRICK.S, canR: PROPS.CAN_R * TRAPTRICK.S, length: U.length };
}

/* ------------------------------------------------------------------ cards -- */
{
  const glb = GLB();
  for (const suit of ['heart', 'spade', 'diamond', 'club']) { const m = PROPS.cardMesh(suit); m.name = 'card_' + suit; glb.root(glb.node(m)); }
  console.log('cards.glb', (glb.write('cards.glb') / 1024).toFixed(0), 'KB');
}

/* ------------------------------------------------------------------ world -- */
{
  const scene = new THREE.Scene(), W = new WORLD(scene), glb = GLB();
  const inst = [];
  let k = 0;
  const top = new THREE.Group(); top.name = 'scenery';
  for (const o of [...scene.children]) {
    if (o.isInstancedMesh) {
      const mats = [];
      for (let i = 0; i < o.count; i++) { const m = new THREE.Matrix4(); o.getMatrixAt(i, m); mats.push(m.elements.map(r3)); }
      inst.push({ mesh: 'inst_' + inst.length, transforms: mats });
      const src = new THREE.Mesh(o.geometry, o.material); src.name = 'inst_' + (inst.length - 1); src.visible = false;
      top.add(src);
      continue;
    }
    if (o.geometry && o.geometry.type === 'PlaneGeometry') continue;      // the ground: rebuilt in Godot from ground.png and ground_core.png
    const isCloud = W.clouds.includes(o);
    o.name = isCloud ? 'cloud_' + W.clouds.indexOf(o) : (o.userData && o.userData.bake) || 'prop_' + (k++);   // (moon, float_N keep their names)
    if (o.userData && o.userData.noCast && !isCloud && !o.userData.bake) o.name += '_nc';   // casts no shadow
    top.add(o);
  }
  glb.root(glb.node(top));
  console.log('world.glb', (glb.write('world.glb') / 1048576).toFixed(2), 'MB,', k, 'props');
  png('ground_core.png', W.core.w, W.core.h, W.core.data);
  bake.world = { coreSize: r3(W.core.size), colliders: W.colliders.map(c => [r3(c.x), r3(c.z), r3(c.r)]), seats: W.seats.map(s => ({ x: r3(s.x), z: r3(s.z), yaw: r3(s.yaw), h: s.h })), bound: W.bound, clouds: W.clouds.length, instances: inst, groundSize: W.groundSize || 200,
    farColor: W.farColor, floaters: (W.floaters || []).length, lights: (W.lights || []).map(l => ({ p: l.p.map(r3), c: l.c, e: l.e, r: l.r })) };
  if (groundPixels) { png('ground.png', groundPixels.width, groundPixels.height, groundPixels.data); console.log('ground.png', groundPixels.width + 'x' + groundPixels.height); }
}

/* ------------------------------------------------------------------- town -- */
{
  const scene = new THREE.Scene(), T = new TOWN(scene), glb = GLB();
  let k = 0;
  const top = new THREE.Group(); top.name = 'town';
  for (const o of [...scene.children]) {
    if (o.geometry && o.geometry.type === 'PlaneGeometry') continue;
    const isCloud = T.clouds.includes(o);
    o.name = isCloud ? 'cloud_' + T.clouds.indexOf(o) : (o.userData && o.userData.bake) || 'prop_' + (k++);
    if (o.userData && o.userData.noCast && !isCloud && !o.userData.bake) o.name += '_nc';
    if (o.userData && o.userData.near) o.name += '_near';                 // (drawn only close by)
    if (o.userData && o.userData.lod) o.name += '_lod' + o.userData.lod;    // (n: up close, f: its plainer stand-in from further off)
    top.add(o);
  }
  glb.root(glb.node(top));
  png('town_core.png', T.core.w, T.core.h, T.core.data);                  // the streets' setts, a pixel to each 2.4 cm
  console.log('town.glb', (glb.write('town.glb') / 1048576).toFixed(2), 'MB,', k, 'props');
  if (groundPixels) png('town_ground.png', groundPixels.width, groundPixels.height, groundPixels.data);
  // the townsfolk: one rig each
  const pg = GLB(), people = [];
  T.npcs.forEach((n, i) => {
    const M = PEOPLE.build(n.look);
    for (const name of M.order) { M.parts[name].grid.jit = 0; M.parts[name].grid.merge = true; }      // (the grain shader gives them back their voxels' shades)
    const rig = M.build();
    for (const name in rig.parts) for (const c of rig.parts[name].children) if (!c.name) c.name = 'p' + i + '_' + name + '__mesh';
    for (const name in rig.parts) rig.parts[name].name = 'p' + i + '_' + name;
    for (const name in rig.frames) rig.frames[name].name = 'p' + i + '_' + name + '__frame';
    rig.root.name = 'person_' + i;
    pg.root(pg.node(rig.root));
    people.push({ parts: M.order, s: M.s, top: r3(M.info.top), seat: M.info.seat, dress: M.info.dress, ua: r3(M.info.ua), fa: r3(M.info.fa) });
  });
  console.log('people.glb', (pg.write('people.glb') / 1048576).toFixed(2), 'MB,', people.length, 'people');
  bake.town = {
    walk: T.walk, houses: T.houses.map(h => h.map(r3)), core: { x: r3(T.core.x), z: r3(T.core.z), size: r3(T.core.size) }, colliders: T.colliders.map(c => c.map(r3)), seats: T.seats.map(s => ({ x: r3(s.x), z: r3(s.z), yaw: r3(s.yaw), h: s.h })),
    door: T.door, clouds: T.clouds.length, chickens: T.chickens, sails: T.sails, groundSize: T.groundSize, farColor: T.farColor,
    npcs: T.npcs.map((n, i) => ({ job: n.job, at: n.at || null, route: n.route ? n.route.map(p => p.map(r3)) : null, lines: n.lines, call: !!n.call, slow: !!n.slow, seat: !!n.seat, kid: !!n.look.kid, ...people[i] })),
  };
}

writeOut('bake.json', Buffer.from(JSON.stringify(bake)));
console.log('bake.json written');
