/* =========================================================
   Day/Night — ciclo de tempo + sol/lua/estrelas detalhados.
     time ∈ [0,1):
       0.00  meia-noite  | 0.25  amanhecer
       0.50  meio-dia    | 0.75  pôr do sol
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};

  const state = {
    time: 0.30,
    cycleSeconds: 480,
    paused: false,
  };

  let scene = null, sun = null, sunMesh = null, ambient = null, hemi = null;
  let stars = null;
  let moonGroup = null;
  let sunHalo = null;
  let camera = null;

  const DAY_SKY     = new THREE.Color(0x87CEEB);
  const SUNSET_SKY  = new THREE.Color(0xff8c5a);
  const NIGHT_SKY   = new THREE.Color(0x05071f);

  function bind(refs) {
    scene = refs.scene;
    sun = refs.sun;
    sunMesh = refs.sunMesh;
    ambient = refs.ambient;
    hemi = refs.hemi;
    camera = refs.camera || null;
    enrichSun();
    createStars();
    createMoon();
  }

  // Adiciona um halo translúcido ao sol original
  function enrichSun() {
    if (!sunMesh) return;
    sunHalo = new THREE.Mesh(
      new THREE.CircleGeometry(20, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd680, transparent: true, opacity: 0.25, depthWrite: false, fog: false })
    );
    sunMesh.add(sunHalo);
    sunHalo.position.z = -0.5;
    sunHalo.renderOrder = -3;
  }

  function createStars() {
    const count = 450;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.7 + 25;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      // cores: maioria branca, algumas amareladas e azuladas
      const tint = Math.random();
      if (tint < 0.6) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 1.0;
      } else if (tint < 0.85) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 0.7;
      } else {
        colors[i * 3] = 0.7; colors[i * 3 + 1] = 0.85; colors[i * 3 + 2] = 1.0;
      }
      sizes[i] = 0.6 + Math.random() * 1.8;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const mat = new THREE.PointsMaterial({
      vertexColors: true,
      size: 1.4,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    stars = new THREE.Points(geo, mat);
    stars.renderOrder = -2;
    scene.add(stars);
  }

  function createMoon() {
    moonGroup = new THREE.Group();
    const moonTex = makeMoonTexture();
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(8, 32),
      new THREE.MeshBasicMaterial({ map: moonTex, transparent: true, opacity: 0, depthWrite: false, fog: false })
    );
    disc.renderOrder = -2;
    moonGroup.add(disc);
    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(12, 32),
      new THREE.MeshBasicMaterial({ color: 0xb8c8ff, transparent: true, opacity: 0, depthWrite: false, fog: false })
    );
    halo.position.z = -0.5;
    halo.renderOrder = -3;
    moonGroup.add(halo);
    moonGroup.userData.disc = disc;
    moonGroup.userData.halo = halo;
    scene.add(moonGroup);
  }

  function makeMoonTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    // gradiente radial creme
    const g = ctx.createRadialGradient(28, 28, 4, 32, 32, 32);
    g.addColorStop(0, '#fff8d6');
    g.addColorStop(0.6, '#e8d8a0');
    g.addColorStop(1, '#9a8862');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI * 2); ctx.fill();
    // crateras
    ctx.fillStyle = 'rgba(80,70,40,0.35)';
    const craters = [[20,18,4],[42,22,3],[36,40,5],[18,40,3],[30,30,2],[48,36,3]];
    for (const [x, y, r] of craters) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    const t = new THREE.CanvasTexture(c);
    return t;
  }

  function update(dt) {
    if (!state.paused) state.time = (state.time + dt / state.cycleSeconds) % 1;
    apply();
  }

  function apply() {
    const a = (state.time - 0.25) * Math.PI * 2;
    const sunY = Math.sin(a);
    const sunX = Math.cos(a);

    // Sol/lua/estrelas seguem a câmera (pra ficarem sempre visíveis no horizonte).
    const cx = camera ? camera.position.x : 0;
    const cy = camera ? camera.position.y : 0;
    const cz = camera ? camera.position.z : 0;
    const SKY_DIST = 120;

    if (sun) sun.position.set(cx + sunX * 100, cy + sunY * 100, cz + 30);
    if (sunMesh) {
      sunMesh.position.set(cx + sunX * SKY_DIST, cy + sunY * SKY_DIST, cz + 0);
      sunMesh.lookAt(cx, cy, cz);
      sunMesh.visible = sunY > -0.05;
      if (sunHalo) {
        const t = performance.now() * 0.0008;
        sunHalo.scale.setScalar(0.95 + Math.sin(t) * 0.05);
      }
    }
    if (moonGroup) {
      moonGroup.position.set(cx - sunX * SKY_DIST, cy - sunY * SKY_DIST, cz + 0);
      moonGroup.lookAt(cx, cy, cz);
      const moonAlpha = Math.max(0, -sunY - 0.05);
      const op = Math.min(1, moonAlpha * 2);
      moonGroup.userData.disc.material.opacity = op;
      moonGroup.userData.halo.material.opacity = op * 0.4;
      moonGroup.visible = op > 0.01;
    }
    if (stars) stars.position.set(cx, cy, cz);

    let final;
    if (sunY > 0.15) {
      final = DAY_SKY;
    } else if (sunY > -0.15) {
      const m = (sunY + 0.15) / 0.30;
      final = SUNSET_SKY.clone().lerp(DAY_SKY, m);
    } else {
      const m = Math.max(0, Math.min(1, (sunY + 0.4) / 0.25));
      final = NIGHT_SKY.clone().lerp(SUNSET_SKY, m);
    }
    if (scene) {
      scene.background = final;
      if (scene.fog) scene.fog.color = final;
    }

    if (sun) sun.intensity = Math.max(0, sunY * 0.8) + 0.05;
    if (ambient) ambient.intensity = Math.max(0.18, sunY * 0.45 + 0.30);
    if (hemi) hemi.intensity = Math.max(0.10, sunY * 0.30 + 0.15);

    if (stars) {
      const starAlpha = Math.max(0, -sunY - 0.05);
      stars.material.opacity = Math.min(1, starAlpha * 1.5);
      // estrelas piscando suavemente (não cintilação por ponto, mas global)
      const t = performance.now() * 0.0005;
      stars.material.size = 1.3 + Math.sin(t) * 0.15;
    }
  }

  function clockText() {
    const totalMin = state.time * 24 * 60;
    const h = Math.floor(totalMin / 60);
    const m = Math.floor(totalMin % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function phaseLabel() {
    const t = state.time;
    if (t < 0.20 || t >= 0.85) return 'Noite';
    if (t < 0.30) return 'Amanhecer';
    if (t < 0.70) return 'Dia';
    return 'Entardecer';
  }

  function setTime(t) { state.time = t % 1; }

  Game.daynight = { state, bind, update, clockText, phaseLabel, setTime };
})();
