/* =========================================================
   Torches — mesh customizado pra tochas (cabo + chama no centro
   do bloco), em vez do cubo padrão.
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};
  const { blockKey: K } = Game.utils;

  const TORCH_ID = 20;
  const meshes = new Map(); // "x,y,z" -> THREE.Group

  let scene = null;
  function bindScene(s) { scene = s; }

  // materiais compartilhados
  const stickMat   = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
  const flameInner = new THREE.MeshBasicMaterial({ color: 0xfff7c0 });
  const flameMid   = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
  const flameOuter = new THREE.MeshBasicMaterial({ color: 0xff5a00, transparent: true, opacity: 0.7 });

  function buildMesh() {
    const g = new THREE.Group();
    // cabo
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.55, 0.10), stickMat);
    stick.position.y = -0.18;
    g.add(stick);
    // núcleo da chama (branco-amarelado)
    const inner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.08), flameInner);
    inner.position.y = 0.16;
    g.add(inner);
    // chama média (laranja)
    const mid = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), flameMid);
    mid.position.y = 0.16;
    g.add(mid);
    // chama externa (vermelho-translúcido)
    const outer = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.20, 0.24), flameOuter);
    outer.position.y = 0.18;
    g.add(outer);
    return g;
  }

  function place(x, y, z) {
    const key = K(x, y, z);
    if (meshes.has(key)) return;
    const m = buildMesh();
    m.position.set(x, y, z);
    if (scene) scene.add(m);
    meshes.set(key, m);
  }

  function remove(x, y, z) {
    const key = K(x, y, z);
    const m = meshes.get(key);
    if (m) {
      if (m.parent) m.parent.remove(m);
      meshes.delete(key);
    }
  }

  // anima a chama (oscila escala/posição)
  let t = 0;
  function update(dt) {
    t += dt;
    let i = 0;
    for (const m of meshes.values()) {
      const phase = t * 7 + i * 0.7;
      const inner = m.children[1];
      const mid = m.children[2];
      const outer = m.children[3];
      if (mid) {
        const s = 0.9 + Math.sin(phase) * 0.12;
        mid.scale.set(s, 1, s);
      }
      if (outer) {
        const s2 = 1 + Math.sin(phase * 1.3) * 0.18;
        outer.scale.set(s2, 1.05, s2);
        outer.material.opacity = 0.55 + Math.sin(phase * 1.7) * 0.15;
      }
      if (inner) inner.position.y = 0.16 + Math.sin(phase * 2) * 0.015;
      i++;
    }
  }

  function unloadChunk(cx, cz, CHUNK) {
    for (const [key, m] of Array.from(meshes.entries())) {
      const [x, , z] = key.split(',').map(Number);
      if (Math.floor(x / CHUNK) === cx && Math.floor(z / CHUNK) === cz) {
        if (m.parent) m.parent.remove(m);
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
          if (Game.world.get(x0 + lx, y, z0 + lz) === TORCH_ID) {
            place(x0 + lx, y, z0 + lz);
          }
        }
  }

  Game.torches = { TORCH_ID, bindScene, place, remove, update, unloadChunk, loadChunk };
})();
