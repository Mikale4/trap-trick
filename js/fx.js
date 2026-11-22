/* ============================================================================
   fx.js -- little effects: the card puff when an accessory appears or
   vanishes, square dust where she lands or runs, and the card fan trick.
   ========================================================================== */
(function () {
  'use strict';
  const SUITS = ['heart', 'spade', 'diamond', 'club'];
  class FX {
    constructor(scene) {
      this.scene = scene; this.parts = [];
      this.mat = VX.litMat().clone(); this.mat.transparent = true;
      this.dustGeo = new THREE.BoxGeometry(1, 1, 1);
      this.dustMat = new THREE.MeshLambertMaterial({ color: 0xd9cdb8, transparent: true, opacity: 0.85 });
      this.fanCards = null;
    }
    cardPuff(pos, n) {
      for (let i = 0; i < n; i++) {
        const m = PROPS.cardMesh(SUITS[i % 4], this.mat);
        m.position.copy(pos);
        const a = Math.random() * Math.PI * 2, up = 0.6 + Math.random() * 1.6, sp = 0.6 + Math.random() * 1.2;
        this.scene.add(m);
        this.parts.push({ m, v: new THREE.Vector3(Math.cos(a) * sp, up, Math.sin(a) * sp), w: new THREE.Vector3(Math.random() * 12 - 6, Math.random() * 12 - 6, Math.random() * 8 - 4), life: 0.75, t: 0, g: 3.5, scale: 1, kind: 'card' });
      }
    }
    dust(pos, n, size) {
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(this.dustGeo, this.dustMat);
        const s = (0.05 + Math.random() * 0.06) * (size || 0.5) * 2;
        m.scale.setScalar(s); m.position.set(pos.x + (Math.random() - 0.5) * 0.3, 0.04 + Math.random() * 0.05, pos.z + (Math.random() - 0.5) * 0.3);
        const a = Math.random() * Math.PI * 2, sp = 0.4 + Math.random() * 0.9;
        this.scene.add(m);
        this.parts.push({ m, v: new THREE.Vector3(Math.cos(a) * sp, 0.3 + Math.random() * 0.6, Math.sin(a) * sp), w: new THREE.Vector3(0, 0, 0), life: 0.55, t: 0, g: 1.2, scale: s, kind: 'dust' });
      }
    }
    /* the card fan: five cards spread from her right hand, then flicked away */
    fan(c, t, dur) {
      const hand = c.rig.parts.handR;
      if (!this.fanCards && t > 0.25) {
        this.fanCards = [];
        for (let i = 0; i < 5; i++) {
          const m = PROPS.cardMesh(SUITS[i % 4], this.mat.clone()); hand.add(m);
          this.fanCards.push(m);
        }
        c.fx.cardPuff(c._handWorld('R'), 5);
      }
      if (this.fanCards) {
        const open = Math.min(1, (t - 0.25) / 0.45), S = c.meta.S;
        this.fanCards.forEach((m, i) => {
          const a = (i - 2) * 0.32 * open;
          m.position.set(0, -3 * S, 1.5 * S);
          m.rotation.set(0, 0, Math.PI); m.rotateZ(a); m.translateY(4 * S * open); m.translateZ(i * 0.004);   // faces out of the fist, fanned about the thumb
          m.scale.setScalar(Math.min(1, open * 1.5));
        });
        if (t > dur - 0.75) this.fanEnd(c, true);
      }
    }
    fanEnd(c, fling) {
      if (!this.fanCards) return;
      for (const m of this.fanCards) {
        const p = m.getWorldPosition(new THREE.Vector3()); m.parent.remove(m);
        if (fling) {
          m.position.copy(p); this.scene.add(m);
          const f = new THREE.Vector3(Math.sin(c.yaw), 0, Math.cos(c.yaw));
          this.parts.push({ m, v: f.multiplyScalar(3 + Math.random() * 2).add(new THREE.Vector3((Math.random() - 0.5) * 2, 1.5 + Math.random(), (Math.random() - 0.5) * 2)), w: new THREE.Vector3(Math.random() * 20 - 10, Math.random() * 20 - 10, 0), life: 0.9, t: 0, g: 2.5, scale: 1, kind: 'card' });
        }
      }
      this.fanCards = null;
    }
    update(dt) {
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i];
        p.t += dt;
        p.v.y -= p.g * dt; p.v.multiplyScalar(Math.exp(-dt * 1.5));
        p.m.position.addScaledVector(p.v, dt);
        p.m.rotation.x += p.w.x * dt; p.m.rotation.y += p.w.y * dt; p.m.rotation.z += p.w.z * dt;
        const k = 1 - p.t / p.life;
        p.m.scale.setScalar(Math.max(0.001, p.scale * (p.kind === 'dust' ? 0.6 + k * 0.6 : Math.min(1, k * 2.5))));
        if (p.t >= p.life) { this.scene.remove(p.m); this.parts.splice(i, 1); }
      }
    }
  }
  window.FXSYS = FX;
})();
