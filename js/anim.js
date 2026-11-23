/* ============================================================================
   anim.js -- Trap Trick as a playable character: movement, the jointed
   animation, her accessories, and the secondary motion.

   How a frame is built
   1. movement: speed eases toward the stick, she turns toward where she's
      going (leaning into the turn), jumps, lands, floats under the umbrella.
   2. base pose (forward kinematics, Euler angles per joint): idle, a walk/run
      gait whose phase advances with distance travelled, the air pose, sitting.
   3. hands: holding an item puts that arm on IK (a two-bone solve shoulder ->
      elbow -> wrist, then the wrist turns the fist so the item points where
      the pose wants it). Poses say "grip here, item pointing there".
   4. actions (emotes, tricks) overlay the pose with a fade in and out.
   5. every joint eases toward its target (quaternion slerp), the hips drop
      so the lower foot stays on the ground, then springs move the hair,
      the twelve skirt panels, the bow tails and the dangling cards.
   ========================================================================== */
(function () {
  'use strict';
  const T = window.TRAPTRICK, S = T.S;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const wrap = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _m = new THREE.Matrix4();
  const qE = (x, y, z, out) => (out || new THREE.Quaternion()).setFromEuler(_e.set(x || 0, y || 0, z || 0, 'XYZ'));
  const env = (t, dur, fi, fo) => smooth(Math.min(t / fi, (dur - t) / fo, 1));

  const DRIVEN = ['hips', 'spine', 'chest', 'neck', 'head', 'hat', 'uArmL', 'fArmL', 'handL', 'uArmR', 'fArmR', 'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];
  const WALK = 1.45, RUN = 4.3, JUMP_V = 4.4, GRAV = 15.5, FLOAT_V = -1.05;
  const CHEST_Y = T.J.chest;                               // IK targets are in chest space, voxels from the chest pivot

  /* ------------------------------------------------------------- the IK -- */
  const SH = { L: V3(8, T.J.shoulder - CHEST_Y, 0), R: V3(-8, T.J.shoulder - CHEST_Y, 0) };
  const UPPER = T.J.shoulder - T.J.elbow, FORE = T.J.elbow - T.J.wrist, GRIP = 2;
  const basisQ = (x, y, z) => new THREE.Quaternion().setFromRotationMatrix(_m.makeBasis(x, y, z));
  /* side 'L'|'R'; g: where the fist closes (chest space, voxels); d: which way the item (and the thumb side of the
     fist) points; f: roughly where the fingers point. Returns local rotations for uArm, fArm, hand. */
  function solveArm(side, g, d, f, pole) {
    const sx = side === 'L' ? 1 : -1;
    const zH = d.clone().normalize();
    const yH = f.clone().multiplyScalar(-1); yH.sub(_v.copy(zH).multiplyScalar(yH.dot(zH)));
    if (yH.lengthSq() < 1e-6) yH.set(0, 1, 0).sub(_v.copy(zH).multiplyScalar(zH.y));
    yH.normalize();
    const xH = new THREE.Vector3().crossVectors(yH, zH);
    const Qh = basisQ(xH, yH, zH);
    const W = g.clone().sub(_v.set(0, -GRIP, 0).applyQuaternion(Qh));     // the wrist sits up the fist from the grip
    const Sh = SH[side], D = W.clone().sub(Sh);
    const d0 = clamp(D.length(), 2, UPPER + FORE - 0.05), u = D.normalize();
    const P = pole ? pole.clone() : V3(sx * 0.55, -0.35, -0.75);           // elbows tuck down, back and out
    const v = P.sub(_v.copy(u).multiplyScalar(P.dot(u)));
    if (v.lengthSq() < 1e-6) v.set(0, 0, -1); v.normalize();
    const cA = clamp((UPPER * UPPER + d0 * d0 - FORE * FORE) / (2 * UPPER * d0), -1, 1), sA = Math.sqrt(1 - cA * cA);
    const E = Sh.clone().addScaledVector(u, UPPER * cA).addScaledVector(v, UPPER * sA);
    const Wc = Sh.clone().addScaledVector(u, d0);
    const down = E.clone().sub(Sh).normalize(), fa = Wc.sub(E).normalize();
    let zU = fa.clone().addScaledVector(down, -fa.dot(down));
    if (zU.lengthSq() < 1e-5) zU = V3(0, 0, 1).addScaledVector(down, -down.z);
    zU.normalize();
    const yU = down.clone().multiplyScalar(-1), xU = new THREE.Vector3().crossVectors(yU, zU);
    const qU = basisQ(xU, yU, zU);
    const beta = Math.acos(clamp(fa.dot(down), -1, 1));
    const qF = new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), -beta);
    const qH = qU.clone().multiply(qF).invert().multiply(Qh);
    return { uArm: qU, fArm: qF, hand: qH };
  }
  const mir = (side, x, y, z) => V3(side === 'L' ? x : -x, y, z);

  /* ---------------------------------------------------------- the gait -- */
  function legGait(q, runK) {
    const d = lerp(0.62, 0.4, runK);
    const Af = lerp(0.36, 0.86, runK), Ab = lerp(0.3, 0.6, runK);
    const Ksw = lerp(0.95, 2.05, runK), Kst = lerp(0.08, 0.38, runK);
    let th, kn, ft;
    if (q < d) {
      const s = q / d;
      th = lerp(-Af, Ab, s); kn = 0.05 + Kst * Math.sin(Math.PI * s);
      ft = -(th + kn);
      if (s < 0.15) ft -= 0.22 * (1 - s / 0.15) * (1 - runK);
      if (s > 0.72) ft += 0.85 * smooth((s - 0.72) / 0.28);
    } else {
      const s = (q - d) / (1 - d);
      th = lerp(Ab, -Af, smooth(s)); kn = 0.05 + Ksw * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.12)), 1.3);
      ft = lerp(0.85 - Ab - 0.05, -0.12, smooth(s));
    }
    return [th, kn, ft];
  }

  /* ======================================================== CHARACTER == */
  class Character {
    constructor(scene, fx) {
      const B = T.build();
      this.meta = B.meta; this.rig = B.model.build(); this.fx = fx;
      if (this.rig.parts.crown) this.rig.parts.crown.visible = false;   // her hair's full crown: only for the hat-off bow (desktop)
      this.root = new THREE.Group(); this.body = new THREE.Group();
      this.root.add(this.body); this.body.add(this.rig.root);
      this.rig.root.position.y = 0.5 * S;
      scene.add(this.root);
      const P = this.rig.parts;
      for (const n in P) P[n].rotation.order = 'XYZ';
      // movement
      this.pos = this.root.position; this.yaw = 0; this.tYaw = 0; this.yawRate = 0;
      this.speed = 0; this.vy = 0; this.air = 0; this.onGround = true; this.vel = V3(0, 0, 0);
      this.phase = 0; this.runK = 0; this.moveK = 0; this.idleT = 0; this.t = 0; this.landK = 0; this.floating = false;
      this.stepK = 0;
      // the pose being built, and its weights
      this.tq = {}; for (const n of DRIVEN) this.tq[n] = new THREE.Quaternion();
      this.hipsY = 0; this.hipsCur = 0;
      this.holdW = { L: 0, R: 0 };
      // actions
      this.act = null; this.actT = 0; this.queue = [];
      // face
      this.faceBase = 'smug'; this.blinkT = 2.5; this.blinking = 0;
      // the accessories
      this.umb = PROPS.umbrella();
      this.items = {
        umbrella: { obj: this.umb, st: 'away', open: 0, openT: 0, tilt: 0, vis: 0, side: 'R', grip: new THREE.Group(), spin: 0, cspin: 0, spinV: 0 },
      };
      for (const k in this.items) { const I = this.items[k]; I.grip.add(I.obj.root); I.grip.visible = false; I.obj.root.scale.setScalar(0.001); }
      // seats (the world fills these in)
      this.seats = []; this.seat = null; this.sitK = 0;
      // secondary motion
      this._initDynamics();
      this.skeleton = null;
    }

    /* ------------------------------------------------------ public API -- */
    toggleItem(name) {
      const I = this.items[name];
      if (I.st === 'away') { I.st = 'hold'; if (name === 'umbrella') { I.openT = 0; } this._appear(name); }
      else { I.st = 'leaving'; if (name === 'umbrella') I.openT = 0; }
      this.cancelAction(true);
    }
    toggleOpen() {
      const I = this.items.umbrella;
      if (I.st === 'away' || I.st === 'leaving') { I.st = 'hold'; this._appear('umbrella'); I.openT = 1; return; }
      if (I.st === 'carry') I.st = 'hold';
      I.openT = I.openT > 0.5 ? 0 : 1;
    }
    cycleTilt() { const I = this.items.umbrella; if (I.openT > 0.5) I.tilt = (I.tilt + 1) % 3; }
    toggleCarry() {
      let any = false;
      for (const k in this.items) {
        const I = this.items[k];
        if (I.st === 'hold' && !(k === 'umbrella' && I.openT > 0.5)) { I.st = 'carry'; any = true; }
        else if (I.st === 'carry') { I.st = 'hold'; any = true; }
      }
      if (!any && this.items.umbrella.openT > 0.5) { this.items.umbrella.openT = 0; this.items.umbrella.st = 'carry'; }
    }
    setFace(name) { this.faceBase = name; }
    play(name) {
      if (this.seat && name !== 'sit') return;
      const A = ACTIONS[name]; if (!A) return;
      if (this.act && this.act.name === name && this.actT < this.act.dur * 0.6) return;
      this.act = Object.assign({ name }, A, { dur: typeof A.dur === 'function' ? A.dur(this) : A.dur });
      this.actT = 0; this.idleT = 0;
      if (A.start) A.start(this);
    }
    trick() {
      const U = this.items.umbrella;
      if (U.st === 'hold' && U.openT > 0.5) this.play('umbrellaTwirl');
      else if (U.st === 'hold' || U.st === 'carry') this.play('enGarde');
      else this.play('cardFan');
    }
    cancelAction(soft) { if (this.act && (!soft || this.act.cancel !== false)) { if (this.act.end) this.act.end(this); this.act = null; } }
    sitToggle() {
      if (this.seat) { this._standUp(); return; }
      const s = this.nearSeat(); if (!s) return;
      this.cancelAction(); this.seat = s; this.sitFrom = this.pos.clone(); this.sitT = 0;
    }
    _standUp() {
      const s = this.seat; this.seat = null;
      this.unseat = { from: this.pos.clone(), to: V3(s.x + Math.sin(s.yaw) * 0.55, 0, s.z + Math.cos(s.yaw) * 0.55), t: 0 };
    }
    nearSeat() {
      let best = null, bd = 1.6;
      for (const s of this.seats) { const d = Math.hypot(s.x - this.pos.x, s.z - this.pos.z); if (d < bd) { bd = d; best = s; } }
      return best;
    }

    /* --------------------------------------------------------- update -- */
    update(dt, inp, world) {
      dt = Math.min(dt, 1 / 20);
      this.t += dt;
      this._move(dt, inp, world);
      this._items(dt);
      this._pose(dt);
      this._attach(dt);
      this._dynamics(dt);
      this._face(dt);
      if (this.skeleton) this._skeletonUpdate();
    }

    _move(dt, inp, world) {
      const A = this.act;
      let mx = inp.x, mz = inp.z;
      const mag = Math.min(1, Math.hypot(mx, mz));
      // input breaks a full-body emote
      if (mag > 0.15 && A && A.lock && A.cancel !== false && this.actT > 0.12) this.cancelAction();
      if (this.seat) {
        if (mag > 0.3 && this.sitT > 0.5) this._standUp();
        else return this._sitMove(dt);
      }
      if (this.unseat) {
        this.sitK = Math.max(0, this.sitK - dt * 3);
        const U = this.unseat; U.t += dt; const k = smooth(U.t / 0.35);
        this.pos.x = lerp(U.from.x, U.to.x, k); this.pos.z = lerp(U.from.z, U.to.z, k);
        if (U.t >= 0.35) this.unseat = null;
        this.speed = 0; this.vel.set(0, 0, 0);
        return;
      }
      this.sitK = Math.max(0, this.sitK - dt * 3);
      const locked = this.act && this.act.lock;
      const want = locked ? 0 : mag * (inp.run ? RUN : WALK);
      if (mag > 0.12 && !locked) this.tYaw = Math.atan2(mx, mz);
      // turning: quick, and sharper when slow; a big reversal slows her first
      const dy = wrap(this.tYaw - this.yaw);
      const turnK = 1 - Math.exp(-(this.onGround ? lerp(14, 8, this.runK) : 4) * dt);
      const step = clamp(dy * turnK, -11 * dt, 11 * dt);
      this.yaw = wrap(this.yaw + step);
      const yr = step / dt; this.yawRate += (yr - this.yawRate) * (1 - Math.exp(-12 * dt));
      const align = Math.max(0, Math.cos(dy));
      const target = want * (0.25 + 0.75 * align);
      const acc = target > this.speed ? (this.onGround ? 7.5 : 3) : 11;
      this.speed += clamp(target - this.speed, -acc * dt, acc * dt);
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      const vx = fx * this.speed, vz = fz * this.speed;
      const ax = (vx - this.vel.x) / dt, az = (vz - this.vel.z) / dt;
      this.accel = this.accel || V3(0, 0, 0); this.accel.set(ax, 0, az);
      this.vel.set(vx, this.vy, vz);
      this.pos.x += vx * dt; this.pos.z += vz * dt;
      // jump, gravity, the umbrella float
      if (inp.jump && this.onGround && !locked) { this.vy = JUMP_V; this.onGround = false; this.air = 0; this.cancelAction(true); }
      const U = this.items.umbrella;
      this.floating = !this.onGround && this.vy < 0 && inp.jumpHeld && U.st === 'hold' && U.open > 0.8;
      if (!this.onGround) {
        this.air += dt;
        this.vy -= GRAV * dt * (this.floating ? 0.35 : 1);
        if (this.floating) this.vy = Math.max(this.vy, FLOAT_V);
        this.pos.y += this.vy * dt;
        if (this.pos.y <= 0) {
          this.pos.y = 0; this.onGround = true;
          const hit = -this.vy;
          this.landK = clamp(hit / 7, 0.25, 1);
          if (hit > 2.5 && this.fx) this.fx.dust(this.pos, 8, 0.6);
          this.vy = 0;
        }
      }
      if (world) world.collide(this.pos, 0.28);
      this.landK = Math.max(0, this.landK - dt * 3.2);
      // gait phase: by distance, plus little steps when turning on the spot
      const cyc = lerp(1.2, 2.3, this.runK);
      this.runK += (smooth((this.speed - WALK * 1.1) / (RUN * 0.72 - WALK * 1.1)) - this.runK) * (1 - Math.exp(-8 * dt));
      this.moveK += (smooth(this.speed / 0.55) - this.moveK) * (1 - Math.exp(-10 * dt));
      this.stepK += (clamp(Math.abs(this.yawRate) / 5, 0, 1) * (1 - this.moveK) - this.stepK) * (1 - Math.exp(-8 * dt));
      if (this.onGround) {
        const before = this.phase;
        this.phase = (this.phase + this.speed * dt / cyc + this.stepK * dt * 1.8) % 1;
        // dust kicks on hard running steps
        if (this.fx && this.runK > 0.6 && ((before < 0.05 && this.phase >= 0.05) || (before < 0.55 && this.phase >= 0.55))) this.fx.dust(this._footWorld(this.phase < 0.5 ? 'L' : 'R'), 2, 0.25);
      }
      this.idleT = (this.moveK < 0.05 && !this.act && this.onGround) ? this.idleT + dt : 0;
      if (this.idleT > 7) { this.idleT = 0; this._fidget(); }
      this.root.rotation.y = this.yaw;
    }

    _sitMove(dt) {
      const s = this.seat;
      this.sitT += dt; this.speed = 0; this.vel.set(0, 0, 0); this.accel && this.accel.set(0, 0, 0);
      const k = smooth(this.sitT / 0.55);
      this.sitK = Math.min(1, this.sitT / 0.55);
      this.pos.x = lerp(this.sitFrom.x, s.x, k); this.pos.z = lerp(this.sitFrom.z, s.z, k);
      this.yaw = wrap(this.yaw + wrap(s.yaw - this.yaw) * (1 - Math.exp(-10 * dt))); this.tYaw = this.yaw;
      this.root.rotation.y = this.yaw;
      this.moveK += (0 - this.moveK) * (1 - Math.exp(-10 * dt)); this.runK = 0; this.stepK = 0;
      this.onGround = true; this.vy = 0;
    }

    _fidget() {
      const U = this.items.umbrella;
      const pool = ['lookAround', 'hatFix', 'heelRock'];
      if (U.st === 'hold' && U.openT > 0.5) pool.push('lazyTwirl', 'lazyTwirl');
      this.play(pool[Math.floor(Math.random() * pool.length)]);
    }

    /* --------------------------------------------------- accessories -- */
    _appear(name) {
      const I = this.items[name];
      I.vis = Math.max(I.vis, 0.001); I.grip.visible = true;
      if (this.fx) this.fx.cardPuff(this._handWorld(I.side), 9);
    }
    _items(dt) {
      const U = this.items.umbrella;
      U.side = 'R';
      for (const k in this.items) {
        const I = this.items[k];
        if (I.st === 'leaving') {
          I.vis -= dt * 4.5;
          if (I.vis <= 0) { I.vis = 0; I.st = 'away'; I.grip.visible = false; if (this.fx) this.fx.cardPuff(this._handWorld(I.side), 7); }
        } else if (I.st !== 'away') I.vis = Math.min(1, I.vis + dt * 4);
        const want = this.rig.parts['hand' + I.side];
        if (I.st !== 'away' && I.grip.parent !== want) want.add(I.grip);
        const sc = I.vis <= 0 ? 0.001 : (I.vis < 1 ? smooth(I.vis) * (1 + Math.sin(I.vis * Math.PI) * 0.25) : 1);
        I.obj.root.scale.setScalar(Math.max(0.001, sc));
      }
      // the canopy opens and closes on its hinges
      const target = (U.st === 'hold' || U.st === 'leaving') ? U.openT : 0;
      U.open += clamp(target - U.open, -dt * 3.2, dt * 3.2);
      this.umb.setOpen(clamp(U.open, 0, 1));
      U.cspin += U.spinV * dt; U.spinV *= Math.exp(-dt * 1.2);          // the canopy's own twirl about the shaft
      this.umb.canopy.rotation.y = U.cspin;
    }
    /* where each item wants the hand (chest space, voxels): grip point g, item direction d, finger direction f */
    _holdTarget(name, side) {
      const I = this.items[name], sx = side === 'L' ? 1 : -1, ph = this.phase * TAU, mk = this.moveK;
      const swing = Math.sin(ph + (side === 'R' ? 0 : Math.PI)) * mk;
      if (I.st === 'carry' || (I.open < 0.25 && I.openT < 0.5 && I.st === 'carry')) return { g: mir(side, 5, 1.5 + swing * 0.5, 7.5), d: V3(sx * 0.35, 0.7, -0.62), f: V3(-sx, 0.2, 0) };
      if (I.open < 0.35 && I.openT < 0.5) return { g: mir(side, 10.5, -7 + swing * 1.2, 10.5 + swing * 3.5 * (1 - this.runK)), d: V3(sx * 0.03, -1, 0.1 - swing * 0.1), f: V3(-sx, 0, 0.35) };
      if (this.floating || (!this.onGround && I.open > 0.8)) return { g: mir(side, 8.5, 25, 1.5), d: V3(-sx * 0.16, 1, 0), f: V3(-sx, 0, 0.3) };
      const bob = Math.sin(this.t * 1.7) * 0.4 + swing * 0.6;
      if (I.tilt === 1) return { g: mir(side, 11, 17 + bob, 4), d: V3(-sx * 0.28, 1, -0.05), f: V3(-sx, 0, 0.3) };
      if (I.tilt === 2) return { g: mir(side, 7, 3 + bob, 9.5), d: V3(sx * 0.2, 0.78, 0.6), f: V3(-sx, 0, 0) };
      return { g: mir(side, 7, 0.5 + bob, 7.5), d: V3(sx * 0.38, 0.84, -0.42 - this.runK * 0.2), f: V3(-sx, -0.1, 0.25) };
    }
    _attach(dt) {
      for (const k in this.items) {
        const I = this.items[k];
        // the grip: item +Y along the fist's +Z (thumb side); a twirl spins it about the fist's X axis
        I.grip.position.set(0, -GRIP * S, 0);
        I.grip.rotation.set(Math.PI / 2 + (I.spin || 0), 0, 0);
      }
    }

    /* ------------------------------------------------------------ pose -- */
    _pose(dt) {
      const P = this.rig.parts, E = {}, t = this.t;
      const set = (n, x, y, z) => { E[n] = [x || 0, y || 0, z || 0]; };
      const add = (n, x, y, z) => { const e = E[n] || (E[n] = [0, 0, 0]); e[0] += x || 0; e[1] += y || 0; e[2] += z || 0; };
      for (const n of DRIVEN) set(n);
      const mk = this.moveK, rk = this.runK;
      let hipsExtra = 0;

      /* --- idle (always underneath) --- */
      const br = Math.sin(t * 2.1), sw = Math.sin(t * 0.7);
      set('hips', 0, sw * 0.04, sw * 0.035);
      set('spine', 0.02, -sw * 0.03, -sw * 0.02);
      set('chest', br * 0.018, 0, 0);
      set('neck', 0, 0, 0); set('head', -0.02, Math.sin(t * 0.37) * 0.08, 0.07 + Math.sin(t * 0.5) * 0.02);
      set('uArmL', -0.08, 0, 0.4 + br * 0.015); set('fArmL', -0.55, 0, 0); set('handL', 0, 0.2, -0.15);
      set('uArmR', -0.08, 0, -0.4 - br * 0.015); set('fArmR', -0.55, 0, 0); set('handR', 0, -0.2, 0.15);
      set('thighL', 0.02, -0.08, 0.04 - sw * 0.035); set('shinL', 0.04, 0, 0); set('footL', -0.06, 0.08, sw * 0.035 - 0.04);
      set('thighR', -0.05, 0.08, -0.04 - sw * 0.035); set('shinR', 0.22, 0, 0); set('footR', -0.17, -0.08, sw * 0.035 + 0.04);

      /* --- walk / run --- */
      if (mk > 0.001 || this.stepK > 0.001) {
        const amp = Math.max(mk, this.stepK * 0.45);
        const [tL, kL, fL] = legGait(this.phase, rk), [tR, kR, fR] = legGait((this.phase + 0.5) % 1, rk);
        const ph = this.phase * TAU;
        const W = (n, x, y, z) => { const e = E[n]; e[0] = lerp(e[0], x, amp); e[1] = lerp(e[1], y, amp); e[2] = lerp(e[2], z, amp); };
        W('thighL', tL, 0, 0.03); W('shinL', kL, 0, 0); W('footL', fL, 0, -0.02);
        W('thighR', tR, 0, -0.03); W('shinR', kR, 0, 0); W('footR', fR, 0, 0.02);
        const pyaw = Math.sin(ph) * lerp(0.12, 0.2, rk);
        W('hips', 0, -pyaw, Math.cos(ph) * lerp(0.05, 0.03, rk));
        W('spine', lerp(0.04, 0.16, rk), pyaw * 0.55, -Math.cos(ph) * 0.03);
        W('chest', lerp(0.0, 0.06, rk), pyaw * 0.5, 0);
        W('head', -lerp(0.03, 0.18, rk), pyaw * 0.1, Math.cos(ph) * 0.03);
        const ka = lerp(0.65, 1.0, rk);
        W('uArmL', lerp(-0.05, -0.25, rk) + tL * ka, 0, lerp(0.4, 0.28, rk)); W('fArmL', lerp(-0.4, -1.45, rk) - Math.max(0, -tL) * 0.4, 0, 0);
        W('uArmR', lerp(-0.05, -0.25, rk) + tR * ka, 0, -lerp(0.4, 0.28, rk)); W('fArmR', lerp(-0.4, -1.45, rk) - Math.max(0, -tR) * 0.4, 0, 0);
        W('handL', -0.1, 0.1, -0.1); W('handR', -0.1, -0.1, 0.1);
        hipsExtra += rk * Math.abs(Math.sin(ph)) * 1.2 * mk;    // a little flight in the run
      }

      /* --- air --- */
      if (!this.onGround) {
        const up = this.vy > 0, k = smooth(this.air / 0.12);
        const fl = this.floating;
        const L = (n, x, y, z) => { const e = E[n]; e[0] = lerp(e[0], x, k); e[1] = lerp(e[1], y, k); e[2] = lerp(e[2], z, k); };
        if (fl) {
          const s = Math.sin(t * 2.4);
          L('thighL', -0.15 + s * 0.12, 0, 0.05); L('shinL', 0.35 - s * 0.15, 0, 0); L('footL', 0.45, 0, 0);
          L('thighR', 0.05 - s * 0.12, 0, -0.05); L('shinR', 0.5 + s * 0.15, 0, 0); L('footR', 0.45, 0, 0);
          L('uArmL', -0.3, 0, 0.9); L('fArmL', -0.4, 0, 0); L('uArmR', -0.3, 0, -0.9); L('fArmR', -0.4, 0, 0);
          L('head', 0.05, 0, 0.1);
        } else if (up) {
          L('thighL', -0.75, 0, 0.06); L('shinL', 1.25, 0, 0); L('footL', 0.35, 0, 0);
          L('thighR', -0.2, 0, -0.06); L('shinR', 0.65, 0, 0); L('footR', 0.4, 0, 0);
          L('uArmL', -0.5, 0, 0.95); L('fArmL', -0.7, 0, 0); L('uArmR', -0.5, 0, -0.95); L('fArmR', -0.7, 0, 0);
          L('spine', 0.08, 0, 0); L('head', -0.1, 0, 0);
        } else {
          L('thighL', -0.35, 0, 0.08); L('shinL', 0.45, 0, 0); L('footL', 0.25, 0, 0);
          L('thighR', -0.1, 0, -0.08); L('shinR', 0.3, 0, 0); L('footR', 0.25, 0, 0);
          L('uArmL', -0.3, 0, 1.25); L('fArmL', -0.35, 0, 0); L('uArmR', -0.3, 0, -1.25); L('fArmR', -0.35, 0, 0);
          L('head', 0.06, 0, 0);
        }
      }
      /* --- landing squash --- */
      if (this.landK > 0) {
        const k = Math.sin(this.landK * Math.PI * 0.5);
        add('thighL', -0.55 * k, 0, 0); add('shinL', 1.05 * k, 0, 0); add('footL', -0.5 * k, 0, 0);
        add('thighR', -0.5 * k, 0, 0); add('shinR', 1.0 * k, 0, 0); add('footR', -0.5 * k, 0, 0);
        add('spine', 0.18 * k, 0, 0); add('head', -0.15 * k, 0, 0);
        add('uArmL', 0, 0, 0.35 * k); add('uArmR', 0, 0, -0.35 * k);
      }
      /* --- sitting --- */
      if (this.seat || this.sitK > 0) {
        const k = this.seat ? smooth(this.sitK) : this.sitK;
        const sL = Math.sin(t * 2.2), sR = Math.sin(t * 2.2 + 1.3);
        const L = (n, x, y, z) => { const e = E[n]; e[0] = lerp(e[0], x, k); e[1] = lerp(e[1], y, k); e[2] = lerp(e[2], z, k); };
        L('hips', -0.05, 0, 0); L('spine', 0.06, 0, 0); L('chest', -0.03, 0, 0);
        L('thighL', -1.45, -0.08, 0.06); L('shinL', 1.25 + sL * 0.25, 0, 0); L('footL', 0.15, 0, 0);
        L('thighR', -1.45, 0.08, -0.06); L('shinR', 1.35 + sR * 0.25, 0, 0); L('footR', 0.15, 0, 0);
        L('uArmL', 0.25, 0, 0.55); L('fArmL', -0.35, 0, 0); L('uArmR', 0.25, 0, -0.55); L('fArmR', -0.35, 0, 0);
        L('head', 0.04, Math.sin(t * 0.4) * 0.15, 0.12);
      }

      /* --- turning: lean in, look ahead --- */
      const lean = clamp(-this.yawRate * this.speed * 0.025, -0.2, 0.2);
      this.body.rotation.z += (lean - this.body.rotation.z) * (1 - Math.exp(-8 * dt));
      add('head', 0, clamp(wrap(this.tYaw - this.yaw) * 0.45, -0.5, 0.5), 0);

      /* convert to quaternions */
      const tq = this.tq;
      for (const n of DRIVEN) qE(E[n][0], E[n][1], E[n][2], tq[n]);
      const hands = { L: 'relax', R: 'relax' };
      if (mk > 0.5 && rk > 0.5) { hands.L = 'grip'; hands.R = 'grip'; }

      /* --- items: the arms holding them go on IK --- */
      for (const side of ['L', 'R']) {
        let which = null;
        for (const k in this.items) { const I = this.items[k]; if (I.st !== 'away' && I.side === side && I.vis > 0) which = k; }
        const w = which ? 1 : 0;
        this.holdW[side] += (w - this.holdW[side]) * (1 - Math.exp(-10 * dt));
        if (this.holdW[side] > 0.001 && (which || this._lastHold && this._lastHold[side])) {
          const name = which || this._lastHold[side];
          const H = this._holdTarget(name, side), R = solveArm(side, H.g, H.d, H.f);
          const hw = this.holdW[side];
          tq['uArm' + side].slerp(R.uArm, hw); tq['fArm' + side].slerp(R.fArm, hw); tq['hand' + side].slerp(R.hand, hw);
          if (hw > 0.5) hands[side] = 'grip';
        }
        (this._lastHold || (this._lastHold = {}))[side] = which || (this._lastHold && this._lastHold[side]);
      }

      /* --- the action overlay --- */
      let bodySpin = 0, bodyLift = 0, actFace = null, hatTgt = 0;
      if (this.act) {
        const A = this.act;
        this.actT += dt;
        if (this.actT >= A.dur) { if (A.end) A.end(this); this.act = null; }
        else {
          const w = env(this.actT, A.dur, A.fi || 0.18, A.fo || 0.25);
          const O = { e: {}, ik: {}, hands: {}, face: null, spin: 0, lift: 0, hips: 0, hat: 0 };
          A.run(this, this.actT, O, A.dur);
          for (const n in O.e) { qE(O.e[n][0], O.e[n][1], O.e[n][2], _q); tq[n].slerp(_q, w); }
          for (const side in O.ik) {
            const K = O.ik[side], R = solveArm(side, K.g, K.d, K.f, K.pole);
            tq['uArm' + side].slerp(R.uArm, w); tq['fArm' + side].slerp(R.fArm, w); tq['hand' + side].slerp(R.hand, w);
          }
          for (const side in O.hands) if (w > 0.4) hands[side] = O.hands[side];
          if (O.face && w > 0.3) actFace = O.face;
          bodySpin = O.spin; bodyLift = O.lift * w; hipsExtra += O.hips * w; hatTgt = O.hat * w;
        }
      }
      this.actFace = actFace;
      this.body.rotation.y = bodySpin;
      this.body.position.y += (bodyLift * S - this.body.position.y) * (1 - Math.exp(-14 * dt));
      this.hatLift = (this.hatLift || 0) + (hatTgt - (this.hatLift || 0)) * (1 - Math.exp(-14 * dt));
      this.rig.parts.hat.position.y = this.hatLift * S;

      /* --- ease every joint toward its target --- */
      const fast = 1 - Math.exp(-(mk > 0.3 ? 30 : 16) * dt), legK = 1 - Math.exp(-(mk > 0.3 ? 45 : 18) * dt), armK = 1 - Math.exp(-18 * dt);
      for (const n of DRIVEN) {
        const k = n.startsWith('thigh') || n.startsWith('shin') || n.startsWith('foot') ? legK : (n.includes('Arm') || n.startsWith('hand') ? armK : fast);
        P[n].quaternion.slerp(tq[n], this.act && this.act.snap ? Math.max(k, 1 - Math.exp(-40 * dt)) : k);
      }
      for (const side of ['L', 'R']) this.rig.setVariant('hand' + side, hands[side]);

      /* --- keep the lower foot on the ground --- */
      let drop = this._groundDrop();
      if (!this.onGround) drop = this._airDrop(drop);
      if (this.seat || this.sitK > 0) {
        const s = this.seat || this._lastSeat;
        if (this.seat) this._lastSeat = this.seat;
        const seatY = s ? (s.h / S + 5.5) - T.J.pelvis : 0;     // pelvis bottom on the seat
        drop = lerp(drop, seatY, this.seat ? smooth(this.sitK) : this.sitK);
      }
      const want = drop + hipsExtra;
      this.hipsCur += (want - this.hipsCur) * (1 - Math.exp(-(this.landK > 0 ? 30 : 22) * dt));
      P.hips.position.y = this.hipsCur * S;          // (the joint sits in its frame, which already holds the rest height)
    }
    /* how far the hips must drop (voxels) for the lowest point of either foot to touch the ground */
    _groundDrop() {
      const P = this.rig.parts;
      let low = 1e9;
      for (const s of ['L', 'R']) {
        const hx = s === 'L' ? 3 : -3;
        _q.copy(P.hips.quaternion).multiply(P['thigh' + s].quaternion);
        const knee = _v.set(0, -(T.J.hip - T.J.knee), 0).applyQuaternion(_q).add(_v2.set(hx, T.J.hip - T.J.pelvis, 0));
        _q.multiply(P['shin' + s].quaternion);
        const ankle = knee.clone().add(_v2.set(0, -(T.J.knee - T.J.ankle), 0).applyQuaternion(_q));
        _q.multiply(P['foot' + s].quaternion);
        for (const z of [-3.5, 6.5]) { const p = _v2.set(0, -T.J.ankle - 0.5, z).applyQuaternion(_q).add(ankle); low = Math.min(low, p.y); }
      }
      return (-T.J.pelvis - 0.5) - low;
    }
    _airDrop(d) { return Math.min(0, d * 0.4); }

    /* -------------------------------------------- secondary motion -- */
    _initDynamics() {
      const P = this.rig.parts, F = this.rig.frames, M = this.meta;
      this.dyn = [];
      const mk = (name, o) => {
        const d = Object.assign({ name, joint: P[name], frame: F[name], ax: 0, az: 0, vx: 0, vz: 0, prev: null, acc: V3(0, 0, 0), vel: V3(0, 0, 0) }, o);
        this.dyn.push(d); return d;
      };
      for (const ch of M.chains) {
        ch.names.forEach((n, i) => {
          if (ch.kind === 'hair') mk(n, { k: ch.front ? 90 : 70, c: ch.front ? 9 : 8, follow: i === 0 ? 0.55 : 0.85, inert: 0.012, xMin: ch.front ? -0.7 : -0.04, xMax: ch.front ? 0.12 : 0.9, zLim: 0.45 });
          else mk(n, { k: 60, c: 7, follow: 0.6, inert: 0.01, xMin: 0, xMax: 1.0, zLim: 0.35, tail: true });
        });
      }
      for (const d of M.dangles) mk(d.name, { k: 40, c: 3.2, follow: 1, inert: 0.02, xMin: -1.2, xMax: d.xMax != null ? d.xMax : 1.2, zLim: 1.0 });
      this.panels = M.panels.map(p => ({ name: p.name, joint: P[p.name], th: p.th, f: 0, v: 0, dx: Math.sin(p.th), dz: Math.cos(p.th) }));
      this._prevBody = null; this._spinPrev = 0; this.spinRate = 0;
    }
    _dynamics(dt) {
      const P = this.rig.parts;
      this.root.updateMatrixWorld(true);
      const g = V3(0, -9.8, 0);
      for (const d of this.dyn) {
        const fr = d.own ? d.joint.parent : d.frame;
        fr.getWorldPosition(_v);
        if (!d.prev) { d.prev = _v.clone(); d.pv = V3(0, 0, 0); }
        const vel = _v2.copy(_v).sub(d.prev).divideScalar(Math.max(dt, 1e-4));
        const acc = vel.clone().sub(d.pv).divideScalar(Math.max(dt, 1e-4));
        if (acc.length() > 60) acc.setLength(60);
        d.acc.lerp(acc, 0.35);
        d.pv.copy(vel); d.prev.copy(_v);
        // effective gravity (gravity minus the pivot's acceleration, plus air drag from its velocity), in the frame's space
        const ge = g.clone().sub(d.acc.clone().multiplyScalar(0.55)).sub(vel.clone().multiplyScalar(1.1));
        fr.getWorldQuaternion(_q).invert();
        ge.applyQuaternion(_q).normalize();
        let tx = Math.atan2(-ge.z, -ge.y), tz = Math.atan2(ge.x, -ge.y);
        tx *= d.follow; tz *= d.follow;
        if (d.tail) { tx += this._backFlare * 0.9; }
        tx = clamp(tx, d.xMin, d.xMax); tz = clamp(tz, -d.zLim, d.zLim);
        d.vx += (d.k * (tx - d.ax) - d.c * d.vx) * dt; d.vz += (d.k * (tz - d.az) - d.c * d.vz) * dt;
        d.ax += d.vx * dt; d.az += d.vz * dt;
        d.ax = clamp(d.ax, d.xMin - 0.1, d.xMax + 0.1); d.az = clamp(d.az, -d.zLim - 0.1, d.zLim + 0.1);
        d.joint.rotation.set(d.ax, 0, d.az);
      }
      // the skirt: twelve panels flare from the knees under them, the spin, the fall and the sway
      const spin = this.body.rotation.y, sr = wrap(spin - this._spinPrev) / Math.max(dt, 1e-4); this._spinPrev = spin;
      this.spinRate += (sr - this.spinRate) * (1 - Math.exp(-10 * dt));
      const knees = ['L', 'R'].map(s => {
        const k = _v.set(0, -14, 0).applyQuaternion(P['thigh' + s].quaternion);
        _q2.copy(P['thigh' + s].quaternion).multiply(P['shin' + s].quaternion);
        const foot = _v2.set(0, -13, 0).applyQuaternion(_q2).add(k);
        return { x: (s === 'L' ? 3 : -3) + k.x, z: k.z, fz: foot.z, fx: (s === 'L' ? 3 : -3) + foot.x, ky: k.y };
      });
      // horizontal velocity and acceleration in her own frame
      const cy = Math.cos(-this.yaw), sy = Math.sin(-this.yaw);
      const vxL = this.vel.x * cy + this.vel.z * sy, vzL = -this.vel.x * sy + this.vel.z * cy;
      const a = this.accel || V3(0, 0, 0), axL = a.x * cy + a.z * sy, azL = -a.x * sy + a.z * cy;
      const fall = !this.onGround ? clamp(-this.vy * 0.11, -0.12, 0.55) : 0;
      let back = 0;
      for (const p of this.panels) {
        let push = 0;
        for (const k of knees) {
          const along = k.x * p.dx + k.z * p.dz;
          push = Math.max(push, (along - 3.6) * 0.07, (k.fx * p.dx + k.fz * p.dz - 8) * 0.055);
        }
        let t = 0.02 + push;
        t += clamp(Math.abs(this.spinRate) * 0.1, 0, 0.85);
        t += fall;
        t += clamp(-(axL * p.dx + azL * p.dz) * 0.018, -0.12, 0.25);
        t += clamp(-(vxL * p.dx + vzL * p.dz) * 0.035, -0.14, 0.22);
        t += (this.panelLift && this.panelLift(p)) || 0;
        p.v += (150 * (t - p.f) - 13 * p.v) * dt; p.f += p.v * dt;
        p.f = clamp(p.f, -0.2, 1.3);
        p.joint.rotation.x = -p.f;
        if (p.name === 'skirt6' || p.name === 'skirt5' || p.name === 'skirt7') back = Math.max(back, p.f);
      }
      this._backFlare = back;
    }

    /* ------------------------------------------------------------ face -- */
    _face(dt) {
      let f = this.actFace || this.faceBase;
      if (!this.actFace && this.floating) f = 'happy';
      this.blinkT -= dt;
      if (this.blinkT <= 0) { this.blinking = 0.13; this.blinkT = 2 + Math.random() * 3.5; }
      if (this.blinking > 0) { this.blinking -= dt; if (f === 'smug' || f === 'smile' || f === 'pout' || f === 'surprised') f = 'blink'; }
      this.rig.setVariant('head', f);
    }

    /* ---------------------------------------------------------- helpers -- */
    _handWorld(side) { const v = V3(0, -GRIP * S, 0); this.root.updateMatrixWorld(true); return this.rig.parts['hand' + side].localToWorld(v); }
    _footWorld(side) { const v = V3(0, -7 * S, 2 * S); return this.rig.parts['foot' + side].localToWorld(v); }

    /* ---------------------------------------------------- skeleton view -- */
    setSkeleton(on) {
      const mats = [this.rig.mat, this.rig.gmat, this.umb.mat, this.umb.gmat];
      for (const m of mats) { m.transparent = on; m.opacity = on ? 0.16 : 1; m.depthWrite = !on; m.needsUpdate = true; }
      if (on && !this.skeleton) {
        const names = Object.keys(this.rig.parts);
        const pairs = names.filter(n => this.rig.model.parts[n].parent).map(n => [this.rig.model.parts[n].parent, n]);
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(pairs.length * 6), 3));
        const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x8fd0ff, depthTest: false, transparent: true, opacity: 0.95 }));
        lines.renderOrder = 10; lines.frustumCulled = false;
        const dots = new THREE.InstancedMesh(new THREE.BoxGeometry(0.022, 0.022, 0.022), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }), names.length);
        dots.renderOrder = 11; dots.frustumCulled = false;
        this.root.parent.add(lines); this.root.parent.add(dots);
        this.skeleton = { lines, dots, names, pairs };
      }
      if (this.skeleton) { this.skeleton.lines.visible = on; this.skeleton.dots.visible = on; if (!on) { this._skelOff = this.skeleton; this.skeleton = null; } }
      else if (on && this._skelOff) { this.skeleton = this._skelOff; this.skeleton.lines.visible = this.skeleton.dots.visible = true; }
    }
    _skeletonUpdate() {
      const K = this.skeleton, P = this.rig.parts, pos = K.lines.geometry.attributes.position;
      this.root.updateMatrixWorld(true);
      const w = {};
      K.names.forEach((n, i) => { w[n] = P[n].getWorldPosition(new THREE.Vector3()); _m.makeTranslation(w[n].x, w[n].y, w[n].z); K.dots.setMatrixAt(i, _m); });
      K.dots.instanceMatrix.needsUpdate = true;
      K.pairs.forEach(([a, b], i) => { pos.setXYZ(i * 2, w[a].x, w[a].y, w[a].z); pos.setXYZ(i * 2 + 1, w[b].x, w[b].y, w[b].z); });
      pos.needsUpdate = true;
    }

    /* the state the HUD shows */
    status() {
      const U = this.items.umbrella;
      const us = U.st === 'away' || U.st === 'leaving' ? 'Away' : U.st === 'carry' ? 'Carried' : (U.openT > 0.5 ? ['Open · shoulder', 'Open · overhead', 'Open · in front'][U.tilt] : 'Closed · in hand');
      return { umbrella: us, face: this.faceBase, seat: !!this.seat, near: !this.seat && !!this.nearSeat(), action: this.act ? this.act.name : null, floating: this.floating };
    }
  }

  /* ========================================================== ACTIONS == */
  // run(c, t, O, dur): O.e[part] = [x,y,z] (Euler), O.ik[side] = {g,d,f} (chest space), O.hands[side], O.face, O.spin, O.lift, O.hips
  const free = c => c.items.umbrella.st !== 'away' && c.items.umbrella.st !== 'leaving' ? 'L' : 'R';
  const ACTIONS = {
    /* a real wave: the elbow out to her side at about shoulder height, held still, and the forearm swinging side to
       side about it; the hand stays in line with the forearm, palm out, and flicks a little behind each swing */
    wave: {
      dur: 2.2, lock: false, fi: 0.25, fo: 0.3, run(c, t, O, dur) {
        const s = free(c), sx = s === 'L' ? 1 : -1;
        const w = 12.5, ph = Math.max(0, t - 0.2) * w, ramp = Math.min(1, t / 0.35);
        const a = 0.42 * Math.sin(ph) * ramp;                          // the forearm's swing about the elbow
        const b = a + 0.2 * Math.sin(ph - 1.2) * ramp;                 // the hand trails it a little (follow-through)
        const Sh = SH[s], E = Sh.clone().add(V3(sx * 0.6, -0.65, 0.45).normalize().multiplyScalar(UPPER));
        const fore = V3(sx * Math.sin(a), Math.cos(a), 0.12).normalize();
        const W = E.clone().addScaledVector(fore, FORE);               // the wrist, on the forearm's circle
        const f = V3(sx * Math.sin(b), Math.cos(b), 0.12).normalize(); // fingers up, in line with the forearm
        const d = V3(-sx * Math.cos(b), Math.sin(b), 0);               // thumb toward her head, square to the fingers
        O.ik[s] = { g: W.clone().addScaledVector(f, GRIP), d, f, pole: E.clone().sub(Sh.clone().add(W).multiplyScalar(0.5)) };
        O.hands[s] = 'open'; O.face = 'smile';
        O.e.head = [-0.03, sx * 0.12, sx * 0.16];
        O.e.chest = [0, sx * 0.08, -sx * 0.04];
      },
    },
    point: {
      dur: 1.8, lock: false, run(c, t, O) {
        const s = 'R', sx = -1, o = 'L';
        const thrust = Math.min(1, t / 0.25);
        O.ik[s] = { g: mir(s, 8, 4.5, 10 + thrust * 7), d: V3(0, 1, 0), f: V3(0, -0.1, 1), pole: V3(sx, -0.5, -0.5) };
        O.hands[s] = 'point';
        if (c.holdW[o] < 0.5) {
          O.ik[o] = { g: mir(o, 7.5, -5, 1.5), d: V3(0, 1, -0.4), f: V3(o === 'L' ? -1 : 1, -0.4, 0), pole: V3(o === 'L' ? 1 : -1, 0.2, -0.6) };
          O.hands[o] = 'relax';
        }
        O.e.chest = [0, sx * 0.25, 0]; O.e.head = [0.02, -sx * 0.15, -sx * 0.1];
        O.face = 'smug';
      },
    },
    curtsy: {
      dur: 2.3, lock: true, run(c, t, O, dur) {
        const k = Math.sin(clamp((t - 0.25) / (dur - 0.6), 0, 1) * Math.PI);
        for (const s of ['L', 'R']) O.ik[s] = { g: mir(s, 13.5, -10 + k * 3, 4.5), d: V3(0, 0.3, 1), f: V3(0, -1, 0.2), pole: V3(s === 'L' ? 1 : -1, -0.2, -0.6) };
        O.hands.L = O.hands.R = 'grip';
        O.e.thighR = [0.35 * k, 0.2 * k, 0.15 * k]; O.e.shinR = [0.9 * k, 0, 0]; O.e.footR = [0.3 * k, 0, 0];
        O.e.thighL = [-0.3 * k, 0, 0]; O.e.shinL = [0.75 * k, 0, 0]; O.e.footL = [-0.45 * k, 0, 0];
        O.e.spine = [0.18 * k, 0, 0]; O.e.chest = [0.08 * k, 0, 0]; O.e.head = [0.3 * k, 0, 0.1 * k];
        O.face = k > 0.3 ? 'happy' : 'smile';
        c.panelLift = p => Math.abs(p.dx) > 0.6 ? 0.45 * k : 0;
      },
      end(c) { c.panelLift = null; },
    },
    spin: {
      dur: 1.25, lock: true, fi: 0.1, fo: 0.15, run(c, t, O, dur) {
        const k = smooth(clamp((t - 0.08) / (dur - 0.2), 0, 1));
        O.spin = k * TAU;
        const up = Math.sin(clamp(t / dur, 0, 1) * Math.PI);
        if (c.holdW.L < 0.5) { O.e.uArmL = [-0.2, 0, 1.2 * up + 0.4]; O.e.fArmL = [-0.3, 0, 0]; O.hands.L = 'open'; }
        if (c.holdW.R < 0.5) { O.e.uArmR = [-0.2, 0, -1.2 * up - 0.4]; O.e.fArmR = [-0.3, 0, 0]; O.hands.R = 'open'; }
        O.e.footL = [0.5 * up, 0, 0]; O.e.footR = [0.5 * up, 0, 0];
        O.e.thighR = [0.1, 0, -0.1 * up]; O.e.shinR = [0.6 * up, 0, 0];
        O.e.head = [-0.08 * up, 0, 0.12]; O.lift = 2.2 * up;
        O.face = 'happy';
        const U = c.items.umbrella; if (U.open > 0.5) U.spinV = Math.max(U.spinV, 9);
      },
    },
    peace: {
      dur: 2.4, lock: true, run(c, t, O, dur) {
        const s = c.holdW.R > 0.5 ? 'L' : 'R', sx = s === 'L' ? 1 : -1, o = s === 'L' ? 'R' : 'L';
        O.ik[s] = { g: mir(s, 6.5, 13, 9), d: V3(-sx * 0.4, 0.1, 1), f: V3(0, 1, 0.1), pole: V3(sx, -0.8, 0) };
        O.hands[s] = 'peace';
        if (c.holdW[o] < 0.5) { O.ik[o] = { g: mir(o, 8, -5, 1.5), d: V3(0, 1, -0.4), f: V3(o === 'L' ? -1 : 1, -0.4, 0), pole: V3(o === 'L' ? 1 : -1, 0.2, -0.6) }; }
        const kick = smooth(clamp((t - 0.1) / 0.3, 0, 1));
        const leg = s === 'R' ? 'L' : 'R';
        O.e['thigh' + leg] = [0.35 * kick, 0, 0]; O.e['shin' + leg] = [1.4 * kick, 0, 0]; O.e['foot' + leg] = [0.5 * kick, 0, 0];
        O.e.spine = [0.04, 0, sx * 0.08]; O.e.head = [0.02, -sx * 0.1, sx * 0.22];
        O.face = 'wink';
      },
    },
    hatTip: {
      dur: 1.5, lock: false, run(c, t, O, dur) {
        const s = c.holdW.L > 0.5 && c.holdW.R < 0.5 ? 'R' : 'L', sx = s === 'L' ? 1 : -1;
        const k = Math.sin(clamp(t / dur, 0, 1) * Math.PI);
        // she bows her head, which brings the brim down within reach, and the hat lifts a little off her hair as it
        // tilts (tilting it about its middle alone sank the brim's front into her bangs)
        O.e.spine = [0.1 * k, 0, 0]; O.e.neck = [0.08 * k, 0, 0]; O.e.head = [0.26 * k, 0, -sx * 0.22 * k];   // tipped toward that hand, so the elbow can bend out
        O.e.hat = [0.1 * k, 0, sx * 0.06 * k]; O.hat = 1.3 * k;
        // the fist closes on top of the brim, front and to her side, wherever the hat is now
        c.root.updateMatrixWorld(true);
        const wp = c.rig.parts.hat.localToWorld(V3(sx * 5.9 * S, 0.9 * S, 7.0 * S));
        const g = c.rig.parts.chest.worldToLocal(wp).divideScalar(S);
        O.ik[s] = { g, d: V3(-sx, 0.1, 0.2), f: V3(0, 0.3, 1), pole: V3(sx * 0.7, -0.35, 0.8) };   // elbow in front: the arm rises in front of her hair
        O.hands[s] = 'grip';
        O.face = 'smug';
      },
    },
    lookAround: {
      dur: 3.2, lock: false, run(c, t, O, dur) {
        const p = t / dur;
        O.e.head = [0.02, Math.sin(p * TAU) * 0.6, Math.sin(p * TAU) * 0.08 + 0.05];
        O.e.chest = [0, Math.sin(p * TAU) * 0.12, 0];
        O.face = p > 0.35 && p < 0.6 ? 'surprised' : null;
      },
    },
    hatFix: {
      dur: 1.6, lock: false, run(c, t, O, dur) {
        const s = c.holdW.L > 0.5 ? 'R' : 'L'; if (c.holdW[s] > 0.5) return;
        const sx = s === 'L' ? 1 : -1, k = Math.sin(clamp(t / dur, 0, 1) * Math.PI);
        c.root.updateMatrixWorld(true);
        const wp = c.rig.parts.hat.localToWorld(V3(sx * 5.9 * S, 0.9 * S, (7.0 + Math.sin(t * 8) * 0.8) * S));   // the brim, front and to her side
        O.ik[s] = { g: c.rig.parts.chest.worldToLocal(wp).divideScalar(S), d: V3(-sx, 0.3, 0), f: V3(0, 1, 0.3), pole: V3(sx * 0.7, -0.35, 0.8) };
        O.hands[s] = 'grip';
        O.e.hat = [0, 0, sx * 0.12 * k + Math.sin(t * 8) * 0.04 * k]; O.e.head = [-0.06 * k, 0, -sx * 0.1 * k]; O.hat = 1.0 * k;
        O.face = 'smile';
      },
    },
    heelRock: {
      dur: 2.6, lock: false, run(c, t, O) {
        const r = Math.sin(t * 4.8);
        O.e.footL = [Math.max(0, r) * 0.45 - Math.max(0, -r) * 0.25, 0, 0]; O.e.footR = [Math.max(0, r) * 0.45 - Math.max(0, -r) * 0.25, 0, 0];
        if (c.holdW.L < 0.5) { O.ik.L = { g: V3(3, -9, -6), d: V3(0, 0, -1), f: V3(-1, 0, 0) }; O.hands.L = 'relax'; }
        if (c.holdW.R < 0.5) { O.ik.R = { g: V3(-3, -9, -6), d: V3(0, 0, -1), f: V3(1, 0, 0) }; O.hands.R = 'relax'; }
        O.e.head = [0, 0, Math.sin(t * 2.4) * 0.1]; O.face = 'smile';
        O.hips = Math.max(0, r) * 1.3;
      },
    },
    lazyTwirl: {
      dur: 3.0, lock: false, run(c, t, O) { const U = c.items.umbrella; U.spinV = Math.max(U.spinV, 4); O.e.head = [0, 0.2, 0.15]; O.face = 'smile'; },
    },
    umbrellaTwirl: {
      dur: 2.6, lock: true, run(c, t, O, dur) {
        const U = c.items.umbrella; U.spinV = 14;
        const sw = Math.sin(t * 5);
        O.e.hips = [0, sw * 0.15, sw * 0.06]; O.e.spine = [0, -sw * 0.1, -sw * 0.08]; O.e.head = [0, sw * 0.2, 0.15 * sw];
        const o = U.side === 'R' ? 'L' : 'R';
        if (c.holdW[o] < 0.5) { O.e['uArm' + o] = [-0.3, 0, (o === 'L' ? 1 : -1) * (0.9 + sw * 0.2)]; O.e['fArm' + o] = [-0.5, 0, 0]; O.hands[o] = 'open'; }
        O.e.footL = [0.25 * Math.max(0, sw), 0, 0]; O.e.footR = [0.25 * Math.max(0, -sw), 0, 0];
        O.face = 'happy';
      },
    },
    enGarde: {
      dur: 2.2, lock: true, fi: 0.12,
      start(c) { if (c.items.umbrella.st === 'carry') c.items.umbrella.st = 'hold'; c.items.umbrella.openT = 0; },
      run(c, t, O, dur) {
        const U = c.items.umbrella, s = U.side, sx = s === 'L' ? 1 : -1, o = s === 'L' ? 'R' : 'L';
        const thr = t > 0.5 && t < 1.5 ? Math.max(0, Math.sin((t - 0.5) * Math.PI * 4)) : 0;
        O.ik[s] = { g: mir(s, 6, 3, 11 + thr * 6), d: V3(0, 0.08, 1), f: V3(-sx, 0, 0), pole: V3(sx, -0.6, -0.3) };
        if (c.holdW[o] < 0.5) { O.ik[o] = { g: mir(o, 9, 16, -6), d: V3(0, 1, 0), f: V3(0, 1, -0.3), pole: V3(o === 'L' ? 1 : -1, -0.2, 0.3) }; O.hands[o] = 'open'; }
        const lg = s === 'R' ? 'R' : 'L', bk = s === 'R' ? 'L' : 'R';
        O.e['thigh' + lg] = [-0.55 - thr * 0.15, 0, 0]; O.e['shin' + lg] = [0.6 + thr * 0.15, 0, 0]; O.e['foot' + lg] = [-0.05, 0, 0];
        O.e['thigh' + bk] = [0.35, 0, 0]; O.e['shin' + bk] = [0.25, 0, 0]; O.e['foot' + bk] = [0.0, 0, 0];
        O.e.hips = [0, sx * 0.5, 0]; O.e.spine = [0.05, sx * 0.3, 0]; O.e.chest = [0, sx * 0.25, 0]; O.e.head = [0, -sx * 0.95, 0];
        O.face = t > 0.5 && t < 1.6 ? 'pout' : 'smug';
      },
    },
    cardFan: {
      dur: 2.4, lock: true, start(c) { c._fanT = 0; }, run(c, t, O, dur) {
        O.ik.R = { g: V3(-7, 9 + Math.min(1, t * 2) * 2, 11), d: V3(0.3, 0.2, 1), f: V3(0, 1, 0.2), pole: V3(-1, -0.6, -0.2) };
        O.hands.R = 'grip';
        O.ik.L = { g: V3(7.5, -5, 1.5), d: V3(0, 1, -0.4), f: V3(-1, -0.4, 0), pole: V3(1, 0.2, -0.6) };
        O.e.head = [0.05, 0.12, -0.15]; O.face = t < 1.6 ? 'smug' : 'wink';
        if (c.fx) c.fx.fan(c, t, dur);
      },
      end(c) { if (c.fx) c.fx.fanEnd(c); },
    },
  };

  window.CHARACTER = { Character, ACTIONS, solveArm };
})();
