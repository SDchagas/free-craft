/* =========================================================
   Inventory — 36 slots principais (9 hotbar + 27 mochila)
   + 4 slots de armadura (head/chest/legs/feet) + 1 off-hand.
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};

  const INV_SIZE = 36;
  const data = Array(INV_SIZE).fill(null);
  // armor: { head, chest, legs, feet }; offhand: 1 slot (escudo)
  const armor = { head: null, chest: null, legs: null, feet: null };
  let offhand = null;

  let selectedSlot = 0;

  function findStack(id) {
    const max = Game.stackMax(id);
    for (let i = 0; i < INV_SIZE; i++) {
      const s = data[i];
      if (s && s.id === id && s.count < max) return i;
    }
    return -1;
  }
  function findEmpty() {
    for (let i = 0; i < INV_SIZE; i++) if (!data[i]) return i;
    return -1;
  }

  function add(id, count = 1) {
    let remaining = count;
    while (remaining > 0) {
      let i = findStack(id);
      if (i < 0) i = findEmpty();
      if (i < 0) return remaining;
      if (!data[i]) data[i] = { id, count: 0 };
      const max = Game.stackMax(id);
      const can = Math.min(remaining, max - data[i].count);
      data[i].count += can;
      remaining -= can;
    }
    if (Game.ui) Game.ui.refresh();
    return 0;
  }

  function removeOne(idx) {
    const s = data[idx];
    if (!s) return null;
    const taken = { id: s.id, count: 1 };
    s.count -= 1;
    if (s.count <= 0) data[idx] = null;
    if (Game.ui) Game.ui.refresh();
    return taken;
  }

  function has(id, count = 1) {
    let total = 0;
    for (const s of data) if (s && s.id === id) total += s.count;
    return total >= count;
  }

  // Quanto cabe ainda do `id` no inventário (sem realmente adicionar).
  function spaceFor(id) {
    const max = Game.stackMax(id);
    let space = 0;
    for (const s of data) {
      if (!s) space += max;
      else if (s.id === id && s.count < max) space += (max - s.count);
    }
    return space;
  }
  function canFit(id, count = 1) { return spaceFor(id) >= count; }

  function consume(id, count) {
    let need = count;
    for (let i = 0; i < INV_SIZE && need > 0; i++) {
      const s = data[i];
      if (s && s.id === id) {
        const take = Math.min(need, s.count);
        s.count -= take; need -= take;
        if (s.count <= 0) data[i] = null;
      }
    }
  }

  function getActive() {
    const s = data[selectedSlot];
    return s ? Game.items[s.id] : null;
  }
  function getActiveId() { const s = data[selectedSlot]; return s ? s.id : 0; }
  function getActiveTool() {
    const def = getActive();
    if (def && def.kind === 'tool') return def;
    return null;
  }
  function getActiveWeapon() {
    const def = getActive();
    if (def && def.kind === 'weapon') return def;
    return null;
  }

  function setSelectedSlot(i) {
    selectedSlot = Math.max(0, Math.min(8, i));
    if (Game.ui) Game.ui.refresh();
  }
  function getSelectedSlot() { return selectedSlot; }

  function consumeActive() {
    const s = data[selectedSlot];
    if (!s) return;
    s.count -= 1;
    if (s.count <= 0) data[selectedSlot] = null;
    if (Game.ui) Game.ui.refresh();
  }

  // ---------- Armadura / Off-hand ----------

  // Tenta equipar item de um slot do inventário no slot apropriado.
  function tryEquipFrom(idx) {
    const s = data[idx];
    if (!s) return false;
    const def = Game.items[s.id];
    if (!def) return false;
    if (def.kind === 'armor') {
      const slotName = def.armorSlot;
      if (!armor[slotName]) {
        armor[slotName] = { id: s.id };
        s.count -= 1;
        if (s.count <= 0) data[idx] = null;
      } else {
        // troca
        const prev = armor[slotName];
        armor[slotName] = { id: s.id };
        data[idx] = { id: prev.id, count: 1 };
      }
      if (Game.ui) Game.ui.refresh();
      if (Game.audio) Game.audio.play('click');
      return true;
    }
    if (def.kind === 'weapon' && def.weaponType === 'shield') {
      if (!offhand) {
        offhand = { id: s.id };
        s.count -= 1;
        if (s.count <= 0) data[idx] = null;
      } else {
        const prev = offhand;
        offhand = { id: s.id };
        data[idx] = { id: prev.id, count: 1 };
      }
      if (Game.ui) Game.ui.refresh();
      if (Game.audio) Game.audio.play('click');
      return true;
    }
    return false;
  }

  // Tira item do slot equipado e devolve ao inventário.
  function unequip(slotName) {
    let item;
    if (slotName === 'offhand') { item = offhand; offhand = null; }
    else { item = armor[slotName]; armor[slotName] = null; }
    if (item) add(item.id, 1);
    if (Game.ui) Game.ui.refresh();
  }

  function totalProtection() {
    let p = 0;
    for (const k of ['head','chest','legs','feet']) {
      const it = armor[k];
      if (it) p += (Game.items[it.id].protection || 0);
    }
    if (offhand) p += (Game.items[offhand.id].damageReduction || 0) * 10;
    return p;
  }

  function offhandShield() {
    if (offhand) {
      const def = Game.items[offhand.id];
      if (def.weaponType === 'shield') return def;
    }
    return null;
  }

  Game.inventory = {
    data, armor,
    INV_SIZE,
    add, removeOne, has, consume,
    getActive, getActiveId, getActiveTool, getActiveWeapon,
    getSelectedSlot, setSelectedSlot, consumeActive,
    tryEquipFrom, unequip, totalProtection, offhandShield,
    getOffhand: () => offhand,
    spaceFor, canFit,
  };
})();
