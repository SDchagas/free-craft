/* =========================================================
   PlayerMesh — corpo humanoide simples (estilo MC) usado em 3ª
   pessoa. Cores vêm de Game.skin.colors. Visível só quando a
   câmera não está em 1ª pessoa.
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};

  let group = null;
  let parts = {};
  let toolGroup = null;       // sub-group dentro da mão direita pro item segurado
  let currentItemId = null;

  function build() {
    const c = Game.skin.all();
    const g = new THREE.Group();

    const skin  = new THREE.MeshLambertMaterial({ color: c.skin });
    const hair  = new THREE.MeshLambertMaterial({ color: c.hair });
    const shirt = new THREE.MeshLambertMaterial({ color: c.shirt });
    const pants = new THREE.MeshLambertMaterial({ color: c.pants });
    const shoe  = new THREE.MeshLambertMaterial({ color: c.shoes });

    // dimensões (estilo MC: blocky)
    // pernas
    const legGeo = new THREE.BoxGeometry(0.22, 0.75, 0.22);
    const legL = new THREE.Mesh(legGeo, pants); legL.position.set(-0.13, 0.38, 0); g.add(legL);
    const legR = new THREE.Mesh(legGeo, pants); legR.position.set( 0.13, 0.38, 0); g.add(legR);
    // sapatos
    const shoeGeo = new THREE.BoxGeometry(0.24, 0.10, 0.28);
    const shoeL = new THREE.Mesh(shoeGeo, shoe); shoeL.position.set(-0.13, 0.05, 0.02); g.add(shoeL);
    const shoeR = new THREE.Mesh(shoeGeo, shoe); shoeR.position.set( 0.13, 0.05, 0.02); g.add(shoeR);
    // tronco
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.78, 0.30), shirt);
    torso.position.y = 1.15;
    g.add(torso);
    // braços
    const armGeo = new THREE.BoxGeometry(0.22, 0.75, 0.22);
    const armL = new THREE.Mesh(armGeo, shirt); armL.position.set(-0.40, 1.18, 0); g.add(armL);
    const armR = new THREE.Mesh(armGeo, shirt); armR.position.set( 0.40, 1.18, 0); g.add(armR);
    // mãos (cor de pele)
    const handGeo = new THREE.BoxGeometry(0.22, 0.10, 0.22);
    const handL = new THREE.Mesh(handGeo, skin); handL.position.set(-0.40, 0.78, 0); g.add(handL);
    const handR = new THREE.Mesh(handGeo, skin); handR.position.set( 0.40, 0.78, 0); g.add(handR);
    // group pra ferramenta/bloco segurado — anexado à mão direita,
    // levemente à frente pra não enfiar dentro da pele
    const tGroup = new THREE.Group();
    tGroup.position.set(0.40, 0.55, 0.15);
    tGroup.rotation.set(-0.3, 0, 0);
    g.add(tGroup);
    // cabeça
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.50, 0.50), skin);
    head.position.y = 1.80;
    g.add(head);
    // cabelo (cobre topo + atrás)
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.10, 0.52), hair);
    hairTop.position.y = 2.05;
    g.add(hairTop);
    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.30, 0.10), hair);
    hairBack.position.set(0, 1.85, -0.21);
    g.add(hairBack);
    // olhos
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x1a1a2e });
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.10, 1.85, 0.255); g.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat); eyeR.position.set( 0.10, 1.85, 0.255); g.add(eyeR);
    // boca
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.04),
      new THREE.MeshLambertMaterial({ color: 0x6a3010 }));
    mouth.position.set(0, 1.72, 0.255);
    g.add(mouth);

    // chapéu opcional
    const hat = Game.skin.HAT_OPTIONS[c.hat] || null;
    if (hat) {
      const hatMat = new THREE.MeshLambertMaterial({ color: hat.color });
      let hatMesh;
      if (hat.kind === 'cap') {
        hatMesh = new THREE.Group();
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.10, 0.55), hatMat);
        top.position.y = 2.12; hatMesh.add(top);
        const brim = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.04, 0.30), hatMat);
        brim.position.set(0, 2.05, 0.30); hatMesh.add(brim);
      } else if (hat.kind === 'helmet') {
        hatMesh = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.50, 0.58), hatMat);
        hatMesh.position.y = 1.85;
      } else if (hat.kind === 'crown') {
        hatMesh = new THREE.Group();
        const ring = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.55), hatMat);
        ring.position.y = 2.10; hatMesh.add(ring);
        for (let i = 0; i < 4; i++) {
          const tip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.08), hatMat);
          const angle = (i / 4) * Math.PI * 2;
          tip.position.set(Math.cos(angle) * 0.20, 2.20, Math.sin(angle) * 0.20);
          hatMesh.add(tip);
        }
      } else if (hat.kind === 'hood') {
        hatMesh = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.55, 0.62), hatMat);
        hatMesh.position.y = 1.83;
      }
      if (hatMesh) g.add(hatMesh);
    }

    return { g, parts: { legL, legR, armL, armR, head, handR, tGroup } };
  }

  // (re)constrói a mesh do item segurado dentro da mão direita.
  function setTool(itemId) {
    if (!toolGroup) return;
    if (currentItemId === itemId) return;
    currentItemId = itemId;
    while (toolGroup.children.length) toolGroup.remove(toolGroup.children[0]);
    if (!itemId || !Game.viewmodel) return;
    // reaproveita os mesmos builders do viewmodel
    const def = Game.items[itemId];
    if (!def) return;
    let mesh = null;
    try {
      // o viewmodel expõe makers internos via build through a hack: vamos
      // criar uma versão simplificada usando getMaterials pra blocos
      if (def.kind === 'block') {
        const mats = Game.world.getMaterials(itemId);
        mesh = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.30, 0.30), mats);
      } else if (def.icon) {
        mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(0.34, 0.34),
          new THREE.MeshBasicMaterial({ map: def.icon, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide })
        );
      }
    } catch (e) {}
    if (mesh) toolGroup.add(mesh);
  }

  function init(scene) {
    refreshSkin(scene);
  }

  function refreshSkin(scene) {
    if (group && group.parent) group.parent.remove(group);
    if (!scene && Game.scene) scene = Game.scene;
    if (!scene) return;
    const built = build();
    group = built.g;
    parts = built.parts;
    toolGroup = parts.tGroup;
    currentItemId = null;       // força reconstrução do tool no próximo update
    scene.add(group);
    setVisible(false);          // começa invisível (1ª pessoa por padrão)
  }

  function setVisible(v) { if (group) group.visible = v; }
  function isVisible() { return group ? group.visible : false; }

  let mineSwingT = 0;

  function update(dt) {
    if (!group || !Game.player) return;
    // sincroniza ferramenta segurada com slot ativo
    setTool(Game.inventory ? Game.inventory.getActiveId() : 0);

    // posição: baseada nos pés do player (player.pos é olho; pés = pos.y - height)
    const px = Game.player.pos.x;
    const py = Game.player.pos.y - Game.player.height;
    const pz = Game.player.pos.z;
    group.position.set(px, py, pz);
    group.rotation.y = Game.player.yaw + Math.PI;

    // anima andar (oscila pernas/braços)
    const walking = Game.player.onGround && (Game.input && Game.input.keys &&
      (Game.input.keys.KeyW || Game.input.keys.KeyS || Game.input.keys.KeyA || Game.input.keys.KeyD));
    const t = performance.now() * 0.008;
    if (walking) {
      const a = Math.sin(t) * 0.6;
      if (parts.legL) parts.legL.rotation.x =  a;
      if (parts.legR) parts.legR.rotation.x = -a;
      if (parts.armL) parts.armL.rotation.x = -a;
      if (parts.armR && !Game.mining_active) parts.armR.rotation.x = a;
    } else {
      for (const k of ['legL','legR','armL']) {
        if (parts[k]) parts[k].rotation.x *= 0.85;
      }
    }

    // animação do braço direito ao minerar/atacar — sobreescreve walking
    if (Game.mining_active) {
      mineSwingT += dt * 12;
      const swing = Math.sin(mineSwingT);
      if (parts.armR) parts.armR.rotation.x = -1.2 + swing * 0.6;
    } else {
      mineSwingT = 0;
      if (parts.armR && !walking) parts.armR.rotation.x *= 0.85;
    }
  }

  Game.playermesh = { init, refreshSkin, setVisible, isVisible, update, setTool };
})();
