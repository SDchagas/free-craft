/* =========================================================
   UI — hotbar, inventário modal, HUD, tooltips, toast.
   Separação clara: módulo só toca no DOM, lógica fica em
   inventory.js / crafting.js.
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};

  let hotbarEl, invModal, invMain, invRow2, invRow3, invHotbar;
  let craftGridEl, craftResultEl, tooltipEl;
  let posText, toolText, fbText, fbHud, clockText, phaseText;
  let hpBar, hungerBar;
  let armorSlotsEl, offhandSlotEl;
  let recipesModal, recipesGrid;

  function init() {
    hotbarEl     = document.getElementById('hotbar');
    invModal     = document.getElementById('inventory-modal');
    invMain      = document.getElementById('inv-main');
    invRow2      = document.getElementById('inv-row-2');
    invRow3      = document.getElementById('inv-row-3');
    invHotbar    = document.getElementById('inv-hotbar');
    craftGridEl  = document.getElementById('craft-grid');
    craftResultEl= document.getElementById('craft-result');
    tooltipEl    = document.getElementById('tooltip');
    posText      = document.getElementById('pos-text');
    toolText     = document.getElementById('tool-text');
    fbText       = document.getElementById('fb-text');
    fbHud        = document.getElementById('fireball-hud');
    clockText    = document.getElementById('clock-text');
    phaseText    = document.getElementById('phase-text');
    hpBar        = document.getElementById('hp-bar');
    hungerBar    = document.getElementById('hunger-bar');
    armorSlotsEl = document.getElementById('armor-slots');
    offhandSlotEl= document.getElementById('offhand-slot');
    recipesModal = document.getElementById('recipes-modal');
    recipesGrid  = document.getElementById('recipes-grid');
    setupRecipesButtons();
  }

  function setupRecipesButtons() {
    const open = document.getElementById('open-recipes-btn');
    const close = document.getElementById('close-recipes-btn');
    if (open) open.addEventListener('click', () => openRecipesBook());
    if (close) close.addEventListener('click', () => closeRecipesBook());
  }

  const _statCache = {};
  function renderStatBar(el, current, max, fullIcon, emptyIcon, cacheKey) {
    if (!el) return;
    const c = Math.round(current * 2) / 2;  // resolução 0.5
    if (_statCache[cacheKey] === c) return;
    _statCache[cacheKey] = c;
    const iconCount = 10;
    const perIcon = max / iconCount;
    let html = '';
    for (let i = 0; i < iconCount; i++) {
      const threshold = (i + 1) * perIcon;
      let cls;
      if (c >= threshold) cls = 'full';
      else if (c >= threshold - perIcon / 2) cls = 'half';
      else cls = 'empty';
      html += `<div class="stat-icon ${cls}">${cls === 'empty' ? emptyIcon : fullIcon}</div>`;
    }
    el.innerHTML = html;
  }

  function getItemIconDataUrl(id) {
    const def = Game.items[id];
    if (!def) return '';
    if (def.kind === 'block') return def.tex[2].image.toDataURL();
    return def.icon.image.toDataURL();
  }

  function makeSlotEl(slot, opts = {}) {
    const el = document.createElement('div');
    el.className = opts.className || 'inv-slot';
    if (opts.selected) el.classList.add('selected');
    if (slot) {
      const def = Game.items[slot.id];
      const img = document.createElement('div');
      img.className = 'item-img';
      img.style.backgroundImage = `url('${getItemIconDataUrl(slot.id)}')`;
      el.appendChild(img);
      if (slot.count > 1) {
        const cnt = document.createElement('div');
        cnt.className = 'item-count';
        cnt.textContent = slot.count;
        el.appendChild(cnt);
      }
      el.addEventListener('mouseenter', () => {
        tooltipEl.textContent = def.name + (slot.count > 1 ? ` x${slot.count}` : '');
        tooltipEl.style.display = 'block';
      });
      el.addEventListener('mouseleave', () => { tooltipEl.style.display = 'none'; });
      el.addEventListener('mousemove', e => {
        tooltipEl.style.left = (e.clientX + 12) + 'px';
        tooltipEl.style.top = (e.clientY + 12) + 'px';
      });
    }
    if (opts.onClick) el.addEventListener('click', opts.onClick);
    return el;
  }

  function buildHotbar() {
    hotbarEl.innerHTML = '';
    const sel = Game.inventory.getSelectedSlot();
    for (let i = 0; i < 9; i++) {
      const slot = Game.inventory.data[i];
      const el = document.createElement('div');
      el.className = 'slot' + (i === sel ? ' active' : '');
      const num = document.createElement('div');
      num.className = 'slot-num'; num.textContent = i + 1; el.appendChild(num);
      if (slot) {
        const img = document.createElement('div');
        img.className = 'slot-img';
        img.style.backgroundImage = `url('${getItemIconDataUrl(slot.id)}')`;
        el.appendChild(img);
        if (slot.count > 1) {
          const cnt = document.createElement('div');
          cnt.className = 'slot-count'; cnt.textContent = slot.count;
          el.appendChild(cnt);
        }
      }
      // tap/click seleciona slot (sem requerer pointerlock)
      const select = (e) => {
        if (e) e.preventDefault();
        Game.inventory.setSelectedSlot(i);
        if (Game.audio) Game.audio.play('select');
      };
      el.addEventListener('click', select);
      el.addEventListener('touchstart', select, { passive: false });
      hotbarEl.appendChild(el);
    }
    // Botão "mochila" discreto após os 9 slots — abre o inventário
    const bag = document.createElement('div');
    bag.className = 'slot bag-slot';
    bag.title = 'Inventário';
    bag.innerHTML = '<div class="bag-icon">🎒</div>';
    const openInv = (e) => {
      if (e) e.preventDefault();
      if (Game.crafting && Game.crafting.state.open) Game.ui.closeInventory();
      else Game.ui.openInventory(2);
    };
    bag.addEventListener('click', openInv);
    bag.addEventListener('touchstart', openInv, { passive: false });
    hotbarEl.appendChild(bag);
  }

  function buildInventoryGrid() {
    invMain.innerHTML = ''; invRow2.innerHTML = ''; invRow3.innerHTML = ''; invHotbar.innerHTML = '';
    for (let r = 0; r < 3; r++) {
      const target = r === 0 ? invMain : (r === 1 ? invRow2 : invRow3);
      for (let c = 0; c < 9; c++) {
        const idx = 9 + r * 9 + c;
        const slot = Game.inventory.data[idx];
        const el = makeSlotEl(slot, {
          selected: Game.crafting.state.selectedInvIdx === idx,
          onClick: () => onInvClick(idx),
        });
        target.appendChild(el);
      }
    }
    for (let i = 0; i < 9; i++) {
      const slot = Game.inventory.data[i];
      const el = makeSlotEl(slot, {
        selected: Game.crafting.state.selectedInvIdx === i,
        onClick: () => onInvClick(i),
      });
      invHotbar.appendChild(el);
    }
    buildArmorSlots();
  }

  function buildArmorSlots() {
    if (!armorSlotsEl) return;
    armorSlotsEl.innerHTML = '';
    const labels = { head: '🪖', chest: '🦺', legs: '👖', feet: '🥾' };
    for (const slotName of ['head','chest','legs','feet']) {
      const equipped = Game.inventory.armor[slotName];
      const wrap = document.createElement('div');
      wrap.className = 'armor-slot-wrap';
      wrap.innerHTML = `<div class="armor-icon">${labels[slotName]}</div>`;
      const el = document.createElement('div');
      el.className = 'inv-slot armor-slot';
      el.dataset.slot = slotName;
      if (equipped) {
        const img = document.createElement('div');
        img.className = 'item-img';
        img.style.backgroundImage = `url('${getItemIconDataUrl(equipped.id)}')`;
        el.appendChild(img);
        el.title = Game.items[equipped.id].name + ' (clique para retirar)';
        el.addEventListener('click', () => {
          Game.inventory.unequip(slotName);
        });
      } else {
        el.classList.add('empty-armor');
        el.title = 'Slot de armadura ' + slotName;
        el.addEventListener('click', () => {
          // se há item selecionado no inv que combina, equipa
          const cs = Game.crafting.state;
          if (cs.selectedInvIdx >= 0) {
            const it = Game.inventory.data[cs.selectedInvIdx];
            if (it) {
              const def = Game.items[it.id];
              if (def.kind === 'armor' && def.armorSlot === slotName) {
                Game.inventory.tryEquipFrom(cs.selectedInvIdx);
                cs.selectedInvIdx = -1;
                refresh();
              }
            }
          }
        });
      }
      wrap.appendChild(el);
      armorSlotsEl.appendChild(wrap);
    }
    if (offhandSlotEl) {
      offhandSlotEl.innerHTML = '';
      const off = Game.inventory.getOffhand();
      const wrap = document.createElement('div');
      wrap.className = 'armor-slot-wrap';
      wrap.innerHTML = '<div class="armor-icon">🛡️</div>';
      const el = document.createElement('div');
      el.className = 'inv-slot armor-slot';
      if (off) {
        const img = document.createElement('div');
        img.className = 'item-img';
        img.style.backgroundImage = `url('${getItemIconDataUrl(off.id)}')`;
        el.appendChild(img);
        el.title = Game.items[off.id].name + ' (clique para retirar)';
        el.addEventListener('click', () => Game.inventory.unequip('offhand'));
      } else {
        el.classList.add('empty-armor');
        el.title = 'Slot secundário (escudo)';
        el.addEventListener('click', () => {
          const cs = Game.crafting.state;
          if (cs.selectedInvIdx >= 0) {
            const it = Game.inventory.data[cs.selectedInvIdx];
            if (it) {
              const def = Game.items[it.id];
              if (def.kind === 'weapon' && def.weaponType === 'shield') {
                Game.inventory.tryEquipFrom(cs.selectedInvIdx);
                cs.selectedInvIdx = -1;
                refresh();
              }
            }
          }
        });
      }
      wrap.appendChild(el);
      offhandSlotEl.appendChild(wrap);
    }
  }

  function buildCraftGrid() {
    const cs = Game.crafting.state;
    craftGridEl.innerHTML = '';
    craftGridEl.className = 'craft-grid size-' + cs.size;
    for (let r = 0; r < cs.size; r++) {
      for (let c = 0; c < cs.size; c++) {
        const i = r * 3 + c;
        const item = cs.grid[i];
        const el = makeSlotEl(item ? { id: item.id, count: 1 } : null, {
          onClick: () => onCraftSlotClick(r, c),
        });
        craftGridEl.appendChild(el);
      }
    }
    craftResultEl.innerHTML = '';
    cs.result = Game.crafting.check();
    if (cs.result) {
      craftResultEl.classList.add('ready');
      const img = document.createElement('div');
      img.className = 'item-img';
      img.style.backgroundImage = `url('${getItemIconDataUrl(cs.result.id)}')`;
      craftResultEl.appendChild(img);
      if (cs.result.count > 1) {
        const cnt = document.createElement('div');
        cnt.className = 'item-count'; cnt.textContent = cs.result.count;
        craftResultEl.appendChild(cnt);
      }
      craftResultEl.onclick = onCraftResultClick;
    } else {
      craftResultEl.classList.remove('ready');
      craftResultEl.onclick = null;
    }
  }

  function onInvClick(idx) {
    const cs = Game.crafting.state;
    if (Game.audio) Game.audio.play('click');
    if (cs.selectedInvIdx === idx) {
      cs.selectedInvIdx = -1; refresh(); return;
    }
    if (cs.selectedInvIdx >= 0) {
      const a = Game.inventory.data[cs.selectedInvIdx];
      const b = Game.inventory.data[idx];
      Game.inventory.data[cs.selectedInvIdx] = b;
      Game.inventory.data[idx] = a;
      cs.selectedInvIdx = -1; refresh(); return;
    }
    if (Game.inventory.data[idx]) { cs.selectedInvIdx = idx; refresh(); }
  }

  function onCraftSlotClick(r, c) {
    const cs = Game.crafting.state;
    const i = r * 3 + c;
    const cur = cs.grid[i];
    if (Game.audio) Game.audio.play('click');
    if (cur) {
      Game.inventory.add(cur.id, 1);
      cs.grid[i] = null;
    } else if (cs.selectedInvIdx >= 0) {
      const taken = Game.inventory.removeOne(cs.selectedInvIdx);
      if (taken) cs.grid[i] = { id: taken.id };
      if (!Game.inventory.data[cs.selectedInvIdx]) cs.selectedInvIdx = -1;
    }
    refresh();
  }

  function onCraftResultClick() {
    const cs = Game.crafting.state;
    if (!cs.result) return;
    for (let i = 0; i < 9; i++) cs.grid[i] = null;
    const left = Game.inventory.add(cs.result.id, cs.result.count);
    if (left > 0) Game.utils.showToast(`Inventário cheio! ${left} item(s) perdido(s)`);
    if (Game.audio) Game.audio.play('craft');
    refresh();
  }

  function openInventory(size) {
    const cs = Game.crafting.state;
    cs.open = true;
    cs.size = size;
    cs.selectedInvIdx = -1;
    document.getElementById('inv-title').textContent = size === 3 ? 'MESA DE CRAFT' : 'INVENTÁRIO';
    invModal.classList.add('show');
    if (document.pointerLockElement) document.exitPointerLock();
    refresh();
  }

  function closeInventory() {
    Game.crafting.returnGridToInventory();
    Game.crafting.state.open = false;
    Game.crafting.state.selectedInvIdx = -1;
    invModal.classList.remove('show');
    try { Game.canvas.requestPointerLock(); } catch (e) {}
  }

  // ---------- Livro de receitas ----------
  function openRecipesBook() {
    if (!recipesModal) return;
    buildRecipesGrid();
    recipesModal.classList.add('show');
    if (document.pointerLockElement) document.exitPointerLock();
  }
  function closeRecipesBook() {
    if (!recipesModal) return;
    recipesModal.classList.remove('show');
    try { Game.canvas.requestPointerLock(); } catch (e) {}
  }
  function buildRecipesGrid() {
    if (!recipesGrid) return;
    recipesGrid.innerHTML = '';
    const all = Game.crafting.listRecipes();
    for (const { recipe, matrix } of all) {
      if (!matrix) continue;
      const card = document.createElement('div');
      card.className = 'recipe-card';
      // mini-grid (sempre 3x3 visualmente, com vazios onde não tem item)
      const grid = document.createElement('div');
      grid.className = 'recipe-mini-grid';
      // posiciona matriz alinhada ao topo-esquerda (3x3)
      const rows = matrix.length, cols = matrix[0].length;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const cell = document.createElement('div');
          cell.className = 'recipe-mini-cell';
          if (r < rows && c < cols && matrix[r][c] != null) {
            const id = matrix[r][c];
            cell.style.backgroundImage = `url('${getItemIconDataUrl(id)}')`;
            cell.title = Game.items[id] ? Game.items[id].name : '';
          }
          grid.appendChild(cell);
        }
      }
      card.appendChild(grid);
      // arrow + result
      const arrow = document.createElement('div');
      arrow.className = 'recipe-arrow';
      arrow.textContent = '→';
      card.appendChild(arrow);
      const result = document.createElement('div');
      result.className = 'recipe-result-cell';
      result.style.backgroundImage = `url('${getItemIconDataUrl(recipe.result.id)}')`;
      const resName = document.createElement('div');
      resName.className = 'recipe-result-name';
      const resDef = Game.items[recipe.result.id];
      resName.textContent = (resDef ? resDef.name : '?') + (recipe.result.count > 1 ? ` x${recipe.result.count}` : '');
      const wrap = document.createElement('div');
      wrap.className = 'recipe-result-wrap';
      wrap.appendChild(result);
      wrap.appendChild(resName);
      card.appendChild(wrap);
      // requires 3x3?
      const needsLarge = rows > 2 || cols > 2;
      if (needsLarge) {
        const tag = document.createElement('div');
        tag.className = 'recipe-tag';
        tag.textContent = 'Mesa de Craft';
        card.appendChild(tag);
      }
      recipesGrid.appendChild(card);
    }
  }

  function refresh() {
    buildHotbar();
    if (Game.crafting.state.open) {
      buildInventoryGrid();
      buildCraftGrid();
    }
    const slot = Game.inventory.data[Game.inventory.getSelectedSlot()];
    if (toolText) {
      if (slot) {
        const def = Game.items[slot.id];
        toolText.textContent = `${def.name}${slot.count > 1 ? ' x' + slot.count : ''}`;
      } else {
        toolText.textContent = 'Mãos vazias';
      }
    }
  }

  function updateHUD() {
    const p = Game.player.pos;
    if (posText) posText.textContent = `X: ${p.x.toFixed(0)} | Y: ${p.y.toFixed(0)} | Z: ${p.z.toFixed(0)}`;
    if (fbText && fbHud) {
      const cd = Game.fireballs.getCooldown();
      if (cd > 0) { fbHud.classList.add('cooling'); fbText.textContent = 'CARREGANDO'; }
      else { fbHud.classList.remove('cooling'); fbText.textContent = 'PRONTA (B)'; }
    }
    if (clockText && phaseText) {
      clockText.textContent = Game.daynight.clockText();
      phaseText.textContent = Game.daynight.phaseLabel();
    }
    const pl = Game.player;
    renderStatBar(hpBar, pl.hp, pl.maxHp, '❤️', '🖤', 'hp');
    renderStatBar(hungerBar, pl.hunger, pl.maxHunger, '🧀', '·', 'hunger');

    // Mostra o modo (creative/survival) no HUD
    const modeBadge = document.getElementById('mode-badge');
    if (modeBadge) {
      const m = pl.mode;
      modeBadge.textContent = m === 'creative' ? '🛠️ CRIATIVO' : '⚔️ SOBREVIVÊNCIA';
      modeBadge.style.background = m === 'creative' ? '#5b8df0' : '#2d8f4d';
    }
  }

  Game.ui = { init, refresh, openInventory, closeInventory, updateHUD, openRecipesBook, closeRecipesBook };
})();
