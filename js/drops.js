/* =========================================================
   Drops — entidades coletáveis que pulam quando blocos quebram.
   Caem com gravidade, são atraídas pelo player (magnetismo) e
   somem após N segundos. Emitem som de pickup.
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};

  const list = [];
  let scene = null;

  // geometrias compartilhadas pra economizar memória
  const blockGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  const itemGeo  = new THREE.PlaneGeometry(0.35, 0.35);

  function bindScene(s) { scene = s; }

  function makeMesh(itemId) {
    const def = Game.items[itemId];
    if (!def) return null;
    if (def.kind === 'block') {
      const mats = def.tex.map(t => new THREE.MeshLambertMaterial({
        map: t, transparent: !!def.transparent,
        opacity: def.opacity != null ? def.opacity : 1.0,
        alphaTest: def.alphaTest || 0,
      }));
      return new THREE.Mesh(blockGeo, mats);
    } else {
      // ícone plano (item ou ferramenta)
      const mat = new THREE.MeshBasicMaterial({
        map: def.icon, transparent: true, side: THREE.DoubleSide, alphaTest: 0.1,
      });
      return new THREE.Mesh(itemGeo, mat);
    }
  }

  function spawn(x, y, z, itemId, count = 1, opts = {}) {
    if (!itemId) return;
    const mesh = makeMesh(itemId);
    if (!mesh) return;
    mesh.position.set(x, y, z);
    scene.add(mesh);
    const angle = Math.random() * Math.PI * 2;
    const force = opts.gentle ? 0.8 : 2.2;
    list.push({
      mesh, itemId, count,
      pos: new THREE.Vector3(x, y, z),
      vel: new THREE.Vector3(
        Math.cos(angle) * force,
        2 + Math.random() * 1.5,
        Math.sin(angle) * force
      ),
      life: 90,
      collectDelay: opts.collectDelay != null ? opts.collectDelay : 0.4,
      bobT: Math.random() * Math.PI * 2,
    });
  }

  // Colisão simples com chão (apenas em -Y)
  function solidBelow(pos) {
    const bx = Math.floor(pos.x + 0.5);
    const by = Math.floor(pos.y - 0.15 + 0.5);
    const bz = Math.floor(pos.z + 0.5);
    const t = Game.world.get(bx, by, bz);
    if (!t) return null;
    if (Game.items[t].liquid) return null;
    return by + 0.5; // topo do bloco
  }

  function update(dt) {
    if (!Game.player || !Game.player.pos) return;
    const playerPos = Game.player.pos;

    for (let i = list.length - 1; i >= 0; i--) {
      const d = list[i];
      d.life -= dt;
      d.collectDelay -= dt;
      d.bobT += dt * 3;

      if (d.life <= 0) {
        scene.remove(d.mesh);
        list.splice(i, 1);
        continue;
      }

      // gravidade + integração
      d.vel.y -= 18 * dt;
      d.pos.x += d.vel.x * dt;
      d.pos.y += d.vel.y * dt;
      d.pos.z += d.vel.z * dt;

      // pousar no chão
      const top = solidBelow(d.pos);
      if (top != null && d.pos.y < top + 0.15) {
        d.pos.y = top + 0.15;
        if (d.vel.y < 0) d.vel.y = 0;
        d.vel.x *= 0.7; d.vel.z *= 0.7;
      }

      // atualiza mesh
      d.mesh.position.x = d.pos.x;
      d.mesh.position.y = d.pos.y + Math.sin(d.bobT) * 0.05;
      d.mesh.position.z = d.pos.z;
      d.mesh.rotation.y += dt * 1.5;

      // pickup / magnetismo — só se houver espaço pra guardar; senão fica
      // parado no chão pra não orbitar o player.
      if (d.collectDelay <= 0 && Game.inventory.canFit(d.itemId, 1)) {
        const px = playerPos.x;
        const py = playerPos.y - 0.7; // centro vertical do player
        const pz = playerPos.z;
        const dx = px - d.pos.x, dy = py - d.pos.y, dz = pz - d.pos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 0.85) {
          const remainder = Game.inventory.add(d.itemId, d.count);
          if (remainder < d.count) {
            if (Game.audio) Game.audio.play('pickup');
          }
          if (remainder > 0) {
            // só coletou parte; deixa o resto parado, sem chamar de novo este frame
            d.count = remainder;
            d.vel.set(0, 0, 0);
            d.collectDelay = 1.5;
          } else {
            scene.remove(d.mesh);
            list.splice(i, 1);
          }
        } else if (dist < 2.5) {
          // magnetismo (com clamp de velocidade pra não orbitar)
          const inv = 1 / dist;
          const f = 22;
          d.vel.x += dx * inv * f * dt;
          d.vel.y += dy * inv * f * dt;
          d.vel.z += dz * inv * f * dt;
          // limita velocidade horizontal pra evitar overshoot
          const vh = Math.hypot(d.vel.x, d.vel.z);
          const vmax = 8;
          if (vh > vmax) {
            d.vel.x *= vmax / vh;
            d.vel.z *= vmax / vh;
          }
        }
      }
    }
  }

  function clear() {
    for (const d of list) scene.remove(d.mesh);
    list.length = 0;
  }

  Game.drops = { list, bindScene, spawn, update, clear };
})();
