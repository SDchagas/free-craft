/* =========================================================
   Beds — cama (id 33). Mesh customizado (achatado, com cabeceira).
   Clique direito → dormir (avança o tempo até amanhecer).
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};
  const { blockKey: K } = Game.utils;

  const BED_ID = 33;
  const meshes = new Map();
  let scene = null;
  function bindScene(s) { scene = s; }

  const matCloth = new THREE.MeshLambertMaterial({ color: 0xcc2a2a });
  const matPillow= new THREE.MeshLambertMaterial({ color: 0xf0f0f0 });
  const matWood  = new THREE.MeshLambertMaterial({ color: 0x6d4520 });

  function buildBed(facing) {
    const g = new THREE.Group();
    // colchão (achatado, ocupa quase todo o bloco)
    const mat = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.30, 0.95), matCloth);
    mat.position.y = -0.20;
    g.add(mat);
    // travesseiro
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.10, 0.30), matPillow);
    pillow.position.set(0, -0.05, 0.30);
    g.add(pillow);
    // 4 pés
    const fGeo = new THREE.BoxGeometry(0.10, 0.20, 0.10);
    const positions = [[-0.40, -0.40, -0.40],[0.40,-0.40,-0.40],[-0.40,-0.40,0.40],[0.40,-0.40,0.40]];
    for (const [x,y,z] of positions) {
      const f = new THREE.Mesh(fGeo, matWood);
      f.position.set(x,y,z); g.add(f);
    }
    g.rotation.y = [0, Math.PI/2, Math.PI, -Math.PI/2][facing] || 0;
    return g;
  }

  function place(x, y, z, yaw) {
    const key = K(x, y, z);
    if (meshes.has(key)) return;
    let a = ((yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const facing = Math.round(a / (Math.PI / 2)) % 4;
    const m = buildBed(facing);
    m.position.set(x, y, z);
    if (scene) scene.add(m);
    meshes.set(key, { mesh: m, facing });
  }

  function remove(x, y, z) {
    const key = K(x, y, z);
    const s = meshes.get(key);
    if (s) {
      if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
      meshes.delete(key);
    }
  }

  // Tenta dormir: precisa estar à noite no jogo.
  function trySleep(x, y, z) {
    const t = Game.daynight && Game.daynight.state.time;
    if (t == null) return false;
    const isNight = t < 0.22 || t > 0.84;
    if (!isNight) {
      Game.utils.showToast('Você só pode dormir à noite');
      return false;
    }
    Game.utils.showToast('💤 Boa noite...');
    // anima fade-to-black breve
    fadeAndAdvance(0.30);  // amanhecer
    return true;
  }

  function fadeAndAdvance(targetTime) {
    const overlay = document.getElementById('sleep-overlay') || createSleepOverlay();
    overlay.style.opacity = '0';
    overlay.style.display = 'block';
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });
    setTimeout(() => {
      Game.daynight.setTime(targetTime);
      // recupera HP/fome levemente
      Game.player.hp = Math.min(Game.player.maxHp, Game.player.hp + 6);
      // some
      overlay.style.opacity = '0';
      setTimeout(() => { overlay.style.display = 'none'; }, 600);
    }, 900);
  }
  function createSleepOverlay() {
    const o = document.createElement('div');
    o.id = 'sleep-overlay';
    o.style.cssText = 'position:fixed;inset:0;background:#000;z-index:200;opacity:0;transition:opacity 0.6s;pointer-events:none;display:none;';
    document.body.appendChild(o);
    return o;
  }

  function update() { /* nada por enquanto */ }

  function unloadChunk(cx, cz, CHUNK) {
    for (const [key, s] of Array.from(meshes.entries())) {
      const [x, , z] = key.split(',').map(Number);
      if (Math.floor(x / CHUNK) === cx && Math.floor(z / CHUNK) === cz) {
        if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
        meshes.delete(key);
      }
    }
  }
  function loadChunk(cx, cz, CHUNK) {
    if (!Game.world) return;
    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    for (let lx = 0; lx < CHUNK; lx++)
      for (let lz = 0; lz < CHUNK; lz++)
        for (let y = -9; y < 30; y++) {
          if (Game.world.get(x0 + lx, y, z0 + lz) === BED_ID) {
            place(x0 + lx, y, z0 + lz, 0);
          }
        }
  }

  Game.beds = { BED_ID, bindScene, place, remove, trySleep, update, unloadChunk, loadChunk };
})();
