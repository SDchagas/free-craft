/* =========================================================
   TNT — bloco que pode ser ignitado pela pederneira (item 124).
   Após `FUSE_TIME` segundos pisca/cresce e explode num raio,
   removendo blocos e causando dano em NPCs e player.
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};
  const { blockKey: K } = Game.utils;

  const TNT_ID = 39;
  const FUSE_TIME = 2.5;
  const BLAST_RADIUS = 3.5;
  const BLAST_DAMAGE = 12;

  const active = new Map();   // "x,y,z" -> { fuseT, mesh? }
  let scene = null;
  function bindScene(s) { scene = s; }

  function ignite(x, y, z) {
    const key = K(x, y, z);
    if (active.has(key)) return false;
    if (Game.world.get(x, y, z) !== TNT_ID) return false;
    active.set(key, { fuseT: FUSE_TIME, t: 0 });
    if (Game.audio) Game.audio.play('fizz');
    if (Game.utils) Game.utils.showToast('💥 TNT acesa!');
    return true;
  }

  function explode(cx, cy, cz) {
    if (Game.audio) Game.audio.play('explosion');
    // remove blocos no raio (preserva bedrock e líquidos)
    const r = BLAST_RADIUS;
    const ri = Math.ceil(r);
    const chained = [];   // outras TNTs alcançadas viram cadeia
    for (let dx = -ri; dx <= ri; dx++)
      for (let dy = -ri; dy <= ri; dy++)
        for (let dz = -ri; dz <= ri; dz++) {
          const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
          if (d > r) continue;
          const x = cx + dx, y = cy + dy, z = cz + dz;
          if (y <= -8) continue;
          const b = Game.world.get(x, y, z);
          if (!b) continue;
          const def = Game.items[b];
          if (def.liquid) continue;
          if (b === TNT_ID && !(dx === 0 && dy === 0 && dz === 0)) {
            chained.push([x, y, z]);
            continue;
          }
          // chance de soltar drop (50% pra distantes, 100% pra próximas)
          if (Math.random() < 0.5 && Game.player.mode !== 'creative') {
            const dropId = def.drop != null ? def.drop : b;
            if (dropId && Game.drops) Game.drops.spawn(x, y + 0.3, z, dropId, 1);
          }
          Game.world.set(x, y, z, 0);
          Game.world.refresh(x, y, z);
        }

    // dano em NPCs próximos
    if (Game.npcs) {
      for (const n of Game.npcs.list) {
        const d = Math.hypot(n.pos.x - cx, n.pos.y - cy, n.pos.z - cz);
        if (d < r + 1.5) {
          const dmg = Math.max(0, BLAST_DAMAGE * (1 - d / (r + 1.5)));
          Game.npcs.damage(n, dmg);
          // empurra
          const dir = new THREE.Vector3(n.pos.x - cx, n.pos.y - cy, n.pos.z - cz).normalize();
          n.vel.x += dir.x * 6;
          n.vel.y += Math.max(dir.y, 0.5) * 6;
          n.vel.z += dir.z * 6;
        }
      }
    }
    // dano no player se perto
    const pd = Math.hypot(Game.player.pos.x - cx, Game.player.pos.y - cy, Game.player.pos.z - cz);
    if (pd < r + 1.5) {
      const pdmg = Math.max(0, BLAST_DAMAGE * (1 - pd / (r + 1.5)));
      if (Game.physics && Game.physics.damage) Game.physics.damage(pdmg, 'tnt');
      // knockback simples
      const dir = new THREE.Vector3(Game.player.pos.x - cx, Game.player.pos.y - cy, Game.player.pos.z - cz).normalize();
      Game.player.vel.x += dir.x * 4;
      Game.player.vel.y += Math.max(dir.y, 0.4) * 7;
      Game.player.vel.z += dir.z * 4;
    }

    // partículas de fogo + fumaça
    if (Game.particles && Game.particles.spawnFlame) {
      const center = new THREE.Vector3(cx, cy, cz);
      for (let i = 0; i < 24; i++) Game.particles.spawnFlame(center);
    }

    // dispara TNTs em cadeia com pequeno delay
    let delay = 0.05;
    for (const [x, y, z] of chained) {
      setTimeout(() => ignite(x, y, z), delay * 1000);
      delay += 0.05;
    }
  }

  function update(dt) {
    if (active.size === 0) return;
    for (const [key, s] of Array.from(active.entries())) {
      const [x, y, z] = key.split(',').map(Number);
      if (Game.world.get(x, y, z) !== TNT_ID) {
        active.delete(key);
        continue;
      }
      s.t += dt;
      s.fuseT -= dt;
      // pisca o bloco branco/vermelho próximo da explosão
      // (efeito visual via material color override)
      const mesh = Game.world.meshes.get(key);
      if (mesh && mesh.material && mesh.material.length) {
        const blink = Math.floor(s.t * 8) % 2 === 0 && s.fuseT < FUSE_TIME * 0.7;
        for (const m of mesh.material) {
          if (m.emissive) {
            m.emissive.setHex(blink ? 0xffffff : 0x000000);
            m.emissiveIntensity = blink ? 0.5 : 0;
          }
        }
      }
      if (s.fuseT <= 0) {
        active.delete(key);
        Game.world.set(x, y, z, 0);
        Game.world.refresh(x, y, z);
        explode(x + 0.5, y + 0.5, z + 0.5);
      }
    }
  }

  Game.tnt = { TNT_ID, FUSE_TIME, BLAST_RADIUS, bindScene, ignite, explode, update, active };
})();
