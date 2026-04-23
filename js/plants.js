/* =========================================================
   Plants — mudas (35), trigo (36), grama alta (37).
   Renderização com cross-section (X-shape) em vez de cubo,
   pra parecer planta natural. Mudas e trigo crescem ao longo
   do tempo; grama alta é decorativa.
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};
  const { blockKey: K, mulberry32 } = Game.utils;

  const SAPLING_ID = 35, WHEAT_ID = 36, TALLGRASS_ID = 37, FARMLAND_ID = 38;
  const meshes = new Map();        // "x,y,z" -> { mesh, kind, growthT? }
  let scene = null;
  function bindScene(s) { scene = s; }

  // Materiais compartilhados (um por kind/estágio)
  let matSapling, matTallGrass, matWheat0, matWheat1, matWheat2, matWheat3;

  function ensureMaterials() {
    if (matSapling) return;
    matSapling = new THREE.MeshLambertMaterial({
      map: Game.tex.sapling, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide,
    });
    matTallGrass = new THREE.MeshLambertMaterial({
      map: Game.tex.tallGrass, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide,
    });
    // 4 estágios de trigo (escala da textura via UV — ou simplesmente 4 versões da textura)
    // pra simplificar: usamos 1 textura mas 4 alturas de mesh.
    matWheat0 = matWheat1 = matWheat2 = matWheat3 = new THREE.MeshLambertMaterial({
      map: Game.tex.wheatGrown, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide,
    });
  }

  // Mesh "X" (2 quads cruzados, 45°) — clássico do MC pra plantas.
  function buildCrossMesh(material, height = 1.0, width = 1.0) {
    const g = new THREE.Group();
    const quad = new THREE.PlaneGeometry(width, height);
    const a = new THREE.Mesh(quad, material);
    a.rotation.y = Math.PI / 4;
    g.add(a);
    const b = new THREE.Mesh(quad, material);
    b.rotation.y = -Math.PI / 4;
    g.add(b);
    return g;
  }

  function place(x, y, z, kind) {
    const key = K(x, y, z);
    if (meshes.has(key)) return;
    ensureMaterials();
    let mesh, growthT = 0, stage = 0;
    if (kind === SAPLING_ID) {
      mesh = buildCrossMesh(matSapling, 0.65);
      mesh.position.y = -0.18;
    } else if (kind === TALLGRASS_ID) {
      mesh = buildCrossMesh(matTallGrass, 0.85);
      mesh.position.y = -0.08;
    } else if (kind === WHEAT_ID) {
      stage = 0;
      mesh = buildCrossMesh(matWheat0, 0.30);  // começa pequeno
      mesh.position.y = -0.35;
    }
    if (!mesh) return;
    const root = new THREE.Group();
    root.add(mesh);
    root.position.set(x, y, z);
    if (scene) scene.add(root);
    meshes.set(key, { mesh: root, inner: mesh, kind, growthT, stage });
  }

  function remove(x, y, z) {
    const key = K(x, y, z);
    const s = meshes.get(key);
    if (s) {
      if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
      meshes.delete(key);
    }
  }

  // Atualiza crescimento: muda → árvore após X segundos; trigo passa por 4 estágios.
  let timer = 0;
  function update(dt) {
    timer += dt;
    if (timer < 0.5) return;
    timer = 0;

    for (const [key, s] of Array.from(meshes.entries())) {
      if (s.kind === TALLGRASS_ID) continue;
      s.growthT += 0.5;

      if (s.kind === SAPLING_ID) {
        if (s.growthT > 25 + Math.random() * 15) {
          // vira árvore
          const [x, y, z] = key.split(',').map(Number);
          remove(x, y, z);
          Game.world.set(x, y, z, 0);
          growTree(x, y, z);
        }
      } else if (s.kind === WHEAT_ID) {
        // 4 estágios: 0..3, cada ~10s
        const newStage = Math.min(3, Math.floor(s.growthT / 10));
        if (newStage !== s.stage) {
          s.stage = newStage;
          // ajusta altura visual
          const heights = [0.30, 0.50, 0.75, 0.95];
          const yOffsets = [-0.35, -0.25, -0.12, 0];
          if (s.mesh.parent) s.mesh.parent.remove(s.inner);
          const newInner = buildCrossMesh(matWheat0, heights[newStage]);
          newInner.position.y = yOffsets[newStage];
          s.mesh.add(newInner);
          s.inner = newInner;
        }
      }
    }
  }

  function growTree(x, y, z) {
    const trunkH = 4 + Math.floor(Math.random() * 2);
    for (let j = 0; j < trunkH; j++) {
      Game.world.set(x, y + j, z, 4);
      Game.world.refresh(x, y + j, z);
    }
    const top = y + trunkH;
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -2; dz <= 2; dz++)
        for (let dy = -1; dy <= 2; dy++) {
          const d = Math.sqrt(dx * dx + dz * dz + dy * dy * 0.7);
          if (d < 2.6 && Game.world.get(x + dx, top + dy, z + dz) === 0 && Math.random() < 0.85) {
            Game.world.set(x + dx, top + dy, z + dz, 5);
            Game.world.refresh(x + dx, top + dy, z + dz);
          }
        }
    if (Game.audio) Game.audio.play('break_wood');
    if (Game.utils) Game.utils.showToast('🌳 Árvore cresceu!');
  }

  // Verifica se a planta ainda está apoiada em bloco apropriado;
  // se não, dropa o item e remove.
  function isValidGround(x, y, z, kind) {
    const below = Game.world.get(x, y - 1, z);
    if (kind === WHEAT_ID) return below === FARMLAND_ID || below === 38;
    return below === 1 || below === 2;  // grama ou terra
  }

  function getDropFor(kind, fullyGrown) {
    if (kind === SAPLING_ID) return [{ id: 121, count: 1 }];
    if (kind === TALLGRASS_ID) return Math.random() < 0.35 ? [{ id: 121, count: 1 }] : [];
    if (kind === WHEAT_ID) {
      if (fullyGrown) return [{ id: 122, count: 1 }, { id: 121, count: 1 + Math.floor(Math.random() * 2) }];
      return [{ id: 121, count: 1 }];
    }
    return [];
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
          if (t === SAPLING_ID || t === WHEAT_ID || t === TALLGRASS_ID) {
            place(x0 + lx, y, z0 + lz, t);
          }
        }
  }

  // Spawn natural de tall grass (chamado durante geração).
  function scatterTallGrass(generateChunkData) { /* hook futuro */ }

  function getStage(x, y, z) {
    const s = meshes.get(K(x, y, z));
    return s ? (s.stage || 0) : 0;
  }
  function isFullyGrown(x, y, z) {
    const s = meshes.get(K(x, y, z));
    if (!s) return false;
    if (s.kind === WHEAT_ID) return s.stage >= 3;
    return false;
  }

  Game.plants = {
    SAPLING_ID, WHEAT_ID, TALLGRASS_ID, FARMLAND_ID,
    bindScene, place, remove, update, unloadChunk, loadChunk,
    isValidGround, getDropFor, getStage, isFullyGrown, growTree,
  };
})();
