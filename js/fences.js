/* =========================================================
   Fences — cerca (id 31) e portão (id 32) com mesh customizado.
   Cerca: poste central + travessões; portão: placa fina abrindo.
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};
  const { blockKey: K } = Game.utils;

  const FENCE_ID = 31, GATE_ID = 32;
  const meshes = new Map();   // "x,y,z" -> { mesh, kind, open?, facing? }
  let scene = null;
  function bindScene(s) { scene = s; }

  const wood = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });

  function buildFence() {
    const g = new THREE.Group();
    // poste central
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.20, 1.0, 0.20), wood);
    g.add(post);
    // 2 travessões (X e Z) em duas alturas
    for (const y of [0.20, -0.10]) {
      const barX = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.10, 0.10), wood);
      barX.position.y = y; g.add(barX);
      const barZ = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 1.0), wood);
      barZ.position.y = y; g.add(barZ);
    }
    return g;
  }

  function buildGate(facing) {
    // wrapper com pivô na borda pra abrir
    const root = new THREE.Group();
    const pivot = new THREE.Group();
    const placa = new THREE.Group();
    // 2 travessões + 2 postes laterais
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.12, 0.12), wood);
    top.position.y = 0.25; placa.add(top);
    const bot = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.12, 0.12), wood);
    bot.position.y = -0.10; placa.add(bot);
    const pL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.12), wood);
    pL.position.set(-0.40, 0.07, 0); placa.add(pL);
    const pR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.12), wood);
    pR.position.set( 0.40, 0.07, 0); placa.add(pR);

    placa.position.x = -0.40; // dobradiça à esquerda
    pivot.add(placa);
    const ang = [0, Math.PI/2, Math.PI, -Math.PI/2][facing];
    pivot.rotation.y = ang;
    pivot.position.set([0, -0.45, 0, 0.45][facing], 0, [-0.45, 0, 0.45, 0][facing]);
    root.add(pivot);
    return { root, pivot };
  }

  function place(x, y, z, kind, yaw) {
    const key = K(x, y, z);
    if (meshes.has(key)) return;
    if (kind === FENCE_ID) {
      const m = buildFence();
      m.position.set(x, y, z);
      if (scene) scene.add(m);
      meshes.set(key, { mesh: m, kind });
    } else {
      // portão: facing baseado no yaw do player
      let a = ((yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const facing = (Math.round(a / (Math.PI / 2)) + 2) % 4;
      const built = buildGate(facing);
      built.root.position.set(x, y, z);
      if (scene) scene.add(built.root);
      meshes.set(key, { mesh: built.root, pivot: built.pivot, kind, open: false, facing });
    }
  }

  function remove(x, y, z) {
    const key = K(x, y, z);
    const s = meshes.get(key);
    if (s) {
      if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
      meshes.delete(key);
    }
  }

  function toggleGate(x, y, z) {
    const s = meshes.get(K(x, y, z));
    if (!s || s.kind !== GATE_ID) return false;
    s.open = !s.open;
    const baseAng = [0, Math.PI/2, Math.PI, -Math.PI/2][s.facing];
    s.targetYaw = baseAng + (s.open ? Math.PI / 2 : 0);
    if (Game.audio) Game.audio.play('door');
    return true;
  }
  function isGateOpen(x, y, z) {
    const s = meshes.get(K(x, y, z));
    return !!(s && s.kind === GATE_ID && s.open);
  }

  function update(dt) {
    for (const s of meshes.values()) {
      if (s.kind !== GATE_ID || s.targetYaw == null) continue;
      if (!s.pivot) continue;
      const cur = s.pivot.rotation.y;
      const dy = s.targetYaw - cur;
      if (Math.abs(dy) < 0.01) s.pivot.rotation.y = s.targetYaw;
      else s.pivot.rotation.y += dy * Math.min(1, dt * 12);
    }
  }

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
          const t = Game.world.get(x0 + lx, y, z0 + lz);
          if (t === FENCE_ID) place(x0 + lx, y, z0 + lz, FENCE_ID, 0);
          else if (t === GATE_ID) place(x0 + lx, y, z0 + lz, GATE_ID, 0);
        }
  }

  Game.fences = { FENCE_ID, GATE_ID, bindScene, place, remove, toggleGate, isGateOpen, update, unloadChunk, loadChunk };
})();
