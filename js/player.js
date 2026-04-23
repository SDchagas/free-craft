/* =========================================================
   Player — estado e física do jogador (1ª pessoa).
   Inclui HP, fome, regen, dano de queda, lava, e sons.
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};

  const player = {
    pos: new THREE.Vector3(0, 14, 6),
    vel: new THREE.Vector3(),
    yaw: 0, pitch: 0,
    onGround: false,
    height: 1.7, radius: 0.3,

    hp: 20, maxHp: 20,
    hunger: 20, maxHunger: 20,
    saturation: 5,

    inWater: false, inLava: false,
    stepT: 0,
    splashCooldown: 0,
    hurtCooldown: 0,
    fallStartY: null,
    regenT: 0,
    hungerT: 0,

    // ---- modos ----
    mode: 'survival',     // 'survival' | 'creative'
    flying: false,
    lastSpaceTime: 0,
  };

  function solidAt(x, y, z) {
    const bx = Math.floor(x + 0.5), by = Math.floor(y + 0.5), bz = Math.floor(z + 0.5);
    const b = Game.world.get(bx, by, bz);
    if (!b) return false;
    const def = Game.items[b];
    if (def.liquid) return false;
    if (def.passable) return false;       // tochas, plantas, etc
    if (b === 10 && Game.doors && Game.doors.isOpen(bx, by, bz)) return false;
    if (b === 32 && Game.fences && Game.fences.isGateOpen(bx, by, bz)) return false;
    return true;
  }

  function blockWouldIntersectPlayer(bx, by, bz) {
    const r = player.radius;
    const px = player.pos.x, py = player.pos.y, pz = player.pos.z;
    return (
      bx + 0.5 > px - r && bx - 0.5 < px + r &&
      by + 0.5 > py - player.height && by - 0.5 < py + 0.2 &&
      bz + 0.5 > pz - r && bz - 0.5 < pz + r
    );
  }

  function collides(x, y, z) {
    const r = player.radius, h = player.height;
    const ys = [y - h + 0.1, y - h / 2, y - 0.05];
    const xs = [x - r, x + r];
    const zs = [z - r, z + r];
    for (const cy of ys) for (const cx of xs) for (const cz of zs)
      if (solidAt(cx, cy, cz)) return true;
    return false;
  }

  function getLiquidAtFeet() {
    const px = player.pos.x, py = player.pos.y - player.height / 2, pz = player.pos.z;
    return Game.world.get(Math.floor(px + 0.5), Math.floor(py + 0.5), Math.floor(pz + 0.5));
  }

  function damage(amount, source = '') {
    if (player.mode === 'creative') return;  // criativo é invulnerável
    if (player.hurtCooldown > 0) return;
    let reduction = 0;
    if (Game.inventory && Game.inventory.totalProtection) {
      const p = Game.inventory.totalProtection();
      reduction = Math.min(0.8, p * 0.04);
    }
    const finalDmg = Math.max(0.5, amount * (1 - reduction));
    player.hp = Math.max(0, player.hp - finalDmg);
    player.hurtCooldown = 0.5;
    if (Game.audio) Game.audio.play('hurt');
  }

  function setMode(mode) {
    player.mode = mode;
    if (mode !== 'creative') {
      player.flying = false;
    }
    player.hp = player.maxHp;
    player.hunger = player.maxHunger;
  }

  function toggleFly() {
    if (player.mode !== 'creative') return;
    player.flying = !player.flying;
    if (player.flying) {
      player.vel.y = 0;
      player.fallStartY = null;
    }
  }

  function eatHunger(food, sat = 2) {
    player.hunger = Math.min(player.maxHunger, player.hunger + food);
    player.saturation = Math.min(player.maxHunger, player.saturation + sat);
    if (Game.audio) Game.audio.play('eat');
  }

  function update(dt, keys) {
    let fwd = 0, right = 0;
    if (keys.KeyW) fwd += 1;
    if (keys.KeyS) fwd -= 1;
    if (keys.KeyA) right -= 1;
    if (keys.KeyD) right += 1;

    const liquidAtFeet = getLiquidAtFeet();
    const inWater = liquidAtFeet === 7;
    const inLava  = liquidAtFeet === 8;
    const wasInWater = player.inWater;
    player.inWater = inWater;
    player.inLava = inLava;

    player.splashCooldown = Math.max(0, player.splashCooldown - dt);
    if (inWater && !wasInWater && player.splashCooldown <= 0) {
      if (Game.audio) Game.audio.play('splash');
      player.splashCooldown = 0.4;
    }
    player.hurtCooldown = Math.max(0, player.hurtCooldown - dt);

    const sprinting = (keys.ShiftLeft || keys.ShiftRight) && (player.flying || player.hunger > 6);
    const speedFactor = (player.flying) ? 1.6 : (inWater ? 0.55 : (inLava ? 0.35 : 1));
    const speed = (sprinting ? 8 : 4.5) * speedFactor;
    const c = Math.cos(player.yaw), s = Math.sin(player.yaw);
    const vx = (-s * fwd + c * right) * speed;
    const vz = (-c * fwd - s * right) * speed;

    if (player.flying) {
      // sem gravidade — controle vertical com Espaço (sobe) e Shift (desce)
      let vy = 0;
      if (keys.Space) vy += 1;
      if (keys.ShiftLeft || keys.ShiftRight) vy -= 1;
      player.vel.y = vy * (sprinting ? 12 : 6);
      player.fallStartY = null;
    } else {
      const g = inWater || inLava ? 8 : 26;
      player.vel.y -= g * dt;

      if (inWater || inLava) {
        if (keys.Space) player.vel.y = Math.min(player.vel.y + 30 * dt, 4);
        player.vel.y = Math.max(player.vel.y, -3);
        player.fallStartY = null;
      } else {
        if (keys.Space && player.onGround) {
          player.vel.y = 9; player.onGround = false;
          if (Game.audio) Game.audio.play('jump');
        }
        player.vel.y = Math.max(-30, player.vel.y);
        if (!player.onGround && player.vel.y < 0 && player.fallStartY == null) {
          player.fallStartY = player.pos.y;
        }
      }
    }

    if (inLava && !player.flying) damage(2 * dt, 'lava');

    const moving = (fwd !== 0 || right !== 0);
    const nx = player.pos.x + vx * dt;
    if (!collides(nx, player.pos.y, player.pos.z)) player.pos.x = nx;
    const nz = player.pos.z + vz * dt;
    if (!collides(player.pos.x, player.pos.y, nz)) player.pos.z = nz;
    const ny = player.pos.y + player.vel.y * dt;
    const wasOnGround = player.onGround;
    if (!collides(player.pos.x, ny, player.pos.z)) {
      player.pos.y = ny; player.onGround = false;
    } else {
      if (player.vel.y < 0) player.onGround = true;
      player.vel.y = 0;
    }

    // dano de queda (não no creative/voando)
    if (!wasOnGround && player.onGround && player.fallStartY != null && !player.flying) {
      const fall = player.fallStartY - player.pos.y;
      if (fall > 4) {
        const dmg = Math.floor((fall - 3) * 1.5);
        damage(dmg, 'fall');
      }
      player.fallStartY = null;
    }

    if (moving && player.onGround && !inWater) {
      player.stepT += dt;
      if (player.stepT > 0.40) {
        player.stepT = 0;
        if (Game.audio) Game.audio.play('step');
      }
    } else {
      player.stepT = 0;
    }

    // ---------- Fome (apenas survival) ----------
    if (player.mode === 'survival') {
      let drain = 0.05;
      if (moving) drain += 0.04;
      if (sprinting) drain += 0.10;
      player.hungerT += drain * dt;
      if (player.hungerT >= 1) {
        player.hungerT = 0;
        if (player.saturation > 0) player.saturation = Math.max(0, player.saturation - 1);
        else if (player.hunger > 0) player.hunger -= 1;
      }

      player.regenT += dt;
      if (player.regenT >= 1.5) {
        player.regenT = 0;
        if (player.hunger >= 17 && player.hp < player.maxHp) {
          player.hp = Math.min(player.maxHp, player.hp + 1);
          player.hungerT += 0.4;
        }
        if (player.hunger === 0 && player.saturation === 0 && player.hp > 1) {
          damage(1, 'starve');
        }
      }
    } else {
      // criativo: fome cheia
      player.hunger = player.maxHunger;
      player.hp = player.maxHp;
    }

    if (player.pos.y < -20) respawn();
    if (player.hp <= 0) {
      respawn();
      Game.utils.showToast('💀 Você morreu! Voltando ao spawn...');
    }

    return { moving: moving && player.onGround };
  }

  function respawn() {
    player.pos.set(0, 14, 6);
    player.vel.set(0, 0, 0);
    player.hp = player.maxHp;
    player.hunger = player.maxHunger;
    player.saturation = 5;
    player.fallStartY = null;
  }

  Object.assign(Game, { player });
  Game.physics = { update, blockWouldIntersectPlayer, damage, eatHunger, setMode, toggleFly };
})();
