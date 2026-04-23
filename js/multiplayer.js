/* =========================================================
   Multiplayer — P2P via PeerJS (signaling público).
   Topologia mesh: cada peer mantém conexões com todos os outros.
   Sincroniza:
     - posição/yaw/pitch + nome do player remoto (a cada 100ms)
     - eventos place/break de blocos
   Limitações: até ~4 jogadores (mesh O(n²)). Sem servidor autoritativo.
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};

  const M = {
    enabled: false,
    peer: null,
    myId: null,
    myName: 'Player',
    conns: new Map(),    // peerId -> connection
    remotes: new Map(),  // peerId -> { mesh, pos, yaw, name }
    role: null,          // 'host' ou 'guest'
    posSendT: 0,
  };

  let scene = null;
  function bindScene(s) { scene = s; }

  // Carrega PeerJS dinamicamente do CDN só quando necessário
  function loadPeerJS() {
    return new Promise((resolve, reject) => {
      if (window.Peer) return resolve();
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function makeRemoteMesh(name) {
    const g = new THREE.Group();
    // corpo (similar ao rato, mas em cor diferente pra distinguir)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x4dabf5 }));
    body.position.y = 0.5;
    g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45),
      new THREE.MeshLambertMaterial({ color: 0xfff7e6 }));
    head.position.y = 1.05;
    g.add(head);
    // olhos
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x1a1a2e });
    const eL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), eyeMat);
    eL.position.set(-0.10, 1.10, 0.225); g.add(eL);
    const eR = eL.clone(); eR.position.x = 0.10; g.add(eR);
    // braços
    const armGeo = new THREE.BoxGeometry(0.18, 0.5, 0.18);
    const aL = new THREE.Mesh(armGeo, new THREE.MeshLambertMaterial({ color: 0x4dabf5 }));
    aL.position.set(-0.34, 0.55, 0); g.add(aL);
    const aR = aL.clone(); aR.position.x = 0.34; g.add(aR);
    // nome flutuando
    const nameTex = makeNameTag(name);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: nameTex, transparent: true, depthTest: false }));
    tag.scale.set(1.5, 0.4, 1);
    tag.position.y = 1.7;
    g.add(tag);
    g.userData.tag = tag;
    return g;
  }

  function makeNameTag(name) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 128, 32);
    return new THREE.CanvasTexture(c);
  }

  function broadcast(msg) {
    for (const conn of M.conns.values()) {
      if (conn.open) conn.send(msg);
    }
  }

  function attachConn(conn) {
    M.conns.set(conn.peer, conn);
    conn.on('data', data => handleMessage(conn.peer, data));
    conn.on('close', () => {
      M.conns.delete(conn.peer);
      const r = M.remotes.get(conn.peer);
      if (r && r.mesh.parent) r.mesh.parent.remove(r.mesh);
      M.remotes.delete(conn.peer);
      if (Game.utils) Game.utils.showToast('🔌 Jogador saiu');
    });
    conn.on('open', () => {
      // envia hello com nome
      conn.send({ type: 'hello', name: M.myName });
      if (Game.utils) Game.utils.showToast('🤝 Conectado a outro jogador');
    });
  }

  function handleMessage(peerId, msg) {
    if (!msg || !msg.type) return;
    let r = M.remotes.get(peerId);
    if (msg.type === 'hello') {
      if (!r) {
        const mesh = makeRemoteMesh(msg.name || peerId.slice(0, 6));
        if (scene) scene.add(mesh);
        r = { mesh, pos: new THREE.Vector3(), yaw: 0, name: msg.name };
        M.remotes.set(peerId, r);
      }
      return;
    }
    if (msg.type === 'pos') {
      if (!r) {
        const mesh = makeRemoteMesh(peerId.slice(0, 6));
        if (scene) scene.add(mesh);
        r = { mesh, pos: new THREE.Vector3(), yaw: 0 };
        M.remotes.set(peerId, r);
      }
      r.pos.set(msg.x, msg.y, msg.z);
      r.yaw = msg.yaw;
      return;
    }
    if (msg.type === 'set') {
      // bloco mudado por outro player
      Game.world.set(msg.x, msg.y, msg.z, msg.t);
      Game.world.refresh(msg.x, msg.y, msg.z);
      return;
    }
  }

  // API pública
  M.host = async function (name) {
    M.myName = name || 'Host';
    await loadPeerJS();
    return new Promise(resolve => {
      M.peer = new window.Peer();
      M.peer.on('open', id => {
        M.myId = id;
        M.role = 'host';
        M.enabled = true;
        // recebe conexões entrantes
        M.peer.on('connection', c => attachConn(c));
        resolve(id);
      });
      M.peer.on('error', e => console.warn('PeerJS error', e));
    });
  };

  M.join = async function (hostId, name) {
    M.myName = name || 'Guest';
    await loadPeerJS();
    return new Promise((resolve, reject) => {
      M.peer = new window.Peer();
      M.peer.on('open', id => {
        M.myId = id;
        M.role = 'guest';
        const conn = M.peer.connect(hostId, { reliable: true });
        attachConn(conn);
        M.enabled = true;
        // também aceita conexões de outros peers (mesh)
        M.peer.on('connection', c => attachConn(c));
        resolve(id);
      });
      M.peer.on('error', e => { console.warn('PeerJS error', e); reject(e); });
    });
  };

  M.notifyBlockChange = function (x, y, z, t) {
    if (!M.enabled) return;
    broadcast({ type: 'set', x, y, z, t });
  };

  M.update = function (dt) {
    if (!M.enabled) return;
    M.posSendT -= dt;
    if (M.posSendT <= 0) {
      M.posSendT = 0.10;  // 10Hz
      const p = Game.player.pos;
      broadcast({ type: 'pos', x: p.x, y: p.y, z: p.z, yaw: Game.player.yaw });
    }
    // interpola posição dos remotos pra suavizar
    for (const r of M.remotes.values()) {
      r.mesh.position.lerp(r.pos, Math.min(1, dt * 12));
      r.mesh.rotation.y = r.yaw;
      // tag sempre olhando pra câmera
      if (r.mesh.userData.tag && Game.camera) {
        r.mesh.userData.tag.lookAt(Game.camera.position);
      }
    }
  };

  M.bindScene = bindScene;

  Game.multiplayer = M;
})();
