/* =========================================================
   Textures — geração procedural de texturas para blocos e ícones
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};
  const { mulberry32, makeTex, speckle } = Game.utils;

  const TEX = {};

  // ---------- Blocos básicos ----------
  TEX.grassTop = makeTex((ctx, s) => speckle(ctx, s, '#3d7822', [
    ['#2e5d18', 60], ['#4a8d2a', 30], ['#1d4810', 28], ['#5fa336', 12]
  ], 1001));

  TEX.dirt = makeTex((ctx, s) => speckle(ctx, s, '#8B5A2B', [
    ['#6d4520', 45], ['#a5723a', 30], ['#5c3a18', 20], ['#3d2812', 10]
  ], 2002));

  TEX.grassSide = makeTex((ctx, s) => {
    ctx.fillStyle = '#8B5A2B'; ctx.fillRect(0, 0, s, s);
    const rng = mulberry32(777);
    for (let i = 0; i < 50; i++) {
      const r = rng();
      ctx.fillStyle = r < 0.4 ? '#6d4520' : (r < 0.75 ? '#a5723a' : '#5c3a18');
      ctx.fillRect(Math.floor(rng() * s), Math.floor(rng() * s), 1, 1);
    }
    const grassH = Math.floor(s * 0.35);
    ctx.fillStyle = '#3d7822'; ctx.fillRect(0, 0, s, grassH);
    for (let x = 0; x < s; x++) {
      const r = rng();
      const extra = r < 0.35 ? 1 : (r < 0.55 ? 2 : (r < 0.65 ? 3 : 0));
      ctx.fillRect(x, grassH, 1, extra);
    }
    for (let i = 0; i < 25; i++) {
      ctx.fillStyle = rng() < 0.5 ? '#2e5d18' : '#4a8d2a';
      ctx.fillRect(Math.floor(rng() * s), Math.floor(rng() * (grassH + 2)), 1, 1);
    }
  });

  TEX.stone = makeTex((ctx, s) => speckle(ctx, s, '#888888', [
    ['#707070', 50], ['#a0a0a0', 35], ['#5c5c5c', 25], ['#b8b8b8', 15]
  ], 3003));

  TEX.woodSide = makeTex((ctx, s) => {
    const rng = mulberry32(333);
    // base de fibras verticais (colunas)
    for (let x = 0; x < s; x++) {
      const r = rng();
      ctx.fillStyle = r < 0.20 ? '#4a2810'
                    : r < 0.45 ? '#6d4520'
                    : r < 0.72 ? '#8b5a2b'
                    : r < 0.92 ? '#a87030'
                    :            '#c19062';
      ctx.fillRect(x, 0, 1, s);
    }
    // sulcos verticais (sombras escuras)
    for (let i = 0; i < 4; i++) {
      const x = Math.floor(rng() * s);
      ctx.fillStyle = 'rgba(40,20,8,0.55)';
      ctx.fillRect(x, 0, 1, s);
    }
    // luzes finas (pixels claros aleatórios)
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = 'rgba(195,150,100,0.6)';
      ctx.fillRect(Math.floor(rng() * s), Math.floor(rng() * s), 1, 2);
    }
    // anéis horizontais (faixas escuras irregulares)
    for (let i = 0; i < 3; i++) {
      const y = 2 + Math.floor(rng() * (s - 4));
      const len = 6 + Math.floor(rng() * (s - 6));
      const x0 = Math.floor(rng() * (s - len));
      ctx.fillStyle = '#3a1f0a';
      ctx.fillRect(x0, y, len, 1);
    }
    // nó (knot) — círculo escuro pequeno
    if (rng() < 0.7) {
      const cx = 3 + Math.floor(rng() * (s - 6));
      const cy = 3 + Math.floor(rng() * (s - 6));
      ctx.fillStyle = '#2a160a';
      ctx.beginPath(); ctx.arc(cx, cy, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a2810';
      ctx.beginPath(); ctx.arc(cx + 0.5, cy + 0.5, 0.8, 0, Math.PI * 2); ctx.fill();
    }
  });

  TEX.woodTop = makeTex((ctx, s) => {
    ctx.fillStyle = '#d2a679'; ctx.fillRect(0, 0, s, s);
    const cx = s / 2, cy = s / 2;
    for (let r = s / 2; r > 0; r -= 1) {
      ctx.strokeStyle = r % 3 === 0 ? '#a8844f' : (r % 2 === 0 ? '#c19966' : '#d2a679');
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    }
  });

  // Folhas: cada variante tem paleta distinta (verdes/oliva/amarelado/azul-acinzentado).
  // Mais buracos transparentes pra parecer copa real e menos um "cubo de folhas".
  function makeLeavesTex(seed, palette) {
    return makeTex((ctx, s) => {
      const rng = mulberry32(seed);
      // base: começa transparente e pinta clusters de folha
      ctx.clearRect(0, 0, s, s);
      // fundo escuro (canopy interna)
      ctx.fillStyle = palette.shadow;
      ctx.fillRect(0, 0, s, s);
      // tufos densos (clusters de 2-4 pixels)
      for (let i = 0; i < 50; i++) {
        const x = Math.floor(rng() * s);
        const y = Math.floor(rng() * s);
        const r = rng();
        const sz = r < 0.5 ? 2 : (r < 0.85 ? 3 : 4);
        const col = r < 0.20 ? palette.dark
                  : r < 0.55 ? palette.mid
                  : r < 0.85 ? palette.light
                             : palette.bright;
        ctx.fillStyle = col;
        ctx.fillRect(x, y, sz, sz);
      }
      // pixels luminosos (refletindo sol)
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = palette.bright;
        ctx.fillRect(Math.floor(rng() * s), Math.floor(rng() * s), 1, 1);
      }
      // muitos buracos pra silhueta natural (~30 por textura)
      for (let i = 0; i < 30; i++) {
        const x = Math.floor(rng() * s);
        const y = Math.floor(rng() * s);
        ctx.clearRect(x, y, 1, 1);
        if (rng() < 0.5) ctx.clearRect((x + 1) % s, y, 1, 1);
        if (rng() < 0.3) ctx.clearRect(x, (y + 1) % s, 1, 1);
      }
      // sombras profundas
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = 'rgba(5,20,8,0.55)';
        ctx.fillRect(Math.floor(rng() * s), Math.floor(rng() * s), 1, 1);
      }
    });
  }
  // 4 paletas distintas: verde-floresta, verde-claro, oliva-amarelado, verde-azulado
  TEX.leaves  = makeLeavesTex(4004, { shadow:'#1a4015', dark:'#2a6a25', mid:'#3a8a32', light:'#52a945', bright:'#82c46a' });
  TEX.leaves2 = makeLeavesTex(4101, { shadow:'#1f3d12', dark:'#3a6a18', mid:'#5a8d28', light:'#7aac3a', bright:'#a8d166' });
  TEX.leaves3 = makeLeavesTex(4202, { shadow:'#2a4010', dark:'#4a6a12', mid:'#6e8d22', light:'#94ad3a', bright:'#c8d575' });
  TEX.leaves4 = makeLeavesTex(4303, { shadow:'#1a3b30', dark:'#2c6048', mid:'#3e8862', light:'#5fae84', bright:'#8fd1a5' });

  TEX.cheese = makeTex((ctx, s) => {
    ctx.fillStyle = '#FFD966'; ctx.fillRect(0, 0, s, s);
    const rng = mulberry32(42);
    for (let i = 0; i < 25; i++) {
      ctx.fillStyle = rng() < 0.5 ? '#e8b530' : '#fff0a0';
      ctx.fillRect(Math.floor(rng() * s), Math.floor(rng() * s), 1, 1);
    }
    for (let i = 0; i < 5; i++) {
      const x = 2 + Math.floor(rng() * (s - 4));
      const y = 2 + Math.floor(rng() * (s - 4));
      const r = 1 + Math.floor(rng() * 2);
      ctx.fillStyle = '#a87820';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  });

  TEX.water = makeTex((ctx, s) => {
    ctx.fillStyle = '#3F76E4'; ctx.fillRect(0, 0, s, s);
    const rng = mulberry32(5005);
    for (let i = 0; i < 50; i++) {
      const r = rng();
      ctx.fillStyle = r < 0.3 ? '#5b8df0' : (r < 0.65 ? '#2c5fbf' : '#7aa4f5');
      ctx.fillRect(Math.floor(rng() * s), Math.floor(rng() * s), 1, 1);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let y = 1; y < s; y += 4) for (let x = 0; x < s; x += 2) ctx.fillRect(x, y, 1, 1);
  });

  TEX.lava = makeTex((ctx, s) => {
    ctx.fillStyle = '#F76A0C'; ctx.fillRect(0, 0, s, s);
    const rng = mulberry32(6006);
    for (let i = 0; i < 60; i++) {
      const r = rng();
      ctx.fillStyle = r < 0.3 ? '#FFD700' : (r < 0.65 ? '#FF4500' : (r < 0.85 ? '#B22222' : '#FFC107'));
      ctx.fillRect(Math.floor(rng() * s), Math.floor(rng() * s), 1, 1);
    }
    for (let i = 0; i < 4; i++) {
      const x = 2 + Math.floor(rng() * (s - 4));
      const y = 2 + Math.floor(rng() * (s - 4));
      ctx.fillStyle = '#FFE066';
      ctx.beginPath(); ctx.arc(x, y, 1.4, 0, Math.PI * 2); ctx.fill();
    }
  });

  TEX.glass = makeTex((ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = 'rgba(220, 240, 255, 0.18)'; ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, s - 1, s - 1);
    ctx.strokeStyle = 'rgba(180,200,220,0.6)';
    ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(s - 3, s - 3); ctx.stroke();
  });

  TEX.sand = makeTex((ctx, s) => speckle(ctx, s, '#f4d674', [
    ['#e8c060', 50], ['#fde9a0', 40], ['#c69b3a', 18]
  ], 7007));

  TEX.planks = makeTex((ctx, s) => {
    const rng = mulberry32(8008);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const band = Math.floor(y / 4) % 2;
        const r = rng();
        let col;
        if (band === 0) col = r < 0.4 ? '#a87030' : (r < 0.8 ? '#c1864a' : '#8b5a2b');
        else col = r < 0.4 ? '#9c6228' : (r < 0.8 ? '#b67940' : '#7a4f25');
        ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.strokeStyle = '#5a3818'; ctx.lineWidth = 1;
    for (let y = 4; y < s; y += 4) {
      ctx.beginPath(); ctx.moveTo(0, y - 0.5); ctx.lineTo(s, y - 0.5); ctx.stroke();
    }
  });

  TEX.craftTop = makeTex((ctx, s) => {
    const rng = mulberry32(9009);
    ctx.fillStyle = '#a87030'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = rng() < 0.5 ? '#8b5a2b' : '#c19966';
      ctx.fillRect(Math.floor(rng() * s), Math.floor(rng() * s), 1, 1);
    }
    ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const p = Math.floor(i * s / 3);
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(s, p); ctx.stroke();
    }
  });

  TEX.craftSide = makeTex((ctx, s) => {
    const rng = mulberry32(9010);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const r = rng();
        ctx.fillStyle = r < 0.4 ? '#a87030' : (r < 0.8 ? '#8b5a2b' : '#c19966');
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(2, 4, 6, 1); ctx.fillRect(2, 4, 1, 5);
    ctx.fillRect(11, 6, 3, 1); ctx.fillRect(12, 6, 1, 5);
  });

  TEX.doorBottom = makeTex((ctx, s) => {
    const rng = mulberry32(11011);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const r = rng();
      ctx.fillStyle = r < 0.5 ? '#a87030' : (r < 0.85 ? '#8b5a2b' : '#c19966');
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 1;
    ctx.strokeRect(1.5, 1.5, s - 3, s - 3);
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(s - 4, Math.floor(s / 2), 2, 2);
  });

  TEX.doorTop = makeTex((ctx, s) => {
    const rng = mulberry32(11012);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const r = rng();
      ctx.fillStyle = r < 0.5 ? '#a87030' : (r < 0.85 ? '#8b5a2b' : '#c19966');
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 1;
    ctx.strokeRect(1.5, 1.5, s - 3, s - 3);
    ctx.fillStyle = 'rgba(220, 240, 255, 0.7)';
    ctx.fillRect(4, 3, s - 8, 4);
    ctx.strokeRect(4.5, 3.5, s - 9, 3);
  });

  function makeOre(color, seed) {
    return makeTex((ctx, s) => {
      speckle(ctx, s, '#888888', [
        ['#707070', 50], ['#a0a0a0', 30], ['#5c5c5c', 20]
      ], seed);
      const rng = mulberry32(seed + 9999);
      for (let i = 0; i < 7; i++) {
        const cx = 1 + Math.floor(rng() * (s - 2));
        const cy = 1 + Math.floor(rng() * (s - 2));
        const sz = 1 + Math.floor(rng() * 2);
        ctx.fillStyle = color; ctx.fillRect(cx, cy, sz, sz);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(cx, cy, 1, 1);
      }
    });
  }

  TEX.coalOre     = makeOre('#1a1a2e', 12001);
  TEX.ironOre     = makeOre('#d8a878', 12002);
  TEX.goldOre     = makeOre('#FFD700', 12003);
  TEX.diamondOre  = makeOre('#5dd4f5', 12004);
  TEX.emeraldOre  = makeOre('#50C878', 12005);
  TEX.redstoneOre = makeOre('#cc1a1a', 12006);
  TEX.lapisOre    = makeOre('#1f3fa8', 12007);
  TEX.copperOre   = makeOre('#d96e3f', 12008);
  TEX.quartzOre   = makeOre('#f5f5f5', 12009);
  TEX.topazOre    = makeOre('#ff9933', 12010);
  TEX.amethystOre = makeOre('#9933cc', 12011);

  // ---------- Cobblestone, tijolo, lápis ----------
  TEX.cobble = makeTex((ctx, s) => {
    const rng = mulberry32(13013);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const r = rng();
      ctx.fillStyle = r < 0.3 ? '#5c5c5c' : (r < 0.65 ? '#7a7a7a' : (r < 0.85 ? '#9c9c9c' : '#3a3a3a'));
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1;
    // contornos de "pedras"
    ctx.strokeRect(0.5, 0.5, 6, 5);
    ctx.strokeRect(8.5, 0.5, 6, 4);
    ctx.strokeRect(0.5, 7.5, 4, 7);
    ctx.strokeRect(6.5, 6.5, 8, 8);
  });

  TEX.brick = makeTex((ctx, s) => {
    ctx.fillStyle = '#7a3022'; ctx.fillRect(0, 0, s, s);
    const rng = mulberry32(14014);
    // tijolos 8x4 alternados
    ctx.fillStyle = '#a64a3a';
    for (let row = 0; row < s; row += 4) {
      const offset = (row / 4) % 2 === 0 ? 0 : 4;
      for (let col = 0; col < s; col += 8) {
        ctx.fillRect((col + offset) % s, row, 7, 3);
      }
    }
    // textura
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = rng() < 0.5 ? '#5a2418' : '#c25a40';
      ctx.fillRect(Math.floor(rng() * s), Math.floor(rng() * s), 1, 1);
    }
  });

  TEX.lapisBlock = makeTex((ctx, s) => {
    ctx.fillStyle = '#1f3fa8'; ctx.fillRect(0, 0, s, s);
    const rng = mulberry32(15015);
    for (let i = 0; i < 60; i++) {
      const r = rng();
      ctx.fillStyle = r < 0.3 ? '#0d2570' : (r < 0.7 ? '#3962d8' : '#FFD700');
      ctx.fillRect(Math.floor(rng() * s), Math.floor(rng() * s), 1, 1);
    }
  });

  // ---------- Abóbora ----------
  TEX.pumpkinSide = makeTex((ctx, s) => {
    const rng = mulberry32(20001);
    ctx.fillStyle = '#d97e1f'; ctx.fillRect(0, 0, s, s);
    // estrias verticais
    for (let x = 1; x < s; x += 3) {
      ctx.fillStyle = '#a85a10'; ctx.fillRect(x, 0, 1, s);
    }
    // ruído
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = rng() < 0.5 ? '#b86620' : '#e89030';
      ctx.fillRect(Math.floor(rng() * s), Math.floor(rng() * s), 1, 1);
    }
  });
  TEX.pumpkinTop = makeTex((ctx, s) => {
    ctx.fillStyle = '#a85a10'; ctx.fillRect(0, 0, s, s);
    const rng = mulberry32(20002);
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = rng() < 0.5 ? '#8a4810' : '#c87020';
      ctx.fillRect(Math.floor(rng() * s), Math.floor(rng() * s), 1, 1);
    }
    // cabinho verde no centro
    ctx.fillStyle = '#3a6a1a';
    ctx.fillRect(s/2 - 1, s/2 - 2, 2, 4);
    ctx.fillRect(s/2, s/2, 2, 1);
  });
  TEX.pumpkinFace = makeTex((ctx, s) => {
    // base = lateral
    const rng = mulberry32(20003);
    ctx.fillStyle = '#d97e1f'; ctx.fillRect(0, 0, s, s);
    for (let x = 1; x < s; x += 3) {
      ctx.fillStyle = '#a85a10'; ctx.fillRect(x, 0, 1, s);
    }
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = rng() < 0.5 ? '#b86620' : '#e89030';
      ctx.fillRect(Math.floor(rng() * s), Math.floor(rng() * s), 1, 1);
    }
    // olhos triangulares pretos
    ctx.fillStyle = '#1a0a02';
    ctx.fillRect(3, 5, 3, 2); ctx.fillRect(4, 7, 1, 1);
    ctx.fillRect(s - 6, 5, 3, 2); ctx.fillRect(s - 5, 7, 1, 1);
    // boca dentada
    ctx.fillRect(3, 11, 10, 1);
    ctx.fillRect(5, 12, 1, 1); ctx.fillRect(7, 12, 2, 1); ctx.fillRect(10, 12, 1, 1);
  });

  // ---------- Bloco de ferro ----------
  TEX.ironBlock = makeTex((ctx, s) => {
    ctx.fillStyle = '#d8d8d8'; ctx.fillRect(0, 0, s, s);
    const rng = mulberry32(20004);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = rng() < 0.5 ? '#b8b8b8' : '#e8e8e8';
      ctx.fillRect(Math.floor(rng() * s), Math.floor(rng() * s), 1, 1);
    }
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, s - 1, s - 1);
  });

  // ---------- Cama (topo: vermelho com travesseiro) ----------
  TEX.bedTop = makeTex((ctx, s) => {
    ctx.fillStyle = '#cc2a2a'; ctx.fillRect(0, 0, s, s);
    // travesseiro branco
    ctx.fillStyle = '#f0f0f0'; ctx.fillRect(2, 1, s - 4, 4);
    // costuras
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(2, 5, s - 4, 1);
    ctx.fillRect(s/2, 5, 1, s - 6);
    // ruído
    const rng = mulberry32(20005);
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = '#a01a1a';
      ctx.fillRect(Math.floor(rng() * s), 6 + Math.floor(rng() * (s - 7)), 1, 1);
    }
  });

  // ---------- Lã ----------
  TEX.wool = makeTex((ctx, s) => {
    const rng = mulberry32(20006);
    ctx.fillStyle = '#f0f0f0'; ctx.fillRect(0, 0, s, s);
    // textura de fios
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = rng() < 0.5 ? '#dadada' : '#ffffff';
      ctx.fillRect(Math.floor(rng() * s), Math.floor(rng() * s), 1, 1);
    }
    // pequenos tufos
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = '#bcbcbc';
      const x = Math.floor(rng() * (s - 2));
      const y = Math.floor(rng() * (s - 2));
      ctx.fillRect(x, y, 2, 1);
    }
  });

  // ---------- Plantas (cross-section, com fundo transparente) ----------
  TEX.sapling = makeTex((ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    // tronquinho marrom no meio
    ctx.fillStyle = '#5a3818';
    ctx.fillRect(7, 8, 2, 8);
    // copa verde (folhas pequenas)
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(5, 4, 6, 5);
    ctx.fillRect(4, 5, 2, 3);
    ctx.fillRect(10, 5, 2, 3);
    ctx.fillStyle = '#3ea94a';
    ctx.fillRect(6, 5, 4, 3);
    ctx.fillStyle = '#5dbe67';
    ctx.fillRect(7, 5, 2, 1);
  });

  TEX.tallGrass = makeTex((ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const rng = mulberry32(30001);
    // hastes mais densas (12), com leve curva e cores variadas
    const hastes = 12;
    for (let i = 0; i < hastes; i++) {
      const baseX = Math.floor(rng() * s);
      const h = 7 + Math.floor(rng() * 7);
      const y0 = s - h;
      const curve = Math.floor((rng() - 0.5) * 2);  // -1, 0, +1
      const colMid = ['#3a7822', '#2d5d18', '#4a8d2a', '#5fa336'][Math.floor(rng() * 4)];
      const colBase = '#1d4810';
      for (let yy = y0; yy < s; yy++) {
        const t = (yy - y0) / h;
        const x = (baseX + Math.round(curve * t * 1.5)) % s;
        // base: mais escura
        ctx.fillStyle = t < 0.3 ? colBase : colMid;
        ctx.fillRect(x, yy, 1, 1);
        // pequena espessura aleatória
        if (rng() < 0.25) ctx.fillRect((x + 1) % s, yy, 1, 1);
      }
      // ponta clara (sempre)
      ctx.fillStyle = '#9bd07d';
      ctx.fillRect(baseX % s, y0, 1, 1);
      // sementes ocasionais (pixel amarelado no topo)
      if (rng() < 0.3) {
        ctx.fillStyle = '#d8b450';
        ctx.fillRect(baseX % s, y0 + 1, 1, 1);
      }
    }
    // pequenos pontos no chão pra parecer mato baixo
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = '#2d5d18';
      ctx.fillRect(Math.floor(rng() * s), s - 1 - Math.floor(rng() * 2), 1, 1);
    }
  });

  TEX.wheatGrown = makeTex((ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    // hastes verticais douradas
    for (let x = 2; x < s; x += 3) {
      ctx.fillStyle = '#9a7a30';
      for (let y = 4; y < s; y++) ctx.fillRect(x, y, 1, 1);
      // grãos no topo
      ctx.fillStyle = '#d8b450';
      ctx.fillRect(x - 1, 3, 3, 4);
      ctx.fillStyle = '#fae480';
      ctx.fillRect(x, 4, 1, 2);
    }
  });

  TEX.farmland = makeTex((ctx, s) => {
    // terra cultivada: marrom mais escuro + sulcos
    ctx.fillStyle = '#5a3818';
    ctx.fillRect(0, 0, s, s);
    const rng = mulberry32(30002);
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = rng() < 0.5 ? '#4a2810' : '#6d4520';
      ctx.fillRect(Math.floor(rng() * s), Math.floor(rng() * s), 1, 1);
    }
    // sulcos (faixas escuras horizontais)
    ctx.fillStyle = '#3a1f0a';
    for (let y = 4; y < s; y += 6) ctx.fillRect(0, y, s, 1);
  });

  // ---------- Tocha ----------
  TEX.torch = makeTex((ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    // cabo (madeira)
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(7, 6, 2, 10);
    // sombra do cabo
    ctx.fillStyle = '#5a3818';
    ctx.fillRect(7, 6, 1, 10);
    // chama
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(6, 3, 4, 3);
    ctx.fillStyle = '#FF7B00';
    ctx.fillRect(6, 4, 1, 2); ctx.fillRect(9, 4, 1, 2);
    ctx.fillRect(7, 2, 2, 1);
    // núcleo branco
    ctx.fillStyle = '#FFFFCC';
    ctx.fillRect(7, 4, 2, 1);
  });

  // Texturas de quebra (10 estágios) — rachaduras conectadas estilo Minecraft.
  // Cada estágio acumula linhas-pixel ramificadas a partir de pontos focais.
  // Tudo gerado uma vez com mesmo seed pra que estágios cresçam organicamente
  // (estágio N+1 adiciona detalhes ao estágio N).
  const breakTex = (() => {
    const SIZE = 16;
    const stages = 10;
    const out = [];
    // Pré-calcula pixels acumulados por estágio
    const pixels = [];          // Array<Set<"x,y">>  cada um é o conjunto acumulado
    const rng = mulberry32(99173);
    let acc = new Set();
    // Pontos focais (3 centros das rachaduras)
    const focals = [];
    for (let i = 0; i < 3; i++) {
      focals.push({ x: 2 + Math.floor(rng() * (SIZE - 4)), y: 2 + Math.floor(rng() * (SIZE - 4)) });
    }
    // Pra cada estágio, "cresce" a rachadura adicionando segmentos
    for (let stage = 0; stage < stages; stage++) {
      // estágio 0: vazio (sem rachadura visível)
      if (stage > 0) {
        // a cada estágio, adiciona N novos segmentos
        const segs = 2 + stage * 2;
        for (let s = 0; s < segs; s++) {
          // escolhe um focal pra ramificar OU expande um pixel existente
          const focal = focals[Math.floor(rng() * focals.length)];
          let x = focal.x, y = focal.y;
          // se já tem pixels acumulados, começa de um deles ocasionalmente
          if (acc.size > 0 && rng() < 0.5) {
            const arr = Array.from(acc);
            const start = arr[Math.floor(rng() * arr.length)].split(',').map(Number);
            x = start[0]; y = start[1];
          }
          const len = 2 + Math.floor(rng() * 3);
          let dx = (rng() - 0.5) * 2;
          let dy = (rng() - 0.5) * 2;
          // discretiza direção pra cardinais/diagonais
          dx = Math.sign(dx) || (rng() < 0.5 ? -1 : 1);
          dy = Math.sign(dy) || (rng() < 0.5 ? -1 : 1);
          for (let j = 0; j < len; j++) {
            x += dx; y += dy;
            // pequenas viradas
            if (rng() < 0.3) dx = (rng() < 0.5 ? -1 : 1);
            if (rng() < 0.3) dy = (rng() < 0.5 ? -1 : 1);
            const px = ((x % SIZE) + SIZE) % SIZE;
            const py = ((y % SIZE) + SIZE) % SIZE;
            acc.add(`${px},${py}`);
          }
        }
      }
      pixels.push(new Set(acc));
    }

    for (let stage = 0; stage < stages; stage++) {
      const tex = makeTex((ctx, s) => {
        ctx.clearRect(0, 0, s, s);
        const intensity = stage / 9;
        // pixels da rachadura (escuros)
        ctx.fillStyle = `rgba(0,0,0,${0.6 + intensity * 0.35})`;
        for (const key of pixels[stage]) {
          const [x, y] = key.split(',').map(Number);
          ctx.fillRect(x, y, 1, 1);
        }
        // borda mais clara (efeito 3D de quebra)
        ctx.fillStyle = `rgba(255,255,255,${0.06 + intensity * 0.10})`;
        for (const key of pixels[stage]) {
          const [x, y] = key.split(',').map(Number);
          if (!pixels[stage].has(`${x + 1},${y}`)) ctx.fillRect((x + 1) % s, y, 1, 1);
        }
      }, SIZE);
      out.push(tex);
    }
    return out;
  })();

  // ---------- Ícones de itens / ferramentas ----------
  function makeFlatIcon(bgColor, accent) {
    return makeTex((ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      ctx.fillStyle = bgColor; ctx.fillRect(3, 3, s - 6, s - 6);
      if (accent) { ctx.fillStyle = accent; ctx.fillRect(4, 4, s - 8, 2); }
    });
  }
  function makeStickIcon() {
    return makeTex((ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      ctx.fillStyle = '#b58a4d';
      for (let i = 0; i < 10; i++) ctx.fillRect(s - 4 - i, 4 + i, 2, 2);
      ctx.fillStyle = '#7a5a30'; ctx.fillRect(s - 4, 4, 1, 2);
    });
  }
  // Picareta melhorada: cabo diagonal de madeira + cabeça em V ampla
  function makePickaxeIcon(headColor) {
    return makeTex((ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      // cabo diagonal
      ctx.fillStyle = '#8b5a2b';
      for (let i = 0; i < 9; i++) ctx.fillRect(7 + Math.floor(i * 0.5), s - 3 - i, 2, 2);
      // sombra do cabo
      ctx.fillStyle = '#5a3818';
      for (let i = 0; i < 9; i++) ctx.fillRect(7 + Math.floor(i * 0.5), s - 2 - i, 1, 1);
      // cabeça (forma de V invertido bem definida)
      ctx.fillStyle = headColor;
      // base horizontal
      ctx.fillRect(3, 5, 10, 2);
      // pontas laterais
      ctx.fillRect(2, 6, 2, 3);
      ctx.fillRect(12, 6, 2, 3);
      // brilho central
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(4, 5, 5, 1);
      // borda inferior escura
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(3, 7, 10, 1);
    });
  }

  function makeSwordIcon(bladeColor) {
    return makeTex((ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      // lâmina diagonal
      ctx.fillStyle = bladeColor;
      for (let i = 0; i < 10; i++) ctx.fillRect(2 + i, s - 4 - i, 2, 2);
      // brilho
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      for (let i = 0; i < 9; i++) ctx.fillRect(2 + i, s - 4 - i, 1, 1);
      // guarda dourada
      ctx.fillStyle = '#FFD700'; ctx.fillRect(s - 7, s - 11, 5, 2);
      // cabo escuro
      ctx.fillStyle = '#5a3818'; ctx.fillRect(s - 5, s - 7, 2, 4);
    });
  }

  function makeShovelIcon(headColor) {
    return makeTex((ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      // cabo
      ctx.fillStyle = '#8b5a2b';
      for (let i = 0; i < 9; i++) ctx.fillRect(8 + Math.floor(i * 0.4), s - 4 - i, 2, 2);
      // lâmina retangular afinada
      ctx.fillStyle = headColor;
      ctx.fillRect(3, 3, 5, 7);
      ctx.fillRect(4, 10, 3, 1);
      // brilho
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(4, 4, 1, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(7, 4, 1, 5);
    });
  }

  function makeAxeIcon(headColor) {
    return makeTex((ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      // cabo diagonal
      ctx.fillStyle = '#8b5a2b';
      for (let i = 0; i < 9; i++) ctx.fillRect(8 + Math.floor(i * 0.5), s - 4 - i, 2, 2);
      // cabeça em L
      ctx.fillStyle = headColor;
      ctx.fillRect(2, 3, 8, 4);
      ctx.fillRect(2, 5, 5, 5);
      // lâmina afiada (pontiaguda)
      ctx.fillRect(1, 5, 1, 3);
      // brilho
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(3, 4, 1, 1);
      ctx.fillRect(8, 3, 1, 1);
      // borda escura
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(2, 6, 5, 1);
    });
  }

  function makeBowIcon() {
    return makeTex((ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      // arco em curva
      ctx.fillStyle = '#8b5a2b';
      for (let i = 0; i < 13; i++) {
        const t = i / 12;
        const y = 1 + i;
        const x = 9 + Math.round(Math.sin(t * Math.PI) * 4);
        ctx.fillRect(x, y, 2, 1);
      }
      // sombra do arco
      ctx.fillStyle = '#5a3818';
      for (let i = 0; i < 13; i++) {
        const t = i / 12;
        const y = 1 + i;
        const x = 9 + Math.round(Math.sin(t * Math.PI) * 4);
        ctx.fillRect(x, y + 1, 1, 1);
      }
      // corda esticada
      ctx.fillStyle = '#fff7e6';
      for (let i = 0; i < 13; i++) ctx.fillRect(9, 1 + i, 1, 1);
      // flecha apontada
      ctx.fillStyle = '#b58a4d';
      ctx.fillRect(3, 7, 7, 1);
      ctx.fillStyle = '#aaa';
      ctx.fillRect(2, 7, 2, 1);
      ctx.fillRect(1, 7, 1, 1);
    });
  }

  function makePistolIcon() {
    return makeTex((ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      // cano
      ctx.fillStyle = '#444';
      ctx.fillRect(2, 5, 11, 3);
      // mira frontal
      ctx.fillStyle = '#222';
      ctx.fillRect(11, 4, 1, 1);
      // boca do cano
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(13, 6, 1, 1);
      // estrutura central
      ctx.fillStyle = '#666';
      ctx.fillRect(2, 5, 5, 5);
      // cabo (vertical, levemente inclinado)
      ctx.fillRect(3, 8, 4, 6);
      ctx.fillRect(2, 9, 1, 4);
      // gatilho
      ctx.fillStyle = '#888';
      ctx.fillRect(5, 8, 1, 2);
      // brilho
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(3, 5, 8, 1);
      ctx.fillRect(3, 8, 3, 1);
      // sombra
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(2, 8, 11, 1);
    });
  }

  function makeShieldIcon(plateColor = '#8b5a2b', emblemColor = '#FFD700') {
    return makeTex((ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      // placa principal
      ctx.fillStyle = plateColor;
      ctx.fillRect(3, 2, 10, 9);
      ctx.fillRect(4, 11, 8, 1);
      ctx.fillRect(5, 12, 6, 1);
      ctx.fillRect(6, 13, 4, 1);
      // borda
      ctx.fillStyle = '#3a2010';
      ctx.fillRect(3, 2, 10, 1);
      ctx.fillRect(3, 2, 1, 9);
      ctx.fillRect(12, 2, 1, 9);
      // emblema (cruz)
      ctx.fillStyle = emblemColor;
      ctx.fillRect(7, 4, 2, 7);
      ctx.fillRect(5, 6, 6, 2);
    });
  }

  function makeHelmetIcon(color, accent) {
    return makeTex((ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      ctx.fillStyle = color;
      ctx.fillRect(3, 3, 10, 8);
      ctx.fillRect(2, 5, 1, 6);
      ctx.fillRect(13, 5, 1, 6);
      ctx.fillRect(4, 11, 8, 1);
      // visor
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(5, 6, 6, 2);
      // brilho
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(4, 4, 4, 1);
      // detalhe accent
      if (accent) {
        ctx.fillStyle = accent;
        ctx.fillRect(7, 3, 2, 1);
      }
    });
  }

  function makeChestIcon(color, accent) {
    return makeTex((ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      ctx.fillStyle = color;
      ctx.fillRect(3, 2, 10, 11);
      ctx.fillRect(2, 3, 1, 5);
      ctx.fillRect(13, 3, 1, 5);
      // divisão central
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(7, 3, 2, 9);
      // brilho
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(4, 3, 3, 1);
      if (accent) {
        ctx.fillStyle = accent;
        ctx.fillRect(7, 6, 2, 1);
      }
    });
  }

  function makeLegsIcon(color) {
    return makeTex((ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      ctx.fillStyle = color;
      ctx.fillRect(3, 2, 4, 12);
      ctx.fillRect(9, 2, 4, 12);
      // cinto
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(3, 2, 10, 2);
      // brilho
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(3, 4, 1, 6);
      ctx.fillRect(9, 4, 1, 6);
    });
  }

  function makeBootsIcon(color) {
    return makeTex((ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      ctx.fillStyle = color;
      ctx.fillRect(2, 6, 5, 6);
      ctx.fillRect(2, 11, 7, 2);
      ctx.fillRect(9, 6, 5, 6);
      ctx.fillRect(7, 11, 7, 2);
      // cordões (acentos escuros)
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(3, 8, 3, 1);
      ctx.fillRect(10, 8, 3, 1);
      // brilho
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(2, 7, 1, 3);
      ctx.fillRect(9, 7, 1, 3);
    });
  }

  function makeArrowIcon() {
    return makeTex((ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      // pluma (vermelho/folha)
      ctx.fillStyle = '#3ea94a';
      ctx.fillRect(2, 5, 3, 2);
      ctx.fillRect(2, 9, 3, 2);
      ctx.fillRect(3, 7, 1, 2);
      // haste
      ctx.fillStyle = '#b58a4d';
      ctx.fillRect(4, 7, 8, 2);
      ctx.fillStyle = '#7a5a30';
      ctx.fillRect(4, 8, 8, 1);
      // ponta de pedra
      ctx.fillStyle = '#aaa';
      ctx.fillRect(11, 6, 2, 4);
      ctx.fillRect(13, 7, 1, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(11, 7, 1, 1);
    });
  }

  function makeBulletIcon() {
    return makeTex((ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      // cápsula dourada
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(2, 6, 7, 4);
      ctx.fillStyle = '#B8860B';
      ctx.fillRect(2, 9, 7, 1);
      // ranhura
      ctx.fillStyle = '#8B6508';
      ctx.fillRect(8, 6, 1, 4);
      // ogiva
      ctx.fillStyle = '#888';
      ctx.fillRect(9, 6, 4, 4);
      ctx.fillStyle = '#666';
      ctx.fillRect(13, 7, 1, 2);
      // brilho
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(3, 6, 4, 1);
      ctx.fillRect(10, 6, 2, 1);
    });
  }

  Game.tex = TEX;
  Game.breakTex = breakTex;
  Game.iconMakers = {
    makeFlatIcon, makeStickIcon, makePickaxeIcon, makeSwordIcon,
    makeShovelIcon, makeAxeIcon, makeBowIcon, makePistolIcon,
    makeShieldIcon, makeHelmetIcon, makeChestIcon, makeLegsIcon,
    makeBootsIcon, makeArrowIcon, makeBulletIcon,
  };
})();
