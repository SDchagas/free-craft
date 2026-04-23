/* =========================================================
   Viewmodel — modelos 3D do item segurado, anexados à mão.
   Troca automaticamente quando o slot ativo muda; aplica
   pose específica por tipo (picareta, espada, pistola, arco,
   pá, machado, escudo, bloco, item).
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};

  // group anexado dentro da mão; é o que troca de mesh quando muda o item
  let toolGroup = null;
  let decorGroup = null;        // luva + linhas (escondidos quando há tool)
  let currentItemId = null;

  // Pose base do toolGroup por tipo. Posição é relativa à mão.
  // Dica: a luva está em hand.y=0.18, então os modelos com cabo vertical
  // ficam centralizados em y≈0.18 pra cabo "passar" pela mão.
  const POSES = {
    default: { p: [0.00,  0.00,  0.00], r: [0.00,  0.00,  0.00] },
    // ferramentas com cabo vertical: ficam diagonais e "saem" pela frente da mão
    pick:    { p: [0.05, 0.20, -0.20], r: [-0.50, -0.40,  0.40] },
    sword:   { p: [0.05, 0.30, -0.15], r: [-0.30, -0.20,  0.20] },
    shovel:  { p: [0.05, 0.20, -0.20], r: [-0.50, -0.30,  0.30] },
    axe:     { p: [0.05, 0.20, -0.20], r: [-0.50, -0.45,  0.45] },
    // armas à distância: cano/arco apontando pra frente (-Z) saindo da mão
    gun:     { p: [0.00, 0.10, -0.32], r: [-0.08, 0.05,  0.00] },
    bow:     { p: [0.00, 0.15, -0.20], r: [ 0.00, 1.30,  0.00] },
    shield:  { p: [-0.05, 0.18, -0.18], r: [0.00, 0.40,  0.00] },
    // bloco/item: ficam em cima/na frente da mão como uma "amostra"
    block:   { p: [0.00, 0.30, -0.15], r: [ 0.30, -0.40,  0.20] },
    item:    { p: [0.00, 0.28, -0.12], r: [ 0.20, -0.30,  0.10] },
  };

  const TIER_COLOR = {
    1: 0xb88060, 2: 0x888888, 3: 0xd8d8d8, 4: 0x5dd4f5,
    wood: 0xb88060, stone: 0x888888, iron: 0xd8d8d8, diamond: 0x5dd4f5, gold: 0xFFD700,
  };
  function levelColor(lv) { return TIER_COLOR[lv] || 0x888888; }

  function init(host, decor) {
    toolGroup = new THREE.Group();
    host.add(toolGroup);
    decorGroup = decor || null;
  }

  // ---------- Builders ----------
  function makeHandle(len = 0.5, color = 0x8b5a2b) {
    return new THREE.Mesh(
      new THREE.BoxGeometry(0.05, len, 0.05),
      new THREE.MeshLambertMaterial({ color })
    );
  }

  // Picareta MC-like: cabo + cabeça larga em "T" com pontas que descem.
  function makePickModel(def) {
    const g = new THREE.Group();
    const matHead = new THREE.MeshLambertMaterial({ color: levelColor(def.toolLevel) });
    const matHi   = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });
    // cabo (longo e fino)
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.62, 0.07), stickMat());
    handle.position.y = -0.10;
    g.add(handle);
    // cabeça: barra horizontal larga (como um piolet)
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.10, 0.10), matHead);
    bar.position.y = 0.22;
    g.add(bar);
    // 2 pontas que descem das extremidades
    const tipL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.14, 0.10), matHead);
    tipL.position.set(-0.18, 0.13, 0); g.add(tipL);
    const tipR = tipL.clone(); tipR.position.x = 0.18; g.add(tipR);
    // bandeira de brilho na cabeça
    const hi = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.02, 0.105), matHi);
    hi.position.y = 0.27;
    g.add(hi);
    return g;
  }

  // Espada MC: lâmina longa + guarda em cruz + cabo + pommel.
  function makeSwordModel(def) {
    const g = new THREE.Group();
    const matBlade = new THREE.MeshLambertMaterial({ color: levelColor(def.toolLevel) });
    const matHi    = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
    // lâmina longa
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.7, 0.025), matBlade);
    blade.position.y = 0.18;
    g.add(blade);
    // brilho no fio
    const hi = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.7, 0.026), matHi);
    hi.position.set(-0.024, 0.18, 0);
    g.add(hi);
    // guarda dourada (cruz)
    const guard = new THREE.Mesh(
      new THREE.BoxGeometry(0.30, 0.05, 0.07),
      new THREE.MeshLambertMaterial({ color: 0xFFD700 })
    );
    guard.position.y = -0.20;
    g.add(guard);
    // cabo
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.18, 0.05),
      new THREE.MeshLambertMaterial({ color: 0x4a2810 })
    );
    grip.position.y = -0.33;
    g.add(grip);
    // pommel
    const pommel = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.07, 0.08),
      new THREE.MeshLambertMaterial({ color: 0xFFD700 })
    );
    pommel.position.y = -0.45;
    g.add(pommel);
    return g;
  }

  // Pá: cabo + lâmina retangular alongada
  function makeShovelModel(def) {
    const g = new THREE.Group();
    const matHead = new THREE.MeshLambertMaterial({ color: levelColor(def.toolLevel) });
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.55, 0.07), stickMat());
    handle.position.y = -0.13;
    g.add(handle);
    // colarinho (junção) menor
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.05, 0.08), matHead);
    collar.position.y = 0.18;
    g.add(collar);
    // lâmina retangular grande
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.30, 0.04), matHead);
    blade.position.y = 0.36;
    g.add(blade);
    // brilho
    const hi = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.30, 0.041),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.20 })
    );
    hi.position.set(0, 0.36, 0.001);
    g.add(hi);
    return g;
  }

  // Machado: cabo + cabeça em formato de meia-lua (lateral)
  function makeAxeModel(def) {
    const g = new THREE.Group();
    const matHead = new THREE.MeshLambertMaterial({ color: levelColor(def.toolLevel) });
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.62, 0.07), stickMat());
    handle.position.y = -0.05;
    g.add(handle);
    // cabeça grossa (atrás do cabo)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.08), matHead);
    head.position.set(0.08, 0.22, 0);
    g.add(head);
    // gume saliente (mais fino, à frente)
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.30, 0.04), matHead);
    edge.position.set(0.20, 0.22, 0);
    g.add(edge);
    // borda afiada
    const sharp = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.26, 0.05),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })
    );
    sharp.position.set(0.265, 0.22, 0);
    g.add(sharp);
    return g;
  }

  function stickMat() {
    return new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
  }

  // Pistola mais detalhada: corpo, slide, cano, cabo, gatilho, mira, martelo.
  function makePistolModel() {
    const g = new THREE.Group();
    const dark   = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const steel  = new THREE.MeshLambertMaterial({ color: 0x666666 });
    const wood   = new THREE.MeshLambertMaterial({ color: 0x4a2810 });
    const bright = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 });

    // corpo principal
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.14, 0.34), dark);
    body.position.set(0, 0.04, -0.08);
    g.add(body);
    // slide (parte cima do corpo)
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.05, 0.36), steel);
    slide.position.set(0, 0.13, -0.08);
    g.add(slide);
    // brilho slide
    const slideHi = new THREE.Mesh(new THREE.BoxGeometry(0.101, 0.025, 0.36), bright);
    slideHi.position.set(0, 0.16, -0.08);
    g.add(slideHi);
    // cano (sai à frente)
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.10), dark);
    barrel.position.set(0, 0.10, -0.30);
    g.add(barrel);
    // boca preta do cano
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    muzzle.position.set(0, 0.10, -0.36);
    g.add(muzzle);
    // mira frontal
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.02), dark);
    sight.position.set(0, 0.17, -0.25);
    g.add(sight);
    // mira traseira
    const rsight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.02), dark);
    rsight.position.set(0, 0.17, 0.07);
    g.add(rsight);
    // martelo
    const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.03), steel);
    hammer.position.set(0, 0.13, 0.10);
    g.add(hammer);
    // cabo (madeira) inclinado pra trás
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.10), wood);
    grip.position.set(0, -0.10, 0.05);
    grip.rotation.x = -0.20;
    g.add(grip);
    // base do cabo
    const baseGrip = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.03, 0.10), steel);
    baseGrip.position.set(0, -0.21, 0.07);
    g.add(baseGrip);
    // guarda do gatilho
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.10), steel);
    guard.position.set(0, -0.06, -0.04);
    g.add(guard);
    // gatilho
    const trig = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.02), steel);
    trig.position.set(0, -0.03, -0.04);
    g.add(trig);
    return g;
  }

  function makeBowModel() {
    const g = new THREE.Group();
    // arco curvado: torus parcial girado em volta do eixo Y
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.025, 6, 16, Math.PI * 0.85),
      new THREE.MeshLambertMaterial({ color: 0x8b5a2b })
    );
    arc.rotation.z = Math.PI;
    g.add(arc);
    // corda esticada
    const string = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 0.50, 4),
      new THREE.MeshBasicMaterial({ color: 0xfff7e6 })
    );
    string.position.x = 0.24;
    g.add(string);
    return g;
  }

  function makeShieldModel() {
    const g = new THREE.Group();
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.55, 0.05),
      new THREE.MeshLambertMaterial({ color: 0x8b5a2b })
    );
    g.add(plate);
    // borda
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.6, 0.02),
      new THREE.MeshLambertMaterial({ color: 0x3a2010 })
    );
    border.position.z = -0.03;
    g.add(border);
    // emblema dourado em cruz
    const v = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.40, 0.06),
      new THREE.MeshLambertMaterial({ color: 0xFFD700 })
    );
    v.position.z = 0.03;
    g.add(v);
    const h = new THREE.Mesh(
      new THREE.BoxGeometry(0.40, 0.10, 0.06),
      new THREE.MeshLambertMaterial({ color: 0xFFD700 })
    );
    h.position.z = 0.03;
    h.position.y = 0.05;
    g.add(h);
    return g;
  }

  function makeBlockModel(itemId) {
    const def = Game.items[itemId];
    if (!def || def.kind !== 'block') return null;
    const mats = Game.world.getMaterials(itemId);
    return new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), mats);
  }

  // Card 2D pra itens (recursos como diamante, redstone, etc.)
  function makeIconCard(iconTex) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.34),
      new THREE.MeshBasicMaterial({
        map: iconTex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide,
      })
    );
    return m;
  }

  function makeArmorModel(def) {
    return makeIconCard(def.icon);
  }

  // ---------- Classificação por tipo de pose ----------
  function poseFor(def) {
    if (!def) return POSES.default;
    if (def.kind === 'block') return POSES.block;
    if (def.kind === 'item')  return POSES.item;
    if (def.kind === 'armor') return POSES.item;
    if (def.kind === 'tool') {
      return POSES[def.toolType] || POSES.default;
    }
    if (def.kind === 'weapon') {
      return POSES[def.weaponType] || POSES.default;
    }
    return POSES.default;
  }

  function buildModel(itemId) {
    const def = Game.items[itemId];
    if (!def) return null;
    if (def.kind === 'block')  return makeBlockModel(itemId);
    if (def.kind === 'item')   return makeIconCard(def.icon);
    if (def.kind === 'armor')  return makeArmorModel(def);
    if (def.kind === 'tool') {
      switch (def.toolType) {
        case 'pick':   return makePickModel(def);
        case 'sword':  return makeSwordModel(def);
        case 'shovel': return makeShovelModel(def);
        case 'axe':    return makeAxeModel(def);
        default:       return makeIconCard(def.icon);
      }
    }
    if (def.kind === 'weapon') {
      switch (def.weaponType) {
        case 'gun':    return makePistolModel();
        case 'bow':    return makeBowModel();
        case 'shield': return makeShieldModel();
        default:       return makeIconCard(def.icon);
      }
    }
    return null;
  }

  function setItem(itemId) {
    if (currentItemId === itemId) return;
    currentItemId = itemId;
    if (!toolGroup) return;
    while (toolGroup.children.length) toolGroup.remove(toolGroup.children[0]);
    // mostra/esconde mão+manga
    if (decorGroup) {
      decorGroup.visible = true;  // group sempre visível, controla via hooks
      if (itemId && decorGroup.userData.hideOnTool) decorGroup.userData.hideOnTool();
      else if (decorGroup.userData.showWhenEmpty)   decorGroup.userData.showWhenEmpty();
    }
    if (!itemId) return;
    const mesh = buildModel(itemId);
    if (!mesh) return;
    toolGroup.add(mesh);
    const pose = poseFor(Game.items[itemId]);
    toolGroup.position.set(pose.p[0], pose.p[1], pose.p[2]);
    toolGroup.rotation.set(pose.r[0], pose.r[1], pose.r[2]);
  }

  // chamado quando o skin muda — refaz a mão/manga com novas cores
  function refreshSkin() {
    // o handModel é construído em main.js — chama o hook
    if (Game.rebuildHandModel) Game.rebuildHandModel();
  }

  function getCurrentDef() {
    return currentItemId ? Game.items[currentItemId] : null;
  }

  Game.viewmodel = { init, setItem, getCurrentDef, refreshSkin };
})();
