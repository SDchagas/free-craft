/* =========================================================
   World — voxel infinito por chunks com carregamento dinâmico.

   Estratégia leve:
     - DATA é mantido em memória pra todos os chunks já visitados.
     - MESHES (GPU) só existem para chunks dentro do RENDER_RADIUS
       E dentro do cone de visão do player (~110º à frente).
     - Cada chunk vira um THREE.Group; descarregar é remover o group
       inteiro do scene → frustum culling do Three.js opera por chunk.
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};
  const { mulberry32, blockKey: K, NEIGH } = Game.utils;

  const data = new Map();          // "x,y,z" -> id (todos os chunks gerados)
  const meshes = new Map();        // "x,y,z" -> THREE.Mesh (só dos chunks renderizados)
  const matCache = {};
  const geometry = new THREE.BoxGeometry(1, 1, 1);

  const CHUNK = 16;
  const KEEP_RADIUS   = 4;         // chunks com data gerada (em torno do player)
  const RENDER_RADIUS = 3;         // chunks renderizados (subset do keep)
  const NEAR_KEEP     = 1;         // chunks sempre renderizados (independente da direção)

  const generatedChunks = new Set();         // "cx,cz" -> data já criado
  const renderedChunks  = new Set();         // "cx,cz" -> meshes ativos
  const chunkGroups     = new Map();         // "cx,cz" -> THREE.Group

  let scene = null;
  function bindScene(s) { scene = s; }

  function chunkKey(cx, cz) { return `${cx},${cz}`; }
  function chunkOf(x, z) { return [Math.floor(x / CHUNK), Math.floor(z / CHUNK)]; }

  function get(x, y, z) { return data.get(K(x, y, z)) || 0; }

  function isOpaque(x, y, z) {
    const t = data.get(K(x, y, z));
    if (!t) return false;
    return !Game.items[t].transparent;
  }

  function buildMaterialsFromTex(def, texArr) {
    return texArr.map(tex => {
      const opts = { map: tex };
      if (def.transparent) {
        opts.transparent = true;
        opts.opacity = def.opacity != null ? def.opacity : 1.0;
        if (def.alphaTest != null) opts.alphaTest = def.alphaTest;
        opts.depthWrite = def.opacity == null || def.opacity > 0.95;
      }
      if (def.emissive) {
        opts.emissive = new THREE.Color(def.emissive);
        opts.emissiveIntensity = def.emissiveIntensity || 0.5;
      }
      return new THREE.MeshLambertMaterial(opts);
    });
  }

  function getMaterials(type, x, y, z) {
    const def = Game.items[type];
    // Blocos com `texVariants` escolhem aleatoriamente baseado em hash(x,y,z)
    if (def.texVariants && x != null) {
      const h = ((x | 0) * 73856093) ^ ((y | 0) * 19349663) ^ ((z | 0) * 83492791);
      const variant = (h >>> 0) % def.texVariants.length;
      const cacheKey = `${type}#${variant}`;
      if (matCache[cacheKey]) return matCache[cacheKey];
      matCache[cacheKey] = buildMaterialsFromTex(def, def.texVariants[variant]);
      return matCache[cacheKey];
    }
    if (matCache[type]) return matCache[type];
    matCache[type] = buildMaterialsFromTex(def, def.tex);
    return matCache[type];
  }

  function isExposed(x, y, z) {
    const myType = data.get(K(x, y, z));
    const myDef = Game.items[myType];
    const myTransparent = myDef && myDef.transparent;
    for (const [dx, dy, dz] of NEIGH) {
      const nType = data.get(K(x + dx, y + dy, z + dz));
      if (!nType) return true;
      const nDef = Game.items[nType];
      if (nDef.transparent && !myTransparent) return true;
      if (myTransparent && nDef.transparent && nType !== myType) return true;
    }
    return false;
  }

  function getOrMakeChunkGroup(cx, cz) {
    const key = chunkKey(cx, cz);
    let g = chunkGroups.get(key);
    if (!g) {
      g = new THREE.Group();
      g.userData.chunkKey = key;
      chunkGroups.set(key, g);
    }
    return g;
  }

  // Renderiza/atualiza o mesh de um único bloco.
  // Só age se o chunk dele estiver na lista de renderedChunks.
  function render(x, y, z) {
    const [cx, cz] = chunkOf(x, z);
    if (!renderedChunks.has(chunkKey(cx, cz))) return;

    const key = K(x, y, z);
    const t = data.get(key);
    if (!t || !isExposed(x, y, z)) {
      const m = meshes.get(key);
      if (m) {
        if (m.parent) m.parent.remove(m);
        meshes.delete(key);
      }
      return;
    }
    // blocos com mesh customizado (skip do cubo padrão)
    if (t === 10) return;  // porta
    if (t === 20) return;  // tocha
    if (t === 31) return;  // cerca
    if (t === 32) return;  // portão
    if (t === 33) return;  // cama
    if (t === 35) return;  // muda
    if (t === 36) return;  // trigo
    if (t === 37) return;  // grama alta
    // toda água tem mesh próprio gerenciado por water.js
    if (t === 7) {
      const m = meshes.get(key);
      if (m) { if (m.parent) m.parent.remove(m); meshes.delete(key); }
      return;
    }
    if (meshes.has(key)) return;
    const m = new THREE.Mesh(geometry, getMaterials(t, x, y, z));
    m.position.set(x, y, z);
    if (Game.items[t].transparent) m.renderOrder = 1;
    const group = getOrMakeChunkGroup(cx, cz);
    group.add(m);
    meshes.set(key, m);
  }

  function refresh(x, y, z) {
    render(x, y, z);
    for (const [dx, dy, dz] of NEIGH) render(x + dx, y + dy, z + dz);
  }

  function set(x, y, z, t) {
    const key = K(x, y, z);
    const old = data.get(key) || 0;
    if (t === 0) data.delete(key);
    else data.set(key, t);
    if (Game.lights) Game.lights.onBlockChanged(x, y, z, old, t);
    if (Game.water && (old === 7 || t === 7)) Game.water.notifyNeighborChange(x, y, z);
    if (Game.doors && old === 10 && t !== 10) Game.doors.remove(x, y, z);
    if (Game.torches && old === 20 && t !== 20) Game.torches.remove(x, y, z);
    if (Game.fences && (old === 31 || old === 32) && t !== old) Game.fences.remove(x, y, z);
    if (Game.beds && old === 33 && t !== 33) Game.beds.remove(x, y, z);
    if (Game.plants && (old === 35 || old === 36 || old === 37) && t !== old) Game.plants.remove(x, y, z);
    // multiplayer: notifica peers (mas só pra mudanças reais — geração de chunk não conta)
    if (Game.multiplayer && Game.multiplayer.enabled && Game.world.generated) {
      Game.multiplayer.notifyBlockChange(x, y, z, t);
    }
  }

  // ---------- Geração por chunks (apenas DATA) ----------
  function noise(x, z) {
    return Math.sin(x * 0.15) * 2 + Math.cos(z * 0.18) * 2 +
           Math.sin((x + z) * 0.08) * 3 + Math.cos(x * 0.05 + z * 0.07) * 2;
  }
  function biomeNoise(x, z) {
    return Math.sin(x * 0.04) * 0.5 + Math.cos(z * 0.05) * 0.5 + Math.sin((x + z) * 0.03);
  }
  function chunkSeed(cx, cz) {
    return ((cx * 73856093) ^ (cz * 19349663)) >>> 0;
  }

  function generateChunkData(cx, cz) {
    const key = chunkKey(cx, cz);
    if (generatedChunks.has(key)) return;
    generatedChunks.add(key);

    const oreRng  = mulberry32(chunkSeed(cx, cz) ^ 0xABCDE);
    const treeRng = mulberry32(chunkSeed(cx, cz) ^ 0x12345);
    const x0 = cx * CHUNK, z0 = cz * CHUNK;

    for (let lx = 0; lx < CHUNK; lx++) {
      for (let lz = 0; lz < CHUNK; lz++) {
        const x = x0 + lx, z = z0 + lz;
        const h = Math.max(2, Math.floor(noise(x, z) + 6));
        const biome = biomeNoise(x, z);
        const isBeach = biome > 0.4 && h < 7;

        for (let y = -8; y < h - 3; y++) {
          let block = 3;
          const r = oreRng();
          if      (y < -4 && r < 0.005) block = 17;
          else if (y < -3 && r < 0.008) block = 18;
          else if (y < -2 && r < 0.012) block = 16;
          else if (y < -1 && r < 0.018) block = 22;
          else if (y < -1 && r < 0.020) block = 19;
          else if (y < 0  && r < 0.024) block = 24;
          else if (y < 1  && r < 0.030) block = 15;
          else if (y < 4  && r < 0.045) block = 14;
          set(x, y, z, block);
        }
        set(x, -9, z, 3);
        for (let y = h - 3; y < h - 1; y++) set(x, y, z, isBeach ? 11 : 2);
        set(x, h - 1, z, isBeach ? 11 : 1);
      }
    }

    // grama alta espalhada (decoração)
    for (let lx = 0; lx < CHUNK; lx++) {
      for (let lz = 0; lz < CHUNK; lz++) {
        if (treeRng() < 0.06) {
          const x = x0 + lx, z = z0 + lz;
          const top = topY(x, z);
          if (top > 0 && get(x, top - 1, z) === 1 && get(x, top, z) === 0) {
            set(x, top, z, 37);  // tall grass
          }
        }
      }
    }

    // árvores (4 formas diferentes pra evitar paisagem monótona)
    const treeCount = Math.floor(treeRng() * 4);
    for (let i = 0; i < treeCount; i++) {
      const lx = Math.floor(treeRng() * (CHUNK - 4)) + 2;
      const lz = Math.floor(treeRng() * (CHUNK - 4)) + 2;
      const tx = x0 + lx, tz = z0 + lz;
      const top = topY(tx, tz);
      if (top <= 0) continue;
      const groundType = get(tx, top - 1, tz);
      if (groundType !== 1) continue;
      const variant = Math.floor(treeRng() * 4);
      growTreeVariant(tx, top, tz, variant, treeRng);
    }

    // lago raro (1 a cada ~20 chunks)
    if (treeRng() < 0.05) {
      const lx = Math.floor(CHUNK / 2), lz = Math.floor(CHUNK / 2);
      const cxw = x0 + lx, czw = z0 + lz;
      const top = topY(cxw, czw);
      if (top > 0 && top < 9) {
        for (let dx = -3; dx <= 3; dx++)
          for (let dz = -3; dz <= 3; dz++) {
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d < 3) {
              for (let y = top; y <= top + 3; y++) set(cxw + dx, y, czw + dz, 0);
              for (let y = top - 1; y <= top; y++) set(cxw + dx, y, czw + dz, 7);
              set(cxw + dx, top - 2, czw + dz, 11);
            }
          }
      }
    }

    // (populate de mobs roda em loadChunkRender — quando o player chega perto)
  }

  // Variantes de árvore — alturas, tamanhos e formatos de copa diferentes
  function growTreeVariant(tx, ty, tz, variant, rng) {
    rng = rng || Math.random;
    const r = () => (typeof rng === 'function' ? rng() : Math.random());
    if (variant === 0) {
      // Carvalho pequeno: tronco curto, copa esférica média
      const trunkH = 4 + Math.floor(r() * 2);
      for (let j = 0; j < trunkH; j++) set(tx, ty + j, tz, 4);
      const tt = ty + trunkH;
      const radius = 2.4;
      for (let dx = -2; dx <= 2; dx++)
        for (let dz = -2; dz <= 2; dz++)
          for (let dy = -1; dy <= 2; dy++) {
            const d = Math.sqrt(dx*dx + dz*dz + dy*dy * 0.7);
            if (d < radius && get(tx+dx, tt+dy, tz+dz) === 0 && r() < 0.85) set(tx+dx, tt+dy, tz+dz, 5);
          }
    } else if (variant === 1) {
      // Alta e estreita: tronco 7-9, copa pequena no topo
      const trunkH = 7 + Math.floor(r() * 3);
      for (let j = 0; j < trunkH; j++) set(tx, ty + j, tz, 4);
      const tt = ty + trunkH;
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++)
          for (let dy = -1; dy <= 1; dy++) {
            const d = Math.abs(dx) + Math.abs(dz) + Math.abs(dy);
            if (d < 2.5 && get(tx+dx, tt+dy, tz+dz) === 0) set(tx+dx, tt+dy, tz+dz, 5);
          }
      // ponta
      set(tx, tt + 1, tz, 5);
    } else if (variant === 2) {
      // Carvalho largo: tronco 5, copa larga 3 layers
      const trunkH = 5 + Math.floor(r() * 2);
      for (let j = 0; j < trunkH; j++) set(tx, ty + j, tz, 4);
      const tt = ty + trunkH;
      // 3 camadas: maior na base, menor no topo
      const layers = [
        { dy:  -1, rad: 3 },
        { dy:   0, rad: 2.5 },
        { dy:   1, rad: 2 },
        { dy:   2, rad: 1.4 },
      ];
      for (const L of layers) {
        const ri = Math.ceil(L.rad);
        for (let dx = -ri; dx <= ri; dx++)
          for (let dz = -ri; dz <= ri; dz++) {
            const d = Math.sqrt(dx*dx + dz*dz);
            if (d < L.rad && get(tx+dx, tt+L.dy, tz+dz) === 0 && r() < 0.92) {
              set(tx+dx, tt+L.dy, tz+dz, 5);
            }
          }
      }
    } else {
      // Pinheiro cônico: tronco 6, copa de "andares" diminuindo
      const trunkH = 6 + Math.floor(r() * 3);
      for (let j = 0; j < trunkH; j++) set(tx, ty + j, tz, 4);
      const tt = ty + trunkH - 4;
      // 4 andares cônicos
      for (let layer = 0; layer < 4; layer++) {
        const yy = tt + layer * 1;
        const rad = Math.max(0.5, 2.2 - layer * 0.55);
        const ri = Math.ceil(rad);
        for (let dx = -ri; dx <= ri; dx++)
          for (let dz = -ri; dz <= ri; dz++) {
            const d = Math.sqrt(dx*dx + dz*dz);
            if (d < rad && get(tx+dx, yy, tz+dz) === 0) set(tx+dx, yy, tz+dz, 5);
          }
      }
      // ponta
      set(tx, tt + 4, tz, 5);
    }
  }

  function topY(x, z) {
    for (let y = 30; y >= -9; y--) {
      const t = data.get(K(x, y, z));
      if (t && !Game.items[t].liquid) return y + 1;
    }
    return 0;
  }

  // Carrega meshes pra um chunk (cria Group e materializa blocos expostos).
  function loadChunkRender(cx, cz) {
    const key = chunkKey(cx, cz);
    if (renderedChunks.has(key)) return;
    renderedChunks.add(key);
    const group = getOrMakeChunkGroup(cx, cz);
    if (!group.parent) scene.add(group);

    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    for (let lx = 0; lx < CHUNK; lx++)
      for (let lz = 0; lz < CHUNK; lz++)
        for (let y = -9; y < 30; y++) {
          if (data.has(K(x0 + lx, y, z0 + lz))) render(x0 + lx, y, z0 + lz);
        }

    if (Game.lights)  Game.lights.loadChunk(cx, cz, CHUNK);
    if (Game.doors)   Game.doors.loadChunk(cx, cz, CHUNK);
    if (Game.torches) Game.torches.loadChunk(cx, cz, CHUNK);
    if (Game.fences)  Game.fences.loadChunk(cx, cz, CHUNK);
    if (Game.beds)    Game.beds.loadChunk(cx, cz, CHUNK);
    if (Game.plants)  Game.plants.loadChunk(cx, cz, CHUNK);
    if (Game.water && Game.water.loadChunk) Game.water.loadChunk(cx, cz, CHUNK);
    // popula com mobs ao chegar perto (cada chunk só na primeira vez)
    if (Game.npcs && Game.npcs.populateChunk) Game.npcs.populateChunk(cx, cz, CHUNK);
  }

  // Descarrega meshes do chunk (preserva DATA).
  function unloadChunkRender(cx, cz) {
    const key = chunkKey(cx, cz);
    if (!renderedChunks.has(key)) return;
    renderedChunks.delete(key);

    const group = chunkGroups.get(key);
    if (group) {
      // remove referências no map de meshes
      for (const child of group.children) {
        const bk = `${child.position.x},${child.position.y},${child.position.z}`;
        meshes.delete(bk);
      }
      if (group.parent) group.parent.remove(group);
      // descarta o group inteiro pra liberar GC
      chunkGroups.delete(key);
    }

    if (Game.lights)  Game.lights.unloadChunk(cx, cz, CHUNK);
    if (Game.doors)   Game.doors.unloadChunk(cx, cz, CHUNK);
    if (Game.torches) Game.torches.unloadChunk(cx, cz, CHUNK);
    if (Game.fences)  Game.fences.unloadChunk(cx, cz, CHUNK);
    if (Game.beds)    Game.beds.unloadChunk(cx, cz, CHUNK);
    if (Game.plants)  Game.plants.unloadChunk(cx, cz, CHUNK);
    if (Game.water && Game.water.unloadChunk) Game.water.unloadChunk(cx, cz, CHUNK);
    // permite re-popular o chunk com mobs novos quando o player voltar
    if (Game.npcs && Game.npcs.unpopulateChunk) Game.npcs.unpopulateChunk(cx, cz);
  }

  // Decide se chunk deve estar renderizado dada posição+olhar do player.
  // Cone de ~110° à frente; chunks bem perto sempre renderizam.
  function shouldRender(cx, cz, pcx, pcz, fwdX, fwdZ) {
    const dx = cx - pcx, dz = cz - pcz;
    const dist2 = dx * dx + dz * dz;
    if (dist2 > RENDER_RADIUS * RENDER_RADIUS) return false;
    if (dist2 <= NEAR_KEEP * NEAR_KEEP) return true;
    const len = Math.sqrt(dist2);
    const dot = (dx * fwdX + dz * fwdZ) / len;
    return dot > -0.35;  // ~110° de FOV horizontal
  }

  // Update completo: gera dados de chunks no KEEP_RADIUS, ajusta os
  // renderizados conforme RENDER_RADIUS + cone de visão.
  function updateChunkRendering(playerX, playerZ, yaw) {
    const [pcx, pcz] = chunkOf(playerX, playerZ);
    // direção do olhar no plano XZ (player.yaw=0 olha para -Z, segundo o setup)
    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);

    // 1) garante DATA gerada num raio maior
    for (let dx = -KEEP_RADIUS; dx <= KEEP_RADIUS; dx++) {
      for (let dz = -KEEP_RADIUS; dz <= KEEP_RADIUS; dz++) {
        if (dx * dx + dz * dz > KEEP_RADIUS * KEEP_RADIUS) continue;
        generateChunkData(pcx + dx, pcz + dz);
      }
    }

    // 2) decide quais chunks devem renderizar
    const target = new Set();
    for (let dx = -RENDER_RADIUS; dx <= RENDER_RADIUS; dx++) {
      for (let dz = -RENDER_RADIUS; dz <= RENDER_RADIUS; dz++) {
        if (shouldRender(pcx + dx, pcz + dz, pcx, pcz, fwdX, fwdZ)) {
          target.add(chunkKey(pcx + dx, pcz + dz));
        }
      }
    }

    // 3) descarrega os que sobram
    for (const key of Array.from(renderedChunks)) {
      if (!target.has(key)) {
        const [cx, cz] = key.split(',').map(Number);
        unloadChunkRender(cx, cz);
      }
    }

    // 4) carrega os que faltam
    for (const key of target) {
      if (!renderedChunks.has(key)) {
        const [cx, cz] = key.split(',').map(Number);
        loadChunkRender(cx, cz);
      }
    }
  }

  // Setup inicial: gera+renderiza chunks ao redor do spawn (sem cone).
  function generate() {
    const [pcx, pcz] = chunkOf(0, 0);
    for (let dx = -KEEP_RADIUS; dx <= KEEP_RADIUS; dx++) {
      for (let dz = -KEEP_RADIUS; dz <= KEEP_RADIUS; dz++) {
        if (dx * dx + dz * dz > KEEP_RADIUS * KEEP_RADIUS) continue;
        generateChunkData(pcx + dx, pcz + dz);
      }
    }
    for (let dx = -RENDER_RADIUS; dx <= RENDER_RADIUS; dx++) {
      for (let dz = -RENDER_RADIUS; dz <= RENDER_RADIUS; dz++) {
        if (dx * dx + dz * dz > RENDER_RADIUS * RENDER_RADIUS) continue;
        loadChunkRender(pcx + dx, pcz + dz);
      }
    }
    // landmark: apenas a mesa de craft no spawn
    const my = topY(2, 2);
    set(2, my, 2, 13); refresh(2, my, 2);
    // a partir daqui, mudanças no mundo são "intencionais" (player) e devem
    // sincronizar via multiplayer
    Game.world.generated = true;
  }

  // Versão "burra" usada por sistemas que só sabem coordenada (Tom spawn etc.)
  function ensureChunksAround(x, z) {
    const [pcx, pcz] = chunkOf(x, z);
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++)
        generateChunkData(pcx + dx, pcz + dz);
  }

  function chunkStats() {
    return {
      generated: generatedChunks.size,
      rendered: renderedChunks.size,
      meshes: meshes.size,
    };
  }

  // ---------- Spread de grama ----------
  // A cada N segundos, alguns blocos de terra (id=2) com vizinhança exposta
  // viram grama (id=1) se houver grama adjacente. Limitado pra não custar caro.
  let spreadTimer = 0;
  const SPREAD_INTERVAL = 3.0;
  const SPREAD_MAX_TICKS = 80;
  function spreadGrassTick() {
    if (!Game.player || !Game.player.pos) return;
    const px = Math.floor(Game.player.pos.x);
    const pz = Math.floor(Game.player.pos.z);
    const R = 22;  // raio em volta do player
    let attempts = 0;
    while (attempts < SPREAD_MAX_TICKS) {
      attempts++;
      const x = px + Math.floor((Math.random() - 0.5) * 2 * R);
      const z = pz + Math.floor((Math.random() - 0.5) * 2 * R);
      // y mais provável: topo do terreno
      const y = topY(x, z) - 1;
      if (y < 0) continue;
      if (data.get(K(x, y, z)) !== 2) continue;     // precisa ser terra
      if (data.get(K(x, y + 1, z))) continue;        // precisa ter ar acima
      // verifica vizinhos (incluindo diagonais XZ até ±1Y)
      let hasGrass = false;
      for (let dx = -1; dx <= 1 && !hasGrass; dx++) {
        for (let dy = -1; dy <= 1 && !hasGrass; dy++) {
          for (let dz = -1; dz <= 1 && !hasGrass; dz++) {
            if (dx === 0 && dy === 0 && dz === 0) continue;
            if (data.get(K(x + dx, y + dy, z + dz)) === 1) hasGrass = true;
          }
        }
      }
      if (!hasGrass) continue;
      set(x, y, z, 1);
      refresh(x, y, z);
    }
  }
  function spreadUpdate(dt) {
    spreadTimer += dt;
    if (spreadTimer < SPREAD_INTERVAL) return;
    spreadTimer = 0;
    spreadGrassTick();
  }

  Game.world = {
    data, meshes, matCache,
    generatedChunks, renderedChunks,
    CHUNK, KEEP_RADIUS, RENDER_RADIUS,
    bindScene, get, set, isOpaque, isExposed,
    render, refresh, generate, getMaterials, topY,
    ensureChunksAround,
    updateChunkRendering, chunkStats,
    spreadUpdate,
  };
})();
