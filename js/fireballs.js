/* =========================================================
   Fireballs — bolas de fogo (botão B). Voam pra frente,
   explodem ao colidir com bloco/NPC, com cooldown.
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};

  const list = [];
  let scene = null;
  let camera = null;
  let cooldown = 0;
  const COOLDOWN = 0.4;

  const geo = new THREE.SphereGeometry(0.22, 12, 12);
  const mat = new THREE.MeshBasicMaterial({ color: 0xff6a00 });

  function bindScene(s, cam) { scene = s; camera = cam; }
  function getCooldown() { return cooldown; }

  function spawn() {
    if (cooldown > 0) return;
    cooldown = COOLDOWN;
    const dir = new THREE.Vector3(0, 0, -1)
      .applyEuler(new THREE.Euler(Game.player.pitch, Game.player.yaw, 0, 'YXZ'));
    const mesh = new THREE.Mesh(geo, mat);
    const origin = camera.position.clone().addScaledVector(dir, 0.8);
    mesh.position.copy(origin);
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.4 })
    );
    mesh.add(halo);
    const lt = new THREE.PointLight(0xff8c00, 1.5, 6);
    mesh.add(lt);
    scene.add(mesh);
    list.push({
      mesh, halo,
      pos: origin.clone(),
      vel: dir.multiplyScalar(28),
      life: 3.0,
    });
    if (Game.audio) Game.audio.play('fireball');
  }

  function explode(fb, pos) {
    if (Game.audio) Game.audio.play('explosion');
    // partículas
    if (Game.particles && Game.particles.spawnFlame) {
      for (let i = 0; i < 16; i++) Game.particles.spawnFlame(pos);
    }
    // dano em NPCs
    for (const n of Game.npcs.list) {
      const d = n.pos.distanceTo(pos);
      if (d < 2.2) Game.npcs.damage(n, Math.max(0, 6 - d * 2));
    }
    // remove blocos próximos (e dropa o item correspondente!)
    const cx = Math.round(pos.x), cy = Math.round(pos.y), cz = Math.round(pos.z);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++) {
          if (Math.sqrt(dx*dx + dy*dy + dz*dz) > 1.4) continue;
          const bx = cx + dx, by = cy + dy, bz = cz + dz;
          if (by <= -8) continue;
          const b = Game.world.get(bx, by, bz);
          if (!b || Game.items[b].liquid) continue;
          // dropa entidade (50% de chance, simulando blast em MC)
          if (Math.random() < 0.5) {
            const def = Game.items[b];
            const dropId = def.drop != null ? def.drop : b;
            Game.drops.spawn(bx, by + 0.3, bz, dropId, 1);
          }
          Game.world.set(bx, by, bz, 0);
          Game.world.refresh(bx, by, bz);
        }
    scene.remove(fb.mesh);
  }

  function update(dt) {
    cooldown = Math.max(0, cooldown - dt);
    for (let i = list.length - 1; i >= 0; i--) {
      const fb = list[i];
      fb.life -= dt;
      fb.vel.y -= 6 * dt;
      fb.pos.addScaledVector(fb.vel, dt);
      fb.mesh.position.copy(fb.pos);
      fb.halo.scale.setScalar(1 + Math.sin(performance.now() * 0.015) * 0.15);

      const bx = Math.floor(fb.pos.x + 0.5);
      const by = Math.floor(fb.pos.y + 0.5);
      const bz = Math.floor(fb.pos.z + 0.5);
      const b = Game.world.get(bx, by, bz);
      if ((b && !Game.items[b].liquid) || fb.life <= 0) {
        explode(fb, fb.pos);
        list.splice(i, 1);
        continue;
      }

      let hitNpc = false;
      for (const n of Game.npcs.list) {
        const center = n.pos.clone().add(new THREE.Vector3(0, 0.4, 0));
        if (fb.pos.distanceTo(center) < 0.6) {
          explode(fb, fb.pos);
          list.splice(i, 1);
          hitNpc = true; break;
        }
      }
      if (hitNpc) continue;
    }
  }

  Game.fireballs = { list, bindScene, spawn, update, getCooldown, COOLDOWN };
})();
