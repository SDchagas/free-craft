/* =========================================================
   Blocks — definição de blocos, itens, ferramentas, armas,
   armaduras e receitas.

   IDs:
     1-29   blocos
     100+   itens não-blocos (recursos/munição)
     200+   ferramentas (pick/shovel/axe/sword)
     240+   armas (bow/gun/shield)
     300+   armaduras (head/chest/legs/feet)
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};
  const TEX = Game.tex;
  const I = Game.iconMakers;

  const ITEMS = {};
  const defBlock = (id, def) => ITEMS[id] = { ...def, kind: 'block' };
  const defItem  = (id, def) => ITEMS[id] = { ...def, kind: 'item'  };
  const defTool  = (id, def) => ITEMS[id] = { ...def, kind: 'tool'  };
  const defArmor = (id, def) => ITEMS[id] = { ...def, kind: 'armor' };
  const defWeapon= (id, def) => ITEMS[id] = { ...def, kind: 'weapon' };

  // ---------- Blocos ----------
  // tool: ferramenta certa ('shovel'|'pick'|'axe'|'sword'|null)
  defBlock(1,  { name: 'Grama',         tex: [TEX.grassSide, TEX.grassSide, TEX.grassTop, TEX.dirt, TEX.grassSide, TEX.grassSide], hardness: 0.6, tool: 'shovel' });
  defBlock(2,  { name: 'Terra',         tex: Array(6).fill(TEX.dirt), hardness: 0.5, tool: 'shovel' });
  defBlock(3,  { name: 'Pedra',         tex: Array(6).fill(TEX.stone), hardness: 1.5, requiresTool: 1, drop: 21, tool: 'pick' });
  defBlock(4,  { name: 'Tronco',        tex: [TEX.woodSide, TEX.woodSide, TEX.woodTop, TEX.woodTop, TEX.woodSide, TEX.woodSide], hardness: 2.0, tool: 'axe' });
  defBlock(5,  { name: 'Folhas',        tex: Array(6).fill(TEX.leaves), hardness: 0.2, transparent: true, alphaTest: 0.1, tool: 'shears',
    texVariants: [
      Array(6).fill(TEX.leaves),
      Array(6).fill(TEX.leaves2),
      Array(6).fill(TEX.leaves3),
      Array(6).fill(TEX.leaves4),
    ]
  });
  defBlock(6,  { name: 'Queijo',        tex: Array(6).fill(TEX.cheese), hardness: 0.3 });
  defBlock(7,  { name: 'Água',          tex: Array(6).fill(TEX.water), hardness: -1, transparent: true, opacity: 0.7, liquid: true });
  defBlock(8,  { name: 'Lava',          tex: Array(6).fill(TEX.lava), hardness: -1, transparent: true, opacity: 0.95, liquid: true, emissive: 0xff5500, emissiveIntensity: 0.6 });
  defBlock(9,  { name: 'Vidro',         tex: Array(6).fill(TEX.glass), hardness: 0.3, transparent: true, opacity: 0.4, tool: 'pick' });
  defBlock(10, { name: 'Porta',         tex: Array(6).fill(TEX.doorBottom), hardness: 1.0, transparent: true, alphaTest: 0.05, tool: 'axe' });
  defBlock(11, { name: 'Areia',         tex: Array(6).fill(TEX.sand), hardness: 0.5, tool: 'shovel' });
  defBlock(12, { name: 'Tábuas',        tex: Array(6).fill(TEX.planks), hardness: 1.5, tool: 'axe' });
  defBlock(13, { name: 'Mesa de Craft', tex: [TEX.craftSide, TEX.craftSide, TEX.craftTop, TEX.planks, TEX.craftSide, TEX.craftSide], hardness: 1.8, interactive: true, tool: 'axe' });
  defBlock(14, { name: 'Carvão',        tex: Array(6).fill(TEX.coalOre), hardness: 2.0, requiresTool: 1, drop: 101, tool: 'pick' });
  defBlock(15, { name: 'Ferro',         tex: Array(6).fill(TEX.ironOre), hardness: 2.5, requiresTool: 2, drop: 102, tool: 'pick' });
  defBlock(16, { name: 'Ouro',          tex: Array(6).fill(TEX.goldOre), hardness: 2.5, requiresTool: 3, drop: 103, tool: 'pick' });
  defBlock(17, { name: 'Diamante',      tex: Array(6).fill(TEX.diamondOre), hardness: 3.0, requiresTool: 3, drop: 104, tool: 'pick' });
  defBlock(18, { name: 'Esmeralda',     tex: Array(6).fill(TEX.emeraldOre), hardness: 3.0, requiresTool: 3, drop: 105, tool: 'pick' });
  defBlock(19, { name: 'Redstone',      tex: Array(6).fill(TEX.redstoneOre), hardness: 2.5, requiresTool: 2, drop: 106, emissive: 0x880000, emissiveIntensity: 0.3, tool: 'pick' });
  defBlock(20, { name: 'Tocha',         tex: Array(6).fill(TEX.torch), hardness: 0.1, transparent: true, alphaTest: 0.4, passable: true, light: { color: 0xff9d3c, intensity: 1.4, distance: 9 }, emissive: 0xffaa44, emissiveIntensity: 0.8 });
  defBlock(21, { name: 'Pedregulho',    tex: Array(6).fill(TEX.cobble), hardness: 1.6, requiresTool: 1, tool: 'pick' });
  defBlock(22, { name: 'Lápis-lazúli',  tex: Array(6).fill(TEX.lapisOre), hardness: 2.5, requiresTool: 2, drop: 107, tool: 'pick' });
  defBlock(23, { name: 'Tijolo',        tex: Array(6).fill(TEX.brick), hardness: 1.8, requiresTool: 1, tool: 'pick' });
  defBlock(24, { name: 'Cobre',         tex: Array(6).fill(TEX.copperOre), hardness: 2.3, requiresTool: 2, drop: 108, tool: 'pick' });
  defBlock(25, { name: 'Bloco de Lápis',tex: Array(6).fill(TEX.lapisBlock), hardness: 1.8, requiresTool: 2, tool: 'pick' });
  defBlock(26, { name: 'Quartzo',       tex: Array(6).fill(TEX.quartzOre), hardness: 2.0, requiresTool: 1, drop: 109, tool: 'pick' });
  defBlock(27, { name: 'Topázio',       tex: Array(6).fill(TEX.topazOre), hardness: 2.5, requiresTool: 2, drop: 111, tool: 'pick' });
  defBlock(28, { name: 'Ametista',      tex: Array(6).fill(TEX.amethystOre), hardness: 2.5, requiresTool: 2, drop: 115, tool: 'pick' });
  defBlock(29, { name: 'Abóbora',       tex: [TEX.pumpkinSide, TEX.pumpkinSide, TEX.pumpkinTop, TEX.pumpkinTop, TEX.pumpkinSide, TEX.pumpkinFace], hardness: 1.0, tool: 'axe' });
  defBlock(30, { name: 'Bloco de Ferro',tex: Array(6).fill(TEX.ironBlock), hardness: 5.0, requiresTool: 2, tool: 'pick' });
  defBlock(31, { name: 'Cerca',         tex: Array(6).fill(TEX.planks), hardness: 1.5, transparent: true, tool: 'axe' });
  defBlock(32, { name: 'Portão',        tex: Array(6).fill(TEX.planks), hardness: 1.5, transparent: true, tool: 'axe' });
  defBlock(33, { name: 'Cama',          tex: Array(6).fill(TEX.bedTop), hardness: 0.3, transparent: true, interactive: true });
  defBlock(34, { name: 'Lã Branca',     tex: Array(6).fill(TEX.wool), hardness: 0.4 });
  // Plantas (todas com mesh customizado em plants.js, sem cubo padrão)
  defBlock(35, { name: 'Muda',          tex: Array(6).fill(TEX.sapling), hardness: 0.05, transparent: true, alphaTest: 0.5, passable: true });
  defBlock(36, { name: 'Trigo',         tex: Array(6).fill(TEX.wheatGrown), hardness: 0.05, transparent: true, alphaTest: 0.5, passable: true });
  defBlock(37, { name: 'Grama Alta',    tex: Array(6).fill(TEX.tallGrass), hardness: 0.0, transparent: true, alphaTest: 0.5, passable: true });
  defBlock(38, { name: 'Terra Cultivada',tex: Array(6).fill(TEX.farmland), hardness: 0.55, tool: 'shovel' });

  // ---------- Itens ----------
  defItem(101, { name: 'Carvão',      icon: I.makeFlatIcon('#1a1a2e', '#444') });
  defItem(102, { name: 'Ferro Bruto', icon: I.makeFlatIcon('#d8a878', '#8b5a2b') });
  defItem(103, { name: 'Ouro Bruto',  icon: I.makeFlatIcon('#FFD700', '#B8860B') });
  defItem(104, { name: 'Diamante',    icon: I.makeFlatIcon('#5dd4f5', '#2a8fb5') });
  defItem(105, { name: 'Esmeralda',   icon: I.makeFlatIcon('#50C878', '#1f6b3a') });
  defItem(106, { name: 'Redstone',    icon: I.makeFlatIcon('#cc1a1a', '#660d0d') });
  defItem(107, { name: 'Lápis-lazúli',icon: I.makeFlatIcon('#1f3fa8', '#FFD700') });
  defItem(108, { name: 'Cobre Bruto', icon: I.makeFlatIcon('#d96e3f', '#7a3a1a') });
  defItem(109, { name: 'Quartzo',     icon: I.makeFlatIcon('#f5f5f5', '#dddddd') });
  defItem(110, { name: 'Graveto',     icon: I.makeStickIcon() });
  defItem(116, { name: 'Lã',          icon: I.makeFlatIcon('#f0f0f0', '#cccccc') });
  defItem(117, { name: 'Pena',        icon: I.makeFlatIcon('#f8f8f0', '#aaaaaa') });
  defItem(118, { name: 'Couro',       icon: I.makeFlatIcon('#8b5a2b', '#5a3818') });
  defItem(119, { name: 'Carne Crua',  icon: I.makeFlatIcon('#d97070', '#7a2020') });
  defItem(120, { name: 'Peixe',       icon: I.makeFlatIcon('#7aa4f5', '#3a5fa8') });
  defItem(121, { name: 'Semente',     icon: I.makeFlatIcon('#9ac06b', '#506a35'), maxStack: 64 });
  defItem(122, { name: 'Trigo',       icon: I.makeFlatIcon('#d8b450', '#7a5a20'), maxStack: 64 });
  defItem(123, { name: 'Pão',         icon: I.makeFlatIcon('#c98856', '#7a4a18'), maxStack: 16 });
  defItem(111, { name: 'Topázio',     icon: I.makeFlatIcon('#ff9933', '#cc6622') });
  defItem(113, { name: 'Bala',        icon: I.makeBulletIcon(), maxStack: 32 });
  defItem(114, { name: 'Flecha',      icon: I.makeArrowIcon(),  maxStack: 64 });
  defItem(115, { name: 'Ametista',    icon: I.makeFlatIcon('#9933cc', '#5e1a85') });

  // ---------- Ferramentas (pickaxes / shovels / axes / swords) ----------
  defTool(200, { name: 'Picareta de Madeira',  icon: I.makePickaxeIcon('#a87030'), toolType: 'pick', toolLevel: 1, damage: 1.5 });
  defTool(201, { name: 'Picareta de Pedra',    icon: I.makePickaxeIcon('#888888'), toolType: 'pick', toolLevel: 2, damage: 2.0 });
  defTool(202, { name: 'Picareta de Ferro',    icon: I.makePickaxeIcon('#d8d8d8'), toolType: 'pick', toolLevel: 3, damage: 2.8 });
  defTool(203, { name: 'Picareta de Diamante', icon: I.makePickaxeIcon('#5dd4f5'), toolType: 'pick', toolLevel: 4, damage: 3.5 });

  defTool(210, { name: 'Espada de Madeira',    icon: I.makeSwordIcon('#c19966'), toolType: 'sword', toolLevel: 1, damage: 4 });
  defTool(211, { name: 'Espada de Pedra',      icon: I.makeSwordIcon('#888888'), toolType: 'sword', toolLevel: 2, damage: 5 });
  defTool(212, { name: 'Espada de Ferro',      icon: I.makeSwordIcon('#d8d8d8'), toolType: 'sword', toolLevel: 3, damage: 7 });
  defTool(213, { name: 'Espada de Diamante',   icon: I.makeSwordIcon('#5dd4f5'), toolType: 'sword', toolLevel: 4, damage: 9 });

  defTool(220, { name: 'Pá de Madeira',  icon: I.makeShovelIcon('#a87030'), toolType: 'shovel', toolLevel: 1, damage: 1.5 });
  defTool(221, { name: 'Pá de Pedra',    icon: I.makeShovelIcon('#888888'), toolType: 'shovel', toolLevel: 2, damage: 2.0 });
  defTool(222, { name: 'Pá de Ferro',    icon: I.makeShovelIcon('#d8d8d8'), toolType: 'shovel', toolLevel: 3, damage: 2.5 });
  defTool(223, { name: 'Pá de Diamante', icon: I.makeShovelIcon('#5dd4f5'), toolType: 'shovel', toolLevel: 4, damage: 3.0 });

  defTool(230, { name: 'Machado de Madeira',  icon: I.makeAxeIcon('#a87030'), toolType: 'axe', toolLevel: 1, damage: 4 });
  defTool(231, { name: 'Machado de Pedra',    icon: I.makeAxeIcon('#888888'), toolType: 'axe', toolLevel: 2, damage: 5 });
  defTool(232, { name: 'Machado de Ferro',    icon: I.makeAxeIcon('#d8d8d8'), toolType: 'axe', toolLevel: 3, damage: 7 });
  defTool(233, { name: 'Machado de Diamante', icon: I.makeAxeIcon('#5dd4f5'), toolType: 'axe', toolLevel: 4, damage: 9 });

  // ---------- Armas à distância e escudo ----------
  defWeapon(240, { name: 'Arco',    icon: I.makeBowIcon(),    weaponType: 'bow', damage: 5,  ammo: 114, fireRate: 0.5, projectile: 'arrow' });
  defWeapon(241, { name: 'Pistola', icon: I.makePistolIcon(), weaponType: 'gun', damage: 8,  ammo: 113, fireRate: 0.35, projectile: 'bullet' });
  defWeapon(250, { name: 'Escudo',  icon: I.makeShieldIcon(), weaponType: 'shield', damageReduction: 0.45 });

  // ---------- Armaduras ----------
  defArmor(300, { name: 'Capacete de Ferro',     icon: I.makeHelmetIcon('#d8d8d8'), armorSlot: 'head',  protection: 2 });
  defArmor(301, { name: 'Capacete de Diamante',  icon: I.makeHelmetIcon('#5dd4f5'), armorSlot: 'head',  protection: 3 });
  defArmor(310, { name: 'Peitoral de Ferro',     icon: I.makeChestIcon('#d8d8d8'),  armorSlot: 'chest', protection: 6 });
  defArmor(311, { name: 'Peitoral de Diamante',  icon: I.makeChestIcon('#5dd4f5'),  armorSlot: 'chest', protection: 8 });
  defArmor(320, { name: 'Calças de Ferro',       icon: I.makeLegsIcon('#d8d8d8'),   armorSlot: 'legs',  protection: 5 });
  defArmor(321, { name: 'Calças de Diamante',    icon: I.makeLegsIcon('#5dd4f5'),   armorSlot: 'legs',  protection: 6 });
  defArmor(330, { name: 'Botas de Ferro',        icon: I.makeBootsIcon('#d8d8d8'),  armorSlot: 'feet',  protection: 2 });
  defArmor(331, { name: 'Botas de Diamante',     icon: I.makeBootsIcon('#5dd4f5'),  armorSlot: 'feet',  protection: 3 });

  function STACK_MAX(id) {
    const it = ITEMS[id];
    if (!it) return 64;
    if (it.kind === 'tool' || it.kind === 'weapon' || it.kind === 'armor') return 1;
    if (it.maxStack != null) return it.maxStack;
    return 64;
  }

  // ---------- Receitas ----------
  // Cada receita: shape (string[]) + key (char->id) + result ({id,count}).
  // Espaço (' ') = vazio. Receita e grid são normalizados (trim) antes de comparar.
  const RECIPES = [
    // Básicos
    { shape: ['L'],            key: { L: 4 },              result: { id: 12, count: 4 } },
    { shape: ['P', 'P'],       key: { P: 12 },             result: { id: 110, count: 4 } },
    { shape: ['PP', 'PP'],     key: { P: 12 },             result: { id: 13, count: 1 } },
    { shape: ['SS', 'SS'],     key: { S: 11 },             result: { id: 9,  count: 4 } },
    { shape: ['PP','PP','PP'], key: { P: 12 },             result: { id: 10, count: 1 } },
    { shape: ['CC','CC'],      key: { C: 21 },             result: { id: 23, count: 4 } },
    { shape: ['LL','LL'],      key: { L: 107 },            result: { id: 25, count: 1 } },
    { shape: ['C', 'S'],       key: { C: 101, S: 110 },    result: { id: 20, count: 4 } },

    // Picaretas
    { shape: ['MMM',' S ',' S '], key: { M: 12,  S: 110 }, result: { id: 200, count: 1 } },
    { shape: ['MMM',' S ',' S '], key: { M: 21,  S: 110 }, result: { id: 201, count: 1 } },
    { shape: ['MMM',' S ',' S '], key: { M: 102, S: 110 }, result: { id: 202, count: 1 } },
    { shape: ['MMM',' S ',' S '], key: { M: 104, S: 110 }, result: { id: 203, count: 1 } },

    // Pás
    { shape: ['M', 'S', 'S'], key: { M: 12,  S: 110 }, result: { id: 220, count: 1 } },
    { shape: ['M', 'S', 'S'], key: { M: 21,  S: 110 }, result: { id: 221, count: 1 } },
    { shape: ['M', 'S', 'S'], key: { M: 102, S: 110 }, result: { id: 222, count: 1 } },
    { shape: ['M', 'S', 'S'], key: { M: 104, S: 110 }, result: { id: 223, count: 1 } },

    // Machados (forma de L)
    { shape: ['MM','MS',' S'], key: { M: 12,  S: 110 }, result: { id: 230, count: 1 } },
    { shape: ['MM','MS',' S'], key: { M: 21,  S: 110 }, result: { id: 231, count: 1 } },
    { shape: ['MM','MS',' S'], key: { M: 102, S: 110 }, result: { id: 232, count: 1 } },
    { shape: ['MM','MS',' S'], key: { M: 104, S: 110 }, result: { id: 233, count: 1 } },

    // Espadas
    { shape: ['M','M','S'], key: { M: 12,  S: 110 }, result: { id: 210, count: 1 } },
    { shape: ['M','M','S'], key: { M: 21,  S: 110 }, result: { id: 211, count: 1 } },
    { shape: ['M','M','S'], key: { M: 102, S: 110 }, result: { id: 212, count: 1 } },
    { shape: ['M','M','S'], key: { M: 104, S: 110 }, result: { id: 213, count: 1 } },

    // Arco: graveto curvado em torno de uma corda (redstone como faking)
    { shape: [' SR','S R',' SR'], key: { S: 110, R: 106 }, result: { id: 240, count: 1 } },

    // Pistola: 4 ferro em forma de "T invertido" (cano em cima + cabo)
    { shape: ['III',' I ',' I '], key: { I: 102 }, result: { id: 241, count: 1 } },

    // Escudo: tábuas + 1 ferro central
    { shape: ['PIP','PPP',' P '], key: { P: 12, I: 102 }, result: { id: 250, count: 1 } },

    // Armaduras (formato MC clássico)
    { shape: ['III','I I'],         key: { I: 102 }, result: { id: 300, count: 1 } },
    { shape: ['III','I I'],         key: { I: 104 }, result: { id: 301, count: 1 } },
    { shape: ['I I','III','III'],   key: { I: 102 }, result: { id: 310, count: 1 } },
    { shape: ['I I','III','III'],   key: { I: 104 }, result: { id: 311, count: 1 } },
    { shape: ['III','I I','I I'],   key: { I: 102 }, result: { id: 320, count: 1 } },
    { shape: ['III','I I','I I'],   key: { I: 104 }, result: { id: 321, count: 1 } },
    { shape: ['I I','I I'],         key: { I: 102 }, result: { id: 330, count: 1 } },
    { shape: ['I I','I I'],         key: { I: 104 }, result: { id: 331, count: 1 } },

    // Munição
    { shape: ['M','S','L'], key: { M: 21,  S: 110, L: 5 },   result: { id: 114, count: 4 } }, // flechas
    { shape: ['I','R'],     key: { I: 102, R: 106 },         result: { id: 113, count: 4 } }, // balas

    // Bloco de ferro: 9 ferro
    { shape: ['III','III','III'], key: { I: 102 }, result: { id: 30, count: 1 } },
    // Cerca: 4 tábuas + 2 gravetos (2 cercas)
    { shape: ['PSP','PSP'], key: { P: 12, S: 110 }, result: { id: 31, count: 2 } },
    // Portão: 2 gravetos + 4 tábuas (formato moldura)
    { shape: ['SPS','SPS'], key: { S: 110, P: 12 }, result: { id: 32, count: 1 } },
    // Cama: 3 lãs em cima + 3 tábuas embaixo
    { shape: ['WWW','PPP'], key: { W: 116, P: 12 }, result: { id: 33, count: 1 } },
    // Bloco de lã: 4 lãs em 2x2
    { shape: ['WW','WW'], key: { W: 116 }, result: { id: 34, count: 1 } },
    // Pão: 3 trigos em linha horizontal
    { shape: ['WWW'], key: { W: 122 }, result: { id: 123, count: 1 } },
  ];

  Game.items = ITEMS;
  Game.recipes = RECIPES;
  Game.stackMax = STACK_MAX;
})();
