/* =========================================================
   Projectiles — flechas e balas (genérico). Voam pra frente,
   batem em blocos sólidos / NPCs causando dano e somem.
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};

  const list = [];
  let scene = null, camera = null;

  function bindScene(s, cam) { scene = s; camera = cam; }

  // Geometrias compartilhadas
  const arrowGeo  = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 5);
  const arrowMat  = new THREE.MeshLambertMaterial({ color: 0xb58a4d });
  const arrowTipGeo = new THREE.ConeGeometry(0.06, 0.15, 6);
  const arrowTipMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });

  const bulletGeo = new THREE.SphereGeometry(0.06, 8, 8);
  const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });

  function makeArrowMesh() {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(arrowGeo, arrowMat);
    shaft.rotation.x = Math.PI / 2;
    g.add(shaft);
    const tip = new THREE.Mesh(arrowTipGeo, arrowTipMat);
    tip.position.z = 0.35;
    tip.rotation.x = Math.PI / 2;
    g.add(tip);
    return g;
  }

  function makeBulletMesh() {
    const g = new THREE.Group();
    const ball = new THREE.Mesh(bulletGeo, bulletMat);
    g.add(ball);
    // mini-trail (esfera maior translúcida)
    const trail = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff7e6, transparent: true, opacity: 0.3 })
    );
    g.add(trail);
    return g;
  }

  // type: 'arrow' | 'bullet'
  function spawn(type, originVec, dirVec, damage = 4, speed = 30) {
    const mesh = type === 'arrow' ? makeArrowMesh() : makeBulletMesh();
    mesh.position.copy(originVec);
    // orientar pra direção
    const tmp = new THREE.Vector3().copy(dirVec).normalize();
    mesh.lookAt(originVec.clone().add(tmp));
    scene.add(mesh);
    list.push({
      type, mesh, damage,
      pos: originVec.clone(),
      vel: tmp.clone().multiplyScalar(speed),
      life: type === 'arrow' ? 4.0 : 2.0,
      gravity: type === 'arrow' ? 9 : 0,
    });
  }

  function update(dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt;
      if (p.gravity) p.vel.y -= p.gravity * dt;
      p.pos.addScaledVector(p.vel, dt);
      p.mesh.position.copy(p.pos);
      // re-orienta pela velocidade
      if (p.type === 'arrow') {
        const dir = p.vel.clone().normalize();
        p.mesh.lookAt(p.pos.clone().add(dir));
      }

      let hit = false;

      // colisão com bloco
      const bx = Math.floor(p.pos.x + 0.5);
      const by = Math.floor(p.pos.y + 0.5);
      const bz = Math.floor(p.pos.z + 0.5);
      const b = Game.world.get(bx, by, bz);
      if (b && !Game.items[b].liquid) {
        if (Game.audio) Game.audio.play(p.type === 'arrow' ? 'place' : 'click');
        hit = true;
      }

      // colisão com NPC
      if (!hit && Game.npcs) {
        for (const n of Game.npcs.list) {
          const center = n.pos.clone().add(new THREE.Vector3(0, 0.4, 0));
          if (p.pos.distanceTo(center) < 0.6) {
            Game.npcs.damage(n, p.damage);
            n.vel.x += p.vel.x * 0.05;
            n.vel.z += p.vel.z * 0.05;
            hit = true;
            break;
          }
        }
      }

      if (hit || p.life <= 0) {
        scene.remove(p.mesh);
        list.splice(i, 1);
      }
    }
  }

  // Helper: dispara da câmera na direção do olhar.
  function shootFromPlayer(type, damage, speed = 30) {
    const dir = new THREE.Vector3(0, 0, -1)
      .applyEuler(new THREE.Euler(Game.player.pitch, Game.player.yaw, 0, 'YXZ'));
    const origin = camera.position.clone().addScaledVector(dir, 0.7);
    spawn(type, origin, dir, damage, speed);
  }

  function clear() {
    for (const p of list) scene.remove(p.mesh);
    list.length = 0;
  }

  Game.projectiles = { list, bindScene, spawn, update, shootFromPlayer, clear };
})();
