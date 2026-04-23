/* =========================================================
   Utils — funções utilitárias usadas em todos os módulos
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function makeTex(fn, size = 16) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    fn(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    return t;
  }

  function speckle(ctx, size, base, colors, seed) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    const rng = mulberry32(seed);
    for (const [color, count] of colors) {
      ctx.fillStyle = color;
      for (let i = 0; i < count; i++) {
        ctx.fillRect(Math.floor(rng() * size), Math.floor(rng() * size), 1, 1);
      }
    }
  }

  function showToast(msg, dur = 1600) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), dur);
  }

  // Chave canônica de bloco (string). Mais legível e estável que template.
  const blockKey = (x, y, z) => `${x},${y},${z}`;

  // Vizinhos cardinais 3D
  const NEIGH = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];

  Game.utils = { mulberry32, makeTex, speckle, showToast, blockKey, NEIGH };
})();
