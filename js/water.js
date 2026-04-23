/* =========================================================
   Water — fluxo MC-like.
     - Sources (fontes): permanentes, level 8.
     - Falling (queda): vertical, level 8 também (não decai).
     - Flow (espalhamento horizontal): level 7 → 1 (decai 1 por bloco).
     - Sem fonte adjacente, flow decai 1/tick até virar ar.
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};
  const { blockKey: K } = Game.utils;

  const WATER_ID      = 7;
  const SOURCE_LEVEL  = 8;          // source ou queda vertical
  const MAX_FLOW      = 7;          // alcance horizontal máximo
  const FLOW_INTERVAL = 0.20;
  const TICK_BUDGET   = 256;

  // "x,y,z" -> { level, source }
  const data    = new Map();
  const pending = new Set();
  let timer = 0;

  function getEntry(x, y, z) { return data.get(K(x, y, z)); }
  function getLevel(x, y, z) {
    if (Game.world.get(x, y, z) !== WATER_ID) return 0;
    const e = data.get(K(x, y, z));
    return e ? e.level : SOURCE_LEVEL;
  }
  function isSource(x, y, z) {
    const e = data.get(K(x, y, z));
    return !!(e && e.source);
  }

  function scheduleAt(x, y, z) { pending.add(K(x, y, z)); }
  function scheduleNeighbors(x, y, z) {
    scheduleAt(x + 1, y, z); scheduleAt(x - 1, y, z);
    scheduleAt(x, y, z + 1); scheduleAt(x, y, z - 1);
    scheduleAt(x, y + 1, z); scheduleAt(x, y - 1, z);
  }

  function setWater(x, y, z, level, source) {
    const key = K(x, y, z);
    const cur = data.get(key);
    const wasSet = cur && cur.level === level && cur.source === source &&
                   Game.world.get(x, y, z) === WATER_ID;
    data.set(key, { level, source: !!source });
    if (Game.world.get(x, y, z) !== WATER_ID) {
      Game.world.set(x, y, z, WATER_ID);
      Game.world.refresh(x, y, z);
    }
    // atualiza/recria o mesh fino se level < SOURCE
    refreshFlowMesh(x, y, z, level);
    if (!wasSet) {
      scheduleAt(x, y, z);
      scheduleNeighbors(x, y, z);
    }
  }

  function clearWater(x, y, z) {
    const key = K(x, y, z);
    data.delete(key);
    removeFlowMesh(x, y, z);
    if (Game.world.get(x, y, z) === WATER_ID) {
      Game.world.set(x, y, z, 0);
      Game.world.refresh(x, y, z);
    }
    scheduleNeighbors(x, y, z);
  }

  // ---------- Visual: altura proporcional ao level ----------
  // Nível 8 (source/falling) usa o cubo padrão renderizado pelo world.
  // Nível 1-7 usa mesh customizado fino (lâmina) na base do bloco.
  const flowMeshes = new Map();   // "x,y,z" -> THREE.Mesh
  let flowMat = null;
  function getFlowMaterial() {
    if (flowMat) return flowMat;
    flowMat = new THREE.MeshLambertMaterial({
      map: Game.tex && Game.tex.water ? Game.tex.water : null,
      transparent: true, opacity: 0.7, depthWrite: false,
    });
    return flowMat;
  }

  function refreshFlowMesh(x, y, z, level) {
    const key = K(x, y, z);
    // se source/queda → remove mesh fino, deixa o cubo padrão
    if (level >= SOURCE_LEVEL) {
      removeFlowMesh(x, y, z);
      return;
    }
    // mesh fino: altura = level/8 do bloco
    const h = Math.max(0.12, level / 8);
    const yOffset = -0.5 + h / 2;  // base no fundo do bloco
    let m = flowMeshes.get(key);
    if (m) {
      // ajusta scale + posição
      m.scale.y = h;
      m.position.y = y + yOffset;
    } else {
      const geo = new THREE.BoxGeometry(0.96, 1.0, 0.96);  // y=1 base, escala depois
      m = new THREE.Mesh(geo, getFlowMaterial());
      m.position.set(x, y + yOffset, z);
      m.scale.y = h;
      m.renderOrder = 2;
      const scene = Game.scene;
      if (scene) scene.add(m);
      flowMeshes.set(key, m);
    }
  }

  function removeFlowMesh(x, y, z) {
    const key = K(x, y, z);
    const m = flowMeshes.get(key);
    if (m) {
      if (m.parent) m.parent.remove(m);
      flowMeshes.delete(key);
    }
  }

  function placeSource(x, y, z) {
    setWater(x, y, z, SOURCE_LEVEL, true);
    timer = FLOW_INTERVAL;  // dispara no próximo update
  }

  function processBlock(key) {
    const [x, y, z] = key.split(',').map(Number);
    const t = Game.world.get(x, y, z);
    if (t !== WATER_ID) {
      data.delete(key);
      return;
    }
    const me = data.get(key) || { level: SOURCE_LEVEL, source: true };
    const myLvl = me.level;
    const mySource = me.source;
    const aboveIsWater = Game.world.get(x, y + 1, z) === WATER_ID;

    // 1. Cair pra baixo se há ar
    if (Game.world.get(x, y - 1, z) === 0) {
      // queda vertical, level cheio (mas não-source)
      setWater(x, y - 1, z, SOURCE_LEVEL, false);
      // não retorna ainda — continua, pode espalhar XZ também (pequena diferença
      // do MC mas dá visual mais legal).
    }

    // 2. Decay: se NÃO é source e perdeu alimentação, decai/seca
    if (!mySource) {
      let supportLvl = 0;
      // coluna acima sustenta? (queda direta)
      if (aboveIsWater) supportLvl = SOURCE_LEVEL;
      // vizinhos com level superior alimentam
      for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nLvl = getLevel(x + dx, y, z + dz);
        if (nLvl > supportLvl) supportLvl = nLvl;
      }
      if (supportLvl <= myLvl) {
        // sem alimentação suficiente: decai
        const newLvl = myLvl - 1;
        if (newLvl <= 0) { clearWater(x, y, z); return; }
        setWater(x, y, z, newLvl, false);
        // não espalha quando está decaindo
        return;
      }
    }

    // 3. Espalhar XZ se há suporte sólido embaixo
    const blockBelow = Game.world.get(x, y - 1, z);
    const supportedBelow = blockBelow !== 0 && blockBelow !== WATER_ID;
    if (!supportedBelow) return;        // tá caindo, não espalha
    if (myLvl <= 1) return;             // muito fraco

    const newLvl = myLvl - 1;
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, nz = z + dz;
      const nb = Game.world.get(nx, y, nz);
      if (nb === 0) {
        setWater(nx, y, nz, newLvl, false);
      } else if (nb === WATER_ID) {
        const e = data.get(K(nx, y, nz));
        if (e && !e.source && e.level < newLvl) {
          setWater(nx, y, nz, newLvl, false);
        }
      }
    }
  }

  function tick() {
    if (pending.size === 0) return;
    let budget = TICK_BUDGET;
    const queue = Array.from(pending);
    pending.clear();
    for (const key of queue) {
      if (budget-- <= 0) { pending.add(key); continue; }
      processBlock(key);
    }
  }

  function update(dt) {
    timer += dt;
    if (timer >= FLOW_INTERVAL) {
      timer = 0;
      tick();
    }
  }

  function notifyNeighborChange(x, y, z) {
    scheduleNeighbors(x, y, z);
  }

  function initializeFromWorld() {
    for (const [key, t] of Game.world.data) {
      if (t === WATER_ID && !data.has(key)) {
        // águas naturais do mapa = sources
        data.set(key, { level: SOURCE_LEVEL, source: true });
        pending.add(key);
      }
    }
  }

  Game.water = {
    WATER_ID, SOURCE_LEVEL, MAX_FLOW,
    update, placeSource, notifyNeighborChange, initializeFromWorld,
    getLevel, isSource, clearWater,
  };
})();
