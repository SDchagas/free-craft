/* =========================================================
   Main — setup do Three.js, mão 3D, input, mineração e game loop.
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};

  // ---------- Cena ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);
  // Névoa cobrindo a borda dos chunks renderizados.
  // RENDER_RADIUS=3 * CHUNK=16 = 48 blocos; névoa começa em 22 e satura em 50.
  scene.fog = new THREE.Fog(0x87CEEB, 22, 50);

  const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 300);
  scene.add(camera);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  Game.canvas = renderer.domElement;

  // ---------- Luzes ----------
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(60, 100, 30);
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0x87CEEB, 0x5a3921, 0.3);
  scene.add(hemi);

  const sunMesh = new THREE.Mesh(
    new THREE.CircleGeometry(12, 32),
    new THREE.MeshBasicMaterial({ color: 0xFFE066, fog: false, depthWrite: false })
  );
  sunMesh.renderOrder = -2;
  scene.add(sunMesh);

  // ---------- Nuvens ----------
  const clouds = [];
  function addCloud(x, y, z) {
    const g = new THREE.Group();
    const m = new THREE.MeshLambertMaterial({ color: 0xffffff });
    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(4 + Math.random() * 3, 2, 3 + Math.random() * 2), m
      );
      mesh.position.set(i * 3 - 6, Math.random() * 1.5, Math.random() * 2 - 1);
      g.add(mesh);
    }
    g.position.set(x, y, z);
    scene.add(g);
    return g;
  }
  for (let i = 0; i < 6; i++) {
    clouds.push(addCloud((Math.random() - 0.5) * 120, 35 + Math.random() * 10, (Math.random() - 0.5) * 120));
  }

  // ---------- World setup ----------
  Game.world.bindScene(scene);
  Game.lights.bindScene(scene);
  Game.doors.bindScene(scene);
  Game.torches.bindScene(scene);
  Game.fences.bindScene(scene);
  Game.beds.bindScene(scene);
  Game.plants.bindScene(scene);
  if (Game.tnt) Game.tnt.bindScene(scene);
  if (Game.multiplayer) Game.multiplayer.bindScene(scene);
  Game.world.generate();
  Game.water.initializeFromWorld();
  Game.drops.bindScene(scene);
  Game.npcs.bindScene(scene);
  Game.fireballs.bindScene(scene, camera);
  Game.projectiles.bindScene(scene, camera);
  Game.daynight.bind({ scene, sun, sunMesh, ambient, hemi, camera });
  Game.npcs.spawnInitial();

  // ---------- Crack overlay ----------
  const crackMat = new THREE.MeshBasicMaterial({
    map: Game.breakTex[0],
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -4,
  });
  const crackMesh = new THREE.Mesh(new THREE.BoxGeometry(1.002, 1.002, 1.002), crackMat);
  crackMesh.visible = false;
  scene.add(crackMesh);

  // ---------- Mão 3D estilo Minecraft ----------
  // Estilo MC: manga (cor camisa) + mão (cor pele), em forma de cubos blocky.
  // Cores vêm de Game.skin pra acompanhar customização.
  const hand = new THREE.Group();
  let armSleeveMesh, armHandMesh;
  function buildHandModel() {
    // limpa filhos antigos (mantém o toolGroup do viewmodel se já tem)
    const toRemove = [];
    for (const c of hand.children) if (c !== Game.viewmodel?._toolGroupRef) toRemove.push(c);
    for (const c of toRemove) hand.remove(c);

    const c = Game.skin ? Game.skin.all() : { shirt: '#3a8fd0', skin: '#f1c19a' };
    // Manga (parte de cima, mais larga e curta)
    armSleeveMesh = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.45, 0.30),
      new THREE.MeshLambertMaterial({ color: c.shirt }));
    armSleeveMesh.position.y = -0.15;
    hand.add(armSleeveMesh);
    // Mão de pele
    armHandMesh = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.20, 0.30),
      new THREE.MeshLambertMaterial({ color: c.skin }));
    armHandMesh.position.y = 0.18;
    hand.add(armHandMesh);
  }
  buildHandModel();
  // expõe pra o módulo skin re-construir quando cores mudarem
  Game.rebuildHandModel = buildHandModel;
  // decor = manga + mão (some quando há ferramenta segurada)
  const handDecor = new THREE.Group();
  hand.add(handDecor);
  // wrappers pra viewmodel poder esconder
  handDecor.userData.hideOnTool = () => {
    if (armSleeveMesh) armSleeveMesh.visible = false;
    if (armHandMesh)   armHandMesh.visible   = false;
  };
  handDecor.userData.showWhenEmpty = () => {
    if (armSleeveMesh) armSleeveMesh.visible = true;
    if (armHandMesh)   armHandMesh.visible   = true;
  };
  const HAND_REST = { x: 0.35, y: -0.35, z: -0.55, rotX: 0.1, rotY: 0, rotZ: -0.2 };
  hand.position.set(HAND_REST.x, HAND_REST.y, HAND_REST.z);
  hand.rotation.set(HAND_REST.rotX, HAND_REST.rotY, HAND_REST.rotZ);
  camera.add(hand);

  // viewmodel (mesh do item segurado) — vive dentro da mão.
  Game.viewmodel.init(hand, handDecor);
  // player mesh (3ª pessoa)
  if (Game.playermesh) Game.playermesh.init(scene);
  function syncViewmodel() {
    const id = Game.inventory.getActiveId();
    Game.viewmodel.setItem(id);
  }
  // patch: toda vez que UI refresh, syncViewmodel também
  const _origUiRefresh = Game.ui.refresh;
  Game.ui.refresh = function () {
    _origUiRefresh.apply(this, arguments);
    syncViewmodel();
  };
  syncViewmodel();

  // ---------- Partículas ----------
  const particles = [];
  function spawnBreakParticles(x, y, z, blockType) {
    const b = Game.items[blockType];
    if (!b || !b.tex) return;
    const mat = new THREE.MeshLambertMaterial({ map: b.tex[2] });
    const pGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(pGeo, mat);
      m.position.set(
        x + (Math.random() - 0.5) * 0.8,
        y + (Math.random() - 0.5) * 0.8,
        z + (Math.random() - 0.5) * 0.8
      );
      scene.add(m);
      particles.push({
        mesh: m,
        vel: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 4 + 1.5, (Math.random() - 0.5) * 4),
        spin: new THREE.Vector3(Math.random() * 5, Math.random() * 5, Math.random() * 5),
        life: 0.9, maxLife: 0.9,
      });
    }
  }
  function spawnFlame(origin) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 0.18),
      new THREE.MeshBasicMaterial({ color: Math.random() < 0.5 ? 0xff6a00 : 0xffd700, transparent: true, opacity: 0.9 })
    );
    m.position.copy(origin);
    scene.add(m);
    particles.push({
      mesh: m,
      vel: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4),
      spin: new THREE.Vector3(Math.random() * 4, Math.random() * 4, Math.random() * 4),
      life: 0.6, maxLife: 0.6, fade: true,
    });
  }
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.vel.y -= 14 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.spin.x * dt;
      p.mesh.rotation.y += p.spin.y * dt;
      p.mesh.rotation.z += p.spin.z * dt;
      if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
      else {
        p.mesh.scale.setScalar(Math.max(0.05, p.life / p.maxLife));
        if (p.fade) p.mesh.material.opacity = p.life / p.maxLife;
      }
    }
  }
  Game.particles = { spawnBreakParticles, spawnFlame };

  // ---------- Mineração ----------
  const mining = { active: false, bx: 0, by: 0, bz: 0, progress: 0, stage: -1 };
  let placeSwingT = 0;

  // Tempo de mineração estilo Minecraft:
  //   tempo = hardness / toolSpeed
  //   se a ferramenta NÃO pode colher o bloco → tempo *= 5
  //
  // toolSpeed:
  //   - mão vazia: 1
  //   - ferramenta CERTA (tool.toolType === blockDef.tool):
  //       madeira=2, pedra=4, ferro=6, diamante=8, ouro=12
  //   - espada (em qualquer bloco): 1.5  (ligeiramente melhor que mão)
  //   - outra ferramenta errada: 1       (igual a mão)
  //
  // canHarvest: ferramenta correta E tier >= requisito (pra dropar item).
  //   pedra precisa pick madeira+; ferro precisa pick pedra+; diamante precisa pick ferro+.
  const SPEED_BY_TIER = [2, 4, 6, 8, 12]; // [wood, stone, iron, diamond, gold]

  function blockBreakTime(blockType) {
    if (Game.player.mode === 'creative') return 0.05;
    const def = Game.items[blockType];
    if (!def || def.hardness < 0) return Infinity;
    const tool = Game.inventory.getActiveTool();

    // Pode colher (drop)?
    let canHarvest = true;
    if (def.requiresTool) {
      if (!tool || tool.toolType !== 'pick' || tool.toolLevel < def.requiresTool) {
        canHarvest = false;
      }
    }

    // Velocidade da ferramenta
    let toolSpeed = 1;
    let usingCorrectTool = false;
    if (tool) {
      if (def.tool && tool.toolType === def.tool) {
        toolSpeed = SPEED_BY_TIER[tool.toolLevel] || 4;
        usingCorrectTool = true;
      } else if (tool.toolType === 'sword') {
        toolSpeed = 1.5;  // espada corta um pouco mais rápido que mão
      }
    }

    let time = def.hardness / toolSpeed;
    // Sem possibilidade de colher: muito lento (sem drop)
    if (!canHarvest) {
      time *= 5;
    }
    // Bloco tem ferramenta esperada mas estamos usando outra (não-sword): penalidade
    else if (def.tool && !usingCorrectTool) {
      time *= 1.5;
    }
    return Math.max(0.15, time);
  }

  function raycast() {
    const dir = new THREE.Vector3(0, 0, -1)
      .applyEuler(new THREE.Euler(Game.player.pitch, Game.player.yaw, 0, 'YXZ'));
    // Em 3ª pessoa o raycast SEMPRE parte do player (não da câmera atrás dele)
    // pra que o alcance seja igual ao da 1ª pessoa
    const origin = (Game.cameraMode === 'third')
      ? Game.player.pos.clone()
      : camera.position.clone();
    const step = 0.05, maxDist = 6;
    let prev = { x: Math.floor(origin.x + 0.5), y: Math.floor(origin.y + 0.5), z: Math.floor(origin.z + 0.5) };
    for (let d = 0; d < maxDist; d += step) {
      const p = origin.clone().addScaledVector(dir, d);
      const bx = Math.floor(p.x + 0.5), by = Math.floor(p.y + 0.5), bz = Math.floor(p.z + 0.5);
      const t = Game.world.get(bx, by, bz);
      // ignora líquidos. Plantas/tochas (passable) podem ser miradas pra
      // serem quebradas — não bloqueiam a passagem física, mas o raycast
      // as detecta.
      if (t && !Game.items[t].liquid) {
        return { block: { x: bx, y: by, z: bz }, place: prev };
      }
      prev = { x: bx, y: by, z: bz };
    }
    return null;
  }

  function updateMining(dt) {
    if (!mining.active) return;
    const hit = raycast();
    if (!hit || hit.block.x !== mining.bx || hit.block.y !== mining.by || hit.block.z !== mining.bz) {
      resetMining();
      return;
    }
    const blockType = Game.world.get(mining.bx, mining.by, mining.bz);
    const total = blockBreakTime(blockType);
    mining.progress += dt / total;
    const newStage = Math.min(9, Math.floor(mining.progress * 10));
    if (newStage !== mining.stage) {
      mining.stage = newStage;
      crackMat.map = Game.breakTex[newStage];
      crackMat.needsUpdate = true;
    }
    crackMesh.position.set(mining.bx, mining.by, mining.bz);
    crackMesh.visible = true;

    if (mining.progress >= 1) {
      const def = Game.items[blockType];
      spawnBreakParticles(mining.bx, mining.by, mining.bz, blockType);
      if (Game.audio) Game.audio.play(Game.audio.breakSoundFor(blockType));
      Game.world.set(mining.bx, mining.by, mining.bz, 0);
      Game.world.refresh(mining.bx, mining.by, mining.bz);

      // drop como entidade (não vai direto pro inventário!)
      let dropId = blockType;
      if (def.drop != null) {
        const tool = Game.inventory.getActiveTool();
        if (def.requiresTool && (!tool || tool.toolType !== 'pick' || tool.toolLevel < def.requiresTool)) {
          dropId = 0; // sem tool adequada: sem drop
        } else {
          dropId = def.drop;
        }
      } else if (def.requiresTool) {
        const tool = Game.inventory.getActiveTool();
        if (!tool || tool.toolType !== 'pick' || tool.toolLevel < def.requiresTool) dropId = 0;
      }
      // Drops especiais de plantas (override do drop padrão)
      const isCreative = Game.player.mode === 'creative';
      if (!isCreative) {
        if (blockType === 5) {  // folhas
          // 5% muda + 8% semente
          if (Math.random() < 0.05) Game.drops.spawn(mining.bx, mining.by, mining.bz, 35, 1);
          if (Math.random() < 0.08) Game.drops.spawn(mining.bx, mining.by, mining.bz, 121, 1);
        } else if (blockType === 35) {  // muda quebrada → drop muda
          Game.drops.spawn(mining.bx, mining.by, mining.bz, 35, 1);
        } else if (blockType === 37) {  // grama alta → semente (35% chance)
          if (Math.random() < 0.35) Game.drops.spawn(mining.bx, mining.by, mining.bz, 121, 1);
        } else if (blockType === 36) {  // trigo
          const fully = Game.plants && Game.plants.isFullyGrown(mining.bx, mining.by, mining.bz);
          if (fully) {
            Game.drops.spawn(mining.bx, mining.by, mining.bz, 122, 1);
            const extra = 1 + Math.floor(Math.random() * 2);
            Game.drops.spawn(mining.bx, mining.by, mining.bz, 121, extra);
          } else {
            Game.drops.spawn(mining.bx, mining.by, mining.bz, 121, 1);
          }
        } else if (dropId) {
          Game.drops.spawn(mining.bx, mining.by, mining.bz, dropId, 1);
        }
      }
      resetMining();
    }
  }

  function resetMining() {
    mining.active = false;
    mining.progress = 0;
    mining.stage = -1;
    crackMesh.visible = false;
  }

  // ---------- Input ----------
  const keys = {};
  Game.input = { keys };  // mobile usa pra simular WASD
  let locked = false;

  addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.repeat) return;
    const n = parseInt(e.key);
    if (n >= 1 && n <= 9) {
      Game.inventory.setSelectedSlot(n - 1);
      if (Game.audio) Game.audio.play('select');
    }
    if (e.code === 'KeyE') {
      if (Game.crafting.state.open) Game.ui.closeInventory();
      else Game.ui.openInventory(2);
      e.preventDefault();
    }
    if (e.code === 'KeyR') {
      Game.ui.openRecipesBook();
      e.preventDefault();
    }
    if (e.code === 'KeyB' && locked) Game.fireballs.spawn();
    // V = alterna câmera 1ª/3ª pessoa
    if (e.code === 'KeyV' && locked) {
      Game.cameraMode = Game.cameraMode === 'third' ? 'first' : 'third';
      Game.utils.showToast(Game.cameraMode === 'third' ? '🎥 3ª pessoa' : '🎥 1ª pessoa');
      hand.visible = Game.cameraMode === 'first';
      if (Game.playermesh) Game.playermesh.setVisible(Game.cameraMode === 'third');
    }
    // Espaço duplo (em creative) = toggle fly
    if (e.code === 'Space' && locked && Game.player.mode === 'creative') {
      const now = performance.now() / 1000;
      if (Game.player.lastSpaceTime && now - Game.player.lastSpaceTime < 0.30) {
        Game.physics.toggleFly();
        Game.utils.showToast(Game.player.flying ? '✈️ Voando' : '⬇️ Aterrissando');
      }
      Game.player.lastSpaceTime = now;
    }
    // F = toggle fly direto (atalho alternativo)
    if (e.code === 'KeyF' && locked && Game.player.mode === 'creative') {
      Game.physics.toggleFly();
      Game.utils.showToast(Game.player.flying ? '✈️ Voando' : '⬇️ Aterrissando');
    }
  });
  addEventListener('keyup', e => { keys[e.code] = false; });

  const startScreen = document.getElementById('start-screen');
  function startGame(mode) {
    if (Game.audio) { Game.audio.init(); Game.audio.play('click'); }
    Game.setupInventoryForMode(mode);
    Game.player.pos.set(0, 14, 6);
    Game.player.vel.set(0, 0, 0);
    if (Game.mobile && Game.mobile.isTouch) {
      // mobile: entra em fullscreen + lock landscape (precisa do gesto do click)
      try { Game.mobile.requestFullscreenAndLandscape(); } catch (e) {}
      startScreen.style.display = 'none';
      locked = true;
    } else {
      renderer.domElement.requestPointerLock();
    }
  }
  const survBtn = document.getElementById('play-survival-btn');
  const creaBtn = document.getElementById('play-creative-btn');
  if (survBtn) survBtn.addEventListener('click', () => startGame('survival'));
  if (creaBtn) creaBtn.addEventListener('click', () => startGame('creative'));
  const oldBtn = document.getElementById('play-btn');
  if (oldBtn) oldBtn.addEventListener('click', () => startGame('survival'));

  // ---------- Multiplayer ----------
  const mpStatus = document.getElementById('mp-status');
  const mpHostBtn = document.getElementById('mp-host-btn');
  const mpJoinBtn = document.getElementById('mp-join-btn');
  function showStatus(msg) { if (mpStatus) mpStatus.textContent = msg; }
  if (mpHostBtn) mpHostBtn.addEventListener('click', async () => {
    if (!Game.multiplayer) { showStatus('Multiplayer indisponível'); return; }
    showStatus('Criando sala...');
    try {
      const name = prompt('Seu nome:', 'Host') || 'Host';
      const id = await Game.multiplayer.host(name);
      // copia ID pro clipboard
      try { await navigator.clipboard.writeText(id); } catch (e) {}
      showStatus(`Sala criada! ID copiado: ${id}`);
      alert(`Compartilhe esse ID com seus amigos:\n\n${id}\n\n(já foi copiado)`);
    } catch (e) { showStatus('Erro: ' + e.message); }
  });
  if (mpJoinBtn) mpJoinBtn.addEventListener('click', async () => {
    if (!Game.multiplayer) { showStatus('Multiplayer indisponível'); return; }
    const hostId = prompt('Cole o ID do host:');
    if (!hostId) return;
    const name = prompt('Seu nome:', 'Guest') || 'Guest';
    showStatus('Conectando...');
    try {
      await Game.multiplayer.join(hostId.trim(), name);
      showStatus('Conectado! Escolha o modo de jogo abaixo.');
    } catch (e) { showStatus('Erro ao conectar: ' + (e.type || e.message)); }
  });
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === renderer.domElement;
    if (!Game.crafting.state.open) startScreen.style.display = locked ? 'none' : 'flex';
  });
  addEventListener('mousemove', e => {
    if (!locked) return;
    Game.player.yaw -= e.movementX * 0.0025;
    Game.player.pitch -= e.movementY * 0.0025;
    Game.player.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, Game.player.pitch));
  });

  // cooldown de tiro de armas à distância + estado de recoil
  let weaponCd = 0;
  let fireKickT = 0;        // 0..1, decai
  let fireKickStrength = 0; // intensidade do recoil

  function triggerFireRecoil(weaponType) {
    fireKickT = 1;
    fireKickStrength = weaponType === 'gun' ? 1.0 : 0.55;
  }

  renderer.domElement.addEventListener('mousedown', e => {
    if (!locked) return;
    const hit = raycast();

    if (e.button === 0) {
      // se tem arma à distância selecionada, atira em vez de minerar
      const weapon = Game.inventory.getActiveWeapon && Game.inventory.getActiveWeapon();
      if (weapon && (weapon.weaponType === 'bow' || weapon.weaponType === 'gun')) {
        if (weaponCd > 0) return;
        // checa munição
        if (weapon.ammo && Game.player.mode !== 'creative' && !Game.inventory.has(weapon.ammo, 1)) {
          Game.utils.showToast('❌ Sem munição!');
          return;
        }
        weaponCd = weapon.fireRate || 0.4;
        if (weapon.ammo && Game.player.mode !== 'creative') Game.inventory.consume(weapon.ammo, 1);
        const speed = weapon.weaponType === 'gun' ? 45 : 28;
        Game.projectiles.shootFromPlayer(weapon.projectile || 'arrow', weapon.damage, speed);
        if (Game.audio) Game.audio.play(weapon.weaponType === 'gun' ? 'fireball' : 'place');
        triggerFireRecoil(weapon.weaponType);
        Game.ui.refresh();
        return;
      }

      // Tenta atacar um NPC próximo no centro da tela ANTES de iniciar mineração.
      // Funciona mesmo sem bloco mirado (e.g. animal no campo aberto).
      const tool = Game.inventory.getActiveTool();
      const dir = new THREE.Vector3(0, 0, -1)
        .applyEuler(new THREE.Euler(Game.player.pitch, Game.player.yaw, 0, 'YXZ'));
      // origem do ataque: olho em 1ª pessoa, corpo em 3ª pessoa
      const origin = (Game.cameraMode === 'third')
        ? Game.player.pos.clone()
        : camera.position.clone();
      let hitNpc = false;
      for (const n of Game.npcs.list) {
        const center = n.pos.clone().add(new THREE.Vector3(0, n.height * 0.5, 0));
        const d = center.distanceTo(origin);
        if (d < 4) {
          const toN = center.clone().sub(origin).normalize();
          if (dir.dot(toN) > 0.85) {
            // qualquer ferramenta funciona; mãos vazias dão 1 de dano
            let dmg = 1;
            if (tool) {
              if (tool.toolType === 'sword') dmg = tool.damage;
              else if (tool.toolType === 'axe') dmg = tool.damage * 0.85;
              else if (tool.toolType === 'pick') dmg = tool.damage;
              else if (tool.toolType === 'shovel') dmg = tool.damage * 0.7;
              else dmg = 1;
            }
            Game.npcs.damage(n, dmg);
            n.vel.y = 4;
            n.vel.x = toN.x * 4;
            n.vel.z = toN.z * 4;
            hitNpc = true;
            break;
          }
        }
      }
      if (hitNpc) {
        placeSwingT = 1;
        return;
      }
      // Sem NPC alcançado: começa a minerar bloco se estiver mirando algum
      if (!hit) return;
      mining.active = true;
      mining.bx = hit.block.x; mining.by = hit.block.y; mining.bz = hit.block.z;
      mining.progress = 0; mining.stage = -1;
    } else if (e.button === 2) {
      const slot = Game.inventory.data[Game.inventory.getSelectedSlot()];

      // comer alimento — clique direito sem mirar bloco específico
      // pão > peixe > carne crua (na ordem de eficiência)
      const FOODS = {
        123: { hunger: 8, sat: 5 },   // pão
        120: { hunger: 4, sat: 2 },   // peixe
        119: { hunger: 3, sat: 1 },   // carne crua
      };
      if (slot && FOODS[slot.id] && Game.player.hunger < Game.player.maxHunger) {
        const f = FOODS[slot.id];
        Game.physics.eatHunger(f.hunger, f.sat);
        slot.count -= 1;
        if (slot.count <= 0) Game.inventory.data[Game.inventory.getSelectedSlot()] = null;
        Game.ui.refresh();
        placeSwingT = 1;
        return;
      }

      if (!hit) return;
      const targetType = Game.world.get(hit.block.x, hit.block.y, hit.block.z);
      // mesa de craft → abre 3x3
      if (targetType === 13) {
        Game.ui.openInventory(3);
        placeSwingT = 1;
        return;
      }
      // porta → toggle abre/fecha
      if (targetType === 10) {
        Game.doors.toggle(hit.block.x, hit.block.y, hit.block.z);
        placeSwingT = 1;
        return;
      }
      // portão de cerca → toggle
      if (targetType === 32) {
        Game.fences.toggleGate(hit.block.x, hit.block.y, hit.block.z);
        placeSwingT = 1;
        return;
      }
      // cama → dormir
      if (targetType === 33) {
        Game.beds.trySleep(hit.block.x, hit.block.y, hit.block.z);
        placeSwingT = 1;
        return;
      }
      // pederneira em TNT → acende
      if (slot && slot.id === 124 && targetType === 39 && Game.tnt) {
        Game.tnt.ignite(hit.block.x, hit.block.y, hit.block.z);
        if (Game.audio) Game.audio.play('fizz');
        placeSwingT = 1;
        return;
      }
      if (!slot) return;
      const def = Game.items[slot.id];

      // Sementes (item, não bloco): plantam trigo se em cima de grama/farmland
      if (slot.id === 121) {
        const groundType = Game.world.get(hit.block.x, hit.block.y, hit.block.z);
        if (groundType === 1 || groundType === 38) {
          const px = hit.block.x, py = hit.block.y + 1, pz = hit.block.z;
          if (Game.world.get(px, py, pz) === 0) {
            // converte grama em farmland
            if (groundType === 1) {
              Game.world.set(hit.block.x, hit.block.y, hit.block.z, 38);
              Game.world.refresh(hit.block.x, hit.block.y, hit.block.z);
            }
            Game.world.set(px, py, pz, 36);
            Game.plants.place(px, py, pz, 36);
            Game.world.refresh(px, py, pz);
            placeSwingT = 1;
            if (Game.player.mode !== 'creative') Game.inventory.consumeActive();
            if (Game.audio) Game.audio.play('place');
            return;
          }
        }
        Game.utils.showToast('🌱 Plante em grama ou terra cultivada');
        return;
      }

      if (def.kind !== 'block') {
        Game.utils.showToast('❌ Selecione um bloco para colocar');
        return;
      }
      const p = hit.place;
      if (!Game.physics.blockWouldIntersectPlayer(p.x, p.y, p.z)) {
        // Mudas precisam de grama/terra embaixo
        if (slot.id === 35) {
          const below = Game.world.get(p.x, p.y - 1, p.z);
          if (below !== 1 && below !== 2) {
            Game.utils.showToast('🌱 Muda precisa de grama ou terra');
            return;
          }
        }
        Game.world.set(p.x, p.y, p.z, slot.id);
        if (slot.id === 10) Game.doors.place(p.x, p.y, p.z, Game.player.yaw);
        if (slot.id === 20 && Game.torches) Game.torches.place(p.x, p.y, p.z);
        if (slot.id === 31) Game.fences.place(p.x, p.y, p.z, 31, Game.player.yaw);
        if (slot.id === 32) Game.fences.place(p.x, p.y, p.z, 32, Game.player.yaw);
        if (slot.id === 33) Game.beds.place(p.x, p.y, p.z, Game.player.yaw);
        if (slot.id === 35 || slot.id === 36 || slot.id === 37) {
          Game.plants.place(p.x, p.y, p.z, slot.id);
        }
        Game.world.refresh(p.x, p.y, p.z);
        if (slot.id === 7 && Game.water) Game.water.placeSource(p.x, p.y, p.z);
        if (slot.id === 29) tryBuildGolem(p.x, p.y, p.z);
        placeSwingT = 1;
        if (Game.player.mode !== 'creative') Game.inventory.consumeActive();
        if (Game.audio) Game.audio.play(slot.id === 10 || slot.id === 32 ? 'door' : 'place');
      }
    }
  });
  addEventListener('mouseup', e => { if (e.button === 0) resetMining(); });
  renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

  // fallback pra re-engajar pointer lock (apenas desktop)
  renderer.domElement.addEventListener('click', () => {
    if (Game.mobile && Game.mobile.usesTouch) return;
    if (!locked && !Game.crafting.state.open && startScreen.style.display === 'none') {
      renderer.domElement.requestPointerLock();
    }
  });

  // Mobile: simula mousedown/up via os botões touch
  if (Game.mobile && Game.mobile.isTouch) {
    Game.mobile._attack = (down) => {
      if (down) {
        const fakeEvt = { button: 0, preventDefault: () => {} };
        renderer.domElement.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
        // mining usa o estado, então adicionamos manualmente
        const hit = raycast();
        if (hit) {
          mining.active = true;
          mining.bx = hit.block.x; mining.by = hit.block.y; mining.bz = hit.block.z;
          mining.progress = 0; mining.stage = -1;
        }
        // tiro com arma à distância
        const weapon = Game.inventory.getActiveWeapon && Game.inventory.getActiveWeapon();
        if (weapon && (weapon.weaponType === 'bow' || weapon.weaponType === 'gun')) {
          if (weaponCd <= 0) {
            if (!weapon.ammo || Game.player.mode === 'creative' || Game.inventory.has(weapon.ammo, 1)) {
              weaponCd = weapon.fireRate || 0.4;
              if (weapon.ammo && Game.player.mode !== 'creative') Game.inventory.consume(weapon.ammo, 1);
              const speed = weapon.weaponType === 'gun' ? 45 : 28;
              Game.projectiles.shootFromPlayer(weapon.projectile || 'arrow', weapon.damage, speed);
              triggerFireRecoil(weapon.weaponType);
              Game.ui.refresh();
            }
          }
        }
      } else {
        resetMining();
      }
    };
    Game.mobile._place = () => {
      const hit = raycast();
      if (!hit) return;
      const targetType = Game.world.get(hit.block.x, hit.block.y, hit.block.z);
      if (targetType === 13) { Game.ui.openInventory(3); return; }
      if (targetType === 10) { Game.doors.toggle(hit.block.x, hit.block.y, hit.block.z); return; }
      if (targetType === 32) { Game.fences.toggleGate(hit.block.x, hit.block.y, hit.block.z); return; }
      if (targetType === 33) { Game.beds.trySleep(hit.block.x, hit.block.y, hit.block.z); return; }
      const slot = Game.inventory.data[Game.inventory.getSelectedSlot()];
      if (!slot) return;
      const def = Game.items[slot.id];
      if (def.kind !== 'block') return;
      const p = hit.place;
      if (Game.physics.blockWouldIntersectPlayer(p.x, p.y, p.z)) return;
      Game.world.set(p.x, p.y, p.z, slot.id);
      if (slot.id === 10) Game.doors.place(p.x, p.y, p.z, Game.player.yaw);
      if (slot.id === 20) Game.torches.place(p.x, p.y, p.z);
      if (slot.id === 31) Game.fences.place(p.x, p.y, p.z, 31, Game.player.yaw);
      if (slot.id === 32) Game.fences.place(p.x, p.y, p.z, 32, Game.player.yaw);
      if (slot.id === 33) Game.beds.place(p.x, p.y, p.z, Game.player.yaw);
      Game.world.refresh(p.x, p.y, p.z);
      if (slot.id === 7) Game.water.placeSource(p.x, p.y, p.z);
      if (slot.id === 29) tryBuildGolem(p.x, p.y, p.z);
      placeSwingT = 1;
      if (Game.player.mode !== 'creative') Game.inventory.consumeActive();
      if (Game.audio) Game.audio.play('place');
    };
    Game.mobile.init();
    // Em mobile, "locked" = true direto após escolha de modo
    Object.defineProperty(window, '__mobileLocked', { value: true });
  }

  // ---------- Animação da mão ----------
  let handTime = 0;
  function animateHand(dt, isMoving) {
    handTime += dt;
    const r = HAND_REST;
    let tx = r.x, ty = r.y, tz = r.z;
    let trx = r.rotX, trz = r.rotZ;
    if (mining.active) {
      // Swing muito mais visível: amplitude maior + rotação Y também
      const t = handTime * 12;
      const swing = Math.sin(t);
      const aswing = Math.abs(swing);
      ty = r.y + aswing * 0.30;
      tx = r.x + swing * 0.15;
      trx = r.rotX - aswing * 1.4;
      trz = r.rotZ - swing * 0.4;
      hand.rotation.y = swing * 0.30;
    } else if (placeSwingT > 0) {
      placeSwingT = Math.max(0, placeSwingT - dt * 4);
      const s = Math.sin((1 - placeSwingT) * Math.PI);
      ty = r.y + s * 0.20;
      trx = r.rotX - s * 0.9;
      hand.rotation.y = s * 0.15;
    } else if (isMoving) {
      hand.rotation.y *= 0.9; // suaviza retorno
      const t = handTime * 9;
      tx = r.x + Math.sin(t) * 0.025;
      ty = r.y + Math.abs(Math.cos(t)) * 0.03;
      trz = r.rotZ + Math.sin(t) * 0.04;
    } else {
      ty = r.y + Math.sin(handTime * 2) * 0.012;
      trz = r.rotZ + Math.sin(handTime * 1.5) * 0.02;
      hand.rotation.y *= 0.9;
    }

    // recoil de tiro: empurra a mão pra trás+cima e gira pra cima
    if (fireKickT > 0) {
      fireKickT = Math.max(0, fireKickT - dt * 7);
      const k = Math.sin(fireKickT * Math.PI) * fireKickStrength;
      tz = tz + k * 0.18;
      ty = ty + k * 0.06;
      trx = trx - k * 0.7;
    }

    const lerp = 0.25;
    hand.position.x += (tx - hand.position.x) * lerp;
    hand.position.y += (ty - hand.position.y) * lerp;
    hand.position.z += (tz - hand.position.z) * lerp;
    hand.rotation.x += (trx - hand.rotation.x) * lerp;
    hand.rotation.z += (trz - hand.rotation.z) * lerp;
  }

  // ---------- UI inicial ----------
  Game.ui.init();

  // ----- Spawn inicial controlado pelo modo de jogo -----
  function setupInventoryForMode(mode) {
    // limpa inventário
    for (let i = 0; i < Game.inventory.INV_SIZE; i++) Game.inventory.data[i] = null;
    Game.inventory.armor.head = Game.inventory.armor.chest = null;
    Game.inventory.armor.legs = Game.inventory.armor.feet = null;

    if (mode === 'creative') {
      // Hotbar: ferramentas + armas + tochas + tábuas + pedregulho
      Game.inventory.data[0] = { id: 203, count: 1 };  // picareta diamante
      Game.inventory.data[1] = { id: 213, count: 1 };  // espada diamante
      Game.inventory.data[2] = { id: 223, count: 1 };  // pá diamante
      Game.inventory.data[3] = { id: 233, count: 1 };  // machado diamante
      Game.inventory.data[4] = { id: 240, count: 1 };  // arco
      Game.inventory.data[5] = { id: 241, count: 1 };  // pistola
      Game.inventory.data[6] = { id: 20,  count: 64 }; // tochas
      Game.inventory.data[7] = { id: 12,  count: 64 }; // tábuas
      Game.inventory.data[8] = { id: 21,  count: 64 }; // pedregulho

      // Mochila: TODOS os blocos e itens principais (sem queijo)
      const all = [
        [1, 64],[2, 64],[3, 64],[4, 64],[5, 64],[7, 64],[8, 64],
        [9, 64],[10, 64],[11, 64],[13, 64],[14, 64],[15, 64],[16, 64],[17, 64],
        [18, 64],[19, 64],[22, 64],[23, 64],[24, 64],[25, 64],[26, 64],[27, 64],
        [28, 64],[29, 32],[39, 32],[124, 1],
        [114, 64],[113, 32],[122, 32],[121, 32],[123, 16],
      ];
      for (const [id, n] of all) Game.inventory.add(id, n);

      // Armadura diamante já equipada
      Game.inventory.armor.head  = { id: 301 };
      Game.inventory.armor.chest = { id: 311 };
      Game.inventory.armor.legs  = { id: 321 };
      Game.inventory.armor.feet  = { id: 331 };
    } else {
      // survival: começa SEM nada (pure survival).
    }
    Game.physics.setMode(mode);
    Game.ui.refresh();
  }
  // expõe pra ser chamado pelos botões da tela inicial
  Game.setupInventoryForMode = setupInventoryForMode;
  // padrão: survival
  setupInventoryForMode('survival');

  // ---------- Iron Golem ----------
  // Padrão MC: cabeça (abóbora) em cima de 1 bloco de ferro central,
  // com 2 braços de ferro à esquerda/direita do corpo.
  //   . P .         (P = abóbora, recém colocada)
  //   I I I         (3 ferros: braços + corpo)
  //   . I .         (1 ferro: pernas)
  function tryBuildGolem(px, py, pz) {
    const IRON = 30;
    // Tenta 4 orientações (eixo X ou Z)
    const tryAxis = (axis) => {
      const dx = axis === 'x' ? 1 : 0;
      const dz = axis === 'z' ? 1 : 0;
      // central (corpo) abaixo da abóbora
      if (Game.world.get(px, py - 1, pz) !== IRON) return false;
      // braços nas laterais do corpo
      if (Game.world.get(px - dx, py - 1, pz - dz) !== IRON) return false;
      if (Game.world.get(px + dx, py - 1, pz + dz) !== IRON) return false;
      // pernas (1 ferro abaixo do corpo)
      if (Game.world.get(px, py - 2, pz) !== IRON) return false;
      // tudo válido — consome blocos e spawna golem
      Game.world.set(px,         py,     pz,         0);
      Game.world.set(px,         py - 1, pz,         0);
      Game.world.set(px - dx,    py - 1, pz - dz,    0);
      Game.world.set(px + dx,    py - 1, pz + dz,    0);
      Game.world.set(px,         py - 2, pz,         0);
      Game.world.refresh(px, py, pz);
      Game.world.refresh(px, py - 1, pz);
      Game.world.refresh(px - dx, py - 1, pz - dz);
      Game.world.refresh(px + dx, py - 1, pz + dz);
      Game.world.refresh(px, py - 2, pz);
      Game.npcs.spawnGolemAt(px + 0.5, py - 2, pz + 0.5);
      return true;
    };
    return tryAxis('x') || tryAxis('z');
  }

  // ---------- Spawn dinâmico ----------
  // Mobs hostis à noite. Passivos durante o dia, em volta do player.
  // Pássaros/peixes esporádicos. Despawn de mobs muito distantes.
  let hostileSpawnT = 0, birdSpawnT = 0, fishSpawnT = 0, passiveSpawnT = 0, despawnT = 0;
  function maybeSpawn(dt) {
    if (Game.player.mode === 'creative') return;
    const isNight = Game.daynight.state.time < 0.20 || Game.daynight.state.time > 0.85;
    hostileSpawnT -= dt;
    birdSpawnT -= dt;
    fishSpawnT -= dt;
    passiveSpawnT -= dt;
    despawnT -= dt;

    if (isNight && hostileSpawnT <= 0 && Game.npcs.hostileCount() < 4) {
      Game.npcs.spawnHostileNearby();
      hostileSpawnT = 18 + Math.random() * 12;
    }
    if (!isNight && passiveSpawnT <= 0 && Game.npcs.passiveCount() < 14) {
      Game.npcs.spawnPassiveNearby();
      passiveSpawnT = 8 + Math.random() * 10;
    }
    if (!isNight && birdSpawnT <= 0) {
      Game.npcs.spawnBird();
      birdSpawnT = 35 + Math.random() * 25;
    }
    if (fishSpawnT <= 0) {
      Game.npcs.spawnFish();
      fishSpawnT = 25 + Math.random() * 20;
    }
    // Despawn de mobs muito longe (a cada 8s, raio 90 — bem conservador)
    if (despawnT <= 0) {
      Game.npcs.despawnFar(90);
      despawnT = 8;
    }
  }

  // ---------- Carregamento dinâmico de chunks ----------
  // Re-avalia o que carregar/descarregar a cada tick — barato porque
  // só compara conjuntos. O trabalho pesado (criar/destruir Groups) só
  // acontece quando um chunk realmente entra ou sai do alcance.
  let chunkCheckT = 0;
  let lastChunkX = null, lastChunkZ = null, lastYaw = null;
  function maybeLoadChunks(dt) {
    chunkCheckT -= dt;
    const px = Game.player.pos.x, pz = Game.player.pos.z;
    const cx = Math.floor(px / Game.world.CHUNK);
    const cz = Math.floor(pz / Game.world.CHUNK);
    const yaw = Game.player.yaw;
    // re-avalia se passou do tick OU mudou de chunk OU virou bastante
    const yawChanged = lastYaw == null || Math.abs(((yaw - lastYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI) > 0.4;
    if (chunkCheckT > 0 && cx === lastChunkX && cz === lastChunkZ && !yawChanged) return;
    chunkCheckT = 0.4;
    lastChunkX = cx; lastChunkZ = cz; lastYaw = yaw;
    Game.world.updateChunkRendering(px, pz, yaw);
  }

  // ---------- Loop ----------
  let last = performance.now();
  function loop() {
    requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    let moving = false;
    if (locked) {
      const res = Game.physics.update(dt, keys);
      moving = res.moving;
    }

    camera.rotation.order = 'YXZ';
    camera.rotation.y = Game.player.yaw;
    camera.rotation.x = Game.player.pitch;
    if (Game.cameraMode === 'third') {
      // câmera atrás e levemente acima do player
      const back = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(Game.player.pitch, Game.player.yaw, 0, 'YXZ'));
      camera.position.copy(Game.player.pos).addScaledVector(back, 4).add(new THREE.Vector3(0, 0.5, 0));
    } else {
      camera.position.copy(Game.player.pos);
    }
    if (Game.playermesh) Game.playermesh.update(dt);

    if (locked) updateMining(dt);
    Game.mining_active = mining.active;  // expõe pra playermesh animar braço
    animateHand(dt, moving);
    updateParticles(dt);
    Game.npcs.update(dt);
    Game.fireballs.update(dt);
    Game.projectiles.update(dt);
    Game.drops.update(dt);
    Game.daynight.update(dt);
    Game.water.update(dt);
    Game.lights.update(dt);
    Game.doors.update(dt);
    Game.torches.update(dt);
    Game.fences.update(dt);
    Game.beds.update(dt);
    Game.plants.update(dt);
    Game.world.spreadUpdate(dt);
    if (Game.tnt) Game.tnt.update(dt);
    if (Game.multiplayer) Game.multiplayer.update(dt);
    weaponCd = Math.max(0, weaponCd - dt);

    if (locked) {
      maybeLoadChunks(dt);
      maybeSpawn(dt);
    }

    // animação leve de água
    const wmat = Game.world.matCache[7];
    if (wmat) wmat[0].opacity = 0.65 + Math.sin(now * 0.003) * 0.05;

    for (const c of clouds) {
      c.position.x += dt * 0.8;
      if (c.position.x > 70) c.position.x = -70;
    }

    Game.ui.updateHUD();
    renderer.render(scene, camera);
  }
  loop();

  function onResize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }
  addEventListener('resize', onResize);
  addEventListener('orientationchange', () => setTimeout(onResize, 100));

  Game.scene = scene;
  Game.camera = camera;
  Game.renderer = renderer;
  Game.cameraMode = 'first';
})();
