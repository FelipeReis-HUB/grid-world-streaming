// viewport.js — Câmera e sistema de ativação de áreas (level streaming)
//
// Núcleo conceitual do exercício: a "janela de visualização" (câmera) é
// puramente uma questão de RENDERIZAÇÃO — segue o jogador em pixels — e é
// TOTALMENTE INDEPENDENTE de quais áreas da malha estão ativas para fins de
// SIMULAÇÃO. A câmera não se prende às áreas: pode
// mostrar pedaços de até 4 delas ao mesmo tempo. A ativação usa o que a
// câmera enxerga (mais uma pequena folga), então uma área só é simulada
// quando está na tela ou prestes a entrar nela, e nunca aparece congelada
// diante do jogador. No máximo 4 áreas ficam ativas ao mesmo tempo.

class Camera {
  constructor(viewW, viewH, worldW, worldH) {
    this.width = viewW;
    this.height = viewH;
    this.worldW = worldW;
    this.worldH = worldH;
    this.x = 0;
    this.y = 0;
  }

  follow(target) {
    this.x = target.x - this.width / 2;
    this.y = target.y - this.height / 2;
    this.x = Math.max(0, Math.min(this.worldW - this.width, this.x));
    this.y = Math.max(0, Math.min(this.worldH - this.height, this.y));
  }
}

// Folga (px) além da borda da câmera: uma área "acorda" um pouco antes de
// aparecer na tela. Somada à câmera, cabe exatamente numa área
// (VIEW + 2 * margem = AREA), o que garante no máximo 4 áreas ativas.
const ACTIVATION_MARGIN_X = 40;
const ACTIVATION_MARGIN_Y = 30;

// Retorna a área atual do jogador e o conjunto (Set) de ids de áreas ativas.
// Ativa é toda área que intersecta o retângulo da câmera expandido pela
// margem: nenhuma área visível fica congelada, e uma vizinha só é ativada
// quando o jogador (que a câmera segue) se aproxima da borda com ela. Como
// esse retângulo não é maior que uma área, ele cobre no máximo 2 colunas e
// 2 linhas da malha, ou seja, no máximo 4 áreas.
function computeActiveAreas(grid, player, camera) {
  const current = grid.areaFromWorld(player.x, player.y);
  const left = camera.x - ACTIVATION_MARGIN_X;
  const top = camera.y - ACTIVATION_MARGIN_Y;
  const right = camera.x + camera.width + ACTIVATION_MARGIN_X;
  const bottom = camera.y + camera.height + ACTIVATION_MARGIN_Y;

  const colMin = Math.max(0, Math.floor(left / AREA_W));
  const colMax = Math.min(GRID_COLS - 1, Math.floor((right - 1) / AREA_W));
  const rowMin = Math.max(0, Math.floor(top / AREA_H));
  const rowMax = Math.min(GRID_ROWS - 1, Math.floor((bottom - 1) / AREA_H));

  const activeIds = new Set();
  for (let row = rowMin; row <= rowMax; row++) {
    for (let col = colMin; col <= colMax; col++) {
      activeIds.add(grid.areaAt(row, col).id);
    }
  }
  return { current, activeIds };
}
