/* =========================================================
   Crafting — verifica receitas a partir do grid e gerencia o
   estado do modal de craft.

   Trim: tanto o grid do jogador quanto o shape da receita são
   reduzidos ao bounding box dos itens antes de comparar — isso
   permite a peça ser posicionada em qualquer canto do grid.
   ========================================================= */
(function () {
  const Game = window.Game = window.Game || {};

  const state = {
    open: false,
    size: 2,                       // 2 ou 3
    grid: Array(9).fill(null),     // {id} (sempre count 1)
    result: null,
    selectedInvIdx: -1,
  };

  // gridArr é [9] (linha-major do 3x3); size limita quais células contam.
  function trimmedFromGrid(gridArr, size) {
    const rows = []; const cols = [];
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++) {
        const v = gridArr[r * 3 + c];
        if (v) { rows.push(r); cols.push(c); }
      }
    if (rows.length === 0) return null;
    const r0 = Math.min(...rows), r1 = Math.max(...rows);
    const c0 = Math.min(...cols), c1 = Math.max(...cols);
    const out = [];
    for (let r = r0; r <= r1; r++) {
      const row = [];
      for (let c = c0; c <= c1; c++) {
        const v = gridArr[r * 3 + c];
        row.push(v ? v.id : null);
      }
      out.push(row);
    }
    return out;
  }

  function trimMatrix(m) {
    const rows = m.length, cols = m[0].length;
    let r0 = rows, r1 = -1, c0 = cols, c1 = -1;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (m[r][c] != null) {
          if (r < r0) r0 = r;
          if (r > r1) r1 = r;
          if (c < c0) c0 = c;
          if (c > c1) c1 = c;
        }
    if (r1 < 0) return null;
    const out = [];
    for (let r = r0; r <= r1; r++) {
      const row = [];
      for (let c = c0; c <= c1; c++) row.push(m[r][c]);
      out.push(row);
    }
    return out;
  }

  function recipeShapeMatrix(recipe) {
    const raw = recipe.shape.map(row =>
      Array.from(row).map(ch => ch === ' ' ? null : recipe.key[ch])
    );
    return trimMatrix(raw);
  }

  // Cache de matrizes normalizadas (recipes não mudam em runtime)
  let _recipeCache = null;
  function getRecipeMatrices() {
    if (_recipeCache) return _recipeCache;
    _recipeCache = Game.recipes.map(r => ({ recipe: r, matrix: recipeShapeMatrix(r) }));
    return _recipeCache;
  }

  function check() {
    const trimmed = trimmedFromGrid(state.grid, state.size);
    if (!trimmed) return null;
    const cache = getRecipeMatrices();
    for (const { recipe, matrix } of cache) {
      if (!matrix) continue;
      if (matrix.length !== trimmed.length) continue;
      if (matrix[0].length !== trimmed[0].length) continue;
      if (matrix.length > state.size || matrix[0].length > state.size) continue;
      let match = true;
      for (let r = 0; r < matrix.length && match; r++)
        for (let c = 0; c < matrix[0].length && match; c++)
          if (matrix[r][c] !== trimmed[r][c]) match = false;
      if (match) return recipe.result;
    }
    return null;
  }

  function returnGridToInventory() {
    for (let i = 0; i < 9; i++) {
      if (state.grid[i]) {
        Game.inventory.add(state.grid[i].id, 1);
        state.grid[i] = null;
      }
    }
    state.result = null;
  }

  // Para o livro de receitas: lista todas as receitas com matriz já normalizada.
  function listRecipes() {
    return getRecipeMatrices();
  }

  Game.crafting = { state, check, returnGridToInventory, listRecipes };
})();
