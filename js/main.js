/* ============================================================================
   main.js -- the loop: renderer, lights, the follow camera, input (keyboard,
   mouse, gamepad) and the HUD.
   ========================================================================== */
(function () {
  'use strict';
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  /* ------------------------------------------------------------- scene -- */
  const canvas = document.getElementById('view');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  // twilight in the Wonder Garden: indigo overhead, a rose glow on the horizon, a low warm sun just down in the south-west
  scene.fog = new THREE.Fog(0x6c5d9c, 30, 140);
  VX.sky(scene, 0x1c2257, 0xd88aa8, 0x9a6f9c);
  const hemi = new THREE.HemisphereLight(0x9a90cf, 0x2e3a33, 0.62); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffae8c, 0.55);
  const SUN_DIR = new THREE.Vector3(-0.72, 0.34, 0.6).normalize();
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 80 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.025;
  scene.add(sun); scene.add(sun.target);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 900);

  const world = new WORLD(scene);
  for (const l of world.lights) { const p = new THREE.PointLight(l.c, l.e * 0.8, l.r, 1.6); p.position.set(l.p[0], l.p[1], l.p[2]); scene.add(p); }   // the lamps
  const fx = new FXSYS(scene);
  const tt = new CHARACTER.Character(scene, fx);
  tt.seats = world.seats;
  tt.pos.set(0, 0, 1.2); tt.yaw = 0; tt.tYaw = 0;   // on her stage, the gate and the castle behind her

  /* ------------------------------------------------------------ camera -- */
  const cam = { yaw: 0.3, pitch: 0.1, dist: 3.7, tgt: new THREE.Vector3(0, 1.1, 1.2), drag: false };
  function updateCamera(dt) {
    const want = new THREE.Vector3(tt.pos.x, tt.pos.y * 0.6 + 1.05 - (tt.seat ? 0.25 : 0), tt.pos.z);
    cam.tgt.x += (want.x - cam.tgt.x) * (1 - Math.exp(-12 * dt));
    cam.tgt.z += (want.z - cam.tgt.z) * (1 - Math.exp(-12 * dt));
    cam.tgt.y += (want.y - cam.tgt.y) * (1 - Math.exp(-6 * dt));
    const cp = Math.cos(cam.pitch);
    camera.position.set(cam.tgt.x + Math.sin(cam.yaw) * cp * cam.dist, cam.tgt.y + Math.sin(cam.pitch) * cam.dist, cam.tgt.z + Math.cos(cam.yaw) * cp * cam.dist);
    if (camera.position.y < 0.15) camera.position.y = 0.15;
    camera.lookAt(cam.tgt);
    sun.position.copy(cam.tgt).addScaledVector(SUN_DIR, 30); sun.target.position.copy(cam.tgt);
  }

  /* ------------------------------------------------------------- input -- */
  const keys = new Set(); let pressed = new Set();
  const hud = document.getElementById('hud');
  addEventListener('keydown', e => {
    if (e.repeat) { if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault(); return; }
    keys.add(e.code); pressed.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousedown', e => { cam.drag = true; cam.lx = e.clientX; cam.ly = e.clientY; });
  addEventListener('mouseup', () => cam.drag = false);
  addEventListener('mousemove', e => {
    if (!cam.drag) return;
    cam.yaw -= (e.clientX - cam.lx) * 0.006; cam.pitch = clamp(cam.pitch + (e.clientY - cam.ly) * 0.004, -0.25, 1.25);
    cam.lx = e.clientX; cam.ly = e.clientY;
  });
  canvas.addEventListener('wheel', e => { cam.dist = clamp(cam.dist * Math.exp(e.deltaY * 0.0012), 1.6, 12); e.preventDefault(); }, { passive: false });
  // touch: drag to turn the camera, pinch to zoom
  let touch = null;
  canvas.addEventListener('touchstart', e => { const t = e.touches[0]; touch = { x: t.clientX, y: t.clientY }; }, { passive: true });
  canvas.addEventListener('touchmove', e => { if (!touch) return; const t = e.touches[0]; cam.yaw -= (t.clientX - touch.x) * 0.006; cam.pitch = clamp(cam.pitch + (t.clientY - touch.y) * 0.004, -0.25, 1.25); touch = { x: t.clientX, y: t.clientY }; }, { passive: true });

  const pad = { prev: [] };
  function readPad() {
    const g = navigator.getGamepads ? [...navigator.getGamepads()].find(p => p && p.connected) : null;
    if (!g) return null;
    const dz = v => Math.abs(v) < 0.18 ? 0 : v;
    const b = g.buttons.map(x => x.pressed), was = pad.prev; pad.prev = b;
    const hit = i => b[i] && !was[i];
    return { lx: dz(g.axes[0]), ly: dz(g.axes[1]), rx: dz(g.axes[2] || 0), ry: dz(g.axes[3] || 0), b, hit };
  }

  const ACTION_KEYS = { KeyZ: 'wave', KeyX: 'point', KeyC: 'curtsy', KeyV: 'spin', KeyB: 'peace', KeyT: 'hatTip' };
  const FACE_KEYS = { Digit3: 'smug', Digit4: 'smile', Digit5: 'happy', Digit6: 'pout', Digit7: 'surprised' };
  function input(dt) {
    let fwd = 0, side = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) fwd += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) fwd -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) side += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) side -= 1;
    let run = keys.has('ShiftLeft') || keys.has('ShiftRight');
    let jump = pressed.has('Space'), jumpHeld = keys.has('Space');
    const P = readPad();
    if (P) {
      fwd += -P.ly; side += P.lx; cam.yaw -= P.rx * dt * 2.6; cam.pitch = clamp(cam.pitch + P.ry * dt * 1.6, -0.25, 1.25);
      run = run || P.b[1] || P.b[10] || Math.hypot(P.lx, P.ly) > 0.92;
      jump = jump || P.hit(0); jumpHeld = jumpHeld || P.b[0];
      if (P.hit(2)) tt.trick(); if (P.hit(3)) tt.toggleOpen();
      if (P.hit(4)) tt.toggleItem('umbrella');
      if (P.hit(6)) tt.cycleTilt(); if (P.hit(7)) tt.toggleCarry();
      if (P.hit(12)) tt.play('wave'); if (P.hit(15)) tt.play('point'); if (P.hit(13)) tt.play('curtsy'); if (P.hit(14)) tt.play('spin');
      if (P.hit(11)) tt.sitToggle(); if (P.hit(9)) toggleHelp();
    }
    const m = Math.hypot(fwd, side); if (m > 1) { fwd /= m; side /= m; }
    const cy = cam.yaw;
    const x = -Math.sin(cy) * fwd + Math.cos(cy) * side, z = -Math.cos(cy) * fwd - Math.sin(cy) * side;
    // single-press keys
    for (const code of pressed) {
      if (code === 'Digit1') tt.toggleItem('umbrella');
      else if (code === 'KeyF') tt.toggleOpen();
      else if (code === 'KeyR') tt.cycleTilt();
      else if (code === 'KeyQ') tt.toggleCarry();
      else if (code === 'KeyE') tt.trick();
      else if (code === 'KeyG') tt.sitToggle();
      else if (code === 'KeyJ') { skel = !skel; tt.setSkeleton(skel); }
      else if (code === 'KeyH') toggleHelp();
      else if (ACTION_KEYS[code]) tt.play(ACTION_KEYS[code]);
      else if (FACE_KEYS[code]) tt.setFace(FACE_KEYS[code]);
    }
    pressed = new Set();
    return { x, z, run, jump, jumpHeld };
  }
  let skel = false;

  /* --------------------------------------------------------------- HUD -- */
  const $ = id => document.getElementById(id);
  function toggleHelp() { $('help').classList.toggle('hide'); }
  let lastHud = '';
  function updateHud() {
    const s = tt.status();
    const key = JSON.stringify(s) + skel;
    if (key === lastHud) return; lastHud = key;
    $('st-umb').textContent = s.umbrella; $('st-face').textContent = s.face;
    $('st-umb').parentElement.classList.toggle('on', s.umbrella !== 'Away');
    const pr = $('prompt');
    if (s.near) { pr.innerHTML = '<kbd>G</kbd> Sit on the toadstool'; pr.classList.remove('hide'); }
    else if (s.seat) { pr.innerHTML = '<kbd>G</kbd> Stand up'; pr.classList.remove('hide'); }
    else if (s.floating) { pr.innerHTML = 'Floating — hold <kbd>Space</kbd>'; pr.classList.remove('hide'); }
    else pr.classList.add('hide');
    $('skel').classList.toggle('hide', !skel);
  }

  /* -------------------------------------------------------------- loop -- */
  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const inp = input(dt);
    if (!window.TT.paused) {
      tt.update(dt, inp, world);
      fx.update(dt); world.update(dt);
      updateCamera(dt);
    }
    renderer.render(scene, camera);
    updateHud();
    requestAnimationFrame(frame);
  }
  updateCamera(1);
  $('boot').remove();
  requestAnimationFrame(frame);

  window.TT = { tt, world, cam, camera, scene, renderer, fx, step: (s, inp) => { const n = Math.round(s * 60); for (let i = 0; i < n; i++) { tt.update(1 / 60, Object.assign({ x: 0, z: 0, run: false, jump: false, jumpHeld: false }, inp || {}), world); fx.update(1 / 60); } updateCamera(1); renderer.render(scene, camera); } };
})();
