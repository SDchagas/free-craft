/* =========================================================
   Lights — gerencia PointLights dinâmicas (tochas, lava, etc).
   Cria luz quando bloco com `light` é colocado, remove quando
   é destruído. Limita o total pra não estourar GPU.
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};
  const { blockKey: K } = Game.utils;

  const lights = new Map();   // "x,y,z" -> PointLight
  let scene = null;
  const MAX_LIGHTS = 32;

  function bindScene(s) { scene = s; }

  function add(x, y, z, lightDef) {
    if (!scene || !lightDef) return;
    const key = K(x, y, z);
    if (lights.has(key)) return;
    if (lights.size >= MAX_LIGHTS) return; // limite
    const lt = new THREE.PointLight(
      lightDef.color || 0xffaa44,
      lightDef.intensity || 1.2,
      lightDef.distance || 8
    );
    lt.position.set(x, y + 0.2, z);
    scene.add(lt);
    lights.set(key, lt);
  }

  function remove(x, y, z) {
    const key = K(x, y, z);
    const lt = lights.get(key);
    if (lt) {
      scene.remove(lt);
      lights.delete(key);
    }
  }

  // chamado quando um bloco é colocado/removido pra sincronizar
  function onBlockChanged(x, y, z, oldId, newId) {
    const oldDef = oldId ? Game.items[oldId] : null;
    const newDef = newId ? Game.items[newId] : null;
    if (oldDef && oldDef.light) remove(x, y, z);
    if (newDef && newDef.light) add(x, y, z, newDef.light);
  }

  // pisca a chama da tocha sutilmente
  let t = 0;
  function update(dt) {
    t += dt;
    const f = 1 + Math.sin(t * 8) * 0.06 + Math.sin(t * 23) * 0.03;
    for (const lt of lights.values()) {
      const base = lt.userData.base || lt.intensity;
      if (!lt.userData.base) lt.userData.base = lt.intensity;
      lt.intensity = lt.userData.base * f;
    }
  }

  function clear() {
    for (const lt of lights.values()) scene.remove(lt);
    lights.clear();
  }

  // Quando chunk é descarregado: remove luzes do chunk (mantém data).
  function unloadChunk(cx, cz, CHUNK) {
    for (const [key, lt] of Array.from(lights.entries())) {
      const [x, , z] = key.split(',').map(Number);
      if (Math.floor(x / CHUNK) === cx && Math.floor(z / CHUNK) === cz) {
        scene.remove(lt);
        lights.delete(key);
      }
    }
  }

  // Quando chunk é carregado: cria luzes para blocos com `light` no chunk.
  function loadChunk(cx, cz, CHUNK) {
    if (!Game.world) return;
    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    for (let lx = 0; lx < CHUNK; lx++)
      for (let lz = 0; lz < CHUNK; lz++)
        for (let y = -9; y < 30; y++) {
          const t = Game.world.get(x0 + lx, y, z0 + lz);
          if (!t) continue;
          const def = Game.items[t];
          if (def && def.light) add(x0 + lx, y, z0 + lz, def.light);
        }
  }

  Game.lights = { bindScene, add, remove, onBlockChanged, update, clear, lights, unloadChunk, loadChunk };
})();
