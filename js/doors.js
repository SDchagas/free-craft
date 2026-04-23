/* =========================================================
   Doors — portas finas, com toggle aberto/fechado, dobradiça
   no canto e orientação automática conforme onde o player
   olhava ao colocar.

   World armazena bloco id=10 normalmente; o RENDER da porta
   é tratado por este módulo (não usa o cubo padrão).
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};
  const { blockKey: K } = Game.utils;

  // por bloco: { open, facing, mesh, hingeSide }
  // facing: 0=Norte (-Z), 1=Leste (+X), 2=Sul (+Z), 3=Oeste (-X)
  // hingeSide: 'left' ou 'right' (relativo ao facing)
  const states = new Map();

  let scene = null;
  function bindScene(s) { scene = s; }

  // Geometria fina (placa) e materiais com textura de porta
  const doorGeo = new THREE.BoxGeometry(0.95, 1.85, 0.12);
  let doorMatTop = null, doorMatBot = null;

  function getDoorMaterials() {
    if (doorMatTop) return { top: doorMatTop, bot: doorMatBot };
    doorMatTop = new THREE.MeshLambertMaterial({
      map: Game.tex.doorTop, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide,
    });
    doorMatBot = new THREE.MeshLambertMaterial({
      map: Game.tex.doorBottom, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide,
    });
    return { top: doorMatTop, bot: doorMatBot };
  }

  // Constrói a placa da porta. A placa estende-se em +X de 0 a 1.0 (largura)
  // — o pivô (eixo Y do grupo) fica na quina esquerda da placa.
  function buildPlaca() {
    const mats = getDoorMaterials();
    const g = new THREE.Group();
    const bot = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.92, 0.10), mats.bot);
    bot.position.set(0.50, -0.46, 0);   // box centrada em x=0.50 (estende 0..1.0)
    g.add(bot);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.92, 0.10), mats.top);
    top.position.set(0.50,  0.46, 0);
    g.add(top);
    return g;
  }

  // Cria o GROUP da porta com pivô na quina do bloco.
  //   facing: 0=+Z, 1=-X, 2=-Z, 3=+X (lado do bloco onde a porta está)
  //   hingeSide: 'left' ou 'right'
  // Quando fechada, a placa cobre exatamente uma face inteira do bloco.
  // Quando aberta (rotação ±90° em Y), gira em torno do pivô (quina) — como porta real.
  function buildDoorGroup(facing, hingeSide) {
    const placa = buildPlaca();
    if (hingeSide === 'right') placa.scale.x = -1;

    const pivot = new THREE.Group();
    pivot.add(placa);

    // PIVOT_DATA[facing][hinge] = { pos: [x,z], yaw: ang base }
    // Quando rotation.y = yaw e placa estende em +X (sem mirror), a placa cobre
    // a face apropriada do bloco, com o pivô exatamente na quina.
    const D = [
      // facing 0 (+Z front): placa no plano z=+0.5
      { left:  { pos: [-0.5, 0,  0.5], yaw: 0 },
        right: { pos: [ 0.5, 0,  0.5], yaw: Math.PI } },
      // facing 1 (-X front): placa no plano x=-0.5
      { left:  { pos: [-0.5, 0, -0.5], yaw: -Math.PI / 2 },
        right: { pos: [-0.5, 0,  0.5], yaw:  Math.PI / 2 } },
      // facing 2 (-Z front): placa no plano z=-0.5
      { left:  { pos: [ 0.5, 0, -0.5], yaw: Math.PI },
        right: { pos: [-0.5, 0, -0.5], yaw: 0 } },
      // facing 3 (+X front): placa no plano x=+0.5
      { left:  { pos: [ 0.5, 0,  0.5], yaw:  Math.PI / 2 },
        right: { pos: [ 0.5, 0, -0.5], yaw: -Math.PI / 2 } },
    ];
    const data = D[facing][hingeSide];
    pivot.position.set(data.pos[0], data.pos[1], data.pos[2]);
    pivot.rotation.y = data.yaw;

    const root = new THREE.Group();
    root.add(pivot);
    // pra animação saber o ângulo base ao alternar abrir/fechar
    pivot.userData.baseYaw = data.yaw;
    return { root, pivot, hingeSide, baseYaw: data.yaw };
  }

  // Decide o facing baseado no yaw do player (mais próximo das 4 cardinais).
  function facingFromYaw(yaw) {
    // yaw=0 olha pra -Z (norte). Conforme aumenta, gira no sentido anti-horário.
    let a = ((yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    // normaliza pra [0, 2π) e rotaciona pra usar Math.round
    const idx = Math.round(a / (Math.PI / 2)) % 4;
    // queremos a porta voltada PARA o player (oposto do olhar)
    return (idx + 2) % 4;
  }

  function place(x, y, z, yaw, hingeSide = 'left') {
    const key = K(x, y, z);
    if (states.has(key)) return;
    const facing = facingFromYaw(yaw);
    const built = buildDoorGroup(facing, hingeSide);
    built.root.position.set(x, y, z);
    if (scene) scene.add(built.root);
    states.set(key, {
      open: false, facing, hingeSide,
      mesh: built.root, pivot: built.pivot,
      baseYaw: built.baseYaw,
    });
  }

  function remove(x, y, z) {
    const key = K(x, y, z);
    const s = states.get(key);
    if (!s) return;
    if (scene && s.mesh.parent) s.mesh.parent.remove(s.mesh);
    states.delete(key);
  }

  function toggle(x, y, z) {
    const key = K(x, y, z);
    const s = states.get(key);
    if (!s) return false;
    s.open = !s.open;
    // hinge esquerda abre girando -90° (pra dentro do bloco), direita +90°
    const swing = s.hingeSide === 'left' ? -Math.PI / 2 : Math.PI / 2;
    s.targetYaw = s.baseYaw + (s.open ? swing : 0);
    if (Game.audio) Game.audio.play('door');
    return true;
  }

  function isOpen(x, y, z) {
    const s = states.get(K(x, y, z));
    return s ? s.open : false;
  }

  // anima portas em movimento
  function update(dt) {
    for (const s of states.values()) {
      if (s.targetYaw == null) continue;
      if (!s.pivot) continue;          // chunk descarregado: pula
      const cur = s.pivot.rotation.y;
      const dy = s.targetYaw - cur;
      if (Math.abs(dy) < 0.01) {
        s.pivot.rotation.y = s.targetYaw;
      } else {
        s.pivot.rotation.y += dy * Math.min(1, dt * 12);
      }
    }
  }

  // Recria o mesh de uma porta a partir do state preservado.
  function rebuildMesh(key) {
    const s = states.get(key);
    if (!s || s.mesh) return;
    const [x, y, z] = key.split(',').map(Number);
    const built = buildDoorGroup(s.facing, s.hingeSide);
    built.root.position.set(x, y, z);
    const swing = s.hingeSide === 'left' ? -Math.PI / 2 : Math.PI / 2;
    built.pivot.rotation.y = built.baseYaw + (s.open ? swing : 0);
    if (scene) scene.add(built.root);
    s.mesh = built.root;
    s.pivot = built.pivot;
    s.baseYaw = built.baseYaw;
  }

  // Quando chunk descarrega: só tira o mesh; mantém o estado pra recriar depois.
  function unloadChunk(cx, cz, CHUNK) {
    for (const [key, s] of states.entries()) {
      const [x, , z] = key.split(',').map(Number);
      if (Math.floor(x / CHUNK) === cx && Math.floor(z / CHUNK) === cz) {
        if (s.mesh && s.mesh.parent) s.mesh.parent.remove(s.mesh);
        s.mesh = null;
        s.pivot = null;
      }
    }
  }
  function loadChunk(cx, cz, CHUNK) {
    if (!Game.world) return;
    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    for (let lx = 0; lx < CHUNK; lx++)
      for (let lz = 0; lz < CHUNK; lz++)
        for (let y = -9; y < 30; y++) {
          const x = x0 + lx, z = z0 + lz;
          if (Game.world.get(x, y, z) === 10) {
            const key = K(x, y, z);
            if (states.has(key)) rebuildMesh(key);
            else place(x, y, z, 0);
          }
        }
  }

  Game.doors = { bindScene, place, remove, toggle, isOpen, update, unloadChunk, loadChunk, states };
})();
