/* =========================================================
   Skin — cores customizáveis (cabelo, camisa, calça, chapéu) +
   persistência em localStorage. Outros módulos (viewmodel,
   playermesh) leem `Game.skin.colors` pra construir os meshes.
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};

  const DEFAULT = {
    skin:     '#f1c19a',  // pele
    hair:     '#3a2010',  // cabelo (top da cabeça)
    shirt:    '#3a8fd0',  // camisa (torso + manga)
    pants:    '#2a3a78',  // calça (pernas)
    shoes:    '#1a1a2e',  // sapato
    hat:      null,        // chapéu (null = sem chapéu)
  };

  const HAT_OPTIONS = {
    none:   null,
    cap:    { color: '#d83a3a', kind: 'cap' },        // boné vermelho
    helmet: { color: '#888888', kind: 'helmet' },     // capacete cinza
    crown:  { color: '#FFD700', kind: 'crown' },      // coroa dourada
    hood:   { color: '#0a0a18', kind: 'hood' },       // capuz preto
  };

  let colors = { ...DEFAULT };

  function load() {
    try {
      const raw = localStorage.getItem('freecraft.skin');
      if (raw) {
        const parsed = JSON.parse(raw);
        colors = { ...DEFAULT, ...parsed };
      }
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem('freecraft.skin', JSON.stringify(colors)); } catch (e) {}
  }

  function set(key, value) {
    colors[key] = value;
    save();
    if (Game.viewmodel && Game.viewmodel.refreshSkin) Game.viewmodel.refreshSkin();
    if (Game.playermesh && Game.playermesh.refreshSkin) Game.playermesh.refreshSkin();
  }

  function get(key) { return colors[key]; }
  function all() { return { ...colors }; }

  load();

  Game.skin = { colors, get, set, all, save, load, DEFAULT, HAT_OPTIONS };
})();
