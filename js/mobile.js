/* =========================================================
   Mobile — controles touch (stick analógico + botões).
   Em vez de pointer lock, usa swipe pra olhar e stick pra mover.
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};

  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (!isTouch) {
    Game.mobile = { isTouch: false, init: () => {} };
    return;
  }

  // estado simulado de teclas
  const fakeKeys = {};
  function setKey(code, val) {
    fakeKeys[code] = val;
    if (Game.input && Game.input.keys) Game.input.keys[code] = val;
  }

  let yawDrag = null;     // {x, y} do toque ativo (pan câmera)
  let stickActive = null; // {id, baseX, baseY, dx, dy}
  let panTouchId = null;

  const STICK_RADIUS = 80;

  function createUI() {
    const wrap = document.createElement('div');
    wrap.id = 'mobile-ui';
    // Botões essenciais apenas: pular, fireball, fly (creative).
    // Atacar = tap rápido na tela; Colocar = pressionar (hold) na tela.
    // Inventário = ícone discreto na hotbar (gerenciado em ui.js).
    wrap.innerHTML = `
      <div id="mob-stick"><div id="mob-stick-knob"></div></div>
      <div id="mob-buttons">
        <button class="mob-btn" data-act="jump" title="Pular">⤴</button>
        <button class="mob-btn" data-act="fire"  title="Bola de Fogo">🔥</button>
        <button class="mob-btn mob-btn-fly" data-act="fly" title="Voar">✈</button>
      </div>
    `;
    document.body.appendChild(wrap);

    const style = document.createElement('style');
    style.textContent = `
      #mobile-ui {
        position: fixed; inset: 0; pointer-events: none; z-index: 40;
        font-family: 'Bungee', sans-serif;
      }
      #mob-stick {
        position: absolute; bottom: 50px; left: 30px;
        width: 180px; height: 180px;
        border-radius: 50%;
        background: rgba(26,26,46,0.18);
        border: 2px solid rgba(255,255,255,0.20);
        pointer-events: auto;
        touch-action: none;
        backdrop-filter: blur(2px);
        -webkit-backdrop-filter: blur(2px);
      }
      #mob-stick-knob {
        position: absolute; top: 50%; left: 50%;
        width: 70px; height: 70px;
        border-radius: 50%;
        background: rgba(255,71,87,0.45);
        border: 2px solid rgba(255,255,255,0.5);
        transform: translate(-50%, -50%);
        pointer-events: none;
      }
      #mob-buttons {
        position: absolute; right: 20px; bottom: 50px;
        display: grid; grid-template-columns: repeat(3, 70px); gap: 12px;
        pointer-events: auto;
      }
      .mob-btn {
        width: 70px; height: 70px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.4);
        background: rgba(26,26,46,0.30);
        font-size: 24px; font-weight: bold;
        color: white;
        touch-action: none;
        user-select: none;
        backdrop-filter: blur(2px);
        -webkit-backdrop-filter: blur(2px);
      }
      .mob-btn:active { background: rgba(255,71,87,0.7); border-color: white; }
      #orient-lock-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.92);
        color: white; z-index: 999;
        display: none; flex-direction: column;
        align-items: center; justify-content: center;
        font-family: 'Fredoka', sans-serif;
        text-align: center; padding: 30px;
      }
      #orient-lock-overlay.show { display: flex; }
      #orient-lock-overlay .icon { font-size: 80px; margin-bottom: 20px; animation: rotIcon 2s ease-in-out infinite; }
      @keyframes rotIcon {
        0% { transform: rotate(0deg); }
        50% { transform: rotate(-90deg); }
        100% { transform: rotate(-90deg); }
      }
      #orient-lock-overlay h2 { font-family: 'Bungee', sans-serif; font-size: 24px; margin-bottom: 12px; }
      #orient-lock-overlay p { font-size: 16px; opacity: 0.85; max-width: 320px; margin-bottom: 24px; }
      #orient-lock-overlay button {
        background: #ff4757; color: white; border: 4px solid white;
        font-family: 'Bungee', sans-serif; font-size: 18px;
        padding: 14px 28px; border-radius: 30px;
        cursor: pointer; box-shadow: 5px 5px 0 rgba(0,0,0,0.4);
      }
    `;
    document.head.appendChild(style);

    // Overlay de orientação (substitui o ::after do CSS)
    const overlay = document.createElement('div');
    overlay.id = 'orient-lock-overlay';
    overlay.innerHTML = `
      <div class="icon">📱</div>
      <h2>Free-Craft Mobile</h2>
      <p>Para a melhor experiência, use seu celular na horizontal e em tela cheia.</p>
      <button id="enter-fullscreen-btn">▶ ENTRAR EM TELA CHEIA</button>
    `;
    document.body.appendChild(overlay);
    const fsBtn = overlay.querySelector('#enter-fullscreen-btn');
    fsBtn.addEventListener('click', requestFullscreenAndLandscape);

    // mostra overlay quando está em portrait
    function checkOrientation() {
      const portrait = window.matchMedia('(orientation: portrait)').matches;
      overlay.classList.toggle('show', portrait);
    }
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    checkOrientation();
  }

  // Tenta entrar em fullscreen + lock orientação landscape de forma agressiva.
  // Usa o documento inteiro (não só o canvas) pra cobrir toda a UI.
  function requestFullscreenAndLandscape() {
    const el = document.documentElement;
    const tryFs = () => {
      const req = el.requestFullscreen || el.webkitRequestFullscreen
                || el.mozRequestFullScreen || el.msRequestFullscreen;
      if (req) {
        const p = req.call(el, { navigationUI: 'hide' });
        if (p && p.then) {
          p.then(lockLandscape).catch(() => lockLandscape());
        } else {
          lockLandscape();
        }
      } else {
        lockLandscape();
      }
    };
    const lockLandscape = () => {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    };
    tryFs();
    // Truque iOS Safari: scrollTo(0,1) após pequeno delay esconde a barra
    setTimeout(() => { window.scrollTo(0, 1); }, 100);
    setTimeout(() => { window.scrollTo(0, 1); }, 500);
  }

  function init() {
    createUI();
    const stick = document.getElementById('mob-stick');
    const knob = document.getElementById('mob-stick-knob');
    const stickRect = () => stick.getBoundingClientRect();

    stick.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      const r = stickRect();
      stickActive = { id: t.identifier, baseX: r.left + r.width/2, baseY: r.top + r.height/2, dx: 0, dy: 0 };
    }, { passive: false });
    stick.addEventListener('touchmove', e => {
      e.preventDefault();
      if (!stickActive) return;
      for (const t of e.changedTouches) {
        if (t.identifier !== stickActive.id) continue;
        let dx = t.clientX - stickActive.baseX;
        let dy = t.clientY - stickActive.baseY;
        const dist = Math.hypot(dx, dy);
        if (dist > STICK_RADIUS) { dx *= STICK_RADIUS / dist; dy *= STICK_RADIUS / dist; }
        stickActive.dx = dx / STICK_RADIUS;
        stickActive.dy = dy / STICK_RADIUS;
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        // mapeia stick → WASD
        const TH = 0.2;
        setKey('KeyW', stickActive.dy < -TH);
        setKey('KeyS', stickActive.dy >  TH);
        setKey('KeyA', stickActive.dx < -TH);
        setKey('KeyD', stickActive.dx >  TH);
      }
    }, { passive: false });
    stick.addEventListener('touchend', e => {
      stickActive = null;
      knob.style.transform = `translate(-50%, -50%)`;
      setKey('KeyW', false); setKey('KeyS', false);
      setKey('KeyA', false); setKey('KeyD', false);
    });

    // Canvas: gerencia pan + tap/hold
    //  tap curto (<250ms + pouco movimento) → coloca bloco
    //  hold     (>250ms)                    → ataca/minera enquanto segurado
    //  qualquer movimento                    → panning da câmera (sempre)
    const renderer = Game.canvas;
    if (renderer) {
      let lastX = 0, lastY = 0;
      let startX = 0, startY = 0;
      let startT = 0;
      let moved = 0;
      let holdTriggered = false;
      let holdTimer = null;

      // Touch no canvas:
      //   • Tap curto (<300ms, parado)        → click esquerdo (atacar/minerar 1 swing)
      //   • Hold prolongado (>=400ms parado)   → click direito (colocar bloco / interagir)
      //   • Mover dedo                          → pan da câmera (sempre ativo)
      // Se segura mais tempo após tap, continua atacando (mining repetido).
      renderer.addEventListener('touchstart', e => {
        e.preventDefault();
        if (panTouchId != null) return;
        const t = e.changedTouches[0];
        if (t.target.closest('#mobile-ui')) return;
        panTouchId = t.identifier;
        lastX = startX = t.clientX;
        lastY = startY = t.clientY;
        startT = performance.now();
        moved = 0;
        holdTriggered = false;
        // hold longo (sem mover) → coloca bloco (click direito)
        clearTimeout(holdTimer);
        holdTimer = setTimeout(() => {
          if (panTouchId != null && moved < 18 && !holdTriggered) {
            holdTriggered = true;
            Game.mobile._place();
          }
        }, 400);
      }, { passive: false });
      renderer.addEventListener('touchmove', e => {
        for (const t of e.changedTouches) {
          if (t.identifier !== panTouchId) continue;
          const dx = t.clientX - lastX;
          const dy = t.clientY - lastY;
          lastX = t.clientX; lastY = t.clientY;
          moved += Math.abs(dx) + Math.abs(dy);
          Game.player.yaw -= dx * 0.005;
          Game.player.pitch -= dy * 0.005;
          Game.player.pitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, Game.player.pitch));
        }
      }, { passive: false });
      renderer.addEventListener('touchend', e => {
        for (const t of e.changedTouches) {
          if (t.identifier !== panTouchId) continue;
          panTouchId = null;
          clearTimeout(holdTimer);
          const dt = performance.now() - startT;
          // se NÃO virou hold-to-place e foi um tap rápido sem muito movimento → ataca
          if (!holdTriggered && dt < 400 && moved < 18) {
            Game.mobile._attack(true);
            // simula click rápido (libera após pequeno intervalo pra completar 1 swing)
            setTimeout(() => Game.mobile._attack(false), 80);
          }
          moved = 0;
        }
      }, { passive: false });
    }

    // botões
    document.querySelectorAll('.mob-btn').forEach(btn => {
      const act = btn.dataset.act;
      btn.addEventListener('touchstart', e => {
        e.preventDefault();
        if (act === 'jump') setKey('Space', true);
        if (act === 'fire') Game.fireballs && Game.fireballs.spawn();
        if (act === 'fly') Game.physics.toggleFly && Game.physics.toggleFly();
      }, { passive: false });
      btn.addEventListener('touchend', e => {
        e.preventDefault();
        if (act === 'jump') setKey('Space', false);
      }, { passive: false });
    });

    // mostra/esconde botão de voar baseado no modo
    function refreshButtons() {
      const flyBtn = document.querySelector('.mob-btn-fly');
      if (flyBtn) flyBtn.style.display = (Game.player && Game.player.mode === 'creative') ? '' : 'none';
    }
    setInterval(refreshButtons, 500);
    refreshButtons();

    // sem pointer lock no mobile — bypass do start screen
    Game.mobile.usesTouch = true;
  }

  Game.mobile = {
    isTouch: true,
    init,
    fakeKeys,
    usesTouch: false,
    _attack: () => {},   // será sobrescrito por main.js
    _place:  () => {},
    requestFullscreenAndLandscape,
  };
})();
