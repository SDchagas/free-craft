/* =========================================================
   NPCs — duas espécies:
   - Rato selvagem (passivo, dropa queijo)
   - Tom (gato cinza-azulado, hostil, spawna à noite)

   Convenção:
     npc.pos.y = altura dos PÉS (base do modelo).
     mesh.position = npc.pos diretamente; o modelo é construído
     com y=0 na base.
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};

  const list = [];
  let scene = null;
  function bindScene(s) { scene = s; }

  // ---------- Mesh do rato ----------
  function makeRatMesh() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.7),
      new THREE.MeshLambertMaterial({ color: 0xb8b8c0 }));
    body.position.y = 0.3; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.3),
      new THREE.MeshLambertMaterial({ color: 0xc8c8d0 }));
    head.position.set(0, 0.45, 0.45); g.add(head);
    const earMat = new THREE.MeshLambertMaterial({ color: 0xff9090 });
    const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.04), earMat);
    e1.position.set(-0.12, 0.62, 0.42); g.add(e1);
    const e2 = e1.clone(); e2.position.x = 0.12; g.add(e2);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06),
      new THREE.MeshLambertMaterial({ color: 0x1a1a2e }));
    nose.position.set(0, 0.4, 0.61); g.add(nose);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.4),
      new THREE.MeshLambertMaterial({ color: 0xff9090 }));
    tail.position.set(0, 0.3, -0.45); g.add(tail);
    return { mesh: g, bodyIdx: 0, tailIdx: 5 };
  }

  // ---------- Mesh do Tom (cinza-azulado, com pés em y=0) ----------
  function makeTomMesh() {
    const g = new THREE.Group();
    const fur = new THREE.MeshLambertMaterial({ color: 0x6b8aa8 });
    const belly = new THREE.MeshLambertMaterial({ color: 0xfff7e6 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x1a1a2e });
    const pink = new THREE.MeshLambertMaterial({ color: 0xff9090 });
    const yellow = new THREE.MeshLambertMaterial({ color: 0xffd700 });

    // patas (na base, y=0..0.25)
    const pawGeo = new THREE.BoxGeometry(0.18, 0.25, 0.18);
    const p1 = new THREE.Mesh(pawGeo, belly); p1.position.set(-0.22, 0.125, 0.30); g.add(p1);
    const p2 = p1.clone(); p2.position.x = 0.22; g.add(p2);
    const p3 = p1.clone(); p3.position.set(-0.22, 0.125, -0.35); g.add(p3);
    const p4 = p1.clone(); p4.position.set( 0.22, 0.125, -0.35); g.add(p4);

    // corpo (pousa em cima das patas, y=0.25..0.85)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 1.0), fur);
    body.position.y = 0.55; g.add(body);
    // barriga branca
    const bel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.9), belly);
    bel.position.set(0, 0.32, 0.05); g.add(bel);
    // cabeça
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.5), fur);
    head.position.set(0, 0.95, 0.55); g.add(head);
    // focinho
    const muz = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.2), belly);
    muz.position.set(0, 0.85, 0.78); g.add(muz);
    // nariz
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.08), dark);
    nose.position.set(0, 0.92, 0.88); g.add(nose);
    // olhos amarelos com pupila preta
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), yellow);
    eyeL.position.set(-0.13, 1.05, 0.79); g.add(eyeL);
    const eyeR = eyeL.clone(); eyeR.position.x = 0.13; g.add(eyeR);
    const pupL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.03), dark);
    pupL.position.set(-0.13, 1.05, 0.815); g.add(pupL);
    const pupR = pupL.clone(); pupR.position.x = 0.13; g.add(pupR);
    // orelhas triangulares
    const earL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.25, 0.08), fur);
    earL.position.set(-0.18, 1.32, 0.5); g.add(earL);
    const earR = earL.clone(); earR.position.x = 0.18; g.add(earR);
    // cauda
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.7), fur);
    tail.position.set(0, 0.7, -0.65); g.add(tail);
    const tipTail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.18), belly);
    tipTail.position.set(0, 0.7, -1.0); g.add(tipTail);

    // o índice do tail vem por contagem (4 patas + body + bel + head + muz + nose + 2 olhos + 2 pupilas + 2 orelhas + tail)
    return { mesh: g, bodyIdx: 4, tailIdx: 15 };
  }

  // ---------- Vaca, porco, ovelha, zumbi, aranha, cavalo, golem, peixe, pássaro ----------
  function makeQuadMesh(furColor, bellyColor, opts = {}) {
    const g = new THREE.Group();
    const fur   = new THREE.MeshLambertMaterial({ color: furColor });
    const belly = new THREE.MeshLambertMaterial({ color: bellyColor });
    const dark  = new THREE.MeshLambertMaterial({ color: 0x1a1a2e });
    const w = opts.w || 0.6, h = opts.h || 0.55, l = opts.l || 0.95;
    const headW = opts.headW || 0.45, headH = opts.headH || 0.4;
    // 4 patas
    const pawGeo = new THREE.BoxGeometry(0.16, 0.30, 0.16);
    const py = 0.15;
    [[-w/2.5, py,  l/2.5],[w/2.5, py,  l/2.5],[-w/2.5, py, -l/2.5],[w/2.5, py, -l/2.5]]
      .forEach(p => { const m = new THREE.Mesh(pawGeo, belly); m.position.set(...p); g.add(m); });
    // corpo
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), fur);
    body.position.y = 0.30 + h/2;
    g.add(body);
    // cabeça
    const head = new THREE.Mesh(new THREE.BoxGeometry(headW, headH, headW), fur);
    head.position.set(0, 0.30 + h/2 + headH/2 - 0.05, l/2 + headW/2 - 0.05);
    g.add(head);
    // olhos
    const eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.04);
    const eL = new THREE.Mesh(eyeGeo, dark); eL.position.set(-0.10, head.position.y + 0.06, head.position.z + headW/2 - 0.02); g.add(eL);
    const eR = eL.clone(); eR.position.x = 0.10; g.add(eR);
    return g;
  }

  function makeCowMesh()   { return makeQuadMesh(0x6b3a1a, 0xfff7e6, { w:0.65, h:0.55, l:1.0, headW:0.45, headH:0.4 }); }
  function makePigMesh()   { return makeQuadMesh(0xf0a8b8, 0xe89090, { w:0.60, h:0.50, l:0.85, headW:0.40, headH:0.36 }); }
  function makeSheepMesh() {
    const g = makeQuadMesh(0xf0f0f0, 0xf8f8f8, { w:0.65, h:0.60, l:0.90, headW:0.40, headH:0.35 });
    return g;
  }
  function makeHorseMesh() {
    const g = makeQuadMesh(0x6d4520, 0x8b5a2b, { w:0.55, h:0.70, l:1.10, headW:0.35, headH:0.50 });
    // crina escura
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.18, 0.50),
      new THREE.MeshLambertMaterial({ color: 0x2a1810 }));
    mane.position.set(0, 1.05, 0.05);
    g.add(mane);
    return g;
  }

  function makeZombieMesh() {
    const g = new THREE.Group();
    const skin  = new THREE.MeshLambertMaterial({ color: 0x4a8540 });
    const cloth = new THREE.MeshLambertMaterial({ color: 0x3a4a8a });
    const pants = new THREE.MeshLambertMaterial({ color: 0x222244 });
    const dark  = new THREE.MeshLambertMaterial({ color: 0x1a1a2e });
    // pernas
    const legGeo = new THREE.BoxGeometry(0.20, 0.55, 0.20);
    const lL = new THREE.Mesh(legGeo, pants); lL.position.set(-0.12, 0.27, 0); g.add(lL);
    const lR = lL.clone(); lR.position.x = 0.12; g.add(lR);
    // tronco
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.65, 0.30), cloth);
    torso.position.y = 0.85; g.add(torso);
    // braços levantados (zumbi)
    const armGeo = new THREE.BoxGeometry(0.18, 0.55, 0.18);
    const aL = new THREE.Mesh(armGeo, skin); aL.position.set(-0.36, 0.95, 0.20); aL.rotation.x = -1.2; g.add(aL);
    const aR = aL.clone(); aR.position.x = 0.36; g.add(aR);
    // cabeça
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), skin);
    head.position.y = 1.42; g.add(head);
    // olhos vermelhos
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
    const eL = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    eL.position.set(-0.10, 1.45, 0.225); g.add(eL);
    const eR = eL.clone(); eR.position.x = 0.10; g.add(eR);
    return g;
  }

  function makeSpiderMesh() {
    const g = new THREE.Group();
    const dark = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const red  = new THREE.MeshBasicMaterial({ color: 0xff3030 });
    // corpo principal
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.30, 0.55), dark);
    body.position.y = 0.30; g.add(body);
    // cabeça menor
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.25, 0.30), dark);
    head.position.set(0, 0.30, 0.40); g.add(head);
    // 8 pernas
    const legGeo = new THREE.BoxGeometry(0.10, 0.10, 0.45);
    for (let i = 0; i < 4; i++) {
      const t = (i / 3) * 0.4 - 0.2;
      const lL = new THREE.Mesh(legGeo, dark);
      lL.position.set(-0.30, 0.20, t);
      lL.rotation.z = 0.5;
      g.add(lL);
      const lR = lL.clone(); lR.position.x = 0.30; lR.rotation.z = -0.5;
      g.add(lR);
    }
    // olhos vermelhos
    for (let dx of [-0.08, 0.08]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.03), red);
      eye.position.set(dx, 0.32, 0.55);
      g.add(eye);
    }
    return g;
  }

  function makeIronGolemMesh() {
    const g = new THREE.Group();
    const iron = new THREE.MeshLambertMaterial({ color: 0xc8c8c8 });
    const vine = new THREE.MeshLambertMaterial({ color: 0x4a8540 });
    // pernas (grossas)
    const legGeo = new THREE.BoxGeometry(0.25, 0.55, 0.25);
    const lL = new THREE.Mesh(legGeo, iron); lL.position.set(-0.16, 0.28, 0); g.add(lL);
    const lR = lL.clone(); lR.position.x = 0.16; g.add(lR);
    // tronco enorme
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.80, 0.40), iron);
    torso.position.y = 0.95; g.add(torso);
    // ombros
    const sL = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.50, 0.20), iron);
    sL.position.set(-0.45, 1.05, 0); g.add(sL);
    const sR = sL.clone(); sR.position.x = 0.45; g.add(sR);
    // braços longos
    const armGeo = new THREE.BoxGeometry(0.20, 0.95, 0.20);
    const aL = new THREE.Mesh(armGeo, iron); aL.position.set(-0.45, 0.50, 0); g.add(aL);
    const aR = aL.clone(); aR.position.x = 0.45; g.add(aR);
    // cabeça
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.40, 0.40), iron);
    head.position.y = 1.55; g.add(head);
    // nariz
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.20, 0.08), iron);
    nose.position.set(0, 1.55, 0.22); g.add(nose);
    // detalhe verde no torso (cipó)
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.40, 0.05), vine);
    v.position.set(0.30, 1.10, 0.21); g.add(v);
    return g;
  }

  function makeFishMesh() {
    const g = new THREE.Group();
    const blue = new THREE.MeshLambertMaterial({ color: 0x3a8fd0 });
    const silver = new THREE.MeshLambertMaterial({ color: 0xb0c8e0 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.32), blue);
    g.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.10), blue);
    tail.position.z = -0.18; g.add(tail);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.10), silver);
    fin.position.set(0.10, 0, 0); g.add(fin);
    const fin2 = fin.clone(); fin2.position.x = -0.10; g.add(fin2);
    return g;
  }

  function makeBirdMesh() {
    const g = new THREE.Group();
    const white = new THREE.MeshLambertMaterial({ color: 0xf0f0f0 });
    const dark  = new THREE.MeshLambertMaterial({ color: 0x303030 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.28), white);
    g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), white);
    head.position.set(0, 0.06, 0.16); g.add(head);
    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.06),
      new THREE.MeshLambertMaterial({ color: 0xffaa00 }));
    beak.position.set(0, 0.05, 0.24); g.add(beak);
    // asas
    const wingGeo = new THREE.BoxGeometry(0.20, 0.04, 0.18);
    const wL = new THREE.Mesh(wingGeo, dark); wL.position.set(-0.13, 0.02, 0); g.add(wL);
    const wR = wL.clone(); wR.position.x = 0.13; g.add(wR);
    return g;
  }

  function spawn(x, y, z, opts = {}) {
    const kind = opts.kind || (opts.tom ? 'tom' : 'rat');
    let built;
    let cfg = { hp: 6, radius: 0.25, height: 0.7, hostile: false, damage: 0,
                sightRange: 0, attackRange: 0, speed: 1.5, despawnAtDay: false, dropId: 119, dropCount: 1 };
    let bodyIdx = 0, tailIdx = -1;
    switch (kind) {
      case 'tom': {
        built = makeTomMesh();
        cfg = { hp: 16, radius: 0.32, height: 1.4, hostile: true, damage: 3,
                sightRange: 18, attackRange: 1.4, speed: 3.2, despawnAtDay: true, dropId: 110, dropCount: 2 };
        bodyIdx = built.bodyIdx; tailIdx = built.tailIdx;
        built = built.mesh;
        break;
      }
      case 'cow':    built = makeCowMesh();   cfg = { hp: 10, radius: 0.4, height: 1.0, hostile:false, damage:0, sightRange:0, attackRange:0, speed:1.4, despawnAtDay:false, dropId: 119, dropCount: 1 }; break;
      case 'pig':    built = makePigMesh();   cfg = { hp: 8,  radius: 0.35, height: 0.8, hostile:false, damage:0, sightRange:0, attackRange:0, speed:1.3, despawnAtDay:false, dropId: 119, dropCount: 1 }; break;
      case 'sheep':  built = makeSheepMesh(); cfg = { hp: 8,  radius: 0.35, height: 1.0, hostile:false, damage:0, sightRange:0, attackRange:0, speed:1.3, despawnAtDay:false, dropId: 116, dropCount: 1 }; break;
      case 'horse':  built = makeHorseMesh(); cfg = { hp: 14, radius: 0.4, height: 1.2, hostile:false, damage:0, sightRange:0, attackRange:0, speed:2.0, despawnAtDay:false, dropId: 118, dropCount: 1 }; break;
      case 'zombie': built = makeZombieMesh();cfg = { hp: 12, radius: 0.32, height: 1.7, hostile:true, damage:2, sightRange:14, attackRange:1.4, speed:2.2, despawnAtDay:true, dropId: 119, dropCount: 1 }; break;
      case 'spider': built = makeSpiderMesh();cfg = { hp: 10, radius: 0.35, height: 0.6, hostile:true, damage:2, sightRange:12, attackRange:1.2, speed:2.6, despawnAtDay:true, dropId: 110, dropCount: 1 }; break;
      case 'golem':  built = makeIronGolemMesh(); cfg = { hp: 50, radius: 0.40, height: 1.95, hostile:false, damage:6, sightRange:16, attackRange:1.7, speed:1.8, despawnAtDay:false, dropId: 102, dropCount: 2, defender: true }; break;
      case 'fish':   built = makeFishMesh();  cfg = { hp: 4, radius: 0.18, height: 0.16, hostile:false, damage:0, sightRange:0, attackRange:0, speed:1.6, despawnAtDay:false, dropId: 120, dropCount: 1, aquatic: true }; break;
      case 'bird':   built = makeBirdMesh();  cfg = { hp: 4, radius: 0.18, height: 0.16, hostile:false, damage:0, sightRange:0, attackRange:0, speed:2.2, despawnAtDay:false, dropId: 117, dropCount: 1, flying: true }; break;
      default:
        built = makeRatMesh();
        bodyIdx = built.bodyIdx; tailIdx = built.tailIdx;
        built = built.mesh;
        cfg = { hp: 6, radius: 0.25, height: 0.7, hostile:false, damage:0, sightRange:0, attackRange:0, speed:1.5, despawnAtDay:false, dropId: 119, dropCount: 1 };
    }
    const mesh = built;
    mesh.position.set(x, y, z);
    scene.add(mesh);
    const npc = {
      kind, mesh,
      bodyIdx, tailIdx,
      pos: new THREE.Vector3(x, y, z),
      vel: new THREE.Vector3(),
      onGround: false,
      target: null,
      waitT: 0,
      yaw: 0, yawTarget: 0,
      hp: cfg.hp,
      hurtFlash: 0,
      radius: cfg.radius,
      height: cfg.height,
      attackCd: 0,
      meowCd: Math.random() * 6,
      hostile: cfg.hostile,
      damage: cfg.damage,
      sightRange: cfg.sightRange,
      attackRange: cfg.attackRange,
      speed: cfg.speed,
      despawnAtDay: cfg.despawnAtDay,
      dropId: cfg.dropId,
      dropCount: cfg.dropCount,
      defender: cfg.defender || false,
      aquatic: cfg.aquatic || false,
      flying: cfg.flying || false,
      bobT: Math.random() * Math.PI * 2,
    };
    list.push(npc);
    return npc;
  }

  // Encontra topo do terreno em (x,z) com headroom suficiente.
  // Retorna a altura dos pés (top do bloco abaixo).
  function findGroundY(x, z, height) {
    for (let y = 30; y > -8; y--) {
      const t = Game.world.get(x, y, z);
      if (!t || Game.items[t].liquid) continue;
      // pés em y + 0.5
      const footY = y + 0.5;
      // checa headroom
      const headBlock = Math.floor(footY + height + 0.5);
      if (Game.world.get(x, headBlock, z) === 0) return footY;
    }
    return null;
  }

  function spawnAtSurface(x, z, opts) {
    const kind = (opts && opts.kind) || (opts && opts.tom ? 'tom' : 'rat');
    const height = (opts && (opts.kind === 'tom' || opts.tom)) ? 1.4
                 : kind === 'zombie' ? 1.7
                 : kind === 'horse' ? 1.2
                 : kind === 'golem' ? 1.95
                 : 1.0;
    const y = findGroundY(x, z, height);
    if (y == null) return null;
    return spawn(x, y, z, opts);
  }

  function spawnInitial() {
    // mistura passiva inicial perto do spawn
    const passive = [
      [6,2,'cow'], [-4,3,'pig'], [3,-5,'sheep'], [-6,-4,'sheep'],
      [10,8,'cow'], [-9,-2,'horse'], [4,9,'pig'],
      [-2,-9,'rat'], [-7,5,'rat'],
    ];
    for (const [x, z, kind] of passive) spawnAtSurface(x, z, { kind });
  }

  function spawnTomNearby() {
    const ang = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 8;
    const x = Math.round(Game.player.pos.x + Math.cos(ang) * dist);
    const z = Math.round(Game.player.pos.z + Math.sin(ang) * dist);
    Game.world.ensureChunksAround(x, z);
    const tom = spawnAtSurface(x, z, { kind: 'tom' });
    if (tom) {
      if (Game.audio) Game.audio.play('cat_meow');
      if (Game.utils) Game.utils.showToast('🐱 O Tom surgiu na escuridão...');
    }
  }

  function spawnHostileNearby() {
    const ang = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 8;
    const x = Math.round(Game.player.pos.x + Math.cos(ang) * dist);
    const z = Math.round(Game.player.pos.z + Math.sin(ang) * dist);
    Game.world.ensureChunksAround(x, z);
    const kinds = ['zombie', 'spider', 'tom'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    spawnAtSurface(x, z, { kind });
  }

  function spawnBird() {
    const ang = Math.random() * Math.PI * 2;
    const dist = 6 + Math.random() * 12;
    const x = Math.round(Game.player.pos.x + Math.cos(ang) * dist);
    const z = Math.round(Game.player.pos.z + Math.sin(ang) * dist);
    Game.world.ensureChunksAround(x, z);
    const baseY = Game.world.topY(x, z) + 4 + Math.random() * 4;
    spawn(x, baseY, z, { kind: 'bird' });
  }

  function spawnFish() {
    // procura água perto e spawna nela
    const cx = Math.floor(Game.player.pos.x), cz = Math.floor(Game.player.pos.z);
    for (let i = 0; i < 20; i++) {
      const dx = Math.floor((Math.random() - 0.5) * 30);
      const dz = Math.floor((Math.random() - 0.5) * 30);
      const x = cx + dx, z = cz + dz;
      // procura água na coluna
      for (let y = 25; y >= -2; y--) {
        if (Game.world.get(x, y, z) === 7) {
          spawn(x, y, z, { kind: 'fish' });
          return;
        }
      }
    }
  }

  function spawnGolemAt(x, y, z) {
    const golem = spawn(x, y, z, { kind: 'golem' });
    if (golem && Game.utils) Game.utils.showToast('⚔️ Iron Golem invocado!');
    return golem;
  }

  // Colisão: pos.y é a base. Verifica blocos sólidos no AABB do NPC.
  function isSolidForNpc(npc, x, y, z) {
    const r = npc.radius, h = npc.height;
    // amostra de y: pés, meio, topo
    const ys = [y + 0.05, y + h * 0.5, y + h - 0.05];
    const xs = [x - r, x + r];
    const zs = [z - r, z + r];
    for (const cy of ys) for (const cx of xs) for (const cz of zs) {
      const b = Game.world.get(Math.floor(cx + 0.5), Math.floor(cy + 0.5), Math.floor(cz + 0.5));
      if (!b) continue;
      const d = Game.items[b];
      if (d.passable) continue;
      // animais aquáticos podem entrar na água; terrestres tratam como obstáculo
      if (d.liquid) {
        if (npc.aquatic) continue;
        return true;
      }
      return true;
    }
    return false;
  }

  function tickAI(n, dt) {
    const creative = Game.player.mode === 'creative';

    // Iron Golem: persegue mobs hostis próximos
    if (n.defender) {
      let nearest = null, ndist = Infinity;
      for (const o of list) {
        if (!o.hostile) continue;
        const d = n.pos.distanceTo(o.pos);
        if (d < n.sightRange && d < ndist) { nearest = o; ndist = d; }
      }
      if (nearest) {
        const dx = nearest.pos.x - n.pos.x, dz = nearest.pos.z - n.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.001) {
          n.yawTarget = Math.atan2(dx, dz);
          if (dist > n.attackRange) return { vx: (dx/dist)*n.speed, vz: (dz/dist)*n.speed };
          n.attackCd -= dt;
          if (n.attackCd <= 0) {
            n.attackCd = 1.2;
            damage(nearest, n.damage);
            nearest.vel.y = 6; nearest.vel.x = (dx/dist)*5; nearest.vel.z = (dz/dist)*5;
          }
          return { vx: 0, vz: 0 };
        }
      }
    }

    // Mobs hostis: NÃO atacam em creative
    if (n.hostile && !creative) {
      const dx = Game.player.pos.x - n.pos.x;
      const dz = Game.player.pos.z - n.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < n.sightRange) {
        if (dist > 0.001) {
          n.yawTarget = Math.atan2(dx, dz);
          if (dist > n.attackRange) {
            return { vx: (dx / dist) * n.speed, vz: (dz / dist) * n.speed };
          } else {
            n.attackCd -= dt;
            if (n.attackCd <= 0) {
              n.attackCd = 1.0;
              if (Game.physics && Game.physics.damage) Game.physics.damage(n.damage, n.kind);
              if (Game.audio) Game.audio.play(n.kind === 'tom' ? 'cat_hiss' : 'rat_hurt');
            }
            return { vx: 0, vz: 0 };
          }
        }
      }
    }
    // wander aleatório
    n.waitT -= dt;
    if (!n.target || n.waitT <= 0) {
      const ang = Math.random() * Math.PI * 2;
      n.target = {
        x: n.pos.x + Math.cos(ang) * (3 + Math.random() * 4),
        z: n.pos.z + Math.sin(ang) * (3 + Math.random() * 4),
      };
      n.waitT = 3 + Math.random() * 3;
    }
    const dx = n.target.x - n.pos.x;
    const dz = n.target.z - n.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.3) { n.target = null; n.waitT = 0.5 + Math.random(); return { vx: 0, vz: 0 }; }
    n.yawTarget = Math.atan2(dx, dz);
    return { vx: (dx / dist) * n.speed, vz: (dz / dist) * n.speed };
  }

  function update(dt) {
    const isNight = Game.daynight && (Game.daynight.state.time < 0.20 || Game.daynight.state.time > 0.85);

    for (let i = list.length - 1; i >= 0; i--) {
      const n = list[i];

      if (n.hurtFlash > 0) {
        n.hurtFlash -= dt;
        const body = n.mesh.children[n.bodyIdx];
        if (body) body.material.color.setHex(
          n.hurtFlash > 0 ? 0xff5555 : (n.kind === 'tom' ? 0x6b8aa8 : 0xb8b8c0)
        );
      }

      if (n.hp <= 0) {
        const dropId = n.dropId || 119;     // padrão: carne crua
        const dropCount = n.dropCount || 1;
        if (Game.drops) Game.drops.spawn(n.pos.x, n.pos.y + 0.5, n.pos.z, dropId, dropCount, { gentle: true });
        // ovelha também dropa carne além da lã
        if (n.kind === 'sheep' && Game.drops) {
          Game.drops.spawn(n.pos.x, n.pos.y + 0.5, n.pos.z, 119, 1, { gentle: true });
        }
        if (Game.audio) Game.audio.play(n.kind === 'tom' || n.kind === 'spider' ? 'cat_hiss' : 'rat_squeak');
        scene.remove(n.mesh);
        list.splice(i, 1);
        continue;
      }

      if (n.despawnAtDay && !isNight) {
        scene.remove(n.mesh);
        list.splice(i, 1);
        continue;
      }

      // Despawn de segurança se cair muito fundo
      if (n.pos.y < -25) {
        scene.remove(n.mesh);
        list.splice(i, 1);
        continue;
      }

      // sons ambientes raros
      n.meowCd -= dt;
      if (n.meowCd <= 0) {
        n.meowCd = 14 + Math.random() * 18;
        const distToPlayer = Math.hypot(n.pos.x - Game.player.pos.x, n.pos.z - Game.player.pos.z);
        if (distToPlayer < 16 && Game.audio) {
          if (n.kind === 'tom') Game.audio.play('cat_meow', { gap: 6 });
          else if (Math.random() < 0.4) Game.audio.play('rat_squeak', { gap: 4, volume: 0.6 });
        }
      }

      // Aquáticos: só nadam em água
      if (n.aquatic) {
        const inWater = Game.world.get(Math.floor(n.pos.x + 0.5), Math.floor(n.pos.y + 0.5), Math.floor(n.pos.z + 0.5)) === 7;
        if (inWater) {
          n.bobT += dt * 2;
          n.pos.x += Math.cos(n.bobT) * dt * n.speed * 0.4;
          n.pos.z += Math.sin(n.bobT * 1.2) * dt * n.speed * 0.4;
          n.pos.y += Math.sin(n.bobT * 0.7) * dt * 0.2;
          n.yaw = Math.atan2(Math.cos(n.bobT), Math.sin(n.bobT * 1.2));
          n.mesh.position.copy(n.pos);
          n.mesh.rotation.y = n.yaw;
          continue;
        } else {
          n.vel.y -= 24 * dt;
          n.pos.y += n.vel.y * dt;
          n.mesh.position.copy(n.pos);
          if (n.pos.y < -25) { scene.remove(n.mesh); list.splice(i, 1); }
          continue;
        }
      }

      // Pássaros voam
      if (n.flying) {
        n.bobT += dt * 1.5;
        const baseY = Math.max(Game.world.topY(Math.floor(n.pos.x + 0.5), Math.floor(n.pos.z + 0.5)) + 4, 8);
        n.pos.x += Math.cos(n.bobT) * dt * n.speed;
        n.pos.z += Math.sin(n.bobT) * dt * n.speed;
        n.pos.y += Math.sin(n.bobT * 0.7) * dt * 0.5;
        if (n.pos.y < baseY) n.pos.y = baseY;
        n.yaw = Math.atan2(Math.cos(n.bobT), Math.sin(n.bobT));
        n.mesh.position.copy(n.pos);
        n.mesh.rotation.y = n.yaw;
        const wL = n.mesh.children[3], wR = n.mesh.children[4];
        if (wL && wR) {
          const flap = Math.sin(performance.now() * 0.020) * 0.5;
          wL.rotation.z = flap; wR.rotation.z = -flap;
        }
        continue;
      }

      const { vx, vz } = tickAI(n, dt);

      // gravidade
      n.vel.y -= 24 * dt;
      // limita queda
      if (n.vel.y < -25) n.vel.y = -25;

      // movimento horizontal — não deixa entrar em sólido
      const nx = n.pos.x + vx * dt;
      if (!isSolidForNpc(n, nx, n.pos.y, n.pos.z)) n.pos.x = nx;
      else { n.target = null; n.vel.x = 0; }
      const nz = n.pos.z + vz * dt;
      if (!isSolidForNpc(n, n.pos.x, n.pos.y, nz)) n.pos.z = nz;
      else { n.target = null; n.vel.z = 0; }

      // movimento vertical
      const ny = n.pos.y + n.vel.y * dt;
      if (!isSolidForNpc(n, n.pos.x, ny, n.pos.z)) {
        n.pos.y = ny;
        n.onGround = false;
      } else {
        if (n.vel.y < 0) n.onGround = true;
        n.vel.y = 0;
      }

      // rotação suave (lerp curto pra evitar tremor)
      let dyaw = n.yawTarget - n.yaw;
      while (dyaw > Math.PI)  dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      n.yaw += dyaw * Math.min(1, dt * 8);

      n.mesh.position.copy(n.pos);
      n.mesh.rotation.y = n.yaw;

      const tail = n.mesh.children[n.tailIdx];
      if (tail) tail.rotation.y = Math.sin(performance.now() * 0.005 + i) * (n.kind === 'tom' ? 0.55 : 0.4);
    }
  }

  function damage(npc, amount) {
    npc.hp -= amount;
    npc.hurtFlash = 0.2;
    if (Game.audio) Game.audio.play(npc.kind === 'tom' ? 'cat_hiss' : 'rat_hurt');
  }

  function tomCount() {
    let c = 0;
    for (const n of list) if (n.kind === 'tom') c++;
    return c;
  }

  function hostileCount() {
    let c = 0;
    for (const n of list) if (n.hostile) c++;
    return c;
  }
  function passiveCount() {
    let c = 0;
    for (const n of list) {
      if (!n.hostile && !n.flying && !n.aquatic && n.kind !== 'golem') c++;
    }
    return c;
  }

  function spawnPassiveNearby() {
    const ang = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 10;
    const x = Math.round(Game.player.pos.x + Math.cos(ang) * dist);
    const z = Math.round(Game.player.pos.z + Math.sin(ang) * dist);
    Game.world.ensureChunksAround(x, z);
    const kinds = ['cow', 'pig', 'sheep', 'sheep', 'horse', 'rat'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    return spawnAtSurface(x, z, { kind });
  }

  // Popula chunk com 0-3 passivos. Cada chunk é populado UMA VEZ por
  // sessão (Set abaixo). Chamada no LOAD do chunk no render (não na
  // geração) — assim o mob só aparece quando o player está perto.
  const populatedChunks = new Set();
  function populateChunk(cx, cz, CHUNK) {
    if (!scene) return;
    if (Game.player.mode === 'creative') return;
    const key = `${cx},${cz}`;
    if (populatedChunks.has(key)) return;
    if (passiveCount() >= 60) return;        // teto bem mais generoso
    populatedChunks.add(key);
    const seed = ((cx * 73856093) ^ (cz * 19349663)) >>> 0;
    let s = seed;
    const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    // quase todo chunk gera ao menos 1 mob (70% 2-3, 30% 1, 0% vazio)
    const roll = rng();
    const count = roll < 0.30 ? 1 : (roll < 0.75 ? 2 : (roll < 0.95 ? 3 : 4));
    let placed = 0, attempts = 0;
    while (placed < count && attempts < count * 6) {
      attempts++;
      const lx = Math.floor(rng() * CHUNK);
      const lz = Math.floor(rng() * CHUNK);
      const x = cx * CHUNK + lx, z = cz * CHUNK + lz;
      const top = Game.world.topY(x, z);
      if (top <= 0) continue;
      const ground = Game.world.get(x, top - 1, z);
      // aceita grama ou terra (pra não perder chunks de bioma praia/trilha)
      if (ground !== 1 && ground !== 2) continue;
      const kinds = ['cow','cow','pig','pig','sheep','sheep','horse','rat','rat'];
      const kind = kinds[Math.floor(rng() * kinds.length)];
      spawn(x + 0.5, top - 0.5, z + 0.5, { kind });
      placed++;
    }
  }
  function clearPopulated() { populatedChunks.clear(); }
  function unpopulateChunk(cx, cz) {
    populatedChunks.delete(`${cx},${cz}`);
  }

  // Despawna mobs muito longe do player pra controlar a quantidade total.
  // Não remove golem (defender invocado) nem mobs com nome especial.
  function despawnFar(maxDist = 60) {
    const px = Game.player.pos.x, pz = Game.player.pos.z;
    for (let i = list.length - 1; i >= 0; i--) {
      const n = list[i];
      if (n.kind === 'golem') continue;  // golem fica
      const d = Math.hypot(n.pos.x - px, n.pos.z - pz);
      if (d > maxDist) {
        if (n.mesh && n.mesh.parent) n.mesh.parent.remove(n.mesh);
        list.splice(i, 1);
      }
    }
  }

  Game.npcs = {
    list, bindScene, spawn, spawnAtSurface, spawnInitial,
    spawnTomNearby, spawnHostileNearby, spawnBird, spawnFish, spawnGolemAt,
    spawnPassiveNearby, despawnFar, populateChunk, clearPopulated, unpopulateChunk,
    update, damage, tomCount, hostileCount, passiveCount,
  };
})();
